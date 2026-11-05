import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crc]);
}

function generatePNG(width, height, isMaskable = false) {
  // RGBA buffer: width * height * 4
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = (width / 2) * (isMaskable ? 0.72 : 0.85);
  const rInner = rOuter * 0.72;

  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: Deep cinema gradient
      let r = 8;
      let g = 17;
      let b = 27;
      let a = 255;

      // Outer squircle or circle bounds if not maskable
      if (!isMaskable) {
        // Squircle corner check
        const cornerRadius = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerRadius));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerRadius));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerRadius) {
          a = 0;
        }
      }

      if (a > 0) {
        // Glowing emerald ring
        const ringDist = Math.abs(dist - rOuter * 0.95);
        if (ringDist < width * 0.035) {
          const intensity = 1 - ringDist / (width * 0.035);
          r = Math.min(255, Math.round(r + 16 * intensity + 20));
          g = Math.min(255, Math.round(g + 185 * intensity + 30));
          b = Math.min(255, Math.round(b + 129 * intensity + 20));
        }

        // Inner disc
        if (dist < rInner) {
          r = 11;
          g = 30;
          b = 44;
          // Play triangle: (cx - triangleW*0.35, cy - triangleH/2) to (cx + triangleW*0.65, cy) to (cx - triangleW*0.35, cy + triangleH/2)
          const tw = rInner * 0.9;
          const th = rInner * 1.0;
          const px = dx + tw * 0.2;
          const py = dy;

          if (px >= -tw * 0.4 && px <= tw * 0.6) {
            const allowedY = ((tw * 0.6 - px) / tw) * (th / 2);
            if (Math.abs(py) <= allowedY) {
              // Play triangle inside: vibrant white/emerald
              const grad = (px + tw * 0.4) / tw;
              r = Math.round(255 - 40 * grad);
              g = 255;
              b = Math.round(255 - 30 * grad);
            }
          }
        }
      }

      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Compression method 0
  ihdr.writeUInt8(0, 11); // Filter method 0
  ihdr.writeUInt8(0, 12); // Interlace 0

  const compressedData = zlib.deflateSync(rawData);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressedData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.resolve(process.cwd(), 'public');

const icons = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const icon of icons) {
  const filePath = path.join(outDir, icon.name);
  const buf = generatePNG(icon.size, icon.size, icon.maskable);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${icon.name} (${icon.size}x${icon.size}) - ${buf.length} bytes`);
}
