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
    MonitorBleClient, type MonScanHit, type GaugeCfg,
    defaultCfg, cfgValid,
  } from '../lib/monitorCfg';
  import {
    presetBrands, presetModels, presetsFor, presetById,
  } from '../lib/drivetrainPresets';
  import {
    GEAR_PROFILES, encodeGearProfile, gearProfileById, DEFAULT_GEAR_PROFILE_ID,
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

  async function sendGearProfile() {
    const p = gearCar;
    if (!p || gearBusy) return;
    try { localStorage.setItem(GEAR_LS_KEY, p.id); } catch { /* private mode */ }
    gearNote = '';
    if (!p.pushable) { gearNote = 'This car needs an in-car gear scan before it can be sent.'; return; }
    if (demo || !mon) { gearNote = 'Connect your AXIS Monitor first.'; return; }
    gearBusy = true;
    try {
      await mon.setGearProfile(encodeGearProfile(p));
      gearNote = `✓ Sent "${p.name}" — the sensor now decodes its real gear.`;
    } catch (e) { gearNote = '✗ ' + String((e as Error)?.message ?? e); }
    finally { gearBusy = false; }
  }

  // Reuse a live monitor link if one exists (came from another page); else scan.
  // In the app-wide knob DEMO (no real device), render the full picker offline —
  // the 293-car catalog is static, so everything but Save works with no monitor.
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

  function onBrand() { presetModel = ''; presetId = ''; }
  function onModel() {
    presetId = '';
    const list = presetsFor(presetBrand, presetModel);
    if (list.length === 1) applyPreset(list[0].id);   // single variant → auto-apply
  }
  /** Fill the drivetrain fields from a preset (tyre left for the user). CVT/eCVT
   *  presets (gearCount 0) only set the redline — no fixed gear to calculate. */
  function applyPreset(id: string) {
    const p = presetById(id);
    if (!p) return;
    presetId = id;
    cfg.rpmLimit = p.redline;
    if (p.shiftRpm) cfg.shiftRpm = p.shiftRpm;
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
    if (demo || !mon) { statusMsg = 'Demo mode — connect your AXIS Monitor to save this car.'; return; }
    if (!cfgValid(cfg)) { statusMsg = '✗ Some values are out of range — check the Advanced fields.'; return; }
    saving = true; statusMsg = 'Saving to the monitor…';
    try {
      await mon.setConfig(cfg);
      statusMsg = '✓ Saved. The gauge now computes the gear from this car.';
    } catch (e: any) {
      statusMsg = '✗ ' + (e?.message ?? 'Save failed');
    } finally { saving = false; }
  }
</script>

<PageHeader title="Drivetrain" back="pro" backLabel="Pro" />

{#if phase === 'scan' || phase === 'idle'}
  <div class="card">
    <p class="sub">Pick your car so the gauge works out the gear from <b>your</b> gearbox — not a generic table. Connect your <b>AXIS Monitor</b> first.</p>
    <button class="ghost wide" onclick={scan} disabled={scanning}>{scanning ? 'Scanning…' : 'Scan for AXIS Monitor'}</button>
    {#each hits as h (h.id)}
      <button class="ghost wide hit" onclick={() => connectTo(h.id)}>{h.name}</button>
    {/each}
    {#if errMsg}<p class="note">{errMsg}</p>{/if}
    {#if statusMsg}<p class="note">{statusMsg}</p>{/if}
  </div>
{:else if phase === 'connecting' || phase === 'loading'}
  <div class="card"><p class="sub">{phase === 'connecting' ? 'Connecting to monitor…' : 'Reading config…'}</p></div>
{:else if phase === 'ready'}
  <!-- Pick the car: Brand → Model → Year -->
  <div class="card">
    <div class="head"><strong>Your car</strong>
      <span class="badge" class:online={!demo} class:demo={demo}>{demo ? 'DEMO' : 'CONNECTED'}</span></div>
    <p class="sub dim">Pick your car and enter your tyre size — the gear ratios fill in for you.{#if demo} <b>Demo</b> — connect your AXIS Monitor to save.{/if}</p>

    <label class="row"><span>Brand</span>
      <select bind:value={presetBrand} onchange={onBrand}>
        <option value="">Choose…</option>
        {#each presetBrands() as b}<option value={b}>{b}</option>{/each}
      </select>
    </label>
    {#if presetBrand}
      <label class="row"><span>Model</span>
        <select bind:value={presetModel} onchange={onModel}>
          <option value="">Choose…</option>
          {#each presetModelList as m}<option value={m}>{m}</option>{/each}
        </select>
      </label>
    {/if}
    {#if presetModel && presetYearList.length > 1}
      <label class="row"><span>Year / trim</span>
        <select value={presetId} onchange={(e) => applyPreset((e.currentTarget as HTMLSelectElement).value)}>
          <option value="">Choose…</option>
          {#each presetYearList as p (p.id)}<option value={p.id}>{p.years}</option>{/each}
        </select>
      </label>
    {/if}
    {#if chosenPreset}
      <p class="sub dim chosen">
        <b>{chosenPreset.trans}{chosenPreset.verified ? ' ✓' : ''}</b> ·
        {chosenPreset.gearCount >= 1 ? `${chosenPreset.gearCount}-speed` : 'no fixed gears — the gauge shows “CVT”'}{#if chosenPreset.note} · {chosenPreset.note}{/if}
      </p>
    {/if}

    <!-- Tyre size — the one thing the user must enter -->
    <label class="row"><span>Tyre size</span>
      <span class="tyre">
        <input type="number" min="100" max="400" step="5" bind:value={cfg.tireWidth} />/
        <input type="number" min="20" max="90" step="5" bind:value={cfg.tireAspect} />R
        <input type="number" min="10" max="26" step="1" bind:value={cfg.tireRim} />
      </span>
    </label>

    <!-- Vehicle weight — powers the VirtualDyno Power/Torque channels -->
    <label class="row"><span>Weight (kg)<br><small class="hint">incl. driver — used for Power/Torque</small></span>
      <input type="number" min="300" max="6000" step="10" bind:value={cfg.massKg} />
    </label>

    <details class="adv">
      <summary>Advanced — enter values by hand</summary>
      <label class="row"><span>Redline (RPM)</span>
        <input type="number" min="1000" max="12000" step="100" bind:value={cfg.rpmLimit} /></label>
      <label class="row"><span>Forward gears</span>
        <select bind:value={cfg.gearCount}>{#each [4,5,6,7,8] as n}<option value={n}>{n}</option>{/each}</select></label>
      <div class="ratios-h">Gear ratios</div>
      <div class="ratios">
        {#each Array(cfg.gearCount) as _, i}
          <label class="rr"><span>G{i + 1}</span>
            <input type="number" min="0" max="20" step="0.001" bind:value={cfg.gearRatios[i]} /></label>
        {/each}
      </div>
      <label class="row"><span>Final drive</span>
        <input type="number" min="0.5" max="10" step="0.001" bind:value={cfg.finalDrive} /></label>
    </details>

    <p class="hint">The gear is calculated from RPM + speed using these ratios, final drive and tyre size. If the gear reads a step high/low, nudge <b>Final drive</b>.</p>
  </div>

  <!-- Real gear — push the car's TRUE-selector decode profile to the sensor -->
  <div class="card">
    <strong>Real gear (car model)</strong>
    <p class="sub dim" style="margin-top:6px;">Pick your car so the sensor reads the <b>real</b> P/R/N/D straight off the car's computer — not just the calculated gear. Sent to the sensor and remembered.</p>
    <select class="gear-select" bind:value={gearCarId} disabled={gearBusy || demo}>
      {#each GEAR_PROFILES as p (p.id)}
        <option value={p.id} disabled={!p.pushable}>{p.name}{p.verified ? ' ✓' : p.pushable ? '' : ' (needs in-car scan)'}</option>
      {/each}
    </select>
    {#if gearCar}
      <p class="sub dim" style="margin-top:6px;line-height:1.4;"><b>{gearCar.platform}</b>{#if gearCar.note} · {gearCar.note}{/if}</p>
    {/if}
    <button class="ghost wide" onclick={sendGearProfile} disabled={gearBusy || demo || !gearCar?.pushable}>
      {gearBusy ? 'Sending…' : demo ? 'Connect a monitor to send' : 'Send to sensor'}
    </button>
    {#if gearNote}<p class="note">{gearNote}</p>{/if}
  </div>

  <div class="savebar">
    {#if statusMsg}<span class="save-msg" class:err={statusMsg.startsWith('✗')}>{statusMsg}</span>{/if}
    <button class="save" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to monitor'}</button>
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
