const PROVINCES = [
  'An Giang', 'Bạc Liêu', 'Bến Tre', 'Cà Mau', 'Cần Thơ', 'Đồng Tháp',
  'Hậu Giang', 'Kiên Giang', 'Long An', 'Sóc Trăng', 'Tiền Giang', 'Trà Vinh', 'Vĩnh Long'
];

const DEFAULT_CATEGORIES = [
  { name: 'Nồi cơm', group: 'CE' },
  { name: 'Máy lọc không khí - Hút bụi - Hút ẩm', group: 'CE' },
  { name: 'Quạt gió', group: 'CE' },
  { name: 'Tăng cường Audio', group: 'CE' },
  { name: 'Tivi', group: 'CE' },
  { name: 'Điện tử Samsung', group: 'CE' },
  { name: 'Sim Tổng', group: 'DỊCH VỤ' },
  { name: 'Sim Vinaphone & Sim ĐMX', group: 'DỊCH VỤ' },
  { name: 'OTT Mango+, iCallMe', group: 'DỊCH VỤ' },
  { name: 'Dịch vụ VAS', group: 'DỊCH VỤ' },
  { name: 'Điện thoại Flagship Samsung Galaxy S/Z Series', group: 'ICT' },
  { name: 'Điện thoại Realme', group: 'ICT' },
  { name: 'Điện thoại & Tablet Android', group: 'ICT' },
  { name: 'Vay tiền mặt', group: 'DỊCH VỤ' },
  { name: 'Máy giặt, Máy sấy, Máy rửa chén', group: 'CE' },
  { name: 'Trả chậm FECredit, Shinhan, Samsung Finance+', group: 'DỊCH VỤ' },
  { name: 'Trả chậm HomeCredit', group: 'DỊCH VỤ' },
  { name: 'Trả chậm Điện máy và Gia dụng', group: 'DỊCH VỤ' },
  { name: 'Camera', group: 'CE' },
  { name: 'Tủ lạnh, Tủ đông, Tủ mát', group: 'CE' },
  { name: 'Điện tử điện lạnh Aqua + Haier', group: 'CE' },
  { name: 'Đồng hồ (DHTT + SMW)', group: 'ICT' },
  { name: 'Loa', group: 'CE' },
  { name: 'Phụ kiện - Đồng hồ', group: 'ICT' },
  { name: 'Sạc dự phòng', group: 'ICT' },
  { name: 'Tai nghe Bluetooth', group: 'ICT' },
  { name: 'Đèn năng lượng mặt trời', group: 'CE' },
  { name: 'Bảo hiểm', group: 'DỊCH VỤ' },
  { name: 'Bảo hiểm thợ Điện Máy Xanh', group: 'DỊCH VỤ' },
  { name: 'Điện thoại Vivo', group: 'ICT' },
  { name: 'Máy lọc nước', group: 'CE' },
  { name: 'Máy lạnh Casper', group: 'CE' },
  { name: 'Máy lạnh Daikin', group: 'CE' },
  { name: 'Mở thẻ tín dụng TPBank EVO và VPBank MWG', group: 'DỊCH VỤ' },
  { name: 'Ví trả sau', group: 'DỊCH VỤ' },
  { name: 'Laptop', group: 'ICT' },
  { name: 'Nạp rút tiền tài khoản ngân hàng', group: 'DỊCH VỤ' },
  { name: 'Điện tử toshiba', group: 'CE' }
];

function splitSmartLine(line, categories = DEFAULT_CATEGORIES) {
  if (!line || !line.trim()) return [];
  const trimmed = line.trim();

  // If line contains TAB, split STRICTLY by TAB (never by comma!)
  if (line.includes('\t')) {
    return line.split('\t').map(c => c.trim());
  }

  // Check category header line from space copy
  for (const cat of categories) {
    if (trimmed.toLowerCase().startsWith(cat.name.toLowerCase())) {
      const rest = trimmed.substring(cat.name.length).trim();
      const restLower = rest.toLowerCase();
      if (restLower.includes('target') || restLower.includes('dt') || restLower.includes('realtime') || restLower.includes('xếp hạng')) {
        return [cat.name, '', 'DT', 'Target', '% HT', 'Xếp hạng'];
      }
    }
  }

  // Check if line starts with "Tổng":
  if (trimmed.toLowerCase().startsWith('tổng') || trimmed.toLowerCase().startsWith('tong')) {
    const match = trimmed.match(/^(tổng|tong)\s*(.*?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+%?)\s*([\d.,]+%?)?/i);
    if (match) {
      return [match[1], '', match[3] || '', match[4] || '', match[5] || '', match[6] || ''];
    }
  }

  // Check if it starts with a Province:
  for (const prov of PROVINCES) {
    if (trimmed.toLowerCase().startsWith(prov.toLowerCase())) {
      const rest = trimmed.substring(prov.length).trim();
      // Match store pattern: e.g. "1732 - ĐMM_CMA_TBI - Thới Bình" followed by numbers at the end
      const match = rest.match(/^(.*?\s-\s.*?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+%?)\s*([\d.,]+%?)?\s*(\d+)?\s*$/);
      if (match) {
        const store = match[1].trim();
        const dt = match[2] || '';
        const target = match[3] || '';
        const percent = match[4] || '';
        const rankOrPercent2 = match[5] || '';
        const rank = match[6] || '';
        return [prov, store, dt, target, percent, rankOrPercent2, rank].filter(x => x !== undefined);
      }
    }
  }

  return [trimmed];
}

const testLines = [
  "Máy giặt, Máy sấy, Máy rửa chén DTLK Target % HT Target Tháng % HT Dự Kiến Xếp hạng trong miền",
  "Tổng 66 346.22 117 275.60 56.57% 98.61%",
  "Cần Thơ 10631 - ĐMS_CTH_OMO - Phước Thới (Bình Lập) 15.03 16.31 92.16% 160.64% 47",
  "Tiền Giang 6881 - ĐMS3_TGI_MTH - Trung An 12.50 14.20 88.03% 153.20% 50",
  "Sóc Trăng 7705 - ĐMS_STR_TDE - Lịch Hội Thượng 20.10 23.00 87.39% 152.10% 52"
];

testLines.forEach((l, idx) => {
  console.log(`Line ${idx + 1}:`, JSON.stringify(splitSmartLine(l)));
});
