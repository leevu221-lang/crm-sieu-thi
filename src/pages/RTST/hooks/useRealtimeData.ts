/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
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
  safeSetItem
} from '../utils';

export const useRealtimeData = (maKho: string) => {
  const { showNotification } = useNotification();
  
  // Normalize maKho: trim and remove leading zeros for consistency
  const normalizedMaKho = maKho ? maKho.trim().replace(/^0+/, '') : '';

  const [marketInput, setMarketInput] = useState(() => localStorage.getItem(STORAGE_KEYS.MARKET_INPUT) || '');
  const [categoryInput, setCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CATEGORY_INPUT) || '');
  const [ycxData, setYcxData] = useState(() => localStorage.getItem(STORAGE_KEYS.YCX_DATA) || '');
  const [categoryRevenueInput, setCategoryRevenueInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CATEGORY_REVENUE_INPUT) || '');
  const [activeStore, setActiveStore] = useState<string>(maKho);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [conversionRates, setConversionRates] = useState<Record<string, { normal: number, installment: number }>>(CONVERSION_RATES);

  const [excludedYcxStaffNames, setExcludedYcxStaffNames] = useState<string[]>([]);

  const [processedData, setProcessedData] = useState<{
    markets: MarketInfo[];
    categories: CategoryData[];
    staff: YcxStaffData[];
    ycxRankData: YcxRankData[];
  }>({
    markets: [],
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
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearData = useCallback(() => {
    setMarketInput('');
    setCategoryInput('');
    setYcxData('');
    setIsYcxDirty(false);
    setCategoryRevenueInput('');
    setProcessedData({
      markets: [],
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
      const markets = parseMarketData(marketInput, 0, 'RTST');
      const categories = parseCategoryData(categoryInput, 0, 30, markets);
      const staff = parseYcxData(ycxData, conversionRates);
      // console.log('[useRealtimeData] handleProcess: staff count:', staff?.length || 0);
      const ycxRankData = parseYcxRankData(ycxData, conversionRates);

      setProcessedData({
        markets,
        categories,
        staff,
        ycxRankData
      });
    } catch (error) {
      console.error('Error processing realtime data:', error);
    }
  }, [marketInput, categoryInput, ycxData, conversionRates]);

  // Fetch conversion rates on mount
  useEffect(() => {
    const getRates = async () => {
      const rates = await fetchConversionRates();
      setConversionRates(rates);
    };
    getRates();
  }, []);

  // Auto-process data when inputs change (debounced 200ms) and sync to localStorage
  useEffect(() => {
    const tid = setTimeout(() => {
      handleProcess();
    }, 200);
    if (marketInput) safeSetItem(STORAGE_KEYS.MARKET_INPUT, marketInput);
    if (categoryInput) safeSetItem(STORAGE_KEYS.CATEGORY_INPUT, categoryInput);
    if (ycxData) safeSetItem(STORAGE_KEYS.YCX_DATA, ycxData);
    if (categoryRevenueInput) safeSetItem(STORAGE_KEYS.CATEGORY_REVENUE_INPUT, categoryRevenueInput);
    return () => clearTimeout(tid);
  }, [marketInput, categoryInput, ycxData, categoryRevenueInput, handleProcess]);

  const updateYcxData = useCallback((newData: string) => {
    setYcxData(newData);
    setIsYcxDirty(true);
  }, []);

  const saveRealtimeData = useCallback(async (silent = false) => {
    if (!normalizedMaKho || !activeStore) {
      if (!silent) showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi lưu!', 'error');
      return;
    }
    setIsSavingRealtime(true);
    try {
      const cleanMaKho = normalizedMaKho;
      const cleanStore = (activeStore || normalizedMaKho).trim();

      // console.log('[RealtimeData] Saving data for:', cleanMaKho, {
      //   ycxLength: ycxData?.length || 0,
      //   marketLength: marketInput?.length || 0
      // });

      // 1. First, upsert the current active store to ensure at least one record exists
      const { error: upsertError } = await supabase
        .from('store_realtime')
        .upsert({
          warehouse_code: cleanMaKho,
          ten_sieu_thi: cleanStore,
          rt_bi_tong_quan: marketInput,
          rt_nh_cum: categoryInput,
          bc_dt_nganh_hang: categoryRevenueInput,
          updated_at: new Date().toISOString()
        }, { onConflict: 'warehouse_code,ten_sieu_thi' });

      if (upsertError) {
        console.error('[RealtimeData] Upsert error:', upsertError);
        throw upsertError;
      }

      // 2. Then, update all other stores with the same warehouse_code to keep them in sync
      const { error: updateError } = await supabase
        .from('store_realtime')
        .update({
          rt_bi_tong_quan: marketInput,
          rt_nh_cum: categoryInput,
          bc_dt_nganh_hang: categoryRevenueInput,
          updated_at: new Date().toISOString()
        })
        .eq('warehouse_code', cleanMaKho);

      if (updateError) {
        console.warn('[RealtimeData] Global update error (non-critical):', updateError);
      }
      
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
  }, [maKho, activeStore, marketInput, categoryInput, ycxData, categoryRevenueInput, showNotification]);

  // Debounced Auto-save
  useEffect(() => {
    if (!normalizedMaKho || !activeStore) return;
    
    // Skip if we just loaded from DB
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }



    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      // console.log('[RTST] Auto-saving data to DB...');
      saveRealtimeData(true);
    }, 1000); // 1 second debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [marketInput, categoryInput, categoryRevenueInput, normalizedMaKho, activeStore, saveRealtimeData]);

  const loadData = useCallback(async () => {
    if (!normalizedMaKho) return;
    const cleanMaKho = normalizedMaKho;
    const shortMaKho = cleanMaKho;
    const paddedMaKho = shortMaKho.padStart(7, '0');
    
    // Cache-first: Only show loading spinner if we have NO cached data at all
    const hasCachedData = !!(localStorage.getItem(STORAGE_KEYS.MARKET_INPUT) || localStorage.getItem(STORAGE_KEYS.CATEGORY_INPUT));
    if (!hasCachedData) {
      setIsLoadingRealtime(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('store_realtime')
        .select('rt_bi_tong_quan, rt_nh_cum, bc_dt_nganh_hang, ten_sieu_thi, updated_at')
        .or(`warehouse_code.eq.${cleanMaKho},warehouse_code.eq.${shortMaKho},warehouse_code.eq.${paddedMaKho}`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[RTST] Error loading realtime data:', error);
        return;
      }


      if (data && data.length > 0) {
        const record = data[0];
        skipAutoSaveRef.current = true;
        setMarketInput(record.rt_bi_tong_quan || '');
        setCategoryInput(record.rt_nh_cum || '');
        setCategoryRevenueInput(record.bc_dt_nganh_hang || '');
        setActiveStore(record.ten_sieu_thi || maKho);
        if (record.updated_at) setLastUpdated(new Date(record.updated_at));
      } else if (hasCachedData) {
        // Firebase is empty but localStorage has data → auto-sync to Firebase
        console.log('[RTST] Firebase empty, auto-syncing localStorage data to Firebase...');
        setTimeout(() => {
          saveRealtimeData(true); // silent save
          console.log('[RTST] Auto-sync from localStorage to Firebase complete!');
        }, 500);
      }
    } catch (err) {
      console.error('[RTST] Unexpected error in loadData:', err);
    } finally {
      setIsLoadingRealtime(false);
    }
  }, [normalizedMaKho, showNotification]);

  // Handle maKho change
  useEffect(() => {
    if (normalizedMaKho) {
      // console.log(`[RTST] maKho detected: ${normalizedMaKho}. Preparing to load...`);
      loadData();
    } else {
      clearData();
      setActiveStore('');
      setLastUpdated(null);
    }
  }, [normalizedMaKho, loadData, clearData]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!normalizedMaKho) return;

    // console.log(`[RTST] Subscribing to realtime updates for warehouse: ${normalizedMaKho}`);
    
    const channel = supabase
      .channel(`public:store_realtime:warehouse_code=eq.${normalizedMaKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_realtime',
          filter: `warehouse_code=eq.${normalizedMaKho}`
        },
        (payload) => {
          // console.log('[RTST] Realtime update received from DB:', payload);
          if (payload.new) {
            const record = payload.new as any;
            
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
              if (prev !== record.bc_dt_nganh_hang) {
                skipAutoSaveRef.current = true;
                return record.bc_dt_nganh_hang || '';
              }
              return prev;
            });

            if (record.ten_sieu_thi) setActiveStore(record.ten_sieu_thi);
          }
        }
      )
      .subscribe((status) => {
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
      const { data, error } = await supabase
        .from('store_realtime')
        .select('rt_bi_tong_quan, rt_nh_cum, bc_dt_nganh_hang')
        .eq('warehouse_code', normalizedMaKho)
        .eq('ten_sieu_thi', activeStore)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setMarketInput(data.rt_bi_tong_quan || '');
        setCategoryInput(data.rt_nh_cum || '');
        
        setCategoryRevenueInput(data.bc_dt_nganh_hang || '');
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

  return {
    marketInput, setMarketInput,
    categoryInput, setCategoryInput,
    ycxData, setYcxData: updateYcxData,
    categoryRevenueInput, setCategoryRevenueInput,
    activeStore, setActiveStore,
    excludedYcxStaffNames, setExcludedYcxStaffNames,
    processedData,
    isSavingRealtime,
    isLoadingRealtime,
    isProcessingRealtime,
    isYcxDirty,
    lastUpdated,
    processData: handleProcess,
    saveRealtimeData,
    syncRealtimeData,
    loadData,
    clearData
  };
};
