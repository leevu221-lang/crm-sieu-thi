const https = require('https');
const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
};
https.get('https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Dien_may_Xanh_logo.svg/512px-Dien_may_Xanh_logo.svg.png', options, (res) => {
    let chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log('Length:', buf.length);
        if(buf.length > 1000) {
            require('fs').writeFileSync('public/dmx.png', buf);
        }
    });
});
