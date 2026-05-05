const fs = require('fs');
const b64 = fs.readFileSync('public/dmx.png').toString('base64');
fs.writeFileSync('src/dmx_base64.txt', 'data:image/png;base64,' + b64);
