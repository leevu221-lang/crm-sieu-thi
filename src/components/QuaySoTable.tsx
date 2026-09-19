import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { normalizeStoreId } from '../pages/RTST/utils';
import { format, addDays, eachDayOfInterval, parseISO, differenceInCalendarDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Loader2, Save, RefreshCw, Users, Dice5, Camera, RotateCcw,
  X, Check, Sparkles, Shuffle
} from 'lucide-react';

// Ngày mốc cố định để tính chẵn/lẻ ngày một cách ổn định, không phụ thuộc
// vào ngày bắt đầu của khoảng thời gian người dùng chọn xem.
const PARITY_EPOCH = new Date(2020, 0, 1);

function getDayParity(date: Date) {
  const diff = differenceInCalendarDays(date, PARITY_EPOCH);
  return ((diff % 2) + 2) % 2; // luôn trả về 0 hoặc 1
}

type Gender = 'nam' | 'nu';
type Employee = { username: string; fullId: string; department: string; group: 1 | 2; gender?: Gender };
type ScheduleMap = Record<string, { hc: string[] }>;
type OffMap = Record<string, Record<string, boolean>>;

// Vị trí & màu pháo giấy cố định (không random) để hiệu ứng ổn định giữa các lần render.
const CONFETTI_PIECES = [
  { dx: -60, dy: -50, rot: -40, color: '#fbcfe8', delay: 0 },
  { dx: 55, dy: -55, rot: 35, color: '#ddd6fe', delay: 0.04 },
  { dx: -75, dy: 10, rot: -80, color: '#bae6fd', delay: 0.08 },
  { dx: 70, dy: 0, rot: 60, color: '#fde68a', delay: 0.02 },
  { dx: -35, dy: -75, rot: 10, color: '#bbf7d0', delay: 0.1 },
  { dx: 40, dy: -70, rot: -20, color: '#fbcfe8', delay: 0.06 },
  { dx: -55, dy: 45, rot: 50, color: '#ddd6fe', delay: 0.12 },
  { dx: 60, dy: 40, rot: -55, color: '#bae6fd', delay: 0.03 },
  { dx: -20, dy: -85, rot: 75, color: '#fde68a', delay: 0.09 },
  { dx: 20, dy: 80, rot: -35, color: '#bbf7d0', delay: 0.05 },
  { dx: -85, dy: -20, rot: 25, color: '#fbcfe8', delay: 0.11 },
  { dx: 85, dy: -20, rot: -65, color: '#ddd6fe', delay: 0.01 },
];

// Bảng màu pastel lặp lại cho từng lát của vòng quay.
const WHEEL_PALETTE = ['#ddd6fe', '#bae6fd', '#fbcfe8', '#fde68a', '#bbf7d0', '#fecdd3'];
const WHEEL_LABEL_COLOR = '#4c1d95';
const WHEEL_SIZE = 256;
const WHEEL_LABEL_RADIUS = 100;
const WHEEL_SPIN_MS = 3200;
const WHEEL_LAND_PAUSE_MS = 950;

function normalizeGender(raw?: string): Gender | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'nam' || v === 'm' || v === 'male' || v === 'nam giới') return 'nam';
  if (v === 'nữ' || v === 'nu' || v === 'f' || v === 'female' || v === 'nữ giới') return 'nu';
  return undefined;
}

