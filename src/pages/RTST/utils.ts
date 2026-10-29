/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MarketInfo, CategoryData, StaffData, StaffMatrixData, YcxStaffData, YcxItemDetail, YcxRankData, MwgBiStaffRow, MwgBiSummaryKpi, MwgBiStaffTotals, MwgBiStaffReportData } from './types';
import { registerCacheCleaner } from '../../services/globalCacheRegistry';


export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const CANONICAL_CATEGORY_ALIASES: Record<string, string> = {
  simmobifonevinaphonesimdmx: 'simmobifonesimdmx',
  hutbui20tinh: 'hutbui',
  maylockhongkhihuttaoamhutbui: 'hutbui',
  maylockhongkhihutamhutbui: 'hutbui',
  maylockhongkhihutbuihutam: 'hutbui',
  pkitvanhomkhac: 'pkitnhomkhac',
  bh: 'bhtong',
  dichvuvas: 'vas',
  chovaytienmat: 'vaytienmat',
  pinsacduphong: 'sacduphong',
  pinduphong: 'sacduphong',
  doanhthudongho: 'dongho',
  fecreditshinhansamsungfinance: 'trachamfecreditshinhansamsungfinance',
  tulanhmaygiatmaylanhpanasonic: 'panasonic',
  binhnuocnongferrolirapido: 'binhnuocnong',
  tivitcl: 'dientutcl',
  tabletandroid: 'tabletandroidmaydocsach',
  tabletandroidvamaydocsach: 'tabletandroidmaydocsach',
  mothetindungtpbankevovavpbankmwg: 'mothetindungtpbankevovpbankmwg',
  trachamdienmayvagd: 'trachamdienmaygd',
  trachamdienmayvagiadung: 'trachamdienmaygd',
  loa: 'audio',
  mangoplusicallme: 'ottmangoicallme',
  mangoicallme: 'ottmangoicallme',
};

export const cleanCategoryName = (name: string): string => {
  if (!name) return '';
  let namePart = name;
  const targetMatch = namePart.match(/(.+?)\bTARGET\b/i);
  if (targetMatch) {
    namePart = targetMatch[1];
  }
  // Strip Vietnamese conjunction "và" before removing accents so "A và B" matches "A & B" / "A - B"
  namePart = namePart.replace(/\bvà\b/gi, ' ');

  let clean = removeAccents(namePart).trim();
  
  // Strip leading numbering like "1. ", "01. ", "1 - ", "01 - "
  clean = clean.replace(/^(\d+[\s.-]+)/, '');

  // Strip prefixes like "nnh " or "nh " at the start
  clean = clean.replace(/^(nnh|nh)\s+/, '');
  
  // Strip month prefixes like "T10 - ", "T09 - T10 ", "T09-T10 ", "Tháng 10 - ", "T10 ", "T9 "
  clean = clean.replace(/^(t\d{1,2}\s*(?:-\s*t\d{1,2}\s*)?[-:_]?\s*)/i, '');
  clean = clean.replace(/^(thang\s*\d{1,2}\s*[-:_]?\s*)/i, '');
  clean = clean.replace(/\bthang\s*\d{1,2}\b/gi, '');

  // Strip provincial scope suffixes like "- 20 Tỉnh"
  clean = clean.replace(/\s*-\s*\d+\s*tinh\b/gi, '');

  // Strip unaccented standalone conjunction "va" between category words
  clean = clean.replace(/\bva\b/g, ' ');

  // Replace abbreviations
  clean = clean.replace(/\b(bao hiem)\b/g, 'bh');
  clean = clean.replace(/\b(dien may xanh)\b/g, 'dmx');
  clean = clean.replace(/\b(the gioi di dong)\b/g, 'tgdd');
  clean = clean.replace(/\b(gia dung)\b/g, 'gd');
  clean = clean.replace(/\b(phu kien)\b/g, 'pk');
  
  // Also replace inline occurrences
  clean = clean.replace(/bao\s+hiem/g, 'bh');
  clean = clean.replace(/dien\s+may\s+xanh/g, 'dmx');
  clean = clean.replace(/the\s+gioi\s+di\s+dong/g, 'tgdd');
  clean = clean.replace(/gia\s+dung/g, 'gd');
  clean = clean.replace(/phu\s+kien/g, 'pk');

  // Strip all non-alphanumeric characters
  const stripped = clean.replace(/[^a-z0-9]/g, '');
  return CANONICAL_CATEGORY_ALIASES[stripped] || stripped;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrencyValue = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '';
  const absVal = Math.abs(val);
  if (absVal >= 1000000000) {
    // 1 billion (1 Tỷ) and above
    const ty = val / 1000000000;
    const formatted = parseFloat(ty.toFixed(3)).toLocaleString('vi-VN');
    return `${formatted} Tỷ`;
  }
  if (absVal >= 1000000) {
    // 1 million (1 Tr) up to 999 million
    const tr = val / 1000000;
    return `${Math.round(tr).toLocaleString('vi-VN')} Tr`;
  }
  return Math.round(val).toLocaleString('vi-VN');
};

export function formatShortCurrency(val: number): string {
  if (val === 0) return '';
  if (val >= 1000000) {
    return (Math.floor(val / 100000) / 10).toString() + 'tr';
  }
  return (Math.floor(val / 10000) / 100).toString() + 'tr';
}

export function formatRealtimeDate(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `REALTIME : ${hh}:${mm} ${dd}-${month}-${yyyy}`;
}

export function formatLuyKeDate(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const dd = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${month}-${yyyy}`;
}

export function getWorkingDayProgress(): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 8 * 60; // 08:00
  const endMinutes = 21 * 60; // 21:00
  const totalMinutes = endMinutes - startMinutes;

  if (currentMinutes <= startMinutes) return 0;
  if (currentMinutes >= endMinutes) return 100;
  
  return ((currentMinutes - startMinutes) / totalMinutes) * 100;
}

// --- IDB Local Cache for Massive YCX Files ---
export const localYcxDb = {
  db: null as IDBDatabase | null,
  init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);
      const req = indexedDB.open('CRM_SieuThi_LocalDB', 1);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('ycx_cache')) {
          db.createObjectStore('ycx_cache');
        }
      };
      req.onsuccess = (e: any) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  },
  async set(key: string, value: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('ycx_cache', 'readwrite');
      const store = tx.objectStore('ycx_cache');
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async get(key: string): Promise<string | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('ycx_cache', 'readonly');
      const store = tx.objectStore('ycx_cache');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(tx.error);
    });
  },
  async clear(): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('ycx_cache', 'readwrite');
        const store = tx.objectStore('ycx_cache');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* ignore */ }
  }
};

export function getMonthProgress(): { daysPassed: number, totalDays: number, percent: number } {
  const now = new Date();
  const daysPassed = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    daysPassed,
    totalDays,
    percent: (daysPassed / totalDays) * 100
  };
}

export function getLuyKeProgress(daysPassed: number, totalDays: number): string {
  return `${daysPassed}/${totalDays}`;
}

// --- Market Utils ---
let marketRegistryCache: Record<string, string> | null = null;

export function clearMarketRegistryCache() {
  marketRegistryCache = null;
}

// Auto-register with the global cache registry so AuthContext can clear us during login/logout
registerCacheCleaner(clearMarketRegistryCache);

export const getMarketRegistry = (): Record<string, string> => {
  if (marketRegistryCache) return marketRegistryCache;
  try {
    const saved = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('BI_MARKET_REGISTRY_V1') : null;
    const registry = saved ? JSON.parse(saved) : {};
    marketRegistryCache = {
      "96": "ĐMM_BLI_GRA - PHƯỜNG 1",
      "11": "ĐMS3_BLI_HBI - VĨNH BÌNH",
      ...registry
    };
    return marketRegistryCache!;
  } catch {
    marketRegistryCache = {
      "96": "ĐMM_BLI_GRA - PHƯỜNG 1",
      "11": "ĐMS3_BLI_HBI - VĨNH BÌNH"
    };
    return marketRegistryCache!;
  }
};

export const updateMarketRegistry = (formattedName: string) => {
  if (!formattedName.includes(" - ")) return;
  try {
    const [code] = formattedName.split(" - ");
    const cleanCode = code.trim();
    if (!cleanCode) return;
    
    const registry = getMarketRegistry();
    if (registry[cleanCode] !== formattedName) {
      registry[cleanCode] = formattedName;
      marketRegistryCache = registry;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('BI_MARKET_REGISTRY_V1', JSON.stringify(registry));
      }
    }
  } catch (e) {
    console.error("Error updating market registry:", e);
  }
};

export const formatMarketNameForDisplay = (name: string) => {
  if (!name) return "";
  const trimmed = name.trim();
  const prefixes = ["ĐML", "ĐMM", "ĐMS3", "ĐMS", "TGD", "AAR"];
  const upper = trimmed.toUpperCase();
  for (const p of prefixes) {
    const idx = upper.indexOf(p);
    if (idx !== -1) {
      return trimmed.substring(idx).trim();
    }
  }
  return trimmed;
};

export const formatStaffName = (name: string) => {
  if (!name) return "";
  const cleanName = name.replace(/[-_]+$/, '').trim();
  
  // Case 1: "Name - ID"
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    const namePart = parts[0].trim();
    const idPart = parts[1].trim();
    return `${namePart.toUpperCase()} - ${idPart}`;
  }
  
  // Case 2: "Name ID" (last part is number)
  const parts = cleanName.split(' ');
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.match(/^\d+$/)) {
    const namePart = parts.slice(0, -1).join(' ').trim();
    return `${namePart.toUpperCase()} - ${lastPart}`;
  }
  
  return cleanName.toUpperCase();
};

export const formatMarketName = (raw: string) => {
  if (!raw) return "";
  let upper = raw.toUpperCase().trim();
  
  // Strip leading numeric code if followed by supermarket prefix (e.g. "1841 - ĐML_CMA_CMA - 155A..." -> "ĐML_CMA_CMA - 155A...")
  upper = upper.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)[_\s-])/i, '').trim();

  let result = upper;
  let found = false;
  
  if (upper.includes(" - ")) {
    const [codePart, ...nameParts] = upper.split(" - ");
    const code = codePart.trim().replace(/[\s-]+/g, '_');
    const name = nameParts.join(" - ").trim();
    result = `${code} - ${name}`;
    found = true;
  } else {
    const prefixes = ["ĐMM", "ĐMS3", "ĐML", "ĐMS", "MWG", "BHX"];
    for (const pref of prefixes) {
      if (upper.includes(pref)) {
        const idx = upper.indexOf(pref);
        const relevant = upper.substring(idx);
        const parts = relevant.split(/[\s_/-]+/).filter(p => p.trim());
        if (parts.length >= 3) {
          const code = parts.slice(0, 3).join('_');
          const name = parts.slice(3).join(' ');
          result = name ? `${code} - ${name}` : code;
          found = true;
          break;
        }
      }
    }
  }

  if (!found && /^\d+$/.test(upper)) {
    const registry = getMarketRegistry();
    if (registry[upper]) return registry[upper];
  }

  if (result.includes(" - ")) {
    updateMarketRegistry(result);
  }
  
  return result.includes(" - ") ? result : result.replace(/[\s_]+/g, ' ');
};

export const isValidStoreName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  let trimmed = name.trim();
  if (trimmed.length === 0) return false;

  // Tự động gọt tiền tố số kho nếu người dùng copy từ BI (VD: "2187 - ĐML_..." -> "ĐML_...")
  trimmed = trimmed.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG|SIÊU THỊ|CH|KHO)[_\s-])/i, '').trim();
  trimmed = trimmed.replace(/^\d+\s*[-–—]\s*/, '').trim();

  // TUYỆT ĐỐI TỪ CHỐI TÊN BẮT ĐẦU BẰNG CHỮ SỐ (VD: 2187, 2187 - ...)
  if (/^\d/.test(trimmed)) return false;

  // Reject pure numbers (e.g. "7981", "1841", "001") - these are warehouse codes (mã kho), NEVER supermarket names!
  if (/^\d+$/.test(trimmed)) return false;

  // Reject generic placeholder names like "Siêu thị 2323", "Siêu thị 1841 (Offline Mode)"
  if (/^siêu\s*thị\s*\d+(\s*\(offline mode\))?$/i.test(trimmed)) return false;

  // Supermarket names must contain at least one Vietnamese or Latin letter
  if (!/[a-zA-ZÀ-ỹ]/.test(trimmed)) return false;

  // Reject code syntax, arrow functions, operators, braces, quotes, control characters
  // NOTE: Parentheses '()' and forward slashes '/' are valid in Vietnamese addresses/store names (e.g. "ĐMM_BLI_DHA - 25 Đường 19/5 (Gành Hào)")
  if (/(=>|!==|===|!=|==|[{}[\];$\\`"']|<[^>]*>)/.test(trimmed)) return false;
  if (/[\r\n\t]/.test(trimmed)) return false;

  const upper = trimmed.toUpperCase();
  if (
    upper === 'ALL' ||
    upper === 'TẤT CẢ' ||
    upper === 'TỔNG' ||
    upper === 'TONG' ||
    upper.includes('TỔNG HỢP') ||
    upper.includes('TỔNG CỘNG') ||
    upper.includes('TONG HOP') ||
    upper.includes('GRAND TOTAL')
  ) return false;

  // Reject BI report headers, metric labels, revenue types, KPIs unless having explicit store prefix
  const normMetric = upper.replace(/[\s\-_]+/g, ' ');
  if (
    normMetric === 'DT QUY DOI' ||
    normMetric === 'DT QUY ĐỔI' ||
    normMetric === 'DTQĐ' ||
    normMetric === 'DTQD' ||
    normMetric === 'DT THUC' ||
    normMetric === 'DT THỰC' ||
    normMetric === 'QUY DOI' ||
    normMetric === 'QUY ĐỔI' ||
    normMetric.includes('DT QUY ĐỔI') ||
    normMetric.includes('DT QUY DOI') ||
    normMetric.includes('DT THỰC') ||
    normMetric.includes('DT THUC') ||
    normMetric.includes('DOANH THU QUY ĐỔI') ||
    normMetric.includes('DOANH THU QUY DOI') ||
    normMetric.includes('DOANH THU THỰC') ||
    normMetric.includes('DOANH THU THUC') ||
    normMetric.includes('THỰC ĐẠT') ||
    normMetric.includes('THUC DAT') ||
    normMetric.includes('THỰC THU') ||
    normMetric.includes('THUC THU') ||
    normMetric.includes('DOANH SỐ') ||
    normMetric.includes('DOANH SO') ||
    normMetric.includes('TỶ LỆ') ||
    normMetric.includes('TY LE') ||
    normMetric.includes('LÃI GỘP') ||
    normMetric.includes('LAI GOP') ||
    normMetric.includes('GIÁ TRỊ') ||
    normMetric.includes('GIA TRI') ||
    upper.includes('BI TỔNG QUAN') || 
    upper.includes('BI TONG QUAN') ||
    upper.includes('BÁO CÁO') ||
    upper.includes('BAO CAO') ||
    upper.includes('DASHBOARD') ||
    upper.includes('DANH MỤC') ||
    upper.includes('DANH MUC') ||
    upper.includes('LUỸ KẾ') ||
    upper.includes('LUY KE') ||
    upper.includes('REALTIME') ||
    upper.includes('TIẾN ĐỘ') ||
    upper.includes('TIEN DO') ||
    upper.includes('DOANH THU') ||
    upper.includes('MỤC TIÊU') ||
    upper.includes('MUC TIEU') ||
    upper.includes('ĐƠN VỊ:') ||
    upper.includes('DON VI:') ||
    upper.includes('COPY XONG')
  ) {
    const hasStorePrefix = /^(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG|SIÊU THỊ)[_\s-]/i.test(upper);
    if (!hasStorePrefix) return false;
  }

  return true;
};

/**
 * Normalize a store name for use as a Supabase/Firestore document ID (primary key).
 * Converts to UPPERCASE and trims whitespace so that "Láng Tròn" and "LÁNG TRÒN"
 * always map to the same row, preventing duplicate documents.
 * Slashes '/' are replaced with '-' so Firestore document paths remain valid.
 * TUYỆT ĐỐI KHÔNG TẠO DOCUMENT BẮT ĐẦU BẰNG SỐ.
 */
export const normalizeStoreId = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  let trimmed = name.trim();

  // Tự động chuẩn hóa & gọt bỏ tiền tố mã kho nếu người dùng hoặc dữ liệu BI chèn số kho vào (VD: "2187 - ĐML_..." -> "ĐML_...")
  trimmed = trimmed.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG|SIÊU THỊ|CH|KHO)[_\s-])/i, '').trim();
  trimmed = trimmed.replace(/^\d+\s*[-–—]\s*/, '').trim();
  // Khắc phục lỗi dấu gạch nối chèn nhầm vào ngày/tháng/số nhà
  trimmed = trimmed.replace(/(Đường|Đ\.|Phố)\s*-\s*(\d+)/gi, '$1 $2').trim();

  // TUYỆT ĐỐI TỪ CHỐI BẤT KỲ TÊN NÀO BẮT ĐẦU BẰNG SỐ (VD: 2187, 2187...)
  if (/^\d/.test(trimmed)) {
    console.warn(`[normalizeStoreId] REJECTED NUMERIC STORE ID: "${name}" -> "${trimmed}"`);
    return '';
  }

  if (!isValidStoreName(trimmed)) {
    console.warn(`[normalizeStoreId] Rejected invalid store name: "${trimmed}"`);
    return '';
  }
  return trimmed.normalize('NFC').toUpperCase().replace(/\//g, '-');
};

export const normalize = (s: string) => {
  if (!s) return "";
  // NFC normalization and basic cleaning (include '/' so store names like "19/5" match "19-5")
  const basic = s.trim().normalize('NFC').replace(/[\s\-_/]+/g, ' ').toLowerCase();
  // Remove accents for more robust matching
  return basic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
};

export const isKhoLuuDong = (name: string): boolean => {
  if (!name) return false;
  const n = name.toLowerCase();
  if (
    n.includes('lưu động') ||
    n.includes('luu dong') ||
    n.includes('kho bán hàng') ||
    n.includes('kho ban hang')
  ) {
    return true;
  }
  const norm = normalize(name);
  return (
    norm.includes('kho ban hang luu dong') ||
    norm.includes('luu dong') ||
    norm.includes('kho ban hang')
  );
};

export const cleanNum = (s: string | number | null | undefined): number => {
  if (s === null || s === undefined) return 0;
  if (typeof s === 'number') return isNaN(s) ? 0 : s;
  let str = String(s).trim();
  if (!str) return 0;

  // Handle percentages like "20.9%" or "-99.9%"
  if (str.includes('%')) {
    str = str.replace(/%/g, '').replace(/,/g, '.').trim();
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }

  let clean = str.replace(/[^\d,.-]/g, '');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) return parseFloat(clean.replace(/\./g, '').replace(/,/g, '.')) || 0;
    else return parseFloat(clean.replace(/,/g, '')) || 0;
  } else if (lastComma !== -1) {
    const parts = clean.split(',');
    // If all parts after first comma are 3 digits, it's thousands separator (e.g., 1,676 or 1,234,567)
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      return parseFloat(clean.replace(/,/g, '')) || 0;
    }
    return parseFloat(clean.replace(/,/g, '.')) || 0;
  } else if (lastDot !== -1) {
    const parts = clean.split('.');
    // If all parts after first dot are 3 digits, it's thousands separator (e.g., 1.676 or 1.234.567)
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
    return parseFloat(clean) || 0;
  }
  return parseFloat(clean) || 0;
};

export const extractSection = (input: string, sectionName: string): string => {
  const upperInput = input.toUpperCase();
  const upperSectionName = sectionName.toUpperCase();
  
  const startIndex = upperInput.indexOf(upperSectionName);
  if (startIndex === -1) return input;
  
  // Tìm điểm bắt đầu của section tiếp theo (ví dụ: "\n2. " hoặc "\n3. ")
  const remainingInput = input.substring(startIndex + sectionName.length);
  const nextSectionMatch = remainingInput.match(/\n\d+\.\s/);
  
  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    return input.substring(startIndex, startIndex + sectionName.length + nextSectionMatch.index);
  }
  return input.substring(startIndex);
};

