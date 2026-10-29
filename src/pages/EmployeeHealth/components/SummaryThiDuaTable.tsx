import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { parseCategoryData, cn, cleanCategoryName, isNonCategoryNoiseLine } from '../../RTST/utils';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { extractStaffNameAndId, isEmpNameStr, excludedKeywords, isNonStaffName } from '../utils/staffParserHelper';
import {
  Download,
  Copy,
  Check,
  MessageSquare,
  MessageCircle,
  ChevronDown,
  Search,
  X,
  Sparkles,
  Filter,
  Layers,
  Trophy,
  Calendar,
  Clock,
  Users,
  Target,
  BarChart3,
  ArrowUpDown,
  Settings,
  FileSpreadsheet,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Camera,
  Headphones,
  BatteryCharging,
  Watch,
  Shield,
  CreditCard,
  ShoppingCart,
  Tv,
  Wind,
  Flame,
  Droplets,
  Zap,
  Wifi,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import * as XLSX from 'xlsx';
import { ensureFontsReady } from '../../../utils/fontExportUtil';
import { useAuth } from '../../../contexts/AuthContext';
import { useLuykeData } from '../../RTST/hooks/useLuykeData';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../../../components/CaptureLoadingOverlay';

const removeAccentsLocal = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

import { CategoryConfigItem } from '../../../hooks/useCategoryConfig';

const EXACT_ONLY_CLEAN_KEYS = new Set([
  'tivi',
  'dientu',
  'maylanh',
  'maygiat',
  'dongho',
  'bhtong',
  'bhthodmx',
  'bhthodmxict',
  'bhthodmxce',
  'simtong',
  'simmobifonesimdmx',
  'tabletandroidmaydocsach',
  'dienthoaitabletandroid',
]);

export const isSameCategoryClean = (cleanA: string, cleanB: string): boolean => {
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;
  if (cleanA.length < 3 || cleanB.length < 3) return false;
  if (EXACT_ONLY_CLEAN_KEYS.has(cleanA) || EXACT_ONLY_CLEAN_KEYS.has(cleanB)) {
    return false;
  }
  return cleanA.includes(cleanB) || cleanB.includes(cleanA);
};

export const isSameCategory = (nameA: string, nameB: string): boolean => {
  return isSameCategoryClean(cleanCategoryName(nameA), cleanCategoryName(nameB));
};

export const findMatchingCategoryConfig = (
  catName: string, 
  categoryConfig?: CategoryConfigItem[]
): CategoryConfigItem | undefined => {
  if (!categoryConfig || categoryConfig.length === 0 || !catName) return undefined;
  const cleanCat = cleanCategoryName(catName);
  if (!cleanCat) return undefined;

  // 1. Exact match on canonical clean name
  let match = categoryConfig.find(c => cleanCategoryName(c.name) === cleanCat);
  if (match) return match;

  // 2. Safe fuzzy substring match (guarded against false-positive generic root collisions)
  match = categoryConfig.find(c => isSameCategoryClean(cleanCategoryName(c.name), cleanCat));
  return match;
};

export const resolveCategoryBaseTarget = (
  catName: string,
  categoryTargets?: any[],
  luykeCategories?: CategoryData[]
): number => {
  const clean = cleanCategoryName(catName);
  if (!clean) return 0;

  let matchingTarget = categoryTargets?.find((t: any) => t?.name && cleanCategoryName(t.name) === clean);
  let lkCat = luykeCategories?.find((c: any) => c?.name && cleanCategoryName(c.name) === clean);

  if (!matchingTarget) {
    matchingTarget = categoryTargets?.find((t: any) => t?.name && isSameCategoryClean(cleanCategoryName(t.name), clean));
  }
  if (!lkCat) {
    lkCat = luykeCategories?.find((c: any) => c?.name && isSameCategoryClean(cleanCategoryName(c.name), clean));
  }

  if (matchingTarget && typeof matchingTarget.adjustedTarget === 'number' && matchingTarget.adjustedTarget > 0) {
    return matchingTarget.adjustedTarget;
  }
  if (matchingTarget && typeof matchingTarget.target === 'number' && matchingTarget.target > 0) {
    const pct = typeof matchingTarget.percent === 'number' ? matchingTarget.percent : 100;
    return matchingTarget.target * (pct / 100);
  }
  if (lkCat && typeof lkCat.target === 'number' && lkCat.target > 0) {
    return lkCat.target;
  }
  return 0;
};

const isUiNoiseLine = (line: string): boolean => {
  const trimmed = (line || '').trim();
  if (!trimmed) return true;
  return /^(⚡\s*)?copy\s*all$/i.test(trimmed) ||
    /^tải báo cáo thất bại/i.test(trimmed) ||
    /^vui lòng thử lại/i.test(trimmed);
};

export const splitReportCols = (line: string): string[] => {
  const trimmed = (line || '').trim();
  if (!trimmed) return [];
  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map(p => p.trim());
  }
  if (trimmed.includes('|')) {
    return trimmed.split('|').map(p => p.trim());
  }
  if (/\s{2,}/.test(trimmed)) {
    return trimmed.split(/\s{2,}/).map(p => p.trim());
  }
  return [trimmed];
};

const isGenericColHeaderLabel = (col: string): boolean => {
  const c = (col || '').trim();
  if (!c) return true;
  return /^(DOANH THU|SỐ LƯỢNG|DOANH THU THỰC|DOANH THU QĐ|DOANH THU QUY ĐỔI|DT|SL|NHÂN VIÊN|TÊN NHÂN VIÊN|NV|HỌ TÊN|STT|SIÊU THỊ|PHÒNG BAN|MÃ NV|MSNV)$/i.test(c);
};

const isMetricColHeaderLabel = (col: string): boolean => {
  const c = (col || '').trim();
  return /^(DOANH THU|SỐ LƯỢNG|DOANH THU THỰC|DOANH THU QĐ|DOANH THU QUY ĐỔI|DT|SL|THỰC HIỆN|LŨY KẾ|DTLK|SLLK)$/i.test(c) ||
    /\b(DOANH THU|SỐ LƯỢNG)\b/i.test(c);
};

const isRankOrTargetHeaderLabel = (col: string): boolean => {
  const c = (col || '').trim();
  return /^(HẠNG TRONG ST|HẠNG|TOP\/BOTTOM ST|TOP\/BOTTOM|TARGET|CHỈ TIÊU|% ?HT|TIẾN ĐỘ|DỰ BÁO)$/i.test(c) ||
    /\b(HẠNG TRONG ST|TOP\/BOTTOM|TARGET|% ?HT)\b/i.test(c);
};

// Checks if a candidate header is actually a store/market row or UI noise, while preserving valid category names like "T10 - BẢO HIỂM THỢ ĐMX_ICT" or "T10 - BẢO HIỂM THỢ ĐMX_CE"
const isStoreOrNoiseHeaderCandidate = (raw: string): boolean => {
  const s = (raw || '').trim();
  if (!s) return true;
  if (isUiNoiseLine(s)) return true;
  if (/^(TỔNG|TỔNG CỘNG|TOÀN CÔNG TY|TRUNG BÌNH|BÌNH QUÂN|TỔNG KẾT|TẤT CẢ)$/i.test(s)) return true;
  if (/^(SIÊU THỊ|CỬA HÀNG|CHI NHÁNH|KHO|MÃ KHO|MÃ ST|TÊN SIÊU THỊ|TÊN MIỀN|VÙNG|KHU VỰC|CỤM|TỈNH)\b/i.test(s)) return true;
  // Store code/prefix at the start of the string (e.g. "ĐML_CMA_...", "1841 - ĐML_...")
  if (/^(\d{3,6}\s*[-–—:]\s*)?(đml|dml|đmx|dmx|tgdđ|tgdd|bhx|đms|dms|mwg)[_\s-]/i.test(s)) return true;
  if (/^(điện máy xanh|thế giới di động|bách hóa xanh|topzone)\b/i.test(s)) return true;
  return false;
};

export interface DetectedSectionHeader {
  lineIdx: number;
  headerStartIdx: number;
  dataStartIdx: number;
  catName: string;
  type: 'SL' | 'DT';
}

export const detectSectionHeaderAt = (lines: string[], i: number): DetectedSectionHeader | null => {
  const l = lines[i];
  if (!l) return null;
  const cols = splitReportCols(l);
  if (cols.length === 0) return null;

  // Layout 1: Inline Category Header on line i (e.g. "T10 - PANASONIC | DOANH THU | HẠNG TRONG ST | TOP/BOTTOM ST")
  if (cols.length >= 2) {
    const firstCol = cols[0];
    const restCols = cols.slice(1);
    const hasMetricInRest = restCols.some(isMetricColHeaderLabel);
    const hasRankOrTargetInRest = restCols.some(isRankOrTargetHeaderLabel);

    if (
      firstCol &&
      !isGenericColHeaderLabel(firstCol) &&
      !isEmpNameStr(firstCol) &&
      !isStoreOrNoiseHeaderCandidate(firstCol) &&
      (hasMetricInRest || ( cols.length >= 3 && hasRankOrTargetInRest ))
    ) {
      const cleanFirst = cleanCategoryName(firstCol);
      if (cleanFirst) {
        let headerStartIdx = i;
        if (i > 0 && cleanCategoryName(lines[i - 1]) === cleanFirst) {
          headerStartIdx = i - 1;
        }
        const isSl = restCols.some(c => /SỐ LƯỢNG|\bSL\b|\bSLLK\b/i.test(c));
        return {
          lineIdx: i,
          headerStartIdx,
          dataStartIdx: i + 1,
          catName: firstCol,
          type: isSl ? 'SL' : 'DT'
        };
      }
    }

    // Layout 2: Two-Line Header (Category Name on line i-1, Multi-column header on line i)
    const hasMetricAny = cols.some(isMetricColHeaderLabel);
    const hasRankOrTargetAny = cols.some(isRankOrTargetHeaderLabel);
    if (isGenericColHeaderLabel(firstCol) && (hasMetricAny || hasRankOrTargetAny) && i > 0) {
      let catIdx = i - 1;
      let catCandidate = lines[catIdx];
      if (/^(DOANH THU|SỐ LƯỢNG|DT|SL)$/i.test(catCandidate.trim()) && catIdx > 0) {
        catIdx--;
        catCandidate = lines[catIdx];
      }
      if (/^\d{4,6}$/.test(catCandidate.trim()) && catIdx > 0) {
        catIdx--;
        catCandidate = lines[catIdx];
      }
      const catCols = splitReportCols(catCandidate);
      if (
        catCols.length === 1 &&
        !isEmpNameStr(catCandidate) &&
        !isStoreOrNoiseHeaderCandidate(catCandidate) &&
        cleanCategoryName(catCandidate)
      ) {
        const isSl = cols.some(c => /SỐ LƯỢNG|\bSL\b|\bSLLK\b/i.test(c));
        return {
          lineIdx: i,
          headerStartIdx: catIdx,
          dataStartIdx: i + 1,
          catName: catCandidate.trim(),
          type: isSl ? 'SL' : 'DT'
        };
      }
    }
  }

  // Layout 3: Vertical Multi-Line Header (Category Name on line i-1, "DOANH THU"/"SỐ LƯỢNG" on line i, "HẠNG TRONG ST" on line i+1)
  if (
    cols.length === 1 &&
    /^(DOANH THU|SỐ LƯỢNG|DOANH THU THỰC|DT|SL)$/i.test(cols[0]) &&
    i > 0 &&
    i + 1 < lines.length &&
    isRankOrTargetHeaderLabel(lines[i + 1])
  ) {
    let catIdx = i - 1;
    let catCandidate = lines[catIdx];
    if (/^\d{4,6}$/.test(catCandidate.trim()) && catIdx > 0) {
      catIdx--;
      catCandidate = lines[catIdx];
    }
    if (
      !isEmpNameStr(catCandidate) &&
      !isStoreOrNoiseHeaderCandidate(catCandidate) &&
      cleanCategoryName(catCandidate)
    ) {
      let dataStartIdx = i + 2;
      while (
        dataStartIdx < lines.length &&
        splitReportCols(lines[dataStartIdx]).length === 1 &&
        isRankOrTargetHeaderLabel(lines[dataStartIdx])
      ) {
        dataStartIdx++;
      }
      const isSl = /SỐ LƯỢNG|\bSL\b/i.test(cols[0]);
      return {
        lineIdx: i,
        headerStartIdx: catIdx,
        dataStartIdx,
        catName: catCandidate.trim(),
        type: isSl ? 'SL' : 'DT'
      };
    }
  }

  return null;
};

const parseReportSections = (rawText: string) => {
  const lines = (rawText || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !isUiNoiseLine(l));

  const sectionHeaders: DetectedSectionHeader[] = [];
  for (let i = 0; i < lines.length; i++) {
    const detected = detectSectionHeaderAt(lines, i);
    if (detected) {
      sectionHeaders.push(detected);
      if (detected.dataStartIdx > i + 1) {
        i = detected.dataStartIdx - 1;
      }
    }
  }

  const preambleLines = sectionHeaders.length > 0 ? lines.slice(0, Math.max(0, sectionHeaders[0].headerStartIdx)) : [];
  const sections: { key: string; catName: string; block: string }[] = [];
  const staffIds = new Set<string>();

  for (let s = 0; s < sectionHeaders.length; s++) {
    const startIdx = sectionHeaders[s].headerStartIdx;
    const endIdx = s + 1 < sectionHeaders.length ? sectionHeaders[s + 1].headerStartIdx : lines.length;
    const blockLines = lines.slice(startIdx, endIdx);
    const key = cleanCategoryName(sectionHeaders[s].catName);
    if (key) {
      sections.push({
        key,
        catName: sectionHeaders[s].catName,
        block: blockLines.join('\n')
      });
    }
    for (const bl of blockLines) {
      const m = bl.match(/^(\d{3,8})\s*[-–—]/);
      if (m) staffIds.add(m[1]);
    }
  }

  return { preambleLines, sections, staffIds };
};

export const mergeStaffCategoryReportSections = (prevRaw: string, nextRaw: string): string => {
  if (!nextRaw || !nextRaw.trim()) return '';
  if (!prevRaw || !prevRaw.trim()) return nextRaw;
  if (prevRaw.trim() === nextRaw.trim()) return nextRaw;

  const prevParsed = parseReportSections(prevRaw);
  const nextParsed = parseReportSections(nextRaw);

  // Only merge if both are multi-section Format 1 BI reports
  if (prevParsed.sections.length === 0 || nextParsed.sections.length === 0) {
    return nextRaw;
  }

  // Ensure both reports belong to the same store (share staff IDs)
  if (prevParsed.staffIds.size > 0 && nextParsed.staffIds.size > 0) {
    let sharedCount = 0;
    for (const id of nextParsed.staffIds) {
      if (prevParsed.staffIds.has(id)) sharedCount++;
    }
    if (sharedCount === 0) {
      return nextRaw;
    }
  }

  const nextMap = new Map<string, { key: string; catName: string; block: string }>();
  for (const sec of nextParsed.sections) {
    nextMap.set(sec.key, sec);
  }

  // If nextRaw already covers all categories in prevRaw, return nextRaw directly
  const missingFromNext = prevParsed.sections.filter(sec => !nextMap.has(sec.key));
  if (missingFromNext.length === 0) {
    return nextRaw;
  }

  // Merge: keep updated sections in place and append any new sections from nextRaw
  const usedKeys = new Set<string>();
  const mergedBlocks: string[] = [];

  for (const prevSec of prevParsed.sections) {
    if (nextMap.has(prevSec.key)) {
      mergedBlocks.push(nextMap.get(prevSec.key)!.block);
      usedKeys.add(prevSec.key);
    } else {
      mergedBlocks.push(prevSec.block);
      usedKeys.add(prevSec.key);
    }
  }

  for (const nextSec of nextParsed.sections) {
    if (!usedKeys.has(nextSec.key)) {
      mergedBlocks.push(nextSec.block);
      usedKeys.add(nextSec.key);
    }
  }

  const preamble = (nextParsed.preambleLines.length > 0 ? nextParsed.preambleLines : prevParsed.preambleLines).join('\n');
  return preamble ? `${preamble}\n${mergedBlocks.join('\n')}` : mergedBlocks.join('\n');
};

