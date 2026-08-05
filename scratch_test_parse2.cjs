const fs = require('fs');
const parser = require('@babel/parser');

try {
  // Read file directly
  const code = fs.readFileSync('/Users/linhvu/Desktop/APP Antigravity IDE/crm---siêu-thị/src/pages/TnbLeader.tsx', 'utf8');

  parser.parse(code, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
    ],
  });
  console.log('Success!');
} catch (e) {
  console.error(e.message);
  console.error(e.loc);
}
