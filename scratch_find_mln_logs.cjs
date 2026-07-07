const fs = require('fs');
const path = require('path');

const uuids = [
  "01f5e1e3-94d0-47af-8c5e-f0488b2ae444",
  "05921cf8-5416-4ca9-9613-5443dbf68019",
  "0a06f32a-4a0c-41e2-b875-6b5109482a72",
  "0d064462-3389-4b72-9036-ece398d6f80f",
  "11e21042-4006-41e1-91b4-0b07be92cad2",
  "171a8e8a-4e91-4f04-b29c-ccd346310770",
  "21cd9156-5b52-4055-ac27-f468e8ff6749",
  "296afa06-49d9-441e-aa7c-bb4a230a06b7",
  "3b868767-c77a-4182-a4c1-433ce0bf37a2",
  "6e37b844-02a5-4457-ba4e-8f49003e5402",
  "6fe7e9c3-c349-4bc2-a467-eb53634c81e6",
  "7fe71b13-fcd8-40df-8887-58b1faa2cb86",
  "8a3cca06-5d1e-4eb5-8747-f4327c3b035b",
  "a55c5991-98c9-4775-bbbd-c43db9e246ad",
  "b25f11a5-e631-475a-b117-c2241cff2473",
  "bc71983d-987c-420c-b1a5-3e25fcdf279f",
  "e287ff2a-92c1-413e-9ef7-d28b91db0792",
  "e8c5d15d-18d8-470d-9b73-c0bcd38c8129",
  "fcfe34a5-0b5f-4481-bf83-b9ff7d03d8fc",
  "fd09d2ff-9045-4a5f-bcea-1d8af4f09a6f"
];

const brainPath = '/Users/linhvu/.gemini/antigravity-ide/brain';

uuids.forEach(uuid => {
  const logPath = path.join(brainPath, uuid, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(logPath)) {
    try {
      const size = fs.statSync(logPath).size;
      console.log(`Checking ${uuid} (${(size / 1024 / 1024).toFixed(2)} MB)...`);
      
      const content = fs.readFileSync(logPath, 'utf8');
      if (content.includes('sticker-mln')) {
        console.log(`  >>> FOUND 'sticker-mln' in folder ${uuid}! <<<`);
      }
    } catch (err) {
      console.log(`  Failed to read ${uuid}: ${err.message}`);
    }
  } else {
    console.log(`Log file not found for ${uuid}`);
  }
});
