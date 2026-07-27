// Quick debug: simulate filteredRawYcxRows filter with user's data
const data = `Thương hiệu\tLoại YCX\tMã đơn hàng\tHình thức xuất\tNgày tạo\tTên khách hàng\tSố điện thoại\tPhải thu\tĐã thu\tCòn nợ\tPhụ phí\tTrạng thái duyệt\tTrạng thái thu tiền\tTrạng thái xuất\tTrạng thái giao hàng\tTrạng thái hủy\tHình thức thanh toán\tHình thức giao hàng\tMã nhân viên giao hàng\tTên nhân viên giao hàng\tKhoảng cách giao hàng\tTạo từ\tChứng từ liên quan\tNgười tạo\tThời gian hẹn giao\tMã phiếu xuất\tNgày xuất hàng\tMã siêu thị xuất hàng\tSiêu thị xuất\tSố hóa đơn\tKý hiệu hóa đơn\tMã sản phẩm\tTên sản phẩm\tMã SP web\tIMEI_1\tSố lượng\tGiá bán\tGiá bán_1\tCTKM_1\tNgành hàng\tNhóm hàng\tNhà sản xuất\tTrạng thái hồ sơ\tThời gian thu tiền\tTình trạng nhập trả của sản phẩm đổi với sản phẩm chính\tMã kho tạo\tĐịa chỉ khách hàng\tEmail KH\tGiá trị giảm\tMã khách hàng\tChứng từ liên quan_1\tSTT_1`;

const rows = data.split('\n').filter(l => l.trim()).map(l => l.split('\t'));
const headers = rows[0].map(h => h.trim());

console.log('Headers count:', headers.length);

// Find key columns
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// Find idxStatus
const idxStatus = headers.findIndex(h => {
  const lower = removeAccents(h).toLowerCase().trim();
  return lower === 'trang thai xuat' || lower === 'trang thai ycx' || lower === 'tinh trang xuat';
});

// Find idxThuTien
const idxThuTien = headers.findIndex(h => {
  const lower = removeAccents(h).toLowerCase().trim();
  return lower === 'trang thai thu tien';
});

// Find idxTra
const idxTra = headers.findIndex(h => {
  const lower = removeAccents(h).toLowerCase().trim();
  return lower.includes('tinh trang nhap tra') || lower.includes('nhap tra') || lower === 'tra hang';
});

console.log('idxStatus:', idxStatus, '→', headers[idxStatus]);
console.log('idxThuTien:', idxThuTien, '→', headers[idxThuTien]);
console.log('idxTra:', idxTra, '→', headers[idxTra]);

// Check "Giá bán_1"
const idxRevenue = headers.findIndex(h => {
  const norm = removeAccents(h).toLowerCase().trim().replace(/\s+/g, ' ');
  return (norm.includes('gia ban') && norm.includes('1')) || norm === 'gia ban_1' || norm === 'gia ban 1';
});
console.log('idxRevenue:', idxRevenue, '→', headers[idxRevenue]);

// Find staff 
const idxStaff = headers.findIndex(h => removeAccents(h).toLowerCase().trim() === 'nguoi tao');
console.log('idxStaff:', idxStaff, '→', headers[idxStaff]);

// Test sample values
const testRow = "ĐMX\tYêu cầu xuất DV thu hộ bảo hiểm\t01841SO26070858687  \tXuất dịch vụ thu hộ bảo hiểm\t25/07/2026 16:14\tTrương Văn Thanh\txxx\t560000\t560000\t0\t0\tĐã duyệt\tĐã thu\tĐã xuất\tĐã giao\tChưa hủy\tTiền mặt siêu thị\tGiao tại siêu thị\t59442\tLê Kim Mỹ\t0\t17\t\t59442 - Lê Kim Mỹ\t25/07/2026 16:18\t01841OV26070629866  \t25/07/2026 16:18\t1841\tĐML_CMA_CMA - 155A Nguyễn Tất Thành\t\t\t1644479000070       \tPVI_Bảo hành 1 đổi 1 lỗi NSX\t336216\t\t1\t560000\t560000\t\t164 - VAS\t4479 - Dịch Vụ Bảo Hiểm\tBảo hiểm PVI\t1 - Mới\t25/07/2026 16:18\tChưa trả\t1841\t\t\t\t1,079,182,631\t01841SV2607090704   \t6".split('\t');

console.log('\n--- Test Row (insurance) ---');
console.log('Trạng thái thu tiền:', testRow[idxThuTien]);
console.log('Trạng thái xuất:', testRow[idxStatus]);
console.log('Nhập trả:', testRow[idxTra]);
console.log('Người tạo:', testRow[idxStaff]);
console.log('Giá bán_1:', testRow[idxRevenue]);

const statusVal = removeAccents(String(testRow[idxStatus] || '')).trim().toLowerCase();
const thuTienVal = removeAccents(String(testRow[idxThuTien] || '')).trim().toLowerCase();
console.log('\nNormalized statusValue:', statusVal, '→ includes da xuat:', statusVal.includes('da xuat'));
console.log('Normalized thuTienValue:', thuTienVal, '→ includes da thu:', thuTienVal.includes('da thu'));
