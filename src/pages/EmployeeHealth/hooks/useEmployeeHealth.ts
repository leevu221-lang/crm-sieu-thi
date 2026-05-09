/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { parseYcxData, parseStaffRankData } from '../../RTST/utils';
import { StaffData } from '../../RTST/types';

export const useEmployeeHealth = (maKho: string) => {
  const [biRevenueData, setBiRevenueData] = useState<StaffData[]>([]);
  const [luyKeNganhHang, setLuyKeNganhHang] = useState<string>('');
  const [thiDuaNv, setThiDuaNv] = useState<string>('');
  const [phucVu, setPhucVu] = useState<string>('');
  const [banKemNv, setBanKemNv] = useState<string>('');
  const [tenSieuThi, setTenSieuThi] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAndMergeData = useCallback(async () => {
    if (!maKho) return;
    setIsLoading(true);
    try {
      const maKhoNum = parseInt(maKho, 10);
      const warehouseFilter = !isNaN(maKhoNum) 
        ? `warehouse_code.eq.${maKho},warehouse_code.eq.${maKhoNum}`
        : `warehouse_code.eq.${maKho}`;

      // Fetch all data in parallel to optimize loading time (< 10s)
      const [
        { data: rtData, error: rtError }, 
        { data: lkData, error: lkError }
      ] = await Promise.all([
        supabase
          .from('store_realtime')
          .select('ycx_rt, ten_sieu_thi')
          .or(warehouseFilter)
          .maybeSingle(),
        supabase
          .from('store_luyke')
          .select('lk_dt_nv, lk_nh_sieu_thi, lk_td_nv, phuc_vu, ban_kem_nv, ten_sieu_thi')
          .or(warehouseFilter)
          .maybeSingle()
      ]);

      if (rtError) console.error('[EmployeeHealth] RT Error:', rtError);
      if (lkError) console.error('[EmployeeHealth] LK Error:', lkError);
      console.log('[EmployeeHealth] Query result:', { 
        maKho, warehouseFilter, 
        rtData: rtData ? 'found' : 'null', 
        lkData: lkData ? 'found' : 'null',
        lk_dt_nv_length: lkData?.lk_dt_nv?.length || 0
      });
      
      const ycxRaw = rtData?.ycx_rt || '';
      const lkRaw = lkData?.lk_dt_nv || '';
      const lkNhRaw = lkData?.lk_nh_sieu_thi || '';
      const lkTdRaw = lkData?.lk_td_nv || '';
      const phucVuRaw = lkData?.phuc_vu || '';
      const banKemNvRaw = lkData?.ban_kem_nv || '';
      const tenSieuThi = lkData?.ten_sieu_thi || rtData?.ten_sieu_thi || '';

      setLuyKeNganhHang(lkNhRaw);
      setThiDuaNv(lkTdRaw);
      setPhucVu(phucVuRaw);
      setBanKemNv(banKemNvRaw);
      setTenSieuThi(tenSieuThi);

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

      setBiRevenueData(mergedBiData);
    } catch (error: any) {
      console.error('Error fetching employee health data:', error);
      if (error.message?.includes('Failed to fetch')) {
        console.error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại cấu hình Supabase trong Secrets.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [maKho]);

  useEffect(() => {
    if (!maKho) return;
    fetchAndMergeData();

    const maKhoNum = parseInt(maKho, 10);

    // Realtime subscription for store_realtime (to update revenue)
    const rtChannel = supabase
      .channel('store_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_realtime' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord && (newRecord.warehouse_code == maKho || newRecord.warehouse_code == maKhoNum)) {
            console.log('[EmployeeHealth] store_realtime updated, refreshing...');
            fetchAndMergeData();
          }
        }
      )
      .subscribe();

    // Realtime subscription for store_luyke (to update revenue)
    const lkChannel = supabase
      .channel('store_luyke_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_luyke' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord && (newRecord.warehouse_code == maKho || newRecord.warehouse_code == maKhoNum)) {
            console.log('[EmployeeHealth] store_luyke updated, refreshing...');
            fetchAndMergeData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rtChannel);
      supabase.removeChannel(lkChannel);
    };
  }, [maKho, fetchAndMergeData]);

  const refresh = useCallback(() => {
    console.log('[EmployeeHealth] Manual refresh triggered');
    fetchAndMergeData();
  }, [fetchAndMergeData]);

  const savePhucVu = useCallback(async (data: string) => {
    if (!maKho) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('store_luyke')
        .upsert({
          warehouse_code: maKho,
          ten_sieu_thi: tenSieuThi,
          phuc_vu: data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'warehouse_code,ten_sieu_thi' });

      if (error) throw error;
      setPhucVu(data);
      console.log('[EmployeeHealth] Phuc vu saved successfully');
    } catch (error) {
      console.error('Error saving phuc vu data:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [maKho, tenSieuThi]);

  const saveBanKemNv = useCallback(async (data: string) => {
    if (!maKho) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('store_luyke')
        .upsert({
          warehouse_code: maKho,
          ten_sieu_thi: tenSieuThi,
          ban_kem_nv: data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'warehouse_code,ten_sieu_thi' });

      if (error) throw error;
      setBanKemNv(data);
      console.log('[EmployeeHealth] Ban Kem NV saved successfully');
    } catch (error) {
      console.error('Error saving ban kem nv data:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [maKho, tenSieuThi]);

  return {
    biRevenueData,
    luyKeNganhHang,
    thiDuaNv,
    phucVu,
    banKemNv,
    isLoading,
    isSaving,
    refresh,
    savePhucVu,
    saveBanKemNv
  };
};
