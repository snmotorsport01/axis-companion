<script lang="ts">
  // =====================================================================
  //  Diagnostics — the founder/monitor diagnostics surface ported into the
  //  SN AXIS companion. Talks to the SAME connected AXIS Gauge over its
  //  founder BLE service (7e1c020x), which the gauge exposes alongside the
  //  config service (7e1c0101). Reuses store.gaugeClient — no rescan.
  //
  //  Cards (all offline / on-device — no backend):
  //    · Fault codes  — read the car's live stored DTCs + clear them, plus a
  //      manual OBD-II code lookup, each explained in plain English.
  //    · Acceleration times — the gauge's ACCEL TIMER best runs.
  //    · Bus capture (RE)   — record every CAN frame on the OBD port →
  //      download a SavvyCAN CSV to reverse-engineer signals ourselves.
  //    · Node log / Drive log — pull the on-device diagnostic + recorder files.
  //
  //  Reached via Pro → Diagnostics. Opened without a live gauge link it
  //  shows a connect prompt (the features all need the car in the loop).
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import type { AccelTimes } from '../lib/gaugeBleClient';
  import { richDtc, SEVERITY_META, type DtcRich } from '../lib/dtcRich';
  import { parseCanLog, toSavvyCanCsv, canLogStats } from '../lib/canLog';
  import { parseDriveLog, toCsv, driveLogName, saveTextFile } from '../lib/driveLog';

  const gauge = $derived(store.gaugeClient);

  // ---- Fault codes: manual lookup ----
  let dtcInput  = $state('');
  let dtcResult = $state<DtcRich | null>(null);
  let dtcErr    = $state('');
  function lookupDtc() {
    const r = richDtc(dtcInput);
    if (!r) { dtcErr = 'Enter a code like P0301, P0420, U0100…'; dtcResult = null; return; }
    dtcErr = ''; dtcResult = r;
  }
  const toRich = (codes: string[]): DtcRich[] =>
    codes.map((c) => richDtc(c)).filter((x): x is DtcRich => !!x);

  // ---- Fault codes: read / clear the car's ACTUAL stored codes ----
  let carCodes = $state<DtcRich[]>([]);
  let carMil   = $state(false);
  let carRead  = $state(false);
  let carCond  = $state<{ rpm: number; coolant: number; load: number } | null>(null);
  let dtcBusy  = $state(false);
  let carMsg   = $state('');
  async function readCarCodes() {
    if (!gauge || dtcBusy) return;
    dtcBusy = true; carMsg = 'Reading the car…';
    try {
      const snap = await gauge.readDtcCodes();
      carCodes = toRich(snap.codes);
      carMil = snap.mil; carRead = true; carCond = snap.conditions ?? null;
      carMsg = snap.count === 0 ? '' : `${snap.count} stored code${snap.count === 1 ? '' : 's'}`;
    } catch (e) { carMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { dtcBusy = false; }
  }
  async function clearCarCodes() {
    if (!gauge || dtcBusy) return;
    if (!confirm('Clear all stored codes and turn off the check-engine light? The car must be running / in READY.')) return;
    dtcBusy = true; carMsg = 'Clearing…';
    try {
      await gauge.clearDtcCodes();
      await new Promise((r) => setTimeout(r, 2500));   // let the node run Mode-04 + rescan
      const snap = await gauge.readDtcCodes();
      carCodes = toRich(snap.codes);
      carMil = snap.mil; carRead = true; carCond = snap.conditions ?? null;
      carMsg = snap.count === 0
        ? '✓ Cleared — no codes remain'
        : `${snap.count} code${snap.count === 1 ? '' : 's'} still present (fault may be active, or the gateway blocked the clear)`;
    } catch (e) { carMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { dtcBusy = false; }
  }
  function deepDive(r: DtcRich) {
    const q = encodeURIComponent(`${r.code} ${r.headline} — causes and step-by-step DIY diagnosis`);
    window.open(`https://www.google.com/search?q=${q}`, '_blank');
  }

  // ---- Acceleration best times ----
  const SPEED_LABELS = ['0-100 km/h', '100-200 km/h', '200-300 km/h'];
  const DIST_LABELS  = ['60 ft', '201 m (1/8 mi)', '402 m (1/4 mi)'];
  const fmtT = (ms: number | null) => (ms == null ? '—' : (ms / 1000).toFixed(2) + ' s');
  let accelTimes = $state<AccelTimes | null>(null);
  let accelBusy  = $state(false);
  let accelMsg   = $state('');
  async function readAccelTimes() {
    if (!gauge || accelBusy) return;
    accelBusy = true; accelMsg = 'Reading…';
    try { accelTimes = await gauge.readAccelTimes(); accelMsg = ''; }
    catch (e) { accelMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { accelBusy = false; }
  }
  const accelHasAny = (t: AccelTimes | null) =>
    !!t && [...t.speed, ...t.dist].some((e) => e.ms != null);
  async function downloadAccelCsv() {
    if (!accelTimes) return;
    const rows = ['category,target,seconds,trap_kmh'];
    accelTimes.speed.forEach((e, i) =>
      rows.push(`speed,${SPEED_LABELS[i]},${e.ms == null ? '' : (e.ms / 1000).toFixed(2)},`));
    accelTimes.dist.forEach((e, i) =>
      rows.push(`distance,${DIST_LABELS[i]},${e.ms == null ? '' : (e.ms / 1000).toFixed(2)},${e.trapKmh ?? ''}`));
    await saveTextFile('axis-accel-times.csv', 'text/csv', rows.join('\n'));
  }

  // ---- Bus capture (raw CAN → SavvyCAN CSV) ----
  let canCapturing = $state(false);
  let canBusy = $state(false);
  let canPct  = $state(0);
  let canMsg  = $state('');
  async function refreshCanState() {
    if (!gauge) return;
    try { const info = await gauge.canLogInfo(); canCapturing = info.capturing;
      canMsg = info.count ? `${info.count} frames captured` : ''; }
    catch { /* older fw without the char */ }
  }
  async function toggleCanCapture() {
    if (!gauge || canBusy) return;
    canBusy = true; canMsg = canCapturing ? 'Stopping…' : 'Starting…';
    try {
      await gauge.setCanCapture(!canCapturing);
      canCapturing = !canCapturing;
      canMsg = canCapturing ? '● Capturing — drive, then Stop + Download.' : 'Stopped.';
    } catch (e) { canMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { canBusy = false; }
  }
  async function downloadCanCsv() {
    if (!gauge || canBusy) return;
    canBusy = true; canPct = 0; canMsg = 'Pulling capture…';
    try {
      const buf = await gauge.pullCanLog((p) => (canPct = p));
      const frames = parseCanLog(buf);
      if (!frames.length) { canMsg = 'Capture was empty.'; return; }
      const s = canLogStats(frames);
      await saveTextFile('axis-buscapture.csv', 'text/csv', toSavvyCanCsv(frames));
      canMsg = `✓ ${s.frames} frames · ${s.ids} IDs · ${s.spanS}s — open in SavvyCAN`;
    } catch (e) { canMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { canBusy = false; canPct = 0; }
  }
  async function eraseCanLog() {
    if (!gauge || canBusy) return;
    if (!confirm('Erase the captured CAN log on the gauge?')) return;
    canBusy = true;
    try { await gauge.eraseCanLog(); canMsg = 'Capture erased.'; }
    catch (e) { canMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { canBusy = false; }
  }

  // ---- Node log ----
  let nlogBusy = $state(false);
  let nlogPct  = $state(0);
  let nlogMsg  = $state('');
  async function downloadNodeLog() {
    if (!gauge || nlogBusy) return;
    nlogBusy = true; nlogPct = 0; nlogMsg = 'Pulling…';
    try {
      const text = await gauge.pullNodeLog((p) => (nlogPct = p));
      if (!text) { nlogMsg = 'No node log captured yet.'; return; }
      await saveTextFile('axis-nodelog.txt', 'text/plain', text);
      nlogMsg = `✓ ${text.length} bytes saved`;
    } catch (e) { nlogMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { nlogBusy = false; nlogPct = 0; }
  }
  async function eraseNodeLog() {
    if (!gauge || nlogBusy) return;
    if (!confirm('Erase the node log on the gauge?')) return;
    nlogBusy = true;
    try { await gauge.eraseNodeLog(); nlogMsg = 'Node log erased.'; }
    catch (e) { nlogMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { nlogBusy = false; }
  }

  // ---- Drive log ----
  let logBusy = $state(false);
  let logPct  = $state(0);
  let logMsg  = $state('');
  async function pullDriveLog() {
    if (!gauge || logBusy) return;
    logBusy = true; logPct = 0; logMsg = 'Pulling…';
    try {
      const buf = await gauge.pullLog((p) => (logPct = p));
      const log = parseDriveLog(buf);
      await saveTextFile(driveLogName(log), 'text/csv', toCsv(log));
      logMsg = `✓ ${log.samples.length} samples saved`;
    } catch (e) { logMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { logBusy = false; logPct = 0; }
  }
  async function eraseDriveLog() {
    if (!gauge || logBusy) return;
    if (!confirm('Erase the drive log on the gauge?')) return;
    logBusy = true;
    try { await gauge.eraseLog(); logMsg = 'Drive log erased.'; }
    catch (e) { logMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { logBusy = false; }
  }
</script>

<PageHeader title="Diagnostics" back="pro" backLabel="Pro" />

{#snippet richCard(r: DtcRich)}
    <div class="rc" style="--sev:{SEVERITY_META[r.severity].color}">
      <div class="rc-top">
        <span class="rc-code">{r.code}</span>
        <span class="rc-badge">{SEVERITY_META[r.severity].label}</span>
      </div>
      <p class="rc-headline">{r.headline}</p>
      <p class="rc-sys">{r.systemShort}</p>

      <p class="rc-section">Symptoms you'll actually feel</p>
      <ul class="rc-list">{#each r.symptoms as s}<li>{s}</li>{/each}</ul>

      <div class="rc-drive">{r.drive}</div>

      <p class="rc-section">Most likely causes</p>
      <ol class="rc-causes">
        {#each r.causes as c, i}<li><span class="rc-num">{i + 1}</span><span>{c}</span></li>{/each}
      </ol>

      <p class="rc-section">What to check / try first</p>
      <ul class="rc-fixes">{#each r.fixes as f}<li>{f}</li>{/each}</ul>

      {#if !r.known}<p class="sub dim">Shown from the code structure — not in the built-in list.</p>{/if}
      <button class="rc-ai" onclick={() => deepDive(r)}>Search more detail &amp; videos ↗</button>
    </div>
  {/snippet}

  <!-- Fault codes: read from car (needs gauge) + manual lookup (always offline) -->
  <details class="card fw-card" open>
    <summary>Fault codes</summary>
    {#if gauge}
      <p class="sub dim">Read the trouble codes your car has stored right now — the gauge pulls them from the car and explains each one in plain English.</p>
      <div class="dtc-row">
        <button class="ghost" onclick={readCarCodes} disabled={dtcBusy}>
          {carRead ? 'Re-read from car' : 'Read codes from car'}
        </button>
        {#if carRead && (carCodes.length > 0 || carMil)}
          <button class="ghost" style="color:#e24b4a" onclick={clearCarCodes} disabled={dtcBusy}>Clear codes</button>
        {/if}
      </div>
      {#if carMsg}<p class="note">{carMsg}</p>{/if}
      {#if carRead && carCodes.length === 0 && !carMsg}
        <p class="sub" style="color:#3b9c4f">✓ No stored codes — your car is clean.</p>
      {/if}
      {#if carCond && carCodes.length > 0}
        <div class="rc-chips">
          <span class="rc-chip">Now · RPM {carCond.rpm}</span>
          <span class="rc-chip">Coolant {carCond.coolant}°C</span>
          <span class="rc-chip">Load {carCond.load}%</span>
        </div>
      {/if}
      {#each carCodes as r (r.code)}{@render richCard(r)}{/each}
      <p class="sub dim" style="margin-top:16px">Or look up any code by hand:</p>
    {:else}
      <p class="sub dim">Type an OBD-II trouble code (from a scan or your dash) to see what it means. Offline; plain English. Connect your AXIS Gauge to read the car's live codes.</p>
    {/if}
    <div class="dtc-row">
      <input class="fw-input dtc-input" type="text" placeholder="e.g. P0301" bind:value={dtcInput}
             maxlength="5" onkeydown={(e) => { if (e.key === 'Enter') lookupDtc(); }} />
      <button class="ghost" onclick={lookupDtc}>Look up</button>
    </div>
    {#if dtcErr}<p class="note">{dtcErr}</p>{/if}
    {#if dtcResult}{@render richCard(dtcResult)}{/if}
  </details>

  {#if !gauge}
    <div class="card">
      <p class="sub">Live times, bus capture and logs read from the car — connect your AXIS Gauge to use them.</p>
      <button class="ghost wide" onclick={() => (store.page = 'gaugesetup')}>Go to Gauge →</button>
    </div>
  {:else}
  <!-- Acceleration best times -->
  <details class="card fw-card">
    <summary>Acceleration times</summary>
    <p class="sub dim">Your best runs from the gauge's <b>ACCEL TIMER</b> menu — saved on the gauge and read here.</p>
    <div class="dtc-row">
      <button class="ghost" onclick={readAccelTimes} disabled={accelBusy}>
        {accelTimes ? 'Refresh' : 'Read best times'}
      </button>
      {#if accelHasAny(accelTimes)}
        <button class="ghost" onclick={downloadAccelCsv}>Download CSV</button>
      {/if}
    </div>
    {#if accelMsg}<p class="note">{accelMsg}</p>{/if}
    {#if accelTimes}
      <table class="acc-tbl"><tbody>
        <tr><td class="acc-h" colspan="2">By speed</td></tr>
        {#each accelTimes.speed as e, i}
          <tr><td>{SPEED_LABELS[i]}</td><td class="acc-v">{fmtT(e.ms)}</td></tr>
        {/each}
        <tr><td class="acc-h" colspan="2">By distance</td></tr>
        {#each accelTimes.dist as e, i}
          <tr><td>{DIST_LABELS[i]}</td>
            <td class="acc-v">{fmtT(e.ms)}{#if e.ms != null && e.trapKmh} · {e.trapKmh} km/h{/if}</td></tr>
        {/each}
      </tbody></table>
      {#if !accelHasAny(accelTimes)}
        <p class="sub dim">No runs saved yet — arm a run from the gauge's ACCEL TIMER menu.</p>
      {/if}
    {/if}
  </details>

  <!-- Bus capture — raw CAN logger → SavvyCAN CSV for RE -->
  <details class="card fw-card" ontoggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) refreshCanState(); }}>
    <summary>Bus capture (RE)</summary>
    <p class="sub dim">
      Records <b>every CAN frame</b> on the car's OBD port to reverse-engineer signals.
      Start, drive, then download a <b>SavvyCAN CSV</b>. (Only OBD-port traffic — internal
      buses are gateway-isolated.)
    </p>
    <div class="dtc-row">
      <button class="ghost" style={canCapturing ? 'color:#e24b4a' : ''} onclick={toggleCanCapture} disabled={canBusy}>
        {canCapturing ? '● Stop capture' : 'Start capture'}
      </button>
      <button class="ghost" onclick={downloadCanCsv} disabled={canBusy}>Download CSV</button>
    </div>
    {#if canBusy && canPct > 0}<div class="fw-bar"><div class="fw-fill" style="width:{canPct}%"></div></div>{/if}
    {#if canMsg}<p class="note">{canMsg}</p>{/if}
    <div class="dtc-row"><button class="ghost" onclick={eraseCanLog} disabled={canBusy}>Erase capture</button></div>
  </details>

  <!-- Node log -->
  <details class="card fw-card">
    <summary>Node log (diagnostics)</summary>
    <p class="sub dim">The CAN node's captured diagnostic log — RE probes, bus events. Pull it as text.</p>
    {#if nlogBusy && nlogPct > 0}<div class="fw-bar"><div class="fw-fill" style="width:{nlogPct}%"></div></div>{/if}
    {#if nlogMsg}<p class="note">{nlogMsg}</p>{/if}
    <div class="fw-actions">
      <button class="fw-install up" onclick={downloadNodeLog} disabled={nlogBusy}>
        {nlogBusy ? `Pulling… ${nlogPct}%` : 'Download log (.txt)'}
      </button>
      <button class="ghost" onclick={eraseNodeLog} disabled={nlogBusy}>Erase</button>
    </div>
  </details>

  <!-- Drive log -->
  <details class="card fw-card">
    <summary>Drive log</summary>
    <p class="sub dim">
      Records your drive on the gauge when you tap <b>RECORD</b> in its menu.
      Pull it here to save a spreadsheet (CSV) of every reading over time.
    </p>
    {#if logBusy && logPct > 0}<div class="fw-bar"><div class="fw-fill" style="width:{logPct}%"></div></div>{/if}
    {#if logMsg}<p class="note">{logMsg}</p>{/if}
    <div class="fw-actions">
      <button class="fw-install up" onclick={pullDriveLog} disabled={logBusy}>
        {logBusy ? `Pulling… ${logPct}%` : 'Download CSV'}
      </button>
      <button class="ghost" onclick={eraseDriveLog} disabled={logBusy}>Erase</button>
    </div>
  </details>
{/if}

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--s-4);
  }
  .sub { color: var(--muted); font-size: 13px; margin: 0 0 var(--s-3); }
  .sub.dim { opacity: 0.7; }
  .note { font-size: 13px; color: var(--fg); margin: var(--s-2) 0; }

  .dtc-row { display: flex; gap: var(--s-2); margin: var(--s-2) 0; }
  .dtc-input { flex: 1; text-transform: uppercase; }

  /* rich fault-code card */
  .rc { border: 1px solid var(--border); border-left: 3px solid var(--sev);
        border-radius: var(--radius); padding: var(--s-3) var(--s-4); margin: var(--s-3) 0; }
  .rc-top { display: flex; align-items: center; gap: var(--s-2); }
  .rc-code { font-family: var(--font-mono); font-size: 19px; font-weight: 700; color: var(--fg); }
  .rc-badge { font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
              color: #000; background: var(--sev); border-radius: 999px; padding: 2px 8px; }
  .rc-headline { margin: 7px 0 2px; font-size: 16px; font-weight: 600; line-height: 1.35; }
  .rc-sys { margin: 0; font-size: 12px; color: var(--muted); }
  .rc-section { margin: 13px 0 5px; font-size: 12px; font-weight: 600; color: var(--muted); }
  .rc-list { margin: 0; padding-left: 18px; }
  .rc-list li { font-size: 14px; line-height: 1.55; margin: 3px 0; }
  .rc-drive { margin: 10px 0; padding: 8px 10px; font-size: 13px; line-height: 1.45;
              background: var(--surface-2); border-radius: 8px; }
  .rc-causes { list-style: none; margin: 0; padding: 0; }
  .rc-causes li { display: flex; align-items: center; gap: 10px; font-size: 14px; margin: 6px 0; }
  .rc-fixes { list-style: none; margin: 0; padding: 0; }
  .rc-fixes li { position: relative; padding-left: 20px; font-size: 14px; line-height: 1.5; margin: 5px 0; }
  .rc-fixes li::before { content: '✓'; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
  .rc-num { flex: none; width: 20px; height: 20px; display: grid; place-items: center;
            font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: #000;
            background: var(--sev); border-radius: 999px; }
  .rc-ai { margin-top: 12px; width: 100%; background: var(--surface-2); border: 1px solid var(--border);
           color: var(--fg); border-radius: var(--radius); padding: 9px; font-size: 13px; cursor: pointer; }

  .rc-chips { display: flex; flex-wrap: wrap; gap: var(--s-2); margin: var(--s-2) 0; }
  .rc-chip { font-family: var(--font-mono); font-size: 11px; color: var(--muted);
             background: var(--surface-2); border-radius: 999px; padding: 3px 9px; }

  /* accel table */
  .acc-tbl { width: 100%; border-collapse: collapse; margin-top: var(--s-2); }
  .acc-tbl td { padding: 7px 2px; font-size: 14px; border-bottom: 0.5px solid var(--border); }
  .acc-tbl .acc-h { font-size: 12px; color: var(--muted); font-weight: 500; padding-top: 12px; border-bottom: none; }
  .acc-tbl .acc-v { text-align: right; font-family: var(--font-mono); color: var(--fg); }

  /* collapsible + firmware-style controls */
  .fw-card { padding: var(--s-3) var(--s-4); }
  .fw-card summary { list-style: none; cursor: pointer; font-weight: 600; font-size: 15px; padding: var(--s-1) 0; }
  .fw-card summary::-webkit-details-marker { display: none; }
  .fw-card summary::before { content: '⌁ '; color: var(--accent); }
  .fw-input { width: 100%; color: var(--muted); font-size: 13px; margin: var(--s-2) 0;
              background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
  .fw-bar { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; margin: var(--s-2) 0; }
  .fw-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
  .fw-actions { display: flex; justify-content: flex-end; gap: var(--s-2); margin-top: var(--s-2); }
  .fw-actions .ghost { font-size: 12px; }
  .fw-install { border: 1px solid var(--border); background: var(--surface-2); color: var(--fg);
                border-radius: var(--radius); padding: 9px 16px; font-size: 13px; cursor: pointer; }
  .fw-install.up { background: var(--accent); color: #000; border-color: var(--accent); }
  .fw-install:disabled { opacity: 0.4; cursor: default; }

  .ghost { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
           border-radius: var(--radius); padding: 9px 14px; font-size: 13px; cursor: pointer; }
  .ghost:disabled { opacity: 0.4; cursor: default; }
  .ghost.wide { width: 100%; margin-top: var(--s-2); }
</style>
