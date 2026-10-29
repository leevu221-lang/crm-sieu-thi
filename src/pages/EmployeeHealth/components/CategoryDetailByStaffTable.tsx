import React, { useState, useRef, useMemo, useCallback, useId } from 'react';
import ReactDOM from 'react-dom';
import { Camera, ChevronDown, Check, Search, X, Plus, Layers, Sparkles, Copy, RotateCcw, Trophy, UserRound, Target, ChartNoAxesColumn, RefreshCw } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE, preloadFontDataCache, injectFontStyleIntoClone } from '../../../utils/fontExportUtil';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '../../RTST/utils';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../../../components/CaptureLoadingOverlay';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { cleanCategoryName } from './EmployeeDetailTable';
import { useLuykeData } from '../../RTST/hooks/useLuykeData';
import { parseStaffMatrixDataRefined, getCategoryGroupType, isSameCategoryClean } from './SummaryThiDuaTable';
import { CategoryConfigItem } from '../../../hooks/useCategoryConfig';

export interface CategoryRowData {
  staffName: string;
  target: number;
  accumulated: number;
  projectedRate: number;
}

export interface CategoryCardData {
  targetPerStaff: number;
  rowData: CategoryRowData[];
  reachedCount: number;
  totalStaff: number;
  totTarget: number;
  totAcc: number;
  totRate: number;
  totDiff: number;
}

interface CategoryCardProps {
  catName: string;
  data: CategoryCardData;
  yesterdayDate: string;
  dropdownCategories: string[];
  onExport: (catName: string, elementId: string) => void;
  onOpenComment: (catName: string, rowData: CategoryRowData[]) => void;
  onRemoveCard: (catName: string) => void;
  onSwitchCategory: (oldCat: string, newCat: string) => void;
}

// ========================================================
// Helper: Split Category Title into White Prefix ("T10 - ") and Gold Main ("SIM TỔNG")
// ========================================================
const splitCategoryHeaderTitle = (rawName: string): { prefix: string; main: string } => {
  const trimmed = (rawName || '').trim();
  const dashIdx = trimmed.indexOf('-');
  if (dashIdx > 0 && dashIdx < 16) {
    const leftPart = trimmed.slice(0, dashIdx).trim();
    const rightPart = trimmed.slice(dashIdx + 1).trim();
    if (leftPart && rightPart) {
      return {
        prefix: `${leftPart} - `,
        main: rightPart,
      };
    }
  }
  return { prefix: '', main: trimmed };
};

