import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { birthdayService, EmployeeBirthday } from '../services/birthdayService';
import { 
  Cake, Gift, Plus, Edit2, Trash2, Search, Calendar, 
  AlertCircle, Loader2, Sparkles, Check, X, Store, Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SinhNhatNv: React.FC = () => {
  const { userProfile } = useAuth();
  const { marketFilter, availableMarkets } = useStore();
  
  // State variables
  const [birthdays, setBirthdays] = useState<EmployeeBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  

  
  // Dialog/Alert states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync default warehouse with global market filter & user profile
  useEffect(() => {
    if (marketFilter && marketFilter !== 'ALL') {
      setFormWarehouse(marketFilter);
    } else if (availableMarkets.length > 0) {
      setFormWarehouse(availableMarkets[0].name);
    } else if (userProfile?.ten_sieu_thi) {
      setFormWarehouse(userProfile.ten_sieu_thi);
    } else if (userProfile?.ma_kho) {
      setFormWarehouse(userProfile.ma_kho);
    }
  }, [userProfile, marketFilter, availableMarkets]);

  // Sync warehouse filter with global market filter
  useEffect(() => {
    setSelectedWarehouseFilter(marketFilter);
  }, [marketFilter]);

  // Load birthdays
  const loadBirthdays = async () => {
    try {
      setLoading(true);
      const data = await birthdayService.getBirthdays();
      setBirthdays(data);
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Không thể tải danh sách sinh nhật nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBirthdays();
  }, []);

  // Display message helper
  const showToast = (message: string, isSuccess: boolean) => {
    if (isSuccess) {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };



  // Check if user is admin
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';
  const canEditAllWarehouses = userProfile?.userPermissions?.canEditUser || isSuperAdminHardcoded;

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDate || !formWarehouse) {
      showToast('Vui lòng nhập đầy đủ các trường thông tin.', false);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        employee_name: formName.trim(),
        birthday: formDate,
        warehouse_code: formWarehouse
      };

      let newId = null;

      if (editingId) {
        await birthdayService.updateBirthday(editingId, payload);
        showToast('Cập nhật thông tin sinh nhật thành công!', true);
      } else {
        const res = await birthdayService.addBirthday(payload);
        if (res && res.id) {
          newId = res.id;
        } else if (res && Array.isArray(res) && res[0]?.id) {
          newId = res[0].id;
        }
        showToast('Thêm sinh nhật nhân viên mới thành công!', true);
      }

      // Reset form
      setFormName('');
      setFormDate('');
      setEditingId(null);
      // Keep formWarehouse as is for convenience
      
      // Reload lists
      await loadBirthdays();

      if (newId) {
        setRecentlyAddedId(newId);
        setTimeout(() => setRecentlyAddedId(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Đã xảy ra lỗi khi lưu thông tin.', false);
    } finally {
      setSaving(false);
    }
  };

  // Edit record
  const handleEdit = (record: EmployeeBirthday) => {
    if (!record.id) return;
    setEditingId(record.id);
    setFormName(record.employee_name);
    setFormDate(record.birthday);
    setFormWarehouse(record.warehouse_code);
    
    // Scroll to form on mobile/small screen
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormName('');
    setFormDate('');
    if (userProfile?.ma_kho) {
      setFormWarehouse(userProfile.ma_kho);
    }
  };

  // Delete record
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await birthdayService.deleteBirthday(id);
      showToast('Đã xóa thông tin sinh nhật thành công.', true);
      setDeleteConfirmId(null);
      setDeleteConfirmName(null);
      await loadBirthdays();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi xóa thông tin sinh nhật.', false);
    } finally {
      setLoading(false);
    }
  };

  // Delete all records for the selected warehouse
  const handleDeleteAll = async () => {
    if (!selectedWarehouseFilter || selectedWarehouseFilter === 'ALL') return;
    try {
      setLoading(true);
      await birthdayService.deleteBirthdaysByWarehouse(selectedWarehouseFilter);
      showToast(`Đã xóa toàn bộ dữ liệu sinh nhật siêu thị ${selectedWarehouseFilter} thành công.`, true);
      setShowDeleteAllConfirm(false);
      await loadBirthdays();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi xóa toàn bộ dữ liệu sinh nhật.', false);
    } finally {
      setLoading(false);
    }
  };

  // Birthday utilities
  const getBirthdayStatus = (birthdayStr: string) => {
    if (!birthdayStr) return null;
    const parts = birthdayStr.split('-');
    if (parts.length < 3) return null;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowMonth = tomorrow.getMonth() + 1;
    const tomorrowDay = tomorrow.getDate();
    
    if (month === todayMonth && day === todayDay) {
      return { 
        label: 'Hôm nay 🎂', 
        color: 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm font-black' 
      };
    } else if (month === tomorrowMonth && day === tomorrowDay) {
      return { 
        label: 'Ngày mai 🎁', 
        color: 'bg-indigo-100 text-indigo-700 border border-indigo-200 font-black' 
      };
    }
    return null;
  };

  const formatBirthday = (birthdayStr: string) => {
    if (!birthdayStr) return '';
    const parts = birthdayStr.split('-');
    if (parts.length < 3) return birthdayStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Filter list
  const getDaysUntilNextBirthday = (birthdayStr: string): number => {
    if (!birthdayStr) return 9999;
    const parts = birthdayStr.split('-');
    if (parts.length < 3) return 9999;
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
    const birthDay = parseInt(parts[2], 10);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Create a date object for the birthday in the current year
    const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
    
    // Set time of both dates to 00:00:00 to only compare days
    const today = new Date(currentYear, now.getMonth(), now.getDate());
    
    if (birthdayThisYear >= today) {
      // Birthday is today or upcoming this year
      const diffTime = birthdayThisYear.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // Birthday has already passed this year, so it will be next year
      const birthdayNextYear = new Date(currentYear + 1, birthMonth, birthDay);
      const diffTime = birthdayNextYear.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  };

  // Filter list and sort by closest birthday next
  const filteredBirthdays = birthdays.filter(b => {
    const matchesSearch = b.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarehouse = 
      selectedWarehouseFilter === 'ALL' || 
      b.warehouse_code === selectedWarehouseFilter;
    return matchesSearch && matchesWarehouse;
  }).sort((a, b) => {
    return getDaysUntilNextBirthday(a.birthday) - getDaysUntilNextBirthday(b.birthday);
  });

  // Count upcoming
  const todayBirthdays = birthdays.filter(b => getBirthdayStatus(b.birthday)?.label.includes('Hôm nay'));
  const tomorrowBirthdays = birthdays.filter(b => getBirthdayStatus(b.birthday)?.label.includes('Ngày mai'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toast Alert Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm"
          >
            <Check size={16} />
            <span>{successMessage}</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm"
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-pink-100 text-pink-600 rounded-2xl shadow-sm">
              <Gift size={20} className="animate-bounce" />
            </span>
            <span className="text-xs font-black uppercase text-pink-600 tracking-wider">Module Nhân sự</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">SINH NHẬT NHÂN VIÊN</h1>
          <p className="text-slate-500 text-xs mt-1">Quản lý ngày sinh nhật và thông báo chúc mừng đội ngũ siêu thị</p>
        </div>
      </div>



      {/* Layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Form/Excel Input Column */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-pink-500" />
              <h2 className="text-base font-bold text-slate-800">
                {editingId ? 'Cập nhật thông tin' : 'Thêm ngày sinh nhật'}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Họ tên nhân viên
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Ngày sinh nhật
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Mã Siêu thị (Kho)
                </label>
                <select
                  value={formWarehouse}
                  onChange={(e) => setFormWarehouse(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="" disabled>-- Chọn siêu thị --</option>
                  {availableMarkets.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                  {userProfile?.ten_sieu_thi && !availableMarkets.some(m => m.name === userProfile.ten_sieu_thi) && (
                    <option value={userProfile.ten_sieu_thi}>{userProfile.ten_sieu_thi}</option>
                  )}
                  {availableMarkets.length === 0 && !userProfile?.ten_sieu_thi && userProfile?.ma_kho && (
                    <option value={userProfile.ma_kho}>{userProfile.ma_kho}</option>
                  )}
                  {formWarehouse && 
                   !availableMarkets.some(m => m.name === formWarehouse) && 
                   formWarehouse !== userProfile?.ten_sieu_thi && 
                   formWarehouse !== userProfile?.ma_kho && (
                    <option value={formWarehouse}>{formWarehouse}</option>
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5"
                  >
                    Hủy
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-100 hover:shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingId ? (
                    <>
                      <Check size={16} />
                      <span>Cập nhật</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Thêm mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Data List Column */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhân viên theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <Store size={16} className="text-slate-400" />
                <select
                  value={selectedWarehouseFilter}
                  onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="ALL">Tất cả siêu thị</option>
                  {availableMarkets.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>

                {/* Delete All Data for Selected Warehouse */}
                {selectedWarehouseFilter !== 'ALL' && filteredBirthdays.length > 0 && (
                  <button
                    onClick={() => setShowDeleteAllConfirm(true)}
                    className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition-all flex items-center justify-center gap-1.5 font-bold text-xs shrink-0 active:scale-95"
                    title={`Xóa toàn bộ dữ liệu sinh nhật của siêu thị ${selectedWarehouseFilter}`}
                  >
                    <Trash size={15} />
                    <span className="hidden sm:inline">Xóa toàn bộ data</span>
                  </button>
                )}
              </div>
            </div>

            {/* List Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={36} className="animate-spin text-pink-500 mb-4" />
                <span className="text-slate-500 text-xs font-bold">Đang tải dữ liệu...</span>
              </div>
            ) : filteredBirthdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                  <Calendar size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Không tìm thấy sinh nhật nào</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[280px]">
                  Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm hiện tại.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-xs font-black uppercase text-slate-400 tracking-wider w-10 pl-2">STT</th>
                      <th className="pb-3 pr-4 text-xs font-black uppercase text-slate-400 tracking-wider">Họ tên nhân viên</th>
                      <th className="pb-3 pr-4 text-xs font-black uppercase text-slate-400 tracking-wider w-28">Ngày sinh</th>
                      <th className="pb-3 pr-4 text-xs font-black uppercase text-slate-400 tracking-wider min-w-[280px]">Siêu thị</th>
                      <th className="pb-3 pr-4 text-xs font-black uppercase text-slate-400 tracking-wider w-32">Trạng thái</th>
                      <th className="pb-3 text-xs font-black uppercase text-slate-400 tracking-wider w-20 text-right pr-2">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBirthdays.map((item, index) => {
                      const status = getBirthdayStatus(item.birthday);
                      return (
                        <tr 
                          key={item.id} 
                          className={`transition-all duration-500 ${
                            item.id === recentlyAddedId 
                              ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500 animate-pulse' 
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <td className="py-4 text-xs font-bold text-slate-500 whitespace-nowrap pl-2 w-10">{index + 1}</td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                              {item.employee_name.toUpperCase()}
                              {item.id === recentlyAddedId && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 animate-bounce">
                                  Vừa thêm
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600 font-medium whitespace-nowrap w-28">
                            {formatBirthday(item.birthday)}
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap min-w-[280px]" title={item.warehouse_code}>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold block whitespace-nowrap">
                              {item.warehouse_code}
                            </span>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap w-32">
                            {status ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                {status.label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-4 text-right pr-2 w-20">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(item.id || null);
                                  setDeleteConfirmName(item.employee_name);
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title="Xóa"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2 font-poppins">Xác nhận xoá</h3>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xoá thông tin sinh nhật của nhân viên <span className="font-black text-slate-800">{deleteConfirmName}</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmName(null);
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-100 hover:shadow-red-200"
              >
                Xác nhận xoá
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2 font-poppins">Xác nhận xoá toàn bộ</h3>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xoá <span className="font-black text-red-600">TOÀN BỘ</span> thông tin sinh nhật của siêu thị <span className="font-black text-slate-800">{selectedWarehouseFilter}</span> trong Firebase không? Hành động này sẽ xoá sạch danh sách và không thể khôi phục.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleDeleteAll}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-100 hover:shadow-red-200"
              >
                Xác nhận xoá sạch
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SinhNhatNv;
