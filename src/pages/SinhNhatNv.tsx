import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { birthdayService, EmployeeBirthday, isStoreMatch } from '../services/birthdayService';
import { 
  Cake, Gift, Plus, Edit2, Trash2, Search, Calendar, 
  AlertCircle, Loader2, Sparkles, Check, X, Store, Trash, Link2, DownloadCloud,
  ClipboardPaste, FileSpreadsheet, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// CSV and Date parsing helpers
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  const delimiter = line.includes('\t') && !line.includes(',') ? '\t' : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
};

const parseBirthdayDate = (raw: string): string | null => {
  if (!raw) return null;
  const str = raw.trim().replace(/^"|"$/g, '');
  if (!str) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split(/[-/]/);
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const [d, m, y] = str.split(/[-/]/);
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(str)) {
    const [d, m, shortY] = str.split(/[-/]/);
    const y = Number(shortY) > 50 ? `19${shortY}` : `20${shortY}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM (assume year 2000)
  if (/^\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const [d, m] = str.split(/[-/]/);
    return `2000-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
};

const parseRow = (parts: string[], defaultStore: string) => {
  if (!parts || parts.length < 2) return null;

  // Find date column
  let dateIdx = -1;
  let parsedDate: string | null = null;
  for (let i = 0; i < parts.length; i++) {
    const d = parseBirthdayDate(parts[i]);
    if (d) {
      dateIdx = i;
      parsedDate = d;
      break;
    }
  }

  if (dateIdx === -1 || !parsedDate) return null;

  let name = '';
  let store = '';

  if (dateIdx === 2) {
    // Typical 4-col: [STT, Name, Date, Store?]
    name = parts[1];
    store = parts[3] || defaultStore;
  } else if (dateIdx === 1) {
    // Typical: [Name, Date, Store?]
    name = parts[0];
    store = parts[2] || defaultStore;
  } else {
    // Fallback search
    for (let i = 0; i < parts.length; i++) {
      if (i !== dateIdx && parts[i] && isNaN(Number(parts[i]))) {
        if (!name) name = parts[i];
        else if (!store) store = parts[i];
      }
    }
  }

  if (!name) return null;
  const cleanName = name.toLowerCase().trim();
  if (['stt', 'họ tên', 'họ và tên', 'họ tên nhân viên', 'tên nhân viên', 'nhân viên'].includes(cleanName)) {
    return null;
  }

  return {
    employee_name: name.trim(),
    birthday: parsedDate,
    warehouse_code: (store || defaultStore).trim()
  };
};

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
  
  // Google Sheets sync states
  const [sheetUrl, setSheetUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasting, setPasting] = useState(false);

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

  // Sync sheetUrl from localStorage (Global for all supermarkets)
  useEffect(() => {
    const savedUrl = localStorage.getItem('sheetUrl_GLOBAL');
    if (savedUrl) {
      setSheetUrl(savedUrl);
    } else {
      setSheetUrl('');
    }
  }, []);

  // Load birthdays
  const loadBirthdays = async (force = false) => {
    try {
      setLoading(true);
      const data = await birthdayService.getBirthdays(undefined, force);
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

  // Helper to fetch CSV from Google Sheet with fallback strategies
  const fetchGoogleSheetCsvText = async (url: string): Promise<string> => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      throw new Error('Link Google Sheets không hợp lệ. Vui lòng kiểm tra lại định dạng link.');
    }
    const sheetId = match[1];

    // Extract gid if present
    const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : null;

    // Build list of candidate URLs
    const candidates: string[] = [];
    if (gid) {
      candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
      candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
    }
    // Default first sheet (most reliable when users do not name the tab specifically)
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
    // Specific named tabs
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('NHÂN VIÊN')}`);
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('SINH NHẬT NHÂN VIÊN')}`);
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Sheet1')}`);
    candidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Trang tính1')}`);

    let isPermissionError = false;

    for (const candidateUrl of candidates) {
      try {
        const res = await fetch(candidateUrl);
        if (!res.ok) continue;
        const text = await res.text();

        // Detect HTML login / private redirect
        if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
          isPermissionError = true;
          continue;
        }

        // Detect GViz error response
        if (text.includes('"status":"error"') || text.includes('invalid_query')) {
          continue;
        }

        // Validate that it has at least some content
        const rows = text.split(/\r?\n/).filter(r => r.trim());
        if (rows.length > 0) {
          return text;
        }
      } catch (err: any) {
        // try next candidate
      }
    }

    if (isPermissionError) {
      throw new Error('PERMISSION_DENIED: Trang tính chưa được mở quyền chia sẻ "Bất kỳ ai có đường liên kết". Hãy bật quyền công khai hoặc bấm "Dán dữ liệu trực tiếp" bên dưới.');
    }

    throw new Error('Không thể tải dữ liệu từ Google Sheets. Vui lòng kiểm tra lại link hoặc sử dụng tính năng "Dán dữ liệu trực tiếp".');
  };

  // Google Sheets Sync
  const handleSheetSync = async () => {
    if (!sheetUrl.trim()) {
      showToast('Vui lòng nhập link Google Sheets', false);
      return;
    }

    try {
      setSyncing(true);
      const csvText = await fetchGoogleSheetCsvText(sheetUrl.trim());
      const lines = csvText.split(/\r?\n/);
      
      const defaultStore = formWarehouse || (selectedWarehouseFilter !== 'ALL' ? selectedWarehouseFilter : '') || userProfile?.ten_sieu_thi || userProfile?.ma_kho || '';
      const payloads: Omit<EmployeeBirthday, 'id'>[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const parts = parseCsvLine(line);
        const row = parseRow(parts, defaultStore);
        if (row) {
          payloads.push(row);
        }
      }

      if (payloads.length > 0) {
        await birthdayService.addBirthdays(payloads);
        showToast(`Đã đồng bộ thành công ${payloads.length} nhân viên từ Google Sheets!`, true);
        localStorage.setItem('sheetUrl_GLOBAL', sheetUrl.trim());
        await loadBirthdays(true);
      } else {
        showToast('Không tìm thấy dòng dữ liệu ngày sinh nào hợp lệ (cần Họ tên và Ngày sinh DD/MM/YYYY).', false);
      }
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.startsWith('PERMISSION_DENIED:')) {
        showToast(e.message.replace('PERMISSION_DENIED:', '').trim(), false);
      } else if (e.message) {
        showToast(e.message, false);
      } else {
        showToast('Lỗi khi tải dữ liệu từ Google Sheets. Vui lòng thử dùng "Dán dữ liệu trực tiếp".', false);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Direct Paste handler
  const handleDirectPasteSave = async () => {
    if (!pasteText.trim()) {
      showToast('Vui lòng dán dữ liệu bảng tính vào ô trước khi lưu.', false);
      return;
    }

    try {
      setPasting(true);
      const lines = pasteText.split(/\r?\n/);
      const defaultStore = formWarehouse || (selectedWarehouseFilter !== 'ALL' ? selectedWarehouseFilter : '') || userProfile?.ten_sieu_thi || userProfile?.ma_kho || '';
      const payloads: Omit<EmployeeBirthday, 'id'>[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const parts = parseCsvLine(line);
        const row = parseRow(parts, defaultStore);
        if (row) {
          payloads.push(row);
        }
      }

      if (payloads.length > 0) {
        await birthdayService.addBirthdays(payloads);
        showToast(`Đã lưu thành công ${payloads.length} nhân viên vào hệ thống!`, true);
        setPasteText('');
        setShowPasteModal(false);
        await loadBirthdays(true);
      } else {
        showToast('Không tìm thấy dòng dữ liệu nào hợp lệ. Vui lòng kiểm tra lại định dạng Họ tên và Ngày sinh.', false);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Đã xảy ra lỗi khi lưu dữ liệu đã dán.', false);
    } finally {
      setPasting(false);
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

  // Compute combined store options for dropdowns
  const allStoreOptions = useMemo(() => {
    const map = new Map<string, string>();
    availableMarkets.forEach(m => {
      if (m.name) map.set(m.name.trim(), m.name.trim());
    });
    birthdays.forEach(b => {
      if (b.warehouse_code) map.set(b.warehouse_code.trim(), b.warehouse_code.trim());
    });
    if (marketFilter && marketFilter !== 'ALL') {
      map.set(marketFilter.trim(), marketFilter.trim());
    }
    if (userProfile?.ten_sieu_thi) {
      map.set(userProfile.ten_sieu_thi.trim(), userProfile.ten_sieu_thi.trim());
    }
    return Array.from(map.values());
  }, [availableMarkets, birthdays, marketFilter, userProfile]);

  // Filter list and sort by closest birthday next
  const filteredBirthdays = birthdays.filter(b => {
    const matchesSearch = searchQuery.trim() === '' || b.employee_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesWarehouse = isStoreMatch(b, selectedWarehouseFilter);
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
                  {allStoreOptions.map(storeName => (
                    <option key={storeName} value={storeName}>{storeName}</option>
                  ))}
                  {formWarehouse && !allStoreOptions.includes(formWarehouse) && (
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

            {/* Google Sheets Sync */}
            <div className="mt-8 pt-6 border-t border-slate-200 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 size={22} className="text-emerald-500" />
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Đồng bộ từ Google Sheets</h2>
              </div>
              
              <div className="bg-emerald-50 text-emerald-900 text-[14px] p-4 rounded-xl border border-emerald-200 leading-relaxed shadow-inner">
                <strong className="text-emerald-700 text-[15px] uppercase tracking-wide">Hướng dẫn:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 font-medium">
                  <li>Tạo trang tính với tên Sheet là <strong className="text-emerald-700">NHÂN VIÊN</strong></li>
                  <li>Cột A: <strong className="text-emerald-700">STT</strong></li>
                  <li>Cột B: <strong className="text-emerald-700">HỌ TÊN NHÂN VIÊN</strong></li>
                  <li>Cột C: <strong className="text-emerald-700">NGÀY SINH</strong> (định dạng DD/MM/YYYY)</li>
                  <li>Cột D: <strong className="text-emerald-700">TÊN SIÊU THỊ</strong> (Phải copy đúng chính xác tên siêu thị trên hệ thống Bi, nếu không báo lỗi)</li>
                  <li>Link Google Sheet phải đặt chế độ <strong className="text-rose-600 uppercase">"Công Khai"</strong> (Bất kỳ ai có liên kết).</li>
                </ul>
                
                <div className="mt-4 border border-emerald-200/60 rounded overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full min-w-max text-left bg-white text-xs">
                    <thead>
                      <tr className="bg-emerald-100/50 text-emerald-800 text-center border-b border-emerald-200/60">
                        <th className="py-1.5 px-2 border-r border-emerald-200/60 font-semibold w-8">A</th>
                        <th className="py-1.5 px-2 border-r border-emerald-200/60 font-semibold">B</th>
                        <th className="py-1.5 px-2 border-r border-emerald-200/60 font-semibold">C</th>
                        <th className="py-1.5 px-2 font-semibold">D</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 px-2 border-r border-slate-100 text-center font-bold bg-slate-50">STT</td>
                        <td className="py-1.5 px-2 border-r border-slate-100 font-bold bg-slate-50">HỌ TÊN NHÂN VIÊN</td>
                        <td className="py-1.5 px-2 border-r border-slate-100 font-bold bg-slate-50">NGÀY SINH</td>
                        <td className="py-1.5 px-2 font-bold bg-slate-50 text-emerald-600">TÊN SIÊU THỊ</td>
                      </tr>
                      <tr className="border-b border-slate-50">
                        <td className="py-1.5 px-2 border-r border-slate-100 text-center text-slate-400">1</td>
                        <td className="py-1.5 px-2 border-r border-slate-100 font-medium">Nguyễn Văn A</td>
                        <td className="py-1.5 px-2 border-r border-slate-100">25/09/1995</td>
                        <td className="py-1.5 px-2">ĐML_CMA_CMA - 155A...</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2 border-r border-slate-100 text-center text-slate-400">2</td>
                        <td className="py-1.5 px-2 border-r border-slate-100 font-medium">Lê Thị B</td>
                        <td className="py-1.5 px-2 border-r border-slate-100">14/09/2001</td>
                        <td className="py-1.5 px-2">ĐML_CMA_CMA - TCH...</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="bg-slate-100/80 border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Sheet: NHÂN VIÊN
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Dán link Google Sheets vào đây..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleSheetSync}
                disabled={syncing || !sheetUrl.trim()}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <DownloadCloud size={16} />
                    <span>Đồng bộ dữ liệu</span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 font-bold uppercase">Hoặc</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs border border-slate-200 hover:border-slate-300 active:scale-95"
              >
                <ClipboardPaste size={16} className="text-emerald-600" />
                <span>Dán bảng trực tiếp từ Excel / Sheet</span>
              </button>
            </div>
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
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all max-w-[260px] truncate"
                >
                  <option value="ALL">Tất cả siêu thị</option>
                  {allStoreOptions.map(storeName => (
                    <option key={storeName} value={storeName}>{storeName}</option>
                  ))}
                  {selectedWarehouseFilter !== 'ALL' && !allStoreOptions.includes(selectedWarehouseFilter) && (
                    <option value={selectedWarehouseFilter}>{selectedWarehouseFilter}</option>
                  )}
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

      {/* Direct Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <ClipboardPaste size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 font-poppins">Dán dữ liệu trực tiếp</h3>
                  <p className="text-slate-400 text-xs">Copy các dòng từ Google Sheets hoặc Excel rồi dán vào đây</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-500" />
                Hỗ trợ các cấu trúc cột linh hoạt:
              </div>
              <p className="text-[11px] text-slate-500">
                • <strong>4 cột:</strong> STT | Họ tên nhân viên | Ngày sinh (DD/MM/YYYY) | Tên siêu thị<br/>
                • <strong>3 cột:</strong> Họ tên | Ngày sinh | Tên siêu thị (hoặc STT | Họ tên | Ngày sinh)<br/>
                • <strong>2 cột:</strong> Họ tên | Ngày sinh (tự động gán cho siêu thị đang chọn)
              </p>
            </div>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Ví dụ:\n1\tNguyễn Văn A\t25/09/1995\tĐML_CMA_CMA - 155A Nguyễn Tất Thành\n2\tLê Thị B\t14/09/2001\tĐML_CMA_CMA - 155A Nguyễn Tất Thành"}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
            />

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-xs"
              >
                Đóng
              </button>
              <button 
                type="button"
                onClick={handleDirectPasteSave}
                disabled={pasting || !pasteText.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-100 hover:shadow-emerald-200 text-xs flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {pasting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} />
                    <span>Lưu danh sách ngay</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SinhNhatNv;
