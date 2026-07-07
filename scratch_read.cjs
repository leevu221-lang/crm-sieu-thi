const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('/Users/linhvu/.gemini/antigravity-ide/brain/ae94079b-eead-481e-b366-1fe809de3f0b/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 600 && obj.type === 'USER_INPUT') {
        console.log(`\n=== STEP ${obj.step_index} (${obj.created_at}) ===`);
        console.log(obj.content);
      }
    } catch (e) {
      // Ignore
    }
  }
}

run();
