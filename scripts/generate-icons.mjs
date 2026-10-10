import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// Unit-space microphone glyph.
const MIC = {
  rw: 0.115,
  bodyTop: 0.2,
  bodyBottom: 0.6,
  arcCenterY: 0.55,
  arcRadius: 0.215,
  arcThickness: 0.06,
  stemBottom: 0.83,
  baseHalf: 0.15,
};

function inMic(u, v) {
  const halfThickness = MIC.arcThickness / 2;

  if (
    distToSegment(u, v, 0.5, MIC.bodyTop + MIC.rw, 0.5, MIC.bodyBottom - MIC.rw) <=
    MIC.rw
  ) {
    return true;
  }

  if (v >= MIC.arcCenterY) {
    const d = Math.abs(Math.hypot(u - 0.5, v - MIC.arcCenterY) - MIC.arcRadius);
    if (d <= halfThickness) return true;
  }

  const stemTop = MIC.arcCenterY + MIC.arcRadius;
  if (distToSegment(u, v, 0.5, stemTop, 0.5, MIC.stemBottom) <= halfThickness) return true;
  if (
    distToSegment(
      u,
      v,
      0.5 - MIC.baseHalf,
      MIC.stemBottom,
      0.5 + MIC.baseHalf,
      MIC.stemBottom,
    ) <= halfThickness
  ) {
    return true;
  }

  return false;
}

function render(size, { maskable = false, rounded = true } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.78 : 0.92;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      let covered = true;
      if (rounded && !maskable) {
        const rx = Math.min(x, size - 1 - x);
        const ry = Math.min(y, size - 1 - y);
        if (rx < cornerRadius && ry < cornerRadius) {
          const d = Math.hypot(cornerRadius - rx, cornerRadius - ry);
          covered = d <= cornerRadius;
        }
      }

      if (!covered) {
        rgba[i + 3] = 0;
        continue;
      }

      const t = (nx + ny) / 2;
      let r = lerp(79, 124, t);
      let g = lerp(70, 58, t);
      let b = lerp(229, 237, t);

      const u = (nx - 0.5) / scale + 0.5;
      const v = (ny - 0.5) / scale + 0.5;

      if (u >= 0 && u <= 1 && v >= 0 && v <= 1 && inMic(u, v)) {
        r = 255;
        g = 255;
        b = 255;
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, options: {} },
  { file: "icon-512.png", size: 512, options: {} },
  { file: "apple-touch-icon.png", size: 180, options: { rounded: false } },
  { file: "icon-maskable-512.png", size: 512, options: { maskable: true } },
];

for (const { file, size, options } of targets) {
  const png = render(size, options);
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`generated public/icons/${file} (${png.length} bytes)`);
}
