import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Banknote, 
  Copy, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Save,
  History,
  Trash2,
  X,
  ArrowDownCircle,
  Calendar,
  Clock,
  ArrowLeft,
  Scale,
  CreditCard,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Coins,
  Database
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useNotification } from '../contexts/NotificationContext';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { ImagePreviewModal } from './ImagePreviewModal';

// Denominations list (VND) with vibrant badge colors for both Desktop and Mobile reference UI
export const DENOMINATIONS = [
  {
    value: 500000,
    label: '500.000 đ',
    badgeBg: 'bg-teal-600 text-white',
    textCol: 'text-teal-700',
    mobileBadgeHex: '#0F8A65',
    mobileTextHex: '#0F8A65',
    mobilePlusBg: '#E3F7F0',
    mobilePlusBorder: '#B5E8D6',
    mobilePlusText: '#0F8A65',
  },
  {
    value: 200000,
    label: '200.000 đ',
    badgeBg: 'bg-rose-600 text-white',
    textCol: 'text-rose-700',
    mobileBadgeHex: '#DF1B41',
    mobileTextHex: '#DF1B41',
    mobilePlusBg: '#FFE6EB',
    mobilePlusBorder: '#FBCFE8',
    mobilePlusText: '#DF1B41',
  },
  {
    value: 100000,
    label: '100.000 đ',
    badgeBg: 'bg-emerald-600 text-white',
    textCol: 'text-emerald-700',
    mobileBadgeHex: '#128A36',
    mobileTextHex: '#128A36',
    mobilePlusBg: '#E6F7EC',
    mobilePlusBorder: '#BBF7D0',
    mobilePlusText: '#128A36',
  },
  {
    value: 50000,
    label: '50.000 đ',
    badgeBg: 'bg-orange-500 text-white',
    textCol: 'text-orange-700',
    mobileBadgeHex: '#F27405',
    mobileTextHex: '#E06500',
    mobilePlusBg: '#FFE8E5',
    mobilePlusBorder: '#FECDD3',
    mobilePlusText: '#E11D48',
  },
  {
    value: 20000,
    label: '20.000 đ',
    badgeBg: 'bg-blue-600 text-white',
    textCol: 'text-blue-700',
    mobileBadgeHex: '#0B57D0',
    mobileTextHex: '#0B57D0',
    mobilePlusBg: '#E6F0FE',
    mobilePlusBorder: '#BFDBFE',
    mobilePlusText: '#0B57D0',
  },
  {
    value: 10000,
    label: '10.000 đ',
    badgeBg: 'bg-amber-600 text-white',
    textCol: 'text-amber-700',
    mobileBadgeHex: '#E86C00',
    mobileTextHex: '#D96B00',
    mobilePlusBg: '#FFF1DF',
    mobilePlusBorder: '#FDE68A',
    mobilePlusText: '#D96B00',
  },
  {
    value: 5000,
    label: '5.000 đ',
    badgeBg: 'bg-slate-700 text-white',
    textCol: 'text-slate-800',
    mobileBadgeHex: '#22344A',
    mobileTextHex: '#22344A',
    mobilePlusBg: '#E9EEF5',
    mobilePlusBorder: '#CBD5E1',
    mobilePlusText: '#22344A',
  },
  {
    value: 2000,
    label: '2.000 đ',
    badgeBg: 'bg-stone-600 text-white',
    textCol: 'text-stone-800',
    mobileBadgeHex: '#6D4C2F',
    mobileTextHex: '#6D4C2F',
    mobilePlusBg: '#F4EAE0',
    mobilePlusBorder: '#E5D3C0',
    mobilePlusText: '#6D4C2F',
  },
  {
    value: 1000,
    label: '1.000 đ',
    badgeBg: 'bg-zinc-600 text-white',
    textCol: 'text-zinc-800',
    mobileBadgeHex: '#636073',
    mobileTextHex: '#636073',
    mobilePlusBg: '#ECEBF0',
    mobilePlusBorder: '#D5D3DF',
    mobilePlusText: '#636073',
  },
  {
    value: 500,
    label: '500 đ',
    badgeBg: 'bg-red-500 text-white',
    textCol: 'text-red-700',
    mobileBadgeHex: '#E5322E',
    mobileTextHex: '#E5322E',
    mobilePlusBg: '#FFE8E8',
    mobilePlusBorder: '#FECDD3',
    mobilePlusText: '#E5322E',
  },
];

export const formatMoney = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
};

