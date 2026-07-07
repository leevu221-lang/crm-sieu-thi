import fs from 'fs';
import readline from 'readline';

async function run() {
  const fileStream = fs.createReadStream('/Users/linhvu/.gemini/antigravity-ide/brain/ae94079b-eead-481e-b366-1fe809de3f0b/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const inputs = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        inputs.push({
          step: obj.step_index,
          time: obj.created_at,
          content: obj.content
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Print last 10 user inputs
  console.log("LAST 10 USER INPUTS:");
  for (const inp of inputs.slice(-10)) {
    console.log(`--- Step ${inp.step} (${inp.time}) ---`);
    console.log(inp.content);
  }
}

run().catch(console.error);
