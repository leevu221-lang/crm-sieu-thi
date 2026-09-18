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

type Employee = { username: string; fullId: string; department: string; group: 1 | 2 };
type ScheduleMap = Record<string, { hc: string[] }>;
type OffMap = Record<string, Record<string, boolean>>;

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

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [lastSaved, setLastSaved] = useState<string | null>(() => localStorage.getItem('QUAY_SO_LAST_SAVED'));
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [spinState, setSpinState] = useState<{
    open: boolean; dateStr: string | null; display: string[]; winners: string[]; spinning: boolean;
  }>({ open: false, dateStr: null, display: [], winners: [], spinning: false });

  const tableRef = useRef<HTMLDivElement>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (spinTimerRef.current) clearTimeout(spinTimerRef.current); };
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

  const parseStaffListText = (text: string): { username: string; fullId: string; department: string }[] => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        return { username: parts[1] || parts[0] || 'N/A', fullId: parts[2] || '', department: parts[0] || 'BP All In One - ĐMX' };
      }
      return { username: line.trim(), fullId: '', department: 'BP All In One - ĐMX' };
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
      let sch: ScheduleMap = {};
      let off: OffMap = {};

      if (docSnap.exists()) {
        const d = docSnap.data() || {};
        staffText = d.ds_nhan_vien || '';
        groups = d.groups || {};
        sch = d.schedules || {};
        off = d.offMap || {};
      } else {
        const local = localStorage.getItem(`QUAY_SO_DATA_${targetStore}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            staffText = parsed.ds_nhan_vien || '';
            groups = parsed.groups || {};
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
        group: (groups[emp.username] === 1 || groups[emp.username] === 2 ? groups[emp.username] : (idx % 2 === 0 ? 1 : 2)) as 1 | 2
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

  const persist = async (overrides: Partial<{ ds_nhan_vien: string; groups: Record<string, number>; schedules: ScheduleMap; offMap: OffMap }> = {}) => {
    if (!targetStore) return;
    try {
      const storeId = normalizeStoreId(targetStore.trim());
      const docRef = doc(db, 'quay_so_ca_hanh_chinh', 'schedule_' + storeId);
      const payload = {
        warehouse_code: targetStore,
        ds_nhan_vien: overrides.ds_nhan_vien ?? rawStaffInput,
        groups: overrides.groups ?? Object.fromEntries(employees.map(e => [e.username, e.group])),
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
        return { ...ns, group: (existing?.group || (idx % 2 === 0 ? 1 : 2)) as 1 | 2 };
      });
      persist({ ds_nhan_vien: rawStaffInput, groups: Object.fromEntries(updated.map(e => [e.username, e.group])) });
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
        group: (idx % 2 === 0 ? 1 : 2) as 1 | 2
      };
    }).filter(Boolean) as Employee[];

    setEmployees(newEmployees);
    const rawText = newEmployees.map(e => `${e.department}\t${e.username}\t${e.fullId}`).join('\n');
    setRawStaffInput(rawText);
    persist({ ds_nhan_vien: rawText, groups: Object.fromEntries(newEmployees.map(e => [e.username, e.group])) });
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

  const weightedPickTwo = (pool: Employee[], counts: Record<string, number>): string[] => {
    const items = pool.map(e => ({ username: e.username, weight: 1 / Math.pow((counts[e.username] || 0) + 1, 2) }));
    const pickOne = (): string => {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = Math.random() * total;
      for (let i = 0; i < items.length; i++) {
        r -= items[i].weight;
        if (r <= 0) return items.splice(i, 1)[0].username;
      }
      return items.splice(items.length - 1, 1)[0].username;
    };
    const w1 = pickOne();
    const w2 = items.length > 0 ? pickOne() : w1;
    return [w1, w2];
  };

  const startSpin = (dateStr: string) => {
    const eligible = employees.filter(e => !offMap[dateStr]?.[e.username]);
    if (eligible.length < 2) {
      flashMessage('error', 'Không đủ nhân viên (chưa OFF) để quay số ngày này!');
      return;
    }
    const winners = weightedPickTwo(eligible, hcCounts);
    const names = eligible.map(e => e.username);
    setSpinState({ open: true, dateStr, display: [names[0], names[1] ?? names[0]], winners, spinning: true });

    let step = 0;
    const totalSteps = 22;
    const tick = () => {
      step++;
      if (step >= totalSteps) {
        setSpinState(s => ({ ...s, display: winners, spinning: false }));
        return;
      }
      const d1 = names[Math.floor(Math.random() * names.length)];
      let d2 = names[Math.floor(Math.random() * names.length)];
      if (d2 === d1 && names.length > 1) d2 = names[(names.indexOf(d1) + 1) % names.length];
      setSpinState(s => ({ ...s, display: [d1, d2] }));
      spinTimerRef.current = setTimeout(tick, 50 + step * 10);
    };
    tick();
  };

  const confirmSpin = () => {
    if (!spinState.dateStr) return;
    const updated = { ...schedule, [spinState.dateStr]: { hc: spinState.winners } };
    setSchedule(updated);
    persist({ schedules: updated });
    setSpinState({ open: false, dateStr: null, display: [], winners: [], spinning: false });
  };

  const closeSpinModal = () => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    setSpinState({ open: false, dateStr: null, display: [], winners: [], spinning: false });
  };

  const respin = () => {
    if (!spinState.dateStr) return;
    startSpin(spinState.dateStr);
  };

  const handleSpinAllDays = () => {
    if (employees.length < 2) {
      flashMessage('error', 'Cần ít nhất 2 nhân viên để quay số!');
      return;
    }
    const updated: ScheduleMap = { ...schedule };
    const workingCounts: Record<string, number> = { ...hcCounts };
    dateRange.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const eligible = employees.filter(e => !offMap[dateStr]?.[e.username]);
      if (eligible.length < 2) return;
      const [w1, w2] = weightedPickTwo(eligible, workingCounts);
      updated[dateStr] = { hc: [w1, w2] };
      workingCounts[w1] = (workingCounts[w1] || 0) + 1;
      workingCounts[w2] = (workingCounts[w2] || 0) + 1;
    });
    setSchedule(updated);
    persist({ schedules: updated });
    flashMessage('success', `Đã quay số cho ${dateRange.length} ngày!`);
  };

  const handleResetSchedule = () => {
    setSchedule({});
    setOffMap({});
    persist({ schedules: {}, offMap: {} });
    setShowResetConfirm(false);
    flashMessage('success', 'Đã làm mới toàn bộ lịch quay số!');
  };

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    employees.forEach(emp => {
      const dept = emp.department || 'Khác';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return groups;
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
    HC: 'bg-amber-100 text-amber-800 border-amber-300',
    'Sáng': 'bg-sky-100 text-sky-700 border-sky-300',
    'Chiều': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    OFF: 'bg-red-50 text-red-500 border-red-200'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header Bar */}
      <div className="bg-white text-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md border-b border-slate-200 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-black uppercase tracking-wider leading-tight text-[#004b8d] whitespace-nowrap">QUAY SỐ CA HÀNH CHÍNH</h1>

          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 gap-2 border border-slate-200 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 leading-none">Từ ngày</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs font-bold bg-transparent border-none outline-none" />
            </div>
            <span className="text-slate-300">→</span>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 leading-none">Đến ngày</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs font-bold bg-transparent border-none outline-none" />
            </div>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 gap-2 border border-slate-200 shadow-inner">
            <span className="text-[9px] font-black uppercase text-slate-400">Tỷ lệ Nhóm 1</span>
            <input
              type="number" min={0} max={100} value={ratio}
              onChange={e => setRatio(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-12 text-xs font-black text-center bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-[10px] font-bold text-slate-500">% : {100 - ratio}%</span>
            <button
              onClick={handleAssignRatio}
              className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[10px] font-black uppercase px-2 py-1 rounded transition-colors"
            >
              <Shuffle size={12} /> Chia nhóm
            </button>
          </div>

          {saveMessage.text && (
            <div className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center min-h-[40px] shadow-sm border max-w-[220px] leading-tight ${saveMessage.type === 'success' ? 'bg-[#008080] text-white border-[#006666]' : 'bg-red-600 text-white border-red-700'}`}>
              {saveMessage.text}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleSpinAllDays}
            className="bg-gradient-to-b from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 border border-fuchsia-400 px-3 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[44px] w-[130px] leading-tight"
          >
            <Dice5 size={16} /> Quay tất cả
          </button>

          <button
            onClick={handleExportImage}
            className="bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border border-purple-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[44px] w-[100px] leading-tight"
          >
            <Camera size={14} /> Chụp ảnh
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[44px] w-[100px] leading-tight"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            onClick={() => setShowStaffInput(!showStaffInput)}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[44px] w-[110px] leading-tight ${showStaffInput ? 'bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-500' : 'bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400'}`}
          >
            <Users size={14} /> DS nhân viên
          </button>

          <label className="cursor-pointer bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 border border-sky-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[44px] w-[100px] leading-tight">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Nhập Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => persist()}
              disabled={isSaving}
              className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-400 px-3 py-2 rounded-lg text-[12px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md text-white min-h-[44px] min-w-[130px] leading-tight disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu Firebase
            </button>
            {lastSaved && (
              <span className="text-[9px] text-slate-500 italic text-center">
                Lưu lần cuối: {new Date(lastSaved).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        </div>
      </div>

      {showStaffInput && (
        <div className="bg-white p-4 border-b border-slate-200 shadow-inner flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách nhân viên (mỗi dòng 1 người hoặc dán từ Excel)</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleApplyStaffInput} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase px-3 py-1.5 rounded shadow transition-all">
                Cập nhật & Lưu
              </button>
              <button onClick={() => setShowStaffInput(false)} className="bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded shadow transition-all">
                Đóng
              </button>
            </div>
          </div>
          <textarea
            value={rawStaffInput}
            onChange={e => setRawStaffInput(e.target.value)}
            className="w-full h-32 p-3 border border-slate-300 rounded-lg text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner text-slate-800"
            placeholder={'BP All In One - ĐMX\tLộc_49641\t99153\nBP All In One - ĐMX\tKhiết_30660\t99155\n\nHoặc chỉ cần nhập tên mỗi dòng:\nLộc_49641\nKhiết_30660'}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-100 text-[10px] font-bold uppercase flex-wrap">
        <span className={`px-2 py-1 rounded border ${STATUS_STYLE.HC}`}>HC = Hành chính (quay số)</span>
        <span className={`px-2 py-1 rounded border ${STATUS_STYLE['Sáng']}`}>Sáng</span>
        <span className={`px-2 py-1 rounded border ${STATUS_STYLE['Chiều']}`}>Chiều</span>
        <span className={`px-2 py-1 rounded border ${STATUS_STYLE.OFF}`}>OFF</span>
        <span className="text-slate-400 normal-case font-medium italic">Nhóm 1/2 tự đảo Sáng ↔ Chiều mỗi ngày. Bấm 🎲 trên từng ngày để quay số 2 người trực hành chính.</span>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-max" ref={tableRef}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#e6f0fa] border-b border-slate-300">
                <th className="sticky left-0 z-40 bg-[#e6f0fa] border-r border-slate-300 px-4 py-2 text-left w-56 min-w-[224px]">
                  <span className="font-black text-[#004b8d] uppercase text-xs">Nhân viên</span>
                </th>
                {dateRange.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return (
                    <th key={i} className={`border-r border-slate-300 px-2 py-1.5 text-center min-w-[92px] ${isWeekend ? 'text-red-600 bg-red-50/50' : 'text-[#004b8d]'}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-black uppercase tracking-tighter">{format(date, 'EEEE', { locale: vi })}</span>
                        <span className="font-bold text-[10px]">{format(date, 'dd/MM')}</span>
                        <button
                          onClick={() => startSpin(dateStr)}
                          title="Quay số ca hành chính"
                          className="mt-0.5 flex items-center gap-1 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors"
                        >
                          <Dice5 size={11} /> Quay số
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
              {/* Summary row */}
              <tr className="bg-[#f8fafc] border-b-2 border-slate-300">
                <td className="sticky left-0 z-30 bg-[#f8fafc] border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px]">
                  Tổng hợp
                </td>
                {dailySummary.map((s, i) => (
                  <td key={i} className="border-r border-slate-200 text-center text-[9px] font-bold text-slate-500 px-1 py-1">
                    <div>HC:{s.hc} S:{s.sang}</div>
                    <div>C:{s.chieu} OFF:{s.off}</div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedEmployees).map(([dept, deptEmps]) => (
                <React.Fragment key={dept}>
                  <tr className="bg-[#f1f5f9]">
                    <td colSpan={1 + dateRange.length} className="sticky left-0 z-20 bg-[#f1f5f9] px-4 py-2 font-black text-[#004b8d] uppercase border-b border-slate-300">
                      {dept}
                    </td>
                  </tr>
                  {deptEmps.map(emp => (
                    <tr key={emp.username} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-4 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{emp.username}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{emp.fullId}</span>
                          </div>
                          <button
                            onClick={() => handleToggleGroup(emp.username)}
                            title="Bấm để đổi nhóm"
                            className={`text-[9px] font-black uppercase rounded px-1.5 py-0.5 transition-colors ${emp.group === 1 ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}
                          >
                            Nhóm {emp.group}
                          </button>
                        </div>
                      </td>
                      {dateRange.map((date, i) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const status = getStatus(emp, date);
                        return (
                          <td key={i} className="border-r border-slate-200 p-1 text-center relative">
                            <div className={`rounded px-1 py-1 text-[10px] font-black uppercase border ${STATUS_STYLE[status]}`}>
                              {status}
                            </div>
                            <button
                              onClick={() => handleToggleOff(emp.username, dateStr)}
                              title="Bật/Tắt lịch OFF"
                              className={`absolute top-0 right-0 text-[7px] font-bold uppercase px-1 rounded-bl transition-colors ${status === 'OFF' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'}`}
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
                  <td colSpan={1 + dateRange.length} className="px-4 py-10 text-center text-slate-400 italic text-sm">
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
            <Loader2 size={32} className="animate-spin text-[#004b8d]" />
            <span className="text-xs font-black uppercase text-[#004b8d] tracking-widest">Đang xử lý dữ liệu...</span>
          </div>
        </div>
      )}

      {/* Spin Modal */}
      {spinState.open && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[120] px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button onClick={closeSpinModal} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 justify-center mb-4">
              <Sparkles size={20} className="text-fuchsia-500" />
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                Quay số ngày {spinState.dateStr ? format(parseISO(spinState.dateStr), 'dd/MM/yyyy') : ''}
              </h3>
            </div>
            <div className="flex flex-col gap-3 mb-5">
              {spinState.display.map((name, idx) => (
                <div
                  key={idx}
                  className={`text-center py-4 rounded-xl border-2 font-black text-xl uppercase tracking-wide transition-all ${
                    spinState.spinning
                      ? 'border-slate-200 bg-slate-50 text-slate-500'
                      : 'border-amber-400 bg-amber-50 text-amber-700 scale-105'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            {spinState.spinning ? (
              <p className="text-center text-xs font-bold text-slate-400 uppercase animate-pulse">Đang quay...</p>
            ) : (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={respin}
                  className="flex items-center gap-1.5 bg-slate-500 hover:bg-slate-600 text-white text-xs font-black uppercase px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw size={14} /> Quay lại
                </button>
                <button
                  onClick={confirmSpin}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase px-4 py-2 rounded-lg transition-colors"
                >
                  <Check size={14} /> Xác nhận
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[110]">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận làm mới</h3>
            <p className="text-slate-600 mb-6 text-sm">Bạn có chắc chắn muốn xóa toàn bộ lịch quay số và OFF hiện tại? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm">
                Hủy
              </button>
              <button onClick={handleResetSchedule} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm">
                Xóa dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
