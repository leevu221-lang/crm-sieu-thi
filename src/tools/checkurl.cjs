const https = require('https');
https.get('https://cdnv2.tgdd.vn/webmwg/2024/ContentMwg/images/DMX/Global/Desktop/Logo-webmoi-min.png', (res) => {
    let chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => console.log('Length:', Buffer.concat(chunks).length));
});
