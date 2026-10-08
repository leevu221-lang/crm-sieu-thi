import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCachedDoc, setCachedDoc } from '../services/cachedFirestore';

export interface CategoryConfigItem {
  name: string;
  group: string;
}

export const DEFAULT_TNB_LEADER_CATEGORIES: CategoryConfigItem[] = [
  // ICT (13 ngành hàng)
  { name: 'T09 - T10 IPHONE 18 series, iPhone Duo', group: 'ICT' },
  { name: 'T10 - TABLET ANDROID VÀ MÁY ĐỌC SÁCH', group: 'ICT' },
  { name: 'T10 - ĐIỆN THOẠI REALME', group: 'ICT' },
  { name: 'T10 - ĐIỆN THOẠI VIVO', group: 'ICT' },
  { name: 'T10 - ĐIỆN THOẠI & TABLET ANDROID', group: 'ICT' },
  { name: 'T10 - CAMERA', group: 'ICT' },
  { name: 'T10 - TAI NGHE', group: 'ICT' },
  { name: 'T10 - CÁP - SẠC', group: 'ICT' },
  { name: 'T10 - ĐỒNG HỒ', group: 'ICT' },
  { name: 'T10 - LAPTOP', group: 'ICT' },
  { name: 'T10 - PHỤ KIỆN IT - NHÓM KHÁC', group: 'ICT' },
  { name: 'T10 - PHỤ KIỆN CÔNG NGHỆ', group: 'ICT' },
  { name: 'T10 - SẠC DỰ PHÒNG', group: 'ICT' },

  // DỊCH VỤ (13 ngành hàng)
  { name: 'T10 - NẠP - RÚT TIỀN TÀI KHOẢN NGÂN HÀNG', group: 'DỊCH VỤ' },
  { name: 'T10 - Bảo Hiểm Tổng', group: 'DỊCH VỤ' },
  { name: 'T10 - BẢO HIỂM THỢ ĐMX_ICT', group: 'DỊCH VỤ' },
  { name: 'T10 - BẢO HIỂM THỢ ĐMX_CE', group: 'DỊCH VỤ' },
  { name: 'T10 - SIM MOBIFONE/SIM DMX', group: 'DỊCH VỤ' },
  { name: 'T10 - SIM TỔNG', group: 'DỊCH VỤ' },
  { name: 'T10 - VAS', group: 'DỊCH VỤ' },
  { name: 'T10 - Vay tiền mặt', group: 'DỊCH VỤ' },
  { name: 'T10 - TRẢ CHẬM FECREDIT, SHINHAN, SAMSUNG FINANCE+', group: 'DỊCH VỤ' },
  { name: 'T10 - TRẢ CHẬM HOMECREDIT', group: 'DỊCH VỤ' },
  { name: 'T10 - VÍ TRẢ SAU', group: 'DỊCH VỤ' },
  { name: 'T10 - MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG', group: 'DỊCH VỤ' },
  { name: 'TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG', group: 'DỊCH VỤ' },

  // CE (14 ngành hàng)
  { name: 'T10 - Máy Lạnh', group: 'CE' },
  { name: 'T10 - GIA DỤNG SUNHOUSE', group: 'CE' },
  { name: 'T10 - HÚT BỤI', group: 'CE' },
  { name: 'T10 - AUDIO', group: 'CE' },
  { name: 'T10 - ĐIỆN TỬ TCL', group: 'CE' },
  { name: 'T10 - PANASONIC', group: 'CE' },
  { name: 'T10 - TIVI', group: 'CE' },
  { name: 'T10 - MÁY GIẶT', group: 'CE' },
  { name: 'T10 - MÁY SẤY & MÁY RỬA CHÉN', group: 'CE' },
  { name: 'T10 - TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT', group: 'CE' },
  { name: 'T10 - MÁY NƯỚC NÓNG FERROLI', group: 'CE' },
  { name: 'T10 - NỒI CƠM & NỒI CHIÊN', group: 'CE' },
  { name: 'T10 - MÁY LỌC NƯỚC', group: 'CE' },
  { name: 'T10 - QUẠT GIÓ', group: 'CE' }
];

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

    // 1. Initial cached / fresh fetch
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

    // 2. Realtime listener via onSnapshot for instant propagation across all users / tabs
    const unsub = onSnapshot(doc(db, 'app_settings', 'TNB_LEADER_DATA'), (snap) => {
      if (cancelled) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategoryConfig(data.categories);
          setCachedDoc('app_settings', 'TNB_LEADER_DATA', data);
        }
      }
    }, (err) => {
      console.warn('Realtime categoryConfig listener error:', err);
    });

    // 3. Local custom event listener for zero-latency in-session updates
    const handleLocalUpdate = (e: any) => {
      const newCats = e.detail;
      if (Array.isArray(newCats) && newCats.length > 0) {
        setCategoryConfig(newCats);
      }
    };
    window.addEventListener('category_config_updated', handleLocalUpdate);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener('category_config_updated', handleLocalUpdate);
    };
  }, []);

  return { categoryConfig, isLoading };
};
