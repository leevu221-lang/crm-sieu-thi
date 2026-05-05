const fs = require('fs');
const https = require('https');

https.get('https://upload.wikimedia.org/wikipedia/commons/2/23/Dien_may_Xanh_logo.svg', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('dmx_logo.svg', data);
    console.log('Downloaded');
  });
});
