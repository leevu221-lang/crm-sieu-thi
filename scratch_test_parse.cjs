const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

try {
  const filePath = path.join(__dirname, 'src', 'pages', 'TnbLeader.tsx');
  const code = fs.readFileSync(filePath, 'utf8');

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
