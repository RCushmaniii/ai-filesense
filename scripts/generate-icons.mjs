import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 implementation for PNG
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  const result = Buffer.alloc(4);
  result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
  return result;
}

function createPng(size) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);  // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);

  // Create image data with rounded corners
  const rawData = [];
  const radius = Math.floor(size * 0.2);

  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Check if in rounded corner
      let inShape = true;

      // Top-left corner
      if (x < radius && y < radius) {
        const dx = radius - x;
        const dy = radius - y;
        inShape = (dx * dx + dy * dy) <= radius * radius;
      }
      // Top-right corner
      else if (x >= size - radius && y < radius) {
        const dx = x - (size - radius - 1);
        const dy = radius - y;
        inShape = (dx * dx + dy * dy) <= radius * radius;
      }
      // Bottom-left corner
      else if (x < radius && y >= size - radius) {
        const dx = radius - x;
        const dy = y - (size - radius - 1);
        inShape = (dx * dx + dy * dy) <= radius * radius;
      }
      // Bottom-right corner
      else if (x >= size - radius && y >= size - radius) {
        const dx = x - (size - radius - 1);
        const dy = y - (size - radius - 1);
        inShape = (dx * dx + dy * dy) <= radius * radius;
      }

      if (inShape) {
        rawData.push(59, 130, 246, 255);  // Blue RGBA
      } else {
        rawData.push(0, 0, 0, 0);  // Transparent
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));

  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([
    idatLen,
    Buffer.from('IDAT'),
    compressed,
    idatCrc
  ]);

  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    iendCrc
  ]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Create ICO file from PNG data
function createIco(pngBuffers) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4);  // image count

  // Calculate offsets
  let offset = 6 + (pngBuffers.length * 16); // header + directory entries
  const entries = [];
  const images = [];

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);  // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1);  // height (0 = 256)
    entry.writeUInt8(0, 2);                         // color palette
    entry.writeUInt8(0, 3);                         // reserved
    entry.writeUInt16LE(1, 4);                      // color planes
    entry.writeUInt16LE(32, 6);                     // bits per pixel
    entry.writeUInt32LE(data.length, 8);            // image size
    entry.writeUInt32LE(offset, 12);                // image offset

    entries.push(entry);
    images.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

// Generate icons
const sizes = [16, 32, 48, 256];
const pngBuffers = [];

for (const size of sizes) {
  const png = createPng(size);
  pngBuffers.push({ size, data: png });

  // Save individual PNGs
  const filename = size === 32 ? '32x32.png' :
                   size === 256 ? '128x128@2x.png' :
                   `${size}x${size}.png`;
  fs.writeFileSync(path.join(iconsDir, filename), png);
  console.log(`Created ${filename}`);
}

// Create 128x128 PNG
const png128 = createPng(128);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
console.log('Created 128x128.png');

// Create ICO with all sizes
const ico = createIco(pngBuffers);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
console.log('Created icon.ico');

// Create icon.png (256x256)
const icon256 = pngBuffers.find(p => p.size === 256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), icon256.data);
console.log('Created icon.png');

// Create Square icons for Windows Store
const square150 = createPng(150);
fs.writeFileSync(path.join(iconsDir, 'Square150x150Logo.png'), square150);
console.log('Created Square150x150Logo.png');

const square310 = createPng(310);
fs.writeFileSync(path.join(iconsDir, 'Square310x310Logo.png'), square310);
console.log('Created Square310x310Logo.png');

const square44 = createPng(44);
fs.writeFileSync(path.join(iconsDir, 'Square44x44Logo.png'), square44);
console.log('Created Square44x44Logo.png');

const square89 = createPng(89);
fs.writeFileSync(path.join(iconsDir, 'Square89x89Logo.png'), square89);
console.log('Created Square89x89Logo.png');

const storeLogo = createPng(50);
fs.writeFileSync(path.join(iconsDir, 'StoreLogo.png'), storeLogo);
console.log('Created StoreLogo.png');

console.log('\nAll icons generated successfully!');