export const parseMoneyInput = (str: string): number => {
  const clean = str.replace(/[^\d]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

const STORAGE_KEY_BBKQ_DRAFT = 'crm_bbkq_cash_draft_v2';
const STORAGE_KEY_BBKQ_HISTORY = 'crm_bbkq_history_v2';

export interface BbkqHistoryItem {
  id: string;
  createdAt: string; // ISO string
  timeStr: string; // "20:08"
  dateStr: string; // "23/08/2026"
  storeName: string;
  storeCode: string;
  counts: Record<number, number>;
  totalActual: number;
  totalBills: number;
  erpTotal: number;
  discrepancy: number;
}

export default function BbkqTab() {
  const { userProfile } = useAuth();
  const { currentStoreId } = useStore();
  const { showNotification } = useNotification();

  // Store information
  const storeName = currentStoreId !== 'ALL' && currentStoreId ? currentStoreId : (userProfile?.ten_sieu_thi || userProfile?.ma_kho || '');
  const storeCode = userProfile?.ma_kho || '';

  // Current date string (DD/MM/YYYY) constructed safely
  const todayDateStr = React.useMemo(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }, []);

  // Denominations counts
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BBKQ_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.counts) return parsed.counts;
      }
    } catch (e) {
      // ignore
    }
    return {
      500000: 0,
      200000: 0,
      100000: 0,
      50000: 0,
      20000: 0,
      10000: 0,
      5000: 0,
      2000: 0,
      1000: 0,
      500: 0,
    };
  });

  // Mobile input editing state so clearing an input does not force '0' back while typing
  const [focusedDenom, setFocusedDenom] = useState<number | null>(null);
  const [editingCountStr, setEditingCountStr] = useState<string>('');
  const [isErpFocused, setIsErpFocused] = useState(false);
  const [editingErpStr, setEditingErpStr] = useState<string>('');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [justSavedFeedback, setJustSavedFeedback] = useState(false);

  // ERP System Total Input
  const [erpTotal, setErpTotal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BBKQ_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.erpTotal === 'number') return parsed.erpTotal;
      }
    } catch (e) {
      // ignore
    }
    return 0;
  });

  // History state
  const [historyList, setHistoryList] = useState<BbkqHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BBKQ_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Preview & Export
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Auto save draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BBKQ_DRAFT, JSON.stringify({ counts, erpTotal }));
    } catch (e) {
      // ignore
    }
  }, [counts, erpTotal]);

  // Calculations
  const totalActual = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);
  const totalBills = Object.values(counts).reduce((sum, c) => sum + (c || 0), 0);

  const discrepancy = totalActual - erpTotal;
  const isBalanced = erpTotal > 0 && Math.abs(discrepancy) === 0;
  const isSurplus = erpTotal > 0 && discrepancy > 0;
  const isDeficit = erpTotal > 0 && discrepancy < 0;

  // Handlers for Count Changes
  const handleCountChange = (val: number, delta: number) => {
    setCounts(prev => {
      const nextVal = Math.max(0, (prev[val] || 0) + delta);
      if (focusedDenom === val) {
        setEditingCountStr(String(nextVal));
      }
      return {
        ...prev,
        [val]: nextVal
      };
    });
  };

  const handleSetCount = (val: number, directCount: number) => {
    setCounts(prev => ({
      ...prev,
      [val]: Math.max(0, isNaN(directCount) ? 0 : directCount)
    }));
  };

  // 1. Chức năng XÓA SỐ TỜ ALL
  const handleClearAllCounts = () => {
    const resetCounts: Record<number, number> = {};
    DENOMINATIONS.forEach(d => { resetCounts[d.value] = 0; });
    setCounts(resetCounts);
    setFocusedDenom(null);
    setEditingCountStr('');
    showNotification('Đã xóa tất cả số tờ về 0!', 'success');
  };

  // 2. Chức năng LƯU LỊCH SỬ KIỂM TRONG NGÀY
  const handleSaveHistory = () => {
    if (totalActual === 0 && erpTotal === 0) {
      showNotification('Vui lòng nhập số tờ hoặc tiền ERP trước khi lưu lịch sử!', 'warning');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const newRecord: BbkqHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now.toISOString(),
      timeStr,
      dateStr,
      storeName,
      storeCode,
      counts: { ...counts },
      totalActual,
      totalBills,
      erpTotal,
      discrepancy,
    };

    const updated = [newRecord, ...historyList].slice(0, 50); // Keep max 50 recent records
    setHistoryList(updated);
    try {
      localStorage.setItem(STORAGE_KEY_BBKQ_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setJustSavedFeedback(true);
    setTimeout(() => setJustSavedFeedback(false), 1800);
    showNotification(`Đã lưu lịch sử kiểm tiền lúc ${timeStr}! (${formatMoney(totalActual)})`, 'success');
  };

  // 3. Tải lại bản ghi từ lịch sử vào bảng
  const handleLoadHistoryRecord = (item: BbkqHistoryItem) => {
    setCounts(item.counts || {});
    setErpTotal(item.erpTotal || 0);
    setIsHistoryModalOpen(false);
    showNotification(`Đã nạp lại bản ghi kiểm tiền lúc ${item.timeStr} (${item.dateStr})!`, 'success');
  };

  // Xóa 1 bản ghi lịch sử
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    try {
      localStorage.setItem(STORAGE_KEY_BBKQ_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showNotification('Đã xóa bản ghi khỏi lịch sử!', 'success');
  };

  // Xóa tất cả lịch sử
  const handleClearAllHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử kiểm tiền đã lưu?')) {
      setHistoryList([]);
      try {
        localStorage.removeItem(STORAGE_KEY_BBKQ_HISTORY);
      } catch (e) {
        console.error(e);
      }
      showNotification('Đã xóa toàn bộ lịch sử kiểm tiền!', 'success');
    }
  };

  // Copy Zalo Text
  const handleCopyZalo = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let text = `💵 BẢNG KIỂM KÊ TIỀN MẶT THU NGÂN\n`;
    text += `🏢 Siêu thị: ${storeName} (Kho ${storeCode})\n`;
    text += `⏰ Thời gian: ${timeStr}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 CHI TIẾT MỆNH GIÁ:\n`;
    
    DENOMINATIONS.forEach(d => {
      const count = counts[d.value] || 0;
      if (count > 0) {
        text += `  • ${d.label}: ${count} tờ = ${formatMoney(count * d.value)}\n`;
      }
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 TỔNG TIỀN MẶT THỰC ĐẾM: ${formatMoney(totalActual)} (${totalBills} tờ)\n`;
    text += `📑 TỔNG TIỀN THEO ERP: ${formatMoney(erpTotal)}\n`;
    
    if (erpTotal === 0) {
      text += `🎯 KẾT QUẢ: Chưa nhập tiền ERP\n`;
    } else if (isBalanced) {
      text += `🎯 KẾT QUẢ: 0 đ (KHỚP QUỸ 100% ✅)\n`;
    } else if (isSurplus) {
      text += `🎯 KẾT QUẢ: DƯ +${formatMoney(discrepancy)} ⚠️\n`;
    } else {
      text += `🎯 KẾT QUẢ: THIẾU ${formatMoney(discrepancy)} 🚨\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `(Xuất tự động từ CRM Siêu Thị)`;

    navigator.clipboard.writeText(text).then(() => {
      showNotification('Đã copy báo cáo kiểm tiền Zalo!', 'success');
    }).catch(() => {
      showNotification('Không thể copy, vui lòng thử lại!', 'error');
    });
  };

  // Export Image HD
  const handleExportImage = async () => {
    if (!tableRef.current) return;
    try {
      setIsExporting(true);
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 150));

      const node = tableRef.current;
      const clone = node.cloneNode(true) as HTMLElement;

      // Ensure clone is visible even when triggered from mobile view
      clone.classList.remove('hidden', 'md:block');
      clone.style.display = 'block';

      // 1. Remove all scrollable behaviors and set clear fixed dimensions
      clone.style.boxShadow = 'none';
      clone.style.filter = 'none';
      clone.style.width = '840px';
      clone.style.minWidth = '840px';
      clone.style.maxWidth = '840px';
      clone.style.height = 'auto';
      clone.style.minHeight = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.margin = '0 auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.overflow = 'visible';

      // 2. Remove overflow classes and scrollbars from all child elements
      clone.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.maxHeight = 'none';
        htmlEl.style.scrollbarWidth = 'none';
        (htmlEl.style as any).msOverflowStyle = 'none';
      });

      // 3. In the clone, replace interactive count buttons with a crisp, centered badge
      const inputHolders = clone.querySelectorAll('td:nth-child(2)');
      inputHolders.forEach(td => {
        const input = td.querySelector('input');
        const countVal = input ? (input.value || '0') : '0';
        const num = parseInt(countVal, 10) || 0;
        
        td.innerHTML = `
          <div style="display: inline-flex; align-items: center; justify-content: center; min-width: 90px; padding: 6px 16px; background-color: ${num > 0 ? '#ecfdf5' : '#f8fafc'}; border: 1.5px solid ${num > 0 ? '#10b981' : '#e2e8f0'}; border-radius: 12px;">
            <span style="font-size: 17px; font-weight: 900; color: ${num > 0 ? '#047857' : '#94a3b8'};">
              ${num} tờ
            </span>
          </div>
        `;
      });

      // 4. Inject global scrollbar-killing stylesheet into frameWrapper
      const styleTag = document.createElement('style');
      styleTag.innerHTML = `
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0px !important;
          height: 0px !important;
        }
      `;

      const frameWrapper = document.createElement('div');
      frameWrapper.style.padding = '28px';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.style.display = 'inline-block';
      frameWrapper.style.width = '896px';
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.appendChild(styleTag);
      frameWrapper.appendChild(clone);

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-99999px';
      tempContainer.style.top = '0';
      tempContainer.style.zIndex = '-1000';
      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      await new Promise(r => setTimeout(r, 200));

      const dataUrl = await htmlToImage.toPng(frameWrapper, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: EXPORT_FONT_STYLE
      });

      document.body.removeChild(tempContainer);
      setPreviewImageUrl(dataUrl);
    } catch (err) {
      console.error('Export error:', err);
      showNotification('Không thể xuất ảnh bảng kê, vui lòng thử lại!', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMobileBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'realtime' }));
    }
  };

  return (
    <div className="w-full font-sans">
      {/* =====================================================================
          1. MOBILE INTERFACE (< 768px) - 100% MATCH TO REFERENCE DESIGN
         ===================================================================== */}
      <div
        className="md:hidden w-full min-h-screen bg-gradient-to-b from-[#E9F2FF] via-[#F2F7FD] to-[#F7FAFC] pb-8 overflow-x-hidden"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* ── MOBILE HERO HEADER ── */}
        <div
          className="relative overflow-hidden px-3.5 pt-3.5 pb-7 text-white"
          style={{
            background: 'linear-gradient(135deg, #0948C8 0%, #1463F3 52%, #3B86FF 100%)',
          }}
        >
          {/* Subtle geometric background shapes */}
          <div
            className="pointer-events-none absolute -top-12 -right-10 w-44 h-44 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 opacity-25"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, #E9F2FF 100%)',
            }}
          />

          <div className="relative z-10 flex items-start justify-between gap-2">
            {/* Left group: Back button + BBKQ Title & Store Details */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleMobileBack}
                aria-label="Quay lại"
                className="w-9 h-9 rounded-full bg-white/90 text-[#1459E6] flex items-center justify-center shadow-sm shrink-0 active:scale-95 transition-transform mt-0.5 cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.6} />
              </button>

              <div className="min-w-0 flex-1">
                {/* BBKQ Aqua Badge */}
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider text-white shadow-2xs"
                  style={{ background: 'linear-gradient(90deg, #1AD1B5 0%, #2EE2C5 100%)' }}
                >
                  BBKQ
                </span>

                {/* Main Title */}
                <h1 className="text-[17px] min-[375px]:text-[18.5px] min-[410px]:text-[20px] font-black text-white uppercase tracking-tight leading-[1.2] mt-1">
                  KIỂM KÊ TIỀN MẶT THU NGÂN
                </h1>

                {/* Store Name */}
                <p className="text-[12px] min-[375px]:text-[12.5px] font-bold text-white/95 truncate mt-1">
                  {storeName || 'Chưa cấu hình siêu thị'}
                </p>

                {/* Warehouse & Date */}
                <p className="text-[11.5px] min-[375px]:text-[12px] font-semibold text-blue-100/95 truncate mt-0.5">
                  Kho: <span className="font-bold text-white">{storeCode || '---'}</span>
                  <span className="mx-1.5 opacity-75">|</span>
                  Ngày kiểm kê: <span className="font-bold text-white">{todayDateStr}</span>
                </p>
              </div>
            </div>

            {/* Right: 3D-style Cash Stack & Gold Coins Illustration */}
            <div className="shrink-0 flex flex-col items-end justify-between self-stretch pointer-events-none select-none">
              <svg
                width="68"
                height="62"
                viewBox="0 0 88 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-md mt-2"
              >
                {/* Stacked Green Banknotes */}
                <rect x="20" y="24" width="60" height="36" rx="6" transform="rotate(-8 20 24)" fill="#059669" />
                <rect x="20" y="19" width="60" height="36" rx="6" transform="rotate(-8 20 19)" fill="#10B981" />
                <rect x="20" y="14" width="60" height="36" rx="6" transform="rotate(-8 20 14)" fill="#34D399" stroke="#A7F3D0" strokeWidth="1.5" />
                <circle cx="51" cy="28" r="9" fill="#059669" fillOpacity="0.45" />
                {/* Gold Coins Stack Left */}
                <ellipse cx="26" cy="64" rx="13" ry="4.5" fill="#D97706" />
                <rect x="13" y="56" width="26" height="8" fill="#F59E0B" />
                <ellipse cx="26" cy="56" rx="13" ry="4.5" fill="#FBBF24" />
                <rect x="13" y="48" width="26" height="8" fill="#F59E0B" />
                <ellipse cx="26" cy="48" rx="13" ry="4.5" fill="#FDE047" />
                {/* Gold Coin Front Right */}
                <circle cx="50" cy="56" r="14" fill="#F59E0B" stroke="#FDE047" strokeWidth="2" />
                <circle cx="50" cy="56" r="9.5" fill="#FBBF24" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── MOBILE BODY CONTENT CONTAINER ── */}
        <div className="px-3 -mt-3.5 relative z-20 space-y-3">
          {/* 1. NHÓM 4 NÚT CHỨC NĂNG TRÊN CÙNG MỘT HÀNG */}
          <div className="grid grid-cols-4 gap-1.5 min-[375px]:gap-2">
            {/* COPY ZALO */}
            <button
              type="button"
              onClick={handleCopyZalo}
              className="min-w-0 min-h-[56px] py-2 px-1 rounded-[16px] bg-gradient-to-b from-[#F4F9FF] to-[#E6F0FF] border border-[#C9DFFF] shadow-[0_3px_10px_rgba(29,78,216,0.08)] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center">
                <Copy size={14} strokeWidth={2.4} />
              </div>
              <span className="text-[9.5px] min-[375px]:text-[10.5px] font-black text-[#1E40AF] uppercase tracking-tight whitespace-nowrap truncate max-w-full">
                COPY ZALO
              </span>
            </button>

            {/* LƯU LỊCH SỬ */}
            <button
              type="button"
              onClick={handleSaveHistory}
              className="min-w-0 min-h-[56px] py-2 px-1 rounded-[16px] bg-gradient-to-b from-[#F7F3FF] to-[#EDE4FF] border border-[#D8C7FF] shadow-[0_3px_10px_rgba(109,40,217,0.08)] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center">
                <Save size={14} strokeWidth={2.4} />
              </div>
              <span className="text-[9.5px] min-[375px]:text-[10.5px] font-black text-[#5B21B6] uppercase tracking-tight whitespace-nowrap truncate max-w-full">
                LƯU LỊCH SỬ
              </span>
            </button>

            {/* LỊCH SỬ (N) */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="min-w-0 min-h-[56px] py-2 px-1 rounded-[16px] bg-gradient-to-b from-[#FAF3FC] to-[#F2E4FA] border border-[#E4C7F5] shadow-[0_3px_10px_rgba(126,34,206,0.08)] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center">
                <History size={14} strokeWidth={2.4} />
              </div>
              <span className="text-[9.5px] min-[375px]:text-[10.5px] font-black text-[#6B21A8] uppercase tracking-tight whitespace-nowrap truncate max-w-full">
                LỊCH SỬ ({historyList.length})
              </span>
            </button>

            {/* XUẤT ẢNH */}
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              className="min-w-0 min-h-[56px] py-2 px-1 rounded-[16px] bg-gradient-to-b from-[#F0FDF7] to-[#DCFCEB] border border-[#B6F0D2] shadow-[0_3px_10px_rgba(4,120,87,0.08)] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 h-6 rounded-lg bg-[#D1FAE5] text-[#047857] flex items-center justify-center">
                <ImageIcon size={14} strokeWidth={2.4} />
              </div>
              <span className="text-[9.5px] min-[375px]:text-[10.5px] font-black text-[#047857] uppercase tracking-tight whitespace-nowrap truncate max-w-full">
                {isExporting ? 'ĐANG XUẤT' : 'XUẤT ẢNH'}
              </span>
            </button>
          </div>

          {/* 2. BA THẺ TỔNG QUAN (3 OVERVIEW CARDS) */}
          <div className="grid grid-cols-1 min-[350px]:grid-cols-3 gap-2">
            {/* Card 1: TỔNG THỰC ĐẾM (TIỀN MẶT) */}
            <div className="min-w-0 rounded-[18px] p-2.5 bg-gradient-to-br from-[#F3FDF8] via-[#E9FBF1] to-[#DCFCE7] border border-[#BBF7D0] shadow-[0_3px_12px_rgba(22,163,74,0.06)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Coins size={15} strokeWidth={2.4} />
                </div>
                <div className="text-[9px] min-[390px]:text-[9.5px] font-black text-slate-800 uppercase leading-[1.15] min-w-0">
                  <div>TỔNG THỰC ĐẾM</div>
                  <div className="text-slate-600">(TIỀN MẶT)</div>
                </div>
              </div>

              <div className="text-[16px] min-[390px]:text-[18px] font-black text-[#15803D] leading-tight mt-2 truncate">
                {formatMoney(totalActual)}
              </div>

              <div className="text-[10px] text-slate-600 font-medium mt-1 truncate">
                Tổng cộng: <span className="font-black text-slate-900">{totalBills}</span> tờ tiền
              </div>
            </div>

            {/* Card 2: TỔNG TIỀN THEO ERP */}
            <div className="min-w-0 rounded-[18px] p-2.5 bg-gradient-to-br from-[#F2F8FF] via-[#E8F2FF] to-[#DBEAFE] border border-[#BFDBFE] shadow-[0_3px_12px_rgba(29,78,216,0.06)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 rounded-[10px] bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard size={15} strokeWidth={2.4} />
                </div>
                <div className="text-[9px] min-[390px]:text-[9.5px] font-black text-slate-800 uppercase leading-[1.15] min-w-0">
                  <div>TỔNG TIỀN</div>
                  <div>THEO ERP</div>
                </div>
              </div>

              <div className="mt-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Tổng tiền theo ERP"
                  value={
                    isErpFocused
                      ? editingErpStr
                      : erpTotal === 0
                        ? '0 đ'
                        : formatMoney(erpTotal)
                  }
                  placeholder="0 đ"
                  onFocus={() => {
                    setIsErpFocused(true);
                    setEditingErpStr(erpTotal === 0 ? '' : new Intl.NumberFormat('vi-VN').format(erpTotal));
                  }}
                  onBlur={() => {
                    setIsErpFocused(false);
                  }}
                  onChange={e => {
                    const parsed = parseMoneyInput(e.target.value);
                    setErpTotal(parsed);
                    setEditingErpStr(parsed === 0 && e.target.value === '' ? '' : new Intl.NumberFormat('vi-VN').format(parsed));
                  }}
                  className="w-full bg-white/75 focus:bg-white border border-blue-200/90 focus:border-blue-600 rounded-lg px-1.5 py-0.5 text-[16px] min-[390px]:text-[18px] font-black text-[#1D4ED8] leading-tight outline-none transition-all"
                />
              </div>

              <div className="text-[9.5px] leading-[1.2] text-slate-500 font-medium mt-1">
                Nhập số liệu từ phần mềm POS
              </div>
            </div>

            {/* Card 3: CHÊNH LỆCH TIỀN */}
            <div className="min-w-0 rounded-[18px] p-2.5 bg-gradient-to-br from-[#FFFDF5] via-[#FFF6E5] to-[#FFEDD5] border border-[#FED7AA] shadow-[0_3px_12px_rgba(234,88,12,0.06)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 rounded-[10px] bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Scale size={15} strokeWidth={2.4} />
                </div>
                <div className="text-[9px] min-[390px]:text-[9.5px] font-black text-[#9A3412] uppercase leading-[1.15] min-w-0">
                  <div>CHÊNH LỆCH</div>
                  <div>TIỀN</div>
                </div>
              </div>

              <div className="text-[16px] min-[390px]:text-[18px] font-black text-[#C2410C] leading-tight mt-2 truncate">
                {erpTotal === 0
                  ? '0 đ'
                  : discrepancy > 0
                    ? `+${formatMoney(discrepancy)}`
                    : formatMoney(discrepancy)}
              </div>

              <div className="text-[9.5px] font-bold text-slate-600 uppercase tracking-tight mt-1 truncate">
                THỰC ĐẾM - ERP
              </div>
            </div>
          </div>

          {/* 3. BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ CARD */}
          <div className="bg-white rounded-[20px] p-2.5 min-[375px]:p-3 border border-slate-200/90 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            {/* Card Header + XÓA SỐ TỜ ALL Button */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center shrink-0">
                  <Banknote size={17} strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[12px] min-[375px]:text-[13.5px] font-black text-slate-900 uppercase tracking-tight truncate">
                    BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ
                  </h2>
                  <p className="text-[10.5px] font-medium text-slate-500 truncate">
                    {storeName} · Mã Kho: {storeCode}
                  </p>
                </div>
              </div>

              {/* Nút XÓA SỐ TỜ ALL */}
              <button
                type="button"
                onClick={handleClearAllCounts}
                className="shrink-0 min-h-[34px] px-2 min-[375px]:px-2.5 py-1.5 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] active:scale-95 border border-[#FECDD3] text-[#E11D48] text-[9.5px] min-[375px]:text-[10px] font-black uppercase tracking-tight flex items-center gap-1 cursor-pointer transition-all"
              >
                <Trash2 size={12} strokeWidth={2.5} />
                <span>XÓA SỐ TỜ ALL</span>
              </button>
            </div>

            {/* Table Column Header Row */}
            <div className="grid grid-cols-[96px_1fr_68px] min-[375px]:grid-cols-[114px_1fr_86px] min-[410px]:grid-cols-[122px_1fr_96px] items-center py-2 px-1 bg-[#F8FAFC] rounded-lg mt-2 text-[9.5px] min-[375px]:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <div className="pl-1">MỆNH GIÁ</div>
              <div className="text-center">SỐ LƯỢNG (TỜ)</div>
              <div className="text-right pr-1">THÀNH TIỀN</div>
            </div>

            {/* 10 Denomination Rows */}
            <div className="divide-y divide-slate-100">
              {DENOMINATIONS.map((denom, idx) => {
                const count = counts[denom.value] || 0;
                const lineTotal = count * denom.value;
                const isFocused = focusedDenom === denom.value;
                const displayCount = isFocused ? editingCountStr : String(count);

                return (
                  <div
                    key={denom.value}
                    className={`grid grid-cols-[96px_1fr_68px] min-[375px]:grid-cols-[114px_1fr_86px] min-[410px]:grid-cols-[122px_1fr_96px] items-center py-2 px-0.5 min-w-0 ${
                      idx % 2 === 1 ? 'bg-[#F8FAFC]/60' : 'bg-white'
                    }`}
                  >
                    {/* Col 1: Denomination Badge */}
                    <div className="pr-1 min-w-0">
                      <div
                        className="w-full h-[30px] min-[375px]:h-[34px] px-1.5 min-[375px]:px-2 rounded-[9px] text-white font-extrabold text-[11px] min-[375px]:text-[12.5px] flex items-center gap-1 min-[375px]:gap-1.5 shadow-2xs whitespace-nowrap"
                        style={{ backgroundColor: denom.mobileBadgeHex }}
                      >
                        <span className="inline-flex items-center justify-center w-3.5 h-3 min-[375px]:w-4 min-[375px]:h-3 rounded-[3px] border border-white/60 text-[7.5px] min-[375px]:text-[8px] font-black leading-none shrink-0">
                          đ
                        </span>
                        <span className="truncate">{denom.label}</span>
                      </div>
                    </div>

                    {/* Col 2: Quantity Stepper (- [input] +) */}
                    <div className="flex items-center justify-center gap-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleCountChange(denom.value, -1)}
                        aria-label={`Giảm số tờ ${denom.label}`}
                        className="w-[28px] h-[30px] min-[375px]:w-[32px] min-[375px]:h-[34px] rounded-[9px] bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 border border-slate-200/90 text-slate-600 font-bold text-base flex items-center justify-center shrink-0 cursor-pointer select-none"
                      >
                        −
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`Số lượng tờ ${denom.label}`}
                        value={displayCount}
                        placeholder="0"
                        onFocus={e => {
                          setFocusedDenom(denom.value);
                          setEditingCountStr(count === 0 ? '' : String(count));
                          setTimeout(() => e.target.select(), 0);
                        }}
                        onBlur={() => {
                          setFocusedDenom(null);
                        }}
                        onChange={e => {
                          const cleanDigits = e.target.value.replace(/[^\d]/g, '');
                          setEditingCountStr(cleanDigits);
                          const numericVal = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);
                          handleSetCount(denom.value, numericVal);
                        }}
                        className="w-[42px] min-[375px]:w-[50px] min-[410px]:w-[58px] h-[30px] min-[375px]:h-[34px] rounded-[9px] bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-center font-extrabold text-[13px] min-[375px]:text-[13.5px] text-slate-900 outline-none transition-all shrink-0"
                      />

                      <button
                        type="button"
                        onClick={() => handleCountChange(denom.value, 1)}
                        aria-label={`Tăng số tờ ${denom.label}`}
                        style={{
                          backgroundColor: denom.mobilePlusBg,
                          borderColor: denom.mobilePlusBorder,
                          color: denom.mobilePlusText,
                        }}
                        className="w-[28px] h-[30px] min-[375px]:w-[32px] min-[375px]:h-[34px] rounded-[9px] active:scale-95 border font-bold text-base flex items-center justify-center shrink-0 cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>

                    {/* Col 3: Line Total */}
                    <div
                      className="text-right pr-1 font-extrabold text-[11.5px] min-[375px]:text-[13px] min-[410px]:text-[13.5px] whitespace-nowrap truncate"
                      style={{ color: denom.mobileTextHex }}
                    >
                      {formatMoney(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. KHỐI TỔNG HỢP KẾT QUẢ */}
          <div className="bg-white rounded-[20px] p-3 border border-slate-200/90 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={() => setIsSummaryExpanded(prev => !prev)}
              className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[9px] bg-[#1D4ED8] text-white font-black text-sm flex items-center justify-center shadow-2xs">
                  Σ
                </div>
                <span className="text-[13px] min-[375px]:text-[13.5px] font-black text-slate-900 uppercase tracking-tight">
                  TỔNG HỢP KẾT QUẢ
                </span>
              </div>
              <div className="text-[#1D4ED8] p-1">
                {isSummaryExpanded ? <ChevronUp size={18} strokeWidth={2.6} /> : <ChevronDown size={18} strokeWidth={2.6} />}
              </div>
            </button>

            {isSummaryExpanded && (
              <div className="grid grid-cols-1 min-[350px]:grid-cols-3 gap-2 mt-3">
                {/* 1. TỔNG THỰC ĐẾM */}
                <div className="min-w-0 rounded-[16px] p-2.5 bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/85 border border-[#BBF7D0]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                      <Coins size={13} strokeWidth={2.4} />
                    </div>
                    <span className="text-[9.5px] font-black text-slate-800 uppercase leading-tight">
                      TỔNG THỰC ĐẾM
                    </span>
                  </div>
                  <div className="text-[16px] min-[390px]:text-[17px] font-black text-[#15803D] mt-1.5 truncate">
                    {formatMoney(totalActual)}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-[#166534]">
                      {totalBills} tờ
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-emerald-200/70 overflow-hidden">
                      <div
                        className="h-full bg-[#16A34A] rounded-full transition-all"
                        style={{ width: totalBills > 0 ? '100%' : '20%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. TIỀN THEO ERP */}
                <div className="min-w-0 rounded-[16px] p-2.5 bg-gradient-to-br from-[#F0F7FF] to-[#DBEAFE]/85 border border-[#BFDBFE]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                      <Database size={13} strokeWidth={2.4} />
                    </div>
                    <span className="text-[9.5px] font-black text-slate-800 uppercase leading-tight">
                      TIỀN THEO ERP
                    </span>
                  </div>
                  <div className="text-[16px] min-[390px]:text-[17px] font-black text-[#1D4ED8] mt-1.5 truncate">
                    {formatMoney(erpTotal)}
                  </div>
                </div>

                {/* 3. CHÊNH LỆCH QUỸ */}
                <div className="min-w-0 rounded-[16px] p-2.5 bg-gradient-to-br from-[#FFFBEB] to-[#FFEDD5]/85 border border-[#FED7AA]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                      <Scale size={13} strokeWidth={2.4} />
                    </div>
                    <span className="text-[9.5px] font-black text-[#9A3412] uppercase leading-tight">
                      CHÊNH LỆCH QUỸ
                    </span>
                  </div>
                  <div className="text-[16px] min-[390px]:text-[17px] font-black text-[#C2410C] mt-1.5 truncate">
                    {erpTotal === 0
                      ? '0 đ'
                      : discrepancy > 0
                        ? `+${formatMoney(discrepancy)}`
                        : formatMoney(discrepancy)}
                  </div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase mt-1 truncate">
                    {erpTotal === 0
                      ? '(CHƯA NHẬP ERP)'
                      : isBalanced
                        ? '(KHỚP QUỸ 100%)'
                        : isSurplus
                          ? '(DƯ TIỀN)'
                          : '(THIẾU TIỀN)'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. NÚT LƯU KẾT QUẢ KIỂM KÊ (BOTTOM CTA) */}
          <button
            type="button"
            onClick={handleSaveHistory}
            className="w-full h-[56px] rounded-[18px] text-white font-black text-[14px] min-[375px]:text-[15px] uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_8px_22px_rgba(59,75,248,0.34)] active:scale-[0.99] transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(90deg, #0A64F5 0%, #3F4DF8 52%, #6E27E5 100%)',
            }}
          >
            <span className="w-6 h-6 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 size={16} strokeWidth={3} />
            </span>
            <span>{justSavedFeedback ? 'ĐÃ LƯU KẾT QUẢ KIỂM KÊ!' : 'LƯU KẾT QUẢ KIỂM KÊ'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. DESKTOP INTERFACE (>= 768px) - PRESERVED 100% INTACT
         ===================================================================== */}
      <div className="hidden md:block w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        {/* ── Top Header Toolbar ── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
              <Banknote size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  KIỂM KÊ TIỀN MẶT THU NGÂN
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  BBKQ
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {storeName} · Kho: {storeCode}
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Nút Copy Zalo */}
            <button
              onClick={handleCopyZalo}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Copy báo cáo chi tiết gửi Zalo"
            >
              <Copy size={15} /> COPY ZALO
            </button>

            {/* Nút Lưu Lịch Sử */}
            <button
              onClick={handleSaveHistory}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Lưu bản ghi kiểm tiền này vào lịch sử trong ngày"
            >
              <Save size={15} /> LƯU LỊCH SỬ
            </button>

            {/* Nút Xem Lại Lịch Sử */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Xem lại lịch sử các lần kiểm tiền đã lưu"
            >
              <History size={15} /> LỊCH SỬ ({historyList.length})
            </button>

            {/* Nút Xuất Ảnh */}
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Xuất ảnh bảng kê tiền mặt HD"
            >
              <Download size={15} /> {isExporting ? 'ĐANG XUẤT...' : 'XUẤT ẢNH'}
            </button>

            {/* Nút Xóa Số Tờ ALL */}
            <button
              onClick={handleClearAllCounts}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Xóa toàn bộ số lượng tờ về 0"
            >
              <Trash2 size={15} /> XÓA SỐ TỜ ALL
            </button>
          </div>
        </div>

        {/* ── 3 Big KPI Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Tổng tiền mặt thực đếm */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-200 shadow-sm relative overflow-hidden">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              1. TỔNG THỰC ĐẾM (TIỀN MẶT)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">
              {formatMoney(totalActual)}
            </div>
            <div className="text-xs font-bold text-slate-400 mt-1">
              Tổng cộng: <span className="text-slate-800 font-black">{totalBills}</span> tờ tiền
            </div>
          </div>

          {/* 2. Ô nhập tổng tiền ERP */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-blue-200 shadow-sm relative space-y-2">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              2. TỔNG TIỀN THEO ERP
            </div>
            <input
              type="text"
              value={erpTotal === 0 ? '' : new Intl.NumberFormat('vi-VN').format(erpTotal)}
              placeholder="Nhập tổng tiền ERP (VNĐ)..."
              onChange={e => setErpTotal(parseMoneyInput(e.target.value))}
              className="w-full px-3.5 py-2 bg-blue-50/50 border-2 border-blue-300 rounded-xl text-xl sm:text-2xl font-black text-blue-800 focus:bg-white focus:border-blue-600 outline-none transition-all"
            />
            <div className="text-[11px] font-medium text-slate-400">
              Nhập số liệu tiền hàng từ phần mềm bán hàng POS
            </div>
          </div>

          {/* 3. Ô thể hiện chênh lệch tiền */}
          <div className={`rounded-3xl p-5 sm:p-6 border-2 shadow-sm flex flex-col justify-between transition-all ${
            erpTotal === 0
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : isBalanced
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : isSurplus
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider">
                  3. CHÊNH LỆCH TIỀN
                </span>
                {erpTotal > 0 && (
                  isBalanced 
                    ? <CheckCircle2 size={20} className="text-emerald-600" />
                    : isSurplus 
                      ? <AlertTriangle size={20} className="text-amber-600" />
                      : <AlertCircle size={20} className="text-rose-600" />
                )}
              </div>
              <div className={`text-2xl sm:text-3xl font-black ${
                erpTotal === 0 
                  ? 'text-slate-400' 
                  : isBalanced 
                    ? 'text-emerald-700' 
                    : isSurplus 
                      ? 'text-amber-700' 
                      : 'text-rose-600'
              }`}>
                {erpTotal === 0 ? '0 đ' : (discrepancy > 0 ? `+${formatMoney(discrepancy)}` : formatMoney(discrepancy))}
              </div>
            </div>
            <div className="text-xs font-black uppercase tracking-tight mt-1">
              {erpTotal === 0 
                ? 'Chờ nhập tiền ERP' 
                : isBalanced 
                  ? '✅ Khớp tiền 100%' 
                  : isSurplus 
                    ? '⚠️ Dư tiền thực tế' 
                    : '🚨 Thiếu / Hụt tiền'}
            </div>
          </div>
        </div>

        {/* ── BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ (Main Table & HD Export Source) ── */}
        <div 
          ref={tableRef}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-4"
        >
          {/* Table Banner Title */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
              BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
              {storeName} · Mã Kho: {storeCode}
            </p>
          </div>

          {/* Large Typography Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '34%' }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider bg-slate-50">
                  <th className="py-4 px-4 whitespace-nowrap">MỆNH GIÁ</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">SỐ LƯỢNG (TỜ)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">THÀNH TIỀN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DENOMINATIONS.map((denom) => {
                  const count = counts[denom.value] || 0;
                  const lineTotal = count * denom.value;
                  return (
                    <tr key={denom.value} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Mệnh giá Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm sm:text-base font-black shadow-xs ${denom.badgeBg}`}>
                          {denom.label}
                        </span>
                      </td>

                      {/* 2. Số lượng tờ */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={count === 0 ? '' : count}
                          placeholder="0"
                          onFocus={e => e.target.select()}
                          onChange={e => handleSetCount(denom.value, parseInt(e.target.value, 10))}
                          className="w-28 sm:w-36 text-center bg-white font-black text-slate-900 text-base sm:text-lg py-2 rounded-2xl border-2 border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-xs"
                        />
                      </td>

                      {/* 3. Thành tiền */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`text-base sm:text-xl font-black ${lineTotal > 0 ? denom.textCol : 'text-slate-300'}`}>
                          {formatMoney(lineTotal)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Row */}
              <tfoot>
                <tr className="border-t-4 border-slate-900 bg-emerald-50/80">
                  <td className="py-4 px-4 font-black text-slate-900 uppercase text-sm sm:text-base whitespace-nowrap">
                    TỔNG THỰC ĐẾM:
                  </td>
                  <td className="py-4 px-4 text-center font-black text-slate-700 text-sm sm:text-base whitespace-nowrap">
                    {totalBills} tờ
                  </td>
                  <td className="py-4 px-4 text-right font-black text-emerald-800 text-xl sm:text-2xl whitespace-nowrap">
                    {formatMoney(totalActual)}
                  </td>
                </tr>

                {/* ERP row */}
                <tr className="border-t border-slate-200 bg-blue-50/50 font-black">
                  <td colSpan={2} className="py-4 px-4 uppercase text-slate-700 text-xs sm:text-sm whitespace-nowrap">
                    TIỀN THEO PHẦN MỀM ERP:
                  </td>
                  <td className="py-4 px-4 text-right text-blue-800 text-base sm:text-lg whitespace-nowrap">
                    {formatMoney(erpTotal)}
                  </td>
                </tr>

                {/* Discrepancy row */}
                <tr className={`border-t border-slate-300 font-black ${
                  erpTotal === 0
                    ? 'bg-slate-50 text-slate-700'
                    : isBalanced
                      ? 'bg-emerald-100 text-emerald-950'
                      : isSurplus
                        ? 'bg-amber-100 text-amber-950'
                        : 'bg-rose-100 text-rose-950'
                }`}>
                  <td colSpan={2} className="py-4 px-4 uppercase text-xs sm:text-sm whitespace-nowrap">
                    CHÊNH LỆCH QUỸ: {erpTotal === 0 ? '(Chưa nhập ERP)' : (isBalanced ? 'KHỚP TIỀN' : isSurplus ? 'DƯ TIỀN' : 'THIẾU TIỀN')}
                  </td>
                  <td className="py-4 px-4 text-right text-base sm:text-xl whitespace-nowrap">
                    {erpTotal === 0 ? '0 đ' : (discrepancy > 0 ? `+${formatMoney(discrepancy)}` : formatMoney(discrepancy))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODAL XEM LẠI LỊCH SỬ KIỂM TIỀN (Portal to document.body) ── */}
      {isHistoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative z-[1000000]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
                  <History size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">
                    LỊCH SỬ KIỂM TIỀN TRONG NGÀY
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Tổng cộng: {historyList.length} lần kiểm đã lưu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {historyList.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: List of History Records */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
              {historyList.length === 0 ? (
                <div className="text-center py-12">
                  <History size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">Chưa có lịch sử kiểm tiền nào được lưu trong ngày.</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy bấm nút "💾 LƯU LỊCH SỬ" sau mỗi lần đếm tiền xong!</p>
                </div>
              ) : (
                historyList.map((item) => {
                  const itemDiscrepancy = item.discrepancy ?? (item.totalActual - item.erpTotal);
                  const isItemBalanced = item.erpTotal > 0 && Math.abs(itemDiscrepancy) === 0;
                  const isItemSurplus = item.erpTotal > 0 && itemDiscrepancy > 0;

                  return (
                    <div 
                      key={item.id}
                      className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/80 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-black">
                            <Clock size={12} /> {item.timeStr}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold">
                            <Calendar size={12} /> {item.dateStr}
                          </span>
                          
                          {item.erpTotal > 0 ? (
                            isItemBalanced ? (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black">
                                ✅ Khớp 100%
                              </span>
                            ) : isItemSurplus ? (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-black">
                                ⚠️ Dư +{formatMoney(itemDiscrepancy)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-black">
                                🚨 Thiếu {formatMoney(itemDiscrepancy)}
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-600 text-[11px] font-bold">
                              Chưa nhập ERP
                            </span>
                          )}
                        </div>

                        {/* Totals info */}
                        <div className="flex items-baseline gap-3">
                          <span className="text-base sm:text-lg font-black text-emerald-700">
                            {formatMoney(item.totalActual)}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            ({item.totalBills} tờ)
                          </span>
                          {item.erpTotal > 0 && (
                            <span className="text-xs font-bold text-blue-700">
                              · ERP: {formatMoney(item.erpTotal)}
                            </span>
                          )}
                        </div>

                        {/* Quick preview of bills breakdown */}
                        <div className="text-[11px] text-slate-400 font-medium line-clamp-1">
                          {DENOMINATIONS.filter(d => (item.counts[d.value] || 0) > 0)
                            .map(d => `${d.label.replace(' đ', '')}: ${item.counts[d.value]} tờ`)
                            .join(' · ') || '0 tờ'}
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        <button
                          onClick={() => handleLoadHistoryRecord(item)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                          title="Tải lại số tờ của lần kiểm này vào bảng đếm"
                        >
                          <ArrowDownCircle size={14} /> NẠP LẠI
                        </button>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Image Preview Modal ── */}
      {previewImageUrl && (
        <ImagePreviewModal
          previewImage={previewImageUrl}
          setPreviewImage={setPreviewImageUrl}
        />
      )}
    </div>
  );
}
