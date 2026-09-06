import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  LayoutGrid,
  Activity,
  Zap,
  Trophy,
  TrendingUp,
  Search,
  Check,
  HeartPulse,
  MessageSquare,
  Gift,
  Clock,
  FileText,
  MapPin,
  UploadCloud,
  ClipboardList,
  Calendar,
  ChevronDown,
  Store,
  Banknote,
  Sparkles,
  Target,
} from 'lucide-react';
import { useStore } from '../../../contexts/StoreContext';

/* ── Design Tokens ── */
const COLORS = {
  bg: '#FAFBFF',
  surface: '#FFFFFF',
  // Main Tab: Emerald Green when active
  mainActive: '#059669',
  mainActiveBg: '#ECFDF5',
  mainActiveBorder: '#10B981',
  mainActiveText: '#065F46',
  mainActiveSub: '#059669',
  mainHover: '#F0FDF4',

  // Sub Tab: Yellow / Amber when active
  subActive: '#D97706',
  subActiveBg: '#FEF3C7',
  subActiveBorder: '#F59E0B',
  subActiveText: '#92400E',
  subActiveDot: '#D97706',
  subHover: '#FFFBEB',

  textPrimary: '#172033',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E8ECF4',
  borderLight: '#F0F2F7',
  badgeHot: { bg: '#FFF1F2', text: '#E11D48' },
  badgeMoi: { bg: '#EEF1FF', text: '#4F46E5' },
  online: '#10B981',
};

interface NavItem {
  id: string;
  label: string;
  icon: any;
  color?: string;
}

/* ── Extended metadata for each nav item ── */
const ITEM_META: Record<string, { subtitle: string; badge?: string; badgeType?: 'hot' | 'moi' }> = {
  realtime:    { subtitle: 'Báo cáo doanh thu ngày',       badge: 'HOT',  badgeType: 'hot' },
  luyke:       { subtitle: 'Luỹ kế & tổng hợp tháng',     badge: 'MỚI',  badgeType: 'moi' },
  khaibao:     { subtitle: 'Dán Realtime & Luỹ kế',        badge: 'MỚI',  badgeType: 'moi' },
  health:      { subtitle: 'Theo dõi sức khoẻ nhân viên' },
  toolhotro:   { subtitle: 'Công cụ in ấn & sticker' },
  bbkq:        { subtitle: 'Biên bản kiểm quỹ tiền mặt', badge: 'MỚI', badgeType: 'moi' },
  tienich:     { subtitle: 'Phân ca, biên bản & kiểm kê' },
  tnbleader:   { subtitle: 'Thi đua & Bảng xếp hạng',     badge: 'HOT',  badgeType: 'hot' },
  birthday:    { subtitle: 'Danh sách sinh nhật NV' },
  feedback:    { subtitle: 'Góp ý & Hướng dẫn sử dụng' },
  excelviewer: { subtitle: 'Xem & tải file Excel' },
  bangiasoc:   { subtitle: 'Giá sốc siêu thị' },
  lichpg:      { subtitle: 'Lịch trình PG hàng ngày' },
};

/* ── Section grouping ── */
const SECTION_MAP: { title: string; ids: string[] }[] = [
  { title: 'MENU QUẢN LÝ', ids: ['realtime', 'luyke', 'khaibao', 'health', 'tnbleader'] },
  { title: 'DỮ LIỆU & TIỆN ÍCH', ids: ['toolhotro', 'bbkq', 'tienich', 'birthday', 'excelviewer', 'feedback', 'bangiasoc', 'lichpg'] },
];

/* ── Submenu definitions ── */
const REALTIME_SUBS = [
  { id: 'summary' as const, label: 'Tổng quan', icon: LayoutGrid },
  { id: 'muc_tieu_ngay' as const, label: 'Mục tiêu ngày', icon: Target },
  { id: 'real_dthu_nv' as const, label: 'Real D.Thu NV', icon: TrendingUp },
  { id: 'khai_thac' as const, label: 'Data YCX', icon: Activity },
];
const REALTIME_SUBS_ADMIN = [
  { id: 'khai_thac_moi' as const, label: 'Data YCX Mới', icon: Activity },
];

