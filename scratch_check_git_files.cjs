const { execSync } = require('child_process');

const files = [
  'src/pages/RTST/utils.ts',
  'src/pages/RealtimePage.tsx',
  'src/pages/RTST/hooks/useRealtimeData.ts'
];

files.forEach(f => {
  try {
    const status = execSync(`git status --porcelain "${f}"`, { encoding: 'utf8' });
    console.log(`Status for ${f}:`, JSON.stringify(status.trim()));
  } catch (err) {
    console.error(`Error for ${f}:`, err.message);
  }
});
