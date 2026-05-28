<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { BrandingSnapshot, WifiStatus } from '../lib/api';
  import { store } from '../lib/store.svelte';

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
  let saving = $state(false);
  let err    = $state<string | null>(null);
  let saved  = $state(false);

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

  // Dirty flag derived from current inputs vs. last snapshot.
  let dirty = $derived(!!snap && (name.trim() !== snap.name || color.toUpperCase() !== snap.accent_hex.toUpperCase()));

  async function save() {
    if (!store.client || !snap) return;
    saving = true;
    err = null;
    saved = false;
    try {
      await store.client.setBranding({
        name:       name.trim().slice(0, snap.max_name),
        accent_hex: color
      });
      // Re-fetch so the badge updates and dirty flag clears.
      snap = await store.client.branding();
      saved = true;
      // Also refresh /api/info so Dashboard shows the new device name.
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'save failed';
    } finally {
      saving = false;
    }
  }

  async function reset() {
    if (!store.client || !snap) return;
    if (!confirm('Reset device name and accent colour to factory defaults?')) return;
    try {
      await store.client.resetBranding();
      snap = await store.client.branding();
      name = snap.name; color = snap.accent_hex;
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'reset failed';
    }
  }

  // ---- Screensaver: convert any image to W×H RGB565 little-endian ----
  async function convertToRgb565(file: File, w: number, h: number): Promise<Uint8Array> {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res(); img.onerror = () => rej(new Error('image decode failed'));
        img.src = url;
      });
      const canvas = ssPreviewCanvas ?? document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      // Cover-fit: scale so the smaller image dimension fills the canvas,
      // then centre. Matches the device's full-bleed render.
      const ratio = Math.max(w / img.width, h / img.height);
      const dw = img.width * ratio, dh = img.height * ratio;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);

      const pixels = ctx.getImageData(0, 0, w, h).data;
      const out = new Uint8Array(w * h * 2);
      for (let i = 0, j = 0; i < pixels.length; i += 4, j += 2) {
        const r = pixels[i]     >> 3;
        const g = pixels[i + 1] >> 2;
        const b = pixels[i + 2] >> 3;
        const px = (r << 11) | (g << 5) | b;
        out[j]     =  px        & 0xFF;       // little-endian
        out[j + 1] = (px >> 8)  & 0xFF;
      }
      return out;
    } finally { URL.revokeObjectURL(url); }
  }

  async function onPickScreensaver(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    ssErr = null;
    ssBytes = null;
    ssFile = f ?? null;
    if (!f || !snap) return;
    try {
      await tick();   // ensure ssPreviewCanvas is mounted
      ssBytes = await convertToRgb565(f, snap.screensaver_w, snap.screensaver_h);
    } catch (e: any) {
      ssErr = e?.message ?? 'image conversion failed';
    }
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
    <p class="hint">Used by every highlighted element across the device UI.</p>
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
          <p class="muted mono small">{(ssBytes.length / 1024).toFixed(1)} KB</p>
        {:else if snap.screensaver}
          <strong>Custom image installed</strong>
          <p class="muted small">Tap below to replace or clear.</p>
        {:else}
          <strong>Using AXIS logo</strong>
          <p class="muted small">Pick an image to override.</p>
        {/if}
      </div>
    </div>

    <label class="file">
      <input type="file" accept="image/*" on:change={onPickScreensaver} disabled={ssBusy} />
      <span>{ssFile ? ssFile.name : 'Choose image (PNG/JPG)'}</span>
    </label>

    {#if ssErr}<p class="err">{ssErr}</p>{/if}

    {#if ssBusy || ssProgress > 0}
      <div class="bar-bg">
        <div class="bar-fill" style="width: {(ssProgress * 100).toFixed(1)}%"></div>
      </div>
      <p class="muted small mono">{(ssProgress * 100).toFixed(0)}%</p>
    {/if}

    <div class="actions">
      <button on:click={clearScreensaver} disabled={!snap.screensaver || ssBusy}>CLEAR</button>
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

  .wifi-status {
    display: flex; align-items: center; gap: var(--s-2);
    margin: var(--s-3) 0;
    font-size: 14px;
  }
  .wifi-save  { width: 100%; margin-top: var(--s-3); }
  .hint       { color: var(--muted); font-size: 12px; line-height: 1.5; margin: var(--s-1) 0 0; }
</style>
