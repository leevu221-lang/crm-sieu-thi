import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { Loader2, Save, Trash2, ChevronRight, ChevronLeft, Camera, RotateCcw, RefreshCw, GripVertical, Eye, EyeOff, CalendarCheck, Users } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { useRealtimeData } from '../pages/RTST/hooks/useRealtimeData';
import { normalizeStoreId } from '../pages/RTST/utils';
import { format, startOfWeek, addDays, isSameDay, eachDayOfInterval, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

// Constants for shifts
const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Ca 5'];
const SHIFT_HOURS: { [key: string]: number } = {
  ca1: 1,
  ca2: 3,
  ca3: 3,
  ca4: 3,
  ca5: 2.5
};

export default function PhanCaTuanTable() {
  const { userProfile } = useAuth();
  const { currentStoreId } = useStore();
  const { loadData } = useRealtimeData(userProfile?.ma_kho || '');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [lastSaved, setLastSaved] = useState<string | null>(() => localStorage.getItem('PHAN_CA_TUAN_LAST_SAVED'));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showOnlyHC, setShowOnlyHC] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const summaryTableRef = useRef<HTMLDivElement>(null);
  const [rawStaffInput, setRawStaffInput] = useState('');
  const [showStaffInput, setShowStaffInput] = useState(false);
  
  // Generate dates for the current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDates = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    });
  }, [currentWeekStart]);

  const parseStaffListText = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        return {
          username: parts[1] || parts[0] || 'N/A',
          fullId: parts[2] || '',
          department: parts[0] || 'BP All In One - ĐMX',
          shiftType: '',
          shifts: {}
        };
      } else {
        return {
          username: line.trim(),
          fullId: '',
          department: 'BP All In One - ĐMX',
          shiftType: '',
          shifts: {}
        };
      }
    });
  };

  const handleApplyStaffInput = () => {
    if (!rawStaffInput.trim()) {
      setSaveMessage({ type: 'error', text: 'Vui lòng nhập danh sách nhân viên!' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
      return;
    }
    const newStaff = parseStaffListText(rawStaffInput);
    
    // Merge new staff with existing employees to preserve existing shifts!
    setEmployees(prev => {
      const updated = newStaff.map(ns => {
        const existing = prev.find(emp => emp.username === ns.username);
        if (existing) {
          return {
            ...ns,
            shiftType: existing.shiftType || ns.shiftType,
            shifts: existing.shifts || ns.shifts
          };
        }
        return ns;
      });
      handleSaveToFirebaseDirect(updated, rawStaffInput);
      return updated;
    });
    setSaveMessage({ type: 'success', text: 'Đã cập nhật danh sách nhân viên và lưu Firebase!' });
    setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
  };

  const fetchEmployees = async (force = false) => {
    const targetStore = currentStoreId || userProfile?.ma_kho || '';
    if (!targetStore) return;
    setLoading(true);
    try {
      const weekKey = format(currentWeekStart, 'yyyy-ww');
      const storeId = normalizeStoreId(targetStore.trim());

      // 1. Check Firebase Firestore
      const docRef = doc(db, 'weekly_shifts', 'shifts_' + storeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const dbData = docSnap.data() || {};
        const dbWeeks = dbData.weeks || {};
        const dbStaffList = dbData.ds_nhan_vien || '';
        
        setRawStaffInput(dbStaffList);
        
        if (dbWeeks[weekKey] && Array.isArray(dbWeeks[weekKey]) && dbWeeks[weekKey].length > 0) {
          setEmployees(dbWeeks[weekKey]);
          setSaveMessage({ type: 'success', text: 'Đã tải dữ liệu từ Firebase!' });
          setLoading(false);
          return;
        } else if (dbStaffList) {
          const parsedStaff = parseStaffListText(dbStaffList);
          setEmployees(parsedStaff);
          setSaveMessage({ type: 'success', text: 'Đã tải danh sách nhân viên từ Firebase!' });
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to LocalStorage
      const localDataKey = `PHAN_CA_TUAN_DATA_${targetStore}`;
      const localData = localStorage.getItem(localDataKey);
      
      if (localData && !force) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed[weekKey] && Array.isArray(parsed[weekKey]) && parsed[weekKey].length > 0) {
            setEmployees(parsed[weekKey]);
            setSaveMessage({ type: 'success', text: 'Đã tải dữ liệu từ trình duyệt!' });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing local phan ca tuan data:', e);
        }
      }

      // 3. Fallback to Supabase store ds_nhan_vien
      const { data: lkData, error } = await supabase
        .from('store')
        .select('ds_nhan_vien')
        .eq('id', storeId)
        .maybeSingle();

      if (error) {
        console.error('Lỗi khi tải danh sách nhân viên:', error);
        setSaveMessage({ type: 'error', text: 'Lỗi tải dữ liệu!' });
        return;
      }

      let rawEmployees: any[] = [];
      if (lkData?.ds_nhan_vien) {
        setRawStaffInput(lkData.ds_nhan_vien);
        try {
          const lines = lkData.ds_nhan_vien.split('\n').filter((l: string) => l.trim());
          if (lines.length > 0) {
            const firstLineParts = lines[0].split('\t');
            const startIndex = (firstLineParts[1]?.toLowerCase().includes('user') || firstLineParts[1]?.toLowerCase().includes('tên')) ? 1 : 0;
            
            rawEmployees = lines.slice(startIndex).map((line: string) => {
              const parts = line.split('\t');
              if (parts.length < 2) return null;
              return {
                username: parts[1] || parts[0] || 'N/A',
                fullId: parts[2] || '',
                department: parts[0] || 'BP All In One - ĐMX',
                shiftType: '',
                shifts: {}
              };
            }).filter(Boolean);
          }
        } catch (e) {
          console.error('Error parsing ds_nhan_vien:', e);
        }
      }

      if (rawEmployees.length > 0) {
        setEmployees(rawEmployees);
        setSaveMessage({ type: 'success', text: 'Đã tải danh sách nhân viên!' });
      } else {
        setEmployees([]);
        setSaveMessage({ type: 'info', text: 'Chưa có danh sách nhân viên.' });
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setSaveMessage({ type: 'error', text: 'Lỗi hệ thống khi tải dữ liệu.' });
    } finally {
      setLoading(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [userProfile?.ma_kho, currentWeekStart, currentStoreId]);

  const handleUpdateShift = (username: string, date: Date, shiftIndex: number, value: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const numValue = parseFloat(value) || 0;
    
    setEmployees(prev => {
      const updated = prev.map(emp => {
        if (emp.username === username) {
          const newShifts = { ...emp.shifts };
          const dayShifts = { ...(newShifts[dateStr] || {}) };
          dayShifts[`ca${shiftIndex + 1}`] = numValue;
          newShifts[dateStr] = dayShifts;
          return { ...emp, shifts: newShifts };
        }
        return emp;
      });
      handleSaveToFirebaseDirect(updated);
      return updated;
    });
  };

  const handleUpdateShiftType = (username: string, type: string) => {
    setEmployees(prev => {
      const updated = prev.map(emp => 
        emp.username === username ? { ...emp, shiftType: type } : emp
      );
      handleSaveToFirebaseDirect(updated);
      return updated;
    });
  };

  const handleToggleOff = (username: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setEmployees(prev => {
      const updated = prev.map(emp => {
        if (emp.username === username) {
          const newShifts = { ...emp.shifts };
          const dayShifts = { ...(newShifts[dateStr] || {}) };
          dayShifts.isOff = !dayShifts.isOff;
          if (dayShifts.isOff) {
            SHIFTS.forEach((_, sIdx) => {
              dayShifts[`ca${sIdx + 1}`] = 0;
            });
          }
          newShifts[dateStr] = dayShifts;
          return { ...emp, shifts: newShifts };
        }
        return emp;
      });
      handleSaveToFirebaseDirect(updated);
      return updated;
    });
  };

  const [draggedEmp, setDraggedEmp] = useState<string | null>(null);
  const [dragOverEmp, setDragOverEmp] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, username: string) => {
    setDraggedEmp(username);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, username: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverEmp !== username) {
      setDragOverEmp(username);
    }
  };

  const handleDrop = (e: React.DragEvent, targetUsername: string) => {
    e.preventDefault();
    if (!draggedEmp || draggedEmp === targetUsername) {
      setDraggedEmp(null);
      setDragOverEmp(null);
      return;
    }

    setEmployees(prev => {
      const newEmployees = [...prev];
      const draggedIdx = newEmployees.findIndex(emp => emp.username === draggedEmp);
      const targetIdx = newEmployees.findIndex(emp => emp.username === targetUsername);

      if (draggedIdx === -1 || targetIdx === -1) return prev;

      const draggedEmployee = { ...newEmployees[draggedIdx] };
      const targetEmployee = newEmployees[targetIdx];

      draggedEmployee.department = targetEmployee.department;
      newEmployees.splice(draggedIdx, 1);
      const newTargetIdx = newEmployees.findIndex(emp => emp.username === targetUsername);
      newEmployees.splice(newTargetIdx, 0, draggedEmployee);

      const updated = newEmployees;
      handleSaveToFirebaseDirect(updated);
      return updated;
    });

    setDraggedEmp(null);
    setDragOverEmp(null);
  };

  const handleDragEnd = () => {
    setDraggedEmp(null);
    setDragOverEmp(null);
  };

  const handleSaveToFirebaseDirect = async (currentEmployees = employees, currentRawInput = rawStaffInput) => {
    const targetStore = currentStoreId || userProfile?.ma_kho || '';
    if (!targetStore) return;
    try {
      const weekKey = format(currentWeekStart, 'yyyy-ww');
      const storeId = normalizeStoreId(targetStore.trim());
      const docRef = doc(db, 'weekly_shifts', 'shifts_' + storeId);
      
      const docSnap = await getDoc(docRef);
      const existingWeeks = docSnap.exists() ? (docSnap.data()?.weeks || {}) : {};
      
      const updatedWeeks = {
        ...existingWeeks,
        [weekKey]: currentEmployees
      };

      await setDoc(docRef, {
        warehouse_code: targetStore,
        ds_nhan_vien: currentRawInput,
        weeks: updatedWeeks,
        updated_at: new Date().toISOString(),
        updated_by: userProfile?.username || 'unknown'
      }, { merge: true });

      const localDataKey = `PHAN_CA_TUAN_DATA_${targetStore}`;
      localStorage.setItem(localDataKey, JSON.stringify(updatedWeeks));

      const now = new Date().toISOString();
      setLastSaved(now);
      localStorage.setItem('PHAN_CA_TUAN_LAST_SAVED', now);
    } catch (err) {
      console.error('Error in handleSaveToFirebaseDirect:', err);
    }
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      await handleSaveToFirebaseDirect(employees, rawStaffInput);
      setSaveMessage({ type: 'success', text: 'Đã lưu dữ liệu vào Firebase!' });
    } catch (err: any) {
      console.error('Error saving to Firebase:', err);
      setSaveMessage({ type: 'error', text: 'Lỗi khi lưu vào Firebase!' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  const captureTableHelper = async (element: HTMLElement, fileName: string) => {
    const targetWidth = Math.max(1200, element.scrollWidth + 48);

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${targetWidth}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    const clone = element.cloneNode(true) as HTMLElement;

    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, input');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    clone.style.width = `${targetWidth}px`;
    clone.style.minWidth = `${targetWidth}px`;
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '24px';
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'inline-block';
    clone.style.boxSizing = 'border-box';
    clone.style.borderRadius = '24px';

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

    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.boxSizing = 'border-box';
    });

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      // ★ Ensure UTM Avo font is fully loaded before export
      await ensureFontsReady();
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalWidth = targetWidth;
      const finalHeight = clone.offsetHeight || clone.scrollHeight;

      const dataUrl = await htmlToImage.toPng(clone, {
        quality: 1,
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

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
      setSaveMessage({ type: 'success', text: `Đã xuất ảnh ${fileName}!` });
    } catch (err) {
      console.error('Lỗi khi chụp ảnh:', err);
      setSaveMessage({ type: 'error', text: 'Không thể chụp ảnh.' });
    } finally {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handleExportImage = async () => {
    if (!tableRef.current) return;
    await captureTableHelper(tableRef.current, 'PHAN_CA_TUAN.png');
  };

  const handleExportSummaryImage = async () => {
    if (!summaryTableRef.current) return;
    await captureTableHelper(summaryTableRef.current, 'TOM_TAT_NHAN_VIEN_DI_CA_HANH_CHINH_TUAN.png');
  };

  const handleAutoAssign = () => {
    setEmployees(prev => {
      const newEmployees = prev.map(emp => ({
        ...emp,
        shifts: { ...emp.shifts }
      }));
      
      const M = newEmployees.length;
      if (M === 0) return prev;

      weekDates.forEach((date, dayIdx) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        let dailyPair: string[] = [];
        
        if (M % 2 === 0) {
          // Even number of employees: fixed pairs
          const pairIdx = dayIdx % (M / 2);
          const firstEmpIdx = pairIdx * 2;
          const secondEmpIdx = firstEmpIdx + 1;
          
          dailyPair = [
            newEmployees[firstEmpIdx].username,
            newEmployees[secondEmpIdx].username
          ];
        } else {
          // Odd number of employees: rotating pairs
          const idx1 = (dayIdx * 2) % M;
          const idx2 = (dayIdx * 2 + 1) % M;
          dailyPair = [
            newEmployees[idx1].username,
            newEmployees[idx2].username
          ];
        }
        
        newEmployees.forEach(emp => {
          const dayShifts = { ...(emp.shifts[dateStr] || {}) };
          
          // Clear all shifts for today first
          SHIFTS.forEach((_, sIdx) => {
            dayShifts[`ca${sIdx + 1}`] = 0;
          });
          
          if (dayShifts.isOff) {
            emp.shifts[dateStr] = dayShifts;
            return;
          }
          
          if (dailyPair.includes(emp.username)) {
            // Active administrative shift pair: ca1 to ca5 are all active
            [1, 2, 3, 4, 5].forEach(s => dayShifts[`ca${s}`] = SHIFT_HOURS[`ca${s}`]);
            emp.shiftType = 'Hành Chính';
          } else {
            // Normal shift type alternates (morning/afternoon)
            const defaultType = (emp.shiftType === 'Chiều' || emp.shiftType === 'Sáng') ? emp.shiftType : 'Sáng';
            const isEvenDay = dayIdx % 2 === 0;
            
            if (defaultType === 'Chiều') {
              if (isEvenDay) {
                [4, 5].forEach(s => dayShifts[`ca${s}`] = SHIFT_HOURS[`ca${s}`]);
              } else {
                [1, 2, 3].forEach(s => dayShifts[`ca${s}`] = SHIFT_HOURS[`ca${s}`]);
              }
              emp.shiftType = 'Chiều';
            } else {
              if (isEvenDay) {
                [1, 2, 3].forEach(s => dayShifts[`ca${s}`] = SHIFT_HOURS[`ca${s}`]);
              } else {
                [4, 5].forEach(s => dayShifts[`ca${s}`] = SHIFT_HOURS[`ca${s}`]);
              }
              emp.shiftType = 'Sáng';
            }
          }
          emp.shifts[dateStr] = dayShifts;
        });
      });
      
      // Save directly to Firebase immediately!
      setTimeout(() => {
        handleSaveToFirebaseDirect(newEmployees);
      }, 0);
      
      return newEmployees;
    });
    setSaveMessage({ type: 'success', text: 'Đã chia ca tự động và lưu Firebase!' });
    setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
  };

  const calculateWeeklyTotal = (emp: any) => {
    let total = 0;
    weekDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = emp.shifts?.[dateStr] || {};
      Object.values(dayShifts).forEach((val: any) => {
        if (typeof val === 'number') total += val;
      });
    });
    return total;
  };

  const summaryData = useMemo(() => {
    const data = weekDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const shiftTotals = SHIFTS.map((_, sIdx) => {
        let totalHours = 0;
        let staffCount = 0;
        employees.forEach(emp => {
          const val = emp.shifts?.[dateStr]?.[`ca${sIdx + 1}`] || 0;
          if (val > 0) {
            totalHours += val;
            staffCount += 1;
          }
        });
        return { totalHours, staffCount };
      });
      const dayTotalHours = shiftTotals.reduce((sum, s) => sum + s.totalHours, 0);
      return { dateStr, shiftTotals, dayTotalHours };
    });
    return data;
  }, [employees, weekDates]);

  const groupedEmployees = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    employees.forEach(emp => {
      const dept = emp.department || 'Khác';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return groups;
  }, [employees]);

  const handleUpload = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const newEmployees = jsonData.slice(1).map(row => {
      if (!row[1]) return null;
      return {
        username: String(row[1]).trim(),
        fullId: String(row[2] || '').trim(),
        department: String(row[0] || 'BP All In One - ĐMX').trim(),
        shiftType: '',
        shifts: {}
      };
    }).filter(Boolean);

    setEmployees(newEmployees);
    const rawText = newEmployees.map(e => `${e.department}\t${e.username}\t${e.fullId}`).join('\n');
    setRawStaffInput(rawText);
    handleSaveToFirebaseDirect(newEmployees, rawText);
    setSaveMessage({ type: 'success', text: 'Đã nhập danh sách từ Excel và lưu Firebase!' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 phan-ca-tuan-container">
      <style>{`
        .phan-ca-tuan-container {
          font-family: 'UTM Avo', sans-serif !important;
        }
        .phan-ca-tuan-container * {
          font-family: 'UTM Avo', sans-serif !important;
        }
        .phan-ca-tuan-container th,
        .phan-ca-tuan-container td,
        .phan-ca-tuan-container button,
        .phan-ca-tuan-container h1,
        .phan-ca-tuan-container h3,
        .phan-ca-tuan-container input,
        .phan-ca-tuan-container textarea {
          font-weight: 900 !important;
        }
        .phan-ca-tuan-container .text-\[11px\] { font-size: 12.1px !important; }
        .phan-ca-tuan-container .text-\[12px\] { font-size: 13.2px !important; }
        .phan-ca-tuan-container .text-\[10px\] { font-size: 11px !important; }
        .phan-ca-tuan-container .text-\[9px\] { font-size: 10px !important; }
        .phan-ca-tuan-container .text-xs { font-size: 0.825rem !important; }
        .phan-ca-tuan-container .text-sm { font-size: 0.9625rem !important; }
        .phan-ca-tuan-container .text-base { font-size: 1.1rem !important; }
        .phan-ca-tuan-container .text-4xl { font-size: 2.475rem !important; }
      `}</style>
      <div className="bg-white text-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md border-b border-slate-200 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-black uppercase tracking-wider leading-tight text-[#004b8d] whitespace-nowrap">PHÂN CA TUẦN</h1>
          
          <div className="flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1.5 gap-3 transition-all border border-slate-200 shadow-inner text-slate-700">
            <button onClick={() => setCurrentWeekStart(d => addDays(d, -7))} className="hover:bg-white p-1 rounded transition-colors shadow-sm">
              <ChevronLeft size={16} />
            </button>
            <div className="flex flex-col items-center relative group">
              <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-0.5">Chọn ngày bắt đầu</span>
              <input 
                type="date" 
                value={format(currentWeekStart, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    setCurrentWeekStart(new Date(e.target.value));
                  }
                }}
                className="text-xs font-bold uppercase bg-transparent border-none outline-none cursor-pointer text-center w-32 leading-tight tracking-wide"
              />
              <div className="text-[9px] font-bold text-[#004b8d] mt-0.5">
                {format(currentWeekStart, 'dd/MM')} - {format(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}
              </div>
            </div>
            <button onClick={() => setCurrentWeekStart(d => addDays(d, 7))} className="hover:bg-white p-1 rounded transition-colors shadow-sm">
              <ChevronRight size={16} />
            </button>
          </div>
          
          {saveMessage.text && (
            <div className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center min-h-[48px] shadow-sm border ${saveMessage.type === 'success' ? 'bg-[#008080] text-white border-[#006666]' : 'bg-red-600 text-white border-red-700'}`}>
              {saveMessage.text}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowOnlyHC(!showOnlyHC)}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md ${showOnlyHC ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-400' : 'bg-gradient-to-b from-slate-500 to-slate-600 border border-slate-400'}`}
          >
            {showOnlyHC ? (
              <><Eye size={14} className="shrink-0" /> Hiện tất cả</>
            ) : (
              <><EyeOff size={14} className="shrink-0" /> Ẩn ca thường</>
            )}
          </button>

          <button
            onClick={handleAutoAssign}
            className="bg-gradient-to-b from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 border border-orange-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md"
          >
            Chia ca tự động
          </button>

          <button
            onClick={handleExportImage}
            className="bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border border-purple-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal"
          >
            <Camera size={14} className="shrink-0" /> Chụp ảnh
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal"
          >
            <RotateCcw size={14} className="shrink-0" /> Reset
          </button>

          <button
            onClick={() => setShowStaffInput(!showStaffInput)}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md ${showStaffInput ? 'bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-500 shadow-inner' : 'bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400'}`}
          >
            <Users size={14} className="shrink-0" /> Nhập DS nhân viên
          </button>

          <label className="cursor-pointer bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 border border-sky-400 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal">
            <RefreshCw size={14} className={`shrink-0 ${loading ? 'animate-spin' : ''}`} /> Tải DS nhân viên
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveToFirebase}
                disabled={isSaving}
                className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-400 px-3 py-2 rounded-lg text-[12px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md text-white min-h-[48px] min-w-[130px] leading-tight text-center whitespace-normal disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Save size={16} className="shrink-0" />}
                Lưu trình duyệt
              </button>
              <button
                onClick={handleSaveToFirebase}
                disabled={isSaving}
                className="bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border border-amber-400 px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md text-white min-h-[48px] w-[110px] leading-tight text-center whitespace-normal hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md disabled:opacity-50"
              >
                <CalendarCheck size={16} className="shrink-0" /> Lưu lịch OFF
              </button>
            </div>
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
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách nhân viên (nhập mỗi nhân viên 1 dòng hoặc dán từ Excel)</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyStaffInput}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase px-3 py-1.5 rounded shadow transition-all hover:shadow-md"
              >
                Cập nhật & Lưu Firebase
              </button>
              <button
                onClick={() => setShowStaffInput(false)}
                className="bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded shadow transition-all hover:shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
          <textarea
            value={rawStaffInput}
            onChange={(e) => setRawStaffInput(e.target.value)}
            className="w-full h-40 p-3 border border-slate-300 rounded-lg text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner text-slate-800"
            placeholder="BP All In One - ĐMX	Lộc_49641	99153&#10;BP All In One - ĐMX	Khiết_30660	99155&#10;&#10;Hoặc chỉ cần nhập tên mỗi dòng:&#10;Lộc_49641&#10;Khiết_30660"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-max" ref={tableRef}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#e6f0fa] border-b border-slate-300">
                <th rowSpan={2} className="sticky left-0 z-40 bg-[#e6f0fa] border-r border-slate-300 px-4 py-2 text-left w-64 min-w-[256px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#004b8d] uppercase text-xs">Nhân viên</span>
                    <span className="font-black text-[#004b8d] uppercase text-[10px] opacity-80">Loại ca</span>
                  </div>
                </th>
                <th rowSpan={2} className="sticky left-64 z-40 bg-[#e6f0fa] border-r border-slate-300 px-2 py-2 text-center w-24 min-w-[96px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <span className="font-black text-[#004b8d] uppercase leading-tight block text-[10px]">Tổng giờ<br/>tuần</span>
                </th>
                {weekDates.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th key={i} colSpan={5} className={`border-r-2 border-slate-400 px-2 py-1.5 text-center ${isWeekend ? 'text-red-600 bg-red-50/50' : 'text-[#004b8d]'}`}>
                      <span className="font-black uppercase tracking-tighter text-[11px]">
                        {format(date, 'EEEE (dd/MM)', { locale: vi })}
                      </span>
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-[#f0f5fa] border-b border-slate-300">
                {weekDates.map((date, i) => {
                  return SHIFTS.map((shift, sIdx) => (
                    <th key={`${i}-${sIdx}`} className={`px-1 py-1 text-[9px] font-bold uppercase w-12 min-w-[48px] ${sIdx === 4 ? 'border-r-2 border-slate-400' : 'border-r border-slate-200'}`}>
                      {shift.replace('Ca ', 'C')}
                    </th>
                  ));
                })}
              </tr>

              {/* Summary Row 1: Total Day Hours */}
              <tr className="bg-[#f8fafc] border-b border-slate-200">
                <td className="sticky left-0 z-30 bg-[#f8fafc] border-r border-slate-200 px-4 py-2 font-bold text-[#004b8d] uppercase shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Tổng giờ công đã xếp ca
                </td>
                <td className="sticky left-64 z-30 bg-[#f8fafc] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                {summaryData.map((day, i) => (
                  <td key={i} colSpan={5} className="border-r-2 border-slate-400 text-center font-black text-[#004b8d] text-xs">
                    {day.dayTotalHours.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Summary Row 2: Shift Hours */}
              <tr className="bg-white border-b border-slate-200">
                <td className="sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Giờ công đã xếp ca
                </td>
                <td className="sticky left-64 z-30 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                {summaryData.map((day, i) => (
                  day.shiftTotals.map((shift, sIdx) => (
                    <td key={`${i}-${sIdx}`} className={`text-center font-bold text-slate-700 ${sIdx === 4 ? 'border-r-2 border-slate-400' : 'border-r border-slate-200'}`}>
                      {shift.totalHours || ''}
                    </td>
                  ))
                ))}
              </tr>

              {/* Summary Row 3: Staff Count */}
              <tr className="bg-white border-b-2 border-slate-300">
                <td className="sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-1.5 font-bold text-slate-500 uppercase text-[10px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Nhân sự trong ca
                </td>
                <td className="sticky left-64 z-30 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                {summaryData.map((day, i) => (
                  day.shiftTotals.map((shift, sIdx) => (
                    <td key={`${i}-${sIdx}`} className={`text-center font-bold text-slate-500 ${sIdx === 4 ? 'border-r-2 border-slate-400' : 'border-r border-slate-200'}`}>
                      {shift.staffCount || ''}
                    </td>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedEmployees).map(([dept, deptEmps]) => (
                <React.Fragment key={dept}>
                  <tr className="bg-[#f1f5f9]">
                    <td colSpan={2 + weekDates.length * 5} className="sticky left-0 z-20 bg-[#f1f5f9] px-4 py-2 font-black text-[#004b8d] uppercase border-b border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {dept}
                    </td>
                  </tr>
                  {deptEmps.map((emp) => (
                    <tr 
                      key={emp.username} 
                      className={`border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group ${dragOverEmp === emp.username ? 'border-t-2 border-t-indigo-500' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, emp.username)}
                      onDragOver={(e) => handleDragOver(e, emp.username)}
                      onDrop={(e) => handleDrop(e, emp.username)}
                      onDragEnd={handleDragEnd}
                    >
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 opacity-50 group-hover:opacity-100 transition-opacity">
                              <GripVertical size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{emp.username}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{emp.fullId}</span>
                            </div>
                          </div>
                          <select
                            value={emp.shiftType || ''}
                            onChange={e => handleUpdateShiftType(emp.username, e.target.value)}
                            className={`text-[9px] font-black uppercase border-none rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                              emp.shiftType === 'Hành Chính' 
                                ? 'bg-red-100 text-red-600' 
                                : emp.shiftType === 'Sáng' || emp.shiftType === 'Chiều'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <option value="">-- Chọn --</option>
                            <option value="Sáng">Sáng</option>
                            <option value="Chiều">Chiều</option>
                            <option value="Hành Chính">Hành Chính</option>
                          </select>
                        </div>
                      </td>
                      <td className="sticky left-64 z-20 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 px-2 py-2 text-center font-black text-indigo-600 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {calculateWeeklyTotal(emp).toLocaleString()}
                      </td>
                      {weekDates.map((date, i) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isOff = emp.shifts?.[dateStr]?.isOff;
                        const isHCDay = [1, 2, 3, 4, 5].every(s => (emp.shifts?.[dateStr]?.[`ca${s}`] || 0) > 0);
                        return (
                          <td key={i} colSpan={5} className={`border-r-2 border-slate-400 p-0 relative transition-colors ${isOff ? 'bg-red-50' : ''}`}>
                            <div className="flex flex-col h-full">
                              <button
                                onClick={() => handleToggleOff(emp.username, date)}
                                className={`absolute top-0 right-0 z-10 px-1 py-0.5 text-[8px] font-bold uppercase transition-colors rounded-bl border-l border-b border-slate-200 ${isOff ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                              >
                                {isOff ? 'OFF' : 'OFF?'}
                              </button>
                              <div className="flex h-full">
                                {SHIFTS.map((_, sIdx) => {
                                  const val = emp.shifts?.[dateStr]?.[`ca${sIdx + 1}`] || '';
                                  return (
                                    <div key={sIdx} className="flex-1 min-w-[30px] border-r border-slate-100 last:border-r-0">
                                      <input
                                        type="text"
                                        value={isOff ? '-' : val}
                                        onChange={e => handleUpdateShift(emp.username, date, sIdx, e.target.value)}
                                        className={`w-full h-full min-h-[32px] text-center font-bold bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                          isOff ? 'text-red-600' : (isHCDay ? 'text-amber-700 bg-yellow-100/50' : (showOnlyHC ? 'text-transparent select-none focus:text-slate-700' : 'text-slate-700'))
                                        }`}
                                        disabled={isOff}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Table for HC Shifts */}
      <div ref={summaryTableRef} className="mt-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mx-4 mb-8">
        <div className="bg-[#004b8d] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-white" />
            <h2 className="text-white font-bold uppercase tracking-wider text-sm">Tóm tắt nhân viên đi ca hành chính (Tuần)</h2>
          </div>
          <button 
            onClick={handleExportSummaryImage}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-black uppercase border border-white/30"
          >
            <Camera size={14} />
            Xuất ảnh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 w-1/4">Nhân viên</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500">Ngày đi ca hành chính</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 w-24 text-center">Tổng ngày</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const hcDays = weekDates.filter(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return [1, 2, 3, 4, 5].every(s => (emp.shifts?.[dateStr]?.[`ca${s}`] || 0) > 0);
                }).map(date => format(date, 'dd/MM'));

                if (hcDays.length === 0) return null;

                return (
                  <tr key={emp.username} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700 text-sm">{emp.username}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {hcDays.map((day, dIdx) => (
                          <span key={dIdx} className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                            {day}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-black">
                        {hcDays.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {employees.length > 0 && employees.every(emp => {
                return !weekDates.some(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return [1, 2, 3, 4, 5].every(s => (emp.shifts?.[dateStr]?.[`ca${s}`] || 0) > 0);
                });
              }) && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                    Không có nhân viên nào đi ca hành chính trong tuần này.
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

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[110]">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận làm mới</h3>
            <p className="text-slate-600 mb-6 text-sm">Bạn có chắc chắn muốn xóa toàn bộ dữ liệu phân ca hiện tại? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setEmployees(prev => {
                    const updated = prev.map(emp => ({ ...emp, shifts: {} }));
                    handleSaveToFirebaseDirect(updated);
                    return updated;
                  });
                  setShowResetConfirm(false);
                  setSaveMessage({ type: 'success', text: 'Đã làm mới bảng phân ca và lưu Firebase!' });
                  setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Xóa dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
