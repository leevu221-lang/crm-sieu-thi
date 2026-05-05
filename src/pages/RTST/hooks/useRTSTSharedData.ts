/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEYS } from '../types';
import { supabase } from '../../../supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { isValidStoreName as isValidStoreNameUtil, normalize, safeSetItem } from '../utils';

export const useRTSTSharedData = (maKho?: string, isYcxDirty = localStorage.getItem('RTST_YCX_DIRTY') === 'true') => {
  const { showNotification } = useNotification();
  const [manualAdjustment, setManualAdjustment] = useState(() => Number(localStorage.getItem('BI_REAL_ADJUST_V1')) || 0);
  const [ycxFileName, setYcxFileName] = useState(() => localStorage.getItem(STORAGE_KEYS.YCX_FILE_NAME) || '');
  const [linkBcTongHop, setLinkBcTongHop] = useState(() => localStorage.getItem(STORAGE_KEYS.LINK_BC_TONG_HOP) || '');
  const [linkNganhHangTongHop, setLinkNganhHangTongHop] = useState(() => localStorage.getItem(STORAGE_KEYS.LINK_NGANH_HANG_TONG_HOP) || '');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('BI_REAL_SEL_MONTH_V1');
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [daysPassed, setDaysPassed] = useState(() => {
    const saved = localStorage.getItem('BI_REAL_DAYS_PASSED_V1');
    if (saved) return Number(saved);
    const now = new Date();
    let d = now.getDate() - 1;
    return d < 1 ? 1 : d;
  });
  const [totalDays, setTotalDays] = useState(() => {
    const saved = localStorage.getItem('BI_REAL_TOTAL_DAYS_V1');
    if (saved) return Number(saved);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  });
  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('BI_REAL_EXCLUDED_V1');
    return saved ? JSON.parse(saved) : [];
  });
  const [storeSettings, setStoreSettings] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('BI_REAL_STORE_SETTINGS_V1');
    return saved ? JSON.parse(saved) : {};
  });
  const [staffListFileName, setStaffListFileName] = useState(() => localStorage.getItem('BI_REAL_STAFF_LIST_FILE_V1') || '');
  const [stName, setStName] = useState(() => localStorage.getItem('ST_NAME_V1') || '');
  const [stDtlk, setStDtlk] = useState(() => Number(localStorage.getItem('ST_DTLK_V1')) || 0);
  const [stDtqd, setStDtqd] = useState(() => Number(localStorage.getItem('ST_DTQD_V1')) || 0);
  const [stDtDuKienQD, setStDtDuKienQD] = useState(() => Number(localStorage.getItem('ST_DT_DU_KIEN_QD_V1')) || 0);
  const [stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD] = useState(() => Number(localStorage.getItem('ST_PERCENT_HT_TARGET_DU_KIEN_QD_V1')) || 0);
  const [stTargetQuyDoi, setStTargetQuyDoi] = useState(() => Number(localStorage.getItem('ST_TARGET_QUY_DOI_V1')) || 0);
  const [stPercentTarget, setStPercentTarget] = useState(() => {
    const saved = localStorage.getItem('ST_PERCENT_TARGET_V1');
    return saved !== null ? Number(saved) : 100;
  });
  const [stTargetSauHeSo, setStTargetSauHeSo] = useState(() => Number(localStorage.getItem('ST_TARGET_SAU_HE_SO_V1')) || 0);
  const [allStoreTargets, setAllStoreTargets] = useState<Record<string, any>>({});
  const [isSavingStoreRevenue, setIsSavingStoreRevenue] = useState(false);
  const [isLoadingStoreRevenue, setIsLoadingStoreRevenue] = useState(false);
  const [lastLoadedMaKho, setLastLoadedMaKho] = useState<string | null>(null);

  // Set up Supabase Realtime subscription for store_luyke shared settings
  useEffect(() => {
    if (!maKho) return;

    console.log(`[SharedData] Subscribing to realtime updates for warehouse: ${maKho}`);
    
    const channel = supabase
      .channel(`public:store_luyke_shared:warehouse_code=eq.${maKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_luyke',
          filter: `warehouse_code=eq.${maKho}`
        },
        (payload) => {
          console.log('[SharedData] Realtime update received:', payload);
          if (payload.new) {
            const record = payload.new as any;
            const settings = record.taget_doanh_thu;
            const storeName = record.ten_sieu_thi;
            
            if (storeName && settings) {
              // Update the map of all targets
              setAllStoreTargets(prev => ({
                ...prev,
                [storeName.toUpperCase()]: {
                  ...settings,
                  warehouse_code: record.warehouse_code
                }
              }));
              
              // If this record matches our current active store, update top-level state
              // Use robust normalization for matching
              const normActive = normalize(stName || localStorage.getItem('ST_NAME_V1') || '');
              const normUpdate = normalize(storeName);
              
              if (normUpdate && normActive && (normUpdate === normActive || normUpdate.includes(normActive) || normActive.includes(normUpdate))) {
                console.log('[SharedData] Updating active store state from realtime:', storeName);
                if (settings.stName) setStName(settings.stName);
                if (settings.stTargetSauHeSo !== undefined) setStTargetSauHeSo(settings.stTargetSauHeSo);
                if (settings.stTargetQuyDoi !== undefined) setStTargetQuyDoi(settings.stTargetQuyDoi);
                if (settings.stPercentTarget !== undefined) setStPercentTarget(settings.stPercentTarget);
                if (settings.stDtDuKienQD !== undefined) setStDtDuKienQD(settings.stDtDuKienQD);
                if (settings.stPercentHTTargetDuKienQD !== undefined) setStPercentHTTargetDuKienQD(settings.stPercentHTTargetDuKienQD);
                if (settings.stDtlk !== undefined) setStDtlk(settings.stDtlk);
                if (settings.stDtqd !== undefined) setStDtqd(settings.stDtqd);
                if (settings.manualAdjustment !== undefined) setManualAdjustment(settings.manualAdjustment);
                if (settings.selectedMonth) setSelectedMonth(settings.selectedMonth);
                if (settings.daysPassed !== undefined) setDaysPassed(settings.daysPassed);
                if (settings.totalDays !== undefined) setTotalDays(settings.totalDays);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`[SharedData] Unsubscribing from realtime updates for ${maKho}`);
      supabase.removeChannel(channel);
    };
  }, [maKho, stName]);

  const VALID_STORE_PREFIXES = ['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR', 'DML', 'DMM', 'DMS', 'DMS3', 'ÐML', 'ÐMM', 'ÐMS', 'ÐMS3'];
  const PRETTY_PREFIXES = ['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR'];

  const isValidStoreName = useCallback((name: string) => {
    return isValidStoreNameUtil(name);
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const total = new Date(year, month, 0).getDate();
    setTotalDays(total);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    // Logic: Nếu tháng báo cáo < tháng hiện tại thì ngày đã qua = tổng ngày
    // Ngược lại (tháng báo cáo >= tháng hiện tại) thì ngày đã qua = ngày hiện tại - 1
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setDaysPassed(total);
    } else {
      let d = currentDay - 1;
      if (d < 1) d = 1;
      setDaysPassed(d);
    }
  }, [selectedMonth]);

  useEffect(() => {
    safeSetItem('BI_REAL_ADJUST_V1', manualAdjustment.toString());
    safeSetItem(STORAGE_KEYS.YCX_FILE_NAME, ycxFileName);
    safeSetItem(STORAGE_KEYS.LINK_BC_TONG_HOP, linkBcTongHop);
    safeSetItem(STORAGE_KEYS.LINK_NGANH_HANG_TONG_HOP, linkNganhHangTongHop);
    safeSetItem('BI_REAL_SEL_MONTH_V1', selectedMonth);
    safeSetItem('BI_REAL_DAYS_PASSED_V1', daysPassed.toString());
    safeSetItem('BI_REAL_TOTAL_DAYS_V1', totalDays.toString());
    safeSetItem('BI_REAL_EXCLUDED_V1', JSON.stringify(excludedStaffIds));
    safeSetItem('BI_REAL_STORE_SETTINGS_V1', JSON.stringify(storeSettings));
    safeSetItem('BI_REAL_STAFF_LIST_FILE_V1', staffListFileName);
    safeSetItem('ST_NAME_V1', stName);
    safeSetItem('ST_DTLK_V1', stDtlk.toString());
    safeSetItem('ST_DTQD_V1', stDtqd.toString());
    safeSetItem('ST_DT_DU_KIEN_QD_V1', stDtDuKienQD.toString());
    safeSetItem('ST_PERCENT_HT_TARGET_DU_KIEN_QD_V1', stPercentHTTargetDuKienQD.toString());
    safeSetItem('ST_TARGET_QUY_DOI_V1', stTargetQuyDoi.toString());
    safeSetItem('ST_PERCENT_TARGET_V1', stPercentTarget.toString());
    safeSetItem('ST_TARGET_SAU_HE_SO_V1', stTargetSauHeSo.toString());
  }, [manualAdjustment, ycxFileName, linkBcTongHop, linkNganhHangTongHop, selectedMonth, daysPassed, totalDays, excludedStaffIds, storeSettings, staffListFileName, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, stPercentTarget, stTargetSauHeSo]);

  const hasLoadedFromDB = useRef(false);

  const saveStoreRevenue = useCallback(async (maKho: string, activeStore: string, silent = false) => {
    // Prioritize a valid store name over the warehouse code
    let storeToSave = '';
    
    if (activeStore && isValidStoreName(activeStore)) {
      storeToSave = activeStore;
    } else if (stName && isValidStoreName(stName)) {
      storeToSave = stName;
    } else {
      storeToSave = activeStore || stName || maKho;
    }

    if (!maKho) {
      return;
    }

    // Only validate if it's not defaulting to the warehouse code (which might not have the prefix)
    // But we want to ensure we have a valid store name if possible
    if ((activeStore || stName) && !isValidStoreName(storeToSave)) {
      if (!silent) {
        showNotification(`Tên siêu thị phải bắt đầu bằng: ${PRETTY_PREFIXES.join(', ')}`, 'error');
      }
      return;
    }

    setIsSavingStoreRevenue(true);
    try {
      const cleanMaKho = maKho.trim();
      const cleanStore = (storeToSave || maKho).trim();

      // Ensure we are saving the most up-to-date calculated target
      const currentTargetSauHeSo = Math.round(stTargetQuyDoi * (stPercentTarget / 100));

      // 1. Fetch existing data to merge for this SPECIFIC store
      const { data: existingData } = await supabase
        .from('store_luyke')
        .select('taget_doanh_thu, warehouse_code, ten_sieu_thi')
        .eq('warehouse_code', cleanMaKho)
        .eq('ten_sieu_thi', cleanStore)
        .maybeSingle();

      const newTargetData = {
        stName,
        stDtlk,
        stDtqd,
        stDtDuKienQD,
        stPercentHTTargetDuKienQD,
        stTargetQuyDoi,
        stPercentTarget,
        stTargetSauHeSo: currentTargetSauHeSo, // Always use calculated value
        manualAdjustment,
        selectedMonth,
        daysPassed,
        totalDays,
        ycxFileName,
        linkBcTongHop,
        linkNganhHangTongHop,
        staffListFileName,
        excludedStaffIds,
        storeSettings,
        updated_at: new Date().toISOString()
      };

      // 2. Prepare payload: preserve other fields from existing record
      const payload: any = {
        ...(existingData || {}),
        warehouse_code: cleanMaKho,
        ten_sieu_thi: cleanStore,
        taget_doanh_thu: newTargetData,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('store_luyke')
        .upsert(payload, { onConflict: 'warehouse_code,ten_sieu_thi' });

      if (error) {
        console.error('[SharedData] Upsert error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Lỗi lưu cài đặt:', error);
      let message = `Lỗi lưu cài đặt: ${error.message}`;
      if (error.message?.includes('violates row-level security policy')) {
        message = 'Lỗi bảo mật (RLS): Bạn không có quyền lưu dữ liệu cho siêu thị này hoặc cấu hình Supabase chưa cho phép ghi dữ liệu.';
      }
      if (!silent) showNotification(message, 'error');
    } finally {
      setIsSavingStoreRevenue(false);
    }
  }, [stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, manualAdjustment, selectedMonth, daysPassed, totalDays, ycxFileName, linkBcTongHop, linkNganhHangTongHop, staffListFileName, excludedStaffIds, storeSettings, showNotification]);

  const loadStoreRevenue = useCallback(async (maKho: string, storeName?: string) => {
    if (!maKho) return;
    const cleanMaKho = maKho.trim();
    const shortMaKho = cleanMaKho.replace(/^0+/, '');
    const paddedMaKho = shortMaKho.padStart(7, '0');
    
    setIsLoadingStoreRevenue(true);
    console.log('[useRTSTSharedData] Loading shared settings for warehouse:', cleanMaKho);
    try {
      // Always fetch all stores for this warehouse to populate allStoreTargets
      const { data, error } = await supabase
        .from('store_luyke')
        .select('taget_doanh_thu, ten_sieu_thi, warehouse_code')
        .in('warehouse_code', [cleanMaKho, shortMaKho, paddedMaKho])
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Map all store targets
        const targetMap: Record<string, any> = {};
        data.forEach(item => {
          if (item.ten_sieu_thi && item.taget_doanh_thu) {
            targetMap[item.ten_sieu_thi.toUpperCase()] = {
              ...item.taget_doanh_thu,
              warehouse_code: item.warehouse_code
            };
          }
        });
        setAllStoreTargets(targetMap);

        // Find the specific store settings for top-level state
        let settings = null;
        let foundStoreName = '';

        if (storeName) {
          const normSearch = normalize(storeName);
          const match = data.find(item => normalize(item.ten_sieu_thi) === normSearch);
          if (match) {
            settings = match.taget_doanh_thu;
            foundStoreName = match.ten_sieu_thi;
          }
        }

        // Fallback to the most recently updated if no specific store match
        if (!settings) {
          settings = data[0].taget_doanh_thu;
          foundStoreName = data[0].ten_sieu_thi;
        }

        if (settings) {
          console.log('[useRTSTSharedData] Found settings in DB for', foundStoreName, ':', settings);
          if (settings.stName) setStName(settings.stName);
          else if (foundStoreName) setStName(foundStoreName);
          
          if (settings.stDtlk !== undefined) setStDtlk(settings.stDtlk);
          if (settings.stDtqd !== undefined) setStDtqd(settings.stDtqd);
          if (settings.stDtDuKienQD !== undefined) setStDtDuKienQD(settings.stDtDuKienQD);
          if (settings.stPercentHTTargetDuKienQD !== undefined) setStPercentHTTargetDuKienQD(settings.stPercentHTTargetDuKienQD);
          if (settings.stTargetQuyDoi !== undefined) setStTargetQuyDoi(settings.stTargetQuyDoi);
          if (settings.stPercentTarget !== undefined) setStPercentTarget(settings.stPercentTarget);
          if (settings.stTargetSauHeSo !== undefined) setStTargetSauHeSo(settings.stTargetSauHeSo);
          
          if (settings.manualAdjustment !== undefined) setManualAdjustment(settings.manualAdjustment);
          if (settings.selectedMonth) setSelectedMonth(settings.selectedMonth);
          if (settings.daysPassed !== undefined) setDaysPassed(settings.daysPassed);
          if (settings.totalDays !== undefined) setTotalDays(settings.totalDays);
          if (settings.ycxFileName && !isYcxDirty) setYcxFileName(settings.ycxFileName);
          if (settings.linkBcTongHop) setLinkBcTongHop(settings.linkBcTongHop);
          if (settings.linkNganhHangTongHop) setLinkNganhHangTongHop(settings.linkNganhHangTongHop);
          if (settings.staffListFileName) setStaffListFileName(settings.staffListFileName);
          if (settings.excludedStaffIds) setExcludedStaffIds(settings.excludedStaffIds);
          if (settings.storeSettings) setStoreSettings(settings.storeSettings);
        }
      } else {
        console.log('[useRTSTSharedData] No settings found in DB for warehouse', cleanMaKho);
      }
      hasLoadedFromDB.current = true;
    } catch (error) {
      console.error('Lỗi tải cài đặt:', error);
    } finally {
      setIsLoadingStoreRevenue(false);
    }
  }, [isYcxDirty]);

  useEffect(() => {
    if (maKho && (maKho !== lastLoadedMaKho)) {
      loadStoreRevenue(maKho, stName).then(() => {
        setLastLoadedMaKho(maKho);
      });
    }
  }, [maKho, lastLoadedMaKho, loadStoreRevenue, stName]);

  // Auto-save when shared settings change
  useEffect(() => {
    if (!maKho || !hasLoadedFromDB.current) return;

    const timeoutId = setTimeout(() => {
      console.log('[AutoSave] Saving Shared settings...');
      saveStoreRevenue(maKho, stName, true);
    }, 2000); // 2s debounce

    return () => clearTimeout(timeoutId);
  }, [maKho, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, manualAdjustment, selectedMonth, daysPassed, totalDays, ycxFileName, linkBcTongHop, linkNganhHangTongHop, staffListFileName, excludedStaffIds, storeSettings, saveStoreRevenue]);

  return {
    manualAdjustment, setManualAdjustment,
    ycxFileName, setYcxFileName,
    linkBcTongHop, setLinkBcTongHop,
    linkNganhHangTongHop, setLinkNganhHangTongHop,
    selectedMonth, setSelectedMonth,
    daysPassed, setDaysPassed,
    totalDays, setTotalDays,
    excludedStaffIds, setExcludedStaffIds,
    storeSettings, setStoreSettings,
    staffListFileName, setStaffListFileName,
    stName, setStName,
    stDtlk, setStDtlk,
    stDtqd, setStDtqd,
    stDtDuKienQD, setStDtDuKienQD,
    stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
    stTargetQuyDoi, setStTargetQuyDoi,
    stPercentTarget, setStPercentTarget,
    stTargetSauHeSo, setStTargetSauHeSo,
    allStoreTargets,
    updateStoreSettings: useCallback(async (storeName: string, settings: any) => {
      if (!maKho) return;
      const cleanMaKho = maKho.trim();
      const cleanStore = storeName.trim();
      
      try {
        // 1. Fetch existing data to merge
        const { data: existingData } = await supabase
          .from('store_luyke')
          .select('taget_doanh_thu, warehouse_code, ten_sieu_thi')
          .eq('warehouse_code', cleanMaKho)
          .eq('ten_sieu_thi', cleanStore)
          .maybeSingle();

        const currentTargetQD = settings.stTargetQuyDoi || (existingData?.taget_doanh_thu?.stTargetQuyDoi) || 0;
        const currentPercent = settings.stPercentTarget !== undefined ? settings.stPercentTarget : (existingData?.taget_doanh_thu?.stPercentTarget ?? 100);
        const calculatedTarget = Math.round(currentTargetQD * (currentPercent / 100));

        const newTargetData = {
          ...(existingData?.taget_doanh_thu || {}),
          ...settings,
          stTargetSauHeSo: calculatedTarget,
          warehouse_code: cleanMaKho,
          updated_at: new Date().toISOString()
        };

        // Update local map immediately for responsiveness
        setAllStoreTargets(prev => ({
          ...prev,
          [cleanStore.toUpperCase()]: newTargetData
        }));

        // Update legacy storeSettings immediately
        setStoreSettings(prev => ({
          ...prev,
          [cleanStore]: {
            ...(prev[cleanStore] || {}),
            percentTarget: currentPercent
          }
        }));

        // If this is the active store, update top-level state too
        if (normalize(storeName) === normalize(stName)) {
          if (settings.stPercentTarget !== undefined) setStPercentTarget(settings.stPercentTarget);
          setStTargetSauHeSo(calculatedTarget);
        }

        const payload = {
          ...(existingData || {}),
          warehouse_code: cleanMaKho,
          ten_sieu_thi: cleanStore,
          taget_doanh_thu: newTargetData,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('store_luyke')
          .upsert(payload, { onConflict: 'warehouse_code,ten_sieu_thi' });

        if (error) throw error;
      } catch (error) {
        console.error('Error updating store settings:', error);
      }
    }, [maKho, stName, stPercentTarget, stTargetQuyDoi]),
    isSavingStoreRevenue,
    isLoadingStoreRevenue,
    saveStoreRevenue,
    loadStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES: PRETTY_PREFIXES
  };
};
