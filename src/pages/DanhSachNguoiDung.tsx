import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, Shield, AlertCircle, Loader2, CheckCircle2, X, 
  Activity, Clock, Monitor, Smartphone, RefreshCw, Eye, Calendar, Layers, ShieldCheck, Zap
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface UserManagementProps {
  onBack: () => void;
}

interface AccessLog {
  id?: string;
  username: string;
  storeCode: string;
  action: string;
  page: string;
  created_at: string;
  device_info?: string;
}

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState<UserProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Upgrade: Access Logs & Tabs state
  const [activeTab, setActiveTab] = useState<'users' | 'access_logs'>('users');
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logFilterAction, setLogFilterAction] = useState('ALL');

  const { userProfile } = useAuth();
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';

  useEffect(() => {
    fetchUsers();
    fetchAccessLogs();
  }, []);

  if (!isSuperAdminHardcoded && !userProfile?.userPermissions?.canEditUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white m-4 rounded-3xl shadow-sm border border-red-100 min-h-[50vh]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Truy cập bị từ chối</h2>
        <p className="text-slate-500 mt-2">Chỉ quản trị viên cấp cao mới có quyền truy cập trang này.</p>
        <button onClick={onBack} className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: permData }] = await Promise.all([
        supabase
          .from('ql_nguoi_dung')
          .select('*')
          .limit(500),
        supabase
          .from('user_permissions')
          .select('user_id, allowed_pages')
      ]);

      if (error) throw error;
      
      const permMap = new Map((permData || []).map((p: any) => [p.user_id, p.allowed_pages]));

      const seenUsernames = new Set<string>();
      const mappedUsers: any[] = [];
      const duplicateIdsToDelete: string[] = [];

      (data || []).forEach((u: any) => {
        const cleanUsername = String(u.username || '').trim();
        if (!cleanUsername) return;
        const key = cleanUsername.toUpperCase();

        if (seenUsernames.has(key)) {
          console.warn('[DanhSachNguoiDung] Duplicate username found in DB, filtering out:', cleanUsername, u.id);
          if (u.id) duplicateIdsToDelete.push(u.id);
          return;
        }
        seenUsernames.add(key);

        mappedUsers.push({
          username: cleanUsername,
          ma_kho: u.storeCode,
          password: u.password,
          role: (cleanUsername === '43751' || cleanUsername === 'ADMIN') ? 'admin' : ('user' as any),
          userPermissions: {
            canEditUser: cleanUsername === '43751',
            allowedPages: permMap.get(cleanUsername) || []
          },
          permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any,
          expiredAt: u.expiredAt,
          status: u.status,
          packageDays: u.packageDays,
          paymentConfirmed: u.paymentConfirmed,
          requestedRenewPackage: u.requestedRenewPackage,
          requestedAt: u.requestedAt,
          phone: u.phone,
          isDemo: u.isDemo,
          last_active_at: u.last_active_at,
          last_login_at: u.last_login_at,
          current_page: u.current_page,
          device_info: u.device_info
        });
      });

      setUsers(mappedUsers);

      // Asynchronously delete duplicate documents from DB
      if (duplicateIdsToDelete.length > 0) {
        for (const id of duplicateIdsToDelete) {
          try {
            await supabase.from('ql_nguoi_dung').delete().eq('id', id);
          } catch (e) {
            console.error('[DanhSachNguoiDung] Delete duplicate doc error:', e);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        setAccessLogs(data);
      }
    } catch (err) {
      console.error("Error fetching access logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    if (isNewUser && (!isEditing.password || isEditing.password.trim() === '')) {
      setError('Vui lòng nhập mật khẩu cho người dùng mới.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!isNewUser) {
        // Update existing user
        const updateData: any = {
          storeCode: isEditing.ma_kho,
          status: isEditing.status || 'inactive',
          paymentConfirmed: isEditing.paymentConfirmed ?? false,
          expiredAt: isEditing.expiredAt || null,
          packageDays: isEditing.packageDays || null,
          phone: isEditing.phone || null,
          isDemo: isEditing.isDemo ?? false
        };
        
        if (isEditing.password && isEditing.password.trim() !== '') {
          updateData.password = isEditing.password;
        }

        if (updateData.status === 'active') {
          updateData.paymentConfirmed = true;
          updateData.requestedRenewPackage = null;
          updateData.requestedAt = null;
        }

        const { error } = await supabase
          .from('ql_nguoi_dung')
          .update(updateData)
          .eq('username', isEditing.username);

        if (error) throw error;

        const { error: permError } = await supabase
          .from('user_permissions')
          .upsert({ 
            user_id: isEditing.username, 
            allowed_pages: isEditing.userPermissions?.allowedPages || [] 
          }, { onConflict: 'user_id' });
        
        if (permError) throw permError;
        
        const updatedUser = {
          ...isEditing,
          password: (isEditing.password && isEditing.password.trim() !== '')
            ? isEditing.password
            : (users.find(u => u.username === isEditing.username)?.password || '')
        };

        setUsers(users.map(u => u.username === isEditing.username ? updatedUser : u));
      } else {
        // Create new user with duplicate username check
        const cleanNewUsername = String(isEditing.username || '').trim();
        if (!cleanNewUsername) {
          setError('Vui lòng nhập Mã nhân viên (Username).');
          setSaving(false);
          return;
        }

        const isDuplicate = users.some(u => String(u.username).trim().toUpperCase() === cleanNewUsername.toUpperCase());
        if (isDuplicate) {
          setError(`Mã nhân viên "${cleanNewUsername}" đã tồn tại trên hệ thống. Không thể tạo trùng tài khoản!`);
          setSaving(false);
          return;
        }

        const newUser = {
          username: cleanNewUsername,
          storeCode: isEditing.ma_kho,
          password: isEditing.password,
          status: isEditing.status || 'inactive',
          paymentConfirmed: isEditing.paymentConfirmed ?? false,
          expiredAt: isEditing.expiredAt || null,
          packageDays: isEditing.packageDays || null,
          phone: isEditing.phone || null,
          isDemo: isEditing.isDemo ?? false,
          created_at: new Date().toISOString()
        };

        const { error: userError } = await supabase
          .from('ql_nguoi_dung')
          .upsert([newUser], { onConflict: 'username' });

        if (userError) throw userError;

        const { error: permError } = await supabase
          .from('user_permissions')
          .upsert({ 
            user_id: newUser.username, 
            allowed_pages: isEditing.userPermissions?.allowedPages || [] 
          }, { onConflict: 'user_id' });

        if (permError) throw permError;
        
        setUsers([isEditing, ...users]);
      }

      setIsEditing(null);
      setIsNewUser(false);
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || 'Không thể lưu thông tin người dùng.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username: string) => {
    try {
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', username);

      const { error } = await supabase
        .from('ql_nguoi_dung')
        .delete()
        .eq('username', username);

      if (error) throw error;
      setUsers(users.filter(u => u.username !== username));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError('Không thể xoá người dùng. Vui lòng thử lại.');
    }
  };

  const handleResetAllPasswords = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn đặt lại mật khẩu của TẤT CẢ người dùng thành chính Mã NV (Username) của họ không?")) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: dbUsers, error: fetchErr } = await supabase
        .from('ql_nguoi_dung')
        .select('username, storeCode');
      
      if (fetchErr) throw fetchErr;
      if (!dbUsers || dbUsers.length === 0) {
        setAlertConfig({ title: "Thông báo", message: "Không tìm thấy người dùng nào trong cơ sở dữ liệu.", type: "info" });
        setSaving(false);
        return;
      }

      const updates = dbUsers.map(u => ({
        username: u.username,
        storeCode: u.storeCode,
        password: u.username
      }));

      const { error: updateErr } = await supabase
        .from('ql_nguoi_dung')
        .upsert(updates, { onConflict: 'username' });

      if (updateErr) throw updateErr;

      setAlertConfig({ title: "Thành công", message: `Đã cập nhật mật khẩu của ${dbUsers.length} người dùng thành công!`, type: "success" });
      fetchUsers();
    } catch (err: any) {
      console.error("Error resetting passwords:", err);
      setError('Lỗi khi reset mật khẩu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveQuick = async (username: string, days: number) => {
    setSaving(true);
    try {
      const user = users.find(u => u.username === username);
      const now = new Date();
      const baseDate = user?.expiredAt ? new Date(user.expiredAt) : new Date();
      const activeBaseDate = baseDate > now ? baseDate : now;
      activeBaseDate.setDate(activeBaseDate.getDate() + days);

      const updateData = {
        status: 'active',
        paymentConfirmed: true,
        packageDays: days,
        expiredAt: activeBaseDate.toISOString(),
        requestedRenewPackage: null,
        requestedAt: null
      };

      const { error } = await supabase
        .from('ql_nguoi_dung')
        .update(updateData)
        .eq('username', username);

      if (error) throw error;
      setAlertConfig({ title: "Duyệt thành công", message: `Đã phê duyệt gói ${days} ngày cho tài khoản ${username}`, type: "success" });
      fetchUsers();
    } catch (err: any) {
      console.error("Error approving user:", err);
      setError('Lỗi khi phê duyệt gói cước.');
    } finally {
      setSaving(false);
    }
  };

  const getRemainingDays = (expiredAt?: string) => {
    if (!expiredAt) return null;
    const exp = new Date(expiredAt);
    const today = new Date();
    exp.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getPackagePrice = (days?: number) => {
    if (!days) return 0;
    if (days <= 7) return 0;
    if (days <= 30) return 49000;
    if (days <= 60) return 98000;
    if (days <= 90) return 147000;
    if (days <= 180) return 294000;
    if (days <= 270) return 441000;
    return 588000;
  };

  const getMonthlyEquivalent = (days?: number) => {
    if (!days || days <= 7) return 0;
    const price = getPackagePrice(days);
    const months = days / 30;
    return Math.round(price / months);
  };

  // Helper for tracking online & last active status
  const getAccessStatus = (lastActiveAt?: string) => {
    if (!lastActiveAt) return { label: 'Ngoại tuyến', color: 'bg-slate-100 text-slate-400 border-slate-200', isOnline: false, text: 'Chưa truy cập' };
    const date = new Date(lastActiveAt);
    if (isNaN(date.getTime())) return { label: 'Ngoại tuyến', color: 'bg-slate-100 text-slate-400 border-slate-200', isOnline: false, text: 'Chưa truy cập' };

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 5) {
      return { label: 'Đang Online', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', isOnline: true, text: '🟢 Đang Online' };
    }
    if (diffMin < 60) {
      return { label: 'Mới rời đi', color: 'bg-amber-100 text-amber-800 border-amber-300', isOnline: false, text: `${diffMin} phút trước` };
    }
    if (diffHours < 24) {
      return { label: 'Hôm nay', color: 'bg-slate-100 text-slate-600 border-slate-200', isOnline: false, text: `${diffHours} giờ trước` };
    }
    if (diffDays === 1) {
      return { label: 'Hôm qua', color: 'bg-slate-100 text-slate-500 border-slate-200', isOnline: false, text: `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` };
    }
    return { label: 'Ngoại tuyến', color: 'bg-slate-100 text-slate-400 border-slate-200', isOnline: false, text: `${diffDays} ngày trước` };
  };

  const stats = React.useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    const onlineUsers = users.filter(u => {
      if (!u.last_active_at) return false;
      const t = new Date(u.last_active_at).getTime();
      return !isNaN(t) && (now - t) < 5 * 60 * 1000;
    });

    const todayUsers = users.filter(u => {
      if (!u.last_active_at) return false;
      return u.last_active_at.startsWith(todayStr);
    });

    const activeUsers = users.filter(u => 
      u.username !== '43751' && 
      u.username !== 'ADMIN' && 
      u.status === 'active' && 
      u.expiredAt && 
      new Date(u.expiredAt) > new Date()
    );
    
    let totalMonthly = 0;
    activeUsers.forEach(u => {
      totalMonthly += getMonthlyEquivalent(u.packageDays);
    });

    return {
      onlineCount: onlineUsers.length,
      todayCount: todayUsers.length,
      totalCount: users.length,
      activeCount: activeUsers.length,
      monthly: totalMonthly,
      quarterly: totalMonthly * 3,
      yearly: totalMonthly * 12
    };
  }, [users]);

  const filteredUsers = React.useMemo(() => {
    const list = users.filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.ma_kho && u.ma_kho.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    return [...list].sort((a, b) => {
      const timeA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
      const timeB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;

      const isOnlineA = timeA > 0 && (now - timeA) < FIVE_MINUTES;
      const isOnlineB = timeB > 0 && (now - timeB) < FIVE_MINUTES;

      // 1. Prioritize Online users first
      if (isOnlineA && !isOnlineB) return -1;
      if (!isOnlineA && isOnlineB) return 1;

      // 2. Secondary sort by last active time descending (most recent first)
      if (timeA !== timeB) return timeB - timeA;

      // 3. Fallback to username
      return a.username.localeCompare(b.username);
    });
  }, [users, searchTerm]);

  const filteredLogs = accessLogs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      (log.storeCode && log.storeCode.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
      (log.page && log.page.toLowerCase().includes(logSearchTerm.toLowerCase()));

    const matchesAction = logFilterAction === 'ALL' || log.action.includes(logFilterAction);

    return matchesSearch && matchesAction;
  });

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-8" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-3">
            <Users size={32} className="text-indigo-600" />
            Quản lý Người dùng & Theo dõi Truy cập
          </h1>
          <p className="text-slate-500 font-medium">
            Phân quyền tài khoản, theo dõi trạng thái Online và nhật ký truy cập hệ thống
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          Quay lại
        </button>
      </div>

      {/* Statistics Dashboard Header */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-emerald-500 text-white p-5 rounded-2xl border border-emerald-600 shadow-md shadow-emerald-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest block text-emerald-100">Đang Online</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          </div>
          <span className="text-3xl font-black mt-2">
            {stats.onlineCount} <span className="text-xs font-bold text-emerald-100 uppercase">User</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Truy cập hôm nay</span>
          <span className="text-2xl font-black text-slate-800 mt-2">
            {stats.todayCount} <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">User</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tổng tài khoản</span>
          <span className="text-2xl font-black text-slate-800 mt-2">
            {stats.totalCount} <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">User</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Tài khoản Hoạt động</span>
          <span className="text-2xl font-black text-indigo-600 mt-2">
            {stats.activeCount} <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">User</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Doanh thu tháng (Ước tính)</span>
          <span className="text-2xl font-black text-amber-600 mt-2">
            {stats.monthly.toLocaleString()} <span className="text-xs font-bold text-slate-400">đ</span>
          </span>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'users' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={16} />
          Danh sách Người dùng & Phân quyền ({users.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('access_logs');
            fetchAccessLogs();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'access_logs' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity size={16} />
          Lịch sử Truy cập Website ({accessLogs.length})
        </button>
      </div>

      {/* TAB 1: USERS LIST & PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo mã NV hoặc mã kho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={fetchUsers}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                title="Tải lại danh sách"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Làm mới
              </button>
              <button
                onClick={handleResetAllPasswords}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-amber-100 disabled:opacity-50 cursor-pointer whitespace-nowrap text-xs"
              >
                🔄 Reset mật khẩu = Mã NV
              </button>
              <button
                onClick={() => {
                  setIsNewUser(true);
                  setIsEditing({ username: '', ma_kho: '', role: 'user', status: 'inactive', paymentConfirmed: false });
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 cursor-pointer whitespace-nowrap text-xs"
              >
                <Plus size={18} />
                Thêm người dùng
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 m-6 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4 text-indigo-600" />
                <p className="font-bold uppercase tracking-wider text-xs">Đang tải dữ liệu...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Users size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Không tìm thấy người dùng nào</p>
                {searchTerm && (
                  <p className="text-xs mt-1">Vui lòng thử lại với từ khoá khác.</p>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200">Mã NV</th>
                    <th className="px-4 py-4 border-b border-slate-200">Trạng thái Online</th>
                    <th className="px-4 py-4 border-b border-slate-200">Lần truy cập cuối</th>
                    <th className="px-4 py-4 border-b border-slate-200">Trang đang xem</th>
                    <th className="px-4 py-4 border-b border-slate-200">Mã Kho</th>
                    <th className="px-4 py-4 border-b border-slate-200">Mật khẩu</th>
                    <th className="px-4 py-4 border-b border-slate-200">Cước phí</th>
                    <th className="px-4 py-4 border-b border-slate-200">Quyền truy cập</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user, idx) => {
                    const statusInfo = getAccessStatus(user.last_active_at);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-800">
                          {user.username}
                        </td>

                        {/* ONLINE STATUS BADGE */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusInfo.color}`}>
                            {statusInfo.isOnline && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            )}
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* LAST ACTIVE TIME */}
                        <td className="px-4 py-4 font-medium text-slate-600 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            <span>{statusInfo.text}</span>
                          </div>
                          {user.device_info && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{user.device_info}</div>
                          )}
                        </td>

                        {/* CURRENT PAGE */}
                        <td className="px-4 py-4">
                          {user.current_page ? (
                            <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[11px] font-bold">
                              {user.current_page}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs italic">Chưa xem</span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-bold text-slate-700">
                          {user.ma_kho}
                        </td>

                        <td className="px-4 py-4 font-mono text-slate-500 text-xs font-bold">
                          {user.password || '---'}
                        </td>

                        <td className="px-4 py-4">
                          {user.username === '43751' || user.username === 'ADMIN' || user.isDemo ? (
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">Miễn phí / Demo</span>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                {user.status === 'active' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/50">
                                    Đã gia hạn
                                  </span>
                                )}
                                {user.status === 'pending' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200/50 animate-pulse">
                                    Chờ duyệt
                                  </span>
                                )}
                                {(user.status === 'expired' || (user.expiredAt && new Date() > new Date(user.expiredAt))) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200/50">
                                    Hết hạn
                                  </span>
                                )}
                                {(user.status === 'inactive' || !user.status) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">
                                    Chưa đăng ký
                                  </span>
                                )}
                              </div>
                              
                              {user.expiredAt && (
                                <div className="text-[11px] text-slate-500 font-bold leading-normal">
                                  <div>Gói: <span className="text-slate-800 font-black">{user.packageDays} ngày</span></div>
                                  <div className="text-[10px] text-slate-400">Hạn: {new Date(user.expiredAt).toLocaleDateString('vi-VN')}</div>
                                  {user.status === 'active' && (() => {
                                    const days = getRemainingDays(user.expiredAt);
                                    if (days !== null) {
                                      return days > 0 
                                        ? <span className="text-emerald-600 text-[10px] block font-black">Còn {days} ngày</span>
                                        : <span className="text-rose-600 text-[10px] block font-black">Đã hết hạn</span>;
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}

                              {user.status === 'pending' && user.requestedRenewPackage && (
                                <div className="pt-1 select-none">
                                  <button
                                    onClick={() => handleApproveQuick(user.username, user.requestedRenewPackage!)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] rounded-lg uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                  >
                                    Duyệt gói {user.requestedRenewPackage} ngày
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {user.username === '43751' ? (
                            <span className="text-xs font-bold text-amber-600 italic">Toàn quyền SuperAdmin</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {[
                                { id: 'realtime', label: 'BC NGÀY', color: 'bg-indigo-100 text-indigo-700' },
                                { id: 'luyke', label: 'BC Tháng', color: 'bg-blue-100 text-blue-700' },
                                { id: 'khaibao', label: 'Khai Báo', color: 'bg-violet-100 text-violet-700' },
                                { id: 'health', label: 'Sức Khoẻ', color: 'bg-rose-100 text-rose-700' },
                                { id: 'toolhotro', label: 'Tool HT', color: 'bg-amber-100 text-amber-700' },
                                { id: 'tnb_data', label: 'TNB DATA', color: 'bg-emerald-100 text-emerald-700' },
                                { id: 'birthday', label: 'Sinh Nhật', color: 'bg-pink-100 text-pink-700' },
                              ].filter(p => user.userPermissions?.allowedPages?.includes(p.id)).map(p => (
                                <span key={p.id} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${p.color}`}>{p.label}</span>
                              ))}
                              {(!user.userPermissions?.allowedPages || user.userPermissions.allowedPages.length === 0) && (
                                <span className="text-xs text-slate-400 italic">Chưa phân quyền</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setIsNewUser(false);
                                setIsEditing({ ...user, password: '' });
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={16} />
                            </button>
                            {user.username !== '43751' && (
                              <button
                                onClick={() => setDeleteConfirm(user.username)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Xoá"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACCESS LOGS TABLE */}
      {activeTab === 'access_logs' && (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Lọc nhật ký theo Mã NV, Mã kho..."
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <select
                value={logFilterAction}
                onChange={(e) => setLogFilterAction(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả hành động</option>
                <option value="Đăng nhập">🔑 Đăng nhập</option>
                <option value="Chuyển trang">📄 Chuyển trang</option>
              </select>
            </div>

            <button
              onClick={fetchAccessLogs}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 text-xs cursor-pointer"
            >
              <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
              Làm mới nhật ký
            </button>
          </div>

          <div className="overflow-x-auto">
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4 text-indigo-600" />
                <p className="font-bold uppercase tracking-wider text-xs">Đang tải nhật ký truy cập...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Activity size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Chưa có nhật ký truy cập nào</p>
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200">Thời gian</th>
                    <th className="px-6 py-4 border-b border-slate-200">Người dùng</th>
                    <th className="px-6 py-4 border-b border-slate-200">Mã kho</th>
                    <th className="px-6 py-4 border-b border-slate-200">Hành động</th>
                    <th className="px-6 py-4 border-b border-slate-200">Trang truy cập</th>
                    <th className="px-6 py-4 border-b border-slate-200">Thiết bị / Trình duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 font-medium">
                        {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '---'}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800">
                        {log.username}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-600">
                        {log.storeCode || '---'}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                          log.action?.includes('Đăng nhập') 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-700">
                        {log.page || 'Trang chủ'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {log.device_info || 'Trình duyệt Web'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Xác nhận xoá</h3>
                <p className="text-slate-500 font-medium mb-6">
                  Bạn có chắc chắn muốn xoá người dùng <span className="font-bold text-slate-800">{deleteConfirm}</span>? Hành động này không thể hoàn tác.
                </p>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Huỷ bỏ
                  </button>
                  <button 
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Xoá ngay
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 my-8 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  {!isNewUser ? <Edit2 size={24} className="text-indigo-600" /> : <Plus size={24} className="text-indigo-600" />}
                  {!isNewUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </h3>
                <button onClick={() => { setIsEditing(null); setIsNewUser(false); }} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSaveUser} className="space-y-6">
                
                {/* THẺ THÔNG TIN TÀI KHOẢN */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">💳 Thẻ Thông tin tài khoản</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã Nhân Viên</label>
                      <input
                        type="text"
                        required
                        disabled={!isNewUser}
                        value={isEditing.username}
                        onChange={(e) => setIsEditing({ ...isEditing, username: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="VD: NV001"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã Kho</label>
                      <input
                        type="text"
                        required
                        value={isEditing.ma_kho}
                        onChange={(e) => setIsEditing({ ...isEditing, ma_kho: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                        placeholder="VD: KHO_HCM_01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Mật khẩu {!isNewUser && '(Bỏ trống nếu giữ nguyên)'}
                      </label>
                      <input
                        type="password"
                        required={isNewUser}
                        value={isEditing.password || ''}
                        onChange={(e) => setIsEditing({ ...isEditing, password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                        placeholder={isNewUser ? "Nhập mật khẩu" : "Nhập mật khẩu mới nếu muốn đổi..."}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Số điện thoại</label>
                      <input
                        type="text"
                        value={isEditing.phone || ''}
                        onChange={(e) => setIsEditing({ ...isEditing, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                        placeholder="Số điện thoại liên hệ"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Vai trò</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="user"
                          checked={isEditing.role === 'user' || !isEditing.role}
                          onChange={() => setIsEditing({ ...isEditing, role: 'user' })}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-600 border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">Nhân viên</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={isEditing.role === 'admin'}
                          onChange={() => setIsEditing({ ...isEditing, role: 'admin' })}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-600 border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">Quản trị viên</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* THẺ GÓI CƯỚC & GIA HẠN */}
                {isEditing.username !== '43751' && isEditing.username !== 'ADMIN' && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">💰 Thẻ Gói cước & Gia hạn</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng thái cước</label>
                        <select
                          value={isEditing.status || 'inactive'}
                          onChange={(e) => setIsEditing({ ...isEditing, status: e.target.value as any })}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="inactive">Chưa đăng ký (inactive)</option>
                          <option value="pending">Chờ phê duyệt (pending)</option>
                          <option value="active">Đã gia hạn / Hoạt động (active)</option>
                          <option value="expired">Đã hết hạn (expired)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn gói gia hạn</label>
                        <select
                          value={isEditing.packageDays || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            let newExp = isEditing.expiredAt;
                            if (val) {
                              const expDate = new Date();
                              expDate.setDate(expDate.getDate() + val);
                              newExp = expDate.toISOString();
                            }
                            setIsEditing({ 
                              ...isEditing, 
                              packageDays: val,
                              expiredAt: newExp
                            });
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="">-- Chưa chọn gói --</option>
                          <option value="7">Dùng thử 7 ngày (áp dụng tài khoản mới) (0đ)</option>
                          <option value="30">Gói 30 ngày (49,000đ)</option>
                          <option value="60">Gói 60 ngày (98,000đ)</option>
                          <option value="90">Gói 90 ngày (147,000đ)</option>
                          <option value="180">Gói 6 tháng (294,000đ)</option>
                          <option value="270">Gói 9 tháng (441,000đ)</option>
                          <option value="360">Gói 12 tháng (588,000đ)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ngày hết hạn cước</label>
                        <input
                          type="date"
                          value={isEditing.expiredAt ? new Date(isEditing.expiredAt).toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const isoStr = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                            setIsEditing({ ...isEditing, expiredAt: isoStr });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-3 pt-4 sm:pt-6">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="paymentConfirmed"
                            checked={isEditing.paymentConfirmed || false}
                            onChange={(e) => setIsEditing({ ...isEditing, paymentConfirmed: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                          />
                          <label htmlFor="paymentConfirmed" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                            Đã xác nhận thanh toán
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="isDemo"
                            checked={isEditing.isDemo || false}
                            onChange={(e) => setIsEditing({ ...isEditing, isDemo: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                          />
                          <label htmlFor="isDemo" className="text-sm font-bold text-indigo-600 cursor-pointer select-none uppercase tracking-wider">
                            Tài khoản Demo / Free
                          </label>
                        </div>
                      </div>
                    </div>

                    {isEditing.status === 'pending' && isEditing.requestedRenewPackage && (
                      <div className="bg-amber-100/50 border border-amber-200 p-4 rounded-xl text-xs font-bold text-amber-800 leading-normal flex flex-col gap-1 mt-2">
                        <div>⚠️ Đang yêu cầu gia hạn gói: <span className="text-slate-900 font-black">{isEditing.requestedRenewPackage} ngày</span></div>
                        {isEditing.requestedAt && (
                          <div className="text-[10px] text-slate-500">Yêu cầu lúc: {new Date(isEditing.requestedAt).toLocaleString('vi-VN')}</div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const days = isEditing.requestedRenewPackage!;
                            const now = new Date();
                            const baseDate = isEditing.expiredAt ? new Date(isEditing.expiredAt) : new Date();
                            const activeBaseDate = baseDate > now ? baseDate : now;
                            activeBaseDate.setDate(activeBaseDate.getDate() + days);
                            
                            setIsEditing({
                              ...isEditing,
                              status: 'active',
                              paymentConfirmed: true,
                              packageDays: days,
                              expiredAt: activeBaseDate.toISOString(),
                              requestedRenewPackage: undefined,
                              requestedAt: undefined
                            });
                          }}
                          className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] rounded-lg font-black uppercase tracking-wider self-start transition-colors cursor-pointer"
                        >
                          Duyệt yêu cầu ngay lập tức
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* THẺ PHÂN QUYỀN TRUY CẬP */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">🔑 Thẻ Phân quyền truy cập các Trang</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'realtime', label: 'Báo cáo Ngày (BC NGÀY)', color: 'bg-indigo-500' },
                      { id: 'luyke', label: 'Báo cáo Tháng (BC THÁNG)', color: 'bg-blue-500' },
                      { id: 'khaibao', label: 'Khai Báo', color: 'bg-indigo-500' },
                      { id: 'health', label: 'Sức khoẻ nhân viên', color: 'bg-rose-500' },
                      { id: 'toolhotro', label: 'Tool Hỗ Trợ', color: 'bg-amber-500' },
                      { id: 'tnb_data', label: 'TNB DATA', color: 'bg-emerald-500' },
                      { id: 'birthday', label: 'Sinh nhật NV', color: 'bg-pink-500' },
                    ].map((page) => {
                      const hasAccess = isEditing.userPermissions?.allowedPages?.includes(page.id) || false;
                      return (
                        <label key={page.id} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={hasAccess}
                            onChange={(e) => {
                              const currentPages = isEditing.userPermissions?.allowedPages || [];
                              const newPages = e.target.checked 
                                ? [...currentPages, page.id]
                                : currentPages.filter((p) => p !== page.id);
                              setIsEditing({ 
                                ...isEditing, 
                                userPermissions: { 
                                  ...(isEditing.userPermissions || { canEditUser: false }), 
                                  allowedPages: newPages 
                                } 
                              });
                            }}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                          />
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${page.color}`} />
                            <span className="text-sm font-bold text-slate-700">{page.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(null); setIsNewUser(false); }}
                    className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Huỷ bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Modal */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100/80 relative"
            >
              <div className="flex flex-col items-center text-center">
                {alertConfig.type === 'success' && (
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm animate-bounce">
                    <CheckCircle2 size={32} />
                  </div>
                )}
                {alertConfig.type === 'error' && (
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 border border-rose-100 rounded-full flex items-center justify-center mb-4 shadow-sm animate-pulse">
                    <AlertCircle size={32} />
                  </div>
                )}
                {alertConfig.type === 'info' && (
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Users size={32} />
                  </div>
                )}
                
                <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${
                  alertConfig.type === 'success' ? 'text-emerald-600' :
                  alertConfig.type === 'error' ? 'text-rose-600' : 'text-slate-800'
                }`}>
                  {alertConfig.title}
                </h3>
                <p className="text-slate-500 font-bold text-xs leading-relaxed mb-6">
                  {alertConfig.message}
                </p>
                <button 
                  onClick={() => setAlertConfig(null)}
                  className={`w-full py-3 text-white font-black rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                    alertConfig.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' :
                    alertConfig.type === 'error' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' :
                    'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  Đồng ý
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
