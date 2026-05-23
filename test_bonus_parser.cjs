const removeAccents = (str) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const parseBonusData = (text, staff, marketFilter) => {
  if (!text || text.trim().length === 0) return { tong: null, details: Array(8).fill(null) };
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

  const splitLine = (line) => {
    if (line.includes('\t')) {
      return line.split('\t').map(p => p.trim());
    }
    return line.split(/\s{2,}/).map(p => p.trim());
  };

  // Step 1: Detect all 8 column indices of interest in the header
  const colIndices = Array(8).fill(-1);
  let headerColCount = -1;
  let isMultiCol = false;

  for (const line of lines) {
    const parts = splitLine(line);
    const cleanParts = parts.map(p => removeAccents(p));
    const hasSoLuong = cleanParts.some(p => p.includes('so luong'));
    const hasThucLanh = cleanParts.some(p => p.includes('thuc lanh'));
    
    if (hasSoLuong && hasThucLanh) {
      isMultiCol = true;
      headerColCount = parts.length;
      colIndices[0] = cleanParts.findIndex(p => p.includes('so luong'));
      colIndices[1] = cleanParts.findIndex(p => p.includes('tich luy'));
      colIndices[2] = cleanParts.findIndex(p => p.includes('nhap tra'));
      colIndices[3] = cleanParts.findIndex(p => p.includes('thuong nong') && !p.includes('sbh'));
      colIndices[4] = cleanParts.findIndex(p => p.includes('tra gop'));
      colIndices[5] = cleanParts.findIndex(p => p.includes('mdmh') || p.includes('nhan dan'));
      colIndices[6] = cleanParts.findIndex(p => p.includes('sbh'));
      colIndices[7] = cleanParts.findIndex(p => p.includes('thuc lanh'));
      break;
    }
  }

  // Tương thích ngược: Nếu báo cáo cũ chỉ có 1 cột điểm thực lãnh
  if (!isMultiCol) {
    for (const line of lines) {
      const parts = splitLine(line);
      const cleanParts = parts.map(p => removeAccents(p));
      const idx = cleanParts.findIndex(p => {
        return p.includes('diem thuc lanh') || 
               p.includes('thuc lanh') ||
               p.includes('thuc nhan') ||
               p.includes('thuc linh') ||
               p.includes('thuc tra');
      });
      if (idx !== -1) {
        headerColCount = parts.length;
        colIndices[7] = idx;
        break;
      }
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

          const subParts = splitLine(subLine);
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
  const details = Array(8).fill(null);

  for (const line of linesToParse) {
    const parts = splitLine(line);
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

    const hasNumericData = parts.some(part => {
      const clean = part.replace(/[^\d-]/g, '');
      return clean.length > 0 && !isNaN(parseInt(clean, 10));
    });

    if (hasTotalLabel && hasNumericData) {
      foundRow = true;
      
      let offset = 0;
      if (parts.length === headerColCount + 1) {
        offset = 1;
      } else if (parts.length === headerColCount) {
        offset = 0;
      } else {
        const cleanFirst = parts[0].replace(/[^\d-]/g, '');
        const isFirstNumeric = cleanFirst !== '' && !isNaN(parseInt(cleanFirst, 10));
        offset = isFirstNumeric ? 0 : 1;
      }

      for (let i = 0; i < 8; i++) {
        const headerIdx = colIndices[i];
        if (headerIdx !== -1) {
          const targetIdx = headerIdx + offset;
          if (targetIdx >= 0 && targetIdx < parts.length) {
            const raw = parts[targetIdx];
            const clean = raw.replace(/[^\d-]/g, '');
            if (clean.length > 0) {
              const num = parseInt(clean, 10);
              details[i] = isNaN(num) ? 0 : num;
            } else {
              details[i] = 0;
            }
          }
        }
      }
      
      if (colIndices[7] !== -1) {
        tong = details[7] !== null ? details[7] : 0;
      } else {
        // Fallback to searching the last numeric value
        let foundNum = false;
        let lastNum = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
          const raw = parts[i];
          const clean = raw.replace(/[^\d-]/g, '');
          const n = parseInt(clean, 10);
          if (!isNaN(n) && n > 0) { 
            lastNum = n; 
            foundNum = true;
            break; 
          }
        }
        tong = foundNum ? lastNum : 0;
        details[7] = tong;
      }
      break;
    }
  }

  return { tong: foundRow ? tong : null, details: foundRow ? details : Array(8).fill(null) };
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

console.log("\nTEST 5 - New Daily Bonus Report with 'Tổng cộng' in headers (as in image):");
const newReportPaste = `
Tổng cộng	Điện thoại	Phụ kiện tiện ích	Laptop	Wearable	VAS	Phụ kiện trang trí	Dịch vụ sim
Số lượng	Điểm tích lũy	Điểm nhập trả	Thưởng nóng	Điểm trả góp	Điểm nhân dân MDMH	Thưởng nóng SBH	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh	Số lượng	Điểm tích lũy	Điểm nhập trả	Điểm thực lãnh
Tổng cộng	2.513.460	242.496	2.303.600				4.574.564	187	189.249	5.207	184.042	657	422.632	3.057	419.575	7	37.102	760	36.342	3	2.940		2.940	46	89.315		89.315	103	40.688		40.688	2	51		51
01/05/2026	280	181.073		342.000				523.073	15	4.523		4.523	48	6.928		6.928
`;
const res5 = parseBonusData(newReportPaste, staff, "ĐML HÓA AN");
console.log("Result (expected 4574564):", res5.tong);
console.log("Details breakdown (expected: [0, 2513460, 242496, 2303600, 0, 0, 0, 4574564]):", res5.details);

