const https = require('https');
const fs = require('fs');
const path = require('path');

const downloadAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.thegioididong.com/'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error('Status: ' + response.statusCode));
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve('data:image/png;base64,' + buffer.toString('base64'));
      });
    }).on('error', reject);
  });
};

async function main() {
  try {
    const tgdd = await downloadAsBase64('https://cdn.tgdd.vn/mwgcart/mwgcore/ContentMwg/images/logo/tgdd.png');
    const dmx = await downloadAsBase64('https://cdn.tgdd.vn/mwgcart/mwgcore/ContentMwg/images/logo/dmx.png');
    
    fs.writeFileSync('/Users/linhvu/.gemini/antigravity-ide/scratch/logos.json', JSON.stringify({ tgdd, dmx }));
    console.log('Saved to scratch!');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
