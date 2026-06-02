<script lang="ts">
  import { onMount } from 'svelte';
  import type { BrandingSnapshot, WifiStatus } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import DevicePreview from '../lib/DevicePreview.svelte';

  // v2.0: screensaver upload moved to its own page — see Screensaver.svelte.

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

</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>CUSTOM</h1>
</header>

{#if err}<div class="card err">{err}</div>{/if}

{#if !snap}
  <div class="card muted">Loading…</div>
{:else}
  <!-- Live preview — round LCD mockup that re-renders every time the
       user changes a colour or the device name. Tab strip switches
       between MAIN / PATTERN / G-METER / INFO so every slot can be
       judged in the screen where it actually shows up. -->
  <div class="card preview-card">
    <p class="preview-label">PREVIEW · live · not yet saved</p>
    <DevicePreview
      name={name}
      accent={color}
      gearColor={gearColor}
      meterColor={meterColor}
      nameColor={nameColor}
      fgColor={fgColor}
      mutedColor={mutedColor}
      warnColor={warnColor}
    />
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

  <!-- v2.0: screensaver upload moved to its own page. Brand stays focused
       on identity (colours + device name). -->
  <div class="card">
    <label>Screensaver</label>
    <p class="hint">
      {#if snap.screensaver_animated}
        Animation · {snap.screensaver_frames} frames @ {snap.screensaver_fps} fps installed.
      {:else if snap.screensaver}
        Custom still image installed.
      {:else}
        Using the AXIS logo.
      {/if}
    </p>
    <div class="actions">
      <button class="primary" on:click={() => store.page = 'screensaver'}>
        OPEN SCREENSAVER →
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

  .preview-card {
    padding: var(--s-4);
  }
  .preview-label {
    margin: 0 0 var(--s-3);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-align: center;
  }

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
