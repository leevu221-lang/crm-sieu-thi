import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  Printer, 
  UploadCloud, 
  FileText, 
  Copy, 
  Trash2, 
  Plus, 
  Search, 
  Check, 
  CheckSquare, 
  Square, 
  Settings, 
  Eye, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Scissors, 
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  Store,
  Tag,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Minus
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { useStore } from '../../../contexts/StoreContext';
import { useNotification } from '../../../contexts/NotificationContext';

export interface QrProductItem {
  id: string;
  productCode: string; // Mã sản phẩm
  productName: string; // Tên sản phẩm
  nganhHang?: string; // Ngành hàng
  nhomHang?: string; // Nhóm hàng
  imei?: string; // IMEI_1
  status?: string; // Trạng thái sản phẩm
  quantity: number; // Số lượng tem cần in
  selected: boolean; // Chọn để in
}

export interface QrPrintConfig {
  layoutCols: '2' | '3' | '4'; // 2, 3 hoặc 4 cột trên trang A4
  qrSize: number; // Kích thước QR (px)
  fontSize: number; // Cỡ chữ tên sản phẩm (px)
  showCodeText: boolean; // Hiển thị số mã SP bên dưới QR
  showProductName: boolean; // Hiển thị tên SP
  showImei: boolean; // Hiển thị IMEI nếu có
  showStoreName: boolean; // Hiển thị tên siêu thị/brand trên đầu tem
  storeNameText: string; // Tên hiển thị
  borderStyle: 'dashed' | 'solid' | 'none'; // Viền tem
  textAlign: 'center' | 'left'; // Căn lề chữ
}

