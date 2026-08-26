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
  feedback: 'Hướng Dẫn & Góp Ý'
};

// Đã dừng hoàn toàn tính năng định danh & heartbeat ping theo yêu cầu để triệt tiêu 100% chi phí đọc/ghi Firebase
export async function trackUserPing(
  _username?: string,
  _storeCode?: string,
  _currentPage?: string,
  _action: 'LOGIN' | 'NAVIGATE' | 'PING' | 'REGISTER' = 'PING'
) {
  // No-op: Không thực hiện bất kỳ truy vấn đọc/ghi nào lên Firebase
  return;
}
