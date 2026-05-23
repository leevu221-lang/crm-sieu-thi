/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MarketInfo, CategoryData, StaffData, StaffMatrixData, YcxStaffData, YcxItemDetail, YcxRankData } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
    const saved = localStorage.getItem('BI_MARKET_REGISTRY_V1');
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
      localStorage.setItem('BI_MARKET_REGISTRY_V1', JSON.stringify(registry));
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
  if (!name) return false;
  
  // Normalize and clean string
  // Use both NFC and NFD to handle different ways of encoding Vietnamese characters
  const nfc = name.trim().normalize('NFC').toUpperCase();
  const nfd = name.trim().normalize('NFD').toUpperCase();
  
  // Core keywords to look for
  // We include both the full prefixes and the core parts for maximum compatibility
  // Also include the ETH character (Ð) which is sometimes used instead of Đ
  const keywords = [
    'ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR', 
    'DML', 'DMM', 'DMS', 'DMS3',
    'ÐML', 'ÐMM', 'ÐMS', 'ÐMS3',
    'ML', 'MM', 'MS', 'MS3'
  ];
  
  // Check if any keyword exists in the name (using both normalization forms)
  const isValid = keywords.some(k => nfc.includes(k) || nfd.includes(k));
  
  // if (!isValid) {
  //   console.warn(`[isValidStoreName] Invalid store name: "${name}" (NFC: "${nfc}", NFD: "${nfd}")`);
  // }
  
  return isValid;
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
  if (typeof s === 'number') return s;
  let clean = s.replace(/[^\d,.-]/g, '');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    else return parseFloat(clean.replace(/,/g, ''));
  } else if (lastComma !== -1) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 3) return parseFloat(clean.replace(',', ''));
    return parseFloat(clean.replace(',', '.'));
  } else if (lastDot !== -1) {
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 3) return parseFloat(clean.replace('.', ''));
    return parseFloat(clean);
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
  const lines = val.split('\n');
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

  const prefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR", "TỔNG"];
  const normalizedVal = val.toLowerCase();
  const hasBiHeader = normalizedVal.includes("bi tổng quan") || normalizedVal.includes("1. bi tổng quan");
  const hasBcHeader = val.includes("BC TỔNG HỢP CỤM") || normalizedVal.includes("bc tổng hợp cụm");
  
  // Relaxed check: Allow processing if it looks like market data
  const isBcTongHopCum = hasBcHeader || pageType === 'LUYKE' || pageType === 'RTST' || normalizedVal.includes("tên siêu thị") || normalizedVal.includes("ngành hàng") || normalizedVal.includes("tổng");

  if (pageType === 'RTST') {
    console.log(`[parseMarketData] RTST mode. Input length: ${val.length}, Lines: ${lines.length}`);
  }

  if (!isBcTongHopCum) {
    if (pageType === 'RTST') console.log(`[parseMarketData] isBcTongHopCum is false for RTST. Headers: hasBcHeader=${hasBcHeader}`);
    return [];
  }

  let tyTrongTraGopIdx = -1;
  let headerNameIdx = -1;
  let targetQDIdx = -1;
  let targetSTIdx = -1;
  let actualRealIdx = -1;
  let actualVirtualIdx = -1;
  let dtHomQuaIdx = -1;
  let percentHTIdx = -1;
  let offset = 0; // Định nghĩa offset

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
    
    if (lowerLine.includes("stt") || lowerLine.includes("tên siêu thị")) {
      const cols = cleanLine.split(/\t|\s{2,}/);
      headerNameIdx = cols.findIndex(c => c.toLowerCase().includes("tên siêu thị"));
      tyTrongTraGopIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("tỷ trọng trả góp") || lower.includes("tỷ trọng tg") || lower.includes("tt tg");
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
        return lower.includes("dtlk") || lower.includes("doanh thu lũy kế");
      });
      actualVirtualIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("dtqđ") || lower.includes("doanh thu quy đổi");
      });
      dtHomQuaIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("hôm qua") || lower.includes("dt hôm qua");
      });
      percentHTIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("% ht") || lower.includes("tiến độ");
      });
      continue;
    }

    if (lowerLine.includes("hỗ trợ bi liên hệ user") || 
        lowerLine.includes("copyright © bi report") ||
        lowerLine?.startsWith("tên miền")) {
      continue;
    }
    
    // Allow "Tổng" if it has numbers, but skip if it's just a header
    
    const cols = cleanLine.split(/\t|\||\s{2,}/).map(c => c.trim());
    // Remove trailing empty strings to ensure accurate negative indexing
    while (cols.length > 0 && cols[cols.length - 1] === "") {
      cols.pop();
    }

    if (cols.length < 2) continue;

    // Reset variables for each iteration
    marketName = "";
    targetST = 0;
    actualReal = 0;
    actualVirtual = 0;
    percentHT = 0;
    percentQD = 0;
    dtHomQua = 0;
    nameColIdx = -1;

    if (isBcTongHopCum) {
      // Check first, second or third column for prefixes
      let foundIdx = -1;
      for (let i = 0; i <= 2; i++) {
        if (cols[i] && prefixes.some(p => cols[i].trim().toUpperCase().includes(p))) {
          foundIdx = i;
          break;
        }
      }
      
      if (foundIdx === -1) {
        // If no prefix but we are in LUYKE mode, try to find the name column by checking if it's a string
        if (cols[0] && isNaN(Number(cols[0].replace(/,/g, ''))) && cols[0].length > 3) {
          foundIdx = 0;
        } else if (cols[1] && isNaN(Number(cols[1].replace(/,/g, ''))) && cols[1].length > 3) {
          foundIdx = 1;
        } else if (cols[2] && isNaN(Number(cols[2].replace(/,/g, ''))) && cols[2].length > 3) {
          foundIdx = 2;
        }
      }

      if (foundIdx !== -1) {
        nameColIdx = foundIdx;
        marketName = formatMarketName(cols[nameColIdx].trim());
        console.log("[PARSE_DEBUG] Found market:", marketName, "at idx:", nameColIdx, "Cols:", cols);
      } else {
        continue;
      }
    } else if (cols.length >= 3) {
      let found = "";
      for (let i = 0; i < Math.min(cols.length, 5); i++) {
        const val = cols[i].trim().toUpperCase();
        if (prefixes.some(p => val.includes(p)) || val.includes(" - ") || val.includes("_")) {
          if (!/^\d+$/.test(val)) {
            found = formatMarketName(cols[i].trim());
            nameColIdx = i;
            break;
          }
        }
      }
      marketName = found;
    }
    
    if (!marketName && cols.length >= 2) {
      marketName = formatMarketName(cols[1]?.trim() || "");
      nameColIdx = 1;
    }

    if (marketName) {
      if (pageType === 'RTST') {
        // Strict mapping based on user request:
        // Cột 3 (index 2) -> DOANH THU QUY ĐỔI (actualVirtual)
        // Cột 4 (index 3) -> TAGET QĐ (targetQDVal)
        // Cột 5 (index 4) -> TIẾN ĐỘ THÁNG (percentHTVal)
        // Cột 13 (index 12) -> Tỷ Trọng Trả Góp (installmentRateVal)
        
        const actualVirtual = cleanNum(cols[2]);
        const targetQDVal = cleanNum(cols[3]);
        const percentHTVal = cleanNum(cols[4]);
        const luotBillBanHangVal = cols.length > 9 ? cleanNum(cols[9]) : 0;
        const luotBillThuHoVal = cols.length > 10 ? cleanNum(cols[10]) : 0;
        const installmentRateVal = cols.length > 12 ? cleanNum(cols[12]) : 0;
        
        console.log(`[parseMarketData] RTST Line: "${cleanLine.substring(0, 30)}..." Cols: ${cols.length}, Name: ${marketName}, DTQĐ: ${actualVirtual}, Target: ${targetQDVal}, HT: ${percentHTVal}%, BanHang: ${luotBillBanHangVal}, ThuHo: ${luotBillThuHoVal}`);
        
        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetST: 0, 
            targetQD: targetQDVal,
            actualReal: cleanNum(cols[1]), // DTLK usually at index 1
            actualVirtual,
            dtHomQua: 0,
            percentHT: percentHTVal,
            percentQD: 0,
            installmentRate: installmentRateVal,
            luotBillBanHang: luotBillBanHangVal,
            luotBillThuHo: luotBillThuHoVal,
            dtckThang: 0,
            luotBill: 0,
            isExplicitTarget: true,
            isSummary: marketName === 'TỔNG'
          });
        }
        continue;
      }

      // Priority 1: "BC TỔNG HỢP CỤM" or LUYKE page structure
      if (isBcTongHopCum || pageType === 'LUYKE') {
        // Structure: [0] Name | [1] DT Hôm Qua | [2] DTLK | [3] DT Dự Kiến | [4] DTQĐ | [5] DT Dự Kiến (QĐ) | [6] % HT
        
        dtHomQua = cleanNum(cols[nameColIdx + 1]);
        actualReal = cleanNum(cols[nameColIdx + 2]);
        targetST = cleanNum(cols[nameColIdx + 3]); // DT Dự Kiến
        actualVirtual = cleanNum(cols[nameColIdx + 4]); // DTQĐ
        const targetQDVal = cleanNum(cols[nameColIdx + 5]); // DT Dự Kiến (QĐ)
        percentHT = cleanNum(cols[nameColIdx + 6]); // % HT
        
        let installmentRateVal = 0;
        let dtckThangVal = 0;
        
        if (pageType === 'LUYKE') {
          if (cols.length >= 10) {
            dtckThangVal = cleanNum(cols[cols.length - 10]);
          }
          installmentRateVal = cleanNum(cols[cols.length - 2]);
        } else if (tyTrongTraGopIdx !== -1 && headerNameIdx !== -1) {
          const relativeIdx = tyTrongTraGopIdx - headerNameIdx;
          const dataIdx = nameColIdx + relativeIdx;
          if (cols[dataIdx]) {
            installmentRateVal = cleanNum(cols[dataIdx]);
          }
        } else {
          installmentRateVal = cleanNum(cols[cols.length - 1]);
        }

        if (!results.some(m => m.name === marketName)) {
          // Extract ma_kho from marketName if possible (format: "CODE - NAME")
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
            installmentRate: installmentRateVal,
            dtckThang: dtckThangVal,
            isExplicitTarget: true,
            isSummary: marketName.toUpperCase().includes('TỔNG')
          });
        }
        continue;
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

    const regex = /-?[\d,.]+(%?)/g;
    let match;
    const numberMatches: { value: string, index: number }[] = [];
    while ((match = regex.exec(cleanLine)) !== null) {
      numberMatches.push({ value: match[0], index: match.index });
    }
    
    if (numberMatches.length >= 3) {
      let percentIdx = -1;
      for (let i = numberMatches.length - 1; i >= 0; i--) {
        if (numberMatches[i].value.includes('%')) {
          percentIdx = i;
          break;
        }
      }

      let targetIdx, revenueIdx, realIdx;

      if (percentIdx !== -1) {
        percentHT = cleanNum(numberMatches[percentIdx].value);
        targetIdx = percentIdx - 1;
        revenueIdx = percentIdx - 2;
        realIdx = percentIdx - 3;
      } else {
        percentIdx = numberMatches.length - 1;
        targetIdx = numberMatches.length - 2;
        revenueIdx = numberMatches.length - 3;
        realIdx = numberMatches.length - 4;
        percentHT = cleanNum(numberMatches[percentIdx].value);
      }

      if (targetIdx >= 0 && revenueIdx >= 0) {
        actualReal = realIdx >= 0 ? cleanNum(numberMatches[realIdx].value) : cleanNum(numberMatches[revenueIdx].value);
        actualVirtual = cleanNum(numberMatches[revenueIdx].value);
        
        // If there's a number after percent, it's likely Target (QĐ)
        let isExplicitTarget = false;
        if (percentIdx !== -1 && numberMatches.length > percentIdx + 1) {
          targetST = cleanNum(numberMatches[percentIdx + 1].value);
          isExplicitTarget = true;
        } else {
          const baseTarget = cleanNum(numberMatches[targetIdx].value);
          targetST = baseTarget;
        }
        
        if (targetST > 0 || actualVirtual > 0) {
          const allowedPrefixes = ['ĐMS3', 'ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR'];
          let nameStartIdx = -1;
          const upperLine = cleanLine.toUpperCase();
          
          for (const p of allowedPrefixes) {
            const idx = upperLine.indexOf(p);
            if (idx !== -1 && (nameStartIdx === -1 || idx < nameStartIdx)) {
              nameStartIdx = idx;
            }
          }

          if (nameStartIdx !== -1) {
            let firstDataIdx = (percentIdx !== -1 && percentIdx >= 3) ? percentIdx - 3 : Math.max(0, numberMatches.length - 4);
            const nameEndIdx = numberMatches[firstDataIdx].index;
            let rawName = cleanLine.substring(nameStartIdx, nameEndIdx).trim();
            rawName = rawName.replace(/[-_.\s]+$/, '').trim();
            marketName = formatMarketName(rawName);
          
            if (marketName && !results.some(m => m.name === marketName)) {
              results.push({ name: marketName, targetST, actualReal, actualVirtual, dtHomQua, percentHT, isExplicitTarget });
            }
          }
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

export const parseCategoryData = (input: string, daysPassed: number, totalDays: number, markets: MarketInfo[], mode: 'REALTIME' | 'LUYKE' = 'REALTIME'): CategoryData[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
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
    const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
    const codeMatch = m.name.match(/^([^-]+)/);
    const code = codeMatch ? codeMatch[1].trim() : "";
    return { ...m, normName, nameWithoutPrefix, code };
  });
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Strip leading row numbers (like "1.", "1. ", "1\t", "1 ") safely
    line = line.replace(/^\d+[\.\t]\s*/, '');
    line = line.replace(/^\d+\s+(?!\d)/, '');
    
    const normLine = normalize(line);
    const cols = line.split(/\t|\s{2,}/).map(c => c.trim());
    
    if (normLine.includes("tong") && line.toLowerCase().includes("tổng") || 
        normLine.includes("ho tro bi lien he") || 
        normLine.includes("copyright")) {
      continue;
    }

    if (!line.includes('%')) {
      const matchedMarket = sortedMarkets.find(m => {
        return normLine.includes(m.normName) || 
               (m.nameWithoutPrefix.length > 3 && normLine.includes(m.nameWithoutPrefix)) ||
               (m.code.length >= 3 && normLine.includes(m.code)) ||
               (normLine.length >= 5 && m.normName.includes(normLine));
      });
      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
      } else if (markets.length !== 1) {
        // DO NOT HIJACK currentMarketName if we are explicitly locked to a single store!
        const prefixes = ["ĐML", "ĐMM", "ĐMS3", "ĐMS", "TGD", "AAR"];
        const upperLine = line.toUpperCase();
        for (const p of prefixes) {
          const idx = upperLine.indexOf(p);
          if (idx !== -1 && line.length > 5) {
            currentMarketName = line.substring(idx).trim();
            break;
          }
        }
      }
    }

    const numbers = line.match(/-?[\d,.]+(%?)/g);
    // Nếu dòng chứa từ khóa header thì không coi là DataLine để nó rơi vào nhánh !isDataLine
    const isHeaderLine = normLine.includes('target') || normLine.includes('tháng') || normLine.includes('đự kiến') || normLine.includes('rank') || normLine.includes('dự kiến');                
    const isDataLine = (numbers && (numbers.length >= 3 || (mode === 'LUYKE' && numbers.length >= 2))) && !isHeaderLine;
    
    let dataNumbers = numbers || [];
    if (isDataLine) {
      if (line.toLowerCase().startsWith('tổng')) {
        continue;
      }
      
      const matchedMarketInLine = sortedMarkets.find(m => {
        const normName = normalize(m.name);
        const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
        return normLine.includes(normName) || normLine.includes(nameWithoutPrefix);
      });
      
      if (matchedMarketInLine) {
        currentMarketName = matchedMarketInLine.name;
        // Remove market name from line to avoid matching numbers inside the name
        let lineWithoutName = line;
        const nameIdx = line.toUpperCase().indexOf(matchedMarketInLine.name.toUpperCase());
        if (nameIdx !== -1) {
          lineWithoutName = line.substring(nameIdx + matchedMarketInLine.name.length);
        } else {
          // Try to remove prefix
          const nameWithoutPrefix = matchedMarketInLine.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, '');
          const idx2 = line.toUpperCase().indexOf(nameWithoutPrefix.toUpperCase());
          if (idx2 !== -1) {
            lineWithoutName = line.substring(idx2 + nameWithoutPrefix.length);
          }
        }
        dataNumbers = lineWithoutName.match(/-?[\d,.]+(%?)/g) || [];
      } else {
        // Nếu không khớp siêu thị, có thể đây là dòng dữ liệu ngành hàng (Ngành hàng | Data)
        // Không override currentCatName bằng các dòng data lẻ tẻ nữa
        
        const firstNumMatch = line.match(/-?[\d,.]+(%?)/);
        if (firstNumMatch && firstNumMatch.index !== undefined && firstNumMatch.index > 0) {
           if (mode === 'LUYKE') {
             const potentialCatName = line.substring(0, firstNumMatch.index).trim();
             const cleanCatName = potentialCatName.replace(/^\d+\.\s*/, '').trim();
             if (cleanCatName && !cleanCatName.toLowerCase().startsWith('tổng')) {
               currentCatName = cleanCatName;
               if (currentCatName.match(/SL Realtime|SL REALTIME|SLLK|\bSL\b|số lượng|so luong|quantity/i)) {
                 currentCatType = 'SL';
               } else if (currentCatName.match(/DT Realtime|DT REALTIME|DTLK|\bDT\b|doanh thu|revenue/i)) {
                 currentCatType = 'DT';
               }
               // If no explicit SL/DT tag is found in the name, preserve currentCatType
               // which might have been correctly inherited from a previous header line.
             }
           }
        }
      }
    }
    
    if (!isDataLine) {
      if (!line?.startsWith("Tổng")) {
        // Relax extraction: treat any non-empty, non-total line that isn't a market as a potential category
        let catName = line.trim();
        let catType: 'SL' | 'DT' | 'ALL' = 'ALL';
        
        // Determine type based on keywords, inherit from currentCatType if unknown
        if (catName.match(/SL Realtime|SL REALTIME|SLLK|\bSL\b|số lượng|so luong|quantity/i)) catType = 'SL';
        else if (catName.match(/DT Realtime|DT REALTIME|DTLK|\bDT\b|doanh thu|revenue/i)) catType = 'DT';
        else catType = currentCatType;

        const normCat = normalize(catName);
        const isMarket = sortedMarkets.some(m => {
          const normName = normalize(m.name);
          const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
          
          // Nếu dòng chứa từ khóa của ngành hàng bảo hiểm thì không thể là siêu thị
          if (normCat.includes('bao hiem') || normCat.includes('bh') || normCat.startsWith('bh ')) {
            return false;
          }
          
          return normCat.includes(normName) || normCat.includes(nameWithoutPrefix) || (normCat.includes('-') && normName.includes(normCat));
        });
        
        if (!isMarket && catName.length > 0) {
          currentCatName = catName;
          currentCatType = catType;
        }
      }
      continue;
    }
    
    const lastNumberStr = dataNumbers[dataNumbers.length - 1] || '';
    const hasRank = !lastNumberStr.includes('%') && !isNaN(parseFloat(lastNumberStr));
    
    // if (!hasRank) {
    //   continue;
    // }
    
    const cleanNum = (s: string | undefined) => s ? parseFloat(s.replace(/,/g, '')) : 0;
    
    const percentIndex = dataNumbers.findIndex(n => n.includes('%'));
    let actual = 0;
    let target = 0;
    
    if (mode === 'LUYKE') {
      if (dataNumbers.length >= 2) {
        // Table định dạng: Ngành hàng | Luỹ kế | Target
        // Cột 1 (Luỹ kế), Cột 2 (Target)
        actual = cleanNum(dataNumbers[0]);
        target = cleanNum(dataNumbers[1]);
      }
    } else {
      if (dataNumbers.length >= 2) {
        target = cleanNum(dataNumbers[1]);
        actual = cleanNum(dataNumbers[0]);
      }
    }
    
    actual = Math.round(actual * 10) / 10;
    target = Math.round(target * 10) / 10;
    
    let rate = 0;
    if (target > 0) {
      rate = (actual / target) * 100;
      rate = Math.round(rate * 10) / 10;
    }
    
    let extractedName = currentCatName;
    
    if (extractedName) {
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
      
      if (extractedName && extractedName !== "Miền của tôi") {
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
  }
  return results;
};

