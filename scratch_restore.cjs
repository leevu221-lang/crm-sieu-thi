const fs = require('fs');
const readline = require('readline');

const logPath = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let replacements = [];

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.tool_calls) {
      for (const call of data.tool_calls) {
        if (call.name === 'default_api:replace_file_content' || call.name === 'default_api:multi_replace_file_content' || call.name === 'default_api:write_to_file') {
          const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
          if (args && (args.TargetFile === '/Users/linhvu/Desktop/APP Antigravity IDE/crm---siêu-thị/src/pages/ToolHoTro.tsx' || args.TargetFile === 'src/pages/ToolHoTro.tsx')) {
            replacements.push({
              step: data.step_index,
              name: call.name,
              args: args
            });
          }
        }
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
});

rl.on('close', () => {
  console.log(`Found ${replacements.length} tool calls targeting ToolHoTro.tsx`);
  // Print the last 5 calls
  const lastCalls = replacements.slice(-10);
  lastCalls.forEach((call, index) => {
    console.log(`\n--- Call #${index + 1} (Step ${call.step}, Tool: ${call.name}) ---`);
    console.log(JSON.stringify(call.args, null, 2).substring(0, 1000));
  });
});
