<script lang="ts">
  // =====================================================================
  //  Drivetrain — pick your car so the AXIS Monitor computes the gear from
  //  YOUR gearbox (per-car calc-gear). Connects to the "AXIS Monitor" BLE
  //  peripheral (svc 7e1c0201), reads its GaugeCfg, fills the gear ratios /
  //  final drive / tyre from a Brand→Model→Year preset (293-car catalog),
  //  and writes the WHOLE cfg back — so channels/layout/colours the owner
  //  set elsewhere are preserved (read-modify-write).
  //
  //  This is the app half of the multi-car gear fix (node v0.5.5 + monitor
  //  v0.12.6): the monitor recomputes the sub-gear from these ratios instead
  //  of the node's generic baked table, so gear is right on any car.
  //
  //  Reached via Pro → Drivetrain. Holds its link in store.monClient so it
  //  survives navigation (like the gauge link).
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import {
    MonitorBleClient, type MonScanHit, type GaugeCfg, type CarId,
    defaultCfg, cfgValid,
  } from '../lib/monitorCfg';
  import {
    presetBrands, presetModels, presetsFor, presetById, DEFAULT_TIRE,
  } from '../lib/drivetrainPresets';
  import { t } from '../lib/i18n';
  import {
    GEAR_PROFILES, encodeGearProfile, gearProfileById, gearProfileForCar,
    DEFAULT_GEAR_PROFILE_ID,
  } from '../lib/gearProfiles';

  type Phase = 'idle' | 'scan' | 'connecting' | 'loading' | 'ready';
  let phase   = $state<Phase>('idle');
  let scanning = $state(false);
  let hits    = $state<MonScanHit[]>([]);
  let errMsg  = $state<string | null>(null);
  let statusMsg = $state<string | null>(null);
  let mon: MonitorBleClient | null = $state(null);
  let cfg = $state<GaugeCfg>(defaultCfg());
  let saving = $state(false);
  let demo = $state(false);   // app-wide knob demo → show the full picker offline

  // ---- preset picker state ----
  let presetBrand = $state('');
  let presetModel = $state('');
  let presetId    = $state('');
  const presetModelList = $derived(presetBrand ? presetModels(presetBrand) : []);
  const presetYearList  = $derived(presetBrand && presetModel ? presetsFor(presetBrand, presetModel) : []);
  const chosenPreset    = $derived(presetId ? presetById(presetId) : undefined);

  // ---- Real gear (GearProfile push 0xC0): pick the car so the sensor reads the
  //      car's TRUE P/R/N/D straight off CAN, not just the calculated gear. ----
  const GEAR_LS_KEY = 'axis.gearCar';
  let gearCarId = $state<string>(
    (() => { try { return localStorage.getItem(GEAR_LS_KEY) || DEFAULT_GEAR_PROFILE_ID; }
             catch { return DEFAULT_GEAR_PROFILE_ID; } })());
  let gearBusy = $state(false);
  let gearNote = $state('');
  const gearCar = $derived(gearProfileById(gearCarId));

  // ---- Auto-detect: the node decodes make+year from the VIN (0xB1 → car-ID char),
  //      the app picks the matching gear profile automatically — zero manual setup.
  let detectedCar  = $state<CarId | null>(null);   // {make,year} once the node has decoded it
  let autoPicked   = $state(false);                // true = the current profile was auto-chosen
  const detectedProfile = $derived(
    detectedCar ? gearProfileForCar(detectedCar.make, detectedCar.year) : undefined);

  async function sendGearProfile() {
    const p = gearCar;
    if (!p || gearBusy) return;
    try { localStorage.setItem(GEAR_LS_KEY, p.id); } catch { /* private mode */ }
    gearNote = '';
    if (!p.pushable) { gearNote = t('dt.err_needs_scan'); return; }
    if (demo || !mon) { gearNote = t('dt.connect_first'); return; }
    gearBusy = true;
    try {
      await mon.setGearProfile(encodeGearProfile(p));
      gearNote = t('dt.gear_sent', { name: p.name });
    } catch (e) { gearNote = '✗ ' + String((e as Error)?.message ?? e); }
    finally { gearBusy = false; }
  }

  // Reuse a live monitor link if one exists (came from another page); else scan.
  // In the app-wide knob DEMO (no real device), render the full picker offline —
  // the 293-car catalog is static, so everything but Save works with no monitor.
  $effect(() => {
    if (phase !== 'idle') return;
    if (store.monClient) { mon = store.monClient; void load(); }
    // No live monitor link — open the full 293-car picker offline (demo). This
    // covers the app-wide knob DEMO AND a hardware-less App Store reviewer who
    // never tapped DEMO MODE. A real monitor can still be linked from the ready
    // view via the "Connect your AXIS Monitor" button (goScan → scan card).
    else { demo = true; cfg = defaultCfg(); phase = 'ready'; }
  });

  // From the offline picker, drop into the scan card so a user WITH a monitor
  // can still find, connect and Save. Clears `demo` first so the subsequent
  // connectTo()/load() lands in a real (non-demo) ready view.
  function goScan() { demo = false; phase = 'scan'; }

  async function scan() {
    if (scanning) return;
    scanning = true; errMsg = null; statusMsg = null; hits = [];
    try {
      await MonitorBleClient.scan(h => { hits = [...hits, h]; }, 6000);
      if (hits.length === 0) errMsg = t('dt.no_monitor');
    } catch (e: any) { errMsg = e?.message ?? t('dt.scan_failed'); }
    finally { scanning = false; }
  }

  async function connectTo(id: string) {
    phase = 'connecting'; errMsg = null; statusMsg = null;
    try {
      const m = new MonitorBleClient(id);
      await m.connect(() => { store.monClient = null; mon = null; phase = 'scan'; statusMsg = t('dt.monitor_disconnected'); });
      mon = m; store.monClient = m;
      await load();
    } catch (e: any) {
      errMsg = e?.message ?? t('dt.connect_failed'); phase = 'scan';
    }
  }

  async function load() {
    if (!mon) return;
    phase = 'loading'; errMsg = null;
    try { cfg = await mon.config(); phase = 'ready'; }
    catch (e: any) { errMsg = e?.message ?? t('dt.read_failed'); phase = 'scan'; store.monClient = null; mon = null; return; }
    void detectCar();   // best-effort, after the cfg read; never blocks the ready view
  }

  // Read the VIN-decoded car identity and auto-select its gear profile. Best-effort:
  // an older node/monitor (no car-ID char) or a car the node hasn't decoded yet just
  // leaves the manual dropdown untouched. The physical car is authoritative, so a match
  // overrides the saved default — but a manual dropdown change afterwards still wins.
  async function detectCar() {
    if (!mon) return;
    try {
      const car = await mon.carId();
      if (!car.make) { detectedCar = null; return; }
      detectedCar = car;
      const p = gearProfileForCar(car.make, car.year);
      if (p && p.id !== gearCarId) { gearCarId = p.id; autoPicked = true; }
      else if (p) { autoPicked = true; }
    } catch { detectedCar = null; }
  }

  function onBrand() { presetModel = ''; presetId = ''; }
  function onModel() {
    presetId = '';
    const list = presetsFor(presetBrand, presetModel);
    if (list.length === 1) applyPreset(list[0].id);   // single variant → auto-apply
  }
  /** Fill the drivetrain fields from a preset. Tyre is auto-filled from the
   *  preset's stock size (or a base default) so the user starts from a real
   *  number and only tweaks if needed. CVT/eCVT presets (gearCount 0) only set
   *  the redline — no fixed gear to calculate. */
  function applyPreset(id: string) {
    const p = presetById(id);
    if (!p) return;
    presetId = id;
    cfg.rpmLimit = p.redline;
    if (p.shiftRpm) cfg.shiftRpm = p.shiftRpm;
    const tire = p.tire ?? DEFAULT_TIRE;   // auto-fill base tyre (owner 2026-07-26)
    cfg.tireWidth = tire[0]; cfg.tireAspect = tire[1]; cfg.tireRim = tire[2];
    if (p.gearCount >= 1 && p.ratios.length === p.gearCount) {
      const r = [...p.ratios];
      while (r.length < 8) r.push(0);
      cfg.gearCount  = p.gearCount;
      cfg.gearRatios = r.slice(0, 8);
      cfg.finalDrive = p.finalDrive;
    } else {
      cfg.gearCount = 0;   // CVT/eCVT → the gauge shows a constant "CVT" label
    }
  }

  async function save() {
    if (saving) return;
    if (demo || !mon) { statusMsg = t('dt.demo_save'); return; }
    if (!cfgValid(cfg)) { statusMsg = t('dt.out_of_range'); return; }
    saving = true; statusMsg = t('dt.saving');
    try {
      await mon.setConfig(cfg);
      statusMsg = t('dt.saved');
    } catch (e: any) {
      statusMsg = '✗ ' + (e?.message ?? t('dt.save_failed'));
    } finally { saving = false; }
  }
