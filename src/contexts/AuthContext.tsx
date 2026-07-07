import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  login: (username: string, maKho: string, password?: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, maKho: string, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateStoreName: (newStoreName: string) => void;
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

  useEffect(() => {
    if (!userProfile?.username || userProfile.username === 'ADMIN') return;

    const refreshPermissions = async () => {
      try {
        const { data: permData } = await supabase
          .from('user_permissions')
          .select('allowed_pages')
          .eq('user_id', userProfile.username)
          .maybeSingle();

        if (permData) {
          setUserProfile(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              userPermissions: {
                ...prev.userPermissions,
                allowedPages: permData.allowed_pages || []
              }
            };
            localStorage.setItem('userProfile', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to sync permissions:', err);
      }
    };

    refreshPermissions();
  }, [userProfile?.username]);


  async function login(username: string, maKho: string, password?: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .from('ql_nguoi_dung')
        .select('username, storeCode, password')
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
            ten_sieu_thi: `Siêu thị ${maKho} (Offline Mode)`
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
      const ALL_PAGES = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'birthday'];

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
        ten_sieu_thi: storeData?.ten_kho || data.storeCode
      };
      localStorage.setItem('userProfile', JSON.stringify(profile));
      sessionStorage.setItem('justLoggedIn', 'true');
      
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
            allowedPages: ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'birthday']
          },
          ten_sieu_thi: `Siêu thị ${maKho} (Offline Mode)`
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
    updateStoreName
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
