const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'TnbLeader.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace 1: formatLuyKeValue helper definition
content = content.replace(/const formatLuyKeValue = \([\s\S]*?\};/, `const formatLuyKeValue = (val: number, rawStr?: string, isBillionScale?: boolean): string => {
  if (val === null || val === undefined) return '0';
  let normalizedVal = val;
  let wasScaledDown = false;
  if (val >= 5000 && val % 1000 === 0) {
    normalizedVal = val / 1000;
    wasScaledDown = true;
  }
  const hasThreeDecimals = rawStr ? /\\.\\d{3}$/.test(rawStr.trim()) : false;
  const shouldMultiply = isBillionScale && (normalizedVal < 10 && !hasThreeDecimals && !wasScaledDown);
  const valueInMillions = shouldMultiply ? normalizedVal * 1000 : normalizedVal;
  const rounded = Math.round(valueInMillions);
  return rounded.toLocaleString('en-US');
};`);

// Replace 2: Detailed Table, Top 20% Table, Bot 20% Table row mappers
content = content.replace(
  /const realValStr = \(row\[2\] \|\| '0'\)\.trim\(\);[\s\S]*?tarValRaw\.toFixed\(1\);/g,
  () => {
    return `const tarValStr = (row[3] || '0').trim();
                                     const tarValRaw = parseNum(tarValStr);
                                     const normTarVal = (tarValRaw >= 5000 && tarValRaw % 1000 === 0) ? tarValRaw / 1000 : tarValRaw;
                                     const isBillionScale = normTarVal < 10;

                                     const realValStr = (row[2] || '0').trim();
                                     const realValRaw = parseNum(realValStr);
                                     const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                     const realDisplay = isNaN(realValRaw)
                                       ? row[2]
                                       : isLuyKeMode
                                         ? formatLuyKeValue(realValRaw, realValStr, isBillionScale)
                                         : Number(realValRaw.toFixed(1));

                                     const tarDisplay = isNaN(tarValRaw)
                                       ? row[3]
                                       : isLuyKeMode
                                         ? formatLuyKeValue(tarValRaw, tarValStr, isBillionScale)
                                         : tarValRaw.toFixed(1);`;
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched TnbLeader.tsx!');
