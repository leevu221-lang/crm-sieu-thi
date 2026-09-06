import { useState, useEffect } from 'react';
import { getCachedDoc } from '../services/cachedFirestore';

export interface CategoryConfigItem {
  name: string;
  group: string;
}

export const DEFAULT_TNB_LEADER_CATEGORIES: CategoryConfigItem[] = [
  { name: 'ĐIỆN THOẠI & TABLET ANDROID', group: 'ICT' },
  { name: 'TABLET ANDROID', group: 'ICT' },
  { name: 'Điện thoại realme', group: 'ICT' },
  { name: 'Điện thoại Vivo', group: 'ICT' },
  { name: 'Laptop (trừ Apple)', group: 'ICT' },
  { name: 'Camera', group: 'ICT' },
  { name: 'Cáp - Sạc', group: 'ICT' },
  { name: 'Đồng hồ tháng 9', group: 'ICT' },
  { name: 'Phụ kiện IT và nhóm khác', group: 'ICT' },
  { name: 'PHỤ KIỆN CÔNG NGHỆ', group: 'ICT' },
  { name: 'SẠC DỰ PHÒNG', group: 'ICT' },
  { name: 'TAI NGHE', group: 'ICT' },
  { name: 'Bảo hiểm tổng', group: 'DỊCH VỤ' },
  { name: 'Bảo hiểm Thợ ĐMX', group: 'DỊCH VỤ' },
  { name: 'SIM MOBIFONE/VINAPHONE/SIM DMX', group: 'DỊCH VỤ' },
  { name: 'SIM tổng', group: 'DỊCH VỤ' },
  { name: 'OTT MANGO+, ICALLME -', group: 'DỊCH VỤ' },
  { name: 'VAS', group: 'DỊCH VỤ' },
  { name: 'TRẢ CHẬM FECREDIT, SHINHAN, SAMSUNG FINANCE+', group: 'DỊCH VỤ' },
  { name: 'TRẢ CHẬM HOMECREDIT', group: 'DỊCH VỤ' },
  { name: 'TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG', group: 'DỊCH VỤ' },
  { name: 'Vay tiền mặt', group: 'DỊCH VỤ' },
  { name: 'Ví trả sau', group: 'DỊCH VỤ' },
  { name: 'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG', group: 'DỊCH VỤ' },
  { name: 'MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG', group: 'DỊCH VỤ' },
  { name: 'ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee', group: 'CE' },
  { name: 'Máy giặt', group: 'CE' },
  { name: 'TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT', group: 'CE' },
  { name: 'MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI', group: 'CE' },
  { name: 'Máy nước nóng', group: 'CE' },
  { name: 'Nồi cơm - nồi chiên', group: 'CE' },
  { name: 'Gia dụng Kangaroo', group: 'CE' },
  { name: 'MÁY LỌC NƯỚC', group: 'CE' },
  { name: 'QUẠT GIÓ', group: 'CE' },
  { name: 'ĐIỆN TỬ', group: 'CE' }
];

// One-time cached read (shared cache key with TnbLeader.tsx's own TNB_LEADER_DATA
// listener) instead of a permanent onSnapshot — see src/services/cachedFirestore.ts.
export const useCategoryConfig = () => {
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfigItem[]>(() => {
    try {
      const raw = localStorage.getItem('fbcache_app_settings_TNB_LEADER_DATA');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data?.categories && Array.isArray(parsed.data.categories) && parsed.data.categories.length > 0) {
          return parsed.data.categories;
        }
      }
    } catch {}
    return DEFAULT_TNB_LEADER_CATEGORIES;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCachedDoc<{ categories?: CategoryConfigItem[] }>('app_settings', 'TNB_LEADER_DATA')
      .then((data) => {
        if (cancelled) return;
        if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategoryConfig(data.categories);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching category config:', error);
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { categoryConfig, isLoading };
};
