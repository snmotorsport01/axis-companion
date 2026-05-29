// =====================================================================
//  axsv.ts — encode images/videos into the AXIS screensaver format the
//  device firmware (system/Screensaver.cpp) consumes.
//
//  Two formats supported:
//
//  Format 0 — legacy 16-colour palette, 4-bit indexed (high nibble first)
//    [0..3]   magic           "AXSV"
//    [4..5]   version         1
//    [6..7]   width           (e.g. 240)
//    [8..9]   height          (e.g. 240)
//    [10..11] frames          (1..N)
//    [12]     fps             (1..30)
//    [13]     format          0
//    [14..15] reserved
//    [16..47] palette         16 × uint16 RGB565 little-endian
//    rest     frames × (W*H/2) bytes, 2 indices packed per byte
//
//  Format 2 — 128-colour palette, 7-bit packed (NEW in v1.8)
//    [0..3]   magic           "AXSV"
//    [4..5]   version         1
//    [6..7]   width
//    [8..9]   height
//    [10..11] frames
//    [12]     fps
//    [13]     format          2
//    [14..15] reserved
//    [16..271] palette        128 × uint16 RGB565 little-endian
//    rest     frames × ceil(W*H*7/8) bytes — 8 pixels per 7 bytes,
//             LSB-first bit stream (pixel i occupies bits [i*7..i*7+6]).
//
//  Why 128 packed: 65K → 16 colours via median-cut produced ugly
//  banding on video. 128 colours is the sweet spot — visually
//  indistinguishable from full RGB565 for natural video at typical
//  viewing distance, but ~2× smaller files than raw and fits more
//  frames inside the device's 2 MB PSRAM cache.
// =====================================================================

export const AXSV_W = 240;
export const AXSV_H = 240;

// Format 0 (legacy 16-colour) header + frame sizing.
const HEADER_BYTES_F0 = 48;
const FRAME_BYTES_F0  = (AXSV_W * AXSV_H) / 2;            // 4-bit packed

// Format 2 (128-colour 7-bit packed) header + frame sizing.
const PAL128_ENTRIES   = 128;
const HEADER_BYTES_F2  = 16 + PAL128_ENTRIES * 2;         // 272 bytes
const FRAME_PIXELS     = AXSV_W * AXSV_H;                 // 57,600
const FRAME_BYTES_F2   = Math.ceil(FRAME_PIXELS * 7 / 8); // 50,400

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
 * Simple, dependency-free; for 128 colours and ~5000 samples this runs
 * in ~10 ms.
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
  const depth = Math.ceil(Math.log2(targetColors));
  const palette = reduce(samples.slice(), depth).slice(0, targetColors);
  while (palette.length < targetColors) palette.push([0, 0, 0]);
  return palette;
}

/** Brute-force nearest-palette lookup. Acceptable for ~57 K pixels × 128 entries. */
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

/**
 * Pack a 240×240 frame's RGBA pixels into a 7-bit indexed bit stream
 * (format 2). LSB-first bit ordering — pixel `i` lives at bits
 * `[i*7 .. i*7+6]` counted from the low bit of byte 0.
 *
 * Allocated buffer is sized FRAME_BYTES_F2 + 1 so the firmware's
 * decoder (which reads 2 bytes at the boundary of every pixel) never
 * runs past the end. The extra byte stays at zero.
 */
function pack7bitFrame(rgba: Uint8ClampedArray, palette: RGB[]): Uint8Array {
  const out = new Uint8Array(FRAME_BYTES_F2);
  let bitPos = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const idx = nearestIdx(rgba[i], rgba[i + 1], rgba[i + 2], palette) & 0x7F;
    const bytePos = bitPos >>> 3;
    const bitOff  = bitPos & 7;
    out[bytePos] |= (idx << bitOff) & 0xFF;
    // Spill into the next byte when the 7-bit field crosses the boundary.
    // Always true unless bitOff === 1 (then 7 fits exactly in one byte).
    if (bitOff + 7 > 8 && bytePos + 1 < out.length) {
      out[bytePos + 1] |= (idx >>> (8 - bitOff)) & 0xFF;
    }
    bitPos += 7;
  }
  return out;
}

