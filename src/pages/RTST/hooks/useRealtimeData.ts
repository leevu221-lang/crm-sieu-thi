/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { db } from '../../../firebaseConfig';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getCachedDoc } from '../../../services/cachedFirestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useStore, getStoreItem, setStoreItem } from '../../../contexts/StoreContext';
import { 
  MarketInfo, 
  CategoryData, 
  YcxStaffData, 
  YcxRankData,
  STORAGE_KEYS 
} from '../types';
import { 
  parseMarketData, 
  parseCategoryData, 
  parseYcxData,
  parseYcxRankData,
  safeSetItem,
  isValidStoreName,
  minifyYcxData,
  normalizeStoreId,
  normalize,
  localYcxDb
} from '../utils';

// Compress string to base64 using native browser GZIP CompressionStream (99% size reduction for TSV)
export async function compressString(str: string): Promise<string> {
  if (!str) return str;
  if (typeof str === 'string' && str.startsWith('GZ:')) return str; // NEVER re-compress string that is already GZ:
  try {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < bytes.byteLength; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return 'GZ:' + btoa(binary);
  } catch (err) {
    console.error('[Compression] Gzip error:', err);
    return str;
  }
}

// Decompress base64 gzip string back to original string (recursively unwraps all GZ layers)
export async function decompressString(str: string): Promise<string> {
  if (!str || typeof str !== 'string') return str;
  let result = str;
  let iterations = 0;
  while (result && typeof result === 'string' && result.startsWith('GZ:') && iterations < 5) {
    iterations++;
    try {
      const binary = atob(result.slice(3));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const response = new Response(stream);
      result = await response.text();
    } catch (err) {
      console.error('[Decompression] Gzip error:', err);
      break;
    }
  }
  return result;
}

// Persist across F5 by reading from localStorage
let globalLastSaveTimestampMs = parseInt(localStorage.getItem('__rtst_last_save_ts') || '0', 10);

// Helper to update both variable and localStorage
function setGlobalLastSaveTs(ts: number) {
  globalLastSaveTimestampMs = ts;
  try { localStorage.setItem('__rtst_last_save_ts', String(ts)); } catch {}
}

