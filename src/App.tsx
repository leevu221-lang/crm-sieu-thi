import React, { useState, Suspense, lazy, useEffect, useMemo, useRef, useCallback } from 'react';
import { Database, BarChart3, Activity, HeartPulse, LogOut, User, Store, Loader2, Users, Shield, Settings, Type, Minus, Plus as PlusIcon, Monitor, Smartphone, LayoutGrid, AlertCircle, Wrench, ShieldAlert, RefreshCw, Zap, ShoppingBag, Globe, Trophy, Gift, X, MessageSquare, CreditCard, FileSpreadsheet, CalendarDays, ExternalLink, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { useStore } from './contexts/StoreContext';
import { LuykeDataProvider } from './contexts/LuykeDataContext';
import { RTSTSharedDataProvider } from './pages/RTST/hooks/useRTSTSharedData';
import Login from './pages/Login';
import StoreDeclaration from './pages/StoreDeclaration';
import { testSupabaseConnection } from './supabaseClient';
import VersionUpdateNotifier from './components/VersionUpdateNotifier';
import { birthdayService } from './services/birthdayService';
import SubscriptionLockScreen from './components/SubscriptionLockScreen';
import { trackUserPing } from './services/accessTracker';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { GradientV2Layout } from './layouts/v2/GradientV2Layout';
import { isValidStoreName } from './pages/RTST/utils';
import { getConfiguredStoresFromBoss } from './services/storeSync';

// Core Primary Pages statically imported for instantaneous 0ms tab switching
import NewRealtimePage from './pages/RealtimePage';
import EmployeeHealth from './pages/SucKhoeNhanVien';
import LuyKe from './pages/LuyKe';
import KhaiBao from './pages/KhaiBao';

// Wrapper to auto-reload if dynamic import fails for secondary pages
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error: any) {
      console.warn('[lazyWithRetry] Dynamic import failed, auto refreshing...', error);
      if (!pageHasAlreadyBeenForceRefreshed || error?.message?.includes('Failed to fetch dynamically imported module')) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

// Secondary pages lazy loaded with auto-retry
const LichLamViecPG = lazyWithRetry(() => import('./pages/LichLamViecPG'));
const ToolHoTro = lazyWithRetry(() => import('./pages/ToolHoTro'));
const BbkqPage = lazyWithRetry(() => import('./pages/BbkqPage'));
const TienIch = lazyWithRetry(() => import('./pages/TienIch'));
const UserManagement = lazyWithRetry(() => import('./pages/DanhSachNguoiDung'));
const StickerCeScanner = lazyWithRetry(() => import('./components/StickerCeScanner'));
const TnbData = lazyWithRetry(() => import('./pages/TnbData'));
const TnbLeader = lazyWithRetry(() => import('./pages/TnbLeader'));
const SinhNhatNv = lazyWithRetry(() => import('./pages/SinhNhatNv'));
const FeedbackPage = lazyWithRetry(() => import('./pages/FeedbackPage'));
const ExcelViewer = lazyWithRetry(() => import('./pages/ExcelViewer').then(module => ({ default: module.ExcelViewer })));

const LoadingSpinner = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
    <div className="relative">
      <div className="w-10 h-10 border-3 border-indigo-100 rounded-full"></div>
      <div className="w-10 h-10 border-3 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
    </div>
    <p className="mt-3 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Đang tải...</p>
  </div>
);

import { APP_PAGES_REGISTRY, PAGE_URL_MAP, URL_PAGE_MAP, isGuestShareLink, PAGE_DEFAULT_TAB_MAP, isShareLinkForLichPg } from './constants/routes';