/** Format-2 AXSV builder. */
function buildAxsv128(palette: RGB[], frames: Uint8Array[], fps: number): Uint8Array {
  const total = HEADER_BYTES_F2 + frames.length * FRAME_BYTES_F2;
  const buf   = new Uint8Array(total);
  const dv    = new DataView(buf.buffer);

  buf[0] = 0x41; buf[1] = 0x58; buf[2] = 0x53; buf[3] = 0x56;   // "AXSV"
  dv.setUint16(4,  1,             true);      // version
  dv.setUint16(6,  AXSV_W,        true);
  dv.setUint16(8,  AXSV_H,        true);
  dv.setUint16(10, frames.length, true);
  buf[12] = fps;
  buf[13] = 2;                                // format = PAL128_7BIT

  for (let i = 0; i < PAL128_ENTRIES; ++i) {
    const [r, g, b] = palette[i] ?? [0, 0, 0];
    const px = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
    dv.setUint16(16 + i * 2, px, true);
  }

  let off = HEADER_BYTES_F2;
  for (const f of frames) {
    buf.set(f, off);
    off += FRAME_BYTES_F2;
  }
  return buf;
}

/** Sample N random pixels from a frame for palette building. */
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

/**
 * Append 3 RGBA frames at the loop boundary that linearly blend the
 * last unique frame back to the first. Combined with the device's
 * 100 ms per-transition crossfade, the wrap-point becomes a ~400 ms
 * gradual fade instead of a hard cut between two arbitrarily-different
 * frames.
 *
 * Caller should already have decided the source is animated (frames
 * length >= 2). Mutates the array in place.
 */
function appendLoopBlend(rgbaFrames: Uint8ClampedArray[]): void {
  if (rgbaFrames.length < 2) return;
  const first = rgbaFrames[0];
  const last  = rgbaFrames[rgbaFrames.length - 1];
  const N = first.length;
  if (last.length !== N) return;
  // v1.9.4: trimmed from 3 → 2 blend frames at t = 1/3, 2/3. Combined
  // with the device's now-40 ms per-transition crossfade the wrap
  // closes in ~330 ms (2 × 125 ms frame + 40 ms blend) — snappy enough
  // not to feel like a deliberate fade, smooth enough that the
  // content jump isn't visible. Saves 50 KB per upload too.
  for (const t of [1 / 3, 2 / 3]) {
    const blended = new Uint8ClampedArray(N);
    const w2 = Math.round(t * 256);
    const w1 = 256 - w2;
    for (let i = 0; i < N; i += 4) {
      blended[i]     = (last[i]     * w1 + first[i]     * w2) >> 8;
      blended[i + 1] = (last[i + 1] * w1 + first[i + 1] * w2) >> 8;
      blended[i + 2] = (last[i + 2] * w1 + first[i + 2] * w2) >> 8;
      blended[i + 3] = 255;
    }
    rgbaFrames.push(blended);
  }
}

/**
 * Shared back-end for any "I have N RGBA frames and want AXSV bytes"
 * caller. Auto-inserts 3 loop-blend frames at the tail so the wrap
 * from last to first closes smoothly. Builds a 128-colour median-cut
 * palette from samples across every frame (incl. the blended ones),
 * 7-bit indexes each frame, and packs the result.
 */
async function encodeAnimation(
  rgbaFrames: Uint8ClampedArray[],
  fps: number,
  onProgress?: (frac: number, msg: string) => void
): Promise<Uint8Array> {
  appendLoopBlend(rgbaFrames);
  const samples: RGB[] = [];
  for (const f of rgbaFrames) samples.push(...sample(f, Math.ceil(8000 / rgbaFrames.length)));
  const palette = medianCut(samples, PAL128_ENTRIES);
  const packed: Uint8Array[] = [];
  for (let i = 0; i < rgbaFrames.length; ++i) {
    packed.push(pack7bitFrame(rgbaFrames[i], palette));
    onProgress?.(0.5 + (i + 1) / (rgbaFrames.length * 2),
                 `Encoding ${i + 1}/${rgbaFrames.length}`);
  }
  return buildAxsv128(palette, packed, fps);
}

// ---- Public API -----------------------------------------------------

/**
 * Encode a static image as raw 240×240 RGB565 little-endian (115,200 bytes,
 * no header). Firmware recognises this layout by exact byte count and uses
 * it directly — full 16-bit colour, no palette quantisation.
 */
