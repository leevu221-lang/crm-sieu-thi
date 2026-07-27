const fs = require('fs');
const buffer = fs.readFileSync('dmx_logo.png');
console.log('data:image/png;base64,' + buffer.toString('base64'));
