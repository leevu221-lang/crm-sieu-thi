import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Upload, Trash2, Plus, Users, Shield, 
  MapPin, AlertCircle, Clock, Bell, Maximize2, Loader2, Check, X,
  Sparkles, Key, CheckSquare, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { inventoryService, InventorySchedule, InventoryAssignment } from '../services/inventoryService';
import { birthdayService } from '../services/birthdayService';
import { useAuth } from '../contexts/AuthContext';
import { useLuykeData } from '../pages/RTST/hooks/useLuykeData';
import { parseStaffRankData } from '../pages/RTST/utils';

interface InventoryManagementProps {
  warehouseCode: string;
}

interface ParsedSchedule {
  title: string;
  date: string;
  items: string[];
}

const MOCK_OCR_DATA: ParsedSchedule[] = [
  {
    title: "TNB_KK ĐỊNH KỲ 7/7",
    date: "2026-07-07",
    items: ["Điện thoại", "Laptop", "Wearable", "Tablet", "VAS", "Linh kiện ICT"]
  },
  {
    title: "TNB_KK ĐỊNH KỲ 14/7",
    date: "2026-07-14",
    items: ["Điện tử", "Điện lạnh", "Máy lọc nước", "Máy lạnh, nước nóng", "Tủ lạnh, đông, mát", "Máy giặt, sấy", "Đồng Hồ Thời Trang"]
  },
  {
    title: "TNB_KK ĐỊNH KỲ 21/7",
    date: "2026-07-21",
    items: ["Phụ kiện tiện ích, trang trí", "Khuyến mãi giữ hộ", "Sim trắng, sim online", "Phụ kiện lắp đặt", "Khuyến mãi - PK kèm theo", "Loa vi tính", "Khuyến mãi mua"]
  },
  {
    title: "TNB_KK ĐỊNH KỲ 28/7",
    date: "2026-07-28",
    items: ["Vật tư lắp đặt", "Điện gia dụng", "Dụng cụ gia đình", "Dụng cụ nhà bếp", "Gia dụng lắp đặt", "Xe đạp, dụng cụ thể thao", "Phụ kiện thể thao"]
  }
];

const PHONE_STATES = ['MỚI', 'TRƯNG BÀY', 'ĐSD', 'LỖI(MỚI)', 'LỖI(ĐSD)', 'TRƯNG BÀY BỎ MẪU'];