const LUYKE_SUBS = [
  { id: 'summary' as const, label: 'Tổng quan', icon: LayoutGrid },
  { id: 'cum' as const, label: 'Cụm', icon: Store },
  { id: 'efficiency' as const, label: 'Thưởng QL/TC', icon: Activity },
  { id: 'thuong_st' as const, label: 'Thưởng ST', icon: Zap },
  { id: 'bcdtnh' as const, label: 'BC DT Ngành Hàng', icon: LayoutGrid },
  { id: 'ssg_boss' as const, label: 'SSG Boss', icon: Trophy },
];

const HEALTH_SUBS = [
  { id: 'DOANH_THU' as const, label: 'Doanh thu NV', icon: TrendingUp },
  { id: 'TONG_HOP_NV' as const, label: 'Tổng hợp NV', icon: LayoutGrid },
  { id: 'CHI_TIET' as const, label: 'Chi tiết NV', icon: Search },
  { id: 'THI_DUA' as const, label: 'TH Thi đua', icon: Check },
  { id: 'NGANH_HANG' as const, label: 'CT Ngành hàng', icon: HeartPulse },
  { id: 'PHUC_VU' as const, label: 'Phục vụ', icon: Users },
  { id: 'BAN_KEM_NV' as const, label: 'Bán kèm NV', icon: MessageSquare },
  { id: 'THUONG_NV' as const, label: 'Thưởng NV', icon: Gift },
  { id: 'TRA_CHAM_NV' as const, label: 'Trả chậm NV', icon: Clock },
  { id: 'RANK_3T_NV' as const, label: 'Xếp hạng NV 3T', icon: Trophy },
  { id: 'GIA_TRI_DH' as const, label: 'Giá trị ĐH', icon: FileText },
];

const TOOLHOTRO_SUBS = [
  { id: 'all-sticker', label: 'All Sticker', icon: LayoutGrid },
  { id: 'in-dia-chi', label: 'In Địa Chỉ', icon: MapPin },
  { id: 'in-phieu-bh', label: 'In Phiếu BH', icon: FileText },
];

const TIENICH_SUBS = [
  { id: 'phan-ca-thang', label: 'Phân Ca Tháng', icon: Users },
  { id: 'phan-ca-tuan', label: 'Phân Ca Tuần', icon: UploadCloud },
  { id: 'bien-ban', label: 'Biên Bản', icon: FileText },
];
const TIENICH_SUBS_ADMIN = [
  { id: 'kiem-ke', label: 'Kiểm Kê', icon: ClipboardList },
];
const TIENICH_SUBS_TAIL = [
  { id: 'roadshow', label: 'Roadshow', icon: Calendar },
];

const STICKER_VARIANTS = new Set([
  'sticker-event-dmx', 'sticker-event', 'sticker-lk',
  'sticker-ce', 'sticker-mln', 'sticker-gvgs', 'sticker-dcnb',
]);

/* ── Sidebar dimensions ── */
const SIDEBAR_EXPANDED = 345;
const SIDEBAR_COLLAPSED = 76;

interface GradientV2SidebarProps {
  navItems: NavItem[];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  expanded: boolean;
  onToggle: () => void;
  userProfile: any;
  canEditUser: boolean;
  pageMaintenanceState: Record<string, boolean>;
  effectivePageKey: string;
  setShowMaintenanceConfirm: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowDeclarationForce: (show: boolean) => void;
  logout: () => void;
}

