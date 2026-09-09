<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { BrandingSnapshot, ConfigSnapshot, WifiStatus, TelemetryFrame } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import DevicePreview from '../lib/DevicePreview.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import { t } from '../lib/i18n';

  // ---- Live telemetry → DevicePreview ---------------------------------
  // Subscribe to /api/stream so the preview mirrors the real device's
  // gear + tilt in real time. Lets the user see exactly what their
  // colour edits look like with the gear that's currently engaged,
  // instead of a synthesised 1→2→3 cycle. Demo / disconnected paths
  // get null → preview falls back to the cycle automatically.
  let liveFrame = $state<TelemetryFrame | null>(null);
  let liveSock: WebSocket | null = null;
  // Preview mode toggle. Default is DEMO so the preview always animates
  // regardless of pair / telemetry status — useful for picking colours
  // before / without a paired device. Flip to LIVE to mirror what the
  // physical knob is doing right now. Persisted in-memory only.
  let previewMode = $state<'demo' | 'live'>('demo');
  let presenting  = $state(false);   // full-screen preview for clean screen recording
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
    // v2.5.41 — wifiPoll and feelTimer were leaking. The async onMount
    // below tried to return a cleanup function for wifiPoll, but
    // Svelte's onMount doesn't await async returns — the cleanup was
    // a Promise<() => void> the runtime ignored. Move both to here
    // so navigation away actually stops the timers.
    if (wifiPoll) { window.clearInterval(wifiPoll); wifiPoll = undefined; }
    if (feelTimer) { window.clearTimeout(feelTimer); feelTimer = undefined; }
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
  // Maps to i18n keys (not literal text) so labels/help re-render on language
  // change — t() is resolved in the template, keeping it reactive.
  const FEEL_LABEL: Record<FeelKey, string> = {
    gearDwellMs:     'brand.feel_gearDwell_label',
    gearAnimStyle:   'brand.feel_gearAnim_label',
    transitionStyle: 'brand.feel_transition_label',
    patternChaseMs:  'brand.feel_pattern_label',
    ssWakeOnMotion:  'brand.feel_ssWake_label'
  };
  const FEEL_HELP: Record<FeelKey, string> = {
    gearDwellMs:     'brand.feel_gearDwell_help',
    gearAnimStyle:   'brand.feel_gearAnim_help',
    transitionStyle: 'brand.feel_transition_help',
    patternChaseMs:  'brand.feel_pattern_help',
    ssWakeOnMotion:  'brand.feel_ssWake_help'
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
      err = e?.message ?? t('brand.err_load');
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
    // associate after they save creds. Cleanup happens in onDestroy
    // above — the return-from-async-onMount cleanup path Svelte uses
    // for sync callbacks doesn't apply here (Svelte ignores the
    // Promise<() => void> shape).
    wifiPoll = window.setInterval(reloadWifi, 3000);
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
      wifiErr = e?.message ?? t('brand.err_save');
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
      err = e?.message ?? t('brand.err_save');
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
        feelToast = e?.message ?? t('brand.err_save');
      }
    }, 120);
  }

  async function reset() {
    if (!store.client || !snap) return;
    if (!confirm(t('brand.reset_confirm'))) return;
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
      err = e?.message ?? t('brand.err_reset');
    }
  }

</script>

<PageHeader title={t('brand.title')} back="pro" backLabel={t('brand.back_pro')} />

