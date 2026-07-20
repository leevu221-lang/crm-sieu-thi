// Test script for parsing logic of parseMarketData with retrieved Firestore value

const prefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR", "TỔNG"];

const cleanNum = (s) => {
  if (s === null || s === undefined) return 0;
  if (typeof s === 'number') return s;
  let clean = s.replace(/[^\d,.-]/g, '');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');
  if (lastComma > lastDot) {
    clean = clean.replace(/\./g, '').replace(/,/g, '.');
  } else {
    clean = clean.replace(/,/g, '');
  }
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
};

const formatMarketName = (name) => {
  if (!name) return "";
  return name.trim().normalize('NFC');
};

const normalize = (s) => {
  if (!s) return "";
  const basic = s.trim().normalize('NFC').replace(/[\s\-_]+/g, ' ').toLowerCase();
  return basic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
};

const parseMarketData = (input, adjustment, pageType) => {
  const val = input.trim();
  if (!val) {
    return [];
  }
  const lines = val.split('\n');
  const results = [];

  let marketName = "";
  let targetST = 0;
  let actualReal = 0;
  let actualVirtual = 0;
  let percentHT = 0;
  let percentQD = 0;
  let dtHomQua = 0;
  let isExplicitTarget = false;
  let nameColIdx = -1;
  let cleanLine = "";

  const normalizedVal = val.toLowerCase();
  const hasBiHeader = normalizedVal.includes("bi tổng quan") || normalizedVal.includes("1. bi tổng quan");
  const hasBcHeader = val.includes("BC TỔNG HỢP CỤM") || normalizedVal.includes("bc tổng hợp cụm");
  
  const isBcTongHopCum = hasBcHeader || pageType === 'LUYKE' || pageType === 'RTST' || normalizedVal.includes("tên siêu thị") || normalizedVal.includes("ngành hàng") || normalizedVal.includes("tổng");

  for (const line of lines) {
    cleanLine = line.trim();
    if (!cleanLine) continue;

    const lowerLine = cleanLine.toLowerCase();

    if (lowerLine.includes("hỗ trợ bi liên hệ user") || 
        lowerLine.includes("copyright © bi report") ||
        lowerLine?.startsWith("tên miền")) {
      continue;
    }
    
    const cols = cleanLine.split(/\t|\||\s{2,}/).map(c => c.trim());
    while (cols.length > 0 && cols[cols.length - 1] === "") {
      cols.pop();
    }

    if (cols.length < 2) continue;

    marketName = "";
    nameColIdx = -1;

    if (isBcTongHopCum) {
      let foundIdx = -1;
      for (let i = 0; i <= 2; i++) {
        if (cols[i] && prefixes.some(p => cols[i].trim().toUpperCase().includes(p))) {
          foundIdx = i;
          break;
        }
      }
      
      if (foundIdx === -1) {
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
      } else {
        continue;
      }
    }

    if (marketName) {
      if (pageType === 'RTST') {
        const actualVirtual = cleanNum(cols[2]);
        const targetQDVal = cleanNum(cols[3]);
        const percentHTVal = cleanNum(cols[4]);
        const luotBillBanHangVal = cols.length > 9 ? cleanNum(cols[9]) : 0;
        const luotBillThuHoVal = cols.length > 10 ? cleanNum(cols[10]) : 0;
        const installmentRateVal = cols.length > 12 ? cleanNum(cols[12]) : 0;
        
        console.log(`[parsed RTST] Cols length: ${cols.length}, Name: "${marketName}", dtqd: ${actualVirtual}, targetqd: ${targetQDVal}, ht: ${percentHTVal}, luotBillThuHo: ${luotBillThuHoVal}, installmentRate: ${installmentRateVal}`);
        
        results.push({ 
          name: marketName, 
          targetQD: targetQDVal,
          actualVirtual,
          percentHT: percentHTVal,
          installmentRate: installmentRateVal,
          luotBillThuHo: luotBillThuHoVal
        });
      }
    }
  }
  return results;
};

const inputData = `Tên miền	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)	Lãi gộp QĐ	%HT Target Dự kiến (LNTT)	Lượt Khách LK	Lượt bill	Lượt Bill Bán Hàng	Lượt Bill Thu Hộ	TLPVTC LK	Tỷ Trọng Trả Chậm	
Tổng	92	117	211	55.29%	0	0.00%	361	120	42	78	11.63%	24.17%	
ĐML_CMA_CMA - 155A Nguyễn Tất Thành	92	117	211	55.29%	0	0.00%	361	120	42	78	11.63%	24.17%	
Điện Máy Xanh	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)	Lãi gộp QĐ	%HT Target Dự kiến (LNTT)	Lượt Khách LK	Lượt bill	Lượt Bill Bán Hàng	Lượt Bill Thu Hộ	TLPVTC LK	Tỷ Trọng Trả Chậm	
Tổng	92	117	211	55.29%	0	0.00%	361	120	42	78	11.63%	24.17%	
ĐML_CMA_CMA - 155A Nguyễn Tất Thành	92	117	211	55.29%	0	0.00%	361	120	42	78	11.63%	24.17%`;

const results = parseMarketData(inputData, 0, 'RTST');
console.log("Final Parsed results:", results);

const targetName = "ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH";
const match = results.find(pm =>
  normalize(pm.name).includes(normalize(targetName)) ||
  normalize(targetName).includes(normalize(pm.name))
);
console.log("Matching results for store:", targetName);
console.log("Match:", match);
