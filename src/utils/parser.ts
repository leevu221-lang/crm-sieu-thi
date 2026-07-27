/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MarketInfo {
  name: string;
  targetST: number;
  baseTarget: number;
  actualReal: number;
  actualVirtual: number;
  virtualProj?: number;
  tyTrongTraGop?: number;
  laiGop?: number;
}

export interface CategoryData {
  name: string;
  actual: number;
  target: number;
  rate: number;
  marketName?: string;
}

export interface StaffData {
  displayName: string;
  fullId: string;
  actualVal: number;
  virtualVal: number;
  effVal: number;
  target?: number;
  rate?: number;
}

export interface StaffMatrixData {
  displayName: string;
  fullId: string;
  achieved: number;
  totalCats: number;
  rate: number;
  rawValues: number[];
  projectedRates: number[];
}

export const cleanNum = (s: string): number => {
  if (!s) return 0;
  
  const isNegative = s.trim()?.startsWith('(') && s.trim()?.endsWith(')');
  let clean = s.replace(/[^\d,.-]/g, '');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');

  let result = 0;
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      result = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    } else {
      result = parseFloat(clean.replace(/,/g, ''));
    }
  } else if (lastComma !== -1) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      result = parseFloat(clean.replace(',', ''));
    } else {
      result = parseFloat(clean.replace(',', '.'));
    }
  } else if (lastDot !== -1) {
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      result = parseFloat(clean.replace('.', ''));
    } else {
      result = parseFloat(clean);
    }
  } else {
    result = parseFloat(clean) || 0;
  }
  
  if (isNegative && result > 0) {
    result = -result;
  }
  return result;
};