export const getCategoryGroupType = (catName: string, categoryConfig?: CategoryConfigItem[]): 'ICT' | 'DỊCH VỤ' | 'CE' => {
  if (!catName) return 'CE';
  
  if (categoryConfig && categoryConfig.length > 0) {
    const match = findMatchingCategoryConfig(catName, categoryConfig);
    if (match) {
      if (match.group === 'ICT') return 'ICT';
      if (match.group === 'DỊCH VỤ' || match.group === 'DICH_VU') return 'DỊCH VỤ';
      return 'CE';
    }
  }

  const norm = removeAccentsLocal(catName).toLowerCase().trim();

  // 1. NHÓM DỊCH VỤ / VAS / TRẢ CHẬM
  if (
    norm.includes('credit') ||
    norm.includes('shinhan') ||
    norm.includes('finance') ||
    norm.includes('vi tra sau') ||
    norm.includes('cake') ||
    norm.includes('ngan hang') ||
    norm.includes('vpbank') ||
    norm.includes('tpbank') ||
    norm.includes('bao hiem') ||
    norm.includes('sim') ||
    norm.includes('vas') ||
    norm.includes('tra cham') ||
    norm.includes('vay tien') ||
    norm.includes('nap rut') ||
    norm.includes('dich vu') ||
    norm.includes('mango') ||
    norm.includes('icallme') ||
    norm.includes('icall')
  ) {
    return 'DỊCH VỤ';
  }

  // 2. NHÓM ICT (Điện thoại, Smartphone, Tablet, Laptop, Đồng hồ, Phụ kiện, Camera, Tai nghe, Pin...)
  if (
    norm.includes('dien thoai') ||
    norm.includes('smartphone') ||
    norm.includes('tablet') ||
    norm.includes('vivo') ||
    norm.includes('realme') ||
    norm.includes('phu kien') ||
    norm.includes('dong ho') ||
    norm.includes('camera') ||
    norm.includes('pin du phong') ||
    norm.includes('pin sac') ||
    norm.includes('tai nghe') ||
    norm.includes('bluetooth') ||
    norm.includes('laptop') ||
    norm.includes('macbook') ||
    norm === 'loa' ||
    norm.startsWith('loa ') ||
    norm.includes(' am thanh')
  ) {
    return 'ICT';
  }

  // 3. NHÓM CE (Gia dụng, Nồi cơm, Quạt, Máy lọc nước, Máy lạnh, Tủ lạnh, Máy giặt, Máy sấy, Điện tử...)
  return 'CE';
};

export const EXACT_CATEGORY_ORDER: string[] = [
  "dienthoaitabletandroid",
  "dienthoairealme",
  "dienthoaivivo",
  "donghophukien",
  "doanhthudongho",
  "loa",
  "laptop",
  "camera",
  "simtong",
  "simmobifonevinaphonesimdmx",
  "baohiem",
  "baohiemthodienmayxanh",
  "trachamhomecredit",
  "fecreditshinhansamsungfinance",
  "trachamdienmayvagiadung",
  "vitrasau",
  "chovaytienmat",
  "dichvuvas",
  "napruttientaikhoannganhang",
  "ottmangoicallme",
  "mangoplusicallme",
  "mothetindungtpbankevovavpbankmwg",
  "hisense",
  "dientu",
  "dientusamsung",
  "maygiat",
  "maysaymayruachen",
  "cehanghaiermaylanhaqua",
  "maylanhcasper",
  "maylanhnagakawa",
  "dientudienlanhdiengiadunghanglg",
  "dacquyenmaygiattulanhmaylanhsamsung",
  "tulanhdudongtumat",
  "maylocnuoc",
  "noicom",
  "quatgio",
  "maylockhongkhihutamhutbui"
];

export const getCustomCategoryIndex = (catName: string, categoryConfig?: CategoryConfigItem[]): number => {
  if (!catName) return 999;
  
  if (categoryConfig && categoryConfig.length > 0) {
    const match = findMatchingCategoryConfig(catName, categoryConfig);
    if (match) {
      const groupOrder = getCategoryGroupSortOrder(catName, categoryConfig);
      const idx = categoryConfig.indexOf(match);
      if (idx !== -1) return groupOrder * 1000 + idx;
    }
  }
  
  const clean = removeAccentsLocal(catName).toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const idx = EXACT_CATEGORY_ORDER.findIndex(k => clean === k || clean.includes(k) || k.includes(clean));
  if (idx !== -1) {
    const groupOrder = getCategoryGroupSortOrder(catName, categoryConfig);
    return groupOrder * 1000 + idx;
  }
  
  return 5000 + getCategoryGroupSortOrder(catName, categoryConfig) * 10;
};

export const getCategoryGroupSortOrder = (catName: string, categoryConfig?: CategoryConfigItem[]): number => {
  const group = getCategoryGroupType(catName, categoryConfig);
  if (group === 'ICT') return 1;
  if (group === 'DỊCH VỤ' || group === 'DICH_VU') return 2;
  return 3; // CE
};

