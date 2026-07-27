function compactTsvForStorage(tsv) {
  if (!tsv || tsv.length < 800000) return tsv;

  const lines = tsv.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return tsv;

  const header = lines[0].split('\t').map(h => h.trim());
  
  // Find indices of essential columns to keep
  const keepIndices = new Set();
  
  header.forEach((h, idx) => {
    const norm = h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (
      norm.includes('thuong hieu') ||
      norm.includes('loai ycx') ||
      norm.includes('ma don hang') ||
      norm.includes('hinh thuc xuat') ||
      norm.includes('ngay tao') ||
      norm.includes('ten khach hang') ||
      norm.includes('phai thu') ||
      norm.includes('da thu') ||
      norm.includes('con no') ||
      norm.includes('trang thai duyet') ||
      norm.includes('trang thai thu tien') ||
      norm.includes('trang thai xuat') ||
      norm.includes('trang thai giao hang') ||
      norm.includes('trang thai huy') ||
      norm.includes('hinh thuc thanh toan') ||
      norm.includes('nguoi tao') ||
      norm.includes('ngay xuat') ||
      norm.includes('ma kho') ||
      norm.includes('sieu thi') ||
      norm.includes('ma san pham') ||
      norm.includes('ten san pham') ||
      norm.includes('so luong') ||
      norm.includes('gia ban') ||
      norm.includes('nganh hang') ||
      norm.includes('nhom hang') ||
      norm.includes('nha san xuat') ||
      norm.includes('trang thai ho so') ||
      norm.includes('nhap tra')
    ) {
      keepIndices.add(idx);
    }
  });

  if (keepIndices.size === 0) return tsv;

  const sortedIndices = Array.from(keepIndices).sort((a, b) => a - b);

  const compactedLines = lines.map(line => {
    const cells = line.split('\t');
    return sortedIndices.map(idx => cells[idx] || '').join('\t');
  });

  return compactedLines.join('\n');
}

// Test with 2MB dummy TSV
const dummyHeader = Array.from({length: 52}, (_, i) => `Col_${i}`).join('\t');
const headerWithKeys = "Thương hiệu\tLoại YCX\tMã đơn hàng\tHình thức xuất\tNgày tạo\tTên khách hàng\tSố điện thoại\tPhải thu\tĐã thu\tCòn nợ\tPhụ phí\tTrạng thái duyệt\tTrạng thái thu tiền\tTrạng thái xuất\tTrạng thái giao hàng\tTrạng thái hủy\tHình thức thanh toán\tHình thức giao hàng\tMã nhân viên giao hàng\tTên nhân viên giao hàng\tKhoảng cách giao hàng\tTạo từ\tChứng từ liên quan\tNgười tạo\tThời gian hẹn giao\tMã phiếu xuất\tNgày xuất hàng\tMã siêu thị xuất hàng\tSiêu thị xuất\tSố hóa đơn\tKý hiệu hóa đơn\tMã sản phẩm\tTên sản phẩm\tMã SP web\tIMEI_1\tSố lượng\tGiá bán\tGiá bán_1\tCTKM_1\tNgành hàng\tNhóm hàng\tNhà sản xuất\tTrạng thái hồ sơ\tThời gian thu tiền\tTình trạng nhập trả của sản phẩm đổi với sản phẩm chính\tMã kho tạo\tĐịa chỉ khách hàng\tEmail KH\tGiá trị giảm\tMã khách hàng\tChứng từ liên quan_1\tSTT_1";

const dummyRow = "ĐMX\tYêu cầu xuất DV thu hộ bảo hiểm\t01841SO26070858687\tXuất dịch vụ thu hộ bảo hiểm\t25/07/2026 16:14\tTrương Văn Thanh\txxx\t560000\t560000\t0\t0\tĐã duyệt\tĐã thu\tĐã xuất\tĐã giao\tChưa hủy\tTiền mặt siêu thị\tGiao tại siêu thị\t59442\tLê Kim Mỹ\t0\t17\t\t59442 - Lê Kim Mỹ\t25/07/2026 16:18\t01841OV26070629866\t25/07/2026 16:18\t1841\tĐML_CMA_CMA - 155A Nguyễn Tất Thành\t\t\t1644479000070\tPVI_Bảo hành 1 đổi 1 lỗi NSX\t336216\t\t1\t560000\t560000\t\t164 - VAS\t4479 - Dịch Vụ Bảo Hiểm\tBảo hiểm PVI\t1 - Mới\t25/07/2026 16:18\tChưa trả\t1841\tẤp Lộ Xe, Xã Lương Thế Trân, Huyện Cái Nước, Tỉnh Cà Mau\temail@example.com\t0\tKH123456789\tCT987654321\t100";

const rows = [headerWithKeys];
for (let i = 0; i < 3000; i++) {
  rows.push(dummyRow);
}
const fullTsv = rows.join('\n');
console.log('Original TSV size:', fullTsv.length, 'bytes');

const compacted = compactTsvForStorage(fullTsv);
console.log('Compacted TSV size:', compacted.length, 'bytes');
console.log('Reduction:', Math.round((1 - compacted.length / fullTsv.length) * 100), '%');
