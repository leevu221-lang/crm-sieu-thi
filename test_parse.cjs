const fs = require('fs');
const parser = require('@babel/parser');
try {
  const code = fs.readFileSync('./src/pages/TnbLeader.tsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  console.log('Parse successful!');
} catch (e) {
  console.error(e.message);
  console.error(e.loc);
}
