const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  console.error("❌ Thư mục backups không tồn tại!");
  process.exit(1);
}

const files = fs.readdirSync(backupsDir)
  .filter(f => f.endsWith('.zip'))
  .sort();

if (files.length === 0) {
  console.error("❌ Không tìm thấy bản backup nào trong thư mục backups!");
  process.exit(1);
}

// Lấy file zip chỉ định từ argument hoặc lấy bản trước bản mới nhất
let targetZip = process.argv[2];
if (!targetZip) {
  if (files.length === 1) {
    targetZip = files[0];
  } else {
    // Bản trước bản mới nhất (files[files.length - 2])
    targetZip = files[files.length - 2];
  }
}

const zipPath = path.isAbsolute(targetZip) ? targetZip : path.join(backupsDir, targetZip);

if (!fs.existsSync(zipPath)) {
  console.error(`❌ File backup không tồn tại: ${zipPath}`);
  process.exit(1);
}

console.log(`🔄 Đang khôi phục từ bản backup: ${path.basename(zipPath)}...`);

try {
  // Giải nén đè vào root directory (bỏ qua .env để tránh lỗi quyền hệ điều hành)
  const unzipCmd = `unzip -o -q "${zipPath}" -d "${rootDir}" -x ".env"`;
  execSync(unzipCmd, { stdio: 'inherit' });
  console.log(`✅ Đã khôi phục thành công từ bản backup: ${path.basename(zipPath)}!`);
} catch (err) {
  console.error("❌ Lỗi khi giải nén khôi phục:", err);
  process.exit(1);
}
