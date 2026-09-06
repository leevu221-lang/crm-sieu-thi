import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  Zap,
  Smartphone,
  ShoppingBag,
  Globe,
  Monitor,
  Store,
  ChevronDown,
  Menu,
  KeyRound,
  LogOut,
  Shield,
  Settings,
  Share2,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildGuestShareUrl } from '../../../constants/routes';

interface GradientV2HeaderProps {
  userProfile: any;
  marketFilter: string;
  setMarketFilter: (market: string) => void;
  availableMarkets: any[];
  currentPage: string;
  setCurrentPage: (page: any) => void;
  canEditUser: boolean;
  pageMaintenanceState: Record<string, boolean>;
  effectivePageKey: string;
  setShowMaintenanceConfirm: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowDeclarationForce: (show: boolean) => void;
  logout: () => void;
  /* New: sidebar toggle */
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
}

export const GradientV2Header: React.FC<GradientV2HeaderProps> = ({
  userProfile,
  marketFilter,
  setMarketFilter,
  availableMarkets,
  currentPage,
  setCurrentPage,
  canEditUser,
  pageMaintenanceState,
  effectivePageKey,
  setShowMaintenanceConfirm,
  setShowSettings,
  setShowDeclarationForce,
  logout,
  onToggleSidebar,
  sidebarExpanded,
}) => {
  const [liveClockStr, setLiveClockStr] = useState<string>('');
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const handleShareLink = () => {
    const currentKho = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '';
    if (!currentKho) return;
    const shareUrl = buildGuestShareUrl(currentPage, currentKho);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      setLiveClockStr(`${timeStr} - ${dateStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  /* Close dropdowns when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getMarketIcon = (name: string) => {
    const n = name.toUpperCase();
    if (n === 'ALL') return LayoutGrid;
    if (n.startsWith('ĐML')) return Zap;
    if (n.startsWith('ĐMM')) return Smartphone;
    if (n.startsWith('ĐMS')) return ShoppingBag;
    if (n.startsWith('TGD')) return Globe;
    if (n.startsWith('AAR')) return Monitor;
    return Store;
  };

  const prefixOrder = ['ĐML', 'ĐMM', 'TGD', 'ĐMS', 'ĐM3'];
  const getPrefixRank = (name: string) => {
    const upper = name.toUpperCase();
    for (let i = 0; i < prefixOrder.length; i++) {
      if (upper.startsWith(prefixOrder[i])) return i;
    }
    return prefixOrder.length;
  };

  const filteredMarkets = availableMarkets
    .filter(m => {
      const normName = (m.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
      return !normName.includes('kho ban hang luu dong');
    })
    .sort((a, b) => getPrefixRank(a.name) - getPrefixRank(b.name));

  const currentMarketLabel = marketFilter === 'ALL' ? 'TẤT CẢ' : marketFilter;
  const CurrentMarketIcon = getMarketIcon(marketFilter);

  return (
    <header className="relative bg-white/95 backdrop-blur-xl border-b border-slate-200/80 z-40 transition-all w-full">
      <div className="w-full px-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 h-[52px]">

          {/* ─── Left: Sidebar Toggle (mobile) + Store Name ─── */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile hamburger → toggle sidebar drawer */}
            <button
              onClick={onToggleSidebar}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              title="Menu"
            >
              <Menu size={18} />
            </button>

            {/* Prominent Store Name */}
            {availableMarkets.length > 0 && (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 border border-emerald-400/80 rounded-xl text-[14px] font-black text-white transition-all cursor-pointer whitespace-nowrap shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <Store size={18} className="text-emerald-100 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-[400px] uppercase tracking-[0.03em]">{currentMarketLabel}</span>
                  <ChevronDown size={16} className={`text-emerald-200 transition-transform duration-200 ${storeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {storeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-1.5 left-0 w-max min-w-[220px] max-w-[360px] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 py-1.5 z-[100] max-h-[320px] overflow-y-auto"
                    >
                      {/* All Markets */}
                      <button
                        onClick={() => { setMarketFilter('ALL'); setStoreDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer
                          ${marketFilter === 'ALL'
                            ? 'bg-emerald-50 text-emerald-700 font-extrabold'
                            : 'text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <LayoutGrid size={14} className={marketFilter === 'ALL' ? 'text-emerald-600' : 'text-slate-400'} />
                        <span>TẤT CẢ</span>
                        {marketFilter === 'ALL' && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>

                      <div className="h-px bg-slate-100 my-1" />

                      {/* Individual Markets */}
                      {filteredMarkets.map(m => {
                        const Icon = getMarketIcon(m.name);
                        const isActive = marketFilter === m.name;
                        return (
                          <button
                            key={m.name}
                            onClick={() => { setMarketFilter(m.name); setStoreDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer
                              ${isActive
                                ? 'bg-emerald-50 text-emerald-700 font-extrabold'
                                : 'text-slate-600 hover:bg-slate-50'
                              }
                            `}
                          >
                            <Icon size={14} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                            <span className="truncate">{m.name}</span>
                            {isActive && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ─── Right: Share Button + Clock + User Profile ─── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Share Guest Link Button */}
            <button
              onClick={handleShareLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer border ${
                copiedLink 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200 font-extrabold' 
                  : 'bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 border-emerald-200'
              }`}
              title={`Chia sẻ link trực tiếp trang này cho Khách xem dữ liệu Kho ${userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || ''}`}
            >
              {copiedLink ? (
                <>
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-black">Đã chép link Kho {userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || ''}!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} className="text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline text-[11px] font-black tracking-wide">CHIA SẺ LINK</span>
                </>
              )}
            </button>

            {/* Live Clock */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-[11px] font-bold tracking-tight whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{liveClockStr}</span>
            </div>

            {/* User Profile Dropdown */}
            <div ref={userDropdownRef} className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all cursor-pointer"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                    {String(userProfile?.username || '43').slice(0, 4).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-[1.5px] border-white" />
                </div>
                {/* Name + Role */}
                <div className="hidden sm:block text-left min-w-0">
                  <div className="text-[12px] font-black text-slate-800 leading-tight truncate max-w-[100px]">
                    {userProfile?.username || '43751'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 leading-tight">
                    {canEditUser ? 'admin' : (userProfile?.role || 'member')}
                  </div>
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 right-0 w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 py-1.5 z-[100]"
                  >
                    {/* User info header */}
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center font-black text-[11px] shadow-md shadow-indigo-200/40">
                            {String(userProfile?.username || '43').slice(0, 4).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-black text-slate-800 truncate leading-tight">
                            {userProfile?.username || '43751'}
                          </div>
                          <div className="text-[10.5px] font-semibold text-slate-400 leading-tight mt-0.5">
                            TK: {userProfile?.username || '43751'} ({canEditUser ? 'admin' : (userProfile?.role || 'member')})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <button
                      onClick={() => { setShowDeclarationForce(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-pointer"
                    >
                      <Store size={16} className="text-emerald-600 shrink-0" />
                      <span>Cấu hình tên siêu thị</span>
                    </button>

                    <button
                      onClick={() => { setShowSettings(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer"
                    >
                      <Settings size={16} className="text-slate-400 shrink-0" />
                      <span>Cài đặt hiển thị</span>
                    </button>

                    {canEditUser && (
                      <button
                        onClick={() => { setCurrentPage('users'); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer"
                      >
                        <KeyRound size={16} className="text-slate-400 shrink-0" />
                        <span>Quản lý tài khoản</span>
                      </button>
                    )}
                    {canEditUser && (
                      <button
                        onClick={() => { setShowMaintenanceConfirm(true); setUserDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-bold transition-all cursor-pointer ${
                          pageMaintenanceState[effectivePageKey]
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <Shield size={16} className={pageMaintenanceState[effectivePageKey] ? 'text-red-500 shrink-0' : 'text-slate-400 shrink-0'} />
                        <span>{pageMaintenanceState[effectivePageKey] ? 'Tắt bảo trì' : 'Bật bảo trì'}</span>
                        {pageMaintenanceState[effectivePageKey] && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </button>
                    )}

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <LogOut size={16} className="text-rose-500 shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
