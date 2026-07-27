export type UserRole = 'admin' | 'user';

export type PageName = 'nhanvien' | 'baocao' | 'kho' | 'users' | 'khai-bao' | 'realtime' | 'luyke' | 'health' | 'toolhotro' | 'birthday';

export interface UserPermissions {
  canEditUser: boolean;
  allowedPages: string[];
}

export interface UserProfile {
  id?: string;
  username: string;
  ma_kho: string;
  ten_sieu_thi?: string;
  password?: string;
  role?: UserRole;
  permissions?: PageName[];
  userPermissions?: UserPermissions;
  created_at?: string;
  expiredAt?: string;
  status?: 'active' | 'pending' | 'expired' | 'inactive';
  packageDays?: number;
  paymentConfirmed?: boolean;
  requestedRenewPackage?: number;
  requestedAt?: string;
  isDemo?: boolean;
  last_active_at?: string;
  last_login_at?: string;
  current_page?: string;
  device_info?: string;
}

export interface UserData {
  id: string;
  email?: string;
  username: string;
  ma_kho: string;
  role: UserRole;
  permissions: PageName[];
}
