const { execSync } = require('child_process');

try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log("Git status porcelain:\n", status);
} catch (err) {
  console.error("Error running git status:", err.message);
}
