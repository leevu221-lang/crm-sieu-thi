import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Printer, Trash2, Info, Archive, ShieldAlert, FilePlus, X,
  ChevronDown, CheckCircle2, Save, Loader2, Calendar, ArrowUpDown, 
  SortAsc, SortDesc, PieChart, Users, UploadCloud, Settings, 
  ChevronRight, LayoutGrid, FileText, Tag, Scan, MapPin, ClipboardList,
  RefreshCw, AlertCircle, Banknote
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import StickerPrintModal, { Sticker, DcnbCard } from '../components/StickerPrintModal';
import PrintLayoutModal from '../components/PrintLayoutModal';
import PhanCaTable from '../components/PhanCaTable';
import PhanCaTuanTable from '../components/PhanCaTuanTable';
import BienBanTinhTrangHangHoa from '../components/BienBanTinhTrangHangHoa';
import BaoGiaCongTyModal from '../components/BaoGiaCongTyModal';
import StickerTemplateTab from '../components/StickerTemplateTab';
import InventoryManagement from '../components/InventoryManagement';
import { RoadshowManagement } from '../components/RoadshowManagement';
import BbkqTab from '../components/BbkqTab';

import { STORAGE_KEYS } from './RTST/types';
import { normalizeStoreId } from './RTST/utils';
import { useStore } from '../contexts/StoreContext';

export interface AddressFlyerData {
  headerTitle: string;
  headerSubtitle: string;
  invitationTitle: string;
  invitationTarget: string;
  eventTimeLocation: string;
  eventDescription: string;
  discountPercentage: string;
  duration: string;
  categoriesLine1: string;
  categoriesLine2: string;
  categoriesLine3: string;
  specialOffer: string;
  paymentTerm: string;
  footerTitle: string;
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  footerLine4: string;
}

export interface PhieuBHData {
  tenSieuThi: string;
  sanPhamBh: string;
  remoteBh: string;
  giaoTruocNgay: string;
  giaoTruocText: string;
  hoTroMuaHang: string;
  row2Line1: string;
  row2Line2: string;
  row2Line3: string;
  row2Line4: string;
  row2Line5: string;
  row4Text: string;
  row5Text: string;
  row6Line1: string;
  row7Text: string;
}

export const DEFAULT_PHIEU_BH: PhieuBHData = {
  tenSieuThi: "",
  sanPhamBh: "",
  remoteBh: "",
  giaoTruocNgay: "",
  giaoTruocText: "",
  hoTroMuaHang: "",
  row2Line1: "- Trong 30 ngày đầu hư gì đổi nấy cùng model, cùng kiểu dáng, màu sắc (HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI)",
  row2Line2: "- Qua 30 ngày nếu lỗi bảo hành theo chính sách hãng hoặc đổi mới chịu phí",
  row2Line3: "- sản phẩm : Không lỗi hoặc có Lỗi nếu đổi sang mẫu khác:",
  row2Line4: "+ THÁNG ĐẦU: TRỪ 20% .",
  row2Line5: "+ MỖI THÁNG TIẾP THEO THÊM 10%",
  row4Text: "Chưa bao gồm phí vật tư phát sinh (nếu có)",
  row5Text: "Đã tư vấn đúng model, nhu cầu KH, đầy đủ tính năng sản phẩm, thiết kế, khuyến mãi",
  row6Line1: "- Tổng đài bảo hành: 1900.23.24.65",
  row7Text: ""
};

export const DEFAULT_ADDRESS_DATA: AddressFlyerData = {
  headerTitle: "ĐIỆN MÁY XANH PHƯỜNG 8",
  headerSubtitle: "(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)",
  invitationTitle: "THƯ MỜI, THỨ 7 TUẦN NÀY",
  invitationTarget: "Kính mời: Quý Khách Hàng thân yêu",
  eventTimeLocation: "Ngày 28/03 đến ĐMX PHƯỜNG 8",
  eventDescription: "tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN",
  discountPercentage: "50%",
  duration: "1 NGÀY DUY NHẤT 28/03",
  categoriesLine1: "ĐIỆN THOẠI & LAPTOP",
  categoriesLine2: "TIVI - TỦ LẠNH - MÁY GIẶT- MÁY LỌC NƯỚC",
  categoriesLine3: "MÁY LẠNH – QUẠT ĐIỀU HÒA",
  specialOffer: "➔ RẺ HƠN CÁC ĐIỆN MÁY XANH KHÁC -10%",
  paymentTerm: "MUA TRẢ CHẬM - 0% LÃI SUẤT - TRẢ TRƯỚC 0đ",
  footerTitle: "ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU",
  footerLine1: "CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU",
  footerLine2: "BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN",
  footerLine3: "NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI ⬇",
  footerLine4: "Được giảm thêm 10%"
};

export function renderLineWithBold(text: string) {
  if (!text) return "";
  const regex = /(\(HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI\)|Không lỗi|Lỗi|TRỪ \d+%|THÊM \d+%|1900\.23\.24\.65|Tổng đài bảo hành: 1900\.23\.24\.65)/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    const isBold = regex.test(part);
    return isBold ? <strong key={index} className="font-extrabold">{part}</strong> : <span key={index}>{part}</span>;
  });
}

