const fs = require('fs');

const bundlePath = 'dist/assets/ToolHoTro-BqFFArdE.js';
if (!fs.existsSync(bundlePath)) {
  console.log(`Bundle not found at ${bundlePath}`);
  process.exit(1);
}

const content = fs.readFileSync(bundlePath, 'utf8');

// Basic formatter that inserts newlines and indents
let indent = 0;
let formatted = '';
for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') {
    indent++;
    formatted += '{\n' + '  '.repeat(indent);
  } else if (char === '}') {
    indent--;
    if (indent < 0) indent = 0;
    formatted += '\n' + '  '.repeat(indent) + '}';
  } else if (char === ';') {
    formatted += ';\n' + '  '.repeat(indent);
  } else {
    formatted += char;
  }
}

fs.writeFileSync('scratch_beautified.js', formatted, 'utf8');
console.log('Done! Formatted file written to scratch_beautified.js');
