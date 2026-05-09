const fs = require('fs');
const https = require('https');

const options = {
  hostname: 'cdnv2.tgdd.vn',
  port: 443,
  path: '/webmwg/2024/ContentMwg/images/homev2/desk/iconnew-min.png?v=6',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Referer': 'https://www.dienmayxanh.com/',
    'Accept': 'image/avif,image/webp,*/*'
  }
};

const req = https.request(options, (res) => {
  let chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    let buf = Buffer.concat(chunks);
    console.log('Downloaded length:', buf.length);
    fs.writeFileSync('src/spriteb64.txt', 'data:image/png;base64,' + buf.toString('base64'));
  });
});
req.end();