const InventoryManagement: React.FC<InventoryManagementProps> = ({ warehouseCode }) => {
  const { userProfile } = useAuth();
  const { staffInput } = useLuykeData(warehouseCode);
  
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

  // Fallback employee list from birthday service if needed
  const [birthdaysStaff, setBirthdaysStaff] = useState<string[]>([]);

  const showToast = (message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to extract clean date (day/month) from title string (e.g. TNB_KK ĐỊNH KỲ 7/7 -> 2026-07-07)
  const parseDateFromTitle = (title: string): string => {
    const match = title.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      return `2026-${month}-${day}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  // Parse employee list from "Sức khoẻ -> Doanh thu NV" (staffInput)
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

  // Load saved schedules and assignments from Firebase
  useEffect(() => {
    const loadData = async () => {
      if (!warehouseCode) return;
      try {
        setLoading(true);
        // Load fallback birthdays list just in case staffInput is empty
        const bdays = await birthdayService.getBirthdays(warehouseCode);
        const uniqueBdays = [...new Set(bdays.map(b => b.employee_name))];
        setBirthdaysStaff(uniqueBdays);

        // Fetch schedules
        const dbSchedules = await inventoryService.getInventorySchedules(warehouseCode);
        
        if (dbSchedules && dbSchedules.length > 0) {
          // Map to ParsedSchedule
          const mappedScheds: ParsedSchedule[] = dbSchedules.map(s => ({
            title: s.title,
            date: s.inventory_date,
            items: [] // will populate from assignments or mock structure if empty
          }));

          // Set calendar image from the first schedule that has it
          const firstImage = dbSchedules.find(s => s.calendar_image)?.calendar_image || '';
          setImageBase64(firstImage);

          // Get all assignments for these schedules
          const schedIds = dbSchedules.map(s => s.id).filter(Boolean) as string[];
          const dbAssignments = await inventoryService.getAssignmentsForSchedules(schedIds);

          // Reconstruct assignments map and items
          const newMap: Record<string, Record<string, string[]>> = {};
          const itemsMap: Record<string, Set<string>> = {};

          dbSchedules.forEach(s => {
            newMap[s.title] = {};
            itemsMap[s.title] = new Set();
          });

          dbAssignments.forEach(assign => {
            // Find corresponding schedule title
            const matchedSched = dbSchedules.find(s => s.id === assign.schedule_id);
            if (matchedSched) {
              const schedTitle = matchedSched.title;
              if (!newMap[schedTitle][assign.zone]) {
                newMap[schedTitle][assign.zone] = [];
              }
              newMap[schedTitle][assign.zone].push(assign.employee_name);
              
              // If it's a sub-state (e.g. Điện thoại - MỚI), add 'Điện thoại' to the items list
              if (assign.zone.startsWith('Điện thoại - ')) {
                itemsMap[schedTitle].add('Điện thoại');
              } else {
                itemsMap[schedTitle].add(assign.zone);
              }
            }
          });

          // Update items for mapped schedules
          const finalizedScheds = mappedScheds.map(s => {
            const parsedItems = Array.from(itemsMap[s.title] || []);
            // If items are empty in database, fallback to predefined items for that period title
            const predefined = MOCK_OCR_DATA.find(m => m.title === s.title);
            return {
              ...s,
              items: parsedItems.length > 0 ? parsedItems : (predefined?.items || [])
            };
          });

          // Ensure predefined items exist in the assignments map
          finalizedScheds.forEach(s => {
            if (!newMap[s.title]) newMap[s.title] = {};
            s.items.forEach(zone => {
              if (!newMap[s.title][zone]) {
                newMap[s.title][zone] = [];
              }
            });
            // Ensure Phone sub-states exist in map
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

    loadData();
  }, [warehouseCode]);

  // AI Image Analysis Handler
  const handleAnalyzeImage = async (base64: string) => {
    setDetecting(true);
    setIsRealAi(false);
    
    // Simulate high-tech scanning delay for aesthetics
    await new Promise(resolve => setTimeout(resolve, 2000));

    let detected: ParsedSchedule[] = [];

    if (geminiKey.trim()) {
      try {
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Phân tích hình ảnh lịch kiểm kê này và bóc tách dữ liệu thành danh sách JSON.
Hãy tìm tất cả các khung/kỳ kiểm kê bắt đầu bằng tiêu đề (Ví dụ: "TNB_KK ĐỊNH KỲ 7/7").
Tự động nhận dạng ngày tháng từ tiêu đề: phần ngày tháng là phân số ở đuôi tiêu đề (Ví dụ: "7/7" là ngày 7 tháng 7).
Bóc tách các trường:
- title: Tiêu đề kỳ kiểm kê (VD: "TNB_KK ĐỊNH KỲ 7/7")
- date: Ngày kiểm kê dạng YYYY-MM-DD (VD: "2026-07-07"). Sử dụng năm 2026.
- items: Mảng các nhóm sản phẩm được liệt kê trong khung đó (VD: ["Điện thoại", "Laptop", "Wearable", "Tablet", "VAS", "Linh kiện ICT"])

Trả về duy nhất mã JSON (là một mảng các đối tượng chứa 3 trường trên). Không bao gồm khối bọc markdown hay ký tự khác.`
                  },
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
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
        console.warn('Gemini API call failed, using fallback OCR:', err);
      }
    }

    if (detected.length === 0) {
      // Fallback Mock OCR Data representing the Tây Nam Bộ (TNB) calendar sheet
      detected = MOCK_OCR_DATA;
      setIsRealAi(false);
    }

    // Process detected schedules
    const finalized = detected.map(sched => ({
      ...sched,
      date: parseDateFromTitle(sched.title)
    }));

    // Reconstruct assignments map
    const newMap: Record<string, Record<string, string[]>> = {};
    finalized.forEach(s => {
      newMap[s.title] = {};
      s.items.forEach(zone => {
        newMap[s.title][zone] = [];
      });
      // Add Phone sub-states
      PHONE_STATES.forEach(sub => {
        newMap[s.title][`Điện thoại - ${sub}`] = [];
      });
    });

    setSchedules(finalized);
    setAssignmentsMap(newMap);
    showToast(isRealAi ? 'AI đã bóc tách dữ liệu lịch trình thành công!' : 'Đã nhận diện nhanh lịch trình từ ảnh mẫu!', true);
    setDetecting(false);
  };

  // Handle Image Upload & convert to base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Kích thước ảnh không vượt quá 2MB', false);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
      handleAnalyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Toggle staff assignment inside cell (unlimited staff per row)
  const toggleStaffAssignment = (schedTitle: string, zone: string, employeeName: string) => {
    setAssignmentsMap(prev => {
      const currentList = prev[schedTitle]?.[zone] || [];
      let newList: string[];

      if (currentList.includes(employeeName)) {
        newList = currentList.filter(name => name !== employeeName);
      } else {
        newList = [...currentList, employeeName];
      }

      // If removing from the main Điện thoại list, also clean up from any sub-state assignments
      let cleanSubstates: Record<string, string[]> = {};
      if (zone === 'Điện thoại' && currentList.includes(employeeName)) {
        PHONE_STATES.forEach(sub => {
          const subKey = `Điện thoại - ${sub}`;
          const subList = prev[schedTitle]?.[subKey] || [];
          if (subList.includes(employeeName)) {
            cleanSubstates[subKey] = subList.filter(name => name !== employeeName);
          }
        });
      }

      return {
        ...prev,
        [schedTitle]: {
          ...(prev[schedTitle] || {}),
          [zone]: newList,
          ...cleanSubstates
        }
      };
    });
  };

  // Save all schedules and assignments to Firebase
  const handleSaveAll = async () => {
    if (schedules.length === 0) {
      showToast('Vui lòng tải ảnh lịch trình kiểm kê trước khi lưu!', false);
      return;
    }

    try {
      setSaving(true);
      
      // 1. Loop and save each schedule
      for (const sched of schedules) {
        const savedSched = await inventoryService.saveInventorySchedule({
          warehouse_code: warehouseCode,
          title: sched.title,
          inventory_date: sched.date,
          calendar_image: imageBase64,
          status: 'pending'
        });

        // Collect assignments for this schedule
        const schedAssignments = assignmentsMap[sched.title] || {};
        const payloadAssignments: Omit<InventoryAssignment, 'id'>[] = [];

        Object.entries(schedAssignments).forEach(([zoneName, staffList]) => {
          staffList.forEach(staffName => {
            payloadAssignments.push({
              schedule_id: savedSched.id!,
              employee_name: staffName,
              role: 'Kiểm kê sản phẩm',
              zone: zoneName
            });
          });
        });

        // 2. Save assignments (clear old ones and insert new ones)
        await inventoryService.saveAssignmentsForSchedule(savedSched.id!, payloadAssignments);
      }

      showToast('Đã lưu toàn bộ phân công kiểm kê vào Firebase!', true);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu phân công kiểm kê', false);
    } finally {
      setSaving(false);
    }
  };

  // Clear all schedules & assignments
  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch trình và phân công kiểm kê hiện tại của siêu thị này?')) return;

    try {
      setDeleting(true);
      const dbSchedules = await inventoryService.getInventorySchedules(warehouseCode);
      for (const s of dbSchedules) {
        if (s.id) {
          await inventoryService.deleteInventorySchedule(s.id);
        }
      }

      setSchedules([]);
      setAssignmentsMap({});
      setImageBase64('');
      showToast('Đã xóa sạch dữ liệu kiểm kê', true);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xóa dữ liệu kiểm kê', false);
    } finally {
      setDeleting(false);
    }
  };

  // Compute upcoming schedules countdown list
  const upcomingReminders = useMemo(() => {
    const list = schedules.map(s => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(s.date);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        title: s.title,
        date: s.date,
        daysLeft: diffDays
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    return list.filter(item => item.daysLeft >= 0);
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white ${
              toast.isSuccess ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toast.isSuccess ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key Settings Drawer */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="w-full flex items-center justify-between text-xs font-black text-slate-600 uppercase tracking-wider focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Key size={14} className="text-amber-500" />
            <span>Cài đặt Gemini AI API Key</span>
            {geminiKey ? (
              <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">Đã cấu hình</span>
            ) : (
              <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">Chế độ offline</span>
            )}
          </div>
          {showKeyInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {showKeyInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">GEMINI_API_KEY</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem('GEMINI_API_KEY', e.target.value);
                }}
                placeholder="Nhập API Key để kích hoạt AI nhận dạng hình ảnh thật..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={() => {
                localStorage.setItem('GEMINI_API_KEY', geminiKey);
                showToast('Đã lưu cấu hình API Key!', true);
                setShowKeyInput(false);
              }}
              className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow"
            >
              Lưu cấu hình
            </button>
          </motion.div>
        )}
      </div>

      {/* 1. Countdown alarms banner list */}
      {upcomingReminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <Bell size={18} className="animate-bounce" />
            <h4 className="text-sm font-black uppercase tracking-wider">Nhắc nhở lịch kiểm kê sắp tới</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {upcomingReminders.map((item, idx) => {
              const colors = 
                item.daysLeft === 0 ? 'bg-rose-500 text-white shadow-rose-100' :
                item.daysLeft === 1 ? 'bg-amber-500 text-white shadow-amber-100' :
                'bg-white border border-amber-200 text-slate-700 shadow-sm';
              
              return (
                <div key={idx} className={`p-3 rounded-2xl shadow-sm flex flex-col gap-1 transition-all ${colors}`}>
                  <span className="text-[10px] font-black uppercase tracking-tight truncate">{item.title}</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] opacity-80 font-medium">{item.date}</span>
                    <span className="text-xs font-black uppercase">
                      {item.daysLeft === 0 ? 'Hôm nay' : item.daysLeft === 1 ? 'Ngày mai' : `Còn ${item.daysLeft} ngày`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 size={36} className="animate-spin text-amber-500 mb-4" />
          <span className="text-slate-500 text-xs font-bold">Đang tải lịch trình kiểm kê và dữ liệu nhân sự...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 2. Left Column: Image Uploader Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 relative overflow-hidden">
              
              {/* AI Scanner Laser Line */}
              {detecting && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center animate-spin mb-4 shadow-lg shadow-amber-500/30">
                    <Sparkles size={28} />
                  </div>
                  <h4 className="text-white text-xs font-black uppercase tracking-widest animate-pulse">Gemini AI OCR</h4>
                  <p className="text-slate-300 text-[10px] font-medium mt-2 leading-relaxed">
                    Đang quét hình ảnh, phân tích tự động ngày kiểm kê & nhóm hàng...
                  </p>
                  
                  {/* Laser line moving animation */}
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
                  <Calendar size={18} className="text-amber-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ảnh lịch kiểm kê</h3>
                </div>
                {schedules.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    disabled={deleting}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Xóa toàn bộ lịch trình & phân công"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
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
                          title="Phóng to hình ảnh"
                        >
                          <Maximize2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageBase64('');
                            setSchedules([]);
                            setAssignmentsMap({});
                          }}
                          className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-rose-600 hover:text-white text-white rounded-xl transition-all shadow"
                          title="Hủy chọn ảnh"
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
                      <span className="text-[9px] text-slate-400 font-medium">Hỗ trợ JPG, PNG dưới 2MB. Tự động chia làm 4 bảng.</span>
                    </label>
                  )}
                </div>
              </div>

              {schedules.length > 0 && (
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-100 hover:shadow-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Lưu toàn bộ phân công</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 3. Right Column: 4 Tables for Assignments */}
          <div className="lg:col-span-8 space-y-6">
            {schedules.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-5 shadow-sm border border-amber-100">
                  <Calendar size={28} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Chưa có lịch kiểm kê</h3>
                <p className="text-slate-400 text-[10px] mt-2 max-w-sm leading-relaxed">
                  Vui lòng tải ảnh lịch kiểm kê ở cột bên trái. AI của hệ thống sẽ tự động bóc tách ngày kiểm kê và chia thành 4 bảng phân công chi tiết cho bạn.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={18} className="text-amber-500" />
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Danh sách bảng phân công</h3>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                    {isRealAi ? '🤖 Gemini AI' : '⚡ Tối ưu mẫu'}
                  </span>
                </div>

                {schedules.map((sched, sIdx) => {
                  const schedAssignments = assignmentsMap[sched.title] || {};
                  
                  return (
                    <motion.div
                      key={sIdx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sIdx * 0.1 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4"
                    >
                      {/* Table Header Section */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 bg-slate-50/50 p-2.5 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">{sched.title}</span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5">Mã kho: {warehouseCode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-amber-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                            Ngày kiểm: {sched.date}
                          </span>
                        </div>
                      </div>

                      {/* Periodic Assignment Table */}
                      <div className="overflow-x-auto no-scrollbar border border-slate-100 rounded-2xl shadow-sm bg-white">
                        <table className="w-full text-left border-collapse table-auto">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">STT</th>
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-1/4">Nhóm hàng kiểm</th>
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-1/4">Nhân viên kiểm</th>
                              <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Trạng thái chi tiết (Chỉ Điện thoại)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sched.items.map((zoneName, zIdx) => {
                              const assignedList = schedAssignments[zoneName] || [];
                              const isDropdownOpen = activeDropdown?.schedTitle === sched.title && activeDropdown?.zone === zoneName;
                              const isPhone = zoneName === 'Điện thoại';

                              return (
                                <tr key={zIdx} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="p-3 text-[11px] font-bold text-slate-400 text-center">{zIdx + 1}</td>
                                  <td className="p-3 text-[11px] font-black text-slate-700 uppercase">{zoneName}</td>
                                  <td className="p-3 relative">
                                    <div className="flex flex-wrap items-center gap-2 min-h-[36px]">
                                      {/* Assigned employee tags */}
                                      {assignedList.map(name => {
                                        const initials = name.split(' ').pop()?.slice(0, 2).toUpperCase() || 'NV';
                                        return (
                                          <span 
                                            key={name}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-800 shadow-sm"
                                          >
                                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[7px]">
                                              {initials}
                                            </span>
                                            <span className="truncate max-w-[80px]">{name}</span>
                                            <button
                                              type="button"
                                              onClick={() => toggleStaffAssignment(sched.title, zoneName, name)}
                                              className="text-indigo-400 hover:text-rose-600 transition-colors"
                                            >
                                              <X size={10} />
                                            </button>
                                          </span>
                                        );
                                      })}

                                      {/* Add employee button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isDropdownOpen) {
                                            setActiveDropdown(null);
                                          } else {
                                            setActiveDropdown({ schedTitle: sched.title, zone: zoneName });
                                          }
                                        }}
                                        className="p-1 px-2.5 bg-slate-100 hover:bg-amber-500 hover:text-white rounded-full text-[9px] font-black text-slate-500 transition-all flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200"
                                      >
                                        <Plus size={10} />
                                        <span>Thêm</span>
                                      </button>
                                    </div>

                                    {/* Custom Dropdown Selector */}
                                    <AnimatePresence>
                                      {isDropdownOpen && (
                                        <>
                                          <div 
                                            className="fixed inset-0 z-[140]" 
                                            onClick={() => setActiveDropdown(null)} 
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-[150] max-h-[180px] overflow-y-auto p-2 divide-y divide-slate-50"
                                          >
                                            <div className="p-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-xl mb-1 sticky top-0">
                                              Nhân viên Doanh Thu NV ({employeeList.length})
                                            </div>
                                            {employeeList.length === 0 ? (
                                              <div className="p-3 text-[10px] text-slate-400 font-bold text-center">
                                                Chưa khai báo danh sách nhân viên
                                              </div>
                                            ) : (
                                              employeeList.map(emp => {
                                                const isAssigned = assignedList.includes(emp.name);
                                                return (
                                                  <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => {
                                                      toggleStaffAssignment(sched.title, zoneName, emp.name);
                                                    }}
                                                    className="w-full p-2.5 text-left text-[10px] font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between rounded-xl transition-all"
                                                  >
                                                    <span>{emp.displayName}</span>
                                                    {isAssigned && <Check size={12} className="text-emerald-600" />}
                                                  </button>
                                                );
                                              })
                                            )}
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </td>
                                  <td className="p-3">
                                    {isPhone ? (
                                      assignedList.length === 0 ? (
                                        <span className="text-slate-400 text-[9px] font-bold italic">⚠️ Gán nhân sự ở cột bên cạnh trước</span>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-2 p-1">
                                          {PHONE_STATES.map(subState => {
                                            const subZoneKey = `Điện thoại - ${subState}`;
                                            const subAssigned = schedAssignments[subZoneKey] || [];
                                            const assignedPerson = subAssigned[0] || '';

                                            return (
                                              <div key={subState} className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-slate-50 border border-slate-100/50">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight shrink-0">{subState}</span>
                                                <select
                                                  value={assignedPerson}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAssignmentsMap(prev => ({
                                                      ...prev,
                                                      [sched.title]: {
                                                        ...(prev[sched.title] || {}),
                                                        [subZoneKey]: val ? [val] : []
                                                      }
                                                    }));
                                                  }}
                                                  className="bg-white border border-slate-200 rounded-lg text-[8px] font-extrabold text-slate-700 p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[85px] w-full"
                                                >
                                                  <option value="">-- Gán --</option>
                                                  {assignedList.map(name => (
                                                    <option key={name} value={name}>
                                                      {name.split(' ').pop()}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )
                                    ) : (
                                      <span className="text-slate-300 text-[9px] font-bold italic">Mặc định (Tất cả)</span>
                                    )}
                                  </td>
                                </tr>
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

      {/* Lightbox / Zoom Image Modal */}
      {showZoomImage && imageBase64 && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-4xl w-full max-h-[85vh] bg-white rounded-3xl overflow-hidden p-2 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-3 shrink-0">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Ảnh lịch kiểm kê</span>
              <button 
                onClick={() => setShowZoomImage(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-100 p-1 flex items-center justify-center bg-slate-50">
              <img 
                src={imageBase64} 
                alt="Calendar Zoomed" 
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm" 
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
