/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MarketInfo, CategoryData, StaffData, StaffMatrixData, YcxStaffData, YcxItemDetail } from '../types/rtst';

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

export function getWorkingDayProgress(): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 8 * 60; // 08:00
  const endMinutes = 20 * 60 + 30; // 20:30
  const totalMinutes = endMinutes - startMinutes;

  if (currentMinutes <= startMinutes) return 0;
  if (currentMinutes >= endMinutes) return 100;
  
  return ((currentMinutes - startMinutes) / totalMinutes) * 100;
}

// --- Storage Keys ---
export const STORAGE_KEYS = {
  MARKET: 'BI_REAL_MARK_V1',
  STAFF: 'BI_REAL_STAF_V1',
  CAT: 'BI_REAL_CAT_V1',
  STAFF_CAT: 'BI_REAL_SCAT_V1',
  ADJUSTMENT: 'BI_REAL_ADJUST_V1',
  EXCLUDED_STAFF: 'BI_REAL_EXCLUDED_V1',
  EXCLUDED_MARKETS: 'BI_REAL_EX_MARK_V1',
  DAYS_PASSED: 'BI_REAL_DAYS_PASSED_V1',
  TOTAL_DAYS: 'BI_REAL_TOTAL_DAYS_V1',
  SELECTED_MONTH: 'BI_REAL_SEL_MONTH_V1',
  YCX_DATA: 'BI_REAL_YCX_DATA_V1',
  YCX_FILENAME: 'BI_REAL_YCX_FILENAME_V1'
};

// --- Market Utils ---
export const getMarketRegistry = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem('BI_MARKET_REGISTRY_V1');
    const registry = saved ? JSON.parse(saved) : {};
    return {
      "96": "ĐMM_BLI_GRA - PHƯỜNG 1",
      "11": "ĐMS3_BLI_HBI - VĨNH BÌNH",
      ...registry
    };
  } catch {
    return {
      "96": "ĐMM_BLI_GRA - PHƯỜNG 1",
      "11": "ĐMS3_BLI_HBI - VĨNH BÌNH"
    };
  }
};

