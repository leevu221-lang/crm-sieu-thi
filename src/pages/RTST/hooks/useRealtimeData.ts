/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
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
  fetchConversionRates,
  CONVERSION_RATES,
  safeSetItem,
  isValidStoreName,
  minifyYcxData,
  normalizeStoreId
} from '../utils';

export const useRealtimeData = (maKho: string) => {
  const { showNotification } = useNotification();
  const { isStoreReady, currentStoreId } = useStore();
  
  // Normalize maKho: trim and remove leading zeros for consistency
  const normalizedMaKho = maKho ? maKho.trim().replace(/^0+/, '') : '';

  const [marketInput, setMarketInput] = useState(() => localStorage.getItem(STORAGE_KEYS.MARKET_INPUT) || '');
  const [categoryInput, setCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CATEGORY_INPUT) || '');
  const [ycxData, setYcxData] = useState(() => localStorage.getItem(STORAGE_KEYS.YCX_DATA) || '');
  const [categoryRevenueInput, setCategoryRevenueInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CATEGORY_REVENUE_INPUT) || '');
  const [categoryTargetInput, setCategoryTargetInput] = useState(() => localStorage.getItem('RTST_CATEGORY_TARGET_INPUT') || '');
  const [activeStore, setActiveStore] = useState<string>(maKho);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [conversionRates, setConversionRates] = useState<Record<string, { normal: number, installment: number }>>(CONVERSION_RATES);

  // Keep refs of inputs to prevent stale closures during saving
  const marketInputRef = useRef(marketInput);
  const categoryInputRef = useRef(categoryInput);
  const categoryRevenueInputRef = useRef(categoryRevenueInput);
  const categoryTargetInputRef = useRef(categoryTargetInput);
  const ycxDataRef = useRef(ycxData);
  const activeStoreRef = useRef(activeStore);

  useEffect(() => { marketInputRef.current = marketInput; }, [marketInput]);
  useEffect(() => { categoryInputRef.current = categoryInput; }, [categoryInput]);
  useEffect(() => { categoryRevenueInputRef.current = categoryRevenueInput; }, [categoryRevenueInput]);
  useEffect(() => { categoryTargetInputRef.current = categoryTargetInput; }, [categoryTargetInput]);
  useEffect(() => { ycxDataRef.current = ycxData; }, [ycxData]);
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
  const [isYcxDirty, setIsYcxDirty] = useState(() => localStorage.getItem('RTST_YCX_DIRTY') === 'true');
  const isYcxDirtyRef = useRef(isYcxDirty);

  // Keep ref in sync with state for use in callbacks without dependency issues
  useEffect(() => {
    isYcxDirtyRef.current = isYcxDirty;
    localStorage.setItem('RTST_YCX_DIRTY', isYcxDirty.toString());
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
    localStorage.removeItem(STORAGE_KEYS.MARKET_INPUT);
    localStorage.removeItem(STORAGE_KEYS.CATEGORY_INPUT);
    localStorage.removeItem(STORAGE_KEYS.YCX_DATA);
  }, []);

  const handleProcess = useCallback(() => {
    try {
      console.log('[RealtimeData] handleProcess triggered:', {
        marketInputLength: marketInput?.length || 0,
        categoryInputLength: categoryInput?.length || 0,
        ycxDataLength: ycxData?.length || 0
      });
      const markets = parseMarketData(marketInput, 0, 'RTST');
      const luykeMarkets = categoryRevenueInput ? parseMarketData(categoryRevenueInput, 0, 'LUYKE') : [];
      const categories = parseCategoryData(categoryInput, 0, 30, markets);
      const staff = parseYcxData(ycxData, conversionRates);
      const ycxRankData = parseYcxRankData(ycxData, conversionRates);

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
      console.error('Error processing realtime data:', error);
      setProcessError(error.stack || error.message || String(error));
    }
  }, [marketInput, categoryInput, ycxData, categoryRevenueInput, categoryTargetInput, conversionRates]);

  // Fetch conversion rates on mount
  useEffect(() => {
    const getRates = async () => {
      const rates = await fetchConversionRates();
      setConversionRates(rates);
    };
    getRates();
  }, []);
  useEffect(() => {
    setIsProcessingRealtime(true);
    const tid = setTimeout(() => {
      handleProcess();
      setIsProcessingRealtime(false);
    }, 200);

    if (marketInput) safeSetItem(STORAGE_KEYS.MARKET_INPUT, marketInput);
    else localStorage.removeItem(STORAGE_KEYS.MARKET_INPUT);
    
    if (categoryInput) safeSetItem(STORAGE_KEYS.CATEGORY_INPUT, categoryInput);
    else localStorage.removeItem(STORAGE_KEYS.CATEGORY_INPUT);
    
    if (categoryTargetInput) safeSetItem('RTST_CATEGORY_TARGET_INPUT', categoryTargetInput);
    else localStorage.removeItem('RTST_CATEGORY_TARGET_INPUT');
    
    // YCX is still global
    if (ycxData) safeSetItem(STORAGE_KEYS.YCX_DATA, ycxData);
    else localStorage.removeItem(STORAGE_KEYS.YCX_DATA);
    
    return () => clearTimeout(tid);
  }, [marketInput, categoryInput, ycxData, handleProcess]);

  const updateYcxData = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(ycxDataRef.current) : val;
    // Minify data before setting to prevent Firebase 1MB size limit errors
    const minified = minifyYcxData(newVal);
    ycxDataRef.current = minified;
    setYcxData(minified);
    setIsYcxDirty(true);
  }, []);

  const clearField = useCallback((setter: (val: string) => void) => {
    skipSubscriptionRef.current = true;
    setter('');
  }, []);

  const saveRealtimeData = useCallback(async (silent = false) => {
    const cleanStore = (activeStore || '').trim();
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

      // console.log('[RealtimeData] Saving data for:', cleanMaKho, {
      //   ycxLength: ycxData?.length || 0,
      //   marketLength: marketInput?.length || 0
      // });

      const { error: upsertError } = await supabase
        .from('store')
        .upsert({
          id: normalizeStoreId(cleanStore), // Normalized UPPERCASE ID to prevent duplicates
          warehouse_code: cleanMaKho,
          ten_sieu_thi: cleanStore,
          rt_bi_tong_quan: marketInputRef.current,
          rt_nh_cum: categoryInputRef.current,
          lk_bi_tong_quan: categoryRevenueInputRef.current,
          lk_nh_sieu_thi: categoryTargetInputRef.current,
          ycx_data: ycxDataRef.current,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('[RealtimeData] Upsert error:', upsertError);
        throw upsertError;
      }

      // 2. Global update removed as requested - REALTIME DT and REALTIME TĐ are now per-store.
      
      if (!silent) {
        setIsYcxDirty(false);
      }
      
      // console.log('[RealtimeData] Data saved successfully to DB for:', cleanMaKho);
      if (!silent) showNotification('Đã lưu dữ liệu Realtime thành công!', 'success');
    } catch (error: any) {
      console.error('Lỗi lưu dữ liệu Realtime:', error);
      let message = `Lỗi lưu dữ liệu Realtime: ${error.message}`;
      if (error.message?.includes('violates row-level security policy')) {
        message = 'Lỗi bảo mật (RLS): Bạn không có quyền lưu dữ liệu cho siêu thị này hoặc cấu hình Supabase chưa cho phép ghi dữ liệu.';
      }
      if (!silent) showNotification(message, 'error');
    } finally {
      setIsSavingRealtime(false);
    }
  }, [maKho, activeStore, marketInput, categoryInput, ycxData, categoryRevenueInput, categoryTargetInput, showNotification]);

  // PERF: Keep ref up-to-date
  useEffect(() => { saveRealtimeDataRef.current = saveRealtimeData; }, [saveRealtimeData]);

  // Debounced Auto-save
  // PERF: Uses saveRealtimeDataRef instead of saveRealtimeData to avoid dependency cascade
  useEffect(() => {
    if (!normalizedMaKho || !activeStore) return;
    
    // Skip if we just loaded from DB
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    // MULTI-STORE GUARD: Block auto-save during store switch
    if (!isStoreReady) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveRealtimeDataRef.current?.(true);
    }, 4000); // 4 seconds debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [marketInput, categoryInput, categoryRevenueInput, categoryTargetInput, ycxData, normalizedMaKho, activeStore, isStoreReady]);

  const loadData = useCallback(async (storeName?: string) => {
    if (!normalizedMaKho) {
      setIsLoadingRealtime(false);
      return;
    }
    
    const targetStore = storeName || activeStore;

    // Clear state before loading to ensure clean isolation
    setMarketInput('');
    setCategoryInput('');
    setYcxData('');
    setCategoryRevenueInput('');
    setCategoryTargetInput('');
    setLastUpdated(null);

    // Cancel pending auto-saves and block current triggers
    setIsLoadingRealtime(true);
    setHasLoadedFromDB(false);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    skipAutoSaveRef.current = true;

    if (!isValidStoreName(targetStore)) {
      setIsLoadingRealtime(false);
      return;
    }

    console.log(`[RealtimeData] loadData → store: "${targetStore}"`);

    try {
      const targetDocId = normalizeStoreId(targetStore.trim());
      console.log(`[RealtimeData] Querying document ID: "${targetDocId}"`);
      // Query directly using the selected store name as the unique document ID
      const { data: record, error } = await supabase
        .from('store')
        .select('rt_bi_tong_quan, rt_nh_cum, lk_bi_tong_quan, lk_nh_sieu_thi, ycx_data, ten_sieu_thi, updated_at')
        .eq('id', targetDocId)
        .maybeSingle();

      if (error) {
        console.error('[RTST] Error loading realtime data:', error);
        return;
      }

      console.log(`[RealtimeData] loadData record result:`, {
        exists: !!record,
        id: record?.id,
        ten_sieu_thi: record?.ten_sieu_thi,
        rt_bi_length: record?.rt_bi_tong_quan?.length || 0,
        rt_nh_cum_length: record?.rt_nh_cum?.length || 0
      });

      if (record) {
        skipAutoSaveRef.current = true;
        setMarketInput(record.rt_bi_tong_quan || '');
        setCategoryInput(record.rt_nh_cum || '');
        setCategoryRevenueInput(record.lk_bi_tong_quan || '');
        setCategoryTargetInput(record.lk_nh_sieu_thi || '');
        setYcxData(record.ycx_data || '');
        
        if (record.updated_at) {
          const parsedDate = new Date(record.updated_at);
          // Only set lastUpdated if it's a valid date object
          if (!isNaN(parsedDate.getTime())) {
            setLastUpdated(parsedDate);
          } else {
            setLastUpdated(null);
          }
        } else {
          setLastUpdated(null);
        }
      } else {
        console.log(`[RealtimeData] No record found in DB for ID: "${targetDocId}"`);
      }
    } catch (err) {
      console.error('[RTST] Unexpected error in loadData:', err);
    } finally {
      setIsLoadingRealtime(false);
      setHasLoadedFromDB(true);
    }
  }, [normalizedMaKho, activeStore]);

  // Handle maKho change
  useEffect(() => {
    if (normalizedMaKho) {
      loadData();
    } else {
      clearData();
      setActiveStore('');
      setLastUpdated(null);
    }
  }, [normalizedMaKho]);

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
          if (skipSubscriptionRef.current) {
            skipSubscriptionRef.current = false;
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
            if (normRecordStore && normActiveStore && normRecordStore !== normActiveStore) return;
            
            // Only update if different to avoid loops and preserve cursor position if user is typing
            setMarketInput(prev => {
              if (prev !== record.rt_bi_tong_quan) {
                skipAutoSaveRef.current = true;
                return record.rt_bi_tong_quan || '';
              }
              return prev;
            });
            
            setCategoryInput(prev => {
              if (prev !== record.rt_nh_cum) {
                skipAutoSaveRef.current = true;
                return record.rt_nh_cum || '';
              }
              return prev;
            });

            setCategoryRevenueInput(prev => {
              if (prev !== record.lk_bi_tong_quan) {
                skipAutoSaveRef.current = true;
                return record.lk_bi_tong_quan || '';
              }
              return prev;
            });
            
            setCategoryTargetInput(prev => {
              if (prev !== record.lk_nh_sieu_thi) {
                skipAutoSaveRef.current = true;
                return record.lk_nh_sieu_thi || '';
              }
              return prev;
            });
            
            setYcxData(prev => {
              // Safeguard: If Firebase rejected our save (e.g. >1MB limit) 
              // it rolls back and sends an empty string. We ignore it to prevent data loss on UI.
              if (prev && prev.length > 1000 && (!record.ycx_data || record.ycx_data.trim() === '')) {
                return prev;
              }
              if (prev !== record.ycx_data) {
                skipAutoSaveRef.current = true;
                return record.ycx_data || '';
              }
              return prev;
            });
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
        .select('rt_bi_tong_quan, rt_nh_cum, lk_bi_tong_quan, lk_nh_sieu_thi, ycx_data, ten_sieu_thi, updated_at')
        .eq('id', normalizeStoreId(activeStore.trim()))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMarketInput(data.rt_bi_tong_quan || '');
        setCategoryInput(data.rt_nh_cum || '');
        setCategoryRevenueInput(data.lk_bi_tong_quan || '');
        setCategoryTargetInput(data.lk_nh_sieu_thi || '');
        setYcxData(data.ycx_data || '');
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
    marketInputRef.current = newVal; setMarketInput(newVal);
  }, []);
  const setCategoryInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryInputRef.current) : val;
    categoryInputRef.current = newVal; setCategoryInput(newVal);
  }, []);
  const setCategoryRevenueInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryRevenueInputRef.current) : val;
    categoryRevenueInputRef.current = newVal; setCategoryRevenueInput(newVal);
  }, []);
  const setCategoryTargetInputSync = useCallback((val: string | ((prev: string) => string)) => {
    const newVal = typeof val === 'function' ? val(categoryTargetInputRef.current) : val;
    categoryTargetInputRef.current = newVal; setCategoryTargetInput(newVal);
  }, []);

  return {
    marketInput, setMarketInput: setMarketInputSync,
    categoryInput, setCategoryInput: setCategoryInputSync,
    ycxData, setYcxData: updateYcxData,
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
    clearField
  };
};
