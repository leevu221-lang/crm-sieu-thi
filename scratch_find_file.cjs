const fs = require('fs');
const path = require('path');

const root = '/Users/linhvu/Desktop/APP Antigravity IDE';

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else {
        if (file.toLowerCase().includes('doanh_thu_theo_nv_kho_tao')) {
          results.push(fullPath);
        }
      }
    });
  } catch (e) {
    // Ignore error
  }
  return results;
}

console.log('Searching for files...');
const files = walk(root);
console.log('Found files:', files);
