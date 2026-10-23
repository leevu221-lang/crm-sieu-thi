// Bảng ánh xạ từ page ID sang URL pathname thân thiện
export const PAGE_URL_MAP: Record<string, string> = {
  posm: '/posm',
  realtime: '/realtime',
  health: '/suc-khoe',
  luyke: '/luy-ke',
  khaibao: '/khai-bao',
  lichpg: '/lich-pg',
  toolhotro: '/tool-ho-tro',
  bbkq: '/bbkq',
  tienich: '/tien-ich',
  users: '/users',
  tnb_data: '/tnb-data',
  tnbleader: '/tnb-leader',
  birthday: '/sinh-nhat',
  feedback: '/feedback',
  excelviewer: '/excel-viewer',
};

// Bảng ánh xạ từ URL pathname sang page ID
export const URL_PAGE_MAP: Record<string, string> = {
  '/posm': 'toolhotro',
  '/realtime': 'realtime',
  '/health': 'health',
  '/suc-khoe': 'health',
  '/luyke': 'luyke',
  '/luy-ke': 'luyke',
  '/khaibao': 'khaibao',
  '/khai-bao': 'khaibao',
  '/lichpg': 'lichpg',
  '/lich-pg': 'lichpg',
  '/toolhotro': 'toolhotro',
  '/tool-ho-tro': 'toolhotro',
  '/bbkq': 'bbkq',
  '/kiem-quy': 'bbkq',
  '/bbkq-kiem-quy': 'bbkq',
  '/tienich': 'tienich',
  '/tien-ich': 'tienich',
  '/users': 'users',
  '/tnb-data': 'tnb_data',
  '/tnb_data': 'tnb_data',
  '/tnb-leader': 'tnbleader',
  '/tnbleader': 'tnbleader',
  '/sinh-nhat': 'birthday',
  '/birthday': 'birthday',
  '/feedback': 'feedback',
  '/excel-viewer': 'excelviewer',
  '/excelviewer': 'excelviewer',
};

// Bảng ánh xạ tab mặc định cho từng trang để tối ưu rút gọn link chia sẻ
export const PAGE_DEFAULT_TAB_MAP: Record<string, string> = {
  realtime: 'summary',
  luyke: 'summary',
  health: 'DOANH_THU',
  toolhotro: 'all-sticker',
  tienich: 'phan-ca-hc',
};

// Helper tạo URL chia sẻ chế độ khách (view-only) cho một trang + mã kho cụ thể
// Tối ưu rút gọn tối đa:
// - POSM ALL SP: https://crm-sieu-thi.pages.dev/posm
// - Bỏ tab nếu trùng tab mặc định
// - Bỏ siêu thị st nếu là siêu thị mặc định duy nhất hoặc siêu thị đầu tiên của kho
// - Link siêu ngắn gọn: https://crm-sieu-thi.pages.dev/tool-ho-tro?kho=1841
export const buildGuestShareUrl = (
  pageId: string, 
  kho: string, 
  tab?: string, 
  storeName?: string,
  isDefaultStore?: boolean
): string => {
  const origin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin 
    : 'https://crm-sieu-thi.pages.dev';

  // Đặc biệt: Nếu là tab POSM ALL SP ('popup-all-sp') của Tool Hỗ Trợ
  if (pageId === 'toolhotro' && tab === 'popup-all-sp') {
    if (!kho || kho === '1841') {
      return `${origin}/posm`;
    }
    return `${origin}/posm?kho=${encodeURIComponent(kho)}`;
  }

  const pathname = PAGE_URL_MAP[pageId] || `/${pageId}`;
  const params = new URLSearchParams();
  if (kho) {
    params.set('kho', kho);
  }
  // Chỉ thêm tab nếu khác tab mặc định của trang
  const defaultTab = PAGE_DEFAULT_TAB_MAP[pageId];
  if (tab && tab !== defaultTab) {
    params.set('tab', tab);
  }
  // Chỉ thêm siêu thị st nếu kho có nhiều hơn 1 siêu thị và không phải siêu thị đầu tiên
  if (storeName && storeName !== 'ALL' && !isDefaultStore) {
    params.set('st', storeName);
  }
  const queryStr = params.toString();
  return `${origin}${pathname}${queryStr ? `?${queryStr}` : ''}`;
};

// Helper kiểm tra xem URL có phải là link chia sẻ chế độ khách hay không
export const isGuestShareLink = (search: string = ''): boolean => {
  try {
    // 0. Đường dẫn trực tiếp /posm (chế độ xem POSM nhanh)
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (path === '/posm') {
        const storedUser = localStorage.getItem('userProfile');
        // Chưa đăng nhập -> tự động vào xem trực tiếp chế độ khách
        if (!storedUser) return true;
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role === 'guest' || parsed.isGuest) return true;
        } catch {
          return true;
        }
      }
    }

    const rawSearch = search || (typeof window !== 'undefined' ? (window.location.search || window.location.hash || '') : '');
    const queryPart = rawSearch.includes('?') ? rawSearch.substring(rawSearch.indexOf('?')) : (rawSearch.startsWith('#') ? rawSearch.substring(1) : rawSearch);
    const params = new URLSearchParams(queryPart);
    
    // 1. Cờ chia sẻ tường minh (tương thích ngược 100% với các link cũ)
    if (
      params.get('view') === 'guest' || 
      params.get('share') === 'true' || 
      params.get('share') === '1' || 
      params.has('share') || 
      params.get('guest') === 'true' || 
      params.get('guest') === '1' || 
      params.get('mode') === 'guest' || 
      params.get('mode') === 'share'
    ) {
      return true;
    }

    // 2. Link chia sẻ rút gọn (có tham số kho hoặc k)
    const khoParam = params.get('kho') || params.get('k') || params.get('makho') || params.get('store');
    if (khoParam) {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('userProfile');
        // Chưa đăng nhập -> chắc chắn là khách mở link chia sẻ
        if (!storedUser) return true;
        try {
          const parsed = JSON.parse(storedUser);
          // Phiên hiện tại là role guest -> là khách
          if (parsed.role === 'guest' || parsed.isGuest) return true;
          // Nếu user đang đăng nhập nhưng mở link có mã kho khác với tài khoản đang đăng nhập -> xem khách của kho đó
          if (parsed.ma_kho && String(parsed.ma_kho).trim() !== String(khoParam).trim()) {
            return true;
          }
        } catch {
          return true;
        }
      } else {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};
