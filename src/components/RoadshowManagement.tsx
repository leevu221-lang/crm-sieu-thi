import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calendar, MapPin, Users, Megaphone, 
  CheckSquare, Sparkles, Edit3, Save, X, FileText, 
  Check, ArrowRight, Flag, CalendarDays, ClipboardCheck, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { cn } from '../pages/RTST/utils';

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

export const RoadshowManagement: React.FC<RoadshowManagementProps> = ({ warehouseCode }) => {
  const [plans, setPlans] = useState<RoadshowPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeRange, setTimeRange] = useState('08:00 - 10:30');
  const [leader, setLeader] = useState('');
  const [members, setMembers] = useState('');
  const [route, setRoute] = useState('');
  const [props, setProps] = useState('Xe máy gắn cờ phướn, loa kéo phát nhạc');
  const [kpis, setKpis] = useState('Phát 300 tờ rơi, tiếp cận 100 khách hàng');
  const [status, setStatus] = useState<'pending' | 'active' | 'completed'>('pending');
  const [notes, setNotes] = useState('');

  // Filters
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
      // Fallback to local storage
      const cached = localStorage.getItem(`crm_roadshows_${warehouseCode}`);
      if (cached) {
        setPlans(JSON.parse(cached));
      }
      setLoading(false);
    });

    return () => unsub();
  }, [warehouseCode]);

  // Sync checklist from localStorage
  useEffect(() => {
    const cachedChecklist = localStorage.getItem(`crm_roadshow_checklist_${warehouseCode}`);
    if (cachedChecklist) {
      setChecklist(JSON.parse(cachedChecklist));
    }
  }, [warehouseCode]);

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

  // Suggest templates
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
    showToast('Đã áp dụng lịch mẫu gợi ý! Hãy chỉnh sửa thông tin bên dưới.', true);
  };

  // Add or Edit Plan
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
        // Edit mode
        updatedPlans = updatedPlans.map(p => p.id === editingId ? {
          ...p, title, date, timeRange, leader, members, route, props, kpis, status, notes
        } : p);
      } else {
        // Add mode
        const newPlan: RoadshowPlan = {
          id: 'rs-' + Date.now(),
          title, date, timeRange, leader, members, route, props, kpis, status, notes
        };
        updatedPlans.push(newPlan);
      }

      // Read current doc data to preserve other warehouses
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      currentData[warehouseCode] = updatedPlans;

      await setDoc(docRef, currentData);
      setPlans(updatedPlans);
      localStorage.setItem(`crm_roadshows_${warehouseCode}`, JSON.stringify(updatedPlans));
      
      // Reset form
      handleCancelEdit();
      showToast(editingId ? 'Đã cập nhật lịch trình thành công!' : 'Đã tạo lịch trình Roadshow mới!', true);
    } catch (error) {
      console.error('Error saving roadshow:', error);
      showToast('Lưu lịch trình thất bại, vui lòng thử lại!', false);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (plan: RoadshowPlan) => {
    setEditingId(plan.id);
    setTitle(plan.title);
    setDate(plan.date);
    setTimeRange(plan.timeRange);
    setLeader(plan.leader);
    setMembers(plan.members);
    setRoute(plan.route);
    setProps(plan.props);
    setKpis(plan.kpis);
    setStatus(plan.status);
    setNotes(plan.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setTimeRange('08:00 - 10:30');
    setLeader('');
    setMembers('');
    setRoute('');
    setProps('Xe máy gắn cờ phướn, loa kéo phát nhạc');
    setKpis('Phát 300 tờ rơi, tiếp cận 100 khách hàng');
    setStatus('pending');
    setNotes('');
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

  // Filtered plans
  const filteredPlans = plans.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.leader.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 font-sans">
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

      {/* Suggested Templates Section */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
            <Sparkles size={24} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Lịch Trình Roadshow Mẫu Hoàn Hảo</h3>
            <p className="text-white/70 text-xs font-medium">Bấm vào một mẫu bên dưới để tự động tạo nhanh lịch trình chạy tối ưu nhất!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <button 
            onClick={() => applyTemplate(1)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-36"
          >
            <div>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900 text-[9px] font-black uppercase tracking-wider">CHẠY SÁNG</span>
              <h4 className="font-extrabold text-sm mt-2 line-clamp-1">Tuyến Chợ & Dân Cư</h4>
              <p className="text-white/60 text-xs mt-1 line-clamp-2">Thu hút tiểu thương đi chợ sớm. Siêu thị qua khu chợ trung tâm.</p>
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
              <span className="px-2 py-0.5 rounded bg-sky-400 text-slate-900 text-[9px] font-black uppercase tracking-wider">CHẠY CHIỀU</span>
              <h4 className="font-extrabold text-sm mt-2 line-clamp-1">Tuyến Tan Tầm & Trường Học</h4>
              <p className="text-white/60 text-xs mt-1 line-clamp-2">Tiếp cận phụ huynh học sinh và người đi làm về lúc cuối ngày.</p>
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
              <span className="px-2 py-0.5 rounded bg-rose-400 text-white text-[9px] font-black uppercase tracking-wider">CHẠY CẢ NGÀY</span>
              <h4 className="font-extrabold text-sm mt-2 line-clamp-1">Tuyến Điểm / Xã Xa Siêu Thị</h4>
              <p className="text-white/60 text-xs mt-1 line-clamp-2">Điểm lưu động mở sim và giới thiệu dịch vụ tại các xã vùng xa.</p>
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
                placeholder="Tìm kiếm theo tiêu đề, tuyến đường, người phụ trách..."
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
                <p className="text-slate-400/80 text-[11px] mt-1 font-bold">Hãy tạo lịch trình mới ở ô bên phải hoặc nhấn áp dụng Lịch Mẫu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className="p-5 border border-slate-200 hover:border-indigo-300 rounded-2xl bg-slate-50 hover:bg-indigo-50/20 transition-all shadow-sm flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-2">
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
                      
                      <h4 className="text-base font-black text-slate-800">{plan.title}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs font-bold text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-rose-500 shrink-0" />
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-black">Lộ trình:</span>
                          <span className="text-slate-800 line-clamp-1">{plan.route}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Users size={14} className="text-indigo-500 shrink-0" />
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-black">Nhân sự:</span>
                          <span className="text-slate-800">{plan.leader || 'Chưa phân công'} {plan.members && `(${plan.members})`}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Megaphone size={14} className="text-amber-500 shrink-0" />
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-black">Công cụ:</span>
                          <span className="text-slate-800 line-clamp-1">{plan.props}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Flag size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-black">Chỉ tiêu:</span>
                          <span className="text-slate-800 line-clamp-1">{plan.kpis}</span>
                        </p>
                      </div>
                      
                      {plan.notes && (
                        <p className="text-[11px] text-slate-400 italic font-semibold border-t border-slate-200 pt-1.5 mt-1">
                          Ghi chú: {plan.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex md:flex-col items-center justify-end gap-2 border-t md:border-t-0 border-slate-200 pt-3 md:pt-0 shrink-0">
                      <button
                        onClick={() => handleStartEdit(plan)}
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all w-9 h-9 flex items-center justify-center shadow-sm"
                        title="Chỉnh sửa"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all w-9 h-9 flex items-center justify-center shadow-sm"
                        title="Xoá lịch"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
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
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tuyến đường di chuyển *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ví dụ: Siêu thị -> Tuyến phố chính -> Chợ trung tâm -> Siêu thị"
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
                  placeholder="Nhập ghi chú hoặc căn dặn đội ngũ..."
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
                <ClipboardCheck size={18} className="text-indigo-600" />
                Danh Sách Chuẩn Bị
              </h3>
              <button 
                onClick={resetChecklist}
                className="text-[9px] font-black uppercase text-indigo-600 tracking-wider hover:underline"
              >
                LÀM MỚI
              </button>
            </div>

            <p className="text-[11px] font-semibold text-slate-400 mb-3">Kiểm tra các hạng mục quan trọng trước khi xe lăn bánh để đảm bảo hiệu quả:</p>

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
  );
};