export function AddressFlyerPreview({ item }: { item: AddressFlyerData }) {
  const formatTimeText = (text: string) => {
    const regex = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g;
    return text.split(regex).map((part, idx) => 
      regex.test(part) 
        ? <span key={idx} className="text-[17px] font-black text-black mx-0.5 inline-block">{part}</span>
        : <span key={idx}>{part}</span>
    );
  };

  const formatDurationText = (text: string) => {
    const match = text.match(/^(.*?)\s+((?:\d{1,2}[-–—/])*\d{1,2}(?:\/\d{2,4})?)$/i);
    if (match) {
      return (
        <div className="flex flex-col items-center leading-none my-0.5">
          <span className="text-[11.5px] font-black tracking-wider uppercase leading-none">{match[1]}</span>
          <span className="text-[19px] font-black text-black tracking-tight leading-none mt-0.5">{match[2]}</span>
        </div>
      );
    }
    return (
      <span className="text-[12px] font-black tracking-wider uppercase">{text}</span>
    );
  };

  return (
    <div className="w-[66mm] h-[142mm] bg-white flex flex-col justify-between p-2.5 box-border text-black select-none overflow-hidden" style={{ border: '1.5px solid black', fontFamily: '"Oswald", sans-serif' }}>
      {/* Header */}
      <div className="text-center shrink-0">
        <div className="font-black tracking-wide leading-tight uppercase text-[18px]">
          {item.headerTitle || "ĐIỆN MÁY XANH PHƯỜNG 8"}
        </div>
        <div className="font-medium tracking-tight leading-tight text-slate-800 text-[11.5px]">
          {item.headerSubtitle || "(Ngã tư đèn xanh đèn đỏ đường Nguyễn Tất Thành)"}
        </div>
      </div>

      {/* Divider */}
      <div className="bg-black w-full my-0.5 shrink-0 h-[1.5px]"></div>

      {/* Middle Content */}
      <div className="flex-1 flex flex-col justify-between py-0.5 min-h-0 text-center">
        {/* Invitation */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="font-black tracking-tight uppercase leading-tight text-[17px]">
            {item.invitationTitle || "THƯ MỜI, THỨ 7 TUẦN NÀY"}
          </div>
          <div className="leading-none text-slate-700 my-0.5 text-[7px]">⚭ ⚭ ⚭</div>
          <div className="font-bold text-slate-800 leading-none text-[11.5px]">
            {item.invitationTarget || "Kính mời: Quý Khách Hàng thân yêu"}
          </div>
        </div>

        {/* Time & Location */}
        <div className="font-bold tracking-tight uppercase leading-tight shrink-0 text-[11.5px]">
          <div>{formatTimeText(item.eventTimeLocation || "Ngày 28/03 đến ĐMX PHƯỜNG 8")}</div>
          <div className="text-black font-black my-0.5 text-[13.5px] uppercase tracking-wide">
            {item.eventDescription || "tham gia sự kiện KHAI TRƯƠNG SIÊU GIẢM GIÁ ĐẾN"}
          </div>
        </div>

        {/* Discount Percentage */}
        <div className="font-black text-black leading-none tracking-tighter shrink-0 text-[54px] my-0.5">
          {item.discountPercentage || "50%"}
        </div>

        {/* Duration */}
        <div className="shrink-0 leading-none">
          {formatDurationText(item.duration || "1 NGÀY DUY NHẤT 28/03")}
        </div>

        {/* Categories (Dòng 1, 2, 3) */}
        <div className="font-bold tracking-wide uppercase leading-tight text-slate-900 shrink-0 text-[9.5px] my-0.5">
          {item.categoriesLine1 && <div>{item.categoriesLine1}</div>}
          {item.categoriesLine2 && <div>{item.categoriesLine2}</div>}
          {item.categoriesLine3 && <div>{item.categoriesLine3}</div>}
        </div>

        {/* Special Offer & Payment Term (Ưu đãi đặc biệt & Trả góp) */}
        <div className="flex flex-col items-center justify-center shrink-0 mt-0.5 pt-0.5">
          {item.specialOffer && (
            <div className="font-black text-black leading-tight uppercase tracking-tight text-[11.5px]">
              {item.specialOffer}
            </div>
          )}
          {item.paymentTerm && (
            <div className="font-black text-slate-800 leading-none uppercase mt-0.5 text-[9.5px]">
              {item.paymentTerm}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="bg-black w-full my-0.5 shrink-0 h-[1.5px]"></div>

      {/* Footer */}
      <div className="text-center shrink-0">
        <div className="font-black tracking-wide leading-tight uppercase text-[11.5px]">
          {item.footerTitle || "ĐIỆN MÁY XANH PHƯỜNG 8 CÀ MAU"}
        </div>
        <div className="font-bold tracking-tight leading-tight uppercase mt-0.5 text-[9px]">
          {item.footerLine1 || "CAM KẾT GIÁ RẺ NHẤT THỊ TRƯỜNG CÀ MAU"}
        </div>
        <div className="font-bold tracking-tight leading-tight uppercase text-[9px]">
          {item.footerLine2 || "BAO GIÁ HOÀN TIỀN NẾU ĐÂU RẺ HƠN"}
        </div>
        <div className="font-bold tracking-tight leading-tight uppercase flex items-center justify-center gap-0.5 text-[9px]">
          <span>{item.footerLine3 || "NHIỀU SẢN PHẨM GIÁ SỐC BÊN DƯỚI"}</span>
          <span>⬇</span>
        </div>
        <div className="font-medium tracking-tight leading-tight text-slate-800 italic mt-0.5 text-[8.5px]">
          {item.footerLine4 || "Được giảm thêm 10%"}
        </div>
      </div>
    </div>
  );
}

export function PhieuBHPreview({ item, layout }: { item: PhieuBHData; layout?: string }) {
  const isRightLayout = layout === 'right';
  const width = isRightLayout ? '98mm' : '105mm';
  const height = isRightLayout ? '132mm' : '148.5mm';
  return (
    <div className="bg-white flex flex-col p-2 box-border text-black select-none border border-slate-300 shadow-sm" style={{ width, height, fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        .phieu-bh-preview-table td {
          white-space: normal !important;
          word-break: break-word !important;
        }
      `}</style>
      <table className="phieu-bh-preview-table animate-[fadeIn_0.2s_ease-out]" style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: '1.5px solid black', tableLayout: 'fixed', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid black' }}>
            <td style={{ width: '10%', borderRight: '1px solid black', background: 'black', color: 'white', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>1</td>
            <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <div>
                Tên siêu thị:
                <span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '120px', textAlign: 'center' }}>
                  {item.tenSieuThi || "                    "}
                </span>
              </div>
              <div style={{ marginTop: '1px' }}>
                Sản phẩm bảo hành:
                <span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '40px', textAlign: 'center' }}>
                  {item.sanPhamBh || "     "}
                </span>
                tháng/năm
              </div>
              <div style={{ marginTop: '1px', paddingLeft: '12px' }}>
                BH Phụ kiện (nếu có):
                <span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '30px', textAlign: 'center' }}>
                  {item.remoteBh || "    "}
                </span>
                tháng
              </div>
            </td>
          </tr>
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
          <tr style={{ borderBottom: '1px solid black' }}>
            <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>3</td>
            <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <div>
                Giao trước{" "}
                <span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '30px', textAlign: 'center' }}>
                  {item.giaoTruocNgay || "    "}
                </span>
                ngày{" "}
                <span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '120px', textAlign: 'center' }}>
                  {item.giaoTruocText || "                    "}
                </span>
              </div>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid black' }}>
            <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>4</td>
            <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <div>{item.row4Text}</div>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid black' }}>
            <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>5</td>
            <td style={{ padding: '4px 6px', fontSize: '13px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <div>{item.row5Text}</div>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid black' }}>
            <td style={{ borderRight: '1px solid black', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px' }}>6</td>
            <td style={{ padding: '4px 6px', fontSize: '15px', lineHeight: '1.25', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <div style={{ marginBottom: '1px' }}>{renderLineWithBold(item.row6Line1)}</div>
              <div>
                - Hỗ trợ và mua hàng:{" "}
                <span style={{ fontWeight: 'bold', margin: '0 4px', borderBottom: '1px dotted black', paddingBottom: '2px', display: 'inline-block', minWidth: '120px', textAlign: 'center' }}>
                  {item.hoTroMuaHang || "                    "}
                </span>
              </div>
            </td>
          </tr>
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

const formatPriceInput = (val: string) => {
  const digits = val.replace(/[^\d]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('vi-VN');
};

// Safe localStorage wrapper: catches quota errors, clears old sticker caches, and retries
const STICKER_CACHE_KEYS = [
  'rtst_sticker_mln_price_data', 'rtst_sticker_mln_inventory_data',
  'rtst_sticker_gvgs_price_data', 'rtst_sticker_gvgs_inventory_data',
  'rtst_sticker_dcnb_price_data', 'rtst_sticker_dcnb_inventory_data',
  'rtst_sticker_event_dmx_price_data', 'rtst_sticker_event_dmx_inventory_data',
  'rtst_sticker_ce_price_data', 'rtst_sticker_ce_inventory_data',
  'rtst_sticker_lk_price_data', 'rtst_sticker_lk_inventory_data',
  'rtst_sticker_price_data', 'rtst_sticker_inventory_data',
];
function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.warn('[Storage] Quota exceeded, clearing old sticker caches...');
      // Clear all sticker cache keys except the one we're trying to write
      STICKER_CACHE_KEYS.forEach(k => { if (k !== key) try { localStorage.removeItem(k); } catch {} });
      try {
        localStorage.setItem(key, value);
      } catch {
        console.error('[Storage] Still exceeded after cleanup, skipping save for:', key);
      }
    } else {
      console.error('[Storage] setItem error:', e);
    }
  }
}

export default function ToolHoTro({ pageMaintenanceState = {}, isUser43751Local = false }: { pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean }) {
  const { userProfile } = useAuth();
  const maKho = userProfile?.ma_kho || '';
  const { currentStoreId, activeToolHoTroTab: activeTab, setActiveToolHoTroTab: setActiveTab } = useStore();
  const { showNotification } = useNotification();
  
  const [addressFlyerData, setAddressFlyerData] = useState<AddressFlyerData>(DEFAULT_ADDRESS_DATA);
  const [phieuBhData, setPhieuBhData] = useState<PhieuBHData>(DEFAULT_PHIEU_BH);
  const [phieuBhPrintLayout, setPhieuBhPrintLayout] = useState<string>('2');
  const [lkPrintLayout, setLkPrintLayout] = useState<string>('1');
  const [cePrintLayout, setCePrintLayout] = useState<string>('1');
  const [mlnPrintLayout, setMlnPrintLayout] = useState<string>('1');
  const [gvgsPrintLayout, setGvgsPrintLayout] = useState<string>('1');
  const [dcnbPages, setDcnbPages] = useState<number>(1);
  const [eventPrintLayout, setEventPrintLayout] = useState<string>('4');
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [updatedBy, setUpdatedBy] = useState<string>('43751');
  const [lastUpdateInventory, setLastUpdateInventory] = useState<string | null>(null);
  const [lastUpdatePrice, setLastUpdatePrice] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });

  const getStorageKeysForTab = (tab: string) => {
    switch (tab) {
      case 'sticker-lk':
        return {
          inventory: STORAGE_KEYS.STICKER_LK_INVENTORY_DATA,
          price: STORAGE_KEYS.STICKER_LK_PRICE_DATA
        };
      case 'sticker-ce':
        return {
          inventory: STORAGE_KEYS.STICKER_CE_INVENTORY_DATA,
          price: STORAGE_KEYS.STICKER_CE_PRICE_DATA
        };
      case 'sticker-mln':
        return {
          inventory: 'rtst_sticker_mln_inventory_data',
          price: 'rtst_sticker_mln_price_data'
        };
      case 'sticker-gvgs':
        return {
          inventory: 'rtst_sticker_gvgs_inventory_data',
          price: 'rtst_sticker_gvgs_price_data'
        };
      case 'sticker-dcnb':
        return {
          inventory: 'rtst_sticker_dcnb_inventory_data',
          price: 'rtst_sticker_dcnb_price_data'
        };
      case 'sticker-event-dmx':
        return {
          inventory: 'rtst_sticker_event_dmx_inventory_data',
          price: 'rtst_sticker_event_dmx_price_data'
        };
      default:
        return {
          inventory: STORAGE_KEYS.STICKER_INVENTORY_DATA,
          price: STORAGE_KEYS.STICKER_PRICE_DATA
        };
    }
  };

  const [mlnHeaderTemplate, setMlnHeaderTemplate] = useState<string>(() => {
    return localStorage.getItem('mln_header_template') || '{nganhHang}';
  });
  const [mlnFooterTemplate, setMlnFooterTemplate] = useState<string>(() => {
    return localStorage.getItem('mln_footer_template') || 'Khuyến mãi áp dụng đến hết ngày {date}';
  });

  const [gvgsHeaderTemplate, setGvgsHeaderTemplate] = useState<string>(() => {
    return localStorage.getItem('gvgs_header_template') || 'GIỜ VÀNG GIÁ SỐC';
  });
  const [gvgsFooterTemplate, setGvgsFooterTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('gvgs_footer_template');
    if (!saved || saved.includes('Khuyến mãi áp dụng') || saved.includes('KHUYẾN MÃI ÁP DỤNG')) {
      return 'Khuyến mãi chỉ áp dụng 3 ngày Thứ 6, 7, Chủ Nhật';
    }
    return saved;
  });

  const [manualData, setManualData] = useState({
    productCode: '',
    name: '',
    originalPrice: '',
    discountPrice: '',
    nganhHang: '',
    endDate: ''
  });

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number>>({});
  const [printQuantity, setPrintQuantity] = useState<string>('');
  const [filters, setFilters] = useState<{
    maSieuThi: string;
    nganhHang: string;
    nhomHang: string;
    tenSanPham: string;
    onlyInventory: boolean;
    selectedQrs: string[] | null;
    sortOrder: string;
  }>({
    maSieuThi: '',
    nganhHang: '',
    nhomHang: '',
    tenSanPham: '',
    onlyInventory: false,
    selectedQrs: null,
    sortOrder: '' // '' | 'asc' | 'desc'
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSessionId, setScannerSessionId] = useState('');
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [scannerMode, setScannerMode] = useState<'local' | 'qr'>('local');
  const [manualInputCode, setManualInputCode] = useState('');
  const [isQrDropdownOpen, setIsQrDropdownOpen] = useState(false);

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const html5QrcodeScannerRef = useRef<any>(null);
  const beepSoundRef = useRef<any>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isBienBanModalOpen, setIsBienBanModalOpen] = useState(false);
  const [isBaoGiaModalOpen, setIsBaoGiaModalOpen] = useState(false);
  const [bienBanTitle, setBienBanTitle] = useState('BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA');
  const [printConfig, setPrintConfig] = useState<{ style: string; layout: string; showPromoLabel?: boolean }>({
    style: 'classic',
    layout: '4',
    showPromoLabel: false
  });

  const [showEventPromoLabel, setShowEventPromoLabel] = useState(false);
  const [promoLabelTextVal, setPromoLabelTextVal] = useState<string>('GIÁ KM 43346-TRẦN TRỌNG THIỆN GỬI');

  const [autoExpand, setAutoExpand] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Fetch data from local storage or Firebase on activeTab changes
  useEffect(() => {
    if (activeTab === 'sticker-event-dmx') {
      setPromoLabelTextVal('GIÁ KM 43346-TRẦN TRỌNG THIỆN GỬI');
    } else {
      setPromoLabelTextVal('SẢN PHẨM GIÁ SỐC - EVENT T7 & CN');
    }

    if (
      activeTab === 'all-sticker' || 
      activeTab === 'sticker-lk' || 
      activeTab === 'sticker-ce' || 
      activeTab === 'sticker-mln' || 
      activeTab === 'sticker-gvgs' || 
      activeTab === 'sticker-dcnb' || 
      activeTab === 'sticker-event-dmx' ||
      activeTab === 'sticker-event' || 
      activeTab === 'sticker'
    ) {
      const keys = getStorageKeysForTab(activeTab);

      const loadLocalStickerData = () => {
        const savedInventory = localStorage.getItem(keys.inventory);
        if (savedInventory) {
          try {
            const parsed = JSON.parse(savedInventory);
            setInventoryData(parsed.data || []);
            
            const timestamp = parsed.timestamp ? new Date(parsed.timestamp) : null;
            const isValidDate = timestamp && !isNaN(timestamp.getTime());
            setLastUpdateInventory(isValidDate ? timestamp.toLocaleString('vi-VN') : null);
          } catch (e) {
            console.error('Error parsing saved inventory:', e);
            setInventoryData([]);
            setLastUpdateInventory(null);
          }
        } else {
          setInventoryData([]);
          setLastUpdateInventory(null);
        }

        const savedPrice = localStorage.getItem(keys.price);
        if (savedPrice) {
          try {
            const parsed = JSON.parse(savedPrice);
            setPriceData(parsed.data || []);
            
            const timestamp = parsed.timestamp ? new Date(parsed.timestamp) : null;
            const isValidDate = timestamp && !isNaN(timestamp.getTime());
            setLastUpdatePrice(isValidDate ? timestamp.toLocaleString('vi-VN') : null);
            if (parsed.updated_by) {
              setUpdatedBy(parsed.updated_by);
            }
          } catch (e) {
            console.error('Error parsing saved price:', e);
            setPriceData([]);
            setLastUpdatePrice(null);
          }
        } else {
          setPriceData([]);
          setLastUpdatePrice(null);
        }
      };

      if (activeTab === 'sticker-event-dmx' || activeTab === 'sticker-gvgs') {
        const docId = activeTab === 'sticker-gvgs' ? 'GVGS_GLOBAL' : 'EVENT_DMX_GLOBAL';
        // Fetch globally from Firebase (Firestore) first
        (async () => {
          try {
            const { data, error } = await supabase
              .from('store')
              .select('sticker_ce_price_data, updated_at, updated_by')
              .eq('id', docId)
              .maybeSingle();

            if (error) {
              console.error(`Lỗi khi tải dữ liệu ${activeTab} từ Firebase:`, error);
              loadLocalStickerData();
              return;
            }

            if (data && data.sticker_ce_price_data) {
              try {
                const parsedPrice = typeof data.sticker_ce_price_data === 'string'
                  ? JSON.parse(data.sticker_ce_price_data)
                  : data.sticker_ce_price_data;

                setPriceData(parsedPrice || []);
                setUpdatedBy(data.updated_by || '43751');
                
                // Format updated timestamp
                const dbTime = data.updated_at ? new Date(data.updated_at) : null;
                const isValidDbTime = dbTime && !isNaN(dbTime.getTime());
                const formattedTime = isValidDbTime 
                  ? dbTime.toLocaleString('vi-VN')
                  : new Date().toLocaleString('vi-VN');
                setLastUpdatePrice(formattedTime);

                // Save to localStorage as a cache/copy
                safeLocalStorageSet(keys.price, JSON.stringify({
                  data: parsedPrice,
                  timestamp: data.updated_at || new Date().toISOString(),
                  updated_by: data.updated_by || '43751'
                }));

                // No inventory needed by default for global tabs, clean it
                setInventoryData([]);
                setLastUpdateInventory(null);
              } catch (e) {
                console.error('Lỗi khi parse dữ liệu từ Firebase:', e);
                loadLocalStickerData();
              }
            } else {
              loadLocalStickerData();
            }
          } catch (e) {
            console.error(`Lỗi hệ thống khi tải dữ liệu ${activeTab}:`, e);
            loadLocalStickerData();
          }
        })();
      } else {
        loadLocalStickerData();
      }
    }
  }, [activeTab]);

  // Autosave priceData to localStorage when it changes
  React.useEffect(() => {
    if (priceData.length > 0) {
      const keys = getStorageKeysForTab(activeTab);
      safeLocalStorageSet(keys.price, JSON.stringify({
        data: priceData,
        timestamp: new Date().toISOString()
      }));
    }
  }, [priceData, activeTab]);

  const loadAddressFromLocalStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.STICKER_ADDRESS_DATA);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAddressFlyerData(parsed || DEFAULT_ADDRESS_DATA);
      } catch (e) {
        setAddressFlyerData(DEFAULT_ADDRESS_DATA);
      }
    } else {
      setAddressFlyerData(DEFAULT_ADDRESS_DATA);
    }
  };

  const saveAddressConfig = async () => {
    setIsSaving(true);
    try {
      safeLocalStorageSet(STORAGE_KEYS.STICKER_ADDRESS_DATA, JSON.stringify(addressFlyerData));
      const storeName = currentStoreId !== 'ALL' ? currentStoreId : '';
      if (storeName) {
        const cleanStoreCode = maKho.replace(/^0+/, '');
        const record = {
          id: normalizeStoreId(storeName),
          warehouse_code: cleanStoreCode,
          ten_sieu_thi: storeName,
          in_dia_chi_data: JSON.stringify(addressFlyerData)
        };
        const { error } = await supabase.from('store').upsert(record, { onConflict: 'id' });
        if (error) {
          console.error('Lỗi khi lưu cấu hình In Địa Chỉ vào DB:', error);
          showNotification('Lỗi khi lưu cấu hình In Địa Chỉ vào DB!', 'error');
        } else {
          showNotification('Đã lưu cấu hình In Địa Chỉ thành công!', 'success');
        }
      } else {
        showNotification('Đã lưu cấu hình In Địa Chỉ vào LocalStorage (Chưa chọn siêu thị)!', 'success');
      }
    } catch (e) {
      console.error('Lỗi hệ thống khi lưu cấu hình:', e);
      showNotification('Lỗi hệ thống khi lưu cấu hình!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const loadPhieuBhFromLocalStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.STICKER_PHIEU_BH_DATA);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPhieuBhData(parsed || DEFAULT_PHIEU_BH);
      } catch (e) {
        setPhieuBhData(DEFAULT_PHIEU_BH);
      }
    } else {
      setPhieuBhData(DEFAULT_PHIEU_BH);
    }
  };

  const savePhieuBhConfig = async () => {
    setIsSaving(true);
    try {
      safeLocalStorageSet(STORAGE_KEYS.STICKER_PHIEU_BH_DATA, JSON.stringify(phieuBhData));
      const storeName = currentStoreId !== 'ALL' ? currentStoreId : '';
      if (storeName) {
        const cleanStoreCode = maKho.replace(/^0+/, '');
        const record = {
          id: normalizeStoreId(storeName),
          warehouse_code: cleanStoreCode,
          ten_sieu_thi: storeName,
          in_phieu_bh_data: JSON.stringify(phieuBhData)
        };
        const { error } = await supabase.from('store').upsert(record, { onConflict: 'id' });
        if (error) {
          console.error('Lỗi khi lưu cấu hình In Phiếu BH vào DB:', error);
          showNotification('Đã lưu cấu hình In Phiếu BH vào LocalStorage!', 'success');
        } else {
          showNotification('Đã lưu cấu hình In Phiếu BH thành công!', 'success');
        }
      } else {
        showNotification('Đã lưu cấu hình In Phiếu BH vào LocalStorage (Chưa chọn siêu thị)!', 'success');
      }
    } catch (e) {
      console.error('Lỗi hệ thống khi lưu cấu hình:', e);
      showNotification('Lỗi hệ thống khi lưu cấu hình!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch address and warranty configurations when activeTab or currentStoreId changes
  useEffect(() => {
    if (activeTab === 'in-dia-chi') {
      const storeName = currentStoreId !== 'ALL' ? currentStoreId : '';
      if (storeName) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('store')
              .select('in_dia_chi_data')
              .eq('id', normalizeStoreId(storeName))
              .maybeSingle();
            if (error) {
              console.error('Lỗi khi tải dữ liệu in-dia-chi từ DB:', error);
              loadAddressFromLocalStorage();
              return;
            }
            if (data && data.in_dia_chi_data) {
              try {
                const parsed = typeof data.in_dia_chi_data === 'string'
                  ? JSON.parse(data.in_dia_chi_data)
                  : data.in_dia_chi_data;
                setAddressFlyerData(parsed || DEFAULT_ADDRESS_DATA);
                safeLocalStorageSet(STORAGE_KEYS.STICKER_ADDRESS_DATA, JSON.stringify(parsed));
              } catch (e) {
                console.error('Error parsing DB address data:', e);
              }
            } else {
              loadAddressFromLocalStorage();
            }
          } catch (e) {
            console.error('Lỗi tải DB:', e);
            loadAddressFromLocalStorage();
          }
        })();
      } else {
        loadAddressFromLocalStorage();
      }
    } else if (activeTab === 'in-phieu-bh') {
      const storeName = currentStoreId !== 'ALL' ? currentStoreId : '';
      if (storeName) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('store')
              .select('in_phieu_bh_data')
              .eq('id', normalizeStoreId(storeName))
              .maybeSingle();
            if (error) {
              console.error('Lỗi khi tải dữ liệu in-phieu-bh từ DB:', error);
              loadPhieuBhFromLocalStorage();
              return;
            }
            if (data && data.in_phieu_bh_data) {
              try {
                const parsed = typeof data.in_phieu_bh_data === 'string'
                  ? JSON.parse(data.in_phieu_bh_data)
                  : data.in_phieu_bh_data;
                setPhieuBhData(parsed || DEFAULT_PHIEU_BH);
                safeLocalStorageSet(STORAGE_KEYS.STICKER_PHIEU_BH_DATA, JSON.stringify(parsed));
              } catch (e) {
                console.error('Error parsing DB phieu_bh data:', e);
              }
            } else {
              loadPhieuBhFromLocalStorage();
            }
          } catch (e) {
            console.error('Lỗi tải DB:', e);
            loadPhieuBhFromLocalStorage();
          }
        })();
      } else {
        loadPhieuBhFromLocalStorage();
      }
    } else if (activeTab === 'sticker-event-dmx') {
      const storeName = currentStoreId !== 'ALL' ? currentStoreId : '';
      if (storeName) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('store')
              .select('sticker_ce_inventory_data')
              .eq('id', normalizeStoreId(storeName))
              .maybeSingle();
            if (error) {
              console.error('Lỗi khi tải dữ liệu tồn kho từ DB:', error);
              return;
            }
            if (data && data.sticker_ce_inventory_data) {
              try {
                const parsed = typeof data.sticker_ce_inventory_data === 'string'
                  ? JSON.parse(data.sticker_ce_inventory_data)
                  : data.sticker_ce_inventory_data;
                if (Array.isArray(parsed)) {
                  setInventoryData(parsed);
                }
              } catch (e) {
                console.error('Error parsing DB inventory data:', e);
              }
            } else {
              setInventoryData([]);
            }
          } catch (e) {
            console.error('Lỗi tải DB:', e);
          }
        })();
      } else {
        setInventoryData([]);
      }
    }
  }, [activeTab, currentStoreId]);

  const fetchInventoryData = async () => {
    // Disabled database fetching as per user request
    return;
  };

  const fetchPriceData = async () => {
    // Disabled database fetching as per user request
    return;
  };

  const combinedPriceData = React.useMemo(() => {
    const inventoryMap = new Map<string, { nganhHang: string, nhomHang: string, qty: number }>();
    const scannedCodesMap = new Map<string, string>();
    const scannedCodesSet = new Set<string>();

    if (inventoryData && inventoryData.length > 0) {
      if (typeof inventoryData[0] === 'string') {
        // Array of scanned barcodes/QR codes from phone
        inventoryData.forEach((code: any) => {
          if (code) {
            const cleanCode = String(code).trim();
            const prefix = cleanCode.split('-')[0].trim();
            scannedCodesSet.add(prefix);
            scannedCodesMap.set(prefix, cleanCode);
            
            const existing = inventoryMap.get(prefix);
            inventoryMap.set(prefix, {
              nganhHang: '',
              nhomHang: '',
              qty: (existing?.qty || 0) + 1
            });
          }
        });
      } else if (Array.isArray(inventoryData[0])) {
        // Excel file data
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
          let maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
          if (maSpIdx === -1 && activeTab === 'sticker-event-dmx') {
            maSpIdx = 2; // Column C fallback
          }
          const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
          const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');
          // Fallback for EVENT DMX: Col D (index 3) = Ngành hàng, Col E (index 4) = Nhóm hàng
          const effectiveNganhHangIdx = nganhHangIdx !== -1 ? nganhHangIdx : (activeTab === 'sticker-event-dmx' ? 3 : -1);
          const effectiveNhomHangIdx = nhomHangIdx !== -1 ? nhomHangIdx : (activeTab === 'sticker-event-dmx' ? 4 : -1);
          const qrIdx = headerRow.findIndex((h: string) => h.includes('qr') || h.includes('quét') || h.includes('điện thoại'));
          const tonKhoIdx = headerRow.findIndex((h: string) => h === 'tồn cuối' || h === 'tồn kho' || h === 'tồn' || h.includes('số lượng') || h.includes('sl') || h.includes('kho') || h.includes('qty'));

          if (maSpIdx !== -1) {
            for (let i = headerRowIdx + 1; i < inventoryData.length; i++) {
              const row = inventoryData[i];
              if (!row || !Array.isArray(row)) continue;
              const maSp = String(row[maSpIdx] || '').trim();
              if (maSp) {
                const qrVal = qrIdx !== -1 ? String(row[qrIdx] || '').trim() : '';
                const tonKhoVal = activeTab === 'sticker-event-dmx'
                  ? parseInt(String(row[9] || '').replace(/\./g, '').replace(/,/g, '')) || 0
                  : (tonKhoIdx !== -1 ? parseInt(String(row[tonKhoIdx]).replace(/\./g, '').replace(/,/g, '')) || 0 : 1);
                const existing = inventoryMap.get(maSp);
                
                inventoryMap.set(maSp, {
                  nganhHang: effectiveNganhHangIdx !== -1 ? String(row[effectiveNganhHangIdx] || '').trim() : '',
                  nhomHang: effectiveNhomHangIdx !== -1 ? String(row[effectiveNhomHangIdx] || '').trim() : '',
                  qty: (existing?.qty || 0) + tonKhoVal
                });
                if (qrVal) {
                  scannedCodesSet.add(maSp);
                  scannedCodesMap.set(maSp, qrVal);
                }
              }
            }
          }
        }
      } else {
        // Array of objects from database
        inventoryData.forEach((item: any) => {
          if (item.ma_san_pham) {
            const existing = inventoryMap.get(item.ma_san_pham);
            const itemQty = item.so_luong || item.soluong || item.qty || item.quantity || 1;
            inventoryMap.set(item.ma_san_pham, {
              nganhHang: item.nganh_hang || '',
              nhomHang: item.nhom_hang || '',
              qty: (existing?.qty || 0) + itemQty
            });
            const qrVal = item.qr_data || item.qrData || item.scanned_code;
            if (qrVal) {
              scannedCodesSet.add(item.ma_san_pham);
              scannedCodesMap.set(item.ma_san_pham, qrVal);
            }
          }
        });
      }
    }

    return priceData.map(item => {
      const productCode = item.maSanPham || item.productCode || (item.name || '').split(' - ')[0].trim();
      const invInfo = inventoryMap.get(productCode);
      const inStock = scannedCodesSet.has(productCode) || !!invInfo;
      const qrData = scannedCodesMap.get(productCode) || '';
      return {
        ...item,
        inStock,
        qrData,
        nganhHang: invInfo?.nganhHang || item.nganhHang || '',
        nhomHang: invInfo?.nhomHang || item.nhomHang || '',
        tonKho: invInfo?.qty || 0
      };
    });
  }, [priceData, inventoryData]);

  const filteredPriceData = React.useMemo(() => {
    let result = combinedPriceData.filter(item => {
      const matchNganh = !filters.nganhHang || item.nganhHang === filters.nganhHang;
      const matchNhom = !filters.nhomHang || item.nhomHang === filters.nhomHang;
      const matchInv = !filters.onlyInventory || (item.tonKho !== undefined && item.tonKho > 0);
      const matchQr = !filters.selectedQrs || (item.qrData ? filters.selectedQrs.includes(item.qrData) : filters.selectedQrs.includes('(Trống)'));
      const matchName = !filters.tenSanPham || 
        (item.name && item.name.toLowerCase().includes(filters.tenSanPham.toLowerCase())) || 
        (item.maSanPham && item.maSanPham.toLowerCase().includes(filters.tenSanPham.toLowerCase()));
      return matchNganh && matchNhom && matchInv && matchQr && matchName;
    });

    if (filters.sortOrder === 'asc') {
      result = [...result].sort((a, b) => Number(a.discountPrice || 0) - Number(b.discountPrice || 0));
    } else if (filters.sortOrder === 'desc') {
      result = [...result].sort((a, b) => Number(b.discountPrice || 0) - Number(a.discountPrice || 0));
    }

    return result;
  }, [combinedPriceData, filters]);

  const uniqueNganhHang = React.useMemo(() => {
    const set = new Set<string>();
    combinedPriceData.forEach(item => {
      if (item.nganhHang) set.add(item.nganhHang);
    });
    return Array.from(set).sort();
  }, [combinedPriceData]);

  const uniqueNhomHang = React.useMemo(() => {
    const set = new Set<string>();
    combinedPriceData.forEach(item => {
      if (item.nhomHang && (!filters.nganhHang || item.nganhHang === filters.nganhHang)) {
        set.add(item.nhomHang);
      }
    });
    return Array.from(set).sort();
  }, [combinedPriceData, filters.nganhHang]);

  const uniqueQrs = React.useMemo(() => {
    const set = new Set<string>();
    let hasEmpty = false;
    combinedPriceData.forEach(item => {
      if (item.qrData) {
        set.add(item.qrData);
      } else {
        hasEmpty = true;
      }
    });
    const arr = Array.from(set).sort();
    if (hasEmpty) {
      arr.push('(Trống)');
    }
    return arr;
  }, [combinedPriceData]);

  React.useEffect(() => {
    const initialQuantities: Record<number, number> = {};
    filteredPriceData.forEach((_, index) => {
      initialQuantities[index] = 1;
    });
    setPrintQuantities(initialQuantities);
    setSelectedIndices(filteredPriceData.map((_, index) => index));
  }, [filteredPriceData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIndices = filteredPriceData.map((_, index) => index);
      setSelectedIndices(allIndices);
      const newQuantities = { ...printQuantities };
      allIndices.forEach(index => {
        if (!newQuantities[index] || newQuantities[index] === 0) newQuantities[index] = 1;
      });
      setPrintQuantities(newQuantities);
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectRow = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        if (!printQuantities[index] || printQuantities[index] === 0) {
          setPrintQuantities(prevQ => ({ ...prevQ, [index]: 1 }));
        }
        return [...prev, index];
      }
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newQty = Math.max(0, qty);
    setPrintQuantities(prev => ({
      ...prev,
      [index]: newQty
    }));
    
    if (newQty > 0) {
      if (!selectedIndices.includes(index)) {
        setSelectedIndices(prev => [...prev, index]);
      }
    } else {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    }
  };

  const handleSetPrintQtyToInventoryAll = () => {
    const newQuantities = { ...printQuantities };
    const newSelected = [...selectedIndices];
    
    filteredPriceData.forEach((item, index) => {
      const qty = item.tonKho || 0;
      newQuantities[index] = qty;
      if (qty > 0) {
        if (!newSelected.includes(index)) {
          newSelected.push(index);
        }
      } else {
        const selIdx = newSelected.indexOf(index);
        if (selIdx !== -1) {
          newSelected.splice(selIdx, 1);
        }
      }
    });
    
    setPrintQuantities(newQuantities);
    setSelectedIndices(newSelected);
    showNotification(`Đã đặt số lượng in theo tồn kho cho ${filteredPriceData.length} sản phẩm hiển thị!`, 'success');
  };

  const totalStickersToPrint = React.useMemo(() => {
    return selectedIndices.reduce((sum, index) => sum + (printQuantities[index] || 0), 0);
  }, [selectedIndices, printQuantities]);

  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let entry = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            entry += '"';
            i++; // Skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          entry += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(entry);
          entry = '';
        } else if (char === '\r' || char === '\n') {
          row.push(entry);
          entry = '';
          if (row.length > 0 || char === '\n') {
            result.push(row);
            row = [];
          }
          if (char === '\r' && nextChar === '\n') {
            i++; // Skip \n
          }
        } else {
          entry += char;
        }
      }
    }
    if (entry || row.length > 0) {
      row.push(entry);
      result.push(row);
    }
    return result;
  };

  const handleSyncGoogleSheet = async () => {
    const currentUsername = userProfile?.username;
    if (currentUsername && currentUsername !== '43751') {
      showNotification('Chỉ duy nhất Quản trị viên 43751 mới có quyền thực hiện đồng bộ Google Sheet!', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const csvUrl = activeTab === 'sticker-gvgs'
        ? 'https://docs.google.com/spreadsheets/d/16hKL7GnR6XdRJsb-lRfbSF5EOVzm_A82gVNDxhbF_8Q/export?format=csv'
        : 'https://docs.google.com/spreadsheets/d/13MDK0KEgRnTzBP6zpIv02FtaJo-nGzq9TvY4rQPzb3o/export?format=csv';

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Không thể tải file từ Google Sheet. Hãy kiểm tra lại kết nối mạng hoặc quyền chia sẻ của link.');
      }
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        throw new Error('Dữ liệu từ Google Sheet rỗng hoặc không đúng định dạng.');
      }
      
      const headerRow = rows[0].map(h => h.trim().toLowerCase());
      
      // Find indexes
      const nganhHangIdx = headerRow.findIndex(h => h.includes('ngành hàng'));
      const nhomHangIdx = headerRow.findIndex(h => h.includes('nhóm hàng'));
      const codeIdx = headerRow.findIndex(h => h.includes('code sản phẩm') || h.includes('mã sản phẩm') || h.includes('mã sp') || h.includes('mã hàng'));
      const tenIdx = headerRow.findIndex(h => h.includes('tên sản phẩm') || h.includes('tên sp') || h.includes('tên hàng'));
      const giaNiemYetIdx = headerRow.findIndex(h => h.includes('giá niêm yết') || h.includes('giá bán ny') || h.includes('giá gốc') || h.includes('giá ny'));
      let giaKmIdx = headerRow.findIndex(h => h.includes('giá km gvgs') || h.includes('gvgs') || h.includes('giá km st event') || h.includes('st event'));
      if (giaKmIdx === -1) {
        giaKmIdx = headerRow.findIndex(h => h.includes('giá km') || h.includes('giá giảm') || h.includes('giá sau giảm'));
      }
      
      if (codeIdx === -1 || tenIdx === -1 || giaNiemYetIdx === -1 || giaKmIdx === -1) {
        throw new Error('Cấu trúc cột trong Google Sheet không khớp (Cần có cột: Mã sản phẩm, Tên sản phẩm, Giá niêm yết/Giá gốc, Giá KM).');
      }
      
      const parsedData: any[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        if (row.length <= Math.max(codeIdx, tenIdx, giaNiemYetIdx, giaKmIdx)) continue;
        
        const maSp = row[codeIdx]?.trim();
        const tenSp = row[tenIdx]?.trim();
        
        if (!maSp || !tenSp) continue;
        
        const cleanPrice = (valStr: string) => {
          if (!valStr) return 0;
          return parseInt(String(valStr).replace(/\./g, '').replace(/,/g, '').replace(/đ/g, '').trim(), 10) || 0;
        };
        
        const originalPrice = cleanPrice(row[giaNiemYetIdx]);
        const discountPrice = cleanPrice(row[giaKmIdx]);
        
        parsedData.push({
          maSanPham: maSp,
          productCode: maSp,
          name: tenSp,
          originalPrice,
          discountPrice,
          nganhHang: nganhHangIdx !== -1 && row[nganhHangIdx]?.trim() ? row[nganhHangIdx]?.trim() : (activeTab === 'sticker-gvgs' ? 'GIỜ VÀNG GIÁ SỐC' : ''),
          nhomHang: nhomHangIdx !== -1 ? row[nhomHangIdx]?.trim() : ''
        });
      }
      
      if (parsedData.length === 0) {
        throw new Error('Không phân tích được sản phẩm nào hợp lệ từ Google Sheet.');
      }
      
      // Update local states
      setPriceData(parsedData);
      const timestampString = new Date().toLocaleString('vi-VN');
      setLastUpdatePrice(timestampString);
      
      // Save locally to localStorage
      const keys = getStorageKeysForTab(activeTab);
      const currentUsername = userProfile?.username || '43751';
      safeLocalStorageSet(keys.price, JSON.stringify({
        data: parsedData,
        timestamp: new Date().toISOString(),
        updated_by: currentUsername
      }));
      setUpdatedBy(currentUsername);
      
      if (activeTab === 'sticker-event-dmx' || activeTab === 'sticker-gvgs') {
        const docId = activeTab === 'sticker-gvgs' ? 'GVGS_GLOBAL' : 'EVENT_DMX_GLOBAL';
        const docTitle = activeTab === 'sticker-gvgs' ? 'Cấu hình GVGS toàn hệ thống' : 'Cấu hình EVENT ĐMX toàn hệ thống';

        // Save to Firebase (store table in database) -> document docId
        const record = {
          id: docId,
          ten_sieu_thi: docTitle,
          warehouse_code: 'GLOBAL',
          sticker_ce_price_data: JSON.stringify(parsedData),
          updated_by: currentUsername,
          updated_at: new Date().toISOString()
        };
        
        const { error: dbError } = await supabase
          .from('store')
          .upsert(record, { onConflict: 'id' });
          
        if (dbError) {
          console.error('Lỗi khi lưu dữ liệu lên Firebase:', dbError);
          showNotification('Đồng bộ thành công cục bộ nhưng không thể lưu lên Firebase!', 'error');
        } else {
          showNotification(`Đồng bộ thành công ${parsedData.length} sản phẩm ${activeTab === 'sticker-gvgs' ? 'GVGS ' : ''}từ Google Sheet và đã lưu lên Firebase cho tất cả người dùng!`, 'success');
        }
      } else {
        showNotification(`Đồng bộ thành công ${parsedData.length} sản phẩm từ Google Sheet!`, 'success');
      }
      
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Lỗi khi đồng bộ Google Sheet', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | File, type: 'inventory' | 'price', shouldAppend: boolean = false) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    if (type === 'inventory') {
      setInventoryFile(file);
    } else if (!shouldAppend) {
      setPriceFile(file);
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataBuffer = evt.target?.result as ArrayBuffer;
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][]; 
      
      if (!data || data.length === 0) {
        showNotification('File Excel không có dữ liệu!', 'error');
        return;
      }

      if (type === 'inventory') {
        const keys = getStorageKeysForTab(activeTab);
        setInventoryData(data);
        const timestamp = new Date().toISOString();
        setLastUpdateInventory(new Date(timestamp).toLocaleString('vi-VN'));
        safeLocalStorageSet(keys.inventory, JSON.stringify({
          data,
          timestamp
        }));

        if (activeTab === 'sticker-event-dmx') {
          const storeName = currentStoreId !== 'ALL' ? currentStoreId : '';
          if (!storeName) {
            showNotification('Vui lòng chọn siêu thị cụ thể trước khi tải tồn kho!', 'error');
            return;
          }
          const normalizedId = normalizeStoreId(storeName);
          const cleanStoreCode = maKho.replace(/^0+/, '');
          
          // Upsert to create if not exists, update if exists
          const { error: updateErr } = await supabase
            .from('store')
            .upsert({ 
              id: normalizedId,
              ten_sieu_thi: storeName,
              warehouse_code: cleanStoreCode,
              sticker_ce_inventory_data: JSON.stringify(data)
            }, { onConflict: 'id' });
            
          if (updateErr) {
            console.error('Lỗi khi lưu tồn kho lên Firebase:', updateErr);
            showNotification('Lỗi khi lưu tồn kho lên Firebase!', 'error');
          } else {
            showNotification(`Đã tải tồn kho và đồng bộ Firebase cho ${storeName}!`, 'success');
          }
        } else {
          showNotification('Đã tải và lưu tạm file Tồn kho!', 'success');
          
          // Tự động xuất file Excel chỉ lấy dữ liệu cột G (Không tự xuất khi ở tab EVENT ĐMX)
          try {
            const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'Du_Lieu';
            const colGData = data.map((row) => {
              const value = row && row.length > 6 ? row[6] : '';
              return [value];
            });
            const exportWs = XLSX.utils.aoa_to_sheet(colGData);
            const exportWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(exportWb, exportWs, 'Sheet1');
            XLSX.writeFile(exportWb, `${originalName}_Cot_G.xlsx`);
            showNotification('Đã tự động xuất file Excel cột G!', 'success');
          } catch (err) {
            console.error('Error auto-exporting column G:', err);
          }
        }
      } else {
        // Process price data
        const parsedPriceData: any[] = [];

        if (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') {
          const isSystemReport = data.some(row => row && row.length > 55);
          if (isSystemReport) {
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colAS = String(row[44] || '').trim();  // Cột AS = Tên sản phẩm
              let colBD = String(row[55] || '').trim();   // Cột BD = Mã sản phẩm
              const colAH = row[33];                        // Cột AH = Giá gốc
              const colU = row[20];                         // Cột U = Giá giảm

              // Bỏ qua dòng tiêu đề
              if (i === 0 && (colAS.toLowerCase().includes('tên') || colBD.toLowerCase().includes('mã') || colAS === 'TÊN SẢN PHẨM')) {
                continue;
              }

              if (!colAS) continue;

              // Điều kiện lấy những kí tự trước (-) cho mã sản phẩm
              if (colBD.includes('-')) {
                colBD = colBD.split('-')[0].trim();
              }

              parsedPriceData.push({
                maSanPham: colBD,
                productCode: colBD,
                name: colAS,
                originalPrice: cleanPrice(colAH),
                discountPrice: cleanPrice(colU),
                nganhHang: activeTab === 'sticker-gvgs' ? 'GIỜ VÀNG GIÁ SỐC' : 'MÁY LỌC NƯỚC',
                nhomHang: '',
                endDate: ''
              });
            }
          } else {
            // File template mẫu cho MLN & GVGS
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colA = String(row[0] || '').trim();  // Ngành hàng
              const colB = String(row[1] || '').trim();  // Tên sản phẩm
              const colC = row[2];                        // Giá gốc
              const colD = row[3];                        // Giá giảm
              const colE = String(row[4] || '').trim();  // Ngày hết hạn

              if (i === 0 && (colB.toLowerCase().includes('tên') || colA.toLowerCase().includes('ngành') || colB === 'TÊN SẢN PHẨM')) {
                continue;
              }

              if (!colB) continue;

              parsedPriceData.push({
                maSanPham: '',
                productCode: '',
                name: colB,
                originalPrice: cleanPrice(colC),
                discountPrice: cleanPrice(colD),
                nganhHang: colA || (activeTab === 'sticker-gvgs' ? 'GIỜ VÀNG GIÁ SỐC' : 'MÁY LỌC NƯỚC'),
                nhomHang: '',
                endDate: colE
              });
            }
          }
        } else if (activeTab === 'sticker-ce') {
          const isSystemReport = data.some(row => row && row.length > 28);
          if (isSystemReport) {
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colAB = String(row[27] || '').trim();  // Cột AB = Tên sản phẩm
              let colAC = String(row[28] || '').trim();   // Cột AC = Mã sản phẩm
              const colQ = row[16];                         // Cột Q = Giá gốc
              const colR = row[17];                         // Cột R = Giá giảm

              // Bỏ qua dòng tiêu đề
              if (i === 0 && (colAB.toLowerCase().includes('tên') || colAC.toLowerCase().includes('mã') || colAB === 'TÊN SẢN PHẨM')) {
                continue;
              }

              if (!colAB) continue;

              // Điều kiện lấy những kí tự trước (-) cho mã sản phẩm
              if (colAC.includes('-')) {
                colAC = colAC.split('-')[0].trim();
              }

              parsedPriceData.push({
                maSanPham: colAC,
                productCode: colAC,
                name: colAB,
                originalPrice: cleanPrice(colQ),
                discountPrice: cleanPrice(colR),
                nganhHang: 'TIVI, TỦ LẠNH, MÁY GIẶT',
                nhomHang: '',
                endDate: ''
              });
            }
          } else {
            // File template mẫu cho CE
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colA = String(row[0] || '').trim();  // Mã SP
              const colB = String(row[1] || '').trim();  // Tên sản phẩm
              const colC = row[2];                        // Giá gốc
              const colD = row[3];                        // Giá giảm

              if (i === 0 && (colB.toLowerCase().includes('tên') || colA.toLowerCase().includes('mã') || colB === 'TÊN SẢN PHẨM')) {
                continue;
              }

              if (!colB) continue;

              parsedPriceData.push({
                maSanPham: colA,
                productCode: colA,
                name: colB,
                originalPrice: cleanPrice(colC),
                discountPrice: cleanPrice(colD),
                nganhHang: 'TIVI, TỦ LẠNH, MÁY GIẶT',
                nhomHang: '',
                endDate: ''
              });
            }
          }
        } else if (activeTab === 'sticker-lk') {
          const isSystemReport = data.some(row => row && row.length > 27);
          if (isSystemReport) {
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colAB = String(row[27] || '').trim();  // Cột AB = Tên sản phẩm & Mã sản phẩm
              const colV = row[21];                         // Cột V = Giá gốc
              const colU = row[20];                         // Cột U = Giá giảm

              // Bỏ qua dòng tiêu đề
              if (i === 0 && (colAB.toLowerCase().includes('tên') || colAB.toLowerCase().includes('mã') || colAB === 'TÊN SẢN PHẨM')) {
                continue;
              }

              if (!colAB) continue;

              // Điều kiện lấy những kí tự trước (-) cho mã sản phẩm
              let code = colAB;
              if (code.includes('-')) {
                code = code.split('-')[0].trim();
              }

              // Điều kiện lấy những kí tự sau (-) cho tên sản phẩm
              let name = colAB;
              if (name.includes('-')) {
                const hyphenIndex = name.indexOf('-');
                name = name.substring(hyphenIndex + 1).trim();
              }

              parsedPriceData.push({
                maSanPham: code,
                productCode: code,
                name: name,
                originalPrice: cleanPrice(colV),
                discountPrice: cleanPrice(colU),
                nganhHang: 'LOA KÉO',
                nhomHang: '',
                endDate: ''
              });
            }
          } else {
            // File template mẫu cho LK
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colA = String(row[0] || '').trim();  // Mã SP
              const colB = String(row[1] || '').trim();  // Tên sản phẩm
              const colC = row[2];                        // Giá gốc
              const colD = row[3];                        // Giá giảm

              if (i === 0 && (colB.toLowerCase().includes('tên') || colA.toLowerCase().includes('mã') || colB === 'TÊN SẢN PHẨM')) {
                continue;
              }

              if (!colB) continue;

              parsedPriceData.push({
                maSanPham: colA,
                productCode: colA,
                name: colB,
                originalPrice: cleanPrice(colC),
                discountPrice: cleanPrice(colD),
                nganhHang: 'LOA KÉO',
                nhomHang: '',
                endDate: ''
              });
            }
          }
        } else if (shouldAppend) {
          // TRANG STICKER -> BẢNG DỮ LIỆU BẢNG GIÁ -> Cột A = Mã SP, Cột B = Tên SP, Cột C = Giá gốc, Cột D = Giá giảm
          const cleanPrice = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
          };

          for (let i = 0; i < data.length; i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;

            const colA = String(row[0] || '').trim();  // Cột A
            const colB = String(row[1] || '').trim();  // Cột B
            const colC = row[2];                        // Cột C = Giá gốc
            const colD = row[3];                        // Cột D = Giá giảm

            // Bỏ qua dòng tiêu đề
            if (i === 0 && (colA.toLowerCase().includes('mã') || colB.toLowerCase().includes('tên') || colB.toLowerCase().includes('sản phẩm'))) {
              continue;
            }

            if (!colB) continue; // Bỏ qua dòng trống không có tên SP

            parsedPriceData.push({
              maSanPham: colA,
              productCode: colA,
              name: colB,
              originalPrice: cleanPrice(colC),
              discountPrice: cleanPrice(colD),
              nganhHang: '',
              nhomHang: ''
            });
          }
        } else {
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('tên sản phẩm') || rowStr.includes('tên hàng') || rowStr.includes('mã sản phẩm') || rowStr.includes('giá niêm yết') || rowStr.includes('giá gốc') || rowStr.includes('giá sau giảm')) {
              headerRowIdx = i;
              break;
            }
          }

          if (headerRowIdx !== -1) {
            const headerRow = data[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
            const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
            const nameIdx = headerRow.findIndex((h: string) => h === 'tên sản phẩm' || h === 'tên hàng' || h === 'sản phẩm');
            const originalPriceIdx = headerRow.findIndex((h: string) => h === 'giá niêm yết' || h === 'giá gốc' || h === 'giá cũ');
            const discountPriceIdx = headerRow.findIndex((h: string) => h === 'giá mới' || h === 'giá giảm' || h === 'giá bán' || h === 'giá hiện tại' || h === 'giá sau giảm');
            const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
            const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

            for (let i = headerRowIdx + 1; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
              if (!name || name.toLowerCase().includes('tên sản phẩm')) continue;

              const cleanPrice = (val: any) => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'number') return val;
                return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
              };

              parsedPriceData.push({
                maSanPham: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
                productCode: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
                name,
                originalPrice: originalPriceIdx !== -1 ? cleanPrice(row[originalPriceIdx]) : 0,
                discountPrice: discountPriceIdx !== -1 ? cleanPrice(row[discountPriceIdx]) : 0,
                nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
                nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
              });
            }
          } else {
            // Fallback: Không tìm thấy header
            // Cột AK (index 36) = Mã SP, Cột A+B = Tên SP, Cột E = Giá gốc, Cột F = Giá giảm
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colA = String(row[0] || '').trim();  // Cột A
              const colB = String(row[1] || '').trim();  // Cột B
              const colE = row[4];                        // Cột E = Giá gốc
              const colF = row[5];                        // Cột F = Giá giảm
              const colAK = String(row[36] || '').trim(); // Cột AK = Mã SP

              // Tên SP = Cột A + Cột B (gộp lại)
              const name = [colA, colB].filter(Boolean).join(' ').trim();

              // Bỏ qua dòng trống
              if (!name) continue;

              parsedPriceData.push({
                maSanPham: colAK,
                productCode: colAK,
                name,
                originalPrice: cleanPrice(colE),
                discountPrice: cleanPrice(colF),
                nganhHang: '',
                nhomHang: ''
              });
            }
          }
        }

        const finalData = shouldAppend ? [...priceData, ...parsedPriceData] : parsedPriceData;
        setPriceData(finalData);
        
        const timestamp = new Date().toISOString();
        if (!shouldAppend) setLastUpdatePrice(new Date(timestamp).toLocaleString('vi-VN'));
        
        const keys = getStorageKeysForTab(activeTab);
        safeLocalStorageSet(keys.price, JSON.stringify({
          data: finalData,
          timestamp
        }));
        
        // Sync price data to Firebase for EVENT DMX tab
        if (activeTab === 'sticker-event-dmx') {
          const currentUsername = userProfile?.username || '43751';
          const record = {
            id: 'EVENT_DMX_GLOBAL',
            ten_sieu_thi: 'Cấu hình EVENT ĐMX toàn hệ thống',
            warehouse_code: 'GLOBAL',
            sticker_ce_price_data: JSON.stringify(finalData),
            updated_by: currentUsername,
            updated_at: timestamp
          };
          
          const { error: dbError } = await supabase
            .from('store')
            .upsert(record, { onConflict: 'id' });
            
          if (dbError) {
            console.error('Lỗi khi lưu bảng giá lên Firebase:', dbError);
            const message = shouldAppend 
              ? `Đã thêm ${parsedPriceData.length} sản phẩm nhưng không thể lưu lên Firebase!` 
              : `Đã tải ${parsedPriceData.length} sản phẩm nhưng không thể lưu lên Firebase!`;
            showNotification(message, 'error');
          } else {
            const message = shouldAppend 
              ? `Đã thêm ${parsedPriceData.length} sản phẩm và đồng bộ Firebase!` 
              : `Đã tải ${parsedPriceData.length} sản phẩm bảng giá và đồng bộ Firebase!`;
            showNotification(message, 'success');
          }
        } else {
          const message = shouldAppend 
            ? `Đã thêm ${parsedPriceData.length} sản phẩm vào danh sách!` 
            : `Đã tải và đồng bộ ${parsedPriceData.length} sản phẩm bảng giá!`;
          showNotification(message, 'success');
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearData = () => {
    setInventoryFile(null);
    setPriceFile(null);
    setInventoryData([]);
    setPriceData([]);
    setLastUpdateInventory(null);
    setLastUpdatePrice(null);
    const keys = getStorageKeysForTab(activeTab);
    localStorage.removeItem(keys.inventory);
    localStorage.removeItem(keys.price);
    setSaveMessage({ type: '', text: '' });
    if (inventoryInputRef.current) inventoryInputRef.current.value = '';
    if (priceInputRef.current) priceInputRef.current.value = '';
  };

  // Listen to realtime updates for the scanner session
  useEffect(() => {
    if (!isScannerOpen || !scannerSessionId) return;

    const handleRealtimePayload = (payload: any) => {
      if (payload.new && payload.new.scanned_codes) {
        try {
          const codes = JSON.parse(payload.new.scanned_codes);
          if (Array.isArray(codes)) {
            setScannedCodes(codes);
          }
        } catch (err) {
          console.error('Lỗi khi parse mã quét từ DB:', err);
        }
      }
    };

    const channel = supabase.channel(`public:scanner_sessions:${scannerSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'scanner_sessions',
        filter: `id=eq.${scannerSessionId}`
      }, handleRealtimePayload)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scanner_sessions',
        filter: `id=eq.${scannerSessionId}`
      }, handleRealtimePayload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isScannerOpen, scannerSessionId]);

  // Load html5-qrcode library dynamically if not present
  useEffect(() => {
    if (isScannerOpen && !window.Html5Qrcode) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      script.onload = () => {
        findCameras();
      };
      script.onerror = () => {
        setScannerError('Không thể tải thư viện quét từ CDN.');
      };
      document.body.appendChild(script);
    } else if (isScannerOpen && window.Html5Qrcode) {
      findCameras();
    }
  }, [isScannerOpen]);

  // Audio beep player
  useEffect(() => {
    const playBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (err) {
        console.warn('Audio beep failed:', err);
      }
    };
    beepSoundRef.current = playBeep;
  }, []);

  // Beep when scannedCodes length increases
  const lastCodesLengthRef = useRef(0);
  useEffect(() => {
    if (isScannerOpen && scannedCodes.length > lastCodesLengthRef.current) {
      beepSoundRef.current?.();
    }
    lastCodesLengthRef.current = scannedCodes.length;
  }, [scannedCodes, isScannerOpen]);

  // Auto-start scanning when camera is selected
  useEffect(() => {
    if (isScannerOpen && selectedCameraId) {
      startScanning(selectedCameraId);
    }
    return () => {
      stopScanning();
    };
  }, [isScannerOpen, selectedCameraId]);

  const findCameras = () => {
    if (window.Html5Qrcode) {
      window.Html5Qrcode.getCameras()
        .then((devices: any[]) => {
          const formatted = devices && devices.length > 0
            ? devices.map(d => ({ id: d.id, label: d.label || '' }))
            : [];
          
          // Always offer a "Camera Sau (Mặc định)" option mapping to facingMode environment
          const finalCameras = [
            { id: 'environment', label: 'Camera Sau (Mặc định)' },
            ...formatted
          ];
          setCameras(finalCameras);

          // Find back camera from list by label
          const backCam = formatted.find(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear') || 
            c.label.toLowerCase().includes('sau')
          );

          // Default to the specific back camera ID if found, otherwise 'environment'
          const defaultCamId = backCam ? backCam.id : 'environment';
          setSelectedCameraId(defaultCamId);
        })
        .catch((err: any) => {
          console.error('Error getting cameras:', err);
          // Fallback option
          setCameras([{ id: 'environment', label: 'Camera Sau (Mặc định)' }]);
          setSelectedCameraId('environment');
        });
    }
  };

  const startScanning = async (cameraId: string) => {
    if (!html5QrcodeScannerRef.current && window.Html5Qrcode) {
      html5QrcodeScannerRef.current = new window.Html5Qrcode('modal-reader');
    }

    if (!html5QrcodeScannerRef.current || !cameraId) return;

    setIsScanning(true);
    setScannerError(null);

    try {
      if (html5QrcodeScannerRef.current.isScanning) {
        await html5QrcodeScannerRef.current.stop();
      }

      // Map cameraId 'environment' to config constraint to open back camera
      const cameraConfig = cameraId === 'environment' ? { facingMode: 'environment' } : cameraId;

      await html5QrcodeScannerRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
          aspectRatio: 1
        },
        (decodedText: string) => {
          const code = decodedText.trim();
          if (code) {
            beepSoundRef.current?.();
            if (navigator.vibrate) navigator.vibrate(100);

            setScannedCodes(prev => {
              if (prev.includes(code)) return prev;
              const next = [code, ...prev];
              if (scannerSessionId) {
                supabase.from('scanner_sessions').upsert({
                  id: scannerSessionId,
                  store_id: maKho || 'ALL',
                  scanned_codes: JSON.stringify(next)
                }, {
                  onConflict: 'id'
                }).catch(err => console.error('Error syncing code to Supabase:', err));
              }
              return next;
            });
          }
        },
        () => {}
      );

      setTimeout(async () => {
        try {
          if (html5QrcodeScannerRef.current?.isScanning) {
            await html5QrcodeScannerRef.current.applyVideoConstraints({
              focusMode: 'continuous'
            });
          }
        } catch (err) {
          console.warn('html5-qrcode focusMode error:', err);
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to start scanning:', err);
      setScannerError('Lỗi khởi động camera.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.isScanning) {
      try {
        await html5QrcodeScannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleCameraChange = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (isScanning) {
      startScanning(cameraId);
    }
  };

  const handleStartScanner = async () => {
    if (!maKho) {
      showNotification('Vui lòng nhập Thông tin người in trước khi quét!', 'error');
      return;
    }
    const sessionId = "CE-SCAN-" + Math.random().toString(36).substring(2, 11).toUpperCase();
    setScannerSessionId(sessionId);
    setScannedCodes([]);
    setIsScannerOpen(true);
    setScannerMode('local');
    setScannerError(null);
    setIsScanning(false);

    try {
      await supabase.from('scanner_sessions').upsert({
        id: sessionId,
        store_id: maKho,
        scanned_codes: JSON.stringify([])
      }, {
        onConflict: 'id'
      });
    } catch (err) {
      console.error('Error initializing scanner session in DB:', err);
    }
  };

  const handleCloseScanner = async () => {
    await stopScanning();
    setIsScannerOpen(false);
    setScannerSessionId('');
    setScannedCodes([]);
  };

  const handleCompleteScanner = async () => {
    try {
      setInventoryData(scannedCodes);
      setLastUpdateInventory(new Date().toLocaleString('vi-VN'));
      
      const keys = getStorageKeysForTab(activeTab);
      const storageKey = keys.inventory;
      
      safeLocalStorageSet(storageKey, JSON.stringify({
        data: scannedCodes,
        timestamp: new Date().toISOString()
      }));

      if (scannerSessionId) {
        supabase.from('scanner_sessions').delete().eq('id', scannerSessionId)
          .catch(err => console.error('Error deleting session:', err));
      }

      await stopScanning();
      setIsScannerOpen(false);
      setScannerSessionId('');
      setScannedCodes([]);
      showNotification(`Đã tải thành công ${scannedCodes.length} mã tồn kho từ điện thoại!`, 'success');
    } catch (err) {
      console.error('Error completing scanner:', err);
      showNotification('Lỗi hoàn tất quét.', 'error');
    }
  };

  const handlePrintSticker = () => {
    setIsPrintModalOpen(true);
  };

  const handleAddManualSticker = () => {
    if (!manualData.name || !manualData.discountPrice) {
      showNotification('Vui lòng nhập tên sản phẩm và giá giảm!', 'error');
      return;
    }

    const newItem = {
      productCode: manualData.productCode || 'MANUAL',
      maSanPham: manualData.productCode || 'MANUAL',
      name: manualData.name,
      originalPrice: parseInt(manualData.originalPrice.replace(/[^\d]/g, '')) || 0,
      discountPrice: parseInt(manualData.discountPrice.replace(/[^\d]/g, '')) || 0,
      nganhHang: activeTab === 'sticker-mln' ? (manualData.nganhHang || 'MÁY LỌC NƯỚC') : activeTab === 'sticker-gvgs' ? (manualData.nganhHang || 'GIỜ VÀNG GIÁ SỐC') : (manualData.nganhHang || 'THỦ CÔNG'),
      nhomHang: 'THỦ CÔNG',
      endDate: manualData.endDate || '',
      isManual: true
    };

    setPriceData(prev => [newItem, ...prev]);
    setManualData({
      productCode: '',
      name: '',
      originalPrice: '',
      discountPrice: '',
      nganhHang: '',
      endDate: ''
    });
    showNotification('Đã thêm sản phẩm thủ công vào danh sách!', 'success');
  };

  const handleDeleteRow = (index: number) => {
    const itemToDelete = filteredPriceData[index];
    if (!itemToDelete) return;

    setPriceData(prev => prev.filter(item => {
      return !(item.maSanPham === itemToDelete.maSanPham && 
               item.productCode === itemToDelete.productCode && 
               item.name === itemToDelete.name);
    }));
    showNotification('Đã xóa sản phẩm khỏi danh sách!', 'success');
  };

  const handlePriceChange = (index: number, field: 'originalPrice' | 'discountPrice', value: string) => {
    const itemToUpdate = filteredPriceData[index];
    if (!itemToUpdate) return;

    // Use a unique combination of fields to identify the item in the original priceData
    const numericValue = value.replace(/[^0-9]/g, '');
    const newValue = numericValue ? parseInt(numericValue, 10) : 0;
    
    setPriceData(prev => prev.map(item => {
      const matches = (item.maSanPham === itemToUpdate.maSanPham && 
                       item.productCode === itemToUpdate.productCode && 
                       item.name === itemToUpdate.name);
      if (matches) {
        return { ...item, [field]: newValue };
      }
      return item;
    }));
  };

  const handleCategoryChange = (index: number, value: string) => {
    const itemToUpdate = filteredPriceData[index];
    if (!itemToUpdate) return;
    
    setPriceData(prev => prev.map(item => {
      const matches = (item.maSanPham === itemToUpdate.maSanPham && 
                       item.productCode === itemToUpdate.productCode && 
                       item.name === itemToUpdate.name);
      if (matches) {
        return { ...item, nganhHang: value };
      }
      return item;
    }));
  };

  const handleQuickPrint = (style: string, layout: string) => {
    const finalLayout = (style === 'giovang' || style === 'display') ? '1' : layout;
    setPrintConfig({ style, layout: finalLayout, showPromoLabel: true });
    setIsPrintModalOpen(true);
  };

  const handlePrintStickerDirect = () => {
    setIsLayoutModalOpen(true);
  };

  const renderSubTabs = () => {
    return (
      <div className="sticky top-0 z-20 bg-[#f8fafc]/95 backdrop-blur-sm pb-4 -mt-2 pt-2">
        <div className="bg-white rounded-[24px] border border-slate-200/60 p-2.5 shadow-sm flex items-center gap-3 w-fit">
          <button
            onClick={() => setActiveTab('all-sticker')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'all-sticker'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <span className="text-lg">🎪</span> EVENT
          </button>
          
          <button
            onClick={() => setActiveTab('sticker-lk')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'sticker-lk'
                ? 'border-violet-400 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            <span className="text-lg">🔊</span> LOA KÉO
          </button>

          <button
            onClick={() => setActiveTab('sticker-ce')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'sticker-ce'
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <span className="text-lg">🏢</span> TIVI, TỦ LẠNH, MÁY GIẶT
          </button>

          <button
            onClick={() => setActiveTab('sticker-mln')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'sticker-mln'
                ? 'border-teal-400 bg-teal-50 text-teal-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
            }`}
          >
            <span className="text-lg">💧</span> MLN
          </button>

          <button
            onClick={() => setActiveTab('sticker-gvgs')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'sticker-gvgs'
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <span className="text-lg">⚡</span> GVGS
          </button>

          <button
            onClick={() => setActiveTab('sticker-dcnb')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'sticker-dcnb'
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <span className="text-lg">🍳</span> DCNB
          </button>

          <button
            onClick={() => setActiveTab('sticker-event-dmx')}
            className={`flex items-center gap-2.5 py-3 px-6 rounded-full text-sm font-extrabold uppercase tracking-wide transition-all border-2 shadow-sm ${
              activeTab === 'sticker-event-dmx'
                ? 'border-rose-400 bg-rose-50 text-rose-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            <span className="text-lg">🎪</span> EVENT ĐMX
          </button>
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: 'all-sticker', label: 'ALL STICKER', icon: LayoutGrid, color: 'text-indigo-500' },
    { id: 'bbkq', label: 'BBKQ (KIỂM QUỸ)', icon: Banknote, color: 'text-emerald-600' },
    { id: 'in-dia-chi', label: 'IN ĐỊA CHỈ', icon: MapPin, color: 'text-emerald-600' },
    { id: 'in-phieu-bh', label: 'IN PHIẾU BH', icon: FileText, color: 'text-sky-600' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-utm-avo">
      {/* Top Header Section - Mobile only (desktop uses sidebar) */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm md:hidden">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00965e] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Tools Hỗ Trợ Công Việc</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#00965e] text-[9px] font-black uppercase tracking-widest">Quản Trị Viên</span>
                <span className="text-[10px] font-bold text-slate-400">Kho: {maKho || '43751'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-tighter">Đổi mật khẩu</button>
             <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><Info size={18} /></div>
             <button className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 transition-all uppercase tracking-tighter">Đăng Xuất</button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Horizontal Navigation Bar - Mobile only (desktop uses sidebar sub-tabs) */}
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-start gap-2 overflow-x-auto no-scrollbar md:hidden">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id || 
              (item.id === 'all-sticker' && (
                activeTab === 'sticker-event-dmx' ||
                activeTab === 'sticker-event' ||
                activeTab === 'sticker-lk' ||
                activeTab === 'sticker-ce' ||
                activeTab === 'sticker-mln' ||
                activeTab === 'sticker-gvgs' ||
                activeTab === 'sticker-dcnb'
              ));
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl md:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area - Full Width */}
        <div className="w-full min-w-0">
          {pageMaintenanceState[`toolhotro_${activeTab}`] && !isUser43751Local ? (
            <div className="flex items-center justify-center h-full p-6 mt-12">
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

            {false && (
              <motion.div
                key="all-sticker"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* 1. Sub Tabs Header */}
                {renderSubTabs()}

                {/* 2. Top layout: 2 columns for Nhập Liệu & In Thủ Công */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card 1: NHẬP DỮ LIỆU */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-400 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <UploadCloud size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">NHẬP DỮ LIỆU</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Tải file Tồn Kho & Bảng Giá để in sticker</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={inventoryInputRef}
                        onChange={(e) => handleFileUpload(e, 'inventory')}
                      />
                      <button
                        onClick={() => inventoryInputRef.current?.click()}
                        className={`w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                          inventoryFile || lastUpdateInventory
                            ? 'border-2 border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600'
                            : 'border-2 border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <span className="text-sm">{inventoryFile || lastUpdateInventory ? '✅' : '📥'}</span>
                        {inventoryFile || lastUpdateInventory ? 'Đã tải Tồn Kho' : 'Tải Tồn Kho'}
                      </button>

                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={priceInputRef}
                        onChange={(e) => handleFileUpload(e, 'price')}
                      />
                      <button
                        onClick={() => priceInputRef.current?.click()}
                        className={`w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                          priceFile || lastUpdatePrice
                            ? 'border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="text-sm">{priceFile || lastUpdatePrice ? '✅' : '📥'}</span>
                        {priceFile || lastUpdatePrice ? 'Đã tải Bảng Giá' : 'Tải Bảng Giá'}
                      </button>

                      <button
                        onClick={handleClearData}
                        className="w-full py-3 px-4 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-red-400 bg-red-50 text-red-700 hover:bg-red-100 shadow-sm cursor-pointer"
                      >
                        <span className="text-sm">🗑️</span>
                        Xóa dữ liệu
                      </button>
                    </div>
                  </div>

                  {/* Card 2: IN STICKER THỦ CÔNG */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-amber-100">
                          <FilePlus size={20} />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">NHẬP TAY THỦ CÔNG</h2>
                          <p className="text-[11px] text-slate-400 font-medium">Nhập trực tiếp không cần file</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Ngành hàng</label>
                          <input
                            type="text"
                            placeholder="VD: GIA DỤNG"
                            value={manualData.nganhHang}
                            onChange={(e) => setManualData(prev => ({ ...prev, nganhHang: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Mã sản phẩm</label>
                          <input
                            type="text"
                            placeholder="Mã SP..."
                            value={manualData.productCode}
                            onChange={(e) => setManualData(prev => ({ ...prev, productCode: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tên sản phẩm</label>
                          <input
                            type="text"
                            placeholder="Tên SP..."
                            value={manualData.name}
                            onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleAddManualSticker}
                          className="w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm"
                        >
                          <span className="text-base">📂</span> THÊM VÀO LIST
                        </button>
                        <label className="w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm cursor-pointer">
                          <span className="text-base">📤</span> {"FILE EXCEL -> LIST"}
                          <input
                            type="file"
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              handleFileUpload(e, 'price', true);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      <button
                        onClick={() => {
                          const templateData = [
                            {
                              'MÃ SẢN PHẨM': 'SP001',
                              'TÊN SẢN PHẨM': 'Ví dụ Tên Sản Phẩm',
                              'GIÁ GỐC': 1000000,
                              'GIÁ SAU GIẢM': 500000
                            }
                          ];
                          const worksheet = XLSX.utils.json_to_sheet(templateData);
                          const workbook = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(workbook, worksheet, 'StickerTemplate');
                          XLSX.writeFile(workbook, `Mau_In_Sticker_Event.xlsx`);
                          showNotification('Đã tải file Excel mẫu!', 'success');
                        }}
                        className="w-full py-3 rounded-full text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border-2 border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm"
                      >
                        <span className="text-base">📄</span> XUẤT FILE MẪU
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Middle layout: Full-width CHỌN KIỂU & BỐ CỤC IN */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-white shadow-lg shadow-violet-100">
                      <Printer size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">CHỌN KIỂU & BỐ CỤC IN</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Nhấp vào bố cục bên dưới mỗi kiểu để in trực tiếp</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pr-1">
                    {/* Style 1: Classic (Event) */}
                    <div className="rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all overflow-hidden group flex flex-col justify-between">
                      <div className="h-[440px] bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center overflow-hidden relative">
                        <div className="pointer-events-none select-none" style={{ transform: 'scale(0.6)', transformOrigin: 'center', width: '148.5mm', height: '105mm', flexShrink: 0 }}>
                          <Sticker
                            item={{ name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }}
                            style="classic"
                            layout="4"
                            showPromoLabel={true}
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-white border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 text-center">Kiểu Event</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { layout: '1', label: '1 / Trang' },
                            { layout: '2', label: '2 / Trang' },
                            { layout: '4', label: '4 / Trang' },
                            { layout: '8', label: '8 / Trang' }
                          ].map((s) => (
                            <button
                              key={s.layout}
                              onClick={() => { setPrintConfig({ style: 'classic', layout: s.layout, showPromoLabel: true }); setIsPrintModalOpen(true); }}
                              disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                              className="w-full py-3 px-3 rounded-full text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              🖨️ {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Style 2: Modern (Giá Quạt) */}
                    <div className="rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden group flex flex-col justify-between">
                      <div className="h-[440px] bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center overflow-hidden relative">
                        <div className="pointer-events-none select-none" style={{ transform: 'scale(0.6)', transformOrigin: 'center', width: '148.5mm', height: '105mm', flexShrink: 0 }}>
                          <Sticker
                            item={{ name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }}
                            style="modern"
                            layout="4"
                            showPromoLabel={true}
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-white border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 text-center">Kiểu Giá Quạt</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { layout: '1', label: '1 / Trang' },
                            { layout: '2', label: '2 / Trang' },
                            { layout: '4', label: '4 / Trang' },
                            { layout: '8', label: '8 / Trang' }
                          ].map((s) => (
                            <button
                              key={s.layout}
                              onClick={() => { setPrintConfig({ style: 'modern', layout: s.layout, showPromoLabel: true }); setIsPrintModalOpen(true); }}
                              disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                              className="w-full py-3 px-3 rounded-full text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              🖨️ {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Style 3: Display (Hàng Trưng Bày) */}
                    <div className="rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all overflow-hidden group flex flex-col justify-between">
                      <div className="h-[440px] bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center overflow-hidden relative">
                        <div className="pointer-events-none select-none" style={{ transform: 'scale(0.5)', transformOrigin: 'center', width: '148.5mm', height: '210mm', flexShrink: 0 }}>
                          <Sticker
                            item={{ name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, maSanPham: 'SP001' }}
                            style="display"
                            layout="1"
                            showPromoLabel={false}
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-white border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 text-center">Hàng Trưng Bày</h4>
                        <button
                          onClick={() => { setPrintConfig({ style: 'display', layout: '1', showPromoLabel: false }); setIsPrintModalOpen(true); }}
                          disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                          className="w-full py-3.5 px-3 rounded-full text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          🖨️ A5 ĐỨNG
                        </button>
                      </div>
                    </div>


                  </div>

                  {combinedPriceData.length > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-3 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Đã chọn: {selectedIndices.length} / {filteredPriceData.length} sản phẩm
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                        (Tổng: {selectedIndices.reduce((sum, idx) => sum + (printQuantities[idx] || 1), 0)} sticker)
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Section: BỘ LỌC TỒN KHO & BẢNG DỮ LIỆU */}
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">BỘ LỌC TỒN KHO</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={filters.onlyInventory}
                            onChange={(e) => setFilters(prev => ({ ...prev, onlyInventory: e.target.checked }))}
                          />
                          <span className="text-xs font-medium text-slate-600">Có trong tồn kho</span>
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          setFilters({ maSieuThi: '', nganhHang: '', nhomHang: [], onlyInventory: false, selectedQrs: null, sortOrder: '' });
                          setPrintQuantity('');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Ngành hàng</label>
                        <select
                          value={filters.nganhHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nganhHang: e.target.value, nhomHang: [] }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Tất cả</option>
                          {uniqueNganhHang.map(nganh => (
                            <option key={nganh} value={nganh}>{nganh}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Sắp xếp giá</label>
                        <select
                          value={filters.sortOrder}
                          onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Mặc định</option>
                          <option value="asc">Thấp → Cao</option>
                          <option value="desc">Cao → Thấp</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Số lượng cần in</label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={filteredPriceData.length}
                            placeholder="VD: 5"
                            value={printQuantity}
                            onChange={(e) => setPrintQuantity(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => {
                              const qty = parseInt(printQuantity);
                              if (!isNaN(qty) && qty >= 0) {
                                const count = Math.min(qty, filteredPriceData.length);
                                setSelectedIndices(Array.from({ length: count }, (_, i) => i));
                              }
                            }}
                            className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-colors shrink-0"
                          >
                            Chọn
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tổng</label>
                        <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700">
                          {filteredPriceData.length} / {combinedPriceData.length} SP
                        </div>
                      </div>
                    </div>
                  </div>

                  {priceData.length > 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <FilePlus size={16} />
                          </div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">DỮ LIỆU BẢNG GIÁ</h3>
                        </div>
                      </div>
                      <div className="overflow-auto flex-1 p-0">
                        <table className="w-full text-left border-collapse border border-slate-200">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 shadow-sm">
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={filteredPriceData.length > 0 && selectedIndices.length === filteredPriceData.length}
                                  onChange={handleSelectAll}
                                />
                              </th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">STT</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center">SL IN</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-28">
                                <div className="flex flex-col items-center gap-1">
                                  <span>Tồn kho</span>
                                  <button
                                    type="button"
                                    onClick={handleSetPrintQtyToInventoryAll}
                                    className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-[6px] text-[8px] font-black uppercase tracking-wider scale-90"
                                    title="In theo tồn kho cho tất cả sản phẩm hiển thị"
                                  >
                                    In theo tồn ALL
                                  </button>
                                </div>
                              </th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Mã SP</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Tên sản phẩm</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Ngành hàng</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-28">Giá gốc</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-28">Giá giảm</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-8">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredPriceData.map((item, index) => (
                              <tr key={index} className={`hover:bg-slate-50 transition-colors ${item.isManual ? 'bg-amber-50/30' : ''}`}>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    checked={selectedIndices.includes(index)}
                                    onChange={() => handleSelectRow(index)}
                                  />
                                </td>
                                <td className="py-2 px-3 text-xs font-medium text-slate-500">{index + 1}</td>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-12 bg-white border border-slate-200 text-slate-700 py-1 px-1 rounded-lg text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                    value={printQuantities[index] ?? 0}
                                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                  />
                                </td>
                                <td className="py-2 px-3 text-center text-xs font-black text-slate-600 bg-slate-50/50">
                                  {item.tonKho ?? 0}
                                </td>
                                <td className="py-2 px-3 text-xs font-bold text-indigo-600">{item.maSanPham || item.productCode || '-'}</td>
                                <td className="py-2 px-3 text-xs font-bold text-slate-800">{item.name}</td>
                                <td className="py-2 px-3 text-left">
                                  <input
                                    type="text"
                                    className="w-28 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-[11px] font-bold focus:border-slate-300"
                                    value={item.nganhHang || ''}
                                    onChange={(e) => handleCategoryChange(index, e.target.value)}
                                    placeholder="Tên ngành hàng..."
                                  />
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <input
                                    type="text"
                                    className="w-24 bg-white border border-slate-100 text-slate-700 py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-right focus:border-slate-300"
                                    value={Number(item.originalPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                    onChange={(e) => handlePriceChange(index, 'originalPrice', e.target.value)}
                                  />
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <input
                                    type="text"
                                    className="w-24 bg-white border border-slate-100 text-red-600 py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-right focus:border-slate-300"
                                    value={Number(item.discountPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                    onChange={(e) => handlePriceChange(index, 'discountPrice', e.target.value)}
                                  />
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => handleDeleteRow(index)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                        <Info size={28} className="text-indigo-400" />
                      </div>
                      <h3 className="text-base font-black text-slate-700 mb-2">Chưa có dữ liệu</h3>
                      <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                        Hãy tải file <strong>Tồn Kho</strong> và <strong>Bảng Giá</strong> từ khu vực phía trên để hiển thị danh sách sản phẩm tại đây.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}


            {activeTab === 'sticker-mau' && (
              <motion.div
                key="sticker-mau"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <StickerTemplateTab />
              </motion.div>
            )}

            {(activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event' || activeTab === 'sticker' || activeTab === 'sticker-lk' || activeTab === 'sticker-ce' || activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' || activeTab === 'sticker-dcnb') && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {(activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event' || activeTab === 'sticker-lk' || activeTab === 'sticker-ce' || activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' || activeTab === 'sticker-dcnb') && renderSubTabs()}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              {activeTab !== 'sticker-dcnb' && activeTab !== 'sticker-event-dmx' && (
                <div className="col-span-1 space-y-6">
                  {(activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event' || activeTab === 'sticker-ce' || activeTab === 'sticker-lk' || activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') && (
                  /* Card 1: Thông tin & Nhập dữ liệu */
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-700">Thông tin người in <span className="text-red-500">*</span></h3>
                      <button 
                        onClick={handleClearData}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-xs font-medium">Xóa dữ liệu</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-2xl font-black text-slate-800">43751</span>
                      <button className="text-sm text-blue-600 hover:underline">(Sửa)</button>
                    </div>

                    <div className="h-px bg-slate-100 w-full mb-6"></div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-700">Nhập dữ liệu (Admin)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={inventoryInputRef}
                        onChange={(e) => handleFileUpload(e, 'inventory')}
                      />
                      <button 
                        onClick={() => inventoryInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all relative ${
                          inventoryFile || lastUpdateInventory
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700' 
                            : 'border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        {inventoryFile || lastUpdateInventory ? <CheckCircle2 size={24} strokeWidth={1.5} className="text-indigo-500" /> : <Archive size={24} strokeWidth={1.5} />}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">{inventoryFile || lastUpdateInventory ? 'Đã tải Tồn Kho' : 'Tải Tồn Kho'}</div>
                          {lastUpdateInventory && !inventoryFile && <div className="text-[8px] font-bold text-indigo-400 mt-1">Cập nhật: {lastUpdateInventory}</div>}
                          {inventoryFile && <div className="text-[8px] font-bold text-indigo-400 mt-1 truncate max-w-[80px]">{inventoryFile.name}</div>}
                        </div>
                      </button>

                      {activeTab === 'sticker-event-dmx' || activeTab === 'sticker-gvgs' ? (
                        <button 
                          onClick={handleSyncGoogleSheet}
                          disabled={isSyncing}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all relative ${
                            isSyncing
                              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : (priceData.length > 0 || lastUpdatePrice)
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50'
                                : 'border-emerald-200 bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50/50'
                          }`}
                        >
                          {isSyncing ? (
                            <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-emerald-500" />
                          ) : (
                            <RefreshCw size={24} strokeWidth={1.5} className="text-emerald-500" />
                          )}
                          <div className="text-center">
                            <div className="text-[10px] font-black uppercase tracking-wider">
                              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheet'}
                            </div>
                            {lastUpdatePrice && !isSyncing && <div className="text-[8px] font-bold text-emerald-500 mt-1">Cập nhật: {lastUpdatePrice}</div>}
                            {!lastUpdatePrice && !isSyncing && <div className="text-[8px] font-bold text-emerald-500 mt-1">Yêu cầu đồng bộ</div>}
                          </div>
                        </button>
                      ) : (
                        <>
                          <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            ref={priceInputRef}
                            onChange={(e) => handleFileUpload(e, 'price')}
                          />
                          <button 
                            onClick={() => priceInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed transition-all relative ${
                              priceFile || lastUpdatePrice
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                : 'border-emerald-300 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50/50'
                            }`}
                          >
                            {priceFile || lastUpdatePrice ? <CheckCircle2 size={24} strokeWidth={1.5} className="text-emerald-500" /> : <FilePlus size={24} strokeWidth={1.5} />}
                            <div className="text-center">
                              <div className="text-[10px] font-black uppercase tracking-wider">
                                {priceFile || lastUpdatePrice 
                                  ? (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' ? 'Đã tải Bảng Giá Mẫu 99' : activeTab === 'sticker-ce' ? 'Đã tải Bảng Giá Mẫu 97' : activeTab === 'sticker-lk' ? 'Đã tải Bảng Giá Mẫu 78' : 'Đã tải Bảng Giá Mẫu 81')
                                  : (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' ? 'Tải Bảng Giá Mẫu 99' : activeTab === 'sticker-ce' ? 'Tải Bảng Giá Mẫu 97' : activeTab === 'sticker-lk' ? 'Tải Bảng Giá Mẫu 78' : 'Tải Bảng Giá Mẫu 81')}
                              </div>
                              {lastUpdatePrice && !priceFile && <div className="text-[8px] font-bold text-emerald-500 mt-1">Cập nhật: {lastUpdatePrice}</div>}
                              {priceFile && <div className="text-[8px] font-bold text-emerald-500 mt-1 truncate max-w-[80px]">{priceFile.name}</div>}
                            </div>
                          </button>
                        </>
                      )}
                    </div>

                    {(activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-ce' || activeTab === 'sticker-lk' || activeTab === 'sticker-event' || activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') && (
                      <div className="mt-3">
                        <button
                          onClick={handleStartScanner}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-100 uppercase tracking-wider"
                        >
                          <Scan size={16} /> Quét QR Điện thoại
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Hướng dẫn sử dụng GVGS */}
                {activeTab === 'sticker-gvgs' && (
                  <div className="bg-[#fefcf3] border-2 border-amber-200/80 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xl shadow-xs shrink-0">
                        💡
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black uppercase tracking-tight text-amber-950">
                          HƯỚNG DẪN SỬ DỤNG TOOL GVGS
                        </h4>
                      </div>
                    </div>
                    <div className="p-5 bg-white rounded-3xl border border-amber-100 shadow-xs space-y-4 leading-relaxed">
                      <p className="text-sm md:text-base font-bold text-slate-800">
                        👉 <span className="font-black text-amber-900">Thao tác:</span> Anh chị chỉ cần chọn khổ giấy cần in <span className="font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 text-sm md:text-base shadow-xs inline-block my-0.5">A5</span> hoặc <span className="font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 text-sm md:text-base shadow-xs inline-block my-0.5">A4</span> sau đó bấm in là được.
                      </p>
                      <p className="text-xs md:text-sm font-bold text-amber-900/90 pt-3.5 border-t border-amber-100">
                        ✨ Giá được <strong className="font-black text-amber-950 text-sm md:text-base">43751</strong> cập nhật vào <strong className="font-black text-amber-950 text-sm md:text-base">Thứ 5 hàng tuần</strong> và có dòng thông báo màu xanh trên màn hình.
                      </p>
                    </div>
                  </div>
                )}

                {/* Card 2: Nhập thủ công */}
                {activeTab !== 'sticker-dcnb' && activeTab !== 'sticker-event-dmx' && activeTab !== 'sticker-gvgs' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <FilePlus size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">NHẬP TAY THỦ CÔNG</h3>
                      </div>
                      <button 
                        onClick={handleClearData}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-xs font-medium">Xóa dữ liệu</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Ngành hàng</label>
                              <input 
                                type="text"
                                placeholder={activeTab === 'sticker-gvgs' ? "VD: GIỜ VÀNG GIÁ SỐC" : "VD: MÁY LỌC NƯỚC"}
                                value={manualData.nganhHang}
                                onChange={(e) => setManualData(prev => ({ ...prev, nganhHang: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Tên sản phẩm</label>
                              <input 
                                type="text"
                                placeholder="Tên SP..."
                                value={manualData.name}
                                onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Giá gốc</label>
                              <input 
                                type="text"
                                placeholder="Giá gốc..."
                                value={manualData.originalPrice}
                                onChange={(e) => setManualData(prev => ({ ...prev, originalPrice: formatPriceInput(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Giá sau giảm</label>
                              <input 
                                type="text"
                                placeholder="Giá giảm..."
                                value={manualData.discountPrice}
                                onChange={(e) => setManualData(prev => ({ ...prev, discountPrice: formatPriceInput(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Ngày hết hạn</label>
                              <input 
                                type="text"
                                placeholder="31/05/2026"
                                value={manualData.endDate}
                                onChange={(e) => setManualData(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Mã sản phẩm</label>
                              <input 
                                type="text"
                                placeholder="Mã SP..."
                                value={manualData.productCode}
                                onChange={(e) => setManualData(prev => ({ ...prev, productCode: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Tên sản phẩm</label>
                              <input 
                                type="text"
                                placeholder="Tên SP..."
                                value={manualData.name}
                                onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Giá gốc</label>
                              <input 
                                type="text"
                                placeholder="Giá gốc..."
                                value={manualData.originalPrice}
                                onChange={(e) => setManualData(prev => ({ ...prev, originalPrice: formatPriceInput(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Giá sau giảm</label>
                              <input 
                                type="text"
                                placeholder="Giá giảm..."
                                value={manualData.discountPrice}
                                onChange={(e) => setManualData(prev => ({ ...prev, discountPrice: formatPriceInput(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          onClick={handleAddManualSticker}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <FilePlus size={14} />
                          THÊM VÀO LIST
                        </button>
                        
                        <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                          <UploadCloud size={14} />
                          FILE EXCEL {'->'} LIST
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              handleFileUpload(e, 'price', true);
                              e.target.value = ''; // Reset to allow same file again
                            }}
                          />
                        </label>
                      </div>

                      <button
                        onClick={() => {
                          const templateData = (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs')
                            ? [
                                {
                                  'NGÀNH HÀNG': activeTab === 'sticker-gvgs' ? 'GIỜ VÀNG GIÁ SỐC' : 'MÁY LỌC NƯỚC',
                                  'TÊN SẢN PHẨM': 'Karofi KAQ-X18 11 lõi',
                                  'GIÁ GỐC': 6990000,
                                  'GIÁ SAU GIẢM': 4990000,
                                  'NGÀY HẾT HẠN': '31/05/2026'
                                }
                              ]
                            : [
                                {
                                  'MÃ SẢN PHẨM': 'SP001',
                                  'TÊN SẢN PHẨM': 'Ví dụ Tên Sản Phẩm',
                                  'GIÁ GỐC': 1000000,
                                  'GIÁ SAU GIẢM': 500000
                                }
                              ];
                          const worksheet = XLSX.utils.json_to_sheet(templateData);
                          const workbook = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'sticker-gvgs' ? 'GVGS_Template' : activeTab === 'sticker-mln' ? 'MLN_Template' : 'StickerTemplate');
                          XLSX.writeFile(workbook, activeTab === 'sticker-gvgs' ? 'Mau_In_Sticker_GVGS.xlsx' : activeTab === 'sticker-mln' ? 'Mau_In_Sticker_MLN.xlsx' : 'Mau_In_Sticker_Event.xlsx');
                          showNotification(activeTab === 'sticker-gvgs' ? 'Đã tải file Excel mẫu GVGS!' : activeTab === 'sticker-mln' ? 'Đã tải file Excel mẫu MLN!' : 'Đã tải file Excel mẫu!', 'success');
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <UploadCloud size={14} />
                        XUẤT FILE MẪU
                      </button>
                    </div>
                  </div>
                )}

                </div>
              )}

              {/* Right Column */}
              <div className={`col-span-1 ${(activeTab === 'sticker-dcnb' || activeTab === 'sticker-event-dmx') ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
                {(activeTab === 'sticker-event-dmx' || activeTab === 'sticker-gvgs') && lastUpdatePrice && (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-5 flex items-start gap-4 text-emerald-800 shadow-sm shadow-emerald-50/50 animate-fade-in">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-200/50">
                      <span className="text-xl">⚡</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                        {activeTab === 'sticker-gvgs' ? 'Bảng giá Giờ Vàng Giá Sốc (GVGS) đã được cập nhật' : 'Bảng giá sự kiện ĐMX đã được cập nhật'}
                      </h4>
                      <p className="text-[11px] font-bold text-emerald-600/90 mt-1 leading-relaxed">
                        Thời gian đồng bộ: <span className="font-black text-emerald-800 text-[12px] bg-emerald-100/50 px-2 py-0.5 rounded-lg border border-emerald-200/60 ml-0.5 mr-1">{lastUpdatePrice}</span> bởi Quản trị viên <span className="font-black text-emerald-800 bg-emerald-100/50 px-2 py-0.5 rounded-lg border border-emerald-200/60">{updatedBy || '43751'}</span>.
                      </p>
                      <p className="text-[9px] font-bold text-emerald-500/80 mt-1.5 uppercase tracking-wide">
                        * Áp dụng đồng bộ thời gian thực cho tất cả người dùng trên hệ thống.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'sticker-event-dmx' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col gap-4 md:gap-6">
                    {/* Left side: Thông tin người in */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Thông tin người in <span className="text-red-500">*</span></h3>
                        <button 
                          onClick={handleClearData}
                          className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                          <span className="text-[10px] font-bold">Xóa dữ liệu</span>
                        </button>
                      </div>
                    </div>

                    {/* Right side: Buttons */}
                    <div className="flex flex-row items-center gap-3 md:gap-4 shrink-0 overflow-x-auto pb-1 -mb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={inventoryInputRef}
                        onChange={(e) => handleFileUpload(e, 'inventory')}
                      />
                      <button 
                        onClick={() => inventoryInputRef.current?.click()}
                        className={`flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border transition-all h-[52px] min-w-[170px] ${
                          inventoryFile || lastUpdateInventory
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/50 shadow-sm'
                            : 'border-indigo-200 bg-indigo-50/20 text-indigo-600 hover:bg-indigo-50/50'
                        }`}
                      >
                        {inventoryFile || lastUpdateInventory ? (
                          <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                        ) : (
                          <Archive size={18} className="text-indigo-600 shrink-0" />
                        )}
                        <div className="text-left leading-tight">
                          <div className="text-xs font-black uppercase tracking-wider">
                            {inventoryFile || lastUpdateInventory ? 'Đã tải Tồn Kho' : 'Tải Tồn Kho'}
                          </div>
                          {lastUpdateInventory && !inventoryFile && <div className="text-[8px] font-bold text-indigo-400">Cập nhật: {lastUpdateInventory}</div>}
                          {inventoryFile && <div className="text-[8px] font-bold text-indigo-400 truncate max-w-[100px]">{inventoryFile.name}</div>}
                          {!lastUpdateInventory && !inventoryFile && <div className="text-[8px] font-bold text-indigo-400">Chưa tải file</div>}
                        </div>
                      </button>

                      <button 
                        onClick={handleSyncGoogleSheet}
                        disabled={isSyncing}
                        className={`flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl border transition-all h-[52px] min-w-[220px] ${
                          isSyncing
                            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                            : (priceData.length > 0 || lastUpdatePrice)
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50 shadow-sm'
                              : 'border-emerald-200 bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50/50'
                        }`}
                      >
                        {isSyncing ? (
                          <Loader2 size={18} className="animate-spin text-emerald-500" />
                        ) : (
                          <RefreshCw size={18} className="text-emerald-600" />
                        )}
                        <div className="text-left leading-tight">
                          <div className="text-xs font-black uppercase tracking-wider">
                            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheet'}
                          </div>
                          {lastUpdatePrice && !isSyncing && <div className="text-[8px] font-bold text-emerald-500">Cập nhật: {lastUpdatePrice}</div>}
                          {!lastUpdatePrice && !isSyncing && <div className="text-[8px] font-bold text-emerald-500">Yêu cầu đồng bộ</div>}
                        </div>
                      </button>

                      <button
                        onClick={handleStartScanner}
                        className="flex items-center justify-center gap-2.5 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-indigo-100 uppercase tracking-wider h-[52px]"
                      >
                        <Scan size={18} /> <span>Quét QR Điện thoại</span>
                      </button>
                    </div>
                  </div>
                )}

                {(activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event' || activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' || activeTab === 'sticker-lk' || activeTab === 'sticker-dcnb' || activeTab === 'sticker-ce') && (
                  <div className={activeTab === 'sticker-event-dmx' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-start' : ''}>
                    {activeTab === 'sticker-event-dmx' && (
                      <div className="lg:col-span-1 bg-[#f5f6ff] border-2 border-indigo-100/90 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-full bg-[#e8eafe] flex items-center justify-center text-indigo-600 font-black text-xl shadow-xs shrink-0">
                            💡
                          </div>
                          <div>
                            <h4 className="text-base md:text-lg font-black uppercase tracking-tight text-[#1e1b4b]">
                              HƯỚNG DẪN SỬ DỤNG TOOL EVENT ĐMX
                            </h4>
                          </div>
                        </div>

                        <div className="p-5 bg-white rounded-3xl border border-indigo-100 shadow-xs space-y-3.5 leading-relaxed max-h-[600px] overflow-y-auto">
                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 1</span>
                            <span>Giá được cập nhật theo BCNB của <strong className="text-[#1e1b4b] font-black">43346 - TRẦN TRỌNG THIỆN</strong>.</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 2</span>
                            <span>Anh / Chị đổ tồn kho <strong className="text-purple-800 font-black">Nhóm hàng 484 - Điện gia dụng, Thiết bị làm đẹp</strong>.</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 3</span>
                            <span>Tải file tồn kho lên.</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 4</span>
                            <span>Chọn Ngành hàng, Nhóm hàng cần in, tick chọn ô <strong className="text-emerald-800 font-black">"Có trong tồn kho"</strong> để lọc những sản phẩm có tồn kho.</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 5</span>
                            <span>Sắp xếp giá tăng dần.</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 6</span>
                            <span>Nhập số lượng sản phẩm muốn in.</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-slate-800 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200 text-xs md:text-sm">BƯỚC 7</span>
                            <span>Chọn bố cục in (Thông thường sẽ là <strong className="text-indigo-800 font-black">8 Sticker / trang A4</strong>).</span>
                          </p>

                          <p className="text-sm md:text-base font-bold text-emerald-900 flex items-start gap-2.5 pt-3 border-t border-indigo-50">
                            <span className="shrink-0 font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-xl border border-emerald-200 text-xs md:text-sm">BƯỚC 8</span>
                            <span>In và hoàn tất.</span>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 p-5 ${activeTab === 'sticker-event-dmx' ? 'lg:col-span-2' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-white shadow-lg shadow-violet-100">
                        <Printer size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
                          {activeTab === 'sticker-mln' 
                            ? 'CHỌN BỐ CỤC IN MLN' 
                            : activeTab === 'sticker-gvgs'
                              ? 'CHỌN BỐ CỤC IN GVGS'
                              : activeTab === 'sticker-lk'
                                ? 'CHỌN BỐ CỤC IN LOA KÉO'
                                : activeTab === 'sticker-ce'
                                  ? 'CHỌN BỐ CỤC IN TIVI, TỦ LẠNH, MÁY GIẶT'
                                  : activeTab === 'sticker-dcnb'
                                    ? 'XEM TRƯỚC TRANG IN DCNB'
                                    : 'CHỌN BỐ CỤC IN'}
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {activeTab === 'sticker-mln'
                            ? 'Nhấp vào nút bên dưới để in trực tiếp kiểu Máy Lọc Nước'
                            : activeTab === 'sticker-gvgs'
                              ? 'Nhấp vào nút bên dưới để in trực tiếp kiểu Giờ Vàng Giá Sốc'
                              : activeTab === 'sticker-lk'
                                ? 'Chọn bố cục bên dưới để in trực tiếp kiểu Loa Kéo'
                                : activeTab === 'sticker-ce'
                                  ? 'Chọn bố cục bên dưới để in trực tiếp kiểu Tivi, Tủ lạnh, Máy giặt'
                                  : activeTab === 'sticker-dcnb'
                                    ? 'Hiển thị 3 cột ghép nằm ngang tương đương với 1 trang A4'
                                    : 'Chọn bố cục bên dưới để in trực tiếp'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-indigo-100/70 overflow-hidden flex flex-col mb-4 bg-white shadow-xl shadow-indigo-100/10">
                      <div className={`${activeTab === 'sticker-dcnb' || (activeTab === 'sticker-lk' && lkPrintLayout === '2') || (activeTab === 'sticker-ce' && cePrintLayout === '2') || (activeTab === 'sticker-mln' && mlnPrintLayout === '2') || (activeTab === 'sticker-gvgs' && gvgsPrintLayout === '2') ? 'h-[760px]' : 'h-[440px]'} bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-purple-50/30 flex items-center justify-center overflow-hidden relative p-8`}>
                        <div
                          className="pointer-events-none select-none shadow-[0_20px_50px_rgba(99,102,241,0.15)] border border-slate-900/10 rounded-xl overflow-hidden transition-all duration-300 flex flex-col bg-white"
                          style={{
                            transform: (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') 
                              ? ((activeTab === 'sticker-gvgs' ? gvgsPrintLayout : mlnPrintLayout) === '1' ? 'scale(0.5)' : 'scale(0.58)')
                              : activeTab === 'sticker-lk'
                                ? (lkPrintLayout === '1' ? 'scale(0.48)' : 'scale(0.58)')
                                : activeTab === 'sticker-ce'
                                  ? (cePrintLayout === '1' ? 'scale(0.48)' : 'scale(0.58)')
                                  : activeTab === 'sticker-dcnb'
                                    ? 'scale(0.58)'
                                    : (activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event')
                                      ? (eventPrintLayout === '2' || eventPrintLayout === '8' ? 'scale(0.4)' : 'scale(0.42)')
                                      : 'scale(0.95)',
                            transformOrigin: 'center',
                            width: (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs')
                              ? ((activeTab === 'sticker-gvgs' ? gvgsPrintLayout : mlnPrintLayout) === '1' ? '148.5mm' : '210mm')
                              : activeTab === 'sticker-lk'
                                ? '210mm'
                                : activeTab === 'sticker-ce'
                                  ? '210mm'
                                  : activeTab === 'sticker-dcnb'
                                    ? '210mm'
                                    : (activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event')
                                      ? (eventPrintLayout === '2' || eventPrintLayout === '8' ? '210mm' : '297mm')
                                      : '148.5mm',
                            height: (activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') 
                              ? ((activeTab === 'sticker-gvgs' ? gvgsPrintLayout : mlnPrintLayout) === '1' ? '210mm' : '297mm')
                              : activeTab === 'sticker-lk'
                                ? (lkPrintLayout === '1' ? '148.5mm' : '297mm')
                                : activeTab === 'sticker-ce'
                                  ? (cePrintLayout === '1' ? '148.5mm' : '297mm')
                                  : activeTab === 'sticker-dcnb'
                                    ? '297mm'
                                    : (activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event')
                                      ? (eventPrintLayout === '2' || eventPrintLayout === '8' ? '297mm' : '210mm')
                                      : '105mm',
                            flexShrink: 0
                          }}
                        >
                           {activeTab === 'sticker-dcnb' ? (
                            <div 
                              className="w-full h-full grid bg-white"
                              style={{
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: 'repeat(8, 1fr)',
                                gap: '0.5px',
                                padding: '5mm',
                                boxSizing: 'border-box'
                              }}
                            >
                              {Array.from({ length: 24 }).map((_, idx) => (
                                <div 
                                  key={idx} 
                                  className="w-full h-full flex items-center justify-center relative overflow-hidden border border-dashed border-slate-300"
                                  style={{ width: '66mm', height: '35mm' }}
                                >
                                  <DcnbCard />
                                </div>
                              ))}
                            </div>
                          ) : (activeTab === 'sticker-lk' && lkPrintLayout === '2') || (activeTab === 'sticker-ce' && cePrintLayout === '2') ? (
                            <div className="flex flex-col h-full justify-between bg-white w-full">
                              <Sticker
                                item={
                                  activeTab === 'sticker-lk'
                                    ? { name: 'Loa kéo karaoke Mobell MK-2120C', originalPrice: 5800000, discountPrice: 3800000, qrData: '88888', maSanPham: 'SP002', nganhHang: 'LOA KÉO' }
                                    : { name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }
                                }
                                style={activeTab === 'sticker-lk' ? 'sticker_lk' : 'sticker_ce'}
                                layout="2"
                                showPromoLabel={false}
                              />
                              <div className="border-t-[2px] border-dashed border-slate-400 w-full shrink-0"></div>
                              <Sticker
                                item={
                                  activeTab === 'sticker-lk'
                                    ? { name: 'Loa kéo karaoke Mobell MK-2120C', originalPrice: 5800000, discountPrice: 3800000, qrData: '88888', maSanPham: 'SP002', nganhHang: 'LOA KÉO' }
                                    : { name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }
                                }
                                style={activeTab === 'sticker-lk' ? 'sticker_lk' : 'sticker_ce'}
                                layout="2"
                                showPromoLabel={false}
                              />
                            </div>
                          ) : (activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event') ? (
                            <div 
                              className="w-full h-full grid bg-white border border-slate-100"
                              style={{
                                gridTemplateColumns: `repeat(${eventPrintLayout === '1' || eventPrintLayout === '2' ? 1 : 2}, 1fr)`,
                                gridTemplateRows: `repeat(${eventPrintLayout === '1' ? 1 : eventPrintLayout === '2' || eventPrintLayout === '4' ? 2 : 4}, 1fr)`,
                              }}
                            >
                              {Array.from({ length: eventPrintLayout === '1' ? 1 : eventPrintLayout === '2' ? 2 : eventPrintLayout === '4' ? 4 : 8 }).map((_, idx) => {
                                const scaleMap: Record<string, number> = { '1': 1.96, '2': 1.38, '4': 0.94, '8': 0.68 };
                                const sVal = scaleMap[eventPrintLayout] || 0.94;
                                return (
                                  <div 
                                    key={idx} 
                                    className="w-full h-full flex items-center justify-center relative overflow-hidden border-dashed border-slate-200"
                                    style={{ 
                                      borderWidth: '0.5px',
                                      padding: '1mm'
                                    }}
                                  >
                                    <div 
                                      style={{
                                        width: `${148.5 * sVal}mm`,
                                        height: `${105 * sVal}mm`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}
                                    >
                                      <div 
                                        style={{ 
                                          transform: `scale(${sVal})`, 
                                          transformOrigin: 'center', 
                                          width: '148.5mm', 
                                          height: '105mm', 
                                          flexShrink: 0 
                                        }}
                                      >
                                        <Sticker
                                          item={{ name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }}
                                          style="classic"
                                          layout="1"
                                          showPromoLabel={activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' || activeTab === 'sticker-lk' || activeTab === 'sticker-ce' ? false : showEventPromoLabel}
                                          promoLabelText={promoLabelTextVal}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <Sticker
                              item={
                                activeTab === 'sticker-mln'
                                  ? { name: 'Karofi KAQ-X18 11 lõi', originalPrice: 6990000, discountPrice: 4990000, maSanPham: 'SP001', nganhHang: 'MÁY LỌC NƯỚC', endDate: '31/05/2026' }
                                  : activeTab === 'sticker-gvgs'
                                    ? { name: 'Karofi KAQ-X18 11 lõi', originalPrice: 6990000, discountPrice: 4990000, maSanPham: 'SP001', nganhHang: 'GIỜ VÀNG GIÁ SỐC', endDate: '31/05/2026' }
                                    : activeTab === 'sticker-lk'
                                      ? { name: 'Loa kéo karaoke Mobell MK-2120C', originalPrice: 5800000, discountPrice: 3800000, qrData: '88888', maSanPham: 'SP002', nganhHang: 'LOA KÉO' }
                                      : activeTab === 'sticker-ce'
                                        ? { name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }
                                        : { name: 'Quạt điều hoà DK03', originalPrice: 5490000, discountPrice: 3490000, qrData: '99999', maSanPham: 'SP001' }
                              }
                              style={(activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') ? 'display' : activeTab === 'sticker-lk' ? 'sticker_lk' : activeTab === 'sticker-ce' ? 'sticker_ce' : 'classic'}
                              layout={activeTab === 'sticker-lk' ? lkPrintLayout : activeTab === 'sticker-ce' ? cePrintLayout : activeTab === 'sticker-mln' ? mlnPrintLayout : activeTab === 'sticker-gvgs' ? gvgsPrintLayout : '1'}
                              showPromoLabel={activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' || activeTab === 'sticker-lk' || activeTab === 'sticker-ce' ? false : showEventPromoLabel}
                              promoLabelText={promoLabelTextVal}
                              mlnHeaderTemplate={activeTab === 'sticker-gvgs' ? gvgsHeaderTemplate : mlnHeaderTemplate}
                              mlnFooterTemplate={activeTab === 'sticker-gvgs' ? gvgsFooterTemplate : mlnFooterTemplate}
                            />
                          )}
                        </div>
                      </div>
                      {(activeTab === 'all-sticker' || activeTab === 'sticker-event-dmx' || activeTab === 'sticker-event') && (
                        <div className="p-3.5 bg-slate-50/40 backdrop-blur-sm border-t border-indigo-50/60 space-y-3">
                          <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={showEventPromoLabel}
                              onChange={(e) => {
                                setShowEventPromoLabel(e.target.checked);
                                setPrintConfig(prev => ({ ...prev, showPromoLabel: e.target.checked }));
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Hiển thị nhãn khuyến mãi</span>
                          </label>
                          {showEventPromoLabel && (
                            <div className="flex flex-col gap-1.5 pl-6">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nội dung nhãn khuyến mãi</label>
                              <input 
                                type="text"
                                value={promoLabelTextVal}
                                onChange={(e) => setPromoLabelTextVal(e.target.value)}
                                className="w-full bg-white border border-red-200 text-red-600 py-1.5 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Nhập nội dung nhãn..."
                              />
                              <span className="text-[9px] font-bold text-red-500/80">
                                * Nhãn sẽ hiển thị chữ ĐỎ NỔI BẬT và tăng kích thước chữ trên Sticker khi in.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {(activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs') && (
                        <div className="p-5 bg-gradient-to-br from-amber-50/40 to-indigo-50/30 backdrop-blur-sm border-t border-b border-slate-200/80 space-y-4 rounded-2xl shadow-inner my-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">✨</span>
                            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                              Cấu hình chữ in trên nhãn ({activeTab === 'sticker-gvgs' ? 'GVGS' : 'MLN'})
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-extrabold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                                ✍️ Tiêu đề (Ngành hàng)
                              </label>
                              <input
                                type="text"
                                value={activeTab === 'sticker-gvgs' ? gvgsHeaderTemplate : mlnHeaderTemplate}
                                onChange={(e) => {
                                  if (activeTab === 'sticker-gvgs') {
                                    setGvgsHeaderTemplate(e.target.value);
                                    safeLocalStorageSet('gvgs_header_template', e.target.value);
                                  } else {
                                    setMlnHeaderTemplate(e.target.value);
                                    safeLocalStorageSet('mln_header_template', e.target.value);
                                  }
                                }}
                                className="w-full bg-white border-2 border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-amber-950 py-2 px-3.5 rounded-2xl text-xs font-black focus:outline-none transition-all shadow-sm"
                                placeholder={activeTab === 'sticker-gvgs' ? "VD: GIỜ VÀNG GIÁ SỐC hoặc {nganhHang}" : "VD: {nganhHang} hoặc MÁY LỌC NƯỚC"}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-extrabold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                                🎁 Dòng khuyến mãi (Footer)
                              </label>
                              <input
                                type="text"
                                value={activeTab === 'sticker-gvgs' ? gvgsFooterTemplate : mlnFooterTemplate}
                                onChange={(e) => {
                                  if (activeTab === 'sticker-gvgs') {
                                    setGvgsFooterTemplate(e.target.value);
                                    safeLocalStorageSet('gvgs_footer_template', e.target.value);
                                  } else {
                                    setMlnFooterTemplate(e.target.value);
                                    safeLocalStorageSet('mln_footer_template', e.target.value);
                                  }
                                }}
                                className="w-full bg-white border-2 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-indigo-950 py-2 px-3.5 rounded-2xl text-xs font-black focus:outline-none transition-all shadow-sm"
                                placeholder={activeTab === 'sticker-gvgs' ? "VD: Khuyến mãi chỉ áp dụng 3 ngày Thứ 6, 7, Chủ Nhật" : "VD: Khuyến mãi áp dụng đến hết ngày {date}"}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold bg-white/70 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                            <span>💡 Mẹo:</span>
                            <span>Sử dụng <code className="font-mono bg-amber-50 px-1 py-0.5 rounded text-amber-700 border border-amber-100">{`{nganhHang}`}</code> để lấy tự động ngành, và <code className="font-mono bg-indigo-50 px-1 py-0.5 rounded text-indigo-700 border border-indigo-100">{`{date}`}</code> cho ngày hết hạn.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {activeTab === 'sticker-mln' || activeTab === 'sticker-gvgs' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { layout: '1', label: '1 Sticker / Trang A5 đứng' },
                          { layout: '2', label: '1 Sticker / Trang A4 đứng' }
                        ].map((s) => (
                          <button
                            key={s.layout}
                            onMouseEnter={() => {
                              if (activeTab === 'sticker-gvgs') {
                                setGvgsPrintLayout(s.layout);
                              } else {
                                setMlnPrintLayout(s.layout);
                              }
                            }}
                            onClick={() => {
                              setPrintConfig({ style: 'display', layout: s.layout, showPromoLabel: false });
                              setIsPrintModalOpen(true);
                            }}
                            disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                            className={`w-full py-3.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                              (activeTab === 'sticker-gvgs' ? gvgsPrintLayout : mlnPrintLayout) === s.layout
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400 ring-offset-2'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Printer size={16} />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : activeTab === 'sticker-lk' || activeTab === 'sticker-ce' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { layout: '1', label: activeTab === 'sticker-ce' ? '1 Sticker / Trang A5 ngang' : 'BẤM ĐỂ IN (1 / TRANG A5 NGANG)' },
                          { layout: '2', label: activeTab === 'sticker-ce' ? '2 Sticker / Trang A4 đứng' : 'BẤM ĐỂ IN (2 / TRANG A4 ĐỨNG)' }
                        ].map((s) => (
                          <button
                            key={s.layout}
                            onMouseEnter={() => {
                              if (activeTab === 'sticker-lk') {
                                setLkPrintLayout(s.layout);
                              } else {
                                setCePrintLayout(s.layout);
                              }
                            }}
                            onClick={() => {
                              setPrintConfig({ 
                                style: activeTab === 'sticker-lk' ? 'sticker_lk' : 'sticker_ce', 
                                layout: s.layout, 
                                showPromoLabel: false 
                              });
                              setIsPrintModalOpen(true);
                            }}
                            disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                            className={`w-full py-3.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                              (activeTab === 'sticker-lk' ? lkPrintLayout : cePrintLayout) === s.layout
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400 ring-offset-2'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Printer size={16} />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : activeTab === 'sticker-dcnb' ? (
                      <div className="grid grid-cols-1">
                        <button
                          onClick={() => {
                            setPrintConfig({ style: 'dcnb', layout: '24', showPromoLabel: false });
                            setIsPrintModalOpen(true);
                          }}
                          className="w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                        >
                          <Printer size={16} />
                          <span>BẤM ĐỂ IN (1 TRANG A4 / 24 STICKER)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { layout: '1', label: 'BẤM ĐỂ IN (1 / TRANG A4)' },
                          { layout: '2', label: 'BẤM ĐỂ IN (2 / TRANG A4)' },
                          { layout: '4', label: 'BẤM ĐỂ IN (4 / TRANG A4)' },
                          { layout: '8', label: 'BẤM ĐỂ IN (8 / TRANG A4)' }
                        ].map((s) => (
                          <button
                            key={s.layout}
                            onMouseEnter={() => setEventPrintLayout(s.layout)}
                            onClick={() => {
                              setPrintConfig({ style: 'classic', layout: s.layout, showPromoLabel: showEventPromoLabel });
                              setIsPrintModalOpen(true);
                            }}
                            disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                            className={`w-full py-3.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                              eventPrintLayout === s.layout
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400 ring-offset-2'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Printer size={16} />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}



                {activeTab !== 'sticker-dcnb' && (
                  <>
                    <div className="bg-emerald-50/40 rounded-3xl shadow-sm border border-emerald-100/70 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">BỘ LỌC TỒN KHO</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                          checked={filters.onlyInventory}
                          onChange={(e) => setFilters(prev => ({ ...prev, onlyInventory: e.target.checked }))}
                        />
                        <span className="text-sm font-medium text-slate-600">Có trong tồn kho</span>
                      </label>
                    </div>
                    <button 
                      onClick={() => {
                        setFilters({ maSieuThi: '', nganhHang: '', nhomHang: '', tenSanPham: '', onlyInventory: false, selectedQrs: null, sortOrder: '' });
                        setPrintQuantity('');
                      }}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Ngành hàng</label>
                      <div className="relative">
                        <select 
                          value={filters.nganhHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nganhHang: e.target.value, nhomHang: '' }))}
                          className="w-full appearance-none bg-white border border-emerald-200/80 text-slate-800 py-2.5 pl-3 pr-10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Tất cả ngành hàng</option>
                          {uniqueNganhHang.map(nganh => (
                            <option key={nganh} value={nganh}>{nganh}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Nhóm hàng</label>
                      <div className="relative">
                        <select 
                          value={filters.nhomHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nhomHang: e.target.value }))}
                          className="w-full appearance-none bg-white border border-emerald-200/80 text-slate-800 py-2.5 pl-3 pr-10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Tất cả nhóm hàng</option>
                          {uniqueNhomHang.map(nhom => (
                            <option key={nhom} value={nhom}>{nhom}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Tên sản phẩm</label>
                      <input 
                        type="text" 
                        placeholder="Tên hoặc mã SP..."
                        value={filters.tenSanPham}
                        onChange={(e) => setFilters(prev => ({ ...prev, tenSanPham: e.target.value }))}
                        className="w-full bg-white border border-emerald-200/80 text-slate-800 py-2.5 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Sắp xếp giá giảm</label>
                      <div className="relative">
                        <select 
                          value={filters.sortOrder}
                          onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                          className="w-full appearance-none bg-white border border-emerald-200/80 text-slate-800 py-2.5 pl-3 pr-10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Mặc định</option>
                          <option value="asc">Giá thấp đến cao</option>
                          <option value="desc">Giá cao đến thấp</option>
                        </select>
                        <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-slate-500">Dữ liệu QR</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsQrDropdownOpen(prev => !prev)}
                          className="w-full flex items-center justify-between bg-white border border-emerald-200/80 text-slate-800 py-2.5 px-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-left transition-all"
                        >
                          <span className="truncate">
                            {filters.selectedQrs
                              ? filters.selectedQrs.length === 0
                                ? "Không chọn"
                                : `Đã chọn (${filters.selectedQrs.length})`
                              : `Tất cả (${uniqueQrs.length})`}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 shrink-0 transition-transform ${isQrDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isQrDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsQrDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 mt-1.5 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-white shadow-xl z-20 animate-fade-in">
                              <label className="flex items-center gap-2.5 text-xs font-black text-slate-700 pb-1.5 border-b border-slate-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!filters.selectedQrs || filters.selectedQrs.length === uniqueQrs.length}
                                  onChange={e => {
                                    setFilters(prev => ({
                                      ...prev,
                                      selectedQrs: e.target.checked ? null : []
                                    }));
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>Chọn tất cả</span>
                              </label>
                              {uniqueQrs.map(qr => {
                                const isChecked = !filters.selectedQrs || filters.selectedQrs.includes(qr);
                                return (
                                  <label
                                    key={qr}
                                    className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer hover:text-slate-800 transition-colors py-0.5"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        const currentQrs = filters.selectedQrs || uniqueQrs;
                                        let updated: string[] | null;
                                        if (e.target.checked) {
                                          updated = [...currentQrs, qr];
                                          if (updated.length === uniqueQrs.length) {
                                            updated = null;
                                          }
                                        } else {
                                          updated = currentQrs.filter(q => q !== qr);
                                        }
                                        setFilters(prev => ({
                                          ...prev,
                                          selectedQrs: updated
                                        }));
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="truncate font-mono">{qr || "(Trống)"}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Số lượng cần in</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          min="0"
                          max={filteredPriceData.length}
                          placeholder="VD: 5"
                          value={printQuantity}
                          onChange={(e) => setPrintQuantity(e.target.value)}
                          className="w-full bg-white border border-emerald-200/80 text-slate-800 py-2 px-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                        <button 
                          onClick={() => {
                            const qty = parseInt(printQuantity);
                            if (!isNaN(qty) && qty >= 0) {
                              const count = Math.min(qty, filteredPriceData.length);
                              setSelectedIndices(Array.from({ length: count }, (_, i) => i));
                            }
                          }}
                          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
                        >
                          Chọn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Table or Instructions */}
                {priceData.length > 0 ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <FilePlus size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">DỮ LIỆU BẢNG GIÁ</h3>
                            {lastUpdatePrice && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs">
                                Cập nhật bởi <strong className="font-black">{updatedBy || '43751'}</strong>
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Đã lọc {filteredPriceData.length} / {combinedPriceData.length} sản phẩm
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {saveMessage.text && (
                          <span className={`text-xs font-bold ${saveMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {saveMessage.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-auto flex-1 p-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 shadow-sm">
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={filteredPriceData.length > 0 && selectedIndices.length === filteredPriceData.length}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">STT</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center">SL In</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Mã SP</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Tên sản phẩm</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Ngành hàng</th>
                            {activeTab !== 'sticker-mln' && activeTab !== 'sticker-gvgs' && <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Nhóm hàng</th>}
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">QR điện thoại</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36">Giá gốc</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36">Giá giảm</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-10">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPriceData.map((item, index) => (
                            <tr key={index} className={`hover:bg-slate-50 transition-colors ${item.isManual ? 'bg-amber-50/30' : ''}`}>
                              <td className="py-3 px-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={selectedIndices.includes(index)}
                                  onChange={() => handleSelectRow(index)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-500">{index + 1}</td>
                              <td className="py-3 px-4 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  className="w-16 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                  value={printQuantities[index] ?? 0}
                                  onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-indigo-600">{item.maSanPham || item.productCode || '-'}</td>
                              <td className="py-3 px-4 text-sm font-bold text-slate-800">{item.name}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600">{item.nganhHang || '-'}</td>
                              {activeTab !== 'sticker-mln' && activeTab !== 'sticker-gvgs' && <td className="py-3 px-4 text-sm font-medium text-slate-600">{item.nhomHang || '-'}</td>}
                              <td className="py-3 px-4 text-sm font-medium text-slate-500 font-mono tracking-wider">{item.qrData || '-'}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600 text-right">
                                <input 
                                  type="text"
                                  className="w-32 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  value={Number(item.originalPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                  onChange={(e) => handlePriceChange(index, 'originalPrice', e.target.value)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">
                                <input 
                                  type="text"
                                  className="w-32 bg-white border border-slate-200 text-red-600 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  value={Number(item.discountPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                  onChange={(e) => handlePriceChange(index, 'discountPrice', e.target.value)}
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button 
                                  onClick={() => handleDeleteRow(index)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                    {/* Background subtle tint */}
                    <div className="absolute inset-0 bg-indigo-50/30 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Info size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">Hướng Dẫn Xuất File Giá Từ ERP</h2>
                          <p className="text-slate-500 mt-1">Làm theo các bước sau để thêm dữ liệu vào công cụ</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">1.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Truy cập: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">ERP {'>'} In bảng giá</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">2.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Ngành hàng: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Điện gia dụng, Dụng cụ nhà bếp,...</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">3.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Nhóm hàng: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Tất cả</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">4.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Vị trí trưng bày: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">2 - Kệ trưng bày</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">5.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Mẫu in: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">81 - Bảng giá Gia Dụng - Phụ Kiện rút gọn...</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">6.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Xuất file: Bấm nút <span className="font-bold">"In"</span>, sau đó chọn định dạng <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Excel Workbook Data - only (*.xlsx)</span>.
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 pt-6 border-t border-indigo-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Lưu ý quan trọng</h3>
                        <p className="text-sm text-slate-600">
                          Đảm bảo bạn đã chọn đúng siêu thị và ngành hàng trước khi xuất file để dữ liệu in ra được chính xác nhất.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'in-dia-chi' && (
            <motion.div
              key="in-dia-chi"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <MapPin size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình In Địa Chỉ (Tờ Rơi A4)</h2>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7 space-y-6 max-h-[750px] overflow-y-auto pr-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700">1. Phần Đầu (Header)</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Tên siêu thị</label>
                        <input
                          type="text"
                          value={addressFlyerData.headerTitle}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, headerTitle: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Địa chỉ / Ghi chú</label>
                        <input
                          type="text"
                          value={addressFlyerData.headerSubtitle}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, headerSubtitle: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700">2. Thư Mời (Invitation)</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Tiêu đề thư mời</label>
                        <input
                          type="text"
                          value={addressFlyerData.invitationTitle}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, invitationTitle: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Đối tượng kính mời</label>
                        <input
                          type="text"
                          value={addressFlyerData.invitationTarget}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, invitationTarget: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700">3. Nội dung sự kiện</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Thời gian & Địa điểm (Ví dụ: Ngày 28/03 đến ĐMX PHƯỜNG 8)</label>
                        <input
                          type="text"
                          value={addressFlyerData.eventTimeLocation}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, eventTimeLocation: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Mô tả sự kiện</label>
                        <input
                          type="text"
                          value={addressFlyerData.eventDescription}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, eventDescription: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Mức giảm giá % (Ví dụ: 50%)</label>
                        <input
                          type="text"
                          value={addressFlyerData.discountPercentage}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, discountPercentage: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-red-600 text-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Thời gian áp dụng (Ví dụ: 1 NGÀY DUY NHẤT 28/03)</label>
                        <input
                          type="text"
                          value={addressFlyerData.duration}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, duration: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700">4. Danh mục & Ưu đãi</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Danh mục dòng 1</label>
                        <input
                          type="text"
                          value={addressFlyerData.categoriesLine1}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, categoriesLine1: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Danh mục dòng 2</label>
                        <input
                          type="text"
                          value={addressFlyerData.categoriesLine2}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, categoriesLine2: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Danh mục dòng 3</label>
                        <input
                          type="text"
                          value={addressFlyerData.categoriesLine3}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, categoriesLine3: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Ưu đãi đặc biệt</label>
                        <input
                          type="text"
                          value={addressFlyerData.specialOffer}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, specialOffer: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-blue-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Chính sách trả góp</label>
                        <input
                          type="text"
                          value={addressFlyerData.paymentTerm}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, paymentTerm: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-emerald-700">5. Phần Chân (Footer)</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Tiêu đề chân trang (Tên siêu thị đầy đủ)</label>
                        <input
                          type="text"
                          value={addressFlyerData.footerTitle}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, footerTitle: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Cam kết 1</label>
                        <input
                          type="text"
                          value={addressFlyerData.footerLine1}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, footerLine1: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Cam kết 2</label>
                        <input
                          type="text"
                          value={addressFlyerData.footerLine2}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, footerLine2: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Dòng chú ý 3</label>
                        <input
                          type="text"
                          value={addressFlyerData.footerLine3}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, footerLine3: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Khuyến mãi thêm dòng 4</label>
                        <input
                          type="text"
                          value={addressFlyerData.footerLine4}
                          onChange={e => setAddressFlyerData({ ...addressFlyerData, footerLine4: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-5 flex flex-col items-center gap-6">
                  <div className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-emerald-700 self-start">Xem trước thiết kế</h3>
                    <div className="border border-slate-300 shadow-md bg-white rounded-md overflow-hidden relative" style={{ transform: 'scale(0.7)', transformOrigin: 'top center', marginBottom: '-140px' }}>
                      <div className="w-[66mm] h-[142mm] flex items-center justify-center bg-white">
                        <AddressFlyerPreview item={addressFlyerData} />
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex gap-3 mt-4">
                    <button
                      onClick={saveAddressConfig}
                      disabled={isSaving}
                      className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-md transition-all disabled:opacity-50 cursor-pointer text-xs uppercase"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Lưu Cấu Hình
                    </button>
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all cursor-pointer text-xs uppercase"
                    >
                      <Printer size={20} />
                      In Địa Chỉ (6 ô / A4)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'in-phieu-bh' && (
            <motion.div
              key="in-phieu-bh"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <FileText size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình In Phiếu Bảo Hành (Phiếu BH)</h2>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7 space-y-6 max-h-[750px] overflow-y-auto pr-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-sky-700">1. Điền thông tin nhanh</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Tên siêu thị</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: ĐIỆN MÁY XANH PHƯỜNG 8"
                          value={phieuBhData.tenSieuThi}
                          onChange={e => setPhieuBhData({ ...phieuBhData, tenSieuThi: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Thời hạn bảo hành SP (tháng/năm)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 12"
                          value={phieuBhData.sanPhamBh}
                          onChange={e => setPhieuBhData({ ...phieuBhData, sanPhamBh: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Thời hạn bảo hành Remote (tháng)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 6"
                          value={phieuBhData.remoteBh}
                          onChange={e => setPhieuBhData({ ...phieuBhData, remoteBh: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Giao trước (số ngày)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 3"
                          value={phieuBhData.giaoTruocNgay}
                          onChange={e => setPhieuBhData({ ...phieuBhData, giaoTruocNgay: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Chi tiết / Ngày giao hàng</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 25/06/2026"
                          value={phieuBhData.giaoTruocText}
                          onChange={e => setPhieuBhData({ ...phieuBhData, giaoTruocText: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Số điện thoại Hỗ trợ và mua hàng</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1800.1061 hoặc hotline siêu thị"
                          value={phieuBhData.hoTroMuaHang}
                          onChange={e => setPhieuBhData({ ...phieuBhData, hoTroMuaHang: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider text-sky-700">2. Layout in</h3>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-2">Chọn số lượng phiếu trên một trang in:</label>
                      <div className="flex flex-col md:flex-row gap-3">
                        {[
                          { value: '1', label: '1 Phiếu / Trang A4 Dọc' },
                          { value: '2', label: '2 Phiếu / Trang A4 Ngang (Cỡ A5)' },
                          { value: '4', label: '4 Phiếu / Trang A4 Dọc (Cỡ A6)' },
                          { value: 'right', label: 'In bên phải (Trang A5 Ngang) điều chỉnh bố cục vừa trang in A5 Ngang' }
                        ].map(item => (
                          <label key={item.value} className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-700">
                            <input
                              type="radio"
                              name="phieuBhLayout"
                              value={item.value}
                              checked={phieuBhPrintLayout === item.value}
                              onChange={() => setPhieuBhPrintLayout(item.value)}
                              className="text-sky-600 focus:ring-sky-500"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider text-sky-700 font-black">3. Biên soạn điều khoản (7 dòng chính)</h3>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 2 - Điều 1 (30 ngày đầu)</label>
                      <textarea
                        value={phieuBhData.row2Line1}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row2Line1: e.target.value })}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 2 - Điều 2 (Qua 30 ngày)</label>
                      <textarea
                        value={phieuBhData.row2Line2}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row2Line2: e.target.value })}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 2 - Điều 3 (Sản phẩm đổi trả)</label>
                      <textarea
                        value={phieuBhData.row2Line3}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row2Line3: e.target.value })}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 2 - Điều 4 (Khấu trừ tháng đầu)</label>
                        <input
                          type="text"
                          value={phieuBhData.row2Line4}
                          onChange={e => setPhieuBhData({ ...phieuBhData, row2Line4: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 2 - Điều 5 (Khấu trừ tháng tiếp theo)</label>
                        <input
                          type="text"
                          value={phieuBhData.row2Line5}
                          onChange={e => setPhieuBhData({ ...phieuBhData, row2Line5: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 4 - Phí vật tư</label>
                      <input
                        type="text"
                        value={phieuBhData.row4Text}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row4Text: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 5 - Tư vấn khách hàng</label>
                      <input
                        type="text"
                        value={phieuBhData.row5Text}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row5Text: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 6 - Số điện thoại bảo hành</label>
                      <input
                        type="text"
                        value={phieuBhData.row6Line1}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row6Line1: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dòng 7 - Ghi chú phụ chân trang</label>
                      <input
                        type="text"
                        placeholder="Để trống hoặc ghi chú thêm (ví dụ: Chữ ký khách hàng, v.v.)"
                        value={phieuBhData.row7Text}
                        onChange={e => setPhieuBhData({ ...phieuBhData, row7Text: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-5 flex flex-col items-center gap-6">
                  <div className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-sky-700 self-start">Xem trước phiếu bảo hành</h3>
                    <div className="border border-slate-300 shadow-md bg-white rounded-md overflow-hidden relative" style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: phieuBhPrintLayout === 'right' ? '-80px' : '-50px' }}>
                      <div className="flex items-center justify-center bg-white" style={{ width: phieuBhPrintLayout === 'right' ? '98mm' : '105mm', height: phieuBhPrintLayout === 'right' ? '132mm' : '148.5mm' }}>
                        <PhieuBHPreview item={phieuBhData} layout={phieuBhPrintLayout} />
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex gap-3 mt-4">
                    <button
                      onClick={savePhieuBhConfig}
                      disabled={isSaving}
                      className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-md transition-all disabled:opacity-50 cursor-pointer text-xs uppercase"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Lưu Cấu Hình
                    </button>
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 hover:shadow-xl transition-all cursor-pointer text-xs uppercase"
                    >
                      <Printer size={20} />
                      IN PHIẾU BH
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          </AnimatePresence>
          )}
        </div>
      </div>

      <BienBanTinhTrangHangHoa 
        isOpen={isBienBanModalOpen}
        onClose={() => setIsBienBanModalOpen(false)}
        title={bienBanTitle}
      />

      <BaoGiaCongTyModal 
        isOpen={isBaoGiaModalOpen}
        onClose={() => setIsBaoGiaModalOpen(false)}
      />

      <PrintLayoutModal
        isOpen={isLayoutModalOpen}
        isCe={activeTab === 'sticker-ce'}
        isLk={activeTab === 'sticker-lk'}
        onClose={() => setIsLayoutModalOpen(false)}
        onConfirm={(style, layout, showPromoLabel) => {
          setPrintConfig({ style, layout, showPromoLabel });
          setIsLayoutModalOpen(false);
          setIsPrintModalOpen(true);
        }}
      />

      <StickerPrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        data={
          activeTab === 'sticker-dcnb'
            ? Array(24).fill({})
            : activeTab === 'in-dia-chi'
              ? Array(6).fill(addressFlyerData)
              : activeTab === 'in-phieu-bh'
                ? (phieuBhPrintLayout === 'right' ? [null, phieuBhData] : Array(parseInt(phieuBhPrintLayout || '2')).fill(phieuBhData))
                : filteredPriceData.flatMap((item, index) => {
                    const isSelected = selectedIndices.length === 0 || selectedIndices.includes(index);
                    const quantity = printQuantities[index] || 1;
                    return isSelected && quantity > 0 ? Array(quantity).fill(item) : [];
                  })
        } 
        config={
          activeTab === 'in-dia-chi'
            ? { style: 'address_flyer', layout: '6', showPromoLabel: false }
            : activeTab === 'in-phieu-bh'
              ? { style: 'phieu_bh', layout: phieuBhPrintLayout, showPromoLabel: false }
              : printConfig
        }
        mlnHeaderTemplate={activeTab === 'sticker-gvgs' ? gvgsHeaderTemplate : mlnHeaderTemplate}
        mlnFooterTemplate={activeTab === 'sticker-gvgs' ? gvgsFooterTemplate : mlnFooterTemplate}
        promoLabelText={promoLabelTextVal}
      />

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-none md:rounded-3xl max-w-md w-full h-full md:h-auto md:max-h-[90vh] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 md:px-6 md:py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Scan size={20} className="animate-pulse text-indigo-200" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider leading-tight">Quét Tồn Kho</h3>
                  <p className="text-[10px] text-indigo-100 font-medium mt-0.5 truncate max-w-[220px]">
                    Siêu thị: {maKho || 'ALL'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseScanner}
                className="text-white/80 hover:text-white text-xs font-bold uppercase transition-colors"
              >
                Đóng
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
              <button 
                onClick={() => {
                  setScannerMode('local');
                  setScannerError(null);
                }}
                className={`flex-1 py-2.5 md:py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                  scannerMode === 'local' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Quét trực tiếp
              </button>
              <button 
                onClick={() => {
                  stopScanning();
                  setScannerMode('qr');
                  setScannerError(null);
                }}
                className={`flex-1 py-2.5 md:py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                  scannerMode === 'qr' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Điện thoại khác
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-hidden flex-1 flex flex-col items-center gap-3 md:gap-4 bg-white min-h-[300px]">
              {scannerMode === 'local' ? (
                <div className="w-full flex-1 flex flex-col items-center gap-3 min-h-0 overflow-hidden">
                  <div className="w-full max-w-[85vw] md:max-w-[320px] aspect-square bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner flex items-center justify-center shrink-0">
                    <div id="modal-reader" className="w-full h-full object-cover" />
                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-[55%] aspect-square max-w-[200px] border-2 border-emerald-500 rounded-2xl relative flex items-center justify-center">
                          <div className="absolute left-1 right-1 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] top-1/2 -translate-y-1/2 animate-pulse" />
                          <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                          <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                          <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                        </div>
                      </div>
                    )}
                    {scannerError && (
                      <div className="absolute inset-x-3 top-3 bg-rose-500/90 text-white text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-sm z-20">
                        <ShieldAlert size={14} className="shrink-0" />
                        <p>{scannerError}</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full flex gap-2 shrink-0">
                    <div className="flex-1 relative">
                      <select 
                        value={selectedCameraId}
                        onChange={(e) => handleCameraChange(e.target.value)}
                        className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-2.5 pl-3 pr-8 rounded-xl text-[11px] font-bold focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="">-- Chọn Camera --</option>
                        {cameras.map((c, i) => (
                          <option key={c.id} value={c.id}>{c.label || `Camera ${i + 1}`}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                    <button 
                      onClick={() => isScanning ? stopScanning() : startScanning(selectedCameraId)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 text-white ${
                        isScanning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {isScanning ? 'Tạm dừng' : 'Tiếp tục'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 min-h-0 overflow-hidden py-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                    <QRCode 
                      value={`${window.location.origin}${window.location.pathname}?scanner=true&session=${scannerSessionId}&store=${encodeURIComponent(maKho || 'ALL')}`} 
                      size={160} 
                    />
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-widest text-center">
                      Quét bằng camera điện thoại
                    </span>
                  </div>
                  <div className="text-center space-y-1 shrink-0">
                    <p className="text-xs font-bold text-slate-600">Đang chờ kết nối quét...</p>
                    <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                      Dùng điện thoại quét mã QR phía trên để mở camera điện thoại quét mã vạch sản phẩm tồn kho.
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Input for scanner */}
              <div className="w-full flex gap-2 pt-1 border-t border-slate-100 shrink-0">
                <input 
                  type="text" 
                  placeholder="Nhập mã sản phẩm bằng tay..."
                  value={manualInputCode}
                  onChange={(e) => setManualInputCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const code = manualInputCode.trim();
                      if (code) {
                        setScannedCodes(prev => {
                          if (prev.includes(code)) return prev;
                          const next = [code, ...prev];
                          if (scannerSessionId) {
                            supabase.from('scanner_sessions').upsert({
                              id: scannerSessionId,
                              store_id: maKho || 'ALL',
                              scanned_codes: JSON.stringify(next)
                            }, {
                              onConflict: 'id'
                            }).catch(err => console.error('Error syncing manual code:', err));
                          }
                          return next;
                        });
                        setManualInputCode('');
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const code = manualInputCode.trim();
                    if (code) {
                      setScannedCodes(prev => {
                        if (prev.includes(code)) return prev;
                        const next = [code, ...prev];
                        if (scannerSessionId) {
                          supabase.from('scanner_sessions').upsert({
                            id: scannerSessionId,
                            store_id: maKho || 'ALL',
                            scanned_codes: JSON.stringify(next)
                          }, {
                            onConflict: 'id'
                          }).catch(err => console.error('Error syncing manual code:', err));
                        }
                        return next;
                      });
                      setManualInputCode('');
                    }
                  }}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  Thêm
                </button>
              </div>

              {/* Scanned codes list */}
              <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-3 flex-1 flex flex-col min-h-[100px] max-h-[140px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Đã quét được</span>
                  <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2.5 py-0.5 rounded-full">
                    {scannedCodes.length} mã
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {scannedCodes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase py-6">
                      Chưa có sản phẩm nào
                    </div>
                  ) : (
                    scannedCodes.map((code, idx) => (
                      <div key={`${code}-${idx}`} className="bg-white border border-slate-100 py-1 px-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 shadow-sm animate-[fadeIn_0.15s_ease-out]">
                        <span className="font-mono tracking-wider text-indigo-600">{code}</span>
                        <button 
                          onClick={() => {
                            const next = scannedCodes.filter(c => c !== code);
                            setScannedCodes(next);
                            if (scannerSessionId) {
                              supabase.from('scanner_sessions').upsert({
                                id: scannerSessionId,
                                store_id: maKho || 'ALL',
                                scanned_codes: JSON.stringify(next)
                              }, {
                                onConflict: 'id'
                              }).catch(err => console.error('Error syncing manual code deletion:', err));
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-3 md:px-6 md:py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={handleCloseScanner}
                className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all uppercase"
              >
                Hủy
              </button>
              <button 
                onClick={handleCompleteScanner}
                disabled={scannedCodes.length === 0}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold transition-all uppercase shadow-md flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