export const updateMarketRegistry = (formattedName: string) => {
  if (!formattedName.includes(" - ")) return;
  try {
    const [code] = formattedName.split(" - ");
    const cleanCode = code.trim();
    if (!cleanCode) return;
    
    const saved = localStorage.getItem('BI_MARKET_REGISTRY_V1');
    const registry = saved ? JSON.parse(saved) : {};
    if (registry[cleanCode] !== formattedName) {
      registry[cleanCode] = formattedName;
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

export const formatMarketName = (raw: string) => {
  if (!raw) return "";
  let upper = raw.toUpperCase().trim();
  
  if (upper.includes("CMA_CMA") || upper.includes("CMA CMA")) return "ĐML - 12 TRẦN HƯNG ĐẠO";
  
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

export const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();

export const parseMarketData = (input: string, adjustment: number): MarketInfo[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n');
  const results: MarketInfo[] = [];

  const cleanNum = (s: string) => {
    if (!s) return 0;
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

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const lowerLine = cleanLine.toLowerCase();
    if (lowerLine.includes("tổng") || 
        lowerLine.includes("hỗ trợ bi liên hệ user") || 
        lowerLine.includes("copyright © bi report") ||
        lowerLine?.startsWith("tên miền")) {
      continue;
    }
    
    const cols = cleanLine.split('\t');
    let marketName = "";
    let targetST = 0;
    let actualReal = 0;
    let actualVirtual = 0;
    let percentHT = 0;

    let nameColIdx = -1;
    if (cols.length >= 3) {
      let found = "";
      const prefixes = ["ĐMM", "ĐMS3", "ĐML", "ĐMS", "MWG", "BHX"];
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
        percentHT = numberMatches.length >= 4 ? cleanNum(numberMatches[3]) : (baseTarget > 0 ? (actualVirtual / baseTarget) * 100 : 0);
        
        if (baseTarget > 0 || actualVirtual > 0) {
          targetST = baseTarget * (1 + adjustment / 100);
          if (!results.some(m => m.name === marketName)) {
            results.push({ name: marketName, targetST, actualReal, actualVirtual, percentHT });
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
        const baseTarget = cleanNum(numberMatches[targetIdx].value);
        
        if (baseTarget > 0 || actualVirtual > 0) {
          targetST = baseTarget * (1 + adjustment / 100);
          
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
              results.push({ name: marketName, targetST, actualReal, actualVirtual, percentHT });
            }
          }
        }
      }
    }
  }
  return results;
};

export const parseCategoryData = (input: string, daysPassed: number, totalDays: number, markets: MarketInfo[]): CategoryData[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: CategoryData[] = [];
  let currentCatName = "";
  let currentCatType: 'SL' | 'DT' | 'ALL' = 'ALL';
  let currentMarketName = markets.length === 1 ? markets[0].name : "7038";
  
  if (currentMarketName.match(/^\d+$/) && markets.length > 0) {
    const found = markets.find(m => m.name.toUpperCase().includes(currentMarketName));
    if (found) currentMarketName = found.name;
  }

  const sortedMarkets = [...markets].sort((a, b) => b.name.length - a.name.length);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normLine = normalize(line);
    const cols = line.split('\t').map(c => c.trim());
    
    if (normLine.includes("tổng") || 
        normLine.includes("hỗ trợ bi liên hệ user") || 
        normLine.includes("copyright © bi report")) {
      continue;
    }

    if (!line.includes('%')) {
      const matchedMarket = sortedMarkets.find(m => {
        const normName = normalize(m.name);
        const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
        const codeMatch = m.name.match(/^([^-]+)/);
        const code = codeMatch ? codeMatch[1].trim() : "";

        return normLine.includes(normName) || 
               (nameWithoutPrefix.length > 3 && normLine.includes(nameWithoutPrefix)) ||
               (code.length >= 3 && normLine.includes(code)) ||
               (normLine.length >= 5 && normName.includes(normLine));
      });
      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
      } else {
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
    const isDataLine = numbers && numbers.length >= 2;
    
    if (isDataLine) {
      let foundMarket = false;
      let foundCategory = false;
      
      for (let j = 0; j < Math.min(cols.length, 3); j++) {
        const colVal = cols[j];
        if (!colVal || colVal.match(/^-?[\d,.]+(%?)$/)) continue;
        
        const normRaw = normalize(colVal);
        const foundM = sortedMarkets.find(m => {
          const normM = normalize(m.name);
          return normM.includes(normRaw) || normRaw.includes(normM) || 
                 (colVal.match(/^\d+$/) && m.name.includes(colVal));
        });
        
        if (foundM && !foundMarket) {
          currentMarketName = foundM.name;
          foundMarket = true;
        } else if (!foundCategory) {
          currentCatName = colVal;
          foundCategory = true;
        }
      }
      
      if (currentCatName) {
        if (currentCatName.match(/SL Realtime|SL REALTIME|SLLK/i)) currentCatType = 'SL';
        else if (currentCatName.match(/DT Realtime|DT REALTIME|DTLK/i)) currentCatType = 'DT';
      }
    }
    
    if (!isDataLine) {
      if (!line?.startsWith("Tổng")) {
        let catName = line.replace(/^ĐML_/, '').trim();
        let catType: 'SL' | 'DT' | 'ALL' = currentCatType;
        if (catName.match(/SL Realtime|SL REALTIME/i)) catType = 'SL';
        else if (catName.match(/DT Realtime|DT REALTIME/i)) catType = 'DT';

        if (catName.match(/DT Realtime|SL Realtime|DT REALTIME|SL REALTIME|Target/i)) {
           catName = catName.split(/DT Realtime|SL Realtime|DT REALTIME|SL REALTIME|Target/i)[0].trim();
        }
        
        const normCat = normalize(catName);
        const isMarket = sortedMarkets.some(m => {
          const normName = normalize(m.name);
          const nameWithoutPrefix = normalize(m.name.replace(/^ĐML\s*-\s*/i, ''));
          return normCat.includes(normName) || normCat.includes(nameWithoutPrefix) || (normCat.includes('-') && normName.includes(normCat));
        });
        
        if (!isMarket && catName) {
          currentCatName = catName;
          currentCatType = catType;
        }
      }
      continue;
    }
    
    const cleanNum = (s: string) => parseFloat(s.replace(/,/g, ''));
    
    let actual = 0;
    let target = 0;
    let rate = 0;

    let percentIdx = -1;
    for (let j = numbers.length - 1; j >= 0; j--) {
      if (numbers[j].includes('%')) {
        percentIdx = j;
        break;
      }
    }

    if (percentIdx >= 2) {
      actual = cleanNum(numbers[percentIdx - 2]);
      target = cleanNum(numbers[percentIdx - 1]);
      rate = cleanNum(numbers[percentIdx]);
    } else if (percentIdx === 1 && numbers.length >= 3) {
      target = cleanNum(numbers[0]);
      rate = cleanNum(numbers[1]);
      actual = cleanNum(numbers[2]);
    } else if (numbers.length >= 3) {
      actual = cleanNum(numbers[0]);
      target = cleanNum(numbers[1]);
      rate = cleanNum(numbers[2]);
    } else if (numbers.length === 2) {
      actual = cleanNum(numbers[0]);
      target = cleanNum(numbers[1]);
      rate = 0;
    }
    
    actual = Math.round(actual * 10) / 10;
    target = Math.round(target * 10) / 10;
    rate = Math.round(rate * 10) / 10;
    
    if (target > 0 && rate === 0) {
      rate = (actual / target) * 100;
      rate = Math.round(rate * 10) / 10;
    }
    
    let extractedName = currentCatName;
    
    if (extractedName) {
      extractedName = extractedName.split(/SLLK|DTLK/)[0].trim();
      extractedName = extractedName.split(/SL REALTIME|DT REALTIME/i)[0].trim();
      extractedName = extractedName.replace(/[-_]+$/, '').trim();
      
      if (currentCatType === 'SL') {
        extractedName += " - SLLK";
      } else if (currentCatType === 'DT') {
        extractedName += " - DTLK";
      }
      
      results.push({
        name: extractedName,
        target,
        actual,
        rate,
        marketName: currentMarketName,
        type: currentCatType === 'ALL' ? 'DT' : currentCatType
      });
    }
  }
  return results;
};

export const parseStaffRankData = (input: string): StaffData[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: StaffData[] = [];

  const cleanNum = (s: string) => {
    if (!s) return 0;
    let str = String(s).trim();
    if (!str) return 0;
    if (str.includes('%')) {
      str = str.replace(/%/g, '').replace(/,/g, '.').trim();
      const n = parseFloat(str);
      return isNaN(n) ? 0 : n;
    }
    let cleaned = str.replace(/[^\d,.-]/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
      else cleaned = cleaned.replace(/,/g, '');
    } else if (lastComma !== -1) {
      const parts = cleaned.split(',');
      if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) cleaned = cleaned.replace(/,/g, '');
      else cleaned = cleaned.replace(/,/g, '.');
    } else if (lastDot !== -1) {
      const parts = cleaned.split('.');
      if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) cleaned = cleaned.replace(/\./g, '');
    }
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  };

  lines.forEach(line => {
    const match = line.match(/(.+) - (\d+)/);
    if (match) {
      const fullName = match[1].trim();
      const id = match[2];
      const numbers = line.substring(match[0].length).match(/-?[\d,.]+/g);
      if (numbers && numbers.length >= 3) {
        const actualVal = cleanNum(numbers[0]);
        const virtualVal = cleanNum(numbers[1]);
        const effVal = cleanNum(numbers[2]);
        
        results.push({
          displayName: `${id} - ${(fullName.split(' ').pop() || fullName).toUpperCase()}`,
          fullId: id,
          actualVal,
          virtualVal,
          effVal
        });
      }
    }
  });
  return results;
};

export const parseStaffMatrixData = (input: string, staffCount: number, categoryTargets: CategoryData[], daysPassed: number, totalDays: number): StaffMatrixData[] => {
  const val = input.trim();
  if (!val || !staffCount || categoryTargets.length === 0) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: StaffMatrixData[] = [];
  const targetPerStaffPerCat: Record<string, number> = {};
  categoryTargets.forEach(cat => { targetPerStaffPerCat[cat.name] = cat.target / staffCount; });
  
  lines.forEach(line => {
    const match = line.match(/(.+) - (\d+)/);
    if (match) {
      const fullName = match[1].trim();
      const id = match[2];
      const numbers = line.substring(match[0].length).match(/-?[\d,.]+/g);
      if (numbers) {
        const rawValues = numbers.map(n => parseFloat(n.replace(/,/g, '')));
        let achieved = 0;
        const projectedRates: number[] = [];

        for (let i = 0; i < Math.min(rawValues.length, categoryTargets.length); i++) {
          const catName = categoryTargets[i].name;
          const target = targetPerStaffPerCat[catName];
          let projectedRate = 0;
          
          if (target > 0 && daysPassed > 0) {
            projectedRate = ((rawValues[i] / daysPassed) * totalDays) / target * 100;
          }
          
          projectedRates.push(projectedRate);
          if (projectedRate >= 100) achieved++;
        }

        results.push({ 
          displayName: `${id} - ${(fullName.split(' ').pop() || fullName).toUpperCase()}`, 
          fullId: id, 
          achieved, 
          totalCats: categoryTargets.length, 
          rate: (achieved / categoryTargets.length) * 100,
          rawValues,
          projectedRates
        });
      }
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
  if (catLower.includes('1841') || catLower.includes('1994') || catLower.includes('khác') || catLower.includes('khac') || ((catLower.includes('bảo hiểm') || catLower.includes('bao hiem')) && !catLower.includes('nón bảo hiểm') && !catLower.includes('non bao hiem') && !catLower.includes('mũ bảo hiểm') && !catLower.includes('mu bao hiem')) || !catLower) {
    const rowStrLower = rowString.toLowerCase();
    const hasInsuranceKeyword = 
      rowStrLower.includes('1 đổi 1') || rowStrLower.includes('1 doi 1') ||
      rowStrLower.includes('khoản vay') || rowStrLower.includes('khoan vay') || rowStrLower.includes('bhkv') ||
      rowStrLower.includes('mở rộng') || rowStrLower.includes('mo rong') || rowStrLower.includes('bhmr') ||
      rowStrLower.includes('rơi vỡ') || rowStrLower.includes('roi vo') || rowStrLower.includes('bhrv') ||
      rowStrLower.includes('sc+') ||
      rowStrLower.includes('xe máy') || rowStrLower.includes('xe may') || rowStrLower.includes('bhxm') ||
      ((rowStrLower.includes('bảo hiểm') || rowStrLower.includes('bao hiem')) && !rowStrLower.includes('nón bảo hiểm') && !rowStrLower.includes('non bao hiem') && !rowStrLower.includes('mũ bảo hiểm') && !rowStrLower.includes('mu bao hiem')) ||
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

export const parseYcxData = (data: string): YcxStaffData[] => {
  if (!data) return [];
  const lines = data.split('\n');
  const staffMap = new Map<string, { 
    totalRevenue: number, 
    convertedRevenue: number, 
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
    }
  }>();

  if (lines.length < 2) return [];

  // Tìm dòng tiêu đề và map các cột
  let headerIdx = -1;
  const rows = lines.map(l => l.split('\t'));
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (row && row.some(cell => {
      const c = String(cell).toLowerCase();
      return c.includes('người tạo') || c.includes('nhân viên') || c.includes('phải thu') || c.includes('loại ycx');
    })) {
      headerIdx = i;
      break;
    }
  }

  const header = headerIdx !== -1 ? rows[headerIdx].map(c => String(c || '').toLowerCase().trim()) : [];
  const removeAccentsLocal = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  };
  const getIdx = (names: string[]) => {
    const lowerNames = names.map(n => n.toLowerCase());
    for (const name of lowerNames) {
      const exactIdx = header.findIndex(h => h === name);
      if (exactIdx !== -1) return exactIdx;
      
      const partialIdx = header.findIndex(h => {
        const norm = removeAccentsLocal(h).toLowerCase();
        const normName = removeAccentsLocal(name).toLowerCase();
        if (normName === 'nhom hang' && norm.includes('nho')) return false;
        if (normName === 'nganh hang' && norm.includes('lon')) return false;
        return norm.includes(normName);
      });
      if (partialIdx !== -1) return partialIdx;
    }
    return -1;
  };

  const idxType = getIdx(['loại ycx', 'loại yêu cầu']);
  const idxStatus = getIdx(['trạng thái xuất']);
  const idxStaffName = getIdx(['nhân viên bán hàng', 'người tạo', 'nhân viên', 'tên nhân viên', 'người bán', 'tên nv', 'người thực hiện', 'user tạo']); // Ưu tiên cột "Nhân viên bán hàng"
  const idxStaffId = getIdx(['user tạo']);
  const idxRevenue = getIdx(['doanh thu', 'thành tiền', 'giá bán', 'phải thu', 'tổng tiền']);
  const idxProduct = getIdx(['tên sản phẩm', 'sản phẩm', 'tên hàng']);
  const idxQty = getIdx(['số lượng', 'sl']);
  const idxMarket = getIdx(['mã kho tạo', 'mã kho', 'siêu thị', 'tên kho', 'địa điểm']);
  const idxReturnStatus = getIdx(['trạng thái trả', 'trả hàng', 'tình trạng nhập trả', 'nhập trả']);
  const idxColumnAO = getIdx(['nhóm ngành hàng', 'nhóm hàng', 'ngành hàng', 'nhóm']);

  // Fallback indices if header not found
  const colType = idxType !== -1 ? idxType : 3;
  const colStatus = idxStatus !== -1 ? idxStatus : 13;
  const colStaffName = idxStaffName !== -1 ? idxStaffName : 23; // Cột X (Index 23)
  const colStaffId = idxStaffId !== -1 ? idxStaffId : 22; // Cột W (Index 22)
  const colRevenue = idxRevenue !== -1 ? idxRevenue : 37;
  const colProduct = idxProduct !== -1 ? idxProduct : 33;
  const colQty = idxQty !== -1 ? idxQty : 35;
  const colMarket = idxMarket !== -1 ? idxMarket : 1;
  const colReturnStatus = idxReturnStatus !== -1 ? idxReturnStatus : 44; // Cột AS (Index 44)
  const colColumnAO = idxColumnAO !== -1 ? idxColumnAO : 40;

  const startIdx = headerIdx !== -1 ? headerIdx + 1 : 1;

  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 5) continue;

    const lowerLine = lines[i].toLowerCase();
    if (lowerLine.includes("tổng") || 
        lowerLine.includes("hỗ trợ bi liên hệ user") || 
        lowerLine.includes("copyright © bi report")) {
      continue;
    }

    const type = String(cols[colType] || '').trim().toLowerCase();
    const status = String(cols[colStatus] || '').trim().toLowerCase();
    const returnStatus = String(cols[colReturnStatus] || '').trim().toLowerCase();
    const market = String(cols[colMarket] || '').trim();
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
    const staffNameRaw = String(cols[colStaffName] || '').trim();
    const staffIdRaw = String(cols[colStaffId] || '').trim();
    const productName = String(cols[colProduct] || "Sản phẩm không tên").trim();
    const revenueStr = String(cols[colRevenue] || '0').replace(/,/g, '');
    const quantityStr = String(cols[colQty] || '0').replace(/,/g, '');
    const quantity = Math.round(parseFloat(quantityStr) || 0);

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
    
    if (finalId && nameOnly.includes(finalId)) {
       nameOnly = nameOnly.replace(finalId, '').replace(/[-_]+/g, '').trim();
    }
    
    let staff = nameOnly;
    if (finalId && finalId.match(/^\d+$/)) {
      staff = `${finalId} - ${nameOnly}`;
    }
    
    if (!nameOnly || nameOnly.toLowerCase().includes('người tạo') || nameOnly.toLowerCase().includes('nhân viên')) continue;

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
      
    const isSales = !type.includes('hủy') && !type.includes('huy');
    const isExported = !status.includes('hủy') && !status.includes('huy') && status !== 'đã trả';
    const isNotReturned = returnStatus === 'chưa trả' || returnStatus === '' || !returnStatus.includes('đã trả');

    if (isSales && isExported && isNotReturned && staff && revenueStr) {
       const revenue = Math.round(parseFloat(revenueStr) || 0);
       if (revenue < 0) continue;
       
       let isInstallment = false;
       const rowString = lines[i].toLowerCase();
       if (type.includes('xuất bán trả góp') || type.includes('xuat ban tra gop')) {
           isInstallment = true;
         }
         
         const columnAO = String(cols[colColumnAO] || '').trim();
         const { rate: maxRate, matchedCat } = getRowConversionRate(columnAO, rowString, isInstallment, CONVERSION_RATES);
         
         const convertedRev = Math.round(revenue * maxRate);
         
         if (!staffMap.has(staff)) {
           staffMap.set(staff, { 
             totalRevenue: 0, 
             convertedRevenue: 0, 
             items: [],
             giaDung: { total: 0, mayLocNuoc: 0, noiCom: 0, noiChien: 0, quatGio: 0, bep: 0 },
             baoHiem: { total: 0, count: 0, motDoiMot: 0, moRong: 0, roiVo: 0, khac: 0 },
             ict: { smartphone: 0, sdp: 0, taiNghe: 0, camera: 0, sim: 0, vieon: 0, miengDan: 0 }
           });
         }
         const current = staffMap.get(staff)!;
         current.totalRevenue += revenue;

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
                            productNameLower.includes('bhmr') ||
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
                            rowString.includes('mở rộng') || 
                            rowString.includes('mo rong') || 
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
                            columnAO.includes('Dịch vụ bảo hành, bảo dưỡng');

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
    staffName,
    marketName: data.marketName,
    totalRevenue: data.totalRevenue,
    convertedRevenue: data.convertedRevenue,
    items: data.items.sort((a, b) => b.convertedRevenue - a.convertedRevenue),
    giaDung: data.giaDung,
    baoHiem: data.baoHiem,
    ict: data.ict
  })).sort((a, b) => b.convertedRevenue - a.convertedRevenue);
};

/**
 * Cleans raw copy-pasted BI reports by stripping away non-data navigation menus,
 * headers, and junk lines ("Logo BI", "Trang chủ", etc.), keeping document size well below 1MB.
 */
export function cleanBiReportText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');

  const junkPatterns = [
    /^logo bi/i,
    /^trang chủ/i,
    /^báo cáo/i,
    /^khối kinh doanh/i,
    /^siêu thị - con/i,
    /^lịch sử cập nhật/i,
    /^tải lại trang/i,
    /^chạy lại để cập nhật/i,
    /^công cụ phân tích/i,
    /^account home/i,
    /^cloudflare/i,
    /^https?:\/\//i,
    /^erp/i,
    /^crm/i
  ];

  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return !junkPatterns.some(p => p.test(trimmed));
  });

  let result = filtered.length > 0 ? filtered.join('\n') : text.trim();

  // Safety cap: Never allow individual field string to exceed 180KB to ensure full store document stays well under 1MB limit
  if (result.length > 180000) {
    console.warn('[cleanBiReportText] Truncating oversized BI text:', result.length, 'bytes');
    result = result.substring(0, 180000);
  }

  return result;
}