export const getCategoryBadgeStyleClasses = (catName: string, categoryConfig?: CategoryConfigItem[]): { bgText: string; hover: string; gradient: string } => {
  const group = getCategoryGroupType(catName, categoryConfig);
  if (group === 'ICT') {
    // Soft amber/gold gradient - light tone
    return { bgText: 'text-amber-900', hover: 'hover:bg-[#fef3c7]', gradient: 'linear-gradient(135deg, #fef9c3, #fde68a, #fcd34d)' };
  }
  if (group === 'DỊCH VỤ' || group === 'DICH_VU') {
    // Soft emerald gradient - light tone
    return { bgText: 'text-emerald-900', hover: 'hover:bg-[#d1fae5]', gradient: 'linear-gradient(135deg, #d1fae5, #a7f3d0, #6ee7b7)' };
  }
  // CE - Soft blue gradient - light tone
  return { bgText: 'text-blue-900', hover: 'hover:bg-[#dbeafe]', gradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe, #93c5fd)' };
};

const cleanNumLocal = (s: string | undefined): number => {
  if (!s) return 0;
  let str = String(s).trim();
  if (!str || str === '—' || str === '-') return 0;
  str = str.replace(/%/g, '').replace(/\+/g, '').trim();
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const parts = str.split(',');
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (lastDot !== -1) {
    const parts = str.split('.');
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      str = str.replace(/\./g, '');
    }
  }
  const n = parseFloat(str.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

export const parseStaffMatrixDataRefined = (
  input: string, 
  staffCount: number, 
  categoryTargets: any[], 
  luykeCategories: CategoryData[], 
  daysPassed: number, 
  totalDays: number,
  sortAlpha: boolean = false,
  categoryConfig?: CategoryConfigItem[]
): { staffMatrix: StaffMatrixData[], categories: string[], results: StaffMatrixData[], categoryTypes?: Record<string, 'SL' | 'DT'> } => {
  const raw = (input || '').trim();
  if (!raw) return { staffMatrix: [], categories: [], results: [], categoryTypes: {} };

  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !isUiNoiseLine(l));
  if (lines.length === 0) return { staffMatrix: [], categories: [], results: [], categoryTypes: {} };

  // ========================================================
  // FORMAT 1: Section-by-Section BI Report (Inline header, 2-line header, or vertical header)
  // ========================================================
  const sectionIndices: DetectedSectionHeader[] = [];
  for (let i = 0; i < lines.length; i++) {
    const detected = detectSectionHeaderAt(lines, i);
    if (detected) {
      sectionIndices.push(detected);
      if (detected.dataStartIdx > i + 1) {
        i = detected.dataStartIdx - 1;
      }
    }
  }

  // Fallback: If no header lines were found, detect category names followed directly by staff rows
  if (sectionIndices.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const lCols = splitReportCols(l);
      if (lCols.length === 1 && l.length >= 2 && !isEmpNameStr(l) && !isNonStaffName(l) && !l.toUpperCase().startsWith('TỔNG')) {
        if (i + 1 < lines.length) {
          const nextParts = splitReportCols(lines[i + 1]);
          if (nextParts.length >= 2 && isEmpNameStr(nextParts[0]) && /^-?[\d,.]+%?$/.test(nextParts[1])) {
            sectionIndices.push({
              lineIdx: i,
              headerStartIdx: i,
              dataStartIdx: i + 1,
              catName: l,
              type: 'DT'
            });
          }
        }
      }
    }
  }

  if (sectionIndices.length > 0) {
    const inputCategories: string[] = [];
    const categoryTypes: Record<string, 'SL' | 'DT'> = {};
    const staffMap = new Map<string, { id: string; name: string; shortName: string; displayName: string; values: Record<string, number> }>();

    for (let s = 0; s < sectionIndices.length; s++) {
      const sec = sectionIndices[s];
      const catName = sec.catName;
      const cleanCat = cleanCategoryName(catName);
      if (!cleanCat) continue;

      if (!inputCategories.some(existing => cleanCategoryName(existing) === cleanCat)) {
        inputCategories.push(catName);
      }
      categoryTypes[cleanCat] = sec.type;

      const startLine = sec.dataStartIdx;
      const endLine = s + 1 < sectionIndices.length ? sectionIndices[s + 1].headerStartIdx : lines.length;

      for (let i = startLine; i < endLine; i++) {
        const line = lines[i];
        const parts = splitReportCols(line);
        if (parts.length === 0) continue;

        // Skip TỔNG / TỔNG CỘNG rows safely without consuming the Rank 1 employee row on the next line
        if (/^(TỔNG|TỔNG CỘNG|TOTAL)$/i.test(parts[0])) {
          if (
            parts.length === 1 &&
            i + 1 < endLine &&
            !isEmpNameStr(lines[i + 1]) &&
            /^[\d\s,.\-+/%|\t]+$/.test(lines[i + 1])
          ) {
            i++;
          }
          continue;
        }

        // Skip non-staff rows (such as "online - Online - 18001060") and any orphan numeric line below them
        if (isNonStaffName(parts[0])) {
          if (
            parts.length === 1 &&
            i + 1 < endLine &&
            !isEmpNameStr(lines[i + 1]) &&
            /^[\d\s,.\-+/%|\tA-Z]+$/i.test(lines[i + 1])
          ) {
            i++;
          }
          continue;
        }

        let nameStr = '';
        let val = 0;
        let hasVal = false;

        if (parts.length >= 2) {
          const empColIdx = parts.findIndex(p => isEmpNameStr(p) && !isNonStaffName(p));
          if (empColIdx !== -1 && empColIdx + 1 < parts.length) {
            nameStr = parts[empColIdx];
            // Mandatory rule: value column is always immediately after the employee name column
            val = cleanNumLocal(parts[empColIdx + 1]);
            hasVal = true;
          }
        } else if (isEmpNameStr(parts[0]) && !isNonStaffName(parts[0])) {
          nameStr = parts[0];
          if (i + 1 < endLine && !isEmpNameStr(lines[i + 1])) {
            const nextParts = splitReportCols(lines[i + 1]);
            if (nextParts.length > 0 && /^-?[\d,.]+%?$/.test(nextParts[0])) {
              val = cleanNumLocal(nextParts[0]);
              hasVal = true;
              i++;
            }
          }
        }

        if (nameStr && hasVal) {
          if (isNonStaffName(nameStr)) continue;
          const { id, name, shortName } = extractStaffNameAndId(nameStr);
          if ((!id && !name) || isNonStaffName(name) || isNonStaffName(id)) continue;

          const cleanId = id ? id.trim().toLowerCase() : '';
          const cleanName = name ? name.trim().toLowerCase() : '';

          let targetKey = '';
          if (cleanId && staffMap.has(cleanId)) {
            targetKey = cleanId;
          } else if (cleanName && staffMap.has(cleanName)) {
            targetKey = cleanName;
          } else {
            for (const [k, existing] of staffMap.entries()) {
              if (cleanId && existing.id && existing.id.trim().toLowerCase() === cleanId) {
                targetKey = k;
                break;
              }
              if (cleanName && existing.name && existing.name.trim().toLowerCase() === cleanName) {
                targetKey = k;
                break;
              }
            }
          }

          if (!targetKey) {
            targetKey = cleanId || cleanName;
            staffMap.set(targetKey, {
              id,
              name,
              shortName,
              displayName: id ? `${id} - ${name.toUpperCase()}` : name.toUpperCase(),
              values: {}
            });
          }

          const staffObj = staffMap.get(targetKey)!;
          if (!staffObj.id && id) {
            staffObj.id = id;
            staffObj.displayName = `${id} - ${staffObj.name.toUpperCase()}`;
          }
          if (!staffObj.shortName && shortName) {
            staffObj.shortName = shortName;
          }

          // Ghi nhận giá trị chuẩn theo ngành hàng (không cộng dồn trùng khi báo cáo được dán/merge lại)
          const roundedVal = Math.round(val * 1000) / 1000;
          staffObj.values[cleanCat] = roundedVal;
          if (categoryConfig && categoryConfig.length > 0) {
            const matchingCfg = findMatchingCategoryConfig(catName, categoryConfig);
            if (matchingCfg) {
              const matchClean = cleanCategoryName(matchingCfg.name);
              if (matchClean && matchClean !== cleanCat) {
                staffObj.values[matchClean] = roundedVal;
                if (!categoryTypes[matchClean]) {
                  categoryTypes[matchClean] = sec.type;
                }
              }
            }
          }
        }
      }
    }

    // Enrich categoryTypes from luykeCategories and categoryTargets in addition to thiDuaNv section headers
    if (luykeCategories && luykeCategories.length > 0) {
      luykeCategories.forEach(c => {
        const clean = cleanCategoryName(c.name);
        if (clean && (c.type === 'SL' || c.type === 'DT') && !categoryTypes[clean]) {
          categoryTypes[clean] = c.type;
        }
      });
    }
    if (categoryTargets && categoryTargets.length > 0) {
      categoryTargets.forEach((t: any) => {
        const clean = cleanCategoryName(t?.name || '');
        if (clean && (t?.type === 'SL' || t?.type === 'DT') && !categoryTypes[clean]) {
          categoryTypes[clean] = t.type;
        }
      });
    }

    // Resolve categories across all valid sources (categoryConfig, luykeCategories, categoryTargets, inputCategories)
    let resolvedCategories: string[] = [];
    const addUniqueCategory = (catName: string) => {
      if (!catName || isNonCategoryNoiseLine(catName)) return;
      const clean = cleanCategoryName(catName);
      if (!clean) return;
      const alreadyCovered = resolvedCategories.some(rc => isSameCategoryClean(cleanCategoryName(rc), clean));
      if (!alreadyCovered) {
        resolvedCategories.push(catName);
      }
    };

    if (categoryConfig && categoryConfig.length > 0) {
      // MASTER LIST from TNB Leader: Tên ngành hàng và thứ tự chuẩn theo cấu hình bên TNB Leader
      categoryConfig.forEach(c => addUniqueCategory(c.name));
      // Bổ sung các ngành hàng hợp lệ từ luykeCategories, categoryTargets và Thi Đua NV chưa có trong categoryConfig để không bao giờ bị sót ngành hàng
      if (luykeCategories && luykeCategories.length > 0) {
        luykeCategories.forEach(c => addUniqueCategory(c.name));
      }
      if (categoryTargets && categoryTargets.length > 0) {
        categoryTargets.forEach((t: any) => addUniqueCategory(t?.name || ''));
      }
      inputCategories.forEach(catName => addUniqueCategory(catName));
    } else {
      if (luykeCategories && luykeCategories.length > 0) {
        luykeCategories.forEach(c => addUniqueCategory(c.name));
      }
      if (categoryTargets && categoryTargets.length > 0) {
        categoryTargets.forEach((t: any) => addUniqueCategory(t?.name || ''));
      }
      inputCategories.forEach(catName => addUniqueCategory(catName));

      // Loại bỏ các ngành hàng rác, chuỗi thuần số hoặc không chứa chữ cái
      resolvedCategories = resolvedCategories.filter(catName => {
        if (!catName || !/[a-zA-Zà-ỹÀ-Ỹ]/.test(catName)) return false;
        if (/^[\d\s,.\-+/%:()]+$/.test(catName)) return false;
        return true;
      });
    }

    // Ensure categoryTypes has canonical clean keys for all resolvedCategories
    resolvedCategories.forEach(catName => {
      const clean = cleanCategoryName(catName);
      if (!clean || categoryTypes[clean]) return;
      for (const [k, v] of Object.entries(categoryTypes)) {
        if (isSameCategoryClean(clean, k)) {
          categoryTypes[clean] = v;
          break;
        }
      }
    });

    if (sortAlpha) {
      resolvedCategories.sort((a, b) => a.localeCompare(b, 'vi'));
    } else if (!categoryConfig || categoryConfig.length === 0) {
      resolvedCategories.sort((a, b) => getCustomCategoryIndex(a, categoryConfig) - getCustomCategoryIndex(b, categoryConfig));
    }

    const targetPerStaffPerCat: Record<string, number> = {};
    resolvedCategories.forEach(catName => {
      const clean = cleanCategoryName(catName);
      const baseTarget = resolveCategoryBaseTarget(catName, categoryTargets, luykeCategories);
      targetPerStaffPerCat[clean] = staffCount > 0 ? baseTarget / staffCount : baseTarget;
    });

    const staffMatrixResults: StaffMatrixData[] = Array.from(staffMap.values())
      .filter(staff => !isNonStaffName(staff.displayName) && !isNonStaffName(staff.name) && !isNonStaffName(staff.id))
      .map(staff => {
      const values: number[] = [];
      const projectedRates: number[] = [];
      const actualPercentHTs: number[] = [];
      let achievedCount = 0;

      resolvedCategories.forEach(catName => {
        const cleanName = cleanCategoryName(catName);
        let accumulated = staff.values[cleanName];
        if (accumulated === undefined) {
          for (const [k, v] of Object.entries(staff.values)) {
            if (isSameCategoryClean(cleanName, k)) {
              accumulated = v;
              break;
            }
          }
        }
        accumulated = accumulated ?? 0;
        values.push(accumulated);

        const target = targetPerStaffPerCat[cleanName] || 0;
        let actualRate = 0;
        if (target > 0) {
          actualRate = (accumulated / target) * 100;
        } else if (accumulated > 0) {
          actualRate = 100;
        }
        actualPercentHTs.push(actualRate);

        let projectedRate = 0;
        if (target > 0 && daysPassed > 0) {
          projectedRate = ((accumulated / daysPassed) * totalDays) / target * 100;
        } else {
          projectedRate = actualRate;
        }
        projectedRates.push(projectedRate);

        const effectiveRate = daysPassed > 0 ? projectedRate : actualRate;
        if (Math.round(effectiveRate) >= 100) achievedCount++;
      });

      return {
        displayName: staff.displayName,
        fullId: staff.id,
        shortName: `${staff.id} - ${staff.shortName}`,
        name: staff.name,
        achieved: achievedCount,
        achievedCount,
        totalCats: resolvedCategories.length,
        rate: resolvedCategories.length > 0 ? achievedCount / resolvedCategories.length : 0,
        rawValues: values,
        valuesMap: staff.values,
        projectedRates,
        actualPercentHTs
      } as any;
    });

    return { staffMatrix: staffMatrixResults, categories: resolvedCategories, results: staffMatrixResults, categoryTypes };
  }

  // ========================================================
  // FORMAT 2 & 3: 2D Matrix Table or "Phòng ban" 1D Table
  // ========================================================
  let is2DTable = false;
  let headerLineIdx = -1;
  let firstEmpLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    if (parts.some(p => isEmpNameStr(p))) {
      firstEmpLineIdx = i;
      break;
    }
  }

  if (firstEmpLineIdx > 0) {
    const prevParts = lines[firstEmpLineIdx - 1].split('\t').map(p => p.trim());
    if (prevParts.length >= 2) {
      is2DTable = true;
      headerLineIdx = firstEmpLineIdx - 1;
      if (firstEmpLineIdx >= 2) {
        const lineMinus2Parts = lines[firstEmpLineIdx - 2].split('\t').map(p => p.trim());
        if (lineMinus2Parts.length >= 2 && lineMinus2Parts.some(p => p.length > 2 && !/^(DTLK|SLLK|SL|DT|Realtime|\s)+$/i.test(p))) {
          headerLineIdx = firstEmpLineIdx - 2;
        }
      }
    }
  }

  let inputCategories: string[] = [];
  const categoryToColIdx: Map<string, number> = new Map();
  const rawStaffResults: { id: string; name: string; shortName: string; parts: number[] }[] = [];

  const addOrAccumulateStaffResult = (id: string, name: string, shortName: string, rawInputValues: number[]) => {
    if ((!id && !name) || isNonStaffName(name) || isNonStaffName(id) || isNonStaffName(shortName)) return;
    const cleanId = id ? id.trim().toLowerCase() : '';
    const cleanName = name ? name.trim().toLowerCase() : '';

    const existing = rawStaffResults.find(s =>
      (cleanId && s.id && s.id.trim().toLowerCase() === cleanId) ||
      (cleanName && s.name && s.name.trim().toLowerCase() === cleanName)
    );

    if (existing) {
      if (!existing.id && id) existing.id = id;
      if (!existing.shortName && shortName) existing.shortName = shortName;
      const maxLen = Math.max(existing.parts.length, rawInputValues.length);
      for (let c = 0; c < maxLen; c++) {
        const v1 = existing.parts[c] || 0;
        const v2 = rawInputValues[c] || 0;
        existing.parts[c] = Math.round((v1 + v2) * 1000) / 1000;
      }
    } else {
      rawStaffResults.push({
        id,
        name,
        shortName,
        parts: [...rawInputValues]
      });
    }
  };

  if (is2DTable && headerLineIdx !== -1) {
    const headerParts = lines[headerLineIdx].split('\t').map(p => p.trim());
    
    const empParts = lines[firstEmpLineIdx].split('\t').map(p => p.trim());
    let empColIdx = empParts.findIndex(p => isEmpNameStr(p));
    if (empColIdx === -1) empColIdx = 0;

    let colPos = 0;
    for (let c = empColIdx + 1; c < headerParts.length; c++) {
      let catName = headerParts[c];
      if (!catName || /^[\d\s,.-]+$/.test(catName) || /^(DTLK|SLLK|SL|DT|Realtime|\s)+$/i.test(catName)) {
        colPos++;
        continue;
      }

      const lowerCatName = catName.toLowerCase();
      const normCat = lowerCatName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      const isExcluded = excludedKeywords.some(ex => lowerCatName.includes(ex)) ||
        ((lowerCatName.includes('tổng') || lowerCatName.includes('tong')) && cleanCategoryName(catName) !== 'simtong') ||
        normCat.includes('doanh thu') || normCat.includes('dtqd') || normCat.includes('thu nhap') || normCat.includes('gio cong') || normCat.includes('ty le');

      if (isExcluded) {
        colPos++;
        continue;
      }

      const targetMatch = catName.match(/(.+?)\bTARGET\b/i);
      if (targetMatch) catName = targetMatch[1].trim();

      const cleanName = cleanCategoryName(catName);
      if (cleanName && !categoryToColIdx.has(cleanName)) {
        categoryToColIdx.set(cleanName, colPos);
        inputCategories.push(catName);
      }
      if (categoryConfig && categoryConfig.length > 0) {
        const match = findMatchingCategoryConfig(catName, categoryConfig);
        if (match) {
          const matchClean = cleanCategoryName(match.name);
          if (matchClean && !categoryToColIdx.has(matchClean)) {
            categoryToColIdx.set(matchClean, colPos);
          }
        }
      }
      colPos++;
    }

    for (let i = firstEmpLineIdx; i < lines.length; i++) {
      const parts = lines[i].split('\t').map(p => p.trim());
      let nameIdx = parts.findIndex(p => isEmpNameStr(p));
      if (nameIdx === -1) continue;

      const namePart = parts[nameIdx];
      if (isNonStaffName(namePart)) continue;
      const { name, id, shortName } = extractStaffNameAndId(namePart);
      if ((!id && !name) || isNonStaffName(name) || isNonStaffName(id)) continue;

      const rawInputValues = parts.slice(nameIdx + 1).map(v => {
        if (!v || v.trim() === '') return 0;
        const clean = v.replace(/,/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      });

      addOrAccumulateStaffResult(id, name, shortName, rawInputValues);
    }
  } else {
    // Format 3: "Phòng ban" single column header
    let headerStartIdx = -1;
    let dataStartIdx = -1;
    let colPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineTrim = lines[i].toLowerCase().trim();
      if (lineTrim === 'phòng ban' || lineTrim === 'phong ban' || lineTrim.startsWith('phòng ban') || lineTrim.startsWith('phong ban')) {
        headerStartIdx = i;
        continue;
      }
      if (headerStartIdx !== -1 && isEmpNameStr(lines[i])) {
        dataStartIdx = i;
        break;
      }
      if (headerStartIdx !== -1) {
        let catName = lines[i].trim();
        const isColumnTypesLine = /^(DTLK|SLLK|SL|DT|Realtime|REALTIME|\s)+$/i.test(catName);
        const isOnlyNumbers = /^[\d\s,.-]+$/.test(catName);
        const lowerCatName = catName.toLowerCase();
        const isExcluded = excludedKeywords.some(ex => lowerCatName.includes(ex)) ||
          ((lowerCatName.includes('tổng') || lowerCatName.includes('tong')) && cleanCategoryName(catName) !== 'simtong');

        if (isColumnTypesLine || isOnlyNumbers || isExcluded) {
          colPosition++;
          continue;
        }

        const targetMatch = catName.match(/(.+?)\bTARGET\b/i);
        if (targetMatch) catName = targetMatch[1].trim();
        
        const cleanName = cleanCategoryName(catName);
        if (!categoryToColIdx.has(cleanName)) {
          categoryToColIdx.set(cleanName, colPosition);
        }
        inputCategories.push(catName);
        colPosition++;
      }
    }

    const dataLines = dataStartIdx !== -1 ? lines.slice(dataStartIdx) : lines.filter(l => isEmpNameStr(l));

    for (const line of dataLines) {
      let parts = line.split('\t').map(p => p.trim());
      if (parts.length < 3) {
        parts = line.split(/ {2,}/).map(p => p.trim()).filter(p => p.length > 0);
      }
      let nameIdx = parts.findIndex(p => isEmpNameStr(p));
      if (nameIdx === -1) continue;

      const namePart = parts[nameIdx];
      if (isNonStaffName(namePart)) continue;
      const { name, id, shortName } = extractStaffNameAndId(namePart);
      if ((!id && !name) || isNonStaffName(name) || isNonStaffName(id)) continue;

      const rawInputValues = parts.slice(nameIdx + 1).map(v => {
        if (!v || v.trim() === '') return 0;
        const clean = v.replace(/,/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      });

      addOrAccumulateStaffResult(id, name, shortName, rawInputValues);
    }
  }

  let resolvedCategories: string[] = [];
  if (categoryConfig && categoryConfig.length > 0) {
    // MASTER LIST from TNB Leader: Tên ngành hàng và thứ tự chuẩn theo cấu hình bên TNB Leader
    resolvedCategories = categoryConfig.map(c => c.name);
  } else {
    const seenCat = new Set<string>();
    if (luykeCategories && luykeCategories.length > 0) {
      luykeCategories.forEach(c => {
        const clean = cleanCategoryName(c.name);
        if (clean && !seenCat.has(clean)) {
          seenCat.add(clean);
          resolvedCategories.push(c.name);
        }
      });
      inputCategories.forEach(catName => {
        const clean = cleanCategoryName(catName);
        if (clean && !seenCat.has(clean)) {
          seenCat.add(clean);
          resolvedCategories.push(catName);
        }
      });
    } else if (categoryTargets && categoryTargets.length > 0) {
      categoryTargets.forEach(t => {
        const clean = cleanCategoryName(t.name);
        if (clean && !seenCat.has(clean)) {
          seenCat.add(clean);
          resolvedCategories.push(t.name);
        }
      });
      inputCategories.forEach(catName => {
        const clean = cleanCategoryName(catName);
        if (clean && !seenCat.has(clean)) {
          seenCat.add(clean);
          resolvedCategories.push(catName);
        }
      });
    } else {
      inputCategories.forEach(catName => {
        const clean = cleanCategoryName(catName);
        if (clean && !seenCat.has(clean)) {
          seenCat.add(clean);
          resolvedCategories.push(catName);
        }
      });
    }

    // Loại bỏ các ngành hàng rác, chuỗi thuần số hoặc không chứa chữ cái
    resolvedCategories = resolvedCategories.filter(catName => {
      if (!catName || !/[a-zA-Zà-ỹÀ-Ỹ]/.test(catName)) return false;
      if (/^[\d\s,.\-+/%:()]+$/.test(catName)) return false;
      return true;
    });
  }

  if (sortAlpha) {
    resolvedCategories.sort((a, b) => a.localeCompare(b, 'vi'));
  } else if (!categoryConfig || categoryConfig.length === 0) {
    resolvedCategories.sort((a, b) => getCustomCategoryIndex(a, categoryConfig) - getCustomCategoryIndex(b, categoryConfig));
  }

  const targetPerStaffPerCat: Record<string, number> = {};
  resolvedCategories.forEach(catName => {
    const clean = cleanCategoryName(catName);
    const baseTarget = resolveCategoryBaseTarget(catName, categoryTargets, luykeCategories);
    targetPerStaffPerCat[clean] = staffCount > 0 ? baseTarget / staffCount : baseTarget;
  });

  const results: StaffMatrixData[] = [];

  for (const staffRow of rawStaffResults) {
    if (isNonStaffName(staffRow.name) || isNonStaffName(staffRow.id) || isNonStaffName(staffRow.shortName)) continue;
    const rawInputValues = staffRow.parts || [];
    const values: number[] = [];
    const valuesMap: Record<string, number> = {};
    const projectedRates: number[] = [];
    const actualPercentHTs: number[] = [];
    let achievedCount = 0;

    resolvedCategories.forEach((catName) => {
      const cleanName = cleanCategoryName(catName);
      let colIdx = categoryToColIdx.get(cleanName);
      if (colIdx === undefined) {
        for (const [k, v] of categoryToColIdx.entries()) {
          if (isSameCategoryClean(cleanName, k)) {
            colIdx = v;
            break;
          }
        }
      }
      const accumulated = (colIdx !== undefined && colIdx < rawInputValues.length) ? (rawInputValues[colIdx] || 0) : 0;
      values.push(accumulated);
      valuesMap[cleanName] = accumulated;

      const target = targetPerStaffPerCat[cleanName] || 0;
      
      let actualRate = 0;
      if (target > 0) {
        actualRate = (accumulated / target) * 100;
      } else if (accumulated > 0) {
        actualRate = 100;
      }
      actualPercentHTs.push(actualRate);
      
      let projectedRate = 0;
      if (target > 0 && daysPassed > 0) {
        projectedRate = ((accumulated / daysPassed) * totalDays) / target * 100;
      } else {
        projectedRate = actualRate;
      }
      projectedRates.push(projectedRate);
      
      const effectiveRate = daysPassed > 0 ? projectedRate : actualRate;
      if (Math.round(effectiveRate) >= 100) achievedCount++;
    });

    results.push({
      displayName: `${staffRow.id} - ${staffRow.name.toUpperCase()}`,
      fullId: staffRow.id,
      shortName: `${staffRow.id} - ${staffRow.shortName}`,
      name: staffRow.name,
      achieved: achievedCount,
      achievedCount: achievedCount,
      totalCats: resolvedCategories.length,
      rate: resolvedCategories.length > 0 ? achievedCount / resolvedCategories.length : 0, 
      rawValues: values,
      valuesMap,
      projectedRates,
      actualPercentHTs
    } as any);
  }

  return { staffMatrix: results, categories: resolvedCategories, results, categoryTypes: {} };
};