export const parseMarketData = (input: string, targetConfigMap: Record<string, any> = {}): { markets: MarketInfo[], totalMarket: MarketInfo | null } => {
  const val = input.trim();
  if (!val) return { markets: [], totalMarket: null };
  
  const lines = val.split('\n');
  const results: MarketInfo[] = [];
  let totalMarket: MarketInfo | null = null;
  let currentTable = "";
  let tyTrongTraGopOffset = 2;
  let laiGopOffset = 8;
  let isTabSeparated = false;
  let laiIdx = -1;
  let tyIdx = -1;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Filter out unwanted lines as requested
    const lowerLine = cleanLine.toLowerCase();
    if (
      lowerLine.includes("tổng") || 
      lowerLine.includes("hỗ trợ bi liên hệ user: quang - 62882") || 
      lowerLine.includes("copyright © bi report")
    ) {
      continue;
    }
    
    if (lowerLine.includes("lãi gộp") || lowerLine.includes("tỷ trọng trả góp") || lowerLine.includes("tỷ trọng trả chậm")) {
      let headers = line.split('\t');
      if (headers.length > 1) {
        isTabSeparated = true;
      } else {
        isTabSeparated = false;
        headers = cleanLine.split(/\s{2,}/);
      }
      if (headers.length > 3) {
        let currentLaiIdx = headers.findIndex(h => {
          const lower = h.toLowerCase().replace(/[\s\n\r]/g, '');
          return lower.includes("lãigộpqđ") || lower.includes("lãigộp(qđ)") || lower.includes("lãigộpquyđổi");
        });
        if (currentLaiIdx === -1) {
          currentLaiIdx = headers.findIndex(h => h.toLowerCase().includes("lãi gộp"));
        }
        
        if (currentLaiIdx !== -1) {
          laiIdx = currentLaiIdx;
        } else if (headers.length >= 10) {
          laiIdx = 9; // Cột số 10
        } else {
          laiIdx = 9;
        }

        const currentTyIdx = headers.findIndex(h => {
          const lower = h.toLowerCase();
          return lower.includes("tỷ trọng trả góp") || lower.includes("tỷ trọng trả chậm") || lower.includes("tỷ trọng tg") || lower.includes("tt tg") || lower.includes("tỷ trọng tc");
        });
        if (currentTyIdx !== -1) tyIdx = currentTyIdx;
        
        if (laiIdx !== -1) laiGopOffset = headers.length - laiIdx;
        if (tyIdx !== -1) tyTrongTraGopOffset = headers.length - tyIdx;
      }
    }
    
    if (cleanLine.toLowerCase()?.startsWith("tên miền")) {
      currentTable = "ten_mien";
      continue;
    }
    if (cleanLine.toLowerCase()?.startsWith("siêu thị") || cleanLine.toLowerCase()?.startsWith("cửa hàng") || cleanLine.toLowerCase()?.startsWith("chi nhánh")) {
      currentTable = "sieu_thi";
      continue;
    }
    
    const isTotal = cleanLine.toLowerCase()?.startsWith("tổng");
    
    if (isTotal && currentTable === "sieu_thi") continue;
    if (!isTotal && currentTable === "ten_mien") continue;
    
    const regex = /-?[\d,.]+(%?)/g;
    let match;
    const numberMatches: RegExpExecArray[] = [];
    while ((match = regex.exec(cleanLine)) !== null) {
      numberMatches.push(match);
    }
    
    if (numberMatches.length >= 3) {
      let firstPercentIdx = -1;
      for (let i = 0; i < numberMatches.length; i++) {
        if (numberMatches[i][0].includes('%')) {
          firstPercentIdx = i;
          break;
        }
      }

      // Logic from UpData.tsx for more advanced parsing
      if (firstPercentIdx >= 4 && numberMatches.length >= 5) {
        const actualReal = cleanNum(numberMatches[firstPercentIdx - 4][0]);
        const actualVirtual = cleanNum(numberMatches[firstPercentIdx - 2][0]);
        const virtualProj = cleanNum(numberMatches[firstPercentIdx - 1][0]);
        let efficiency = cleanNum(numberMatches[firstPercentIdx][0]);
        
        if (efficiency > 0) {
          const rate = efficiency > 5 ? efficiency / 100 : efficiency;
          const baseTarget = virtualProj / rate;
          
          const firstDataMatch = numberMatches[firstPercentIdx - 4];
          let marketName = "7038";
          
          if (firstDataMatch.index !== undefined) {
             const rawName = cleanLine.substring(0, firstDataMatch.index).trim();
             let name = rawName.replace(/^[0-9.\s]+/, '').replace(/[-_]+$/, '').trim();
             
             const upperName = name.toUpperCase();
             const allowedPrefixes = ['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR'];
             const hasAllowedPrefix = allowedPrefixes.some(p => upperName?.startsWith(p));
             
             if (!hasAllowedPrefix) continue;
             
             const shortenMarketName = (raw: string) => {
               const upper = raw.toUpperCase();
               if (upper === "ĐML_CMA_CMA" || upper === "DML_CMA_CMA") return "ĐML - 12 TRẦN HƯNG ĐẠO";
               
               const allowedPrefixes = ['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR'];
               let prefix = "";
               for (const p of allowedPrefixes) {
                 if (upper?.startsWith(p)) {
                   prefix = p;
                   break;
                 }
               }
               
               if (!prefix) return raw.replace(/_/g, ' ');
               
               if (raw.includes('-')) {
                 const parts = raw.split('-');
                 return `${prefix} - ${parts[parts.length - 1].trim().toUpperCase()}`;
               }
               
               const rest = raw.substring(prefix.length).trim().replace(/_/g, ' ');
               return rest ? `${prefix} - ${rest.toUpperCase()}` : prefix;
             };
             
             marketName = shortenMarketName(name || "7038");
          }
          
          const config = targetConfigMap[marketName] || targetConfigMap['__CLUSTER__'] || { totalAdj: 100 };
          const adjustment = (config.totalAdj || 100) - 100;
          const adjustedTarget = baseTarget * (1 + adjustment / 100);
          
          let tyTrongTraGop = 0;
          let laiGop = 0;
          
          if (isTabSeparated) {
            const parts = line.split('\t');
            if (tyIdx !== -1 && parts.length > tyIdx) {
              tyTrongTraGop = cleanNum(parts[tyIdx]);
            }
            if (parts.length > 9) {
              laiGop = cleanNum(parts[9]);
            }
          } else {
            if (numberMatches.length >= tyTrongTraGopOffset) {
              tyTrongTraGop = cleanNum(numberMatches[numberMatches.length - tyTrongTraGopOffset][0]);
            }
            if (numberMatches.length >= 9) {
              laiGop = cleanNum(numberMatches[8][0]);
            }
          }
          
          if (!results.some(m => m.name === marketName)) {
            results.push({ name: marketName, targetST: adjustedTarget, baseTarget, actualReal, actualVirtual, virtualProj, tyTrongTraGop, laiGop });
          }
        }
      } else if (numberMatches.length >= 3) {
        // Fallback to simpler parsing if not enough columns for the advanced logic
        let targetIdx = firstPercentIdx !== -1 ? firstPercentIdx - 1 : numberMatches.length - 1;
        let revenueIdx = firstPercentIdx !== -1 ? firstPercentIdx - 2 : numberMatches.length - 2;
        let realIdx = firstPercentIdx !== -1 ? firstPercentIdx - 3 : numberMatches.length - 3;

        if (targetIdx >= 0 && revenueIdx >= 0 && numberMatches.length > Math.max(targetIdx, revenueIdx)) {
          const actualReal = realIdx >= 0 ? cleanNum(numberMatches[realIdx][0]) : cleanNum(numberMatches[revenueIdx][0]);
          const actualVirtual = cleanNum(numberMatches[revenueIdx][0]);
          const baseTarget = cleanNum(numberMatches[targetIdx][0]);
          
          if (baseTarget > 0 || actualVirtual > 0) {
            const firstDataMatch = numberMatches[0];
            let marketName = "7038";
            
            if (firstDataMatch.index !== undefined) {
               const rawName = cleanLine.substring(0, firstDataMatch.index).trim();
               let name = rawName.replace(/^[0-9.\s]+/, '').replace(/[-_]+$/, '').trim();
               
               const upperName = name.toUpperCase();
               const allowedPrefixes = ['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR'];
               const hasAllowedPrefix = allowedPrefixes.some(p => upperName?.startsWith(p));
               
               if (!hasAllowedPrefix) continue;
               
               const shortenMarketName = (raw: string) => {
                 const upper = raw.toUpperCase();
                 if (upper === "ĐML_CMA_CMA" || upper === "DML_CMA_CMA") return "ĐML - 12 TRẦN HƯNG ĐẠO";
                 
                 const allowedPrefixes = ['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'AAR'];
                 let prefix = "";
                 for (const p of allowedPrefixes) {
                   if (upper?.startsWith(p)) {
                     prefix = p;
                     break;
                   }
                 }
                 
                 if (!prefix) return raw.replace(/_/g, ' ');
                 
                 if (raw.includes('-')) {
                   const parts = raw.split('-');
                   return `${prefix} - ${parts[parts.length - 1].trim().toUpperCase()}`;
                 }
                 
                 const rest = raw.substring(prefix.length).trim().replace(/_/g, ' ');
                 return rest ? `${prefix} - ${rest.toUpperCase()}` : prefix;
               };
               
               marketName = shortenMarketName(name || "7038");
            }
            
            const marketAdj = targetConfigMap[marketName]?.totalAdj ?? 100;
            const adjustedTarget = baseTarget * (marketAdj / 100);
            
            if (!results.some(m => m.name === marketName)) {
              results.push({ name: marketName, targetST: adjustedTarget, baseTarget, actualReal, actualVirtual });
            }
          }
        }
      }
    }
  }

  return { markets: results, totalMarket };
};

