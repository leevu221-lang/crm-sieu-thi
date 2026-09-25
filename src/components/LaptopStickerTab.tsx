import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Printer, Plus, Trash2, Copy, Download, RefreshCw, 
  Calendar, Edit3, Check, Sparkles, FileText, ChevronLeft, 
  ChevronRight, Layers, Smartphone, Monitor, Eye, Settings2,
  Upload, HelpCircle, X
} from 'lucide-react';
import { createPortal } from 'react-dom';

export interface LaptopStickerItem {
  id: string;
  productName: string;
  promoBadge: string;
  price: string;
  installmentText: string;
  headerTop: string;
  headerBottom: string;
  printDate: string;
  quantity: number;
}

// Format number with dots (e.g. 12990000 -> 12.990.000)
export const formatVNDPrice = (val: string): string => {
  if (!val) return '0.000.000';
  // If already contains dots and no letters, keep or normalize
  const digitsOnly = val.replace(/\D/g, '');
  if (!digitsOnly) return val;
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Current date formatted as dd/mm/yyyy
export const getFormattedCurrentDate = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Default 6 stickers matching the user's reference image
export const createDefaultLaptopStickers = (): LaptopStickerItem[] => {
  const today = getFormattedCurrentDate();
  return Array.from({ length: 6 }).map((_, idx) => ({
    id: `laptop-sticker-${Date.now()}-${idx}`,
    productName: 'TÊN SẢN PHẨM',
    promoBadge: 'GIẢM NGAY',
    price: '0.000.000',
    installmentText: '+ TRẢ GÓP 0%',
    headerTop: 'GIÁ',
    headerBottom: 'RẺ QUÁ !!',
    printDate: today,
    quantity: 1,
  }));
};

// MWG (The Gioi Di Dong) SVG Icon
export function MwLogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#ffffff" strokeWidth="2.8" />
      {/* Running person */}
      <circle cx="48" cy="28" r="7.5" fill="#ffffff" />
      <path
        d="M48 38 C46 43 42 52 40 59 C38 64 35 70 30 75 C28.5 76.5 31 78 33 76.5 C38 72 42 65 45 58 L51 73 C53 78 55 80 58 79 C60 78 59 75 57 71 L52 56 C54 53 57 49 61 47 C65 45 70 45 73 47 C75 48 76 46 74 44 C70 41 64 41 59 44 L53 40 C51 38 49 37 48 38 Z"
        fill="#ffffff"
      />
      <path
        d="M47 41 C43 43 38 46 33 48 C31 49 30 47 32 46 C36 43 41 40 45 38 Z"
        fill="#ffffff"
      />
      {/* Orbiting particles */}
      <circle cx="25" cy="34" r="3.2" fill="#ffffff" />
      <circle cx="21" cy="48" r="3.2" fill="#ffffff" />
      <circle cx="27" cy="63" r="3.2" fill="#ffffff" />
      <circle cx="69" cy="30" r="3.2" fill="#ffffff" />
      <circle cx="77" cy="43" r="3.2" fill="#ffffff" />
      <circle cx="73" cy="60" r="3.2" fill="#ffffff" />
      <circle cx="63" cy="72" r="3.2" fill="#ffffff" />
    </svg>
  );
}

