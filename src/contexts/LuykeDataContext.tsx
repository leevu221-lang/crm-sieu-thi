/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from './NotificationContext';
import { useStore, getStoreItem, setStoreItem } from './StoreContext';
import { 
  MarketInfo, 
  CategoryData, 
  YcxStaffData,
  STORAGE_KEYS 
} from '../pages/RTST/types';
import { 
  parseMarketData, 
  parseCategoryData,
  parseYcxData,
  parseStaffRankData,
  extractSection,
  isValidStoreName,
  normalize,
  safeSetItem
} from '../pages/RTST/utils';

const globalAllStoresCache: Record<string, {
  clusterSummaryInput: string;
  clusterCategoryInput: string;
  staffInput: string;
  staffCategoryInput: string;
  banKemNv: string;
  phucVu: string;
  tragopMatran: string;
  tragopNv: string;
  stPercentTarget: number;
  categoryTargets: any[];
}> = {};

const globalPendingSaves: Set<string> = new Set();

export const LuykeDataContext = createContext<any>(null);

export const LuykeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showNotification } = useNotification();
  const { currentStoreId, warehouseCode, isStoreReady, setStoreReady, setCurrentStoreId } = useStore();
  const maKho = warehouseCode;

  // Global cluster-level BI strings
  const [clusterSummaryInput, setClusterSummaryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT) || '');
  const [clusterCategoryInput, setClusterCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT) || '');
  
  // Per-store inputs
  const [staffInput, setStaffInput] = useState(() => getStoreItem('BI_REAL_STAF_V1', currentStoreId) || '');
  const [staffCategoryInput, setStaffCategoryInput] = useState(() => getStoreItem('BI_REAL_SCAT_V1', currentStoreId) || '');
  const [staffListInput, setStaffListInput] = useState(() => getStoreItem('BI_REAL_STAFF_LIST_V1', currentStoreId) || '');
  const [dataPhanCa, setDataPhanCa] = useState<any>(null);
  const [dtGioCong, setDtGioCong] = useState<string>('');
  const [tragopMatran, setTragopMatran] = useState<string>('');
  const [tragopNv, setTragopNv] = useState<string>('');
  const [categoryTargets, setCategoryTargets] = useState<any[]>([]);
  const [activeStore, setActiveStore] = useState<string>(maKho);
  const [allStoresCache, setAllStoresCache] = useState(() => globalAllStoresCache);

  const updateAllStoresCache = useCallback((updater: any) => {
    setAllStoresCache(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      Object.assign(globalAllStoresCache, next);
      return next;
    });
  }, []);

  // Keep refs of inputs to prevent stale closures during saving
  const clusterSummaryInputRef = useRef(clusterSummaryInput);
  const clusterCategoryInputRef = useRef(clusterCategoryInput);
  const staffInputRef = useRef(staffInput);
  const staffCategoryInputRef = useRef(staffCategoryInput);
  const staffListInputRef = useRef(staffListInput);
  const dtGioCongRef = useRef(dtGioCong);
  const dataPhanCaRef = useRef(dataPhanCa);
  const tragopMatranRef = useRef(tragopMatran);
  const tragopNvRef = useRef(tragopNv);
  const categoryTargetsRef = useRef(categoryTargets);
  const activeStoreRef = useRef(activeStore);
  
  useEffect(() => { activeStoreRef.current = activeStore; }, [activeStore]);

  useEffect(() => { clusterSummaryInputRef.current = clusterSummaryInput; }, [clusterSummaryInput]);
  useEffect(() => { clusterCategoryInputRef.current = clusterCategoryInput; }, [clusterCategoryInput]);
  useEffect(() => { staffInputRef.current = staffInput; }, [staffInput]);
  useEffect(() => { staffCategoryInputRef.current = staffCategoryInput; }, [staffCategoryInput]);
  useEffect(() => { staffListInputRef.current = staffListInput; }, [staffListInput]);
  useEffect(() => { dtGioCongRef.current = dtGioCong; }, [dtGioCong]);
  useEffect(() => { dataPhanCaRef.current = dataPhanCa; }, [dataPhanCa]);
  useEffect(() => { tragopMatranRef.current = tragopMatran; }, [tragopMatran]);
  useEffect(() => { tragopNvRef.current = tragopNv; }, [tragopNv]);
  useEffect(() => { categoryTargetsRef.current = categoryTargets; }, [categoryTargets]);

  // Warehouse code variants for DB queries (handles zero-padding differences)
  const rawMaKho = maKho ? maKho.trim() : '';
  const shortMaKho = rawMaKho.replace(/^0+/, '') || rawMaKho;
  const paddedMaKho = shortMaKho.padStart(7, '0');
  const warehouseCodes = rawMaKho ? [rawMaKho, shortMaKho, paddedMaKho].filter((v, i, a) => a.indexOf(v) === i) : [];



  // AUTO-REACT: When global currentStoreId changes, auto-load data for new store
  // This centralizes store switching logic — pages no longer need manual setActiveStore + loadData calls
  const prevStoreIdRef = useRef(currentStoreId);
  useEffect(() => {
    if (!currentStoreId || currentStoreId === 'ALL') return;
    if (!rawMaKho) return;
    // Skip if store hasn't actually changed (initial mount or same store)
    if (prevStoreIdRef.current === currentStoreId && activeStore === currentStoreId) return;
    
    // FORCE SAVE the old store's data before we switch away from it
    // This prevents losing data that was typed but not yet auto-saved
    if (prevStoreIdRef.current && prevStoreIdRef.current !== 'ALL' && hasLoadedFromDB) {
      if (saveLuykeDataRef.current) {
        console.log(`[LuykeData] AUTO-REACT: Force saving OLD store before switch → "${prevStoreIdRef.current}"`);
        saveLuykeDataRef.current(true, 'auto', prevStoreIdRef.current);
      }
    }
    
    prevStoreIdRef.current = currentStoreId;
    
    console.log(`[LuykeData] AUTO-REACT: currentStoreId changed → "${currentStoreId}"`);
    setActiveStore(currentStoreId);
    loadData(currentStoreId);
  }, [currentStoreId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [processedData, setProcessedData] = useState<{
    markets: MarketInfo[];
    categories: CategoryData[];
    staff: any[];
  }>({
    markets: [],
    categories: [],
    staff: []
  });

  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const skipSubscriptionRef = useRef(0); // Timestamp: ignore subscription until this time
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentIdsRef = useRef<Record<string, string>>({});
  // Store DB-loaded targets so the auto-process useEffect can use them
  // instead of relying on stale closure from setTimeout
  const dbLoadedTargetsRef = useRef<any[] | null>(null);
  // Ref always pointing to the LATEST saveLuykeData to avoid stale closures
  // (critical for clearField which needs to save AFTER state update)
  const saveLuykeDataRef = useRef<((isSilent?: boolean, source?: 'staff' | 'targets' | 'auto', storeName?: string, overrideTargets?: any[]) => Promise<void>) | null>(null);

  const saveLuykeData = useCallback(async (isSilent: boolean = false, source: 'staff' | 'targets' | 'auto' = 'auto', storeName?: string, overrideTargets?: any[]) => {
    const cleanStore = (storeName || activeStore || '').trim();

    if (!rawMaKho || !cleanStore || !isValidStoreName(cleanStore)) {
      if (!isSilent && !cleanStore) {
        showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi lưu!', 'error');
      } else if (cleanStore && !isValidStoreName(cleanStore)) {
        if (!isSilent) showNotification(`Tên siêu thị "${cleanStore}" không hợp lệ. Vui lòng chọn siêu thị cụ thể từ danh sách trên cùng!`, 'error');
        console.warn(`[LuykeData] Skip saving to DB: "${cleanStore}" is not a valid declared supermarket name.`);
      }
      return;
    }

    if (source === 'staff') setIsSavingStaff(true);
    if (source === 'targets') setIsSavingTargets(true);
    setIsProcessingSave(true);
    globalPendingSaves.add(cleanStore);

    try {
      // 1. Fetch existing data directly using active store name as the unique document ID
      const { data: existingData } = await supabase
        .from('store')
        .select('*')
        .eq('id', cleanStore.trim())
        .maybeSingle();

      const targetsToSave = overrideTargets || categoryTargetsRef.current;

      const payload: any = {
        ...(existingData || {}),
        id: cleanStore.trim(), // The Supermarket Name as the unique Document ID / Primary Key!
        warehouse_code: shortMaKho,
        ten_sieu_thi: cleanStore,
        updated_at: new Date().toISOString()
      };

      // Only write/update properties that are actually defined in state
      if (clusterSummaryInputRef.current !== undefined) payload.lk_bi_tong_quan = clusterSummaryInputRef.current;
      if (clusterCategoryInputRef.current !== undefined) payload.lk_nh_sieu_thi = clusterCategoryInputRef.current;
      if (targetsToSave !== undefined) payload.category_targets = targetsToSave;
      if (staffInputRef.current !== undefined) payload.lk_dt_nv = staffInputRef.current;
      if (staffCategoryInputRef.current !== undefined) payload.lk_td_nv = staffCategoryInputRef.current;
      if (staffListInputRef.current !== undefined) payload.ds_nhan_vien = staffListInputRef.current;
      
      // Only include these other fields if they were loaded and set in active state or exist in existingData
      if (dtGioCongRef.current !== undefined && dtGioCongRef.current !== '') payload.dt_gio_cong = dtGioCongRef.current;
      else if (existingData?.dt_gio_cong) payload.dt_gio_cong = existingData.dt_gio_cong;

      if (dataPhanCaRef.current !== undefined && dataPhanCaRef.current !== null) payload.data_phan_ca = dataPhanCaRef.current;
      else if (existingData?.data_phan_ca) payload.data_phan_ca = existingData.data_phan_ca;

      if (tragopMatranRef.current) payload.tragop_matran = tragopMatranRef.current;
      else if (existingData?.tragop_matran) payload.tragop_matran = existingData.tragop_matran;

      if (tragopNvRef.current) payload.tragop_nv = tragopNvRef.current;
      else if (existingData?.tragop_nv) payload.tragop_nv = existingData.tragop_nv;

      // Preserve other context-loaded fields without ever overwriting with null
      if (existingData?.taget_doanh_thu) payload.taget_doanh_thu = existingData.taget_doanh_thu;
      if (existingData?.ban_kem_nv) payload.ban_kem_nv = existingData.ban_kem_nv;
      if (existingData?.phuc_vu) payload.phuc_vu = existingData.phuc_vu;

      const { error } = await supabase
        .from('store')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[LuykeData] Record upsert error:', error);
        throw error;
      }

      // Keep allStoresCache in sync after successful save
      setAllStoresCache(prev => {
        const newCache = { ...prev };
        
        // Update ONLY cluster-level shared fields for ALL stores in cache
        // Per-store fields (staffInput, staffCategoryInput) stay untouched for other stores
        Object.keys(newCache).forEach(store => {
          newCache[store] = {
            ...newCache[store],
            clusterSummaryInput: clusterSummaryInputRef.current || '',
            clusterCategoryInput: clusterCategoryInputRef.current || '',
            // DO NOT copy staffInput/staffCategoryInput — these are per-store!
          };
        });
        
        // Ensure the active store exists and has its specific fields updated
        newCache[cleanStore] = {
          ...(newCache[cleanStore] || {}),
          clusterSummaryInput: clusterSummaryInputRef.current || '',
          clusterCategoryInput: clusterCategoryInputRef.current || '',
          staffInput: staffInputRef.current || '',
          staffCategoryInput: staffCategoryInputRef.current || '',
          banKemNv: prev[cleanStore]?.banKemNv || '',
          phucVu: prev[cleanStore]?.phucVu || '',
          tragopMatran: tragopMatranRef.current || '',
          tragopNv: tragopNvRef.current || '',
          stPercentTarget: prev[cleanStore]?.stPercentTarget ?? 100,
          categoryTargets: targetsToSave || [],
        };
        
        // Mutate the global cache object so it survives unmounts (e.g. fast tab switching)
        Object.assign(globalAllStoresCache, newCache);
        
        return newCache;
      });

      if (!isSilent) showNotification('Lưu dữ liệu Luỹ kế thành công!', 'success');
    } catch (error: any) {
      console.error('Lỗi lưu dữ liệu Luỹ kế:', error);
      let message = `Lỗi lưu dữ liệu Luỹ kế: ${error.message}`;
      if (error.message?.includes('violates row-level security policy')) {
        message = 'Lỗi bảo mật (RLS): Bạn không có quyền lưu dữ liệu cho siêu thị này hoặc cấu hình Supabase chưa cho phép ghi dữ liệu.';
      }
      if (error.message?.includes('Failed to fetch')) {
        message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại cấu hình Supabase trong Secrets.';
      }
      if (!isSilent) showNotification(message, 'error');
    } finally {
      setIsSavingStaff(false);
      setIsSavingTargets(false);
      setIsProcessingSave(false);
      globalPendingSaves.delete(cleanStore);
    }
  }, [rawMaKho, shortMaKho, warehouseCodes, activeStore, clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput, staffListInput, dtGioCong, dataPhanCa, tragopMatran, tragopNv, categoryTargets, showNotification]);

  // Keep the ref always pointing to the LATEST saveLuykeData
  useEffect(() => {
    saveLuykeDataRef.current = saveLuykeData;
  }, [saveLuykeData]);

  // Track when categoryTargets were just re-generated from cluster data
  // so the auto-save effect can save them immediately for the active store
  const targetsJustProcessedRef = useRef(false);

  const handleProcess = useCallback((existingTargets?: any[], overrideSummary?: string, overrideCategory?: string, overrideStaff?: string) => {
    try {
      const summaryToUse = overrideSummary !== undefined ? overrideSummary : clusterSummaryInput;
      const categoryToUse = overrideCategory !== undefined ? overrideCategory : clusterCategoryInput;
      const staffToUse = overrideStaff !== undefined ? overrideStaff : staffInput;

      const inputToParse = extractSection(summaryToUse, "1. BC TỔNG HỢP CỤM");
      const markets = parseMarketData(inputToParse, 0, 'LUYKE');
      
      // Fallback: If no markets found (user pasted only category data), default to activeStore
      const effectiveMarkets = markets.length > 0 ? markets : 
        (activeStore && activeStore !== 'ALL' ? [{ 
          name: activeStore, targetST: 0, actualReal: 0, actualVirtual: 0, 
          dtHomQua: 0, percentHT: 0, isExplicitTarget: false 
        } as MarketInfo] : []);
      
      // Parse category data from both inputs in LUYKE mode
      // Targets and Revenues from the detail tables are ALWAYS per-store. 
      // Force the activeStore to ensure correct marketName association, circumventing the cluster list.
      const targetMarkets = activeStore && activeStore !== 'ALL' 
        ? [{ name: activeStore, targetST: 0, actualReal: 0, actualVirtual: 0, dtHomQua: 0, percentHT: 0, isExplicitTarget: false } as MarketInfo]
        : effectiveMarkets;
        
      const categoriesRev = parseCategoryData(summaryToUse, 0, 30, targetMarkets, 'LUYKE');
      const categoriesTarget = parseCategoryData(categoryToUse, 0, 30, targetMarkets, 'LUYKE');
      
      console.log(`[DEBUG] handleProcess categoriesRev parsed: ${categoriesRev.length}`, categoriesRev.slice(0, 3));
      console.log(`[DEBUG] handleProcess categoriesTarget parsed: ${categoriesTarget.length}`, categoriesTarget.slice(0, 3));
      
      // The user requested: "BC THÁNG -> CHI TIẾT NGÀNH HÀNG - SELECT KHAI BÁO -> THI ĐUA CỤM -> LUỸ KẾ TĐ."
      // This means the source of truth for categories (both revenue and target) is strictly LUỸ KẾ TĐ.
      // We no longer merge categoriesRev (BÁO CÁO TỔNG HỢP) which was overwriting the accurate data.
      
      const categories = categoriesTarget.map(c => ({
        ...c,
        type: c.type === 'ALL' ? 'DT' : c.type
      }));
      
      // NOTE: Do NOT filter categories by activeStore here.
      // LuyKe.tsx already filters by marketFilter via its own filteredCategories useMemo.
      // Filtering here caused a double-filter conflict that silently dropped all data
      // when activeStore format differed from category marketName (e.g. "1" vs "ĐML XXX").

      const staff = staffToUse ? parseStaffRankData(staffToUse) : [];

      setProcessedData({
        markets,
        categories,
        staff
      });

      // Cập nhật activeStore nếu tìm thấy tên siêu thị hợp lệ trong dữ liệu mới và activeStore hiện tại chưa hợp lệ
      if (markets.length > 0 && markets[0].name) {
        const detectedStore = markets[0].name.trim();
        const currentIsFullStore = isValidStoreName(activeStore);
        
        if (isValidStoreName(detectedStore)) {
          if (!currentIsFullStore || activeStore.match(/^\d+$/)) {
            if (detectedStore !== activeStore) {
              setActiveStore(detectedStore);
              setCurrentStoreId(detectedStore); // Sync global store context!
              saveLuykeData(true, 'auto', detectedStore);
            }
          }
        }
      }

      // Merge categories with targets
      // IMPORTANT: Filter categories by activeStore to ensure per-store isolation.
      // Without this filter, both stores get the same merged targets because
      // uniqueParsed deduplicates by name (keeping only the first store's values).
      if (categories.length > 0) {
        setCategoryTargets(prev => {
          const currentTargets = Array.isArray(existingTargets) ? existingTargets : (Array.isArray(prev) ? prev : []);
          
          const savedGlobalPercent = localStorage.getItem('rtst_global_percent');
          const defaultPercent = savedGlobalPercent ? Number(savedGlobalPercent) : 100;
          
          const percentMap = new Map(currentTargets.map((item: any) => [item.name, item.percent]));
          
          // Filter categories to only include those belonging to the active store
          const normActiveStore = (activeStore || '').toUpperCase().replace(/[\s_]+/g, '');
          const storeCategories = isValidStoreName(activeStore)
            ? categories.filter(c => {
                if (!c.marketName) return false;
                const normMarket = c.marketName.toUpperCase().replace(/[\s_]+/g, '');
                return normMarket === normActiveStore ||
                       normMarket.includes(normActiveStore) ||
                       normActiveStore.includes(normMarket);
              })
            : categories;
          
          // Fallback: if no store-specific categories found, use all (e.g. single-store cluster)
          const catsToUse = storeCategories.length > 0 ? storeCategories : categories;
          
          const uniqueParsed = new Map<string, { target: number; type: 'SL' | 'DT' | 'ALL' }>();
          catsToUse.forEach(p => {
            if (!uniqueParsed.has(p.name)) {
              uniqueParsed.set(p.name, { target: p.target, type: p.type || 'ALL' });
            }
          });

          const newTargets: any[] = [];
          uniqueParsed.forEach((data, name) => {
            const existingPercent = percentMap.get(name);
            const percent = existingPercent !== undefined ? existingPercent : defaultPercent;
            newTargets.push({
              name,
              target: data.target,
              adjustedTarget: data.target * (percent / 100),
              percent,
              type: data.type
            });
          });

          // Mark that targets were freshly processed from cluster data
          // → the dedicated effect below will auto-save them for the active store
          if (newTargets.length > 0) {
            targetsJustProcessedRef.current = true;
          }

          return newTargets;
        });
      } else {
        setCategoryTargets([]);
      }
    } catch (error) {
      console.error('Error processing luyke data:', error);
    }
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, activeStore, saveLuykeData]);

  // ═══════════════════════════════════════════════════════
  // AUTO-SYNC: When handleProcess generates new categoryTargets from cluster data,
  // immediately save them to DB for the active store.
  // This ensures "TARGET THI ĐUA" stays in sync with "LUỸ KẾ TĐ" per storeId.
  // ═══════════════════════════════════════════════════════
  const targetsSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!targetsJustProcessedRef.current) return;
    if (!rawMaKho || !activeStore || !isStoreReady) return;
    if (!categoryTargets || categoryTargets.length === 0) return;

    targetsJustProcessedRef.current = false;

    // Debounce 500ms to batch rapid re-processes (e.g. store switch + data load)
    if (targetsSyncTimeoutRef.current) clearTimeout(targetsSyncTimeoutRef.current);
    targetsSyncTimeoutRef.current = setTimeout(() => {
      console.log(`[LuykeData] AUTO-SYNC TARGET THI ĐUA → store: "${activeStore}", targets: ${categoryTargets.length} items`);
      saveLuykeData(true, 'targets', activeStore, categoryTargets);
    }, 500);

    return () => {
      if (targetsSyncTimeoutRef.current) clearTimeout(targetsSyncTimeoutRef.current);
    };
  }, [categoryTargets, rawMaKho, activeStore, isStoreReady, saveLuykeData]);

  // Sync to localStorage with debounce
  // Warehouse-level keys: unprefixed. Per-store keys: prefixed with currentStoreId.
  useEffect(() => {
    const storeId = currentStoreId;
    const timeoutId = setTimeout(() => {
      // Global cluster-level keys
      if (clusterSummaryInput) safeSetItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT, clusterSummaryInput);
      else localStorage.removeItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT);
      
      if (clusterCategoryInput) safeSetItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT, clusterCategoryInput);
      else localStorage.removeItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT);

      // Per-store keys
      if (storeId && storeId !== 'ALL') {
        setStoreItem('BI_REAL_STAF_V1', storeId, staffInput);
        setStoreItem('BI_REAL_SCAT_V1', storeId, staffCategoryInput);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput, currentStoreId]);

  // Auto-save debounce — skip when store is switching
  // MULTI-STORE GUARD: Block auto-save when isStoreReady=false to prevent cross-store contamination
  const prevActiveStoreRef = useRef(activeStore);
  useEffect(() => {
    if (!rawMaKho || !activeStore || !hasLoadedFromDB) return;
    if (isLoading) return;
    if (!isStoreReady) return; // ← GUARD: Don't save during store switch
    
    // Skip auto-save when only activeStore changed (store is switching, data is stale)
    if (prevActiveStoreRef.current !== activeStore) {
      prevActiveStoreRef.current = activeStore;
      return;
    }
    
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveLuykeData(true, 'auto');
      autoSaveTimeoutRef.current = null;
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput, staffListInput, dataPhanCa, dtGioCong, tragopMatran, tragopNv, categoryTargets, rawMaKho, activeStore, hasLoadedFromDB, isLoading, saveLuykeData]);

  // Synchronize component state to global cache immediately when user types
  // This prevents data loss (e.g. pasted text disappearing) if they switch tabs before the 2s auto-save
  useEffect(() => {
    // GUARD: Only sync when actively editing a fully loaded store.
    // If isLoading is true, or store is not ready, or activeStore is transitioning, DO NOT sync!
    if (!activeStore || !hasLoadedFromDB || isLoading || !isStoreReady) return; 
    if (prevActiveStoreRef.current !== activeStore) return;

    updateAllStoresCache((prev: any) => {
      const existing = prev[activeStore] || {};
      
      // Only update if there's an actual change to avoid infinite loops
      if (
        existing.clusterSummaryInput === clusterSummaryInput &&
        existing.clusterCategoryInput === clusterCategoryInput &&
        existing.staffInput === staffInput &&
        existing.staffCategoryInput === staffCategoryInput &&
        existing.tragopMatran === tragopMatran &&
        existing.tragopNv === tragopNv &&
        existing.categoryTargets === categoryTargets
      ) {
        return prev;
      }

      return {
        ...prev,
        [activeStore]: {
          ...existing,
          clusterSummaryInput,
          clusterCategoryInput,
          staffInput,
          staffCategoryInput,
          tragopMatran,
          tragopNv,
          categoryTargets
        }
      };
    });
  }, [
    activeStore, clusterSummaryInput, clusterCategoryInput, staffInput, 
    staffCategoryInput, tragopMatran, tragopNv, categoryTargets, 
    hasLoadedFromDB, updateAllStoresCache
  ]);

  const [isFirstProcess, setIsFirstProcess] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    
    // Only debounce user input in KHAI BÁO, NOT initial loads from DB
    // hasLoadedFromDB is no longer a trigger since loadData calls handleProcess synchronously.
    const delay = 300;
    const timeoutId = setTimeout(() => {
      handleProcess();
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, activeStore, isLoading, handleProcess]);

  // ═══════════════════════════════════════════════════════
  // loadData: Single direct query per store — fast & clean
  // MULTI-STORE: Clears per-store state before loading (Clear-then-Load pattern)
  // ═══════════════════════════════════════════════════════
  const loadData = useCallback(async (storeName?: string) => {
    if (!rawMaKho) { setIsLoading(false); return; }
    
    const targetStore = storeName || activeStore;
    
    // MULTI-STORE: Cache-first store switching to prevent UI white-screens/delays
    const cachedData = globalAllStoresCache[targetStore];
    if (cachedData) {
      setClusterSummaryInput(cachedData.clusterSummaryInput || '');
      setClusterCategoryInput(cachedData.clusterCategoryInput || '');
      setStaffInput(cachedData.staffInput || '');
      setStaffCategoryInput(cachedData.staffCategoryInput || '');
      setStaffListInput(''); // Note: staff list isn't cached, could be added later
      setDtGioCong(''); 
      setDataPhanCa(null);
      setTragopMatran(cachedData.tragopMatran || '');
      setTragopNv(cachedData.tragopNv || '');
      setCategoryTargets(cachedData.categoryTargets || []);
      
      // Process synchronously to instantly display cached data without 300ms wait
      handleProcess(
        cachedData.categoryTargets || [],
        cachedData.clusterSummaryInput || '',
        cachedData.clusterCategoryInput || '',
        cachedData.staffInput || ''
      );
    } else {
      setClusterSummaryInput('');
      setClusterCategoryInput('');
      setStaffInput('');
      setStaffCategoryInput('');
      setStaffListInput('');
      setDtGioCong('');
      setDataPhanCa(null);
      setTragopMatran('');
      setTragopNv('');
      setCategoryTargets([]);
    }
    
    // Block auto-save + cancel pending
    setIsLoading(true);
    if (autoSaveTimeoutRef.current) { clearTimeout(autoSaveTimeoutRef.current); autoSaveTimeoutRef.current = null; }
    skipAutoSaveRef.current = true;
    skipSubscriptionRef.current = Date.now() + 2000;
    
    const fallbackTimeout = setTimeout(() => { setIsLoading(false); setStoreReady(true); }, 3000);
    console.log(`[LuykeData] loadData → store: "${targetStore}", maKho: ${shortMaKho}`);
    
    try {
      // Query directly using the selected store name as the unique document ID
      const { data, error } = await supabase
        .from('store')
        .select('id, lk_bi_tong_quan, lk_nh_sieu_thi, lk_dt_nv, lk_td_nv, ds_nhan_vien, dt_gio_cong, data_phan_ca, tragop_matran, tragop_nv, category_targets, ten_sieu_thi, updated_at, taget_doanh_thu, ban_kem_nv, phuc_vu')
        .eq('id', targetStore.trim())
        .maybeSingle();
      
      if (error) console.error('[LuykeData] Query error:', error);
      
      let clusterSummary = '';
      let clusterCategory = '';
      let loadedTargets: any[] = [];

      if (data) {
        clusterSummary = data.lk_bi_tong_quan || '';
        clusterCategory = data.lk_nh_sieu_thi || '';

        // Pre-populate allStoresCache for inactive card display
        const activeName = data.ten_sieu_thi || targetStore || '';
        if (activeName) {
          updateAllStoresCache((prev: any) => ({
            ...prev,
            [activeName]: {
              clusterSummaryInput: clusterSummary,
              clusterCategoryInput: clusterCategory,
              staffInput: data.lk_dt_nv || '',
              staffCategoryInput: data.lk_td_nv || '',
              banKemNv: data.ban_kem_nv || '',
              phucVu: data.phuc_vu ? 'has_data' : '',
              tragopMatran: data.tragop_matran || '',
              tragopNv: data.tragop_nv || '',
              stPercentTarget: data.taget_doanh_thu?.stPercentTarget ?? 100,
              categoryTargets: Array.isArray(data.category_targets) ? data.category_targets : [],
            }
          }));
        }

        console.log(`[LuykeData] ✓ Data loaded for: "${activeName}"`);
        
        if (globalPendingSaves.has(targetStore)) {
          console.log(`[LuykeData] Save in progress for "${targetStore}", skipping DB overwrite for input fields`);
        } else {
          setClusterSummaryInput(clusterSummary);
          setClusterCategoryInput(clusterCategory);
          
          // Process synchronously to instantly display DB data without 300ms wait
          handleProcess(loadedTargets, clusterSummary, clusterCategory, data.lk_dt_nv || '');
        }
        
        setStaffInput(data.lk_dt_nv || '');
        setStaffCategoryInput(data.lk_td_nv || '');
        setStaffListInput(data.ds_nhan_vien || '');
        setDtGioCong(data.dt_gio_cong || '');
        setDataPhanCa(data.data_phan_ca || null);
        setTragopMatran(data.tragop_matran || '');
        setTragopNv(data.tragop_nv || '');
        if (Array.isArray(data.category_targets)) {
          setCategoryTargets(data.category_targets);
          loadedTargets = data.category_targets;
        } else {
          setCategoryTargets([]);
        }
        if (data.ten_sieu_thi) setActiveStore(data.ten_sieu_thi);
      } else {
        console.log(`[LuykeData] ✗ No data for: "${targetStore}" → clearing fields`);
        if (!globalPendingSaves.has(targetStore)) {
          setClusterSummaryInput('');
          setClusterCategoryInput('');
          
          // Process synchronously to clear data without 300ms wait
          handleProcess([], '', '', '');
        }
        setStaffInput('');
        setStaffCategoryInput('');
        setStaffListInput('');
        setDtGioCong('');
        setDataPhanCa(null);
        setTragopMatran('');
        setTragopNv('');
        setCategoryTargets([]);
        if (targetStore) setActiveStore(targetStore);
      }
      
      skipAutoSaveRef.current = true;
      setHasLoadedFromDB(true);
      // Store DB targets in ref so the auto-process useEffect can use them.
      // The useEffect will fire with the LATEST handleProcess closure (which has
      // the correct clusterCategoryInput) and pass these DB targets for % preservation.
      dbLoadedTargetsRef.current = loadedTargets;
    } catch (err) {
      console.error('[LuykeData] loadData error:', err);
    } finally {
      clearTimeout(fallbackTimeout);
      setIsLoading(false);
      setHasLoadedFromDB(true);
      // MULTI-STORE: Mark store as ready — auto-save can resume
      setStoreReady(true);
    }
  }, [rawMaKho, warehouseCodes, activeStore, handleProcess, setStoreReady]);


  // Set up Supabase Realtime subscription for store
  useEffect(() => {
    if (!shortMaKho) return;
    
    const channel = supabase
      .channel(`public:store:warehouse_code=eq.${shortMaKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store',
          filter: `warehouse_code=eq.${shortMaKho}`
        },
        (payload: any) => {
          if (Date.now() < skipSubscriptionRef.current) return;
          
          // BLOCK REALTIME OVERWRITES: If we have a pending auto-save, we are actively editing!
          // We MUST ignore realtime updates to prevent another module's quick save (like useRTSTSharedData) 
          // from echoing back a stale DB state and wiping our pending local edits.
          if (autoSaveTimeoutRef.current) {
            console.log('[LuykeData] 🚫 Ignored realtime update due to pending auto-save (prevented local state wipe).');
            return;
          }

          if (payload.new) {
            const record = payload.new as any;
            
            const recordStore = record.ten_sieu_thi || '';
            const isGlobalRecord = !recordStore;
            
            // IGNORE legacy global records to prevent data contamination and state wipes
            if (isGlobalRecord) {
              return;
            }
            
            // Verify it matches our active store
            const normRecordStore = normalize(recordStore);
            const normActiveStore = normalize(activeStoreRef.current || '');
            if (normRecordStore && normActiveStore && normRecordStore !== normActiveStore) return;
            
            skipAutoSaveRef.current = true;
            
            // Update both cluster-level and store-specific fields from the matching store record
            setClusterSummaryInput((prev: string) => 
              prev !== (record.lk_bi_tong_quan || '') ? (record.lk_bi_tong_quan || '') : prev
            );
            setClusterCategoryInput((prev: string) => 
              prev !== (record.lk_nh_sieu_thi || '') ? (record.lk_nh_sieu_thi || '') : prev
            );
            setStaffInput((prev: string) => 
              prev !== (record.lk_dt_nv || '') ? (record.lk_dt_nv || '') : prev
            );
            setStaffCategoryInput((prev: string) => 
              prev !== (record.lk_td_nv || '') ? (record.lk_td_nv || '') : prev
            );
            setStaffListInput((prev: string) => 
              prev !== (record.ds_nhan_vien || '') ? (record.ds_nhan_vien || '') : prev
            );
            setDtGioCong((prev: string) => 
              prev !== (record.dt_gio_cong || '') ? (record.dt_gio_cong || '') : prev
              );
              setDataPhanCa((prev: any) => {
                if (JSON.stringify(prev) !== JSON.stringify(record.data_phan_ca)) {
                  return record.data_phan_ca || null;
                }
                return prev;
              });
              if (record.tragop_matran !== undefined) {
                setTragopMatran((prev: any) => {
                  if (JSON.stringify(prev) !== JSON.stringify(record.tragop_matran)) {
                    return record.tragop_matran || null;
                  }
                  return prev;
                });
              }
              if (record.tragop_nv !== undefined) {
                setTragopNv((prev: any) => {
                  if (JSON.stringify(prev) !== JSON.stringify(record.tragop_nv)) {
                    return record.tragop_nv || null;
                  }
                  return prev;
                });
              }
              if (record.category_targets && Array.isArray(record.category_targets)) {
                setCategoryTargets(record.category_targets);
              } else if (record.category_targets === null) {
                setCategoryTargets([]);
              }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shortMaKho]);

  const syncFromRealtime = useCallback(async () => {
    if (!rawMaKho) return;
    
    const { data: rtDataRaw, error: rtError } = await supabase
      .from('store')
      .select('rt_bi_tong_quan, updated_at')
      .in('warehouse_code', warehouseCodes);

    // Sort client-side and pick most recent
    const rtData = rtDataRaw ? [...rtDataRaw].sort((a: any, b: any) => {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    }).slice(0, 1) : null;

    if (rtError || !rtData || rtData.length === 0) {
      showNotification('Không tìm thấy dữ liệu Realtime để đồng bộ.', 'error');
      return;
    }

    const basePayload: any = {
      warehouse_code: shortMaKho,
      ten_sieu_thi: activeStore,
      lk_bi_tong_quan: rtData[0].rt_bi_tong_quan,
      lk_nh_sieu_thi: undefined,
      taget_doanh_thu: undefined,
      category_targets: undefined,
      lk_dt_nv: undefined,
      lk_td_nv: undefined,
      ban_kem_nv: undefined,
      updated_at: new Date().toISOString()
    };
    
    // Clean up undefined fields so we don't overwrite with nulls
    Object.keys(basePayload).forEach(k => basePayload[k] === undefined && delete basePayload[k]);

    const payload: any = {
      id: activeStore.trim(), // The Supermarket Name as the unique Document ID / Primary Key!
      warehouse_code: shortMaKho,
      ten_sieu_thi: activeStore,
      lk_bi_tong_quan: rtData[0].rt_bi_tong_quan,
      updated_at: new Date().toISOString()
    };

    const { error: lkError } = await supabase
      .from('store')
      .upsert(payload, { onConflict: 'id' });

    if (lkError) {
      showNotification('Lỗi đồng bộ dữ liệu: ' + lkError.message, 'error');
      return;
    }

    setClusterSummaryInput(rtData[0].rt_bi_tong_quan || '');
    handleProcess();
  }, [rawMaKho, shortMaKho, warehouseCodes, activeStore, handleProcess, showNotification]);

  // Stable setActiveStore callback (prevents KhaiBao effect from re-running every render)
  const handleSetActiveStore = useCallback((store: string) => {
    setActiveStore(store);
  }, []);

  // Synchronous setters to prevent stale closures during rapid paste/blur events
  const setClusterSummaryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(clusterSummaryInputRef.current) : val;
    clusterSummaryInputRef.current = newVal; setClusterSummaryInput(newVal);
  }, []);
  const setClusterCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(clusterCategoryInputRef.current) : val;
    clusterCategoryInputRef.current = newVal; setClusterCategoryInput(newVal);
  }, []);
  const setStaffInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(staffInputRef.current) : val;
    staffInputRef.current = newVal; setStaffInput(newVal);
  }, []);
  const setStaffCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(staffCategoryInputRef.current) : val;
    staffCategoryInputRef.current = newVal; setStaffCategoryInput(newVal);
  }, []);
  const setStaffListInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(staffListInputRef.current) : val;
    staffListInputRef.current = newVal; setStaffListInput(newVal);
  }, []);
  const setDtGioCongSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(dtGioCongRef.current) : val;
    dtGioCongRef.current = newVal; setDtGioCong(newVal);
  }, []);
  const setTragopMatranSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(tragopMatranRef.current) : val;
    tragopMatranRef.current = newVal; setTragopMatran(newVal);
  }, []);
  const setTragopNvSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(tragopNvRef.current) : val;
    tragopNvRef.current = newVal; setTragopNv(newVal);
  }, []);

  const value = {
    clusterSummaryInput, setClusterSummaryInput: setClusterSummaryInputSync,
    clusterCategoryInput, setClusterCategoryInput: setClusterCategoryInputSync,
    staffInput, setStaffInput: setStaffInputSync,
    staffCategoryInput, setStaffCategoryInput: setStaffCategoryInputSync,
    staffListInput, setStaffListInput: setStaffListInputSync,
    dataPhanCa, setDataPhanCa,
    dtGioCong, setDtGioCong: setDtGioCongSync,
    tragopMatran, setTragopMatran: setTragopMatranSync,
    tragopNv, setTragopNv: setTragopNvSync,
    categoryTargets, setCategoryTargets,
    allStoresCache,
    processedData,
    isProcessingSave,
    isSavingStaff,
    isSavingTargets,
    isLoading,
    processData: handleProcess,
    saveLuykeData,
    syncFromRealtime,
    loadData,
    setActiveStore: handleSetActiveStore,
    clearField: (setter: (val: string) => void) => {
      skipSubscriptionRef.current = Date.now() + 10000;
      setter('');
      setTimeout(() => {
        if (saveLuykeDataRef.current) {
          saveLuykeDataRef.current(true, 'auto');
        }
      }, 200);
    }
  };

  return (
    <LuykeDataContext.Provider value={value}>
      {children}
    </LuykeDataContext.Provider>
  );
};
