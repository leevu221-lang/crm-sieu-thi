const removeAccents = (str) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const parseBonusData = (text, staff, marketFilter) => {
  if (!text || text.trim().length === 0) return { tong: null };
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Clean store name for matching
  const currentStoreClean = marketFilter && marketFilter !== 'ALL' 
    ? removeAccents(marketFilter).replace(/^(dml|dms3|dms|dmm|tgd|aar|bhx)\s+/, '').trim()
    : '';

  // Get employee ID and clean name
  const staffId = staff.fullId;
  const staffNameClean = removeAccents(staff.displayName.split('-').pop() || '').trim();

  // Helper to check if a line is a supermarket header
  const getStoreHeader = (line) => {
    const cleanLine = removeAccents(line).trim();
    const hasStoreKeyword = cleanLine.includes('sieu thi') || 
                            cleanLine.includes('cua hang') ||
                            cleanLine.includes('dien may xanh') ||
                            cleanLine.includes('the gioi di dong') ||
                            /^(dml|dms3|dms|dmm|tgd|aar|bhx)\b/.test(cleanLine);
    return hasStoreKeyword ? cleanLine : null;
  };

  // Step 1: Detect the column index of "Điểm thực lãnh" or equivalents
  let thucLanhColIdx = -1;
  let headerColCount = -1;
  for (const line of lines) {
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim());
    const idx = parts.findIndex(p => {
      const clean = removeAccents(p);
      return clean.includes('diem thuc lanh') || 
             clean.includes('thuc lanh') ||
             clean.includes('thuc nhan') ||
             clean.includes('thuc linh') ||
             clean.includes('thuc tra');
    });
    if (idx !== -1) {
      thucLanhColIdx = idx;
      headerColCount = parts.length;
      break;
    }
  }

  // Step 2: Find the correct section of lines
  let foundStaff = false;
  let targetLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = removeAccents(line);

    // Check if line matches employee ID or name
    const matchStaff = cleanLine.includes(staffId) || (staffNameClean && cleanLine.includes(staffNameClean));
    if (matchStaff) {
      // Look upwards for nearest store header
      let nearestStoreHeader = null;
      for (let k = i - 1; k >= 0; k--) {
        const header = getStoreHeader(lines[k]);
        if (header) {
          nearestStoreHeader = header;
          break;
        }
      }

      // Check store compatibility
      let storeCompatible = true;
      if (currentStoreClean) {
        const hasAnyHeader = lines.some(l => getStoreHeader(l) !== null);
        if (hasAnyHeader) {
          if (nearestStoreHeader) {
            storeCompatible = nearestStoreHeader.includes(currentStoreClean);
          } else {
            // Has store headers, but this line is before the first header
            storeCompatible = false;
          }
        }
      }

      if (storeCompatible) {
        foundStaff = true;
        targetLines = [line];
        for (let j = i + 1; j < lines.length; j++) {
          const subLine = lines[j];
          
          if (getStoreHeader(subLine) !== null) {
            break;
          }

          targetLines.push(subLine);

          const subParts = subLine.split(/\t|\s{2,}/).map(p => p.trim());
          const hasTotalLabel = subParts.some(part => {
            const clean = removeAccents(part);
            return clean === 'tong cong' || 
                   clean === 'tong' || 
                   clean.startsWith('tong cong') || 
                   clean.startsWith('tong ') || 
                   clean.startsWith('tong:') ||
                   clean.includes('tong cong') || 
                   clean.includes('tong');
          });

          if (hasTotalLabel) {
            break;
          }
        }
        break;
      }
    }
  }

  const linesToParse = foundStaff ? targetLines : lines;

  let foundRow = false;
  let tong = 0;

  for (const line of linesToParse) {
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim());
    const hasTotalLabel = parts.some(part => {
      const clean = removeAccents(part);
      return clean === 'tong cong' || 
             clean === 'tong' || 
             clean.startsWith('tong cong') || 
             clean.startsWith('tong ') || 
             clean.startsWith('tong:') ||
             clean.includes('tong cong') || 
             clean.includes('tong');
    });

    if (hasTotalLabel) {
      foundRow = true;
      let targetIdx = -1;
      
      if (thucLanhColIdx !== -1 && headerColCount !== -1) {
        if (parts.length === headerColCount) {
          targetIdx = thucLanhColIdx;
        } else {
          const distFromRight = headerColCount - 1 - thucLanhColIdx;
          const mappedIdx = parts.length - 1 - distFromRight;
          if (mappedIdx >= 0 && mappedIdx < parts.length) {
            targetIdx = mappedIdx;
          }
        }
      }
      
      if (targetIdx !== -1) {
        const raw = parts[targetIdx];
        const clean = raw.replace(/[^\d-]/g, '');
        const num = parseInt(clean, 10);
        tong = isNaN(num) ? 0 : num;
      } else {
        let foundNum = false;
        for (let i = parts.length - 1; i >= 0; i--) {
          const raw = parts[i];
          const clean = raw.replace(/[^\d-]/g, '');
          const n = parseInt(clean, 10);
          if (!isNaN(n) && n > 0) { 
            tong = n; 
            foundNum = true;
            break; 
          }
        }
        if (!foundNum) {
          tong = 0;
        }
      }
      break;
    }
  }

  return { tong: foundRow ? tong : null };
};

// Test script
const samplePastedData = `
BÁO CÁO THƯỞNG CHI TIẾT
Siêu thị Điện máy Xanh Nguyễn Du
Mã NV\tHọ tên\tDoanh số\tĐiểm thực lãnh
12345\tNguyễn Văn A\t100.000.000\t1.500.000
Chi tiết 1\t100.000
Tổng cộng\t\t\t1.500.000

Siêu thị Điện máy Xanh Hóa An
Mã NV\tHọ tên\tDoanh số\tĐiểm thực lãnh
12803\tNguyễn Thị Nhạn\t200.000.000\t6.345.314
Chi tiết A\t200.000
Tổng cộng\t\t\t6.345.314

12345\tNguyễn Văn A (Nhầm lẫn trùng lặp ở Hóa An)\t10.000.000\t300.000
Tổng cộng\t\t\t300.000
`;

console.log("TEST 1 - Staff 12803 in Store 'ĐML HÓA AN':");
const staff = { fullId: "12803", displayName: "12803 - NGUYỄN THỊ NHẠN" };
const res1 = parseBonusData(samplePastedData, staff, "ĐML HÓA AN");
console.log("Result (expected 6345314):", res1.tong);

console.log("\nTEST 2 - Staff 12345 in Store 'ĐMS NGUYỄN DU':");
const staff2 = { fullId: "12345", displayName: "12345 - NGUYỄN VĂN A" };
const res2 = parseBonusData(samplePastedData, staff2, "ĐMS NGUYỄN DU");
console.log("Result (expected 1500000):", res2.tong);

console.log("\nTEST 3 - Staff 12345 in Store 'ĐML HÓA AN' (should get the duplicate one in Hoa An):");
const res3 = parseBonusData(samplePastedData, staff2, "ĐML HÓA AN");
console.log("Result (expected 300000):", res3.tong);

console.log("\nTEST 4 - Single staff paste without store headers:");
const singlePaste = `
12803 - NGUYỄN THỊ NHẠN
Mã NV\tHọ tên\tDoanh số\tĐiểm thực lãnh
12803\tNguyễn Thị Nhạn\t200.000.000\t6.345.314
Tổng cộng\t\t\t6.345.314
`;
const res4 = parseBonusData(singlePaste, staff, "ĐML HÓA AN");
console.log("Result (expected 6345314):", res4.tong);

