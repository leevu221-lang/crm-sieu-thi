import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Plus, Trash2, X, Copy, Minus } from 'lucide-react';

interface StickerItem {
  id: string;
  name: string;
  originalPrice: string;
  discountPrice: string;
}

const formatPriceDisplay = (value: string): string => {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return parseInt(num, 10).toLocaleString('vi-VN').replace(/,/g, '.');
};

const parsePriceInput = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

// Default stickers - 8 items with "GIÁ RẺ" as product name
const createDefaultStickers = (): StickerItem[] => {
  return [{
    id: `sticker-${Date.now()}-0`,
    name: 'GIÁ RẺ',
    originalPrice: '',
    discountPrice: '',
  }];
};

export default function StickerTemplateTab() {
  const [stickers, setStickers] = useState<StickerItem[]>(createDefaultStickers);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<'8' | '4'>('8');
  const [promoLabel, setPromoLabel] = useState('SẢN PHẨM GIÁ SỐC - EVENT T7 & CN');
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    createDefaultStickers().forEach(s => { init[s.id] = 1; });
    return init;
  });

  const handlePriceChange = (id: string, field: 'originalPrice' | 'discountPrice', rawValue: string) => {
    const cleaned = parsePriceInput(rawValue);
    setStickers(prev => prev.map(s => s.id === id ? { ...s, [field]: cleaned } : s));
  };

  const handleNameChange = (id: string, value: string) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, name: value } : s));
  };

  const addSticker = () => {
    const newId = `sticker-${Date.now()}`;
    setStickers(prev => [...prev, {
      id: newId,
      name: 'GIÁ RẺ',
      originalPrice: '',
      discountPrice: '',
    }]);
    setPrintQuantities(prev => ({ ...prev, [newId]: 1 }));
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setPrintQuantities(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const duplicateSticker = (id: string) => {
    const original = stickers.find(s => s.id === id);
    if (!original) return;
    const newId = `sticker-${Date.now()}`;
    const newSticker = {
      ...original,
      id: newId,
    };
    setStickers(prev => {
      const idx = prev.findIndex(s => s.id === id);
      const arr = [...prev];
      arr.splice(idx + 1, 0, newSticker);
      return arr;
    });
    setPrintQuantities(prev => ({ ...prev, [newId]: prev[id] || 1 }));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setPrintQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleQuantityInput = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setPrintQuantities(prev => ({
      ...prev,
      [id]: isNaN(num) || num < 1 ? 1 : num
    }));
  };

  const clearAll = () => {
    const newStickers = createDefaultStickers();
    setStickers(newStickers);
    const init: Record<string, number> = {};
    newStickers.forEach(s => { init[s.id] = 1; });
    setPrintQuantities(init);
  };

  const validStickers = stickers.filter(s => s.discountPrice);

  // Expand stickers by their quantity for printing
  const expandedStickers = validStickers.flatMap(s =>
    Array(printQuantities[s.id] || 1).fill(s)
  );

  const totalPrintCount = validStickers.reduce((sum, s) => sum + (printQuantities[s.id] || 1), 0);

  const handlePrint = () => {
    if (validStickers.length === 0) return;
    setIsPrintPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-rose-100">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Sticker Mẫu Có Sẵn</h2>
              <p className="text-xs text-slate-500 font-medium">Chỉnh sửa giá trực tiếp trên sticker — Không cần file Excel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-50"
            >
              <Trash2 size={14} />
              Xóa hết
            </button>
          </div>
        </div>

        {/* Promo label */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Dòng khuyến mãi:</label>
          <input
            type="text"
            value={promoLabel}
            onChange={(e) => setPromoLabel(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Layout Selection */}
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Bố cục in:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPrintLayout('8')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                printLayout === '8'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              8 sticker / trang (A4 dọc)
            </button>
            <button
              onClick={() => setPrintLayout('4')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                printLayout === '4'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              4 sticker / trang (A4 ngang)
            </button>
          </div>
        </div>
      </div>

      {/* Sticker Grid - Editable */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">
            Danh sách Sticker ({stickers.length})
          </h3>
          <button
            onClick={addSticker}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={14} />
            Thêm Sticker
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stickers.map((sticker, idx) => (
            <div
              key={sticker.id}
              className="relative border-2 border-black bg-white p-1 group"
            >
              {/* Mini sticker preview */}
              <div className="border-[2px] border-black p-2 flex flex-col h-[180px] relative">
                {/* Top: product name */}
                <div className="text-center mb-1">
                  <input
                    type="text"
                    value={sticker.name}
                    onChange={(e) => handleNameChange(sticker.id, e.target.value)}
                    className="w-full text-center text-[13px] font-black uppercase tracking-tight bg-transparent border-none outline-none focus:bg-yellow-50 rounded px-1 py-0.5"
                    style={{ fontFamily: '"Oswald", sans-serif' }}
                  />
                </div>

                {/* Middle: Prices */}
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  {/* Original Price */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Giá gốc..."
                      value={sticker.originalPrice ? formatPriceDisplay(sticker.originalPrice) : ''}
                      onChange={(e) => handlePriceChange(sticker.id, 'originalPrice', e.target.value)}
                      className="w-full text-center text-[18px] font-black tracking-tight bg-transparent border-none outline-none focus:bg-yellow-50 rounded px-1"
                      style={{ fontFamily: '"Oswald", sans-serif', textDecoration: sticker.originalPrice ? 'line-through' : 'none' }}
                    />
                  </div>

                  {/* Discount Price */}
                  <input
                    type="text"
                    placeholder="Giá sau giảm..."
                    value={sticker.discountPrice ? formatPriceDisplay(sticker.discountPrice) : ''}
                    onChange={(e) => handlePriceChange(sticker.id, 'discountPrice', e.target.value)}
                    className="w-full text-center text-[32px] font-black tracking-tighter bg-transparent border-none outline-none focus:bg-green-50 rounded px-1 leading-none"
                    style={{ fontFamily: '"Oswald", sans-serif' }}
                  />
                </div>

                {/* Bottom: promo label */}
                <div className="text-center text-[8px] font-bold uppercase tracking-tight text-slate-600 mt-auto">
                  {promoLabel}
                </div>

                {/* Bottom black bar */}
                <div className="absolute bottom-0 left-0 right-0 h-3 bg-black"></div>
              </div>

              {/* Quantity input bar */}
              <div className="flex items-center justify-center gap-1.5 mt-1.5 bg-slate-50 rounded-lg py-1 px-2 border border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase">SL:</span>
                <button
                  onClick={() => handleQuantityChange(sticker.id, -1)}
                  className="w-5 h-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center transition-colors"
                >
                  <Minus size={10} />
                </button>
                <input
                  type="text"
                  value={printQuantities[sticker.id] || 1}
                  onChange={(e) => handleQuantityInput(sticker.id, e.target.value)}
                  className="w-10 text-center text-xs font-black bg-white border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
                <button
                  onClick={() => handleQuantityChange(sticker.id, 1)}
                  className="w-5 h-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center transition-colors"
                >
                  <Plus size={10} />
                </button>
              </div>

              {/* Action buttons overlay */}
              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => duplicateSticker(sticker.id)}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md"
                  title="Nhân đôi"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => removeSticker(sticker.id)}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"
                  title="Xóa"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Index badge */}
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md z-10">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={handlePrint}
        disabled={validStickers.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-3xl text-base font-bold transition-colors shadow-sm"
      >
        <Printer size={20} />
        IN STICKER ({totalPrintCount} sticker)
      </button>

      {/* Print Preview Modal */}
      {isPrintPreviewOpen && (
        <StickerTemplatePrintModal
          stickers={expandedStickers}
          layout={printLayout}
          promoLabel={promoLabel}
          onClose={() => setIsPrintPreviewOpen(false)}
        />
      )}
    </div>
  );
}

// =====================
// PRINT MODAL COMPONENT
// =====================

function StickerTemplatePrintModal({
  stickers,
  layout,
  promoLabel,
  onClose
}: {
  stickers: StickerItem[];
  layout: '8' | '4';
  promoLabel: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const padding = 64;
        const isPortrait = layout === '8';
        const targetWidthPx = (isPortrait ? 210 : 297) * 3.78;
        if (availableWidth - padding < targetWidthPx) {
          setPreviewScale((availableWidth - padding) / targetWidthPx);
        } else {
          setPreviewScale(1);
        }
      }
    };
    setTimeout(updateScale, 10);
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [layout]);

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (price: string) => {
    const num = parseInt(price, 10);
    if (isNaN(num) || num === 0) return '0';
    return num.toLocaleString('vi-VN').replace(/,/g, '.');
  };

  // Get current time
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeString = `${day} - ${month} - ${year} | ${hours} : ${minutes}`;

  // Layout config
  const cols = layout === '8' ? 2 : 2;
  const rows = layout === '8' ? 4 : 2;
  const itemsPerPage = cols * rows;
  const orientation = layout === '8' ? 'portrait' : 'landscape';
  const scale = layout === '8' ? 0.68 : 0.94;
  const baseStickerWidth = 148.5; // mm
  const baseStickerHeight = 105; // mm

  const pages: StickerItem[][] = [];
  for (let i = 0; i < stickers.length; i += itemsPerPage) {
    pages.push(stickers.slice(i, i + itemsPerPage));
  }

  return createPortal(
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:static print:bg-white print:p-0 print:block">
      <style type="text/css">
        {`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap');`}
      </style>
      <style type="text/css" media="print">
        {`
          @page { 
            size: A4 ${orientation}; 
            margin: 0; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          * { box-sizing: border-box; }
          body > *:not(.print-modal-container) { display: none !important; }
          .print-modal-container { 
            display: block !important; 
            position: static !important; 
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-area { 
            zoom: 1 !important; 
            transform: none !important; 
            width: 100% !important;
            display: block !important;
            overflow: visible !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        `}
      </style>

      {/* Modal Controls */}
      <div className="absolute top-4 right-4 flex gap-2 print:hidden z-50">
        <button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors">
          <Printer size={20} /> In Ngay
        </button>
        <button onClick={onClose} className="bg-white hover:bg-slate-100 text-slate-800 p-2 rounded-xl shadow-lg transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Print Area */}
      <div ref={containerRef} className="bg-slate-100 rounded-2xl overflow-auto max-h-[90vh] w-full max-w-6xl p-8 print:p-0 print:m-0 print:max-h-none print:w-full print:bg-white print:overflow-visible">
        <div style={{ zoom: previewScale }} className="print-area flex flex-col items-center w-full">
          <div className="flex flex-col items-center gap-8 print:gap-0 print:block w-full">
            {pages.map((page, pageIndex) => (
              <div key={pageIndex} className="bg-white shadow-xl print:shadow-none grid page-break" style={{
                width: orientation === 'portrait' ? '210mm' : '297mm',
                height: orientation === 'portrait' ? '297mm' : '210mm',
                padding: '2mm',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                margin: '0 auto',
                boxSizing: 'border-box',
                gap: '0'
              }}>
                {page.map((item, index) => (
                  <div key={index} className="relative overflow-hidden border-dashed border-slate-100 print:border-none flex items-center justify-center min-w-0 min-h-0" style={{ borderWidth: '0.5px' }}>
                    <div style={{
                      width: `${baseStickerWidth * scale}mm`,
                      height: `${baseStickerHeight * scale}mm`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <div style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'center',
                        width: `${baseStickerWidth}mm`,
                        height: `${baseStickerHeight}mm`,
                        flexShrink: 0
                      }}>
                        {/* Actual Sticker */}
                        <div
                          className="w-[148.5mm] h-[105mm] bg-white border-[8px] border-black p-1.5 box-border relative text-black shrink-0 overflow-hidden"
                          style={{ fontFamily: '"Oswald", sans-serif' }}
                        >
                          <div className="w-full h-full border-[3px] border-black p-3 flex flex-col relative">
                            {/* Top Section - Name only, NO QR */}
                            <div className="flex justify-center items-start">
                              <div className="text-center pt-1">
                                <h1
                                  className="text-[28px] leading-[1.1] font-black uppercase tracking-tighter"
                                  style={{ fontFamily: '"Oswald", sans-serif', transform: 'scaleY(1.1)' }}
                                >
                                  {item.name || 'GIÁ RẺ'}
                                </h1>
                              </div>
                            </div>

                            {/* Middle Section - Prices */}
                            <div className="flex-1 flex flex-col items-center justify-center -mt-2">
                              {item.originalPrice && (
                                <div className="relative">
                                  <span
                                    className="text-[55px] font-black tracking-tighter"
                                    style={{ fontFamily: '"Oswald", sans-serif', transform: 'scaleY(1.1)', display: 'inline-block' }}
                                  >
                                    {formatPrice(item.originalPrice)}
                                  </span>
                                  <div className="absolute top-1/2 left-[-5%] right-[-5%] h-[4px] bg-black -translate-y-1/2"></div>
                                </div>
                              )}
                              <div
                                className="text-[120px] leading-[0.8] font-black tracking-tighter mt-2"
                                style={{ fontFamily: '"Oswald", sans-serif', transform: 'scaleY(1.1)', display: 'inline-block' }}
                              >
                                {formatPrice(item.discountPrice)}
                              </div>
                            </div>

                            {/* Bottom Section - Promo */}
                            <div className="text-center font-bold text-[16px] mb-6 tracking-tight uppercase">
                              {promoLabel}
                            </div>

                            {/* Bottom black bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-5 bg-black"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
