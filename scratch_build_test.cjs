const fs = require('fs');

const rawData = `
724 - Phiếu mua hàng điện tử	2151 - Phiếu mua hàng/Pre Order
484 - Điện gia dụng	958 - Lò vi sóng
704 - Khuyến mãi - SP Ảo	2011 - Khuyến mãi - SP Ảo
16 - Phụ kiện tiện ích	7339 - Quạt cầm tay
16 - Phụ kiện tiện ích	3345 - Cáp
304 - Điện tử	1094 - Tivi LED (IMEI)
1754 - Máy lạnh, nước nóng	1098 - Máy lạnh (IMEI)
464 - Giao dịch AirTime	4519 - Thu Hộ Tiền Trả Góp
484 - Điện gia dụng	4146 - Bếp gas đôi
484 - Điện gia dụng	4161 - Quạt treo
1755 - Tủ lạnh, đông, mát	893 - Tủ đông
1214 - Gia dụng lắp đặt	3779 - Bếp điện âm
464 - Giao dịch AirTime	4599 - Thu Hộ Tiền Mặt
1755 - Tủ lạnh, đông, mát	1097 - Tủ lạnh (IMEI)
1034 - Dụng cụ nhà bếp	3187 - Bình/Ly/Ca giữ nhiệt
16 - Phụ kiện tiện ích	6479 - Camera IP Trong nhà
13 - Điện thoại	1491 - Smartphone
16 - Phụ kiện tiện ích	12 - Pin sạc dự phòng
184 - Phụ kiện trang trí	58 - Miếng dán mặt sau
1994 - Dịch vụ bảo hành, bảo dưỡng Điện máy xanh	7161 - Dịch vụ bảo hành 1 đổi 1 bởi Điện Máy Xanh
17 - Khuyến mãi giữ hộ	1051 - Khuyến mãi Điện gia dụng
484 - Điện gia dụng	4142 - Bình đun siêu tốc
484 - Điện gia dụng	4153 - Xay Sinh tố
1394 - Phụ kiện lắp đặt	4324 - Khung treo, giá đỡ
1034 - Dụng cụ nhà bếp	3265 - Nồi
164 - VAS	571 - UDDĐ
484 - Điện gia dụng	4159 - Quạt đứng
184 - Phụ kiện trang trí	431 - Ốp Lưng - Flip Cover
1274 - Đồng Hồ Thời Trang	4070 - Đồng hồ Trẻ em
464 - Giao dịch AirTime	2531 - Thu hộ Mservice
464 - Giao dịch AirTime	2571 - Thu hộ cước Viettel
905 - Khuyến mãi mua	2413 - Khuyến mãi Điện Tử - Mua
1756 - Máy giặt, sấy	3659 - Máy sấy lồng ngang
484 - Điện gia dụng	967 - Sấy tóc
16 - Phụ kiện tiện ích	4659 - Phụ kiện tiện ích Apple
1994 - Dịch vụ bảo hành, bảo dưỡng Điện máy xanh	7139 - Dịch vụ Bảo hành mở rộng Thợ Điện Máy Xanh
1774 - Dịch vụ MWG cung cấp	6519 - Dịch vụ bảo trì/ bảo dưỡng thiết bị
16 - Phụ kiện tiện ích	14 - Sạc/ Adapter
16 - Phụ kiện tiện ích	15 - Tai nghe dây
1755 - Tủ lạnh, đông, mát	894 - Tủ mát
484 - Điện gia dụng	4156 - Nồi cơm nắp gài/nắp rời
13 - Điện thoại	18 - Điện Thoại Di Động
1116 - Máy lọc nước	4171 - Lọc nước dạng tủ đứng
184 - Phụ kiện trang trí	4199 - Miếng Dán Kính
484 - Điện gia dụng	4141 - Bàn ủi khô
1034 - Dụng cụ nhà bếp	4302 - Nón bảo hiểm các loại
16 - Phụ kiện tiện ích	7060 - Đèn năng lượng mặt trời
344 - Thẻ cào điện tử	971 - Thẻ cào điện tử
164 - VAS	4479 - Dịch Vụ Bảo Hiểm
464 - Giao dịch AirTime	4499 - Thu Hộ Phí Bảo Hiểm
664 - Sim Online	1891 - Sim Online
484 - Điện gia dụng	4147 - Bếp điện đơn
18 - Sim trắng	2291 - Sim trắng (Seri)
304 - Điện tử	880 - Loa Karaoke
17 - Khuyến mãi giữ hộ	19 - Khuyến mãi ĐTDĐ
16 - Phụ kiện tiện ích	3346 - Tai Nghe Bluetooth
1754 - Máy lạnh, nước nóng	911 - Máy nước nóng
1034 - Dụng cụ nhà bếp	3185 - Vệ sinh nhà cửa
16 - Phụ kiện tiện ích	16 - Thẻ Nhớ
1274 - Đồng Hồ Thời Trang	4063 - Đồng hồ Nữ Dây da
484 - Điện gia dụng	4154 - Xay ép/Khác
1994 - Dịch vụ bảo hành, bảo dưỡng Điện máy xanh	7159 - Dịch vụ vệ sinh máy lạnh Thợ Điện Máy Xanh
184 - Phụ kiện trang trí	1231 - Miếng dán mặt trước
16 - Phụ kiện tiện ích	73 - Phụ kiện điện máy
1394 - Phụ kiện lắp đặt	4169 - Lõi lọc
16 - Phụ kiện tiện ích	1031 - Loa di động
184 - Phụ kiện trang trí	410 - Phụ kiện TT khác
1116 - Máy lọc nước	4172 - Lọc nước âm tủ/trên bàn
16 - Phụ kiện tiện ích	531 - Pin
484 - Điện gia dụng	3799 - Quạt điều hòa
484 - Điện gia dụng	4099 - Nồi chiên
484 - Điện gia dụng	4158 - Nồi cơm điện tử
944 - Dịch vụ	2592 - Dịch vụ khác
484 - Điện gia dụng	4152 - Ổ cắm điện/vợt muỗi
484 - Điện gia dụng	4660 - Quạt sạc điện/Năng lượng mặt trời
484 - Điện gia dụng	4145 - Bếp gas đơn
22 - Laptop	42 - Laptop
16 - Phụ kiện tiện ích	4219 - Camera IP Ngoài trời
484 - Điện gia dụng	957 - Lò nướng
1034 - Dụng cụ nhà bếp	2999 - Dụng cụ nhà bếp khác
16 - Phụ kiện tiện ích	10 - Chuột
484 - Điện gia dụng	6000 - Máy ép trái cây
1274 - Đồng Hồ Thời Trang	4061 - Đồng hồ Nam Dây khác
484 - Điện gia dụng	4151 - Áp suất/lẩu/chiên/nướng
244 - Tablet	931 - Máy tính bảng
18 - Sim trắng	4019 - Sim trắng điện tử
484 - Điện gia dụng	4157 - Nồi cơm cao tần
464 - Giao dịch AirTime	2511 - Nạp tiền AirTime M_Service
224 - Dịch vụ sim	591 - Thay sim
184 - Phụ kiện trang trí	432 - Balo
16 - Phụ kiện tiện ích	4540 - Tai Nghe Bluetooth - imei
364 - IT	1273 - Màn hình, Máy tính để bàn
16 - Phụ kiện tiện ích	4095 - Cáp (Giá Rẻ)
17 - Khuyến mãi giữ hộ	1052 - Khuyến mãi Điện Lạnh
484 - Điện gia dụng	4160 - Quạt bàn/hộp/sàn
1034 - Dụng cụ nhà bếp	3240 - Hộp/Hũ
424 - Dịch vụ lắp đặt và bảo trì	1412 - Dịch vụ bảo trì
484 - Điện gia dụng	5000 - Chăm sóc sức khỏe/làm đẹp
484 - Điện gia dụng	3639 - Máy lọc không khí
1756 - Máy giặt, sấy	3859 - Máy rửa chén
764 - Loa vi tính	1351 - Loa vi tính (imei)
16 - Phụ kiện tiện ích	871 - USB
905 - Khuyến mãi mua	4320 - Đồng hồ - Khuyến mãi mua
2037 - Dịch vụ thu hộ cho Thợ ĐMX	7547 - Thu hộ dịch vụ Bảo hành Mở rộng gói Thợ ĐMX
17 - Khuyến mãi giữ hộ	80 - Khuyến mãi Khác
464 - Giao dịch AirTime	2471 - Thu hộ cước VinaPhone
1274 - Đồng Hồ Thời Trang	4062 - Đồng hồ Nữ Dây kim loại
484 - Điện gia dụng	4149 - Bình thủy điện
1994 - Dịch vụ bảo hành, bảo dưỡng Điện máy xanh	7160 - Dịch vụ bảo hành rơi vỡ Thợ Điện Máy Xanh
23 - Wearable	2391 - Smartwatch
16 - Phụ kiện tiện ích	4128 - Phụ Kiện công nghệ
484 - Điện gia dụng	4155 - Hút bụi cây
484 - Điện gia dụng	4139 - Đèn bàn/Đèn Sạc/Đèn bắt muỗi
1214 - Gia dụng lắp đặt	955 - Hút mùi/ hút khói
484 - Điện gia dụng	4140 - Bàn ủi hơi nước
1214 - Gia dụng lắp đặt	4144 - Bếp gas âm
1994 - Dịch vụ bảo hành, bảo dưỡng Điện máy xanh	7162 - Dịch vụ thay lõi lọc Thợ Điện Máy Xanh
364 - IT	1131 - Máy in, Fax
1034 - Dụng cụ nhà bếp	7400 - Ổ khóa
23 - Wearable	7259 - Đồng hồ định vị trẻ em
484 - Điện gia dụng	4439 - Hút Bụi Robot
23 - Wearable	4125 - Smartband
1274 - Đồng Hồ Thời Trang	4059 - Đồng hồ Nam Dây kim loại
264 - Khuyến mãi - PK kèm theo	751 - Khuyến mãi ba lô, túi xách
184 - Phụ kiện trang trí	5975 - Túi Chống Sốc
`;

