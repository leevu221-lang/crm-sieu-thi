const fs = require('fs');

const rawText = `Dashboards
[Danh mục báo cáo](https://baocao.dienmayxanh.com/dashboard/home)[Hiệu quả kinh doanh](https://baocao.dienmayxanh.com/dashboard/effectiveness)[Doanh thu hợp nhất](https://baocao.dienmayxanh.com/dashboard/revenue-consolidated)[Thi đua](https://baocao.dienmayxanh.com/dashboard/thi-dua)[Doanh Thu Ngành Hàng BI](https://baocao.dienmayxanh.com/dashboard/bi-category)[Giờ Công Làm Việc](https://baocao.dienmayxanh.com/dashboard/timekeeping)[Báo cáo trả chậm](https://baocao.dienmayxanh.com/dashboard/tra-cham)[Lượt bill TGDĐ](https://baocao.dienmayxanh.com/dashboard/countbill-tgdd)[Chi phí chăm sóc khách hàng](https://baocao.dienmayxanh.com/dashboard/productreturncost)L
Linh Võ Vũemployee
Doanh thu hợp nhất
43751 - Linh Võ Vũ
Tìm báo cáo⌘KCập nhật lúc: 06:41:225/9/20261
Toggle theme
ChuỗiChọn
MiềnChọn
VùngChọn
Khu vựcChọn
Siêu thị1841 - ĐML_CMA_CMA - 155A Nguyễn Tất Thành×
Ngành hàngChọn
Nhóm hàngChọn
Lũy kếRealtime
DT thựcDT quy đổi
Tải lạiXuất ExcelXuất theo mẫu
Toàn công tySiêu thị 1841
DT quy đổi
351
triệu đồng · ngày 31/08 · lũy kế tới hết ngày 31/08
% HT target (LK)?
111.1%
Target trọn kỳ 6,978 · tiến độ 100.0%
TT vs TB 3 tháng?
+64.6%
TB3T cùng cửa sổ: 213
DT dự kiến?
7,752
nhịp 31 ngày → 31 ngày
TLPVTC hôm nay
12.0%
2,278 bill / 19,005 khách · 1/1 ST có máy đếm
Tỉ trọng trả góp
53.7%
DT trả góp 128 / 239
Doanh thu theo cấpTổng hợpNgành hàngNhân viên
✓Tỉ trọng✓Target✓Tăng trưởng✓Dự kiếnOff / Onl✓Trả góp
NHÂN VIÊN
SỐ LƯỢNG
DOANH THU QĐ
% TỈ TRỌNG
DOANH THU
TARGET
% HT TARGET (LK)
TB 3 THÁNG
% TT
DT DỰ KIẾN
DT TRẢ GÓP
% TRẢ GÓP
100544 - Trần Văn Duy
13
78
22.4%
56
—
—
0
—
883
37
66.2%
38834 - Ngô Thị Bé Thắm
10
43
12.3%
36
—
—
0
—
844
6
17.1%
97734 - Huỳnh Hoàng Phúc
9
43
12.3%
29
—
—
0
—
679
28
96.0%
12803 - Nguyễn Thị Nhạn
8
30
8.7%
23
—
—
0
—
594
0
0.0%
58638 - Phạm Ngọc Anh
7
31
8.7%
22
—
—
0
—
626
20
88.7%
46944 - Nguyễn Diễm My
11
24
6.9%
19
—
—
0
—
204
0
0.0%
21964 - Lâm Thị Như Ý
12
34
9.8%
17
—
—
0
—
554
10
56.3%
191664 - Phạm Văn Đại
3
19
5.3%
12
—
—
0
—
640
13
106.6%
157597 - Nguyễn Tuấn Mi
13
23
6.5%
11
—
—
0
—
432
7
66.8%
38847 - Nguyễn Hùng Mạnh
4
14
3.9%
10
—
—
0
—
452
8
84.3%
59442 - Lê Kim Mỹ
4
8
2.4%
4
—
—
0
—
621
0
0.0%
43751 - Võ Vũ Linh
1
3
0.8%
1
—
—
0
—
43
0
0.0%
online - Online - 18001060
2
0
0.1%
0
—
—
0
—
307
0
0.0%
administrator - Admin
0
0
0.0%
0
—
—
0
—
27
0
—
243340 - Đỗ Nguyễn Tú Quyên
0
0
0.0%
0
—
—
0
—
9
0
—
153086 - Hà Thu Trang
0
0
0.0%
0
—
—
0
—
12
0
—
38849 - Lê Văn Kỳ
0
0
0.0%
0
—
—
0
—
238
0
—
30653 - Nguyễn Duy Khắc
0
0
0.0%
0
—
—
0
—
0
0
—
54074 - Nguyễn Hoài Linh
0
0
0.0%
0
—
—
0
—
1
0
—
184104 - Nguyễn Vũ Kim Hằng
0
0
0.0%
0
—
—
0
—
6
0
—
162130 - Ong Trương Mỹ Trang
0
0
0.0%
0
—
—
0
—
2
0
—
58969 - Phan Hiếu Trung
0
0
0.0%
0
—
—
0
—
3
0
—
263330 - Tâm Thị Yến
0
0
0.0%
0
—
—
0
—
1
0
—
71132 - Thạch Vũ
0
0
0.0%
0
—
—
0
—
562
0
—
30013 - Trần Hải Yến
0
0
0.0%
0
—
—
0
—
13
0
—
7531 - Trần Thị Diễm Nhàn
0
0
0.0%
0
—
—
0
—
1
0
—
100554 - Võ Thị Ngọc Thư
0
0
0.0%
0
—
—
0
—
0
0
—
280219 - Vưu Huỳnh Trinh
0
0
0.0%
0
—
—
0
—
-2
0
—
Tổng (28 dòng)
97
351
100.0%
239
6,978
111.1%
213
+64.6%
7,752
128
53.7%
1-28 / Tổng 28 dòng
50 / trang
Đơn vị: triệu đồngTỉ trọng tính trong nhóm cùng cấp cha`;

