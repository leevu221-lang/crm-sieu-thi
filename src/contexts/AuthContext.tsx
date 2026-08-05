import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { trackUserPing } from '../services/accessTracker';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
    // Check localStorage on mount
    const storedUser = localStorage.getItem('userProfile');
    if (storedUser) {
      try {
        setUserProfile(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user profile');
      }
    }
    setLoading(false);
  }, []);

  // Sync permissions and subscription status on mount / username change
  // Also poll every 30 seconds and refresh on window visibility focus to enforce subscription locking in real-time
  useEffect(() => {
    if (!userProfile?.username || userProfile.username === 'ADMIN') return;

    // 1. Initial refresh
    refreshProfile();

    // 2. Periodic poll every 30 seconds
    const interval = setInterval(() => {
      refreshProfile();
    }, 30000);

    // 3. Tab visibility check
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userProfile?.username]);
  // Real-time Listeners (Firestore for subscription and permissions)
  useEffect(() => {
    if (!userProfile?.username || userProfile.username === 'ADMIN') return;

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
            expiredAt: userData.expiredAt,
            status: userData.status,
            packageDays: userData.packageDays,
            paymentConfirmed: userData.paymentConfirmed,
            requestedRenewPackage: userData.requestedRenewPackage,
            requestedAt: userData.requestedAt,
            phone: userData.phone,
            isDemo: userData.isDemo
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
      const { data, error } = await supabase
        .from('ql_nguoi_dung')
        .select('*')
        .eq('username', username)
        .eq('storeCode', maKho)
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

      // Fetch store name from warehouses
      const { data: storeData } = await supabase
        .from('warehouses')
        .select('ten_kho')
        .eq('ma_kho', maKho)
        .maybeSingle();

      // Fetch user permissions
      const { data: permData } = await supabase
        .from('user_permissions')
        .select('allowed_pages')
        .eq('user_id', username)
        .maybeSingle();

      const isSuperAdmin = username === '43751';
      const ALL_PAGES = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'tnbleader', 'birthday', 'bangiasoc'];

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
        ten_sieu_thi: storeData?.ten_kho || data.storeCode,
        expiredAt: data.expiredAt,
        status: data.status,
        packageDays: data.packageDays,
        paymentConfirmed: data.paymentConfirmed,
        requestedRenewPackage: data.requestedRenewPackage,
        requestedAt: data.requestedAt
      };

      localStorage.setItem('userProfile', JSON.stringify(profile));
      sessionStorage.setItem('justLoggedIn', 'true');
      
      // Record access login event
      trackUserPing(data.username, data.storeCode, 'realtime', 'LOGIN');

      // Delay setting user profile to allow success message to be shown
      setTimeout(() => {
        setUserProfile(profile);
      }, 1500);
      
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
        localStorage.setItem('userProfile', JSON.stringify(profile));
        sessionStorage.setItem('justLoggedIn', 'true');
        setTimeout(() => {
          setUserProfile(profile);
        }, 1500);
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
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('ql_nguoi_dung')
        .select('username')
        .eq('username', username)
        .maybeSingle();
        
      if (checkError) {
        console.error('Supabase check error:', checkError);
        return { success: false, message: `Lỗi kiểm tra tài khoản: ${checkError.message}` };
      }
        
      if (existingUser) {
        return { success: false, message: 'Tên người dùng đã tồn tại. Vui lòng chọn tên khác.' };
      }

      // Ensure warehouse exists
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('ma_kho')
        .eq('ma_kho', maKho)
        .maybeSingle();

      if (!warehouse) {
        // Auto-create warehouse if it doesn't exist
        await supabase.from('warehouses').insert({ ma_kho: maKho, ten_kho: `Siêu thị ${maKho}` });
      }

      // Insert new user
      const newUser = {
        username,
        storeCode: maKho,
        password,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('ql_nguoi_dung')
        .insert([newUser]);

      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, message: `Đăng ký thất bại: ${error.message}` };
      }

      // Fetch store name from warehouses
      const { data: storeData } = await supabase
        .from('warehouses')
        .select('ten_kho')
        .eq('ma_kho', maKho)
        .maybeSingle();

      const profile: UserProfile = {
        username: newUser.username,
        ma_kho: newUser.storeCode,
        password: newUser.password,
        role: 'user',
        permissions: ['lkst', 'rtst', 'sknv', 'updata'] as any,
        ten_sieu_thi: storeData?.ten_kho || maKho
      } as any;
      localStorage.setItem('userProfile', JSON.stringify(profile));
      
      setTimeout(() => {
        setUserProfile(profile);
      }, 1500);
      
      return { success: true, message: 'Đăng ký thành công.' };
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
    setUserProfile(null);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('currentStoreId');
    localStorage.removeItem('rtst_global_market_filter');
    localStorage.removeItem('ST_NAME_V1');
    sessionStorage.removeItem('justLoggedIn');
  }

  function updateStoreName(newStoreName: string) {
    if (userProfile) {
      const updatedProfile = { ...userProfile, ten_sieu_thi: newStoreName };
      setUserProfile(updatedProfile);
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
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
