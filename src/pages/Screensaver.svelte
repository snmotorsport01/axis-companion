<script lang="ts">
  // =====================================================================
  //  Screensaver — dedicated upload page (v2.0).
  //
  //  Lifted out of Brand.svelte so the path "pick file → preview → upload"
  //  isn't competing with colour pickers + device-name editing in the
  //  same scroll view. This page is single-purpose: choose media,
  //  see what the device will show, save / upload.
  //
  //  Accepts:
  //    • Static image (any browser-decodable format) → raw RGB565
  //    • Animated GIF                                → 128-colour AXSV
  //    • Video                                       → 128-colour AXSV
  //
  //  Buttons:
  //    • CLEAR     — remove the screensaver on the device
  //    • SAVE GIF  — download a polished .gif copy (videos only,
  //                  includes the v1.9.3 loop-blend frames)
  //    • UPLOAD    — push the encoded AXSV payload to the device
  // =====================================================================

  import { onMount, tick } from 'svelte';
  import type { BrandingSnapshot } from '../lib/api';
  import { encodeImage, encodeVideo, encodeGif, videoToGifBlob } from '../lib/axsv';
  import { store } from '../lib/store.svelte';
  import PageHeader from '../lib/PageHeader.svelte';

  // Compression presets — each level trades visual quality for upload
  // size. BLE caps practical throughput at ~80 kbps, so a 100 KB
  // screensaver takes ~12 s and a 30 KB one takes ~4 s. Default to
  // HIGH so behaviour matches the pre-compression versions; LOW is
  // what the user reaches for when the upload feels slow.
  type Quality = 'high' | 'medium' | 'low';
  const PRESETS: Record<Quality, { frames: number; fps: number; label: string; hint: string }> = {
    high:   { frames: 12, fps: 6, label: 'HIGH',
              hint: 'Photo: full 16-bit · Video: 12 frames @ 6 fps' },
    medium: { frames: 8,  fps: 5, label: 'MEDIUM',
              hint: 'Photo: 128 colours · Video: 8 frames @ 5 fps' },
    low:    { frames: 6,  fps: 4, label: 'LOW',
              hint: 'Photo: 128 colours · Video: 6 frames @ 4 fps' }
  };
  let quality: Quality = $state('high');

  let snap = $state<BrandingSnapshot | null>(null);

  // Source file the user picked + the encoded AXSV bytes ready to send.
  let ssFile     = $state<File | null>(null);
  let ssBytes    = $state<Uint8Array | null>(null);
  let ssBusy     = $state(false);
  let ssProgress = $state(0);
  let ssErr      = $state<string | null>(null);
  let ssEncodeMsg= $state<string | null>(null);

  // Preview canvas + which frame of an animated payload we're showing.
  let previewCanvas: HTMLCanvasElement | null = $state(null);
  let previewFrame  = $state(0);

  onMount(async () => {
    if (!store.client) { store.goConnect(); return; }
    snap = await store.client.branding();
  });

  // ---- File pick ------------------------------------------------------
  function detectKind(f: File): 'gif' | 'video' | 'image' {
    if (f.type === 'image/gif' || /\.gif$/i.test(f.name)) return 'gif';
    if (f.type.startsWith('video/'))                       return 'video';
    return 'image';
  }

  async function onPick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    ssErr = null;
    ssBytes = null;
    ssEncodeMsg = null;
    previewFrame = 0;
    ssFile = f;
    if (!f) return;

    // iCloud-only photos arrive as a 0-byte File on offline iOS — the
    // OS hasn't pulled the actual bytes yet. Friendlier message than
    // letting the decoder fail downstream.
    if (f.size === 0) {
      ssErr = 'This file appears to be 0 bytes. If it has an iCloud ⬇ ' +
              'badge in Photos, your phone needs internet to download it ' +
              'first before AXIS can read the bytes.';
      ssFile = null;
      return;
    }

    ssBusy = true;
    try {
      await tick();   // ensure previewCanvas is mounted
      const kind = detectKind(f);
      ssEncodeMsg =
        kind === 'gif'   ? 'Decoding GIF…' :
        kind === 'video' ? 'Extracting frames…' :
                           'Quantising colours…';
      const preset = PRESETS[quality];
      if (kind === 'gif') {
        // GIFs are already palette-quantised by the decoder; the
        // quality knob only changes the frame budget in the
        // animation pipeline. The decoder passes that along.
        ssBytes = await encodeGif(f, (_p, m) => { ssEncodeMsg = m; });
      } else if (kind === 'video') {
        ssBytes = await encodeVideo(f, {
          frames: preset.frames, fps: preset.fps,
          onProgress: (_p, m) => { ssEncodeMsg = m; }
        });
      } else {
        ssBytes = await encodeImage(f, { quality: quality === 'high' ? 'high' : 'low' });
      }
      await renderPreview();
      const kb = (ssBytes.length / 1024).toFixed(0);
      ssEncodeMsg =
        kind === 'gif'   ? `${kb} KB · animated GIF (seamless loop)` :
        kind === 'video' ? `${kb} KB · ${preset.frames} frames @ ${preset.fps} fps · ${preset.label}` :
                           `${kb} KB · still image · ${quality === 'high' ? 'full 16-bit colour' : 'compressed'}`;
    } catch (e: any) {
      const msg = e?.message ?? 'conversion failed';
      ssErr = /decode|read|fetch/i.test(msg)
        ? msg + '\n\nIf this is an iCloud photo, your phone needs internet ' +
                'to download it before AXIS can read it.'
        : msg;
      ssBytes = null;
      ssEncodeMsg = null;
    } finally {
      ssBusy = false;
    }
  }

  // ---- Preview rendering ---------------------------------------------
  function totalFrames(): number {
    if (!ssBytes || !snap) return 0;
    const W = snap.screensaver_w, H = snap.screensaver_h;
    if (ssBytes.length === W * H * 2) return 1;           // raw still
    if (ssBytes.length < 16) return 0;
    const dv = new DataView(ssBytes.buffer, ssBytes.byteOffset);
    // Magic + version sanity, then frames at offset 10.
    if (ssBytes[0] !== 0x41 || ssBytes[1] !== 0x58) return 0;
    return dv.getUint16(10, true);
  }

  async function renderPreview() {
    if (!ssBytes || !previewCanvas || !snap) return;
    const W = snap.screensaver_w, H = snap.screensaver_h;
    const ctx = previewCanvas.getContext('2d')!;
    const img = ctx.createImageData(W, H);

    if (ssBytes.length === W * H * 2) {
      // Raw RGB565 little-endian still
      for (let i = 0, p = 0; i < ssBytes.length; i += 2, p += 4) {
        const px = ssBytes[i] | (ssBytes[i + 1] << 8);
        img.data[p]     = (px >> 11) << 3;
        img.data[p + 1] = ((px >> 5) & 0x3F) << 2;
        img.data[p + 2] = (px & 0x1F) << 3;
        img.data[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    // AXSV — read format + palette + decode the active frame
    if (ssBytes[0] !== 0x41 || ssBytes[1] !== 0x58) return;   // "AX..."
    const dv = new DataView(ssBytes.buffer, ssBytes.byteOffset);
    const frames = dv.getUint16(10, true);
    const format = ssBytes[13];

    const palEntries  = format === 2 ? 128 : 16;
    const palBytes    = palEntries * 2;
    const palette = new Array<[number, number, number]>(palEntries);
    for (let i = 0; i < palEntries; ++i) {
      const px = dv.getUint16(16 + i * 2, true);
      palette[i] = [
        (px >> 11) << 3,
        ((px >> 5) & 0x3F) << 2,
        (px & 0x1F) << 3
      ];
    }

    const headerBytes = 16 + palBytes;
    const frameBytes  =
      format === 2 ? Math.ceil(W * H * 7 / 8) : (W * H) / 2;
    const fi = Math.max(0, Math.min(previewFrame, frames - 1));
    const frame = ssBytes.subarray(headerBytes + fi * frameBytes,
                                   headerBytes + (fi + 1) * frameBytes);

    if (format === 2) {
      // 7-bit packed indices
      let bitPos = 0, dst = 0;
      for (let p = 0; p < W * H; ++p) {
        const bp = bitPos >> 3;
        const bo = bitPos & 7;
        const two = frame[bp] | (frame[bp + 1] << 8);
        const idx = (two >> bo) & 0x7F;
        const c = palette[idx];
        img.data[dst++] = c[0];
        img.data[dst++] = c[1];
        img.data[dst++] = c[2];
        img.data[dst++] = 255;
        bitPos += 7;
      }
    } else {
      // 4-bit packed indices, high nibble first
      let dst = 0;
      for (let i = 0; i < frame.length; ++i) {
        const b = frame[i];
        const ca = palette[(b >> 4) & 0x0F];
        const cb = palette[b & 0x0F];
        img.data[dst++] = ca[0]; img.data[dst++] = ca[1]; img.data[dst++] = ca[2]; img.data[dst++] = 255;
        img.data[dst++] = cb[0]; img.data[dst++] = cb[1]; img.data[dst++] = cb[2]; img.data[dst++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---- Actions --------------------------------------------------------
  async function upload() {
    if (!ssBytes || !store.client) return;
    ssBusy = true;
    ssErr = null;
    ssProgress = 0;
    try {
      await store.client.uploadScreensaver(ssBytes, p => { ssProgress = p; });
      snap = await store.client.branding();
      ssFile = null; ssBytes = null;
      ssEncodeMsg = null;
      // v2.5.34: push the device into its sleep/screensaver screen so
      // the user can immediately see the image they just uploaded.
      // Without this, screensaver upload felt like a no-op — it would
      // only become visible after the sleepAfterMs idle timeout
      // (default 2 minutes) or a manual long-press on MAIN. The
      // command is fire-and-forget; any error here doesn't undo the
      // successful upload above, so we swallow it and let the user
      // see the existing "uploaded" UI state.
      try { await store.client.gotoSleep(); } catch {}
    } catch (e: any) {
      ssErr = e?.message ?? 'upload failed';
    } finally {
      ssBusy = false;
    }
  }

  async function clearOnDevice() {
    if (!store.client || !snap?.screensaver) return;
    if (!confirm('Remove the screensaver from the device?')) return;
    try {
      await store.client.clearScreensaver();
      snap = await store.client.branding();
    } catch (e: any) {
      ssErr = e?.message ?? 'clear failed';
    }
  }

  async function saveAsGif() {
    if (!ssFile) return;
    const kind = detectKind(ssFile);
    if (kind === 'gif') {
      triggerDownload(ssFile, ssFile.name);
      return;
    }
    if (kind !== 'video') {
      ssErr = 'Save as GIF only works for video sources.';
      return;
    }
    ssBusy = true;
    ssErr = null;
    try {
      const preset = PRESETS[quality];
      ssEncodeMsg = 'Encoding GIF…';
      const blob = await videoToGifBlob(ssFile, preset.frames, preset.fps,
                                        (_p, m) => { ssEncodeMsg = m; });
      const stem = ssFile.name.replace(/\.[^.]+$/, '') || 'screensaver';
      triggerDownload(blob, `${stem}.gif`);
      ssEncodeMsg = `${(blob.size / 1024).toFixed(0)} KB · downloaded`;
    } catch (e: any) {
      ssErr = e?.message ?? 'GIF export failed';
    } finally {
      ssBusy = false;
    }
  }

  // Convert a video (incl. 4K 60fps) to an in-memory GIF, then re-run
  // the encode pipeline as if the user had picked that GIF themselves.
  // Saves a round-trip through the Files app vs. "SAVE GIF + re-pick"
  // — and the GIF intermediate sidesteps the AXSV pipeline's direct
  // video extractor, which is the path that struggles with weird-GOP
  // 4K H.264 / HEVC encoders. The GIF is decoded by gifuct-js (pure
  // JS, no WebKit involved) so reliability is higher.
  async function compressToGif() {
    if (!ssFile) return;
    const kind = detectKind(ssFile);
    if (kind !== 'video') {
      ssErr = 'Compress to GIF only works for video sources.';
      return;
    }
    ssBusy = true;
    ssErr  = null;
    previewFrame = 0;
    try {
      const preset = PRESETS[quality];
      ssEncodeMsg = 'Compressing video to GIF…';
      const blob = await videoToGifBlob(ssFile, preset.frames, preset.fps,
                                        (_p, m) => { ssEncodeMsg = m; });
      // Wrap blob in a File so the rest of the pipeline (preview,
      // upload, file-name display) keeps working unchanged.
      const stem = ssFile.name.replace(/\.[^.]+$/, '') || 'screensaver';
      const gifFile = new File([blob], `${stem}.gif`, { type: 'image/gif' });
      ssFile = gifFile;
      ssEncodeMsg = 'Re-encoding GIF as screensaver…';
      ssBytes = await encodeGif(gifFile, (_p, m) => { ssEncodeMsg = m; });
      await renderPreview();
      const kb = (ssBytes.length / 1024).toFixed(0);
      const gifKb = (blob.size / 1024).toFixed(0);
      ssEncodeMsg = `${kb} KB · from ${gifKb} KB GIF · ready to upload`;
    } catch (e: any) {
      ssErr = e?.message ?? 'compression failed';
    } finally {
      ssBusy = false;
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onScrub(e: Event) {
    previewFrame = parseInt((e.target as HTMLInputElement).value, 10);
    await renderPreview();
  }

  function isAnimated(): boolean {
    return totalFrames() > 1;
  }
</script>

<PageHeader />

{#if !snap}
  <div class="card muted">Loading…</div>
{:else}
  <div class="card">
    <h2>What plays while the device sleeps</h2>
    <p class="muted small">
      Long-press the MAIN screen to enter sleep mode and show your
      screensaver. AXIS supports stills, animated GIFs, and short
      videos. Loops close smoothly thanks to per-frame crossfade.
    </p>

    <!-- Preview pane -->
    <div class="preview">
      {#if ssBytes}
        <canvas
          bind:this={previewCanvas}
          width={snap.screensaver_w}
          height={snap.screensaver_h}
        ></canvas>
        {#if isAnimated()}
          <div class="scrub">
            <input
              type="range"
              min="0"
              max={totalFrames() - 1}
              step="1"
              value={previewFrame}
              on:input={onScrub}
              disabled={ssBusy}
            />
            <span class="mono small">{previewFrame + 1} / {totalFrames()}</span>
          </div>
        {/if}
      {:else}
        <div class="preview-empty">
          {ssEncodeMsg ?? (snap.screensaver ? 'Device has a screensaver loaded' : 'No file picked yet')}
        </div>
      {/if}
    </div>

    <!-- Compression preset — affects both photo + video pipelines. -->
    <!-- Higher compression = smaller file = faster BLE upload (~12 s -->
    <!--  → ~4 s for stills, ~12 s → ~6 s for video). LOW + MEDIUM     -->
    <!-- quantise stills through the AXSV-128 path; HIGH stays raw     -->
    <!-- RGB565. Re-picking quality after a file is chosen requires    -->
    <!-- re-picking the file — the encoded buffer doesn't auto-rerun.  -->
    <div class="quality-row">
      <span class="quality-label">QUALITY</span>
      {#each (['high','medium','low'] as const) as q}
        <button
          type="button"
          class="quality-chip"
          class:active={quality === q}
          on:click={() => quality = q}
          disabled={ssBusy}
        >
          {q.toUpperCase()}
        </button>
      {/each}
    </div>
    <p class="muted small quality-hint">
      {#if ssFile}
        ⟳ Re-pick the file to apply — {PRESETS[quality].hint}
      {:else}
        {PRESETS[quality].hint}
      {/if}
    </p>

    <!-- File picker -->
    <label class="file">
      <input
        type="file"
        accept="image/*,video/*,image/gif"
        on:change={onPick}
        disabled={ssBusy}
      />
      <span>{ssFile ? ssFile.name : 'Choose image, GIF, or video'}</span>
    </label>

    <!-- Spec note: 4K clips now accepted (v0.5.4 rVFC playback path
         handles iPhone H.264 + HEVC at 4K). Output is still 240×240
         so anything above 1080p is technically wasted pixels, but
         users can drop any phone export here and it Just Works. -->
    <p class="muted small spec-note">
      * Videos: up to <b>4K (3840 × 2160)</b> accepted. iPhone Photos
      exports — H.264 + HEVC, any frame rate — work natively. Large 4K
      files may take 30-60 s to decode the first time.
    </p>

    {#if ssEncodeMsg && ssBytes}
      <p class="muted small mono">{ssEncodeMsg}</p>
    {/if}

    {#if ssErr}
      <div class="err">{ssErr}</div>
    {/if}

    {#if ssBusy && ssProgress > 0}
      <div class="progress"><div style="width:{(ssProgress * 100).toFixed(0)}%"></div></div>
      <p class="muted small mono">{(ssProgress * 100).toFixed(0)}%</p>
    {/if}

    <div class="actions">
      <button on:click={clearOnDevice} disabled={!snap.screensaver || ssBusy}>CLEAR</button>
      {#if ssFile && (ssFile.type.startsWith('video/') || /\.gif$/i.test(ssFile.name))}
        <button disabled={!ssBytes || ssBusy} on:click={saveAsGif}>SAVE GIF</button>
      {/if}
      <button class="primary" disabled={!ssBytes || ssBusy} on:click={upload}>
        {ssBusy ? 'UPLOADING…' : 'UPLOAD'}
      </button>
    </div>
  </div>

  <div class="card muted small">
    <h3>Tips for the best loop</h3>
    <ul>
      <li><b>GIFs</b> usually look best — designers author them to loop.</li>
      <li><b>Videos</b> get sampled into 12 frames at 6 fps automatically.</li>
      <li>Any source resolution up to <b>4K</b> works — the encoder
          downscales to 240 × 240 in the canvas before sampling.
          Smaller sources (1080p or below) still decode faster.</li>
      <li>Keep motion smooth and avoid abrupt cuts near the end of the clip.</li>
      <li>Stills upload as full 16-bit colour — no palette quantisation.</li>
    </ul>
  </div>
{/if}

<style>
  .bar {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
  }
  .bar h1 {
    margin: 0; font-size: 14px; letter-spacing: 0.18em;
    color: var(--muted);
  }
  .back {
    background: transparent; border: 0; color: var(--muted);
    padding: 6px 8px; cursor: pointer; font-size: 13px;
  }
  .card {
    background: var(--card);
    border-radius: 14px;
    padding: 16px;
    margin: 12px 16px;
  }
  .card h2 {
    margin: 0 0 8px; font-size: 15px;
  }
  .card h3 {
    margin: 0 0 6px; font-size: 13px; color: var(--muted);
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .preview {
    margin: 14px 0;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .preview canvas {
    width: 200px; height: 200px;
    border-radius: 50%;
    background: #000;
    box-shadow: 0 0 0 4px var(--line);
    image-rendering: pixelated;
  }
  .preview-empty {
    width: 200px; height: 200px;
    border-radius: 50%;
    background: #0e0e10;
    color: var(--muted);
    display: flex; align-items: center; justify-content: center;
    text-align: center; font-size: 12px; padding: 0 18px;
  }
  .scrub {
    display: flex; align-items: center; gap: 8px; width: 100%;
  }
  .scrub input[type="range"] {
    flex: 1; accent-color: var(--accent);
  }
  .file {
    display: block;
    border: 1px dashed var(--line);
    border-radius: 10px;
    padding: 14px;
    text-align: center;
    cursor: pointer;
    color: var(--muted);
    margin: 8px 0 6px;
  }
  .file input { display: none; }
  .file:hover { color: var(--fg); border-color: var(--accent); }
  /* ---- Quality chip selector ---- */
  .quality-row {
    display: flex; align-items: center; gap: 6px;
    margin: 10px 2px 4px;
  }
  .quality-label {
    font-family: ui-monospace, monospace;
    font-size: 11px; letter-spacing: 1px;
    color: var(--muted);
    margin-right: 6px;
  }
  .quality-chip {
    flex: 1;
    background: transparent;
    border: 1px solid var(--line);
    color: var(--muted);
    padding: 6px 10px;
    border-radius: 999px;
    font-family: ui-monospace, monospace;
    font-size: 11px; letter-spacing: 1px;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }
  .quality-chip:hover:not(:disabled) { color: var(--fg); border-color: var(--accent); }
  .quality-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #000;
  }
  .quality-chip:disabled { opacity: 0.4; cursor: not-allowed; }
  .quality-hint {
    margin: 4px 2px 8px;
    line-height: 1.4;
  }
  .spec-note {
    margin: 6px 2px 4px;
    line-height: 1.4;
  }
  .spec-note b { color: var(--fg); }
  .err {
    color: #ff6e6e;
    font-size: 13px;
    white-space: pre-wrap;
    margin: 8px 0;
  }
  .progress {
    height: 6px; border-radius: 3px; background: var(--line); overflow: hidden;
  }
  .progress > div {
    height: 100%; background: var(--accent); transition: width 200ms;
  }
  .actions {
    display: flex; gap: 8px; justify-content: flex-end;
    margin-top: 12px;
  }
  .actions button {
    background: var(--line);
    color: var(--fg);
    border: 0;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    cursor: pointer;
  }
  .actions button:disabled { opacity: 0.4; cursor: not-allowed; }
  .actions button.primary { background: var(--accent); color: #000; font-weight: 600; }
  ul { margin: 4px 0 0 18px; padding: 0; }
  ul li { margin: 4px 0; }
  .small { font-size: 12px; }
  .muted { color: var(--muted); }
  .mono  { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
