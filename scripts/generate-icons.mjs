// Generates the PWA icons without external dependencies.
// Run with: npm run icons
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PRIMARY = [47, 95, 208];
const WHITE = [255, 255, 255];

function drawIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const scale = maskable ? 0.78 : 0.92;
  const radius = (size / 2) * scale;

  const headRadius = size * 0.13 * scale;
  const headCy = size * 0.38;
  const bodyRx = size * 0.245 * scale;
  const bodyRy = size * 0.175 * scale;
  const bodyCy = size * 0.72;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - size / 2;
      const insideCircle = Math.sqrt(dx * dx + dy * dy) <= radius;

      if (!insideCircle) {
        pixels[index + 3] = 0;
        continue;
      }

      const headDistance = Math.hypot(x + 0.5 - cx, y + 0.5 - headCy);
      const bodyDistance =
        ((x + 0.5 - cx) / bodyRx) ** 2 + ((y + 0.5 - bodyCy) / bodyRy) ** 2;
      const isGlyph = headDistance <= headRadius || bodyDistance <= 1;
      const color = isGlyph ? WHITE : PRIMARY;

      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = 255;
    }
  }

  return encodePng(size, size, pixels);
}

mkdirSync("public/icons", { recursive: true });

const outputs = [
  ["public/icons/icon-192.png", 192, {}],
  ["public/icons/icon-512.png", 512, {}],
  ["public/icons/icon-maskable-512.png", 512, { maskable: true }],
  ["public/icons/apple-touch-icon.png", 180, {}],
  ["src/app/icon.png", 64, {}],
];

for (const [path, size, options] of outputs) {
  writeFileSync(path, drawIcon(size, options));
  console.log(`wrote ${path} (${size}x${size})`);
}
