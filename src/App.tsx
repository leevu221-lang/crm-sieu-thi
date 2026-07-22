import React, { useState, Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { Database, BarChart3, Activity, HeartPulse, LogOut, User, Store, Loader2, Users, Shield, Settings, Type, Minus, Plus as PlusIcon, Monitor, Smartphone, LayoutGrid, AlertCircle, Wrench, ShieldAlert, RefreshCw, Zap, ShoppingBag, Globe, Trophy, Gift, X, MessageSquare, CreditCard } from 'lucide-react';
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

// Lazy load pages for better performance
const NewRealtimePage = lazy(() => import('./pages/RealtimePage'));
const UserManagement = lazy(() => import('./pages/DanhSachNguoiDung'));
const EmployeeHealth = lazy(() => import('./pages/SucKhoeNhanVien'));
const KhaiBao = lazy(() => import('./pages/KhaiBao'));
const LuyKe = lazy(() => import('./pages/LuyKe'));
const ToolHoTro = lazy(() => import('./pages/ToolHoTro'));
const StickerCeScanner = lazy(() => import('./components/StickerCeScanner'));
const TnbData = lazy(() => import('./pages/TnbData'));
const SinhNhatNv = lazy(() => import('./pages/SinhNhatNv'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));

const LoadingSpinner = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
      <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
    </div>
    <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
  </div>
);

