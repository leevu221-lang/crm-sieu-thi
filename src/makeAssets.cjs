const fs = require('fs');
const b64 = fs.readFileSync('src/spriteb64.txt', 'utf8');

const tsFile = `export const DMX_SPRITE_B64 = "${b64}";\n`;

if (!fs.existsSync('src/constants')) {
  fs.mkdirSync('src/constants');
}
fs.writeFileSync('src/constants/assets.ts', tsFile);
console.log('Written to assets.ts');
