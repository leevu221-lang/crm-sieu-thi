import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Banknote, 
  Copy, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Save,
  History,
  Trash2,
  X,
  ArrowDownCircle,
  Calendar,
  Clock
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useNotification } from '../contexts/NotificationContext';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { ImagePreviewModal } from './ImagePreviewModal';

// Denominations list (VND) with vibrant badge colors
export const DENOMINATIONS = [
  { value: 500000, label: '500.000 đ', badgeBg: 'bg-teal-600 text-white', textCol: 'text-teal-700' },
  { value: 200000, label: '200.000 đ', badgeBg: 'bg-rose-600 text-white', textCol: 'text-rose-700' },
  { value: 100000, label: '100.000 đ', badgeBg: 'bg-emerald-600 text-white', textCol: 'text-emerald-700' },
  { value: 50000, label: '50.000 đ', badgeBg: 'bg-orange-500 text-white', textCol: 'text-orange-700' },
  { value: 20000, label: '20.000 đ', badgeBg: 'bg-blue-600 text-white', textCol: 'text-blue-700' },
  { value: 10000, label: '10.000 đ', badgeBg: 'bg-amber-600 text-white', textCol: 'text-amber-700' },
  { value: 5000, label: '5.000 đ', badgeBg: 'bg-slate-700 text-white', textCol: 'text-slate-800' },
  { value: 2000, label: '2.000 đ', badgeBg: 'bg-stone-600 text-white', textCol: 'text-stone-800' },
  { value: 1000, label: '1.000 đ', badgeBg: 'bg-zinc-600 text-white', textCol: 'text-zinc-800' },
  { value: 500, label: '500 đ', badgeBg: 'bg-red-500 text-white', textCol: 'text-red-700' },
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
    setCounts(prev => ({
      ...prev,
      [val]: Math.max(0, (prev[val] || 0) + delta)
    }));
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
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

      {/* ── BẢNG KÊ TIỀN MẶT THEO MỆNH GIÁ (Main Table) ── */}
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

                    {/* 2. Số lượng tờ (Chỉ ô nhập thủ công) */}
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
