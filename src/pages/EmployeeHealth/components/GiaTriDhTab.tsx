import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  Camera,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  Search,
  Eye,
  Filter,
  Upload,
  Check,
  Trash2,
  User,
  Layers,
  Tag,
  Globe,
  Lock,
  Unlock,
  Clock,
  FileSpreadsheet,
  X,
  GripVertical,
  RotateCcw,
  ArrowLeftRight,
  ExternalLink,
  Sparkles,
  Copy,
  Bookmark,
  HelpCircle,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useStore } from '../../../contexts/StoreContext';
import { normalizeStoreId, cn } from '../../RTST/utils';
import { StaffRevenueData } from '../../../types';
import { ensureFontsReady } from '../../../utils/fontExportUtil';

export const BOOKMARKLET_AUTO_COPY_5_CAP = `javascript:(function(){(async function(){let l=document.getElementById("tm-lbl");if(l)return;let b=document.createElement("div");b.style.cssText="position:fixed;bottom:30px;right:30px;z-index:99999999;background:linear-gradient(135deg,rgb(234,88,12),rgb(249,115,22));color:white;padding:14px 24px;border-radius:9999px;font-weight:900;font-size:14px;box-shadow:0 12px 28px rgba(0,0,0,0.5);font-family:sans-serif;cursor:pointer;";b.innerHTML="⚡ <span id='tm-lbl'>ĐANG MỞ CÁC CẤP [+]...</span>";document.body.appendChild(b);let lb=document.getElementById("tm-lbl");for(let lvl=1;lvl<=6;lvl++){let pls=[];document.querySelectorAll("table tr td:first-child, table tr td:nth-child(2)").forEach(c=>{let t=c.innerText?c.innerText.trim():"";if(t==="+"||t.startsWith("+ ")||t==="➕"||t==="▶"||t==="►"){if(!pls.includes(c))pls.push(c)}else{c.querySelectorAll("span,i,a,div,button").forEach(ic=>{let st=ic.innerText?ic.innerText.trim():"";if((st==="+"||st==="➕"||ic.classList.contains("fa-plus")||ic.classList.contains("k-plus"))&&!pls.includes(ic))pls.push(ic)})}});if(pls.length===0)break;if(lb)lb.innerText="ĐANG MỞ CẤP "+lvl+"/6...";for(let el of pls){try{el.scrollIntoView({block:"nearest"});el.click();el.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));el.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}))}catch(e){}}await new Promise(r=>setTimeout(r,350))}if(lb)lb.innerText="ĐANG COPY DỮ LIỆU...";await new Promise(r=>setTimeout(r,400));let s=window.getSelection(),rg=document.createRange();rg.selectNodeContents(document.body);s.removeAllRanges();s.addRange(rg);let txt=s.toString()||document.body.innerText;if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(txt).catch(()=>{})}document.execCommand("copy");s.removeAllRanges();if(lb)lb.innerText="✓ ĐÃ COPY XONG 5 CẤP!";b.style.background="linear-gradient(135deg,rgb(16,185,129),rgb(5,150,105))";setTimeout(()=>b.remove(),3000);alert("✅ ĐÃ COPY XONG TOÀN BỘ 5 CẤP!\\nBây giờ bạn chỉ cần quay lại CRM và bấm [Dán] (Ctrl+V).");})();})();`;

interface TreeRow {
  originalIndex: number;
  level: number;
  cells: string[];
  hasChildren: boolean;
  staffName: string;
  nganhName: string;
  nhomName: string;
  brandName: string;
  productName: string;
}

interface DataPt {
  bpName: string;
  bpCells: string[];
  nvName: string;
  nnhName: string;
  nhomName: string;
  nhomCells: string[];
  brandName?: string;
  brandCells?: string[];
}

const ALL_CTKTNV_COLS = [
  'GIỜ CÔNG', 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG',
  'D.THU THỰC', 'D.THU QUY ĐỔI', 'HIỆU QUẢ QUY ĐỔI', 'D.THU TRẢ CHẬM', 'TỈ TRỌNG TRẢ CHẬM',
  'D.THU SMF', 'D.THU PHỤ KIỆN', 'KHAI THÁC PHỤ KIỆN TRÊN ICT', 'D.THU ĐỒNG HỒ', 'KHAI THÁC ĐỒNG HỒ TRÊN ICT',
  'D.THU C.E', 'D.THU GIA DỤNG', 'KHAI THÁC GIA DỤNG TRÊN C.E',
  'S.L ICT (SMF)', 'S.L PSDP', 'BÁN KÈM PSDP TRÊN ICT', 'S.L TAI NGHE', 'BÁN KÈM TAI NGHE TRÊN ICT',
  'S.L CAMERA', 'BÁN KÈM CAMERA TRÊN ICT', 'S.L CÁP SẠC', 'BÁN KÈM CÁP SẠC TRÊN ICT',
  'S.L LOA DI ĐỘNG', 'BÁN KÈM LOA DI ĐỘNG TRÊN ICT', 'S.L SIM', 'BÁN KÈM SIM TRÊN ICT',
  'S.L VAS', 'BÁN KÈM VAS TRÊN ICT', 'S.L ĐỒNG HỒ', 'BÁN KÈM ĐỒNG HỒ TRÊN ICT',
  'S.L CE', 'S.L MÁY LỌC NƯỚC', 'BÁN KÈM MLN TRÊN C.E', 'S.L NỒI CƠM', 'BÁN KÈM NỒI CƠM TRÊN C.E',
  'S.L NỒI CHIÊN', 'BÁN KÈM NỒI CHIÊN TRÊN C.E', 'S.L BẾP GAS', 'BÁN KÈM BẾP GAS TRÊN C.E',
  'S.L BẾP ĐIỆN', 'BÁN KÈM BẾP ĐIỆN TRÊN C.E', 'S.L QUẠT ĐIỀU HÒA', 'BÁN KÈM QĐH TRÊN C.E',
  'S.L QUẠT GIÓ', 'BÁN KÈM QUẠT GIÓ TRÊN C.E',
  'TỔNG DTQĐ', 'DTQĐ BẢO HIỂM', 'TỈ TRỌNG BẢO HIỂM TRÊN D.T'
];

export interface CtktnvGroupInfo {
  name: string;
  color: string;
  cols: string[];
}

