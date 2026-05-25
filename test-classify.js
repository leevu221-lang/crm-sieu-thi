const classifyHinhThucXuat = (htx) => {
   const clean = htx.trim().toLowerCase().replace(/\s+/g, ' ');
   const mapping = {
     'xuất bán hàng online tại siêu thị': 'Tiền mặt',
     'xuất bán hàng online tiết kiệm': 'Tiền mặt',
     'xuất bán hàng tại siêu thị': 'Tiền mặt',
     'xuất bán hàng tại siêu thị (tcđm)': 'Tiền mặt',
     'xuất bán online giá rẻ': 'Tiền mặt',
     'xuất bán pre-order tại siêu thị': 'Tiền mặt',
     'xuất bán ưu đãi cho nhân viên': 'Tiền mặt',
     'xuất dịch vụ thu hộ bảo hiểm': 'Tiền mặt',
     'xuất đổi bảo hành sản phẩm imei': 'Tiền mặt',
     'xuất đổi bảo hành tại siêu thị': 'Tiền mặt',
     'xuất sim trắng kèm theo sim': 'Tiền mặt',
     'xuất bán hàng trả góp online': 'Trả góp',
     'xuất bán hàng trả góp online giá rẻ': 'Trả góp',
     'xuất bán hàng trả góp online tiết kiệm': 'Trả góp',
     'xuất bán hàng trả góp tại siêu thị': 'Trả góp',
     'xuất bán hàng trả góp tại siêu thị (tcđm)': 'Trả góp',
     'xuất bán trả góp ưu đãi cho nhân viên': 'Trả góp',
     'xuất đổi bảo hành sản phẩm trả góp có imei': 'Trả góp',
     'xuất dịch vụ thu hộ cước payoo': 'Thu hộ',
     'xuất dịch vụ thu hộ qua epay': 'Thu hộ',
     'xuất dịch vụ thu hộ qua smartnet': 'Thu hộ',
     'xuất dịch vụ thu hộ qua tổng công ty viettel': 'Thu hộ'
   };
   return mapping[clean] || null;
 };

 const list = [
  "Xuất bán hàng Online tại siêu thị",
  "Xuất bán hàng online tiết kiệm",
  "Xuất bán hàng tại siêu thị",
  "Xuất bán hàng tại siêu thị (TCĐM)",
  "Xuất bán Online giá rẻ",
  "Xuất bán pre-order tại siêu thị",
  "Xuất bán ưu đãi cho nhân viên",
  "Xuất dịch vụ thu hộ bảo hiểm",
  "Xuất đổi bảo hành sản phẩm IMEI",
  "Xuất đổi bảo hành tại siêu thị",
  "Xuất SIM trắng kèm theo SIM",
  "Xuất bán hàng trả góp Online",
  "Xuất bán hàng trả góp Online giá rẻ",
  "Xuất bán hàng trả góp online tiết kiệm",
  "Xuất bán hàng trả góp tại siêu thị",
  "Xuất bán hàng trả góp tại siêu thị (TCĐM)",
  "Xuất bán trả góp ưu đãi cho nhân viên",
  "Xuất đổi bảo hành sản phẩm trả góp có IMEI",
  "Xuất dịch vụ thu hộ cước Payoo",
  "Xuất dịch vụ thu hộ qua Epay",
  "Xuất dịch vụ thu hộ qua SmartNet",
  "Xuất dịch vụ thu hộ qua tổng công ty Viettel"
 ];
 list.forEach(item => {
    const res = classifyHinhThucXuat(item);
    if (!res) console.log("FAILED:", item);
 });
 console.log("DONE");
