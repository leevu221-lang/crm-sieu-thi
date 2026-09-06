import React, { useState, Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { Database, BarChart3, Activity, HeartPulse, LogOut, User, Store, Loader2, Users, Shield, Settings, Type, Minus, Plus as PlusIcon, Monitor, Smartphone, LayoutGrid, AlertCircle, Wrench, ShieldAlert, RefreshCw, Zap, ShoppingBag, Globe, Trophy, Gift, X, MessageSquare, CreditCard, FileSpreadsheet, CalendarDays, ExternalLink, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { useStore } from './contexts/StoreContext';
import { LuykeDataProvider } from './contexts/LuykeDataContext';
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

// Core Primary Pages statically imported for instantaneous 0ms tab switching
import NewRealtimePage from './pages/RealtimePage';
import EmployeeHealth from './pages/SucKhoeNhanVien';
import LuyKe from './pages/LuyKe';
import KhaiBao from './pages/KhaiBao';
import LichLamViecPG from './pages/LichLamViecPG';
import ToolHoTro from './pages/ToolHoTro';
import BbkqPage from './pages/BbkqPage';
import TienIch from './pages/TienIch';

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
const UserManagement = lazyWithRetry(() => import('./pages/DanhSachNguoiDung'));
const StickerCeScanner = lazyWithRetry(() => import('./components/StickerCeScanner'));
const TnbData = lazyWithRetry(() => import('./pages/TnbData'));
const TnbLeader = lazyWithRetry(() => import('./pages/TnbLeader'));
const SinhNhatNv = lazyWithRetry(() => import('./pages/SinhNhatNv'));
const FeedbackPage = lazyWithRetry(() => import('./pages/FeedbackPage'));
const ExcelViewer = lazyWithRetry(() => import('./pages/ExcelViewer').then(module => ({ default: module.ExcelViewer })));
const BanGiaSocPage = lazyWithRetry(() => import('./pages/BanGiaSocPage').then(module => ({ default: module.BanGiaSocPage })));

const LoadingSpinner = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
    <div className="relative">
      <div className="w-10 h-10 border-3 border-indigo-100 rounded-full"></div>
      <div className="w-10 h-10 border-3 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
    </div>
    <p className="mt-3 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Đang tải...</p>
  </div>
);

import { PAGE_URL_MAP, URL_PAGE_MAP, isGuestShareLink } from './constants/routes';

export default function App() {
  const isScannerMode = window.location.search.includes('scanner=true');

  // Nhận diện CHẾ ĐỘ KHÁCH: Chỉ kích hoạt khi mở từ link chia sẻ (?view=guest hoặc ?share=true)
  const isDirectDedicatedMode = useMemo(() => {
    return isGuestShareLink(window.location.search);
  }, []);

  if (isScannerMode) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <StickerCeScanner />
      </Suspense>
    );
  }

  const [currentPage, setCurrentPage] = useState<'realtime' | 'users' | 'health' | 'khaibao' | 'luyke' | 'toolhotro' | 'bbkq' | 'tienich' | 'tnb_data' | 'birthday' | 'feedback' | 'excelviewer' | 'lichpg' | 'bangiasoc' | 'tnbleader'>(() => {
    try {
      // 1. Ưu tiên đọc từ URL pathname (/lich-pg, /realtime, /ban-gia-soc, /suc-khoe...)
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (path && URL_PAGE_MAP[path]) {
        return URL_PAGE_MAP[path] as any;
      }
      // 2. Đọc từ query param ?page= hoặc hash
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const hash = window.location.hash;
      if (pageParam) return pageParam as any;
      if (hash.startsWith('#sync_thuong=')) return 'health';
    } catch {}

    try {
      const saved = localStorage.getItem('crm_active_page');
      if (saved) return saved as any;
    } catch {}

    return 'realtime';
  });
  const { userProfile, logout, refreshProfile, updateStoreName } = useAuth();
  const [showDeclarationForce, setShowDeclarationForce] = useState(false);
  const isDeclarationRequired = useMemo(() => {
    if (!userProfile) return false;
    if (String(userProfile.username).trim() === '43751' || String(userProfile.username).trim() === '1841') return false;
    
    // Explicitly check for false, meaning the user registered but hasn't completed declaration yet.
    return userProfile.declarationCompleted === false;
  }, [userProfile]);
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useSettings();
  const { marketFilter, setMarketFilter, availableMarkets, activeRealtimeTab, activeToolHoTroTab, activeTienIchTab, activeLuyKeTab, activeHealthTab } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(true);
  const [showSubscriptionForce, setShowSubscriptionForce] = useState(false);
  
  // Page Maintenance Mode State
  const [pageMaintenanceState, setPageMaintenanceState] = useState<Record<string, boolean>>({});
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  const effectivePageKey = currentPage === 'realtime' ? `realtime_${activeRealtimeTab}` : 
                           currentPage === 'toolhotro' ? `toolhotro_${activeToolHoTroTab}` : 
                           currentPage === 'tienich' ? `tienich_${activeTienIchTab}` : 
                           currentPage === 'luyke' ? `luyke_${activeLuyKeTab}` :
                           currentPage === 'health' ? `health_${activeHealthTab}` :
                           currentPage;

  // Đồng bộ URL trình duyệt (https://crm-sieu-thi.pages.dev/tentrang?kho=1841&tab=...) và lưu localStorage
  useEffect(() => {
    if (currentPage) {
      try {
        if (!isDirectDedicatedMode && userProfile?.role !== 'guest') {
          localStorage.setItem('crm_active_page', currentPage);
        }
        const basePath = PAGE_URL_MAP[currentPage] || `/${currentPage}`;
        const params = new URLSearchParams(window.location.search);
        const kho = params.get('kho') || params.get('makho') || params.get('store') || userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '1841';
        const isShare = isDirectDedicatedMode || isGuestShareLink(window.location.search);
        
        const currentTab = currentPage === 'realtime' ? activeRealtimeTab :
                           currentPage === 'luyke' ? activeLuyKeTab :
                           currentPage === 'health' ? activeHealthTab :
                           currentPage === 'toolhotro' ? activeToolHoTroTab :
                           currentPage === 'tienich' ? activeTienIchTab : (params.get('tab') || '');
        const tabParam = currentTab ? `&tab=${currentTab}` : '';
        const targetPath = `${basePath}?kho=${kho}${tabParam}${isShare ? '&view=guest' : ''}`;
        const currentFull = window.location.pathname + window.location.search;
        if (currentFull !== targetPath) {
          window.history.replaceState({ page: currentPage, tab: currentTab }, '', targetPath);
        }
      } catch {}
    }
  }, [
    currentPage, 
    isDirectDedicatedMode, 
    userProfile?.ma_kho, 
    userProfile?.role,
    activeRealtimeTab,
    activeLuyKeTab,
    activeHealthTab,
    activeToolHoTroTab,
    activeTienIchTab
  ]);

  // Lắng nghe nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
        if (path && URL_PAGE_MAP[path]) {
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
      setCurrentPage(URL_PAGE_MAP[path] as any);
    } else {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const hash = window.location.hash;
      if (pageParam) {
        setCurrentPage(pageParam as any);
      } else if (hash.startsWith('#sync_thuong=')) {
        setCurrentPage('health');
      }
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'maintenance_status'), (docSnap) => {
      if (docSnap.exists()) {
        setPageMaintenanceState(docSnap.data() || {});
      }
    });
    return () => unsub();
  }, []);

  // Hard Rule implementation for fallback if userProfile has missing userPermissions (legacy session)
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';
  const ALL_PAGES = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'bbkq', 'tienich', 'users', 'tnb_data', 'tnbleader', 'birthday', 'feedback', 'excelviewer', 'bangiasoc'];
  
  // Compute allowed pages
  const canEditUser = userProfile?.userPermissions?.canEditUser ?? isSuperAdminHardcoded;
  let allowedPages = isSuperAdminHardcoded ? ALL_PAGES : userProfile?.userPermissions?.allowedPages;
  
  if (!allowedPages) {
    allowedPages = isSuperAdminHardcoded ? ALL_PAGES : ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'bbkq', 'tienich', 'birthday']; // fallback for legacy normal users to not break the app completely without relogin
  }
  
  const is7611 = userProfile?.username === '7611' || userProfile?.ma_nhan_vien === '7611';
  if (is7611) {
    allowedPages = ['tnbleader'];
  }
  
  const effectiveAllowedPages = useMemo(() => {
    let pages = canEditUser && !allowedPages.includes('users') ? [...allowedPages, 'users'] : allowedPages;
    if (userProfile?.username === '43751' && !pages.includes('bangiasoc')) {
      pages = [...pages, 'bangiasoc'];
    }
    // Lịch PG: mở cho tất cả user (PG001 vẫn xem được nhưng không có quyền chỉnh sửa — xem LichLamViecPG.tsx)
    if (!pages.includes('lichpg')) {
      pages = [...pages, 'lichpg'];
    }
    // BBKQ (Kiểm Quỹ): mở cho tất cả user
    if (!pages.includes('bbkq')) {
      pages = [...pages, 'bbkq'];
    }
    return pages;
  }, [canEditUser, allowedPages, userProfile?.username]);
  // Thêm dòng này sau dòng 46
  // console.log('--- PERMISSION DEBUG ---');
  // console.log('Effective Allowed Pages:', effectiveAllowedPages);
  
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  
  // Subscription Gatekeeper: Lock if expiredAt <= now, unlock if expiredAt > now
  const isLocked = useMemo(() => {
    if (isSuperAdminHardcoded) return false;
    if (!userProfile) return false;
    if (userProfile.status === 'pending' || userProfile.status === 'rejected') return true; // Lock if pending or rejected admin approval
    if (userProfile.isDemo) return false;

    // Simple rule: expiredAt date >= today → unlocked, expiredAt date < today → locked
    if (!userProfile.expiredAt) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expDate = new Date(userProfile.expiredAt); expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  }, [userProfile, isSuperAdminHardcoded]);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Removed forced viewport width change to allow responsive design to work naturally
  }, [isDesktopView]);

  useEffect(() => {
    // Redirect if we are on a page that is not allowed
    if (userProfile) {
      if (currentPage !== 'users' && !effectiveAllowedPages.includes(currentPage)) {
        if (effectiveAllowedPages.length > 0) {
          const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users');
          if (firstAllowedNavPage) {
            setCurrentPage(firstAllowedNavPage as any);
          }
        }
      }
    }
  }, [userProfile, currentPage, effectiveAllowedPages]);

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

  // Bỏ qua màn hình đăng nhập, khai báo và khóa gói cước khi truy cập chế độ xem trực tiếp không cần đăng nhập
  const isGuestOrDirectMode = userProfile?.role === 'guest' || userProfile?.isGuest === true || isDirectDedicatedMode || (typeof window !== 'undefined' && isGuestShareLink());

  if (!userProfile && !isGuestOrDirectMode) {
    return (
      <>
        <Login />
      </>
    );
  }

  if (!isGuestOrDirectMode && (isDeclarationRequired || showDeclarationForce)) {
    return (
      <StoreDeclaration 
        onComplete={() => setShowDeclarationForce(false)} 
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

  const isUser43751Local = String(userProfile?.username || '').trim() === '43751';

  const isSuperAdmin = canEditUser;

  const BASE_NAV_ITEMS = [
    { id: 'realtime', label: 'BC NGÀY', icon: Activity, color: 'indigo' },
    { id: 'luyke', label: 'BC THÁNG', icon: BarChart3, color: 'blue' },
    { id: 'khaibao', label: 'Cập nhật', icon: Database, color: 'indigo' },
    { id: 'health', label: 'Sức khỏe NV', icon: HeartPulse, color: 'rose' },
    { id: 'toolhotro', label: 'Tool Hỗ Trợ', icon: Wrench, color: 'amber' },
    { id: 'bbkq', label: 'BBKQ (Kiểm Quỹ)', icon: Banknote, color: 'teal' },
    { id: 'tienich', label: 'Tiện Ích', icon: LayoutGrid, color: 'purple' },
    { id: 'tnbleader', label: 'TNB LEADER', icon: Trophy, color: 'amber' },
    { id: 'birthday', label: 'Sinh nhật NV', icon: Gift, color: 'pink' },
    { id: 'feedback', label: 'HƯỚNG DẪN & GÓP Ý', icon: MessageSquare, color: 'indigo' },
    { id: 'excelviewer', label: 'XEM FILE EXCEL', icon: FileSpreadsheet, color: 'emerald' },
    { id: 'bangiasoc', label: 'GIÁ SỐC', icon: ShoppingBag, color: 'rose' },
    { id: 'lichpg', label: 'Lịch PG', icon: CalendarDays, color: 'teal' }
  ];
  
  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => effectiveAllowedPages.includes(item.id));

  const renderMainContent = () => (
    <LuykeDataProvider>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          <Suspense fallback={<LoadingSpinner />}>
            {(() => {
              const isMaintenanceBlockedByApp = !['realtime', 'toolhotro', 'tienich', 'luyke', 'health'].includes(currentPage) && pageMaintenanceState[currentPage] && !isUser43751Local;
              
              if (isMaintenanceBlockedByApp) {
                // TNB Leader: redirect to new external link instead of maintenance notice
                if (currentPage === 'tnbleader') {
                  return (
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
                  );
                }
                return (
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
                        onClick={() => setCurrentPage('realtime')}
                        className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center mx-auto gap-2"
                      >
                        <RefreshCw size={18} />
                        QUAY LẠI BC NGÀY
                      </button>
                    </div>
                  </div>
                );
              }

              if (currentPage === 'realtime' && effectiveAllowedPages.includes('realtime')) return <NewRealtimePage pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'khaibao' && effectiveAllowedPages.includes('khaibao')) return <KhaiBao />;
              if (currentPage === 'luyke' && effectiveAllowedPages.includes('luyke')) return <LuyKe pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'tnb_data' && effectiveAllowedPages.includes('tnb_data')) return <TnbData />;
              if (currentPage === 'tnbleader' && effectiveAllowedPages.includes('tnbleader')) return <TnbLeader pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'toolhotro' && effectiveAllowedPages.includes('toolhotro')) return <ToolHoTro pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'bbkq' && effectiveAllowedPages.includes('bbkq')) return <BbkqPage pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'tienich' && effectiveAllowedPages.includes('tienich')) return <TienIch pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'users' && effectiveAllowedPages.includes('users')) {
                return (
                  <UserManagement onBack={() => {
                    const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users');
                    setCurrentPage((firstAllowedNavPage || 'realtime') as any);
                  }} />
                );
              }
              if (currentPage === 'health' && effectiveAllowedPages.includes('health')) return <EmployeeHealth pageMaintenanceState={pageMaintenanceState} isUser43751Local={isUser43751Local} />;
              if (currentPage === 'birthday' && effectiveAllowedPages.includes('birthday')) return <SinhNhatNv />;
              if (currentPage === 'feedback') return <FeedbackPage />;
              if (currentPage === 'excelviewer' && effectiveAllowedPages.includes('excelviewer')) return <ExcelViewer />;
              if (currentPage === 'bangiasoc' && effectiveAllowedPages.includes('bangiasoc')) return <BanGiaSocPage />;
              if (currentPage === 'lichpg' && effectiveAllowedPages.includes('lichpg')) return <LichLamViecPG />;
              return null;
            })()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </LuykeDataProvider>
  );

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
        setCurrentPage={setCurrentPage as any}
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
        {showSubscriptionForce && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <SubscriptionLockScreen 
              userProfile={userProfile} 
              onRefresh={refreshProfile} 
              onClose={() => setShowSubscriptionForce(false)} 
            />
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
