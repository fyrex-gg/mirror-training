// Generates public/icon-192.png and public/icon-512.png with zero dependencies:
// a solid #14171C square with a bold white "M" centered, drawn pixel-by-pixel
// and hand-assembled into a valid PNG via zlib + manual chunk/CRC framing.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [0x14, 0x17, 0x1c];
const FG = [0xff, 0xff, 0xff];

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 ? (apx * abx + apy * aby) / abLen2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

function makeM(size) {
  const pixels = new Uint8Array(size * size * 4);
  const strokeW = size * 0.11;
  const left = size * 0.22;
  const right = size * 0.78;
  const top = size * 0.24;
  const bottom = size * 0.76;
  const midY = top + (bottom - top) * 0.58;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let on = false;
      // Left vertical stroke
      if (x >= left && x <= left + strokeW && y >= top && y <= bottom) on = true;
      // Right vertical stroke
      if (x >= right - strokeW && x <= right && y >= top && y <= bottom) on = true;
      // Diagonals meeting at a mid-point (classic "M" notch)
      if (!on) {
        const d1 = distToSegment(x, y, left + strokeW / 2, top, size / 2, midY);
        const d2 = distToSegment(x, y, size / 2, midY, right - strokeW / 2, top);
        if (d1 <= strokeW / 2 || d2 <= strokeW / 2) on = true;
      }
      const idx = (y * size + x) * 4;
      const [r, g, b] = on ? FG : BG;
      pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // no filter
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const pixels = makeM(size);
  const png = encodePNG(size, pixels);
  const outPath = new URL(`../public/icon-${size}.png`, import.meta.url);
  writeFileSync(outPath, png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