export default function App() {
  const isScannerMode = window.location.search.includes('scanner=true');

  if (isScannerMode) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <StickerCeScanner />
      </Suspense>
    );
  }

  const [currentPage, setCurrentPage] = useState<'realtime' | 'users' | 'health' | 'khaibao' | 'luyke' | 'toolhotro' | 'tnb_data' | 'birthday' | 'feedback'>('realtime');
  const { userProfile, logout, refreshProfile } = useAuth();
  const [declarationCompleted, setDeclarationCompleted] = useState(() => {
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    // If justLoggedIn is null or not 'true', it means they refreshed (F5) the page.
    // So we do not show the Store Declaration page again.
    return justLoggedIn !== 'true';
  });
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useSettings();
  const { marketFilter, setMarketFilter, availableMarkets } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(true);
  const [showSubscriptionForce, setShowSubscriptionForce] = useState(false);



  // Hard Rule implementation for fallback if userProfile has missing userPermissions (legacy session)
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';
  const ALL_PAGES = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_data', 'birthday', 'feedback'];
  
  // Compute allowed pages
  const canEditUser = userProfile?.userPermissions?.canEditUser ?? isSuperAdminHardcoded;
  let allowedPages = isSuperAdminHardcoded ? ALL_PAGES : userProfile?.userPermissions?.allowedPages;
  
  if (!allowedPages) {
    allowedPages = isSuperAdminHardcoded ? ALL_PAGES : ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'tnb_data', 'birthday', 'feedback']; // fallback for legacy normal users to not break the app completely without relogin
  }
  
  const effectiveAllowedPages = useMemo(() => {
    return canEditUser && !allowedPages.includes('users') ? [...allowedPages, 'users'] : allowedPages;
  }, [canEditUser, allowedPages]);
  // Thêm dòng này sau dòng 46
  // console.log('--- PERMISSION DEBUG ---');
  // console.log('Effective Allowed Pages:', effectiveAllowedPages);
  
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  
  // Subscription Gatekeeper check: Enforced only starting from 1/8/2026
  const isLocked = useMemo(() => {
    if (isSuperAdminHardcoded) return false;
    if (!userProfile) return false;
    if (userProfile.isDemo) return false;
    
    const lockEffectiveDate = new Date('2026-08-01T00:00:00+07:00');
    const isEnforced = new Date() >= lockEffectiveDate;
    if (!isEnforced) return false;

    const isUserActive = userProfile.status === 'active';
    const isConfirmed = userProfile.paymentConfirmed === true;
    const isExpired = userProfile.expiredAt ? new Date() > new Date(userProfile.expiredAt) : true;
    
    return !isUserActive || !isConfirmed || isExpired;
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
      if (currentPage !== 'users' && currentPage !== 'feedback' && !effectiveAllowedPages.includes(currentPage)) {
        if (effectiveAllowedPages.length > 0) {
          const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users');
          if (firstAllowedNavPage) {
            setCurrentPage(firstAllowedNavPage as any);
          }
        }
      }
    }
  }, [userProfile, currentPage, effectiveAllowedPages]);

  // User Access & Activity Tracking
  useEffect(() => {
    if (!userProfile?.username || userProfile.username === 'ADMIN') return;

    // Track initial page view / navigation
    trackUserPing(userProfile.username, userProfile.ma_kho, currentPage, 'NAVIGATE');

    // Heartbeat ping every 60 seconds
    const interval = setInterval(() => {
      trackUserPing(userProfile.username, userProfile.ma_kho, currentPage, 'PING');
    }, 60000);

    return () => clearInterval(interval);
  }, [userProfile?.username, userProfile?.ma_kho, currentPage]);

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
    if (!userProfile) {
      setDeclarationCompleted(false);
    }
  }, [userProfile]);



  // Removed the blocking error screen to allow fallback login
  // if (supabaseError && !userProfile) { ... }

  if (!userProfile) {
    return (
      <>
        <Login />
      </>
    );
  }



  if (isLocked) {
    return (
      <SubscriptionLockScreen 
        userProfile={userProfile} 
        onLogout={logout} 
        onRefresh={refreshProfile} 
      />
    );
  }

  if (!declarationCompleted) {
    return (
      <StoreDeclaration onComplete={() => {
        sessionStorage.setItem('justLoggedIn', 'false');
        setDeclarationCompleted(true);
      }} />
    );
  }

  const isSuperAdmin = canEditUser;

  const getMarketTheme = (name: string) => {
    const n = name.toUpperCase();
    if (n === 'ALL') return { icon: LayoutGrid, color: 'text-indigo-600', bg: 'bg-indigo-600', shadow: 'shadow-indigo-100', border: 'border-indigo-500' };
    if (n.startsWith('ĐML')) return { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-600', shadow: 'shadow-blue-100', border: 'border-blue-500' };
    if (n.startsWith('ĐMM')) return { icon: Smartphone, color: 'text-cyan-600', bg: 'bg-cyan-600', shadow: 'shadow-cyan-100', border: 'border-cyan-500' };
    if (n.startsWith('ĐMS')) return { icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-600', shadow: 'shadow-emerald-100', border: 'border-emerald-500' }; // Changed from purple to emerald
    if (n.startsWith('TGD')) return { icon: Globe, color: 'text-amber-500', bg: 'bg-amber-500', shadow: 'shadow-amber-100', border: 'border-amber-400' };
    if (n.startsWith('AAR')) return { icon: Monitor, color: 'text-rose-600', bg: 'bg-rose-600', shadow: 'shadow-rose-100', border: 'border-rose-500' }; // Changed from slate to rose
    return { icon: Store, color: 'text-slate-500', bg: 'bg-slate-600', shadow: 'shadow-slate-100', border: 'border-slate-500' };
  };

  const BASE_NAV_ITEMS = [
    { id: 'realtime', label: 'BC NGÀY', icon: Activity, color: 'indigo' },
    { id: 'luyke', label: 'BC THÁNG', icon: BarChart3, color: 'blue' },
    { id: 'khaibao', label: 'Cập nhật', icon: Database, color: 'indigo' },
    { id: 'health', label: 'Sức khỏe NV', icon: HeartPulse, color: 'rose' },
    { id: 'toolhotro', label: 'Tool Hỗ Trợ', icon: Wrench, color: 'amber' },
    { id: 'birthday', label: 'Sinh nhật NV', icon: Gift, color: 'pink' },
    { id: 'feedback', label: 'Góp ý', icon: MessageSquare, color: 'indigo' },
    // { id: 'tnb_data', label: 'TNB DATA', icon: Trophy, color: 'indigo' },
  ];
  
  const NAV_ITEMS = [
    ...BASE_NAV_ITEMS.filter(item => item.id !== 'feedback' && effectiveAllowedPages.includes(item.id)),
    { id: 'feedback', label: 'Góp ý', icon: MessageSquare, color: 'indigo' },
  ];



  return (
    <div className={`min-h-screen flex flex-col pb-24 md:pb-0 bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900`}>
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

      {/* Sticky Top Section */}
      <motion.div 
        initial={false}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="sticky top-0 z-50 bg-white print:hidden"
      >


        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {availableMarkets.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="no-capture flex items-center gap-2 mr-2 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 shadow-inner max-w-[180px] xs:max-w-[260px] sm:max-w-none overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const allTheme = getMarketTheme('ALL');
                        const AllIcon = allTheme.icon;
                        return (
                          <button
                            onClick={() => setMarketFilter('ALL')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-500 uppercase tracking-wider whitespace-nowrap active:scale-95 ${
                              marketFilter === 'ALL'
                                ? `bg-indigo-600 text-white shadow-lg shadow-indigo-200`
                                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <AllIcon size={14} className={marketFilter === 'ALL' ? 'text-white' : 'text-slate-400'} />
                            TẤT CẢ
                          </button>
                        );
                      })()}
                      
                      {(() => {
                        const prefixOrder = ['ĐML', 'ĐMM', 'TGD', 'ĐMS', 'ĐM3'];
                        const getPrefixRank = (name: string) => {
                          const upper = name.toUpperCase();
                          // Check ĐMS3 before ĐMS to avoid false match
                          for (let i = 0; i < prefixOrder.length; i++) {
                            if (upper.startsWith(prefixOrder[i])) return i;
                          }
                          return prefixOrder.length;
                        };
                         return availableMarkets
                           .filter(m => {
                             const normName = (m.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
                             return !normName.includes('kho ban hang luu dong');
                           })
                          .sort((a, b) => getPrefixRank(a.name) - getPrefixRank(b.name))
                          .map(m => {
                        const theme = getMarketTheme(m.name);
                        const Icon = theme.icon;
                        const isActive = marketFilter === m.name;
                        
                        return (
                          <button
                            key={m.name}
                            onClick={() => setMarketFilter(m.name)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-500 uppercase tracking-wider whitespace-nowrap active:scale-95 ${
                              isActive
                                ? `${theme.bg} text-white shadow-lg ${theme.shadow}`
                                : `bg-white text-slate-500 hover:bg-slate-50 border border-slate-200`
                            }`}
                          >
                            <Icon size={14} className={isActive ? 'text-white' : theme.color} />
                            {m.name}
                          </button>
                        );
                      });
                      })()}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User size={12} className="text-indigo-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 truncate max-w-[70px] sm:max-w-[100px]">
                    {userProfile?.username || 'User'}
                  </span>
                  {userProfile?.ma_kho && (
                    <span className="text-[9px] font-black text-emerald-600 uppercase leading-none">
                      Kho: {userProfile.ma_kho}
                    </span>
                  )}
                </div>
              </div>

              {/* View Toggle Button Removed */}
              {canEditUser && (
                <button 
                  onClick={() => setCurrentPage('users')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPage === 'users' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="Quản lý người dùng"
                >
                  <Users size={20} />
                </button>
              )}

              {userProfile && userProfile.username !== '43751' && userProfile.username !== 'ADMIN' && !userProfile.isDemo && (
                <button 
                  onClick={() => setShowSubscriptionForce(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all relative"
                  title="Đăng ký gói cước / Gia hạn"
                >
                  <CreditCard size={20} />
                  {userProfile.expiredAt && (() => {
                    const exp = new Date(userProfile.expiredAt);
                    const today = new Date();
                    const diff = exp.getTime() - today.getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if (days <= 3) {
                      return <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />;
                    }
                    return null;
                  })()}
                </button>
              )}

              <button 
                onClick={() => setDeclarationCompleted(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title="Khai báo siêu thị"
              >
                <Store size={20} />
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title="Cài đặt hiển thị"
              >
                <Settings size={20} />
              </button>

              <button 
                onClick={() => logout()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Đăng xuất"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon;
                return (
                  <button 
                    key={item.id}
                    onClick={() => setCurrentPage(item.id as any)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black uppercase tracking-wider transition-colors ${isActive ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>


      </motion.div>

      <main className="flex-1 relative">


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
                if (currentPage === 'realtime' && effectiveAllowedPages.includes('realtime')) return <NewRealtimePage />;
                if (currentPage === 'khaibao' && effectiveAllowedPages.includes('khaibao')) return <KhaiBao />;
                if (currentPage === 'luyke' && effectiveAllowedPages.includes('luyke')) return <LuyKe />;
                if (currentPage === 'tnb_data' && effectiveAllowedPages.includes('tnb_data')) return <TnbData />;
                if (currentPage === 'toolhotro' && effectiveAllowedPages.includes('toolhotro')) return <ToolHoTro />;
                if (currentPage === 'users' && effectiveAllowedPages.includes('users')) {
                  return (
                    <UserManagement onBack={() => {
                      const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users');
                      setCurrentPage((firstAllowedNavPage || 'realtime') as any);
                    }} />
                  );
                }
                if (currentPage === 'health' && effectiveAllowedPages.includes('health')) return <EmployeeHealth />;
                if (currentPage === 'birthday' && effectiveAllowedPages.includes('birthday')) return <SinhNhatNv />;
                if (currentPage === 'feedback') return <FeedbackPage />;
                return null;
              })()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
        </LuykeDataProvider>
      </main>

      {/* Global Copyright Footer */}
      <footer className="w-full border-t border-slate-200 bg-white mt-12 px-6 py-6 pb-32 md:pb-6 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>© {new Date().getFullYear()} CRM SIÊU THỊ</span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">v2.4.0</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Phát triển & Thiết kế bởi <span className="font-extrabold text-slate-600 tracking-wider">Linh Vũ</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 z-[100] px-2 py-2 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-slate-900/5 print:hidden">
        <div className="flex items-center justify-around relative">
          {/* Active indicator background pill */}
          <div className="absolute inset-0 flex items-center justify-around pointer-events-none px-2">
            {NAV_ITEMS.map((item, index) => (
              <div key={`bg-${item.id}`} className="flex-1 flex justify-center">
                {currentPage === item.id && (
                  <motion.div
                    layoutId="nav-pill"
                    className="w-14 h-14 bg-indigo-600/10 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
            ))}
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            
            return (
              <button 
                key={item.id}
                onClick={() => setCurrentPage(item.id as any)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-16 relative z-10 transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className={`relative flex items-center justify-center ${isActive ? 'scale-110' : ''}`}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="transition-all duration-300" />
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-indigo-600 rounded-full"
                    />
                  )}
                </motion.div>
                <span className={`text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

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
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kiểu chữ</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setFontFamily('Inter')}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${fontFamily === 'Inter' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <div className={`text-base font-bold mb-1 ${fontFamily === 'Inter' ? 'text-indigo-600' : 'text-slate-800'}`}>Inter</div>
                      <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Mặc định</div>
                    </button>
                    <button 
                      onClick={() => setFontFamily('Oswald')}
                      className={`p-3 rounded-xl border-2 transition-all text-left font-oswald ${fontFamily === 'Oswald' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <div className={`text-base font-bold mb-1 ${fontFamily === 'Oswald' ? 'text-indigo-600' : 'text-slate-800'}`}>Oswald</div>
                      <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Hiện đại</div>
                    </button>
                    <button 
                      onClick={() => setFontFamily('UTM Avo')}
                      className={`p-3 rounded-xl border-2 transition-all text-left font-utm-avo ${fontFamily === 'UTM Avo' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <div className={`text-base font-bold mb-1 ${fontFamily === 'UTM Avo' ? 'text-indigo-600' : 'text-slate-800'}`}>UTM Avo</div>
                      <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Tròn trịa</div>
                    </button>
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
    </div>
  );
}
