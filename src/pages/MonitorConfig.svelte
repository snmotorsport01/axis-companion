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
  import { t } from '../lib/i18n';
  import { store } from '../lib/store.svelte';
  import GaugePreview from '../lib/GaugePreview.svelte';
  import { chanMeta } from '../lib/gaugeRender';
  import {
    MonitorBleClient, type MonScanHit, type GaugeCfg,
    defaultCfg, cfgValid, channelDef,
    CHANNELS, CHANNEL_GROUPS, Ch, Layout, LAYOUT_NAMES,
    GAUGE_PAGES, SLOTS_PER_PAGE, ARC_DEFAULT,
    rgb565ToHex, hexToRgb565,
    UC_COUNT, UNIT_OPTIONS, UNITS_METRIC, UNITS_IMPERIAL,
  } from '../lib/monitorCfg';

  type Phase = 'idle' | 'scan' | 'connecting' | 'loading' | 'ready';
  let phase    = $state<Phase>('idle');
  let scanning = $state(false);
  let hits     = $state<MonScanHit[]>([]);
  let errMsg   = $state<string | null>(null);
  let statusMsg = $state<string | null>(null);
  let mon: MonitorBleClient | null = $state(null);
  let cfg = $state<GaugeCfg>(defaultCfg());
  // Baseline = what the gauge currently holds. Set on load and after Save. The
  // live preview compares against it so it fires ONLY on a real user edit — never
  // for merely opening the app / reading the config (that would yank the gauge to
  // the hero page the instant the editor mounts).
  let saved = $state<GaugeCfg>(defaultCfg());

  // Preview is IN THE APP only (the faithful GaugePreview canvas) — nothing is
  // pushed to the glass as you edit, so the gauge can't bounce/jump/desync. Save
  // is the sole writer to the device. (Brightness stays live — global dim.)
  // (chanMeta now comes from gaugeRender — it was duplicated here and in the
  //  Store, and every copy shared the same hole: Ch.NONE has a CHANNELS entry,
  //  so empty slots came back truthy and rendered a fake 0.62 reading.)
  let saving = $state(false);
  let demo = $state(false);

  const PAGE_NAMES = ['MAIN','PAGE 2','PAGE 3','PAGE 4','PAGE 5','PAGE 6','PAGE 7','PAGE 8','PAGE 9','PAGE 10'];
  function addPage()    { if (cfg.pageCount < GAUGE_PAGES) cfg.pageCount += 1; }
  function removePage() { if (cfg.pageCount > 1) cfg.pageCount -= 1; }
  // HERO uses slot 0 (primary) + 1..3 (support); BARS uses 0..3; slot 4 is
  // reserved by the firmware struct. Expose the 4 live slots for editing.
  const LIVE_SLOTS = Math.min(4, SLOTS_PER_PAGE);

  // Reuse a live monitor link if one exists (came from another page); else
  // enter DEMO offline (full editor, Save no-ops) or scan.
  $effect(() => {
    if (phase !== 'idle') return;
    if (store.monClient) { mon = store.monClient; void load(); }
    else if (store.isDemo) { store.page = 'axis'; }   // no editor in demo — the shell IS the playground
    else phase = 'scan';
  });

  async function scan() {
    if (scanning) return;
    scanning = true; errMsg = null; statusMsg = null; hits = [];
    try {
      await MonitorBleClient.scan(h => { hits = [...hits, h]; }, 6000);
      if (hits.length === 0) errMsg = t('monconfig.no_monitor');
    } catch (e: any) { errMsg = e?.message ?? t('monconfig.ble_scan_failed'); }
    finally { scanning = false; }
  }

  async function connectTo(id: string) {
    phase = 'connecting'; errMsg = null; statusMsg = null;
    try {
      const m = new MonitorBleClient(id);
      await m.connect(() => { store.monClient = null; mon = null; phase = 'scan'; statusMsg = t('monconfig.mon_disconnected'); });
      mon = m; store.monClient = m;
      await load();
    } catch (e: any) {
      errMsg = e?.message ?? t('monconfig.connect_failed'); phase = 'scan';
    }
  }

  async function load() {
    if (!mon) return;
    phase = 'loading'; errMsg = null;
    // Connected + config read → hand straight back to the shell. The old "Layout &
    // faces" editor here is REMOVED (redundant with Looks); the shell's Looks pulls
    // the gauge's real config on mount. (owner: no more layout&faces page.)
    try { await mon.config(); store.page = 'axis'; }
    catch (e: any) { errMsg = e?.message ?? t('monconfig.reading_failed'); phase = 'scan'; store.monClient = null; mon = null; }
  }

  // ---- per-page arc colour (live-recolours the gauge as the picker drags) ----
  const pageHex = (i: number) => rgb565ToHex(cfg.pages[i].arcColor ?? ARC_DEFAULT);
  function setPageColor(i: number, hex: string) {
    // Colour shows in the in-app GaugePreview; Save pushes it to the gauge.
    cfg.pages[i].arcColor = hexToRgb565(hex);
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

  // ---- per-quantity display units ----
  function setUnit(cls: number, sel: number) {
    if (!cfg.units) cfg.units = [...UNITS_METRIC];
    cfg.units = cfg.units.map((u, i) => i === cls ? sel : u);
  }
  function setUnitSystem(imperial: boolean) { cfg.units = [...(imperial ? UNITS_IMPERIAL : UNITS_METRIC)]; }
  const isImperial = () => JSON.stringify(cfg.units) === JSON.stringify(UNITS_IMPERIAL);
  const isMetric   = () => JSON.stringify(cfg.units ?? UNITS_METRIC) === JSON.stringify(UNITS_METRIC);

  async function save() {
    if (saving) return;
    if (demo || !mon) { statusMsg = t('monconfig.demo_save_note'); return; }
    if (!cfgValid(cfg)) { statusMsg = t('monconfig.out_of_range'); return; }
    saving = true; statusMsg = t('monconfig.saving_to_monitor');
    try {
      await mon.setConfig(cfg);
      saved = JSON.parse(JSON.stringify(cfg));   // gauge now holds this — stop previewing it as an "edit"
      statusMsg = t('monconfig.saved_ok');
    } catch (e: any) {
      statusMsg = '✗ ' + (e?.message ?? t('monconfig.save_failed'));
    } finally { saving = false; }
  }

  // How many value slots a layout actually draws:
  //   BARS = 4 bars · HERO = big + support · NEEDLE = 2 hands · TICKS = ring + a
  //   short outer tick for the 2nd value (the RING itself stays single-value).
  // TUNER uses 4 slots (dot tacho, energy arc, readout main, readout sub); REGENT is a
  // single-value dial; the rest match the free layouts. Mirrors founder-gauge.
  // CONCENTRIC draws all 5 concentric arcs — one per channel slot (arc1..arc5).
  const slotsUsed = (l: Layout) =>
    l === Layout.GMETER ? 0                       // IMU-driven — no channel slots
    : l === Layout.CONCENTRIC ? SLOTS_PER_PAGE
    : (l === Layout.BARS || l === Layout.TUNER || l === Layout.HERO || l === Layout.LANES) ? 4 : l === Layout.REGENT ? 1 : 2;
  const has2ndColor = (l: Layout) =>
    l === Layout.NEEDLE || l === Layout.TICKS || l === Layout.TUNER || l === Layout.CHRONO;

  // Slot heading text, per layout.
  function slotLabel(layout: Layout, s: number): string {
    if (layout === Layout.TICKS)  return s === 0 ? t('monconfig.slot_lit_ticks') : t('monconfig.slot_outer_tick');
    if (layout === Layout.NEEDLE) return s === 0 ? t('monconfig.slot_long_needle') : t('monconfig.slot_short_needle');
    if (layout === Layout.HERO)   return s === 0 ? t('monconfig.slot_big_value') : t('monconfig.slot_support', { n: s });
    if (layout === Layout.TUNER)  return [t('monconfig.slot_rpm_dot'), t('monconfig.slot_energy_arc'), t('monconfig.slot_readout_main'), t('monconfig.slot_readout_sub')][s] ?? t('monconfig.slot_generic', { n: s + 1 });
    if (layout === Layout.REGENT) return t('monconfig.slot_needle_value');
    if (layout === Layout.CHRONO) return s === 0 ? t('monconfig.slot_main_dial') : t('monconfig.slot_sub_dial');
    if (layout === Layout.CONCENTRIC) return t('monconfig.slot_arc', { n: s + 1 });
    if (layout === Layout.GMETER) return 'G-Meter';   // no channel slots (IMU-driven)
    if (layout === Layout.LANES)  return t('monconfig.slot_generic', { n: s + 1 });   // 4 live-graph lanes
    return t('monconfig.slot_bar', { n: s + 1 });
  }

  // v11: 2nd needle hand + value-text colour. 0 on the wire = "use the default"
  // (arc colour / white), so the swatch shows that default until the owner picks.
  const hand2Hex = (i: number) => rgb565ToHex(cfg.pages[i].color2 || (cfg.pages[i].arcColor ?? ARC_DEFAULT));
  const textHex  = (i: number) => rgb565ToHex(cfg.pages[i].textColor || 0xffff);
  const setHand2Color = (i: number, hex: string) => { cfg.pages[i].color2    = hexToRgb565(hex); };
  const setTextColor  = (i: number, hex: string) => { cfg.pages[i].textColor = hexToRgb565(hex); };
</script>

<PageHeader title={t('monconfig.title')} back="axis" backLabel="AXIS" />

{#if phase === 'scan' || phase === 'idle'}
  <div class="card">
    <p class="sub">{@html t('monconfig.scan_intro')}</p>
    <button class="ghost wide" onclick={scan} disabled={scanning}>{scanning ? t('monconfig.scanning') : t('monconfig.scan_btn')}</button>
    {#each hits as h (h.id)}
      <button class="ghost wide hit" onclick={() => connectTo(h.id)}>{h.name}</button>
    {/each}
    {#if errMsg}<p class="note">{errMsg}</p>{/if}
    {#if statusMsg}<p class="note">{statusMsg}</p>{/if}
  </div>
{:else if phase === 'connecting' || phase === 'loading'}
  <div class="card"><p class="sub">{phase === 'connecting' ? t('monconfig.connecting') : t('monconfig.reading')}</p></div>
{:else if phase === 'ready'}
  <div class="card intro">
    <div class="head"><strong>{t('monconfig.title')}</strong>
      <span class="badge" class:online={!demo} class:demo={demo}>{demo ? t('monconfig.demo') : t('monconfig.connected')}</span></div>
    <p class="sub dim">{t('monconfig.ready_intro')}{#if demo}{@html t('monconfig.demo_suffix')}{/if}</p>
  </div>

  {#each cfg.pages.slice(0, cfg.pageCount) as page, i (i)}
    <div class="card page-card">
      <div class="page-head">
        <span class="page-tag">{PAGE_NAMES[i]}</span>
        <div class="sw-row">
          <label class="swatch" style="background: {pageHex(i)}"
                 title={page.layout === Layout.NEEDLE ? t('monconfig.long_needle_colour') : t('monconfig.arc_colour')}>
            <input type="color" value={pageHex(i)}
              oninput={(e) => setPageColor(i, (e.currentTarget as HTMLInputElement).value)}
              aria-label={t('monconfig.arc_colour_for', { name: PAGE_NAMES[i] })} />
          </label>
          {#if has2ndColor(page.layout)}
            <label class="swatch" style="background: {hand2Hex(i)}"
                   title={page.layout === Layout.NEEDLE ? t('monconfig.short_needle_colour') : t('monconfig.tick2_colour')}>
              <input type="color" value={hand2Hex(i)}
                oninput={(e) => setHand2Color(i, (e.currentTarget as HTMLInputElement).value)}
                aria-label={t('monconfig.second_needle_colour_for', { name: PAGE_NAMES[i] })} />
            </label>
          {/if}
          <label class="swatch txt" style="background: {textHex(i)}" title={t('monconfig.text_colour')}>
            <input type="color" value={textHex(i)}
              oninput={(e) => setTextColor(i, (e.currentTarget as HTMLInputElement).value)}
              aria-label={t('monconfig.text_colour_for', { name: PAGE_NAMES[i] })} />
          </label>
        </div>
      </div>

      <!-- layout toggle -->
      <div class="seg" role="group" aria-label={t('monconfig.layout')}>
        {#each [Layout.HERO, Layout.BARS, Layout.NEEDLE, Layout.TICKS, Layout.TUNER, Layout.REGENT, Layout.CHRONO, Layout.CONCENTRIC, Layout.GMETER, Layout.LANES] as L}
          <button class="seg-btn" class:on={page.layout === L}
            onclick={() => setLayout(i, L)}>{LAYOUT_NAMES[L]}</button>
        {/each}
      </div>

      <!-- faithful in-app preview of the style + colours (Save writes to the gauge) -->
      <div class="gp-wrap">
        <GaugePreview layout={page.layout} arc={pageHex(i)} col2={hand2Hex(i)} text={textHex(i)}
          ch={page.ch} chan={chanMeta} size={104} />
      </div>

      <!-- one select per slot the chosen layout actually draws -->
      {#each Array(slotsUsed(page.layout)) as _, s}
        <label class="row">
          <span>{slotLabel(page.layout, s)}</span>
          <select bind:value={cfg.pages[i].ch[s]} onchange={() => { if (s === 0) onPrimaryChange(i); }}>
            <option value={Ch.NONE}>{t('monconfig.empty_option')}</option>
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
        <span>{t('monconfig.peak_redline')} <span class="hint">{t('monconfig.zero_off')}</span></span>
        <span class="peak-row">
          <input type="number" min="0" max={peakMax(i)} step="any"
            bind:value={cfg.pages[i].peak} placeholder={t('monconfig.off')} />
          <span class="peak-unit">{peakUnit(i)}</span>
        </span>
      </label>

      <!-- Shift light lives on the RPM page (it's an RPM threshold). Global
           cfg.shiftRpm; shown only when this page's big value is RPM. -->
      {#if page.ch[0] === Ch.RPM}
        <label class="row">
          <span>{t('monconfig.shift_light')} <span class="hint">{t('monconfig.rpm_zero_off')}</span></span>
          <span class="peak-row">
            <input type="number" min="0" max="12000" step="100" bind:value={cfg.shiftRpm} placeholder={t('monconfig.off')} />
            <span class="peak-unit">RPM</span>
          </span>
        </label>
      {/if}
    </div>
  {/each}

  <!-- per-quantity display units (the gauge converts at render time) -->
  <div class="card">
    <div class="bright-head"><span class="lbl">{t('monconfig.units')}</span></div>
    <div class="unit-system">
      <button type="button" class="chip" class:on={isMetric()}   onclick={() => setUnitSystem(false)}>{t('monconfig.metric')}</button>
      <button type="button" class="chip" class:on={isImperial()} onclick={() => setUnitSystem(true)}>{t('monconfig.imperial')}</button>
    </div>
    {#each UNIT_OPTIONS as row}
      <div class="unit-row">
        <span class="unit-lbl">{row.label}</span>
        <div class="unit-opts">
          {#each row.opts as opt, i}
            <button type="button" class="chip sm" class:on={(cfg.units?.[row.cls] ?? 0) === i}
                    onclick={() => setUnit(row.cls, i)}>{opt}</button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- add / remove pages (1..6) -->
  <div class="page-controls">
    <button class="pg-btn" onclick={removePage} disabled={cfg.pageCount <= 1} aria-label={t('monconfig.remove_page')}>−</button>
    <span class="pg-count">{cfg.pageCount > 1 ? t('monconfig.pages_other', { n: cfg.pageCount }) : t('monconfig.pages_one', { n: cfg.pageCount })}</span>
    <button class="pg-btn" onclick={addPage} disabled={cfg.pageCount >= GAUGE_PAGES} aria-label={t('monconfig.add_page')}>+</button>
  </div>

  <!-- global screen brightness (live-dims as you drag) -->
  <div class="card">
    <div class="bright-head">
      <span class="lbl">{t('monconfig.screen_brightness')}</span>
      <span class="bright-val">{Math.round(cfg.brightness / 255 * 100)}%</span>
    </div>
    <input class="bright-slider" type="range" min="8" max="255" value={cfg.brightness} oninput={onBrightness} />
  </div>

  <div class="savebar">
    {#if statusMsg}<span class="save-msg" class:err={statusMsg.startsWith('✗')}>{statusMsg}</span>{/if}
    <button class="save" onclick={save} disabled={saving}>{saving ? t('monconfig.saving') : t('monconfig.save_btn')}</button>
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
  .sw-row { display: flex; gap: 6px; align-items: center; }
  .swatch.txt::after { content: 'A'; position: absolute; inset: 0; display: grid; place-items: center;
    font-size: 11px; font-weight: 700; color: rgba(0,0,0,.55); pointer-events: none; }
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

  /* ---- add / remove pages ---- */
  .page-controls { display: flex; align-items: center; justify-content: center; gap: 18px; margin: 4px 0; }
  .pg-btn { width: 40px; height: 40px; border-radius: 999px; border: 1px solid var(--border);
    background: var(--surface-2); color: var(--fg); font-size: 22px; font-weight: 700; cursor: pointer; line-height: 1; }
  .pg-btn:disabled { opacity: .35; cursor: default; }
  .pg-count { font-size: 14px; color: var(--muted); min-width: 64px; text-align: center; }

  /* ---- unit pickers ---- */
  .unit-system { display: flex; gap: 8px; margin: 4px 0; }
  .unit-system .chip { flex: 1; }
  .unit-row { display: flex; align-items: center; justify-content: space-between;
              gap: 10px; padding: 7px 0; border-top: 0.5px solid var(--border); }
  .unit-lbl { font-size: 14px; color: var(--fg); }
  .unit-opts { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
          background: var(--surface-2); color: var(--muted); border: 1px solid var(--border);
          cursor: pointer; white-space: nowrap; }
  .chip.sm { padding: 5px 11px; font-size: 12px; }
  .chip.on { background: var(--accent); color: #000; border-color: var(--accent); }
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
  .gp-wrap { display: flex; justify-content: center; margin: 4px 0 10px; }
</style>