interface SummaryThiDuaTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  selectedStaffIds?: string[];
  categoryTargets: any[];
  luykeCategories: CategoryData[];
  categoryConfig?: CategoryConfigItem[];
}

const renderCategoryHeaderIcon = (catName: string, group: 'ICT' | 'DỊCH VỤ' | 'CE') => {
  const norm = removeAccentsLocal(catName || '').toLowerCase();
  const iconClass = group === 'ICT'
    ? 'text-[#B45309]'
    : group === 'DỊCH VỤ'
      ? 'text-[#047857]'
      : 'text-[#1D4ED8]';

  if (norm.includes('iphone') || norm.includes('dien thoai') || norm.includes('vivo') || norm.includes('realme') || norm.includes('oppo') || norm.includes('samsung') || norm.includes('xiaomi') || norm.includes('honor')) {
    return <Smartphone size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('tablet') || norm.includes('doc sach') || norm.includes('ipad')) {
    return <Tablet size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('laptop') || norm.includes('macbook') || norm.includes('pc')) {
    return <Laptop size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('camera')) {
    return <Camera size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('tai nghe') || norm.includes('audio') || norm.includes('loa') || norm.includes('mic')) {
    return <Headphones size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('cap') || norm.includes('sac') || norm.includes('phu kien') || norm.includes('pin')) {
    return <BatteryCharging size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('dong ho') || norm.includes('watch')) {
    return <Watch size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('bao hiem')) {
    return <Shield size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('sim')) {
    return <Wifi size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('nap') || norm.includes('rut') || norm.includes('vay') || norm.includes('tra cham') || norm.includes('the tin dung') || norm.includes('vi tra sau') || norm.includes('homecredit') || norm.includes('fecredit') || norm.includes('shinhan')) {
    return <CreditCard size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('vas') || norm.includes('dich vu')) {
    return <Zap size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('tivi') || norm.includes('tv') || norm.includes('dien tu') || norm.includes('tcl')) {
    return <Tv size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('may lanh') || norm.includes('quat') || norm.includes('dieu hoa')) {
    return <Wind size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('loc nuoc') || norm.includes('nuoc nong') || norm.includes('ferroli')) {
    return <Droplets size={13} className={iconClass} strokeWidth={2.3} />;
  }
  if (norm.includes('noi') || norm.includes('bep') || norm.includes('gia dung') || norm.includes('sunhouse') || norm.includes('hut bui') || norm.includes('may giat') || norm.includes('may say') || norm.includes('tu lanh')) {
    return <Flame size={13} className={iconClass} strokeWidth={2.3} />;
  }

  if (group === 'ICT') return <Monitor size={13} className={iconClass} strokeWidth={2.3} />;
  if (group === 'DỊCH VỤ') return <Settings size={13} className={iconClass} strokeWidth={2.3} />;
  return <ShoppingCart size={13} className={iconClass} strokeWidth={2.3} />;
};