export const parseStaffRankData = (input: string): StaffData[] => {
  const val = input.trim();
  if (!val) return [];
  console.log('[Utils] Parsing Staff Rank Data, length:', val.length);
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log('[Utils] Total lines to parse:', lines.length);
  
  const staffMap = new Map<string, StaffData>();
  let dtlkIdx = -1;
  let dtqdIdx = -1;

  const cleanNum = (s: string) => {
    if (!s) return 0;
    // Remove all non-numeric characters except comma, dot and minus
    let cleaned = s.replace(/[^\d,.-]/g, '');
    
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot && lastComma !== -1) {
      // Vietnamese format: 1.234.567,89 -> 1234567.89
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (lastDot > lastComma && lastDot !== -1) {
      // International format: 1,234,567.89 -> 1234567.89
      cleaned = cleaned.replace(/,/g, '');
    } else if (lastComma !== -1 && lastDot === -1) {
      // Only comma: could be thousands separator (1,234) or decimal (1,23)
      // In BI, if 3 digits after comma, usually thousands
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length === 3) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(/,/g, '.');
      }
    } else if (lastDot !== -1 && lastComma === -1) {
      // Only dot: could be thousands separator (1.234) or decimal (1.23)
      const parts = cleaned.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        // Check if it's a small number that could be a decimal (e.g. 1.234 as in 1.2)
        // But usually in BI, 3 digits after dot is thousands
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
    // Prioritize ID length >= 5 to distinguish from store codes
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const m1 = col.match(/(.+)[\s-–—]+(\d+)$/);
      const m2 = col.match(/^(\d+)[\s-–—]+(.+)$/);
      
      if (m1 || m2) {
        const id = m1 ? m1[2] : m2![1];
        const name = m1 ? m1[1] : m2![2];
        
        if (id.length >= 5 && name.match(/[a-zA-ZÀ-ỹ]/)) {
          staffPart = col;
          staffColIdx = i;
          break;
        }
      }
    }

    // Fallback: If no 5+ digit ID found, try any ID
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
        // If we have at least 7 numbers and no DTLK column, it's likely the "Event" format
        if (dtlkIdx === -1 && numbers.length >= 7) {
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
          // Mapping Ver 3.4: 
          // Cột 2 (index 1) -> DT QĐ (numbers[startIndex])
          // Cột 3 (index 2) -> DT Thực (numbers[startIndex + 1])
          // Cột 4 (index 3) -> Hiệu quả QĐ (numbers[startIndex + 2])
          
          let startIndex = 0;
          if (numbers.length > 0) {
            // Tự động tìm cột dữ liệu đầu tiên (bỏ qua STT < 100 hoặc ID nhân viên > 10000)
            for (let i = 0; i < numbers.length; i++) {
              const n = cleanNum(numbers[i]);
              const isInteger = !numbers[i].includes('.') && !numbers[i].includes(',');
              if ((n > 10000 && isInteger) || (i === 0 && n < 100 && isInteger)) {
                continue;
              }
              startIndex = i;
              break;
            }
          }

          // Cập nhật Ver 4.8: DTLK (virtualVal) = Cột 1, DTQĐ (actualVal) = Cột 2
          // Khóa vùng bóc tách trong "1. DOANH THU NV" để tránh cộng dồn sai lệch.
          // Dựa trên screenshot: Cột 2 từ trái sang là DTLK, Cột 3 là DTQĐ.
          let virtualVal = cleanNum(numbers[startIndex]);
          let actualVal = numbers.length > startIndex + 1 ? cleanNum(numbers[startIndex + 1]) : 0;
          
          // Hiệu quả QĐ: Cột thứ 3 sau khi bỏ qua ID
          let effVal = numbers.length > startIndex + 2 ? cleanNum(numbers[startIndex + 2]) : 0;
          
          // Đảm bảo effVal là % (thường < 500)
          if (effVal > 500 && numbers.length > startIndex + 3) {
            effVal = cleanNum(numbers[startIndex + 3]);
          }

          const staffKey = id;
          if (staffMap.has(staffKey)) {
            const existing = staffMap.get(staffKey)!;
            // Ưu tiên giữ giá trị lớn hơn hoặc giá trị đầu tiên tìm thấy
            // để tránh việc cộng dồn sai lệch từ các bảng phụ
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
  'sim': { normal: 5.45, installment: 5.75 },
  'bảo hiểm': { normal: 4.18, installment: 4.48 },
  'phụ kiện tiện ích': { normal: 3.37, installment: 3.67 },
  'phụ kiện trang trí': { normal: 3.37, installment: 3.67 },
  'loa vi tính': { normal: 3.37, installment: 3.67 },
  'vas': { normal: 3.30, installment: 3.60 },
  'đồng hồ thời trang': { normal: 3.00, installment: 3.30 },
  'wearable': { normal: 3.00, installment: 3.30 },
  'it': { normal: 2.00, installment: 2.30 },
  'dụng cụ nhà bếp': { normal: 1.92, installment: 2.22 },
  'điện gia dụng': { normal: 1.85, installment: 2.15 },
  'máy lọc nước': { normal: 1.85, installment: 2.15 },
  'gia dụng lắp đặt': { normal: 1.85, installment: 2.15 },
  'loa karaoke': { normal: 1.29, installment: 1.59 },
  'laptop': { normal: 1.20, installment: 1.50 },
  'tablet': { normal: 1.20, installment: 1.50 },
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
    
    // Skip header, assuming Column B (index 1) is Category, Column C (index 2) is Rate
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV split (might need more robust parsing if cells contain commas)
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 3) {
        const category = cols[1].toLowerCase();
        const rate = parseFloat(cols[2]);
        if (category && !isNaN(rate)) {
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

export const parseYcxData = (data: string, customRates?: Record<string, { normal: number, installment: number }>): YcxStaffData[] => {
  if (!data) return [];
  
  const ratesToUse = customRates || CONVERSION_RATES;

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
    // Try exact match first
    const exactIdx = header.findIndex(h => lowerNames.includes(h));
    if (exactIdx !== -1) return exactIdx;
    // Fallback to includes
    return header.findIndex(h => lowerNames.some(n => h.includes(n)));
  };

  const idxType = getIdx(['loại ycx', 'loại yêu cầu']);
  const idxMethod = getIdx(['hình thức xuất']);
  const idxStatus = getIdx(['trạng thái xuất']);
  const idxStaffName = getIdx(['người tạo', 'nhân viên', 'tên nhân viên', 'người bán', 'tên nv', 'người thực hiện', 'user tạo']); 
  const idxRevenue = getIdx(['phải thu', 'doanh thu', 'tổng tiền', 'thành tiền', 'giá bán 1', 'giá bán', 'giá trị', 'số tiền', 'tổng cộng', 'tiền']);
  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxQty = getIdx(['số lượng', 'sl', 'quantity']);
  const idxMarket = getIdx(['siêu thị', 'mã kho', 'tên kho', 'địa điểm', 'kho', 'cửa hàng']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'ngành hàng', 'nhóm']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng']);

  console.log('[parseYcxData] Column indices detected:', { idxStaffName, idxRevenue, idxMarket, idxStatus, idxType, idxMethod });

  // Fallback indices if header not found
  const colType = idxType !== -1 ? idxType : 3;
  const colMethod = idxMethod !== -1 ? idxMethod : 3;
  const colStatus = idxStatus !== -1 ? idxStatus : 13;
  const colStaffName = idxStaffName !== -1 ? idxStaffName : 23; // Cột X (Index 23)
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 37;
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colQty = idxQty !== -1 ? idxQty : 35;
  const colMarket = idxMarket !== -1 ? idxMarket : 1;
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40;
  const colReturnStatus = idxReturnStatus !== -1 ? idxReturnStatus : 44; // Cột AS (Index 44)

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

    const columnAOValue = String(cols[40] || '').trim(); // Cột AO (Index 40)
    const quantityVal = Math.round(parseFloat(String(cols[35] || '0').replace(/,/g, '')) || 0); // Cột AJ (Index 35)
    const staffNameFromX = String(cols[23] || '').trim(); // Cột X (Index 23)
    const statusValN = String(cols[13] || '').trim().toLowerCase(); // Cột N (Index 13)
    const returnStatusValAS = String(cols[44] || '').trim().toLowerCase(); // Cột AS (Index 44)

    if (!staffNameFromX) continue;

    // Use exactly what's in Column X for display
    const displayName = staffNameFromX.replace(/\s+/g, ' ').trim();
    const staffKey = displayName.toUpperCase();
    
    // FILTER: Ensure staff name exists and is not a header row or system account
    const nameLower = displayName.toLowerCase();
    if (!displayName || 
        nameLower.includes('người tạo') || 
        nameLower.includes('nhân viên') ||
        nameLower === 'administrator' ||
        nameLower === 'admin'
    ) continue;

    // Initial check for staffMap to ensure every staff found is tracked
    if (!staffMap.has(staffKey)) {
      staffMap.set(staffKey, { 
        totalRevenue: 0, 
        convertedRevenue: 0, 
        installmentRevenue: 0,
        marketName: String(cols[colMarket] || '').trim(),
        items: [],
        giaDung: { total: 0, mayLocNuoc: 0, noiCom: 0, noiChien: 0, quatGio: 0, bep: 0 },
        baoHiem: { total: 0, count: 0, motDoiMot: 0, moRong: 0, roiVo: 0, khac: 0 },
        ict: { smartphone: 0, sdp: 0, taiNghe: 0, camera: 0, sim: 0, vieon: 0, miengDan: 0 },
        ce: { total: 0, tivi: 0, tuLanh: 0, mayGiat: 0, mayLanh: 0, mayNuocNong: 0, msMrc: 0 },
        staffName: displayName,
        staffId: "",
        mayLanhImeiQty: 0,
        mayLanhDaikinQty: 0,
        mayLanhHaierQty: 0,
        mayLanhHisenseQty: 0
      });
    }

    // SPECIAL: Count May Lanh IMEI Quantity from AJ where AO matches AND Column N = "Đã xuất" AND Column AS = "Chưa trả"
    // Use more robust comparison for the category name just in case
    const isMayLanhImei = columnAOValue === "1098 - Máy lạnh (IMEI)" || columnAOValue.includes("1098 - Máy lạnh (IMEI)");
    
    if (isMayLanhImei && statusValN === "đã xuất" && returnStatusValAS === "chưa trả") {
       const staffData = staffMap.get(staffKey)!;
       staffData.mayLanhImeiQty += quantityVal;
       
       const productNameUpper = String(cols[colProduct] || "").toUpperCase();
       if (productNameUpper.includes("DAIKIN")) staffData.mayLanhDaikinQty = (staffData.mayLanhDaikinQty || 0) + quantityVal;
       if (productNameUpper.includes("HAIER")) staffData.mayLanhHaierQty = (staffData.mayLanhHaierQty || 0) + quantityVal;
       if (productNameUpper.includes("HISENSE") || productNameUpper.includes("HISENSI")) staffData.mayLanhHisenseQty = (staffData.mayLanhHisenseQty || 0) + quantityVal;
    }

    const type = String(cols[colType] || '').trim().toLowerCase();
    const method = String(cols[colMethod] || '').trim().toLowerCase();
    
    // FILTER: Only include "XUẤT BÁN" or "XUẤT ĐỔI" (Column D) for revenue calculations
    if (!method.startsWith('xuất bán') && !method.startsWith('xuất đổi')) continue;

    const status = String(cols[colStatus] || '').trim().toLowerCase();
    const returnStatus = String(cols[colReturnStatus] || '').trim().toLowerCase();
    
    // FILTER: Only include "ĐÃ XUẤT" (Column N) and "CHƯA TRẢ" (Column AS) for revenue calculations
    if (status !== 'đã xuất' || returnStatus !== 'chưa trả') continue;

    const market = String(cols[colMarket] || '').trim();
    const columnAO = String(cols[colColumnAO] || '').trim();
    const quantityStr = String(cols[colQty] || '0').replace(/,/g, '');
    const quantity = Math.round(parseFloat(quantityStr) || 0);
    
    const originalProductName = String(cols[colProduct] || "Sản phẩm không tên").trim();
    let productName = originalProductName;
    // Remove product code (e.g., "123456 - iPhone" -> "iPhone", "iPhone (123456)" -> "iPhone", "iPhone - 123456" -> "iPhone")
    productName = productName
      .replace(/^[A-Za-z0-9]+\s*-\s*/, '')
      .replace(/\s*-\s*[A-Za-z0-9]+$/, '')
      .replace(/\s*\([A-Za-z0-9]+\)$/, '')
      .trim();
    
    if (!productName) productName = originalProductName;
    
    const revenueStr = String(cols[colRevenue] || '0').replace(/,/g, '');
    
    // Exclude "Mã nạp tiền" in Column AG (index 32)
    const isMaNapTien = productName.toLowerCase().includes('mã nạp tiền');
    
    const rowString = cols.join(' ').toLowerCase().replace(/\//g, ' ');
    
    // SIMPLIFIED FILTER: Only check if staff name exists and revenue is valid
    const revenueValue = parseFloat(revenueStr) || 0;
    const hasStaff = displayName && displayName.length > 1;
    const hasRevenue = !isNaN(revenueValue) && revenueValue > 0;
    
    if (i < startIdx + 5) {
      console.log(`[parseYcxData] Row ${i} debug:`, { displayName, revenueValue, hasStaff, hasRevenue, colStaffName, colRevenue });
    }

    if (hasStaff && hasRevenue) {
       const revenue = Math.round(revenueValue);
       
       let isInstallment = false;
       
       if (type.includes('trả góp') || method.includes('trả góp') || rowString.includes('trả góp') || rowString.includes('tra gop')) {
         isInstallment = true;
       }
         
         let maxRate = 1;
         let matchedCat = "Khác";
         
         for (const [cat, rates] of Object.entries(ratesToUse)) {
           if (rowString.includes(cat)) {
             const rate = isInstallment ? rates.installment : rates.normal;
             if (rate > maxRate) {
               maxRate = rate;
               matchedCat = cat;
             }
           }
         }
         
         const convertedRev = Math.round(revenue * maxRate);
         
         if (!staffMap.has(staffKey)) {
           staffMap.set(staffKey, { 
             totalRevenue: 0, 
             convertedRevenue: 0, 
             installmentRevenue: 0,
             marketName: market,
             items: [],
             giaDung: { total: 0, mayLocNuoc: 0, noiCom: 0, noiChien: 0, quatGio: 0, bep: 0 },
             baoHiem: { total: 0, count: 0, motDoiMot: 0, moRong: 0, roiVo: 0, khac: 0 },
             ict: { smartphone: 0, sdp: 0, taiNghe: 0, camera: 0, sim: 0, vieon: 0, miengDan: 0 },
             ce: { total: 0, tivi: 0, tuLanh: 0, mayGiat: 0, mayLanh: 0, mayNuocNong: 0, msMrc: 0 },
             staffName: displayName,
             staffId: "",
             mayLanhImeiQty: 0,
             mayLanhDaikinQty: 0,
             mayLanhHaierQty: 0,
             mayLanhHisenseQty: 0
           });
         }
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
                            productNameLower.includes('mở rộng') || 
                            productNameLower.includes('mo rong') || 
                            productNameLower.includes('1 đổi 1') || 
                            productNameLower.includes('1 doi 1') ||
                            productNameLower.includes('rơi vỡ') ||
                            productNameLower.includes('roi vo') ||
                            matchedCat === 'bảo hiểm' ||
                            columnAO === "4479 - Dịch Vụ Bảo Hiểm" ||
                            columnAO === "4499 - Thu Hộ Phí Bảo Hiểm";

          if (isBaoHiem) {
            current.baoHiem.total += revenue;
            current.baoHiem.count += 1;
            if (productNameLower.includes('1 đổi 1') || productNameLower.includes('1 doi 1')) {
              current.baoHiem.motDoiMot += revenue;
            } else if (productNameLower.includes('mở rộng') || productNameLower.includes('mo rong')) {
              current.baoHiem.moRong += revenue;
            } else if (productNameLower.includes('rơi vỡ') || productNameLower.includes('roi vo')) {
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

         // CE Logic
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
           category: matchedCat,
           isInstallment,
           quantity
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

export const parseYcxRankData = (data: string, customRates?: Record<string, { normal: number, installment: number }>): YcxRankData[] => {
  if (!data) return [];
  
  const ratesToUse = customRates || CONVERSION_RATES;

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
    const exactIdx = header.findIndex(h => lowerNames.includes(h));
    if (exactIdx !== -1) return exactIdx;
    return header.findIndex(h => lowerNames.some(n => h.includes(n)));
  };

  const idxType = getIdx(['loại ycx', 'loại yêu cầu']);
  const idxMethod = getIdx(['hình thức xuất']);
  const idxStatus = getIdx(['trạng thái xuất']);
  const idxStaffName = getIdx(['người tạo', 'nhân viên', 'tên nhân viên', 'người bán', 'tên nv', 'người thực hiện', 'user tạo']); 
  const idxStaffId = getIdx(['user tạo', 'mã nv', 'mã nhân viên', 'id nhân viên']);
  const idxRevenue = getIdx(['phải thu', 'doanh thu', 'tổng tiền', 'thành tiền', 'giá bán 1', 'giá bán', 'giá trị', 'số tiền', 'tổng cộng', 'tiền']);
  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng', 'hàng hóa']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng']);

  const colType = idxType !== -1 ? idxType : 3;
  const colMethod = idxMethod !== -1 ? idxMethod : 3;
  const colStatus = idxStatus !== -1 ? idxStatus : 13;
  const colStaffName = idxStaffName !== -1 ? idxStaffName : 23; // Cột X (Index 23)
  const colStaffId = idxStaffId !== -1 ? idxStaffId : 22;   // Cột W (Index 22)
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 37;
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colReturnStatus = idxReturnStatus !== -1 ? idxReturnStatus : 44; // Cột AS (Index 44)

  const staffMap = new Map<string, { total: number, converted: number }>();
  const startIdx = headerIdx !== -1 ? headerIdx + 1 : 1;

  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 3) continue;

    const type = String(cols[colType] || '').trim().toLowerCase();
    const method = String(cols[colMethod] || '').trim().toLowerCase();
    
    // FILTER: Only include "XUẤT BÁN" or "XUẤT ĐỔI" (Column D)
    if (!method.startsWith('xuất bán') && !method.startsWith('xuất đổi')) continue;

    const status = String(cols[colStatus] || '').trim().toLowerCase();
    const returnStatus = String(cols[colReturnStatus] || '').trim().toLowerCase();
    
    // FILTER: Only include "ĐÃ XUẤT" (Column N) and "CHƯA TRẢ" (Column AS)
    if (status !== 'đã xuất' || returnStatus !== 'chưa trả') continue;

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
    const isSales = type.includes('xuất bán hàng') || type.includes('xuất đổi bảo hành');

    if (isSales && staff && revenueStr && !isMaNapTien) {
      const revenue = Math.round(parseFloat(revenueStr) || 0);
      if (revenue <= 0) continue;

      let isInstallment = false;
      if (type.includes('trả góp') || method.includes('trả góp') || rowString.includes('trả góp') || rowString.includes('tra gop')) {
        isInstallment = true;
      }

      let maxRate = 1;
      for (const [cat, rates] of Object.entries(ratesToUse)) {
        if (rowString.includes(cat)) {
          const rate = isInstallment ? rates.installment : rates.normal;
          if (rate > maxRate) maxRate = rate;
        }
      }

      const convertedRev = Math.round(revenue * maxRate);
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
