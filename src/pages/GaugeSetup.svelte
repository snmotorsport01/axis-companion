<script lang="ts">
  // =====================================================================
  //  Gauge — configure the AXIS Gauge over its OWN direct BLE link.
  //  Modelled on the knob's Custom page: stacked cards, dirty-gated SAVE
  //  that repaints the connected gauge live.
  //
  //  Cards: Calibration (redline / shift / peak-hold / reset) · Layout
  //  (which channel sits in each slot, per page) · Arc colours (per
  //  channel) · Element colours (global chrome) · Warnings.
  //
  //  Holds its gauge handle in store.gaugeClient (survives navigation +
  //  auto-reconnects), independent of the knob (store.client).
  // =====================================================================
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { MockClient } from '../lib/mockClient';
  import {
    GaugeBleClient, GAUGE_CHANNELS, GAUGE_GLOBAL_SLOTS, GAUGE_PAGES,
    GAUGE_GLOBAL_DEFAULTS, GAUGE_ARC_DEFAULT, GAUGE_SLOTS,
    rgb565ToHex, hexToRgb565,
    type GaugeScanHit, type GaugeConfig
  } from '../lib/gaugeBleClient';
  import PageHeader from '../lib/PageHeader.svelte';
  import GaugePreview from '../lib/GaugePreview.svelte';

  // When hosted inside another page (e.g. the Looks page's "AXIS Gauge"
  // segment), suppress this component's own page chrome — the host already
  // provides the header + section switcher. Standalone (Pro → Gauge, Home
  // shortcut) it renders its own PageHeader + back button + title.
  let { embedded = false } = $props();

  const LS_GAUGE_ID = 'axis.gaugeId';

  type Phase = 'idle' | 'scan' | 'connecting' | 'loading' | 'ready' | 'unavailable';
  let phase     = $state<Phase>('idle');
  let scanning  = $state(false);
  let hits      = $state<GaugeScanHit[]>([]);
  let errMsg    = $state<string | null>(null);
  let statusMsg = $state<string | null>(null);
  let busy      = $state(false);

  let gauge: GaugeBleClient | null = null;
  let cfg   = $state<GaugeConfig | null>(null);   // working (edited) copy
  let saved = $state<GaugeConfig | null>(null);   // last loaded/saved snapshot

  // Channels that expose a warn threshold (mirrors CAT[].hasWarn).
  const WARN_CH = GAUGE_CHANNELS.map((c, i) => ({ ...c, i })).filter(c => c.hasWarn);

  // User-editable page names (app-side label only — the gauge shows dots, not
  // names — so these persist in localStorage, no firmware involvement). Default
  // to generic "Page N" (the old fixed MAIN/TURBO/… names are gone).
  const LS_PAGE_NAMES = 'axis.gaugePageNames';
  function loadPageNames(): string[] {
    try {
      const raw = localStorage.getItem(LS_PAGE_NAMES);
      if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return GAUGE_PAGES.map((_, i) => a[i] || `Page ${i + 1}`); }
    } catch {}
    return GAUGE_PAGES.map((_, i) => `Page ${i + 1}`);
  }
  let pageNames = $state<string[]>(loadPageNames());
  function setPageName(i: number, v: string) {
    pageNames[i] = v;
    try { localStorage.setItem(LS_PAGE_NAMES, JSON.stringify(pageNames)); } catch {}
  }

  const clone = (c: GaugeConfig): GaugeConfig => JSON.parse(JSON.stringify(c));
  let dirty = $derived(
    !!cfg && !!saved && JSON.stringify(cfg) !== JSON.stringify(saved)
  );

  onMount(async () => {
    // The gauge demo is tied to the knob's DEMO MODE: when the knob client
    // is a MockClient (the app-wide demo session started from Connect), the
    // gauge joins it — full styling UI + live preview on a local default
    // config, no BLE. There's no separate "try in demo" entry any more.
    if (store.client instanceof MockClient) { enterDemo(); return; }
    const avail = await GaugeBleClient.isAvailable();
    if (!avail) { phase = 'unavailable'; return; }
    if (store.gaugeClient) {                       // reuse the live link (no rescan)
      gauge = store.gaugeClient;
      try {
        phase = 'loading';
        const c = await gauge.config();
        cfg = clone(c); saved = clone(c);
        phase = 'ready';
        return;
      } catch { store.gaugeClient = null; gauge = null; }
    }
    let lastId: string | null = null;
    try { lastId = localStorage.getItem(LS_GAUGE_ID); } catch {}
    if (lastId) await connectTo(lastId);
    else        phase = 'scan';
  });
  // No onDestroy disconnect — keep the gauge link alive across navigation.

  async function scan() {
    if (scanning) return;
    scanning = true; errMsg = null; statusMsg = null; hits = [];
    try {
      await GaugeBleClient.scan(h => { hits = [...hits, h]; }, 6000);
      if (hits.length === 0) errMsg = 'No AXIS Gauge found nearby. Power it on and scan again.';
    } catch (e: any) { errMsg = e?.message ?? 'BLE scan failed'; }
    finally { scanning = false; }
  }

  async function connectTo(id: string) {
    phase = 'connecting'; errMsg = null; statusMsg = null;
    try {
      const g = new GaugeBleClient(id);
      await g.connect(() => {
        store.gaugeClient = null;
        if (phase === 'ready' || phase === 'loading') {
          phase = 'scan'; cfg = null; saved = null; statusMsg = 'Gauge disconnected.';
        }
      });
      gauge = g;
      phase = 'loading';
      const c = await g.config();
      cfg = clone(c); saved = clone(c);
      store.gaugeClient = g;
      try { localStorage.setItem(LS_GAUGE_ID, id); } catch {}
      phase = 'ready';
    } catch (e: any) {
      errMsg = e?.message ?? 'Connect failed — is the gauge powered on?';
      phase = 'scan';   // keep the saved id for next time
    }
  }

  function onRedline(v: number) {
    if (!cfg) return;
    cfg.redline = v;
    if (cfg.shiftRpm > v) cfg.shiftRpm = v;
  }

  async function save() {
    if (!gauge || !cfg || busy) return;
    busy = true; statusMsg = null; errMsg = null;
    try { await gauge.setConfig(cfg); saved = clone(cfg); statusMsg = 'Saved to gauge ✓'; }
    catch (e: any) { errMsg = e?.message ?? 'Save failed'; }
    finally { busy = false; }
  }

  async function resetPeaks() {
    if (!gauge || busy) return;
    busy = true; statusMsg = null; errMsg = null;
    try { await gauge.resetPeaks(); statusMsg = 'Peak markers cleared ✓'; }
    catch (e: any) { errMsg = e?.message ?? 'Reset failed'; }
    finally { busy = false; }
  }

  async function forget() {
    try { localStorage.removeItem(LS_GAUGE_ID); } catch {}
    await gauge?.disconnect();
    store.gaugeClient = null;
    gauge = null; cfg = null; saved = null; hits = []; phase = 'scan';
    statusMsg = null; errMsg = null;
  }

  function fmt(v: number, step: number): string {
    return step < 1 ? v.toFixed(1) : String(Math.round(v));
  }

  // ---- Demo mode (no gauge needed) -----------------------------------
  //  Tied to the knob's DEMO MODE: entered automatically from onMount when
  //  store.client is a MockClient (the app-wide demo started on Connect).
  //  Opens the full styling UI + live GaugePreview on a local default
  //  config, no BLE. SAVE is hidden because there's no gauge to write to.
  let demo = $state(false);

  function demoConfig(): GaugeConfig {
    return {
      redline:  8000,
      shiftRpm: 6500,
      peakHold: 0,
      // Each warn-capable channel defaults to its top of scale; the rest
      // are read via `?? ch.max`, so a full array is the safe shape here.
      warn: GAUGE_CHANNELS.map(c => c.max),
      // Every arc starts on the signature gold.
      arc:  GAUGE_CHANNELS.map(() => GAUGE_ARC_DEFAULT),
      globals: { ...GAUGE_GLOBAL_DEFAULTS },
      // Page render styles mirror PAGES[] in Gauge.cpp:
      // MAIN=concentric(0) · TURBO=hero(1) · TEMPS=bars(2) · FUEL=hero(1).
      pageLayout: GAUGE_PAGES.map((_, i) => [0, 1, 2, 1][i] ?? 0),
      // Fill each page's used slots with the first few channels so the
      // preview shows real readouts; unused slots are empty (-1).
      pageSlots: GAUGE_PAGES.map(pg =>
        Array.from({ length: GAUGE_SLOTS },
          (_, s) => (s < pg.slots ? s % GAUGE_CHANNELS.length : -1))),
      // per-arc-position colour override — all 0 = inherit the channel colour.
      slotColor: GAUGE_PAGES.map(() => Array.from({ length: GAUGE_SLOTS }, () => 0)),
      // demo availability: mimic the V60 T8 — no OBD source for OIL P (27) or
      // TRANS (28), so the greyed-out "— no data" options are visible without a
      // real gauge. (The gauge extras that other cars might report.)
      avail: GAUGE_CHANNELS.map((_, i) => i !== 27 && i !== 28),
    };
  }

  function enterDemo() {
    const c = demoConfig();
    cfg = clone(c); saved = clone(c);
    demo = true; gauge = null;
    errMsg = null; statusMsg = null;
    phase = 'ready';
  }

  // Which slots RENDER as a coloured arc/bar in a given page layout (so we only
  // offer a colour swatch there — hero support slots 1-3 are plain text readouts,
  // not arcs). layout 0=concentric (5 arcs) · 1=hero (only slot 0 is the big arc) ·
  // 2=bars (4 bars). Mirrors Gauge.cpp / GaugePreview's arcCol usage.
  function isArcSlot(layout: number, sl: number): boolean {
    return layout === 1 ? sl === 0 : true;
  }
