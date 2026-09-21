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
  isKhoLuuDong,
  safeSetItem,
  normalizeStoreId,
  cleanCategoryName
} from '../pages/RTST/utils';
import { cleanBiReportText } from '../utils/rtstHelpers';
import { decompressString } from '../pages/RTST/hooks/useRealtimeData';

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
  const { currentStoreId, warehouseCode, isStoreReady, setStoreReady, setCurrentStoreId, availableStores } = useStore();
  const maKho = warehouseCode;

  // Global cluster-level BI strings
  const [clusterSummaryInput, setClusterSummaryInput] = useState(() => {
    try {
      return localStorage.getItem('rt_catrev') || localStorage.getItem('rtst_cluster_summary') || localStorage.getItem('rtst_catrev') || '';
    } catch {
      return '';
    }
  });
  const [clusterCategoryInput, setClusterCategoryInput] = useState('');
  
  // Per-store inputs
  const [staffInput, setStaffInput] = useState('');
  const [staffCategoryInput, setStaffCategoryInput] = useState('');
  const [staffListInput, setStaffListInput] = useState('');
  const [dataPhanCa, setDataPhanCa] = useState<any>(null);
  const [dtGioCong, setDtGioCong] = useState<string>('');
  const [tragopMatran, setTragopMatran] = useState<string>('');
  const [tragopNv, setTragopNv] = useState<string>('');
  const [banKemNv, setBanKemNvState] = useState<string>('');
  const [categoryTargets, setCategoryTargets] = useState<any[]>([]);
  const [activeStore, setActiveStore] = useState<string>(maKho);
  const [allStoresCache, setAllStoresCache] = useState(() => globalAllStoresCache);

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
  const isDirtyRef = useRef(false);
  const skipSubscriptionRef = useRef(0); // Timestamp: ignore subscription until this time
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentIdsRef = useRef<Record<string, string>>({});
  // Store DB-loaded targets so the auto-process useEffect can use them
  // instead of relying on stale closure from setTimeout
  const dbLoadedTargetsRef = useRef<any[] | null>(null);
  // Ref always pointing to the LATEST saveLuykeData to avoid stale closures
  // (critical for clearField which needs to save AFTER state update)
  const saveLuykeDataRef = useRef<((isSilent?: boolean, source?: 'staff' | 'targets' | 'auto' | string, storeName?: string, overrideTargets?: any[], fieldName?: string) => Promise<void>) | null>(null);


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
  const banKemNvRef = useRef(banKemNv);
  // Snapshot of the last value actually written to DB, keyed per store ID.
  // Used to skip no-op saves when field hasn't changed.
  const dbStoreSnapshotsRef = useRef<Record<string, string>>({});

  const computeStoreSnapshotKey = useCallback((
    storeName: string,
    summary: string,
    category: string,
    targets: any[],
    staff: string,
    staffCategory: string,
    staffList: string,
    dtGioCongVal: string,
    dataPhanCaVal: any,
    tragopMatranVal: string,
    tragopNvVal: string,
    banKemNvVal: string
  ) => {
    return JSON.stringify([
      normalizeStoreId(storeName),
      summary || '',
      category || '',
      targets || [],
      staff || '',
      staffCategory || '',
      staffList || '',
      dtGioCongVal || '',
      dataPhanCaVal || null,
      tragopMatranVal || '',
      tragopNvVal || '',
      banKemNvVal || ''
    ]);
  }, []);

  const categoryTargetsRef = useRef(categoryTargets);
  const percentCacheRef = useRef<Map<string, number>>(new Map());
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
  useEffect(() => { banKemNvRef.current = banKemNv; }, [banKemNv]);
  useEffect(() => { 
    categoryTargetsRef.current = categoryTargets; 
    categoryTargets.forEach(t => {
      if (t.percent !== undefined) {
        percentCacheRef.current.set(cleanCategoryName(t.name), t.percent);
      }
    });
  }, [categoryTargets]);

  const setBanKemNvSync = useCallback((val: string) => {
    if (val === banKemNvRef.current) return;
    setBanKemNvState(val);
    banKemNvRef.current = val;
    isDirtyRef.current = true;
  }, []);

  // Warehouse code variants for DB queries (handles zero-padding differences)
  const rawMaKho = maKho ? maKho.trim() : '';
  const shortMaKho = rawMaKho.replace(/^0+/, '') || rawMaKho;
  const paddedMaKho = shortMaKho.padStart(7, '0');
  const warehouseCodes = rawMaKho ? [rawMaKho, shortMaKho, paddedMaKho].filter((v, i, a) => a.indexOf(v) === i) : [];



  // Guard against cross-warehouse contamination
  const prevWarehouseCodeRef = useRef(rawMaKho);
  useEffect(() => {
    if (prevWarehouseCodeRef.current && prevWarehouseCodeRef.current !== rawMaKho) {
      Object.keys(globalAllStoresCache).forEach(k => delete globalAllStoresCache[k]);
      globalPendingSaves.clear();
      prevStoreIdRef.current = '';
      prevWarehouseCodeRef.current = rawMaKho;
      setAllStoresCache({});
      setHasLoadedFromDB(false);
    }
  }, [rawMaKho]);



  const saveLuykeData = useCallback(async (isSilent: boolean = false, source: 'staff' | 'targets' | 'auto' | string = 'auto', storeName?: string, overrideTargets?: any[], fieldName?: string) => {
    // A save is happening now — cancel any pending 800ms debounced auto-save so it
    // doesn't fire a second, redundant write right after this one for the same data.
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    let cleanStore = (storeName || activeStore || '').trim();

    // If cleanStore is 'ALL' or not a valid declared store name, resolve to first available valid store for cluster data
    if ((!cleanStore || cleanStore === 'ALL' || !isValidStoreName(cleanStore)) && availableStores && availableStores.length > 0) {
      const candidate = availableStores.find(s => s.name && s.name !== 'ALL' && isValidStoreName(s.name));
      if (candidate) {
        cleanStore = candidate.name;
        console.log(`[LuykeData] Resolved target store for cluster data: "${cleanStore}"`);
      }
    }

    if (!rawMaKho || !cleanStore || !isValidStoreName(cleanStore)) {
      if (!isSilent && !cleanStore) {
        showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi lưu!', 'error');
      } else if (cleanStore && !isValidStoreName(cleanStore)) {
        if (!isSilent) showNotification(`Tên siêu thị "${cleanStore}" không hợp lệ. Vui lòng chọn siêu thị cụ thể từ danh sách trên cùng!`, 'error');
        console.warn(`[LuykeData] Skip saving to DB: "${cleanStore}" is not a valid declared supermarket name.`);
      }
      return;
    }

    const targetsToSave = overrideTargets || categoryTargetsRef.current;

    const summaryVal = cleanBiReportText(clusterSummaryInputRef.current || '');
    const categoryVal = cleanBiReportText(clusterCategoryInputRef.current || '');
    const staffVal = cleanBiReportText(staffInputRef.current || '');
    const staffCategoryVal = cleanBiReportText(staffCategoryInputRef.current || '');
    const staffListVal = cleanBiReportText(staffListInputRef.current || '') || '';
    const dtGioCongVal = cleanBiReportText(dtGioCongRef.current || '') || '';
    const tragopMatranVal = cleanBiReportText(tragopMatranRef.current || '') || '';
    const tragopNvVal = cleanBiReportText(tragopNvRef.current || '') || '';
    const banKemNvVal = cleanBiReportText(banKemNvRef.current || '') || '';
    const categoryTargetsVal = (targetsToSave && targetsToSave.length > 0) ? targetsToSave : [];

    // Skip the write entirely if nothing actually differs from the last value persisted for this store
    const storeKey = normalizeStoreId(cleanStore);
    const currentSnapshotKey = computeStoreSnapshotKey(
      cleanStore, summaryVal, categoryVal, categoryTargetsVal, staffVal,
      staffCategoryVal, staffListVal, dtGioCongVal, dataPhanCaRef.current, tragopMatranVal,
      tragopNvVal, banKemNvVal
    );
    if (dbStoreSnapshotsRef.current[storeKey] === currentSnapshotKey) {
      console.log(`[LuykeData] Skip save — no change detected for "${cleanStore}"${fieldName ? ` (${fieldName})` : ''}`);
      return;
    }

    if (source === 'staff') setIsSavingStaff(true);
    if (source === 'targets') setIsSavingTargets(true);
    setIsProcessingSave(true);
    globalPendingSaves.add(cleanStore);

    try {
      const payload: any = {
        id: normalizeStoreId(cleanStore), // Normalized UPPERCASE ID to prevent duplicates
        warehouse_code: shortMaKho,
        ten_sieu_thi: cleanStore,
        updated_at: new Date().toISOString()
      };

      // Only include LK fields if they actually have content, or if this save was explicitly triggered for that field
      if (summaryVal) {
        payload.lk_bi_tong_quan = summaryVal;
      } else if (fieldName === 'LUỸ KẾ DT') {
        payload.lk_bi_tong_quan = '';
      }

      if (categoryVal) {
        payload.lk_nh_sieu_thi = categoryVal;
      } else if (fieldName === 'LUỸ KẾ TĐ') {
        payload.lk_nh_sieu_thi = '';
      }

      // ONLY include per-store fields if they have content, or if explicitly cleared!
      // This prevents empty in-memory fields from wiping existing DB records with ""
      if (categoryTargetsVal && categoryTargetsVal.length > 0) {
        payload.category_targets = categoryTargetsVal;
      } else if (fieldName === 'TARGET THI ĐUA') {
        payload.category_targets = [];
      }

      if (staffVal) {
        payload.lk_dt_nv = staffVal;
      } else if (fieldName === 'DOANH THU NV' || fieldName === 'CHI TIẾT DTNV') {
        payload.lk_dt_nv = '';
      }

      if (staffCategoryVal) {
        payload.lk_td_nv = staffCategoryVal;
      } else if (fieldName === 'THI ĐUA NV') {
        payload.lk_td_nv = '';
      }

      if (staffListVal) {
        payload.ds_nhan_vien = staffListVal;
      } else if (fieldName === 'DS NHÂN VIÊN') {
        payload.ds_nhan_vien = '';
      }

      if (dtGioCongVal) {
        payload.dt_gio_cong = dtGioCongVal;
      }

      if (dataPhanCaRef.current) {
        payload.data_phan_ca = dataPhanCaRef.current;
      }

      if (tragopMatranVal) {
        payload.tragop_matran = tragopMatranVal;
      } else if (fieldName === 'TRẢ GÓP MT') {
        payload.tragop_matran = '';
      }

      if (tragopNvVal) {
        payload.tragop_nv = tragopNvVal;
      } else if (fieldName === 'TRẢ GÓP NV') {
        payload.tragop_nv = '';
      }

      if (banKemNvVal) {
        payload.ban_kem_nv = banKemNvVal;
      } else if (fieldName === 'BÁN KÈM NV' || fieldName === 'HQ BÁN KÈM NV') {
        payload.ban_kem_nv = '';
      }

      const { error } = await supabase
        .from('store')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[LuykeData] Record upsert error:', error);
        throw error;
      }

      // Synchronize LK cluster fields (LUỸ KẾ DT & LUỸ KẾ TĐ) to all configured sibling stores in this warehouse
      const clusterLkFieldsToSync: any = {};
      if (summaryVal) {
        clusterLkFieldsToSync.lk_bi_tong_quan = summaryVal;
      } else if (fieldName === 'LUỸ KẾ DT') {
        clusterLkFieldsToSync.lk_bi_tong_quan = '';
      }

      if (categoryVal) {
        clusterLkFieldsToSync.lk_nh_sieu_thi = categoryVal;
      } else if (fieldName === 'LUỸ KẾ TĐ') {
        clusterLkFieldsToSync.lk_nh_sieu_thi = '';
      }

      if (Object.keys(clusterLkFieldsToSync).length > 0 && availableStores && availableStores.length > 1) {
        const siblingStores = availableStores.filter(
          s => s.name && s.name !== 'ALL' && s.name.trim() !== cleanStore.trim() && isValidStoreName(s.name)
        );
        if (siblingStores.length > 0) {
          const siblingPayloads = siblingStores.map(s => ({
            id: normalizeStoreId(s.name),
            warehouse_code: shortMaKho,
            ten_sieu_thi: s.name,
            updated_at: new Date().toISOString(),
            ...clusterLkFieldsToSync
          }));
          try {
            await supabase.from('store').upsert(siblingPayloads, { onConflict: 'id' });
            console.log(`[LuykeData] ✓ Đồng bộ LUỸ KẾ DT / LUỸ KẾ TĐ cho ${siblingPayloads.length} siêu thị khác`);
          } catch (syncErr) {
            console.warn('[LuykeData] Error syncing LK cluster fields to sibling stores:', syncErr);
          }
        }
      }

      isDirtyRef.current = false;
      dbStoreSnapshotsRef.current[storeKey] = currentSnapshotKey;

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

        // Ensure all configured availableStores are in cache with cluster fields
        (availableStores || []).forEach(s => {
          if (s.name && s.name !== 'ALL' && isValidStoreName(s.name)) {
            newCache[s.name] = {
              ...(newCache[s.name] || {}),
              clusterSummaryInput: clusterSummaryInputRef.current || '',
              clusterCategoryInput: clusterCategoryInputRef.current || '',
            };
          }
        });
        
        // Ensure the active store exists and has its specific fields updated
        newCache[cleanStore] = {
          ...(newCache[cleanStore] || {}),
          clusterSummaryInput: clusterSummaryInputRef.current || '',
          clusterCategoryInput: clusterCategoryInputRef.current || '',
          staffInput: staffInputRef.current || '',
          staffCategoryInput: staffCategoryInputRef.current || '',
          banKemNv: banKemNvRef.current || prev[cleanStore]?.banKemNv || '',
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

      if (!isSilent) {
        const msg = fieldName ? `Lưu dữ liệu ${fieldName} thành công!` : 'Lưu dữ liệu Luỹ kế thành công!';
        showNotification(msg, 'success');
      }
    } catch (error: any) {
      console.error('Lỗi lưu dữ liệu Luỹ kế:', error);
      let message = fieldName ? `Lỗi lưu dữ liệu ${fieldName}: ${error.message}` : `Lỗi lưu dữ liệu Luỹ kế: ${error.message}`;
      if (error.message?.includes('violates row-level security policy')) {
        message = 'Lỗi bảo mật (RLS): Bạn không có quyền lưu dữ liệu cho siêu thị này hoặc cấu hình Supabase chưa cho phép ghi dữ liệu.';
      }
      if (error.message?.includes('Failed to fetch')) {
        message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại cấu hình Supabase trong Secrets.';
      }
      if (error.message?.includes('exceeds the maximum allowed size') || error.message?.includes('1,048,576 bytes')) {
        console.warn(`[LuykeData] File ${fieldName || 'Luỹ kế'} lớn vượt giới hạn 1MB Firestore. Dữ liệu đã được lưu và hoạt động bình thường trong bộ nhớ.`);
        return;
      }
      if (!isSilent) showNotification(message, 'error');
    } finally {
      setIsSavingStaff(false);
      setIsSavingTargets(false);
      setIsProcessingSave(false);
      globalPendingSaves.delete(cleanStore);
    }
  }, [rawMaKho, shortMaKho, warehouseCodes, activeStore, showNotification]);

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
      
      // Parse category data from both inputs in LUYKE mode.
      // We pass the full list of effective markets in the cluster, but with activeStore prioritized at index 0
      // to act as the default fallback for parseCategoryData when no header matches. This allows the parser
      // to correctly detect headers for and group categories by their respective cluster stores, rather than
      // forcing everything into a single active store.
      const marketsForParsing = [...effectiveMarkets];
      if (activeStore && activeStore !== 'ALL') {
        const activeIdx = marketsForParsing.findIndex(m => normalize(m.name) === normalize(activeStore));
        if (activeIdx !== -1) {
          const [activeMarket] = marketsForParsing.splice(activeIdx, 1);
          marketsForParsing.unshift(activeMarket);
        } else {
          marketsForParsing.unshift({
            name: activeStore,
            targetST: 0,
            actualReal: 0,
            actualVirtual: 0,
            dtHomQua: 0,
            percentHT: 0,
            isExplicitTarget: false
          } as MarketInfo);
        }
      }
        
      const categoriesRev = parseCategoryData(summaryToUse, 0, 30, marketsForParsing, 'LUYKE');
      const categoriesTarget = parseCategoryData(categoryToUse, 0, 30, marketsForParsing, 'LUYKE');
      
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

      const filteredMarkets = markets.filter(m => !isKhoLuuDong(m.name));
      const filteredCategories = categories.filter(c => !c.marketName || !isKhoLuuDong(c.marketName));

      setProcessedData({
        markets: filteredMarkets,
        categories: filteredCategories,
        staff
      });

      // Cập nhật activeStore nếu tìm thấy tên siêu thị hợp lệ trong dữ liệu mới và activeStore hiện tại chưa hợp lệ
      if (markets.length > 0 && markets[0].name) {
        const detectedStore = markets[0].name.trim();
        const currentIsFullStore = isValidStoreName(activeStore);
        
        // STRICT GUARD: ONLY switch if detectedStore matches one of the user's declared availableStores in their warehouse!
        const availableNames = (availableStores || []).map((s: any) => s.name);
        const isStoreInWarehouse = availableNames.includes(detectedStore);

        if (isValidStoreName(detectedStore) && isStoreInWarehouse) {
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
          const processedNames = new Set<string>();

          // 1. First add items from currentTargets that are still present in uniqueParsed, in their existing order
          currentTargets.forEach((item: any) => {
            const cleanItemName = cleanCategoryName(item.name);
            let matchedKey: string | null = null;
            let matchedData: any = null;
            
            uniqueParsed.forEach((data, key) => {
              if (matchedKey) return;
              if (cleanCategoryName(key) === cleanItemName) {
                matchedKey = key;
                matchedData = data;
              }
            });

            if (matchedKey && matchedData) {
              const cachedPercent = percentCacheRef.current.get(cleanCategoryName(matchedKey));
              const percent = item.percent !== undefined ? item.percent : (cachedPercent !== undefined ? cachedPercent : defaultPercent);
              
              newTargets.push({
                name: matchedKey, // Use the parsed name to keep it in sync
                target: matchedData.target,
                adjustedTarget: matchedData.target * (percent / 100),
                percent,
                type: matchedData.type
              });
              processedNames.add(matchedKey);
            }
          });

          // 2. Then append any remaining items from uniqueParsed that were not in currentTargets
          uniqueParsed.forEach((data, name) => {
            if (!processedNames.has(name)) {
              const existingPercent = percentMap.get(name);
              const cachedPercent = percentCacheRef.current.get(cleanCategoryName(name));
              const percent = existingPercent !== undefined ? existingPercent : (cachedPercent !== undefined ? cachedPercent : defaultPercent);
              
              newTargets.push({
                name,
                target: data.target,
                adjustedTarget: data.target * (percent / 100),
                percent,
                type: data.type
              });
            }
          });

          // Structural equality check to avoid reference changes when values are identical
          const isSame = prev && prev.length === newTargets.length && newTargets.every((nt, idx) => {
            const pt = prev[idx];
            return pt && 
                   pt.name === nt.name && 
                   pt.target === nt.target && 
                   pt.adjustedTarget === nt.adjustedTarget && 
                   pt.percent === nt.percent && 
                   pt.type === nt.type;
          });
          if (isSame) {
            return prev;
          }

          // Mark that targets were freshly processed from cluster data
          // → the dedicated effect below will auto-save them for the active store
          if (newTargets.length > 0) {
            targetsJustProcessedRef.current = true;
          }

          return newTargets;
        });
      } else {
        setCategoryTargets(prev => prev.length === 0 ? prev : []);
      }

      // Auto-sync tragopMatran if empty
      if (!tragopMatranRef.current && (clusterCategoryInput || clusterSummaryInput) && activeStore && activeStore !== 'ALL') {
        const inputToParse = clusterCategoryInput || clusterSummaryInput;
        const lines = inputToParse.split('\n');
        const matchedLines: string[] = [];
        let headerLine = "";
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
          const lowerLine = lines[i].toLowerCase();
          if (lowerLine.includes('ngành hàng') || lowerLine.includes('tên siêu thị') || lowerLine.includes('target') || lowerLine.includes('luỹ kế')) {
            headerLine = lines[i].trim();
            break;
          }
        }
        const normActiveStore = normalize(activeStore);
        const marketNames = markets.map(m => m.name);
        if (!marketNames.includes(activeStore)) {
          marketNames.push(activeStore);
        }
        const sortedMarketNames = [...marketNames].sort((a, b) => b.length - a.length);
        const sortedNormalized = sortedMarketNames.map(name => {
          const norm = normalize(name);
          const nameWithoutPrefix = normalize(name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
          const codeMatch = name.match(/^([^-]+)/);
          const code = codeMatch ? codeMatch[1].trim() : "";
          return { name, norm, nameWithoutPrefix, code };
        });

        let currentMarketName = "";
        let isTargetStore = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const normLine = normalize(line);
          const matchedMarket = sortedNormalized.find(m => {
            return normLine.includes(m.norm) || 
                   (m.nameWithoutPrefix.length > 3 && normLine.includes(m.nameWithoutPrefix)) ||
                   (m.code.length >= 3 && normLine.includes(m.code)) ||
                   (normLine.length >= 5 && m.norm.includes(normLine));
          });
          if (matchedMarket) {
            currentMarketName = matchedMarket.name;
            const isMatch = normalize(currentMarketName) === normActiveStore || 
                            normalize(currentMarketName).includes(normActiveStore) || 
                            normActiveStore.includes(normalize(currentMarketName));
            isTargetStore = isMatch;
            if (isTargetStore) {
              matchedLines.push(lines[i]);
            }
            continue;
          }
          if (isTargetStore) {
            const isHeaderLine = normLine.includes('target') || normLine.includes('tháng') || normLine.includes('đự kiến') || normLine.includes('rank') || normLine.includes('tiến độ');
            if (isHeaderLine) continue;
            if (normLine.includes('ho tro bi') || normLine.includes('copyright') || normLine.includes('tên miền')) {
              continue;
            }
            matchedLines.push(lines[i]);
          }
        }

        if (matchedLines.length > 0) {
          let finalResult = "";
          if (headerLine && !normalize(matchedLines[0]).includes('target') && !normalize(matchedLines[0]).includes('luỹ kế')) {
            finalResult = [headerLine, ...matchedLines].join('\n');
          } else {
            finalResult = matchedLines.join('\n');
          }
          setTragopMatran(finalResult);
        } else {
          const filteredLines = lines.filter(line => {
            const norm = normalize(line);
            return !norm.includes('ho tro bi') && !norm.includes('copyright') && !norm.includes('tên miền');
          });
          if (filteredLines.length > 0) {
            setTragopMatran(filteredLines.join('\n'));
          }
        }
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

  // localStorage sync removed — Firebase is the single source of truth

  // Auto-save debounce — skip when store is switching
  // MULTI-STORE GUARD: Block auto-save when isStoreReady=false to prevent cross-store contamination
  const prevActiveStoreRef = useRef(activeStore);
  useEffect(() => {
    if (!rawMaKho || !activeStore || !hasLoadedFromDB) return;
    if (isLoading) return;
    if (!isStoreReady) return; // ← GUARD: Don't save during store switch
    if (!isDirtyRef.current) return; // ← GUARD: Don't save if nothing was edited
    
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
    }, 800); // 800ms debounce — fast save

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput, staffListInput, dataPhanCa, dtGioCong, tragopMatran, tragopNv, categoryTargets, rawMaKho, activeStore, hasLoadedFromDB, isLoading, saveLuykeData]);

  // Force-save listener: flush pending data before version-update reload
  useEffect(() => {
    const handleForceSave = () => {
      // CRITICAL GUARD: Only flush if user actually has pending un-saved edits AND data has finished loading!
      if (!isDirtyRef.current || !hasLoadedFromDB || isLoading) {
        console.log('[LuykeData] Skip force-save before reload — no dirty edits or still loading');
        return;
      }
      console.log('[LuykeData] Force-save triggered before reload — flushing pending data to Firestore');
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      // Save immediately without debounce
      saveLuykeData(true, 'force-before-reload');
    };
    window.addEventListener('force-save-before-reload', handleForceSave);
    return () => window.removeEventListener('force-save-before-reload', handleForceSave);
  }, [saveLuykeData, hasLoadedFromDB, isLoading]);

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
        existing.banKemNv === banKemNv &&
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
          banKemNv,
          tragopMatran,
          tragopNv,
          categoryTargets
        }
      };
    });
  }, [
    activeStore, clusterSummaryInput, clusterCategoryInput, staffInput, 
    staffCategoryInput, banKemNv, tragopMatran, tragopNv, categoryTargets, 
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
      setStaffListInput(''); // Note: staff list isn't cached
      setDtGioCong(''); 
      setDataPhanCa(null);
      setTragopMatran(cachedData.tragopMatran || '');
      setTragopNv(cachedData.tragopNv || '');
      setBanKemNvState(cachedData.banKemNv || '');
      setCategoryTargets(cachedData.categoryTargets || []);
      
      // Process synchronously to instantly display cached data without 300ms wait
      handleProcess(
        cachedData.categoryTargets || [],
        cachedData.clusterSummaryInput || '',
        cachedData.clusterCategoryInput || '',
        cachedData.staffInput || ''
      );
    }
    
    // Block auto-save + cancel pending
    setIsLoading(true);
    setHasLoadedFromDB(false);
    isDirtyRef.current = false;
    if (autoSaveTimeoutRef.current) { clearTimeout(autoSaveTimeoutRef.current); autoSaveTimeoutRef.current = null; }
    skipAutoSaveRef.current = true;
    skipSubscriptionRef.current = Date.now() + 2000;
    
    const fallbackTimeout = setTimeout(() => { setIsLoading(false); setStoreReady(true); }, 3000);
    console.log(`[LuykeData] loadData → store: "${targetStore}", maKho: ${shortMaKho}`);
    
    try {
      const sanitizeField = async (val: any) => {
        if (!val) return '';
        let str = String(val).trim();
        if (str.startsWith('GZ:')) {
          try {
            str = await decompressString(str);
            if (str.startsWith('GZ:')) return '';
          } catch (e) {
            return '';
          }
        }
        return str;
      };

      // 1. Fetch all store records for this warehouse up front
      // This populates all cards in "CẤU HÌNH SIÊU THỊ & NHÂN VIÊN" with their own independent data!
      const maKhoNum = parseInt(rawMaKho, 10);
      const { data: allStoreData, error: queryErr } = await supabase
        .from('store')
        .select('id, lk_bi_tong_quan, lk_nh_sieu_thi, lk_dt_nv, lk_td_nv, ds_nhan_vien, dt_gio_cong, data_phan_ca, tragop_matran, tragop_nv, category_targets, ten_sieu_thi, updated_at, taget_doanh_thu, ban_kem_nv, phuc_vu')
        .or(!isNaN(maKhoNum) 
          ? `warehouse_code.eq.${rawMaKho},warehouse_code.eq.${maKhoNum}`
          : `warehouse_code.eq.${rawMaKho}`);

      if (queryErr) console.error('[LuykeData] Query error:', queryErr);

      const storeRows: any[] = Array.isArray(allStoreData) ? allStoreData : (allStoreData ? [allStoreData] : []);

      // Find fallback cluster data from any row in this warehouse that has it
      const rowWithCluster = storeRows.find(r => r.lk_bi_tong_quan || r.lk_nh_sieu_thi);
      const warehouseFallbackSummary = rowWithCluster ? await sanitizeField(rowWithCluster.lk_bi_tong_quan) : '';
      const warehouseFallbackCategory = rowWithCluster ? await sanitizeField(rowWithCluster.lk_nh_sieu_thi) : '';

      // Populate global cache and DB snapshots for all found store rows in this warehouse
      for (const row of storeRows) {
        const rowStoreName = row.ten_sieu_thi || row.id || '';
        if (!rowStoreName) continue;
        const rawRowSummary = await sanitizeField(row.lk_bi_tong_quan);
        const rawRowCategory = await sanitizeField(row.lk_nh_sieu_thi);
        const rowSummary = rawRowSummary || warehouseFallbackSummary;
        const rowCategory = rawRowCategory || warehouseFallbackCategory;
        const rowTargets = Array.isArray(row.category_targets) ? row.category_targets : [];

        // Save DB snapshot for this store to prevent redundant saves
        const rowSnapshot = computeStoreSnapshotKey(
          rowStoreName,
          rowSummary,
          rowCategory,
          rowTargets,
          cleanBiReportText(row.lk_dt_nv || ''),
          cleanBiReportText(row.lk_td_nv || ''),
          cleanBiReportText(row.ds_nhan_vien || ''),
          cleanBiReportText(row.dt_gio_cong || ''),
          row.data_phan_ca || null,
          cleanBiReportText(row.tragop_matran || ''),
          cleanBiReportText(row.tragop_nv || ''),
          cleanBiReportText(row.ban_kem_nv || '')
        );
        dbStoreSnapshotsRef.current[normalizeStoreId(rowStoreName)] = rowSnapshot;
        if (row.id) {
          dbStoreSnapshotsRef.current[normalizeStoreId(row.id)] = rowSnapshot;
        }

        // Cache for allStoresCache
        globalAllStoresCache[rowStoreName] = {
          clusterSummaryInput: rowSummary,
          clusterCategoryInput: rowCategory,
          staffInput: row.lk_dt_nv || '',
          staffCategoryInput: row.lk_td_nv || '',
          banKemNv: row.ban_kem_nv || '',
          phucVu: row.phuc_vu ? 'has_data' : '',
          tragopMatran: row.tragop_matran || '',
          tragopNv: row.tragop_nv || '',
          stPercentTarget: row.taget_doanh_thu?.stPercentTarget ?? 100,
          categoryTargets: rowTargets,
        };
      }

      // Ensure all declared availableStores are populated in globalAllStoresCache
      (availableStores || []).forEach(s => {
        if (s.name && s.name !== 'ALL' && isValidStoreName(s.name) && !globalAllStoresCache[s.name]) {
          globalAllStoresCache[s.name] = {
            clusterSummaryInput: warehouseFallbackSummary,
            clusterCategoryInput: warehouseFallbackCategory,
            staffInput: '',
            staffCategoryInput: '',
            banKemNv: '',
            phucVu: '',
            tragopMatran: '',
            tragopNv: '',
            stPercentTarget: 100,
            categoryTargets: [],
          };
        }
      });
      setAllStoresCache({ ...globalAllStoresCache });

      // Find the specific record for targetStore
      let data: any = null;
      if (targetStore) {
        const cleanTarget = targetStore.trim().toUpperCase();
        data = storeRows.find(d => 
          (d.id || '').trim().toUpperCase() === normalizeStoreId(cleanTarget) ||
          (d.ten_sieu_thi || '').trim().toUpperCase() === cleanTarget
        );
        if (!data) {
          data = storeRows.find(d =>
            cleanTarget.includes((d.ten_sieu_thi || d.id || '').trim().toUpperCase().split(' - ')[0]) ||
            (d.ten_sieu_thi || d.id || '').trim().toUpperCase().includes(cleanTarget.split(' - ')[0])
          );
        }
      }

      // If not found in warehouse results, try single direct query by normalized ID
      if (!data && targetStore) {
        const { data: singleData } = await supabase
          .from('store')
          .select('id, lk_bi_tong_quan, lk_nh_sieu_thi, lk_dt_nv, lk_td_nv, ds_nhan_vien, dt_gio_cong, data_phan_ca, tragop_matran, tragop_nv, category_targets, ten_sieu_thi, updated_at, taget_doanh_thu, ban_kem_nv, phuc_vu')
          .eq('id', normalizeStoreId(targetStore.trim()))
          .maybeSingle();
        if (singleData) data = singleData;
      }

      let clusterSummary = '';
      let clusterCategory = '';
      let loadedTargets: any[] = [];

      if (data) {
        const rawSummary = await sanitizeField(data.lk_bi_tong_quan);
        const rawCategory = await sanitizeField(data.lk_nh_sieu_thi);
        clusterSummary = rawSummary || warehouseFallbackSummary;
        clusterCategory = rawCategory || warehouseFallbackCategory;
        const activeName = data.ten_sieu_thi || targetStore || '';
        console.log(`[LuykeData] ✓ Data loaded for: "${activeName}"`);

        if (globalPendingSaves.has(targetStore)) {
          console.log(`[LuykeData] Save in progress for "${targetStore}", skipping DB overwrite for input fields`);
        } else {
          if (clusterSummary) setClusterSummaryInput(clusterSummary);
          if (clusterCategory) setClusterCategoryInput(clusterCategory);
          
          handleProcess(loadedTargets, clusterSummary || clusterSummaryInputRef.current, clusterCategory || clusterCategoryInputRef.current, data.lk_dt_nv || staffInputRef.current || '');
        }

        // PER-STORE DATA: ALWAYS set all per-store fields (clean string if missing in DB to avoid bleed)
        setStaffInput(data.lk_dt_nv || '');
        setStaffCategoryInput(data.lk_td_nv || '');
        setStaffListInput(data.ds_nhan_vien || '');
        setDtGioCong(data.dt_gio_cong || '');
        setDataPhanCa(data.data_phan_ca || null);
        setTragopMatran(data.tragop_matran || '');
        setTragopNv(data.tragop_nv || '');
        setBanKemNvState(data.ban_kem_nv || '');
        if (Array.isArray(data.category_targets)) {
          setCategoryTargets(data.category_targets);
          loadedTargets = data.category_targets;
        } else {
          setCategoryTargets([]);
        }
        if (data.ten_sieu_thi) setActiveStore(data.ten_sieu_thi);

        // Store snapshot for targetStore
        const targetSnapshot = computeStoreSnapshotKey(
          activeName,
          clusterSummary,
          clusterCategory,
          loadedTargets,
          cleanBiReportText(data.lk_dt_nv || ''),
          cleanBiReportText(data.lk_td_nv || ''),
          cleanBiReportText(data.ds_nhan_vien || ''),
          cleanBiReportText(data.dt_gio_cong || ''),
          data.data_phan_ca || null,
          cleanBiReportText(data.tragop_matran || ''),
          cleanBiReportText(data.tragop_nv || ''),
          cleanBiReportText(data.ban_kem_nv || '')
        );
        dbStoreSnapshotsRef.current[normalizeStoreId(activeName)] = targetSnapshot;
        if (data.id) {
          dbStoreSnapshotsRef.current[normalizeStoreId(data.id)] = targetSnapshot;
        }
      } else {
        console.log(`[LuykeData] ✗ No data found in DB for: "${targetStore}" → cleanly initialize empty per-store state`);
        clusterSummary = warehouseFallbackSummary;
        clusterCategory = warehouseFallbackCategory;
        if (clusterSummary) setClusterSummaryInput(clusterSummary);
        if (clusterCategory) setClusterCategoryInput(clusterCategory);
        handleProcess([], clusterSummary || clusterSummaryInputRef.current, clusterCategory || clusterCategoryInputRef.current, '');

        // CLEAR all per-store fields so NOTHING from previous store bleeds through!
        setStaffInput('');
        setStaffCategoryInput('');
        setStaffListInput('');
        setDtGioCong('');
        setDataPhanCa(null);
        setTragopMatran('');
        setTragopNv('');
        setBanKemNvState('');
        setCategoryTargets([]);
        if (targetStore) setActiveStore(targetStore);

        // Record baseline snapshot so blurring or store switching does NOT perform an unnecessary save
        const emptySnapshot = computeStoreSnapshotKey(
          targetStore,
          cleanBiReportText(clusterSummary || clusterSummaryInputRef.current || ''),
          cleanBiReportText(clusterCategory || clusterCategoryInputRef.current || ''),
          [],
          '', '', '', '', null, '', '', ''
        );
        dbStoreSnapshotsRef.current[normalizeStoreId(targetStore)] = emptySnapshot;
      }

      skipAutoSaveRef.current = true;
      setHasLoadedFromDB(true);
      dbLoadedTargetsRef.current = loadedTargets;
    } catch (err) {
      console.error('[LuykeData] loadData error:', err);
    } finally {
      clearTimeout(fallbackTimeout);
      setIsLoading(false);
      setHasLoadedFromDB(true);
      isDirtyRef.current = false;
      setStoreReady(true);
    }
  }, [rawMaKho, warehouseCodes, activeStore, handleProcess, setStoreReady, computeStoreSnapshotKey]);

  // AUTO-REACT: When global currentStoreId changes, auto-load data for new store
  // Placed AFTER loadData and saveLuykeData to prevent Temporal Dead Zone (TDZ) initialization errors
  const prevStoreIdRef = useRef(currentStoreId);
  useEffect(() => {
    if (!currentStoreId || currentStoreId === 'ALL') return;
    if (!rawMaKho) return;
    // Skip if store hasn't actually changed (initial mount or same store)
    if (prevStoreIdRef.current === currentStoreId && activeStore === currentStoreId) return;
    
    // SAVE OLD STORE ONLY IF DATA WAS ACTUALLY EDITED (isDirtyRef is true and differs from DB)
    const isSameWarehouse = prevWarehouseCodeRef.current === rawMaKho;
    if (prevStoreIdRef.current && prevStoreIdRef.current !== 'ALL' && hasLoadedFromDB && isSameWarehouse && isDirtyRef.current) {
      const oldStoreKey = normalizeStoreId(prevStoreIdRef.current);
      const oldSnapshot = computeStoreSnapshotKey(
        prevStoreIdRef.current,
        cleanBiReportText(clusterSummaryInputRef.current || ''),
        cleanBiReportText(clusterCategoryInputRef.current || ''),
        categoryTargetsRef.current || [],
        cleanBiReportText(staffInputRef.current || ''),
        cleanBiReportText(staffCategoryInputRef.current || ''),
        cleanBiReportText(staffListInputRef.current || '') || '',
        cleanBiReportText(dtGioCongRef.current || '') || '',
        dataPhanCaRef.current,
        cleanBiReportText(tragopMatranRef.current || '') || '',
        cleanBiReportText(tragopNvRef.current || '') || '',
        cleanBiReportText(banKemNvRef.current || '') || ''
      );
      if (dbStoreSnapshotsRef.current[oldStoreKey] !== oldSnapshot) {
        if (saveLuykeDataRef.current) {
          console.log(`[LuykeData] AUTO-REACT: Force saving modified OLD store before switch → "${prevStoreIdRef.current}"`);
          saveLuykeDataRef.current(true, 'auto', prevStoreIdRef.current);
        }
      }
    }
    
    prevStoreIdRef.current = currentStoreId;
    
    console.log(`[LuykeData] AUTO-REACT: currentStoreId changed → "${currentStoreId}"`);
    setActiveStore(currentStoreId);
    loadData(currentStoreId);
  }, [currentStoreId, rawMaKho, hasLoadedFromDB, computeStoreSnapshotKey, loadData]);


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
                setCategoryTargets((prev) => {
                  if (JSON.stringify(prev) !== JSON.stringify(record.category_targets)) {
                    return record.category_targets;
                  }
                  return prev;
                });
              } else if (record.category_targets === null) {
                setCategoryTargets((prev) => prev.length === 0 ? prev : []);
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
      id: normalizeStoreId(activeStore.trim()), // Normalized UPPERCASE ID to prevent duplicates
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

  const syncTragopMatran = useCallback(() => {
    const targetStore = activeStore;
    if (!targetStore || targetStore === 'ALL') {
      showNotification('Vui lòng chọn siêu thị cụ thể trước khi đồng bộ ma trận!', 'error');
      return;
    }

    const inputToParse = clusterCategoryInput || clusterSummaryInput;
    if (!inputToParse) {
      showNotification('Không tìm thấy dữ liệu khai báo để đồng bộ.', 'error');
      return;
    }

    const lines = inputToParse.split('\n');
    const matchedLines: string[] = [];
    
    // Find header lines in the document
    let headerLine = "";
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const lowerLine = lines[i].toLowerCase();
      if (lowerLine.includes('ngành hàng') || lowerLine.includes('tên siêu thị') || lowerLine.includes('target') || lowerLine.includes('luỹ kế')) {
        headerLine = lines[i].trim();
        break;
      }
    }

    const normActiveStore = normalize(targetStore);
    
    const marketNames = (processedData?.markets || []).map(m => m.name);
    if (!marketNames.includes(targetStore)) {
      marketNames.push(targetStore);
    }
    
    const sortedMarketNames = [...marketNames].sort((a, b) => b.length - a.length);
    const sortedNormalized = sortedMarketNames.map(name => {
      const norm = normalize(name);
      const nameWithoutPrefix = normalize(name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
      const codeMatch = name.match(/^([^-]+)/);
      const code = codeMatch ? codeMatch[1].trim() : "";
      return { name, norm, nameWithoutPrefix, code };
    });

    let currentMarketName = "";
    let isTargetStore = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const normLine = normalize(line);
      
      const matchedMarket = sortedNormalized.find(m => {
        return normLine.includes(m.norm) || 
               (m.nameWithoutPrefix.length > 3 && normLine.includes(m.nameWithoutPrefix)) ||
               (m.code.length >= 3 && normLine.includes(m.code)) ||
               (normLine.length >= 5 && m.norm.includes(normLine));
      });

      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
        const isMatch = normalize(currentMarketName) === normActiveStore || 
                        normalize(currentMarketName).includes(normActiveStore) || 
                        normActiveStore.includes(normalize(currentMarketName));
        isTargetStore = isMatch;
        if (isTargetStore) {
          matchedLines.push(lines[i]);
        }
        continue;
      }

      if (isTargetStore) {
        const isHeaderLine = normLine.includes('target') || normLine.includes('tháng') || normLine.includes('đự kiến') || normLine.includes('rank') || normLine.includes('tiến độ');
        if (isHeaderLine) continue;

        if (normLine.includes('ho tro bi') || normLine.includes('copyright') || normLine.includes('tên miền')) {
          continue;
        }

        matchedLines.push(lines[i]);
      }
    }

    if (matchedLines.length > 0) {
      let finalResult = "";
      if (headerLine && !normalize(matchedLines[0]).includes('target') && !normalize(matchedLines[0]).includes('luỹ kế')) {
        finalResult = [headerLine, ...matchedLines].join('\n');
      } else {
        finalResult = matchedLines.join('\n');
      }

      setTragopMatran(finalResult);
      showNotification('Đồng bộ ma trận ngành hàng thành công!', 'success');
      
      // Save immediately to DB
      setTimeout(() => {
        if (saveLuykeDataRef.current) {
          saveLuykeDataRef.current(true, 'auto', targetStore, undefined, 'CHI TIẾT DTNV');
        }
      }, 200);
    } else {
      console.warn('[LuykeData] No store-specific lines matched, using fallback extraction');
      const filteredLines = lines.filter(line => {
        const norm = normalize(line);
        return !norm.includes('ho tro bi') && !norm.includes('copyright') && !norm.includes('tên miền');
      });
      
      if (filteredLines.length > 0) {
        const finalResult = filteredLines.join('\n');
        setTragopMatran(finalResult);
        showNotification('Đồng bộ ma trận ngành hàng thành công (toàn bộ dữ liệu)!', 'success');
        
        setTimeout(() => {
          if (saveLuykeDataRef.current) {
            saveLuykeDataRef.current(true, 'auto', targetStore, undefined, 'CHI TIẾT DTNV');
          }
        }, 200);
      } else {
        showNotification('Không trích xuất được dữ liệu cho siêu thị ' + targetStore, 'error');
      }
    }
  }, [activeStore, clusterCategoryInput, clusterSummaryInput, processedData.markets, showNotification]);

  // Stable setActiveStore callback (prevents KhaiBao effect from re-running every render)
  const handleSetActiveStore = useCallback((store: string) => {
    setActiveStore(store);
  }, []);

  // Synchronous setters to prevent stale closures during rapid paste/blur events
  const setClusterSummaryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(clusterSummaryInputRef.current) : val;
    if (newVal === clusterSummaryInputRef.current) return;
    clusterSummaryInputRef.current = newVal; 
    isDirtyRef.current = true;
    setClusterSummaryInput(newVal);
    try {
      if (newVal) {
        localStorage.setItem('rt_catrev', newVal);
        localStorage.setItem('rtst_cluster_summary', newVal);
        localStorage.setItem('rtst_catrev', newVal);
      }
    } catch {}
  }, []);
  const setClusterCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(clusterCategoryInputRef.current) : val;
    if (newVal === clusterCategoryInputRef.current) return;
    clusterCategoryInputRef.current = newVal;
    isDirtyRef.current = true;
    setClusterCategoryInput(newVal);
  }, []);
  const setStaffInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(staffInputRef.current) : val;
    if (newVal === staffInputRef.current) return;
    staffInputRef.current = newVal;
    isDirtyRef.current = true;
    setStaffInput(newVal);
  }, []);
  const setStaffCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(staffCategoryInputRef.current) : val;
    if (newVal === staffCategoryInputRef.current) return;
    staffCategoryInputRef.current = newVal;
    isDirtyRef.current = true;
    setStaffCategoryInput(newVal);
  }, []);
  const setStaffListInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(staffListInputRef.current) : val;
    if (newVal === staffListInputRef.current) return;
    staffListInputRef.current = newVal;
    isDirtyRef.current = true;
    setStaffListInput(newVal);
  }, []);
  const setDtGioCongSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(dtGioCongRef.current) : val;
    if (newVal === dtGioCongRef.current) return;
    dtGioCongRef.current = newVal;
    isDirtyRef.current = true;
    setDtGioCong(newVal);
  }, []);
  const setTragopMatranSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(tragopMatranRef.current) : val;
    if (newVal === tragopMatranRef.current) return;
    tragopMatranRef.current = newVal;
    isDirtyRef.current = true;
    setTragopMatran(newVal);
  }, []);
  const setTragopNvSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(tragopNvRef.current) : val;
    if (newVal === tragopNvRef.current) return;
    tragopNvRef.current = newVal;
    isDirtyRef.current = true;
    setTragopNv(newVal);
  }, []);

  const value = {
    clusterSummaryInput, setClusterSummaryInput: setClusterSummaryInputSync,
    clusterCategoryInput, setClusterCategoryInput: setClusterCategoryInputSync,
    staffInput, setStaffInput: setStaffInputSync,
    staffCategoryInput, setStaffCategoryInput: setStaffCategoryInputSync,
    staffListInput, setStaffListInput: setStaffListInputSync,
    dataPhanCa, setDataPhanCa,
    activeStore,
    dtGioCong, setDtGioCong: setDtGioCongSync,
    tragopMatran, setTragopMatran: setTragopMatranSync,
    tragopNv, setTragopNv: setTragopNvSync,
    banKemNv, setBanKemNv: setBanKemNvSync,
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
    syncTragopMatran,
    loadData,
    setActiveStore: handleSetActiveStore,
    clearField: (setter: (val: string) => void, fieldName?: string) => {
      skipSubscriptionRef.current = Date.now() + 10000;
      setter('');
      isDirtyRef.current = false;
      let resolvedFieldName = fieldName;
      if (!resolvedFieldName) {
        if (setter === setClusterSummaryInput || setter === setClusterSummaryInputSync) resolvedFieldName = 'LUỸ KẾ DT';
        else if (setter === setClusterCategoryInput || setter === setClusterCategoryInputSync) resolvedFieldName = 'LUỸ KẾ TĐ';
        else if (setter === setStaffInput || setter === setStaffInputSync) resolvedFieldName = 'DOANH THU NV';
        else if (setter === setStaffCategoryInput || setter === setStaffCategoryInputSync) resolvedFieldName = 'THI ĐUA NV';
        else if (setter === setStaffListInput || setter === setStaffListInputSync) resolvedFieldName = 'DS NHÂN VIÊN';
        else if (setter === setTragopMatran || setter === setTragopMatranSync) resolvedFieldName = 'TRẢ GÓP MT';
        else if (setter === setTragopNv || setter === setTragopNvSync) resolvedFieldName = 'TRẢ GÓP NV';
        else if (setter === setBanKemNvState || setter === setBanKemNvSync) resolvedFieldName = 'BÁN KÈM NV';
      }
      // Save immediately — no delay
      if (saveLuykeDataRef.current) {
        saveLuykeDataRef.current(true, 'auto', undefined, undefined, resolvedFieldName);
      }
    }
  };

  return (
    <LuykeDataContext.Provider value={value}>
      {children}
    </LuykeDataContext.Provider>
  );
};