export default function QuaySoTable() {
  const { userProfile } = useAuth();
  const { currentStoreId } = useStore();
  const targetStore = currentStoreId || userProfile?.ma_kho || '';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [offMap, setOffMap] = useState<OffMap>({});
  const [rawStaffInput, setRawStaffInput] = useState('');
  const [showStaffInput, setShowStaffInput] = useState(false);

  const [dateFrom, setDateFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [ratio, setRatio] = useState(50);
  const [resultsPerDay, setResultsPerDay] = useState(2);
  const [genderFilter, setGenderFilter] = useState<'all' | Gender>('all');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [lastSaved, setLastSaved] = useState<string | null>(() => localStorage.getItem('QUAY_SO_LAST_SAVED'));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [bulkSpinning, setBulkSpinning] = useState(false);

  const [spinState, setSpinState] = useState<{
    open: boolean;
    dateStr: string | null;
    poolNames: string[];
    winners: string[];
    targetCount: number;
    rotation: number;
    spinning: boolean;
    justLanded: boolean;
  }>({ open: false, dateStr: null, poolNames: [], winners: [], targetCount: 0, rotation: 0, spinning: false, justLanded: false });

  const spinSessionRef = useRef<{ poolNames: string[]; winners: string[]; targetCount: number; dateStr: string | null }>({
    poolNames: [], winners: [], targetCount: 0, dateStr: null
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      if (landTimerRef.current) clearTimeout(landTimerRef.current);
    };
  }, []);

  const dateRange = useMemo(() => {
    try {
      const start = parseISO(dateFrom);
      const end = parseISO(dateTo);
      if (end < start) return [start];
      const days = eachDayOfInterval({ start, end });
      return days.slice(0, 62); // giới hạn an toàn để tránh bảng quá khổ
    } catch {
      return [];
    }
  }, [dateFrom, dateTo]);

  const flashMessage = (type: string, text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
  };

  const parseStaffListText = (text: string): { username: string; fullId: string; department: string; gender?: Gender }[] => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        return {
          username: parts[1] || parts[0] || 'N/A',
          fullId: parts[2] || '',
          department: parts[0] || 'BP All In One - ĐMX',
          gender: normalizeGender(parts[3])
        };
      }
      return { username: line.trim(), fullId: '', department: 'BP All In One - ĐMX', gender: undefined };
    });
  };

  const fetchData = async () => {
    if (!targetStore) return;
    setLoading(true);
    try {
      const storeId = normalizeStoreId(targetStore.trim());
      const docRef = doc(db, 'quay_so_ca_hanh_chinh', 'schedule_' + storeId);
      const docSnap = await getDoc(docRef);

      let staffText = '';
      let groups: Record<string, number> = {};
      let genders: Record<string, string> = {};
      let sch: ScheduleMap = {};
      let off: OffMap = {};

      if (docSnap.exists()) {
        const d = docSnap.data() || {};
        staffText = d.ds_nhan_vien || '';
        groups = d.groups || {};
        genders = d.genders || {};
        sch = d.schedules || {};
        off = d.offMap || {};
      } else {
        const local = localStorage.getItem(`QUAY_SO_DATA_${targetStore}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            staffText = parsed.ds_nhan_vien || '';
            groups = parsed.groups || {};
            genders = parsed.genders || {};
            sch = parsed.schedules || {};
            off = parsed.offMap || {};
          } catch (e) {
            console.error('Error parsing local quay so data:', e);
          }
        }
      }

      if (!staffText) {
        const { data: lkData } = await supabase.from('store').select('ds_nhan_vien').eq('id', storeId).maybeSingle();
        if (lkData?.ds_nhan_vien) staffText = lkData.ds_nhan_vien;
      }

      setRawStaffInput(staffText);
      const parsedStaff = parseStaffListText(staffText);
      const withGroups: Employee[] = parsedStaff.map((emp, idx) => ({
        ...emp,
        group: (groups[emp.username] === 1 || groups[emp.username] === 2 ? groups[emp.username] : (idx % 2 === 0 ? 1 : 2)) as 1 | 2,
        gender: normalizeGender(genders[emp.username]) || emp.gender
      }));
      setEmployees(withGroups);
      setSchedule(sch);
      setOffMap(off);
      flashMessage('success', staffText ? 'Đã tải dữ liệu!' : 'Chưa có danh sách nhân viên.');
    } catch (err) {
      console.error('Error fetching quay so data:', err);
      flashMessage('error', 'Lỗi hệ thống khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [targetStore]);

  const persist = async (overrides: Partial<{ ds_nhan_vien: string; groups: Record<string, number>; genders: Record<string, string>; schedules: ScheduleMap; offMap: OffMap }> = {}) => {
    if (!targetStore) return;
    try {
      const storeId = normalizeStoreId(targetStore.trim());
      const docRef = doc(db, 'quay_so_ca_hanh_chinh', 'schedule_' + storeId);
      const payload = {
        warehouse_code: targetStore,
        ds_nhan_vien: overrides.ds_nhan_vien ?? rawStaffInput,
        groups: overrides.groups ?? Object.fromEntries(employees.map(e => [e.username, e.group])),
        genders: overrides.genders ?? Object.fromEntries(employees.filter(e => e.gender).map(e => [e.username, e.gender])),
        schedules: overrides.schedules ?? schedule,
        offMap: overrides.offMap ?? offMap,
        updated_at: new Date().toISOString(),
        updated_by: userProfile?.username || 'unknown'
      };
      await setDoc(docRef, payload, { merge: true });
      localStorage.setItem(`QUAY_SO_DATA_${targetStore}`, JSON.stringify(payload));
      const now = new Date().toISOString();
      setLastSaved(now);
      localStorage.setItem('QUAY_SO_LAST_SAVED', now);
    } catch (err) {
      console.error('Error saving quay so data:', err);
      flashMessage('error', 'Lỗi khi lưu Firebase!');
    }
  };

  const handleApplyStaffInput = () => {
    if (!rawStaffInput.trim()) {
      flashMessage('error', 'Vui lòng nhập danh sách nhân viên!');
      return;
    }
    const parsed = parseStaffListText(rawStaffInput);
    setEmployees(prev => {
      const updated: Employee[] = parsed.map((ns, idx) => {
        const existing = prev.find(e => e.username === ns.username);
        return {
          ...ns,
          group: (existing?.group || (idx % 2 === 0 ? 1 : 2)) as 1 | 2,
          gender: ns.gender || existing?.gender
        };
      });
      persist({
        ds_nhan_vien: rawStaffInput,
        groups: Object.fromEntries(updated.map(e => [e.username, e.group])),
        genders: Object.fromEntries(updated.filter(e => e.gender).map(e => [e.username, e.gender as string]))
      });
      return updated;
    });
    flashMessage('success', 'Đã cập nhật danh sách nhân viên!');
  };

  const handleUpload = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const newEmployees: Employee[] = jsonData.slice(1).map((row, idx) => {
      if (!row[1]) return null;
      return {
        username: String(row[1]).trim(),
        fullId: String(row[2] || '').trim(),
        department: String(row[0] || 'BP All In One - ĐMX').trim(),
        group: (idx % 2 === 0 ? 1 : 2) as 1 | 2,
        gender: normalizeGender(String(row[3] || ''))
      };
    }).filter(Boolean) as Employee[];

    setEmployees(newEmployees);
    const rawText = newEmployees.map(e => `${e.department}\t${e.username}\t${e.fullId}\t${e.gender === 'nam' ? 'Nam' : e.gender === 'nu' ? 'Nữ' : ''}`).join('\n');
    setRawStaffInput(rawText);
    persist({
      ds_nhan_vien: rawText,
      groups: Object.fromEntries(newEmployees.map(e => [e.username, e.group])),
      genders: Object.fromEntries(newEmployees.filter(e => e.gender).map(e => [e.username, e.gender as string]))
    });
    flashMessage('success', 'Đã nhập danh sách từ Excel!');
  };

  const handleAssignRatio = () => {
    setEmployees(prev => {
      if (prev.length === 0) return prev;
      const shuffledOrder = [...prev].sort(() => Math.random() - 0.5).map(e => e.username);
      const g1Count = Math.round((ratio / 100) * prev.length);
      const g1Set = new Set(shuffledOrder.slice(0, g1Count));
      const updated = prev.map(emp => ({ ...emp, group: (g1Set.has(emp.username) ? 1 : 2) as 1 | 2 }));
      persist({ groups: Object.fromEntries(updated.map(e => [e.username, e.group])) });
      return updated;
    });
    flashMessage('success', `Đã chia nhóm theo tỷ lệ ${ratio}:${100 - ratio}!`);
  };

  const handleToggleGroup = (username: string) => {
    setEmployees(prev => {
      const updated = prev.map(e => e.username === username ? { ...e, group: (e.group === 1 ? 2 : 1) as 1 | 2 } : e);
      persist({ groups: Object.fromEntries(updated.map(e => [e.username, e.group])) });
      return updated;
    });
  };

  const handleToggleGender = (username: string) => {
    setEmployees(prev => {
      const updated = prev.map(e => {
        if (e.username !== username) return e;
        const next: Gender | undefined = e.gender === undefined ? 'nam' : e.gender === 'nam' ? 'nu' : undefined;
        return { ...e, gender: next };
      });
      persist({ genders: Object.fromEntries(updated.filter(e => e.gender).map(e => [e.username, e.gender as string])) });
      return updated;
    });
  };

  const handleToggleOff = (username: string, dateStr: string) => {
    setOffMap(prev => {
      const dayMap = { ...(prev[dateStr] || {}) };
      dayMap[username] = !dayMap[username];
      const updated = { ...prev, [dateStr]: dayMap };
      persist({ offMap: updated });
      return updated;
    });
  };

  const getStatus = (emp: Employee, date: Date): 'OFF' | 'HC' | 'Sáng' | 'Chiều' => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (offMap[dateStr]?.[emp.username]) return 'OFF';
    if (schedule[dateStr]?.hc?.includes(emp.username)) return 'HC';
    const parity = getDayParity(date);
    const isGroup1 = emp.group === 1;
    if (isGroup1) return parity === 0 ? 'Sáng' : 'Chiều';
    return parity === 0 ? 'Chiều' : 'Sáng';
  };

  const hcCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.username] = 0; });
    Object.values(schedule).forEach(day => {
      (day?.hc || []).forEach(u => { counts[u] = (counts[u] || 0) + 1; });
    });
    return counts;
  }, [schedule, employees]);

  // Rút N người không lặp lại, ưu tiên (trọng số) người ít bị rút trúng ca hành chính hơn.
  const weightedPickN = (pool: { username: string }[], counts: Record<string, number>, n: number): string[] => {
    const items = pool.map(e => ({ username: e.username, weight: 1 / Math.pow((counts[e.username] || 0) + 1, 2) }));
    const result: string[] = [];
    const take = Math.min(n, items.length);
    for (let k = 0; k < take; k++) {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = Math.random() * total;
      let pickedIdx = items.length - 1;
      for (let i = 0; i < items.length; i++) {
        r -= items[i].weight;
        if (r <= 0) { pickedIdx = i; break; }
      }
      result.push(items.splice(pickedIdx, 1)[0].username);
    }
    return result;
  };

  const getEligibleForDay = (dateStr: string): Employee[] => {
    return employees.filter(e =>
      !offMap[dateStr]?.[e.username] &&
      (genderFilter === 'all' || e.gender === genderFilter)
    );
  };

  // Quay 1 lát của vòng quay (rút 1 người từ poolNames hiện tại của phiên quay), rồi tự nối tiếp
  // cho đến khi đủ targetCount kết quả.
  const spinNextSegment = () => {
    const session = spinSessionRef.current;
    if (session.poolNames.length === 0 || session.winners.length >= session.targetCount) return;

    const winnerName = weightedPickN(session.poolNames.map(n => ({ username: n })), hcCounts, 1)[0];
    const anglePerSeg = 360 / session.poolNames.length;
    const idx = session.poolNames.indexOf(winnerName);
    const segCenter = idx * anglePerSeg + anglePerSeg / 2;
    const extraSpins = 5;

    setSpinState(s => {
      const baseline = Math.ceil(s.rotation / 360) * 360;
      const targetRotation = baseline + extraSpins * 360 + (360 - segCenter);
      return { ...s, poolNames: session.poolNames, spinning: true, rotation: targetRotation, justLanded: false };
    });

    spinTimerRef.current = setTimeout(() => {
      session.winners = [...session.winners, winnerName];
      setSpinState(s => ({ ...s, spinning: false, justLanded: true, winners: session.winners }));

      landTimerRef.current = setTimeout(() => {
        session.poolNames = session.poolNames.filter(n => n !== winnerName);
        setSpinState(s => ({ ...s, poolNames: session.poolNames, justLanded: false }));
        if (session.winners.length < session.targetCount && session.poolNames.length > 0) {
          spinNextSegment();
        }
      }, WHEEL_LAND_PAUSE_MS);
    }, WHEEL_SPIN_MS);
  };

  const startSpin = (dateStr: string) => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    if (landTimerRef.current) clearTimeout(landTimerRef.current);
    const eligible = getEligibleForDay(dateStr);
    if (eligible.length < 1) {
      flashMessage('error', 'Không đủ nhân viên phù hợp bộ lọc để quay số ngày này!');
      return;
    }
    const targetCount = Math.min(resultsPerDay, eligible.length);
    const poolNames = eligible.map(e => e.username);
    spinSessionRef.current = { poolNames, winners: [], targetCount, dateStr };
    setSpinState({ open: true, dateStr, poolNames, winners: [], targetCount, rotation: 0, spinning: false, justLanded: false });
    spinNextSegment();
  };

  const confirmSpin = () => {
    if (!spinState.dateStr) return;
    const updated = { ...schedule, [spinState.dateStr]: { hc: spinState.winners } };
    setSchedule(updated);
    persist({ schedules: updated });
    setSpinState({ open: false, dateStr: null, poolNames: [], winners: [], targetCount: 0, rotation: 0, spinning: false, justLanded: false });
  };

  const closeSpinModal = () => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    if (landTimerRef.current) clearTimeout(landTimerRef.current);
    setSpinState({ open: false, dateStr: null, poolNames: [], winners: [], targetCount: 0, rotation: 0, spinning: false, justLanded: false });
  };

  const respin = () => {
    if (spinState.dateStr) startSpin(spinState.dateStr);
  };

  const handleSpinAllDays = () => {
    const genderPool = employees.filter(e => genderFilter === 'all' || e.gender === genderFilter);
    if (genderPool.length < 1) {
      flashMessage('error', 'Không có nhân viên phù hợp bộ lọc giới tính để quay số!');
      return;
    }
    setBulkSpinning(true);
    setTimeout(() => {
      const updated: ScheduleMap = { ...schedule };
      const workingCounts: Record<string, number> = { ...hcCounts };
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const eligible = genderPool.filter(e => !offMap[dateStr]?.[e.username]);
        if (eligible.length < 1) return;
        const winners = weightedPickN(eligible, workingCounts, resultsPerDay);
        updated[dateStr] = { hc: winners };
        winners.forEach(w => { workingCounts[w] = (workingCounts[w] || 0) + 1; });
      });
      setSchedule(updated);
      persist({ schedules: updated });
      setBulkSpinning(false);
      flashMessage('success', `Đã quay số cho ${dateRange.length} ngày!`);
    }, 900);
  };

  const handleResetSchedule = () => {
    setSchedule({});
    setOffMap({});
    persist({ schedules: {}, offMap: {} });
    setShowResetConfirm(false);
    flashMessage('success', 'Đã làm mới toàn bộ lịch quay số!');
  };

  const groupedEmployees = useMemo(() => {
    const groups: [1 | 2, Employee[]][] = [
      [1, employees.filter(e => e.group === 1)],
      [2, employees.filter(e => e.group === 2)],
    ];
    return groups.filter(([, emps]) => emps.length > 0);
  }, [employees]);

  const dailySummary = useMemo(() => {
    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      let hc = 0, sang = 0, chieu = 0, off = 0;
      employees.forEach(emp => {
        const st = getStatus(emp, date);
        if (st === 'HC') hc++;
        else if (st === 'Sáng') sang++;
        else if (st === 'Chiều') chieu++;
        else off++;
      });
      return { dateStr, hc, sang, chieu, off };
    });
  }, [dateRange, employees, schedule, offMap]);

  const captureTableHelper = async (element: HTMLElement, fileName: string) => {
    const targetWidth = Math.max(1200, element.scrollWidth + 48);
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${targetWidth}px`;
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-capture, button, textarea, input').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    clone.style.width = `${targetWidth}px`;
    clone.style.minWidth = `${targetWidth}px`;
    clone.style.margin = '0';
    clone.style.padding = '24px';
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'inline-block';
    clone.style.boxSizing = 'border-box';
    clone.style.borderRadius = '24px';

    clone.querySelectorAll('[class*="overflow"]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = '100%';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
    });

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      await ensureFontsReady();
      await new Promise(resolve => setTimeout(resolve, 200));
      const finalHeight = clone.offsetHeight || clone.scrollHeight;
      const dataUrl = await htmlToImage.toPng(clone, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: false,
        width: targetWidth,
        height: finalHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${targetWidth}px`,
          height: `${finalHeight}px`,
          ...EXPORT_FONT_STYLE,
        }
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
      flashMessage('success', `Đã xuất ảnh ${fileName}!`);
    } catch (err) {
      console.error('Lỗi khi chụp ảnh:', err);
      flashMessage('error', 'Không thể chụp ảnh.');
    } finally {
      if (document.body.contains(tempContainer)) document.body.removeChild(tempContainer);
    }
  };

  const handleExportImage = async () => {
    if (!tableRef.current) return;
    await captureTableHelper(tableRef.current, 'QUAY_SO_CA_HANH_CHINH.png');
  };

  const STATUS_STYLE: Record<string, string> = {
    HC: 'bg-amber-100 text-amber-700 border-amber-200',
    'Sáng': 'bg-sky-100 text-sky-600 border-sky-200',
    'Chiều': 'bg-violet-100 text-violet-600 border-violet-200',
    OFF: 'bg-rose-50 text-rose-300 border-rose-100'
  };

  const GENDER_STYLE: Record<string, string> = {
    nam: 'bg-sky-100 text-sky-600',
    nu: 'bg-rose-100 text-rose-500',
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-violet-50 via-fuchsia-50/40 to-sky-50 quay-so-container">
      <style>{`
        @keyframes qsPopIn { 0% { transform: scale(0.85); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes qsDiceSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes qsConfetti { 0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)); opacity: 0; } }
        .qs-confetti-piece {
          position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; border-radius: 2px;
          animation: qsConfetti 0.9s ease-out forwards; pointer-events: none;
        }
        .qs-pop-in { animation: qsPopIn 0.4s ease-out; }
        .qs-dice-spin { animation: qsDiceSpin 0.6s linear infinite; }
      `}</style>

      {/* Header Bar */}
      <div className="bg-white/90 backdrop-blur-sm text-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-violet-100 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-black uppercase tracking-wider leading-tight bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent whitespace-nowrap">QUAY SỐ CA HÀNH CHÍNH</h1>

          <div className="flex items-center bg-white rounded-2xl px-3 py-1.5 gap-2 border border-violet-100 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-violet-300 leading-none">Từ ngày</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs font-bold bg-transparent border-none outline-none text-violet-700" />
            </div>
            <span className="text-violet-200">→</span>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-violet-300 leading-none">Đến ngày</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs font-bold bg-transparent border-none outline-none text-violet-700" />
            </div>
          </div>

          <div className="flex items-center bg-white rounded-2xl px-3 py-1.5 gap-2 border border-violet-100 shadow-sm">
            <span className="text-[9px] font-black uppercase text-violet-300">Tỷ lệ Nhóm 1</span>
            <input
              type="number" min={0} max={100} value={ratio}
              onChange={e => setRatio(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-12 text-xs font-black text-center bg-violet-50 border border-violet-100 rounded-lg outline-none focus:ring-1 focus:ring-violet-300 text-violet-700"
            />
            <span className="text-[10px] font-bold text-violet-400">% : {100 - ratio}%</span>
            <button
              onClick={handleAssignRatio}
              className="flex items-center gap-1 bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-200 text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-colors"
            >
              <Shuffle size={12} /> Chia nhóm
            </button>
          </div>

          <div className="flex items-center bg-white rounded-2xl px-3 py-1.5 gap-2 border border-violet-100 shadow-sm">
            <span className="text-[9px] font-black uppercase text-violet-300">Số người HC/ngày</span>
            <input
              type="number" min={1} max={20} value={resultsPerDay}
              onChange={e => setResultsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 text-xs font-black text-center bg-violet-50 border border-violet-100 rounded-lg outline-none focus:ring-1 focus:ring-violet-300 text-violet-700"
            />
          </div>

          <div className="flex items-center bg-white rounded-2xl px-1.5 py-1.5 gap-1 border border-violet-100 shadow-sm">
            <span className="text-[9px] font-black uppercase text-violet-300 pl-1.5">Quay trong</span>
            {(['all', 'nam', 'nu'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-colors ${
                  genderFilter === g
                    ? (g === 'nam' ? 'bg-sky-200 text-sky-700' : g === 'nu' ? 'bg-rose-200 text-rose-600' : 'bg-violet-200 text-violet-700')
                    : 'text-violet-300 hover:bg-violet-50'
                }`}
              >
                {g === 'all' ? 'Cả hai' : g === 'nam' ? 'Nam' : 'Nữ'}
              </button>
            ))}
          </div>

          {saveMessage.text && (
            <div className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl flex items-center min-h-[40px] shadow-sm border max-w-[220px] leading-tight ${saveMessage.type === 'success' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-600 border-rose-200'}`}>
              {saveMessage.text}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleSpinAllDays}
            className="bg-pink-100 hover:bg-pink-200 text-pink-600 border border-pink-200 px-3 py-2 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] w-[130px] leading-tight"
          >
            <Dice5 size={16} className={bulkSpinning ? 'qs-dice-spin' : ''} /> Quay tất cả
          </button>

          <button
            onClick={handleExportImage}
            className="bg-purple-100 hover:bg-purple-200 text-purple-600 border border-purple-200 px-2 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] w-[100px] leading-tight"
          >
            <Camera size={14} /> Chụp ảnh
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-rose-100 hover:bg-rose-200 text-rose-600 border border-rose-200 px-2 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] w-[100px] leading-tight"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            onClick={() => setShowStaffInput(!showStaffInput)}
            className={`px-2 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] w-[110px] leading-tight border ${showStaffInput ? 'bg-blue-200 text-blue-700 border-blue-300' : 'bg-blue-100 hover:bg-blue-200 text-blue-600 border-blue-200'}`}
          >
            <Users size={14} /> DS nhân viên
          </button>

          <label className="cursor-pointer bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border border-cyan-200 px-2 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] w-[100px] leading-tight">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Nhập Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => persist()}
              disabled={isSaving}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-[12px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-sm min-h-[44px] min-w-[130px] leading-tight disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu Firebase
            </button>
            {lastSaved && (
              <span className="text-[9px] text-violet-300 italic text-center">
                Lưu lần cuối: {new Date(lastSaved).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        </div>
      </div>

      {showStaffInput && (
        <div className="bg-white/90 p-4 border-b border-violet-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-violet-700 uppercase tracking-wider">Danh sách nhân viên (Phòng ban - Tên - Mã - Giới tính, mỗi dòng 1 người hoặc dán từ Excel)</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleApplyStaffInput} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all">
                Cập nhật & Lưu
              </button>
              <button onClick={() => setShowStaffInput(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 text-xs font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all">
                Đóng
              </button>
            </div>
          </div>
          <textarea
            value={rawStaffInput}
            onChange={e => setRawStaffInput(e.target.value)}
            className="w-full h-32 p-3 border border-violet-100 rounded-xl text-xs font-mono focus:border-violet-300 focus:ring-1 focus:ring-violet-300 outline-none transition-all bg-violet-50/40 text-slate-700"
            placeholder={'BP All In One - ĐMX\tLộc_49641\t99153\tNam\nBP All In One - ĐMX\tKhiết_30660\t99155\tNữ\n\nHoặc chỉ cần nhập tên mỗi dòng (không cần giới tính):\nLộc_49641\nKhiết_30660'}
          />
          <p className="text-[10px] text-violet-300 italic">
            Cột thứ 4 (tuỳ chọn) là giới tính: Nam / Nữ. Không nhập vẫn dùng bình thường — chỉ không lọc theo giới tính được.
            Sau khi nhập, dùng nút ♂/♀ cạnh tên trong bảng bên dưới để đổi giới tính từng người.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white/70 border-b border-violet-100 text-[10px] font-bold uppercase flex-wrap">
        <span className={`px-2 py-1 rounded-lg border ${STATUS_STYLE.HC}`}>HC = Hành chính (quay số)</span>
        <span className={`px-2 py-1 rounded-lg border ${STATUS_STYLE['Sáng']}`}>Sáng</span>
        <span className={`px-2 py-1 rounded-lg border ${STATUS_STYLE['Chiều']}`}>Chiều</span>
        <span className={`px-2 py-1 rounded-lg border ${STATUS_STYLE.OFF}`}>OFF</span>
        <span className="text-violet-300 normal-case font-medium italic">Nhóm 1/2 tự đảo Sáng ↔ Chiều mỗi ngày. Bấm 🎲 trên từng ngày để quay số {resultsPerDay} người trực hành chính.</span>
      </div>

      {/* Bulk spin banner */}
      {bulkSpinning && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-pink-50 border-b border-pink-100 text-pink-600 text-xs font-black uppercase">
          <Dice5 size={16} className="qs-dice-spin" /> Đang quay số cho {dateRange.length} ngày...
        </div>
      )}

      {/* Main Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-violet-100 overflow-hidden min-w-max" ref={tableRef}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gradient-to-b from-violet-50 to-fuchsia-50/60 border-b border-violet-100">
                <th className="sticky left-0 z-40 bg-violet-50 border-r border-violet-100 px-4 py-2 text-left w-56 min-w-[224px]">
                  <span className="font-black text-violet-600 uppercase text-xs">Nhân viên</span>
                </th>
                {dateRange.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return (
                    <th key={i} className={`border-r border-violet-100 px-2 py-1.5 text-center min-w-[92px] ${isWeekend ? 'text-rose-400 bg-rose-50/50' : 'text-violet-600'}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-black uppercase tracking-tighter">{format(date, 'EEEE', { locale: vi })}</span>
                        <span className="font-bold text-[10px]">{format(date, 'dd/MM')}</span>
                        <button
                          onClick={() => startSpin(dateStr)}
                          title="Quay số ca hành chính"
                          className="mt-0.5 flex items-center gap-1 bg-pink-100 hover:bg-pink-200 text-pink-600 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-lg transition-colors"
                        >
                          <Dice5 size={11} /> Quay số
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
              {/* Summary row */}
              <tr className="bg-white/60 border-b-2 border-violet-100">
                <td className="sticky left-0 z-30 bg-white/90 border-r border-violet-100 px-4 py-1.5 font-bold text-violet-300 uppercase text-[10px]">
                  Tổng hợp
                </td>
                {dailySummary.map((s, i) => (
                  <td key={i} className="border-r border-violet-100 text-center text-[9px] font-bold text-violet-300 px-1 py-1">
                    <div>HC:{s.hc} S:{s.sang}</div>
                    <div>C:{s.chieu} OFF:{s.off}</div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedEmployees.map(([groupNo, groupEmps]) => (
                <React.Fragment key={groupNo}>
                  <tr className={groupNo === 1 ? 'bg-sky-50/70' : 'bg-pink-50/70'}>
                    <td colSpan={1 + dateRange.length} className={`sticky left-0 z-20 px-4 py-2 font-black uppercase border-b border-violet-100 ${groupNo === 1 ? 'bg-sky-50/90 text-sky-600' : 'bg-pink-50/90 text-pink-600'}`}>
                      Nhóm {groupNo} <span className="font-medium normal-case text-[10px] opacity-70">({groupEmps.length} người)</span>
                    </td>
                  </tr>
                  {groupEmps.map(emp => (
                    <tr key={emp.username} className="border-b border-violet-50 hover:bg-violet-50/50 transition-colors group">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-violet-50/50 border-r border-violet-100 px-4 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleGender(emp.username)}
                              title="Bấm để đổi giới tính"
                              className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-black flex items-center justify-center transition-colors ${emp.gender ? GENDER_STYLE[emp.gender] : 'bg-slate-100 text-slate-300'}`}
                            >
                              {emp.gender === 'nam' ? '♂' : emp.gender === 'nu' ? '♀' : '?'}
                            </button>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{emp.username}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{emp.fullId}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleGroup(emp.username)}
                            title="Bấm để đổi nhóm"
                            className={`text-[9px] font-black uppercase rounded-lg px-1.5 py-0.5 transition-colors shrink-0 ${emp.group === 1 ? 'bg-sky-100 text-sky-600' : 'bg-pink-100 text-pink-600'}`}
                          >
                            Nhóm {emp.group}
                          </button>
                        </div>
                      </td>
                      {dateRange.map((date, i) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const status = getStatus(emp, date);
                        return (
                          <td key={i} className="border-r border-violet-50 p-1 text-center relative">
                            <div className={`rounded-lg px-1 py-1 text-[10px] font-black uppercase border ${STATUS_STYLE[status]}`}>
                              {status}
                            </div>
                            <button
                              onClick={() => handleToggleOff(emp.username, dateStr)}
                              title="Bật/Tắt lịch OFF"
                              className={`absolute top-0 right-0 text-[7px] font-bold uppercase px-1 rounded-bl-lg transition-colors ${status === 'OFF' ? 'bg-rose-400 text-white' : 'bg-white/70 text-slate-300 hover:bg-rose-100 hover:text-rose-500'}`}
                            >
                              {status === 'OFF' ? 'ON?' : 'OFF?'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={1 + dateRange.length} className="px-4 py-10 text-center text-violet-300 italic text-sm">
                    Chưa có danh sách nhân viên. Bấm "DS nhân viên" hoặc "Nhập Excel" để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <span className="text-xs font-black uppercase text-violet-400 tracking-widest">Đang xử lý dữ liệu...</span>
          </div>
        </div>
      )}

      {/* Spin Modal — Vòng quay may mắn */}
      {spinState.open && (
        <div className="fixed inset-0 bg-violet-900/30 backdrop-blur-sm flex items-center justify-center z-[120] px-4">
          <div className="bg-gradient-to-br from-pink-200 via-violet-200 to-sky-200 p-[3px] rounded-3xl shadow-2xl max-w-sm w-full">
            <div className="bg-white rounded-[calc(1.5rem-2px)] p-6 relative overflow-hidden">
              <button onClick={closeSpinModal} className="absolute top-3 right-3 text-violet-300 hover:text-violet-600 z-20">
                <X size={20} />
              </button>
              <div className="flex items-center gap-2 justify-center mb-3">
                <Sparkles size={18} className="text-pink-400" />
                <h3 className="text-base font-black text-violet-700 uppercase tracking-wide text-center">
                  Quay số ngày {spinState.dateStr ? format(parseISO(spinState.dateStr), 'dd/MM/yyyy') : ''}
                </h3>
              </div>

              {/* Wheel */}
              <div className="relative mx-auto mb-4" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
                {spinState.justLanded && CONFETTI_PIECES.map((p, idx) => (
                  <span
                    key={idx}
                    className="qs-confetti-piece"
                    style={{
                      background: p.color,
                      animationDelay: `${p.delay}s`,
                      ['--dx' as any]: `${p.dx}px`,
                      ['--dy' as any]: `${p.dy}px`,
                      ['--rot' as any]: `${p.rot}deg`,
                    }}
                  />
                ))}

                {/* Pointer */}
                <div
                  className="absolute -top-1 left-1/2 z-20"
                  style={{ transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '15px solid #8b5cf6' }}
                />

                {/* Dial */}
                {spinState.poolNames.length > 0 ? (
                  <div
                    className="rounded-full border-[6px] border-white shadow-lg"
                    style={{
                      width: WHEEL_SIZE,
                      height: WHEEL_SIZE,
                      background: `conic-gradient(${spinState.poolNames.map((_, i) => {
                        const anglePerSeg = 360 / spinState.poolNames.length;
                        return `${WHEEL_PALETTE[i % WHEEL_PALETTE.length]} ${i * anglePerSeg}deg ${(i + 1) * anglePerSeg}deg`;
                      }).join(', ')})`,
                      transform: `rotate(${spinState.rotation}deg)`,
                      transition: `transform ${WHEEL_SPIN_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)`,
                    }}
                  >
                    {spinState.poolNames.map((name, i) => {
                      const anglePerSeg = 360 / spinState.poolNames.length;
                      const centerAngle = i * anglePerSeg + anglePerSeg / 2;
                      return (
                        <div key={name} style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, transform: `rotate(${centerAngle}deg)` }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: -WHEEL_LABEL_RADIUS,
                              transform: 'translateX(-50%)',
                              width: 76,
                              textAlign: 'center',
                              fontSize: 10,
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              color: WHEEL_LABEL_COLOR,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full border-[6px] border-white bg-violet-50 shadow-lg" />
                )}

                {/* Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-white border-4 border-violet-200 shadow-md flex items-center justify-center">
                  {spinState.spinning ? (
                    <Dice5 size={22} className="qs-dice-spin text-violet-400" />
                  ) : (
                    <span className="text-[11px] font-black text-violet-500 text-center leading-tight">
                      {spinState.winners.length}/{spinState.targetCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Kết quả đã quay */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {Array.from({ length: spinState.targetCount }).map((_, i) => {
                  const won = spinState.winners[i];
                  return (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        won
                          ? 'bg-gradient-to-br from-amber-50 to-pink-50 text-amber-700 border-amber-200 qs-pop-in'
                          : 'bg-violet-50 text-violet-200 border-dashed border-violet-100'
                      }`}
                    >
                      {won || `#${i + 1}`}
                    </span>
                  );
                })}
              </div>

              {spinState.spinning || spinState.winners.length < spinState.targetCount ? (
                <p className="flex items-center justify-center gap-2 text-xs font-bold text-violet-400 uppercase">
                  <Dice5 size={14} className="qs-dice-spin" /> Đang quay {spinState.winners.length + 1}/{spinState.targetCount}...
                </p>
              ) : (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={respin}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-black uppercase px-4 py-2 rounded-xl transition-colors"
                  >
                    <RotateCcw size={14} /> Quay lại
                  </button>
                  <button
                    onClick={confirmSpin}
                    className="flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-black uppercase px-4 py-2 rounded-xl transition-colors"
                  >
                    <Check size={14} /> Xác nhận
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-violet-900/30 backdrop-blur-sm flex items-center justify-center z-[110]">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full mx-4 border border-violet-100">
            <h3 className="text-lg font-black text-violet-700 mb-2">Xác nhận làm mới</h3>
            <p className="text-slate-500 mb-6 text-sm">Bạn có chắc chắn muốn xóa toàn bộ lịch quay số và OFF hiện tại? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors font-medium text-sm">
                Hủy
              </button>
              <button onClick={handleResetSchedule} className="px-4 py-2 bg-rose-400 text-white rounded-xl hover:bg-rose-500 transition-colors font-medium text-sm">
                Xóa dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
