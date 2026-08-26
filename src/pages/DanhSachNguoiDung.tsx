import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, Shield, AlertCircle, Loader2, CheckCircle2, X, 
  Activity, Clock, Monitor, Smartphone, RefreshCw, Eye, Calendar, Layers, ShieldCheck, Zap,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const { userProfile } = useAuth();
  const [duplicateIdsToDelete, setDuplicateIdsToDelete] = useState<string[]>([]);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';

  useEffect(() => {
    fetchUsers();
    
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'system_configs', 'google_sheets_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWebAppUrl(docSnap.data().webAppUrl || '');
        }
      } catch (e) {
        console.error("Lỗi khi tải URL Google Sheets:", e);
      }
    };
    loadConfig();
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
          .limit(200), // Reduce limit from 500 to 200 to save reads
        supabase
          .from('user_permissions')
          .select('user_id, allowed_pages')
      ]);

      if (error) throw error;
      
      const permMap = new Map((permData || []).map((p: any) => [p.user_id, p.allowed_pages]));

      const seenUsernames = new Set<string>();
      const mappedUsers: any[] = [];
      const duplicateIds: string[] = [];

      (data || []).forEach((u: any) => {
        const cleanUsername = String(u.username || '').trim();
        if (!cleanUsername) return;
        const key = cleanUsername.toUpperCase();

        if (seenUsernames.has(key)) {
          if (u.id) duplicateIds.push(u.id);
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
          isDemo: u.isDemo
        });
      });

      // Ensure current user (especially 43751) is always displayed if they somehow got deleted from DB
      const currentProfile = localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile') as string) : null;
      if (currentProfile && (currentProfile.username === '43751' || currentProfile.username === 'ADMIN') && !seenUsernames.has(currentProfile.username.toUpperCase())) {
        mappedUsers.unshift({
          username: currentProfile.username,
          ma_kho: currentProfile.ma_kho || 'TNB_LEADER_DATA',
          password: '---',
          role: 'admin',
          userPermissions: currentProfile.userPermissions || { canEditUser: true, allowedPages: [] },
          permissions: currentProfile.permissions || [],
          status: 'active',
          isDemo: true
        });
      }

      setUsers(mappedUsers);
      setDuplicateIdsToDelete(duplicateIds);
      setLoading(false);

    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || 'Không thể tải danh sách người dùng.');
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

        const [updateRes, permRes] = await Promise.all([
          supabase
            .from('ql_nguoi_dung')
            .update(updateData)
            .eq('username', isEditing.username),
          supabase
            .from('user_permissions')
            .upsert({ 
              user_id: isEditing.username, 
              allowed_pages: isEditing.userPermissions?.allowedPages || [] 
            }, { onConflict: 'user_id' })
        ]);

        if (updateRes.error) throw updateRes.error;
        if (permRes.error) throw permRes.error;
        
        // Log package update to Firebase if applicable
        if (isEditing.packageDays) {
          await supabase.from('lich_su_dang_ky').insert({
            username: isEditing.username,
            storeCode: isEditing.ma_kho,
            action: 'EDIT_PACKAGE',
            packageDays: isEditing.packageDays,
            status: isEditing.status,
            created_at: new Date().toISOString()
          });
        }
        
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

        const [userRes, permRes] = await Promise.all([
          supabase
            .from('ql_nguoi_dung')
            .upsert([newUser], { onConflict: 'username' }),
          supabase
            .from('user_permissions')
            .upsert({ 
              user_id: newUser.username, 
              allowed_pages: isEditing.userPermissions?.allowedPages || [] 
            }, { onConflict: 'user_id' })
        ]);

        if (userRes.error) throw userRes.error;
        if (permRes.error) throw permRes.error;
        
        // Log package update to Firebase if applicable
        if (newUser.packageDays) {
          await supabase.from('lich_su_dang_ky').insert({
            username: newUser.username,
            storeCode: newUser.storeCode,
            action: 'CREATE_USER_WITH_PACKAGE',
            packageDays: newUser.packageDays,
            status: newUser.status,
            created_at: new Date().toISOString()
          });
        }
        
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

  const handleDeleteDuplicates = async () => {
    if (!window.confirm(`Hệ thống tìm thấy ${duplicateIdsToDelete.length} tài khoản trùng lặp.\n\nCẢNH BÁO: Việc xoá sẽ tốn ${duplicateIdsToDelete.length * 2} lượt Đọc/Ghi Firebase. Bạn có chắc chắn muốn dọn rác ngay bây giờ không?`)) {
      return;
    }
    setSaving(true);
    let deletedCount = 0;
    try {
      for (const id of duplicateIdsToDelete) {
        await supabase.from('ql_nguoi_dung').delete().eq('id', id);
        deletedCount++;
        // Add 200ms delay to avoid rate limit spikes
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      showNotification(`Đã xoá xong ${deletedCount} tài khoản rác!`, 'success');
      setDuplicateIdsToDelete([]);
      fetchUsers();
    } catch (err) {
      console.error('[DanhSachNguoiDung] Delete duplicate error:', err);
      showNotification(`Đã dừng sau khi xoá ${deletedCount} tài khoản do lỗi!`, 'error');
    } finally {
      setSaving(false);
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

      // Save subscription history to Firebase
      await supabase.from('lich_su_dang_ky').insert({
        username: username,
        storeCode: user?.ma_kho,
        action: 'APPROVE',
        packageDays: days,
        status: 'active',
        created_at: new Date().toISOString()
      });

      setAlertConfig({ title: "Duyệt thành công", message: `Đã phê duyệt gói ${days} ngày cho tài khoản ${username}`, type: "success" });
      fetchUsers();
    } catch (err: any) {
      console.error("Error approving user:", err);
      setError('Lỗi khi phê duyệt gói cước.');
    } finally {
      setSaving(false);
    }
  };

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSyncToGoogleSheet = async () => {
    const cleanUrl = String(webAppUrl || '').trim();
    if (!cleanUrl) {
      alert("⚠️ Vui lòng dán URL Web App Google Apps Script vào ô kế bên nút đồng bộ trước!");
      return;
    }
    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      alert("⚠️ Phát hiện sai URL: Bạn đang nhập liên kết của Google Sheets (docs.google.com/spreadsheets).\n\nBạn phải nhập URL Web App được tạo sau khi Triển khai mã Apps Script thành công (có dạng bắt đầu bằng https://script.google.com/macros/s/...).");
      return;
    }
    if (!cleanUrl.includes('script.google.com/macros/s/')) {
      alert("⚠️ URL không hợp lệ! URL Web App của Google Apps Script phải bắt đầu bằng:\nhttps://script.google.com/macros/s/...");
      return;
    }

    if (saving) return;
    setSaving(true);
    setSyncStatus('loading');
    try {
      const docRef = doc(db, 'system_configs', 'google_sheets_config');
      await setDoc(docRef, {
        webAppUrl: cleanUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const usersData = users.map(user => {
        let cuocPhiStr = '';
        if (user.username === '43751' || user.username === 'ADMIN' || user.isDemo) {
          cuocPhiStr = 'MIỄN PHÍ / DEMO';
        } else {
          const statusText = user.status === 'active' ? 'Đã gia hạn'
            : user.status === 'pending' ? 'Chờ duyệt'
            : (user.status === 'expired' || (user.expiredAt && new Date() > new Date(user.expiredAt))) ? 'Hết hạn'
            : 'Chưa đăng ký';
          
          let subDetails = '';
          if (user.expiredAt) {
            const daysLeft = getRemainingDays(user.expiredAt);
            const remainingText = daysLeft !== null ? (daysLeft > 0 ? ` (Còn ${daysLeft} ngày)` : ' (Đã hết hạn)') : '';
            subDetails = ` - Gói: ${user.packageDays || 0} ngày - Hạn: ${new Date(user.expiredAt).toLocaleDateString('vi-VN')}${remainingText}`;
          }
          cuocPhiStr = `${statusText}${subDetails}`;
        }

        const pagesText = user.userPermissions?.allowedPages?.join(', ') || '';

        return {
          username: user.username,
          storeCode: user.ma_kho || '',
          password: user.password || '---',
          cuocPhi: cuocPhiStr,
          allowedPages: pagesText
        };
      });

      const payload = {
        users_list: usersData
      };

      const response = await fetch(cleanUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        setSyncStatus('success');
        setIsSyncModalOpen(false); // Close the Sync Modal
        setAlertConfig({
          title: "Đồng bộ thành công",
          message: `Đã xuất và đồng bộ ${usersData.length} tài khoản người dùng lên Google Sheet!`,
          type: "success"
        });
      } else {
        throw new Error(result.error || 'Lỗi không xác định từ Apps Script');
      }
    } catch (e: any) {
      console.error("Error syncing users to sheet:", e);
      setSyncStatus('error');
      alert(`❌ Lỗi đồng bộ Google Sheets: ${e.message || 'Vui lòng kiểm tra lại cấu hình Web App URL hoặc mã nguồn Apps Script.'}`);
    } finally {
      setSaving(false);
    }
  };

  const parseCuocPhi = (str: string) => {
    const clean = String(str || '').toUpperCase();
    if (clean.includes('MIỄN PHÍ') || clean.includes('DEMO')) {
      return { status: 'active', paymentConfirmed: true, isDemo: true, packageDays: 360, expiredAt: null };
    }
    
    let status = 'inactive';
    let paymentConfirmed = false;
    let packageDays = 30;
    let expiredAt: string | null = null;
    let isDemo = false;

    if (clean.includes('ĐÃ GIA HẠN')) {
      status = 'active';
      paymentConfirmed = true;
    } else if (clean.includes('CHỜ DUYỆT')) {
      status = 'pending';
      paymentConfirmed = false;
    } else if (clean.includes('HẾT HẠN')) {
      status = 'expired';
      paymentConfirmed = true;
    }

    const pkgMatch = clean.match(/GÓI:\s*(\d+)\s*NGÀY/);
    if (pkgMatch) {
      packageDays = parseInt(pkgMatch[1]);
    }

    // Match DD/MM/YYYY
    const expMatch = clean.match(/HẠN:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (expMatch) {
      const day = parseInt(expMatch[1]);
      const month = parseInt(expMatch[2]) - 1; // 0-indexed
      const year = parseInt(expMatch[3]);
      const d = new Date(year, month, day, 23, 59, 59);
      expiredAt = d.toISOString();
    }

    return { status, paymentConfirmed, isDemo, packageDays, expiredAt };
  };

  const handleImportFromGoogleSheet = async () => {
    const cleanUrl = String(webAppUrl || '').trim();
    if (!cleanUrl) {
      alert("⚠️ Vui lòng dán URL Web App Google Apps Script vào ô nhập liệu trước!");
      return;
    }
    if (!window.confirm("⚠️ BẠN CÓ CHẮC CHẮN?\n\nThao tác này sẽ cập nhật và GHI ĐÈ toàn bộ tài khoản người dùng trên hệ thống bằng dữ liệu từ Google Sheets!")) {
      return;
    }

    if (saving) return;
    setSaving(true);
    setSyncStatus('loading');
    try {
      // 1. Save the new URL to Firestore
      const docRef = doc(db, 'system_configs', 'google_sheets_config');
      await setDoc(docRef, {
        webAppUrl: cleanUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Fetch data from Google Sheet
      const response = await fetch(cleanUrl);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Lỗi không xác định từ Apps Script');
      }

      const usersList = result.data?.users_list;
      if (!usersList || !Array.isArray(usersList)) {
        throw new Error("Không tìm thấy dữ liệu Sheet 'Quản lý Người dùng' hoặc danh sách trống.");
      }

      // 3. Process each user and sync to Supabase
      let successCount = 0;
      for (const item of usersList) {
        const username = String(item.username || '').trim();
        if (!username) continue;

        const parsedSub = parseCuocPhi(item.cuocPhi);

        const allowedPages = String(item.allowedPages || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        // Update ql_nguoi_dung
        const { error: userError } = await supabase
          .from('ql_nguoi_dung')
          .upsert({
            username: username,
            storeCode: String(item.storeCode || '').trim(),
            password: String(item.password || '---').trim(),
            status: parsedSub.status,
            paymentConfirmed: parsedSub.paymentConfirmed,
            expiredAt: parsedSub.expiredAt,
            packageDays: parsedSub.packageDays,
            isDemo: parsedSub.isDemo,
            updated_at: new Date().toISOString()
          }, { onConflict: 'username' });

        if (userError) {
          console.error(`Lỗi cập nhật người dùng ${username}:`, userError);
          continue;
        }

        // Update user_permissions
        const { error: permError } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: username,
            allowed_pages: allowedPages,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (permError) {
          console.error(`Lỗi cập nhật quyền ${username}:`, permError);
          continue;
        }

        successCount++;
      }

      setSyncStatus('success');
      setIsSyncModalOpen(false); // Close the Sync Modal
      setAlertConfig({
        title: "Đồng bộ thành công",
        message: `Đã nhập và đồng bộ thành công ${successCount} tài khoản người dùng từ Google Sheet về hệ thống!`,
        type: "success"
      });
      fetchUsers();
    } catch (e: any) {
      console.error("Error importing users from sheet:", e);
      setSyncStatus('error');
      alert(`❌ Lỗi đồng bộ ngược Google Sheets: ${e.message || 'Vui lòng kiểm tra lại URL Apps Script hoặc cấu hình.'}`);
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

  const stats = React.useMemo(() => {
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

    return [...list].sort((a, b) => {
      const isSuperA = a.username === '43751' || a.username === 'ADMIN';
      const isSuperB = b.username === '43751' || b.username === 'ADMIN';
      if (isSuperA && !isSuperB) return -1;
      if (!isSuperA && isSuperB) return 1;

      return a.username.localeCompare(b.username);
    });
  }, [users, searchTerm]);



  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-8" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-3">
            <Users size={32} className="text-indigo-600" />
            Quản lý Người dùng & Phân quyền
          </h1>
          <p className="text-slate-500 font-medium">
            Quản lý danh sách tài khoản, phân quyền truy cập và gói cước sử dụng hệ thống
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
              {duplicateIdsToDelete.length > 0 && (
                <button
                  onClick={handleDeleteDuplicates}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors cursor-pointer text-xs border border-red-200 shadow-sm"
                  title="Dọn rác tài khoản trùng lặp (Tốn Quota)"
                >
                  <Trash2 size={14} />
                  Dọn Rác ({duplicateIdsToDelete.length})
                </button>
              )}
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
              <button
                onClick={() => setIsSyncModalOpen(true)}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 cursor-pointer disabled:opacity-50 whitespace-nowrap text-xs"
              >
                <FileSpreadsheet size={16} />
                Đồng bộ Google Sheets
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
                    <th className="px-4 py-4 border-b border-slate-200">Trạng thái TK</th>
                    <th className="px-4 py-4 border-b border-slate-200">Mã Kho</th>
                    <th className="px-4 py-4 border-b border-slate-200">Mật khẩu</th>
                    <th className="px-4 py-4 border-b border-slate-200">Cước phí</th>
                    <th className="px-4 py-4 border-b border-slate-200">Quyền truy cập</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-800">
                          {user.username}
                        </td>

                        {/* ACCOUNT STATUS (ACTIVE / LOCKED) */}
                        <td className="px-4 py-4">
                          {(() => {
                            const isDemo = user.username === '43751' || user.username === 'ADMIN' || user.isDemo;
                            if (isDemo) {
                              return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-200">Demo</span>;
                            }
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const expDate = user.expiredAt ? new Date(user.expiredAt) : null;
                            if (expDate) expDate.setHours(0, 0, 0, 0);
                            const isAccountActive = expDate ? expDate >= today : false;
                            return isAccountActive
                              ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Hoạt động</span>
                              : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">🔒 Khoá</span>;
                          })()}
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
                                { id: 'tnbleader', label: 'TNB LEADER', color: 'bg-amber-100 text-amber-700' },
                                { id: 'birthday', label: 'Sinh Nhật', color: 'bg-pink-100 text-pink-700' },
                                { id: 'feedback', label: 'HƯỚNG DẪN & GÓP Ý', color: 'bg-indigo-100 text-indigo-700' },
                                { id: 'excelviewer', label: 'XEM FILE EXCEL', color: 'bg-emerald-100 text-emerald-700' },
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
                      { id: 'tnbleader', label: 'TNB LEADER', color: 'bg-amber-500' },
                      { id: 'birthday', label: 'Sinh nhật NV', color: 'bg-pink-500' },
                      { id: 'feedback', label: 'HƯỚNG DẪN & GÓP Ý', color: 'bg-indigo-500' },
                      { id: 'excelviewer', label: 'XEM FILE EXCEL', color: 'bg-emerald-500' },
                      { id: 'lichpg', label: 'Lịch Làm Việc PG', color: 'bg-teal-500' },
                    ].map((page) => {
                      const is43751Admin = String(isEditing.username).trim() === '43751';
                      const hasAccess = is43751Admin || (isEditing.userPermissions?.allowedPages?.includes(page.id) || false);
                      return (
                        <label key={page.id} className={`flex items-center gap-3 p-4 border border-slate-200 rounded-xl ${is43751Admin ? 'bg-slate-50 cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-slate-50'} transition-colors`}>
                          <input
                            type="checkbox"
                            checked={hasAccess}
                            disabled={is43751Admin}
                            onChange={(e) => {
                              if (is43751Admin) return;
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
                            className={`w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 ${is43751Admin ? 'cursor-not-allowed' : ''}`}
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
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

      {/* Google Sheets Sync Modal */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col relative"
              style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
            >
              {/* Background glow glows */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Đồng bộ Google Sheets</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Xuất dữ liệu người dùng</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncModalOpen(false);
                    setSyncStatus('idle');
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 flex-1 relative z-10">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tính năng này sẽ xuất toàn bộ danh sách thành viên hiện tại (gồm Mã NV, Trạng thái hoạt động, cước phí, mật khẩu, và quyền hạn truy cập) lên Google Sheets của bạn.
                </p>

                {/* URL INPUT FIELD */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">URL Web App Google Apps Script</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                    <input
                      type="text"
                      placeholder="Dán URL Web App (https://script.google.com/macros/s/.../exec) tại đây..."
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-mono w-full text-slate-700 placeholder-slate-400"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    ⚠️ Phải dán URL **Web App** được tạo sau khi triển khai Apps Script trên file Trang tính. KHÔNG dán trực tiếp link của Google Sheet.
                  </p>
                </div>

                {/* SYNC STATUS INFO */}
                {syncStatus !== 'idle' && (
                  <div className={`p-4 border rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5 ${
                    syncStatus === 'loading' ? 'bg-indigo-50/50 border-indigo-100 text-indigo-700' :
                    syncStatus === 'success' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700 animate-pulse' :
                    'bg-rose-50/50 border-rose-100 text-rose-700'
                  }`}>
                    {syncStatus === 'loading' ? (
                      <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />
                    ) : syncStatus === 'success' ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    )}
                    <div>
                      {syncStatus === 'loading' && "Đang thiết lập kết nối và đồng bộ dữ liệu người dùng..."}
                      {syncStatus === 'success' && `Đồng bộ thành công! Dữ liệu đã được ghi vào Sheet "Quản lý Người dùng" trên file của bạn.`}
                      {syncStatus === 'error' && "Đồng bộ thất bại. Vui lòng kiểm tra lại liên kết URL Apps Script hoặc kết nối mạng của bạn."}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncModalOpen(false);
                    setSyncStatus('idle');
                  }}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-colors text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleImportFromGoogleSheet();
                  }}
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-xs cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Đồng bộ ngược về Web
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSyncToGoogleSheet();
                  }}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-xs cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Bắt đầu đồng bộ
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
