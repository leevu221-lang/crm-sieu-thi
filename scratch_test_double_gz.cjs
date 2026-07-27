const { CompressionStream, DecompressionStream } = require('node:stream/web');

async function compressString(str) {
  if (!str) return str;
  if (typeof str === 'string' && str.startsWith('GZ:')) return str; // NEVER re-compress GZ string!
  try {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'GZ:' + btoa(binary);
  } catch (err) {
    console.error('[Compression] Gzip error:', err);
    return str;
  }
}

async function decompressString(str) {
  if (!str || typeof str !== 'string') return str;
  let result = str;
  let iterations = 0;
  // Unwrap multiple layers of GZ: if double-encoded
  while (result && typeof result === 'string' && result.startsWith('GZ:') && iterations < 5) {
    iterations++;
    try {
      const binary = atob(result.slice(3));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const response = new Response(stream);
      result = await response.text();
    } catch (err) {
      console.error('[Decompression] Gzip error:', err);
      break;
    }
  }
  return result;
}

async function run() {
  const text = "HD sử dụng 43751 - Linh Võ Vũ avatar Cum 18.41";
  console.log("Original text:", text);

  const compressed1 = await compressString(text);
  console.log("Compressed 1:", compressed1);

  // Try re-compressing
  const compressed2 = await compressString(compressed1);
  console.log("Compressed 2 (guarded):", compressed2);

  // Simulated double-encoded string
  const doubleEncoded = "GZ:" + (await compressString(compressed1)).slice(3);
  console.log("Double encoded simulation:", doubleEncoded.slice(0, 30));

  const decompressed = await decompressString(doubleEncoded);
  console.log("Decompressed from double encoded:", decompressed);
}

run();
