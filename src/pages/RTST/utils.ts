/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MarketInfo, CategoryData, StaffData, StaffMatrixData, YcxStaffData, YcxItemDetail, YcxRankData, MwgBiStaffRow, MwgBiSummaryKpi, MwgBiStaffTotals, MwgBiStaffReportData } from './types';


export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const cleanCategoryName = (name: string): string => {
  if (!name) return '';
  let namePart = name;
  const targetMatch = namePart.match(/(.+?)\bTARGET\b/i);
  if (targetMatch) {
    namePart = targetMatch[1];
  }
  let clean = removeAccents(namePart).trim();
  
  // Strip leading numbering like "1. ", "01. ", "1 - ", "01 - "
  clean = clean.replace(/^(\d+[\s.-]+)/, '');

  // Strip prefixes like "nnh " or "nh " at the start
  clean = clean.replace(/^(nnh|nh)\s+/, '');
  
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
  return clean.replace(/[^a-z0-9]/g, '');
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
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;

  // Reject pure numbers (e.g. "7981", "1841", "001") - these are warehouse codes (mã kho), NEVER supermarket names!
  if (/^\d+$/.test(trimmed)) return false;

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

  // Reject BI report headers / metadata lines unless having explicit store prefix
  if (
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
    const hasStorePrefix = /^(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)[_\s-]|^\d+\s*[-–—]\s*/i.test(upper);
    if (!hasStorePrefix) return false;
  }

  return true;
};

/**
 * Normalize a store name for use as a Supabase/Firestore document ID (primary key).
 * Converts to UPPERCASE and trims whitespace so that "Láng Tròn" and "LÁNG TRÒN"
 * always map to the same row, preventing duplicate documents.
 * Slashes '/' are replaced with '-' so Firestore document paths remain valid.
 */
export const normalizeStoreId = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!isValidStoreName(trimmed)) {
    console.warn(`[normalizeStoreId] Rejected invalid store name: "${trimmed}"`);
    return '';
  }
  return trimmed.normalize('NFC').toUpperCase().replace(/\//g, '-');
};

