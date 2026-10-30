// ============================================================================
// SINGLE SOURCE OF TRUTH: APP PAGES & PERMISSION REGISTRY
// Quy tắc:
// 1. Hiển thị giao diện: Chỉ hiện trang đã được cấp quyền trong `allowed_pages`.
// 2. Truy cập bằng URL: Không có quyền thì bị chặn (403 Access Denied).
// 3. Thêm trang mới: Khi thêm trang vào `APP_PAGES_REGISTRY`, tự động sinh
//    checkbox trong modal phân quyền người dùng, mặc định chưa cấp quyền (`defaultGranted: false`).
// 4. Bảo vệ dữ liệu (Adapter & RLS): Đồng bộ ánh xạ bảng dữ liệu (`protectedTables`)
//    với `allowed_pages` để chặn truy vấn trái phép từ phía client/API và RLS.
// ============================================================================

export interface AppPageRegistryItem {
  id: string;
  /** Tên hiển thị đầy đủ trong Modal Phân quyền (DanhSachNguoiDung) */
  label: string;
  /** Tên hiển thị trên thanh điều hướng Sidebar / Mobile Nav */
  navLabel: string;
  /** Tên rút gọn hiển thị dạng badge trong bảng Danh sách người dùng */
  badgeLabel: string;
  /** Màu chấm tròn trong checkbox phân quyền */
  dotColor: string;
  /** Màu badge trong bảng người dùng */
  badgeColor: string;
  /** Đường dẫn URL chính của trang */
  path: string;
  /** Các đường dẫn URL phụ (alias) trỏ về cùng trang */
  aliases?: string[];
  /** Nhóm menu trên Sidebar */
  section: 'management' | 'utility';
  /** Mặc định cấp quyền khi tạo trang mới hoặc tạo user mới (Bắt buộc = false theo quy tắc bảo mật) */
  defaultGranted: boolean;
  /** Danh sách các bảng dữ liệu (Supabase/Firestore) thuộc phạm vi bảo vệ của trang này */
  protectedTables: string[];
}

