/**
 * StoreContext — Single source of truth for multi-store management.
 * 
 * Replaces the scattered marketFilter/activeStore/stName pattern with
 * a centralized currentStoreId. All hooks and pages should read from
 * this context to determine which store's data to load/save.
 * 
 * Key features:
 * - currentStoreId: The currently selected store name (e.g. "ĐML BLI HBI")
 * - isStoreReady: Guards auto-save during store switching to prevent cross-contamination
 * - warehouseCode: From userProfile.ma_kho (shared across all stores in a cluster)
 * - availableStores: List of stores detected from pasted data
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';
import { isValidStoreName } from '../pages/RTST/utils';

export interface StoreInfo {
  name: string;
  [key: string]: any;
}

interface StoreContextType {
  currentStoreId: string;
  setCurrentStoreId: (id: string) => void;
  warehouseCode: string;
  isStoreReady: boolean;
  setStoreReady: (ready: boolean) => void;
  availableStores: StoreInfo[];
  setAvailableStores: (stores: StoreInfo[]) => void;
  storeVersion: number;
  // Back-compat aliases (same as MarketContext)
  marketFilter: string;
  setMarketFilter: (filter: string) => void;
  availableMarkets: StoreInfo[];
  setAvailableMarkets: (markets: StoreInfo[]) => void;
  activeRealtimeTab: 'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay';
  setActiveRealtimeTab: (tab: 'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay') => void;
  activeToolHoTroTab: string;
  setActiveToolHoTroTab: (tab: string) => void;
  activeTienIchTab: string;
  setActiveTienIchTab: (tab: string) => void;
  activeLuyKeTab: 'summary' | 'cum' | 'efficiency' | 'thuong_st' | 'bcdtnh' | 'ssg_boss';
  setActiveLuyKeTab: (tab: 'summary' | 'cum' | 'efficiency' | 'thuong_st' | 'bcdtnh' | 'ssg_boss') => void;
  activeHealthTab: 'DOANH_THU' | 'TONG_HOP_NV' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'TRA_CHAM_NV' | 'KHAI_THAC_NV' | 'RANK_3T_NV' | 'GIA_TRI_DH';
  setActiveHealthTab: (tab: 'DOANH_THU' | 'TONG_HOP_NV' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'TRA_CHAM_NV' | 'KHAI_THAC_NV' | 'RANK_3T_NV' | 'GIA_TRI_DH') => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

/**
 * Build a store-prefixed localStorage key.
 * Shared/warehouse-level keys should NOT use this — only per-store keys.
 */
export function storeKey(baseKey: string, storeId: string): string {
  if (!storeId || storeId === 'ALL') return baseKey;
  // Normalize store name to a safe key suffix
  const safeId = storeId.replace(/\s+/g, '_').toUpperCase();
  return `${baseKey}::${safeId}`;
}

/**
 * Read a per-store value from localStorage.
 * Falls back to the non-prefixed key for migration compatibility.
 */
export function getStoreItem(baseKey: string, storeId: string): string | null {
  const prefixed = storeKey(baseKey, storeId);
  const val = localStorage.getItem(prefixed);
  if (val !== null) return val;
  // Fallback: try the old non-prefixed key (migration)
  return localStorage.getItem(baseKey);
}

/**
 * Write a per-store value to localStorage.
 */
export function setStoreItem(baseKey: string, storeId: string, value: string): void {
  const prefixed = storeKey(baseKey, storeId);
  try {
    localStorage.setItem(prefixed, value);
  } catch (e) {
    console.warn('[StoreContext] localStorage write failed:', e);
  }
}

/**
 * Remove a per-store value from localStorage.
 */
