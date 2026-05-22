const s = "ĐMM_BLI_GRA - PHƯỜNG 1 (KHO BÁN HÀNG LƯU ĐỘNG)";
const basic = s.trim().normalize('NFC').replace(/[\s\-_]+/g, ' ').toLowerCase();
const result = basic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
console.log("basic:", basic);
console.log("result:", result);
console.log("includes 'kho ban hang luu dong'?", result.includes('kho ban hang luu dong'));
