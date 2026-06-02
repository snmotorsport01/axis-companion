<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { BrandingSnapshot, ConfigSnapshot, WifiStatus, TelemetryFrame } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import DevicePreview from '../lib/DevicePreview.svelte';
  import PageHeader from '../lib/PageHeader.svelte';

  // ---- Live telemetry → DevicePreview ---------------------------------
  // Subscribe to /api/stream so the preview mirrors the real device's
  // gear + tilt in real time. Lets the user see exactly what their
  // colour edits look like with the gear that's currently engaged,
  // instead of a synthesised 1→2→3 cycle. Demo / disconnected paths
  // get null → preview falls back to the cycle automatically.
  let liveFrame = $state<TelemetryFrame | null>(null);
  let liveSock: WebSocket | null = null;
  onMount(() => {
    if (!store.client) return;
    liveSock = store.client.openTelemetry(
      (f) => { liveFrame = f; },
      ()  => { liveFrame = null; }
    );
  });
  onDestroy(() => {
    try { liveSock?.close(); } catch {}
    liveSock = null;
  });

  // ============================================================
  //  "Animation & feel" — three tunables that used to live on the
  //  Tune page but really belong here because they're about how the
  //  device LOOKS, not how it behaves under the hood. Keys handled:
  //
  //    gearDwellMs       — slider, how long a new gear must hold
  //                        before committing (min 120 enforced by
  //                        firmware schema as of v2.5.11)
  //    gearAnimStyle     — enum, gear-digit animation when shifting
  //    transitionStyle   — enum, page transition style
  //
  //  Tune.svelte filters these three keys out of its render so we
  //  don't show the same control in two places.
  // ============================================================
  const FEEL_KEYS = [
    'gearDwellMs', 'gearAnimStyle', 'transitionStyle', 'patternChaseMs',
    'ssWakeOnMotion'
  ] as const;
  type FeelKey = typeof FEEL_KEYS[number];
  const FEEL_LABEL: Record<FeelKey, string> = {
    gearDwellMs:     'Gear shift delay',
    gearAnimStyle:   'Gear letter effect',
    transitionStyle: 'Screen change effect',
    patternChaseMs:  'Pattern effect speed',
    ssWakeOnMotion:  'Wake screensaver on motion'
  };
  const FEEL_HELP: Record<FeelKey, string> = {
    gearDwellMs:     'How long the new position must stay still before locking in. Lower = faster reaction. Below ~80 ms is unreliable — small jitters slip through and the gear bounces back and forth.',
    gearAnimStyle:   'How the big gear letter appears when you shift on the main screen.',
    transitionStyle: 'How pages animate when switching from one to another.',
    patternChaseMs:  'How fast the glowing light runs through the gears on the H-pattern screen.',
    ssWakeOnMotion:  'When the logo screensaver is on, a firm wiggle of the knob exits it back to the last gear screen. Off by default — road vibration on rough roads can occasionally cross the wake threshold.'
  };

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

  // Tunables snapshot — holds the 3 feel keys (and any other entries
  // we don't surface here; they round-trip untouched on save).
  let feel = $state<ConfigSnapshot | null>(null);
  let feelToast = $state<string | null>(null);

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
    try {
      const raw = await store.client.config();
      // Same enum-name re-attach trick Tune.svelte uses so dropdowns
      // can render human labels rather than raw integers.
      if ((raw as any).__transitionNames && raw.transitionStyle) {
        raw.transitionStyle = { ...raw.transitionStyle, names: (raw as any).__transitionNames };
      }
      if ((raw as any).__gearAnimNames && raw.gearAnimStyle) {
        raw.gearAnimStyle = { ...raw.gearAnimStyle, names: (raw as any).__gearAnimNames };
      }
      feel = raw;
    } catch {/* tunables optional on this page */}
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

  // Live-apply + auto-save a feel-tunable change. Debounced so a slider
  // drag doesn't hammer the device; saveConfig writes to NVS after the
  // last patch lands. Toast "saved" briefly for feedback.
  let feelTimer: number | undefined;
  function patchFeel(key: FeelKey, value: number) {
    if (!feel) return;
    feel[key].v = value;
    clearTimeout(feelTimer);
    feelTimer = window.setTimeout(async () => {
      if (!store.client) return;
      try {
        await store.client.patchConfig({ [key]: value });
        await store.client.saveConfig();
        feelToast = 'saved';
        setTimeout(() => { if (feelToast === 'saved') feelToast = null; }, 1500);
      } catch (e: any) {
        feelToast = e?.message ?? 'save failed';
      }
    }, 120);
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

<PageHeader />

{#if err}<div class="card err">{err}</div>{/if}

{#if !snap}
  <div class="card muted">Loading…</div>
{:else}
  <!-- Live preview — round LCD mockup that re-renders every time the
       user changes a colour or the device name. Tab strip switches
       between MAIN / PATTERN / G-METER / INFO so every slot can be
       judged in the screen where it actually shows up. -->
  <div class="card preview-card">
    <p class="preview-label">
      PREVIEW · {liveFrame ? 'live from device' : 'demo cycle'} · not yet saved
    </p>
    <DevicePreview
      name={name}
      accent={color}
      gearColor={gearColor}
      meterColor={meterColor}
      nameColor={nameColor}
      fgColor={fgColor}
      mutedColor={mutedColor}
      warnColor={warnColor}
      transitionStyle={feel?.transitionStyle?.v ?? 0}
      gearAnimStyle={feel?.gearAnimStyle?.v ?? 0}
      patternChaseMs={Number(feel?.patternChaseMs?.v ?? 220)}
      liveGearLabel={liveFrame?.label ?? null}
      liveRoll={liveFrame?.roll ?? null}
      livePitch={liveFrame?.pitch ?? null}
    />
  </div>

  <!-- Animation & feel — three tunables moved from the TUNE tab so
       they live alongside the colour/identity controls they shape.
       Each one auto-saves (debounced patchConfig + saveConfig) so the
       device picks the change up immediately, no APPLY needed. -->
  {#if feel && (feel.gearDwellMs || feel.gearAnimStyle || feel.transitionStyle)}
    <div class="card">
      <div class="row">
        <h3 class="feel-title">Animation &amp; feel</h3>
        {#if feelToast}
          <span class="feel-toast" class:err={feelToast !== 'saved'}>{feelToast}</span>
        {/if}
      </div>

      {#each FEEL_KEYS as key (key)}
        {#if feel[key]}
          {@const e = feel[key]}
          <div class="feel-block">
            <div class="row">
              <label for={'feel-' + key}>{FEEL_LABEL[key]}</label>
              <span class="mono v">
                {e.unit === 'enum' && e.names ? (e.names[e.v] ?? e.v) : (e.v + (e.unit === 'ms' ? ' ms' : ''))}
              </span>
            </div>
            <p class="hint">{FEEL_HELP[key]}</p>
            {#if e.unit === 'enum' && e.names}
              <select
                id={'feel-' + key}
                value={e.v}
                on:change={(ev) => patchFeel(key, +(ev.currentTarget as HTMLSelectElement).value)}
              >
                {#each e.names as opt, i}
                  <option value={i}>{opt}</option>
                {/each}
              </select>
            {:else}
              <input
                id={'feel-' + key}
                type="range"
                min={e.min}
                max={e.max}
                step={e.unit === 'ms' ? 10 : 1}
                value={e.v}
                on:input={(ev) => patchFeel(key, +ev.currentTarget.value)}
              />
              <div class="range-meta mono">
                <span>{e.min}{e.unit === 'ms' ? ' ms' : ''}</span>
                <span class="default">def {e.def}{e.unit === 'ms' ? ' ms' : ''}</span>
                <span>{e.max}{e.unit === 'ms' ? ' ms' : ''}</span>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

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

  /* Animation & feel — three Tune keys hoisted onto this page. */
  .feel-title { margin: 0; flex: 1; }
  .row        { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-2); }
  .v          { color: var(--accent); font-size: 16px; font-weight: 700; }
  .feel-block { margin-top: var(--s-4); }
  .feel-block:first-of-type { margin-top: var(--s-3); }
  .feel-toast {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--success);
  }
  .feel-toast.err { color: var(--danger); }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
    margin: var(--s-2) 0 var(--s-1);
  }
  .range-meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
  .default    { color: var(--border); }
  select {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--fg);
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-1);
    font-size: 14px;
    margin: var(--s-2) 0;
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
