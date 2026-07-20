const fs = require('fs');

const original = fs.readFileSync('scratch_utils_head.ts', 'utf8').split('\n');
const modified = fs.readFileSync('src/pages/RTST/utils.ts', 'utf8').split('\n');

const diff = [];
const maxLen = Math.max(original.length, modified.length);

for (let i = 0; i < maxLen; i++) {
  if (original[i] !== modified[i]) {
    diff.push({
      line: i + 1,
      original: original[i] || 'EOF',
      modified: modified[i] || 'EOF'
    });
  }
}

console.log(`Total lines diff: ${diff.length}`);
console.log("Differences (up to 30 changes):");
diff.slice(0, 30).forEach(d => {
  console.log(`Line ${d.line}:`);
  console.log(`- ${d.original}`);
  console.log(`+ ${d.modified}`);
  console.log('-------------------');
});