export const parseMarketData = (input: string, adjustment: number, pageType?: string): MarketInfo[] => {
  const val = input.trim();
  if (!val) {
    return [];
  }

  // 1. Extract Top KPI Cards if present in BI text
  let topInstallmentRate = 0;
  const normValForTopKpi = removeAccents(val);
  const traGopMatch = normValForTopKpi.match(/(?:t[yi]\s*trong\s*tra\s*(?:gop|cham)|t[yi]\s*trong\s*t[gc]|%\s*tra\s*(?:gop|cham))[\s\S]{0,60}?([\d,.]+)\s*%/i) ||
                      val.match(/(?:T[ỉiỷy]\s*tr[ọo]ng\s*tr[ảa]\s*(?:g[óo]p|ch[ậa]m)|T[ỉiỷy]\s*tr[ọo]ng\s*t[gc]|%\s*tr[ảa]\s*(?:g[óo]p|ch[ậa]m))[\s\S]{0,60}?([\d,.]+)\s*%/i) ||
                      normValForTopKpi.match(/([\d,.]+)\s*%[\s\S]{0,60}?(?:t[yi]\s*trong\s*tra\s*(?:gop|cham)|t[yi]\s*trong\s*t[gc]|%\s*tra\s*(?:gop|cham))/i) ||
                      val.match(/([\d,.]+)\s*%[\s\S]{0,60}?(?:T[ỉiỷy]\s*tr[ọo]ng\s*tr[ảa]\s*(?:g[óo]p|ch[ậa]m)|T[ỉiỷy]\s*tr[ọo]ng\s*t[gc]|%\s*tr[ảa]\s*(?:g[óo]p|ch[ậa]m))/i);
  if (traGopMatch) {
    topInstallmentRate = cleanNum(traGopMatch[1]);
  }

  let topDtqd = 0;
  const dtqdMatch = val.match(/DT\s*quy\s*đổi\s*\n\s*([\d,.]+)/i);
  if (dtqdMatch) {
    topDtqd = cleanNum(dtqdMatch[1]);
  }

  let topDtThuc = 0;
  const dtThucMatch = val.match(/(?:DT|Doanh\s*thu)\s*th[ựựu]c[\s:\n]+([\d,.]+)/i);
  if (dtThucMatch) {
    topDtThuc = cleanNum(dtThucMatch[1]);
  }

  let topTarget = 0;
  let topPercentHt = 0;
  const targetMatch = val.match(/Target\s*tr[ọo]n\s*k[ỳy]\s*([\d,.]+)\s*[·•]\s*ti[ếe]n\s*đ[ộo]\s*([\d,.]+)%/i);
  if (targetMatch) {
    topTarget = cleanNum(targetMatch[1]);
    topPercentHt = cleanNum(targetMatch[2]);
  }
  const percentHtMatch = val.match(/%\s*HT\s*target\s*\(LK\)\s*\n[^\d]*\n\s*([\d,.]+)%/i);
  if (percentHtMatch && !topPercentHt) {
    topPercentHt = cleanNum(percentHtMatch[1]);
  }

  // 2. Preprocess lines: Combine standalone supermarket name lines with following data line
  let rawLines = val.split('\n').map(l => l.trim()).filter(Boolean);
  const lines: string[] = [];
  const prefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR", "BHX", "MWG", "TỔNG"];
  const isSupermarketName = (text: string) => {
    const upper = text.toUpperCase();
    return prefixes.some(p => upper.includes(p)) || /^\d+\s*[-–—]\s*[A-ZĐ]/.test(upper);
  };

  // 2a. Detect BI web line-separated table format (each cell on its own line)
  // Known table header names that appear as separate lines in BI web copy
  const biWebKnownHeaders = [
    "siêu thị", "tên siêu thị", "stt",
    "số lượng", "so luong", "sl",
    "doanh thu qđ", "doanh thu qd", "dt quy đổi", "dtqđ", "dt qđ",
    "dt qđ khoản vay", "dt qd khoan vay", "doanh thu qđ khoản vay", "doanh thu qd khoan vay", "khoản vay", "khoan vay", "bhkv",
    "% tỉ trọng", "% ti trong", "% tỷ trọng", "% ty trong", "tỉ trọng", "ti trong", "tỷ trọng", "ty trong",
    "doanh thu", "dtlk", "doanh thu lũy kế",
    "target", "mục tiêu", "target qđ", "target (qđ)",
    "% ht target", "% ht", "tiến độ", "% tiến độ", "%ht target",
    "tb 3 tháng", "tb3t", "tb 3t", "tb 3 thang",
    "% tt", "% tăng trưởng", "tăng trưởng", "% tang truong", "tang truong", "tt vs tb 3 tháng",
    "dt dự kiến", "doanh thu dự kiến", "dự kiến", "du kien",
    "dt trả góp", "doanh thu trả góp", "dt trả chậm", "doanh thu trả chậm", "dt tg", "dt tc",
    "% trả góp", "% tra gop", "tỉ trọng trả góp", "tỷ trọng trả góp", "% trả chậm", "% tra cham", "tỉ trọng trả chậm", "tỷ trọng trả chậm", "% tg", "% tc"
  ];
  const biWebKnownHeadersSet = new Set(biWebKnownHeaders);

  const cleanBiHeaderToken = (raw: string): string => {
    return raw
      .replace(/\(?\s*⚡?\s*copy\s*all\s*\)?/gi, '')
      .replace(/\bcopy\b/gi, '')
      .replace(/[?⇅↑↓▲▼]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isHeaderNoiseLine = (raw: string): boolean => {
    const lower = raw.trim().toLowerCase();
    return (
      lower === '?' ||
      lower === '⇅' ||
      lower === '↑' ||
      lower === '↓' ||
      lower === 'copy' ||
      lower === 'copy all' ||
      lower === '⚡ copy all' ||
      lower === '(⚡ copy all)'
    );
  };
  
  let biWebHeaderStartIdx = -1;
  let biWebHeaderEndLineIdx = -1;
  let biWebDetectedHeaders: string[] = [];
  
  for (let i = 0; i < rawLines.length; i++) {
    if (isHeaderNoiseLine(rawLines[i])) {
      if (biWebHeaderStartIdx !== -1) {
        biWebHeaderEndLineIdx = i + 1;
      }
      continue;
    }
    const cleanedHeader = cleanBiHeaderToken(rawLines[i]);
    const lower = cleanedHeader.toLowerCase();
    const isKnown = biWebKnownHeadersSet.has(lower) || 
      lower.includes('khoản vay') || lower.includes('khoan vay') || lower.includes('bhkv');
    if (isKnown) {
      if (biWebHeaderStartIdx === -1) biWebHeaderStartIdx = i;
      biWebDetectedHeaders.push(cleanedHeader);
      biWebHeaderEndLineIdx = i + 1;
    } else if (biWebHeaderStartIdx !== -1) {
      if (biWebDetectedHeaders.length >= 5) break; // Enough consecutive headers found
      // Reset if not enough consecutive headers
      biWebHeaderStartIdx = -1;
      biWebHeaderEndLineIdx = -1;
      biWebDetectedHeaders = [];
    }
  }
  
  // If we found >= 5 consecutive known BI web headers as separate lines, reconstruct tab-separated format
  if (biWebDetectedHeaders.length >= 5) {
    const firstHdrLower = biWebDetectedHeaders[0].toLowerCase();
    if (!firstHdrLower.includes('siêu thị') && !firstHdrLower.includes('sieu thi') && firstHdrLower !== 'stt') {
      biWebDetectedHeaders.unshift('SIÊU THỊ');
    }
    const biWebHeaderEndIdx = biWebHeaderEndLineIdx !== -1 ? biWebHeaderEndLineIdx : (biWebHeaderStartIdx + biWebDetectedHeaders.length);
    const dataColCount = biWebDetectedHeaders.length - 1; // Exclude "Siêu thị" name column
    const reconstructedLines: string[] = [];
    
    // Copy lines before header block
    for (let i = 0; i < biWebHeaderStartIdx; i++) {
      reconstructedLines.push(rawLines[i]);
    }
    
    // Add reconstructed tab-separated header
    reconstructedLines.push(biWebDetectedHeaders.join('\t'));
    
    // Process data lines after header block
    let i = biWebHeaderEndIdx;
    while (i < rawLines.length) {
      const line = rawLines[i].trim();
      if (!line) { i++; continue; }
      
      // Check if line is a store name or "Tổng" row (only when not already tab-separated)
      if (!line.includes('\t') && (isSupermarketName(line) || line.toUpperCase().startsWith('TỔNG'))) {
        // Check if the next lines are individual data values (single numeric/percentage/dash per line)
        let allSingleValues = true;
        const values: string[] = [];
        for (let j = 1; j <= dataColCount && (i + j) < rawLines.length; j++) {
          const valLine = rawLines[i + j].trim();
          // Must be a single numeric value, percentage, +/- value, or dash placeholder
          if (/^[+-]?\s*[\d,.]+%?$/.test(valLine)) {
            values.push(valLine.replace(/\s+/g, ''));
          } else if (valLine === '—' || valLine === '–' || valLine === '-' || valLine.toUpperCase() === 'N/A') {
            values.push('0');
          } else {
            allSingleValues = false;
            break;
          }
        }
        
        if (allSingleValues && values.length === dataColCount) {
          // Reconstruct tab-separated data line
          reconstructedLines.push(line + '\t' + values.join('\t'));
          i += dataColCount + 1;
          continue;
        }
      }
      
      // Skip known footer/filter lines, or pass through other lines
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("đơn vị: triệu đồng") || lowerLine.includes("tỉ trọng tính trong") || lowerLine.includes("đã copy xong")) {
        i++;
        continue;
      }
      
      reconstructedLines.push(line);
      i++;
    }
    
    // Replace rawLines with reconstructed lines
    rawLines = reconstructedLines;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if ((isSupermarketName(line) || line.toUpperCase().startsWith('TỔNG')) && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      const nextCols = nextLine.split(/\t|\s{2,}/);
      if (nextCols.length >= 3 && /^-?[\d,.]+(%?)$/.test(nextCols[0].trim())) {
        lines.push(line + '\t' + nextLine);
        i++;
        continue;
      }
    }
    lines.push(line);
  }

  const results: MarketInfo[] = [];

  let marketName = "";
  let targetST = 0;
  let actualReal = 0;
  let actualVirtual = 0;
  let percentHT = 0;
  let percentQD = 0;
  let dtHomQua = 0;
  let isExplicitTarget = false;
  let val1 = "", val2 = "", val3 = "", val4 = "", val5 = "";
  let nameColIdx = -1;
  let cleanLine = "";

  const normalizedVal = val.toLowerCase();
  const hasBiHeader = normalizedVal.includes("bi tổng quan") || normalizedVal.includes("1. bi tổng quan");
  const hasBcHeader = val.includes("BC TỔNG HỢP CỤM") || normalizedVal.includes("bc tổng hợp cụm");
  
  // Relaxed check: Allow processing if it looks like market data
  const isBcTongHopCum = hasBcHeader || pageType === 'LUYKE' || pageType === 'RTST' || normalizedVal.includes("tên siêu thị") || normalizedVal.includes("ngành hàng") || normalizedVal.includes("tổng") || isSupermarketName(val);

  let tyTrongTraGopIdx = -1;
  let headerNameIdx = -1;
  let targetQDIdx = -1;
  let targetSTIdx = -1;
  let actualRealIdx = -1;
  let actualVirtualIdx = -1;
  let dtHomQuaIdx = -1;
  let percentHTIdx = -1;
  let percentHTTargetDuKienLNTTIdx = -1;
  let luotBillBanHangIdx = -1;
  let luotBillThuHoIdx = -1;
  let tb3ThangIdx = -1;
  let percentTTIdx = -1;
  let dtTraGopIdx = -1;
  let percentTraGopIdx = -1;

  for (const line of lines) {
    cleanLine = line.trim();
    if (!cleanLine) continue;

    // Reset variables for each iteration
    marketName = "";
    targetST = 0;
    actualReal = 0;
    actualVirtual = 0;
    percentHT = 0;
    percentQD = 0;
    dtHomQua = 0;
    isExplicitTarget = false;
    val1 = ""; val2 = ""; val3 = ""; val4 = ""; val5 = "";
    nameColIdx = -1;

    const lowerLine = cleanLine.toLowerCase();
    const headerCandidateCols = cleanLine.split(/\t|\||\s{2,}/).map(c => cleanBiHeaderToken(c)).filter(Boolean);
    const isMultiColumnHeaderRow =
      headerCandidateCols.length >= 3 &&
      !isSupermarketName(headerCandidateCols[0]) &&
      headerCandidateCols.filter(c => /^-?[\d.,]+%?$/.test(c)).length < 3 &&
      headerCandidateCols.filter(c => {
        const lc = c.toLowerCase();
        return (
          lc.includes("stt") ||
          lc.includes("siêu thị") ||
          lc.includes("sieu thi") ||
          lc.includes("tên miền") ||
          lc.includes("mã kho") ||
          lc.includes("tên kho") ||
          lc.includes("số lượng") ||
          lc.includes("so luong") ||
          lc.includes("doanh thu") ||
          lc.includes("dtqđ") ||
          lc.includes("dtqd") ||
          lc.includes("dtlk") ||
          lc.includes("target") ||
          lc.includes("mục tiêu") ||
          lc.includes("% ht") ||
          lc.includes("%ht") ||
          lc.includes("tiến độ") ||
          lc.includes("tỉ trọng") ||
          lc.includes("tỷ trọng") ||
          lc.includes("trả góp") ||
          lc.includes("trả chậm") ||
          lc.includes("hôm qua")
        );
      }).length >= 2;
    
    if (isMultiColumnHeaderRow) {
      const cols = headerCandidateCols;
      headerNameIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("tên siêu thị") || lower.includes("tên miền") || lower.includes("siêu thị");
      });
      tyTrongTraGopIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("tỷ trọng trả góp") || 
               lower.includes("tỷ trọng trả chậm") || 
               lower.includes("tỷ trọng tg") || 
               lower.includes("tỷ trọng tc") || 
               lower.includes("tt tg") || 
               lower.includes("tt tc") ||
               (lower.includes("trả chậm") && !lower.includes("tlpvtc")) ||
               lower.includes("% trả góp") ||
               lower.includes("% tra gop") ||
               lower.includes("% tg") ||
               lower.includes("% tc");
      });
      targetQDIdx = cols.findIndex(c => {
        const lower = c.toLowerCase().trim();
        if (lower.includes("%")) return false;
        return lower === "target" || lower === "mục tiêu" || lower.includes("target (qđ)") || lower.includes("target qđ") || lower.includes("mục tiêu qđ") || lower.includes("target");
      });
      targetSTIdx = cols.findIndex(c => {
        const lower = c.toLowerCase().trim();
        if (lower.includes("%")) return false;
        return lower === "target" || lower === "mục tiêu" || (lower.includes("target") && !lower.includes("qđ"));
      });
      if (pageType === 'RTST' || !pageType) {
        actualRealIdx = cols.findIndex(c => {
          const lower = c.toLowerCase().trim();
          if (lower.includes("lũy kế") || lower.includes("luy ke") || lower.includes("lk") || lower.includes("dtlk") ||
              lower.includes("qđ") || lower.includes("qd") || lower.includes("quy đổi") || lower.includes("quy doi") ||
              lower.includes("trả góp") || lower.includes("thu hộ") || lower.includes("target") || lower.includes("mục tiêu") ||
              lower.includes("hôm qua") || lower.includes("hqua") || lower.includes("%") || lower.includes("tiến độ")) {
            return false;
          }
          return lower === "doanh thu" || 
                 lower === "doanh thu thực" || 
                 lower === "dt thực" || 
                 lower === "dt thuc" || 
                 lower === "dt" ||
                 lower === "doanh thu ngày" ||
                 lower === "dt ngày" ||
                 lower === "doanh thu bán hàng" ||
                 lower === "dt bán hàng" ||
                 lower.startsWith("doanh thu (thực") ||
                 lower.startsWith("dt (thực");
        });
      } else {
        actualRealIdx = cols.findIndex(c => {
          const lower = c.toLowerCase();
          return lower.includes("dtlk") || lower.includes("doanh thu lũy kế") || lower === "doanh thu";
        });
      }
      actualVirtualIdx = cols.findIndex(c => {
        const lower = c.toLowerCase().trim();
        if (
          lower.includes("target") ||
          lower.includes("mục tiêu") ||
          lower.includes("tiến độ") ||
          lower.includes("%") ||
          lower.includes("lũy kế") ||
          lower.includes("lk") ||
          lower.includes("khoản vay") ||
          lower.includes("khoan vay") ||
          lower.includes("bhkv") ||
          lower.includes("trả góp") ||
          lower.includes("trả chậm")
        ) {
          return false;
        }
        return lower === "doanh thu qđ" ||
               lower === "doanh thu qd" ||
               lower === "dtqđ" ||
               lower === "dtqd" ||
               lower === "doanh thu quy đổi" ||
               lower === "doanh thu qui đổi" ||
               lower === "dt qđ" ||
               lower === "dt qd" ||
               lower === "dt quy đổi" ||
               lower === "dt qui đổi" ||
               lower.includes("doanh thu qđ") ||
               lower.includes("doanh thu quy đổi") ||
               lower.includes("dtqđ");
      });
      dtHomQuaIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("hôm qua") || lower.includes("dt hôm qua");
      });
      percentHTIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("% ht") || lower.includes("tiến độ");
      });
      percentHTTargetDuKienLNTTIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return (lower.includes("% ht target") || lower.includes("% ht") || lower.includes("%ht")) && lower.includes("lntt");
      });
      luotBillBanHangIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("bill bán") || lower.includes("bill ban") || (lower.includes("lượt bill") && !lower.includes("thu hộ")) || lower.includes("số lượng");
      });
      luotBillThuHoIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("thu hộ") || lower.includes("thu ho");
      });
      tb3ThangIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("tb 3") || lower.includes("tb3t") || lower.includes("tb 3t");
      });
      percentTTIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower === "% tt" || lower.includes("tt vs tb 3") || lower.includes("% tăng trưởng") || lower.includes("% tt");
      });
      dtTraGopIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return (lower.includes("dt") || lower.includes("doanh thu")) && (lower.includes("trả góp") || lower.includes("trả chậm") || lower.includes("tg") || lower.includes("tc"));
      });
      percentTraGopIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return (lower.includes("%") || lower.includes("tỉ trọng") || lower.includes("tỷ trọng")) && (lower.includes("trả góp") || lower.includes("trả chậm") || lower.includes("tg") || lower.includes("tc"));
      });
      if (percentTraGopIdx !== -1 && tyTrongTraGopIdx === -1) {
        tyTrongTraGopIdx = percentTraGopIdx;
      }
      continue;
    }

    if (lowerLine.includes("hỗ trợ bi liên hệ user") || 
        lowerLine.includes("copyright © bi report") ||
        lowerLine.includes("chọn và sao chép") ||
        lowerLine.includes("đơn vị: triệu đồng") ||
        lowerLine?.startsWith("tên miền")) {
      continue;
    }
    
    const cols = cleanLine.split(/\t|\||\s{2,}/).map(c => c.trim());
    // Remove trailing empty strings to ensure accurate negative indexing
    while (cols.length > 0 && cols[cols.length - 1] === "") {
      cols.pop();
    }

    if (cols.length < 2) continue;

    // Check first, second or third column for prefixes or store names
    let foundIdx = -1;
    for (let i = 0; i <= Math.min(cols.length - 1, 3); i++) {
      if (cols[i] && (prefixes.some(p => cols[i].trim().toUpperCase().includes(p)) || cols[i].toUpperCase().startsWith('TỔNG') || /^\d+\s*[-–—]\s*[A-ZĐ]/.test(cols[i].trim().toUpperCase()))) {
        foundIdx = i;
        break;
      }
    }
    
    if (foundIdx !== -1) {
      nameColIdx = foundIdx;
      marketName = formatMarketName(cols[nameColIdx].trim());
    } else if (cols.length >= 2) {
      if (cols[0] && isNaN(Number(cols[0].replace(/,/g, ''))) && cols[0].length > 3 && isValidStoreName(cols[0])) {
        foundIdx = 0;
      } else if (cols[1] && isNaN(Number(cols[1].replace(/,/g, ''))) && cols[1].length > 3 && isValidStoreName(cols[1])) {
        foundIdx = 1;
      } else if (cols[2] && isNaN(Number(cols[2].replace(/,/g, ''))) && cols[2].length > 3 && isValidStoreName(cols[2])) {
        foundIdx = 2;
      }
      if (foundIdx !== -1) {
        nameColIdx = foundIdx;
        marketName = formatMarketName(cols[nameColIdx].trim());
      } else {
        continue;
      }
    } else {
      continue;
    }

    if (marketName && isValidStoreName(marketName)) {
      const dataCols = cols.slice(nameColIdx + 1);

      if (pageType === 'RTST' || !pageType) {
        let actualVirtualVal = 0;
        let targetQDVal = 0;
        let percentHTVal = 0;
        let actualRealVal = 0;
        let luotBillBanHangVal = 0;
        let luotBillThuHoVal = 0;
        let installmentRateVal = topInstallmentRate;

        // Ưu tiên cao nhất: Dùng trực tiếp chỉ số cột đã nhận diện từ tiêu đề
        if (actualVirtualIdx !== -1 || actualRealIdx !== -1) {
          if (actualVirtualIdx !== -1 && actualVirtualIdx < cols.length) {
            actualVirtualVal = cleanNum(cols[actualVirtualIdx]);
          }
          if (actualRealIdx !== -1 && actualRealIdx < cols.length) {
            actualRealVal = cleanNum(cols[actualRealIdx]);
          }
          if (targetQDIdx !== -1 && targetQDIdx < cols.length) {
            targetQDVal = cleanNum(cols[targetQDIdx]);
          } else if (targetSTIdx !== -1 && targetSTIdx < cols.length) {
            targetQDVal = cleanNum(cols[targetSTIdx]);
          }
          if (percentHTIdx !== -1 && percentHTIdx < cols.length) {
            percentHTVal = cleanNum(cols[percentHTIdx]);
          }
          if (luotBillBanHangIdx !== -1 && luotBillBanHangIdx < cols.length) {
            luotBillBanHangVal = cleanNum(cols[luotBillBanHangIdx]);
          }
          if (luotBillThuHoIdx !== -1 && luotBillThuHoIdx < cols.length) {
            luotBillThuHoVal = cleanNum(cols[luotBillThuHoIdx]);
          }
          if (tyTrongTraGopIdx !== -1 && tyTrongTraGopIdx < cols.length) {
            installmentRateVal = cleanNum(cols[tyTrongTraGopIdx]);
          }
        } else if (dataCols.length >= 6 && dataCols[3]?.includes('%')) {
          // BI Web format with DT QĐ KHOẢN VAY:
          // [0] SL | [1] DTQĐ | [2] DT QĐ KV | [3] % Tỉ trọng | [4] (DT Thực or Target) | [5] (Target or % HT) | [6] (% HT)
          luotBillBanHangVal = cleanNum(dataCols[0]);
          actualVirtualVal = cleanNum(dataCols[1]);
          if (dataCols[5]?.includes('%')) {
            actualRealVal = 0;
            targetQDVal = cleanNum(dataCols[4]);
            percentHTVal = cleanNum(dataCols[5]);
          } else {
            actualRealVal = cleanNum(dataCols[4]);
            targetQDVal = dataCols.length >= 6 ? cleanNum(dataCols[5]) : 0;
            percentHTVal = dataCols.length >= 7 ? cleanNum(dataCols[6]) : 0;
          }
        } else if (dataCols.length >= 5 && dataCols[2]?.includes('%')) {
          // BI Web format without DT QĐ KHOẢN VAY:
          // [0] SL | [1] DTQĐ | [2] % Tỉ trọng | [3] (DT Thực or Target) | [4] (Target or % HT) | [5] (% HT)
          luotBillBanHangVal = cleanNum(dataCols[0]);
          actualVirtualVal = cleanNum(dataCols[1]);
          if (dataCols[4]?.includes('%')) {
            actualRealVal = 0;
            targetQDVal = cleanNum(dataCols[3]);
            percentHTVal = cleanNum(dataCols[4]);
          } else {
            actualRealVal = cleanNum(dataCols[3]);
            targetQDVal = dataCols.length >= 5 ? cleanNum(dataCols[4]) : 0;
            percentHTVal = dataCols.length >= 6 ? cleanNum(dataCols[5]) : 0;
          }
        } else if (dataCols.length >= 8 && (dataCols[7]?.includes('%') || dataCols[7]?.includes('+') || dataCols[7]?.includes('-'))) {
          luotBillBanHangVal = cleanNum(dataCols[0]);
          const primaryRevenue = cleanNum(dataCols[1]);
          if (actualVirtualIdx !== -1) {
            actualVirtualVal = primaryRevenue;
          } else {
            actualRealVal = primaryRevenue;
            actualVirtualVal = primaryRevenue;
          }
          targetQDVal = cleanNum(dataCols[4]);
          percentHTVal = cleanNum(dataCols[5]);
        } else {
          // Legacy column mapping: [DTQĐ, Target QĐ, % HT, DT, ...]
          actualVirtualVal = nameColIdx + 1 < cols.length ? cleanNum(cols[nameColIdx + 1]) : cleanNum(cols[2]);
          targetQDVal = nameColIdx + 2 < cols.length ? cleanNum(cols[nameColIdx + 2]) : cleanNum(cols[3]);
          percentHTVal = nameColIdx + 3 < cols.length ? cleanNum(cols[nameColIdx + 3]) : cleanNum(cols[4]);
          actualRealVal = nameColIdx + 4 < cols.length && cols.length > 5 ? cleanNum(cols[nameColIdx + 4]) : 0;
          luotBillBanHangVal = nameColIdx + 9 < cols.length ? cleanNum(cols[nameColIdx + 9]) : (cols.length > 9 ? cleanNum(cols[9]) : 0);
          luotBillThuHoVal = nameColIdx + 10 < cols.length ? cleanNum(cols[nameColIdx + 10]) : (cols.length > 10 ? cleanNum(cols[10]) : 0);
          if (nameColIdx + 12 < cols.length) {
            installmentRateVal = cleanNum(cols[nameColIdx + 12]);
          }
        }

        let tb3ThangVal = tb3ThangIdx !== -1 && tb3ThangIdx < cols.length ? cleanNum(cols[tb3ThangIdx]) : 0;
        let percentTTVal = percentTTIdx !== -1 && percentTTIdx < cols.length ? cleanNum(cols[percentTTIdx]) : 0;
        let dtTraGopVal = dtTraGopIdx !== -1 && dtTraGopIdx < cols.length ? cleanNum(cols[dtTraGopIdx]) : 0;
        let percentTraGopVal = percentTraGopIdx !== -1 && percentTraGopIdx < cols.length ? cleanNum(cols[percentTraGopIdx]) : (installmentRateVal || 0);

        // Explicit user rule: DT TRẢ GÓP = CỘT THỨ 2 BÊN PHẢI SANG (cho bảng đầy đủ >= 8 cột dữ liệu hoặc bảng 4 cột Trả Chậm)
        if (dataCols.length >= 8) {
          const lastIdx = dataCols.length - 1;
          if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
          if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
          if (!percentTTVal) percentTTVal = cleanNum(dataCols[lastIdx - 2]);
          if (!tb3ThangVal) tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
        } else if (cols.length === 4 && actualVirtualIdx === -1 && actualRealIdx === -1) {
          percentTraGopVal = cleanNum(cols[3]) || cleanNum(cols[cols.length - 1]);
          dtTraGopVal = cleanNum(cols[1]);
        }

        if (percentTraGopVal < 0 || percentTraGopVal > 100) percentTraGopVal = 0;
        if (installmentRateVal < 0 || installmentRateVal > 100) installmentRateVal = 0;
        const finalInstallmentRate = (tyTrongTraGopIdx !== -1 && percentTraGopVal > 0)
          ? percentTraGopVal
          : (topInstallmentRate > 0
              ? topInstallmentRate
              : (percentTraGopVal > 0 ? percentTraGopVal : (installmentRateVal > 0 ? installmentRateVal : 0)));

        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetST: 0, 
            targetQD: targetQDVal,
            actualReal: actualRealVal,
            actualVirtual: actualVirtualVal,
            dtHomQua: 0,
            percentHT: percentHTVal,
            percentQD: 0,
            installmentRate: finalInstallmentRate,
            luotBillBanHang: luotBillBanHangVal,
            luotBillThuHo: luotBillThuHoVal,
            dtckThang: 0,
            luotBill: luotBillBanHangVal,
            tb3Thang: tb3ThangVal,
            percentTT: percentTTVal,
            dtTraGop: dtTraGopVal,
            percentTraGop: finalInstallmentRate,
            isExplicitTarget: true,
            isSummary: marketName.toUpperCase().includes('TỔNG')
          });
        }
        continue;
      }

      // Priority 1: "BC TỔNG HỢP CỤM" or LUYKE page structure
      if (isBcTongHopCum || pageType === 'LUYKE') {

        // If header indices were detected (e.g. BI web format with DOANH THU QĐ or DOANH THU column),
        // use them instead of fixed positional mapping
        if ((actualVirtualIdx !== -1 && actualVirtualIdx < cols.length) || (actualRealIdx !== -1 && actualRealIdx < cols.length)) {
          actualVirtual = actualVirtualIdx !== -1 && actualVirtualIdx < cols.length ? cleanNum(cols[actualVirtualIdx]) : 0;
          actualReal = actualRealIdx !== -1 && actualRealIdx < cols.length ? cleanNum(cols[actualRealIdx]) : 0;
          const targetQDVal = targetSTIdx !== -1 && targetSTIdx < cols.length ? cleanNum(cols[targetSTIdx]) : (targetQDIdx !== -1 && targetQDIdx < cols.length ? cleanNum(cols[targetQDIdx]) : 0);
          percentHT = percentHTIdx !== -1 && percentHTIdx < cols.length ? cleanNum(cols[percentHTIdx]) : 0;
          const luotBillBanHangVal = luotBillBanHangIdx !== -1 && luotBillBanHangIdx < cols.length ? cleanNum(cols[luotBillBanHangIdx]) : 0;
          const luotBillThuHoVal = luotBillThuHoIdx !== -1 && luotBillThuHoIdx < cols.length ? cleanNum(cols[luotBillThuHoIdx]) : 0;
          let installmentRateVal = topInstallmentRate;
          if (tyTrongTraGopIdx !== -1 && tyTrongTraGopIdx < cols.length) {
            installmentRateVal = cleanNum(cols[tyTrongTraGopIdx]);
          }

          let tb3ThangVal = tb3ThangIdx !== -1 && tb3ThangIdx < cols.length ? cleanNum(cols[tb3ThangIdx]) : 0;
          let percentTTVal = percentTTIdx !== -1 && percentTTIdx < cols.length ? cleanNum(cols[percentTTIdx]) : 0;
          let dtTraGopVal = dtTraGopIdx !== -1 && dtTraGopIdx < cols.length ? cleanNum(cols[dtTraGopIdx]) : 0;
          let percentTraGopVal = percentTraGopIdx !== -1 && percentTraGopIdx < cols.length ? cleanNum(cols[percentTraGopIdx]) : (installmentRateVal || 0);

          // Explicit user rule: DT TRẢ GÓP = CỘT THỨ 2 BÊN PHẢI SANG (khi bảng có >= 8 cột số liệu)
          if (dataCols.length >= 8) {
            const lastIdx = dataCols.length - 1;
            if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
            if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
            if (!percentTTVal) percentTTVal = cleanNum(dataCols[lastIdx - 2]);
            if (!tb3ThangVal) tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
          } else if (cols.length === 4 && actualVirtualIdx === -1) {
            // Table with 4 columns: Siêu thị | DT trả góp | DT siêu thị | Tỷ trọng trả chậm %
            percentTraGopVal = cleanNum(cols[3]) || cleanNum(cols[cols.length - 1]);
            dtTraGopVal = cleanNum(cols[1]);
          }

          const percentHTTargetDuKienLNTTVal = percentHTTargetDuKienLNTTIdx !== -1 && percentHTTargetDuKienLNTTIdx < cols.length
            ? cleanNum(cols[percentHTTargetDuKienLNTTIdx]) : 0;

          if (!results.some(m => m.name === marketName)) {
            let ma_kho = "";
            const codeMatch = marketName.match(/^([^-]+)/);
            if (codeMatch) {
              ma_kho = codeMatch[1].trim().replace(/[\s_]+/g, '');
            }
            if (percentTraGopVal < 0 || percentTraGopVal > 100) percentTraGopVal = 0;
            if (installmentRateVal < 0 || installmentRateVal > 100) installmentRateVal = 0;
            const finalInstallmentRate = (tyTrongTraGopIdx !== -1 && percentTraGopVal > 0)
              ? percentTraGopVal
              : (topInstallmentRate > 0
                  ? topInstallmentRate
                  : (percentTraGopVal > 0 ? percentTraGopVal : (installmentRateVal > 0 ? installmentRateVal : 0)));
            results.push({
              name: marketName,
              ma_kho,
              targetST: 0,
              targetQD: targetQDVal,
              actualReal,
              actualVirtual,
              dtHomQua: 0,
              percentHT,
              percentHTTargetDuKienLNTT: percentHTTargetDuKienLNTTVal,
              installmentRate: finalInstallmentRate,
              dtckThang: 0,
              luotBillBanHang: luotBillBanHangVal,
              luotBillThuHo: luotBillThuHoVal,
              tb3Thang: tb3ThangVal,
              percentTT: percentTTVal,
              dtTraGop: dtTraGopVal,
              percentTraGop: finalInstallmentRate,
              isExplicitTarget: true,
              isSummary: marketName.toUpperCase().includes('TỔNG')
            });
          }
        } else if (dataCols.length >= 6 && dataCols[3]?.includes('%')) {
          // BI Web headerless format with DT QĐ KHOẢN VAY:
          // [0] SL | [1] DTQĐ | [2] DT QĐ KV | [3] % Tỉ trọng | [4] (DT Thực or Target) | [5] (Target or % HT) | [6] (% HT)
          const luotBillBanHangVal = cleanNum(dataCols[0]);
          actualVirtual = cleanNum(dataCols[1]);
          let targetQDVal = 0;
          if (dataCols[5]?.includes('%')) {
            actualReal = 0;
            targetQDVal = cleanNum(dataCols[4]);
            percentHT = cleanNum(dataCols[5]);
          } else {
            actualReal = cleanNum(dataCols[4]);
            targetQDVal = dataCols.length >= 6 ? cleanNum(dataCols[5]) : 0;
            percentHT = dataCols.length >= 7 ? cleanNum(dataCols[6]) : 0;
          }
          let tb3ThangVal = 0;
          let percentTTVal = 0;
          let dtTraGopVal = 0;
          let percentTraGopVal = topInstallmentRate || 0;
          if (dataCols.length >= 9) {
            const lastIdx = dataCols.length - 1;
            percentTraGopVal = cleanNum(dataCols[lastIdx]) || percentTraGopVal;
            dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
            percentTTVal = cleanNum(dataCols[lastIdx - 2]);
            tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
          }
          if (percentTraGopVal < 0 || percentTraGopVal > 100) percentTraGopVal = 0;
          const finalInstallmentRate = topInstallmentRate > 0 ? topInstallmentRate : percentTraGopVal;

          if (!results.some(m => m.name === marketName)) {
            let ma_kho = "";
            const codeMatch = marketName.match(/^([^-]+)/);
            if (codeMatch) {
              ma_kho = codeMatch[1].trim().replace(/[\s_]+/g, '');
            }
            results.push({
              name: marketName,
              ma_kho,
              targetST: 0,
              targetQD: targetQDVal,
              actualReal,
              actualVirtual,
              dtHomQua: 0,
              percentHT,
              percentHTTargetDuKienLNTT: 0,
              installmentRate: finalInstallmentRate,
              dtckThang: 0,
              luotBillBanHang: luotBillBanHangVal,
              luotBillThuHo: 0,
              tb3Thang: tb3ThangVal,
              percentTT: percentTTVal,
              dtTraGop: dtTraGopVal,
              percentTraGop: finalInstallmentRate,
              isExplicitTarget: true,
              isSummary: marketName.toUpperCase().includes('TỔNG')
            });
          }
        } else if (dataCols.length >= 5 && dataCols[2]?.includes('%')) {
          // BI Web headerless format without DT QĐ KHOẢN VAY:
          // [0] SL | [1] DTQĐ | [2] % Tỉ trọng | [3] (DT Thực or Target) | [4] (Target or % HT) | [5] (% HT)
          const luotBillBanHangVal = cleanNum(dataCols[0]);
          actualVirtual = cleanNum(dataCols[1]);
          let targetQDVal = 0;
          if (dataCols[4]?.includes('%')) {
            actualReal = 0;
            targetQDVal = cleanNum(dataCols[3]);
            percentHT = cleanNum(dataCols[4]);
          } else {
            actualReal = cleanNum(dataCols[3]);
            targetQDVal = dataCols.length >= 5 ? cleanNum(dataCols[4]) : 0;
            percentHT = dataCols.length >= 6 ? cleanNum(dataCols[5]) : 0;
          }
          let tb3ThangVal = 0;
          let percentTTVal = 0;
          let dtTraGopVal = 0;
          let percentTraGopVal = topInstallmentRate || 0;
          if (dataCols.length >= 8) {
            const lastIdx = dataCols.length - 1;
            percentTraGopVal = cleanNum(dataCols[lastIdx]) || percentTraGopVal;
            dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
            percentTTVal = cleanNum(dataCols[lastIdx - 2]);
            tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
          }
          if (percentTraGopVal < 0 || percentTraGopVal > 100) percentTraGopVal = 0;
          const finalInstallmentRate = topInstallmentRate > 0 ? topInstallmentRate : percentTraGopVal;

          if (!results.some(m => m.name === marketName)) {
            let ma_kho = "";
            const codeMatch = marketName.match(/^([^-]+)/);
            if (codeMatch) {
              ma_kho = codeMatch[1].trim().replace(/[\s_]+/g, '');
            }
            results.push({
              name: marketName,
              ma_kho,
              targetST: 0,
              targetQD: targetQDVal,
              actualReal,
              actualVirtual,
              dtHomQua: 0,
              percentHT,
              percentHTTargetDuKienLNTT: 0,
              installmentRate: finalInstallmentRate,
              dtckThang: 0,
              luotBillBanHang: luotBillBanHangVal,
              luotBillThuHo: 0,
              tb3Thang: tb3ThangVal,
              percentTT: percentTTVal,
              dtTraGop: dtTraGopVal,
              percentTraGop: finalInstallmentRate,
              isExplicitTarget: true,
              isSummary: marketName.toUpperCase().includes('TỔNG')
            });
          }
        } else {
          // Fallback: Fixed positional mapping for BC TỔNG HỢP CỤM format
          // Structure: [0] Name | [1] DT Hôm Qua | [2] DTLK | [3] DT Dự Kiến | [4] DTQĐ | [5] DT Dự Kiến (QĐ) | [6] % HT
          
          dtHomQua = cleanNum(cols[nameColIdx + 1]);
          actualReal = cleanNum(cols[nameColIdx + 2]);
          targetST = cleanNum(cols[nameColIdx + 3]); // DT Dự Kiến
          actualVirtual = cleanNum(cols[nameColIdx + 4]); // DTQĐ
          if (pageType === 'RTST' && actualVirtual > 0 && actualReal > actualVirtual * 4) {
            actualReal = 0;
          }
          const targetQDVal = cleanNum(cols[nameColIdx + 5]); // DT Dự Kiến (QĐ)
          percentHT = cleanNum(cols[nameColIdx + 6]); // % HT
          
          let installmentRateVal = topInstallmentRate;
          let dtckThangVal = 0;
          
          const percentHTTargetDuKienLNTTVal = percentHTTargetDuKienLNTTIdx !== -1 && percentHTTargetDuKienLNTTIdx < cols.length
            ? cleanNum(cols[percentHTTargetDuKienLNTTIdx])
            : (cols.length >= 11 ? cleanNum(cols[10]) : (nameColIdx !== -1 && nameColIdx + 10 < cols.length ? cleanNum(cols[nameColIdx + 10]) : 0));

          if (pageType === 'LUYKE') {
            if (cols.length >= 10) {
              dtckThangVal = cleanNum(cols[cols.length - 10]);
            }
            if (cols.length >= 3) {
              installmentRateVal = cleanNum(cols[cols.length - 3]) || installmentRateVal;
            }
          } else if (tyTrongTraGopIdx !== -1 && headerNameIdx !== -1) {
            const relativeIdx = tyTrongTraGopIdx - headerNameIdx;
            const dataIdx = nameColIdx + relativeIdx;
            if (cols[dataIdx]) {
              installmentRateVal = cleanNum(cols[dataIdx]);
            }
          } else {
            installmentRateVal = cleanNum(cols[cols.length - 1]) || installmentRateVal;
          }

          let tb3ThangVal = tb3ThangIdx !== -1 && tb3ThangIdx < cols.length ? cleanNum(cols[tb3ThangIdx]) : 0;
          let percentTTVal = percentTTIdx !== -1 && percentTTIdx < cols.length ? cleanNum(cols[percentTTIdx]) : 0;
          let dtTraGopVal = dtTraGopIdx !== -1 && dtTraGopIdx < cols.length ? cleanNum(cols[dtTraGopIdx]) : 0;
          let percentTraGopVal = percentTraGopIdx !== -1 && percentTraGopIdx < cols.length ? cleanNum(cols[percentTraGopIdx]) : (installmentRateVal || 0);

          if (dataCols.length >= 8) {
            const lastIdx = dataCols.length - 1;
            if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
            if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
            if (!percentTTVal) percentTTVal = cleanNum(dataCols[lastIdx - 2]);
            if (!tb3ThangVal) tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
          } else if (dataCols.length === 3 || cols.length === 4) {
            // Table with 4 columns: Siêu thị | DT trả góp | DT siêu thị | Tỷ trọng trả chậm %
            percentTraGopVal = cleanNum(cols[3]) || cleanNum(cols[cols.length - 1]);
            dtTraGopVal = cleanNum(cols[1]);
          }

          if (!results.some(m => m.name === marketName)) {
            let ma_kho = "";
            const codeMatch = marketName.match(/^([^-]+)/);
            if (codeMatch) {
              ma_kho = codeMatch[1].trim().replace(/[\s_]+/g, '');
            }

            if (percentTraGopVal < 0 || percentTraGopVal > 100) percentTraGopVal = 0;
            if (installmentRateVal < 0 || installmentRateVal > 100) installmentRateVal = 0;
            const finalInstallmentRate = (tyTrongTraGopIdx !== -1 && percentTraGopVal > 0)
              ? percentTraGopVal
              : (topInstallmentRate > 0
                  ? topInstallmentRate
                  : (percentTraGopVal > 0 ? percentTraGopVal : (installmentRateVal > 0 ? installmentRateVal : 0)));
            results.push({ 
              name: marketName, 
              ma_kho,
              targetST, 
              targetQD: targetQDVal,
              actualReal, 
              actualVirtual, 
              dtHomQua, 
              percentHT, 
              percentHTTargetDuKienLNTT: percentHTTargetDuKienLNTTVal,
              installmentRate: finalInstallmentRate,
              dtckThang: dtckThangVal,
              tb3Thang: tb3ThangVal,
              percentTT: percentTTVal,
              dtTraGop: dtTraGopVal,
              percentTraGop: finalInstallmentRate,
              isExplicitTarget: true,
              isSummary: marketName.toUpperCase().includes('TỔNG')
            });
          }
        }
      }

      // Priority 2: Standard structure (Name | DTLK | DTQĐ | Target | % HT)
      const col2 = cols[nameColIdx + 1]?.trim(); // DT Hôm Qua / DTLK
      const col3 = cols[nameColIdx + 2]?.trim(); // DTLK / DTQĐ
      const col4 = cols[nameColIdx + 3]?.trim(); // Target QĐ
      const col5 = cols[nameColIdx + 4]?.trim(); // DTQĐ / % HT
      
      if (col4 && col4.match(/-?[\d,.]+(%?)/) && !col4.includes('%')) {
        targetST = cleanNum(col4);      
        actualVirtual = cleanNum(col5); 
        actualReal = cleanNum(col3);    
        dtHomQua = cleanNum(col2);
        
        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetST, 
            actualReal, 
            actualVirtual,
            dtHomQua,
            percentHT,
            isExplicitTarget: true
          });
        }
        continue;
      }
    }
    
    // Priority 3: Other numeric structures
    if (marketName) {
      val1 = cols[nameColIdx + 1]?.trim();
      val2 = cols[nameColIdx + 2]?.trim();
      val3 = cols[nameColIdx + 3]?.trim();
      val4 = cols[nameColIdx + 4]?.trim();
      val5 = cols[nameColIdx + 5]?.trim();

      if (val1 && val2 && val3 && 
          (val1.match(/-?[\d,.]+(%?)/) || val1 === '0') && 
          (val2.match(/-?[\d,.]+(%?)/) || val2 === '0') &&
          (val3.match(/-?[\d,.]+(%?)/) || val3 === '0')) {
        
        // Case: 3 numeric columns (DTLK, DTQĐ, Target QĐ)
        let targetQDVal = 0;
        if (pageType === 'RTST') {
          actualReal = cleanNum(val1);    // cols[1]
          actualVirtual = cleanNum(val2); // cols[2]
          targetQDVal = cleanNum(val3);   // cols[3]
          targetST = cleanNum(val5);      // cols[5]
          if (val4 && val4.includes('%')) {
            percentHT = cleanNum(val4);
          }
        } else {
          actualReal = cleanNum(val1);
          actualVirtual = cleanNum(val2);
          targetST = cleanNum(val3);
          
          if (val4 && val4.includes('%')) {
            percentHT = cleanNum(val4);
          } else if (targetST > 0) {
            percentHT = (actualVirtual / targetST) * 100;
          }
        }

        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetST, 
            targetQD: targetQDVal,
            actualReal, 
            actualVirtual, 
            dtHomQua,
            percentHT, 
            isExplicitTarget: true
          });
        }
        continue;
      }
    }
      
      // Fallback for 2 numeric columns (Doanh thu, Target)
      if (val1 && val2 && 
          (val1.match(/-?[\d,.]+(%?)/) || val1 === '0') && 
          (val2.match(/-?[\d,.]+(%?)/) || val2 === '0')) {
        
        actualReal = cleanNum(val1);
        actualVirtual = cleanNum(val1);
        targetST = cleanNum(val2);
        
        if (val3 && val3.includes('%')) {
          percentHT = cleanNum(val3);
        } else if (targetST > 0) {
          percentHT = (actualVirtual / targetST) * 100;
        }

        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetST, 
            actualReal, 
            actualVirtual, 
            dtHomQua,
            percentHT, 
            isExplicitTarget: true 
          });
        }
        continue;
      }

      // Fallback to previous logic if the above doesn't match
      const numberMatches: string[] = [];
      for (let i = 0; i < cols.length; i++) {
        if (i === nameColIdx) continue;
        if (i === 0 && /^\d+$/.test(cols[i].trim()) && cols.length > 3) continue;
        
        const val = cols[i].trim();
        if (val && (val.match(/-?[\d,.]+(%?)/) || val === '0')) {
          numberMatches.push(val);
        }
      }

      if (numberMatches.length >= 3) {
        actualReal = cleanNum(numberMatches[0]);
        actualVirtual = cleanNum(numberMatches[1]);
        const baseTarget = cleanNum(numberMatches[2]);
        
        // If there are 5 or more numbers, the 5th one is likely "Target (QĐ)"
        let isExplicitTarget = false;
        if (numberMatches.length >= 5) {
          percentHT = cleanNum(numberMatches[3]);
          targetST = cleanNum(numberMatches[4]);
          isExplicitTarget = true;
        } else {
          percentHT = numberMatches.length >= 4 ? cleanNum(numberMatches[3]) : (baseTarget > 0 ? (actualVirtual / baseTarget) * 100 : 0);
          targetST = baseTarget;
        }

        if (targetST > 0 || actualVirtual > 0) {
          if (!results.some(m => m.name === marketName)) {
            results.push({ name: marketName, targetST, actualReal, actualVirtual, dtHomQua, percentHT, isExplicitTarget });
          }
        }
        continue;
      }
    }
  if (topDtThuc > 0 && results.filter(r => !r.isSummary).length === 1) {
    for (const r of results) {
      if (!r.actualReal) {
        r.actualReal = topDtThuc;
      }
    }
  }
  return results;
};