// ========================================================
// Reusable Component: RankBadge (Top 1 Gold, Top 2 Silver, Top 3 Bronze Laurel Medals + Rank 4+ Badges)
// Pure SVG + CSS (no external images, no emoji), unique SVG IDs for multi-card & html-to-image export
// ========================================================
interface RankBadgeProps {
  rank: number;
  isZeroRow?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = React.memo(({ rank, isZeroRow = false }) => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  if (rank === 1 || rank === 2 || rank === 3) {
    const palette =
      rank === 1
        ? {
            pillBg: 'linear-gradient(90deg, #FFFDF2 0%, #FDE68A 50%, #FFFDF2 100%)',
            pillBorder: '#FCD34D',
            wreathPrimary: '#B45309',
            wreathSecondary: '#F59E0B',
            wreathHighlight: '#FBBF24',
            outerRingStart: '#FEF08A',
            outerRingMid: '#F59E0B',
            outerRingEnd: '#92400E',
            innerStart: '#FBBF24',
            innerMid: '#D97706',
            innerEnd: '#92400E',
            innerStroke: '#FEF9C3',
            numShadow: '#78350F',
          }
        : rank === 2
          ? {
              pillBg: 'linear-gradient(90deg, #F8FAFC 0%, #DCE6F2 50%, #F8FAFC 100%)',
              pillBorder: '#CBD5E1',
              wreathPrimary: '#475569',
              wreathSecondary: '#94A3B8',
              wreathHighlight: '#CBD5E1',
              outerRingStart: '#FFFFFF',
              outerRingMid: '#94A3B8',
              outerRingEnd: '#334155',
              innerStart: '#CBD5E1',
              innerMid: '#64748B',
              innerEnd: '#334155',
              innerStroke: '#F8FAFC',
              numShadow: '#1E293B',
            }
          : {
              pillBg: 'linear-gradient(90deg, #FFF7ED 0%, #FDBA74 50%, #FFF7ED 100%)',
              pillBorder: '#FB923C',
              wreathPrimary: '#9A3412',
              wreathSecondary: '#EA580C',
              wreathHighlight: '#FB923C',
              outerRingStart: '#FFEDD5',
              outerRingMid: '#EA580C',
              outerRingEnd: '#7C2D12',
              innerStart: '#FB923C',
              innerMid: '#C2410C',
              innerEnd: '#7C2D12',
              innerStroke: '#FFEDD5',
              numShadow: '#431407',
            };

    const gradOuterId = `medal-outer-${rank}-${uid}`;
    const gradInnerId = `medal-inner-${rank}-${uid}`;

    return (
      <div
        className="cat-rank-medal inline-flex items-center justify-center w-[34px] h-[24px] min-[390px]:w-[38px] min-[390px]:h-[26px] min-[768px]:w-[58px] min-[768px]:h-[35px] max-w-full rounded-[7px] min-[768px]:rounded-[11px] mx-auto select-none shrink-0"
        style={{
          background: palette.pillBg,
          border: `1px solid ${palette.pillBorder}`,
          boxShadow: '0 2px 5px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        }}
      >
        <svg
          className="cat-rank-medal-svg w-[31px] h-[22px] min-[390px]:w-[35px] min-[390px]:h-[24px] min-[768px]:w-[52px] min-[768px]:h-[32px] overflow-visible shrink-0"
          viewBox="0 0 54 34"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradOuterId} x1="15" y1="4" x2="39" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={palette.outerRingStart} />
              <stop offset="50%" stopColor={palette.outerRingMid} />
              <stop offset="100%" stopColor={palette.outerRingEnd} />
            </linearGradient>
            <linearGradient id={gradInnerId} x1="19" y1="7" x2="35" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={palette.innerStart} />
              <stop offset="55%" stopColor={palette.innerMid} />
              <stop offset="100%" stopColor={palette.innerEnd} />
            </linearGradient>
          </defs>

          {/* Left Laurel Wreath Branch & Leaves */}
          <path
            d="M18 28C11.8 25.8 7.5 20.5 7.5 14C7.5 9.8 9.8 6 13.2 3.8"
            stroke={palette.wreathPrimary}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <ellipse cx="12.2" cy="24.2" rx="3.3" ry="1.45" transform="rotate(-52 12.2 24.2)" fill={palette.wreathPrimary} />
          <ellipse cx="8.6" cy="19.8" rx="3.4" ry="1.5" transform="rotate(-36 8.6 19.8)" fill={palette.wreathSecondary} />
          <ellipse cx="7.4" cy="15.0" rx="3.4" ry="1.5" transform="rotate(-16 7.4 15.0)" fill={palette.wreathPrimary} />
          <ellipse cx="8.4" cy="10.2" rx="3.2" ry="1.45" transform="rotate(10 8.4 10.2)" fill={palette.wreathSecondary} />
          <ellipse cx="11.2" cy="6.2" rx="2.9" ry="1.35" transform="rotate(34 11.2 6.2)" fill={palette.wreathHighlight} />
          <ellipse cx="14.2" cy="3.8" rx="2.4" ry="1.15" transform="rotate(52 14.2 3.8)" fill={palette.wreathPrimary} />

          {/* Right Laurel Wreath Branch & Leaves */}
          <path
            d="M36 28C42.2 25.8 46.5 20.5 46.5 14C46.5 9.8 44.2 6 40.8 3.8"
            stroke={palette.wreathPrimary}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <ellipse cx="41.8" cy="24.2" rx="3.3" ry="1.45" transform="rotate(52 41.8 24.2)" fill={palette.wreathPrimary} />
          <ellipse cx="45.4" cy="19.8" rx="3.4" ry="1.5" transform="rotate(36 45.4 19.8)" fill={palette.wreathSecondary} />
          <ellipse cx="46.6" cy="15.0" rx="3.4" ry="1.5" transform="rotate(16 46.6 15.0)" fill={palette.wreathPrimary} />
          <ellipse cx="45.6" cy="10.2" rx="3.2" ry="1.45" transform="rotate(-10 45.6 10.2)" fill={palette.wreathSecondary} />
          <ellipse cx="42.8" cy="6.2" rx="2.9" ry="1.35" transform="rotate(-34 42.8 6.2)" fill={palette.wreathHighlight} />
          <ellipse cx="39.8" cy="3.8" rx="2.4" ry="1.15" transform="rotate(-52 39.8 3.8)" fill={palette.wreathPrimary} />

          {/* Bottom Wreath Ribbon Bow */}
          <path
            d="M21.5 27.8L27 25.8L32.5 27.8L30.5 30.6L27 28.2L23.5 30.6L21.5 27.8Z"
            fill={palette.wreathPrimary}
          />

          {/* Top Medallion Hanger Accent */}
          <path d="M23.2 4.5L27 2L30.8 4.5H23.2Z" fill={palette.wreathPrimary} />

          {/* Outer Metallic Medal Circle */}
          <circle cx="27" cy="16.5" r="11.5" fill={`url(#${gradOuterId})`} stroke="#FFFFFF" strokeWidth="1" />

          {/* Inner Metallic Medallion */}
          <circle
            cx="27"
            cy="16.5"
            r="8.8"
            fill={`url(#${gradInnerId})`}
            stroke={palette.innerStroke}
            strokeWidth="1.15"
          />

          {/* Subtle Number Emboss Shadow */}
          <text
            x="27"
            y="18.1"
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.numShadow}
            fillOpacity="0.45"
            fontSize="13"
            fontWeight="900"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
          >
            {rank}
          </text>

          {/* Center Rank Number */}
          <text
            x="27"
            y="17.2"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="900"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
          >
            {rank}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <span
      className="cat-rank-num inline-flex items-center justify-center w-[26px] h-[22px] min-[390px]:w-[28px] min-[390px]:h-[24px] min-[768px]:w-[42px] min-[768px]:h-[30px] max-w-full rounded-[6px] min-[768px]:rounded-[9px] font-black text-[11px] min-[390px]:text-[11.5px] min-[768px]:text-[14.5px] tabular-nums leading-none select-none mx-auto shrink-0"
      style={
        isZeroRow
          ? {
              backgroundColor: '#FFE0E6',
              border: '1px solid #FECDD3',
              color: '#C81E3A',
            }
          : {
              backgroundColor: '#DCEBFA',
              border: '1px solid #BFDBFE',
              color: '#062A68',
            }
      }
    >
      {rank}
    </span>
  );
});
RankBadge.displayName = 'RankBadge';

// ========================================================
// Header Trophy Illustration (3D Pearl-Champagne Gold Cup matching HÌNH 1)
// ========================================================
const HeaderTrophyIllustration = React.memo(() => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const bowlGradId = `trophy-bowl-${uid}`;
  const innerRimGradId = `trophy-inner-rim-${uid}`;
  const stemGradId = `trophy-stem-${uid}`;
  const baseTopGradId = `trophy-base-top-${uid}`;
  const baseBotGradId = `trophy-base-bot-${uid}`;
  const handleLeftId = `trophy-handle-l-${uid}`;
  const handleRightId = `trophy-handle-r-${uid}`;
  const starGradId = `trophy-star-${uid}`;
  const flareGradId = `trophy-flare-${uid}`;
  const auraGradId = `trophy-aura-${uid}`;

  return (
    <svg
      className="cat-trophy-svg w-[38px] h-[38px] min-[390px]:w-[44px] min-[390px]:h-[44px] min-[768px]:w-[78px] min-[768px]:h-[78px] shrink-0 select-none pointer-events-none"
      viewBox="0 0 96 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft Ambient Golden-Blue Aura behind Cup */}
        <radialGradient id={auraGradId} cx="50%" cy="48%" r="48%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#075BCE" stopOpacity="0" />
        </radialGradient>

        {/* Pedestal Floor Light Flare */}
        <radialGradient id={flareGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#FDE047" stopOpacity="0.55" />
          <stop offset="75%" stopColor="#38BDF8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#075BCE" stopOpacity="0" />
        </radialGradient>

        {/* 3D Horizontal Pearl-Champagne Gold Cup Shading */}
        <linearGradient id={bowlGradId} x1="25" y1="18" x2="71" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="22%" stopColor="#FEF3C7" />
          <stop offset="52%" stopColor="#FDE68A" />
          <stop offset="78%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Top Inner Bowl Rim */}
        <linearGradient id={innerRimGradId} x1="25" y1="15" x2="71" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="45%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FFFBEB" />
        </linearGradient>

        {/* Stem 3D Cylindrical Shading */}
        <linearGradient id={stemGradId} x1="42" y1="52" x2="54" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="45%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Pedestal Tier 1 */}
        <linearGradient id={baseTopGradId} x1="33" y1="68" x2="63" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="40%" stopColor="#FDE047" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Pedestal Tier 2 */}
        <linearGradient id={baseBotGradId} x1="28" y1="74" x2="68" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="35%" stopColor="#FACC15" />
          <stop offset="75%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Left & Right Handle Gradients */}
        <linearGradient id={handleLeftId} x1="12" y1="22" x2="28" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="55%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={handleRightId} x1="84" y1="22" x2="68" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Recessed Embossed Star Gradient */}
        <linearGradient id={starGradId} x1="41" y1="25" x2="55" y2="41" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>

      {/* Ambient Back Glow */}
      <circle cx="48" cy="44" r="38" fill={`url(#${auraGradId})`} />

      {/* Bottom Light Rays & Golden Pedestal Flare (matching HÌNH 1) */}
      <line x1="12" y1="88" x2="86" y2="62" stroke="#FDE047" strokeOpacity="0.45" strokeWidth="1" />
      <line x1="18" y1="90" x2="88" y2="70" stroke="#7DD3FC" strokeOpacity="0.4" strokeWidth="1" />
      <ellipse cx="48" cy="81" rx="28" ry="6" fill={`url(#${flareGradId})`} />

      {/* Left Graceful Curved Handle */}
      <path
        d="M27 23H18.5C15.2 23 13 25.5 13 28.8C13 36.5 18.8 43.8 27.5 46.2L30.5 47"
        stroke={`url(#${handleLeftId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Right Graceful Curved Handle */}
      <path
        d="M69 23H77.5C80.8 23 83 25.5 83 28.8C83 36.5 77.2 43.8 68.5 46.2L65.5 47"
        stroke={`url(#${handleRightId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Cup Bowl Body */}
      <path
        d="M25 16.5H71L68.2 34.5C66.5 45.2 58 53 48 53C38 53 29.5 45.2 27.8 34.5L25 16.5Z"
        fill={`url(#${bowlGradId})`}
        stroke="#FEF9C3"
        strokeWidth="0.9"
      />

      {/* Top Oval Opening Rim of Cup */}
      <ellipse
        cx="48"
        cy="16.5"
        rx="23"
        ry="3.2"
        fill={`url(#${innerRimGradId})`}
        stroke="#FFFFFF"
        strokeWidth="0.9"
      />

      {/* Embossed 5-Pointed Star in Center of Cup (Matches HÌNH 1 directly on cup) */}
      <path
        d="M48 24.2L50.4 29.4L56.1 30.1L51.9 34.0L53.0 39.6L48 36.8L43.0 39.6L44.1 34.0L39.9 30.1L45.6 29.4L48 24.2Z"
        fill={`url(#${starGradId})`}
        stroke="#FFFBEB"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Sculpted Stem & Ring Nodes */}
      <path d="M44.5 52.2H51.5L50.2 68.5H45.8L44.5 52.2Z" fill={`url(#${stemGradId})`} />
      <ellipse cx="48" cy="54.5" rx="5.2" ry="1.6" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.5" />
      <ellipse cx="48" cy="66.5" rx="6.5" ry="1.8" fill="#FDE68A" stroke="#B45309" strokeWidth="0.5" />

      {/* 2-Stepped Pedestal Base */}
      <rect
        x="34"
        y="68"
        width="28"
        height="5.5"
        rx="2"
        fill={`url(#${baseTopGradId})`}
        stroke="#FEF9C3"
        strokeWidth="0.8"
      />
      <rect
        x="29"
        y="73.5"
        width="38"
        height="6.5"
        rx="2.4"
        fill={`url(#${baseBotGradId})`}
        stroke="#FEF08A"
        strokeWidth="0.9"
      />

      {/* Crisp Starlight Sparkles around Trophy */}
      <circle cx="24" cy="60" r="1.4" fill="#FEF9C3" />
      <circle cx="33" cy="79" r="1.8" fill="#FFFBEB" />
      <circle cx="72" cy="77" r="1.5" fill="#7DD3FC" />
      <circle cx="75" cy="54" r="1.3" fill="#FEF08A" />
    </svg>
  );
});
HeaderTrophyIllustration.displayName = 'HeaderTrophyIllustration';

// ========================================================
// Memoized Individual Category Card
// Prevents re-rendering 40+ cards when toggling 1 checkbox or typing in search filter
// ========================================================
const CategoryCard = React.memo<CategoryCardProps>(({
  catName,
  data,
  yesterdayDate,
  dropdownCategories,
  onExport,
  onOpenComment,
  onRemoveCard,
  onSwitchCategory
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearchTerm, setSwitcherSearchTerm] = useState('');

  const elementId = `cat-detail-${catName.replace(/\s+/g, '-')}`;
  const { rowData, reachedCount, totalStaff, totTarget, totAcc, totRate, totDiff } = data;
  const { prefix: titlePrefix, main: titleMain } = useMemo(() => splitCategoryHeaderTitle(catName), [catName]);

  const filteredSwitcherCategories = useMemo(() => {
    if (!switcherSearchTerm.trim()) return dropdownCategories;
    const lower = switcherSearchTerm.trim().toLowerCase();
    return dropdownCategories.filter(nh => nh.toLowerCase().includes(lower));
  }, [dropdownCategories, switcherSearchTerm]);

  const reachedPercentStr = totalStaff > 0 ? ((reachedCount / totalStaff) * 100).toFixed(1) : '0';
  const titleFontSize =
    catName.length > 32
      ? 'clamp(12px, 3.3vw, 21px)'
      : catName.length > 20
        ? 'clamp(13.5px, 3.8vw, 25px)'
        : 'clamp(16px, 4.5vw, 31px)';

  return (
    <div
      id={elementId}
      className={cn(
        "cat-card-root w-full max-w-full min-w-0 box-border mx-0 rounded-[18px] min-[768px]:rounded-[26px] p-[6px] min-[390px]:p-[8px] min-[768px]:p-[14px] flex flex-col relative group/card transition-shadow duration-200",
        isSwitcherOpen ? "z-30" : "z-10"
      )}
      style={{
        fontFamily: "'UTM Avo', 'Inter', sans-serif",
        background: 'linear-gradient(180deg, #F4F9FF 0%, #FFFFFF 100%)',
        border: '1.5px solid #C5E0FF',
        boxShadow: '0 16px 36px -10px rgba(6, 42, 104, 0.14)',
      }}
    >
      {/* Floating Card Utility Bar: Hiển thị cố định trên Mobile (<768px), ẩn/hiện khi di chuột trên Desktop (>=768px), nằm tách biệt phía trên viền card */}
      <div className="absolute -top-[13px] right-[12px] min-[768px]:right-[18px] z-30 flex items-center gap-[5px] no-capture export-btn opacity-100 pointer-events-auto min-[768px]:opacity-0 min-[768px]:pointer-events-none min-[768px]:group-hover/card:opacity-100 min-[768px]:group-hover/card:pointer-events-auto min-[768px]:focus-within:opacity-100 min-[768px]:focus-within:pointer-events-auto transition-all duration-150 bg-white/95 px-[6px] py-[3px] rounded-full shadow-md border border-[#B8D4F8]">
        {/* ✨ Nhận xét */}
        <button
          type="button"
          onClick={() => onOpenComment(catName, rowData)}
          title="Nhận xét ngành hàng"
          className="px-[8px] py-[3px] rounded-full text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-[3.5px] active:scale-95 bg-gradient-to-r from-[#075BCE] to-[#078BFF] text-white"
        >
          <Sparkles size={10} />
          <span>NHẬN XÉT</span>
        </button>

        {/* 📷 Chụp ảnh bảng này */}
        <button
          type="button"
          onClick={() => onExport(catName, elementId)}
          title={`Chụp ảnh trọn vẹn bảng ${catName}`}
          className="p-[4.5px] bg-[#EAF4FF] hover:bg-[#DCEBFA] rounded-full text-[#063B91] transition-all cursor-pointer active:scale-95"
        >
          <Camera size={12} />
        </button>

        {/* ✕ Ẩn bảng này */}
        <button
          type="button"
          onClick={() => onRemoveCard(catName)}
          title={`Ẩn bảng "${catName}"`}
          className="p-[4.5px] bg-[#FFE8ED] hover:bg-[#FECDD3] rounded-full text-[#D91B38] transition-all cursor-pointer active:scale-95"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* 2. THIẾT KẾ PHẦN HEADER BANNER (Vừa khít khung thẻ trên Mobile & Desktop, có switcher popover bên ngoài overflow-hidden) */}
      <div className="relative w-full max-w-full min-w-0 mb-[8px] min-[768px]:mb-[12px]">
        <div
          className="cat-header-banner text-white px-[44px] min-[390px]:px-[50px] py-[11px] min-[768px]:px-[84px] min-[768px]:py-[16px] min-h-[54px] min-[768px]:min-h-[76px] rounded-[16px] min-[768px]:rounded-[22px] relative overflow-hidden w-full max-w-full box-border flex items-center justify-center"
          style={{
            background: 'linear-gradient(96deg, #063B91 0%, #075BCE 46%, #078BFF 92%, #1D96FF 100%)',
            border: '1.5px solid rgba(135, 212, 255, 0.72)',
            boxShadow: '0 8px 20px -6px rgba(6, 59, 145, 0.35), inset 0 1.5px 2px rgba(224, 242, 254, 0.6)',
          }}
        >
          {/* Decorative Diagonal Light Beams, Top Specular Glow & Corner Wave Lines */}
          <div className="pointer-events-none select-none absolute inset-0 rounded-[16px] min-[768px]:rounded-[22px] overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 672 114" preserveAspectRatio="none" fill="none">
              {/* Diagonal Geometric Light Beams */}
              <polygon points="-30,114 95,-10 195,-10 70,114" fill="#38BDF8" fillOpacity="0.11" />
              <polygon points="105,114 235,-10 295,-10 165,114" fill="#FFFFFF" fillOpacity="0.06" />
              <polygon points="355,114 485,-10 595,-10 465,114" fill="#7DD3FC" fillOpacity="0.12" />
              <polygon points="480,114 610,-10 690,-10 560,114" fill="#FFFFFF" fillOpacity="0.08" />

              {/* Top Center Cyan Edge Specular Highlight */}
              <ellipse cx="336" cy="0" rx="190" ry="18" fill="#7DD3FC" fillOpacity="0.32" />
              <ellipse cx="336" cy="0" rx="95" ry="6" fill="#E0F2FE" fillOpacity="0.55" />

              {/* Bottom-Left Glowing Wave Mesh Lines */}
              <path d="M-10 68C38 68 78 88 106 118" stroke="#7DD3FC" strokeOpacity="0.55" strokeWidth="1.5" />
              <path d="M-10 76C34 76 72 94 98 118" stroke="#38BDF8" strokeOpacity="0.42" strokeWidth="1.1" />
              <path d="M-10 84C30 84 65 100 90 118" stroke="#38BDF8" strokeOpacity="0.32" strokeWidth="0.9" />
              <path d="M-10 92C25 92 56 105 80 118" stroke="#38BDF8" strokeOpacity="0.22" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Center Title + Status Pill (Căn giữa tuyệt đối trên Banner, tự động co/xuống dòng có kiểm soát khi tiêu đề dài) */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full min-w-0 max-w-full text-center">
            <div className="relative inline-flex items-center justify-center min-w-0 max-w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSwitcherOpen(prev => !prev);
                  setSwitcherSearchTerm('');
                }}
                className="cat-title-btn inline-flex items-center justify-center font-black uppercase cursor-pointer text-center outline-none transition-opacity py-[1px] px-[2px] min-w-0 max-w-full hover:opacity-95 leading-[1.15] whitespace-normal break-words [overflow-wrap:anywhere] tracking-[0.01em]"
                style={{
                  fontFamily: "'UTM Avo', 'Inter', sans-serif",
                  fontWeight: 900,
                  fontSize: titleFontSize,
                  lineHeight: 1.15,
                  overflowWrap: 'anywhere',
                }}
                title="Bấm để đổi ngành hàng cho bảng này"
              >
                <span className="inline-block min-w-0 max-w-full leading-[1.15] whitespace-normal break-words [overflow-wrap:anywhere]">
                  {titlePrefix && (
                    <span
                      className="text-white"
                      style={{
                        textShadow: '0 3px 6px rgba(4, 24, 68, 0.52)',
                      }}
                    >
                      {titlePrefix}
                    </span>
                  )}
                  <span
                    style={{
                      color: '#FFD83D',
                      textShadow: '0 3px 6px rgba(4, 24, 68, 0.55)',
                    }}
                  >
                    {titleMain}
                  </span>
                </span>
              </button>
            </div>

