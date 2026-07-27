import { firebaseAdapter } from './firebaseAdapter';
import { isFirebaseConfigured } from './firebaseConfig';

// We export the adapter as 'supabase' to minimize changes in other files
export const supabase = firebaseAdapter as any;
export const isSupabaseConfigured = isFirebaseConfigured;

// Log diagnostic for Firebase
console.log('[FIREBASE]', {
  isConfigured: isFirebaseConfigured,
  provider: 'Firebase Firestore'
});

export async function testSupabaseConnection() {
  console.log('[FIREBASE] Testing Firestore connection...');
  
  if (!isFirebaseConfigured) {
    return { online: false, error: 'Firebase chưa được cấu hình. Vui lòng thêm VITE_FIREBASE_API_KEY vào biến môi trường.' };
  }
  
  try {
    // Simple test query to verify Firestore is accessible
    const { error } = await supabase.from('ql_nguoi_dung').select('username').limit(1);
    if (error) throw error;
    return { online: true };
  } catch (error: any) {
    console.error('[FIREBASE] Connection test error:', error);
    return { online: false, error: 'Lỗi kết nối Firebase Firestore. Hãy kiểm tra database đã được tạo chưa.' };
  }
}