const SummaryThiDuaTable: React.FC<SummaryThiDuaTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  selectedStaffIds,
  categoryTargets,
  luykeCategories,
  categoryConfig
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'ACHIEVED' | 'UNACHIEVED'>('ALL');
  const [displayLimit, setDisplayLimit] = useState<number | 'ALL'>('ALL');
  const [isCompactView, setIsCompactView] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedComment, setCopiedComment] = useState(false);
  const [commentTemplate, setCommentTemplate] = useState<1 | 2 | 3>(1);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const [lastUpdatedStr, setLastUpdatedStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });

  React.useEffect(() => {
    const now = new Date();
    setLastUpdatedStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`);
  }, [thiDuaNv, luyKeNganhHang, categoryTargets, luykeCategories]);

  React.useEffect(() => {
    if (!isCatDropdownOpen && !isGroupDropdownOpen && !isSortDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCatDropdownOpen(false);
        setIsGroupDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCatDropdownOpen, isGroupDropdownOpen, isSortDropdownOpen]);

  const { userProfile } = useAuth();
  const { setCategoryTargets, saveLuykeData, activeStore } = useLuykeData();
  const isAdmin = userProfile?.username === '43751';

  const [draggedCat, setDraggedCat] = useState<string | null>(null);

  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = yesterdayObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  const handleDragStart = (e: React.DragEvent, catName: string) => {
    e.dataTransfer.setData('text/plain', catName);
    setDraggedCat(catName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetCatName: string) => {
    e.preventDefault();
    const sourceCatName = e.dataTransfer.getData('text/plain') || draggedCat;
    if (!sourceCatName || sourceCatName === targetCatName) return;

    const newTargets = [...categoryTargets];
    const sourceClean = cleanCategoryName(sourceCatName);
    const targetClean = cleanCategoryName(targetCatName);
    const sourceIdx = newTargets.findIndex(t => cleanCategoryName(t.name) === sourceClean);
    const targetIdx = newTargets.findIndex(t => cleanCategoryName(t.name) === targetClean);
    
    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [removed] = newTargets.splice(sourceIdx, 1);
      newTargets.splice(targetIdx, 0, removed);
      
      setCategoryTargets(newTargets);
      
      if (saveLuykeData) {
        await saveLuykeData(false, 'targets', activeStore, newTargets);
      }
    }
    setDraggedCat(null);
  };
  
  const [isCatsSortedAlpha, setIsCatsSortedAlpha] = useState(false);
  const [sortColumn, setSortColumn] = useState<{
    type: 'default' | 'id' | 'name' | 'achieved' | 'rate' | 'category';
    catName?: string;
    ascending: boolean;
  }>({
    type: 'default',
    ascending: false
  });

  // Use passed luykeCategories (BC THÁNG displayed data) for staffMatrix calculation
  const { staffMatrix, categories } = React.useMemo(() => {
    return parseStaffMatrixDataRefined(
      thiDuaNv || '', 
      staffCount, 
      categoryTargets, 
      luykeCategories, 
      daysPassed, 
      totalDays,
      false,
      categoryConfig
    );
  }, [thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays, categoryConfig]);

  const sortedStaffMatrix = React.useMemo(() => {
    const matrix = staffMatrix.filter(s => !isNonStaffName(s.displayName) && !isNonStaffName(s.name) && !isNonStaffName(s.fullId));
    
    if (sortColumn.type === 'default') {
      return [...matrix].sort((a, b) => b.rate - a.rate);
    }

    if (sortColumn.type === 'id') {
      return [...matrix].sort((a, b) => {
        const numA = parseInt((a.fullId || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.fullId || '').replace(/\D/g, ''), 10) || 0;
        const cmp = numA !== numB ? numA - numB : (a.fullId || '').localeCompare(b.fullId || '', 'vi');
        return sortColumn.ascending ? cmp : -cmp;
      });
    }
    
    if (sortColumn.type === 'name') {
      return [...matrix].sort((a, b) => {
        const nameA = (a.name || a.displayName || '').trim();
        const nameB = (b.name || b.displayName || '').trim();
        const cmp = nameA.localeCompare(nameB, 'vi');
        return sortColumn.ascending ? cmp : -cmp;
      });
    }
    
    if (sortColumn.type === 'achieved') {
      return [...matrix].sort((a, b) => {
        const getAchieved = (staff: StaffMatrixData) => {
          return categories.reduce((count, catName, idx) => {
            if (!visibleCategories.includes(catName)) return count;
            const projectedRate = staff.projectedRates[idx] || 0;
            return Math.round(projectedRate) >= 100 ? count + 1 : count;
          }, 0);
        };
        const valA = getAchieved(a);
        const valB = getAchieved(b);
        return sortColumn.ascending ? valA - valB : valB - valA;
      });
    }
    
    if (sortColumn.type === 'rate') {
      return [...matrix].sort((a, b) => {
        const getRate = (staff: StaffMatrixData) => {
          const visibleAchieved = categories.reduce((count, catName, idx) => {
            if (!visibleCategories.includes(catName)) return count;
            const projectedRate = staff.projectedRates[idx] || 0;
            return Math.round(projectedRate) >= 100 ? count + 1 : count;
          }, 0);
          return visibleCategories.length > 0 ? visibleAchieved / visibleCategories.length : 0;
        };
        const valA = getRate(a);
        const valB = getRate(b);
        return sortColumn.ascending ? valA - valB : valB - valA;
      });
    }
    
    if (sortColumn.type === 'category' && sortColumn.catName) {
      const catIdx = categories.indexOf(sortColumn.catName);
      return [...matrix].sort((a, b) => {
        const valA = catIdx !== -1 ? (a.projectedRates[catIdx] || 0) : 0;
        const valB = catIdx !== -1 ? (b.projectedRates[catIdx] || 0) : 0;
        return sortColumn.ascending ? valA - valB : valB - valA;
      });
    }
    
    return matrix;
  }, [staffMatrix, sortColumn, categories, visibleCategories]);

  const handleHeaderClick = (type: 'default' | 'id' | 'name' | 'achieved' | 'rate' | 'category', catName?: string) => {
    setSortColumn(prev => {
      if (prev.type === type && prev.catName === catName) {
        return { type, catName, ascending: !prev.ascending };
      }
      return { type, catName, ascending: false };
    });
  };

  const renderSortIcon = (type: 'default' | 'id' | 'name' | 'achieved' | 'rate' | 'category', catName?: string) => {
    const isActive = sortColumn.type === type && sortColumn.catName === catName;
    if (!isActive) return <span className="opacity-40 ml-0.5 text-[9.5px] select-none">↕</span>;
    return sortColumn.ascending ? <span className="ml-0.5 text-[9.5px] text-amber-300 select-none">▲</span> : <span className="ml-0.5 text-[9.5px] text-amber-300 select-none">▼</span>;
  };

  const getTargetPerStaff = (catName: string) => {
    const baseTarget = resolveCategoryBaseTarget(catName, categoryTargets, luykeCategories);
    return staffCount > 0 ? baseTarget / staffCount : 0;
  };
  
  // Group computations for quick filtering
  const ictCategories = React.useMemo(
    () => categories.filter(c => getCategoryGroupType(c, categoryConfig) === 'ICT'),
    [categories, categoryConfig]
  );
  const dvCategories = React.useMemo(
    () => categories.filter(c => getCategoryGroupType(c, categoryConfig) === 'DỊCH VỤ'),
    [categories, categoryConfig]
  );
  const ceCategories = React.useMemo(
    () => categories.filter(c => getCategoryGroupType(c, categoryConfig) === 'CE'),
    [categories, categoryConfig]
  );

  // Ensure visible categories are always ordered contiguously by group: ICT -> DỊCH VỤ -> CE & GD
  const orderedVisibleCats = React.useMemo(
    () => [...ictCategories, ...dvCategories, ...ceCategories].filter(c => visibleCategories.includes(c)),
    [ictCategories, dvCategories, ceCategories, visibleCategories]
  );

  const isAll = visibleCategories.length === categories.length && categories.length > 0;
  const isIctOnly = visibleCategories.length === ictCategories.length && ictCategories.length > 0 && ictCategories.every(c => visibleCategories.includes(c));
  const isDvOnly = visibleCategories.length === dvCategories.length && dvCategories.length > 0 && dvCategories.every(c => visibleCategories.includes(c));
  const isCeOnly = visibleCategories.length === ceCategories.length && ceCategories.length > 0 && ceCategories.every(c => visibleCategories.includes(c));

  // Save selected categories synchronously to localStorage
  const saveCategoriesToStorage = (cats: string[]) => {
    try {
      const savedKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
      localStorage.setItem(savedKey, JSON.stringify(cats));
    } catch (e) {
      console.error('Error saving visible categories:', e);
    }
  };

  // Initialize visible categories once when categories load or activeStore changes
  const initializedRef = useRef(false);
  const prevStoreRef = useRef(activeStore);

  React.useEffect(() => {
    if (prevStoreRef.current !== activeStore) {
      prevStoreRef.current = activeStore;
      initializedRef.current = false;
    }
  }, [activeStore]);

  React.useEffect(() => {
    if (categories.length > 0 && !initializedRef.current) {
      const savedKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedVal = localStorage.getItem(savedKey);
      if (savedVal !== null) {
        try {
          const parsed = JSON.parse(savedVal);
          if (Array.isArray(parsed)) {
            const validSaved = categories.filter(cat => {
              const clean = cleanCategoryName(cat);
              return parsed.some((p: string) => p === cat || cleanCategoryName(p) === clean);
            });
            if (validSaved.length > 0) {
              setVisibleCategories(validSaved);
              initializedRef.current = true;
              return;
            }
          }
        } catch (e) {
          console.error('Error loading saved visible categories:', e);
        }
      }
      setVisibleCategories(categories);
      initializedRef.current = true;
    }
  }, [categories, activeStore]);

  const toggleCategory = (cat: string) => {
    setVisibleCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      saveCategoriesToStorage(next);
      return next;
    });
  };

  const handleSelectAll = () => {
    setVisibleCategories([...categories]);
    saveCategoriesToStorage([...categories]);
  };

  const handleDeselectAll = () => {
    setVisibleCategories([]);
    saveCategoriesToStorage([]);
  };

  const handleSelectGroup = (group: 'ALL' | 'ICT' | 'DỊCH VỤ' | 'CE') => {
    let next: string[] = [];
    if (group === 'ALL') {
      next = [...categories];
    } else if (group === 'ICT') {
      next = [...ictCategories];
    } else if (group === 'DỊCH VỤ') {
      next = [...dvCategories];
    } else if (group === 'CE') {
      next = [...ceCategories];
    }
    setVisibleCategories(next);
    saveCategoriesToStorage(next);
  };

  const filteredCatList = categories.filter(cat =>
    cat.toLowerCase().includes(catSearchTerm.toLowerCase())
  );

  // Base staff list (respecting top-level store staff selection, NEVER mutated by local search)
  const filteredStaffMatrix = React.useMemo(() => {
    return (selectedStaffIds && selectedStaffIds.length > 0 
      ? sortedStaffMatrix.filter(s => {
          const sId = (s.fullId || '').trim().toLowerCase();
          const sName = (s.name || '').trim().toLowerCase();
          return selectedStaffIds.some(sel => {
            const cleanSel = (sel || '').trim().toLowerCase();
            return cleanSel === sId || sId.includes(cleanSel) || cleanSel.includes(sId) || sName.includes(cleanSel);
          });
        })
      : sortedStaffMatrix
    ).filter(s => !isNonStaffName(s.displayName) && !isNonStaffName(s.name) && !isNonStaffName(s.fullId));
  }, [sortedStaffMatrix, selectedStaffIds]);

  // Helper to compute visible achieved count & rate for any staff row
  const getStaffVisibleStats = React.useCallback((staff: StaffMatrixData) => {
    const activeCatCount = visibleCategories.length;
    const visibleAchieved = categories.reduce((count, catName, idx) => {
      if (!visibleCategories.includes(catName)) return count;
      const projectedRate = staff.projectedRates[idx] || 0;
      return Math.round(projectedRate) >= 100 ? count + 1 : count;
    }, 0);
    const visibleRate = activeCatCount > 0 ? visibleAchieved / activeCatCount : 0;
    return { visibleAchieved, activeCatCount, visibleRate };
  }, [categories, visibleCategories]);

  // Overview KPI statistics computed from filteredStaffMatrix (the store's active staff list)
  const kpiStats = React.useMemo(() => {
    const totalStaff = filteredStaffMatrix.length;
    const activeCatCount = visibleCategories.length;
    const totalCatSlots = totalStaff * activeCatCount;
    let achievedStaff = 0;      // >= 50%
    let nearAchievedStaff = 0;  // >= 40% and < 50% (Nhân viên sắp đạt)
    let needEffortStaff = 0;    // >= 20% and < 40% (Nhân viên cần cố gắng)
    let weakStaff = 0;          // < 20% (Nhân viên yếu)
    let totalAchievedCats = 0;

    filteredStaffMatrix.forEach(staff => {
      const { visibleAchieved, visibleRate } = getStaffVisibleStats(staff);
      totalAchievedCats += visibleAchieved;
      if (visibleRate >= 0.5) {
        achievedStaff++;
      } else if (visibleRate >= 0.4) {
        nearAchievedStaff++;
      } else if (visibleRate >= 0.2) {
        needEffortStaff++;
      } else {
        weakStaff++;
      }
    });

    const unachievedStaff = Math.max(0, totalStaff - achievedStaff);
    const achievedStaffPct = totalStaff > 0 ? (achievedStaff / totalStaff) * 100 : 0;
    const nearAchievedStaffPct = totalStaff > 0 ? (nearAchievedStaff / totalStaff) * 100 : 0;
    const needEffortStaffPct = totalStaff > 0 ? (needEffortStaff / totalStaff) * 100 : 0;
    const weakStaffPct = totalStaff > 0 ? (weakStaff / totalStaff) * 100 : 0;
    const totalUnachievedCats = Math.max(0, totalCatSlots - totalAchievedCats);
    const achievedCatsPct = totalCatSlots > 0 ? (totalAchievedCats / totalCatSlots) * 100 : 0;
    const unachievedCatsPct = totalCatSlots > 0 ? (totalUnachievedCats / totalCatSlots) * 100 : 0;

    return {
      totalStaff,
      achievedStaff,
      nearAchievedStaff,
      needEffortStaff,
      weakStaff,
      unachievedStaff,
      achievedStaffPct,
      nearAchievedStaffPct,
      needEffortStaffPct,
      weakStaffPct,
      totalCatSlots,
      totalAchievedCats,
      totalUnachievedCats,
      achievedCatsPct,
      unachievedCatsPct,
    };
  }, [filteredStaffMatrix, visibleCategories.length, getStaffVisibleStats]);

  // Local search & status filter (ONLY affects displayed rows, preserves original staff list)
  const displayedStaffMatrix = React.useMemo(() => {
    const q = removeAccentsLocal(staffSearchQuery).toLowerCase().trim();
    let list = filteredStaffMatrix.filter(staff => {
      if (q) {
        const hay = removeAccentsLocal(`${staff.fullId || ''} ${staff.name || ''} ${staff.displayName || ''}`).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (staffStatusFilter !== 'ALL') {
        const { visibleRate } = getStaffVisibleStats(staff);
        const isAchieved = visibleRate >= 0.5;
        if (staffStatusFilter === 'ACHIEVED' && !isAchieved) return false;
        if (staffStatusFilter === 'UNACHIEVED' && isAchieved) return false;
      }
      return true;
    });

    if (displayLimit !== 'ALL' && typeof displayLimit === 'number') {
      list = list.slice(0, displayLimit);
    }
    return list;
  }, [filteredStaffMatrix, staffSearchQuery, staffStatusFilter, displayLimit, getStaffVisibleStats]);

  const handleCopyStaff = (staff: StaffMatrixData) => {
    let text = `📊 BÁO CÁO THI ĐUA: ${staff.shortName}\n`;
    text += `✅ ĐẠT: ${staff.achieved}/${staff.totalCats} chỉ tiêu\n`;
    text += `📈 TỶ LỆ: ${(staff.rate * 100).toFixed(1)}%\n\n`;
    text += `CHI TIẾT % DỰ KIẾN:\n`;

    categories.forEach((catName, idx) => {
      const rate = staff.projectedRates[idx];
      const roundedRate = Math.round(rate);
      text += `- ${catName}: ${roundedRate}% ${roundedRate >= 100 ? '✅' : '⚠️'}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(staff.fullId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCopyAll = () => {
    if (filteredStaffMatrix.length === 0) return;
    setIsCopyingAll(true);

    const total = filteredStaffMatrix.length;
    const count20 = Math.max(1, Math.round(total * 0.2));
    
    const top20 = filteredStaffMatrix.slice(0, count20);
    // Get bottom 20%, but ensure we don't overlap if total is small
    const bottom20 = filteredStaffMatrix.slice(Math.max(count20, total - count20));

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    let text = `🌟 TỔNG HỢP THI ĐUA NHÂN VIÊN (${dateStr}):\n\n`;
    
    filteredStaffMatrix.forEach((staff, sIdx) => {
      const ratePercent = (staff.rate * 100).toFixed(0);
      text += `${sIdx + 1}. ${staff.shortName} (${ratePercent}%)\n`;
    });

    text += `\n🏆 TOP 20% DẪN ĐẦU:\n`;
    top20.forEach(s => text += `- ${s.shortName} (${(s.rate * 100).toFixed(0)}%)\n`);

    text += `\n⚠️ BOTTOM 20% CẦN CỐ GẮNG:\n`;
    bottom20.forEach(s => text += `- ${s.shortName} (${(s.rate * 100).toFixed(0)}%)\n`);

    text += `\nChúc các bạn bứt phá mạnh mẽ trong các ngày còn lại! 💪`;

    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => setIsCopyingAll(false), 2000);
    });
  };

  const generateThiDuaComment = (template: 1 | 2 | 3 = 1) => {
    if (filteredStaffMatrix.length === 0) return;
    const total = filteredStaffMatrix.length;
    const count20 = Math.max(1, Math.round(total * 0.2));
    const top20 = filteredStaffMatrix.slice(0, count20);
    const bottom20 = filteredStaffMatrix.slice(Math.max(count20, total - count20));

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    let text = '';

    if (template === 1) {
      // MẪU 1: TOP/BOT ST
      text = `📊 TỔNG HỢP THI ĐUA NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📈 KẾT QUẢ TỔNG QUAN:\n`;
      text += `🎯 Tổng NV: ${total} || ĐẠT trên 50%: ${filteredStaffMatrix.filter(s => s.rate >= 0.5).length}/${total}\n\n`;
      text += `🏆 TOP ${count20} DẪN ĐẦU:\n`;
      top20.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        text += `🔺 #${i + 1}. @${staffId}\n`;
      });
      text += `\n⚠️ BOTTOM ${count20} CẦN TĂNG TỐC:\n`;
      bottom20.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        text += `🔻 #${total - bottom20.length + i + 1}. @${staffId}\n`;
      });
      text += `\n💪 Hãy cố gắng bứt phá trong các ngày còn lại! 🔥`;
    } else if (template === 2) {
      // MẪU 2: DS Cần tăng tốc
      const below50 = filteredStaffMatrix.filter(s => s.rate < 0.5);
      text = `⚠️ DS CẦN TĂNG TỐC THI ĐUA NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📊 Tổng NV dưới 50%: ${below50.length}/${total}\n\n`;
      text += `🚨 DANH SÁCH CẦN CẢI THIỆN TIẾN ĐỘ:\n`;
      below50.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        text += `🔻 #${i + 1}. @${staffId}\n`;
      });
      text += `\n💡 Cần hỗ trợ các NV trên đẩy mạnh bán hàng và tăng cường tư vấn!`;
    } else {
      // MẪU 3: Tóm tắt toàn bộ
      text = `📝 TÓM TẮT THI ĐUA NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🎯 Tổng NV: ${total}\n`;
      text += `✅ ĐẠT (>=100%): ${filteredStaffMatrix.filter(s => s.rate >= 1).length}/${total}\n`;
      text += `🟡 KHÁ (50-99%): ${filteredStaffMatrix.filter(s => s.rate >= 0.5 && s.rate < 1).length}/${total}\n`;
      text += `🔴 YẾU (<50%): ${filteredStaffMatrix.filter(s => s.rate < 0.5).length}/${total}\n\n`;
      text += `📊 BẢNG XẾP HẠNG ĐẦY ĐỦ:\n`;
      filteredStaffMatrix.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        const icon = s.rate >= 1 ? '✅' : s.rate >= 0.5 ? '🟡' : '🔴';
        text += `${icon} #${i + 1}. @${staffId}\n`;
      });
    }

    setCommentText(text);
    setCommentTemplate(template);
    setCopiedComment(false);
    return text;
  };

  const handleExportExcel = () => {
    const visibleCats = orderedVisibleCats;
    if (displayedStaffMatrix.length === 0) return;

    const headerRow = [
      'STT',
      'MÃ NV',
      'NHÂN VIÊN',
      'ĐẠT (Số ngành)',
      'TỶ LỆ (%)',
      ...visibleCats,
    ];

    const rows = displayedStaffMatrix.map((staff, idx) => {
      const parsed = extractStaffNameAndId(staff.displayName);
      const empId = staff.fullId || parsed.id || '';
      const empName = (staff.name || parsed.name || staff.displayName)
        .replace(/^\d+\s*[-–—]\s*/, '')
        .replace(/\s*[-–—]\s*\d+$/, '')
        .trim()
        .toUpperCase();
      const { visibleAchieved, activeCatCount, visibleRate } = getStaffVisibleStats(staff);

      const catCells = visibleCats.map(catName => {
        const catIdx = categories.indexOf(catName);
        const projectedRate = catIdx !== -1 ? (staff.projectedRates[catIdx] || 0) : 0;
        return `${Math.round(projectedRate)}%`;
      });

      return [
        idx + 1,
        empId,
        empName,
        `${visibleAchieved}/${activeCatCount}`,
        `${(visibleRate * 100).toFixed(1)}%`,
        ...catCells,
      ];
    });

    const wsData = [
      [`TỔNG HỢP THI ĐUA - LŨY KẾ DỰ KIẾN ĐẾN NGÀY: ${yesterdayStr}`],
      headerRow,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 26 },
      { wch: 15 },
      { wch: 14 },
      ...visibleCats.map(() => ({ wch: 14 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TongHopThiDua');
    XLSX.writeFile(wb, `Tong_Hop_Thi_Dua_${yesterdayStr}.xlsx`);
  };

  const handleExport = async (shortMode: boolean = false) => {
    if (tableRef.current) {
      setIsCapturing(true);
      const originalElement = tableRef.current;
      const isDesktopBodyZoomed = typeof window !== 'undefined' && window.innerWidth >= 768;
      
      // Create a temporary container to hold the clone
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-19999px';
      container.style.width = '16000px';
      container.style.height = 'auto';
      container.style.overflow = 'visible';
      container.style.zIndex = '-9999';
      container.style.pointerEvents = 'none';
      container.style.zoom = isDesktopBodyZoomed ? '1.333333' : '1';
      
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Hide toolbar/filter/controls inside the clone
      const noCaptureElements = clone.querySelectorAll('.no-capture, button');
      noCaptureElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Ensure the header growth chart illustration is visible even when exporting from mobile
      const headerArt = clone.querySelector('.thi-dua-header-art') as HTMLElement;
      if (headerArt) {
        headerArt.style.display = 'flex';
      }
      
      // Set clone styling
      clone.style.width = shortMode ? '776px' : 'max-content';
      clone.style.minWidth = shortMode ? '776px' : '1360px';
      if (shortMode) {
        clone.style.maxWidth = '776px';
      }
      clone.style.height = 'auto';
      clone.style.margin = '0';
      clone.style.padding = '28px';
      clone.style.backgroundColor = '#F4F8FD';
      clone.style.display = 'inline-block';
      clone.style.overflow = 'visible';
      clone.style.overflowX = 'visible';
      clone.style.overflowY = 'visible';
      
      // Make sure overflow wrappers in the clone are visible
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.classList.contains('thi-dua-progress-pill') || htmlEl.classList.contains('thi-dua-header-card') || htmlEl.classList.contains('thi-dua-header-art')) return;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.width = 'auto';
        htmlEl.style.height = 'auto';
        htmlEl.style.maxWidth = 'none';
        htmlEl.style.maxHeight = 'none';
      });

      // Reset sticky cells in clone so they don't shift or overlap during full-width capture
      const stickyEls = clone.querySelectorAll('.thi-dua-sticky-col, .sticky');
      stickyEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.position = 'static';
        htmlEl.style.left = 'auto';
        htmlEl.style.zIndex = 'auto';
      });

      if (shortMode) {
        // Hide KPI cards & category color legend footer when exporting compact 5-column table
        const kpiGrid = clone.querySelector('.thi-dua-kpi-grid') as HTMLElement;
        if (kpiGrid) kpiGrid.style.display = 'none';

        const footerBar = clone.querySelector('.td-footer-bar') as HTMLElement;
        if (footerBar) footerBar.style.display = 'none';

        // Remove all category columns, group super-headers, and category sub-header row
        clone.querySelectorAll('.td-col-cat, .td-col-spacer, .td-group-header, .td-cat-subrow').forEach(el => {
          el.remove();
        });

        // Adjust rowSpan on the 5 summary header cells and set clean proportional widths (720px total)
        const shortWidths: Record<string, string> = {
          'td-col-stt': '64px',
          'td-col-id': '106px',
          'td-col-name': '280px',
          'td-col-dat': '116px',
          'td-col-tyle': '154px',
        };
        Object.entries(shortWidths).forEach(([cls, w]) => {
          clone.querySelectorAll(`.${cls}`).forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.width = w;
            htmlEl.style.minWidth = w;
            htmlEl.style.maxWidth = w;
            if (htmlEl.tagName === 'TH') {
              (htmlEl as HTMLTableCellElement).rowSpan = 1;
              htmlEl.style.paddingTop = '10px';
              htmlEl.style.paddingBottom = '10px';
            }
            if (cls === 'td-col-tyle') {
              htmlEl.style.borderRightWidth = '1px';
            }
          });
        });
      } else {
        // Force KPI grid to 5 columns in full exported image even when captured from mobile
        const kpiGrid = clone.querySelector('.thi-dua-kpi-grid') as HTMLElement;
        if (kpiGrid) {
          kpiGrid.style.display = 'grid';
          kpiGrid.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
          kpiGrid.style.gap = '14px';
          kpiGrid.style.width = '100%';
        }
      }

      const originalTable = originalElement.querySelector('table');
      const table = clone.querySelector('table') as HTMLTableElement;
      if (table && originalTable) {
        table.style.width = shortMode ? '100%' : 'max-content';
        table.style.minWidth = '100%';
        table.style.tableLayout = 'fixed';
        
        let parent = table.parentElement;
        while (parent && parent !== clone) {
          parent.style.width = '100%';
          parent.style.minWidth = '100%';
          parent.style.maxWidth = 'none';
          parent = parent.parentElement;
        }
      }

      container.appendChild(clone);
      document.body.appendChild(container);

      try {
        await ensureFontsReady();
        await new Promise(resolve => setTimeout(resolve, 180));

        const dataUrl = await domToPng(clone, {
          backgroundColor: '#F4F8FD',
          scale: 2,
          width: clone.scrollWidth,
          height: clone.scrollHeight,
        });

        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        document.body.removeChild(container);
        setIsCapturing(false);
      }
    }
  };

  const currentSortLabel = React.useMemo(() => {
    if (sortColumn.type === 'default' || sortColumn.type === 'rate') {
      return sortColumn.ascending ? 'Tỷ lệ đạt (Thấp → Cao)' : 'Tỷ lệ đạt';
    }
    if (sortColumn.type === 'achieved') {
      return sortColumn.ascending ? 'Số ngành đạt (Thấp → Cao)' : 'Số ngành đạt';
    }
    if (sortColumn.type === 'name') {
      return sortColumn.ascending ? 'Tên NV (A → Z)' : 'Tên NV (Z → A)';
    }
    if (sortColumn.type === 'id') {
      return sortColumn.ascending ? 'Mã NV (Tăng dần)' : 'Mã NV (Giảm dần)';
    }
    if (sortColumn.type === 'category' && sortColumn.catName) {
      return `${sortColumn.catName}`;
    }
    return 'Tỷ lệ đạt';
  }, [sortColumn]);

  const currentGroupLabel = React.useMemo(() => {
    if (isIctOnly) return `Nhóm ICT (${ictCategories.length})`;
    if (isDvOnly) return `Nhóm Dịch vụ (${dvCategories.length})`;
    if (isCeOnly) return `Nhóm CE & GD (${ceCategories.length})`;
    return 'Nhóm ngành hàng';
  }, [isIctOnly, isDvOnly, isCeOnly, ictCategories.length, dvCategories.length, ceCategories.length]);

  const renderCircularDonut = (pct: number, strokeColor: string, trackColor: string, textColor: string) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const r = 21;
    const c = 2 * Math.PI * r;
    const offset = c - (clamped / 100) * c;
    return (
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: '54px', height: '54px' }}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} fill="none" stroke={trackColor} strokeWidth="5.5" />
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-[10.5px] sm:text-[11px] font-black tabular-nums", textColor)}>
          {clamped.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div
      ref={tableRef}
      className={cn(
        "card-thi-dua bg-[#F4F8FD] p-2.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-[24px] border border-[#DCE7F3] shadow-sm transition-all",
        isExpandedView && "fixed inset-2 z-[9990] overflow-y-auto shadow-2xl"
      )}
      style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
    >
      {/* Scoped responsive column sizing for desktop vs mobile */}
      <style>{`
        .card-thi-dua .td-col-stt { width: 48px; min-width: 48px; max-width: 48px; }
        .card-thi-dua .td-col-id { width: 74px; min-width: 74px; max-width: 74px; }
        .card-thi-dua .td-col-name { width: 175px; min-width: 175px; max-width: 175px; }
        .card-thi-dua .td-col-dat { width: 76px; min-width: 76px; max-width: 76px; }
        .card-thi-dua .td-col-tyle { width: 92px; min-width: 92px; max-width: 92px; }
        .card-thi-dua .td-col-cat { width: 68px; min-width: 68px; max-width: 68px; }
        @media (max-width: 767px) {
          .card-thi-dua .td-col-stt { width: 34px; min-width: 34px; max-width: 34px; }
          .card-thi-dua .td-col-id { width: 54px; min-width: 54px; max-width: 54px; }
          .card-thi-dua .td-col-name {
            width: 150px;
            min-width: 150px;
            max-width: 150px;
            white-space: normal !important;
            overflow: visible !important;
            vertical-align: middle !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
          .card-thi-dua .td-col-name .td-emp-name {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            line-height: 1.32 !important;
            height: auto !important;
            min-width: 0 !important;
          }
          .card-thi-dua .td-col-dat { width: 52px; min-width: 52px; max-width: 52px; }
          .card-thi-dua .td-col-tyle { width: 66px; min-width: 66px; max-width: 66px; }
          .card-thi-dua .td-col-cat { width: 62px; min-width: 62px; max-width: 62px; }
        }
      `}</style>

      {/* ═══ 1. KHU VỰC TIÊU ĐỀ (HEADER) ═══ */}
      <div className="thi-dua-header-card relative overflow-hidden bg-gradient-to-r from-white via-[#F4FCF9] to-[#F7FAFF] px-3.5 sm:px-5 md:px-6 py-3 sm:py-3.5 rounded-2xl border border-[#DCE7F3] mb-3 sm:mb-3.5 shadow-2xs">
        <div className="relative z-10 flex flex-nowrap items-center justify-between gap-3 sm:gap-6">
          {/* Left: Green Trophy Badge + Title + Date & Status Pill */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div
              className="rounded-2xl bg-gradient-to-br from-[#00B37E] via-[#059669] to-[#035E44] flex items-center justify-center text-white shadow-md shadow-emerald-600/25 border border-emerald-400/40 shrink-0"
              style={{ width: '52px', height: '52px' }}
            >
              <Trophy size={26} className="text-white drop-shadow-xs" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2
                className="text-[17px] sm:text-[24px] md:text-[28px] font-black text-[#0D2440] uppercase tracking-tight leading-tight whitespace-nowrap"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}
              >
                TỔNG HỢP THI ĐUA
              </h2>
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2.5 mt-1 text-[10.5px] sm:text-[13px] font-bold text-[#1E3A5F]">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar size={14} className="text-[#0284C7] shrink-0" />
                  <span>Lũy kế dự kiến đến ngày:</span>
                  <strong className="font-black text-[#0D2440]">{yesterdayStr}</strong>
                </span>
                <span className="text-slate-300 font-normal">|</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#E3F9EE] border border-[#9EE6C4] text-[#047857] text-[10px] sm:text-[11.5px] font-black uppercase tracking-wider whitespace-nowrap">
                  DỰ KIẾN
                </span>
              </div>
            </div>
          </div>

          {/* Right: Stretched Green Growth Chart & Mint Wave Illustration (flex-1, auto-scales without overlapping left text) */}
          <div
            className="thi-dua-header-art pointer-events-none select-none hidden sm:flex items-end justify-end flex-1 min-w-[80px] overflow-hidden opacity-95"
            style={{ height: '64px' }}
          >
            <svg viewBox="0 0 800 88" className="w-full h-full block" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tdWaveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.48" />
                  <stop offset="100%" stopColor="#ECFDF5" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id="tdWaveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.40" />
                  <stop offset="100%" stopColor="#D1FAE5" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              {/* Soft background mint waves */}
              <path d="M0,88 Q120,38 260,64 T540,32 T800,18 L800,88 Z" fill="url(#tdWaveGrad1)" />
              <path d="M50,88 Q200,52 380,68 T660,28 T800,36 L800,88 Z" fill="url(#tdWaveGrad2)" />

              {/* Stretched ascending 3D-style emerald bars */}
              <rect x="60" y="72" width="34" height="16" rx="4" fill="#6EE7B7" fillOpacity="0.65" />
              <rect x="60" y="72" width="17" height="16" rx="3" fill="#34D399" fillOpacity="0.78" />

              <rect x="155" y="64" width="34" height="24" rx="4" fill="#6EE7B7" fillOpacity="0.72" />
              <rect x="155" y="64" width="17" height="24" rx="3" fill="#34D399" fillOpacity="0.85" />

              <rect x="250" y="55" width="36" height="33" rx="4" fill="#34D399" fillOpacity="0.78" />
              <rect x="250" y="55" width="18" height="33" rx="3" fill="#10B981" fillOpacity="0.88" />

              <rect x="345" y="46" width="36" height="42" rx="4" fill="#34D399" fillOpacity="0.84" />
              <rect x="345" y="46" width="18" height="42" rx="3" fill="#10B981" fillOpacity="0.92" />

              <rect x="440" y="37" width="38" height="51" rx="4" fill="#10B981" fillOpacity="0.86" />
              <rect x="440" y="37" width="19" height="51" rx="3" fill="#059669" fillOpacity="0.94" />

              <rect x="535" y="28" width="38" height="60" rx="4" fill="#10B981" fillOpacity="0.90" />
              <rect x="535" y="28" width="19" height="60" rx="3" fill="#059669" fillOpacity="0.96" />

              <rect x="630" y="19" width="40" height="69" rx="4.5" fill="#10B981" fillOpacity="0.94" />
              <rect x="630" y="19" width="20" height="69" rx="3.5" fill="#047857" fillOpacity="0.98" />

              <rect x="725" y="10" width="42" height="78" rx="4.5" fill="#059669" fillOpacity="0.96" />
              <rect x="725" y="10" width="21" height="78" rx="3.5" fill="#047857" />

              {/* Sweeping upward trend curve + arrow across the stretched bars */}
              <path
                d="M36,70 C210,58 480,36 746,6"
                fill="none"
                stroke="#059669"
                strokeWidth="3.8"
                strokeLinecap="round"
              />
              <polygon points="762,2 738,3 747,14" fill="#059669" />

              {/* Decorative accent dots */}
              <circle cx="205" cy="44" r="3" fill="#34D399" />
              <circle cx="400" cy="28" r="3.5" fill="#10B981" />
              <circle cx="595" cy="14" r="3" fill="#059669" />
            </svg>
          </div>
        </div>
      </div>

      {/* ═══ 2. CÁC THẺ KPI TỔNG QUAN (5 KPI CARDS) ═══ */}
      <div className="thi-dua-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 mb-3 sm:mb-3.5">
        {/* Card 1: Tổng số nhân viên (Blue) */}
        <div className="bg-gradient-to-br from-white via-[#F8FBFF] to-[#EEF5FF] border border-[#DCE8FA] rounded-2xl px-3.5 py-3 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-full bg-[#E0EEFF] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-[#BFDBFE]/60"
              style={{ width: '44px', height: '44px' }}
            >
              <Users size={20} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-bold text-slate-600 truncate">Tổng số nhân viên</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[24px] sm:text-[26px] font-black text-[#0D2440] leading-none tabular-nums">
                  {kpiStats.totalStaff}
                </span>
                <span className="text-[11.5px] font-bold text-slate-500">Nhân viên</span>
              </div>
            </div>
          </div>
          {/* Mini Blue Bar Illustration */}
          <svg width="46" height="36" viewBox="0 0 46 36" className="shrink-0">
            <rect x="2" y="24" width="6" height="10" rx="1.5" fill="#BFDBFE" />
            <rect x="11" y="19" width="6" height="15" rx="1.5" fill="#93C5FD" />
            <rect x="20" y="14" width="6" height="20" rx="1.5" fill="#60A5FA" />
            <rect x="29" y="8" width="6" height="26" rx="1.5" fill="#3B82F6" />
            <rect x="38" y="3" width="6" height="31" rx="1.5" fill="#2563EB" />
          </svg>
        </div>

        {/* Card 2: Nhân viên đạt chỉ tiêu (Green: >= 50%) */}
        <div className="bg-gradient-to-br from-white via-[#F5FCF9] to-[#E8F8F0] border border-[#CBEBD9] rounded-2xl px-3.5 py-3 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/20"
              style={{ width: '44px', height: '44px' }}
            >
              <Trophy size={20} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-bold text-slate-600 truncate">Nhân viên đạt chỉ tiêu</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[22px] sm:text-[24px] font-black text-[#047857] leading-none tabular-nums">
                  {kpiStats.achievedStaff}
                </span>
                <span className="text-[11.5px] font-bold text-slate-500">Nhân viên</span>
              </div>
              <div className="text-[10.5px] font-bold text-emerald-700/80 mt-0.5 tabular-nums">
                Tỷ lệ: ≥ 50%
              </div>
            </div>
          </div>
          {renderCircularDonut(kpiStats.achievedStaffPct, '#059669', '#D1FAE5', 'text-[#047857]')}
        </div>

        {/* Card 3: Nhân viên sắp đạt (Orange/Amber: 40% - < 50%) */}
        <div className="bg-gradient-to-br from-white via-[#FFFDF8] to-[#FEF5E7] border border-[#F9E3C0] rounded-2xl px-3.5 py-3 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-full bg-[#FDEFD6] text-[#EA580C] flex items-center justify-center shrink-0 border border-[#FED7AA]/70"
              style={{ width: '44px', height: '44px' }}
            >
              <Target size={20} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-bold text-slate-600 truncate">Nhân viên sắp đạt</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[22px] sm:text-[24px] font-black text-[#D97706] leading-none tabular-nums">
                  {kpiStats.nearAchievedStaff}
                </span>
                <span className="text-[11.5px] font-bold text-slate-500">Nhân viên</span>
              </div>
              <div className="text-[10.5px] font-bold text-amber-700/80 mt-0.5 tabular-nums">
                Tỷ lệ: 40% - &lt; 50%
              </div>
            </div>
          </div>
          {renderCircularDonut(kpiStats.nearAchievedStaffPct, '#EA580C', '#FFEDD5', 'text-[#C2410C]')}
        </div>

        {/* Card 4: Nhân viên cần cố gắng (Purple: 20% - < 40%) */}
        <div className="bg-gradient-to-br from-white via-[#FAF8FF] to-[#F3EEFF] border border-[#E2D9FA] rounded-2xl px-3.5 py-3 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0 border border-[#DDD6FE]/70"
              style={{ width: '44px', height: '44px' }}
            >
              <BarChart3 size={20} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-bold text-slate-600 truncate">Nhân viên cần cố gắng</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[22px] sm:text-[24px] font-black text-[#1E1B4B] leading-none tabular-nums">
                  {kpiStats.needEffortStaff}
                </span>
                <span className="text-[11.5px] font-bold text-slate-500">Nhân viên</span>
              </div>
              <div className="text-[10.5px] font-bold text-purple-700/80 mt-0.5 tabular-nums">
                Tỷ lệ: 20% - &lt; 40%
              </div>
            </div>
          </div>
          {renderCircularDonut(kpiStats.needEffortStaffPct, '#7C3AED', '#EDE9FE', 'text-[#5B21B6]')}
        </div>

        {/* Card 5: Nhân viên yếu (Red/Rose: < 20%) */}
        <div className="bg-gradient-to-br from-white via-[#FFF8F9] to-[#FEEBEF] border border-[#FAD4DC] rounded-2xl px-3.5 py-3 shadow-2xs flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-full bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center shrink-0 border border-[#FECDD3]/70"
              style={{ width: '44px', height: '44px' }}
            >
              <Target size={20} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-bold text-slate-600 truncate">Nhân viên yếu</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[22px] sm:text-[24px] font-black text-[#BE123C] leading-none tabular-nums">
                  {kpiStats.weakStaff}
                </span>
                <span className="text-[11.5px] font-bold text-slate-500">Nhân viên</span>
              </div>
              <div className="text-[10.5px] font-bold text-rose-700/80 mt-0.5 tabular-nums">
                Tỷ lệ: &lt; 20%
              </div>
            </div>
          </div>
          {renderCircularDonut(kpiStats.weakStaffPct, '#E11D48', '#FFE4E6', 'text-[#BE123C]')}
        </div>
      </div>

      {/* ═══ 3. THANH TÌM KIẾM VÀ BỘ LỌC (SEARCH & FILTER TOOLBAR) ═══ */}
      <div className="no-capture flex flex-wrap items-center justify-between gap-2 mb-3.5 p-2 sm:p-2.5 bg-white/95 border border-[#DCE7F3] rounded-2xl shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-[260px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={staffSearchQuery}
            onChange={(e) => setStaffSearchQuery(e.target.value)}
            placeholder="Tìm tên hoặc mã nhân viên..."
            aria-label="Tìm tên hoặc mã nhân viên"
            style={{ paddingLeft: '36px', paddingRight: '30px' }}
            className="w-full py-2 bg-[#F8FAFC] focus:bg-white border border-slate-200/90 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl text-[12px] font-bold text-slate-800 placeholder:text-slate-400 outline-none transition-all"
          />
          {staffSearchQuery && (
            <button
              type="button"
              onClick={() => setStaffSearchQuery('')}
              title="Xóa tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 rounded-md cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStaffStatusFilter('ALL')}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-black transition-all cursor-pointer active:scale-95",
              staffStatusFilter === 'ALL'
                ? "bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-xs border border-[#059669]"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90"
            )}
          >
            <Users size={13} className={staffStatusFilter === 'ALL' ? "text-white" : "text-emerald-600"} />
            <span>Tất cả nhân viên ({kpiStats.totalStaff})</span>
          </button>

          <button
            type="button"
            onClick={() => setStaffStatusFilter('ACHIEVED')}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-black transition-all cursor-pointer active:scale-95",
              staffStatusFilter === 'ACHIEVED'
                ? "bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-xs border border-[#059669]"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90"
            )}
          >
            <Trophy size={13} className={staffStatusFilter === 'ACHIEVED' ? "text-white" : "text-[#1E3A8A]"} />
            <span>Nhân viên đạt ({kpiStats.achievedStaff})</span>
          </button>

          <button
            type="button"
            onClick={() => setStaffStatusFilter('UNACHIEVED')}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-black transition-all cursor-pointer active:scale-95",
              staffStatusFilter === 'UNACHIEVED'
                ? "bg-gradient-to-r from-[#E11D48] to-[#F43F5E] text-white shadow-xs border border-[#E11D48]"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90"
            )}
          >
            <BarChart3 size={13} className={staffStatusFilter === 'UNACHIEVED' ? "text-white" : "text-[#1E3A8A]"} />
            <span>Nhân viên chưa đạt ({kpiStats.unachievedStaff})</span>
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="relative z-40" ref={sortDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsSortDropdownOpen(!isSortDropdownOpen);
              setIsGroupDropdownOpen(false);
              setIsCatDropdownOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-[11.5px] font-black text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <ArrowUpDown size={13} className="text-[#1E3A8A]" />
            <span>Sắp xếp: {currentSortLabel}</span>
            <ChevronDown size={13} className={cn("text-slate-400 transition-transform", isSortDropdownOpen && "rotate-180")} />
          </button>

          {isSortDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSortDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5">
                {[
                  { label: 'Tỷ lệ đạt (Cao → Thấp)', type: 'rate' as const, ascending: false },
                  { label: 'Tỷ lệ đạt (Thấp → Cao)', type: 'rate' as const, ascending: true },
                  { label: 'Số ngành đạt (Cao → Thấp)', type: 'achieved' as const, ascending: false },
                  { label: 'Số ngành đạt (Thấp → Cao)', type: 'achieved' as const, ascending: true },
                  { label: 'Tên nhân viên (A → Z)', type: 'name' as const, ascending: true },
                  { label: 'Mã nhân viên (Tăng dần)', type: 'id' as const, ascending: true },
                ].map((opt, i) => {
                  const active = sortColumn.type === opt.type && sortColumn.ascending === opt.ascending;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSortColumn({ type: opt.type, ascending: opt.ascending });
                        setIsSortDropdownOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-bold text-left transition-colors cursor-pointer",
                        active ? "bg-emerald-50 text-emerald-800 font-black" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span>{opt.label}</span>
                      {active && <Check size={13} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Category Group Filter Dropdown */}
        <div className="relative z-40" ref={groupDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsGroupDropdownOpen(!isGroupDropdownOpen);
              setIsSortDropdownOpen(false);
              setIsCatDropdownOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-[11.5px] font-black text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <span>{currentGroupLabel}</span>
            <ChevronDown size={13} className={cn("text-slate-400 transition-transform", isGroupDropdownOpen && "rotate-180")} />
          </button>

          {isGroupDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsGroupDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectAll();
                    setIsGroupDropdownOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-bold text-left transition-colors cursor-pointer",
                    isAll ? "bg-emerald-50 text-emerald-800 font-black" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>Tất cả nhóm ngành ({categories.length})</span>
                  {isAll && <Check size={13} className="text-emerald-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectGroup('ICT');
                    setIsGroupDropdownOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-bold text-left transition-colors cursor-pointer",
                    isIctOnly ? "bg-amber-50 text-amber-800 font-black" : "text-slate-700 hover:bg-amber-50/40"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Nhóm ICT ({ictCategories.length})
                  </span>
                  {isIctOnly && <Check size={13} className="text-amber-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectGroup('DỊCH VỤ');
                    setIsGroupDropdownOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-bold text-left transition-colors cursor-pointer",
                    isDvOnly ? "bg-emerald-50 text-emerald-800 font-black" : "text-slate-700 hover:bg-emerald-50/40"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Nhóm Dịch vụ ({dvCategories.length})
                  </span>
                  {isDvOnly && <Check size={13} className="text-emerald-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectGroup('CE');
                    setIsGroupDropdownOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-bold text-left transition-colors cursor-pointer",
                    isCeOnly ? "bg-blue-50 text-blue-800 font-black" : "text-slate-700 hover:bg-blue-50/40"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    Nhóm CE & GD ({ceCategories.length})
                  </span>
                  {isCeOnly && <Check size={13} className="text-blue-600" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Column Visibility Multi-Select Dropdown (Ẩn/Hiện cột) */}
        <div className="relative z-40" ref={catDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsCatDropdownOpen(!isCatDropdownOpen);
              setIsGroupDropdownOpen(false);
              setIsSortDropdownOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-[11.5px] font-black text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Settings size={13} className="text-[#1E3A8A]" />
            <span>
              {visibleCategories.length === categories.length
                ? 'Ẩn/Hiện cột'
                : `Ẩn/Hiện cột (${visibleCategories.length}/${categories.length})`}
            </span>
            <ChevronDown size={13} className={cn("transition-transform text-slate-400", isCatDropdownOpen && "rotate-180")} />
          </button>

          {isCatDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsCatDropdownOpen(false)} 
              />
              <div 
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh ngành hàng..."
                    value={catSearchTerm}
                    onChange={(e) => setCatSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/30 outline-none uppercase"
                  />
                  {catSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setCatSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 py-1 border-b border-slate-100 text-[10px] font-black uppercase">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      isAll ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    Tất cả ({categories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectGroup('ICT')}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      isIctOnly ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    )}
                  >
                    ICT ({ictCategories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectGroup('DỊCH VỤ')}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      isDvOnly ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    Dịch Vụ ({dvCategories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectGroup('CE')}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      isCeOnly ? "bg-blue-600 text-white shadow-xs" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    )}
                  >
                    CE & GD ({ceCategories.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer ml-auto font-black"
                  >
                    Bỏ chọn hết
                  </button>
                </div>

                {/* Checklist */}
                <div className="max-h-72 overflow-y-auto flex flex-col gap-1 pr-1">
                  {filteredCatList.map(cat => {
                    const group = getCategoryGroupType(cat, categoryConfig);
                    const isSelected = visibleCategories.includes(cat);
                    const badgeColor = group === 'ICT' 
                      ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                      : group === 'DỊCH VỤ'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        : 'bg-sky-50 text-sky-800 border-sky-200/80';

                    return (
                      <label
                        key={cat}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all select-none text-left border",
                          isSelected 
                            ? "bg-emerald-50/70 border-emerald-200/60 shadow-2xs" 
                            : "bg-white hover:bg-slate-50 border-transparent text-slate-600"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCategory(cat)}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check size={11} className="stroke-[3px]" />}
                          </div>
                          <span className={cn(
                            "text-[11px] font-black uppercase tracking-tight truncate",
                            isSelected ? "text-emerald-900" : "text-slate-700"
                          )}>
                            {cat}
                          </span>
                        </div>
                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0", badgeColor)}>
                          {group === 'DỊCH VỤ' ? 'DV' : group === 'CE' ? 'CE & GD' : group}
                        </span>
                      </label>
                    );
                  })}
                  {filteredCatList.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-6 font-bold">Không tìm thấy ngành hàng</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Action Buttons: Nhận xét, Xuất Excel, Xuất rút gọn, Xuất ảnh */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              generateThiDuaComment(commentTemplate);
              setIsCommentOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-[11.5px] font-black shadow-xs transition-all cursor-pointer active:scale-95"
            title="Tạo nhận xét thi đua"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">Nhận xét</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065F46] text-white rounded-xl text-[11.5px] font-black shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white rounded-xl text-[11.5px] font-black shadow-xs transition-all cursor-pointer active:scale-95"
            title="Xuất ảnh rút gọn (STT, Mã NV, Nhân viên, Đạt, Tỷ lệ)"
          >
            <ImageIcon size={14} />
            <span>Xuất rút gọn</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-xl text-[11.5px] font-black shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <ImageIcon size={14} />
            <span>Xuất ảnh</span>
          </button>
        </div>
      </div>

      {/* ═══ 4. BẢNG TỔNG HỢP THI ĐUA (MAIN COMPETITION TABLE) ═══ */}
      <div className="bg-white rounded-2xl border border-[#DCE7F3] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse table-fixed"
            style={{ border: '1px solid #DCE7F3', fontWeight: 900, minWidth: 'max-content' }}
          >
            <colgroup>
              <col className="td-col-stt" />
              <col className="td-col-id" />
              <col className="td-col-name" />
              <col className="td-col-dat" />
              <col className="td-col-tyle" />
              {orderedVisibleCats.map((catName) => (
                <React.Fragment key={catName}>
                  <col className="td-col-cat" />
                  {cleanCategoryName(catName) === 'maylanhdacquyen' && <col className="td-col-spacer" style={{ width: '36px' }} />}
                </React.Fragment>
              ))}
            </colgroup>
            <thead>
              {(() => {
                const visibleCats = orderedVisibleCats;
                const visibleIctCats = visibleCats.filter(c => getCategoryGroupType(c, categoryConfig) === 'ICT');
                const visibleDvCats = visibleCats.filter(c => getCategoryGroupType(c, categoryConfig) === 'DỊCH VỤ');
                const visibleCeCats = visibleCats.filter(c => getCategoryGroupType(c, categoryConfig) === 'CE');

                const ictSpan = visibleIctCats.reduce((span, catName) => span + (cleanCategoryName(catName) === 'maylanhdacquyen' ? 2 : 1), 0);
                const dvSpan = visibleDvCats.reduce((span, catName) => span + (cleanCategoryName(catName) === 'maylanhdacquyen' ? 2 : 1), 0);
                const ceSpan = visibleCeCats.reduce((span, catName) => span + (cleanCategoryName(catName) === 'maylanhdacquyen' ? 2 : 1), 0);

                const hasSubRow = visibleCats.length > 0;

                return (
                  <>
                    {/* Dòng 1: STT, MÃ NV, NHÂN VIÊN, ĐẠT, TỶ LỆ (rowSpan=2) + Tiêu đề Nhóm ICT, DỊCH VỤ, CE & GD */}
                    <tr className="h-[38px]">
                      <th
                        rowSpan={hasSubRow ? 2 : 1}
                        className="td-col-stt thi-dua-sticky-col md:sticky md:left-0 md:z-30 px-1 py-1.5 text-[11px] sm:text-[11.5px] font-black uppercase tracking-tight text-center border border-slate-700/60 bg-[#10233F] text-white select-none cursor-pointer align-middle"
                        onClick={() => handleHeaderClick('default')}
                      >
                        STT{renderSortIcon('default')}
                      </th>
                      <th
                        rowSpan={hasSubRow ? 2 : 1}
                        className="td-col-id thi-dua-sticky-col md:sticky md:left-[48px] md:z-30 px-1 sm:px-1.5 py-1.5 text-[11px] sm:text-[11.5px] font-black uppercase tracking-tight text-center border border-slate-700/60 bg-[#10233F] text-white select-none cursor-pointer align-middle"
                        onClick={() => handleHeaderClick('id')}
                      >
                        MÃ NV{renderSortIcon('id')}
                      </th>
                      <th
                        rowSpan={hasSubRow ? 2 : 1}
                        className="td-col-name thi-dua-sticky-col md:sticky md:left-[122px] md:z-30 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-[11.5px] font-black uppercase tracking-tight text-left border border-slate-700/60 bg-[#10233F] text-white select-none cursor-pointer align-middle"
                        onClick={() => handleHeaderClick('name')}
                      >
                        NHÂN VIÊN{renderSortIcon('name')}
                      </th>
                      <th
                        rowSpan={hasSubRow ? 2 : 1}
                        className="td-col-dat thi-dua-sticky-col md:sticky md:left-[297px] md:z-30 px-1 py-1 text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight text-center border border-slate-700/60 bg-[#10233F] text-white select-none cursor-pointer align-middle leading-tight"
                        onClick={() => handleHeaderClick('achieved')}
                      >
                        <div>ĐẠT{renderSortIcon('achieved')}</div>
                        <div className="text-[8.5px] sm:text-[9.5px] font-semibold text-slate-300 normal-case mt-0.5">(Số ngành)</div>
                      </th>
                      <th
                        rowSpan={hasSubRow ? 2 : 1}
                        className="td-col-tyle thi-dua-sticky-col md:sticky md:left-[373px] md:z-30 px-1 py-1 text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight text-center border border-slate-700/60 border-r-2 border-r-slate-300 bg-[#10233F] text-white select-none cursor-pointer align-middle leading-tight"
                        onClick={() => handleHeaderClick('rate')}
                      >
                        <div>TỶ LỆ{renderSortIcon('rate')}</div>
                        <div className="text-[8.5px] sm:text-[9.5px] font-semibold text-slate-300 normal-case mt-0.5">(Số ngành)</div>
                      </th>

                      {/* Tiêu đề nhóm ICT */}
                      {ictSpan > 0 && (
                        <th
                          colSpan={ictSpan}
                          style={{
                            background: 'linear-gradient(90deg, #FDE047 0%, #FACC15 50%, #FBBF24 100%)',
                            fontFamily: "'UTM Avo', 'Inter', sans-serif",
                            fontWeight: 900,
                          }}
                          className="td-group-header text-[#0F2942] px-2 py-1.5 border border-[#F59E0B]/40 text-center uppercase text-[12px] font-black tracking-wide truncate align-middle"
                        >
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Monitor size={14} className="text-[#B45309] shrink-0" strokeWidth={2.5} />
                            <span>
                              {visibleIctCats.length <= 1 ? `ICT (${visibleIctCats.length})` : `NHÓM ICT (${visibleIctCats.length} NGÀNH HÀNG)`}
                            </span>
                          </div>
                        </th>
                      )}

                      {/* Tiêu đề nhóm DỊCH VỤ */}
                      {dvSpan > 0 && (
                        <th
                          colSpan={dvSpan}
                          style={{
                            background: 'linear-gradient(90deg, #6EE7B7 0%, #34D399 50%, #10B981 100%)',
                            fontFamily: "'UTM Avo', 'Inter', sans-serif",
                            fontWeight: 900,
                          }}
                          className="td-group-header text-[#064E3B] px-2 py-1.5 border border-[#059669]/30 text-center uppercase text-[12px] font-black tracking-wide truncate align-middle"
                        >
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Settings size={14} className="text-[#065F46] shrink-0" strokeWidth={2.5} />
                            <span>
                              {visibleDvCats.length <= 1 ? `DỊCH VỤ (${visibleDvCats.length})` : `NHÓM DỊCH VỤ (${visibleDvCats.length} NGÀNH HÀNG)`}
                            </span>
                          </div>
                        </th>
                      )}

                      {/* Tiêu đề nhóm CE & GD */}
                      {ceSpan > 0 && (
                        <th
                          colSpan={ceSpan}
                          style={{
                            background: 'linear-gradient(90deg, #93C5FD 0%, #60A5FA 50%, #3B82F6 100%)',
                            fontFamily: "'UTM Avo', 'Inter', sans-serif",
                            fontWeight: 900,
                          }}
                          className="td-group-header text-[#1E3A8A] px-2 py-1.5 border border-[#2563EB]/30 text-center uppercase text-[12px] font-black tracking-wide truncate align-middle"
                        >
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <ShoppingCart size={14} className="text-[#1E3A8A] shrink-0" strokeWidth={2.5} />
                            <span>
                              {visibleCeCats.length <= 1 ? `CE & GD (${visibleCeCats.length})` : `NHÓM CE & GD (${visibleCeCats.length} NGÀNH HÀNG)`}
                            </span>
                          </div>
                        </th>
                      )}
                    </tr>

                    {/* Dòng 2: Từng cột ngành hàng chi tiết */}
                    {hasSubRow && (
                      <tr className="td-cat-subrow text-slate-900 h-[76px]">
                        {visibleCats.map(catName => {
                          const group = getCategoryGroupType(catName, categoryConfig);
                          const subHeaderBg = group === 'ICT'
                            ? 'bg-[#FFFBEB] text-[#1E293B] border-[#FDE68A]'
                            : group === 'DỊCH VỤ'
                              ? 'bg-[#ECFDF5] text-[#064E3B] border-[#A7F3D0]'
                              : 'bg-[#EFF6FF] text-[#1E3A8A] border-[#BFDBFE]';

                          return (
                            <React.Fragment key={catName}>
                              <th
                                className={cn(
                                  "td-col-cat px-1 py-1.5 text-[10px] font-black uppercase tracking-tight text-center border select-none cursor-pointer align-middle hover:brightness-95 transition-all",
                                  subHeaderBg
                                )}
                                style={{
                                  wordBreak: 'break-word',
                                  whiteSpace: 'normal',
                                }}
                                onClick={() => handleHeaderClick('category', catName)}
                              >
                                <div className="flex flex-col items-center justify-center gap-1 h-full">
                                  <div
                                    className="rounded-md bg-white/85 border border-black/5 flex items-center justify-center shrink-0 shadow-2xs"
                                    style={{ width: '22px', height: '22px' }}
                                  >
                                    {renderCategoryHeaderIcon(catName, group)}
                                  </div>
                                  <span className="leading-[1.15] line-clamp-3">
                                    {catName}{renderSortIcon('category', catName)}
                                  </span>
                                </div>
                              </th>
                              {cleanCategoryName(catName) === 'maylanhdacquyen' && (
                                <th className="td-col-spacer bg-white border border-slate-200" style={{ width: '36px', minWidth: '36px', maxWidth: '36px' }}></th>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    )}
                  </>
                );
              })()}
            </thead>
            <tbody>
              {visibleCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center bg-slate-50 border border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter size={24} className="text-slate-400" />
                      <span className="text-sm font-black uppercase text-slate-600">Chưa chọn ngành hàng nào trong bộ lọc</span>
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="mt-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm active:scale-95"
                      >
                        Hiện tất cả ({categories.length}) ngành hàng
                      </button>
                    </div>
                  </td>
                </tr>
              ) : displayedStaffMatrix.length === 0 ? (
                <tr>
                  <td colSpan={5 + orderedVisibleCats.length} className="py-12 text-center bg-slate-50 border border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={24} className="text-slate-400" />
                      <span className="text-sm font-black uppercase text-slate-500">Không có nhân viên nào phù hợp với bộ lọc</span>
                      {(staffSearchQuery || staffStatusFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setStaffSearchQuery('');
                            setStaffStatusFilter('ALL');
                          }}
                          className="mt-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-2xs"
                        >
                          Khôi phục danh sách ({filteredStaffMatrix.length} nhân viên)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedStaffMatrix.map((staff, index) => {
                  const parsed = extractStaffNameAndId(staff.displayName);
                  const empId = staff.fullId || parsed.id || '';
                  const empName = (staff.name || parsed.name || staff.displayName)
                    .replace(/^\d+\s*[-–—]\s*/, '')
                    .replace(/\s*[-–—]\s*\d+$/, '')
                    .trim()
                    .toUpperCase();

                  const { visibleAchieved, activeCatCount, visibleRate } = getStaffVisibleStats(staff);
                  const ratePct = visibleRate * 100;
                  const ratePercentStr = `${ratePct.toFixed(1)}%`;
                  const rowHeightClass = isCompactView ? 'min-h-[32px] h-auto md:h-[32px]' : 'min-h-[38px] h-auto md:h-[38px]';
                  const isEvenRow = index % 2 === 1;
                  const stickyBgClass = isEvenRow ? 'bg-[#F8FAFC]' : 'bg-white';

                  // Progress bar style in TỶ LỆ column
                  const progressTrackClass = ratePct >= 50
                    ? 'bg-[#D1FAE5] border-[#6EE7B7]'
                    : ratePct >= 40
                      ? 'bg-[#FEF3C7] border-[#FCD34D]'
                      : 'bg-[#FFE4E6] border-[#FECDD3]';
                  const progressFillClass = ratePct >= 50
                    ? 'bg-gradient-to-r from-[#34D399] to-[#10B981]'
                    : ratePct >= 40
                      ? 'bg-gradient-to-r from-[#FDE047] to-[#FBBF24]'
                      : 'bg-gradient-to-r from-[#FDA4AF] to-[#FB7185]';
                  const progressTextClass = ratePct >= 50
                    ? 'text-[#064E3B]'
                    : ratePct >= 40
                      ? 'text-[#78350F]'
                      : 'text-[#9F1239]';

                  return (
                    <tr
                      key={staff.fullId || index}
                      className={cn(
                        "group transition-colors hover:bg-sky-50/40",
                        rowHeightClass,
                        isEvenRow ? "bg-[#F8FAFC]" : "bg-white"
                      )}
                    >
                      {/* Cột 1: STT (với huy hiệu Top 1, 2, 3) */}
                      <td
                        className={cn(
                          "td-col-stt thi-dua-sticky-col md:sticky md:left-0 md:z-20 px-1 py-0 text-center border border-[#E2E8F0] font-black text-[11.5px] sm:text-[12px] tabular-nums",
                          stickyBgClass
                        )}
                      >
                        {index === 0 ? (
                          <span
                            className="inline-flex items-center justify-center bg-gradient-to-b from-[#FDE047] via-[#F59E0B] to-[#D97706] text-white text-[11px] font-black shadow-2xs border border-[#D97706]/50"
                            style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                          >
                            1
                          </span>
                        ) : index === 1 ? (
                          <span
                            className="inline-flex items-center justify-center bg-gradient-to-b from-[#E2E8F0] via-[#94A3B8] to-[#64748B] text-white text-[11px] font-black shadow-2xs border border-[#64748B]/40"
                            style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                          >
                            2
                          </span>
                        ) : index === 2 ? (
                          <span
                            className="inline-flex items-center justify-center bg-gradient-to-b from-[#FDBA74] via-[#EA580C] to-[#C2410C] text-white text-[11px] font-black shadow-2xs border border-[#C2410C]/40"
                            style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                          >
                            3
                          </span>
                        ) : (
                          <span className="text-[#1E293B]">{index + 1}</span>
                        )}
                      </td>

                      {/* Cột 2: MÃ NV */}
                      <td
                        className={cn(
                          "td-col-id thi-dua-sticky-col md:sticky md:left-[48px] md:z-20 px-1 sm:px-1.5 py-0 text-center border border-[#E2E8F0] text-[11px] sm:text-[12px] font-black text-[#1E3A5F] tabular-nums truncate",
                          stickyBgClass
                        )}
                      >
                        {empId}
                      </td>

                      {/* Cột 3: NHÂN VIÊN */}
                      <td
                        className={cn(
                          "td-col-name thi-dua-sticky-col md:sticky md:left-[122px] md:z-20 px-1.5 sm:px-2.5 py-1.5 md:py-0 align-middle border border-[#E2E8F0] text-[11px] sm:text-[12px] font-black uppercase tracking-tight text-[#0D2440]",
                          stickyBgClass
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 min-h-full w-full min-w-0">
                          <span className="td-emp-name block flex-1 min-w-0 text-left whitespace-normal md:truncate leading-[1.32]" title={empName}>{empName}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyStaff(staff)}
                            title="Sao chép báo cáo nhân viên"
                            className={cn(
                              "no-capture hidden md:inline-flex p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0",
                              copiedId === staff.fullId ? "bg-emerald-100 text-emerald-600 opacity-100" : "bg-slate-100 text-slate-400 hover:text-emerald-600"
                            )}
                          >
                            {copiedId === staff.fullId ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Cột 4: ĐẠT (Số ngành) */}
                      <td
                        className={cn(
                          "td-col-dat thi-dua-sticky-col md:sticky md:left-[297px] md:z-20 px-0.5 sm:px-1 py-0 text-center border border-[#E2E8F0] tabular-nums",
                          stickyBgClass
                        )}
                      >
                        <span className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[10.5px] sm:text-[11.5px] font-black text-[#0F2942]">
                          {visibleAchieved}/{activeCatCount}
                        </span>
                      </td>

                      {/* Cột 5: TỶ LỆ (Số ngành) với thanh tiến độ trực quan */}
                      <td
                        className={cn(
                          "td-col-tyle thi-dua-sticky-col md:sticky md:left-[373px] md:z-20 px-1 sm:px-1.5 py-0 text-center border border-[#E2E8F0] border-r-2 border-r-slate-300",
                          stickyBgClass
                        )}
                      >
                        <div className={cn("thi-dua-progress-pill relative w-full h-[22px] rounded-full border overflow-hidden flex items-center justify-center", progressTrackClass)}>
                          <div
                            className={cn("absolute left-0 top-0 bottom-0 rounded-full transition-all", progressFillClass)}
                            style={{ width: `${Math.min(100, Math.max(ratePct > 0 ? 12 : 0, ratePct))}%` }}
                          />
                          <span className={cn("relative z-10 text-[10.5px] sm:text-[11px] font-black tabular-nums leading-none", progressTextClass)}>
                            {ratePercentStr}
                          </span>
                        </div>
                      </td>

                      {/* Các cột % ngành hàng (sắp xếp theo đúng thứ tự Nhóm ICT -> Dịch Vụ -> CE & GD) */}
                      {orderedVisibleCats.map((catName) => {
                        const idx = categories.indexOf(catName);
                        const projectedRate = idx !== -1 ? staff.projectedRates[idx] : undefined;
                        const hasData = projectedRate !== undefined && projectedRate !== null && !Number.isNaN(projectedRate);
                        const roundedRate = hasData ? Math.round(projectedRate) : 0;

                        const cellColorClass = !hasData
                          ? "bg-white text-slate-400"
                          : roundedRate >= 100
                            ? "bg-[#D1FAE5] text-[#065F46]"      /* >= 100% (Đạt tốt): Xanh lá dịu */
                            : roundedRate >= 80
                              ? "bg-[#FEF3C7] text-[#92400E]"    /* 80% - < 100% (Gần đạt): Vàng dịu */
                              : roundedRate > 0
                                ? "bg-[#FFE4E6] text-[#9F1239]"  /* < 80% (Chưa đạt): Hồng nhạt */
                                : "bg-[#FFF1F2] text-[#E11D48]"; /* 0%: Chữ đỏ trên nền hồng rất nhạt */

                        return (
                          <React.Fragment key={catName}>
                            <td
                              className={cn(
                                "td-col-cat px-1 py-0 text-[11.5px] sm:text-[12px] font-black text-center border border-[#E2E8F0] tabular-nums truncate",
                                cellColorClass
                              )}
                            >
                              {hasData ? `${roundedRate}%` : '-'}
                            </td>
                            {cleanCategoryName(catName) === 'maylanhdacquyen' && (
                              <td className="td-col-spacer bg-white border border-[#E2E8F0]"></td>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══ 5. THANH CHÚ THÍCH MÀU SẮC & ĐIỀU KHIỂN CUỐI BẢNG (FOOTER LEGEND) ═══ */}
        <div className="td-footer-bar flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-[#F8FAFC] border-t border-[#DCE7F3]">
          {/* Left: Color Legend */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] sm:text-[11.5px] font-bold text-[#1E3A5F]">
            <span className="font-black uppercase tracking-wide text-[#0D2440]">CHÚ THÍCH MÀU SẮC:</span>

            <span className="inline-flex items-center gap-1.5">
              <span
                className="bg-[#D1FAE5] border border-[#6EE7B7] shrink-0"
                style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block' }}
              />
              <span>≥ 100% (Đạt tốt)</span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span
                className="bg-[#FEF3C7] border border-[#FCD34D] shrink-0"
                style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block' }}
              />
              <span>80% - &lt; 100% (Gần đạt)</span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span
                className="bg-[#FFE4E6] border border-[#FECDD3] shrink-0"
                style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block' }}
              />
              <span>&lt; 80% (Chưa đạt)</span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span
                className="bg-[#FFF1F2] border border-[#FECDD3] shrink-0"
                style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block' }}
              />
              <span className="text-[#E11D48] font-black">0%</span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span
                className="bg-white border border-slate-300 shrink-0"
                style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block' }}
              />
              <span className="text-slate-500">Không có dữ liệu</span>
            </span>
          </div>

          {/* Right: Display Count & View Mode Controls */}
          <div className="no-capture flex items-center gap-2 ml-auto">
            <select
              value={displayLimit}
              onChange={(e) => {
                const val = e.target.value;
                setDisplayLimit(val === 'ALL' ? 'ALL' : Number(val));
              }}
              aria-label="Số lượng nhân viên hiển thị"
              className="px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-[11.5px] font-black text-slate-700 outline-none cursor-pointer shadow-2xs"
            >
              <option value="ALL">Hiển thị {filteredStaffMatrix.length} nhân viên</option>
              <option value={10}>Hiển thị 10 nhân viên</option>
              <option value={20}>Hiển thị 20 nhân viên</option>
              <option value={50}>Hiển thị 50 nhân viên</option>
            </select>

            <div className="inline-flex items-center bg-white border border-slate-200/90 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setIsCompactView(false)}
                title="Chế độ chuẩn"
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  !isCompactView ? "bg-[#059669] text-white" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsCompactView(true)}
                title="Chế độ thu gọn"
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isCompactView ? "bg-[#059669] text-white" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <List size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExpandedView(!isExpandedView)}
              title={isExpandedView ? "Thu nhỏ bảng" : "Phóng to toàn màn hình"}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
            >
              {isExpandedView ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Comment Modal - Orange gradient design with template tabs */}
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
                      generateThiDuaComment(tab.id);
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
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Capture Loading Overlay */}
      <CaptureLoadingOverlay isLoading={isCapturing} />

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default React.memo(SummaryThiDuaTable);
