import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Printer, Trash2, Info, Archive, ShieldAlert, FilePlus, 
  ChevronDown, CheckCircle2, Save, Loader2, Calendar, ArrowUpDown, 
  SortAsc, SortDesc, PieChart, Users, UploadCloud, Settings, 
  ChevronRight, LayoutGrid, FileText, Banknote, MapPin, Sparkles, AlertCircle, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useNotification } from '../contexts/NotificationContext';
import StickerPrintModal from '../components/StickerPrintModal';
import PrintLayoutModal from '../components/PrintLayoutModal';
import BbkqTab from '../components/BbkqTab';
import { STORAGE_KEYS } from './RTST/types';

interface ToolHoTroProps {
  pageMaintenanceState?: Record<string, boolean>;
  isUser43751Local?: boolean;
}

// ── DEFAULT DATA FOR "IN ĐỊA CHỈ" (TỜ RƠI A4 / 6 Ô) ──
const DEFAULT_ADDRESS_DATA = {
  headerTitle: 'ĐIỆN MÁY XANH PHƯỜNG 8',
  headerSubtitle: '(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)',
  invitationTitle: 'THƯ MỜI, THỨ 7 TUẦN NÀY',
  invitationTarget: 'Kính mời: Quý Khách Hàng thân yêu',
  eventTimeLocation: 'Ngày 28/03 đến ĐMX PHƯỜNG 8',
  eventDescription: 'tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN',
  discountPercentage: '50%',
  duration: '1 NGÀY DUY NHẤT 28/03',
  categoriesLine1: 'ĐIỆN THOẠI & LAPTOP',
  categoriesLine2: 'TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC',
  categoriesLine3: 'MÁY LẠNH – QUẠT ĐIỀU HÒA',
  specialOffer: '➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%',
  paymentTerm: 'MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ',
  footerTitle: 'ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU',
  footerLine1: 'CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU',
  footerLine2: 'BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN',
  footerLine3: 'NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI ⬇',
  footerLine4: 'Được giảm thêm 10%'
};

// ── DEFAULT DATA FOR "IN PHIẾU BẢO HÀNH" ──
const DEFAULT_PHIEU_BH_DATA = {
  tenSieuThi: '',
  sanPhamBh: '',
  remoteBh: '',
  giaoTruocNgay: '',
  giaoTruocText: '',
  hoTroMuaHang: '',
  row2Line1: '- Trong 30 ngày đầu hư gì đổi nấy cùng model, cùng kiểu dáng, màu sắc (HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI)',
  row2Line2: '- Qua 30 ngày nếu lỗi bảo hành theo chính sách hãng hoặc đổi mới chịu phí',
  row2Line3: '- sản phẩm : Không lỗi hoặc có Lỗi nếu đổi sang mẫu khác:',
  row2Line4: '+ THÁNG ĐẦU: TRỪ 20% .',
  row2Line5: '+ MỖI THÁNG TIẾP THEO THÊM 10%',
  row4Text: 'Chưa bao gồm phí vật tư phát sinh (nếu có)',
  row5Text: 'Đã tư vấn đúng model, nhu cầu KH, đầy đủ tính năng sản phẩm, thiết kế, khuyến mãi',
  row6Line1: '- Tổng đài bảo hành: 1900.23.24.65',
  row7Text: ''
};

