import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { X, Printer } from 'lucide-react';

interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  config?: { style: string; layout: string; showPromoLabel?: boolean };
  mlnHeaderTemplate?: string;
  mlnFooterTemplate?: string;
  promoLabelText?: string;
}

export default function StickerPrintModal({ isOpen, onClose, data, config = { style: 'classic', layout: '4', showPromoLabel: true }, mlnHeaderTemplate = '', mlnFooterTemplate = '', promoLabelText = 'sản phẩm giá sốc - event T7 & CN' }: StickerPrintModalProps) {
  const [previewScale, setPreviewScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isA5 = ((config.style === 'display' || config.style === 'giovang') && config.layout === '1') || ((config.style === 'sticker_ce' || config.style === 'sticker_lk') && config.layout === '1') || (config.style === 'phieu_bh' && config.layout === 'right');
  const isA4Giasoc = config.style === 'a4_giasoc';
  const isPhieuBH = config.style === 'phieu_bh';

  useEffect(() => {
    if (!isOpen) return;
    
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const padding = 64;
        const isPortrait = (config.layout === '2' && !isPhieuBH) || config.layout === '8' || config.style === 'display' || config.style === 'giovang' || isA4Giasoc || config.style === 'address_flyer' || (isPhieuBH && config.layout !== 'right' && config.layout !== '2');
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
    if (config.style === 'phieu_bh') {
      if (config.layout === '1') {
        return { cols: 1, rows: 1, scale: 1.8, orientation: 'portrait' };
      }
      if (config.layout === '2') {
        return { cols: 2, rows: 1, scale: 1.35, orientation: 'landscape' };
      }
      if (config.layout === '4') {
        return { cols: 2, rows: 2, scale: 0.92, orientation: 'portrait' };
      }
      if (config.layout === 'right') {
        return { cols: 2, rows: 1, scale: 0.95, orientation: 'landscape' };
      }
      return { cols: 2, rows: 2, scale: 0.92, orientation: 'portrait' };
    }
    if (config.style === 'address_flyer') {
      return { cols: 3, rows: 2, scale: 1, orientation: 'portrait' };
    }
    if (config.style === 'dcnb') {
      return { cols: 3, rows: 8, scale: 1, orientation: 'portrait' };
    }
    if (config.style === 'display' || config.style === 'giovang' || config.style === 'a4_giasoc') {
      return { cols: 1, rows: 1, scale: 1, orientation: 'portrait' };
    }
    if (config.style === 'sticker_ce' || config.style === 'sticker_lk') {
      if (config.layout === '2') {
        return { cols: 1, rows: 2, scale: 1, orientation: 'portrait' };
      }
      return { cols: 1, rows: 1, scale: 1, orientation: 'landscape' };
    }
    switch (config.layout) {
      case '1': return { cols: 1, rows: 1, scale: 1.96, orientation: 'landscape' };
      case '2': return { cols: 1, rows: 2, scale: 1.38, orientation: 'portrait' };
      case '4': return { cols: 2, rows: 2, scale: 0.94, orientation: 'landscape' };
      case '8': return { cols: 2, rows: 4, scale: 0.68, orientation: 'portrait' };
      default: return { cols: 2, rows: 2, scale: 0.94, orientation: 'landscape' };
    }
  };

  const layoutStyles = getLayoutStyles();

  const itemsPerPage = layoutStyles.cols * layoutStyles.rows;
  const pages = [];
  for (let i = 0; i < data.length; i += itemsPerPage) {
    pages.push(data.slice(i, i + itemsPerPage));
  }

  // Base sticker dimensions
  const isCeA6 = false;
  const isAddressFlyer = config.style === 'address_flyer';
  const isDcnb = config.style === 'dcnb';
  const isDisplayA4 = config.style === 'display' && config.layout === '2';
  const baseStickerWidth = isDcnb ? 66 : (isAddressFlyer ? 66 : (isPhieuBH ? (config.layout === 'right' ? 98 : 105) : (isCeA6 ? 148.5 : (config.style === 'sticker_ce' || config.style === 'sticker_lk' || isDisplayA4 ? 210 : (isA5 ? 148.5 : (isA4Giasoc ? 210 : 148.5)))))); // mm
  const baseStickerHeight = isDcnb ? 35 : (isAddressFlyer ? 142 : (isPhieuBH ? (config.layout === 'right' ? 132 : 148.5) : (isCeA6 ? 105 : (config.style === 'sticker_ce' || config.style === 'sticker_lk' ? 148.5 : (isA5 ? 210 : (isA4Giasoc || isDisplayA4 ? 297 : 105)))))); // mm

  return createPortal(
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:static print:bg-white print:p-0 print:block">
      <style type="text/css">
        {`
          @import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:ital,wght@0,500;0,700;0,800;1,500;1,700;1,800&family=Oswald:wght@400;500;700;900&display=swap');
          
          /* Override global nowrap !important in index.css for cells inside printing components */
          .print-area td, 
          .print-modal-container td {
            white-space: normal !important;
            word-break: break-word !important;
          }
        `}
      </style>
      <style type="text/css" media="print">
        {`
          @page { 
            size: ${isA5 ? 'A5' : 'A4'} ${layoutStyles.orientation}; 
            margin: 0; 
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          * { box-sizing: border-box; }
          /* Hide everything else when printing */
          body > *:not(.print-modal-container) { display: none !important; }
          #root { display: none !important; }
          .print-modal-container { 
            display: block !important; 
            position: absolute !important; 
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
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
            page-break-before: avoid;
            break-before: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .page-break:not(:last-child) {
            page-break-after: always;
            break-after: page;
          }
          
          /* Remove borders of grid cells when printing to prevent height calculations from overflowing */
          .page-break > div {
            border: none !important;
            border-width: 0 !important;
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
                    ? (layoutStyles.orientation === 'portrait' ? '147.5mm' : '209mm') 
                    : (layoutStyles.orientation === 'portrait' ? '210mm' : '297mm'),
                  height: isA5 
                    ? (layoutStyles.orientation === 'portrait' ? '209mm' : '147.5mm') 
                    : (layoutStyles.orientation === 'portrait' ? '297mm' : '210mm'),
                  padding: (config.style === 'address_flyer' || config.style === 'dcnb') ? '5mm' : ((isA5 || isA4Giasoc || isDisplayA4) ? '0' : '2mm'),
                  gridTemplateColumns: `repeat(${layoutStyles.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${layoutStyles.rows}, 1fr)`,
                  margin: '0 auto',
                  boxSizing: 'border-box',
                  gap: config.style === 'dcnb' ? '1mm' : '0'
                }}>
                  {page.map((item, index) => (
                    <div key={index} className="relative overflow-hidden border-dashed border-slate-100 print:border-none flex items-center justify-center min-w-0 min-h-0" style={{ borderWidth: '0.5px' }}>
                      <div style={{
                        width: `${baseStickerWidth * layoutStyles.scale}mm`,
                        height: `${baseStickerHeight * layoutStyles.scale}mm`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <div style={{ 
                          transform: `scale(${layoutStyles.scale})`, 
                          transformOrigin: 'center', 
                          width: `${baseStickerWidth}mm`, 
                          height: `${baseStickerHeight}mm`, 
                          flexShrink: 0 
                        }}>
                          {item ? (
                             <Sticker item={item} style={config.style} layout={config.layout} showPromoLabel={config.showPromoLabel} mlnHeaderTemplate={mlnHeaderTemplate} mlnFooterTemplate={mlnFooterTemplate} promoLabelText={promoLabelText} />
                          ) : null}
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

export function DcnbCard() {
  return (
    <div 
      className="w-full h-full bg-white border-[3pt] border-black shrink-0 box-border"
    />
  );
}

export function Sticker({ item, style, layout, showPromoLabel = true, mlnHeaderTemplate = '', mlnFooterTemplate = '', promoLabelText = 'sản phẩm giá sốc - event T7 & CN' }: { item: any, style: string, layout: string, showPromoLabel?: boolean, mlnHeaderTemplate?: string, mlnFooterTemplate?: string, promoLabelText?: string }) {
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
    if (price === null || price === undefined) return '';
    const num = Math.round(Number(price));
    return num.toLocaleString('vi-VN').replace(/,/g, '.');
  };

  const renderBoldText = (text: string) => {
    if (!text) return '';
    const regex = /\*\*(.*?)\*\*/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      const isBold = regex.test(part);
      return isBold ? <strong key={index} className="font-extrabold">{part}</strong> : <span key={index}>{part}</span>;
    });
  };

  const renderLineWithBold = (text: string) => {
    if (!text) return '';
    const regex = /(\(HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI\)|Không lỗi|Lỗi|TRỪ \d+%|THÊM \d+%|1900\.23\.24\.65|Tổng đài bảo hành: 1900\.23\.24\.65)/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      const isBold = regex.test(part);
      return isBold ? <strong key={index} className="font-extrabold">{part}</strong> : <span key={index}>{part}</span>;
    });
  };

  if (style === 'dcnb') {
    return (
      <DcnbCard />
    );
  }

  if (style === 'phieu_bh') {
    const isRightLayout = layout === 'right';
    const w = isRightLayout ? '98mm' : '105mm';
    const h = isRightLayout ? '132mm' : '148.5mm';
    return (
      <div 
        className="bg-white flex flex-col p-2 box-border text-black select-none border border-slate-300"
        style={{
          width: w,
          height: h,
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: '1.5px solid black', tableLayout: 'fixed', whiteSpace: 'normal', wordBreak: 'break-word' }}>
          <tbody>
            {/* Row 1 */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ width: '10%', borderRight: '1px solid black', background: 'black', color: 'white', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>1</td>
              <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div>Tên siêu thị:<span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '120px', textAlign: 'center' }}>{item.tenSieuThi || '                    '}</span></div>
                <div style={{ marginTop: '1px' }}>Sản phẩm bảo hành:<span style={{ fontWeight: item.sanPhamBh ? 'bold' : 'bold', textDecoration: item.sanPhamBh ? 'none' : 'none', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '40px', textAlign: 'center' }}>{item.sanPhamBh || '     '}</span> tháng/năm</div>
                <div style={{ marginTop: '1px', paddingLeft: '12px' }}>BH Phụ kiện (nếu có):<span style={{ fontWeight: item.remoteBh ? 'bold' : 'bold', textDecoration: item.remoteBh ? 'none' : 'none', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '30px', textAlign: 'center' }}>{item.remoteBh || '    '}</span> tháng</div>
              </td>
            </tr>
            {/* Row 2 */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>2</td>
              <td style={{ padding: '4px 6px', fontSize: '13px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div style={{ marginBottom: '1px' }}>{renderLineWithBold(item.row2Line1)}</div>
                <div style={{ marginBottom: '1px' }}>{renderLineWithBold(item.row2Line2)}</div>
                <div style={{ marginBottom: '1px' }}>{renderLineWithBold(item.row2Line3)}</div>
                <div style={{ paddingLeft: '12px', marginBottom: '1px' }}>{renderLineWithBold(item.row2Line4)}</div>
                <div style={{ paddingLeft: '12px' }}>{renderLineWithBold(item.row2Line5)}</div>
              </td>
            </tr>
            {/* Row 3 */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>3</td>
              <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div>Giao trước <span style={{ fontWeight: item.giaoTruocNgay ? 'bold' : 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '30px', textAlign: 'center' }}>{item.giaoTruocNgay || '    '}</span> ngày <span style={{ fontWeight: item.giaoTruocText ? 'bold' : 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '120px', textAlign: 'center' }}>{item.giaoTruocText || '                    '}</span></div>
              </td>
            </tr>
            {/* Row 4 */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>4</td>
              <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div>{item.row4Text}</div>
              </td>
            </tr>
            {/* Row 5 */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>5</td>
              <td style={{ padding: '4px 6px', fontSize: '13px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div>{item.row5Text}</div>
              </td>
            </tr>
            {/* Row 6 */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>6</td>
              <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div style={{ marginBottom: '1px' }}>{renderLineWithBold(item.row6Line1)}</div>
                <div>- Hỗ trợ và mua hàng: <span style={{ fontWeight: item.hoTroMuaHang ? 'bold' : 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '120px', textAlign: 'center' }}>{item.hoTroMuaHang || '                    '}</span></div>
              </td>
            </tr>
            {/* Row 7 */}
            <tr>
              <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>7</td>
              <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div>{item.row7Text}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (style === 'address_flyer') {
    const renderTimeLocation = (text: string) => {
      if (!text) return '';
      const dateRegex = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g;
      const parts = text.split(dateRegex);
      return parts.map((part, idx) => {
        if (dateRegex.test(part)) {
          return <span key={idx} className="font-black" style={{ fontSize: '24px', color: 'black', margin: '0 4px', display: 'inline-block' }}>{part}</span>;
        }
        return <span key={idx}>{part}</span>;
      });
    };

    const renderDuration = (text: string) => {
      if (!text) return '';
      const match = text.match(/^(.*?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/i);
      if (match) {
        return (
          <div className="flex flex-col items-center leading-none mt-1">
            <span className="font-black tracking-wide uppercase" style={{ fontSize: '15px' }}>{match[1]}</span>
            <span className="font-black tracking-tight leading-none mt-1" style={{ fontSize: '26px', color: 'black' }}>{match[2]}</span>
          </div>
        );
      }
      return <span className="font-black tracking-wide uppercase" style={{ fontSize: '15px' }}>{text}</span>;
    };

    return (
      <div 
        className="w-[66mm] h-[142mm] bg-white flex flex-col justify-between p-3 box-border text-black select-none"
        style={{
          border: '1.5px solid black',
          fontFamily: '"Oswald", sans-serif'
        }}
      >
        {/* Header */}
        <div className="text-center shrink-0">
          <div className="font-black tracking-wide leading-tight uppercase" style={{ fontSize: '22px' }}>
            {item.headerTitle || 'ĐIỆN MÁY XANH PHƯỜNG 8'}
          </div>
          <div className="font-medium tracking-tight leading-tight text-slate-800" style={{ fontSize: '13px' }}>
            {item.headerSubtitle || '(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)'}
          </div>
        </div>

        {/* Divider */}
        <div className="bg-black w-full my-0.5 shrink-0" style={{ height: '2px' }}></div>

        {/* Middle Content */}
        <div className="flex-1 flex flex-col justify-between py-1 min-h-0 text-center overflow-hidden">
          {/* Invitation Title */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="font-black tracking-tight uppercase leading-none" style={{ fontSize: '22px' }}>
              {item.invitationTitle || 'THƯ MỜI, THỨ 7 TUẦN NÀY'}
            </div>
            {/* Ornament */}
            <div className="leading-none text-slate-700 my-0.5" style={{ fontSize: '8px' }}>⚭ ⚭ ⚭</div>
            <div className="font-bold text-slate-800 leading-none" style={{ fontSize: '13px' }}>
              {item.invitationTarget || 'Kính mời: Quý Khách Hàng thân yêu'}
            </div>
          </div>

          {/* Time & Location */}
          <div className="font-bold tracking-tight uppercase leading-snug shrink-0" style={{ fontSize: '13px' }}>
            <div>{renderTimeLocation(item.eventTimeLocation || 'Ngày 28/03 đến ĐMX PHƯỜNG 8')}</div>
            <div className="text-slate-800 font-medium my-0.5" style={{ fontSize: '11px', textTransform: 'none' }}>
              {item.eventDescription || 'tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN'}
            </div>
          </div>

          {/* Huge Discount */}
          <div className="font-black text-black leading-none tracking-tighter shrink-0" style={{ fontSize: '72px' }}>
            {item.discountPercentage || '50%'}
          </div>

          {/* Duration */}
          <div className="shrink-0 leading-none">
            {renderDuration(item.duration || '1 NGÀY DUY NHẤT 28/03')}
          </div>

          {/* Categories */}
          <div className="font-bold tracking-wide uppercase leading-tight text-slate-800 shrink-0" style={{ fontSize: '10.5px' }}>
            <div>{item.categoriesLine1 || 'ĐIỆN THOẠI & LAPTOP'}</div>
            <div>{item.categoriesLine2 || 'TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC'}</div>
            <div>{item.categoriesLine3 || 'MÁY LẠNH – QUẠT ĐIỀU HÒA'}</div>
          </div>

          {/* Special Offer */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="font-black text-black leading-tight uppercase tracking-tight" style={{ fontSize: '13px' }}>
              {item.specialOffer || '➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%'}
            </div>
            <div className="font-black text-slate-800 leading-none uppercase mt-0.5" style={{ fontSize: '10px' }}>
              {item.paymentTerm || 'MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="bg-black w-full my-0.5 shrink-0" style={{ height: '2px' }}></div>

        {/* Footer */}
        <div className="text-center shrink-0">
          <div className="font-black tracking-wide leading-tight uppercase" style={{ fontSize: '13px' }}>
            {item.footerTitle || 'ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU'}
          </div>
          <div className="font-bold tracking-tight leading-tight uppercase mt-0.5" style={{ fontSize: '10px' }}>
            {item.footerLine1 || 'CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU'}
          </div>
          <div className="font-bold tracking-tight leading-tight uppercase" style={{ fontSize: '10px' }}>
            {item.footerLine2 || 'BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN'}
          </div>
          <div className="font-bold tracking-tight leading-tight uppercase flex items-center justify-center gap-0.5" style={{ fontSize: '10px' }}>
            <span>{item.footerLine3 || 'NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI'}</span>
            <span>⬇</span>
          </div>
          <div className="font-medium tracking-tight leading-tight text-slate-800 italic mt-0.5" style={{ fontSize: '10px' }}>
            {item.footerLine4 || 'Được giảm thêm 10%'}
          </div>
        </div>
      </div>
    );
  }

  if (style === 'sticker_ce' || style === 'sticker_lk') {
    const isA6 = false;
    const priceStr = formatPrice(item.discountPrice);
    const priceParts = priceStr.split('.');
    const mainPrice = priceParts.slice(0, -1).join('.');
    const lastPart = priceParts[priceParts.length - 1];

    return (
      <div className={`box-border shrink-0 overflow-hidden ${isA6 ? 'w-[148.5mm] h-[105mm] p-[3mm]' : 'w-[210mm] h-[148.5mm] p-[7mm]'}`}>
        <div className={`w-full h-full bg-white box-border flex flex-col justify-between border-black ${isA6 ? 'border-[4px] p-[1mm]' : 'border-[6px] p-[2mm]'}`}>
          <div 
            className="w-full h-full bg-white border-black box-border relative text-black flex flex-col justify-between" 
            style={{ 
              fontFamily: '"Oswald", sans-serif',
              borderStyle: 'solid',
              borderWidth: isA6 ? '2px' : '3px',
              padding: isA6 ? '12px' : '24px'
            }}
          >
            {/* Top Section: Above the horizontal line */}
            <div className="flex items-center justify-between px-1 py-1 shrink-0 w-full">
              {/* Invisible spacer for perfect symmetry */}
              <div className="opacity-0 shrink-0" style={{ width: isA6 ? '32px' : '58px', height: isA6 ? '32px' : '58px' }}></div>
              
              {/* Centered Title */}
              <div 
                className="font-black uppercase tracking-[0.08em] leading-none text-center flex-1" 
                style={{ 
                  fontWeight: 900, 
                  WebkitTextStroke: isA6 ? '1px black' : '2px black',
                  fontSize: isA6 ? '38px' : '58px',
                  fontFamily: '"UTM Colossalis", sans-serif'
                }}
              >
                KHUYẾN MÃI GIÁ SỐC
              </div>

              {/* QR Code on the right */}
              <div className="shrink-0 flex items-center justify-center p-0.5 bg-white border border-black">
                <QRCode value={item.qrData || item.maSanPham || item.productCode || '00000'} size={isA6 ? 32 : 48} level="L" />
              </div>
            </div>

            {/* Horizontal Divider Line */}
            <div className="bg-black w-full shrink-0" style={{ height: isA6 ? '2px' : '3px' }}></div>

            {/* Middle Section: Centered layout */}
            <div className="flex-1 flex flex-col justify-around py-1 min-h-0 text-center">
              {/* Product Info */}
              <div className="flex flex-col items-center justify-center">
                <div 
                  className="font-black uppercase tracking-wide truncate whitespace-nowrap max-w-[95%] leading-tight" 
                  style={{ 
                    fontWeight: 900,
                    fontSize: isA6 ? '22px' : '32px'
                  }}
                >
                  {item.name || 'TÊN SẢN PHẨM'}
                </div>
              </div>

              {/* Prices */}
              <div className="flex flex-col items-center justify-center">
                {/* Original Price (Strikethrough) */}
                <div 
                  className="relative font-bold text-black mb-0.5 leading-none"
                  style={{ fontSize: isA6 ? '24px' : '36px' }}
                >
                  {formatPrice(item.originalPrice)}đ
                  <div className="absolute top-[55%] left-[-5%] right-[-5%] bg-black -translate-y-1/2" style={{ height: isA6 ? '2px' : '3px' }}></div>
                </div>

                {/* Discount price */}
                <div 
                  className="flex items-baseline font-black text-black leading-none" 
                  style={{ 
                    fontWeight: 900,
                    fontFamily: '"UTM Colossalis", sans-serif'
                  }}
                >
                  <span className="tracking-tighter leading-none" style={{ fontSize: isA6 ? '104px' : '156px' }}>{mainPrice}</span>
                  <span className="ml-0.5 leading-none" style={{ fontSize: isA6 ? '38px' : '58px' }}>.{lastPart}Đ</span>
                </div>
              </div>
            </div>

            {/* Footer Section: Date & Info */}
            <div 
              className="border-t-2 border-black flex justify-between items-center font-bold text-black shrink-0"
              style={{ 
                paddingTop: isA6 ? '6px' : '12px',
                fontSize: isA6 ? '10px' : '13px'
              }}
            >
              <div>ĐIỆN MÁY XANH</div>
              <div className="italic font-medium">In lúc: {timeString}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'a4_giasoc') {
    const discountPercent = item.originalPrice > 0 
      ? Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100) 
      : 0;
      
    const priceStr = formatPrice(item.discountPrice);
    const priceParts = priceStr.split('.');
    const mainPrice = priceParts.slice(0, -1).join('.');
    const lastPart = priceParts[priceParts.length - 1];
    
    // Auto-scale font size based on mainPrice length to prevent overflow
    const mainPriceLen = mainPrice.length;
    const mainPriceFontSize = mainPriceLen <= 5 ? 240 : mainPriceLen <= 6 ? 190 : mainPriceLen <= 7 ? 150 : 120;
    const categoryName = item.nganhHang || (item.name ? item.name.split(' ').slice(0, 3).join(' ') : 'SẢN PHẨM KHUYẾN MÃI');

    return (
      <div className="w-[210mm] h-[297mm] bg-white p-[5mm] box-border shrink-0 overflow-hidden flex flex-col items-center">
        <div className="w-full h-full bg-white border-[4px] border-black flex flex-col justify-between text-black pt-8 pb-8" style={{ fontFamily: '"UTM Colossalis", sans-serif' }}>
          
          {/* Section 1: Top category label - shrunken and padded to align with borders (10%) */}
          <div className="h-[10%] bg-black text-white mx-8 mt-3 flex items-center justify-center shrink-0">
            <span className="text-[52px] font-bold uppercase tracking-[0.05em] leading-none" style={{ fontFamily: '"UTM Colossalis", sans-serif' }}>
              {categoryName}
            </span>
          </div>

          {/* Section 2: GIÁ SỐC Title (14%) - adjusted leading to prevent accent truncation */}
          <div className="h-[14%] flex items-center justify-center shrink-0 pt-2">
            <span className="text-[130px] font-bold uppercase leading-[1.2] tracking-tighter" style={{ fontFamily: '"UTM Colossalis", sans-serif' }}>
              GIÁ SỐC
            </span>
          </div>

          {/* Section 3: Discount Percentage (24%) - Inter Black-900 font */}
          <div className="h-[24%] flex items-center justify-center shrink-0">
            {discountPercent > 0 && (
              <span className="leading-none text-black tracking-tighter" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '250px' }}>
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Section 4: Product Name Box (13%) - Rounded border and Inter Black-900 font */}
          <div className="h-[13%] w-full px-8 py-1 shrink-0">
            <div className="w-full h-full border-[4px] border-black rounded-2xl flex items-center justify-center px-6 text-[30px] text-center" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 900 }}>
              <span className="line-clamp-2 leading-[1.2] uppercase">{item.name || 'TÊN SẢN PHẨM'}</span>
            </div>
          </div>

          {/* Section 5: Original Price (10%) */}
          <div className="h-[10%] flex items-center justify-center shrink-0">
            <div className="relative inline-block text-[80px] text-black" style={{ fontFamily: '"UTM Colossalis", sans-serif' }}>
              {formatPrice(item.originalPrice)}
              <div className="absolute top-[52%] left-[-8%] right-[-8%] h-[8px] bg-black -translate-y-1/2"></div>
            </div>
          </div>

          {/* Section 6: Final Price Box (29%) */}
          <div className="h-[29%] flex items-center justify-center w-full pb-4 shrink-0">
            <div className="flex items-end justify-center gap-2">
              <div className="border-[4px] border-dashed border-blue-600 px-8 py-3 flex flex-col items-center justify-center shrink-0">
                <span className="leading-none tracking-tighter text-black" style={{ fontFamily: '"UTM Colossalis", sans-serif', fontSize: `${mainPriceFontSize}px` }}>
                  {mainPrice}
                </span>
                <span className="text-[18px] font-black mt-2 text-black whitespace-nowrap" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800 }}>
                  Khuyến mãi áp dụng đến hết ngày {item.endDate || '3/5/2026'}
                </span>
              </div>
              <span className="text-[64px] mb-8 shrink-0 leading-none" style={{ fontFamily: '"UTM Colossalis", sans-serif' }}>
                .{lastPart}Đ
              </span>
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
    const priceParts = priceStr.split('.');
    const mainPrice = priceParts.slice(0, -1).join('.');
    const lastPart = priceParts[priceParts.length - 1];
    
    // Auto-scale font size based on mainPrice length
    const mainPriceLen = mainPrice.length;
    const mainPriceFontSize = mainPriceLen <= 5 ? 150 : mainPriceLen <= 6 ? 125 : mainPriceLen <= 7 ? 100 : 80;
    
    const defaultCategory = item.nganhHang || (item.name ? item.name.split(' ').slice(0, 3).join(' ') : 'HÀNG TRƯNG BÀY');
    const categoryName = mlnHeaderTemplate
      ? mlnHeaderTemplate.replace('{nganhHang}', item.nganhHang || '')
      : defaultCategory;

    const isA4 = layout === '2';
    const scaleFactor = isA4 ? 1.414 : 1.0;
    
    const categoryFontSize = Math.round(38 * scaleFactor);
    const giasocFontSize = Math.round(125 * scaleFactor);
    const discountFontSize = Math.round(145 * scaleFactor);
    const nameBoxFontSize = Math.round(24 * scaleFactor);
    const originalPriceFontSize = Math.round(58 * scaleFactor);
    const mainPriceFS = Math.round(mainPriceFontSize * scaleFactor);
    const lastPartFS = Math.round(Math.round(mainPriceFontSize * 0.35) * scaleFactor);
    const promoDateFontSize = Math.round(18 * scaleFactor);

    return (
      <div 
        className="bg-white box-border shrink-0 overflow-hidden flex flex-col items-center"
        style={{
          width: isA4 ? '210mm' : '148.5mm',
          height: isA4 ? '297mm' : '210mm',
          padding: isA4 ? '6mm' : '4mm'
        }}
      >
        <div 
          className="w-full h-full bg-white border-black flex flex-col justify-between text-black" 
          style={{ 
            fontFamily: '"UTM Colossalis", sans-serif',
            borderStyle: 'solid',
            borderWidth: isA4 ? '6px' : '4px',
            paddingTop: isA4 ? '3mm' : '2mm',
            paddingBottom: isA4 ? '4.5mm' : '3mm'
          }}
        >
          {/* Section 1: Top category label (8.5%) */}
          <div 
            className="h-[8.5%] bg-black text-white flex items-center justify-center shrink-0"
            style={{
              marginRight: isA4 ? '3mm' : '2mm',
              marginLeft: isA4 ? '3mm' : '2mm'
            }}
          >
            <span className="font-bold uppercase leading-none" style={{ fontFamily: '"UTM Colossalis", sans-serif', fontSize: `${categoryFontSize}px`, letterSpacing: '0.05em' }}>
              {categoryName}
            </span>
          </div>

          {/* Section 2: GIÁ SỐC Title (16%) */}
          <div 
            className="h-[16%] flex items-center justify-center shrink-0 pt-1"
            style={{
              marginTop: isA4 ? '3mm' : '2mm'
            }}
          >
            <span className="font-bold uppercase leading-[1.1]" style={{ fontFamily: '"UTM Colossalis", sans-serif', fontSize: `${giasocFontSize}px`, letterSpacing: '-0.02em' }}>
              GIÁ SỐC
            </span>
          </div>

          {/* Section 3: Discount Percentage (19%) */}
          <div 
            className="h-[19%] flex items-center justify-center shrink-0"
            style={{
              marginBottom: isA4 ? '12px' : '8px'
            }}
          >
            {discountPercent > 0 && (
              <span className="leading-none text-black" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: `${discountFontSize}px`, letterSpacing: '-0.05em' }}>
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Section 4: Product Name Box (9.5%) */}
          <div className="h-[9.5%] w-full px-8 py-1 shrink-0">
            <div 
              className="w-full h-full border-black flex items-center justify-center px-4 text-center" 
              style={{ 
                fontFamily: '"Inter", sans-serif', 
                fontWeight: 900, 
                fontSize: `${nameBoxFontSize}px`,
                borderStyle: 'solid',
                borderWidth: isA4 ? '4px' : '3px',
                borderRadius: isA4 ? '16px' : '12px'
              }}
            >
              <span className="line-clamp-2 leading-[1.2]">{item.name || 'Tên sản phẩm'}</span>
            </div>
          </div>

          {/* Section 5: Original Price (10%) */}
          <div className="h-[10%] flex items-center justify-center shrink-0">
            <div className="relative inline-block text-black" style={{ fontFamily: '"UTM Colossalis", sans-serif', fontSize: `${originalPriceFontSize}px` }}>
              {formatPrice(item.originalPrice)}
              <div 
                className="absolute top-[52%] left-[-8%] right-[-8%] bg-black -translate-y-1/2" 
                style={{ height: isA4 ? '11px' : '8px' }}
              ></div>
            </div>
          </div>

          {/* Section 6: Final Discount Price (28%) */}
          <div 
            className="h-[28%] flex items-center justify-center w-full shrink-0"
            style={{
              paddingLeft: isA4 ? '3mm' : '2mm',
              paddingRight: isA4 ? '3mm' : '2mm'
            }}
          >
            <div className="flex items-baseline justify-center">
              <span className="leading-none text-black" style={{ fontFamily: '"UTM Colossalis", sans-serif', fontSize: `${mainPriceFS}px`, letterSpacing: '-0.03em', textShadow: isA4 ? '6px 6px 0px #d0d0d0' : '4px 4px 0px #d0d0d0' }}>
                {mainPrice}
              </span>
              <span className="leading-none text-black" style={{ fontFamily: '"UTM Colossalis", sans-serif', fontSize: `${lastPartFS}px`, textShadow: isA4 ? '3px 3px 0px #d0d0d0' : '2px 2px 0px #d0d0d0' }}>
                .{lastPart}
              </span>
            </div>
          </div>

          {/* Section 7: Promo date text (5%) */}
          <div className="h-[5%] flex items-end justify-center w-full px-6 pb-1 shrink-0">
            <span className="text-black text-center" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800, fontSize: `${promoDateFontSize}px`, fontStyle: 'italic' }}>
              {mlnFooterTemplate
                ? mlnFooterTemplate.replace('{date}', item.endDate || '31/05/2026')
                : `Khuyến mãi áp dụng đến hết ngày ${item.endDate || '31/05/2026'}`}
            </span>
          </div>

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
            <QRCode value={item.qrData || item.maSanPham || item.productCode || '00000'} size={40} level="L" />
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
            <QRCode value={item.qrData || item.maSanPham || item.productCode || '00000'} size={56} level="L" />
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
          <div className="text-center font-bold text-[16.5px] mb-6 tracking-tight uppercase">
            {promoLabelText}
          </div>
        )}

        {/* Thick Black Bar at the bottom inside inner border */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-black"></div>
      </div>
    </div>
  );
}
