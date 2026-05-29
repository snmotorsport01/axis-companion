<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { BrandingSnapshot, WifiStatus } from '../lib/api';
  import { encodeImage, encodeVideo, encodeGif, videoToGifBlob } from '../lib/axsv';
  import { store } from '../lib/store.svelte';

  // ---- Animation settings (when uploading video) ----------------------
  // v1.9: chosen automatically — user just picks a file, the encoder
  // hands them 24 frames at 8 fps (3-second loop). These values came
  // out of testing as the sweet spot between perceived smoothness and
  // PSRAM budget on the device after the dual-buffer crossfade work.
  const SS_FRAMES = 24;
  const SS_FPS    = 8;
  let ssEncodeMsg  = $state<string | null>(null);

  // ---- Home Wi-Fi (for device-side OTA) -------------------------------
  let wifi       = $state<WifiStatus | null>(null);
  let wifiSsid   = $state('');
  let wifiPass   = $state('');
  let wifiSaving = $state(false);
  let wifiErr    = $state<string | null>(null);
  let wifiPoll: number | undefined;

  let snap   = $state<BrandingSnapshot | null>(null);
  let name   = $state('');
  let color  = $state('#FFA500');
  // Per-element colour overrides (v1.2+). `*Linked` reflects whether the
  // user wants the slot to inherit from the main accent — when true the
  // colour picker is grayed out and we send an empty string to the
  // firmware to clear the per-slot override.
  // All six per-element slots are independent (v1.2.2+). No "Linked"
  // concept — every slot is editable on its own and persisted as-is.
  let gearColor   = $state('#FFA500');
  let meterColor  = $state('#FFA500');
  let nameColor   = $state('#BDBDBD');
  let fgColor     = $state('#FFFFFF');
  let mutedColor  = $state('#BDBDBD');
  let warnColor   = $state('#F80000');
  let saving = $state(false);
  let err    = $state<string | null>(null);
  let saved  = $state(false);

  // Animated-screensaver preview frame index — when the encoded payload
  // is AXSV the user can scrub through frames before uploading.
  let ssPreviewFrame = $state(0);

  // ---- Screensaver state ---------------------------------------------
  let ssFile      = $state<File | null>(null);
  let ssBytes     = $state<Uint8Array | null>(null);    // converted RGB565
  let ssBusy      = $state(false);
  let ssProgress  = $state(0);
  let ssErr       = $state<string | null>(null);
  let ssPreviewCanvas: HTMLCanvasElement | null = $state(null);

  onMount(async () => {
    if (!store.client) return;
    try {
      snap  = await store.client.branding();
      name  = snap.name;
      color = snap.accent_hex;
      gearColor   = snap.gear_hex;
      meterColor  = snap.meter_hex;
      nameColor   = snap.name_hex;
      fgColor     = snap.fg_hex;
      mutedColor  = snap.muted_hex;
      warnColor   = snap.warn_hex;
    } catch (e: any) {
      err = e?.message ?? 'load failed';
    }
    await reloadWifi();
    // Poll WiFi state while on this page so the user can see the device
    // associate after they save creds.
    wifiPoll = window.setInterval(reloadWifi, 3000);
    return () => { if (wifiPoll) window.clearInterval(wifiPoll); };
  });

  async function reloadWifi() {
    if (!store.client) return;
    try {
      wifi = await store.client.wifi();
      if (wifiSsid === '' && wifi.ssid) wifiSsid = wifi.ssid;
    } catch {}
  }

  async function saveWifi() {
    if (!store.client) return;
    wifiSaving = true;
    wifiErr = null;
    try {
      await store.client.setWifi(wifiSsid.trim(), wifiPass);
      wifiPass = '';     // clear pwd field after submit
      await reloadWifi();
    } catch (e: any) {
      wifiErr = e?.message ?? 'save failed';
    } finally {
      wifiSaving = false;
    }
  }

  // Dirty flag — any field different from the last snapshot.
  let dirty = $derived(!!snap && (
    name.trim() !== snap.name ||
    color.toUpperCase()      !== snap.accent_hex.toUpperCase() ||
    gearColor.toUpperCase()  !== snap.gear_hex.toUpperCase()   ||
    meterColor.toUpperCase() !== snap.meter_hex.toUpperCase()  ||
    nameColor.toUpperCase()  !== snap.name_hex.toUpperCase()   ||
    fgColor.toUpperCase()    !== snap.fg_hex.toUpperCase()     ||
    mutedColor.toUpperCase() !== snap.muted_hex.toUpperCase()  ||
    warnColor.toUpperCase()  !== snap.warn_hex.toUpperCase()
  ));

  async function save() {
    if (!store.client || !snap) return;
    saving = true;
    err = null;
    saved = false;
    try {
      // Each slot is sent as either "" (clear / inherit) or the hex.
      // Empty-string clearance is how the firmware tells "link to accent"
      // apart from an actual user override.
      await store.client.setBranding({
        name:       name.trim().slice(0, snap.max_name),
        accent_hex: color,
        gear_hex:   gearColor,
        meter_hex:  meterColor,
        name_hex:   nameColor,
        fg_hex:     fgColor,
        muted_hex:  mutedColor,
        warn_hex:   warnColor
      });
      snap = await store.client.branding();
      saved = true;
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'save failed';
    } finally {
      saving = false;
    }
  }

  async function reset() {
    if (!store.client || !snap) return;
    if (!confirm('Reset device name and all colours to factory defaults?')) return;
    try {
      await store.client.resetBranding();
      snap = await store.client.branding();
      name = snap.name; color = snap.accent_hex;
      gearColor   = snap.gear_hex;
      meterColor  = snap.meter_hex;
      nameColor   = snap.name_hex;
      fgColor     = snap.fg_hex;
      mutedColor  = snap.muted_hex;
      warnColor   = snap.warn_hex;
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'reset failed';
    }
  }

  async function onPickScreensaver(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    ssErr = null;
    ssBytes = null;
    ssEncodeMsg = null;
    ssFile = f ?? null;
    if (!f || !snap) return;

    // iCloud-only photo path: iOS hands the input a placeholder File
    // that's 0 bytes when it can't reach iCloud to fetch the original.
    // Detect this so the user gets a clear hint instead of a cryptic
    // decoder error 30 seconds later. (The AXIS Wi-Fi is intentionally
    // internet-less, so this happens a lot during SETUP.)
    if (f.size === 0) {
      ssErr =
        'Photo not available offline.\n' +
        'It looks like this picture is stored in iCloud — your phone ' +
        'needs to download it before AXIS can read it. Either pick ' +
        'a photo with no iCloud ⬇ arrow, or temporarily switch to ' +
        'your home Wi-Fi to let iOS download it first.';
      return;
    }

    try {
      await tick();   // ensure ssPreviewCanvas is mounted
      const isVideo = f.type.startsWith('video/');
      const isGif   = f.type === 'image/gif' ||
                      /\.gif$/i.test(f.name);
      if (isGif) {
        ssEncodeMsg = 'Decoding GIF…';
        ssBytes = await encodeGif(f, (_frac, msg) => { ssEncodeMsg = msg; });
      } else if (isVideo) {
        ssEncodeMsg = 'Extracting frames…';
        ssBytes = await encodeVideo(f, {
          frames: SS_FRAMES,
          fps:    SS_FPS,
          onProgress: (_frac, msg) => { ssEncodeMsg = msg; }
        });
      } else {
        ssEncodeMsg = 'Quantising colours…';
        ssBytes = await encodeImage(f);
      }
      // Render the first frame into the preview canvas so the user sees
      // exactly what the device will show (post-quantization, post-crop).
      await renderPreview();
      ssEncodeMsg = isGif
        ? `${(ssBytes.length / 1024).toFixed(0)} KB · animated GIF (seamless loop)`
        : isVideo
          ? `${(ssBytes.length / 1024).toFixed(0)} KB · ${SS_FRAMES} frames @ ${SS_FPS} fps`
          : `${(ssBytes.length / 1024).toFixed(0)} KB · still image · full 16-bit colour`;
    } catch (e: any) {
      // Most decoder failures on iOS while offline trace back to the
      // same root cause — the File object exists but its bytes never
      // arrived from iCloud. Surface the same hint as the 0-byte path
      // so the user knows what to try.
      const msg = e?.message ?? 'conversion failed';
      ssErr = /decode|read|fetch/i.test(msg)
        ? msg + '\n\nIf this photo has an iCloud ⬇ arrow, your phone ' +
          'needs internet to download it before AXIS can read it.'
        : msg;
      ssBytes = null;
      ssEncodeMsg = null;
    }
  }

  // Total frames in the currently-staged AXSV payload (0 for a still
  // image). Used to gate the frame-scrubber UI in the preview card.
  let ssTotalFrames = $derived.by(() => {
    if (!ssBytes || !snap) return 0;
    const W = snap.screensaver_w, H = snap.screensaver_h;
    if (ssBytes.length === W * H * 2) return 0;     // raw single still
    const dv = new DataView(ssBytes.buffer, ssBytes.byteOffset);
    return dv.getUint16(10, true);
  });

  // Render one frame of the encoded screensaver to the preview canvas.
  // Supports two on-the-wire formats: legacy raw RGB565 (~115 KB, used
  // for single still images, exact byte count = W*H*2) and AXSV (header
  // + indexed palette + 4-bit frames, used for animations).
  // When called with no `frame` argument, uses ssPreviewFrame.
  async function renderPreview(frame: number = ssPreviewFrame) {
    if (!ssBytes || !ssPreviewCanvas || !snap) return;
    const W = snap.screensaver_w, H = snap.screensaver_h;
    ssPreviewCanvas.width = W; ssPreviewCanvas.height = H;
    const ctx = ssPreviewCanvas.getContext('2d')!;
    const img = ctx.createImageData(W, H);

    // ---- Raw RGB565 path (full-colour static image) ------------------
    if (ssBytes.length === W * H * 2) {
      for (let i = 0, p = 0; i < ssBytes.length; i += 2, p += 4) {
        const px = ssBytes[i] | (ssBytes[i + 1] << 8);   // little-endian
        const r = ((px >> 11) & 0x1F) << 3;
        const g = ((px >>  5) & 0x3F) << 2;
        const b = ( px        & 0x1F) << 3;
        img.data[p    ] = r | (r >> 5);
        img.data[p + 1] = g | (g >> 6);
        img.data[p + 2] = b | (b >> 5);
        img.data[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    // ---- AXSV path (multi-frame indexed) -----------------------------
    const dv = new DataView(ssBytes.buffer, ssBytes.byteOffset);
    const totalFrames = dv.getUint16(10, true);
    const fi = Math.max(0, Math.min(totalFrames - 1, frame));
    const palette: [number,number,number][] = [];
    for (let i = 0; i < 16; ++i) {
      const px = dv.getUint16(16 + i * 2, true);
      const r = ((px >> 11) & 0x1F) << 3;
      const g = ((px >>  5) & 0x3F) << 2;
      const b = ( px        & 0x1F) << 3;
      palette.push([r | (r >> 5), g | (g >> 6), b | (b >> 5)]);
    }
    const frameBytes = (W * H) / 2;
    const frameN     = ssBytes.subarray(48 + fi * frameBytes,
                                        48 + (fi + 1) * frameBytes);
    for (let i = 0, p = 0; i < frameN.length; ++i) {
      const hi = (frameN[i] >> 4) & 0x0F;
      const lo =  frameN[i]       & 0x0F;
      img.data[p++] = palette[hi][0]; img.data[p++] = palette[hi][1];
      img.data[p++] = palette[hi][2]; img.data[p++] = 255;
      img.data[p++] = palette[lo][0]; img.data[p++] = palette[lo][1];
      img.data[p++] = palette[lo][2]; img.data[p++] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  // React to slider changes: rerender preview when the user scrubs.
  function onScrubPreview(ev: Event) {
    ssPreviewFrame = +((ev.currentTarget as HTMLInputElement).value);
    void renderPreview(ssPreviewFrame);
  }

  async function uploadScreensaver() {
    if (!ssBytes || !store.client) return;
    ssBusy = true;
    ssErr = null;
    ssProgress = 0;
    try {
      await store.client.uploadScreensaver(ssBytes, p => { ssProgress = p; });
      snap = await store.client.branding();
      ssFile = null; ssBytes = null;
    } catch (e: any) {
      ssErr = e?.message ?? 'upload failed';
    } finally {
      ssBusy = false;
    }
  }

  // ---- "Save as GIF" — converts the video upload into a downloadable
  // .gif file using the same frames + loop-blend that the AXSV encoder
  // used. Lets the user keep a polished copy of the animation for use
  // outside the device. Lazy-imports gifenc so the encoder code only
  // enters the bundle when the user actually asks for it.
  async function saveAsGif() {
    if (!ssFile) return;
    const isGif = ssFile.type === 'image/gif' || /\.gif$/i.test(ssFile.name);
    const isVid = ssFile.type.startsWith('video/');
    if (isGif) {
      // Already a GIF — just give the user the original back.
      triggerDownload(ssFile, ssFile.name);
      return;
    }
    if (!isVid) {
      ssErr = 'Save as GIF only works for video sources.';
      return;
    }
    ssBusy = true;
    ssErr = null;
    try {
      ssEncodeMsg = 'Encoding GIF…';
      const blob = await videoToGifBlob(ssFile, SS_FRAMES, SS_FPS,
                                        (_f, m) => { ssEncodeMsg = m; });
      const stem = ssFile.name.replace(/\.[^.]+$/, '') || 'screensaver';
      triggerDownload(blob, `${stem}.gif`);
      ssEncodeMsg = `${(blob.size / 1024).toFixed(0)} KB · downloaded`;
    } catch (e: any) {
      ssErr = e?.message ?? 'GIF export failed';
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
    // Give the browser a moment to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function clearScreensaver() {
    if (!store.client || !snap?.screensaver) return;
    if (!confirm('Remove the custom screensaver?')) return;
    try {
      await store.client.clearScreensaver();
      snap = await store.client.branding();
    } catch (e: any) {
      ssErr = e?.message ?? 'clear failed';
    }
  }
</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>BRAND</h1>
</header>

{#if err}<div class="card err">{err}</div>{/if}

{#if !snap}
  <div class="card muted">Loading…</div>
{:else}
  <!-- Live preview chip — shows what the device will use -->
  <div class="card preview" style="--preview: {color}">
    <div class="chip" style="background: {color}"></div>
    <div class="preview-text">
      <div class="ptitle" style="color: {color}">{name || 'AXIS'}</div>
      <div class="psub">v{store.info?.version ?? '?'}</div>
    </div>
  </div>

  <div class="card">
    <label for="name">Device name</label>
    <input
      id="name" type="text"
      bind:value={name}
      maxlength={snap.max_name}
      placeholder="AXIS"
      autocomplete="off" spellcheck="false"
    />
    <p class="hint">Shown on the INFO screen. Max {snap.max_name} chars.</p>
  </div>

  <div class="card">
    <label for="color">Accent colour</label>
    <div class="color-row">
      <input id="color" type="color" bind:value={color} />
      <span class="mono hex">{color.toUpperCase()}</span>
    </div>
    <p class="hint">Default for every UI element. Customise per slot below.</p>
  </div>

  <!-- Per-element colour slots — fully independent (v1.2.2+). Every
       text/graphic role has its own picker; changing Accent above does
       not cascade to these. -->
  <div class="card slot-card">
    <label>Per-element colours</label>
    <p class="hint">Each text style is its own colour — picks below override the static defaults completely.</p>

    {#each [
      { key: 'gear',  label: 'Gear digit',    get: () => gearColor,  set: (v: string) => gearColor  = v },
      { key: 'meter', label: 'G-meter grid',  get: () => meterColor, set: (v: string) => meterColor = v },
      { key: 'name',  label: 'Name footer',   get: () => nameColor,  set: (v: string) => nameColor  = v },
      { key: 'fg',    label: 'Titles + body', get: () => fgColor,    set: (v: string) => fgColor    = v },
      { key: 'muted', label: 'Hints / muted', get: () => mutedColor, set: (v: string) => mutedColor = v },
      { key: 'warn',  label: 'Warnings',      get: () => warnColor,  set: (v: string) => warnColor  = v }
    ] as slot}
      <div class="slot-row">
        <span class="slot-label">{slot.label}</span>
        <input
          type="color"
          value={slot.get()}
          on:input={(ev) => slot.set((ev.currentTarget as HTMLInputElement).value)}
        />
        <span class="mono small">{slot.get().toUpperCase()}</span>
      </div>
    {/each}
  </div>

  <div class="actions">
    <button on:click={reset}>RESET</button>
    <button class="primary" class:hot={dirty} disabled={!dirty || saving} on:click={save}>
      {saving ? 'SAVING…' : saved && !dirty ? 'SAVED' : 'APPLY'}
    </button>
  </div>

  <!-- ---- Screensaver section ---------------------------------------- -->
  <div class="card">
    <label>Screensaver image</label>
    <p class="hint">
      Shown when the device is idle. Any image — it'll be cropped to fill
      a 240×240 round screen. Stored on the device's filesystem.
    </p>
    <p class="hint warn-hint">
      💡 Photos with an iCloud ⬇ arrow can't be read while you're on the
      SETUP Wi-Fi (no internet). Pick a photo that's fully downloaded to
      your phone.
    </p>

    <div class="ss-row">
      <canvas
        bind:this={ssPreviewCanvas}
        width={snap.screensaver_w}
        height={snap.screensaver_h}
        class="ss-preview"
        class:ss-empty={!ssBytes && !snap.screensaver}
      ></canvas>
      <div class="ss-info">
        {#if ssBytes}
          <strong>Ready to upload</strong>
          <p class="muted mono small">{ssEncodeMsg ?? `${(ssBytes.length / 1024).toFixed(1)} KB`}</p>
        {:else if snap.screensaver}
          <strong>
            {snap.screensaver_animated
              ? `Animation · ${snap.screensaver_frames} frames @ ${snap.screensaver_fps} fps`
              : 'Custom image installed'}
          </strong>
          <p class="muted small">Tap below to replace or clear.</p>
        {:else}
          <strong>Using AXIS logo</strong>
          <p class="muted small">Pick an image or short video.</p>
        {/if}
      </div>
    </div>

    <!-- Frame scrubber: only shown when the staged payload is animated.
         Lets the user preview each quantised frame before committing. -->
    {#if ssBytes && ssTotalFrames > 1}
      <div class="ss-scrub">
        <input
          type="range"
          min="0"
          max={ssTotalFrames - 1}
          step="1"
          value={ssPreviewFrame}
          on:input={onScrubPreview}
          disabled={ssBusy}
        />
        <span class="mono small">{ssPreviewFrame + 1} / {ssTotalFrames}</span>
      </div>
    {/if}

    <!--
      v1.9: removed manual Frames/FPS sliders. The encoder fixes both
      to 24 frames @ 8 fps which produces a 3-second loop that fits in
      the device's PSRAM budget alongside the dual crossfade buffers.
    -->

    <label class="file">
      <input type="file" accept="image/*,video/*" on:change={onPickScreensaver} disabled={ssBusy} />
      <span>{ssFile ? ssFile.name : 'Choose image or video'}</span>
    </label>

    {#if ssErr}<p class="err multiline">{ssErr}</p>{/if}

    {#if ssBusy || ssProgress > 0}
      <div class="bar-bg">
        <div class="bar-fill" style="width: {(ssProgress * 100).toFixed(1)}%"></div>
      </div>
      <p class="muted small mono">{(ssProgress * 100).toFixed(0)}%</p>
    {/if}

    <div class="actions">
      <button on:click={clearScreensaver} disabled={!snap.screensaver || ssBusy}>CLEAR</button>
      <!--
        Save as GIF: video uploads only. Lets the user keep a polished
        copy of the processed animation (with the v1.9.3 loop-blend
        applied) outside the device. Disabled for stills and when the
        encoder hasn't produced a result yet.
      -->
      {#if ssFile && (ssFile.type.startsWith('video/') || /\.gif$/i.test(ssFile.name))}
        <button disabled={!ssBytes || ssBusy} on:click={saveAsGif}>SAVE GIF</button>
      {/if}
      <button class="primary" disabled={!ssBytes || ssBusy} on:click={uploadScreensaver}>
        {ssBusy ? 'UPLOADING…' : 'UPLOAD'}
      </button>
    </div>
  </div>

  <!-- ---- Home Wi-Fi (for device-side OTA) -------------------------- -->
  <div class="card">
    <label>Home Wi-Fi</label>
    <p class="hint">
      Let the device join your home Wi-Fi so it can pull firmware updates
      from the internet itself. This is the most reliable way to OTA on
      iOS — your phone doesn't have to be the bridge.
    </p>

    <div class="wifi-status">
      {#if !wifi}
        <span class="dot offline"></span> Checking…
      {:else if wifi.connected}
        <span class="dot online"></span>
        <span class="mono">Connected · {wifi.ip}</span>
        <span class="muted small">RSSI {wifi.rssi} dBm</span>
      {:else if wifi.configured}
        <span class="dot error"></span> Saved but not connected (wrong pwd? out of range?)
      {:else}
        <span class="dot offline"></span> Not configured
      {/if}
    </div>

    <label for="wifi-ssid">SSID</label>
    <input
      id="wifi-ssid" type="text"
      bind:value={wifiSsid}
      placeholder="MyHomeWiFi"
      autocomplete="off" autocapitalize="off" spellcheck="false"
    />

    <label for="wifi-pass">Password</label>
    <input
      id="wifi-pass" type="password"
      bind:value={wifiPass}
      placeholder={wifi?.configured ? '(unchanged — type to replace)' : ''}
      autocomplete="off" autocapitalize="off" spellcheck="false"
    />

    {#if wifiErr}<p class="err">{wifiErr}</p>{/if}

    <button class="primary wifi-save" disabled={wifiSaving || !wifiSsid.trim()} on:click={saveWifi}>
      {wifiSaving ? 'SAVING…' : 'CONNECT'}
    </button>
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }
  .err  { color: var(--danger); }
  .muted { color: var(--muted); text-align: center; }
  label  { margin: 0; }
  .hint  { color: var(--muted); font-size: 12px; margin: var(--s-1) 0 0; }

  .preview {
    display: flex; align-items: center; gap: var(--s-3);
    padding: var(--s-4);
    border-color: var(--preview);
  }
  .chip {
    width: 56px; height: 56px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 14px var(--preview);
  }
  .preview-text { display: flex; flex-direction: column; gap: var(--s-1); }
  .ptitle { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
  .psub   { color: var(--muted); font-size: 13px; font-family: var(--font-mono); }

  .color-row { display: flex; align-items: center; gap: var(--s-3); margin-top: var(--s-2); }
  input[type="color"] {
    width: 64px; height: 44px;
    border: 1px solid var(--border);
    border-radius: var(--r-1);
    padding: 2px;
    background: var(--surface-2);
    cursor: pointer;
  }
  .hex { color: var(--muted); }

  .actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  .hot { box-shadow: 0 0 0 2px var(--accent); }

  /* ---- Screensaver section --------------------------------- */
  .ss-row {
    display: flex; align-items: center; gap: var(--s-3);
    margin: var(--s-3) 0;
  }
  .ss-preview {
    width: 120px; height: 120px;
    border-radius: 50%;       /* round to match device LCD shape */
    border: 1px solid var(--border);
    background: #000;
    image-rendering: pixelated;
  }
  .ss-preview.ss-empty { opacity: 0.4; }
  .ss-info { flex: 1; }
  .ss-info strong { display: block; }

  .ss-anim {
    background: var(--surface-2);
    border-radius: var(--r-1);
    padding: var(--s-3);
    margin: var(--s-3) 0 var(--s-2);
  }
  .ss-anim-row {
    display: grid;
    grid-template-columns: 60px 1fr 36px;
    align-items: center;
    gap: var(--s-2);
    margin-bottom: var(--s-1);
  }
  .ss-anim-row label { margin: 0; }
  .ss-anim-row input[type="range"] { accent-color: var(--accent); }

  .file {
    display: block;
    background: var(--surface-2);
    border: 1px dashed var(--border);
    border-radius: var(--r-1);
    padding: var(--s-3);
    text-align: center;
    cursor: pointer;
    margin: var(--s-3) 0 var(--s-2);
  }
  .file input { display: none; }

  .bar-bg {
    height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden;
    margin: var(--s-2) 0 var(--s-1);
  }
  .bar-fill { height: 100%; background: var(--accent); transition: width 120ms linear; }

  .small { font-size: 13px; }
  .muted { color: var(--muted); }
  .err   { color: var(--danger); margin: var(--s-2) 0 0; font-size: 13px; }
  .err.multiline { white-space: pre-line; line-height: 1.45; }
  .warn-hint {
    color: var(--accent);
    background: rgba(255, 165, 0, 0.08);
    border-radius: var(--r-1);
    padding: var(--s-2) var(--s-3);
    margin-top: var(--s-2);
  }

  .wifi-status {
    display: flex; align-items: center; gap: var(--s-2);
    margin: var(--s-3) 0;
    font-size: 14px;
  }
  .wifi-save  { width: 100%; margin-top: var(--s-3); }
  .hint       { color: var(--muted); font-size: 12px; line-height: 1.5; margin: var(--s-1) 0 0; }

  /* Per-element colour slot card — one picker per row, no toggles. */
  .slot-card { padding-top: var(--s-3); }
  .slot-row {
    display: grid;
    grid-template-columns: 1fr 36px 80px;
    align-items: center;
    gap: var(--s-3);
    margin-top: var(--s-2);
  }
  .slot-label { font-size: 14px; }
  .slot-row input[type="color"] { padding: 0; height: 32px; width: 36px; }

  /* Frame scrubber under animated-screensaver preview */
  .ss-scrub {
    display: grid;
    grid-template-columns: 1fr 64px;
    align-items: center;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  .ss-scrub input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