export const normalize = (s: string) => {
  if (!s) return "";
  // NFC normalization and basic cleaning
  const basic = s.trim().normalize('NFC').replace(/[\s\-_]+/g, ' ').toLowerCase();
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
  const traGopMatch = val.match(/T[ỉi]\s*tr[ọo]ng\s*tr[ảa]\s*g[óo]p\s*\n\s*([\d,.]+)%/i);
  if (traGopMatch) {
    topInstallmentRate = cleanNum(traGopMatch[1]);
  }

  let topDtqd = 0;
  const dtqdMatch = val.match(/DT\s*quy\s*đổi\s*\n\s*([\d,.]+)/i);
  if (dtqdMatch) {
    topDtqd = cleanNum(dtqdMatch[1]);
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
  
  let biWebHeaderStartIdx = -1;
  let biWebDetectedHeaders: string[] = [];
  
  for (let i = 0; i < rawLines.length; i++) {
    const lower = rawLines[i].trim().toLowerCase();
    if (biWebKnownHeadersSet.has(lower)) {
      if (biWebHeaderStartIdx === -1) biWebHeaderStartIdx = i;
      biWebDetectedHeaders.push(rawLines[i].trim());
    } else if (biWebHeaderStartIdx !== -1) {
      if (biWebDetectedHeaders.length >= 5) break; // Enough consecutive headers found
      // Reset if not enough consecutive headers
      biWebHeaderStartIdx = -1;
      biWebDetectedHeaders = [];
    }
  }
  
  // If we found >= 5 consecutive known BI web headers as separate lines, reconstruct tab-separated format
  if (biWebDetectedHeaders.length >= 5) {
    const biWebHeaderEndIdx = biWebHeaderStartIdx + biWebDetectedHeaders.length;
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
      
      // Check if line is a store name or "Tổng" row
      if (isSupermarketName(line) || line.toUpperCase().startsWith('TỔNG')) {
        // Check if the next lines are individual data values (single numeric/percentage per line)
        let allSingleValues = true;
        const values: string[] = [];
        for (let j = 1; j <= dataColCount && (i + j) < rawLines.length; j++) {
          const valLine = rawLines[i + j].trim();
          // Must be a single numeric value, percentage, or +/- value (allowing spaces e.g. "+ 24.7%")
          if (/^[+-]?\s*[\d,.]+%?$/.test(valLine)) {
            values.push(valLine.replace(/\s+/g, ''));
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
    
    if (lowerLine.includes("stt") || lowerLine.includes("tên siêu thị") || lowerLine.includes("tên miền") || lowerLine.includes("doanh thu qđ") || (lowerLine.includes("siêu thị") && lowerLine.includes("số lượng"))) {
      const cols = cleanLine.split(/\t|\s{2,}/);
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
        const lower = c.toLowerCase();
        return lower.includes("target (qđ)") || lower.includes("target qđ") || lower.includes("mục tiêu qđ");
      });
      targetSTIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower === "target" || lower === "mục tiêu" || (lower.includes("target") && !lower.includes("qđ"));
      });
      actualRealIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("dtlk") || lower.includes("doanh thu lũy kế") || lower === "doanh thu";
      });
      actualVirtualIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("dtqđ") || lower.includes("doanh thu quy đổi") || lower.includes("doanh thu qđ") || lower.includes("dt qđ");
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
    
    if (foundIdx === -1 && cols.length >= 2) {
      if (cols[0] && isNaN(Number(cols[0].replace(/,/g, ''))) && cols[0].length > 3 && isValidStoreName(cols[0])) {
        foundIdx = 0;
      } else if (cols[1] && isNaN(Number(cols[1].replace(/,/g, ''))) && cols[1].length > 3 && isValidStoreName(cols[1])) {
        foundIdx = 1;
      } else if (cols[2] && isNaN(Number(cols[2].replace(/,/g, ''))) && cols[2].length > 3 && isValidStoreName(cols[2])) {
        foundIdx = 2;
      }
    }

    if (foundIdx !== -1) {
      nameColIdx = foundIdx;
      marketName = formatMarketName(cols[nameColIdx].trim());
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

        // New BI Web layout: [SL, DTQĐ, % TT, DT, Target, % HT, TB3T, % TT] (has % TT at index 7)
        if (dataCols.length >= 8 && (dataCols[7]?.includes('%') || dataCols[7]?.includes('+') || dataCols[7]?.includes('-'))) {
          luotBillBanHangVal = cleanNum(dataCols[0]);
          actualVirtualVal = cleanNum(dataCols[1]);
          actualRealVal = cleanNum(dataCols[3]);
          targetQDVal = cleanNum(dataCols[4]);
          percentHTVal = cleanNum(dataCols[5]);
        } else if (actualVirtualIdx !== -1 && actualVirtualIdx < cols.length) {
          actualVirtualVal = cleanNum(cols[actualVirtualIdx]);
          targetQDVal = targetQDIdx !== -1 && targetQDIdx < cols.length ? cleanNum(cols[targetQDIdx]) : 0;
          percentHTVal = percentHTIdx !== -1 && percentHTIdx < cols.length ? cleanNum(cols[percentHTIdx]) : 0;
          actualRealVal = actualRealIdx !== -1 && actualRealIdx < cols.length ? cleanNum(cols[actualRealIdx]) : 0;
          luotBillBanHangVal = luotBillBanHangIdx !== -1 && luotBillBanHangIdx < cols.length ? cleanNum(cols[luotBillBanHangIdx]) : 0;
          luotBillThuHoVal = luotBillThuHoIdx !== -1 && luotBillThuHoIdx < cols.length ? cleanNum(cols[luotBillThuHoIdx]) : 0;
          if (tyTrongTraGopIdx !== -1 && tyTrongTraGopIdx < cols.length) {
            installmentRateVal = cleanNum(cols[tyTrongTraGopIdx]);
          }
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

        // Explicit user rule: DT TRẢ GÓP = CỘT THỨ 2 BÊN PHẢI SANG
        if (dataCols.length >= 8) {
          const lastIdx = dataCols.length - 1;
          if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
          if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
          if (!percentTTVal) percentTTVal = cleanNum(dataCols[lastIdx - 2]);
          if (!tb3ThangVal) tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
        } else if (dataCols.length >= 4) {
          const lastIdx = dataCols.length - 1;
          if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
          if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
        }
        if (!dtTraGopVal && cols.length >= 4) {
          dtTraGopVal = cleanNum(cols[cols.length - 2]);
        }
        if (!percentTraGopVal && cols.length >= 4) {
          percentTraGopVal = cleanNum(cols[cols.length - 1]);
        }

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
            installmentRate: installmentRateVal || topInstallmentRate,
            luotBillBanHang: luotBillBanHangVal,
            luotBillThuHo: luotBillThuHoVal,
            dtckThang: 0,
            luotBill: luotBillBanHangVal,
            tb3Thang: tb3ThangVal,
            percentTT: percentTTVal,
            dtTraGop: dtTraGopVal,
            percentTraGop: percentTraGopVal,
            isExplicitTarget: true,
            isSummary: marketName.toUpperCase().includes('TỔNG')
          });
        }
        continue;
      }

      // Priority 1: "BC TỔNG HỢP CỤM" or LUYKE page structure
      if (isBcTongHopCum || pageType === 'LUYKE') {

        // If header indices were detected (e.g. BI web format with DOANH THU QĐ column),
        // use them instead of fixed positional mapping
        if (actualVirtualIdx !== -1 && actualVirtualIdx < cols.length) {
          actualVirtual = cleanNum(cols[actualVirtualIdx]);
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

          // Explicit user rule: DT TRẢ GÓP = CỘT THỨ 2 BÊN PHẢI SANG
          if (dataCols.length >= 8) {
            const lastIdx = dataCols.length - 1;
            if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
            if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
            if (!percentTTVal) percentTTVal = cleanNum(dataCols[lastIdx - 2]);
            if (!tb3ThangVal) tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
          } else if (dataCols.length >= 4) {
            const lastIdx = dataCols.length - 1;
            if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
            if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
          }
          if (!dtTraGopVal && cols.length >= 4) {
            dtTraGopVal = cleanNum(cols[cols.length - 2]);
          }
          if (!percentTraGopVal && cols.length >= 4) {
            percentTraGopVal = cleanNum(cols[cols.length - 1]);
          }

          const percentHTTargetDuKienLNTTVal = percentHTTargetDuKienLNTTIdx !== -1 && percentHTTargetDuKienLNTTIdx < cols.length
            ? cleanNum(cols[percentHTTargetDuKienLNTTIdx]) : 0;

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
              percentHTTargetDuKienLNTT: percentHTTargetDuKienLNTTVal,
              installmentRate: installmentRateVal,
              dtckThang: 0,
              luotBillBanHang: luotBillBanHangVal,
              luotBillThuHo: luotBillThuHoVal,
              tb3Thang: tb3ThangVal,
              percentTT: percentTTVal,
              dtTraGop: dtTraGopVal,
              percentTraGop: percentTraGopVal,
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

          // Explicit user rule: DT TRẢ GÓP = CỘT THỨ 2 BÊN PHẢI SANG
          if (dataCols.length >= 8) {
            const lastIdx = dataCols.length - 1;
            if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
            if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
            if (!percentTTVal) percentTTVal = cleanNum(dataCols[lastIdx - 2]);
            if (!tb3ThangVal) tb3ThangVal = cleanNum(dataCols[lastIdx - 3]);
          } else if (dataCols.length >= 4) {
            const lastIdx = dataCols.length - 1;
            if (!percentTraGopVal) percentTraGopVal = cleanNum(dataCols[lastIdx]);
            if (!dtTraGopVal) dtTraGopVal = cleanNum(dataCols[lastIdx - 1]);
          }
          if (!dtTraGopVal && cols.length >= 4) {
            dtTraGopVal = cleanNum(cols[cols.length - 2]);
          }
          if (!percentTraGopVal && cols.length >= 4) {
            percentTraGopVal = cleanNum(cols[cols.length - 1]);
          }

          if (!results.some(m => m.name === marketName)) {
            let ma_kho = "";
            const codeMatch = marketName.match(/^([^-]+)/);
            if (codeMatch) {
              ma_kho = codeMatch[1].trim().replace(/[\s_]+/g, '');
            }

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
              installmentRate: installmentRateVal,
              dtckThang: dtckThangVal,
              tb3Thang: tb3ThangVal,
              percentTT: percentTTVal,
              dtTraGop: dtTraGopVal,
              percentTraGop: percentTraGopVal,
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

export const parseCategoryData = (input: string, daysPassed: number, totalDays: number, markets: MarketInfo[], mode: 'REALTIME' | 'LUYKE' = 'REALTIME'): CategoryData[] => {
  const val = input.trim();
  if (!val) return [];

  const cleanNum = (s: string | undefined) => s ? parseFloat(s.replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '')) || 0 : 0;

  // 1. Preprocess lines: Combine standalone supermarket lines with following data numbers line
  const rawLines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lines: string[] = [];

  const isSupermarketLine = (text: string) => {
    const upper = text.toUpperCase().trim();
    const hasSupermarketPrefix = /(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)[_\s-]/i.test(upper) || /^\d+\s*[-–—]\s*(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)/i.test(upper);
    const isTotal = upper === 'TỔNG' || upper.startsWith('TỔNG ') || upper.startsWith('TỔNG (');
    return (hasSupermarketPrefix && !text.includes('Sim') && !text.includes('Thẻ') && !text.includes('thẻ')) || isTotal;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isSupermarketLine(line) && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      const nextCols = nextLine.split(/\t|\s{2,}/);
      if (nextCols.length >= 2 && /^-?[\d,.]+(%?)$/.test(nextCols[0].trim())) {
        lines.push(line + '\t' + nextLine);
        i++;
        continue;
      }
    }
    lines.push(line);
  }

  const results: CategoryData[] = [];
  let currentCatName = "";
  let currentCatType: 'SL' | 'DT' | 'ALL' = 'ALL';
  let currentMarketName = markets.length > 0 ? markets[0].name : "7038";
  
  if (currentMarketName.match(/^\d+$/) && markets.length > 0) {
    const found = markets.find(m => m.name.toUpperCase().includes(currentMarketName));
    if (found) currentMarketName = found.name;
  }

  const sortedMarkets = [...markets].sort((a, b) => b.name.length - a.name.length).map(m => {
    const normName = normalize(m.name);
    const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR|BHX)\s*-\s*/i, ''));
    const codeMatch = m.name.match(/^([^-]+)/);
    const code = codeMatch ? codeMatch[1].trim() : "";
    return { ...m, normName, nameWithoutPrefix, code };
  });
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Split by tabs or double spaces
    const cols = line.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length === 0) continue;

    // Detect if this line defines category type (e.g. "DOANH THU (RT)" or "SỐ LƯỢNG (RT)")
    const fullLineUpper = line.toUpperCase();
    if (fullLineUpper.includes('DOANH THU (RT)') || (fullLineUpper.includes('DOANH THU') && !fullLineUpper.includes('HỢP NHẤT')) || fullLineUpper.includes('DTLK') || fullLineUpper.includes('DT (RT)')) {
      currentCatType = 'DT';
      continue;
    }
    if (fullLineUpper.includes('SỐ LƯỢNG (RT)') || fullLineUpper.includes('SỐ LƯỢNG') || fullLineUpper.includes('SLLK') || fullLineUpper.includes('SL (RT)')) {
      currentCatType = 'SL';
      continue;
    }

    // Detect if this line has a store name in col 0, 1, or 2
    let storeColIdx = -1;
    for (let c = 0; c < Math.min(cols.length, 3); c++) {
      const colVal = cols[c];
      if (colVal.toLowerCase().startsWith('tổng') || isSupermarketLine(colVal) || sortedMarkets.some(m => {
        const normC = normalize(colVal);
        return normC.includes(m.normName) || (m.nameWithoutPrefix.length > 3 && normC.includes(m.nameWithoutPrefix)) || (m.code.length >= 3 && normC.includes(m.code));
      })) {
        storeColIdx = c;
        break;
      }
    }

    // The name column (category name, store name, or "Tổng")
    let firstCol = storeColIdx !== -1 ? cols[storeColIdx] : cols[0];
    
    // Clean first column leading numbers safely
    firstCol = firstCol.replace(/^\d+[\.\t]\s*/, '').replace(/^\d+\s+(?!\d)/, '').trim();
    const normFirstCol = normalize(firstCol);

    if ((normFirstCol.includes("tong") && firstCol.toLowerCase().startsWith("tổng") && !normFirstCol.includes("sim tong")) || 
        normFirstCol.includes("ho tro bi lien he") || 
        normFirstCol.includes("copyright") ||
        normFirstCol.includes("chuong trinh") ||
        normFirstCol.includes("chép link") ||
        normFirstCol.includes("toàn công ty")) {
      continue;
    }

    // Extract numbers from subsequent columns
    const numStartIndex = storeColIdx !== -1 ? storeColIdx + 1 : 1;
    const dataNumbers: string[] = [];
    for (let j = numStartIndex; j < cols.length; j++) {
      const col = cols[j];
      // Match number or percent
      if (/^-?[\d,.]+(%?)$/.test(col)) {
        dataNumbers.push(col);
      }
    }

    const isHeaderLine = normFirstCol.includes('target') || normFirstCol.includes('tháng') || normFirstCol.includes('đự kiến') || normFirstCol.includes('rank') || normFirstCol.includes('dự kiến') || normFirstCol.includes('hạng vùng');
    const isDataLine = (dataNumbers.length >= 2) && 
                       !isHeaderLine && 
                       (storeColIdx !== -1 || firstCol.toLowerCase().startsWith('tổng') || isSupermarketLine(firstCol));

    if (isDataLine) {
      if (firstCol.toLowerCase().startsWith('tổng')) {
        continue;
      }
      
      // Update market name if matched
      const matchedMarket = sortedMarkets.find(m => {
        return normFirstCol.includes(m.normName) || 
               (m.nameWithoutPrefix.length > 3 && normFirstCol.includes(m.nameWithoutPrefix)) ||
               (m.code.length >= 3 && normFirstCol.includes(m.code));
      });
      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
      } else {
        currentMarketName = formatMarketName(firstCol);
      }

      let actual = 0;
      let target = 0;
      
      if (mode === 'LUYKE') {
        if (dataNumbers.length >= 2) {
          actual = cleanNum(dataNumbers[0]);
          target = cleanNum(dataNumbers[1]);
        }
      } else {
        if (dataNumbers.length >= 2) {
          actual = cleanNum(dataNumbers[0]);
          target = cleanNum(dataNumbers[1]);
        }
      }
      
      actual = Math.round(actual * 10) / 10;
      target = Math.round(target * 10) / 10;
      
      let rate = 0;
      if (dataNumbers.length >= 3 && dataNumbers[2].includes('%')) {
        rate = cleanNum(dataNumbers[2]);
      } else if (target > 0) {
        rate = (actual / target) * 100;
      }
      rate = Math.round(rate * 10) / 10;
      
      let extractedName = currentCatName;
      if (extractedName) {
        // Strip leading program index e.g. "827-Nồi cơm" -> "Nồi cơm"
        extractedName = extractedName.replace(/^\d+[-_.\s]+\s*/, '').trim();

        const trimmedUpper = extractedName.trim().toUpperCase();
        if (trimmedUpper === 'DTLK' || trimmedUpper === 'SLLK') {
          extractedName = trimmedUpper;
        } else {
          if (/^(DTLK|SLLK)\b/i.test(extractedName)) {
            extractedName = extractedName.replace(/^(DTLK|SLLK)\s*[-_]*\s*/i, '').trim();
          }
          if (/\b(DTLK|SLLK)$/i.test(extractedName)) {
            extractedName = extractedName.replace(/\s*[-_]*\s*(DTLK|SLLK)$/i, '').trim();
          }
          if (extractedName.match(/SLLK|DTLK/i)) {
            const parts = extractedName.split(/SLLK|DTLK/i);
            const firstPart = parts[0].trim();
            if (firstPart) {
              extractedName = firstPart;
            } else {
              extractedName = parts.slice(1).join(' ').trim();
            }
          }
        }
        extractedName = extractedName.replace(/SL REALTIME|DT REALTIME/gi, '').trim();
        extractedName = extractedName.replace(/^[-_]+|[-_]+$/g, '').trim();
        
        const targetMatch = extractedName.match(/(.+?)\bTARGET\b/i);
        if (targetMatch) {
          extractedName = targetMatch[1].trim();
        }
        
        if (extractedName && extractedName !== "Miền của tôi" && !results.some(r => r.name === extractedName && r.marketName === currentMarketName && r.type === currentCatType)) {
          results.push({
            name: extractedName,
            target,
            actual,
            rate,
            marketName: currentMarketName,
            type: currentCatType,
            revenue: actual,
            group: 'ALL'
          });
        }
      }
      continue;
    }

    if (!isDataLine) {
      if (!firstCol.startsWith("Tổng")) {
        const catName = cols[0];
        const lowerCat = catName.toLowerCase();
        const isHeaderKeyword = [
          'dtlk', 'sllk', 'target', '% ht', 'du kien', 'dự kiến', 'xep hang', 'xếp hạng',
          'top/bottom', 'miền của tôi', 'mien cua toi', 'tháng', 'thang', 'realtime',
          'phòng ban', 'phong ban', 'nhân viên', 'nhan vien', 'stt', 'tỷ lệ', 'ty le',
          'đạt', 'dat', 'hạng vùng', 'doanh thu (rt)', 'số lượng (rt)', 'chương trình'
        ].some(kw => lowerCat === kw || lowerCat.startsWith(kw + ' ') || lowerCat.includes('\t') || lowerCat.includes('  '));

        let catType: 'SL' | 'DT' | 'ALL' = currentCatType;
        const fullLine = line.trim();
        if (fullLine.match(/SL Realtime|SL REALTIME|SLLK|\bSL\b|số lượng|so luong|quantity/i)) catType = 'SL';
        else if (fullLine.match(/DT Realtime|DT REALTIME|DTLK|\bDT\b|doanh thu|revenue/i)) catType = 'DT';

        const isMarket = isSupermarketLine(catName);
        
        // Ensure catName is a valid category name:
        // - Must contain at least one letter
        // - Must not be pure numbers/symbols/percentages
        // - Must not be an employee name / ID line
        // - Must not be system messages or timestamps
        const isEmpOrNumber = /^\d{4,8}\s*[-–—]/.test(catName) || 
                              /[-–—]\s*\d{4,8}/.test(catName) || 
                              /^[\d\s,.\-+/%:()]+$/.test(catName) || 
                              !/[a-zA-Zà-ỹÀ-Ỹ]/.test(catName) ||
                              lowerCat.includes('cập nhật lúc') ||
                              lowerCat.includes('cap nhat luc') ||
                              lowerCat.includes('đã copy') ||
                              lowerCat.includes('da copy');

        if (!isMarket && catName.length > 0 && !isHeaderKeyword && !isEmpOrNumber) {
          currentCatName = catName.replace(/^\d+[-_.\s]+\s*/, '').trim();
          currentCatType = catType;
        }
      }
      continue;
    }
  }
  return results;
};

