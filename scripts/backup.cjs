const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function pad(n) {
  return n.toString().padStart(2, '0');
}

function getTimestampString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const date = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${date}_${hours}-${minutes}-${seconds}`;
}

const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = getTimestampString();
const zipFilename = `crm-sieu-thi_${timestamp}.zip`;
const zipPath = path.join(backupsDir, zipFilename);

console.log(`🚀 Đang tạo bản sao lưu dự án: ${zipFilename}...`);

try {
  // Loại trừ node_modules, dist, git, gemini, backups, cache
  const excludePatterns = [
    'node_modules/*',
    '*/node_modules/*',
    'dist/*',
    '*/dist/*',
    '.git/*',
    '*/.git/*',
    '.gemini/*',
    '*/.gemini/*',
    'backups/*',
    '*/backups/*',
    '*.DS_Store',
    '*/*.DS_Store',
    '.vite/*',
    '*/.vite/*'
  ];

  const excludeArg = excludePatterns.map(p => `"${p}"`).join(' ');
  const zipCmd = `cd "${rootDir}" && zip -r -q "${zipPath}" . -x ${excludeArg}`;
  
  execSync(zipCmd, { stdio: 'inherit' });

  const stats = fs.statSync(zipPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`✅ Đã tạo bản backup thành công!`);
  console.log(`📁 Đường dẫn: ${zipPath}`);
  console.log(`📦 Dung lượng: ${sizeMb} MB`);
} catch (err) {
  console.error(`❌ Backup thất bại:`, err.message);
  process.exit(1);
}