{#if err}<div class="card err">{err}</div>{/if}

{#if !store.client}
  <div class="card">
    <p class="muted small">{t('brand.connect_first')}</p>
    <button class="ghost wide" on:click={() => (store.page = 'connect')}>{t('brand.go_connect')}</button>
  </div>
{:else if !snap}
  <div class="card muted">{t('brand.loading')}</div>
{:else}
  <!-- Live preview — round LCD mockup that re-renders every time the
       user changes a colour or the device name. Tab strip switches
       between MAIN / PATTERN / G-METER / INFO so every slot can be
       judged in the screen where it actually shows up. -->
  <div class="card preview-card">
    <div class="preview-head">
      <p class="preview-label">
        {t('brand.preview_label', {
          mode: previewMode === 'live' && liveFrame
            ? t('brand.preview_live')
            : t('brand.preview_demo')
        })}
      </p>
      <!-- Two-state toggle. DEMO is default and always animates so the
           colour pickers stay useful without a paired device. LIVE
           mirrors the real knob, only meaningful when actually paired
           AND the device is on v2.5.39+ (so gm_x/gm_y stream). -->
      <div class="preview-toggle" role="tablist">
        <button
          type="button" role="tab"
          class:active={previewMode === 'demo'}
          on:click={() => (previewMode = 'demo')}
        >{t('brand.demo')}</button>
        <button
          type="button" role="tab"
          class:active={previewMode === 'live'}
          on:click={() => (previewMode = 'live')}
        >{t('brand.live')}</button>
      </div>
    </div>
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
      liveGearLabel={previewMode === 'live' ? (liveFrame?.label ?? null) : null}
      liveRoll={previewMode === 'live' ? (liveFrame?.roll ?? null) : null}
      livePitch={previewMode === 'live' ? (liveFrame?.pitch ?? null) : null}
      liveGmX={previewMode === 'live' ? (liveFrame?.gm_x ?? null) : null}
      liveGmY={previewMode === 'live' ? (liveFrame?.gm_y ?? null) : null}
    />
    <button class="present-btn" on:click={() => (presenting = true)}>{t('brand.present')}</button>
  </div>

  {#if presenting}
    <!-- Full-screen, chrome-free preview for clean iOS screen recording. -->
    <div class="present-overlay">
      <DevicePreview
        big
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
        liveGearLabel={previewMode === 'live' ? (liveFrame?.label ?? null) : null}
        liveRoll={previewMode === 'live' ? (liveFrame?.roll ?? null) : null}
        livePitch={previewMode === 'live' ? (liveFrame?.pitch ?? null) : null}
        liveGmX={previewMode === 'live' ? (liveFrame?.gm_x ?? null) : null}
        liveGmY={previewMode === 'live' ? (liveFrame?.gm_y ?? null) : null}
      />
      <button class="present-close" on:click={() => (presenting = false)}>{t('brand.close')}</button>
    </div>
  {/if}

  <!-- Animation & feel — three tunables moved from the TUNE tab so
       they live alongside the colour/identity controls they shape.
       Each one auto-saves (debounced patchConfig + saveConfig) so the
       device picks the change up immediately, no APPLY needed. -->
  {#if feel && (feel.gearDwellMs || feel.gearAnimStyle || feel.transitionStyle)}
    <div class="card">
      <div class="row">
        <h3 class="feel-title">{t('brand.feel_title')}</h3>
        {#if feelToast}
          <span class="feel-toast" class:err={feelToast !== 'saved'}>{feelToast === 'saved' ? t('brand.saved') : feelToast}</span>
        {/if}
      </div>

      {#each FEEL_KEYS as key (key)}
        {#if feel[key]}
          {@const e = feel[key]}
          <div class="feel-block">
            <div class="row">
              <label for={'feel-' + key}>{t(FEEL_LABEL[key])}</label>
              <span class="mono v">
                {e.unit === 'enum' && e.names ? (e.names[e.v] ?? e.v) : (e.v + (e.unit === 'ms' ? ' ms' : ''))}
              </span>
            </div>
            <p class="hint">{t(FEEL_HELP[key])}</p>
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
                <span class="default">{t('brand.def')} {e.def}{e.unit === 'ms' ? ' ms' : ''}</span>
                <span>{e.max}{e.unit === 'ms' ? ' ms' : ''}</span>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <div class="card">
    <label for="name">{t('brand.device_name')}</label>
    <input
      id="name" type="text"
      bind:value={name}
      maxlength={snap.max_name}
      placeholder="AXIS"
      autocomplete="off" spellcheck="false"
    />
    <p class="hint">{t('brand.device_name_hint', { n: snap.max_name })}</p>
  </div>

  <div class="card">
    <label for="color">{t('brand.accent_colour')}</label>
    <div class="color-row">
      <input id="color" type="color" bind:value={color} />
      <span class="mono hex">{color.toUpperCase()}</span>
    </div>
    <p class="hint">{t('brand.accent_hint')}</p>
  </div>

  <!-- Per-element colour slots — fully independent (v1.2.2+). Every
       text/graphic role has its own picker; changing Accent above does
       not cascade to these. -->
  <div class="card slot-card">
    <label>{t('brand.per_element')}</label>
    <p class="hint">{t('brand.per_element_hint')}</p>

    {#each [
      { key: 'gear',  label: 'brand.slot_gear',  get: () => gearColor,  set: (v: string) => gearColor  = v },
      { key: 'meter', label: 'brand.slot_meter', get: () => meterColor, set: (v: string) => meterColor = v },
      { key: 'name',  label: 'brand.slot_name',  get: () => nameColor,  set: (v: string) => nameColor  = v },
      { key: 'fg',    label: 'brand.slot_fg',    get: () => fgColor,    set: (v: string) => fgColor    = v },
      { key: 'muted', label: 'brand.slot_muted', get: () => mutedColor, set: (v: string) => mutedColor = v },
      { key: 'warn',  label: 'brand.slot_warn',  get: () => warnColor,  set: (v: string) => warnColor  = v }
    ] as slot}
      <div class="slot-row">
        <span class="slot-label">{t(slot.label)}</span>
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
    <button on:click={reset}>{t('brand.reset')}</button>
    <button class="primary" class:hot={dirty} disabled={!dirty || saving} on:click={save}>
      {saving ? t('brand.saving') : saved && !dirty ? t('brand.saved_btn') : t('brand.apply')}
    </button>
  </div>

  <!-- v2.0: screensaver upload moved to its own page. Brand stays focused
       on identity (colours + device name). -->
  <div class="card">
    <label>{t('brand.screensaver')}</label>
    <p class="hint">
      {#if snap.screensaver_animated}
        {t('brand.ss_animated', { frames: snap.screensaver_frames, fps: snap.screensaver_fps })}
      {:else if snap.screensaver}
        {t('brand.ss_still')}
      {:else}
        {t('brand.ss_logo')}
      {/if}
    </p>
    <div class="actions">
      <button class="primary" on:click={() => store.page = 'screensaver'}>
        {t('brand.ss_open')}
      </button>
    </div>
  </div>

  <!-- ---- Home Wi-Fi (for device-side OTA) -------------------------- -->
  <div class="card">
    <label>{t('brand.home_wifi')}</label>
    <p class="hint">
      {t('brand.home_wifi_hint')}
    </p>

    <div class="wifi-status">
      {#if !wifi}
        <span class="dot offline"></span> {t('brand.wifi_checking')}
      {:else if wifi.connected}
        <span class="dot online"></span>
        <span class="mono">{t('brand.wifi_connected', { ip: wifi.ip ?? '' })}</span>
        <span class="muted small">{t('brand.wifi_rssi', { rssi: wifi.rssi })}</span>
      {:else if wifi.configured}
        <span class="dot error"></span> {t('brand.wifi_saved_nc')}
      {:else}
        <span class="dot offline"></span> {t('brand.wifi_not_configured')}
      {/if}
    </div>

    <label for="wifi-ssid">{t('brand.wifi_ssid')}</label>
    <input
      id="wifi-ssid" type="text"
      bind:value={wifiSsid}
      placeholder={t('brand.wifi_ssid_ph')}
      autocomplete="off" autocapitalize="off" spellcheck="false"
    />

    <label for="wifi-pass">{t('brand.wifi_password')}</label>
    <input
      id="wifi-pass" type="password"
      bind:value={wifiPass}
      placeholder={wifi?.configured ? t('brand.wifi_pass_ph') : ''}
      autocomplete="off" autocapitalize="off" spellcheck="false"
    />

    {#if wifiErr}<p class="err">{wifiErr}</p>{/if}

    <button class="primary wifi-save" disabled={wifiSaving || !wifiSsid.trim()} on:click={saveWifi}>
      {wifiSaving ? t('brand.saving') : t('brand.wifi_connect')}
    </button>
  </div>
{/if}

<style>
  .err  { color: var(--danger); }
  .muted { color: var(--muted); text-align: center; }
  label  { margin: 0; }
  .hint  { color: var(--muted); font-size: 12px; margin: var(--s-1) 0 0; }

  .preview-card {
    padding: var(--s-4);
  }
  .present-btn {
    display: block; width: 100%; margin-top: var(--s-3);
    background: var(--surface-2); border: 1px solid var(--border); color: var(--accent);
    font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px;
    padding: var(--s-3); border-radius: var(--r-1); cursor: pointer; min-height: var(--tap-min);
  }
  .present-overlay {
    position: fixed; inset: 0; z-index: 200; background: #000;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  }
  .present-close {
    position: fixed; top: calc(env(safe-area-inset-top, 0) + 12px); right: 14px;
    background: rgba(20,22,25,.7); border: 1px solid var(--border); color: var(--fg);
    font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px;
    padding: 8px 12px; border-radius: 999px; cursor: pointer;
  }
  .preview-label {
    margin: 0;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.5px;
  }
  /* DEMO/LIVE pill toggle on the preview header. Mono font + pill
     border to match the rest of the segmented controls on the page. */
  .preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    margin: 0 0 var(--s-3);
  }
  .preview-toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
  }
  .preview-toggle button {
    background: transparent;
    border: none;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.2px;
    padding: 4px 10px;
    min-height: 0;
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease;
  }
  .preview-toggle button.active {
    background: var(--accent);
    color: var(--bg);
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

</style>