export const extractStoreNameFromCluster = (input: string): string[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n');
  const prefixes = ["ĐMM", "ĐMS3", "ĐML", "ĐMS", "TGD", "AAR", "MWG", "BHX"];
  const storeNames = new Set<string>();
  let cleanLine = "";
  
  for (const line of lines) {
    cleanLine = line.trim();
    if (!cleanLine) continue;
    
    const lowerLine = cleanLine.toLowerCase();
    if (lowerLine.includes("tổng") || lowerLine.includes("copyright") || lowerLine.includes("bi report")) continue;

    const cols = cleanLine.split('\t');
    for (const col of cols) {
      const trimmedCol = col.trim();
      const upperCol = trimmedCol.toUpperCase();
      
      const hasPrefix = prefixes.some(p => upperCol.includes(p));
      
      if (hasPrefix) {
        const formatted = formatMarketNameForDisplay(trimmedCol);
        if (formatted) storeNames.add(formatted);
      }
    }
  }
  return Array.from(storeNames);
};

const isMarketNameLike = (name: string): boolean => {
  const norm = normalize(name);
  const prefixes = ['dml', 'dmm', 'dms', 'tgd', 'aar', 'bhx', 'dm3', 'ch'];
  const hasPrefix = prefixes.some(p => {
    if (p === 'ch') {
      return norm.startsWith('ch') && !norm.startsWith('cho');
    }
    return norm.startsWith(p);
  });
  const hasStoreKeywords = norm.startsWith('sieu thi') || norm.startsWith('cua hang') || norm.startsWith('dien may') || norm.startsWith('the gioi');
  const startsWithCode = /^\d+\s*[-–—]\s*(dml|dmm|dms|tgd|aar|bhx|mwg|ch|dm3)\b/i.test(norm);
  return hasPrefix || hasStoreKeywords || startsWithCode;
};

export const isSupermarketLine = (text: string): boolean => {
  const upper = text.toUpperCase().trim();
  const hasSupermarketPrefix = /(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)[_\s-]/i.test(upper) || /^\d+\s*[-–—]\s*(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)/i.test(upper);
  const isTotal = upper === 'TỔNG' || upper.startsWith('TỔNG ') || upper.startsWith('TỔNG (');
  return (hasSupermarketPrefix && !text.includes('Sim') && !text.includes('Thẻ') && !text.includes('thẻ')) || isTotal;
};

function isKnownTcHeader(line: string): boolean {
  const l = line.toLowerCase().trim();
  if (l.includes('+/-') || l.includes('chênh lệch') || l.includes('tang truong') || l.includes('tăng trưởng') || l.includes('hôm qua') || l.includes('tb 3')) return false;
  return (
    l === 'siêu thị' || l === 'tên siêu thị' || l.startsWith('siêu thị') ||
    l.includes('dt trả góp') || l.includes('dt trả chậm') || l.includes('doanh thu trả góp') ||
    l.includes('dt siêu thị') || l.includes('doanh thu siêu thị') ||
    l.includes('tỷ trọng trả chậm') || l.includes('tỉ trọng trả chậm') || l.includes('tỷ trọng trả góp') || l.includes('tỉ trọng trả góp') ||
    l === '% trả chậm' || l === '% trả góp' || l === 'tỷ trọng trả chậm %' || l === 'tỉ trọng trả chậm %'
  );
}

function isTcWatermark(line: string): boolean {
  const l = line.trim().toLowerCase();
  // Watermark pattern: 5-6 digits (e.g. "43751") or employee name or UI noise
  if (/^\d{5,6}$/.test(l)) return true;
  if (l.includes('linh võ vũ') || l.includes('linh vo vu')) return true;
  if (l.includes('baocao.dienmayxanh.com')) return true;
  if (l.includes('cập nhật lúc') || l.includes('tìm báo cáo') || l.includes('toggle theme')) return true;
  if (l.includes('tổng 1 dòng') || l.includes('/ trang') || l.includes('copy all') || l.includes('dashboard')) return true;
  return false;
}

/**
 * Kiểm tra tên siêu thị trong báo cáo Trả Chậm có khớp với siêu thị đang chọn hay không.
 * Đảm bảo không lấy nhầm số liệu của siêu thị cũ khi đổi siêu thị.
 */
function doesTraChamStoreMatch(candidateName: string, targetStoreName: string): boolean {
  if (!candidateName || !targetStoreName || targetStoreName === 'ALL') return false;
  const candTrim = candidateName.trim();
  const targetTrim = targetStoreName.trim();
  if (!candTrim || !targetTrim) return false;

  // Chỉ trích xuất mã kho khi đứng ở đầu chuỗi theo định dạng "1841 - ĐML..." hoặc chuỗi chỉ gồm mã số
  const extractLeadingCode = (s: string): string => {
    const m = s.match(/^(\d{3,6})\s*[-–—]/);
    if (m) return m[1];
    if (/^\d{3,6}$/.test(s.trim())) return s.trim();
    return '';
  };

  const candCode = extractLeadingCode(candTrim);
  const targetCode = extractLeadingCode(targetTrim);
  if (candCode && targetCode) {
    return candCode === targetCode;
  }

  const normalizeNameOnly = (s: string): string =>
    removeAccents(s)
      .replace(/^(\d{3,6})\s*[-–—]\s*/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const normCand = normalizeNameOnly(candTrim);
  const normTarget = normalizeNameOnly(targetTrim);
  if (!normCand || !normTarget) return false;
  if (normCand === normTarget) return true;
  if (normCand.length >= 5 && normTarget.length >= 5) {
    if (normCand.includes(normTarget) || normTarget.includes(normCand)) return true;
  }
  return false;
}

/**
 * Parse một ô số liệu đơn lẻ trong bảng Báo cáo trả chậm (giữ nguyên cả giá trị 0,
 * tuyệt đối không nối ghép nhiều cột tab trên cùng 1 dòng).
 */
function parseTcNumericCell(token: string): number | null {
  if (token === undefined || token === null) return null;
  const t = token.trim();
  if (!t || t.includes('\t')) return null;
  if (t === '-' || t === '--' || t === '—' || t === '–') return 0;
  const stripped = t.replace(/%$/, '').trim();
  if (!/^[+-]?\d[\d,.]*$/.test(stripped)) return null;
  const n = cleanNum(stripped);
  return isNaN(n) ? null : n;
}

/**
 * Công thức chuẩn tính Tỷ trọng trả góp (%) từ dãy số của dòng Báo cáo trả chậm:
 * - nums[0] = DT trả góp (triệu)
 * - nums[1] = DT siêu thị (triệu)
 * - nums[2] = Tỷ trọng trả chậm %
 * - nums[3..] = Chi tiết các đối tác (HomeCredit, FECredit, ...)
 *
 * Quy tắc:
 * - Tỷ trọng trả góp (%) = (DT trả góp / DT siêu thị) * 100
 * - Nếu DT siêu thị <= 0: trả về 0 (không chia cho 0, không lấy DT trả góp hay % đối tác thay thế).
 * - Nếu DT trả góp <= 0: trả về 0.
 */
function computeTraChamRateFromRowNums(nums: number[]): number | null {
  if (!nums || nums.length === 0) return null;
  if (nums.length >= 2) {
    const dtTraGop = nums[0];
    const dtSieuThi = nums[1];
    if (dtSieuThi <= 0 || dtTraGop <= 0) {
      return 0;
    }
    const calcRate = (dtTraGop / dtSieuThi) * 100;
    return Math.round(calcRate * 100) / 100;
  }
  if (nums.length === 1 && nums[0] >= 0 && nums[0] <= 100) {
    return nums[0];
  }
  return null;
}

/**
 * Trích xuất Tỷ Trọng Trả Góp (%) từ dữ liệu ô "REALTIME TRẢ CHẬM" hoặc "LUỸ KẾ TRẢ CHẬM"
 * (hoặc từ thẻ KPI trong báo cáo Doanh thu hợp nhất).
 * Công thức chuẩn: Tỷ trọng trả góp = (DT trả góp / DT siêu thị) * 100.
 * Khi DT siêu thị = 0 -> trả về 0 (hiển thị 0.0%).
 */
export function parseTraChamRate(rawInput: string | undefined | null, targetStoreName?: string): number | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // 1. Trường hợp chuỗi chỉ có 1 con số duy nhất (VD: "0", "25.5", "45.66%")
  if (!trimmed.includes('\t') && !trimmed.includes('\n')) {
    const singleVal = parseTcNumericCell(trimmed);
    if (singleVal !== null && singleVal >= 0 && singleVal <= 100) {
      return singleVal;
    }
    return null;
  }

  const normFull = removeAccents(trimmed).toLowerCase();

  // Loại trừ nhầm lẫn với báo cáo Thi đua ngành hàng (có cột HẠNG TRONG ST / HẠNG VÙNG / HẠNG CTY)
  if (
    (normFull.includes('hang trong st') || normFull.includes('hang vung') || normFull.includes('hang cty')) &&
    !normFull.includes('dt tra gop') &&
    !normFull.includes('ty trong tra cham')
  ) {
    return null;
  }

  const rawLines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l && !isTcWatermark(l));
  if (rawLines.length === 0) return null;

  const isSummaryRowName = (s: string): boolean => {
    const n = removeAccents(s).toLowerCase().trim();
    return (
      n === 'tong' ||
      n.startsWith('tong ') ||
      n.startsWith('tong\t') ||
      n.startsWith('vung ') ||
      n.startsWith('khu vuc ') ||
      n.startsWith('cum ')
    );
  };

  const isStoreCandidateLine = (s: string): boolean => {
    if (!s) return false;
    const firstCol = s.split(/\t|\||\s{2,}/)[0].trim();
    if (!firstCol || isKnownTcHeader(firstCol)) return false;
    if (/^(xem|xuat excel|xuat theo mau|luy ke|realtime|tat ca vung|chon|cap hien thi)/i.test(removeAccents(firstCol))) {
      return false;
    }
    return /(ĐML|ĐMM|ĐMS|TGD|BHX|MWG|TGDD|ĐMX|DMX)/i.test(firstCol) || isSupermarketLine(firstCol);
  };

  // Xác định siêu thị trên bộ lọc đầu trang BI (nếu có): "Siêu thị \n 1841 - ĐML_CMA_CMA..."
  let headerFilterStore = '';
  for (let i = 0; i < Math.min(rawLines.length, 8); i++) {
    const lNorm = removeAccents(rawLines[i]).toLowerCase().trim();
    if (lNorm === 'sieu thi' || lNorm === 'sieu thi chon') {
      const nextLine = rawLines[i + 1] || '';
      if (isStoreCandidateLine(nextLine)) {
        const afterNext = removeAccents(rawLines[i + 2] || '').toLowerCase();
        if (afterNext.includes('cap hien thi') || afterNext.includes('luy ke') || afterNext.includes('realtime')) {
          headerFilterStore = nextLine.split(/\t|\||\s{2,}/)[0].trim();
          break;
        }
      }
    }
  }

  // Kiểm tra xem văn bản có phải là Báo cáo Doanh thu hợp nhất (có bảng SỐ LƯỢNG | DOANH THU | DOANH THU QĐ) không
  const isCombinedRevenueReport =
    (normFull.includes('doanh thu qd') || normFull.includes('dt qd khoan vay') || normFull.includes('so luong\tdoanh thu')) &&
    !normFull.includes('dt sieu thi (trieu)');

  // 2. Nếu là Báo cáo Doanh thu hợp nhất (hoặc có thẻ KPI đầu trang "Tỷ trọng trả chậm \n X% \n DT trả góp A / B")
  if (isCombinedRevenueReport) {
    // Nếu có chỉ định siêu thị mục tiêu, kiểm tra siêu thị đó có nằm trong báo cáo không
    if (targetStoreName && targetStoreName !== 'ALL') {
      const allStoresInReport = rawLines.filter(l => isStoreCandidateLine(l)).map(l => l.split(/\t|\||\s{2,}/)[0].trim());
      if (allStoresInReport.length > 0) {
        const hasMatch = allStoresInReport.some(s => doesTraChamStoreMatch(s, targetStoreName));
        if (!hasMatch) return null;
      }
    }

    // Ưu tiên công thức chuẩn từ dòng "DT trả góp A / B" trên thẻ KPI nếu có
    const fracMatch = normFull.match(/dt\s*tra\s*(?:gop|cham)\s*([\d,.]+)\s*\/\s*([\d,.]+)/i);
    if (fracMatch) {
      const dtTraGop = cleanNum(fracMatch[1]);
      const dtSieuThi = cleanNum(fracMatch[2]);
      if (!isNaN(dtTraGop) && !isNaN(dtSieuThi)) {
        if (dtSieuThi <= 0 || dtTraGop <= 0) return 0;
        return Math.round(((dtTraGop / dtSieuThi) * 100) * 100) / 100;
      }
    }

    const m1 = normFull.match(/(?:t[yi]\s*trong\s*tra\s*(?:gop|cham)|t[yi]\s*trong\s*t[gc]|%\s*tra\s*(?:gop|cham))[\s\S]{0,60}?([\d,.]+)\s*%/i);
    if (m1) {
      const r = cleanNum(m1[1]);
      if (!isNaN(r) && r >= 0 && r <= 100) return r;
    }
    const m2 = normFull.match(/([\d,.]+)\s*%[\s\S]{0,60}?(?:t[yi]\s*trong\s*tra\s*(?:gop|cham)|t[yi]\s*trong\s*t[gc]|%\s*tra\s*(?:gop|cham))/i);
    if (m2) {
      const r = cleanNum(m2[1]);
      if (!isNaN(r) && r >= 0 && r <= 100) return r;
    }
    return null;
  }

  // 3. Phân tích bảng Báo cáo trả chậm (Cấp hiển thị: Siêu thị / Vùng / Khu vực / Cụm)
  const storeRows: { name: string; rate: number; isSummary: boolean }[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lineCols = line.split(/\t|\||\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (lineCols.length === 0) continue;

    const firstCol = lineCols[0];
    const isStore = isStoreCandidateLine(firstCol);
    const isSummary = !isStore && isSummaryRowName(firstCol);
    if (!isStore && !isSummary) continue;

    // Bỏ qua dòng breadcrumb (VD: "Tất cả vùng > Vùng Tây Nam Bộ > Cà Mau")
    if (line.includes('>') || (rawLines[i - 1] && rawLines[i - 1].endsWith('>'))) continue;

    let rowNums: number[] = [];

    // Layout A: Tên siêu thị và các cột số nằm trên cùng 1 dòng (cách nhau bởi Tab)
    if (lineCols.length >= 3) {
      const parsedCols: number[] = [];
      for (let c = 1; c < lineCols.length; c++) {
        const n = parseTcNumericCell(lineCols[c]);
        if (n !== null) parsedCols.push(n);
      }
      if (parsedCols.length >= 2) {
        rowNums = parsedCols;
      }
    }

    // Layout B & C: Tên siêu thị nằm trên dòng i, các số liệu nằm ở dòng i + 1 (dạng Tab ngang hoặc từng dòng dọc)
    if (rowNums.length === 0 && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      const nextCols = nextLine.split(/\t|\||\s{2,}/).map(c => c.trim()).filter(Boolean);

      if (nextCols.length >= 2) {
        // Layout B: Dòng i + 1 chứa dãy số cách nhau bởi Tab (VD: "45.66\t0\t0\t45.66\t100")
        const parsedNextCols: number[] = [];
        for (const col of nextCols) {
          const n = parseTcNumericCell(col);
          if (n !== null) parsedNextCols.push(n);
        }
        if (parsedNextCols.length >= 2 && parsedNextCols.length >= nextCols.length - 1) {
          rowNums = parsedNextCols;
          i += 1; // Đã tiêu thụ dòng số liệu i + 1
        }
      } else {
        // Layout C: Mỗi ô số liệu nằm trên 1 dòng đơn lẻ liên tiếp
        const vertNums: number[] = [];
        let j = i + 1;
        while (j < rawLines.length && vertNums.length < 15) {
          const candLine = rawLines[j];
          if (isStoreCandidateLine(candLine) || isSummaryRowName(candLine) || isKnownTcHeader(candLine)) break;
          const singleCell = parseTcNumericCell(candLine);
          if (singleCell === null) break;
          vertNums.push(singleCell);
          j++;
        }
        if (vertNums.length >= 2) {
          rowNums = vertNums;
          i = j - 1;
        }
      }
    }

    if (rowNums.length >= 2) {
      const computedRate = computeTraChamRateFromRowNums(rowNums);
      if (computedRate !== null && !isNaN(computedRate) && computedRate >= 0) {
        storeRows.push({
          name: firstCol,
          rate: computedRate,
          isSummary
        });
      }
    }
  }

  // 3b. Trường hợp Báo cáo trả chậm được copy ở "Cấp hiển thị: Nhân viên" (có tên siêu thị ở breadcrumb trên bảng Nhân viên)
  if (storeRows.length === 0 && normFull.includes('dt tra gop') && normFull.includes('dt sieu thi')) {
    const breadcrumbStores = rawLines.filter(l => isStoreCandidateLine(l)).map(l => l.split(/\t|\||\s{2,}/)[0].trim());
    const storeNameForStaffTable = breadcrumbStores[breadcrumbStores.length - 1] || headerFilterStore;
    if (!targetStoreName || targetStoreName === 'ALL' || !storeNameForStaffTable || doesTraChamStoreMatch(storeNameForStaffTable, targetStoreName)) {
      let totalDtTraGop = 0;
      let totalDtSieuThi = 0;
      let staffRowCount = 0;
      let tableStarted = false;

      for (let i = 0; i < rawLines.length; i++) {
        const lLow = removeAccents(rawLines[i]).toLowerCase();
        if (lLow.includes('dt sieu thi') && lLow.includes('ty trong tra cham')) {
          tableStarted = true;
          continue;
        }
        if (!tableStarted) continue;

        const cols = rawLines[i].split(/\t|\||\s{2,}/).map(c => c.trim()).filter(Boolean);
        if (cols.length >= 3) {
          const parsedNums: number[] = [];
          for (const c of cols) {
            const n = parseTcNumericCell(c);
            if (n !== null) parsedNums.push(n);
          }
          if (parsedNums.length >= 3 && parsedNums.length === cols.length) {
            totalDtTraGop += parsedNums[0];
            totalDtSieuThi += parsedNums[1];
            staffRowCount++;
          }
        }
      }

      if (staffRowCount > 0) {
        const staffAggRate = computeTraChamRateFromRowNums([totalDtTraGop, totalDtSieuThi]);
        if (staffAggRate !== null && !isNaN(staffAggRate) && staffAggRate >= 0) {
          return staffAggRate;
        }
      }
    }
  }

  if (storeRows.length === 0) {
    // Fallback kiểm tra thẻ KPI text nếu người dùng chỉ dán phần đầu thẻ KPI
    const m1 = normFull.match(/(?:t[yi]\s*trong\s*tra\s*(?:gop|cham)|t[yi]\s*trong\s*t[gc]|%\s*tra\s*(?:gop|cham))[\s\S]{0,60}?([\d,.]+)\s*%/i);
    if (m1) {
      const r = cleanNum(m1[1]);
      if (!isNaN(r) && r >= 0 && r <= 100) return r;
    }
    return null;
  }

  const specificStoreRows = storeRows.filter(r => !r.isSummary);
  const summaryRows = storeRows.filter(r => r.isSummary);

  // 4. Đối chiếu chính xác theo siêu thị đang chọn (không dùng dữ liệu của siêu thị khác)
  if (targetStoreName && targetStoreName !== 'ALL') {
    if (specificStoreRows.length > 0) {
      const matched = specificStoreRows.find(r => doesTraChamStoreMatch(r.name, targetStoreName));
      return matched ? matched.rate : null;
    }
    // Trường hợp bảng chỉ có dòng tổng/vùng: kiểm tra bộ lọc Siêu thị trên header (nếu có)
    if (summaryRows.length > 0) {
      if (headerFilterStore && !doesTraChamStoreMatch(headerFilterStore, targetStoreName)) {
        return null;
      }
      return summaryRows[0].rate;
    }
    return null;
  }

  if (specificStoreRows.length === 1) return specificStoreRows[0].rate;
  if (summaryRows.length > 0) return summaryRows[0].rate;
  return specificStoreRows[0]?.rate ?? null;
}

/**
 * Tìm dữ liệu localStorage theo tiền tố key và tên siêu thị (hỗ trợ khớp chuẩn hóa tên / mã kho).
 */
function getStoreSpecificLocalStorageValue(prefix: string, targetStoreName?: string): string {
  if (typeof window === 'undefined') return '';
  const storeKey = targetStoreName && targetStoreName !== 'ALL' ? targetStoreName.trim() : '';
  if (!storeKey) return '';

  try {
    const exact = localStorage.getItem(`${prefix}_${storeKey}`);
    if (exact && exact.trim()) return exact;

    const leadingCodeMatch = storeKey.match(/^(\d{3,6})\s*[-–—]/);
    if (leadingCodeMatch) {
      const byCode = localStorage.getItem(`${prefix}_${leadingCodeMatch[1]}`);
      if (byCode && byCode.trim()) return byCode;
    }

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(`${prefix}_`)) continue;
      const suffix = k.slice(prefix.length + 1);
      if (suffix && doesTraChamStoreMatch(suffix, storeKey)) {
        const val = localStorage.getItem(k);
        if (val && val.trim()) return val;
      }
    }
  } catch {}
  return '';
}

export function resolveRealtimeTraChamRate(targetStoreName?: string): number | null {
  if (typeof window === 'undefined') return null;
  const hasTargetStore = Boolean(targetStoreName && targetStoreName !== 'ALL');

  // 1. Ưu tiên đọc từ ô "REALTIME TRẢ CHẬM" của đúng siêu thị đang chọn
  const storeSpecificRaw = getStoreSpecificLocalStorageValue('rtst_realtime_tra_cham', targetStoreName);
  if (storeSpecificRaw) {
    const parsed = parseTraChamRate(storeSpecificRaw, targetStoreName);
    if (parsed !== null && !isNaN(parsed) && parsed >= 0) return parsed;
  }

  // Fallback sang key chung nhưng BẮT BUỘC phải khớp tên siêu thị trong nội dung báo cáo
  const globalRaw = localStorage.getItem('rtst_realtime_tra_cham') || localStorage.getItem('rt_tra_cham') || '';
  if (globalRaw) {
    const parsedGlobal = parseTraChamRate(globalRaw, targetStoreName);
    if (parsedGlobal !== null && !isNaN(parsedGlobal) && parsedGlobal >= 0) return parsedGlobal;
  }

  // 2. Nếu chưa có dữ liệu ở ô "REALTIME TRẢ CHẬM", kiểm tra báo cáo "REALTIME DOANH THU QUY ĐỔI" của đúng siêu thị
  const storeMarketRaw = getStoreSpecificLocalStorageValue('rtst_market_input', targetStoreName);
  if (storeMarketRaw) {
    const parsedMarket = parseTraChamRate(storeMarketRaw, targetStoreName);
    if (parsedMarket !== null && !isNaN(parsedMarket) && parsedMarket >= 0) return parsedMarket;
  }

  if (!hasTargetStore || !storeSpecificRaw) {
    const globalMarketRaw = localStorage.getItem('rtst_market_input') || localStorage.getItem('rt_market') || '';
    if (globalMarketRaw) {
      const parsedGlobalMarket = parseTraChamRate(globalMarketRaw, targetStoreName);
      if (parsedGlobalMarket !== null && !isNaN(parsedGlobalMarket) && parsedGlobalMarket >= 0) return parsedGlobalMarket;
    }
  }

  return null;
}