export async function encodeImage(file: File): Promise<Uint8Array> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, {
      colorSpaceConversion: 'default',
      imageOrientation:     'from-image',
      premultiplyAlpha:     'none'
    });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((ok, fail) => {
        img.onload  = () => ok();
        img.onerror = () => fail(new Error('image decode failed'));
        img.src     = url;
      });
      bitmap = await createImageBitmap(img);
    } finally { URL.revokeObjectURL(url); }
  }
  if (!bitmap) throw new Error('image decode failed');

  const cv = document.createElement('canvas');
  cv.width = AXSV_W; cv.height = AXSV_H;
  const ctx = cv.getContext('2d', { colorSpace: 'srgb' })!;
  drawCoverFit(ctx, bitmap, bitmap.width, bitmap.height);
  bitmap.close?.();

  const data = ctx.getImageData(0, 0, AXSV_W, AXSV_H, { colorSpace: 'srgb' } as any).data;
  const out  = new Uint8Array(AXSV_W * AXSV_H * 2);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 2) {
    const r = data[i]     >> 3;
    const g = data[i + 1] >> 2;
    const b = data[i + 2] >> 3;
    const px = (r << 11) | (g << 5) | b;
    out[j]     =  px        & 0xFF;
    out[j + 1] = (px >> 8)  & 0xFF;
  }
  return out;
}

export interface EncodeVideoOpts {
  frames: number;       // 1..40
  fps:    number;       // 1..30
  onProgress?: (frac: number, msg: string) => void;
}

/**
 * Encode a video as a multi-frame AXSV blob using format 2 (128 colours
 * via shared median-cut palette, 7-bit packed). Visually a huge step up
 * from the legacy 16-colour version — banding largely gone on natural
 * video. File grows ~75 % vs 16-colour but stays well inside the
 * device's flash + PSRAM budget for typical 20–35 frame loops.
 */
/**
 * Sample `frames` RGBA frames from a video file at evenly-spaced
 * timestamps inside the safe interior (skip first/last 5 % to dodge
 * the H.264 black-leader and fade-out endings). Returns the frames in
 * playback order; caller decides whether to encode as AXSV, encode as
 * GIF, or both.
 */
async function extractVideoFrames(
  file: File,
  frames: number,
  fps: number,
  onProgress?: (frac: number, msg: string) => void
): Promise<Uint8ClampedArray[]> {
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

    const headroom = Math.max(0.1, duration * 0.05);
    const winStart = Math.min(headroom, duration / 4);
    const winLen   = Math.max(0.001, duration - winStart * 2);
    const rgbaFrames: Uint8ClampedArray[] = [];
    for (let i = 0; i < frames; ++i) {
      const t = winStart + ((i + 0.5) / frames) * winLen;
      await new Promise<void>((ok) => {
        const onSeeked = () => { v.removeEventListener('seeked', onSeeked); ok(); };
        v.addEventListener('seeked', onSeeked);
        v.currentTime = t;
      });
      drawCoverFit(ctx, v, v.videoWidth, v.videoHeight);
      rgbaFrames.push(ctx.getImageData(0, 0, AXSV_W, AXSV_H).data);
      onProgress?.((i + 1) / (frames * 2), `Capturing frame ${i + 1}/${frames}`);
    }
    return rgbaFrames;
  } finally {
    URL.revokeObjectURL(url);
    v.removeAttribute('src');
    v.load();
  }
}

export async function encodeVideo(file: File, opts: EncodeVideoOpts): Promise<Uint8Array> {
  const { frames, fps, onProgress } = opts;
  const rgbaFrames = await extractVideoFrames(file, frames, fps, onProgress);
  return encodeAnimation(rgbaFrames, fps, onProgress);
}

/**
 * Re-encode a video file as a downloadable GIF (instead of AXSV). Used
 * by the "Save as GIF" button so users can keep a copy of the
 * processed animation outside the device. The same loop-blend frames
 * the AXSV encoder appends are included here too, so the downloaded
 * GIF loops as smoothly as the on-device version.
 *
 * gifenc is lazy-imported so the GIF encoder code only enters the PWA
 * bundle when the user actually clicks "Save as GIF".
 */
export async function videoToGifBlob(
  file: File,
  frames: number,
  fps: number,
  onProgress?: (frac: number, msg: string) => void
): Promise<Blob> {
  const rgbaFrames = await extractVideoFrames(file, frames, fps, onProgress);
  appendLoopBlend(rgbaFrames);
  return rgbaFramesToGifBlob(rgbaFrames, fps, onProgress);
}

/**
 * Pack the same RGBA frames the AXSV encoder uses into a real GIF89a
 * file. The shared palette across all frames keeps the GIF compact
 * and looking consistent across the loop.
 */
