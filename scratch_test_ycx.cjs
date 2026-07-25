const removeAccents = (str) => {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const headerStr = "Thương hiệu\tLoại YCX\tMã đơn hàng\tHình thức xuất\tNgày tạo\tTên khách hàng\tSố điện thoại\tPhải thu\tĐã thu\tCòn nợ\tPhụ phí\tTrạng thái duyệt\tTrạng thái thu tiền\tTrạng thái xuất\tTrạng thái giao hàng\tTrạng thái hủy\tHình thức thanh toán\tHình thức giao hàng\tMã nhân viên giao hàng\tTên nhân viên giao hàng\tKhoảng cách giao hàng\tTạo từ\tChứng từ liên quan\tNgười tạo\tThời gian hẹn giao\tMã phiếu xuất\tNgày xuất hàng\tMã siêu thị xuất hàng\tSiêu thị xuất\tSố hóa đơn\tKý hiệu hóa đơn\tMã sản phẩm\tTên sản phẩm\tMã SP web\tIMEI_1\tSố lượng\tGiá bán\tGiá bán_1\tCTKM_1\tNgành hàng\tNhóm hàng\tNhà sản xuất\tTrạng thái hồ sơ\tThời gian thu tiền\tTình trạng nhập trả của sản phẩm đổi với sản phẩm chính\tMã kho tạo\tĐịa chỉ khách hàng\tEmail KH\tGiá trị giảm\tMã khách hàng\tChứng từ liên quan_1\tSTT_1";

const row1Str = "ĐMX\tYêu cầu xuất DV thu hộ bảo hiểm\t01841SO26070858581  \tXuất dịch vụ thu hộ bảo hiểm\t25/07/2026 10:39\tTRÂN\txxx\t560000\t560000\t0\t0\tĐã duyệt\tĐã thu\tĐã xuất\tĐã giao\tChưa hủy\tTiền mặt siêu thị\tGiao tại siêu thị\t38847\tNguyễn Hùng Mạnh\t0\t17\t\t38847 - Nguyễn Hùng Mạnh\t25/07/2026 10:40\t01841OV26070629812  \t25/07/2026 10:40\t1841\tĐML_CMA_CMA - 155A Nguyễn Tất Thành\t\t\t1644479000070       \tPVI_Bảo hành 1 đổi 1 lỗi NSX\t336216\t\t1\t560000\t560000\t\t164 - VAS\t4479 - Dịch Vụ Bảo Hiểm\tBảo hiểm PVI\t1 - Mới\t25/07/2026 10:39\tChưa trả\t1841\t\t\t\t1,141,621,199\t01841SV2607090669   \t4";

const headers = headerStr.split('\t').map(h => h.trim());
const row1 = row1Str.split('\t');

console.log('Headers count:', headers.length);

let idxStatus = (() => {
  const exact = headers.findIndex(h => {
    const lower = removeAccents(h).toLowerCase().trim();
    return lower === 'trang thai xuat' || lower === 'trang thai ycx';
  });
  if (exact !== -1) return exact;
  return headers.findIndex(h => {
    const lower = removeAccents(h).toLowerCase().trim();
    return (lower.includes('trang thai xuat') || lower.includes('trang thai ycx') || lower.includes('tinh trang xuat')) && !lower.includes('thoi gian') && !lower.includes('ngay');
  });
})();

let idxThuTien = (() => {
  const exact = headers.findIndex(h => {
    const lower = removeAccents(h).toLowerCase().trim();
    return lower === 'trang thai thu tien' || lower === 'thu tien';
  });
  if (exact !== -1) return exact;
  return headers.findIndex(h => {
    const lower = removeAccents(h).toLowerCase().trim();
    return lower.includes('trang thai thu tien') && !lower.includes('thoi gian');
  });
})();

let idxTra = headers.findIndex(h => {
  const lower = removeAccents(h).toLowerCase().trim();
  return lower.includes('tinh trang nhap tra') || lower.includes('nhap tra');
});

console.log('idxStatus:', idxStatus, 'Header:', headers[idxStatus], 'Value:', row1[idxStatus]);
console.log('idxThuTien:', idxThuTien, 'Header:', headers[idxThuTien], 'Value:', row1[idxThuTien]);
console.log('idxTra:', idxTra, 'Header:', headers[idxTra], 'Value:', row1[idxTra]);
