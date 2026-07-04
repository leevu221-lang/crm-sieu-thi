/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { useStore } from '../../../contexts/StoreContext';
import { parseYcxData, parseStaffRankData, normalizeStoreId } from '../../RTST/utils';
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
  const [tenSieuThi, setTenSieuThi] = useState<string>(() => initialCache?.tenSieuThi || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasLoadedRef = useRef(false);
  const banKemDirtyRef = useRef(false);
  const banKemAutoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Exposed setter that marks data as dirty (user-initiated change)
  const setBanKemNv = useCallback((val: string) => {
    banKemDirtyRef.current = true;
    setBanKemNvInternal(val);
    if (globalHealthCache[targetKey]) {
      globalHealthCache[targetKey].banKemNv = val;
    }
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
          .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, ten_sieu_thi, updated_at')
          .eq('id', normalizeStoreId(cleanStore));
      } else {
        // ALL stores mode: query by warehouse_code
        rtQuery = supabase
          .from('store')
          .select('ycx_rt, ten_sieu_thi, updated_at')
          .or(warehouseFilter);
        lkQuery = supabase
          .from('store')
          .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, ten_sieu_thi, updated_at')
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
          .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, ten_sieu_thi, updated_at')
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

      const tenSieuThiVal = isAllMode
        ? 'TẤT CẢ SIÊU THỊ'
        : (lkData?.ten_sieu_thi || rtData?.ten_sieu_thi || storeName || '');

      console.log(`[EmployeeHealth] lkRaw length: ${lkRaw.length}, ycxRaw length: ${ycxRaw.length}, lkNhRaw: ${lkNhRaw.length}`);

      setLuyKeNganhHang(lkNhRaw);
      setThiDuaNv(lkTdRaw);
      setPhucVu(phucVuRaw);
      // Only update banKemNv from DB if user hasn't made local changes
      if (!banKemDirtyRef.current) {
        setBanKemNvInternal(banKemNvRaw);
      } else {
        // Skipping DB overwrite for ban_kem_nv (dirty)
      }
      setTenSieuThi(tenSieuThiVal);
      hasLoadedRef.current = true;

      const ycxStaffData = ycxRaw ? parseYcxData(ycxRaw) : [];
      const biData = lkRaw ? parseStaffRankData(lkRaw) : [];
      
      // Merge YCX DTQĐ into BI Data to ensure latest values are shown in the ranking table
      // This fixes the issue where DTQĐ might be stale in lk_dt_nv but updated in ycx_rt
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
        tenSieuThi: tenSieuThiVal
      };

      setBiRevenueData(mergedBiData);
    } catch (error: any) {
      console.error('Error fetching employee health data:', error);
      if (error.message?.includes('Failed to fetch')) {
        console.error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại cấu hình Supabase trong Secrets.');
      }
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
    } else {
      // Keep previous data during fetch to prevent layout collapse/flicker.
      // Fields will be updated or cleared once the Supabase query resolves.
    }
    
    // Reset dirty flag when switching stores to avoid stale banKemNv
    banKemDirtyRef.current = false;
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
              (!banKemDirtyRef.current && record.ban_kem_nv !== undefined && record.ban_kem_nv !== (cached.banKemNv || ''));

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
            ban_kem_nv: data,
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

  return {
    biRevenueData,
    luyKeNganhHang,
    thiDuaNv,
    phucVu,
    banKemNv,
    setBanKemNv,
    isLoading,
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv
  };
};
