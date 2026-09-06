import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { trackUserPing } from '../services/accessTracker';
import { localYcxDb, isValidStoreName } from '../pages/RTST/utils';
import { URL_PAGE_MAP, isGuestShareLink } from '../constants/routes';

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  login: (username: string, maKho: string, password?: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, maKho: string, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateStoreName: (newStoreName: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const isShare = isGuestShareLink(window.location.search);
      if (isShare) return null;
      const stored = localStorage.getItem('userProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role !== 'guest' && parsed.ma_kho) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!userProfile?.username || userProfile.username === 'ADMIN') return;
    try {
      const [{ data: permData }, { data: userData }] = await Promise.all([
        supabase
          .from('user_permissions')
          .select('allowed_pages')
          .eq('user_id', userProfile.username)
          .maybeSingle(),
        supabase
          .from('ql_nguoi_dung')
          .select('*')
          .eq('username', userProfile.username)
          .maybeSingle()
      ]);

      if (!userData) {
        console.warn(`User ${userProfile.username} has been deleted or not found. Logging out.`);
        logout();
        return;
      }

      if (permData || userData) {
        setUserProfile(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            ma_kho: userData.storeCode || prev.ma_kho,
            ten_sieu_thi: userData.ten_sieu_thi || prev.ten_sieu_thi,
            selected_store: userData.selected_store || prev.selected_store,
            expiredAt: userData.expiredAt,
            status: userData.status,
            packageDays: userData.packageDays,
            paymentConfirmed: userData.paymentConfirmed,
            requestedRenewPackage: userData.requestedRenewPackage,
            requestedAt: userData.requestedAt,
            isDemo: userData.isDemo,
            userPermissions: {
              ...prev.userPermissions,
              allowedPages: permData?.allowed_pages || prev.userPermissions?.allowedPages || []
            }
          };
          localStorage.setItem('userProfile', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to sync permissions & subscription:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const khoParam = params.get('kho') || params.get('makho') || params.get('store');
    const isShare = isGuestShareLink(window.location.search);
    
    // Only persist rtst_ma_kho from URL parameter if accessing via an explicit guest share link
    if (khoParam && isShare) {
      localStorage.setItem('rtst_ma_kho', khoParam);
    }

    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const storedUser = localStorage.getItem('userProfile');

    const ALL_SHARED_PAGES = ['realtime', 'luyke', 'health', 'lichpg', 'diemdanhhop', 'bangiasoc', 'toolhotro', 'tienich', 'birthday', 'khaibao', 'feedback', 'excelviewer'];

    // 1. Mở từ link chia sẻ khách (?view=guest hoặc ?share=true):
    // Khởi tạo tài khoản Khách xem trang độc lập không cần đăng nhập dưới mã kho được chia sẻ
    if (isShare) {
      const kho = khoParam || localStorage.getItem('rtst_ma_kho') || '';
      if (!kho) {
        setUserProfile(null);
        setLoading(false);
        return;
      }
      localStorage.setItem('rtst_ma_kho', kho);
      const guestUser: any = {
        username: `Khách (${kho})`,
        role: 'guest',
        isGuest: true,
        ma_kho: kho,
        storeCode: kho,
        declarationCompleted: true,
        paymentConfirmed: true,
        status: 'active',
        packageDays: 9999,
        expiredAt: '2099-12-31T23:59:59.000Z',
        permissions: ['lkst', 'rtst', 'sknv', 'updata'],
        userPermissions: {
          allowedPages: ALL_SHARED_PAGES,
          canEditUser: false
        }
      };
      setUserProfile(guestUser);
      setLoading(false);
      return;
    }

    // 2. Với phiên làm việc đã đăng nhập:
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Nếu storedUser trước đó bị dính role guest mà hiện tại không có link share thì xóa đi để bắt đăng nhập
        if (parsed.role === 'guest' && !isShare) {
          localStorage.removeItem('userProfile');
          setUserProfile(null);
        } else {
          if (parsed.ma_kho && parsed.role !== 'guest') {
            localStorage.setItem('rtst_ma_kho', parsed.ma_kho);
          }
          setUserProfile(parsed);
        }
      } catch (e) {
        console.error('Failed to parse stored user profile');
        setUserProfile(null);
      }
    } else if (!isShare) {
      setUserProfile(null);
    }
    setLoading(false);
  }, []);


  // Real-time Listeners (Firestore for subscription and permissions)
  useEffect(() => {
    if (!userProfile?.username || userProfile.username === 'ADMIN' || userProfile.role === 'guest' || userProfile.isGuest) return;

    // 1. Firestore Listener for Subscription (ql_nguoi_dung)
    const qUser = query(
      collection(db, 'ql_nguoi_dung'),
      where('username', '==', userProfile.username)
    );

    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        
        setUserProfile(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            ma_kho: userData.storeCode || prev.ma_kho,
            ten_sieu_thi: userData.ten_sieu_thi || prev.ten_sieu_thi,
            selected_store: userData.selected_store || prev.selected_store,
            expiredAt: userData.expiredAt,
            status: userData.status,
            packageDays: userData.packageDays,
            paymentConfirmed: userData.paymentConfirmed,
            requestedRenewPackage: userData.requestedRenewPackage,
            requestedAt: userData.requestedAt,
            phone: userData.phone,
            isDemo: userData.isDemo,
            declarationCompleted: userData.declarationCompleted
          };
          localStorage.setItem('userProfile', JSON.stringify(updated));
          return updated;
        });
      }
    }, (error) => {
      console.error('[AuthContext] User real-time listener error:', error);
    });

    // 2. Firestore Listener for Permissions (user_permissions)
    const qPerms = query(
      collection(db, 'user_permissions'),
      where('user_id', '==', userProfile.username)
    );

    const unsubscribePerms = onSnapshot(qPerms, (snapshot) => {
      setUserProfile(prev => {
        if (!prev) return null;
        
        const newAllowedPages = snapshot.empty ? [] : (snapshot.docs[0].data().allowed_pages || []);
        
        // Prevent unnecessary state updates if permissions are the same
        if (JSON.stringify(prev.userPermissions?.allowedPages) === JSON.stringify(newAllowedPages)) {
          return prev;
        }

        const updated = {
          ...prev,
          userPermissions: {
            ...prev.userPermissions,
            allowedPages: newAllowedPages
          }
        };
        localStorage.setItem('userProfile', JSON.stringify(updated));
        return updated;
      });
    }, (error) => {
      console.error('[AuthContext] Permissions real-time listener error:', error);
    });

    return () => {
      unsubscribeUser();
      unsubscribePerms();
    };
  }, [userProfile?.username]);
  async function login(username: string, maKho: string, password?: string): Promise<{ success: boolean; message: string }> {
    try {
      // PG001 skips storeCode matching
      const isPG001 = username.toUpperCase() === 'PG001';
      let query = supabase
        .from('ql_nguoi_dung')
        .select('*')
        .eq('username', username);
      
      if (!isPG001) {
        query = query.eq('storeCode', maKho);
      }
      
      const { data, error } = await query
        .eq('password', password)
        .single();

      if (error || !data) {
        // Fallback login for testing if Supabase fails or user not found
        if (username.toUpperCase() === 'ADMIN' && password === 'admin') {
          const profile: UserProfile = {
            username: 'ADMIN',
            ma_kho: maKho,
            password: 'admin',
            role: 'admin',
            permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any,
            userPermissions: {
              canEditUser: true,
              allowedPages: ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'birthday']
            },
            ten_sieu_thi: `Siêu thị ${maKho} (Offline Mode)`,
            status: 'active',
            paymentConfirmed: true
          };
          localStorage.setItem('userProfile', JSON.stringify(profile));
          sessionStorage.setItem('justLoggedIn', 'true');
          setTimeout(() => {
            setUserProfile(profile);
          }, 1500);
          return { success: true, message: 'Đăng nhập thành công (Offline Mode).' };
        }
        return { success: false, message: 'Tài khoản không tồn tại hoặc sai mật khẩu.' };
      }

      // Fetch store name from warehouses or declared stores
      let storeName = '';
      const { data: storeData } = await supabase
        .from('warehouses')
        .select('ten_kho')
        .eq('ma_kho', maKho)
        .maybeSingle();

      if (data.selected_store && isValidStoreName(data.selected_store)) {
        storeName = data.selected_store;
      } else if (data.ten_sieu_thi && isValidStoreName(data.ten_sieu_thi)) {
        storeName = data.ten_sieu_thi;
      } else if (storeData?.ten_kho && isValidStoreName(storeData.ten_kho)) {
        storeName = storeData.ten_kho;
      } else {
        // Fallback: look up declared stores in store table
        const { data: storeRecords } = await supabase
          .from('store')
          .select('id, ten_sieu_thi, declared_stores')
          .eq('warehouse_code', maKho);

        if (storeRecords && storeRecords.length > 0) {
          const recWithDeclared = storeRecords.find((r: any) => Array.isArray(r.declared_stores) && r.declared_stores.length > 0);
          if (recWithDeclared && recWithDeclared.declared_stores[0] && isValidStoreName(recWithDeclared.declared_stores[0])) {
            storeName = recWithDeclared.declared_stores[0];
          } else {
            const firstValid = storeRecords.find((r: any) => isValidStoreName(r.ten_sieu_thi || r.id));
            if (firstValid) storeName = firstValid.ten_sieu_thi || firstValid.id;
          }
        }
      }

      // If warehouse didn't exist in warehouses table and we found a valid storeName, auto-save to warehouses
      if ((!storeData || !storeData.ten_kho) && storeName && isValidStoreName(storeName)) {
        supabase.from('warehouses').upsert({
          ma_kho: String(maKho).trim(),
          ten_kho: storeName
        }, { onConflict: 'ma_kho' }).then().catch(() => {});
      }

      // Fetch user permissions
      const { data: permData } = await supabase
        .from('user_permissions')
        .select('allowed_pages')
        .eq('user_id', username)
        .maybeSingle();

      const isSuperAdmin = username === '43751';
      const ALL_PAGES = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'tnbleader', 'birthday', 'bangiasoc'];

      const resolvedStoreName = storeName || (isValidStoreName(storeData?.ten_kho) ? storeData.ten_kho : `Siêu thị ${data.storeCode}`);

      const profile: UserProfile = {
        username: data.username,
        ma_kho: data.storeCode,
        password: data.password,
        role: 'user', // Default role for ql_nguoi_dung
        permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any, // Default permissions
        userPermissions: {
          canEditUser: isSuperAdmin,
          allowedPages: isSuperAdmin ? ALL_PAGES : (permData?.allowed_pages || [])
        },
        ten_sieu_thi: resolvedStoreName,
        selected_store: data.selected_store || resolvedStoreName,
        expiredAt: data.expiredAt,
        status: data.status,
        packageDays: data.packageDays,
        paymentConfirmed: data.paymentConfirmed,
        requestedRenewPackage: data.requestedRenewPackage,
        requestedAt: data.requestedAt,
        declarationCompleted: data.declarationCompleted
      };

      const cleanStorageForNewUser = () => {
        const theme = localStorage.getItem('theme');
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        if (theme) {
          try { localStorage.setItem('theme', theme); } catch {}
        }
      };

      cleanStorageForNewUser();
      localStorage.setItem('userProfile', JSON.stringify(profile));
      localStorage.setItem('rtst_ma_kho', profile.ma_kho);
      sessionStorage.setItem('justLoggedIn', 'true');
      
      // Record access login event
      trackUserPing(data.username, data.storeCode, 'realtime', 'LOGIN');

      // Hard redirect to load all contexts & RAM 100% fresh for the new user
      setTimeout(() => {
        window.location.replace(window.location.origin);
      }, 800);
      
      return { success: true, message: 'Đăng nhập thành công.' };
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Fallback login for testing if Supabase throws a network error
      if (username.toUpperCase() === 'ADMIN' && password === 'admin') {
        const profile: UserProfile = {
          username: 'ADMIN',
          ma_kho: maKho,
          password: 'admin',
          role: 'admin',
          permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any,
          userPermissions: {
            canEditUser: true,
            allowedPages: ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'tnbleader', 'birthday']
          },
          ten_sieu_thi: `Siêu thị ${maKho} (Offline Mode)`,
          status: 'active',
          paymentConfirmed: true
        };
        const theme = localStorage.getItem('theme');
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        if (theme) {
          try { localStorage.setItem('theme', theme); } catch {}
        }
        localStorage.setItem('userProfile', JSON.stringify(profile));
        localStorage.setItem('rtst_ma_kho', profile.ma_kho);
        sessionStorage.setItem('justLoggedIn', 'true');
        setTimeout(() => {
          window.location.replace(window.location.origin);
        }, 800);
        return { success: true, message: 'Đăng nhập thành công (Offline Mode).' };
      }

      let message = 'Đã xảy ra lỗi khi đăng nhập.';
      if (err.message?.includes('Failed to fetch')) {
        message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại cấu hình Supabase trong Secrets.';
      }
      return { success: false, message };
    }
  }

  async function register(username: string, maKho: string, password?: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanUsername = String(username).trim();
      const cleanMaKho = String(maKho).trim();

      if (!cleanUsername || !cleanMaKho) {
        return { success: false, message: 'Vui lòng nhập đầy đủ thông tin.' };
      }

      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('ql_nguoi_dung')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();
        
      if (checkError) {
        console.error('Supabase check error:', checkError);
        return { success: false, message: `Lỗi kiểm tra tài khoản: ${checkError.message}` };
      }
        
      if (existingUser) {
        return { success: false, message: 'Tên đăng nhập (Username) này đã tồn tại. Vui lòng chọn tên khác.' };
      }

      // Ensure warehouse exists
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('ma_kho, ten_kho')
        .eq('ma_kho', cleanMaKho)
        .maybeSingle();

      const defaultWarehouseName = `Siêu thị ${cleanMaKho}`;
      const isStoreAlreadyDeclared = !!(warehouse && warehouse.ten_kho && warehouse.ten_kho !== defaultWarehouseName);

      if (!warehouse) {
        // Auto-create warehouse if it doesn't exist
        await supabase.from('warehouses').insert({ ma_kho: cleanMaKho, ten_kho: defaultWarehouseName });
      }

      // Default subscription: 7-day trial
      const trialDays = 7;
      const trialExpiredAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      // All new users start with active status to let them declare their store name first.
      // After they complete declaration, status is set to pending for approval.
      const newUser = {
        username: cleanUsername,
        storeCode: cleanMaKho,
        password,
        status: 'active',
        paymentConfirmed: true,
        packageDays: trialDays,
        expiredAt: trialExpiredAt,
        isDemo: false,
        declarationCompleted: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('ql_nguoi_dung')
        .insert([newUser]);

      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, message: `Đăng ký thất bại: ${error.message}` };
      }

      // Create default user permissions
      const defaultPages = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'birthday', 'bangiasoc', 'tnb_data'];
      const { error: permError } = await supabase
        .from('user_permissions')
        .insert({
          user_id: cleanUsername,
          allowed_pages: defaultPages,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (permError) {
        console.error('Supabase permissions insert error:', permError);
        return { success: false, message: `Lỗi tạo phân quyền mặc định: ${permError.message}` };
      }

      // Fetch store name from warehouses
      const { data: storeData } = await supabase
        .from('warehouses')
        .select('ten_kho')
        .eq('ma_kho', cleanMaKho)
        .maybeSingle();

      const profile: UserProfile = {
        username: newUser.username,
        ma_kho: newUser.storeCode,
        password: newUser.password,
        role: 'user',
        permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any,
        userPermissions: {
          canEditUser: false,
          allowedPages: defaultPages
        },
        ten_sieu_thi: storeData?.ten_kho || cleanMaKho,
        status: newUser.status as any,
        paymentConfirmed: newUser.paymentConfirmed,
        packageDays: newUser.packageDays,
        expiredAt: newUser.expiredAt,
        isDemo: newUser.isDemo,
        declarationCompleted: newUser.declarationCompleted
      };
      
      const theme = localStorage.getItem('theme');
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      if (theme) {
        try { localStorage.setItem('theme', theme); } catch {}
      }

      localStorage.setItem('userProfile', JSON.stringify(profile));
      localStorage.setItem('rtst_ma_kho', profile.ma_kho);
      sessionStorage.setItem('justLoggedIn', 'true');

      // Record access login event
      trackUserPing(newUser.username, newUser.storeCode, 'realtime', 'REGISTER');
      
      setTimeout(() => {
        window.location.replace(window.location.origin);
      }, 800);
      
      return { success: true, message: 'Đăng ký thành công và đang chuyển hướng...' };
    } catch (err: any) {
      console.error('Register error:', err);
      let message = 'Đã xảy ra lỗi khi đăng ký.';
      if (err.message?.includes('Failed to fetch')) {
        message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại cấu hình Supabase trong Secrets.';
      }
      return { success: false, message };
    }
  }

  function logout() {
    // 1. Preserve theme if set
    const theme = localStorage.getItem('theme');

    // 2. Clear all storage to eliminate data leakage between accounts
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    if (theme) {
      try { localStorage.setItem('theme', theme); } catch {}
    }

    // 3. Clear IndexedDB cached data
    try { localYcxDb.clear().catch(() => {}); } catch {}

    // 4. Hard redirect immediately to origin root.
    // This stops all running timers, clears all module-level caches in RAM,
    // closes all active Firestore/Supabase socket connections, and guarantees 
    // that the browser starts 100% fresh for the next user.
    window.location.replace(window.location.origin);
  }

  function updateStoreName(newStoreName: string, newStatus?: string) {
    if (userProfile) {
      const updatedProfile = { 
        ...userProfile, 
        ten_sieu_thi: newStoreName,
        selected_store: newStoreName,
        status: newStatus ? newStatus as any : userProfile.status,
        declarationCompleted: true
      };
      setUserProfile(updatedProfile);
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));

      // Persist to ql_nguoi_dung in Firebase so any other browser device stays synchronized
      if (userProfile.username && userProfile.username !== 'ADMIN' && userProfile.role !== 'guest') {
        supabase
          .from('ql_nguoi_dung')
          .update({
            ten_sieu_thi: newStoreName,
            selected_store: newStoreName,
            declarationCompleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('username', userProfile.username)
          .then(() => {})
          .catch((err) => console.warn('[AuthContext] Error syncing store name to ql_nguoi_dung:', err));
      }
    }
  }

  const value = {
    userProfile,
    loading,
    login,
    register,
    logout,
    updateStoreName,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
