import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  Sparkles, 
  Check, 
  Download, 
  Camera, 
  RefreshCw, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ArrowLeftRight, 
  Paintbrush, 
  Eraser, 
  AlertCircle, 
  Wand2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  CloudUpload,
  UserPlus,
  Save,
  FileSpreadsheet,
  X,
  Layers,
  CalendarCheck,
  Store
} from 'lucide-react';
import { db } from '../../../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useStore } from '../../../contexts/StoreContext';
import { normalizeStoreId } from '../../RTST/utils';
import html2canvas from 'html2canvas';

// ==========================================================================
// CẤU HÌNH CA MẪU VÀ XOAY TUA 4 TUẦN CÂN BẰNG TUYỆT ĐỐI
// ==========================================================================

const DEFAULT_STAFF_G1 = ['NHẠN', 'MẠNH', 'MI', 'MỸ', 'GIANG Ý', 'NGỌC ANH'];
const DEFAULT_STAFF_G2 = ['THẮM', 'MY', 'PHÚC', 'ĐẠI', 'LÂM Ý'];

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
type DayType = typeof DAYS[number];

const WEEKS = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'] as const;
type WeekType = typeof WEEKS[number];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, '0');
  return `THÁNG ${m}`;
});

// 6 Slot xoay ca chuẩn theo Ca Mẫu Tuần 1 (Nhóm 1 - 6 nhân viên)
const GROUP1_SLOTS: Record<DayType, string>[] = [
  { T2: 'TN', T3: '', T4: '', T5: '', T6: 'KHO', T7: '', CN: 'TN' },  // Slot 0: NHẠN (2 TN, 1 KHO)
  { T2: '', T3: 'TN', T4: 'KHO', T5: '', T6: '', T7: '', CN: 'KHO' }, // Slot 1: MẠNH (1 TN, 2 KHO)
  { T2: 'KHO', T3: '', T4: '', T5: 'TN', T6: '', T7: '', CN: '' },    // Slot 2: MI (1 TN, 1 KHO)
  { T2: '', T3: 'KHO', T4: '', T5: '', T6: 'TN', T7: '', CN: '' },    // Slot 3: MỸ (1 TN, 1 KHO)
  { T2: '', T3: '', T4: 'TN', T5: '', T6: '', T7: 'KHO', CN: '' },    // Slot 4: GIANG Ý (1 TN, 1 KHO)
  { T2: '', T3: '', T4: '', T5: 'KHO', T6: '', T7: 'TN', CN: '' }     // Slot 5: NGỌC ANH (1 TN, 1 KHO)
];

// 5 Slot xoay ca chuẩn theo Ca Mẫu Tuần 1 (Nhóm 2 - 5 nhân viên)
const GROUP2_SLOTS: Record<DayType, string>[] = [
  { T2: 'TN', T3: '', T4: '', T5: 'KHO', T6: '', T7: '', CN: 'TN' },  // Slot 0: THẮM (2 TN, 1 KHO)
  { T2: '', T3: 'TN', T4: '', T5: '', T6: 'TN', T7: '', CN: 'KHO' },  // Slot 1: MY (2 TN, 1 KHO)
  { T2: 'KHO', T3: '', T4: 'TN', T5: '', T6: 'KHO', T7: '', CN: '' }, // Slot 2: PHÚC (1 TN, 2 KHO)
  { T2: '', T3: 'KHO', T4: '', T5: 'TN', T6: '', T7: 'KHO', CN: '' }, // Slot 3: ĐẠI (1 TN, 2 KHO)
  { T2: '', T3: '', T4: 'KHO', T5: '', T6: '', T7: 'TN', CN: '' }     // Slot 4: LÂM Ý (1 TN, 1 KHO)
];

const GROUP1_PERMUTATIONS = [
  [0, 1, 2, 3, 4, 5], // Tuần 1
  [2, 3, 0, 1, 5, 4], // Tuần 2
  [4, 5, 3, 2, 0, 1], // Tuần 3
  [1, 0, 4, 5, 2, 3]  // Tuần 4
];

const GROUP2_PERMUTATIONS = [
  [0, 1, 2, 3, 4], // Tuần 1
  [2, 3, 0, 4, 1], // Tuần 2
  [1, 0, 4, 2, 3], // Tuần 3
  [4, 2, 3, 1, 0]  // Tuần 4
];

type StampType = 'none' | 'TN' | 'KHO' | 'HC' | 'x' | 'CLEAR';

/**
 * Tính toán ngày theo định dạng DD/MM cho các thứ (T2 -> CN) trong tuần
 */
function getWeekDates(monthName: string, weekName: string, year = new Date().getFullYear()): Record<DayType, string> {
  const mMatch = String(monthName || '').match(/\d+/);
  const monthNum = mMatch ? parseInt(mMatch[0], 10) : (new Date().getMonth() + 1);

  const wMatch = String(weekName || '').match(/\d+/);
  const weekIdx = wMatch ? Math.max(0, parseInt(wMatch[0], 10) - 1) : 0;

  // Ngày 1 của tháng
  const firstDay = new Date(year, monthNum - 1, 1);
  const dayOfWeek = firstDay.getDay(); // 0: CN, 1: T2, 2: T3...
  
  // Thứ 2 của tuần 1 trong tháng
  const diff = (dayOfWeek === 0) ? -6 : (1 - dayOfWeek);
  const mondayWeek1 = new Date(year, monthNum - 1, 1 + diff);

  // Thứ 2 của tuần được chọn
  const weekMonday = new Date(year, mondayWeek1.getMonth(), mondayWeek1.getDate() + (weekIdx * 7));

  const result = {} as Record<DayType, string>;
  DAYS.forEach((d, idx) => {
    const curDate = new Date(year, weekMonday.getMonth(), weekMonday.getDate() + idx);
    const dayStr = String(curDate.getDate()).padStart(2, '0');
    const mStr = String(curDate.getMonth() + 1).padStart(2, '0');
    result[d] = `${dayStr}/${mStr}`;
  });
  return result;
}

/**
 * Sinh ma trận 4 tuần xoay tua cân bằng tuyệt đối
 */
function generateBalanced4WeeksSchedule(g1Staff: string[], g2Staff: string[]) {
  const result: Record<string, Record<string, Record<DayType, string>>> = {};
  
  WEEKS.forEach((wName, wIdx) => {
    result[wName] = {};

    // Nhóm 1
    g1Staff.forEach((staff, sIdx) => {
      const permRow = GROUP1_PERMUTATIONS[wIdx] || GROUP1_PERMUTATIONS[0];
      const slotIdx = permRow[sIdx % permRow.length];
      const slot = GROUP1_SLOTS[slotIdx] || null;
      result[wName][staff] = {} as Record<DayType, string>;
      DAYS.forEach((d) => {
        result[wName][staff][d] = slot ? (slot[d] || '') : '';
      });
    });

    // Nhóm 2
    g2Staff.forEach((staff, sIdx) => {
      const permRow = GROUP2_PERMUTATIONS[wIdx] || GROUP2_PERMUTATIONS[0];
      const slotIdx = permRow[sIdx % permRow.length];
      const slot = GROUP2_SLOTS[slotIdx] || null;
      result[wName][staff] = {} as Record<DayType, string>;
      DAYS.forEach((d) => {
        result[wName][staff][d] = slot ? (slot[d] || '') : '';
      });
    });
  });

  return result;
}

