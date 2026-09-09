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
  import { store, IS_CAPACITOR } from '../lib/store.svelte';
  import { t } from '../lib/i18n';
  import Glyph from '../lib/Glyph.svelte';

  // Compression presets — each level trades visual quality for upload
  // size. BLE caps practical throughput at ~80 kbps, so a 100 KB
  // screensaver takes ~12 s and a 30 KB one takes ~4 s. Default to
  // HIGH so behaviour matches the pre-compression versions; LOW is
  // what the user reaches for when the upload feels slow.
  type Quality = 'high' | 'medium' | 'low';
  const PRESETS: Record<Quality, { frames: number; fps: number; label: string; hint: string }> = {
    high:   { frames: 12, fps: 6, label: 'HIGH',
              hint: 'Photo: best quality · Video: 12 frames @ 6 fps' },
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
      ssErr = t('saver.err_zero_byte');
      ssFile = null;
      return;
    }

    ssBusy = true;
    try {
      await tick();   // ensure previewCanvas is mounted
      const kind = detectKind(f);
      ssEncodeMsg =
        kind === 'gif'   ? t('saver.msg_decode_gif') :
        kind === 'video' ? t('saver.msg_extract') :
                           t('saver.msg_optimise');
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
      const qLabel = quality === 'high' ? t('saver.label_high')
                   : quality === 'medium' ? t('saver.label_medium')
                   : t('saver.label_low');
      ssEncodeMsg =
        kind === 'gif'   ? t('saver.enc_gif', { kb }) :
        kind === 'video' ? t('saver.enc_video', { kb, frames: preset.frames, fps: preset.fps, label: qLabel }) :
                           t('saver.enc_still', { kb, q: quality === 'high' ? t('saver.q_best_quality') : t('saver.q_compressed') });
    } catch (e: any) {
      const msg = e?.message ?? t('saver.err_conversion');
      ssErr = /decode|read|fetch/i.test(msg)
        ? msg + t('saver.err_icloud_append')
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
      // v2.5.37 — on XE_COMMIT ("Device rejected upload: commit"), the
      // device's last loadFile_ reason is now surfaced via branding.
      // Read it back and show that instead of the generic string. Older
      // firmware just leaves screensaver_error undefined → fall through
      // to the original message.
      let detail: string | null = null;
      try {
        if (store.client) {
          const s = await store.client.branding();
          if (s.screensaver_error) detail = s.screensaver_error;
        }
      } catch {}
      ssErr = detail
        ? t('saver.err_device_load', { detail })
        : (e?.message ?? t('saver.err_upload'));
    } finally {
      ssBusy = false;
    }
  }

  async function clearOnDevice() {
    if (!store.client || !snap?.screensaver) return;
    if (!confirm(t('saver.confirm_remove'))) return;
    try {
      await store.client.clearScreensaver();
      snap = await store.client.branding();
    } catch (e: any) {
      ssErr = e?.message ?? t('saver.err_clear');
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
      ssErr = t('saver.err_save_video_only');
      return;
    }
    ssBusy = true;
    ssErr = null;
    try {
      const preset = PRESETS[quality];
      ssEncodeMsg = t('saver.msg_encoding_gif');
      const blob = await videoToGifBlob(ssFile, preset.frames, preset.fps,
                                        (_p, m) => { ssEncodeMsg = m; });
      const stem = ssFile.name.replace(/\.[^.]+$/, '') || 'screensaver';
      triggerDownload(blob, `${stem}.gif`);
      ssEncodeMsg = t('saver.enc_downloaded', { kb: (blob.size / 1024).toFixed(0) });
    } catch (e: any) {
      ssErr = e?.message ?? t('saver.err_gif_export');
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
      ssErr = t('saver.err_compress_video_only');
      return;
    }
    ssBusy = true;
    ssErr  = null;
    previewFrame = 0;
    try {
      const preset = PRESETS[quality];
      ssEncodeMsg = t('saver.msg_compress_vid');
      const blob = await videoToGifBlob(ssFile, preset.frames, preset.fps,
                                        (_p, m) => { ssEncodeMsg = m; });
      // Wrap blob in a File so the rest of the pipeline (preview,
      // upload, file-name display) keeps working unchanged.
      const stem = ssFile.name.replace(/\.[^.]+$/, '') || 'screensaver';
      const gifFile = new File([blob], `${stem}.gif`, { type: 'image/gif' });
      ssFile = gifFile;
      ssEncodeMsg = t('saver.msg_reencode');
      ssBytes = await encodeGif(gifFile, (_p, m) => { ssEncodeMsg = m; });
      await renderPreview();
      const kb = (ssBytes.length / 1024).toFixed(0);
      const gifKb = (blob.size / 1024).toFixed(0);
      ssEncodeMsg = t('saver.enc_compressed_ready', { kb, gifKb });
    } catch (e: any) {
      ssErr = e?.message ?? t('saver.err_compression');
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

<div class="pg">
  <button class="ss-back" on:click={() => (store.page = 'looks')}
    style="background:none;border:0;color:var(--accent,#c9a24a);font-family:var(--font-mono,monospace);font-size:12px;letter-spacing:1px;padding:0 0 8px;cursor:pointer;">{t('saver.back_looks')}</button>
  <div class="hd"><span class="wm">AXIS</span><span class="sub">{t('saver.title')}</span></div>

  {#if !snap}
    <p class="empty">{t('saver.loading')}</p>
  {:else}
    <p class="intro">{t('saver.intro')}</p>

    <div class="prev">
      {#if ssBytes}
        <canvas bind:this={previewCanvas} width={snap.screensaver_w} height={snap.screensaver_h}></canvas>
        {#if isAnimated()}
          <div class="scrub">
            <input type="range" min="0" max={totalFrames() - 1} step="1" value={previewFrame} on:input={onScrub} disabled={ssBusy} />
            <span class="fr">{previewFrame + 1} / {totalFrames()}</span>
          </div>
        {/if}
      {:else}
        <div class="prev-empty">
          {#if ssBusy}<Glyph kind="spinner" size={26} />{/if}
          <span>{ssEncodeMsg ?? (snap.screensaver ? t('saver.prev_loaded') : t('saver.prev_none'))}</span>
        </div>
      {/if}
    </div>

    <label class="file">
      <input type="file" accept="image/*,video/*,image/gif" on:change={onPick} disabled={ssBusy} />
      <span>{ssFile ? ssFile.name : t('saver.file_choose')}</span>
    </label>

    <div class="lab">{t('saver.quality')}</div>
    <div class="chips">
      {#each (['high','medium','low'] as const) as q}
        <button type="button" class="chip" class:sel={quality === q} on:click={() => quality = q} disabled={ssBusy}>
          {q === 'high' ? t('saver.chip_best') : q === 'medium' ? t('saver.chip_balanced') : t('saver.chip_smaller')}
        </button>
      {/each}
    </div>
    <p class="hint">
      {#if ssFile}{t('saver.hint_repick')}{:else}{t('saver.hint_default')}{/if}
    </p>

    {#if ssEncodeMsg && ssBytes}<p class="enc">{ssEncodeMsg}</p>{/if}
    {#if ssErr}<div class="err">{ssErr}</div>{/if}

    {#if ssBusy && ssProgress > 0}
      <div class="progress"><div style="width:{(ssProgress * 100).toFixed(0)}%"></div></div>
      <p class="enc">{t('saver.sending', { pct: (ssProgress * 100).toFixed(0) })}</p>
    {/if}

    <div class="actions">
      <button class="ghost" on:click={clearOnDevice} disabled={!snap.screensaver || ssBusy}>{t('saver.remove')}</button>
      {#if !IS_CAPACITOR && ssFile && (ssFile.type.startsWith('video/') || /\.gif$/i.test(ssFile.name))}
        <!-- <a download> is a no-op in the iOS WKWebView, so this is web-only. -->
        <button class="ghost" disabled={!ssBytes || ssBusy} on:click={saveAsGif}>{t('saver.save_copy')}</button>
      {/if}
      <button class="save" disabled={!ssBytes || ssBusy} on:click={upload}>
        {#if ssBusy}<Glyph kind="saving" size={16} /> {t('saver.adding')}{:else}{t('saver.add')}{/if}
      </button>
    </div>

    <details class="tips">
      <summary>{t('saver.tips_summary')}</summary>
      <ul>
        <li>{t('saver.tip_gif')}</li>
        <li>{t('saver.tip_video')}</li>
        <li>{t('saver.tip_size')}</li>
        <li>{t('saver.tip_cut')}</li>
      </ul>
    </details>
  {/if}
</div>

<style>
  .pg { padding: 14px 16px 90px; max-width: 480px; margin: 0 auto; color: var(--fg, #e9e7df); }
  .hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
  .wm { letter-spacing: 3px; font-weight: 500; }
  .sub { color: var(--muted, #85826f); font-size: 13px; }
  .empty { color: var(--muted, #85826f); text-align: center; padding: 40px 0; }
  .intro { font-size: 14px; margin: 6px 0 16px; line-height: 1.5; }
  .prev { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 14px; }
  .prev canvas { width: 200px; height: 200px; border-radius: 50%; background: #000; box-shadow: 0 0 0 3px var(--border, #26261c); image-rendering: pixelated; }
  .prev-empty { width: 200px; height: 200px; border-radius: 50%; background: #0e0e10; border: 1px solid var(--border, #26261c); color: var(--muted, #85826f); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; font-size: 12px; padding: 0 22px; }
  .scrub { display: flex; align-items: center; gap: 8px; width: 100%; }
  .scrub input[type="range"] { flex: 1; accent-color: var(--accent, #c9a24a); }
  .fr { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--muted, #85826f); }
  .file { display: block; border: 1px dashed var(--border, #3a382f); border-radius: 11px; padding: 14px; text-align: center; cursor: pointer; color: var(--muted, #85826f); font-size: 13px; }
  .file input { display: none; }
  .file:hover { color: var(--fg, #e9e7df); border-color: var(--accent, #c9a24a); }
  .lab { font-size: 11px; letter-spacing: 1.5px; color: var(--muted, #8f8a79); margin: 16px 0 8px 1px; }
  .chips { display: flex; gap: 7px; }
  .chip { flex: 1; background: var(--surface-2, #15151a); border: 1px solid var(--border, #26261c); color: inherit; padding: 9px 4px; border-radius: 10px; font-size: 12.5px; cursor: pointer; }
  .chip.sel { border-color: var(--accent, #c9a24a); background: #1a1710; }
  .chip:disabled { opacity: .4; cursor: not-allowed; }
  .hint { font-size: 11px; color: var(--muted, #75726a); line-height: 1.45; margin: 8px 1px 0; }
  .enc { font-size: 11.5px; color: var(--muted, #85826f); font-family: var(--font-mono, monospace); margin: 10px 1px 0; }
  .err { color: var(--warn, #e24b4a); font-size: 12.5px; white-space: pre-wrap; margin: 10px 0 0; line-height: 1.5; }
  .progress { height: 6px; border-radius: 3px; background: var(--border, #26261c); overflow: hidden; margin-top: 12px; }
  .progress > div { height: 100%; background: var(--accent, #c9a24a); transition: width 200ms; }
  .actions { display: flex; gap: 8px; align-items: center; margin-top: 16px; }
  .actions .ghost { background: var(--surface-2, #15151a); color: inherit; border: 1px solid var(--border, #33312a); border-radius: 10px; padding: 11px 14px; font-size: 13px; cursor: pointer; }
  .actions .ghost:disabled { opacity: .4; cursor: not-allowed; }
  .save { flex: 1; border: 1px solid var(--accent, #c9a24a); background: var(--accent, #c9a24a); color: #1c1607; font-weight: 500; border-radius: 11px; padding: 11px; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .save:disabled { opacity: .45; cursor: default; }
  .tips { margin-top: 18px; }
  .tips summary { font-size: 12px; color: var(--muted, #85826f); cursor: pointer; padding: 8px 0; }
  .tips ul { margin: 4px 0 0 18px; padding: 0; font-size: 12px; color: var(--muted, #85826f); }
  .tips li { margin: 5px 0; }
</style>
