import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Trash2, Calendar, MapPin, Users, Megaphone, 
  Sparkles, Edit3, Save, X, FileText, Check, ArrowRight, 
  Flag, CalendarDays, ClipboardCheck, Loader2, Navigation,
  Map, Eye, EyeOff, ClipboardList, Camera, Copy, Upload,
  BarChart3, RefreshCw, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { cn } from '../pages/RTST/utils';
import { domToPng } from 'modern-screenshot';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { ImagePreviewModal } from './ImagePreviewModal';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';

interface RoadshowManagementProps {
  warehouseCode?: string;
}

export interface RoadshowPlan {
  id: string;
  title: string;
  date: string;
  timeRange: string;
  leader: string;
  members: string;
  route: string;
  props: string;
  kpis: string;
  status: 'pending' | 'active' | 'completed';
  notes?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface StaffShiftState {
  name: string;
  shift: 'sang' | 'chieu' | 'off' | 'dup'; // sang: morning, chieu: afternoon, off: off, dup: double shift (both)
  isPg?: boolean;
}

export const normalizeStaffName = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
};

export const getShiftForStaff = (
  staffName: string,
  shiftsMap: Record<string, 'sang' | 'chieu' | 'off' | 'dup'>
): 'sang' | 'chieu' | 'off' | 'dup' => {
  if (!shiftsMap || !staffName) return 'off';

  // 1. Direct exact key match
  const rawUpper = staffName.trim().toUpperCase();
  if (shiftsMap[rawUpper]) return shiftsMap[rawUpper];

  // 2. Direct normalized key match
  const normStaff = normalizeStaffName(staffName);
  const staffWords = normStaff.split(/\s+/).filter(Boolean);
  const lastName = staffWords[staffWords.length - 1] || ''; // e.g. "mi", "duy", "nhan"

  for (const [key, shiftVal] of Object.entries(shiftsMap)) {
    const normKey = normalizeStaffName(key);
    if (normKey === normStaff) return shiftVal;

    // Handle keys like "157597 - Mi" or "100644 - Duy"
    const keyWords = normKey.split(/\s+/).filter(Boolean);
    const keyLastName = keyWords[keyWords.length - 1] || '';

    // If last names match and staffWords contains it
    if (lastName && keyLastName && lastName === keyLastName) {
      return shiftVal;
    }

    // If one contains the other
    if (normStaff.length > 2 && normKey.length > 2) {
      if (normStaff.includes(normKey) || normKey.includes(normStaff)) {
        return shiftVal;
      }
    }
  }

  return 'off';
};