export function resolveLuykeTraChamRate(targetStoreName?: string): number | null {
  if (typeof window === 'undefined') return null;
  const hasTargetStore = Boolean(targetStoreName && targetStoreName !== 'ALL');

  // 1. Ưu tiên đọc từ ô "LUỸ KẾ TRẢ CHẬM" của đúng siêu thị đang chọn
  const storeSpecificRaw = getStoreSpecificLocalStorageValue('rtst_luyke_tra_cham', targetStoreName);
  if (storeSpecificRaw) {
    const parsed = parseTraChamRate(storeSpecificRaw, targetStoreName);
    if (parsed !== null && !isNaN(parsed) && parsed >= 0) return parsed;
  }

  // Fallback sang key chung nhưng BẮT BUỘC phải khớp tên siêu thị trong nội dung báo cáo
  const globalRaw = localStorage.getItem('rtst_luyke_tra_cham') || localStorage.getItem('rt_tra_cham_lk') || '';
  if (globalRaw) {
    const parsedGlobal = parseTraChamRate(globalRaw, targetStoreName);
    if (parsedGlobal !== null && !isNaN(parsedGlobal) && parsedGlobal >= 0) return parsedGlobal;
  }

  // 2. Nếu chưa có dữ liệu ở ô "LUỸ KẾ TRẢ CHẬM", kiểm tra báo cáo "LUỸ KẾ DOANH THU QUY ĐỔI" của đúng siêu thị
  const storeClusterRaw = getStoreSpecificLocalStorageValue('rtst_cluster_summary', targetStoreName);
  if (storeClusterRaw) {
    const parsedCluster = parseTraChamRate(storeClusterRaw, targetStoreName);
    if (parsedCluster !== null && !isNaN(parsedCluster) && parsedCluster >= 0) return parsedCluster;
  }

  if (!hasTargetStore || !storeSpecificRaw) {
    const globalClusterRaw = localStorage.getItem('rtst_cluster_summary') || localStorage.getItem('rt_catrev') || '';
    if (globalClusterRaw) {
      const parsedGlobalCluster = parseTraChamRate(globalClusterRaw, targetStoreName);
      if (parsedGlobalCluster !== null && !isNaN(parsedGlobalCluster) && parsedGlobalCluster >= 0) return parsedGlobalCluster;
    }
  }

  return null;
}


const PROVI_AND_NOISE_EXACT = new Set([
  'toan cong ty', 'an cong ty', 'cong ty co phan', 'the gioi di dong', 'dien may xanh', 'bach hoa xanh',
  'mien cua toi', 'vung', 'mien', 'khu vuc', 'cum', 'tinh', 'thanh pho',
  'ca mau', 'bac lieu', 'kien giang', 'soc trang', 'an giang', 'can tho', 'hau giang',
  'vinh long', 'tra vinh', 'dong thap', 'tien giang', 'ben tre', 'long an',
  'ho chi minh', 'tp hcm', 'ha noi', 'da nang', 'binh duong', 'dong nai', 'ba ria vung tau',
  'tay ninh', 'binh phuoc', 'lam dong', 'dak lak', 'dak nong', 'gia lai', 'kon tum',
  'khanh hoa', 'binh thuan', 'ninh thuan', 'phu yen', 'binh dinh', 'quang ngai', 'quang nam',
  'thua thien hue', 'quang tri', 'quang binh', 'ha tinh', 'nghe an', 'thanh hoa',
  'cap hien thi', 'danh sach', 'ma tran', 'bieu do', 'luoi', 'the', 'tai lai',
  'xuat excel', 'xuat theo mau', 'chep link', 'chep bang', 'chep hinh', 'da copy',
  'dtlk', 'sllk', 'target', 'target ngay', 'chi tieu', 'ht', 'ht thang', 'ht target', 'ht target ngay',
  'du kien', 'du bao', 'xep hang', 'hang', 'hang vung', 'hang mien', 'hang cty', 'hang trong st',
  'top bottom', 'top bottom vung', 'top bottom st', 'thang', 'realtime',
  'phong ban', 'bo phan', 'nhan vien', 'ten nhan vien', 'ho ten', 'nv', 'stt',
  'ty le', 'ti le', 'dat', 'doanh thu', 'doanh thu (rt)', 'so luong', 'so luong (rt)',
  'luy ke', 'thuc hien', 'sieu thi', 'ten sieu thi', 'nganh hang', 'ten nganh hang', 'nhom nganh hang',
  'cua hang', 'kho', 'ma kho', 'tong', 'tong cong', 'con lai', 'clai',
  'tt doanh thu', 'ti trong', 'ty trong', 'tb 3 thang', 'dt qd khoan vay',
  'doanh thu qd', 'doanh thu quy doi', 'doanh thu thuc', 'doanh thu du kien', 'dt du kien',
  'doanh thu hop nhat', 'tlpvtc', 'luot khach', 'ty le tra cham', 'tra cham', 'hieu qua tra gop',
  'tong hop', 'nganh hang bi', 'chi phi', 'thi dua', 'tang truong', 'chi tiet doanh thu'
]);

export const isGenericCategoryHeaderCol = (col: string): boolean => {
  if (!col) return true;
  const norm = normalize(col.replace(/[%()]/g, ' '));
  if (!norm) return true;
  if (PROVI_AND_NOISE_EXACT.has(norm)) return true;
  return /^(so luong|doanh thu|luy ke|thuc hien|target|chi tieu|sieu thi|ten sieu thi|nganh hang|ten nganh hang|nhom nganh hang|khu vuc|vung|mien|tinh|cum|stt|hang|xep hang|top bottom|nhan vien|ten nhan vien|phong ban|bo phan|tong)(\b|\s)/i.test(norm);
};

export const isNonCategoryNoiseLine = (rawText: string): boolean => {
  if (!rawText) return true;
  const trimmed = rawText.trim();
  if (!trimmed) return true;

  // Must contain at least one letter and not be pure numbers/symbols
  if (!/[a-zA-Zà-ỹÀ-Ỹ]/.test(trimmed) || /^[\d\s,.\-+/%:()]+$/.test(trimmed)) return true;

  // Strip leading numeric area/program code like "3881 - Bạc Liêu" ONLY when checking province/noise
  const withoutCode = trimmed.replace(/^\d{1,8}\s*[-–—:.\s]\s*/, '').trim();
  const normFull = normalize(trimmed.replace(/[%]/g, ' '));
  const normClean = normalize(withoutCode.replace(/[%]/g, ' '));

  if (PROVI_AND_NOISE_EXACT.has(normFull) || PROVI_AND_NOISE_EXACT.has(normClean)) return true;

  // Check if it is an employee line with 4-8 digit ID (unless it starts with T01..T12 competition prefix)
  const isCompetitionPrefix = /^T\d{1,2}\s*[-–—]/i.test(trimmed);
  if (!isCompetitionPrefix && (/^\d{4,8}\s*[-–—]/.test(trimmed) || /[-–—]\s*\d{4,8}$/.test(trimmed))) {
    return true;
  }

  // Hierarchy / Breadcrumb / UI / Summary Metric noise prefixes or substrings
  if (
    /^(vung|mien|khu vuc|cum|tinh|thanh pho|cong ty co phan|toan cong ty|an cong ty|cap hien thi)\b/.test(normClean) ||
    /\b(chuong trinh|ho tro bi|copyright|cap nhat luc|da copy|chep link|chep bang|xuat excel|xuat theo mau)\b/.test(normFull) ||
    /^(tt doanh thu|ti trong|ty trong|tb \d+ thang|dt qd khoan vay|doanh thu hop nhat|tlpvtc)\b/.test(normClean)
  ) {
    return true;
  }

  return false;
};

export const inferCategoryTypeFromName = (name: string): 'SL' | 'DT' => {
  const norm = normalize(name);
  if (
    norm.includes('may lanh') ||
    norm.includes('nap rut') ||
    norm.includes('thu ho') ||
    norm.includes('sim') ||
    /\bvas\b/.test(norm) ||
    norm.includes('mo the') ||
    norm.includes('the tin dung') ||
    norm.includes('tu dien') ||
    norm.includes('sllk') ||
    norm.includes('so luong')
  ) {
    return 'SL';
  }
  return 'DT';
};

export const parseCategoryData = (input: string, daysPassed: number, totalDays: number, markets: MarketInfo[], mode: 'REALTIME' | 'LUYKE' = 'REALTIME'): CategoryData[] => {
  const val = (input || '').trim();
  if (!val) return [];

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const isNumToken = (s: string | undefined) => !!s && /^-?[\d,.]+(%?)$/.test(s.trim());

  // Guard against callers accidentally passing categoryTargets as markets
  const validMarkets: MarketInfo[] = Array.isArray(markets)
    ? markets.filter((m: any) =>
        m &&
        typeof m.name === 'string' &&
        !('adjustedTarget' in m) &&
        !('percent' in m) &&
        (isValidStoreName(m.name) || isSupermarketLine(m.name) || /^\d{3,6}$/.test(m.name.trim()))
      )
    : [];

  const sortedMarkets = [...validMarkets].sort((a, b) => b.name.length - a.name.length).map(m => {
    const normName = normalize(m.name);
    const cleanStore = m.name
      .replace(/^\d{3,6}\s*[-–—:]\s*/, '')
      .replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR|BHX|MWG)[_\s-]+/i, '')
      .replace(/\s*[-–—:]\s*\d{3,6}$/, '');
    const nameWithoutPrefix = normalize(cleanStore);
    const codeMatch = m.name.match(/\b\d{4,6}\b/);
    const code = codeMatch ? codeMatch[0].trim() : "";
    return { ...m, normName, nameWithoutPrefix, code };
  });

  const matchesKnownMarket = (colVal: string): boolean => {
    if (!colVal) return false;
    if (isSupermarketLine(colVal)) return true;
    const normC = normalize(colVal);
    const cleanC = normalize(colVal.replace(/^\d{3,6}\s*[-–—:]\s*/, '').replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR|BHX|MWG)[_\s-]+/i, ''));
    return sortedMarkets.some(m =>
      normC.includes(m.normName) ||
      (m.nameWithoutPrefix.length > 3 && (normC.includes(m.nameWithoutPrefix) || cleanC.includes(m.nameWithoutPrefix))) ||
      (m.code.length >= 3 && normC.includes(m.code))
    );
  };

  // 1. Preprocess lines:
  // - Combine standalone supermarket lines with following data numbers line (tab-separated OR vertical lines)
  // - Combine non-supermarket hierarchy rows (e.g. "TỔNG", "Vùng Tây Nam Bộ", "Cà Mau") with their following tab-separated numbers row as "TỔNG\t..." so they are skipped cleanly and never overwrite currentCatName.
  const rawLines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lineHasTabs = line.includes('\t') || / {2,}/.test(line);

    if (!lineHasTabs && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      const nextCols = nextLine.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
      const nextIsNumericRow = nextCols.length >= 2 && isNumToken(nextCols[0]) && isNumToken(nextCols[1]);

      if (nextIsNumericRow) {
        if (matchesKnownMarket(line)) {
          lines.push(line + '\t' + nextLine);
          i++;
          continue;
        } else {
          // Non-supermarket row immediately followed by numeric metrics row (e.g. "TỔNG", "Vùng Tây Nam Bộ", "Cà Mau")
          // Mark as TỔNG summary row so both the label and its numbers are skipped without touching currentCatName
          lines.push('TỔNG\t' + nextLine);
          i++;
          continue;
        }
      }

      // Handle vertical single-number-per-line copy-paste after a supermarket or TỔNG/hierarchy line
      if (nextCols.length === 1 && isNumToken(nextCols[0]) && i + 2 < rawLines.length) {
        const nextLine2 = rawLines[i + 2];
        const nextCols2 = nextLine2.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
        if (nextCols2.length === 1 && isNumToken(nextCols2[0])) {
          const collectedNums: string[] = [];
          let k = i + 1;
          while (k < rawLines.length && collectedNums.length < 6) {
            const kLine = rawLines[k].trim();
            if (isNumToken(kLine) || kLine === '-') {
              collectedNums.push(kLine);
              k++;
            } else {
              break;
            }
          }
          if (collectedNums.length >= 2) {
            if (matchesKnownMarket(line)) {
              lines.push(line + '\t' + collectedNums.join('\t'));
            } else {
              lines.push('TỔNG\t' + collectedNums.join('\t'));
            }
            i = k - 1;
            continue;
          }
        }
      }
    }
    lines.push(line);
  }

  const results: CategoryData[] = [];
  let currentCatName = "";
  let currentCatType: 'SL' | 'DT' | 'ALL' = 'ALL';
  let headerTargetBeforeActual = false;
  let currentMarketName = validMarkets.length > 0 ? validMarkets[0].name : "7038";
  
  if (currentMarketName.match(/^\d+$/) && validMarkets.length > 0) {
    const found = validMarkets.find(m => m.name.toUpperCase().includes(currentMarketName));
    if (found) currentMarketName = found.name;
  }

  const cleanExtractedCatName = (rawName: string): string => {
    let extracted = rawName.replace(/^\d+[-_.\s]+\s*/, '').trim();
    const upper = extracted.toUpperCase();
    if (upper === 'DTLK' || upper === 'SLLK') {
      return upper;
    }
    if (/^(DTLK|SLLK)\b/i.test(extracted)) {
      extracted = extracted.replace(/^(DTLK|SLLK)\s*[-_]*\s*/i, '').trim();
    }
    if (/\b(DTLK|SLLK)$/i.test(extracted)) {
      extracted = extracted.replace(/\s*[-_]*\s*(DTLK|SLLK)$/i, '').trim();
    }
    if (extracted.match(/SLLK|DTLK/i)) {
      const parts = extracted.split(/SLLK|DTLK/i);
      const firstPart = parts[0].trim();
      extracted = firstPart ? firstPart : parts.slice(1).join(' ').trim();
    }
    extracted = extracted.replace(/SL REALTIME|DT REALTIME/gi, '').trim();
    extracted = extracted.replace(/^[-_]+|[-_]+$/g, '').trim();
    const targetMatch = extracted.match(/(.+?)\bTARGET\b/i);
    if (targetMatch) {
      extracted = targetMatch[1].trim();
    }
    return extracted;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Split by tabs or double spaces
    const rawCols = line.includes('\t') ? line.split('\t').map(c => c.trim()) : line.split(/ {2,}/).map(c => c.trim()).filter(Boolean);
    const cols = line.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length === 0) continue;

    const trimmedLine = line.trim();
    const trimmedUpper = trimmedLine.toUpperCase();
    const isMultiCol = line.includes('\t') || line.includes('  ');
    const isHeaderCols = isMultiCol && (
      trimmedUpper.includes('TARGET') || 
      trimmedUpper.includes('CHỈ TIÊU') ||
      trimmedUpper.includes('HẠNG') || 
      trimmedUpper.includes('DỰ BÁO') || 
      trimmedUpper.includes('% HT') || 
      trimmedUpper.includes('TOP/BOTTOM') || 
      trimmedUpper.includes('BỘ PHẬN') || 
      trimmedUpper.includes('THỰC HIỆN') ||
      trimmedUpper.includes('LUỸ KẾ') ||
      trimmedUpper.includes('LŨY KẾ')
    );

    const isExactDtIndicator = /^(DOANH THU(\s*\(.*?\))?|DTLK|DT(\s*\(.*?\))?|DT)$/i.test(trimmedLine);
    const isExactSlIndicator = /^(SỐ LƯỢNG(\s*\(.*?\))?|SLLK|SL(\s*\(.*?\))?|SL)$/i.test(trimmedLine);

    if (isHeaderCols) {
      const firstHeaderCol = cols[0] || '';
      const hasInlineCat =
        firstHeaderCol.length > 0 &&
        !isGenericCategoryHeaderCol(firstHeaderCol) &&
        !isNonCategoryNoiseLine(firstHeaderCol) &&
        !matchesKnownMarket(firstHeaderCol);

      if (hasInlineCat) {
        currentCatName = cleanExtractedCatName(firstHeaderCol);
      }

      // Determine category type (SL vs DT) from the metric columns of the header
      const metricCols = hasInlineCat ? cols.slice(1) : cols;
      const metricColsUpper = metricCols.join(' ').toUpperCase();
      if (metricColsUpper.includes('SỐ LƯỢNG') || metricColsUpper.includes('SLLK') || /\bSL\b/.test(metricColsUpper)) {
        currentCatType = 'SL';
      } else if (metricColsUpper.includes('DOANH THU') || metricColsUpper.includes('DTLK') || /\bDT\b/.test(metricColsUpper)) {
        currentCatType = 'DT';
      } else if (metricColsUpper.includes('LUỸ KẾ') || metricColsUpper.includes('LŨY KẾ') || metricColsUpper.includes('THỰC HIỆN')) {
        // Generic LUỸ KẾ header without SL/DT indicator: infer per category if not already set
        currentCatType = 'ALL';
      }

      // Detect if header explicitly places TARGET before LUỸ KẾ / SỐ LƯỢNG / DOANH THU
      const actualColIdx = metricCols.findIndex(c => /^(SỐ LƯỢNG|DOANH THU|LUỸ KẾ|LŨY KẾ|THỰC HIỆN|SLLK|DTLK|\bSL\b|\bDT\b)/i.test(c.trim()));
      const targetColIdx = metricCols.findIndex(c => /^(TARGET|CHỈ TIÊU)/i.test(c.trim()));
      headerTargetBeforeActual = actualColIdx !== -1 && targetColIdx !== -1 && targetColIdx < actualColIdx;
      continue;
    }

    if (isExactDtIndicator && !trimmedUpper.includes('HỢP NHẤT')) {
      currentCatType = 'DT';
      continue;
    }
    if (isExactSlIndicator) {
      currentCatType = 'SL';
      continue;
    }

    // Detect if this line has a store name in col 0, 1, or 2
    let storeColIdx = -1;
    for (let c = 0; c < Math.min(cols.length, 3); c++) {
      const colVal = cols[c];
      if (colVal.toLowerCase().startsWith('tổng') || matchesKnownMarket(colVal)) {
        storeColIdx = c;
        break;
      }
    }

    // The name column (store name or "Tổng")
    let firstCol = storeColIdx !== -1 ? cols[storeColIdx] : cols[0];
    
    // Clean first column leading numbers safely
    firstCol = firstCol.replace(/^\d+[\.\t]\s*/, '').replace(/^\d+\s+(?!\d)/, '').trim();
    const normFirstCol = normalize(firstCol);

    if ((normFirstCol.includes("tong") && firstCol.toLowerCase().startsWith("tổng") && !normFirstCol.includes("sim tong")) || 
        normFirstCol.includes("ho tro bi lien he") || 
        normFirstCol.includes("copyright") ||
        normFirstCol.includes("chuong trinh") ||
        normFirstCol.includes("chep link") ||
        normFirstCol.includes("toan cong ty")) {
      continue;
    }

    // Extract numbers from subsequent columns after the store column
    const numStartIndex = storeColIdx !== -1 ? storeColIdx + 1 : 1;
    const dataNumbers: string[] = [];
    for (let j = numStartIndex; j < cols.length; j++) {
      const col = cols[j];
      if (isNumToken(col)) {
        dataNumbers.push(col);
      }
    }

    const isHeaderLine = normFirstCol.includes('target') || normFirstCol.includes('thang') || normFirstCol.includes('du kien') || normFirstCol.includes('rank') || normFirstCol.includes('hang vung');
    const isDataLine = dataNumbers.length >= 2 && 
                       !isHeaderLine && 
                       (storeColIdx !== -1 || firstCol.toLowerCase().startsWith('tổng') || isSupermarketLine(firstCol));

    if (isDataLine) {
      if (firstCol.toLowerCase().startsWith('tổng')) {
        continue;
      }

      // If store is in column 1+ (e.g. [Ngành hàng] \t [Tên siêu thị] \t [LUỸ KẾ] \t [TARGET]),
      // check if cols[0] is the category name for this row
      if (storeColIdx > 0) {
        const leadingCol = cols[0];
        if (
          leadingCol &&
          !isGenericCategoryHeaderCol(leadingCol) &&
          !isNonCategoryNoiseLine(leadingCol) &&
          !matchesKnownMarket(leadingCol)
        ) {
          currentCatName = cleanExtractedCatName(leadingCol);
        }
      }
      
      // Update market name if matched
      const cleanFirstCol = normalize(firstCol.replace(/^\d{3,6}\s*[-–—:]\s*/, '').replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR|BHX|MWG)[_\s-]+/i, ''));
      const matchedMarket = sortedMarkets.find(m => {
        return normFirstCol.includes(m.normName) || 
               (m.nameWithoutPrefix.length > 3 && (normFirstCol.includes(m.nameWithoutPrefix) || cleanFirstCol.includes(m.nameWithoutPrefix))) ||
               (m.code.length >= 3 && normFirstCol.includes(m.code));
      });
      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
      } else {
        currentMarketName = formatMarketName(firstCol);
      }

      // Extract LUỸ KẾ (actual) and TARGET (target) relative to the store column
      // Standard BI & tabular structure after store name: Column +1 = LUỸ KẾ, Column +2 = TARGET
      let actual = 0;
      let target = 0;
      const colAfterStore1 = storeColIdx !== -1 ? cols[storeColIdx + 1] : rawCols[1];
      const colAfterStore2 = storeColIdx !== -1 ? cols[storeColIdx + 2] : rawCols[2];
      const colAfterStore3 = storeColIdx !== -1 ? cols[storeColIdx + 3] : rawCols[3];

      if (isNumToken(colAfterStore1) && isNumToken(colAfterStore2)) {
        if (headerTargetBeforeActual) {
          target = cleanNum(colAfterStore1);
          actual = cleanNum(colAfterStore2);
        } else {
          actual = cleanNum(colAfterStore1);
          target = cleanNum(colAfterStore2);
        }
      } else if (dataNumbers.length >= 2) {
        if (headerTargetBeforeActual) {
          target = cleanNum(dataNumbers[0]);
          actual = cleanNum(dataNumbers[1]);
        } else {
          actual = cleanNum(dataNumbers[0]);
          target = cleanNum(dataNumbers[1]);
        }
      }
      
      actual = round2(actual);
      target = round2(target);
      
      let rate = 0;
      if (colAfterStore3 && colAfterStore3.includes('%')) {
        rate = cleanNum(colAfterStore3);
      } else if (dataNumbers.length >= 3 && dataNumbers[2].includes('%')) {
        rate = cleanNum(dataNumbers[2]);
      } else if (target > 0) {
        rate = (actual / target) * 100;
      }
      rate = Math.round(rate * 10) / 10;
      
      const extractedName = cleanExtractedCatName(currentCatName);
      if (extractedName && !isNonCategoryNoiseLine(extractedName)) {
        const effectiveType: 'SL' | 'DT' = currentCatType === 'ALL'
          ? inferCategoryTypeFromName(extractedName)
          : currentCatType;
        const normExtracted = normalize(extractedName);
        const normMarket = normalize(currentMarketName);

        if (!results.some(r => normalize(r.name) === normExtracted && normalize(r.marketName) === normMarket && r.type === effectiveType)) {
          results.push({
            name: extractedName,
            target,
            actual,
            rate,
            marketName: currentMarketName,
            type: effectiveType,
            revenue: actual,
            group: 'ALL'
          });
        }
      }
      continue;
    }

    if (!isDataLine) {
      if (!firstCol.toLowerCase().startsWith("tổng")) {
        const catName = cols[0];
        let catType: 'SL' | 'DT' | 'ALL' = currentCatType;
        const fullLine = line.trim();
        if (fullLine.match(/SL Realtime|SL REALTIME|SLLK|\bSL\b|số lượng|so luong|quantity/i)) catType = 'SL';
        else if (fullLine.match(/DT Realtime|DT REALTIME|DTLK|\bDT\b|doanh thu|revenue/i)) catType = 'DT';

        const isMarket = matchesKnownMarket(catName);
        const hasMultipleColumns = cols.length > 1;

        if (
          !isMarket &&
          !hasMultipleColumns &&
          catName.length > 0 &&
          !isGenericCategoryHeaderCol(catName) &&
          !isNonCategoryNoiseLine(catName)
        ) {
          currentCatName = cleanExtractedCatName(catName);
          currentCatType = catType;
        }
      }
      continue;
    }
  }
  return results;
};

export const extractCategoriesFromStoreThiDua = (
  rawText: string, 
  marketFilter?: string
): { 
  categories: string[]; 
  categoryObjects: (CategoryData & { clean: string })[];
  totalCat: number;
} => {
  const raw = (rawText || '').trim();
  if (!raw) return { categories: [], categoryObjects: [], totalCat: 0 };

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Step 1: Identify all category sections by their table header (DOANH THU/SỐ LƯỢNG + TARGET/HẠNG/THỰC HIỆN)
  const sectionIndices: { lineIdx: number; catName: string; type: 'SL' | 'DT' }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const upperL = l.toUpperCase();
    const cols = l.includes('\t')
      ? l.split('\t').map(c => c.trim())
      : l.includes('|')
        ? l.split('|').map(c => c.trim())
        : l.split(/\s{2,}/).map(c => c.trim());

    const isGenericFirstCol = !cols[0] || isGenericCategoryHeaderCol(cols[0]);
    const hasHeaderCols = cols.length >= 2 && (
      upperL.includes('HẠNG TRONG ST') ||
      upperL.includes('TOP/BOTTOM') ||
      (upperL.includes('TARGET') && (upperL.includes('% HT') || upperL.includes('HẠNG') || upperL.includes('DỰ BÁO') || upperL.includes('DOANH THU') || upperL.includes('SỐ LƯỢNG') || upperL.includes('LUỸ KẾ') || upperL.includes('LŨY KẾ'))) ||
      (isGenericFirstCol && (upperL.includes('DOANH THU') || upperL.includes('SỐ LƯỢNG') || upperL.includes('HẠNG') || upperL.includes('TARGET') || upperL.includes('THỰC HIỆN')))
    );

    const isLineHeader = (upperL === 'DOANH THU' || upperL === 'SỐ LƯỢNG' || upperL === 'DT' || upperL === 'SL') &&
      i + 1 < lines.length && (lines[i + 1].toUpperCase().includes('HẠNG') || lines[i + 1].toUpperCase().includes('TARGET') || lines[i + 1].toUpperCase().includes('% HT'));

    if (hasHeaderCols && !isGenericFirstCol) {
      // Inline category header on line i (e.g. "T10 - Máy Lạnh \t SỐ LƯỢNG \t TARGET ...")
      const catName = cols[0];
      if (catName && !isNonCategoryNoiseLine(catName) && !isSupermarketLine(catName)) {
        const restUpper = cols.slice(1).join(' ').toUpperCase();
        const type: 'SL' | 'DT' = (restUpper.includes('SỐ LƯỢNG') || restUpper.includes('SLLK') || /\bSL\b/.test(restUpper))
          ? 'SL'
          : (restUpper.includes('DOANH THU') || restUpper.includes('DTLK') || /\bDT\b/.test(restUpper))
            ? 'DT'
            : inferCategoryTypeFromName(catName);
        sectionIndices.push({ lineIdx: i, catName, type });
      }
    } else if ((hasHeaderCols && isGenericFirstCol) || isLineHeader) {
      if (i > 0) {
        let catIdx = i - 1;
        let catName = lines[catIdx];
        if (/^(DOANH THU|SỐ LƯỢNG|DT|SL)$/i.test(catName.trim()) && catIdx > 0) {
          catIdx--;
          catName = lines[catIdx];
        }
        if (/^\d{4,6}$/.test(catName.trim()) && catIdx > 0) {
          catIdx--;
          catName = lines[catIdx];
        }
        if (catName && !isNonCategoryNoiseLine(catName) && !isSupermarketLine(catName)) {
          const type: 'SL' | 'DT' = (upperL.includes('SỐ LƯỢNG') || /\bSL\b/.test(upperL)) ? 'SL' : 'DT';
          sectionIndices.push({ lineIdx: i, catName, type });
        }
      }
    }
  }

  // Fallback if no BI table headers found: simple newline list of categories
  if (sectionIndices.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.includes('\t') && l.length >= 2 && !isSupermarketLine(l) && !isNonCategoryNoiseLine(l)) {
        sectionIndices.push({ lineIdx: i, catName: l, type: inferCategoryTypeFromName(l) });
      }
    }
  }

  // Deduplicate by normalized full category name + type so distinct programs like
  // "T10 - HÚT BỤI" and "T10 - Hút bụi - 20 Tỉnh" are both preserved
  const seenKey = new Set<string>();
  const categories: string[] = [];
  const categoryObjects: (CategoryData & { clean: string })[] = [];
  const normFilter = marketFilter && marketFilter !== 'ALL' ? normalize(marketFilter) : '';

  for (let s = 0; s < sectionIndices.length; s++) {
    const sec = sectionIndices[s];
    const catName = sec.catName;
    const clean = cleanCategoryName(catName);
    const dedupKey = `${normalize(catName)}__${sec.type}`;
    if (!clean || seenKey.has(dedupKey)) continue;
    seenKey.add(dedupKey);
    categories.push(catName);

    let actual = 0;
    let target = 0;
    const startLine = sec.lineIdx + 1;
    const endLine = s + 1 < sectionIndices.length ? sectionIndices[s + 1].lineIdx : lines.length;

    for (let r = startLine; r < endLine; r++) {
      const row = lines[r];
      const normRow = normalize(row);
      const rawCols = row.split('\t').map(c => c.trim());
      const cols = row.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);

      if (normFilter && (normRow.includes(normFilter) || normFilter.includes(normRow))) {
        if (rawCols.length >= 3 && /^-?[\d,.]+(%?)$/.test(rawCols[2])) {
          actual = round2(cleanNum(rawCols[1]));
          target = round2(cleanNum(rawCols[2]));
          break;
        } else if (r + 1 < endLine) {
          const nextCols = lines[r + 1].split(/\t|\s{2,}/).map(c => c.trim());
          if (nextCols.length >= 2 && /^-?[\d,.]+(%?)$/.test(nextCols[0]) && /^-?[\d,.]+(%?)$/.test(nextCols[1])) {
            actual = round2(cleanNum(nextCols[0]));
            target = round2(cleanNum(nextCols[1]));
            break;
          }
        }
      } else if (!normFilter && cols.length >= 3 && /^-?[\d,.]+(%?)$/.test(cols[1]) && /^-?[\d,.]+(%?)$/.test(cols[2]) && !row.toLowerCase().startsWith('tổng')) {
        if (target === 0 && actual === 0) {
          actual = round2(cleanNum(cols[1]));
          target = round2(cleanNum(cols[2]));
        }
      }
    }

    categoryObjects.push({
      name: catName,
      clean,
      target,
      type: sec.type,
      actual,
      rate: target > 0 ? Math.round((actual / target) * 1000) / 10 : 0,
      marketName: marketFilter || '',
      revenue: actual,
      group: 'ALL'
    });
  }

  return { categories, categoryObjects, totalCat: categories.length };
};