export const APP_PAGES_REGISTRY: AppPageRegistryItem[] = [
  {
    id: 'realtime',
    label: 'Báo cáo Ngày (BC NGÀY)',
    navLabel: 'BC NGÀY',
    badgeLabel: 'BC NGÀY',
    dotColor: 'bg-indigo-500',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    path: '/realtime',
    section: 'management',
    defaultGranted: false,
    protectedTables: ['store', 'warehouse_time'],
  },
  {
    id: 'luyke',
    label: 'Báo cáo Tháng (BC THÁNG)',
    navLabel: 'BC THÁNG',
    badgeLabel: 'BC Tháng',
    dotColor: 'bg-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700',
    path: '/luy-ke',
    aliases: ['/luyke'],
    section: 'management',
    defaultGranted: false,
    protectedTables: ['store', 'warehouse_time'],
  },
  {
    id: 'khaibao',
    label: 'Khai Báo',
    navLabel: 'Cập nhật',
    badgeLabel: 'Khai Báo',
    dotColor: 'bg-indigo-500',
    badgeColor: 'bg-violet-100 text-violet-700',
    path: '/khai-bao',
    aliases: ['/khaibao'],
    section: 'management',
    defaultGranted: false,
    protectedTables: ['store', 'warehouse_time', 'employee_health'],
  },
  {
    id: 'health',
    label: 'Sức khoẻ nhân viên',
    navLabel: 'Sức khỏe NV',
    badgeLabel: 'Sức Khoẻ',
    dotColor: 'bg-rose-500',
    badgeColor: 'bg-rose-100 text-rose-700',
    path: '/suc-khoe',
    aliases: ['/health'],
    section: 'management',
    defaultGranted: false,
    protectedTables: ['employee_health', 'store'],
  },
  {
    id: 'toolhotro',
    label: 'Tool Hỗ Trợ',
    navLabel: 'Tool Hỗ Trợ',
    badgeLabel: 'Tool HT',
    dotColor: 'bg-amber-500',
    badgeColor: 'bg-amber-100 text-amber-700',
    path: '/tool-ho-tro',
    aliases: ['/toolhotro', '/posm'],
    section: 'utility',
    defaultGranted: false,
    protectedTables: ['scanner_sessions', 'store'],
  },
  {
    id: 'bbkq',
    label: 'BBKQ (Kiểm Quỹ)',
    navLabel: 'BBKQ (Kiểm Quỹ)',
    badgeLabel: 'BBKQ',
    dotColor: 'bg-teal-500',
    badgeColor: 'bg-teal-100 text-teal-700',
    path: '/bbkq',
    aliases: ['/kiem-quy', '/bbkq-kiem-quy'],
    section: 'utility',
    defaultGranted: false,
    protectedTables: ['bbkq_store_data'],
  },
  {
    id: 'tienich',
    label: 'Tiện Ích',
    navLabel: 'Tiện Ích',
    badgeLabel: 'Tiện Ích',
    dotColor: 'bg-purple-500',
    badgeColor: 'bg-purple-100 text-purple-700',
    path: '/tien-ich',
    aliases: ['/tienich'],
    section: 'utility',
    defaultGranted: false,
    protectedTables: ['inventory_schedules', 'inventory_assignments', 'store'],
  },
  {
    id: 'tnb_data',
    label: 'TNB DATA',
    navLabel: 'TNB DATA',
    badgeLabel: 'TNB DATA',
    dotColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    path: '/tnb-data',
    aliases: ['/tnb_data'],
    section: 'management',
    defaultGranted: false,
    protectedTables: ['tnb_data', 'tnb_dm_7611_data'],
  },
  {
    id: 'tnbleader',
    label: 'TNB LEADER',
    navLabel: 'TNB LEADER',
    badgeLabel: 'TNB LEADER',
    dotColor: 'bg-amber-500',
    badgeColor: 'bg-amber-100 text-amber-700',
    path: '/tnb-leader',
    aliases: ['/tnbleader'],
    section: 'management',
    defaultGranted: false,
    protectedTables: ['tnb_data', 'tnb_dm_7611_data'],
  },
  {
    id: 'birthday',
    label: 'Sinh nhật NV',
    navLabel: 'Sinh nhật NV',
    badgeLabel: 'Sinh Nhật',
    dotColor: 'bg-pink-500',
    badgeColor: 'bg-pink-100 text-pink-700',
    path: '/sinh-nhat',
    aliases: ['/birthday'],
    section: 'utility',
    defaultGranted: false,
    protectedTables: ['store'],
  },
  {
    id: 'feedback',
    label: 'HƯỚNG DẪN & GÓP Ý',
    navLabel: 'HƯỚNG DẪN & GÓP Ý',
    badgeLabel: 'HƯỚNG DẪN & GÓP Ý',
    dotColor: 'bg-indigo-500',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    path: '/feedback',
    section: 'utility',
    defaultGranted: false,
    protectedTables: ['website_feedbacks', 'website_feedback_replies'],
  },
  {
    id: 'excelviewer',
    label: 'XEM FILE EXCEL',
    navLabel: 'XEM FILE EXCEL',
    badgeLabel: 'XEM FILE EXCEL',
    dotColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    path: '/excel-viewer',
    aliases: ['/excelviewer'],
    section: 'utility',
    defaultGranted: false,
    protectedTables: [],
  },
  {
    id: 'lichpg',
    label: 'Lịch Làm Việc PG',
    navLabel: 'Lịch PG',
    badgeLabel: 'Lịch PG',
    dotColor: 'bg-teal-500',
    badgeColor: 'bg-teal-100 text-teal-700',
    path: '/lich-pg',
    aliases: ['/lichpg'],
    section: 'utility',
    defaultGranted: false,
    protectedTables: ['store'],
  },
];

/**
 * Cho phép đăng ký động trang mới vào hệ thống tại runtime (nếu có module mở rộng).
 * Mọi trang mới đều mặc định `defaultGranted: false` (chưa cấp quyền).
 */
export function registerAppPage(page: Omit<AppPageRegistryItem, 'defaultGranted'> & { defaultGranted?: boolean }): void {
  const exists = APP_PAGES_REGISTRY.some((p) => p.id === page.id);
  if (!exists) {
    const normalized: AppPageRegistryItem = {
      ...page,
      defaultGranted: page.defaultGranted ?? false,
    };
    APP_PAGES_REGISTRY.push(normalized);
    PAGE_URL_MAP[normalized.id] = normalized.path;
    URL_PAGE_MAP[normalized.path.toLowerCase()] = normalized.id;
    (normalized.aliases || []).forEach((alias) => {
      URL_PAGE_MAP[alias.toLowerCase()] = normalized.id;
    });
  }
}

/**
 * Trả về danh sách trang mặc định khi tạo mới tài khoản (Mặc định: [] - chưa cấp quyền trang nào
 * đối với các trang có `defaultGranted: false`).
 */
export function getDefaultAllowedPagesForNewUser(): string[] {
  return APP_PAGES_REGISTRY.filter((p) => p.defaultGranted === true).map((p) => p.id);
}

/**
 * Bảng ánh xạ từ tên bảng dữ liệu (Supabase / Firestore) sang danh sách các `pageId` được phép truy cập.
 * Dùng cho tầng Adapter Guard & đồng bộ với chính sách RLS.
 */
