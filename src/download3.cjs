const fs = require('fs');
const https = require('https');

const options = {
  hostname: 'cdn.tgdd.vn',
  port: 443,
  path: '/mwgcart/mwgcore/materials/v4/logo/dmx.png',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Referer': 'https://www.dienmayxanh.com/',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
  }
};

const req = https.request(options, (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync('dmx_logo.png', buffer);
    console.log('Downloaded raw length:', buffer.length);
  });
});
req.end();