export const getStoredStaffThucInput = (storeKey?: string): string => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    const normKey = (s: string) =>
      removeAccents(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Direct specific store keys
    if (storeKey) {
      const cleanStore = storeKey.replace(/\D/g, '');
      const candidates = [
        `cauhinh_${storeKey}_dt_thuc_nv`,
        `real_dthu_nv_raw_thuc_${storeKey}`,
        cleanStore ? `real_dthu_nv_raw_thuc_${cleanStore}` : '',
        cleanStore ? `cauhinh_${cleanStore}_dt_thuc_nv` : ''
      ].filter(Boolean);

      for (const k of candidates) {
        const v = localStorage.getItem(k);
        if (v && v.trim().length > 5) return v.trim();
      }

      // Fuzzy match on storeKey (accent-insensitive)
      const normTarget = normKey(storeKey);
      if (normTarget) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('dt_thuc_nv') || k.includes('raw_thuc') || k.includes('dt_thuc'))) {
            const normK = normKey(k);
            if (normK.includes(normTarget) || normTarget.includes(normK)) {
              const v = localStorage.getItem(k);
              if (v && v.trim().length > 5) return v.trim();
            }
          }
        }
      }
    }

    // 2. Active store from localStorage
    const activeStore = localStorage.getItem('currentStoreId') || localStorage.getItem('rtst_ma_kho') || '';
    if (activeStore && activeStore !== storeKey) {
      const cleanStore = activeStore.replace(/\D/g, '');
      const candidates = [
        `cauhinh_${activeStore}_dt_thuc_nv`,
        `real_dthu_nv_raw_thuc_${activeStore}`,
        cleanStore ? `real_dthu_nv_raw_thuc_${cleanStore}` : '',
        cleanStore ? `cauhinh_${cleanStore}_dt_thuc_nv` : ''
      ].filter(Boolean);
      for (const k of candidates) {
        const v = localStorage.getItem(k);
        if (v && v.trim().length > 5) return v.trim();
      }

      const normActive = normKey(activeStore);
      if (normActive) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('dt_thuc_nv') || k.includes('raw_thuc') || k.includes('dt_thuc'))) {
            const normK = normKey(k);
            if (normK.includes(normActive) || normActive.includes(normK)) {
              const v = localStorage.getItem(k);
              if (v && v.trim().length > 5) return v.trim();
            }
          }
        }
      }
    }

    // 3. Latest pasted
    const latest = localStorage.getItem('real_dthu_nv_raw_thuc_latest');
    if (latest && latest.trim().length > 5) return latest.trim();

    // 4. Scan any key in localStorage containing thuc and (dt or nv or raw or dthu) with largest content
    let bestVal = '';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const lk = k.toLowerCase();
        if (lk.includes('thuc') && (lk.includes('dt') || lk.includes('nv') || lk.includes('raw') || lk.includes('dthu'))) {
          const v = localStorage.getItem(k);
          if (v && v.trim().length > bestVal.length) {
            bestVal = v.trim();
          }
        }
      }
    }
    if (bestVal.length > 5) return bestVal;
  } catch (e) {
    console.error('[getStoredStaffThucInput] Error:', e);
  }
  return '';
};

export type StaffHeaderFieldType =
  | 'stt'
  | 'store'
  | 'employeeCode'
  | 'employeeName'
  | 'employeeCombined'
  | 'quantity'
  | 'actualRevenue'
  | 'convertedRevenue'
  | 'loanConvertedRevenue'
  | 'revenueShare'
  | 'target'
  | 'targetRate'
  | 'avg3Months'
  | 'growthRate'
  | 'expectedRevenue'
  | 'installmentRevenue'
  | 'installmentRate'
  | 'unknown';

export interface ParsedStaffReportRow {
  employeeCode: string;
  employeeName: string;
  displayName: string;
  storeName: string;
  quantity: number | null;
  actualRevenue: number | null;
  convertedRevenue: number | null;
  loanConvertedRevenue: number | null;
  revenueShare: number | null;
  target: number | null;
  targetRate: number | null;
  avg3Months: number | null;
  growthRate: number | null;
  expectedRevenue: number | null;
  installmentRevenue: number | null;
  installmentRate: number | null;
  // 7-column daily/accumulated competition fields (if applicable)
  is7ColCompetition?: boolean;
  todayTarget?: number;
  todayActual?: number;
  todayRate?: number;
  accTarget?: number;
  accActual?: number;
  forecast?: number;
  accRate?: number;
}

export const parseNullableReportNum = (s: any): number | null => {
  if (s === null || s === undefined) return null;
  let str = String(s).trim();
  if (!str || str === '—' || str === '–' || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
    return null;
  }

  // Handle parentheses negative format like (12.5)
  let isParenNeg = false;
  if (/^\([\d,.\s%]+\)$/.test(str)) {
    isParenNeg = true;
    str = str.slice(1, -1).trim();
  }

  if (str.includes('%')) {
    str = str.replace(/%/g, '').replace(/,/g, '.').trim();
    const n = parseFloat(str);
    if (isNaN(n)) return null;
    const val = isParenNeg ? -Math.abs(n) : n;
    return Object.is(val, -0) ? 0 : val;
  }

  let cleaned = str.replace(/[^\d,.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === ',') return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const parts = cleaned.split(',');
    const unsignedFirst = parts[0].replace(/^-/, '');
    if (parts.length > 1 && unsignedFirst.length > 0 && parts.slice(1).every(p => p.length === 3)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(/,/g, '.');
    }
  } else if (lastDot !== -1) {
    const parts = cleaned.split('.');
    const unsignedFirst = parts[0].replace(/^-/, '');
    if (parts.length > 1 && unsignedFirst.length > 0 && parts.slice(1).every(p => p.length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const result = parseFloat(cleaned);
  if (isNaN(result)) return null;
  const finalVal = isParenNeg ? -Math.abs(result) : result;
  return Object.is(finalVal, -0) ? 0 : finalVal;
};

export const classifyStaffHeaderCell = (raw: string): StaffHeaderFieldType | null => {
  if (!raw) return null;
  const h = removeAccents(raw)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!h) return null;

  if (h === 'stt' || h === 'no' || h === 'hang' || h === 'xep hang') return 'stt';
  if (
    h === 'sieu thi' ||
    h === 'ten sieu thi' ||
    h === 'cua hang' ||
    h === 'ma kho' ||
    h === 'kho' ||
    h === 'vung' ||
    h === 'khu vuc' ||
    h === 'mien' ||
    h === 'bo phan' ||
    h === 'phong ban'
  ) {
    return 'store';
  }
  if (
    h === 'ma nv' ||
    h === 'ma nhan vien' ||
    h === 'manv' ||
    h === 'msnv' ||
    h === 'id nv' ||
    h === 'ma so nv' ||
    h === 'ma so nhan vien'
  ) {
    return 'employeeCode';
  }
  if (
    h === 'ten nhan vien' ||
    h === 'ten nv' ||
    h === 'ho ten' ||
    h === 'ho va ten' ||
    h === 'ho ten nhan vien' ||
    h === 'ten nhan su'
  ) {
    return 'employeeName';
  }
  if (h === 'nhan vien' || h === 'nv' || h === 'nhan su' || h.includes('nhan vien')) {
    return 'employeeCombined';
  }
  if (h === 'so luong' || h === 'sl' || h === 's luong' || h === 'soluong' || h.includes('so luong')) {
    return 'quantity';
  }
  // IMPORTANT: Check loanConvertedRevenue BEFORE convertedRevenue / actualRevenue
  if (
    h.includes('khoan vay') ||
    h.includes('vay tien mat') ||
    (h.includes('vay') && (h.includes('dt') || h.includes('doanh thu')))
  ) {
    return 'loanConvertedRevenue';
  }
  // Check installmentRate before installmentRevenue
  if (
    (h.includes('tra gop') || h.includes('tragop') || h.includes('tra cham') || h.includes('tracham')) &&
    (h.includes('%') || h.includes('ti trong') || h.includes('ty trong'))
  ) {
    return 'installmentRate';
  }
  if (h.includes('tra gop') || h.includes('tragop') || h.includes('tra cham') || h.includes('tracham')) {
    return 'installmentRevenue';
  }
  if ((h.includes('target') && (h.includes('%') || h.includes('ht'))) || h === '% ht' || h === '% hoan thanh') {
    return 'targetRate';
  }
  if (h === 'target' || h.includes('target') || h === 'muc tieu' || h === 'chi tieu') {
    return 'target';
  }
  if (h.includes('tb 3 thang') || h.includes('tb 3t') || h.includes('trung binh 3 thang') || h === 'tb 3') {
    return 'avg3Months';
  }
  if (h.includes('du kien') || h.includes('du bao')) {
    return 'expectedRevenue';
  }
  if (h.includes('ti trong') || h.includes('ty trong')) {
    return 'revenueShare';
  }
  if (h === '% tt' || h === 'tt' || h.includes('tang truong')) {
    return 'growthRate';
  }
  if (
    h.includes('doanh thu qd') ||
    h.includes('dt qd') ||
    h.includes('dtqd') ||
    h.includes('quy doi') ||
    h === 'dt qd' ||
    h === 'dtqd'
  ) {
    return 'convertedRevenue';
  }
  if (
    h.includes('doanh thu thuc') ||
    h.includes('dt thuc') ||
    h.includes('d thu thuc') ||
    h === 'doanh thu' ||
    h === 'dt' ||
    h === 'd thu' ||
    h === 'dtlk' ||
    h.includes('doanh thu luy ke')
  ) {
    return 'actualRevenue';
  }
  return null;
};

export const parseStaffReportRows = (
  text: string,
  defaultMode: 'qd' | 'thuc' | 'auto' = 'auto'
): ParsedStaffReportRow[] => {
  if (!text || !text.trim()) return [];

  const rawLines = text
    .split('\n')
    .map(l => l.replace(/\u00A0/g, ' ').trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  const lowerFullText = removeAccents(text).toLowerCase();
  const textHasDtqdHeader =
    lowerFullText.includes('doanh thu qd') ||
    lowerFullText.includes('dt qd') ||
    lowerFullText.includes('dtqd') ||
    lowerFullText.includes('doanh thu quy doi');

  const isMetadataOrTotalLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    const upper = trimmed.toUpperCase();
    const norm = removeAccents(trimmed).toLowerCase().trim();

    if (
      upper === 'TỔNG' ||
      upper.startsWith('TỔNG ') ||
      upper.startsWith('TỔNG(') ||
      upper.startsWith('TỔNG\t') ||
      upper.startsWith('TỔNG CỘNG') ||
      upper.startsWith('TOTAL') ||
      upper.startsWith('GRAND TOTAL') ||
      (upper.includes('1-') && upper.includes('/ TỔNG')) ||
      upper.includes('ĐƠN VỊ:') ||
      upper.includes('TỈ TRỌNG TÍNH') ||
      upper.includes('CẬP NHẬT LÚC') ||
      upper.includes('XUẤT EXCEL') ||
      upper.includes('XUẤT THEO MẪU') ||
      upper.includes('TẤT CẢ VÙNG') ||
      upper.includes('TÌM BÁO CÁO') ||
      upper.includes('CHI TIẾT THEO') ||
      upper.includes('DOANH THU THEO CẤP') ||
      upper.includes('TỔNG HỢP NGÀNH HÀNG') ||
      upper.includes('TỔNG HỢPNGÀNH HÀNG') ||
      norm.includes('copy all') ||
      norm === 'copy' ||
      norm === 'xem' ||
      norm === 'tgdd' ||
      norm === 'dmx' ||
      norm === 's'
    ) {
      return true;
    }
    return false;
  };

  const NON_NAME_KEYWORDS = new Set([
    'nhan vien',
    'ten nhan vien',
    'ma nv',
    'ma nhan vien',
    'so luong',
    'doanh thu',
    'doanh thu thuc',
    'doanh thu qd',
    'dt qd khoan vay',
    'dt khoan vay',
    'khoan vay',
    'ti trong',
    'ty trong',
    '% ti trong',
    '% ty trong',
    'target',
    '% ht target',
    'tb 3 thang',
    '% tt',
    'dt du kien',
    'dt tra gop',
    '% tra gop',
    'tong',
    'tong cong',
    'sieu thi',
    'khu vuc',
    'vung',
    'mien',
    'stt',
    'copy all',
    'copy',
    'xuat excel',
    'xuat theo mau',
    'realtime',
    'luy ke'
  ]);

  const isPureStaffName = (s: string, requireTwoWords = false): boolean => {
    if (!s) return false;
    const trimmed = s.trim();
    if (!trimmed || trimmed.length < 2) return false;
    if (trimmed.includes('%') || /^\d+$/.test(trimmed) || /^-?[\d,.]+$/.test(trimmed)) return false;
    if (/^(ĐML|DMX|TGD|TGDD|BHX|TOP)_/i.test(trimmed)) return false;
    if (isMetadataOrTotalLine(trimmed)) return false;

    const norm = removeAccents(trimmed).toLowerCase().replace(/\s+/g, ' ').trim();
    if (NON_NAME_KEYWORDS.has(norm)) return false;
    if (classifyStaffHeaderCell(trimmed) !== null) return false;

    // Must contain Vietnamese/Latin letters and no digits
    if (!/[a-zA-ZÀ-ỹ]/.test(trimmed) || /\d/.test(trimmed)) return false;
    if (!/^[a-zA-ZÀ-ỹ\s'.()_-]+$/.test(trimmed)) return false;

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (requireTwoWords && (words.length < 2 || trimmed.length < 4)) return false;
    return true;
  };

  const matchCombinedStaffCell = (cell: string): { id: string; name: string } | null => {
    if (!cell) return null;
    const trimmed = cell.trim();
    if (!trimmed || isMetadataOrTotalLine(trimmed)) return null;
    if (/^(ĐML|DMX|TGD|TGDD|BHX|TOP)_/i.test(trimmed)) return null;

    // Special system staff accounts
    const sysMatch = trimmed.match(/^(online|administrator)\s*[-–—]\s*(.+)$/i);
    if (sysMatch) {
      return { id: sysMatch[1].trim().toUpperCase(), name: sysMatch[2].trim().toUpperCase() };
    }

    // Pattern 1: Name - ID (e.g. "Nguyễn Thị Nhạn - 12803")
    const m1 = trimmed.match(/^(.+?)[\s]*[-–—]+[\s]*(\d{3,10})$/);
    // Pattern 2: ID - Name (e.g. "12803 - Nguyễn Thị Nhạn")
    const m2 = trimmed.match(/^(\d{3,10})[\s]*[-–—]+[\s]*(.+)$/);

    if (m1 || m2) {
      const id = (m1 ? m1[2] : m2![1]).trim();
      const rawName = (m1 ? m1[1] : m2![2]).replace(/^[-_\s]+|[-_\s]+$/g, '').trim();
      if (!rawName || !/[a-zA-ZÀ-ỹ]/.test(rawName)) return null;
      const lowerName = removeAccents(rawName).toLowerCase();
      if (
        lowerName.includes('copy all') ||
        lowerName.includes('sao chep') ||
        lowerName.startsWith('tong') ||
        NON_NAME_KEYWORDS.has(lowerName)
      ) {
        return null;
      }
      return { id, name: rawName.toUpperCase() };
    }
    return null;
  };

  // 1. Detect Header Block (single-line tab-separated or multi-line vertical BI header)
  let detectedHeaders: StaffHeaderFieldType[] = [];
  const headerLineIndices = new Set<number>();

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isMetadataOrTotalLine(line)) continue;

    // Check multi-column header on a single line
    const tabCols = line.includes('\t')
      ? line.split('\t').map(c => c.trim()).filter(Boolean)
      : line.split(/ {2,}/).map(c => c.trim()).filter(Boolean);

    if (tabCols.length >= 2) {
      const classified = tabCols.map(c => classifyStaffHeaderCell(c));
      const validCount = classified.filter(c => c !== null).length;
      const hasEmpOrRev = classified.some(
        c =>
          c === 'employeeCode' ||
          c === 'employeeName' ||
          c === 'employeeCombined' ||
          c === 'quantity' ||
          c === 'actualRevenue' ||
          c === 'convertedRevenue'
      );
      if (validCount >= 2 && validCount >= Math.ceil(tabCols.length * 0.5) && hasEmpOrRev) {
        if (detectedHeaders.length === 0) {
          detectedHeaders = classified.map(c => c || 'unknown');
        }
        headerLineIndices.add(i);
        continue;
      }
    }

    // Check vertical single-cell header sequence
    const singleClass = classifyStaffHeaderCell(line);
    if (singleClass !== null) {
      // Look ahead for consecutive single-cell header lines
      const seq: StaffHeaderFieldType[] = [singleClass];
      const seqIndices: number[] = [i];
      let j = i + 1;
      while (j < rawLines.length) {
        const nextLine = rawLines[j];
        if (nextLine.includes('\t')) break;
        const nextClass = classifyStaffHeaderCell(nextLine);
        if (nextClass !== null) {
          seq.push(nextClass);
          seqIndices.push(j);
          j++;
        } else {
          break;
        }
      }
      const hasIdentityOrRev = seq.some(
        c =>
          c === 'employeeCode' ||
          c === 'employeeName' ||
          c === 'employeeCombined' ||
          c === 'quantity' ||
          c === 'actualRevenue' ||
          c === 'convertedRevenue'
      );
      if (seq.length >= 2 && hasIdentityOrRev) {
        if (detectedHeaders.length === 0) {
          detectedHeaders = seq;
        }
        seqIndices.forEach(idx => headerLineIndices.add(idx));
        i = j - 1;
        continue;
      } else if (
        singleClass === 'employeeCombined' ||
        singleClass === 'employeeCode' ||
        singleClass === 'employeeName' ||
        singleClass === 'quantity' ||
        singleClass === 'convertedRevenue' ||
        singleClass === 'loanConvertedRevenue' ||
        singleClass === 'revenueShare'
      ) {
        headerLineIndices.add(i);
      }
    }
  }

  const IDENTITY_SET = new Set<StaffHeaderFieldType>([
    'stt',
    'store',
    'employeeCode',
    'employeeName',
    'employeeCombined'
  ]);

  let lastIdentityIdx = -1;
  detectedHeaders.forEach((h, idx) => {
    if (IDENTITY_SET.has(h)) {
      lastIdentityIdx = idx;
    }
  });

  const identityHeaders = lastIdentityIdx !== -1 ? detectedHeaders.slice(0, lastIdentityIdx + 1) : [];
  const metricHeaders = lastIdentityIdx !== -1 ? detectedHeaders.slice(lastIdentityIdx + 1) : detectedHeaders;
  const headerHasSeparateIdAndName =
    identityHeaders.includes('employeeCode') && identityHeaders.includes('employeeName');
  const headerNameBeforeId =
    headerHasSeparateIdAndName &&
    identityHeaders.indexOf('employeeName') < identityHeaders.indexOf('employeeCode');

  // Helper to split a single line into columns
  const splitLineCols = (line: string): string[] => {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim()).filter(c => c.length > 0);
    }
    const multiSpace = line.split(/ {2,}/).map(c => c.trim()).filter(c => c.length > 0);
    if (multiSpace.length >= 2) return multiSpace;

    // Fallback single-space patterns:
    // 1. "12803 - Nguyễn Thị Nhạn 178 649 0 11.2%"
    const m1 = line.match(/^(\d{3,10}\s*[-–—]\s*[^\d\t]+?)\s+(-?[\d,.]+(?:\s+.*)?)$/);
    if (m1) {
      return [m1[1].trim(), ...m1[2].trim().split(/\s+/).filter(Boolean)];
    }
    // 2. "Nguyễn Thị Nhạn - 12803 178 649 0 11.2%"
    const m2 = line.match(/^([^\d\t]+?\s*[-–—]\s*\d{3,10})\s+(-?[\d,.]+(?:\s+.*)?)$/);
    if (m2) {
      return [m2[1].trim(), ...m2[2].trim().split(/\s+/).filter(Boolean)];
    }
    // 3. "[STT] 12803 Nguyễn Thị Nhạn 178 649 0 11.2%" (separate ID and Name separated by single space)
    const m3 = line.match(/^(?:(\d{1,3})\s+)?(\d{3,10})\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ\s'.()-]+?)\s+(-?[\d,.]+(?:\s+.*)?)$/);
    if (m3 && isPureStaffName(m3[3])) {
      const rest = m3[4].trim().split(/\s+/).filter(Boolean);
      return m3[1] ? [m3[1], m3[2], m3[3].trim(), ...rest] : [m3[2], m3[3].trim(), ...rest];
    }

    return [line.trim()];
  };

  const extractStoreFromPrefix = (prefixCols: string[]): string => {
    if (!prefixCols || prefixCols.length === 0) return 'N/A';
    // Skip leading small integer STT column
    let start = 0;
    if (/^\d{1,3}$/.test(prefixCols[0])) {
      start = 1;
    }
    const storeParts = prefixCols.slice(start).filter(Boolean);
    return storeParts.length > 0 ? storeParts.join(' ') : 'N/A';
  };

  // Extract employee identity and metric cells from a multi-column row
  const extractRowIdentity = (
    cols: string[]
  ): { employeeCode: string; employeeName: string; storeName: string; metricCells: string[] } | null => {
    if (!cols || cols.length === 0) return null;

    // 1. Combined "ID - Name" or "Name - ID" in a single column
    for (let i = 0; i < Math.min(cols.length, 4); i++) {
      const comb = matchCombinedStaffCell(cols[i]);
      if (comb) {
        return {
          employeeCode: comb.id,
          employeeName: comb.name,
          storeName: extractStoreFromPrefix(cols.slice(0, i)),
          metricCells: cols.slice(i + 1)
        };
      }
    }

    // 2. Separate "Mã NV" and "Tên nhân viên" columns
    for (let i = 0; i < Math.min(cols.length - 1, 3); i++) {
      const c1 = cols[i];
      const c2 = cols[i + 1];

      if (headerNameBeforeId) {
        if (isPureStaffName(c1) && /^\d{3,10}$/.test(c2)) {
          return {
            employeeCode: c2.trim(),
            employeeName: c1.trim().toUpperCase(),
            storeName: extractStoreFromPrefix(cols.slice(0, i)),
            metricCells: cols.slice(i + 2)
          };
        }
      }

      // Standard: Cột Mã NV (digits) -> Cột Tên nhân viên (letters)
      if (/^\d{3,10}$/.test(c1) && isPureStaffName(c2)) {
        return {
          employeeCode: c1.trim(),
          employeeName: c2.trim().toUpperCase(),
          storeName: extractStoreFromPrefix(cols.slice(0, i)),
          metricCells: cols.slice(i + 2)
        };
      }
    }

    // 3. Name-only column (no employee code column)
    for (let i = 0; i < Math.min(cols.length, 2); i++) {
      if (i === 1 && !/^\d{1,3}$/.test(cols[0])) break;
      if (isPureStaffName(cols[i], true) && cols.length > i + 1) {
        const rest = cols.slice(i + 1);
        if (rest.some(c => parseNullableReportNum(c) !== null || c === '—' || c === '-')) {
          return {
            employeeCode: '',
            employeeName: cols[i].trim().toUpperCase(),
            storeName: extractStoreFromPrefix(cols.slice(0, i)),
            metricCells: rest
          };
        }
      }
    }

    return null;
  };

  // Collect raw employee entries (handling both horizontal rows and vertical BI Web lines)
  const rawEntries: {
    employeeCode: string;
    employeeName: string;
    storeName: string;
    metricCells: string[];
  }[] = [];

  let currentVerticalStaff: {
    employeeCode: string;
    employeeName: string;
    storeName: string;
    metricCells: string[];
  } | null = null;

  const flushVerticalStaff = () => {
    if (currentVerticalStaff && currentVerticalStaff.metricCells.length > 0) {
      rawEntries.push(currentVerticalStaff);
    }
    currentVerticalStaff = null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    if (headerLineIndices.has(i)) continue;
    const line = rawLines[i];
    if (isMetadataOrTotalLine(line)) {
      if (/^tổng/i.test(line.trim())) {
        flushVerticalStaff();
      }
      continue;
    }

    const cols = splitLineCols(line);

    // Case 1: Multi-column line containing both employee identity and metrics
    if (cols.length >= 2) {
      const identity = extractRowIdentity(cols);
      if (identity && identity.metricCells.length > 0) {
        flushVerticalStaff();
        rawEntries.push(identity);
        continue;
      }
      // Subcase: 2 columns where col[0] is Mã NV and col[1] is Tên nhân viên, and metrics are on the next line(s)
      if (identity && identity.metricCells.length === 0) {
        flushVerticalStaff();
        currentVerticalStaff = identity;
        continue;
      }
    }

    // Case 2: Single-column line
    if (cols.length === 1) {
      const single = cols[0];

      // 2a. Combined "ID - Name" or "Name - ID" on its own line
      const comb = matchCombinedStaffCell(single);
      if (comb) {
        flushVerticalStaff();
        currentVerticalStaff = {
          employeeCode: comb.id,
          employeeName: comb.name,
          storeName: 'N/A',
          metricCells: []
        };
        continue;
      }

      // 2b. Standalone Mã NV on line i followed by Tên nhân viên on line i + 1
      if (/^\d{3,10}$/.test(single) && i + 1 < rawLines.length && !headerLineIndices.has(i + 1)) {
        const nextLine = rawLines[i + 1];
        const nextCols = splitLineCols(nextLine);
        if (nextCols.length === 1 && isPureStaffName(nextCols[0])) {
          const canStartNewStaff =
            !currentVerticalStaff ||
            headerHasSeparateIdAndName ||
            (Boolean(currentVerticalStaff.employeeCode) && currentVerticalStaff.metricCells.length >= 2);
          if (canStartNewStaff) {
            flushVerticalStaff();
            currentVerticalStaff = {
              employeeCode: single,
              employeeName: nextCols[0].toUpperCase(),
              storeName: 'N/A',
              metricCells: []
            };
            i++; // Skip the name line we just consumed
            continue;
          }
        } else if (nextCols.length >= 2 && isPureStaffName(nextCols[0])) {
          // Line i is Mã NV, Line i+1 is "Tên nhân viên \t 178 \t 649 \t 0 \t 11.2%"
          flushVerticalStaff();
          rawEntries.push({
            employeeCode: single,
            employeeName: nextCols[0].toUpperCase(),
            storeName: 'N/A',
            metricCells: nextCols.slice(1)
          });
          i++;
          continue;
        }
      }

      // 2c. Standalone pure staff name on its own line
      if (isPureStaffName(single, true)) {
        flushVerticalStaff();
        currentVerticalStaff = {
          employeeCode: '',
          employeeName: single.toUpperCase(),
          storeName: 'N/A',
          metricCells: []
        };
        continue;
      }
    }

    // Case 3: Metric line(s) belonging to currentVerticalStaff
    if (currentVerticalStaff) {
      cols.forEach(c => {
        const parts = c.split(/\t+/).map(p => p.trim()).filter(Boolean);
        currentVerticalStaff!.metricCells.push(...parts);
      });
    }
  }

  flushVerticalStaff();

  // Map each rawEntry's metricCells into structured ParsedStaffReportRow
  const rows: ParsedStaffReportRow[] = [];

  for (const entry of rawEntries) {
    const { employeeCode, employeeName, storeName, metricCells } = entry;
    const displayName = employeeCode
      ? `${employeeCode} - ${employeeName}`
      : employeeName;

    const row: ParsedStaffReportRow = {
      employeeCode,
      employeeName,
      displayName,
      storeName,
      quantity: null,
      actualRevenue: null,
      convertedRevenue: null,
      loanConvertedRevenue: null,
      revenueShare: null,
      target: null,
      targetRate: null,
      avg3Months: null,
      growthRate: null,
      expectedRevenue: null,
      installmentRevenue: null,
      installmentRate: null
    };

    const hasExplicitMetricHeaders =
      metricHeaders.length > 0 &&
      metricHeaders.some(h => h !== 'unknown') &&
      metricCells.length <= metricHeaders.length + 2;

    if (hasExplicitMetricHeaders) {
      const hasBothQdAndThucHeaders =
        metricHeaders.includes('convertedRevenue') && metricHeaders.includes('actualRevenue');

      for (let idx = 0; idx < Math.min(metricHeaders.length, metricCells.length); idx++) {
        const hType = metricHeaders[idx];
        const val = parseNullableReportNum(metricCells[idx]);
        switch (hType) {
          case 'quantity':
            row.quantity = val;
            break;
          case 'convertedRevenue':
            row.convertedRevenue = val;
            break;
          case 'actualRevenue':
            row.actualRevenue = val;
            break;
          case 'loanConvertedRevenue':
            row.loanConvertedRevenue = val;
            break;
          case 'revenueShare':
            row.revenueShare = val;
            break;
          case 'target':
            row.target = val;
            break;
          case 'targetRate':
            row.targetRate = val;
            break;
          case 'avg3Months':
            row.avg3Months = val;
            break;
          case 'growthRate':
            row.growthRate = val;
            break;
          case 'expectedRevenue':
            row.expectedRevenue = val;
            break;
          case 'installmentRevenue':
            row.installmentRevenue = val;
            break;
          case 'installmentRate':
            row.installmentRate = val;
            break;
          default:
            break;
        }
      }

      if (!hasBothQdAndThucHeaders) {
        if (defaultMode === 'qd' && row.convertedRevenue === null && row.actualRevenue !== null) {
          row.convertedRevenue = row.actualRevenue;
        } else if (defaultMode === 'thuc' && row.actualRevenue === null && row.convertedRevenue !== null) {
          row.actualRevenue = row.convertedRevenue;
        } else if (defaultMode === 'auto') {
          if (row.convertedRevenue === null && row.actualRevenue !== null) {
            row.convertedRevenue = row.actualRevenue;
          } else if (row.actualRevenue === null && row.convertedRevenue !== null) {
            row.actualRevenue = row.convertedRevenue;
          }
        }
      }
    } else {
      // Fallback positional mapping when no headers were pasted
      const firstPctIdx = metricCells.findIndex(c => c.includes('%'));

      if (firstPctIdx === 3) {
        // Structure: [0: SỐ LƯỢNG, 1: DOANH THU THỰC / QĐ, 2: DT QĐ KHOẢN VAY, 3: % TỈ TRỌNG, ...]
        row.quantity = parseNullableReportNum(metricCells[0]);
        const mainRev = parseNullableReportNum(metricCells[1]);
        row.loanConvertedRevenue = parseNullableReportNum(metricCells[2]);
        row.revenueShare = parseNullableReportNum(metricCells[3]);

        if (metricCells.length >= 9) {
          // Extended 11+ col report that also has DT QĐ khoản vay
          row.convertedRevenue = mainRev;
          row.actualRevenue = parseNullableReportNum(metricCells[4]);
          row.target = parseNullableReportNum(metricCells[5]);
          row.targetRate = parseNullableReportNum(metricCells[6]);
          row.avg3Months = parseNullableReportNum(metricCells[7]);
          row.growthRate = parseNullableReportNum(metricCells[8]);
          row.expectedRevenue = parseNullableReportNum(metricCells[9]);
          row.installmentRevenue = parseNullableReportNum(metricCells[10]);
          row.installmentRate = parseNullableReportNum(metricCells[11]);
        } else if (defaultMode === 'thuc') {
          row.actualRevenue = mainRev;
        } else if (defaultMode === 'qd') {
          row.convertedRevenue = mainRev;
        } else {
          row.convertedRevenue = mainRev;
          row.actualRevenue = mainRev;
        }
      } else if (firstPctIdx === 2) {
        // Structure: [0: SỐ LƯỢNG, 1: DOANH THU QĐ / THỰC, 2: % TỈ TRỌNG, ...]
        row.quantity = parseNullableReportNum(metricCells[0]);
        const mainRev = parseNullableReportNum(metricCells[1]);
        row.revenueShare = parseNullableReportNum(metricCells[2]);

        if (metricCells.length >= 8) {
          // 11-column BI Web report:
          // [0: SL, 1: DT QĐ, 2: % TỈ TRỌNG, 3: DOANH THU THỰC, 4: TARGET, 5: % HT TARGET, 6: TB 3 THÁNG, 7: % TT, 8: DT DỰ KIẾN, 9: DT TRẢ GÓP, 10: % TRẢ GÓP]
          row.convertedRevenue = mainRev;
          row.actualRevenue = parseNullableReportNum(metricCells[3]);
          row.target = parseNullableReportNum(metricCells[4]);
          row.targetRate = parseNullableReportNum(metricCells[5]);
          row.avg3Months = parseNullableReportNum(metricCells[6]);
          row.growthRate = parseNullableReportNum(metricCells[7]);
          row.expectedRevenue = parseNullableReportNum(metricCells[8]);
          row.installmentRevenue = parseNullableReportNum(metricCells[9]);
          row.installmentRate = parseNullableReportNum(metricCells[10]);
        } else {
          // 5 or 6 column BI Web report: [0: SL, 1: DOANH THU (hoặc DT QĐ), 2: % TỈ TRỌNG, 3: TB 3 THÁNG, 4: % TT]
          if (metricCells.length >= 4) {
            row.avg3Months = parseNullableReportNum(metricCells[3]);
          }
          if (metricCells.length >= 5) {
            row.growthRate = parseNullableReportNum(metricCells[4]);
          }
          if (defaultMode === 'thuc') {
            row.actualRevenue = mainRev;
          } else if (defaultMode === 'qd' || textHasDtqdHeader) {
            row.convertedRevenue = mainRev;
          } else {
            row.actualRevenue = mainRev;
            row.convertedRevenue = mainRev;
          }
        }
      } else if (firstPctIdx === 1) {
        // 2-column metric table: [0: DOANH THU, 1: % TỈ TRỌNG]
        const mainRev = parseNullableReportNum(metricCells[0]);
        row.revenueShare = parseNullableReportNum(metricCells[1]);
        if (defaultMode === 'thuc') {
          row.actualRevenue = mainRev;
        } else if (defaultMode === 'qd') {
          row.convertedRevenue = mainRev;
        } else {
          row.actualRevenue = mainRev;
          row.convertedRevenue = mainRev;
        }
      } else if (defaultMode !== 'thuc' && metricCells.length === 7 && firstPctIdx === -1) {
        // 7-column competition report: todayTarget, todayActual, todayRate, accTarget, accActual, forecast, accRate
        const n0 = parseNullableReportNum(metricCells[0]) ?? 0;
        const n1 = parseNullableReportNum(metricCells[1]) ?? 0;
        const n2 = parseNullableReportNum(metricCells[2]) ?? 0;
        const n3 = parseNullableReportNum(metricCells[3]) ?? 0;
        const n4 = parseNullableReportNum(metricCells[4]) ?? 0;
        const n5 = parseNullableReportNum(metricCells[5]) ?? 0;
        const n6 = parseNullableReportNum(metricCells[6]) ?? 0;
        row.is7ColCompetition = true;
        row.todayTarget = n0;
        row.todayActual = n1;
        row.todayRate = n2;
        row.accTarget = n3;
        row.accActual = n4;
        row.forecast = n5;
        row.accRate = n6;
        row.actualRevenue = n4;
        row.convertedRevenue = n5;
        row.target = n3;
        row.targetRate = n6;
      } else if (metricCells.length >= 2) {
        // Standard headerless without %: [0: SỐ LƯỢNG, 1: DOANH THU THỰC / QĐ, 2?: DT QĐ KHOẢN VAY]
        row.quantity = parseNullableReportNum(metricCells[0]);
        const mainRev = parseNullableReportNum(metricCells[1]);
        if (metricCells.length >= 3) {
          row.loanConvertedRevenue = parseNullableReportNum(metricCells[2]);
        }
        if (defaultMode === 'thuc') {
          row.actualRevenue = mainRev;
        } else if (defaultMode === 'qd') {
          row.convertedRevenue = mainRev;
        } else {
          row.actualRevenue = mainRev;
          row.convertedRevenue = mainRev;
        }
      } else if (metricCells.length === 1) {
        const mainRev = parseNullableReportNum(metricCells[0]);
        if (defaultMode === 'thuc') {
          row.actualRevenue = mainRev;
        } else if (defaultMode === 'qd') {
          row.convertedRevenue = mainRev;
        } else {
          row.actualRevenue = mainRev;
          row.convertedRevenue = mainRev;
        }
      }
    }

    rows.push(row);
  }

  return rows;
};

export const extractStaffRevFromReport = (
  text: string
): Map<
  string,
  {
    id: string;
    name: string;
    revenue: number;
    quantity?: number | null;
    loanConvertedRevenue?: number | null;
    revenueShare?: number | null;
  }
> => {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      revenue: number;
      quantity?: number | null;
      loanConvertedRevenue?: number | null;
      revenueShare?: number | null;
    }
  >();
  if (!text || !text.trim()) return map;

  const norm = (str: string) =>
    removeAccents(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const parsedRows = parseStaffReportRows(text, 'thuc');

  for (const row of parsedRows) {
    const rev = row.actualRevenue !== null ? row.actualRevenue : row.convertedRevenue;
    if (rev === null || rev === undefined || isNaN(rev)) continue;

    const id = (row.employeeCode || '').trim();
    const name = (row.employeeName || '').trim().toUpperCase();
    if (!id && !name) continue;

    const entry = {
      id,
      name,
      revenue: rev,
      quantity: row.quantity,
      loanConvertedRevenue: row.loanConvertedRevenue,
      revenueShare: row.revenueShare
    };

    if (id) {
      map.set(id, entry);
      const cleanDigits = id.replace(/\D/g, '');
      if (cleanDigits) map.set(cleanDigits, entry);
    }
    if (name && !map.has(name)) {
      map.set(name, entry);
    }
    const normName = norm(name);
    if (normName && !map.has(normName)) {
      map.set(normName, entry);
    }
  }

  return map;
};

export const parseStaffRankData = (input: string, inputThuc?: string, storeKey?: string): StaffData[] => {
  const val = (input || '').trim();
  if (!val) return [];

  const parsedRows = parseStaffReportRows(val, 'qd');
  const staffMap = new Map<string, StaffData>();

  const norm = (str: string) =>
    removeAccents(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  for (const row of parsedRows) {
    const id = (row.employeeCode || '').trim();
    const fullName = (row.employeeName || '').trim().toUpperCase();
    if (!id && !fullName) continue;

    const staffKey = id || norm(fullName);
    const displayName = id && fullName ? `${id} - ${fullName}` : (fullName || id);

    if (row.is7ColCompetition) {
      const todayTarget = row.todayTarget ?? 0;
      const todayActual = row.todayActual ?? 0;
      const todayRate = row.todayRate ?? 0;
      const accTarget = row.accTarget ?? 0;
      const accActual = row.accActual ?? 0;
      const forecast = row.forecast ?? 0;
      const accRate = row.accRate ?? 0;

      if (staffMap.has(staffKey)) {
        const existing = staffMap.get(staffKey)!;
        existing.actualVal = (existing.actualVal || 0) + accActual;
        existing.virtualVal += forecast;
        existing.target = (existing.target || 0) + accTarget;
        existing.todayTarget = (existing.todayTarget || 0) + todayTarget;
        existing.todayActual = (existing.todayActual || 0) + todayActual;
        existing.accTarget = (existing.accTarget || 0) + accTarget;
        existing.accActual = (existing.accActual || 0) + accActual;
        existing.forecast = (existing.forecast || 0) + forecast;

        existing.effVal =
          (existing.target || 0) > 0
            ? Math.round(((existing.actualVal || 0) / (existing.target || 1)) * 100)
            : 0;
        existing.rate = existing.effVal;
        existing.todayRate =
          existing.todayTarget! > 0
            ? Math.round((existing.todayActual! / existing.todayTarget!) * 100)
            : 0;
        existing.accRate =
          existing.accTarget! > 0
            ? Math.round((existing.accActual! / existing.accTarget!) * 100)
            : 0;
      } else {
        staffMap.set(staffKey, {
          displayName,
          fullId: id || staffKey,
          employeeName: fullName,
          department: 'N/A',
          storeName: row.storeName || 'N/A',
          quantity: row.quantity,
          actualVal: accActual,
          virtualVal: forecast,
          loanConvertedVal: row.loanConvertedRevenue,
          revenueShare: row.revenueShare,
          effVal: accRate,
          target: accTarget,
          rate: accRate,
          todayTarget,
          todayActual,
          todayRate,
          accTarget,
          accActual,
          forecast,
          accRate
        });
      }
      continue;
    }

    const dtqd = row.convertedRevenue !== null ? row.convertedRevenue : (row.actualRevenue ?? 0);
    const dtThuc = row.actualRevenue !== null ? row.actualRevenue : dtqd;
    const effVal = dtThuc > 0 ? Math.round(((dtqd - dtThuc) / dtThuc) * 100 * 10) / 10 : 0;

    if (!staffMap.has(staffKey)) {
      staffMap.set(staffKey, {
        displayName,
        fullId: id || staffKey,
        employeeName: fullName,
        department: 'N/A',
        storeName: row.storeName || 'N/A',
        quantity: row.quantity,
        actualVal: dtThuc,
        virtualVal: dtqd,
        loanConvertedVal: row.loanConvertedRevenue,
        revenueShare: row.revenueShare,
        effVal,
        target: row.target ?? 0,
        rate: row.targetRate ?? effVal
      });
    } else {
      const existing = staffMap.get(staffKey)!;
      if (row.convertedRevenue !== null) existing.virtualVal = dtqd;
      if (row.actualRevenue !== null) existing.actualVal = dtThuc;
      if (row.quantity !== null) existing.quantity = row.quantity;
      if (row.loanConvertedRevenue !== null) existing.loanConvertedVal = row.loanConvertedRevenue;
      if (row.revenueShare !== null) existing.revenueShare = row.revenueShare;
      if (effVal !== 0) existing.effVal = effVal;
    }
  }

  // Map với Doanh Thu Thực từ ô "D.THU THỰC NHÂN VIÊN" theo đúng Mã nhân viên (ưu tiên tuyệt đối Mã NV)
  const thucText = inputThuc !== undefined && inputThuc.trim() !== ''
    ? inputThuc
    : getStoredStaffThucInput(storeKey);

  if (thucText && thucText.trim()) {
    const thucMap = extractStaffRevFromReport(thucText);
    if (thucMap.size > 0) {
      for (const staff of staffMap.values()) {
        const cleanId = (staff.fullId || '').replace(/\D/g, '');
        const pureStaffName = norm(
          staff.employeeName || (staff.displayName.split(/[-–—]/).slice(1).join(' ') || staff.displayName)
        );

        let matchThuc = (cleanId ? thucMap.get(cleanId) : undefined) || thucMap.get(staff.fullId);
        if (!matchThuc) {
          for (const item of thucMap.values()) {
            const itemCleanId = (item.id || '').replace(/\D/g, '');
            if (cleanId && itemCleanId) {
              if (cleanId === itemCleanId) {
                matchThuc = item;
                break;
              }
              // Both have employee codes and they are different -> NEVER match by name!
              continue;
            }
            // Fallback to exact normalized name only when one side lacks an employee code
            const itemNorm = norm(item.name);
            if (pureStaffName && itemNorm && pureStaffName === itemNorm) {
              matchThuc = item;
              break;
            }
          }
        }

        if (matchThuc && matchThuc.revenue !== null && matchThuc.revenue !== undefined && !isNaN(matchThuc.revenue)) {
          const vRaw = staff.virtualVal || 0;
          const aRaw = matchThuc.revenue;
          if (Math.abs(vRaw) <= 1000000 && Math.abs(aRaw) > 1000000) {
            staff.actualVal = Math.round(aRaw / 1000000);
          } else if (Math.abs(vRaw) > 1000000 && Math.abs(aRaw) <= 1000000 && aRaw !== 0) {
            staff.actualVal = aRaw * 1000000;
          } else {
            staff.actualVal = aRaw;
          }

          const vNorm = Math.abs(vRaw) > 1000000 ? vRaw : vRaw * 1000000;
          const aNorm = Math.abs(aRaw) > 1000000 ? aRaw : aRaw * 1000000;

          staff.effVal =
            aNorm > 0
              ? Math.round(((vNorm - aNorm) / aNorm) * 1000) / 10
              : 0;
          staff.rate = staff.effVal;
        }
      }
    }
  }

  return Array.from(staffMap.values());
};

export const parseStaffMatrixData = (input: string, staffCount: number, categoryTargets: CategoryData[], daysPassed: number, totalDays: number): StaffMatrixData[] => {
  const val = input.trim();
  if (!val || !staffCount || categoryTargets.length === 0) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // 1. Tìm dòng tiêu đề (Header)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('nhân viên') || l.includes('họ tên') || l.includes('tên nv') || l.includes('mã nv') || l.includes('phòng ban')) {
      headerIdx = i;
      break;
    }
  }

  let headerCategories: string[] = [];
  let staffColIdxInHeader = -1;
  
  const splitLine = (l: string) => {
    if (l.includes('\t')) {
      // Preserve empty columns to maintain alignment with category headers
      return l.split('\t').map(p => p.trim());
    }
    return l.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  };

  if (headerIdx !== -1) {
    const headerParts = splitLine(lines[headerIdx]);
    staffColIdxInHeader = headerParts.findIndex(p => 
      p.toLowerCase().includes('nhân viên') || 
      p.toLowerCase().includes('họ tên') || 
      p.toLowerCase().includes('tên nv') ||
      p.toLowerCase().includes('mã nv') ||
      p.toLowerCase().includes('phòng ban')
    );
    if (staffColIdxInHeader !== -1) {
      headerCategories = headerParts.slice(staffColIdxInHeader + 1);
    }
  }

  const results: StaffMatrixData[] = [];
  const targetPerStaffPerCat: Record<string, number> = {};
  categoryTargets.forEach(cat => { targetPerStaffPerCat[cat.name] = cat.target / staffCount; });
  
  // 2. Xử lý từng dòng dữ liệu
  const dataLines = headerIdx !== -1 ? lines.slice(headerIdx + 1) : lines;
  
  dataLines.forEach(line => {
    // Tìm ID nhân viên (6 chữ số)
    const idMatch = line.match(/\b\d{6}\b/);
    if (!idMatch) return;
    const id = idMatch[0];

    // Tách cột
    const dataParts = splitLine(line);
    
    // Tìm vị trí cột nhân viên trong dòng này
    const currentStaffIdx = dataParts.findIndex(p => p.includes(id));
    
    if (currentStaffIdx !== -1) {
      const fullNameCell = dataParts[currentStaffIdx];
      // Trích xuất tên (loại bỏ ID nếu có trong cell)
      const nameOnly = fullNameCell.replace(id, '').replace(/[-_ ]+$/, '').replace(/^[-_ ]+/, '').trim();
      
      const rawValuesAfterStaff = dataParts.slice(currentStaffIdx + 1);
      const mappedValues: number[] = new Array(categoryTargets.length).fill(0);
      
      categoryTargets.forEach((cat, catIdx) => {
        if (headerCategories.length > 0) {
          const cleanCatName = cat.name.split(/ - (DTLK|SLLK)/)[0].toLowerCase().trim();
          
          const hIdx = headerCategories.findIndex(hc => {
            const cleanHeader = hc.toLowerCase().trim();
            const targetName = cat.name.toLowerCase().trim();
            
            if (!cleanHeader) return false;

            // Ưu tiên khớp chính xác
            if (cleanHeader === targetName) return true;
            if (cleanHeader === cleanCatName) return true;
            
            // Khớp chứa (chỉ khi đủ dài để tránh nhầm)
            if (cleanHeader.length >= 3 && cleanCatName.length >= 3) {
              if (cleanHeader.includes(cleanCatName) || cleanCatName.includes(cleanHeader)) return true;
            }
            return false;
          });

          if (hIdx !== -1 && rawValuesAfterStaff[hIdx] !== undefined) {
            const valStr = rawValuesAfterStaff[hIdx].replace(/,/g, '');
            const val = parseFloat(valStr);
            mappedValues[catIdx] = isNaN(val) ? 0 : val;
          } else if (headerCategories.length === 0 && rawValuesAfterStaff[catIdx] !== undefined) {
            // Fallback to positional mapping if no headers found
            const valStr = rawValuesAfterStaff[catIdx].replace(/,/g, '');
            const val = parseFloat(valStr);
            mappedValues[catIdx] = isNaN(val) ? 0 : val;
          }
        }
      });

      let achieved = 0;
      const projectedRates: number[] = [];

      for (let i = 0; i < categoryTargets.length; i++) {
        const catName = categoryTargets[i].name;
        const target = targetPerStaffPerCat[catName];
        let projectedRate = 0;
        
        if (target > 0 && daysPassed > 0) {
          projectedRate = ((mappedValues[i] / daysPassed) * totalDays) / target * 100;
        }
        
        projectedRates.push(projectedRate);
        if (projectedRate >= 100) achieved++;
      }

      results.push({ 
        displayName: `${id} - ${(nameOnly.split(' ').pop() || nameOnly).toUpperCase()}`, 
        fullId: id, 
        achieved, 
        totalCats: categoryTargets.length, 
        rate: (achieved / categoryTargets.length) * 100,
        rawValues: mappedValues,
        projectedRates
      });
    }
  });
  
  return results.sort((a, b) => b.rate - a.rate);
};