export const parseCategoryData = (input: string, daysPassed: number, totalDays: number, catAdjustmentsMap: Record<string, Record<string, number>>, markets: MarketInfo[]): CategoryData[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => {
    if (l.length === 0) return false;
    const lower = l.toLowerCase();
    if (lower.includes("tổng")) return false;
    if (lower.includes("hỗ trợ bi liên hệ user: quang - 62882")) return false;
    if (lower.includes("copyright © bi report")) return false;
    return true;
  });
  const results: CategoryData[] = [];
  let currentCatName = "";
  let currentMarketName = "7038";
  const sortedMarkets = [...markets].sort((a, b) => b.name.length - a.name.length);
  
  const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();

  const resultMap = new Map<string, CategoryData>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normLine = normalize(line);
    
    if (line.length > 5 && !line.includes('%')) {
      const matchedMarket = sortedMarkets.find(m => {
        const normName = normalize(m.name);
        const nameWithoutPrefix = normalize(m.name.replace(/^ĐML\s*-\s*/i, ''));
        return normLine.includes(normName) || normLine.includes(nameWithoutPrefix) || (normLine.includes('-') && normName.includes(normLine));
      });
      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
      }
    }

    const numbers = line.match(/-?[\d,.]+(%?)/g);
    const isDataLine = numbers && numbers.length >= 3;
    
    if (!isDataLine) {
      if (!line?.startsWith("Tổng")) {
        let catName = line.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)_/i, '').trim();
        if (catName.match(/DT Realtime|SL Realtime|DT REALTIME|SL REALTIME|Target/i)) {
           catName = catName.split(/DT Realtime|SL Realtime|DT REALTIME|SL REALTIME|Target/i)[0].trim();
        }
        
        const normCat = normalize(catName);
        const isMarket = sortedMarkets.some(m => {
          const normName = normalize(m.name);
          const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
          return normCat.includes(normName) || normCat.includes(nameWithoutPrefix) || (normCat.includes('-') && normName.includes(normCat));
        });
        
        if (!isMarket && catName) {
          currentCatName = catName;
        }
      }
      continue;
    }
    
    const lastNumberStr = numbers[numbers.length - 1];
    const hasRank = !lastNumberStr.includes('%') && !isNaN(parseFloat(lastNumberStr));
    
    if (!hasRank) continue;

    const matchedMarketInLine = sortedMarkets.find(m => {
      const normName = normalize(m.name);
      const nameWithoutPrefix = normalize(m.name.replace(/^ĐML\s*-\s*/i, ''));
      return normLine.includes(normName) || normLine.includes(nameWithoutPrefix);
    });
    if (matchedMarketInLine) {
      currentMarketName = matchedMarketInLine.name;
    }
    
    const isSM = (s: string) => /ĐIỆN MÁY XANH|THẾ GIỚI DI ĐỘNG|ĐMX|TGDĐ|TOPZONE|ĐMS|ĐMM|ĐML/i.test(s);
    const isTechnicalHeader = (s: string) => /^[A-Z0-9]{2,}_[A-Z0-9]{2,}_[A-Z0-9]{2,}/i.test(s) || /^(ĐMS|ĐMM|ĐML|ĐIỆN MÁY|THẾ GIỚI|TỔNG|CỤM|MIỀN)/i.test(s);

    const firstNumMatch = line.match(/-?[\d,.]+(%?)/);
    if (firstNumMatch && firstNumMatch.index! > 3) {
      const potentialCat = line.substring(0, firstNumMatch.index!).trim();
      if (potentialCat && !isSM(potentialCat) && !potentialCat?.startsWith("Tổng") && !isTechnicalHeader(potentialCat)) {
        currentCatName = potentialCat;
      }
    }
    
    let actual = 0;
    if (numbers.length >= 2) {
      actual = cleanNum(numbers[1]);
      actual = Math.round(actual * 10) / 10;
    }
    
    let target = 0;
    if (numbers.length >= 3) {
      target = cleanNum(numbers[2]);
      target = Math.round(target * 10) / 10;
    }
    
    let extractedName = currentCatName;
    if (isTechnicalHeader(extractedName)) continue;

    let isSLLK = false;
    let isDTLK = false;
    
    if (extractedName.includes('SLLK')) isSLLK = true;
    if (extractedName.includes('DTLK')) isDTLK = true;
    
    if (extractedName) {
      extractedName = extractedName.split(/SLLK|DTLK/)[0].trim();
      if (isSLLK) extractedName += " - SLLK";
      else if (isDTLK) extractedName += " - DTLK";
      
      const marketAdjs = catAdjustmentsMap[currentMarketName] || catAdjustmentsMap['__CLUSTER__'] || {};
      const adj = marketAdjs[extractedName] ?? 100;
      if (adj !== 100) {
        target = target * (adj / 100);
      }
      
      const key = `${currentMarketName}_${extractedName}`;
      if (resultMap.has(key)) {
        const existing = resultMap.get(key)!;
        // Take the one with values if current is 0, or sum if both have values?
        // Usually these are duplicates of the same data point, so take max or just overwrite if non-zero
        if (actual > existing.actual) existing.actual = actual;
        if (target > existing.target) existing.target = target;
      } else {
        resultMap.set(key, {
          name: extractedName,
          target,
          actual,
          rate: 0,
          marketName: currentMarketName
        });
      }
    }
  }
  return Array.from(resultMap.values());
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
          displayName: fullName.split(' ').pop() || fullName, 
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

export const parseStaffList = (input: string): { displayName: string; fullId: string }[] => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: { displayName: string; fullId: string }[] = [];
  
  lines.forEach(line => {
    const match = line.match(/(.+) - (\d+)/);
    if (match) {
      const fullName = match[1].trim();
      const id = match[2];
      results.push({ 
        displayName: fullName.split(' ').pop() || fullName, 
        fullId: id
      });
    }
  });
  return results;
};
