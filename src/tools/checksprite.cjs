const https = require('https');
https.get('https://cdnv2.tgdd.vn/webmwg/2024/ContentMwg/images/homev2/desk/iconnew-min.png?v=6', (res) => {
    let chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => console.log('Sprite Length:', Buffer.concat(chunks).length));
});