export const TABLE_REQUIRED_PAGES_MAP: Record<string, string[]> = {
  employee_health: ['health', 'khaibao'],
  inventory_schedules: ['tienich'],
  inventory_assignments: ['tienich'],
  scanner_sessions: ['toolhotro'],
  bbkq_store_data: ['bbkq'],
  tnb_data: ['tnb_data', 'tnbleader'],
  tnb_dm_7611_data: ['tnbleader', 'tnb_data'],
  website_feedbacks: ['feedback'],
  website_feedback_replies: ['feedback'],
  phan_ca_hc: ['tienich', 'lichpg'],
  weekly_shifts: ['tienich', 'lichpg'],
};

// Bảng ánh xạ từ page ID sang URL pathname thân thiện (tự động đồng bộ từ APP_PAGES_REGISTRY)
export const PAGE_URL_MAP: Record<string, string> = {
  posm: '/posm',
  users: '/users',
  ...Object.fromEntries(APP_PAGES_REGISTRY.map((p) => [p.id, p.path])),
};

// Bảng ánh xạ từ URL pathname sang page ID (tự động đồng bộ từ APP_PAGES_REGISTRY)
export const URL_PAGE_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {
    '/posm': 'toolhotro',
    '/users': 'users',
  };
  for (const page of APP_PAGES_REGISTRY) {
    map[page.path.toLowerCase()] = page.id;
    map[`/${page.id.toLowerCase()}`] = page.id;
    if (page.aliases) {
      for (const alias of page.aliases) {
        map[alias.toLowerCase()] = page.id;
      }
    }
  }
  return map;
})();

// Bảng ánh xạ tab mặc định cho từng trang để tối ưu rút gọn link chia sẻ
export const PAGE_DEFAULT_TAB_MAP: Record<string, string> = {
  realtime: 'summary',
  luyke: 'summary',
  health: 'DOANH_THU',
  toolhotro: 'all-sticker',
  tienich: 'tuong-tac-line',
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
  // Với Lịch PG: thêm cờ share=true để đảm bảo nhận diện 100% link chia sẻ trên mọi thiết bị và trình duyệt
  if (pageId === 'lichpg') {
    params.set('share', 'true');
  }
  const queryStr = params.toString();
  return `${origin}${pathname}${queryStr ? `?${queryStr}` : ''}`;
};

// Helper kiểm tra xem URL có phải là link chia sẻ chế độ khách hay không
export const isGuestShareLink = (search: string = ''): boolean => {
  try {
    // 0. Đường dẫn trực tiếp /posm (chế độ xem POSM nhanh) hoặc /lich-pg, /lichpg (chế độ xem Lịch PG trực tiếp)
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (path === '/posm' || path === '/lich-pg' || path === '/lichpg') {
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
          // Trên trang BBKQ (/bbkq), tài khoản đã đăng nhập KHÔNG được tự động chuyển sang guest khi đổi ?kho= trên URL,
          // để hệ thống kiểm tra nghiêm ngặt quyền truy cập kho của tài khoản đang đăng nhập.
          const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
          const isBbkqRoute =
            currentPath === '/bbkq' ||
            currentPath === '/kiem-quy' ||
            currentPath === '/bbkq-kiem-quy' ||
            params.get('page') === 'bbkq';
          if (isBbkqRoute) {
            return false;
          }
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

// Helper kiểm tra xem lượt truy cập hiện tại vào Lịch PG có phải là từ link chia sẻ hay không
// (Bao gồm: khách mở link chia sẻ, người dùng đã đăng nhập mở link chia sẻ qua Zalo/URL, link có ?share=true hoặc ?kho=..., hoặc mở qua /lich-pg)
export const isShareLinkForLichPg = (search: string = ''): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const isLichPgRoute = path === '/lich-pg' || path === '/lichpg';

    const rawSearch = search || (typeof window !== 'undefined' ? (window.location.search || window.location.hash || '') : '');
    const queryPart = rawSearch.includes('?') ? rawSearch.substring(rawSearch.indexOf('?')) : (rawSearch.startsWith('#') ? rawSearch.substring(1) : rawSearch);
    const params = new URLSearchParams(queryPart);

    // 1. Cờ chia sẻ tường minh (?share=true, ?view=guest...)
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

    // 2. Phiên làm việc hiện tại là tài khoản khách (Guest mode) hoặc chưa đăng nhập
    const storedUser = localStorage.getItem('userProfile');
    let isLoggedInMember = false;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role === 'guest' || parsed.isGuest) return true;
        if (parsed.username) isLoggedInMember = true;
      } catch {}
    } else {
      // Chưa đăng nhập mà đang trên route lichpg hoặc có kho -> xem qua link chia sẻ
      if (isLichPgRoute || params.get('kho') || params.get('k') || params.get('makho') || params.get('store')) {
        return true;
      }
    }

    // 3. Nếu đã đăng nhập tài khoản nhân viên thật, chỉ tính là link chia sẻ khi có cờ share tường minh ở mục (1)
    if (isLoggedInMember) {
      return false;
    }

    return false;
  } catch {
    return false;
  }
};

