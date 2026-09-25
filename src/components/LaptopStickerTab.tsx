import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Printer, Plus, Trash2, Copy, Download, RefreshCw, 
  Calendar, Edit3, Monitor, Layers, Upload, X, ZoomIn, ZoomOut, Maximize2
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

// Default 6 stickers matching the user's reference image 100%
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

// MWG (The Gioi Di Dong) SVG Icon matching Reference Image
export function MwLogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#ffffff" strokeWidth="3" />
      {/* Running person */}
      <circle cx="48" cy="27" r="8" fill="#ffffff" />
      <path
        d="M48 37 C46 42 42 51 40 58 C38 63 35 69 30 74 C28 75.5 30.5 77 32.5 75.5 C37.5 71 41.5 64 44.5 57 L50.5 72 C52.5 77 54.5 79 57.5 78 C59.5 77 58.5 74 56.5 70 L51.5 55 C53.5 52 56.5 48 60.5 46 C64.5 44 69.5 44 72.5 46 C74.5 47 75.5 45 73.5 43 C69.5 40 63.5 40 58.5 43 L52.5 39 C50.5 37 49 36 48 37 Z"
        fill="#ffffff"
      />
      <path
        d="M47 40 C43 42 38 45 33 47 C31 48 30 46 32 45 C36 42 41 39 45 37 Z"
        fill="#ffffff"
      />
      {/* Orbiting particles */}
      <circle cx="24" cy="33" r="3.5" fill="#ffffff" />
      <circle cx="20" cy="48" r="3.5" fill="#ffffff" />
      <circle cx="26" cy="64" r="3.5" fill="#ffffff" />
      <circle cx="70" cy="29" r="3.5" fill="#ffffff" />
      <circle cx="78" cy="43" r="3.5" fill="#ffffff" />
      <circle cx="74" cy="61" r="3.5" fill="#ffffff" />
      <circle cx="64" cy="73" r="3.5" fill="#ffffff" />
    </svg>
  );
}

// Gift Box with Bow, Ribbons, and SALE tags SVG Icon matching Reference Image
export function GiftBoxStickerIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles / 4-point stars */}
      <path d="M12 20 Q12 27 18 27 Q12 27 12 34 Q12 27 6 27 Q12 27 12 20 Z" fill="#ffffff" />
      <path d="M86 16 Q86 22 91 22 Q86 22 86 28 Q86 22 81 22 Q86 22 86 16 Z" fill="#ffffff" />
      <circle cx="22" cy="12" r="2.2" fill="#ffffff" />
      <circle cx="82" cy="36" r="2.2" fill="#ffffff" />
      <circle cx="16" cy="42" r="1.8" fill="#ffffff" />

      {/* Bow loops */}
      <path
        d="M48 22 C37 8 20 12 24 26 C27 34 42 30 48 28 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.6"
      />
      <path
        d="M52 22 C63 8 80 12 76 26 C73 34 58 30 52 28 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.6"
      />
      {/* Center knot */}
      <circle cx="50" cy="26" r="5.2" fill="#ffffff" stroke="#000000" strokeWidth="1.6" />

      {/* Lid */}
      <rect x="22" y="30" width="56" height="11" rx="1.5" fill="#ffffff" stroke="#000000" strokeWidth="1.6" />
      <rect x="46" y="30" width="8" height="11" fill="#000000" />

      {/* Box Body */}
      <rect x="26" y="42" width="48" height="40" rx="1.5" fill="#ffffff" stroke="#000000" strokeWidth="1.6" />
      <rect x="46" y="42" width="8" height="40" fill="#000000" />

      {/* Left Hanging Ribbon & SALE Tag */}
      <path d="M46 35 C34 40 20 47 18 60" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
      <g transform="translate(9, 58) rotate(-18)">
        <polygon points="0,0 18,0 13,16 0,16" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
        <circle cx="4" cy="8" r="1.6" fill="#000000" />
        <text x="7" y="11.5" fill="#000000" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">SALE</text>
      </g>

      {/* Right Hanging Ribbon & SALE Tag */}
      <path d="M54 35 C66 40 80 47 82 60" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
      <g transform="translate(75, 58) rotate(18)">
        <polygon points="0,0 18,0 18,16 5,16" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
        <circle cx="14" cy="8" r="1.6" fill="#000000" />
        <text x="3.5" y="11.5" fill="#000000" fontSize="7" fontWeight="900" fontFamily="sans-serif">%</text>
      </g>
    </svg>
  );
}