function MainApp() {
  // Nhận diện CHẾ ĐỘ KHÁCH: Chỉ kích hoạt khi mở từ link chia sẻ (?view=guest hoặc ?share=true)
  const isDirectDedicatedMode = useMemo(() => {
    return isGuestShareLink(window.location.search);
  }, []);

  const [currentPage, setCurrentPage] = useState<'realtime' | 'users' | 'health' | 'khaibao' | 'luyke' | 'toolhotro' | 'bbkq' | 'tienich' | 'tnb_data' | 'birthday' | 'feedback' | 'excelviewer' | 'lichpg' | 'tnbleader'>(() => {
    try {
      // 1. Ưu tiên đọc từ URL pathname (/posm, /lich-pg, /realtime, /suc-khoe...)
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (path === '/posm') {
        return 'toolhotro';
      }
      if (path === '/lich-pg' || path === '/lichpg') {
        try {
          sessionStorage.setItem('crm_opened_via_share_lichpg', 'true');
        } catch {}
        return 'lichpg';
      }
      if (path && URL_PAGE_MAP[path]) {
        return URL_PAGE_MAP[path] as any;
      }
      // 2. Đọc từ query param ?page= hoặc hash
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const hash = window.location.hash;
      if (pageParam === 'lichpg') {
        try {
          sessionStorage.setItem('crm_opened_via_share_lichpg', 'true');
        } catch {}
      }
      if (pageParam && pageParam !== 'bangiasoc') return pageParam as any;
      if (hash.startsWith('#sync_thuong=')) return 'health';
    } catch {}

    try {
      const saved = localStorage.getItem('crm_active_page');
      if (saved && saved !== 'bangiasoc') return saved as any;
    } catch {}

    return 'realtime';
  });

  const [visitedPages, setVisitedPages] = useState<Set<string>>(() => new Set([currentPage]));

  useEffect(() => {
    setVisitedPages(prev => {
      if (prev.has(currentPage)) return prev;
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
  }, [currentPage]);

  // Theo dõi xem người dùng có truy cập trực tiếp bằng URL cụ thể (/ten-trang hoặc ?page=...) hay không
  const [hasExplicitUrlTarget, setHasExplicitUrlTarget] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (path && path !== '' && URL_PAGE_MAP[path]) return true;
      const params = new URLSearchParams(window.location.search);
      if (params.get('page')) return true;
    } catch {}
    return false;
  });

  const handleSetCurrentPage = useCallback((page: any) => {
    setHasExplicitUrlTarget(false);
    setVisitedPages(prev => {
      if (prev.has(page)) return prev;
      const next = new Set(prev);
      next.add(page);
      return next;
    });
    setCurrentPage(page);
  }, []);
  const { userProfile, loading, logout, refreshProfile, updateStoreName } = useAuth();
  const isUser43751Local = String(userProfile?.username || '').trim() === '43751' ||
                           String(userProfile?.ma_nhan_vien || '').trim() === '43751' ||
                           String(userProfile?.user_id || '').trim() === '43751' ||
                           String(userProfile?.username || '').toLowerCase().includes('43751') ||
                           String(userProfile?.selected_store || '').includes('155A NGUYỄN TẤT THÀNH') ||
                           String(userProfile?.ten_sieu_thi || '').includes('155A NGUYỄN TẤT THÀNH');

  // Bỏ qua màn hình đăng nhập, khai báo và khóa gói cước khi truy cập chế độ xem trực tiếp không cần đăng nhập
  const isGuestOrDirectMode = userProfile?.role === 'guest' || userProfile?.isGuest === true || isDirectDedicatedMode || (typeof window !== 'undefined' && isGuestShareLink());

  const [showDeclarationForce, setShowDeclarationForce] = useState(() => {
    try {
      return sessionStorage.getItem('justLoggedIn') === 'true';
    } catch {
      return false;
    }
  });

  const [declarationDismissed, setDeclarationDismissed] = useState(false);

  // Tự động bật form cấu hình tên siêu thị ngay sau khi người dùng đăng nhập thành công
  useEffect(() => {
    if (userProfile && !isGuestOrDirectMode) {
      try {
        if (sessionStorage.getItem('justLoggedIn') === 'true') {
          setShowDeclarationForce(true);
        }
      } catch {}
    }
  }, [userProfile, isGuestOrDirectMode]);

  const handleDeclarationComplete = () => {
    try {
      sessionStorage.setItem('justLoggedIn', 'false');
    } catch {}
    setShowDeclarationForce(false);
    setDeclarationDismissed(true);
  };

  const isDeclarationRequired = useMemo(() => {
    if (!userProfile) return false;
    if (String(userProfile.username).trim() === '43751') return false;
    
    // Explicitly check for false, meaning the user registered but hasn't completed declaration yet.
    if (userProfile.declarationCompleted === false) return true;

    // If warehouse already has configured stores in DS BOSS, declaration is established
    const bossStores = getConfiguredStoresFromBoss(userProfile.ma_kho || '');
    if (bossStores && bossStores.length > 0) {
      return false;
    }

    // Also require declaration if not marked completed and user has no valid store name or placeholder store name
    if (userProfile.declarationCompleted !== true) {
      const st = userProfile.ten_sieu_thi || userProfile.selected_store;
      if (!st || !isValidStoreName(st) || /^siêu\s*thị\s*\d+/i.test(st)) {
        return true;
      }
    }
    return false;
  }, [userProfile]);
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useSettings();
  const { marketFilter, setMarketFilter, availableMarkets, activeRealtimeTab, activeToolHoTroTab, activeTienIchTab, activeLuyKeTab, activeHealthTab, currentStoreId } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(true);
  
  // Page Maintenance Mode State
  const [pageMaintenanceState, setPageMaintenanceState] = useState<Record<string, boolean>>({});
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  // Page Hidden Mode State (Ẩn khỏi người dùng - chỉ hiển thị với user 43751)
  const [pageHiddenState, setPageHiddenState] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem('crm_hidden_pages');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const effectivePageKey = currentPage === 'realtime' ? `realtime_${activeRealtimeTab}` : 
                           currentPage === 'toolhotro' ? `toolhotro_${activeToolHoTroTab}` : 
                           currentPage === 'tienich' ? `tienich_${activeTienIchTab}` : 
                           currentPage === 'luyke' ? `luyke_${activeLuyKeTab}` :
                           currentPage === 'health' ? `health_${activeHealthTab}` :
                           currentPage;

  // Đồng bộ URL trình duyệt (https://crm-sieu-thi.pages.dev/tentrang?kho=...&tab=...)
  useEffect(() => {
    if (loading) return; // Wait until authentication state is fully settled to avoid race conditions or jumping kho
    if (currentPage) {
      try {
        const isPosmRoute = (currentPage === 'toolhotro' && activeToolHoTroTab === 'popup-all-sp');
        const basePath = isPosmRoute ? '/posm' : (PAGE_URL_MAP[currentPage] || `/${currentPage}`);
        const params = new URLSearchParams(window.location.search);
        const isShare = isDirectDedicatedMode || isGuestShareLink(window.location.search);
        const isGuest = isShare || userProfile?.role === 'guest';
        
        // Logged-in accounts have absolute priority on their own registered warehouse (userProfile.ma_kho).
        // External URLs (?kho=...) CANNOT override or jump warehouse for an authenticated user.
        const kho = (userProfile && !isGuest && userProfile.ma_kho)
          ? userProfile.ma_kho
          : (params.get('kho') || params.get('k') || params.get('makho') || params.get('store') || localStorage.getItem('rtst_ma_kho') || userProfile?.ma_kho || (isPosmRoute ? '1841' : ''));
        
        const currentTab = currentPage === 'realtime' ? activeRealtimeTab :
                           currentPage === 'luyke' ? activeLuyKeTab :
                           currentPage === 'health' ? activeHealthTab :
                           currentPage === 'toolhotro' ? activeToolHoTroTab :
                           currentPage === 'tienich' ? activeTienIchTab : (params.get('tab') || '');
        
        const defaultTab = PAGE_DEFAULT_TAB_MAP[currentPage];
        const isDefaultTab = !currentTab || currentTab === defaultTab;
        const isDefaultStore = !availableMarkets || availableMarkets.length <= 1 || 
                               (availableMarkets.length > 0 && availableMarkets[0]?.name === currentStoreId);

        const queryParams = new URLSearchParams();

        if (isPosmRoute) {
          // Với route /posm: Nếu kho khác 1841 thì mới thêm kho, còn kho 1841 (mặc định) thì URL giữ nguyên sạch sẽ: /posm
          if (kho && kho !== '1841') {
            queryParams.set('kho', kho);
          }
          if (params.get('view') === 'guest') {
            queryParams.set('view', 'guest');
          }
        } else if (isGuest || isShare) {
          if (kho) queryParams.set('kho', kho);
          if (!isDefaultTab && currentTab) queryParams.set('tab', currentTab);
          // Chỉ giữ param st (siêu thị) trong URL cho guest nếu kho có nhiều hơn 1 siêu thị và không phải siêu thị đầu tiên
          if (!isDefaultStore && currentStoreId && currentStoreId !== 'ALL') {
            queryParams.set('st', currentStoreId);
          }
          if (params.get('view') === 'guest') {
            queryParams.set('view', 'guest');
          }
          if (params.get('share') === 'true' || (currentPage === 'lichpg' && isShare)) {
            queryParams.set('share', 'true');
          }
        } else {
          // Phiên đã đăng nhập: với trang BBKQ giữ nguyên tham số kho trên URL (nếu có hoặc từ tài khoản) để kiểm tra & cách ly theo kho
          if (currentPage === 'bbkq') {
            const urlKhoParam = params.get('kho') || params.get('k') || params.get('makho') || kho;
            if (urlKhoParam) {
              queryParams.set('kho', urlKhoParam);
            }
          }
          if (!isDefaultTab && currentTab) queryParams.set('tab', currentTab);
          if (!isDefaultStore && currentStoreId && currentStoreId !== 'ALL') {
            queryParams.set('st', currentStoreId);
          }
        }

        const queryStr = queryParams.toString();
        const targetPath = `${basePath}${queryStr ? `?${queryStr}` : ''}`;
        const currentFull = window.location.pathname + window.location.search;
        if (currentFull !== targetPath) {
          window.history.replaceState({ page: currentPage, tab: currentTab }, '', targetPath);
        }
      } catch {}
    }
  }, [
    loading,
    currentPage, 
    isDirectDedicatedMode, 
    userProfile?.ma_kho, 
    userProfile?.role,
    activeRealtimeTab,
    activeLuyKeTab,
    activeHealthTab,
    activeToolHoTroTab,
    activeTienIchTab,
    currentStoreId,
    availableMarkets
  ]);

  // Lắng nghe nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
        if (path && URL_PAGE_MAP[path]) {
          setHasExplicitUrlTarget(true);
          setCurrentPage(URL_PAGE_MAP[path] as any);
        }
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    if (path && URL_PAGE_MAP[path]) {
      setHasExplicitUrlTarget(true);
      setCurrentPage(URL_PAGE_MAP[path] as any);
    } else {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const hash = window.location.hash;
      if (pageParam) {
        setHasExplicitUrlTarget(true);
        setCurrentPage(pageParam as any);
      } else if (hash.startsWith('#sync_thuong=')) {
        setHasExplicitUrlTarget(true);
        setCurrentPage('health');
      }
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'maintenance_status'), (docSnap) => {
      if (docSnap.exists()) {
        const data = (docSnap.data() || {}) as Record<string, boolean>;
        setPageMaintenanceState(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    });
    return () => unsub();
  }, []);

  // Lắng nghe cấu hình ẩn trang từ Firestore (system_settings/hidden_pages)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'hidden_pages'), (docSnap) => {
      if (docSnap.exists()) {
        const data = (docSnap.data() || {}) as Record<string, boolean>;
        setPageHiddenState(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        try {
          localStorage.setItem('crm_hidden_pages', JSON.stringify(data));
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  // Hàm chuyển đổi ẩn / hiện trang dành riêng cho user 43751
  const handleToggleHidePage = async (key: string, nextVal: boolean) => {
    setPageHiddenState(prev => {
      const updated = { ...prev, [key]: nextVal };
      try {
        localStorage.setItem('crm_hidden_pages', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await setDoc(doc(db, 'system_settings', 'hidden_pages'), { [key]: nextVal }, { merge: true });
    } catch (err) {
      console.error('Lỗi khi cập nhật ẩn trang:', err);
    }
  };

  // Khi "Lịch PG" bị chọn ẩn: nếu tài khoản người dùng khác đang mở trang và KHÔNG truy cập từ link chia sẻ, tự động chuyển về BC Ngày
  const isLichPgHidden = pageHiddenState?.['lichpg'];
  useEffect(() => {
    if (!loading && currentPage === 'lichpg' && !isUser43751Local) {
      const isShareLichPg = isShareLinkForLichPg();
      if (isLichPgHidden && !isShareLichPg) {
        setCurrentPage('realtime');
        try {
          localStorage.setItem('crm_active_page', 'realtime');
        } catch {}
      }
    }
  }, [loading, currentPage, isUser43751Local, isLichPgHidden]);

  // Strict Role-Based Access Control (RBAC):
  // - SuperAdmin (43751 / ADMIN) has full access to all pages in APP_PAGES_REGISTRY + 'users'.
  // - Regular logged-in users ONLY have access to pages explicitly listed in `userProfile.userPermissions.allowedPages`.
  // - Never auto-grant ungranted pages (no fallback pages, no forced auto-injection).
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';
  const ALL_PAGES = useMemo(() => ['users', ...APP_PAGES_REGISTRY.map((p) => p.id)], []);

  // Compute allowed pages strictly from database permissions
  const canEditUser = userProfile?.userPermissions?.canEditUser ?? isSuperAdminHardcoded;
  const userAllowedPages = userProfile?.userPermissions?.allowedPages;
  const allowedPages = useMemo(() => {
    if (isSuperAdminHardcoded) return ALL_PAGES;
    if (isGuestOrDirectMode) return Array.isArray(userAllowedPages) && userAllowedPages.length > 0 ? userAllowedPages : ALL_PAGES;
    return Array.isArray(userAllowedPages) ? userAllowedPages : [];
  }, [isSuperAdminHardcoded, isGuestOrDirectMode, userAllowedPages, ALL_PAGES]);

  const is7611 = userProfile?.username === '7611' || userProfile?.ma_nhan_vien === '7611';

  const effectiveAllowedPages = useMemo(() => {
    if (is7611) return ['tnbleader'];
    let pages = canEditUser && !allowedPages.includes('users') ? [...allowedPages, 'users'] : [...allowedPages];
    // Chỉ cho phép truy cập Lịch PG ngoài danh sách phân quyền khi mở từ link chia sẻ hợp lệ (?share=true / ?view=guest)
    if (isShareLinkForLichPg() && !pages.includes('lichpg')) {
      pages = [...pages, 'lichpg'];
    }
    return pages;
  }, [canEditUser, allowedPages, is7611]);

  // Đồng bộ lưu crm_active_page chỉ khi trang hiện tại nằm trong danh sách được cấp quyền
  useEffect(() => {
    if (!loading && currentPage && effectiveAllowedPages.includes(currentPage)) {
      if (!isDirectDedicatedMode && userProfile?.role !== 'guest') {
        try {
          localStorage.setItem('crm_active_page', currentPage);
        } catch {}
      }
    }
  }, [loading, currentPage, effectiveAllowedPages, isDirectDedicatedMode, userProfile?.role]);
  // Thêm dòng này sau dòng 46
  // console.log('--- PERMISSION DEBUG ---');
  // console.log('Effective Allowed Pages:', effectiveAllowedPages);
  
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  
  // Free policy for all users: never lock due to subscription/expiration; only lock if explicitly rejected by Admin
  const isLocked = useMemo(() => {
    if (isSuperAdminHardcoded) return false;
    if (!userProfile) return false;
    if (userProfile.status === 'rejected') return true;
    return false;
  }, [userProfile, isSuperAdminHardcoded]);

  useEffect(() => {
    // Removed forced viewport width change to allow responsive design to work naturally
  }, [isDesktopView]);

  useEffect(() => {
    // Chỉ tự động chuyển về trang được cấp quyền đầu tiên khi người dùng mở trang gốc "/"
    // (không gõ trực tiếp URL của một trang không có quyền). Nếu gõ trực tiếp URL không có quyền,
    // giữ nguyên để hiển thị màn hình Chặn truy cập (403 Access Denied).
    if (userProfile && !loading && !hasExplicitUrlTarget) {
      if (!effectiveAllowedPages.includes(currentPage)) {
        if (effectiveAllowedPages.length > 0) {
          const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users') || effectiveAllowedPages[0];
          if (firstAllowedNavPage && firstAllowedNavPage !== currentPage) {
            setCurrentPage(firstAllowedNavPage as any);
          }
        }
      }
    }
  }, [userProfile, loading, currentPage, effectiveAllowedPages, hasExplicitUrlTarget]);

  // Listen for custom navigation events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent).detail;
      if (page) setCurrentPage(page as any);
    };
    window.addEventListener('navigate-page', handler);
    return () => window.removeEventListener('navigate-page', handler);
  }, []);



  useEffect(() => {
    testSupabaseConnection().then(res => {
      if (!res.online) {
        console.error('[APP] Firebase Connection Error:', res.error);
        setSupabaseError(res.error || 'Lỗi kết nối Firebase');
      } else {
        console.log('[APP] Firebase Connection OK');
        setSupabaseError(null);
      }
    });
  }, []);

  useEffect(() => {
    if (userProfile) {
      const isUser7611 = userProfile.username === '7611' || userProfile.ma_nhan_vien === '7611';
      if (isUser7611) {
        localStorage.setItem('rtst_ma_kho', 'TNB_LEADER_DATA');
      }
    }
  }, [userProfile]);



  // Removed the blocking error screen to allow fallback login
  // if (supabaseError && !userProfile) { ... }

  if (!userProfile && !isGuestOrDirectMode) {
    return (
      <>
        <Login />
      </>
    );
  }

  if (!isGuestOrDirectMode && !declarationDismissed && (isDeclarationRequired || showDeclarationForce)) {
    return (
      <StoreDeclaration 
        onComplete={handleDeclarationComplete} 
      />
    );
  }

  if (!isGuestOrDirectMode && isLocked) {
    return (
      <SubscriptionLockScreen 
        userProfile={userProfile} 
        onLogout={logout} 
        onRefresh={refreshProfile} 
      />
    );
  }

  const isSuperAdmin = canEditUser;

  const BASE_NAV_ITEMS = [
    { id: 'realtime', label: 'BC NGÀY', icon: Activity, color: 'indigo' },
    { id: 'luyke', label: 'BC THÁNG', icon: BarChart3, color: 'blue' },
    { id: 'khaibao', label: 'Cập nhật', icon: Database, color: 'indigo' },
    { id: 'health', label: 'Sức khỏe NV', icon: HeartPulse, color: 'rose' },
    { id: 'toolhotro', label: 'Tool Hỗ Trợ', icon: Wrench, color: 'amber' },
    { id: 'bbkq', label: 'BBKQ (Kiểm Quỹ)', icon: Banknote, color: 'teal' },
    { id: 'tienich', label: 'Tiện Ích', icon: LayoutGrid, color: 'purple' },
    { id: 'tnb_data', label: 'TNB DATA', icon: Database, color: 'emerald' },
    { id: 'tnbleader', label: 'TNB LEADER', icon: Trophy, color: 'amber' },
    { id: 'birthday', label: 'Sinh nhật NV', icon: Gift, color: 'pink' },
    { id: 'feedback', label: 'HƯỚNG DẪN & GÓP Ý', icon: MessageSquare, color: 'indigo' },
    { id: 'excelviewer', label: 'XEM FILE EXCEL', icon: FileSpreadsheet, color: 'emerald' },
    { id: 'lichpg', label: 'Lịch PG', icon: CalendarDays, color: 'teal' }
  ];
  
  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => {
    if (!effectiveAllowedPages.includes(item.id)) return false;
    if (!isUser43751Local && pageHiddenState[item.id]) return false;
    return true;
  });

  const renderMainContent = () => {
    const isLichPgSharedAccess = currentPage === 'lichpg' && isShareLinkForLichPg();
    const isPermissionBlocked = !effectiveAllowedPages.includes(currentPage) && !isLichPgSharedAccess;
    const isHiddenBlocked = !isPermissionBlocked && !isUser43751Local && pageHiddenState[currentPage] && !isLichPgSharedAccess;
    const isMaintenanceBlockedByApp = !isPermissionBlocked && !['realtime', 'toolhotro', 'tienich', 'luyke', 'health'].includes(currentPage) && pageMaintenanceState[currentPage] && !isUser43751Local;
    const isPageBlocked = isPermissionBlocked || isHiddenBlocked || isMaintenanceBlockedByApp;
    const hasVisited = (pageId: string) => currentPage === pageId || visitedPages.has(pageId);
    const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users') || effectiveAllowedPages[0];
    const blockedPageMeta = APP_PAGES_REGISTRY.find(p => p.id === currentPage);
    const blockedPageLabel = currentPage === 'users'
      ? 'Quản lý Người dùng & Phân quyền'
      : (blockedPageMeta?.label || currentPage.toUpperCase());
    const firstAllowedLabel = APP_PAGES_REGISTRY.find(p => p.id === firstAllowedNavPage)?.navLabel || 'Trang được cấp quyền';

    return (
      <RTSTSharedDataProvider>
        <LuykeDataProvider>
          <div className="w-full min-w-0 flex-1">
            <Suspense fallback={<LoadingSpinner />}>
              {isPermissionBlocked && (
                <div className="flex items-center justify-center h-full p-4 sm:p-6 mt-8 sm:mt-12">
                  <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg text-center border border-rose-200 shadow-xl w-full">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-inner">
                      <ShieldAlert size={44} />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-wider mb-3">
                      TRUY CẬP BỊ CHẶN
                    </h1>
                    {effectiveAllowedPages.length > 0 ? (
                      <p className="text-slate-600 font-medium text-sm sm:text-base leading-relaxed mb-8">
                        Tài khoản <span className="font-black text-slate-800">{userProfile?.username}</span> không có quyền truy cập trang{' '}
                        <span className="font-black text-rose-600">"{blockedPageLabel}"</span>. Vui lòng liên hệ Quản trị viên để được cấp quyền trong danh sách phân quyền.
                      </p>
                    ) : (
                      <p className="text-slate-600 font-medium text-sm sm:text-base leading-relaxed mb-8">
                        Tài khoản <span className="font-black text-slate-800">{userProfile?.username}</span> hiện chưa được cấp quyền truy cập bất kỳ trang nào trên hệ thống. Vui lòng liên hệ Quản trị viên để được phân quyền.
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      {firstAllowedNavPage ? (
                        <button
                          onClick={() => handleSetCurrentPage(firstAllowedNavPage as any)}
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                        >
                          <RefreshCw size={17} />
                          VỀ TRANG {firstAllowedLabel}
                        </button>
                      ) : (
                        <button
                          onClick={() => refreshProfile()}
                          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                        >
                          <RefreshCw size={17} />
                          KIỂM TRA LẠI QUYỀN
                        </button>
                      )}
                      <button
                        onClick={() => logout()}
                        className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                      >
                        <LogOut size={17} />
                        ĐĂNG XUẤT
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isHiddenBlocked && (
                <div className="flex items-center justify-center h-full p-6 mt-12">
                  <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-purple-200 shadow-xl w-full">
                    <div className="w-24 h-24 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600 shadow-inner">
                      <AlertCircle size={48} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">TRANG HIỆN KHÔNG KHẢ DỤNG</h1>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                      Trang này hiện đang được tạm ẩn khỏi hệ thống. Vui lòng quay lại sau!
                    </p>
                    <button 
                      onClick={() => handleSetCurrentPage('realtime')}
                      className="px-8 py-3 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center mx-auto gap-2 cursor-pointer"
                    >
                      <RefreshCw size={18} />
                      QUAY LẠI BC NGÀY
                    </button>
                  </div>
                </div>
              )}

              {!isHiddenBlocked && isMaintenanceBlockedByApp && (
                currentPage === 'tnbleader' ? (
                  <div className="flex items-center justify-center h-full p-6 mt-12">
                    <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-indigo-200 shadow-xl w-full">
                      <div className="w-24 h-24 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-500 shadow-inner">
                        <ExternalLink size={48} />
                      </div>
                      <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">ĐÃ CHUYỂN SANG TRANG MỚI</h1>
                      <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Trang TNB Leader đã được chuyển sang hệ thống mới. Vui lòng nhấn nút bên dưới để truy cập.
                      </p>
                      <a
                        href="https://ltsdata1605-glitch.github.io/thiduavung/#/sieuthi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all items-center justify-center gap-2"
                      >
                        <ExternalLink size={18} />
                        MỞ TRANG MỚI
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-6 mt-12">
                    <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
                      <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                        <AlertCircle size={48} />
                      </div>
                      <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">HỆ THỐNG ĐANG BẢO TRÌ</h1>
                      <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Trang này đang trong quá trình bảo trì và nâng cấp. Vui lòng quay lại sau ít phút. Xin lỗi vì sự bất tiện này!
                      </p>
                      <button 
                        onClick={() => handleSetCurrentPage('realtime')}
                        className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center mx-auto gap-2"
                      >
                        <RefreshCw size={18} />
                        QUAY LẠI BC NGÀY
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Keep-alive stateful core tabs (realtime & khaibao) so unsaved KhaiBao inputs are 100% preserved */}
              {hasVisited('realtime') && effectiveAllowedPages.includes('realtime') && (
                <div className={!isPageBlocked && currentPage === 'realtime' ? 'block w-full min-w-0' : 'hidden'}>
                  <NewRealtimePage pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} pageHiddenState={pageHiddenState} />
                </div>
              )}
              {hasVisited('khaibao') && effectiveAllowedPages.includes('khaibao') && (
                <div className={!isPageBlocked && currentPage === 'khaibao' ? 'block w-full min-w-0' : 'hidden'}>
                  <KhaiBao />
                </div>
              )}

              {!isPageBlocked && (() => {
                if (currentPage === 'luyke' && effectiveAllowedPages.includes('luyke')) {
                  return <LuyKe pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} pageHiddenState={pageHiddenState} />;
                }
                if (currentPage === 'health' && effectiveAllowedPages.includes('health')) {
                  return <EmployeeHealth pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} pageHiddenState={pageHiddenState} />;
                }
                if (currentPage === 'tnb_data' && effectiveAllowedPages.includes('tnb_data')) return <TnbData />;
                if (currentPage === 'tnbleader' && effectiveAllowedPages.includes('tnbleader')) return <TnbLeader pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
                if (currentPage === 'toolhotro' && effectiveAllowedPages.includes('toolhotro')) return <ToolHoTro pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
                if (currentPage === 'bbkq' && effectiveAllowedPages.includes('bbkq')) return <BbkqPage pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
                if (currentPage === 'tienich' && effectiveAllowedPages.includes('tienich')) return <TienIch pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} pageHiddenState={pageHiddenState} />;
                if (currentPage === 'users' && effectiveAllowedPages.includes('users')) {
                  return (
                    <UserManagement onBack={() => {
                      const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users');
                      handleSetCurrentPage((firstAllowedNavPage || 'realtime') as any);
                    }} />
                  );
                }
                if (currentPage === 'birthday' && effectiveAllowedPages.includes('birthday')) return <SinhNhatNv />;
                if (currentPage === 'feedback' && effectiveAllowedPages.includes('feedback')) return <FeedbackPage />;
                if (currentPage === 'excelviewer' && effectiveAllowedPages.includes('excelviewer')) return <ExcelViewer />;
                if (currentPage === 'lichpg' && effectiveAllowedPages.includes('lichpg')) return <LichLamViecPG />;
                return null;
              })()}
            </Suspense>
          </div>
        </LuykeDataProvider>
      </RTSTSharedDataProvider>
    );
  };

  return (
    <>
      <VersionUpdateNotifier />

      {/* Firebase Error Banner */}
      <AnimatePresence>
        {supabaseError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 z-[100] relative shadow-lg"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{supabaseError}</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              title="Thử lại"
            >
              <RefreshCw size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* V2 GRADIENT ENTERPRISE LAYOUT - Permanent Global Layout */}
      <GradientV2Layout
        userProfile={userProfile}
        marketFilter={marketFilter}
        setMarketFilter={setMarketFilter}
        availableMarkets={availableMarkets}
        currentPage={currentPage}
        setCurrentPage={handleSetCurrentPage as any}
        canEditUser={canEditUser}
        navItems={isGuestOrDirectMode ? [] : NAV_ITEMS}
        pageMaintenanceState={pageMaintenanceState}
        effectivePageKey={effectivePageKey}
        setShowMaintenanceConfirm={setShowMaintenanceConfirm}
        setShowSettings={setShowSettings}
        setShowDeclarationForce={setShowDeclarationForce}
        logout={logout}
        supabaseError={supabaseError}
        isDirectRealtimeMode={isGuestOrDirectMode}
        pageHiddenState={pageHiddenState}
        onToggleHide={handleToggleHidePage}
      >
        {renderMainContent()}
      </GradientV2Layout>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Settings size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Cài đặt hiển thị</h2>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <LogOut size={16} className="rotate-180" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kích thước chữ</label>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button 
                      onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-600 shadow-sm hover:text-indigo-600 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <input 
                      type="range" 
                      min="12" 
                      max="24" 
                      value={fontSize} 
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <button 
                      onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-600 shadow-sm hover:text-indigo-600 transition-colors"
                    >
                      <PlusIcon size={18} />
                    </button>
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kiểu chữ toàn web</label>
                    {!(String(userProfile?.username || '').trim() === '43751' || String(userProfile?.ma_nhan_vien || '').trim() === '43751' || String(userProfile?.user_id || '').trim() === '43751') && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 flex items-center gap-1">
                        🔒 Đã khóa (Theo 43751)
                      </span>
                    )}
                  </div>
                  
                  {!(String(userProfile?.username || '').trim() === '43751' || String(userProfile?.ma_nhan_vien || '').trim() === '43751' || String(userProfile?.user_id || '').trim() === '43751') && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600">
                      ⚡ Toàn bộ hệ thống đang đồng bộ Kiểu chữ theo cài đặt của <strong className="font-black text-slate-800">Quản trị viên 43751</strong>.
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {(['Inter', 'Oswald', 'UTM Avo'] as const).map((font) => {
                      const is43751 = String(userProfile?.username || '').trim() === '43751' || String(userProfile?.ma_nhan_vien || '').trim() === '43751' || String(userProfile?.user_id || '').trim() === '43751';
                      const labelMap: Record<string, string> = { 'Inter': 'Mặc định', 'Oswald': 'Hiện đại', 'UTM Avo': 'Tròn trịa' };
                      const fontClassMap: Record<string, string> = { 'Inter': '', 'Oswald': 'font-oswald', 'UTM Avo': 'font-utm-avo' };
                      const active = fontFamily === font;

                      return (
                        <button
                          key={font}
                          disabled={!is43751}
                          onClick={() => {
                            if (is43751) {
                              setFontFamily(font, userProfile);
                            }
                          }}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${fontClassMap[font]} ${
                            active ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white'
                          } ${!is43751 ? 'opacity-65 cursor-not-allowed' : 'hover:border-slate-200 cursor-pointer active:scale-95'}`}
                        >
                          <div className={`text-base font-bold mb-1 ${active ? 'text-indigo-600' : 'text-slate-800'}`}>{font}</div>
                          <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{labelMap[font]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Hoàn tất
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaintenanceConfirm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner ${pageMaintenanceState[effectivePageKey] ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                <AlertCircle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider mb-2">XÁC NHẬN</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                Bạn có chắc chắn muốn <strong className={pageMaintenanceState[effectivePageKey] ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>{pageMaintenanceState[effectivePageKey] ? 'TẮT' : 'BẬT'}</strong> chế độ BẢO TRÌ cho trang này?
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMaintenanceConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={async () => {
                    setShowMaintenanceConfirm(false);
                    const newVal = !pageMaintenanceState[effectivePageKey];
                    await setDoc(doc(db, 'system_settings', 'maintenance_status'), { [effectivePageKey]: newVal }, { merge: true });
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors shadow-lg ${pageMaintenanceState[effectivePageKey] ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                >
                  Đồng ý
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const isScannerMode = typeof window !== 'undefined' && window.location.search.includes('scanner=true');
  if (isScannerMode) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <StickerCeScanner />
      </Suspense>
    );
  }
  return <MainApp />;
}
