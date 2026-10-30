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
  Crown,
  EyeOff,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildGuestShareUrl } from '../../../constants/routes';
import { useStore } from '../../../contexts/StoreContext';
import { isValidStoreName } from '../../../pages/RTST/utils';
import { HiddenPagesModal } from './HiddenPagesModal';

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
  /* Hidden from user feature strictly for user 43751 */
  pageHiddenState?: Record<string, boolean>;
  onToggleHide?: (key: string, nextVal: boolean) => Promise<void>;
  /* Mobile Device Simulator toggle */
  onToggleMobileSimulator?: () => void;
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
  pageHiddenState = {},
  onToggleHide,
  onToggleMobileSimulator,
}) => {
  const isInsideIframe = typeof window !== 'undefined' && (
    window.self !== window.top ||
    window.location.search.includes('is_mobile_sim=1')
  );
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showHiddenPagesModal, setShowHiddenPagesModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const isUser43751 = String(userProfile?.username || '').trim() === '43751' ||
                      String(userProfile?.ma_nhan_vien || '').trim() === '43751' ||
                      String(userProfile?.user_id || '').trim() === '43751' ||
                      String(userProfile?.username || '').toLowerCase().includes('43751') ||
                      (typeof window !== 'undefined' && (localStorage.getItem('rtst_ma_kho') === '43751' || localStorage.getItem('selected_store')?.includes('155A NGUYỄN TẤT THÀNH')));

  const { currentStoreId, activeRealtimeTab, activeLuyKeTab, activeHealthTab, activeToolHoTroTab, activeTienIchTab } = useStore();

  const handleShareLink = () => {
    const currentKho = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || (currentPage === 'toolhotro' ? '1841' : '');
    if (!currentKho && currentPage !== 'toolhotro') return;
    // Xác định tab hiện tại theo trang đang mở
    const currentTab = currentPage === 'realtime' ? activeRealtimeTab :
                       currentPage === 'luyke' ? activeLuyKeTab :
                       currentPage === 'health' ? activeHealthTab :
                       currentPage === 'toolhotro' ? activeToolHoTroTab :
                       currentPage === 'tienich' ? activeTienIchTab : '';
    // Xác định xem siêu thị hiện tại có phải là siêu thị duy nhất hoặc siêu thị đầu tiên của kho không
    const isDefaultStore = !availableMarkets || availableMarkets.length <= 1 || 
                           (availableMarkets.length > 0 && availableMarkets[0]?.name === currentStoreId);
    // Tạo URL chia sẻ rút gọn tối đa (bỏ tab mặc định, bỏ tên siêu thị nếu là mặc định)
    const shareUrl = buildGuestShareUrl(currentPage, currentKho, currentTab, currentStoreId, isDefaultStore);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {});
    }
  };



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
      if (!m.name || !isValidStoreName(m.name)) return false;
      const normName = (m.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
      return !normName.includes('kho ban hang luu dong');
    })
    .sort((a, b) => getPrefixRank(a.name) - getPrefixRank(b.name));

  const currentMarketLabel =
    marketFilter === 'ALL'
      ? (filteredMarkets.length === 1 ? filteredMarkets[0].name : 'TẤT CẢ SIÊU THỊ')
      : marketFilter;

  return (
    <header
      className="relative bg-white/98 backdrop-blur-xl border-b border-[#E2E8F0] shadow-[0_2px_14px_-2px_rgba(11,31,58,0.05)] z-40 transition-all w-full"
      style={{ fontFamily: "'UTM Avo', sans-serif" }}
    >
      <div className="w-full px-[10px] sm:px-[16px] md:px-[22px]">
        <div className="flex items-center justify-between gap-[8px] sm:gap-[12px] h-[54px] sm:h-[64px] md:h-[68px]">

          {/* ─── Left: Sidebar Toggle (mobile) + Store Selector ─── */}
          <div className="flex items-center gap-[8px] sm:gap-[12px] min-w-0 flex-1">
            {/* Mobile hamburger → toggle sidebar drawer */}
            <button
              onClick={onToggleSidebar}
              className="md:hidden w-[34px] h-[34px] shrink-0 rounded-[10px] border border-slate-200/80 bg-slate-50/80 flex items-center justify-center text-[#0B1F3A] hover:bg-slate-100 transition-all cursor-pointer"
              title="Menu"
            >
              <Menu size={18} />
            </button>

            {/* Enterprise Store Selector */}
            {availableMarkets.length > 0 && (
              <div ref={dropdownRef} className="relative min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                  className="group flex items-center gap-[8px] sm:gap-[12px] p-[4px] pr-[10px] sm:p-[6px] sm:pr-[14px] bg-[#F5F9FF] hover:bg-[#ECF4FF] border border-[#DCE8F8] hover:border-[#BFD6F6] rounded-[12px] sm:rounded-[14px] transition-all cursor-pointer shadow-[0_2px_8px_rgba(13,110,253,0.05)] active:scale-[0.99] max-w-full"
                >
                  {/* Blue Rounded Square Store Icon */}
                  <div
                    className="w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-[9px] sm:rounded-[11px] flex items-center justify-center text-white shrink-0 shadow-[0_3px_10px_rgba(13,110,253,0.28)]"
                    style={{ background: 'linear-gradient(135deg, #1D7AFC 0%, #0D6EFD 100%)' }}
                  >
                    <Store size={18} strokeWidth={2.2} className="text-white shrink-0" />
                  </div>

                  {/* Two-line Label + Store Name */}
                  <div className="flex flex-col items-start justify-center min-w-0 text-left">
                    <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-[#64748B] uppercase tracking-[0.05em] leading-tight whitespace-nowrap">
                      SIÊU THỊ ĐANG XEM
                    </span>
                    <span
                      className="text-[11.5px] sm:text-[13.5px] md:text-[14px] font-black text-[#0B1F3A] uppercase tracking-tight leading-tight truncate max-w-[135px] xs:max-w-[170px] sm:max-w-[260px] md:max-w-[340px] lg:max-w-[430px] mt-[1px]"
                      title={currentMarketLabel}
                    >
                      {currentMarketLabel}
                    </span>
                  </div>

                  {/* Dropdown Arrow */}
                  <ChevronDown
                    size={16}
                    strokeWidth={2.4}
                    className={`text-[#334155] shrink-0 ml-[4px] sm:ml-[10px] transition-transform duration-200 ${
                      storeDropdownOpen ? 'rotate-180 text-[#0D6EFD]' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {storeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-[6px] left-0 w-max min-w-[250px] max-w-[calc(100vw-24px)] sm:max-w-[440px] bg-white border border-slate-200/90 rounded-[14px] shadow-[0_12px_32px_-4px_rgba(11,31,58,0.14)] py-[6px] z-[120] max-h-[340px] overflow-y-auto"
                    >
                      {/* All Markets */}
                      <button
                        type="button"
                        onClick={() => { setMarketFilter('ALL'); setStoreDropdownOpen(false); }}
                        className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold transition-all cursor-pointer ${
                          marketFilter === 'ALL'
                            ? 'bg-[#EBF3FF] text-[#0D6EFD] font-black'
                            : 'text-[#0B1F3A] hover:bg-slate-50'
                        }`}
                      >
                        <LayoutGrid size={15} className={marketFilter === 'ALL' ? 'text-[#0D6EFD] shrink-0' : 'text-slate-400 shrink-0'} />
                        <span>TẤT CẢ SIÊU THỊ</span>
                        {marketFilter === 'ALL' && (
                          <div className="ml-auto w-[7px] h-[7px] rounded-full bg-[#0D6EFD] shrink-0" />
                        )}
                      </button>

                      <div className="h-[1px] bg-slate-100 my-[4px]" />

                      {/* Individual Markets */}
                      {filteredMarkets.map(m => {
                        const Icon = getMarketIcon(m.name);
                        const isActive = marketFilter === m.name;
                        return (
                          <button
                            type="button"
                            key={m.name}
                            onClick={() => { setMarketFilter(m.name); setStoreDropdownOpen(false); }}
                            className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold transition-all cursor-pointer text-left ${
                              isActive
                                ? 'bg-[#EBF3FF] text-[#0D6EFD] font-black'
                                : 'text-[#0B1F3A] hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={15} className={isActive ? 'text-[#0D6EFD] shrink-0' : 'text-slate-400 shrink-0'} />
                            <span className="truncate">{m.name}</span>
                            {isActive && (
                              <div className="ml-auto w-[7px] h-[7px] rounded-full bg-[#0D6EFD] shrink-0" />
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

          {/* ─── Right: Action Buttons + User Account ─── */}
          <div className="flex items-center gap-[6px] sm:gap-[10px] shrink-0">
            {/* Subtle Left Divider on Desktop */}
            <div className="hidden lg:block w-[1px] h-[28px] bg-slate-200/90 mr-[2px]" />

            {/* 1. Nút CHIA SẺ LINK */}
            {(() => {
              const isPosmAllSp = currentPage === 'toolhotro' && activeToolHoTroTab === 'popup-all-sp';
              return (
                <button
                  type="button"
                  onClick={handleShareLink}
                  className={`flex items-center justify-center gap-[7px] w-[34px] h-[34px] sm:w-auto sm:h-[40px] sm:px-[14px] rounded-[10px] sm:rounded-[12px] text-[11.5px] font-black transition-all active:scale-95 cursor-pointer border ${
                    copiedLink
                      ? 'bg-[#EBF3FF] text-[#0D6EFD] border-[#9EC5FE] ring-2 ring-blue-100 sm:px-[14px]'
                      : isPosmAllSp
                        ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200'
                        : 'bg-[#F4F9FF] hover:bg-[#E6F1FF] text-[#0D6EFD] border-[#CFE2FF] shadow-[0_2px_6px_rgba(13,110,253,0.04)]'
                  }`}
                  title={
                    isPosmAllSp
                      ? 'Chia sẻ link POSM ALL SP: crm-sieu-thi.pages.dev/posm'
                      : `Chia sẻ link trực tiếp trang này cho Khách xem dữ liệu Kho ${userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || ''}`
                  }
                >
                  {copiedLink ? (
                    <>
                      <Check size={15} strokeWidth={2.5} className="text-[#0D6EFD] shrink-0" />
                      <span className="hidden sm:inline text-[11.5px] font-black uppercase tracking-tight">
                        {isPosmAllSp ? 'Đã chép link POSM!' : `Đã chép link Kho ${userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || ''}!`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 size={15} strokeWidth={2.3} className={`${isPosmAllSp ? 'text-emerald-600' : 'text-[#0D6EFD]'} shrink-0`} />
                      <span className="hidden sm:inline text-[11.5px] font-black uppercase tracking-[0.02em]">
                        CHIA SẺ LINK
                      </span>
                    </>
                  )}
                </button>
              );
            })()}

            {/* 2. Nút XEM MOBILE */}
            {!isInsideIframe && onToggleMobileSimulator && (
              <button
                type="button"
                onClick={onToggleMobileSimulator}
                className="hidden md:flex items-center justify-center gap-[7px] h-[40px] px-[14px] rounded-[12px] text-[11.5px] font-black transition-all active:scale-95 cursor-pointer border bg-[#F4F9FF] hover:bg-[#E6F1FF] text-[#0D6EFD] border-[#CFE2FF] shadow-[0_2px_6px_rgba(13,110,253,0.04)]"
                title="Chuyển sang chế độ xem Mobile (mô phỏng trực quan các dòng điện thoại iOS & Android)"
              >
                <div className="relative flex items-center">
                  <Monitor size={15} strokeWidth={2.2} className="text-[#0D6EFD]" />
                  <span className="text-[11px] text-[#94A3B8] mx-[3px] font-bold">/</span>
                  <Smartphone size={15} strokeWidth={2.2} className="text-[#0D6EFD]" />
                </div>
                <span className="text-[11.5px] font-black uppercase tracking-[0.02em]">
                  XEM MOBILE
                </span>
              </button>
            )}

            {/* Vertical Divider before User Account */}
            <div className="hidden sm:block w-[1px] h-[28px] bg-slate-200/90 mx-[2px]" />

            {/* 4. Khu vực Tài Khoản Người Dùng */}
            <div ref={userDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-[8px] sm:gap-[10px] py-[3px] px-[4px] sm:px-[8px] rounded-[12px] hover:bg-slate-50 transition-all cursor-pointer"
              >
                {/* Circular Blue Avatar + Green Online Dot */}
                <div className="relative shrink-0">
                  <div
                    className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full text-white flex items-center justify-center font-black text-[10px] sm:text-[11px] shadow-[0_3px_10px_rgba(13,110,253,0.25)]"
                    style={{ background: 'linear-gradient(135deg, #1D7AFC 0%, #0D6EFD 100%)' }}
                  >
                    {String(userProfile?.username || '43751').slice(0, 4).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-[1px] -right-[1px] w-[10px] h-[10px] rounded-full bg-[#10B981] border-[2px] border-white" />
                </div>

                {/* User Code + Role */}
                <div className="hidden sm:flex flex-col items-start justify-center text-left min-w-0">
                  <div className="text-[13px] sm:text-[14px] font-black text-[#0B1F3A] leading-tight truncate max-w-[110px]">
                    {userProfile?.username || '43751'}
                  </div>
                  <div className="text-[10.5px] sm:text-[11px] font-bold text-[#94A3B8] leading-tight">
                    {canEditUser ? 'admin' : (userProfile?.role || 'member')}
                  </div>
                </div>

                <ChevronDown
                  size={15}
                  strokeWidth={2.4}
                  className={`hidden sm:inline text-[#334155] transition-transform duration-200 ${
                    userDropdownOpen ? 'rotate-180 text-[#0D6EFD]' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-[6px] right-0 w-[230px] bg-white border border-slate-200/90 rounded-[14px] shadow-[0_12px_32px_-4px_rgba(11,31,58,0.14)] py-[6px] z-[120]"
                  >
                    {/* User info header */}
                    <div className="px-[14px] py-[10px] border-b border-slate-100">
                      <div className="flex items-center gap-[10px]">
                        <div className="relative shrink-0">
                          <div
                            className="w-[36px] h-[36px] rounded-full text-white flex items-center justify-center font-black text-[11px] shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #1D7AFC 0%, #0D6EFD 100%)' }}
                          >
                            {String(userProfile?.username || '43751').slice(0, 4).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-[1px] -right-[1px] w-[10px] h-[10px] rounded-full bg-[#10B981] border-[2px] border-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-black text-[#0B1F3A] truncate leading-tight">
                            {userProfile?.username || '43751'}
                          </div>
                          <div className="text-[10.5px] font-bold text-slate-400 leading-tight mt-[2px]">
                            TK: {userProfile?.username || '43751'} ({canEditUser ? 'admin' : (userProfile?.role || 'member')})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isInsideIframe && onToggleMobileSimulator && (
                      <button
                        type="button"
                        onClick={() => { onToggleMobileSimulator(); setUserDropdownOpen(false); }}
                        className="md:hidden w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold text-[#0D6EFD] hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        <Smartphone size={16} className="text-[#0D6EFD] shrink-0" />
                        <span>Chế độ Xem Mobile</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => { setShowDeclarationForce(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-pointer"
                    >
                      <Store size={16} className="text-emerald-600 shrink-0" />
                      <span>Cấu hình tên siêu thị</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowSettings(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer"
                    >
                      <Settings size={16} className="text-slate-400 shrink-0" />
                      <span>Cài đặt hiển thị</span>
                    </button>

                    {canEditUser && (
                      <button
                        type="button"
                        onClick={() => { setCurrentPage('users'); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer"
                      >
                        <KeyRound size={16} className="text-slate-400 shrink-0" />
                        <span>Quản lý tài khoản</span>
                      </button>
                    )}
                    {canEditUser && (
                      <button
                        type="button"
                        onClick={() => { setShowMaintenanceConfirm(true); setUserDropdownOpen(false); }}
                        className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold transition-all cursor-pointer ${
                          pageMaintenanceState[effectivePageKey]
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <Shield size={16} className={pageMaintenanceState[effectivePageKey] ? 'text-red-500 shrink-0' : 'text-slate-400 shrink-0'} />
                        <span>{pageMaintenanceState[effectivePageKey] ? 'Tắt bảo trì' : 'Bật bảo trì'}</span>
                        {pageMaintenanceState[effectivePageKey] && (
                          <span className="ml-auto w-[8px] h-[8px] rounded-full bg-red-500 animate-pulse" />
                        )}
                      </button>
                    )}

                    {/* Tính năng Ẩn khỏi người dùng - CHỈ HIỂN THỊ VỚI USER 43751 */}
                    {isUser43751 && (
                      <button
                        type="button"
                        onClick={async () => {
                          setUserDropdownOpen(false);
                          if (onToggleHide) {
                            const nextVal = !pageHiddenState[effectivePageKey];
                            await onToggleHide(effectivePageKey, nextVal);
                          }
                        }}
                        className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold transition-all cursor-pointer ${
                          pageHiddenState[effectivePageKey]
                            ? 'text-purple-700 bg-purple-50/80 hover:bg-purple-100/80'
                            : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                        title={pageHiddenState[effectivePageKey] ? 'Bấm để Hiện lại trang/tab này' : 'Bấm để Ẩn ngay trang/tab này khỏi người dùng'}
                      >
                        {pageHiddenState[effectivePageKey] ? (
                          <Eye size={16} className="text-purple-600 shrink-0" />
                        ) : (
                          <EyeOff size={16} className="text-slate-400 shrink-0" />
                        )}
                        <span>{pageHiddenState[effectivePageKey] ? 'Hiện lại trang này' : 'Ẩn khỏi người dùng'}</span>
                        {pageHiddenState[effectivePageKey] ? (
                          <span className="ml-auto px-[6px] py-[2px] text-[9.5px] font-black rounded-[5px] bg-purple-200/90 text-purple-900 uppercase tracking-wider shadow-2xs">
                            Đang ẩn
                          </span>
                        ) : (
                          <span className="ml-auto text-[10.5px] text-purple-600 font-bold">
                            Ẩn ngay
                          </span>
                        )}
                      </button>
                    )}

                    {isUser43751 && (
                      <button
                        type="button"
                        onClick={() => { setShowHiddenPagesModal(true); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-[10px] px-[14px] py-[8px] text-[11px] font-bold text-slate-500 hover:text-purple-700 hover:bg-purple-50/60 transition-all cursor-pointer"
                        title="Xem danh sách tất cả các trang/tab đang ẩn"
                      >
                        <Settings size={14} className="text-slate-400 shrink-0" />
                        <span>Danh sách tất cả trang ẩn...</span>
                        {Object.values(pageHiddenState).filter(Boolean).length > 0 && (
                          <span className="ml-auto px-[6px] py-[1px] text-[9.5px] font-black rounded-full bg-purple-100 text-purple-700">
                            {Object.values(pageHiddenState).filter(Boolean).length}
                          </span>
                        )}
                      </button>
                    )}

                    <div className="h-[1px] bg-slate-100 my-[4px]" />

                    <button
                      type="button"
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
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

      {/* Modal Ẩn khỏi người dùng - DÀNH RIÊNG CHO USER 43751 */}
      {isUser43751 && onToggleHide && (
        <HiddenPagesModal
          isOpen={showHiddenPagesModal}
          onClose={() => setShowHiddenPagesModal(false)}
          pageHiddenState={pageHiddenState}
          onToggleHide={onToggleHide}
          effectivePageKey={effectivePageKey}
        />
      )}
    </header>
  );
};
