const fs = require('fs');
const readline = require('readline');

const logPath = '/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.step_index === 2916 && data.tool_calls) {
      const call = data.tool_calls[0];
      const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
      const content = args.ReplacementContent;
      fs.writeFileSync('scratch_mln_tab.txt', content, 'utf8');
      console.log('Successfully wrote MLN tab content to scratch_mln_tab.txt');
    }
  } catch (e) {
    // Ignore parse errors
  }
});
