import fs from 'fs';

try {
  const buf = fs.readFileSync('public/ycx_guide.png');
  // PNG signature is 8 bytes
  // IHDR starts at byte 12
  // Width is 4 bytes starting at byte 16
  // Height is 4 bytes starting at byte 20
  const width = buf.readInt32BE(16);
  const height = buf.readInt32BE(20);
  console.log(`PNG Dimensions: ${width}x${height}`);
} catch (e) {
  console.error(e);
}