export function PhanCaHanhChinhTab() {
  const { userProfile } = useAuth();
  const { currentStoreId, setCurrentStoreId, availableStores } = useStore();

  // 1. Tên siêu thị đang chọn hiển thị cho người dùng
  const activeStoreName = useMemo(() => {
    if (currentStoreId && currentStoreId !== 'ALL' && currentStoreId.trim()) {
      return currentStoreId.trim();
    }
    if (userProfile?.ten_sieu_thi && userProfile.ten_sieu_thi.trim()) {
      return userProfile.ten_sieu_thi.trim();
    }
    if (availableStores && availableStores.length > 0) {
      return availableStores[0].name.trim();
    }
    return userProfile?.ma_kho || '43751';
  }, [currentStoreId, userProfile, availableStores]);

  // 2. ID tài liệu Firestore đại diện cho siêu thị đang chọn
  const storeDocId = useMemo(() => {
    const norm = normalizeStoreId(activeStoreName);
    if (norm) return norm.replace(/\//g, '-');
    return activeStoreName.trim().toUpperCase().replace(/[\/\s]+/g, '_');
  }, [activeStoreName]);

  // Current Month & Week
  const [currentMonth, setCurrentMonth] = useState(() => {
    const currentM = new Date().getMonth() + 1;
    return `THÁNG ${String(currentM).padStart(2, '0')}`;
  });
  const [currentWeek, setCurrentWeek] = useState<string>('Tuần 1'); // 'Tuần 1' | 'Tuần 2' | 'Tuần 3' | 'Tuần 4' | 'all'

  // Staff Groups
  const [staffG1, setStaffG1] = useState<string[]>(DEFAULT_STAFF_G1);
  const [staffG2, setStaffG2] = useState<string[]>(DEFAULT_STAFF_G2);
  const allStaff = useMemo(() => [...staffG1, ...staffG2], [staffG1, staffG2]);

  // Schedule state: schedule[month][week][staff][day] = string
  const [schedule, setSchedule] = useState<Record<string, Record<string, Record<string, Record<string, string>>>>>({});

  // Interaction State
  const [activeStamp, setActiveStamp] = useState<StampType>('none');
  const [unsavedChangesCount, setUnsavedChangesCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return localStorage.getItem(`PHAN_CA_HC_LAST_SAVED_${storeDocId}`) || null;
  });

  // Modals
  const [showAutoRotateModal, setShowAutoRotateModal] = useState(false);
  const [rotateModalTab, setRotateModalTab] = useState<'summary' | 'detail'>('summary');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const [exportedImageUrl, setExportedImageUrl] = useState<string>('');
  const [exportedImageTitle, setExportedImageTitle] = useState<string>('');
  const [exportedFileName, setExportedFileName] = useState<string>('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Form Assign state
  const [assignStaff, setAssignStaff] = useState<string>('');
  const [assignShift, setAssignShift] = useState<string>('TN');
  const [assignDays, setAssignDays] = useState<Record<DayType, boolean>>({
    T2: true, T3: true, T4: true, T5: true, T6: true, T7: true, CN: false
  });

  // Modal Staff temporary state
  const [tempG1, setTempG1] = useState<string[]>([]);
  const [tempG2, setTempG2] = useState<string[]>([]);
  const [newStaffG1Input, setNewStaffG1Input] = useState('');
  const [newStaffG2Input, setNewStaffG2Input] = useState('');
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchTargetGroup, setBatchTargetGroup] = useState<'1' | '2'>('1');

  // Table ref for image capture
  const exportAreaRef = useRef<HTMLDivElement>(null);

  // Synchronize assignStaff dropdown default
  useEffect(() => {
    if (!assignStaff && allStaff.length > 0) {
      setAssignStaff(allStaff[0]);
    } else if (assignStaff && !allStaff.includes(assignStaff) && allStaff.length > 0) {
      setAssignStaff(allStaff[0]);
    }
  }, [allStaff, assignStaff]);

  // ==========================================================================
  // FIREBASE FIRESTORE SYNC & LOCAL CACHE THEO SIÊU THỊ ĐANG CHỌN
  // ==========================================================================

  const cacheKey = `PHAN_CA_HC_DATA_${storeDocId}`;

  // 1. Initial Load from LocalStorage + Setup Firestore onSnapshot Listener
  useEffect(() => {
    if (!storeDocId) return;

    // Load LocalStorage immediately for instant UX
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.staffGroup1 && Array.isArray(parsed.staffGroup1)) setStaffG1(parsed.staffGroup1);
        if (parsed.staffGroup2 && Array.isArray(parsed.staffGroup2)) setStaffG2(parsed.staffGroup2);
        if (parsed.schedule && typeof parsed.schedule === 'object') setSchedule(parsed.schedule);
      }
    } catch (e) {
      console.warn('Lỗi đọc cache local phan_ca_hc:', e);
    }

    // Set up Firestore onSnapshot listener for the chosen supermarket
    setSyncStatus('syncing');
    const storeDocRef = doc(db, 'store', storeDocId);

    const unsubscribe = onSnapshot(storeDocRef, async (docSnap) => {
      setSyncStatus('synced');
      if (docSnap.exists()) {
        const data = docSnap.data();
        const hcData = data.phan_ca_hc || data.data_phan_ca_hc;
        if (hcData) {
          if (hcData.staffGroup1 && Array.isArray(hcData.staffGroup1)) {
            setStaffG1(hcData.staffGroup1);
          }
          if (hcData.staffGroup2 && Array.isArray(hcData.staffGroup2)) {
            setStaffG2(hcData.staffGroup2);
          }
          if (hcData.schedule && typeof hcData.schedule === 'object') {
            setSchedule(hcData.schedule);
          }
          if (hcData.updatedAt) {
            setLastSavedTime(typeof hcData.updatedAt === 'string' ? hcData.updatedAt : 'vừa xong');
          }
          return;
        }
      }

      // Fallback: nếu document trong 'store' chưa có phan_ca_hc, thử kiểm tra 'phan_ca_hc' collection
      try {
        const phanCaSnap = await getDoc(doc(db, 'phan_ca_hc', storeDocId));
        if (phanCaSnap.exists()) {
          const pcData = phanCaSnap.data();
          if (pcData.staffGroup1 && Array.isArray(pcData.staffGroup1)) setStaffG1(pcData.staffGroup1);
          if (pcData.staffGroup2 && Array.isArray(pcData.staffGroup2)) setStaffG2(pcData.staffGroup2);
          if (pcData.schedule && typeof pcData.schedule === 'object') setSchedule(pcData.schedule);
          return;
        }
      } catch (e) {}

      // Nếu siêu thị này chưa có lịch, khởi tạo template 4 tuần chuẩn
      const initialBalanced = generateBalanced4WeeksSchedule(DEFAULT_STAFF_G1, DEFAULT_STAFF_G2);
      setStaffG1(DEFAULT_STAFF_G1);
      setStaffG2(DEFAULT_STAFF_G2);
      setSchedule(prev => {
        if (Object.keys(prev).length > 0) return prev;
        const newSched: Record<string, any> = {};
        MONTH_OPTIONS.forEach(m => {
          newSched[m] = {};
          WEEKS.forEach(w => {
            newSched[m][w] = {};
            [...DEFAULT_STAFF_G1, ...DEFAULT_STAFF_G2].forEach(st => {
              newSched[m][w][st] = { T2: '', T3: '', T4: '', T5: '', T6: '', T7: '', CN: '' };
            });
          });
        });
        newSched[currentMonth] = initialBalanced;
        return newSched;
      });
    }, (err) => {
      console.error('Firestore onSnapshot error phan_ca_hc:', err);
      setSyncStatus('error');
    });

    return () => unsubscribe();
  }, [storeDocId]);

  // Save to LocalStorage whenever schedule or staff changes
  const saveToLocal = (newSchedule: typeof schedule, g1 = staffG1, g2 = staffG2) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        storeName: activeStoreName,
        storeDocId,
        staffGroup1: g1,
        staffGroup2: g2,
        schedule: newSchedule,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error saving phan_ca_hc to local storage:', e);
    }
  };

  // Save directly to Firebase Firestore for the selected supermarket
  const handleSaveToFirebase = async () => {
    if (!storeDocId) {
      showToast('Không xác định được siêu thị đang chọn!', 'error');
      return;
    }

    setIsSaving(true);
    setSyncStatus('syncing');

    try {
      const schedulePayload = {
        staffGroup1: staffG1,
        staffGroup2: staffG2,
        schedule,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.username || userProfile?.full_name || 'user'
      };

      // 1. Lưu trực tiếp vào document của siêu thị trong collection 'store'
      const storeDocRef = doc(db, 'store', storeDocId);
      await setDoc(storeDocRef, {
        ten_sieu_thi: activeStoreName,
        warehouse_code: userProfile?.ma_kho || '',
        updated_at: serverTimestamp(),
        phan_ca_hc: schedulePayload
      }, { merge: true });

      // 2. Đồng thời lưu mirror vào collection 'phan_ca_hc' theo storeDocId
      const phanCaDocRef = doc(db, 'phan_ca_hc', storeDocId);
      await setDoc(phanCaDocRef, {
        storeId: storeDocId,
        storeName: activeStoreName,
        warehouse_code: userProfile?.ma_kho || '',
        ...schedulePayload,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setUnsavedChangesCount(0);
      const nowTime = new Date().toLocaleTimeString('vi-VN');
      setLastSavedTime(nowTime);
      localStorage.setItem(`PHAN_CA_HC_LAST_SAVED_${storeDocId}`, nowTime);
      saveToLocal(schedule);

      setSyncStatus('synced');
      showToast(`Đã lưu thành công cho siêu thị: ${activeStoreName}!`, 'success');
    } catch (err: any) {
      console.error('Lỗi lưu Firebase phan_ca_hc:', err);
      setSyncStatus('error');
      showToast('Lỗi khi lưu lên Firebase: ' + (err.message || 'Thử lại sau'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Re-sync / fetch from Firebase
  const handleSyncNow = async () => {
    setSyncStatus('syncing');
    try {
      const storeDocRef = doc(db, 'store', storeDocId);
      const storeSnap = await getDoc(storeDocRef);
      let found = false;

      if (storeSnap.exists()) {
        const data = storeSnap.data();
        const hcData = data.phan_ca_hc || data.data_phan_ca_hc;
        if (hcData) {
          if (hcData.staffGroup1) setStaffG1(hcData.staffGroup1);
          if (hcData.staffGroup2) setStaffG2(hcData.staffGroup2);
          if (hcData.schedule) setSchedule(hcData.schedule);
          found = true;
        }
      }

      if (!found) {
        const pcSnap = await getDoc(doc(db, 'phan_ca_hc', storeDocId));
        if (pcSnap.exists()) {
          const pcData = pcSnap.data();
          if (pcData.staffGroup1) setStaffG1(pcData.staffGroup1);
          if (pcData.staffGroup2) setStaffG2(pcData.staffGroup2);
          if (pcData.schedule) setSchedule(pcData.schedule);
          found = true;
        }
      }

      setUnsavedChangesCount(0);
      setSyncStatus('synced');
      if (found) {
        showToast(`Đã làm mới dữ liệu từ Firebase cho siêu thị ${activeStoreName}!`, 'success');
      } else {
        showToast(`Chưa có dữ liệu trên Firebase cho siêu thị ${activeStoreName}`, 'info');
      }
    } catch (e: any) {
      setSyncStatus('error');
      showToast('Lỗi đồng bộ: ' + e.message, 'error');
    }
  };

  // Reset unsaved changes to saved state
  const handleResetChanges = () => {
    if (window.confirm('Bạn có chắc muốn huỷ bỏ các thay đổi chưa lưu và khôi phục lại?')) {
      handleSyncNow();
    }
  };

  // ==========================================================================
  // CELL INTERACTION & STAMP BRUSH
  // ==========================================================================

  const handleCellClick = (staff: string, day: DayType, weekName: string) => {
    const currentShift = schedule[currentMonth]?.[weekName]?.[staff]?.[day] || '';
    let newShift = currentShift;

    if (activeStamp !== 'none') {
      if (activeStamp === 'CLEAR') {
        newShift = '';
      } else {
        // Toggle: click once assigns stamp, click again if already stamp clears it
        if (currentShift.trim().toUpperCase() === activeStamp.trim().toUpperCase()) {
          newShift = '';
        } else {
          newShift = activeStamp;
        }
      }
    } else {
      // Normal click: cycle empty -> TN -> KHO -> HC -> x -> empty
      const cycle = ['', 'TN', 'KHO', 'HC', 'x'];
      const nextIdx = (cycle.indexOf(currentShift) + 1) % cycle.length;
      newShift = cycle[nextIdx];
    }

    if (newShift !== currentShift) {
      setSchedule(prev => {
        const next = { ...prev };
        if (!next[currentMonth]) next[currentMonth] = {};
        if (!next[currentMonth][weekName]) next[currentMonth][weekName] = {};
        if (!next[currentMonth][weekName][staff]) next[currentMonth][weekName][staff] = {} as Record<DayType, string>;

        next[currentMonth][weekName][staff] = {
          ...next[currentMonth][weekName][staff],
          [day]: newShift
        };
        saveToLocal(next);
        return next;
      });
      setUnsavedChangesCount(c => c + 1);
    }
  };

  // Batch Form Assign
  const handleExecuteFormAssign = (skipOffDays: boolean) => {
    if (!assignStaff) {
      showToast('Vui lòng chọn nhân viên!', 'error');
      return;
    }
    const selectedDays = (Object.keys(assignDays) as DayType[]).filter(d => assignDays[d]);
    if (selectedDays.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 thứ trong tuần!', 'error');
      return;
    }

    const targetWeek = currentWeek === 'all' ? 'Tuần 1' : currentWeek;
    let appliedCount = 0;

    setSchedule(prev => {
      const next = { ...prev };
      if (!next[currentMonth]) next[currentMonth] = {};
      if (!next[currentMonth][targetWeek]) next[currentMonth][targetWeek] = {};
      if (!next[currentMonth][targetWeek][assignStaff]) next[currentMonth][targetWeek][assignStaff] = {} as Record<DayType, string>;

      const staffShifts = { ...(next[currentMonth][targetWeek][assignStaff] || {}) };

      selectedDays.forEach(day => {
        const curVal = staffShifts[day] || '';
        if (skipOffDays && curVal.toUpperCase() === 'X') {
          return;
        }
        if (curVal !== assignShift) {
          staffShifts[day] = assignShift;
          appliedCount++;
        }
      });

      next[currentMonth][targetWeek][assignStaff] = staffShifts;
      if (appliedCount > 0) {
        saveToLocal(next);
      }
      return next;
    });

    if (appliedCount > 0) {
      setUnsavedChangesCount(c => c + appliedCount);
      showToast(`Đã gán ca "${assignShift || 'Trống'}" cho ${assignStaff} (${appliedCount} ngày)!`, 'success');
    } else {
      showToast(`Không có ngày nào cần thay đổi cho ${assignStaff}`, 'info');
    }
  };

  // ==========================================================================
  // AUTO ROTATE MODAL & EXECUTION
  // ==========================================================================

  const balancedPreview = useMemo(() => {
    return generateBalanced4WeeksSchedule(staffG1, staffG2);
  }, [staffG1, staffG2]);

  const handleApplyAutoRotate = () => {
    setSchedule(prev => {
      const next = { ...prev };
      if (!next[currentMonth]) next[currentMonth] = {};

      WEEKS.forEach(wName => {
        next[currentMonth][wName] = JSON.parse(JSON.stringify(balancedPreview[wName]));
      });

      saveToLocal(next);
      return next;
    });

    setUnsavedChangesCount(c => c + 25);
    setShowAutoRotateModal(false);
    showToast(`⚡ Đã tự động xoay tua 4 tuần cân bằng tuyệt đối cho ${currentMonth}! Nhớ bấm "Lưu Lên Hệ Thống".`, 'success');
  };

  // ==========================================================================
  // STAFF MANAGER MODAL HANDLERS
  // ==========================================================================

  const handleOpenStaffModal = () => {
    setTempG1([...staffG1]);
    setTempG2([...staffG2]);
    setNewStaffG1Input('');
    setNewStaffG2Input('');
    setShowBatchImport(false);
    setShowStaffModal(true);
  };

  const handleAddTempStaffG1 = () => {
    const raw = newStaffG1Input.trim().toUpperCase();
    if (!raw) {
      showToast('Vui lòng nhập tên nhân viên!', 'warning');
      return;
    }
    if (tempG1.includes(raw) || tempG2.includes(raw)) {
      showToast(`Nhân viên "${raw}" đã có trong danh sách!`, 'warning');
      return;
    }
    setTempG1(prev => [...prev, raw]);
    setNewStaffG1Input('');
  };

  const handleAddTempStaffG2 = () => {
    const raw = newStaffG2Input.trim().toUpperCase();
    if (!raw) {
      showToast('Vui lòng nhập tên nhân viên!', 'warning');
      return;
    }
    if (tempG1.includes(raw) || tempG2.includes(raw)) {
      showToast(`Nhân viên "${raw}" đã có trong danh sách!`, 'warning');
      return;
    }
    setTempG2(prev => [...prev, raw]);
    setNewStaffG2Input('');
  };

  const handleSwitchTempGroup = (groupNum: 1 | 2, index: number) => {
    if (groupNum === 1) {
      const item = tempG1[index];
      setTempG1(prev => prev.filter((_, i) => i !== index));
      setTempG2(prev => [...prev, item]);
    } else {
      const item = tempG2[index];
      setTempG2(prev => prev.filter((_, i) => i !== index));
      setTempG1(prev => [...prev, item]);
    }
  };

  const handleDeleteTempStaff = (groupNum: 1 | 2, index: number) => {
    const name = groupNum === 1 ? tempG1[index] : tempG2[index];
    if (window.confirm(`Xoá nhân viên "${name}" khỏi danh sách?`)) {
      if (groupNum === 1) {
        setTempG1(prev => prev.filter((_, i) => i !== index));
      } else {
        setTempG2(prev => prev.filter((_, i) => i !== index));
      }
    }
  };

  const handleExecuteBatchImport = () => {
    if (!batchText.trim()) {
      showToast('Vui lòng dán danh sách tên nhân viên!', 'warning');
      return;
    }
    const names = batchText.split(/[\n,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    if (names.length === 0) {
      showToast('Không tìm thấy tên nhân viên hợp lệ!', 'warning');
      return;
    }

    let addedCount = 0;
    if (batchTargetGroup === '1') {
      const toAdd = names.filter(n => !tempG1.includes(n) && !tempG2.includes(n));
      setTempG1(prev => [...prev, ...toAdd]);
      addedCount = toAdd.length;
    } else {
      const toAdd = names.filter(n => !tempG1.includes(n) && !tempG2.includes(n));
      setTempG2(prev => [...prev, ...toAdd]);
      addedCount = toAdd.length;
    }

    setBatchText('');
    showToast(`Đã thêm ${addedCount} nhân viên vào Nhóm ${batchTargetGroup}!`, 'success');
  };

  const handleResetDefaultStaff = () => {
    if (window.confirm('Khôi phục danh sách 11 nhân viên mặc định ban đầu theo ca mẫu?')) {
      setTempG1([...DEFAULT_STAFF_G1]);
      setTempG2([...DEFAULT_STAFF_G2]);
      showToast('Đã khôi phục danh sách nhân viên mặc định', 'info');
    }
  };

  const handleSaveStaffModal = () => {
    if (tempG1.length === 0 || tempG2.length === 0) {
      showToast('Mỗi nhóm phải có ít nhất 1 nhân viên!', 'error');
      return;
    }

    setStaffG1([...tempG1]);
    setStaffG2([...tempG2]);
    setShowStaffModal(false);
    setUnsavedChangesCount(c => c + 1);
    saveToLocal(schedule, tempG1, tempG2);
    showToast(`Đã cập nhật: Nhóm 1 (${tempG1.length} người), Nhóm 2 (${tempG2.length} người)! Nhớ lưu Firebase.`, 'success');
  };

  // ==========================================================================
  // IMAGE EXPORT (ZERO-SHADOW & FRAME-WRAPPER)
  // ==========================================================================

  const handleExportImage = async (mode: 'week' | 'month') => {
    if (!exportAreaRef.current) return;

    if (mode === 'month' && currentWeek !== 'all') {
      setCurrentWeek('all');
      await new Promise(r => setTimeout(r, 150));
    } else if (mode === 'week' && currentWeek === 'all') {
      setCurrentWeek('Tuần 1');
      await new Promise(r => setTimeout(r, 150));
    }

    showToast('📸 Đang tạo ảnh chất lượng cao...', 'info');

    try {
      const captureEl = exportAreaRef.current;
      
      // Temporarily hide action buttons during capture
      const actionButtons = captureEl.querySelectorAll('.export-no-print');
      actionButtons.forEach(el => (el as HTMLElement).style.display = 'none');

      // Small delay for DOM settling
      await new Promise(r => setTimeout(r, 120));

      const canvas = await html2canvas(captureEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1440,
        onclone: (clonedDoc) => {
          // Zero-shadow export rule: remove shadows in cloned DOM
          const allEls = clonedDoc.querySelectorAll('*');
          allEls.forEach(el => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              htmlEl.style.boxShadow = 'none';
              htmlEl.style.textShadow = 'none';
              htmlEl.style.filter = 'none';
            }
          });
        }
      });

      // Restore action buttons
      actionButtons.forEach(el => (el as HTMLElement).style.display = '');

      const imgUrl = canvas.toDataURL('image/png');
      const filename = mode === 'month' 
        ? `Bang_Phan_Ca_Ca_Thang_${currentMonth}_${storeDocId}.png`
        : `Bang_Phan_Ca_${currentWeek}_${currentMonth}_${storeDocId}.png`;
      const title = mode === 'month'
        ? `Ảnh Phân Ca Cả Tháng: ${currentMonth} - Siêu Thị ${activeStoreName}`
        : `Ảnh Phân Ca: ${currentWeek} - ${currentMonth} - Siêu Thị ${activeStoreName}`;

      setExportedImageUrl(imgUrl);
      setExportedFileName(filename);
      setExportedImageTitle(title);
      setShowImagePreviewModal(true);

      // Auto download
      const link = document.createElement('a');
      link.download = filename;
      link.href = imgUrl;
      link.click();

      showToast('Đã xuất ảnh thành công và tải về máy!', 'success');
    } catch (err: any) {
      console.error('Lỗi xuất ảnh:', err);
      showToast('Lỗi khi xuất ảnh: ' + (err.message || 'Thử lại sau'), 'error');
    }
  };

  // ==========================================================================
  // STATS CALCULATION
  // ==========================================================================

  const currentStats = useMemo(() => {
    let tnCount = 0;
    let khoCount = 0;

    const targetWeeks = currentWeek === 'all' ? WEEKS : [currentWeek];

    targetWeeks.forEach(w => {
      const weekData = schedule[currentMonth]?.[w] || {};
      allStaff.forEach(staff => {
        const shifts = weekData[staff] || {};
        DAYS.forEach(d => {
          const val = String(shifts[d] || '').toUpperCase();
          if (val === 'TN') tnCount++;
          if (val === 'KHO') khoCount++;
        });
      });
    });

    return { tnCount, khoCount };
  }, [schedule, currentMonth, currentWeek, allStaff]);

  // Current week dates mapping
  const currentWeekDates = useMemo(() => {
    return getWeekDates(currentMonth, currentWeek === 'all' ? 'Tuần 1' : currentWeek);
  }, [currentMonth, currentWeek]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold tracking-wide transition-all transform animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/20' :
          toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/20' :
          toast.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-amber-500/20' :
          'bg-sky-50 text-sky-800 border-sky-200 shadow-sky-500/20'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle size={18} className="text-rose-500" />}
          {toast.type === 'warning' && <AlertCircle size={18} className="text-amber-500" />}
          {toast.type === 'info' && <Sparkles size={18} className="text-sky-500" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div className="bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 border border-sky-200/60 rounded-3xl p-5 md:p-6 backdrop-blur-md shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <CalendarCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  PHÂN CA HÀNH CHÍNH
                </h1>
                <span className="text-[11px] font-extrabold bg-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-sky-200/60">
                  Firebase Realtime
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Store size={14} className="text-sky-600" /> Siêu thị:
                  </span>
                  {availableStores && availableStores.length > 1 ? (
                    <div className="relative inline-block">
                      <select
                        value={activeStoreName}
                        onChange={(e) => setCurrentStoreId(e.target.value)}
                        className="appearance-none bg-white hover:bg-slate-50 text-sky-800 font-black text-xs px-3 py-1 pr-7 rounded-xl border border-sky-300 shadow-2xs cursor-pointer outline-hidden uppercase tracking-wide transition-all"
                        title="Chọn siêu thị để xem và lưu phân ca"
                      >
                        {availableStores.map(s => (
                          <option key={s.name} value={s.name} className="text-slate-800 font-bold normal-case">
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="text-sky-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                      <span className="uppercase tracking-wide">{activeStoreName}</span>
                    </span>
                  )}
                </div>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'syncing' ? 'bg-amber-500 animate-spin' : 'bg-slate-400'}`}></span>
                  {syncStatus === 'synced' ? 'Đã đồng bộ Firestore' : syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Sẵn sàng'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenStaffModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Users size={15} className="text-sky-600" />
              <span>Quản lý nhân viên</span>
            </button>

            <button
              onClick={handleSyncNow}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={`text-blue-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>Đồng bộ ngay</span>
            </button>

            <button
              onClick={handleSaveToFirebase}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={15} className={isSaving ? 'animate-spin' : ''} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Lên Hệ Thống'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Staff Card */}
        <div 
          onClick={handleOpenStaffModal}
          className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Nhân Viên</span>
              <h3 className="text-lg md:text-xl font-black text-slate-800">{allStaff.length} Người</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">Nhóm 1: {staffG1.length} • Nhóm 2: {staffG2.length}</p>
            </div>
          </div>
        </div>

        {/* Ca TN Card */}
        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ca Thu Ngân (TN)</span>
              <h3 className="text-lg md:text-xl font-black text-purple-700">{currentStats.tnCount} Ca</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">{currentWeek === 'all' ? 'Toàn bộ cả tháng' : currentWeek}</p>
            </div>
          </div>
        </div>

        {/* Ca KHO Card */}
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ca Kho (KHO)</span>
              <h3 className="text-lg md:text-xl font-black text-amber-600">{currentStats.khoCount} Ca</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">{currentWeek === 'all' ? 'Toàn bộ cả tháng' : currentWeek}</p>
            </div>
          </div>
        </div>

        {/* Save Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trạng Thái Lưu</span>
              <h3 className={`text-base md:text-lg font-black ${unsavedChangesCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {unsavedChangesCount > 0 ? `Chưa lưu (${unsavedChangesCount})` : 'Đã đồng bộ'}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate max-w-[150px]">
                {lastSavedTime ? `Lưu lúc ${lastSavedTime}` : 'Đồng bộ Firestore'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS: MONTH SELECTOR & WEEK TABS */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5 whitespace-nowrap">
            <Calendar size={15} className="text-sky-600" />
            Tháng:
          </label>
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-hidden cursor-pointer"
          >
            {MONTH_OPTIONS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Week Tabs */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
          {WEEKS.map(w => (
            <button
              key={w}
              onClick={() => setCurrentWeek(w)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all cursor-pointer ${
                currentWeek === w
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {w}
            </button>
          ))}
          <button
            onClick={() => setCurrentWeek('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all cursor-pointer ${
              currentWeek === 'all'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarCheck size={14} />
            <span>Cả Tháng</span>
          </button>
        </div>
      </div>

      {/* ASSIGNMENT HUB: PHÂN CA AI & QUICK STAMPS */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
              <Wand2 size={16} />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Công Cụ Phân Ca Nhanh</h2>
              <p className="text-xs text-slate-400 font-bold">Gán ca nhanh theo nhân viên hoặc dùng bút chấm trực tiếp</p>
            </div>
          </div>

          {/* Auto Rotate Button */}
          <button
            onClick={() => setShowAutoRotateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 text-sky-700 text-xs font-black hover:from-sky-100 hover:to-blue-100 hover:border-sky-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Sparkles size={15} className="text-sky-600" />
            <span>⚡ Xoay Tua KHO & TN Tự Động (4 Tuần)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Sub-panel 1: Form Phân Ca Cho "Ai" (7 cols) */}
          <div className="lg:col-span-7 bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-3.5">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <span>👤 Phân Ca Cho Nhân Viên:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Staff Select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500">Nhân viên (Ai):</label>
                  <button 
                    onClick={handleOpenStaffModal} 
                    className="text-[10px] font-black text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={11} /> Thêm NV
                  </button>
                </div>
                <select
                  value={assignStaff}
                  onChange={(e) => setAssignStaff(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 focus:border-sky-500 outline-hidden cursor-pointer"
                >
                  <optgroup label="🔵 Nhóm 1 (Hành Chính 1)">
                    {staffG1.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="🟢 Nhóm 2 (Hành Chính 2)">
                    {staffG2.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Shift Select */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Chọn Ca Làm:</label>
                <select
                  value={assignShift}
                  onChange={(e) => setAssignShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 focus:border-sky-500 outline-hidden cursor-pointer"
                >
                  <option value="TN">💜 TN (Thu Ngân - Màu Tím)</option>
                  <option value="KHO">🧡 KHO (Phụ Kho - Màu Cam)</option>
                  <option value="HC">🏢 HC (Hành Chính)</option>
                  <option value="x">🏖️ x (Nghỉ Off)</option>
                  <option value="">⚪ Trống (Xoá ca)</option>
                </select>
              </div>
            </div>

            {/* Days Checkboxes */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Áp dụng các thứ:</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <label
                    key={d}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold border cursor-pointer select-none transition-all ${
                      assignDays[d]
                        ? 'bg-sky-500 text-white border-sky-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={assignDays[d]}
                      onChange={(e) => setAssignDays(prev => ({ ...prev, [d]: e.target.checked }))}
                      className="hidden"
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assign Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleExecuteFormAssign(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Check size={14} />
                <span>Áp Dụng Ca</span>
              </button>

              <button
                onClick={() => handleExecuteFormAssign(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer active:scale-95"
                title="Giữ nguyên ngày đã đánh dấu nghỉ 'x'"
              >
                <span>Bỏ qua ngày nghỉ 'x'</span>
              </button>
            </div>
          </div>

          {/* Sub-panel 2: Quick Stamp Brushes (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 flex flex-col justify-between space-y-3.5">
            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>🖌️ Bút Chọn Ca Nhanh:</span>
                <span className="text-[10px] font-bold text-slate-400 lowercase">Click ô để gán</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                Chọn bút rồi click vào ô trên bảng để gán ca (click lần 2 sẽ xoá về ô trống).
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setActiveStamp('none')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeStamp === 'none'
                    ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Chuột</span>
              </button>

              <button
                onClick={() => setActiveStamp('TN')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeStamp === 'TN'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-500/20'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <span>TN (Tím)</span>
              </button>

              <button
                onClick={() => setActiveStamp('KHO')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeStamp === 'KHO'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm shadow-amber-500/20'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>KHO (Cam)</span>
              </button>

              <button
                onClick={() => setActiveStamp('HC')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeStamp === 'HC'
                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm shadow-sky-500/20'
                    : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                }`}
              >
                <span>HC (Xanh)</span>
              </button>

              <button
                onClick={() => setActiveStamp('x')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeStamp === 'x'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm shadow-rose-500/20'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>Nghỉ (x)</span>
              </button>

              <button
                onClick={() => setActiveStamp('CLEAR')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeStamp === 'CLEAR'
                    ? 'bg-slate-700 text-white border-slate-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Eraser size={13} />
                <span>Tẩy Xoá</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          MAIN SCHEDULE DISPLAY & EXPORT AREA (Target for html2canvas)
          ========================================================================== */}
      <div 
        ref={exportAreaRef}
        id="scheduleExportArea"
        className="bg-white rounded-3xl p-5 md:p-7 border border-slate-200 shadow-sm space-y-6"
      >
        {/* Export Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black shadow-md shadow-sky-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
                {currentWeek === 'all' 
                  ? `BẢNG PHÂN CA HÀNH CHÍNH - TOÀN BỘ ${currentMonth}`
                  : `BẢNG PHÂN CA HÀNH CHÍNH - ${currentWeek.toUpperCase()} - ${currentMonth}`
                }
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5 flex items-center gap-2">
                <span>Cửa hàng / Siêu thị: <strong className="text-sky-700">{activeStoreName}</strong></span>
                <span>•</span>
                <span>Đồng bộ: {new Date().toLocaleDateString('vi-VN')}</span>
                <span>•</span>
                <span className="text-emerald-600 font-extrabold">Lưu trữ: Firebase</span>
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2 export-no-print">
            <button
              onClick={() => handleExportImage('week')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <Camera size={15} />
              <span>Xuất Ảnh Tuần</span>
            </button>

            <button
              onClick={() => handleExportImage('month')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black hover:from-sky-600 hover:to-blue-700 shadow-sm shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Download size={15} />
              <span>Xuất Ảnh Cả Tháng</span>
            </button>
          </div>
        </div>

        {/* SINGLE WEEK VIEW */}
        {currentWeek !== 'all' ? (
          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-200/80">
            <table className="w-full text-center border-collapse table-fixed min-w-[850px]">
              <colgroup>
                <col className="w-12" />
                <col className="w-40" />
                <col className="w-24" />
                {DAYS.map(d => <col key={d} className="w-20" />)}
                <col className="w-16" />
                <col className="w-16" />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-2">STT</th>
                  <th className="py-3 px-3 text-left">Nhân Viên</th>
                  <th className="py-3 px-2">Nhóm</th>
                  {DAYS.map(d => {
                    const isSun = d === 'CN';
                    return (
                      <th key={d} className={`py-2 px-1 border-l border-slate-200 ${isSun ? 'bg-rose-50/70 text-rose-700' : ''}`}>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-extrabold">{d}</span>
                          <span className="text-[10px] font-bold text-slate-400">{currentWeekDates[d] || ''}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-1 border-l border-slate-200 bg-purple-50/50 text-purple-700">Tổng TN</th>
                  <th className="py-3 px-1 border-l border-slate-200 bg-amber-50/50 text-amber-700">Tổng KHO</th>
                  <th className="py-3 px-2 border-l border-slate-200 text-rose-600">Nghỉ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {/* NHÓM 1 */}
                <tr className="bg-sky-50/70 text-sky-800 font-black text-left">
                  <td colSpan={13} className="py-2.5 px-4 text-xs tracking-wider">
                    🔵 Nhóm 1 (Hành Chính 1) • {staffG1.length} Nhân Viên
                  </td>
                </tr>
                {staffG1.map((staff, idx) => {
                  const staffShifts = schedule[currentMonth]?.[currentWeek]?.[staff] || {};
                  let tn = 0, kho = 0, off = 0;
                  DAYS.forEach(d => {
                    const v = String(staffShifts[d] || '').toUpperCase();
                    if (v === 'TN') tn++;
                    else if (v === 'KHO') kho++;
                    else if (v === 'X') off++;
                  });

                  return (
                    <tr key={staff} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-2.5 px-2 text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-left font-black text-slate-900 truncate">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-black">
                            {staff.charAt(0)}
                          </span>
                          <span className="truncate">{staff}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-700">
                          Nhóm 1
                        </span>
                      </td>
                      {DAYS.map(d => {
                        const shift = String(staffShifts[d] || '').toUpperCase();
                        const isSun = d === 'CN';
                        return (
                          <td 
                            key={d} 
                            onClick={() => handleCellClick(staff, d, currentWeek)}
                            className={`py-2 px-1 border-l border-slate-100 cursor-pointer select-none transition-colors ${
                              isSun ? 'bg-rose-50/30 hover:bg-rose-100/50' : 'hover:bg-slate-100/80'
                            }`}
                          >
                            <RenderShiftBadge shift={shift} />
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-1 border-l border-slate-100 font-black text-purple-700 bg-purple-50/20">{tn}</td>
                      <td className="py-2.5 px-1 border-l border-slate-100 font-black text-amber-700 bg-amber-50/20">{kho}</td>
                      <td className="py-2.5 px-2 border-l border-slate-100 font-black text-rose-600">{off}</td>
                    </tr>
                  );
                })}

                {/* NHÓM 2 */}
                <tr className="bg-emerald-50/70 text-emerald-800 font-black text-left">
                  <td colSpan={13} className="py-2.5 px-4 text-xs tracking-wider">
                    🟢 Nhóm 2 (Hành Chính 2) • {staffG2.length} Nhân Viên
                  </td>
                </tr>
                {staffG2.map((staff, idx) => {
                  const staffShifts = schedule[currentMonth]?.[currentWeek]?.[staff] || {};
                  let tn = 0, kho = 0, off = 0;
                  DAYS.forEach(d => {
                    const v = String(staffShifts[d] || '').toUpperCase();
                    if (v === 'TN') tn++;
                    else if (v === 'KHO') kho++;
                    else if (v === 'X') off++;
                  });

                  return (
                    <tr key={staff} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-2.5 px-2 text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-left font-black text-slate-900 truncate">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                            {staff.charAt(0)}
                          </span>
                          <span className="truncate">{staff}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                          Nhóm 2
                        </span>
                      </td>
                      {DAYS.map(d => {
                        const shift = String(staffShifts[d] || '').toUpperCase();
                        const isSun = d === 'CN';
                        return (
                          <td 
                            key={d} 
                            onClick={() => handleCellClick(staff, d, currentWeek)}
                            className={`py-2 px-1 border-l border-slate-100 cursor-pointer select-none transition-colors ${
                              isSun ? 'bg-rose-50/30 hover:bg-rose-100/50' : 'hover:bg-slate-100/80'
                            }`}
                          >
                            <RenderShiftBadge shift={shift} />
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-1 border-l border-slate-100 font-black text-purple-700 bg-purple-50/20">{tn}</td>
                      <td className="py-2.5 px-1 border-l border-slate-100 font-black text-amber-700 bg-amber-50/20">{kho}</td>
                      <td className="py-2.5 px-2 border-l border-slate-100 font-black text-rose-600">{off}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ALL WEEKS (CẢ THÁNG) VIEW */
          <div className="space-y-8">
            {WEEKS.map(wName => {
              const weekDates = getWeekDates(currentMonth, wName);
              return (
                <div key={wName} className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-black text-sky-800 uppercase tracking-wide flex items-center gap-1.5">
                      <CalendarCheck size={14} className="text-sky-600" />
                      {wName} - {currentMonth} ({weekDates['T2']} - {weekDates['CN']})
                    </span>
                  </div>

                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-center border-collapse table-fixed min-w-[850px]">
                      <colgroup>
                        <col className="w-12" />
                        <col className="w-40" />
                        <col className="w-24" />
                        {DAYS.map(d => <col key={d} className="w-20" />)}
                        <col className="w-16" />
                        <col className="w-16" />
                        <col className="w-20" />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-700 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-2">STT</th>
                          <th className="py-2.5 px-3 text-left">Nhân Viên</th>
                          <th className="py-2.5 px-2">Nhóm</th>
                          {DAYS.map(d => (
                            <th key={d} className={`py-1.5 px-1 border-l border-slate-200 ${d === 'CN' ? 'bg-rose-50/60 text-rose-700' : ''}`}>
                              <span className="text-xs font-extrabold block">{d}</span>
                              <span className="text-[10px] font-bold text-slate-400 block">{weekDates[d] || ''}</span>
                            </th>
                          ))}
                          <th className="py-2.5 px-1 border-l border-slate-200 bg-purple-50/40 text-purple-700">TN</th>
                          <th className="py-2.5 px-1 border-l border-slate-200 bg-amber-50/40 text-amber-700">KHO</th>
                          <th className="py-2.5 px-2 border-l border-slate-200 text-rose-600">Nghỉ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {/* NHÓM 1 */}
                        <tr className="bg-sky-50/50 text-sky-800 font-black text-left">
                          <td colSpan={13} className="py-2 px-4 text-[11px] tracking-wider">
                            🔵 Nhóm 1 (Hành Chính 1)
                          </td>
                        </tr>
                        {staffG1.map((staff, idx) => {
                          const staffShifts = schedule[currentMonth]?.[wName]?.[staff] || {};
                          let tn = 0, kho = 0, off = 0;
                          DAYS.forEach(d => {
                            const v = String(staffShifts[d] || '').toUpperCase();
                            if (v === 'TN') tn++;
                            else if (v === 'KHO') kho++;
                            else if (v === 'X') off++;
                          });

                          return (
                            <tr key={staff} className="hover:bg-sky-50/20 transition-colors">
                              <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 text-left font-black text-slate-900 truncate">{staff}</td>
                              <td className="py-2 px-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-700">Nhóm 1</span>
                              </td>
                              {DAYS.map(d => {
                                const shift = String(staffShifts[d] || '').toUpperCase();
                                return (
                                  <td 
                                    key={d} 
                                    onClick={() => handleCellClick(staff, d, wName)}
                                    className="py-1.5 px-1 border-l border-slate-100 cursor-pointer hover:bg-slate-100/70"
                                  >
                                    <RenderShiftBadge shift={shift} />
                                  </td>
                                );
                              })}
                              <td className="py-2 px-1 border-l border-slate-100 font-black text-purple-700">{tn}</td>
                              <td className="py-2 px-1 border-l border-slate-100 font-black text-amber-700">{kho}</td>
                              <td className="py-2 px-2 border-l border-slate-100 font-black text-rose-600">{off}</td>
                            </tr>
                          );
                        })}

                        {/* NHÓM 2 */}
                        <tr className="bg-emerald-50/50 text-emerald-800 font-black text-left">
                          <td colSpan={13} className="py-2 px-4 text-[11px] tracking-wider">
                            🟢 Nhóm 2 (Hành Chính 2)
                          </td>
                        </tr>
                        {staffG2.map((staff, idx) => {
                          const staffShifts = schedule[currentMonth]?.[wName]?.[staff] || {};
                          let tn = 0, kho = 0, off = 0;
                          DAYS.forEach(d => {
                            const v = String(staffShifts[d] || '').toUpperCase();
                            if (v === 'TN') tn++;
                            else if (v === 'KHO') kho++;
                            else if (v === 'X') off++;
                          });

                          return (
                            <tr key={staff} className="hover:bg-emerald-50/20 transition-colors">
                              <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 text-left font-black text-slate-900 truncate">{staff}</td>
                              <td className="py-2 px-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">Nhóm 2</span>
                              </td>
                              {DAYS.map(d => {
                                const shift = String(staffShifts[d] || '').toUpperCase();
                                return (
                                  <td 
                                    key={d} 
                                    onClick={() => handleCellClick(staff, d, wName)}
                                    className="py-1.5 px-1 border-l border-slate-100 cursor-pointer hover:bg-slate-100/70"
                                  >
                                    <RenderShiftBadge shift={shift} />
                                  </td>
                                );
                              })}
                              <td className="py-2 px-1 border-l border-slate-100 font-black text-purple-700">{tn}</td>
                              <td className="py-2 px-1 border-l border-slate-100 font-black text-amber-700">{kho}</td>
                              <td className="py-2 px-2 border-l border-slate-100 font-black text-rose-600">{off}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Export Footer Note */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>Chú thích:</span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200"><strong>TN</strong>: Thu Ngân</span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200"><strong>KHO</strong>: Phụ Kho</span>
            <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200"><strong>HC</strong>: Hành Chính</span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"><strong>x</strong>: Nghỉ Off</span>
          </div>

          <div className="flex items-center gap-8 text-[11px] text-slate-400">
            <span>Người lập bảng: ....................</span>
            <span>Quản lý duyệt: ....................</span>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          STICKY SAVE BAR AT BOTTOM WHEN THERE ARE UNSAVED CHANGES
          ========================================================================== */}
      {unsavedChangesCount > 0 && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-amber-400 animate-spin" />
            <span className="text-xs font-black tracking-wide text-amber-300">
              {unsavedChangesCount} thay đổi chưa lưu lên Firebase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChanges}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Hoàn tác
            </button>

            <button
              onClick={handleSaveToFirebase}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black shadow-md shadow-sky-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Ngay'}
            </button>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL: AUTO ROTATE 4 WEEKS BALANCED SCHEDULE
          ========================================================================== */}
      {showAutoRotateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black shadow-md shadow-sky-500/20">
                  <Wand2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    ⚡ Xoay Tua KHO & TN Tự Động (4 Tuần)
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">Dựa trên Ca Mẫu Chuẩn • Đảm bảo số ca TN & KHO cân bằng 100%</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAutoRotateModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Algorithm explanation alert */}
              <div className="bg-sky-50/80 rounded-2xl p-4 border border-sky-200/80 flex items-start gap-3">
                <Sparkles size={20} className="text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  <strong className="text-sky-900 block font-bold mb-1">Thuật toán xoay tua ca mẫu Tuần 1:</strong>
                  Hệ thống sử dụng ma trận phân ca chuẩn của <strong>Tuần 1</strong>, tự động dịch chuyển xoay vòng cho <strong>Tuần 2, Tuần 3, Tuần 4</strong> nhằm đảm bảo <strong>số ca TN và KHO trong cả tháng giữa các nhân viên cân bằng nhau tuyệt đối</strong>, không có sự chênh lệch.
                </div>
              </div>

              {/* KPI Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KPI Nhóm 1 */}
                <div className="bg-sky-50/60 rounded-2xl p-4 border border-sky-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800">
                      🔵 Nhóm 1 ({staffG1.length} Nhân Viên)
                    </span>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Cân bằng 100%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-xl border border-sky-100">
                    <div>
                      <span className="text-lg font-black text-purple-700">4 - 5</span>
                      <span className="text-[10px] font-bold text-slate-400 block">Ca TN / người</span>
                    </div>
                    <div className="border-x border-slate-100">
                      <span className="text-lg font-black text-amber-600">4 - 5</span>
                      <span className="text-[10px] font-bold text-slate-400 block">Ca KHO / người</span>
                    </div>
                    <div>
                      <span className="text-lg font-black text-sky-700">9 - 10</span>
                      <span className="text-[10px] font-bold text-slate-400 block">Tổng ca / người</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Mỗi ngày đều có đúng <strong>1 TN & 1 KHO</strong>. Nhân viên Nhóm 1 trực đều 4-5 ca TN và 4-5 ca KHO trong tháng.
                  </p>
                </div>

                {/* KPI Nhóm 2 */}
                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                      🟢 Nhóm 2 ({staffG2.length} Nhân Viên)
                    </span>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Cân bằng 100%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-lg font-black text-purple-700">5 - 6</span>
                      <span className="text-[10px] font-bold text-slate-400 block">Ca TN / người</span>
                    </div>
                    <div className="border-x border-slate-100">
                      <span className="text-lg font-black text-amber-600">5 - 6</span>
                      <span className="text-[10px] font-bold text-slate-400 block">Ca KHO / người</span>
                    </div>
                    <div>
                      <span className="text-lg font-black text-sky-700">11 - 12</span>
                      <span className="text-[10px] font-bold text-slate-400 block">Tổng ca / người</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Mỗi ngày đều có đúng <strong>1 TN & 1 KHO</strong>. Cả nhóm trực 5-6 ca TN và 5-6 ca KHO trong tháng.
                  </p>
                </div>
              </div>

              {/* View Selector Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setRotateModalTab('summary')}
                  className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                    rotateModalTab === 'summary'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Bảng Tổng Kết Cân Bằng Cả Tháng ({allStaff.length} Nhân Viên)
                </button>
                <button
                  onClick={() => setRotateModalTab('detail')}
                  className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                    rotateModalTab === 'detail'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Chi Tiết Phân Ca 4 Tuần
                </button>
              </div>

              {/* Tab 1: Summary Table */}
              {rotateModalTab === 'summary' && (
                <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-200">
                  <table className="w-full text-center text-xs font-bold">
                    <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2">STT</th>
                        <th className="py-2.5 px-3 text-left">Nhân Viên</th>
                        <th className="py-2.5 px-2">Nhóm</th>
                        <th className="py-2.5 px-2">Tuần 1</th>
                        <th className="py-2.5 px-2">Tuần 2</th>
                        <th className="py-2.5 px-2">Tuần 3</th>
                        <th className="py-2.5 px-2">Tuần 4</th>
                        <th className="py-2.5 px-2 bg-purple-50 text-purple-700">Tổng TN</th>
                        <th className="py-2.5 px-2 bg-amber-50 text-amber-700">Tổng KHO</th>
                        <th className="py-2.5 px-2 bg-sky-50 text-sky-700">Tổng Ca</th>
                        <th className="py-2.5 px-2">Đánh Giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allStaff.map((staff, idx) => {
                        const isG1 = staffG1.includes(staff);
                        let totalTN = 0, totalKHO = 0;
                        const weekStats: string[] = [];

                        WEEKS.forEach(w => {
                          let wTN = 0, wKHO = 0;
                          DAYS.forEach(d => {
                            const val = balancedPreview[w]?.[staff]?.[d];
                            if (val === 'TN') { wTN++; totalTN++; }
                            if (val === 'KHO') { wKHO++; totalKHO++; }
                          });
                          weekStats.push(`${wTN} TN, ${wKHO} KHO`);
                        });

                        return (
                          <tr key={staff} className="hover:bg-slate-50">
                            <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 text-left font-black text-slate-800">{staff}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isG1 ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {isG1 ? 'Nhóm 1' : 'Nhóm 2'}
                              </span>
                            </td>
                            {weekStats.map((ws, i) => (
                              <td key={i} className="py-2 px-2 text-[11px] text-slate-600">{ws}</td>
                            ))}
                            <td className="py-2 px-2 font-black text-purple-700 bg-purple-50/40">{totalTN}</td>
                            <td className="py-2 px-2 font-black text-amber-700 bg-amber-50/40">{totalKHO}</td>
                            <td className="py-2 px-2 font-black text-sky-700 bg-sky-50/40">{totalTN + totalKHO}</td>
                            <td className="py-2 px-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                                ✓ Cân bằng
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Detail Table */}
              {rotateModalTab === 'detail' && (
                <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 max-h-[350px]">
                  <table className="w-full text-center text-xs font-bold">
                    <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2">Tuần</th>
                        <th className="py-2 px-3 text-left">Nhân Viên</th>
                        {DAYS.map(d => (
                          <th key={d} className={`py-2 px-1 ${d === 'CN' ? 'bg-rose-50 text-rose-700' : ''}`}>{d}</th>
                        ))}
                        <th className="py-2 px-1 bg-purple-50 text-purple-700">TN</th>
                        <th className="py-2 px-1 bg-amber-50 text-amber-700">KHO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {WEEKS.map(w => (
                        <React.Fragment key={w}>
                          <tr className="bg-sky-50/70 font-black text-sky-800 text-left">
                            <td colSpan={11} className="py-2 px-3">{w.toUpperCase()}</td>
                          </tr>
                          {allStaff.map(staff => {
                            const shifts = balancedPreview[w]?.[staff] || {};
                            let tn = 0, kho = 0;
                            DAYS.forEach(d => {
                              if (shifts[d] === 'TN') tn++;
                              if (shifts[d] === 'KHO') kho++;
                            });

                            return (
                              <tr key={staff} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2 text-slate-400 text-[10px]">{w}</td>
                                <td className="py-1.5 px-3 text-left font-black text-slate-800 truncate">{staff}</td>
                                {DAYS.map(d => (
                                  <td key={d} className="py-1.5 px-1">
                                    <RenderShiftBadge shift={shifts[d] || ''} />
                                  </td>
                                ))}
                                <td className="py-1.5 px-1 font-black text-purple-700">{tn}</td>
                                <td className="py-1.5 px-1 font-black text-amber-700">{kho}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Áp dụng cho: <strong className="text-sky-700">{currentMonth}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAutoRotateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={handleApplyAutoRotate}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black shadow-md shadow-sky-500/25 hover:from-sky-600 hover:to-blue-700 transition-all cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>Áp Dụng Xoay Tua 4 Tuần Vào Lịch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL: QUẢN LÝ NHÂN VIÊN TỪNG NHÓM (GROUP 1 & GROUP 2)
          ========================================================================== */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black shadow-md shadow-sky-500/20">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    👥 Quản Lý & Thêm Nhân Viên Từng Nhóm
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">Thêm mới, chuyển đổi hoặc xoá nhân viên giữa Nhóm 1 và Nhóm 2</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStaffModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Counts mini stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-100 text-center">
                  <span className="text-[11px] font-bold text-sky-700 block">🔵 Nhóm 1</span>
                  <strong className="text-base font-black text-sky-900">{tempG1.length} Nhân Viên</strong>
                </div>
                <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-100 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block">🟢 Nhóm 2</span>
                  <strong className="text-base font-black text-emerald-900">{tempG2.length} Nhân Viên</strong>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">👥 Tổng Cộng</span>
                  <strong className="text-base font-black text-slate-800">{tempG1.length + tempG2.length} Nhân Viên</strong>
                </div>
              </div>

              {/* 2 Columns: G1 & G2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column Nhóm 1 */}
                <div className="bg-sky-50/30 rounded-2xl p-4 border border-sky-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-800 uppercase tracking-wide">Nhóm 1 (Hành Chính 1)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800">{tempG1.length} người</span>
                  </div>

                  {/* Add Input */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newStaffG1Input}
                      onChange={(e) => setNewStaffG1Input(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTempStaffG1(); }}
                      placeholder="Tên nhân viên (VD: HÙNG)..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 focus:border-sky-500 outline-hidden uppercase"
                    />
                    <button
                      onClick={handleAddTempStaffG1}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition-colors cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>

                  {/* Staff List G1 */}
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {tempG1.map((name, idx) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
                          <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-black">
                            {name.charAt(0)}
                          </span>
                          <span className="text-xs font-black text-slate-800 truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSwitchTempGroup(1, idx)}
                            title="Chuyển sang Nhóm 2"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowLeftRight size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTempStaff(1, idx)}
                            title="Xoá nhân viên"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column Nhóm 2 */}
                <div className="bg-emerald-50/30 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">Nhóm 2 (Hành Chính 2)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">{tempG2.length} người</span>
                  </div>

                  {/* Add Input */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newStaffG2Input}
                      onChange={(e) => setNewStaffG2Input(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTempStaffG2(); }}
                      placeholder="Tên nhân viên (VD: TRANG)..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 focus:border-emerald-500 outline-hidden uppercase"
                    />
                    <button
                      onClick={handleAddTempStaffG2}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>

                  {/* Staff List G2 */}
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {tempG2.map((name, idx) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                            {name.charAt(0)}
                          </span>
                          <span className="text-xs font-black text-slate-800 truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSwitchTempGroup(2, idx)}
                            title="Chuyển sang Nhóm 1"
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowLeftRight size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTempStaff(2, idx)}
                            title="Xoá nhân viên"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Batch Import Accordion */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowBatchImport(!showBatchImport)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-black text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet size={15} className="text-sky-600" />
                    <span>Nhập danh sách nhanh từ văn bản / Excel</span>
                  </span>
                  {showBatchImport ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showBatchImport && (
                  <div className="p-4 bg-white space-y-3 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Dán danh sách tên nhân viên vào đây (mỗi dòng một tên hoặc cách nhau bằng dấu phẩy).
                    </p>
                    <textarea
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      rows={3}
                      placeholder={"HOÀNG ANH\nMINH CHÂU\nQUỐC BẢO"}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:border-sky-500 outline-hidden"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600">Thêm vào:</label>
                        <select
                          value={batchTargetGroup}
                          onChange={(e) => setBatchTargetGroup(e.target.value as '1' | '2')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white cursor-pointer"
                        >
                          <option value="1">🔵 Nhóm 1</option>
                          <option value="2">🟢 Nhóm 2</option>
                        </select>
                      </div>
                      <button
                        onClick={handleExecuteBatchImport}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black transition-colors cursor-pointer"
                      >
                        Nạp Toàn Bộ Vào Nhóm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetDefaultStaff}
                className="text-xs font-black text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Khôi Phục Mặc Định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaffModal}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black shadow-md shadow-sky-500/25 hover:from-sky-600 hover:to-blue-700 transition-all cursor-pointer"
                >
                  <Check size={15} />
                  <span>Lưu & Cập Nhật Bảng Ca</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL: IMAGE PREVIEW & DOWNLOAD
          ========================================================================== */}
      {showImagePreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Camera size={18} className="text-sky-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-md">
                  {exportedImageTitle}
                </h3>
              </div>
              <button 
                onClick={() => setShowImagePreviewModal(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Hình ảnh sắc nét chất lượng cao, sẵn sàng gửi Zalo hoặc in ấn:
              </p>
              <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <img src={exportedImageUrl} alt="Bảng phân ca" className="max-w-full h-auto mx-auto rounded-xl shadow-xs" />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowImagePreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <a
                href={exportedImageUrl}
                download={exportedFileName}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md shadow-sky-500/25 transition-all cursor-pointer"
              >
                <Download size={15} />
                <span>Tải Ảnh PNG Về Máy</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shift Badge renderer with authentic styling
 */
function RenderShiftBadge({ shift }: { shift: string }) {
  const upper = (shift || '').trim().toUpperCase();

  if (upper === 'TN') {
    return (
      <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
        TN
      </span>
    );
  }
  if (upper === 'KHO') {
    return (
      <span className="inline-block px-2 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
        KHO
      </span>
    );
  }
  if (upper === 'HC') {
    return (
      <span className="inline-block px-2 py-1 rounded-lg text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs">
        HC
      </span>
    );
  }
  if (upper === 'X') {
    return (
      <span className="inline-block px-2 py-1 rounded-lg text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">
        x
      </span>
    );
  }

  return <span className="text-slate-300 font-bold">-</span>;
}

export default PhanCaHanhChinhTab;
