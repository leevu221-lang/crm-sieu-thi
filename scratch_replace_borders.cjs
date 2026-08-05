const fs = require('fs');
const path = './src/pages/TnbLeader.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/border-white\/20/g, 'border-white');
fs.writeFileSync(path, content);
console.log('Replaced successfully');
