import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Camera, 
  FileSpreadsheet, 
  RotateCcw, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  Clock, 
  Layers, 
  Building2, 
  ShoppingBag,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import * as XLSX from 'xlsx';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { ensureFontsReady } from '../../../utils/fontExportUtil';
import { useNotification } from '../../../contexts/NotificationContext';

export interface StoreEfficiencyRow {
  id: string;
  tinh: string;
  kenh: string;
  boss: string;
  sieuThi: string;
  slCoTheBan: number;
  slGoi: number;
}

export interface GvgsProductItem {
  id: string;
  maSp: string;
  tenSp: string;
  nhomHang: string;
  giaNy: number;
  giaKm: number;
}

// 8 siêu thị Cụm Cà Mau chuẩn theo mẫu ảnh
const DEFAULT_CLUSTER_ROWS: StoreEfficiencyRow[] = [
  { id: '359', tinh: 'Bạc Liêu', kenh: 'ĐML', boss: 'Anh_35539', sieuThi: '359 - ĐML_BLI_BLI - 37 Trần Huỳnh', slCoTheBan: 1, slGoi: 0 },
  { id: '1455', tinh: 'Bạc Liêu', kenh: 'ĐMM', boss: 'Thái_69177', sieuThi: '1455 - ĐMM_BLI_BLI - Võ Thị Sáu', slCoTheBan: 1, slGoi: 1 },
  { id: '1553', tinh: 'Bạc Liêu', kenh: 'ĐMM', boss: 'Chọn_59072', sieuThi: '1553 - ĐMM_BLI_HBI - Hòa Bình', slCoTheBan: 1, slGoi: 1 },
  { id: '1954', tinh: 'Bạc Liêu', kenh: 'ĐMM', boss: 'Phúc_143970', sieuThi: '1954 - ĐMM_BLI_GRA - Hộ Phòng', slCoTheBan: 1, slGoi: 1 },
  { id: '7981', tinh: 'Bạc Liêu', kenh: 'ĐMS', boss: 'Chi_54186', sieuThi: '7981 - ĐMS_BLI_DHA - Điền Hải', slCoTheBan: 1, slGoi: 1 },
  { id: '884', tinh: 'Cà Mau', kenh: 'ĐML', boss: 'An_59690', sieuThi: '884 - ĐML_CMA_CMA - 18 Ngô Quyền', slCoTheBan: 1, slGoi: 0 },
  { id: '1635', tinh: 'Cà Mau', kenh: 'ĐMM', boss: 'Quy_63172', sieuThi: '1635 - ĐMM_CMA_TVT - Sông Đốc', slCoTheBan: 1, slGoi: 1 },
  { id: '2731', tinh: 'Cà Mau', kenh: 'ĐMM', boss: 'Nhẫn_7712', sieuThi: '2731 - ĐMM_CMA_CNU - Thạnh Phú', slCoTheBan: 1, slGoi: 1 },
];

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

const PRESET_GROUPS = [
  'GÓI THAY LÕI',
  'TẤT CẢ SẢN PHẨM GVGS',
  'MÁY LỌC NƯỚC',
  'TỦ LẠNH & TỦ ĐÔNG',
  'MÁY GIẶT',
  'TIVI',
  'GIA DỤNG & BẾP',
  'LOA KARAOKE',
];

interface GvgsEfficiencyReportTableProps {
  externalProducts?: any[];
}

