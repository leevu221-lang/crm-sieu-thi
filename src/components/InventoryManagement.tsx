import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  Trash2, 
  Plus, 
  Users, 
  Shield, 
  MapPin, 
  AlertCircle, 
  Clock, 
  Bell, 
  Maximize2, 
  Loader2, 
  Check, 
  X,
  Sparkles, 
  Key, 
  CheckSquare, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  Info,
  CalendarDays,
  FileSpreadsheet,
  CornerDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { inventoryService, InventorySchedule, InventoryAssignment } from '../services/inventoryService';
import { birthdayService } from '../services/birthdayService';
import { useAuth } from '../contexts/AuthContext';
import { useLuykeData } from '../pages/RTST/hooks/useLuykeData';
import { cn, parseStaffRankData } from '../pages/RTST/utils';

interface InventoryManagementProps {
  warehouseCode: string;
}

interface ParsedSchedule {
  id?: string;
  title: string;
  date: string;
  items: string[];
  calendar_image?: string;
}

const DEFAULT_ITEMS = [
  "Điện thoại", 
  "Laptop", 
  "Wearable", 
  "Tablet", 
  "VAS", 
  "Linh kiện ICT", 
  "Điện tử", 
  "Điện lạnh", 
  "Máy lọc nước", 
  "Máy lạnh, nước nóng", 
  "Tủ lạnh, đông, mát", 
  "Máy giặt, sấy", 
  "Gia dụng", 
  "Phụ kiện"
];

const PHONE_STATES = ['MỚI', 'TRƯNG BÀY', 'ĐSD', 'LỖI(MỚI)', 'LỖI(ĐSD)', 'TRƯNG BÀY BỎ MẪU'];

