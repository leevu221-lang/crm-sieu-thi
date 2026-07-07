import fs from 'fs';
try {
  const content = fs.readFileSync('/Users/linhvu/.gemini/antigravity-ide/brain/ae94079b-eead-481e-b366-1fe809de3f0b/media__1783259634336.png');
  fs.writeFileSync('/Users/linhvu/Desktop/APP Antigravity IDE/crm---siêu-thị/image.png', content);
  console.log('Success copy using readFileSync/writeFileSync');
} catch (e) {
  console.error('Error copying image:', e);
}
