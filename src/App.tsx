import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Database, BarChart3, Activity, HeartPulse, LogOut, User, Store, Loader2, Users, Shield, Settings, Type, Minus, Plus as PlusIcon, Monitor, Smartphone, LayoutGrid, AlertCircle, Wrench, ShieldAlert, RefreshCw, Zap, ShoppingBag, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { useMarket } from './contexts/MarketContext';
import Login from './pages/Login';

// Lazy load pages for better performance
const NewRealtimePage = lazy(() => import('./pages/NewRealtimePage'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const EmployeeHealth = lazy(() => import('./pages/EmployeeHealth'));
const KhaiBao = lazy(() => import('./pages/KhaiBao'));
const LuyKe = lazy(() => import('./pages/LuyKe'));
const ToolHoTro = lazy(() => import('./pages/ToolHoTro'));
const TnbDm7611 = lazy(() => import('./pages/TnbDm7611'));

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
  const [currentPage, setCurrentPage] = useState<'realtime' | 'users' | 'health' | 'khaibao' | 'luyke' | 'toolhotro' | 'tnb_dm_7611'>('realtime');
  const { userProfile, logout } = useAuth();
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useSettings();
  const { marketFilter, setMarketFilter, availableMarkets } = useMarket();
  const [showSettings, setShowSettings] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(true);

  // Hard Rule implementation for fallback if userProfile has missing userPermissions (legacy session)
  const isSuperAdminHardcoded = userProfile?.username === '43751' || userProfile?.username === 'ADMIN';
  const ALL_PAGES = ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'users', 'tnb_dm_7611'];
  
  // Compute allowed pages
  const canEditUser = userProfile?.userPermissions?.canEditUser ?? isSuperAdminHardcoded;
  let allowedPages = isSuperAdminHardcoded ? ALL_PAGES : userProfile?.userPermissions?.allowedPages;
  
  if (!allowedPages) {
    allowedPages = isSuperAdminHardcoded ? ALL_PAGES : ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro']; // fallback for legacy normal users to not break the app completely without relogin
  }
  
  const effectiveAllowedPages = canEditUser && !allowedPages.includes('users') ? [...allowedPages, 'users'] : allowedPages;
  // Thêm dòng này sau dòng 46
console.log('--- PERMISSION DEBUG ---');
console.log('User:', userProfile?.username);
console.log('Effective Allowed Pages:', effectiveAllowedPages);
  
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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

  useEffect(() => {
    import('./supabaseClient').then(({ testSupabaseConnection }) => {
      testSupabaseConnection().then(res => {
        if (!res.online) {
          console.error('[APP] Supabase Connection Error:', res.error);
          setSupabaseError(res.error || 'Lỗi kết nối Supabase');
        } else {
          console.log('[APP] Supabase Connection OK');
          setSupabaseError(null);
        }
      });
    });
  }, []);

  // Removed the blocking error screen to allow fallback login
  // if (supabaseError && !userProfile) { ... }

  if (!userProfile) {
    return (
      <>
        <Login />
      </>
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
    { id: 'khaibao', label: 'Khai báo', icon: Database, color: 'indigo' },
    { id: 'health', label: 'Sức khỏe', icon: HeartPulse, color: 'rose' },
    { id: 'toolhotro', label: 'Tool Hỗ Trợ', icon: Wrench, color: 'amber' },
    { id: 'tnb_dm_7611', label: 'TNB_DM_7611', icon: Globe, color: 'indigo' },
  ];
  
  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => effectiveAllowedPages.includes(item.id));

  return (
    <div className={`min-h-screen flex flex-col pb-24 md:pb-0 bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900`}>
      {/* Supabase Error Banner */}
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
        animate={{ y: showHeader ? 0 : -120 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="sticky top-0 z-50 bg-white print:hidden"
      >
        {/* Title Card: QUẢN LÝ PHÂN CA - Hidden as per user request */}
        {/* 
        <div className="bg-indigo-600 py-2.5 px-4 flex items-center justify-center shadow-lg relative z-50">
          <div className="absolute left-4">
            <LayoutGrid size={16} className="text-indigo-200" />
          </div>
          <h1 className="text-white text-[11px] font-black uppercase tracking-[0.4em] drop-shadow-sm">
            Quản lý phân ca
          </h1>
          <div className="absolute right-4 flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
        */}

        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo and Brand removed */}
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
                      
                      {availableMarkets.map(m => {
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
                      })}
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
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors ${isActive ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Marquee Banner - Professional Ticker Style */}
        <div className="bg-white border-b border-slate-100 h-9 flex items-center overflow-hidden relative">
          <div className="pl-4 pr-3 border-r border-slate-100 h-full flex items-center bg-white z-20 shadow-[10px_0_15px_-5px_rgba(255,255,255,1)]">
            <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-[4px] tracking-wider uppercase">Beta</span>
          </div>
          <motion.div 
            animate={{ x: ['100%', '-100%'] }}
            transition={{ 
              repeat: Infinity, 
              duration: 30, 
              ease: "linear" 
            }}
            className="whitespace-nowrap text-[11px] font-bold text-amber-500 uppercase tracking-[0.2em] pl-4"
          >
            App đang trong quá trình xây dựng chưa hoàn chỉnh, mong anh chị góp ý ạ !
          </motion.div>
          {/* Gradient fade on the right */}
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        </div>
      </motion.div>

      <main className="flex-1 relative">
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
              <>
                {currentPage === 'realtime' && effectiveAllowedPages.includes('realtime') && <NewRealtimePage />}
                {currentPage === 'khaibao' && effectiveAllowedPages.includes('khaibao') && <KhaiBao />}
                {currentPage === 'luyke' && effectiveAllowedPages.includes('luyke') && <LuyKe />}
                {currentPage === 'toolhotro' && effectiveAllowedPages.includes('toolhotro') && <ToolHoTro />}
                {currentPage === 'tnb_dm_7611' && effectiveAllowedPages.includes('tnb_dm_7611') && <TnbDm7611 />}
                {currentPage === 'users' && effectiveAllowedPages.includes('users') && <UserManagement onBack={() => {
                  const firstAllowedNavPage = effectiveAllowedPages.find(p => p !== 'users');
                  setCurrentPage((firstAllowedNavPage || 'realtime') as any);
                }} />}
                {currentPage === 'health' && effectiveAllowedPages.includes('health') && <EmployeeHealth />}
              </>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

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
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFontFamily('Inter')}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${fontFamily === 'Inter' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <div className={`text-lg font-bold mb-1 ${fontFamily === 'Inter' ? 'text-indigo-600' : 'text-slate-800'}`}>Inter</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Mặc định</div>
                    </button>
                    <button 
                      onClick={() => setFontFamily('Oswald')}
                      className={`p-4 rounded-2xl border-2 transition-all text-left font-oswald ${fontFamily === 'Oswald' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <div className={`text-lg font-bold mb-1 ${fontFamily === 'Oswald' ? 'text-indigo-600' : 'text-slate-800'}`}>Oswald</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Hiện đại</div>
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
      </AnimatePresence>
    </div>
  );
}
