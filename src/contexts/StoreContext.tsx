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
import { URL_PAGE_MAP } from '../constants/routes';

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
  activeRealtimeTab: 'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay' | 'real_dthu_nv';
  setActiveRealtimeTab: (tab: 'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay' | 'real_dthu_nv') => void;
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
  const warehouseCode = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '';

  const [currentStoreId, setCurrentStoreIdRaw] = useState(() => {
    if (userProfile && userProfile.role !== 'guest') {
      const preferred = (userProfile as any)?.selected_store || userProfile.ten_sieu_thi;
      if (preferred && isValidStoreName(preferred)) {
        return preferred;
      }
    }
    return localStorage.getItem('currentStoreId') || 'ALL';
  });
  const [isStoreReady, setStoreReady] = useState(true);
  const [availableStores, setAvailableStoresRaw] = useState<StoreInfo[]>([]);
  const [storeVersion, setStoreVersion] = useState(0);
  // Helper to determine if the current URL or saved page belongs to pageKey
  const isCurrentUrlForPage = (pageKey: string): boolean => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const mappedPage = URL_PAGE_MAP[path];
      if (mappedPage === pageKey) return true;
      
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      if (pageParam === pageKey) return true;
      
      if (window.location.hash.startsWith('#sync_thuong=') && pageKey === 'health') return true;

      if (!path || path === '/' || path === '/index.html') {
        const savedPage = localStorage.getItem('crm_active_page') || 'realtime';
        return savedPage === pageKey;
      }
    } catch {}
    return false;
  };

  // Helper to read initial tab from URL (if on this page) or localStorage with fallback
  const getInitialTab = <T extends string>(pageKey: string, allowedTabs: T[], defaultTab: T): T => {
    try {
      if (isCurrentUrlForPage(pageKey)) {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab');
        if (urlTab && allowedTabs.includes(urlTab as T)) {
          return urlTab as T;
        }
      }
      const saved = localStorage.getItem(`crm_active_${pageKey}_tab`);
      if (saved && allowedTabs.includes(saved as T)) {
        return saved as T;
      }
    } catch {}
    return defaultTab;
  };

  const [activeRealtimeTab, setActiveRealtimeTabRaw] = useState<'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay' | 'real_dthu_nv'>(() =>
    getInitialTab('realtime', ['summary', 'khai_thac', 'khai_thac_moi', 'muc_tieu_ngay', 'real_dthu_nv'], 'summary')
  );
  const [activeToolHoTroTab, setActiveToolHoTroTabRaw] = useState<string>(() => {
    try {
      if (isCurrentUrlForPage('toolhotro')) {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab');
        if (urlTab) return urlTab;
      }
      return localStorage.getItem('crm_active_toolhotro_tab') || 'all-sticker';
    } catch {
      return 'all-sticker';
    }
  });
  const [activeTienIchTab, setActiveTienIchTabRaw] = useState<string>(() => {
    try {
      if (isCurrentUrlForPage('tienich')) {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab');
        if (urlTab) return urlTab;
      }
      return localStorage.getItem('crm_active_tienich_tab') || 'phan-ca-thang';
    } catch {
      return 'phan-ca-thang';
    }
  });
  const [activeLuyKeTab, setActiveLuyKeTabRaw] = useState<'summary' | 'cum' | 'efficiency' | 'thuong_st' | 'bcdtnh' | 'ssg_boss'>(() =>
    getInitialTab('luyke', ['summary', 'cum', 'efficiency', 'thuong_st', 'bcdtnh', 'ssg_boss'], 'summary')
  );
  const [activeHealthTab, setActiveHealthTabRaw] = useState<'DOANH_THU' | 'TONG_HOP_NV' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'TRA_CHAM_NV' | 'KHAI_THAC_NV' | 'RANK_3T_NV' | 'GIA_TRI_DH'>(() =>
    getInitialTab('health', ['DOANH_THU', 'TONG_HOP_NV', 'CHI_TIET', 'THI_DUA', 'NGANH_HANG', 'PHUC_VU', 'BAN_KEM_NV', 'THUONG_NV', 'TRA_CHAM_NV', 'KHAI_THAC_NV', 'RANK_3T_NV', 'GIA_TRI_DH'], 'DOANH_THU')
  );

  const updateUrlTab = (tab: string) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const setActiveRealtimeTab = useCallback((tab: 'summary' | 'khai_thac' | 'khai_thac_moi' | 'muc_tieu_ngay' | 'real_dthu_nv') => {
    setActiveRealtimeTabRaw(tab);
    try {
      localStorage.setItem('crm_active_realtime_tab', tab);
      updateUrlTab(tab);
    } catch {}
  }, []);

  const setActiveToolHoTroTab = useCallback((tab: string) => {
    setActiveToolHoTroTabRaw(tab);
    try {
      localStorage.setItem('crm_active_toolhotro_tab', tab);
      updateUrlTab(tab);
    } catch {}
  }, []);

  const setActiveTienIchTab = useCallback((tab: string) => {
    setActiveTienIchTabRaw(tab);
    try {
      localStorage.setItem('crm_active_tienich_tab', tab);
      updateUrlTab(tab);
    } catch {}
  }, []);

  const setActiveLuyKeTab = useCallback((tab: 'summary' | 'cum' | 'efficiency' | 'thuong_st' | 'bcdtnh' | 'ssg_boss') => {
    setActiveLuyKeTabRaw(tab);
    try {
      localStorage.setItem('crm_active_luyke_tab', tab);
      updateUrlTab(tab);
    } catch {}
  }, []);

  const setActiveHealthTab = useCallback((tab: 'DOANH_THU' | 'TONG_HOP_NV' | 'CHI_TIET' | 'THI_DUA' | 'NGANH_HANG' | 'PHUC_VU' | 'BAN_KEM_NV' | 'THUONG_NV' | 'TRA_CHAM_NV' | 'KHAI_THAC_NV' | 'RANK_3T_NV' | 'GIA_TRI_DH') => {
    setActiveHealthTabRaw(tab);
    try {
      localStorage.setItem('crm_active_health_tab', tab);
      updateUrlTab(tab);
    } catch {}
  }, []);

  // Lắng nghe popstate để cập nhật active tab khi bấm nút Back/Forward của trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab');
        if (!urlTab) return;
        
        const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
        const page = URL_PAGE_MAP[path] || params.get('page');
        
        if (page === 'realtime') {
          setActiveRealtimeTabRaw(urlTab as any);
        } else if (page === 'luyke') {
          setActiveLuyKeTabRaw(urlTab as any);
        } else if (page === 'health') {
          setActiveHealthTabRaw(urlTab as any);
        } else if (page === 'toolhotro') {
          setActiveToolHoTroTabRaw(urlTab);
        } else if (page === 'tienich') {
          setActiveTienIchTabRaw(urlTab);
        }
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keep a mutable ref to track currently loaded store names to skip redundant state changes
  const currentStoresRef = useRef<string[]>([]);

  // Reset store selection whenever warehouseCode changes to avoid carrying over another warehouse's store
  const prevWarehouseRef = useRef(warehouseCode);
  useEffect(() => {
    if (prevWarehouseRef.current && prevWarehouseRef.current !== warehouseCode) {
      prevWarehouseRef.current = warehouseCode;
      setCurrentStoreIdRaw('ALL');
      currentStoresRef.current = [];
      setAvailableStoresRaw([]);
    } else {
      prevWarehouseRef.current = warehouseCode;
    }
  }, [warehouseCode]);

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
        const savedStore = (userProfile as any)?.selected_store || userProfile.ten_sieu_thi;
        const userPreferred = savedStore && availableNames.includes(savedStore)
          ? savedStore
          : availableNames[0];

        if (userPreferred && userPreferred !== currentStoreId) {
          console.log(`[StoreContext] Syncing store selection: "${currentStoreId}" → "${userPreferred}" for user "${currentUsername}"`);
          setCurrentStoreIdRaw(userPreferred);
          setStoreReady(false);
          setStoreVersion(v => v + 1);
        }
      }
    } else {
      const fallbackStore = (userProfile as any)?.selected_store || userProfile.ten_sieu_thi;
      if (fallbackStore && isValidStoreName(fallbackStore)) {
        if (currentStoreId !== fallbackStore) {
          console.log(`[StoreContext] Fallback syncing currentStoreId to preferred store: "${fallbackStore}"`);
          setCurrentStoreIdRaw(fallbackStore);
          setStoreReady(false);
          setStoreVersion(v => v + 1);
        }
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

      // Persist active store selection to ql_nguoi_dung in Firebase so any other browser device stays synchronized
      if (userProfile?.username && userProfile.username !== 'ADMIN' && userProfile.role !== 'guest' && isValidStoreName(id)) {
        supabase
          .from('ql_nguoi_dung')
          .update({
            selected_store: id,
            updated_at: new Date().toISOString()
          })
          .eq('username', userProfile.username)
          .then(() => {})
          .catch((err) => console.warn('[StoreContext] Error syncing selected_store to ql_nguoi_dung:', err));
      }

      return id;
    });
  }, [userProfile?.username, userProfile?.role]);

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
