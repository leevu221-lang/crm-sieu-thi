// Bảng ánh xạ từ page ID sang URL pathname thân thiện
export const PAGE_URL_MAP: Record<string, string> = {
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
  bangiasoc: '/ban-gia-soc',
};

// Bảng ánh xạ từ URL pathname sang page ID
export const URL_PAGE_MAP: Record<string, string> = {
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
  '/ban-gia-soc': 'bangiasoc',
  '/bangiasoc': 'bangiasoc',
};

// Helper tạo URL chia sẻ chế độ khách (view-only) cho một trang + mã kho cụ thể
export const buildGuestShareUrl = (pageId: string, kho: string): string => {
  const pathname = PAGE_URL_MAP[pageId] || `/${pageId}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams();
  params.set('share', 'true');
  if (kho) {
    params.set('kho', kho);
  }
  return `${origin}${pathname}?${params.toString()}`;
};

// Helper kiểm tra xem URL có phải là link chia sẻ chế độ khách hay không
export const isGuestShareLink = (search: string = ''): boolean => {
  try {
    const rawSearch = search || (typeof window !== 'undefined' ? (window.location.search || window.location.hash || '') : '');
    const queryPart = rawSearch.includes('?') ? rawSearch.substring(rawSearch.indexOf('?')) : (rawSearch.startsWith('#') ? rawSearch.substring(1) : rawSearch);
    const params = new URLSearchParams(queryPart);
    return params.get('view') === 'guest' || 
           params.get('share') === 'true' || 
           params.get('share') === '1' || 
           params.has('share') || 
           params.get('guest') === 'true' || 
           params.get('guest') === '1' || 
           params.get('mode') === 'guest' || 
           params.get('mode') === 'share';
  } catch {
    return false;
  }
};