            {/* Dòng thông tin lũy kế (Đã ẩn theo yêu cầu) */}
            <div
              className="cat-status-pill hidden mt-[6px] min-[768px]:mt-[8px] items-center justify-center gap-[5px] min-[768px]:gap-[6px] px-[12px] py-[3.5px] min-[768px]:px-[20px] min-[768px]:py-[5px] rounded-full text-white text-[10.5px] min-[768px]:text-[13.5px] font-bold tracking-wide whitespace-nowrap max-w-full"
              style={{
                background: 'linear-gradient(90deg, rgba(4, 38, 102, 0.62) 0%, rgba(6, 52, 132, 0.52) 50%, rgba(4, 38, 102, 0.62) 100%)',
                border: '1px solid rgba(110, 205, 255, 0.62)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 6px rgba(4, 24, 68, 0.22)',
              }}
            >
              <svg className="w-[12px] h-[12px] min-[768px]:w-[15px] min-[768px]:h-[15px] shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M9.2 1.5L3.2 9H8L6.8 14.5L12.8 7H8L9.2 1.5Z" fill="#FFD83D" stroke="#F59E0B" strokeWidth="0.6" strokeLinejoin="round" />
              </svg>
              <span>
                Lũy kế đến ngày: <strong className="font-black">{yesterdayDate}</strong>
                <span className="mx-[6px] opacity-70">|</span>
                Đạt: <strong className="font-black">{reachedCount}/{totalStaff} ({reachedPercentStr}%)</strong>
              </span>
            </div>
          </div>

          {/* Hình chiếc cúp bên phải */}
          <div className="cat-trophy-wrap absolute right-[5px] min-[390px]:right-[7px] min-[768px]:right-[16px] top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
            <HeaderTrophyIllustration />
          </div>
        </div>

