const { execSync } = require('child_process');
const fs = require('fs');

try {
  const headContent = execSync('git show HEAD:src/pages/RTST/utils.ts', { encoding: 'utf8' });
  fs.writeFileSync('scratch_utils_head.ts', headContent);
  console.log("Successfully wrote scratch_utils_head.ts");
} catch (err) {
  console.error("Error reading HEAD version of utils.ts:", err.message);
}
