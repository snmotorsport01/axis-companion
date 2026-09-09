// =====================================================================
//  gaugeReplay.ts — "screen rec" of the gauge, done in the APP (owner
//  2026-07-27): the gauge can't encode video in real time, so we re-render
//  its face frame-by-frame from the recorded DRIVE LOG (reusing the exact
//  gaugeRender preview + its new live-value hook) onto a canvas, and capture
//  that canvas with MediaRecorder → a shareable MP4/WebM clip. No firmware,
//  no GPS. Real-time capture (MediaRecorder can't run faster than wall-clock),
//  so long drives are sped up to keep the clip short.
// =====================================================================
import type { DriveLog, DriveSample } from './driveLog';
import { renderGaugePreview, chanMeta, ensureGaugeFont, setPreviewLiveValues, type PagePreview } from './gaugeRender';
import { Ch } from './monitorCfg';

const SZ = 466;                 // the gauge is 466×466
const CLIP_MAX_S = 15;          // cap the recorded clip; longer drives play sped-up

// Default face for the replay: HERO — big Speed, sub RPM (AXIS gold / cyan). A
// self-contained, recognisable "gauge screen" without needing the live config.
const REPLAY_PAGE: PagePreview = {
  layout: 0, ch: [Ch.SPEED, Ch.RPM, 0, 0, 0],
  arc: '#cea24a', col2: '#5bb8cf', text: '#ffffff',
  slot: ['#cea24a', '#5bb8cf', '', '', ''],
};

/** drive-log sample → { channel label → value } for setPreviewLiveValues.
 *  Labels match monitorCfg CHANNELS exactly. */
function liveMap(s: DriveSample): Map<string, number> {
  return new Map<string, number>([
    ['Speed', s.speedKmh], ['RPM', s.rpm], ['Water temp', s.coolantC],
    ['Boost', s.boostBar], ['Voltage', s.battV], ['Lambda actual', s.afrLambda],
    ['Catalyst temp', s.catC], ['Throttle', s.throttlePct], ['Engine load', s.loadPct],
    ['Battery SOC', s.hybSocPct], ['Fuel level', s.fuelPct],
  ]);
}

/** Sample the log at log-time `t` (seconds) — last sample at or before t. */
function at(samples: DriveSample[], t: number): DriveSample {
  let lo = 0, hi = samples.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (samples[mid].tSec <= t) lo = mid; else hi = mid - 1; }
  return samples[lo];
}

function pickMime(): string {
  const c = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  for (const m of c) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  return 'video/webm';
}

export function replaySupported(): boolean {
  return typeof MediaRecorder !== 'undefined' &&
    typeof (document.createElement('canvas') as HTMLCanvasElement).captureStream === 'function';
}

/** Render the gauge replay and return the recorded video blob. onProgress 0..100. */
export async function recordGaugeVideo(
  log: DriveLog, onProgress?: (pct: number) => void,
): Promise<Blob> {
  if (!replaySupported()) throw new Error('Video recording is not available on this device');
  const samples = log.samples;
  if (samples.length < 2) throw new Error('Drive log is too short to replay');
  await ensureGaugeFont().catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = SZ; canvas.height = SZ;
  const ctx = canvas.getContext('2d')!;
  // paint one frame before capture starts so the stream isn't blank
  setPreviewLiveValues(liveMap(samples[0]));
  renderGaugePreview(ctx, REPLAY_PAGE, chanMeta);

  const stream = (canvas as HTMLCanvasElement).captureStream(30);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime })); });

  const t0 = samples[0].tSec, tN = samples[samples.length - 1].tSec;
  const span = Math.max(0.1, tN - t0);
  const speed = span > CLIP_MAX_S ? span / CLIP_MAX_S : 1;   // compress long drives

  rec.start();
  const startWall = performance.now();
  await new Promise<void>((resolve) => {
    function frame() {
      const logElapsed = ((performance.now() - startWall) / 1000) * speed;
      if (logElapsed >= span) {
        setPreviewLiveValues(liveMap(samples[samples.length - 1]));
        renderGaugePreview(ctx, REPLAY_PAGE, chanMeta);
        onProgress?.(100);
        resolve();
        return;
      }
      const s = at(samples, t0 + logElapsed);
      setPreviewLiveValues(liveMap(s));
      renderGaugePreview(ctx, REPLAY_PAGE, chanMeta);
      onProgress?.(Math.min(99, Math.round((logElapsed / span) * 100)));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  // let the last frame land in the stream, then stop
  await new Promise((r) => setTimeout(r, 120));
  rec.stop();
  const blob = await stopped;
  setPreviewLiveValues(null);   // restore static preview for the rest of the app
  return blob;
}
