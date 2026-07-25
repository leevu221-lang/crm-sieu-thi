// Debug: simulate classifyProduct to find what matches '1 ĐỔI 1' or any insurance type
// for common product names

const removeAccents = (str) => {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const classifyProduct = (name) => {
  const n = String(name || '').toUpperCase();
  const norm = removeAccents(name).toUpperCase();
  if (n.includes('ICALLME') || n.includes('ICALL')) return 'Icall';
  if (n.includes('MANGO')) return 'Mango';
  if (n.includes('GIC-BOLTTECH_BẢO VỆ MÀN HÌNH') || n.includes('BẢO VỆ MÀN HÌNH') || n.includes('BVMH') || norm.includes('BVMH') || norm.includes('BAO VE MAN HINH')) return 'BVMH';
  if (n.includes('1 ĐỔI 1') || norm.includes('1 DOI 1') || norm.includes('1DOI1') || n.includes('PVI_') || norm.includes('PVI')) return '1 ĐỔI 1';
  if (n.includes('BẢO HIỂM KHOẢN VAY') || n.includes('BHKV') || norm.includes('BHKV')) return 'BHKV';
  if (n.includes('BHMR') || n.includes('BẢO HÀNH MỞ RỘNG') || norm.includes('BHMR') || norm.includes('BAO HANH MO RONG') || n.includes('MIC_') || norm.includes('MIC_')) return 'BHMR';
  if (n.includes('BẢO HIỂM RƠI VỠ') || n.includes('BHRV') || norm.includes('BHRV') || norm.includes('ROI VO')) return 'BHRV';
  if (n.includes('BẢO HIỂM SC+') || n.includes('SC+') || n.includes('CARE+') || norm.includes('SC+') || norm.includes('CARE+')) return 'SC+';
  if (n.includes('BẢO HÀNH APPLECARE+') || n.includes('APPLECARE') || norm.includes('APPLECARE')) return 'BHAP';
  if (n.includes('BẢO HIỂM Ô TÔ') || n.includes('BHOT')) return 'BHOT';
  if (n.includes('BẢO HIỂM VẬT CHẤT') || n.includes('BHVC')) return 'BHVC';
  if (n.includes('BẢO HIỂM XE MÁY') || n.includes('BHXM')) return 'BHXM';
  if (n.includes('BẢO HIỂM XE MOTO') || n.includes('BHMT')) return 'BHMT';
  if (n.includes('BẢO HIỂM XÃ HỘI') || n.includes('BHXH')) return 'BHXH';
  if (n.includes('BẢO HIỂM Y TẾ') || n.includes('BHYT')) return 'BHYT';
  if (n.includes('GIC_') || n.includes('GIC-') || norm.includes('GIC_') || norm.includes('GIC-')) return 'GIC';
  if (n.includes('01 THÁNG')) return 'V1';
  if (n.includes('03 THÁNG')) return 'V2';
  if (n.includes('06 THÁNG')) return 'V4';
  return '-';
};

// Test products that might contain "PVI" as substring
const testProducts = [
  'PVI_Bảo hành 1 đổi 1 lỗi NSX',
  'MIC_Bảo hiểm bảo hành mở rộng_12 tháng',
  'Samsung Galaxy S26 Ultra 256GB',
  'iPhone 16 Pro Max 256GB',
  'Laptop Lenovo ThinkPad X1',
  'Nạp tiền điện thoại Viettel',
  'Thu hộ tiền điện EVN',
  'Thu hộ trả góp FE Credit',
  'Bộ mở rộng sóng Wi-Fi TP-Link',
  'Thẻ nhớ mở rộng Samsung 128GB',
  'VieON gói 01 tháng',
  'VieON gói 03 tháng',
  'VieON gói 06 tháng',
  'Apple Care+ cho iPhone 15 Pro',
  'SC+ Bảo vệ màn hình',
  'Khay SIM mở rộng',
  'Tivi Samsung 55" Smart TV',
  'Máy giặt LG 9kg AI DD',
  'Điều hòa Daikin 1.5HP Inverter',
  'Oppo Reno 11 5G',
];

console.log("=== classifyProduct results ===");
testProducts.forEach(p => {
  const result = classifyProduct(p);
  const isInsurance = ['BHXM', 'BHRV', 'BHMR', 'BHKV', 'SC+', '1 ĐỔI 1', 'BHAP', 'BHOT', 'BHVC', 'BHMT', 'BHXH', 'BHYT', 'BVMH', 'GIC'].includes(result);
  if (result !== '-') {
    console.log(`  ${isInsurance ? '⚠️ INSURANCE' : '   OTHER   '}: "${p}" => ${result}`);
  }
});

// Check if "PVI" appears as substring in common Vietnamese words
console.log("\n=== Checking PVI substring matching ===");
const wordsWithPVI = [
  'OPVIDO', // hypothetical
  'Laptop Pavilion HP',  // "Pavilion" normalized
];
wordsWithPVI.forEach(w => {
  const norm = removeAccents(w).toUpperCase();
  console.log(`  "${w}" normalized: "${norm}" -> contains PVI: ${norm.includes('PVI')}`);
});

// KEY CHECK: Does "Pavilion" contain "PVI"?
console.log("\n=== Critical check: HP Pavilion ===");
const pavilion = 'Laptop HP Pavilion 15-eg3000';
const normPav = removeAccents(pavilion).toUpperCase();
console.log(`"${pavilion}" -> norm: "${normPav}" -> contains PVI: ${normPav.includes('PVI')}`);

// Check "Preview"
const preview = 'Phần mềm Preview Pro';
const normPre = removeAccents(preview).toUpperCase();
console.log(`"${preview}" -> norm: "${normPre}" -> contains PVI: ${normPre.includes('PVI')}`);
