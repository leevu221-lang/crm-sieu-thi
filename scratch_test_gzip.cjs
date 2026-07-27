const { CompressionStream, DecompressionStream } = require('node:stream/web');

async function compressString(str) {
  if (!str) return str;
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
  const response = new Response(stream);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'GZ:' + btoa(binary);
}

async function decompressString(str) {
  if (!str || !str.startsWith('GZ:')) return str;
  const binary = atob(str.slice(3));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(stream);
  return await response.text();
}

async function run() {
  const dummyRow = "ĐMX\tYêu cầu xuất DV thu hộ bảo hiểm\t01841SO26070858687\tXuất dịch vụ thu hộ bảo hiểm\t25/07/2026 16:14\tTrương Văn Thanh\txxx\t560000\t560000\t0\t0\tĐã duyệt\tĐã thu\tĐã xuất\tĐã giao\tChưa hủy\tTiền mặt siêu thị\tGiao tại siêu thị\t59442\tLê Kim Mỹ\t0\t17\t\t59442 - Lê Kim Mỹ\t25/07/2026 16:18\t01841OV26070629866\t25/07/2026 16:18\t1841\tĐML_CMA_CMA - 155A Nguyễn Tất Thành\t\t\t1644479000070\tPVI_Bảo hành 1 đổi 1 lỗi NSX\t336216\t\t1\t560000\t560000\t\t164 - VAS\t4479 - Dịch Vụ Bảo Hiểm\tBảo hiểm PVI\t1 - Mới\t25/07/2026 16:18\tChưa trả\t1841\tẤp Lộ Xe, Xã Lương Thế Trân, Huyện Cái Nước, Tỉnh Cà Mau\temail@example.com\t0\tKH123456789\tCT987654321\t100";
  const rows = [];
  for (let i = 0; i < 3000; i++) rows.push(dummyRow);
  const bigTsv = rows.join('\n');

  console.log('Raw TSV size:', bigTsv.length, 'bytes (~', (bigTsv.length / 1024 / 1024).toFixed(2), 'MB)');
  
  const compressed = await compressString(bigTsv);
  console.log('Compressed GZ size:', compressed.length, 'bytes (~', (compressed.length / 1024).toFixed(2), 'KB)');
  console.log('Reduction ratio:', (100 * (1 - compressed.length / bigTsv.length)).toFixed(1), '%');

  const decompressed = await decompressString(compressed);
  console.log('Decompression success:', decompressed === bigTsv);
}

run();
