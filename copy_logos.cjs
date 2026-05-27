const fs = require('fs');

const srcTgdd = '/Users/linhvu/.gemini/antigravity-ide/brain/a55c5991-98c9-4775-bbbd-c43db9e246ad/media__1779864665607.png';
const destTgdd = './public/logo_tgdd.png';

const srcDmx = '/Users/linhvu/.gemini/antigravity-ide/brain/a55c5991-98c9-4775-bbbd-c43db9e246ad/media__1779864673349.png';
const destDmx = './public/logo_dmx.png';

fs.copyFileSync(srcTgdd, destTgdd);
fs.copyFileSync(srcDmx, destDmx);
console.log('Copied successfully');
