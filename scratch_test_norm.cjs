const normalize = (s) => {
  if (!s) return "";
  const basic = s.trim().normalize('NFC').replace(/[\s\-_]+/g, ' ').toLowerCase();
  return basic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
};

const pmName = "ĐML_CMA_CMA - 155A Nguyễn Tất Thành";
const dmName = "ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH";

console.log("pmName normalized:", JSON.stringify(normalize(pmName)));
console.log("dmName normalized:", JSON.stringify(normalize(dmName)));
console.log("pmName normalized length:", normalize(pmName).length);
console.log("dmName normalized length:", normalize(dmName).length);
console.log("Equal?", normalize(pmName) === normalize(dmName));
console.log("Includes pm in dm?", normalize(dmName).includes(normalize(pmName)));
console.log("Includes dm in pm?", normalize(pmName).includes(normalize(dmName)));
