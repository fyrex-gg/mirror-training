// Shared zero-dependency PNG writer + "M" glyph renderer used by both
// gen-icons.mjs (PWA icons) and gen-android-icons.mjs (launcher icons).
import { deflateSync } from "node:zlib";

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 ? (apx * abx + apy * aby) / abLen2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

// Draws a bold "M" into a size×size RGBA buffer. `boxFrac` controls how much
// of the canvas the glyph's bounding box occupies (smaller for adaptive-icon
// foregrounds, which get cropped by the launcher's own mask shape).
// `transparent` skips filling the background (alpha 0) instead of `bg`.
export function drawM(size, { bg = [0x14, 0x17, 0x1c], fg = [0xff, 0xff, 0xff], boxFrac = 0.56, transparent = false } = {}) {
  const pixels = new Uint8Array(size * size * 4);
  const w = size * boxFrac;
  const h = w * 0.93;
  const strokeW = w * 0.196;
  const left = (size - w) / 2;
  const right = left + w;
  const top = (size - h) / 2;
  const bottom = top + h;
  const midY = top + h * 0.58;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let on = false;
      if (x >= left && x <= left + strokeW && y >= top && y <= bottom) on = true;
      if (x >= right - strokeW && x <= right && y >= top && y <= bottom) on = true;
      if (!on) {
        const d1 = distToSegment(x, y, left + strokeW / 2, top, size / 2, midY);
        const d2 = distToSegment(x, y, size / 2, midY, right - strokeW / 2, top);
        if (d1 <= strokeW / 2 || d2 <= strokeW / 2) on = true;
      }
      const idx = (y * size + x) * 4;
      if (on) {
        pixels[idx] = fg[0]; pixels[idx + 1] = fg[1]; pixels[idx + 2] = fg[2]; pixels[idx + 3] = 255;
      } else if (!transparent) {
        pixels[idx] = bg[0]; pixels[idx + 1] = bg[1]; pixels[idx + 2] = bg[2]; pixels[idx + 3] = 255;
      }
    }
  }
  return pixels;
}

// Zeroes alpha for any pixel outside the inscribed circle — used for the
// legacy round launcher icon variant.
export function circleCrop(size, pixels) {
  const r = size / 2;
  const out = new Uint8Array(pixels);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - r;
      if (dx * dx + dy * dy > r * r) out[(y * size + x) * 4 + 3] = 0;
    }
  }
  return out;
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

export function encodePNG(size, pixels) {
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