async function rgbaFramesToGifBlob(
  frames: Uint8ClampedArray[],
  fps: number,
  onProgress?: (frac: number, msg: string) => void
): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  // Build one shared 256-colour palette from a slice of every frame —
  // gifenc.quantize wants a flat Uint8Array of RGBA, so concatenate.
  const stride = AXSV_W * AXSV_H * 4;
  const merged = new Uint8Array(stride * frames.length);
  for (let i = 0; i < frames.length; ++i) {
    merged.set(frames[i], i * stride);
  }
  const palette = quantize(merged, 256);
  const gif = GIFEncoder();
  const delayMs = Math.max(20, Math.round(1000 / fps));
  for (let i = 0; i < frames.length; ++i) {
    const f = frames[i];
    const flat = new Uint8Array(f.buffer, f.byteOffset, f.byteLength);
    const index = applyPalette(flat, palette);
    gif.writeFrame(index, AXSV_W, AXSV_H, {
      palette,
      delay: delayMs,
      // loop forever (NETSCAPE 2.0 extension)
      repeat: 0
    } as any);
    onProgress?.((i + 1) / frames.length, `Writing GIF ${i + 1}/${frames.length}`);
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

/**
 * Encode an animated GIF as AXSV. GIFs are a much better source than
 * video for screensaver loops:
 *
 *   • They already loop seamlessly by design — the last-frame to
 *     first-frame transition was authored, so the crossfade on the
 *     device just smooths what was already smooth.
 *   • They're pre-quantised (typically ≤256 colours) so our 128-colour
 *     palette can usually reproduce the GIF near-perfectly.
 *   • Frame timings live in the file — no need to guess FPS.
 *
 * Decoding uses the WebCodecs `ImageDecoder` API which iOS Safari has
 * supported since 17.0 and Chrome / Edge since 94. If the user's
 * browser doesn't expose it we throw a friendly error so the PWA can
 * surface guidance.
 */
export async function encodeGif(
  file: File,
  onProgress?: (frac: number, msg: string) => void
): Promise<Uint8Array> {
  const Decoder: any = (typeof window !== 'undefined') ? (window as any).ImageDecoder : undefined;
  if (!Decoder) {
    throw new Error('Animated GIF needs iOS 17+ / Chrome 94+');
  }

  const decoder = new Decoder({ data: file.stream(), type: 'image/gif' });
  await decoder.completed;
  const track = decoder.tracks.selectedTrack;
  if (!track) throw new Error('GIF has no decodable track');
  const sourceCount = track.frameCount;
  if (sourceCount < 1) throw new Error('GIF has zero frames');

  // Cap at 24 frames to stay inside the device's PSRAM budget after
  // the dual-buffer crossfade allocation (v1.9). If the GIF has more,
  // sample evenly across its duration so loop integrity is preserved.
  const targetCount = Math.min(24, sourceCount);

  const cv = document.createElement('canvas');
  cv.width = AXSV_W; cv.height = AXSV_H;
  const ctx = cv.getContext('2d', { colorSpace: 'srgb' } as any)!;

  const rgbaFrames: Uint8ClampedArray[] = [];
  let totalDurationUs = 0;
  for (let i = 0; i < targetCount; ++i) {
    // Map output index → source index, evenly spaced.
    const srcIdx = sourceCount <= targetCount
      ? i
      : Math.floor(((i + 0.5) / targetCount) * sourceCount);
    const result = await decoder.decode({ frameIndex: srcIdx });
    const vf = result.image;            // VideoFrame
    const w = vf.displayWidth || vf.codedWidth || AXSV_W;
    const h = vf.displayHeight || vf.codedHeight || AXSV_H;
    drawCoverFit(ctx, vf as any, w, h);
    rgbaFrames.push(ctx.getImageData(0, 0, AXSV_W, AXSV_H).data);
    if (typeof vf.duration === 'number') totalDurationUs += vf.duration;
    vf.close();
    onProgress?.((i + 1) / (targetCount * 2),
                 `Decoding GIF ${i + 1}/${targetCount}`);
  }

  // Derive FPS from the GIF's natural cadence. WebCodecs gives durations
  // in microseconds. If none are present (some GIFs do that) fall back
  // to a reasonable default.
  let fps = 10;
  if (totalDurationUs > 0) {
    const loopSec = totalDurationUs / 1_000_000;
    fps = Math.round(targetCount / loopSec);
  }
  fps = Math.max(2, Math.min(20, fps));

  return encodeAnimation(rgbaFrames, fps, onProgress);
}

/** Decode an AXSV header for preview rendering. Handles both formats. */
export function decodeHeader(buf: Uint8Array): { width: number; height: number; frames: number; fps: number } | null {
  if (buf.length < HEADER_BYTES_F0) return null;
  if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'AXSV') return null;
  const dv = new DataView(buf.buffer, buf.byteOffset);
  return {
    width:  dv.getUint16(6,  true),
    height: dv.getUint16(8,  true),
    frames: dv.getUint16(10, true),
    fps:    buf[12]
  };
}
