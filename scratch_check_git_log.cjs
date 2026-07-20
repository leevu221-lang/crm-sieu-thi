const { execSync } = require('child_process');

try {
  const log = execSync('git log -n 5 --oneline origin/main', { encoding: 'utf8' });
  console.log("Git log origin/main:\n", log);
  
  const localLog = execSync('git log -n 5 --oneline HEAD', { encoding: 'utf8' });
  console.log("Git log local HEAD:\n", localLog);
} catch (err) {
  console.error("Error running git log:", err.message);
}