// ==========================================
// SINGLE STICKER COMPONENT (MATCHING FIGURE 1)
// ==========================================
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
        border: '3.5px solid #000000',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        fontFamily: '"Anton", "Oswald", "Inter", sans-serif',
      }}
    >
      {/* ── HEADER (Nền đen, chiếm ~20% chiều cao tem, khớp tỉ lệ Hình 1) ── */}
      <div
        className="bg-black text-white flex items-center justify-between px-2 py-1 relative shrink-0"
        style={{
          borderBottom: '3.5px solid #000000',
          height: '20%',
          minHeight: '20%',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Gift Box Icon (To, cao gần kịch dải đen) */}
        <div className="shrink-0 flex items-center justify-start w-[28%] h-full">
          <GiftBoxStickerIcon className="w-full h-full max-h-[92%] object-contain" />
        </div>

        {/* Center: GIÁ / ? / RẺ QUÁ !! (Font cực đậm, to rõ, khớp Hình 1) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center leading-none px-0.5">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.headerTop}
              onChange={(e) => onUpdateField?.('headerTop', e.target.value)}
              className="w-full text-center bg-transparent text-white font-black text-[27px] tracking-wider uppercase leading-none outline-none focus:bg-white/20 rounded py-0"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[27px] tracking-wider uppercase text-white leading-none"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            >
              {sticker.headerTop || 'GIÁ'}
            </div>
          )}

          {/* Dấu chấm hỏi ở giữa */}
          <div className="text-[12px] font-black text-white leading-none my-0.5 select-none">?</div>

          {isInteractive ? (
            <input
              type="text"
              value={sticker.headerBottom}
              onChange={(e) => onUpdateField?.('headerBottom', e.target.value)}
              className="w-full text-center bg-transparent text-white font-black text-[24px] tracking-tight uppercase leading-none outline-none focus:bg-white/20 rounded py-0"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[24px] tracking-tight uppercase text-white leading-none whitespace-nowrap"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            >
              {sticker.headerBottom || 'RẺ QUÁ !!'}
            </div>
          )}
        </div>

        {/* Right: MWG Circle Logo (Góc trên bên phải) */}
        <div className="shrink-0 flex items-start justify-end w-[20%] h-full pt-0.5">
          <MwLogoIcon className="w-8 h-8 max-h-[85%]" />
        </div>
      </div>

      {/* ── BODY (Nền trắng, chiếm ~66% chiều cao tem, các chữ to đậm đặc) ── */}
      <div
        className="flex-1 flex flex-col items-center justify-between py-2.5 px-2 text-center bg-white text-black min-h-0"
        style={{ height: '66%' }}
      >
        {/* Dòng 1: TÊN SẢN PHẨM (Font đậm, in hoa, màu đen) */}
        <div className="w-full px-1 flex items-center justify-center">
          {isInteractive ? (
            <textarea
              rows={1}
              value={sticker.productName}
              onChange={(e) => onUpdateField?.('productName', e.target.value)}
              className="w-full text-center bg-transparent text-black font-black text-[18px] uppercase tracking-tight outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 resize-none leading-tight"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[18px] uppercase tracking-tight text-black leading-tight truncate max-w-full"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
              title={sticker.productName}
            >
              {sticker.productName || 'TÊN SẢN PHẨM'}
            </div>
          )}
        </div>

        {/* Dòng 2: GIẢM NGAY (Cực to và dày cộp khớp Hình 1) */}
        <div className="w-full px-1 flex items-center justify-center">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.promoBadge}
              onChange={(e) => onUpdateField?.('promoBadge', e.target.value)}
              className="w-full text-center bg-transparent text-black font-black text-[34px] uppercase tracking-tight outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 leading-none py-0"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[34px] uppercase tracking-tight text-black leading-none"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            >
              {sticker.promoBadge || 'GIẢM NGAY'}
            </div>
          )}
        </div>

        {/* Dòng 3: GIÁ 0.000.000 (KHỔNG LỒ, font số condensed cực dày, khớp 100% Hình 1) */}
        <div className="w-full px-0.5 my-0.5 flex items-center justify-center">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.price}
              onChange={(e) => onUpdateField?.('price', e.target.value)}
              className="w-full text-center bg-transparent text-black font-black text-[56px] tracking-tight outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 leading-none py-0"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif', letterSpacing: '-0.02em' }}
            />
          ) : (
            <div
              className="font-black text-[56px] tracking-tight text-black leading-none whitespace-nowrap"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif', letterSpacing: '-0.02em' }}
            >
              {sticker.price || '0.000.000'}
            </div>
          )}
        </div>

        {/* Dòng 4: + TRẢ GÓP 0% (To, đậm rõ ràng) */}
        <div className="w-full px-1 flex items-center justify-center">
          {isInteractive ? (
            <input
              type="text"
              value={sticker.installmentText}
              onChange={(e) => onUpdateField?.('installmentText', e.target.value)}
              className="w-full text-center bg-transparent text-black font-black text-[19px] uppercase tracking-tight outline-none focus:bg-yellow-50 rounded border border-transparent focus:border-amber-300 leading-none py-0"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            />
          ) : (
            <div
              className="font-black text-[19px] uppercase tracking-tight text-black leading-none"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
            >
              {sticker.installmentText || '+ TRẢ GÓP 0%'}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER: Khung viền chữ nhật đen rộng ~92% (Chiếm ~14% chiều cao tem) ── */}
      <div
        className="px-2 pb-2.5 pt-0 bg-white shrink-0 flex items-center justify-center"
        style={{ height: '14%' }}
      >
        <div
          className="w-[94%] py-1.5 px-2 text-center rounded-[1px] flex items-center justify-center"
          style={{
            border: '3px solid #000000',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
          }}
        >
          {isInteractive ? (
            <div className="flex items-center justify-center gap-1 w-full">
              <span className="font-black text-[14.5px] uppercase text-black" style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}>
                NGÀY IN:
              </span>
              <input
                type="text"
                value={sticker.printDate}
                onChange={(e) => onUpdateField?.('printDate', e.target.value)}
                className="w-24 text-center bg-transparent text-black font-black text-[14.5px] uppercase tracking-wider outline-none focus:bg-yellow-50 rounded"
                style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
              />
            </div>
          ) : (
            <div
              className="font-black text-[14.5px] uppercase tracking-wider text-black text-center"
              style={{ fontFamily: '"Anton", "Oswald", sans-serif' }}
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
  const LOCAL_STORAGE_KEY = 'crm_laptop_stickers_v2';

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
  const [zoomLevel, setZoomLevel] = useState<'fit' | '100' | '80'>('fit');
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
      setStickers(createDefaultLaptopStickers());
      return;
    }
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleResetToDefault = () => {
    if (window.confirm('Đặt lại 6 tem mẫu mặc định như hình mẫu? Dữ liệu hiện tại sẽ được nạp lại.')) {
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

  // Zero-Shadow Export HD PNG
  const exportA4Png = async () => {
    const pageEl = document.getElementById('laptop-a4-preview-sheet');
    if (!pageEl) return;

    try {
      setIsExportingImage(true);
      const htmlToImage = await import('html-to-image');

      const dataUrl = await htmlToImage.toPng(pageEl, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-export')) {
            return false;
          }
          return true;
        },
        style: {
          boxShadow: 'none',
          filter: 'none',
          transform: 'none', // Strip zoom scale on export
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
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-700 tracking-wide">
                  Khớp Hình Mẫu 100%
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Chỉnh sửa thông số trực tiếp trên tem — Trang in A4 đứng tỉ lệ chuẩn 2 hàng x 3 cột
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
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 px-1.5 py-0.5 bg-sky-50 rounded cursor-pointer"
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

          {/* View Mode & Zoom Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Zoom Controls for Sheet View */}
            {viewMode === 'sheet' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setZoomLevel('fit')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    zoomLevel === 'fit' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị vừa vặn cả 6 tem trong màn hình"
                >
                  <Maximize2 size={12} className="inline mr-1" />
                  Vừa màn hình
                </button>
                <button
                  onClick={() => setZoomLevel('80')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    zoomLevel === '80' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80%
                </button>
                <button
                  onClick={() => setZoomLevel('100')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    zoomLevel === '100' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  100% In thật
                </button>
              </div>
            )}

            {/* Mode Switcher */}
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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-xs font-bold"
                >
                  ◀ Trang trước
                </button>
                <span className="text-xs font-black text-slate-800 px-2">
                  Trang {currentPageIndex + 1}
                </span>
                <button
                  onClick={() => setCurrentPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPageIndex === totalPages - 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-xs font-bold"
                >
                  Trang sau ▶
                </button>
              </div>
            </div>
          )}

          {/* Interactive instruction banner */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs text-sky-800">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-sky-600 shrink-0" />
              <span>
                <strong>Sửa trực tiếp:</strong> Nhấp vào bất kỳ chữ nào trên từng tem (Tên SP, GIẢM NGAY, Giá tiền, Trả góp, Ngày in...) để sửa ngay tại chỗ!
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

          {/* A4 Sheet Container with Zoom Wrapper */}
          <div className="flex justify-center overflow-x-auto pb-8 pt-2">
            <div
              style={{
                transform: zoomLevel === 'fit' ? 'scale(0.72)' : zoomLevel === '80' ? 'scale(0.8)' : 'scale(1)',
                transformOrigin: 'top center',
                marginBottom: zoomLevel === 'fit' ? '-80mm' : zoomLevel === '80' ? '-55mm' : '0',
                transition: 'transform 0.2s ease',
              }}
            >
              <div
                id="laptop-a4-preview-sheet"
                className="bg-white text-black shadow-2xl relative select-none"
                style={{
                  width: '210mm',
                  height: '297mm',
                  minWidth: '210mm',
                  minHeight: '297mm',
                  padding: '5mm 5mm',
                  boxSizing: 'border-box',
                  border: '1.5px solid #000000',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(2, 1fr)',
                  columnGap: '3.5mm',
                  rowGap: '5mm',
                  backgroundColor: '#ffffff',
                }}
              >
                {Array.from({ length: 6 }).map((_, slotIdx) => {
                  const sticker = currentSixStickers[slotIdx];
                  if (!sticker) {
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
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Nhân đôi"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSticker(stk.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-xs hover:bg-slate-50 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-800">
                        {stk.quantity || 1}
                      </span>
                      <button
                        onClick={() => handleUpdateField(stk.id, 'quantity', (stk.quantity || 1) + 1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-xs hover:bg-slate-50 cursor-pointer"
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
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
              border: 1px solid #000000 !important;
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
              padding: '5mm 5mm',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              columnGap: '3.5mm',
              rowGap: '5mm',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              border: '1.5px solid #000000',
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
