import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, Trash2, Shield, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface UserManagementProps {
  onBack: () => void;
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
  const { userProfile } = useAuth();
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';

  useEffect(() => {
    fetchUsers();
  }, []);

  if (!isSuperAdminHardcoded && !userProfile?.userPermissions?.canEditUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white m-4 rounded-3xl shadow-sm border border-red-100 min-h-[50vh]">
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
          .select('username, storeCode, password') // Remove created_at as it does not exist
          .limit(500),
        supabase
          .from('user_permissions')
          .select('user_id, allowed_pages')
      ]);

      if (error) throw error;
      
      const permMap = new Map((permData || []).map((p: any) => [p.user_id, p.allowed_pages]));

      const mappedUsers = (data || []).map((u: any) => ({
        username: u.username,
        ma_kho: u.storeCode,
        password: u.password,
        role: 'user' as any,
        userPermissions: {
          canEditUser: u.username === '43751',
          allowedPages: permMap.get(u.username) || []
        },
        permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any
      }));
      
      setUsers(mappedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
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
          storeCode: isEditing.ma_kho
        };
        
        // Only include password in update if the admin actually typed a new one
        if (isEditing.password && isEditing.password.trim() !== '') {
          updateData.password = isEditing.password;
        }

        const { error } = await supabase
          .from('ql_nguoi_dung')
          .update(updateData)
          .eq('username', isEditing.username);

        if (error) throw error;

        // Cập nhật user_permissions
        const { error: permError } = await supabase
          .from('user_permissions')
          .upsert({ 
            user_id: isEditing.username, 
            allowed_pages: isEditing.userPermissions?.allowedPages || [] 
          }, { onConflict: 'user_id' });
        
        if (permError) throw permError;
        
        // Preserve old password if not changed
        const updatedUser = {
          ...isEditing,
          password: (isEditing.password && isEditing.password.trim() !== '')
            ? isEditing.password
            : (users.find(u => u.username === isEditing.username)?.password || '')
        };

        setUsers(users.map(u => u.username === isEditing.username ? updatedUser : u));
      } else {
        // Create new user
        const newUser = {
          username: isEditing.username,
          storeCode: isEditing.ma_kho,
          password: isEditing.password
        };

        const { error: userError } = await supabase
          .from('ql_nguoi_dung')
          .insert([newUser]);

        if (userError) throw userError;

        // Tạo user_permissions mới
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert({ 
            user_id: newUser.username, 
            allowed_pages: isEditing.userPermissions?.allowedPages || [] 
          });

        if (permError) throw permError;
        
        setUsers([isEditing, ...users]);
      }

      setIsEditing(null);
      setIsNewUser(false);
    } catch (err: any) {
      console.error("Error saving user:", err);
      // Log full error details for debugging
      console.log('Error details:', err);
      setError(err.message || 'Không thể lưu thông tin người dùng.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username: string) => {
    try {
      // First delete permissions
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
      setDeleteConfirm(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.ma_kho && u.ma_kho.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-3">
            <Users size={32} className="text-indigo-600" />
            Quản lý Người dùng
          </h1>
          <p className="text-slate-500 font-medium">
            Phân quyền và quản lý tài khoản truy cập hệ thống
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          Quay lại
        </button>
      </div>

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
          <button
            onClick={() => {
              setIsNewUser(true);
              setIsEditing({ username: '', ma_kho: '', role: 'user' });
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Thêm người dùng
          </button>
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
            <table className="w-full text-left text-[14px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">Mã NV</th>
                  <th className="px-6 py-4 border-b border-slate-200">Mã Kho</th>
                  <th className="px-6 py-4 border-b border-slate-200">Vai trò</th>
                  <th className="px-6 py-4 border-b border-slate-200">Quyền truy cập</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {user.ma_kho}
                    </td>
                    <td className="px-6 py-4">
                      {user.username === '43751' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                          <Shield size={12} />
                          SUPER ADMIN
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.username === '43751' ? (
                        <span className="text-sm font-bold text-amber-600 italic">Toàn quyền</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: 'realtime', label: 'BC NGÀY', color: 'bg-indigo-100 text-indigo-700' },
                            { id: 'luyke', label: 'BC Tháng', color: 'bg-blue-100 text-blue-700' },
                            { id: 'khaibao', label: 'Khai Báo', color: 'bg-violet-100 text-violet-700' },
                            { id: 'health', label: 'Sức Khoẻ', color: 'bg-rose-100 text-rose-700' },
                            { id: 'toolhotro', label: 'Tool HT', color: 'bg-amber-100 text-amber-700' },
                            { id: 'tnb_data', label: 'TNB DATA', color: 'bg-emerald-100 text-emerald-700' },
                            { id: 'birthday', label: 'Sinh Nhật', color: 'bg-pink-100 text-pink-700' },
                            { id: 'feedback', label: 'Góp ý', color: 'bg-indigo-100 text-indigo-700' },
                          ].filter(p => user.userPermissions?.allowedPages?.includes(p.id)).map(p => (
                            <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.color}`}>{p.label}</span>
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
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        {user.username !== '43751' && (
                          <button
                            onClick={() => setDeleteConfirm(user.username)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xoá"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  {!isNewUser ? <Edit2 size={24} className="text-indigo-600" /> : <Plus size={24} className="text-indigo-600" />}
                  {!isNewUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </h3>
                <button onClick={() => { setIsEditing(null); setIsNewUser(false); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSaveUser} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã Nhân Viên</label>
                    <input
                      type="text"
                      required
                      disabled={!isNewUser} // Disable if editing existing user
                      value={isEditing.username}
                      onChange={(e) => setIsEditing({ ...isEditing, username: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                      placeholder="VD: KHO_HCM_01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Mật khẩu {!isNewUser && '(Bỏ trống nếu giữ nguyên)'}
                  </label>
                  <input
                    type="password"
                    required={isNewUser}
                    value={isEditing.password || ''}
                    onChange={(e) => setIsEditing({ ...isEditing, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                    placeholder={isNewUser ? "Nhập mật khẩu" : "Nhập mật khẩu mới nếu muốn đổi..."}
                  />
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

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Quyền truy cập các Trang</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'realtime', label: 'Báo cáo Ngày (BC NGÀY)', color: 'bg-indigo-500' },
                      { id: 'luyke', label: 'Báo cáo Tháng (BC THÁNG)', color: 'bg-blue-500' },
                      { id: 'khaibao', label: 'Khai Báo', color: 'bg-indigo-500' },
                      { id: 'health', label: 'Sức khoẻ nhân viên', color: 'bg-rose-500' },
                      { id: 'toolhotro', label: 'Tool Hỗ Trợ', color: 'bg-amber-500' },
                      { id: 'tnb_data', label: 'TNB DATA', color: 'bg-emerald-500' },
                      { id: 'birthday', label: 'Sinh nhật NV', color: 'bg-pink-500' },
                      { id: 'feedback', label: 'Góp ý / Nhận xét', color: 'bg-indigo-500' },
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
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
    </div>
  );
}
