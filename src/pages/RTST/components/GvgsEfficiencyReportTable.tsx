import React, { useState, useMemo, useRef } from 'react';
import { 
  Camera, 
  Edit3, 
  Check, 
  RotateCcw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';
import { domToPng } from 'modern-screenshot';
import * as XLSX from 'xlsx';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { ensureFontsReady } from '../../../utils/fontExportUtil';
import { useNotification } from '../../../contexts/NotificationContext';

export interface GvgsProductItem {
  id: string;
  maSp: string;
  tenSp: string;
  nhomHang: string;
  giaNy: number;
  giaKm: number;
}

// 28 sản phẩm GVGS chuẩn từ Google Sheet phân theo nhóm hàng
const DEFAULT_GVGS_PRODUCTS: GvgsProductItem[] = [
  // Máy lọc nước
  { id: '1', nhomHang: 'MÁY LỌC NƯỚC', maSp: '1114171000197', tenSp: 'Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639 12 lõi (Imei)', giaNy: 8080000, giaKm: 6290000 },
  { id: '2', nhomHang: 'MÁY LỌC NƯỚC', maSp: '1114171000243', tenSp: 'Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4 12 lõi (IMEI)', giaNy: 8690000, giaKm: 7490000 },
  { id: '3', nhomHang: 'MÁY LỌC NƯỚC', maSp: '1114171000193', tenSp: 'Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S 11 lõi (Imei)', giaNy: 11140000, giaKm: 8990000 },
  { id: '4', nhomHang: 'MÁY LỌC NƯỚC', maSp: '1114171000128', tenSp: 'Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68 11 lõi (Imei)', giaNy: 14890000, giaKm: 10990000 },

  // Loa Karaoke
  { id: '5', nhomHang: 'LOA KARAOKE', maSp: '3040880000094', tenSp: 'Loa Karaoke Dalton TS-12G450X', giaNy: 9090000, giaKm: 6990000 },
  { id: '6', nhomHang: 'LOA KARAOKE', maSp: '3040880000234', tenSp: 'Loa Karaoke Dalton PartyPro 215', giaNy: 18700000, giaKm: 13990000 },

  // Tivi
  { id: '7', nhomHang: 'TIVI', maSp: '3041094001912', tenSp: 'TCL QD-Mini LED 4K TV 55C6KS', giaNy: 17490000, giaKm: 10990000 },
  { id: '8', nhomHang: 'TIVI', maSp: '3041094002302', tenSp: 'TCL QLED TV 65T6D', giaNy: 16990000, giaKm: 10990000 },
  { id: '9', nhomHang: 'TIVI', maSp: '3041094002166', tenSp: 'Tivi Mini LED Samsung UA65M8XHA', giaNy: 21900000, giaKm: 14990000 },
  { id: '10', nhomHang: 'TIVI', maSp: '3041094002167', tenSp: 'Tivi Mini LED Samsung UA55M8XHA', giaNy: 16900000, giaKm: 12990000 },

  // Máy giặt
  { id: '11', nhomHang: 'MÁY GIẶT', maSp: '1751099000216', tenSp: 'Máy giặt Toshiba AW-DK1300KV(MK)', giaNy: 10190000, giaKm: 6990000 },
  { id: '12', nhomHang: 'MÁY GIẶT', maSp: '1751099000211', tenSp: 'Máy giặt Samsung WA40F12E4LSV', giaNy: 9390000, giaKm: 7190000 },
  { id: '13', nhomHang: 'MÁY GIẶT', maSp: '1751099000218', tenSp: 'Máy giặt Electrolux 11kg EWF1124D3EC', giaNy: 15490000, giaKm: 9990000 },
  { id: '14', nhomHang: 'MÁY GIẶT', maSp: '1751099000141', tenSp: 'Máy giặt Haier HW110-BD14387GNU1', giaNy: 16790000, giaKm: 12190000 },
  { id: '15', nhomHang: 'MÁY GIẶT', maSp: '1751099000168', tenSp: 'Máy giặt LG FX1413S3KA', giaNy: 21990000, giaKm: 15990000 },

  // Gia dụng & Bếp
  { id: '16', nhomHang: 'GIA DỤNG & BẾP', maSp: '4844146000094', tenSp: 'Bếp ga đôi Kangaroo KG516M (imei)', giaNy: 1380000, giaKm: 690000 },
  { id: '17', nhomHang: 'GIA DỤNG & BẾP', maSp: '4844147000184', tenSp: 'Bếp điện từ đơn Kangaroo KGIC22S2 (Imei)', giaNy: 1770000, giaKm: 890000 },
  { id: '18', nhomHang: 'GIA DỤNG & BẾP', maSp: '4844157000072', tenSp: 'Nồi cơm cao tần Kangaroo KG15RIH1-1.5L (Imei)', giaNy: 2696000, giaKm: 1990000 },
  { id: '19', nhomHang: 'GIA DỤNG & BẾP', maSp: '4844156000448', tenSp: 'Nồi cơm nắp gài Kangaroo KGRC18M8- 1.8L (Imei)', giaNy: 990000, giaKm: 590000 },

  // Tủ lạnh
  { id: '20', nhomHang: 'TỦ LẠNH', maSp: '1751097000171', tenSp: 'Tủ lạnh Hitachi HRSN9563DWGBVN', giaNy: 19990000, giaKm: 17090000 },
  { id: '21', nhomHang: 'TỦ LẠNH', maSp: '3051097002196', tenSp: 'Tủ lạnh Toshiba GR-RT535WEA-PMV(06)-MG', giaNy: 15670000, giaKm: 10990000 },
  { id: '22', nhomHang: 'TỦ LẠNH', maSp: '1751097000064', tenSp: 'Tủ lạnh Toshiba GR-RS696WI-PMV(60)-AG', giaNy: 17630000, giaKm: 13050000 },
  { id: '23', nhomHang: 'TỦ LẠNH', maSp: '3051097001791', tenSp: 'Tủ lạnh Samsung RT25M4032BU/SV', giaNy: 9010000, giaKm: 6590000 },
  { id: '24', nhomHang: 'TỦ LẠNH', maSp: '1751097000214', tenSp: 'Tủ lạnh Haier HM610AGBVNU1', giaNy: 23190000, giaKm: 19490000 },
  { id: '25', nhomHang: 'TỦ LẠNH', maSp: '1751097000264', tenSp: 'Tủ lạnh Samsung RS70F65Q3TSV', giaNy: 22490000, giaKm: 14990000 },
  { id: '26', nhomHang: 'TỦ LẠNH', maSp: '1751097000152', tenSp: 'Tủ lạnh AQUA AQR-S682XA(WGB)', giaNy: 18690000, giaKm: 15590000 },

  // Tủ đông
  { id: '27', nhomHang: 'TỦ ĐÔNG', maSp: '3050893000194', tenSp: 'Tủ đông Kangaroo KG498KX2', giaNy: 10190000, giaKm: 8190000 },
  { id: '28', nhomHang: 'TỦ ĐÔNG', maSp: '3050893000273', tenSp: 'Tủ đông Hòa Phát 352 lít HPF AD6352', giaNy: 8430000, giaKm: 6290000 },
];

interface GvgsEfficiencyReportTableProps {
  externalProducts?: any[];
}

export const GvgsEfficiencyReportTable: React.FC<GvgsEfficiencyReportTableProps> = ({ externalProducts }) => {
  const { showNotification } = useNotification();

  // Tiêu đề chính lớn & ngày tháng (cho phép sửa thủ công)
  const [mainTitle, setMainTitle] = useState<string>(() => {
    return localStorage.getItem('gvgs_main_title') || 'TỔNG HỢP SẢN PHẨM GIỜ VÀNG GIÁ SỐC CUỐI TUẦN';
  });

  const [dateSubtitle, setDateSubtitle] = useState<string>(() => {
    return localStorage.getItem('gvgs_date_subtitle') || 'NGÀY 23,24,25/10';
  });

  // Trạng thái đang sửa tiêu đề thủ công
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);

  // Modal xem trước ảnh
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const productsTableCaptureRef = useRef<HTMLDivElement>(null);

  // Danh sách sản phẩm kết hợp từ Google Sheet hoặc mặc định
  const displayProducts = useMemo(() => {
    if (externalProducts && externalProducts.length > 0) {
      return externalProducts.map((p, idx) => {
        const nameUpper = String(p.name || '').toUpperCase();
        let nhom = 'GIA DỤNG & KHÁC';
        if (nameUpper.includes('MÁY LỌC NƯỚC') || nameUpper.includes('RO') || nameUpper.includes('HÒA PHÁT') || nameUpper.includes('KAROFI')) {
          nhom = 'MÁY LỌC NƯỚC';
        } else if (nameUpper.includes('LOA') || nameUpper.includes('DALTON') || nameUpper.includes('KARAOKE')) {
          nhom = 'LOA KARAOKE';
        } else if (nameUpper.includes('TIVI') || nameUpper.includes('TV') || nameUpper.includes('TCL') || nameUpper.includes('QLED') || nameUpper.includes('LED')) {
          nhom = 'TIVI';
        } else if (nameUpper.includes('MÁY GIẶT') || nameUpper.includes('TOSHIBA') || nameUpper.includes('ELECTROLUX') || nameUpper.includes('LG')) {
          nhom = 'MÁY GIẶT';
        } else if (nameUpper.includes('TỦ LẠNH') || nameUpper.includes('HITACHI') || nameUpper.includes('AQUA')) {
          nhom = 'TỦ LẠNH';
        } else if (nameUpper.includes('TỦ ĐÔNG')) {
          nhom = 'TỦ ĐÔNG';
        } else if (nameUpper.includes('BẾP') || nameUpper.includes('NỒI CƠM') || nameUpper.includes('KANGAROO')) {
          nhom = 'GIA DỤNG & BẾP';
        }

        return {
          id: p.id || String(idx + 1),
          nhomHang: p.nhomHang || nhom,
          maSp: p.maSanPham || p.productCode || '-',
          tenSp: p.name || 'Sản phẩm GVGS',
          giaNy: Number(p.originalPrice) || 0,
          giaKm: Number(p.discountPrice) || 0
        };
      });
    }
    return DEFAULT_GVGS_PRODUCTS;
  }, [externalProducts]);

  // Xuất file Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const data = displayProducts.map((p, i) => {
        const discount = p.giaNy - p.giaKm;
        const rate = p.giaNy > 0 ? `${Math.round((discount / p.giaNy) * 100)}%` : '0%';
        return {
          'STT': i + 1,
          'MÃ SẢN PHẨM': p.maSp,
          'TÊN SẢN PHẨM': p.tenSp,
          'GIÁ BÁN NY': p.giaNy,
          'GIÁ KM GVGS': p.giaKm,
          'TIẾT KIỆM (Đ)': discount,
          '% GIẢM': rate
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'TongHop_GVGS');
      const safeFileName = `${mainTitle.replace(/\s+/g, '_')}_${dateSubtitle.replace(/[\/,\s]+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, safeFileName);

      showNotification('Đã xuất file Excel thành công!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Lỗi khi xuất file Excel', 'error');
    }
  };

  // Chụp ảnh Zero-Shadow chuẩn mực, đảm bảo hiển thị 100% banner và bảng sản phẩm
  const handleCaptureImage = async () => {
    if (!productsTableCaptureRef.current) {
      showNotification('Không tìm thấy vùng dữ liệu cần chụp!', 'error');
      return;
    }

    setIsCapturing(true);
    let tempContainer: HTMLDivElement | null = null;

    try {
      await ensureFontsReady();

      const sourceElem = productsTableCaptureRef.current;
      const clone = sourceElem.cloneNode(true) as HTMLElement;

      // 1. Loại bỏ các thành phần điều khiển không cần chụp (.no-capture)
      const noCaptureElements = clone.querySelectorAll('.no-capture');
      noCaptureElements.forEach((el) => el.remove());

      // 2. Chuẩn hóa banner trong clone luôn hiển thị text cố định, sạch đẹp (ngay cả khi đang ở chế độ sửa)
      const bannerEl = clone.firstElementChild as HTMLElement;
      if (bannerEl) {
        bannerEl.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px; font-family: 'UTM Avo', 'Inter', system-ui, sans-serif;">
            <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #dbeafe; opacity: 0.95;">
              ${dateSubtitle}
            </div>
            <div style="font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; color: #ffffff; line-height: 1.25;">
              ${mainTitle}
            </div>
          </div>
        `;
        bannerEl.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)';
        bannerEl.style.padding = '24px 32px';
        bannerEl.style.boxSizing = 'border-box';
      }

      // 3. Triệt tiêu toàn bộ shadow, filter (Zero-Shadow Export theo AGENTS.md)
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
        htmlEl.classList.remove(
          'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow'
        );
      });

      // 4. Mở rộng tất cả các vùng chứa bị overflow: hidden hoặc scrollable
      const overflowEls = clone.querySelectorAll('div, table');
      overflowEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.maxHeight = 'none';
        htmlEl.style.maxWidth = 'none';
      });

      // 5. Cố định cấu trúc bảng chuẩn fixed và hiển thị đầy đủ nội dung ô
      const tables = clone.querySelectorAll('table');
      tables.forEach((table) => {
        const htmlTable = table as HTMLTableElement;
        htmlTable.style.width = '100%';
        htmlTable.style.minWidth = '100%';
        htmlTable.style.maxWidth = '100%';
        htmlTable.style.tableLayout = 'fixed';
        htmlTable.style.borderCollapse = 'collapse';
        htmlTable.style.boxSizing = 'border-box';
      });

      clone.querySelectorAll('th, td').forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.boxSizing = 'border-box';
        htmlCell.style.overflow = 'visible';
        htmlCell.style.textOverflow = 'clip';
      });

      clone.querySelectorAll('.truncate, [class*="line-clamp"]').forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.classList.remove('truncate', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3');
        htmlEl.style.overflow = 'visible';
        htmlEl.style.textOverflow = 'clip';
      });

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const targetWidthPx = 960;
      const exportScale = isMobile ? 2 : 2.5;

      // 6. Khởi tạo container đệm đặt tại (0,0) với opacity = 0 và zIndex = -99999 để engine browser tính toán layout 100% chuẩn xác
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '0px';
      tempContainer.style.top = '0px';
      tempContainer.style.opacity = '0';
      tempContainer.style.width = `${targetWidthPx}px`;
      tempContainer.style.zIndex = '-99999';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.overflow = 'visible';

      // 7. Bọc khung đệm trắng phẳng tuyệt đối (frameWrapper)
      const frameWrapper = document.createElement('div');
      frameWrapper.style.width = `${targetWidthPx}px`;
      frameWrapper.style.minWidth = `${targetWidthPx}px`;
      frameWrapper.style.maxWidth = `${targetWidthPx}px`;
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.padding = '0px';
      frameWrapper.style.margin = '0px';
      frameWrapper.style.boxSizing = 'border-box';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.style.overflow = 'visible';

      // Khóa kích thước clone
      clone.style.width = `${targetWidthPx}px`;
      clone.style.minWidth = `${targetWidthPx}px`;
      clone.style.maxWidth = `${targetWidthPx}px`;
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0px';
      clone.style.border = 'none';
      clone.style.overflow = 'visible';

      frameWrapper.appendChild(clone);
      tempContainer.appendChild(frameWrapper);
      document.body.appendChild(tempContainer);

      // Chờ trình duyệt reflow layout & load font hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Tính toán chiều cao chính xác của toàn bộ nội dung
      const exactHeight = Math.ceil(
        Math.max(
          frameWrapper.scrollHeight,
          frameWrapper.offsetHeight,
          clone.scrollHeight,
          clone.offsetHeight,
          500
        )
      );

      let dataUrl = '';

      // Tầng 1: html2canvas (Vẽ trực tiếp lên canvas, tương thích 100% iOS Safari & mobile)
      try {
        const canvas = await html2canvas(frameWrapper, {
          scale: exportScale,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: targetWidthPx,
          windowWidth: targetWidthPx,
          height: exactHeight,
          windowHeight: exactHeight,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
        });
        dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 500) {
          throw new Error('html2canvas tạo dữ liệu ảnh rỗng');
        }
      } catch (h2cErr) {
        console.warn('[GvgsEfficiencyReportTable] html2canvas không thành công, chuyển sang domToPng:', h2cErr);
        // Tầng 2: domToPng
        try {
          dataUrl = await domToPng(frameWrapper, {
            scale: exportScale,
            backgroundColor: '#ffffff',
            width: targetWidthPx,
            height: exactHeight,
            font: false,
            drawImageInterval: 20,
            features: {
              removeControlCharacter: true,
              copyScrollbar: false,
            }
          });
          if (!dataUrl || dataUrl.length < 500) {
            throw new Error('domToPng tạo dữ liệu ảnh rỗng');
          }
        } catch (domErr) {
          console.warn('[GvgsEfficiencyReportTable] domToPng không thành công, chuyển sang htmlToImage:', domErr);
          // Tầng 3: htmlToImage
          dataUrl = await htmlToImage.toPng(frameWrapper, {
            backgroundColor: '#ffffff',
            pixelRatio: exportScale,
            skipFonts: true,
            skipAutoScale: true,
            cacheBust: false,
            width: targetWidthPx,
            height: exactHeight,
          });
        }
      }

      if (!dataUrl) {
        throw new Error('Tất cả các phương thức chụp ảnh đều không tạo được ảnh');
      }

      setPreviewImage(dataUrl);
      showNotification('Đã chụp ảnh báo cáo thành công! Sẵn sàng chia sẻ.', 'success');
    } catch (err) {
      console.error('[GvgsEfficiencyReportTable] Lỗi chụp ảnh:', err);
      showNotification('Lỗi khi chụp ảnh báo cáo.', 'error');
    } finally {
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {/* THANH TÁC VỤ TINH GỌN (CHỤP ẢNH, XUẤT EXCEL, SỬA TIÊU ĐỀ THỦ CÔNG) */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs no-capture">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingTitle(prev => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
              isEditingTitle 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Sửa ngày tháng và tiêu đề bảng thủ công"
          >
            <Edit3 size={14} />
            <span>{isEditingTitle ? 'Đóng Ô Sửa' : 'Sửa Tiêu Đề & Ngày'}</span>
          </button>

          {isEditingTitle && (
            <button
              type="button"
              onClick={() => {
                setDateSubtitle('NGÀY 23,24,25/10');
                setMainTitle('TỔNG HỢP SẢN PHẨM GIỜ VÀNG GIÁ SỐC CUỐI TUẦN');
                localStorage.setItem('gvgs_date_subtitle', 'NGÀY 23,24,25/10');
                localStorage.setItem('gvgs_main_title', 'TỔNG HỢP SẢN PHẨM GIỜ VÀNG GIÁ SỐC CUỐI TUẦN');
                setIsEditingTitle(false);
              }}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
              title="Đặt lại tiêu đề & ngày mặc định"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={handleCaptureImage}
            disabled={isCapturing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Camera size={15} className={isCapturing ? 'animate-pulse' : ''} />
            <span>{isCapturing ? 'Đang chụp...' : 'Chụp Ảnh Báo Cáo'}</span>
          </button>
        </div>
      </div>

      {/* BẢNG TỔNG HỢP SẢN PHẨM GVGS THEO MẪU ẢNH */}
      <div className="w-full flex justify-center overflow-x-auto pb-4">
        <div 
          ref={productsTableCaptureRef}
          className="w-full max-w-[960px] min-w-[760px] bg-white rounded-none border border-slate-300 shadow-none overflow-hidden font-sans"
          style={{ boxSizing: 'border-box' }}
        >
          {/* BANNER XANH DƯƠNG (HÌNH 3 ĐƯỢC ĐỔI TÊN & SỬA THỦ CÔNG) */}
          <div 
            className="px-6 py-6 sm:px-8 sm:py-7 text-white select-none relative group"
            style={{ 
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)',
              boxSizing: 'border-box'
            }}
          >
            {/* Dòng ngày tháng có thể sửa thủ công */}
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="w-full space-y-1">
                  <label className="text-[10.5px] font-black uppercase tracking-wider text-blue-200">
                    NGÀY ÁP DỤNG (SỬA THỦ CÔNG):
                  </label>
                  <input
                    type="text"
                    value={dateSubtitle}
                    onChange={(e) => {
                      setDateSubtitle(e.target.value);
                      localStorage.setItem('gvgs_date_subtitle', e.target.value);
                    }}
                    placeholder="VD: NGÀY 23,24,25/10"
                    className="w-full bg-white/20 text-white font-black px-3 py-1.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider border border-white/40 focus:outline-none focus:bg-white/30"
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-[13px] sm:text-[15px] font-black uppercase tracking-wider text-blue-100 opacity-95 cursor-pointer hover:underline flex items-center gap-1.5"
                  title="Bấm để sửa ngày tháng"
                >
                  <span>{dateSubtitle}</span>
                  <Edit3 size={13} className="opacity-70 hover:opacity-100 no-capture" />
                </div>
              )}
            </div>

            {/* Tiêu đề chính lớn có thể sửa thủ công */}
            <div className="mt-1.5">
              {isEditingTitle ? (
                <div className="w-full space-y-2 pt-1">
                  <label className="text-[10.5px] font-black uppercase tracking-wider text-blue-200">
                    TIÊU ĐỀ BẢNG (SỬA THỦ CÔNG):
                  </label>
                  <input
                    type="text"
                    value={mainTitle}
                    onChange={(e) => {
                      setMainTitle(e.target.value);
                      localStorage.setItem('gvgs_main_title', e.target.value);
                    }}
                    placeholder="TỔNG HỢP SẢN PHẨM GIỜ VÀNG GIÁ SỐC CUỐI TUẦN"
                    className="w-full bg-white/20 text-white font-black px-3 py-2 rounded-xl text-xl sm:text-2xl md:text-3xl uppercase tracking-tight border border-white/40 focus:outline-none focus:bg-white/30"
                  />

                  <div className="flex items-center gap-2 pt-1 no-capture">
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(false)}
                      className="px-4 py-1.5 bg-white text-blue-700 rounded-xl text-xs font-black uppercase shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={14} /> Hoàn tất sửa
                    </button>
                  </div>
                </div>
              ) : (
                <h1 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight cursor-pointer hover:opacity-90 flex items-center gap-2"
                  title="Bấm để sửa tiêu đề bảng"
                >
                  <span>{mainTitle}</span>
                  <Edit3 size={18} className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity no-capture" />
                </h1>
              )}
            </div>
          </div>

          {/* BẢNG DANH SÁCH SẢN PHẨM THEO MẪU THEAD VÀNG CÁT CÓ ĐƯỜNG KẺ RÕ RÀNG */}
          <div className="w-full overflow-hidden">
            <table 
              className="w-full border-collapse text-left"
              style={{ 
                tableLayout: 'fixed',
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #94a3b8'
              }}
            >
              <colgroup>
                <col style={{ width: '5%' }} />   {/* STT */}
                <col style={{ width: '16%' }} />  {/* MÃ SP */}
                <col style={{ width: '51%' }} />  {/* TÊN SP */}
                <col style={{ width: '10%' }} />  {/* GIÁ NY */}
                <col style={{ width: '10%' }} />  {/* GIÁ KM */}
                <col style={{ width: '8%' }} />   {/* % GIẢM */}
              </colgroup>

              <thead>
                <tr 
                  style={{ 
                    backgroundColor: '#fae1af',
                    color: '#451a03',
                  }}
                >
                  <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-center" style={{ border: '1px solid #d4b47d', borderBottom: '2px solid #b49767' }}>STT</th>
                  <th className="py-3 px-3 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-center sm:text-left" style={{ border: '1px solid #d4b47d', borderBottom: '2px solid #b49767' }}>MÃ SẢN PHẨM</th>
                  <th className="py-3 px-3 text-[11px] sm:text-[12px] font-black uppercase tracking-tight" style={{ border: '1px solid #d4b47d', borderBottom: '2px solid #b49767' }}>TÊN SẢN PHẨM</th>
                  <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-right" style={{ border: '1px solid #d4b47d', borderBottom: '2px solid #b49767' }}>GIÁ BÁN NY</th>
                  <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-right text-red-700" style={{ border: '1px solid #d4b47d', borderBottom: '2px solid #b49767' }}>GIÁ KM GVGS</th>
                  <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-center text-emerald-800" style={{ border: '1px solid #d4b47d', borderBottom: '2px solid #b49767' }}>% GIẢM</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {displayProducts.map((p, idx) => {
                  const discount = p.giaNy - p.giaKm;
                  const discountRate = p.giaNy > 0 ? Math.round((discount / p.giaNy) * 100) : 0;

                  return (
                    <tr 
                      key={p.id || idx}
                      style={{ 
                        backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff'
                      }}
                    >
                      <td className="py-2.5 px-2 text-[12px] font-bold text-slate-500 text-center" style={{ border: '1px solid #cbd5e1' }}>
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-[11.5px] font-mono font-bold text-indigo-700" style={{ border: '1px solid #cbd5e1' }}>
                        {p.maSp}
                      </td>
                      <td className="py-2.5 px-3 text-[12px] sm:text-[13px] font-bold text-[#0f172a] whitespace-normal break-words leading-relaxed" style={{ border: '1px solid #cbd5e1' }}>
                        {p.tenSp}
                      </td>
                      <td className="py-2.5 px-2 text-[12px] font-medium text-slate-700 text-right whitespace-nowrap" style={{ border: '1px solid #cbd5e1' }}>
                        {p.giaNy > 0 ? p.giaNy.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-[12.5px] font-black text-red-600 text-right whitespace-nowrap" style={{ border: '1px solid #cbd5e1' }}>
                        {p.giaKm > 0 ? p.giaKm.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-[12px] font-black text-emerald-600 text-center whitespace-nowrap" style={{ border: '1px solid #cbd5e1' }}>
                        -{discountRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL XEM TRƯỚC VÀ TẢI ẢNH */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default GvgsEfficiencyReportTable;
