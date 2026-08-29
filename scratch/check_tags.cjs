const fs = require('fs');
const content = fs.readFileSync('src/pages/TnbLeader.tsx', 'utf8');

const lines = content.split('\n');
const stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Match tags
  const regex = /<(\/)?(div|button|span|h[1-6]|p|table|tbody|thead|tr|td|th)(\s[^>]*?)?(\/?)>/gi;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const isSelfClosing = match[4] === '/';
    if (isSelfClosing) continue;

    if (isClosing) {
      if (stack.length > 0 && stack[stack.length - 1].tag === tagName) {
        stack.pop();
      } else {
        console.log(`Mismatch close at line ${i + 1}: </${tagName}>. Top of stack:`, stack[stack.length - 1]);
      }
    } else {
      stack.push({ tag: tagName, line: i + 1, text: line.trim() });
    }
  }
}

console.log('Remaining unclosed tags in stack:', stack.length);
stack.forEach(s => console.log(`Unclosed <${s.tag}> from line ${s.line}: ${s.text.substring(0, 60)}`));
