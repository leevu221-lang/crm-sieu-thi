const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const rawBI = `Logo BI
Trang chủ
Báo cáo
Khối kinh doanh

HD sử dụng
7611 - Thức Trần Chí
avatar
 Trở lại

Vùng Tây Nam Bộ
BC Thi đua
Kết quả thi đua quá khứ
 
Miền của tôi
 
Thống kê theo Siêu thị
Nồi cơm
Điện Máy Xanh
Kiên Giang
1371 - ĐMM_AGI_TBI - 474 Hữu Nghị
Nồi cơm		DTLK	Target	% HT Target Tháng	% HT Dự Kiến	Xếp hạng trong miền	Top/Bottom Trong HT	
Tổng		14,521.27	23,181.32	62.64%	109.19%			
Cà Mau	10487 - ĐMS_CMA_PTA - Phú Thuận	16.16	7.99	202.22%	352.49%	1		
Đồng Tháp	12064 - ĐMS_DTH_THO - Tân Phước	7.96	5.05	157.64%	274.78%	2		
Cà Mau	9298 - ĐMS_CMA_DDO - Tân Tiến	14.45	9.93	145.53%	253.68%	3		
Cần Thơ	9044 - ĐMS3_CTH_PDI - Giai Xuân	19.63	14.49	135.45%	236.11%	4		
Máy giặt, Máy sấy, Máy rửa chén		DTLK	Target	% HT Target Tháng	% HT Dự Kiến	Xếp hạng trong miền	Top/Bottom Trong HT	
Tổng		14,521.27	23,181.32	62.64%	109.19%			
Kiên Giang	8967 - ĐMS_KGI_GQU - Vĩnh Tuy	23.34	17.55	132.97%	231.78%	5		
Hỗ trợ BI 12345
`;

const DEFAULT_CATEGORIES = [
  { name: 'Nồi cơm', group: 'CE' },
  { name: 'Máy giặt, Máy sấy, Máy rửa chén', group: 'CE' },
];

const rawLines = rawBI.split('\n').filter(l => l.trim().length > 0);
const parsed = rawLines.map(line => {
  if (line.includes('\t')) return line.split('\t').map(c => c.trim());
  return parseCSVLine(line).map(c => c.trim());
});

const headerRowIndex = parsed.findIndex(row => {
  if (row.length < 3) return false;
  const rowStr = row.join(' ').toLowerCase();
  return (
    (rowStr.includes('target') && (rowStr.includes('dt') || rowStr.includes('%') || rowStr.includes('xếp hạng') || rowStr.includes('xep hang'))) ||
    rowStr.includes('dtlk') || 
    rowStr.includes('dt realtime') || 
    (rowStr.includes('% ht') && rowStr.includes('target'))
  );
});

console.log('headerRowIndex:', headerRowIndex);
const dataRows = headerRowIndex !== -1 ? parsed.slice(headerRowIndex) : parsed;

let currentActiveCategory = '';
const result = dataRows.map(r => {
  const row10 = Array.from({ length: 10 }, (_, i) => r[i] || '');
  const col1Val = (row10[0] || '').trim();
  const col1Lower = col1Val.toLowerCase();

  if (col1Lower.includes('hỗ trợ bi') || col1Lower.includes('ho tro bi')) {
    currentActiveCategory = '';
    row10[9] = '-';
  } else {
    if (col1Val && col1Val !== '-') {
      const matchedCat = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === col1Lower);
      if (matchedCat) {
        currentActiveCategory = matchedCat.name;
      }
    }
    row10[9] = currentActiveCategory || '-';
  }

  const col2Val = row10[1] || '';
  if (col2Val && col2Val !== '-') {
    const dashIdx = col2Val.indexOf('-');
    if (dashIdx !== -1) {
      row10[6] = col2Val.substring(dashIdx + 1).trim();
    } else {
      row10[6] = col2Val.trim();
    }
  }

  const col7Val = row10[6] || '';
  if (col7Val && col7Val !== '-') {
    row10[7] = col7Val.trim().substring(0, 3);
  }

  return row10;
});

console.log('Processed sample rows:');
result.slice(0, 8).forEach((r, idx) => {
  console.log(`Row ${idx + 1}:`, JSON.stringify(r));
});
