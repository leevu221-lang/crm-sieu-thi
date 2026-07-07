const removeAccents = (str) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const splitLine = (l) => {
  if (l.includes('\t')) {
    return l.split('\t').map(p => p.trim());
  }
  return l.split(/\t|\s{2,}/).map(p => p.trim());
};

const cleanNumber = (val) => {
  if (!val) return 0;
  let s = val.trim();
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  
  if (hasComma && hasDot) {
    if (s.indexOf(',') < s.indexOf('.')) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (hasComma) {
    s = s.replace(/,/g, '.');
  }
  
  const clean = s.replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

function parseTraChamData(text) {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.replace(/[\r\n]/g, '')).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parsedRows = [];

  const ignoredKeywords = [
    'nhanvien', 'homecredit', 'fecredit', 'shinhan', 'dmsieuthi', 'tytrong',
    'logobi', 'trangchu', 'baocao', 'khoikinhdoanh', 'hdsudung', 'avatar',
    'vungtay', 'dashboard', 'hotrobi', 'chientranh', 'lichsu', 'quanly',
    'danhsach', 'saovang', 'chupanh', 'xuatpdf', 'xuatexcel', 'hotline',
    'tiendo', 'rank', 'tongcong', 'tong', 'phankhuc', 'nganhhang', 'thang', 'nam'
  ];

  const isDetailed = text.toLowerCase().includes('homecredit') || 
                       text.toLowerCase().includes('fecredit') || 
                       text.toLowerCase().includes('shinhan');

  lines.forEach(line => {
    const parts = splitLine(line);
    if (parts.length < 2) return;

    const firstColClean = removeAccents(parts[0]).toLowerCase().replace(/[\s_*()-]+/g, '');
    if (!firstColClean || ignoredKeywords.some(k => firstColClean.includes(k) || k.includes(firstColClean))) {
      return; // skip headers
    }

    const nameStartCheck = /^[a-zA-Z\dÀ-ỹ]/.test(parts[0]);
    if (!nameStartCheck) return;

    const staffVal = parts[0];

    // Remove trailing empty elements from parts
    while (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop();
    }

    if (isDetailed) {
      if (parts.length >= 3) {
        const totalRevRaw = cleanNumber(parts[parts.length - 2]);
        const percentRaw = cleanNumber(parts[parts.length - 1]);
        
        let totalRevenue = totalRevRaw;
        // Scale to absolute VND if it's in millions (e.g. 107.33 -> 107,330,000)
        if (Math.abs(totalRevenue) > 0 && Math.abs(totalRevenue) < 1000000) {
          totalRevenue = totalRevenue * 1000000;
        }

        let percent = percentRaw;
        const lastPart = parts[parts.length - 1];
        if (percent > 0 && percent <= 1 && lastPart && !lastPart.includes('%')) {
          percent = percent * 100;
        }

        const installmentRevenue = totalRevenue * (percent / 100);

        parsedRows.push({
          nhanVien: staffVal,
          totalRevenue,
          installmentRevenue,
          billCount: 0,
          percent
        });
      }
    } else {
      // Standard format
      if (parts.length >= 3) {
        const totalRevRaw = cleanNumber(parts[1]);
        const installRevRaw = cleanNumber(parts[2]);
        const billCount = parts.length > 3 ? cleanNumber(parts[3]) : 0;
        
        let percent = parts.length > 4 ? cleanNumber(parts[4]) : 0;
        if (percent > 0 && percent <= 1 && parts[4] && !parts[4].includes('%')) {
          percent = percent * 100;
        }

        let totalRevenue = totalRevRaw;
        if (Math.abs(totalRevenue) > 0 && Math.abs(totalRevenue) < 1000000) {
          totalRevenue = totalRevenue * 1000000;
        }

        let installmentRevenue = installRevRaw;
        if (Math.abs(installmentRevenue) > 0 && Math.abs(installmentRevenue) < 1000000) {
          installmentRevenue = installmentRevenue * 1000000;
        }

        if (percent === 0 && totalRevenue > 0) {
          percent = (installmentRevenue / totalRevenue) * 100;
        }

        parsedRows.push({
          nhanVien: staffVal,
          totalRevenue,
          installmentRevenue,
          billCount,
          percent
        });
      }
    }
  });

  return parsedRows;
}

const sampleData = `
Nhân viên	HomeCredit(HC)		FECredit(FE)		Shinhan Finance		DT Siêu thị (*)	Tỷ Trọng Trả Chậm (%) (**)
	DT Trả Chậm	Tỷ Trọng Trả Chậm (%)	DT Trả Chậm	Tỷ Trọng Trả Chậm (%)	DT Trả Chậm	Tỷ Trọng Trả Chậm (%)		
Tổng	607.20	75.54	189.90	23.62	6.76	0.84	1,584.91	50.72
Võ Hải Đăng							5.36	0.00
Trần Văn Duy	53.21	63.54	30.53	36.46			107.33	78.03
Châu Hoàng Lam							5.81	0.00
Nguyễn Thị Nhạn			12.03	100.00			48.83	24.63
Hà Thu Trang	38.47	100.00					48.73	78.95
Lâm Thị Như Ý	-4.35	100.00					12.34	-35.27
`;

console.log(JSON.stringify(parseTraChamData(sampleData), null, 2));
