/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { 
  MarketInfo, 
  CategoryData, 
  StaffData, 
  YcxStaffData, 
  YcxRankData,
  STORAGE_KEYS 
} from '../types';
import { 
  parseMarketData, 
  parseCategoryData, 
  parseYcxData,
  parseYcxRankData,
  normalize,
  safeSetItem
} from '../utils';

export const useRTSTData = (maKho: string, pageType: 'RTST' | 'LUYKE' = 'RTST') => {
  const { userProfile } = useAuth();
  const { showNotification } = useNotification();
  const [marketInput, setMarketInput] = useState(() => localStorage.getItem(STORAGE_KEYS.MARKET_INPUT) || '');
  const [staffInput, setStaffInput] = useState(() => localStorage.getItem('BI_REAL_STAF_V1') || '');
  const [categoryInput, setCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CATEGORY_INPUT) || '');
  const [staffCategoryInput, setStaffCategoryInput] = useState(() => localStorage.getItem('BI_REAL_SCAT_V1') || '');
  const [manualAdjustment, setManualAdjustment] = useState(() => Number(localStorage.getItem('BI_REAL_ADJUST_V1')) || 0);
  const [ycxData, setYcxData] = useState(() => localStorage.getItem(STORAGE_KEYS.YCX_DATA) || '');
  const [ycxFileName, setYcxFileName] = useState(() => localStorage.getItem(STORAGE_KEYS.YCX_FILE_NAME) || '');
  const [linkBcTongHop, setLinkBcTongHop] = useState(() => localStorage.getItem(STORAGE_KEYS.LINK_BC_TONG_HOP) || '');
  const [linkNganhHangTongHop, setLinkNganhHangTongHop] = useState(() => localStorage.getItem(STORAGE_KEYS.LINK_NGANH_HANG_TONG_HOP) || '');
  const [clusterSummaryInput, setClusterSummaryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT) || '');
  const [clusterCategoryInput, setClusterCategoryInput] = useState(() => localStorage.getItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT) || '');
  const [staffListInput, setStaffListInput] = useState(() => localStorage.getItem('BI_REAL_STAFF_LIST_V1') || '');
  const [staffListFileName, setStaffListFileName] = useState(() => localStorage.getItem('BI_REAL_STAFF_LIST_FILE_V1') || '');
  const [storeSettings, setStoreSettings] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('BI_REAL_STORE_SETTINGS_V1');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeStore, setActiveStore] = useState<string>(maKho);

  useEffect(() => {
    setActiveStore(maKho);
  }, [maKho]);
  
  const updateStoreSetting = useCallback((category: string, key: string, value: any) => {
    setStoreSettings(prev => ({
      ...prev,
      [activeStore]: {
        ...(prev[activeStore] || {}),
        [category]: {
          ...(prev[activeStore]?.[category] || {}),
          [key]: value
        }
      }
    }));
  }, [activeStore]);

  const sanitize = (val: string) => {
    if (!val) return '';
    // Supabase/PostgREST handles escaping automatically.
    // Manual escaping with backslashes will result in literal backslashes in the database.
    // We only need to remove null characters.
    return val.replace(/\0/g, '');
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('BI_REAL_SEL_MONTH_V1');
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [daysPassed, setDaysPassed] = useState(() => {
    const now = new Date();
    let d = now.getDate() - 1;
    return d < 1 ? 1 : d;
  });

  const [totalDays, setTotalDays] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  });

  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('BI_REAL_EXCLUDED_V1');
    return saved ? JSON.parse(saved) : [];
  });

  const [excludedYcxStaffNames, setExcludedYcxStaffNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('BI_REAL_EXCLUDED_YCX_V1');
    return saved ? JSON.parse(saved) : [];
  });

  const [processedData, setProcessedData] = useState<{
    markets: MarketInfo[];
    catData: CategoryData[];
    ycxStaffData: YcxStaffData[];
    ycxRankData: YcxRankData[];
  }>({
    markets: [],
    catData: [],
    ycxStaffData: [],
    ycxRankData: []
  });

  const [isProcessingRealtime, setIsProcessingRealtime] = useState(false);
  const [isProcessingCluster, setIsProcessingCluster] = useState(false);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  // Auto-calculate days passed and total days when month changes
  useEffect(() => {
    if (!selectedMonth) return;

    const [y, m] = selectedMonth.split('-').map(Number);
    const total = new Date(y, m, 0).getDate();
    setTotalDays(total);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    if (y < currentYear || (y === currentYear && m < currentMonth)) {
      // Past month
      setDaysPassed(total);
    } else if (y === currentYear && m === currentMonth) {
      // Current month
      setDaysPassed(Math.max(0, currentDay - 1));
    } else {
      // Future month
      setDaysPassed(0);
    }
  }, [selectedMonth]);

  const handleProcess = useCallback(() => {
    setIsProcessingSave(true);
    console.log('[DEBUG] handleProcess called');
    console.log('[DEBUG] Inputs:', { marketInput, staffInput, categoryInput, staffCategoryInput, clusterSummaryInput, clusterCategoryInput, ycxData });
    try {
      console.log('[DEBUG] handleProcess: Starting parsing');
      // Prioritize source based on pageType
      const inputSource = pageType === 'LUYKE' 
        ? (clusterSummaryInput || marketInput) 
        : (marketInput || clusterSummaryInput);
      let markets = parseMarketData(inputSource, manualAdjustment, pageType);
      console.log('[DEBUG] Parsed Markets:', markets);
      
      if (!markets || markets.length === 0) {
        console.warn('[DEBUG] handleProcess: No markets parsed');
      }
      
      // Sync totalTarget from clusterSummaryInput if available
      if (clusterSummaryInput && activeStore) {
        const lines = clusterSummaryInput.split('\n');
        for (const line of lines) {
          const normalizedLine = line.trim().toUpperCase();
          const normalizedActiveStore = activeStore.trim().toUpperCase();
          
          if (normalizedLine.includes(normalizedActiveStore)) {
            const cols = line.split('\t');
            
            // Based on the image:
            // Column 0: Tên siêu thị
            // Column 3: Target (QĐ) - index 3
            // Column 4: DT Quy Đổi (DTQĐ) - index 4
            // Column 5: % HT Target (QĐ) - index 5
            
            const targetQd = parseFloat(cols[3]?.replace(/[^\d]/g, '')) || 0;
            const dtQd = parseFloat(cols[4]?.replace(/[^\d]/g, '')) || 0;
            const phanTramHtTargetQd = parseFloat(cols[5]?.replace(/[^\d.]/g, '')) || 0;
            
            if (targetQd > 0) {
              updateStoreSetting('totalTarget', 'original', targetQd);
            }
            if (dtQd > 0) {
              updateStoreSetting('totalTarget', 'dt_du_kien_qd', dtQd);
            }
            if (phanTramHtTargetQd > 0) {
              updateStoreSetting('totalTarget', 'phan_tram_ht_target_qd', phanTramHtTargetQd);
            }
            break;
          }
        }
      }
      markets = markets.map(m => {
        const settings = storeSettings[m.name];
        if (settings && settings.totalTarget) {
          // Prioritize explicit target from BI data if found
          const baseTarget = (m.isExplicitTarget || !settings.totalTarget.original || settings.totalTarget.original <= 0)
            ? m.targetST
            : settings.totalTarget.original;
          
          const multiplier = (settings.totalTarget.percent || 100) / 100;
          const newTarget = baseTarget * multiplier;
          
          return {
            ...m,
            targetST: newTarget,
            percentHT: newTarget > 0 ? ((m.actualVirtual || 0) / newTarget) * 100 : 0
          };
        }
        return m;
      });

      const catInputSource = pageType === 'LUYKE'
        ? (clusterCategoryInput || categoryInput)
        : (categoryInput || clusterCategoryInput);
      let catData = parseCategoryData(catInputSource, daysPassed, totalDays, markets);
      
      // Apply store-specific competition target overrides
      catData = catData.map(c => {
        const settings = c.marketName ? storeSettings[c.marketName] : undefined;
        if (settings && settings.competitionTarget) {
          const comp = settings.competitionTarget;
          let multiplier = 1;
          let baseTarget = c.target;
          const nameLower = c.name.toLowerCase();
          
          if (nameLower.includes('sim')) {
            if (comp.sim?.original && comp.sim.original > 0) baseTarget = comp.sim.original;
            multiplier = (comp.sim?.percent || 100) / 100;
          } else if (nameLower.includes('phụ kiện')) {
            if (comp.phuKien?.original && comp.phuKien.original > 0) baseTarget = comp.phuKien.original;
            multiplier = (comp.phuKien?.percent || 100) / 100;
          } else if (nameLower.includes('gia dụng')) {
            if (comp.giaDung?.original && comp.giaDung.original > 0) baseTarget = comp.giaDung.original;
            multiplier = (comp.giaDung?.percent || 100) / 100;
          } else if (nameLower.includes('điện máy')) {
            if (comp.dienMay?.original && comp.dienMay.original > 0) baseTarget = comp.dienMay.original;
            multiplier = (comp.dienMay?.percent || 100) / 100;
          } else if (nameLower.includes('bảo hiểm')) {
            if (comp.baoHiem?.original && comp.baoHiem.original > 0) baseTarget = comp.baoHiem.original;
            multiplier = (comp.baoHiem?.percent || 100) / 100;
          }
          
          if (multiplier !== 1 || baseTarget !== c.target) {
            const newTarget = baseTarget * multiplier;
            return {
              ...c,
              target: newTarget,
              rate: newTarget > 0 ? ((c.actual || 0) / newTarget) * 100 : 0
            };
          }
        }
        return c;
      });

      const ycxStaffData = parseYcxData(ycxData);
      console.log('[DEBUG] Parsed YcxStaffData:', ycxStaffData);
      const ycxRankData = parseYcxRankData(ycxData);
      console.log('[DEBUG] Parsed YcxRankData:', ycxRankData);

      setProcessedData({
        markets,
        catData,
        ycxStaffData,
        ycxRankData
      });
      console.log('[DEBUG] ProcessedData updated');
    } catch (error) {
      console.error('Error processing data:', error);
    } finally {
      setIsProcessingSave(false);
    }
  }, [marketInput, staffInput, categoryInput, staffCategoryInput, clusterSummaryInput, clusterCategoryInput, manualAdjustment, ycxData, daysPassed, totalDays, storeSettings, pageType]);

  const syncData = useCallback(async () => {
    if (!maKho) {
      console.warn('[SYNC] Không có mã kho để đồng bộ.');
      return false;
    }
    
    console.log('[SYNC] Bắt đầu đồng bộ dữ liệu cho mã kho:', maKho, 'siêu thị hiện tại:', activeStore);
    setIsProcessingSave(true);
    try {
      // 1. Thử tìm bản ghi khớp cả mã kho và tên siêu thị
      let { data: existingData, error } = await supabase
        .from('store_data')
        .select('id, warehouse_code, ten_sieu_thi, rt_bi_tong_quan, lk_bi_tong_quan, lk_dt_nv, lk_td_nv, ds_nhan_vien, rt_nh_cum, lk_nh_sieu_thi, store_settings, updated_at')
        .eq('warehouse_code', maKho)
        .eq('ten_sieu_thi', activeStore)
        .order('updated_at', { ascending: false })
        .limit(1);

      let data = existingData && existingData.length > 0 ? existingData[0] : null;

      if (error) {
        console.error('[SYNC] Lỗi khi fetch dữ liệu từ Supabase:', error);
        throw error;
      }

      // 2. Fallback: Nếu không tìm thấy, tìm bản ghi mới nhất cho mã kho này bất kể tên siêu thị
      if (!data) {
        console.log('[SYNC] Không tìm thấy bản ghi khớp cả mã kho và tên siêu thị. Thử tìm theo mã kho...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('store_data')
          .select('id, warehouse_code, ten_sieu_thi, rt_bi_tong_quan, lk_bi_tong_quan, lk_dt_nv, lk_td_nv, ds_nhan_vien, rt_nh_cum, lk_nh_sieu_thi, store_settings, updated_at')
          .eq('warehouse_code', maKho)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        const fallbackRecord = fallbackData && fallbackData.length > 0 ? fallbackData[0] : null;
        
        if (fallbackError) {
          console.error('[SYNC] Lỗi khi fallback fetch:', fallbackError);
        } else if (fallbackRecord) {
          console.log('[SYNC] Tìm thấy bản ghi fallback:', fallbackRecord.ten_sieu_thi);
          data = fallbackRecord;
          // Cập nhật activeStore để khớp với bản ghi hiện có
          if (data.ten_sieu_thi && data.ten_sieu_thi !== activeStore) {
            console.log('[SYNC] Cập nhật activeStore thành:', data.ten_sieu_thi);
            setActiveStore(data.ten_sieu_thi);
          }
        }
      }

      console.log('[SYNC] Dữ liệu cuối cùng để đồng bộ:', data?.ten_sieu_thi || 'null');

      if (data) {
        console.log('[SYNC] Data found, updating inputs...');
        if (data.rt_bi_tong_quan !== undefined) setMarketInput(data.rt_bi_tong_quan || '');
        if (data.lk_bi_tong_quan !== undefined) setClusterSummaryInput(data.lk_bi_tong_quan || '');
        if (data.lk_dt_nv !== undefined) setStaffInput(data.lk_dt_nv || '');
        if (data.lk_td_nv !== undefined) setStaffCategoryInput(data.lk_td_nv || '');
        if (data.ds_nhan_vien !== undefined) setStaffListInput(data.ds_nhan_vien || '');
        if (data.rt_nh_cum !== undefined) setCategoryInput(data.rt_nh_cum || '');
        if (data.lk_nh_sieu_thi !== undefined) setClusterCategoryInput(data.lk_nh_sieu_thi || '');
        
        // Cập nhật store settings từ dữ liệu đã lưu
        if (data.store_settings) {
          setStoreSettings(data.store_settings);
        }
        
        // Trigger re-process after sync
        console.log('[SYNC] Đang kích hoạt xử lý lại dữ liệu...');
        setTimeout(handleProcess, 100);
        return true;
      }
      console.log('[SYNC] Không tìm thấy bất kỳ dữ liệu nào cho mã kho:', maKho);
      return false;
    } catch (error) {
      console.error('[SYNC] Lỗi hệ thống trong quá trình đồng bộ:', error);
      return false;
    } finally {
      console.log('[SYNC] Kết thúc quá trình đồng bộ.');
      setIsProcessingSave(false);
    }
  }, [maKho, activeStore, handleProcess]);

  const performSave = useCallback(async (payload: any, type: string) => {
    if (!maKho || !activeStore) {
      const errorMsg = 'Không tìm thấy mã kho hoặc tên siêu thị để lưu dữ liệu.';
      console.error(`[SAVE ${type}]`, errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`[SAVE ${type}] Bắt đầu lưu cho:`, maKho, '-', activeStore);
    
    // Sanitize all string values in payload
    const sanitizedPayload: any = {
      warehouse_code: maKho,
      ten_sieu_thi: activeStore,
      updated_at: new Date().toISOString()
    };

    Object.keys(payload).forEach(key => {
      const val = payload[key];
      sanitizedPayload[key] = typeof val === 'string' ? sanitize(val) : val;
    });

    try {
      const cleanMaKho = maKho.trim();
      if (!cleanMaKho) {
        throw new Error('Mã kho không hợp lệ.');
      }

      // 1. Lấy tất cả bản ghi cho mã kho này để merge và xoá dữ liệu cũ bị trùng
      const { data: existingRecords } = await supabase
        .from('store_data')
        .select('id, warehouse_code, ten_sieu_thi, rt_bi_tong_quan, lk_bi_tong_quan, lk_dt_nv, lk_td_nv, ds_nhan_vien, rt_nh_cum, lk_nh_sieu_thi, store_settings, updated_at')
        .eq('warehouse_code', cleanMaKho)
        .order('updated_at', { ascending: false })
        .limit(200);

      const latestData = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

      // Xoá các bản ghi cũ bị trùng lặp (nếu có)
      if (existingRecords && existingRecords.length > 1) {
        const idsToDelete = existingRecords.slice(1).map(record => record.id);
        console.log(`[SAVE ${type}] Xoá ${idsToDelete.length} bản ghi cũ bị trùng lặp cho mã kho ${cleanMaKho}`);
        await supabase
          .from('store_data')
          .delete()
          .in('id', idsToDelete);
      }

      // 2. Chuẩn bị payload gộp (merge dữ liệu cũ và mới)
      const mergedData: any = {
        ...(latestData || {}),
        ...sanitizedPayload,
        warehouse_code: cleanMaKho,
        updated_at: new Date().toISOString()
      };

      let error;
      if (latestData && latestData.id) {
        console.log(`[SAVE ${type}] Cập nhật bản ghi ID: ${latestData.id} cho mã kho ${cleanMaKho}`);
        const res = await supabase
          .from('store_data')
          .update(mergedData)
          .eq('id', latestData.id);
        error = res.error;
      } else {
        console.log(`[SAVE ${type}] Thử tạo bản ghi mới cho mã kho ${cleanMaKho}`);
        delete mergedData.id;
        const res = await supabase
          .from('store_data')
          .insert(mergedData);
        
        // 3. Xử lý lỗi Duplicate Key (Trường hợp bản ghi đã tồn tại nhưng select không thấy)
        if (res.error && (res.error.code === '23505' || res.error.message.includes('duplicate key'))) {
          console.log(`[SAVE ${type}] Bản ghi đã tồn tại, chuyển sang cập nhật theo mã kho...`);
          const retryRes = await supabase
            .from('store_data')
            .update(mergedData)
            .eq('warehouse_code', cleanMaKho);
          error = retryRes.error;
        } else {
          error = res.error;
        }
      }

      if (error) throw error;
      
      return true;
    } catch (error: any) {
      console.error(`[SAVE ${type}] Lỗi:`, error);
      throw error;
    }
  }, [maKho, activeStore, sanitize]);

  const saveStaffListOnly = useCallback(async (staffListData: string) => {
    try {
      await performSave({ ds_nhan_vien: staffListData }, 'STAFF_LIST');
      showNotification('Dữ liệu DS Nhân viên đã được cập nhật!', 'success');
    } catch (error) {
      showNotification(`Lỗi lưu dữ liệu DS Nhân viên: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [performSave, showNotification]);

  const handleStaffListUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setStaffListFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      setStaffListInput(text);
      await saveStaffListOnly(text);
    };
    reader.readAsText(file);
  }, [saveStaffListOnly]);

  const saveRealtimeData = useCallback(async () => {
    setIsProcessingRealtime(true);
    try {
      await performSave({
        rt_bi_tong_quan: marketInput || '',
        rt_nh_cum: categoryInput || ''
      }, 'RT');
      
      showNotification('Dữ liệu Realtime đã được cập nhật!', 'success');
      await syncData();
    } catch (error: any) {
      throw error;
    } finally {
      setIsProcessingRealtime(false);
    }
  }, [performSave, marketInput, categoryInput, ycxData, syncData, showNotification]);

  const saveClusterData = useCallback(async () => {
    setIsProcessingCluster(true);
    try {
      await performSave({
        lk_bi_tong_quan: clusterSummaryInput || '',
        lk_nh_sieu_thi: clusterCategoryInput || ''
      }, 'CLUSTER');
      
      showNotification('Dữ liệu Cụm đã được cập nhật!', 'success');
      await syncData();
    } catch (error: any) {
      throw error;
    } finally {
      setIsProcessingCluster(false);
    }
  }, [performSave, clusterSummaryInput, clusterCategoryInput, syncData, showNotification]);

  const saveData = useCallback(async () => {
    setIsProcessingSave(true);
    try {
      await performSave({
        username: userProfile?.username || '',
        password: userProfile?.password || '',
        rt_bi_tong_quan: marketInput || '',
        rt_nh_cum: categoryInput || '',
        lk_bi_tong_quan: clusterSummaryInput || '',
        lk_nh_sieu_thi: clusterCategoryInput || '',
        lk_dt_nv: staffInput || '',
        lk_td_nv: staffCategoryInput || '',
        ds_nhan_vien: staffListInput || ''
      }, 'FULL');
      
      showNotification(`Dữ liệu cho ${activeStore} đã được cập nhật!`, 'success');
      await syncData();
    } catch (error: any) {
      showNotification(`Lỗi lưu dữ liệu: ${error.message}`, 'error');
    } finally {
      setIsProcessingSave(false);
    }
  }, [performSave, userProfile, marketInput, staffInput, categoryInput, staffCategoryInput, clusterSummaryInput, clusterCategoryInput, staffListInput, ycxData, syncData, showNotification, activeStore]);

  const clearData = useCallback(() => {
    setMarketInput('');
    setStaffInput('');
    setCategoryInput('');
    setStaffCategoryInput('');
    setYcxData('');
    setYcxFileName('');
    setLinkBcTongHop('');
    setLinkNganhHangTongHop('');
    setClusterSummaryInput('');
    setClusterCategoryInput('');
    setStaffListInput('');
    setStaffListFileName('');
    setStoreSettings({});
    setProcessedData({
      markets: [],
      catData: [],
      ycxStaffData: [],
      ycxRankData: []
    });
    localStorage.clear(); // Clear all for fresh start
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.MARKET_INPUT, marketInput);
    safeSetItem('BI_REAL_STAF_V1', staffInput);
    safeSetItem(STORAGE_KEYS.CATEGORY_INPUT, categoryInput);
    safeSetItem('BI_REAL_SCAT_V1', staffCategoryInput);
    safeSetItem('BI_REAL_ADJUST_V1', manualAdjustment.toString());
    safeSetItem(STORAGE_KEYS.YCX_DATA, ycxData);
    safeSetItem(STORAGE_KEYS.YCX_FILE_NAME, ycxFileName);
    safeSetItem(STORAGE_KEYS.LINK_BC_TONG_HOP, linkBcTongHop);
    safeSetItem(STORAGE_KEYS.LINK_NGANH_HANG_TONG_HOP, linkNganhHangTongHop);
    safeSetItem(STORAGE_KEYS.CLUSTER_SUMMARY_INPUT, clusterSummaryInput);
    safeSetItem(STORAGE_KEYS.CLUSTER_CATEGORY_INPUT, clusterCategoryInput);
    safeSetItem('BI_REAL_STAFF_LIST_V1', staffListInput);
    safeSetItem('BI_REAL_STAFF_LIST_FILE_V1', staffListFileName);
    safeSetItem('BI_REAL_STORE_SETTINGS_V1', JSON.stringify(storeSettings));
    safeSetItem('BI_REAL_SEL_MONTH_V1', selectedMonth);
    safeSetItem('BI_REAL_EXCLUDED_V1', JSON.stringify(excludedStaffIds));
    safeSetItem('BI_REAL_EXCLUDED_YCX_V1', JSON.stringify(excludedYcxStaffNames));
  }, [marketInput, staffInput, categoryInput, staffCategoryInput, manualAdjustment, ycxData, ycxFileName, linkBcTongHop, linkNganhHangTongHop, clusterSummaryInput, clusterCategoryInput, staffListInput, staffListFileName, selectedMonth, excludedStaffIds, excludedYcxStaffNames]);

  // Initial sync and process on mount
  useEffect(() => {
    if (maKho) {
      syncData().then(() => {
        handleProcess();
      });
    } else if (marketInput || staffInput || categoryInput) {
      handleProcess();
    }
  }, [maKho]); // Only run once on mount or when maKho changes initially

  const displayData = useMemo(() => {
    const visibleStaffRaw = processedData.ycxStaffData.filter(s => !excludedYcxStaffNames.includes(s.staffName));
    const visibleStaffCount = visibleStaffRaw.length;

    // We still need to calculate targetPerStaff based on visible staff
    const totalMarketTarget = processedData.markets.reduce((acc, m) => acc + m.targetST, 0);
    const targetPerStaff = visibleStaffCount > 0 ? totalMarketTarget / visibleStaffCount : 0;

    return {
      markets: processedData.markets,
      categories: processedData.catData,
      staff: processedData.ycxStaffData,
      ycxRankData: processedData.ycxRankData,
    };
  }, [processedData, excludedStaffIds, excludedYcxStaffNames, daysPassed, totalDays]);

  return {
    marketInput, setMarketInput,
    staffInput, setStaffInput,
    categoryInput, setCategoryInput,
    staffCategoryInput, setStaffCategoryInput,
    manualAdjustment, setManualAdjustment,
    ycxData, setYcxData,
    ycxFileName, setYcxFileName,
    linkBcTongHop, setLinkBcTongHop,
    linkNganhHangTongHop, setLinkNganhHangTongHop,
    clusterSummaryInput, setClusterSummaryInput,
    clusterCategoryInput, setClusterCategoryInput,
    staffListInput, setStaffListInput,
    staffListFileName, setStaffListFileName,
    selectedMonth, setSelectedMonth,
    daysPassed, setDaysPassed,
    totalDays, setTotalDays,
    excludedStaffIds, setExcludedStaffIds,
    excludedYcxStaffNames, setExcludedYcxStaffNames,
    storeSettings, setStoreSettings,
    activeStore, setActiveStore,
    displayData,
    isProcessingRealtime,
    isProcessingCluster,
    isProcessingSave,
    processData: handleProcess,
    syncData,
    saveData,
    saveRealtimeData,
    saveClusterData,
    handleStaffListUpload,
    clearData
  };
};