// Now let's extract the actual classification code from RealtimePage.tsx and run it against this list
const content = fs.readFileSync('src/pages/RealtimePage.tsx', 'utf-8');
const classifyWithColumnCheckMatch = content.match(/const classifyWithColumnCheck = .*?};\n/s);
const resolveNhomSmallMatch = content.match(/const resolveNhomSmall = .*?};\n/s);
const NHOM_HANG_MAPMatch = content.match(/const NHOM_HANG_MAP: Record<string, { large: string, small: string }> = {.*?};\n/s);
const removeAccentsMatch = content.match(/const removeAccents = .*?};\n/s);
const getNhomSmallFromMapMatch = content.match(/const getNhomSmallFromMap = .*?};\n/s);

fs.writeFileSync('test_classifier.cjs', `
const activeCustomCategoryMap = null;

${removeAccentsMatch[0]}
${NHOM_HANG_MAPMatch[0]}
${getNhomSmallFromMapMatch[0]}
${classifyWithColumnCheckMatch[0]}
${resolveNhomSmallMatch[0]}

const lines = \`${rawData}\`.trim().split('\\n');
const results = [];
for (const line of lines) {
  if (!line) continue;
  const [nganh, nhom] = line.split('\\t');
  if (nganh === '0') continue;
  
  const large = classifyWithColumnCheck(nganh, '', nhom);
  const small = resolveNhomSmall(nganh, nhom, large, '');
  results.push({nganh, nhom, large, small});
}
console.log(JSON.stringify(results, null, 2));
`);
