/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { 
  MarketInfo, 
  CategoryData, 
  YcxStaffData,
  STORAGE_KEYS 
} from '../types';
import { 
  parseMarketData, 
  parseCategoryData,
  parseYcxData,
  parseStaffRankData,
  extractSection,
  isValidStoreName,
  normalize,
  safeSetItem
} from '../utils';

export const useLuykeData = (maKho: string) => {
  const { showNotification } = useNotification();
  const [clusterSummaryInput, setClusterSummaryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT) || '');
  const [clusterCategoryInput, setClusterCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT) || '');
  const [staffInput, setStaffInput] = useState(() => localStorage.getItem('BI_REAL_STAF_V1') || '');
  const [staffCategoryInput, setStaffCategoryInput] = useState(() => localStorage.getItem('BI_REAL_SCAT_V1') || '');
  const [staffListInput, setStaffListInput] = useState(() => localStorage.getItem('BI_REAL_STAFF_LIST_V1') || '');
  const [dataPhanCa, setDataPhanCa] = useState<any>(null);
  const [dtGioCong, setDtGioCong] = useState<string>('');
  const [categoryTargets, setCategoryTargets] = useState<any[]>([]);
  const [activeStore, setActiveStore] = useState<string>(maKho);

  useEffect(() => {
    setActiveStore(maKho);
  }, [maKho]);

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
  const skipSubscriptionRef = useRef(false);
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveLuykeData = useCallback(async (isSilent: boolean = false, source: 'staff' | 'targets' | 'auto' = 'auto', storeName?: string, overrideTargets?: any[]) => {
    const cleanMaKho = maKho.trim();
    const cleanStore = (storeName || activeStore || maKho).trim();

    if (!cleanMaKho) {
      if (!isSilent) showNotification('Vui lòng chọn hoặc tải dữ liệu siêu thị trước khi lưu!', 'error');
      return;
    }

    if (source === 'staff') setIsSavingStaff(true);
    if (source === 'targets') setIsSavingTargets(true);
    setIsProcessingSave(true);

    try {
      // 1. Fetch existing data to merge for this SPECIFIC store
      const { data: existingData } = await supabase
        .from('store_luyke')
        .select('lk_bi_tong_quan, lk_nh_sieu_thi, lk_dt_nv, lk_td_nv, ds_nhan_vien, dt_gio_cong, data_phan_ca, category_targets, ten_sieu_thi, warehouse_code, taget_doanh_thu')
        .eq('warehouse_code', cleanMaKho)
        .eq('ten_sieu_thi', cleanStore)
        .maybeSingle();

      const targetsToSave = overrideTargets || categoryTargets;
      // console.log(`[SAVE] Saving ${targetsToSave?.length || 0} category targets for store: ${cleanStore}`);

      // 2. Prepare payload: only update fields that have content, otherwise keep existing
      const payload: any = {
        warehouse_code: cleanMaKho,
        ten_sieu_thi: cleanStore,
        lk_bi_tong_quan: clusterSummaryInput !== undefined ? clusterSummaryInput : existingData?.lk_bi_tong_quan,
        lk_nh_sieu_thi: clusterCategoryInput !== undefined ? clusterCategoryInput : existingData?.lk_nh_sieu_thi,
        lk_dt_nv: staffInput !== undefined ? staffInput : existingData?.lk_dt_nv,
        lk_td_nv: staffCategoryInput !== undefined ? staffCategoryInput : existingData?.lk_td_nv,
        ds_nhan_vien: staffListInput !== undefined ? staffListInput : existingData?.ds_nhan_vien,
        dt_gio_cong: dtGioCong !== undefined ? dtGioCong : existingData?.dt_gio_cong,
        data_phan_ca: dataPhanCa !== undefined ? dataPhanCa : existingData?.data_phan_ca,
        category_targets: targetsToSave,
        taget_doanh_thu: existingData?.taget_doanh_thu || null,
        updated_at: new Date().toISOString()
      };

      // 1. First, upsert the current active store
      const { error: upsertError } = await supabase
        .from('store_luyke')
        .upsert(payload, { onConflict: 'warehouse_code,ten_sieu_thi' });

      if (upsertError) {
        console.error('[LuykeData] Upsert error:', upsertError);
        throw upsertError;
      }

      // 2. Then, update all other stores with the same warehouse_code to keep them in sync
      // We only sync the global background data (BC TỔNG HỢP CỤM, BC NGÀNH HÀNG CỤM)
      // Personnel data (lk_dt_nv, lk_td_nv, ds_nhan_vien) and targets are kept specific to the store
      const globalUpdatePayload = {
        lk_bi_tong_quan: payload.lk_bi_tong_quan,
        lk_nh_sieu_thi: payload.lk_nh_sieu_thi,
        updated_at: payload.updated_at
      };

      const { error: updateError } = await supabase
        .from('store_luyke')
        .update(globalUpdatePayload)
        .eq('warehouse_code', cleanMaKho);

      if (updateError) {
        console.warn('[LuykeData] Global update error (non-critical):', updateError);
      }
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
    }
  }, [maKho, activeStore, clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput, staffListInput, dtGioCong, dataPhanCa, categoryTargets, showNotification]);

  const handleProcess = useCallback((existingTargets?: any[]) => {
    try {
      const inputToParse = extractSection(clusterSummaryInput, "1. BC TỔNG HỢP CỤM");
      const markets = parseMarketData(inputToParse, 0, 'LUYKE');
      const categories = parseCategoryData(clusterCategoryInput, 0, 30, markets, 'LUYKE');
      
      // Filter categories for the active store to ensure targets only apply to the selected store
      const filteredCategories = categories; // Removed filtering logic to display all categories

      // Use parseStaffRankData if it's the "1. DOANH THU NV" report, otherwise fallback to parseYcxData
      const staff = staffInput.includes('1. DOANH THU NV') 
        ? parseStaffRankData(staffInput) 
        : parseYcxData(staffInput);

      setProcessedData({
        markets,
        categories: filteredCategories,
        staff
      });

      // Cập nhật activeStore nếu tìm thấy tên siêu thị hợp lệ trong dữ liệu mới và activeStore hiện tại chưa hợp lệ
      if (markets.length > 0 && markets[0].name) {
        const detectedStore = markets[0].name.trim();
        const currentIsFullStore = isValidStoreName(activeStore);
        
        if (isValidStoreName(detectedStore)) {
          if (!currentIsFullStore || activeStore.match(/^\d+$/)) {
            if (detectedStore !== activeStore) {
              // console.log(`[LuykeData] Detected new store name: ${detectedStore}. Updating activeStore.`);
              setActiveStore(detectedStore);
              // Lưu ngay với tên siêu thị vừa nhận diện được để tránh timing issue của state
              saveLuykeData(true, 'auto', detectedStore);
            }
          }
        }
      }

      // Merge categories with targets
      if (filteredCategories.length > 0) {
        setCategoryTargets(prev => {
          // Use provided targets (from DB) or current state
          // If we are doing the initial load from DB, existingTargets will be provided
          const currentTargets = Array.isArray(existingTargets) ? existingTargets : (Array.isArray(prev) ? prev : []);
          
          const savedGlobalPercent = localStorage.getItem('rtst_global_percent');
          const defaultPercent = savedGlobalPercent ? Number(savedGlobalPercent) : 100;
          
          const percentMap = new Map(currentTargets.map((item: any) => [item.name, item.percent]));
          
          const uniqueParsed = new Map<string, { target: number; type: 'SL' | 'DT' | 'ALL' }>();
          filteredCategories.forEach(p => {
            if (!uniqueParsed.has(p.name)) {
              uniqueParsed.set(p.name, { target: p.target, type: p.type || 'ALL' });
            }
          });

          const newTargets: any[] = [];
          uniqueParsed.forEach((data, name) => {
            const existingPercent = percentMap.get(name);
            // Preserve existing percent if found, otherwise use global default
            const percent = existingPercent !== undefined ? existingPercent : defaultPercent;
            newTargets.push({
              name,
              target: data.target,
              adjustedTarget: data.target * (percent / 100),
              percent,
              type: data.type
            });
          });
          return newTargets;
        });
      } else {
        setCategoryTargets([]);
      }
    } catch (error) {
      console.error('Error processing luyke data:', error);
    }
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, activeStore, saveLuykeData]);

  // Sync to localStorage with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      safeSetItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT, clusterSummaryInput);
      safeSetItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT, clusterCategoryInput);
      safeSetItem('BI_REAL_STAF_V1', staffInput);
      safeSetItem('BI_REAL_SCAT_V1', staffCategoryInput);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput]);

  // Auto-save debounce
  useEffect(() => {
    if (!maKho || !activeStore || !hasLoadedFromDB) return;
    
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveLuykeData(true, 'auto');
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, staffCategoryInput, staffListInput, dataPhanCa, dtGioCong, categoryTargets, maKho, activeStore, hasLoadedFromDB, saveLuykeData]);

  const [isFirstProcess, setIsFirstProcess] = useState(true);

  useEffect(() => {
    // Only auto-process if we've already finished the initial DB load
    // or if there's no maKho (local only mode)
    if (!maKho || hasLoadedFromDB) {
      const delay = isFirstProcess ? 10 : 300;
      const timeoutId = setTimeout(() => {
        handleProcess();
        if (isFirstProcess) setIsFirstProcess(false);
      }, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [clusterSummaryInput, clusterCategoryInput, staffInput, activeStore, hasLoadedFromDB, maKho, isFirstProcess, handleProcess]);

  const [lastLoadedStore, setLastLoadedStore] = useState<string | null>(null);
  const [lastLoadedMaKho, setLastLoadedMaKho] = useState<string | null>(null);

  const loadData = useCallback(async (storeName?: string) => {
    if (!maKho) {
      setIsLoading(false);
      return;
    }
    
    const cleanMaKho = maKho.trim();
    const shortMaKho = cleanMaKho.replace(/^0+/, '');
    const paddedMaKho = shortMaKho.padStart(7, '0');
    const targetStore = storeName || activeStore;
    
    // Prevent redundant loads
    if (lastLoadedMaKho === cleanMaKho && lastLoadedStore === targetStore && hasLoadedFromDB) {
      return;
    }

    setIsLoading(true);
    // console.log(`[LuykeData] loadData: Fetching for maKho: ${cleanMaKho}, store: ${targetStore}`);
    
    try {
      const { data, error } = await supabase
        .from('store_luyke')
        .select('lk_bi_tong_quan, lk_nh_sieu_thi, lk_dt_nv, lk_td_nv, ds_nhan_vien, dt_gio_cong, data_phan_ca, category_targets, ten_sieu_thi')
        .in('warehouse_code', [cleanMaKho, shortMaKho, paddedMaKho])
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error loading luyke data:', error);
        showNotification('Lỗi khi tải dữ liệu Luỹ kế từ Database', 'error');
        return;
      }

      if (data && data.length > 0) {
        // Try to find the specific store, otherwise fallback to the most recently updated one
        let record = data[0];
        if (targetStore && targetStore !== maKho) {
          const normTarget = normalize(targetStore);
          const match = data.find(item => normalize(item.ten_sieu_thi || '') === normTarget);
          if (match) record = match;
        }

        setClusterSummaryInput(record.lk_bi_tong_quan || '');
        setClusterCategoryInput(record.lk_nh_sieu_thi || '');
        setStaffInput(record.lk_dt_nv || '');
        setStaffCategoryInput(record.lk_td_nv || '');
        setStaffListInput(record.ds_nhan_vien || '');
        setDtGioCong(record.dt_gio_cong || '');
        setDataPhanCa(record.data_phan_ca || null);
        
        if (record.category_targets && Array.isArray(record.category_targets)) {
          setCategoryTargets(record.category_targets);
        }
        
        if (record.ten_sieu_thi) setActiveStore(record.ten_sieu_thi);
        
        skipAutoSaveRef.current = true;
        setHasLoadedFromDB(true);
      } else {
        // Firebase is empty, check if localStorage has cached data to auto-sync
        const hasCachedLuyke = !!(
          localStorage.getItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT) || 
          localStorage.getItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT) ||
          localStorage.getItem('BI_REAL_STAF_V1')
        );
        if (hasCachedLuyke) {
          console.log('[LuykeData] Firebase empty, auto-syncing localStorage data to Firebase...');
          setTimeout(() => {
            saveLuykeData(true, 'auto');
            console.log('[LuykeData] Auto-sync from localStorage to Firebase complete!');
          }, 1000);
        }
      }
      
      setLastLoadedMaKho(cleanMaKho);
      setLastLoadedStore(targetStore);
    } finally {
      setIsLoading(false);
      setHasLoadedFromDB(true);
    }
  }, [maKho, showNotification, lastLoadedMaKho, lastLoadedStore, hasLoadedFromDB]);

  // Only reload when maKho actually changes, not on every activeStore update
  useEffect(() => {
    if (maKho) loadData();
  }, [maKho]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up Supabase Realtime subscription for store_luyke
  useEffect(() => {
    if (!maKho) return;

    // console.log(`[LuykeData] Subscribing to realtime updates for warehouse: ${maKho}`);
    
    const channel = supabase
      .channel(`public:store_luyke:warehouse_code=eq.${maKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_luyke',
          filter: `warehouse_code=eq.${maKho}`
        },
        (payload) => {
          // console.log('[LuykeData] Realtime update received from DB:', payload);
          if (skipSubscriptionRef.current) {
            skipSubscriptionRef.current = false;
            return;
          }
          if (payload.new) {
            const record = payload.new as any;
            
            // Update inputs only if they are different to avoid loops
            setClusterSummaryInput((prev: string) => {
              if (prev !== record.lk_bi_tong_quan) {
                skipAutoSaveRef.current = true;
                return record.lk_bi_tong_quan || '';
              }
              return prev;
            });
            setClusterCategoryInput((prev: string) => {
              if (prev !== record.lk_nh_sieu_thi) {
                skipAutoSaveRef.current = true;
                return record.lk_nh_sieu_thi || '';
              }
              return prev;
            });
            setStaffInput((prev: string) => {
              if (prev !== record.lk_dt_nv) {
                skipAutoSaveRef.current = true;
                return record.lk_dt_nv || '';
              }
              return prev;
            });
            setStaffCategoryInput((prev: string) => {
              if (prev !== record.lk_td_nv) {
                skipAutoSaveRef.current = true;
                return record.lk_td_nv || '';
              }
              return prev;
            });
            setStaffListInput((prev: string) => {
              if (prev !== record.ds_nhan_vien) {
                skipAutoSaveRef.current = true;
                return record.ds_nhan_vien || '';
              }
              return prev;
            });
            setDtGioCong((prev: string) => {
              if (prev !== record.dt_gio_cong) {
                skipAutoSaveRef.current = true;
                return record.dt_gio_cong || '';
              }
              return prev;
            });
            setDataPhanCa((prev: any) => {
              if (JSON.stringify(prev) !== JSON.stringify(record.data_phan_ca)) {
                skipAutoSaveRef.current = true;
                return record.data_phan_ca || null;
              }
              return prev;
            });
            
            if (record.category_targets && Array.isArray(record.category_targets)) {
              setCategoryTargets(record.category_targets);
            } else if (record.category_targets === null) {
              setCategoryTargets([]);
            }
            
            if (record.ten_sieu_thi) setActiveStore(record.ten_sieu_thi);
          }
        }
      )
      .subscribe();

    return () => {
      // console.log(`[LuykeData] Unsubscribing from realtime updates for ${maKho}`);
      supabase.removeChannel(channel);
    };
  }, [maKho]);

  const syncFromRealtime = useCallback(async () => {
    if (!maKho) return;
    
    // 1. Get from realtime
    const { data: rtData, error: rtError } = await supabase
      .from('store_realtime')
      .select('rt_bi_tong_quan')
      .eq('warehouse_code', maKho)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (rtError || !rtData || rtData.length === 0) {
      showNotification('Không tìm thấy dữ liệu Realtime để đồng bộ.', 'error');
      return;
    }

    // 2. Update luyke
    const { error: lkError } = await supabase
      .from('store_luyke')
      .upsert({
        warehouse_code: maKho,
        ten_sieu_thi: activeStore,
        lk_bi_tong_quan: rtData[0].rt_bi_tong_quan,
        updated_at: new Date().toISOString()
      }, { onConflict: 'warehouse_code,ten_sieu_thi' });

    if (lkError) {
      showNotification('Lỗi đồng bộ dữ liệu: ' + lkError.message, 'error');
      return;
    }

    setClusterSummaryInput(rtData[0].rt_bi_tong_quan || '');
    handleProcess();
  }, [maKho, activeStore, handleProcess, showNotification]);

  return {
    clusterSummaryInput, setClusterSummaryInput,
    clusterCategoryInput, setClusterCategoryInput,
    staffInput, setStaffInput,
    staffCategoryInput, setStaffCategoryInput,
    staffListInput, setStaffListInput,
    dataPhanCa, setDataPhanCa,
    dtGioCong, setDtGioCong,
    categoryTargets, setCategoryTargets,
    processedData,
    isProcessingSave,
    isSavingStaff,
    isSavingTargets,
    isLoading,
    processData: handleProcess,
    saveLuykeData,
    syncFromRealtime,
    loadData,
    setActiveStore,
    clearField: (setter: (val: string) => void) => {
      skipSubscriptionRef.current = true;
      setter('');
    }
  };
};