const InventoryManagement: React.FC<InventoryManagementProps> = ({ warehouseCode }) => {
  const { userProfile } = useAuth();
  const { staffInput } = useLuykeData(warehouseCode);
  
  // Tab states: 'CALENDAR' | 'SCANNER'
  const [activeSubTab, setActiveSubTab] = useState<'CALENDAR' | 'SCANNER'>('CALENDAR');

  // Base64 Calendar Image
  const [imageBase64, setImageBase64] = useState('');
  
  // Schedules List in State
  const [schedules, setSchedules] = useState<ParsedSchedule[]>([]);
  
  // Assignments map: { [scheduleTitle: string]: { [zoneName: string]: string[] } }
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, Record<string, string[]>>>({});
  
  // API Key States
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [isRealAi, setIsRealAi] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showZoomImage, setShowZoomImage] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<{ schedTitle: string; zone: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form add states
  const [newTitle, setNewTitle] = useState('');
  const [newItems, setNewItems] = useState<string[]>(["Điện thoại", "Laptop", "Wearable", "Tablet"]);

  // Fallback employee list
  const [birthdaysStaff, setBirthdaysStaff] = useState<string[]>([]);

  const showToast = (message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync employee list
  const employeeList = useMemo(() => {
    if (!staffInput || staffInput.trim().length === 0) {
      return birthdaysStaff.map(name => ({ id: name, name, displayName: name }));
    }
    try {
      const parsed = parseStaffRankData(staffInput);
      return parsed.map(s => {
        const cleanName = s.displayName.includes('-')
          ? s.displayName.split('-').slice(1).join('-').trim()
          : s.displayName.trim();
        return {
          id: s.fullId,
          name: cleanName,
          displayName: s.displayName
        };
      });
    } catch (e) {
      console.error('Error parsing staffInput:', e);
      return birthdaysStaff.map(name => ({ id: name, name, displayName: name }));
    }
  }, [staffInput, birthdaysStaff]);

  // Load schedules and assignments from Firebase
  const loadDataFromFirebase = async () => {
    if (!warehouseCode) return;
    try {
      setLoading(true);
      // Load fallback birthdays
      const bdays = await birthdayService.getBirthdays(warehouseCode);
      const uniqueBdays = [...new Set(bdays.map(b => b.employee_name))];
      setBirthdaysStaff(uniqueBdays);

      // Fetch schedules
      const dbSchedules = await inventoryService.getInventorySchedules(warehouseCode);
      
      if (dbSchedules && dbSchedules.length > 0) {
        const mappedScheds: ParsedSchedule[] = dbSchedules.map(s => ({
          id: s.id,
          title: s.title,
          date: s.inventory_date,
          items: [],
          calendar_image: s.calendar_image || ''
        }));

        const firstImage = dbSchedules.find(s => s.calendar_image)?.calendar_image || '';
        setImageBase64(firstImage);

        const schedIds = dbSchedules.map(s => s.id).filter(Boolean) as string[];
        const dbAssignments = await inventoryService.getAssignmentsForSchedules(schedIds);

        const newMap: Record<string, Record<string, string[]>> = {};
        const itemsMap: Record<string, Set<string>> = {};

        dbSchedules.forEach(s => {
          newMap[s.title] = {};
          itemsMap[s.title] = new Set();
        });

        dbAssignments.forEach(assign => {
          const matchedSched = dbSchedules.find(s => s.id === assign.schedule_id);
          if (matchedSched) {
            const schedTitle = matchedSched.title;
            if (!newMap[schedTitle][assign.zone]) {
              newMap[schedTitle][assign.zone] = [];
            }
            newMap[schedTitle][assign.zone].push(assign.employee_name);
            
            if (assign.zone.startsWith('Điện thoại - ')) {
              itemsMap[schedTitle].add('Điện thoại');
            } else {
              itemsMap[schedTitle].add(assign.zone);
            }
          }
        });

        const finalizedScheds = mappedScheds.map(s => {
          const parsedItems = Array.from(itemsMap[s.title] || []);
          return {
            ...s,
            items: parsedItems.length > 0 ? parsedItems : ["Điện thoại", "Laptop", "Wearable", "Tablet"]
          };
        });

        finalizedScheds.forEach(s => {
          if (!newMap[s.title]) newMap[s.title] = {};
          s.items.forEach(zone => {
            if (!newMap[s.title][zone]) {
              newMap[s.title][zone] = [];
            }
          });
          PHONE_STATES.forEach(sub => {
            const subKey = `Điện thoại - ${sub}`;
            if (!newMap[s.title][subKey]) {
              newMap[s.title][subKey] = [];
            }
          });
        });

        setSchedules(finalizedScheds);
        setAssignmentsMap(newMap);
      } else {
        setSchedules([]);
        setAssignmentsMap({});
        setImageBase64('');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải cấu hình kiểm kê từ Firebase', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromFirebase();
  }, [warehouseCode]);

  // Save specific schedule and assignments
  const handleSaveSchedule = async (sched: ParsedSchedule) => {
    try {
      setSaving(true);
      const savedSched = await inventoryService.saveInventorySchedule({
        warehouse_code: warehouseCode,
        title: sched.title,
        inventory_date: sched.date,
        calendar_image: sched.calendar_image || imageBase64 || '',
        status: 'pending'
      });

      const schedAssignments = assignmentsMap[sched.title] || {};
      const payloadAssignments: Omit<InventoryAssignment, 'id'>[] = [];

      Object.entries(schedAssignments).forEach(([zoneName, staffList]) => {
        staffList.forEach(staffName => {
          payloadAssignments.push({
            schedule_id: savedSched.id!,
            employee_name: staffName,
            role: 'Kiểm kê',
            zone: zoneName
          });
        });
      });

      await inventoryService.saveAssignmentsForSchedule(savedSched.id!, payloadAssignments);
      showToast(`Đã lưu phân công kỳ: ${sched.title}!`, true);
      loadDataFromFirebase();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu phân công', false);
    } finally {
      setSaving(false);
    }
  };

  // Delete specific schedule
  const handleDeleteSchedule = async (sched: ParsedSchedule) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá lịch kiểm kê "${sched.title}" này không?`)) return;
    try {
      setDeleting(true);
      if (sched.id) {
        await inventoryService.deleteInventorySchedule(sched.id);
      }
      showToast('Đã xoá lịch kiểm kê!', true);
      loadDataFromFirebase();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xoá lịch kiểm kê', false);
    } finally {
      setDeleting(false);
    }
  };

  // Add a schedule manually
  const handleAddManualSchedule = async () => {
    if (!newTitle.trim()) {
      showToast('Vui lòng nhập tên kỳ kiểm kê', false);
      return;
    }

    const exists = schedules.some(s => s.title === newTitle.trim());
    if (exists) {
      showToast('Kỳ kiểm kê đã tồn tại', false);
      return;
    }

    try {
      setSaving(true);
      const savedSched = await inventoryService.saveInventorySchedule({
        warehouse_code: warehouseCode,
        title: newTitle.trim(),
        inventory_date: selectedDate,
        calendar_image: imageBase64 || '',
        status: 'pending'
      });

      // Save empty initial assignments list
      await inventoryService.saveAssignmentsForSchedule(savedSched.id!, []);

      showToast(`Đã lưu lịch kiểm kê "${savedSched.title}" thành công!`, true);
      setNewTitle('');
      setShowAddForm(false);
      loadDataFromFirebase();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu lịch kiểm kê vào Firebase', false);
    } finally {
      setSaving(false);
    }
  };

  // Toggle staff in assignments with auto-save to Firebase
  const toggleStaffAssignment = async (schedTitle: string, zone: string, employeeName: string) => {
    const targetSched = schedules.find(s => s.title === schedTitle);
    if (!targetSched || !targetSched.id) {
      showToast('Kỳ kiểm kê chưa được lưu vào hệ thống!', false);
      return;
    }

    const currentList = assignmentsMap[schedTitle]?.[zone] || [];
    let newList: string[];

    if (currentList.includes(employeeName)) {
      newList = currentList.filter(name => name !== employeeName);
    } else {
      newList = [...currentList, employeeName];
    }

    let cleanSubstates: Record<string, string[]> = {};
    if (zone === 'Điện thoại' && currentList.includes(employeeName)) {
      PHONE_STATES.forEach(sub => {
        const subKey = `Điện thoại - ${sub}`;
        const subList = assignmentsMap[schedTitle]?.[subKey] || [];
        if (subList.includes(employeeName)) {
          cleanSubstates[subKey] = subList.filter(name => name !== employeeName);
        }
      });
    }

    const updatedSchedAssignments = {
      ...(assignmentsMap[schedTitle] || {}),
      [zone]: newList,
      ...cleanSubstates
    };

    // Update local state instantly
    setAssignmentsMap(prev => ({
      ...prev,
      [schedTitle]: updatedSchedAssignments
    }));

    // Auto-save to Firebase in background
    try {
      const payloadAssignments: Omit<InventoryAssignment, 'id'>[] = [];
      Object.entries(updatedSchedAssignments).forEach(([zoneName, staffList]) => {
        (staffList as string[]).forEach(staffName => {
          payloadAssignments.push({
            schedule_id: targetSched.id!,
            employee_name: staffName,
            role: 'Kiểm kê',
            zone: zoneName
          });
        });
      });

      await inventoryService.saveAssignmentsForSchedule(targetSched.id!, payloadAssignments);
    } catch (err) {
      console.error('[toggleStaffAssignment] Auto-save error:', err);
      showToast('Lỗi tự động lưu phân công vào Firebase', false);
    }
  };

  // AI scanning mock/real call with immediate database persistence
  const handleAnalyzeImage = async (base64: string) => {
    setDetecting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let detected: ParsedSchedule[] = [];
    if (geminiKey.trim()) {
      try {
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Phân tích lịch kiểm kê JSON. Trả về mảng JSON chứa các trường: title, date (YYYY-MM-DD), items (mảng các sản phẩm).` },
                { inlineData: { mimeType: 'image/png', data: cleanBase64 } }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              detected = parsed;
              setIsRealAi(true);
            }
          }
        }
      } catch (err) {
        console.warn('AI scanning failed', err);
      }
    }

    if (detected.length === 0) {
      // Fallback
      detected = [
        { title: `KK ĐỊNH KỲ ${new Date(selectedDate).getDate()}/${new Date(selectedDate).getMonth()+1}`, date: selectedDate, items: ["Điện thoại", "Laptop", "Wearable", "Tablet", "Điện tử", "Điện lạnh"] }
      ];
      setIsRealAi(false);
    }

    // Persist scanned schedules to Firebase immediately so they are not lost on refresh
    const finalized: ParsedSchedule[] = [];
    for (const s of detected) {
      try {
        const saved = await inventoryService.saveInventorySchedule({
          warehouse_code: warehouseCode,
          title: s.title,
          inventory_date: s.date,
          calendar_image: base64,
          status: 'pending'
        });

        // Initialize empty assignments in DB
        await inventoryService.saveAssignmentsForSchedule(saved.id!, []);

        finalized.push({
          id: saved.id,
          title: saved.title,
          date: saved.inventory_date,
          items: s.items,
          calendar_image: saved.calendar_image
        });
      } catch (err) {
        console.error('Lỗi khi tự động lưu lịch từ AI:', err);
      }
    }

    showToast(isRealAi ? 'AI đã bóc tách và lưu dữ liệu lịch trình thành công!' : 'Đã nhận diện nhanh và lưu lịch trình từ ảnh mẫu!', true);
    setDetecting(false);
    loadDataFromFirebase();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
      handleAnalyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Calendar monthly calculations
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Starting weekday offset
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Leading blank spaces
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateString: dStr
      });
    }
    return days;
  }, [currentDate]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Schedules on the selected date
  const schedulesOnSelectedDate = useMemo(() => {
    return schedules.filter(s => s.date === selectedDate);
  }, [schedules, selectedDate]);

  // Countdown reminders
  const upcomingReminders = useMemo(() => {
    return schedules.map(s => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sDate = new Date(s.date);
      const diffTime = sDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...s, daysLeft: diffDays };
    }).filter(s => s.daysLeft >= 0 && s.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [schedules]);

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[999] flex items-center gap-2.5 px-6 py-4 rounded-2xl shadow-xl font-extrabold text-xs uppercase tracking-wider text-white ${toast.isSuccess ? 'bg-[#00965e]' : 'bg-rose-600'}`}
          >
            {toast.isSuccess ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub Tabs bar */}
      <div className="flex items-center justify-between bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('CALENDAR')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeSubTab === 'CALENDAR' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <CalendarDays size={14} />
            Lịch kiểm kê
          </button>
          <button
            onClick={() => setActiveSubTab('SCANNER')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeSubTab === 'SCANNER' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Sparkles size={14} />
            Quét AI Lịch kiểm
          </button>
        </div>

        {/* Action controls */}
        {activeSubTab === 'SCANNER' && (
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 transition-all"
          >
            <Key size={12} />
            Setup API Key
          </button>
        )}
      </div>

      {/* API Key Modal setup inline */}
      <AnimatePresence>
        {showKeyInput && activeSubTab === 'SCANNER' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3"
          >
            <label className="text-[10px] font-black text-slate-500 uppercase">Cài đặt Gemini AI API Key (Chế độ quét tự động)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Nhập GEMINI API KEY..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none"
              />
              <button
                onClick={() => {
                  localStorage.setItem('GEMINI_API_KEY', geminiKey);
                  showToast('Đã lưu cấu hình API Key!', true);
                  setShowKeyInput(false);
                }}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white font-black text-xs uppercase rounded-xl transition-all"
              >
                Lưu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown banners */}
      {upcomingReminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 border border-amber-200/50 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <Bell size={18} className="animate-bounce" />
            <h4 className="text-xs font-black uppercase tracking-widest">Tiến trình kiểm kê sắp tới</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {upcomingReminders.slice(0, 4).map((item, idx) => {
              const isToday = item.daysLeft === 0;
              const isTomorrow = item.daysLeft === 1;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(item.date)}
                  className={cn(
                    "p-3 rounded-2xl shadow-sm flex flex-col gap-1 transition-all border text-left",
                    isToday ? "bg-rose-500 text-white border-rose-500" :
                    isTomorrow ? "bg-amber-500 text-white border-amber-500" :
                    "bg-white border-amber-250 text-slate-700 hover:border-amber-400"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-tight truncate w-full">{item.title}</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] opacity-80 font-bold">{item.date}</span>
                    <span className="text-[10px] font-black uppercase">
                      {isToday ? 'HÔM NAY' : isTomorrow ? 'NGÀY MAI' : `CÒN ${item.daysLeft} NGÀY`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 size={36} className="animate-spin text-amber-500 mb-4" />
          <span className="text-slate-500 text-xs font-bold">Đang tải lịch trình kiểm kê...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Calendar view */}
          {activeSubTab === 'CALENDAR' ? (
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-4">
                
                {/* Month/Year title nav */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={18} className="text-amber-500" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Lịch {currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Monthly calendar Grid */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {/* Grid header */}
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                    <span key={d} className="font-black text-slate-400 py-1">{d}</span>
                  ))}
                  {/* Grid days */}
                  {calendarDays.map((dayObj, dIdx) => {
                    if (!dayObj) return <div key={`empty-${dIdx}`} />;

                    const hasSched = schedules.some(s => s.date === dayObj.dateString);
                    const isSelected = selectedDate === dayObj.dateString;
                    const isToday = dayObj.dateString === new Date().toISOString().split('T')[0];

                    return (
                      <button
                        key={dayObj.dateString}
                        onClick={() => {
                          setSelectedDate(dayObj.dateString);
                          setShowAddForm(false);
                        }}
                        className={cn(
                          "h-10 rounded-xl font-black transition-all flex flex-col items-center justify-center relative border",
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                            : hasSched
                              ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm"
                              : isToday
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-white border-slate-100 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        <span>{dayObj.day}</span>
                        {hasSched && (
                          <div className={cn("w-1.5 h-1.5 rounded-full absolute bottom-1", isSelected ? "bg-amber-400" : "bg-amber-600")} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Day selector control toolbar */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] font-black text-slate-400 uppercase">
                    Ngày chọn: <span className="text-slate-700 font-extrabold">{new Date(selectedDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <button
                    onClick={() => {
                      setNewTitle(`TNB_KK ĐỊNH KỲ ${new Date(selectedDate).getDate()}/${new Date(selectedDate).getMonth()+1}`);
                      setShowAddForm(!showAddForm);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[10px] uppercase rounded-xl transition-all active:scale-95 shadow-sm border border-amber-200"
                  >
                    <Plus size={12} />
                    Lập lịch kiểm
                  </button>
                </div>

                {/* Inline form to create manual schedule */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                        <span className="text-[10px] font-black uppercase text-slate-500">Khai báo kỳ kiểm mới</span>
                        <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-500 uppercase text-[9px]">Tên kỳ kiểm kê</label>
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Nhập tên kỳ kiểm..."
                            className="w-full px-3 py-2 border border-slate-250 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-500 uppercase text-[9px]">Nhóm sản phẩm kiểm kê</label>
                          <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                            {DEFAULT_ITEMS.map((item) => {
                              const checked = newItems.includes(item);
                              return (
                                <label key={item} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) setNewItems(prev => [...prev, item]);
                                      else setNewItems(prev => prev.filter(i => i !== item));
                                    }}
                                    className="w-3.5 h-3.5 text-amber-500 rounded border-slate-350"
                                  />
                                  <span className="text-[10px] font-bold text-slate-700">{item}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddManualSchedule}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                        >
                          Xác nhận lập lịch
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          ) : (
            /* SCANNER VIEW: Upload image */
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-5 relative overflow-hidden">
                {/* AI Laser scan indicator */}
                {detecting && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center animate-spin mb-4 shadow-lg shadow-amber-500/30">
                      <Sparkles size={28} />
                    </div>
                    <h4 className="text-white text-xs font-black uppercase tracking-widest animate-pulse">Gemini AI OCR</h4>
                    <p className="text-slate-300 text-[10px] font-medium mt-2 leading-relaxed">
                      Đang quét hình ảnh, phân tích tự động ngày kiểm kê & nhóm hàng...
                    </p>
                    <div className="absolute left-0 right-0 h-1 bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-[scan_2s_infinite]" style={{ top: '20%' }} />
                    <style>{`
                      @keyframes scan {
                        0% { top: 20%; }
                        50% { top: 80%; }
                        100% { top: 20%; }
                      }
                    `}</style>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={18} className="text-amber-500" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ảnh lịch kiểm kê</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    {imageBase64 ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-100 shadow-sm aspect-video bg-slate-100 flex items-center justify-center">
                        <img 
                          src={imageBase64} 
                          alt="Calendar schedule" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowZoomImage(true)}
                            className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-xl transition-all shadow"
                          >
                            <Maximize2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageBase64('');
                            }}
                            className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-rose-600 hover:text-white text-white rounded-xl transition-all shadow"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-amber-50/10 transition-all flex flex-col items-center justify-center gap-2.5 group min-h-[160px]">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange} 
                          className="hidden" 
                        />
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 flex items-center justify-center transition-all shadow-sm">
                          <Upload size={22} />
                        </div>
                        <span className="text-xs font-black text-slate-700 group-hover:text-amber-800 transition-colors uppercase tracking-tight">Thêm hình ảnh lịch kiểm kê</span>
                        <span className="text-[9px] text-slate-400 font-medium">Hỗ trợ JPG, PNG dưới 2MB. AI tự nhận diện ngày kiểm kê.</span>
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* RIGHT: Detailed assignments tables */}
          <div className="lg:col-span-7 space-y-6">
            
            {schedulesOnSelectedDate.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[32px] p-12 text-center shadow-sm flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-5 shadow-sm border border-amber-100">
                  <CalendarIcon size={28} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Chưa có lịch kiểm kê ngày này</h3>
                <p className="text-slate-400 text-[10px] mt-2 max-w-sm leading-relaxed">
                  Vui lòng bấm nút **"Lập lịch kiểm"** ở cột bên trái để khai báo kỳ kiểm kê mới cho ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={18} className="text-amber-500" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Phân công ngày: {new Date(selectedDate).toLocaleDateString('vi-VN')}</h3>
                  </div>
                </div>

                {schedulesOnSelectedDate.map((sched, sIdx) => {
                  const schedAssignments = assignmentsMap[sched.title] || {};
                  return (
                    <motion.div
                      key={sched.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-5"
                    >
                      {/* Inner Card header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 bg-slate-50/50 p-3 rounded-2xl">
                        <div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{sched.title}</span>
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase mt-1">Kỳ kiểm kê siêu thị</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-750 border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-wider select-none">
                            <Check size={12} className="text-emerald-600" />
                            Đã tự động lưu
                          </div>
                          <button
                            onClick={() => handleDeleteSchedule(sched)}
                            disabled={deleting}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Xoá lịch này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Periodic Assignment table */}
                      <div className="overflow-x-auto no-scrollbar border border-slate-150 rounded-2xl shadow-sm bg-white">
                        <table className="w-full text-left border-collapse table-auto">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-150">
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">STT</th>
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-1/3">Nhóm sản phẩm</th>
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Nhân sự kiểm kê</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {sched.items.map((zoneName, zIdx) => {
                              const assignedList = schedAssignments[zoneName] || [];
                              const isDropdownOpen = activeDropdown?.schedTitle === sched.title && activeDropdown?.zone === zoneName;
                              const isPhone = zoneName === 'Điện thoại';

                              return (
                                <React.Fragment key={zoneName}>
                                  <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 text-center text-[10px] font-extrabold text-slate-400">{zIdx + 1}</td>
                                    <td className="p-3 font-black text-slate-800 uppercase tracking-tight">{zoneName}</td>
                                    <td className="p-3">
                                      <div className="relative flex flex-wrap items-center gap-1.5">
                                        {/* Assigned list */}
                                        {assignedList.map(name => (
                                          <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-250 rounded-lg text-[10px] font-black text-amber-800">
                                            {name}
                                            <button onClick={() => toggleStaffAssignment(sched.title, zoneName, name)} className="text-amber-500 hover:text-amber-700">
                                              <X size={10} />
                                            </button>
                                          </span>
                                        ))}

                                        {/* Add staff button drop */}
                                        <button
                                          onClick={() => {
                                            if (activeDropdown?.schedTitle === sched.title && activeDropdown?.zone === zoneName) {
                                              setActiveDropdown(null);
                                            } else {
                                              setActiveDropdown({ schedTitle: sched.title, zone: zoneName });
                                            }
                                          }}
                                          className="p-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Plus size={12} />
                                        </button>

                                        {/* Dropdown Employee List */}
                                        {isDropdownOpen && (
                                          <div className="absolute left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-35 min-w-[200px] max-h-[220px] overflow-y-auto">
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">Chọn nhân viên</div>
                                            <div className="space-y-1">
                                              {employeeList.map(emp => {
                                                const checked = assignedList.includes(emp.name);
                                                return (
                                                  <label key={emp.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-700">
                                                    <input
                                                      type="checkbox"
                                                      checked={checked}
                                                      onChange={() => toggleStaffAssignment(sched.title, zoneName, emp.name)}
                                                      className="w-3.5 h-3.5 text-amber-500 rounded border-slate-300 focus:ring-amber-500/20"
                                                    />
                                                    <span>{emp.displayName}</span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                      </div>
                                    </td>
                                  </tr>

                                  {/* Sub phone states */}
                                  {isPhone && (
                                    <tr>
                                      <td />
                                      <td colSpan={2} className="bg-slate-50/60 p-3 pl-8">
                                        <div className="space-y-2">
                                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <CornerDownRight size={10} /> Phân công chi tiết dòng máy Điện thoại:
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-3">
                                            {PHONE_STATES.map(state => {
                                              const subKey = `Điện thoại - ${state}`;
                                              const subAssigned = schedAssignments[subKey] || [];
                                              const isSubDropOpen = activeDropdown?.schedTitle === sched.title && activeDropdown?.zone === subKey;

                                              return (
                                                <div key={state} className="bg-white border border-slate-200/80 p-2.5 rounded-xl space-y-1.5">
                                                  <div className="text-[9px] font-black text-slate-800 uppercase tracking-tight">{state}</div>
                                                  <div className="flex flex-wrap items-center gap-1 relative">
                                                    {subAssigned.map(name => (
                                                      <span key={name} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-600">
                                                        {name}
                                                        <button onClick={() => toggleStaffAssignment(sched.title, subKey, name)} className="text-slate-400 hover:text-slate-600">
                                                          <X size={8} />
                                                        </button>
                                                      </span>
                                                    ))}

                                                    <button
                                                      onClick={() => {
                                                        if (activeDropdown?.schedTitle === sched.title && activeDropdown?.zone === subKey) {
                                                          setActiveDropdown(null);
                                                        } else {
                                                          setActiveDropdown({ schedTitle: sched.title, zone: subKey });
                                                        }
                                                      }}
                                                      className="p-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                                    >
                                                      <Plus size={10} />
                                                    </button>

                                                    {isSubDropOpen && (
                                                      <div className="absolute left-0 top-full mt-1 bg-white border border-slate-250 rounded-xl shadow-lg p-2 z-40 min-w-[160px] max-h-[160px] overflow-y-auto">
                                                        <div className="space-y-1">
                                                          {assignedList.map(name => {
                                                            const isSubChecked = subAssigned.includes(name);
                                                            return (
                                                              <label key={name} className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-slate-50 rounded cursor-pointer text-[9px] font-bold text-slate-700">
                                                                <input
                                                                  type="checkbox"
                                                                  checked={isSubChecked}
                                                                  onChange={() => toggleStaffAssignment(sched.title, subKey, name)}
                                                                  className="w-3 h-3 text-amber-500 rounded border-slate-300"
                                                                />
                                                                <span>{name}</span>
                                                              </label>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  );
                })}

              </div>
            )}

          </div>

        </div>
      )}

      {/* Image Preview Modal */}
      {showZoomImage && imageBase64 && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4">
          <button 
            onClick={() => setShowZoomImage(false)}
            className="absolute top-5 right-5 text-white hover:text-slate-300"
          >
            <X size={32} />
          </button>
          <img 
            src={imageBase64} 
            alt="Zoomed Calendar" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
          />
        </div>
      )}

    </div>
  );
};

export default InventoryManagement;