</script>

<PageHeader title={t('dt.title')} back="axis" backLabel="AXIS" />

{#if phase === 'scan' || phase === 'idle'}
  <div class="card">
    <p class="sub">{@html t('dt.scan_intro')}</p>
    <button class="ghost wide" onclick={scan} disabled={scanning}>{scanning ? t('dt.scanning') : t('dt.scan_btn')}</button>
    {#each hits as h (h.id)}
      <button class="ghost wide hit" onclick={() => connectTo(h.id)}>{h.name}</button>
    {/each}
    {#if errMsg}<p class="note">{errMsg}</p>{/if}
    {#if statusMsg}<p class="note">{statusMsg}</p>{/if}
  </div>
{:else if phase === 'connecting' || phase === 'loading'}
  <div class="card"><p class="sub">{phase === 'connecting' ? t('dt.connecting') : t('dt.reading')}</p></div>
{:else if phase === 'ready'}
  <!-- Pick the car: Brand → Model → Year -->
  <div class="card">
    <div class="head"><strong>{t('dt.your_car')}</strong>
      <span class="badge" class:online={!demo} class:demo={demo}>{demo ? t('dt.demo') : t('dt.connected')}</span></div>
    <p class="sub dim">{t('dt.ready_intro')}{#if demo}{@html t('dt.demo_suffix')}{/if}</p>

    <label class="row"><span>{t('dt.brand')}</span>
      <select bind:value={presetBrand} onchange={onBrand}>
        <option value="">{t('dt.choose')}</option>
        {#each presetBrands() as b}<option value={b}>{b}</option>{/each}
      </select>
    </label>
    {#if presetBrand}
      <label class="row"><span>{t('dt.model')}</span>
        <select bind:value={presetModel} onchange={onModel}>
          <option value="">{t('dt.choose')}</option>
          {#each presetModelList as m}<option value={m}>{m}</option>{/each}
        </select>
      </label>
    {/if}
    {#if presetModel && presetYearList.length > 1}
      <label class="row"><span>{t('dt.year_trim')}</span>
        <select value={presetId} onchange={(e) => applyPreset((e.currentTarget as HTMLSelectElement).value)}>
          <option value="">{t('dt.choose')}</option>
          {#each presetYearList as p (p.id)}<option value={p.id}>{p.years}</option>{/each}
        </select>
      </label>
    {/if}
    {#if chosenPreset}
      <p class="sub dim chosen">
        <b>{chosenPreset.trans}{chosenPreset.verified ? ' ✓' : ''}</b> ·
        {chosenPreset.gearCount >= 1 ? t('dt.n_speed', { n: chosenPreset.gearCount }) : t('dt.no_gears')}{#if chosenPreset.note} · {chosenPreset.note}{/if}
      </p>
    {/if}

    <!-- Tyre size — the one thing the user must enter -->
    <label class="row"><span>{t('dt.tyre_size')}</span>
      <span class="tyre">
        <input type="number" min="100" max="400" step="5" bind:value={cfg.tireWidth} />/
        <input type="number" min="20" max="90" step="5" bind:value={cfg.tireAspect} />R
        <input type="number" min="10" max="26" step="1" bind:value={cfg.tireRim} />
      </span>
    </label>

    <!-- Vehicle weight — powers the VirtualDyno Power/Torque channels -->
    <label class="row"><span>{t('dt.weight')}<br><small class="hint">{t('dt.weight_hint')}</small></span>
      <input type="number" min="300" max="6000" step="10" bind:value={cfg.massKg} />
    </label>

    <details class="adv">
      <summary>{t('dt.advanced')}</summary>
      <label class="row"><span>{t('dt.redline')}</span>
        <input type="number" min="1000" max="12000" step="100" bind:value={cfg.rpmLimit} /></label>
      <label class="row"><span>{t('dt.fwd_gears')}</span>
        <select bind:value={cfg.gearCount}>{#each [4,5,6,7,8] as n}<option value={n}>{n}</option>{/each}</select></label>
      <div class="ratios-h">{t('dt.gear_ratios')}</div>
      <div class="ratios">
        {#each Array(cfg.gearCount) as _, i}
          <label class="rr"><span>G{i + 1}</span>
            <input type="number" min="0" max="20" step="0.001" bind:value={cfg.gearRatios[i]} /></label>
        {/each}
      </div>
      <label class="row"><span>{t('dt.final_drive')}</span>
        <input type="number" min="0.5" max="10" step="0.001" bind:value={cfg.finalDrive} /></label>
    </details>

    <p class="hint">{@html t('dt.hint')}</p>
  </div>

  <!-- Real gear — push the car's TRUE-selector decode profile to the sensor -->
  <div class="card">
    <strong>{t('dt.real_gear')}</strong>
    <p class="sub dim" style="margin-top:6px;">{@html t('dt.real_gear_intro')}</p>
    {#if detectedCar}
      <p class="detected" class:matched={!!detectedProfile}>
        🚗 <b>{detectedCar.make}{detectedCar.year ? ' ' + detectedCar.year : ''}</b>
        {#if detectedProfile && autoPicked}· auto-selected <b>{detectedProfile.name}</b>{:else if detectedProfile}· matches <b>{detectedProfile.name}</b>{:else}· no gear profile yet for this model — pick one below{/if}
      </p>
    {/if}
    <select class="gear-select" bind:value={gearCarId} disabled={gearBusy || demo} onchange={() => autoPicked = false}>
      {#each GEAR_PROFILES as p (p.id)}
        <option value={p.id} disabled={!p.pushable}>{p.name}{p.verified ? ' ✓' : p.pushable ? '' : t('dt.needs_scan_opt')}</option>
      {/each}
    </select>
    {#if gearCar}
      <p class="sub dim" style="margin-top:6px;line-height:1.4;"><b>{gearCar.platform}</b>{#if gearCar.note} · {gearCar.note}{/if}</p>
    {/if}
    <button class="ghost wide" onclick={sendGearProfile} disabled={gearBusy || demo || !gearCar?.pushable}>
      {gearBusy ? t('dt.sending') : demo ? t('dt.connect_to_send') : t('dt.send_sensor')}
    </button>
    {#if gearNote}<p class="note">{gearNote}</p>{/if}
  </div>

  {#if demo}
    <!-- Offline picker: a user who actually has a monitor can link it here to Save. -->
    <button class="ghost wide" onclick={goScan}>{t('dt.connect_monitor')}</button>
  {/if}

  <div class="savebar">
    {#if statusMsg}<span class="save-msg" class:err={statusMsg.startsWith('✗')}>{statusMsg}</span>{/if}
    <button class="save" onclick={save} disabled={saving}>{saving ? t('dt.saving_btn') : t('dt.save_monitor')}</button>
  </div>
{/if}

<style>
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-4); }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s-2); }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: .5px; border-radius: 999px; padding: 2px 8px; }
  .badge.online { color: #000; background: var(--accent); }
  .badge.demo { color: #000; background: var(--accent); opacity: .75; }
  .sub { color: var(--muted); font-size: 13px; margin: 0 0 var(--s-3); }
  .sub.dim { opacity: .75; }
  .chosen { margin-top: 6px; line-height: 1.4; }
  .note { font-size: 13px; color: var(--fg); margin: var(--s-2) 0; }
  .detected { font-size: 13px; color: var(--muted); margin: var(--s-2) 0 0;
    padding: 8px 10px; border-radius: 8px; background: var(--surface-2);
    border: 1px solid var(--border); line-height: 1.4; }
  .detected.matched { color: var(--fg); border-color: var(--accent, #cea24a); }
  .detected b { color: var(--fg); font-weight: 600; }
  .hint { opacity: .6; font-size: 12px; margin-top: var(--s-3); line-height: 1.45; }

  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 10px; }
  .row > span:first-child { font-size: 14px; }
  select, input[type=number] { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
                               border-radius: 8px; padding: 7px 9px; font-size: 14px; }
  .row > select { width: 62%; }
  .row > input[type=number] { width: 96px; text-align: right; }
  .tyre { display: flex; align-items: center; gap: 4px; }
  .tyre input { width: 54px; text-align: right; }

  .adv { margin-top: var(--s-3); }
  .adv summary { cursor: pointer; font-size: 13px; color: var(--muted); }
  .ratios-h { margin-top: 12px; opacity: .85; font-size: 12px; }
  .ratios { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; margin-top: 6px; }
  .rr { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .rr span { opacity: .7; font-size: 13px; }
  .rr input { width: 80px; text-align: right; }

  .ghost { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
           border-radius: var(--radius); padding: 10px 14px; font-size: 14px; cursor: pointer; }
  .ghost:disabled { opacity: .4; cursor: default; }
  .ghost.wide { width: 100%; margin-top: var(--s-2); }
  .hit { text-align: left; }
  .gear-select { width: 100%; margin-top: 8px; background: var(--surface-2); border: 1px solid var(--border);
                 color: var(--fg); border-radius: 8px; padding: 9px 10px; font-size: 14px; }

  .savebar { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: flex-end; gap: 12px;
             padding: var(--s-3) 0; }
  .save-msg { font-size: 12px; color: var(--muted); }
  .save-msg.err { color: #e24b4a; }
  .save { background: var(--accent); color: #000; border: 0; border-radius: var(--radius); padding: 11px 20px;
          font-size: 14px; font-weight: 600; cursor: pointer; }
  .save:disabled { opacity: .5; cursor: default; }
</style>
