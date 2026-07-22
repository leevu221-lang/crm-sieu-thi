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
  if (!val) return [];
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
  let val1 = ""; val2 = ""; val3 = ""; val4 = ""; val5 = "";
  let nameColIdx = -1;
  let cleanLine = "";

  const normalizedVal = val.toLowerCase();
  const hasBiHeader = normalizedVal.includes("bi tổng quan") || normalizedVal.includes("1. bi tổng quan");
  const hasBcHeader = val.includes("BC TỔNG HỢP CỤM") || normalizedVal.includes("bc tổng hợp cụm");
  
  const isBcTongHopCum = hasBcHeader || pageType === 'LUYKE' || pageType === 'RTST' || normalizedVal.includes("tên siêu thị") || normalizedVal.includes("ngành hàng") || normalizedVal.includes("tổng");

  if (!isBcTongHopCum) return [];

  let tyTrongTraGopIdx = -1;
  let headerNameIdx = -1;
  let targetQDIdx = -1;
  let targetSTIdx = -1;
  let actualRealIdx = -1;
  let actualVirtualIdx = -1;
  let dtHomQuaIdx = -1;
  let percentHTIdx = -1;
  let luotBillBanHangIdx = -1;
  let luotBillThuHoIdx = -1;

  for (const line of lines) {
    cleanLine = line.trim();
    if (!cleanLine) continue;

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
    
    if (lowerLine.includes("stt") || lowerLine.includes("tên siêu thị") || lowerLine.includes("tên miền")) {
      const cols = cleanLine.split(/\t|\s{2,}/);
      headerNameIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("tên siêu thị") || lower.includes("tên miền");
      });
      tyTrongTraGopIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("tỷ trọng trả góp") || 
               lower.includes("tỷ trọng trả chậm") || 
               lower.includes("tỷ trọng tg") || 
               lower.includes("tỷ trọng tc") || 
               lower.includes("tt tg") || 
               lower.includes("tt tc") ||
               (lower.includes("trả chậm") && !lower.includes("tlpvtc"));
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
      luotBillBanHangIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("bill bán") || lower.includes("bill ban") || (lower.includes("lượt bill") && !lower.includes("thu hộ"));
      });
      luotBillThuHoIdx = cols.findIndex(c => {
        const lower = c.toLowerCase();
        return lower.includes("thu hộ") || lower.includes("thu ho");
      });
      continue;
    }

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
        const actualVirtual = actualVirtualIdx !== -1 && actualVirtualIdx < cols.length
          ? cleanNum(cols[actualVirtualIdx])
          : (nameColIdx !== -1 && nameColIdx + 1 < cols.length ? cleanNum(cols[nameColIdx + 1]) : cleanNum(cols[2]));

        const targetQDVal = targetQDIdx !== -1 && targetQDIdx < cols.length
          ? cleanNum(cols[targetQDIdx])
          : (nameColIdx !== -1 && nameColIdx + 2 < cols.length ? cleanNum(cols[nameColIdx + 2]) : cleanNum(cols[3]));

        const percentHTVal = percentHTIdx !== -1 && percentHTIdx < cols.length
          ? cleanNum(cols[percentHTIdx])
          : (nameColIdx !== -1 && nameColIdx + 3 < cols.length ? cleanNum(cols[nameColIdx + 3]) : cleanNum(cols[4]));

        const actualRealVal = actualRealIdx !== -1 && actualRealIdx < cols.length
          ? cleanNum(cols[actualRealIdx])
          : (nameColIdx !== -1 && nameColIdx + 4 < cols.length && cols.length > 5 ? cleanNum(cols[nameColIdx + 4]) : 0);

        const luotBillBanHangVal = luotBillBanHangIdx !== -1 && luotBillBanHangIdx < cols.length
          ? cleanNum(cols[luotBillBanHangIdx])
          : (nameColIdx !== -1 && nameColIdx + 9 < cols.length ? cleanNum(cols[nameColIdx + 9]) : (cols.length > 9 ? cleanNum(cols[9]) : 0));

        const luotBillThuHoVal = luotBillThuHoIdx !== -1 && luotBillThuHoIdx < cols.length
          ? cleanNum(cols[luotBillThuHoIdx])
          : (nameColIdx !== -1 && nameColIdx + 10 < cols.length ? cleanNum(cols[nameColIdx + 10]) : (cols.length > 10 ? cleanNum(cols[10]) : 0));

        const installmentRateVal = tyTrongTraGopIdx !== -1 && tyTrongTraGopIdx < cols.length
          ? cleanNum(cols[tyTrongTraGopIdx])
          : (nameColIdx !== -1 && nameColIdx + 12 < cols.length ? cleanNum(cols[nameColIdx + 12]) : (cols.length > 12 ? cleanNum(cols[12]) : 0));

        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetQD: targetQDVal,
            actualReal: actualRealVal,
            actualVirtual,
            percentHT: percentHTVal,
            installmentRate: installmentRateVal,
            luotBillBanHang: luotBillBanHangVal,
            luotBillThuHo: luotBillThuHoVal,
          });
        }
      }
    }
  }
  return results;
};

const inputData = `Tên miền	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)	Lãi gộp QĐ	%HT Target Dự kiến (LNTT)	Lượt Khách LK	Lượt bill	Lượt Bill Bán Hàng	Lượt Bill Thu Hộ	TLPVTC LK	Tỷ Trọng Trả Chậm
Tổng	52	70	221	31.71%	0	0.00%	205	61	22	39	10.73%	39.94%
ĐML_CMA_CMA - 155A Nguyễn Tất Thành	52	70	221	31.71%	0	0.00%	205	61	22	39	10.73%	39.94%`;

const results = parseMarketData(inputData, 0, 'RTST');
console.log("TEST RESULT:");
console.log(JSON.stringify(results, null, 2));