export const SAMPLE_PRODUCTS: QrProductItem[] = [
  {
    id: 'sample-1',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3052959000401',
    productName: 'Mô hình Tủ lạnh Panasonic NR-MBX471GPK -2021',
    imei: '141K00132',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-2',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3052959000356',
    productName: 'Mô hình Tủ lạnh Panasonic NR-MKBA190PP -2020',
    imei: '0X3P00218',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-3',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3051097001907',
    productName: 'Mô hình Tủ lạnh Panasonic NR-MTV261BPK -2021',
    imei: '162K00371',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-4',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3052959000411',
    productName: 'Mô hình Tủ lạnh Panasonic NR-MTV341VGM -2021',
    imei: '162M00096',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-5',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3052959000440',
    productName: 'Mô hình Tủ lạnh Panasonic NR-MTX461GPK -2021',
    imei: '1X1K00254',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-6',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3052959000568',
    productName: 'Mô hình Tủ đông Hòa Phát 245 lít HPF BD6245',
    imei: '23614U9P331437',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-7',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '3052959000573',
    productName: 'Mô hình Tủ đông Hòa Phát 352 lít HPF AD6352',
    imei: '23614Y9P156505',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-8',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '1750893000048',
    productName: 'Mô hình Tủ đông Sanaky Inverter VH-6699W3/MH',
    imei: 'D39MH1A2D000050',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-9',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '1750893000038',
    productName: 'Mô hình Tủ đông Sanaky VH-162HY2/MH',
    imei: 'D28MH1A2D000035',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
  {
    id: 'sample-10',
    nganhHang: '1755 - Tủ lạnh, đông, mát',
    nhomHang: '6421 - Mô hình tủ lạnh, đông, mát',
    productCode: '1756421000003',
    productName: 'Mô hình Tủ Đông Sanaky VH-255HY2/MH',
    imei: 'C63MH1A2D000011',
    status: '3 - Trưng bày',
    quantity: 1,
    selected: true,
  },
];

const DEFAULT_CONFIG: QrPrintConfig = {
  layoutCols: '3', // 3 cột x 5 hàng = 15 tem / trang A4 (khuyên dùng)
  qrSize: 85,
  fontSize: 11,
  showCodeText: true,
  showProductName: true,
  showImei: true,
  showStoreName: false,
  storeNameText: 'ĐIỆN MÁY XANH',
  borderStyle: 'dashed',
  textAlign: 'center',
};

const STORAGE_PRODUCTS_KEY = 'crm_tienich_in_qr_sp_products';
const STORAGE_CONFIG_KEY = 'crm_tienich_in_qr_sp_config';

export const InQrSpTab: React.FC = () => {
  const { currentStoreId } = useStore();
  const { showNotification } = useNotification();

  // 1. Danh sách sản phẩm
  const [products, setProducts] = useState<QrProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SAMPLE_PRODUCTS;
  });

  // 2. Cấu hình in
  const [config, setConfig] = useState<QrPrintConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CONFIG;
  });

  // Tự động lưu vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  // Bộ lọc tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  // Tab điều khiển bên trái: 'list' | 'settings' | 'add'
  const [activeLeftTab, setActiveLeftTab] = useState<'list' | 'settings' | 'add'>('list');
  // Modal Dán dữ liệu Excel
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  // Modal In toàn màn hình
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  // Xem trước trang hiện tại
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const [isExportingImage, setIsExportingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Form thêm nhanh sản phẩm
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newImei, setNewImei] = useState('');
  const [newNganh, setNewNganh] = useState('');
  const [newNhom, setNewNhom] = useState('');

  // Lọc sản phẩm hiển thị trong bảng danh sách
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(
      p =>
        p.productCode.toLowerCase().includes(term) ||
        p.productName.toLowerCase().includes(term) ||
        (p.imei && p.imei.toLowerCase().includes(term)) ||
        (p.nhomHang && p.nhomHang.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  // Danh sách tem cần in (được chọn + nhân bản theo quantity)
  const printQueue = useMemo(() => {
    const queue: QrProductItem[] = [];
    products
      .filter(p => p.selected)
      .forEach(p => {
        const qty = Math.max(1, p.quantity || 1);
        for (let i = 0; i < qty; i++) {
          queue.push(p);
        }
      });
    return queue;
  }, [products]);

  // Số tem trên 1 trang A4 tùy theo layoutCols
  const itemsPerPage = useMemo(() => {
    if (config.layoutCols === '2') return 8; // 2 cột x 4 hàng = 8
    if (config.layoutCols === '4') return 24; // 4 cột x 6 hàng = 24
    return 15; // 3 cột x 5 hàng = 15 (mặc định)
  }, [config.layoutCols]);

  // Phân chia tem thành các trang A4
  const pages = useMemo(() => {
    if (printQueue.length === 0) return [];
    const result: QrProductItem[][] = [];
    for (let i = 0; i < printQueue.length; i += itemsPerPage) {
      result.push(printQueue.slice(i, i + itemsPerPage));
    }
    return result;
  }, [printQueue, itemsPerPage]);

  const totalPages = Math.max(1, pages.length);

  useEffect(() => {
    if (currentPreviewPage > totalPages) {
      setCurrentPreviewPage(totalPages);
    }
  }, [totalPages, currentPreviewPage]);

  // ─── Xử lý Import dữ liệu từ mảng 2D (Excel hoặc Paste) ───
  const parseRawRows = (rows: any[][], overwrite: boolean = false) => {
    if (!rows || rows.length === 0) {
      showNotification('Dữ liệu trống, vui lòng kiểm tra lại!', 'error');
      return;
    }

    let headerRowIdx = -1;
    let codeCol = -1;
    let nameCol = -1;
    let imeiCol = -1;
    let nganhCol = -1;
    let nhomCol = -1;
    let statusCol = -1;

    // Quét tìm dòng tiêu đề
    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = (rows[r] || []).map(c => String(c ?? '').trim().toLowerCase());
      const cIdx = row.findIndex(cell => 
        cell.includes('mã sản phẩm') || cell.includes('mã sp') || cell.includes('masp') || 
        cell.includes('barcode') || cell.includes('product code') || cell.includes('sku') || cell === 'mã'
      );
      const nIdx = row.findIndex(cell => 
        cell.includes('tên sản phẩm') || cell.includes('tên sp') || cell.includes('tensp') || 
        cell.includes('product name') || cell.includes('tên hàng') || cell.includes('model') || cell === 'tên'
      );

      if (cIdx !== -1 || nIdx !== -1) {
        headerRowIdx = r;
        codeCol = cIdx;
        nameCol = nIdx;
        imeiCol = row.findIndex(cell => cell.includes('imei') || cell.includes('serial') || cell.includes('seri'));
        nganhCol = row.findIndex(cell => cell.includes('ngành'));
        nhomCol = row.findIndex(cell => cell.includes('nhóm'));
        statusCol = row.findIndex(cell => cell.includes('trạng thái') || cell.includes('status'));
        break;
      }
    }

    const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
    const newItems: QrProductItem[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) continue;

      let pCode = '';
      let pName = '';
      let pImei = '';
      let pNganh = '';
      let pNhom = '';
      let pStatus = '';

      if (codeCol !== -1 && row[codeCol] !== undefined) pCode = String(row[codeCol] ?? '').trim();
      if (nameCol !== -1 && row[nameCol] !== undefined) pName = String(row[nameCol] ?? '').trim();
      if (imeiCol !== -1 && row[imeiCol] !== undefined) pImei = String(row[imeiCol] ?? '').trim();
      if (nganhCol !== -1 && row[nganhCol] !== undefined) pNganh = String(row[nganhCol] ?? '').trim();
      if (nhomCol !== -1 && row[nhomCol] !== undefined) pNhom = String(row[nhomCol] ?? '').trim();
      if (statusCol !== -1 && row[statusCol] !== undefined) pStatus = String(row[statusCol] ?? '').trim();

      // Heuristic fallback nếu không có header chuẩn
      if (!pCode || !pName) {
        const nonEmpties = row.map(c => String(c ?? '').trim()).filter(Boolean);
        if (!pCode) {
          const codeCand = nonEmpties.find(val => /^\d{6,16}$/.test(val));
          if (codeCand) pCode = codeCand;
          else if (nonEmpties.length > 0) pCode = nonEmpties[0];
        }
        if (!pName) {
          const nameCand = [...nonEmpties]
            .filter(val => val !== pCode && /[a-zA-ZÀ-ỹ]/.test(val))
            .sort((a, b) => b.length - a.length)[0];
          if (nameCand) pName = nameCand;
          else if (nonEmpties.length > 1) pName = nonEmpties[1];
        }
      }

      if (pCode || pName) {
        newItems.push({
          id: `qr_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          productCode: pCode || 'N/A',
          productName: pName || 'Chưa có tên sản phẩm',
          imei: pImei,
          nganhHang: pNganh,
          nhomHang: pNhom,
          status: pStatus,
          quantity: 1,
          selected: true,
        });
      }
    }

    if (newItems.length === 0) {
      showNotification('Không tìm thấy dòng sản phẩm hợp lệ nào trong dữ liệu!', 'warning');
      return;
    }

    if (overwrite) {
      setProducts(newItems);
      showNotification(`Đã nạp mới ${newItems.length} sản phẩm thành công!`, 'success');
    } else {
      setProducts(prev => [...prev, ...newItems]);
      showNotification(`Đã thêm ${newItems.length} sản phẩm vào danh sách!`, 'success');
    }
  };

  // Nạp dữ liệu mẫu
  const handleLoadSample = () => {
    setProducts(SAMPLE_PRODUCTS);
    showNotification('Đã nạp 10 sản phẩm mẫu tủ lạnh / tủ đông!', 'success');
  };

  // Upload file Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        parseRawRows(jsonData, true);
      } catch (err) {
        console.error('Lỗi đọc file Excel:', err);
        showNotification('Lỗi định dạng file Excel, vui lòng thử lại!', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Xử lý dán text từ Excel
  const handleApplyPasteText = (overwrite: boolean = false) => {
    if (!pasteText.trim()) {
      showNotification('Vui lòng dán dữ liệu vào ô trước khi áp dụng!', 'warning');
      return;
    }
    const lines = pasteText.split(/\r?\n/).filter(line => line.trim());
    const rawRows = lines.map(line => line.split('\t'));
    parseRawRows(rawRows, overwrite);
    setPasteText('');
    setIsPasteModalOpen(false);
  };

  // Đọc từ clipboard trực tiếp
  const handlePasteFromClipboardDirectly = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setPasteText(text);
          setIsPasteModalOpen(true);
          return;
        }
      }
    } catch {}
    setIsPasteModalOpen(true);
  };

  // Thêm nhanh thủ công 1 sản phẩm
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() && !newName.trim()) {
      showNotification('Vui lòng nhập Mã sản phẩm hoặc Tên sản phẩm!', 'warning');
      return;
    }
    const item: QrProductItem = {
      id: `manual_${Date.now()}`,
      productCode: newCode.trim() || 'N/A',
      productName: newName.trim() || 'Sản phẩm mới',
      imei: newImei.trim(),
      nganhHang: newNganh.trim(),
      nhomHang: newNhom.trim(),
      quantity: 1,
      selected: true,
    };
    setProducts(prev => [item, ...prev]);
    setNewCode('');
    setNewName('');
    setNewImei('');
    setNewNganh('');
    setNewNhom('');
    showNotification(`Đã thêm mã "${item.productCode}"!`, 'success');
  };

  // Tăng giảm số lượng tem
  const handleUpdateQty = (id: string, delta: number) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const next = Math.max(1, Math.min(99, (p.quantity || 1) + delta));
          return { ...p, quantity: next };
        }
        return p;
      })
    );
  };

  // Chọn / bỏ chọn 1 sản phẩm
  const handleToggleSelect = (id: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  // Chọn tất cả / Bỏ chọn tất cả
  const handleToggleSelectAll = (select: boolean) => {
    setProducts(prev => prev.map(p => ({ ...p, selected: select })));
  };

  // Xóa 1 sản phẩm
  const handleDeleteItem = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Xóa toàn bộ danh sách
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong danh sách hiện tại?')) {
      setProducts([]);
      showNotification('Đã xóa toàn bộ danh sách sản phẩm!', 'info');
    }
  };

  // Kích hoạt In
  const handleTriggerPrint = () => {
    if (printQueue.length === 0) {
      showNotification('Chưa có sản phẩm nào được chọn để in!', 'warning');
      return;
    }
    setIsPrintModalOpen(true);
  };

  // Xuất ảnh PNG trang xem trước
  const handleExportPng = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExportingImage(true);
      const dataUrl = await domToPng(printAreaRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `tem_qr_sp_trang_${currentPreviewPage}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showNotification('Đã tải ảnh tem QR thành công!', 'success');
    } catch (err) {
      console.error('Lỗi xuất ảnh:', err);
      showNotification('Không thể xuất ảnh, vui lòng thử lại!', 'error');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Render một tem QR sản phẩm
  const renderQrSticker = (item: QrProductItem, index: number, isPrintMode: boolean = false) => {
    const borderClass =
      config.borderStyle === 'dashed'
        ? 'border border-dashed border-slate-400'
        : config.borderStyle === 'solid'
        ? 'border border-slate-300'
        : 'border-0';

    return (
      <div
        key={`${item.id}_${index}`}
        className={`qr-item-card relative bg-white flex flex-col items-center justify-between p-2.5 rounded-lg transition-all ${borderClass} ${
          isPrintMode ? 'break-inside-avoid' : 'hover:shadow-md'
        }`}
        style={{
          boxSizing: 'border-box',
          minHeight: config.layoutCols === '2' ? '64mm' : config.layoutCols === '4' ? '44mm' : '52mm',
        }}
      >
        {/* Đường cắt kéo trang trí nếu viền nét đứt (chỉ hiển thị xem trước) */}
        {!isPrintMode && config.borderStyle === 'dashed' && (
          <div className="absolute -top-2.5 left-2 bg-white px-1 text-slate-300 text-[9px] flex items-center gap-0.5 pointer-events-none">
            <Scissors size={10} className="text-slate-400" />
            <span>cắt</span>
          </div>
        )}

        {/* Tiêu đề cửa hàng / thương hiệu */}
        {config.showStoreName && (
          <div className="w-full text-center pb-1 border-b border-slate-100">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider">
              {config.storeNameText || currentStoreId || 'ĐIỆN MÁY XANH'}
            </span>
          </div>
        )}

        {/* Khối Mã QR */}
        <div className="flex-1 flex items-center justify-center py-1">
          <div className="p-1 bg-white rounded">
            <QRCode
              value={item.productCode}
              size={config.qrSize}
              level="M"
              style={{
                height: 'auto',
                maxWidth: '100%',
                width: `${config.qrSize}px`,
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Khối Thông tin bên dưới QR */}
        <div className={`w-full flex flex-col pt-1 ${config.textAlign === 'center' ? 'items-center text-center' : 'items-start text-left'}`}>
          {/* Mã sản phẩm */}
          {config.showCodeText && (
            <div className="font-mono font-black text-slate-900 tracking-wider text-[11.5px] sm:text-[12.5px] leading-tight select-all">
              {item.productCode}
            </div>
          )}

          {/* Tên sản phẩm */}
          {config.showProductName && (
            <div
              className="font-bold text-slate-800 line-clamp-2 mt-0.5 leading-snug w-full"
              style={{ fontSize: `${config.fontSize}px` }}
              title={item.productName}
            >
              {item.productName}
            </div>
          )}

          {/* IMEI (nếu có và bật) */}
          {config.showImei && item.imei && (
            <div className="text-[9px] text-slate-500 font-medium mt-0.5 line-clamp-1">
              IMEI: <span className="font-mono font-bold text-slate-700">{item.imei}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render lưới tem cho 1 trang A4
  const renderPageSheet = (pageItems: QrProductItem[], pageIdx: number, isPrintMode: boolean = false) => {
    const gridColsClass =
      config.layoutCols === '2'
        ? 'grid-cols-2'
        : config.layoutCols === '4'
        ? 'grid-cols-4'
        : 'grid-cols-3';

    return (
      <div
        key={`page_${pageIdx}`}
        className={`print-page-sheet bg-white mx-auto relative ${
          isPrintMode
            ? 'w-[210mm] h-[296mm] p-[8mm] box-border overflow-hidden'
            : 'w-full max-w-[794px] min-h-[1123px] p-6 shadow-xl border border-slate-200 rounded-xl mb-8'
        }`}
        style={{
          boxSizing: 'border-box',
          pageBreakAfter: isPrintMode ? 'always' : 'auto',
          breakAfter: isPrintMode ? 'page' : 'auto',
        }}
      >
        {/* Đánh dấu số trang trên bản xem trước */}
        {!isPrintMode && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2 text-sky-600 font-black">
              <QrCode size={14} />
              <span>Trang {pageIdx + 1} / {totalPages}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {pageItems.length} tem / trang ({config.layoutCols} cột)
            </span>
          </div>
        )}

        {/* Lưới các con tem */}
        <div className={`grid ${gridColsClass} gap-3 h-full`}>
          {pageItems.map((item, idx) => renderQrSticker(item, idx, isPrintMode))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Hidden File Input ── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* ── Banner Tiêu Đề & Hành Động Chính ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/25">
            <QrCode size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                IN MÃ QR SẢN PHẨM
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                TEM KỆ & MÔ HÌNH
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tạo và in hàng loạt mã QR từ cột Mã SP kèm tên sản phẩm bên dưới theo khổ giấy A4
            </p>
          </div>
        </div>

        {/* Nhóm nút tác vụ nhanh */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Nút Nạp dữ liệu mẫu */}
          <button
            onClick={handleLoadSample}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:border-slate-300"
            title="Nạp 10 sản phẩm mẫu tủ lạnh / tủ đông"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Nạp dữ liệu mẫu</span>
          </button>

          {/* Nút Dán từ Excel / Clipboard */}
          <button
            onClick={handlePasteFromClipboardDirectly}
            className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:border-sky-300"
            title="Dán dữ liệu copy từ Excel"
          >
            <Copy size={14} className="text-sky-600" />
            <span>Dán từ Excel</span>
          </button>

          {/* Nút Tải file Excel */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:border-emerald-300"
            title="Tải lên file Excel (.xlsx, .xls, .csv)"
          >
            <UploadCloud size={14} className="text-emerald-600" />
            <span>Chọn file Excel</span>
          </button>

          {/* Nút In Ngay */}
          <button
            onClick={handleTriggerPrint}
            disabled={printQueue.length === 0}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-sky-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-auto lg:ml-0"
          >
            <Printer size={16} />
            <span>IN TEM NGAY ({printQueue.length})</span>
          </button>
        </div>
      </div>

      {/* ── Khu Vực Làm Việc Chính: 2 Cột Trên Laptop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── CỘT TRÁI: Dữ Liệu & Cài Đặt (5 cột lg:col-span-5) ── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card Tab Controls */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            
            {/* Header Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setActiveLeftTab('list')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Layers size={14} />
                <span>DANH SÁCH ({products.length})</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('settings')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'settings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Settings size={14} />
                <span>CÀI ĐẶT TEM</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('add')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'add'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Plus size={14} />
                <span>THÊM MÃ</span>
              </button>
            </div>

            {/* TAB 1: DANH SÁCH SẢN PHẨM */}
            {activeLeftTab === 'list' && (
              <div className="space-y-3">
                {/* Search & Actions toolbar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Tìm theo mã, tên SP, IMEI..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 font-medium"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Nút chọn tất cả */}
                  <button
                    onClick={() => handleToggleSelectAll(products.some(p => !p.selected))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer transition-colors"
                    title={products.every(p => p.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  >
                    {products.length > 0 && products.every(p => p.selected) ? (
                      <CheckSquare size={16} className="text-sky-600" />
                    ) : (
                      <Square size={16} className="text-slate-400" />
                    )}
                  </button>

                  {/* Nút xóa danh sách */}
                  {products.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="p-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold cursor-pointer transition-colors"
                      title="Xóa toàn bộ danh sách"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Badge Thống kê */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                  <span>
                    Đã chọn:{' '}
                    <strong className="text-sky-600 font-black">
                      {products.filter(p => p.selected).length}
                    </strong>{' '}
                    / {products.length} sản phẩm
                  </span>
                  <span>
                    Tổng tem cần in:{' '}
                    <strong className="text-indigo-600 font-black">{printQueue.length}</strong>{' '}
                    (Ước tính <strong className="text-emerald-600 font-black">{totalPages}</strong> trang A4)
                  </span>
                </div>

                {/* Danh sách cuộn sản phẩm */}
                <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      {products.length === 0 ? (
                        <div className="space-y-2">
                          <p className="font-bold text-slate-600">Chưa có sản phẩm nào</p>
                          <p className="text-[11px]">Bấm "Nạp dữ liệu mẫu" hoặc "Dán từ Excel" để bắt đầu.</p>
                        </div>
                      ) : (
                        'Không tìm thấy sản phẩm nào khớp với tìm kiếm.'
                      )}
                    </div>
                  ) : (
                    filteredProducts.map(p => (
                      <div
                        key={p.id}
                        className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 ${
                          p.selected
                            ? 'bg-sky-50/40 border-sky-200 hover:border-sky-300'
                            : 'bg-white border-slate-100 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSelect(p.id)}
                          className="mt-0.5 text-slate-400 hover:text-sky-600 cursor-pointer shrink-0"
                        >
                          {p.selected ? (
                            <CheckSquare size={16} className="text-sky-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>

                        {/* Thông tin */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-xs text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {p.productCode}
                            </span>
                            {p.imei && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                IMEI: {p.imei}
                              </span>
                            )}
                            {p.status && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {p.status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-2 leading-snug">
                            {p.productName}
                          </p>
                          {p.nhomHang && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {p.nhomHang}
                            </p>
                          )}
                        </div>

                        {/* Bộ đếm số lượng */}
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shrink-0 shadow-2xs">
                          <button
                            onClick={() => handleUpdateQty(p.id, -1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                            title="Giảm 1 tem"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-slate-800">
                            {p.quantity || 1}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(p.id, 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                            title="Tăng 1 tem"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        {/* Nút xóa */}
                        <button
                          onClick={() => handleDeleteItem(p.id)}
                          className="text-slate-300 hover:text-red-500 mt-0.5 cursor-pointer shrink-0 transition-colors p-1"
                          title="Xóa sản phẩm này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CÀI ĐẶT TEM & BỐ CỤC IN */}
            {activeLeftTab === 'settings' && (
              <div className="space-y-4 text-xs font-medium text-slate-700">
                
                {/* 1. Chọn bố cục lưới A4 */}
                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers size={13} className="text-sky-600" />
                    Bố cục in trên trang A4:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '3', label: '3 cột x 5 hàng', sub: '15 tem / trang', rec: true },
                      { id: '4', label: '4 cột x 6 hàng', sub: '24 tem / trang', rec: false },
                      { id: '2', label: '2 cột x 4 hàng', sub: '8 tem / trang', rec: false },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setConfig(prev => ({ ...prev, layoutCols: opt.id as any }))}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                          config.layoutCols === opt.id
                            ? 'bg-sky-50 border-sky-400 text-sky-900 font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt.rec && (
                          <span className="absolute -top-1.5 right-1.5 bg-emerald-500 text-white text-[8px] font-black uppercase px-1 rounded-sm">
                            Chuẩn
                          </span>
                        )}
                        <div className="text-xs font-black">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Kích thước mã QR */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <QrCode size={13} className="text-indigo-600" />
                      Kích thước mã QR:
                    </label>
                    <span className="text-[11px] font-mono font-bold text-indigo-600">{config.qrSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={140}
                    step={5}
                    value={config.qrSize}
                    onChange={e => setConfig(prev => ({ ...prev, qrSize: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Nhỏ (60px)</span>
                    <span>Chuẩn (85px)</span>
                    <span>Lớn (140px)</span>
                  </div>
                </div>

                {/* 3. Cỡ chữ tên sản phẩm */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <Tag size={13} className="text-emerald-600" />
                      Cỡ chữ tên sản phẩm:
                    </label>
                    <span className="text-[11px] font-mono font-bold text-emerald-600">{config.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={9}
                    max={14}
                    step={0.5}
                    value={config.fontSize}
                    onChange={e => setConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Nhỏ (9px)</span>
                    <span>Vừa (11px)</span>
                    <span>Lớn (14px)</span>
                  </div>
                </div>

                {/* 4. Viền tem & Căn lề */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Đường viền tem:</label>
                    <select
                      value={config.borderStyle}
                      onChange={e => setConfig(prev => ({ ...prev, borderStyle: e.target.value as any }))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="dashed">Nét đứt cắt kéo ✂️</option>
                      <option value="solid">Viền liền mỏng</option>
                      <option value="none">Không viền</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Căn lề nội dung:</label>
                    <select
                      value={config.textAlign}
                      onChange={e => setConfig(prev => ({ ...prev, textAlign: e.target.value as any }))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="center">Căn giữa (Center)</option>
                      <option value="left">Căn trái (Left)</option>
                    </select>
                  </div>
                </div>

                {/* 5. Tùy chọn hiển thị chi tiết */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-black text-slate-800 text-xs">Trường thông tin hiển thị trên tem:</label>
                  
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showCodeText}
                      onChange={e => setConfig(prev => ({ ...prev, showCodeText: e.target.checked }))}
                      className="rounded text-sky-600 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-800">Hiển thị dòng Mã SP dưới mã QR</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showProductName}
                      onChange={e => setConfig(prev => ({ ...prev, showProductName: e.target.checked }))}
                      className="rounded text-sky-600 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-800">Hiển thị Tên sản phẩm</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showImei}
                      onChange={e => setConfig(prev => ({ ...prev, showImei: e.target.checked }))}
                      className="rounded text-sky-600 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-800">Hiển thị IMEI (nếu có dữ liệu)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showStoreName}
                      onChange={e => setConfig(prev => ({ ...prev, showStoreName: e.target.checked }))}
                      className="rounded text-sky-600 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-800">Hiển thị Tiêu đề thương hiệu trên đầu tem</span>
                  </label>

                  {config.showStoreName && (
                    <input
                      type="text"
                      value={config.storeNameText}
                      onChange={e => setConfig(prev => ({ ...prev, storeNameText: e.target.value }))}
                      placeholder="VD: ĐIỆN MÁY XANH"
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase mt-1"
                    />
                  )}
                </div>

                {/* Reset to default */}
                <button
                  onClick={() => setConfig(DEFAULT_CONFIG)}
                  className="w-full py-2 text-slate-500 hover:text-slate-800 text-[11px] font-bold text-center underline cursor-pointer"
                >
                  Khôi phục cài đặt mặc định
                </button>
              </div>
            )}

            {/* TAB 3: THÊM NHANH THỦ CÔNG */}
            {activeLeftTab === 'add' && (
              <form onSubmit={handleQuickAdd} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-xs">Mã sản phẩm (*):</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    placeholder="VD: 3052959000401"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-xs">Tên sản phẩm (*):</label>
                  <textarea
                    rows={2}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="VD: Mô hình Tủ lạnh Panasonic NR-MBX471GPK -2021"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">IMEI (tùy chọn):</label>
                    <input
                      type="text"
                      value={newImei}
                      onChange={e => setNewImei(e.target.value)}
                      placeholder="VD: 141K00132"
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Nhóm hàng:</label>
                    <input
                      type="text"
                      value={newNhom}
                      onChange={e => setNewNhom(e.target.value)}
                      placeholder="VD: Tủ lạnh"
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus size={16} />
                  <span>THÊM VÀO DANH SÁCH</span>
                </button>
              </form>
            )}

          </div>

          {/* Hướng Dẫn Sử Dụng Nhanh */}
          <div className="bg-sky-50/60 rounded-3xl p-4 border border-sky-100 text-sky-900 space-y-2">
            <div className="flex items-center gap-2 font-black text-xs text-sky-800">
              <AlertCircle size={15} />
              <span>MẸO DÙNG EXCEL NHANH:</span>
            </div>
            <ul className="text-[11px] space-y-1 text-sky-700 list-disc pl-4 font-medium leading-relaxed">
              <li>Chỉ cần bôi đen và copy các cột từ Excel (gồm cột <strong>Mã SP</strong> và <strong>Tên SP</strong>) rồi bấm <strong>"Dán từ Excel"</strong>.</li>
              <li>Hệ thống tự động nhận diện các cột và loại bỏ khoảng trắng thừa.</li>
              <li>Dùng nút <strong>[+]</strong> và <strong>[-]</strong> để tăng giảm số lượng tem in cho từng sản phẩm.</li>
            </ul>
          </div>
        </div>

        {/* ── CỘT PHẢI: Xem Trước Bản In (Live Preview - 7 cột lg:col-span-7) ── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Thanh công cụ xem trước */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Eye size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  XEM TRƯỚC BẢN IN (A4)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  {printQueue.length} tem ({totalPages} trang A4)
                </p>
              </div>
            </div>

            {/* Điều hướng trang */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl">
                <button
                  onClick={() => setCurrentPreviewPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPreviewPage <= 1}
                  className="p-1 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-700 px-2">
                  Trang {currentPreviewPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPreviewPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPreviewPage >= totalPages}
                  className="p-1 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Xuất ảnh PNG & Nút In */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPng}
                disabled={isExportingImage || printQueue.length === 0}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Tải ảnh PNG trang này"
              >
                <Download size={14} />
                <span>{isExportingImage ? 'Đang xuất...' : 'Xuất ảnh PNG'}</span>
              </button>

              <button
                onClick={handleTriggerPrint}
                disabled={printQueue.length === 0}
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-sky-500/20 cursor-pointer disabled:opacity-50"
              >
                <Printer size={14} />
                <span>In trang này</span>
              </button>
            </div>
          </div>

          {/* Vùng mô phỏng tờ giấy A4 */}
          <div className="bg-slate-100/70 p-4 sm:p-6 rounded-3xl border border-slate-200 overflow-x-auto flex justify-center">
            {pages.length === 0 ? (
              <div className="w-full max-w-[794px] min-h-[500px] bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <QrCode size={36} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-600">Chưa có tem nào được chọn để in</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Hãy đánh dấu chọn các sản phẩm bên danh sách hoặc bấm "Nạp dữ liệu mẫu" để xem trước bản in.
                  </p>
                </div>
              </div>
            ) : (
              <div ref={printAreaRef} className="w-full flex justify-center">
                {renderPageSheet(pages[currentPreviewPage - 1] || [], currentPreviewPage - 1, false)}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── MODAL DÁN DỮ LIỆU EXCEL ── */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase">
                    DÁN DỮ LIỆU TỪ EXCEL
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Copy các dòng trong Excel rồi dán (Ctrl+V / Cmd+V) vào khung bên dưới
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Textarea nhập liệu */}
            <div className="space-y-2">
              <textarea
                rows={10}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={`Ví dụ copy từ Excel:\nNgành hàng\tNhóm hàng\tMã sản phẩm\tTên sản phẩm\tIMEI_1\n1755 - Tủ lạnh\t6421 - Mô hình\t3052959000401\tMô hình Tủ lạnh Panasonic NR-MBX471GPK\t141K00132`}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:border-sky-400 leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-slate-400">
                Hệ thống tự động phát hiện cột <strong>Mã SP</strong>, <strong>Tên SP</strong>, <strong>IMEI</strong> và <strong>Nhóm hàng</strong>.
              </p>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              
              <button
                onClick={() => handleApplyPasteText(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Thêm nối tiếp vào danh sách
              </button>

              <button
                onClick={() => handleApplyPasteText(true)}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md shadow-sky-500/20 cursor-pointer"
              >
                Ghi đè danh sách mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IN CHUẨN A4 (PORTAL TRÊN BODY) ── */}
      {isPrintModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="qr-print-overlay fixed inset-0 z-[99999] flex flex-col items-center justify-start bg-slate-900/90 overflow-y-auto p-4 sm:p-8 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible">
          {/* Print Media Styles */}
          <style type="text/css">
            {`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 6mm 6mm !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  width: 210mm !important;
                  height: auto !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body > *:not(.qr-print-overlay) {
                  display: none !important;
                }
                #root {
                  display: none !important;
                }
                .qr-print-overlay {
                  display: block !important;
                  position: static !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  overflow: visible !important;
                }
                .qr-print-modal-header {
                  display: none !important;
                }
                .print-page-sheet {
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  width: 198mm !important;
                  height: 284mm !important;
                  max-height: 284mm !important;
                  overflow: hidden !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  padding: 2mm !important;
                  box-sizing: border-box !important;
                }
                .print-page-sheet:last-child {
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                }
                .qr-item-card {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
              }
            `}
          </style>

          {/* Thanh công cụ Print Modal (Ẩn khi in thực tế) */}
          <div className="qr-print-modal-header w-full max-w-[794px] bg-white rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-between border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Printer size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase">
                  CHUẨN BỊ IN ({printQueue.length} TEM - {totalPages} TRANG A4)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Bấm "Xác Nhận In" để mở hộp thoại in của trình duyệt (chọn lưu PDF hoặc in máy in)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-sky-500/30 flex items-center gap-2 cursor-pointer"
              >
                <Printer size={16} />
                <span>XÁC NHẬN IN NGAY</span>
              </button>
            </div>
          </div>

          {/* Render toàn bộ các trang A4 để in */}
          <div className="w-full flex flex-col items-center gap-6">
            {pages.map((pageItems, idx) => renderPageSheet(pageItems, idx, true))}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default InQrSpTab;