export const GvgsEfficiencyReportTable: React.FC<GvgsEfficiencyReportTableProps> = ({ externalProducts }) => {
  const { showNotification } = useNotification();
  const [activeSubView, setActiveSubView] = useState<'cluster' | 'products'>('cluster');

  // Cấu hình tiêu đề bảng
  const [reportTime, setReportTime] = useState<string>(() => {
    return localStorage.getItem('gvgs_report_time') || '12:39';
  });
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    return localStorage.getItem('gvgs_selected_group') || 'GÓI THAY LÕI';
  });
  const [customClusterTitle, setCustomClusterTitle] = useState<string>(() => {
    return localStorage.getItem('gvgs_cluster_title') || 'CỤM CÀ MAU';
  });

  // Tên 2 cột số liệu
  const [col5Name, setCol5Name] = useState<string>(() => {
    return localStorage.getItem('gvgs_col5_name') || 'S.L MLN CÓ THỂ BÁN LÕI';
  });
  const [col6Name, setCol6Name] = useState<string>(() => {
    return localStorage.getItem('gvgs_col6_name') || 'S.L GÓI LÕI';
  });

  // Dữ liệu bảng siêu thị Cụm
  const [clusterRows, setClusterRows] = useState<StoreEfficiencyRow[]>(() => {
    try {
      const saved = localStorage.getItem('gvgs_cluster_store_rows');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Lỗi đọc gvgs_cluster_store_rows:', e);
    }
    return DEFAULT_CLUSTER_ROWS;
  });

  // Bộ lọc nhóm sản phẩm cho tab danh mục
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');

  // Modal xem trước ảnh
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Modal sửa / dán dữ liệu
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [pasteTextInput, setPasteTextInput] = useState<string>('');

  const clusterTableCaptureRef = useRef<HTMLDivElement>(null);
  const productsTableCaptureRef = useRef<HTMLDivElement>(null);

  // Lưu cấu hình vào localStorage
  const saveAllConfig = (
    rows: StoreEfficiencyRow[],
    time: string,
    grp: string,
    cls: string,
    c5: string,
    c6: string
  ) => {
    setClusterRows(rows);
    setReportTime(time);
    setSelectedGroup(grp);
    setCustomClusterTitle(cls);
    setCol5Name(c5);
    setCol6Name(c6);

    localStorage.setItem('gvgs_cluster_store_rows', JSON.stringify(rows));
    localStorage.setItem('gvgs_report_time', time);
    localStorage.setItem('gvgs_selected_group', grp);
    localStorage.setItem('gvgs_cluster_title', cls);
    localStorage.setItem('gvgs_col5_name', c5);
    localStorage.setItem('gvgs_col6_name', c6);
  };

  // Tính tổng hợp cụm
  const clusterSummary = useMemo(() => {
    const totalCol5 = clusterRows.reduce((sum, r) => sum + (Number(r.slCoTheBan) || 0), 0);
    const totalCol6 = clusterRows.reduce((sum, r) => sum + (Number(r.slGoi) || 0), 0);
    const totalRate = totalCol5 > 0 ? Math.round((totalCol6 / totalCol5) * 100) : 0;
    return { totalCol5, totalCol6, totalRate };
  }, [clusterRows]);

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

  // Lọc sản phẩm theo nhóm
  const filteredProducts = useMemo(() => {
    if (productCategoryFilter === 'ALL') return displayProducts;
    return displayProducts.filter(p => p.nhomHang.toUpperCase() === productCategoryFilter.toUpperCase());
  }, [displayProducts, productCategoryFilter]);

  // Các nhóm hàng duy nhất
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    displayProducts.forEach(p => set.add(p.nhomHang));
    return Array.from(set);
  }, [displayProducts]);

  // Cập nhật số lượng của siêu thị
  const handleUpdateRowQuantity = (id: string, field: 'slCoTheBan' | 'slGoi', val: number) => {
    const updated = clusterRows.map(r => r.id === id ? { ...r, [field]: Math.max(0, val) } : r);
    setClusterRows(updated);
    localStorage.setItem('gvgs_cluster_store_rows', JSON.stringify(updated));
  };

  // Đặt lại dữ liệu gốc của Cụm Cà Mau
  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại bảng số liệu theo mẫu Cụm Cà Mau ban đầu không?')) {
      saveAllConfig(DEFAULT_CLUSTER_ROWS, '12:39', 'GÓI THAY LÕI', 'CỤM CÀ MAU', 'S.L MLN CÓ THỂ BÁN LÕI', 'S.L GÓI LÕI');
      showNotification('Đã đặt lại dữ liệu mẫu Cụm Cà Mau thành công!', 'success');
    }
  };

  // Lấy giờ hiện hành realtime
  const handleSetCurrentTime = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setReportTime(timeStr);
    localStorage.setItem('gvgs_report_time', timeStr);
    showNotification(`Đã cập nhật giờ realtime: ${timeStr}`, 'success');
  };

  // Parse văn bản dán từ Excel / Web
  const handleApplyPastedText = () => {
    if (!pasteTextInput.trim()) {
      showNotification('Vui lòng dán nội dung bảng từ Excel!', 'warning');
      return;
    }

    try {
      const lines = pasteTextInput.trim().split('\n');
      const newRows: StoreEfficiencyRow[] = [];

      lines.forEach((line, idx) => {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length >= 6) {
          // Format: TỈNH \t KÊNH \t BOSS \t SIÊU THỊ \t S.L 1 \t S.L 2
          const tinh = parts[0] || 'Cụm';
          const kenh = parts[1] || 'ĐMM';
          const boss = parts[2] || '';
          const sieuThi = parts[3] || '';
          const sl1 = parseInt(parts[4].replace(/,/g, '').replace(/\./g, '')) || 0;
          const sl2 = parseInt(parts[5].replace(/,/g, '').replace(/\./g, '')) || 0;

          if (sieuThi && !sieuThi.toUpperCase().includes('TỔNG')) {
            newRows.push({
              id: `parsed_${idx}`,
              tinh,
              kenh,
              boss,
              sieuThi,
              slCoTheBan: sl1,
              slGoi: sl2
            });
          }
        }
      });

      if (newRows.length > 0) {
        setClusterRows(newRows);
        localStorage.setItem('gvgs_cluster_store_rows', JSON.stringify(newRows));
        setIsEditModalOpen(false);
        setPasteTextInput('');
        showNotification(`Đã phân tích thành công ${newRows.length} siêu thị!`, 'success');
      } else {
        showNotification('Không nhận diện được định dạng bảng cột. Hãy copy từ bảng Excel.', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Lỗi khi phân tích dữ liệu dán.', 'error');
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (activeSubView === 'cluster') {
        const data = clusterRows.map((r, i) => ({
          'STT': i + 1,
          'TỈNH': r.tinh,
          'KÊNH': r.kenh,
          'BOSS': r.boss,
          'SIÊU THỊ': r.sieuThi,
          [col5Name]: r.slCoTheBan,
          [col6Name]: r.slGoi,
          'TỈ LỆ KHAI THÁC': r.slCoTheBan > 0 ? `${Math.round((r.slGoi / r.slCoTheBan) * 100)}%` : '0%'
        }));

        data.push({
          'STT': '' as any,
          'TỈNH': `TỔNG ${customClusterTitle}` as any,
          'KÊNH': '' as any,
          'BOSS': '' as any,
          'SIÊU THỊ': '' as any,
          [col5Name]: clusterSummary.totalCol5 as any,
          [col6Name]: clusterSummary.totalCol6 as any,
          'TỈ LỆ KHAI THÁC': `${clusterSummary.totalRate}%` as any
        });

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'HieuQua_KhaiThac_Cum');
        XLSX.writeFile(wb, `BaoCao_HieuQua_KhaiThac_${selectedGroup.replace(/\s+/g, '_')}_${reportTime.replace(':', 'h')}.xlsx`);
      } else {
        const data = filteredProducts.map((p, i) => {
          const discount = p.giaNy - p.giaKm;
          const rate = p.giaNy > 0 ? `${Math.round((discount / p.giaNy) * 100)}%` : '0%';
          return {
            'STT': i + 1,
            'NHÓM HÀNG': p.nhomHang,
            'MÃ SẢN PHẨM': p.maSp,
            'TÊN SẢN PHẨM': p.tenSp,
            'GIÁ BÁN NY': p.giaNy,
            'GIÁ KM GVGS': p.giaKm,
            'TIẾT KIỆM (Đ)': discount,
            '% GIẢM': rate
          };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'TongHop_SanPham_GVGS');
        XLSX.writeFile(wb, `TongHop_SanPham_GVGS_${productCategoryFilter}.xlsx`);
      }

      showNotification('Đã xuất file Excel thành công!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Lỗi khi xuất file Excel', 'error');
    }
  };

  // Chụp ảnh Zero-Shadow chuẩn mực
  const handleCaptureImage = async () => {
    const targetRef = activeSubView === 'cluster' ? clusterTableCaptureRef : productsTableCaptureRef;
    if (!targetRef.current) {
      showNotification('Không tìm thấy vùng dữ liệu cần chụp!', 'error');
      return;
    }

    setIsCapturing(true);
    try {
      await ensureFontsReady();

      const sourceElem = targetRef.current;
      const clone = sourceElem.cloneNode(true) as HTMLElement;

      // Gỡ bỏ toàn bộ shadow & filter (Zero-Shadow Export)
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

      // Bọc khung đệm độc lập nền trắng phẳng tuyệt đối
      const frameWrapper = document.createElement('div');
      frameWrapper.style.position = 'fixed';
      frameWrapper.style.top = '-99999px';
      frameWrapper.style.left = '-99999px';
      frameWrapper.style.width = '960px'; // Chiều rộng chuẩn bề thế chuẩn tỉ lệ hình
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.padding = '0px';
      frameWrapper.style.margin = '0px';
      frameWrapper.style.boxShadow = 'none';
      frameWrapper.style.overflow = 'hidden';

      // Khóa kích thước clone
      clone.style.width = '960px';
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0px';
      clone.style.border = 'none';

      frameWrapper.appendChild(clone);
      document.body.appendChild(frameWrapper);

      // Render ảnh với tỉ lệ 2.5x cực nét
      const dataUrl = await domToPng(frameWrapper, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        features: {
          removeControlCharacter: true
        }
      });

      document.body.removeChild(frameWrapper);

      setPreviewImage(dataUrl);
      showNotification('Đã chụp ảnh báo cáo thành công! Sẵn sàng chia sẻ.', 'success');
    } catch (err) {
      console.error('[GvgsEfficiencyReportTable] Lỗi chụp ảnh:', err);
      showNotification('Lỗi khi chụp ảnh báo cáo.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-fade-in">
      {/* 1. THANH ĐIỀU KHIỂN & CHỌN CHẾ ĐỘ XEM */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle 2 chế độ xem */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveSubView('cluster')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
              activeSubView === 'cluster'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 size={16} />
            <span>Hiệu Quả Khai Thác Cụm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
              activeSubView === 'products'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Tổng Hợp Sản Phẩm GVGS ({displayProducts.length})</span>
          </button>
        </div>

        {/* Nút tác vụ: Chụp ảnh & Xuất Excel & Sửa số liệu */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeSubView === 'cluster' && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                title="Sửa số lượng siêu thị hoặc dán dữ liệu từ Excel"
              >
                <Edit3 size={15} />
                <span>Sửa Số Liệu</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                title="Khôi phục số liệu mẫu Cụm Cà Mau"
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={handleCaptureImage}
            disabled={isCapturing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Camera size={16} className={isCapturing ? 'animate-pulse' : ''} />
            <span>{isCapturing ? 'Đang chụp...' : 'Chụp Ảnh Báo Cáo'}</span>
          </button>
        </div>
      </div>

      {/* 2. CẤU HÌNH NHANH TIÊU ĐỀ BÁO CÁO (REALTIME, NHÓM, CỤM) */}
      <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center gap-3">
        {/* Nhập / Chọn giờ realtime */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <Clock size={15} className="text-blue-600 shrink-0" />
          <span className="text-[11px] font-black text-slate-500 uppercase whitespace-nowrap">Đến:</span>
          <input
            type="text"
            value={reportTime}
            onChange={(e) => {
              setReportTime(e.target.value);
              localStorage.setItem('gvgs_report_time', e.target.value);
            }}
            className="w-16 font-mono text-xs font-black text-blue-700 bg-transparent focus:outline-none"
            placeholder="12:39"
          />
          <button
            type="button"
            onClick={handleSetCurrentTime}
            className="text-[10px] font-bold text-blue-600 hover:underline px-1 cursor-pointer"
            title="Lấy giờ hiện hành của máy"
          >
            Realtime
          </button>
        </div>

        {/* Chọn nhóm hàng */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex-1 min-w-[220px]">
          <Layers size={15} className="text-amber-600 shrink-0" />
          <span className="text-[11px] font-black text-slate-500 uppercase whitespace-nowrap">Nhóm:</span>
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              localStorage.setItem('gvgs_selected_group', e.target.value);
            }}
            className="w-full text-xs font-black text-slate-800 bg-transparent focus:outline-none cursor-pointer"
          >
            {PRESET_GROUPS.map(grp => (
              <option key={grp} value={grp}>{grp}</option>
            ))}
          </select>
        </div>

        {/* Tên Cụm */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <Building2 size={15} className="text-emerald-600 shrink-0" />
          <span className="text-[11px] font-black text-slate-500 uppercase whitespace-nowrap">Khu vực:</span>
          <input
            type="text"
            value={customClusterTitle}
            onChange={(e) => {
              setCustomClusterTitle(e.target.value);
              localStorage.setItem('gvgs_cluster_title', e.target.value);
            }}
            className="w-28 text-xs font-black text-slate-800 bg-transparent focus:outline-none"
            placeholder="CỤM CÀ MAU"
          />
        </div>

        {/* Khi xem danh mục sản phẩm: filter chips */}
        {activeSubView === 'products' && (
          <div className="flex items-center gap-1.5 flex-wrap w-full pt-1 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-500 uppercase mr-1">Bộ lọc:</span>
            <button
              type="button"
              onClick={() => setProductCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                productCategoryFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Tất Cả ({displayProducts.length})
            </button>
            {uniqueCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setProductCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  productCategoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat} ({displayProducts.filter(p => p.nhomHang === cat).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. BẢNG HIỂN THỊ CHÍNH (THEO MẪU ẢNH CHUẨN 100%) */}
      {activeSubView === 'cluster' ? (
        /* =================== VIEW 1: BÁO CÁO CỤM CÀ MAU (CHUẨN ẢNH) =================== */
        <div className="w-full flex justify-center overflow-x-auto pb-4">
          <div 
            ref={clusterTableCaptureRef}
            className="w-full max-w-[960px] min-w-[760px] bg-white rounded-none border border-slate-300 shadow-none overflow-hidden font-sans"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Banner Tiêu Đề Xanh Dương Chuẩn 100% Theo Ảnh */}
            <div 
              className="px-6 py-6 sm:px-8 sm:py-7 text-white select-none"
              style={{ 
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)',
                boxSizing: 'border-box'
              }}
            >
              <div className="text-[13px] sm:text-[15px] font-black uppercase tracking-wider text-blue-100 opacity-95">
                BÁO CÁO REALTIME ĐẾN {reportTime}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mt-1 leading-tight">
                HIỆU QUẢ KHAI THÁC
              </h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white mt-0.5 leading-tight">
                {selectedGroup} - {customClusterTitle}
              </h2>
            </div>

            {/* Bảng Dữ Liệu Với Màu Vàng Cát Đặc Trưng */}
            <div className="w-full overflow-hidden">
              <table 
                className="w-full border-collapse text-left"
                style={{ 
                  tableLayout: 'fixed',
                  width: '100%'
                }}
              >
                <colgroup>
                  <col style={{ width: '13%' }} />  {/* TỈNH */}
                  <col style={{ width: '9%' }} />   {/* KÊNH */}
                  <col style={{ width: '16%' }} />  {/* BOSS */}
                  <col style={{ width: '36%' }} />  {/* SIÊU THỊ */}
                  <col style={{ width: '11%' }} />  {/* S.L MLN */}
                  <col style={{ width: '7%' }} />   {/* S.L GÓI */}
                  <col style={{ width: '8%' }} />   {/* TỈ LỆ */}
                </colgroup>

                {/* THEAD MÀU VÀNG CÁT/VÀNG BE THEO ẢNH */}
                <thead>
                  <tr 
                    style={{ 
                      backgroundColor: '#fae1af',
                      color: '#451a03',
                      borderBottom: '2px solid #e2c48d'
                    }}
                  >
                    <th className="py-3 px-3 text-[12px] sm:text-[13px] font-black uppercase tracking-tight align-middle">
                      TỈNH
                    </th>
                    <th className="py-3 px-2 text-[12px] sm:text-[13px] font-black uppercase tracking-tight align-middle">
                      KÊNH
                    </th>
                    <th className="py-3 px-3 text-[12px] sm:text-[13px] font-black uppercase tracking-tight align-middle">
                      BOSS
                    </th>
                    <th className="py-3 px-3 text-[12px] sm:text-[13px] font-black uppercase tracking-tight align-middle">
                      SIÊU THỊ
                    </th>
                    <th className="py-2 px-1 text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tighter text-center align-middle leading-[1.15]">
                      <div>S.L</div>
                      <div>{col5Name.includes('MLN') ? 'MLN' : 'SP'}</div>
                      <div className="text-[9.5px] sm:text-[10px]">CÓ THỂ</div>
                      <div className="text-[9.5px] sm:text-[10px]">BÁN LÕI</div>
                    </th>
                    <th className="py-2 px-1 text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tighter text-center align-middle leading-[1.15]">
                      <div>S.L</div>
                      <div>GÓI</div>
                      <div>LÕI</div>
                    </th>
                    <th className="py-2 px-1 text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-tighter text-center align-middle leading-[1.15]">
                      <div>TỈ LỆ</div>
                      <div>KHAI</div>
                      <div>THÁC</div>
                    </th>
                  </tr>
                </thead>

                {/* TBODY CÁC DÒNG SIÊU THỊ */}
                <tbody className="bg-white">
                  {clusterRows.map((row, idx) => {
                    const rate = row.slCoTheBan > 0 ? Math.round((row.slGoi / row.slCoTheBan) * 100) : 0;
                    const isZeroRate = rate === 0;

                    return (
                      <tr 
                        key={row.id}
                        className="hover:bg-amber-50/20 transition-colors"
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 1 ? '#fafaf9' : '#ffffff'
                        }}
                      >
                        {/* TỈNH (Xanh đen đậm) */}
                        <td className="py-2.5 px-3 text-[12px] sm:text-[13px] font-black text-[#1e3a8a] truncate">
                          {row.tinh}
                        </td>

                        {/* KÊNH (Màu xanh dương đậm đặc trưng: ĐML, ĐMM, ĐMS) */}
                        <td className="py-2.5 px-2 text-[12px] sm:text-[13px] font-black text-[#0284c7]">
                          {row.kenh}
                        </td>

                        {/* BOSS (Tên_MãNV đậm) */}
                        <td className="py-2.5 px-3 text-[12px] sm:text-[13px] font-black text-[#1e3a8a] truncate">
                          {row.boss}
                        </td>

                        {/* SIÊU THỊ (Mã kho - Tên - Địa chỉ) */}
                        <td className="py-2.5 px-3 text-[11.5px] sm:text-[12.5px] font-bold text-[#0f172a] truncate" title={row.sieuThi}>
                          {row.sieuThi}
                        </td>

                        {/* S.L MLN / SP CHÍNH */}
                        <td className="py-2.5 px-1 text-[13px] sm:text-[14px] font-black text-[#0f172a] text-center">
                          {row.slCoTheBan}
                        </td>

                        {/* S.L GÓI LÕI / GVGS */}
                        <td className="py-2.5 px-1 text-[13px] sm:text-[14px] font-black text-[#0f172a] text-center">
                          {row.slGoi}
                        </td>

                        {/* TỈ LỆ KHAI THÁC (0% ĐỎ, 100% XANH LÁ) */}
                        <td 
                          className="py-2.5 px-1 text-[12.5px] sm:text-[13.5px] font-black text-center"
                          style={{ color: isZeroRate ? '#dc2626' : '#16a34a' }}
                        >
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* TFOOT DÒNG TỔNG KẾT NỀN VÀNG BE */}
                <tfoot>
                  <tr 
                    style={{ 
                      backgroundColor: '#fae1af',
                      color: '#451a03',
                      borderTop: '2px solid #e2c48d'
                    }}
                  >
                    <td 
                      colSpan={4} 
                      className="py-3 px-4 text-[13px] sm:text-[14px] font-black uppercase tracking-tight"
                    >
                      TỔNG {customClusterTitle}
                    </td>
                    <td className="py-3 px-1 text-[13.5px] sm:text-[15px] font-black text-center text-[#451a03]">
                      {clusterSummary.totalCol5}
                    </td>
                    <td className="py-3 px-1 text-[13.5px] sm:text-[15px] font-black text-center text-[#451a03]">
                      {clusterSummary.totalCol6}
                    </td>
                    <td 
                      className="py-3 px-1 text-[13px] sm:text-[14.5px] font-black text-center"
                      style={{ color: clusterSummary.totalRate > 0 ? '#16a34a' : '#dc2626' }}
                    >
                      {clusterSummary.totalRate}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* =================== VIEW 2: BẢNG TỔNG HỢP DANH MỤC SẢN PHẨM GVGS =================== */
        <div className="w-full flex justify-center overflow-x-auto pb-4">
          <div 
            ref={productsTableCaptureRef}
            className="w-full max-w-[960px] min-w-[760px] bg-white rounded-none border border-slate-300 shadow-none overflow-hidden font-sans"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Banner Tiêu Đề */}
            <div 
              className="px-6 py-6 sm:px-8 sm:py-7 text-white select-none"
              style={{ 
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)',
                boxSizing: 'border-box'
              }}
            >
              <div className="text-[13px] sm:text-[15px] font-black uppercase tracking-wider text-blue-100 opacity-95">
                BÁO CÁO REALTIME ĐẾN {reportTime}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mt-1 leading-tight">
                TỔNG HỢP CÁC SẢN PHẨM TRONG NHÓM
              </h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white mt-0.5 leading-tight">
                {productCategoryFilter === 'ALL' ? 'TẤT CẢ SẢN PHẨM GVGS' : productCategoryFilter} - {customClusterTitle}
              </h2>
            </div>

            {/* Bảng Danh Sách Sản Phẩm */}
            <div className="w-full overflow-hidden">
              <table 
                className="w-full border-collapse text-left"
                style={{ 
                  tableLayout: 'fixed',
                  width: '100%'
                }}
              >
                <colgroup>
                  <col style={{ width: '5%' }} />   {/* STT */}
                  <col style={{ width: '15%' }} />  {/* NHÓM */}
                  <col style={{ width: '16%' }} />  {/* MÃ SP */}
                  <col style={{ width: '34%' }} />  {/* TÊN SP */}
                  <col style={{ width: '11%' }} />  {/* GIÁ NY */}
                  <col style={{ width: '11%' }} />  {/* GIÁ KM */}
                  <col style={{ width: '8%' }} />   {/* % GIẢM */}
                </colgroup>

                <thead>
                  <tr 
                    style={{ 
                      backgroundColor: '#fae1af',
                      color: '#451a03',
                      borderBottom: '2px solid #e2c48d'
                    }}
                  >
                    <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-center">STT</th>
                    <th className="py-3 px-3 text-[11px] sm:text-[12px] font-black uppercase tracking-tight">NHÓM HÀNG</th>
                    <th className="py-3 px-3 text-[11px] sm:text-[12px] font-black uppercase tracking-tight">MÃ SẢN PHẨM</th>
                    <th className="py-3 px-3 text-[11px] sm:text-[12px] font-black uppercase tracking-tight">TÊN SẢN PHẨM</th>
                    <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-right">GIÁ BÁN NY</th>
                    <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-right text-red-700">GIÁ KM GVGS</th>
                    <th className="py-3 px-2 text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-center text-emerald-800">% GIẢM</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {filteredProducts.map((p, idx) => {
                    const discount = p.giaNy - p.giaKm;
                    const discountRate = p.giaNy > 0 ? Math.round((discount / p.giaNy) * 100) : 0;

                    return (
                      <tr 
                        key={p.id || idx}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 1 ? '#fafaf9' : '#ffffff'
                        }}
                      >
                        <td className="py-2.5 px-2 text-[12px] font-bold text-slate-500 text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-[11.5px] font-black text-[#0284c7] uppercase truncate">
                          {p.nhomHang}
                        </td>
                        <td className="py-2.5 px-3 text-[11.5px] font-mono font-bold text-indigo-700 truncate">
                          {p.maSp}
                        </td>
                        <td className="py-2.5 px-3 text-[11.5px] font-bold text-[#0f172a] truncate" title={p.tenSp}>
                          {p.tenSp}
                        </td>
                        <td className="py-2.5 px-2 text-[12px] font-medium text-slate-600 text-right">
                          {p.giaNy > 0 ? p.giaNy.toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-[12.5px] font-black text-red-600 text-right">
                          {p.giaKm > 0 ? p.giaKm.toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-[12px] font-black text-emerald-600 text-center">
                          -{discountRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr 
                    style={{ 
                      backgroundColor: '#fae1af',
                      color: '#451a03',
                      borderTop: '2px solid #e2c48d'
                    }}
                  >
                    <td colSpan={4} className="py-3 px-4 text-[13px] font-black uppercase tracking-tight">
                      TỔNG CỘNG: {filteredProducts.length} SẢN PHẨM GVGS
                    </td>
                    <td className="py-3 px-2 text-[12.5px] font-black text-right">
                      {filteredProducts.reduce((sum, p) => sum + p.giaNy, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-2 text-[13px] font-black text-right text-red-700">
                      {filteredProducts.reduce((sum, p) => sum + p.giaKm, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-2 text-[12.5px] font-black text-center text-emerald-800">
                      {filteredProducts.length > 0 ? (
                        `-${Math.round((filteredProducts.reduce((sum, p) => sum + (p.giaNy - p.giaKm), 0) / Math.max(1, filteredProducts.reduce((sum, p) => sum + p.giaNy, 0))) * 100)}%`
                      ) : '0%'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL CHỈNH SỬA / DÁN DỮ LIỆU TỪ EXCEL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    CHỈNH SỬA DỮ LIỆU HIỆU QUẢ KHAI THÁC
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sửa trực tiếp các siêu thị hoặc dán dữ liệu từ bảng Excel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Danh sách siêu thị & ô chỉnh sửa */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-black uppercase text-slate-400 px-2">
                <div className="col-span-2">TỈNH</div>
                <div className="col-span-2">KÊNH / BOSS</div>
                <div className="col-span-4">SIÊU THỊ</div>
                <div className="col-span-2 text-center">S.L CHÍNH</div>
                <div className="col-span-2 text-center">S.L GÓI</div>
              </div>

              {clusterRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl text-xs">
                  <div className="col-span-2 font-bold text-slate-700 truncate">{row.tinh}</div>
                  <div className="col-span-2 font-bold text-blue-600 truncate">{row.kenh} • {row.boss}</div>
                  <div className="col-span-4 font-bold text-slate-800 truncate" title={row.sieuThi}>{row.sieuThi}</div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      value={row.slCoTheBan}
                      onChange={(e) => handleUpdateRowQuantity(row.id, 'slCoTheBan', parseInt(e.target.value) || 0)}
                      className="w-full text-center bg-white border border-slate-200 py-1 rounded-lg font-black text-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      value={row.slGoi}
                      onChange={(e) => handleUpdateRowQuantity(row.id, 'slGoi', parseInt(e.target.value) || 0)}
                      className="w-full text-center bg-white border border-slate-200 py-1 rounded-lg font-black text-blue-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dán từ Excel */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-600 uppercase flex items-center justify-between">
                <span>Dán từ bảng Excel (Tùy chọn)</span>
                <span className="text-[10px] text-slate-400 lowercase font-normal">(Cột: Tỉnh | Kênh | Boss | Siêu thị | S.L chính | S.L gói)</span>
              </label>
              <textarea
                rows={3}
                value={pasteTextInput}
                onChange={(e) => setPasteTextInput(e.target.value)}
                placeholder="Dán hàng loạt dòng từ bảng tính Excel tại đây..."
                className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {pasteTextInput.trim() && (
                <button
                  type="button"
                  onClick={handleApplyPastedText}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Áp Dụng Dữ Liệu Dán
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL XEM TRƯỚC VÀ TẢI ẢNH */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default GvgsEfficiencyReportTable;
