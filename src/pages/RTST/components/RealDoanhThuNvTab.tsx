/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Camera, 
  Copy, 
  Check, 
  RotateCcw, 
  Trash2, 
  Eye, 
  EyeOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  X,
  CheckSquare,
  Square,
  Scan,
  Zap,
  Globe,
  Unlock,
  Clock
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { addWhiteBorderToDataUrl } from '../../../utils/imageBorderUtil';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import AutoFitTable from '../../../components/AutoFitTable';
import confetti from 'canvas-confetti';

export { DEFAULT_RAW_MWG_DATA_1841 } from '../data/defaultMwgRaw1841';
import { DEFAULT_RAW_MWG_DATA_1841 } from '../data/defaultMwgRaw1841';

const _OLD_RAW = `Dashboards
[Danh mục báo cáo](https://baocao.dienmayxanh.com/dashboard/home)[Hiệu quả kinh doanh](https://baocao.dienmayxanh.com/dashboard/effectiveness)[Doanh thu hợp nhất](https://baocao.dienmayxanh.com/dashboard/revenue-consolidated)[Thi đua](https://baocao.dienmayxanh.com/dashboard/thi-dua)[Doanh Thu Ngành Hàng BI](https://baocao.dienmayxanh.com/dashboard/bi-category)[Giờ Công Làm Việc](https://baocao.dienmayxanh.com/dashboard/timekeeping)[Báo cáo trả chậm](https://baocao.dienmayxanh.com/dashboard/tra-cham)[Lượt bill TGDĐ](https://baocao.dienmayxanh.com/dashboard/countbill-tgdd)[Chi phí chăm sóc khách hàng](https://baocao.dienmayxanh.com/dashboard/productreturncost)L
Linh Võ Vũemployee
Doanh thu hợp nhất
43751 - Linh Võ Vũ
Tìm báo cáo⌘KCập nhật lúc: 12:04:015/9/20261
Toggle theme
ChuỗiChọn
MiềnChọn
VùngChọn
Khu vựcChọn
Siêu thị1841 - ĐML_CMA_CMA - 155A Nguyễn Tất Thành×
Ngành hàngChọn
Nhóm hàngChọn
Lũy kếRealtime
DT thựcDT quy đổi
Tải lạiXuất ExcelXuất theo mẫu
Toàn công tySiêu thị 1841
DT quy đổi
42
triệu đồng · ngày 05/09 · cập nhật 11:55 · lũy kế tới hết ngày 04/09
% HT target (LK)?
20.7%
Target trọn kỳ 6,105 · tiến độ 13.3%
TT vs TB 3 tháng?
-82.8%
TB3T cùng cửa sổ: 244
DT dự kiến?
9,484
nhịp 4 ngày → 30 ngày
TLPVTC hôm nay
1.5%
2 bill / 134 khách · 1/1 ST có máy đếm
Tỉ trọng trả góp
37.6%
DT trả góp 9 / 25
Doanh thu theo cấpTổng hợpNgành hàngNhân viên
✓Tỉ trọng✓Target✓Tăng trưởngDự kiếnOff / Onl✓Trả góp
NHÂN VIÊN
SỐ LƯỢNG
DOANH THU QĐ
% TỈ TRỌNG
DOANH THU
TARGET
% HT TARGET (LK)
TB 3 THÁNG
% TT
DT TRẢ GÓP
% TRẢ GÓP
100544 - Trần Văn Duy
3
11
25.2%
8
—
—
0
—
7
88.8%
46944 - Nguyễn Diễm My
4
9
20.8%
8
—
—
0
—
0
0.0%
191664 - Phạm Văn Đại
6
12
28.5%
6
—
—
0
—
0
0.0%
38847 - Nguyễn Hùng Mạnh
1
5
13.0%
5
—
—
0
—
0
0.0%
58638 - Phạm Ngọc Anh
2
4
10.3%
2
—
—
0
—
1
54.4%
21964 - Lâm Thị Như Ý
3
4
9.7%
1
—
—
0
—
1
97.1%
12803 - Nguyễn Thị Nhạn
2
1
3.3%
1
—
—
0
—
0
0.0%
171837 - Lê Anh Tuấn
2
1
2.8%
0
—
—
0
—
0
0.0%
59442 - Lê Kim Mỹ
2
0
1.0%
0
—
—
0
—
0
0.0%
157597 - Nguyễn Tuấn Mi
1
0
0.3%
0
—
—
0
—
0
0.0%
97734 - Huỳnh Hoàng Phúc
0
0
0.0%
0
—
—
0
—
0
—
38834 - Ngô Thị Bé Thắm
0
0
0.0%
0
—
—
0
—
0
—
online - Online - 18001060
0
0
0.0%
0
—
—
0
—
0
—
43751 - Võ Vũ Linh
0
0
0.0%
0
—
—
0
—
0
—
30013 - Trần Hải Yến
-1
-6
-14.9%
-6
—
—
0
—
0
—
Tổng (15 dòng)
25
42
100.0%
25
6,105
20.7%
244
-82.8%
9
37.6%
1-15 / Tổng 15 dòng
50 / trang
Đơn vị: triệu đồngTỉ trọng tính trong nhóm cùng cấp cha`;

interface StaffRowItem {
  id: string;
  name: string;
  actualRevenue: number;
  convertedRevenue: number;
  shareRate: number;
  installmentRevenue: number;
  installmentRate: number;
}

interface RealDoanhThuNvTabProps {
  processedData?: any;
  luykeProcessedData?: any;
  marketFilter?: string;
  captureElement?: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
  handleExcelUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentYcxFileName?: string;
  setActiveTab?: (tab: any) => void;
  userProfile?: any;
  lastUpdated?: Date | null;
  isUser43751?: boolean;
  selectedMaKho?: string;
}

