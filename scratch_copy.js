const fs = require('fs');
try {
    fs.copyFileSync('/Users/linhvu/.gemini/antigravity-ide/brain/6ce18ff1-9094-421b-9a59-ca72fc07aa2c/.system_generated/logs/transcript.jsonl', './scratch_log.txt');
    console.log('Copied successfully!');
} catch (e) {
    console.error('Error copying file:', e);
}
