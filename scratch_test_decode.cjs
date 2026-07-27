const { DecompressionStream } = require('node:stream/web');

async function testDecode() {
  const str = "GZ:H4sIAAAAAAAAAE3M5th4AvzIbUwMAAAA=";
  const binary = atob(str.slice(3));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(stream);
  const text = await response.text();
  console.log("Decoded text:", JSON.stringify(text));
}

testDecode();
