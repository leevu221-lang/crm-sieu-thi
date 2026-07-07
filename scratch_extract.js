const fs = require('fs');

const logPath = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  // Let's find the last step where ToolHoTro.tsx was written or viewed with the code for in-dia-chi or in-phieu-bh
  let foundCode = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    try {
      const data = JSON.parse(lines[i]);
      const content = data.content || '';
      
      // We look for a step that contains the full ToolHoTro.tsx code or a large chunk of it with in-dia-chi rendering
      if (content.includes('Cấu hình In Địa Chỉ') && content.includes('in-phieu-bh') && content.length > 50000) {
        console.log(`Found matching content at step ${data.step_index}, type: ${data.type}, content length: ${content.length}`);
        foundCode = content;
        break;
      }
    } catch (e) {}
  }
  
  if (foundCode) {
    // Write the extracted code to a file so we can view it
    fs.writeFileSync('/Users/linhvu/Desktop/APP Antigravity IDE/crm---siêu-thị/scratch_restored_tool.tsx', foundCode);
    console.log('Successfully wrote code to scratch_restored_tool.tsx');
  } else {
    console.log('No matching large content found.');
  }
} catch (err) {
  console.error('Error reading log:', err);
}
