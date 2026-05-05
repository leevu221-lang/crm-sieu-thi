import { createClient } from '@supabase/supabase-js';

// Hỗ trợ cả biến có VITE_ và không có VITE_ để tránh nhầm lẫn
const getEnvVar = (name: string) => {
  const viteVar = (import.meta as any).env[`VITE_${name}`];
  const directVar = (import.meta as any).env[name];
  // Thử thêm cả process.env nếu import.meta không có (cho node scripts nếu cần)
  const processVar = typeof process !== 'undefined' ? process.env[`VITE_${name}`] || process.env[name] : undefined;
  
  return (viteVar || directVar || processVar || '').trim();
};

let rawSupabaseUrl = getEnvVar('SUPABASE_URL').replace(/\/$/, '');
const rawSupabaseKey = getEnvVar('SUPABASE_ANON_KEY');

// Tự động thêm https:// nếu người dùng quên
if (rawSupabaseUrl && !rawSupabaseUrl.startsWith('http')) {
  rawSupabaseUrl = `https://${rawSupabaseUrl}`;
}

export const supabaseUrl = rawSupabaseUrl;
export const supabaseAnonKey = rawSupabaseKey;

// Kiểm tra xem đã có cấu hình hợp lệ chưa
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  !supabaseUrl.includes("your-project-id") &&
  !supabaseUrl.includes("DÁN_URL") &&
  !supabaseUrl.includes("api.supabase.com")
);

// Khởi tạo client một cách an toàn
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-id.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
);

// Log để debug trạng thái (luôn log một phần nhỏ để debug kết nối)
console.log('[SUPABASE_DIAGNOSTIC]', {
  urlLength: supabaseUrl.length,
  urlStart: supabaseUrl.substring(0, 15) + '...',
  urlEnd: '...' + supabaseUrl.substring(supabaseUrl.length - 12),
  isConfigured: isSupabaseConfigured,
  isManagementApi: supabaseUrl.includes('api.supabase.com'),
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length
});

export async function testSupabaseConnection() {
  console.log('[SUPABASE] Testing connection...');
  
  if (!isSupabaseConfigured) {
    const missingVars = [];
    if (!supabaseUrl || supabaseUrl.includes('your-project-id')) missingVars.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-public-key') missingVars.push('VITE_SUPABASE_ANON_KEY');
    
    let errorMsg = `Thiếu cấu hình ${missingVars.join(' và ')} trong Secrets.`;
    if (supabaseUrl.includes('api.supabase.com')) {
      errorMsg = 'Bạn đang sử dụng URL Quản trị (api.supabase.com). Vui lòng sử dụng Project URL (có đuôi .supabase.co) trong mục Settings > API của Supabase.';
    }

    console.error('[SUPABASE] Configuration issue:', errorMsg);
    return { online: false, error: errorMsg };
  }
  
  try {
    // Thử thực hiện một truy vấn đơn giản để kiểm tra kết nối
    // Sử dụng bảng 'ql_nguoi_dung' theo yêu cầu đồng bộ
    const { data, error } = await supabase
      .from('ql_nguoi_dung')
      .select('username')
      .limit(1);
    
    if (error) {
      console.error('[SUPABASE] Connection test error details:', error);
      
      // Lỗi mạng hoặc URL sai (thường gây ra Failed to fetch)
      if (error.message?.includes('Failed to fetch') || !error.code) {
        return { 
          online: false, 
          error: 'Không thể kết nối tới Supabase. Vui lòng kiểm tra lại VITE_SUPABASE_URL trong Secrets (đảm bảo dùng Project URL có đuôi .supabase.co, không phải api.supabase.com).' 
        };
      }

      // PGRST116: Table exists but is empty
      if (error.code === 'PGRST116') {
        return { online: true };
      }

      // 401 Unauthorized: Key sai
      if (error.code === '401' || error.message?.includes('JWT')) {
        return { 
          online: false, 
          error: 'Lỗi xác thực Supabase. Vui lòng kiểm tra lại VITE_SUPABASE_ANON_KEY trong Secrets.' 
        };
      }

      return { online: false, error: `Lỗi Supabase (${error.code}): ${error.message}` };
    }
    
    return { online: true };
  } catch (error: any) {
    console.error('[SUPABASE] Unexpected connection error:', error);
    let errorMessage = error.message || 'Lỗi kết nối Supabase không xác định.';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
      errorMessage = 'Không thể kết nối tới Supabase (Network Error). Vui lòng kiểm tra:\n1. VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY đã được thêm vào Secrets.\n2. URL phải có đuôi .supabase.co (không phải api.supabase.com).\n3. Đảm bảo bạn có kết nối internet và URL không có dấu cách dư thừa.';
    }
    
    return { 
      online: false, 
      error: errorMessage 
    };
  }
}
