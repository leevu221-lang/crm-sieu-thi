/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { STORAGE_KEYS } from '../types';
import { supabase } from '../../../supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { useStore, getStoreItem, setStoreItem } from '../../../contexts/StoreContext';
import { isValidStoreName as isValidStoreNameUtil, normalize, safeSetItem, normalizeStoreId } from '../utils';

const globalAllStoreTargets: Record<string, any> = {};

export const useRTSTSharedData = (maKho?: string, isYcxDirty = localStorage.getItem('RTST_YCX_DIRTY') === 'true') => {
  const { showNotification } = useNotification();
  const { currentStoreId, isStoreReady } = useStore();

  const [manualAdjustment, setManualAdjustment] = useState(() => Number(localStorage.getItem('BI_REAL_ADJUST_V1')) || 0);
  const [linkBcTongHop, setLinkBcTongHop] = useState(() => localStorage.getItem(STORAGE_KEYS.LINK_BC_TONG_HOP) || '');
  const [linkNganhHangTongHop, setLinkNganhHangTongHop] = useState(() => localStorage.getItem(STORAGE_KEYS.LINK_NGANH_HANG_TONG_HOP) || '');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // Dirty ref: blocks Firebase overwrite for 5s after user changes month locally
  const monthDirtyRef = useRef(false);
  const monthDirtyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSelectedMonthLocal = useCallback((val: string | ((prev: string) => string)) => {
    setSelectedMonth(val);
    monthDirtyRef.current = true;
    if (monthDirtyTimerRef.current) clearTimeout(monthDirtyTimerRef.current);
    monthDirtyTimerRef.current = setTimeout(() => { monthDirtyRef.current = false; }, 5000);
  }, []);
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
  const cachedStoreKey = currentStoreId ? Object.keys(globalAllStoreTargets).find(k => normalize(k) === normalize(currentStoreId)) : null;
  const cachedStore = cachedStoreKey ? globalAllStoreTargets[cachedStoreKey] : {};

  const [drillFilterStaff, setDrillFilterStaff] = useState<string[]>(() => {
    if (cachedStore.drillFilterStaff !== undefined) return cachedStore.drillFilterStaff;
    const saved = localStorage.getItem('BI_REAL_DRILL_FILTER_STAFF_V1');
    return saved ? JSON.parse(saved) : [];
  });

  const [categoryMappingInput, setCategoryMappingInput] = useState(() => {
    if (cachedStore.categoryMappingInput !== undefined) return cachedStore.categoryMappingInput;
    return getStoreItem('ST_CATEGORY_MAPPING_INPUT_V1', currentStoreId) || '';
  });

  const [stName, setStName] = useState(() => cachedStore.stName || getStoreItem('ST_NAME_V1', currentStoreId) || '');
  const [stDtlk, setStDtlk] = useState(() => cachedStore.stDtlk !== undefined ? cachedStore.stDtlk : (Number(getStoreItem('ST_DTLK_V1', currentStoreId)) || 0));
  const [stDtqd, setStDtqd] = useState(() => cachedStore.stDtqd !== undefined ? cachedStore.stDtqd : (Number(getStoreItem('ST_DTQD_V1', currentStoreId)) || 0));
  const [stDtDuKienQD, setStDtDuKienQD] = useState(() => cachedStore.stDtDuKienQD !== undefined ? cachedStore.stDtDuKienQD : (Number(getStoreItem('ST_DT_DU_KIEN_QD_V1', currentStoreId)) || 0));
  const [stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD] = useState(() => cachedStore.stPercentHTTargetDuKienQD !== undefined ? cachedStore.stPercentHTTargetDuKienQD : (Number(getStoreItem('ST_PERCENT_HT_TARGET_DU_KIEN_QD_V1', currentStoreId)) || 0));
  const [stTargetQuyDoi, setStTargetQuyDoi] = useState(() => cachedStore.stTargetQuyDoi !== undefined ? cachedStore.stTargetQuyDoi : (Number(getStoreItem('ST_TARGET_QUY_DOI_V1', currentStoreId)) || 0));
  const [stPercentTarget, setStPercentTarget] = useState(() => {
    if (cachedStore.stPercentTarget !== undefined) return cachedStore.stPercentTarget;
    const saved = getStoreItem('ST_PERCENT_TARGET_V1', currentStoreId);
    return saved !== null ? Number(saved) : 100;
  });
  const [stTargetSauHeSo, setStTargetSauHeSo] = useState(() => cachedStore.stTargetSauHeSo !== undefined ? cachedStore.stTargetSauHeSo : (Number(getStoreItem('ST_TARGET_SAU_HE_SO_V1', currentStoreId)) || 0));
  const [excelFileName, setExcelFileName] = useState(() => cachedStore.excelFileName || getStoreItem('ST_EXCEL_FILE_NAME_V1', currentStoreId) || '');
  const [thuongStRows, setThuongStRows] = useState<any[]>(() => {
    if (cachedStore.thuongStRows !== undefined) return cachedStore.thuongStRows;
    try {
      const saved = getStoreItem('ST_THUONG_ST_ROWS_V1', currentStoreId);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [topPercentRankLimit, setTopPercentRankLimit] = useState<number>(() => {
    if (cachedStore.topPercentRankLimit !== undefined) return cachedStore.topPercentRankLimit;
    const saved = getStoreItem('ST_TOP_PERCENT_LIMIT_V1', currentStoreId);
    return saved !== null ? Number(saved) : 7;
  });
  const [allStoreTargets, setAllStoreTargets] = useState<Record<string, any>>(() => globalAllStoreTargets);

  const updateAllStoreTargets = useCallback((updater: any) => {
    setAllStoreTargets(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Merge into global cache
      Object.assign(globalAllStoreTargets, next);
      return next;
    });
  }, []);

  const [isSavingStoreRevenue, setIsSavingStoreRevenue] = useState(false);
  const [isLoadingStoreRevenue, setIsLoadingStoreRevenue] = useState(false);
  const [lastLoadedMaKho, setLastLoadedMaKho] = useState<string | null>(null);

  // PERF: Ref for stName to use in subscription callback without re-subscribing
  const stNameRef = useRef(stName);
  useEffect(() => { stNameRef.current = stName; }, [stName]);

  // PERF: Ref for saveStoreRevenue to use in auto-save without dependency cascade
  const saveStoreRevenueRef = useRef<((maKho: string, activeStore: string, silent?: boolean) => Promise<void>) | null>(null);

  // Set up Supabase Realtime subscription for store shared settings
  // PERF: Removed stName from deps — uses stNameRef instead to avoid re-subscribing on every name change
  useEffect(() => {
    if (!maKho) return;

    console.log(`[SharedData] Subscribing to realtime updates for warehouse: ${maKho}`);
    
    const channel = supabase
      .channel(`public:store_shared:warehouse_code=eq.${maKho}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store',
          filter: `warehouse_code=eq.${maKho}`
        },
        (payload: any) => {
          if (payload.new) {
            const record = payload.new as any;
            const settings = record.taget_doanh_thu;
            const storeName = record.ten_sieu_thi;
            
            if (storeName && settings) {
              updateAllStoreTargets((prev: any) => {
                const key = storeName.toUpperCase();
                const existing = prev[key];
                const incoming = {
                  ...settings,
                  warehouse_code: record.warehouse_code
                };
                if (existing && JSON.stringify(existing) === JSON.stringify(incoming)) {
                  return prev;
                }
                return {
                  ...prev,
                  [key]: incoming
                };
              });
              
              // PERF: Use stNameRef instead of stName to avoid re-subscribing
              const normActive = normalize(stNameRef.current || localStorage.getItem('ST_NAME_V1') || '');
              const normUpdate = normalize(storeName);
              
              if (normUpdate && normActive && (normUpdate === normActive || normUpdate.includes(normActive) || normActive.includes(normUpdate))) {
                if (settings.categoryMappingInput !== undefined) setCategoryMappingInput((prev: string) => prev !== settings.categoryMappingInput ? settings.categoryMappingInput : prev);
                if (settings.stName) setStName((prev: string) => prev !== settings.stName ? settings.stName : prev);
                if (settings.stTargetSauHeSo !== undefined) setStTargetSauHeSo((prev: number) => prev !== settings.stTargetSauHeSo ? settings.stTargetSauHeSo : prev);
                if (settings.stTargetQuyDoi !== undefined) setStTargetQuyDoi((prev: number) => prev !== settings.stTargetQuyDoi ? settings.stTargetQuyDoi : prev);
                if (settings.stPercentTarget !== undefined) setStPercentTarget((prev: number) => prev !== settings.stPercentTarget ? settings.stPercentTarget : prev);
                if (settings.stDtDuKienQD !== undefined) setStDtDuKienQD((prev: number) => prev !== settings.stDtDuKienQD ? settings.stDtDuKienQD : prev);
                if (settings.stPercentHTTargetDuKienQD !== undefined) setStPercentHTTargetDuKienQD((prev: number) => prev !== settings.stPercentHTTargetDuKienQD ? settings.stPercentHTTargetDuKienQD : prev);
                if (settings.stDtlk !== undefined) setStDtlk((prev: number) => prev !== settings.stDtlk ? settings.stDtlk : prev);
                if (settings.stDtqd !== undefined) setStDtqd((prev: number) => prev !== settings.stDtqd ? settings.stDtqd : prev);
                if (settings.manualAdjustment !== undefined) setManualAdjustment((prev: number) => prev !== settings.manualAdjustment ? settings.manualAdjustment : prev);
                if (settings.selectedMonth && !monthDirtyRef.current) setSelectedMonth((prev: string) => prev !== settings.selectedMonth ? settings.selectedMonth : prev);
                // daysPassed & totalDays are auto-calculated from selectedMonth, not loaded from DB
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maKho]); // PERF: Only re-subscribe when warehouse changes, not on every stName change

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

  const hasLoadedFromDB = useRef(false);

  // PERF: Debounce localStorage writes — previously 17 synchronous writes on every state change
  // MULTI-STORE: Per-store fields use prefixed keys via setStoreItem
  const localStorageTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
    // Guard: don't write transitional/cleared values to localStorage during store switch
    if (!hasLoadedFromDB.current) return;
    const storeId = currentStoreId;
    localStorageTimerRef.current = setTimeout(() => {
      // Global/shared keys (not per-store)
      safeSetItem('BI_REAL_ADJUST_V1', manualAdjustment.toString());
      safeSetItem(STORAGE_KEYS.LINK_BC_TONG_HOP, linkBcTongHop);
      safeSetItem(STORAGE_KEYS.LINK_NGANH_HANG_TONG_HOP, linkNganhHangTongHop);
      // selectedMonth persisted via Firebase only, not localStorage
      safeSetItem('BI_REAL_DAYS_PASSED_V1', daysPassed.toString());
      safeSetItem('BI_REAL_TOTAL_DAYS_V1', totalDays.toString());
      safeSetItem('BI_REAL_EXCLUDED_V1', JSON.stringify(excludedStaffIds));
      safeSetItem('BI_REAL_STORE_SETTINGS_V1', JSON.stringify(storeSettings));
      safeSetItem('BI_REAL_STAFF_LIST_FILE_V1', staffListFileName);
      safeSetItem('BI_REAL_DRILL_FILTER_STAFF_V1', JSON.stringify(drillFilterStaff));
      // Per-store keys — prefixed with currentStoreId
      if (storeId && storeId !== 'ALL') {
        setStoreItem('ST_CATEGORY_MAPPING_INPUT_V1', storeId, categoryMappingInput);
        setStoreItem('ST_NAME_V1', storeId, stName);
        setStoreItem('ST_DTLK_V1', storeId, stDtlk.toString());
        setStoreItem('ST_DTQD_V1', storeId, stDtqd.toString());
        setStoreItem('ST_DT_DU_KIEN_QD_V1', storeId, stDtDuKienQD.toString());
        setStoreItem('ST_PERCENT_HT_TARGET_DU_KIEN_QD_V1', storeId, stPercentHTTargetDuKienQD.toString());
        setStoreItem('ST_TARGET_QUY_DOI_V1', storeId, stTargetQuyDoi.toString());
        setStoreItem('ST_PERCENT_TARGET_V1', storeId, stPercentTarget.toString());
        setStoreItem('ST_TARGET_SAU_HE_SO_V1', storeId, stTargetSauHeSo.toString());
      }
    }, 300); // Batch all localStorage writes with 300ms debounce
    return () => { if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current); };
  }, [manualAdjustment, linkBcTongHop, linkNganhHangTongHop, selectedMonth, daysPassed, totalDays, excludedStaffIds, storeSettings, staffListFileName, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, drillFilterStaff, currentStoreId]);



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

      // Use the actual stTargetSauHeSo value — no recalculation

      const newTargetData = {
        stName,
        stDtlk,
        stDtqd,
        stDtDuKienQD,
        stPercentHTTargetDuKienQD,
        stTargetQuyDoi,
        stPercentTarget,
        stTargetSauHeSo,
        manualAdjustment,
        selectedMonth,
        daysPassed,
        totalDays,

        linkBcTongHop,
        linkNganhHangTongHop,
        staffListFileName,
        excludedStaffIds,
        storeSettings,
        excelFileName,
        thuongStRows,
        topPercentRankLimit,
        drillFilterStaff,
        categoryMappingInput,
        updated_at: new Date().toISOString()
      };

      // 2. Prepare payload: only include fields we are modifying
      const payload: any = {
        id: normalizeStoreId(cleanStore), // Normalized UPPERCASE ID to prevent duplicates
        warehouse_code: cleanMaKho,
        ten_sieu_thi: cleanStore,
        taget_doanh_thu: newTargetData,
        updated_at: new Date().toISOString()
      };

      updateAllStoreTargets((prev: any) => ({
        ...prev,
        [cleanStore.toUpperCase()]: newTargetData
      }));

      const { error } = await supabase
          .from('store')
          .upsert(payload, { onConflict: 'id' });

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
  }, [stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, manualAdjustment, selectedMonth, daysPassed, totalDays, linkBcTongHop, linkNganhHangTongHop, staffListFileName, excludedStaffIds, storeSettings, drillFilterStaff, showNotification]);

  const loadStoreRevenue = useCallback(async (maKho: string, storeName?: string) => {
    if (!maKho) return;
    const cleanMaKho = maKho.trim();
    const shortMaKho = cleanMaKho.replace(/^0+/, '');
    const paddedMaKho = shortMaKho.padStart(7, '0');
    
    // Cache-first approach: don't block UI if we already have local target data
    const hasCachedData = !!localStorage.getItem('ST_TARGET_SAU_HE_SO_V1');
    if (!hasCachedData) {
      setIsLoadingStoreRevenue(true);
    }

    // Fallback: forcefully remove loading state after 2 seconds
    const fallbackTimeout = setTimeout(() => {
      setIsLoadingStoreRevenue(false);
    }, 2000);

    console.log('[useRTSTSharedData] Loading shared settings for warehouse:', cleanMaKho);
    try {
      const targetStore = storeName || stName || cleanMaKho;
      const maKhoNum = parseInt(cleanMaKho, 10);
      let query = supabase
        .from('store')
        .select('id, taget_doanh_thu, ten_sieu_thi, warehouse_code, updated_at');
      
      if (!isNaN(maKhoNum)) {
        query = query.or(`warehouse_code.eq.${cleanMaKho},warehouse_code.eq.${maKhoNum}`);
      } else {
        query = query.eq('warehouse_code', cleanMaKho);
      }
      
      const { data: records, error } = await query;

      if (error) throw error;
      
      if (records && records.length > 0) {
        // Map all store targets
        const targetMap: Record<string, any> = {};
        records.forEach((r: any) => {
          if (r.ten_sieu_thi && r.taget_doanh_thu) {
            targetMap[r.ten_sieu_thi.toUpperCase()] = {
              ...r.taget_doanh_thu,
              warehouse_code: r.warehouse_code
            };
          }
        });
        updateAllStoreTargets(targetMap);

        // Find the specific store settings for top-level state
        const activeRecord = records.find((r: any) => r.id === normalizeStoreId(targetStore.trim())) || records[0];
        const settings = activeRecord?.taget_doanh_thu;

        if (settings) {
          console.log('[useRTSTSharedData] ✓ Found settings in DB for', activeRecord.ten_sieu_thi);
          if (settings.stName) setStName(settings.stName);
          else if (activeRecord.ten_sieu_thi) setStName(activeRecord.ten_sieu_thi);
          
          if (settings.stDtlk !== undefined) setStDtlk(settings.stDtlk);
          if (settings.stDtqd !== undefined) setStDtqd(settings.stDtqd);
          if (settings.stDtDuKienQD !== undefined) setStDtDuKienQD(settings.stDtDuKienQD);
          if (settings.stPercentHTTargetDuKienQD !== undefined) setStPercentHTTargetDuKienQD(settings.stPercentHTTargetDuKienQD);
          if (settings.stTargetQuyDoi !== undefined) setStTargetQuyDoi(settings.stTargetQuyDoi);
          if (settings.stPercentTarget !== undefined) setStPercentTarget(settings.stPercentTarget);
          if (settings.stTargetSauHeSo !== undefined) setStTargetSauHeSo(settings.stTargetSauHeSo);
          
          if (settings.manualAdjustment !== undefined) setManualAdjustment(settings.manualAdjustment);
          if (settings.selectedMonth) setSelectedMonth(settings.selectedMonth);
          // daysPassed & totalDays are auto-calculated from selectedMonth, not loaded from DB
          // ycxFileName/ycxFileNameMoi are now loaded from Firebase via useRealtimeData

          if (settings.linkBcTongHop) setLinkBcTongHop(settings.linkBcTongHop);
          if (settings.linkNganhHangTongHop) setLinkNganhHangTongHop(settings.linkNganhHangTongHop);
          if (settings.staffListFileName) setStaffListFileName(settings.staffListFileName);
          if (settings.excludedStaffIds) setExcludedStaffIds(settings.excludedStaffIds);
          if (settings.storeSettings) setStoreSettings(settings.storeSettings);
          if (settings.drillFilterStaff !== undefined) setDrillFilterStaff(settings.drillFilterStaff || []);
          if (settings.categoryMappingInput !== undefined) setCategoryMappingInput(settings.categoryMappingInput || '');
          else setCategoryMappingInput('');
          
          if (settings.excelFileName !== undefined) setExcelFileName(settings.excelFileName || '');
          if (settings.thuongStRows !== undefined) setThuongStRows(settings.thuongStRows || []);
          if (settings.topPercentRankLimit !== undefined) setTopPercentRankLimit(settings.topPercentRankLimit);
        } else {
          // STRICT ISOLATION: Do NOT fallback to another store's data if no match is found
          console.log('[useRTSTSharedData] ✗ No settings found for', activeRecord.ten_sieu_thi, '- Enforcing strict isolation (clearing values)');
          setStDtlk(0);
          setStDtqd(0);
          setStDtDuKienQD(0);
          setStPercentHTTargetDuKienQD(0);
          setStTargetQuyDoi(0);
          setStPercentTarget(100);
          setStTargetSauHeSo(0);
          setManualAdjustment(0);
          setYcxFileName('');
          setYcxFileNameMoi('');
          setExcelFileName('');
          setThuongStRows([]);
          setTopPercentRankLimit(7);
          setDrillFilterStaff([]);
          setCategoryMappingInput('');
        }
      } else {
        console.log('[useRTSTSharedData] No settings found in DB for warehouse', cleanMaKho);
        setStDtlk(0);
        setStDtqd(0);
        setStDtDuKienQD(0);
        setStPercentHTTargetDuKienQD(0);
        setStTargetQuyDoi(0);
        setStPercentTarget(100);
        setStTargetSauHeSo(0);
        setManualAdjustment(0);
        setExcelFileName('');
        setThuongStRows([]);
        setTopPercentRankLimit(7);
        setDrillFilterStaff([]);
        setCategoryMappingInput('');
      }
      hasLoadedFromDB.current = true;
    } catch (error) {
      console.error('Lỗi tải cài đặt:', error);
    } finally {
      clearTimeout(fallbackTimeout);
      setIsLoadingStoreRevenue(false);
    }
  }, [isYcxDirty]);

  useEffect(() => {
    if (maKho && (maKho !== lastLoadedMaKho)) {
      console.log('[SharedData] maKho changed, resetting state for:', maKho);
      hasLoadedFromDB.current = false;
      // DO NOT clear stale targets, keep them in cache for fast switching!
      // setAllStoreTargets({});
      
      loadStoreRevenue(maKho, stName).then(() => {
        setLastLoadedMaKho(maKho);
      });
    }
  }, [maKho, lastLoadedMaKho, loadStoreRevenue, stName]);

  // AUTO-CALCULATION: Target Quy Đổi
  useEffect(() => {
    if (stPercentHTTargetDuKienQD > 0) {
      const calculated = Math.round(stDtDuKienQD / (stPercentHTTargetDuKienQD / 100));
      if (stTargetQuyDoi !== calculated) setStTargetQuyDoi(calculated);
    } else {
      if (stTargetQuyDoi !== 0) setStTargetQuyDoi(0);
    }
  }, [stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi]);

  // AUTO-CALCULATION: Target Sau Hệ Số (TARGET THỰC TẾ)
  useEffect(() => {
    const calculated = Math.round(stTargetQuyDoi * (stPercentTarget / 100));
    if (stTargetSauHeSo !== calculated) setStTargetSauHeSo(calculated);
  }, [stTargetQuyDoi, stPercentTarget, stTargetSauHeSo]);

  // Ref to access latest allStoreTargets in AUTO-REACT without stale closure
  const allStoreTargetsRef = useRef(allStoreTargets);
  useEffect(() => { allStoreTargetsRef.current = allStoreTargets; }, [allStoreTargets]);

  // Synchronize component state to global cache immediately when user types
  // This prevents data loss (e.g. %TARGET resetting) if they switch tabs before the 2s auto-save
  useEffect(() => {
    if (!currentStoreId || currentStoreId === 'ALL') return;
    if (!hasLoadedFromDB.current) return; // Guard against overwriting cache with cleared transition state

    updateAllStoreTargets((prev: any) => {
      const storeKey = currentStoreId.toUpperCase();
      const existing = prev[storeKey] || {};
      
      // Only update if there's an actual change to avoid infinite loops
      if (
        existing.stName === stName &&
        existing.stDtlk === stDtlk &&
        existing.stDtqd === stDtqd &&
        existing.stDtDuKienQD === stDtDuKienQD &&
        existing.stPercentHTTargetDuKienQD === stPercentHTTargetDuKienQD &&
        existing.stTargetQuyDoi === stTargetQuyDoi &&
        existing.stPercentTarget === stPercentTarget &&
        existing.stTargetSauHeSo === stTargetSauHeSo &&
        existing.excelFileName === excelFileName &&
        existing.thuongStRows === thuongStRows &&
        existing.topPercentRankLimit === topPercentRankLimit &&
        existing.categoryMappingInput === categoryMappingInput &&
        JSON.stringify(existing.drillFilterStaff) === JSON.stringify(drillFilterStaff)
      ) {
        return prev;
      }

      return {
        ...prev,
        [storeKey]: {
          ...existing,
          stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD,
          stTargetQuyDoi, stPercentTarget, stTargetSauHeSo,
          excelFileName, thuongStRows, topPercentRankLimit,
          drillFilterStaff, categoryMappingInput
        }
      };
    });
  }, [
    stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, 
    stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, excelFileName, 
    thuongStRows, topPercentRankLimit, drillFilterStaff, currentStoreId, updateAllStoreTargets
  ]);

  // AUTO-REACT: When global currentStoreId changes, reload per-store settings from DB
  // This ensures store revenue/target data updates instantly when switching stores
  const prevSharedStoreRef = useRef(currentStoreId);
  useEffect(() => {
    if (!currentStoreId || currentStoreId === 'ALL' || !maKho) return;
    if (prevSharedStoreRef.current === currentStoreId) return;
    prevSharedStoreRef.current = currentStoreId;
    
    console.log(`[SharedData] AUTO-REACT: currentStoreId changed → "${currentStoreId}"`);
    // Block auto-save during transition to prevent saving cleared values to DB
    hasLoadedFromDB.current = false;
    
    // Use cached per-store values from allStoreTargets (populated on initial load)
    // This avoids resetting to 0/100 and then flashing to DB values
    const cachedKey = Object.keys(allStoreTargetsRef.current || {}).find(k => normalize(k) === normalize(currentStoreId));
    const cached = cachedKey ? allStoreTargetsRef.current[cachedKey] : null;
    
    setStName(cached?.stName || currentStoreId);
    setStDtlk(cached?.stDtlk ?? 0);
    setStDtqd(cached?.stDtqd ?? 0);
    setStDtDuKienQD(cached?.stDtDuKienQD ?? 0);
    setStPercentHTTargetDuKienQD(cached?.stPercentHTTargetDuKienQD ?? 0);
    setStTargetQuyDoi(cached?.stTargetQuyDoi ?? 0);
    setStPercentTarget(cached?.stPercentTarget ?? 100);
    setStTargetSauHeSo(cached?.stTargetSauHeSo ?? 0);
    setExcelFileName(cached?.excelFileName || '');
    setThuongStRows(cached?.thuongStRows || []);
    setTopPercentRankLimit(cached?.topPercentRankLimit ?? 7);
    setDrillFilterStaff(cached?.drillFilterStaff || []);
    setCategoryMappingInput(cached?.categoryMappingInput || '');
    
    // Reload from DB for the new store (sets hasLoadedFromDB = true on completion)
    loadStoreRevenue(maKho, currentStoreId);
  }, [currentStoreId]); // eslint-disable-line react-hooks/exhaustive-deps

  // PERF: Keep saveStoreRevenue ref up-to-date to avoid it as a dependency in auto-save
  useEffect(() => { saveStoreRevenueRef.current = saveStoreRevenue; }, [saveStoreRevenue]);

  // Auto-save when shared settings change
  // PERF: Uses saveStoreRevenueRef instead of saveStoreRevenue to avoid dependency cascade
  // (saveStoreRevenue changes on every state change → would retrigger this effect)
  // MULTI-STORE GUARD: Block auto-save when isStoreReady=false
  const prevStNameRef = useRef(stName);
  useEffect(() => {
    if (!maKho || !hasLoadedFromDB.current) return;
    if (!isStoreReady) return; // ← GUARD: Don't save during store switch

    // Skip auto-save when only stName changed (store is switching, data is stale)
    if (prevStNameRef.current !== stName) {
      prevStNameRef.current = stName;
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('[AutoSave] Saving Shared settings for:', stName);
      saveStoreRevenueRef.current?.(maKho, stName, true);
    }, 4000); // 4s debounce

    return () => clearTimeout(timeoutId);
  }, [maKho, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, manualAdjustment, selectedMonth, daysPassed, totalDays, linkBcTongHop, linkNganhHangTongHop, staffListFileName, excludedStaffIds, storeSettings, drillFilterStaff, categoryMappingInput, isStoreReady]);

  return {
    categoryMappingInput, setCategoryMappingInput,
    manualAdjustment, setManualAdjustment,

    linkBcTongHop, setLinkBcTongHop,
    linkNganhHangTongHop, setLinkNganhHangTongHop,
    selectedMonth, setSelectedMonth: setSelectedMonthLocal,
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
    drillFilterStaff, setDrillFilterStaff,
    allStoreTargets,
    updateStoreSettings: useCallback(async (storeName: string, settings: any) => {
      if (!maKho) return;
      const cleanMaKho = maKho.trim();
      const cleanStore = storeName.trim();
      
      try {
        const { data: existingData } = await supabase
          .from('store')
          .select('taget_doanh_thu, warehouse_code, ten_sieu_thi, category_targets, lk_dt_nv, lk_td_nv, ban_kem_nv, ds_nhan_vien, dt_gio_cong, data_phan_ca, tragop_matran, tragop_nv, phuc_vu, lk_bi_tong_quan, lk_nh_sieu_thi')
          .eq('id', normalizeStoreId(cleanStore))
          .maybeSingle();

        const currentTargetQD = settings.stTargetQuyDoi || (existingData?.taget_doanh_thu?.stTargetQuyDoi) || 0;
        const currentPercent = settings.stPercentTarget !== undefined ? settings.stPercentTarget : (existingData?.taget_doanh_thu?.stPercentTarget ?? 100);
        // Use existing stTargetSauHeSo from DB — no recalculation
        const existingTargetSauHeSo = settings.stTargetSauHeSo || existingData?.taget_doanh_thu?.stTargetSauHeSo || Math.round(currentTargetQD * (currentPercent / 100));

        const newTargetData = {
          ...(existingData?.taget_doanh_thu || {}),
          ...settings,
          stTargetSauHeSo: existingTargetSauHeSo,
          warehouse_code: cleanMaKho,
          updated_at: new Date().toISOString()
        };

        // Update local map immediately for responsiveness
        updateAllStoreTargets((prev: any) => ({
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
          setStTargetSauHeSo(existingTargetSauHeSo);
        }

        const payload: any = {
          ...(existingData || {}),
          id: normalizeStoreId(cleanStore),
          warehouse_code: cleanMaKho,
          ten_sieu_thi: cleanStore,
          taget_doanh_thu: newTargetData,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('store')
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
        showNotification('Đã cập nhật % TARGET siêu thị thành công!', 'success');
      } catch (error) {
        console.error('Error updating store settings:', error);
      }
    }, [maKho, stName, stPercentTarget, stTargetQuyDoi]),
    saveExcelThuongStData: useCallback(async (parsedRows: any[], fileName: string, detectedLimit: number, clusterStoreNames: string[]) => {
      if (!maKho) return;
      const cleanMaKho = maKho.trim();
      const shortMaKho = cleanMaKho.replace(/^0+/, '');

      const storesToProcess = clusterStoreNames && clusterStoreNames.length > 0
        ? clusterStoreNames
        : [stName || currentStoreId].filter(Boolean);

      try {
        const storeIds = storesToProcess.map(name => normalizeStoreId(name));
        const { data: existingRecords, error: fetchError } = await supabase
          .from('store')
          .select('*')
          .in('id', storeIds);

        if (fetchError) throw fetchError;

        const payloads: any[] = [];
        const updatedCache: Record<string, any> = {};

        for (const storeName of storesToProcess) {
          const normalizedStoreName = storeName.toUpperCase();
          const existingRecord = existingRecords?.find((r: any) => r.id === normalizeStoreId(storeName));
          
          const storeRows = fileName
            ? parsedRows.filter(row => {
                if (!row.storeName) return false;
                const normRowStore = normalize(row.storeName);
                const normStoreName = normalize(storeName);
                return normRowStore === normStoreName || normRowStore.includes(normStoreName) || normStoreName.includes(normRowStore);
              })
            : [];

          const existingTargetData = existingRecord?.taget_doanh_thu || {};
          const newTargetData = {
            ...existingTargetData,
            excelFileName: fileName,
            thuongStRows: storeRows,
            topPercentRankLimit: detectedLimit,
            updated_at: new Date().toISOString()
          };

          updatedCache[normalizedStoreName] = newTargetData;

          payloads.push({
            ...(existingRecord || {}),
            id: normalizeStoreId(storeName),
            warehouse_code: shortMaKho,
            ten_sieu_thi: storeName,
            taget_doanh_thu: newTargetData,
            updated_at: new Date().toISOString()
          });
        }

        const { error: upsertError } = await supabase
          .from('store')
          .upsert(payloads, { onConflict: 'id' });

        if (upsertError) throw upsertError;

        // Update local states for the active store immediately
        const activeNormalized = (stName || currentStoreId || '').toUpperCase();
        if (updatedCache[activeNormalized]) {
          const activeData = updatedCache[activeNormalized];
          setExcelFileName(activeData.excelFileName || '');
          setThuongStRows(activeData.thuongStRows || []);
          setTopPercentRankLimit(activeData.topPercentRankLimit ?? 7);
        } else {
          setExcelFileName(fileName);
          setThuongStRows([]);
          setTopPercentRankLimit(detectedLimit);
        }

        updateAllStoreTargets((prev: any) => ({
          ...prev,
          ...updatedCache
        }));

        showNotification(
          fileName ? 'Tải lên và đồng bộ dữ liệu thi đua thành công!' : 'Đã xóa dữ liệu thi đua thành công!',
          'success'
        );
      } catch (err: any) {
        console.error('Lỗi lưu dữ liệu thi đua:', err);
        showNotification('Lỗi lưu dữ liệu thi đua: ' + err.message, 'error');
      }
    }, [maKho, stName, currentStoreId, updateAllStoreTargets, showNotification]),
    excelFileName,
    setExcelFileName,
    thuongStRows,
    setThuongStRows,
    topPercentRankLimit,
    setTopPercentRankLimit,
    isSavingStoreRevenue,
    isLoadingStoreRevenue,
    saveStoreRevenue,
    loadStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES: PRETTY_PREFIXES
  };
};
