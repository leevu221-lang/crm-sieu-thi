/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import * as htmlToImage from 'html-to-image';
import { domToPng } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { startCaptureSession, endCaptureSession } from '../utils/captureUtil';
import { 
  RefreshCw, ShoppingBag, ShoppingCart, Clock, PieChart, FileText, TrendingUp, TrendingDown, Camera, LayoutGrid, Activity, Globe, ChevronDown, ChevronUp, Zap, Upload, Trash2, 
  HelpCircle, FileSpreadsheet, X, AlertCircle, Trophy, Target, BarChart3, CreditCard, Calendar, ArrowUpRight, 
  ArrowDownRight, MessageSquare, Layers, Store, Smartphone, Watch, Monitor, Award, Filter, Sparkles, Loader2, Copy, Check,
  Eye, EyeOff, Search, SlidersHorizontal, RotateCcw, Download, Bell, ArrowRight, MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../components/CaptureLoadingOverlay';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { useStore } from '../contexts/StoreContext';
import OverviewDashboard from './RTST/components/OverviewDashboard';
import CategoryTable from './RTST/components/CategoryTable';
import { BonusCalculatorForm } from './BonusCalculatorForm';
import { EnterpriseCategoryAnalytics } from '../components/EnterpriseCategoryAnalytics';

import { ConfirmationModal } from './RTST/components/Modals';
import { getCustomCategoryIndex } from './EmployeeHealth/components/SummaryThiDuaTable';
import { normalize, isKhoLuuDong, cleanNum, resolveLuykeTraChamRate, isValidStoreName } from './RTST/utils';
import BcDtNganhHang from './BcDtNganhHang';
import SSGBoss from './SSGBoss';
import ClusterReportTab from './ClusterReportTab';

interface TabErrorBoundaryProps {
  children: React.ReactNode;
  tabName?: string;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class TabErrorBoundary extends React.Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[TabErrorBoundary] Lỗi tại tab ${this.props.tabName || ''}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-200 shadow-sm text-center max-w-xl mx-auto my-6">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
            ĐÃ XẢY RA LỖI TẠI {this.props.tabName ? `TAB ${this.props.tabName.toUpperCase()}` : 'MỤC NÀY'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
            Hệ thống đã tự động cô lập lỗi để bảo vệ ứng dụng, bạn vẫn có thể chuyển sang các tab khác hoặc chuyển trang bình thường.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Tải lại nội dung tab
            </button>
            <button
              onClick={() => {
                try {
                  const keys = Object.keys(localStorage).filter(k => k.startsWith('BONUS_CALC_'));
                  keys.forEach(k => localStorage.removeItem(k));
                } catch {}
                this.handleReset();
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
            >
              Xóa cache tính thưởng
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const getCategoryGroup = (name: string): 'yellow' | 'green' | 'blue' => {
  const normalized = name.toLowerCase().trim();
  
  if (
    normalized.includes('credit') ||
    normalized.includes('shin') ||
    normalized.includes('finance') ||
    normalized.includes('ví trả sau') ||
    normalized.includes('cake') ||
    normalized.includes('ngân hàng') ||
    normalized.includes('vpbank') ||
    normalized.includes('tpbank') ||
    normalized.includes('bảo hiểm') ||
    normalized.includes('sim') ||
    normalized.includes('vas') ||
    normalized.includes('mango') ||
    normalized.includes('icallme') ||
    normalized.includes('icall')
  ) {
    return 'green';
  }
  
  if (
    normalized.includes('điện thoại') ||
    normalized.includes('vivo') ||
    normalized.includes('realme') ||
    normalized.includes('phụ kiện') ||
    normalized.includes('đồng hồ') ||
    normalized.includes('camera') ||
    normalized.includes('pin sạc') ||
    normalized === 'loa' ||
    normalized.startsWith('loa ')
  ) {
    return 'yellow';
  }
  
  return 'blue';
};

const getCategoryGroupOrder = (name: string): number => {
  const group = getCategoryGroup(name);
  if (group === 'yellow') return 1; // ICT
  if (group === 'green') return 2;  // DỊCH VỤ
  return 3;                         // ĐMX
};

const parseNumericValue = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const str = String(val).trim();
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  
  if (hasComma && hasDot) {
    const commaIndex = str.indexOf(',');
    const dotIndex = str.indexOf('.');
    if (dotIndex < commaIndex) {
      // Vietnamese: 1.155.067,68 -> strip dots, replace comma with dot
      return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
    } else {
      // English: 1,155,067.68 -> strip commas
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }
  
  if (hasComma) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(str.replace(/,/g, '.')) || 0;
    } else {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }
  
  if (hasDot) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseFloat(str.replace(/\./g, '')) || 0;
    }
  }
  
  return parseFloat(str) || 0;
};

const pastelColorMap: Record<string, { bg: string; text: string; border: string }> = {
  rose: { bg: 'bg-[#E0F2FE]', text: 'text-[#0284C7]', border: 'border-[#BAE6FD]' },       // Target: Sky blue
  indigo: { bg: 'bg-[#CFFAFE]', text: 'text-[#0891B2]', border: 'border-[#A5F3FC]' },     // Doanh thu: Cyan
  emerald: { bg: 'bg-[#D1FAE5]', text: 'text-[#059669]', border: 'border-[#A7F3D0]' },    // %HT: Mint emerald
  amber: { bg: 'bg-[#EDE9FE]', text: 'text-[#6D28D9]', border: 'border-[#DDD6FE]' },      // Trả góp: Soft lavender purple
  orange: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]', border: 'border-[#FED7AA]' },     // % QĐ: Soft peach orange
  blue: { bg: 'bg-[#E0E7FF]', text: 'text-[#4338CA]', border: 'border-[#C7D2FE]' },       // Thu hộ / LNTT: Soft indigo blue
  slate: { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: 'border-[#E2E8F0]' },
  default: { bg: 'bg-[#E0F2FE]', text: 'text-[#0284C7]', border: 'border-[#BAE6FD]' }
};

const AutoZoomText: React.FC<{
  value: string | number;
  className?: string;
}> = ({ value, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState<number>(1);

  const calculateScale = useCallback(() => {
    if (containerRef.current && textRef.current) {
      textRef.current.style.transform = 'none';
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;

      if (containerWidth > 0 && textWidth > 0) {
        if (textWidth > containerWidth) {
          const ratio = (containerWidth / textWidth) * 0.98;
          const finalScale = Math.max(0.65, ratio);
          setScale(finalScale);
          textRef.current.style.transform = `scale(${finalScale})`;
        } else {
          setScale(1);
          textRef.current.style.transform = 'none';
        }
      }
    }
  }, []);

  useLayoutEffect(() => {
    calculateScale();
    const handleResize = () => calculateScale();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => calculateScale());
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [value, calculateScale]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden flex items-baseline min-w-0">
      <span
        ref={textRef}
        className={`whitespace-nowrap inline-block ${className}`}
        style={{
          transformOrigin: 'left center',
          whiteSpace: 'nowrap',
          wordBreak: 'keep-all',
        }}
      >
        {value}
      </span>
    </div>
  );
};

const execStatThemeMap: Record<string, {
  cardBg: string;
  borderColor: string;
  iconBg: string;
  titleColor: string;
  waveColor: string;
  waveGradId: string;
}> = {
  rose: {
    // 1. TARGET QĐ — Blue Theme
    cardBg: 'linear-gradient(180deg, #F5FAFF 0%, #EBF4FF 100%)',
    borderColor: '#D4E6FF',
    iconBg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    titleColor: '#1E3A8A',
    waveColor: '#2563EB',
    waveGradId: 'lk-kpi-wave-blue',
  },
  indigo: {
    // 2. DOANH THU QUY ĐỔI — Emerald Green Theme
    cardBg: 'linear-gradient(180deg, #F3FDF8 0%, #E6FAEF 100%)',
    borderColor: '#C6F1D8',
    iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    titleColor: '#065F46',
    waveColor: '#10B981',
    waveGradId: 'lk-kpi-wave-emerald',
  },
  emerald: {
    // 3. %HT — Purple/Violet Theme
    cardBg: 'linear-gradient(180deg, #F9F6FF 0%, #F1EAFF 100%)',
    borderColor: '#DFD2FF',
    iconBg: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    titleColor: '#4C1D95',
    waveColor: '#8B5CF6',
    waveGradId: 'lk-kpi-wave-purple',
  },
  amber: {
    // 4. TỶ TRỌNG TRẢ GÓP — Orange Theme
    cardBg: 'linear-gradient(180deg, #FFF9F3 0%, #FFF0E0 100%)',
    borderColor: '#FDE0C0',
    iconBg: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    titleColor: '#9A3412',
    waveColor: '#F97316',
    waveGradId: 'lk-kpi-wave-orange',
  },
  orange: {
    // 5. % QĐ — Red/Crimson Theme
    cardBg: 'linear-gradient(180deg, #FFF6F6 0%, #FFEBEB 100%)',
    borderColor: '#FECACA',
    iconBg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    titleColor: '#991B1B',
    waveColor: '#EF4444',
    waveGradId: 'lk-kpi-wave-red',
  },
  blue: {
    // 6. LNTT — Amber/Gold Theme
    cardBg: 'linear-gradient(180deg, #FFFDF4 0%, #FEF8D8 100%)',
    borderColor: '#FDE68A',
    iconBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    titleColor: '#92400E',
    waveColor: '#F59E0B',
    waveGradId: 'lk-kpi-wave-gold',
  },
  default: {
    cardBg: 'linear-gradient(180deg, #F5FAFF 0%, #EBF4FF 100%)',
    borderColor: '#D4E6FF',
    iconBg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    titleColor: '#1E3A8A',
    waveColor: '#2563EB',
    waveGradId: 'lk-kpi-wave-default',
  },
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: any;
  trend?: number;
  color?: 'rose' | 'indigo' | 'emerald' | 'amber' | 'orange' | 'blue' | 'default';
  delay?: number;
  isLarge?: boolean;
}> = ({ title, value, subValue, icon: Icon, trend, color = 'default', delay = 0, isLarge = false }) => {
  const theme = execStatThemeMap[color] || execStatThemeMap.default;
  const rawStr = String(value ?? '').trim();
  const isLongTitle = String(title || '').length > 14;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`exec-stat-card relative overflow-hidden p-[10px] sm:p-[13px] md:p-[15px] pb-[22px] sm:pb-[26px] rounded-[16px] border shadow-[0_4px_16px_-4px_rgba(11,31,58,0.06)] hover:shadow-[0_10px_24px_-6px_rgba(11,31,58,0.12)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-full min-h-[104px] sm:min-h-[122px] md:min-h-[130px] group ${isLarge ? 'md:col-span-2' : ''}`}
      style={{
        background: theme.cardBg,
        borderColor: theme.borderColor,
        fontFamily: "'UTM Avo', sans-serif",
      }}
    >
      {/* Header Row: Solid Rounded-XL Colored Icon Box + Title on Left, Ellipsis / Trend on Right */}
      <div className="relative z-10 flex items-center justify-between gap-[6px] w-full mb-[6px] sm:mb-[8px] min-w-0">
        <div className="flex items-center gap-[7px] sm:gap-[9px] min-w-0 flex-1">
          <div
            className="stat-card-badge w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-[9px] sm:rounded-[10px] flex items-center justify-center shrink-0 text-white shadow-xs"
            style={{ background: theme.iconBg }}
          >
            <Icon size={15} strokeWidth={2.3} className="shrink-0 text-white" />
          </div>
          <span
            className={`stat-card-title font-black uppercase leading-[1.2] line-clamp-2 sm:truncate ${
              isLongTitle
                ? 'text-[9.5px] sm:text-[10px] md:text-[10.5px] tracking-tight'
                : 'text-[10px] sm:text-[11px] md:text-[11.5px] tracking-wide'
            }`}
            style={{ color: theme.titleColor }}
            title={title}
          >
            {title}
          </span>
        </div>

        {trend !== undefined ? (
          <div
            className={`flex items-center gap-[2px] px-[6px] py-[2px] rounded-full text-[8.5px] font-black shrink-0 border whitespace-nowrap ${
              trend > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
          >
            {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </div>
        ) : (
          <span className="hidden sm:inline text-slate-400/80 text-[12px] font-black tracking-widest leading-none select-none shrink-0">
            •••
          </span>
        )}
      </div>

      {/* Main Primary Value Row */}
      <div className="relative z-10 my-auto py-[2px] min-w-0">
        <span
          className="exec-stat-num block font-black text-[22px] sm:text-[26px] md:text-[29px] lg:text-[31px] tracking-tight leading-none whitespace-nowrap truncate"
          style={{ color: '#0B1F3A', fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}
        >
          {rawStr}
        </span>
      </div>

      {subValue && (
        <div className="relative z-10 text-[10px] sm:text-[11px] font-bold text-slate-500 truncate mt-[4px]">
          {subValue}
        </div>
      )}

      {/* Bottom Decorative Mini Area Sparkline Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-[22px] sm:h-[26px] pointer-events-none overflow-hidden opacity-90">
        <svg viewBox="0 0 200 36" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={theme.waveGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.waveColor} stopOpacity="0.26" />
              <stop offset="100%" stopColor={theme.waveColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d="M0,28 C25,18 45,30 75,20 C105,10 125,26 155,10 C175,2 190,12 200,16 L200,36 L0,36 Z"
            fill={`url(#${theme.waveGradId})`}
          />
          <path
            d="M0,28 C25,18 45,30 75,20 C105,10 125,26 155,10 C175,2 190,12 200,16"
            fill="none"
            stroke={theme.waveColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </motion.div>
  );
};

const LuyKe: React.FC<{ pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean, pageHiddenState?: Record<string, boolean> }> = ({ pageMaintenanceState = {}, isUser43751Local = false, pageHiddenState = {} }) => {
  const { userProfile } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { marketFilter, setMarketFilter, availableMarkets } = useMarket();
  const { activeLuyKeTab: activeTab, setActiveLuyKeTab: setActiveTab, currentStoreId } = useStore();
  const filteredMarkets = React.useMemo(() => {
    return (availableMarkets || []).filter(m => !isKhoLuuDong(m.name));
  }, [availableMarkets]);
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');

  const is43751 = isUser43751Local || String(userProfile?.username).trim() === '43751' || String(userProfile?.ma_nhan_vien).trim() === '43751' || String(userProfile?.user_id).trim() === '43751';



  const {
    clusterSummaryInput, setClusterSummaryInput,
    clusterCategoryInput, setClusterCategoryInput,
    staffInput,
    staffCategoryInput,
    tragopMatran,
    activeStore,
    categoryTargets,
    processedData: displayData,
    processData,
    saveLuykeData,
    syncFromRealtime,
    isLoading
  } = useLuykeData(maKho);

  const { 
    daysPassed, totalDays, 
    stName, setStName,
    stTargetQuyDoi, setStTargetQuyDoi,
    allStoreTargets,
    stDtDuKienQD, setStDtDuKienQD,
    stDtlk, setStDtlk,
    stDtqd, setStDtqd,
    stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
    stPercentTarget, setStPercentTarget,
    stTargetSauHeSo, setStTargetSauHeSo,
    storeSettings,
    saveStoreRevenue,
    loadStoreRevenue,
    isLoadingStoreRevenue,
    isSavingStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES,
    excelFileName, setExcelFileName,
    thuongStRows, setThuongStRows,
    topPercentRankLimit, setTopPercentRankLimit,
    excelOldFileName, setExcelOldFileName,
    thuongStOldRows, setThuongStOldRows,
    topPercentRankLimitOld, setTopPercentRankLimitOld,
    saveExcelThuongStData
  } = useRTSTSharedData(maKho);

  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>(() => {
    return localStorage.getItem('rtst_selected_store_filter') || 'ALL';
  });
  const [isProcessingData, setIsProcessingData] = useState(false);

  // Sort modes for Category tables in BC Tháng:
  // 'HT_DESC' (%HT giảm dần - mặc định) | 'HT_ASC' (%HT tăng dần) | 'CONLAI_DESC' (C.Lại giảm dần - thiếu nhiều nhất lên đầu) | 'CONLAI_ASC' (C.Lại tăng dần)
  const [sortModeSL, setSortModeSL] = useState<'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC'>('HT_DESC');
  const [sortModeDT, setSortModeDT] = useState<'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC'>('HT_DESC');

  const sortCategoryList = (list: any[], mode: 'HT_DESC' | 'HT_ASC' | 'CONLAI_DESC' | 'CONLAI_ASC') => {
    return [...list].sort((a: any, b: any) => {
      let rateA = 0, rateB = 0;
      if (a.target > 0 && daysPassed > 0) rateA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
      if (b.target > 0 && daysPassed > 0) rateB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;

      const remA = a.target - a.revenue;
      const remB = b.target - b.revenue;

      if (mode === 'CONLAI_DESC') {
        // C.LẠI GIẢM DẦN: Ngành thiếu nhiều nhất lên trước
        if (remA > 0 && remB > 0) return remB - remA;
        if (remA > 0 && remB <= 0) return -1;
        if (remA <= 0 && remB > 0) return 1;
        return remB - remA;
      }

      if (mode === 'CONLAI_ASC') {
        // C.LẠI TĂNG DẦN: Đạt rồi (0) hoặc thiếu ít nhất lên trước
        if (remA <= 0 && remB > 0) return -1;
        if (remA > 0 && remB <= 0) return 1;
        return remA - remB;
      }

      if (mode === 'HT_ASC') {
        return rateA - rateB;
      }

      // Default: HT_DESC (%HT cao nhất)
      return rateB - rateA;
    });
  };

  useEffect(() => {
    localStorage.setItem('rtst_selected_store_filter', selectedStoreFilter);
  }, [selectedStoreFilter]);

  // Unique store names derived from cluster markets
  const uniqueExcelStores = React.useMemo(() => {
    return filteredMarkets.map((m: any) => m.name).sort();
  }, [filteredMarkets]);

  const lastSyncedMarketFilterRef = useRef<string | null>(null);

  // Synchronize store filter with global context or select first available store
  useEffect(() => {
    if (uniqueExcelStores.length === 0) {
      // Don't reset to ALL while markets are still loading from DB/context
      return;
    }

    if (marketFilter && marketFilter !== 'ALL' && marketFilter !== lastSyncedMarketFilterRef.current) {
      lastSyncedMarketFilterRef.current = marketFilter;
      const normFilter = normalize(marketFilter);
      const match = uniqueExcelStores.find((store: string) => {
        const normStore = normalize(store);
        return normStore === normFilter || normStore.includes(normFilter) || normFilter.includes(normStore);
      });
      if (match) {
        setSelectedStoreFilter(match);
        return;
      }
    }

    const savedFilter = localStorage.getItem('rtst_selected_store_filter');
    if (savedFilter && savedFilter !== 'ALL') {
      const normSaved = normalize(savedFilter);
      const match = uniqueExcelStores.find(s => {
        const normS = normalize(s);
        return normS === normSaved || normS.includes(normSaved) || normSaved.includes(normS);
      });
      if (match) {
        if (selectedStoreFilter !== match) setSelectedStoreFilter(match);
        return;
      }
    }

    if (selectedStoreFilter && selectedStoreFilter !== 'ALL' && uniqueExcelStores.includes(selectedStoreFilter)) {
      return;
    }

    if (uniqueExcelStores.length > 0) {
      setSelectedStoreFilter(uniqueExcelStores[0]);
    }
  }, [uniqueExcelStores, marketFilter, selectedStoreFilter]);

  // Helper to read File as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) resolve(e.target.result as ArrayBuffer);
        else reject(new Error('Không thể đọc dữ liệu file'));
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  // Helper to parse Excel file buffer for THƯỞNG THI ĐUA
  const parseThuongStExcelBuffer = (dataBuffer: ArrayBuffer, fileName: string, availableMarketsList?: any[]) => {
    const wb = XLSX.read(dataBuffer, { type: 'array' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][];

    if (!data || data.length === 0) {
      throw new Error(`File ${fileName} không có dữ liệu!`);
    }

    let headerRowIndex = -1;
    let storeIdx = -1;
    let categoryIdx = -1;
    let limitColIdx = -1;
    const completionIdx = 5; // Column F
    const completionRankIdx = 9; // Column J
    const exceededRankIdx = 8; // Column I
    const bonusIdx = 12; // Column M
    let detectedLimit = 7;

    // 1. Scan for headers and limit (by checking current row and next row combined)
    for (let r = 0; r < Math.min(data.length, 50); r++) {
      const row = data[r];
      const nextRow = data[r + 1];
      if (!row) continue;

      let tempStoreIdx = -1;
      let tempCategoryIdx = -1;
      let tempLimitColIdx = -1;

      for (let c = 0; c < row.length; c++) {
        const cellVal1 = String(row[c] || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const cellVal2 = nextRow ? String(nextRow[c] || '').toLowerCase().replace(/\s+/g, ' ').trim() : '';
        const cellValCombined = `${cellVal1} ${cellVal2}`.trim();

        const isMatch = (term: string) => {
          return cellVal1.includes(term) || cellVal2.includes(term) || cellValCombined.includes(term);
        };

        // Check for Top 10% limit
        if (isMatch('hạng top') || isMatch('top 10% để có thưởng') || isMatch('hạng top 10%') || isMatch('top 10% kênh') || isMatch('top 10%') || isMatch('top10%')) {
          tempLimitColIdx = c;
          const cleanLimitText = cellValCombined.replace(/\d+%/g, '').replace(/top\s*10/g, '');
          const match = cleanLimitText.match(/\d+/);
          if (match) {
            detectedLimit = parseInt(match[0], 10);
          } else if (c + 1 < row.length) {
            const nextCellVal = String(row[c + 1] || '').replace(/\d+%/g, '').replace(/top\s*10/g, '');
            const match2 = nextCellVal.match(/\d+/);
            if (match2) {
              detectedLimit = parseInt(match2[0], 10);
            }
          }
        }

        // Match headers for store and category
        if (isMatch('siêu thị') || cellVal1 === 'st' || cellVal2 === 'st' || isMatch('tên kho') || isMatch('mã kho') || isMatch('mã siêu thị') || isMatch('tên siêu thị') || isMatch('tên st')) {
          tempStoreIdx = c;
        } else if (isMatch('nhóm hàng') || isMatch('ngành hàng') || cellVal1 === 'nhóm' || cellVal2 === 'nhóm' || isMatch('category') || isMatch('nhóm sp')) {
          tempCategoryIdx = c;
        }
      }

      // We consider the row containing the category keyword as the header row
      if (tempCategoryIdx !== -1 && headerRowIndex === -1) {
        headerRowIndex = r;
        storeIdx = tempStoreIdx;
        categoryIdx = tempCategoryIdx;
        limitColIdx = tempLimitColIdx;
      }
    }

    // Fallback for limitColIdx if not detected
    if (limitColIdx === -1) {
      limitColIdx = 8; // Column I (index 8)
    }

    // Fallback detection if headers are not found by labels
    if (storeIdx === -1 || categoryIdx === -1) {
      const colScoresStore = new Array(30).fill(0);
      const colScoresCategory = new Array(30).fill(0);

      const sampleRows = data.slice(0, Math.min(data.length, 50));
      // Pre-normalize market names once to avoid repeated normalization in loops
      const normMarketNames = (availableMarketsList || []).map((m: any) => normalize(m.name || '')).filter(Boolean);

      sampleRows.forEach(row => {
        if (!row) return;
        for (let c = 0; c < Math.min(row.length, 30); c++) {
          const cellVal = String(row[c] || '').trim();
          if (!cellVal) continue;

          const normVal = normalize(cellVal);

          // Score for store: check if it matches any availableMarkets name
          const matchesMarket = normMarketNames.some(normMName => {
            return normVal === normMName || normVal.includes(normMName) || normMName.includes(normVal);
          });
          if (matchesMarket) {
            colScoresStore[c] += 1;
          }
          
          // Score for category: check if the name is a known category/group
          const lowerVal = cellVal.toLowerCase();
          const isCategoryTerm = 
            lowerVal.includes('điện thoại') || 
            lowerVal.includes('phụ kiện') || 
            lowerVal.includes('đồng hồ') || 
            lowerVal.includes('credit') || 
            lowerVal.includes('máy lạnh') || 
            lowerVal.includes('tủ lạnh') || 
            lowerVal.includes('máy giặt') || 
            lowerVal.includes('điện tử') || 
            lowerVal.includes('gia dụng') || 
            lowerVal.includes('loa');
          if (isCategoryTerm) {
            colScoresCategory[c] += 1;
          }
        }
      });
      
      if (storeIdx === -1) {
        let maxStoreScore = 0;
        let bestStoreCol = -1;
        for (let c = 0; c < colScoresStore.length; c++) {
          if (colScoresStore[c] > maxStoreScore) {
            maxStoreScore = colScoresStore[c];
            bestStoreCol = c;
          }
        }
        storeIdx = (bestStoreCol !== -1 && maxStoreScore > 0) ? bestStoreCol : 0;
      }
      
      if (categoryIdx === -1) {
        let maxCategoryScore = 0;
        let bestCategoryCol = -1;
        for (let c = 0; c < colScoresCategory.length; c++) {
          if (colScoresCategory[c] > maxCategoryScore) {
            maxCategoryScore = colScoresCategory[c];
            bestCategoryCol = c;
          }
        }
        categoryIdx = (bestCategoryCol !== -1 && maxCategoryScore > 0) ? bestCategoryCol : (storeIdx === 0 ? 1 : 0);
      }
    }

    // 2. Parse rows after header
    const parsedRows: any[] = [];
    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

    for (let r = startRow; r < data.length; r++) {
      const row = data[r];
      if (!row) continue;

      // Check if row is empty or total/summary row
      const firstCellVal = (categoryIdx !== -1 && row.length > categoryIdx) ? row[categoryIdx] : (row.length > 0 ? row[0] : '');
      const firstCell = String(firstCellVal || '').toLowerCase();
      if (!firstCell || firstCell.includes('tổng cộng') || firstCell === 'tổng' || firstCell.includes('total') || firstCell.includes('báo cáo')) {
        continue;
      }

      const categoryName = (categoryIdx !== -1 && row.length > categoryIdx) ? String(row[categoryIdx] || '').trim() : '';
      if (!categoryName) continue;

      // Ignore header-like names if they are parsed as row values
      const lowerCat = categoryName.toLowerCase();
      if (lowerCat.includes('nhóm hàng') || lowerCat.includes('ngành hàng') || lowerCat.includes('category') || lowerCat.includes('nhóm sp') || lowerCat === 'nhóm') {
        continue;
      }

      const storeName = (storeIdx !== -1 && row.length > storeIdx) ? String(row[storeIdx] || '').trim() : '';
      
      let completionVal = 0;
      if (row.length > completionIdx) {
        const rawVal = row[completionIdx];
        if (typeof rawVal === 'number') {
          // Trong file Excel thi đua, cột % hoàn thành luôn là tỷ lệ thập phân (0.985 = 98.5%, 2.058 = 205.8%, 23.296 = 2329.6%)
          completionVal = rawVal * 100;
        } else if (typeof rawVal === 'string') {
          const str = rawVal.trim();
          if (str.includes('%')) {
            completionVal = parseNumericValue(str.replace(/%/g, ''));
          } else {
            const num = parseNumericValue(str);
            // Nếu lưu dạng chuỗi thập phân "0.985" < 1.0
            if (num > 0 && num < 1.0) {
              completionVal = num * 100;
            } else {
              completionVal = num;
            }
          }
        }
      }

      const completionRank = (row.length > completionRankIdx) ? Math.round(parseNumericValue(row[completionRankIdx])) : 0;
      const exceededRank = (row.length > exceededRankIdx) ? Math.round(parseNumericValue(row[exceededRankIdx])) : 0;
      const bonus = (row.length > bonusIdx) ? Math.round(parseNumericValue(row[bonusIdx])) : 0;
      const limit = (limitColIdx !== -1 && row.length > limitColIdx) ? Math.round(parseNumericValue(row[limitColIdx])) : detectedLimit;

      parsedRows.push({
        storeName,
        categoryName,
        completion: completionVal,
        completionRank,
        exceededRank,
        bonus,
        limit
      });
    }

    return {
      parsedRows,
      detectedLimit,
      fileName
    };
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingData(true);
    // Yield to UI thread so the loading overlay renders before heavy CPU work
    await new Promise(r => setTimeout(r, 50));
    try {
      if (files.length >= 2) {
        // User uploaded 2 files simultaneously:
        // File 1 (index 0 - added first) = Old / Yesterday file
        // File 2 (index 1 - added second) = New / Today file
        const fileOld = files[0];
        const fileNew = files[1];

        const [bufOld, bufNew] = await Promise.all([
          readFileAsArrayBuffer(fileOld),
          readFileAsArrayBuffer(fileNew)
        ]);

        const resOld = parseThuongStExcelBuffer(bufOld, fileOld.name, filteredMarkets);
        const resNew = parseThuongStExcelBuffer(bufNew, fileNew.name, filteredMarkets);

        if (resNew.parsedRows.length === 0 || resOld.parsedRows.length === 0) {
          alert('Không tìm thấy dòng dữ liệu nhóm hàng nào phù hợp trong các file tải lên!');
          return;
        }

        saveExcelThuongStData(
          resNew.parsedRows,
          resNew.fileName,
          resNew.detectedLimit,
          filteredMarkets.map((m: any) => m.name),
          resOld.parsedRows,
          resOld.fileName,
          resOld.detectedLimit
        );
      } else {
        // Single file uploaded -> Pure DOMINO Mechanism:
        const file = files[0];
        const buffer = await readFileAsArrayBuffer(file);
        const resNew = parseThuongStExcelBuffer(buffer, file.name, filteredMarkets);

        if (resNew.parsedRows.length === 0) {
          alert('Không tìm thấy dòng dữ liệu nhóm hàng nào phù hợp!');
          return;
        }

        const hasExistingTodayData = (selectedStoreExcelData.rows && selectedStoreExcelData.rows.length > 0) || (thuongStRows && thuongStRows.length > 0) || !!activeExcelFileName;

        if (hasExistingTodayData) {
          // DOMINO EFFECT:
          // Existing Today file shifts to become Yesterday (Old) file.
          // Newly uploaded file becomes Today (New) file.
          saveExcelThuongStData(
            resNew.parsedRows,
            resNew.fileName,
            resNew.detectedLimit,
            filteredMarkets.map((m: any) => m.name),
            selectedStoreExcelData.rows && selectedStoreExcelData.rows.length > 0 ? selectedStoreExcelData.rows : thuongStRows,
            selectedStoreExcelData.fileName || activeExcelFileName || excelFileName,
            selectedStoreExcelData.limit || topPercentRankLimit || 7
          );
        } else {
          // Initial single file upload: set as Today (New) file
          saveExcelThuongStData(
            resNew.parsedRows,
            resNew.fileName,
            resNew.detectedLimit,
            filteredMarkets.map((m: any) => m.name),
            [],
            '',
            7
          );
        }
      }
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      alert('Lỗi xử lý file Excel: ' + (err.message || 'Vui lòng kiểm tra định dạng file!'));
    } finally {
      setIsProcessingData(false);
      e.target.value = '';
    }
  };

  const handleSwapOldAndNew = () => {
    if (!selectedStoreExcelData.fileName && !selectedStoreExcelData.oldFileName) return;
    saveExcelThuongStData(
      selectedStoreExcelData.oldRows,
      selectedStoreExcelData.oldFileName,
      selectedStoreExcelData.oldLimit,
      filteredMarkets.map((m: any) => m.name),
      selectedStoreExcelData.rows,
      selectedStoreExcelData.fileName,
      selectedStoreExcelData.limit
    );
  };

  const handleClearOldFile = () => {
    saveExcelThuongStData(
      selectedStoreExcelData.rows,
      selectedStoreExcelData.fileName,
      selectedStoreExcelData.limit,
      filteredMarkets.map((m: any) => m.name),
      [],
      '',
      7
    );
  };

  const handleClearAllExcelData = async () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu thi đua (cả file mới và file cũ)?')) return;
    
    // Clear local state immediately for fast response
    setExcelFileName('');
    setThuongStRows([]);
    setTopPercentRankLimit(7);
    setExcelOldFileName('');
    setThuongStOldRows([]);
    setTopPercentRankLimitOld(7);

    // Save empty state to database
    await saveExcelThuongStData([], '', 7, filteredMarkets.map((m: any) => m.name), [], '', 7);
  };

  // Active competition file names from any store in cache, local state, or localStorage
  const activeExcelFileName = React.useMemo(() => {
    if (excelFileName) return excelFileName;
    for (const val of Object.values(allStoreTargets || {})) {
      if ((val as any)?.excelFileName) return (val as any).excelFileName;
    }
    for (const m of filteredMarkets) {
      const cached = allStoreTargets[m.name.toUpperCase()];
      if (cached?.excelFileName) return cached.excelFileName;
    }
    return localStorage.getItem('ST_EXCEL_FILE_NAME_V1') || '';
  }, [allStoreTargets, filteredMarkets, excelFileName]);

  const activeExcelOldFileName = React.useMemo(() => {
    if (excelOldFileName) return excelOldFileName;
    for (const m of filteredMarkets) {
      const cached = allStoreTargets[m.name.toUpperCase()];
      if (cached?.excelOldFileName) return cached.excelOldFileName;
    }
    for (const val of Object.values(allStoreTargets || {})) {
      if ((val as any)?.excelOldFileName) return (val as any).excelOldFileName;
    }
    return localStorage.getItem('ST_EXCEL_OLD_FILE_NAME_V1') || '';
  }, [allStoreTargets, filteredMarkets, excelOldFileName]);

  // Excel data for the store currently selected in the dropdown
  const selectedStoreExcelData = React.useMemo(() => {
    const targetStoreName = (selectedStoreFilter && selectedStoreFilter !== 'ALL')
      ? selectedStoreFilter
      : (stName || currentStoreId || (filteredMarkets[0]?.name) || '');

    const key = (targetStoreName || '').toUpperCase();
    let storeTarget = allStoreTargets[key];
    if (!storeTarget && key) {
      const normKey = normalize(key);
      for (const [k, val] of Object.entries(allStoreTargets)) {
        const normK = normalize(k);
        if (normK === normKey) {
          storeTarget = val;
          break;
        }
      }
      if (!storeTarget) {
        for (const [k, val] of Object.entries(allStoreTargets)) {
          const normK = normalize(k);
          if (normK.includes(normKey) || normKey.includes(normK)) {
            storeTarget = val;
            break;
          }
        }
      }
    }

    // Secondary pass: Match by 3-5 digit store warehouse code if present
    if (!storeTarget && key) {
      const codeMatch = key.match(/\b\d{3,5}\b/);
      if (codeMatch) {
        const code = codeMatch[0];
        for (const [k, val] of Object.entries(allStoreTargets)) {
          if (k.includes(code)) {
            storeTarget = val;
            break;
          }
        }
      }
    }

    // Fallback: ONLY look among cluster stores in filteredMarkets, NEVER an unrelated province or warehouse!
    if (!storeTarget || !storeTarget.thuongStRows || storeTarget.thuongStRows.length === 0) {
      for (const m of filteredMarkets) {
        const cTarget = allStoreTargets[m.name.toUpperCase()];
        if (cTarget?.thuongStRows && cTarget.thuongStRows.length > 0) {
          storeTarget = cTarget;
          break;
        }
      }
    }
    
    const effectiveRows = (storeTarget?.thuongStRows && storeTarget.thuongStRows.length > 0)
      ? storeTarget.thuongStRows
      : (thuongStRows || []);
    
    const effectiveFileName = storeTarget?.excelFileName || activeExcelFileName || excelFileName || '';
    const effectiveLimit = storeTarget?.topPercentRankLimit ?? topPercentRankLimit ?? 7;

    const effectiveOldRows = (storeTarget?.thuongStOldRows && storeTarget.thuongStOldRows.length > 0)
      ? storeTarget.thuongStOldRows
      : (thuongStOldRows || []);
    const effectiveOldFileName = storeTarget?.excelOldFileName || activeExcelOldFileName || excelOldFileName || '';
    const effectiveOldLimit = storeTarget?.topPercentRankLimitOld ?? topPercentRankLimitOld ?? 7;

    return {
      rows: effectiveRows,
      fileName: effectiveFileName,
      limit: effectiveLimit,
      oldRows: effectiveOldRows,
      oldFileName: effectiveOldFileName,
      oldLimit: effectiveOldLimit
    };
  }, [allStoreTargets, selectedStoreFilter, thuongStRows, excelFileName, topPercentRankLimit, thuongStOldRows, excelOldFileName, topPercentRankLimitOld, stName, currentStoreId, filteredMarkets, activeExcelFileName, activeExcelOldFileName]);

  const isComparing = React.useMemo(() => {
    return !!(selectedStoreExcelData.oldFileName && (selectedStoreExcelData.oldRows || []).length > 0);
  }, [selectedStoreExcelData.oldFileName, selectedStoreExcelData.oldRows]);

  const isExcelActive = React.useMemo(() => {
    if (activeExcelFileName || excelFileName || excelOldFileName) return true;
    if (selectedStoreExcelData.fileName || selectedStoreExcelData.oldFileName || selectedStoreExcelData.rows.length > 0) return true;
    const hasAnyTarget = Object.values(allStoreTargets || {}).some(
      (t: any) => !!t?.excelFileName || !!t?.excelOldFileName || (t?.thuongStRows || []).length > 0
    );
    if (hasAnyTarget) return true;
    return filteredMarkets.some((m: any) => {
      const cached = allStoreTargets[m.name.toUpperCase()];
      return !!cached?.excelFileName || !!cached?.excelOldFileName;
    });
  }, [allStoreTargets, filteredMarkets, excelFileName, excelOldFileName, selectedStoreExcelData, activeExcelFileName]);

  // Bonus Filter & Comment states for THƯỞNG ST
  // 'ALL' | 'BONUS' | 'NEAR' | 'NOT_YET' | 'DECREASED' | 'INCREASED' | 'EXCEEDED'
  const [bonusFilterTab, setBonusFilterTab] = useState<'ALL' | 'BONUS' | 'NEAR' | 'NOT_YET' | 'DECREASED' | 'INCREASED' | 'EXCEEDED'>('ALL');
  const [thuongStSearchQuery, setThuongStSearchQuery] = useState<string>('');
  const [thuongStGroupFilter, setThuongStGroupFilter] = useState<'ALL' | 'yellow' | 'green' | 'blue'>('ALL');
  const [thuongStViewMode, setThuongStViewMode] = useState<'GROUPED' | 'FLAT' | 'SORT_HT_DESC' | 'SORT_BONUS_DESC'>('GROUPED');
  const [collapsedThuongStGroups, setCollapsedThuongStGroups] = useState<Record<'yellow' | 'green' | 'blue', boolean>>({
    yellow: false,
    green: false,
    blue: false
  });
  const [showThuongStWarning, setShowThuongStWarning] = useState<boolean>(true);
  const thuongStUploadInputRef = useRef<HTMLInputElement>(null);

  const [thuongStComment, setThuongStComment] = useState('');
  const [showThuongStComment, setShowThuongStComment] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [thuongStCommentOpen, setThuongStCommentOpen] = useState(false);
  const [copiedThuongStComment, setCopiedThuongStComment] = useState(false);
  const [thuongStTemplate, setThuongStTemplate] = useState<1 | 2 | 3>(1);

  // Enriched rows comparing today vs yesterday
  const comparedThuongStRows = React.useMemo(() => {
    const currentRows = selectedStoreExcelData.rows || [];
    const oldRows = selectedStoreExcelData.oldRows || [];

    // Create normalized lookup map for yesterday
    const oldMap = new Map<string, any>();
    oldRows.forEach((r: any) => {
      if (r.categoryName) {
        oldMap.set(normalize(r.categoryName), r);
      }
    });

    const enriched = currentRows.map((curRow: any) => {
      const normName = normalize(curRow.categoryName || '');
      const oldRow = oldMap.get(normName);

      const bonusCurrent = curRow.bonus || 0;
      const bonusOld = oldRow ? (oldRow.bonus || 0) : 0;
      const bonusDiff = bonusCurrent - bonusOld;

      const completionCurrent = curRow.completion || 0;
      const completionOld = oldRow ? (oldRow.completion || 0) : 0;
      const completionDiff = completionCurrent - completionOld;

      const completionRankCurrent = curRow.completionRank || 0;
      const completionRankOld = oldRow ? (oldRow.completionRank || 0) : 0;
      const completionRankDiff = (completionRankOld > 0 && completionRankCurrent > 0)
        ? (completionRankOld - completionRankCurrent) // Positive = jumped/improved ranks
        : 0;

      const exceededRankCurrent = curRow.exceededRank || 0;
      const exceededRankOld = oldRow ? (oldRow.exceededRank || 0) : 0;
      const exceededRankDiff = (exceededRankOld > 0 && exceededRankCurrent > 0)
        ? (exceededRankOld - exceededRankCurrent)
        : 0;

      const isBonusLost = bonusOld > 0 && bonusCurrent === 0;
      const isBonusDecreased = bonusDiff < 0;
      const isBonusIncreased = bonusDiff > 0;
      const isBonusGained = bonusOld === 0 && bonusCurrent > 0;
      const isBonusUnchanged = bonusCurrent > 0 && bonusDiff === 0;

      return {
        ...curRow,
        oldRow,
        bonusCurrent,
        bonusOld,
        bonusDiff,
        completionCurrent,
        completionOld,
        completionDiff,
        completionRankCurrent,
        completionRankOld,
        completionRankDiff,
        exceededRankCurrent,
        exceededRankOld,
        exceededRankDiff,
        isBonusLost,
        isBonusDecreased,
        isBonusIncreased,
        isBonusGained,
        isBonusUnchanged,
        hasComparison: !!oldRow
      };
    });

    return enriched;
  }, [selectedStoreExcelData.rows, selectedStoreExcelData.oldRows]);

  // Overall Statistics for today vs yesterday + SaaS KPI cards
  const thuongStStats = React.useMemo(() => {
    const all = comparedThuongStRows || [];
    const limit = selectedStoreExcelData.limit || 7;
    const bonusRows = all.filter((r: any) => r.bonusCurrent > 0);
    const nearRows = all.filter((r: any) => (r.bonusCurrent || 0) === 0 && r.completionCurrent >= 82);
    const notYetRows = all.filter((r: any) => (r.bonusCurrent || 0) === 0 && r.completionCurrent < 82);
    const exceededRows = all.filter((r: any) => (r.completionRankCurrent > 0 && r.completionRankCurrent <= limit));

    const decreasedRows = all.filter((r: any) => r.isBonusDecreased).sort((a: any, b: any) => a.bonusDiff - b.bonusDiff);
    const increasedRows = all.filter((r: any) => r.isBonusIncreased).sort((a: any, b: any) => b.bonusDiff - a.bonusDiff);
    const lostRows = all.filter((r: any) => r.isBonusLost);
    const gainedRows = all.filter((r: any) => r.isBonusGained);

    const totalBonusCurrent = all.reduce((sum: number, r: any) => sum + r.bonusCurrent, 0);
    const totalBonusOld = all.reduce((sum: number, r: any) => sum + r.bonusOld, 0);
    const totalBonusDiff = totalBonusCurrent - totalBonusOld;

    const totalDecreasedAmount = decreasedRows.reduce((sum: number, r: any) => sum + Math.abs(r.bonusDiff), 0);
    const totalIncreasedAmount = increasedRows.reduce((sum: number, r: any) => sum + r.bonusDiff, 0);

    const avgCompletion = all.length > 0
      ? all.reduce((sum: number, r: any) => sum + (r.completionCurrent || 0), 0) / all.length
      : 0;

    // Detect active month from category names (e.g. "T10 - ...") or file name (e.g. "09/10.xlsx")
    let detectedMonth = '';
    for (const r of all) {
      const mMatch = String(r.categoryName || '').match(/\bT(\d{1,2})\b/i);
      if (mMatch) {
        detectedMonth = mMatch[1];
        break;
      }
    }
    if (!detectedMonth && selectedStoreExcelData.fileName) {
      const fMatch = selectedStoreExcelData.fileName.match(/\d{1,2}[\/\-](\d{1,2})/);
      if (fMatch) {
        detectedMonth = String(parseInt(fMatch[1], 10));
      }
    }

    return {
      all,
      bonusRows,
      nearRows,
      notYetRows,
      exceededRows,
      decreasedRows,
      increasedRows,
      lostRows,
      gainedRows,
      totalBonusCurrent,
      totalBonusOld,
      totalBonusDiff,
      totalDecreasedAmount,
      totalIncreasedAmount,
      avgCompletion,
      detectedMonth
    };
  }, [comparedThuongStRows, selectedStoreExcelData.limit, selectedStoreExcelData.fileName]);

  const handleGenerateAIComment = (template: 1 | 2 | 3 = 1) => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      try {
        const stats = thuongStStats;
        const rows = comparedThuongStRows;
        const limit = selectedStoreExcelData.limit || 7;
        const totalBonus = stats.totalBonusCurrent;
        const totalBonusOld = stats.totalBonusOld;
        const diff = stats.totalBonusDiff;
        
        let generated = '';

        if (template === 1) {
          // MẪU 1: Tổng quan + Điểm sáng + Biến động so sánh
          const topPerformers = stats.bonusRows.slice(0, 4);
          const nonBonusRows = rows.filter((r: any) => (r.bonusCurrent || 0) === 0);
          const nearTopRows = nonBonusRows
            .filter((r: any) => (r.completionRankCurrent > 0 && r.completionRankCurrent <= limit + 4) || (r.exceededRankCurrent > 0 && r.exceededRankCurrent <= limit + 4) || r.completionCurrent >= 100)
            .slice(0, 3);
          const lines: string[] = [];

          lines.push(`🎯 ĐÁNH GIÁ TỔNG QUAN THI ĐUA SIÊU THỊ:`);
          lines.push(`• Tổng thưởng dự kiến: ${totalBonus.toLocaleString('vi-VN')} ₫ (${stats.bonusRows.length}/${rows.length} nhóm ngành đạt thưởng).`);
          
          if (isComparing) {
            if (diff > 0) {
              lines.push(`• 📈 BIẾN ĐỘNG SO VỚI HÔM QUA: TĂNG TRƯỞNG +${diff.toLocaleString('vi-VN')} ₫ (+${((diff / (totalBonusOld || 1)) * 100).toFixed(1)}% so với ${totalBonusOld.toLocaleString('vi-VN')} ₫).`);
            } else if (diff < 0) {
              lines.push(`• 📉 BIẾN ĐỘNG SO VỚI HÔM QUA: GIẢM -${Math.abs(diff).toLocaleString('vi-VN')} ₫ (${((diff / (totalBonusOld || 1)) * 100).toFixed(1)}% so với ${totalBonusOld.toLocaleString('vi-VN')} ₫).`);
            } else {
              lines.push(`• ⚖️ BIẾN ĐỘNG SO VỚI HÔM QUA: Duy trì ổn định, không thay đổi quỹ thưởng.`);
            }
          }

          if (stats.decreasedRows.length > 0 && isComparing) {
            lines.push(``);
            lines.push(`🚨 CÁC NGÀNH BỊ GIẢM THƯỞNG / MẤT THƯỞNG CẦN CHÚ Ý:`);
            stats.decreasedRows.forEach((r: any) => {
              if (r.isBonusLost) {
                const rankText = r.completionRankCurrent > 0 ? `Hạng #${r.completionRankCurrent}` : `Hạng VT #${r.exceededRankCurrent || '-'}`;
                lines.push(`• ${r.categoryName}: ⚠️ MẤT THƯỞNG (-${r.bonusOld.toLocaleString('vi-VN')} ₫) do rơi khỏi Top ${limit} (${rankText}, đạt ${r.completionCurrent.toFixed(1)}%).`);
              } else {
                lines.push(`• ${r.categoryName}: Giảm -${Math.abs(r.bonusDiff).toLocaleString('vi-VN')} ₫ (Hôm nay: ${r.bonusCurrent.toLocaleString('vi-VN')} ₫, Hôm qua: ${r.bonusOld.toLocaleString('vi-VN')} ₫).`);
              }
            });
          }

          if (topPerformers.length > 0) {
            lines.push(``);
            lines.push(`🌟 ĐIỂM SÁNG BỨT PHÁ (TOP THƯỞNG CAO NHẤT):`);
            topPerformers.forEach((p: any) => {
              const rankStr = p.completionRankCurrent > 0 && p.completionRankCurrent <= limit 
                ? `Hạng HT #${p.completionRankCurrent}` 
                : `Hạng VT #${p.exceededRankCurrent}`;
              const bonusAdd = isComparing && p.bonusDiff > 0 ? ` (▲ +${p.bonusDiff.toLocaleString('vi-VN')} ₫)` : '';
              lines.push(`• ${p.categoryName}: Đạt ${p.completionCurrent.toFixed(1)}% (${rankStr}) ➔ Thưởng: +${p.bonusCurrent.toLocaleString('vi-VN')} ₫${bonusAdd}`);
            });
          }

          if (nearTopRows.length > 0) {
            lines.push(``);
            lines.push(`🚀 CƠ HỘI BỨT PHÁ GIA TĂNG QUỸ THƯỞNG (SÁT TOP ${limit}):`);
            nearTopRows.forEach((n: any) => {
              const rankText = n.completionRankCurrent > 0 ? `Hạng ${n.completionRankCurrent}` : `Hạng VT ${n.exceededRankCurrent}`;
              lines.push(`• ${n.categoryName}: Đạt ${n.completionCurrent.toFixed(1)}% (${rankText}) ➔ Dồn lực tư vấn chốt deal để lọt Top ${limit} nhận thưởng.`);
            });
          }

          lines.push(``);
          lines.push(`💡 HÀNH ĐỘNG TRỌNG TÂM:`);
          lines.push(`• Dồn lực tư vấn các ngành vừa bị tụt hạng/giảm thưởng để kịp thời lấy lại vị thế Top ${limit}.`);
          lines.push(`• Giữ vững vị thế Top ${limit} ở các nhóm ngành thế mạnh đang dẫn đầu.`);
          generated = lines.join('\n');
        } else if (template === 2) {
          // MẪU 2: Danh sách chi tiết ngành giảm & mất thưởng
          const lines: string[] = [];
          lines.push(`⚠️ BÁO CÁO CHI TIẾT NGÀNH HÀNG GIẢM THƯỞNG SO VỚI HÔM QUA:`);
          lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          if (isComparing) {
            lines.push(`📉 Tổng tiền thưởng giảm sút: -${stats.totalDecreasedAmount.toLocaleString('vi-VN')} ₫ (${stats.decreasedRows.length} ngành bị giảm/mất thưởng)`);
            lines.push(``);
            if (stats.decreasedRows.length === 0) {
              lines.push(`🎉 Tuyệt vời! Không có ngành hàng nào bị giảm thưởng so với hôm qua.`);
            } else {
              stats.decreasedRows.forEach((r: any, i: number) => {
                const rankText = r.completionRankCurrent > 0 ? `HT #${r.completionRankCurrent}` : `VT #${r.exceededRankCurrent || '-'}`;
                const rankOldText = r.completionRankOld > 0 ? `HT #${r.completionRankOld}` : `VT #${r.exceededRankOld || '-'}`;
                lines.push(`${i + 1}. 🔻 ${r.categoryName}:`);
                if (r.isBonusLost) {
                  lines.push(`   - Tình trạng: 🚨 MẤT HOÀN TOÀN THƯỞNG (Từ ${r.bonusOld.toLocaleString('vi-VN')} ₫ ➔ 0 ₫)`);
                } else {
                  lines.push(`   - Mức giảm: -${Math.abs(r.bonusDiff).toLocaleString('vi-VN')} ₫ (Từ ${r.bonusOld.toLocaleString('vi-VN')} ₫ ➔ ${r.bonusCurrent.toLocaleString('vi-VN')} ₫)`);
                }
                lines.push(`   - Thứ hạng: ${rankText} (Hôm qua: ${rankOldText}) | HT: ${r.completionCurrent.toFixed(1)}% (${r.completionDiff >= 0 ? '+' : ''}${r.completionDiff.toFixed(1)}%)`);
              });
            }
          } else {
            lines.push(`📊 Tổng: ${rows.filter((r: any) => r.bonusCurrent === 0).length}/${rows.length} ngành chưa vào Top ${limit}`);
            lines.push(``);
            lines.push(`🚨 CẦN CẢI THIỆN:`);
            rows.filter((r: any) => r.bonusCurrent === 0).forEach((r: any, i: number) => {
              const rankText = r.completionRankCurrent > 0 ? `HT #${r.completionRankCurrent}` : (r.exceededRankCurrent > 0 ? `VT #${r.exceededRankCurrent}` : 'N/A');
              lines.push(`🔻 #${i + 1}. ${r.categoryName} - ${r.completionCurrent.toFixed(1)}% (${rankText})`);
            });
          }
          lines.push(``);
          lines.push(`💡 Cần tập trung tư vấn chốt deal ở các ngành trên để lọt Top ${limit}!`);
          generated = lines.join('\n');
        } else {
          // MẪU 3: Tóm tắt toàn bộ
          const lines: string[] = [];
          lines.push(`📝 TÓM TẮT THI ĐUA & SO SÁNH VỚI HÔM QUA:`);
          lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          lines.push(`🎯 Tổng ngành: ${rows.length}`);
          lines.push(`💰 Tổng thưởng hôm nay: ${totalBonus.toLocaleString('vi-VN')} ₫`);
          if (isComparing) {
            lines.push(`💰 Tổng thưởng hôm qua: ${totalBonusOld.toLocaleString('vi-VN')} ₫`);
            lines.push(`📊 Chênh lệch: ${diff >= 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} ₫ (${diff >= 0 ? '▲ Tăng' : '🔻 Giảm'})`);
            lines.push(`🔴 Ngành giảm/mất thưởng: ${stats.decreasedRows.length} ngành (-${stats.totalDecreasedAmount.toLocaleString('vi-VN')} ₫)`);
            lines.push(`🟢 Ngành tăng/mới đạt thưởng: ${stats.increasedRows.length} ngành (+${stats.totalIncreasedAmount.toLocaleString('vi-VN')} ₫)`);
          }
          lines.push(`✅ Đạt thưởng: ${stats.bonusRows.length}/${rows.length}`);
          lines.push(`❌ Chưa đạt: ${rows.length - stats.bonusRows.length}/${rows.length}`);
          lines.push(``);
          lines.push(`📊 BẢNG XẾP HẠNG CHI TIẾT:`);
          rows.forEach((r: any, i: number) => {
            let icon = (r.bonusCurrent || 0) > 0 ? '✅' : '🔴';
            let bonusStr = '';
            if (r.isBonusLost) {
              icon = '🚨';
              bonusStr = ` → [MẤT THƯỞNG: -${r.bonusOld.toLocaleString('vi-VN')} ₫]`;
            } else if (r.isBonusDecreased) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫ (🔻 -${Math.abs(r.bonusDiff).toLocaleString('vi-VN')} ₫)`;
            } else if (r.isBonusGained) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫ (✨ Mới đạt)`;
            } else if (r.isBonusIncreased) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫ (▲ +${r.bonusDiff.toLocaleString('vi-VN')} ₫)`;
            } else if (r.bonusCurrent > 0) {
              bonusStr = ` → +${r.bonusCurrent.toLocaleString('vi-VN')} ₫`;
            }
            const rankText = r.completionRankCurrent > 0 ? `HT #${r.completionRankCurrent}` : (r.exceededRankCurrent > 0 ? `VT #${r.exceededRankCurrent}` : 'N/A');
            lines.push(`${icon} #${i + 1}. ${r.categoryName} - ${r.completionCurrent.toFixed(1)}% (${rankText})${bonusStr}`);
          });
          generated = lines.join('\n');
        }

        setThuongStComment(generated);
        setShowThuongStComment(true);
        setThuongStTemplate(template);
        setCopiedThuongStComment(false);
      } catch (err) {
        console.error('Error generating AI comment:', err);
      } finally {
        setIsGeneratingAI(false);
      }
    }, 400);
    return thuongStComment;
  };

  const filteredThuongStRows = React.useMemo(() => {
    let rows = [...comparedThuongStRows];
    if (rows.length === 0) {
      return { yellow: [], green: [], blue: [], all: [], yellowAvg: 0, greenAvg: 0, blueAvg: 0 };
    }

    const limit = selectedStoreExcelData.limit || 7;

    // 1. Status filter
    if (bonusFilterTab === 'BONUS') {
      rows = rows.filter((r: any) => (r.bonusCurrent || 0) > 0);
    } else if (bonusFilterTab === 'NEAR') {
      rows = rows.filter((r: any) => (r.bonusCurrent || 0) === 0 && r.completionCurrent >= 82);
    } else if (bonusFilterTab === 'NOT_YET') {
      rows = rows.filter((r: any) => (r.bonusCurrent || 0) === 0 && r.completionCurrent < 82);
    } else if (bonusFilterTab === 'DECREASED') {
      rows = rows.filter((r: any) => r.isBonusDecreased);
    } else if (bonusFilterTab === 'INCREASED') {
      rows = rows.filter((r: any) => r.isBonusIncreased);
    } else if (bonusFilterTab === 'EXCEEDED') {
      rows = rows.filter((r: any) => (r.completionRankCurrent > 0 && r.completionRankCurrent <= limit));
    }

    // 2. Category group filter
    if (thuongStGroupFilter !== 'ALL') {
      rows = rows.filter((r: any) => getCategoryGroup(r.categoryName) === thuongStGroupFilter);
    }

    // 3. Search query filter
    if (thuongStSearchQuery.trim() !== '') {
      const q = normalize(thuongStSearchQuery.trim());
      rows = rows.filter((r: any) => normalize(r.categoryName || '').includes(q));
    }

    // 4. Optional sorting modes
    if (thuongStViewMode === 'SORT_HT_DESC') {
      rows.sort((a: any, b: any) => (b.completionCurrent || 0) - (a.completionCurrent || 0));
    } else if (thuongStViewMode === 'SORT_BONUS_DESC') {
      rows.sort((a: any, b: any) => (b.bonusCurrent || 0) - (a.bonusCurrent || 0) || (b.completionCurrent || 0) - (a.completionCurrent || 0));
    }

    const yellowGroup: any[] = [];
    const greenGroup: any[] = [];
    const blueGroup: any[] = [];

    rows.forEach((row: any) => {
      const group = getCategoryGroup(row.categoryName);
      if (group === 'yellow') yellowGroup.push(row);
      else if (group === 'green') greenGroup.push(row);
      else blueGroup.push(row);
    });

    const calcAvg = (arr: any[]) =>
      arr.length > 0 ? arr.reduce((s, r) => s + (r.completionCurrent || 0), 0) / arr.length : 0;

    return {
      yellow: yellowGroup,
      green: greenGroup,
      blue: blueGroup,
      all: rows,
      yellowAvg: calcAvg(yellowGroup),
      greenAvg: calcAvg(greenGroup),
      blueAvg: calcAvg(blueGroup)
    };
  }, [comparedThuongStRows, bonusFilterTab, thuongStGroupFilter, thuongStSearchQuery, thuongStViewMode, selectedStoreExcelData.limit]);

  const handleExportThuongStExcel = () => {
    const rowsToExport = filteredThuongStRows.all;
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('Không có dữ liệu để xuất Excel!');
      return;
    }

    const groupLabelMap: Record<'yellow' | 'green' | 'blue', string> = {
      yellow: 'NHÓM ĐIỆN THOẠI - CÔNG NGHỆ',
      green: 'NHÓM TÀI CHÍNH - DỊCH VỤ',
      blue: 'NHÓM ĐIỆN MÁY - GIA DỤNG'
    };

    const sheetData = rowsToExport.map((row: any, idx: number) => {
      const grp = getCategoryGroup(row.categoryName);
      const baseRecord: Record<string, any> = {
        'STT': idx + 1,
        'Siêu thị': row.storeName || selectedStoreFilter,
        'Phân nhóm': groupLabelMap[grp],
        'Nhóm hàng': row.categoryName,
        'Hoàn thành dự kiến (%)': Number((row.completionCurrent || 0).toFixed(1)),
        'Hạng HT.Target (Theo kênh)': row.completionRankCurrent > 0 ? row.completionRankCurrent : '-',
        'Hạng Vượt Trội (DT/SL theo kênh)': row.exceededRankCurrent > 0 ? row.exceededRankCurrent : '-',
        'Thưởng dự kiến (VNĐ)': row.bonusCurrent || 0
      };
      if (isComparing) {
        baseRecord['Thưởng hôm qua (VNĐ)'] = row.bonusOld || 0;
        baseRecord['Chênh lệch thưởng (VNĐ)'] = row.bonusDiff || 0;
      }
      return baseRecord;
    });

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Thuong_Thi_Dua_ST');
    const safeStore = String(selectedStoreFilter || 'SieuThi').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Thuong_Thi_Dua_${safeStore}.xlsx`);
  };

  const totalBonusSum = React.useMemo(() => {
    return thuongStStats.totalBonusCurrent;
  }, [thuongStStats]);

  const toggleThuongStGroupCollapse = (group: 'yellow' | 'green' | 'blue') => {
    setCollapsedThuongStGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const renderThuongStGroupHeader = (group: 'yellow' | 'green' | 'blue', groupRows: any[], groupAvg: number) => {
    if (groupRows.length === 0) return null;
    const isCollapsed = collapsedThuongStGroups[group];

    const config = {
      yellow: {
        title: 'NHÓM ĐIỆN THOẠI - CÔNG NGHỆ',
        rowBg: 'linear-gradient(90deg, #FFE4DF 0%, #FFF0ED 55%, #FFE7E2 100%)',
        borderColor: '#F6C2B8',
        circleBg: '#E54839',
        iconBoxBg: 'linear-gradient(135deg, #F25746 0%, #D93829 100%)',
        titleColor: '#7A2017',
        subTextColor: '#8C2D23',
        badgeBg: 'rgba(255,255,255,0.82)',
        badgeBorder: '#F3B7AC',
        Icon: Smartphone
      },
      green: {
        title: 'NHÓM TÀI CHÍNH - DỊCH VỤ',
        rowBg: 'linear-gradient(90deg, #D3F8E6 0%, #E6FCF1 55%, #D8F9E9 100%)',
        borderColor: '#A3E8C7',
        circleBg: '#079B78',
        iconBoxBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        titleColor: '#065F46',
        subTextColor: '#047857',
        badgeBg: 'rgba(255,255,255,0.82)',
        badgeBorder: '#9CE4C2',
        Icon: CreditCard
      },
      blue: {
        title: 'NHÓM ĐIỆN MÁY - GIA DỤNG',
        rowBg: 'linear-gradient(90deg, #D9EAFF 0%, #EBF3FF 55%, #DFEDFF 100%)',
        borderColor: '#B3D1FF',
        circleBg: '#1769FF',
        iconBoxBg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        titleColor: '#1E3A8A',
        subTextColor: '#1D4ED8',
        badgeBg: 'rgba(255,255,255,0.82)',
        badgeBorder: '#ADCBFF',
        Icon: Monitor
      }
    }[group];

    const GroupIcon = config.Icon;

    return (
      <tr
        key={`group-header-${group}`}
        onClick={() => toggleThuongStGroupCollapse(group)}
        className="cursor-pointer select-none transition-opacity hover:opacity-95 h-[42px]"
        style={{ background: config.rowBg }}
      >
        <td
          colSpan={6}
          className="px-3.5 py-1.5 border-y"
          style={{ borderColor: config.borderColor }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Circle indicator + Group icon box + Group Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: config.circleBg }}
              >
                {isCollapsed ? <ChevronDown size={11} strokeWidth={3} /> : <ChevronUp size={11} strokeWidth={3} />}
              </span>
              <span
                className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-white shrink-0"
                style={{ background: config.iconBoxBg }}
              >
                <GroupIcon size={15} strokeWidth={2.4} />
              </span>
              <span
                className="text-[12.5px] sm:text-[13px] font-black uppercase tracking-wide truncate"
                style={{ color: config.titleColor }}
              >
                {config.title}
              </span>
            </div>

            {/* Right: Group count badge + Average Completion + Collapse chevron */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
                style={{
                  backgroundColor: config.badgeBg,
                  borderColor: config.badgeBorder,
                  color: config.titleColor
                }}
              >
                {groupRows.length} nhóm hàng
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11.5px] font-semibold hidden sm:inline" style={{ color: config.subTextColor }}>
                  Hoàn thành TB
                </span>
                <span className="text-[13.5px] sm:text-[14.5px] font-black" style={{ color: config.titleColor }}>
                  {groupAvg.toFixed(1)}%
                </span>
              </div>
              <span
                className="w-[22px] h-[22px] rounded-md flex items-center justify-center bg-white/75 border"
                style={{ borderColor: config.badgeBorder, color: config.titleColor }}
              >
                {isCollapsed ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronUp size={13} strokeWidth={2.5} />}
              </span>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderThuongStRow = (row: any, idx: number, group: 'yellow' | 'green' | 'blue', customStt?: number) => {
    let dotColor = 'bg-[#F97316]';
    if (group === 'green') dotColor = 'bg-[#079B78]';
    else if (group === 'blue') dotColor = 'bg-[#1769FF]';

    const isCompletionRankHighlighted = row.completionRankCurrent > 0 && row.completionRankCurrent <= selectedStoreExcelData.limit;
    const isExceededRankHighlighted = row.exceededRankCurrent > 0 && row.exceededRankCurrent <= selectedStoreExcelData.limit;

    const completionVal = row.completionCurrent || 0;
    const completionFormatted = `${completionVal.toFixed(1)}%`;
    const barPercent = completionVal <= 0 ? 0 : Math.min(100, Math.max(8, completionVal));
    const isTargetMet = completionVal >= 100;

    // Calculate sequential index across groups
    let stt = customStt ?? (idx + 1);
    if (customStt === undefined) {
      if (group === 'green') {
        stt += filteredThuongStRows.yellow.length;
      } else if (group === 'blue') {
        stt += filteredThuongStRows.yellow.length + filteredThuongStRows.green.length;
      }
    }

    const isEven = stt % 2 === 0;

    return (
      <tr
        key={`${group}-${row.categoryName || idx}-${stt}`}
        className={`${isEven ? 'bg-[#F8FAFD]' : 'bg-white'} ${row.isBonusLost ? 'bg-rose-50/40' : ''} hover:bg-[#EDF5FF] transition-colors h-[42px]`}
      >
        {/* Col 1: STT */}
        <td className="px-1.5 py-1 text-[12.5px] font-bold text-[#475569] text-center border-r border-b border-[#E6EEF6]">
          {stt}
        </td>

        {/* Col 2: NHÓM HÀNG */}
        <td className="px-3 py-1 border-r border-b border-[#E6EEF6] text-left font-bold text-[12.5px] uppercase text-[#172B4D] truncate" title={row.categoryName}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
            <span className="truncate font-extrabold tracking-tight text-[#172B4D]">{row.categoryName}</span>
            {isComparing && row.isBonusLost && (
              <span className="px-1.5 py-0.5 rounded bg-[#F04464] text-white text-[9.5px] font-black shrink-0">
                MẤT THƯỞNG
              </span>
            )}
          </div>
        </td>

        {/* Col 3: HOÀN THÀNH (DỰ KIẾN) with Progress Bar */}
        <td className="px-2.5 py-1 border-r border-b border-[#E6EEF6] text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="w-[50px] text-right font-extrabold text-[12.5px] text-[#172B4D] shrink-0 tabular-nums">
              {completionFormatted}
            </span>
            <div className="relative w-[72px] sm:w-[88px] h-[10px] rounded-full bg-[#E5ECF4] overflow-hidden shrink-0">
              {barPercent > 0 && (
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${barPercent}%`,
                    background: isTargetMet
                      ? 'linear-gradient(90deg, #079B78 0%, #10B981 100%)'
                      : 'linear-gradient(90deg, #1769FF 0%, #3B82F6 100%)'
                  }}
                />
              )}
            </div>
            {isComparing && row.hasComparison && Math.abs(row.completionDiff) >= 0.05 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 tabular-nums ${
                  row.completionDiff > 0
                    ? 'bg-[#D5F7E8] text-[#079B78]'
                    : 'bg-[#FFE4E9] text-[#E11D48]'
                }`}
              >
                {row.completionDiff > 0 ? `▲ +${row.completionDiff.toFixed(1)}%` : `▼ ${Math.abs(row.completionDiff).toFixed(1)}%`}
              </span>
            )}
          </div>
        </td>

        {/* Col 4: HẠNG H.TARGET (THEO KÊNH) */}
        <td className="px-2 py-1 border-r border-b border-[#E6EEF6] text-center text-[12.5px]">
          <div className="flex flex-col items-center justify-center leading-tight">
            {isCompletionRankHighlighted ? (
              <span className="inline-flex items-center justify-center min-w-[34px] h-[22px] px-2.5 rounded-full bg-[#079B78] text-white font-extrabold text-[12px]">
                #{row.completionRankCurrent}
              </span>
            ) : (
              <span className="font-bold text-[#334155]">
                {row.completionRankCurrent === 0 ? '-' : row.completionRankCurrent}
              </span>
            )}
            {isComparing && row.hasComparison && row.completionRankDiff !== 0 && (
              <span className={`text-[10px] font-extrabold mt-0.5 ${row.completionRankDiff > 0 ? 'text-[#079B78]' : 'text-[#E11D48]'}`}>
                {row.completionRankDiff > 0 ? `▲ +${row.completionRankDiff} bậc` : `▼ ${Math.abs(row.completionRankDiff)} bậc`}
              </span>
            )}
          </div>
        </td>

        {/* Col 5: HẠNG VƯỢT TRỘI (DT/SL THEO KÊNH) */}
        <td className="px-2 py-1 border-r border-b border-[#E6EEF6] text-center text-[12.5px]">
          <div className="flex flex-col items-center justify-center leading-tight">
            {isExceededRankHighlighted ? (
              <span className="inline-flex items-center justify-center min-w-[34px] h-[22px] px-2.5 rounded-full bg-[#079B78] text-white font-extrabold text-[12px]">
                #{row.exceededRankCurrent}
              </span>
            ) : (
              <span className="font-bold text-[#334155]">
                {row.exceededRankCurrent === 0 ? '-' : row.exceededRankCurrent}
              </span>
            )}
            {isComparing && row.hasComparison && row.exceededRankDiff !== 0 && (
              <span className={`text-[10px] font-extrabold mt-0.5 ${row.exceededRankDiff > 0 ? 'text-[#079B78]' : 'text-[#E11D48]'}`}>
                {row.exceededRankDiff > 0 ? `▲ +${row.exceededRankDiff} bậc` : `▼ ${Math.abs(row.exceededRankDiff)} bậc`}
              </span>
            )}
          </div>
        </td>

        {/* Col 6: THƯỞNG DỰ KIẾN */}
        <td className="px-3 py-1 border-b border-[#E6EEF6] text-right">
          {!isComparing ? (
            row.bonusCurrent > 0 ? (
              <div className="inline-flex items-center justify-end gap-1.5">
                <span className="text-amber-400 text-[12px] leading-none">✨</span>
                <span className="text-[13px] font-black text-[#E11D48] tabular-nums whitespace-nowrap">
                  +{row.bonusCurrent.toLocaleString('vi-VN')} đ
                </span>
              </div>
            ) : (
              <span className="text-[13px] text-[#94A3B8] font-semibold">-</span>
            )
          ) : (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {row.isBonusLost ? (
                <>
                  <span className="text-[12px] font-bold text-slate-400">0 đ</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FFE4E9] border border-[#F8BBC6] text-[#E11D48] text-[10px] font-extrabold whitespace-nowrap">
                    🚨 -{row.bonusOld.toLocaleString('vi-VN')} đ
                  </span>
                </>
              ) : row.isBonusDecreased ? (
                <>
                  <span className="text-[13px] font-black text-[#E11D48] tabular-nums whitespace-nowrap">
                    +{row.bonusCurrent.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FFE4E9] border border-[#F8BBC6] text-[#E11D48] text-[10px] font-extrabold whitespace-nowrap">
                    🔻 -{Math.abs(row.bonusDiff).toLocaleString('vi-VN')} đ
                  </span>
                </>
              ) : row.isBonusGained ? (
                <>
                  <span className="text-amber-400 text-[12px] leading-none">✨</span>
                  <span className="text-[13px] font-black text-[#E11D48] tabular-nums whitespace-nowrap">
                    +{row.bonusCurrent.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#D5F7E8] border border-[#9FE3C6] text-[#067A5B] text-[10px] font-extrabold uppercase whitespace-nowrap">
                    MỚI ĐẠT
                  </span>
                </>
              ) : row.isBonusIncreased ? (
                <>
                  <span className="text-amber-400 text-[12px] leading-none">✨</span>
                  <span className="text-[13px] font-black text-[#E11D48] tabular-nums whitespace-nowrap">
                    +{row.bonusCurrent.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#D5F7E8] border border-[#9FE3C6] text-[#067A5B] text-[10px] font-extrabold whitespace-nowrap">
                    ▲ +{row.bonusDiff.toLocaleString('vi-VN')} đ
                  </span>
                </>
              ) : row.bonusCurrent > 0 ? (
                <>
                  <span className="text-amber-400 text-[12px] leading-none">✨</span>
                  <span className="text-[13px] font-black text-[#E11D48] tabular-nums whitespace-nowrap">
                    +{row.bonusCurrent.toLocaleString('vi-VN')} đ
                  </span>
                </>
              ) : (
                <span className="text-[13px] text-[#94A3B8] font-semibold">-</span>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };





  // Track whether the initial load has completed — suppress loading overlay on store switches
  const hasInitiallyLoaded = useRef(false);
  useEffect(() => {
    if (!isLoading && !isLoadingStoreRevenue) {
      hasInitiallyLoaded.current = true;
    }
  }, [isLoading, isLoadingStoreRevenue]);

  const isInitialLoading = !hasInitiallyLoaded.current && (isLoading || isLoadingStoreRevenue);

  // Sync maKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && userProfile.ma_kho !== maKho) {
      setMaKho(userProfile.ma_kho);
      localStorage.setItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile?.ma_kho]);

  // Sync maKho from report data if available
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      const firstMarket = filteredMarkets[0];
      if (firstMarket.ma_kho) {
        const detectedMaKho = firstMarket.ma_kho.toString().trim().replace(/^0+/, '');
        if (detectedMaKho && detectedMaKho !== maKho) {
          console.log('[LuyKe] Detected ma_kho from report:', detectedMaKho);
          setMaKho(detectedMaKho);
        }
      }
    }
  }, [filteredMarkets, maKho]);

  // Filter out any supermarkets containing (KHO BÁN HÀNG LƯU ĐỘNG)
  const filteredDisplayData = React.useMemo(() => {
    return {
      ...displayData,
      markets: (displayData.markets || []).filter(
        (m: any) => !isKhoLuuDong(m.name)
      ),
      categories: (displayData.categories || []).filter(
        (c: any) => !c.marketName || !isKhoLuuDong(c.marketName)
      )
    };
  }, [displayData]);

  // Pre-filter markets by the current store filter so the overview dashboard
  // only shows the store(s) matching the selected bộ lọc
  const marketsForDashboard = React.useMemo(() => {
    if (marketFilter === 'ALL') return filteredDisplayData.markets;
    const normFilter = normalize(marketFilter);
    return filteredDisplayData.markets.filter((m: any) => {
      const normName = normalize(m.name);
      return normName.includes(normFilter) || normFilter.includes(normName);
    });
  }, [filteredDisplayData.markets, marketFilter]);

  // PERF: Sync stName and revenue fields when marketFilter or data changes
  // Only trigger on external changes (marketFilter, filteredDisplayData.markets, allStoreTargets)
  // Uses functional state updates and isolates dependencies to prevent re-render cascade
  useEffect(() => {
    if (marketFilter === 'ALL') return;
    const normFilter = normalize(marketFilter);
    const market = (filteredDisplayData.markets || []).find(
      (m: any) => {
        const nm = normalize(m.name);
        return nm === normFilter || nm.includes(normFilter) || normFilter.includes(nm);
      }
    ) || filteredMarkets.find(m => normalize(m.name) === normFilter);
    if (!market) return;

    setStName(prev => prev !== market.name ? market.name : prev);
    if (market.actualReal !== undefined) setStDtlk(prev => prev !== market.actualReal ? market.actualReal : prev);
    if (market.actualVirtual !== undefined) setStDtqd(prev => prev !== market.actualVirtual ? market.actualVirtual : prev);

    const dtDuKienQD = market.targetQD || 0;
    const percentHT = market.percentHT || 0;
    if (dtDuKienQD > 0) setStDtDuKienQD(prev => prev !== dtDuKienQD ? dtDuKienQD : prev);
    if (percentHT > 0) setStPercentHTTargetDuKienQD(prev => prev !== percentHT ? percentHT : prev);

    // Sync from DB cache (allStoreTargets) using normalized keys
    const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normFilter);
    const targetData = targetDataKey ? allStoreTargets[targetDataKey] : null;
    if (targetData && targetData.stPercentTarget !== undefined) {
      setStPercentTarget(prev => prev !== targetData.stPercentTarget ? targetData.stPercentTarget : prev);
    }
  }, [marketFilter, filteredDisplayData.markets, filteredMarkets, allStoreTargets]);

  // Sync marketFilter when filteredMarkets changes
  useEffect(() => {
    // Ensure the current marketFilter is valid within filteredMarkets,
    // otherwise auto-select the first available one.
    if (filteredMarkets.length > 0 && (marketFilter === 'ALL' || !filteredMarkets.some(m => m.name === marketFilter))) {
      setMarketFilter(filteredMarkets[0].name);
    }
  }, [filteredMarkets, marketFilter]);

  // NOTE: Luyke data auto-loads when currentStoreId changes (centralized in useLuykeData)

  // stTargetSauHeSo is synced from DB (KHAI BÁO > TARGET DOANH THU > TAGET SAU X HỆ SỐ)
  // — no local recalculation needed here

  // FastSync removed — allStoreTargets sync is handled in the unified effect above

  // Categories from LUỸ KẾ TĐ already have correct data:
  // cat.target = Column 3 (TARGET) and cat.revenue = Column 2 (LUỸ KẾ)
  // No adjustment needed — pass through raw parsed values directly.
  const adjustedCategories = filteredDisplayData.categories;

  // Filter categories by marketFilter (store button selection)
  const filteredCategories = React.useMemo(() => {
    let cats = adjustedCategories;
    if (marketFilter !== 'ALL') {
      const normFilter = normalize(marketFilter);
      const distinctCatMarkets = new Set(
        cats
          .map((c: any) => normalize(c.marketName || ''))
          .filter(Boolean)
      );
      cats = cats.filter((c: any) => {
        if (!c.marketName) return true;
        
        const normMarketName = normalize(c.marketName);
        if (!normMarketName || !normFilter) return true;
        
        if (
          normMarketName === normFilter ||
          normMarketName.includes(normFilter) ||
          normFilter.includes(normMarketName)
        ) {
          return true;
        }
        
        // Prevent cross-store bleed when switching stores or in multi-store clusters:
        // Filter out if multiple stores exist in categories/markets, or if c.marketName is an explicit valid store name that doesn't match marketFilter.
        if (
          distinctCatMarkets.size > 1 ||
          (filteredDisplayData.markets && filteredDisplayData.markets.length > 1) ||
          isValidStoreName(c.marketName)
        ) {
          return false;
        }
        return true;
      });
    }
    // Dedup by normalized name + type (prevent duplicate category rows from broad matching)
    const seen = new Set<string>();
    const deduped = cats.filter((c: any) => {
      const key = `${normalize(c.name || '')}__${c.type || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort categories by exact custom order specified by user
    deduped.sort((a: any, b: any) => getCustomCategoryIndex(a.name || '') - getCustomCategoryIndex(b.name || ''));

    // Fast O(1) Map lookup for TARGET THI ĐUA matching
    const targetMap = new Map<string, { adjustedTarget: number; percent?: number }>();
    (categoryTargets || []).forEach((t: any) => {
      if (typeof t.adjustedTarget === 'number') {
        targetMap.set(`${normalize(t.name)}__${t.type}`, {
          adjustedTarget: t.adjustedTarget,
          percent: t.percent
        });
      }
    });

    return deduped.map((cat: any) => {
      const entry = targetMap.get(`${normalize(cat.name)}__${cat.type}`);
      if (entry && (entry.adjustedTarget > 0 || entry.percent === 0)) {
        return {
          ...cat,
          target: entry.adjustedTarget
        };
      }
      return cat;
    });
  }, [adjustedCategories, marketFilter, filteredDisplayData.markets, categoryTargets]);

  // Removed window focus re-processing to improve performance

  // Filter states
  const [catGroupFilter, setCatGroupFilter] = useState('ALL');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Column toggles & comments for V2 Category section
  const [showTargetCols, setShowTargetCols] = useState(true);
  const [sllkComment, setSllkComment] = useState('');
  const [dtlkComment, setDtlkComment] = useState('');
  const [showSllkComment, setShowSllkComment] = useState(false);
  const [showDtlkComment, setShowDtlkComment] = useState(false);

  // Nhận xét Doanh thu & Ngành hàng Modal State (BC THÁNG)
  const [isCategoryCommentModalOpen, setIsCategoryCommentModalOpen] = useState(false);
  const [selectedCategoryTemplate, setSelectedCategoryTemplate] = useState(0);
  const [categoryCommentText, setCategoryCommentText] = useState('');
  const [copiedCategoryComment, setCopiedCategoryComment] = useState(false);

  // Bộ lọc ẩn ngành hàng SL & DT (CHỈ ÁP DỤNG RIÊNG CHO BC THÁNG > TỔNG QUAN)
  const [hiddenCatsSL, setHiddenCatsSL] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bcthang_tongquan_hidden_cats_sl');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [hiddenCatsDT, setHiddenCatsDT] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bcthang_tongquan_hidden_cats_dt');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCategoryFilterModalOpen, setIsCategoryFilterModalOpen] = useState(false);
  const [categoryFilterActiveTab, setCategoryFilterActiveTab] = useState<'SL' | 'DT'>('SL');
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('bcthang_tongquan_hidden_cats_sl', JSON.stringify(hiddenCatsSL));
    } catch (e) {
      console.error(e);
    }
  }, [hiddenCatsSL]);

  useEffect(() => {
    try {
      localStorage.setItem('bcthang_tongquan_hidden_cats_dt', JSON.stringify(hiddenCatsDT));
    } catch (e) {
      console.error(e);
    }
  }, [hiddenCatsDT]);

  // Raw lists for SL & DT in BC Tháng > Tổng quan
  const rawCategoriesSL = useMemo(() => {
    return filteredCategories.filter((c: any) => c.type === 'SL' || c.type === 'ALL');
  }, [filteredCategories]);

  const rawCategoriesDT = useMemo(() => {
    return filteredCategories.filter((c: any) => c.type === 'DT' || c.type === 'ALL');
  }, [filteredCategories]);

  // Filtered lists with hidden items removed ONLY for BC THÁNG > TỔNG QUAN
  const visibleCategoriesSL = useMemo(() => {
    if (hiddenCatsSL.length === 0) return rawCategoriesSL;
    const hiddenSet = new Set(hiddenCatsSL.map(s => s.trim().toUpperCase()));
    return rawCategoriesSL.filter((c: any) => !hiddenSet.has((c.name || '').trim().toUpperCase()));
  }, [rawCategoriesSL, hiddenCatsSL]);

  const visibleCategoriesDT = useMemo(() => {
    if (hiddenCatsDT.length === 0) return rawCategoriesDT;
    const hiddenSet = new Set(hiddenCatsDT.map(s => s.trim().toUpperCase()));
    return rawCategoriesDT.filter((c: any) => !hiddenSet.has((c.name || '').trim().toUpperCase()));
  }, [rawCategoriesDT, hiddenCatsDT]);

  // Memoized sorted lists for SLLK and DTLK tables — prevents sorting inside JSX on every render
  const sortedCategoriesSL = useMemo(() => {
    return sortCategoryList(visibleCategoriesSL, sortModeSL);
  }, [visibleCategoriesSL, sortModeSL, daysPassed, totalDays]);

  const sortedCategoriesDT = useMemo(() => {
    return sortCategoryList(visibleCategoriesDT, sortModeDT);
  }, [visibleCategoriesDT, sortModeDT, daysPassed, totalDays]);

  const toggleHideCategorySL = (name: string) => {
    const key = (name || '').trim().toUpperCase();
    setHiddenCatsSL(prev => {
      const exists = prev.some(s => s.trim().toUpperCase() === key);
      if (exists) {
        return prev.filter(s => s.trim().toUpperCase() !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const toggleHideCategoryDT = (name: string) => {
    const key = (name || '').trim().toUpperCase();
    setHiddenCatsDT(prev => {
      const exists = prev.some(s => s.trim().toUpperCase() === key);
      if (exists) {
        return prev.filter(s => s.trim().toUpperCase() !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const showAllCategoriesSL = () => setHiddenCatsSL([]);
  const showAllCategoriesDT = () => setHiddenCatsDT([]);

  const hideAllCategoriesSL = () => {
    setHiddenCatsSL(rawCategoriesSL.map((c: any) => (c.name || '').trim().toUpperCase()));
  };

  const hideAllCategoriesDT = () => {
    setHiddenCatsDT(rawCategoriesDT.map((c: any) => (c.name || '').trim().toUpperCase()));
  };

  const hideAchievedCategoriesSL = () => {
    const achieved = rawCategoriesSL
      .filter((c: any) => {
        let rate = 0;
        if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
        return Math.round(rate) >= 100;
      })
      .map((c: any) => (c.name || '').trim().toUpperCase());
    setHiddenCatsSL(prev => Array.from(new Set([...prev, ...achieved])));
  };

  const hideAchievedCategoriesDT = () => {
    const achieved = rawCategoriesDT
      .filter((c: any) => {
        let rate = 0;
        if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
        return Math.round(rate) >= 100;
      })
      .map((c: any) => (c.name || '').trim().toUpperCase());
    setHiddenCatsDT(prev => Array.from(new Set([...prev, ...achieved])));
  };

  const formatCurrencyUnit = (num: number) => {
    const abs = Math.abs(Math.round(num));
    if (abs >= 1000) return `${Math.round(num).toLocaleString('vi-VN')} tỷ`;
    if (abs > 0) return `${Math.round(num).toLocaleString('vi-VN')} tr`;
    return '0';
  };

  // Cache parsed localStorage config to avoid repeated JSON.parse inside loops
  const clusterTargetConfigMap = useMemo(() => {
    try {
      const rawClusterCfg = localStorage.getItem('crm_cluster_store_target_config');
      if (rawClusterCfg) {
        const parsed = JSON.parse(rawClusterCfg);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  }, []);

  // Helper to resolve store target without flickering or cross-store fallback leakage
  const resolveMarketTarget = useCallback((market: any) => {
    if (!market) return { displayTargetQD: 0, percentTargetVal: 100, targetData: null };
    const normMarket = normalize(market.name);

    // 1. Match in allStoreTargets: prioritize exact match first, then substring
    const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normMarket)
      || Object.keys(allStoreTargets || {}).find(k => {
        const normK = normalize(k);
        return normK.includes(normMarket) || normMarket.includes(normK);
      });
    const targetData: any = targetDataKey ? allStoreTargets[targetDataKey] : null;

    // 2. Check popup "CẤU HÌNH TARGET" from cached config
    let clusterTargetConfig: any = null;
    const cfgKey = Object.keys(clusterTargetConfigMap).find(k => normalize(k) === normMarket)
      || Object.keys(clusterTargetConfigMap).find(k => {
        const nk = normalize(k);
        return nk.includes(normMarket) || normMarket.includes(nk);
      });
    if (cfgKey) clusterTargetConfig = clusterTargetConfigMap[cfgKey];

    const isCurrentActive = normalize(currentStoreId) === normMarket || normalize(stName) === normMarket;

    const percentTargetVal = clusterTargetConfig?.mucTieuPercent !== undefined
      ? Number(clusterTargetConfig.mucTieuPercent)
      : (Number((targetData as any)?.stPercentTarget) || (isCurrentActive ? Number(stPercentTarget) : 100) || 100);

    let displayTargetQD = 0;
    const dtDuKienQD = market.targetQD || 0;
    if (dtDuKienQD > 0) {
      displayTargetQD = Math.round(dtDuKienQD * (percentTargetVal / 100));
    } else if (clusterTargetConfig && Number(clusterTargetConfig.targetCungKyNam) > 0) {
      displayTargetQD = Math.round(Number(clusterTargetConfig.targetCungKyNam) * (percentTargetVal / 100));
    } else {
      const rawTargetQD = Number((targetData as any)?.stTargetQuyDoi) || (isCurrentActive ? stTargetQuyDoi : 0) || 0;

      displayTargetQD = rawTargetQD > 0
        ? Math.round(rawTargetQD * (percentTargetVal / 100))
        : (Number((targetData as any)?.stTargetSauHeSo) || (isCurrentActive ? stTargetSauHeSo : 0) || 0);
    }

    return {
      displayTargetQD,
      percentTargetVal,
      targetData
    };
  }, [allStoreTargets, currentStoreId, stName, stPercentTarget, stTargetQuyDoi, stTargetSauHeSo, clusterTargetConfigMap]);

  // Memoize LNTT lookup table once from clusterSummaryInput string — 100x faster than in-render regex loops
  const lnttByStoreMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!clusterSummaryInput) return map;

    const lines = clusterSummaryInput.split('\n').map((l: string) => l.trim()).filter(Boolean);
    let lnttColIdx = -1;
    let nameColIdx = -1;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('stt') || lower.includes('tên siêu thị') || lower.includes('tên miền') || lower.includes('dt hôm qua')) {
        const cols = line.split(/\t|\||\s{2,}/).map((c: string) => c.trim());
        nameColIdx = cols.findIndex((c: string) => {
          const l = c.toLowerCase();
          return l.includes('tên siêu thị') || l.includes('tên miền') || l.includes('siêu thị');
        });
        lnttColIdx = cols.findIndex((c: string) => {
          const l = c.toLowerCase();
          return (l.includes('% ht target') || l.includes('% ht') || l.includes('%ht')) && l.includes('lntt');
        });
        continue;
      }
      const cols = line.split(/\t|\||\s{2,}/).map((c: string) => c.trim());
      if (cols.length < 2) continue;

      let val = 0;
      if (lnttColIdx !== -1 && lnttColIdx < cols.length) {
        val = cleanNum(cols[lnttColIdx]);
      } else if (cols.length >= 11) {
        val = cleanNum(cols[10]);
      } else if (nameColIdx !== -1 && nameColIdx + 10 < cols.length) {
        val = cleanNum(cols[nameColIdx + 10]);
      }

      if (val > 0) {
        if (nameColIdx !== -1 && nameColIdx < cols.length) {
          const normName = normalize(cols[nameColIdx]);
          if (normName) map.set(normName, val);
        }
        cols.forEach((col: string) => {
          const normC = normalize(col);
          if (normC && normC.length >= 3 && !map.has(normC) && (normC.includes('dml') || normC.includes('dmm') || normC.includes('tgdd') || /\d{3,5}/.test(normC))) {
            map.set(normC, val);
          }
        });
      }
    }
    return map;
  }, [clusterSummaryInput]);

  const getLnttForMarket = useCallback((marketName: string, fallbackVal: number = 0) => {
    if (fallbackVal > 0) return fallbackVal;
    if (!marketName || lnttByStoreMap.size === 0) return 0;
    const normMarket = normalize(marketName);
    if (lnttByStoreMap.has(normMarket)) return lnttByStoreMap.get(normMarket)!;
    for (const [k, v] of lnttByStoreMap.entries()) {
      if (k.includes(normMarket) || normMarket.includes(k)) return v;
    }
    return 0;
  }, [lnttByStoreMap]);

  // Helper to build 3 comment templates for LuyKe Doanh thu & Ngành hàng
  const luykeCategoryCommentTemplates = React.useMemo(() => {
    const market = marketsForDashboard[0] || {
      name: maKho || 'Siêu Thị',
      targetQD: 0,
      actualVirtual: 0,
      actualReal: 0,
      percentHT: 0,
      installmentRate: 0,
      billCount: 0
    };

    const { displayTargetQD, targetData } = resolveMarketTarget(market);
    const actualVirtual = market.actualVirtual || 0;
    const actualReal = market.actualReal || 0;
    const percentHTVal = displayTargetQD > 0 ? Math.round((daysPassed > 0 && totalDays > 0 ? (((actualVirtual) / daysPassed) * totalDays) : actualVirtual) / displayTargetQD * 100 * 10) / 10 : 0;
    const dtlkVal = actualReal > 0 ? actualReal : (targetData?.stDtlk || 0);
    const dtqdVal = actualVirtual > 0 ? actualVirtual : (targetData?.stDtqd || 0);
    const percentQDVal = dtlkVal > 0 ? ((dtqdVal - dtlkVal) / dtlkVal) * 100 : (market.percentQD || 0);
    const tcRate = resolveLuykeTraChamRate(market.name);
    const installmentRate = (tcRate !== null && !isNaN(tcRate) && tcRate >= 0)
      ? (Math.round(tcRate * 10) / 10).toFixed(1)
      : (((market.installmentRate || market.percentTraGop || 0) > 0)
          ? (Math.round((market.installmentRate || market.percentTraGop) * 10) / 10).toFixed(1)
          : '0.0');
    const billCount = market.billCount || 0;

    const marketName = market.name || 'SIÊU THỊ';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN');
    const nowHeader = `${timeStr} NGÀY ${dateStr}`;

    const lnttVal = getLnttForMarket(market.name, market.percentHTTargetDuKienLNTT ?? (targetData as any)?.percentHTTargetDuKienLNTT ?? 0);

    const targetQD = formatCurrencyUnit(displayTargetQD || 0);
    const actualVirtualStr = formatCurrencyUnit(actualVirtual || 0);
    const percentQdStr = `${percentQDVal >= 0 ? '+' : ''}${percentQDVal.toFixed(1)}%`;

    // SL Categories (BC THÁNG > TỔNG QUAN)
    const slCats = visibleCategoriesSL.map((c: any) => {
      let rate = 0;
      if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
      const remaining = c.target - c.revenue;
      return { ...c, rate, remaining };
    });
    const slDone = slCats.filter(c => Math.round(c.rate) >= 100);
    const slNotDone = slCats.filter(c => Math.round(c.rate) < 100).sort((a, b) => b.remaining - a.remaining);
    const slTop = [...slCats].sort((a, b) => b.rate - a.rate);

    // DT Categories (BC THÁNG > TỔNG QUAN)
    const dtCats = visibleCategoriesDT.map((c: any) => {
      let rate = 0;
      if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
      const remaining = c.target - c.revenue;
      return { ...c, rate, remaining };
    });
    const dtDone = dtCats.filter(c => Math.round(c.rate) >= 100);
    const dtNotDone = dtCats.filter(c => Math.round(c.rate) < 100).sort((a, b) => b.remaining - a.remaining);
    const dtTop = [...dtCats].sort((a, b) => b.rate - a.rate);

    // Staff ranking if available in LuyKe
    const staffRows = selectedStoreExcelData?.rows || [];
    const sortedStaffs = [...staffRows].sort((a: any, b: any) => (b.percentHT || 0) - (a.percentHT || 0));
    const topStaffs = sortedStaffs.slice(0, 3);
    const botStaffs = sortedStaffs.length > 3 ? sortedStaffs.slice(-3).reverse() : [];
    const staffAbove50 = staffRows.filter((s: any) => (s.percentHT || 0) >= 50).length;

    // MẪU 1: TOP/BOT NV (TOÀN DIỆN DOANH THU & NGÀNH HÀNG)
    let t1 = `📊 TỔNG HỢP LŨY KẾ DOANH THU & NGÀNH HÀNG - ${nowHeader}\n`;
    t1 += `🏪 Siêu thị: ${marketName}\n`;
    t1 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    t1 += `📈 KẾT QUẢ TỔNG QUAN:\n`;
    t1 += `🎯 Target QĐ: ${targetQD} || Thực Đạt: ${actualVirtualStr} (${percentHTVal}% HT)\n`;
    t1 += `💳 Tỷ trọng Trả Góp: ${installmentRate}% || % QĐ: ${percentQdStr} || %LNTT: ${Math.round(lnttVal)}%\n`;
    if (staffRows.length > 0) {
      t1 += `🎯 Tổng NV: ${staffRows.length} || ĐẠT trên 50%: ${staffAbove50}/${staffRows.length}\n`;
    }
    t1 += `📦 Tiến độ Ngành Hàng: SL (${slDone.length}/${slCats.length}) || DT (${dtDone.length}/${dtCats.length})\n\n`;

    if (topStaffs.length > 0 && topStaffs[0].name) {
      t1 += `🏆 TOP 3 DẪN ĐẦU:\n`;
      topStaffs.forEach((s: any, idx: number) => {
        t1 += `🔺 #${idx + 1}. ${s.name || s.id} (${Math.round(s.percentHT || 0)}% HT - ${Math.round(s.revenue || s.actualVirtual || 0)} tr)\n`;
      });
      t1 += `\n`;
    }

    if (botStaffs.length > 0 && botStaffs[0].name) {
      t1 += `⚠️ BOTTOM 3 CẦN TĂNG TỐC:\n`;
      botStaffs.forEach((s: any) => {
        t1 += `🔻 ${s.name || s.id}: ${Math.round(s.percentHT || 0)}% HT (${Math.round(s.revenue || s.actualVirtual || 0)} tr)\n`;
      });
      t1 += `\n`;
    }

    if (dtTop.filter(c => c.rate >= 100).length > 0 || slTop.filter(c => c.rate >= 100).length > 0) {
      t1 += `🌟 TOP NGÀNH HÀNG ĐẠT CHỈ TIÊU LUỸ KẾ:\n`;
      dtTop.filter(c => c.rate >= 100).slice(0, 3).forEach(c => {
        t1 += `✨ DT: ${c.name} (${Math.round(c.rate)}% - ${Math.round(c.revenue).toLocaleString('vi-VN')} tr)\n`;
      });
      slTop.filter(c => c.rate >= 100).slice(0, 3).forEach(c => {
        t1 += `✨ SL: ${c.name} (${Math.round(c.rate)}% - ${Math.round(c.revenue).toLocaleString('vi-VN')})\n`;
      });
      t1 += `\n`;
    }

    if (dtNotDone.length > 0 || slNotDone.length > 0) {
      t1 += `🔴 NGÀNH HÀNG CẦN TẬP TRUNG TĂNG TỐC:\n`;
      dtNotDone.slice(0, 4).forEach(c => {
        t1 += `❌ DT: ${c.name} (${Math.round(c.rate)}% | Còn thiếu: ${c.remaining > 0 ? c.remaining.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0} tr)\n`;
      });
      slNotDone.slice(0, 4).forEach(c => {
        t1 += `❌ SL: ${c.name} (${Math.round(c.rate)}% | Còn thiếu: ${c.remaining > 0 ? Math.round(c.remaining).toLocaleString('vi-VN') : 0})\n`;
      });
      t1 += `\n`;
    }

    t1 += `💪 Toàn đội tiếp tục bứt phá để hoàn thành 100% mục tiêu tháng nhé! 🔥`;

    // MẪU 2: DS CẦN TĂNG TỐC
    let t2 = `⚠️ DANH SÁCH CẦN TĂNG TỐC LUỸ KẾ - ${nowHeader}\n`;
    t2 += `🏪 Siêu thị: ${marketName} (TGSD: ${daysPassed}/${totalDays} ngày)\n`;
    t2 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    t2 += `🎯 TIẾN ĐỘ DOANH THU: Đạt ${actualVirtualStr}/${targetQD} (Dự kiến: ${percentHTVal}% HT)\n`;
    t2 += `💳 Trả Góp: ${installmentRate}% | %LNTT: ${Math.round(lnttVal)}%\n\n`;

    if (dtNotDone.length > 0) {
      t2 += `🚨 CÁC NGÀNH HÀNG (DT) CHƯA ĐẠT KẾ HOẠCH:\n`;
      dtNotDone.forEach(c => {
        t2 += `• ${c.name}: Đạt ${Math.round(c.revenue).toLocaleString('vi-VN')}/${Math.round(c.target).toLocaleString('vi-VN')} tr (${Math.round(c.rate)}%) -> 🔴 CÒN THIẾU: ${c.remaining > 0 ? c.remaining.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0} tr\n`;
      });
      t2 += `\n`;
    }

    if (slNotDone.length > 0) {
      t2 += `🚨 CÁC NGÀNH HÀNG (SL) CHƯA ĐẠT KẾ HOẠCH:\n`;
      slNotDone.forEach(c => {
        t2 += `• ${c.name}: Đạt ${Math.round(c.revenue).toLocaleString('vi-VN')}/${Math.round(c.target).toLocaleString('vi-VN')} (${Math.round(c.rate)}%) -> 🔴 CÒN THIẾU: ${c.remaining > 0 ? Math.round(c.remaining).toLocaleString('vi-VN') : 0} cái\n`;
      });
      t2 += `\n`;
    }

    if (botStaffs.length > 0 && botStaffs[0].name) {
      t2 += `🔻 NHÂN SỰ CẦN ĐẨY MẠNH BỨT PHÁ:\n`;
      botStaffs.forEach((s: any) => {
        t2 += `• ${s.name || s.id}: ${Math.round(s.percentHT || 0)}% HT (${Math.round(s.revenue || s.actualVirtual || 0)} tr)\n`;
      });
      t2 += `\n`;
    }

    t2 += `🔥 Toàn đội tập trung bứt phá để hoàn thành chỉ tiêu tháng nhé!`;

    // MẪU 3: TÓM TẮT
    let t3 = `⚡ TÓM TẮT NHANH LUỸ KẾ DOANH THU & NGÀNH HÀNG\n`;
    t3 += `🏪 Siêu thị: ${marketName} (TGSD: ${daysPassed}/${totalDays} ngày)\n`;
    t3 += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    t3 += `📊 DTQĐ: ${actualVirtualStr}/${targetQD} (Dự kiến: ${percentHTVal}% HT)\n`;
    t3 += `💳 Trả Góp: ${installmentRate}% | 📊 %LNTT: ${Math.round(lnttVal)}%\n`;
    t3 += `📦 Ngành hàng Đạt: SL [${slDone.length}/${slCats.length}] | DT [${dtDone.length}/${dtCats.length}]\n`;
    if (dtNotDone.length > 0 || slNotDone.length > 0) {
      t3 += `🎯 Trọng tâm cần đẩy: ${[...dtNotDone.slice(0, 3), ...slNotDone.slice(0, 2)].map(c => c.name).join(', ')}\n`;
    }
    t3 += `🚀 Quyết tâm hoàn thành 100% mục tiêu tháng!`;

    return [
      {
        id: 1,
        title: 'MẪU 1: TOP/BOT NV',
        icon: '🏆',
        text: t1
      },
      {
        id: 2,
        title: 'MẪU 2: DS CẦN TĂNG TỐC',
        icon: '⚠️',
        text: t2
      },
      {
        id: 3,
        title: 'MẪU 3: TÓM TẮT',
        icon: '⚡',
        text: t3
      }
    ];
  }, [marketsForDashboard, allStoreTargets, stTargetSauHeSo, stTargetQuyDoi, stPercentTarget, daysPassed, totalDays, filteredCategories, visibleCategoriesSL, visibleCategoriesDT, selectedStoreExcelData, maKho, clusterSummaryInput]);

  const handleOpenCategoryCommentModal = () => {
    setCategoryCommentText(luykeCategoryCommentTemplates[selectedCategoryTemplate]?.text || luykeCategoryCommentTemplates[0]?.text || '');
    setIsCategoryCommentModalOpen(true);
    setCopiedCategoryComment(false);
  };

  const handleCopyCategoryComment = () => {
    navigator.clipboard.writeText(categoryCommentText).then(() => {
      setCopiedCategoryComment(true);
      setTimeout(() => setCopiedCategoryComment(false), 2500);
    });
  };

  const [excludedYcxStaffNames, setExcludedYcxStaffNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('BI_REAL_EXCLUDED_YCX_V1');
    return saved ? JSON.parse(saved) : [];
  });

  const clearData = () => {
    setClusterSummaryInput('');
    setClusterCategoryInput('');
    // ... clear other states
  };

  // Refs for capture
  const captureRefs = {
    overview: useRef<HTMLDivElement>(null),
    fullDashboard: useRef<HTMLDivElement>(null),
    overviewInternal: useRef<HTMLDivElement>(null),
    category: useRef<HTMLDivElement>(null),
    categorySL: useRef<HTMLDivElement>(null),
    categoryDT: useRef<HTMLDivElement>(null),
    thuongSt: useRef<HTMLDivElement>(null)
  };

  const captureOffscreenHelper = async (element: HTMLElement, fileName: string) => {
    setIsCapturing(true);
    startCaptureSession();
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const isSingleTable = fileName?.includes('_SL_') || fileName?.includes('_DT_') || fileName === 'BaoCaoThuongSt' || fileName?.includes('ThuongSt');
      const isThuongSt = fileName === 'BaoCaoThuongSt' || fileName?.includes('ThuongSt');
      
      // Desktop: Giữ nguyên 100% kích thước 1850px / 1000px / 1200px chuẩn
      // Mobile: Đủ rộng (1560px / 860px / 950px) để tiêu đề cột không bao giờ bị cắt chữ khi xuất ảnh chế độ mobile
      const targetWidthPx = isMobile
        ? (isThuongSt ? 950 : (isSingleTable ? 860 : 1560))
        : (isThuongSt ? 1200 : (isSingleTable ? 1000 : 1850));
      const targetWidth = `${targetWidthPx}px`;
      const exportScale = isMobile ? 1.8 : 2.5;

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.opacity = '0';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.zIndex = '-99999';
      tempContainer.style.width = targetWidth;
      tempContainer.style.minWidth = targetWidth;
      tempContainer.style.maxWidth = targetWidth;
      tempContainer.style.overflow = 'visible';
      (tempContainer.style as any).zoom = '1';

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '100%';
      clone.style.minWidth = '100%';
      clone.style.maxWidth = '100%';
      clone.style.boxSizing = 'border-box';
      clone.style.padding = '0';
      clone.style.margin = '0 auto';
      clone.style.backgroundColor = '#ffffff';

      // Unwrap AutoFitTable elements so they are never captured in a shrunk state
      const autofitEls = clone.querySelectorAll('.autofit-sizing-box, .autofit-content-box, .autofit-table-container, [data-autofit-sizing], [data-autofit-content], [data-autofit-container]');
      autofitEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.width = '100%';
        htmlEl.style.minWidth = '100%';
        htmlEl.style.maxWidth = 'none';
        htmlEl.style.height = 'auto';
        htmlEl.style.position = 'static';
        htmlEl.style.overflow = 'visible';
        htmlEl.style.transform = 'none';
      });

      // Hide no-capture elements, buttons (except inside ThuongSt toolbar/cards), and textareas
      clone.querySelectorAll(isThuongSt ? '.no-capture, textarea, .screenshot-comment' : '.no-capture, button, textarea, .screenshot-comment').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Zero-shadow export & backdrop-filter removal (Zero-Shadow Rule)
      clone.style.boxShadow = 'none';
      clone.style.filter = 'none';
      clone.style.backdropFilter = 'none';
      (clone.style as any).webkitBackdropFilter = 'none';
      clone.style.textShadow = 'none';

      clone.querySelectorAll('*').forEach(node => {
        const htmlEl = node as HTMLElement;
        if (htmlEl.style) {
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.textShadow = 'none';
          htmlEl.style.filter = 'none';
          htmlEl.style.backdropFilter = 'none';
          (htmlEl.style as any).webkitBackdropFilter = 'none';
        }
        if (htmlEl.classList) {
          htmlEl.classList.remove(
            'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow',
            'drop-shadow-sm', 'drop-shadow-md', 'drop-shadow-lg', 'drop-shadow-xl', 'drop-shadow-2xl', 'drop-shadow',
            'backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl'
          );
          // ★ CRITICAL: Remove ALL truncation classes to prevent text clipping in export
          htmlEl.classList.remove('truncate', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3');
        }
      });

      // ★ Force all elements that had truncate behavior to show full text
      clone.querySelectorAll('*').forEach(node => {
        const htmlEl = node as HTMLElement;
        const cs = htmlEl.style;
        if (cs.textOverflow === 'ellipsis') {
          cs.textOverflow = 'clip';
          cs.overflow = 'visible';
        }
      });

      // Ensure Executive Header Banner stays in desktop horizontal row layout with full desktop typography
      clone.querySelectorAll('.exec-header-banner').forEach(banner => {
        const htmlBanner = banner as HTMLElement;
        htmlBanner.style.setProperty('display', 'flex', 'important');
        htmlBanner.style.setProperty('flex-direction', 'row', 'important');
        htmlBanner.style.setProperty('align-items', 'stretch', 'important');
        htmlBanner.style.setProperty('justify-content', 'space-between', 'important');
        htmlBanner.style.setProperty('overflow', 'hidden', 'important');
        htmlBanner.style.setProperty('zoom', '1', 'important');

        htmlBanner.querySelectorAll('.exec-banner-left').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('padding', '14px 18px', 'important');
          htmlEl.style.setProperty('gap', '16px', 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-icon').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('width', '52px', 'important');
          htmlEl.style.setProperty('height', '52px', 'important');
          htmlEl.style.setProperty('border-radius', '16px', 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-icon svg').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('width', '26px', 'important');
          htmlEl.style.setProperty('height', '26px', 'important');
        });
        htmlBanner.querySelectorAll('h2').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('font-size', '26px', 'important');
          htmlEl.style.setProperty('font-weight', '900', 'important');
          htmlEl.style.setProperty('line-height', '1.15', 'important');
          htmlEl.style.setProperty('color', '#0B2545', 'important');
          htmlEl.style.setProperty('font-family', "'UTM Avo', sans-serif", 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-sub').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('display', 'none', 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-slash').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('width', '52px', 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-right').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('padding', '10px 22px 10px 14px', 'important');
          htmlEl.style.setProperty('gap', '18px', 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-kpi-label').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('font-size', '9.5px', 'important');
        });
        htmlBanner.querySelectorAll('.exec-banner-kpi-val').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.setProperty('font-size', '28px', 'important');
        });
      });

      // Explicitly style ONLY emerald/sky table banner headers with crisp bold text (excluding .exec-header-banner and .thuong-st-navy-header)
      clone.querySelectorAll('.bg-gradient-to-r:not(.exec-header-banner):not(.thuong-st-navy-header) h2, [class*="from-[#047857]"] h2, [class*="from-[#0284C7]"] h2').forEach(h2 => {
        const el = h2 as HTMLElement;
        if (el.closest('.exec-header-banner') || el.closest('.thuong-st-navy-header')) return;
        el.style.color = '#ffffff';
        el.style.fontFamily = "'UTM Avo', sans-serif";
        el.style.fontWeight = '900';
        el.style.fontSize = '26px';
        el.style.display = 'block';
        el.style.textAlign = 'center';
      });

      // Explicitly ensure section titles (like "CHI TIẾT NGÀNH HÀNG" and Store Name) are SOLID BLACK & explicitly named
      clone.querySelectorAll('h2, h3').forEach(header => {
        const el = header as HTMLElement;
        if (el.closest('.exec-header-banner') || el.closest('.thuong-st-navy-header')) return;
        const text = (el.textContent || '').trim().normalize('NFC').toUpperCase();
        if (text.includes('CHI TIẾT NGÀNH')) {
          el.textContent = 'CHI TIẾT NGÀNH HÀNG';
          el.style.color = '#0f172a';
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '900';
          el.style.textAlign = 'center';
          el.style.display = 'block';
          el.style.width = '100%';
          el.style.background = 'none';
          (el.style as any).webkitTextFillColor = '#0f172a';
        } else if (!el.closest('.bg-gradient-to-r') && !el.closest('[class*="from-[#047857]"]') && !el.closest('[class*="from-[#0284C7]"]')) {
          el.style.color = '#0f172a'; // Pure black text-slate-900
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '900';
        }
      });

      // Ensure subtitle lines in banners are white and visible (excluding .exec-header-banner)
      clone.querySelectorAll('.bg-gradient-to-r:not(.exec-header-banner) span, .bg-gradient-to-r:not(.exec-header-banner) p, .bg-gradient-to-r:not(.exec-header-banner) div, [class*="from-[#047857]"] span, [class*="from-[#0284C7]"] span').forEach(node => {
        const el = node as HTMLElement;
        if (el.closest('.exec-header-banner') || el.closest('.thuong-st-navy-header')) return;
        if (el.textContent && (el.textContent.includes('Luỹ kế:') || el.textContent.includes('Realtime:') || el.textContent.includes('ĐẠT') || el.textContent.includes('TGSD'))) {
          el.style.color = '#ffffff';
          el.style.fontFamily = "'UTM Avo', sans-serif";
          el.style.fontWeight = '700';
        }
      });

      // Ensure description texts outside banners stay readable slate
      clone.querySelectorAll('p').forEach(p => {
        const el = p as HTMLElement;
        if (!el.closest('.bg-gradient-to-r') && !el.closest('.thuong-st-navy-header')) {
          el.style.color = '#64748b';
        }
      });

      // Force 2 columns grid for overview (skip specific Thuong ST grids)
      const grids = clone.querySelectorAll('.grid, [class*="grid-cols-"]');
      grids.forEach(g => {
        const htmlG = g as HTMLElement;
        if (htmlG.classList.contains('thuong-st-kpi-grid') || htmlG.classList.contains('thuong-st-diff-grid') || htmlG.classList.contains('thuong-st-summary-grid')) {
          return;
        }
        if (htmlG.children.length === 6) {
          htmlG.style.display = 'grid';
          htmlG.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
          htmlG.style.gap = '16px';
          htmlG.style.width = '100%';
          htmlG.style.boxSizing = 'border-box';
        }
        if (htmlG.children.length === 2 && (htmlG.classList.contains('xl:grid-cols-2') || htmlG.classList.contains('grid-cols-1') || htmlG.classList.contains('grid'))) {
          htmlG.style.display = 'grid';
          htmlG.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
          htmlG.style.gap = '24px';
          htmlG.style.width = '100%';
          htmlG.style.alignItems = 'start';
          htmlG.style.boxSizing = 'border-box';
        }
      });

      // Top KPI Cards grid in BaoCaoThuongSt: 3 columns matching SaaS V2 design
      const kpiGrids = clone.querySelectorAll('.thuong-st-kpi-grid');
      kpiGrids.forEach(kg => {
        const htmlKg = kg as HTMLElement;
        htmlKg.style.display = 'grid';
        htmlKg.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
        htmlKg.style.gap = '14px';
        htmlKg.style.width = '100%';
        htmlKg.style.boxSizing = 'border-box';
      });

      // Summary 6 KPI Cards grid in BaoCaoThuongSt
      clone.querySelectorAll('.thuong-st-summary-grid').forEach(sg => {
        const htmlSg = sg as HTMLElement;
        htmlSg.style.display = 'grid';
        htmlSg.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
        htmlSg.style.gap = '10px';
        htmlSg.style.width = '100%';
        htmlSg.style.boxSizing = 'border-box';
      });

      // Card 3: 3rd column in 3-col grid
      clone.querySelectorAll('.thuong-st-card-3').forEach(c3 => {
        const htmlC3 = c3 as HTMLElement;
        htmlC3.style.gridColumn = 'auto';
        htmlC3.style.width = '100%';
        htmlC3.style.boxSizing = 'border-box';
      });

      // Card 3 Diff Grid: 2 stacked rows
      const diffGrids = clone.querySelectorAll('.thuong-st-diff-grid');
      diffGrids.forEach(dg => {
        const htmlDg = dg as HTMLElement;
        htmlDg.style.display = 'flex';
        htmlDg.style.flexDirection = 'column';
        htmlDg.style.gap = '8px';
        htmlDg.style.width = '100%';
        htmlDg.style.boxSizing = 'border-box';
      });

      // Ensure text inside diff badges never wraps or overlaps
      clone.querySelectorAll('.thuong-st-diff-grid *').forEach(node => {
        const el = node as HTMLElement;
        if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
          el.style.whiteSpace = 'nowrap';
          el.style.overflow = 'visible';
          el.style.textOverflow = 'clip';
        }
      });

      // Tables
      const tableContainers = clone.querySelectorAll('.overflow-x-auto, [class*="overflow-x-"]');
      tableContainers.forEach(tc => {
        const htmlTc = tc as HTMLElement;
        htmlTc.style.width = '100%';
        htmlTc.style.overflow = 'visible';
        htmlTc.style.boxSizing = 'border-box';
      });

      const tables = clone.querySelectorAll('table');
      tables.forEach(table => {
        const htmlTable = table as HTMLTableElement;
        htmlTable.style.width = '100%';
        htmlTable.style.minWidth = '100%';
        htmlTable.style.boxSizing = 'border-box';
        (htmlTable.style as any).zoom = '1';

        if (htmlTable.classList.contains('exec-cat-table')) {
          htmlTable.style.tableLayout = 'fixed';
          const colEls = htmlTable.querySelectorAll('colgroup col');
          const totalCols = colEls.length;
          let desktopColWidths: number[] = [];
          if (totalCols === 8) desktopColWidths = [44, 235, 84, 70, 68, 74, 92, 128];
          else if (totalCols === 7) desktopColWidths = [44, 255, 86, 74, 72, 78, 128];
          else if (totalCols === 6) desktopColWidths = [44, 285, 88, 86, 76, 84];
          colEls.forEach((col, idx) => {
            const htmlCol = col as HTMLElement;
            if (desktopColWidths[idx]) {
              if (idx === 1) {
                htmlCol.style.width = 'auto';
                htmlCol.style.minWidth = `${desktopColWidths[idx]}px`;
              } else {
                htmlCol.style.width = `${desktopColWidths[idx]}px`;
                htmlCol.style.minWidth = `${desktopColWidths[idx]}px`;
              }
            }
          });
        } else if (isSingleTable) {
          // Single table capture: auto-layout for natural column sizing
          htmlTable.style.tableLayout = 'auto';
          const colEls = htmlTable.querySelectorAll('colgroup col');
          colEls.forEach(col => {
            (col as HTMLElement).style.width = 'auto';
            (col as HTMLElement).style.minWidth = 'auto';
          });
        } else {
          htmlTable.style.tableLayout = 'fixed';
        }

        const cells = htmlTable.querySelectorAll('th, td');
        cells.forEach(cell => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.boxSizing = 'border-box';

          // Determine if this is a "name/label" cell (col 2, text-left)
          const isNameCell = htmlCell.classList.contains('text-left') ||
            (htmlCell.tagName === 'TD' && htmlCell.cellIndex === 1) ||
            (htmlCell.tagName === 'TH' && htmlCell.cellIndex === 1);

          if (isNameCell) {
            // ★ Name cells: ALLOW WRAPPING so no text is EVER cut off
            htmlCell.style.whiteSpace = 'normal';
            htmlCell.style.wordBreak = 'break-word';
            htmlCell.style.overflow = 'visible';
            htmlCell.style.textOverflow = 'clip';
            htmlCell.style.paddingLeft = '8px';
            htmlCell.style.paddingRight = '8px';
            if (isSingleTable) {
              htmlCell.style.minWidth = '160px';
            }
          } else {
            // Numeric cells: keep nowrap
            htmlCell.style.whiteSpace = 'nowrap';
            htmlCell.style.overflow = 'visible';
            htmlCell.style.textOverflow = 'clip';
            htmlCell.style.paddingLeft = '6px';
            htmlCell.style.paddingRight = '6px';
          }

          // ★ Force all child spans/divs inside cells to also be visible (no truncation)
          htmlCell.querySelectorAll('span, div').forEach(child => {
            const childEl = child as HTMLElement;
            childEl.style.overflow = 'visible';
            childEl.style.textOverflow = 'clip';
            if (isNameCell) {
              childEl.style.whiteSpace = 'normal';
              childEl.style.wordBreak = 'break-word';
              (childEl.style as any).webkitLineClamp = 'unset';
            }
          });
        });
      });

      // Ensure Exec StatCards & Enterprise Analytics Grid render with crisp desktop sizing on screenshot export
      clone.querySelectorAll('.enterprise-analytics-grid').forEach(g => {
        const htmlG = g as HTMLElement;
        htmlG.style.setProperty('display', 'grid', 'important');
        htmlG.style.setProperty('grid-template-columns', '5fr 3fr 4fr', 'important');
        htmlG.style.setProperty('gap', '16px', 'important');
        htmlG.style.setProperty('width', '100%', 'important');
        Array.from(htmlG.children).forEach(child => {
          (child as HTMLElement).style.setProperty('grid-column', 'auto', 'important');
        });
      });

      clone.querySelectorAll('.exec-stat-card').forEach(card => {
        const htmlCard = card as HTMLElement;
        htmlCard.style.setProperty('padding', '16px 16px 26px 16px', 'important');
        htmlCard.style.setProperty('border-radius', '16px', 'important');
        htmlCard.style.setProperty('min-height', '128px', 'important');
        htmlCard.querySelectorAll('.stat-card-badge').forEach(b => {
          const htmlB = b as HTMLElement;
          htmlB.style.setProperty('width', '32px', 'important');
          htmlB.style.setProperty('height', '32px', 'important');
        });
        htmlCard.querySelectorAll('.stat-card-title').forEach(t => {
          const htmlT = t as HTMLElement;
          const len = (htmlT.textContent || '').trim().length;
          htmlT.style.setProperty('font-size', len > 14 ? '10.5px' : '11.5px', 'important');
          htmlT.style.setProperty('font-weight', '900', 'important');
          htmlT.style.setProperty('white-space', 'nowrap', 'important');
        });
        htmlCard.querySelectorAll('.exec-stat-num').forEach(n => {
          const htmlN = n as HTMLElement;
          htmlN.style.setProperty('font-size', '30px', 'important');
          htmlN.style.setProperty('font-weight', '900', 'important');
        });
      });

      // Ensure StatCard badges & titles never wrap on screenshot export
      const statBadges = clone.querySelectorAll('.stat-card-badge, [class*="rounded-full"]');
      statBadges.forEach(b => {
        const htmlB = b as HTMLElement;
        htmlB.style.whiteSpace = 'nowrap';
        htmlB.style.flexWrap = 'nowrap';
        htmlB.querySelectorAll('span, div, p').forEach(s => {
          const htmlS = s as HTMLElement;
          htmlS.style.whiteSpace = 'nowrap';
          htmlS.style.wordBreak = 'keep-all';
          htmlS.style.overflow = 'hidden';
          htmlS.style.textOverflow = 'ellipsis';
        });
      });

      // Ensure Oswald font on StatNumbers
      const statNumbers = clone.querySelectorAll('[style*="Oswald"], .font-oswald');
      statNumbers.forEach(num => {
        const htmlNum = num as HTMLElement;
        htmlNum.style.fontFamily = "'Oswald', sans-serif";
        htmlNum.style.fontWeight = '700';
        htmlNum.style.whiteSpace = 'nowrap';
      });

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = isSingleTable ? '18px' : '24px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.borderRadius = isSingleTable ? '20px' : '28px';
      frameWrapper.style.width = targetWidth;
      frameWrapper.style.minWidth = targetWidth;
      frameWrapper.style.maxWidth = targetWidth;
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.appendChild(clone);
      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 150));

      const exactHeight = Math.max(frameWrapper.scrollHeight, frameWrapper.offsetHeight, clone.scrollHeight, 100);

      let dataUrl: string = '';
      try {
        const canvas = await html2canvas(frameWrapper, {
          scale: exportScale,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: targetWidthPx,
          windowWidth: targetWidthPx,
        });
        dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
          throw new Error('Canvas produced empty data URL');
        }
      } catch (h2cErr) {
        console.warn('html2canvas failed, fallback to domToPng:', h2cErr);
        dataUrl = await domToPng(frameWrapper, {
          scale: exportScale,
          backgroundColor: '#ffffff',
          width: targetWidthPx,
          height: exactHeight,
          features: { removeControlCharacter: true }
        });
      }

      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing offscreen:', err);
    } finally {
      const existingTemp = document.body.querySelector('div[style*="z-index: -99999"]');
      if (existingTemp) {
        document.body.removeChild(existingTemp);
      }
      endCaptureSession();
      setIsCapturing(false);
    }
  };

  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    await captureOffscreenHelper(ref.current, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 selection:bg-indigo-100 selection:text-indigo-900" style={{ fontFamily: '"Inter", sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .capturing-screenshot .no-capture { display: none !important; }
        .capturing-screenshot .capturing-screenshot-inline { display: inline !important; }
        
        /* Force CSS Grid columns to render identically to on-screen column layout during screenshot capture */
        .capturing-screenshot .force-grid-cols-6 {
          grid-template-columns: repeat(6, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
          display: grid !important;
        }
        .capturing-screenshot .force-grid-cols-1 {
          grid-template-columns: 1fr !important;
          display: grid !important;
        }
        
        /* Ensure no elements inside the capturing target crop their content */
        .capturing-screenshot .capturing-target,
        .capturing-screenshot .capturing-target *,
        .capturing-screenshot .overflow-hidden:not(.keep-overflow-hidden) {
          overflow: visible !important;
        }
      `}} />
      {/* Excel loading & processing overlay (Rendered via Portal to sit on top of Sidebar & Header) */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {(isProcessingData || isInitialLoading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/90 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center"
              >
                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-400 border-b-transparent border-l-transparent animate-spin"></div>
                  <FileSpreadsheet size={32} className="text-indigo-600 animate-bounce" />
                </div>
                
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-2">
                  {isProcessingData ? "Đang xử lý dữ liệu..." : "Đang tải dữ liệu..."}
                </h3>
                <p className="text-[12px] font-medium text-slate-500 max-w-[240px]">
                  {isProcessingData 
                    ? "Hệ thống đang phân tích cấu trúc cột, làm sạch dữ liệu và tự động nhóm các ngành hàng/hãng sản xuất. Vui lòng chờ trong giây lát."
                    : "Hệ thống đang đồng bộ và tải dữ liệu cài đặt thi đua từ máy chủ. Vui lòng chờ trong giây lát."}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <main className="max-w-[1800px] mx-auto p-3 sm:p-6 space-y-6">
        {/* Top Horizontal Subtab Navigation Bar — Mobile only (sidebar has these on desktop) */}
        <div className="md:hidden w-full bg-white/95 backdrop-blur-xl p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-stretch justify-between gap-0.5 sm:gap-1">
          {[
            { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, grad: 'from-indigo-600 to-purple-600' },
            { id: 'cum', label: 'CỤM', icon: Store, grad: 'from-blue-600 to-indigo-600' },
            { id: 'efficiency', label: 'THƯỞNG QL/TC', icon: Activity, grad: 'from-emerald-600 to-teal-600' },
            { id: 'thuong_st', label: 'THƯỞNG ST', icon: Zap, grad: 'from-amber-500 to-orange-500' },
            { id: 'bcdtnh', label: 'BC DT NGÀNH HÀNG', icon: LayoutGrid, grad: 'from-teal-600 to-cyan-600' },
            { id: 'ssg_boss', label: 'SSG BOSS', icon: Trophy, grad: 'from-amber-600 to-yellow-500' }
          ]
            .filter((item) => is43751 || !pageHiddenState[`luyke_${item.id}`])
            .map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 sm:py-2 sm:px-1 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 text-center relative ${
                  isActive
                    ? `bg-gradient-to-r ${item.grad} text-white shadow-sm shadow-indigo-500/20`
                    : 'bg-slate-50/90 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className={`mb-0.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[7.5px] sm:text-[9.5px] font-black uppercase tracking-tight text-center leading-[1.08] break-words line-clamp-2 w-full px-0.5">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-white/90 animate-pulse mt-0.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area - Full Width */}
        <div className="w-full min-w-0 space-y-6">
          {((pageMaintenanceState[`luyke_${activeTab}`] && !isUser43751Local) || (!is43751 && pageHiddenState[`luyke_${activeTab}`])) ? (
            <div className="flex items-center justify-center h-full p-6 mt-12">
              <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
                <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                  <AlertCircle size={48} />
                </div>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">
                  {pageHiddenState[`luyke_${activeTab}`] ? 'TAB ĐANG TẠM ẨN' : 'HỆ THỐNG ĐANG BẢO TRÌ'}
                </h1>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {pageHiddenState[`luyke_${activeTab}`]
                    ? 'Mục này hiện đang được tạm ẩn khỏi hệ thống. Vui lòng quay lại sau!'
                    : 'Tab này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!'}
                </p>
              </div>
            </div>
          ) : (
          <AnimatePresence>
            {activeTab === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="space-y-6"
                style={{
                  backgroundColor: '#F0F7FF',
                  backgroundImage: `
                    radial-gradient(circle at 10% 15%, rgba(224, 242, 254, 0.7) 0%, transparent 40%),
                    radial-gradient(circle at 90% 85%, rgba(186, 230, 253, 0.5) 0%, transparent 45%),
                    radial-gradient(circle at 50% 50%, rgba(240, 249, 255, 0.9) 0%, #f8fafc 100%)
                  `,
                  backgroundAttachment: 'fixed',
                  borderRadius: '1.5rem',
                  padding: '0.75rem',
                }}
              >
                {/* Store Selector Pills */}
                {filteredMarkets.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 mb-2 no-capture">
                    <button 
                      onClick={() => setMarketFilter('ALL')}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${
                        marketFilter === 'ALL' 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
                          : "bg-white/90 text-slate-600 hover:bg-white border border-sky-100/90 shadow-xs"
                      }`}
                    >
                      TẤT CẢ SIÊU THỊ
                    </button>
                    {filteredMarkets.map((m: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => setMarketFilter(m.name)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${
                          marketFilter === m.name 
                            ? "bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] text-white shadow-md shadow-sky-500/25 border border-sky-300/40" 
                            : "bg-white/90 text-slate-600 hover:bg-white border border-sky-100/90 shadow-xs"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={captureRefs.fullDashboard} className="space-y-6">
                  {/* Top Dashboard for each market */}
                  {marketsForDashboard.map((market: any, mIdx: number) => {
                    const { displayTargetQD, targetData } = resolveMarketTarget(market);
                    const actualVirtual = market.actualVirtual || 0;
                    const actualReal = market.actualReal || 0;
                    const percentHTVal = displayTargetQD > 0 ? Math.round((daysPassed > 0 && totalDays > 0 ? (((actualVirtual) / daysPassed) * totalDays) : actualVirtual) / displayTargetQD * 100 * 10) / 10 : 0;
                    const dtlkVal = actualReal > 0 ? actualReal : (targetData?.stDtlk || 0);
                    const dtqdVal = actualVirtual > 0 ? actualVirtual : (targetData?.stDtqd || 0);
                    const percentQDVal = dtlkVal > 0 ? ((dtqdVal - dtlkVal) / dtlkVal) * 100 : (market.percentQD || 0);
                    const tcRate = resolveLuykeTraChamRate(market.name);
                    const installmentRate = (tcRate !== null && !isNaN(tcRate) && tcRate >= 0)
                      ? (Math.round(tcRate * 10) / 10).toFixed(1)
                      : (((market.installmentRate || market.percentTraGop || 0) > 0)
                          ? (Math.round((market.installmentRate || market.percentTraGop) * 10) / 10).toFixed(1)
                          : '0.0');
                    const billCount = market.billCount || 0;
                    const storeAddress = (storeSettings as any)?.[market.name]?.address || (storeSettings as any)?.[maKho]?.address || 'LUỸ KẾ THÁNG';

                    const lnttVal = getLnttForMarket(market.name, market.percentHTTargetDuKienLNTT ?? (targetData as any)?.percentHTTargetDuKienLNTT ?? 0);

                    return (
                      <div key={market.name || mIdx} className="relative overflow-hidden bg-white/95 backdrop-blur-md p-[12px] sm:p-[16px] md:p-[20px] rounded-[16px] md:rounded-[20px] border border-[#BAE6FD]/80 shadow-[0_10px_30px_-5px_rgba(2,132,199,0.08),0_4px_6px_-2px_rgba(0,0,0,0.03)] space-y-[12px] md:space-y-[16px]">
                        {/* Ambient background glow */}
                        <div className="absolute -top-10 -right-10 w-44 h-44 bg-gradient-to-br from-sky-200/30 to-transparent rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-gradient-to-tr from-blue-100/30 to-transparent rounded-full blur-2xl pointer-events-none" />

                        {/* Store Header with Enterprise Analytics Top Bar */}
                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-[10px] sm:gap-[14px] pb-[12px] sm:pb-[14px] border-b border-slate-100">
                          <div className="flex items-center gap-[10px] sm:gap-[14px] min-w-0">
                            <div
                              className="w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] rounded-[12px] sm:rounded-[14px] text-white flex items-center justify-center shrink-0 shadow-md"
                              style={{ background: 'linear-gradient(135deg, #1D7AFC 0%, #0055CC 100%)' }}
                            >
                              <Store size={20} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-[8px] flex-wrap">
                                <h2
                                  className="text-[15px] sm:text-[19px] md:text-[21px] font-black text-[#0B1F3A] tracking-tight uppercase leading-tight"
                                  style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}
                                >
                                  TỔNG QUAN DOANH THU &amp; NGÀNH HÀNG
                                </h2>
                                <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full bg-blue-50 border border-blue-200/80 text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                                  <span className="w-[6px] h-[6px] rounded-full bg-blue-500 animate-ping inline-block" />
                                  LUỸ KẾ THÁNG
                                </span>
                              </div>
                              <div className="flex items-center gap-[6px] mt-[2px] text-[11.5px] sm:text-[13px] font-bold text-slate-500 truncate">
                                <span className="text-[#0B1F3A] font-extrabold truncate">{market.name}</span>
                                {storeAddress && <span className="text-[11px] font-bold text-slate-400 font-normal">| {storeAddress}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Right Filter & Status Controls */}
                          <div className="flex flex-wrap items-center gap-[6px] sm:gap-[8px] shrink-0">
                            {/* Date Pill */}
                            <div className="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-[10px] bg-slate-50 border border-slate-200/90 text-[11px] font-bold text-[#0B1F3A]">
                              <Calendar size={14} className="text-[#1D7AFC] shrink-0" />
                              <div className="flex flex-col leading-tight">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Kỳ luỹ kế</span>
                                <span className="text-[11px] font-black text-[#0B1F3A]">
                                  {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              </div>
                            </div>

                            {/* Store Filter Selector (if multiple markets) */}
                            {filteredMarkets.length > 1 && (
                              <div className="no-capture relative inline-flex items-center">
                                <select
                                  value={marketFilter}
                                  onChange={(e) => setMarketFilter(e.target.value)}
                                  className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-[10px] pl-[10px] pr-[24px] py-[7px] text-[11px] font-black text-[#0B1F3A] uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                  <option value="ALL">TẤT CẢ SIÊU THỊ</option>
                                  {filteredMarkets.map((fm: any) => (
                                    <option key={fm.name} value={fm.name}>{fm.name}</option>
                                  ))}
                                </select>
                                <ChevronDown size={13} className="absolute right-[8px] pointer-events-none text-slate-500" />
                              </div>
                            )}

                            <button
                              onClick={() => captureElement(captureRefs.fullDashboard, 'TongQuan_LuyKe')}
                              className="no-capture inline-flex items-center justify-center gap-[6px] px-[12px] py-[7px] sm:px-[14px] sm:py-[8px] text-white rounded-[10px] text-[11px] sm:text-[11.5px] font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-md"
                              style={{ background: 'linear-gradient(90deg, #1D7AFC 0%, #0EA5E9 100%)' }}
                            >
                              <Camera size={14} />
                              <span>Chụp tổng quan</span>
                            </button>
                          </div>
                        </div>

                        {/* 6 Enterprise KPI StatCards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[8px] sm:gap-[10px] md:gap-[12px]">
                          <StatCard
                            title="TARGET QĐ"
                            value={formatCurrencyUnit(displayTargetQD)}
                            icon={Target}
                            color="rose"
                          />
                          <StatCard
                            title="DOANH THU QUY ĐỔI"
                            value={formatCurrencyUnit(actualVirtual)}
                            icon={TrendingUp}
                            color="indigo"
                          />
                          <StatCard
                            title="%HT"
                            value={`${percentHTVal}%`}
                            icon={BarChart3}
                            color="emerald"
                          />
                          <StatCard
                            title="TỶ TRỌNG TRẢ GÓP"
                            value={`${installmentRate}%`}
                            icon={Calendar}
                            color="amber"
                          />
                          <StatCard
                            title="% QĐ"
                            value={`${percentQDVal >= 0 ? `+${percentQDVal.toFixed(1)}%` : `${percentQDVal.toFixed(1)}%`}`}
                            icon={Zap}
                            color="orange"
                          />
                          <StatCard
                            title="%HT Target Dự kiến (LNTT)"
                            value={`${Math.round(lnttVal)}%`}
                            icon={CreditCard}
                            color="blue"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Enterprise Analytics Row: Bar Chart + Donut Chart + Top Contributing Categories */}
                  {visibleCategoriesDT.length > 0 && (
                    <EnterpriseCategoryAnalytics
                      categories={visibleCategoriesDT}
                      isMonthly={true}
                      onViewDetail={() => {
                        if (captureRefs.category.current) {
                          captureRefs.category.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    />
                  )}

                  {/* CHI TIẾT NGÀNH HÀNG (LUỸ KẾ) */}
                  <div ref={captureRefs.category} className="space-y-3.5">
                    {/* Pill Actions & Sort Controls (Hidden on screenshot export) */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 no-capture">
                      {/* Quick Sort Category Controls */}
                      <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-sky-100 shadow-xs flex-wrap">
                        <span className="text-[11px] font-black uppercase text-sky-800/80 px-2 hidden sm:inline">
                          SẮP XẾP:
                        </span>
                        <button
                          onClick={() => {
                            setSortModeSL('HT_DESC');
                            setSortModeDT('HT_DESC');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            sortModeSL === 'HT_DESC' && sortModeDT === 'HT_DESC'
                              ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white shadow-xs'
                              : 'text-slate-600 hover:text-sky-900 hover:bg-sky-50/60'
                          }`}
                          title="Sắp xếp theo % hoàn thành cao nhất"
                        >
                          📊 MẶC ĐỊNH (%HT)
                        </button>
                        <button
                          onClick={() => {
                            setSortModeSL('CONLAI_DESC');
                            setSortModeDT('CONLAI_DESC');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            sortModeSL === 'CONLAI_DESC' && sortModeDT === 'CONLAI_DESC'
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/50'
                          }`}
                          title="Sắp xếp theo số lượng/doanh thu Còn Lại cần đạt nhiều nhất"
                        >
                          <span>🔥 C.LẠI GIẢM DẦN</span>
                        </button>
                        <button
                          onClick={() => {
                            setSortModeSL('CONLAI_ASC');
                            setSortModeDT('CONLAI_ASC');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            sortModeSL === 'CONLAI_ASC' && sortModeDT === 'CONLAI_ASC'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
                          }`}
                          title="Sắp xếp theo Còn Lại tăng dần (Đã đạt / thiếu ít lên trước)"
                        >
                          <span>✨ C.LẠI TĂNG DẦN</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setIsCategoryFilterModalOpen(true)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] sm:text-[12px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer border shadow-sm ${
                            (hiddenCatsSL.length > 0 || hiddenCatsDT.length > 0)
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 ring-2 ring-rose-400/20'
                              : 'bg-white hover:bg-sky-50/50 text-slate-700 border-sky-100'
                          }`}
                          title="Bộ lọc ẩn/hiện ngành hàng SL & DT (Chỉ áp dụng cho Tổng quan)"
                        >
                          <Filter size={14} className={hiddenCatsSL.length > 0 || hiddenCatsDT.length > 0 ? 'text-rose-600' : 'text-sky-600'} />
                          <span>ẨN/HIỆN NGÀNH HÀNG</span>
                          {(hiddenCatsSL.length > 0 || hiddenCatsDT.length > 0) && (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                              Ẩn {hiddenCatsSL.length + hiddenCatsDT.length}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={handleOpenCategoryCommentModal}
                          className="flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] hover:from-[#0369A1] hover:to-[#0284C7] text-white shadow-md shadow-sky-500/20 transition-all duration-300 active:scale-95 cursor-pointer border border-sky-300/30"
                          title="Nhận xét doanh thu & ngành hàng luỹ kế"
                        >
                          <MessageSquare size={14} className="text-white shrink-0" />
                          <span>NHẬN XÉT</span>
                        </button>

                        <button
                          onClick={() => captureElement(captureRefs.category, 'NganhHang_LuyKe')}
                          className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] hover:from-[#0369A1] hover:to-[#0284C7] text-white text-[12px] font-black uppercase tracking-wider shadow-md shadow-sky-500/25 transition-all duration-300 active:scale-95 cursor-pointer border border-sky-300/30"
                          title="Chụp ảnh 2 bảng Ngành hàng"
                        >
                          <Camera size={15} />
                          <span>Chụp ảnh báo cáo</span>
                        </button>
                      </div>
                    </div>

                    {/* 2 Tables Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Left Table: SLLK */}
                      <div ref={captureRefs.categorySL} className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(11,37,69,0.06)] overflow-hidden min-w-0 flex flex-col p-2 sm:p-4 self-start h-auto">
                        {/* Executive Dashboard Header Banner */}
                        <div className="exec-header-banner keep-overflow-hidden mobile-auto-zoom rounded-xl sm:rounded-2xl border border-slate-200/90 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F7FF] shadow-[0_2px_10px_-2px_rgba(11,37,69,0.06)] overflow-hidden flex items-stretch justify-between mb-2.5 sm:mb-3">
                          {/* Left: Cart Icon + Title + Subtitle */}
                          <div className="exec-banner-left px-2.5 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                            <div className="exec-banner-icon w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1E62B5] to-[#0B458C] flex items-center justify-center text-white shrink-0 shadow-sm">
                              <ShoppingCart className="w-4.5 h-4.5 sm:w-6 sm:h-6" strokeWidth={2.3} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5 min-w-0">
                                <h2 className="text-[14px] sm:text-[21px] md:text-[23px] font-black text-[#0B2545] uppercase tracking-tight sm:tracking-wide leading-tight whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                  NGÀNH HÀNG (SL)
                                </h2>
                                {/* Toolbar Action Buttons (no-capture) */}
                                <div className="no-capture flex items-center gap-1 sm:gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      setCategoryFilterActiveTab('SL');
                                      setIsCategoryFilterModalOpen(true);
                                    }}
                                    className="relative p-1 sm:p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg sm:rounded-xl transition-all cursor-pointer border border-slate-200 active:scale-95"
                                    title="Bộ lọc ẩn/hiện ngành hàng SL"
                                  >
                                    <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    {hiddenCatsSL.length > 0 && (
                                      <span className="absolute -top-1 -right-1 min-w-[13px] sm:min-w-[15px] h-3.5 px-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                                        {hiddenCatsSL.length}
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => captureElement(captureRefs.categorySL, 'NganhHang_SL_LuyKe')}
                                    className="p-1 sm:p-1.5 bg-blue-50 hover:bg-blue-100 text-[#0B4F9C] rounded-lg sm:rounded-xl transition-all cursor-pointer border border-blue-200 active:scale-95"
                                    title="Chụp ảnh bảng Ngành hàng SL"
                                  >
                                    <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="exec-banner-sub hidden items-center flex-nowrap whitespace-nowrap gap-1 sm:gap-2 mt-0.5 text-[8px] sm:text-xs text-slate-600 font-semibold" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1E4B7A] shrink-0" />
                                  Realtime: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }).replace(/\//g, '-')}
                                </span>
                                <span className="text-slate-300 font-normal">|</span>
                                <span className="text-[#0B2545] font-black whitespace-nowrap">
                                  ĐẠT: {visibleCategoriesSL.filter((c: any) => {
                                    let rate = 0;
                                    if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
                                    return Math.round(rate) >= 100;
                                  }).length}/{visibleCategoriesSL.length}
                                </span>
                                <span className="text-slate-300 font-normal">|</span>
                                <span className="text-slate-600 font-bold whitespace-nowrap">
                                  TGSD: {daysPassed}/{totalDays}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Diagonal Ribbons + Dark Navy Executive KPI Section */}
                          <div className="flex items-stretch shrink-0">
                            <svg viewBox="0 0 60 100" preserveAspectRatio="none" className="exec-banner-slash w-6 sm:w-12 h-full shrink-0 block -mr-[1px]">
                              <defs>
                                <linearGradient id="lkSlSlashGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#1E6CE6" />
                                  <stop offset="100%" stopColor="#0D47A1" />
                                </linearGradient>
                              </defs>
                              <polygon points="24,0 42,0 18,100 0,100" fill="#DCEBFA" />
                              <polygon points="42,0 60,0 36,100 18,100" fill="url(#lkSlSlashGrad)" />
                              <polygon points="60,0 60,100 36,100" fill="#0B2D59" />
                            </svg>
                            <div className="exec-banner-right bg-gradient-to-r from-[#0B2D59] via-[#092347] to-[#061730] pl-1.5 pr-2.5 sm:pl-3 sm:pr-5 py-1.5 sm:py-2 text-white flex items-center gap-2 sm:gap-4">
                              {/* 3-bar chart indicator */}
                              <div className="flex items-end gap-[2px] sm:gap-[3px] h-4 sm:h-6 shrink-0">
                                <div className="w-[3px] sm:w-[4.5px] h-2 sm:h-2.5 bg-[#6290B8] rounded-[1.5px]" />
                                <div className="w-[3px] sm:w-[4.5px] h-3 sm:h-4 bg-[#6290B8] rounded-[1.5px]" />
                                <div className="w-[3px] sm:w-[4.5px] h-4 sm:h-6 bg-[#6290B8] rounded-[1.5px]" />
                              </div>

                              {/* Total Categories Metric */}
                              <div className="flex flex-col items-start justify-center">
                                <span className="exec-banner-kpi-label text-[6.5px] sm:text-[8.5px] font-black uppercase tracking-wider text-slate-200 whitespace-nowrap leading-none">TỔNG NGÀNH HÀNG</span>
                                <span className="exec-banner-kpi-val text-[15px] sm:text-2xl font-black text-white leading-none mt-0.5 sm:mt-1">{visibleCategoriesSL.length}</span>
                              </div>

                              {/* Vertical separator */}
                              <div className="w-[1px] h-5 sm:h-7 bg-white/20 shrink-0" />

                              {/* Reached Metric */}
                              <div className="flex flex-col items-center justify-center min-w-[20px] sm:min-w-[26px]">
                                <span className="exec-banner-kpi-label text-[6.5px] sm:text-[8.5px] font-black uppercase tracking-wider text-slate-200 whitespace-nowrap leading-none">ĐẠT</span>
                                <span className="exec-banner-kpi-val text-[15px] sm:text-2xl font-black text-[#10B981] leading-none mt-0.5 sm:mt-1">
                                  {visibleCategoriesSL.filter((c: any) => {
                                    let rate = 0;
                                    if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
                                    return Math.round(rate) >= 100;
                                  }).length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {hiddenCatsSL.length > 0 && (
                          <div className="no-capture px-3 py-1.5 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] font-bold text-rose-700 flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <EyeOff size={13} className="text-rose-500" />
                              <span>Đang ẩn <strong>{hiddenCatsSL.length}</strong> ngành hàng SL</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setCategoryFilterActiveTab('SL');
                                  setIsCategoryFilterModalOpen(true);
                                }}
                                className="underline hover:text-rose-900 cursor-pointer"
                              >
                                Chỉnh sửa
                              </button>
                              <span>•</span>
                              <button
                                onClick={showAllCategoriesSL}
                                className="hover:text-rose-900 cursor-pointer font-black"
                              >
                                Hiện tất cả
                              </button>
                            </div>
                          </div>
                        )}

                        {showSllkComment && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 no-capture">
                            <textarea
                              value={sllkComment}
                              onChange={(e) => setSllkComment(e.target.value)}
                              placeholder="Nhập nhận xét cho bảng SLLK..."
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-sky-500/20 resize-none min-h-[60px] screenshot-comment"
                            />
                          </div>
                        )}

                        {/* Executive Data Table */}
                        <div className="overflow-x-auto w-full rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="exec-cat-table w-full min-w-full border-separate border-spacing-0 table-fixed bg-white mobile-compact-table" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                            <colgroup>
                              <col className="w-[26px] sm:w-[44px]" />
                              <col className="w-auto" />
                              <col className="w-[54px] sm:w-[80px]" />
                              <col className="w-[54px] sm:w-[80px]" />
                              <col className="w-[50px] sm:w-[74px]" />
                              <col className="w-[52px] sm:w-[78px]" />
                            </colgroup>
                            <thead>
                              <tr className="text-white h-8 sm:h-11">
                                <th className="px-0.5 sm:px-1 py-0 text-[8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] rounded-tl-lg sm:rounded-tl-xl whitespace-nowrap">STT</th>
                                <th className="px-1.5 sm:px-3 py-0 text-[8.5px] sm:text-[11.5px] font-black uppercase text-left border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] whitespace-nowrap">NGÀNH HÀNG</th>
                                <th className="px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center gap-[2px] sm:gap-1"><Target className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />TARGET</span>
                                </th>
                                <th className="px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center gap-[2px] sm:gap-1"><BarChart3 className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />LUỸ KẾ</span>
                                </th>
                                <th 
                                  onClick={() => setSortModeSL(prev => prev === 'HT_DESC' ? 'HT_ASC' : 'HT_DESC')}
                                  className={`px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 cursor-pointer select-none transition-colors rounded-tr-md sm:rounded-tr-lg whitespace-nowrap ${
                                    sortModeSL.startsWith('HT') ? 'bg-gradient-to-b from-[#14437A] to-[#09274A]' : 'bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] hover:brightness-110'
                                  }`}
                                  title="Bấm để sắp xếp %HT (Giảm dần / Tăng dần)"
                                >
                                  <div className="flex items-center justify-center gap-[2px] sm:gap-1">
                                    <PieChart className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />
                                    <span>%HT</span>
                                    <span className="text-[7px] sm:text-[9px] opacity-80">{sortModeSL === 'HT_DESC' ? '▼' : (sortModeSL === 'HT_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                                <th 
                                  onClick={() => setSortModeSL(prev => prev === 'CONLAI_DESC' ? 'CONLAI_ASC' : 'CONLAI_DESC')}
                                  className={`px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center cursor-pointer select-none transition-colors rounded-t-md sm:rounded-t-lg whitespace-nowrap ${
                                    sortModeSL.startsWith('CONLAI') ? 'bg-amber-700/90' : 'bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] hover:brightness-110'
                                  }`}
                                  title="Bấm để sắp xếp theo C.LẠI (Còn lại nhiều nhất / ít nhất)"
                                >
                                  <div className="flex items-center justify-center gap-[2px] sm:gap-1">
                                    <FileText className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />
                                    <span>C.LẠI</span>
                                    <span className="text-[7px] sm:text-[9px] opacity-80">{sortModeSL === 'CONLAI_DESC' ? '▼' : (sortModeSL === 'CONLAI_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleCategoriesSL.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold text-xs bg-white">
                                    Tất cả ngành hàng SL đang bị ẩn bởi bộ lọc.
                                    <button
                                      onClick={showAllCategoriesSL}
                                      className="ml-2 text-sky-600 hover:text-sky-700 underline font-black cursor-pointer"
                                    >
                                      Hiện lại tất cả
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                sortedCategoriesSL.map((cat: any, idx: number) => {
                                  let rate = 0;
                                  if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                  const roundedRate = Math.round(rate);
                                  const remaining = cat.target - cat.revenue;
                                  const isReached = roundedRate >= 100;
                                  const isZero = roundedRate === 0;
                                  const isEven = idx % 2 === 0;
                                  const rowBg = isEven ? 'bg-white' : 'bg-[#F8FAFC]';

                                  return (
                                    <tr key={idx} className={`${rowBg} hover:bg-blue-50/40 transition-colors h-9 sm:h-12 border-b border-slate-100`}>
                                      <td className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap">
                                        <span className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-[#E6F0FA] text-[#0F3A66] font-black text-[9.5px] sm:text-xs flex items-center justify-center mx-auto">
                                          {idx + 1}
                                        </span>
                                      </td>
                                      <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-left border-r border-slate-100" title={cat.name}>
                                        <div className={`font-black uppercase text-[9.5px] sm:text-[12.5px] md:text-[13px] leading-[1.2] sm:leading-snug break-words whitespace-normal ${isZero ? 'text-[#E11D48]' : 'text-[#0F172A]'}`} title={cat.name}>
                                          {cat.name}
                                        </div>
                                      </td>
                                      <td className={`px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap ${cat.target > 0 ? 'font-extrabold text-[10.5px] sm:text-[14.5px] text-[#0F172A]' : 'font-semibold text-[10.5px] sm:text-[13px] text-slate-400'}`}>
                                        {cat.target > 0 ? Math.round(cat.target).toLocaleString('vi-VN') : "-"}
                                      </td>
                                      <td className={`px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap ${cat.revenue > 0 ? 'font-black text-[10.5px] sm:text-[14.5px] text-[#0052CC]' : 'font-semibold text-[10.5px] sm:text-[13px] text-slate-400'}`}>
                                        {cat.revenue > 0 ? Math.round(cat.revenue).toLocaleString('vi-VN') : "-"}
                                      </td>
                                      <td className="px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap">
                                        <span className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-black text-[9px] sm:text-[12px] min-w-[32px] sm:min-w-[48px] text-center leading-none ${
                                          isReached ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FFE4E6] text-[#E11D48]'
                                        }`}>
                                          {roundedRate}%
                                        </span>
                                      </td>
                                      <td className={`px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-slate-100 whitespace-nowrap ${sortModeSL.startsWith('CONLAI') ? 'bg-amber-50/60' : ''} ${remaining > 0 ? 'font-black text-[10.5px] sm:text-[14.5px] text-[#E11D48]' : 'font-semibold text-[10.5px] sm:text-[13px] text-slate-400'}`}>
                                        {remaining > 0 ? Math.round(remaining).toLocaleString('vi-VN') : "-"}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right Table: DTLK */}
                      <div ref={captureRefs.categoryDT} className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(11,37,69,0.06)] overflow-hidden min-w-0 flex flex-col p-2 sm:p-4 self-start h-auto">
                        {/* Executive Dashboard Header Banner */}
                        <div className="exec-header-banner keep-overflow-hidden mobile-auto-zoom rounded-xl sm:rounded-2xl border border-slate-200/90 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F7FF] shadow-[0_2px_10px_-2px_rgba(11,37,69,0.06)] overflow-hidden flex items-stretch justify-between mb-2.5 sm:mb-3">
                          {/* Left: TrendingUp Icon + Title + Subtitle */}
                          <div className="exec-banner-left px-2.5 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                            <div className="exec-banner-icon w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1E62B5] to-[#0B458C] flex items-center justify-center text-white shrink-0 shadow-sm">
                              <TrendingUp className="w-4.5 h-4.5 sm:w-6 sm:h-6" strokeWidth={2.3} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5 min-w-0">
                                <h2 className="text-[14px] sm:text-[21px] md:text-[23px] font-black text-[#0B2545] uppercase tracking-tight sm:tracking-wide leading-tight whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
                                  NGÀNH HÀNG (DT)
                                </h2>
                                {/* Toolbar Action Buttons (no-capture) */}
                                <div className="no-capture flex items-center gap-1 sm:gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      setCategoryFilterActiveTab('DT');
                                      setIsCategoryFilterModalOpen(true);
                                    }}
                                    className="relative p-1 sm:p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg sm:rounded-xl transition-all cursor-pointer border border-slate-200 active:scale-95"
                                    title="Bộ lọc ẩn/hiện ngành hàng DT"
                                  >
                                    <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    {hiddenCatsDT.length > 0 && (
                                      <span className="absolute -top-1 -right-1 min-w-[13px] sm:min-w-[15px] h-3.5 px-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                                        {hiddenCatsDT.length}
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => captureElement(captureRefs.categoryDT, 'NganhHang_DT_LuyKe')}
                                    className="p-1 sm:p-1.5 bg-blue-50 hover:bg-blue-100 text-[#0B4F9C] rounded-lg sm:rounded-xl transition-all cursor-pointer border border-blue-200 active:scale-95"
                                    title="Chụp ảnh bảng Ngành hàng DT"
                                  >
                                    <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="exec-banner-sub hidden items-center flex-nowrap whitespace-nowrap gap-1 sm:gap-2 mt-0.5 text-[8px] sm:text-xs text-slate-600 font-semibold" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1E4B7A] shrink-0" />
                                  Realtime: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }).replace(/\//g, '-')}
                                </span>
                                <span className="text-slate-300 font-normal">|</span>
                                <span className="text-[#0B2545] font-black whitespace-nowrap">
                                  ĐẠT: {visibleCategoriesDT.filter((c: any) => {
                                    let rate = 0;
                                    if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
                                    return Math.round(rate) >= 100;
                                  }).length}/{visibleCategoriesDT.length}
                                </span>
                                <span className="text-slate-300 font-normal">|</span>
                                <span className="text-slate-600 font-bold whitespace-nowrap">
                                  TGSD: {daysPassed}/{totalDays}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Diagonal Ribbons + Dark Navy Executive KPI Section */}
                          <div className="flex items-stretch shrink-0">
                            <svg viewBox="0 0 60 100" preserveAspectRatio="none" className="exec-banner-slash w-6 sm:w-12 h-full shrink-0 block -mr-[1px]">
                              <defs>
                                <linearGradient id="lkDtSlashGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#1E6CE6" />
                                  <stop offset="100%" stopColor="#0D47A1" />
                                </linearGradient>
                              </defs>
                              <polygon points="24,0 42,0 18,100 0,100" fill="#DCEBFA" />
                              <polygon points="42,0 60,0 36,100 18,100" fill="url(#lkDtSlashGrad)" />
                              <polygon points="60,0 60,100 36,100" fill="#0B2D59" />
                            </svg>
                            <div className="exec-banner-right bg-gradient-to-r from-[#0B2D59] via-[#092347] to-[#061730] pl-1.5 pr-2.5 sm:pl-3 sm:pr-5 py-1.5 sm:py-2 text-white flex items-center gap-2 sm:gap-4">
                              {/* 3-bar chart indicator */}
                              <div className="flex items-end gap-[2px] sm:gap-[3px] h-4 sm:h-6 shrink-0">
                                <div className="w-[3px] sm:w-[4.5px] h-2 sm:h-2.5 bg-[#6290B8] rounded-[1.5px]" />
                                <div className="w-[3px] sm:w-[4.5px] h-3 sm:h-4 bg-[#6290B8] rounded-[1.5px]" />
                                <div className="w-[3px] sm:w-[4.5px] h-4 sm:h-6 bg-[#6290B8] rounded-[1.5px]" />
                              </div>

                              {/* Total Categories Metric */}
                              <div className="flex flex-col items-start justify-center">
                                <span className="exec-banner-kpi-label text-[6.5px] sm:text-[8.5px] font-black uppercase tracking-wider text-slate-200 whitespace-nowrap leading-none">TỔNG NGÀNH HÀNG</span>
                                <span className="exec-banner-kpi-val text-[15px] sm:text-2xl font-black text-white leading-none mt-0.5 sm:mt-1">{visibleCategoriesDT.length}</span>
                              </div>

                              {/* Vertical separator */}
                              <div className="w-[1px] h-5 sm:h-7 bg-white/20 shrink-0" />

                              {/* Reached Metric */}
                              <div className="flex flex-col items-center justify-center min-w-[20px] sm:min-w-[26px]">
                                <span className="exec-banner-kpi-label text-[6.5px] sm:text-[8.5px] font-black uppercase tracking-wider text-slate-200 whitespace-nowrap leading-none">ĐẠT</span>
                                <span className="exec-banner-kpi-val text-[15px] sm:text-2xl font-black text-[#10B981] leading-none mt-0.5 sm:mt-1">
                                  {visibleCategoriesDT.filter((c: any) => {
                                    let rate = 0;
                                    if (c.target > 0 && daysPassed > 0) rate = (((c.revenue / daysPassed) * totalDays) / c.target) * 100;
                                    return Math.round(rate) >= 100;
                                  }).length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {hiddenCatsDT.length > 0 && (
                          <div className="no-capture px-3 py-1.5 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] font-bold text-rose-700 flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <EyeOff size={13} className="text-rose-500" />
                              <span>Đang ẩn <strong>{hiddenCatsDT.length}</strong> ngành hàng DT</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setCategoryFilterActiveTab('DT');
                                  setIsCategoryFilterModalOpen(true);
                                }}
                                className="underline hover:text-rose-900 cursor-pointer"
                              >
                                Chỉnh sửa
                              </button>
                              <span>•</span>
                              <button
                                onClick={showAllCategoriesDT}
                                className="hover:text-rose-900 cursor-pointer font-black"
                              >
                                Hiện tất cả
                              </button>
                            </div>
                          </div>
                        )}

                        {showDtlkComment && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 no-capture">
                            <textarea
                              value={dtlkComment}
                              onChange={(e) => setDtlkComment(e.target.value)}
                              placeholder="Nhập nhận xét cho bảng DTLK..."
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:ring-2 focus:ring-sky-500/20 resize-none min-h-[60px] screenshot-comment"
                            />
                          </div>
                        )}

                        {/* Executive Data Table */}
                        <div className="overflow-x-auto w-full rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                          <table className="exec-cat-table w-full min-w-full border-separate border-spacing-0 table-fixed bg-white mobile-compact-table" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                            <colgroup>
                              <col className="w-[26px] sm:w-[44px]" />
                              <col className="w-auto" />
                              <col className="w-[54px] sm:w-[80px]" />
                              <col className="w-[54px] sm:w-[80px]" />
                              <col className="w-[50px] sm:w-[74px]" />
                              <col className="w-[52px] sm:w-[78px]" />
                            </colgroup>
                            <thead>
                              <tr className="text-white h-8 sm:h-11">
                                <th className="px-0.5 sm:px-1 py-0 text-[8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] rounded-tl-lg sm:rounded-tl-xl whitespace-nowrap">STT</th>
                                <th className="px-1.5 sm:px-3 py-0 text-[8.5px] sm:text-[11.5px] font-black uppercase text-left border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] whitespace-nowrap">NGÀNH HÀNG</th>
                                <th className="px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center gap-[2px] sm:gap-1"><Target className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />TARGET</span>
                                </th>
                                <th className="px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center gap-[2px] sm:gap-1"><BarChart3 className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />LUỸ KẾ</span>
                                </th>
                                <th 
                                  onClick={() => setSortModeDT(prev => prev === 'HT_DESC' ? 'HT_ASC' : 'HT_DESC')}
                                  className={`px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center border-r border-white/15 cursor-pointer select-none transition-colors rounded-tr-md sm:rounded-tr-lg whitespace-nowrap ${
                                    sortModeDT.startsWith('HT') ? 'bg-gradient-to-b from-[#14437A] to-[#09274A]' : 'bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] hover:brightness-110'
                                  }`}
                                  title="Bấm để sắp xếp %HT (Giảm dần / Tăng dần)"
                                >
                                  <div className="flex items-center justify-center gap-[2px] sm:gap-1">
                                    <PieChart className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />
                                    <span>%HT</span>
                                    <span className="text-[7px] sm:text-[9px] opacity-80">{sortModeDT === 'HT_DESC' ? '▼' : (sortModeDT === 'HT_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                                <th 
                                  onClick={() => setSortModeDT(prev => prev === 'CONLAI_DESC' ? 'CONLAI_ASC' : 'CONLAI_DESC')}
                                  className={`px-0.5 sm:px-1.5 py-0 text-[7.8px] sm:text-[11px] font-black uppercase text-center cursor-pointer select-none transition-colors rounded-t-md sm:rounded-t-lg whitespace-nowrap ${
                                    sortModeDT.startsWith('CONLAI') ? 'bg-amber-700/90' : 'bg-gradient-to-b from-[#1B5799] via-[#13457D] to-[#0C3360] hover:brightness-110'
                                  }`}
                                  title="Bấm để sắp xếp theo C.LẠI (Còn lại nhiều nhất / ít nhất)"
                                >
                                  <div className="flex items-center justify-center gap-[2px] sm:gap-1">
                                    <FileText className="w-[9px] h-[9px] sm:w-3 sm:h-3 text-white/90 shrink-0" />
                                    <span>C.LẠI</span>
                                    <span className="text-[7px] sm:text-[9px] opacity-80">{sortModeDT === 'CONLAI_DESC' ? '▼' : (sortModeDT === 'CONLAI_ASC' ? '▲' : '⇅')}</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleCategoriesDT.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold text-xs bg-white">
                                    Tất cả ngành hàng DT đang bị ẩn bởi bộ lọc.
                                    <button
                                      onClick={showAllCategoriesDT}
                                      className="ml-2 text-sky-600 hover:text-sky-700 underline font-black cursor-pointer"
                                    >
                                      Hiện lại tất cả
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                sortedCategoriesDT.map((cat: any, idx: number) => {
                                  let rate = 0;
                                  if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                  const roundedRate = Math.round(rate);
                                  const remaining = cat.target - cat.revenue;
                                  const isReached = roundedRate >= 100;
                                  const isZero = roundedRate === 0;
                                  const isEven = idx % 2 === 0;
                                  const rowBg = isEven ? 'bg-white' : 'bg-[#F8FAFC]';

                                  return (
                                    <tr key={idx} className={`${rowBg} hover:bg-blue-50/40 transition-colors h-9 sm:h-12 border-b border-slate-100`}>
                                      <td className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap">
                                        <span className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-[#E6F0FA] text-[#0F3A66] font-black text-[9.5px] sm:text-xs flex items-center justify-center mx-auto">
                                          {idx + 1}
                                        </span>
                                      </td>
                                      <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-left border-r border-slate-100" title={cat.name}>
                                        <div className={`font-black uppercase text-[9.5px] sm:text-[12.5px] md:text-[13px] leading-[1.2] sm:leading-snug break-words whitespace-normal ${isZero ? 'text-[#E11D48]' : 'text-[#0F172A]'}`} title={cat.name}>
                                          {cat.name}
                                        </div>
                                      </td>
                                      <td className={`px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap ${cat.target > 0 ? 'font-extrabold text-[10.5px] sm:text-[14.5px] text-[#0F172A]' : 'font-semibold text-[10.5px] sm:text-[13px] text-slate-400'}`}>
                                        {cat.target > 0 ? Math.round(cat.target).toLocaleString('vi-VN') : "-"}
                                      </td>
                                      <td className={`px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap ${cat.revenue > 0 ? 'font-black text-[10.5px] sm:text-[14.5px] text-[#0052CC]' : 'font-semibold text-[10.5px] sm:text-[13px] text-slate-400'}`}>
                                        {cat.revenue > 0 ? Math.round(cat.revenue).toLocaleString('vi-VN') : "-"}
                                      </td>
                                      <td className="px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-r border-slate-100 whitespace-nowrap">
                                        <span className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-black text-[9px] sm:text-[12px] min-w-[32px] sm:min-w-[48px] text-center leading-none ${
                                          isReached ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FFE4E6] text-[#E11D48]'
                                        }`}>
                                          {roundedRate}%
                                        </span>
                                      </td>
                                      <td className={`px-0.5 sm:px-1.5 py-1 sm:py-1.5 text-center border-slate-100 whitespace-nowrap ${sortModeDT.startsWith('CONLAI') ? 'bg-amber-50/60' : ''} ${remaining > 0 ? 'font-black text-[10.5px] sm:text-[14.5px] text-[#E11D48]' : 'font-semibold text-[10.5px] sm:text-[13px] text-slate-400'}`}>
                                        {remaining > 0 ? Math.round(remaining).toLocaleString('vi-VN') : "-"}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'cum' && (
              <motion.div
                key="cum"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <ClusterReportTab
                  clusterSummaryInput={clusterSummaryInput}
                  categoryRevenueInput={
                    clusterSummaryInput ||
                    localStorage.getItem('rt_catrev') ||
                    localStorage.getItem('rtst_cluster_summary') ||
                    localStorage.getItem('rtst_catrev') ||
                    ''
                  }
                  clusterMarkets={displayData.markets}
                  userProfile={userProfile}
                  daysPassed={daysPassed}
                  totalDays={totalDays}
                  onNavigateToKhaiBao={() => {
                    try {
                      localStorage.setItem('crm_active_page', 'khaibao');
                    } catch {}
                    window.location.search = '?page=khaibao';
                  }}
                  onSaveClusterData={(val: string) => {
                    setClusterSummaryInput(val);
                    try {
                      localStorage.setItem('rt_catrev', val);
                      localStorage.setItem('rtst_cluster_summary', val);
                      localStorage.setItem('rtst_catrev', val);
                    } catch {}
                    saveLuykeData(false, 'auto', undefined, undefined, 'LUỸ KẾ DT');
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'efficiency' && (
              <TabErrorBoundary tabName="Thưởng QL/TC">
                <motion.div
                  key="efficiency"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {String(userProfile?.username).trim() === '43751' ? (
                    <BonusCalculatorForm
                      activeStore={marketFilter || (filteredMarkets[0]?.name) || 'ALL'}
                      filteredMarkets={filteredMarkets || []}
                      clusterMarkets={displayData?.markets || []}
                    />
                  ) : (
                    <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 sm:gap-4 mb-6">
                        <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <Activity size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">THƯỞNG QUẢN LÝ / TRƯỞNG CA</h3>
                          <p className="text-xs sm:text-sm text-slate-400">Phân tích hiệu quả & tính thưởng theo tháng</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-slate-400 text-center px-4">
                        <Activity size={44} className="mb-4 opacity-20" />
                        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider">Đang trong quá trình xây dựng</p>
                        <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-md">Tính năng tính thưởng quản lý / trưởng ca đang trong quá trình xây dựng và phát triển. Vui lòng quay lại sau.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </TabErrorBoundary>
            )}

            {activeTab === 'thuong_st' && (
              <motion.div
                key="thuong_st"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >

                {/* Single Unified Excel File Status & Upload Bar */}
                {isExcelActive && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    {/* Left: Single file info display */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0 shadow-xs border border-emerald-100">
                        <FileSpreadsheet size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">
                            {isComparing ? 'Dữ liệu thi đua (So sánh 2 ngày Domino)' : 'File thi đua đang hoạt động'}
                          </p>
                          {isComparing && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              Đang so sánh
                            </span>
                          )}
                        </div>

                        {/* File Name(s) */}
                        <div className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-2 flex-wrap">
                          {isComparing ? (
                            <>
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold truncate max-w-[220px]" title={activeExcelOldFileName}>
                                📅 Cũ: {activeExcelOldFileName}
                              </span>
                              <span className="text-slate-400 text-xs font-black">➔</span>
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black truncate max-w-[220px]" title={activeExcelFileName}>
                                ⚡ Mới: {activeExcelFileName}
                              </span>
                            </>
                          ) : (
                            <span className="truncate max-w-[400px]" title={activeExcelFileName || 'Du_Lieu_Thi_Dua.xlsx'}>
                              ⚡ {activeExcelFileName || 'Du_Lieu_Thi_Dua.xlsx'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Single Domino Upload Button */}
                      <div className="relative">
                        <button className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95">
                          <Upload size={14} />
                          <span>+ TẢI FILE MỚI</span>
                        </button>
                        <input 
                          type="file" 
                          multiple
                          accept=".xlsx, .xls" 
                          onChange={handleExcelUpload} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Tải file theo cơ chế Domino: Thêm 1 file mới thì file hiện tại sẽ thành Hôm qua, file mới thành Hôm nay!"
                        />
                      </div>

                      {isComparing && (
                        <button
                          onClick={handleSwapOldAndNew}
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Đổi thứ tự: Đảo vị trí giữa File Cũ ⇄ File Mới"
                        >
                          <RefreshCw size={13} />
                          <span>ĐỔI VỊ TRÍ</span>
                        </button>
                      )}

                      {isComparing && (
                        <button
                          onClick={handleClearOldFile}
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                          title="Tắt chế độ so sánh (chỉ xem 1 file hôm nay)"
                        >
                          <X size={13} />
                          <span>TẮT SO SÁNH</span>
                        </button>
                      )}

                      <button 
                        onClick={handleClearAllExcelData}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                        title="Xóa toàn bộ dữ liệu thi đua"
                      >
                        <Trash2 size={13} />
                        <span>XÓA HẾT</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Container when there's no data */}
                {!isExcelActive ? (
                  <div className="bg-white border-2 border-dashed border-slate-300 rounded-[32px] p-8 sm:p-12 text-center hover:border-emerald-400 hover:bg-emerald-50/20 transition-all cursor-pointer relative shadow-sm">
                    <input 
                      type="file" 
                      multiple
                      accept=".xlsx, .xls" 
                      onChange={handleExcelUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                        <Upload size={28} />
                      </div>
                      <div className="space-y-1.5 max-w-lg">
                        <h4 className="text-base sm:text-lg font-black text-slate-800">Tải lên file Excel kết quả Thi đua - Thưởng</h4>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                          Chọn <span className="text-emerald-700 font-bold">1 file</span> (Hôm nay) hoặc <span className="text-emerald-700 font-bold">2 file</span> (Cũ & Mới) để nạp dữ liệu
                        </p>
                        <div className="flex flex-col items-center gap-1 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 mt-2 text-left w-full">
                          <div className="font-black flex items-center gap-1.5 text-emerald-800">
                            <span>⚡ Cơ chế nạp file Domino:</span>
                          </div>
                          <div className="text-[11.5px] font-medium space-y-0.5 text-slate-700">
                            <div>• <strong>Thêm 1 file đầu tiên:</strong> Mặc định hiểu là File Hôm Nay (Mới).</div>
                            <div>• <strong>Thêm tiếp 1 file ngày hôm sau:</strong> File Hôm Nay trước đó tự động đẩy thành Hôm Qua (Cũ), file mới nạp sẽ là Hôm Nay (Mới).</div>
                            <div>• <strong>Chọn cùng lúc 2 file:</strong> File chọn trước là Hôm Qua, File chọn sau là Hôm Nay.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display SaaS V2 Competition Bonus Dashboard */
                  <div className="space-y-3.5" style={{ fontFamily: "'Inter', 'UTM Avo', sans-serif" }}>
                    {/* Hidden File Input for quick comparison / update */}
                    <input
                      ref={thuongStUploadInputRef}
                      type="file"
                      multiple
                      accept=".xlsx, .xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />

                    {/* Top Utility Action Bar (AI Analysis & Screenshot Export - excluded from capture) */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white px-4 py-2.5 rounded-2xl border border-[#DCE6F0] shadow-2xs no-capture">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            handleGenerateAIComment(thuongStTemplate);
                            setThuongStCommentOpen(true);
                          }}
                          disabled={isGeneratingAI}
                          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#0B2E59] via-[#1769FF] to-[#079B78] hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-60"
                          title="Tự động phân tích dữ liệu thi đua và tạo nhận xét AI"
                        >
                          {isGeneratingAI ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>AI ĐANG PHÂN TÍCH...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              <span>NHẬN XÉT AI</span>
                            </>
                          )}
                        </button>
                        {!showThuongStWarning && (
                          <button
                            onClick={() => setShowThuongStWarning(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF7E8] border border-[#F6DFB0] text-[#A85B12] text-xs font-bold cursor-pointer"
                          >
                            <Bell size={13} />
                            <span>Hiện lưu ý quỹ thưởng</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => captureElement(captureRefs.thuongSt, 'BaoCaoThuongSt')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#079B78] to-[#057A5E] hover:from-[#057A5E] hover:to-[#04634C] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Camera size={15} />
                        <span>Chụp ảnh báo cáo</span>
                      </button>
                    </div>

                    {/* Main Capture Container matching Design Reference #2 */}
                    <div
                      ref={captureRefs.thuongSt}
                      className="bg-[#F4F7FB] rounded-[20px] border border-[#DCE6F0] overflow-hidden flex flex-col p-3.5 sm:p-5 space-y-3.5"
                    >
                      {/* 3. PHẦN HEADER: Navy Gradient Banner with Trophy & Crown */}
                      <div
                        className="thuong-st-navy-header rounded-[15px] px-4 sm:px-6 py-3.5 text-white relative overflow-hidden border border-[#1E4985]"
                        style={{
                          background: 'linear-gradient(100deg, #061836 0%, #0B2E59 45%, #164B96 80%, #0E356B 100%)'
                        }}
                      >
                        {/* Subtle radial light glow */}
                        <div
                          className="absolute inset-0 pointer-events-none opacity-35"
                          style={{
                            background: 'radial-gradient(circle at 28% 20%, rgba(56, 189, 248, 0.35) 0%, transparent 50%), radial-gradient(circle at 82% 50%, rgba(250, 204, 21, 0.22) 0%, transparent 45%)'
                          }}
                        />

                        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-5">
                          {/* Left: Gold Trophy Illustration + Title & Metadata */}
                          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                            {/* 3D-style Gold Trophy SVG on Pedestal */}
                            <div className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] shrink-0 flex items-center justify-center">
                              <svg viewBox="0 0 64 64" className="w-full h-full">
                                <defs>
                                  <linearGradient id="hdrTrophyGold" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#FFF085" />
                                    <stop offset="45%" stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#B45309" />
                                  </linearGradient>
                                  <linearGradient id="hdrPedestalBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38BDF8" />
                                    <stop offset="100%" stopColor="#0369A1" />
                                  </linearGradient>
                                </defs>
                                <ellipse cx="32" cy="56" rx="22" ry="6" fill="url(#hdrPedestalBlue)" stroke="#7DD3FC" strokeWidth="1.2" />
                                <rect x="22" y="47" width="20" height="7" rx="2.5" fill="#1E293B" stroke="#F59E0B" strokeWidth="1" />
                                <rect x="28" y="37" width="8" height="11" rx="2" fill="url(#hdrTrophyGold)" />
                                <path d="M18 14 H46 V24 C46 33 40 39 32 39 C24 39 18 33 18 24 Z" fill="url(#hdrTrophyGold)" />
                                <path d="M18 17 H12 C10 17 9 19 9 22 C9 27 13 31 18 31" fill="none" stroke="url(#hdrTrophyGold)" strokeWidth="3.5" strokeLinecap="round" />
                                <path d="M46 17 H52 C54 17 55 19 55 22 C55 27 51 31 46 31" fill="none" stroke="url(#hdrTrophyGold)" strokeWidth="3.5" strokeLinecap="round" />
                                <polygon points="32,19 34.2,23.5 39,24.2 35.5,27.6 36.3,32.4 32,30.1 27.7,32.4 28.5,27.6 25,24.2 29.8,23.5" fill="#FFFBEB" />
                              </svg>
                            </div>

                            {/* Center/Left Title & Badges Row */}
                            <div className="min-w-0 flex-1">
                              <h2
                                className="text-[20px] sm:text-[25px] md:text-[27px] font-black text-white uppercase tracking-wide leading-tight"
                                style={{ color: '#FFFFFF', fontWeight: 900 }}
                              >
                                THƯỞNG THI ĐUA SIÊU THỊ
                              </h2>

                              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                                {/* Store Code & Name */}
                                <div className="flex items-center gap-1.5 text-[12px] sm:text-[13.5px] font-bold text-white/95 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shrink-0">
                                    <Store size={12} />
                                  </span>
                                  <span className="truncate">{selectedStoreFilter}</span>
                                </div>

                                {/* Right Pill Badges */}
                                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                                  {/* Badge 1: TOP 10% HẠNG ≤ X */}
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#071936]/90 border border-amber-400/50 text-[11px] font-extrabold text-amber-300 whitespace-nowrap">
                                    <span>⭐</span>
                                    <span>TOP 10% HẠNG ≤ {selectedStoreExcelData.limit}</span>
                                  </span>

                                  {/* Badge 2: LŨY KẾ THÁNG X */}
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09224A]/90 border border-sky-400/40 text-[11px] font-extrabold text-sky-100 whitespace-nowrap">
                                    <BarChart3 size={12} className="text-sky-400" />
                                    <span>LŨY KẾ THÁNG {thuongStStats.detectedMonth || (new Date().getMonth() + 1)}</span>
                                  </span>

                                  {/* Badge 3: SO SÁNH VỚI HÔM QUA */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isComparing) {
                                        setBonusFilterTab(prev => prev === 'INCREASED' ? 'ALL' : 'INCREASED');
                                      } else {
                                        thuongStUploadInputRef.current?.click();
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09224A]/95 hover:bg-[#10316B] border border-amber-300/45 text-[11px] font-extrabold text-white whitespace-nowrap cursor-pointer transition-colors"
                                    title={isComparing ? 'Đang bật chế độ so sánh với hôm qua' : 'Nhấn để tải thêm file so sánh với hôm qua'}
                                  >
                                    <TrendingUp size={12} className="text-amber-400" />
                                    <span>SO SÁNH VỚI HÔM QUA</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Decorative Royal Crown Illustration */}
                          <div className="hidden md:flex w-[58px] h-[54px] shrink-0 items-center justify-center">
                            <svg viewBox="0 0 64 56" className="w-full h-full">
                              <defs>
                                <linearGradient id="hdrCrownGold" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#FEF08A" />
                                  <stop offset="50%" stopColor="#F59E0B" />
                                  <stop offset="100%" stopColor="#B45309" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M8 42 L4 16 L20 28 L32 10 L44 28 L60 16 L56 42 Z"
                                fill="url(#hdrCrownGold)"
                                stroke="#FDE68A"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                              <rect x="8" y="44" width="48" height="6" rx="3" fill="url(#hdrCrownGold)" />
                              <circle cx="4" cy="14" r="3" fill="#FEF08A" />
                              <circle cx="32" cy="8" r="3.5" fill="#FEF08A" />
                              <circle cx="60" cy="14" r="3" fill="#FEF08A" />
                              <circle cx="32" cy="34" r="2.8" fill="#EF4444" />
                              <circle cx="20" cy="36" r="2.2" fill="#38BDF8" />
                              <circle cx="44" cy="36" r="2.2" fill="#38BDF8" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* 4. KHU VỰC THÔNG TIN TỔNG QUAN (3 Cards in 1 Row on Desktop) */}
                      <div className="thuong-st-kpi-grid grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        {/* 4.1. Thẻ kỳ báo cáo và dự kiến thưởng lũy kế */}
                        <div className="bg-white rounded-[15px] border border-[#DCE6F0] p-3.5 sm:p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(11,46,89,0.04)]">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-[10px] bg-[#EBF3FF] border border-[#CFE0FF] text-[#1769FF] flex items-center justify-center shrink-0 mt-0.5">
                              <Calendar size={18} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-[#718198] uppercase tracking-wider">
                                KỲ BÁO CÁO THI ĐUA
                              </div>
                              <div className="text-[16px] sm:text-[17.5px] font-black text-[#0B2E59] uppercase leading-tight mt-0.5">
                                DỰ KIẾN THƯỞNG LŨY KẾ
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 mt-3">
                            {/* Old Report File Box */}
                            <div
                              className="flex-1 min-w-0 bg-[#F4F7FB] border border-[#DCE6F0] rounded-[10px] p-2 flex items-center gap-2"
                              title={selectedStoreExcelData.oldFileName || 'Chưa có file cũ'}
                            >
                              <div className="w-7 h-7 rounded-lg bg-white border border-[#DCE6F0] text-[#64748B] flex items-center justify-center shrink-0">
                                <FileText size={14} />
                              </div>
                              <div className="text-[10.5px] sm:text-[11px] font-bold text-[#172B4D] leading-tight line-clamp-2">
                                Cũ: {selectedStoreExcelData.oldFileName || 'Chưa có file hôm qua'}
                              </div>
                            </div>

                            <span className="text-[#94A3B8] shrink-0 text-xs font-bold">→</span>

                            {/* New Report File Box */}
                            <div
                              className="flex-1 min-w-0 bg-[#E5F8F1] border border-[#B5EBD6] rounded-[10px] p-2 flex items-center gap-2"
                              title={selectedStoreExcelData.fileName || 'File đang hoạt động'}
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#079B78] text-white flex items-center justify-center shrink-0 font-black text-[11px]">
                                +
                              </div>
                              <div className="text-[10.5px] sm:text-[11px] font-bold text-[#065F46] leading-tight line-clamp-2">
                                Mới: {selectedStoreExcelData.fileName || 'Đang hoạt động'}
                              </div>
                            </div>

                            {/* Refresh / Swap Action Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isComparing) {
                                  handleSwapOldAndNew();
                                } else {
                                  thuongStUploadInputRef.current?.click();
                                }
                              }}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EBF3FF] hover:bg-[#DCE8FF] border border-[#BFD6FF] text-[#1769FF] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                              title={isComparing ? 'Đổi thứ tự File Cũ ⇄ File Mới' : 'Nạp thêm file báo cáo mới'}
                            >
                              <RefreshCw size={14} strokeWidth={2.3} />
                            </button>
                          </div>
                        </div>

                        {/* 4.2. Thẻ tổng thưởng dự kiến (Most Important KPI Card) */}
                        <div
                          className="rounded-[15px] border border-[#A5E6CE] p-3.5 sm:p-4 flex items-center justify-between relative overflow-hidden shadow-[0_2px_10px_rgba(7,155,120,0.08)]"
                          style={{
                            background: 'linear-gradient(135deg, #E2F8F0 0%, #EEFCF7 52%, #D4F4E7 100%)'
                          }}
                        >
                          {/* Top-right decorative small badge */}
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md bg-white/75 border border-[#A5E6CE] flex items-center justify-center text-[#079B78] text-[10px] font-bold">
                            ✦
                          </span>

                          <div className="space-y-1.5 z-10 min-w-0 flex-1">
                            <div className="text-[12px] sm:text-[13px] font-extrabold text-[#0F5132] uppercase tracking-wide">
                              TỔNG THƯỞNG DỰ KIẾN
                            </div>

                            <div className="text-[28px] sm:text-[33px] xl:text-[36px] font-black text-[#067A5B] leading-none tracking-tight tabular-nums">
                              {thuongStStats.totalBonusCurrent.toLocaleString('vi-VN')} đ
                            </div>

                            {/* Difference Badge */}
                            <div className="pt-0.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 border text-[11.5px] font-extrabold tabular-nums ${
                                  isComparing && thuongStStats.totalBonusDiff < 0
                                    ? 'border-[#F8BBC6] text-[#E11D48]'
                                    : 'border-[#A5E6CE] text-[#079B78]'
                                }`}
                              >
                                {isComparing && thuongStStats.totalBonusDiff < 0 ? (
                                  <>
                                    <TrendingDown size={12} />
                                    <span>-{Math.abs(thuongStStats.totalBonusDiff).toLocaleString('vi-VN')} đ</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp size={12} />
                                    <span>
                                      +{(isComparing ? thuongStStats.totalBonusDiff : thuongStStats.totalBonusCurrent).toLocaleString('vi-VN')} đ
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Achieved Categories Count */}
                            <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#172B4D] pt-0.5 flex-wrap">
                              <span className="w-4 h-4 rounded bg-[#079B78] text-white inline-flex items-center justify-center text-[9.5px] shrink-0">
                                ★
                              </span>
                              <span>
                                Đạt thưởng: <strong className="font-black">{thuongStStats.bonusRows.length}/{thuongStStats.all.length} nhóm hàng</strong>
                              </span>
                              <span className="text-[#64748B] font-semibold">
                                (Hôm qua: {isComparing ? thuongStStats.all.filter((r: any) => r.bonusOld > 0).length : 0})
                              </span>
                            </div>
                          </div>

                          {/* Right Trophy Illustration */}
                          <div className="w-[70px] h-[78px] sm:w-[80px] sm:h-[86px] shrink-0 z-10 flex items-center justify-center ml-2">
                            <svg viewBox="0 0 80 88" className="w-full h-full">
                              <defs>
                                <linearGradient id="kpiTrophyCup" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#FEF08A" />
                                  <stop offset="50%" stopColor="#F59E0B" />
                                  <stop offset="100%" stopColor="#B45309" />
                                </linearGradient>
                                <linearGradient id="kpiTrophyBase" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#92400E" />
                                  <stop offset="100%" stopColor="#451A03" />
                                </linearGradient>
                              </defs>
                              <circle cx="16" cy="20" r="2.2" fill="#F59E0B" />
                              <circle cx="66" cy="16" r="2.5" fill="#F59E0B" />
                              <circle cx="68" cy="44" r="2" fill="#10B981" />
                              <rect x="20" y="72" width="40" height="8" rx="3" fill="url(#kpiTrophyBase)" />
                              <rect x="25" y="64" width="30" height="9" rx="2" fill="url(#kpiTrophyCup)" />
                              <rect x="35" y="49" width="10" height="16" rx="2" fill="url(#kpiTrophyCup)" />
                              <path d="M20 16 H60 V30 C60 43 51 51 40 51 C29 51 20 43 20 30 Z" fill="url(#kpiTrophyCup)" />
                              <path d="M20 20 H12 C9 20 8 23 8 27 C8 34 13 39 20 39" fill="none" stroke="url(#kpiTrophyCup)" strokeWidth="4" strokeLinecap="round" />
                              <path d="M60 20 H68 C71 20 72 23 72 27 C72 34 67 39 60 39" fill="none" stroke="url(#kpiTrophyCup)" strokeWidth="4" strokeLinecap="round" />
                              <polygon points="40,22 42.6,27.3 48.5,28.1 44.2,32.2 45.2,38 40,35.2 34.8,38 35.8,32.2 31.5,28.1 37.4,27.3" fill="#FFFBEB" />
                            </svg>
                          </div>
                        </div>

                        {/* 4.3. Thẻ biến động so với hôm qua */}
                        <div className="thuong-st-card-3 bg-white rounded-[15px] border border-[#DCE6F0] p-3.5 sm:p-4 flex flex-col justify-between shadow-[0_2px_8px_rgba(11,46,89,0.04)]">
                          <div className="flex items-center justify-between pb-1.5">
                            <span className="text-[11.5px] font-extrabold text-[#4A5B73] uppercase tracking-wider">
                              BIẾN ĐỘNG SO VỚI HÔM QUA
                            </span>
                            <span className="w-5 h-5 rounded-full bg-[#EBF3FF] text-[#1769FF] flex items-center justify-center">
                              <ChevronDown size={12} strokeWidth={2.5} />
                            </span>
                          </div>

                          <div className="thuong-st-diff-grid flex flex-col gap-2 mt-1 grow justify-center">
                            {/* Sub-card 1: GIẢM/MẤT */}
                            <div
                              onClick={() => setBonusFilterTab(prev => prev === 'DECREASED' ? 'ALL' : 'DECREASED')}
                              className={`px-3 py-2 rounded-[11px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                bonusFilterTab === 'DECREASED'
                                  ? 'bg-[#FFE4E9] border-[#F43F5E] ring-1 ring-[#F43F5E]'
                                  : 'bg-[#FFF2F4] border-[#FAD4DA] hover:bg-[#FFE9ED]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#FFE0E6] text-[#F04464] flex items-center justify-center shrink-0">
                                  <TrendingDown size={15} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-extrabold text-[#D93855] uppercase leading-none">
                                    GIẢM/MẤT
                                  </div>
                                  <div className="text-[15px] sm:text-[16px] font-black text-[#D93855] leading-tight mt-0.5 tabular-nums">
                                    {thuongStStats.totalDecreasedAmount > 0
                                      ? `-${thuongStStats.totalDecreasedAmount.toLocaleString('vi-VN')} đ`
                                      : '0 đ'}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#FFE0E6] border border-[#F8BBC6] text-[#D93855] text-[10.5px] font-extrabold shrink-0 whitespace-nowrap">
                                {thuongStStats.decreasedRows.length} ngành hàng
                              </span>
                            </div>

                            {/* Sub-card 2: TĂNG/MỚI */}
                            <div
                              onClick={() => setBonusFilterTab(prev => prev === 'INCREASED' ? 'ALL' : 'INCREASED')}
                              className={`px-3 py-2 rounded-[11px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                bonusFilterTab === 'INCREASED'
                                  ? 'bg-[#D5F7E8] border-[#079B78] ring-1 ring-[#079B78]'
                                  : 'bg-[#ECFDF6] border-[#BDEED9] hover:bg-[#E0FAF0]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#D1FAE5] text-[#079B78] flex items-center justify-center shrink-0">
                                  <TrendingUp size={15} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-extrabold text-[#079B78] uppercase leading-none">
                                    TĂNG/MỚI
                                  </div>
                                  <div className="text-[15px] sm:text-[16px] font-black text-[#067A5B] leading-tight mt-0.5 tabular-nums">
                                    +{(isComparing ? thuongStStats.totalIncreasedAmount : thuongStStats.totalBonusCurrent).toLocaleString('vi-VN')} đ
                                  </div>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#D5F7E8] border border-[#9FE3C6] text-[#067A5B] text-[10.5px] font-extrabold shrink-0 whitespace-nowrap">
                                {isComparing ? thuongStStats.increasedRows.length : thuongStStats.bonusRows.length} ngành hàng
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 5. THANH CẢNH BÁO */}
                      {showThuongStWarning && (
                        <div className="flex items-center justify-between gap-2.5 px-3.5 py-2 bg-[#FFF7E8] border border-[#F5DFB0] rounded-[10px] text-[12px] font-bold text-[#A85B12]">
                          <div className="flex items-center gap-2 min-w-0">
                            <Bell size={15} className="shrink-0 text-[#D97706] fill-[#F59E0B]" />
                            <span>
                              Nếu Siêu Thị Nằm Top 10% Nhưng Không Có Thưởng Thì Là Do Nhóm Hàng Này Vùng Chưa Đạt Min Để Có Quỹ Thưởng.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowThuongStWarning(false)}
                            className="text-[#A85B12]/70 hover:text-[#A85B12] p-0.5 rounded cursor-pointer shrink-0"
                            title="Ẩn thông báo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* 6. THANH CÔNG CỤ BẢNG DỮ LIỆU */}
                      <div className="bg-white border border-[#DCE6F0] rounded-[12px] p-2 flex flex-wrap items-center justify-between gap-2">
                        {/* Left Filters */}
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                          {/* 1. Ô tìm kiếm nhóm hàng */}
                          <div className="relative flex-1 min-w-[180px] sm:max-w-[240px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718198]" />
                            <input
                              type="text"
                              value={thuongStSearchQuery}
                              onChange={e => setThuongStSearchQuery(e.target.value)}
                              placeholder="Tìm nhóm hàng..."
                              className="w-full h-[38px] pl-8 pr-7 rounded-[9px] border border-[#DCE6F0] bg-[#F8FAFD] focus:bg-white focus:border-[#1769FF] outline-none text-[12.5px] font-medium text-[#172B4D] placeholder:text-[#718198]"
                            />
                            {thuongStSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setThuongStSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718198] hover:text-[#172B4D] cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {/* 2. Bộ lọc tất cả nhóm hàng */}
                          <select
                            value={thuongStGroupFilter}
                            onChange={e => setThuongStGroupFilter(e.target.value as any)}
                            className="h-[38px] px-3 rounded-[9px] border border-[#DCE6F0] bg-white text-[12.5px] font-semibold text-[#172B4D] outline-none focus:border-[#1769FF] cursor-pointer"
                          >
                            <option value="ALL">Tất cả nhóm</option>
                            <option value="yellow">Nhóm Điện thoại - Công nghệ</option>
                            <option value="green">Nhóm Tài chính - Dịch vụ</option>
                            <option value="blue">Nhóm Điện máy - Gia dụng</option>
                          </select>

                          {/* 3. Bộ lọc trạng thái */}
                          <select
                            value={bonusFilterTab}
                            onChange={e => setBonusFilterTab(e.target.value as any)}
                            className="h-[38px] px-3 rounded-[9px] border border-[#DCE6F0] bg-white text-[12.5px] font-semibold text-[#172B4D] outline-none focus:border-[#1769FF] cursor-pointer"
                          >
                            <option value="ALL">Tất cả trạng thái ({thuongStStats.all.length})</option>
                            <option value="BONUS">Đạt thưởng ({thuongStStats.bonusRows.length})</option>
                            <option value="NEAR">Đang tiến gần ({thuongStStats.nearRows.length})</option>
                            <option value="NOT_YET">Chưa đạt ({thuongStStats.notYetRows.length})</option>
                            <option value="EXCEEDED">Nhóm vượt trội ({thuongStStats.exceededRows.length})</option>
                            {isComparing && (
                              <option value="INCREASED">Tăng / Mới đạt ({thuongStStats.increasedRows.length})</option>
                            )}
                            {isComparing && (
                              <option value="DECREASED">Giảm / Mất thưởng ({thuongStStats.decreasedRows.length})</option>
                            )}
                          </select>

                          {/* 4. Bộ chọn cách hiển thị nhóm */}
                          <select
                            value={thuongStViewMode}
                            onChange={e => setThuongStViewMode(e.target.value as any)}
                            className="h-[38px] px-3 rounded-[9px] border border-[#DCE6F0] bg-white text-[12.5px] font-semibold text-[#172B4D] outline-none focus:border-[#1769FF] cursor-pointer"
                          >
                            <option value="GROUPED">Theo nhóm hiển thị</option>
                            <option value="FLAT">Danh sách phẳng</option>
                            <option value="SORT_HT_DESC">Sắp xếp: % Hoàn thành cao nhất</option>
                            <option value="SORT_BONUS_DESC">Sắp xếp: Thưởng dự kiến cao nhất</option>
                          </select>
                        </div>

                        {/* Right Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* 5. Nút SO SÁNH HÔM QUA */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isComparing) {
                                setBonusFilterTab(prev => prev === 'INCREASED' ? 'ALL' : 'INCREASED');
                              } else {
                                thuongStUploadInputRef.current?.click();
                              }
                            }}
                            className="h-[38px] px-3.5 rounded-[9px] border border-[#93C5FD] bg-[#F0F7FF] hover:bg-[#E0EFFE] text-[#1769FF] text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <TrendingUp size={14} />
                            <span>So sánh hôm qua</span>
                          </button>

                          {/* 6. Nút XUẤT EXCEL */}
                          <button
                            type="button"
                            onClick={handleExportThuongStExcel}
                            className="h-[38px] px-4 rounded-[9px] bg-gradient-to-r from-[#1769FF] to-[#0B57D0] hover:from-[#0B57D0] hover:to-[#0842A0] text-white text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Download size={14} />
                            <span>Xuất Excel</span>
                          </button>
                        </div>
                      </div>

                      {/* 7. CÁC THẺ THỐNG KÊ NHÓM HÀNG (6 Cards Row) */}
                      <div className="thuong-st-summary-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {/* Card 7.1: Tất cả */}
                        <div
                          onClick={() => setBonusFilterTab('ALL')}
                          className={`rounded-[12px] p-3 border transition-all cursor-pointer flex items-center gap-3 min-h-[76px] ${
                            bonusFilterTab === 'ALL'
                              ? 'bg-gradient-to-br from-[#079B78] to-[#058264] border-[#067A5B] text-white'
                              : 'bg-white border-[#DCE6F0] text-[#172B4D] hover:border-[#079B78]'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              bonusFilterTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-[#E5F8F1] text-[#079B78]'
                            }`}
                          >
                            <Award size={20} strokeWidth={2.3} />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-[11.5px] font-bold ${bonusFilterTab === 'ALL' ? 'text-white/90' : 'text-[#718198]'}`}>
                              Tất cả
                            </div>
                            <div className="text-[22px] font-black leading-none my-0.5 tabular-nums">
                              {thuongStStats.all.length}
                            </div>
                            <div className={`text-[10.5px] font-semibold ${bonusFilterTab === 'ALL' ? 'text-white/85' : 'text-[#718198]'}`}>
                              nhóm hàng
                            </div>
                          </div>
                        </div>

                        {/* Card 7.2: Đạt thưởng */}
                        <div
                          onClick={() => setBonusFilterTab(prev => prev === 'BONUS' ? 'ALL' : 'BONUS')}
                          className={`rounded-[12px] p-3 border transition-all cursor-pointer flex items-center gap-3 min-h-[76px] ${
                            bonusFilterTab === 'BONUS'
                              ? 'bg-[#FFE4E9] border-[#F04464] ring-1 ring-[#F04464]'
                              : 'bg-[#FFF4F6] border-[#FAD4DA] hover:bg-[#FFEAEF]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#FFE0E6] text-[#E11D48] flex items-center justify-center shrink-0">
                            <Trophy size={19} strokeWidth={2.3} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11.5px] font-bold text-[#D93855]">
                              Đạt thưởng
                            </div>
                            <div className="text-[22px] font-black text-[#D93855] leading-none my-0.5 tabular-nums">
                              {thuongStStats.bonusRows.length}
                            </div>
                            <div className="text-[10.5px] font-semibold text-[#D93855]/85">
                              nhóm hàng
                            </div>
                          </div>
                        </div>

                        {/* Card 7.3: Đang tiến gần */}
                        <div
                          onClick={() => setBonusFilterTab(prev => prev === 'NEAR' ? 'ALL' : 'NEAR')}
                          className={`rounded-[12px] p-3 border transition-all cursor-pointer flex items-center gap-3 min-h-[76px] ${
                            bonusFilterTab === 'NEAR'
                              ? 'bg-[#DBEAFE] border-[#1769FF] ring-1 ring-[#1769FF]'
                              : 'bg-[#EFF6FF] border-[#CFE0FF] hover:bg-[#E4F0FF]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#DCEBFF] text-[#1769FF] flex items-center justify-center shrink-0">
                            <Target size={20} strokeWidth={2.3} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11.5px] font-bold text-[#1769FF]">
                              Đang tiến gần
                            </div>
                            <div className="text-[22px] font-black text-[#1769FF] leading-none my-0.5 tabular-nums">
                              {thuongStStats.nearRows.length}
                            </div>
                            <div className="text-[10.5px] font-semibold text-[#1769FF]/85">
                              nhóm hàng
                            </div>
                          </div>
                        </div>

                        {/* Card 7.4: Chưa đạt */}
                        <div
                          onClick={() => setBonusFilterTab(prev => prev === 'NOT_YET' ? 'ALL' : 'NOT_YET')}
                          className={`rounded-[12px] p-3 border transition-all cursor-pointer flex items-center gap-3 min-h-[76px] ${
                            bonusFilterTab === 'NOT_YET'
                              ? 'bg-[#E2E8F0] border-[#64748B] ring-1 ring-[#64748B]'
                              : 'bg-[#F4F7FB] border-[#DCE6F0] hover:bg-[#EAF0F7]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center shrink-0">
                            <MoreHorizontal size={20} strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11.5px] font-bold text-[#475569]">
                              Chưa đạt
                            </div>
                            <div className="text-[22px] font-black text-[#172B4D] leading-none my-0.5 tabular-nums">
                              {thuongStStats.notYetRows.length}
                            </div>
                            <div className="text-[10.5px] font-semibold text-[#64748B]">
                              nhóm hàng
                            </div>
                          </div>
                        </div>

                        {/* Card 7.5: Hoàn thành TB */}
                        <div className="rounded-[12px] p-3 bg-white border border-[#DCE6F0] flex flex-col justify-between min-h-[76px]">
                          <div className="text-[11.5px] font-bold text-[#475569]">
                            Hoàn thành TB
                          </div>
                          <div className="text-[21px] font-black text-[#079B78] leading-none my-1 tabular-nums">
                            {thuongStStats.avgCompletion.toFixed(1)}%
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-[#E5ECF4] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, thuongStStats.avgCompletion))}%`,
                                background: 'linear-gradient(90deg, #079B78 0%, #10B981 100%)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Card 7.6: Số nhóm vượt trội */}
                        <div
                          onClick={() => setBonusFilterTab(prev => prev === 'EXCEEDED' ? 'ALL' : 'EXCEEDED')}
                          className={`rounded-[12px] p-3 border transition-all cursor-pointer flex items-center gap-3 min-h-[76px] ${
                            bonusFilterTab === 'EXCEEDED'
                              ? 'bg-[#E5F8F1] border-[#079B78] ring-1 ring-[#079B78]'
                              : 'bg-white border-[#DCE6F0] hover:bg-[#F4FBF8]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-[10px] bg-[#E5F8F1] border border-[#B5EBD6] text-[#079B78] flex items-center justify-center shrink-0">
                            <TrendingUp size={20} strokeWidth={2.4} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-[#475569] truncate">
                              Số nhóm vượt trội
                            </div>
                            <div className="text-[22px] font-black text-[#079B78] leading-none my-0.5 tabular-nums">
                              {thuongStStats.exceededRows.length}
                            </div>
                            <div className="text-[10.5px] font-semibold text-[#64748B]">
                              nhóm hàng
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 8 & 9. BẢNG THƯỞNG CHI TIẾT & PHÂN NHÓM NGÀNH HÀNG */}
                      <div className="bg-white rounded-[14px] border border-[#DCE6F0] overflow-hidden shadow-[0_2px_8px_rgba(11,46,89,0.03)]">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full border-separate border-spacing-0 table-fixed min-w-[780px]">
                            <colgroup>
                              <col style={{ width: '50px' }} />
                              <col style={{ width: 'auto' }} />
                              <col style={{ width: isComparing ? '210px' : '185px' }} />
                              <col style={{ width: '130px' }} />
                              <col style={{ width: '140px' }} />
                              <col style={{ width: isComparing ? '195px' : '155px' }} />
                            </colgroup>
                            <thead>
                              <tr
                                className="h-[46px] text-[#1E3A5F]"
                                style={{
                                  background: 'linear-gradient(180deg, #EEF4FB 0%, #E3ECF8 100%)'
                                }}
                              >
                                <th className="px-2 py-1 text-[11.5px] font-extrabold uppercase text-center border-r border-b border-[#CFDCEB]">
                                  STT
                                </th>
                                <th className="px-3.5 py-1 text-[11.5px] font-extrabold uppercase text-left border-r border-b border-[#CFDCEB]">
                                  NHÓM HÀNG
                                </th>
                                <th className="px-2 py-1 text-[11.5px] font-extrabold uppercase text-center border-r border-b border-[#CFDCEB] leading-tight">
                                  HOÀN THÀNH
                                  <br />
                                  <span className="text-[10px] font-semibold text-[#5A6E85]">(DỰ KIẾN)</span>
                                </th>
                                <th className="px-2 py-1 text-[11.5px] font-extrabold uppercase text-center border-r border-b border-[#CFDCEB] leading-tight">
                                  HẠNG H.TARGET
                                  <br />
                                  <span className="text-[10px] font-semibold text-[#5A6E85]">(THEO KÊNH)</span>
                                </th>
                                <th className="px-2 py-1 text-[11.5px] font-extrabold uppercase text-center border-r border-b border-[#CFDCEB] leading-tight">
                                  HẠNG VƯỢT TRỘI
                                  <br />
                                  <span className="text-[10px] font-semibold text-[#5A6E85]">(DT/SL THEO KÊNH)</span>
                                </th>
                                <th className="px-3.5 py-1 text-[11.5px] font-extrabold uppercase text-right border-b border-[#CFDCEB]">
                                  THƯỞNG DỰ KIẾN
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {thuongStViewMode === 'GROUPED' ? (
                                <>
                                  {/* Nhóm 1: ĐIỆN THOẠI - CÔNG NGHỆ */}
                                  {renderThuongStGroupHeader('yellow', filteredThuongStRows.yellow, filteredThuongStRows.yellowAvg)}
                                  {!collapsedThuongStGroups.yellow &&
                                    filteredThuongStRows.yellow.map((row, idx) => renderThuongStRow(row, idx, 'yellow'))}

                                  {/* Nhóm 2: TÀI CHÍNH - DỊCH VỤ */}
                                  {renderThuongStGroupHeader('green', filteredThuongStRows.green, filteredThuongStRows.greenAvg)}
                                  {!collapsedThuongStGroups.green &&
                                    filteredThuongStRows.green.map((row, idx) => renderThuongStRow(row, idx, 'green'))}

                                  {/* Nhóm 3: ĐIỆN MÁY - GIA DỤNG */}
                                  {renderThuongStGroupHeader('blue', filteredThuongStRows.blue, filteredThuongStRows.blueAvg)}
                                  {!collapsedThuongStGroups.blue &&
                                    filteredThuongStRows.blue.map((row, idx) => renderThuongStRow(row, idx, 'blue'))}
                                </>
                              ) : (
                                filteredThuongStRows.all.map((row: any, idx: number) =>
                                  renderThuongStRow(row, idx, getCategoryGroup(row.categoryName), idx + 1)
                                )
                              )}

                              {/* Empty placeholder */}
                              {filteredThuongStRows.all.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-4 py-12 text-center text-[#718198] font-bold text-sm">
                                    Không tìm thấy nhóm hàng nào phù hợp với bộ lọc hiện tại.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'bcdtnh' && (
              <motion.div
                key="bcdtnh"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <BcDtNganhHang isUser43751={is43751} />
              </motion.div>
            )}

            {activeTab === 'ssg_boss' && (
              <motion.div
                key="ssg_boss"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SSGBoss biMarkets={displayData.markets || []} daysPassed={daysPassed} totalDays={totalDays} />
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </main>

      <ConfirmationModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          clearData();
          setShowConfirm(false);
        }}
        title="XÓA DỮ LIỆU?"
        message="Hành động này sẽ xóa toàn bộ dữ liệu hiện tại và không thể hoàn tác."
      />

      {/* AI Comment Modal for THƯỞNG ST */}
      {thuongStCommentOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setThuongStCommentOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét thưởng thi đua
                </span>
              </div>
              <button onClick={() => setThuongStCommentOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {[
                  { id: 1 as const, label: 'Mẫu 1: Tổng quan', icon: '🏆' },
                  { id: 2 as const, label: isComparing ? 'Mẫu 2: Ngành giảm thưởng' : 'Mẫu 2: Chưa đạt', icon: '⚠️' },
                  { id: 3 as const, label: isComparing ? 'Mẫu 3: So sánh chi tiết' : 'Mẫu 3: Tóm tắt', icon: '⚡' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setThuongStTemplate(tab.id);
                      handleGenerateAIComment(tab.id);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      thuongStTemplate === tab.id
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
                value={thuongStComment}
                onChange={(e) => setThuongStComment(e.target.value)}
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
                      await navigator.clipboard.writeText(thuongStComment);
                      setCopiedThuongStComment(true);
                      setTimeout(() => setCopiedThuongStComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedThuongStComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedThuongStComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Nhận xét Doanh thu & Ngành hàng Modal (BC THÁNG) - 100% Pixel-Perfect matching BC NGÀY */}
      {isCategoryCommentModalOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            onClick={() => setIsCategoryCommentModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-auto animate-in fade-in zoom-in-95 duration-200"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
          >
            {/* Header Banner - Orange Gradient matching Image 2 */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-white" />
                <span className="text-[14px] sm:text-[15px] font-black text-white uppercase tracking-wide">
                  Nhận xét thi đua
                </span>
              </div>
              <button
                onClick={() => setIsCategoryCommentModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="px-5 sm:px-6 pt-5 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2.5 uppercase tracking-wide">
                Chọn mẫu nội dung nhận xét:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {luykeCategoryCommentTemplates.map((tab, idx) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedCategoryTemplate(idx);
                      setCategoryCommentText(tab.text);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-[11.5px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      selectedCategoryTemplate === idx
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Comment Box */}
            <div className="px-5 sm:px-6 pb-6 pt-2 space-y-4">
              <div>
                <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">
                  Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
                </p>
                <textarea
                  value={categoryCommentText}
                  onChange={e => setCategoryCommentText(e.target.value)}
                  rows={12}
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-[12.5px] sm:text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                  style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11.5px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={handleCopyCategoryComment}
                  className={`flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
                    copiedCategoryComment
                      ? 'text-white bg-emerald-500 border border-emerald-600 shadow-emerald-500/20'
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-orange-500/25'
                  }`}
                >
                  {copiedCategoryComment ? (
                    <>
                      <Check size={16} />
                      <span>Đã copy!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Sao chép nhận xét</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bộ Lọc Ẩn Ngành Hàng Modal (Chỉ áp dụng riêng cho BC THÁNG > TỔNG QUAN) */}
      {isCategoryFilterModalOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div
            onClick={() => setIsCategoryFilterModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
          >
            {/* Header Banner */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
                  <Filter size={18} />
                </div>
                <div>
                  <h3 className="text-[14.5px] sm:text-[16px] font-black text-white uppercase tracking-wide">
                    Bộ Lọc Ẩn Ngành Hàng
                  </h3>
                  <p className="text-[10.5px] text-emerald-100 font-medium">
                    Áp dụng riêng cho BC THÁNG &gt; TỔNG QUAN • Lưu tự động vào trình duyệt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryFilterModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Đóng modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subtabs SL vs DT */}
            <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setCategoryFilterActiveTab('SL')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    categoryFilterActiveTab === 'SL'
                      ? 'bg-gradient-to-r from-[#047857] to-[#10B981] text-white border-emerald-600 shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>NGÀNH HÀNG (SL)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    categoryFilterActiveTab === 'SL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {visibleCategoriesSL.length}/{rawCategoriesSL.length}
                  </span>
                  {hiddenCatsSL.length > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                      Ẩn {hiddenCatsSL.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCategoryFilterActiveTab('DT')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    categoryFilterActiveTab === 'DT'
                      ? 'bg-gradient-to-r from-[#047857] to-[#10B981] text-white border-emerald-600 shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>NGÀNH HÀNG (DT)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    categoryFilterActiveTab === 'DT' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {visibleCategoriesDT.length}/{rawCategoriesDT.length}
                  </span>
                  {hiddenCatsDT.length > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                      Ẩn {hiddenCatsDT.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search & Fast Actions */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={categoryFilterSearch}
                    onChange={(e) => setCategoryFilterSearch(e.target.value)}
                    placeholder={`Tìm kiếm ngành hàng ${categoryFilterActiveTab}...`}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {categoryFilterSearch && (
                    <button
                      onClick={() => setCategoryFilterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => categoryFilterActiveTab === 'SL' ? showAllCategoriesSL() : showAllCategoriesDT()}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer"
                    title="Hiện tất cả ngành hàng trong danh sách này"
                  >
                    Hiện tất cả
                  </button>

                  <button
                    onClick={() => categoryFilterActiveTab === 'SL' ? hideAchievedCategoriesSL() : hideAchievedCategoriesDT()}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer"
                    title="Ẩn những ngành hàng đã đạt kế hoạch (>= 100%)"
                  >
                    Ẩn ngành đã đạt
                  </button>

                  <button
                    onClick={() => categoryFilterActiveTab === 'SL' ? hideAllCategoriesSL() : hideAllCategoriesDT()}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer"
                    title="Ẩn toàn bộ ngành hàng trong danh sách này"
                  >
                    Ẩn tất cả
                  </button>
                </div>
              </div>
            </div>

            {/* Category Items List */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
              {(() => {
                const currentList = categoryFilterActiveTab === 'SL' ? rawCategoriesSL : rawCategoriesDT;
                const currentHidden = categoryFilterActiveTab === 'SL' ? hiddenCatsSL : hiddenCatsDT;
                const toggleFn = categoryFilterActiveTab === 'SL' ? toggleHideCategorySL : toggleHideCategoryDT;

                const filteredList = currentList.filter((c: any) => {
                  if (!categoryFilterSearch.trim()) return true;
                  return (c.name || '').toLowerCase().includes(categoryFilterSearch.toLowerCase().trim());
                });

                if (filteredList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <p className="text-sm font-bold">Không tìm thấy ngành hàng phù hợp với từ khóa "{categoryFilterSearch}"</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredList.map((cat: any, idx: number) => {
                      const isHidden = currentHidden.includes((cat.name || '').trim().toUpperCase());
                      let rate = 0;
                      if (cat.target > 0 && daysPassed > 0) {
                        rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleFn(cat.name)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                            !isHidden
                              ? 'bg-white hover:bg-emerald-50/40 border-emerald-200 shadow-2xs'
                              : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox / Eye toggle */}
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                              !isHidden
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}>
                              {!isHidden ? <Check size={14} strokeWidth={3} /> : <EyeOff size={12} />}
                            </div>

                            <div className="min-w-0">
                              <h4 className={`text-xs font-black uppercase truncate ${
                                !isHidden ? 'text-slate-800' : 'text-slate-400 line-through'
                              }`}>
                                {cat.name}
                              </h4>
                              <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                                <span>Target: {Math.round(cat.target || 0).toLocaleString()}</span>
                                <span>•</span>
                                <span>LK: {Math.round(cat.revenue || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-black text-[11px] leading-none ${
                              Math.round(rate) >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-600'
                            }`}>
                              {Math.round(rate)}%
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              !isHidden
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {!isHidden ? 'Hiện' : 'Ẩn'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    showAllCategoriesSL();
                    showAllCategoriesDT();
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Đặt lại hiển thị tất cả ngành hàng cho cả 2 bảng SL và DT"
                >
                  <RotateCcw size={12} />
                  <span>Đặt lại mặc định (Hiện tất cả SL & DT)</span>
                </button>
              </div>

              <button
                onClick={() => setIsCategoryFilterModalOpen(false)}
                className="px-6 py-2 bg-gradient-to-r from-[#047857] to-[#10B981] hover:from-[#036348] hover:to-[#059669] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                Xác nhận & Hoàn tất
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <CaptureLoadingOverlay isLoading={isCapturing} />

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default React.memo(LuyKe);