export const CTKTNV_GROUPS: CtktnvGroupInfo[] = [
  {
    name: 'NĂNG SUẤT',
    color: '#059669',
    cols: ['GIỜ CÔNG', 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG']
  },
  {
    name: 'DOANH THU QUY ĐỔI',
    color: '#f59e0b',
    cols: ['D.THU THỰC', 'D.THU QUY ĐỔI', 'HIỆU QUẢ QUY ĐỔI', 'D.THU TRẢ CHẬM', 'TỈ TRỌNG TRẢ CHẬM']
  },
  {
    name: 'KHAI THÁC DOANH THU',
    color: '#047857',
    cols: [
      'D.THU SMF', 'D.THU PHỤ KIỆN', 'KHAI THÁC PHỤ KIỆN TRÊN ICT',
      'D.THU ĐỒNG HỒ', 'KHAI THÁC ĐỒNG HỒ TRÊN ICT',
      'D.THU C.E', 'D.THU GIA DỤNG', 'KHAI THÁC GIA DỤNG TRÊN C.E'
    ]
  },
  {
    name: 'BÁN KÈM ICT',
    color: '#dc2626',
    cols: [
      'S.L ICT (SMF)', 'S.L PSDP', 'BÁN KÈM PSDP TRÊN ICT',
      'S.L TAI NGHE', 'BÁN KÈM TAI NGHE TRÊN ICT',
      'S.L CAMERA', 'BÁN KÈM CAMERA TRÊN ICT',
      'S.L CÁP SẠC', 'BÁN KÈM CÁP SẠC TRÊN ICT',
      'S.L LOA DI ĐỘNG', 'BÁN KÈM LOA DI ĐỘNG TRÊN ICT',
      'S.L SIM', 'BÁN KÈM SIM TRÊN ICT',
      'S.L VAS', 'BÁN KÈM VAS TRÊN ICT',
      'S.L ĐỒNG HỒ', 'BÁN KÈM ĐỒNG HỒ TRÊN ICT'
    ]
  },
  {
    name: 'BÁN KÈM C.E',
    color: '#2563eb',
    cols: [
      'S.L CE',
      'S.L MÁY LỌC NƯỚC', 'BÁN KÈM MLN TRÊN C.E',
      'S.L NỒI CƠM', 'BÁN KÈM NỒI CƠM TRÊN C.E',
      'S.L NỒI CHIÊN', 'BÁN KÈM NỒI CHIÊN TRÊN C.E',
      'S.L BẾP GAS', 'BÁN KÈM BẾP GAS TRÊN C.E',
      'S.L BẾP ĐIỆN', 'BÁN KÈM BẾP ĐIỆN TRÊN C.E',
      'S.L QUẠT ĐIỀU HÒA', 'BÁN KÈM QĐH TRÊN C.E',
      'S.L QUẠT GIÓ', 'BÁN KÈM QUẠT GIÓ TRÊN C.E'
    ]
  },
  {
    name: 'BẢO HIỂM',
    color: '#0d9488',
    cols: ['TỔNG DTQĐ', 'DTQĐ BẢO HIỂM', 'TỈ TRỌNG BẢO HIỂM TRÊN D.T']
  }
];

export const ALL_CTKTNV_GROUP_NAMES = CTKTNV_GROUPS.map(g => g.name);

const CTKTNV_COL_GROUPS: Record<string, { group: string; color: string }> = {};
(() => {
  CTKTNV_GROUPS.forEach(g => {
    g.cols.forEach(c => {
      CTKTNV_COL_GROUPS[c] = { group: g.name, color: g.color };
    });
  });
})();

const removeAccents = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const parseCellNum = (val: string | undefined): number => {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').replace(/ /g, '').trim();
  return parseFloat(cleaned) || 0;
};

const formatCellNum = (val: number): string => {
  if (val === 0) return '0';
  return val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const fNum = (val: number): string => (val === 0 ? '-' : val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const isGarbageConcatenatedHeader = (cellText: string): boolean => {
  if (!cellText) return false;
  const clean = cellText.replace(/^[\+\-\–\—\•\*\s]+/, '').trim();
  const lowerClean = removeAccents(clean).toLowerCase();

  // Only allow BP All In One as main department; exclude any other BP (e.g. BP Trưởng Ca, BP Quản Lý)
  if ((clean.startsWith('BP ') || lowerClean.startsWith('bp ')) && !lowerClean.includes('all in one')) return true;

  const countBp = (clean.match(/BP /gi) || []).length;
  const countNnh = (clean.match(/NNH /gi) || []).length;
  const countNganh = (clean.match(/Ngành /gi) || []).length;
  const countDmx = (clean.match(/ - ĐMX| - TGDD| - BHX/gi) || []).length;

  if (countBp > 1 || countNnh > 1 || countNganh > 1 || countDmx > 1) return true;
  if (clean.length > 55 && (clean.includes('NNH') || clean.includes('BP'))) return true;
  return false;
};

const KNOWN_BRANDS = new Set([
  // Công nghệ, Điện thoại, Laptop, Tablet
  'APPLE', 'SAMSUNG', 'OPPO', 'XIAOMI', 'VIVO', 'REALME', 'NOKIA', 'SONY', 'ASUS', 'ACER',
  'DELL', 'HP', 'LENOVO', 'MACBOOK', 'IPAD', 'SINGPC', 'TECNO', 'MOBELL', 'MASSTEL', 'HONOR',
  'HUAWEI', 'ZTE', 'INFINIX', 'POCO', 'ITEL', 'TCL', 'COOCAA', 'HISENSE', 'VSP',

  // Điện lạnh, Tivi, Âm thanh
  'LG', 'DAIKIN', 'PANASONIC', 'TOSHIBA', 'SHARP', 'AQUA', 'ELECTROLUX', 'CASPER', 'SANAKY',
  'HAIER', 'COMFEE', 'NAGAKAWA', 'FUNIKI', 'GREE', 'HITACHI', 'MITSUBISHI', 'BEKO', 'HÒA PHÁT',
  'HOA PHAT', 'DALTON', 'NANOMAX', 'PARAMAX', 'ACNOS', 'BOSTON AUDIO', 'SUMICO', 'MICROLAB',
  'SOUNDMAX', 'BOSE', 'JBL', 'MARSHALL', 'HARMAN KARDON', 'EDIFIER', 'KLIPSCH', 'FENDER',
  'EASY AND PERFECT', 'ALPHA WORKS',

  // Gia dụng, Nhà bếp, Đời sống
  'SUNHOUSE', 'KANGAROO', 'PHILIPS', 'MIDEA', 'BLUESTONE', 'BEAR', 'TEFAL', 'ELMICH', 'INOCHI',
  'SUPOR', 'DELITES', 'HOMMY', 'MEGAHOME', 'GỖ TRƯỜNG SƠN', 'TRƯỜNG SƠN', 'VIỆT NHẬT', 'VIET NHAT',
  'SAMRAN', 'LOCK&LOCK', 'LOCK & LOCK', 'PRAMIE', 'GREENCOOK', 'NAMILUX', 'ĐIỆN QUANG', 'DIEN QUANG',
  'BOSS', 'AVA', 'AVA+', 'SAKURA', 'RINNAI', 'PALOMA', 'DUXTON', 'MUTOSI', 'KAROFI', 'AOSMITH',
  'A.O. SMITH', 'ROBOROCK', 'DREAME', 'ECOVACS', 'LUMIAS', 'SENKO', 'ASIA', 'LIVOTEC', 'SHOWSEE',
  'ENCHEN', 'BOMIDI', 'KACHI', 'HAFELE', 'HAPPYCOOK', 'FIVESTAR', 'CUCKOO', 'ATLANTIC', 'TEMPO',
  'ARISTON', 'HAWONKOO', 'COSORI', 'KUCHEF', 'KAFF', 'MALLOCA', 'BOSCH', 'COMET', 'DAIKIOSAN',
  'RAPIDO', 'RAPOO',

  // Phụ kiện, Pin sạc, Camera, Thiết bị lưu trữ, Mạng
  'ANKER', 'BASEUS', 'UGREEN', 'JOWAY', 'GANNA', 'DNS', 'DEREN', 'SUNRISE', 'LEAGTECH', 'TG GROUP',
  'INNOSTYLE', 'TOGO', 'PUMAX', 'UNIBEST CO., LTD', 'UNIBEST', 'O-TECH', 'OTECH', 'ROTA', 'BESTCUT',
  'JINCASE', 'OCCA', 'AZULO', 'EZVIZ', 'IMOU', 'TP-LINK', 'TPLINK', 'TIANDY', '365 SELECTION',
  'MODI', 'HK THUNDER', 'REZO', 'SOUNDCORE', 'HAVIT', 'MACHENIKE', 'KIOXIA', 'SANDISK', 'HIKSEMI',
  'KINGSTON', 'LOGITECH', 'DAREU', 'MERCUSYS', 'TOTOLINK', 'CANON', 'BROTHER', 'CORSAIR',
  'ENERGIZER', 'BELKIN', 'SOUNDPEATS', 'CẢNH PHONG', 'CANH PHONG', 'CHƯA XÁC ĐỊNH', 'CHUA XAC DINH',
  'COSANO',

  // Đồng hồ & Wearable
  'CASIO', 'Q&Q', 'ELIO', 'KORLEX', 'SMILE KID', 'KIDCARE', 'GARMIN', 'AMAZFIT',

  // Dịch vụ, Ứng dụng, Bảo hiểm, Viễn thông
  'BẢO HIỂM PVI', 'PVI', 'MIC', 'PTI', 'VIEON', 'MANGO PLUS', 'MANGO', 'VNG', 'ZING', 'GARENA', 'THẺ GAME GARENA',
  'VINAPHONE', 'MOBIFONE', 'VIETTEL', 'KASPERSKY', 'TẬN TÂM', 'TAN TAM', 'THẾ GIỚI DI ĐỘNG',
  'THE GIOI DI DONG'
]);

const KNOWN_CATEGORIES = new Set([
  'TỦ LẠNH (IMEI)', 'MÁY LẠNH (IMEI)', 'MÁY GIẶT (IMEI)', 'MÁY NƯỚC NÓNG', 'TỦ ĐÔNG', 'TỦ MÁT',
  'MÁY SẤY LỒNG NGANG', 'MÁY RỬA CHÉN', 'LỌC NƯỚC DẠNG TỦ ĐỨNG', 'LỌC NƯỚC ÂM TỦ/TRÊN BÀN',
  'HÚT BỤI CÂY', 'HÚT BỤI ROBOT', 'HÚT BỤI', 'BẾP GAS ĐÔI', 'BẾP GAS ÂM', 'BẾP GAS ĐƠN',
  'BẾP ĐIỆN ĐƠN', 'BẾP ĐIỆN ÂM', 'NỒI CƠM NẮP GÀI/NẮP RỜI', 'NỒI CƠM ĐIỆN TỬ', 'NỒI CƠM CAO TẦN',
  'NỒI CHIÊN', 'QUẠT ĐỨNG', 'QUẠT TREO', 'QUẠT BÀN/HỘP/SÀN', 'QUẠT ĐIỀU HÒA',
  'QUẠT SẠC ĐIỆN/NĂNG LƯỢNG MẶT TRỜI', 'QUẠT CẦM TAY', 'MÁY LỌC KHÔNG KHÍ', 'XAY SINH TỐ',
  'XAY ÉP/KHÁC', 'MÁY ÉP TRÁI CÂY', 'CHĂM SÓC SỨC KHỎE/LÀM ĐẸP', 'BÌNH ĐUN SIÊU TỐC',
  'BÌNH THỦY ĐIỆN', 'LÒ VI SÓNG', 'BÀN ỦI KHÔ', 'BÀN ỦI HƠI NƯỚC', 'BÀN ỦI HƠI NƯỚC ĐỨNG',
  'NỒI', 'CHẢO', 'DAO/KÉO/THỚT', 'DỤNG CỤ NHÀ BẾP KHÁC', 'BÌNH/LY/CA GIỮ NHIỆT',
  'NÓN BẢO HIỂM CÁC LOẠI', 'Ổ CẮM ĐIỆN/VỢT MUỖI', 'ĐÈN BÀN/ĐÈN SẠC/ĐÈN BẮT MUỖI', 'VỆ SINH NHÀ CỬA',
  'ÁP SUẤT/LẨU/CHIÊN/NƯỚNG', 'SẤY TÓC', 'SMARTPHONE', 'ĐIỆN THOẠI DI ĐỘNG', 'TIVI LED (IMEI)',
  'LOA KARAOKE', 'CAMERA IP TRONG NHÀ', 'CAMERA IP NGOÀI TRỜI', 'ĐÈN NĂNG LƯỢNG MẶT TRỜI',
  'PIN SẠC DỰ PHÒNG', 'TAI NGHE BLUETOOTH', 'TAI NGHE BLUETOOTH - IMEI', 'TAI NGHE DÂY',
  'THẺ NHỚ', 'CHUỘT', 'BÀN PHÍM', 'KHUNG TREO, GIÁ ĐỠ', 'SẠC/ ADAPTER', 'BỘ SẠC/CÁP/ADAPTOR (GIÁ RẺ)',
  'CÁP', 'CÁP (GIÁ RẺ)', 'LOA DI ĐỘNG', 'LOA VI TÍNH (IMEI)', 'MIẾNG DÁN KÍNH', 'MIẾNG DÁN MẶT TRƯỚC',
  'MIẾNG DÁN MẶT SAU', 'ỐP LƯNG - FLIP COVER', 'TÚI CHỐNG SỐC', 'BALO', 'LÕI LỌC', 'PIN', 'USB',
  'THIẾT BỊ MẠNG', 'PHỤ KIỆN TIỆN ÍCH APPLE', 'PHỤ KIỆN ÂM THANH APPLE', 'PHỤ KIỆN IT KHÁC',
  'PHỤ KIỆN ĐIỆN MÁY', 'LAPTOP', 'DỊCH VỤ BẢO HIỂM', '4479 - DỊCH VỤ BẢO HIỂM', 'BẢO HIỂM', 'UDDĐ', '571 - UDDĐ', 'UDDD', 'VAS', 'ỨNG DỤNG DI ĐỘNG', 'ỨNG DỤNG PC & LAPTOP',
  'ĐỒNG HỒ ĐỊNH VỊ TRẺ EM', 'SMARTWATCH', 'SIM ONLINE', 'SIM TRẮNG (SERI)', 'SIM TRẮNG ĐIỆN TỬ',
  'THAY SIM', 'ĐỒNG HỒ TRẺ EM', 'ĐỒNG HỒ NỮ DÂY KIM LOẠI', 'ĐỒNG HỒ NỮ DÂY DA',
  'ĐỒNG HỒ NAM DÂY KIM LOẠI', 'ĐỒNG HỒ NAM DÂY DA', 'MÃ NẠP THẺ GAME', 'THẺ CÀO ĐIỆN TỬ',
  'THU HỘ PHÍ BẢO HIỂM', '4499 - THU HỘ PHÍ BẢO HIỂM', 'MÁY IN, FAX', 'MÀN HÌNH, MÁY TÍNH ĐỂ BÀN', 'DỊCH VỤ KHÁC',
  'DỊCH VỤ BẢO TRÌ'
]);

const isCategoryHeaderText = (text: string): boolean => {
  if (!text) return false;
  const clean = text.replace(/^[\+\-\–\—\•\*\s]+/, '').trim().toUpperCase();
  if (KNOWN_CATEGORIES.has(clean)) return true;
  const noAcc = removeAccents(clean);
  if (KNOWN_CATEGORIES.has(noAcc)) return true;
  const withoutPrefix = clean.replace(/^\d+[\s\-\–\—\.]+\s*/, '').trim();
  if (KNOWN_CATEGORIES.has(withoutPrefix) || KNOWN_CATEGORIES.has(removeAccents(withoutPrefix))) return true;
  return false;
};

const isBrandName = (text: string): boolean => {
  if (!text) return false;
  const clean = (text || '').replace(/^[\+\-\–\—\•\*\s]+/, '').trim().toUpperCase();
  if (KNOWN_BRANDS.has(clean) || KNOWN_BRANDS.has(clean.replace(/\s+/g, ''))) return true;
  const noAcc = removeAccents(clean);
  if (KNOWN_BRANDS.has(noAcc) || KNOWN_BRANDS.has(noAcc.replace(/\s+/g, ''))) return true;
  return false;
};

const isStaffName = (text: string): boolean => {
  if (!text) return false;
  const clean = text.replace(/^[\+\-\–\—\•\*\s]+/, '').trim();
  if (isBrandName(clean) || isCategoryHeaderText(clean)) return false;
  if (clean.startsWith('BP ') || clean.startsWith('NNH ') || clean.startsWith('Ngành ') || clean.startsWith('NH ') || clean.startsWith('N.Hàng ')) return false;
  
  // Format Cấp 1 Nhân viên chuẩn: Họ tên tiếng Việt (2-6 từ) - Mã NV (4-8 số)
  // VD: "Thạch Vũ - 71132", "Trần Văn Duy - 100544", "Lê Kim Mỹ - 59442", "Ngô Thị Bé Thắm - 38834", "Huỳnh Hoàng Phúc - 97734", "Võ Vũ Linh - 43751"
  const parts = clean.split(/\s*[-–—]\s*/);
  if (parts.length === 2) {
    const [namePart, idPart] = parts;
    if (/^\d{4,8}$/.test(idPart) && !/\d/.test(namePart) && namePart.length >= 2 && namePart.length <= 35) {
      // Reject if name contains brand names or product keywords
      const upperName = namePart.toUpperCase();
      const words = new Set(upperName.split(/[\s/]+/));
      if (Array.from(words).some(w => KNOWN_BRANDS.has(w))) return false;
      
      const lowerName = namePart.toLowerCase();
      const productPrefixes = ['bình ', 'máy ', 'bàn ủi', 'loa ', 'tivi ', 'điện thoại ', 'nồi ', 'bếp ', 'quạt ', 'tủ ', 'chảo ', 'dao ', 'vợt ', 'áo mưa', 'súng ', 'thẻ ', 'tai nghe ', 'chuột ', 'cáp ', 'sạc ', 'camera ', 'đồng hồ ', 'sim ', 'gói '];
      if (productPrefixes.some(p => lowerName.startsWith(p))) return false;

      const nameWords = namePart.trim().split(/\s+/);
      if (nameWords.length >= 2 && nameWords.length <= 6) {
        return true;
      }
    }
  }
  return false;
};

const getRowLevel = (cellText: string): number => {
  const clean = (cellText || '').replace(/^[\+\-\–\—\•\*\s]+/, '').trim();
  if (clean === 'Tổng' || clean === 'TOTAL' || clean === 'Tong') return 0;
  if (isGarbageConcatenatedHeader(clean)) return -1;
  if (clean.startsWith('BP ') || clean.toLowerCase().includes('all in one')) return 0;
  
  // 1. Cấp 1: Nhân viên (Họ tên - Mã NV)
  if (isStaffName(clean)) return 1;

  // 2. Cấp 2: Ngành Hàng chính (bắt đầu bằng NNH, Ngành, NH, N.Hàng)
  if (clean.startsWith('NNH ') || clean.startsWith('Ngành ') || clean.startsWith('NH ') || clean.startsWith('N.Hàng ')) return 2;

  // 3. Cấp 3: Nhóm Hàng con (Category)
  if (isCategoryHeaderText(clean)) return 3;

  // 4. Cấp 4: Hãng / Thương hiệu (Brand)
  if (isBrandName(clean)) return 4;

  // 5. Cấp 5: Sản phẩm chi tiết
  return 5;
};

const isAppleRow = (row: TreeRow): boolean => {
  const cellText = (row.cells[0] || '').trim().toUpperCase();
  return cellText.includes('APPLE') || cellText.includes('IPHONE') || cellText.includes('IPAD') || cellText.includes('MACBOOK') || cellText.includes('AIRPOD');
};

export type HierarchyDim = 'staff' | 'nganh' | 'nhom' | 'brand';
const DEFAULT_HIERARCHY_ORDER: HierarchyDim[] = ['staff', 'nganh', 'nhom', 'brand'];

function buildDynamicGroupedTree(initialRows: TreeRow[], hierarchyOrder: HierarchyDim[]): TreeRow[] {
  const isDefault = hierarchyOrder[0] === 'staff' && hierarchyOrder[1] === 'nganh' && hierarchyOrder[2] === 'nhom' && hierarchyOrder[3] === 'brand';
  if (isDefault) return initialRows;

  // Extract all valid leaf items (exclude Total/Garbage/Supermarket-wide rows that have no staff)
  const leafItems = initialRows.filter(r => {
    if (r.level <= 0) return false;
    if (!r.staffName) return false;
    const c0 = (r.cells[0] || '').toLowerCase();
    if (c0.includes('tổng') || c0.includes('total') || c0.startsWith('bp all in one')) return false;
    return !r.hasChildren || r.level === 5;
  });

  if (leafItems.length === 0) return initialRows;

  const getDimValue = (item: TreeRow, dim: HierarchyDim): string => {
    let val = '';
    if (dim === 'staff') val = item.staffName || '';
    else if (dim === 'nganh') val = item.nganhName || '';
    else if (dim === 'nhom') val = item.nhomName || '';
    else if (dim === 'brand') val = item.brandName || '';
    val = val.trim();
    if (val === 'Khác' || val === 'Tong' || val.toLowerCase().includes('tổng') || val.toLowerCase().includes('total')) return '';
    return val;
  };

  const dim0 = hierarchyOrder[0];
  const dim1 = hierarchyOrder[1];
  const dim2 = hierarchyOrder[2];
  const dim3 = hierarchyOrder[3];

  const result: TreeRow[] = [];
  let rowIdx = 0;

  // Group by Dim 0
  const map0 = new Map<string, TreeRow[]>();
  for (const item of leafItems) {
    const val0 = getDimValue(item, dim0);
    if (!val0) continue; // Bỏ qua hoàn toàn dòng không có thông tin hợp lệ (KHÔNG TẠO DÒNG "KHÁC")
    if (!map0.has(val0)) map0.set(val0, []);
    map0.get(val0)!.push(item);
  }

  for (const [val0, items0] of map0.entries()) {
    let sumDTThuc0 = 0, sumDTQD0 = 0, sumSL0 = 0;
    for (const it of items0) {
      sumDTThuc0 += parseCellNum(it.cells[1]);
      sumDTQD0 += parseCellNum(it.cells[2]);
      sumSL0 += parseCellNum(it.cells[4]);
    }
    const avgDG0 = sumSL0 > 0 ? sumDTThuc0 / sumSL0 : 0;
    const avgHQ0 = sumSL0 > 0 ? sumDTQD0 / sumSL0 : 0;

    result.push({
      originalIndex: rowIdx++,
      level: 1,
      cells: [val0, formatCellNum(sumDTThuc0), formatCellNum(sumDTQD0), formatCellNum(avgHQ0), formatCellNum(sumSL0), formatCellNum(avgDG0)],
      hasChildren: true,
      staffName: dim0 === 'staff' ? val0 : '',
      nganhName: dim0 === 'nganh' ? val0 : '',
      nhomName: dim0 === 'nhom' ? val0 : '',
      brandName: dim0 === 'brand' ? val0 : '',
      productName: ''
    });

    // Group by Dim 1
    const map1 = new Map<string, TreeRow[]>();
    for (const item of items0) {
      const val1 = getDimValue(item, dim1);
      if (val1 && val1 !== val0) {
        if (!map1.has(val1)) map1.set(val1, []);
        map1.get(val1)!.push(item);
      }
    }

    for (const [val1, items1] of map1.entries()) {
      let sumDTThuc1 = 0, sumDTQD1 = 0, sumSL1 = 0;
      for (const it of items1) {
        sumDTThuc1 += parseCellNum(it.cells[1]);
        sumDTQD1 += parseCellNum(it.cells[2]);
        sumSL1 += parseCellNum(it.cells[4]);
      }
      const avgDG1 = sumSL1 > 0 ? sumDTThuc1 / sumSL1 : 0;
      const avgHQ1 = sumSL1 > 0 ? sumDTQD1 / sumSL1 : 0;

      result.push({
        originalIndex: rowIdx++,
        level: 2,
        cells: [val1, formatCellNum(sumDTThuc1), formatCellNum(sumDTQD1), formatCellNum(avgHQ1), formatCellNum(sumSL1), formatCellNum(avgDG1)],
        hasChildren: true,
        staffName: dim0 === 'staff' ? val0 : (dim1 === 'staff' ? val1 : ''),
        nganhName: dim0 === 'nganh' ? val0 : (dim1 === 'nganh' ? val1 : ''),
        nhomName: dim0 === 'nhom' ? val0 : (dim1 === 'nhom' ? val1 : ''),
        brandName: dim0 === 'brand' ? val0 : (dim1 === 'brand' ? val1 : ''),
        productName: ''
      });

      // Group by Dim 2
      const map2 = new Map<string, TreeRow[]>();
      for (const item of items1) {
        const val2 = getDimValue(item, dim2);
        if (val2 && val2 !== val0 && val2 !== val1) {
          if (!map2.has(val2)) map2.set(val2, []);
          map2.get(val2)!.push(item);
        }
      }

      for (const [val2, items2] of map2.entries()) {
        let sumDTThuc2 = 0, sumDTQD2 = 0, sumSL2 = 0;
        for (const it of items2) {
          sumDTThuc2 += parseCellNum(it.cells[1]);
          sumDTQD2 += parseCellNum(it.cells[2]);
          sumSL2 += parseCellNum(it.cells[4]);
        }
        const avgDG2 = sumSL2 > 0 ? sumDTThuc2 / sumSL2 : 0;
        const avgHQ2 = sumSL2 > 0 ? sumDTQD2 / sumSL2 : 0;

        result.push({
          originalIndex: rowIdx++,
          level: 3,
          cells: [val2, formatCellNum(sumDTThuc2), formatCellNum(sumDTQD2), formatCellNum(avgHQ2), formatCellNum(sumSL2), formatCellNum(avgDG2)],
          hasChildren: true,
          staffName: dim0 === 'staff' ? val0 : (dim1 === 'staff' ? val1 : (dim2 === 'staff' ? val2 : '')),
          nganhName: dim0 === 'nganh' ? val0 : (dim1 === 'nganh' ? val1 : (dim2 === 'nganh' ? val2 : '')),
          nhomName: dim0 === 'nhom' ? val0 : (dim1 === 'nhom' ? val1 : (dim2 === 'nhom' ? val2 : '')),
          brandName: dim0 === 'brand' ? val0 : (dim1 === 'brand' ? val1 : (dim2 === 'brand' ? val2 : '')),
          productName: ''
        });

        // Group by Dim 3
        const map3 = new Map<string, TreeRow[]>();
        for (const item of items2) {
          const val3 = getDimValue(item, dim3);
          if (val3 && val3 !== val0 && val3 !== val1 && val3 !== val2) {
            if (!map3.has(val3)) map3.set(val3, []);
            map3.get(val3)!.push(item);
          }
        }

        for (const [val3, items3] of map3.entries()) {
          let sumDTThuc3 = 0, sumDTQD3 = 0, sumSL3 = 0;
          for (const it of items3) {
            sumDTThuc3 += parseCellNum(it.cells[1]);
            sumDTQD3 += parseCellNum(it.cells[2]);
            sumSL3 += parseCellNum(it.cells[4]);
          }
          const avgDG3 = sumSL3 > 0 ? sumDTThuc3 / sumSL3 : 0;
          const avgHQ3 = sumSL3 > 0 ? sumDTQD3 / sumSL3 : 0;

          const hasProducts = items3.some(it => Boolean(it.productName && it.productName !== val3));

          result.push({
            originalIndex: rowIdx++,
            level: 4,
            cells: [val3, formatCellNum(sumDTThuc3), formatCellNum(sumDTQD3), formatCellNum(avgHQ3), formatCellNum(sumSL3), formatCellNum(avgDG3)],
            hasChildren: hasProducts,
            staffName: dim0 === 'staff' ? val0 : (dim1 === 'staff' ? val1 : (dim2 === 'staff' ? val2 : (dim3 === 'staff' ? val3 : ''))),
            nganhName: dim0 === 'nganh' ? val0 : (dim1 === 'nganh' ? val1 : (dim2 === 'nganh' ? val2 : (dim3 === 'nganh' ? val3 : ''))),
            nhomName: dim0 === 'nhom' ? val0 : (dim1 === 'nhom' ? val1 : (dim2 === 'nhom' ? val2 : (dim3 === 'nhom' ? val3 : ''))),
            brandName: dim0 === 'brand' ? val0 : (dim1 === 'brand' ? val1 : (dim2 === 'brand' ? val2 : (dim3 === 'brand' ? val3 : ''))),
            productName: ''
          });

          // Level 5: List Products under Dim 3
          if (hasProducts) {
            for (const prodItem of items3) {
              if (prodItem.productName && prodItem.productName !== val3) {
                result.push({
                  originalIndex: rowIdx++,
                  level: 5,
                  cells: [prodItem.productName, prodItem.cells[1], prodItem.cells[2], prodItem.cells[3], prodItem.cells[4], prodItem.cells[5]],
                  hasChildren: false,
                  staffName: prodItem.staffName,
                  nganhName: prodItem.nganhName,
                  nhomName: prodItem.nhomName,
                  brandName: prodItem.brandName,
                  productName: prodItem.productName
                });
              }
            }
          }
        }
      }
    }
  }

  // Update hasChildren
  for (let i = 0; i < result.length; i++) {
    if (i < result.length - 1) {
      result[i].hasChildren = result[i + 1].level > result[i].level;
    } else {
      result[i].hasChildren = false;
    }
  }

  return result;
}

// Tối ưu chức năng xuất ảnh: Auto thu gọn độ rộng bảng vừa khít dữ liệu (Zero-shadow, Zero-Scrollbar, HD 2.5x)
const captureElementHelper = async (element: HTMLElement): Promise<string> => {
  const htmlToImage = await import('html-to-image');
  await ensureFontsReady();

  const clone = element.cloneNode(true) as HTMLElement;
  const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, .capture-btn, input, select');
  noCaptureElements.forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });

  // Triệt tiêu hoàn toàn bóng mờ (Zero-Shadow Export Rule)
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      htmlEl.style.boxShadow = 'none';
      htmlEl.style.textShadow = 'none';
      htmlEl.style.filter = 'none';
    }
    if (htmlEl.classList) {
      Array.from(htmlEl.classList).forEach(cls => {
        if (cls.startsWith('shadow') || cls.startsWith('drop-shadow')) {
          htmlEl.classList.remove(cls);
        }
      });
    }
  });

  // Measure exact natural content width of the table columns
  let sumColWidths = 0;
  const sourceTable = element.querySelector('table');
  if (sourceTable) {
    const colEls = sourceTable.querySelectorAll('col');
    if (colEls.length > 0) {
      colEls.forEach(col => {
        const wStr = (col as HTMLElement).style.width || '';
        const minWStr = (col as HTMLElement).style.minWidth || '';
        const w = parseInt(wStr || minWStr || '0', 10);
        sumColWidths += w > 0 ? w : 120;
      });
    }
    if (sumColWidths === 0) {
      sumColWidths = sourceTable.scrollWidth;
    }
  }

  if (sumColWidths === 0) {
    sumColWidths = element.scrollWidth || 640;
  }

  // Auto-fit: Banner needs minimum ~620px to display header text gracefully,
  // otherwise width is EXACTLY sumColWidths (no forced 1000px/1600px stretch)
  const actualContentWidth = Math.max(620, sumColWidths);
  const framePadding = 24;
  const totalExportWidth = actualContentWidth + framePadding * 2;

  // Triệt tiêu hoàn toàn thanh cuộn (Zero-Scrollbar Rule)
  const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-scroll, [class*="overflow"]');
  scrollContainers.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = 'visible';
    htmlEl.style.width = `${actualContentWidth}px`;
    htmlEl.style.minWidth = `${actualContentWidth}px`;
    htmlEl.style.maxWidth = `${actualContentWidth}px`;
    htmlEl.style.height = 'auto';
    el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto', 'overflow-scroll');
  });

  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    const htmlTable = table as HTMLElement;
    htmlTable.style.width = `${actualContentWidth}px`;
    htmlTable.style.minWidth = `${actualContentWidth}px`;
    htmlTable.style.maxWidth = `${actualContentWidth}px`;
    htmlTable.style.tableLayout = 'fixed';
    htmlTable.style.boxSizing = 'border-box';
  });

  // Gỡ bỏ sticky
  const stickyEls = clone.querySelectorAll('.sticky, [style*="sticky"]');
  stickyEls.forEach(el => {
    (el as HTMLElement).style.position = 'relative';
    (el as HTMLElement).style.left = 'auto';
    (el as HTMLElement).style.zIndex = 'auto';
  });

  // Căn chỉnh Banner bên trong clone khớp 100% actualContentWidth
  const banners = clone.querySelectorAll('.bg-\\[\\#059669\\], [class*="bg-"]');
  banners.forEach(b => {
    const htmlB = b as HTMLElement;
    if (htmlB.tagName === 'DIV' && (htmlB.className.includes('059669') || htmlB.className.includes('emerald'))) {
      htmlB.style.width = '100%';
      htmlB.style.minWidth = '100%';
      htmlB.style.boxSizing = 'border-box';
    }
  });

  // Nhúng style ẩn triệt để thanh cuộn
  const hideScrollbarStyle = document.createElement('style');
  hideScrollbarStyle.innerHTML = `
    *::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    * {
      -ms-overflow-style: none !important;
      scrollbar-width: none !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
  `;
  clone.appendChild(hideScrollbarStyle);

  clone.style.width = `${actualContentWidth}px`;
  clone.style.minWidth = `${actualContentWidth}px`;
  clone.style.maxWidth = `${actualContentWidth}px`;
  clone.style.height = 'auto';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.backgroundColor = '#ffffff';
  clone.style.boxSizing = 'border-box';
  clone.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";

  // Frame wrapper to ensure generous white border with zero shadow
  const frameWrapper = document.createElement('div');
  frameWrapper.style.backgroundColor = '#ffffff';
  frameWrapper.style.boxShadow = 'none';
  frameWrapper.style.padding = `${framePadding}px`;
  frameWrapper.style.borderRadius = '24px';
  frameWrapper.style.border = '2px solid #e2e8f0';
  frameWrapper.style.boxSizing = 'border-box';
  frameWrapper.style.width = `${totalExportWidth}px`;
  frameWrapper.style.minWidth = `${totalExportWidth}px`;
  frameWrapper.style.maxWidth = `${totalExportWidth}px`;
  frameWrapper.style.overflow = 'visible';
  frameWrapper.appendChild(clone);

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.top = '-9999px';
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = `${totalExportWidth}px`;
  tempContainer.style.height = 'auto';
  tempContainer.style.overflow = 'visible';
  tempContainer.style.zIndex = '-9999';
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.backgroundColor = '#ffffff';
  tempContainer.appendChild(frameWrapper);

  document.body.appendChild(tempContainer);

  try {
    await new Promise(r => setTimeout(r, 250));
    const dataUrl = await htmlToImage.toPng(frameWrapper, {
      quality: 1,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      width: totalExportWidth,
      cacheBust: true,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        overflow: 'visible'
      }
    });
    return dataUrl;
  } finally {
    document.body.removeChild(tempContainer);
  }
};

interface CustomFilterPopoverProps {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  pillBgClass: string;
  searchIconColorClass: string;
  icon: React.ReactNode;
  isIconOnly?: boolean;
  alignRight?: boolean;
}

