const fs = require('fs');
const code = fs.readFileSync('src/pages/RTST/utils.ts', 'utf8');
const lines = code.split('\n');

for (let i = 332; i < 896; i++) {
  const line = lines[i];
  if (line.includes('row')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
