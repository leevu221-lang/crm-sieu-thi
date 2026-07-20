const { execSync } = require('child_process');

try {
  const diff = execSync('git diff src/pages/RTST/utils.ts', { encoding: 'utf8' });
  console.log("Git diff output:\n", diff);
} catch (err) {
  console.error("Error running git diff:", err.message);
}
