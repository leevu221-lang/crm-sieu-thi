import { supabase } from '../supabaseClient';

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let os = 'Khác';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'Mac OS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = '';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  return browser ? `${os} (${browser})` : os;
}

export const PAGE_NAMES_VI: Record<string, string> = {
  realtime: 'BC Ngày (Realtime)',
  luyke: 'BC Tháng (Lũy kế)',
  khaibao: 'Khai Báo Dữ Liệu',
  health: 'Sức Khỏe NV',
  toolhotro: 'Tool Hỗ Trợ',
  users: 'Quản Lý Người Dùng',
  tnb_data: 'Báo Cáo TNB',
  birthday: 'Sinh Nhật NV',
  feedback: 'Góp Ý Hệ Thống'
};

// Debounce tracker to prevent spamming DB
let lastLoggedTime = 0;
let lastLoggedPage = '';

export async function trackUserPing(
  username: string,
  storeCode: string,
  currentPage: string,
  action: 'LOGIN' | 'NAVIGATE' | 'PING' = 'PING'
) {
  if (!username || username === 'ADMIN') return;

  const now = Date.now();
  const device = getDeviceInfo();
  const pageLabel = PAGE_NAMES_VI[currentPage] || currentPage || 'Trang chủ';
  const isoTime = new Date().toISOString();

  try {
    // 1. Update user's last_active_at, current_page, device in ql_nguoi_dung
    const userUpdate: any = {
      username,
      storeCode,
      last_active_at: isoTime,
      current_page: pageLabel,
      device_info: device
    };

    if (action === 'LOGIN') {
      userUpdate.last_login_at = isoTime;
    }

    await supabase.from('ql_nguoi_dung').upsert(userUpdate, { onConflict: 'username' });

    // 2. Insert into user_access_logs if LOGIN or NAVIGATE
    if (action === 'LOGIN' || (action === 'NAVIGATE' && (currentPage !== lastLoggedPage || now - lastLoggedTime > 10000))) {
      lastLoggedTime = now;
      lastLoggedPage = currentPage;

      const logData = {
        username,
        storeCode,
        action: action === 'LOGIN' ? '🔑 Đăng nhập' : '📄 Chuyển trang',
        page: pageLabel,
        device_info: device,
        created_at: isoTime
      };

      await supabase.from('user_access_logs').insert([logData]);
    }
  } catch (err) {
    console.warn('[AccessTracker] Failed to record tracking ping:', err);
  }
}