export function removeStoreItem(baseKey: string, storeId: string): void {
  const prefixed = storeKey(baseKey, storeId);
  localStorage.removeItem(prefixed);
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const warehouseCode = userProfile?.ma_kho || '';

  const [currentStoreId, setCurrentStoreIdRaw] = useState(() =>
    localStorage.getItem('currentStoreId') || 'ALL'
  );
  const [isStoreReady, setStoreReady] = useState(true);
  const [availableStores, setAvailableStoresRaw] = useState<StoreInfo[]>([]);
  const [storeVersion, setStoreVersion] = useState(0);
  const [activeRealtimeTab, setActiveRealtimeTab] = useState<'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay'>('summary');
  const [activeToolHoTroTab, setActiveToolHoTroTab] = useState<string>('all-sticker');
  const [activeTienIchTab, setActiveTienIchTab] = useState<string>('phan-ca-thang');
  const [activeLuyKeTab, setActiveLuyKeTab] = useState<'summary' | 'cum' | 'efficiency' | 'thuong_st' | 'bcdtnh' | 'ssg_boss'>('summary');
  const [activeHealthTab, setActiveHealthTab] = useState<'DOANH_THU' | 'TONG_HOP_NV' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'TRA_CHAM_NV' | 'KHAI_THAC_NV' | 'RANK_3T_NV' | 'GIA_TRI_DH'>('DOANH_THU');

  // Keep a mutable ref to track currently loaded store names to skip redundant state changes
  const currentStoresRef = useRef<string[]>([]);

  // Load declared stores from database based on warehouseCode
  useEffect(() => {
    if (!warehouseCode) {
      setAvailableStoresRaw([]);
      currentStoresRef.current = [];
      return;
    }

    const cleanMaKho = warehouseCode.trim();

    async function fetchDeclaredStores() {
      try {
        console.log('[StoreContext] Fetching declared stores for warehouse:', cleanMaKho);
        const maKhoNum = parseInt(cleanMaKho, 10);
        let query = supabase
          .from('store')
          .select('id, declared_stores');

        if (!isNaN(maKhoNum)) {
          query = query.or(`warehouse_code.eq.${cleanMaKho},warehouse_code.eq.${maKhoNum}`);
        } else {
          query = query.eq('warehouse_code', cleanMaKho);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[StoreContext] Error loading declared stores:', error);
          return;
        }

        if (data && data.length > 0) {
          // Try to find the record that has declared_stores array
          const recordWithArray = data.find(
            (d: any) => d.declared_stores && Array.isArray(d.declared_stores) && d.declared_stores.length > 0
          );

          let storeNames: string[] = [];

          if (recordWithArray) {
            storeNames = recordWithArray.declared_stores;
          } else {
            // Fallback: collect all IDs that are valid store names
            storeNames = data.map((d: any) => d.id).filter((name: string) => isValidStoreName(name));
          }

          const uniqueStores = Array.from(new Set(storeNames))
            .filter((name: string) => name && name.trim() && isValidStoreName(name))
            .map((name: string) => ({ name: name.trim() }));

          const uniqueNames = uniqueStores.map(s => s.name);
          currentStoresRef.current = uniqueNames;

          console.log('[StoreContext] Loaded declared stores from DB:', uniqueStores);
          setAvailableStoresRaw(prev => {
            const hasChanged = prev.length !== uniqueStores.length ||
              prev.some((store, idx) => store.name !== uniqueStores[idx].name);
            if (hasChanged) {
              return uniqueStores;
            }
            return prev;
          });
        } else {
          currentStoresRef.current = [];
          setAvailableStoresRaw([]);
        }
      } catch (err) {
        console.error('[StoreContext] Failed to load declared stores:', err);
      }
    }

    fetchDeclaredStores();

    // Subscribe to store changes for this warehouse to sync immediately
    const channel = supabase
      .channel(`public:store_context_sync:${cleanMaKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store',
          filter: `warehouse_code=eq.${cleanMaKho}`
        },
        (payload: any) => {
          const { eventType, new: newRow } = payload;
          if (eventType === 'INSERT' || eventType === 'DELETE') {
            console.log('[StoreContext] Real-time structural change (INSERT/DELETE), refetching...');
            fetchDeclaredStores();
          } else if (eventType === 'UPDATE') {
            const newDeclared = newRow?.declared_stores;
            if (Array.isArray(newDeclared)) {
              const hasChanged = newDeclared.length !== currentStoresRef.current.length ||
                newDeclared.some((val, idx) => val !== currentStoresRef.current[idx]);
              if (hasChanged) {
                console.log('[StoreContext] Real-time declared_stores update detected, refetching...');
                fetchDeclaredStores();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [warehouseCode]);

  // Persist currentStoreId to localStorage
  useEffect(() => {
    localStorage.setItem('currentStoreId', currentStoreId);
    // Also persist to old key for backward compat
    localStorage.setItem('rtst_global_market_filter', currentStoreId);
  }, [currentStoreId]);

  // Track previous user to detect account switches on the same browser
  const lastUserRef = useRef<string | null>(null);

  // Auto-validate & sync currentStoreId whenever userProfile or availableStores change
  useEffect(() => {
    if (!userProfile) return;

    const currentUsername = userProfile.username;
    const isUserChanged = lastUserRef.current !== null && lastUserRef.current !== currentUsername;
    lastUserRef.current = currentUsername;

    const availableNames = availableStores.map(s => s.name);

    if (availableNames.length > 0) {
      const isCurrentValid = availableNames.includes(currentStoreId);
      if (!isCurrentValid || isUserChanged) {
        const userPreferred = userProfile.ten_sieu_thi && availableNames.includes(userProfile.ten_sieu_thi)
          ? userProfile.ten_sieu_thi
          : availableNames[0];

        if (userPreferred && userPreferred !== currentStoreId) {
          console.log(`[StoreContext] Syncing store selection: "${currentStoreId}" → "${userPreferred}" for user "${currentUsername}"`);
          setCurrentStoreIdRaw(userPreferred);
          setStoreReady(false);
          setStoreVersion(v => v + 1);
        }
      }
    } else if (userProfile.ten_sieu_thi && (currentStoreId === 'ALL' || !currentStoreId || isUserChanged)) {
      if (currentStoreId !== userProfile.ten_sieu_thi) {
        console.log(`[StoreContext] Fallback syncing currentStoreId to userProfile.ten_sieu_thi: "${userProfile.ten_sieu_thi}"`);
        setCurrentStoreIdRaw(userProfile.ten_sieu_thi);
        setStoreReady(false);
        setStoreVersion(v => v + 1);
      }
    }
  }, [userProfile, availableStores, currentStoreId]);

  // When user changes store, mark as NOT ready until data loads
  const setCurrentStoreId = useCallback((id: string) => {
    setCurrentStoreIdRaw(prev => {
      if (prev === id) return prev;
      console.log(`[StoreContext] Switching store: "${prev}" → "${id}"`);
      setStoreReady(false);
      setStoreVersion(v => v + 1);
      return id;
    });
  }, []);

  // No-op functions to preserve the database as the strict single source of truth for declared stores
  const setAvailableStores = useCallback((stores: StoreInfo[]) => {
    console.log('[StoreContext] setAvailableStores called but ignored to preserve DB-declared stores:', stores);
  }, []);

  const value: StoreContextType = {
    currentStoreId,
    setCurrentStoreId,
    warehouseCode,
    isStoreReady,
    setStoreReady,
    availableStores,
    setAvailableStores,
    storeVersion,
    // Back-compat aliases
    marketFilter: currentStoreId,
    setMarketFilter: setCurrentStoreId,
    availableMarkets: availableStores,
    setAvailableMarkets: setAvailableStores,
    activeRealtimeTab,
    setActiveRealtimeTab,
    activeToolHoTroTab,
    setActiveToolHoTroTab,
    activeTienIchTab,
    setActiveTienIchTab,
    activeLuyKeTab,
    setActiveLuyKeTab,
    activeHealthTab,
    setActiveHealthTab,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

/**
 * Backward-compatible alias for useMarket() — delegates to useStore().
 * Allows existing code to keep using useMarket() without changes initially.
 */
export const useMarket = useStore;
