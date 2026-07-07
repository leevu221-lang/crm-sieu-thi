const fs = require('fs');

const bundlePath = 'dist/assets/ToolHoTro-BqFFArdE.js';
if (!fs.existsSync(bundlePath)) {
  console.log(`Bundle not found at ${bundlePath}`);
  process.exit(1);
}

const content = fs.readFileSync(bundlePath, 'utf8');
console.log(`Bundle length: ${content.length} characters`);

const searchRegex = /mln/gi;
let match;
let count = 0;

while ((match = searchRegex.exec(content)) !== null) {
  count++;
  const idx = match.index;
  const start = Math.max(0, idx - 150);
  const end = Math.min(content.length, idx + 150);
  console.log(`\n--- Match #${count} at index ${idx} ---`);
  console.log(content.substring(start, end));
  if (count >= 15) {
    console.log('\nTruncated after 15 matches');
    break;
  }
}
