import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientV2Header } from './components/GradientV2Header';
import { GradientV2Sidebar } from './components/GradientV2Sidebar';
import { X, LogOut } from 'lucide-react';

/* Simple hook to track if we're at md+ breakpoint */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isDesktop;
}

const SIDEBAR_STORAGE_KEY = 'crm-sidebar-expanded';

interface GradientV2LayoutProps {
  children: ReactNode;
  userProfile: any;
  marketFilter: string;
  setMarketFilter: (market: string) => void;
  availableMarkets: any[];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  canEditUser: boolean;
  navItems: any[];
  pageMaintenanceState: Record<string, boolean>;
  effectivePageKey: string;
  setShowMaintenanceConfirm: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowDeclarationForce: (show: boolean) => void;
  logout: () => void;
  supabaseError?: string | null;
}

export const GradientV2Layout: React.FC<GradientV2LayoutProps> = ({
  children,
  userProfile,
  marketFilter,
  setMarketFilter,
  availableMarkets,
  currentPage,
  setCurrentPage,
  canEditUser,
  navItems,
  pageMaintenanceState,
  effectivePageKey,
  setShowMaintenanceConfirm,
  setShowSettings,
  setShowDeclarationForce,
  logout,
  supabaseError
}) => {
  /* ── Sidebar state ── */
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored !== null ? stored === 'true' : true; // default expanded
    } catch { return true; }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(prev => !prev);
  }, []);

  /* Keyboard shortcut: [ to toggle sidebar */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  const isDesktop = useIsDesktop();
  const sidebarWidth = sidebarExpanded ? 345 : 76;

  /* ── Swipe-to-open from left edge (mobile) ── */
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = Math.abs(endY - startY);
      // Swipe right from left edge (within 30px) → open
      if (startX < 30 && dx > 60 && dy < 80 && !mobileDrawerOpen) {
        setMobileDrawerOpen(true);
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [mobileDrawerOpen]);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-stretch bg-[#F8FAFC] font-sans relative overflow-x-hidden text-[#0F172A] selection:bg-[#7C3AED] selection:text-white">

      {/* ── Desktop Sidebar ── */}
      <GradientV2Sidebar
        navItems={navItems}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        expanded={sidebarExpanded}
        onToggle={toggleSidebar}
        userProfile={userProfile}
        canEditUser={canEditUser}
        pageMaintenanceState={pageMaintenanceState}
        effectivePageKey={effectivePageKey}
        setShowMaintenanceConfirm={setShowMaintenanceConfirm}
        setShowSettings={setShowSettings}
        setShowDeclarationForce={setShowDeclarationForce}
        logout={logout}
      />

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70]"
            />
            {/* Drawer with drag-to-close */}
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              drag="x"
              dragConstraints={{ left: -300, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => {
                // If dragged left more than 80px or velocity > 300 → close
                if (info.offset.x < -80 || info.velocity.x < -300) {
                  setMobileDrawerOpen(false);
                }
              }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[300px] z-[80] flex flex-col print:hidden touch-pan-y"
              style={{ borderRadius: '0 18px 18px 0', overflow: 'hidden' }}
            >
              {/* Background */}
              <div className="absolute inset-0" style={{ backgroundColor: '#FAFBFF', borderRadius: '0 18px 18px 0', boxShadow: '4px 0 24px rgba(0,0,0,0.06)' }} />
              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E8ECF4' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" fillOpacity="0.95" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-[17px] font-extrabold uppercase tracking-[-0.01em]" style={{ color: '#172033' }}>CRM Siêu Thị</div>
                      <div className="flex items-center gap-[6px] mt-[3px]">
                        <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#10B981' }} />
                        <span className="text-[12px] font-medium" style={{ color: '#A3B1C6' }}>Online</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all cursor-pointer"
                    style={{ color: '#A3B1C6' }}
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* Drag handle indicator */}
                <div className="flex justify-center py-1.5 md:hidden">
                  <div className="w-8 h-1 rounded-full" style={{ backgroundColor: '#E8ECF4' }} />
                </div>
                {/* Reuse sidebar nav inline for mobile */}
                <MobileSidebarContent
                  navItems={navItems}
                  currentPage={currentPage}
                  setCurrentPage={(page) => { setCurrentPage(page); setMobileDrawerOpen(false); }}
                  userProfile={userProfile}
                  canEditUser={canEditUser}
                  pageMaintenanceState={pageMaintenanceState}
                  effectivePageKey={effectivePageKey}
                  setShowMaintenanceConfirm={setShowMaintenanceConfirm}
                  setShowSettings={setShowSettings}
                  setShowDeclarationForce={setShowDeclarationForce}
                  logout={logout}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-50 print:hidden" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          <GradientV2Header
            userProfile={userProfile}
            marketFilter={marketFilter}
            setMarketFilter={setMarketFilter}
            availableMarkets={availableMarkets}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            canEditUser={canEditUser}
            pageMaintenanceState={pageMaintenanceState}
            effectivePageKey={effectivePageKey}
            setShowMaintenanceConfirm={setShowMaintenanceConfirm}
            setShowSettings={setShowSettings}
            setShowDeclarationForce={setShowDeclarationForce}
            logout={logout}
            onToggleSidebar={toggleMobileDrawer}
            sidebarExpanded={sidebarExpanded}
          />
        </div>

        {/* Page Content */}
        <main className="flex-1 relative z-10 w-full py-1.5 sm:py-2 pb-20 md:pb-6 px-1 sm:px-1.5 md:px-2">
          <div className="w-full min-w-0">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/90 backdrop-blur-md px-2 sm:px-3 md:px-[15px] py-4 sm:py-5 pb-24 md:pb-5 print:hidden">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="bg-gradient-to-r from-[#6366F1] to-[#7C3AED] bg-clip-text text-transparent font-black">CRM SIÊU THỊ</span>
              <span className="text-slate-300">•</span>
              <span className="bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">
                V2 Enterprise
              </span>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Độc quyền Quản trị viên <span className="font-black text-[#6366F1]">{userProfile?.username || '43751'}</span> — Thiết kế bởi <span className="font-black text-[#0F172A]">Linh Vũ</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Mobile Bottom Floating Navigation ── */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 bg-white/95 backdrop-blur-2xl border border-slate-200/90 z-[100] px-2 py-2 rounded-3xl shadow-2xl ring-1 ring-slate-900/5 print:hidden">
        <div className="flex items-center justify-around relative overflow-x-auto no-scrollbar py-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#6366F1]'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md shadow-indigo-500/30'
                    : ''
                }`}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-black mt-1 uppercase tracking-tight ${
                  isActive ? 'text-[#6366F1]' : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

/* ── Mobile Sidebar Content (premium theme) ── */
const MOBILE_SECTION_MAP = [
  { title: 'MENU QUẢN LÝ', ids: ['realtime', 'luyke', 'khaibao', 'health', 'tnbleader'] },
  { title: 'DỮ LIỆU & TIỆN ÍCH', ids: ['toolhotro', 'tienich', 'birthday', 'excelviewer', 'feedback', 'bangiasoc', 'lichpg'] },
];

const MOBILE_ITEM_META: Record<string, { subtitle: string; badge?: string; badgeType?: 'hot' | 'moi' }> = {
  realtime:    { subtitle: 'Báo cáo doanh thu ngày',       badge: 'HOT',  badgeType: 'hot' },
  luyke:       { subtitle: 'Luỹ kế & tổng hợp tháng',     badge: 'MỚI',  badgeType: 'moi' },
  khaibao:     { subtitle: 'Dán Realtime & Luỹ kế',        badge: 'MỚI',  badgeType: 'moi' },
  health:      { subtitle: 'Theo dõi sức khoẻ nhân viên' },
  toolhotro:   { subtitle: 'Công cụ in ấn & kiểm quỹ' },
  tienich:     { subtitle: 'Phân ca, biên bản & kiểm kê' },
  tnbleader:   { subtitle: 'Thi đua & Bảng xếp hạng',     badge: 'HOT',  badgeType: 'hot' },
  birthday:    { subtitle: 'Danh sách sinh nhật NV' },
  feedback:    { subtitle: 'Góp ý & Hướng dẫn sử dụng' },
  excelviewer: { subtitle: 'Xem & tải file Excel' },
  bangiasoc:   { subtitle: 'Giá sốc siêu thị' },
  lichpg:      { subtitle: 'Lịch trình PG hàng ngày' },
};

const MobileSidebarContent: React.FC<{
  navItems: any[];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  userProfile: any;
  canEditUser: boolean;
  pageMaintenanceState: Record<string, boolean>;
  effectivePageKey: string;
  setShowMaintenanceConfirm: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowDeclarationForce: (show: boolean) => void;
  logout: () => void;
}> = ({ navItems, currentPage, setCurrentPage, userProfile, canEditUser, logout }) => {
  const sections = MOBILE_SECTION_MAP.map(sec => ({
    title: sec.title,
    items: sec.ids.map(id => navItems.find(n => n.id === id)).filter(Boolean) as any[],
  })).filter(sec => sec.items.length > 0);

  return (
    <>
      <div className="flex-1 overflow-y-auto py-2 px-2.5 space-y-3 pb-24 sidebar-custom-scroll">
        {sections.map(section => (
          <div key={section.title}>
            <div
              className="px-3 pb-[4px] text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: '#A3B1C6' }}
            >
              {section.title}
            </div>
            <div className="space-y-[2px]">
              {section.items.map((item: any) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon;
                const meta = MOBILE_ITEM_META[item.id] || { subtitle: '' };
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] transition-all cursor-pointer"
                    style={{
                      backgroundColor: isActive ? '#ECFDF5' : 'transparent',
                      borderLeft: isActive ? '3.5px solid #10B981' : '3px solid transparent',
                      boxShadow: isActive ? '0 1px 6px rgba(16,185,129,0.14)' : 'none',
                    }}
                  >
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{ color: isActive ? '#059669' : '#8190AA' }}
                    >
                      <Icon size={21} strokeWidth={isActive ? 2.3 : 1.7} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div
                        className="text-[15px] font-extrabold leading-tight truncate"
                        style={{ color: isActive ? '#065F46' : '#172033' }}
                      >
                        {item.label}
                      </div>
                      <div
                        className="text-[12px] font-medium leading-tight mt-[1px] truncate"
                        style={{ color: isActive ? '#059669' : '#8190AA' }}
                      >
                        {meta.subtitle}
                      </div>
                    </div>
                    {meta.badge && meta.badgeType && (
                      <span
                        className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.06em] px-[7px] py-[2px] rounded-[5px] leading-[15px]"
                        style={{
                          backgroundColor: meta.badgeType === 'hot' ? '#FFF1F2' : '#EEF1FF',
                          color: meta.badgeType === 'hot' ? '#E11D48' : '#4F46E5',
                        }}
                      >
                        {meta.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User footer removed as it is now in the header */}
    </>
  );
};