// Gift Box with Bow, Ribbons, and SALE tags SVG Icon
export function GiftBoxStickerIcon({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles / Stars */}
      <path d="M14 22 Q14 28 19 28 Q14 28 14 34 Q14 28 9 28 Q14 28 14 22 Z" fill="#ffffff" />
      <path d="M84 18 Q84 23 88 23 Q84 23 84 28 Q84 23 80 23 Q84 23 84 18 Z" fill="#ffffff" />
      <circle cx="24" cy="15" r="1.8" fill="#ffffff" />
      <circle cx="78" cy="38" r="1.8" fill="#ffffff" />

      {/* Bow Left & Right */}
      <path
        d="M48 23 C38 10 22 14 26 27 C29 34 43 31 48 29 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
      />
      <path
        d="M52 23 C62 10 78 14 74 27 C71 34 57 31 52 29 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
      />
      {/* Bow Knot */}
      <circle cx="50" cy="27" r="4.8" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

      {/* Box Lid */}
      <rect x="25" y="31" width="50" height="9.5" rx="1.5" fill="#ffffff" />
      {/* Lid Ribbon Cross */}
      <rect x="46.5" y="31" width="7" height="9.5" fill="#000000" />

      {/* Box Body */}
      <rect x="29" y="42" width="42" height="34" rx="1" fill="#ffffff" />
      {/* Body Vertical Ribbon */}
      <rect x="46.5" y="42" width="7" height="34" fill="#000000" />

      {/* Left Hanging Ribbon & Tag */}
      <path d="M46.5 35 C36 39 23 45 21 55" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <g transform="translate(13, 53) rotate(-15)">
        <polygon points="0,0 15,0 11,13 0,13" fill="#ffffff" />
        <circle cx="3.5" cy="6.5" r="1.3" fill="#000000" />
        <text x="6" y="9.5" fill="#000000" fontSize="5.5" fontWeight="900" fontFamily="sans-serif">SALE</text>
      </g>

      {/* Right Hanging Ribbon & Tag */}
      <path d="M53.5 35 C64 39 77 45 79 57" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <g transform="translate(73, 53) rotate(15)">
        <polygon points="0,0 15,0 15,13 4,13" fill="#ffffff" />
        <circle cx="11.5" cy="6.5" r="1.3" fill="#000000" />
        <text x="3" y="9.5" fill="#000000" fontSize="6" fontWeight="900" fontFamily="sans-serif">%</text>
      </g>
    </svg>
  );
}

