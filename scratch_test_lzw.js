function compressLZW(text) {
  if (!text) return '';
  const bytes = new TextEncoder().encode(text);
  const dictionary = {};
  for (let i = 0; i < 256; i++) {
    dictionary[String.fromCharCode(i)] = i;
  }
  let word = '';
  const result = [];
  let dictSize = 256;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    const char = String.fromCharCode(byte);
    const wordChar = word + char;
    if (dictionary[wordChar] !== undefined) {
      word = wordChar;
    } else {
      result.push(dictionary[word]);
      if (dictSize < 65000) {
        dictionary[wordChar] = dictSize++;
      } else {
        // Reset dictionary if it gets too large
        for (let j = 0; j < 256; j++) {
          dictionary[String.fromCharCode(j)] = j;
        }
        dictSize = 256;
      }
      word = char;
    }
  }
  if (word !== '') {
    result.push(dictionary[word]);
  }
  // Convert code numbers to a string of UTF-16 characters
  return '_lzw_:' + result.map(x => String.fromCharCode(x)).join('');
}

function decompressLZW(compText) {
  if (!compText) return '';
  if (!compText.startsWith('_lzw_:')) return compText; // Return as-is if not LZW compressed
  const compressed = compText.substring(6);
  if (compressed.length === 0) return '';
  
  const dictionary = {};
  for (let i = 0; i < 256; i++) {
    dictionary[i] = String.fromCharCode(i);
  }
  let dictSize = 256;
  let currChar = compressed.charAt(0);
  let oldPhrase = currChar;
  const outBytes = [currChar.charCodeAt(0)];
  
  for (let i = 1; i < compressed.length; i++) {
    const code = compressed.charCodeAt(i);
    let phrase = '';
    if (dictionary[code] !== undefined) {
      phrase = dictionary[code];
    } else {
      if (code === dictSize) {
        phrase = oldPhrase + oldPhrase.charAt(0);
      } else {
        return compText;
      }
    }
    
    for (let j = 0; j < phrase.length; j++) {
      outBytes.push(phrase.charCodeAt(j));
    }
    
    if (dictSize < 65000) {
      dictionary[dictSize++] = oldPhrase + phrase.charAt(0);
    } else {
      // Reset dictionary
      for (let j = 0; j < 256; j++) {
        dictionary[j] = String.fromCharCode(j);
      }
      dictSize = 256;
    }
    oldPhrase = phrase;
  }
  
  const uint8 = new Uint8Array(outBytes);
  return new TextDecoder().decode(uint8);
}

// Test cases
const testString = "Long An 13912 - ĐMM_LAN_MHO - Bình Phong Thạnh 19.24 0.00 0% 0\n".repeat(100);
const compressed = compressLZW(testString);
const decompressed = decompressLZW(compressed);

console.log(`Original length: ${testString.length}`);
console.log(`Compressed length: ${compressed.length}`);
console.log(`Compression ratio: ${((compressed.length / testString.length) * 100).toFixed(2)}%`);
console.log(`Is equal: ${testString === decompressed}`);

// Test with Vietnamese characters and resets
const longString = "Xin chào Việt Nam! ".repeat(5000);
const comp2 = compressLZW(longString);
const decomp2 = decompressLZW(comp2);
console.log(`Long string test equal: ${longString === decomp2}`);
