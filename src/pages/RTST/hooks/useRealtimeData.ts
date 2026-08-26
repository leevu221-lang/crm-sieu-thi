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
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
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
  const { isStoreReady, currentStoreId } = useStore();
  
  // Normalize maKho: trim and remove leading zeros for consistency
  const normalizedMaKho = maKho ? maKho.trim().replace(/^0+/, '') : '';

  const isDirtyRef = useRef(false);

  const [marketInput, setMarketInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [ycxData, setYcxData] = useState('');
  const [ycxDataMoi, setYcxDataMoi] = useState('');
  const [ycxFileName, setYcxFileNameState] = useState('');
  const [ycxFileNameMoi, setYcxFileNameMoiState] = useState('');
  const [categoryRevenueInput, setCategoryRevenueInput] = useState('');
  const [categoryTargetInput, setCategoryTargetInput] = useState('');
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
    if (!currentStoreId || currentStoreId === 'ALL') return;
    if (!normalizedMaKho) return;
    
    // Skip if store hasn't actually changed
    if (prevStoreIdRef.current === currentStoreId && activeStore === currentStoreId) return;

    // FORCE SAVE the old store's data before we switch away from it
    if (prevStoreIdRef.current && prevStoreIdRef.current !== 'ALL' && hasLoadedFromDB) {
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
      const marketTextToUse = (marketInput && marketInput.trim()) || (categoryRevenueInput && categoryRevenueInput.trim()) || '';
      const luykeMarketTextToUse = (categoryRevenueInput && categoryRevenueInput.trim()) || (marketInput && marketInput.trim()) || '';
      const categoryTextToUse = (categoryInput && categoryInput.trim()) || (categoryTargetInput && categoryTargetInput.trim()) || '';

      const markets = parseMarketData(marketTextToUse, 0, 'RTST');
      const luykeMarkets = luykeMarketTextToUse ? parseMarketData(luykeMarketTextToUse, 0, 'LUYKE') : [];
      const categories = parseCategoryData(categoryTextToUse, 0, 30, markets.length > 0 ? markets : luykeMarkets);
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
  }, [marketInput, categoryInput, categoryRevenueInput, categoryTargetInput, ycxData, quyDoiRules]);

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
  }, [marketInput, categoryInput, categoryRevenueInput, categoryTargetInput, ycxData, ycxDataMoi, handleProcess]);

  const updateYcxData = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxDataRef.current) : val;
    // Minify data before setting to prevent Firebase 1MB size limit errors
    const minified = minifyYcxData(newVal);
    ycxDataRef.current = minified;
    isDirtyRef.current = true;
    setYcxData(minified);
    setIsYcxDirty(true);
  }, []);

  const updateYcxDataMoi = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxDataMoiRef.current) : val;
    // Minify data before setting to prevent Firebase 1MB size limit errors
    const minified = minifyYcxData(newVal);
    ycxDataMoiRef.current = minified;
    isDirtyRef.current = true;
    setYcxDataMoi(minified);
    setIsYcxDirty(true);
  }, []);

  const clearField = useCallback((setter: (val: string) => void) => {
    // Block ALL restore paths
    setGlobalLastSaveTs(Date.now());
    skipSubscriptionRef.current = true;
    setter('');
    isDirtyRef.current = false;
    // Save immediately — no delay
    if (saveRealtimeDataRef.current) {
      saveRealtimeDataRef.current(true);
    }
    // Release subscription block after 2s
    setTimeout(() => {
      skipSubscriptionRef.current = false;
    }, 2000);
  }, []);

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

    const cleanStore = (activeStoreRef.current || '').trim();
    if (!normalizedMaKho || !cleanStore || !isValidStoreName(cleanStore)) {
      if (!silent && !cleanStore) {
        showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi lưu!', 'error');
      } else if (cleanStore && !isValidStoreName(cleanStore)) {
        if (!silent) showNotification(`Tên siêu thị "${cleanStore}" không hợp lệ. Vui lòng chọn siêu thị cụ thể từ danh sách trên cùng!`, 'error');
        console.warn(`[RealtimeData] Skip saving to DB: "${cleanStore}" is not a valid declared supermarket name.`);
      }
      return;
    }
    setIsSavingRealtime(true);
    try {
      const cleanMaKho = normalizedMaKho;

      const minifiedYcx = ycxDataRef.current ? minifyYcxData(ycxDataRef.current) : '';
      const minifiedYcxMoi = ycxDataMoiRef.current ? minifyYcxData(ycxDataMoiRef.current) : '';

      // Compress YCX data to avoid exceeding Firestore 1MB document limit
      const compressedYcx = minifiedYcx ? await compressString(minifiedYcx) : '';
      const compressedYcxMoi = minifiedYcxMoi ? await compressString(minifiedYcxMoi) : '';

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

      const payload: any = {
        id: normalizeStoreId(cleanStore), // Normalized UPPERCASE ID to prevent duplicates
        warehouse_code: cleanMaKho,
        ten_sieu_thi: cleanStore,
        updated_at: new Date().toISOString(),
        rt_bi_tong_quan: marketVal || '',
        rt_nh_cum: categoryVal || '',
        lk_bi_tong_quan: categoryRevenueVal || '',
        lk_nh_sieu_thi: categoryTargetVal || '',
        ycx_data: compressedYcx || '',
        ycx_data_moi: compressedYcxMoi || '',
        ycx_file_name: ycxFileNameVal,
        ycx_file_name_moi: ycxFileNameMoiVal
      };

      // Backup locally FIRST to prevent data loss on F5 if payload exceeds Supabase limit
      try {
        await localYcxDb.set('ycx_' + normalizeStoreId(cleanStore), JSON.stringify({
          ycx_data: compressedYcx || '',
          ycx_data_moi: compressedYcxMoi || '',
          ycx_file_name: ycxFileNameVal || '',
          ycx_file_name_moi: ycxFileNameMoiVal || ''
        }));
      } catch (e) {
        console.warn('[RealtimeData] Lỗi lưu LocalDB', e);
      }

      const { error: upsertError } = await supabase
        .from('store')
        .upsert(payload, { onConflict: 'id' });

      if (upsertError) {
        console.error('[RealtimeData] Upsert error:', upsertError);
        throw upsertError;
      }
      
      if (!silent) {
        setIsYcxDirty(false);
      }
      
      const payloadSize = JSON.stringify(payload).length;
      console.log(`[RealtimeData] Data saved successfully to DB for: ${cleanMaKho} | ycx: ${compressedYcx.length} bytes, ycx_moi: ${compressedYcxMoi.length} bytes, total payload: ${payloadSize} bytes`);
      if (!silent) {
        const msg = fieldName ? `Dữ liệu ${fieldName} đã được lưu thành công lên Firebase!` : 'Đã lưu dữ liệu Realtime thành công lên Firebase!';
        showNotification(msg, 'success');
      }
    } catch (error: any) {
      console.error('Lỗi lưu dữ liệu Realtime:', error);
      let message = fieldName ? `Lỗi lưu dữ liệu ${fieldName}: ${error.message}` : `Lỗi lưu dữ liệu Realtime: ${error.message}`;
      if (error.message?.includes('violates row-level security policy')) {
        message = 'Lỗi bảo mật (RLS): Bạn không có quyền lưu dữ liệu cho siêu thị này hoặc cấu hình Supabase chưa cho phép ghi dữ liệu.';
      } else if (error.message?.includes('exceeds the maximum allowed size') || error.message?.includes('1,048,576 bytes')) {
        console.warn('[RealtimeData] Dữ liệu quá lớn vượt 1MB Firestore — giữ dữ liệu thô trong bộ nhớ.');
        return;
      }
      if (!silent) showNotification(message, 'error');
    } finally {
      setIsSavingRealtime(false);
    }
  }, [maKho, activeStore, marketInput, categoryInput, ycxData, ycxDataMoi, categoryRevenueInput, categoryTargetInput, showNotification]);

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

    if (!isValidStoreName(targetStore)) {
      setIsLoadingRealtime(false);
      return;
    }

    console.log(`[RealtimeData] loadData → store: "${targetStore}"`);

    try {
      const targetDocId = normalizeStoreId(targetStore.trim());
      console.log(`[RealtimeData] Querying document ID: "${targetDocId}"`);
      const { data: record, error } = await supabase
        .from('store')
        .select('rt_bi_tong_quan, rt_nh_cum, lk_bi_tong_quan, lk_nh_sieu_thi, ycx_data, ycx_data_moi, ycx_file_name, ycx_file_name_moi, ten_sieu_thi, updated_at')
        .eq('id', targetDocId)
        .maybeSingle();

      if (error) {
        console.error('[RTST] Error loading realtime data:', error);
        return;
      }

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

      if (record) {
        skipAutoSaveRef.current = true;
        // Block loading ONLY if user has un-saved local edits in this instance
        const isProtected = isDirtyRef.current;
        if (!isProtected) {
          setMarketInput(await sanitizeField(record.rt_bi_tong_quan));
          setCategoryInput(await sanitizeField(record.rt_nh_cum));
          setCategoryRevenueInput(await sanitizeField(record.lk_bi_tong_quan));
          setCategoryTargetInput(await sanitizeField(record.lk_nh_sieu_thi));
          
          let finalYcxData = await sanitizeField(record.ycx_data);
          let finalYcxDataMoi = await sanitizeField(record.ycx_data_moi);
          let finalYcxFileName = record.ycx_file_name || '';
          let finalYcxFileNameMoi = record.ycx_file_name_moi || '';

          // If empty (because it was too large to save to DB), try to recover from LocalDB
          if (!finalYcxData || !finalYcxDataMoi || !finalYcxFileName) {
            try {
              const localPayload = await localYcxDb.get('ycx_' + targetDocId);
              if (localPayload) {
                const parsed = JSON.parse(localPayload);
                if (!finalYcxData && parsed.ycx_data) finalYcxData = await sanitizeField(parsed.ycx_data);
                if (!finalYcxDataMoi && parsed.ycx_data_moi) finalYcxDataMoi = await sanitizeField(parsed.ycx_data_moi);
                if (!finalYcxFileName && parsed.ycx_file_name) finalYcxFileName = parsed.ycx_file_name;
                if (!finalYcxFileNameMoi && parsed.ycx_file_name_moi) finalYcxFileNameMoi = parsed.ycx_file_name_moi;
              }
            } catch (e) {}
          }

          setYcxData(finalYcxData);
          setYcxDataMoi(finalYcxDataMoi);
          // Restore YCX file names from Firebase or LocalDB
          setYcxFileNameState(finalYcxFileName);
          setYcxFileNameMoiState(finalYcxFileNameMoi);
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
        if (!isDirtyRef.current) {
          try {
            const localPayload = await localYcxDb.get('ycx_' + targetDocId);
            if (localPayload) {
              const parsed = JSON.parse(localPayload);
              if (parsed.ycx_data) setYcxData(await sanitizeField(parsed.ycx_data));
              if (parsed.ycx_data_moi) setYcxDataMoi(await sanitizeField(parsed.ycx_data_moi));
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
          if (skipSubscriptionRef.current || (Date.now() - globalLastSaveTimestampMs < 3000) || isDirtyRef.current) {
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
              if (record.ycx_data_moi !== undefined) {
                sanitizeField(record.ycx_data_moi).then(val => {
                  setYcxDataMoi(prev => (prev !== val ? val : prev));
                });
              }
            } else {
              if (record.rt_bi_tong_quan !== undefined) {
                sanitizeField(record.rt_bi_tong_quan).then(val => {
                  setMarketInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.rt_nh_cum !== undefined) {
                sanitizeField(record.rt_nh_cum).then(val => {
                  setCategoryInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.lk_bi_tong_quan !== undefined) {
                sanitizeField(record.lk_bi_tong_quan).then(val => {
                  setCategoryRevenueInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.lk_nh_sieu_thi !== undefined) {
                sanitizeField(record.lk_nh_sieu_thi).then(val => {
                  setCategoryTargetInput(prev => (prev !== val ? val : prev));
                });
              }
              if (record.ycx_data !== undefined) {
                sanitizeField(record.ycx_data).then(val => {
                  setYcxData(prev => (prev !== val ? val : prev));
                });
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
      // Query directly using the selected store name as the unique document ID
      const { data, error } = await supabase
        .from('store')
        .select('rt_bi_tong_quan, rt_nh_cum, lk_bi_tong_quan, lk_nh_sieu_thi, ycx_data, ycx_data_moi, ycx_file_name, ycx_file_name_moi, ten_sieu_thi, updated_at')
        .eq('id', normalizeStoreId(activeStore.trim()))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMarketInput(data.rt_bi_tong_quan || '');
        setCategoryInput(data.rt_nh_cum || '');
        setCategoryRevenueInput(data.lk_bi_tong_quan || '');
        setCategoryTargetInput(data.lk_nh_sieu_thi || '');
        setYcxData(data.ycx_data || '');
        setYcxDataMoi(data.ycx_data_moi || '');
        // Restore file names from Firebase
        setYcxFileNameState(data.ycx_file_name || '');
        setYcxFileNameMoiState(data.ycx_file_name_moi || '');
      } else {
        showNotification('Không tìm thấy dữ liệu Realtime để đồng bộ.', 'error');
      }

    } catch (error: any) {
      console.error('Lỗi đồng bộ dữ liệu Realtime:', error);
      showNotification(`Lỗi đồng bộ dữ liệu Realtime: ${error.message}`, 'error');
    } finally {
      setIsLoadingRealtime(false);
    }
  }, [normalizedMaKho, activeStore, handleProcess, showNotification, clearData]);

  // Synchronous setters to prevent stale closures during rapid paste/blur events
  const setMarketInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(marketInputRef.current) : val;
    marketInputRef.current = newVal;
    isDirtyRef.current = true;
    setMarketInput(newVal);
  }, []);
  const setCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryInputRef.current) : val;
    categoryInputRef.current = newVal;
    isDirtyRef.current = true;
    setCategoryInput(newVal);
  }, []);
  const setCategoryRevenueInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryRevenueInputRef.current) : val;
    categoryRevenueInputRef.current = newVal;
    isDirtyRef.current = true;
    setCategoryRevenueInput(newVal);
  }, []);
  const setCategoryTargetInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryTargetInputRef.current) : val;
    categoryTargetInputRef.current = newVal;
    isDirtyRef.current = true;
    setCategoryTargetInput(newVal);
  }, []);

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

      // BYPASS adapter (merge:true) — use Firestore setDoc directly with merge:false
      // This REPLACES the entire document, removing ALL old fields
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
      }); // NO merge — full overwrite

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
    categoryInput, setCategoryInput: setCategoryInputSync,
    ycxData, setYcxData: updateYcxData,
    ycxDataMoi, setYcxDataMoi: updateYcxDataMoi,
    ycxFileName, setYcxFileName: setYcxFileNameState,
    ycxFileNameMoi, setYcxFileNameMoi: setYcxFileNameMoiState,
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
