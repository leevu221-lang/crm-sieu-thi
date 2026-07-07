import fs from 'fs';

const files = ['public/img1.png', 'public/img2.png', 'public/img3.png', 'public/img4.png', 'public/img5.png', 'public/ycx_guide.png'];

files.forEach(f => {
  try {
    const buf = fs.readFileSync(f);
    const width = buf.readInt32BE(16);
    const height = buf.readInt32BE(20);
    console.log(`${f}: ${width}x${height}`);
  } catch (e) {
    console.error(`${f}: error`, e.message);
  }
});
