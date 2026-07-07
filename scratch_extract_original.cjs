const fs = require('fs');
const readline = require('readline');

const logPath = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let longestMatch = '';
let matchCount = 0;

rl.on('line', (line) => {
  // We search for occurrences of a large TSX file block.
  // A TSX file block would contain "import React" and "export default function ToolHoTro"
  // Let's search using simple string matching or regex on the line itself.
  if (line.includes('export default function ToolHoTro') && line.includes('import React')) {
    matchCount++;
    console.log(`Found candidate match #${matchCount}, length: ${line.length}`);
    
    // Let's find the substring starting with "import React" and ending with "export default function ToolHoTro"
    // (plus the rest of the component definition).
    // Or we can just find any JSON strings that contain them.
    // Let's try to extract the clean file content.
    const startIdx = line.indexOf('import React');
    if (startIdx !== -1) {
      // Find the end of the file content.
      // Usually it ends around "export default ToolHoTro;" or some closing brackets.
      const endMarker = 'export default ToolHoTro;';
      const endIdx = line.indexOf(endMarker, startIdx);
      if (endIdx !== -1) {
        const fileContent = line.substring(startIdx, endIdx + endMarker.length);
        console.log(`Extracted file of length: ${fileContent.length} chars`);
        if (fileContent.length > longestMatch.length) {
          longestMatch = fileContent;
        }
      }
    }
  }
});

rl.on('close', () => {
  if (longestMatch) {
    fs.writeFileSync('ToolHoTro_recovered.tsx', longestMatch, 'utf8');
    console.log(`Successfully recovered ToolHoTro.tsx (${longestMatch.length} characters) to ToolHoTro_recovered.tsx`);
  } else {
    console.log('No matching file content found in the logs.');
  }
});