</script>

{#if !embedded}
  <PageHeader />

  <button class="back" on:click={() => (store.page = store.client ? 'devices' : 'connect')}>
    {store.client ? '‹ DEVICES' : '‹ CONNECT'}
  </button>

  <h2 class="title">Gauge</h2>
{/if}

{#if phase === 'unavailable'}
  <div class="card">
    <p class="muted small">
      Bluetooth isn't available here. Turn it on to set up your AXIS Gauge.
    </p>
    <p class="hint">To explore without hardware, start the live preview from the Connect screen — the gauge joins the same preview.</p>
  </div>

{:else if phase === 'connecting' || phase === 'loading'}
  <div class="card"><p class="muted small">
    {phase === 'connecting' ? 'Connecting to gauge…' : 'Reading config…'}
  </p></div>

{:else if phase === 'ready' && cfg}
  <!-- Live preview — reflects colour + layout edits instantly (like the knob). -->
  <div class="card preview-card">
    <div class="preview-head">
      <span class="preview-label">PREVIEW · live</span>
    </div>
    <GaugePreview arc={cfg.arc} globals={cfg.globals} slotColor={cfg.slotColor}
                  pageSlots={cfg.pageSlots} pageLayout={cfg.pageLayout} pageNames={pageNames} />
    {#if demo}<p class="demo-banner">Demo preview — changes here aren't saved. Connect an AXIS Gauge to keep them.</p>{/if}
  </div>

  <!-- Engineer config (calibration + layout) is hidden when this editor is
       embedded in the buyer-facing Looks page — there a buyer only styles
       colours; the full editor stays on the standalone Pro → Gauge page. -->
  {#if !embedded}
  <!-- Calibration -->
  <div class="card">
    <header class="card-head"><strong>Calibration</strong>
      <span class="badge" class:online={!demo} class:demo={demo}>{demo ? 'DEMO' : 'CONNECTED'}</span></header>

    <div class="row">
      <div class="row-head"><label for="redline">Redline</label>
        <span class="val mono">{fmt(cfg.redline, 100)} <span class="unit">rpm</span></span></div>
      <input id="redline" type="range" min="4000" max="12000" step="100"
             value={cfg.redline} on:input={(e) => onRedline(+e.currentTarget.value)} />
      <p class="hint">Full-scale RPM — the gauge sweeps to red here.</p>
    </div>

    <div class="row">
      <div class="row-head"><label for="shift">Shift light</label>
        <span class="val mono">{fmt(cfg.shiftRpm, 100)} <span class="unit">rpm</span></span></div>
      <input id="shift" type="range" min="3000" max={cfg.redline} step="100" bind:value={cfg.shiftRpm} />
      <p class="hint">Shift-light strobe point — knob + gauge flash together here.</p>
    </div>

    <div class="row">
      <div class="row-head"><span class="lbl">Peak hold</span></div>
      <div class="seg">
        <button class:on={cfg.peakHold === 0} on:click={() => cfg && (cfg.peakHold = 0)}>ROLLING</button>
        <button class:on={cfg.peakHold === 1} on:click={() => cfg && (cfg.peakHold = 1)}>HOLD</button>
      </div>
      <p class="hint">{cfg.peakHold === 1 ? 'Peaks stay until you reset them.' : 'Peaks fade ~3 s after the value drops.'}</p>
    </div>

    <button class="ghost full" on:click={resetPeaks} disabled={busy || demo}>RESET PEAK MARKERS</button>
  </div>

  <!-- Layout — which channel sits in each slot, per page -->
  <details class="card warns">
    <summary>Layout</summary>
    <p class="hint">Pick what each arc shows on every page — and give each arc its own colour (the swatch). ↺ resets an arc to the default gold.</p>
    {#each GAUGE_PAGES as page, p (p)}
      <div class="lay-page">
        <input class="lay-name-input mono" value={pageNames[p]}
               on:input={(e) => setPageName(p, e.currentTarget.value)}
               placeholder={'Page ' + (p + 1)} maxlength="12" aria-label="Page name" />
        {#each Array(page.slots) as _, sl}
          <div class="lay-row">
            <span class="lay-slot mono">{sl + 1}</span>
            <select bind:value={cfg.pageSlots[p][sl]}>
              <option value={-1}>— empty —</option>
              {#each GAUGE_CHANNELS as ch, ci}
                <!-- Always SELECTABLE — avail is just a HINT (the firmware only marks
                     a channel "seen" once a fresh frame arrives, so a channel that
                     really has data can still read "no data" until then). -->
                <option value={ci}>
                  {ch.label}{ch.unit ? ` (${ch.unit})` : ''}{cfg.avail && cfg.avail[ci] === false ? ' — no data' : ''}
                </option>
              {/each}
            </select>
            <!-- Per-ARC-POSITION colour: overrides this arc's colour regardless of its
                 channel. Empty (auto) inherits the channel's Arc colour below. -->
            {#if cfg.pageSlots[p][sl] >= 0 && isArcSlot(cfg.pageLayout[p], sl)}
              <input class="lay-col" type="color"
                     title="This arc’s colour"
                     value={cfg.slotColor[p][sl] ? rgb565ToHex(cfg.slotColor[p][sl]) : rgb565ToHex(GAUGE_ARC_DEFAULT)}
                     on:input={(e) => cfg && (cfg.slotColor[p][sl] = hexToRgb565(e.currentTarget.value))} />
              {#if cfg.slotColor[p][sl]}
                <button class="lay-reset" title="Reset to default gold"
                        on:click={() => cfg && (cfg.slotColor[p][sl] = 0)}>↺</button>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </details>
  {/if}

  <!-- Global element colours -->
  <details class="card warns">
    <summary>Element colours</summary>
    <p class="hint">Shared chrome + typography across all pages.</p>
    {#each GAUGE_GLOBAL_SLOTS as slot (slot.key)}
      <div class="crow">
        <label for={'g-' + slot.key}>{slot.label}</label>
        <input id={'g-' + slot.key} type="color"
               value={rgb565ToHex(cfg.globals[slot.key])}
               on:input={(e) => cfg && (cfg.globals[slot.key] = hexToRgb565(e.currentTarget.value))} />
      </div>
    {/each}
  </details>

  {#if !embedded}
  <!-- Warning thresholds -->
  <details class="card warns">
    <summary>Warning thresholds</summary>
    <p class="hint">Channel turns red + flashes at or above these values.</p>
    {#each WARN_CH as ch (ch.i)}
      <div class="row">
        <div class="row-head"><label for={'w' + ch.i}>{ch.label}</label>
          <span class="val mono">{fmt(cfg.warn[ch.i] ?? ch.max, ch.step)}{#if ch.unit}<span class="unit">{ch.unit}</span>{/if}</span></div>
        <input id={'w' + ch.i} type="range" min={ch.min} max={ch.max} step={ch.step}
               value={cfg.warn[ch.i] ?? ch.max}
               on:input={(e) => cfg && (cfg.warn[ch.i] = +e.currentTarget.value)} />
      </div>
    {/each}
  </details>
  {/if}

  {#if statusMsg}<p class="ok small">{statusMsg}</p>{/if}
  {#if errMsg}<p class="err small">{errMsg}</p>{/if}

  {#if demo}
    <div class="card demo-note">
      <p class="muted small">Demo mode — part of your knob's demo session.
        Connect a real AXIS Gauge to save this setup to it.</p>
    </div>
  {:else}
    <button class="primary full save" class:hot={dirty} on:click={save} disabled={!dirty || busy}>
      {busy ? 'SAVING…' : dirty ? 'SAVE TO GAUGE' : 'SAVED'}
    </button>
    <button class="link" on:click={forget}>Forget this gauge</button>
  {/if}

{:else}
  <!-- scan / pick -->
  <div class="card">
    <p class="muted small">
      Connect to the AXIS Gauge over Bluetooth to set its redline, shift
      light, layout, colours and warnings. The gauge stores its own config.
    </p>
    <button class="primary full" on:click={scan} disabled={scanning}>
      {scanning ? 'SCANNING…' : 'SCAN FOR GAUGE'}
    </button>
    {#if statusMsg}<p class="ok small">{statusMsg}</p>{/if}
    {#if errMsg}<p class="err small">{errMsg}</p>{/if}

    {#each hits as hit (hit.id)}
      <button class="hit" on:click={() => connectTo(hit.id)}>
        <div><div class="hit-name">{hit.name}</div><div class="muted xs mono">{hit.id}</div></div>
        {#if hit.rssi !== undefined && hit.rssi !== 0}<span class="muted mono small">{hit.rssi} dBm</span>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .back {
    background: none; border: 0; color: var(--muted);
    font-family: var(--font-mono); font-size: 12px; letter-spacing: 1px;
    padding: var(--s-2) 0; cursor: pointer; align-self: flex-start;
  }
  .back:active { color: var(--fg); }
  .title { margin: 0 0 var(--s-2); font-size: 20px; letter-spacing: 0.3px; }

  .card { padding: var(--s-4); }
  .card + .card, .card + .save, .card + .ok, .card + .err { margin-top: var(--s-3); }
  .preview-card { display: flex; flex-direction: column; gap: var(--s-3); align-items: center; }
  .preview-head { width: 100%; display: flex; justify-content: space-between; align-items: center; }
  .preview-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.5px; color: var(--muted); }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--s-3); }
  .card-head strong { font-size: 16px; letter-spacing: 0.3px; }

  .badge {
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.5px;
    padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border);
    color: var(--muted); background: var(--surface-2);
  }
  .badge.online { color: var(--success); border-color: var(--success); }
  .badge.demo { color: var(--accent); border-color: var(--accent); }

  .demo-note { text-align: center; }
  .demo-note p { margin: 0; }
  .demo-banner { margin: 0; font-size: 12px; line-height: 1.4; color: var(--accent); text-align: center; }

  .row { margin-top: var(--s-3); }
  .row:first-of-type { margin-top: 0; }
  .row-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--s-2); }
  .row-head label, .row-head .lbl { font-size: 14px; letter-spacing: 0.3px; }
  .val { color: var(--accent); font-size: 15px; }
  .val .unit { color: var(--muted); font-size: 11px; margin-left: 2px; }

  input[type='range'] { width: 100%; accent-color: var(--accent); height: var(--tap-min); }
  .hint { color: var(--muted); font-size: 12px; line-height: 1.4; margin: var(--s-1) 0 0; }

  .seg { display: flex; gap: var(--s-2); }
  .seg button {
    flex: 1; background: var(--surface-2); border: 1px solid var(--border);
    color: var(--muted); font-family: var(--font-mono); font-size: 12px;
    letter-spacing: 1px; padding: var(--s-3); border-radius: var(--r-1);
    cursor: pointer; min-height: var(--tap-min);
  }
  .seg button.on { color: var(--accent); border-color: var(--accent); background: var(--surface); }

  .full { width: 100%; }
  .save { margin-top: var(--s-3); }
  .save.hot { box-shadow: 0 0 0 2px var(--accent); }
  .ghost {
    margin-top: var(--s-3); background: var(--surface-2); border: 1px solid var(--border);
    color: var(--fg); font-family: var(--font-mono); font-size: 12px; letter-spacing: 1px;
    padding: var(--s-3); border-radius: var(--r-1); cursor: pointer; min-height: var(--tap-min);
  }
  .ghost:active { background: var(--surface); }
  .ghost[disabled], .save[disabled], .primary[disabled] { opacity: 0.5; }

  .warns summary {
    cursor: pointer; font-size: 15px; letter-spacing: 0.3px; list-style: none; padding: var(--s-1) 0;
  }
  .warns summary::-webkit-details-marker { display: none; }
  .warns summary::after { content: ' ▾'; color: var(--muted); }
  .warns[open] summary::after { content: ' ▴'; }

  /* colour slot row */
  .crow { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); padding: var(--s-2) 0; min-height: var(--tap-min); }
  .crow label { font-size: 14px; letter-spacing: 0.3px; }
  .crow input[type='color'] { width: 52px; height: 32px; padding: 0; border: 1px solid var(--border); border-radius: var(--r-1); background: none; cursor: pointer; flex-shrink: 0; }

  /* layout editor */
  .lay-page { margin-top: var(--s-3); }
  .lay-page:first-of-type { margin-top: var(--s-2); }
  .lay-name-input {
    width: 100%; background: var(--surface-2); border: 1px solid var(--border);
    color: var(--accent); font-size: 12px; letter-spacing: 1px;
    padding: var(--s-2); border-radius: var(--r-1); margin-bottom: var(--s-2); box-sizing: border-box;
  }
  .lay-row { display: flex; align-items: center; gap: var(--s-3); padding: 3px 0; }
  .lay-slot { width: 16px; color: var(--muted); font-size: 12px; flex-shrink: 0; text-align: center; }
  .lay-row select {
    flex: 1; background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
    font-size: 14px; padding: var(--s-2) var(--s-3); border-radius: var(--r-1); min-height: var(--tap-min);
  }
  .lay-col { width: 34px; height: 30px; flex-shrink: 0; padding: 0; border: 1px solid var(--border);
             border-radius: var(--r-1); background: none; cursor: pointer; }
  .lay-reset { flex-shrink: 0; width: 28px; height: 28px; padding: 0; background: var(--surface-2);
               border: 1px solid var(--border); border-radius: var(--r-1); color: var(--muted); cursor: pointer; font-size: 14px; }

  .link { display: block; width: 100%; background: none; border: 0; color: var(--muted); font-size: 13px; padding: var(--s-3); margin-top: var(--s-2); cursor: pointer; text-decoration: underline; }
  .ok  { color: var(--success); } .err { color: var(--danger); }
  .small { font-size: 13px; line-height: 1.45; } .xs { font-size: 11px; }
  .muted { color: var(--muted); } .mono { font-family: var(--font-mono); }

  .hit {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    gap: var(--s-3); background: var(--surface-2); border: 1px solid var(--border);
    color: var(--fg); padding: var(--s-3); margin-top: var(--s-2); border-radius: var(--r-1);
    cursor: pointer; text-align: left; min-height: var(--tap-min);
  }
  .hit:active { background: var(--surface); }
  .hit-name { font-family: var(--font-mono); }
</style>