export const useRealtimeData = (maKho: string) => {
  const { showNotification } = useNotification();
  const { isStoreReady, currentStoreId, availableStores } = useStore();
  
  // Normalize maKho: trim and remove leading zeros for consistency
  const normalizedMaKho = maKho ? maKho.trim().replace(/^0+/, '') : '';

  const isDirtyRef = useRef(false);

  const [marketInput, setMarketInput] = useState(() => {
    try {
      return (normalizedMaKho && localStorage.getItem(`rtst_market_input_${normalizedMaKho}`)) || '';
    } catch {
      return '';
    }
  });
  const [categoryInput, setCategoryInput] = useState(() => {
    try {
      return (normalizedMaKho && localStorage.getItem(`rtst_category_input_${normalizedMaKho}`)) || '';
    } catch {
      return '';
    }
  });
  const [realtimeDtThuc, setRealtimeDtThuc] = useState(() => {
    try {
      return (normalizedMaKho && localStorage.getItem(`rtst_realtime_dt_thuc_${normalizedMaKho}`)) || localStorage.getItem('rtst_realtime_dt_thuc') || localStorage.getItem('rt_market_thuc') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const val = e.detail?.value ?? '';
      setRealtimeDtThuc(val);
    };
    window.addEventListener('realtime_dt_thuc_updated', handleUpdate);
    return () => window.removeEventListener('realtime_dt_thuc_updated', handleUpdate);
  }, []);
  const [ycxData, setYcxData] = useState('');
  const [ycxDataMoi, setYcxDataMoi] = useState('');
  const [ycxFileName, setYcxFileNameState] = useState('');
  const [ycxFileNameMoi, setYcxFileNameMoiState] = useState('');
  const [categoryRevenueInput, setCategoryRevenueInput] = useState(() => {
    try {
      return localStorage.getItem('rt_catrev') || localStorage.getItem('rtst_cluster_summary') || localStorage.getItem('rtst_catrev') || '';
    } catch {
      return '';
    }
  });
  const [categoryTargetInput, setCategoryTargetInput] = useState(() => {
    try {
      return (normalizedMaKho && localStorage.getItem(`rtst_cat_target_${normalizedMaKho}`)) || '';
    } catch {
      return '';
    }
  });
  // NOTE: must start empty, NOT maKho — activeStore holds a STORE NAME (matches Firestore doc id
  // via normalizeStoreId), while maKho is the warehouse code. Seeding it with maKho let the
  // mount-time loadData() effect below (line ~578) race against the correct currentStoreId-driven
  // load and, if a legacy doc happened to exist under the warehouse-code id, overwrite freshly
  // loaded/saved data with stale data right after an F5 reload.
  const [activeStore, setActiveStore] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [quyDoiRules, setQuyDoiRules] = useState<any[]>([]);

  // Keep refs of inputs to prevent stale closures during saving
  const marketInputRef = useRef(marketInput);
  const categoryInputRef = useRef(categoryInput);
  const categoryRevenueInputRef = useRef(categoryRevenueInput);
  const categoryTargetInputRef = useRef(categoryTargetInput);
  const ycxDataRef = useRef(ycxData);
  const ycxDataMoiRef = useRef(ycxDataMoi);
  const ycxFileNameRef = useRef(ycxFileName);
  const ycxFileNameMoiRef = useRef(ycxFileNameMoi);
  const activeStoreRef = useRef(activeStore);
  // Snapshot of the last value actually written to (or freshly loaded from) Firestore,
  // used to skip no-op saves — see saveRealtimeData.
  const lastSavedSnapshotRef = useRef<string | null>(null);

  useEffect(() => { marketInputRef.current = marketInput; }, [marketInput]);
  useEffect(() => { categoryInputRef.current = categoryInput; }, [categoryInput]);
  useEffect(() => { categoryRevenueInputRef.current = categoryRevenueInput; }, [categoryRevenueInput]);
  useEffect(() => { categoryTargetInputRef.current = categoryTargetInput; }, [categoryTargetInput]);
  useEffect(() => { ycxDataRef.current = ycxData; }, [ycxData]);
  useEffect(() => { ycxDataMoiRef.current = ycxDataMoi; }, [ycxDataMoi]);
  useEffect(() => { ycxFileNameRef.current = ycxFileName; }, [ycxFileName]);
  useEffect(() => { ycxFileNameMoiRef.current = ycxFileNameMoi; }, [ycxFileNameMoi]);
  useEffect(() => { activeStoreRef.current = activeStore; }, [activeStore]);

  // Sync activeStore and load data when StoreContext's currentStoreId changes
  const prevStoreIdRef = useRef(currentStoreId);
  useEffect(() => {
    if (!normalizedMaKho) return;

    if (currentStoreId === 'ALL') {
      prevStoreIdRef.current = 'ALL';
      setActiveStore('ALL');
      loadData('ALL');
      return;
    }
    
    if (!currentStoreId) return;
    
    // Skip if store hasn't actually changed
    if (prevStoreIdRef.current === currentStoreId && activeStore === currentStoreId) return;

    // FORCE SAVE the old store's data before we switch away from it ONLY if user edited something
    if (prevStoreIdRef.current && prevStoreIdRef.current !== 'ALL' && hasLoadedFromDB && isDirtyRef.current) {
      if (saveRealtimeDataRef.current) {
        console.log(`[RealtimeData] AUTO-REACT: Force saving OLD store before switch → "${prevStoreIdRef.current}"`);
        saveRealtimeDataRef.current(true);
      }
    }

    prevStoreIdRef.current = currentStoreId;
    console.log(`[RealtimeData] AUTO-REACT: currentStoreId changed → "${currentStoreId}"`);
    setActiveStore(currentStoreId);
    loadData(currentStoreId);
  }, [currentStoreId, normalizedMaKho, hasLoadedFromDB]);

  const [excludedYcxStaffNames, setExcludedYcxStaffNames] = useState<string[]>([]);

  const [processedData, setProcessedData] = useState<{
    markets: MarketInfo[];
    luykeMarkets: MarketInfo[];
    categories: CategoryData[];
    staff: YcxStaffData[];
    ycxRankData: YcxRankData[];
  }>({
    markets: [],
    luykeMarkets: [],
    categories: [],
    staff: [],
    ycxRankData: []
  });

  const [isSavingRealtime, setIsSavingRealtime] = useState(false);
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);
  const [isProcessingRealtime, setIsProcessingRealtime] = useState(false);
  const [isYcxDirty, setIsYcxDirty] = useState(false);
  const isYcxDirtyRef = useRef(isYcxDirty);

  // Keep ref in sync with state for use in callbacks without dependency issues
  useEffect(() => {
    isYcxDirtyRef.current = isYcxDirty;
  }, [isYcxDirty]);

  const skipAutoSaveRef = useRef(false);
  const skipSubscriptionRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // PERF: Ref for saveRealtimeData to avoid it as dependency in auto-save effect
  const saveRealtimeDataRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const clearData = useCallback(() => {
    setMarketInput('');
    setCategoryInput('');
    setYcxData('');
    setYcxDataMoi('');
    setIsYcxDirty(false);
    setCategoryRevenueInput('');
    setCategoryTargetInput('');
    setProcessedData({
      markets: [],
      luykeMarkets: [],
      categories: [],
      staff: [],
      ycxRankData: []
    });
    // Also update refs so save uses empty values
    marketInputRef.current = '';
    categoryInputRef.current = '';
    categoryRevenueInputRef.current = '';
    categoryTargetInputRef.current = '';
    ycxDataRef.current = '';
    ycxDataMoiRef.current = '';
  }, []);

  const handleProcess = useCallback(() => {
    try {
      console.log('[RealtimeData] handleProcess triggered:', {
        marketInputLength: marketInput?.length || 0,
        categoryInputLength: categoryInput?.length || 0,
        ycxDataLength: ycxData?.length || 0
      });
      const marketTextToUse = (marketInput && marketInput.trim()) || '';
      const realtimeDtThucText = (realtimeDtThuc && realtimeDtThuc.trim()) || 
        (normalizedMaKho && localStorage.getItem(`rtst_realtime_dt_thuc_${normalizedMaKho}`)) || 
        localStorage.getItem('rtst_realtime_dt_thuc') || 
        localStorage.getItem('rt_market_thuc') || '';
      const luykeMarketTextToUse = (categoryRevenueInput && categoryRevenueInput.trim()) || '';
      const categoryTextToUse = (categoryInput && categoryInput.trim()) || '';

      const markets = marketTextToUse ? parseMarketData(marketTextToUse, 0, 'RTST') : [];
      const thucMarkets = realtimeDtThucText ? parseMarketData(realtimeDtThucText, 0, 'RTST') : [];

      if (thucMarkets.length > 0) {
        markets.forEach(m => {
          const normM = normalize(m.name);
          const targetCode = m.name.replace(/\D/g, '');
          const matchThuc = thucMarkets.find(tm => {
            const normTm = normalize(tm.name);
            if (normTm === normM || normTm.includes(normM) || normM.includes(normTm)) return true;
            if (targetCode && targetCode.length >= 3) {
              const code = tm.name.replace(/\D/g, '');
              if (code && (code === targetCode || code.includes(targetCode) || targetCode.includes(code))) return true;
            }
            return false;
          }) || (markets.length === 1 && thucMarkets.length === 1 ? thucMarkets[0] : undefined)
             || (thucMarkets.find(tm => tm.isSummary || tm.name.toUpperCase().startsWith('TỔNG')));

          if (matchThuc) {
            let realVal = matchThuc.actualReal > 0 ? matchThuc.actualReal : (matchThuc.actualVirtual > 0 ? matchThuc.actualVirtual : 0);

            // If realVal looks like monthly DTLK (> 4x of daily virtual), suppress it
            if (m.actualVirtual > 0 && realVal > m.actualVirtual * 4) {
              realVal = matchThuc.actualVirtual > 0 && matchThuc.actualVirtual < realVal ? matchThuc.actualVirtual : 0;
            }

            if (realVal > 0) {
              m.actualReal = realVal;
              if (m.actualVirtual > 0) {
                // Formula: (Doanh thu quy đổi - Doanh thu thực) / Doanh thu thực * 100
                m.percentQD = ((m.actualVirtual - realVal) / realVal) * 100;
              }
            }
          }
        });
      } else if (realtimeDtThucText) {
        const rawNum = cleanNum(realtimeDtThucText);
        if (rawNum > 0) {
          const realVal = rawNum > 1_000_000 ? Math.round(rawNum / 1_000_000) : rawNum;
          markets.forEach(m => {
            m.actualReal = realVal;
            if (m.actualVirtual > 0) {
              m.percentQD = ((m.actualVirtual - realVal) / realVal) * 100;
            }
          });
        }
      }

      // If percentQD was not computed from thucMarkets, check if marketInput has both actualVirtual and daily actualReal
      markets.forEach(m => {
        if (m.percentQD === undefined || m.percentQD === 0) {
          const dtqd = m.actualVirtual || 0;
          const dtthuc = m.actualReal || 0;
          if (dtqd > 0 && dtthuc > 0 && dtthuc < dtqd * 4 && dtqd < dtthuc * 4) {
            m.percentQD = ((dtqd - dtthuc) / dtthuc) * 100;
          }
        }
      });

      const luykeMarkets = luykeMarketTextToUse ? parseMarketData(luykeMarketTextToUse, 0, 'LUYKE') : [];
      const categories = categoryTextToUse ? parseCategoryData(categoryTextToUse, 0, 30, markets.length > 0 ? markets : luykeMarkets) : [];
      const staff = parseYcxData(ycxData, quyDoiRules);
      const ycxRankData = parseYcxRankData(ycxData, quyDoiRules);

      console.log('[RealtimeData] handleProcess output:', {
        parsedMarketsCount: markets?.length || 0,
        parsedLuykeMarketsCount: luykeMarkets?.length || 0,
        parsedCategoriesCount: categories?.length || 0,
        parsedStaffCount: staff?.length || 0
      });

      setProcessedData({
        markets,
        luykeMarkets,
        categories,
        staff,
        ycxRankData
      });
      setProcessError(null);
    } catch (error: any) {
      console.error('[RealtimeData] handleProcess error:', error);
      setProcessError(error.message || 'Lỗi xử lý dữ liệu');
    }
  }, [marketInput, realtimeDtThuc, categoryInput, categoryRevenueInput, categoryTargetInput, ycxData, quyDoiRules]);

  // One-time cached read (shared cache key with RealtimePage's admin config modal) instead
  // of a permanent onSnapshot — see src/services/cachedFirestore.ts. This is rarely-edited
  // business rule data, not something that needs a live push to every open session.
  useEffect(() => {
    let cancelled = false;
    getCachedDoc<{ rules: any }>('system_configs', 'quy_doi_map').then((data) => {
      if (!cancelled && data?.rules) {
        setQuyDoiRules(data.rules);
        try { localStorage.setItem('crm_quy_doi_rules', JSON.stringify(data.rules)); } catch {}
      }
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    setIsProcessingRealtime(true);
    const tid = setTimeout(() => {
      handleProcess();
      setIsProcessingRealtime(false);
    }, 200);

    return () => clearTimeout(tid);
  }, [marketInput, realtimeDtThuc, categoryInput, categoryRevenueInput, categoryTargetInput, ycxData, ycxDataMoi, handleProcess]);

  const updateYcxData = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxDataRef.current) : val;
    // Minify data before setting to prevent database size limit errors
    const minified = minifyYcxData(newVal);
    ycxDataRef.current = minified;
    isDirtyRef.current = true;
    setYcxData(minified);
    setIsYcxDirty(true);

    const storeKey = normalizeStoreId(activeStoreRef.current || '');
    if (storeKey) {
      localYcxDb.get('ycx_' + storeKey).then(existingStr => {
        let existingObj: any = {};
        try { if (existingStr) existingObj = JSON.parse(existingStr); } catch {}
        existingObj.ycx_data = minified;
        if (ycxFileNameRef.current) existingObj.ycx_file_name = ycxFileNameRef.current;
        existingObj.updated_at = Date.now();
        localYcxDb.set('ycx_' + storeKey, JSON.stringify(existingObj)).catch(console.warn);
      }).catch(console.warn);
    }
  }, []);

  const updateYcxDataMoi = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxDataMoiRef.current) : val;
    // Minify data before setting to prevent database size limit errors
    const minified = minifyYcxData(newVal);
    ycxDataMoiRef.current = minified;
    isDirtyRef.current = true;
    setYcxDataMoi(minified);
    setIsYcxDirty(true);

    const storeKey = normalizeStoreId(activeStoreRef.current || '');
    if (storeKey) {
      localYcxDb.get('ycx_' + storeKey).then(existingStr => {
        let existingObj: any = {};
        try { if (existingStr) existingObj = JSON.parse(existingStr); } catch {}
        existingObj.ycx_data_moi = minified;
        if (ycxFileNameMoiRef.current) existingObj.ycx_file_name_moi = ycxFileNameMoiRef.current;
        existingObj.updated_at = Date.now();
        localYcxDb.set('ycx_' + storeKey, JSON.stringify(existingObj)).catch(console.warn);
      }).catch(console.warn);
    }
  }, []);

  const updateYcxFileName = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxFileNameRef.current) : val;
    ycxFileNameRef.current = newVal;
    setYcxFileNameState(newVal);

    const storeKey = normalizeStoreId(activeStoreRef.current || '');
    if (storeKey) {
      localYcxDb.get('ycx_' + storeKey).then(existingStr => {
        let existingObj: any = {};
        try { if (existingStr) existingObj = JSON.parse(existingStr); } catch {}
        existingObj.ycx_file_name = newVal;
        existingObj.updated_at = Date.now();
        localYcxDb.set('ycx_' + storeKey, JSON.stringify(existingObj)).catch(console.warn);
      }).catch(console.warn);
    }
  }, []);

  const updateYcxFileNameMoi = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxFileNameMoiRef.current) : val;
    ycxFileNameMoiRef.current = newVal;
    setYcxFileNameMoiState(newVal);

    const storeKey = normalizeStoreId(activeStoreRef.current || '');
    if (storeKey) {
      localYcxDb.get('ycx_' + storeKey).then(existingStr => {
        let existingObj: any = {};
        try { if (existingStr) existingObj = JSON.parse(existingStr); } catch {}
        existingObj.ycx_file_name_moi = newVal;
        existingObj.updated_at = Date.now();
        localYcxDb.set('ycx_' + storeKey, JSON.stringify(existingObj)).catch(console.warn);
      }).catch(console.warn);
    }
  }, []);

  const clearField = useCallback((setter: (val: string) => void, fieldName?: string) => {
    // Block ALL restore paths
    setGlobalLastSaveTs(Date.now());
    skipSubscriptionRef.current = true;
    isDirtyRef.current = false;

    // Determine field name if not passed
    let resolvedFieldName = fieldName;
    if (!resolvedFieldName) {
      if (setter === setMarketInput) resolvedFieldName = 'REALTIME DT';
      else if (setter === setCategoryInput) resolvedFieldName = 'REALTIME TĐ';
      else if (setter === setCategoryRevenueInput) resolvedFieldName = 'LUỸ KẾ DT';
      else if (setter === setCategoryTargetInput) resolvedFieldName = 'LUỸ KẾ TĐ';
    }

    if (resolvedFieldName === 'REALTIME DT' || resolvedFieldName === 'rt_market') {
      marketInputRef.current = '';
      setMarketInput('');
      try {
        localStorage.removeItem('rtst_market_input');
        if (normalizedMaKho) localStorage.removeItem(`rtst_market_input_${normalizedMaKho}`);
      } catch {}
    } else if (resolvedFieldName === 'REALTIME TĐ' || resolvedFieldName === 'rt_cat') {
      categoryInputRef.current = '';
      setCategoryInput('');
      try {
        localStorage.removeItem('rtst_category_input');
        if (normalizedMaKho) localStorage.removeItem(`rtst_category_input_${normalizedMaKho}`);
      } catch {}
    } else if (resolvedFieldName === 'LUỸ KẾ DT' || resolvedFieldName === 'rt_catrev') {
      categoryRevenueInputRef.current = '';
      setCategoryRevenueInput('');
      try {
        localStorage.removeItem('rt_catrev');
        localStorage.removeItem('rtst_cluster_summary');
        localStorage.removeItem('rtst_catrev');
        localStorage.removeItem('rtst_doanh_thu_hop_nhat');
        if (normalizedMaKho) {
          localStorage.removeItem(`rt_catrev_${normalizedMaKho}`);
          localStorage.removeItem(`rtst_cluster_summary_${normalizedMaKho}`);
          localStorage.removeItem(`rtst_catrev_${normalizedMaKho}`);
        }
      } catch {}
    } else if (resolvedFieldName === 'LUỸ KẾ TĐ' || resolvedFieldName === 'rt_catlk') {
      categoryTargetInputRef.current = '';
      setCategoryTargetInput('');
      try {
        localStorage.removeItem('rt_catlk');
        localStorage.removeItem('rtst_catlk');
        localStorage.removeItem('rtst_cluster_category');
        if (normalizedMaKho) {
          localStorage.removeItem(`rtst_cat_target_${normalizedMaKho}`);
          localStorage.removeItem(`rtst_catlk_${normalizedMaKho}`);
          localStorage.removeItem(`rtst_cluster_category_${normalizedMaKho}`);
        }
      } catch {}
    } else {
      setter('');
    }

    // Invalidate snapshot so save is NOT skipped
    lastSavedSnapshotRef.current = '';

    // Save immediately — no delay
    if (saveRealtimeDataRef.current) {
      saveRealtimeDataRef.current(true, resolvedFieldName);
    }
    // Release subscription block after 2s
    setTimeout(() => {
      skipSubscriptionRef.current = false;
    }, 2000);
  }, [normalizedMaKho]);

  const saveRealtimeData = useCallback(async (silent = false, fieldName?: string) => {
    setGlobalLastSaveTs(Date.now());
    isDirtyRef.current = false;

    // A save is happening now — cancel any pending debounced auto-save so we don't
    // fire a second, redundant write ~800ms later for the same data (was doubling
    // Firestore write quota usage on every onBlur save).
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    let cleanStore = (activeStoreRef.current || '').trim();

    // If activeStore is 'ALL' or empty, resolve to first available valid store for cluster data
    if ((!cleanStore || cleanStore === 'ALL' || !isValidStoreName(cleanStore)) && availableStores && availableStores.length > 0) {
      const candidate = availableStores.find(s => s.name && s.name !== 'ALL' && isValidStoreName(s.name));
      if (candidate) {
        cleanStore = candidate.name;
        console.log(`[RealtimeData] Resolved target store for cluster data: "${cleanStore}"`);
      }
    }

    // Fallback: check processedData.markets
    if ((!cleanStore || cleanStore === 'ALL' || !isValidStoreName(cleanStore)) && processedData?.markets?.length > 0) {
      const candidate = processedData.markets.find(m => m.name && isValidStoreName(m.name));
      if (candidate) {
        cleanStore = candidate.name;
        console.log(`[RealtimeData] Resolved target store from parsed markets: "${cleanStore}"`);
      }
    }

    if (!normalizedMaKho || !cleanStore || !isValidStoreName(cleanStore)) {
      if (!silent && !cleanStore) {
        showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi lưu!', 'error');
      } else if (cleanStore && !isValidStoreName(cleanStore)) {
        if (!silent) showNotification(`Tên siêu thị "${cleanStore}" không hợp lệ. Vui lòng chọn siêu thị cụ thể từ danh sách trên cùng!`, 'error');
        console.warn(`[RealtimeData] Skip saving to DB: "${cleanStore}" is not a valid declared supermarket name.`);
      }
      return;
    }
    const cleanMaKho = normalizedMaKho;

    const sanitizeField = (val: string) => {
      const s = String(val || '').trim();
      return s.startsWith('GZ:') ? '' : s;
    };

    const marketVal = sanitizeField(marketInputRef.current);
    const categoryVal = sanitizeField(categoryInputRef.current);
    const categoryRevenueVal = sanitizeField(categoryRevenueInputRef.current);
    const categoryTargetVal = sanitizeField(categoryTargetInputRef.current);

    // Read YCX file names from state refs
    const ycxFileNameVal = ycxFileNameRef.current || '';
    const ycxFileNameMoiVal = ycxFileNameMoiRef.current || '';

    // Skip the write entirely if nothing actually differs from the last value we
    // persisted for this store — onBlur fires on every field regardless of whether
    // the user changed anything (e.g. tabbing through without editing, or only one
    // of several fields sharing a blur handler actually changed), and each of those
    // no-op saves was still a full Firestore write + notification. Compare BEFORE
    // compressing YCX data too, so an unchanged value skips that CPU work as well.
    const currentSnapshotKey = JSON.stringify([
      normalizeStoreId(cleanStore), marketVal, categoryVal, categoryRevenueVal,
      categoryTargetVal, ycxDataRef.current, ycxDataMoiRef.current, ycxFileNameVal, ycxFileNameMoiVal
    ]);
    if (lastSavedSnapshotRef.current === currentSnapshotKey && !fieldName) {
      console.log(`[RealtimeData] Skip save — no change detected${fieldName ? ` (${fieldName})` : ''}`);
      return;
    }

    setIsSavingRealtime(true);
    try {
      const minifiedYcx = ycxDataRef.current ? minifyYcxData(ycxDataRef.current) : '';
      const minifiedYcxMoi = ycxDataMoiRef.current ? minifyYcxData(ycxDataMoiRef.current) : '';

      // Compress YCX data to avoid exceeding Firestore 1MB document limit
      const compressedYcx = minifiedYcx ? await compressString(minifiedYcx) : '';
      const compressedYcxMoi = minifiedYcxMoi ? await compressString(minifiedYcxMoi) : '';

      const payload: any = {
        id: normalizeStoreId(cleanStore), // Normalized UPPERCASE ID to prevent duplicates
        warehouse_code: cleanMaKho,
        ten_sieu_thi: cleanStore,
        updated_at: new Date().toISOString()
      };

      // NEVER send empty strings to Firestore unless explicitly triggered by clearField for that specific field
      if (marketVal) {
        payload.rt_bi_tong_quan = marketVal;
      } else if (fieldName === 'REALTIME DT' || fieldName === 'rt_market') {
        payload.rt_bi_tong_quan = '';
      }

      if (categoryVal) {
        payload.rt_nh_cum = categoryVal;
      } else if (fieldName === 'REALTIME TĐ' || fieldName === 'rt_cat') {
        payload.rt_nh_cum = '';
      }

      if (compressedYcx) {
        payload.ycx_data = compressedYcx;
        if (ycxFileNameVal) payload.ycx_file_name = ycxFileNameVal;
      } else if (fieldName === 'YCX') {
        payload.ycx_data = '';
        payload.ycx_file_name = '';
      }

      if (compressedYcxMoi) {
        payload.ycx_data_moi = compressedYcxMoi;
        if (ycxFileNameMoiVal) payload.ycx_file_name_moi = ycxFileNameMoiVal;
      } else if (fieldName === 'YCX_MOI') {
        payload.ycx_data_moi = '';
        payload.ycx_file_name_moi = '';
      }

      // Only include LK fields if they actually have content, or if this save was explicitly triggered for that field
      if (categoryRevenueVal) {
        payload.lk_bi_tong_quan = categoryRevenueVal;
      } else if (fieldName === 'LUỸ KẾ DT' || fieldName === 'rt_catrev') {
        payload.lk_bi_tong_quan = '';
      }
      
      if (categoryTargetVal) {
        payload.lk_nh_sieu_thi = categoryTargetVal;
      } else if (fieldName === 'LUỸ KẾ TĐ' || fieldName === 'rt_catlk') {
        payload.lk_nh_sieu_thi = '';
      }

      // Backup locally FIRST to prevent data loss on F5 if payload exceeds Supabase limit
      const nowTs = Date.now();
      try {
        await localYcxDb.set('ycx_' + normalizeStoreId(cleanStore), JSON.stringify({
          ycx_data: minifiedYcx || '',
          ycx_data_moi: minifiedYcxMoi || '',
          ycx_file_name: ycxFileNameVal || '',
          ycx_file_name_moi: ycxFileNameMoiVal || '',
          updated_at: nowTs
        }));
      } catch (e) {
        console.warn('[RealtimeData] Lỗi lưu LocalDB', e);
      }

      let { error: upsertError } = await supabase
        .from('store')
        .upsert(payload, { onConflict: 'id' });

      // If full upsert failed (e.g. payload too large for PostgREST or Supabase limit),
      // fallback to storing file metadata and __LOCAL_CACHED__ marker to Supabase so DB state is never stale!
      if (upsertError && (payload.ycx_data || payload.ycx_data_moi)) {
        console.warn('[RealtimeData] Upsert failed with large payload, retrying with __LOCAL_CACHED__ metadata:', upsertError);
        const fallbackPayload = { ...payload };
        if (fallbackPayload.ycx_data) fallbackPayload.ycx_data = '__LOCAL_CACHED__';
        if (fallbackPayload.ycx_data_moi) fallbackPayload.ycx_data_moi = '__LOCAL_CACHED__';
        const retryRes = await supabase
          .from('store')
          .upsert(fallbackPayload, { onConflict: 'id' });
        if (!retryRes.error) {
          upsertError = null;
          console.log('[RealtimeData] ✓ Fallback metadata successfully saved to Supabase with __LOCAL_CACHED__');
        }
      }

      if (upsertError) {
        console.error('[RealtimeData] Upsert error:', upsertError);
        throw upsertError;
      }

      // Synchronize the 4 cluster report fields to ALL configured sibling stores in this warehouse
      const clusterFieldsToSync: any = {};
      if (marketVal) clusterFieldsToSync.rt_bi_tong_quan = marketVal;
      else if (fieldName === 'REALTIME DT' || fieldName === 'rt_market') clusterFieldsToSync.rt_bi_tong_quan = '';

      if (categoryVal) clusterFieldsToSync.rt_nh_cum = categoryVal;
      else if (fieldName === 'REALTIME TĐ' || fieldName === 'rt_cat') clusterFieldsToSync.rt_nh_cum = '';

      if (categoryRevenueVal) clusterFieldsToSync.lk_bi_tong_quan = categoryRevenueVal;
      else if (fieldName === 'LUỸ KẾ DT' || fieldName === 'rt_catrev') clusterFieldsToSync.lk_bi_tong_quan = '';

      if (categoryTargetVal) clusterFieldsToSync.lk_nh_sieu_thi = categoryTargetVal;
      else if (fieldName === 'LUỸ KẾ TĐ' || fieldName === 'rt_catlk') clusterFieldsToSync.lk_nh_sieu_thi = '';

      if (Object.keys(clusterFieldsToSync).length > 0) {
        const maKhoNum = parseInt(cleanMaKho, 10);
        // Query all existing store docs in this warehouse to make sure ALL of them get synchronized
        const { data: allWarehouseDocs } = await supabase
          .from('store')
          .select('id, ten_sieu_thi')
          .or(!isNaN(maKhoNum)
            ? `warehouse_code.eq.${cleanMaKho},warehouse_code.eq.${maKhoNum}`
            : `warehouse_code.eq.${cleanMaKho}`);

        const docMap = new Map<string, any>();
        if (allWarehouseDocs && allWarehouseDocs.length > 0) {
          allWarehouseDocs.forEach((d: any) => {
            if (d.id && isValidStoreName(d.ten_sieu_thi || d.id)) {
              docMap.set(d.id, d);
            }
          });
        }
        if (availableStores && availableStores.length > 0) {
          availableStores.forEach(s => {
            if (s.name && s.name !== 'ALL' && isValidStoreName(s.name)) {
              const id = normalizeStoreId(s.name);
              if (!docMap.has(id)) {
                docMap.set(id, { id, ten_sieu_thi: s.name });
              }
            }
          });
        }

        const siblingPayloads: any[] = [];
        const cleanStoreId = normalizeStoreId(cleanStore);
        docMap.forEach((docInfo, id) => {
          if (id !== cleanStoreId) {
            siblingPayloads.push({
              id,
              warehouse_code: cleanMaKho,
              ten_sieu_thi: docInfo.ten_sieu_thi || cleanStore,
              updated_at: new Date().toISOString(),
              ...clusterFieldsToSync
            });
          }
        });

        if (siblingPayloads.length > 0) {
          try {
            await supabase.from('store').upsert(siblingPayloads, { onConflict: 'id' });
            console.log(`[RealtimeData] ✓ Đồng bộ dữ liệu báo cáo cụm (${Object.keys(clusterFieldsToSync).join(', ')}) cho ${siblingPayloads.length} siêu thị khác`);
          } catch (syncErr) {
            console.warn('[RealtimeData] Lỗi đồng bộ dữ liệu cụm sang siêu thị khác:', syncErr);
          }
        }
      }

      setGlobalLastSaveTs(Date.now());
      lastSavedSnapshotRef.current = currentSnapshotKey;
      setLastUpdated(new Date());

      if (!silent) {
        setIsYcxDirty(false);
      }
      
      const payloadSize = JSON.stringify(payload).length;
      console.log(`[RealtimeData] Data saved successfully to DB for: ${cleanMaKho} | ycx: ${compressedYcx.length} bytes, ycx_moi: ${compressedYcxMoi.length} bytes, total payload: ${payloadSize} bytes`);
      if (!silent) {
        const msg = fieldName ? `Dữ liệu ${fieldName} đã được lưu thành công!` : 'Đã lưu dữ liệu Realtime thành công!';
        showNotification(msg, 'success');
      }
    } catch (error: any) {
      console.error('Lỗi lưu dữ liệu Realtime:', error);
      let message = fieldName ? `Lỗi lưu dữ liệu ${fieldName}: ${error.message}` : `Lỗi lưu dữ liệu Realtime: ${error.message}`;
      if (error.message?.includes('violates row-level security policy')) {
        message = 'Lỗi bảo mật (RLS): Bạn không có quyền lưu dữ liệu cho siêu thị này hoặc cấu hình Supabase chưa cho phép ghi dữ liệu.';
      } else if (error.message?.includes('exceeds the maximum allowed size') || error.message?.includes('1,048,576 bytes') || error.message?.includes('Payload Too Large')) {
        console.warn('[RealtimeData] Dữ liệu quá lớn — đã lưu an toàn vào bộ nhớ máy (LocalDB).');
        if (!silent) showNotification('File Excel lớn đã được lưu an toàn trên máy của bạn!', 'info');
        return;
      }
      if (!silent) showNotification(message, 'error');
    } finally {
      setIsSavingRealtime(false);
    }
  }, [normalizedMaKho, activeStore, availableStores, processedData, showNotification]);

  // PERF: Keep ref up-to-date
  useEffect(() => { saveRealtimeDataRef.current = saveRealtimeData; }, [saveRealtimeData]);

  // Debounced Auto-save — ONLY fire if user explicitly edited data in this instance!
  useEffect(() => {
    if (!normalizedMaKho || !activeStore) return;
    if (!isDirtyRef.current) return;

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    if (!isStoreReady) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        saveRealtimeDataRef.current?.(true);
      }
    }, 800); // 800ms debounce — fast save

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [marketInput, categoryInput, ycxData, ycxDataMoi, categoryRevenueInput, categoryTargetInput, activeStore, normalizedMaKho, isStoreReady]);

  // Force-save dirty data before page refresh (F5) or close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current && saveRealtimeDataRef.current) {
        // Use sendBeacon pattern: save synchronously before unload
        saveRealtimeDataRef.current(true);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Force-save listener: flush pending realtime data before version-update reload
  useEffect(() => {
    const handleForceSave = () => {
      // CRITICAL GUARD: Only flush if user actually has pending un-saved edits AND data has finished loading!
      if (!isDirtyRef.current || !hasLoadedFromDB) {
        console.log('[RealtimeData] Skip force-save before reload — no dirty edits or data not loaded yet');
        return;
      }
      console.log('[RealtimeData] Force-save triggered before reload — flushing pending data');
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      // Save immediately without debounce
      if (saveRealtimeDataRef.current) {
        saveRealtimeDataRef.current(true);
      }
    };
    window.addEventListener('force-save-before-reload', handleForceSave);
    return () => window.removeEventListener('force-save-before-reload', handleForceSave);
  }, [hasLoadedFromDB]);

  // Function to load data for a specific store name
  const loadDataForStore = useCallback(async (targetStore: string) => {
    if (!normalizedMaKho || !targetStore) return;
    
    setIsLoadingRealtime(true);
    setHasLoadedFromDB(false);
    isDirtyRef.current = false;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    skipAutoSaveRef.current = true;

    // Do not pre-clear input fields — keep existing local data intact until query resolves
    setLastUpdated(null);

    const isAllMode = targetStore === 'ALL';
    const sanitizeField = async (val: any) => {
      if (!val) return '';
      let str = String(val).trim();
      if (str === '__LOCAL_CACHED__') return '';
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

    if (!isAllMode && !isValidStoreName(targetStore)) {
      setIsLoadingRealtime(false);
      setHasLoadedFromDB(true);
      return;
    }

    console.log(`[RealtimeData] loadData → store: "${targetStore}"`);

    try {
      let record: any = null;
      let targetDocId = !isAllMode ? normalizeStoreId(targetStore.trim()) : '';

      if (!isAllMode && targetDocId) {
        console.log(`[RealtimeData] Querying document ID: "${targetDocId}"`);
        const { data, error } = await supabase
          .from('store')
          .select('rt_bi_tong_quan, rt_nh_cum, lk_bi_tong_quan, lk_nh_sieu_thi, ycx_data, ycx_data_moi, ycx_file_name, ycx_file_name_moi, ten_sieu_thi, updated_at')
          .eq('id', targetDocId)
          .maybeSingle();

        if (error) {
          console.error('[RTST] Error loading realtime data:', error);
        } else {
          record = data;
        }
      }

      // FALLBACK for 'ALL' mode OR if no doc found by targetDocId, OR if record is missing cluster reports:
      // Query warehouse documents to load shared cluster reports
      const hasClusterInRecord = record && (
        record.rt_bi_tong_quan || record.rt_nh_cum || record.lk_bi_tong_quan || record.lk_nh_sieu_thi
      );

      if ((!record || !hasClusterInRecord) && normalizedMaKho) {
        console.log(`[RealtimeData] ⚠️ Querying warehouse_code="${normalizedMaKho}" to load cluster reports...`);
        const maKhoNum = parseInt(normalizedMaKho, 10);
        const { data: allStoreData } = await supabase
          .from('store')
          .select('id, rt_bi_tong_quan, rt_nh_cum, lk_bi_tong_quan, lk_nh_sieu_thi, ycx_data, ycx_data_moi, ycx_file_name, ycx_file_name_moi, ten_sieu_thi, updated_at')
          .or(!isNaN(maKhoNum)
            ? `warehouse_code.eq.${normalizedMaKho},warehouse_code.eq.${maKhoNum}`
            : `warehouse_code.eq.${normalizedMaKho}`);

        if (allStoreData && allStoreData.length > 0) {
          // Find doc that contains cluster reports
          const withCluster = allStoreData.find(d => d.rt_bi_tong_quan || d.rt_nh_cum || d.lk_bi_tong_quan || d.lk_nh_sieu_thi);
          if (withCluster) {
            if (!record) {
              record = withCluster;
              targetDocId = record.id || targetDocId;
            } else {
              // Fill in missing cluster reports into record without overwriting store-specific data
              if (!record.rt_bi_tong_quan && withCluster.rt_bi_tong_quan) record.rt_bi_tong_quan = withCluster.rt_bi_tong_quan;
              if (!record.rt_nh_cum && withCluster.rt_nh_cum) record.rt_nh_cum = withCluster.rt_nh_cum;
              if (!record.lk_bi_tong_quan && withCluster.lk_bi_tong_quan) record.lk_bi_tong_quan = withCluster.lk_bi_tong_quan;
              if (!record.lk_nh_sieu_thi && withCluster.lk_nh_sieu_thi) record.lk_nh_sieu_thi = withCluster.lk_nh_sieu_thi;
            }
            console.log(`[RealtimeData] ✓ Warehouse fallback merged cluster reports from doc: "${withCluster?.id || withCluster?.ten_sieu_thi}"`);
          } else if (!record) {
            record = allStoreData[0];
            targetDocId = record.id || targetDocId;
          }
        }
      }

      if (record) {
        skipAutoSaveRef.current = true;
        // Block loading ONLY if user has un-saved local edits in this instance
        const isProtected = isDirtyRef.current;
        if (!isProtected) {
          const loadedMarket = await sanitizeField(record.rt_bi_tong_quan);
          const loadedCategory = await sanitizeField(record.rt_nh_cum);
          const loadedCategoryRevenue = await sanitizeField(record.lk_bi_tong_quan);
          const loadedCategoryTarget = await sanitizeField(record.lk_nh_sieu_thi);
          // Firebase is the source of truth!
          setMarketInput(loadedMarket || '');
          marketInputRef.current = loadedMarket || '';
          if (loadedMarket) {
            try { localStorage.setItem(`rtst_market_input_${normalizedMaKho}`, loadedMarket); } catch {}
          } else {
            try {
              localStorage.removeItem('rtst_market_input');
              if (normalizedMaKho) localStorage.removeItem(`rtst_market_input_${normalizedMaKho}`);
            } catch {}
          }

          setCategoryInput(loadedCategory || '');
          categoryInputRef.current = loadedCategory || '';
          if (loadedCategory) {
            try { localStorage.setItem(`rtst_category_input_${normalizedMaKho}`, loadedCategory); } catch {}
          } else {
            try {
              localStorage.removeItem('rtst_category_input');
              if (normalizedMaKho) localStorage.removeItem(`rtst_category_input_${normalizedMaKho}`);
            } catch {}
          }

          setCategoryRevenueInput(loadedCategoryRevenue || '');
          categoryRevenueInputRef.current = loadedCategoryRevenue || '';
          if (loadedCategoryRevenue) {
            try {
              localStorage.setItem('rt_catrev', loadedCategoryRevenue);
              localStorage.setItem('rtst_cluster_summary', loadedCategoryRevenue);
              localStorage.setItem('rtst_catrev', loadedCategoryRevenue);
            } catch {}
          } else {
            try {
              localStorage.removeItem('rt_catrev');
              localStorage.removeItem('rtst_cluster_summary');
              localStorage.removeItem('rtst_catrev');
              localStorage.removeItem('rtst_doanh_thu_hop_nhat');
              if (normalizedMaKho) {
                localStorage.removeItem(`rt_catrev_${normalizedMaKho}`);
                localStorage.removeItem(`rtst_cluster_summary_${normalizedMaKho}`);
                localStorage.removeItem(`rtst_catrev_${normalizedMaKho}`);
              }
            } catch {}
          }

          setCategoryTargetInput(loadedCategoryTarget || '');
          categoryTargetInputRef.current = loadedCategoryTarget || '';
          if (loadedCategoryTarget) {
            try { localStorage.setItem(`rtst_cat_target_${normalizedMaKho}`, loadedCategoryTarget); } catch {}
          } else {
            try {
              localStorage.removeItem('rt_catlk');
              localStorage.removeItem('rtst_catlk');
              localStorage.removeItem('rtst_cluster_category');
              if (normalizedMaKho) {
                localStorage.removeItem(`rtst_cat_target_${normalizedMaKho}`);
                localStorage.removeItem(`rtst_catlk_${normalizedMaKho}`);
                localStorage.removeItem(`rtst_cluster_category_${normalizedMaKho}`);
              }
            } catch {}
          }

          let finalYcxData = await sanitizeField(record.ycx_data);
          let finalYcxDataMoi = await sanitizeField(record.ycx_data_moi);
          let finalYcxFileName = record.ycx_file_name || '';
          let finalYcxFileNameMoi = record.ycx_file_name_moi || '';

          // Check LocalDB cache for newer or locally cached data
          const resolvedDocId = targetDocId || record.id || normalizeStoreId(targetStore);
          let localObj: any = null;
          try {
            const localPayload = await localYcxDb.get('ycx_' + resolvedDocId);
            if (localPayload) {
              localObj = JSON.parse(localPayload);
            }
          } catch (e) {}

          const dbUpdatedTime = record.updated_at ? new Date(record.updated_at).getTime() : 0;
          const localUpdatedTime = localObj?.updated_at || 0;

          // If local data exists and is newer or equal, OR if DB has __LOCAL_CACHED__ or missing data
          const useLocalYcx = localObj && (
            localUpdatedTime >= dbUpdatedTime ||
            record.ycx_data === '__LOCAL_CACHED__' ||
            !finalYcxData
          );

          if (useLocalYcx && localObj) {
            if (localObj.ycx_data) finalYcxData = await sanitizeField(localObj.ycx_data);
            if (localObj.ycx_file_name) finalYcxFileName = localObj.ycx_file_name;
          }

          const useLocalYcxMoi = localObj && (
            localUpdatedTime >= dbUpdatedTime ||
            record.ycx_data_moi === '__LOCAL_CACHED__' ||
            !finalYcxDataMoi
          );

          if (useLocalYcxMoi && localObj) {
            if (localObj.ycx_data_moi) finalYcxDataMoi = await sanitizeField(localObj.ycx_data_moi);
            if (localObj.ycx_file_name_moi) finalYcxFileNameMoi = localObj.ycx_file_name_moi;
          }

          if (finalYcxData === '__LOCAL_CACHED__') finalYcxData = '';
          if (finalYcxDataMoi === '__LOCAL_CACHED__') finalYcxDataMoi = '';

          if (finalYcxData) setYcxData(finalYcxData);
          if (finalYcxDataMoi) setYcxDataMoi(finalYcxDataMoi);
          if (finalYcxFileName) setYcxFileNameState(finalYcxFileName);
          if (finalYcxFileNameMoi) setYcxFileNameMoiState(finalYcxFileNameMoi);

          // Seed the no-op-save guard with what we just loaded
          lastSavedSnapshotRef.current = JSON.stringify([
            resolvedDocId, loadedMarket, loadedCategory, loadedCategoryRevenue,
            loadedCategoryTarget, finalYcxData, finalYcxDataMoi, finalYcxFileName, finalYcxFileNameMoi
          ]);
        } else {
          console.log('[RealtimeData] BLOCKED loadData restore — user recently cleared/edited data');
        }
        
        if (record.updated_at) {
          const parsedDate = new Date(record.updated_at);
          if (!isNaN(parsedDate.getTime())) {
            setLastUpdated(parsedDate);
          } else {
            setLastUpdated(null);
          }
        }
      } else {
        console.log(`[RealtimeData] No record found in DB for ID: "${targetDocId}" — keeping existing local data`);
        if (!isDirtyRef.current && targetDocId) {
          try {
            const localPayload = await localYcxDb.get('ycx_' + targetDocId);
            if (localPayload) {
              const parsed = JSON.parse(localPayload);
              if (parsed.ycx_data) {
                const val = await sanitizeField(parsed.ycx_data);
                if (val && val !== '__LOCAL_CACHED__') setYcxData(val);
              }
              if (parsed.ycx_data_moi) {
                const val = await sanitizeField(parsed.ycx_data_moi);
                if (val && val !== '__LOCAL_CACHED__') setYcxDataMoi(val);
              }
              if (parsed.ycx_file_name) setYcxFileNameState(parsed.ycx_file_name);
              if (parsed.ycx_file_name_moi) setYcxFileNameMoiState(parsed.ycx_file_name_moi);
            }
          } catch (e) {}
        }
      }

    } catch (err) {
      console.error('[RTST] Unexpected error in loadData:', err);
    } finally {
      setIsLoadingRealtime(false);
      setHasLoadedFromDB(true);
    }
  }, [normalizedMaKho, activeStore]);

  const loadData = useCallback(async (storeName?: string) => {
    const targetStore = storeName || activeStore;
    if (targetStore) {
      await loadDataForStore(targetStore);
    }
  }, [activeStore, loadDataForStore]);

  // Handle maKho change
  useEffect(() => {
    if (normalizedMaKho) {
      loadData();
    } else {
      clearData();
      setActiveStore('');
      setLastUpdated(null);
    }
  }, [normalizedMaKho, loadData]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!normalizedMaKho) return;

    // console.log(`[RTST] Subscribing to realtime updates for warehouse: ${normalizedMaKho}`);
    
    const channel = supabase
      .channel(`public:store:warehouse_code=eq.${normalizedMaKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store',
          filter: `warehouse_code=eq.${normalizedMaKho}`
        },
        (payload: any) => {
          // console.log('[RTST] Realtime update received from DB:', payload);
          if (skipSubscriptionRef.current || (Date.now() - globalLastSaveTimestampMs < 5000) || isDirtyRef.current) {
            return;
          }
          if (payload.new) {
            const record = payload.new as any;
            const recordStore = record.ten_sieu_thi || '';
            const isGlobalRecord = !recordStore;

            // Ignore legacy global records without a store name
            if (isGlobalRecord) return;

            // Verify it matches our active store
            const normRecordStore = recordStore.trim().toUpperCase();
            const normActiveStore = (activeStoreRef.current || '').trim().toUpperCase();
            const isMoiRecord = normRecordStore.endsWith(' (MỚI)');
            const baseStoreName = isMoiRecord ? normRecordStore.slice(0, -6).trim() : normRecordStore;
            
            if (baseStoreName !== normActiveStore) return;
            
            const sanitizeField = async (val: any) => {
              if (!val) return '';
              let str = String(val).trim();
              if (str === '__LOCAL_CACHED__') return '';
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

            if (isMoiRecord) {
              if (record.ycx_data_moi !== undefined && record.ycx_data_moi !== '__LOCAL_CACHED__') {
                sanitizeField(record.ycx_data_moi).then(val => {
                  if (val) setYcxDataMoi(prev => (prev !== val ? val : prev));
                });
              }
              if (record.ycx_file_name_moi) {
                setYcxFileNameMoiState(record.ycx_file_name_moi);
              }
            } else {
              if (record.rt_bi_tong_quan !== undefined) {
                sanitizeField(record.rt_bi_tong_quan).then(val => {
                  if (val) setMarketInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.rt_nh_cum !== undefined) {
                sanitizeField(record.rt_nh_cum).then(val => {
                  if (val) setCategoryInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.lk_bi_tong_quan !== undefined) {
                sanitizeField(record.lk_bi_tong_quan).then(val => {
                  // Only overwrite if incoming value is non-empty to prevent data loss
                  if (val) setCategoryRevenueInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.lk_nh_sieu_thi !== undefined) {
                sanitizeField(record.lk_nh_sieu_thi).then(val => {
                  // Only overwrite if incoming value is non-empty to prevent data loss
                  if (val) setCategoryTargetInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.ycx_data !== undefined && record.ycx_data !== '__LOCAL_CACHED__') {
                sanitizeField(record.ycx_data).then(val => {
                  if (val) setYcxData(prev => (prev !== val ? val : prev));
                });
              }
              if (record.ycx_file_name) {
                setYcxFileNameState(record.ycx_file_name);
              }
            }
          }
        }
      )
      .subscribe((status: any) => {
        // console.log(`[RTST] Subscription status for ${maKho}:`, status);
      });

    return () => {
      // console.log(`[RTST] Unsubscribing from realtime updates for ${maKho}`);
      supabase.removeChannel(channel);
    };
  }, [normalizedMaKho]);

  const syncRealtimeData = useCallback(async () => {
    if (!normalizedMaKho || !activeStore) {
      showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi đồng bộ!', 'error');
      return;
    }
    clearData(); // Clear old data first
    setIsLoadingRealtime(true);
    try {
      await loadDataForStore(activeStore);
      showNotification('Đã đồng bộ dữ liệu Realtime thành công!', 'success');
    } catch (error: any) {
      console.error('Lỗi đồng bộ dữ liệu Realtime:', error);
      showNotification(`Lỗi đồng bộ dữ liệu Realtime: ${error.message}`, 'error');
    } finally {
      setIsLoadingRealtime(false);
    }
  }, [normalizedMaKho, activeStore, loadDataForStore, showNotification, clearData]);

  // Synchronous setters to prevent stale closures during rapid paste/blur events
  const setMarketInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(marketInputRef.current) : val;
    marketInputRef.current = newVal;
    isDirtyRef.current = true;
    setMarketInput(newVal);
    try {
      if (normalizedMaKho) {
        if (newVal) localStorage.setItem(`rtst_market_input_${normalizedMaKho}`, newVal);
        else localStorage.removeItem(`rtst_market_input_${normalizedMaKho}`);
      }
    } catch {}
  }, [normalizedMaKho]);
  const setCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryInputRef.current) : val;
    categoryInputRef.current = newVal;
    isDirtyRef.current = true;
    setCategoryInput(newVal);
    try {
      if (normalizedMaKho) {
        if (newVal) localStorage.setItem(`rtst_category_input_${normalizedMaKho}`, newVal);
        else localStorage.removeItem(`rtst_category_input_${normalizedMaKho}`);
      }
    } catch {}
  }, [normalizedMaKho]);
  const setCategoryRevenueInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryRevenueInputRef.current) : val;
    categoryRevenueInputRef.current = newVal;
    isDirtyRef.current = true;
    setCategoryRevenueInput(newVal);
    try {
      if (newVal) {
        localStorage.setItem('rt_catrev', newVal);
        localStorage.setItem('rtst_cluster_summary', newVal);
        localStorage.setItem('rtst_catrev', newVal);
      }
    } catch {}
  }, []);
  const setCategoryTargetInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryTargetInputRef.current) : val;
    categoryTargetInputRef.current = newVal;
    isDirtyRef.current = true;
    setCategoryTargetInput(newVal);
    try {
      if (normalizedMaKho) {
        if (newVal) localStorage.setItem(`rtst_cat_target_${normalizedMaKho}`, newVal);
        else localStorage.removeItem(`rtst_cat_target_${normalizedMaKho}`);
      }
    } catch {}
  }, [normalizedMaKho]);

  // FORCE DELETE: Xoá toàn bộ dữ liệu trên Firebase, chặn mọi phục hồi
  const forceDeleteAllData = useCallback(async () => {
    const cleanStore = (activeStoreRef.current || '').trim();
    if (!normalizedMaKho || !cleanStore) return;

    // Block ALL restore paths for 30 seconds
    setGlobalLastSaveTs(Date.now() + 20000); // Push timestamp far into future
    skipSubscriptionRef.current = true;
    isDirtyRef.current = false;

    // Clear all local state + refs
    clearData();

    try {
      const targetDocId = normalizeStoreId(cleanStore);
      console.log(`[RealtimeData] FORCE DELETE all data for: "${targetDocId}"`);

      // SAFEGUARD: Use merge: true so other modules (e.g. lich_pg, declared_stores) are NEVER wiped out
      const docRef = doc(db, 'store', targetDocId);
      await setDoc(docRef, {
        id: targetDocId,
        warehouse_code: normalizedMaKho,
        ten_sieu_thi: cleanStore,
        updated_at: new Date().toISOString(),
        // Realtime fields
        rt_bi_tong_quan: '',
        rt_nh_cum: '',
        // Luyke fields
        lk_bi_tong_quan: '',
        lk_nh_sieu_thi: '',
        lk_dt_nv: '',
        lk_td_nv: '',
        ds_nhan_vien: '',
        dt_gio_cong: '',
        data_phan_ca: '',
        tragop_matran: '',
        tragop_nv: '',
        ban_kem_nv: '',
        category_targets: [],
        // YCX fields
        ycx_data: '',
        ycx_data_moi: ''
      }, { merge: true });

      console.log('[RealtimeData] FORCE DELETE completed successfully');
    } catch (err: any) {
      console.error('[RealtimeData] Force delete failed:', err);
    }

    // Keep blocking for 30 more seconds
    setGlobalLastSaveTs(Date.now() + 20000);
    setTimeout(() => {
      skipSubscriptionRef.current = false;
      setGlobalLastSaveTs(Date.now());
    }, 30000);
  }, [normalizedMaKho, clearData]);

  return {
    marketInput, setMarketInput: setMarketInputSync,
    realtimeDtThuc, setRealtimeDtThuc,
    categoryInput, setCategoryInput: setCategoryInputSync,
    ycxData, setYcxData: updateYcxData,
    ycxDataMoi, setYcxDataMoi: updateYcxDataMoi,
    ycxFileName, setYcxFileName: updateYcxFileName,
    ycxFileNameMoi, setYcxFileNameMoi: updateYcxFileNameMoi,
    categoryRevenueInput, setCategoryRevenueInput: setCategoryRevenueInputSync,
    categoryTargetInput, setCategoryTargetInput: setCategoryTargetInputSync,
    activeStore, setActiveStore,
    excludedYcxStaffNames, setExcludedYcxStaffNames,
    processedData,
    isSavingRealtime,
    isLoadingRealtime,
    isProcessingRealtime,
    isYcxDirty,
    lastUpdated,
    hasLoadedFromDB,
    processError,
    processData: handleProcess,
    saveRealtimeData,
    syncRealtimeData,
    loadData,
    clearData,
    clearField,
    forceDeleteAllData
  };
};
