import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { X, Printer } from 'lucide-react';

interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  config?: { style: string; layout: string; showPromoLabel?: boolean };
}

export default function StickerPrintModal({ isOpen, onClose, data, config = { style: 'classic', layout: '4', showPromoLabel: true } }: StickerPrintModalProps) {
  const [previewScale, setPreviewScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isA5 = config.style === 'display' || config.style === 'giovang';
  const isA4Giasoc = config.style === 'a4_giasoc';

  useEffect(() => {
    if (!isOpen) return;
    
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const padding = 64;
        const isPortrait = config.layout === '2' || config.layout === '8' || isA5 || isA4Giasoc;
        const pageDimensions = isA5 
          ? { width: 148.5, height: 210 } // A5
          : { width: 210, height: 297 };  // A4
        
        const targetWidthPx = (isPortrait ? pageDimensions.width : pageDimensions.height) * 3.78;
        
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
  }, [isOpen, config.layout]);

  useEffect(() => {
    console.log('StickerPrintModal data:', data);
    console.log('StickerPrintModal config:', config);
  }, [data, isOpen, config]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getLayoutStyles = () => {
    if (config.style === 'display' || config.style === 'giovang' || config.style === 'a4_giasoc') {
      return { cols: 1, rows: 1, scale: 1, orientation: 'portrait' };
    }
    switch (config.layout) {
      case '1': return { cols: 1, rows: 1, scale: 1.98, orientation: 'landscape' };
      case '2': return { cols: 1, rows: 2, scale: 1.38, orientation: 'portrait' };
      case '4': return { cols: 2, rows: 2, scale: 0.98, orientation: 'landscape' };
      case '8': return { cols: 2, rows: 4, scale: 0.68, orientation: 'portrait' };
      default: return { cols: 2, rows: 2, scale: 0.98, orientation: 'landscape' };
    }
  };

  const layoutStyles = getLayoutStyles();

  const itemsPerPage = layoutStyles.cols * layoutStyles.rows;
  const pages = [];
  for (let i = 0; i < data.length; i += itemsPerPage) {
    pages.push(data.slice(i, i + itemsPerPage));
  }

  // Base sticker dimensions
  const baseStickerWidth = isA5 ? 148.5 : (isA4Giasoc ? 210 : 148.5); // mm
  const baseStickerHeight = isA5 ? 210 : (isA4Giasoc ? 297 : 105); // mm

  return createPortal(
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:static print:bg-white print:p-0 print:block">
      <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&amp;display=swap');
      </style>
      <style type="text/css" media="print">
        {`
          @page { 
            size: ${isA5 ? 'A5' : 'A4'} ${layoutStyles.orientation}; 
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
          /* Hide everything else when printing */
          body > *:not(.print-modal-container) { display: none !important; }
          .print-modal-container { 
            display: block !important; 
            position: static !important; 
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Reset zoom for printing */
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
      
      {/* Modal Controls - Hidden when printing */}
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
          {data.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-12 print:hidden w-full">
              Không có dữ liệu để in. Vui lòng tải file dữ liệu.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 print:gap-0 print:block w-full">
              {pages.map((page, pageIndex) => (
                <div key={pageIndex} className="bg-white shadow-xl print:shadow-none grid page-break" style={{ 
                  width: isA5 
                    ? (layoutStyles.orientation === 'portrait' ? '148.5mm' : '210mm') 
                    : (layoutStyles.orientation === 'portrait' ? '210mm' : '297mm'),
                  height: isA5 
                    ? (layoutStyles.orientation === 'portrait' ? '210mm' : '148.5mm') 
                    : (layoutStyles.orientation === 'portrait' ? '297mm' : '210mm'),
                  padding: (isA5 || isA4Giasoc) ? '0' : '2mm',
                  gridTemplateColumns: `repeat(${layoutStyles.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${layoutStyles.rows}, 1fr)`,
                  margin: '0 auto',
                  boxSizing: 'border-box',
                  gap: '0'
                }}>
                  {page.map((item, index) => (
                    <div key={index} className="relative overflow-hidden border-dashed border-slate-100 print:border-none flex items-center justify-center" style={{ 
                      borderWidth: '0.5px',
                      width: '100%',
                      height: '100%'
                    }}>
                      <div style={{ 
                        width: `${baseStickerWidth * layoutStyles.scale}mm`,
                        height: `${baseStickerHeight * layoutStyles.scale}mm`,
                        position: 'relative'
                      }}>
                        <div style={{ 
                          transform: `scale(${layoutStyles.scale})`, 
                          transformOrigin: 'top left', 
                          width: `${baseStickerWidth}mm`, 
                          height: `${baseStickerHeight}mm`, 
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}>
                          <Sticker item={item} style={config.style} showPromoLabel={config.showPromoLabel} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Sticker({ item, style, showPromoLabel = true }: { item: any, style: string, showPromoLabel?: boolean }) {
  // Get current time for the sticker
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeString = `${day} - ${month} - ${year} | ${hours} : ${minutes}`;

  // Format price to match image (e.g., 8.260 instead of 8,260)
  const formatPrice = (price: any) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '0';
    return num.toLocaleString('vi-VN').replace(/,/g, '.');
  };

  if (style === 'a4_giasoc') {
    const discountPercent = item.originalPrice > 0 
      ? Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100) 
      : 0;
      
    const priceStr = formatPrice(item.discountPrice);
    const priceParts = priceStr.split('.');
    const mainPrice = priceParts.slice(0, -1).join('.');
    const lastPart = priceParts[priceParts.length - 1];
    
    // Extract category heuristically or use default
    const categoryName = item.name ? item.name.split(' ').slice(0, 3).join(' ') : 'SẢN PHẨM KHUYẾN MÃI';

    return (
      <div className="w-[210mm] h-[297mm] bg-white p-[5mm] box-border shrink-0 overflow-hidden flex flex-col items-center">
        <div className="w-full h-full bg-white border-[4px] border-black flex flex-col relative text-black" style={{ fontFamily: '"Oswald", sans-serif' }}>
          
          {/* Top category label */}
          <div className="mt-12 flex justify-center w-full px-8">
            <div className="bg-black text-white px-12 py-3 rounded-sm shadow-sm inline-block">
              <span className="text-[52px] font-black uppercase tracking-widest leading-none">{categoryName}</span>
            </div>
          </div>

          {/* GIÁ SỐC */}
          <div className="text-center mt-10">
            <div className="text-[130px] uppercase leading-none tracking-tighter font-black" style={{ transform: 'scaleY(1.1)', transformOrigin: 'top center' }}>
              GIÁ SỐC
            </div>
          </div>

          {/* Discount Percentage */}
          {discountPercent > 0 && (
            <div className="text-center mt-8">
              <div className="text-[250px] leading-none tracking-tighter text-black font-black" style={{ transform: 'scaleY(1.1)', transformOrigin: 'top center' }}>
                -{discountPercent}%
              </div>
            </div>
          )}

          {/* Product Name */}
          <div className="w-full px-12 mt-16 mb-6">
            <div className="h-[2px] bg-black opacity-80 mb-6"></div>
            <div className="text-[32px] font-black text-center line-clamp-2 leading-tight uppercase tracking-tighter" style={{ transform: 'scaleY(1.1)' }}>
              {item.name || 'TÊN SẢN PHẨM'}
            </div>
            <div className="h-[2px] bg-black opacity-80 mt-6"></div>
          </div>

          {/* Prices */}
          <div className="flex-1 flex flex-col items-center pt-2">
            {/* Original Price */}
            <div className="relative inline-block text-[56px] font-black tracking-tighter text-black opacity-80 mb-2" style={{ transform: 'scaleY(1.1)' }}>
              {formatPrice(item.originalPrice)}
              <div className="absolute top-[50%] left-[-10%] right-[-10%] h-[6px] bg-black -translate-y-1/2"></div>
            </div>

            {/* Final Price */}
            <div className="flex items-baseline font-black justify-center w-full" style={{ transform: 'scaleY(1.1)' }}>
              <span className="text-[160px] leading-none tracking-tighter">{mainPrice}</span>
              <span className="text-[60px] ml-1 tracking-tighter">.{lastPart}Đ</span>
            </div>
          </div>

          {/* Footer Text */}
          <div className="text-center pb-8 pt-4 w-full">
            <div 
              className="text-[20px] font-bold italic tracking-wide outline-none focus:ring-2 focus:ring-indigo-500/50 rounded inline-block px-4 py-1"
              contentEditable={true}
              suppressContentEditableWarning={true}
            >
              {timeString ? `Khuyến mãi áp dụng đến hết ngày ${timeString.split(' | ')[0].replace(/\//g, ' - ')}` : 'Khuyến mãi áp dụng đến khi hết hàng'}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (style === 'giovang') {
    const discountPercent = item.originalPrice > 0 
      ? Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100) 
      : 0;
      
    const priceStr = formatPrice(item.discountPrice);
    const priceParts = priceStr.split('.');
    const mainPrice = priceParts.slice(0, -1).join('.');
    const lastPart = priceParts[priceParts.length - 1];

    return (
      <div className="w-[148.5mm] h-[210mm] bg-white p-[5mm] box-border shrink-0 overflow-hidden">
        <div className="w-full h-full bg-white pt-4 px-8 pb-8 box-border relative text-black flex flex-col items-center border-[5px] border-black" style={{ fontFamily: '"UTM Avo", "Avo", "Arial Black", sans-serif' }}>
          {/* 1. Tiêu đề GIỜ VÀNG GIÁ SỐC */}
          <div className="w-full bg-black py-3 flex items-center justify-center mb-4">
            <div className="text-[32px] font-black text-white tracking-[0.05em] uppercase">
              GIỜ VÀNG GIÁ SỐC
            </div>
          </div>

          {/* 2. % GIẢM */}
          <div className="flex-1 flex items-center justify-center">
            {discountPercent > 0 && (
              <div className="text-[156px] font-black leading-none text-black tracking-tighter">
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* 3. TÊN + MÃ SẢN PHẨM */}
          <div className="w-full border-t-[3px] border-b-[3px] border-black py-2 mb-2 flex flex-col items-center justify-center text-center">
            <div className="text-[20px] font-medium uppercase line-clamp-2 leading-[1.2] px-4">
              {item.name || 'TÊN SẢN PHẨM'}
            </div>
            <div className="text-[14px] font-bold mt-1 tracking-widest opacity-90">
              {item.maSanPham || item.productCode || '-'}
            </div>
          </div>

          {/* Thêm dòng khung giờ */}
          <div className="text-[16px] font-bold uppercase mb-4 tracking-wider text-center px-4">
            ÁP DỤNG THEO KHUNG GIỜ 9H-12H & 14H - 20H ={'>'} 3 NGÀY T6,T7,CN
          </div>

          {/* 4 & 5. GIÁ GỐC VÀ GIÁ GIẢM */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* 4. GIÁ GỐC (GẠCH) */}
            <div className="relative inline-block text-[38px] font-bold text-slate-500 mb-2">
              {formatPrice(item.originalPrice)}
              <div className="absolute top-[55%] left-[-10%] right-[-10%] h-[3px] bg-black"></div>
            </div>

            {/* 5. GIÁ GIẢM (Giảm size để vừa trang A5 với các giá trị lớn như 10.990.000) */}
            <div className="flex items-baseline font-black">
              <span className="text-[100px] leading-none tracking-tighter">{mainPrice}</span>
              <span className="text-[40px] ml-1">.{lastPart}Đ</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'display') {
    const discountPercent = item.originalPrice > 0 
      ? Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100) 
      : 0;
    
    const priceStr = formatPrice(item.discountPrice);
    // Split price to make the last 3 digits smaller like in the image (e.g. 8.720.000D -> 8.720 and .000D)
    const priceParts = priceStr.split('.');
    const mainPrice = priceParts.slice(0, -1).join('.');
    const lastPart = priceParts[priceParts.length - 1];

    return (
      <div className="w-[148.5mm] h-[210mm] bg-white p-8 box-border relative text-black shrink-0 overflow-hidden flex flex-col items-center border-[2px] border-black" style={{ fontFamily: '"Arial", sans-serif' }}>
        {/* Top Header Label */}
        <div className="bg-black text-white px-10 py-3 mt-6 mb-6">
          <div className="text-[36px] font-black uppercase tracking-widest">HÀNG TRƯNG BÀY</div>
        </div>

        {/* Shock Price Label */}
        <div className="text-[72px] font-black uppercase leading-none tracking-tighter mb-6">
          GIÁ SỐC
        </div>

        {/* Discount Percent */}
        <div className="text-[160px] font-black leading-none mb-8 flex items-center">
          <span className="tracking-tighter">-{discountPercent}%</span>
        </div>

        {/* Product Name/Code Divider Area */}
        <div className="w-full border-t-[3px] border-b-[3px] border-black py-4 mb-8 flex flex-col items-center justify-center">
            <div className="text-[20px] font-bold uppercase truncate max-w-full px-4 text-center">
              {item.name || 'Tên sản phẩm'}
            </div>
            <div className="text-[16px] font-medium opacity-70 mt-1">
              {item.maSanPham || item.productCode || '-'}
            </div>
        </div>

        {/* Prices Area */}
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {/* Strikethrough Price */}
          <div className="relative inline-block text-[42px] font-medium leading-none mb-6 text-slate-600">
            {formatPrice(item.originalPrice)}
            <div className="absolute top-1/2 left-[-10%] right-[-10%] h-[4px] bg-slate-600 -translate-y-1/2"></div>
          </div>

          {/* Final Price */}
          <div className="flex items-baseline font-black leading-none text-black">
            <span className="text-[120px] tracking-tighter">{mainPrice}</span>
            <span className="text-[50px] ml-1">.{lastPart}Đ</span>
          </div>
        </div>

        {/* Bottom Time Info */}
        <div className="absolute bottom-2 right-4 text-[12px] font-medium opacity-50">
          {timeString}
        </div>
      </div>
    );
  }

  if (style === 'modern') {
    // Kiểu giá quạt: yellow background, big price, product name at top
    const priceStr = formatPrice(item.discountPrice);
    const mainPrice = priceStr.split('.')[0];
    const subPrice = priceStr.split('.').slice(1).join('.');

    return (
      <div className="w-[148.5mm] h-[105mm] bg-white p-4 box-border relative text-black shrink-0 overflow-hidden flex flex-col justify-between border-[2px] border-black font-bold" style={{ fontFamily: '"Times New Roman", serif' }}>
        <div className="text-center">
          <div className="text-[32px] font-bold leading-tight">{item.name || 'Tên sản phẩm'}</div>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="text-[24px] font-medium">{item.maSanPham || item.productCode || '-'}</div>
            <QRCode value={item.maSanPham || item.productCode || '00000'} size={40} level="L" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center -my-4">
          <div className="flex items-baseline">
            <span className="text-[220px] font-black leading-none">{mainPrice}</span>
            {subPrice && <span className="text-[60px] font-black leading-none">.{subPrice}</span>}
            <span className="text-[40px] font-bold ml-1">đ</span>
          </div>
        </div>
        <div className="text-center text-[24px] font-medium uppercase">
          SẢN PHẨM GIÁ RẺ
        </div>
        <div className="absolute bottom-1 right-2 text-[10px] font-normal opacity-70">
          {timeString}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[148.5mm] h-[105mm] bg-white border-[8px] border-black p-1.5 box-border relative text-black shrink-0 overflow-hidden" style={{ fontFamily: '"Oswald", sans-serif' }}>
      <div className="w-full h-full border-[3px] border-black p-3 flex flex-col relative">
        {/* Top Section */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 text-center pt-1">
            <h1 className="text-[28px] leading-[1.1] font-black uppercase tracking-tighter" style={{ fontFamily: '"Oswald", sans-serif', transform: 'scaleY(1.1)' }}>
              {item.name || 'Tên sản phẩm'}
            </h1>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <QRCode value={item.maSanPham || item.productCode || '00000'} size={56} level="L" />
            <div className="text-[10px] font-bold mt-1 text-right leading-tight tracking-tight">
              {item.maSanPham || item.productCode}<br/>
              {timeString}
            </div>
          </div>
        </div>

        {/* Middle Section - Prices */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-2">
          <div className="relative">
            <span className="text-[55px] font-black tracking-tighter" style={{ fontFamily: '"Oswald", sans-serif', transform: 'scaleY(1.1)', display: 'inline-block' }}>
              {formatPrice(item.originalPrice)}
            </span>
            {/* Custom strikethrough line to match image (thick line) */}
            <div className="absolute top-1/2 left-[-5%] right-[-5%] h-[4px] bg-black -translate-y-1/2"></div>
          </div>
          <div className="text-[120px] leading-[0.8] font-black tracking-tighter mt-2" style={{ fontFamily: '"Oswald", sans-serif', transform: 'scaleY(1.1)', display: 'inline-block' }}>
            {formatPrice(item.discountPrice)}
          </div>
        </div>

        {/* Bottom Section - Promos */}
        {showPromoLabel && (
          <div className="text-center font-bold text-[16px] mb-6 tracking-tight uppercase">
            sản phẩm giá sốc - event T7 & CN
          </div>
        )}

        {/* Thick Black Bar at the bottom inside inner border */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-black"></div>
      </div>
    </div>
  );
}