const CustomFilterPopover: React.FC<CustomFilterPopoverProps> = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  pillBgClass,
  searchIconColorClass,
  icon,
  isIconOnly,
  alignRight
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = removeAccents(searchQuery).toLowerCase().trim();
    return options.filter(opt => removeAccents(opt).toLowerCase().includes(q));
  }, [options, searchQuery]);

  // Is explicitly empty (user clicked 'Bỏ chọn')
  const isExplicitlyEmpty = selected.length === 1 && selected[0] === '__EMPTY__';
  
  // Default is all selected when selected is empty array [] or length equals options.length
  const isAllSelected = !isExplicitlyEmpty && (selected.length === 0 || selected.length === options.length);
  
  const effectiveSelected = useMemo(() => {
    if (isExplicitlyEmpty) return [];
    if (isAllSelected) return options;
    return selected;
  }, [isExplicitlyEmpty, isAllSelected, options, selected]);

  const getDisplayText = () => {
    if (isAllSelected) return label;
    if (effectiveSelected.length === 0) return `${label}: 0 đã chọn`;
    if (effectiveSelected.length === 1) {
      const first = effectiveSelected[0].replace(/^NNH\s+/, '').split(/[-–—]/)[0].trim();
      return `${label}: ${first}`;
    }
    return `${label}: ${effectiveSelected.length} đã chọn`;
  };

  const handleToggleOption = (opt: string) => {
    if (effectiveSelected.includes(opt)) {
      const next = effectiveSelected.filter(item => item !== opt);
      if (next.length === 0) {
        onChange(['__EMPTY__']);
      } else {
        onChange(next);
      }
    } else {
      const next = [...effectiveSelected, opt];
      if (next.length >= options.length) {
        onChange([]); // all selected
      } else {
        onChange(next);
      }
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={isIconOnly
          ? `flex items-center justify-center p-1.5 rounded-lg border text-xs font-black cursor-pointer hover:opacity-90 transition-all select-none shadow-xs active:scale-95 ${pillBgClass}`
          : `flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border-2 text-[14px] sm:text-[17px] font-black cursor-pointer hover:opacity-90 transition-all select-none shadow-sm active:scale-95 ${pillBgClass}`
        }
        title={effectiveSelected.length < options.length ? `Đang lọc: ${effectiveSelected.length}/${options.length} nhân viên` : "Lọc danh sách"}
      >
        <span className="flex items-center gap-1">
          {icon}
          {!isIconOnly && getDisplayText()}
          {isIconOnly && effectiveSelected.length < options.length && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </span>
        {!isIconOnly && <Search size={13} className={`ml-1 ${searchIconColorClass}`} />}
      </button>

      {isOpen && (
        <div className={`absolute ${alignRight ? 'right-0' : 'left-[-40px] sm:left-0'} mt-2 w-[290px] sm:w-[340px] max-w-[88vw] bg-white border-2 border-indigo-200/90 rounded-[24px] shadow-2xl p-3.5 sm:p-4 z-[999] animate-in fade-in zoom-in-95 duration-150`}>
          <div className="relative mb-3">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <Filter size={18} className="stroke-[2.5]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-[14px] font-bold text-slate-800 placeholder-slate-400 outline-none shadow-sm transition-all"
            />
          </div>

          <div className="flex items-center justify-between px-1 mb-2 pb-2 border-b border-slate-100 font-extrabold text-[13px] sm:text-[15px]">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                <Upload size={12} className="stroke-[3]" />
              </span>
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={() => onChange(['__EMPTY__'])}
              className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
            >
              Bỏ chọn
            </button>
          </div>

          <div className="max-h-[260px] overflow-y-auto space-y-1 divide-y divide-slate-100/70 pr-1 custom-scrollbar">
            {filteredOptions.map((opt) => {
              const isChecked = effectiveSelected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => handleToggleOption(opt)}
                  className="flex items-center justify-between py-2 px-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                >
                  <span className={`text-[13.5px] font-bold ${isChecked ? 'text-indigo-950 font-black' : 'text-slate-500'}`}>
                    {opt}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check size={13} className="stroke-[3]" />}
                  </div>
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4 font-medium">Không tìm thấy kết quả</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export interface GiaTriDhTabProps {
  nganhhangChinhNv: string;
  saveNganhhangChinhNv: (data: string) => void;
  handleAutoPasteNganhHangChinh: () => void;
  renderLoadingOverlay?: () => React.ReactNode;
  searchTerm?: string;
  selectedStaffIds?: string[];
  biRevenueData?: StaffRevenueData[];
  parsedTraChamRows?: any[];
  tragopNv?: string;
  onPreviewImage: (url: string | null) => void;
}

export const GiaTriDhTab: React.FC<GiaTriDhTabProps> = ({
  nganhhangChinhNv,
  saveNganhhangChinhNv,
  handleAutoPasteNganhHangChinh,
  renderLoadingOverlay,
  searchTerm = '',
  selectedStaffIds = [],
  biRevenueData = [],
  parsedTraChamRows = [],
  tragopNv = '',
  onPreviewImage
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const captureGiaTriDhRef = useRef<HTMLDivElement>(null);
  const captureCtktnvRef = useRef<HTMLDivElement>(null);

  const { currentStoreId, warehouseCode } = useStore();
  const storeDocId = useMemo(() => {
    return normalizeStoreId(currentStoreId || warehouseCode || 'default_store');
  }, [currentStoreId, warehouseCode]);

  // Giờ công Excel state
  const [gioCongData, setGioCongData] = useState<Record<string, { gioCong: number; ngayCong: number }>>(() => {
    try { const s = localStorage.getItem('gtdh_giocong_data'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [gioCongFileName, setGioCongFileName] = useState<string>(() => localStorage.getItem('gtdh_giocong_filename') || '');
  const [isEditingGioCong, setIsEditingGioCong] = useState<boolean>(false);
  const [gioCongUpdatedTime, setGioCongUpdatedTime] = useState<string>(() => localStorage.getItem('gtdh_giocong_updated_time') || '');

  // Local block states & timestamps for DATA N.HÀNG CHÍNH NV
  const [isEditingData, setIsEditingData] = useState<boolean>(!nganhhangChinhNv);
  const [tempDataVal, setTempDataVal] = useState<string>(nganhhangChinhNv || '');
  const [dataUpdatedTime, setDataUpdatedTime] = useState<string>(() => localStorage.getItem('gtdh_data_updated_time') || '');

  // Bookmarklet modal state
  const [showBookmarkModal, setShowBookmarkModal] = useState<boolean>(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState<boolean>(false);

  const getCurrentFormattedDateTime = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    return `${time} NGÀY ${date}`;
  };

  // 🔄 Real-time synchronization with Firebase Firestore (for Mobile & Other Devices)
  useEffect(() => {
    if (!storeDocId) return;
    const docRef = doc(db, 'store', storeDocId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.gtdh_giocong_data !== undefined && data.gtdh_giocong_data !== null) {
            setGioCongData(data.gtdh_giocong_data);
            try {
              localStorage.setItem('gtdh_giocong_data', JSON.stringify(data.gtdh_giocong_data));
            } catch (e) {}
          }
          if (data.gtdh_giocong_filename !== undefined && data.gtdh_giocong_filename !== null) {
            setGioCongFileName(data.gtdh_giocong_filename);
            localStorage.setItem('gtdh_giocong_filename', data.gtdh_giocong_filename);
          }
          if (data.gtdh_giocong_updated_time !== undefined && data.gtdh_giocong_updated_time !== null) {
            setGioCongUpdatedTime(data.gtdh_giocong_updated_time);
            localStorage.setItem('gtdh_giocong_updated_time', data.gtdh_giocong_updated_time);
          }
          if (data.gtdh_data_updated_time !== undefined && data.gtdh_data_updated_time !== null) {
            setDataUpdatedTime(data.gtdh_data_updated_time);
            localStorage.setItem('gtdh_data_updated_time', data.gtdh_data_updated_time);
          }
        }
      },
      (err) => {
        console.error('[GiaTriDhTab] Firestore onSnapshot error:', err);
      }
    );
    return () => unsubscribe();
  }, [storeDocId]);

  useEffect(() => {
    setTempDataVal(nganhhangChinhNv || '');
    if (nganhhangChinhNv) {
      const now = getCurrentFormattedDateTime();
      setDataUpdatedTime(now);
      localStorage.setItem('gtdh_data_updated_time', now);
      setIsEditingData(false);
    }
  }, [nganhhangChinhNv]);

  const dataLineCount = useMemo(() => {
    if (!nganhhangChinhNv) return 0;
    return nganhhangChinhNv.split('\n').filter(l => l.trim().length > 0).length;
  }, [nganhhangChinhNv]);

  const gioCongStaffCount = useMemo(() => {
    return Object.keys(gioCongData).length;
  }, [gioCongData]);

  const handleSaveDataBlock = async () => {
    saveNganhhangChinhNv(tempDataVal);
    const now = getCurrentFormattedDateTime();
    setDataUpdatedTime(now);
    localStorage.setItem('gtdh_data_updated_time', now);
    setIsEditingData(false);

    if (storeDocId) {
      try {
        const docRef = doc(db, 'store', storeDocId);
        await setDoc(
          docRef,
          {
            gtdh_data_updated_time: now,
            updated_at: serverTimestamp()
          },
          { merge: true }
        );
      } catch (e) {
        console.error('[GiaTriDhTab] Error saving gtdh_data_updated_time to Firestore:', e);
      }
    }
  };

  // Filter states: Cấp 1 (Nhân viên), Cấp 2 (Ngành hàng), Cấp 3 (Nhóm hàng), Cấp 4 (Hãng)
  const [selectedStaffFilters, setSelectedStaffFilters] = useState<string[]>(() => {
    try { const s = localStorage.getItem('gtdh_filter_staff_list'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [selectedNganhFilters, setSelectedNganhFilters] = useState<string[]>(() => {
    try { const s = localStorage.getItem('gtdh_filter_nganh_list'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [selectedNhomFilters, setSelectedNhomFilters] = useState<string[]>(() => {
    try { const s = localStorage.getItem('gtdh_filter_nhom_list'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [selectedBrandFilters, setSelectedBrandFilters] = useState<string[]>(() => {
    try { const s = localStorage.getItem('gtdh_filter_brand_list'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [hideApple, setHideApple] = useState<boolean>(() => localStorage.getItem('gtdh_filter_hideApple') === 'true');

  // Hierarchy order state with drag-and-drop support
  const [hierarchyOrder, setHierarchyOrder] = useState<HierarchyDim[]>(() => {
    try {
      const saved = localStorage.getItem('crm_hierarchy_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch (e) {}
    return DEFAULT_HIERARCHY_ORDER;
  });

  const [draggedDim, setDraggedDim] = useState<HierarchyDim | null>(null);

  const handleDragStart = (dim: HierarchyDim) => {
    setDraggedDim(dim);
  };

  const handleDragOver = (e: React.DragEvent, targetDim: HierarchyDim) => {
    e.preventDefault();
    if (!draggedDim || draggedDim === targetDim) return;
    const oldIndex = hierarchyOrder.indexOf(draggedDim);
    const newIndex = hierarchyOrder.indexOf(targetDim);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...hierarchyOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, draggedDim);
      setHierarchyOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedDim(null);
  };

  useEffect(() => {
    try {
      localStorage.setItem('crm_hierarchy_order', JSON.stringify(hierarchyOrder));
    } catch (e) {}
  }, [hierarchyOrder]);

  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [selectedLevel, setSelectedLevel] = useState<number | null>(() => {
    const saved = localStorage.getItem('gtdh_filter_level');
    return saved !== null && saved !== '' ? parseInt(saved, 10) : null;
  });

  // Group visibility for CTKTNV
  const [visibleCtktnvGroups, setVisibleCtktnvGroups] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('gtdh_ctktnv_visible_groups');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return ALL_CTKTNV_GROUP_NAMES;
    } catch {
      return ALL_CTKTNV_GROUP_NAMES;
    }
  });

  const visibleCtktnvCols = useMemo(() => {
    return CTKTNV_GROUPS.filter(g => visibleCtktnvGroups.includes(g.name)).flatMap(g => g.cols);
  }, [visibleCtktnvGroups]);

  const [showColFilter, setShowColFilter] = useState(false);
  const colFilterRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('gtdh_filter_staff_list', JSON.stringify(selectedStaffFilters));
    localStorage.setItem('gtdh_filter_nganh_list', JSON.stringify(selectedNganhFilters));
    localStorage.setItem('gtdh_filter_nhom_list', JSON.stringify(selectedNhomFilters));
    localStorage.setItem('gtdh_filter_brand_list', JSON.stringify(selectedBrandFilters));
    localStorage.setItem('gtdh_filter_hideApple', String(hideApple));
  }, [selectedStaffFilters, selectedNganhFilters, selectedNhomFilters, selectedBrandFilters, hideApple]);

  useEffect(() => {
    localStorage.setItem('gtdh_giocong_data', JSON.stringify(gioCongData));
  }, [gioCongData]);

  useEffect(() => {
    localStorage.setItem('gtdh_ctktnv_visible_groups', JSON.stringify(visibleCtktnvGroups));
  }, [visibleCtktnvGroups]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colFilterRef.current && !colFilterRef.current.contains(e.target as Node)) setShowColFilter(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Handle Excel upload for Giờ Công
  const handleGioCongUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGioCongFileName(file.name);
    localStorage.setItem('gtdh_giocong_filename', file.name);

    const now = getCurrentFormattedDateTime();
    setGioCongUpdatedTime(now);
    localStorage.setItem('gtdh_giocong_updated_time', now);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (jsonRows.length < 2) return;

        // Dynamic header detection (support both standard and modified exports)
        let nameCol = 5;       // Column F default
        let gioCongCol = 10;   // Column K default
        let startRowIdx = 1;

        for (let r = 0; r < Math.min(jsonRows.length, 10); r++) {
          const row = jsonRows[r];
          if (row && Array.isArray(row)) {
            row.forEach((cell, cIdx) => {
              const cellStr = String(cell || '').toLowerCase().trim();
              if (cellStr.includes('họ và tên') || cellStr.includes('tên nhân viên') || cellStr.includes('họ tên')) {
                nameCol = cIdx;
                startRowIdx = r + 1;
              }
              if (cellStr.includes('giờ công') || cellStr.includes('tổng giờ') || cellStr.includes('giờ làm')) {
                gioCongCol = cIdx;
              }
            });
          }
        }

        const result: Record<string, { gioCong: number; ngayCong: number }> = {};
        for (let r = startRowIdx; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row) continue;
          const name = String(row[nameCol] || '').trim();
          if (!name || name.toLowerCase().includes('tổng') || name.toLowerCase().includes('cộng')) continue;
          const gc = parseFloat(String(row[gioCongCol] || '0').replace(/,/g, '')) || 0;
          if (result[name]) {
            result[name].gioCong += gc;
          } else {
            result[name] = { gioCong: gc, ngayCong: 0 };
          }
        }
        setGioCongData(result);
        localStorage.setItem('gtdh_giocong_data', JSON.stringify(result));
        setIsEditingGioCong(false);

        // 🔥 Save to Firebase Firestore immediately for sync across all phones and browsers
        if (storeDocId) {
          try {
            const docRef = doc(db, 'store', storeDocId);
            await setDoc(
              docRef,
              {
                gtdh_giocong_data: result,
                gtdh_giocong_filename: file.name,
                gtdh_giocong_updated_time: now,
                updated_at: serverTimestamp()
              },
              { merge: true }
            );
          } catch (fireErr) {
            console.error('[GiaTriDhTab] Error saving giocong to Firestore:', fireErr);
          }
        }
      } catch (err) {
        console.error('Error parsing Giờ Công file:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearGioCongData = async () => {
    setGioCongData({});
    setGioCongFileName('');
    setGioCongUpdatedTime('');
    localStorage.removeItem('gtdh_giocong_data');
    localStorage.removeItem('gtdh_giocong_filename');
    localStorage.removeItem('gtdh_giocong_updated_time');
    setIsEditingGioCong(false);

    if (storeDocId) {
      try {
        const docRef = doc(db, 'store', storeDocId);
        await setDoc(
          docRef,
          {
            gtdh_giocong_data: {},
            gtdh_giocong_filename: '',
            gtdh_giocong_updated_time: '',
            updated_at: serverTimestamp()
          },
          { merge: true }
        );
      } catch (e) {
        console.error('[GiaTriDhTab] Error clearing giocong on Firestore:', e);
      }
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá toàn bộ dữ liệu Giá Trị Đơn Hàng đã dán?')) {
      saveNganhhangChinhNv('');
      setDataUpdatedTime('');
      localStorage.removeItem('gtdh_data_updated_time');
      clearGioCongData();
      setIsEditingData(true);
      setSelectedStaffFilters([]);
      setSelectedNganhFilters([]);
      setSelectedNhomFilters([]);
      setSelectedBrandFilters([]);
      setHideApple(false);
      setExpandedKeys({});
      setSelectedLevel(null);
      localStorage.removeItem('nganhhangchinh_nv_data');
      localStorage.removeItem('crm_bi_nganhhang_copied_data');
      localStorage.removeItem('crm_auto_copy_nganhhang_result');
      localStorage.removeItem('gtdh_filter_level');
      localStorage.removeItem('gtdh_filter_staff_list');
      localStorage.removeItem('gtdh_filter_nganh_list');
      localStorage.removeItem('gtdh_filter_nhom_list');
      localStorage.removeItem('gtdh_filter_brand_list');
      localStorage.removeItem('gtdh_filter_hideApple');

      try {
        const bc = new BroadcastChannel('crm_bi_sync_channel');
        bc.postMessage({ action: 'CLEAR_GTDH_DATA', timestamp: Date.now() });
      } catch (e) {}
    }
  };

  // 1. FAST MEMOIZED TREE CONSTRUCTION (O(N))
  const {
    headers,
    treeRows,
    uniqueStaffs,
    uniqueNganhs,
    uniqueNhoms,
    uniqueBrands,
    rawTreeRowsList,
    masterDataPts
  } = useMemo(() => {
    if (!nganhhangChinhNv) {
      return {
        headers: [],
        treeRows: [],
        uniqueStaffs: [],
        uniqueNganhs: [],
        uniqueNhoms: [],
        uniqueBrands: [],
        rawTreeRowsList: [],
        masterDataPts: []
      };
    }

    const lines = nganhhangChinhNv
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      return {
        headers: [],
        treeRows: [],
        uniqueStaffs: [],
        uniqueNganhs: [],
        uniqueNhoms: [],
        uniqueBrands: [],
        rawTreeRowsList: [],
        masterDataPts: []
      };
    }

    let hdrs: string[] = ['Tên hàng hoá / Nhân viên', 'DT Thực', 'DTQĐ', 'Hiệu quả QĐ', 'Số lượng', 'Đơn giá'];
    let rawRows: string[][] = [];

    const hasTabs = lines.some(l => l.includes('\t'));

    if (hasTabs) {
      const allParsed = lines.map(line => line.split('\t').map(c => c.trim()));
      const isActualHeaderRow = (row: string[]): boolean => {
        if (row.length < 3) return false;
        const firstCell = (row[0] || '').trim();
        if (isStaffName(firstCell)) return false;
        return row.some(c => {
          const cLower = c.toLowerCase();
          return cLower.includes('nhân viên') || cLower.includes('dtlk') || cLower.includes('dtqđ') || cLower.includes('dt thực') || cLower.includes('tên hàng') || cLower.includes('doanh thu');
        });
      };
      const headerRowIndex = allParsed.findIndex(row => isActualHeaderRow(row));
      if (headerRowIndex !== -1) {
        hdrs = allParsed[headerRowIndex];
        rawRows = allParsed.slice(headerRowIndex + 1).filter(r => r.length >= 2);
      } else {
        rawRows = allParsed.filter(r => r.length >= 2);
      }
    } else {
      // 1-cell-per-line stream from BI
      let headerIdx = -1;
      for (let i = 0; i < lines.length - 5; i++) {
        const l0 = lines[i].toLowerCase();
        const l1 = lines[i + 1].toLowerCase();
        if (l0.includes('nhân viên') && (l1.includes('dtlk') || l1.includes('dtqđ') || l1.includes('dt thực'))) {
          headerIdx = i;
          break;
        }
      }
      const dataLines = headerIdx !== -1 ? lines.slice(headerIdx + 6) : lines;
      let i = 0;
      while (i <= dataLines.length - 6) {
        rawRows.push([
          dataLines[i],
          dataLines[i + 1],
          dataLines[i + 2],
          dataLines[i + 3],
          dataLines[i + 4],
          dataLines[i + 5]
        ]);
        i += 6;
      }
    }

    if (rawRows.length === 0) {
      return {
        headers: hdrs,
        treeRows: [],
        uniqueStaffs: [],
        uniqueNganhs: [],
        uniqueNhoms: [],
        uniqueBrands: [],
        rawTreeRowsList: [],
        masterDataPts: []
      };
    }

    let currentStaffName = '';
    let currentNnhName = '';
    let currentNhomName = '';
    let currentBrandName = '';
    let currentProductName = '';

    const initialTreeRows: TreeRow[] = [];
    const validRawRows = rawRows.filter(r => !isGarbageConcatenatedHeader(r[0] || ''));

    for (let idx = 0; idx < validRawRows.length; idx++) {
      const row = validRawRows[idx];
      const rawCellText = row[0] || '';
      const cleanCellText = rawCellText.replace(/^[\+\-\–\—\•\*\s]+/, '').trim();
      if (!cleanCellText || cleanCellText === 'Tổng' || cleanCellText === 'TOTAL' || cleanCellText === 'Tong') continue;
      if (cleanCellText.startsWith('BP ') || cleanCellText.toLowerCase().includes('all in one')) continue;

      let level = 0;

      // 1. Cấp 1: Nhân viên
      if (isStaffName(cleanCellText)) {
        level = 1;
        currentStaffName = cleanCellText;
        currentNnhName = '';
        currentNhomName = '';
        currentBrandName = '';
        currentProductName = '';
      }
      // 2. Cấp 2: Ngành hàng (NNH)
      else if (cleanCellText.startsWith('NNH ') || cleanCellText.startsWith('Ngành ') || cleanCellText.startsWith('NH ') || cleanCellText.startsWith('N.Hàng ')) {
        level = 2;
        currentNnhName = cleanCellText;
        currentNhomName = '';
        currentBrandName = '';
        currentProductName = '';
      }
      // 3. Cấp 3: Nhóm hàng con (Category)
      else if (isCategoryHeaderText(cleanCellText)) {
        level = 3;
        currentNhomName = cleanCellText;
        currentBrandName = '';
        currentProductName = '';
      }
      // 4. Cấp 4: Hãng / Thương hiệu
      else if (isBrandName(cleanCellText)) {
        level = 4;
        currentBrandName = cleanCellText;
        currentProductName = '';
      }
      // 5. Cấp 5: Sản phẩm chi tiết (đang nằm dưới Brand / Nhóm)
      else {
        level = 5;
        currentProductName = cleanCellText;
      }

      const cleanRow = [...row];
      cleanRow[0] = cleanCellText;

      initialTreeRows.push({
        originalIndex: initialTreeRows.length,
        level,
        cells: cleanRow,
        hasChildren: false,
        staffName: currentStaffName,
        nganhName: level === 2 ? cleanCellText : currentNnhName,
        nhomName: level === 3 ? cleanCellText : currentNhomName,
        brandName: level === 4 ? cleanCellText : currentBrandName,
        productName: level === 5 ? cleanCellText : currentProductName
      });
    }

    // Direct or dynamic grouped tree rows based on hierarchyOrder
    const finalTreeRows = buildDynamicGroupedTree(initialTreeRows, hierarchyOrder);

    for (let i = 0; i < finalTreeRows.length; i++) {
      finalTreeRows[i].originalIndex = i;
      if (i < finalTreeRows.length - 1) {
        finalTreeRows[i].hasChildren = finalTreeRows[i + 1].level > finalTreeRows[i].level;
      } else {
        finalTreeRows[i].hasChildren = false;
      }
    }

    // Extract data points for CTKTNV / charts from the 5 levels
    const dataPts: DataPt[] = [];
    let curStaff = '', curNnh = '', curNganh = '', curBrand = '';
    for (const r of initialTreeRows) {
      if (r.level === 1) {
        curStaff = r.cells[0].trim();
        curNnh = '';
        curNganh = '';
        curBrand = '';
      } else if (r.level === 2) {
        curNnh = r.cells[0].trim();
        curNganh = '';
        curBrand = '';
      } else if (r.level === 3) {
        curNganh = r.cells[0].trim();
        curBrand = '';
      } else if (r.level === 4) {
        curBrand = r.cells[0].trim();
      } else if (r.level === 5) {
        const c1 = parseCellNum(r.cells[1]);
        const c2 = parseCellNum(r.cells[2]);
        const c4 = parseCellNum(r.cells[4]);
        if (c1 > 0 || c2 > 0 || c4 > 0) {
          dataPts.push({
            bpName: 'BP All In One - ĐMX',
            bpCells: [],
            nvName: curStaff || 'Nhân viên khác',
            nnhName: curNnh || 'NNH Khác',
            nhomName: curNganh || curNnh || 'Nhóm Khác',
            nhomCells: [...r.cells],
            brandName: curBrand || '',
            brandCells: [...r.cells]
          });
        }
      }
    }

    const uniqueStaffsList = Array.from(
      new Set(initialTreeRows.filter(r => r.staffName).map(r => r.staffName.trim()))
    ).sort();

    const uniqueNganhsList = Array.from(
      new Set(initialTreeRows.filter(r => r.nganhName).map(r => r.nganhName.trim()))
    ).sort();

    const uniqueNhomsList = Array.from(
      new Set(initialTreeRows.filter(r => r.nhomName).map(r => r.nhomName.trim()))
    ).sort();

    const uniqueBrandsList = Array.from(
      new Set(initialTreeRows.filter(r => r.brandName).map(r => r.brandName.trim()))
    ).sort();

    return {
      headers: hdrs,
      treeRows: finalTreeRows,
      uniqueStaffs: uniqueStaffsList,
      uniqueNganhs: uniqueNganhsList,
      uniqueNhoms: uniqueNhomsList,
      uniqueBrands: uniqueBrandsList,
      rawTreeRowsList: initialTreeRows,
      masterDataPts: dataPts
    };
  }, [nganhhangChinhNv, hierarchyOrder]);

  // Apply saved level safely on initial treeRows computation (guarded against infinite loop)
  const initialLevelAppliedRef = useRef(false);
  useEffect(() => {
    if (!initialLevelAppliedRef.current && selectedLevel !== null && selectedLevel > 0 && treeRows.length > 0) {
      initialLevelAppliedRef.current = true;
      const newKeys: Record<string, boolean> = {};
      treeRows.forEach(row => {
        if (row.hasChildren) {
          const rowKey = `${row.originalIndex}_${row.cells[0]}`;
          newKeys[rowKey] = row.level < selectedLevel;
        }
      });
      setExpandedKeys(newKeys);
    }
  }, [selectedLevel, treeRows]);

  const expandToLevel = useCallback((targetLevel: number) => {
    const newKeys: Record<string, boolean> = {};
    treeRows.forEach(row => {
      if (row.hasChildren) {
        const rowKey = `${row.originalIndex}_${row.cells[0]}`;
        newKeys[rowKey] = row.level < targetLevel;
      }
    });
    setExpandedKeys(newKeys);
    setSelectedLevel(targetLevel);
    localStorage.setItem('gtdh_filter_level', String(targetLevel));
  }, [treeRows]);

  const expandAll = useCallback(() => {
    setExpandedKeys({});
    setSelectedLevel(null);
    localStorage.removeItem('gtdh_filter_level');
  }, []);

  const collapseAll = useCallback(() => {
    const newKeys: Record<string, boolean> = {};
    treeRows.forEach(row => {
      if (row.hasChildren) {
        const rowKey = `${row.originalIndex}_${row.cells[0]}`;
        newKeys[rowKey] = false;
      }
    });
    setExpandedKeys(newKeys);
    setSelectedLevel(0);
    localStorage.setItem('gtdh_filter_level', '0');
  }, [treeRows]);

  // 2. FAST MEMOIZED FILTERING & DYNAMIC BOTTOM-UP VALUE SUMMATION
  const { visibleRows, totalRow } = useMemo(() => {
    if (treeRows.length === 0) return { visibleRows: [], totalRow: null };

    const isRowKeptByFilters = (row: TreeRow): boolean => {
      const cell0 = (row.cells[0] || '').trim();
      if (isGarbageConcatenatedHeader(cell0)) return false;

      const rowStr = (row.cells.join(' ') + ' ' + (row.staffName || '') + ' ' + (row.nganhName || '') + ' ' + (row.nhomName || '') + ' ' + (row.brandName || '')).toUpperCase();
      
      // Global Search Term
      if (searchTerm && !rowStr.includes(searchTerm.toUpperCase())) {
        return false;
      }

      // Sidebar Staff Filter
      if (selectedStaffIds.length > 0 && selectedStaffIds.length < biRevenueData.length) {
        if (row.level >= 1) {
          const matchesSidebarStaff = selectedStaffIds.some(id => rowStr.includes(id.toUpperCase()));
          if (!matchesSidebarStaff) return false;
        }
      }

      // 1. Cấp 1: NHÂN VIÊN
      if (selectedStaffFilters.length > 0) {
        if (selectedStaffFilters.length === 1 && selectedStaffFilters[0] === '__EMPTY__') return false;
        if (selectedStaffFilters.length < uniqueStaffs.length) {
          if (row.staffName) {
            const matchesStaff = selectedStaffFilters.some(
              sf => row.staffName === sf || row.staffName.includes(sf) || sf.includes(row.staffName)
            );
            if (!matchesStaff) return false;
          }
        }
      }

      // 2. Cấp 2: NGÀNH HÀNG
      if (selectedNganhFilters.length > 0) {
        if (selectedNganhFilters.length === 1 && selectedNganhFilters[0] === '__EMPTY__') return false;
        if (selectedNganhFilters.length < uniqueNganhs.length) {
          if (row.nganhName) {
            const rowNganhClean = removeAccents(row.nganhName).toLowerCase().trim();
            const matchesNganh = selectedNganhFilters.some(filterItem => {
              const filterClean = removeAccents(filterItem).toLowerCase().trim();
              return rowNganhClean === filterClean || rowNganhClean.includes(filterClean) || filterClean.includes(rowNganhClean);
            });
            if (!matchesNganh) return false;
          }
        }
      }

      // 3. Cấp 3: NHÓM HÀNG
      if (selectedNhomFilters.length > 0) {
        if (selectedNhomFilters.length === 1 && selectedNhomFilters[0] === '__EMPTY__') return false;
        if (selectedNhomFilters.length < uniqueNhoms.length) {
          if (row.nhomName) {
            const rowNhomClean = removeAccents(row.nhomName).toLowerCase().trim();
            const matchesNhom = selectedNhomFilters.some(filterItem => {
              const filterClean = removeAccents(filterItem).toLowerCase().trim();
              return rowNhomClean === filterClean || rowNhomClean.includes(filterClean) || filterClean.includes(rowNhomClean);
            });
            if (!matchesNhom) return false;
          }
        }
      }

      // 4. Cấp 4: HÃNG
      if (selectedBrandFilters.length > 0) {
        if (selectedBrandFilters.length === 1 && selectedBrandFilters[0] === '__EMPTY__') return false;
        if (selectedBrandFilters.length < uniqueBrands.length) {
          if (row.brandName) {
            const rowBrandClean = removeAccents(row.brandName).toLowerCase().trim();
            const matchesBrand = selectedBrandFilters.some(filterItem => {
              const filterClean = removeAccents(filterItem).toLowerCase().trim();
              return rowBrandClean === filterClean || rowBrandClean.includes(filterClean) || filterClean.includes(rowBrandClean);
            });
            if (!matchesBrand) return false;
          }
        }
      }

      // 5. Ẩn Apple
      if (hideApple) {
        const brandUpper = (row.brandName || '').toUpperCase();
        const cellUpper = cell0.toUpperCase();
        const prodUpper = (row.productName || '').toUpperCase();
        if (
          brandUpper.includes('APPLE') ||
          cellUpper.includes('APPLE') ||
          cellUpper.includes('IPHONE') ||
          cellUpper.includes('IPAD') ||
          cellUpper.includes('MACBOOK') ||
          cellUpper.includes('AIRPOD') ||
          prodUpper.includes('IPHONE') ||
          prodUpper.includes('IPAD') ||
          prodUpper.includes('MACBOOK') ||
          prodUpper.includes('AIRPOD')
        ) {
          return false;
        }
      }

      return true;
    };

    // Bottom-Up Pass 1: Mark kept rows (A row is kept if it matches filters and either is a leaf OR has any kept descendant)
    const keptIndices = new Set<number>();
    for (let i = treeRows.length - 1; i >= 0; i--) {
      const row = treeRows[i];
      if (!isRowKeptByFilters(row)) continue;

      if (!row.hasChildren) {
        // Leaf node that passed filters is directly kept
        keptIndices.add(i);
      } else {
        // Parent node is kept if at least one of its descendants is kept
        let hasAnyKeptChild = false;
        for (let j = i + 1; j < treeRows.length; j++) {
          if (treeRows[j].level <= row.level) break;
          if (keptIndices.has(j)) {
            hasAnyKeptChild = true;
            break;
          }
        }
        if (hasAnyKeptChild) {
          keptIndices.add(i);
        }
      }
    }

    const isAnyFilterActive = Boolean(
      searchTerm ||
      (selectedStaffIds.length > 0 && selectedStaffIds.length < biRevenueData.length) ||
      (selectedStaffFilters.length > 0 && selectedStaffFilters.length < uniqueStaffs.length) ||
      (selectedNganhFilters.length > 0 && selectedNganhFilters.length < uniqueNganhs.length) ||
      (selectedNhomFilters.length > 0 && selectedNhomFilters.length < uniqueNhoms.length) ||
      (selectedBrandFilters.length > 0 && selectedBrandFilters.length < uniqueBrands.length) ||
      hideApple
    );

    const filteredTreeRows: TreeRow[] = treeRows
      .filter((_, idx) => keptIndices.has(idx))
      .map(r => ({ ...r, cells: [...r.cells] }));

    // Bottom-Up Pass 2: Dynamically calculate parent values from kept direct children ONLY WHEN A FILTER IS ACTIVE!
    if (isAnyFilterActive) {
      for (let i = filteredTreeRows.length - 1; i >= 0; i--) {
        const parentRow = filteredTreeRows[i];
        if (parentRow.level >= 1 && parentRow.level <= 4) {
          const directChildren: TreeRow[] = [];
          let skippingSubtreeLevel = 999;
          for (let j = i + 1; j < filteredTreeRows.length; j++) {
            const child = filteredTreeRows[j];
            if (!child || child.level <= parentRow.level) break;
            if (child.level <= skippingSubtreeLevel) {
              directChildren.push(child);
              skippingSubtreeLevel = child.level;
            }
          }
          if (directChildren.length > 0) {
            let sumDTThuc = 0;
            let sumDTQD = 0;
            let sumSoLuong = 0;
            for (const child of directChildren) {
              sumDTThuc += parseCellNum(child.cells[1]);
              sumDTQD += parseCellNum(child.cells[2]);
              sumSoLuong += parseCellNum(child.cells[4]);
            }
            const avgDonGiaThuc = sumSoLuong > 0 ? (sumDTThuc / sumSoLuong) : 0;
            const avgHieuQuaQD = sumSoLuong > 0 ? (sumDTQD / sumSoLuong) : 0;
            parentRow.cells = [
              parentRow.cells[0],
              formatCellNum(sumDTThuc),
              formatCellNum(sumDTQD),
              formatCellNum(avgHieuQuaQD),
              formatCellNum(sumSoLuong),
              formatCellNum(avgDonGiaThuc)
            ];
          }
        }
      }
    }

    // Expand / Collapse visibility: Walks up through every enclosing ancestor row
    const isRowVisibleInTree = (row: TreeRow, indexInOriginal: number): boolean => {
      if (row.level <= 1) return true; // Level 0 (Total) and Level 1 (Staff) are always root visible
      let ancestorLevel = row.level;
      for (let j = indexInOriginal - 1; j >= 0; j--) {
        const candidate = treeRows[j];
        if (candidate && candidate.level < ancestorLevel && candidate.level > 0) {
          const parentKey = `${candidate.originalIndex}_${candidate.cells[0]}`;
          if (expandedKeys[parentKey] === false) {
            return false;
          }
          ancestorLevel = candidate.level;
          if (ancestorLevel <= 1) break;
        }
      }
      return true;
    };

    const visible = filteredTreeRows.filter(row => isRowVisibleInTree(row, row.originalIndex));

    // Dynamic Total Row Calculation
    const nonTotal = visible.filter(row => row.level !== 0);
    const tot = visible.find(row => row.level === 0) || (treeRows.find(r => r.level === 0) ? { ...treeRows.find(r => r.level === 0)!, cells: [...treeRows.find(r => r.level === 0)!.cells] } : null);
    if (tot) {
      if (isAnyFilterActive) {
        const level1Rows = nonTotal.filter(r => r.level === 1);
        const rowsToSum = level1Rows.length > 0 ? level1Rows : (nonTotal.filter(r => r.level === 2).length > 0 ? nonTotal.filter(r => r.level === 2) : nonTotal);
        let t1 = 0, t2 = 0, t4 = 0;
        for (const r of rowsToSum) {
          t1 += parseCellNum(r.cells[1]);
          t2 += parseCellNum(r.cells[2]);
          t4 += parseCellNum(r.cells[4]);
        }
        const t3 = t4 > 0 ? t2 / t4 : 0;
        const t5 = t4 > 0 ? t1 / t4 : 0;
        tot.cells = [
          tot.cells[0] || 'TỔNG',
          formatCellNum(t1),
          formatCellNum(t2),
          formatCellNum(t3),
          formatCellNum(t4),
          formatCellNum(t5)
        ];
      }
    }

    return { visibleRows: visible, totalRow: tot };
  }, [
    treeRows,
    searchTerm,
    selectedStaffIds,
    biRevenueData.length,
    selectedStaffFilters,
    selectedNganhFilters,
    selectedNhomFilters,
    selectedBrandFilters,
    hideApple,
    expandedKeys,
    uniqueStaffs.length,
    uniqueNganhs.length,
    uniqueNhoms.length,
    uniqueBrands.length
  ]);

  // 3. FAST MEMOIZED CTKTNV TABLE CALCULATION
  const ctktnvData = useMemo(() => {
    const checkedStaff = biRevenueData.filter(s => selectedStaffIds.includes(s.fullId));
    const nvNames = checkedStaff.map(s => {
      const parts = s.displayName.split(/[-–—]/).map(p => p.trim()).filter(Boolean);
      const namePart = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0] || '';
      const idPart = s.fullId || parts[0] || '';
      return `${namePart} - ${idPart}`;
    });

    const colMapping = ALL_CTKTNV_COLS.map((label, i) => {
      const grp = CTKTNV_COL_GROUPS[label] || { group: 'KHÁC', color: '#64748b' };
      return { colIdx: i, label, group: grp.group, color: grp.color };
    });

    const visCols = colMapping.filter(c => visibleCtktnvCols.includes(c.label));

    const groups: { group: string; color: string; span: number }[] = [];
    for (const col of visCols) {
      if (groups.length > 0 && groups[groups.length - 1].group === col.group) {
        groups[groups.length - 1].span++;
      } else {
        groups.push({ group: col.group, color: col.color, span: 1 });
      }
    }

    // Parse NHC rows
    const nhcRows: { name: string; dtThuc: number; dtqd: number; hieuQuaQD: number | null }[] = [];
    if (nganhhangChinhNv) {
      const lines = nganhhangChinhNv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length < 3) continue;
        const name = cols[0];
        if (!name || name.toLowerCase().startsWith('tổng') || name.toLowerCase().startsWith('total')) continue;
        const dtThuc = parseFloat(cols[1].replace(/,/g, '')) || 0;
        const dtqd = parseFloat(cols[2].replace(/,/g, '')) || 0;
        const hieuQuaQD = cols.length >= 4 ? parseFloat(cols[3].replace(/,/g, '')) || null : null;
        if (dtThuc === 0 && dtqd === 0) continue;
        nhcRows.push({ name, dtThuc, dtqd, hieuQuaQD });
      }
    }

    const findNhcData = (staffId: string, displayName: string) => {
      if (nhcRows.length === 0) return null;
      for (const r of nhcRows) {
        if (r.name.includes(staffId)) return { dtThuc: r.dtThuc, dtqd: r.dtqd, hieuQuaQD: r.hieuQuaQD };
      }
      const dn = displayName.split(' - ')[0].toLowerCase().trim();
      for (const r of nhcRows) {
        const rn = r.name.toLowerCase().trim();
        if (rn.includes(dn) || dn.includes(rn.split(/[-–—]/)[0].trim())) {
          return { dtThuc: r.dtThuc, dtqd: r.dtqd, hieuQuaQD: r.hieuQuaQD };
        }
      }
      return null;
    };

    const findGioCong = (displayName: string): number | null => {
      if (!displayName || Object.keys(gioCongData).length === 0) return null;
      const dn = displayName.toLowerCase().trim();
      for (const [key, val] of Object.entries(gioCongData)) {
        if (key.toLowerCase().trim() === dn) return val.gioCong;
      }
      for (const [key, val] of Object.entries(gioCongData)) {
        const k = key.toLowerCase().trim();
        if (dn.includes(k) || k.includes(dn)) return val.gioCong;
      }
      const namePart = displayName.split(' - ')[0].toLowerCase().trim();
      for (const [key, val] of Object.entries(gioCongData)) {
        const k = key.toLowerCase().trim();
        if (k === namePart || k.includes(namePart) || namePart.includes(k)) return val.gioCong;
      }
      return null;
    };

    const findTraChamData = (staffId: string, displayName: string) => {
      if (!parsedTraChamRows || parsedTraChamRows.length === 0) return null;
      const idClean = staffId.toLowerCase().trim();
      const nameClean = removeAccents(displayName.split(' - ')[0]).toLowerCase().trim();

      const match = parsedTraChamRows.find((row: any) => {
        const rowValClean = removeAccents(row.nhanVien || '').toLowerCase().trim();
        return (
          rowValClean.includes(idClean) ||
          rowValClean.includes(nameClean) ||
          nameClean.includes(rowValClean.split(/[-–—]/)[0].trim())
        );
      });
      if (!match) return null;

      let rawInst = match.installmentRevenue || 0;
      if (Math.abs(rawInst) >= 1000000) rawInst = rawInst / 1000000;
      return {
        dtTraCham: rawInst > 0 ? rawInst : null,
        tiTrong: match.percent !== undefined && match.percent !== null ? match.percent : null
      };
    };

    const checkIsIct = (name: string) => {
      const n = removeAccents(name || '').toLowerCase().trim();
      return (
        n.includes('smartphone') ||
        n.includes('laptop') ||
        n.includes('tablet') ||
        n.includes('may tinh bang') ||
        n.includes('dien thoai')
      );
    };

    const colTotals: number[] = new Array(visCols.length).fill(0);
    let sumDtThucAll = 0;
    let sumDtqdAll = 0;
    let sumDtTraChamAll = 0;
    let sumDtIctAll = 0;
    let sumDtPhuKienAll = 0;
    let sumDtDongHoAll = 0;

    const rows = checkedStaff.map((staff, rIdx) => {
      const name = nvNames[rIdx];
      const gc = findGioCong(name);
      const mainData = findNhcData(staff.fullId, name);
      const dtqd = mainData?.dtqd ?? null;
      const dtThuc = mainData?.dtThuc ?? null;
      const hieuQuaQD = mainData?.hieuQuaQD ?? null;

      const tgData = findTraChamData(staff.fullId, name);
      const dtTraCham = tgData?.dtTraCham ?? null;
      const tiTrongTraCham = tgData?.tiTrong ?? null;

      const idClean = staff.fullId.toLowerCase().trim();
      const nameClean = removeAccents(name.split(' - ')[0]).toLowerCase().trim();

      let dtIct = 0, hasIct = false;
      let dtPhuKien = 0, hasPk = false;
      let dtDongHo = 0, hasDh = false;
      let dtQdBaoHiemPts = 0;

      if (masterDataPts && masterDataPts.length > 0) {
        for (const d of masterDataPts) {
          if (d.brandName) continue;
          const nvClean = removeAccents(d.nvName || '').toLowerCase().trim();
          const isStaffMatch =
            nvClean.includes(idClean) || nvClean.includes(nameClean) || nameClean.includes(nvClean.split(/[-–—]/)[0].trim());
          if (!isStaffMatch) continue;

          const val = parseCellNum(d.nhomCells[1]);
          const qdVal = parseCellNum(d.nhomCells[2]);
          const nnhClean = removeAccents(d.nnhName || '').toLowerCase().trim();
          const nhomClean = removeAccents(d.nhomName || '').toLowerCase().trim();

          if (checkIsIct(d.nnhName)) {
            dtIct += val;
            hasIct = true;
          }
          if (nnhClean.includes('phu kien') || nnhClean.includes('pk')) {
            dtPhuKien += val;
            hasPk = true;
          }
          if (nnhClean.includes('dong ho') || nnhClean.includes('wearable')) {
            dtDongHo += val;
            hasDh = true;
          }
          if (
            (nhomClean.includes('dich vu bao hiem') || nhomClean.includes('4479') || nhomClean === 'bao hiem' || nnhClean.includes('dich vu bao hiem')) &&
            !nhomClean.includes('thu ho') &&
            !nhomClean.includes('4499') &&
            !nhomClean.includes('non') &&
            !nhomClean.includes('mu') &&
            !nnhClean.includes('thu ho')
          ) {
            dtQdBaoHiemPts += qdVal;
          }
        }
      }

      // 1. D.THU C.E: Tổng các dòng "NNH Điện lạnh" + "NNH Điện tử" (Level 2)
      let dtCe = 0, slCe = 0, hasCe = false;
      // 2. D.THU GIA DỤNG: Tổng các dòng "NNH Điện gia dụng" (Level 2)
      let dtGiaDung = 0, hasGiaDung = false;
      // 4. S.L ICT: Tổng số lượng "Smartphone" / "Điện thoại" (Level 3)
      let slIct = 0, hasSlIct = false;
      // 5. S.L PSDP: Tổng số lượng "Pin sạc dự phòng" (Level 3)
      let slPsdp = 0, hasSlPsdp = false;
      let slTaiNghe = 0, hasSlTaiNghe = false;
      let slCamera = 0, hasSlCamera = false;
      let slCapSac = 0, hasSlCapSac = false;
      let slLoa = 0, hasSlLoa = false;
      let slSim = 0, hasSlSim = false;
      let slVas = 0, hasSlVas = false;
      let slVasL2 = 0, hasSlVasL2 = false;
      let slDongHo = 0, hasSlDongHo = false;
      let slMln = 0, hasSlMln = false;
      let slNoiCom = 0, hasSlNoiCom = false;
      let slNoiChien = 0, hasSlNoiChien = false;
      let slBepGas = 0, hasSlBepGas = false;
      let slBepDien = 0, hasSlBepDien = false;
      let slQdh = 0, hasSlQdh = false;
      let slQuatGio = 0, hasSlQuatGio = false;
      let dtQdBaoHiemL3 = 0, hasBaoHiemL3 = false;
      let dtQdBaoHiemL2 = 0, hasBaoHiemL2 = false;
      let dtQdBaoHiemL5 = 0, hasBaoHiemL5 = false;
      let staffLevel1DtThuc: number | null = null;
      let staffLevel1Dtqd: number | null = null;
      let staffLevel1HieuQua: number | null = null;

      if (rawTreeRowsList.length > 0) {
        for (const r of rawTreeRowsList) {
          const rStaff = removeAccents(r.staffName || '').toLowerCase().trim();
          if (!rStaff) continue;
          const isStaffMatch =
            rStaff.includes(idClean) || rStaff.includes(nameClean) || nameClean.includes(rStaff.split(/[-–—]/)[0].trim());
          if (!isStaffMatch) continue;

          const c0Clean = removeAccents(r.cells[0] || '').toLowerCase().trim();
          const dtThucVal = parseCellNum(r.cells[1]);
          const dtQdVal = parseCellNum(r.cells[2]);
          const qtyVal = parseCellNum(r.cells[4]);

          // Level 1 row (Nhân viên)
          if (r.level === 1) {
            staffLevel1DtThuc = dtThucVal > 0 ? dtThucVal : null;
            staffLevel1Dtqd = dtQdVal > 0 ? dtQdVal : null;
            staffLevel1HieuQua = parseCellNum(r.cells[3]);
          }

          // CỘT "DTQĐ BẢO HIỂM" = TỔNG "Dịch Vụ Bảo Hiểm" LẤY CỘT "DTQĐ" (cells[2])
          const isDichVuBaoHiemText =
            (c0Clean.includes('dich vu bao hiem') || c0Clean.includes('4479') || c0Clean === 'bao hiem') &&
            !c0Clean.includes('thu ho') &&
            !c0Clean.includes('4499') &&
            !c0Clean.includes('non') &&
            !c0Clean.includes('mu');

          if (isDichVuBaoHiemText) {
            if (r.level === 3) {
              dtQdBaoHiemL3 += dtQdVal;
              hasBaoHiemL3 = true;
            } else if (r.level === 2) {
              dtQdBaoHiemL2 += dtQdVal;
              hasBaoHiemL2 = true;
            } else if (r.level === 5) {
              dtQdBaoHiemL5 += dtQdVal;
              hasBaoHiemL5 = true;
            }
          }

          // Level 2 rows (NNH)
          if (r.level === 2) {
            // CỘT "D.THU PHỤ KIỆN": TỔNG "NNH Phụ kiện"
            if (c0Clean.includes('phu kien') || c0Clean.includes('pk')) {
              dtPhuKien += dtThucVal;
              hasPk = true;
            }
            // CỘT "D.THU ĐỒNG HỒ": TỔNG "NNH Đồng hồ thời trang" & "NNH Wearable"
            if (c0Clean.includes('dong ho') || c0Clean.includes('wearable') || c0Clean.includes('werable')) {
              dtDongHo += dtThucVal;
              hasDh = true;
              slDongHo += qtyVal;
              hasSlDongHo = true;
            }
            // CỘT "D.THU C.E": TỔNG các dòng "NNH Điện lạnh" + "NNH Điện tử"
            if (c0Clean.includes('dien lanh') || c0Clean.includes('dien tu')) {
              dtCe += dtThucVal;
              slCe += qtyVal;
              hasCe = true;
            }
            // CỘT "D.THU GIA DỤNG": TỔNG các dòng "NNH Điện gia dụng"
            if (c0Clean.includes('dien gia dung') || (c0Clean.includes('gia dung') && !c0Clean.includes('thiet bi'))) {
              dtGiaDung += dtThucVal;
              hasGiaDung = true;
            }
            // Sim (Level 2)
            if (c0Clean.includes('sim')) {
              slSim += qtyVal;
              hasSlSim = true;
            }
            // UDDĐ / VAS (Level 2)
            if (
              c0Clean.includes('uddd') ||
              c0Clean.includes('571') ||
              c0Clean.includes('vas') ||
              c0Clean.includes('ung dung di dong')
            ) {
              slVasL2 += qtyVal;
              hasSlVasL2 = true;
            }
          }

          // Level 3 rows (Nhóm hàng)
          if (r.level === 3) {
            // CỘT "D.THU SMF" & "S.L ICT (SMF)": TỔNG "Smartphone"
            if (c0Clean.includes('smartphone') || (c0Clean.includes('dien thoai') && !c0Clean.includes('phu kien'))) {
              dtIct += dtThucVal;
              hasIct = true;
              slIct += qtyVal;
              hasSlIct = true;
            }
            // CỘT "S.L PSDP": TỔNG "Pin sạc dự phòng"
            if (
              c0Clean.includes('pin sac du phong') ||
              c0Clean.includes('sac du phong') ||
              c0Clean.includes('pin du phong') ||
              c0Clean.includes('psdp')
            ) {
              slPsdp += qtyVal;
              hasSlPsdp = true;
            }
            // Tai nghe
            if (c0Clean.includes('tai nghe')) {
              slTaiNghe += qtyVal;
              hasSlTaiNghe = true;
            }
            // Camera
            if (c0Clean.includes('camera')) {
              slCamera += qtyVal;
              hasSlCamera = true;
            }
            // Cáp sạc
            if (c0Clean.includes('cap sac') || c0Clean.includes('day sac') || c0Clean.includes('coc sac') || c0Clean.includes('adapter')) {
              slCapSac += qtyVal;
              hasSlCapSac = true;
            }
            // Loa di động
            if (c0Clean.includes('loa di dong') || c0Clean.includes('loa bluetooth') || (c0Clean.includes('loa') && !c0Clean.includes('karaoke'))) {
              slLoa += qtyVal;
              hasSlLoa = true;
            }
            // CỘT "S.L VAS": TỔNG các dòng "UDDĐ"
            if (
              c0Clean.includes('uddd') ||
              c0Clean.includes('571') ||
              c0Clean.includes('vas') ||
              c0Clean.includes('ung dung di dong') ||
              (c0Clean.includes('ung dung') && !c0Clean.includes('pc') && !c0Clean.includes('laptop')) ||
              c0Clean.includes('phan mem')
            ) {
              slVas += qtyVal;
              hasSlVas = true;
            }
            // Máy lọc nước: Tổng các dòng bắt đầu bằng chữ "Lọc nước...." hoặc "máy lọc nước"
            if (
              (c0Clean.startsWith('loc nuoc') || c0Clean.includes('loc nuoc') || c0Clean.includes('may loc nuoc')) &&
              !c0Clean.includes('loi loc') &&
              !c0Clean.includes('binh loc')
            ) {
              slMln += qtyVal;
              hasSlMln = true;
            }
            // Nồi cơm
            if (c0Clean.includes('noi com')) {
              slNoiCom += qtyVal;
              hasSlNoiCom = true;
            }
            // Nồi chiên
            if (c0Clean.includes('noi chien')) {
              slNoiChien += qtyVal;
              hasSlNoiChien = true;
            }
            // Bếp gas
            if (c0Clean.includes('bep gas') || c0Clean.includes('bep ga')) {
              slBepGas += qtyVal;
              hasSlBepGas = true;
            }
            // Bếp điện
            if (c0Clean.includes('bep dien') || c0Clean.includes('bep tu') || c0Clean.includes('bep hong ngoai')) {
              slBepDien += qtyVal;
              hasSlBepDien = true;
            }
            // Quạt điều hòa
            if (c0Clean.includes('quat dieu hoa') || c0Clean.includes('quat lam mat')) {
              slQdh += qtyVal;
              hasSlQdh = true;
            }
            // Quạt gió
            if (c0Clean.includes('quat gio') || (c0Clean.includes('quat') && !c0Clean.includes('dieu hoa') && !c0Clean.includes('lam mat') && !c0Clean.includes('suoi'))) {
              slQuatGio += qtyVal;
              hasSlQuatGio = true;
            }
          }
        }
      }

      const finalDtThuc = dtThuc ?? staffLevel1DtThuc;
      const finalDtqd = dtqd ?? staffLevel1Dtqd;
      const finalHieuQuaQD = hieuQuaQD ?? (finalDtThuc !== null && finalDtThuc > 0 && finalDtqd !== null ? (finalDtqd - finalDtThuc) / finalDtThuc : staffLevel1HieuQua);
      const dtqdPerGioCong = finalDtqd !== null && gc !== null && gc > 0 ? finalDtqd / gc : null;

      const finalDtIct = hasIct ? dtIct : null;
      const finalDtPhuKien = hasPk ? dtPhuKien : null;
      const finalDtDongHo = hasDh ? dtDongHo : null;

      const ktPkOnIct = finalDtIct !== null && finalDtIct > 0 && finalDtPhuKien !== null ? finalDtPhuKien / finalDtIct : null;
      const ktDongHoOnIct = finalDtIct !== null && finalDtIct > 0 && finalDtDongHo !== null ? finalDtDongHo / finalDtIct : null;

      // 3. CỘT "KHAI THÁC GIA DỤNG TRÊN C.E" = "D.THU GIA DỤNG" / "D.THU C.E"
      const finalDtCe = hasCe && dtCe > 0 ? dtCe : null;
      const finalDtGiaDung = hasGiaDung && dtGiaDung > 0 ? dtGiaDung : null;
      const ktGiaDungOnCe = finalDtCe !== null && finalDtCe > 0 && finalDtGiaDung !== null ? finalDtGiaDung / finalDtCe : null;

      const finalSlIct = hasSlIct && slIct > 0 ? slIct : null;
      const finalSlPsdp = hasSlPsdp && slPsdp > 0 ? slPsdp : null;
      const bkPsdpOnIct = finalSlIct !== null && finalSlIct > 0 && finalSlPsdp !== null ? finalSlPsdp / finalSlIct : null;
      const bkTaiNgheOnIct = finalSlIct !== null && finalSlIct > 0 && slTaiNghe > 0 ? slTaiNghe / finalSlIct : null;
      const bkCameraOnIct = finalSlIct !== null && finalSlIct > 0 && slCamera > 0 ? slCamera / finalSlIct : null;
      const bkCapSacOnIct = finalSlIct !== null && finalSlIct > 0 && slCapSac > 0 ? slCapSac / finalSlIct : null;
      const bkLoaOnIct = finalSlIct !== null && finalSlIct > 0 && slLoa > 0 ? slLoa / finalSlIct : null;
      const bkSimOnIct = finalSlIct !== null && finalSlIct > 0 && slSim > 0 ? slSim / finalSlIct : null;
      const finalSlVas = hasSlVas && slVas > 0 ? slVas : (hasSlVasL2 && slVasL2 > 0 ? slVasL2 : (slVas > 0 ? slVas : null));
      const bkVasOnIct = finalSlIct !== null && finalSlIct > 0 && finalSlVas !== null ? finalSlVas / finalSlIct : null;
      const bkDongHoOnIct = finalSlIct !== null && finalSlIct > 0 && slDongHo > 0 ? slDongHo / finalSlIct : null;

      const finalSlCe = hasCe && slCe > 0 ? slCe : (masterDataPts.length > 0 ? masterDataPts.filter(p => {
        const pStaff = removeAccents(p.nvName).toLowerCase();
        const pNnh = removeAccents(p.nnhName).toLowerCase();
        return (pStaff.includes(idClean) || pStaff.includes(nameClean)) && (pNnh.includes('dien lanh') || pNnh.includes('dien tu'));
      }).reduce((acc, cur) => acc + parseCellNum(cur.nhomCells[4]), 0) : null);

      const bkMlnOnCe = finalSlCe !== null && finalSlCe > 0 && slMln > 0 ? slMln / finalSlCe : null;
      const bkNoiComOnCe = finalSlCe !== null && finalSlCe > 0 && slNoiCom > 0 ? slNoiCom / finalSlCe : null;
      const bkNoiChienOnCe = finalSlCe !== null && finalSlCe > 0 && slNoiChien > 0 ? slNoiChien / finalSlCe : null;
      const bkBepGasOnCe = finalSlCe !== null && finalSlCe > 0 && slBepGas > 0 ? slBepGas / finalSlCe : null;
      const bkBepDienOnCe = finalSlCe !== null && finalSlCe > 0 && slBepDien > 0 ? slBepDien / finalSlCe : null;
      const bkQdhOnCe = finalSlCe !== null && finalSlCe > 0 && slQdh > 0 ? slQdh / finalSlCe : null;
      const bkQuatGioOnCe = finalSlCe !== null && finalSlCe > 0 && slQuatGio > 0 ? slQuatGio / finalSlCe : null;

      const dtQdBaoHiem = hasBaoHiemL3
        ? dtQdBaoHiemL3
        : hasBaoHiemL2
        ? dtQdBaoHiemL2
        : hasBaoHiemL5
        ? dtQdBaoHiemL5
        : dtQdBaoHiemPts;

      const tiTrongBaoHiem =
        finalDtqd !== null && finalDtqd > 0 && dtQdBaoHiem > 0
          ? (dtQdBaoHiem / finalDtqd) * 100
          : finalDtThuc !== null && finalDtThuc > 0 && dtQdBaoHiem > 0
          ? (dtQdBaoHiem / finalDtThuc) * 100
          : null;

      if (finalDtThuc !== null) sumDtThucAll += finalDtThuc;
      if (finalDtqd !== null) sumDtqdAll += finalDtqd;
      if (dtTraCham !== null && dtTraCham > 0) sumDtTraChamAll += dtTraCham;
      if (finalDtIct !== null && finalDtIct > 0) sumDtIctAll += finalDtIct;
      if (finalDtPhuKien !== null && finalDtPhuKien > 0) sumDtPhuKienAll += finalDtPhuKien;
      if (finalDtDongHo !== null && finalDtDongHo > 0) sumDtDongHoAll += finalDtDongHo;

      const cellVals = visCols.map((col, cIdx) => {
        let cellVal = '-';
        if (col.label === 'GIỜ CÔNG' && gc !== null) {
          cellVal = fNum(gc);
          colTotals[cIdx] += gc;
        } else if (col.label === 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG' && dtqdPerGioCong !== null) {
          cellVal = fNum(dtqdPerGioCong);
          colTotals[cIdx] += dtqdPerGioCong;
        } else if (col.label === 'D.THU THỰC' && finalDtThuc !== null) {
          cellVal = fNum(finalDtThuc);
          colTotals[cIdx] += finalDtThuc;
        } else if (col.label === 'D.THU QUY ĐỔI' && finalDtqd !== null) {
          cellVal = fNum(finalDtqd);
          colTotals[cIdx] += finalDtqd;
        } else if (col.label === 'HIỆU QUẢ QUY ĐỔI' && finalHieuQuaQD !== null) {
          cellVal = `${(finalHieuQuaQD * 100).toFixed(0)}%`;
          colTotals[cIdx] += finalHieuQuaQD;
        } else if (col.label === 'D.THU TRẢ CHẬM' && dtTraCham !== null && dtTraCham > 0) {
          cellVal = fNum(dtTraCham);
          colTotals[cIdx] += dtTraCham;
        } else if (col.label === 'TỈ TRỌNG TRẢ CHẬM' && tiTrongTraCham !== null && tiTrongTraCham > 0) {
          cellVal = `${tiTrongTraCham.toFixed(0)}%`;
          colTotals[cIdx] += tiTrongTraCham;
        } else if ((col.label === 'D.THU SMF' || col.label === 'D.THU ICT') && finalDtIct !== null && finalDtIct > 0) {
          cellVal = fNum(finalDtIct);
          colTotals[cIdx] += finalDtIct;
        } else if (col.label === 'D.THU PHỤ KIỆN' && finalDtPhuKien !== null && finalDtPhuKien > 0) {
          cellVal = fNum(finalDtPhuKien);
          colTotals[cIdx] += finalDtPhuKien;
        } else if (col.label === 'KHAI THÁC PHỤ KIỆN TRÊN ICT' && ktPkOnIct !== null) {
          cellVal = `${(ktPkOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += ktPkOnIct;
        } else if (col.label === 'D.THU ĐỒNG HỒ' && finalDtDongHo !== null && finalDtDongHo > 0) {
          cellVal = fNum(finalDtDongHo);
          colTotals[cIdx] += finalDtDongHo;
        } else if (col.label === 'KHAI THÁC ĐỒNG HỒ TRÊN ICT' && ktDongHoOnIct !== null) {
          cellVal = `${(ktDongHoOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += ktDongHoOnIct;
        } else if (col.label === 'D.THU C.E' && finalDtCe !== null && finalDtCe > 0) {
          cellVal = fNum(finalDtCe);
          colTotals[cIdx] += finalDtCe;
        } else if (col.label === 'D.THU GIA DỤNG' && finalDtGiaDung !== null && finalDtGiaDung > 0) {
          cellVal = fNum(finalDtGiaDung);
          colTotals[cIdx] += finalDtGiaDung;
        } else if (col.label === 'KHAI THÁC GIA DỤNG TRÊN C.E' && ktGiaDungOnCe !== null) {
          cellVal = `${(ktGiaDungOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += ktGiaDungOnCe;
        } else if (col.label === 'S.L ICT (SMF)' && finalSlIct !== null && finalSlIct > 0) {
          cellVal = fNum(finalSlIct);
          colTotals[cIdx] += finalSlIct;
        } else if (col.label === 'S.L PSDP' && finalSlPsdp !== null && finalSlPsdp > 0) {
          cellVal = fNum(finalSlPsdp);
          colTotals[cIdx] += finalSlPsdp;
        } else if (col.label === 'BÁN KÈM PSDP TRÊN ICT' && bkPsdpOnIct !== null) {
          cellVal = `${(bkPsdpOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkPsdpOnIct;
        } else if (col.label === 'S.L TAI NGHE' && slTaiNghe > 0) {
          cellVal = fNum(slTaiNghe);
          colTotals[cIdx] += slTaiNghe;
        } else if (col.label === 'BÁN KÈM TAI NGHE TRÊN ICT' && bkTaiNgheOnIct !== null) {
          cellVal = `${(bkTaiNgheOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkTaiNgheOnIct;
        } else if (col.label === 'S.L CAMERA' && slCamera > 0) {
          cellVal = fNum(slCamera);
          colTotals[cIdx] += slCamera;
        } else if (col.label === 'BÁN KÈM CAMERA TRÊN ICT' && bkCameraOnIct !== null) {
          cellVal = `${(bkCameraOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkCameraOnIct;
        } else if (col.label === 'S.L CÁP SẠC' && slCapSac > 0) {
          cellVal = fNum(slCapSac);
          colTotals[cIdx] += slCapSac;
        } else if (col.label === 'BÁN KÈM CÁP SẠC TRÊN ICT' && bkCapSacOnIct !== null) {
          cellVal = `${(bkCapSacOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkCapSacOnIct;
        } else if (col.label === 'S.L LOA DI ĐỘNG' && slLoa > 0) {
          cellVal = fNum(slLoa);
          colTotals[cIdx] += slLoa;
        } else if (col.label === 'BÁN KÈM LOA DI ĐỘNG TRÊN ICT' && bkLoaOnIct !== null) {
          cellVal = `${(bkLoaOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkLoaOnIct;
        } else if (col.label === 'S.L SIM' && slSim > 0) {
          cellVal = fNum(slSim);
          colTotals[cIdx] += slSim;
        } else if (col.label === 'BÁN KÈM SIM TRÊN ICT' && bkSimOnIct !== null) {
          cellVal = `${(bkSimOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkSimOnIct;
        } else if ((col.label === 'S.L VAS' || col.label === 'S.L ỨNG DỤNG') && finalSlVas !== null && finalSlVas > 0) {
          cellVal = fNum(finalSlVas);
          colTotals[cIdx] += finalSlVas;
        } else if ((col.label === 'BÁN KÈM VAS TRÊN ICT' || col.label === 'BÁN KÈM ỨNG DỤNG TRÊN ICT') && bkVasOnIct !== null) {
          cellVal = `${(bkVasOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkVasOnIct;
        } else if (col.label === 'S.L ĐỒNG HỒ' && slDongHo > 0) {
          cellVal = fNum(slDongHo);
          colTotals[cIdx] += slDongHo;
        } else if (col.label === 'BÁN KÈM ĐỒNG HỒ TRÊN ICT' && bkDongHoOnIct !== null) {
          cellVal = `${(bkDongHoOnIct * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkDongHoOnIct;
        } else if (col.label === 'S.L CE' && finalSlCe !== null && finalSlCe > 0) {
          cellVal = fNum(finalSlCe);
          colTotals[cIdx] += finalSlCe;
        } else if (col.label === 'S.L MÁY LỌC NƯỚC' && slMln > 0) {
          cellVal = fNum(slMln);
          colTotals[cIdx] += slMln;
        } else if (col.label === 'BÁN KÈM MLN TRÊN C.E' && bkMlnOnCe !== null) {
          cellVal = `${(bkMlnOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkMlnOnCe;
        } else if (col.label === 'S.L NỒI CƠM' && slNoiCom > 0) {
          cellVal = fNum(slNoiCom);
          colTotals[cIdx] += slNoiCom;
        } else if (col.label === 'BÁN KÈM NỒI CƠM TRÊN C.E' && bkNoiComOnCe !== null) {
          cellVal = `${(bkNoiComOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkNoiComOnCe;
        } else if (col.label === 'S.L NỒI CHIÊN' && slNoiChien > 0) {
          cellVal = fNum(slNoiChien);
          colTotals[cIdx] += slNoiChien;
        } else if (col.label === 'BÁN KÈM NỒI CHIÊN TRÊN C.E' && bkNoiChienOnCe !== null) {
          cellVal = `${(bkNoiChienOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkNoiChienOnCe;
        } else if (col.label === 'S.L BẾP GAS' && slBepGas > 0) {
          cellVal = fNum(slBepGas);
          colTotals[cIdx] += slBepGas;
        } else if (col.label === 'BÁN KÈM BẾP GAS TRÊN C.E' && bkBepGasOnCe !== null) {
          cellVal = `${(bkBepGasOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkBepGasOnCe;
        } else if (col.label === 'S.L BẾP ĐIỆN' && slBepDien > 0) {
          cellVal = fNum(slBepDien);
          colTotals[cIdx] += slBepDien;
        } else if (col.label === 'BÁN KÈM BẾP ĐIỆN TRÊN C.E' && bkBepDienOnCe !== null) {
          cellVal = `${(bkBepDienOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkBepDienOnCe;
        } else if (col.label === 'S.L QUẠT ĐIỀU HÒA' && slQdh > 0) {
          cellVal = fNum(slQdh);
          colTotals[cIdx] += slQdh;
        } else if (col.label === 'BÁN KÈM QĐH TRÊN C.E' && bkQdhOnCe !== null) {
          cellVal = `${(bkQdhOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkQdhOnCe;
        } else if (col.label === 'S.L QUẠT GIÓ' && slQuatGio > 0) {
          cellVal = fNum(slQuatGio);
          colTotals[cIdx] += slQuatGio;
        } else if (col.label === 'BÁN KÈM QUẠT GIÓ TRÊN C.E' && bkQuatGioOnCe !== null) {
          cellVal = `${(bkQuatGioOnCe * 100).toFixed(0)}%`;
          colTotals[cIdx] += bkQuatGioOnCe;
        } else if (col.label === 'TỔNG DTQĐ' && finalDtqd !== null && finalDtqd > 0) {
          cellVal = fNum(finalDtqd);
          colTotals[cIdx] += finalDtqd;
        } else if (col.label === 'DTQĐ BẢO HIỂM' && dtQdBaoHiem > 0) {
          cellVal = fNum(dtQdBaoHiem);
          colTotals[cIdx] += dtQdBaoHiem;
        } else if ((col.label === 'TỈ TRỌNG BẢO HIỂM TRÊN D.T' || col.label.includes('TỈ TRỌNG BẢO HIỂM')) && tiTrongBaoHiem !== null) {
          cellVal = `${tiTrongBaoHiem.toFixed(0)}%`;
          colTotals[cIdx] += tiTrongBaoHiem;
        }
        return cellVal;
      });

      return {
        name,
        cells: cellVals,
        gc,
        finalDtqd,
        finalDtThuc,
        dtTraCham,
        dtIct,
        dtPhuKien,
        dtDongHo,
        dtCe,
        dtGiaDung,
        slIct,
        slPsdp,
        slTaiNghe,
        slCamera,
        slCapSac,
        slLoa,
        slSim,
        slVas: finalSlVas,
        slUngDung: finalSlVas,
        slDongHo,
        slCe: finalSlCe,
        slMln,
        slNoiCom,
        slNoiChien,
        slBepGas,
        slBepDien,
        slQdh,
        slQuatGio,
        dtQdBaoHiem
      };
    });

    return {
      nvNames,
      visCols,
      groups,
      rows,
      colTotals,
      sumDtThucAll,
      sumDtqdAll,
      sumDtTraChamAll,
      sumDtIctAll,
      sumDtPhuKienAll,
      sumDtDongHoAll
    };
  }, [
    biRevenueData,
    selectedStaffIds,
    nganhhangChinhNv,
    parsedTraChamRows,
    gioCongData,
    visibleCtktnvCols,
    masterDataPts,
    rawTreeRowsList
  ]);

  // CTKTNV Staff Column Filter state
  const [selectedCtktnvStaffs, setSelectedCtktnvStaffs] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('gtdh_ctktnv_staff_filter');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gtdh_ctktnv_staff_filter', JSON.stringify(selectedCtktnvStaffs));
    } catch (e) {}
  }, [selectedCtktnvStaffs]);

  const allCtktnvStaffNames = useMemo(() => {
    return ctktnvData.rows.map(r => r.name);
  }, [ctktnvData.rows]);

  const filteredCtktnvRows = useMemo(() => {
    if (selectedCtktnvStaffs.length === 0) return ctktnvData.rows;
    if (selectedCtktnvStaffs.length === 1 && selectedCtktnvStaffs[0] === '__EMPTY__') return [];
    return ctktnvData.rows.filter(r => selectedCtktnvStaffs.includes(r.name));
  }, [ctktnvData.rows, selectedCtktnvStaffs]);

  const getYesterdayFormattedDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const ctktnvTotals = useMemo(() => {
    const colTotals = new Array(ctktnvData.visCols.length).fill(0);
    let sumGioCong = 0;
    let sumDtThuc = 0;
    let sumDtQd = 0;
    let sumDtTraCham = 0;
    let sumDtIct = 0;
    let sumDtPhuKien = 0;
    let sumDtDongHo = 0;
    let sumDtCe = 0;
    let sumDtGiaDung = 0;
    let sumSlIct = 0;
    let sumSlPsdp = 0;
    let sumSlTaiNghe = 0;
    let sumSlCamera = 0;
    let sumSlCapSac = 0;
    let sumSlLoa = 0;
    let sumSlSim = 0;
    let sumSlVas = 0;
    let sumSlDongHo = 0;
    let sumSlCe = 0;
    let sumSlMln = 0;
    let sumSlNoiCom = 0;
    let sumSlNoiChien = 0;
    let sumSlBepGas = 0;
    let sumSlBepDien = 0;
    let sumSlQdh = 0;
    let sumSlQuatGio = 0;
    let sumDtQdBaoHiem = 0;

    for (const row of filteredCtktnvRows) {
      // Direct reliable metric aggregation from row entity
      if (row.gc && row.gc > 0) sumGioCong += row.gc;
      if (row.finalDtThuc && row.finalDtThuc > 0) sumDtThuc += row.finalDtThuc;
      if (row.finalDtqd && row.finalDtqd > 0) sumDtQd += row.finalDtqd;
      if (row.dtTraCham && row.dtTraCham > 0) sumDtTraCham += row.dtTraCham;
      if (row.dtIct && row.dtIct > 0) sumDtIct += row.dtIct;
      if (row.dtPhuKien && row.dtPhuKien > 0) sumDtPhuKien += row.dtPhuKien;
      if (row.dtDongHo && row.dtDongHo > 0) sumDtDongHo += row.dtDongHo;
      if (row.dtCe && row.dtCe > 0) sumDtCe += row.dtCe;
      if (row.dtGiaDung && row.dtGiaDung > 0) sumDtGiaDung += row.dtGiaDung;
      if (row.slIct && row.slIct > 0) sumSlIct += row.slIct;
      if (row.slPsdp && row.slPsdp > 0) sumSlPsdp += row.slPsdp;
      if (row.slTaiNghe && row.slTaiNghe > 0) sumSlTaiNghe += row.slTaiNghe;
      if (row.slCamera && row.slCamera > 0) sumSlCamera += row.slCamera;
      if (row.slCapSac && row.slCapSac > 0) sumSlCapSac += row.slCapSac;
      if (row.slLoa && row.slLoa > 0) sumSlLoa += row.slLoa;
      if (row.slSim && row.slSim > 0) sumSlSim += row.slSim;
      if ((row.slVas && row.slVas > 0) || (row.slUngDung && row.slUngDung > 0)) {
        sumSlVas += (row.slVas || row.slUngDung || 0);
      }
      if (row.slDongHo && row.slDongHo > 0) sumSlDongHo += row.slDongHo;
      if (row.slCe && row.slCe > 0) sumSlCe += row.slCe;
      if (row.slMln && row.slMln > 0) sumSlMln += row.slMln;
      if (row.slNoiCom && row.slNoiCom > 0) sumSlNoiCom += row.slNoiCom;
      if (row.slNoiChien && row.slNoiChien > 0) sumSlNoiChien += row.slNoiChien;
      if (row.slBepGas && row.slBepGas > 0) sumSlBepGas += row.slBepGas;
      if (row.slBepDien && row.slBepDien > 0) sumSlBepDien += row.slBepDien;
      if (row.slQdh && row.slQdh > 0) sumSlQdh += row.slQdh;
      if (row.slQuatGio && row.slQuatGio > 0) sumSlQuatGio += row.slQuatGio;
      if (row.dtQdBaoHiem && row.dtQdBaoHiem > 0) sumDtQdBaoHiem += row.dtQdBaoHiem;

      row.cells.forEach((val, cIdx) => {
        const num = parseCellNum(val);
        const col = ctktnvData.visCols[cIdx];
        if (col) {
          const isRatioCol =
            col.label.includes('%') ||
            col.label.startsWith('HIỆU QUẢ') ||
            col.label.startsWith('TỈ TRỌNG') ||
            col.label.startsWith('KHAI THÁC') ||
            col.label.startsWith('BÁN KÈM') ||
            col.label === 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG';

          if (!isRatioCol) {
            colTotals[cIdx] += num;
          }
        }
      });
    }

    const colTotalPctValues: (number | null)[] = ctktnvData.visCols.map((col) => {
      if (col.label === 'HIỆU QUẢ QUY ĐỔI') {
        return sumDtThuc > 0 ? ((sumDtQd - sumDtThuc) / sumDtThuc) * 100 : null;
      }
      if (col.label === 'TỈ TRỌNG TRẢ CHẬM') {
        return sumDtThuc > 0 && sumDtTraCham > 0 ? (sumDtTraCham / sumDtThuc) * 100 : null;
      }
      if (col.label === 'KHAI THÁC PHỤ KIỆN TRÊN ICT') {
        return sumDtIct > 0 && sumDtPhuKien > 0 ? (sumDtPhuKien / sumDtIct) * 100 : null;
      }
      if (col.label === 'KHAI THÁC ĐỒNG HỒ TRÊN ICT') {
        return sumDtIct > 0 && sumDtDongHo > 0 ? (sumDtDongHo / sumDtIct) * 100 : null;
      }
      if (col.label === 'KHAI THÁC GIA DỤNG TRÊN C.E') {
        return sumDtCe > 0 && sumDtGiaDung > 0 ? (sumDtGiaDung / sumDtCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM PSDP TRÊN ICT') {
        return sumSlIct > 0 && sumSlPsdp > 0 ? (sumSlPsdp / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM TAI NGHE TRÊN ICT') {
        return sumSlIct > 0 && sumSlTaiNghe > 0 ? (sumSlTaiNghe / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM CAMERA TRÊN ICT') {
        return sumSlIct > 0 && sumSlCamera > 0 ? (sumSlCamera / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM CÁP SẠC TRÊN ICT') {
        return sumSlIct > 0 && sumSlCapSac > 0 ? (sumSlCapSac / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM LOA DI ĐỘNG TRÊN ICT') {
        return sumSlIct > 0 && sumSlLoa > 0 ? (sumSlLoa / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM SIM TRÊN ICT') {
        return sumSlIct > 0 && sumSlSim > 0 ? (sumSlSim / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM VAS TRÊN ICT' || col.label === 'BÁN KÈM ỨNG DỤNG TRÊN ICT') {
        return sumSlIct > 0 && sumSlVas > 0 ? (sumSlVas / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM ĐỒNG HỒ TRÊN ICT') {
        return sumSlIct > 0 && sumSlDongHo > 0 ? (sumSlDongHo / sumSlIct) * 100 : null;
      }
      if (col.label === 'BÁN KÈM MLN TRÊN C.E') {
        return sumSlCe > 0 && sumSlMln > 0 ? (sumSlMln / sumSlCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM NỒI CƠM TRÊN C.E') {
        return sumSlCe > 0 && sumSlNoiCom > 0 ? (sumSlNoiCom / sumSlCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM NỒI CHIÊN TRÊN C.E') {
        return sumSlCe > 0 && sumSlNoiChien > 0 ? (sumSlNoiChien / sumSlCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM BẾP GAS TRÊN C.E') {
        return sumSlCe > 0 && sumSlBepGas > 0 ? (sumSlBepGas / sumSlCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM BẾP ĐIỆN TRÊN C.E') {
        return sumSlCe > 0 && sumSlBepDien > 0 ? (sumSlBepDien / sumSlCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM QĐH TRÊN C.E') {
        return sumSlCe > 0 && sumSlQdh > 0 ? (sumSlQdh / sumSlCe) * 100 : null;
      }
      if (col.label === 'BÁN KÈM QUẠT GIÓ TRÊN C.E') {
        return sumSlCe > 0 && sumSlQuatGio > 0 ? (sumSlQuatGio / sumSlCe) * 100 : null;
      }
      if (col.label.includes('TỈ TRỌNG BẢO HIỂM')) {
        if (sumDtQd > 0 && sumDtQdBaoHiem > 0) return (sumDtQdBaoHiem / sumDtQd) * 100;
        if (sumDtThuc > 0 && sumDtQdBaoHiem > 0) return (sumDtQdBaoHiem / sumDtThuc) * 100;
        return null;
      }
      return null;
    });

    const totalDtqdPerGc = sumGioCong > 0 && sumDtQd > 0 ? (sumDtQd / sumGioCong) : null;

    return {
      colTotals,
      colTotalPctValues,
      totalDtqdPerGc,
      sumGioCong,
      sumDtThuc,
      sumDtQd,
      sumDtTraCham,
      sumDtIct,
      sumDtPhuKien,
      sumDtDongHo,
      sumDtCe,
      sumDtGiaDung,
      sumSlIct,
      sumSlPsdp,
      sumSlTaiNghe,
      sumSlCamera,
      sumSlCapSac,
      sumSlLoa,
      sumSlSim,
      sumSlVas,
      sumSlUngDung: sumSlVas,
      sumSlDongHo,
      sumSlCe,
      sumSlMln,
      sumSlNoiCom,
      sumSlNoiChien,
      sumSlBepGas,
      sumSlBepDien,
      sumSlQdh,
      sumSlQuatGio,
      sumDtQdBaoHiem
    };
  }, [filteredCtktnvRows, ctktnvData.visCols]);

  const handleCaptureGiaTriDh = async () => {
    if (!captureGiaTriDhRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureGiaTriDhRef.current);
      onPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing gia tri dh board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureCtktnv = async () => {
    if (!captureCtktnvRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureElementHelper(captureCtktnvRef.current);
      onPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing ctktnv board:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentTemplate, setCommentTemplate] = useState<1 | 2 | 3>(1);
  const [commentText, setCommentText] = useState('');
  const [copiedComment, setCopiedComment] = useState(false);

  const generateCtktnvComment = (template: 1 | 2 | 3 = 1): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const total = filteredCtktnvRows.length;
    if (total === 0) return '';

    const sortedStaff = [...filteredCtktnvRows];
    const topCount = Math.min(5, Math.max(2, Math.round(total * 0.2)));
    const topList = sortedStaff.slice(0, topCount);
    const bottomList = sortedStaff.slice(-topCount);

    const avgDtqdPerGc = ctktnvTotals.totalDtqdPerGc || 0;
    const goodStaffCount = sortedStaff.filter(r => {
      const gc = r.gc || 0;
      const qd = r.finalDtqd || 0;
      const rate = gc > 0 ? qd / gc : 0;
      return avgDtqdPerGc > 0 ? rate >= avgDtqdPerGc : qd > 0;
    }).length;

    let text = '';

    if (template === 1) {
      // MẪU 1: TOP/BOT NV
      text = `📊 TỔNG HỢP GIÁ TRỊ ĐƠN HÀNG NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📈 KẾT QUẢ TỔNG QUAN:\n`;
      text += `🎯 Tổng NV: ${total} || ĐẠT trên 50%: ${goodStaffCount}/${total}\n\n`;
      text += `🏆 TOP ${topList.length} DẪN ĐẦU:\n`;
      topList.forEach((s, i) => {
        const staffId = s.name.split(' - ')[1] || s.name.split(' - ')[0];
        text += `🔺 #${i + 1}. @${staffId}\n`;
      });
      text += `\n⚠️ BOTTOM ${bottomList.length} CẦN TĂNG TỐC:\n`;
      bottomList.forEach((s, i) => {
        const staffId = s.name.split(' - ')[1] || s.name.split(' - ')[0];
        text += `🔻 #${total - bottomList.length + i + 1}. @${staffId}\n`;
      });
      text += `\n💪 Hãy cố gắng bứt phá trong các ngày còn lại! 🔥`;
    } else if (template === 2) {
      // MẪU 2: DS CẦN TĂNG TỐC
      const belowAvgList = sortedStaff.filter(r => {
        const gc = r.gc || 0;
        const qd = r.finalDtqd || 0;
        const rate = gc > 0 ? qd / gc : 0;
        return avgDtqdPerGc > 0 ? rate < avgDtqdPerGc : false;
      });
      text = `⚠️ DS CẦN TĂNG TỐC GIÁ TRỊ ĐƠN HÀNG - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📊 Tổng NV dưới chuẩn trung bình: ${belowAvgList.length}/${total}\n\n`;
      text += `🚨 DANH SÁCH CẦN CẢI THIỆN TIẾN ĐỘ:\n`;
      belowAvgList.forEach((s, i) => {
        const staffId = s.name.split(' - ')[1] || s.name.split(' - ')[0];
        text += `🔻 #${i + 1}. @${staffId}\n`;
      });
      text += `\n💡 Cần hỗ trợ các NV trên đẩy mạnh bán hàng và tăng cường tư vấn!`;
    } else {
      // MẪU 3: TÓM TẮT
      text = `📝 TÓM TẮT GIÁ TRỊ ĐƠN HÀNG NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🎯 Tổng NV: ${total}\n`;
      text += `⚡ Tổng DTQĐ: ${ctktnvTotals.sumDtQd ? fNum(ctktnvTotals.sumDtQd) : '0'} Tr\n`;
      text += `⏰ Tổng Giờ công: ${ctktnvTotals.sumGioCong ? ctktnvTotals.sumGioCong.toFixed(1) : '0'} h\n`;
      text += `🔥 Năng suất TB: ${avgDtqdPerGc > 0 ? avgDtqdPerGc.toFixed(1) : '-'} DTQĐ/Giờ công\n\n`;
      text += `📊 CHI TIẾT TỪNG NHÂN VIÊN:\n`;
      sortedStaff.forEach((s, i) => {
        const staffId = s.name.split(' - ')[1] || s.name.split(' - ')[0];
        const gc = s.gc || 0;
        const qd = s.finalDtqd || 0;
        const rate = gc > 0 ? (qd / gc).toFixed(1) : '-';
        const isGood = avgDtqdPerGc > 0 && (gc > 0 ? qd / gc >= avgDtqdPerGc : false);
        const icon = isGood ? '✅' : '🔴';
        text += `${icon} #${i + 1}. @${staffId} (${rate} DTQĐ/GC)\n`;
      });
    }

    setCommentText(text);
    setCommentTemplate(template);
    setCopiedComment(false);
    return text;
  };

  const nonTotalRows = useMemo(() => visibleRows.filter(row => row.level !== 0), [visibleRows]);

  return (
    <motion.div
      key="GIA_TRI_DH"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/20 rounded-[28px] sm:rounded-[36px] p-3.5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100/90 max-w-full mx-auto w-full relative overflow-hidden space-y-6"
    >
      {renderLoadingOverlay && renderLoadingOverlay()}

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 flex-shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h2
              style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', var(--font-sans), Inter, sans-serif" }}
              className="text-2xl sm:text-4xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent uppercase tracking-tight font-black"
            >
              GIÁ TRỊ ĐƠN HÀNG
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Theo dõi doanh thu, số lượng và hiệu quả theo 4 cấp ngành hàng chính
            </p>
          </div>
        </div>

        {/* Quick Bookmarklet Draggable Link Button in Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={BOOKMARKLET_AUTO_COPY_5_CAP}
            draggable={true}
            title="⚡ AUTO COPY N.HÀNG CHÍNH"
            onDragStart={(e) => {
              const bookmarkTitle = '⚡ AUTO COPY N.HÀNG CHÍNH';
              const url = BOOKMARKLET_AUTO_COPY_5_CAP;
              try { e.dataTransfer.clearData(); } catch (err) {}
              try { e.dataTransfer.setData('text/x-moz-url', `${url}\n${bookmarkTitle}`); } catch (err) {}
              try { e.dataTransfer.setData('text/x-moz-url-data', url); } catch (err) {}
              try { e.dataTransfer.setData('text/x-moz-url-desc', bookmarkTitle); } catch (err) {}
              try { e.dataTransfer.setData('text/uri-list', url); } catch (err) {}
              try { e.dataTransfer.setData('text/html', `<a href="${url}">${bookmarkTitle}</a>`); } catch (err) {}
              try { e.dataTransfer.setData('text/plain', `${url}\n${bookmarkTitle}`); } catch (err) {}
            }}
            onClick={(e) => {
              e.preventDefault();
              setShowBookmarkModal(true);
            }}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/25 border border-white/30 transition-all hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing select-none"
          >
            ⚡ AUTO COPY N.HÀNG CHÍNH
          </a>
        </div>
      </div>

      {/* 2 DATA UPDATE BLOCKS (DATA N.HÀNG CHÍNH NV & FILE EXCEL GIỜ CÔNG) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* CARD 1: DATA N.HÀNG CHÍNH NV */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col space-y-3.5">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-blue-600 stroke-[2.5]" />
              <span className="text-xs sm:text-[14px] font-black text-slate-800 tracking-wide uppercase">
                DATA N.HÀNG CHÍNH NV
              </span>
            </div>
            <div className="flex items-center gap-2">
              {dataUpdatedTime && (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50/80 border border-blue-200/90 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock size={12} className="text-blue-600 stroke-[2.5]" />
                  Cập nhật: {dataUpdatedTime}
                </span>
              )}
              <span className="text-[11px] font-black text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                {dataLineCount} dòng
              </span>
            </div>
          </div>

          {/* Locked / Editing Container */}
          {!isEditingData && dataLineCount > 0 ? (
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-blue-200 bg-blue-50/60 transition-all">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Lock size={16} className="text-blue-600 stroke-[2.5]" />
                <span className="text-xs sm:text-[13.5px] font-bold text-blue-950 truncate">
                  Đã khóa dữ liệu DATA N.HÀNG CHÍNH NV ({dataLineCount} dòng)
                </span>
              </div>
              <button
                onClick={() => {
                  setTempDataVal(nganhhangChinhNv);
                  setIsEditingData(true);
                }}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Unlock size={14} className="stroke-[2.5]" />
                Mở dán mới
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                <Info size={14} className="text-amber-600 shrink-0" />
                <span>Dán toàn bộ dữ liệu báo cáo CHI TIẾT NGÀNH HÀNG CHÍNH NV từ BI (Ctrl+V):</span>
              </div>
              <textarea
                value={tempDataVal}
                onChange={(e) => setTempDataVal(e.target.value)}
                placeholder="Dán dữ liệu báo cáo từ Excel/BI (Ctrl+V)..."
                rows={4}
                autoFocus
                className="w-full p-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono text-slate-800 outline-none resize-y"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDataBlock}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer active:scale-95 transition-all"
                  >
                    <Check size={14} className="stroke-[3]" /> Lưu & Khóa
                  </button>
                  <button
                    onClick={handleAutoPasteNganhHangChinh}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer active:scale-95 transition-all"
                  >
                    <RefreshCw size={13} /> Cập nhật Data
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {nganhhangChinhNv && (
                    <button
                      onClick={() => {
                        setTempDataVal(nganhhangChinhNv);
                        setIsEditingData(false);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                    >
                      <X size={13} /> Đóng
                    </button>
                  )}
                  {nganhhangChinhNv && (
                    <button
                      onClick={handleClearAllData}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: FILE EXCEL GIỜ CÔNG */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col space-y-3.5">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-600 stroke-[2.5]" />
              <span className="text-xs sm:text-[14px] font-black text-slate-800 tracking-wide uppercase">
                FILE EXCEL GIỜ CÔNG
              </span>
              <a
                href="https://baocao.dienmayxanh.com/dashboard/timekeeping"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 ml-1"
                title="Mở Báo cáo Chấm công (baocao.dienmayxanh.com)"
              >
                <span>Mở link lấy file</span>
                <ExternalLink size={12} className="stroke-[2.5]" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              {gioCongUpdatedTime && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200/90 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock size={12} className="text-emerald-600 stroke-[2.5]" />
                  Cập nhật: {gioCongUpdatedTime}
                </span>
              )}
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                {gioCongStaffCount > 0 ? `${gioCongStaffCount} nhân viên` : 'Chưa có file'}
              </span>
            </div>
          </div>

          {/* Locked / Editing Container */}
          {!isEditingGioCong && gioCongFileName ? (
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 transition-all">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Lock size={16} className="text-emerald-600 stroke-[2.5]" />
                <span className="text-xs sm:text-[13.5px] font-bold text-emerald-950 truncate">
                  Đã khóa file Excel Giờ công: {gioCongFileName} ({gioCongStaffCount} NV)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsEditingGioCong(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Unlock size={14} className="stroke-[2.5]" />
                  Chọn file khác
                </button>
                <button
                  onClick={clearGioCongData}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                  title="Xóa file giờ công"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Info size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Nạp file Excel chấm công (.xlsx / .xls) tải từ{' '}
                  <a
                    href="https://baocao.dienmayxanh.com/dashboard/timekeeping"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 underline font-black inline-flex items-center gap-0.5"
                  >
                    baocao.dienmayxanh.com <ExternalLink size={11} className="stroke-[2.5]" />
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm active:scale-95 transition-all">
                  <Upload size={14} className="stroke-[3]" /> Chọn file .xlsx
                  <input type="file" accept=".xlsx,.xls" onChange={handleGioCongUpload} className="hidden" />
                </label>
                {gioCongFileName && (
                  <button
                    onClick={() => setIsEditingGioCong(false)}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <X size={13} /> Đóng
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {headers.length === 0 ? (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-8 text-center space-y-3 max-w-lg mx-auto my-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Info size={24} />
          </div>
          <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Chưa có dữ liệu chi tiết ngành hàng chính</h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            Vui lòng sử dụng nút <b>Dán / Sửa dữ liệu</b> hoặc <b>CẬP NHẬT DATA</b> phía trên để nạp bảng dữ liệu báo cáo từ công cụ BI.
          </p>
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-sans), Inter, system-ui, -apple-system, sans-serif' }} className="space-y-4 bg-white">
          {/* Cấu trúc hiển thị & Lọc toolbar: 4 Cấp Bộ Lọc Kéo Thả Độc Lập */}
          <div className="flex flex-col gap-3.5 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/40 p-3.5 sm:p-4.5 rounded-[22px] border border-slate-200/80 shadow-sm">
            {/* Header row with Guide text and Reset button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] sm:text-[16px] font-black text-slate-800 uppercase tracking-wider">
                  BỘ LỌC 4 CẤP:
                </span>
                <span className="text-[11.5px] sm:text-[12.5px] font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <GripVertical size={14} className="text-indigo-600 animate-pulse" />
                  Kéo thả các nút lọc để thay đổi thứ tự phân cấp hiển thị dưới bảng
                </span>
              </div>
              {JSON.stringify(hierarchyOrder) !== JSON.stringify(DEFAULT_HIERARCHY_ORDER) && (
                <button
                  onClick={() => setHierarchyOrder(DEFAULT_HIERARCHY_ORDER)}
                  className="text-[11.5px] font-black text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer border border-slate-200 shadow-sm self-start sm:self-auto active:scale-95"
                  title="Khôi phục thứ tự phân cấp mặc định (Nhân viên -> Ngành -> Nhóm -> Hãng)"
                >
                  <RotateCcw size={12} /> Đặt lại mặc định
                </button>
              )}
            </div>

            {/* Draggable filter pills */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {hierarchyOrder.map((dim, idx) => {
                if (dim === 'staff') {
                  return (
                    <div
                      key="staff"
                      draggable
                      onDragStart={() => handleDragStart('staff')}
                      onDragOver={(e) => handleDragOver(e, 'staff')}
                      onDragEnd={handleDragEnd}
                      className="flex items-center group cursor-grab active:cursor-grabbing transition-transform"
                    >
                      <div className="flex items-center bg-blue-50/90 border border-blue-200/90 rounded-full pl-2 pr-1 py-0.5 shadow-sm hover:border-blue-400 gap-1.5">
                        <span className="text-[10.5px] font-black text-blue-700 w-4 h-4 rounded-full bg-blue-200/80 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <GripVertical size={13} className="text-blue-400 group-hover:text-blue-700" />
                        <CustomFilterPopover
                          label="NHÂN VIÊN"
                          placeholder="Tìm kiếm Nhân viên..."
                          options={uniqueStaffs}
                          selected={selectedStaffFilters}
                          onChange={setSelectedStaffFilters}
                          pillBgClass="bg-white/80 text-blue-900 border-transparent shadow-none hover:bg-white"
                          searchIconColorClass="text-blue-600"
                          icon={<User size={16} className="text-blue-600 flex-shrink-0" />}
                        />
                      </div>
                    </div>
                  );
                }
                if (dim === 'nganh') {
                  return (
                    <div
                      key="nganh"
                      draggable
                      onDragStart={() => handleDragStart('nganh')}
                      onDragOver={(e) => handleDragOver(e, 'nganh')}
                      onDragEnd={handleDragEnd}
                      className="flex items-center group cursor-grab active:cursor-grabbing transition-transform"
                    >
                      <div className="flex items-center bg-rose-50/90 border border-rose-200/90 rounded-full pl-2 pr-1 py-0.5 shadow-sm hover:border-rose-400 gap-1.5">
                        <span className="text-[10.5px] font-black text-rose-700 w-4 h-4 rounded-full bg-rose-200/80 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <GripVertical size={13} className="text-rose-400 group-hover:text-rose-700" />
                        <CustomFilterPopover
                          label="NGÀNH HÀNG"
                          placeholder="Tìm kiếm Ngành hàng..."
                          options={uniqueNganhs}
                          selected={selectedNganhFilters}
                          onChange={setSelectedNganhFilters}
                          pillBgClass="bg-white/80 text-rose-900 border-transparent shadow-none hover:bg-white"
                          searchIconColorClass="text-rose-600"
                          icon={<Layers size={16} className="text-rose-600 flex-shrink-0" />}
                        />
                      </div>
                    </div>
                  );
                }
                if (dim === 'nhom') {
                  return (
                    <div
                      key="nhom"
                      draggable
                      onDragStart={() => handleDragStart('nhom')}
                      onDragOver={(e) => handleDragOver(e, 'nhom')}
                      onDragEnd={handleDragEnd}
                      className="flex items-center group cursor-grab active:cursor-grabbing transition-transform"
                    >
                      <div className="flex items-center bg-teal-50/90 border border-teal-200/90 rounded-full pl-2 pr-1 py-0.5 shadow-sm hover:border-teal-400 gap-1.5">
                        <span className="text-[10.5px] font-black text-teal-700 w-4 h-4 rounded-full bg-teal-200/80 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <GripVertical size={13} className="text-teal-400 group-hover:text-teal-700" />
                        <CustomFilterPopover
                          label="NHÓM HÀNG"
                          placeholder="Tìm kiếm Nhóm hàng..."
                          options={uniqueNhoms}
                          selected={selectedNhomFilters}
                          onChange={setSelectedNhomFilters}
                          pillBgClass="bg-white/80 text-teal-900 border-transparent shadow-none hover:bg-white"
                          searchIconColorClass="text-teal-600"
                          icon={<LayoutGrid size={16} className="text-teal-600 flex-shrink-0" />}
                        />
                      </div>
                    </div>
                  );
                }
                if (dim === 'brand') {
                  return (
                    <div
                      key="brand"
                      draggable
                      onDragStart={() => handleDragStart('brand')}
                      onDragOver={(e) => handleDragOver(e, 'brand')}
                      onDragEnd={handleDragEnd}
                      className="flex items-center group cursor-grab active:cursor-grabbing transition-transform"
                    >
                      <div className="flex items-center bg-purple-50/90 border border-purple-200/90 rounded-full pl-2 pr-1 py-0.5 shadow-sm hover:border-purple-400 gap-1.5">
                        <span className="text-[10.5px] font-black text-purple-700 w-4 h-4 rounded-full bg-purple-200/80 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <GripVertical size={13} className="text-purple-400 group-hover:text-purple-700" />
                        <CustomFilterPopover
                          label="HÃNG"
                          placeholder="Tìm kiếm Hãng / Thương hiệu..."
                          options={uniqueBrands}
                          selected={selectedBrandFilters}
                          onChange={setSelectedBrandFilters}
                          pillBgClass="bg-white/80 text-purple-900 border-transparent shadow-none hover:bg-white"
                          searchIconColorClass="text-purple-600"
                          icon={<Tag size={16} className="text-purple-600 flex-shrink-0" />}
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
              {/* Level quick views toolbar: Cấp 1 -> Cấp 5 */}
              <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-2xl p-1 shadow-sm">
                {[1, 2, 3, 4, 5].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => expandToLevel(lvl)}
                    className={`px-3 py-1 rounded-xl text-[13.5px] sm:text-[15.5px] font-black transition-all cursor-pointer active:scale-95 ${
                      lvl > 1 ? 'border-l border-slate-100 ' : ''
                    }${
                      selectedLevel === lvl
                        ? 'bg-gradient-to-r from-slate-800 to-indigo-950 text-white shadow-md'
                        : 'text-slate-650 hover:bg-slate-50'
                    }`}
                    title={`Xem cấp ${lvl}`}
                  >
                    Cấp {lvl}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHideApple(!hideApple)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-black cursor-pointer transition-all border active:scale-95 ${
                    hideApple
                      ? 'bg-slate-800 text-white border-slate-700 shadow-md'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'
                  }`}
                  title={hideApple ? 'Đang ẩn nhóm Apple – Bấm để hiện lại' : 'Bấm để ẩn nhóm Apple'}
                >
                  🍎 {hideApple ? 'Đang ẩn Apple' : 'Ẩn Apple'}
                </button>

                <button
                  onClick={expandAll}
                  className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center cursor-pointer transition-all border border-emerald-200/80 shadow-sm relative active:scale-95"
                  title="Mở rộng tất cả"
                >
                  <ChevronDown size={18} className="stroke-[3]" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[8.5px] flex items-center justify-center font-black">
                    1
                  </span>
                </button>

                <button
                  onClick={collapseAll}
                  className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center cursor-pointer transition-all border border-amber-200/80 shadow-sm active:scale-95"
                  title="Thu gọn tất cả"
                >
                  <ChevronUp size={18} className="stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN GIÁ TRỊ ĐƠN HÀNG TABLE */}
          <div ref={captureGiaTriDhRef} className="border border-slate-200 rounded-3xl p-3 sm:p-4 bg-white shadow-sm">
            {/* Header Banner - Emerald Green Theme with Title & Export Button */}
            <div className="bg-[#059669] rounded-2xl py-3.5 px-4 sm:px-6 mb-3 text-white relative flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full text-center">
                <h2
                  style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', var(--font-sans), Inter, sans-serif" }}
                  className="text-[20px] sm:text-[25px] font-black text-[#fef08a] uppercase tracking-wider mb-0.5"
                >
                  GIÁ TRỊ ĐƠN HÀNG
                </h2>
                <p className="text-[12px] sm:text-[13px] font-bold text-[#ecfdf5] flex items-center justify-center gap-2 flex-wrap">
                  <span>⚡ Luỹ kế dự kiến đến ngày: {new Date().toLocaleDateString('vi-VN')}</span>
                  <span>||</span>
                  <span>TGSD: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>

              {/* Nút XUẤT ẢNH nằm trong phần tiêu đề (no-capture để tự động ẩn khi render ảnh) */}
              <div className="no-capture sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2 flex items-center justify-center">
                <button
                  onClick={handleCaptureGiaTriDh}
                  disabled={isCapturing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs sm:text-[13.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-100"
                >
                  <Camera size={15} className="stroke-[2.5]" /> XUẤT ẢNH
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table
                style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', var(--font-sans), Inter, sans-serif", tableLayout: 'fixed' }}
                className="w-full border-collapse"
              >
                <colgroup>
                  <col style={{ width: '380px', minWidth: '380px' }} />
                  <col style={{ width: '135px', minWidth: '135px' }} />
                  <col style={{ width: '135px', minWidth: '135px' }} />
                  <col style={{ width: '115px', minWidth: '115px' }} />
                  <col style={{ width: '115px', minWidth: '115px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#059669] text-white text-[13.5px] font-black uppercase tracking-wider">
                    <th style={{ width: '380px' }} className="py-3 px-4 text-left font-black border-r border-emerald-600/50">
                      NHÂN VIÊN / TÊN HÀNG HOÁ
                    </th>
                    <th style={{ width: '135px' }} className="py-3 px-3 text-center font-black border-r border-emerald-600/50">
                      DT THỰC
                    </th>
                    <th style={{ width: '135px' }} className="py-3 px-3 text-center font-black border-r border-emerald-600/50">
                      DTQĐ
                    </th>
                    <th style={{ width: '115px' }} className="py-3 px-3 text-center font-black border-r border-emerald-600/50">
                      SỐ LƯỢNG
                    </th>
                    <th style={{ width: '115px' }} className="py-3 px-3 text-center font-black">
                      ĐƠN GIÁ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nonTotalRows.map((row) => {
                    const rowKey = `${row.originalIndex}_${row.cells[0]}`;
                    const isExpanded = expandedKeys[rowKey] !== false;
                    let textColorClass = 'text-slate-900';
                    if (row.level === 5) {
                      textColorClass = 'text-[#ea580c] font-semibold'; // Cấp 5 (Sản phẩm chi tiết - Cam)
                    } else if (row.level >= 1 && row.level <= 4) {
                      const currentDim = hierarchyOrder[row.level - 1];
                      if (currentDim === 'staff') {
                        textColorClass = 'text-slate-950 font-black'; // Nhân viên (Đen đậm)
                      } else if (currentDim === 'nganh') {
                        textColorClass = 'text-[#e11d48] font-black'; // Ngành hàng (Đỏ hồng)
                      } else if (currentDim === 'nhom') {
                        textColorClass = 'text-[#0d9488] font-bold'; // Nhóm hàng (Xanh ngọc)
                      } else if (currentDim === 'brand') {
                        textColorClass = 'text-[#7c3aed] font-bold'; // Hãng (Tím)
                      }
                    }

                    return (
                      <tr key={row.originalIndex} className="hover:bg-slate-50 transition-colors border-b border-slate-200 bg-white">
                        <td
                          style={{ paddingLeft: `${Math.max(0, row.level - 1) * 22 + 12}px` }}
                          className="py-2.5 px-3.5 border-r border-slate-200 whitespace-nowrap align-middle text-left font-black"
                        >
                          <div className="flex items-center gap-2">
                            {row.hasChildren ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedKeys(prev => ({ ...prev, [rowKey]: !isExpanded }));
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer flex items-center justify-center"
                              >
                                {isExpanded ? <ChevronDown size={16} className="stroke-[3]" /> : <ChevronRight size={16} className="stroke-[3]" />}
                              </button>
                            ) : (
                              <div className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span className={`${textColorClass} text-[15px]`}>
                              {row.cells[0].trim()}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3.5 border-r border-slate-200 whitespace-nowrap align-middle text-center font-black text-red-600 text-[15px]">
                          {(() => {
                            const num = parseCellNum(row.cells[1]);
                            return num !== 0 ? formatCellNum(num) : row.cells[1];
                          })()}
                        </td>

                        <td className="py-2.5 px-3.5 border-r border-slate-200 whitespace-nowrap align-middle text-center font-black text-slate-800 text-[15px]">
                          {(() => {
                            const num = parseCellNum(row.cells[2]);
                            return num !== 0 ? formatCellNum(num) : row.cells[2];
                          })()}
                        </td>

                        <td className="py-2.5 px-3.5 border-r border-slate-200 whitespace-nowrap align-middle text-center font-black text-slate-800 text-[15px]">
                          {(() => {
                            const num = parseCellNum(row.cells[4]);
                            return num !== 0 ? formatCellNum(num) : row.cells[4];
                          })()}
                        </td>

                        <td className="py-2.5 px-3.5 whitespace-nowrap align-middle text-center font-black text-slate-800 text-[15px]">
                          {(() => {
                            const num = parseCellNum(row.cells[5]);
                            return num !== 0 ? formatCellNum(num) : row.cells[5];
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                  {totalRow && (
                    <tr className="bg-[#059669] text-white border-t-2 border-emerald-700 font-black">
                      <td className="py-3 px-4 border-r border-emerald-600/50 text-center whitespace-nowrap align-middle font-black uppercase text-white text-[16px]">
                        TỔNG
                      </td>
                      <td className="py-3 px-3 border-r border-emerald-600/50 whitespace-nowrap align-middle text-center font-black text-white text-[16px]">
                        {(() => {
                          const num = parseCellNum(totalRow.cells[1]);
                          return num !== 0 ? formatCellNum(num) : totalRow.cells[1];
                        })()}
                      </td>
                      <td className="py-3 px-3 border-r border-emerald-600/50 whitespace-nowrap align-middle text-center font-black text-white text-[16px]">
                        {(() => {
                          const num = parseCellNum(totalRow.cells[2]);
                          return num !== 0 ? formatCellNum(num) : totalRow.cells[2];
                        })()}
                      </td>
                      <td className="py-3 px-3 border-r border-emerald-600/50 whitespace-nowrap align-middle text-center font-black text-white text-[16px]">
                        {(() => {
                          const num = parseCellNum(totalRow.cells[4]);
                          return num !== 0 ? formatCellNum(num) : totalRow.cells[4];
                        })()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-middle text-center font-black text-white text-[16px]">
                        {(() => {
                          const num = parseCellNum(totalRow.cells[5]);
                          return num !== 0 ? formatCellNum(num) : totalRow.cells[5];
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHI TIẾT KHAI THÁC NHÂN VIÊN SECTION */}
          <div className="mt-8">
            <div ref={captureCtktnvRef} className="border border-slate-200 rounded-3xl p-3 sm:p-4 bg-white shadow-sm">
              {/* Header Banner - Tone Xanh Emerald matching Image 2 */}
              <div className="bg-[#059669] rounded-2xl py-3.5 px-4 sm:px-6 mb-3 text-white relative flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full text-center">
                  <h2
                    style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', var(--font-sans), Inter, sans-serif" }}
                    className="text-[20px] sm:text-[25px] font-black text-[#fef08a] uppercase tracking-wider mb-0.5"
                  >
                    CHI TIẾT KHAI THÁC NHÂN VIÊN
                  </h2>
                  <p className="text-[12px] sm:text-[13.5px] font-bold text-[#ecfdf5] flex items-center justify-center gap-2 flex-wrap">
                    <span className="whitespace-nowrap">⚡ Đến ngày: {getYesterdayFormattedDate()}</span>
                    <span>||</span>
                    <span className="whitespace-nowrap">TGSD: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>

                {/* Toolbar Actions (no-capture để tự động ẩn khi xuất ảnh) */}
                <div className="no-capture sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2 flex items-center gap-2 flex-wrap justify-center">
                  {/* Group visibility filter */}
                  <div className="relative" ref={colFilterRef}>
                    <button
                      onClick={() => setShowColFilter(!showColFilter)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer border border-white/30 backdrop-blur-sm shadow-sm active:scale-95"
                    >
                      <Eye size={14} /> Ẩn/Hiện nhóm ({visibleCtktnvGroups.length}/{CTKTNV_GROUPS.length})
                    </button>
                    {showColFilter && (
                      <div className="absolute right-0 top-full mt-2 bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-2xl p-3.5 z-50 min-w-[290px] sm:min-w-[330px] animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 font-black">
                          <span className="text-[12px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <LayoutGrid size={14} className="text-emerald-600" />
                            Hiển thị nhóm ({visibleCtktnvGroups.length}/{CTKTNV_GROUPS.length})
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setVisibleCtktnvGroups([...ALL_CTKTNV_GROUP_NAMES])}
                              className="text-[11px] px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold cursor-pointer transition-colors"
                            >
                              Tất cả
                            </button>
                            <button
                              onClick={() => setVisibleCtktnvGroups([])}
                              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold cursor-pointer transition-colors"
                            >
                              Bỏ hết
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                          {CTKTNV_GROUPS.map(grp => {
                            const isChecked = visibleCtktnvGroups.includes(grp.name);
                            return (
                              <label
                                key={grp.name}
                                className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                                  isChecked
                                    ? 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80'
                                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-400 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setVisibleCtktnvGroups(prev =>
                                        prev.includes(grp.name) ? prev.filter(g => g !== grp.name) : [...prev, grp.name]
                                      );
                                    }}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: grp.color }}
                                    />
                                    <span className={`text-[13px] font-black uppercase ${isChecked ? 'text-slate-800' : 'text-slate-400'}`}>
                                      {grp.name}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs"
                                  style={{ backgroundColor: grp.color }}
                                >
                                  {grp.cols.length} cột
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nút NHẬN XÉT (Khớp chuẩn Modal Hình 2) */}
                  <button
                    onClick={() => {
                      generateCtktnvComment(commentTemplate);
                      setIsCommentOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs sm:text-[13.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border border-orange-400/60"
                  >
                    <Sparkles size={15} className="stroke-[2.5]" /> NHẬN XÉT
                  </button>

                  {/* Nút XUẤT ẢNH */}
                  <button
                    onClick={handleCaptureCtktnv}
                    disabled={isCapturing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs sm:text-[13.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-100"
                  >
                    <Camera size={15} className="stroke-[2.5]" /> XUẤT ẢNH
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table
                  style={{ fontFamily: "'UTM Avo Black', 'UTM Avo', var(--font-sans), Inter, sans-serif", tableLayout: 'fixed' }}
                  className="border-collapse w-full"
                >
                  {ctktnvData.visCols.length === 0 ? (
                    <>
                      <colgroup>
                        <col style={{ width: '50px', minWidth: '50px' }} />
                        <col style={{ width: '250px', minWidth: '250px' }} />
                        <col style={{ width: '100%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th
                            style={{ fontSize: '13.5px', whiteSpace: 'nowrap', backgroundColor: '#1e293b', width: '50px' }}
                            className="py-2.5 px-2 text-center border border-white/70 font-black text-white rounded-tl-2xl sticky left-0 z-20"
                          >
                            STT
                          </th>
                          <th
                            style={{ fontSize: '13.5px', whiteSpace: 'nowrap', backgroundColor: '#1e293b' }}
                            className="py-2.5 px-3 border border-white/70 font-black text-white sticky left-[50px] z-20"
                          >
                            <div className="flex items-center justify-center relative w-full px-4">
                              <span className="text-center font-black">NHÂN VIÊN</span>
                              <div className="no-capture absolute right-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                                <CustomFilterPopover
                                  label=""
                                  placeholder="Tìm nhân viên..."
                                  options={allCtktnvStaffNames}
                                  selected={selectedCtktnvStaffs}
                                  onChange={setSelectedCtktnvStaffs}
                                  pillBgClass="bg-white/15 hover:bg-white/25 text-white border border-white/40 p-1.5 rounded-lg text-xs"
                                  searchIconColorClass="text-indigo-600"
                                  isIconOnly={true}
                                  alignRight={false}
                                  icon={<Filter size={13} className={selectedCtktnvStaffs.length > 0 && selectedCtktnvStaffs.length < allCtktnvStaffNames.length ? "text-amber-400 fill-amber-400" : "text-white"} />}
                                />
                              </div>
                            </div>
                          </th>
                          <th
                            style={{ backgroundColor: '#64748b', fontSize: '13.5px' }}
                            className="py-2.5 px-4 text-center text-white font-black border border-white/70"
                          >
                            CHƯA CHỌN NHÓM HIỂN THỊ
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={3} className="py-10 px-4 text-center bg-slate-50/50 border-b border-slate-200">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <span className="text-slate-500 font-bold text-[14px]">
                                Hiện chưa có nhóm dữ liệu nào được hiển thị
                              </span>
                              <button
                                onClick={() => setVisibleCtktnvGroups([...ALL_CTKTNV_GROUP_NAMES])}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shadow transition-all active:scale-95 flex items-center gap-1.5"
                              >
                                <Eye size={14} /> Hiển thị tất cả 6 nhóm ({ALL_CTKTNV_COLS.length} cột)
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </>
                  ) : (
                    <>
                      <colgroup>
                        <col style={{ width: '48px', minWidth: '48px' }} />
                        <col style={{ width: '240px', minWidth: '240px' }} />
                        {ctktnvData.visCols.map((col, i) => {
                          let colW = 120;
                          if (col.label === 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG' || col.label.length > 20) {
                            colW = 150;
                          } else if (col.label.startsWith('BÁN KÈM') || col.label.startsWith('KHAI THÁC') || col.label.startsWith('TỈ TRỌNG')) {
                            colW = 135;
                          } else if (col.label === 'GIỜ CÔNG') {
                            colW = 100;
                          }
                          return (
                            <col key={i} style={{ width: `${colW}px`, minWidth: `${colW}px` }} />
                          );
                        })}
                      </colgroup>
                      <thead>
                        <tr>
                          <th
                            rowSpan={2}
                            style={{ fontSize: '13.5px', whiteSpace: 'nowrap', backgroundColor: '#1e293b', width: '48px' }}
                            className="py-2.5 px-2 text-center border border-white/70 font-black text-white rounded-tl-2xl sticky left-0 z-20"
                          >
                            STT
                          </th>
                          <th
                            rowSpan={2}
                            style={{ fontSize: '13.5px', whiteSpace: 'nowrap', backgroundColor: '#1e293b', width: '240px' }}
                            className="py-2.5 px-3 border border-white/70 font-black text-white sticky left-[48px] z-20"
                          >
                            <div className="flex items-center justify-center relative w-full px-4">
                              <span className="text-center font-black">NHÂN VIÊN</span>
                              <div className="no-capture absolute right-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                                <CustomFilterPopover
                                  label=""
                                  placeholder="Tìm nhân viên..."
                                  options={allCtktnvStaffNames}
                                  selected={selectedCtktnvStaffs}
                                  onChange={setSelectedCtktnvStaffs}
                                  pillBgClass="bg-white/15 hover:bg-white/25 text-white border border-white/40 p-1.5 rounded-lg text-xs"
                                  searchIconColorClass="text-indigo-600"
                                  isIconOnly={true}
                                  alignRight={false}
                                  icon={<Filter size={13} className={selectedCtktnvStaffs.length > 0 && selectedCtktnvStaffs.length < allCtktnvStaffNames.length ? "text-amber-400 fill-amber-400" : "text-white"} />}
                                />
                              </div>
                            </div>
                          </th>
                          {ctktnvData.groups.map((g, i) => (
                            <th
                              key={i}
                              colSpan={g.span}
                              style={{ backgroundColor: g.color, fontSize: '14px' }}
                              className="py-2 px-2 text-center text-white border border-white/70 font-black uppercase"
                            >
                              {g.group}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {ctktnvData.visCols.map((col, i) => {
                            let colW = 120;
                            if (col.label === 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG' || col.label.length > 20) {
                              colW = 150;
                            } else if (col.label.startsWith('BÁN KÈM') || col.label.startsWith('KHAI THÁC') || col.label.startsWith('TỈ TRỌNG')) {
                              colW = 135;
                            } else if (col.label === 'GIỜ CÔNG') {
                              colW = 100;
                            }
                            return (
                              <th
                                key={i}
                                style={{
                                  backgroundColor: col.color,
                                  fontSize: '12.5px',
                                  lineHeight: '1.25',
                                  width: `${colW}px`,
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word'
                                }}
                                className="py-2 px-1.5 text-center text-white font-black border border-white/70"
                              >
                                {col.label}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCtktnvRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-300 bg-white">
                            <td
                              style={{ fontSize: '15px', width: '50px' }}
                              className="py-2 px-2 border-b border-slate-300 border-r border-r-slate-200 whitespace-nowrap text-center font-black text-slate-700 sticky left-0 bg-white z-[5]"
                            >
                              {rIdx + 1}
                            </td>
                            <td
                              style={{ fontSize: '15px', paddingLeft: '12px' }}
                              className="py-2 px-3 border-b border-slate-300 border-r border-r-slate-200 whitespace-nowrap text-left font-black text-black sticky left-[50px] bg-white z-[5]"
                            >
                              {row.name}
                            </td>
                            {row.cells.map((cellVal, cIdx) => {
                              const col = ctktnvData.visCols[cIdx];
                              const isDtqdPerGioCong = col?.label === 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG';
                              const totalPctVal = ctktnvTotals.colTotalPctValues[cIdx];

                              let isUnderThreshold = false;

                              if (isDtqdPerGioCong) {
                                const numVal = parseCellNum(cellVal);
                                if (cellVal !== '-' && ctktnvTotals.totalDtqdPerGc !== null) {
                                  const totalDisplayVal = Number(ctktnvTotals.totalDtqdPerGc.toFixed(1));
                                  if (numVal < totalDisplayVal) {
                                    isUnderThreshold = true;
                                  }
                                }
                              } else if (totalPctVal !== null && totalPctVal !== undefined && cellVal !== '-' && cellVal.includes('%')) {
                                const rowPct = parseFloat(cellVal.replace('%', '').trim());
                                const totalRounded = Math.round(totalPctVal);
                                if (!isNaN(rowPct) && rowPct < totalRounded) {
                                  isUnderThreshold = true;
                                }
                              }

                              return (
                                <td
                                  key={cIdx}
                                  style={{ fontSize: '15px', width: '125px' }}
                                  className="py-2 px-1.5 border-b border-slate-300 border-r border-r-slate-200 last:border-r-0 text-right font-black text-slate-800"
                                >
                                  {isUnderThreshold ? (
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#fee2e2] text-[#dc2626] font-black border border-[#fca5a5]/80 text-[14.5px]">
                                      {cellVal}
                                    </span>
                                  ) : (
                                    cellVal
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {filteredCtktnvRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={ctktnvData.visCols.length + 2}
                              style={{ fontSize: '15px' }}
                              className="py-6 text-center text-slate-400 font-black"
                            >
                              {ctktnvData.nvNames.length === 0
                                ? 'Chưa có nhân viên — dán dữ liệu BI ở trên để hiển thị'
                                : 'Không có nhân viên phù hợp với bộ lọc'}
                            </td>
                          </tr>
                        )}
                        {filteredCtktnvRows.length > 0 && (
                          <tr className="bg-[#e6fbf4] text-[#047857] border-t-2 border-emerald-450 hover:bg-[#d1f7eb] transition-all font-black">
                            <td
                              colSpan={2}
                              style={{ fontSize: '15px' }}
                              className="py-2 px-3 border-b border-emerald-200 border-r border-r-emerald-200 text-center whitespace-nowrap font-black uppercase text-[#047857] sticky left-0 bg-[#e6fbf4] z-[5]"
                            >
                              TỔNG
                            </td>
                            {ctktnvData.visCols.map((col, cIdx) => {
                              const totalPctVal = ctktnvTotals.colTotalPctValues[cIdx];
                              let totalDisplay = '-';
                              if (totalPctVal !== null && totalPctVal !== undefined) {
                                totalDisplay = `${totalPctVal.toFixed(0)}%`;
                              } else if (col.label === 'DTQĐ TẠO RA TRÊN MỖI GIỜ CÔNG') {
                                if (ctktnvTotals.totalDtqdPerGc !== null) {
                                  totalDisplay = fNum(ctktnvTotals.totalDtqdPerGc);
                                } else {
                                  totalDisplay = '-';
                                }
                              } else {
                                const total = ctktnvTotals.colTotals[cIdx];
                                totalDisplay = total > 0 ? fNum(total) : '-';
                              }

                              return (
                                <td
                                  key={cIdx}
                                  style={{ fontSize: '15px' }}
                                  className="py-2 px-1.5 border-b border-emerald-200 border-r border-r-emerald-200 last:border-r-0 text-right font-black text-[#047857]"
                                >
                                  {totalDisplay}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal - Orange gradient design with template tabs matching Image 2 */}
      {isCommentOpen && ReactDOM.createPortal(
        <div className="no-capture fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setIsCommentOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét thi đua
                </span>
              </div>
              <button onClick={() => setIsCommentOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {[
                  { id: 1 as const, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
                  { id: 2 as const, label: 'Mẫu 2: DS Cần tăng tốc', icon: '⚠️' },
                  { id: 3 as const, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCommentTemplate(tab.id);
                      generateCtktnvComment(tab.id);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border",
                      commentTemplate === tab.id
                        ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide mt-2">
                Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
              </p>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={12}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(commentText);
                      setCopiedComment(true);
                      setTimeout(() => setCopiedComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500 shadow-md'
                  }`}
                >
                  {copiedComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* 🌟 MODAL HƯỚNG DẪN & COPY MÃ BOOKMARKLET */}
      {showBookmarkModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 relative overflow-hidden space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-amber-500/25">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Cài Đặt Bookmarklet Auto Copy
                  </h3>
                  <p className="text-xs font-bold text-amber-600">
                    Tên Bookmark: <strong>⚡ AUTO COPY N.HÀNG CHÍNH</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 font-medium leading-relaxed">
              <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="font-black text-amber-900 flex items-center gap-1.5 text-[13px]">
                  <span>💡 Cách 1: Kéo thả trực tiếp (Nhanh nhất)</span>
                </div>
                <p className="text-amber-800">
                  Dùng chuột <strong>nhấp giữ vào nút cam bên dưới</strong> và <strong>KÉO THẢ</strong> thẳng lên thanh Bookmark (<kbd className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">Ctrl + Shift + B</kbd>).
                </p>
                <div className="pt-1 flex justify-center">
                  <a
                    href={BOOKMARKLET_AUTO_COPY_5_CAP}
                    draggable={true}
                    title="⚡ AUTO COPY N.HÀNG CHÍNH"
                    onDragStart={(e) => {
                      const bookmarkTitle = '⚡ AUTO COPY N.HÀNG CHÍNH';
                      const url = BOOKMARKLET_AUTO_COPY_5_CAP;
                      try { e.dataTransfer.clearData(); } catch (err) {}
                      try { e.dataTransfer.setData('text/x-moz-url', `${url}\n${bookmarkTitle}`); } catch (err) {}
                      try { e.dataTransfer.setData('text/x-moz-url-data', url); } catch (err) {}
                      try { e.dataTransfer.setData('text/x-moz-url-desc', bookmarkTitle); } catch (err) {}
                      try { e.dataTransfer.setData('text/uri-list', url); } catch (err) {}
                      try { e.dataTransfer.setData('text/html', `<a href="${url}">${bookmarkTitle}</a>`); } catch (err) {}
                      try { e.dataTransfer.setData('text/plain', `${url}\n${bookmarkTitle}`); } catch (err) {}
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing select-none border border-white/40"
                  >
                    ⚡ AUTO COPY N.HÀNG CHÍNH
                  </a>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="font-black text-slate-800 flex items-center justify-between text-[13px]">
                  <span>✏️ Cách 2: Đổi tên Bookmark (Chỉ mất 2 giây)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('⚡ AUTO COPY N.HÀNG CHÍNH');
                      alert('✅ Đã sao chép tên: "⚡ AUTO COPY N.HÀNG CHÍNH"\n\nBây giờ bạn chỉ cần dán (Ctrl+V) vào ô Tên trong bảng Chỉnh sửa dấu trang và bấm [Lưu]!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                  >
                    📋 Sao chép Tên
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-medium">
                  <li>Click chuột phải vào biểu tượng Bookmark trên thanh trình duyệt.</li>
                  <li>Chọn dòng <strong>"Chỉnh sửa..." (Edit...)</strong>.</li>
                  <li>Tại ô <strong>Tên (Name)</strong>: Nhập hoặc dán <strong><code>⚡ AUTO COPY N.HÀNG CHÍNH</code></strong>.</li>
                  <li>Bấm <strong>Lưu (Save)</strong> là xong 100%!</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('⚡ AUTO COPY N.HÀNG CHÍNH');
                    alert('✅ Đã sao chép tên: "⚡ AUTO COPY N.HÀNG CHÍNH"');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-all cursor-pointer"
                >
                  📋 Copy Tên
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(BOOKMARKLET_AUTO_COPY_5_CAP);
                    setCopiedBookmarklet(true);
                    setTimeout(() => setCopiedBookmarklet(false), 2500);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    copiedBookmarklet
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copiedBookmarklet ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedBookmarklet ? 'Đã sao chép mã!' : 'Copy Mã Script'}</span>
                </button>
              </div>

              <button
                onClick={() => setShowBookmarkModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </motion.div>
  );
};