// ── HELPER COMPONENT: PREVIEW IN ĐỊA CHỈ (66mm x 142mm) ──
function AddressFlyerPreview({ item }: { item: typeof DEFAULT_ADDRESS_DATA }) {
  const renderTimeLocation = (text: string) => {
    const regex = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g;
    return text.split(regex).map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="text-[20px] font-black text-black mx-1 inline-block">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  const renderDuration = (text: string) => {
    const match = text.match(/^(.*?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/i);
    return match ? (
      <div className="flex flex-col items-center leading-none mt-1">
        <span className="text-[14px] font-black tracking-wider uppercase leading-none">{match[1]}</span>
        <span className="text-[24px] font-black text-black tracking-tight leading-none mt-1">{match[2]}</span>
      </div>
    ) : (
      <span className="text-[14px] font-black tracking-wider uppercase">{text}</span>
    );
  };

  return (
    <div
      className="w-[66mm] h-[142mm] bg-white flex flex-col justify-between p-3 box-border text-black select-none"
      style={{ border: '1.5px solid black', fontFamily: '"Oswald", sans-serif' }}
    >
      {/* Header */}
      <div className="text-center shrink-0">
        <div className="font-black tracking-wide leading-tight uppercase" style={{ fontSize: '20px' }}>
          {item.headerTitle || 'ĐIỆN MÁY XANH PHƯỜNG 8'}
        </div>
        <div className="font-medium tracking-tight leading-tight text-slate-800" style={{ fontSize: '12px' }}>
          {item.headerSubtitle || '(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)'}
        </div>
      </div>

      <div className="bg-black w-full my-0.5 shrink-0" style={{ height: '2px' }} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-between py-1 min-h-0 text-center overflow-hidden">
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="font-black tracking-tight uppercase leading-none" style={{ fontSize: '20px' }}>
            {item.invitationTitle || 'THƯ MỜI, THỨ 7 TUẦN NÀY'}
          </div>
          <div className="leading-none text-slate-700 my-0.5" style={{ fontSize: '8px' }}>⚭ ⚭ ⚭</div>
          <div className="font-bold text-slate-800 leading-none" style={{ fontSize: '12px' }}>
            {item.invitationTarget || 'Kính mời: Quý Khách Hàng thân yêu'}
          </div>
        </div>

        <div className="font-bold tracking-tight uppercase leading-snug shrink-0" style={{ fontSize: '12px' }}>
          <div>{renderTimeLocation(item.eventTimeLocation || 'Ngày 28/03 đến ĐMX PHƯỜNG 8')}</div>
          <div className="text-slate-800 font-medium my-0.5" style={{ fontSize: '10.5px', textTransform: 'none' }}>
            {item.eventDescription || 'tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN'}
          </div>
        </div>

        <div className="font-black text-black leading-none tracking-tighter shrink-0" style={{ fontSize: '64px' }}>
          {item.discountPercentage || '50%'}
        </div>

        <div className="shrink-0 leading-none">
          {renderDuration(item.duration || '1 NGÀY DUY NHẤT 28/03')}
        </div>

        <div className="font-bold tracking-wide uppercase leading-tight text-slate-800 shrink-0" style={{ fontSize: '10px' }}>
          {item.categoriesLine1 && <div>{item.categoriesLine1}</div>}
          {item.categoriesLine2 && <div>{item.categoriesLine2}</div>}
          {item.categoriesLine3 && <div>{item.categoriesLine3}</div>}
        </div>

        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="font-black text-black leading-tight uppercase tracking-tight" style={{ fontSize: '12px' }}>
            {item.specialOffer || '➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%'}
          </div>
          <div className="font-black text-slate-800 leading-none uppercase mt-0.5" style={{ fontSize: '9.5px' }}>
            {item.paymentTerm || 'MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ'}
          </div>
        </div>
      </div>

      <div className="bg-black w-full my-0.5 shrink-0" style={{ height: '2px' }} />

      {/* Footer */}
      <div className="text-center shrink-0">
        <div className="font-black tracking-wide leading-tight uppercase" style={{ fontSize: '12px' }}>
          {item.footerTitle || 'ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU'}
        </div>
        <div className="font-bold tracking-tight leading-tight uppercase mt-0.5" style={{ fontSize: '9.5px' }}>
          {item.footerLine1 || 'CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU'}
        </div>
        <div className="font-bold tracking-tight leading-tight uppercase" style={{ fontSize: '9.5px' }}>
          {item.footerLine2 || 'BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN'}
        </div>
        <div className="font-bold tracking-tight leading-tight uppercase flex items-center justify-center gap-0.5" style={{ fontSize: '9.5px' }}>
          <span>{item.footerLine3 || 'NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI'}</span>
          <span>⬇</span>
        </div>
        <div className="font-medium tracking-tight leading-tight text-slate-800 italic mt-0.5" style={{ fontSize: '9.5px' }}>
          {item.footerLine4 || 'Được giảm thêm 10%'}
        </div>
      </div>
    </div>
  );
}

// ── HELPER COMPONENT: PREVIEW IN PHIẾU BẢO HÀNH ──
function PhieuBhPreview({ item, layout }: { item: typeof DEFAULT_PHIEU_BH_DATA; layout: string }) {
  const isRight = layout === 'right';
  const width = isRight ? '98mm' : '105mm';
  const height = isRight ? '132mm' : '148.5mm';

  const renderHighlight = (text: string) => {
    if (!text) return '';
    const regex = /(\(HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI\)|Không lỗi|Lỗi|TRỪ \d+%|THÊM \d+%|1900\.23\.24\.65|Tổng đài bảo hành: 1900\.23\.24\.65)/g;
    return text.split(regex).map((part, idx) =>
      regex.test(part) ? (
        <strong key={idx} className="font-black text-black">
          {part}
        </strong>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  return (
    <div
      className="bg-white flex flex-col p-2 box-border text-black select-none border border-slate-300 shadow-sm"
      style={{ width, height, fontFamily: 'Arial, sans-serif' }}
    >
      <table className="w-full h-full border-collapse border border-black table-fixed text-left">
        <tbody>
          {/* Row 1 */}
          <tr className="border-b border-black">
            <td className="w-[10%] border-r border-black bg-black text-white font-bold text-center align-middle text-[16px]">
              1
            </td>
            <td className="p-1.5 text-[13px] leading-tight align-middle">
              <div>
                Tên siêu thị:
                <span className="font-bold mx-1 border-b border-dotted border-black pb-0.5 inline-block min-w-[100px] text-center">
                  {item.tenSieuThi || '                    '}
                </span>
              </div>
              <div className="mt-0.5">
                Sản phẩm bảo hành:
                <span className="font-bold mx-1 border-b border-dotted border-black pb-0.5 inline-block min-w-[35px] text-center">
                  {item.sanPhamBh || '     '}
                </span>{' '}
                tháng/năm
              </div>
              <div className="mt-0.5 pl-3">
                BH Phụ kiện (nếu có):
                <span className="font-bold mx-1 border-b border-dotted border-black pb-0.5 inline-block min-w-[30px] text-center">
                  {item.remoteBh || '    '}
                </span>{' '}
                tháng
              </div>
            </td>
          </tr>

          {/* Row 2 */}
          <tr className="border-b border-black">
            <td className="border-r border-black font-bold text-center align-middle text-[16px]">2</td>
            <td className="p-1.5 text-[11px] leading-tight align-middle">
              <div className="mb-0.5">{renderHighlight(item.row2Line1)}</div>
              <div className="mb-0.5">{renderHighlight(item.row2Line2)}</div>
              <div className="mb-0.5">{renderHighlight(item.row2Line3)}</div>
              <div className="pl-3 mb-0.5">{renderHighlight(item.row2Line4)}</div>
              <div className="pl-3">{renderHighlight(item.row2Line5)}</div>
            </td>
          </tr>

          {/* Row 3 */}
          <tr className="border-b border-black">
            <td className="border-r border-black font-bold text-center align-middle text-[16px]">3</td>
            <td className="p-1.5 text-[13px] leading-tight align-middle">
              <div>
                Giao trước{' '}
                <span className="font-bold mx-1 border-b border-dotted border-black pb-0.5 inline-block min-w-[30px] text-center">
                  {item.giaoTruocNgay || '    '}
                </span>{' '}
                ngày{' '}
                <span className="font-bold mx-1 border-b border-dotted border-black pb-0.5 inline-block min-w-[100px] text-center">
                  {item.giaoTruocText || '                    '}
                </span>
              </div>
            </td>
          </tr>

          {/* Row 4 */}
          <tr className="border-b border-black">
            <td className="border-r border-black font-bold text-center align-middle text-[16px]">4</td>
            <td className="p-1.5 text-[13px] leading-tight align-middle">
              <div>{item.row4Text}</div>
            </td>
          </tr>

          {/* Row 5 */}
          <tr className="border-b border-black">
            <td className="border-r border-black font-bold text-center align-middle text-[16px]">5</td>
            <td className="p-1.5 text-[11px] leading-tight align-middle">
              <div>{item.row5Text}</div>
            </td>
          </tr>

          {/* Row 6 */}
          <tr className="border-b border-black">
            <td className="border-r border-black font-bold text-center align-middle text-[16px]">6</td>
            <td className="p-1.5 text-[13px] leading-tight align-middle">
              <div className="mb-0.5">{renderHighlight(item.row6Line1)}</div>
              <div>
                - Hỗ trợ và mua hàng:{' '}
                <span className="font-bold mx-1 border-b border-dotted border-black pb-0.5 inline-block min-w-[100px] text-center">
                  {item.hoTroMuaHang || '                    '}
                </span>
              </div>
            </td>
          </tr>

          {/* Row 7 */}
          <tr>
            <td className="border-r border-black font-bold text-center align-middle text-[16px]">7</td>
            <td className="p-1.5 text-[13px] leading-tight align-middle">
              <div>{item.row7Text}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── MAIN COMPONENT: TOOL HỖ TRỢ ──
export default function ToolHoTro({ pageMaintenanceState = {}, isUser43751Local = false }: ToolHoTroProps) {
  const { userProfile } = useAuth();
  const { activeToolHoTroTab, setActiveToolHoTroTab, currentStoreId } = useStore();
  const { showNotification } = useNotification();
  const maKho = userProfile?.ma_kho || '';

  // Active tab state synced with store
  const activeTab = activeToolHoTroTab || 'all-sticker';
  const setActiveTab = (tab: string) => setActiveToolHoTroTab(tab);

  // ── IN ĐỊA CHỈ STATE ──
  const [addressData, setAddressData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STICKER_ADDRESS_DATA);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return DEFAULT_ADDRESS_DATA;
  });

  // ── IN PHIẾU BẢO HÀNH STATE ──
  const [phieuBhData, setPhieuBhData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STICKER_PHIEU_BH_DATA);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      ...DEFAULT_PHIEU_BH_DATA,
      tenSieuThi: userProfile?.ten_sieu_thi || `ĐML_CMA_CMA - Kho ${maKho || '43751'}`
    };
  });
  const [phieuBhLayout, setPhieuBhLayout] = useState<'1' | '2' | '4' | 'right'>('2');

  // ── STICKER DATA & MODAL STATES ──
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [lastUpdateInventory, setLastUpdateInventory] = useState<string | null>(null);
  const [lastUpdatePrice, setLastUpdatePrice] = useState<string | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<any[]>([]);
  const [printConfig, setPrintConfig] = useState({ style: 'classic', layout: '4', showPromoLabel: true });

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number>>({});
  const [printQuantity, setPrintQuantity] = useState<string>('');

  const [filters, setFilters] = useState({
    maSieuThi: '',
    nganhHang: '',
    nhomHang: '',
    onlyInventory: false,
    sortOrder: '' // '' | 'asc' | 'desc'
  });

  const [manualData, setManualData] = useState({
    productCode: '',
    name: '',
    originalPrice: '',
    discountPrice: ''
  });

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Load saved sticker data
  useEffect(() => {
    try {
      const savedInv = localStorage.getItem(STORAGE_KEYS.STICKER_INVENTORY_DATA);
      if (savedInv) {
        const parsed = JSON.parse(savedInv);
        setInventoryData(parsed.data || []);
        setLastUpdateInventory(parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('vi-VN') : null);
      }

      const savedPrice = localStorage.getItem(STORAGE_KEYS.STICKER_PRICE_DATA);
      if (savedPrice) {
        const parsed = JSON.parse(savedPrice);
        setPriceData(parsed.data || []);
        setLastUpdatePrice(parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('vi-VN') : null);
      }
    } catch (e) {
      console.error('Error parsing sticker data from localStorage:', e);
    }
  }, []);

  // Save sticker data changes
  useEffect(() => {
    if (priceData.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.STICKER_PRICE_DATA, JSON.stringify({
          data: priceData,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        // ignore
      }
    }
  }, [priceData]);

  // Combine inventory and price data
  const combinedPriceData = useMemo(() => {
    if (!inventoryData || inventoryData.length === 0) return priceData;

    const inventoryMap = new Map<string, { nganhHang: string; nhomHang: string }>();

    if (Array.isArray(inventoryData[0])) {
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(20, inventoryData.length); i++) {
        const row: any = inventoryData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('mã sản phẩm') || rowStr.includes('tên sản phẩm') || rowStr.includes('mã hàng')) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx !== -1) {
        const headerRow = inventoryData[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
        const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
        const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
        const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

        if (maSpIdx !== -1) {
          for (let i = headerRowIdx + 1; i < inventoryData.length; i++) {
            const row = inventoryData[i];
            if (!row || !Array.isArray(row)) continue;
            const maSp = String(row[maSpIdx] || '').trim();
            if (maSp) {
              inventoryMap.set(maSp, {
                nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
                nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
              });
            }
          }
        }
      }
    } else {
      inventoryData.forEach((item: any) => {
        if (item.ma_san_pham) {
          inventoryMap.set(item.ma_san_pham, {
            nganhHang: item.nganh_hang || '',
            nhomHang: item.nhom_hang || ''
          });
        }
      });
    }

    return priceData.map(item => {
      const productCode = item.maSanPham || item.productCode || (item.name || '').split(' - ')[0].trim();
      const invInfo = inventoryMap.get(productCode);
      return {
        ...item,
        nganhHang: invInfo?.nganhHang || item.nganhHang || '',
        nhomHang: invInfo?.nhomHang || item.nhomHang || ''
      };
    });
  }, [priceData, inventoryData]);

  const filteredPriceData = useMemo(() => {
    let result = combinedPriceData.filter(item => {
      const matchNganh = !filters.nganhHang || item.nganhHang === filters.nganhHang;
      const matchNhom = !filters.nhomHang || item.nhomHang === filters.nhomHang;
      const matchInv = !filters.onlyInventory || (item.nganhHang || item.nhomHang);
      return matchNganh && matchNhom && matchInv;
    });

    if (filters.sortOrder === 'asc') {
      result = [...result].sort((a, b) => Number(a.discountPrice) - Number(b.discountPrice));
    } else if (filters.sortOrder === 'desc') {
      result = [...result].sort((a, b) => Number(b.discountPrice) - Number(a.discountPrice));
    }

    return result;
  }, [combinedPriceData, filters]);

  const uniqueNganhHang = useMemo(() => {
    const list = combinedPriceData.map(item => item.nganhHang).filter(Boolean);
    return Array.from(new Set(list));
  }, [combinedPriceData]);

  const uniqueNhomHang = useMemo(() => {
    const list = combinedPriceData
      .filter(item => !filters.nganhHang || item.nganhHang === filters.nganhHang)
      .map(item => item.nhomHang)
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [combinedPriceData, filters.nganhHang]);

  // Handlers for Sticker Excel upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'inventory' | 'price', append = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (type === 'inventory') {
          setInventoryFile(file);
          setInventoryData(data);
          setLastUpdateInventory(new Date().toLocaleString('vi-VN'));
          localStorage.setItem(STORAGE_KEYS.STICKER_INVENTORY_DATA, JSON.stringify({
            data,
            timestamp: new Date().toISOString()
          }));
          showNotification('Đã tải lên dữ liệu tồn kho thành công!', 'success');
        } else {
          let headerIdx = -1;
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const rowStr = (data[i] || []).join(' ').toLowerCase();
            if (rowStr.includes('tên') || rowStr.includes('mã') || rowStr.includes('giá')) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx === -1) {
            showNotification('Không tìm thấy tiêu đề phù hợp trong file!', 'error');
            return;
          }

          const header = data[headerIdx].map((h: any) => String(h || '').toLowerCase().trim());
          const codeIdx = header.findIndex((h: string) => h.includes('mã'));
          const nameIdx = header.findIndex((h: string) => h.includes('tên'));
          const origIdx = header.findIndex((h: string) => h.includes('gốc') || h.includes('niêm yết'));
          const discIdx = header.findIndex((h: string) => h.includes('giảm') || h.includes('bán') || h.includes('km') || h.includes('sau'));

          const parsedList: any[] = [];
          for (let i = headerIdx + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            const code = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : '';
            const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
            const orig = origIdx !== -1 ? parseInt(String(row[origIdx] || '0').replace(/[^\d]/g, '')) || 0 : 0;
            const disc = discIdx !== -1 ? parseInt(String(row[discIdx] || '0').replace(/[^\d]/g, '')) || 0 : 0;

            if (name || code) {
              parsedList.push({
                productCode: code,
                maSanPham: code,
                name: name || code,
                originalPrice: orig,
                discountPrice: disc
              });
            }
          }

          setPriceFile(file);
          setPriceData(prev => append ? [...parsedList, ...prev] : parsedList);
          setLastUpdatePrice(new Date().toLocaleString('vi-VN'));
          showNotification(`Đã nạp ${parsedList.length} sản phẩm bảng giá!`, 'success');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        showNotification('Lỗi khi đọc file Excel!', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddManualSticker = () => {
    if (!manualData.name && !manualData.productCode) {
      showNotification('Vui lòng nhập Mã hoặc Tên sản phẩm!', 'warning');
      return;
    }
    const newItem = {
      productCode: manualData.productCode,
      maSanPham: manualData.productCode,
      name: manualData.name,
      originalPrice: parseInt(manualData.originalPrice.replace(/[^\d]/g, '')) || 0,
      discountPrice: parseInt(manualData.discountPrice.replace(/[^\d]/g, '')) || 0,
      nganhHang: 'THỦ CÔNG',
      nhomHang: 'THỦ CÔNG',
      isManual: true
    };
    setPriceData(prev => [newItem, ...prev]);
    setManualData({ productCode: '', name: '', originalPrice: '', discountPrice: '' });
    showNotification('Đã thêm sản phẩm thủ công vào danh sách!', 'success');
  };

  const handleDeleteRow = (index: number) => {
    const itemToDelete = filteredPriceData[index];
    if (!itemToDelete) return;
    setPriceData(prev => prev.filter(item =>
      !(item.maSanPham === itemToDelete.maSanPham && item.productCode === itemToDelete.productCode && item.name === itemToDelete.name)
    ));
    showNotification('Đã xóa sản phẩm khỏi danh sách!', 'success');
  };

  const handlePriceChange = (index: number, field: 'originalPrice' | 'discountPrice', value: string) => {
    const itemToUpdate = filteredPriceData[index];
    if (!itemToUpdate) return;
    const numericValue = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
    setPriceData(prev => prev.map(item => {
      const matches = item.maSanPham === itemToUpdate.maSanPham && item.productCode === itemToUpdate.productCode && item.name === itemToUpdate.name;
      return matches ? { ...item, [field]: numericValue } : item;
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIndices(filteredPriceData.map((_, i) => i));
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectRow = (index: number) => {
    setSelectedIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setPrintQuantities(prev => ({ ...prev, [index]: Math.max(0, qty) }));
  };

  // ── SAVE & PRINT HANDLERS FOR "IN ĐỊA CHỈ" ──
  const handleSaveAddress = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.STICKER_ADDRESS_DATA, JSON.stringify(addressData));
      showNotification('Đã lưu cấu hình In Địa Chỉ thành công!', 'success');
    } catch (e) {
      showNotification('Lỗi khi lưu cấu hình In Địa Chỉ!', 'error');
    }
  };

  const handlePrintAddress = () => {
    setPrintModalData(Array(6).fill(addressData));
    setPrintConfig({ style: 'address_flyer', layout: '6', showPromoLabel: false });
    setIsPrintModalOpen(true);
  };

  // ── SAVE & PRINT HANDLERS FOR "IN PHIẾU BẢO HÀNH" ──
  const handleSavePhieuBh = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.STICKER_PHIEU_BH_DATA, JSON.stringify(phieuBhData));
      showNotification('Đã lưu cấu hình Phiếu Bảo Hành thành công!', 'success');
    } catch (e) {
      showNotification('Lỗi khi lưu cấu hình Phiếu Bảo Hành!', 'error');
    }
  };

  const handlePrintPhieuBh = () => {
    const dataToPrint = phieuBhLayout === 'right' ? [null, phieuBhData] : Array(parseInt(phieuBhLayout || '2', 10)).fill(phieuBhData);
    setPrintModalData(dataToPrint);
    setPrintConfig({ style: 'phieu_bh', layout: phieuBhLayout, showPromoLabel: false });
    setIsPrintModalOpen(true);
  };

  // Tabs list for mobile bar
  const navTabs = [
    { id: 'all-sticker', label: 'All Sticker', icon: LayoutGrid, color: 'text-indigo-500' },
    { id: 'bbkq', label: 'BBKQ (Kiểm Quỹ)', icon: Banknote, color: 'text-teal-500' },
    { id: 'in-dia-chi', label: 'In Địa Chỉ', icon: MapPin, color: 'text-emerald-500' },
    { id: 'in-phieu-bh', label: 'In Phiếu BH', icon: FileText, color: 'text-sky-500' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-16">
      {/* Mobile-Only Navigation Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === 'all-sticker' && !['bbkq', 'in-dia-chi', 'in-phieu-bh'].includes(activeTab));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#00965e] text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : tab.color} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
        {/* Maintenance Guard */}
        {pageMaintenanceState[`toolhotro_${activeTab}`] && !isUser43751Local ? (
          <div className="flex items-center justify-center p-6 mt-12">
            <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
              <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                <AlertCircle size={48} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">HỆ THỐNG ĐANG BẢO TRÌ</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                Tab này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ══════════════ TAB 1: BBKQ (KIỂM QUỸ) ══════════════ */}
            {activeTab === 'bbkq' && (
              <motion.div
                key="bbkq"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <BbkqTab />
              </motion.div>
            )}

            {/* ══════════════ TAB 2: IN ĐỊA CHỈ (TỜ RƠI A4 / 6 Ô) ══════════════ */}
            {activeTab === 'in-dia-chi' && (
              <motion.div
                key="in-dia-chi"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
              >
                <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình In Địa Chỉ (Tờ Rơi A4)</h2>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">Tùy biến nội dung & in 6 ô tờ rơi trên 1 trang giấy A4</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAddress}
                      className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Save size={16} /> LƯU CẤU HÌNH
                    </button>
                    <button
                      onClick={handlePrintAddress}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <Printer size={16} /> IN ĐỊA CHỈ (6 Ô / A4)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Form Configuration (Left side) */}
                  <div className="xl:col-span-7 space-y-5 max-h-[750px] overflow-y-auto pr-2">
                    {/* Section 1: Header */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-emerald-700">1. Phần Đầu (Header)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Tên siêu thị</label>
                          <input
                            type="text"
                            value={addressData.headerTitle}
                            onChange={e => setAddressData({ ...addressData, headerTitle: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Địa chỉ / Ghi chú</label>
                          <input
                            type="text"
                            value={addressData.headerSubtitle}
                            onChange={e => setAddressData({ ...addressData, headerSubtitle: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Invitation */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-emerald-700">2. Thư Mời (Invitation)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Tiêu đề thư mời</label>
                          <input
                            type="text"
                            value={addressData.invitationTitle}
                            onChange={e => setAddressData({ ...addressData, invitationTitle: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Đối tượng kính mời</label>
                          <input
                            type="text"
                            value={addressData.invitationTarget}
                            onChange={e => setAddressData({ ...addressData, invitationTarget: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Event Info */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-emerald-700">3. Nội dung sự kiện</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Thời gian & Địa điểm</label>
                          <input
                            type="text"
                            value={addressData.eventTimeLocation}
                            onChange={e => setAddressData({ ...addressData, eventTimeLocation: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Mô tả sự kiện</label>
                          <input
                            type="text"
                            value={addressData.eventDescription}
                            onChange={e => setAddressData({ ...addressData, eventDescription: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Mức giảm giá %</label>
                          <input
                            type="text"
                            value={addressData.discountPercentage}
                            onChange={e => setAddressData({ ...addressData, discountPercentage: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-red-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Thời gian áp dụng</label>
                          <input
                            type="text"
                            value={addressData.duration}
                            onChange={e => setAddressData({ ...addressData, duration: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Categories & Offers */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-emerald-700">4. Danh mục & Ưu đãi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Danh mục 1</label>
                          <input
                            type="text"
                            value={addressData.categoriesLine1}
                            onChange={e => setAddressData({ ...addressData, categoriesLine1: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Danh mục 2</label>
                          <input
                            type="text"
                            value={addressData.categoriesLine2}
                            onChange={e => setAddressData({ ...addressData, categoriesLine2: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Danh mục 3</label>
                          <input
                            type="text"
                            value={addressData.categoriesLine3}
                            onChange={e => setAddressData({ ...addressData, categoriesLine3: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Ưu đãi đặc biệt</label>
                          <input
                            type="text"
                            value={addressData.specialOffer}
                            onChange={e => setAddressData({ ...addressData, specialOffer: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Chính sách trả góp</label>
                          <input
                            type="text"
                            value={addressData.paymentTerm}
                            onChange={e => setAddressData({ ...addressData, paymentTerm: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Footer */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-emerald-700">5. Phần Chân (Footer)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Tiêu đề chân trang</label>
                          <input
                            type="text"
                            value={addressData.footerTitle}
                            onChange={e => setAddressData({ ...addressData, footerTitle: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Cam kết 1</label>
                          <input
                            type="text"
                            value={addressData.footerLine1}
                            onChange={e => setAddressData({ ...addressData, footerLine1: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Cam kết 2</label>
                          <input
                            type="text"
                            value={addressData.footerLine2}
                            onChange={e => setAddressData({ ...addressData, footerLine2: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Dòng chú ý 3</label>
                          <input
                            type="text"
                            value={addressData.footerLine3}
                            onChange={e => setAddressData({ ...addressData, footerLine3: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Khuyến mãi thêm 4</label>
                          <input
                            type="text"
                            value={addressData.footerLine4}
                            onChange={e => setAddressData({ ...addressData, footerLine4: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Preview (Right side) */}
                  <div className="xl:col-span-5 flex flex-col items-center gap-6">
                    <div className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center">
                      <h3 className="font-black text-xs uppercase tracking-wider text-emerald-700 self-start mb-4">Xem trước thiết kế</h3>
                      <div
                        className="border border-slate-300 shadow-md bg-white rounded-md overflow-hidden"
                        style={{ transform: 'scale(0.8)', transformOrigin: 'top center', marginBottom: '-80px' }}
                      >
                        <AddressFlyerPreview item={addressData} />
                      </div>
                    </div>

                    <div className="w-full flex gap-3 mt-4">
                      <button
                        onClick={handleSaveAddress}
                        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:shadow-md transition-all cursor-pointer"
                      >
                        <Save size={16} /> Lưu Cấu Hình
                      </button>
                      <button
                        onClick={handlePrintAddress}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all cursor-pointer"
                      >
                        <Printer size={16} /> In Địa Chỉ (6 ô / A4)
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════ TAB 3: IN PHIẾU BẢO HÀNH ══════════════ */}
            {activeTab === 'in-phieu-bh' && (
              <motion.div
                key="in-phieu-bh"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
              >
                <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl shadow-sm">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình In Phiếu Bảo Hành</h2>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">Biên soạn nội dung cam kết, bảo hành & hỗ trợ giao hàng</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePhieuBh}
                      className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Save size={16} /> LƯU CẤU HÌNH
                    </button>
                    <button
                      onClick={handlePrintPhieuBh}
                      className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
                    >
                      <Printer size={16} /> IN PHIẾU BH
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Form Configuration (Left side) */}
                  <div className="xl:col-span-7 space-y-5 max-h-[750px] overflow-y-auto pr-2">
                    {/* Section 1: Quick info */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-sky-700">1. Điền thông tin nhanh</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Tên siêu thị</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: ĐIỆN MÁY XANH PHƯỜNG 8"
                            value={phieuBhData.tenSieuThi}
                            onChange={e => setPhieuBhData({ ...phieuBhData, tenSieuThi: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Thời hạn BH Sản Phẩm (tháng/năm)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 12"
                            value={phieuBhData.sanPhamBh}
                            onChange={e => setPhieuBhData({ ...phieuBhData, sanPhamBh: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Thời hạn BH Phụ Kiện (tháng)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 6"
                            value={phieuBhData.remoteBh}
                            onChange={e => setPhieuBhData({ ...phieuBhData, remoteBh: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Giao trước (số ngày)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 3"
                            value={phieuBhData.giaoTruocNgay}
                            onChange={e => setPhieuBhData({ ...phieuBhData, giaoTruocNgay: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Chi tiết / Ngày giao hàng</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 25/06/2026"
                            value={phieuBhData.giaoTruocText}
                            onChange={e => setPhieuBhData({ ...phieuBhData, giaoTruocText: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Số điện thoại Hỗ trợ và mua hàng</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 1800.1061 hoặc hotline siêu thị"
                            value={phieuBhData.hoTroMuaHang}
                            onChange={e => setPhieuBhData({ ...phieuBhData, hoTroMuaHang: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Layout in */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-sky-700">2. Layout in</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { value: '1', label: '1 Phiếu / Trang A4 Dọc' },
                          { value: '2', label: '2 Phiếu / Trang A4 Ngang (Cỡ A5)' },
                          { value: '4', label: '4 Phiếu / Trang A4 Dọc (Cỡ A6)' },
                          { value: 'right', label: 'In bên phải (Trang A5 Ngang)' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer text-xs font-bold ${
                              phieuBhLayout === opt.value
                                ? 'bg-sky-50 border-sky-400 text-sky-800 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="phieuBhLayout"
                              value={opt.value}
                              checked={phieuBhLayout === opt.value}
                              onChange={() => setPhieuBhLayout(opt.value as any)}
                              className="text-sky-600 focus:ring-sky-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Terms */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <h3 className="font-black text-xs uppercase tracking-wider text-sky-700">3. Biên soạn điều khoản (7 dòng chính)</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 2 - Điều 1 (30 ngày đầu)</label>
                          <textarea
                            rows={2}
                            value={phieuBhData.row2Line1}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row2Line1: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 2 - Điều 2 (Qua 30 ngày)</label>
                          <textarea
                            rows={2}
                            value={phieuBhData.row2Line2}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row2Line2: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 2 - Điều 3 (Sản phẩm đổi sang mẫu khác)</label>
                          <textarea
                            rows={2}
                            value={phieuBhData.row2Line3}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row2Line3: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 2 - Điều 4 (Khấu trừ tháng đầu)</label>
                            <input
                              type="text"
                              value={phieuBhData.row2Line4}
                              onChange={e => setPhieuBhData({ ...phieuBhData, row2Line4: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 2 - Điều 5 (Khấu trừ tháng tiếp theo)</label>
                            <input
                              type="text"
                              value={phieuBhData.row2Line5}
                              onChange={e => setPhieuBhData({ ...phieuBhData, row2Line5: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 4 - Phí vật tư</label>
                          <input
                            type="text"
                            value={phieuBhData.row4Text}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row4Text: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 5 - Tư vấn khách hàng</label>
                          <input
                            type="text"
                            value={phieuBhData.row5Text}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row5Text: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 6 - Tổng đài</label>
                          <input
                            type="text"
                            value={phieuBhData.row6Line1}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row6Line1: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dòng 7 - Ghi chú phụ chân trang</label>
                          <input
                            type="text"
                            placeholder="Để trống hoặc ghi chú thêm (chữ ký khách hàng, v.v.)"
                            value={phieuBhData.row7Text}
                            onChange={e => setPhieuBhData({ ...phieuBhData, row7Text: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Preview (Right side) */}
                  <div className="xl:col-span-5 flex flex-col items-center gap-6">
                    <div className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center">
                      <h3 className="font-black text-xs uppercase tracking-wider text-sky-700 self-start mb-4">Xem trước phiếu bảo hành</h3>
                      <div
                        className="border border-slate-300 shadow-md bg-white rounded-md overflow-hidden"
                        style={{
                          transform: 'scale(0.85)',
                          transformOrigin: 'top center',
                          marginBottom: phieuBhLayout === 'right' ? '-80px' : '-50px'
                        }}
                      >
                        <PhieuBhPreview item={phieuBhData} layout={phieuBhLayout} />
                      </div>
                    </div>

                    <div className="w-full flex gap-3 mt-4">
                      <button
                        onClick={handleSavePhieuBh}
                        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:shadow-md transition-all cursor-pointer"
                      >
                        <Save size={16} /> Lưu Cấu Hình
                      </button>
                      <button
                        onClick={handlePrintPhieuBh}
                        className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 hover:shadow-xl transition-all cursor-pointer"
                      >
                        <Printer size={16} /> IN PHIẾU BH
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════ TAB 4: ALL STICKER / STICKER EVENT ══════════════ */}
            {!['bbkq', 'in-dia-chi', 'in-phieu-bh'].includes(activeTab) && (
              <motion.div
                key="all-sticker"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Left Column: Upload & Manual Entry */}
                <div className="col-span-1 space-y-6">
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Tải Dữ Liệu Excel</h3>
                      <button
                        onClick={() => {
                          setPriceData([]);
                          setInventoryData([]);
                          localStorage.removeItem(STORAGE_KEYS.STICKER_PRICE_DATA);
                          localStorage.removeItem(STORAGE_KEYS.STICKER_INVENTORY_DATA);
                          showNotification('Đã xóa toàn bộ dữ liệu sticker!', 'success');
                        }}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors text-xs font-bold"
                      >
                        <Trash2 size={14} /> Xóa dữ liệu
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={inventoryInputRef}
                        onChange={e => handleFileUpload(e, 'inventory')}
                      />
                      <button
                        onClick={() => inventoryInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all relative ${
                          inventoryFile || lastUpdateInventory
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : 'border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        {inventoryFile || lastUpdateInventory ? (
                          <CheckCircle2 size={24} strokeWidth={1.5} className="text-indigo-500" />
                        ) : (
                          <Archive size={24} strokeWidth={1.5} />
                        )}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">
                            {inventoryFile || lastUpdateInventory ? 'Đã tải Tồn Kho' : 'Tải Tồn Kho'}
                          </div>
                          {lastUpdateInventory && !inventoryFile && (
                            <div className="text-[8px] font-bold text-indigo-400 mt-1">Cập nhật: {lastUpdateInventory}</div>
                          )}
                          {inventoryFile && (
                            <div className="text-[8px] font-bold text-indigo-400 mt-1 truncate max-w-[80px]">
                              {inventoryFile.name}
                            </div>
                          )}
                        </div>
                      </button>

                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={priceInputRef}
                        onChange={e => handleFileUpload(e, 'price')}
                      />
                      <button
                        onClick={() => priceInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed transition-all relative ${
                          priceFile || lastUpdatePrice
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-emerald-300 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50/50'
                        }`}
                      >
                        {priceFile || lastUpdatePrice ? (
                          <CheckCircle2 size={24} strokeWidth={1.5} className="text-emerald-500" />
                        ) : (
                          <FilePlus size={24} strokeWidth={1.5} />
                        )}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">
                            {priceFile || lastUpdatePrice ? 'Đã tải Bảng Giá' : 'Tải Bảng Giá'}
                          </div>
                          {lastUpdatePrice && !priceFile && (
                            <div className="text-[8px] font-bold text-emerald-500 mt-1">Cập nhật: {lastUpdatePrice}</div>
                          )}
                          {priceFile && (
                            <div className="text-[8px] font-bold text-emerald-500 mt-1 truncate max-w-[80px]">
                              {priceFile.name}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Card: Nhập thủ công */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <FilePlus size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">In Sticker Thủ Công</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Mã SP</label>
                        <input
                          type="text"
                          placeholder="Mã SP..."
                          value={manualData.productCode}
                          onChange={e => setManualData({ ...manualData, productCode: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tên SP</label>
                        <input
                          type="text"
                          placeholder="Tên SP..."
                          value={manualData.name}
                          onChange={e => setManualData({ ...manualData, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Giá gốc</label>
                        <input
                          type="text"
                          placeholder="Giá gốc..."
                          value={manualData.originalPrice}
                          onChange={e => setManualData({ ...manualData, originalPrice: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Giá sau giảm</label>
                        <input
                          type="text"
                          placeholder="Giá giảm..."
                          value={manualData.discountPrice}
                          onChange={e => setManualData({ ...manualData, discountPrice: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddManualSticker}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <FilePlus size={14} /> THÊM VÀO DANH SÁCH
                    </button>
                  </div>

                  {/* Nút In Sticker */}
                  <button
                    onClick={() => setIsLayoutModalOpen(true)}
                    disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-3xl text-base font-black transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Printer size={20} /> IN STICKER
                  </button>
                </div>

                {/* Right Column: Filter & Table */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                  {/* Filters Card */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">BỘ LỌC TỒN KHO</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={filters.onlyInventory}
                            onChange={e => setFilters(prev => ({ ...prev, onlyInventory: e.target.checked }))}
                          />
                          <span className="text-xs font-bold text-slate-600">Có trong tồn kho</span>
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          setFilters({ maSieuThi: '', nganhHang: '', nhomHang: '', onlyInventory: false, sortOrder: '' });
                          setPrintQuantity('');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Ngành hàng</label>
                        <select
                          value={filters.nganhHang}
                          onChange={e => setFilters(prev => ({ ...prev, nganhHang: e.target.value, nhomHang: '' }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Tất cả ngành hàng</option>
                          {uniqueNganhHang.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Nhóm hàng</label>
                        <select
                          value={filters.nhomHang}
                          onChange={e => setFilters(prev => ({ ...prev, nhomHang: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Tất cả nhóm hàng</option>
                          {uniqueNhomHang.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Sắp xếp giá</label>
                        <select
                          value={filters.sortOrder}
                          onChange={e => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Mặc định</option>
                          <option value="asc">Giá thấp đến cao</option>
                          <option value="desc">Giá cao đến thấp</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">SL In nhanh</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="VD: 5"
                            value={printQuantity}
                            onChange={e => setPrintQuantity(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => {
                              const qty = parseInt(printQuantity, 10);
                              if (!isNaN(qty) && qty >= 0) {
                                const count = Math.min(qty, filteredPriceData.length);
                                setSelectedIndices(Array.from({ length: count }, (_, i) => i));
                              }
                            }}
                            className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0"
                          >
                            Chọn
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table Card */}
                  {priceData.length > 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <FilePlus size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">DỮ LIỆU BẢNG GIÁ</h3>
                            <p className="text-[11px] font-bold text-slate-500">
                              Đã lọc {filteredPriceData.length} / {combinedPriceData.length} sản phẩm (Đã chọn: {selectedIndices.length})
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-auto flex-1 p-0">
                        <table className="w-full text-left border-collapse border border-slate-200">
                          <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs">
                            <tr>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={filteredPriceData.length > 0 && selectedIndices.length === filteredPriceData.length}
                                  onChange={handleSelectAll}
                                />
                              </th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-12">STT</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-20">SL In</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Mã SP</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Tên sản phẩm</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Ngành hàng</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-32">Giá gốc</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-32">Giá giảm</th>
                              <th className="py-2.5 px-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-12">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredPriceData.map((item, index) => (
                              <tr key={index} className={`hover:bg-slate-50 transition-colors ${item.isManual ? 'bg-amber-50/30' : ''}`}>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    checked={selectedIndices.includes(index)}
                                    onChange={() => handleSelectRow(index)}
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-xs font-bold text-slate-500">{index + 1}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-14 bg-white border border-slate-200 text-slate-700 py-1 px-1 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                                    value={printQuantities[index] ?? 1}
                                    onChange={e => handleQuantityChange(index, parseInt(e.target.value, 10) || 0)}
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-xs font-black text-indigo-600">{item.maSanPham || item.productCode || '-'}</td>
                                <td className="py-2.5 px-3 text-xs font-bold text-slate-800">{item.name}</td>
                                <td className="py-2.5 px-3 text-xs font-medium text-slate-600">{item.nganhHang || '-'}</td>
                                <td className="py-2.5 px-3 text-xs font-medium text-slate-600 text-right">
                                  <input
                                    type="text"
                                    className="w-28 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                                    value={Number(item.originalPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                    onChange={e => handlePriceChange(index, 'originalPrice', e.target.value)}
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-xs font-black text-red-600 text-right">
                                  <input
                                    type="text"
                                    className="w-28 bg-white border border-slate-200 text-red-600 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                                    value={Number(item.discountPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                    onChange={e => handlePriceChange(index, 'discountPrice', e.target.value)}
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleDeleteRow(index)}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    title="Xóa dòng này"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-indigo-100 p-6 md:p-8 relative overflow-hidden">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Info size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Hướng Dẫn Xuất File Giá Từ ERP</h2>
                          <p className="text-xs text-slate-500 mt-1">Thực hiện xuất file bảng giá trên ERP để nạp vào hệ thống in nhanh:</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs text-slate-700 font-medium">
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-black">1.</span>
                          <span>Truy cập: <b className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">ERP {'>'} In bảng giá</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-black">2.</span>
                          <span>Chọn Ngành hàng: <b className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">Điện gia dụng, Dụng cụ nhà bếp,...</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-black">3.</span>
                          <span>Chọn Vị trí trưng bày: <b className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">2 - Kệ trưng bày</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-black">4.</span>
                          <span>Chọn Mẫu in: <b className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">81 - Bảng giá Gia Dụng - Phụ Kiện rút gọn</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-black">5.</span>
                          <span>Xuất file: Bấm <b>"In"</b> {'>'} chọn <b>Excel Workbook Data - only (*.xlsx)</b>.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── MODALS ── */}
      <PrintLayoutModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        onConfirm={(style, layout, showPromoLabel) => {
          setPrintConfig({ style, layout, showPromoLabel });
          setIsLayoutModalOpen(false);

          const itemsToPrint = filteredPriceData.flatMap((item, index) => {
            const isSelected = selectedIndices.length === 0 || selectedIndices.includes(index);
            const quantity = printQuantities[index] ?? 1;
            return isSelected && quantity > 0 ? Array(quantity).fill(item) : [];
          });

          setPrintModalData(itemsToPrint);
          setIsPrintModalOpen(true);
        }}
      />

      <StickerPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={printModalData}
        config={printConfig}
      />
    </div>
  );
}