export const CONVERSION_RATES: Record<string, { normal: number, installment: number }> = {
  '664 - sim online': { normal: 5.45, installment: 5.75 },
  'sim online': { normal: 5.45, installment: 5.75 },
  'sim': { normal: 5.45, installment: 5.75 },
  'bảo hiểm': { normal: 4.18, installment: 4.48 },
  '1994 - dịch vụ bảo hành, bảo dưỡng điện máy xanh': { normal: 4.18, installment: 4.48 },
  'dịch vụ bảo hành, bảo dưỡng điện máy xanh': { normal: 4.18, installment: 4.48 },
  '16 - phụ kiện tiện ích': { normal: 3.37, installment: 3.67 },
  'phụ kiện tiện ích': { normal: 3.37, installment: 3.67 },
  '184 - phụ kiện trang trí': { normal: 3.37, installment: 3.67 },
  'phụ kiện trang trí': { normal: 3.37, installment: 3.67 },
  '1394 - phụ kiện lắp đặt': { normal: 3.37, installment: 3.67 },
  'phụ kiện lắp đặt': { normal: 3.37, installment: 3.67 },
  '2831 - phụ kiện trang trí apple': { normal: 3.37, installment: 3.67 },
  'phụ kiện trang trí apple': { normal: 3.37, installment: 3.67 },
  '4659 - phụ kiện tiện ích apple': { normal: 3.37, installment: 3.67 },
  'phụ kiện tiện ích apple': { normal: 3.37, installment: 3.67 },
  '6400 - phụ kiện tiện ích apple - imei': { normal: 3.37, installment: 3.67 },
  'phụ kiện tiện ích apple - imei': { normal: 3.37, installment: 3.67 },
  '764 - loa vi tính': { normal: 3.37, installment: 3.67 },
  'loa vi tính': { normal: 3.37, installment: 3.67 },
  'vas': { normal: 3.30, installment: 3.60 },
  '1274 - đồng hồ thời trang': { normal: 3.00, installment: 3.30 },
  'đồng hồ thời trang': { normal: 3.00, installment: 3.30 },
  '23 - wearable': { normal: 3.00, installment: 3.30 },
  'wearable': { normal: 3.00, installment: 3.30 },
  '364 - it': { normal: 2.00, installment: 2.30 },
  'it': { normal: 2.00, installment: 2.30 },
  '1034 - dụng cụ nhà bếp': { normal: 1.92, installment: 2.22 },
  'dụng cụ nhà bếp': { normal: 1.92, installment: 2.22 },
  'dcnb': { normal: 1.92, installment: 2.22 },
  'vieon': { normal: 5.45, installment: 5.75 },
  '571 - uddđ': { normal: 5.45, installment: 5.75 },
  'uddđ': { normal: 5.45, installment: 5.75 },
  '484 - điện gia dụng': { normal: 1.85, installment: 2.15 },
  'điện gia dụng': { normal: 1.85, installment: 2.15 },
  '1116 - máy lọc nước': { normal: 1.85, installment: 2.15 },
  'máy lọc nước': { normal: 1.85, installment: 2.15 },
  '1214 - gia dụng lắp đặt': { normal: 1.85, installment: 2.15 },
  'gia dụng lắp đặt': { normal: 1.85, installment: 2.15 },
  '880 - loa karaoke': { normal: 1.29, installment: 1.59 },
  'loa karaoke': { normal: 1.29, installment: 1.59 },
  '22 - laptop': { normal: 1.20, installment: 1.50 },
  'laptop': { normal: 1.20, installment: 1.50 },
  '244 - tablet': { normal: 1.20, installment: 1.50 },
  'tablet': { normal: 1.20, installment: 1.50 },
};

export const getRowConversionRate = (
  columnAO: string,
  rowString: string,
  isInstallment: boolean,
  ratesToUse: Record<string, { normal: number, installment: number }>
): { rate: number; matchedCat: string } => {
  let maxRate = 1;
  let matchedCat = "Khác";

  const catLower = columnAO.toLowerCase().trim();
  
  // Special check for category 1841, 1994 or general/insurance categories
  if (catLower.includes('1841') || catLower.includes('1994') || catLower.includes('khác') || catLower.includes('khac') || catLower.includes('bảo hiểm') || catLower.includes('bao hiem') || !catLower) {
    const rowStrLower = rowString.toLowerCase();
    const hasInsuranceKeyword = 
      rowStrLower.includes('1 đổi 1') || rowStrLower.includes('1 doi 1') ||
      rowStrLower.includes('khoản vay') || rowStrLower.includes('khoan vay') || rowStrLower.includes('bhkv') ||
      rowStrLower.includes('mở rộng') || rowStrLower.includes('mo rong') || rowStrLower.includes('bhmr') ||
      rowStrLower.includes('rơi vỡ') || rowStrLower.includes('roi vo') || rowStrLower.includes('bhrv') ||
      rowStrLower.includes('sc+') ||
      rowStrLower.includes('xe máy') || rowStrLower.includes('xe may') || rowStrLower.includes('bhxm') ||
      rowStrLower.includes('bảo hiểm') || rowStrLower.includes('bao hiem') ||
      catLower.includes('1994') || rowStrLower.includes('1994') ||
      rowStrLower.includes('bảo hành') || rowStrLower.includes('bảo dưỡng') ||
      rowStrLower.includes('bao hanh') || rowStrLower.includes('bao duong');
    
    if (hasInsuranceKeyword) {
      const rates = ratesToUse['bảo hiểm'] || { normal: 4.18, installment: 4.48 };
      return {
        rate: isInstallment ? rates.installment : rates.normal,
        matchedCat: 'bảo hiểm'
      };
    }
  }
  
  for (const [cat, rates] of Object.entries(ratesToUse)) {
    // 1. Try exact or substring match on the category column (AO) first
    // This is 100% accurate and prevents cross-category false matches.
    if (catLower && (catLower === cat || catLower.includes(cat) || cat.includes(catLower))) {
      // Avoid short substring matches on category column unless they are exact (like 'it')
      if (cat === 'it' && catLower !== 'it' && catLower !== '364 - it') {
        continue;
      }
      const rate = isInstallment ? rates.installment : rates.normal;
      if (rate > maxRate) {
        maxRate = rate;
        matchedCat = cat;
      }
    }
  }

  // 2. Fallback to rowString if no match found on category column
  if (matchedCat === "Khác") {
    for (const [cat, rates] of Object.entries(ratesToUse)) {
      if (cat === 'it') {
        if (!rowString.includes('364 - it') && !rowString.includes(' 364 - it') && rowString !== 'it') {
          continue;
        }
      }
      if (cat === 'sim' && !rowString.includes('664 - sim') && !rowString.includes('sim online')) {
        if (!/\bsim\b/.test(rowString)) {
          continue;
        }
      }
      
      if (rowString.includes(cat)) {
        const rate = isInstallment ? rates.installment : rates.normal;
        if (rate > maxRate) {
          maxRate = rate;
          matchedCat = cat;
        }
      }
    }
  }

  return { rate: maxRate, matchedCat };
};