export const parseStaffRankData = (input: string): StaffData[] => {
  const val = input.trim();
  if (!val) return [];
  console.log('[Utils] Parsing Staff Rank Data, length:', val.length);
  let rawLines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Preprocessing: Detect BI web line-separated header format and skip individual header lines
  const biWebStaffHeaders = new Set(["nhân viên", "số lượng", "doanh thu qđ", "% tỉ trọng", "doanh thu", "target", "% ht target", "tb 3 tháng", "% tt", "dt dự kiến", "dt trả góp", "% trả góp"]);
  rawLines = rawLines.filter(l => !biWebStaffHeaders.has(l.trim().toLowerCase()));
  
  // Preprocessing: Combine standalone staff name lines with following tab-separated data line
  const isStaffName = (text: string) => {
    return /^\d+\s*[-–—]\s*[A-ZĐÀ-ỹa-z]/.test(text) || /^(online|administrator)\s*[-–—]/i.test(text) || text.toUpperCase().startsWith('TỔNG');
  };
  
  const preprocessedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isStaffName(line) && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      const nextCols = nextLine.split(/\t/);
      // If next line has multiple tab-separated values starting with a number, combine
      if (nextCols.length >= 3 && /^-?[\d,.]+(%?)$/.test(nextCols[0].trim())) {
        preprocessedLines.push(line + '\t' + nextLine);
        i++;
        continue;
      }
    }
    preprocessedLines.push(line);
  }
  
  const lines = preprocessedLines;
  console.log('[Utils] Total lines to parse:', lines.length);
  
  const staffMap = new Map<string, StaffData>();
  let dtlkIdx = -1;
  let dtqdIdx = -1;

  const cleanNum = (s: string) => {
    if (!s) return 0;
    let str = String(s).trim();
    if (!str) return 0;
    
    // Percentage handling
    if (str.includes('%')) {
      str = str.replace(/%/g, '').replace(/,/g, '.').trim();
      const n = parseFloat(str);
      return isNaN(n) ? 0 : n;
    }

    // Remove all non-numeric characters except comma, dot and minus
    let cleaned = str.replace(/[^\d,.-]/g, '');
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
      if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(/,/g, '.');
      }
    } else if (lastDot !== -1) {
      const parts = cleaned.split('.');
      if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  };

  lines.forEach((line, lineIdx) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Try to split by tab first to preserve empty columns
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length < 3) {
      // Fallback to multiple spaces if not tab-separated
      cols = line.split(/ {2,}/).map(c => c.trim()).filter(c => c.length > 0);
    }
    
    if (dtlkIdx === -1) {
      const lowerCols = cols.map(c => c.toLowerCase());
      const idx = lowerCols.indexOf('dtlk');
      if (idx !== -1) {
        dtlkIdx = idx;
        dtqdIdx = lowerCols.indexOf('dtqđ');
        return;
      }
    }

    let staffPart = "";
    let staffColIdx = -1;

    // Strategy: Find a column that looks like "Name - ID" or "ID - Name"
    // Prioritize ID length >= 4 to distinguish from store codes
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const m1 = col.match(/(.+)[\s-–—]+(\d+)$/);
      const m2 = col.match(/^(\d+)[\s-–—]+(.+)$/);
      
      if (m1 || m2) {
        const id = m1 ? m1[2] : m2![1];
        const name = m1 ? m1[1] : m2![2];
        
        if (id.length >= 4 && name.match(/[a-zA-ZÀ-ỹ]/)) {
          staffPart = col;
          staffColIdx = i;
          break;
        }
      }
    }

    // Fallback: If no 4+ digit ID found, try any ID
    if (!staffPart) {
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const m1 = col.match(/(.+)[\s-–—]+(\d+)$/);
        const m2 = col.match(/^(\d+)[\s-–—]+(.+)$/);
        
        if (m1 || m2) {
          const name = m1 ? m1[1] : m2![2];
          if (name.match(/[a-zA-ZÀ-ỹ]/)) {
            staffPart = col;
            staffColIdx = i;
            break;
          }
        }
      }
    }

    if (staffPart) {
      const match1 = staffPart.match(/(.+)[\s-–—]+(\d+)$/);
      const match2 = staffPart.match(/^(\d+)[\s-–—]+(.+)$/);
      
      let fullName = "";
      let id = "";
      
      if (match1) {
        fullName = match1[1].replace(/[-_]+$/, '').trim();
        id = match1[2].trim();
      } else if (match2) {
        id = match2[1].trim();
        fullName = match2[2].replace(/[-_]+$/, '').trim();
      }

      // Only take numbers from columns AFTER the staff column to avoid store codes
      const dataCols = cols.slice(staffColIdx + 1);
      
      // Filter out non-numeric columns and extract numbers
      let numbers: string[] = [];
      dataCols.forEach(col => {
        const match = col.match(/-?[\d,.]+/);
        if (match) {
          numbers.push(match[0]);
        }
      });
      
      // Extract store name from columns BEFORE the staff column
      let storeName = 'N/A';
      if (staffColIdx > 0) {
        // Skip the first column if it's just a small number (STT)
        const firstCol = cols[0];
        if (cols.length > 2 && /^\d+$/.test(firstCol) && parseInt(firstCol) < 1000) {
          storeName = cols.slice(1, staffColIdx).join(' ') || 'N/A';
        } else {
          storeName = cols.slice(0, staffColIdx).join(' ');
        }
      }

      if (fullName && fullName.match(/[a-zA-ZÀ-ỹ]/) && id && id.match(/^\d+$/)) {
        // Check for BI web employee format (Image 2):
        // Columns: SỐ LƯỢNG (col 0) | DOANH THU QĐ (col 1) | % TỈ TRỌNG (col 2) | DOANH THU (col 3) | ...
        const isBiWebStaffTable = (dataCols.length >= 3 && dataCols[2]?.includes('%')) ||
                                  (dataCols.length >= 4 && (dataCols[2]?.includes('%') || dataCols[1]?.includes('%') || dataCols.some(c => c === '—' || c === '-')));
        const hasEmDash = dataCols.some(c => c === '—' || c === '-');
        const biWebColCount = dataCols.length;
        
        if (isBiWebStaffTable || (hasEmDash && biWebColCount >= 8)) {
          // BI web employee format detected
          // Col 0 = SỐ LƯỢNG
          // Col 1 = DOANH THU QĐ (virtualVal)
          // Col 2 = % TỈ TRỌNG
          // Col 3 = DOANH THU THỰC (actualVal)
          const soLuong = cleanNum(dataCols[0] || '0');
          const dtqd = cleanNum(dataCols[1] || '0');     // DOANH THU QĐ → virtualVal
          // dataCols[2] = % TỈ TRỌNG (skip)
          const dtThuc = dataCols.length > 3 ? cleanNum(dataCols[3] || '0') : 0; // DOANH THU → actualVal

          const staffKey = id;
          if (!staffMap.has(staffKey)) {
            staffMap.set(staffKey, {
              displayName: `${id} - ${fullName.toUpperCase()}`,
              fullId: id,
              department: 'N/A',
              storeName,
              actualVal: dtThuc,      // DOANH THU (real/thực) = REAL column
              virtualVal: dtqd,       // DOANH THU QĐ = DT QĐ column
              effVal: dtThuc > 0 ? Math.round(((dtqd - dtThuc) / dtThuc) * 100 * 10) / 10 : 0,
              target: 0,
              rate: 0
            });
          }
        } else if (dtlkIdx === -1 && numbers.length >= 7) {
          const todayTarget = cleanNum(numbers[0]);
          const todayActual = cleanNum(numbers[1]);
          const todayRate = cleanNum(numbers[2]);
          const accTarget = cleanNum(numbers[3]); 
          const accActual = cleanNum(numbers[4]);
          const forecast = cleanNum(numbers[5]);
          const accRate = cleanNum(numbers[6]);

          const staffKey = id;
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
            
            existing.effVal = (existing.target || 0) > 0 ? Math.round(((existing.actualVal || 0) / (existing.target || 1)) * 100) : 0;
            existing.rate = existing.effVal;
            existing.todayRate = existing.todayTarget! > 0 ? Math.round((existing.todayActual! / existing.todayTarget!) * 100) : 0;
            existing.accRate = existing.accTarget! > 0 ? Math.round((existing.accActual! / existing.accTarget!) * 100) : 0;
          } else {
            staffMap.set(staffKey, {
              displayName: `${id} - ${fullName.toUpperCase()}`,
              fullId: id,
              department: 'N/A',
              storeName,
              actualVal: accActual,
              virtualVal: forecast,
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
        } else if (numbers.length >= 2) {
          // Fallback mapping:
          // Cột 0 -> DT Thực (actualVal)
          // Cột 1 -> DT QĐ (virtualVal)
          // Cột 2 -> Hiệu quả QĐ (effVal)
          let actualVal = cleanNum(numbers[0]);
          let virtualVal = numbers.length > 1 ? cleanNum(numbers[1]) : 0;
          let effVal = numbers.length > 2 ? cleanNum(numbers[2]) : 0;

          // If virtualVal > actualVal and effVal is 0, compute effVal
          if (effVal === 0 && actualVal > 0 && virtualVal > 0) {
            effVal = Math.round(((virtualVal - actualVal) / actualVal) * 100 * 10) / 10;
          }

          const staffKey = id;
          if (staffMap.has(staffKey)) {
            const existing = staffMap.get(staffKey)!;
            if (actualVal > (existing.actualVal || 0)) existing.actualVal = actualVal;
            if (virtualVal > (existing.virtualVal || 0)) existing.virtualVal = virtualVal;
            if (effVal !== 0) existing.effVal = effVal;
          } else {
            staffMap.set(staffKey, {
              displayName: `${id} - ${fullName.toUpperCase()}`,
              fullId: id,
              department: 'N/A',
              storeName,
              actualVal,
              virtualVal,
              effVal,
              target: 0,
              rate: effVal
            });
          }
        }
      }
    }
  });
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
  const idxRevenue = (() => {
    const giaBan1Idx = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
      return (norm.includes('gia ban') && norm.includes('1')) || norm === 'gia ban_1' || norm === 'gia ban 1';
    });
    if (giaBan1Idx !== -1) return giaBan1Idx;
    return getIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'số tiền', 'tổng cộng', 'tiền', 'giá bán']);
  })();
  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxQty = getIdx(['số lượng', 'sl', 'quantity']);
  const idxMarket = getIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm', 'kho', 'cửa hàng']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'ngành hàng', 'nhóm']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng', 'tình trạng nhập trả', 'nhập trả']);

  const colType = idxType !== -1 ? idxType : 3;
  const colMethod = idxMethod !== -1 ? idxMethod : 3;
  const colStatus = idxStatus;
  const colStaffName = idxStaffName !== -1 ? idxStaffName : 23;
  const colStaffId = idxStaffId !== -1 ? idxStaffId : 22;
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 37;
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colQty = idxQty !== -1 ? idxQty : 35;
  const colMarket = idxMarket !== -1 ? idxMarket : 1;
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40;
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

  const colMaYcx = idxMaYcx !== -1 ? idxMaYcx : 0;
  const colNgayTao = idxNgayTao !== -1 ? idxNgayTao : 2;
  const colKhachHang = idxKhachHang !== -1 ? idxKhachHang : 16;
  const colDienThoai = idxDienThoai !== -1 ? idxDienThoai : 17;

  // Lọc ra danh sách các cột cần giữ lại nội dung
  const essentialCols = [
    colType, colMethod, colStatus, colStaffName, colStaffId,
    colRevenue, colProduct, colQty, colMarket, colColumnAO, colReturnStatus,
    colMaYcx, colNgayTao, colKhachHang, colDienThoai,
    idxSmallCat, idxProductCode, idxNhaSanXuat, idxThuTien,
    idxDtqdCol, idxDtThucCol
  ];
  const keepIndices = new Set(essentialCols.filter(i => i !== -1 && i !== undefined));

  const validRows = [];
  // Giữ nguyên dòng tiêu đề (Header) và các dòng bên trên
  for (let i = 0; i <= headerIdx; i++) {
    validRows.push(rows[i]);
  }

  // Tối ưu siêu mạnh: XOÁ TRẮNG (null out) nội dung của các cột KHÔNG QUAN TRỌNG.
  // Mặc dù mảng vẫn giữ nguyên số lượng cột để không phá vỡ UI Bảng Gốc,
  // nhưng các chuỗi rỗng ('') sẽ được GZIP nén lại chỉ còn vài bytes! Giúp vượt qua giới hạn 1MB của Supabase.
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 3) continue;
    validRows.push(cols.map((val, idx) => keepIndices.has(idx) ? val : ''));
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
  const idxRevenue = (() => {
    const giaBan1Idx = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
      return (norm.includes('gia ban') && norm.includes('1')) || norm === 'gia ban_1' || norm === 'gia ban 1';
    });
    if (giaBan1Idx !== -1) return giaBan1Idx;
    return getIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'số tiền', 'tổng cộng', 'tiền', 'giá bán']);
  })();
  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxQty = getIdx(['số lượng', 'sl', 'quantity']);
  const idxMarket = getIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm', 'kho', 'cửa hàng']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'ngành hàng', 'nhóm']);
  const idxNganhHang = (() => {
    const exact = header.findIndex(h => h === 'ngành hàng' || h === 'nganh hang' || h === 'ngành hàng lớn' || h === 'nganh hang lon');
    if (exact !== -1) return exact;
    return header.findIndex(h => h.includes('ngành hàng') || h.includes('nganh hang') || h.includes('ngành') || h.includes('nganh'));
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

  console.log('[parseYcxData] Column indices detected:', { idxStaffName, idxRevenue, idxMarket, idxStatus, idxType, idxMethod, idxOrderId, idxNganhHang, idxNhomHang });

  // Fallback indices if header not found
  const colType = idxType;
  const colMethod = idxMethod;
  const colStatus = idxStatus;
  const colStaffName = idxStaffName;
  const colRevenue = idxRevenue;
  const colProduct = idxProduct;
  const colQty = idxQty;
  const colMarket = idxMarket;
  const colColumnAO = idxColumnAO;
  const colNganhHang = idxNganhHang;
  const colNhomHang = idxNhomHang;
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
    
    const revenueValue = parseFloat(revenueStr) || 0;
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
  const idxRevenue = (() => {
    const giaBan1Idx = header.findIndex(h => {
      const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
      return (norm.includes('gia ban') && norm.includes('1')) || norm === 'gia ban_1' || norm === 'gia ban 1';
    });
    if (giaBan1Idx !== -1) return giaBan1Idx;
    return getIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'số tiền', 'tổng cộng', 'tiền', 'giá bán']);
  })();
  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng', 'tình trạng nhập trả', 'nhập trả']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'ngành hàng', 'nhóm']);
  const idxNganhHang = (() => {
    const exact = header.findIndex(h => h === 'ngành hàng' || h === 'nganh hang' || h === 'ngành hàng lớn' || h === 'nganh hang lon');
    if (exact !== -1) return exact;
    return header.findIndex(h => h.includes('ngành hàng') || h.includes('nganh hang') || h.includes('ngành') || h.includes('nganh'));
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
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 37;
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colReturnStatus = idxReturnStatus !== -1 ? idxReturnStatus : 44; // Cột AS (Index 44)
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40;
  const colNganhHang = idxNganhHang;
  const colNhomHang = idxNhomHang;

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

    if (isSales && staff && revenueStr && !isMaNapTien) {
      const revenue = Math.round(parseFloat(revenueStr) || 0);
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
    'stt', 'luong', 'thuong', 'doanh thu', 'he so'
  ];

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

    if (name || id) {
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