// Single Laptop Sticker Component (Matching Reference Image)
export function SingleLaptopSticker({
  sticker,
  isInteractive = false,
  onUpdateField,
}: {
  sticker: LaptopStickerItem;
  isInteractive?: boolean;
  onUpdateField?: (field: keyof LaptopStickerItem, val: any) => void;
}) {
  return (
    <div
      className="laptop-sticker-item bg-white flex flex-col justify-between select-none relative box-border overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        border: '3px solid #000000',
        fontFamily: '"Oswald", "Inter", "UTM Avo", sans-serif',
      }}
    >
      {/* ── HEADER (Black background, white text/icons) ── */}
      <div
        className="bg-black text-white flex items-center justify-between px-2.5 py-1.5 relative shrink-0"
        style={{
          borderBottom: '2.5px solid #000000',
          height: '27%',
          minHeight: '27%',
        }}
      >
        {/* Left: Gift Box Icon */}
        <div className="shrink-0 flex items-center justify-center w-[30%]">
          <GiftBoxStickerIcon className="w-12 h-12 max-h-full" />
        </div>

        {/* Center: GIÁ / ? / RẺ QUÁ !! */}
        <div className="flex-1 flex flex-col items-center justify-center text-center leading-none px-1">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.headerTop}
              onChange={(e) => onUpdateField?.('headerTop', e.target.value)}
              className="w-full text-center bg-transparent text-white font-black text-[22px] tracking-wider uppercase leading-none outline-none focus:bg-white/20 rounded"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[22px] tracking-wider uppercase text-white leading-tight"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            >
              {sticker.headerTop || 'GIÁ'}
            </div>
          )}

          {/* Question mark in the middle */}
          <div className="text-[10px] font-black text-white leading-none my-0.5">?</div>

          {isInteractive ? (
            <input
              type="text"
              value={sticker.headerBottom}
              onChange={(e) => onUpdateField?.('headerBottom', e.target.value)}
              className="w-full text-center bg-transparent text-white font-black text-[20px] tracking-tight uppercase leading-none outline-none focus:bg-white/20 rounded"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[20px] tracking-tight uppercase text-white leading-none whitespace-nowrap"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            >
              {sticker.headerBottom || 'RẺ QUÁ !!'}
            </div>
          )}
        </div>

        {/* Right: MWG Circle Logo */}
        <div className="shrink-0 flex items-center justify-end w-[22%]">
          <MwLogoIcon className="w-7 h-7" />
        </div>
      </div>

      {/* ── BODY (White background, black bold content) ── */}
      <div className="flex-1 flex flex-col items-center justify-evenly py-2 px-3 text-center bg-white text-black min-h-0">
        {/* Product Name */}
        <div className="w-full px-1">
          {isInteractive ? (
            <textarea
              rows={2}
              value={sticker.productName}
              onChange={(e) => onUpdateField?.('productName', e.target.value)}
              className="w-full text-center bg-transparent text-black font-bold text-[13.5px] uppercase tracking-wide outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 resize-none leading-snug"
              style={{ fontFamily: '"Inter", "UTM Avo", sans-serif' }}
            />
          ) : (
            <div
              className="font-bold text-[13.5px] uppercase tracking-wide text-black leading-snug line-clamp-2"
              style={{ fontFamily: '"Inter", "UTM Avo", sans-serif' }}
            >
              {sticker.productName || 'TÊN SẢN PHẨM'}
            </div>
          )}
        </div>

        {/* Promo Badge: GIẢM NGAY */}
        <div className="w-full px-1">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.promoBadge}
              onChange={(e) => onUpdateField?.('promoBadge', e.target.value)}
              className="w-full text-center bg-transparent text-black font-black text-[24px] uppercase tracking-tight outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 leading-none"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[24px] uppercase tracking-tight text-black leading-none"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            >
              {sticker.promoBadge || 'GIẢM NGAY'}
            </div>
          )}
        </div>

        {/* Price: 0.000.000 */}
        <div className="w-full px-1 my-0.5">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.price}
              onChange={(e) => onUpdateField?.('price', e.target.value)}
              className="w-full text-center bg-transparent text-black font-black text-[42px] tracking-tight outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 leading-none"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[42px] tracking-tight text-black leading-none whitespace-nowrap"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            >
              {sticker.price || '0.000.000'}
            </div>
          )}
        </div>

        {/* Installment / Offer: + TRẢ GÓP 0% */}
        <div className="w-full px-1">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.installmentText}
              onChange={(e) => onUpdateField?.('installmentText', e.target.value)}
              className="w-full text-center bg-transparent text-black font-bold text-[15.5px] uppercase tracking-wide outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 leading-none"
              style={{ fontFamily: '"Inter", "UTM Avo", sans-serif' }}
            />
          ) : (
            <div
              className="font-bold text-[15.5px] uppercase tracking-wide text-black leading-none"
              style={{ fontFamily: '"Inter", "UTM Avo", sans-serif' }}
            >
              {sticker.installmentText || '+ TRẢ GÓP 0%'}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER: Black bordered box with print date ── */}
      <div className="px-3 pb-2.5 pt-1 bg-white shrink-0">
        <div
          className="w-full py-1 px-2 text-center rounded-[2px]"
          style={{
            border: '2px solid #000000',
            backgroundColor: '#ffffff',
          }}
        >
          {isInteractive ? (
            <div className="flex items-center justify-center gap-1">
              <span className="font-bold text-[12px] uppercase text-black">NGÀY IN:</span>
              <input
                type="text"
                value={sticker.printDate}
                onChange={(e) => onUpdateField?.('printDate', e.target.value)}
                className="w-24 text-center bg-transparent text-black font-bold text-[12px] uppercase tracking-wider outline-none focus:bg-yellow-50 rounded"
                style={{ fontFamily: '"Inter", "UTM Avo", sans-serif' }}
              />
            </div>
          ) : (
            <div
              className="font-bold text-[12px] uppercase tracking-wider text-black text-center"
              style={{ fontFamily: '"Inter", "UTM Avo", sans-serif' }}
            >
              NGÀY IN: {sticker.printDate || '25/09/2026'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN LAPTOP STICKER TAB COMPONENT
// ==========================================
export default function LaptopStickerTab() {
  const LOCAL_STORAGE_KEY = 'crm_laptop_stickers_v1';

  // Load initial stickers or fallback to 6 default stickers
  const [stickers, setStickers] = useState<LaptopStickerItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading laptop stickers:', e);
    }
    return createDefaultLaptopStickers();
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stickers));
    } catch (e) {
      console.error('Error saving laptop stickers:', e);
    }
  }, [stickers]);

  // View mode: 'sheet' (A4 preview) or 'list' (Card editor)
  const [viewMode, setViewMode] = useState<'sheet' | 'list'>('sheet');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQuickImportOpen, setIsQuickImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [bulkDate, setBulkDate] = useState(getFormattedCurrentDate());

  // Expanding stickers based on their individual print quantities
  const expandedStickers = useMemo(() => {
    return stickers.flatMap((s) => Array(Math.max(1, s.quantity || 1)).fill(s));
  }, [stickers]);

  // Total pages needed for 6 stickers per A4 page
  const totalPages = Math.ceil(expandedStickers.length / 6) || 1;
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Sticker operations
  const handleUpdateField = (id: string, field: keyof LaptopStickerItem, val: any) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleAddSticker = () => {
    const newSticker: LaptopStickerItem = {
      id: `laptop-sticker-${Date.now()}`,
      productName: 'TÊN SẢN PHẨM',
      promoBadge: 'GIẢM NGAY',
      price: '0.000.000',
      installmentText: '+ TRẢ GÓP 0%',
      headerTop: 'GIÁ',
      headerBottom: 'RẺ QUÁ !!',
      printDate: bulkDate || getFormattedCurrentDate(),
      quantity: 1,
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  const handleDuplicateSticker = (id: string) => {
    const target = stickers.find((s) => s.id === id);
    if (!target) return;
    const newSticker: LaptopStickerItem = {
      ...target,
      id: `laptop-sticker-${Date.now()}`,
    };
    setStickers((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const arr = [...prev];
      arr.splice(idx + 1, 0, newSticker);
      return arr;
    });
  };

  const handleDeleteSticker = (id: string) => {
    if (stickers.length <= 1) {
      // Keep at least one sticker
      setStickers(createDefaultLaptopStickers());
      return;
    }
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleResetToDefault = () => {
    if (window.confirm('Đặt lại 6 tem mẫu mặc định như hình? Dữ liệu hiện tại sẽ được thay thế.')) {
      setStickers(createDefaultLaptopStickers());
      setCurrentPageIndex(0);
    }
  };

  const handleApplyBulkDate = () => {
    if (!bulkDate) return;
    setStickers((prev) => prev.map((s) => ({ ...s, printDate: bulkDate })));
  };

  const handleApplyBulkPromo = (badge: string) => {
    setStickers((prev) => prev.map((s) => ({ ...s, promoBadge: badge })));
  };

  const handleApplyBulkInstallment = (text: string) => {
    setStickers((prev) => prev.map((s) => ({ ...s, installmentText: text })));
  };

  // Quick import from pasted text or excel rows
  const handleProcessImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n').filter((l) => l.trim().length > 0);
    const newItems: LaptopStickerItem[] = lines.map((line, idx) => {
      // Split by tab or comma or semicolon or pipe
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
        ? line.split(';')
        : line.includes('|')
        ? line.split('|')
        : line.split(',');

      const name = parts[0]?.trim() || 'TÊN SẢN PHẨM';
      const rawPrice = parts[1]?.trim() || '0.000.000';
      const formattedPrice = formatVNDPrice(rawPrice);
      const installment = parts[2]?.trim() || '+ TRẢ GÓP 0%';
      const badge = parts[3]?.trim() || 'GIẢM NGAY';

      return {
        id: `laptop-sticker-${Date.now()}-${idx}`,
        productName: name,
        promoBadge: badge,
        price: formattedPrice,
        installmentText: installment,
        headerTop: 'GIÁ',
        headerBottom: 'RẺ QUÁ !!',
        printDate: bulkDate || getFormattedCurrentDate(),
        quantity: 1,
      };
    });

    if (newItems.length > 0) {
      setStickers(newItems);
      setIsQuickImportOpen(false);
      setImportText('');
      setCurrentPageIndex(0);
    }
  };

  // Zero-Shadow Export HD PNG implementation matching AGENTS.md rule
  const exportA4Png = async () => {
    const pageEl = document.getElementById('laptop-a4-preview-sheet');
    if (!pageEl) return;

    try {
      setIsExportingImage(true);
      const htmlToImage = await import('html-to-image');

      // Zero-Shadow Export Rule per AGENTS.md
      const dataUrl = await htmlToImage.toPng(pageEl, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        filter: (node) => {
          // Exclude any interactive tooltips or controls inside clone
          if (node instanceof HTMLElement && node.classList.contains('no-export')) {
            return false;
          }
          return true;
        },
        style: {
          boxShadow: 'none',
          filter: 'none',
        },
      });

      const link = document.createElement('a');
      link.download = `Sticker_Laptop_A4_Trang_${currentPageIndex + 1}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting A4 image:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Current slice of 6 stickers for A4 preview
  const currentSixStickers = useMemo(() => {
    const start = currentPageIndex * 6;
    return expandedStickers.slice(start, start + 6);
  }, [expandedStickers, currentPageIndex]);

  return (
    <div className="space-y-6">
      {/* ── TOP BANNER & ACTION TOOLBAR ── */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Monitor size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                  STICKER LAPTOP — BỐ CỤC A4 ĐỨNG (6 TEM)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-sky-100 text-sky-700 tracking-wide">
                  Mẫu Chuẩn Siêu Thị
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Chỉnh sửa thông số trực tiếp — Trang in A4 đứng tỉ lệ chuẩn 2 hàng x 3 cột không vỡ layout
              </p>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reset to Default */}
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              title="Đặt lại 6 tem mẫu ban đầu"
            >
              <RefreshCw size={14} />
              <span>Nạp 6 tem mẫu</span>
            </button>

            {/* Quick Paste / Import Modal */}
            <button
              onClick={() => setIsQuickImportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span>Dán nhanh Excel</span>
            </button>

            {/* Export PNG */}
            <button
              onClick={exportA4Png}
              disabled={isExportingImage}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isExportingImage ? 'Đang tạo ảnh...' : 'Tải ảnh PNG A4'}</span>
            </button>

            {/* Print Now Button */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-md shadow-sky-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Printer size={16} />
              <span>IN STICKER A4 ({expandedStickers.length} tem)</span>
            </button>
          </div>
        </div>

        {/* ── SECONDARY CONTROLS BAR: Bulk changes & View switcher ── */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick Bulk Settings */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Bulk Date */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar size={13} className="text-slate-500" />
              <span className="font-bold text-slate-500 text-[11px] uppercase">Ngày in chung:</span>
              <input
                type="text"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-24 text-xs font-black text-slate-800 bg-transparent outline-none text-center"
              />
              <button
                onClick={handleApplyBulkDate}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 px-1.5 py-0.5 bg-sky-50 rounded"
              >
                Áp dụng hết
              </button>
            </div>

            {/* Quick Promo Presets */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Nhãn:</span>
              {['GIẢM NGAY', 'CHỈ CÒN', 'GIÁ SỐC'].map((b) => (
                <button
                  key={b}
                  onClick={() => handleApplyBulkPromo(b)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Quick Installment Presets */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Ưu đãi:</span>
              {['+ TRẢ GÓP 0%', '+ TẶNG BALO', '+ TẶNG CHUỘT'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleApplyBulkInstallment(t)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Chế độ xem:</span>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setViewMode('sheet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'sheet'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor size={13} />
                <span>Trang A4 (6 tem)</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={13} />
                <span>Danh sách ({stickers.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT BASED ON VIEW MODE ── */}
      {viewMode === 'sheet' ? (
        /* ========================================================
           A4 SHEET PREVIEW MODE (EXACT 2 ROWS X 3 COLS AS REFERENCE)
           ======================================================== */
        <div className="space-y-4">
          {/* Page Navigator bar if more than 6 stickers */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-600">
                Hiển thị trang <span className="text-sky-600 font-black">{currentPageIndex + 1}</span> / {totalPages} (Mỗi trang 6 tem A4 đứng)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                  disabled={currentPageIndex === 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-800 px-2">
                  Trang {currentPageIndex + 1}
                </span>
                <button
                  onClick={() => setCurrentPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPageIndex === totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Interactive instruction banner */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs text-sky-800">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-sky-600 shrink-0" />
              <span>
                <strong>Mẹo:</strong> Nhấp trực tiếp vào bất kỳ ô chữ nào trên từng tem (Tên SP, GIẢM NGAY, Giá, Ưu đãi, Ngày in...) để sửa ngay tại chỗ!
              </span>
            </div>
            <button
              onClick={handleAddSticker}
              className="flex items-center gap-1 font-bold text-sky-700 hover:text-sky-900 bg-white px-3 py-1 rounded-xl shadow-xs border border-sky-200 shrink-0 cursor-pointer"
            >
              <Plus size={13} />
              <span>Thêm tem mới</span>
            </button>
          </div>

          {/* A4 Sheet Container */}
          <div className="flex justify-center overflow-x-auto pb-8 pt-2">
            <div
              id="laptop-a4-preview-sheet"
              className="bg-white text-black shadow-2xl relative select-none"
              style={{
                width: '210mm',
                height: '297mm',
                minWidth: '210mm',
                minHeight: '297mm',
                padding: '6mm 6mm',
                boxSizing: 'border-box',
                border: '1px solid #cbd5e1',
                borderRadius: '2px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(2, 1fr)',
                columnGap: '4mm',
                rowGap: '6mm',
              }}
            >
              {Array.from({ length: 6 }).map((_, slotIdx) => {
                const sticker = currentSixStickers[slotIdx];
                if (!sticker) {
                  // Empty placeholder slot
                  return (
                    <div
                      key={`empty-slot-${slotIdx}`}
                      onClick={handleAddSticker}
                      className="border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center p-4 text-slate-400 hover:text-sky-600 hover:border-sky-400 transition-colors cursor-pointer bg-slate-50/50"
                    >
                      <Plus size={28} />
                      <span className="text-xs font-bold mt-2 uppercase">Thêm sticker vào đây</span>
                    </div>
                  );
                }

                return (
                  <div key={sticker.id + '-' + slotIdx} className="w-full h-full relative group">
                    <SingleLaptopSticker
                      sticker={sticker}
                      isInteractive={true}
                      onUpdateField={(field, val) => handleUpdateField(sticker.id, field, val)}
                    />

                    {/* Quick action buttons hover overlay */}
                    <div className="no-export absolute -top-2.5 -right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={() => handleDuplicateSticker(sticker.id)}
                        className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-700 cursor-pointer"
                        title="Nhân đôi tem này"
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteSticker(sticker.id)}
                        className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 cursor-pointer"
                        title="Xóa tem này"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           LIST / FORM EDITING MODE
           ======================================================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">
              Danh sách chi tiết ({stickers.length} tem)
            </h3>
            <button
              onClick={handleAddSticker}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm Sticker mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stickers.map((stk, idx) => (
              <div
                key={stk.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 relative group"
              >
                {/* Header card */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-black text-xs text-slate-700 uppercase">
                      Tem Laptop #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDuplicateSticker(stk.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Nhân đôi"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSticker(stk.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Tên sản phẩm:
                    </label>
                    <input
                      type="text"
                      value={stk.productName}
                      onChange={(e) => handleUpdateField(stk.id, 'productName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Dòng nhãn:
                      </label>
                      <input
                        type="text"
                        value={stk.promoBadge}
                        onChange={(e) => handleUpdateField(stk.id, 'promoBadge', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Giá tiền:
                      </label>
                      <input
                        type="text"
                        value={stk.price}
                        onChange={(e) => handleUpdateField(stk.id, 'price', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-rose-600 outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Dòng ưu đãi:
                      </label>
                      <input
                        type="text"
                        value={stk.installmentText}
                        onChange={(e) => handleUpdateField(stk.id, 'installmentText', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Ngày in:
                      </label>
                      <input
                        type="text"
                        value={stk.printDate}
                        onChange={(e) => handleUpdateField(stk.id, 'printDate', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400 text-center"
                      />
                    </div>
                  </div>

                  {/* Quantity control */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Số lượng in tem:
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                      <button
                        onClick={() => handleUpdateField(stk.id, 'quantity', Math.max(1, (stk.quantity || 1) - 1))}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-xs hover:bg-slate-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-800">
                        {stk.quantity || 1}
                      </span>
                      <button
                        onClick={() => handleUpdateField(stk.id, 'quantity', (stk.quantity || 1) + 1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-xs hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUICK IMPORT MODAL ── */}
      {isQuickImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-indigo-600" />
                <h3 className="text-base font-black text-slate-800 uppercase">
                  Dán nhanh danh sách Laptop từ Excel
                </h3>
              </div>
              <button
                onClick={() => setIsQuickImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Sao chép các cột từ Excel hoặc gõ mỗi dòng 1 sản phẩm theo định dạng:
              <br />
              <strong className="text-slate-700">Tên máy | Giá bán | Ưu đãi</strong> (Phân cách bằng phím Tab hoặc dấu gạch đứng |).
            </p>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`LAPTOP ASUS VIVOBOOK 15\t12.990.000\t+ TRẢ GÓP 0%\nMACBOOK AIR M1 8GB/256GB\t17.490.000\t+ TẶNG BALO\nLAPTOP HP 15-FD0235TU\t9.990.000\t+ TRẢ GÓP 0%`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsQuickImportOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleProcessImport}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer uppercase"
              >
                Tạo Sticker Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT MODAL (PORTAL FOR CLEAN BROWSER PRINT) ── */}
      {isPrintModalOpen && (
        <LaptopStickerPrintModal
          stickers={expandedStickers}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
}

// ==========================================
// PRINT MODAL WITH PURE A4 PORTRAIT LAYOUT
// ==========================================
function LaptopStickerPrintModal({
  stickers,
  onClose,
}: {
  stickers: LaptopStickerItem[];
  onClose: () => void;
}) {
  // Chunk into pages of 6 stickers each (3 cols x 2 rows)
  const pages: LaptopStickerItem[][] = [];
  for (let i = 0; i < stickers.length; i += 6) {
    pages.push(stickers.slice(i, i + 6));
  }

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="laptop-print-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-start bg-slate-900/90 overflow-y-auto p-4 md:p-8 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible">
      {/* ── Print Media Stylesheet ── */}
      <style type="text/css">
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              zoom: 1 !important;
              width: 210mm !important;
              height: auto !important;
            }
            /* Hide all background website elements */
            body > * {
              display: none !important;
            }
            .laptop-print-overlay {
              display: block !important;
              position: static !important;
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              overflow: visible !important;
            }
            .laptop-print-modal-header,
            .laptop-print-controls {
              display: none !important;
            }
            .laptop-print-a4-page {
              box-shadow: none !important;
              border: none !important;
              margin: 0 auto !important;
              page-break-after: always !important;
              break-after: page !important;
            }
          }
        `}
      </style>

      {/* Modal Toolbar (hidden during print) */}
      <div className="laptop-print-controls bg-white/95 backdrop-blur-md rounded-2xl p-4 mb-6 max-w-2xl w-full flex items-center justify-between shadow-2xl border border-slate-200 shrink-0 sticky top-2 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
            <Printer size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Bản In Sticker Laptop ({stickers.length} tem — {pages.length} trang A4)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Bố cục A4 đứng chuẩn 2 hàng x 3 cột (Khổ giấy 210mm x 297mm)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Đóng lại
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-500/25 cursor-pointer"
          >
            <Printer size={15} />
            <span>In Ra Giấy A4</span>
          </button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block w-full">
        {pages.map((pageStickers, pageIdx) => (
          <div
            key={`print-page-${pageIdx}`}
            className="laptop-print-a4-page bg-white shadow-2xl print:shadow-none box-border relative overflow-hidden"
            style={{
              width: '210mm',
              height: '297mm',
              minWidth: '210mm',
              minHeight: '297mm',
              padding: '6mm 6mm',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              columnGap: '4mm',
              rowGap: '6mm',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            {pageStickers.map((stk, sIdx) => (
              <div
                key={`print-stk-${pageIdx}-${sIdx}`}
                className="w-full h-full relative"
              >
                <SingleLaptopSticker sticker={stk} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
