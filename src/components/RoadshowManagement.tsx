import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Calendar, MapPin, Users, Megaphone, 
  Sparkles, Edit3, Save, X, FileText, Check, ArrowRight, 
  Flag, CalendarDays, ClipboardCheck, Loader2, Navigation,
  Map, Eye, EyeOff, ClipboardList, Camera, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { cn } from '../pages/RTST/utils';
import * as htmlToImage from 'html-to-image';
import { ImagePreviewModal } from './ImagePreviewModal';

interface RoadshowManagementProps {
  warehouseCode: string;
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
}

export const RoadshowManagement: React.FC<RoadshowManagementProps> = ({ warehouseCode }) => {
  // Tabs: 'PLANNER' (Sắp tuyến nhanh) | 'HISTORY' (Lịch trình & Bản đồ)
  const [activeTab, setActiveTab] = useState<'PLANNER' | 'HISTORY'>('PLANNER');
  
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

  const tableRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  };

  // Listen to Firestore real-time changes
  useEffect(() => {
    if (!warehouseCode) return;
    setLoading(true);
    const docRef = doc(db, 'system_configs', 'roadshow_schedules');

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const storePlans = data[warehouseCode] || [];
        setPlans(storePlans);
      } else {
        setPlans([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching roadshows:', error);
      const cached = localStorage.getItem(`crm_roadshows_${warehouseCode}`);
      if (cached) {
        setPlans(JSON.parse(cached));
      }
      setLoading(false);
    });

    return () => unsub();
  }, [warehouseCode]);

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

  // Handle switching dates or loading data for the selected date
  useEffect(() => {
    if (!warehouseCode || !plannerDate) return;

    // 1. Load Master Staff List
    const cachedMaster = localStorage.getItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    const masterNames: string[] = cachedMaster ? JSON.parse(cachedMaster) : [];

    // 2. Load Shifts for this specific date
    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};

    // Map master names to shift states for this date
    const mappedStaffList: StaffShiftState[] = masterNames.map(name => ({
      name: name.toUpperCase(),
      shift: dateShifts[name.toUpperCase()] || 'off' // Default to 'off' so they can check ca for each date
    }));
    setStaffList(mappedStaffList);

    // 3. Load Configs (Routes, Times) for this specific date
    const cachedConfigs = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`);
    if (cachedConfigs) {
      const configs = JSON.parse(cachedConfigs);
      setMorningTime(configs.morningTime || '7:00');
      setAfternoonTime(configs.afternoonTime || '15:00');
      setMorningRoute(configs.morningRoute || '');
      setAfternoonRoute(configs.afternoonRoute || '');
    } else {
      // Default placeholder states if no configs exist for this date
      setMorningTime('7:00');
      setAfternoonTime('15:00');
      setMorningRoute('');
      setAfternoonRoute('');
    }
  }, [warehouseCode, plannerDate]);

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
    // Sort descending
    const sorted = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    setRecentDates(sorted);
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

  // Load staff pasted list into Master Staff List
  const handleLoadStaff = () => {
    const names = rawStaffInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .map(name => name.toUpperCase());

    if (names.length === 0) {
      showToast('Vui lòng nhập tên nhân viên!', false);
      return;
    }

    // 1. Save to Master Staff List (preserves employee list database)
    localStorage.setItem(`crm_roadshow_planner_master_staff_${warehouseCode}`, JSON.stringify(names));

    // 2. Set current date shifts (load shifts or default to 'off')
    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    const dateShifts: Record<string, 'sang' | 'chieu' | 'off' | 'dup'> = cachedShifts ? JSON.parse(cachedShifts) : {};

    const newStaffList: StaffShiftState[] = names.map(name => ({
      name,
      shift: dateShifts[name] || 'off'
    }));

    setStaffList(newStaffList);
    setRawStaffInput('');
    showToast(`Đã nạp thành công ${names.length} nhân viên vào danh sách!`, true);
    updateRecentDatesList();
  };

  // Update employee shift and save specifically for the selected date
  const handleUpdateShift = (index: number, shift: 'sang' | 'chieu' | 'off' | 'dup') => {
    const updated = [...staffList];
    updated[index].shift = shift;
    setStaffList(updated);

    // Save date-specific shifts
    const shiftMap: Record<string, string> = {};
    updated.forEach(s => {
      shiftMap[s.name] = s.shift;
    });
    localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`, JSON.stringify(shiftMap));
    updateRecentDatesList();
  };

  // Clear planner list (removes master list and date shifts)
  const handleClearPlanner = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá danh sách nhân sự hiện tại?')) return;
    setStaffList([]);
    localStorage.removeItem(`crm_roadshow_planner_master_staff_${warehouseCode}`);
    localStorage.removeItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`);
    showToast('Đã xoá danh sách nhân sự!', true);
    updateRecentDatesList();
  };

  // Save planner route/time configs keyed by selected date
  const savePlannerConfigs = (key: string, value: string) => {
    const cachedConfigs = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`);
    const current = cachedConfigs ? JSON.parse(cachedConfigs) : {};
    current[key] = value;
    localStorage.setItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`, JSON.stringify(current));
  };

  // Copy plan from another date
  const handleCopyPlanFromDate = () => {
    if (!copySourceDate) {
      showToast('Vui lòng chọn ngày nguồn để sao chép!', false);
      return;
    }

    // 1. Copy shift state
    const cachedShifts = localStorage.getItem(`crm_roadshow_planner_shifts_${warehouseCode}_${copySourceDate}`);
    if (cachedShifts) {
      localStorage.setItem(`crm_roadshow_planner_shifts_${warehouseCode}_${plannerDate}`, cachedShifts);
      
      const masterNames = staffList.map(s => s.name);
      const dateShifts = JSON.parse(cachedShifts);
      const mapped = masterNames.map(name => ({
        name,
        shift: dateShifts[name] || 'off'
      }));
      setStaffList(mapped);
    }

    // 2. Copy configs (Time/Routes)
    const cachedConfigs = localStorage.getItem(`crm_roadshow_planner_configs_${warehouseCode}_${copySourceDate}`);
    if (cachedConfigs) {
      localStorage.setItem(`crm_roadshow_planner_configs_${warehouseCode}_${plannerDate}`, cachedConfigs);
      const configs = JSON.parse(cachedConfigs);
      setMorningTime(configs.morningTime || '7:00');
      setAfternoonTime(configs.afternoonTime || '15:00');
      setMorningRoute(configs.morningRoute || '');
      setAfternoonRoute(configs.afternoonRoute || '');
    }

    showToast(`Đã sao chép lịch chạy từ ngày ${copySourceDate}!`, true);
  };

  // Filter staff by shifts
  const morningStaff = staffList.filter(s => s.shift === 'sang' || s.shift === 'dup');
  const afternoonStaff = staffList.filter(s => s.shift === 'chieu' || s.shift === 'dup');

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
    if (tableRef.current) {
      setIsCapturing(true);
      try {
        await new Promise(r => setTimeout(r, 200)); // Wait for render
        const dataUrl = await htmlToImage.toPng(tableRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          style: {
            padding: '24px',
            borderRadius: '16px',
            width: '680px',
            margin: '0'
          }
        });
        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Error capturing table image:', err);
        showToast('Chụp ảnh bảng thất bại!', false);
      } finally {
        setIsCapturing(false);
      }
    } else {
      showToast('Không tìm thấy bảng để chụp ảnh!', false);
    }
  };

  // Apply template to History form
  const applyTemplate = (type: 1 | 2 | 3) => {
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

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá lịch trình chạy Roadshow này?')) return;
    
    try {
      const docRef = doc(db, 'system_configs', 'roadshow_schedules');
      const updatedPlans = plans.filter(p => p.id !== id);

      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      currentData[warehouseCode] = updatedPlans;

      await setDoc(docRef, currentData);
      setPlans(updatedPlans);
      localStorage.setItem(`crm_roadshows_${warehouseCode}`, JSON.stringify(updatedPlans));
      showToast('Đã xoá lịch trình chạy thành công!', true);
    } catch (error) {
      console.error('Delete plan failed:', error);
      showToast('Xoá lịch trình thất bại!', false);
    }
  };

  const toggleMapVisibility = (id: string) => {
    setOpenMapIds(prev => ({ ...prev, [id]: !prev[id] }));
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
            "pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all px-2",
            activeTab === 'PLANNER' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Sắp Tuyến Nhanh (Bảng Ảnh)
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all px-2",
            activeTab === 'HISTORY' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Quản Lý Lịch Trình & Bản Đồ Vệ Tinh
        </button>
      </div>

      {/* RENDER PLANNER TAB */}
      {activeTab === 'PLANNER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left Box: Input and Quick check */}
            <div className="xl:col-span-1 space-y-6">
              
              {/* Batch Input Staff Box */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  1. Nhập Nhân Sự Chạy Hôm Nay
                </h3>

                <div className="space-y-3">
                  <textarea
                    rows={4}
                    placeholder="Dán danh sách tên NV (Mỗi dòng một tên)&#10;Ví dụ:&#10;NHẠN&#10;ĐẠI&#10;MI&#10;PHÚC"
                    value={rawStaffInput}
                    onChange={(e) => setRawStaffInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleLoadStaff}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      NẠP DANH SÁCH
                    </button>
                    {staffList.length > 0 && (
                      <button
                        onClick={handleClearPlanner}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        XOÁ HẾT
                      </button>
                    )}
                  </div>
                </div>

                {/* Configurations */}
                <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Chọn ngày chạy Roadshow</label>
                    <input
                      type="date"
                      value={plannerDate}
                      onChange={(e) => setPlannerDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  {/* Copy schedule from another date */}
                  {recentDates.length > 0 && (
                    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-2 mt-2">
                      <label className="block text-[9px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                        <Copy size={10} />
                        Sao chép từ ngày chạy cũ
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={copySourceDate}
                          onChange={(e) => setCopySourceDate(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none"
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
                              ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700" 
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
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Giờ ca sáng</label>
                      <input
                        type="text"
                        value={morningTime}
                        onChange={(e) => {
                          setMorningTime(e.target.value);
                          savePlannerConfigs('morningTime', e.target.value);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Giờ ca chiều</label>
                      <input
                        type="text"
                        value={afternoonTime}
                        onChange={(e) => {
                          setAfternoonTime(e.target.value);
                          savePlannerConfigs('afternoonTime', e.target.value);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff shift assignment */}
              {staffList.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-3 flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-indigo-600" />
                    2. Check Ca Nhân Viên nhanh ({getFormattedDateLabel(plannerDate)})
                  </h3>
                  
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {staffList.map((staff, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border border-slate-100 rounded-xl bg-slate-55">
                        <span className="text-xs font-black text-slate-700 truncate max-w-[120px]">{staff.name}</span>
                        <div className="flex gap-1.5">
                          {(['sang', 'chieu', 'dup', 'off'] as const).map((shiftType) => (
                            <button
                              key={shiftType}
                              onClick={() => handleUpdateShift(idx, shiftType)}
                              className={cn(
                                "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                                staff.shift === shiftType
                                  ? shiftType === 'sang' ? "bg-amber-400 text-slate-900" :
                                    shiftType === 'chieu' ? "bg-indigo-600 text-white" :
                                    shiftType === 'dup' ? "bg-purple-600 text-white animate-pulse" :
                                    "bg-rose-500 text-white"
                                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                              )}
                            >
                              {shiftType === 'sang' ? 'SÁNG' : shiftType === 'chieu' ? 'CHIỀU' : shiftType === 'dup' ? 'ĐÚP' : 'OFF'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Results table styled exactly as requested */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">3. Báo cáo Tuyến Chạy Roadshow</h3>
                    <p className="text-slate-400 text-xs font-bold">Dữ liệu được lưu độc lập theo từng ngày. Đổi ngày chạy ở ô bên trái để lập lịch ngày khác.</p>
                  </div>
                  
                  <button
                    onClick={handleCaptureTable}
                    disabled={isCapturing || staffList.length === 0}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95",
                      isCapturing || staffList.length === 0
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    )}
                  >
                    <Camera size={14} />
                    {isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH LỊCH CHẠY'}
                  </button>
                </div>

                {staffList.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-xs font-black uppercase">Chưa có dữ liệu nhân sự để hiển thị</p>
                    <p className="text-slate-400/80 text-[11px] mt-1 font-bold">Vui lòng nạp danh sách nhân sự ở ô bên trái để tự động tạo bảng.</p>
                  </div>
                ) : (
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-md p-1">
                    
                    {/* Capturable container wrapper */}
                    <div ref={tableRef} className="bg-white p-3 font-sans">
                      
                      <table className="w-full border-collapse border border-black min-w-[550px] bg-white">
                        <thead>
                          <tr className="bg-[#fef08a] h-[50px] border-b border-black">
                            <th className="border-r border-black px-2 py-3 text-center text-[15px] font-utm-avo font-black uppercase text-red-600 w-16">STT</th>
                            <th className="border-r border-black px-3 py-3 text-left text-[15px] font-utm-avo font-black uppercase text-red-600 w-[200px]">NHÂN VIÊN</th>
                            <th className="border-r border-black px-3 py-3 text-center text-[15px] font-utm-avo font-black uppercase text-red-600 w-[180px]">{getFormattedDateLabel(plannerDate)}</th>
                            <th className="border-r border-black px-3 py-3 text-left text-[15px] font-utm-avo font-black uppercase text-red-600">TUYẾN ĐƯỜNG</th>
                          </tr>
                        </thead>
                        <tbody>
                          
                          {/* MORNING SHIFT SECTION */}
                          {morningStaff.length === 0 ? (
                            <tr className="border-b border-black">
                              <td className="border-r border-black px-2 py-4 text-center text-xs font-bold text-slate-400">-</td>
                              <td className="border-r border-black px-3 py-4 text-left text-xs font-bold text-slate-400 italic">Không có NV ca sáng</td>
                              <td className="border-r border-black px-3 py-4 text-center text-xs font-bold text-slate-400 italic">{morningTime} {getFormattedDateLabel(plannerDate)}</td>
                              <td className="border-r border-black px-3 py-4 text-left text-xs font-bold text-slate-400 italic">Chưa sắp tuyến</td>
                            </tr>
                          ) : (
                            morningStaff.map((staff, sIdx) => (
                              <tr key={`morning-${sIdx}`} className="border-b border-black h-[48px]">
                                <td className="border-r border-black px-2 py-1.5 text-center text-[16px] font-utm-avo font-black text-black">
                                  {sIdx + 1}
                                </td>
                                <td className="border-r border-black px-3 py-1.5 text-left text-[16px] font-utm-avo font-black text-black uppercase">
                                  {staff.name}
                                </td>
                                <td className="border-r border-black px-3 py-1.5 text-center text-[15px] font-utm-avo font-black text-black">
                                  {morningTime} {getFormattedDateLabel(plannerDate)}
                                </td>
                                {sIdx === 0 && (
                                  <td 
                                    rowSpan={morningStaff.length} 
                                    className="border-r border-black px-3 py-2 text-left text-[14px] font-utm-avo font-black text-black align-middle bg-white w-[250px]"
                                  >
                                    {isCapturing ? (
                                      <div className="whitespace-pre-wrap font-utm-avo font-black text-black leading-relaxed p-1">
                                        {morningRoute}
                                      </div>
                                    ) : (
                                      <textarea
                                        rows={Math.max(3, morningStaff.length)}
                                        value={morningRoute}
                                        onChange={(e) => {
                                          setMorningRoute(e.target.value);
                                          savePlannerConfigs('morningRoute', e.target.value);
                                        }}
                                        className="w-full h-full border-0 bg-transparent resize-none focus:outline-none p-1 font-utm-avo font-black text-black leading-relaxed"
                                        placeholder="Nhập tuyến đường ca sáng..."
                                      />
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}

                          {/* GREEN SEPARATOR ROW */}
                          <tr className="bg-[#86efac] h-7 border-b border-black">
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                          </tr>

                          {/* AFTERNOON SHIFT SECTION */}
                          {afternoonStaff.length === 0 ? (
                            <tr>
                              <td className="border-r border-black px-2 py-4 text-center text-xs font-bold text-slate-400">-</td>
                              <td className="border-r border-black px-3 py-4 text-left text-xs font-bold text-slate-400 italic">Không có NV ca chiều</td>
                              <td className="border-r border-black px-3 py-4 text-center text-xs font-bold text-slate-400 italic">{afternoonTime} {getFormattedDateLabel(plannerDate)}</td>
                              <td className="border-r border-black px-3 py-4 text-left text-xs font-bold text-slate-400 italic">Chưa sắp tuyến</td>
                            </tr>
                          ) : (
                            afternoonStaff.map((staff, aIdx) => (
                              <tr key={`afternoon-${aIdx}`} className={cn(aIdx < afternoonStaff.length - 1 ? "border-b border-black" : "", "h-[48px]")}>
                                <td className="border-r border-black px-2 py-1.5 text-center text-[16px] font-utm-avo font-black text-black">
                                  {aIdx + 1}
                                </td>
                                <td className="border-r border-black px-3 py-1.5 text-left text-[16px] font-utm-avo font-black text-black uppercase">
                                  {staff.name}
                                </td>
                                <td className="border-r border-black px-3 py-1.5 text-center text-[15px] font-utm-avo font-black text-black">
                                  {afternoonTime} {getFormattedDateLabel(plannerDate)}
                                </td>
                                {aIdx === 0 && (
                                  <td 
                                    rowSpan={afternoonStaff.length} 
                                    className="border-r border-black px-3 py-2 text-left text-[14px] font-utm-avo font-black text-black align-middle bg-white w-[250px]"
                                  >
                                    {isCapturing ? (
                                      <div className="whitespace-pre-wrap font-utm-avo font-black text-black leading-relaxed p-1">
                                        {afternoonRoute}
                                      </div>
                                    ) : (
                                      <textarea
                                        rows={Math.max(3, afternoonStaff.length)}
                                        value={afternoonRoute}
                                        onChange={(e) => {
                                          setAfternoonRoute(e.target.value);
                                          savePlannerConfigs('afternoonRoute', e.target.value);
                                        }}
                                        className="w-full h-full border-0 bg-transparent resize-none focus:outline-none p-1 font-utm-avo font-black text-black leading-relaxed"
                                        placeholder="Nhập tuyến đường ca chiều..."
                                      />
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}

                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER HISTORY & MAPS TAB */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-6">
          {/* Suggested Templates Section */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
                <Sparkles size={24} className="text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Gợi Ý Lộ Trình Mẫu Hợp Lý</h3>
                <p className="text-white/70 text-xs font-medium">Chọn lộ trình tối ưu được thiết kế sẵn để tự động điền nhanh lịch trình chạy!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <button 
                onClick={() => applyTemplate(1)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-36"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900 text-[9px] font-black uppercase tracking-wider">Tuyến Chợ Sáng</span>
                  <h4 className="font-extrabold text-sm mt-2 line-clamp-1">Tuyến Chợ & Dân Cư</h4>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">Chạy chậm quanh khu vực chợ sầm uất lúc sáng sớm.</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-300 font-bold mt-2">
                  Áp dụng ngay <ArrowRight size={14} />
                </div>
              </button>

              <button 
                onClick={() => applyTemplate(2)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-36"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-sky-400 text-slate-900 text-[9px] font-black uppercase tracking-wider">Tuyến Tan Tầm</span>
                  <h4 className="font-extrabold text-sm mt-2 line-clamp-1">Ngã Tư & Cổng Trường</h4>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">Phát tờ rơi nhanh tại ngã tư lớn và cổng trường học giờ ra về.</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-sky-300 font-bold mt-2">
                  Áp dụng ngay <ArrowRight size={14} />
                </div>
              </button>

              <button 
                onClick={() => applyTemplate(3)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-36"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-rose-400 text-white text-[9px] font-black uppercase tracking-wider">Chiến Dịch Xã</span>
                  <h4 className="font-extrabold text-sm mt-2 line-clamp-1">Điểm Tư Vấn Xã Xa</h4>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">Dựng điểm lưu động phát triển thuê bao và tiếp cận người dân liên xã.</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-rose-300 font-bold mt-2">
                  Áp dụng ngay <ArrowRight size={14} />
                </div>
              </button>
            </div>
          </div>

          {/* Main Grid Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Columns - List & Filtering (Span 2) */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <CalendarDays size={18} className="text-indigo-600" />
                    Danh Sách Tuyến Chạy Roadshow
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">TẤT CẢ TRẠNG THÁI</option>
                      <option value="pending">CHƯA BẮT ĐẦU</option>
                      <option value="active">ĐANG DIỄN RA</option>
                      <option value="completed">ĐÃ HOÀN THÀNH</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên chiến dịch, địa danh tuyến đường, leader..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={32} className="text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-400">Đang tải lịch trình chạy...</span>
                  </div>
                ) : filteredPlans.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-xs font-black uppercase">Không tìm thấy lịch trình chạy Roadshow nào</p>
                    <p className="text-slate-400/80 text-[11px] mt-1 font-bold">Hãy lập lịch mới hoặc chọn lịch mẫu gợi ý phía trên.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredPlans.map((plan) => {
                      const nodes = parseRouteNodes(plan.route);
                      const isMapOpen = !!openMapIds[plan.id];

                      return (
                        <div 
                          key={plan.id} 
                          className="border-l-4 border-indigo-600 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-sm overflow-hidden"
                        >
                          <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                                  plan.status === 'completed' && "bg-emerald-100 text-emerald-700",
                                  plan.status === 'active' && "bg-amber-100 text-amber-700 animate-pulse",
                                  plan.status === 'pending' && "bg-slate-200 text-slate-700"
                                )}>
                                  {plan.status === 'completed' ? 'Đã hoàn thành' : plan.status === 'active' ? 'Đang diễn ra' : 'Chưa bắt đầu'}
                                </span>
                                <span className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1">
                                  <Calendar size={12} />
                                  {plan.date} ({plan.timeRange})
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(plan)}
                                  className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                                  title="Chỉnh sửa"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                                  title="Xoá lịch"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                            
                            <h4 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">{plan.title}</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <MapPin size={12} className="text-rose-500" />
                                  Sơ đồ hành trình chạy (Milestones)
                                </span>
                                
                                {nodes.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-y-2.5 gap-x-1.5 pt-1">
                                    {nodes.map((node, nIdx) => (
                                      <React.Fragment key={nIdx}>
                                        <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-lg px-2.5 py-1">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            nIdx === 0 ? "bg-rose-500 animate-ping" : 
                                            nIdx === nodes.length - 1 ? "bg-emerald-500" : "bg-indigo-500"
                                          )} />
                                          <span className="text-[11px] font-black text-slate-700 uppercase">{node}</span>
                                        </div>
                                        {nIdx < nodes.length - 1 && (
                                          <ArrowRight size={14} className="text-slate-400 shrink-0" />
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-800 text-xs font-bold">{plan.route}</span>
                                )}
                              </div>

                              <div className="flex items-start gap-2.5 p-3 border border-slate-100 rounded-xl bg-white">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                  <Users size={16} />
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nhân sự tham gia</p>
                                  <p className="text-xs font-black text-slate-700 mt-0.5">{plan.leader || 'Chưa phân công phụ trách'}</p>
                                  {plan.members && <p className="text-[10px] font-bold text-slate-500">Đoàn chạy: {plan.members}</p>}
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 p-3 border border-slate-100 rounded-xl bg-white">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                                  <Megaphone size={16} />
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Công cụ hỗ trợ</p>
                                  <p className="text-xs font-bold text-slate-700 mt-0.5 line-clamp-2">{plan.props}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 p-3 border border-slate-100 rounded-xl bg-white">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                                  <Flag size={16} />
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Chỉ tiêu cam kết</p>
                                  <p className="text-xs font-bold text-slate-700 mt-0.5 line-clamp-2">{plan.kpis}</p>
                                </div>
                              </div>

                              {plan.notes && (
                                <div className="md:col-span-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 italic font-semibold">
                                  Lưu ý: {plan.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
                              <button
                                onClick={() => toggleMapVisibility(plan.id)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border",
                                  isMapOpen 
                                    ? "bg-rose-50 text-rose-600 border-rose-200" 
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                )}
                              >
                                {isMapOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                                {isMapOpen ? 'ẨN BẢN ĐỒ' : 'XEM BẢN ĐỒ VỆ TINH'}
                              </button>
                              
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(plan.route)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-all"
                              >
                                <Navigation size={14} />
                                DẪN ĐƯỜNG GOOGLE MAPS
                              </a>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isMapOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-200 bg-slate-50"
                              >
                                <div className="p-4 space-y-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Map size={12} className="text-indigo-600" />
                                    Bản đồ vệ tinh thực tế (Google Maps Live Grid)
                                  </span>
                                  <div className="relative rounded-2xl overflow-hidden shadow-inner border border-slate-300/80 bg-slate-200 h-[300px]">
                                    <iframe
                                      width="100%"
                                      height="100%"
                                      style={{ border: 0 }}
                                      loading="lazy"
                                      allowFullScreen
                                      referrerPolicy="no-referrer-when-downgrade"
                                      src={`https://maps.google.com/maps?q=${encodeURIComponent(plan.route)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                    ></iframe>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold text-center italic mt-1">
                                    * Lưu ý: Bản đồ được định vị dựa theo tuyến đường bạn điền.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Columns - Form & Preparation Checklist */}
            <div className="space-y-6">
              
              {/* Add / Edit Form Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  {editingId ? 'Cập Nhật Lịch Trình' : 'Lập Kế Hoạch Mới'}
                </h3>

                <form onSubmit={handleSubmitPlan} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tiêu đề chiến dịch *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Roadshow Sim Số / Điện Lạnh"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Ngày chạy</label>
                      <input
                        type="date"
                        required
                        value={histDate}
                        onChange={(e) => setHistDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Khung giờ chạy</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 08:00 - 10:30"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Người phụ trách chính</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={leader}
                        onChange={(e) => setLeader(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Nhân sự đi cùng</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: B, C, D"
                        value={members}
                        onChange={(e) => setMembers(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Địa chỉ lộ trình (Sơ đồ nối bằng `-&gt;`) *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Điền lộ trình nối tiếp: Siêu thị -> Đường Trần Hưng Đạo -> Chợ Huyện"
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Phương tiện & Công cụ hỗ trợ</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Xe máy + Loa kéo + Cờ phướn"
                      value={props}
                      onChange={(e) => setProps(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Trạng thái chạy</label>
                      <select
                        value={status}
                        onChange={(e: any) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pending">CHƯA BẮT ĐẦU</option>
                        <option value="active">ĐANG DIỄN RA</option>
                        <option value="completed">ĐÃ HOÀN THÀNH</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Chỉ tiêu / Mục tiêu</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Phát 300 tờ rơi"
                        value={kpis}
                        onChange={(e) => setKpis(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Ghi chú bổ sung</label>
                    <textarea
                      rows={2}
                      placeholder="Nhập ghi chú hoặc dặn dò..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 pt-4 mt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    >
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : editingId ? (
                        <Save size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      {editingId ? 'CẬP NHẬT' : 'THÊM LỊCH'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        HỦY
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Checklist Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <ClipboardList size={18} className="text-indigo-600" />
                    Danh Sách Chuẩn Bị
                  </h3>
                  <button 
                    onClick={resetChecklist}
                    className="text-[9px] font-black uppercase text-indigo-600 tracking-wider hover:underline"
                  >
                    LÀM MỚI
                  </button>
                </div>

                <p className="text-[11px] font-semibold text-slate-400 mb-3">Kiểm tra các hạng mục trước khi chạy:</p>

                <div className="space-y-2.5">
                  {checklist.map((item) => (
                    <label 
                      key={item.id} 
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none",
                        item.completed 
                          ? "bg-slate-50/55 border-slate-200/60 opacity-60" 
                          : "bg-white border-slate-200 hover:border-indigo-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                        checked={item.completed}
                        onChange={() => toggleChecklistItem(item.id)}
                      />
                      <span className={cn(
                        "text-xs font-bold text-slate-700 leading-tight",
                        item.completed && "line-through text-slate-400"
                      )}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* Render Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />

    </div>
  );
};
