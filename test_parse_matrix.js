const cleanCategoryName = (name) => {
  if (!name) return '';
  let namePart = name;
  const targetMatch = namePart.match(/(.+?)\bTARGET\b/i);
  if (targetMatch) {
    namePart = targetMatch[1];
  }
  let clean = removeAccents(namePart).trim();
  clean = clean.replace(/\b(bao hiem)\b/g, 'bh');
  clean = clean.replace(/\b(dien may xanh)\b/g, 'dmx');
  clean = clean.replace(/\b(the gioi di dong)\b/g, 'tgdd');
  clean = clean.replace(/\b(gia dung)\b/g, 'gd');
  clean = clean.replace(/\b(phu kien)\b/g, 'pk');
  
  clean = clean.replace(/bao\s+hiem/g, 'bh');
  clean = clean.replace(/dien\s+may\s+xanh/g, 'dmx');
  clean = clean.replace(/the\s+gioi\s+di\s+dong/g, 'tgdd');
  clean = clean.replace(/gia\s+dung/g, 'gd');
  clean = clean.replace(/phu\s+kien/g, 'pk');

  return clean.replace(/[^a-z0-9]/g, '');
};

const removeAccents = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const input = `Phòng ban
Bán hàng Máy Lạnh & Tủ Lạnh Hãng Hisense
DTLK
Gia dụng
DTLK
Nồi cơm
DTLK
Quạt Gió
DTLK
Quạt điều hòa
DTLK
MÁY LỌC KHÔNG KHÍ - HÚT ẨM - HÚT BỤI
DTLK
Máy lọc nước
DTLK
Panasonic
DTLK
Máy Lạnh
DTLK
Máy lạnh đặc quyền
DTLK
TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT
DTLK
NH MÁY GIẶT & MÁY GIẶT ĐẶC QUYỀN
DTLK
Điện Tử
DTLK
Điện Tử TCL
DTLK
Máy Lạnh Casper
DTLK
TỦ LẠNH SBS HITACHI
DTLK
SMARTPHONE FLAGSHIP & TABLET ANDROID
DTLK
ĐIỆN THOẠI, TABLET KÊNH DMX
DTLK
Điện thoại Realme
DTLK
Điện thoại Vivo
DTLK
Camera
DTLK
Điện thoại khác
DTLK
Phụ kiện - Đồng hồ
DTLK
Pin dự phòng
SLLK`;

const raw = input.trim();
const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

for (let i = 0; i < lines.length; i++) {
  let catName = lines[i].trim();
  if (catName.includes("TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT")) {
    const isColumnTypesLine = /^(DTLK|SLLK|SL|DT|Realtime|REALTIME|\s)+$/i.test(catName);
    const numbers = catName.match(/-?\d+[\d,.]*/g) || [];
    const hasManyNumbers = numbers.length >= 2;
    const lowerCatName = catName.toLowerCase();
    
    // In ra kết quả kiểm tra từng ex
    const exList = [
      'tổng', 'tong',
      'bp all in one',
      'bp trưởng ca', 'bp truong ca',
      'hỗ trợ bi', 'ho tro bi',
      'copyright',
      'dashboard',
      'bc ',
      'hd sử dụng', 'hd su dung',
      'trang chủ', 'trang chu',
      'báo cáo', 'bao cao',
      'khối kinh doanh', 'khoi kinh doanh',
      'logo bi',
      'avatar'
    ];
    
    console.log("catName:", catName);
    console.log("isColumnTypesLine:", isColumnTypesLine);
    console.log("hasManyNumbers:", hasManyNumbers);
    
    exList.forEach(ex => {
      const match = lowerCatName.includes(ex);
      if (match) {
        console.log(`Matched ex: "${ex}"`);
      }
    });
  }
}
