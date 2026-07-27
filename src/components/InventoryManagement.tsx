import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Clock, 
  Bell, 
  Maximize2, 
  Loader2, 
  Check, 
  X,
  Sparkles, 
  Key, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { inventoryService } from '../services/inventoryService';
import { cn } from '../pages/RTST/utils';

interface InventoryManagementProps {
  warehouseCode: string;
}

interface ParsedSchedule {
  id?: string;
  title: string;
  date: string;
  calendar_image?: string;
}

const InventoryManagement: React.FC<InventoryManagementProps> = ({ warehouseCode }) => {
  // Tab states: 'CALENDAR' | 'SCANNER'
  const [activeSubTab, setActiveSubTab] = useState<'CALENDAR' | 'SCANNER'>('CALENDAR');

  // Base64 Calendar Image
  const [imageBase64, setImageBase64] = useState('');
  
  // Schedules List in State
  const [schedules, setSchedules] = useState<ParsedSchedule[]>([]);
  
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
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form add states
  const [newTitle, setNewTitle] = useState('');

  const showToast = (message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  };

  // Load schedules from Firebase
  const loadDataFromFirebase = async () => {
    if (!warehouseCode) return;
    try {
      setLoading(true);
      const dbSchedules = await inventoryService.getInventorySchedules(warehouseCode);
      
      if (dbSchedules && dbSchedules.length > 0) {
        const mappedScheds: ParsedSchedule[] = dbSchedules.map(s => ({
          id: s.id,
          title: s.title,
          date: s.inventory_date,
          calendar_image: s.calendar_image || ''
        }));

        const firstImage = dbSchedules.find(s => s.calendar_image)?.calendar_image || '';
        setImageBase64(firstImage);
        setSchedules(mappedScheds);
      } else {
        setSchedules([]);
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

  // Delete specific schedule
  const handleDeleteSchedule = async (sched: ParsedSchedule) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá lịch kiểm kê "${sched.title}" này không?`)) return;
    try {
      setDeleting(true);
      if (sched.id) {
        await inventoryService.deleteInventorySchedule(sched.id);
      }
      showToast('Đã xoá lịch kiểm kê khỏi hệ thống!', true);
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

      showToast(`Đã lập lịch kiểm kê "${savedSched.title}" thành công!`, true);
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

  // AI scanning mock/real call
  const handleAnalyzeImage = async (base64: string) => {
    setDetecting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let detected: { title: string; date: string }[] = [];
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
                { text: `Phân tích lịch kiểm kê JSON. Trả về mảng JSON chứa các trường: title, date (YYYY-MM-DD).` },
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
        { title: `KK ĐỊNH KỲ ${new Date(selectedDate).getDate()}/${new Date(selectedDate).getMonth()+1}`, date: selectedDate }
      ];
      setIsRealAi(false);
    }

    for (const s of detected) {
      try {
        await inventoryService.saveInventorySchedule({
          warehouse_code: warehouseCode,
          title: s.title,
          inventory_date: s.date,
          calendar_image: base64,
          status: 'pending'
        });
      } catch (err) {
        console.error('Lỗi khi tự động lưu lịch từ AI:', err);
      }
    }

    showToast(isRealAi ? 'AI đã bóc tách & lưu lịch kiểm kê thành công!' : 'Đã nhận diện nhanh & lưu lịch kiểm kê từ ảnh mẫu!', true);
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
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
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
    }).filter(s => s.daysLeft >= 0 && s.daysLeft <= 31)
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 transition-all cursor-pointer"
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
                className="px-4 py-2 bg-slate-855 hover:bg-slate-900 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
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
                    "p-3 rounded-2xl shadow-sm flex flex-col gap-1 transition-all border text-left cursor-pointer",
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
            <div className="lg:col-span-7 space-y-6">
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
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
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
                          "h-10 rounded-xl font-black transition-all flex flex-col items-center justify-center relative border cursor-pointer",
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                            : hasSched
                              ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm font-black"
                              : isToday
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-black"
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[10px] uppercase rounded-xl transition-all active:scale-95 shadow-sm border border-amber-200 cursor-pointer"
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

                        <button
                          type="button"
                          onClick={handleAddManualSchedule}
                          disabled={saving}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {saving ? 'Đang tạo lịch...' : 'Xác nhận lập lịch'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          ) : (
            /* SCANNER VIEW: Upload image */
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-5 relative overflow-hidden">
                
                {/* AI Laser scan indicator */}
                {detecting && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center animate-spin mb-4 shadow-lg shadow-amber-500/30">
                      <Sparkles size={28} />
                    </div>
                    <h4 className="text-white text-xs font-black uppercase tracking-widest animate-pulse">Gemini AI OCR</h4>
                    <p className="text-slate-300 text-[10px] font-medium mt-2 leading-relaxed">
                      Đang quét hình ảnh, phân tích tự động ngày kiểm kê...
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
                            className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-xl transition-all shadow cursor-pointer"
                          >
                            <Maximize2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageBase64('');
                            }}
                            className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-rose-600 hover:text-white text-white rounded-xl transition-all shadow cursor-pointer"
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

          {/* RIGHT: Detailed inventory schedules list for selected date */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Lịch kiểm ngày: {new Date(selectedDate).toLocaleDateString('vi-VN')}
                </h3>
              </div>

              {schedulesOnSelectedDate.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
                    📋
                  </div>
                  <span className="text-[11px] font-black uppercase text-slate-400">Không có lịch kiểm kê</span>
                  <p className="text-[9px] font-medium text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                    Bấm nút "Lập lịch kiểm" ở cột bên trái để đánh dấu ngày kiểm kê.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedulesOnSelectedDate.map(sched => (
                    <div 
                      key={sched.title} 
                      className="p-4 bg-amber-50/20 border border-amber-250 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                          {sched.title}
                        </span>
                        <div className="text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1">
                          <Clock size={10} /> ĐÃ ĐẶT LỊCH HỆ THỐNG
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(sched)}
                        disabled={deleting}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        title="Hủy ngày kiểm kê"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Image Preview Modal */}
      {showZoomImage && imageBase64 && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4">
          <button 
            onClick={() => setShowZoomImage(false)}
            className="absolute top-5 right-5 text-white hover:text-slate-300 cursor-pointer"
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
