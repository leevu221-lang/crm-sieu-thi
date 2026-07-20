const { execSync } = require('child_process');

try {
  const diff = execSync('git show 1076e1b --name-only', { encoding: 'utf8' });
  console.log("Git show 1076e1b:\n", diff);
} catch (err) {
  console.error("Error running git show:", err.message);
}
