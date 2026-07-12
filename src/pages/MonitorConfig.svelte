<script lang="ts">
  // =====================================================================
  //  MonitorConfig — full editor for the AXIS Monitor's GaugeCfg: the four
  //  on-screen pages (layout + which channels + per-page arc colour + peak)
  //  and the global AMOLED brightness. Ported/expanded from founder-gauge's
  //  MonitorSetup configurator.
  //
  //  This edits the 1.32" MONITOR's packed GaugeCfg (svc 7e1c0201) — NOT the
  //  separate 1.75" AXIS gauge (that's the Gauge Setup page). The monitor's
  //  model is ONE arc colour PER PAGE (not per-arc), so the colour swatch is
  //  per page. The drivetrain / redline / shift-light fields live on the
  //  Drivetrain page and are intentionally NOT duplicated here — this page
  //  is read-modify-write, so those values are preserved on Save.
  //
  //  Reached via Pro → Gauge display. Reuses store.monClient so the link
  //  survives navigation. DEMO renders the full editor offline (App-Store
  //  5.6 full-UI rule); Save shows a "connect your AXIS Monitor" note.
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import {
    MonitorBleClient, type MonScanHit, type GaugeCfg,
    defaultCfg, cfgValid, channelDef,
    CHANNELS, CHANNEL_GROUPS, Ch, Layout,
    GAUGE_PAGES, SLOTS_PER_PAGE, ARC_DEFAULT,
    rgb565ToHex, hexToRgb565,
  } from '../lib/monitorCfg';

  type Phase = 'idle' | 'scan' | 'connecting' | 'loading' | 'ready';
  let phase    = $state<Phase>('idle');
  let scanning = $state(false);
  let hits     = $state<MonScanHit[]>([]);
  let errMsg   = $state<string | null>(null);
  let statusMsg = $state<string | null>(null);
  let mon: MonitorBleClient | null = $state(null);
  let cfg = $state<GaugeCfg>(defaultCfg());
  let saving = $state(false);
  let demo = $state(false);

  const PAGE_NAMES = ['MAIN', 'PAGE 2', 'PAGE 3', 'PAGE 4'];
  // HERO uses slot 0 (primary) + 1..3 (support); BARS uses 0..3; slot 4 is
  // reserved by the firmware struct. Expose the 4 live slots for editing.
  const LIVE_SLOTS = Math.min(4, SLOTS_PER_PAGE);

  // Reuse a live monitor link if one exists (came from another page); else
  // enter DEMO offline (full editor, Save no-ops) or scan.
  $effect(() => {
    if (phase !== 'idle') return;
    if (store.monClient) { mon = store.monClient; void load(); }
    else if (store.isDemo) { demo = true; cfg = defaultCfg(); phase = 'ready'; }
    else phase = 'scan';
  });

  async function scan() {
    if (scanning) return;
    scanning = true; errMsg = null; statusMsg = null; hits = [];
    try {
      await MonitorBleClient.scan(h => { hits = [...hits, h]; }, 6000);
      if (hits.length === 0) errMsg = 'No AXIS Monitor found nearby. Power it on and scan again.';
    } catch (e: any) { errMsg = e?.message ?? 'BLE scan failed'; }
    finally { scanning = false; }
  }

  async function connectTo(id: string) {
    phase = 'connecting'; errMsg = null; statusMsg = null;
    try {
      const m = new MonitorBleClient(id);
      await m.connect(() => { store.monClient = null; mon = null; phase = 'scan'; statusMsg = 'Monitor disconnected.'; });
      mon = m; store.monClient = m;
      await load();
    } catch (e: any) {
      errMsg = e?.message ?? 'Connect failed'; phase = 'scan';
    }
  }

  async function load() {
    if (!mon) return;
    phase = 'loading'; errMsg = null;
    try { cfg = await mon.config(); phase = 'ready'; }
    catch (e: any) { errMsg = e?.message ?? 'Reading config failed'; phase = 'scan'; store.monClient = null; mon = null; }
  }

  // ---- per-page arc colour (live-recolours the gauge as the picker drags) ----
  const pageHex = (i: number) => rgb565ToHex(cfg.pages[i].arcColor ?? ARC_DEFAULT);
  function setPageColor(i: number, hex: string) {
    const c565 = hexToRgb565(hex);
    cfg.pages[i].arcColor = c565;
    if (!demo && mon) mon.setPageColor(i, c565).catch(() => {});
  }

  // ---- per-page peak (native units of the primary/big value) ----
  // Pre-fill the channel's sensible default when the primary channel changes.
  function onPrimaryChange(i: number) { cfg.pages[i].peak = channelDef(cfg.pages[i].ch[0])?.peak ?? 0; }
  const peakMax  = (i: number) => channelDef(cfg.pages[i].ch[0])?.max ?? 0;
  const peakUnit = (i: number) => channelDef(cfg.pages[i].ch[0])?.unit ?? '';

  function setLayout(i: number, l: Layout) { cfg.pages[i].layout = l; }

  // ---- global brightness (live-dims the AMOLED as the slider drags) ----
  function onBrightness(e: Event) {
    const v = +(e.currentTarget as HTMLInputElement).value;
    cfg.brightness = v;
    if (!demo && mon) mon.setBrightness(v).catch(() => {});
  }

  async function save() {
    if (saving) return;
    if (demo || !mon) { statusMsg = 'Demo — connect your AXIS Monitor to save the gauge display.'; return; }
    if (!cfgValid(cfg)) { statusMsg = '✗ Some values are out of range — check the peak fields.'; return; }
    saving = true; statusMsg = 'Saving to the monitor…';
    try {
      await mon.setConfig(cfg);
      statusMsg = '✓ Saved. Your gauge display is updated.';
    } catch (e: any) {
      statusMsg = '✗ ' + (e?.message ?? 'Save failed');
    } finally { saving = false; }
  }

  // Slot heading text: primary vs support, per layout.
  function slotLabel(layout: Layout, s: number): string {
    if (layout === Layout.HERO) return s === 0 ? 'Big value' : `Support ${s}`;
    return `Bar ${s + 1}`;
  }
