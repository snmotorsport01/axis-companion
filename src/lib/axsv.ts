// =====================================================================
//  axsv.ts — encode images/videos into the AXIS screensaver format the
//  device firmware (system/Screensaver.cpp) consumes.
//
//  File layout (matches the C struct AxsvHeader):
//    bytes  0..3   magic           "AXSV"
//    bytes  4..5   version         1
//    bytes  6..7   width           (e.g. 240)
//    bytes  8..9   height          (e.g. 240)
//    bytes 10..11  frames          (1..N)
//    byte  12      fps             (1..30)
//    byte  13      format          0 = 4-bit indexed RGB565 palette
//    bytes 14..15  reserved
//    bytes 16..47  palette         16 × uint16 RGB565 (little-endian)
//    rest          frames × (W*H/2) bytes, 2 indices packed per byte
//                  (high nibble = even-numbered pixel)
// =====================================================================

export const AXSV_W = 240;
export const AXSV_H = 240;
const HEADER_BYTES = 48;
const FRAME_BYTES  = (AXSV_W * AXSV_H) / 2;   // 4-bit packed

type RGB = [number, number, number];

/** Draw an HTMLImageElement or HTMLVideoElement cover-fit onto a 240×240 canvas. */
function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcW: number,
  srcH: number
) {
  const ratio = Math.max(AXSV_W / srcW, AXSV_H / srcH);
  const dw = srcW * ratio;
  const dh = srcH * ratio;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, AXSV_W, AXSV_H);
  ctx.drawImage(src, (AXSV_W - dw) / 2, (AXSV_H - dh) / 2, dw, dh);
}

/**
 * Median-cut palette generation. Pick a representative sample of pixels
 * from one or more frames and reduce to `targetColors` distinct colours.
 * Simple, dependency-free, ~5 ms for 5000 sample pixels.
 */
function medianCut(samples: RGB[], targetColors: number): RGB[] {
  function reduce(bucket: RGB[], depth: number): RGB[] {
    if (depth === 0 || bucket.length === 0) {
      if (bucket.length === 0) return [[0, 0, 0]];
      let r = 0, g = 0, b = 0;
      for (const p of bucket) { r += p[0]; g += p[1]; b += p[2]; }
      const n = bucket.length;
      return [[Math.round(r / n), Math.round(g / n), Math.round(b / n)]];
    }
    // Find longest channel range.
    let rMin=255,rMax=0,gMin=255,gMax=0,bMin=255,bMax=0;
    for (const p of bucket) {
      if (p[0]<rMin) rMin=p[0]; if (p[0]>rMax) rMax=p[0];
      if (p[1]<gMin) gMin=p[1]; if (p[1]>gMax) gMax=p[1];
      if (p[2]<bMin) bMin=p[2]; if (p[2]>bMax) bMax=p[2];
    }
    const ranges = [rMax - rMin, gMax - gMin, bMax - bMin];
    let ch = 0;
    if (ranges[1] > ranges[ch]) ch = 1;
    if (ranges[2] > ranges[ch]) ch = 2;
    bucket.sort((a, b) => a[ch] - b[ch]);
    const mid = bucket.length >> 1;
    return [
      ...reduce(bucket.slice(0, mid), depth - 1),
      ...reduce(bucket.slice(mid),    depth - 1)
    ];
  }
  // 2^depth ≥ targetColors; for 16 colours we need depth = 4.
  const depth = Math.ceil(Math.log2(targetColors));
  const palette = reduce(samples.slice(), depth).slice(0, targetColors);
  while (palette.length < targetColors) palette.push([0, 0, 0]);
  return palette;
}

/** Map a single pixel to its nearest palette entry. */
function nearestIdx(r: number, g: number, b: number, palette: RGB[]): number {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < palette.length; ++i) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    const d = dr*dr + dg*dg + db*db;
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

/** Pack two 4-bit indices into one byte (high nibble first). */
function packIndices(rgba: Uint8ClampedArray, palette: RGB[]): Uint8Array {
  const out = new Uint8Array(FRAME_BYTES);
  let oi = 0;
  for (let i = 0; i < rgba.length; i += 8) {
    const i0 = nearestIdx(rgba[i],     rgba[i + 1], rgba[i + 2], palette);
    const i1 = nearestIdx(rgba[i + 4], rgba[i + 5], rgba[i + 6], palette);
    out[oi++] = ((i0 & 0x0F) << 4) | (i1 & 0x0F);
  }
  return out;
}

/** Build the final binary blob from header + palette + packed frames. */
function buildAxsv(palette: RGB[], frames: Uint8Array[], fps: number): Uint8Array {
  const total = HEADER_BYTES + frames.length * FRAME_BYTES;
  const buf = new Uint8Array(total);
  const dv  = new DataView(buf.buffer);

  // Magic + header
  buf[0] = 0x41; buf[1] = 0x58; buf[2] = 0x53; buf[3] = 0x56;   // "AXSV"
  dv.setUint16(4,  1,             true);
  dv.setUint16(6,  AXSV_W,        true);
  dv.setUint16(8,  AXSV_H,        true);
  dv.setUint16(10, frames.length, true);
  buf[12] = fps;
  buf[13] = 0;   // format = PAL16
  // [14..15] reserved (zero)

  // 16 × RGB565 little-endian palette
  for (let i = 0; i < 16; ++i) {
    const [r, g, b] = palette[i] ?? [0, 0, 0];
    const px = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
    dv.setUint16(16 + i * 2, px, true);
  }

  let off = HEADER_BYTES;
  for (const f of frames) {
    buf.set(f, off);
    off += FRAME_BYTES;
  }
  return buf;
}