export const RealDoanhThuNvTab: React.FC<RealDoanhThuNvTabProps> = ({
  selectedMaKho = '',
  captureElement,
  marketFilter = '',
  userProfile
}) => {
  // Resolve unified store code across desktop and mobile
  const cleanStore = useMemo(() => {
    const fromMaKho = selectedMaKho ? selectedMaKho.replace(/\D/g, '') : '';
    if (fromMaKho) return fromMaKho;

    const fromProfile = userProfile?.ma_kho ? String(userProfile.ma_kho).replace(/\D/g, '') : '';
    if (fromProfile) return fromProfile;

    if (marketFilter && marketFilter !== 'ALL') {
      const match = marketFilter.match(/\b\d{3,6}\b/);
      if (match) return match[0];
    }

    try {
      const savedRtst = localStorage.getItem('rtst_ma_kho');
      if (savedRtst) {
        const c = savedRtst.replace(/\D/g, '');
        if (c) return c;
      }
    } catch (e) {}

    return userProfile?.ma_kho || '';
  }, [selectedMaKho, userProfile?.ma_kho, marketFilter]);

  const storageKey = `real_dthu_nv_raw_${cleanStore}`;
  const filterStorageKey = `real_dthu_nv_excluded_${cleanStore}`;
  const viewStorageKey = `real_dthu_nv_only_revenue_${cleanStore}`;

  // Input Box State - D.THU QUY ĐỔI
  const [rawInput, setRawInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved.trim()) return saved;
      const legacy = localStorage.getItem(`mwg_rt_staff_raw_${cleanStore}`);
      if (legacy && legacy.trim()) return legacy;
    } catch (e) {}
    return cleanStore === '1841' ? DEFAULT_RAW_MWG_DATA_1841 : '';
  });

  // Input Box State - D.THU THỰC
  const [rawInputThuc, setRawInputThuc] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`real_dthu_nv_raw_thuc_${cleanStore}`);
      if (saved && saved.trim()) return saved;
    } catch (e) {}
    return '';
  });

  // Input Box State - D.THU TRẢ GÓP
  const [rawInputTraGop, setRawInputTraGop] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`real_dthu_nv_raw_tragop_${cleanStore}`);
      if (saved && saved.trim()) return saved;
    } catch (e) {}
    return '';
  });

  // Filter Staff State (Excluded staff IDs) with Persistence
  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(filterStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Filter View Option: Only with revenue (Persisted)
  const [onlyWithRevenue, setOnlyWithRevenue] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(viewStorageKey);
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });

  // Cloud Sync Status: idle | saving | synced | error
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const isEditingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState<string>('');
  const [isEditingThuc, setIsEditingThuc] = useState<boolean>(false);
  const [tempThuc, setTempThuc] = useState<string>('');
  const [isEditingQd, setIsEditingQd] = useState<boolean>(false);
  const [tempQd, setTempQd] = useState<string>('');
  const [isEditingTraGop, setIsEditingTraGop] = useState<boolean>(false);
  const [tempTraGop, setTempTraGop] = useState<string>('');
  const [isTableAutoFit, setIsTableAutoFit] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const boxThucRef = useRef<HTMLDivElement>(null);
  const boxQdRef = useRef<HTMLDivElement>(null);
  const boxTraGopRef = useRef<HTMLDivElement>(null);

  // Click ra ngoài thì tự khóa lại; nếu không có dán dữ liệu mới thì giữ nguyên (không lưu)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!target) return;

      // Click outside D.Thu Thực
      if (isEditingThuc && boxThucRef.current && !boxThucRef.current.contains(target)) {
        setIsEditingThuc(false);
        setTempThuc('');
      }

      // Click outside D.Thu Quy Đổi
      if (isEditingQd && boxQdRef.current && !boxQdRef.current.contains(target)) {
        setIsEditingQd(false);
        setTempQd('');
      }

      // Click outside D.Thu Trả Góp
      if (isEditingTraGop && boxTraGopRef.current && !boxTraGopRef.current.contains(target)) {
        setIsEditingTraGop(false);
        setTempTraGop('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingThuc) {
          setIsEditingThuc(false);
          setTempThuc('');
        }
        if (isEditingQd) {
          setIsEditingQd(false);
          setTempQd('');
        }
        if (isEditingTraGop) {
          setIsEditingTraGop(false);
          setTempTraGop('');
        }
      }
    };

    if (isEditingThuc || isEditingQd || isEditingTraGop) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditingThuc, isEditingQd, isEditingTraGop]);

  // Sync with selected store and subscribe to Cloud Firestore for cross-browser/mobile real-time sync
  useEffect(() => {
    if (!cleanStore) return;

    // 1. Initial fast local load from localStorage
    try {
      const saved = localStorage.getItem(`real_dthu_nv_raw_${cleanStore}`);
      if (saved && saved.trim()) {
        setRawInput(saved);
      }

      const savedThuc = localStorage.getItem(`real_dthu_nv_raw_thuc_${cleanStore}`);
      if (savedThuc && savedThuc.trim()) {
        setRawInputThuc(savedThuc);
      } else {
        setRawInputThuc('');
      }

      const savedTraGop = localStorage.getItem(`real_dthu_nv_raw_tragop_${cleanStore}`);
      if (savedTraGop && savedTraGop.trim()) {
        setRawInputTraGop(savedTraGop);
      } else {
        setRawInputTraGop('');
      }

      const savedFilters = localStorage.getItem(`real_dthu_nv_excluded_${cleanStore}`);
      if (savedFilters) {
        setExcludedStaffIds(JSON.parse(savedFilters));
      } else {
        setExcludedStaffIds([]);
      }

      const savedView = localStorage.getItem(`real_dthu_nv_only_revenue_${cleanStore}`);
      if (savedView !== null) {
        setOnlyWithRevenue(savedView === 'true');
      }
    } catch (e) {}

    // 2. Realtime listener from Cloud Firestore
    const docRef = doc(db, 'app_settings', `real_dthu_nv_${cleanStore}`);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      // Don't write stale data during logout/login redirect
      if ((window as any).__crm_is_redirecting) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && !isEditingRef.current) {
          if (typeof data.rawInput === 'string') {
            setRawInput(data.rawInput);
            try { localStorage.setItem(`real_dthu_nv_raw_${cleanStore}`, data.rawInput); } catch (e) {}
          }
          if (typeof data.rawInputThuc === 'string') {
            setRawInputThuc(data.rawInputThuc);
            try { localStorage.setItem(`real_dthu_nv_raw_thuc_${cleanStore}`, data.rawInputThuc); } catch (e) {}
          }
          if (typeof data.rawInputTraGop === 'string') {
            setRawInputTraGop(data.rawInputTraGop);
            try { localStorage.setItem(`real_dthu_nv_raw_tragop_${cleanStore}`, data.rawInputTraGop); } catch (e) {}
          }
          if (Array.isArray(data.excludedStaffIds)) {
            setExcludedStaffIds(data.excludedStaffIds);
            try { localStorage.setItem(`real_dthu_nv_excluded_${cleanStore}`, JSON.stringify(data.excludedStaffIds)); } catch (e) {}
          }
          if (typeof data.onlyWithRevenue === 'boolean') {
            setOnlyWithRevenue(data.onlyWithRevenue);
            try { localStorage.setItem(`real_dthu_nv_only_revenue_${cleanStore}`, String(data.onlyWithRevenue)); } catch (e) {}
          }
          setSyncStatus('synced');
        }
      } else {
        // Document does not exist in Firestore yet.
        const initialToSave = localStorage.getItem(`real_dthu_nv_raw_${cleanStore}`) || (cleanStore === '1841' ? DEFAULT_RAW_MWG_DATA_1841 : '');
        const initialThucToSave = localStorage.getItem(`real_dthu_nv_raw_thuc_${cleanStore}`) || '';
        const initialTraGopToSave = localStorage.getItem(`real_dthu_nv_raw_tragop_${cleanStore}`) || '';
        if (initialToSave || initialThucToSave || initialTraGopToSave) {
          setDoc(docRef, {
            storeId: cleanStore,
            rawInput: initialToSave,
            rawInputThuc: initialThucToSave,
            rawInputTraGop: initialTraGopToSave,
            excludedStaffIds: [],
            onlyWithRevenue: true,
            updatedAt: serverTimestamp(),
            updatedBy: userProfile?.username || userProfile?.fullName || 'initial'
          }, { merge: true }).catch(() => {});
        }
      }
    }, (err) => {
      console.warn('Firestore real_dthu_nv onSnapshot error:', err);
    });

    return () => {
      unsubscribe();
    };
  }, [cleanStore]);

  // Helper to persist filter settings to Firestore and localStorage
  const saveFilterState = (newExcluded: string[], newOnlyRev: boolean) => {
    try {
      localStorage.setItem(`real_dthu_nv_excluded_${cleanStore}`, JSON.stringify(newExcluded));
      localStorage.setItem(`real_dthu_nv_only_revenue_${cleanStore}`, String(newOnlyRev));
    } catch (e) {}

    const docRef = doc(db, 'app_settings', `real_dthu_nv_${cleanStore}`);
    setDoc(docRef, {
      storeId: cleanStore,
      excludedStaffIds: newExcluded,
      onlyWithRevenue: newOnlyRev,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(err => {
      console.warn('Firestore filter update error:', err);
    });
  };

  // Cloud save trigger helper
  const triggerCloudSave = (qdText: string, thucText: string, tragopText: string, immediate: boolean = false) => {
    setSyncStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const performCloudSave = async () => {
      try {
        const docRef = doc(db, 'app_settings', `real_dthu_nv_${cleanStore}`);
        await setDoc(docRef, {
          storeId: cleanStore,
          rawInput: qdText,
          rawInputThuc: thucText,
          rawInputTraGop: tragopText,
          excludedStaffIds,
          onlyWithRevenue,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile?.username || userProfile?.fullName || 'user'
        }, { merge: true });
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Firestore real_dthu_nv save error:', err);
        setSyncStatus('error');
      } finally {
        setTimeout(() => {
          isEditingRef.current = false;
        }, 1000);
      }
    };

    if (immediate) {
      performCloudSave();
    } else {
      debounceTimerRef.current = setTimeout(performCloudSave, 600);
    }
  };

  // Save D.THU QUY ĐỔI data
  const handleSaveData = (text: string, immediate: boolean = false) => {
    isEditingRef.current = true;
    setRawInput(text);
    try {
      localStorage.setItem(`real_dthu_nv_raw_${cleanStore}`, text);
    } catch (e) {}
    triggerCloudSave(text, rawInputThuc, rawInputTraGop, immediate);
  };

  // Save D.THU THỰC data
  const handleSaveDataThuc = (text: string, immediate: boolean = false) => {
    isEditingRef.current = true;
    setRawInputThuc(text);
    try {
      localStorage.setItem(`real_dthu_nv_raw_thuc_${cleanStore}`, text);
    } catch (e) {}
    triggerCloudSave(rawInput, text, rawInputTraGop, immediate);
  };

  // Save D.THU TRẢ GÓP data
  const handleSaveDataTraGop = (text: string, immediate: boolean = false) => {
    isEditingRef.current = true;
    setRawInputTraGop(text);
    try {
      localStorage.setItem(`real_dthu_nv_raw_tragop_${cleanStore}`, text);
    } catch (e) {}
    triggerCloudSave(rawInput, rawInputThuc, text, immediate);
  };

  // Hiệu ứng pháo giấy tung bay chúc mừng
  const fireConfetti = () => {
    try {
      // 1. Pháo bên trái
      confetti({
        particleCount: 65,
        angle: 60,
        spread: 60,
        origin: { x: 0.15, y: 0.75 },
        colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8']
      });
      // 2. Pháo bên phải
      confetti({
        particleCount: 65,
        angle: 120,
        spread: 60,
        origin: { x: 0.85, y: 0.75 },
        colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8']
      });
      // 3. Pháo trung tâm tung bay rực rỡ
      setTimeout(() => {
        confetti({
          particleCount: 90,
          spread: 110,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#3b82f6', '#10b981', '#fbbf24', '#f43f5e', '#a855f7', '#06b6d4']
        });
      }, 120);
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  };

  // Lưu và khóa D.Thu Thực kèm hiệu ứng pháo giấy
  const handleSaveAndLockThuc = (text: string) => {
    if (text && text.trim()) {
      handleSaveDataThuc(text, true);
      fireConfetti();
    }
    setIsEditingThuc(false);
    setTempThuc('');
  };

  // Lưu và khóa D.Thu Quy Đổi kèm hiệu ứng pháo giấy
  const handleSaveAndLockQd = (text: string) => {
    if (text && text.trim()) {
      handleSaveData(text, true);
      fireConfetti();
    }
    setIsEditingQd(false);
    setTempQd('');
  };

  // Lưu và khóa D.Thu Trả Góp kèm hiệu ứng pháo giấy
  const handleSaveAndLockTraGop = (text: string) => {
    if (text && text.trim()) {
      handleSaveDataTraGop(text, true);
      fireConfetti();
    }
    setIsEditingTraGop(false);
    setTempTraGop('');
  };

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim()) {
        handleSaveData(clipText, true);
      }
    } catch (e) {
      alert('Vui lòng cấp quyền đọc clipboard hoặc dán trực tiếp vào ô nhập dữ liệu.');
    }
  };

  const handlePasteClipboardThuc = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim()) {
        handleSaveDataThuc(clipText, true);
      }
    } catch (e) {
      alert('Vui lòng cấp quyền đọc clipboard hoặc dán trực tiếp vào ô nhập dữ liệu.');
    }
  };

  // Toggle Single Staff Exclusion (Persisted)
  const handleToggleStaff = (id: string) => {
    setExcludedStaffIds(prev => {
      const next = prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id];
      saveFilterState(next, onlyWithRevenue);
      return next;
    });
  };

  // Show All Staff (Clear exclusion)
  const handleShowAllStaff = () => {
    setExcludedStaffIds([]);
    saveFilterState([], onlyWithRevenue);
  };

  // Hide All Staff
  const handleHideAllStaff = () => {
    const allIds = parsedData.allRows.map(r => r.id);
    setExcludedStaffIds(allIds);
    saveFilterState(allIds, onlyWithRevenue);
  };

  // Select Only With Revenue (Exclude zero revenue staff)
  const handleSelectOnlyWithRevenue = () => {
    const zeroIds = parsedData.allRows
      .filter(r => r.convertedRevenue === 0 && r.actualRevenue === 0)
      .map(r => r.id);
    setExcludedStaffIds(zeroIds);
    saveFilterState(zeroIds, onlyWithRevenue);
  };

  // Toggle View Only With Revenue
  const handleToggleOnlyWithRevenue = (val: boolean) => {
    setOnlyWithRevenue(val);
    saveFilterState(excludedStaffIds, val);
  };

  // Parser for Raw Text Data (Supports both D.THU QUY ĐỔI and D.THU THỰC boxes)
  const parsedData = useMemo(() => {
    const parseNum = (val: any): number => {
      if (!val || val === '—' || val === '-' || String(val).trim() === '') return 0;
      const clean = String(val).replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    };

    const parsePercent = (val: any): number => {
      if (!val || val === '—' || val === '-' || String(val).trim() === '') return 0;
      const clean = String(val).replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    };

    const isStaffLine = (line: string): boolean => {
      if (!line || typeof line !== 'string') return false;
      if (line.startsWith('Tổng') || line.startsWith('1-') || line.includes('Đơn vị:') || line.includes('Tỉ trọng tính')) return false;
      const m = line.match(/^([a-zA-Z0-9_]+)\s*-\s*(.+)/);
      if (!m) return false;
      return /[a-zA-ZÀ-ỹ]/.test(m[2]);
    };

    const tokenize = (vals: string[]): string[] => {
      const result: string[] = [];
      for (const v of vals) {
        if (!v || typeof v !== 'string') continue;
        const parts = v.trim().split(/[\t\s]+/).filter(Boolean);
        result.push(...parts);
      }
      return result;
    };

    const parseSingleReport = (rawInputText: string, mode: 'qd' | 'thuc' | 'tragop') => {
      if (!rawInputText || !rawInputText.trim()) {
        return { staffList: [] as { id: string; name: string; revenue: number; embeddedActualRevenue?: number; installmentRevenue: number; installmentRate: number }[], timeStr: '' };
      }

      const lines = rawInputText.split('\n').map(l => l.trim()).filter(Boolean);

      let extractedTime = '';
      for (const l of lines) {
        if (l.includes('Cập nhật lúc:')) {
          const match = l.match(/Cập nhật lúc:\s*([^\n]+)/i);
          if (match) {
            const raw = match[1].trim();
            const tMatch = raw.match(/(\d{1,2}:\d{2}:\d{2})/);
            let dateStr = '';
            if (tMatch) {
              const afterTime = raw.substring(raw.indexOf(tMatch[1]) + tMatch[1].length);
              const dMatch = afterTime.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
              if (dMatch) dateStr = dMatch[1];
            }
            if (!dateStr) {
              const anyDate = raw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
              if (anyDate) dateStr = anyDate[1];
            }
            extractedTime = tMatch ? `${tMatch[1]}${dateStr ? ` - ${dateStr}` : ''}` : raw;
          }
          break;
        }
      }

      let headerIdx = -1;
      let columnHeaders: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        const l = raw.toUpperCase();

        if (l.includes('DOANH THU THEO CẤP') || l.includes('TỔNG HỢPNGÀNH HÀNG')) continue;

        if (l === 'NHÂN VIÊN') {
          headerIdx = i;
          let endIdx = i + 1;
          while (endIdx < lines.length && !isStaffLine(lines[endIdx])) {
            endIdx++;
          }
          columnHeaders = lines.slice(i, endIdx).map(h => h.trim().toUpperCase()).filter(Boolean);
          break;
        }

        if (l.startsWith('NHÂN VIÊN\t') || (l.startsWith('NHÂN VIÊN') && (l.includes('\t') || l.includes('SỐ LƯỢNG') || l.includes('DOANH THU')))) {
          headerIdx = i;
          columnHeaders = raw.split(/[\t]+|\s{2,}/).map(h => h.trim().toUpperCase()).filter(Boolean);
          break;
        }
      }

      let firstStaffIdx = -1;
      for (let i = (headerIdx !== -1 ? headerIdx + 1 : 0); i < lines.length; i++) {
        if (isStaffLine(lines[i])) {
          firstStaffIdx = i;
          break;
        }
      }

      let colIdxRev = -1;
      let colIdxDtTraGop = -1;
      let colIdxTiTrongTraGop = -1;

      if (columnHeaders.length > 0) {
        if (mode === 'qd') {
          colIdxRev = columnHeaders.findIndex(h => h.includes('DOANH THU QĐ') || h.includes('DT QĐ') || h.includes('DTQD'));
          if (colIdxRev === -1) {
            colIdxRev = columnHeaders.findIndex(h => h.includes('DOANH THU') || h.includes('DT'));
          }
        } else if (mode === 'tragop') {
          colIdxRev = columnHeaders.findIndex(h => h.includes('DT TRẢ GÓP') || h.includes('DT TRAGOP') || h.includes('TRẢ GÓP') || h.includes('TRẢ CHẬM'));
          if (colIdxRev === -1) {
            colIdxRev = columnHeaders.findIndex(h => h.includes('DOANH THU') || h.includes('DT'));
          }
        } else {
          colIdxRev = columnHeaders.findIndex(h => h === 'DOANH THU' || h === 'DT THỰC' || h.includes('DOANH THU THỰC'));
          if (colIdxRev === -1) {
            colIdxRev = columnHeaders.findIndex(h => h.includes('DOANH THU') || h.includes('DT'));
          }
        }
        colIdxDtTraGop = columnHeaders.findIndex(h => h.includes('DT TRẢ GÓP') || h.includes('DT TRAGOP') || h.includes('TRẢ GÓP') || h.includes('TRẢ CHẬM'));
        colIdxTiTrongTraGop = columnHeaders.findIndex(h => h.includes('% TRẢ GÓP') || h.includes('% TRAGOP') || h.includes('% TG'));
      }

      const hasStaffColInHeader = columnHeaders.length > 0 && 
        (columnHeaders[0].includes('NHÂN VIÊN') || columnHeaders[0].includes('NV'));
      const headerColOffset = hasStaffColInHeader ? 1 : 0;

      const staffList: { id: string; name: string; revenue: number; embeddedActualRevenue?: number; installmentRevenue: number; installmentRate: number }[] = [];

      const pushStaff = (staffLine: string, values: string[], forceCol3Rev?: number) => {
        const nameParts = staffLine.split(' - ');
        const cleanName = (nameParts.length > 1 ? nameParts.slice(1).join(' - ') : staffLine).trim().toUpperCase();
        const tokens = tokenize(values);

        let revenue = 0;
        let embeddedActualRevenue: number | undefined = undefined;
        let installmentRevenue = 0;
        let installmentRate = 0;

        if (mode === 'thuc') {
          // Yêu cầu: CỘT "DT. THỰC" LẤY CỘT THỨ 3 TRÁI SANG Ở Ô "D.THU THỰC"
          if (forceCol3Rev !== undefined && !isNaN(forceCol3Rev)) {
            revenue = forceCol3Rev;
          } else if (tokens.length >= 2) {
            // Cột 1: Nhân viên, Cột 2: Số lượng (tokens[0]), Cột 3: Doanh thu thực (tokens[1])
            revenue = parseNum(tokens[1]);
          } else if (tokens.length === 1) {
            revenue = parseNum(tokens[0]);
          }
        } else if (mode === 'tragop') {
          // Ô D.THU TRẢ GÓP: Lấy cột 3 trái sang (Doanh thu trả góp)
          if (forceCol3Rev !== undefined && !isNaN(forceCol3Rev)) {
            installmentRevenue = forceCol3Rev;
          } else if (colIdxDtTraGop !== -1 && tokens[colIdxDtTraGop - headerColOffset] !== undefined) {
            installmentRevenue = parseNum(tokens[colIdxDtTraGop - headerColOffset]);
          } else if (tokens.length >= 2) {
            installmentRevenue = parseNum(tokens[1]);
          } else if (tokens.length === 1) {
            installmentRevenue = parseNum(tokens[0]);
          }

          if (colIdxTiTrongTraGop !== -1 && tokens[colIdxTiTrongTraGop - headerColOffset] !== undefined) {
            installmentRate = parsePercent(tokens[colIdxTiTrongTraGop - headerColOffset]);
          } else {
            const pctToken = tokens.find(t => t.includes('%'));
            if (pctToken) {
              installmentRate = parsePercent(pctToken);
            }
          }
          revenue = installmentRevenue;
        } else {
          // Cột thứ 3 từ trái sang của bảng data luôn là doanh thu (tokens[1])
          if (colIdxRev !== -1 && tokens[colIdxRev - headerColOffset] !== undefined) {
            revenue = parseNum(tokens[colIdxRev - headerColOffset]);
          } else if (tokens.length >= 2) {
            revenue = parseNum(tokens[1]);
          } else if (tokens.length === 1) {
            revenue = parseNum(tokens[0]);
          }

          // Báo cáo 11 cột có chứa cột DOANH THU thực ở cột thứ 5 từ trái sang (tokens[3])
          if (tokens.length >= 7 && (tokens[2]?.includes('%') || tokens[1]?.includes('%'))) {
            embeddedActualRevenue = parseNum(tokens[3]);
          }
        }

        if (mode !== 'tragop') {
          if (colIdxDtTraGop !== -1 && tokens[colIdxDtTraGop - headerColOffset] !== undefined) {
            installmentRevenue = parseNum(tokens[colIdxDtTraGop - headerColOffset]);
          } else if (tokens.length >= 10) {
            installmentRevenue = parseNum(tokens[tokens.length - 2]);
          }

          if (colIdxTiTrongTraGop !== -1 && tokens[colIdxTiTrongTraGop - headerColOffset] !== undefined) {
            installmentRate = parsePercent(tokens[colIdxTiTrongTraGop - headerColOffset]);
          } else if (tokens.length >= 10) {
            installmentRate = parsePercent(tokens[tokens.length - 1]);
          }
        }

        staffList.push({
          id: nameParts[0].trim(),
          name: cleanName,
          revenue,
          embeddedActualRevenue,
          installmentRevenue,
          installmentRate
        });
      };

      let currentStaffLine: string | null = null;
      let currentValues: string[] = [];
      const startIndex = firstStaffIdx !== -1 ? firstStaffIdx : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('Tổng (') || line === 'Tổng' || line.startsWith('Tổng ') ||
            (line.includes('1-') && line.includes('/ Tổng')) || line.includes('Đơn vị:') || line.includes('Tỉ trọng tính')) {
          break;
        }

        if (line.includes('\t')) {
          const cols = line.split('\t').map(c => c.trim()).filter(Boolean);
          if (cols.length >= 3) {
            if (isStaffLine(cols[0])) {
              if (currentStaffLine) {
                pushStaff(currentStaffLine, currentValues);
                currentStaffLine = null;
                currentValues = [];
              }
              // Cột thứ 3 từ trái sang là cols[2]!
              const col3Val = (mode === 'thuc' || mode === 'tragop') ? parseNum(cols[2]) : undefined;
              pushStaff(cols[0], cols.slice(1), col3Val);
              continue;
            } else if (isStaffLine(cols[1])) {
              // Trường hợp cols[0] là STT, cols[1] là Tên NV, Cột thứ 3 từ trái sang là cols[2]!
              if (currentStaffLine) {
                pushStaff(currentStaffLine, currentValues);
                currentStaffLine = null;
                currentValues = [];
              }
              const col3Val = (mode === 'thuc' || mode === 'tragop') ? parseNum(cols[2]) : undefined;
              pushStaff(cols[1], cols.slice(2), col3Val);
              continue;
            }
          }
        }

        if (isStaffLine(line)) {
          if (currentStaffLine) {
            pushStaff(currentStaffLine, currentValues);
          }
          currentStaffLine = line;
          currentValues = [];
        } else {
          if (currentStaffLine) {
            currentValues.push(line);
          }
        }
      }

      if (currentStaffLine) {
        pushStaff(currentStaffLine, currentValues);
      }

      return { staffList, timeStr: extractedTime };
    };

    const qdResult = parseSingleReport(rawInput, 'qd');
    const thucResult = parseSingleReport(rawInputThuc, 'thuc');
    const tragopResult = parseSingleReport(rawInputTraGop, 'tragop');

    const hasThucInput = thucResult.staffList.length > 0;
    const staffMap = new Map<string, StaffRowItem>();

    // 1. Nạp nhân sự từ D.THU QUY ĐỔI
    for (const s of qdResult.staffList) {
      staffMap.set(s.id, {
        id: s.id,
        name: s.name,
        convertedRevenue: s.revenue,
        actualRevenue: s.embeddedActualRevenue !== undefined ? s.embeddedActualRevenue : (hasThucInput ? 0 : s.revenue),
        shareRate: 0,
        installmentRevenue: s.installmentRevenue,
        installmentRate: s.installmentRate
      });
    }

    // 2. Nạp / cập nhật từ D.THU THỰC
    for (const s of thucResult.staffList) {
      if (staffMap.has(s.id)) {
        const item = staffMap.get(s.id)!;
        item.actualRevenue = s.revenue;
        if (item.installmentRevenue === 0 && s.installmentRevenue > 0) {
          item.installmentRevenue = s.installmentRevenue;
          item.installmentRate = s.installmentRate;
        }
      } else {
        staffMap.set(s.id, {
          id: s.id,
          name: s.name,
          convertedRevenue: 0,
          actualRevenue: s.revenue,
          shareRate: 0,
          installmentRevenue: s.installmentRevenue,
          installmentRate: s.installmentRate
        });
      }
    }

    // 3. Nạp / cập nhật từ D.THU TRẢ GÓP
    for (const s of tragopResult.staffList) {
      const instRev = s.installmentRevenue || s.revenue;
      if (staffMap.has(s.id)) {
        const item = staffMap.get(s.id)!;
        item.installmentRevenue = instRev;
        if (s.installmentRate > 0) {
          item.installmentRate = s.installmentRate;
        } else if (item.actualRevenue > 0) {
          item.installmentRate = Math.round((item.installmentRevenue / item.actualRevenue) * 1000) / 10;
        }
      } else {
        staffMap.set(s.id, {
          id: s.id,
          name: s.name,
          convertedRevenue: 0,
          actualRevenue: 0,
          shareRate: 0,
          installmentRevenue: instRev,
          installmentRate: s.installmentRate
        });
      }
    }

    // 4. Tính HQ.QĐ & % Trả Góp cho từng nhân sự
    for (const item of staffMap.values()) {
      if (item.actualRevenue !== 0) {
        item.shareRate = Math.round(((item.convertedRevenue - item.actualRevenue) / Math.abs(item.actualRevenue)) * 1000) / 10;
      } else if (item.convertedRevenue > 0) {
        item.shareRate = 100.0;
      } else {
        item.shareRate = 0.0;
      }

      if (item.installmentRevenue > 0 && item.installmentRate === 0) {
        if (item.actualRevenue > 0) {
          item.installmentRate = Math.round((item.installmentRevenue / item.actualRevenue) * 1000) / 10;
        } else if (item.convertedRevenue > 0) {
          item.installmentRate = Math.round((item.installmentRevenue / item.convertedRevenue) * 1000) / 10;
        }
      }
    }

    const rows = Array.from(staffMap.values());
    // Sắp xếp giảm dần theo DT. QUY ĐỔI (hoặc DT Thực nếu bằng nhau)
    rows.sort((a, b) => b.convertedRevenue - a.convertedRevenue || b.actualRevenue - a.actualRevenue);

    // Apply Filter based on excludedStaffIds AND onlyWithRevenue
    let displayRows = rows.filter(r => !excludedStaffIds.includes(r.id));
    if (onlyWithRevenue) {
      displayRows = displayRows.filter(r => r.convertedRevenue !== 0 || r.actualRevenue !== 0 || r.installmentRevenue !== 0);
    }

    // Recalculate totals for displayed staff: HQ.QĐ dòng tổng = (DT.QĐ - DT.THỰC) / DT.THỰC
    const totalActual = displayRows.reduce((acc, r) => acc + r.actualRevenue, 0);
    const totalConverted = displayRows.reduce((acc, r) => acc + r.convertedRevenue, 0);
    const totalInstallment = displayRows.reduce((acc, r) => acc + r.installmentRevenue, 0);

    const displayTotals = {
      actualRevenue: totalActual,
      convertedRevenue: totalConverted,
      shareRate: totalActual !== 0 
        ? Math.round(((totalConverted - totalActual) / Math.abs(totalActual)) * 1000) / 10 
        : (totalConverted > 0 ? 100.0 : 0.0),
      installmentRevenue: totalInstallment,
      installmentRate: totalActual > 0 ? Math.round((totalInstallment / totalActual) * 1000) / 10 : 0
    };

    if (displayTotals.actualRevenue > 0) {
      displayTotals.installmentRate = Math.round((displayTotals.installmentRevenue / displayTotals.actualRevenue) * 1000) / 10;
    }

    const timeStr = qdResult.timeStr || thucResult.timeStr || tragopResult.timeStr || '19:21:19 - 20/10/2026';

    return {
      timeStr,
      timeStrQd: qdResult.timeStr,
      timeStrThuc: thucResult.timeStr,
      timeStrTraGop: tragopResult.timeStr,
      displayRows,
      allRows: rows,
      totals: displayTotals,
      qdStaffCount: qdResult.staffList.length,
      thucStaffCount: thucResult.staffList.length,
      tragopStaffCount: tragopResult.staffList.length
    };
  }, [rawInput, rawInputThuc, rawInputTraGop, onlyWithRevenue, excludedStaffIds]);

  // Export Table to PNG
  const handleExportPng = async () => {
    if (!tableRef.current) return;
    setIsCapturing(true);
    try {
      if (captureElement) {
        captureElement(tableRef, `Realtime_DThu_Qui_Doi_${cleanStore}`);
      } else {
        const rawDataUrl = await domToPng(tableRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const dataUrl = await addWhiteBorderToDataUrl(rawDataUrl, 20, tableRef.current.offsetWidth);
        const link = document.createElement('a');
        link.download = `Realtime_DThu_Qui_Doi_${cleanStore}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error('Export PNG failed:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Copy Zalo Summary
  const handleCopyZalo = () => {
    const { displayRows, totals, timeStr } = parsedData;
    const lines = [
      `⚡ BẢNG REALTIME DOANH THU QUI ĐỔI ⚡`,
      `⏰ ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ...displayRows.map((r, i) => 
        `#${i + 1} ${r.name}: ${r.convertedRevenue} Tr QĐ (Thực: ${r.actualRevenue} Tr | TG: ${r.installmentRevenue} Tr - ${r.installmentRate}%)`
      ),
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `⭐ TỔNG CỘNG (${displayRows.length} NV):`,
      `• DT Thực: ${totals.actualRevenue} Tr`,
      `• DT Quy Đổi: ${totals.convertedRevenue} Tr (100%)`,
      `• DT Trả Góp: ${totals.installmentRevenue} Tr (${totals.installmentRate}%)`
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  const { timeStr, displayRows, totals, allRows, qdStaffCount, thucStaffCount, tragopStaffCount, timeStrQd, timeStrThuc, timeStrTraGop } = parsedData;
  const count = displayRows.length;
  const excludedCount = excludedStaffIds.length;

  // Filter modal staff list filtered by search term
  const modalStaffList = useMemo(() => {
    if (!filterSearchTerm.trim()) return allRows;
    const q = filterSearchTerm.toLowerCase().trim();
    return allRows.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [allRows, filterSearchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-12" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      
      {/* ── CARD REALTIME: Ô DÁN DỮ LIỆU D.THU THỰC & D.THU QUY ĐỔI & D.THU TRẢ GÓP ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 no-capture">
        {/* Header Realtime */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black border border-emerald-100 shadow-2xs">
              <Zap size={22} className="text-emerald-500 fill-emerald-500/20" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                REALTIME
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
                Ô dán dữ liệu: Doanh Thu Nhân Viên (ST: {cleanStore})
              </p>
            </div>
          </div>

          {/* Cloud Sync Status & Quick filter toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {syncStatus === 'saving' ? (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-ping" />
                Đang đồng bộ Cloud...
              </span>
            ) : syncStatus === 'synced' ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Đã đồng bộ Cloud
              </span>
            ) : null}

            {/* View Toggle */}
            <div className="inline-flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleToggleOnlyWithRevenue(true)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] sm:text-xs font-black transition-all cursor-pointer ${
                  onlyWithRevenue ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chỉ NV Có DT ({allRows.filter(r => r.convertedRevenue > 0 || r.actualRevenue > 0 || r.installmentRevenue > 0).length})
              </button>
              <button
                type="button"
                onClick={() => handleToggleOnlyWithRevenue(false)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] sm:text-xs font-black transition-all cursor-pointer ${
                  !onlyWithRevenue ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hiện Tất Cả ({allRows.length})
              </button>
            </div>
          </div>
        </div>

        {/* ── BỐ CỤC 3 CỘT: Ô "D.THU THỰC", Ô "D.THU QUY ĐỔI", Ô "D.THU TRẢ GÓP" ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {/* ── CỘT 1: D.THU THỰC ── */}
          <div ref={boxThucRef} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 space-y-3 shadow-2xs h-full flex flex-col justify-between">
            {/* Header D.Thu Thực */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-blue-600 shrink-0" />
                <span className="text-sm sm:text-base font-black text-blue-700">
                  D.Thu Thực
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {timeStrThuc && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] sm:text-xs font-bold">
                    <Clock size={13} className="text-blue-600" />
                    Cập nhật: {timeStrThuc.includes(' - ') ? timeStrThuc.replace(' - ', ' NGÀY ') : timeStrThuc}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] sm:text-xs font-black">
                  {thucStaffCount > 0 ? `${thucStaffCount} nhân sự` : `${rawInputThuc.trim() ? rawInputThuc.trim().split('\n').filter(Boolean).length : 0} dòng`}
                </span>
              </div>
            </div>

            {/* Trạng thái Khóa / Mở dán mới D.Thu Thực */}
            {!isEditingThuc ? (
              <div 
                onClick={() => {
                  setIsEditingThuc(true);
                  setTempThuc('');
                }}
                className="bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/90 rounded-2xl p-2 sm:p-2.5 flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] group select-none"
                title="Click vào bất kỳ vị trí nào trong ô này để mở dán mới"
              >
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all pointer-events-none"
                >
                  <Unlock size={15} />
                  <span>Mở dán mới</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <textarea
                  value={tempThuc}
                  onPaste={(e) => {
                    const text = e.clipboardData?.getData('text');
                    if (text && text.trim()) {
                      e.preventDefault();
                      handleSaveAndLockThuc(text);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempThuc(val);
                    if (val && val.trim()) {
                      handleSaveAndLockThuc(val);
                    }
                  }}
                  placeholder="Dán toàn bộ dữ liệu báo cáo DOANH THU THỰC tại đây... (Tự động Khóa & Lưu ngay khi dán)"
                  rows={5}
                  autoFocus
                  className="w-full p-3.5 bg-white border-2 border-blue-400 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-200 transition-all resize-y"
                />

                <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    💡 Tự động <b>Khóa &amp; Lưu</b> ngay khi dán • Click ra ngoài để đóng
                  </span>

                  {/* Xóa trắng nếu muốn xóa hẳn */}
                  {rawInputThuc.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Bạn có chắc muốn xóa trắng hoàn toàn dữ liệu D.Thu Thực?')) {
                          handleSaveDataThuc('', true);
                          setIsEditingThuc(false);
                          setTempThuc('');
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    >
                      <Trash2 size={12} />
                      <span>Xóa Trắng</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── CỘT 2: D.THU QUY ĐỔI ── */}
          <div ref={boxQdRef} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 space-y-3 shadow-2xs h-full flex flex-col justify-between">
            {/* Header D.Thu Quy Đổi */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-emerald-600 shrink-0" />
                <span className="text-sm sm:text-base font-black text-emerald-700">
                  D.Thu Quy Đổi
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {timeStrQd && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] sm:text-xs font-bold">
                    <Clock size={13} className="text-emerald-600" />
                    Cập nhật: {timeStrQd.includes(' - ') ? timeStrQd.replace(' - ', ' NGÀY ') : timeStrQd}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] sm:text-xs font-black">
                  {qdStaffCount > 0 ? `${qdStaffCount} nhân sự` : `${rawInput.trim() ? rawInput.trim().split('\n').filter(Boolean).length : 0} dòng`}
                </span>
              </div>
            </div>

            {/* Trạng thái Khóa / Mở dán mới D.Thu Quy Đổi */}
            {!isEditingQd ? (
              <div 
                onClick={() => {
                  setIsEditingQd(true);
                  setTempQd('');
                }}
                className="bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/90 rounded-2xl p-2 sm:p-2.5 flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] group select-none"
                title="Click vào bất kỳ vị trí nào trong ô này để mở dán mới"
              >
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all pointer-events-none"
                >
                  <Unlock size={15} />
                  <span>Mở dán mới</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <textarea
                  value={tempQd}
                  onPaste={(e) => {
                    const text = e.clipboardData?.getData('text');
                    if (text && text.trim()) {
                      e.preventDefault();
                      handleSaveAndLockQd(text);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempQd(val);
                    if (val && val.trim()) {
                      handleSaveAndLockQd(val);
                    }
                  }}
                  placeholder="Dán toàn bộ dữ liệu báo cáo DOANH THU QUY ĐỔI tại đây... (Tự động Khóa & Lưu ngay khi dán)"
                  rows={5}
                  autoFocus
                  className="w-full p-3.5 bg-white border-2 border-emerald-400 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-200 transition-all resize-y"
                />

                <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    💡 Tự động <b>Khóa &amp; Lưu</b> ngay khi dán • Click ra ngoài để đóng
                  </span>

                  {/* Xóa trắng nếu muốn xóa hẳn */}
                  {rawInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Bạn có chắc muốn xóa trắng hoàn toàn dữ liệu D.Thu Quy Đổi?')) {
                          handleSaveData('', true);
                          setIsEditingQd(false);
                          setTempQd('');
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    >
                      <Trash2 size={12} />
                      <span>Xóa Trắng</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── CỘT 3: D.THU TRẢ GÓP ── */}
          <div ref={boxTraGopRef} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 space-y-3 shadow-2xs h-full flex flex-col justify-between">
            {/* Header D.Thu Trả Góp */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-purple-600 shrink-0" />
                <span className="text-sm sm:text-base font-black text-purple-700">
                  D.Thu Trả Góp
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {timeStrTraGop && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] sm:text-xs font-bold">
                    <Clock size={13} className="text-purple-600" />
                    Cập nhật: {timeStrTraGop.includes(' - ') ? timeStrTraGop.replace(' - ', ' NGÀY ') : timeStrTraGop}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] sm:text-xs font-black">
                  {tragopStaffCount > 0 ? `${tragopStaffCount} nhân sự` : `${rawInputTraGop.trim() ? rawInputTraGop.trim().split('\n').filter(Boolean).length : 0} dòng`}
                </span>
              </div>
            </div>

            {/* Trạng thái Khóa / Mở dán mới D.Thu Trả Góp */}
            {!isEditingTraGop ? (
              <div 
                onClick={() => {
                  setIsEditingTraGop(true);
                  setTempTraGop('');
                }}
                className="bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/90 rounded-2xl p-2 sm:p-2.5 flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] group select-none"
                title="Click vào bất kỳ vị trí nào trong ô này để mở dán mới"
              >
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all pointer-events-none"
                >
                  <Unlock size={15} />
                  <span>Mở dán mới</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <textarea
                  value={tempTraGop}
                  onPaste={(e) => {
                    const text = e.clipboardData?.getData('text');
                    if (text && text.trim()) {
                      e.preventDefault();
                      handleSaveAndLockTraGop(text);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempTraGop(val);
                    if (val && val.trim()) {
                      handleSaveAndLockTraGop(val);
                    }
                  }}
                  placeholder="Dán toàn bộ dữ liệu báo cáo DOANH THU TRẢ GÓP tại đây... (Tự động Khóa & Lưu ngay khi dán)"
                  rows={5}
                  autoFocus
                  className="w-full p-3.5 bg-white border-2 border-purple-400 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-200 transition-all resize-y"
                />

                <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    💡 Tự động <b>Khóa &amp; Lưu</b> ngay khi dán • Click ra ngoài để đóng
                  </span>

                  {/* Xóa trắng nếu muốn xóa hẳn */}
                  {rawInputTraGop.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Bạn có chắc muốn xóa trắng hoàn toàn dữ liệu D.Thu Trả Góp?')) {
                          handleSaveDataTraGop('', true);
                          setIsEditingTraGop(false);
                          setTempTraGop('');
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    >
                      <Trash2 size={12} />
                      <span>Xóa Trắng</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TOP ACTION BUTTONS (BỘ LỌC NV / XUẤT ẢNH / ZALO / AUTO ZOOM) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-0.5 sm:px-1 no-capture">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <Sparkles size={11} className="text-emerald-600 sm:w-[13px] sm:h-[13px]" />
            MẪU CHUẨN MWG
          </span>
          <span className="text-[11px] sm:text-xs text-slate-600 font-bold">
            Hiển thị <b>{count}</b> / {allRows.length} NV
          </span>
          {excludedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] sm:text-[11px] font-extrabold border border-amber-200">
              Đang ẩn {excludedCount} NV
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
          {/* NÚT AUTO ZOOM / CUỘN NGANG */}
          <button
            type="button"
            onClick={() => setIsTableAutoFit(!isTableAutoFit)}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border shadow-xs cursor-pointer transition-all active:scale-95 ${
              isTableAutoFit
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
            title={isTableAutoFit ? "Đang bật Auto Zoom vừa màn hình mobile (Bấm để chuyển sang cuộn ngang)" : "Bật Auto Zoom vừa màn hình mobile"}
          >
            <Scan size={12} className="shrink-0 sm:w-[13px] sm:h-[13px]" />
            <span className="truncate">{isTableAutoFit ? 'Auto Zoom' : 'Cuộn ngang'}</span>
          </button>

          {/* BỘ LỌC NHÂN VIÊN BUTTON */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border shadow-xs cursor-pointer transition-all active:scale-95 ${
              excludedCount > 0 
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Filter size={12} className={`shrink-0 sm:w-[14px] sm:h-[14px] ${excludedCount > 0 ? 'text-white' : 'text-emerald-600'}`} />
            <span className="truncate">Lọc NV ({count})</span>
          </button>

          {/* COPY NHẬN XÉT ZALO */}
          <button
            type="button"
            onClick={handleCopyZalo}
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
          >
            {isCopied ? <Check size={12} className="text-emerald-300 shrink-0 sm:w-[14px] sm:h-[14px]" /> : <Copy size={12} className="shrink-0 sm:w-[14px] sm:h-[14px]" />}
            <span className="truncate">{isCopied ? 'Đã Copy!' : 'Copy Zalo'}</span>
          </button>

          {/* XUẤT ẢNH BẢNG (PNG) */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={isCapturing}
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/25 cursor-pointer transition-all active:scale-95"
          >
            <Camera size={12} className="shrink-0 sm:w-[14px] sm:h-[14px]" />
            <span className="truncate">{isCapturing ? 'Đang Xuất...' : 'Xuất Ảnh'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. BẢNG TRONG TAB REAL D.THU NV NHƯ HÌNH ── */}
      <div 
        ref={tableRef}
        className="w-full bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-300/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] select-none"
        style={{ fontFamily: "'UTM Avo', 'Inter', -apple-system, sans-serif" }}
      >
        {/* Header Banner - Emerald Green with Neon Gold Title */}
        <div className="bg-[#00825e] text-center pt-3 pb-2.5 sm:pt-5 sm:pb-4 px-2 sm:px-4">
          <h1 
            className="text-lg sm:text-2xl md:text-[32px] font-black uppercase tracking-wider text-[#ffe500] drop-shadow-xs whitespace-nowrap"
            style={{ letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
          >
            REALTIME D.THU QUI ĐỔI
          </h1>
          <div 
            className="flex flex-row flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 text-white/95 font-bold text-[10px] sm:text-xs md:text-sm mt-1 sm:mt-1.5 tracking-wide whitespace-nowrap select-none"
            style={{ 
              whiteSpace: 'nowrap', 
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'nowrap', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <span 
              className="text-[#ffe500] font-black inline-flex items-center gap-0.5 sm:gap-1 whitespace-nowrap"
              style={{ 
                whiteSpace: 'nowrap', 
                display: 'inline-flex', 
                alignItems: 'center', 
                flexWrap: 'nowrap',
                flexShrink: 0 
              }}
            >
              <span className="inline-block leading-none select-none text-[11px] sm:text-[13px] md:text-[15px]">⚡</span>
              <span className="leading-none text-[10px] sm:text-xs md:text-sm font-black">Realtime</span>
            </span>
            <span 
              className="text-white/60 font-mono font-bold select-none px-0.5 whitespace-nowrap leading-none text-[9px] sm:text-xs"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              ||
            </span>
            <span 
              className="font-bold tracking-wider whitespace-nowrap leading-none text-white/95 text-[10px] sm:text-xs md:text-sm"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {timeStr}
            </span>
          </div>
        </div>

        {/* Khoảng trắng giữa Tiêu đề lớn và Tiêu đề cột */}
        <div className="h-1.5 sm:h-2.5 bg-white w-full" style={{ height: '6px', backgroundColor: '#ffffff' }} />

        {/* The Exact 7 Columns Table with AutoFitTable */}
        <AutoFitTable
          id="real-doanh-thu-nv-table-container"
          minWidth={660}
          minScale={0.3}
          disabled={!isTableAutoFit}
          className="w-full bg-white"
        >
          <table 
            className="w-full text-center border-collapse table-fixed" 
            style={{ width: '100%', minWidth: '660px', tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: '44px' }} />
              <col className="w-auto" style={{ minWidth: '180px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '75px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '85px' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#006b4b] text-white text-[11px] sm:text-xs md:text-[13px] font-black uppercase tracking-wider h-[34px] sm:h-[38px] md:h-[42px]">
                <th className="py-1.5 sm:py-2.5 px-0.5 sm:px-1 border-r border-[#00573d]/40 text-center whitespace-nowrap overflow-hidden">
                  STT
                </th>
                <th className="py-1.5 sm:py-2.5 px-2 sm:px-3 text-left border-r border-[#00573d]/40 whitespace-nowrap overflow-hidden">
                  NHÂN VIÊN
                </th>
                <th className="py-1.5 sm:py-2.5 px-1 border-r border-[#00573d]/40 text-center tracking-tight whitespace-nowrap overflow-hidden">
                  DT. THỰC
                </th>
                <th className="py-1.5 sm:py-2.5 px-1 border-r border-[#00573d]/40 text-center tracking-tight whitespace-nowrap overflow-hidden">
                  DT. QUY ĐỔI
                </th>
                <th className="py-1.5 sm:py-2.5 px-1 border-r border-[#00573d]/40 text-center tracking-tight whitespace-nowrap overflow-hidden">
                  HQ.QĐ
                </th>
                <th className="py-1.5 sm:py-2.5 px-1 border-r border-[#00573d]/40 text-center tracking-tight whitespace-nowrap overflow-hidden">
                  DT TRẢ GÓP
                </th>
                <th className="py-1.5 sm:py-2.5 px-1 text-center tracking-tight whitespace-nowrap overflow-hidden">
                  % TRẢ GÓP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/70 font-black">
              {displayRows.map((staff, idx) => {
                const rankNum = idx + 1;
                
                // Color coding for Employee Name:
                // - Top 3: Green (#00825e)
                // - Bottom 20%: Red (#e11d48) (strictly based on Bottom 20% ranking, NOT on whether values are 0)
                // - Middle: Black (#0f172a)
                const botCount = Math.max(1, Math.ceil(count * 0.2));
                const isTop = rankNum <= 3;
                const isBottom = !isTop && rankNum > count - botCount;

                return (
                  <tr 
                    key={`${staff.id}-${idx}`}
                    className="bg-white hover:bg-emerald-50/60 transition-colors group h-[32px] sm:h-[36px] md:h-[40px]"
                  >
                    {/* STT: #1, #2, ... in bold emerald */}
                    <td className="py-1 sm:py-2 px-1 font-black text-[#00825e] text-center text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden">
                      #{rankNum}
                    </td>

                    {/* NHÂN VIÊN: Bold Uppercase Name with Quick Hide Option */}
                    <td className="py-1 sm:py-2 px-2 sm:px-3 text-left font-black tracking-tight text-[12px] sm:text-[13px] overflow-hidden whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1 overflow-hidden whitespace-nowrap">
                        <span 
                          className={`truncate block flex-1 leading-tight ${
                            isTop ? "text-[#00825e]" :
                            isBottom ? "text-[#e11d48]" :
                            "text-[#0f172a]"
                          }`}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={staff.name}
                        >
                          {staff.name}
                        </span>

                        {/* Inline Hide Button (No-Capture) */}
                        <button
                          type="button"
                          onClick={() => handleToggleStaff(staff.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 sm:p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 no-capture cursor-pointer shrink-0"
                          title="Ẩn nhân viên này khỏi bảng (lưu tự động)"
                        >
                          <EyeOff size={12} className="sm:w-[13px] sm:h-[13px]" />
                        </button>
                      </div>
                    </td>

                    {/* DT. THỰC: Bold Dark Slate, Red pill badge if 0 */}
                    <td className="py-1 sm:py-2 px-1 font-black text-[#0f172a] text-center text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden">
                      {staff.actualRevenue === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[11px] sm:text-xs leading-tight">
                          0
                        </span>
                      ) : (
                        staff.actualRevenue
                      )}
                    </td>

                    {/* DT. QUY ĐỔI: Bold Emerald Green, Red pill badge if 0 */}
                    <td className="py-1 sm:py-2 px-1 font-black text-[#00825e] text-center text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden">
                      {staff.convertedRevenue === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[11px] sm:text-xs leading-tight">
                          0
                        </span>
                      ) : (
                        staff.convertedRevenue
                      )}
                    </td>

                    {/* HQ.QĐ: Green if > 0.0%, Red pill badge if <= 0.0% */}
                    <td className="py-1 sm:py-2 px-1 font-black text-center text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden">
                      {staff.shareRate <= 0 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[10.5px] sm:text-[12px] leading-tight">
                          {staff.shareRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#00825e] leading-tight text-[12px] sm:text-[13px]">
                          {staff.shareRate.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    {/* DT TRẢ GÓP: Bold Blue, Red pill badge if 0 */}
                    <td className="py-1 sm:py-2 px-1 font-black text-center text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden">
                      {staff.installmentRevenue === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[11px] sm:text-xs leading-tight">
                          0
                        </span>
                      ) : (
                        <span className="text-[#1d4ed8]">
                          {staff.installmentRevenue}
                        </span>
                      )}
                    </td>

                    {/* % TRẢ GÓP: Pill Badge (Green >= 50%, Red < 50%) */}
                    <td className="py-1 sm:py-2 px-1 text-center font-black text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden">
                      {staff.installmentRate >= 50.0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#e6f8ef] text-[#00825e] font-black text-[10.5px] sm:text-[12px] leading-tight">
                          {staff.installmentRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[10.5px] sm:text-[12px] leading-tight">
                          {staff.installmentRate.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Dòng Tổng - Exact Dark Green Footer matching image */}
            <tfoot>
              <tr className="bg-[#006b4b] text-white font-black text-[11.5px] sm:text-[13px] md:text-[14px] h-[34px] sm:h-[40px]">
                <td colSpan={2} className="py-1.5 sm:py-2.5 px-2 sm:px-3 text-left uppercase tracking-wider border-r border-[#00573d]/40 whitespace-nowrap overflow-hidden">
                  TỔNG ({count} NV)
                </td>
                <td className="py-1.5 sm:py-2.5 px-1 text-center border-r border-[#00573d]/40 whitespace-nowrap overflow-hidden">
                  {totals.actualRevenue}
                </td>
                <td className="py-1.5 sm:py-2.5 px-1 text-center border-r border-[#00573d]/40 whitespace-nowrap overflow-hidden">
                  {totals.convertedRevenue}
                </td>
                <td className="py-1.5 sm:py-2.5 px-1 text-center text-[#ffe500] border-r border-[#00573d]/40 whitespace-nowrap overflow-hidden">
                  {totals.shareRate.toFixed(1)}%
                </td>
                <td className="py-1.5 sm:py-2.5 px-1 text-center border-r border-[#00573d]/40 whitespace-nowrap overflow-hidden">
                  {totals.installmentRevenue}
                </td>
                <td className="py-1.5 sm:py-2.5 px-1 text-center whitespace-nowrap overflow-hidden">
                  {totals.installmentRate.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </AutoFitTable>
      </div>

      {/* ── 3. MODAL BỘ LỌC NHÂN VIÊN (LƯU TỰ ĐỘNG) ── */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-capture">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#00825e] text-white flex items-center justify-center font-black shadow-xs">
                    <Filter size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      BỘ LỌC HIỂN THỊ NHÂN VIÊN
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-0.5">
                      <span>Hiển thị: <b>{allRows.length - excludedStaffIds.length} / {allRows.length} NV</b></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-black">✓ Đã lưu tự động</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Quick Actions & Search */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50 space-y-2.5">
                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterSearchTerm}
                    onChange={e => setFilterSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên hoặc mã nhân viên..."
                    className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-all"
                  />
                  {filterSearchTerm && (
                    <button 
                      onClick={() => setFilterSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleShowAllStaff}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-black cursor-pointer transition-colors"
                  >
                    Hiện Tất Cả
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyWithRevenue}
                    className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-black cursor-pointer transition-colors"
                  >
                    Chỉ Chọn Có DT
                  </button>
                  <button
                    type="button"
                    onClick={handleHideAllStaff}
                    className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-black cursor-pointer transition-colors"
                  >
                    Ẩn Hết
                  </button>
                </div>
              </div>

              {/* Staff Checklist */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
                {modalStaffList.map((staff, sIdx) => {
                  const isExcluded = excludedStaffIds.includes(staff.id);
                  const isSelected = !isExcluded;

                  return (
                    <div
                      key={`${staff.id}-${sIdx}`}
                      onClick={() => handleToggleStaff(staff.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors select-none ${
                        isSelected 
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/70' 
                          : 'hover:bg-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? (
                          <CheckSquare size={18} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Square size={18} className="text-slate-400 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-black uppercase ${isSelected ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                              {staff.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              ({staff.id})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-medium">
                            <span>QĐ: <b className="text-emerald-700">{staff.convertedRevenue} Tr</b></span>
                            <span>•</span>
                            <span>Thực: <b>{staff.actualRevenue} Tr</b></span>
                            <span>•</span>
                            <span>TG: <b>{staff.installmentRate}%</b></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <Eye size={11} /> Hiển thị
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                            <EyeOff size={11} /> Đã ẩn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">
                  Mọi thay đổi đều được <b>lưu tự động</b>
                </span>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-5 py-2 bg-[#00825e] hover:bg-[#007050] text-white rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer transition-colors shadow-xs"
                >
                  Đóng & Áp Dụng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RealDoanhThuNvTab;