</script>

<PageHeader title="Gauge display" back="pro" backLabel="Pro" />

{#if phase === 'scan' || phase === 'idle'}
  <div class="card">
    <p class="sub">Choose what each of the gauge's four pages shows — the readouts, layout and arc colour. Connect your <b>AXIS Monitor</b> first.</p>
    <button class="ghost wide" onclick={scan} disabled={scanning}>{scanning ? 'Scanning…' : 'Scan for AXIS Monitor'}</button>
    {#each hits as h (h.id)}
      <button class="ghost wide hit" onclick={() => connectTo(h.id)}>{h.name}</button>
    {/each}
    {#if errMsg}<p class="note">{errMsg}</p>{/if}
    {#if statusMsg}<p class="note">{statusMsg}</p>{/if}
  </div>
{:else if phase === 'connecting' || phase === 'loading'}
  <div class="card"><p class="sub">{phase === 'connecting' ? 'Connecting to monitor…' : 'Reading gauge display…'}</p></div>
{:else if phase === 'ready'}
  <div class="card intro">
    <div class="head"><strong>Gauge display</strong>
      <span class="badge" class:online={!demo} class:demo={demo}>{demo ? 'DEMO' : 'CONNECTED'}</span></div>
    <p class="sub dim">Each page is one screen on the gauge — pick its layout, its readouts and its arc colour.{#if demo} <b>Demo</b> — connect your AXIS Monitor to save.{/if}</p>
  </div>

  {#each cfg.pages as page, i (i)}
    <div class="card page-card">
      <div class="page-head">
        <span class="page-tag">{PAGE_NAMES[i]}</span>
        <label class="swatch" style="background: {pageHex(i)}" title="Arc colour">
          <input type="color" value={pageHex(i)}
            oninput={(e) => setPageColor(i, (e.currentTarget as HTMLInputElement).value)}
            aria-label="Arc colour for {PAGE_NAMES[i]}" />
        </label>
      </div>

      <!-- layout toggle -->
      <div class="seg" role="group" aria-label="Layout">
        <button class="seg-btn" class:on={page.layout === Layout.HERO}
          onclick={() => setLayout(i, Layout.HERO)}>Hero</button>
        <button class="seg-btn" class:on={page.layout === Layout.BARS}
          onclick={() => setLayout(i, Layout.BARS)}>Bars</button>
      </div>

      <!-- slot channel pickers (4 live slots; slot 5 is firmware-reserved) -->
      {#each Array(LIVE_SLOTS) as _, s}
        <label class="row">
          <span>{slotLabel(page.layout, s)}</span>
          <select bind:value={cfg.pages[i].ch[s]} onchange={() => { if (s === 0) onPrimaryChange(i); }}>
            <option value={Ch.NONE}>— empty —</option>
            {#each CHANNEL_GROUPS as g (g)}
              <optgroup label={g}>
                {#each CHANNELS.filter(c => c.group === g) as c (c.id)}
                  <option value={c.id}>{c.label}{c.unit ? ` (${c.unit})` : ''}</option>
                {/each}
              </optgroup>
            {/each}
          </select>
        </label>
      {/each}

      <!-- per-page peak / redline for the primary value -->
      <label class="row">
        <span>Peak / redline <span class="hint">0 = off</span></span>
        <span class="peak-row">
          <input type="number" min="0" max={peakMax(i)} step="any"
            bind:value={cfg.pages[i].peak} placeholder="off" />
          <span class="peak-unit">{peakUnit(i)}</span>
        </span>
      </label>
    </div>
  {/each}

  <!-- global screen brightness (live-dims as you drag) -->
  <div class="card">
    <div class="bright-head">
      <span class="lbl">Screen brightness</span>
      <span class="bright-val">{Math.round(cfg.brightness / 255 * 100)}%</span>
    </div>
    <input class="bright-slider" type="range" min="8" max="255" value={cfg.brightness} oninput={onBrightness} />
  </div>

  <div class="savebar">
    {#if statusMsg}<span class="save-msg" class:err={statusMsg.startsWith('✗')}>{statusMsg}</span>{/if}
    <button class="save" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to monitor'}</button>
  </div>
{/if}

<style>
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-4); }
  .card + .card { margin-top: var(--s-3); }
  .intro { margin-bottom: var(--s-3); }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s-2); }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: .5px; border-radius: 999px; padding: 2px 8px; }
  .badge.online { color: #000; background: var(--accent); }
  .badge.demo { color: #000; background: var(--accent); opacity: .75; }
  .sub { color: var(--muted); font-size: 13px; margin: 0 0 var(--s-3); }
  .sub.dim { opacity: .75; }
  .note { font-size: 13px; color: var(--fg); margin: var(--s-2) 0; }
  .hint { opacity: .55; font-size: 11px; }

  .page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s-3); }
  .page-tag { font-family: var(--font-mono); font-size: 12px; letter-spacing: 1px; color: var(--muted); }
  .swatch { position: relative; width: 30px; height: 22px; border-radius: 6px; border: 1px solid var(--border);
            cursor: pointer; overflow: hidden; }
  .swatch input[type=color] { position: absolute; inset: -4px; width: 140%; height: 160%; border: 0; padding: 0;
                              background: none; cursor: pointer; opacity: 0; }

  .seg { display: flex; gap: 4px; background: var(--surface-2); border: 1px solid var(--border);
         border-radius: 8px; padding: 3px; margin-bottom: var(--s-2); }
  .seg-btn { flex: 1; border: 0; background: none; color: var(--muted); border-radius: 6px;
             padding: 7px 0; font-size: 13px; cursor: pointer; }
  .seg-btn.on { background: var(--accent); color: #000; font-weight: 600; }

  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 10px; }
  .row > span:first-child { font-size: 14px; }
  select, input[type=number] { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
                               border-radius: 8px; padding: 7px 9px; font-size: 14px; }
  .row > select { width: 62%; }
  .peak-row { display: flex; align-items: center; gap: 6px; }
  .peak-row input[type=number] { width: 96px; text-align: right; }
  .peak-unit { font-size: 12px; color: var(--muted); min-width: 30px; }

  .bright-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s-2); }
  .lbl { font-size: 14px; }
  .bright-val { font-family: var(--font-mono); font-size: 13px; color: var(--accent); }
  .bright-slider { width: 100%; accent-color: var(--accent); }

  .ghost { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
           border-radius: var(--radius); padding: 10px 14px; font-size: 14px; cursor: pointer; }
  .ghost:disabled { opacity: .4; cursor: default; }
  .ghost.wide { width: 100%; margin-top: var(--s-2); }
  .hit { text-align: left; }

  .savebar { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: flex-end; gap: 12px;
             padding: var(--s-3) 0; }
  .save-msg { font-size: 12px; color: var(--muted); }
  .save-msg.err { color: #e24b4a; }
  .save { background: var(--accent); color: #000; border: 0; border-radius: var(--radius); padding: 11px 20px;
          font-size: 14px; font-weight: 600; cursor: pointer; }
  .save:disabled { opacity: .5; cursor: default; }
</style>