/** Sample ~5000 random pixels from a frame for palette building. */
function sample(rgba: Uint8ClampedArray, n = 5000): RGB[] {
  const pixels = rgba.length / 4;
  const out: RGB[] = [];
  for (let i = 0; i < n; ++i) {
    const idx = (Math.random() * pixels) | 0;
    const o = idx * 4;
    out.push([rgba[o], rgba[o + 1], rgba[o + 2]]);
  }
  return out;
}

// ---- Public API -----------------------------------------------------

/**
 * Encode a static image as raw 240×240 RGB565 little-endian (115,200 bytes,
 * no header). The firmware's loadFile_() recognises this layout by exact
 * byte count and uses it directly — full 16-bit colour, no palette
 * quantization. Way better fidelity for photos than the indexed AXSV
 * format we have to use for animations.
 */
export async function encodeImage(file: File): Promise<Uint8Array> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload  = () => ok();
      img.onerror = () => fail(new Error('image decode failed'));
      img.src     = url;
    });
    const cv = document.createElement('canvas');
    cv.width = AXSV_W; cv.height = AXSV_H;
    const ctx = cv.getContext('2d')!;
    drawCoverFit(ctx, img, img.naturalWidth, img.naturalHeight);
    const data = ctx.getImageData(0, 0, AXSV_W, AXSV_H).data;
    const out  = new Uint8Array(AXSV_W * AXSV_H * 2);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 2) {
      const r = data[i]     >> 3;       // 5 bits
      const g = data[i + 1] >> 2;       // 6 bits
      const b = data[i + 2] >> 3;       // 5 bits
      const px = (r << 11) | (g << 5) | b;
      out[j]     =  px        & 0xFF;   // little-endian
      out[j + 1] = (px >> 8)  & 0xFF;
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

export interface EncodeVideoOpts {
  frames: number;       // 1..40
  fps:    number;       // 1..30
  onProgress?: (frac: number, msg: string) => void;
}

/**
 * Encode a video as a multi-frame AXSV blob. Evenly samples `opts.frames`
 * snapshots across the video's duration, builds a shared 16-colour palette
 * from samples across all frames, then 4-bit indexes each frame.
 */
export async function encodeVideo(file: File, opts: EncodeVideoOpts): Promise<Uint8Array> {
  const { frames, fps, onProgress } = opts;
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.src = url;
  v.muted = true;
  v.playsInline = true;
  try {
    await new Promise<void>((ok, fail) => {
      v.onloadedmetadata = () => ok();
      v.onerror = () => fail(new Error('video metadata failed'));
    });
    const duration = isFinite(v.duration) && v.duration > 0 ? v.duration : frames / fps;

    const cv = document.createElement('canvas');
    cv.width = AXSV_W; cv.height = AXSV_H;
    const ctx = cv.getContext('2d')!;

    // Pass 1 — extract every frame as RGBA.
    const rgbaFrames: Uint8ClampedArray[] = [];
    for (let i = 0; i < frames; ++i) {
      const t = (i / Math.max(1, frames - 1)) * duration * 0.999;
      await new Promise<void>((ok) => {
        const onSeeked = () => { v.removeEventListener('seeked', onSeeked); ok(); };
        v.addEventListener('seeked', onSeeked);
        v.currentTime = t;
      });
      drawCoverFit(ctx, v, v.videoWidth, v.videoHeight);
      rgbaFrames.push(ctx.getImageData(0, 0, AXSV_W, AXSV_H).data);
      onProgress?.((i + 1) / (frames * 2), `Capturing frame ${i + 1}/${frames}`);
    }

    // Pass 2 — palette from a sample of every frame, then index each.
    const samples: RGB[] = [];
    for (const f of rgbaFrames) samples.push(...sample(f, Math.ceil(5000 / frames)));
    const palette = medianCut(samples, 16);
    const packed: Uint8Array[] = [];
    for (let i = 0; i < rgbaFrames.length; ++i) {
      packed.push(packIndices(rgbaFrames[i], palette));
      onProgress?.(0.5 + (i + 1) / (frames * 2), `Encoding ${i + 1}/${frames}`);
    }
    return buildAxsv(palette, packed, fps);
  } finally {
    URL.revokeObjectURL(url);
    v.removeAttribute('src');
    v.load();
  }
}

/** Decode an AXSV header for preview rendering. */
export function decodeHeader(buf: Uint8Array): { width: number; height: number; frames: number; fps: number } | null {
  if (buf.length < HEADER_BYTES) return null;
  if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'AXSV') return null;
  const dv = new DataView(buf.buffer, buf.byteOffset);
  return {
    width:  dv.getUint16(6,  true),
    height: dv.getUint16(8,  true),
    frames: dv.getUint16(10, true),
    fps:    buf[12]
  };
}
