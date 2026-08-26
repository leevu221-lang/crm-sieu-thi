/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { useStore } from '../../../contexts/StoreContext';
import { parseYcxData, parseStaffRankData, normalizeStoreId } from '../../RTST/utils';
import { cleanBiReportText } from '../../../utils/rtstHelpers';
import { StaffData } from '../../RTST/types';

const globalHealthCache: Record<string, any> = {};

export const useEmployeeHealth = (maKho: string, storeName?: string) => {
  const { isStoreReady } = useStore();
  const targetKey = storeName || maKho;
  const initialCache = globalHealthCache[targetKey];

  const [biRevenueData, setBiRevenueData] = useState<StaffData[]>(() => initialCache?.biRevenueData || []);
  const [luyKeNganhHang, setLuyKeNganhHang] = useState<string>(() => initialCache?.luyKeNganhHang || '');
  const [thiDuaNv, setThiDuaNv] = useState<string>(() => initialCache?.thiDuaNv || '');
  const [phucVu, setPhucVu] = useState<string>(() => initialCache?.phucVu || '');
  const [banKemNv, setBanKemNvInternal] = useState<string>(() => initialCache?.banKemNv || '');
  const [nganhhangChinhNv, setNganhhangChinhNvInternal] = useState<string>(() => initialCache?.nganhhangChinhNv || '');
  const [tragopNv, setTragopNvInternal] = useState<string>(() => initialCache?.tragopNv || '');
  const [dtqd3t1, setDtqd3t1Internal] = useState<string>(() => initialCache?.dtqd3t1 || '');
  const [dtqd3t2, setDtqd3t2Internal] = useState<string>(() => initialCache?.dtqd3t2 || '');
  const [dtqd3t3, setDtqd3t3Internal] = useState<string>(() => initialCache?.dtqd3t3 || '');
  const [thunhap3t1, setThunhap3t1Internal] = useState<string>(() => initialCache?.thunhap3t1 || '');
  const [thunhap3t2, setThunhap3t2Internal] = useState<string>(() => initialCache?.thunhap3t2 || '');
  const [thunhap3t3, setThunhap3t3Internal] = useState<string>(() => initialCache?.thunhap3t3 || '');
  const [nganhhang3t1, setNganhhang3t1Internal] = useState<string>(() => initialCache?.nganhhang3t1 || '');
  const [nganhhang3t2, setNganhhang3t2Internal] = useState<string>(() => initialCache?.nganhhang3t2 || '');
  const [nganhhang3t3, setNganhhang3t3Internal] = useState<string>(() => initialCache?.nganhhang3t3 || '');
  const [giocong3t1, setGiocong3t1Internal] = useState<string>(() => initialCache?.giocong3t1 || '');
  const [giocong3t2, setGiocong3t2Internal] = useState<string>(() => initialCache?.giocong3t2 || '');
  const [giocong3t3, setGiocong3t3Internal] = useState<string>(() => initialCache?.giocong3t3 || '');
  const [thidua3t1, setThidua3t1Internal] = useState<string>(() => initialCache?.thidua3t1 || '');
  const [thidua3t2, setThidua3t2Internal] = useState<string>(() => initialCache?.thidua3t2 || '');
  const [thidua3t3, setThidua3t3Internal] = useState<string>(() => initialCache?.thidua3t3 || '');
  const [tracham3t1, setTracham3t1Internal] = useState<string>(() => initialCache?.tracham3t1 || '');
  const [tracham3t2, setTracham3t2Internal] = useState<string>(() => initialCache?.tracham3t2 || '');
  const [tracham3t3, setTracham3t3Internal] = useState<string>(() => initialCache?.tracham3t3 || '');
  const [rankMonth1, setRankMonth1Internal] = useState<string>(() => initialCache?.rankMonth1 || 'Tháng 1');
  const [rankMonth2, setRankMonth2Internal] = useState<string>(() => initialCache?.rankMonth2 || 'Tháng 2');
  const [rankMonth3, setRankMonth3Internal] = useState<string>(() => initialCache?.rankMonth3 || 'Tháng 3');
  const [tenSieuThi, setTenSieuThi] = useState<string>(() => initialCache?.tenSieuThi || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasLoadedRef = useRef(false);
  const banKemDirtyRef = useRef(false);
  const banKemAutoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const nganhhangChinhDirtyRef = useRef(false);
  const nganhhangChinhAutoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const tragopDirtyRef = useRef(false);
  const tragopAutoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const rank3tDirtyRef = useRef(false);
  const rank3tAutoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Exposed setter that marks data as dirty & auto-saves immediately
  const setBanKemNv = useCallback((val: string) => {
    banKemDirtyRef.current = true;
    setBanKemNvInternal(val);
    if (globalHealthCache[targetKey]) {
      globalHealthCache[targetKey].banKemNv = val;
    }
    const cleanStore = (storeName || tenSieuThi || '').trim();
    if (maKho && cleanStore) {
      if (banKemAutoSaveRef.current) clearTimeout(banKemAutoSaveRef.current);
      banKemAutoSaveRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase.from('store').upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: maKho.trim(),
            ten_sieu_thi: cleanStore,
            ban_kem_nv: cleanBiReportText(val),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          if (!error) {
            banKemDirtyRef.current = false;
            console.log('[EmployeeHealth] Saved ban_kem_nv immediately to DB for', cleanStore);
          }
        } catch (err) {
          console.error('[EmployeeHealth] Save ban_kem_nv error:', err);
        }
      }, 300);
    }
  }, [targetKey, maKho, storeName, tenSieuThi]);

  const setNganhhangChinhNv = useCallback((val: string) => {
    nganhhangChinhDirtyRef.current = true;
    setNganhhangChinhNvInternal(val);
    if (globalHealthCache[targetKey]) {
      globalHealthCache[targetKey].nganhhangChinhNv = val;
    }
    const cleanStore = (storeName || tenSieuThi || '').trim();
    if (maKho && cleanStore) {
      if (nganhhangChinhAutoSaveRef.current) clearTimeout(nganhhangChinhAutoSaveRef.current);
      nganhhangChinhAutoSaveRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase.from('store').upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: maKho.trim(),
            ten_sieu_thi: cleanStore,
            nganhhang_chinh_nv: cleanBiReportText(val),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          if (!error) {
            nganhhangChinhDirtyRef.current = false;
            console.log('[EmployeeHealth] Saved nganhhang_chinh_nv immediately to DB for', cleanStore);
          }
        } catch (err) {
          console.error('[EmployeeHealth] Save nganhhang_chinh_nv error:', err);
        }
      }, 300);
    }
  }, [targetKey, maKho, storeName, tenSieuThi]);

  const setTragopNv = useCallback((val: string) => {
    tragopDirtyRef.current = true;
    setTragopNvInternal(val);
    if (globalHealthCache[targetKey]) {
      globalHealthCache[targetKey].tragopNv = val;
    }
  }, [targetKey]);

  const setDtqd3t1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setDtqd3t1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].dtqd3t1 = val;
  }, [targetKey]);

  const setDtqd3t2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setDtqd3t2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].dtqd3t2 = val;
  }, [targetKey]);

  const setDtqd3t3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setDtqd3t3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].dtqd3t3 = val;
  }, [targetKey]);

  const setThunhap3t1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setThunhap3t1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].thunhap3t1 = val;
  }, [targetKey]);

  const setThunhap3t2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setThunhap3t2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].thunhap3t2 = val;
  }, [targetKey]);

  const setThunhap3t3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setThunhap3t3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].thunhap3t3 = val;
  }, [targetKey]);

  const setNganhhang3t1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setNganhhang3t1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].nganhhang3t1 = val;
  }, [targetKey]);

  const setNganhhang3t2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setNganhhang3t2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].nganhhang3t2 = val;
  }, [targetKey]);

  const setNganhhang3t3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setNganhhang3t3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].nganhhang3t3 = val;
  }, [targetKey]);

  const setTracham3t1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setTracham3t1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].tracham3t1 = val;
  }, [targetKey]);

  const setTracham3t2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setTracham3t2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].tracham3t2 = val;
  }, [targetKey]);

  const setTracham3t3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setTracham3t3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].tracham3t3 = val;
  }, [targetKey]);

  const setGiocong3t1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setGiocong3t1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].giocong3t1 = val;
  }, [targetKey]);

  const setGiocong3t2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setGiocong3t2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].giocong3t2 = val;
  }, [targetKey]);

  const setGiocong3t3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setGiocong3t3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].giocong3t3 = val;
  }, [targetKey]);

  const setThidua3t1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setThidua3t1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].thidua3t1 = val;
  }, [targetKey]);

  const setThidua3t2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setThidua3t2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].thidua3t2 = val;
  }, [targetKey]);

  const setThidua3t3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setThidua3t3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].thidua3t3 = val;
  }, [targetKey]);

  const setRankMonth1 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setRankMonth1Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].rankMonth1 = val;
  }, [targetKey]);

  const setRankMonth2 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setRankMonth2Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].rankMonth2 = val;
  }, [targetKey]);

  const setRankMonth3 = useCallback((val: string) => {
    rank3tDirtyRef.current = true;
    setRankMonth3Internal(val);
    if (globalHealthCache[targetKey]) globalHealthCache[targetKey].rankMonth3 = val;
  }, [targetKey]);

  const fetchAndMergeData = useCallback(async () => {
    if (!maKho) return;
    setIsLoading(true);
    try {
      const maKhoNum = parseInt(maKho, 10);
      const warehouseFilter = !isNaN(maKhoNum) 
        ? `warehouse_code.eq.${maKho},warehouse_code.eq.${maKhoNum}`
        : `warehouse_code.eq.${maKho}`;

      let rtQuery;
      let lkQuery;

      if (storeName && storeName !== 'ALL') {
        // Single store mode: query directly by store name (document ID / ten_sieu_thi)
        // This avoids composite index requirements and case-sensitive ilike issues
        const cleanStore = storeName.trim();
        rtQuery = supabase
          .from('store')
          .select('ycx_rt, ten_sieu_thi, updated_at')
          .eq('ten_sieu_thi', cleanStore);
        lkQuery = supabase
          .from('store')
          .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, tragop_nv, nganhhang_chinh_nv, dtqd_3t_1, dtqd_3t_2, dtqd_3t_3, thunhap_3t_1, thunhap_3t_2, thunhap_3t_3, nganhhang_3t_1, nganhhang_3t_2, nganhhang_3t_3, giocong_3t_1, giocong_3t_2, giocong_3t_3, rank_month_1, rank_month_2, rank_month_3, ten_sieu_thi, updated_at')
          .eq('id', normalizeStoreId(cleanStore));
      } else {
        // ALL stores mode: query by warehouse_code
        rtQuery = supabase
          .from('store')
          .select('ycx_rt, ten_sieu_thi, updated_at')
          .or(warehouseFilter);
        lkQuery = supabase
          .from('store')
          .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, tragop_nv, nganhhang_chinh_nv, dtqd_3t_1, dtqd_3t_2, dtqd_3t_3, thunhap_3t_1, thunhap_3t_2, thunhap_3t_3, nganhhang_3t_1, nganhhang_3t_2, nganhhang_3t_3, giocong_3t_1, giocong_3t_2, giocong_3t_3, rank_month_1, rank_month_2, rank_month_3, ten_sieu_thi, updated_at')
          .or(warehouseFilter);
      }

      console.log(`[EmployeeHealth] fetchAndMergeData → storeName="${storeName}", maKho="${maKho}"`);

      const [
        { data: rtDataArrRaw, error: rtError }, 
        { data: lkDataArrRaw, error: lkError }
      ] = await Promise.all([rtQuery, lkQuery]);

      console.log(`[EmployeeHealth] rtDataArrRaw:`, rtDataArrRaw, 'rtError:', rtError);
      console.log(`[EmployeeHealth] lkDataArrRaw:`, lkDataArrRaw, 'lkError:', lkError);

      // Normalize: maybeSingle() returns object, query returns array - handle both
      const normalizeToArray = (d: any): any[] => {
        if (!d) return [];
        if (Array.isArray(d)) return d;
        return [d];
      };

      // Fallback: if single-store lk query returned nothing, query by warehouse_code
      // This handles edge cases where document doesn't exist or ID mismatch
      let effectiveLkDataArr = normalizeToArray(lkDataArrRaw);
      if (storeName && storeName !== 'ALL' && effectiveLkDataArr.length === 0) {
        console.log(`[EmployeeHealth] lkQuery by ID returned empty, falling back to warehouse_code query...`);
        const { data: fallbackData } = await supabase
          .from('store')
          .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, tragop_nv, dtqd_3t_1, dtqd_3t_2, dtqd_3t_3, thunhap_3t_1, thunhap_3t_2, thunhap_3t_3, nganhhang_3t_1, nganhhang_3t_2, nganhhang_3t_3, giocong_3t_1, giocong_3t_2, giocong_3t_3, rank_month_1, rank_month_2, rank_month_3, ten_sieu_thi, updated_at')
          .or(warehouseFilter);
        console.log(`[EmployeeHealth] Fallback lk data:`, fallbackData);
        if (fallbackData) {
          const arr = normalizeToArray(fallbackData);
          const cleanStore = storeName.trim().toUpperCase();
          const match = arr.filter(d => (d.ten_sieu_thi || d.id || '').trim().toUpperCase() === cleanStore);
          effectiveLkDataArr = match.length > 0 ? match : arr;
          console.log(`[EmployeeHealth] Using fallback data (${effectiveLkDataArr.length} records)`);
        }
      }

      // Sort client-side by updated_at descending
      const sortByUpdated = (arr: any[]) => [...arr].sort((a: any, b: any) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });

      const rtDataArr = sortByUpdated(normalizeToArray(rtDataArrRaw));
      const lkDataArr = sortByUpdated(effectiveLkDataArr);

      console.log(`[EmployeeHealth] rtDataArr (${rtDataArr.length}):`, rtDataArr.map(r => r.ten_sieu_thi));
      console.log(`[EmployeeHealth] lkDataArr (${lkDataArr.length}):`, lkDataArr.map(r => r.id || r.ten_sieu_thi));

      // Pick the correct store record from the results
      let lkData: any = null;
      let globalLuyKe: any = null;
      let rtData: any = null;

      if (lkDataArr && lkDataArr.length > 0) {
        lkData = lkDataArr[0];
        globalLuyKe = lkData;
      }

      if (rtDataArr && rtDataArr.length > 0) {
        // In single-store mode, the query already filtered by ten_sieu_thi, so just take first result
        // In ALL mode, take first (most recently updated)
        rtData = rtDataArr[0];
      }

      if (rtError) console.error('[EmployeeHealth] RT Error:', rtError);
      if (lkError) console.error('[EmployeeHealth] LK Error:', lkError);
      
      const isAllMode = !storeName || storeName === 'ALL';

      const ycxRaw = isAllMode
        ? (rtDataArr || []).map(r => r.ycx_rt || '').filter(Boolean).join('\n')
        : (rtData?.ycx_rt || '');

      const lkRaw = isAllMode
        ? (lkDataArr || []).map(r => r.lk_dt_nv || '').filter(Boolean).join('\n')
        : (lkData?.lk_dt_nv || '');

      const lkNhRaw = isAllMode
        ? (lkDataArr || []).map(r => r.lk_nh_sieu_thi || '').filter(Boolean).join('\n')
        : (globalLuyKe?.lk_nh_sieu_thi || lkDataArr?.find((r: any) => r.lk_nh_sieu_thi)?.lk_nh_sieu_thi || '');

      const lkTdRaw = isAllMode
        ? (lkDataArr || []).map(r => r.lk_td_nv || '').filter(Boolean).join('\n')
        : (lkData?.lk_td_nv || '');

      const phucVuRaw = isAllMode
        ? (lkDataArr || []).map(r => r.phuc_vu || '').filter(Boolean).join('\n')
        : (lkData?.phuc_vu || '');

      const banKemNvRaw = isAllMode
        ? (lkDataArr || []).map(r => r.ban_kem_nv || '').filter(Boolean).join('\n')
        : (lkData?.ban_kem_nv || '');

      const tragopNvRaw = isAllMode
        ? (lkDataArr || []).map(r => r.tragop_nv || '').filter(Boolean).join('\n')
        : (lkData?.tragop_nv || '');

      const nganhhangChinhNvRaw = isAllMode
        ? (lkDataArr || []).map(r => r.nganhhang_chinh_nv || '').filter(Boolean).join('\n')
        : (lkData?.nganhhang_chinh_nv || '');

      const dtqd3t1Raw = isAllMode
        ? (lkDataArr || []).map(r => r.dtqd_3t_1 || '').filter(Boolean).join('\n')
        : (lkData?.dtqd_3t_1 || '');
      const dtqd3t2Raw = isAllMode
        ? (lkDataArr || []).map(r => r.dtqd_3t_2 || '').filter(Boolean).join('\n')
        : (lkData?.dtqd_3t_2 || '');
      const dtqd3t3Raw = isAllMode
        ? (lkDataArr || []).map(r => r.dtqd_3t_3 || '').filter(Boolean).join('\n')
        : (lkData?.dtqd_3t_3 || '');

      const mergeTnJson = (records: any[], field: string, singleVal?: string): string => {
        const merged: Record<string, string> = {};
        let found = false;
        (records || []).forEach(r => {
          const val = r?.[field];
          if (val && typeof val === 'string' && val.trim().startsWith('{')) {
            try {
              const p = JSON.parse(val);
              if (p && typeof p === 'object' && Object.keys(p).length > 0) {
                Object.assign(merged, p);
                found = true;
              }
            } catch {}
          }
        });
        if (singleVal && typeof singleVal === 'string' && singleVal.trim().startsWith('{')) {
          try {
            const p = JSON.parse(singleVal);
            if (p && typeof p === 'object' && Object.keys(p).length > 0) {
              Object.assign(merged, p);
              found = true;
            }
          } catch {}
        }
        if (found && Object.keys(merged).length > 0) return JSON.stringify(merged);
        return singleVal || '';
      };

      const thunhap3t1Raw = mergeTnJson(lkDataArr, 'thunhap_3t_1', lkData?.thunhap_3t_1);
      const thunhap3t2Raw = mergeTnJson(lkDataArr, 'thunhap_3t_2', lkData?.thunhap_3t_2);
      const thunhap3t3Raw = mergeTnJson(lkDataArr, 'thunhap_3t_3', lkData?.thunhap_3t_3);

      const nganhhang3t1Raw = isAllMode
        ? (lkDataArr || []).map(r => r.nganhhang_3t_1 || '').filter(Boolean).join('\n')
        : (lkData?.nganhhang_3t_1 || '');
      const nganhhang3t2Raw = isAllMode
        ? (lkDataArr || []).map(r => r.nganhhang_3t_2 || '').filter(Boolean).join('\n')
        : (lkData?.nganhhang_3t_2 || '');
      const nganhhang3t3Raw = isAllMode
        ? (lkDataArr || []).map(r => r.nganhhang_3t_3 || '').filter(Boolean).join('\n')
        : (lkData?.nganhhang_3t_3 || '');

      const giocong3t1Raw = isAllMode
        ? (lkDataArr || []).map(r => r.giocong_3t_1 || '').filter(Boolean).join('\n')
        : (lkData?.giocong_3t_1 || '');
      const giocong3t2Raw = isAllMode
        ? (lkDataArr || []).map(r => r.giocong_3t_2 || '').filter(Boolean).join('\n')
        : (lkData?.giocong_3t_2 || '');
      const giocong3t3Raw = isAllMode
        ? (lkDataArr || []).map(r => r.giocong_3t_3 || '').filter(Boolean).join('\n')
        : (lkData?.giocong_3t_3 || '');

      const thidua3t1Raw = isAllMode
        ? (lkDataArr || []).map(r => r.thidua_3t_1 || '').filter(Boolean).join('\n')
        : (lkData?.thidua_3t_1 || '');
      const thidua3t2Raw = isAllMode
        ? (lkDataArr || []).map(r => r.thidua_3t_2 || '').filter(Boolean).join('\n')
        : (lkData?.thidua_3t_2 || '');
      const thidua3t3Raw = isAllMode
        ? (lkDataArr || []).map(r => r.thidua_3t_3 || '').filter(Boolean).join('\n')
        : (lkData?.thidua_3t_3 || '');

      const tracham3t1Raw = isAllMode
        ? (lkDataArr || []).map(r => r.tracham_3t_1 || '').filter(Boolean).join('\n')
        : (lkData?.tracham_3t_1 || '');
      const tracham3t2Raw = isAllMode
        ? (lkDataArr || []).map(r => r.tracham_3t_2 || '').filter(Boolean).join('\n')
        : (lkData?.tracham_3t_2 || '');
      const tracham3t3Raw = isAllMode
        ? (lkDataArr || []).map(r => r.tracham_3t_3 || '').filter(Boolean).join('\n')
        : (lkData?.tracham_3t_3 || '');

      const rankMonth1Raw = isAllMode
        ? 'Tháng 1'
        : (lkData?.rank_month_1 || 'Tháng 1');
      const rankMonth2Raw = isAllMode
        ? 'Tháng 2'
        : (lkData?.rank_month_2 || 'Tháng 2');
      const rankMonth3Raw = isAllMode
        ? 'Tháng 3'
        : (lkData?.rank_month_3 || 'Tháng 3');

      const tenSieuThiVal = isAllMode
        ? 'TẤT CẢ SIÊU THỊ'
        : (lkData?.ten_sieu_thi || rtData?.ten_sieu_thi || storeName || '');

      console.log(`[EmployeeHealth] lkRaw length: ${lkRaw.length}, ycxRaw length: ${ycxRaw.length}, lkNhRaw: ${lkNhRaw.length}`);

      setLuyKeNganhHang(lkNhRaw);
      setThiDuaNv(lkTdRaw);
      setPhucVu(phucVuRaw);
      
      if (!banKemDirtyRef.current) {
        setBanKemNvInternal(banKemNvRaw);
      }
      if (!tragopDirtyRef.current) {
        setTragopNvInternal(tragopNvRaw);
      }
      if (!nganhhangChinhDirtyRef.current) {
        setNganhhangChinhNvInternal(nganhhangChinhNvRaw);
      }
      if (!rank3tDirtyRef.current) {
        setDtqd3t1Internal(dtqd3t1Raw);
        setDtqd3t2Internal(dtqd3t2Raw);
        setDtqd3t3Internal(dtqd3t3Raw);
        setThunhap3t1Internal(thunhap3t1Raw);
        setThunhap3t2Internal(thunhap3t2Raw);
        setThunhap3t3Internal(thunhap3t3Raw);
        setNganhhang3t1Internal(nganhhang3t1Raw);
        setNganhhang3t2Internal(nganhhang3t2Raw);
        setNganhhang3t3Internal(nganhhang3t3Raw);
        setGiocong3t1Internal(giocong3t1Raw);
        setGiocong3t2Internal(giocong3t2Raw);
        setGiocong3t3Internal(giocong3t3Raw);
        setThidua3t1Internal(thidua3t1Raw);
        setThidua3t2Internal(thidua3t2Raw);
        setThidua3t3Internal(thidua3t3Raw);
        setTracham3t1Internal(tracham3t1Raw);
        setTracham3t2Internal(tracham3t2Raw);
        setTracham3t3Internal(tracham3t3Raw);
        setRankMonth1Internal(rankMonth1Raw);
        setRankMonth2Internal(rankMonth2Raw);
        setRankMonth3Internal(rankMonth3Raw);
      }
      setTenSieuThi(tenSieuThiVal);
      hasLoadedRef.current = true;

      const ycxStaffData = ycxRaw ? parseYcxData(ycxRaw) : [];
      const biData = lkRaw ? parseStaffRankData(lkRaw) : [];
      
      // Merge YCX DTQĐ into BI Data to ensure latest values are shown in the ranking table
      const mergedBiData = biData.map(staff => {
        // Match by employee ID (fullId)
        const ycxMatch = ycxStaffData.find(y => y.staffName?.startsWith(staff.fullId));
        
        if (ycxMatch && ycxMatch.convertedRevenue > 0) {
          return {
            ...staff,
            virtualVal: ycxMatch.convertedRevenue
          };
        }
        return staff;
      });

      console.log(`[EmployeeHealth] biData: ${biData.length} staff, mergedBiData: ${mergedBiData.length} staff`);

      // Update global cache
      const tKey = storeName || maKho;
      globalHealthCache[tKey] = {
        biRevenueData: mergedBiData,
        ycxRaw,
        lkRaw,
        luyKeNganhHang: lkNhRaw,
        thiDuaNv: lkTdRaw,
        phucVu: phucVuRaw,
        banKemNv: banKemNvRaw,
        tragopNv: tragopNvRaw,
        nganhhangChinhNv: nganhhangChinhNvRaw,
        dtqd3t1: dtqd3t1Raw,
        dtqd3t2: dtqd3t2Raw,
        dtqd3t3: dtqd3t3Raw,
        thunhap3t1: thunhap3t1Raw,
        thunhap3t2: thunhap3t2Raw,
        thunhap3t3: thunhap3t3Raw,
        nganhhang3t1: nganhhang3t1Raw,
        nganhhang3t2: nganhhang3t2Raw,
        nganhhang3t3: nganhhang3t3Raw,
        giocong3t1: giocong3t1Raw,
        giocong3t2: giocong3t2Raw,
        giocong3t3: giocong3t3Raw,
        thidua3t1: thidua3t1Raw,
        thidua3t2: thidua3t2Raw,
        thidua3t3: thidua3t3Raw,
        tracham3t1: tracham3t1Raw,
        tracham3t2: tracham3t2Raw,
        tracham3t3: tracham3t3Raw,
        rankMonth1: rankMonth1Raw,
        rankMonth2: rankMonth2Raw,
        rankMonth3: rankMonth3Raw,
        tenSieuThi: tenSieuThiVal
      };

      setBiRevenueData(mergedBiData);
    } catch (error: any) {
      console.error('Error fetching employee health data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [maKho, storeName]);

  // PERF: Use a ref for fetchAndMergeData to avoid subscription re-creation when storeName changes.
  const fetchRef = useRef(fetchAndMergeData);
  useEffect(() => { fetchRef.current = fetchAndMergeData; }, [fetchAndMergeData]);

  // PERF: Debounced refetch to prevent rapid consecutive fetches from realtime events.
  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedRefetch = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    realtimeDebounceRef.current = setTimeout(() => {
      fetchRef.current();
    }, 500); // 500ms debounce for fast sync
  }, []);

  // Effect 1: Cache-first UI update and immediate fetch on store name changes
  useEffect(() => {
    if (!maKho) return;
    
    // PERF: Cache-first store switching to prevent UI flash
    const tKey = storeName || maKho;
    const cached = globalHealthCache[tKey];
    
    if (cached) {
      setBiRevenueData(cached.biRevenueData);
      setLuyKeNganhHang(cached.luyKeNganhHang);
      setThiDuaNv(cached.thiDuaNv);
      setPhucVu(cached.phucVu);
      setTenSieuThi(cached.tenSieuThi);
      if (!banKemDirtyRef.current) setBanKemNvInternal(cached.banKemNv);
      if (!tragopDirtyRef.current) setTragopNvInternal(cached.tragopNv);
      if (!nganhhangChinhDirtyRef.current) setNganhhangChinhNvInternal(cached.nganhhangChinhNv || '');
      if (!rank3tDirtyRef.current) {
        setDtqd3t1Internal(cached.dtqd3t1 || '');
        setDtqd3t2Internal(cached.dtqd3t2 || '');
        setDtqd3t3Internal(cached.dtqd3t3 || '');
        setThunhap3t1Internal(cached.thunhap3t1 || '');
        setThunhap3t2Internal(cached.thunhap3t2 || '');
        setThunhap3t3Internal(cached.thunhap3t3 || '');
        setNganhhang3t1Internal(cached.nganhhang3t1 || '');
        setNganhhang3t2Internal(cached.nganhhang3t2 || '');
        setNganhhang3t3Internal(cached.nganhhang3t3 || '');
        setGiocong3t1Internal(cached.giocong3t1 || '');
        setGiocong3t2Internal(cached.giocong3t2 || '');
        setGiocong3t3Internal(cached.giocong3t3 || '');
        setThidua3t1Internal(cached.thidua3t1 || '');
        setThidua3t2Internal(cached.thidua3t2 || '');
        setThidua3t3Internal(cached.thidua3t3 || '');
        setTracham3t1Internal(cached.tracham3t1 || '');
        setTracham3t2Internal(cached.tracham3t2 || '');
        setTracham3t3Internal(cached.tracham3t3 || '');
        setRankMonth1Internal(cached.rankMonth1 || 'Tháng 1');
        setRankMonth2Internal(cached.rankMonth2 || 'Tháng 2');
        setRankMonth3Internal(cached.rankMonth3 || 'Tháng 3');
      }
    }
    
    // Reset dirty flag when switching stores to avoid stale banKemNv
    banKemDirtyRef.current = false;
    tragopDirtyRef.current = false;
    nganhhangChinhDirtyRef.current = false;
    rank3tDirtyRef.current = false;
    hasLoadedRef.current = false;
    
    // Execute data fetch directly with latest closure
    fetchAndMergeData();
  }, [maKho, storeName, fetchAndMergeData]);

  // Effect 2: Manage realtime subscription channel for the current store
  useEffect(() => {
    if (!maKho) return;

    const cleanMaKho = maKho.trim().replace(/^0+/, '');

    // PERF: Subscriptions consolidated and filtered by specific columns we monitor
    const ehChannel = supabase
      .channel(`eh_store_${cleanMaKho}_${storeName || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store', filter: `warehouse_code=eq.${cleanMaKho}` },
        (payload: any) => {
          if (payload.new) {
            const record = payload.new as any;
            const recordStore = record.ten_sieu_thi || '';
            const normRecordStore = recordStore.trim().toUpperCase();
            const normActiveStore = (storeName || '').trim().toUpperCase();
            if (normRecordStore && normActiveStore && normRecordStore !== normActiveStore) return;

            const tKey = storeName || maKho;
            const cached = globalHealthCache[tKey];
            if (!cached) {
              debouncedRefetch();
              return;
            }

            const hasChanged = 
              (record.ycx_rt !== undefined && record.ycx_rt !== (cached.ycxRaw || '')) ||
              (record.lk_dt_nv !== undefined && record.lk_dt_nv !== (cached.lkRaw || '')) ||
              (record.lk_nh_sieu_thi !== undefined && record.lk_nh_sieu_thi !== (cached.luyKeNganhHang || '')) ||
              (record.lk_td_nv !== undefined && record.lk_td_nv !== (cached.thiDuaNv || '')) ||
              (record.phuc_vu !== undefined && record.phuc_vu !== (cached.phucVu || '')) ||
              (!banKemDirtyRef.current && record.ban_kem_nv !== undefined && record.ban_kem_nv !== (cached.banKemNv || '')) ||
              (!tragopDirtyRef.current && record.tragop_nv !== undefined && record.tragop_nv !== (cached.tragopNv || '')) ||
              (!nganhhangChinhDirtyRef.current && record.nganhhang_chinh_nv !== undefined && record.nganhhang_chinh_nv !== (cached.nganhhangChinhNv || ''));

            if (hasChanged) {
              console.log('[EmployeeHealth] Monitored column change detected, refetching...');
              debouncedRefetch();
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(ehChannel);
    };
  }, [maKho, storeName, debouncedRefetch]);

  // Auto-save ranking 3T fields to DB with 2s debounce
  useEffect(() => {
    if (!maKho || !hasLoadedRef.current || !rank3tDirtyRef.current) return;
    if (!isStoreReady) return; // MULTI-STORE GUARD
    const cleanStore = (storeName || tenSieuThi || '').trim();
    if (!cleanStore) return;

    if (rank3tAutoSaveRef.current) {
      clearTimeout(rank3tAutoSaveRef.current);
    }

    rank3tAutoSaveRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: maKho.trim(),
            ten_sieu_thi: cleanStore,
            dtqd_3t_1: dtqd3t1,
            dtqd_3t_2: dtqd3t2,
            dtqd_3t_3: dtqd3t3,
            thunhap_3t_1: thunhap3t1,
            thunhap_3t_2: thunhap3t2,
            thunhap_3t_3: thunhap3t3,
            nganhhang_3t_1: nganhhang3t1,
            nganhhang_3t_2: nganhhang3t2,
            nganhhang_3t_3: nganhhang3t3,
            giocong_3t_1: giocong3t1,
            giocong_3t_2: giocong3t2,
            giocong_3t_3: giocong3t3,
            thidua_3t_1: thidua3t1,
            thidua_3t_2: thidua3t2,
            thidua_3t_3: thidua3t3,
            tracham_3t_1: tracham3t1,
            tracham_3t_2: tracham3t2,
            tracham_3t_3: tracham3t3,
            rank_month_1: rankMonth1,
            rank_month_2: rankMonth2,
            rank_month_3: rankMonth3,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (error) {
          console.error('[EmployeeHealth] Auto-save rank 3T error:', error);
        } else {
          rank3tDirtyRef.current = false;
        }
      } catch (err) {
        console.error('[EmployeeHealth] Auto-save rank 3T failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 300);

    return () => {
      if (rank3tAutoSaveRef.current) clearTimeout(rank3tAutoSaveRef.current);
      if (rank3tDirtyRef.current) {
        const cleanStoreVal = (storeName || tenSieuThi || '').trim();
        if (cleanStoreVal && maKho) {
          supabase
            .from('store')
            .upsert({
              id: normalizeStoreId(cleanStoreVal),
              warehouse_code: maKho.trim(),
              ten_sieu_thi: cleanStoreVal,
              dtqd_3t_1: dtqd3t1,
              dtqd_3t_2: dtqd3t2,
              dtqd_3t_3: dtqd3t3,
              thunhap_3t_1: thunhap3t1,
              thunhap_3t_2: thunhap3t2,
              thunhap_3t_3: thunhap3t3,
              nganhhang_3t_1: nganhhang3t1,
              nganhhang_3t_2: nganhhang3t2,
              nganhhang_3t_3: nganhhang3t3,
              giocong_3t_1: giocong3t1,
              giocong_3t_2: giocong3t2,
              giocong_3t_3: giocong3t3,
              thidua_3t_1: thidua3t1,
              thidua_3t_2: thidua3t2,
              thidua_3t_3: thidua3t3,
              tracham_3t_1: tracham3t1,
              tracham_3t_2: tracham3t2,
              tracham_3t_3: tracham3t3,
              rank_month_1: rankMonth1,
              rank_month_2: rankMonth2,
              rank_month_3: rankMonth3,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .then((res: any) => {
              if (res.error) console.error('[EmployeeHealth] Auto-save rank 3T on unmount error:', res.error);
            });
        }
      }
    };
  }, [dtqd3t1, dtqd3t2, dtqd3t3, thunhap3t1, thunhap3t2, thunhap3t3, nganhhang3t1, nganhhang3t2, nganhhang3t3, giocong3t1, giocong3t2, giocong3t3, thidua3t1, thidua3t2, thidua3t3, tracham3t1, tracham3t2, tracham3t3, rankMonth1, rankMonth2, rankMonth3, maKho, storeName, tenSieuThi, isStoreReady]);

  // Auto-save banKemNv to DB with 2s debounce
  useEffect(() => {
    if (!maKho || !hasLoadedRef.current || !banKemDirtyRef.current) return;
    if (!isStoreReady) return; // MULTI-STORE GUARD: Don't auto-save during store switch
    const cleanStore = (storeName || tenSieuThi || '').trim();
    if (!cleanStore) return;

    if (banKemAutoSaveRef.current) {
      clearTimeout(banKemAutoSaveRef.current);
    }

    banKemAutoSaveRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: maKho.trim(),
            ten_sieu_thi: cleanStore,
            ban_kem_nv: banKemNv,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (error) {
          console.error('[EmployeeHealth] Auto-save ban_kem_nv error:', error);
        } else {
          banKemDirtyRef.current = false; // Clear dirty flag after successful save
        }
      } catch (err) {
        console.error('[EmployeeHealth] Auto-save ban_kem_nv failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (banKemAutoSaveRef.current) clearTimeout(banKemAutoSaveRef.current);
      if (banKemDirtyRef.current) {
        const cleanStoreVal = (storeName || tenSieuThi || '').trim();
        if (cleanStoreVal && maKho) {
          supabase
            .from('store')
            .upsert({
              id: normalizeStoreId(cleanStoreVal),
              warehouse_code: maKho.trim(),
              ten_sieu_thi: cleanStoreVal,
              ban_kem_nv: banKemNv,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .then((res: any) => {
              if (res.error) console.error('[EmployeeHealth] Auto-save on unmount error:', res.error);
            });
        }
      }
    };
  }, [banKemNv, maKho, storeName, tenSieuThi, isStoreReady]);

  // Auto-save tragopNv to DB with 2s debounce
  useEffect(() => {
    if (!maKho || !hasLoadedRef.current || !tragopDirtyRef.current) return;
    if (!isStoreReady) return; // MULTI-STORE GUARD: Don't auto-save during store switch
    const cleanStore = (storeName || tenSieuThi || '').trim();
    if (!cleanStore) return;

    if (tragopAutoSaveRef.current) {
      clearTimeout(tragopAutoSaveRef.current);
    }

    tragopAutoSaveRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: maKho.trim(),
            ten_sieu_thi: cleanStore,
            tragop_nv: tragopNv,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (error) {
          console.error('[EmployeeHealth] Auto-save tragop_nv error:', error);
        } else {
          tragopDirtyRef.current = false; // Clear dirty flag after successful save
        }
      } catch (err) {
        console.error('[EmployeeHealth] Auto-save tragop_nv failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (tragopAutoSaveRef.current) clearTimeout(tragopAutoSaveRef.current);
      if (tragopDirtyRef.current) {
        const cleanStoreVal = (storeName || tenSieuThi || '').trim();
        if (cleanStoreVal && maKho) {
          supabase
            .from('store')
            .upsert({
              id: normalizeStoreId(cleanStoreVal),
              warehouse_code: maKho.trim(),
              ten_sieu_thi: cleanStoreVal,
              tragop_nv: tragopNv,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .then((res: any) => {
              if (res.error) console.error('[EmployeeHealth] Auto-save tragop_nv on unmount error:', res.error);
            });
        }
      }
    };
  }, [tragopNv, maKho, storeName, tenSieuThi, isStoreReady]);

  // Auto-save nganhhangChinhNv to DB with 2s debounce
  useEffect(() => {
    if (!maKho || !hasLoadedRef.current || !nganhhangChinhDirtyRef.current) return;
    if (!isStoreReady) return;
    const cleanStore = (storeName || tenSieuThi || '').trim();
    if (!cleanStore) return;

    if (nganhhangChinhAutoSaveRef.current) {
      clearTimeout(nganhhangChinhAutoSaveRef.current);
    }

    nganhhangChinhAutoSaveRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: maKho.trim(),
            ten_sieu_thi: cleanStore,
            nganhhang_chinh_nv: nganhhangChinhNv,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (error) {
          console.error('[EmployeeHealth] Auto-save nganhhang_chinh_nv error:', error);
        } else {
          nganhhangChinhDirtyRef.current = false;
        }
      } catch (err) {
        console.error('[EmployeeHealth] Auto-save nganhhang_chinh_nv failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (nganhhangChinhAutoSaveRef.current) clearTimeout(nganhhangChinhAutoSaveRef.current);
      if (nganhhangChinhDirtyRef.current) {
        const cleanStoreVal = (storeName || tenSieuThi || '').trim();
        if (cleanStoreVal && maKho) {
          supabase
            .from('store')
            .upsert({
              id: normalizeStoreId(cleanStoreVal),
              warehouse_code: maKho.trim(),
              ten_sieu_thi: cleanStoreVal,
              nganhhang_chinh_nv: nganhhangChinhNv,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .then((res: any) => {
              if (res.error) console.error('[EmployeeHealth] Auto-save nganhhang_chinh_nv on unmount error:', res.error);
            });
        }
      }
    };
  }, [nganhhangChinhNv, maKho, storeName, tenSieuThi, isStoreReady]);

  const refresh = useCallback(() => {
    fetchAndMergeData();
  }, [fetchAndMergeData]);

  const savePhucVu = useCallback(async (data: string) => {
    if (!maKho) return;
    const cleanMaKho = maKho.trim();
    const cleanStore = (storeName || tenSieuThi || '').trim();
    
    if (!cleanStore) {
      console.error('[EmployeeHealth] Cannot save phuc_vu: no store name available');
      throw new Error('Chưa xác định được tên siêu thị. Vui lòng chọn siêu thị.');
    }
    
    setPhucVu(data); // Optimistic update
    setIsSaving(true);
    try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: cleanMaKho,
            ten_sieu_thi: cleanStore,
            phuc_vu: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving phuc vu data:', error);
      setPhucVu(''); // Revert optimistic update on failure
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [maKho, tenSieuThi, storeName]);

  const saveBanKemNv = useCallback(async (data: string) => {
    if (!maKho) return;
    const cleanMaKho = maKho.trim();
    const cleanStore = (storeName || tenSieuThi || '').trim();
    
    if (!cleanStore) {
      console.error('[EmployeeHealth] Cannot save ban_kem_nv: no store name available');
      throw new Error('Chưa xác định được tên siêu thị. Vui lòng chọn siêu thị.');
    }
    
    setBanKemNvInternal(data); // Optimistic update
    banKemDirtyRef.current = false; // Manual save clears dirty
    setIsSaving(true);
    try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: cleanMaKho,
            ten_sieu_thi: cleanStore,
            ban_kem_nv: cleanBiReportText(data),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving ban kem nv data:', error);
      setBanKemNvInternal(''); // Revert optimistic update on failure
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [maKho, tenSieuThi, storeName]);

  const saveNganhhangChinhNv = useCallback(async (data: string) => {
    if (!maKho) return;
    const cleanMaKho = maKho.trim();
    const cleanStore = (storeName || tenSieuThi || '').trim();
    
    if (!cleanStore) {
      console.error('[EmployeeHealth] Cannot save nganhhang_chinh_nv: no store name available');
      throw new Error('Chưa xác định được tên siêu thị. Vui lòng chọn siêu thị.');
    }
    
    setNganhhangChinhNvInternal(data); // Optimistic update
    nganhhangChinhDirtyRef.current = false; // Manual save clears dirty
    setIsSaving(true);
    try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: cleanMaKho,
            ten_sieu_thi: cleanStore,
            nganhhang_chinh_nv: cleanBiReportText(data),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving nganhhang_chinh_nv data:', error);
      setNganhhangChinhNvInternal(''); // Revert optimistic update on failure
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [maKho, tenSieuThi, storeName]);

  const saveTragopNv = useCallback(async (data: string) => {
    if (!maKho) return;
    const cleanMaKho = maKho.trim();
    const cleanStore = (storeName || tenSieuThi || '').trim();
    
    if (!cleanStore) {
      console.error('[EmployeeHealth] Cannot save tragop_nv: no store name available');
      throw new Error('Chưa xác định được tên siêu thị. Vui lòng chọn siêu thị.');
    }
    
    setTragopNvInternal(data); // Optimistic update
    tragopDirtyRef.current = false; // Manual save clears dirty
    setIsSaving(true);
    try {
        const { error } = await supabase
          .from('store')
          .upsert({
            id: normalizeStoreId(cleanStore),
            warehouse_code: cleanMaKho,
            ten_sieu_thi: cleanStore,
            tragop_nv: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tragop nv data:', error);
      setTragopNvInternal(''); // Revert optimistic update on failure
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [maKho, tenSieuThi, storeName]);

  return {
    biRevenueData,
    luyKeNganhHang,
    thiDuaNv,
    phucVu,
    banKemNv,
    tragopNv,
    dtqd3t1, setDtqd3t1,
    dtqd3t2, setDtqd3t2,
    dtqd3t3, setDtqd3t3,
    thunhap3t1, setThunhap3t1,
    thunhap3t2, setThunhap3t2,
    thunhap3t3, setThunhap3t3,
    nganhhang3t1, setNganhhang3t1,
    nganhhang3t2, setNganhhang3t2,
    nganhhang3t3, setNganhhang3t3,
    giocong3t1, setGiocong3t1,
    giocong3t2, setGiocong3t2,
    giocong3t3, setGiocong3t3,
    thidua3t1, setThidua3t1,
    thidua3t2, setThidua3t2,
    thidua3t3, setThidua3t3,
    tracham3t1, setTracham3t1,
    tracham3t2, setTracham3t2,
    tracham3t3, setTracham3t3,
    rankMonth1, setRankMonth1,
    rankMonth2, setRankMonth2,
    rankMonth3, setRankMonth3,
    setBanKemNv,
    setTragopNv,
    nganhhangChinhNv,
    setNganhhangChinhNv,
    isLoading,
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv,
    saveNganhhangChinhNv,
    saveTragopNv,
    tenSieuThi
  };
};