export const fetchConversionRates = async (): Promise<Record<string, { normal: number, installment: number }>> => {
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1TVwVom8viDUQvaumJl91QT8wg7AOZpqchoV71lges5U/export?format=csv';
  // Use a CORS proxy to avoid "Failed to fetch" errors in the browser
  const PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(SHEET_URL)}`;
  
  try {
    const response = await fetch(PROXY_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const newRates: Record<string, { normal: number, installment: number }> = {};
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex to split by comma outside quotes
      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const cols = line.split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 2) {
        const category = cols[0].toLowerCase();
        let rateStr = cols[1];
        if (cols.length >= 3 && !rateStr.includes('%') && !isNaN(parseFloat(cols[2]))) {
           rateStr = cols[2];
        }
        // Remove % sign and convert to multiplier (e.g. 185% -> 1.85)
        rateStr = rateStr.replace('%', '').trim();
        let rate = parseFloat(rateStr);
        if (!isNaN(rate)) {
          if (rate > 10) rate = rate / 100; // If they entered 185 instead of 1.85
          newRates[category] = {
            normal: rate,
            installment: rate + 0.3 // Keeping the +0.3 logic for installment
          };
        }
      }
    }
    
    if (Object.keys(newRates).length > 0) {
      return newRates;
    }
    return CONVERSION_RATES;
  } catch (error) {
    // Silently fallback to default rates to avoid console spam
    return CONVERSION_RATES;
  }
};

export const minifyYcxData = (data: string): string => {
  if (!data) return data;
  let rows: string[][] = [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) rows = parsed;
    else rows = data.split('\n').map(line => line.split('\t'));
  } catch (e) {
    rows = data.split('\n').map(line => line.split('\t'));
  }

  if (rows.length < 2) return data;

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (rows[i] && rows[i].some(cell => {
      const c = String(cell).toLowerCase();
      return c.includes('người tạo') || c.includes('nhân viên') || c.includes('phải thu') || c.includes('loại ycx') || c.includes('trạng thái xuất');
    })) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return data; // Cannot safely minify without header

  const header = rows[headerIdx].map(c => String(c || '').toLowerCase().trim());
  const getIdx = (names: string[]) => {
    const lowerNames = names.map(n => n.toLowerCase());
    for (const name of lowerNames) {
      const exactIdx = header.findIndex(h => h === name);
      if (exactIdx !== -1) return exactIdx;
      
      const partialIdx = header.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        const normName = removeAccents(name).toLowerCase();
        if (normName === 'nhom hang' && norm.includes('nho')) return false;
        if (normName === 'nganh hang' && norm.includes('lon')) return false;
        if (norm.includes('giao')) return false;
        return norm.includes(normName);
      });
      if (partialIdx !== -1) return partialIdx;
    }
    return -1;
  };

  const idxType = getIdx(['loại ycx', 'loại yêu cầu']);
  const idxMethod = getIdx(['hình thức xuất']);
  const idxStatus = getIdx(['trạng thái xuất', 'trạng thái ycx', 'trạng thái', 'tình trạng xuất', 'tình trạng đơn', 'trạng thái đơn', 'tình trạng']);
  const idxStaffName = getIdx(['người tạo', 'user tạo', 'tên người tạo', 'mã/tên người tạo', 'tên nhân viên bán hàng', 'nhân viên bán hàng', 'user bán hàng', 'nv bán hàng', 'tên nhân viên', 'tên nv', 'nhân viên', 'người bán', 'người lập', 'user lập', 'nv tạo', 'người thực hiện']); 
  const idxStaffId = getIdx(['user tạo', 'mã nv', 'mã nhân viên', 'id nhân viên']);
  // 1. Cột Giá bán = cột AK (index 36)
  const idxRevenue = (() => {
    const giaBanIdx = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
      return norm === 'gia ban' || norm === 'giaban' || norm === 'gia ban_1' || norm === 'gia ban 1' || (norm.includes('gia ban') && !norm.includes('2'));
    });
    if (giaBanIdx !== -1) return giaBanIdx;
    return getIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'số tiền', 'tổng cộng', 'tiền']);
  })();

  // 2. Cột Giá bán 2 = cột AL (index 37)
  const idxGiaBan2 = header.findIndex(h => {
    const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
    return norm === 'gia ban_2' || norm === 'gia ban 2' || norm === 'giaban_2' || norm === 'giaban 2' || (norm.includes('gia ban') && norm.includes('2'));
  });

  // 3. Cột Ngành hàng = cột AN (index 39)
  const idxNganhHang = (() => {
    const exact = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'nganh hang' || norm === 'nganh hang lon';
    });
    if (exact !== -1) return exact;
    return header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return (norm.includes('nganh hang') && !norm.includes('lon')) || norm.includes('nhom nganh hang');
    });
  })();

  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxQty = getIdx(['số lượng', 'sl', 'quantity']);
  const idxMarket = getIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm', 'kho', 'cửa hàng']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'nhóm']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng', 'tình trạng nhập trả', 'nhập trả']);

  const colType = idxType !== -1 ? idxType : 3;
  const colMethod = idxMethod !== -1 ? idxMethod : 3;
  const colStatus = idxStatus;
  const colStaffName = idxStaffName !== -1 ? idxStaffName : 23;
  const colStaffId = idxStaffId !== -1 ? idxStaffId : 22;
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 36; // Cột AK (Index 36)
  const colGiaBan2 = idxGiaBan2 !== -1 ? idxGiaBan2 : 37; // Cột AL (Index 37)
  const colNganhHang = idxNganhHang !== -1 ? idxNganhHang : 39; // Cột AN (Index 39)
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colQty = idxQty !== -1 ? idxQty : 35;
  const colMarket = idxMarket !== -1 ? idxMarket : 1;
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40; // Cột AO (Index 40)
  const colReturnStatus = idxReturnStatus;

  const idxMaYcx = getIdx(['mã ycx', 'mã đơn', 'mã đơn hàng', 'mã phiếu', 'số phiếu', 'ycx']);
  const idxNgayTao = getIdx(['ngày tạo', 'thời gian tạo', 'ngày xuất', 'thời gian xuất']);
  const idxKhachHang = getIdx(['tên khách hàng', 'khách hàng', 'người mua', 'tên kh']);
  const idxDienThoai = getIdx(['điện thoại', 'sđt', 'sdt']);

  // Thêm các cột phục vụ cho filter (tránh bị filter empty do null out data)
  const idxSmallCat = getIdx(['nhóm hàng nhỏ', 'tên nhóm nhỏ', 'nhóm nhỏ']);
  const idxProductCode = getIdx(['mã sản phẩm', 'mã hàng', 'mã sp']);
  const idxNhaSanXuat = getIdx(['nhà sản xuất', 'nha san xuat', 'nhà sx', 'nha sx', 'hãng sản xuất', 'hãng sx', 'brand']);
  const idxThuTien = getIdx(['trạng thái thu tiền', 'thu tiền']);
  
  // Các cột phục vụ tính toán YCX Mới
  const idxDtqdCol = getIdx(['doanh thu qđ', 'doanh thu qd', 'dt qd', 'dt quy doi']);
  const idxDtThucCol = getIdx(['doanh thu (-r)']);
  const idxImei = getIdx(['imei', 'so imei', 'seri', 'serial']);
  const idxCtkm = getIdx(['ctkm', 'khuyen mai', 'chuong trinh khuyen mai', 'ctkm_1']);

  const colMaYcx = idxMaYcx !== -1 ? idxMaYcx : 0;
  const colNgayTao = idxNgayTao !== -1 ? idxNgayTao : 2;
  const colKhachHang = idxKhachHang !== -1 ? idxKhachHang : 16;
  const colDienThoai = idxDienThoai !== -1 ? idxDienThoai : 17;

  // Lọc ra danh sách các cột thực sự cần thiết cho hệ thống tính toán & hiển thị
  const essentialCols = [
    colType, colMethod, colStatus, colStaffName, colStaffId,
    colRevenue, colGiaBan2, colNganhHang, colProduct, colQty, colMarket, colColumnAO, colReturnStatus,
    colMaYcx, colNgayTao,
    idxSmallCat, idxProductCode, idxNhaSanXuat, idxThuTien,
    idxDtqdCol, idxDtThucCol, idxImei, idxCtkm,
    35, 36, 37, 38, 39, 40 // Cố định giữ các cột: AJ (IMEI), AK (GIÁ BÁN), AL (GIÁ BÁN_2), AM (CTKM), AN (NGÀNH HÀNG), AO (NHÓM HÀNG)
  ];
  const keepIndices = new Set(essentialCols.filter(i => i !== -1 && i !== undefined));
  const maxKeepIdx = Math.max(40, ...Array.from(keepIndices));

  const validRows = [];
  // Giữ nguyên dòng tiêu đề (Header) và các dòng bên trên
  for (let i = 0; i <= headerIdx; i++) {
    validRows.push(rows[i].slice(0, maxKeepIdx + 1));
  }

  // Tối ưu siêu mạnh: XOÁ TRẮNG (null out) nội dung của các cột KHÔNG QUAN TRỌNG
  // và cắt bỏ toàn bộ các cột thừa phía sau maxKeepIdx để giảm kích thước payload tối đa
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 3) continue;
    validRows.push(cols.slice(0, maxKeepIdx + 1).map((val, idx) => keepIndices.has(idx) ? val : ''));
  }

  try {
    return validRows.map(r => r.join('\t')).join('\n');
  } catch (e) {
    return data;
  }
};

export const getQuyDoiMultiplier = (
  nganhVal: string,
  nhomVal: string,
  quyDoiRules?: any[]
): number => {
  if (!quyDoiRules || !Array.isArray(quyDoiRules) || quyDoiRules.length === 0) {
    return 1.0;
  }

  const clean = (s: string) => {
    return removeAccents(String(s || '').toLowerCase())
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanNganh = clean(nganhVal);
  const cleanNhom = clean(nhomVal);

  if (!cleanNganh && !cleanNhom) {
    return 1.0;
  }

  // 1. Match both NganhHang and NhomHang
  let matchedRule = quyDoiRules.find(r => {
    const rNganh = clean(r.nganhHang);
    const rNhom = clean(r.nhomHang);
    if (!rNganh || !rNhom || rNhom === 'tat ca nhom hang') return false;
    
    const nganhMatches = cleanNganh === rNganh || cleanNganh.includes(rNganh) || rNganh.includes(cleanNganh);
    const nhomMatches = cleanNhom === rNhom || cleanNhom.includes(rNhom) || rNhom.includes(cleanNhom);
    return nganhMatches && nhomMatches;
  });

  // 2. Match only NganhHang
  if (!matchedRule) {
    matchedRule = quyDoiRules.find(r => {
      const rNganh = clean(r.nganhHang);
      const rNhom = clean(r.nhomHang);
      if (!rNganh) return false;
      if (rNhom && rNhom !== 'tat ca nhom hang') return false;
      
      return cleanNganh === rNganh || cleanNganh.includes(rNganh) || rNganh.includes(cleanNganh);
    });
  }

  // 3. Match only NhomHang
  if (!matchedRule) {
    matchedRule = quyDoiRules.find(r => {
      const rNganh = clean(r.nganhHang);
      const rNhom = clean(r.nhomHang);
      if (!rNhom || rNhom === 'tat ca nhom hang') return false;
      if (rNganh && rNganh !== 'tat ca nganh hang') return false;

      return cleanNhom === rNhom || cleanNhom.includes(rNhom) || rNhom.includes(cleanNhom);
    });
  }

  if (matchedRule) {
    const rawHeSo = Number(matchedRule.heSo);
    return isNaN(rawHeSo) ? 1.0 : rawHeSo / 100;
  }

  return 1.0;
};

export const parseYcxData = (data: string, customQuyDoiRules?: any[]): YcxStaffData[] => {
  if (!data) return [];
  
  let rules = Array.isArray(customQuyDoiRules) ? customQuyDoiRules : undefined;
  if (!rules) {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('crm_quy_doi_rules');
        if (cached) rules = JSON.parse(cached);
      }
    } catch (e) {
      console.error(e);
    }
  }

  let rows: any[][] = [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else {
      rows = data.split('\n').map(line => line.split('\t'));
    }
  } catch (e) {
    rows = data.split('\n').map(line => line.split('\t'));
  }

  if (rows.length < 2) return [];

  // Tìm dòng tiêu đề và map các cột
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (row && row.some(cell => {
      const c = String(cell).toLowerCase();
      return c.includes('người tạo') || c.includes('nhân viên') || c.includes('phải thu') || c.includes('loại ycx') || c.includes('trạng thái xuất');
    })) {
      headerIdx = i;
      break;
    }
  }

  const header = headerIdx !== -1 ? rows[headerIdx].map(c => String(c || '').toLowerCase().trim()) : [];
  const getIdx = (names: string[]) => {
    const lowerNames = names.map(n => n.toLowerCase());
    for (const name of lowerNames) {
      const exactIdx = header.findIndex(h => h === name);
      if (exactIdx !== -1) return exactIdx;
      
      const partialIdx = header.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        const normName = removeAccents(name).toLowerCase();
        if (normName === 'nhom hang' && norm.includes('nho')) return false;
        if (normName === 'nganh hang' && norm.includes('lon')) return false;
        return norm.includes(normName);
      });
      if (partialIdx !== -1) return partialIdx;
    }
    return -1;
  };

  const idxType = getIdx(['loại ycx', 'loại yêu cầu']);
  const idxMethod = getIdx(['hình thức xuất']);
  const idxStatus = getIdx(['trạng thái xuất', 'trạng thái ycx', 'trạng thái', 'tình trạng xuất', 'tình trạng đơn', 'trạng thái đơn', 'tình trạng']);
  const idxStaffName = getIdx(['người tạo', 'user tạo', 'tên người tạo', 'mã/tên người tạo', 'tên nhân viên bán hàng', 'nhân viên bán hàng', 'user bán hàng', 'nv bán hàng', 'tên nhân viên', 'tên nv', 'nhân viên', 'người bán', 'người lập', 'user lập', 'nv tạo', 'người thực hiện']); 
  // 1. Cột Giá bán = cột AK (index 36)
  const idxRevenue = (() => {
    const giaBanIdx = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
      return norm === 'gia ban' || norm === 'giaban' || norm === 'gia ban_1' || norm === 'gia ban 1' || (norm.includes('gia ban') && !norm.includes('2'));
    });
    if (giaBanIdx !== -1) return giaBanIdx;
    return getIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'số tiền', 'tổng cộng', 'tiền']);
  })();

  // 2. Cột Giá bán 2 = cột AL (index 37)
  const idxGiaBan2 = header.findIndex(h => {
    const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
    return norm === 'gia ban_2' || norm === 'gia ban 2' || norm === 'giaban_2' || norm === 'giaban 2' || (norm.includes('gia ban') && norm.includes('2'));
  });

  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxQty = getIdx(['số lượng', 'sl', 'quantity']);
  const idxMarket = getIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm', 'kho', 'cửa hàng']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'nhóm']);

  // 3. Cột Ngành hàng = cột AN (index 39)
  const idxNganhHang = (() => {
    const exact = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'nganh hang' || norm === 'nganh hang lon';
    });
    if (exact !== -1) return exact;
    return header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return (norm.includes('nganh hang') && !norm.includes('lon')) || norm.includes('nhom nganh hang');
    });
  })();
  const idxNhomHang = (() => {
    const exact = header.findIndex(h => h === 'nhóm hàng' || h === 'nhom hang' || h === 'nhóm ngành hàng' || h === 'nhom nganh hang' || h === 'nhóm hàng nhỏ' || h === 'nhom hang nho');
    if (exact !== -1) return exact;
    return header.findIndex(h => h.includes('nhóm hàng') || h.includes('nhom hang') || h.includes('nhóm') || h.includes('nhom'));
  })();
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng', 'tình trạng nhập trả', 'nhập trả']);
  const idxOrderId = getIdx(['mã ycx', 'mã yêu cầu', 'mã đơn', 'số chứng từ']);
  const idxCustomerName = getIdx(['tên khách hàng', 'khách hàng', 'tên kh']);
  const idxCustomerPhone = getIdx(['điện thoại', 'số điện thoại', 'sđt', 'phone']);

  console.log('[parseYcxData] Column indices detected:', { idxStaffName, idxRevenue, idxGiaBan2, idxMarket, idxStatus, idxType, idxMethod, idxOrderId, idxNganhHang, idxNhomHang });

  // Fallback indices if header not found
  const colType = idxType;
  const colMethod = idxMethod;
  const colStatus = idxStatus;
  const colStaffName = idxStaffName;
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 36; // Cột AK (Index 36)
  const colGiaBan2 = idxGiaBan2 !== -1 ? idxGiaBan2 : 37; // Cột AL (Index 37)
  const colProduct = idxProduct;
  const colQty = idxQty;
  const colMarket = idxMarket;
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40; // Cột AO (Index 40)
  const colNganhHang = idxNganhHang !== -1 ? idxNganhHang : 39; // Cột AN (Index 39)
  const colNhomHang = idxNhomHang !== -1 ? idxNhomHang : 40;
  const colReturnStatus = idxReturnStatus;
  const colOrderId = idxOrderId;
  const colCustomerName = idxCustomerName;
  const colCustomerPhone = idxCustomerPhone;

  const staffMap = new Map<string, { 
    totalRevenue: number, 
    convertedRevenue: number, 
    installmentRevenue: number,
    marketName?: string,
    items: YcxItemDetail[],
    giaDung: {
      total: number,
      mayLocNuoc: number,
      noiCom: number,
      noiChien: number,
      quatGio: number,
      bep: number
    },
    baoHiem: {
      total: number,
      count: number,
      motDoiMot: number,
      moRong: number,
      roiVo: number,
      khac: number
    },
    ict: {
      smartphone: number,
      sdp: number,
      taiNghe: number,
      camera: number,
      sim: number,
      vieon: number,
      miengDan: number
    },
    ce: {
      total: number,
      tivi: number,
      tuLanh: number,
      mayGiat: number,
      mayLanh: number,
      mayNuocNong: number,
      msMrc: number
    },
    staffName: string,
    staffId: string,
    mayLanhImeiQty: number,
    mayLanhDaikinQty: number,
    mayLanhHaierQty: number,
    mayLanhHisenseQty: number
  }>();

  const startIdx = headerIdx !== -1 ? headerIdx + 1 : 1;

  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 3) continue;

    const columnAOValue = colColumnAO !== -1 ? String(cols[colColumnAO] || '').trim() : '';
    const quantityStr = colQty !== -1 ? String(cols[colQty] || '0').replace(/,/g, '') : '1';
    const quantity = Math.round(parseFloat(quantityStr) || 0);
    const staffNameFromX = colStaffName !== -1 ? String(cols[colStaffName] || '').trim() : 'HỆ THỐNG';
    const statusValN = colStatus !== -1 ? String(cols[colStatus] || '').trim().toLowerCase() : 'đã xuất';
    const returnStatusValAS = colReturnStatus !== -1 ? String(cols[colReturnStatus] || '').trim().toLowerCase() : 'chưa trả';

    if (!staffNameFromX) continue;

    const displayName = staffNameFromX.replace(/\s+/g, ' ').trim();
    const nameLower = displayName.toLowerCase();
    let finalStaffName = displayName;
    if (!finalStaffName || 
        nameLower.includes('người tạo') || 
        nameLower === 'administrator' ||
        nameLower === 'admin'
    ) {
      finalStaffName = 'HỆ THỐNG';
    }
    const staffKey = finalStaffName.toUpperCase();

    if (!staffMap.has(staffKey)) {
      staffMap.set(staffKey, { 
        totalRevenue: 0, 
        convertedRevenue: 0, 
        installmentRevenue: 0,
        marketName: colMarket !== -1 ? String(cols[colMarket] || '').trim() : '',
        items: [],
        giaDung: { total: 0, mayLocNuoc: 0, noiCom: 0, noiChien: 0, quatGio: 0, bep: 0 },
        baoHiem: { total: 0, count: 0, motDoiMot: 0, moRong: 0, roiVo: 0, khac: 0 },
        ict: { smartphone: 0, sdp: 0, taiNghe: 0, camera: 0, sim: 0, vieon: 0, miengDan: 0 },
        ce: { total: 0, tivi: 0, tuLanh: 0, mayGiat: 0, mayLanh: 0, mayNuocNong: 0, msMrc: 0 },
        staffName: finalStaffName,
        staffId: "",
        mayLanhImeiQty: 0,
        mayLanhDaikinQty: 0,
        mayLanhHaierQty: 0,
        mayLanhHisenseQty: 0
      });
    }

    const isMayLanhImei = columnAOValue === "1098 - Máy lạnh (IMEI)" || columnAOValue.includes("1098 - Máy lạnh (IMEI)");
    
    if (isMayLanhImei && statusValN === "đã xuất" && !(returnStatusValAS.includes('trả') && !returnStatusValAS.includes('chưa trả'))) {
       const staffData = staffMap.get(staffKey)!;
       staffData.mayLanhImeiQty += quantity;
       
       const productNameUpper = colProduct !== -1 ? String(cols[colProduct] || "").toUpperCase() : "";
       if (productNameUpper.includes("DAIKIN")) staffData.mayLanhDaikinQty = (staffData.mayLanhDaikinQty || 0) + quantity;
       if (productNameUpper.includes("HAIER")) staffData.mayLanhHaierQty = (staffData.mayLanhHaierQty || 0) + quantity;
       if (productNameUpper.includes("HISENSE") || productNameUpper.includes("HISENSI")) staffData.mayLanhHisenseQty = (staffData.mayLanhHisenseQty || 0) + quantity;
     }

    const type = colType !== -1 ? String(cols[colType] || '').trim().toLowerCase() : '';
    const method = colMethod !== -1 ? String(cols[colMethod] || '').trim().toLowerCase() : '';

    const status = colStatus !== -1 ? String(cols[colStatus] || '').trim().toLowerCase() : 'đã xuất';
    const returnStatus = colReturnStatus !== -1 ? String(cols[colReturnStatus] || '').trim().toLowerCase() : 'chưa trả';
    
    if (colStatus !== -1 && (status.includes('hủy') || status.includes('huy') || status === 'đã trả')) continue;
    if (colReturnStatus !== -1 && returnStatus.includes('trả') && !returnStatus.includes('chưa trả')) continue;

    const market = colMarket !== -1 ? String(cols[colMarket] || '').trim() : '';
    const columnAO = colColumnAO !== -1 ? String(cols[colColumnAO] || '').trim() : '';

    const columnAOVal = removeAccents(columnAO).toLowerCase();
    if (
      columnAOVal.includes('2513') ||
      columnAOVal.includes('2571') ||
      columnAOVal.includes('4519') ||
      columnAOVal.includes('4599') ||
      columnAOVal.includes('thu ho payoo') ||
      columnAOVal.includes('thu ho cuoc viettel') ||
      columnAOVal.includes('thu ho tien tra gop') ||
      columnAOVal.includes('thu ho tien mat')
    ) {
      continue;
    }
    
    if (i <= 5) {
      console.log(`[parseYcxData Row ${i}]`, {
        method, status, returnStatus, market,
        colMethod, colStatus, colMarket
      });
    }

    const originalProductName = colProduct !== -1 ? String(cols[colProduct] || "Sản phẩm không tên").trim() : "Sản phẩm không tên";
    let productName = originalProductName;
    productName = productName
      .replace(/^[A-Za-z0-9]+\s*-\s*/, '')
      .replace(/\s*-\s*[A-Za-z0-9]+$/, '')
      .replace(/\s*\([A-Za-z0-9]+\)$/, '')
      .trim();
    
    if (!productName) productName = originalProductName;
    
    const revenueStr = colRevenue !== -1 ? String(cols[colRevenue] || '0').replace(/,/g, '') : '0';
    
    const rowString = cols.join(' ').toLowerCase().replace(/\//g, ' ');
    
    let revenueValue = parseFloat(revenueStr) || 0;
    if (revenueValue === 0 && colGiaBan2 !== -1) {
      const revenueStr2 = String(cols[colGiaBan2] || '0').replace(/,/g, '');
      const val2 = parseFloat(revenueStr2) || 0;
      if (val2 > 0) revenueValue = val2;
    }
    const hasStaff = Boolean(finalStaffName);
    const hasRevenue = !isNaN(revenueValue) && revenueValue >= 0;
    
    if (hasStaff && hasRevenue) {
       const revenue = Math.round(revenueValue);
       let isInstallment = false;
       if (type.includes('trả góp') || method.includes('trả góp') || rowString.includes('trả góp') || rowString.includes('tra gop')) {
         isInstallment = true;
       }
         
         const nganhVal = colNganhHang !== -1 && colNganhHang < cols.length ? String(cols[colNganhHang] || '').trim() : '';
         const nhomVal = colNhomHang !== -1 && colNhomHang < cols.length ? String(cols[colNhomHang] || '').trim() : '';
         
         const multiplier = getQuyDoiMultiplier(nganhVal, nhomVal, rules);
         const convertedRev = Math.round(revenue * multiplier);
         const matchedCat = nganhVal || 'Khác';
         
         const current = staffMap.get(staffKey)!;
         current.totalRevenue += revenue;
         if (isInstallment) {
           current.installmentRevenue += revenue;
         }

         const isGiaDung = rowString.includes('gia dụng') || rowString.includes('dụng cụ nhà bếp') || rowString.includes('máy lọc nước');
         if (isGiaDung) {
           current.giaDung.total += revenue;
           if (rowString.includes('máy lọc nước')) current.giaDung.mayLocNuoc += quantity;
           if (rowString.includes('nồi cơm')) current.giaDung.noiCom += quantity;
           if (rowString.includes('nồi chiên')) current.giaDung.noiChien += quantity;
           if (rowString.includes('quạt')) current.giaDung.quatGio += quantity;
           if (rowString.includes('bếp')) current.giaDung.bep += quantity;
         }
          const productNameLower = productName.toLowerCase();
          const isBaoHiem = productNameLower.includes('bảo hiểm') || 
                             productNameLower.includes('bảo hành mở rộng') || 
                             rowString.includes('bảo hiểm') ||
                             rowString.includes('bảo hành mở rộng') ||
                             productNameLower.includes('1 đổi 1') || 
                             productNameLower.includes('1 doi 1') ||
                             productNameLower.includes('1doi1') ||
                             productNameLower.includes('1-1') ||
                             productNameLower.includes('rơi vỡ') ||
                             productNameLower.includes('roi vo') ||
                             productNameLower.includes('bhrv') ||
                             productNameLower.includes('sc+') ||
                             productNameLower.includes('care+') ||
                             productNameLower.includes('applecare') ||
                             productNameLower.includes('bhkv') ||
                             productNameLower.includes('khoản vay') ||
                             productNameLower.includes('khoan vay') ||
                             productNameLower.includes('bhxm') ||
                             productNameLower.includes('xe máy') ||
                             productNameLower.includes('xe may') ||
                             productNameLower.includes('bảo vệ màn hình') ||
                             productNameLower.includes('bvmh') ||
                             rowString.includes('bảo hiểm') ||
                             rowString.includes('bảo hành mở rộng') ||
                             rowString.includes('bao hanh mo rong') ||
                             rowString.includes('bhmr') ||
                             rowString.includes('1 đổi 1') ||
                             rowString.includes('1 doi 1') ||
                             rowString.includes('rơi vỡ') ||
                             rowString.includes('roi vo') ||
                             rowString.includes('bhrv') ||
                             rowString.includes('sc+') ||
                             rowString.includes('bhkv') ||
                             rowString.includes('bhxm') ||
                             rowString.includes('bảo vệ màn hình') ||
                             rowString.includes('bvmh') ||
                             matchedCat === 'bảo hiểm' ||
                             matchedCat === '1994 - dịch vụ bảo hành, bảo dưỡng điện máy xanh' ||
                             columnAO.includes('1994') ||
                             columnAO.includes('7139') ||
                             columnAO.includes('4479') ||
                             columnAO.includes('4499') ||
                             columnAO === "4479 - Dịch Vụ Bảo Hiểm" ||
                             columnAO === "4499 - Thu Hộ Phí Bảo Hiểm";

          if (isBaoHiem) {
            current.baoHiem.total += revenue;
            current.baoHiem.count += (quantity > 0 ? quantity : 1);
            if (productNameLower.includes('1 đổi 1') || productNameLower.includes('1 doi 1') || productNameLower.includes('1doi1') || productNameLower.includes('1-1') || rowString.includes('1 đổi 1') || rowString.includes('1 doi 1')) {
              current.baoHiem.motDoiMot += revenue;
            } else if (productNameLower.includes('mở rộng') || productNameLower.includes('mo rong') || productNameLower.includes('bhmr') || rowString.includes('mở rộng') || rowString.includes('mo rong') || rowString.includes('bhmr')) {
              current.baoHiem.moRong += revenue;
            } else if (productNameLower.includes('rơi vỡ') || productNameLower.includes('roi vo') || productNameLower.includes('bhrv') || productNameLower.includes('sc+') || productNameLower.includes('care+') || productNameLower.includes('applecare') || rowString.includes('rơi vỡ') || rowString.includes('roi vo') || rowString.includes('bhrv') || rowString.includes('sc+') || rowString.includes('care+')) {
              current.baoHiem.roiVo += revenue;
            } else {
              current.baoHiem.khac += revenue;
            }
          }
         const isSmartphone = (rowString.includes('điện thoại') || rowString.includes('smartphone')) && !rowString.includes('phụ kiện');
         const isSDP = rowString.includes('sạc dự phòng') || rowString.includes('sac du phong');
         const isTaiNghe = rowString.includes('tai nghe');
         const isCamera = rowString.includes('camera');
         const isSim = rowString.includes('sim');
         const isVieon = rowString.includes('vieon');
         const isMiengDan = rowString.includes('miếng dán') || rowString.includes('mieng dan');

         if (isSmartphone) current.ict.smartphone += quantity;
         if (isSDP) current.ict.sdp += quantity;
         if (isTaiNghe) current.ict.taiNghe += quantity;
         if (isCamera) current.ict.camera += quantity;
         if (isSim) current.ict.sim += quantity;
         if (isVieon) current.ict.vieon += quantity;
         if (isMiengDan) current.ict.miengDan += quantity;

         const isTivi = productNameLower.includes('tivi') || productNameLower.includes('ti vi') || productNameLower.includes('television');
         const isTuLanh = productNameLower.includes('tủ lạnh') || productNameLower.includes('tu lanh') || productNameLower.includes('refrigerator');
         const isMayGiat = productNameLower.includes('máy giặt') || productNameLower.includes('may giat') || productNameLower.includes('washing machine');
         const isMayLanh = productNameLower.includes('máy lạnh') || productNameLower.includes('may lanh') || productNameLower.includes('điều hòa') || productNameLower.includes('dieu hoa');
         const isMayNuocNong = productNameLower.includes('máy nước nóng') || productNameLower.includes('may nuoc nong') || productNameLower.includes('water heater');
         const isMsMrc = productNameLower.includes('máy sấy') || productNameLower.includes('may say') || productNameLower.includes('máy rửa chén') || productNameLower.includes('may rua chen') || productNameLower.includes('dishwasher') || productNameLower.includes('dryer');

         if (isTivi || isTuLanh || isMayGiat || isMayLanh || isMayNuocNong || isMsMrc) {
           current.ce.total += revenue;
           if (isTivi) current.ce.tivi += quantity;
           if (isTuLanh) current.ce.tuLanh += quantity;
           if (isMayGiat) current.ce.mayGiat += quantity;
           if (isMayLanh) current.ce.mayLanh += quantity;
           if (isMayNuocNong) current.ce.mayNuocNong += quantity;
           if (isMsMrc) current.ce.msMrc += quantity;
         }

          current.convertedRevenue += convertedRev;
         current.marketName = market;
          current.items.push({
            productName,
            revenue,
            convertedRevenue: convertedRev,
            category: nganhVal || 'Khác',
            isInstallment,
           quantity,
           status: colStatus !== -1 ? String(cols[colStatus] || '') : '',
           returnStatus: colReturnStatus !== -1 ? String(cols[colReturnStatus] || '') : '',
           orderId: colOrderId !== -1 ? String(cols[colOrderId] || '') : '',
           customerName: colCustomerName !== -1 ? String(cols[colCustomerName] || '') : '',
           customerPhone: colCustomerPhone !== -1 ? String(cols[colCustomerPhone] || '') : '',
           staffName: displayName
         });
      }
    }

  return Array.from(staffMap.entries()).map(([staffName, data]) => ({
    staffName: data.staffName,
    staffId: data.staffId,
    marketName: data.marketName,
    totalRevenue: data.totalRevenue,
    convertedRevenue: data.convertedRevenue,
    installmentRevenue: data.installmentRevenue,
    mayLanhImeiQty: data.mayLanhImeiQty,
    items: data.items.sort((a, b) => b.convertedRevenue - a.convertedRevenue),
    giaDung: data.giaDung,
    baoHiem: data.baoHiem,
    ict: data.ict,
    ce: data.ce
  })).sort((a, b) => b.convertedRevenue - a.convertedRevenue);
};

export const parseYcxRankData = (data: string, customQuyDoiRules?: any[]): YcxRankData[] => {
  if (!data) return [];
  
  let rules = Array.isArray(customQuyDoiRules) ? customQuyDoiRules : undefined;
  if (!rules) {
    try {
      const cached = localStorage.getItem('crm_quy_doi_rules');
      if (cached) rules = JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
  }

  let rows: any[][] = [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else {
      rows = data.split('\n').map(line => line.split('\t'));
    }
  } catch (e) {
    rows = data.split('\n').map(line => line.split('\t'));
  }

  if (rows.length < 2) return [];

  // Tìm dòng tiêu đề
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (row && row.some(cell => {
      const c = String(cell).toLowerCase();
      return c.includes('người tạo') || c.includes('nhân viên') || c.includes('phải thu') || c.includes('loại ycx') || c.includes('trạng thái xuất');
    })) {
      headerIdx = i;
      break;
    }
  }

  const header = headerIdx !== -1 ? rows[headerIdx].map(c => String(c || '').toLowerCase().trim()) : [];
  const getIdx = (names: string[]) => {
    const lowerNames = names.map(n => n.toLowerCase());
    for (const name of lowerNames) {
      const exactIdx = header.findIndex(h => h === name);
      if (exactIdx !== -1) return exactIdx;
      
      const partialIdx = header.findIndex(h => {
        const norm = removeAccents(h).toLowerCase();
        const normName = removeAccents(name).toLowerCase();
        if (normName === 'nhom hang' && norm.includes('nho')) return false;
        if (normName === 'nganh hang' && norm.includes('lon')) return false;
        return norm.includes(normName);
      });
      if (partialIdx !== -1) return partialIdx;
    }
    return -1;
  };

  const idxType = getIdx(['loại ycx', 'loại yêu cầu']);
  const idxMethod = getIdx(['hình thức xuất']);
  const idxStatus = getIdx(['trạng thái xuất']);
  const idxStaffName = getIdx(['người tạo', 'user tạo', 'tên người tạo', 'mã/tên người tạo', 'tên nhân viên bán hàng', 'nhân viên bán hàng', 'user bán hàng', 'nv bán hàng', 'tên nhân viên', 'tên nv', 'nhân viên', 'người bán', 'người lập', 'user lập', 'nv tạo', 'người thực hiện']); 
  const idxStaffId = getIdx(['user tạo', 'mã nv', 'mã nhân viên', 'id nhân viên']);
  // 1. Cột Giá bán = cột AK (index 36)
  const idxRevenue = (() => {
    const giaBanIdx = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
      return norm === 'gia ban' || norm === 'giaban' || norm === 'gia ban_1' || norm === 'gia ban 1' || (norm.includes('gia ban') && !norm.includes('2'));
    });
    if (giaBanIdx !== -1) return giaBanIdx;
    return getIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'số tiền', 'tổng cộng', 'tiền']);
  })();

  // 2. Cột Giá bán 2 = cột AL (index 37)
  const idxGiaBan2 = header.findIndex(h => {
    const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
    return norm === 'gia ban_2' || norm === 'gia ban 2' || norm === 'giaban_2' || norm === 'giaban 2' || (norm.includes('gia ban') && norm.includes('2'));
  });

  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng', 'tình trạng nhập trả', 'nhập trả']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'nhóm']);

  // 3. Cột Ngành hàng = cột AN (index 39)
  const idxNganhHang = (() => {
    const exact = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return norm === 'nganh hang' || norm === 'nganh hang lon';
    });
    if (exact !== -1) return exact;
    return header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim();
      return (norm.includes('nganh hang') && !norm.includes('lon')) || norm.includes('nhom nganh hang');
    });
  })();
  const idxNhomHang = (() => {
    const exact = header.findIndex(h => h === 'nhóm hàng' || h === 'nhom hang' || h === 'nhóm ngành hàng' || h === 'nhom nganh hang' || h === 'nhóm hàng nhỏ' || h === 'nhom hang nho');
    if (exact !== -1) return exact;
    return header.findIndex(h => h.includes('nhóm hàng') || h.includes('nhom hang') || h.includes('nhóm') || h.includes('nhom'));
  })();

  const colType = idxType !== -1 ? idxType : 3;
  const colMethod = idxMethod !== -1 ? idxMethod : 3;
  const colStatus = idxStatus !== -1 ? idxStatus : 13;
  const colStaffName = idxStaffName !== -1 ? idxStaffName : 23; // Cột X (Index 23)
  const colStaffId = idxStaffId !== -1 ? idxStaffId : 22;   // Cột W (Index 22)
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 36; // Cột AK (Index 36)
  const colGiaBan2 = idxGiaBan2 !== -1 ? idxGiaBan2 : 37; // Cột AL (Index 37)
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colReturnStatus = idxReturnStatus !== -1 ? idxReturnStatus : 44; // Cột AS (Index 44)
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40; // Cột AO (Index 40)
  const colNganhHang = idxNganhHang !== -1 ? idxNganhHang : 39; // Cột AN (Index 39)
  const colNhomHang = idxNhomHang !== -1 ? idxNhomHang : 40;

  const staffMap = new Map<string, { total: number, converted: number }>();
  const startIdx = headerIdx !== -1 ? headerIdx + 1 : 1;

  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 3) continue;

    const type = String(cols[colType] || '').trim().toLowerCase();
    const method = String(cols[colMethod] || '').trim().toLowerCase();
    
    // Keep all non-cancelled/non-returned export methods

    const status = String(cols[colStatus] || '').trim().toLowerCase();
    const returnStatus = String(cols[colReturnStatus] || '').trim().toLowerCase();
    
    // FILTER: Only include "ĐÃ XUẤT" (Column N) and exclude returned items
    if (status.includes('hủy') || status.includes('huy') || status === 'đã trả') continue;
    if (returnStatus.includes('trả') && !returnStatus.includes('chưa trả')) continue;

    const staffNameRaw = String(cols[colStaffName] || '').trim();
    const staffIdRaw = String(cols[colStaffId] || '').trim();
    
    // Normalize name and ID to prevent duplicates
    let nameOnly = staffNameRaw.replace(/\s+/g, ' ').toUpperCase();
    let finalId = staffIdRaw ? staffIdRaw.trim() : "";
    
    // Check if name already contains the ID
    const matchEnd = nameOnly.match(/^(.*?)\s*-\s*(\d+)$/);
    const matchStart = nameOnly.match(/^(\d+)\s*-\s*(.*?)$/);
    const matchSpaceEnd = nameOnly.match(/^(.*?)\s+(\d+)$/);
    
    if (matchEnd) {
      nameOnly = matchEnd[1].trim();
      if (!finalId) finalId = matchEnd[2];
    } else if (matchStart) {
      nameOnly = matchStart[2].trim();
      if (!finalId) finalId = matchStart[1];
    } else if (matchSpaceEnd) {
      nameOnly = matchSpaceEnd[1].trim();
      if (!finalId) finalId = matchSpaceEnd[2];
    }
    
    // Final check to remove any remaining ID from nameOnly if finalId is found
    if (finalId && nameOnly.includes(finalId)) {
       nameOnly = nameOnly.replace(finalId, '').replace(/[-_]+/g, '').trim();
    }
    
    let staff = nameOnly;
    if (finalId && finalId.match(/^\d+$/)) {
      staff = `${finalId} - ${nameOnly}`;
    }
    
    // FILTER: Ensure staff name exists and is not a header row
    if (!nameOnly || nameOnly.toLowerCase().includes('người tạo') || nameOnly.toLowerCase().includes('nhân viên')) continue;
    
    // --- SMART MERGING TO PREVENT DUPLICATES ---
    let matchedStaffKey = staff;
    for (const existingKey of staffMap.keys()) {
      if (existingKey === staff) {
        matchedStaffKey = existingKey;
        break;
      }
      if (finalId && existingKey === nameOnly) {
        const existingData = staffMap.get(existingKey)!;
        staffMap.delete(existingKey);
        staffMap.set(staff, existingData);
        matchedStaffKey = staff;
        break;
      }
      if (!finalId && existingKey.endsWith(`- ${nameOnly}`)) {
        matchedStaffKey = existingKey;
        break;
      }
    }
    staff = matchedStaffKey;
    // -------------------------------------------
    
    const revenueStr = String(cols[colRevenue] || '0').replace(/,/g, '');
    const originalProductName = String(cols[colProduct] || "Sản phẩm không tên").trim();
    let productName = originalProductName;
    // Remove product code
    productName = productName
      .replace(/^[A-Za-z0-9]+\s*-\s*/, '')
      .replace(/\s*-\s*[A-Za-z0-9]+$/, '')
      .replace(/\s*\([A-Za-z0-9]+\)$/, '')
      .trim();
      
    if (!productName) productName = originalProductName;
    
    const isMaNapTien = productName.toLowerCase().includes('mã nạp tiền');

    const rowString = cols.join(' ').toLowerCase().replace(/\//g, ' ');
    const isSales = !type.includes('hủy') && !type.includes('huy');

    if (isSales && staff && !isMaNapTien) {
      let revenue = Math.round(parseFloat(revenueStr) || 0);
      if (revenue <= 0 && colGiaBan2 !== -1) {
        const revenueStr2 = String(cols[colGiaBan2] || '0').replace(/,/g, '');
        const rev2 = Math.round(parseFloat(revenueStr2) || 0);
        if (rev2 > 0) revenue = rev2;
      }
      if (revenue <= 0) continue;

      let isInstallment = false;
      if (type.includes('trả góp') || method.includes('trả góp') || rowString.includes('trả góp') || rowString.includes('tra gop')) {
        isInstallment = true;
      }

      const nganhVal = colNganhHang !== -1 && colNganhHang < cols.length ? String(cols[colNganhHang] || '').trim() : '';
      const nhomVal = colNhomHang !== -1 && colNhomHang < cols.length ? String(cols[colNhomHang] || '').trim() : '';
      
      const multiplier = getQuyDoiMultiplier(nganhVal, nhomVal, rules);
      const convertedRev = Math.round(revenue * multiplier);
      if (!staffMap.has(staff)) {
        staffMap.set(staff, { total: 0, converted: 0 });
      }
      const current = staffMap.get(staff)!;
      current.total += revenue;
      current.converted += convertedRev;
    }
  }

  const results = Array.from(staffMap.entries()).map(([staffName, data]) => ({
    staffName,
    totalRevenue: data.total,
    convertedRevenue: data.converted,
    efficiency: data.total > 0 ? (data.converted / data.total) * 100 : 0,
    isTop: false
  })).sort((a, b) => b.convertedRevenue - a.convertedRevenue);

  // Calculate Top 20%
  const topCount = Math.ceil(results.length * 0.2);
  for (let i = 0; i < topCount && i < results.length; i++) {
    results[i].isTop = true;
  }

  return results;
};

export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Could not save to localStorage for key ${key}`, e);
  }
};

