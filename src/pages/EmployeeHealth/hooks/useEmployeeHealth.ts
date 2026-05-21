/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { useStore } from '../../../contexts/StoreContext';
import { parseYcxData, parseStaffRankData } from '../../RTST/utils';
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
  }, []);

  const fetchAndMergeData = useCallback(async () => {
    if (!maKho) return;
    setIsLoading(true);
    try {
      const maKhoNum = parseInt(maKho, 10);
      const warehouseFilter = !isNaN(maKhoNum) 
        ? `warehouse_code.eq.${maKho},warehouse_code.eq.${maKhoNum}`
        : `warehouse_code.eq.${maKho}`;

      let rtQuery = supabase
        .from('store')
        .select('ycx_rt, ten_sieu_thi, updated_at')
        .or(warehouseFilter);
        
      const targetStore = storeName || maKho;
      let lkQuery = supabase
        .from('store')
        .select('id, lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, ten_sieu_thi, updated_at')
        .eq('id', targetStore.trim());

      // PERF: Fetch exact store data if available to prevent downloading megabytes of data for the whole cluster
      if (storeName && storeName !== 'ALL') {
        const cleanStore = storeName.trim();
        rtQuery = rtQuery.ilike('ten_sieu_thi', cleanStore);
      }

      const [
        { data: rtDataArrRaw, error: rtError }, 
        { data: lkDataArrRaw, error: lkError }
      ] = await Promise.all([rtQuery, lkQuery]);

      // Sort client-side by updated_at descending
      const sortByUpdated = (arr: any[]) => [...arr].sort((a: any, b: any) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });
      const rtDataArr = rtDataArrRaw ? sortByUpdated(rtDataArrRaw) : null;
      const lkDataArr = lkDataArrRaw ? sortByUpdated(lkDataArrRaw) : null;

      // Pick the correct store record from the results
      let lkData: any = null;
      let globalLuyKe: any = null;
      let rtData: any = null;

      if (lkDataArr && lkDataArr.length > 0) {
        lkData = lkDataArr[0];
        globalLuyKe = lkData;
      }

      if (rtDataArr && rtDataArr.length > 0) {
        if (storeName && storeName !== 'ALL') {
          const normStore = storeName.trim().toUpperCase();
          rtData = rtDataArr.find((r: any) => (r.ten_sieu_thi || '').trim().toUpperCase() === normStore) || rtDataArr[0];
        } else {
          rtData = rtDataArr[0];
        }
      }

      if (rtError) console.error('[EmployeeHealth] RT Error:', rtError);
      if (lkError) console.error('[EmployeeHealth] LK Error:', lkError);
      
      const ycxRaw = rtData?.ycx_rt || '';
      const lkRaw = lkData?.lk_dt_nv || '';
      const lkNhRaw = globalLuyKe?.lk_nh_sieu_thi || lkDataArr?.find((r: any) => r.lk_nh_sieu_thi)?.lk_nh_sieu_thi || ''; // fallback to legacy
      const lkTdRaw = lkData?.lk_td_nv || '';
      const phucVuRaw = lkData?.phuc_vu || '';
      const banKemNvRaw = lkData?.ban_kem_nv || '';
      const tenSieuThiVal = lkData?.ten_sieu_thi || rtData?.ten_sieu_thi || storeName || '';

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

      // Update global cache
      const tKey = storeName || maKho;
      globalHealthCache[tKey] = {
        biRevenueData: mergedBiData,
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
      // Clear state immediately to prevent stale data flash during store switch
      setBiRevenueData([]);
      setLuyKeNganhHang('');
      setThiDuaNv('');
      setPhucVu('');
      setTenSieuThi('');
      if (!banKemDirtyRef.current) setBanKemNvInternal('');
    }
    
    // Reset dirty flag when switching stores to avoid stale banKemNv
    banKemDirtyRef.current = false;
    hasLoadedRef.current = false;
    fetchRef.current();

    const cleanMaKho = maKho.trim().replace(/^0+/, '');

    // PERF: Add warehouse_code filter to subscriptions (previously listened to ALL table changes)
    const rtChannel = supabase
      .channel(`eh_store_${cleanMaKho}_${storeName || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store', filter: `warehouse_code=eq.${cleanMaKho}` },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    const lkChannel = supabase
      .channel(`eh_store_${cleanMaKho}_${storeName || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store', filter: `warehouse_code=eq.${cleanMaKho}` },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(rtChannel);
      supabase.removeChannel(lkChannel);
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
            id: cleanStore,
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
    };
  }, [banKemNv, maKho, storeName, tenSieuThi]);

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
            id: cleanStore,
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
            id: cleanStore,
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