/* ── Badge Component ── */
const Badge: React.FC<{ type: 'hot' | 'moi'; label: string }> = ({ type, label }) => {
  const style = type === 'hot' ? COLORS.badgeHot : COLORS.badgeMoi;
  return (
    <span
      className="shrink-0 text-[10.5px] font-extrabold uppercase tracking-[0.06em] px-[8px] py-[2.5px] rounded-[6px] leading-[16px]"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
};

/* ── SubMenu Item ── */
const SubMenuItem: React.FC<{
  icon: any;
  label: string;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = ({ icon: SubIcon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-[6.5px] rounded-[10px] text-[13.5px] font-bold transition-all duration-150 cursor-pointer"
    style={{
      backgroundColor: isActive ? COLORS.subActiveBg : 'transparent',
      color: isActive ? COLORS.subActiveText : COLORS.textSecondary,
      borderLeft: isActive ? `3px solid ${COLORS.subActiveBorder}` : '3px solid transparent',
      boxShadow: isActive ? '0 1px 6px rgba(245,158,11,0.14)' : 'none',
    }}
    onMouseEnter={(e) => {
      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.subHover;
    }}
    onMouseLeave={(e) => {
      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
    }}
  >
    <SubIcon
      size={15}
      strokeWidth={isActive ? 2.4 : 1.8}
      style={{ color: isActive ? COLORS.subActive : COLORS.textMuted, flexShrink: 0 }}
    />
    <span className="truncate">{label}</span>
    {isActive && (
      <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-1">
        {/* Animated dynamic radar pulse beacon in high-contrast Emerald Green */}
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-85"
            style={{ backgroundColor: '#10B981' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
            style={{ backgroundColor: '#059669' }}
          />
        </span>
        {/* Animated sparkling micro-icon in vibrant Emerald */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          <Sparkles size={13} className="text-emerald-600 fill-emerald-500" />
        </motion.div>
      </div>
    )}
  </button>
);

/* ── SubMenu Container ── */
const SubMenuContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="overflow-hidden"
  >
    <div className="ml-[32px] mt-[2px] mb-1.5 space-y-[2px] pl-3" style={{ borderLeft: `1.5px solid ${COLORS.borderLight}` }}>
      {children}
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN SIDEBAR COMPONENT                                       */
/* ═══════════════════════════════════════════════════════════════ */
export const GradientV2Sidebar: React.FC<GradientV2SidebarProps> = ({
  navItems,
  currentPage,
  setCurrentPage,
  expanded,
  onToggle,
  userProfile,
  canEditUser,
  pageMaintenanceState,
  effectivePageKey,
  setShowMaintenanceConfirm,
  setShowSettings,
  setShowDeclarationForce,
  logout,
}) => {
  const {
    activeRealtimeTab, setActiveRealtimeTab,
    activeLuyKeTab, setActiveLuyKeTab,
    activeHealthTab, setActiveHealthTab,
    activeToolHoTroTab, setActiveToolHoTroTab,
    activeTienIchTab, setActiveTienIchTab,
  } = useStore();

  const isAdmin = userProfile?.username === '43751';
  const sidebarWidth = expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  const sections = SECTION_MAP.map((sec) => ({
    title: sec.title,
    items: sec.ids
      .map((id) => navItems.find((n) => n.id === id))
      .filter(Boolean) as NavItem[],
  })).filter((sec) => sec.items.length > 0);

  /* Check if an item has submenus */
  const hasSubmenu = (id: string) => ['realtime', 'luyke', 'health', 'toolhotro', 'tienich'].includes(id);

  return (
    <aside
      className="hidden md:flex flex-col min-h-screen min-h-[100dvh] self-stretch shrink-0 z-40 print:hidden select-none relative"
      style={{
        width: sidebarWidth,
        transition: 'width 230ms cubic-bezier(.4,0,.2,1)',
        willChange: 'width',
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          backgroundColor: COLORS.bg,
          borderRight: `1px solid ${COLORS.border}`,
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col flex-1 min-h-full w-full">

        {/* ═══════════════ HEADER ═══════════════ */}
        <div
          className="shrink-0 sticky top-0 z-20 backdrop-blur-md bg-white/95"
          style={{ borderBottom: `1px solid ${COLORS.border}` }}
        >
          {expanded ? (
            <div className="flex items-center gap-3 px-5 py-3.5">
              {/* Logo */}
              <div
                className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" fillOpacity="0.95" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Text */}
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <div
                  className="text-[17.5px] font-extrabold uppercase tracking-[-0.01em] leading-tight"
                  style={{ color: COLORS.textPrimary }}
                >
                  CRM Siêu Thị
                </div>
                <div className="flex items-center gap-[6px] mt-[2px]">
                  <span
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ backgroundColor: COLORS.online }}
                  />
                  <span
                    className="text-[12.5px] font-medium"
                    style={{ color: COLORS.textMuted }}
                  >
                    Online
                  </span>
                </div>
              </motion.div>
              {/* Collapse btn */}
              <button
                onClick={onToggle}
                className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
                style={{ color: COLORS.textMuted }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.primaryHover;
                  (e.currentTarget as HTMLElement).style.color = COLORS.textSecondary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = COLORS.textMuted;
                }}
                title="Thu gọn menu"
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-3.5 px-2">
              {/* Collapsed logo + expand */}
              <button
                onClick={onToggle}
                className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                }}
                title="Mở rộng menu"
              >
                <ChevronRight size={20} strokeWidth={2.2} color="white" />
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════ NAVIGATION ═══════════════ */}
        <nav className="flex-1 overflow-y-auto min-h-0 py-2.5 pb-28 sidebar-custom-scroll">
          <div className="space-y-1">
            {sections.map((section, sIdx) => (
              <div key={section.title}>
                {/* Section title */}
                {expanded ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-5 pt-3 pb-[4px] text-[12px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: COLORS.textMuted }}
                  >
                    {section.title}
                  </motion.div>
                ) : (
                  sIdx > 0 && (
                    <div
                      className="mx-4 my-2"
                      style={{ height: 1, backgroundColor: COLORS.borderLight }}
                    />
                  )
                )}

                {/* Items */}
                <div className={expanded ? 'px-3 space-y-[3px]' : 'px-2 space-y-1'}>
                  {section.items.map((item) => {
                    const isActive = currentPage === item.id;
                    const Icon = item.icon;
                    const meta = ITEM_META[item.id] || { subtitle: '' };
                    const showSub = expanded && isActive && hasSubmenu(item.id);

                    return (
                      <React.Fragment key={item.id}>
                        {/* ── Menu Item Button ── */}
                        <button
                          onClick={() => setCurrentPage(item.id)}
                          title={!expanded ? item.label : undefined}
                          className="group relative w-full flex items-center transition-all duration-200 cursor-pointer"
                          style={{
                            padding: expanded ? '9px 13px' : '0',
                            gap: expanded ? '12px' : '0',
                            borderRadius: expanded ? '14px' : '0',
                            backgroundColor: expanded
                              ? (isActive ? COLORS.mainActiveBg : 'transparent')
                              : 'transparent',
                            borderLeft: expanded
                              ? (isActive ? `3.5px solid ${COLORS.mainActiveBorder}` : '3.5px solid transparent')
                              : 'none',
                            boxShadow: (expanded && isActive) ? '0 1px 6px rgba(16,185,129,0.14)' : 'none',
                            justifyContent: expanded ? 'flex-start' : 'center',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive && expanded) {
                              (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.mainHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive && expanded) {
                              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {/* Icon */}
                          {expanded ? (
                            <div
                              className="shrink-0 flex items-center justify-center"
                              style={{
                                color: isActive ? COLORS.mainActive : COLORS.textSecondary,
                                transition: 'color 200ms',
                              }}
                            >
                              <Icon size={22} strokeWidth={isActive ? 2.3 : 1.7} />
                            </div>
                          ) : (
                            <div
                              className="shrink-0 flex items-center justify-center transition-all duration-200"
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 14,
                                backgroundColor: isActive ? COLORS.mainActiveBg : 'transparent',
                                color: isActive ? COLORS.mainActive : COLORS.textSecondary,
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.mainHover;
                                  (e.currentTarget as HTMLElement).style.color = COLORS.textPrimary;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = COLORS.textSecondary;
                                }
                              }}
                            >
                              <Icon size={22} strokeWidth={isActive ? 2.3 : 1.7} />
                            </div>
                          )}

                          {/* Label + Subtitle */}
                          {expanded && (
                            <motion.div
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.15 }}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div
                                className="text-[15.5px] font-extrabold leading-tight truncate"
                                style={{ color: isActive ? COLORS.mainActiveText : COLORS.textPrimary }}
                              >
                                {item.label}
                              </div>
                              <div
                                className="text-[12.5px] font-medium leading-tight mt-[2px] truncate"
                                style={{ color: isActive ? COLORS.mainActiveSub : COLORS.textSecondary }}
                              >
                                {meta.subtitle}
                              </div>
                            </motion.div>
                          )}

                          {/* Badge */}
                          {expanded && meta.badge && meta.badgeType && (
                            <Badge type={meta.badgeType} label={meta.badge} />
                          )}

                          {/* Chevron for expandable items */}
                          {expanded && hasSubmenu(item.id) && (
                            <ChevronDown
                              size={15}
                              strokeWidth={2.2}
                              className="shrink-0 transition-transform duration-200"
                              style={{
                                color: isActive ? COLORS.mainActive : COLORS.textMuted,
                                transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          )}
                        </button>

                        {/* ── Sub-tabs ── */}
                        <AnimatePresence>
                          {/* Realtime sub-tabs */}
                          {showSub && item.id === 'realtime' && (
                            <SubMenuContainer>
                              {[...REALTIME_SUBS, ...(isAdmin ? REALTIME_SUBS_ADMIN : [])].map((sub) => (
                                <SubMenuItem
                                  key={sub.id}
                                  icon={sub.icon}
                                  label={sub.label}
                                  isActive={activeRealtimeTab === sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentPage !== 'realtime') setCurrentPage('realtime');
                                    setActiveRealtimeTab(sub.id);
                                  }}
                                />
                              ))}
                            </SubMenuContainer>
                          )}

                          {/* LuyKe sub-tabs */}
                          {showSub && item.id === 'luyke' && (
                            <SubMenuContainer>
                              {LUYKE_SUBS.map((sub) => (
                                <SubMenuItem
                                  key={sub.id}
                                  icon={sub.icon}
                                  label={sub.label}
                                  isActive={activeLuyKeTab === sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentPage !== 'luyke') setCurrentPage('luyke');
                                    setActiveLuyKeTab(sub.id);
                                  }}
                                />
                              ))}
                            </SubMenuContainer>
                          )}

                          {/* Health sub-tabs */}
                          {showSub && item.id === 'health' && (
                            <SubMenuContainer>
                              {HEALTH_SUBS.map((sub) => (
                                <SubMenuItem
                                  key={sub.id}
                                  icon={sub.icon}
                                  label={sub.label}
                                  isActive={activeHealthTab === sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentPage !== 'health') setCurrentPage('health');
                                    setActiveHealthTab(sub.id);
                                  }}
                                />
                              ))}
                            </SubMenuContainer>
                          )}

                          {/* ToolHoTro sub-tabs */}
                          {showSub && item.id === 'toolhotro' && (
                            <SubMenuContainer>
                              {TOOLHOTRO_SUBS.map((sub) => {
                                const isSubActive = activeToolHoTroTab === sub.id ||
                                  (sub.id === 'all-sticker' && STICKER_VARIANTS.has(activeToolHoTroTab));
                                return (
                                  <SubMenuItem
                                    key={sub.id}
                                    icon={sub.icon}
                                    label={sub.label}
                                    isActive={isSubActive}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (currentPage !== 'toolhotro') setCurrentPage('toolhotro');
                                      setActiveToolHoTroTab(sub.id);
                                    }}
                                  />
                                );
                              })}
                            </SubMenuContainer>
                          )}

                          {/* TienIch sub-tabs */}
                          {showSub && item.id === 'tienich' && (
                            <SubMenuContainer>
                              {[
                                ...TIENICH_SUBS,
                                ...(isAdmin ? TIENICH_SUBS_ADMIN : []),
                                ...TIENICH_SUBS_TAIL,
                              ].map((sub) => {
                                const isSubActive = activeTienIchTab === sub.id;
                                return (
                                  <SubMenuItem
                                    key={sub.id}
                                    icon={sub.icon}
                                    label={sub.label}
                                    isActive={isSubActive}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (currentPage !== 'tienich') setCurrentPage('tienich');
                                      setActiveTienIchTab(sub.id);
                                    }}
                                  />
                                );
                              })}
                            </SubMenuContainer>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

      </div>
    </aside>
  );
};