export const RoadshowManagement: React.FC<RoadshowManagementProps> = ({ warehouseCode: propWarehouseCode }) => {
  const { userProfile } = useAuth();
  const { currentStoreId } = useStore();
  const warehouseCode = propWarehouseCode || userProfile?.ma_kho || currentStoreId || '43751';

  // Tabs: 'PLANNER' (Sắp tuyến nhanh) | 'STATS' (Thống kê tháng) | 'HISTORY' (Lịch trình & Bản đồ)
  const [activeTab, setActiveTab] = useState<'PLANNER' | 'STATS' | 'HISTORY'>('PLANNER');
  
  // History tab states
  const [plans, setPlans] = useState<RoadshowPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);
  const [openMapIds, setOpenMapIds] = useState<Record<string, boolean>>({});

  // History form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [histDate, setHistDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeRange, setTimeRange] = useState('08:00 - 10:30');
  const [leader, setLeader] = useState('');
  const [members, setMembers] = useState('');
  const [route, setRoute] = useState('');
  const [props, setProps] = useState('Xe máy gắn cờ phướn, loa kéo phát nhạc');
  const [kpis, setKpis] = useState('Phát 300 tờ rơi, tiếp cận 100 khách hàng');
  const [status, setStatus] = useState<'pending' | 'active' | 'completed'>('pending');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: 'Xin giấy phép hoặc thông báo chính quyền địa phương (nếu cần)', completed: false },
    { id: '2', text: 'Đồng phục siêu thị (áo thun, quần sẫm màu, giày thể thao) chỉnh tề', completed: false },
    { id: '3', text: 'Loa kéo cầm tay hoặc loa lớn di động đã sạc đầy pin 100%', completed: false },
    { id: '4', text: 'Chuẩn bị tờ rơi khuyến mãi, catalog sản phẩm xếp ngăn nắp', completed: false },
    { id: '5', text: 'Công cụ nghiệp vụ (bàn mini gấp gọn, sim số, máy quét thẻ)', completed: false },
    { id: '6', text: 'Rửa sạch phương tiện chạy (xe máy, xe đạp) và đổ đầy bình xăng', completed: false },
    { id: '7', text: 'Gắn cờ hiệu, banner, bóng bay thương hiệu chắc chắn vào đuôi xe', completed: false },
    { id: '8', text: 'Nước uống đóng chai, mũ bảo hiểm đạt chuẩn cho nhân viên', completed: false }
  ]);

  // Planner tab states
  const [rawStaffInput, setRawStaffInput] = useState('');
  const [rawPgInput, setRawPgInput] = useState('');
  const [masterPg, setMasterPg] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<StaffShiftState[]>([]);
  const [plannerDate, setPlannerDate] = useState(new Date().toISOString().split('T')[0]);
  const [morningTime, setMorningTime] = useState('7:00');
  const [afternoonTime, setAfternoonTime] = useState('15:00');
  const [morningRoute, setMorningRoute] = useState('- BỜ KÈ PHƯỜNG 7, RẠCH RẬP, MIẾU BÀ CÔ 2');
  const [afternoonRoute, setAfternoonRoute] = useState('- TÀI LỘC, HOÀNG TÂM, LƯƠNG THẾ TRÂN');
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copySourceDate, setCopySourceDate] = useState('');
  const [recentDates, setRecentDates] = useState<string[]>([]);
  const [isSyncingPg, setIsSyncingPg] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  };



  // Load checklist, planner configs, and master staff list keyed by selected Date
  useEffect(() => {
    if (!warehouseCode) return;

    // Load static checklist
    const cachedChecklist = localStorage.getItem(`crm_roadshow_checklist_${warehouseCode}`);
    if (cachedChecklist) {
      setChecklist(JSON.parse(cachedChecklist));
    }

    // Scan recent planned dates to populate copy dropdown list
    updateRecentDatesList();
  }, [warehouseCode]);

  // Listen to Firestore real-time changes for Planner Data (Master staff & Shift states)
  useEffect(() => {
    if (!warehouseCode || !plannerDate) return;
    const docRef = doc(db, 'system_configs', `roadshow_planner_${warehouseCode}`);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // 1. Sync master staff list
        const dbMaster = data.masterStaff || [];
        if (dbMaster.length > 0) {
          localStorage.setItem(`crm_roadshow_planner_master_staff_${warehouseCode}`, JSON.stringify(dbMaster));
        }

        // 2. Sync master PG list
        const dbPg = data.masterPg || [];
        if (dbPg.length > 0) {
          localStorage.setItem(`crm_roadshow_planner_master_pg_${warehouseCode}`, JSON.stringify(dbPg));
          setMasterPg(dbPg);
        }

        // 3. Sync shifts for all dates from Firestore to localStorage
        const dbShifts = data.shifts || {};
        Object.keys(dbShifts).forEach(dKey => {
          if (dbShifts[dKey] && Object.keys(dbShifts[dKey]).length > 0) {
            const localRaw = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${dKey}`);
            const localParsed = localRaw ? JSON.parse(localRaw) : {};
            const merged = { ...localParsed, ...dbShifts[dKey] };
            localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${dKey}`, JSON.stringify(merged));
          }
        });

        // Get shifts for currently selected plannerDate
        const localActiveRaw = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
        const localActiveShifts = localActiveRaw ? JSON.parse(localActiveRaw) : {};
        const firestoreActiveShifts = dbShifts[plannerDate] || {};
        const dateShifts = { ...localActiveShifts, ...firestoreActiveShifts };
        localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`, JSON.stringify(dateShifts));

        // 4. Sync configs for selected date
        const dbConfigs = data.configs || {};
        const dateConfigs = dbConfigs[plannerDate] || {};
        localStorage.setItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`, JSON.stringify(dateConfigs));

        const effectiveMaster = dbMaster.length > 0 
          ? dbMaster 
          : (JSON.parse(localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`) || '[]'));

        const effectivePg = dbPg.length > 0 
          ? dbPg 
          : (JSON.parse(localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`) || '[]'));

        // Map to active state
        const mappedStaffList: StaffShiftState[] = [
          ...effectiveMaster.map((name: string) => ({
            name: name.toUpperCase(),
            shift: getShiftForStaff(name, dateShifts),
            isPg: false
          })),
          ...effectivePg.map((name: string) => ({
            name: name.toUpperCase(),
            shift: getShiftForStaff(name, dateShifts),
            isPg: true
          }))
        ];
        setStaffList(mappedStaffList);

        setMorningTime(dateConfigs.morningTime || '7:00');
        setAfternoonTime(dateConfigs.afternoonTime || '15:00');
        setMorningRoute(dateConfigs.morningRoute || '');
        setAfternoonRoute(dateConfigs.afternoonRoute || '');
      } else {
        // Fallback to local storage if Firestore document doesn't exist yet
        loadPlannerFromLocalStorage();
      }
      updateRecentDatesList();
    }, (error) => {
      console.error('Error listening to planner data:', error);
      loadPlannerFromLocalStorage();
    });

    return () => unsub();
  }, [warehouseCode, plannerDate]);

  const loadPlannerFromLocalStorage = () => {
    const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    const masterNames: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];

    const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
    const pgNames: string[] = cachedPg ? JSON.parse(cachedPg) : [];
    setMasterPg(pgNames);

    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};

    const mappedStaffList: StaffShiftState[] = [
      ...masterNames.map(name => ({
        name: name.toUpperCase(),
        shift: getShiftForStaff(name, dateShifts),
        isPg: false
      })),
      ...pgNames.map(name => ({
        name: name.toUpperCase(),
        shift: getShiftForStaff(name, dateShifts),
        isPg: true
      }))
    ];
    setStaffList(mappedStaffList);

    const cachedConfigs = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`);
    if (cachedConfigs) {
      const configs = JSON.parse(cachedConfigs);
      setMorningTime(configs.morningTime || '7:00');
      setAfternoonTime(configs.afternoonTime || '15:00');
      setMorningRoute(configs.morningRoute || '');
      setAfternoonRoute(configs.afternoonRoute || '');
    } else {
      setMorningTime('7:00');
      setAfternoonTime('15:00');
      setMorningRoute('');
      setAfternoonRoute('');
    }
  };

  const updateRecentDatesList = () => {
    const prefix = `crm_roadshow_planner_shifts_${warehouseCode}_`;
    const dates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const datePart = key.replace(prefix, '');
        if (datePart !== plannerDate) {
          dates.push(datePart);
        }
      }
    }
    const sorted = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    setRecentDates(sorted);
  };

  // Listen to cross-origin sync hash data from Tampermonkey script
  useEffect(() => {
    const handleHashSync = async () => {
      if (typeof window === 'undefined' || !warehouseCode) return;
      const hash = window.location.hash;
      if (!hash.startsWith('#sync_data=')) return;

      try {
        const rawData = hash.replace('#sync_data=', '');
        const decoded = decodeURIComponent(atob(rawData));
        const payload = JSON.parse(decoded);

        if (payload && payload.staff && payload.shifts) {
          const confirmSync = window.confirm(
            `Phát hiện dữ liệu phân ca tự động từ TGDD (${Object.keys(payload.shifts).length} ngày, ${payload.staff.length} nhân viên).\n\nBạn có đồng ý đồng bộ ca của các nhân sự này vào lịch trình CRM không?`
          );

          if (confirmSync) {
            // 1. Load current master lists
            const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
            const currentMaster: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];

            const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
            const currentPg: string[] = cachedPg ? JSON.parse(cachedPg) : [];

            // Merge master staff list
            const payloadStaff = payload.staff.map((name: string) => name.toUpperCase().trim());
            const updatedMaster = Array.from(new Set([...currentMaster, ...payloadStaff]));
            localStorage.setItem(`crm_roadshow_planner_master_staff_${warehouseCode}`, JSON.stringify(updatedMaster));

            // 2. Merge shifts for each date
            const multiShifts: Record<string, Record<string, 'sang' | 'chieu' | 'off' | 'dup'>> = {};
            
            Object.keys(payload.shifts).forEach(dateKey => {
              // Load current shifts for this date to preserve PG shifts
              const cachedDateShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${dateKey}`);
              const existingShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedDateShifts ? JSON.parse(cachedDateShifts) : {};

              const merged = { ...existingShifts };
              const datePayloadShifts = payload.shifts[dateKey];
              
              Object.keys(datePayloadShifts).forEach(name => {
                const upperName = name.toUpperCase().trim();
                merged[upperName] = datePayloadShifts[name];
              });

              localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${dateKey}`, JSON.stringify(merged));
              multiShifts[dateKey] = merged;
            });

            // 3. Sync to Firestore in a single batch write
            await savePlannerDataToFirestore(updatedMaster, undefined, undefined, multiShifts, currentPg);

            showToast(`Đồng bộ thành công dữ liệu ca từ TGDD!`, true);

            // Reload state
            loadPlannerFromLocalStorage();
          }
        }
      } catch (err) {
        console.error('Error parsing sync data from URL hash:', err);
        showToast('Lỗi giải mã dữ liệu đồng bộ ca!', false);
      } finally {
        // Clear hash without reloading the page
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    // Delay slightly to ensure storage is ready
    const timer = setTimeout(handleHashSync, 500);
    return () => clearTimeout(timer);
  }, [warehouseCode, plannerDate]);

  // Save planner data to Firestore to sync in real-time
  const savePlannerDataToFirestore = async (
    masterList?: string[], 
    shiftsForDate?: Record<string, string>,
    configsForDate?: Record<string, string>,
    multiShifts?: Record<string, Record<string, string>>,
    pgList?: string[],
    targetDateOverride?: string
  ) => {
    try {
      const docRef = doc(db, 'system_configs', `roadshow_planner_${warehouseCode}`);
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : { masterStaff: [], masterPg: [], shifts: {}, configs: {} };

      const updatedMaster = (masterList && masterList.length > 0) ? masterList : (currentData.masterStaff || []);
      const updatedPg = (pgList && pgList.length > 0) ? pgList : (currentData.masterPg || []);
      const updatedShifts = { ...(currentData.shifts || {}) };
      
      const effectiveDateKey = targetDateOverride || plannerDate;

      if (multiShifts) {
        Object.keys(multiShifts).forEach(dateKey => {
          updatedShifts[dateKey] = {
            ...(updatedShifts[dateKey] || {}),
            ...multiShifts[dateKey]
          };
        });
      } else if (shiftsForDate) {
        updatedShifts[effectiveDateKey] = {
          ...(updatedShifts[effectiveDateKey] || {}),
          ...shiftsForDate
        };
      }

      const updatedConfigs = { ...(currentData.configs || {}) };
      if (configsForDate) {
        updatedConfigs[effectiveDateKey] = configsForDate;
      }

      await setDoc(docRef, {
        masterStaff: updatedMaster,
        masterPg: updatedPg,
        shifts: updatedShifts,
        configs: updatedConfigs
      }, { merge: true });
    } catch (error) {
      console.error('Error saving planner data to firestore:', error);
    }
  };

  // Save checklist helper
  const saveChecklistToCache = (newChecklist: ChecklistItem[]) => {
    setChecklist(newChecklist);
    localStorage.setItem(`crm_roadshow_checklist_${warehouseCode}`, JSON.stringify(newChecklist));
  };

  const toggleChecklistItem = (id: string) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    saveChecklistToCache(updated);
  };

  const resetChecklist = () => {
    const reset = checklist.map(item => ({ ...item, completed: false }));
    saveChecklistToCache(reset);
    showToast('Đã làm mới danh sách kiểm tra!', true);
  };

  // Load staff pasted list into Master Staff List (Appends only)
  const handleLoadStaff = () => {
    const pastedNames = rawStaffInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .map(name => name.toUpperCase());

    if (pastedNames.length === 0) {
      showToast('Vui lòng nhập tên nhân viên!', false);
      return;
    }

    // 1. Load current master lists
    const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    const currentMaster: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];

    const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
    const currentPg: string[] = cachedPg ? JSON.parse(cachedPg) : [];

    // Filter out duplicates
    const uniqueNewNames = pastedNames.filter(name => !currentMaster.includes(name));

    if (uniqueNewNames.length === 0) {
      showToast('Tất cả nhân sự nhập vào đã tồn tại trong danh sách!', false);
      setRawStaffInput('');
      return;
    }

    const updatedMaster = [...currentMaster, ...uniqueNewNames];

    // 2. Save local
    localStorage.setItem(`crm_roadshow_planner_master_staff_${warehouseCode}`, JSON.stringify(updatedMaster));

    // 3. Save current date shifts
    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};

    const newStaffList: StaffShiftState[] = [
      ...updatedMaster.map(name => ({
        name,
        shift: dateShifts[name] || 'off',
        isPg: false
      })),
      ...currentPg.map(name => ({
        name,
        shift: dateShifts[name] || 'off',
        isPg: true
      }))
    ];

    setStaffList(newStaffList);
    setRawStaffInput('');

    // Sync Firestore
    savePlannerDataToFirestore(updatedMaster, dateShifts, undefined, undefined, currentPg);

    showToast(`Đã nạp thêm ${uniqueNewNames.length} nhân viên mới vào danh sách!`, true);
    updateRecentDatesList();
  };

  // Load PG pasted list into Master PG List (Appends only)
  const handleLoadPg = () => {
    const pastedNames = rawPgInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .map(name => name.toUpperCase());

    if (pastedNames.length === 0) {
      showToast('Vui lòng nhập tên PG!', false);
      return;
    }

    // 1. Load current master lists
    const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    const currentMaster: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];

    const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
    const currentPg: string[] = cachedPg ? JSON.parse(cachedPg) : [];

    // Filter out duplicates
    const uniqueNewPg = pastedNames.filter(name => !currentPg.includes(name));

    if (uniqueNewPg.length === 0) {
      showToast('Tất cả PG nhập vào đã tồn tại trong danh sách!', false);
      setRawPgInput('');
      return;
    }

    const updatedPg = [...currentPg, ...uniqueNewPg];

    // 2. Save local
    localStorage.setItem(`crm_roadshow_planner_master_pg_${warehouseCode}`, JSON.stringify(updatedPg));
    setMasterPg(updatedPg);

    // 3. Save current date shifts
    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};

    const newStaffList: StaffShiftState[] = [
      ...currentMaster.map(name => ({
        name,
        shift: dateShifts[name] || 'off',
        isPg: false
      })),
      ...updatedPg.map(name => ({
        name,
        shift: dateShifts[name] || 'off',
        isPg: true
      }))
    ];

    setStaffList(newStaffList);
    setRawPgInput('');

    // Sync Firestore
    savePlannerDataToFirestore(currentMaster, dateShifts, undefined, undefined, updatedPg);

    showToast(`Đã nạp thêm ${uniqueNewPg.length} PG mới vào danh sách!`, true);
    updateRecentDatesList();
  };

  // Calculate weeks of month matching LichLamViecPG exactly
  const getWeeksOfMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const day = firstDay.getDay(); // 0: Sun, 1: Mon, ...

    let startMon = new Date(year, month, 1);
    if (day === 1) {
      startMon = new Date(year, month, 1);
    } else if (day >= 2 && day <= 4) {
      startMon.setDate(firstDay.getDate() - (day - 1));
    } else {
      const daysToAdd = day === 0 ? 1 : (8 - day);
      startMon.setDate(firstDay.getDate() + daysToAdd);
    }

    const weeks: { dates: Date[] }[] = [];
    let cur = new Date(startMon);
    for (let w = 0; w < 5; w++) {
      const dates: Date[] = [];
      for (let dt = 0; dt < 7; dt++) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push({ dates });
    }
    return weeks;
  };

  // Locate weekKey & dayIndex in Lich PG across current/prev/next months
  const findPgWeekAndDayForDate = (dateStr: string) => {
    const [yStr, mStr, dStr] = dateStr.split('-');
    const tYear = parseInt(yStr, 10);
    const tMonth = parseInt(mStr, 10) - 1; // 0-indexed
    const tDay = parseInt(dStr, 10);

    // Candidates: Current month, Previous month, Next month
    const candidates = [
      { y: tYear, m: tMonth },
      { y: tMonth === 0 ? tYear - 1 : tYear, m: tMonth === 0 ? 11 : tMonth - 1 },
      { y: tMonth === 11 ? tYear + 1 : tYear, m: tMonth === 11 ? 0 : tMonth + 1 },
    ];

    for (const cand of candidates) {
      const candMonthKey = `${cand.y}-${String(cand.m + 1).padStart(2, '0')}`;
      const weeks = getWeeksOfMonth(cand.y, cand.m);

      for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
        const w = weeks[wIdx];
        const dIdx = w.dates.findIndex(d => 
          d.getFullYear() === tYear && 
          d.getMonth() === tMonth && 
          d.getDate() === tDay
        );
        if (dIdx !== -1) {
          return {
            monthKey: candMonthKey,
            weekKey: `week${wIdx + 1}`,
            dayIndex: dIdx,
            weekDates: w.dates
          };
        }
      }
    }
    return null;
  };

  // Map PG shift string from Lịch PG → Roadshow shift
  const mapPgShiftToRoadshow = (shiftName: string): 'sang' | 'chieu' | 'off' | 'dup' => {
    if (!shiftName) return 'off';
    const norm = shiftName.toLowerCase().trim();
    if (norm === 'off' || norm.includes('nghỉ') || norm.includes('nghi')) return 'off';
    if (
      norm.includes('gãy') || norm.includes('gay') || norm.includes('đúp') || norm.includes('dup') || norm.includes('full') || norm.includes('cả ngày') ||
      norm.includes('2,3,4,5') || norm.includes('1,2,3,4,5') || norm.includes('2-3-4-5') || norm.includes('1-2-3-4-5') || norm.includes('2345') || norm.includes('12345')
    ) return 'dup';
    if (norm.includes('1,2,3') || norm.includes('1-2-3') || norm.includes('1,2') || norm.includes('1-2') || norm.includes('123') || norm.includes('12')) return 'sang';
    if (norm.includes('3,4,5') || norm.includes('3-4-5') || norm.includes('345') || norm.includes('3,4') || norm.includes('4,5')) return 'chieu';
    if (norm.includes('chiều') || norm.includes('chieu') || norm.includes('tối') || norm.includes('toi') || norm.includes('ca 4') || norm.includes('ca 5')) return 'chieu';
    if (norm.includes('sáng') || norm.includes('sang') || norm.includes('trưa') || norm.includes('trua') || norm.includes('ca 1') || norm.includes('ca 2') || norm.includes('ca 3')) return 'sang';
    if (norm.length > 0) return 'sang';
    return 'off';
  };

  // Sync PG list directly from "Lịch PG" based on plannerDate (or targetDateOverride)
  // One-click / auto-sync: reads PG schedule, adds directly to master PG list with shift mapping
  const handleSyncPgFromLich = async (silent = false, targetDateOverride?: string) => {
    const targetDateStr = targetDateOverride || plannerDate;
    if (!targetDateStr) {
      if (!silent) showToast('Vui lòng chọn ngày chạy Roadshow trước khi đồng bộ!', false);
      return;
    }

    const weekInfo = findPgWeekAndDayForDate(targetDateStr);
    if (!weekInfo) {
      if (!silent) showToast('Không xác định được tuần của ngày này trong Lịch PG', false);
      return;
    }

    setIsSyncingPg(true);
    try {
      const docRef = doc(db, 'lichLamViecPG', `GLOBAL_${weekInfo.monthKey}`);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        if (!silent) showToast(`Không tìm thấy dữ liệu Lịch PG cho tháng ${weekInfo.monthKey}`, false);
        return;
      }

      const data = docSnap.data();
      const ictRoster = data.ictRoster || [];
      const dtdlgdRoster = data.dtdlgdRoster || [];
      const weekDataDoc = data.weekData?.[weekInfo.weekKey] || { ict: {}, dtdlgd: {} };

      const allPgFromLich: { name: string; shift: 'sang' | 'chieu' | 'off' | 'dup' }[] = [];

      ictRoster.forEach((pg: any) => {
        if (!pg.tenPgHang) return;
        const namePart = pg.tenPgHang.split('-')[0].trim().toUpperCase();
        const rawShift = weekDataDoc.ict?.[pg.id]?.shifts?.[weekInfo.dayIndex] || '';
        allPgFromLich.push({ name: namePart, shift: mapPgShiftToRoadshow(rawShift) });
      });

      dtdlgdRoster.forEach((pg: any) => {
        if (!pg.tenPgHang) return;
        const namePart = pg.tenPgHang.split('-')[0].trim().toUpperCase();
        const rawShift = weekDataDoc.dtdlgd?.[pg.id]?.shifts?.[weekInfo.dayIndex] || '';
        allPgFromLich.push({ name: namePart, shift: mapPgShiftToRoadshow(rawShift) });
      });

      if (allPgFromLich.length === 0) {
        if (!silent) showToast(`Không tìm thấy PG nào trong Lịch PG tháng ${weekInfo.monthKey}`, false);
        return;
      }

      // 1. Load current master lists
      const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
      const currentMaster: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];

      const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
      const currentPg: string[] = cachedPg ? JSON.parse(cachedPg) : [];

      // 2. Load current date shifts
      const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${targetDateStr}`);
      const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};

      // 3. Merge PG list and update shifts
      const newPgNames = allPgFromLich.map(p => p.name);
      const updatedPg = Array.from(new Set([...currentPg, ...newPgNames]));

      allPgFromLich.forEach(({ name, shift }) => {
        dateShifts[name] = shift;
      });

      // 4. Save to localStorage
      localStorage.setItem(`crm_roadshow_planner_master_pg_${warehouseCode}`, JSON.stringify(updatedPg));
      localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${targetDateStr}`, JSON.stringify(dateShifts));
      setMasterPg(updatedPg);

      // 5. Rebuild staffList for UI
      const newStaffList: StaffShiftState[] = [
        ...currentMaster.map(name => ({
          name,
          shift: getShiftForStaff(name, dateShifts),
          isPg: false
        })),
        ...updatedPg.map(name => ({
          name,
          shift: getShiftForStaff(name, dateShifts),
          isPg: true
        }))
      ];
      setStaffList(newStaffList);

      // 6. Clear textarea
      setRawPgInput('');

      // 7. Sync Firestore without wiping staff shifts
      savePlannerDataToFirestore(currentMaster, dateShifts, undefined, undefined, updatedPg, targetDateStr);

      if (!silent) {
        const workingCount = allPgFromLich.filter(p => p.shift !== 'off').length;
        showToast(`Đã đồng bộ ca cho ${allPgFromLich.length} PG (${workingCount} PG đi làm)!`, true);
      }
      updateRecentDatesList();
    } catch (err) {
      console.error('Error syncing PG schedule:', err);
      if (!silent) showToast('Có lỗi xảy ra khi đồng bộ lịch PG', false);
    } finally {
      setIsSyncingPg(false);
    }
  };

  // Import from Excel file
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: true,
          cellText: true
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to 2D array
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        if (rows.length === 0) {
          showToast('File Excel trống!', false);
          return;
        }

        // 1. Get the year from plannerDate
        const dateParts = plannerDate.split('-');
        const plannerYear = parseInt(dateParts[0], 10) || new Date().getFullYear();

        // Helper to extract standard YYYY-MM-DD from cell text/Date
        const extractDateKey = (val: any): string | null => {
          if (val === null || val === undefined) return null;
          const str = String(val).trim();
          if (!str) return null;

          // 1. Check YYYY-MM-DD or YYYY/MM/DD
          const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10);
            const d = parseInt(isoMatch[3], 10);
            return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
          }

          // 2. Check DD/MM pattern (e.g. "T2 (24/08)", "24/08", "CN (30/08)", "30/8")
          const dmMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})/);
          if (dmMatch) {
            const d = parseInt(dmMatch[1], 10);
            const m = parseInt(dmMatch[2], 10);
            if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
              return `${plannerYear}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
            }
          }

          // 3. Check Date object
          if (val instanceof Date) {
            const y = val.getFullYear();
            const m = val.getMonth() + 1;
            const d = val.getDate();
            return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
          }

          return null;
        };

        // 2. Dynamically scan the first 10 rows to detect which row is the Date Header row
        let dateRowIndex = 0;
        let maxDateCols = 0;
        for (let r = 0; r < Math.min(10, rows.length); r++) {
          const row = rows[r] || [];
          let dateColsCount = 0;
          for (let c = 0; c < row.length; c++) {
            if (extractDateKey(row[c])) {
              dateColsCount++;
            }
          }
          if (dateColsCount > maxDateCols) {
            maxDateCols = dateColsCount;
            dateRowIndex = r;
          }
        }

        // 3. Dynamically locate the Shift Header row (e.g., contains "Ca 1", "Ca 2", "Ca 3")
        let shiftRowIndex = dateRowIndex + 1;
        for (let r = dateRowIndex + 1; r < Math.min(dateRowIndex + 4, rows.length); r++) {
          const row = rows[r] || [];
          const hasShiftWord = row.some(cell => {
            const val = String(cell || '').toLowerCase().trim();
            return (
              val.includes('ca ') || val === 'ca1' || val === 'ca2' || 
              val === 'ca3' || val === 'ca4' || val === 'ca5' || 
              val.includes('sáng') || val.includes('chiều')
            );
          });
          if (hasShiftWord) {
            shiftRowIndex = r;
            break;
          }
        }

        // 4. Identify the Employee Name column index by scanning up to the Shift Header row
        let nameColIndex = -1;
        for (let r = 0; r <= shiftRowIndex; r++) {
          const row = rows[r] || [];
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').toLowerCase().trim();
            if (
              val.includes('tên') || val.includes('ten') || 
              val.includes('nhân viên') || val.includes('nhan vien') || 
              val.includes('họ tên') || val.includes('ho ten') || 
              val === 'nv' || val.includes('staff') || val === 'name' ||
              val === 'họ và tên' || val === 'hovaten'
            ) {
              nameColIndex = c;
              break;
            }
          }
          if (nameColIndex !== -1) break;
        }

        if (nameColIndex === -1) {
          const shiftRow = rows[shiftRowIndex] || [];
          nameColIndex = shiftRow.length > 2 ? 1 : 0;
        }

        // 5. Group columns by Date Key YYYY-MM-DD
        const dateColsMap: Record<string, number[]> = {};

        // A. Check worksheet['!merges'] for exact date column ranges
        if (worksheet['!merges'] && Array.isArray(worksheet['!merges'])) {
          worksheet['!merges'].forEach(range => {
            if (range.s.r <= dateRowIndex && range.e.r >= dateRowIndex) {
              const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
              const cell = worksheet[cellAddress];
              const cellVal = cell?.w || cell?.v;
              const dateKey = extractDateKey(cellVal);
              if (dateKey) {
                if (!dateColsMap[dateKey]) dateColsMap[dateKey] = [];
                for (let c = range.s.c; c <= range.e.c; c++) {
                  if (!dateColsMap[dateKey].includes(c)) {
                    dateColsMap[dateKey].push(c);
                  }
                }
              }
            }
          });
        }

        // B. If !merges didn't populate dateColsMap, use left-to-right propagation
        if (Object.keys(dateColsMap).length === 0) {
          let currentActiveDateKey = '';
          const dateRow = rows[dateRowIndex] || [];
          for (let c = 0; c < dateRow.length; c++) {
            const cellVal = dateRow[c];
            const dateKey = extractDateKey(cellVal);
            if (dateKey) {
              currentActiveDateKey = dateKey;
            }
            if (currentActiveDateKey) {
              if (!dateColsMap[currentActiveDateKey]) {
                dateColsMap[currentActiveDateKey] = [];
              }
              dateColsMap[currentActiveDateKey].push(c);
            }
          }
        }

        if (Object.keys(dateColsMap).length === 0) {
          showToast(`Không tìm thấy cột ngày hợp lệ nào ở dòng ngày của Excel!`, false);
          return;
        }

        // 6. Load current Master
        let currentMaster: string[] = [];
        try {
          const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
          if (cachedMaster) {
            const parsed = JSON.parse(cachedMaster);
            if (Array.isArray(parsed)) currentMaster = parsed;
          }
        } catch (e) {
          console.error(e);
        }

        // Helper to extract clean employee name from cell
        const extractStaffName = (row: any[]): string => {
          let raw = String(row[nameColIndex] || '').trim();
          // If nameColIndex holds department name, check adjacent column
          if (raw.startsWith('BP ') || raw.includes('Bộ Phận') || raw.includes('Bo Phan') || raw.length <= 1) {
            if (row[nameColIndex + 1]) {
              raw = String(row[nameColIndex + 1]).trim();
            }
          }
          return raw.toUpperCase();
        };

        // Extract employee names first (to build/update the master staff list)
        for (let r = shiftRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;

          const rawName = extractStaffName(row);
          if (
            !rawName || rawName === 'STT' || rawName.includes('CỘNG') || rawName.includes('TỔNG') || 
            rawName.includes('THỜI GIAN') || rawName === 'NHÂN VIÊN' || rawName === 'HỌ TÊN' ||
            rawName === 'HO TEN' || rawName === 'TÊN NV' || rawName === 'NAME' || rawName === 'HỌ VÀ TÊN' ||
            rawName === 'HỌTÊN' || rawName === 'BỘ PHẬN' || rawName === 'BO PHAN' ||
            rawName.includes('GIỜ CÔNG') || rawName.includes('NHÂN SỰ')
          ) {
            continue;
          }

          if (!currentMaster.includes(rawName)) {
            // Check if there is already a matching name in currentMaster before pushing
            const existingMatch = currentMaster.find(m => {
              const nm = normalizeStaffName(m);
              const nr = normalizeStaffName(rawName);
              return nm === nr || (nm.length > 2 && nr.length > 2 && (nm.includes(nr) || nr.includes(nm)));
            });
            if (!existingMatch) {
              currentMaster.push(rawName);
            }
          }
        }

        if (currentMaster.length === 0) {
          showToast('Không đọc được nhân sự nào từ file Excel!', false);
          return;
        }

        // 7. Build shifts map for each date
        const allDatesShifts: Record<string, Record<string, 'sang' | 'chieu' | 'off' | 'dup'>> = {};

        Object.keys(dateColsMap).forEach(dateKey => {
          const colIndices = dateColsMap[dateKey];
          const ca1Cols: number[] = [];
          const ca2Cols: number[] = [];
          const ca3Cols: number[] = [];
          const ca4Cols: number[] = [];
          const ca5Cols: number[] = [];
          const generalCols: number[] = [];

          colIndices.forEach(c => {
            const subHeader = String(rows[shiftRowIndex]?.[c] || '').toLowerCase().trim();
            if (/\b1\b|ca\s*1|ca1/i.test(subHeader)) {
              ca1Cols.push(c);
            } else if (/\b2\b|ca\s*2|ca2/i.test(subHeader)) {
              ca2Cols.push(c);
            } else if (/\b3\b|ca\s*3|ca3/i.test(subHeader)) {
              ca3Cols.push(c);
            } else if (/\b4\b|ca\s*4|ca4/i.test(subHeader)) {
              ca4Cols.push(c);
            } else if (/\b5\b|ca\s*5|ca5/i.test(subHeader)) {
              ca5Cols.push(c);
            } else if (subHeader.includes('sáng') || subHeader.includes('sang')) {
              ca1Cols.push(c);
            } else if (subHeader.includes('chiều') || subHeader.includes('chieu') || subHeader.includes('tối') || subHeader.includes('toi')) {
              ca4Cols.push(c);
            } else {
              generalCols.push(c);
            }
          });

          const shiftMap: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = {};

          for (let r = shiftRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row) continue;

            const rawName = extractStaffName(row);
            if (
              !rawName || rawName === 'STT' || rawName.includes('CỘNG') || rawName.includes('TỔNG') || 
              rawName.includes('THỜI GIAN') || rawName === 'NHÂN VIÊN' || rawName === 'HỌ TÊN' ||
              rawName === 'HO TEN' || rawName === 'TÊN NV' || rawName === 'NAME' || rawName === 'HỌ VÀ TÊN' ||
              rawName === 'HỌTÊN' || rawName === 'BỘ PHẬN' || rawName === 'BO PHAN' ||
              rawName.includes('GIỜ CÔNG') || rawName.includes('NHÂN SỰ')
            ) {
              continue;
            }

            const isCellValid = (c: number) => {
              const val = String(row[c] || '').trim().toLowerCase();
              return val !== '' && val !== '0' && val !== 'off' && val !== 'nghỉ' && val !== 'nghi' && val !== '-';
            };

            let hasCa1 = ca1Cols.some(isCellValid);
            let hasCa2 = ca2Cols.some(isCellValid);
            let hasCa3 = ca3Cols.some(isCellValid);
            let hasCa4 = ca4Cols.some(isCellValid);
            let hasCa5 = ca5Cols.some(isCellValid);

            // Also check text inside all date columns (e.g. if single column per date or combined text)
            const cellTexts: string[] = [];
            colIndices.forEach(c => {
              const val = String(row[c] || '').trim();
              if (val && val !== '0') cellTexts.push(val);
            });

            cellTexts.forEach(txt => {
              const t = txt.toLowerCase();
              if (/\b1\b|ca\s*1|ca1/i.test(t)) hasCa1 = true;
              if (/\b2\b|ca\s*2|ca2/i.test(t)) hasCa2 = true;
              if (/\b3\b|ca\s*3|ca3/i.test(t)) hasCa3 = true;
              if (/\b4\b|ca\s*4|ca4/i.test(t)) hasCa4 = true;
              if (/\b5\b|ca\s*5|ca5/i.test(t)) hasCa5 = true;
            });

            // Determine shift based on Quy ước lọc ca Excel:
            // Ca 1,2 = Ca Sáng
            // Ca 1,2,3 = Ca Sáng
            // Ca 3,4,5 = Ca Chiều
            // Ca 2,3,4,5 = Ca Đúp
            // Ca 1,2,3,4,5 = Ca Đúp
            // Không có ca = OFF
            let shift: 'sang' | 'chieu' | 'off' | 'dup' = 'off';
            let matchedByKeyword = false;

            for (const txt of cellTexts) {
              const clean = txt.toLowerCase().replace(/\s+/g, '');
              if (
                clean.includes('đúp') || clean.includes('dup') || clean.includes('full') ||
                clean.includes('2,3,4,5') || clean.includes('1,2,3,4,5') ||
                clean.includes('2-3-4-5') || clean.includes('1-2-3-4-5') ||
                clean.includes('2345') || clean.includes('12345')
              ) {
                shift = 'dup';
                matchedByKeyword = true;
                break;
              }
              if (
                clean.includes('1,2,3') || clean.includes('1-2-3') || clean.includes('123') ||
                clean.includes('1,2') || clean.includes('1-2') || clean.includes('12')
              ) {
                shift = 'sang';
                matchedByKeyword = true;
                break;
              }
              if (
                clean.includes('3,4,5') || clean.includes('3-4-5') || clean.includes('345') ||
                clean.includes('3,4') || clean.includes('4,5')
              ) {
                shift = 'chieu';
                matchedByKeyword = true;
                break;
              }
              if (clean.includes('sáng') || clean.includes('sang')) {
                shift = 'sang';
                matchedByKeyword = true;
                break;
              }
              if (clean.includes('chiều') || clean.includes('chieu') || clean.includes('tối') || clean.includes('toi')) {
                shift = 'chieu';
                matchedByKeyword = true;
                break;
              }
            }

            if (!matchedByKeyword) {
              const hasEarly = hasCa1 || hasCa2; // Ca 1 hoặc Ca 2
              const hasLate = hasCa4 || hasCa5;  // Ca 4 hoặc Ca 5
              const hasMid = hasCa3;             // Ca 3

              if (!hasEarly && !hasMid && !hasLate) {
                // Không có ca = OFF
                shift = 'off';
              } else if (hasEarly && hasLate) {
                // Ca 2,3,4,5 hoặc Ca 1,2,3,4,5 = Ca Đúp
                shift = 'dup';
              } else if (hasEarly && !hasLate) {
                // Ca 1,2 hoặc Ca 1,2,3 = Ca Sáng
                shift = 'sang';
              } else if (!hasEarly && (hasMid || hasLate)) {
                // Ca 3,4,5 = Ca Chiều
                shift = 'chieu';
              } else {
                shift = 'off';
              }
            }

            // Save under rawName, namePart, and any matching master names
            shiftMap[rawName] = shift;
            if (rawName.includes('-')) {
              const namePart = rawName.split('-')[1].trim();
              if (namePart) shiftMap[namePart] = shift;
            }
            currentMaster.forEach(m => {
              if (normalizeStaffName(m) === normalizeStaffName(rawName) || normalizeStaffName(m).includes(normalizeStaffName(rawName)) || normalizeStaffName(rawName).includes(normalizeStaffName(m))) {
                shiftMap[m] = shift;
              }
            });
          }

          // Load existing local shifts and preserve PG shifts
          let mergedShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = {};
          try {
            const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${dateKey}`);
            if (cachedShifts) {
              mergedShifts = JSON.parse(cachedShifts);
            }
          } catch (e) {
            console.error(e);
          }

          // Overwrite with newly imported Excel shifts
          Object.keys(shiftMap).forEach(name => {
            mergedShifts[name] = shiftMap[name];
          });

          allDatesShifts[dateKey] = mergedShifts;
        });

        // 8. Load PG list to preserve
        const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
        const currentPg: string[] = cachedPg ? JSON.parse(cachedPg) : [];

        // Save local master staff
        localStorage.setItem(`crm_roadshow_planner_master_staff_${warehouseCode}`, JSON.stringify(currentMaster));

        // Save local shifts for all parsed dates
        Object.keys(allDatesShifts).forEach(dateKey => {
          localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${dateKey}`, JSON.stringify(allDatesShifts[dateKey]));
        });

        // Sync Firestore in a single batch
        savePlannerDataToFirestore(currentMaster, undefined, undefined, allDatesShifts, currentPg);

        // Update states for the currently selected plannerDate
        const activeShifts = allDatesShifts[plannerDate] || {};
        const mappedStaffList: StaffShiftState[] = [
          ...currentMaster.map(name => ({
            name,
            shift: getShiftForStaff(name, activeShifts),
            isPg: false
          })),
          ...currentPg.map(name => ({
            name,
            shift: getShiftForStaff(name, activeShifts),
            isPg: true
          }))
        ];
        setStaffList(mappedStaffList);

        const totalImportedDays = Object.keys(allDatesShifts).length;
        showToast(`Nhập và tự động phân ca thành công cho ${totalImportedDays} ngày từ Excel!`, true);
        updateRecentDatesList();
      } catch (err) {
        console.error('Error reading excel:', err);
        showToast('Lỗi đọc file Excel!', false);
      }
      e.target.value = ''; // reset
    };
    reader.readAsArrayBuffer(file);
  };

  // Update employee shift and save specifically for the selected date
  const handleUpdateShift = (index: number, shift: 'sang' | 'chieu' | 'off' | 'dup') => {
    const updated = [...staffList];
    updated[index].shift = shift;
    setStaffList(updated);

    const shiftMap: Record<string, string> = {};
    updated.forEach(s => {
      shiftMap[s.name] = s.shift;
    });
    localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`, JSON.stringify(shiftMap));
    
    // Sync Firestore
    savePlannerDataToFirestore(undefined, shiftMap);
    updateRecentDatesList();
  };

  // Delete individual staff member
  const handleDeleteIndividualStaff = (nameToDelete: string) => {
    const upperName = nameToDelete.toUpperCase();
    
    const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    const currentMaster: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];
    const updatedMaster = currentMaster.filter(name => name !== upperName);
    localStorage.setItem(`crm_roadshow_planner_master_staff_${warehouseCode}`, JSON.stringify(updatedMaster));

    const cachedPg = localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
    const currentPg: string[] = cachedPg ? JSON.parse(cachedPg) : [];
    const updatedPg = currentPg.filter(name => name !== upperName);
    localStorage.setItem(`crm_roadshow_planner_master_pg_${warehouseCode}`, JSON.stringify(updatedPg));
    setMasterPg(updatedPg);

    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};
    delete dateShifts[upperName];
    localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`, JSON.stringify(dateShifts));

    const updatedStaffList = staffList.filter(s => s.name !== upperName);
    setStaffList(updatedStaffList);
    
    // Sync Firestore
    savePlannerDataToFirestore(updatedMaster, dateShifts, undefined, undefined, updatedPg);
    
    showToast(`Đã xoá nhân sự ${upperName} khỏi danh sách!`, true);
    updateRecentDatesList();
  };

  // Clear planner list
  const handleClearPlanner = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá danh sách nhân sự hiện tại?')) return;
    setStaffList([]);
    setMasterPg([]);
    localStorage.removeItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    localStorage.removeItem(`crm_roadshow_planner_master_pg_${warehouseCode}`);
    localStorage.removeItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    
    // Sync Firestore
    savePlannerDataToFirestore([], {}, undefined, undefined, []);
    showToast('Đã xoá danh sách nhân sự và PG!', true);
    updateRecentDatesList();
  };

  // Save planner route/time configs keyed by selected date
  const handleSavePlannerConfigs = (key: string, value: string) => {
    const cachedConfigs = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`);
    const current = cachedConfigs ? JSON.parse(cachedConfigs) : {};
    current[key] = value;
    localStorage.setItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`, JSON.stringify(current));

    // Sync Firestore
    savePlannerDataToFirestore(undefined, undefined, current);
  };

  // Copy plan from another date
  const handleCopyPlanFromDate = () => {
    if (!copySourceDate) {
      showToast('Vui lòng chọn ngày nguồn để sao chép!', false);
      return;
    }

    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${copySourceDate}`);
    const dateShifts = cachedShifts ? JSON.parse(cachedShifts) : {};
    if (cachedShifts) {
      localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`, cachedShifts);
      
      const masterNames = staffList.map(s => s.name);
      const mapped = masterNames.map(name => ({
        name,
        shift: dateShifts[name] || 'off',
        isPg: masterPg.includes(name)
      }));
      setStaffList(mapped);
    }

    const cachedConfigs = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${copySourceDate}`);
    const configs = cachedConfigs ? JSON.parse(cachedConfigs) : {};
    if (cachedConfigs) {
      localStorage.setItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`, cachedConfigs);
      setMorningTime(configs.morningTime || '7:00');
      setAfternoonTime(configs.afternoonTime || '15:00');
      setMorningRoute(configs.morningRoute || '');
      setAfternoonRoute(configs.afternoonRoute || '');
    }

    // Sync Firestore
    savePlannerDataToFirestore(undefined, dateShifts, configs);

    showToast(`Đã sao chép lịch chạy từ ngày ${copySourceDate}!`, true);
  };

  // Compute monthly statistics dynamically
  const monthlyStats = useMemo(() => {
    if (!plannerDate || staffList.length === 0) return [];
    
    const yearMonth = plannerDate.substring(0, 7); // e.g. "2026-08"
    const prefix = `crm_roadshow_planner_shifts_${warehouseCode}_`;
    const allShifts: Record<string, Record<string, string>> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const datePart = key.replace(prefix, '');
        if (datePart.startsWith(yearMonth)) {
          // Check if this date has route data
          const configKey = `crm_roadshow_planner_configs_${warehouseCode}_${datePart}`;
          let hasRoute = false;
          try {
            const configs = JSON.parse(localStorage.getItem(configKey) || '{}');
            if (
              (configs.morningRoute && configs.morningRoute.trim() !== '') ||
              (configs.afternoonRoute && configs.afternoonRoute.trim() !== '')
            ) {
              hasRoute = true;
            }
          } catch (e) {
            console.error(e);
          }

          if (hasRoute) {
            try {
              allShifts[datePart] = JSON.parse(localStorage.getItem(key) || '{}');
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    }

    const uniqueDates = Object.keys(allShifts);
    
    return staffList.map(staff => {
      let runCount = 0;
      let offCount = 0;

      uniqueDates.forEach(date => {
        const dayShifts = allShifts[date] || {};
        const shiftVal = dayShifts[staff.name] || 'off';
        
        if (shiftVal === 'sang' || shiftVal === 'chieu') {
          runCount++;
        } else {
          offCount++;
        }
      });

      const totalDays = runCount + offCount;
      const rate = totalDays > 0 ? Math.round((runCount / totalDays) * 100) : 0;

      return {
        name: staff.name,
        runCount,
        offCount,
        rate
      };
    }).sort((a, b) => a.runCount - b.runCount); // Sort ascending (least runs first)
  }, [plannerDate, staffList, warehouseCode]);

  const handleCopyStatsText = () => {
    if (monthlyStats.length === 0) return;
    const yearMonth = plannerDate.substring(0, 7);
    const formattedMonth = `${yearMonth.split('-')[1]}/${yearMonth.split('-')[0]}`;
    
    let text = `📊 THỐNG KÊ TẦN SUẤT CHẠY ROADSHOW THÁNG ${formattedMonth}\n`;
    text += `(Sắp xếp theo thứ tự ưu tiên phân công: từ ít chạy nhất đến nhiều nhất)\n\n`;
    monthlyStats.forEach((s, idx) => {
      text += `${idx + 1}. ${s.name}: ${s.runCount} lần chạy | ${s.offCount} lần off (Tỷ lệ: ${s.rate}%)\n`;
    });

    navigator.clipboard.writeText(text);
    showToast('Đã sao chép bảng thống kê vào bộ nhớ tạm!', true);
  };

  // Filter staff by shifts:
  // - Nhân viên ca chiều ở siêu thị -> chạy Roadshow Ca Sáng
  // - Nhân viên ca sáng ở siêu thị -> chạy Roadshow Ca Chiều
  // - Nhân viên ca ĐÚP & OFF -> KHÔNG phân lịch chạy Roadshow
  const morningStaff = staffList.filter(s => s.shift === 'chieu');
  const afternoonStaff = staffList.filter(s => s.shift === 'sang');

  // Format date display: e.g. "Ngày 09/08"
  const getFormattedDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `NGÀY ${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  // Capture table image
  const handleCaptureTable = async () => {
    if (!tableRef.current) {
      showToast('Không tìm thấy bảng để chụp ảnh!', false);
      return;
    }

    setIsCapturing(true);

    const element = tableRef.current;
    const tableWidth = 1050;
    const padding = 25;
    const targetWidth = tableWidth + (padding * 2); // 1100px
    const colWidths = ['70px', '280px', '230px', '470px'];

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${targetWidth}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.opacity = '0';
    tempContainer.style.pointerEvents = 'none';

    const frameWrapper = document.createElement('div');
    frameWrapper.style.width = `${targetWidth}px`;
    frameWrapper.style.minWidth = `${targetWidth}px`;
    frameWrapper.style.backgroundColor = '#ffffff';
    frameWrapper.style.padding = `${padding}px`;
    frameWrapper.style.margin = '0';
    frameWrapper.style.boxSizing = 'border-box';
    frameWrapper.style.boxShadow = 'none';
    frameWrapper.style.display = 'inline-block';

    const clone = element.cloneNode(true) as HTMLElement;

    // 1. Replace all textareas in clone with styled div elements preserving exact text content
    const textareas = clone.querySelectorAll('textarea');
    textareas.forEach((ta) => {
      const routeType = ta.getAttribute('data-route-type');
      let textVal = (ta as HTMLTextAreaElement).value;
      if (routeType === 'morning') {
        textVal = morningRoute || textVal;
      } else if (routeType === 'afternoon') {
        textVal = afternoonRoute || textVal;
      }

      const div = document.createElement('div');
      div.className = 'whitespace-pre-wrap font-utm-avo font-black text-black leading-relaxed text-[15px]';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordBreak = 'break-word';
      div.style.fontFamily = 'UTM Avo, sans-serif';
      div.style.fontWeight = '900';
      div.style.color = '#000000';
      div.style.fontSize = '15px';
      div.style.lineHeight = '1.6';
      div.style.padding = '8px 12px';
      div.style.boxSizing = 'border-box';
      div.style.width = '100%';
      div.textContent = textVal || '';

      ta.parentNode?.replaceChild(div, ta);
    });

    // 2. Hide buttons and elements with .no-capture
    const noCaptureElements = clone.querySelectorAll('.no-capture, button');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // 3. Strip all shadows, filters and classes for zero-shadow export
    clone.style.boxShadow = 'none';
    clone.style.textShadow = 'none';
    clone.style.filter = 'none';
    clone.style.padding = '0';
    clone.style.margin = '0';
    clone.style.width = `${tableWidth}px`;
    clone.style.minWidth = `${tableWidth}px`;
    clone.style.maxWidth = `${tableWidth}px`;
    clone.style.boxSizing = 'border-box';

    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.boxShadow = 'none';
      htmlEl.style.textShadow = 'none';
      htmlEl.style.filter = 'none';
      htmlEl.style.borderRadius = '0px';
      Array.from(htmlEl.classList || []).forEach(cls => {
        if (cls.startsWith('shadow-') || cls === 'shadow') {
          htmlEl.classList.remove(cls);
        }
      });
    });

    // 4. Expand scroll containers
    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = '100%';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
    });

    // 5. Lock Table & Cell Widths strictly across ALL rows
    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = `${tableWidth}px`;
      htmlTable.style.minWidth = `${tableWidth}px`;
      htmlTable.style.maxWidth = `${tableWidth}px`;
      htmlTable.style.boxSizing = 'border-box';
      htmlTable.style.tableLayout = 'fixed';
      htmlTable.style.borderCollapse = 'collapse';
      htmlTable.style.border = '2px solid #000000';
      htmlTable.style.margin = '0';

      const cols = htmlTable.querySelectorAll('colgroup col');
      cols.forEach((c, idx) => {
        if (colWidths[idx]) {
          (c as HTMLElement).style.width = colWidths[idx];
          (c as HTMLElement).style.minWidth = colWidths[idx];
          (c as HTMLElement).style.maxWidth = colWidths[idx];
        }
      });

      const allRows = htmlTable.querySelectorAll('tr');
      allRows.forEach(tr => {
        const cells = tr.querySelectorAll('th, td');
        if (cells.length === 4) {
          cells.forEach((cell, cIdx) => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.width = colWidths[cIdx];
            htmlCell.style.minWidth = colWidths[cIdx];
            htmlCell.style.maxWidth = colWidths[cIdx];
            htmlCell.style.boxSizing = 'border-box';
          });
        } else if (cells.length === 3) {
          // Rows in rowSpan block (STT, NHÂN VIÊN, NGÀY)
          cells.forEach((cell, cIdx) => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.width = colWidths[cIdx];
            htmlCell.style.minWidth = colWidths[cIdx];
            htmlCell.style.maxWidth = colWidths[cIdx];
            htmlCell.style.boxSizing = 'border-box';
          });
        }
      });
    });

    // Add clone inside frameWrapper
    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      // 6. Ensure fonts and export image
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 200));

      const finalWidth = targetWidth;
      const finalHeight = frameWrapper.scrollHeight || frameWrapper.offsetHeight;

      let dataUrl: string;
      try {
        dataUrl = await htmlToImage.toPng(frameWrapper, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: false,
          width: finalWidth,
          height: finalHeight,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            ...EXPORT_FONT_STYLE,
          }
        });
      } catch (errHtml) {
        console.warn('htmlToImage failed, fallback to domToPng:', errHtml);
        dataUrl = await domToPng(frameWrapper, {
          backgroundColor: '#ffffff',
          scale: 2,
          quality: 0.98,
          width: finalWidth,
          height: finalHeight,
          style: {
            ...EXPORT_FONT_STYLE,
          }
        });
      }

      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing table image:', err);
      showToast('Chụp ảnh bảng thất bại!', false);
    } finally {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      setIsCapturing(false);
    }
  };

  // History apply template
  const handleApplyHistoryTemplate = (type: 1 | 2 | 3) => {
    if (type === 1) {
      setTitle('Roadshow Giờ Vàng - Chợ Huyện & Dân Cư');
      setTimeRange('08:00 - 10:30');
      setProps('Xe máy gắn cờ hiệu ĐMX, loa kéo di động phát nhạc và thông báo khuyến mãi');
      setRoute('Siêu thị -> Đường Trần Hưng Đạo -> Chợ Huyện -> Khu Dân Cư Trung Tâm -> Siêu thị');
      setKpis('Phát 300 tờ rơi, tiếp cận 150 lượt khách hàng, phát triển 15 thuê bao sim');
      setNotes('Tập trung chạy chậm xung quanh khu vực chợ và nơi đông dân cư để phát tờ rơi.');
    } else if (type === 2) {
      setTitle('Roadshow Tan Tầm - Ngã Tư & Cổng Trường');
      setTimeRange('16:30 - 18:30');
      setProps('Xe máy gắn cờ phướn, loa kéo đeo vai, đồng phục xanh đặc trưng');
      setRoute('Siêu thị -> Ngã tư đèn đỏ chính -> Cổng trường THPT -> Công viên thiếu nhi -> Siêu thị');
      setKpis('Phát 400 tờ rơi tuyển dụng/khuyến mãi, tiếp cận 200 lượt khách hàng');
      setNotes('Dừng lại phát tờ rơi tại các điểm dừng đèn đỏ ngã tư lớn và cổng trường học lúc tan tầm.');
    } else if (type === 3) {
      setTitle('Roadshow Chiến Dịch Xã Xa Siêu Thị');
      setTimeRange('08:00 - 16:30 (Cả ngày)');
      setProps('Xe tải nhỏ trưng bày sản phẩm hoặc xe máy chạy đoàn, bàn tư vấn lưu động');
      setRoute('Siêu thị -> Tuyến đường liên xã -> Trung tâm Xã Lân Cận -> Chợ Xã -> Siêu thị');
      setKpis('Dựng điểm tư vấn 3 tiếng, phát 600 tờ rơi, mở 25 tài khoản sim');
      setNotes('Chuẩn bị thêm ô che nắng, bàn ghế gấp gọn để dựng điểm tiếp khách tư vấn trực tiếp tại chợ xã.');
    }
    showToast('Đã áp dụng lộ trình gợi ý! Hãy chỉnh sửa thông tin bên dưới.', true);
  };

  // Add or Edit History Plan
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !route.trim()) {
      showToast('Vui lòng nhập Tiêu đề và Tuyến đường chạy!', false);
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'system_configs', 'roadshow_schedules');
      let updatedPlans = [...plans];

      if (editingId) {
        updatedPlans = updatedPlans.map(p => p.id === editingId ? {
          ...p, title, date: histDate, timeRange, leader, members, route, props, kpis, status, notes
        } : p);
      } else {
        const newPlan: RoadshowPlan = {
          id: 'rs-' + Date.now(),
          title, date: histDate, timeRange, leader, members, route, props, kpis, status, notes
        };
        updatedPlans.push(newPlan);
      }

      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      currentData[warehouseCode] = updatedPlans;

      await setDoc(docRef, currentData);
      setPlans(updatedPlans);
      localStorage.setItem(`crm_roadshows_${warehouseCode}`, JSON.stringify(updatedPlans));
      
      handleCancelEdit();
      showToast(editingId ? 'Đã cập nhật lịch trình thành công!' : 'Đã tạo lịch trình Roadshow mới!', true);
    } catch (error) {
      console.error('Error saving roadshow:', error);
      showToast('Lưu lịch trình thất bại, vui lòng thử lại!', false);
    } finally {
      setSaving(false);
    }
  };

  // Helper to parse route nodes: split by "->", "-->", "➔"
  const parseRouteNodes = (routeStr: string) => {
    if (!routeStr) return [];
    return routeStr.split(/(?:->|-->|➔|➔)/).map(s => s.trim()).filter(Boolean);
  };

  const filteredPlans = plans.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.leader.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-5 right-5 z-[9999] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider",
              toast.isSuccess ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            )}
          >
            {toast.isSuccess ? <Check size={16} /> : <X size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab bar */}
      <div className="flex border-b border-slate-200 gap-4 mb-4">
        <button
          onClick={() => setActiveTab('PLANNER')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all px-3 py-1.5 rounded-t-xl",
            activeTab === 'PLANNER' 
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/60 shadow-xs" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
        >
          Sắp Tuyến Nhanh (Bảng Ảnh)
        </button>
        <button
          onClick={() => setActiveTab('STATS')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all px-3 py-1.5 rounded-t-xl",
            activeTab === 'STATS' 
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/60 shadow-xs" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
        >
          Thống Kê Tần Suất Chạy
        </button>
      </div>

      {/* RENDER PLANNER TAB */}
      {activeTab === 'PLANNER' && (
        <div className="space-y-6">
          
          {/* USER INSTRUCTIONS BANNER (TONE XANH LÁ & VÀNG) */}
          <div className="bg-gradient-to-r from-emerald-50/90 via-amber-50/60 to-emerald-50/40 border-l-4 border-emerald-600 rounded-r-3xl rounded-l-lg p-5 shadow-md shadow-emerald-100/50 border-y border-r border-slate-200/50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-2xl shrink-0 shadow-lg shadow-emerald-200">
                <Info size={22} className="animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-2">
                  Quy trình thiết lập lịch chạy Roadshow:
                  <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-black uppercase tracking-wider">Hướng dẫn nhanh</span>
                </h4>
                <ol className="list-decimal list-inside text-[11.5px] font-bold text-slate-750 space-y-2 leading-relaxed">
                  <li>
                    Truy cập trang quản lý ca trực:{" "}
                    <a 
                      href="https://office.thegioididong.com/quan-ly-phan-ca" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-emerald-700 hover:text-emerald-900 underline hover:no-underline font-black decoration-2"
                    >
                      https://office.thegioididong.com/quan-ly-phan-ca
                    </a>{" "}
                    để tải file Excel phân ca.
                  </li>
                  <li>
                    Nhập file Excel ca (nút <span className="text-emerald-800 font-black">EXCEL PHÂN CA</span>) để tự động phân ca chạy cho Nhân viên siêu thị.
                  </li>
                  <li>
                    Nhập danh sách và thiết lập lịch phân ca <span className="text-amber-800 font-black">PG</span> (hoặc bấm <span className="text-teal-700 font-black">ĐỒNG BỘ LỊCH PG</span>).
                  </li>
                  <li>
                    Nhập tuyến đường chạy tương ứng cho buổi Sáng & Chiều &rarr; Chụp ảnh xuất lịch chạy hoàn tất!
                  </li>
                  <li className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-slate-900 font-black flex flex-wrap gap-x-2 gap-y-1.5 items-center">
                    <span>Quy ước lọc ca Excel:</span>
                    <span className="bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded border border-amber-300 text-[10px] font-black">Ca 1,2 = Ca Sáng</span>
                    <span className="bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded border border-amber-300 text-[10px] font-black">Ca 1,2,3 = Ca Sáng</span>
                    <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded border border-emerald-300 text-[10px] font-black">Ca 3,4,5 = Ca Chiều</span>
                    <span className="bg-teal-100 text-teal-950 px-2 py-0.5 rounded border border-teal-300 text-[10px] font-black">Ca 2,3,4,5 = Ca Đúp</span>
                    <span className="bg-teal-100 text-teal-950 px-2 py-0.5 rounded border border-teal-300 text-[10px] font-black">Ca 1,2,3,4,5 = Ca Đúp</span>
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 text-[10px] font-black">Không có ca = OFF</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left Box: Input and Quick check */}
            <div className="xl:col-span-1 space-y-6">
              
              {/* Batch Input Staff Box */}
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-emerald-500/80 shadow-emerald-50/40">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  1. Nhập Nhân Sự Chạy Hôm Nay
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-emerald-950 tracking-wider mb-1">Dán danh sách Nhân viên Siêu thị</label>
                    <textarea
                      rows={3}
                      placeholder="Mỗi dòng một tên... Ví dụ:&#10;NHẠN&#10;ĐẠI&#10;MI"
                      value={rawStaffInput}
                      onChange={(e) => setRawStaffInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-amber-900 tracking-wider mb-1">Dán danh sách PG</label>
                    <textarea
                      rows={3}
                      placeholder="Mỗi dòng một tên... Ví dụ:&#10;LAN&#10;MAI&#10;VY"
                      value={rawPgInput}
                      onChange={(e) => setRawPgInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleLoadStaff}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-w-[90px]"
                    >
                      THÊM NV
                    </button>

                    <button
                      onClick={handleLoadPg}
                      className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-w-[95px]"
                    >
                      THÊM PG
                    </button>

                    <button
                      onClick={() => handleSyncPgFromLich(false)}
                      disabled={isSyncingPg}
                      className={`flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-w-[95px] flex items-center justify-center gap-1 ${isSyncingPg ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title="Tự động lấy tên PG có ca làm trong ngày này từ Lịch PG (cũng tự chạy khi đổi ngày)"
                    >
                      <RefreshCw size={12} className={isSyncingPg ? 'animate-spin' : ''} />
                      {isSyncingPg ? 'ĐANG ĐỒNG BỘ...' : 'ĐỒNG BỘ LỊCH PG'}
                    </button>
                    
                    {/* Excel Upload trigger */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 min-w-[120px] shadow-sm shadow-emerald-200"
                    >
                      <Upload size={12} />
                      EXCEL PHÂN CA
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleExcelUpload}
                      accept=".xlsx, .xls"
                      className="hidden"
                    />

                    {staffList.length > 0 && (
                      <button
                        onClick={handleClearPlanner}
                        className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        XOÁ HẾT
                      </button>
                    )}
                  </div>
                </div>

                {/* Configurations */}
                <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-slate-800 tracking-wider mb-1">Chọn ngày chạy Roadshow</label>
                    <input
                      type="date"
                      value={plannerDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (newDate) {
                          setPlannerDate(newDate);
                          
                          // Instantly load shifts for the selected date from localStorage
                          const cachedShiftsStr = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${newDate}`);
                          const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShiftsStr ? JSON.parse(cachedShiftsStr) : {};
                          const cachedMaster = JSON.parse(localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`) || '[]');
                          const cachedPg = JSON.parse(localStorage.getItem(`crm_roadshow_planner_master_pg_${warehouseCode}`) || '[]');
                          
                          setStaffList([
                            ...cachedMaster.map((name: string) => ({
                              name: name.toUpperCase(),
                              shift: getShiftForStaff(name, dateShifts),
                              isPg: false
                            })),
                            ...cachedPg.map((name: string) => ({
                              name: name.toUpperCase(),
                              shift: getShiftForStaff(name, dateShifts),
                              isPg: true
                            }))
                          ]);

                          const cachedConfigsStr = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${newDate}`);
                          if (cachedConfigsStr) {
                            const configs = JSON.parse(cachedConfigsStr);
                            setMorningTime(configs.morningTime || '7:00');
                            setAfternoonTime(configs.afternoonTime || '15:00');
                            setMorningRoute(configs.morningRoute || '');
                            setAfternoonRoute(configs.afternoonRoute || '');
                          }
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {/* Copy schedule from another date */}
                  {recentDates.length > 0 && (
                    <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 space-y-2 mt-2">
                      <label className="block text-[9.5px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                        <Copy size={10} />
                        Sao chép từ ngày chạy cũ
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={copySourceDate}
                          onChange={(e) => setCopySourceDate(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="">-- Chọn ngày --</option>
                          {recentDates.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleCopyPlanFromDate}
                          disabled={!copySourceDate}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                            copySourceDate 
                              ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700" 
                              : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          )}
                        >
                          SAO CHÉP
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-black uppercase text-slate-800 tracking-wider mb-1">Giờ ca sáng</label>
                      <input
                        type="text"
                        value={morningTime}
                        onChange={(e) => {
                          setMorningTime(e.target.value);
                          handleSavePlannerConfigs('morningTime', e.target.value);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black uppercase text-slate-800 tracking-wider mb-1">Giờ ca chiều</label>
                      <input
                        type="text"
                        value={afternoonTime}
                        onChange={(e) => {
                          setAfternoonTime(e.target.value);
                          handleSavePlannerConfigs('afternoonTime', e.target.value);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff shift assignment */}
              {staffList.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-emerald-500/80 shadow-emerald-50/40">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-emerald-600" />
                    2. Check Ca Nhân Viên nhanh ({getFormattedDateLabel(plannerDate)})
                  </h3>
                  
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {/* SUBSECTION: SUPERMARKET STAFF */}
                    {staffList.some(s => !s.isPg) && (
                      <div className="space-y-2">
                        <h4 className="text-[10.5px] font-black text-emerald-950 uppercase tracking-wider mb-2 border-b border-emerald-100 pb-1">Nhân viên Siêu thị</h4>
                        <div className="space-y-2">
                          {staffList.map((staff, idx) => {
                            if (staff.isPg) return null;
                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border border-slate-100 rounded-xl bg-slate-55">
                                <div className="flex items-center gap-1.5 truncate">
                                  <button
                                    onClick={() => handleDeleteIndividualStaff(staff.name)}
                                    className="text-slate-350 hover:text-rose-500 transition-all p-1"
                                    title="Xoá nhân sự này"
                                  >
                                    <X size={12} />
                                  </button>
                                  <span className="text-xs font-black text-slate-900 truncate max-w-[120px]">{staff.name}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  {(['sang', 'chieu', 'dup', 'off'] as const).map((shiftType) => (
                                    <button
                                      key={shiftType}
                                      onClick={() => handleUpdateShift(idx, shiftType)}
                                      className={cn(
                                        "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                                        staff.shift === shiftType
                                          ? shiftType === 'sang' ? "bg-amber-400 text-slate-900 font-black shadow-xs" :
                                            shiftType === 'chieu' ? "bg-emerald-600 text-white font-black shadow-xs" :
                                            shiftType === 'dup' ? "bg-teal-600 text-white font-black shadow-xs animate-pulse" :
                                            "bg-rose-500 text-white font-black shadow-xs"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      )}
                                    >
                                      {shiftType === 'sang' ? 'SÁNG' : shiftType === 'chieu' ? 'CHIỀU' : shiftType === 'dup' ? 'ĐÚP' : 'OFF'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SUBSECTION: BRAND PG */}
                    {staffList.some(s => s.isPg) && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-2 border-b border-amber-200/80 pb-1">PG</h4>
                        <div className="space-y-2">
                          {staffList.map((staff, idx) => {
                            if (!staff.isPg) return null;
                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border border-amber-200/60 rounded-xl bg-amber-50/40">
                                <div className="flex items-center gap-1.5 truncate">
                                  <button
                                    onClick={() => handleDeleteIndividualStaff(staff.name)}
                                    className="text-amber-400 hover:text-rose-500 transition-all p-1"
                                    title="Xoá PG này"
                                  >
                                    <X size={12} />
                                  </button>
                                  <span className="text-xs font-black text-amber-950 truncate max-w-[100px]">{staff.name}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300 text-[8px] font-black tracking-wider uppercase ml-1">PG</span>
                                </div>
                                <div className="flex gap-1.5">
                                  {(['sang', 'chieu', 'dup', 'off'] as const).map((shiftType) => (
                                    <button
                                      key={shiftType}
                                      onClick={() => handleUpdateShift(idx, shiftType)}
                                      className={cn(
                                        "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                                        staff.shift === shiftType
                                          ? shiftType === 'sang' ? "bg-amber-400 text-slate-900 font-black shadow-xs" :
                                            shiftType === 'chieu' ? "bg-emerald-600 text-white font-black shadow-xs" :
                                            shiftType === 'dup' ? "bg-teal-600 text-white font-black shadow-xs animate-pulse" :
                                            "bg-rose-500 text-white font-black shadow-xs"
                                          : "bg-amber-50 text-amber-700/60 hover:bg-amber-100"
                                      )}
                                    >
                                      {shiftType === 'sang' ? 'SÁNG' : shiftType === 'chieu' ? 'CHIỀU' : shiftType === 'dup' ? 'FULL' : 'OFF'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Results table styled exactly as requested (Tone Vàng & Xanh Lá) */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-emerald-500/80 shadow-emerald-50/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Calendar size={18} className="text-emerald-600" />
                      3. Báo cáo Tuyến Chạy Roadshow
                    </h3>
                    <p className="text-slate-400 text-xs font-bold">Dữ liệu được lưu độc lập theo từng ngày. Đổi ngày chạy ở ô bên trái để lập lịch ngày khác.</p>
                  </div>
                  
                  <button
                    onClick={handleCaptureTable}
                    disabled={isCapturing || staffList.length === 0}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95",
                      isCapturing || staffList.length === 0
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200"
                    )}
                  >
                    <Camera size={15} />
                    {isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH LỊCH CHẠY'}
                  </button>
                </div>

                {staffList.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-xs font-black uppercase">Chưa có dữ liệu nhân sự để hiển thị</p>
                    <p className="text-slate-400/80 text-[11px] mt-1 font-bold">Vui lòng nạp danh sách nhân sự ở ô bên trái để tự động tạo bảng.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50/60 shadow-xs p-3 sm:p-5">
                  {/* Horizontal Scroll wrapper for responsive mobile viewing */}
                  <div className="overflow-x-auto w-full pb-2">
                    {/* Capturable unclipped table container */}
                    <div ref={tableRef} className="bg-white p-4 sm:p-6 font-sans inline-block min-w-[1050px]">
                      <table className="w-[1050px] border-collapse bg-white table-fixed border-2 border-black shadow-none">
                          <colgroup>
                            <col className="w-[70px]" />
                            <col className="w-[280px]" />
                            <col className="w-[230px]" />
                            <col className="w-[470px]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-[#fee879] h-[52px] border-b-2 border-black">
                              <th className="w-[70px] min-w-[70px] max-w-[70px] border-r border-black px-2 py-3 text-center text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626] box-border">STT</th>
                              <th className="w-[280px] min-w-[280px] max-w-[280px] border-r border-black px-3 sm:px-4 py-3 text-left text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626] box-border">NHÂN VIÊN</th>
                              <th className="w-[230px] min-w-[230px] max-w-[230px] border-r border-black px-3 py-3 text-center text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626] box-border">{getFormattedDateLabel(plannerDate)}</th>
                              <th className="w-[470px] min-w-[470px] max-w-[470px] px-3 sm:px-4 py-3 text-left text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626] box-border">TUYẾN ĐƯỜNG</th>
                            </tr>
                          </thead>
                          <tbody>
                            
                            {/* MORNING SHIFT SECTION */}
                            {morningStaff.length === 0 ? (
                              <tr className="border-b border-black">
                                <td className="w-[70px] min-w-[70px] max-w-[70px] border-r border-black px-2 py-4 text-center text-xs font-bold text-slate-400 box-border">-</td>
                                <td className="w-[280px] min-w-[280px] max-w-[280px] border-r border-black px-3 sm:px-4 py-4 text-left text-xs font-bold text-slate-400 italic box-border">Không có NV ca sáng</td>
                                <td className="w-[230px] min-w-[230px] max-w-[230px] border-r border-black px-3 py-4 text-center text-xs font-bold text-slate-400 italic box-border">{morningTime} {getFormattedDateLabel(plannerDate)}</td>
                                <td className="w-[470px] min-w-[470px] max-w-[470px] px-3 sm:px-4 py-4 text-left text-xs font-bold text-slate-400 italic box-border">Chưa sắp tuyến</td>
                              </tr>
                            ) : (
                              morningStaff.map((staff, sIdx) => (
                                <tr key={`morning-${sIdx}`} className="border-b border-black h-[48px]">
                                  <td className="w-[70px] min-w-[70px] max-w-[70px] border-r border-black px-2 py-2 text-center text-[15px] sm:text-[16px] font-utm-avo font-black text-black box-border">
                                    {sIdx + 1}
                                  </td>
                                  <td className="w-[280px] min-w-[280px] max-w-[280px] border-r border-black px-3 sm:px-4 py-2 text-left text-[15px] sm:text-[16px] font-utm-avo font-black text-black uppercase truncate box-border">
                                    {staff.name}{staff.isPg ? ' (PG)' : ''}
                                  </td>
                                  <td className="w-[230px] min-w-[230px] max-w-[230px] border-r border-black px-3 py-2 text-center text-[14px] sm:text-[15px] font-utm-avo font-black text-black box-border">
                                    {morningTime} {getFormattedDateLabel(plannerDate)}
                                  </td>
                                  {sIdx === 0 && (
                                    <td 
                                      rowSpan={morningStaff.length} 
                                      className="w-[470px] min-w-[470px] max-w-[470px] px-3 sm:px-4 py-2 text-left text-[14px] sm:text-[15px] font-utm-avo font-black text-black align-middle bg-white box-border"
                                    >
                                      <textarea
                                        data-route-type="morning"
                                        rows={Math.max(3, morningStaff.length)}
                                        value={morningRoute}
                                        onChange={(e) => {
                                          setMorningRoute(e.target.value);
                                          handleSavePlannerConfigs('morningRoute', e.target.value);
                                        }}
                                        className="w-full h-full border-0 bg-transparent resize-none focus:outline-none p-1 font-utm-avo font-black text-black leading-relaxed text-[14px] sm:text-[15px]"
                                        placeholder="Nhập tuyến đường ca sáng..."
                                      />
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}

                            {/* GREEN SEPARATOR ROW */}
                            <tr className="bg-[#86efac] h-7 sm:h-8 border-b border-black">
                              <td className="w-[70px] min-w-[70px] max-w-[70px] border-r border-black bg-[#86efac] box-border"></td>
                              <td className="w-[280px] min-w-[280px] max-w-[280px] border-r border-black bg-[#86efac] box-border"></td>
                              <td className="w-[230px] min-w-[230px] max-w-[230px] border-r border-black bg-[#86efac] box-border"></td>
                              <td className="w-[470px] min-w-[470px] max-w-[470px] bg-[#86efac] box-border"></td>
                            </tr>

                            {/* AFTERNOON SHIFT SECTION */}
                            {afternoonStaff.length === 0 ? (
                              <tr>
                                <td className="w-[70px] min-w-[70px] max-w-[70px] border-r border-black px-2 py-4 text-center text-xs font-bold text-slate-400 box-border">-</td>
                                <td className="w-[280px] min-w-[280px] max-w-[280px] border-r border-black px-3 sm:px-4 py-4 text-left text-xs font-bold text-slate-400 italic box-border">Không có NV ca chiều</td>
                                <td className="w-[230px] min-w-[230px] max-w-[230px] border-r border-black px-3 py-4 text-center text-xs font-bold text-slate-400 italic box-border">{afternoonTime} {getFormattedDateLabel(plannerDate)}</td>
                                <td className="w-[470px] min-w-[470px] max-w-[470px] px-3 sm:px-4 py-4 text-left text-xs font-bold text-slate-400 italic box-border">Chưa sắp tuyến</td>
                              </tr>
                            ) : (
                              afternoonStaff.map((staff, aIdx) => (
                                <tr key={`afternoon-${aIdx}`} className={cn(aIdx < afternoonStaff.length - 1 ? "border-b border-black" : "", "h-[48px]")}>
                                  <td className="w-[70px] min-w-[70px] max-w-[70px] border-r border-black px-2 py-2 text-center text-[15px] sm:text-[16px] font-utm-avo font-black text-black box-border">
                                    {aIdx + 1}
                                  </td>
                                  <td className="w-[280px] min-w-[280px] max-w-[280px] border-r border-black px-3 sm:px-4 py-2 text-left text-[15px] sm:text-[16px] font-utm-avo font-black text-black uppercase truncate box-border">
                                    {staff.name}{staff.isPg ? ' (PG)' : ''}
                                  </td>
                                  <td className="w-[230px] min-w-[230px] max-w-[230px] border-r border-black px-3 py-2 text-center text-[14px] sm:text-[15px] font-utm-avo font-black text-black box-border">
                                    {afternoonTime} {getFormattedDateLabel(plannerDate)}
                                  </td>
                                  {aIdx === 0 && (
                                    <td 
                                      rowSpan={afternoonStaff.length} 
                                      className="w-[470px] min-w-[470px] max-w-[470px] px-3 sm:px-4 py-2 text-left text-[14px] sm:text-[15px] font-utm-avo font-black text-black align-middle bg-white box-border"
                                    >
                                      <textarea
                                        data-route-type="afternoon"
                                        rows={Math.max(3, afternoonStaff.length)}
                                        value={afternoonRoute}
                                        onChange={(e) => {
                                          setAfternoonRoute(e.target.value);
                                          handleSavePlannerConfigs('afternoonRoute', e.target.value);
                                        }}
                                        className="w-full h-full border-0 bg-transparent resize-none focus:outline-none p-1 font-utm-avo font-black text-black leading-relaxed text-[14px] sm:text-[15px]"
                                        placeholder="Nhập tuyến đường ca chiều..."
                                      />
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}

                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER STATS TAB (TONE XANH LÁ & VÀNG) */}
      {activeTab === 'STATS' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-emerald-500/80 shadow-emerald-50/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-600" />
                Thống Kê Tần Suất Tham Gia Roadshow ({plannerDate.substring(5, 7)}/{plannerDate.substring(0, 4)})
              </h3>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">
                Nhân sự được sắp xếp ưu tiên từ ít chạy nhất (trên cùng) đến nhiều nhất để phân bổ lịch chạy đồng đều.
              </p>
            </div>
            
            <button
              onClick={handleCopyStatsText}
              disabled={monthlyStats.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
            >
              <Copy size={14} />
              SAO CHÉP THỐNG KÊ
            </button>
          </div>

          {monthlyStats.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-black uppercase">Chưa có dữ liệu thống kê tháng này</p>
              <p className="text-slate-400/80 text-[11px] mt-1 font-bold">Lập lịch phân ca các ngày trong tháng để hệ thống tự động tổng hợp tần suất.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50/60 shadow-xs p-3 sm:p-5">
              <div className="bg-white p-4 sm:p-6 font-sans">
                <div className="rounded-2xl border-2 border-black overflow-hidden bg-white shadow-none">
                  <table className="w-full border-collapse bg-white table-fixed">
                    <colgroup>
                      <col className="w-[60px] sm:w-[75px]" />
                      <col className="w-[240px] sm:w-[320px]" />
                      <col className="w-[140px] sm:w-[160px]" />
                      <col className="w-[140px] sm:w-[160px]" />
                      <col className="w-[160px] sm:w-[180px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#fee879] h-[52px] border-b border-black">
                        <th className="border-r border-black px-2 py-3 text-center text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626]">STT</th>
                        <th className="border-r border-black px-3 sm:px-4 py-3 text-left text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626]">NHÂN VIÊN</th>
                        <th className="border-r border-black px-3 py-3 text-center text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626]">SỐ LẦN CHẠY</th>
                        <th className="border-r border-black px-3 py-3 text-center text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626]">SỐ LẦN OFF</th>
                        <th className="px-3 py-3 text-center text-[15px] sm:text-[16px] font-utm-avo font-black uppercase text-[#dc2626]">TỶ LỆ CHẠY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyStats.map((stat, idx) => (
                        <tr 
                          key={stat.name} 
                          className={cn(
                            idx < monthlyStats.length - 1 ? "border-b border-black" : "",
                            "h-[48px]",
                            stat.runCount === 0 ? "bg-rose-50/40" : ""
                          )}
                        >
                          <td className="border-r border-black px-2 py-1.5 text-center text-[15px] sm:text-[16px] font-utm-avo font-black text-black">
                            {idx + 1}
                          </td>
                          <td className="border-r border-black px-3 sm:px-4 py-1.5 text-left text-[15px] sm:text-[16px] font-utm-avo font-black text-black uppercase truncate">
                            <div className="flex items-center gap-2">
                              <span>{stat.name}</span>
                              {stat.runCount === 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-wider animate-pulse border border-rose-200">OFF</span>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-black px-3 py-1.5 text-center text-[15px] sm:text-[16px] font-utm-avo font-black text-emerald-700">
                            {stat.runCount}
                          </td>
                          <td className="border-r border-black px-3 py-1.5 text-center text-[15px] sm:text-[16px] font-utm-avo font-black text-slate-700">
                            {stat.offCount}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 sm:w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    stat.rate > 60 ? "bg-emerald-600" : stat.rate > 30 ? "bg-amber-400" : "bg-rose-500"
                                  )} 
                                  style={{ width: `${stat.rate}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-slate-700">{stat.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />

    </div>
  );
};

