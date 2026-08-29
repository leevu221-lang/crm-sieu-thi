const fs = require('fs');
const content = fs.readFileSync('src/pages/TnbLeader.tsx', 'utf8');

const lines = content.split('\n');
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inString = false;
  let strChar = '';
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if ((c === '"' || c === "'" || c === '`') && line[j - 1] !== '\\') {
      if (!inString) {
        inString = true;
        strChar = c;
      } else if (strChar === c) {
        inString = false;
      }
    }
    if (!inString) {
      if (c === '{') stack.push({ line: i + 1, text: line });
      if (c === '}') stack.pop();
    }
  }
}

console.log('Unclosed braces count:', stack.length);
stack.forEach(s => console.log(`Unclosed { at line ${s.line}: ${s.text.substring(0, 80)}`));
