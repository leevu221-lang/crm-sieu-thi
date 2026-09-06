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
  ClipboardPaste, 
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
  Square
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

export const DEFAULT_RAW_MWG_DATA_1841 = `Dashboards
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

  // Input Box State
  const [rawInput, setRawInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved.trim()) return saved;
      const legacy = localStorage.getItem(`mwg_rt_staff_raw_${cleanStore}`);
      if (legacy && legacy.trim()) return legacy;
    } catch (e) {}
    return cleanStore === '1841' ? DEFAULT_RAW_MWG_DATA_1841 : '';
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
  const [isInputCollapsed, setIsInputCollapsed] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const tableRef = useRef<HTMLDivElement>(null);

  // Sync with selected store and subscribe to Cloud Firestore for cross-browser/mobile real-time sync
  useEffect(() => {
    if (!cleanStore) return;

    // 1. Initial fast local load from localStorage
    try {
      const saved = localStorage.getItem(`real_dthu_nv_raw_${cleanStore}`);
      if (saved && saved.trim()) {
        setRawInput(saved);
      } else if (cleanStore === '1841') {
        setRawInput(DEFAULT_RAW_MWG_DATA_1841);
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
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && !isEditingRef.current) {
          if (typeof data.rawInput === 'string') {
            setRawInput(data.rawInput);
            try { localStorage.setItem(`real_dthu_nv_raw_${cleanStore}`, data.rawInput); } catch (e) {}
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
        // Seed current local data or default template to Firestore so other devices (e.g. mobile) can immediately get it!
        const initialToSave = localStorage.getItem(`real_dthu_nv_raw_${cleanStore}`) || (cleanStore === '1841' ? DEFAULT_RAW_MWG_DATA_1841 : '');
        if (initialToSave) {
          setDoc(docRef, {
            storeId: cleanStore,
            rawInput: initialToSave,
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

  // Save raw data changes with debounce (typing) or immediate (paste / clear / reset)
  const handleSaveData = (text: string, immediate: boolean = false) => {
    isEditingRef.current = true;
    setRawInput(text);
    try {
      localStorage.setItem(`real_dthu_nv_raw_${cleanStore}`, text);
    } catch (e) {}

    setSyncStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const performCloudSave = async () => {
      try {
        const docRef = doc(db, 'app_settings', `real_dthu_nv_${cleanStore}`);
        await setDoc(docRef, {
          storeId: cleanStore,
          rawInput: text,
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

  const handleResetDefault = () => {
    handleSaveData(DEFAULT_RAW_MWG_DATA_1841, true);
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

  // Parser for Raw Text Data
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

    const lines = rawInput.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Extract update time
    let timeStr = '12:04:01 - 5/9/2026';
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
          if (tMatch) {
            timeStr = `${tMatch[1]}${dateStr ? ` - ${dateStr}` : ''}`;
          } else {
            timeStr = raw;
          }
        }
        break;
      }
    }

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

    // 2. Locate header if present
    let headerIdx = -1;
    let columnHeaders: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      const l = raw.toUpperCase();

      // Skip MWG navigation/filter bars
      if (l.includes('DOANH THU THEO CẤP') || l.includes('TỔNG HỢPNGÀNH HÀNG')) continue;

      // Case 1: Header tokens spread across multiple lines starting with exact "NHÂN VIÊN"
      if (l === 'NHÂN VIÊN') {
        headerIdx = i;
        let endIdx = i + 1;
        while (endIdx < lines.length && !isStaffLine(lines[endIdx])) {
          endIdx++;
        }
        columnHeaders = lines.slice(i, endIdx).map(h => h.trim().toUpperCase()).filter(Boolean);
        break;
      }

      // Case 2: Header tokens on a single line separated by tabs or multiple spaces
      if (l.startsWith('NHÂN VIÊN\t') || (l.startsWith('NHÂN VIÊN') && (l.includes('\t') || l.includes('SỐ LƯỢNG') || l.includes('DOANH THU')))) {
        headerIdx = i;
        columnHeaders = raw.split(/[\t]+|\s{2,}/).map(h => h.trim().toUpperCase()).filter(Boolean);
        break;
      }
    }

    const rows: StaffRowItem[] = [];

    let firstStaffIdx = -1;
    for (let i = (headerIdx !== -1 ? headerIdx + 1 : 0); i < lines.length; i++) {
      if (isStaffLine(lines[i])) {
        firstStaffIdx = i;
        break;
      }
    }

    if (headerIdx !== -1 && columnHeaders.length === 0 && firstStaffIdx > headerIdx) {
      columnHeaders = lines.slice(headerIdx, firstStaffIdx).map(h => h.toUpperCase());
    }

    let colIdxDtqd = -1;
    let colIdxTiTrong = -1;
    let colIdxDtThuc = -1;
    let colIdxDtTraGop = -1;
    let colIdxTiTrongTraGop = -1;

    if (columnHeaders.length > 0) {
      colIdxDtqd = columnHeaders.findIndex(h => h.includes('DOANH THU QĐ') || h.includes('DT QĐ') || h.includes('DTQD'));
      colIdxTiTrong = columnHeaders.findIndex(h => h.includes('TỈ TRỌNG') && !h.includes('TRẢ GÓP'));
      colIdxDtThuc = columnHeaders.findIndex(h => h === 'DOANH THU' || h === 'DT THỰC' || h.includes('DOANH THU THỰC'));
      colIdxDtTraGop = columnHeaders.findIndex(h => h.includes('DT TRẢ GÓP') || h.includes('DT TRAGOP'));
      colIdxTiTrongTraGop = columnHeaders.findIndex(h => h.includes('% TRẢ GÓP') || h.includes('% TRAGOP'));
    }

    let currentStaffLine: string | null = null;
    let currentValues: string[] = [];

    const pushStaff = (staffLine: string, values: string[]) => {
      const nameParts = staffLine.split(' - ');
      const cleanName = (nameParts.length > 1 ? nameParts.slice(1).join(' - ') : staffLine).trim().toUpperCase();
      const tokens = tokenize(values);

      let convertedRevenue = 0;
      let shareRate = 0;
      let actualRevenue = 0;
      let installmentRevenue = 0;
      let installmentRate = 0;

      // 1. DT TRẢ GÓP & % TRẢ GÓP (Guaranteed detection)
      if (colIdxDtTraGop !== -1 && tokens[colIdxDtTraGop - 1] !== undefined) {
        installmentRevenue = parseNum(tokens[colIdxDtTraGop - 1]);
      } else if (tokens.length >= 2) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken.includes('%') || lastToken === '—' || lastToken === '-') {
          installmentRevenue = parseNum(tokens[tokens.length - 2]);
        }
      }

      if (colIdxTiTrongTraGop !== -1 && tokens[colIdxTiTrongTraGop - 1] !== undefined) {
        installmentRate = parsePercent(tokens[colIdxTiTrongTraGop - 1]);
      } else if (tokens.length >= 1) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken.includes('%') || lastToken === '—' || lastToken === '-') {
          installmentRate = parsePercent(lastToken);
        }
      }

      // 2. DT THỰC
      if (colIdxDtThuc !== -1 && tokens[colIdxDtThuc - 1] !== undefined) {
        actualRevenue = parseNum(tokens[colIdxDtThuc - 1]);
      } else {
        if (tokens.length >= 7 && (tokens[2]?.includes('%') || tokens[1]?.includes('%'))) {
          actualRevenue = parseNum(tokens[3]);
        } else if (tokens.length > 0) {
          actualRevenue = parseNum(tokens[0]);
        }
      }

      // 3. DT QUY ĐỔI
      if (colIdxDtqd !== -1 && tokens[colIdxDtqd - 1] !== undefined) {
        convertedRevenue = parseNum(tokens[colIdxDtqd - 1]);
      } else {
        if (tokens.length >= 7 && tokens[2]?.includes('%')) {
          convertedRevenue = parseNum(tokens[1]);
        } else {
          convertedRevenue = actualRevenue;
        }
      }

      // 4. HQ.QĐ = (DT.QĐ - DT.THỰC) / DT.THỰC
      shareRate = 0;
      if (actualRevenue !== 0) {
        shareRate = Math.round(((convertedRevenue - actualRevenue) / Math.abs(actualRevenue)) * 1000) / 10;
      } else if (convertedRevenue > 0) {
        shareRate = 100.0;
      }

      rows.push({
        id: nameParts[0].trim(),
        name: cleanName,
        convertedRevenue,
        shareRate,
        actualRevenue,
        installmentRevenue,
        installmentRate
      });
    };

    const startIndex = firstStaffIdx !== -1 ? firstStaffIdx : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Break conditions
      if (line.startsWith('Tổng (') || line === 'Tổng' || line.startsWith('Tổng ') ||
          (line.includes('1-') && line.includes('/ Tổng')) || line.includes('Đơn vị:') || line.includes('Tỉ trọng tính')) {
        break;
      }

      // Case A: Tab-separated single line
      if (line.includes('\t')) {
        const cols = line.split('\t').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 3 && isStaffLine(cols[0])) {
          if (currentStaffLine) {
            pushStaff(currentStaffLine, currentValues);
            currentStaffLine = null;
            currentValues = [];
          }
          pushStaff(cols[0], cols.slice(1));
          continue;
        }
      }

      // Case B: Multi-line or space-separated values blocks
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

    // Sort descending by DT. QUY ĐỔI
    rows.sort((a, b) => b.convertedRevenue - a.convertedRevenue);

    // Apply Filter based on excludedStaffIds AND onlyWithRevenue
    let displayRows = rows.filter(r => !excludedStaffIds.includes(r.id));
    if (onlyWithRevenue) {
      displayRows = displayRows.filter(r => r.convertedRevenue !== 0 || r.actualRevenue !== 0);
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

    return {
      timeStr,
      displayRows,
      allRows: rows,
      totals: displayTotals
    };
  }, [rawInput, onlyWithRevenue, excludedStaffIds]);

  // Export Table to PNG
  const handleExportPng = async () => {
    if (!tableRef.current) return;
    setIsCapturing(true);
    try {
      if (captureElement) {
        captureElement(tableRef, `Realtime_DThu_Qui_Doi_${cleanStore}`);
      } else {
        const dataUrl = await domToPng(tableRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
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

  const { timeStr, displayRows, totals, allRows } = parsedData;
  const count = displayRows.length;
  const excludedCount = excludedStaffIds.length;

  // Filter modal staff list filtered by search term
  const modalStaffList = useMemo(() => {
    if (!filterSearchTerm.trim()) return allRows;
    const q = filterSearchTerm.toLowerCase().trim();
    return allRows.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [allRows, filterSearchTerm]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      
      {/* ── 1. Ô NHẬP DỮ LIỆU NHƯ TRÊN ── */}
      <div className="bg-white rounded-3xl border-2 border-emerald-200/80 shadow-md overflow-hidden no-capture">
        <div 
          onClick={() => setIsInputCollapsed(!isInputCollapsed)}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50 cursor-pointer border-b border-emerald-100 select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              📝
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                <span>Ô NHẬP DỮ LIỆU BÁO CÁO MWG (DOANH THU HỢP NHẤT)</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                  {allRows.length} Nhân Sự
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  ST: {cleanStore}
                </span>
                {syncStatus === 'saving' ? (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-ping" />
                    Đang đồng bộ Cloud...
                  </span>
                ) : syncStatus === 'synced' ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Đã đồng bộ Cloud
                  </span>
                ) : null}
              </h3>
              <p className="text-[11px] text-emerald-800/80 font-medium">
                Dán nội dung copy trực tiếp từ baocao.dienmayxanh.com vào khung bên dưới để cập nhật bảng (tự động đồng bộ trên điện thoại & mọi thiết bị)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 hidden sm:inline">
              {isInputCollapsed ? 'Mở rộng khung nhập' : 'Thu gọn'}
            </span>
            {isInputCollapsed ? <ChevronDown size={18} className="text-emerald-700" /> : <ChevronUp size={18} className="text-emerald-700" />}
          </div>
        </div>

        {!isInputCollapsed && (
          <div className="p-4 sm:p-5 space-y-3 bg-slate-50/50">
            <textarea
              value={rawInput}
              onChange={e => handleSaveData(e.target.value, false)}
              placeholder="Dán toàn bộ dữ liệu báo cáo MWG tại đây..."
              rows={6}
              className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all resize-y"
            />

            {/* Toolbar Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <ClipboardPaste size={14} />
                  <span>Dán Từ Clipboard</span>
                </button>

                {cleanStore === '1841' && (
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                    title="Nạp lại data mẫu siêu thị 1841"
                  >
                    <RotateCcw size={13} />
                    <span>Nạp Lại Mẫu 1841</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveData('', true)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                  title="Xoá trắng khung nhập"
                >
                  <Trash2 size={13} />
                  <span>Xóa Trắng</span>
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleToggleOnlyWithRevenue(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    onlyWithRevenue ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Chỉ NV Có DT ({allRows.filter(r => r.convertedRevenue > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOnlyWithRevenue(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    !onlyWithRevenue ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Hiện Tất Cả ({allRows.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TOP ACTION BUTTONS (BỘ LỌC NV / XUẤT ẢNH / ZALO) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 no-capture">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} className="text-emerald-600" />
            MẪU CHUẨN MWG
          </span>
          <span className="text-xs text-slate-600 font-bold">
            Hiển thị <b>{count}</b> / {allRows.length} nhân viên
          </span>
          {excludedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-extrabold border border-amber-200">
              Đang ẩn {excludedCount} NV
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* BỘ LỌC NHÂN VIÊN BUTTON */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border shadow-xs cursor-pointer transition-all active:scale-95 ${
              excludedCount > 0 
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Filter size={14} className={excludedCount > 0 ? 'text-white' : 'text-emerald-600'} />
            <span>Lọc Nhân Viên ({count}/{allRows.length})</span>
          </button>

          {/* COPY NHẬN XÉT ZALO */}
          <button
            type="button"
            onClick={handleCopyZalo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
          >
            {isCopied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
            <span>{isCopied ? 'Đã Copy!' : 'Copy Nhận Xét Zalo'}</span>
          </button>

          {/* XUẤT ẢNH BẢNG (PNG) */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={isCapturing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/25 cursor-pointer transition-all active:scale-95"
          >
            <Camera size={14} />
            <span>{isCapturing ? 'Đang Xuất Ảnh...' : 'Xuất Ảnh Bảng (PNG)'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. BẢNG TRONG TAB REAL D.THU NV NHƯ HÌNH ── */}
      <div 
        ref={tableRef}
        className="w-full bg-white rounded-3xl overflow-hidden border border-emerald-300/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] select-none"
        style={{ fontFamily: "'UTM Avo', 'Inter', -apple-system, sans-serif" }}
      >
        {/* Header Banner - Emerald Green with Neon Gold Title */}
        <div className="bg-[#00825e] text-center pt-5 pb-4 px-4">
          <h1 
            className="text-2xl sm:text-3xl md:text-[32px] font-black uppercase tracking-wider text-[#ffe500] drop-shadow-xs whitespace-nowrap"
            style={{ letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
          >
            REALTIME D.THU QUI ĐỔI
          </h1>
          <div 
            className="flex flex-row flex-nowrap items-center justify-center gap-2.5 text-white/95 font-bold text-xs sm:text-sm mt-1.5 tracking-wide whitespace-nowrap select-none"
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
              className="text-[#ffe500] font-black inline-flex items-center gap-1 whitespace-nowrap"
              style={{ 
                whiteSpace: 'nowrap', 
                display: 'inline-flex', 
                alignItems: 'center', 
                flexWrap: 'nowrap',
                flexShrink: 0 
              }}
            >
              <span className="inline-block leading-none select-none text-[13px] sm:text-[15px]">⚡</span>
              <span className="leading-none text-xs sm:text-sm font-black">Realtime</span>
            </span>
            <span 
              className="text-white/60 font-mono font-bold select-none px-0.5 whitespace-nowrap leading-none"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              ||
            </span>
            <span 
              className="font-bold tracking-wider whitespace-nowrap leading-none text-white/95 text-xs sm:text-sm"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {timeStr}
            </span>
          </div>
        </div>

        {/* Khoảng trắng giữa Tiêu đề lớn và Tiêu đề cột */}
        <div className="h-2.5 sm:h-3 bg-white w-full" style={{ height: '10px', backgroundColor: '#ffffff' }} />

        {/* The Exact 7 Columns Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#006b4b] text-white text-[11px] sm:text-xs font-black uppercase tracking-wider">
                <th className="py-3.5 px-2 w-14 sm:w-16 border-r border-[#00573d]/40">
                  STT
                </th>
                <th className="py-3.5 px-4 text-left min-w-[170px] sm:min-w-[200px] border-r border-[#00573d]/40">
                  NHÂN VIÊN
                </th>
                <th className="py-3.5 px-2 sm:px-3 min-w-[75px] border-r border-[#00573d]/40">
                  DT. THỰC
                </th>
                <th className="py-3.5 px-2 sm:px-3 min-w-[85px] border-r border-[#00573d]/40">
                  DT. QUY ĐỔI
                </th>
                <th className="py-3.5 px-2 sm:px-3 min-w-[80px] border-r border-[#00573d]/40">
                  HQ.QĐ
                </th>
                <th className="py-3.5 px-2 sm:px-3 min-w-[85px] border-r border-[#00573d]/40">
                  DT TRẢ GÓP
                </th>
                <th className="py-3.5 px-3 min-w-[95px]">
                  % TRẢ GÓP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/70 text-[13px] sm:text-[14px] font-black">
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
                    className="bg-white hover:bg-emerald-50/60 transition-colors group"
                  >
                    {/* STT: #1, #2, ... in bold emerald */}
                    <td className="py-3 sm:py-3.5 px-2 font-black text-[#00825e] text-center text-[13px] sm:text-[14px]">
                      #{rankNum}
                    </td>

                    {/* NHÂN VIÊN: Bold Uppercase Name with Quick Hide Option */}
                    <td className="py-3 sm:py-3.5 px-4 text-left font-black tracking-tight text-[13px] sm:text-[14px]">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={
                          isTop ? "text-[#00825e]" :
                          isBottom ? "text-[#e11d48]" :
                          "text-[#0f172a]"
                        }>
                          {staff.name}
                        </span>

                        {/* Inline Hide Button (No-Capture) */}
                        <button
                          type="button"
                          onClick={() => handleToggleStaff(staff.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 no-capture cursor-pointer"
                          title="Ẩn nhân viên này khỏi bảng (lưu tự động)"
                        >
                          <EyeOff size={13} />
                        </button>
                      </div>
                    </td>

                    {/* DT. THỰC: Bold Dark Slate, Red pill badge if 0 */}
                    <td className="py-3 sm:py-3.5 px-2 sm:px-3 font-black text-[#0f172a] text-[13px] sm:text-[14px]">
                      {staff.actualRevenue === 0 ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[13px] sm:text-[14px] leading-tight">
                          0
                        </span>
                      ) : (
                        staff.actualRevenue
                      )}
                    </td>

                    {/* DT. QUY ĐỔI: Bold Emerald Green, Red pill badge if 0 */}
                    <td className="py-3 sm:py-3.5 px-2 sm:px-3 font-black text-[#00825e] text-[13px] sm:text-[14px]">
                      {staff.convertedRevenue === 0 ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[13px] sm:text-[14px] leading-tight">
                          0
                        </span>
                      ) : (
                        staff.convertedRevenue
                      )}
                    </td>

                    {/* HQ.QĐ: Green if > 0.0%, Red pill badge if <= 0.0% */}
                    <td className="py-3 sm:py-3.5 px-2 sm:px-3 font-black text-[13px] sm:text-[14px]">
                      {staff.shareRate <= 0 ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[13px] sm:text-[14px] leading-tight">
                          {staff.shareRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#00825e]">
                          {staff.shareRate.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    {/* DT TRẢ GÓP: Bold Blue, Red pill badge if 0 */}
                    <td className="py-3 sm:py-3.5 px-2 sm:px-3 font-black text-[13px] sm:text-[14px]">
                      {staff.installmentRevenue === 0 ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[13px] sm:text-[14px] leading-tight">
                          0
                        </span>
                      ) : (
                        <span className="text-[#1d4ed8]">
                          {staff.installmentRevenue}
                        </span>
                      )}
                    </td>

                    {/* % TRẢ GÓP: Pill Badge (Green >= 50%, Red < 50%) */}
                    <td className="py-3 sm:py-3.5 px-3 text-center font-black text-[13px] sm:text-[14px]">
                      {staff.installmentRate >= 50.0 ? (
                        <span className="inline-block px-2.5 sm:px-3 py-0.5 rounded-full bg-[#e6f8ef] text-[#00825e] font-black text-[13px] sm:text-[14px] leading-tight">
                          {staff.installmentRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 sm:px-3 py-0.5 rounded-full bg-[#ffebee] text-[#e11d48] font-black text-[13px] sm:text-[14px] leading-tight">
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
              <tr className="bg-[#006b4b] text-white font-black text-[13px] sm:text-[14px]">
                <td colSpan={2} className="py-4 px-4 text-left uppercase tracking-wider border-r border-[#00573d]/40">
                  TỔNG ({count} NV)
                </td>
                <td className="py-4 px-2 sm:px-3 border-r border-[#00573d]/40">
                  {totals.actualRevenue}
                </td>
                <td className="py-4 px-2 sm:px-3 border-r border-[#00573d]/40">
                  {totals.convertedRevenue}
                </td>
                <td className="py-4 px-2 sm:px-3 text-[#ffe500] border-r border-[#00573d]/40">
                  {totals.shareRate.toFixed(1)}%
                </td>
                <td className="py-4 px-2 sm:px-3 border-r border-[#00573d]/40">
                  {totals.installmentRevenue}
                </td>
                <td className="py-4 px-3">
                  {totals.installmentRate.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
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