function parseNum(val) {
  if (!val || val === '—' || val === '-' || val.trim() === '') return 0;
  const clean = val.replace(/,/g, '').replace(/%/g, '').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function parsePercent(val) {
  if (!val || val === '—' || val === '-' || val.trim() === '') return 0;
  const clean = val.replace(/,/g, '').replace(/%/g, '').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function parseMwgBiStaffRevenue(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Find where NHÂN VIÊN table starts
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toUpperCase() === 'NHÂN VIÊN' || lines[i].toUpperCase().includes('NHÂN VIÊN')) {
      // Check if nearby has DOANH THU or SỐ LƯỢNG
      const nextLines = lines.slice(i, i + 15).map(l => l.toUpperCase());
      if (nextLines.some(l => l.includes('DOANH THU') || l.includes('SỐ LƯỢNG'))) {
        startIndex = i;
        break;
      }
    }
  }

  // Also extract summary KPI if available
  let summaryKpi = {
    dtQd: 0,
    percentHtTarget: 0,
    targetTronKy: 0,
    dtDuKien: 0,
    tiTrongTraGop: 0,
    dtTraGop: 0,
    dtThuc: 0
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l === 'DT quy đổi' && lines[i+1]) {
      summaryKpi.dtQd = parseNum(lines[i+1]);
    }
    if (l.includes('% HT target') && lines[i+1]) {
      summaryKpi.percentHtTarget = parsePercent(lines[i+1]);
    }
    if (l.includes('Target trọn kỳ')) {
      const m = l.match(/Target trọn kỳ\s+([\d,.]+)/i);
      if (m) summaryKpi.targetTronKy = parseNum(m[1]);
    }
    if (l === 'DT dự kiến?' && lines[i+1]) {
      summaryKpi.dtDuKien = parseNum(lines[i+1]);
    }
    if (l === 'Tỉ trọng trả góp' && lines[i+1]) {
      summaryKpi.tiTrongTraGop = parsePercent(lines[i+1]);
    }
    if (l.includes('DT trả góp') && l.includes('/')) {
      const m = l.match(/DT trả góp\s+([\d,.]+)\s*\/\s*([\d,.]+)/i);
      if (m) {
        summaryKpi.dtTraGop = parseNum(m[1]);
        summaryKpi.dtThuc = parseNum(m[2]);
      }
    }
  }

  const staffRows = [];
  let totals = null;

  if (startIndex !== -1) {
    // Skip headers
    let cursor = startIndex;
    // Advance past header tokens
    while (cursor < lines.length) {
      const u = lines[cursor].toUpperCase();
      if (['NHÂN VIÊN', 'SỐ LƯỢNG', 'DOANH THU QĐ', '% TỈ TRỌNG', 'DOANH THU', 'TARGET', '% HT TARGET (LK)', 'TB 3 THÁNG', '% TT', 'DT DỰ KIẾN', 'DT TRẢ GÓP', '% TRẢ GÓP'].includes(u)) {
        cursor++;
      } else {
        break;
      }
    }

    // Now parse rows
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.startsWith('1-') || line.includes('Tổng (') || line.startsWith('Tổng') || line.includes('Đơn vị:')) {
        if (line.includes('Tổng (') || line.startsWith('Tổng')) {
          // Parse totals
          // Next tokens: SL, DT QĐ, %, DT, Target, % HT, TB3T, % TT, DT DK, DT TG, % TG
          const tRow = {
            title: line,
            quantity: parseNum(lines[cursor+1]),
            convertedRevenue: parseNum(lines[cursor+2]),
            shareRate: parsePercent(lines[cursor+3]),
            actualRevenue: parseNum(lines[cursor+4]),
            target: parseNum(lines[cursor+5]),
            targetRate: parsePercent(lines[cursor+6]),
            avg3Months: parseNum(lines[cursor+7]),
            growthRate: lines[cursor+8],
            expectedRevenue: parseNum(lines[cursor+9]),
            installmentRevenue: parseNum(lines[cursor+10]),
            installmentRate: parsePercent(lines[cursor+11]),
          };
          totals = tRow;
          cursor += 12;
        } else {
          cursor++;
        }
        continue;
      }

      // Check if this is a staff line: format "code - Name" or tabbed
      if (line.includes('\t')) {
        // Tab separated line
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length >= 5) {
          staffRows.push({
            staffName: cols[0],
            quantity: parseNum(cols[1]),
            convertedRevenue: parseNum(cols[2]),
            shareRate: parsePercent(cols[3]),
            actualRevenue: parseNum(cols[4]),
            target: parseNum(cols[5]),
            targetRate: parsePercent(cols[6]),
            avg3Months: parseNum(cols[7]),
            growthRate: cols[8] || '—',
            expectedRevenue: parseNum(cols[9]),
            installmentRevenue: parseNum(cols[10]),
            installmentRate: parsePercent(cols[11]),
          });
        }
        cursor++;
      } else {
        // Line-by-line format: 12 tokens
        const name = line;
        const q = parseNum(lines[cursor+1]);
        const convRev = parseNum(lines[cursor+2]);
        const share = parsePercent(lines[cursor+3]);
        const actRev = parseNum(lines[cursor+4]);
        const target = parseNum(lines[cursor+5]);
        const targetRate = parsePercent(lines[cursor+6]);
        const avg3m = parseNum(lines[cursor+7]);
        const growth = lines[cursor+8] || '—';
        const expRev = parseNum(lines[cursor+9]);
        const instRev = parseNum(lines[cursor+10]);
        const instRate = parsePercent(lines[cursor+11]);

        staffRows.push({
          staffName: name,
          quantity: q,
          convertedRevenue: convRev,
          shareRate: share,
          actualRevenue: actRev,
          target: target,
          targetRate: targetRate,
          avg3Months: avg3m,
          growthRate: growth,
          expectedRevenue: expRev,
          installmentRevenue: instRev,
          installmentRate: instRate,
        });

        cursor += 12;
      }
    }
  }

  return { summaryKpi, staffRows, totals };
}

const res = parseMwgBiStaffRevenue(rawText);
console.log('Summary KPI:', res.summaryKpi);
console.log('Total Staff Rows:', res.staffRows.length);
console.log('Sample Staff 1:', res.staffRows[0]);
console.log('Sample Staff 2:', res.staffRows[1]);
console.log('Sample Staff 10:', res.staffRows[9]);
console.log('Totals:', res.totals);
