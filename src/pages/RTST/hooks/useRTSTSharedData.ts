/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { STORAGE_KEYS } from '../types';
import { supabase } from '../../../supabaseClient';
import { db } from '../../../firebaseConfig';
import { doc, setDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useNotification } from '../../../contexts/NotificationContext';
import { useStore, getStoreItem, setStoreItem } from '../../../contexts/StoreContext';
import { isValidStoreName as isValidStoreNameUtil, normalize, safeSetItem, normalizeStoreId } from '../utils';

const globalAllStoreTargets: Record<string, any> = {};

export const useRTSTSharedData = (maKho?: string, isYcxDirty = localStorage.getItem('RTST_YCX_DIRTY') === 'true') => {
  const { showNotification } = useNotification();
  const { currentStoreId, isStoreReady } = useStore();

  // Reset global cache when warehouse/account changes
  const prevMaKhoSharedRef = useRef(maKho);
  useEffect(() => {
    if (prevMaKhoSharedRef.current && prevMaKhoSharedRef.current !== maKho) {
      prevMaKhoSharedRef.current = maKho;
      Object.keys(globalAllStoreTargets).forEach(k => delete globalAllStoreTargets[k]);
    } else {
      prevMaKhoSharedRef.current = maKho;
    }
  }, [maKho]);

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
  const [excelFileName, setExcelFileName] = useState(() => cachedStore.excelFileName || getStoreItem('ST_EXCEL_FILE_NAME_V1', currentStoreId) || localStorage.getItem('ST_EXCEL_FILE_NAME_V1') || '');
  const [thuongStRows, setThuongStRows] = useState<any[]>(() => {
    if (cachedStore.thuongStRows !== undefined && cachedStore.thuongStRows.length > 0) return cachedStore.thuongStRows;
    try {
      const saved = getStoreItem('ST_THUONG_ST_ROWS_V1', currentStoreId) || localStorage.getItem('ST_THUONG_ST_ROWS_V1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [topPercentRankLimit, setTopPercentRankLimit] = useState<number>(() => {
    if (cachedStore.topPercentRankLimit !== undefined) return cachedStore.topPercentRankLimit;
    const saved = getStoreItem('ST_TOP_PERCENT_LIMIT_V1', currentStoreId) || localStorage.getItem('ST_TOP_PERCENT_LIMIT_V1');
    return saved !== null ? Number(saved) : 7;
  });

  const [excelOldFileName, setExcelOldFileName] = useState(() => cachedStore.excelOldFileName || getStoreItem('ST_EXCEL_OLD_FILE_NAME_V1', currentStoreId) || localStorage.getItem('ST_EXCEL_OLD_FILE_NAME_V1') || '');
  const [thuongStOldRows, setThuongStOldRows] = useState<any[]>(() => {
    if (cachedStore.thuongStOldRows !== undefined && cachedStore.thuongStOldRows.length > 0) return cachedStore.thuongStOldRows;
    try {
      const saved = getStoreItem('ST_THUONG_ST_OLD_ROWS_V1', currentStoreId) || localStorage.getItem('ST_THUONG_ST_OLD_ROWS_V1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [topPercentRankLimitOld, setTopPercentRankLimitOld] = useState<number>(() => {
    if (cachedStore.topPercentRankLimitOld !== undefined) return cachedStore.topPercentRankLimitOld;
    const saved = getStoreItem('ST_TOP_PERCENT_LIMIT_OLD_V1', currentStoreId) || localStorage.getItem('ST_TOP_PERCENT_LIMIT_OLD_V1');
    return saved !== null ? Number(saved) : 7;
  });
  const [allStoreTargets, setAllStoreTargets] = useState<Record<string, any>>(() => {
    if (Object.keys(globalAllStoreTargets).length > 0) return globalAllStoreTargets;
    try {
      const saved = localStorage.getItem('ST_THUONG_ST_ALL_STORES_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(globalAllStoreTargets, parsed);
        return parsed;
      }
    } catch {}
    return globalAllStoreTargets;
  });

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
  // Tracks the pending 4s debounced auto-save timer so an explicit save() call can cancel
  // it — otherwise a manual save shortly after an edit gets duplicated by the debounce
  // firing again a few seconds later, doubling Firestore writes.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of the last value actually written to Firestore, used to skip no-op
  // saves — see saveStoreRevenue.
  const lastSavedRevenueSnapshotRef = useRef<string | null>(null);

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

  // 🔥 Real-time synchronization for Thưởng ST via Firebase Firestore across Mobile & Laptop
  useEffect(() => {
    try {
      const docRef = doc(db, 'app_settings', 'thuong_st_data');
      const unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data) {
            // Update root file names directly so global competition file name is never blank
            if (data.excelFileName) {
              setExcelFileName(prev => prev !== data.excelFileName ? data.excelFileName : prev);
              try { safeSetItem('ST_EXCEL_FILE_NAME_V1', data.excelFileName); } catch {}
            }
            if (data.excelOldFileName !== undefined) {
              setExcelOldFileName(prev => prev !== data.excelOldFileName ? data.excelOldFileName : prev);
              try { safeSetItem('ST_EXCEL_OLD_FILE_NAME_V1', data.excelOldFileName); } catch {}
            }
            if (data.topPercentRankLimit !== undefined) {
              setTopPercentRankLimit(prev => prev !== data.topPercentRankLimit ? data.topPercentRankLimit : prev);
            }
            if (data.topPercentRankLimitOld !== undefined) {
              setTopPercentRankLimitOld(prev => prev !== data.topPercentRankLimitOld ? data.topPercentRankLimitOld : prev);
            }

            if (data.stores) {
              try { safeSetItem('ST_THUONG_ST_ALL_STORES_V1', JSON.stringify(data.stores)); } catch {}
              updateAllStoreTargets((prev: any) => {
                const next = { ...prev };
                for (const [key, sData] of Object.entries(data.stores as Record<string, any>)) {
                  next[key] = {
                    ...(next[key] || {}),
                    excelFileName: sData.excelFileName || data.excelFileName || '',
                    thuongStRows: sData.thuongStRows || [],
                    topPercentRankLimit: sData.topPercentRankLimit ?? data.topPercentRankLimit ?? 7,
                    excelOldFileName: sData.excelOldFileName || data.excelOldFileName || '',
                    thuongStOldRows: sData.thuongStOldRows || [],
                    topPercentRankLimitOld: sData.topPercentRankLimitOld ?? data.topPercentRankLimitOld ?? 7,
                  };
                }
                return next;
              });

              const activeCandidates = [
                localStorage.getItem('rtst_selected_store_filter'),
                currentStoreId,
                stNameRef.current
              ].filter(Boolean) as string[];

              let activeStoreData: any = null;
              for (const cand of activeCandidates) {
                const normCand = normalize(cand);
                for (const [k, sData] of Object.entries(data.stores as Record<string, any>)) {
                  const normK = normalize(k);
                  if (normK === normCand || normK.includes(normCand) || normCand.includes(normK)) {
                    activeStoreData = sData;
                    break;
                  }
                  const codeCand = cand.match(/\b\d{3,5}\b/);
                  const codeK = k.match(/\b\d{3,5}\b/);
                  if (codeCand && codeK && codeCand[0] === codeK[0]) {
                    activeStoreData = sData;
                    break;
                  }
                }
                if (activeStoreData) break;
              }

              if (!activeStoreData && clusterStoreNames && clusterStoreNames.length > 0) {
                // Only fall back within user's own cluster/declared stores, never jump into another warehouse
                activeStoreData = Object.values(data.stores as Record<string, any>).find((s: any) => {
                  const sName = s.storeName || '';
                  return clusterStoreNames.some(cs => {
                    const normCs = normalize(cs);
                    const normS = normalize(sName);
                    return normCs && normS && (normS === normCs || normS.includes(normCs) || normCs.includes(normS));
                  }) && s.thuongStRows?.length > 0;
                });
              }

              const areRowsEqual = (a: any[], b: any[]) => {
                if (a === b) return true;
                if (!a || !b || a.length !== b.length) return false;
                if (a.length === 0) return true;
                return a[0]?.categoryName === b[0]?.categoryName && a[0]?.bonus === b[0]?.bonus && a[a.length - 1]?.categoryName === b[b.length - 1]?.categoryName;
              };

              if (activeStoreData) {
                const effectiveNewFile = activeStoreData.excelFileName || data.excelFileName || '';
                const effectiveOldFile = activeStoreData.excelOldFileName || data.excelOldFileName || '';

                if (effectiveNewFile) {
                  setExcelFileName(effectiveNewFile);
                  try { safeSetItem('ST_EXCEL_FILE_NAME_V1', effectiveNewFile); } catch {}
                }
                if (effectiveOldFile !== undefined) {
                  setExcelOldFileName(effectiveOldFile);
                  try { safeSetItem('ST_EXCEL_OLD_FILE_NAME_V1', effectiveOldFile); } catch {}
                }
                if (activeStoreData.thuongStRows && activeStoreData.thuongStRows.length > 0) {
                  const incoming = activeStoreData.thuongStRows || [];
                  setThuongStRows(prev => !areRowsEqual(prev, incoming) ? incoming : prev);
                  try { safeSetItem('ST_THUONG_ST_ROWS_V1', JSON.stringify(incoming)); } catch {}
                }
                if (activeStoreData.topPercentRankLimit !== undefined) setTopPercentRankLimit(activeStoreData.topPercentRankLimit);
                if (activeStoreData.thuongStOldRows && activeStoreData.thuongStOldRows.length > 0) {
                  const incomingOld = activeStoreData.thuongStOldRows || [];
                  setThuongStOldRows(prev => !areRowsEqual(prev, incomingOld) ? incomingOld : prev);
                  try { safeSetItem('ST_THUONG_ST_OLD_ROWS_V1', JSON.stringify(incomingOld)); } catch {}
                }
                if (activeStoreData.topPercentRankLimitOld !== undefined) setTopPercentRankLimitOld(activeStoreData.topPercentRankLimitOld);
              }
            }
          }
        }
      }, (err) => {
        console.warn('[useRTSTSharedData] Thưởng ST onSnapshot listener error:', err);
      });

      return () => unsub();
    } catch (err) {
      console.warn('[useRTSTSharedData] Firebase onSnapshot setup failed:', err);
    }
  }, [updateAllStoreTargets]);

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
    // Cancel any pending debounced auto-save — we're saving now, so let's not also fire
    // a redundant duplicate write a few seconds from now for the same data.
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
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

    const cleanMaKho = maKho.trim();
    const cleanStore = (storeToSave || maKho).trim();

    // Use the actual stTargetSauHeSo value — no recalculation
    const newTargetDataForCompare = {
      stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi,
      stPercentTarget, stTargetSauHeSo, manualAdjustment, selectedMonth, daysPassed, totalDays,
      linkBcTongHop, linkNganhHangTongHop, staffListFileName, excludedStaffIds, storeSettings,
      excelFileName, thuongStRows, topPercentRankLimit, drillFilterStaff, categoryMappingInput
    };

    // Skip the write entirely if nothing actually differs from the last value
    // persisted for this store (excludes updated_at, which is always "different").
    const currentSnapshotKey = JSON.stringify([normalizeStoreId(cleanStore), newTargetDataForCompare]);
    if (lastSavedRevenueSnapshotRef.current === currentSnapshotKey) {
      console.log('[RTSTSharedData] Skip save — no change detected');
      return;
    }

    setIsSavingStoreRevenue(true);
    try {
      const newTargetData = {
        ...newTargetDataForCompare,
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

      lastSavedRevenueSnapshotRef.current = currentSnapshotKey;
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
          const storeName = (r.ten_sieu_thi || r.id || '').trim();
          if (storeName && r.taget_doanh_thu) {
            const entry = {
              ...r.taget_doanh_thu,
              warehouse_code: r.warehouse_code
            };
            targetMap[storeName.toUpperCase()] = entry;
            targetMap[normalize(storeName)] = entry;
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
          if (settings.excelOldFileName !== undefined) setExcelOldFileName(settings.excelOldFileName || '');
          if (settings.thuongStOldRows !== undefined) setThuongStOldRows(settings.thuongStOldRows || []);
          if (settings.topPercentRankLimitOld !== undefined) setTopPercentRankLimitOld(settings.topPercentRankLimitOld ?? 7);
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
          setExcelOldFileName('');
          setThuongStOldRows([]);
          setTopPercentRankLimitOld(7);
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
        setExcelOldFileName('');
        setThuongStOldRows([]);
        setTopPercentRankLimitOld(7);
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

  // AUTO-CALCULATION: Target Quy Đổi (Only calculate when positive values available, do not wipe valid target to 0)
  useEffect(() => {
    if (stPercentHTTargetDuKienQD > 0 && stDtDuKienQD > 0) {
      const calculated = Math.round(stDtDuKienQD / (stPercentHTTargetDuKienQD / 100));
      if (stTargetQuyDoi !== calculated) setStTargetQuyDoi(calculated);
    }
  }, [stDtDuKienQD, stPercentHTTargetDuKienQD]);

  // AUTO-CALCULATION: Target Sau Hệ Số (TARGET THỰC TẾ)
  useEffect(() => {
    if (stTargetQuyDoi > 0) {
      const calculated = Math.round(stTargetQuyDoi * (stPercentTarget / 100));
      if (stTargetSauHeSo !== calculated) setStTargetSauHeSo(calculated);
    }
  }, [stTargetQuyDoi, stPercentTarget]);

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
        existing.excelOldFileName === excelOldFileName &&
        existing.thuongStOldRows === thuongStOldRows &&
        existing.topPercentRankLimitOld === topPercentRankLimitOld &&
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
          excelOldFileName, thuongStOldRows, topPercentRankLimitOld,
          drillFilterStaff, categoryMappingInput
        }
      };
    });
  }, [
    stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, 
    stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, excelFileName, 
    thuongStRows, topPercentRankLimit, excelOldFileName, thuongStOldRows, topPercentRankLimitOld,
    drillFilterStaff, currentStoreId, updateAllStoreTargets
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
    const normCurrent = normalize(currentStoreId);
    const cachedKey = Object.keys(allStoreTargetsRef.current || {}).find(k => normalize(k) === normCurrent);
    const cached = cachedKey ? allStoreTargetsRef.current[cachedKey] : null;

    // Check popup target config from localStorage as another immediate cache
    let clusterCfg: any = null;
    try {
      const savedClusterCfg = localStorage.getItem('crm_cluster_store_target_config');
      if (savedClusterCfg) {
        const parsed = JSON.parse(savedClusterCfg);
        const matchK = Object.keys(parsed).find(k => normalize(k) === normCurrent);
        if (matchK) clusterCfg = parsed[matchK];
      }
    } catch {}
    
    setStName(cached?.stName || currentStoreId);
    setStDtlk(cached?.stDtlk ?? 0);
    setStDtqd(cached?.stDtqd ?? 0);
    setStDtDuKienQD(cached?.stDtDuKienQD ?? 0);
    setStPercentHTTargetDuKienQD(cached?.stPercentHTTargetDuKienQD ?? 0);

    const percentTargetVal = clusterCfg?.mucTieuPercent !== undefined
      ? Number(clusterCfg.mucTieuPercent)
      : (cached?.stPercentTarget ?? 100);
    setStPercentTarget(percentTargetVal);

    if (clusterCfg && Number(clusterCfg.targetCungKyNam) > 0) {
      const tgt = Number(clusterCfg.targetCungKyNam);
      setStTargetQuyDoi(tgt);
      setStTargetSauHeSo(Math.round(tgt * (percentTargetVal / 100)));
    } else {
      setStTargetQuyDoi(cached?.stTargetQuyDoi ?? 0);
      setStTargetSauHeSo(cached?.stTargetSauHeSo ?? 0);
    }
    if (cached?.excelFileName) setExcelFileName(cached.excelFileName);
    if (cached?.thuongStRows && cached.thuongStRows.length > 0) setThuongStRows(cached.thuongStRows);
    if (cached?.topPercentRankLimit !== undefined) setTopPercentRankLimit(cached.topPercentRankLimit);
    if (cached?.excelOldFileName) setExcelOldFileName(cached.excelOldFileName);
    if (cached?.thuongStOldRows && cached.thuongStOldRows.length > 0) setThuongStOldRows(cached.thuongStOldRows);
    if (cached?.topPercentRankLimitOld !== undefined) setTopPercentRankLimitOld(cached.topPercentRankLimitOld);
    if (cached?.drillFilterStaff) setDrillFilterStaff(cached.drillFilterStaff);
    if (cached?.categoryMappingInput) setCategoryMappingInput(cached.categoryMappingInput);
    
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

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      saveStoreRevenueRef.current?.(maKho, stName, true); // Silent save
    }, 4000); // 4s debounce

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    maKho,
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
    drillFilterStaff,
    categoryMappingInput,
    isStoreReady
  ]);

  // Force-save listener: flush pending store revenue data before version-update reload
  useEffect(() => {
    const handleForceSave = () => {
      console.log('[RTSTSharedData] Force-save triggered before reload — flushing pending store revenue data');
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (localStorageTimerRef.current) {
        clearTimeout(localStorageTimerRef.current);
        localStorageTimerRef.current = null;
      }
      // Save immediately without debounce
      if (saveStoreRevenueRef.current && maKho && stNameRef.current) {
        saveStoreRevenueRef.current(maKho, stNameRef.current, true);
      }
    };
    window.addEventListener('force-save-before-reload', handleForceSave);
    return () => window.removeEventListener('force-save-before-reload', handleForceSave);
  }, [maKho]);

  // Force-save dirty data before page refresh (F5) or close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveStoreRevenueRef.current && maKho && stNameRef.current) {
        saveStoreRevenueRef.current(maKho, stNameRef.current, true);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [maKho]);

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
    saveExcelThuongStData: useCallback(async (
      parsedRows: any[], 
      fileName: string, 
      detectedLimit: number, 
      clusterStoreNames: string[],
      parsedOldRows?: any[],
      oldFileName?: string,
      detectedOldLimit?: number
    ) => {
      const effectiveMaKho = (maKho || localStorage.getItem('rtst_ma_kho') || '').trim();
      const shortMaKho = effectiveMaKho.replace(/^0+/, '');

      // ⚡ FAST O(N) PRE-GROUPING: Group rows by normalized store name once
      const newRowsByNormStore = new Map<string, any[]>();
      let hasStoreInNew = false;
      const noStoreNewRows: any[] = [];
      for (const row of (parsedRows || [])) {
        if (row.storeName) {
          hasStoreInNew = true;
          const k = normalize(row.storeName);
          let arr = newRowsByNormStore.get(k);
          if (!arr) {
            arr = [];
            newRowsByNormStore.set(k, arr);
          }
          arr.push(row);
        } else {
          noStoreNewRows.push(row);
        }
      }

      const oldRowsByNormStore = new Map<string, any[]>();
      let hasStoreInOld = false;
      const noStoreOldRows: any[] = [];
      for (const row of (parsedOldRows || [])) {
        if (row.storeName) {
          hasStoreInOld = true;
          const k = normalize(row.storeName);
          let arr = oldRowsByNormStore.get(k);
          if (!arr) {
            arr = [];
            oldRowsByNormStore.set(k, arr);
          }
          arr.push(row);
        } else {
          noStoreOldRows.push(row);
        }
      }

      // Fast O(1) store rows lookup with fallback to intelligent multi-pass matching
      const getRowsForStore = (
        rawStoreName: string,
        rowsMap: Map<string, any[]>,
        hasStoreCol: boolean,
        defaultRows: any[]
      ): any[] => {
        if (!hasStoreCol) return defaultRows;
        const norm = normalize(rawStoreName);
        if (!norm) return [];

        // Pass 1: Exact normalized match
        const exact = rowsMap.get(norm);
        if (exact && exact.length > 0) return exact;

        // Pass 2: Substring inclusion match
        for (const [k, v] of rowsMap.entries()) {
          if (k === norm || k.includes(norm) || norm.includes(k)) {
            return v;
          }
        }

        // Pass 3: 3-5 digit store code match (e.g. 1841)
        const codeMatch = rawStoreName.match(/\b\d{3,5}\b/);
        if (codeMatch) {
          const code = codeMatch[0];
          for (const [k, v] of rowsMap.entries()) {
            if (k.includes(code)) {
              return v;
            }
          }
        }

        // Pass 4: Multi-token identifier match (e.g. dml, cma, cma)
        const tokens1 = norm.split(/[\s\-_]+/).filter(t => t.length >= 3);
        let bestMatch: any[] | null = null;
        let maxCommon = 1;
        for (const [k, v] of rowsMap.entries()) {
          const tokens2 = k.split(/[\s\-_]+/).filter(t => t.length >= 3);
          const common = tokens1.filter(t => tokens2.includes(t)).length;
          if (common > maxCommon) {
            maxCommon = common;
            bestMatch = v;
          }
        }
        if (bestMatch) return bestMatch;

        return [];
      };

      // Robust Store List Resolution: Prioritize cluster stores first
      const clusterStoresSet = new Set(
        [
          ...(clusterStoreNames || []).map(s => s.toUpperCase()),
          (stName || '').toUpperCase(),
          (currentStoreId || '').toUpperCase()
        ].filter(Boolean)
      );

      const storesFromNew = (parsedRows || []).map(r => r.storeName).filter(Boolean);
      const storesFromOld = (parsedOldRows || []).map(r => r.storeName).filter(Boolean);

      const isClusterStoreCheck = (name: string): boolean => {
        if (!name) return false;
        const norm = normalize(name);
        for (const cs of clusterStoresSet) {
          const normCs = normalize(cs);
          if (normCs && (norm === normCs || norm.includes(normCs) || normCs.includes(norm))) return true;
          const codeCs = cs.match(/\b\d{3,5}\b/);
          const codeName = name.match(/\b\d{3,5}\b/);
          if (codeCs && codeName && codeCs[0] === codeName[0]) return true;
        }
        return false;
      };

      const prioritizedClusterStores = [
        ...(clusterStoreNames || []),
        stName,
        currentStoreId,
        ...storesFromNew.filter(isClusterStoreCheck),
        ...storesFromOld.filter(isClusterStoreCheck)
      ].filter(Boolean);

      const allUniqueStores = Array.from(new Set([
        ...prioritizedClusterStores,
        ...storesFromNew,
        ...storesFromOld
      ].filter(Boolean)));

      const storesToProcess = allUniqueStores.length > 0
        ? allUniqueStores
        : ['STORE_DEFAULT'];

      try {
        const payloads: any[] = [];
        const updatedCache: Record<string, any> = {};
        const storeDataMap: Record<string, any> = {};

        // Helper to strip redundant storeName property on each row to optimize payload size
        const compactRows = (rows: any[]) => {
          return (rows || []).map(r => ({
            categoryName: r.categoryName || '',
            completion: Number(r.completion) || 0,
            completionRank: Number(r.completionRank) || 0,
            exceededRank: Number(r.exceededRank) || 0,
            bonus: Number(r.bonus) || 0,
            limit: Number(r.limit) || 7
          }));
        };

        for (const storeName of storesToProcess) {
          const normalizedStoreName = storeName.toUpperCase();

          const rawStoreRows = fileName
            ? getRowsForStore(storeName, newRowsByNormStore, hasStoreInNew, parsedRows || [])
            : [];
          const storeRows = compactRows(rawStoreRows);

          let rawStoreOldRows: any[] = [];
          if (oldFileName && parsedOldRows && parsedOldRows.length > 0) {
            rawStoreOldRows = getRowsForStore(storeName, oldRowsByNormStore, hasStoreInOld, parsedOldRows);
            if (rawStoreOldRows.length === 0 && globalAllStoreTargets[normalizedStoreName]?.thuongStRows?.length > 0) {
              rawStoreOldRows = globalAllStoreTargets[normalizedStoreName].thuongStRows;
            }
          } else if (oldFileName === undefined) {
            rawStoreOldRows = globalAllStoreTargets[normalizedStoreName]?.thuongStOldRows || [];
          }
          const storeOldRows = compactRows(rawStoreOldRows);

          const finalOldFileName = oldFileName !== undefined ? oldFileName : (globalAllStoreTargets[normalizedStoreName]?.excelOldFileName || '');
          const storeLimit = rawStoreRows[0]?.limit ?? detectedLimit ?? 7;
          const finalOldLimit = detectedOldLimit !== undefined ? detectedOldLimit : (rawStoreOldRows[0]?.limit ?? globalAllStoreTargets[normalizedStoreName]?.topPercentRankLimitOld ?? 7);

          const existingTargetData = globalAllStoreTargets[normalizedStoreName] || {};
          const newTargetData = {
            ...existingTargetData,
            storeName,
            excelFileName: fileName || '',
            thuongStRows: storeRows,
            topPercentRankLimit: storeLimit,
            excelOldFileName: finalOldFileName,
            thuongStOldRows: storeOldRows,
            topPercentRankLimitOld: finalOldLimit,
            updated_at: new Date().toISOString()
          };

          updatedCache[normalizedStoreName] = newTargetData;

          const isCluster = isClusterStoreCheck(storeName);

          if (isCluster || Object.keys(storeDataMap).length < 40) {
            const entry = {
              storeName,
              excelFileName: fileName || '',
              thuongStRows: storeRows,
              topPercentRankLimit: storeLimit,
              excelOldFileName: finalOldFileName,
              thuongStOldRows: storeOldRows,
              topPercentRankLimitOld: finalOldLimit,
              updatedAt: new Date().toISOString()
            };
            storeDataMap[normalizedStoreName] = entry;

            // Also add alias without numeric warehouse prefix for instant exact match
            const stripped = storeName.replace(/^\d+[\s\-_]+/, '');
            if (stripped !== storeName) {
              storeDataMap[stripped.toUpperCase()] = { ...entry, storeName: stripped };
              updatedCache[stripped.toUpperCase()] = { ...newTargetData, storeName: stripped };
            }
          }

          payloads.push({
            id: normalizeStoreId(storeName),
            warehouse_code: shortMaKho,
            ten_sieu_thi: storeName,
            taget_doanh_thu: newTargetData,
            updated_at: new Date().toISOString()
          });
        }

        // 🔥 1. Save Global Snapshot Document to Firebase Firestore for Instant Sync
        try {
          const globalDocRef = doc(db, 'app_settings', 'thuong_st_data');
          await setDoc(globalDocRef, {
            excelFileName: fileName || '',
            excelOldFileName: oldFileName || '',
            topPercentRankLimit: detectedLimit ?? 7,
            topPercentRankLimitOld: detectedOldLimit ?? 7,
            stores: storeDataMap,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: stName || currentStoreId || 'Mobile_User'
          }, { merge: true });
        } catch (fbErr) {
          console.warn('[useRTSTSharedData] Failed to write global thuong_st_data doc:', fbErr);
        }

        // 🔥 2. Write Individual Store Documents in Firebase / Supabase
        try {
          const batch = writeBatch(db);
          let count = 0;
          for (const [key, sData] of Object.entries(storeDataMap)) {
            const sDocRef = doc(db, 'store', normalizeStoreId(sData.storeName));
            batch.set(sDocRef, {
              id: normalizeStoreId(sData.storeName),
              ten_sieu_thi: sData.storeName,
              taget_doanh_thu: {
                excelFileName: sData.excelFileName,
                thuongStRows: sData.thuongStRows,
                topPercentRankLimit: sData.topPercentRankLimit,
                excelOldFileName: sData.excelOldFileName,
                thuongStOldRows: sData.thuongStOldRows,
                topPercentRankLimitOld: sData.topPercentRankLimitOld,
                updated_at: new Date().toISOString()
              },
              updated_at: serverTimestamp()
            }, { merge: true });
            count++;
            if (count >= 400) {
              await batch.commit();
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        } catch (batchErr) {
          console.warn('[useRTSTSharedData] Batch write store collection failed, fallback to upsert:', batchErr);
          try { await supabase.from('store').upsert(payloads, { onConflict: 'id' }); } catch {}
        }

        // 🔥 3. Save LocalStorage Backup for Offline Resiliency & Instant F5 Persistence
        try {
          safeSetItem('ST_EXCEL_FILE_NAME_V1', fileName || '');
          safeSetItem('ST_TOP_PERCENT_LIMIT_V1', String(detectedLimit ?? 7));
          if (oldFileName !== undefined) {
            safeSetItem('ST_EXCEL_OLD_FILE_NAME_V1', oldFileName || '');
            safeSetItem('ST_TOP_PERCENT_LIMIT_OLD_V1', String(detectedOldLimit ?? 7));
          }
          safeSetItem('ST_THUONG_ST_ALL_STORES_V1', JSON.stringify(storeDataMap));
        } catch (lsErr) {
          console.warn('LocalStorage save warning:', lsErr);
        }

        // 🔥 4. Update Local States for the Active Store Immediately
        const activeNormalized = (stName || currentStoreId || '').toUpperCase();
        let activeData = updatedCache[activeNormalized];
        if (!activeData) {
          const normActive = normalize(stName || currentStoreId || '');
          for (const key of Object.keys(updatedCache)) {
            const normKey = normalize(key);
            if (normKey === normActive || normKey.includes(normActive) || normActive.includes(normKey)) {
              activeData = updatedCache[key];
              break;
            }
          }
        }

        if (activeData) {
          setExcelFileName(activeData.excelFileName || '');
          setThuongStRows(activeData.thuongStRows || []);
          setTopPercentRankLimit(activeData.topPercentRankLimit ?? 7);
          setExcelOldFileName(activeData.excelOldFileName || '');
          setThuongStOldRows(activeData.thuongStOldRows || []);
          setTopPercentRankLimitOld(activeData.topPercentRankLimitOld ?? 7);
          try {
            safeSetItem('ST_THUONG_ST_ROWS_V1', JSON.stringify(activeData.thuongStRows || []));
            safeSetItem('ST_THUONG_ST_OLD_ROWS_V1', JSON.stringify(activeData.thuongStOldRows || []));
            setStoreItem('ST_THUONG_ST_ROWS_V1', JSON.stringify(activeData.thuongStRows || []), currentStoreId);
            setStoreItem('ST_THUONG_ST_OLD_ROWS_V1', JSON.stringify(activeData.thuongStOldRows || []), currentStoreId);
          } catch {}
        } else {
          setExcelFileName(fileName);
          setThuongStRows(parsedRows || []);
          setTopPercentRankLimit(detectedLimit);
          setExcelOldFileName(oldFileName || '');
          setThuongStOldRows(parsedOldRows || []);
          setTopPercentRankLimitOld(detectedOldLimit ?? 7);
          try {
            safeSetItem('ST_THUONG_ST_ROWS_V1', JSON.stringify(parsedRows || []));
            safeSetItem('ST_THUONG_ST_OLD_ROWS_V1', JSON.stringify(parsedOldRows || []));
            setStoreItem('ST_THUONG_ST_ROWS_V1', JSON.stringify(parsedRows || []), currentStoreId);
            setStoreItem('ST_THUONG_ST_OLD_ROWS_V1', JSON.stringify(parsedOldRows || []), currentStoreId);
          } catch {}
        }

        updateAllStoreTargets((prev: any) => ({
          ...prev,
          ...updatedCache
        }));

        const notificationMsg = fileName && oldFileName
          ? `⚡ Domino: Đã đẩy '${oldFileName}' thành Hôm Qua và nạp '${fileName}' làm Hôm Nay (Đã lưu Firebase)!`
          : (fileName ? 'Tải lên và đồng bộ dữ liệu thi đua lên Firebase thành công!' : 'Đã xóa dữ liệu thi đua trên Firebase thành công!');

        showNotification(notificationMsg, 'success');
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
    excelOldFileName,
    setExcelOldFileName,
    thuongStOldRows,
    setThuongStOldRows,
    topPercentRankLimitOld,
    setTopPercentRankLimitOld,
    isSavingStoreRevenue,
    isLoadingStoreRevenue,
    saveStoreRevenue,
    loadStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES: PRETTY_PREFIXES
  };
};