        {/* Switch Category Popover with Search (Đặt ngoài overflow-hidden của banner để không bị cắt) */}
        {isSwitcherOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 cursor-default" 
              onClick={(e) => {
                e.stopPropagation();
                setIsSwitcherOpen(false);
                setSwitcherSearchTerm('');
              }} 
            />
            <div 
              className="absolute z-50 top-full mt-[6px] left-1/2 -translate-x-1/2 w-[270px] min-[768px]:w-[300px] max-w-[calc(100vw-28px)] bg-white rounded-[14px] shadow-2xl border-2 border-[#075BCE] p-[8px] flex flex-col gap-[6px] export-btn no-capture text-left text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-[8px] py-[2px] text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-[4px] flex items-center justify-between">
                <span>CHỌN NGÀNH HÀNG</span>
                <span className="text-[#075BCE] font-black">
                  {filteredSwitcherCategories.length}/{dropdownCategories.length} MỤC
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                <input
                  type="text"
                  value={switcherSearchTerm}
                  onChange={(e) => setSwitcherSearchTerm(e.target.value)}
                  placeholder="Gõ tìm ngành hàng..."
                  autoFocus
                  className="w-full pl-[30px] pr-[26px] py-[6px] text-[12px] bg-slate-50 border border-slate-200 rounded-[8px] focus:outline-none focus:border-[#075BCE] focus:bg-white font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 uppercase tracking-tight"
                  onClick={(e) => e.stopPropagation()}
                />
                {switcherSearchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwitcherSearchTerm('');
                    }}
                    className="absolute right-[8px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-[2px] rounded-full cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filtered category list */}
              <div className="overflow-y-auto max-h-[220px] flex flex-col gap-[2px] pr-[2px]">
                {filteredSwitcherCategories.map(nh => {
                  const isCurrent = nh === catName;
                  return (
                    <button
                      key={nh}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (nh !== catName) {
                          onSwitchCategory(catName, nh);
                        }
                        setIsSwitcherOpen(false);
                        setSwitcherSearchTerm('');
                      }}
                      className={cn(
                        "px-[10px] py-[6px] text-[12px] font-black uppercase tracking-wide text-left transition-colors flex items-center justify-between cursor-pointer rounded-[8px]",
                        isCurrent ? "bg-blue-50 text-[#075BCE]" : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <span className="truncate pr-[8px]">{nh}</span>
                      {isCurrent && <Check size={13} className="text-[#075BCE] shrink-0 stroke-[3]" />}
                    </button>
                  );
                })}
                {filteredSwitcherCategories.length === 0 && (
                  <div className="py-[12px] text-center text-[12px] font-bold text-slate-400">
                    Không tìm thấy ngành hàng
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3–8. BẢNG XẾP HẠNG NHÂN VIÊN (Responsive Mobile & Desktop: đầy đủ tên NV, cuộn dọc/ngang mượt, cố định STT & Nhân viên khi cuộn ngang) */}
      <div
        className="cat-table-wrap overflow-x-auto overflow-y-auto max-[767px]:max-h-[calc(100dvh-210px)] min-[768px]:overflow-hidden min-[768px]:max-h-none w-full max-w-full min-w-0 box-border grow rounded-[14px] min-[768px]:rounded-[18px] border border-[#B8D4F8] bg-white [-webkit-overflow-scrolling:touch]"
      >
        <table
          className="cat-ranking-table w-full min-w-[356px] min-[768px]:min-w-0 max-w-full border-separate border-spacing-0 table-fixed bg-white no-mobile-zoom"
          style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}
        >
          <colgroup>
            <col className="w-[38px] min-[390px]:w-[42px] min-[768px]:w-[12%]" />
            <col className="w-[37%] min-[768px]:w-[30%]" />
            <col className="w-[12.5%] min-[768px]:w-[12%]" />
            <col className="w-[12.5%] min-[768px]:w-[12%]" />
            <col className="w-[14.5%] min-[768px]:w-[20%]" />
            <col className="w-[13%] min-[768px]:w-[14%]" />
          </colgroup>
          <thead>
            <tr
              className="text-white font-black text-[9.5px] min-[375px]:text-[10px] min-[768px]:text-[13.5px] uppercase tracking-tighter min-[768px]:tracking-tight h-[40px] min-[768px]:h-[62px]"
              style={{
                background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                boxShadow: 'inset 0 1px 0 rgba(147, 197, 253, 0.35)',
              }}
            >
              <th
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                }}
                className="sticky top-0 left-0 z-30 min-[768px]:static px-[2px] min-[768px]:px-[4px] py-0 text-center text-white border-r border-b border-[#3B82F6]/50 whitespace-nowrap overflow-hidden align-middle box-border"
              >
                <div className="inline-flex items-center justify-center gap-[2px] min-[768px]:gap-[6px] max-w-full">
                  <Trophy className="w-[9.5px] h-[9.5px] min-[390px]:w-[10.5px] min-[390px]:h-[10.5px] min-[768px]:w-[18px] min-[768px]:h-[18px] text-[#E0F2FE] shrink-0 stroke-[2.2]" />
                  <span>STT</span>
                </div>
              </th>
              <th
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                }}
                className="sticky top-0 left-[38px] min-[390px]:left-[42px] z-30 min-[768px]:static px-[5px] min-[390px]:px-[6px] min-[768px]:px-[12px] py-0 text-left text-white border-r border-b border-[#3B82F6]/50 whitespace-nowrap overflow-hidden align-middle box-border"
              >
                <div className="inline-flex items-center justify-start gap-[3px] min-[768px]:gap-[7px] max-w-full">
                  <UserRound className="w-[10.5px] h-[10.5px] min-[390px]:w-[11.5px] min-[390px]:h-[11.5px] min-[768px]:w-[18px] min-[768px]:h-[18px] text-[#E0F2FE] shrink-0 stroke-[2.3]" />
                  <span>NHÂN VIÊN</span>
                </div>
              </th>
              <th
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                }}
                className="sticky top-0 z-20 min-[768px]:static px-[1.5px] min-[768px]:px-[4px] py-0 text-center text-white border-r border-b border-[#3B82F6]/50 whitespace-nowrap overflow-hidden align-middle box-border"
              >
                <div className="inline-flex items-center justify-center gap-[1.5px] min-[768px]:gap-[6px] max-w-full">
                  <Target className="hidden min-[768px]:inline-block w-[18px] h-[18px] text-[#E0F2FE] shrink-0 stroke-[2.2]" />
                  <span>TARGET</span>
                </div>
              </th>
              <th
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                }}
                className="sticky top-0 z-20 min-[768px]:static px-[1.5px] min-[768px]:px-[4px] py-0 text-center text-white border-r border-b border-[#3B82F6]/50 whitespace-nowrap overflow-hidden align-middle box-border"
              >
                <div className="inline-flex items-center justify-center gap-[1.5px] min-[768px]:gap-[6px] max-w-full">
                  <ChartNoAxesColumn className="hidden min-[768px]:inline-block w-[18px] h-[18px] text-[#E0F2FE] shrink-0 stroke-[2.5]" />
                  <span>LŨY KẾ</span>
                </div>
              </th>
              <th
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                }}
                className="sticky top-0 z-20 min-[768px]:static px-[2px] min-[768px]:px-[6px] py-0 text-center text-white border-r border-b border-[#3B82F6]/50 whitespace-nowrap overflow-hidden align-middle box-border"
              >
                <div className="inline-flex items-center justify-center gap-[2px] min-[768px]:gap-[6px] max-w-full">
                  <Trophy className="hidden min-[768px]:inline-block w-[18px] h-[18px] text-[#E0F2FE] shrink-0 stroke-[2.2]" />
                  <span>%HT (ĐK)</span>
                </div>
              </th>
              <th
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(180deg, #0A4CB5 0%, #062A68 100%)',
                }}
                className="sticky top-0 z-20 min-[768px]:static px-[1.5px] min-[768px]:px-[4px] py-0 text-center text-white border-b border-[#3B82F6]/50 whitespace-nowrap overflow-hidden align-middle box-border"
              >
                <div className="inline-flex items-center justify-center gap-[1.5px] min-[768px]:gap-[6px] max-w-full">
                  <RefreshCw className="hidden min-[768px]:inline-block w-[17px] h-[17px] text-[#E0F2FE] shrink-0 stroke-[2.3]" />
                  <span>C.LẠI</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rowData.map((row, index) => {
              const percent = Number(row.projectedRate) || 0;
              const roundedRate = Math.round(percent);
              const progressWidth = Math.min(Math.max(percent, 0), 100);
              const isZeroRow = roundedRate <= 0;
              const isEven = index % 2 === 0;
              const diff = row.accumulated - row.target;
              const cellBorderColor = isZeroRow ? 'border-[#FECDD3]/80' : 'border-[#D8EAFC]';
              const rowBgColor = isZeroRow ? '#FFF2F4' : isEven ? '#FFFFFF' : '#F2F8FF';

              return (
                <tr
                  key={row.staffName}
                  className={cn(
                    "transition-colors duration-150 min-h-[42px] h-auto min-[768px]:h-[52px]",
                    isZeroRow
                      ? "hover:bg-[#FFE8ED]"
                      : isEven
                        ? "bg-white hover:bg-[#EAF4FF]"
                        : "bg-[#F2F8FF] hover:bg-[#EAF4FF]"
                  )}
                  style={isZeroRow ? { backgroundColor: '#FFF2F4' } : undefined}
                >
                  {/* Cột 1: STT (Huy chương Top 3 hoặc Badge số) */}
                  <td
                    style={{ fontWeight: 900, backgroundColor: rowBgColor }}
                    className={cn(
                      "sticky left-0 z-10 min-[768px]:static px-[2px] min-[768px]:px-[4px] py-[4px] min-[768px]:py-[2px] text-center border-r border-b whitespace-nowrap overflow-hidden align-middle box-border",
                      cellBorderColor
                    )}
                  >
                    <RankBadge rank={index + 1} isZeroRow={isZeroRow} />
                  </td>

                  {/* Cột 2: NHÂN VIÊN (Hiển thị đầy đủ mã NV + họ tên, tự động xuống dòng khi tên dài, không cắt ...) */}
                  <td
                    style={{ fontWeight: 900, backgroundColor: rowBgColor }}
                    className={cn(
                      "sticky left-[38px] min-[390px]:left-[42px] z-10 min-[768px]:static px-[5px] min-[390px]:px-[6px] min-[768px]:px-[12px] py-[5px] min-[768px]:py-[4px] border-r border-b text-left align-middle box-border",
                      cellBorderColor
                    )}
                  >
                    <span
                      title={row.staffName}
                      className={cn(
                        "cat-staff-name font-black uppercase tracking-tight text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[14px] leading-[1.28] whitespace-normal break-words block min-w-0 max-w-full",
                        isZeroRow ? "text-[#D91B38]" : "text-[#101B35]"
                      )}
                    >
                      {row.staffName}
                    </span>
                  </td>

                  {/* Cột 3: TARGET */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "cat-num-cell px-[2px] min-[768px]:px-[4px] py-[4px] min-[768px]:py-[2px] text-center border-r border-b font-black text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[15px] text-[#062A68] whitespace-nowrap overflow-hidden tabular-nums align-middle box-border",
                      cellBorderColor
                    )}
                  >
                    {row.target.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>

                  {/* Cột 4: LŨY KẾ */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "cat-num-cell px-[2px] min-[768px]:px-[4px] py-[4px] min-[768px]:py-[2px] text-center border-r border-b font-black text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[15px] text-[#D91B38] whitespace-nowrap overflow-hidden tabular-nums align-middle box-border",
                      cellBorderColor
                    )}
                  >
                    {row.accumulated.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>

                  {/* Cột 5: %HT (ĐK) — Số % + Thanh tiến độ chuẩn progressWidth = Math.min(Math.max(percent, 0), 100) */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "px-[3.5px] min-[390px]:px-[5px] min-[768px]:px-[10px] py-[4px] min-[768px]:py-[3px] border-r border-b whitespace-nowrap overflow-hidden align-middle box-border",
                      cellBorderColor
                    )}
                  >
                    <div className="flex flex-col items-start justify-center w-full min-w-0 max-w-full gap-[2.5px] min-[768px]:gap-[3px]">
                      <span
                        className="cat-ht-text font-black text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[13.5px] leading-none tabular-nums"
                        style={{
                          color: roundedRate >= 100 ? '#087443' : '#D91B38',
                        }}
                      >
                        {roundedRate}%
                      </span>
                      <div
                        className="cat-progress-track w-full max-w-full h-[8px] min-[768px]:h-[14px] rounded-full overflow-hidden relative flex items-center"
                        style={{
                          backgroundColor:
                            roundedRate >= 100
                              ? '#DCFCE7'
                              : isZeroRow
                                ? '#F8E5E9'
                                : '#FFE4E8',
                          border:
                            roundedRate >= 100
                              ? '1px solid #BBF7D0'
                              : '1px solid #FECDD3',
                          boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.06)',
                        }}
                      >
                        {isZeroRow ? (
                          <div
                            className="h-full rounded-full shrink-0"
                            style={{
                              width: '6px',
                              background: 'linear-gradient(180deg, #FB7185 0%, #E11D48 100%)',
                            }}
                          />
                        ) : (
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progressWidth}%`,
                              background:
                                roundedRate >= 100
                                  ? 'linear-gradient(90deg, #059669 0%, #00C875 55%, #34D399 100%)'
                                  : 'linear-gradient(90deg, #DC2626 0%, #FF304F 60%, #FB7185 100%)',
                              boxShadow:
                                roundedRate >= 100
                                  ? 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 1px 3px rgba(0, 200, 117, 0.25)'
                                  : 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 1px 3px rgba(255, 48, 79, 0.25)',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cột 6: C.LẠI */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "px-[2px] min-[768px]:px-[4px] py-[4px] min-[768px]:py-[2px] text-center border-b whitespace-nowrap overflow-hidden align-middle box-border",
                      cellBorderColor
                    )}
                  >
                    {diff < -0.0001 ? (
                      <span
                        className="cat-conlai-badge inline-flex items-center justify-center px-[4px] min-[390px]:px-[5.5px] min-[768px]:px-[11px] py-[3px] min-[768px]:py-[5px] max-w-full rounded-[7px] min-[768px]:rounded-[11px] font-black text-[9.5px] min-[390px]:text-[10.5px] min-[768px]:text-[13.5px] leading-none tabular-nums"
                        style={{
                          backgroundColor: '#FFE4E8',
                          border: '1px solid #FECDD3',
                          color: '#D91B38',
                        }}
                      >
                        {diff.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rowData.length > 0 && (
            <tfoot>
              <tr
                className="h-[46px] min-[768px]:h-[76px] text-white"
                style={{
                  background: 'linear-gradient(90deg, #041E4E 0%, #073B8C 50%, #05265E 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(96, 165, 250, 0.35)',
                }}
              >
                {/* Cột 1: Icon Sigma (∑) */}
                <td
                  style={{ fontWeight: 900, backgroundColor: '#052358' }}
                  className="sticky left-0 z-10 min-[768px]:static px-[2px] min-[768px]:px-[4px] py-0 text-center border-r border-[#1E5BB8]/65 align-middle box-border"
                >
                  <span
                    className="cat-tfoot-sigma inline-flex items-center justify-center w-[26px] h-[24px] min-[390px]:w-[28px] min-[390px]:h-[26px] min-[768px]:w-[40px] min-[768px]:h-[36px] rounded-[7px] min-[768px]:rounded-[11px] text-white font-black text-[12px] min-[768px]:text-[17px] leading-none mx-auto"
                    style={{
                      backgroundColor: 'rgba(30, 91, 184, 0.58)',
                      border: '1px solid rgba(96, 165, 250, 0.5)',
                    }}
                  >
                    &Sigma;
                  </span>
                </td>

                {/* Cột 2: TỔNG */}
                <td
                  style={{ fontWeight: 900, backgroundColor: '#063175' }}
                  className="cat-tfoot-label sticky left-[38px] min-[390px]:left-[42px] z-10 min-[768px]:static px-[4px] min-[768px]:px-[8px] py-0 text-center border-r border-[#1E5BB8]/65 font-black text-[11.5px] min-[390px]:text-[12.5px] min-[768px]:text-[18px] text-white uppercase tracking-wider whitespace-nowrap overflow-hidden align-middle box-border"
                >
                  TỔNG
                </td>

                {/* Cột 3: Tổng TARGET */}
                <td
                  style={{ fontWeight: 900 }}
                  className="cat-tfoot-num px-[2px] min-[768px]:px-[4px] py-0 text-center border-r border-[#1E5BB8]/65 text-white font-black text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[16.5px] whitespace-nowrap overflow-hidden tabular-nums align-middle box-border"
                >
                  {totTarget.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>

                {/* Cột 4: Tổng LŨY KẾ */}
                <td
                  style={{ fontWeight: 900 }}
                  className="cat-tfoot-num px-[2px] min-[768px]:px-[4px] py-0 text-center border-r border-[#1E5BB8]/65 text-white font-black text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[16.5px] whitespace-nowrap overflow-hidden tabular-nums align-middle box-border"
                >
                  {totAcc.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>

                {/* Cột 5: Tỷ lệ hoàn thành tổng */}
                <td
                  style={{ fontWeight: 900 }}
                  className="px-[2.5px] min-[768px]:px-[6px] py-0 text-center border-r border-[#1E5BB8]/65 whitespace-nowrap overflow-hidden align-middle box-border"
                >
                  <span
                    className="cat-tfoot-rate inline-flex items-center justify-center px-[6px] min-[390px]:px-[8px] min-[768px]:px-[18px] py-[3.5px] min-[768px]:py-[7px] max-w-full rounded-[7px] min-[768px]:rounded-[12px] text-white font-black text-[10.5px] min-[390px]:text-[11.5px] min-[768px]:text-[15.5px] leading-none tabular-nums"
                    style={{
                      background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                      border: '1px solid #34D399',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {totRate}%
                  </span>
                </td>

                {/* Cột 6: Tổng C.LẠI */}
                <td
                  style={{ fontWeight: 900 }}
                  className="px-[2px] min-[768px]:px-[4px] py-0 text-center text-white font-black whitespace-nowrap overflow-hidden align-middle box-border"
                >
                  {totDiff < -0.0001 ? (
                    <span
                      className="cat-tfoot-diff inline-flex items-center justify-center px-[4px] min-[390px]:px-[6px] min-[768px]:px-[13px] py-[3.5px] min-[768px]:py-[7px] max-w-full rounded-[7px] min-[768px]:rounded-[12px] text-white font-black text-[10px] min-[390px]:text-[11px] min-[768px]:text-[15px] leading-none tabular-nums"
                      style={{
                        background: 'linear-gradient(180deg, #FF3B5C 0%, #E11D48 100%)',
                        border: '1px solid #FB7185',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {totDiff.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                  ) : null}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
});
CategoryCard.displayName = 'CategoryCard';

interface CategoryDetailByStaffTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[];
  selectedStaffIds?: string[];
  luykeCategories?: CategoryData[];
  categoryConfig?: CategoryConfigItem[];
  activeStore?: string;
}

const areArraysEqual = (a: string[], b: string[]) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const CategoryDetailByStaffTable: React.FC<CategoryDetailByStaffTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  categoryTargets,
  selectedStaffIds = [],
  luykeCategories,
  categoryConfig,
  activeStore: propActiveStore
}) => {
  const { activeStore: luykeActiveStore } = useLuykeData();
  const targetStore = propActiveStore || luykeActiveStore || 'GLOBAL';
  const activeStore = targetStore;

  // 1. Memoized Staff Matrix & Categories parsing from text data
  const { results: allStaffMatrix, categories } = useMemo(() => {
    return parseStaffMatrixDataRefined(
      thiDuaNv,
      staffCount,
      categoryTargets,
      luykeCategories || [],
      daysPassed,
      totalDays,
      false,
      categoryConfig
    );
  }, [thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays, categoryConfig]);

  // 2. Memoized Dropdown Categories list: Lấy đúng 100% theo "TH Thi đua" (chỉ 40 ngành hàng, không ghép thừa từ luykeCategories)
  const rawDropdownCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    if (luykeCategories && luykeCategories.length > 0) {
      return luykeCategories.map((c: any) => c.name).filter((n: string) => Boolean(n));
    }
    return [];
  }, [categories, luykeCategories]);

  // Giữ tham chiếu ổn định để chống vòng lặp re-render nhấp nháy
  const dropdownCategoriesRef = useRef<string[]>([]);
  const dropdownCategories = useMemo(() => {
    if (areArraysEqual(dropdownCategoriesRef.current, rawDropdownCategories)) {
      return dropdownCategoriesRef.current;
    }
    dropdownCategoriesRef.current = rawDropdownCategories;
    return rawDropdownCategories;
  }, [rawDropdownCategories]);

  // Phân nhóm ngành hàng ICT, DỊCH VỤ, CE theo chuẩn TH Thi Đua
  const ictCategories = useMemo(
    () => dropdownCategories.filter(c => getCategoryGroupType(c, categoryConfig) === 'ICT'),
    [dropdownCategories, categoryConfig]
  );
  const dvCategories = useMemo(
    () => dropdownCategories.filter(c => getCategoryGroupType(c, categoryConfig) === 'DỊCH VỤ'),
    [dropdownCategories, categoryConfig]
  );
  const ceCategories = useMemo(
    () => dropdownCategories.filter(c => getCategoryGroupType(c, categoryConfig) === 'CE'),
    [dropdownCategories, categoryConfig]
  );

  // 3. Memoized Filtered Staff Matrix
  const staffMatrix = useMemo(() => {
    return selectedStaffIds.length > 0
      ? allStaffMatrix.filter(s => selectedStaffIds.includes(s.fullId))
      : allStaffMatrix;
  }, [allStaffMatrix, selectedStaffIds]);

  // Khởi tạo synchronous lazy state từ localStorage để frame đầu tiên KHÔNG BAO GIỜ bị rỗng (triệt tiêu chớp nháy)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    try {
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedVal = localStorage.getItem(savedKey);
      if (savedVal !== null) {
        const parsed = JSON.parse(savedVal);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedThiDuaKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedThiDuaVal = localStorage.getItem(savedThiDuaKey);
      if (savedThiDuaVal !== null) {
        const parsedThiDua = JSON.parse(savedThiDuaVal);
        if (Array.isArray(parsedThiDua) && parsedThiDua.length > 0) return parsedThiDua;
      }
    } catch (e) {
      console.error('Error reading initial detail categories:', e);
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [commentOpenCat, setCommentOpenCat] = useState<string | null>(null);
  const [catCommentText, setCatCommentText] = useState('');
  const [catCommentTemplate, setCatCommentTemplate] = useState<1 | 2 | 3>(1);
  const [copiedCatComment, setCopiedCatComment] = useState(false);
  const [commentRowData, setCommentRowData] = useState<CategoryRowData[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // 4. Precompute Category Data Map with O(1) Lookups & Fallback Search
  const allCategoryDataMap = useMemo(() => {
    const cleanCatToIdxMap = new Map<string, number>();
    categories.forEach((c, idx) => {
      cleanCatToIdxMap.set(cleanCategoryName(c), idx);
      cleanCatToIdxMap.set(c.trim().toLowerCase(), idx);
    });

    const cleanCatToLkTargetMap = new Map<string, number>();
    if (luykeCategories && luykeCategories.length > 0) {
      luykeCategories.forEach((c: any) => {
        if (c?.name) {
          cleanCatToLkTargetMap.set(cleanCategoryName(c.name), c.target || 0);
          cleanCatToLkTargetMap.set(c.name.trim().toLowerCase(), c.target || 0);
        }
      });
    }

    const cleanCatToMatchingTargetMap = new Map<string, number>();
    if (categoryTargets && categoryTargets.length > 0) {
      categoryTargets.forEach((t: any) => {
        if (t?.name && typeof t.adjustedTarget === 'number') {
          cleanCatToMatchingTargetMap.set(cleanCategoryName(t.name), t.adjustedTarget);
          cleanCatToMatchingTargetMap.set(t.name.trim().toLowerCase(), t.adjustedTarget);
        }
      });
    }

    const map = new Map<string, CategoryCardData>();
    for (const catName of dropdownCategories) {
      const cleanName = cleanCategoryName(catName);
      const lowerName = catName.trim().toLowerCase();

      // Find staff matrix index
      let catIdx = -1;
      if (cleanCatToIdxMap.has(cleanName)) {
        catIdx = cleanCatToIdxMap.get(cleanName)!;
      } else if (cleanCatToIdxMap.has(lowerName)) {
        catIdx = cleanCatToIdxMap.get(lowerName)!;
      } else {
        catIdx = categories.findIndex(c => {
          const cClean = cleanCategoryName(c);
          return isSameCategoryClean(cClean, cleanName);
        });
      }

      // Find target
      let baseTarget = 0;
      if (cleanCatToMatchingTargetMap.has(cleanName)) {
        baseTarget = cleanCatToMatchingTargetMap.get(cleanName)!;
      } else if (cleanCatToMatchingTargetMap.has(lowerName)) {
        baseTarget = cleanCatToMatchingTargetMap.get(lowerName)!;
      } else if (cleanCatToLkTargetMap.has(cleanName)) {
        baseTarget = cleanCatToLkTargetMap.get(cleanName)!;
      } else if (cleanCatToLkTargetMap.has(lowerName)) {
        baseTarget = cleanCatToLkTargetMap.get(lowerName)!;
      } else {
        const foundTarget = categoryTargets?.find((t: any) => {
          if (!t?.name) return false;
          const tClean = cleanCategoryName(t.name);
          return isSameCategoryClean(tClean, cleanName);
        });
        if (foundTarget && typeof foundTarget.adjustedTarget === 'number') {
          baseTarget = foundTarget.adjustedTarget;
        } else {
          const foundLk = luykeCategories?.find((c: any) => {
            if (!c?.name) return false;
            const lkClean = cleanCategoryName(c.name);
            return isSameCategoryClean(lkClean, cleanName);
          });
          if (foundLk?.target) {
            baseTarget = foundLk.target;
          }
        }
      }

      const targetPerStaff = staffCount > 0 ? baseTarget / staffCount : 0;

      const rowData: CategoryRowData[] = staffMatrix.map(staff => {
        const accumulated = catIdx >= 0
          ? (staff.rawValues[catIdx] ?? 0)
          : (staff.valuesMap?.[cleanName] ?? 0);
        const projectedRate = catIdx >= 0
          ? (staff.projectedRates[catIdx] ?? 0)
          : (targetPerStaff > 0 && daysPassed > 0 ? (((accumulated / daysPassed) * totalDays) / targetPerStaff) * 100 : (accumulated > 0 ? 100 : 0));
        return {
          staffName: staff.displayName,
          target: targetPerStaff,
          accumulated,
          projectedRate
        };
      }).sort((a, b) => (b.projectedRate - a.projectedRate) || a.staffName.localeCompare(b.staffName, 'vi'));

      const reachedCount = rowData.filter(row => Math.round(row.projectedRate) >= 100).length;
      const totalStaff = rowData.length;
      const totTarget = targetPerStaff * totalStaff;
      const totAcc = rowData.reduce((sum, r) => sum + r.accumulated, 0);
      const totRate = totTarget > 0 && daysPassed > 0
        ? Math.round((((totAcc / daysPassed) * totalDays) / totTarget) * 100)
        : 0;
      const totDiff = totAcc - totTarget;

      const cardData: CategoryCardData = {
        targetPerStaff,
        rowData,
        reachedCount,
        totalStaff,
        totTarget,
        totAcc,
        totRate,
        totDiff
      };

      // Đăng ký cả 3 dạng key để truy xuất O(1) không bao giờ bị lỡ
      map.set(catName, cardData);
      map.set(cleanName, cardData);
      map.set(lowerName, cardData);
    }

    return map;
  }, [categories, luykeCategories, categoryTargets, staffCount, staffMatrix, dropdownCategories, daysPassed, totalDays]);

  // Restore selection from localStorage (chuẩn theo bản backup, chạy đúng 1 lần khi dữ liệu sẵn sàng)
  React.useEffect(() => {
    if (dropdownCategories.length > 0 && !initializedRef.current) {
      // 1. Kiểm tra cache riêng của CT Ngành hàng
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedVal = localStorage.getItem(savedKey);
      if (savedVal !== null) {
        try {
          const parsed = JSON.parse(savedVal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validSaved = dropdownCategories.filter(cat => {
              const clean = cleanCategoryName(cat);
              return parsed.some((p: string) => p === cat || cleanCategoryName(p) === clean);
            });
            if (validSaved.length > 0) {
              setSelectedCategories(validSaved);
              initializedRef.current = true;
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Nếu chưa có cache, đọc từ cấu hình TH Thi Đua
      const savedThiDuaKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedThiDuaVal = localStorage.getItem(savedThiDuaKey);
      if (savedThiDuaVal !== null) {
        try {
          const parsedThiDua = JSON.parse(savedThiDuaVal);
          if (Array.isArray(parsedThiDua) && parsedThiDua.length > 0) {
            const validThiDua = dropdownCategories.filter(cat => {
              const clean = cleanCategoryName(cat);
              return parsedThiDua.some((p: string) => p === cat || cleanCategoryName(p) === clean);
            });
            if (validThiDua.length > 0) {
              setSelectedCategories(validThiDua);
              initializedRef.current = true;
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Mặc định chọn tất cả
      setSelectedCategories(dropdownCategories);
      initializedRef.current = true;
    }
  }, [dropdownCategories, activeStore]);

  // Debounced save to localStorage (chuẩn theo bản backup, triệt tiêu 100% tình trạng nhấp nháy dữ liệu)
  React.useEffect(() => {
    if (initializedRef.current && selectedCategories.length > 0) {
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(savedKey, JSON.stringify(selectedCategories));
        } catch (e) {
          console.error(e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCategories, activeStore]);

  const selectedCategoriesSet = useMemo(() => new Set(selectedCategories), [selectedCategories]);

  const filteredDropdownCategories = useMemo(() => {
    if (!searchTerm.trim()) return dropdownCategories;
    const lower = searchTerm.trim().toLowerCase();
    return dropdownCategories.filter(cat => cat.toLowerCase().includes(lower));
  }, [dropdownCategories, searchTerm]);

  // Đồng bộ danh sách hiển thị khớp 100% với các ngành hàng đang bật ở TH Thi Đua
  const handleSyncWithThiDua = useCallback(() => {
    const savedThiDuaKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
    const savedThiDuaVal = localStorage.getItem(savedThiDuaKey);
    if (savedThiDuaVal) {
      try {
        const parsed = JSON.parse(savedThiDuaVal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = dropdownCategories.filter(cat => {
            const clean = cleanCategoryName(cat);
            return parsed.some(p => p === cat || cleanCategoryName(p) === clean);
          });
          if (valid.length > 0) {
            setSelectedCategories(valid);
            return;
          }
        }
      } catch (e) {
        console.error('Error syncing with TH Thi Dua:', e);
      }
    }
    setSelectedCategories([...dropdownCategories]);
  }, [activeStore, dropdownCategories]);

  // Chọn nhanh theo nhóm ngành hàng
  const handleSelectGroup = useCallback((group: 'ALL' | 'ICT' | 'DỊCH VỤ' | 'CE' | 'THI_DUA') => {
    if (group === 'ALL') {
      setSelectedCategories([...dropdownCategories]);
    } else if (group === 'ICT') {
      setSelectedCategories([...ictCategories]);
    } else if (group === 'DỊCH VỤ') {
      setSelectedCategories([...dvCategories]);
    } else if (group === 'CE') {
      setSelectedCategories([...ceCategories]);
    } else if (group === 'THI_DUA') {
      handleSyncWithThiDua();
    }
  }, [dropdownCategories, ictCategories, dvCategories, ceCategories, handleSyncWithThiDua]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCategories(dropdownCategories);
  }, [dropdownCategories]);

  const handleDeselectAll = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const handleAddCard = useCallback(() => {
    setSelectedCategories(prev => {
      const unselected = dropdownCategories.filter(x => !prev.includes(x));
      if (unselected.length > 0) {
        return [...prev, unselected[0]];
      }
      return prev;
    });
  }, [dropdownCategories]);

  const handleRemoveCard = useCallback((catName: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== catName));
  }, []);

  const handleSwitchCategory = useCallback((oldCat: string, newCat: string) => {
    setSelectedCategories(prev => {
      const idx = prev.indexOf(oldCat);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = newCat;
        return next;
      }
      return [...prev, newCat];
    });
  }, []);

  const yesterdayDate = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  }, []);

  const captureElementHelper = useCallback(async (element: HTMLElement, customCount?: number) => {
    const isGridAll = element.id === 'all-categories-container';
    const count = typeof customCount === 'number' ? customCount : selectedCategories.length;
    const isMultiTable = isGridAll && count > 1;
    
    // Each table card has desktop width of 700px (inner table = 672px) to ensure full employee names, Top 3 medals, header icons, and progress bars fit cleanly
    const cardWidth = 700;
    const cardPadding = 14;
    const gap = 20;
    const framePadding = 32; // Viền trắng xung quanh to và đều 32px cả 4 phía

    // Bố cục linh hoạt: <= 4 bảng thì 2 trên 2 dưới, >= 5 bảng thì 3 trên 3 dưới
    const cols = !isMultiTable ? 1 : (count <= 4 ? 2 : 3);
    const exportInnerWidth = cols * cardWidth + (cols - 1) * gap;
    const totalExportWidth = exportInnerWidth + framePadding * 2;

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${totalExportWidth}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.zoom = '1';

    // Frame wrapper to ensure 100% equal left/right/top/bottom margins and generous white border
    const frameWrapper = document.createElement('div');
    frameWrapper.className = 'cat-export-mode';
    frameWrapper.style.width = `${totalExportWidth}px`;
    frameWrapper.style.minWidth = `${totalExportWidth}px`;
    frameWrapper.style.maxWidth = `${totalExportWidth}px`;
    frameWrapper.style.padding = `${framePadding}px`;
    frameWrapper.style.boxSizing = 'border-box';
    frameWrapper.style.backgroundColor = '#ffffff';
    frameWrapper.style.display = 'flex';
    frameWrapper.style.justifyContent = 'center';
    frameWrapper.style.alignItems = 'start';
    frameWrapper.style.margin = '0 auto';
    frameWrapper.style.boxShadow = 'none';
    frameWrapper.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";
    frameWrapper.style.zoom = '1';

    const clone = element.cloneNode(true) as HTMLElement;

    // Remove non-capture UI elements (buttons, popovers, textareas)
    const noCaptureElements = clone.querySelectorAll('.no-capture, .capture-btn, .export-btn, textarea');
    noCaptureElements.forEach(el => {
      el.remove();
    });

    // Clean filters and remove truncate so exported text is never cut off
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        htmlEl.style.filter = 'none';
      }
      if (htmlEl.classList) {
        htmlEl.classList.remove('truncate');
      }
    });

    // Inject desktop-locked export stylesheet so mobile & desktop exports produce identical 100% desktop visuals
    const exportStyleEl = document.createElement('style');
    exportStyleEl.textContent = `
      .cat-export-mode, .cat-export-mode * {
        font-family: 'UTM Avo', 'Inter', sans-serif !important;
        -webkit-text-size-adjust: 100% !important;
        zoom: 1 !important;
      }
      .cat-export-mode .cat-header-banner {
        padding: 16px 84px !important;
        border-radius: 22px !important;
      }
      .cat-export-mode .cat-title-btn {
        line-height: 1.15 !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
      }
      .cat-export-mode .cat-status-pill {
        display: none !important;
      }
      .cat-export-mode .cat-trophy-wrap {
        right: 16px !important;
      }
      .cat-export-mode .cat-trophy-svg {
        width: 78px !important;
        height: 78px !important;
      }
      .cat-export-mode .cat-rank-medal {
        width: 58px !important;
        height: 35px !important;
        border-radius: 11px !important;
      }
      .cat-export-mode .cat-rank-medal-svg {
        width: 52px !important;
        height: 32px !important;
      }
      .cat-export-mode .cat-rank-num {
        width: 42px !important;
        height: 30px !important;
        border-radius: 9px !important;
        font-size: 14.5px !important;
      }
      .cat-export-mode .cat-staff-name {
        font-size: 14px !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        overflow-wrap: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
      }
      .cat-export-mode th,
      .cat-export-mode td {
        position: static !important;
      }
      .cat-export-mode thead th svg {
        display: inline-block !important;
      }
      .cat-export-mode .cat-num-cell {
        font-size: 15px !important;
      }
      .cat-export-mode .cat-ht-text {
        font-size: 13.5px !important;
      }
      .cat-export-mode .cat-progress-track {
        height: 14px !important;
      }
      .cat-export-mode .cat-conlai-badge {
        font-size: 13.5px !important;
        padding: 5px 11px !important;
        border-radius: 11px !important;
      }
      .cat-export-mode .cat-tfoot-sigma {
        width: 40px !important;
        height: 36px !important;
        border-radius: 11px !important;
        font-size: 17px !important;
      }
      .cat-export-mode .cat-tfoot-label {
        font-size: 18px !important;
      }
      .cat-export-mode .cat-tfoot-num {
        font-size: 16.5px !important;
      }
      .cat-export-mode .cat-tfoot-rate {
        font-size: 15.5px !important;
        padding: 7px 18px !important;
        border-radius: 12px !important;
      }
      .cat-export-mode .cat-tfoot-diff {
        font-size: 15px !important;
        padding: 7px 13px !important;
        border-radius: 12px !important;
      }
    `;
    frameWrapper.appendChild(exportStyleEl);

    if (isMultiTable) {
      clone.style.width = `${exportInnerWidth}px`;
      clone.style.minWidth = `${exportInnerWidth}px`;
      clone.style.maxWidth = `${exportInnerWidth}px`;
      clone.style.display = 'grid';
      clone.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth}px)`;
      clone.style.gap = `${gap}px`;
      clone.style.alignItems = 'start';
      clone.style.justifyContent = 'center';
      clone.style.margin = '0 auto';
      clone.style.padding = '0px';

      const cards = clone.querySelectorAll('[id^="cat-detail-"]');
      cards.forEach(c => {
        const htmlCard = c as HTMLElement;
        htmlCard.style.width = `${cardWidth}px`;
        htmlCard.style.minWidth = `${cardWidth}px`;
        htmlCard.style.maxWidth = `${cardWidth}px`;
        htmlCard.style.boxSizing = 'border-box';
        htmlCard.style.padding = `${cardPadding}px`;
        htmlCard.style.borderRadius = '26px';
        htmlCard.style.border = '1.5px solid #C5E0FF';
        htmlCard.style.background = 'linear-gradient(180deg, #F4F9FF 0%, #FFFFFF 100%)';
        htmlCard.style.margin = '0';
      });
    } else {
      // Single card export: clone IS the card itself
      clone.style.width = `${cardWidth}px`;
      clone.style.minWidth = `${cardWidth}px`;
      clone.style.maxWidth = `${cardWidth}px`;
      clone.style.display = 'block';
      clone.style.margin = '0 auto';
      clone.style.padding = `${cardPadding}px`;
      clone.style.boxSizing = 'border-box';
      clone.style.background = 'linear-gradient(180deg, #F4F9FF 0%, #FFFFFF 100%)';
      clone.style.border = '1.5px solid #C5E0FF';
      clone.style.borderRadius = '26px';
    }
    clone.style.height = 'auto';
    clone.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";

    // Make sure table scroll wrappers in the clone are visible and stretch 100%
    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .cat-table-wrap');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'hidden';
      htmlEl.style.width = '100%';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      htmlEl.style.boxSizing = 'border-box';
      htmlEl.style.borderRadius = '18px';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto');
    });

    // Enforce EXACT table layout, colgroups, row heights, and font sizes for cross-browser identical output
    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.maxWidth = '100%';
      htmlTable.style.tableLayout = 'fixed';
      htmlTable.style.boxSizing = 'border-box';
      htmlTable.style.fontSize = '14px';
      htmlTable.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";
      htmlTable.style.fontWeight = '900';

      // Enforce colgroup cols (Sum = 672px)
      const colEls = htmlTable.querySelectorAll('colgroup col');
      if (colEls.length >= 6) {
        (colEls[0] as HTMLElement).style.width = '70px';
        (colEls[1] as HTMLElement).style.width = '232px';
        (colEls[2] as HTMLElement).style.width = '81px';
        (colEls[3] as HTMLElement).style.width = '81px';
        (colEls[4] as HTMLElement).style.width = '128px';
        (colEls[5] as HTMLElement).style.width = '80px';
      }

      const theadTrs = htmlTable.querySelectorAll('thead tr');
      theadTrs.forEach(tr => {
        const htmlTr = tr as HTMLElement;
        htmlTr.style.height = '62px';
        htmlTr.style.minHeight = '62px';
        htmlTr.style.fontSize = '13.5px';
        htmlTr.style.boxSizing = 'border-box';
      });
      const theadSvgs = htmlTable.querySelectorAll('thead th svg');
      theadSvgs.forEach(svg => {
        const svgEl = svg as SVGElement;
        svgEl.style.display = 'inline-block';
        svgEl.style.width = '18px';
        svgEl.style.height = '18px';
      });

      const tbodyTrs = htmlTable.querySelectorAll('tbody tr');
      tbodyTrs.forEach(tr => {
        const htmlTr = tr as HTMLElement;
        htmlTr.style.height = 'auto';
        htmlTr.style.minHeight = '52px';
        htmlTr.style.boxSizing = 'border-box';
      });

      const tfootTrs = htmlTable.querySelectorAll('tfoot tr');
      tfootTrs.forEach(tr => {
        const htmlTr = tr as HTMLElement;
        htmlTr.style.height = '76px';
        htmlTr.style.minHeight = '76px';
        htmlTr.style.boxSizing = 'border-box';
      });
    });

    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      await ensureFontsReady();
      const fontCss = await preloadFontDataCache();
      await injectFontStyleIntoClone(frameWrapper);
      await new Promise(r => setTimeout(r, 120));

      const finalCaptureWidth = totalExportWidth;
      const finalCaptureHeight = Math.ceil(Math.max(frameWrapper.scrollHeight, frameWrapper.offsetHeight));

      const dataUrl = await htmlToImage.toPng(frameWrapper, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: finalCaptureWidth,
        height: finalCaptureHeight,
        cacheBust: true,
        skipFonts: false,
        ...(fontCss ? { fontEmbedCSS: fontCss } : {}),
        style: {
          ...EXPORT_FONT_STYLE,
          width: `${finalCaptureWidth}px`,
          height: `${finalCaptureHeight}px`,
          zoom: '1',
          transform: 'none',
        }
      });
      return dataUrl;
    } finally {
      document.body.removeChild(tempContainer);
    }
  }, [selectedCategories.length]);

  const handleExport = useCallback(async (catName: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      try {
        const dataUrl = await captureElementHelper(element, 1);
        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Export category failed:', err);
      }
    }
  }, [captureElementHelper]);

  const handleExportAll = useCallback(async () => {
    if (selectedCategories.length === 0) return;
    setIsCapturingAll(true);
    try {
      const element = document.getElementById('all-categories-container');
      if (element) {
        const dataUrl = await captureElementHelper(element, selectedCategories.length);
        setPreviewImage(dataUrl);
      }
    } catch (err) {
      console.error('Export all failed:', err);
    } finally {
      setIsCapturingAll(false);
    }
  }, [selectedCategories.length, captureElementHelper]);

  const handleDownloadAllZip = useCallback(async () => {
    if (selectedCategories.length === 0) return;
    setIsCapturingAll(true);
    try {
      const zip = new JSZip();
      for (const catName of selectedCategories) {
        const elementId = `cat-detail-${catName.replace(/\s+/g, '-')}`;
        const element = document.getElementById(elementId);
        if (element) {
          const dataUrl = await captureElementHelper(element, 1);
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          zip.file(`${catName.replace(/[/\\?%*:|"<>]/g, '-')}.png`, base64Data, { base64: true });
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Bang_Chi_Tiet_Nganh_Hang_${yesterdayDate}.zip`);
    } catch (err) {
      console.error('Download all zip failed:', err);
    } finally {
      setIsCapturingAll(false);
    }
  }, [selectedCategories, captureElementHelper, yesterdayDate]);

  const generateCatComment = useCallback((catName: string, rowData: CategoryRowData[], template: 1 | 2 | 3 = 1) => {
    if (rowData.length === 0) return '';
    const getStaffId = (s: any) => {
      const parts = s.staffName.split('-');
      if (parts.length > 1) {
        const potentialId = parts.find((p: string) => /\d{4,}/.test(p));
        if (potentialId) {
          const match = potentialId.match(/\d{4,}/);
          if (match) return match[0];
        }
      }
      const fallbackMatch = s.staffName.match(/\d{4,}/);
      return fallbackMatch ? fallbackMatch[0] : '';
    };

    let text = '';
    const total = rowData.length;
    const count20 = Math.max(1, Math.round(total * 0.2));

    if (template === 1) {
      // MẪU 1: TOP/BOT NV
      const sorted = [...rowData].sort((a, b) => (b.projectedRate || 0) - (a.projectedRate || 0));
      const top = sorted.slice(0, count20);
      const bot = sorted.slice(Math.max(count20, total - count20));
      text = `📊 ${catName.toUpperCase()}\n━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🏆 TOP ${count20} DẪN ĐẦU:\n`;
      top.forEach((s, i) => {
        const id = getStaffId(s);
        if (id) text += `🔺 #${i + 1}. @${id}\n`;
      });
      text += `\n⚠️ BOTTOM ${count20} CẦN TĂNG TỐC:\n`;
      bot.forEach((s, i) => {
        const id = getStaffId(s);
        if (id) text += `🔻 #${total - bot.length + i + 1}. @${id}\n`;
      });
      text += `\n💪 Hãy cố gắng bứt phá! 🔥`;
    } else if (template === 2) {
      // MẪU 2: DS cần tăng tốc (dưới 100%)
      const botStaffs = rowData.filter(s => s.projectedRate < 100);
      text = `🚨 NHÂN VIÊN CÓ ${catName.toUpperCase()} DƯỚI 100%:\n`;
      text += `📊 Tổng: ${botStaffs.length}/${total}\n\n`;
      botStaffs.forEach((s, i) => {
        const id = getStaffId(s);
        if (id) text += `🔻 #${i + 1}. @${id}\n`;
      });
      text += `\n💡 Cần hỗ trợ các NV trên đẩy mạnh bán hàng!`;
    } else {
      // MẪU 3: Tóm tắt toàn bộ
      const sorted = [...rowData].sort((a, b) => (b.projectedRate || 0) - (a.projectedRate || 0));
      text = `📝 TÓM TẮT ${catName.toUpperCase()}:\n━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🎯 Tổng NV: ${total}\n`;
      text += `✅ ĐẠT (≥100%): ${rowData.filter(s => s.projectedRate >= 100).length}/${total}\n`;
      text += `❌ Chưa đạt (<100%): ${rowData.filter(s => s.projectedRate < 100).length}/${total}\n\n`;
      text += `📊 BẢNG XẾP HẠNG:\n`;
      sorted.forEach((s, i) => {
        const id = getStaffId(s);
        const icon = s.projectedRate >= 100 ? '✅' : '🔴';
        if (id) text += `${icon} #${i + 1}. @${id}\n`;
      });
    }

    setCatCommentText(text);
    setCatCommentTemplate(template);
    setCopiedCatComment(false);
    return text;
  }, []);

  const handleOpenComment = useCallback((catName: string, rowData: CategoryRowData[]) => {
    setCommentRowData(rowData);
    generateCatComment(catName, rowData, catCommentTemplate);
    setCommentOpenCat(catName);
  }, [catCommentTemplate, generateCatComment]);

  if (dropdownCategories.length === 0 && categories.length === 0) {
    return (
      <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center p-8 bg-white border border-slate-200 text-slate-400">
        <Layers size={36} className="mb-2 text-slate-300 animate-pulse" />
        <p className="font-bold text-sm text-slate-600">Đang chuẩn bị dữ liệu ngành hàng...</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 mt-3 sm:mt-8 pb-[84px] min-[768px]:pb-2 flex flex-col gap-3.5 sm:gap-5 w-full max-w-full min-w-0 box-border" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      {/* Sleek Top Action Bar (Chuẩn TNB LEADER - NHÓM HÀNG) */}
      <div className="w-full max-w-full min-w-0 box-border bg-white px-2.5 sm:px-6 py-2.5 sm:py-3.5 rounded-none shadow-xs border border-slate-300 flex flex-wrap items-center justify-between gap-2 sm:gap-3 relative z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12.5px] sm:text-[17px] font-black text-slate-800 uppercase tracking-wide truncate">
            ĐANG HIỂN THỊ: <span className="text-[#0369a1] font-extrabold">{selectedCategories.length}/{dropdownCategories.length} BẢNG</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0 max-w-full" ref={dropdownRef}>
          {/* Nút Đồng Bộ Theo TH Thi Đua */}
          <button
            type="button"
            onClick={handleSyncWithThiDua}
            title="Đồng bộ danh sách ngành hàng hiển thị khớp 100% với TH Thi Đua"
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-[13.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:border-sky-400"
          >
            <RotateCcw size={13} className="stroke-[2.5] text-sky-600 shrink-0" />
            <span className="hidden xs:inline">ĐỒNG BỘ</span>
            <span>TH THI ĐUA</span>
          </button>

          {/* 🔍 BỘ LỌC NGÀNH HÀNG Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "px-2.5 sm:px-4.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-[14.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5 sm:gap-2 active:scale-95 border",
                isDropdownOpen
                  ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                  : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
              )}
            >
              <Search size={14} className="text-emerald-700 stroke-[2.5] shrink-0" />
              <span>BỘ LỌC NGÀNH HÀNG</span>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 sm:px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11.5px] font-black">{selectedCategories.length}</span>
              <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200 shrink-0", isDropdownOpen && "rotate-180")} />
            </button>

            {/* Master Category Popover Dropdown */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 z-50 flex flex-col gap-2.5 max-h-[490px] animate-in fade-in zoom-in-95 duration-150">
                  {/* Search box */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm nhanh ngành hàng..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold uppercase"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Nhóm lọc nhanh: TẤT CẢ, ICT, DỊCH VỤ, CE, THEO THI ĐUA */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1.5 border-b border-slate-100 text-[10px] sm:text-[11px] font-black uppercase">
                    <button
                      type="button"
                      onClick={() => handleSelectGroup('ALL')}
                      className={cn(
                        "px-2 py-1 rounded-lg uppercase tracking-wide border transition-all cursor-pointer",
                        selectedCategories.length === dropdownCategories.length
                          ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      )}
                    >
                      TẤT CẢ ({dropdownCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGroup('ICT')}
                      className="px-2 py-1 rounded-lg uppercase tracking-wide border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-all cursor-pointer shadow-xs"
                    >
                      ICT ({ictCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGroup('DỊCH VỤ')}
                      className="px-2 py-1 rounded-lg uppercase tracking-wide border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
                    >
                      DỊCH VỤ ({dvCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGroup('CE')}
                      className="px-2 py-1 rounded-lg uppercase tracking-wide border border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 transition-all cursor-pointer shadow-xs"
                    >
                      CE ({ceCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGroup('THI_DUA')}
                      title="Lọc các ngành hàng đang bật ở TH Thi Đua"
                      className="px-2 py-1 rounded-lg uppercase tracking-wide border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <RotateCcw size={10} className="stroke-[2.5]" />
                      <span>THEO THI ĐUA</span>
                    </button>
                  </div>

                  {/* Quick actions: CHỌN TẤT CẢ, BỎ CHỌN */}
                  <div className="flex items-center justify-between px-1.5 py-0.5 text-[11px] font-black uppercase">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-emerald-700 hover:underline cursor-pointer font-bold"
                    >
                      CHỌN TẤT CẢ ({dropdownCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-rose-600 hover:underline cursor-pointer font-black"
                    >
                      BỎ CHỌN HẾT
                    </button>
                  </div>

                  {/* Category Checklist */}
                  <div className="overflow-y-auto flex flex-col gap-1 max-h-64 pr-1">
                    {filteredDropdownCategories.map((cat) => {
                      const isSelected = selectedCategoriesSet.has(cat);
                      const grp = getCategoryGroupType(cat, categoryConfig);
                      const badgeCls = grp === 'ICT'
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                        : (grp === 'DỊCH VỤ' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' : 'bg-sky-50 text-sky-800 border-sky-200/80');
                      return (
                        <label
                          key={cat}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 text-[12px] sm:text-[12.5px] font-bold rounded-xl cursor-pointer transition-colors select-none text-left border",
                            isSelected 
                              ? "bg-emerald-50/70 border-emerald-200/60 text-emerald-900 shadow-2xs" 
                              : "bg-white hover:bg-slate-50 border-transparent text-slate-700"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCategory(cat)}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2.5 truncate pr-2 min-w-0">
                            <div className={cn(
                              "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                              isSelected
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <Check size={11} className="stroke-[3px]" />}
                            </div>
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border shrink-0", badgeCls)}>
                              {grp === 'DỊCH VỤ' ? 'DV' : grp}
                            </span>
                            <span className="truncate uppercase text-[11px] sm:text-[12px] font-black">{cat}</span>
                          </div>
                        </label>
                      );
                    })}
                    {filteredDropdownCategories.length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-4 font-bold">Không tìm thấy ngành hàng phù hợp</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* + THÊM BẢNG Button */}
          {selectedCategories.length < dropdownCategories.length && (
            <button
              onClick={handleAddCard}
              className="px-2.5 sm:px-4.5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[11px] sm:text-[14.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1 sm:gap-1.5 active:scale-95"
            >
              <Plus size={14} strokeWidth={2.5} className="shrink-0" />
              <span>+ THÊM BẢNG</span>
            </button>
          )}

          {/* XUẤT LƯỚI BẢNG Button */}
          {selectedCategories.length > 0 && (
            <button
              onClick={handleExportAll}
              disabled={isCapturingAll}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-[14.5px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95",
                isCapturingAll
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              )}
            >
              <Camera size={14} className="shrink-0" />
              <span>{isCapturingAll ? "ĐANG XUẤT..." : "XUẤT LƯỚI BẢNG"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tables Grid Section: Mobile portrait = 1 bảng/dòng (minmax(0,1fr)), Desktop/Landscape = 2-3 bảng ngang */}
      <div 
        id="all-categories-container" 
        className={cn(
          "relative z-10 w-full max-w-full min-w-0 box-border items-start justify-center pt-[6px] min-[768px]:pt-0",
          selectedCategories.length === 0
            ? "flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-none border border-slate-300 text-slate-400"
            : selectedCategories.length === 1
              ? "grid grid-cols-[minmax(0,1fr)] max-w-[700px] mx-auto gap-[22px] min-[768px]:gap-[24px]"
              : selectedCategories.length <= 4
                ? "grid grid-cols-[minmax(0,1fr)] min-[1024px]:grid-cols-2 gap-[22px] min-[768px]:gap-[20px] w-full max-w-full min-w-0 mx-auto"
                : "grid grid-cols-[minmax(0,1fr)] min-[1024px]:grid-cols-2 min-[1440px]:grid-cols-3 gap-[22px] min-[768px]:gap-[20px] w-full max-w-full min-w-0 mx-auto"
        )}
      >
        {selectedCategories.length === 0 ? (
          <>
            <Layers size={36} className="mb-2 text-slate-300" />
            <p className="font-bold text-sm sm:text-base text-slate-600">Chưa chọn nhóm hàng nào</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Nhấn "+ THÊM BẢNG" ở trên để hiển thị báo cáo ngành hàng.</p>
          </>
        ) : (
          selectedCategories.map((catName) => {
            const cleanName = cleanCategoryName(catName);
            const lowerName = catName.trim().toLowerCase();
            const cardData = allCategoryDataMap.get(catName)
              || allCategoryDataMap.get(cleanName)
              || allCategoryDataMap.get(lowerName);
            if (!cardData) return null;

            return (
              <CategoryCard
                key={catName}
                catName={catName}
                data={cardData}
                yesterdayDate={yesterdayDate}
                dropdownCategories={dropdownCategories}
                onExport={handleExport}
                onOpenComment={handleOpenComment}
                onRemoveCard={handleRemoveCard}
                onSwitchCategory={handleSwitchCategory}
              />
            );
          })
        )}
      </div>

      {/* Comment Modal for Category Detail */}
      {commentOpenCat && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setCommentOpenCat(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét {commentOpenCat}
                </span>
              </div>
              <button onClick={() => setCommentOpenCat(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {[
                  { id: 1 as const, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
                  { id: 2 as const, label: 'Mẫu 2: Dưới 100%', icon: '⚠️' },
                  { id: 3 as const, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCatCommentTemplate(tab.id);
                      generateCatComment(commentOpenCat!, commentRowData, tab.id);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      catCommentTemplate === tab.id
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide mt-2">
                Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
              </p>
              <textarea
                value={catCommentText}
                onChange={(e) => setCatCommentText(e.target.value)}
                rows={12}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(catCommentText);
                      setCopiedCatComment(true);
                      setTimeout(() => setCopiedCatComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedCatComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedCatComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Capture Loading Overlay */}
      <CaptureLoadingOverlay isLoading={isCapturingAll} />

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default React.memo(CategoryDetailByStaffTable);
