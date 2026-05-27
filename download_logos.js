const https = require('https');
const fs = require('fs');
const path = require('path');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.thegioididong.com/'
      }
    };
    https.get(url, options, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  
  try {
    await download('https://cdn.tgdd.vn/mwgcart/mwgcore/ContentMwg/images/logo/tgdd.png', path.join(publicDir, 'tgdd.png'));
    console.log('Downloaded tgdd.png');
    await download('https://cdn.tgdd.vn/mwgcart/mwgcore/ContentMwg/images/logo/dmx.png', path.join(publicDir, 'dmx_logo.png'));
    console.log('Downloaded dmx_logo.png');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