export const parseStaffValueList = (text: string, targetHeaderKeyword?: string): { id: string; name: string; value: number }[] => {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: { id: string; name: string; value: number }[] = [];

  const ignoredKeywords = [
    'tong', 'tong cong', 'total', 'nhan vien', 'ho ten', 'msnv', 'ma nv', 'dtqd', 'thu nhap',
    'stt', 'luong', 'thuong', 'doanh thu', 'he so', 'copy all', 'copy', 'sao chep', 'sao chép'
  ];

  const isColumn3Mode = targetHeaderKeyword === 'COLUMN_3' || targetHeaderKeyword === 'COL_3' || targetHeaderKeyword === 'TRA_CHAM';

  if (isColumn3Mode) {
    const isValidPersonName = (str: string) => {
      if (!str) return false;
      if (str.includes(':') || str.includes('/') || str.includes('@') || str.includes('×')) return false;
      const norm = normalize(str);
      if (norm.length < 3) return false;
      const letters = norm.match(/[a-z]/g);
      if (!letters || letters.length < 3) return false;

      const words = norm.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 7) return false;

      const blacklist = [
        'tgdd', 'dashboards', 'dashboard', 'danh muc bao cao', 'doanh thu hop nhat', 'thi dua',
        'doanh thu nganh hang bi', 'doanh thu nganh hang', 'gio cong lam viec', 'bao cao tra cham', 'luot bill',
        'chi phi cham soc', 'employee', 'tim bao cao', 'cap nhat', 'toggle theme', 'ty trong tra gop',
        'theo nganh hang', 'ty le duyet', 'chi tiet theo chuong trinh', 'vung', 'chon',
        'khu vuc', 'sieu thi', 'xem', 'xuat excel', 'xuat theo mau', 'luy ke', 'realtime',
        'tat ca vung', 'nhan vien', 'dt tra gop', 'dt sieu thi', 'ty trong tra cham',
        'homecredit', 'fecredit', 'smartpos', 'mwg paylater', 'tra gop kredivo',
        'tong', 'tong cong', 'total', 'dong', 'trang', 'stt', 'he so', 'dt', 'thang', 'nam', 'ngay',
        'dml', 'cma', 'nguyen tat thanh', 'copy all', 'copy', 'sao chep', 'sao chep tat ca', 'select all'
      ];

      if (blacklist.some(b => norm === b || norm.startsWith(b + ' ') || norm.endsWith(' ' + b) || norm.includes(b))) {
        return false;
      }
      return true;
    };

    let pendingStaff: { id: string; name: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      let cols = rawLine.split('\t').map(c => c.trim());
      if (cols.length < 2) {
        cols = rawLine.split(/ {2,}/).map(c => c.trim()).filter(Boolean);
      }

      const numValues: { val: number; raw: string; colIdx: number }[] = [];
      cols.forEach((col, idx) => {
        const colCleaned = col.trim().toLowerCase().replace(/(h|tr|đ|vnd|hours|tr\.|đ\.|%)/g, '').trim();
        const cleanCol = colCleaned.replace(/[^\d,.-]/g, '');
        const isNum = cleanCol.length > 0 && /^\s*[-+]?[0-9,.]+\s*$/.test(colCleaned);
        if (isNum) {
          numValues.push({ val: cleanNum(col), raw: col, colIdx: idx });
        }
      });

      // Check if line is purely staff name (0 numbers, or only 1 employee ID number)
      const isNameOnly = (numValues.length === 0 || (numValues.length === 1 && /^\d{4,8}$/.test(String(numValues[0].val)))) && isValidPersonName(rawLine);

      if (isNameOnly) {
        let id = '';
        let name = '';
        const m1 = rawLine.match(/(.+)[\s-–—]+(\d{4,8})$/);
        const m2 = rawLine.match(/^(\d{4,8})[\s-–—]+(.+)$/);
        if (m1) {
          id = m1[2].trim();
          name = m1[1].trim();
        } else if (m2) {
          id = m2[1].trim();
          name = m2[2].trim();
        } else {
          name = rawLine.trim();
        }
        pendingStaff = { id, name };
        continue;
      }

      // If pending staff exists and this line contains AT LEAST 2 numbers (data row from report)
      if (pendingStaff && numValues.length >= 2) {
        let value = 0;
        // User requirement: % TC is column 3 from left (cols[2]). VD 64.06 = 64%
        if (cols.length >= 3 && !isNaN(cleanNum(cols[2]))) {
          value = cleanNum(cols[2]);
        } else if (numValues.length >= 3) {
          value = numValues[2].val;
        } else {
          value = numValues[numValues.length - 1].val;
        }

        if (value > 0 && value <= 1.0) {
          value = value * 100;
        }

        results.push({
          id: pendingStaff.id || pendingStaff.name,
          name: pendingStaff.name,
          value
        });
        pendingStaff = null;
        continue;
      }

      // Invalidate pendingStaff if subsequent line was not a data row
      if (pendingStaff && numValues.length < 2) {
        pendingStaff = null;
      }

      // Case: Combined line (staff name and numbers on same line)
      if (cols.length >= 2 && numValues.length >= 1) {
        let nameCol = '';
        let id = '';
        cols.forEach(c => {
          if (!nameCol && isValidPersonName(c)) {
            nameCol = c;
          }
          if (!id && /^\d{4,8}$/.test(c.trim())) {
            id = c.trim();
          }
        });

        if (nameCol) {
          let value = 0;
          let metricNums = numValues;
          if (numValues.length > 0 && numValues[0].colIdx === 0 && numValues[0].val <= 300) {
            metricNums = numValues.slice(1);
          }

          if (metricNums.length >= 3) {
            value = metricNums[2].val;
          } else if (cols.length >= 3 && !isNaN(cleanNum(cols[2]))) {
            value = cleanNum(cols[2]);
          } else {
            value = metricNums.length > 0 ? metricNums[metricNums.length - 1].val : numValues[numValues.length - 1].val;
          }

          if (value > 0 && value <= 1.0) {
            value = value * 100;
          }

          results.push({
            id: id || nameCol,
            name: nameCol,
            value
          });
        }
      }
    }

    return results;
  }

  let targetColIdx = -1;
  if (targetHeaderKeyword && targetHeaderKeyword !== 'LAST_COLUMN') {
    const keywordNorm = normalize(targetHeaderKeyword);
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      let cols = lines[i].split('\t').map(c => c.trim());
      if (cols.length < 2) {
        cols = lines[i].split(/ {2,}/).map(c => c.trim()).filter(Boolean);
      }
      if (cols.length >= 2) {
        const idx = cols.findIndex(c => normalize(c).includes(keywordNorm));
        if (idx !== -1) {
          targetColIdx = idx;
          break;
        }
      }
    }
  }

  lines.forEach(line => {
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length < 2) {
      cols = line.split(/ {2,}/).map(c => c.trim()).filter(Boolean);
    }
    if (cols.length < 2) return;

    const firstColClean = normalize(cols[0]);
    if (ignoredKeywords.some(k => firstColClean.includes(normalize(k)))) {
      return;
    }

    let id = '';
    let name = '';
    let value = 0;

    // Parse combined ID/Name in columns first
    cols.forEach(col => {
      if (!col) return;
      const m1 = col.match(/(.+)[\s-–—]+(\d{4,8})$/);
      const m2 = col.match(/^(\d{4,8})[\s-–—]+(.+)$/);
      if (m1) {
        id = m1[2].trim();
        name = m1[1].trim();
      } else if (m2) {
        id = m2[1].trim();
        name = m2[2].trim();
      }
    });

    // Classify all columns as either pure numbers, potential IDs, or text
    const pureNumbers: { val: number; colIdx: number; raw: string }[] = [];
    const textColumns: { val: string; colIdx: number }[] = [];

    cols.forEach((col, idx) => {
      if (!col) return;

      const colCleaned = col.trim().toLowerCase().replace(/(h|tr|đ|vnd|hours|tr\.|đ\.)/g, '').trim();
      const cleanCol = colCleaned.replace(/[^\d,.-]/g, '');
      const isNum = cleanCol.length > 0 && /^\s*[-+]?[0-9,.]+\s*$/.test(colCleaned);

      if (isNum) {
        pureNumbers.push({ val: cleanNum(col), colIdx: idx, raw: col.trim() });
      } else {
        textColumns.push({ val: col, colIdx: idx });
      }
    });

    // Assign ID and Value based on pure numbers count
    if (targetHeaderKeyword === 'LAST_COLUMN' && pureNumbers.length > 0) {
      // Find the last pure number
      const nonIdNumbers = pureNumbers.filter(pn => !/^\d{4,8}$/.test(pn.raw));
      if (nonIdNumbers.length > 0) {
        value = nonIdNumbers[nonIdNumbers.length - 1].val;
      } else {
        value = pureNumbers[pureNumbers.length - 1].val;
      }
      
      if (!id) {
        const idIndex = pureNumbers.findIndex(pn => /^\d{4,8}$/.test(pn.raw));
        if (idIndex !== -1) id = pureNumbers[idIndex].raw;
        else {
          textColumns.forEach(tc => {
            const m = tc.val.match(/\b(\d{4,8})\b/);
            if (m) id = m[1];
          });
        }
      }
    } else if (targetColIdx !== -1 && cols.length > targetColIdx) {
      const colVal = cols[targetColIdx];
      const colCleaned = colVal.trim().toLowerCase().replace(/(h|tr|đ|vnd|hours|tr\.|đ\.|%)/g, '').trim();
      value = cleanNum(colCleaned);
      
      if (!id && pureNumbers.length > 0) {
        const idIndex = pureNumbers.findIndex(pn => /^\d{4,8}$/.test(pn.raw) && pn.colIdx !== targetColIdx);
        if (idIndex !== -1) {
          id = pureNumbers[idIndex].raw;
        } else {
          const firstOther = pureNumbers.find(pn => pn.colIdx !== targetColIdx);
          if (firstOther) id = firstOther.raw;
        }
      }
      if (!id) {
        textColumns.forEach(tc => {
          const m = tc.val.match(/\b(\d{4,8})\b/);
          if (m) id = m[1];
        });
      }
    } else if (cols.length >= 2 && /^-?[\d,.]+(%?)$/.test(cols[1].trim()) && !targetHeaderKeyword) {
      // User requirement: thi đua nhân viên doanh thu = cột 2 từ trái sang (cols[1])
      value = cleanNum(cols[1]);
      if (!id && pureNumbers.length > 0) {
        const idIndex = pureNumbers.findIndex(pn => /^\d{4,8}$/.test(pn.raw) && pn.colIdx !== 1);
        if (idIndex !== -1) {
          id = pureNumbers[idIndex].raw;
        }
      }
      if (!id) {
        textColumns.forEach(tc => {
          const m = tc.val.match(/\b(\d{4,8})\b/);
          if (m) id = m[1];
        });
      }
    } else if (pureNumbers.length > 0) {
      if (pureNumbers.length >= 2) {
        // We have at least 2 numbers. Let's see which one is the Employee ID.
        // Usually, a number matching a 4-8 digit pattern is the ID.
        const idIndex = pureNumbers.findIndex(pn => /^\d{4,8}$/.test(pn.raw));
        if (idIndex !== -1) {
          id = pureNumbers[idIndex].raw;
          const valIndex = idIndex === 0 ? 1 : 0;
          value = pureNumbers[valIndex].val;
        } else {
          value = pureNumbers[0].val;
          id = pureNumbers[1].raw;
        }
      } else {
        value = pureNumbers[0].val;
        if (!id) {
          textColumns.forEach(tc => {
            const m = tc.val.match(/\b(\d{4,8})\b/);
            if (m) id = m[1];
          });
        }
      }
    }

    // Determine Name
    if (!name) {
      const nameCandidates = textColumns
        .filter(tc => (!id || !tc.val.includes(id)) && tc.val !== id && /[a-zA-Z]/.test(normalize(tc.val)))
        .map(tc => tc.val);
      if (nameCandidates.length > 0) {
        name = nameCandidates[0];
      }
    }

    if (name) {
      name = name.replace(/[-–—\s]+$/, '').trim();
    }

    const hasValidLetters = Boolean(name && (normalize(name).match(/[a-z]/g) || []).length >= 2);
    const hasValidEmpId = Boolean(id && /^\d{4,8}$/.test(id.trim()));

    if (hasValidLetters || hasValidEmpId) {
      results.push({
        id: id || name,
        name: name || id,
        value
      });
    }
  });

  return results;
};

/**
 * Parses raw text copied from MWG BI Report "Doanh thu hợp nhất > Realtime > Nhân viên"
 * Supports both vertical 12-lines copy and tab-delimited clipboard text.
 */
export const parseMwgBiStaffRevenue = (text: string): MwgBiStaffReportData => {
  const parseNum = (val: any): number => {
    if (!val || val === '—' || val === '-' || String(val).trim() === '') return 0;
    const clean = String(val).replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '').trim();
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  const parsePercent = (val: any): number => {
    if (!val || val === '—' || val === '-' || String(val).trim() === '') return 0;
    const clean = String(val).replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '').trim();
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const summaryKpi: MwgBiSummaryKpi = {
    dtQd: 0,
    percentHtTarget: 0,
    targetTronKy: 0,
    dtDuKien: 0,
    tiTrongTraGop: 0,
    dtTraGop: 0,
    dtThuc: 0,
    tlpvtc: 0,
    ttVsTb3t: '',
    updateTime: '',
    storeName: ''
  };

  // 1. Extract Summary KPIs from header metadata
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Store Name
    if (l.startsWith('Siêu thị') && !l.includes('Chọn')) {
      summaryKpi.storeName = l.replace(/^Siêu thị\s*/, '').replace(/×$/, '').trim();
    }

    // Update Time
    if (l.includes('Cập nhật lúc:')) {
      const match = l.match(/Cập nhật lúc:\s*([^·\n]+)/i);
      if (match) summaryKpi.updateTime = match[1].trim();
    }

    // DT quy đổi
    if ((l === 'DT quy đổi' || l.startsWith('DT quy đổi')) && lines[i + 1] && /^\d+/.test(lines[i + 1])) {
      summaryKpi.dtQd = parseNum(lines[i + 1]);
    }

    // % HT target (LK)
    if (l.includes('% HT target') && lines[i + 1]) {
      summaryKpi.percentHtTarget = parsePercent(lines[i + 1]);
    }

    // Target trọn kỳ
    if (l.includes('Target trọn kỳ')) {
      const m = l.match(/Target trọn kỳ\s+([\d,.]+)/i);
      if (m) summaryKpi.targetTronKy = parseNum(m[1]);
    }

    // TT vs TB 3 tháng
    if (l.includes('TT vs TB 3 tháng') && lines[i + 1]) {
      summaryKpi.ttVsTb3t = lines[i + 1];
    }

    // DT dự kiến
    if (l.includes('DT dự kiến') && lines[i + 1] && /^\d+/.test(lines[i + 1])) {
      summaryKpi.dtDuKien = parseNum(lines[i + 1]);
    }

    // TLPVTC hôm nay
    if (l.includes('TLPVTC') && lines[i + 1]) {
      summaryKpi.tlpvtc = parsePercent(lines[i + 1]);
    }

    // Tỉ trọng trả góp
    if (l.includes('Tỉ trọng trả góp') && lines[i + 1] && /^\d+/.test(lines[i + 1])) {
      summaryKpi.tiTrongTraGop = parsePercent(lines[i + 1]);
    }

    // DT trả góp X / Y
    if (l.includes('DT trả góp') && l.includes('/')) {
      const m = l.match(/DT trả góp\s+([\d,.]+)\s*\/\s*([\d,.]+)/i);
      if (m) {
        summaryKpi.dtTraGop = parseNum(m[1]);
        summaryKpi.dtThuc = parseNum(m[2]);
      }
    }
  }

  // 2. Locate Employee Table Header
  let headerIndex = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i] === 'NHÂN VIÊN' && (lines[i + 1] === 'SỐ LƯỢNG' || lines[i + 1].includes('SỐ LƯỢNG'))) {
      headerIndex = i;
      break;
    }
  }

  const staffRows: MwgBiStaffRow[] = [];
  let totals: MwgBiStaffTotals | null = null;

  if (headerIndex !== -1) {
    // 12 headers in report:
    // NHÂN VIÊN, SỐ LƯỢNG, DOANH THU QĐ, % TỈ TRỌNG, DOANH THU, TARGET, % HT TARGET (LK), TB 3 THÁNG, % TT, DT DỰ KIẾN, DT TRẢ GÓP, % TRẢ GÓP
    let cursor = headerIndex + 12;

    while (cursor < lines.length) {
      const line = lines[cursor];

      // End of table marker
      if ((line.includes('1-') && line.includes('/ Tổng')) || line.includes('Đơn vị:')) {
        break;
      }

      // Check if this is the "Tổng" summary row
      if (line.startsWith('Tổng (') || line === 'Tổng' || line.startsWith('Tổng ')) {
        totals = {
          title: line,
          quantity: parseNum(lines[cursor + 1]),
          convertedRevenue: parseNum(lines[cursor + 2]),
          shareRate: parsePercent(lines[cursor + 3]),
          actualRevenue: parseNum(lines[cursor + 4]),
          target: parseNum(lines[cursor + 5]),
          targetRate: parsePercent(lines[cursor + 6]),
          avg3Months: parseNum(lines[cursor + 7]),
          growthRate: lines[cursor + 8] || '—',
          expectedRevenue: parseNum(lines[cursor + 9]),
          installmentRevenue: parseNum(lines[cursor + 10]),
          installmentRate: parsePercent(lines[cursor + 11])
        };
        cursor += 12;
        continue;
      }

      // Tab-separated row format (if copied from table / Excel)
      if (line.includes('\t')) {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length >= 4) {
          const name = cols[0];
          let staffId = '';
          let fullName = name;
          if (name.includes(' - ')) {
            const parts = name.split(' - ');
            staffId = parts[0].trim();
            fullName = parts.slice(1).join(' - ').trim();
          } else if (/^\d+/.test(name)) {
            const m = name.match(/^(\d+)\s*(.*)$/);
            if (m) {
              staffId = m[1];
              fullName = m[2].trim() || name;
            }
          }

          staffRows.push({
            staffName: name,
            staffId: staffId || name,
            fullName: fullName || name,
            quantity: parseNum(cols[1]),
            convertedRevenue: parseNum(cols[2]),
            shareRate: parsePercent(cols[3]),
            actualRevenue: parseNum(cols[4]),
            target: parseNum(cols[5]),
            targetRate: parsePercent(cols[6]),
            avg3Months: parseNum(cols[7]),
            growthRate: cols[8] || '—',
            expectedRevenue: parseNum(cols[9]),
            installmentRevenue: parseNum(cols[10]),
            installmentRate: parsePercent(cols[11])
          });
        }
        cursor++;
      } else {
        // Standard 12-line vertical copy format
        const name = line;
        let staffId = '';
        let fullName = name;
        if (name.includes(' - ')) {
          const parts = name.split(' - ');
          staffId = parts[0].trim();
          fullName = parts.slice(1).join(' - ').trim();
        } else if (/^\d+/.test(name)) {
          const m = name.match(/^(\d+)\s*(.*)$/);
          if (m) {
            staffId = m[1];
            fullName = m[2].trim() || name;
          }
        }

        staffRows.push({
          staffName: name,
          staffId: staffId || name,
          fullName: fullName || name,
          quantity: parseNum(lines[cursor + 1]),
          convertedRevenue: parseNum(lines[cursor + 2]),
          shareRate: parsePercent(lines[cursor + 3]),
          actualRevenue: parseNum(lines[cursor + 4]),
          target: parseNum(lines[cursor + 5]),
          targetRate: parsePercent(lines[cursor + 6]),
          avg3Months: parseNum(lines[cursor + 7]),
          growthRate: lines[cursor + 8] || '—',
          expectedRevenue: parseNum(lines[cursor + 9]),
          installmentRevenue: parseNum(lines[cursor + 10]),
          installmentRate: parsePercent(lines[cursor + 11])
        });

        cursor += 12;
      }
    }
  }

  // Auto-fill fallback totals if not present in text
  if (!totals && staffRows.length > 0) {
    const totalQty = staffRows.reduce((acc, r) => acc + r.quantity, 0);
    const totalConv = staffRows.reduce((acc, r) => acc + r.convertedRevenue, 0);
    const totalAct = staffRows.reduce((acc, r) => acc + r.actualRevenue, 0);
    const totalInst = staffRows.reduce((acc, r) => acc + r.installmentRevenue, 0);
    totals = {
      title: `Tổng (${staffRows.length} dòng)`,
      quantity: totalQty,
      convertedRevenue: totalConv,
      shareRate: 100,
      actualRevenue: totalAct,
      target: summaryKpi.targetTronKy || 0,
      targetRate: summaryKpi.percentHtTarget || 0,
      avg3Months: 0,
      growthRate: summaryKpi.ttVsTb3t || '—',
      expectedRevenue: summaryKpi.dtDuKien || 0,
      installmentRevenue: totalInst,
      installmentRate: totalAct > 0 ? Math.round((totalInst / totalAct) * 1000) / 10 : 0
    };
  }

  return { summaryKpi, staffRows, totals };
};

