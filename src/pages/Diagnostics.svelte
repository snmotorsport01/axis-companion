<script lang="ts">
  // =====================================================================
  //  Record log — the on-device data recorder + best times, ported from
  //  the founder/monitor diagnostics surface. Talks to the SAME connected AXIS
  //  Gauge over its founder BLE service (7e1c020x). Reuses store.gaugeClient.
  //
  //  Cards (all offline / on-device — no backend):
  //    · Drive log — pull the gauge's recorded data log as a CSV.
  //    · Acceleration times — the gauge's ACCEL TIMER best runs.
  //
  //  (The raw CAN bus-capture and node-log developer/RE tools were removed —
  //  App Store Guideline 5.6.) Fault codes live on the shell's dedicated DTC
  //  tab; this page is logging only. Opened without a live gauge it shows a
  //  connect prompt.
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import type { AccelTimes } from '../lib/gaugeBleClient';
  import type { VehicleHealth, ExhaustStatus } from '../lib/monitorCfg';
  import { parseDriveLog, toCsv, driveLogName, saveTextFile } from '../lib/driveLog';
  import { t } from '../lib/i18n';

  // ★ Use the LIVE monitor client (store.monClient) — the same one the shell + Looks
  // connect. The old store.gaugeClient is the legacy GaugeSetup flow and is null when
  // you connect through the new app, which made this page show the "not connected" card
  // and bounce to the old gaugesetup home. monClient (and its demo MockMonitor) both
  // carry readAccelTimes / pullLog / eraseLog, so nothing else changes.
  const gauge = $derived(store.monClient);

  // ---- Acceleration best times ----
  const SPEED_LABELS = ['0-100 km/h', '100-200 km/h', '200-300 km/h'];
  const DIST_LABELS  = ['60 ft', '201 m (1/8 mi)', '402 m (1/4 mi)'];
  const fmtT = (ms: number | null) => (ms == null ? '—' : (ms / 1000).toFixed(2) + ' s');
  let accelTimes = $state<AccelTimes | null>(null);
  let accelBusy  = $state(false);
  let accelMsg   = $state('');
  async function readAccelTimes() {
    if (!gauge || accelBusy) return;
    accelBusy = true; accelMsg = t('diag.reading');
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

  // ---- Drive log ----
  let logBusy = $state(false);
  let logPct  = $state(0);
  let logMsg  = $state('');
  async function pullDriveLog() {
    if (!gauge || logBusy) return;
    logBusy = true; logPct = 0; logMsg = t('diag.pulling');
    try {
      const buf = await gauge.pullLog((p) => (logPct = p));
      const log = parseDriveLog(buf);
      await saveTextFile(driveLogName(log), 'text/csv', toCsv(log));
      logMsg = t('diag.drive_saved', { n: log.samples.length });
    } catch (e) { logMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { logBusy = false; logPct = 0; }
  }
  async function eraseDriveLog() {
    if (!gauge || logBusy) return;
    if (!confirm(t('diag.confirm_erase_drive'))) return;
    logBusy = true;
    try { await gauge.eraseLog(); logMsg = t('diag.drive_erased'); }
    catch (e) { logMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { logBusy = false; }
  }

  // ---- Vehicle health / I-M emissions readiness (char 7e1c0211, ported) ----
  let health     = $state<VehicleHealth | null>(null);
  let healthBusy = $state(false);
  let healthMsg  = $state('');
  async function readHealth() {
    if (!gauge || healthBusy) return;
    healthBusy = true; healthMsg = t('diag.reading');
    try { health = await (gauge as any).readHealth(); healthMsg = ''; }
    catch (e) { healthMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { healthBusy = false; }
  }

  // ---- Exhaust valve control (char 7e1c020e, ported) ----
  const EXH_MODES = ['QUIET', 'AUTO', 'LOUD'];   // 0/1/2 — matches firmware
  let exh     = $state<ExhaustStatus | null>(null);
  let exhBusy = $state(false);
  let exhMsg  = $state('');
  async function readExhaust() {
    if (!gauge || exhBusy) return;
    exhBusy = true; exhMsg = t('diag.reading');
    try { exh = await (gauge as any).readExhaust(); exhMsg = ''; }
    catch (e) { exhMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { exhBusy = false; }
  }
  async function setExhMode(mode: number) {
    if (!gauge || exhBusy) return;
    exhBusy = true;
    try { await (gauge as any).setExhaustMode(mode); if (exh) exh.mode = mode; exhMsg = ''; }
    catch (e) { exhMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { exhBusy = false; }
  }
  async function exhPulse(open: boolean) {
    if (!gauge || exhBusy) return;
    exhBusy = true;
    try { await (gauge as any).exhaustPulse(open); exhMsg = open ? 'sent OPEN' : 'sent CLOSE'; }
    catch (e) { exhMsg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { exhBusy = false; }
  }
</script>

<PageHeader title={t('diag.title')} back="axis" backLabel="AXIS" />

{#if !gauge}
  <div class="card">
    <p class="sub">{t('diag.connect_intro')}</p>
    <button class="ghost wide" onclick={() => (store.page = 'axis')}>{t('diag.go_gauge')}</button>
  </div>
{:else}
  <!-- Drive log — the recorded DATA log (leads the page) -->
  <section class="card">
    <h3 class="ch">{t('diag.drivelog_sum')}</h3>
    <p class="sub">{@html t('diag.drivelog_p')}</p>
    {#if logBusy && logPct > 0}<div class="bar"><div class="fill" style="width:{logPct}%"></div></div>{/if}
    {#if logMsg}<p class="note">{logMsg}</p>{/if}
    <div class="actions">
      <button class="prim" onclick={pullDriveLog} disabled={logBusy}>
        {logBusy ? t('diag.pulling_pct', { pct: logPct }) : t('diag.download_csv')}
      </button>
      <button class="ghost" onclick={eraseDriveLog} disabled={logBusy}>{t('diag.erase')}</button>
    </div>
  </section>

  <!-- Acceleration best times (a recorded log too) -->
  <section class="card">
    <h3 class="ch">{t('diag.accel_sum')}</h3>
    <p class="sub">{@html t('diag.accel_p')}</p>
    {#if accelMsg}<p class="note">{accelMsg}</p>{/if}
    {#if accelTimes}
      <div class="acc">
        <div class="acc-h">{t('diag.by_speed')}</div>
        {#each accelTimes.speed as e, i}
          <div class="acc-row"><span>{SPEED_LABELS[i]}</span><b>{fmtT(e.ms)}</b></div>
        {/each}
        <div class="acc-h">{t('diag.by_distance')}</div>
        {#each accelTimes.dist as e, i}
          <div class="acc-row"><span>{DIST_LABELS[i]}</span>
            <b>{fmtT(e.ms)}{#if e.ms != null && e.trapKmh} · {e.trapKmh} km/h{/if}</b></div>
        {/each}
      </div>
      {#if !accelHasAny(accelTimes)}<p class="sub">{t('diag.no_runs')}</p>{/if}
    {/if}
    <div class="actions">
      <button class="ghost" onclick={readAccelTimes} disabled={accelBusy}>
        {accelBusy ? t('diag.reading') : accelTimes ? t('diag.refresh') : t('diag.read_best')}
      </button>
      {#if accelHasAny(accelTimes)}
        <button class="ghost" onclick={downloadAccelCsv}>{t('diag.download_csv')}</button>
      {/if}
    </div>
  </section>

  <!-- Vehicle health — I/M emissions readiness (char 7e1c0211) -->
  <section class="card">
    <h3 class="ch">Vehicle health</h3>
    <p class="sub">Emissions-readiness &amp; check-engine status the sensor reads off the car (OBD Mode 01). Handy before an inspection.</p>
    {#if healthMsg}<p class="note">{healthMsg}</p>{/if}
    {#if health}
      {#if !health.received}
        <p class="sub">No data yet — start the car so the sensor can read it, then refresh.</p>
      {:else}
        <div class="hz">
          <div class="hz-row"><span>Check-engine (MIL)</span>
            <b class:bad={health.milOn} class:ok={!health.milOn}>{health.milOn ? 'ON' : 'off'}</b></div>
          <div class="hz-row"><span>Stored fault codes</span>
            <b class:bad={health.dtc > 0} class:ok={health.dtc === 0}>{health.dtc}</b></div>
          <div class="hz-row"><span>Readiness monitors</span>
            <b class:ok={health.monSupported > 0 && health.monReady >= health.monSupported}
               class:warn={health.monSupported > 0 && health.monReady < health.monSupported}>
              {health.monReady}/{health.monSupported} ready</b></div>
          {#if health.pending || health.permanent}
            <div class="hz-row"><span>Pending / permanent</span><b>{health.pending} / {health.permanent}</b></div>
          {/if}
        </div>
        <p class="sub">{health.monSupported > 0 && health.monReady >= health.monSupported && !health.milOn && health.dtc === 0
          ? '✓ Ready for an emissions test.' : 'Not fully ready — drive a few cycles or clear pending faults.'}</p>
      {/if}
    {/if}
    <div class="actions">
      <button class="ghost" onclick={readHealth} disabled={healthBusy}>
        {healthBusy ? t('diag.reading') : health ? t('diag.refresh') : 'Check health'}
      </button>
    </div>
  </section>

  <!-- Exhaust valve control (char 7e1c020e) -->
  <section class="card">
    <h3 class="ch">Exhaust valve</h3>
    <p class="sub">Control your electric exhaust valve through the gauge (replays your fob's cloned RF codes). QUIET = closed, AUTO = opens on revs/throttle, LOUD = open.</p>
    {#if exhMsg}<p class="note">{exhMsg}</p>{/if}
    {#if exh}
      {#if !exh.hasCodes}
        <p class="sub">⚠ No RF codes cloned yet — the gauge needs your fob's OPEN/CLOSE codes before it can drive the valve.</p>
      {/if}
      <div class="segbar">
        {#each EXH_MODES as m, i}
          <button class="seg" class:sel={exh.mode === i} disabled={exhBusy} onclick={() => setExhMode(i)}>{m}</button>
        {/each}
      </div>
      <div class="hz">
        <div class="hz-row"><span>Valve now</span><b>{exh.valve === 1 ? 'OPEN' : exh.valve === 0 ? 'closed' : 'unknown'}</b></div>
      </div>
      <div class="actions">
        <button class="ghost" onclick={() => exhPulse(true)}  disabled={exhBusy || !exh.hasCodes}>Test OPEN</button>
        <button class="ghost" onclick={() => exhPulse(false)} disabled={exhBusy || !exh.hasCodes}>Test CLOSE</button>
      </div>
    {/if}
    <div class="actions">
      <button class="ghost" onclick={readExhaust} disabled={exhBusy}>
        {exhBusy ? t('diag.reading') : exh ? t('diag.refresh') : 'Load exhaust'}
      </button>
    </div>
  </section>
{/if}

<style>
  /* Match the app's frosted-carbon + gold look (like the Anti-sleep / Track pages). */
  .card {
    background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15);
    backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 16px;
    padding: 16px;
    margin: 8px 2px;
  }
  .hz { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; }
  .hz-row { display: flex; justify-content: space-between; align-items: center;
    padding: 9px 2px; border-bottom: 1px solid rgba(255,255,255,.06); font-size: .95rem; }
  .hz-row span { color: rgba(255,255,255,.72); }
  .hz-row b { font-variant-numeric: tabular-nums; }
  .hz-row b.ok   { color: #57c07a; }
  .hz-row b.warn { color: #d9a441; }
  .hz-row b.bad  { color: #e0654f; }
  .segbar { display: flex; gap: 6px; margin: 10px 0; }
  .seg { flex: 1; padding: 11px 6px; border-radius: 10px; cursor: pointer;
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09);
    color: rgba(255,255,255,.7); font-size: .82rem; letter-spacing: .06em; }
  .seg.sel { background: #1a1710; border-color: #c9a24a; color: #e6c876; }
  .seg:disabled { opacity: .5; cursor: default; }
  .ch { margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #eef0f2; letter-spacing: .01em; }
  .sub { color: #8b8f98; font-size: 13px; line-height: 1.5; margin: 0; }
  .note { font-size: 12.5px; color: #cfd2d7; margin: 10px 0 0; }

  .actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
  .prim, .ghost { border-radius: 13px; padding: 12px 18px; font-size: 14px; font-weight: 700; cursor: pointer; }
  .prim { background: var(--gold, #cea24a); color: #161003; border: none; flex: 1; }
  .prim:disabled { opacity: .5; cursor: default; }
  .ghost { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: #dfe2e6; font-weight: 600; }
  .ghost:disabled { opacity: .45; cursor: default; }
  .ghost.wide { width: 100%; margin-top: 12px; }

  .bar { height: 6px; background: rgba(255,255,255,.08); border-radius: 999px; overflow: hidden; margin: 12px 0 0; }
  .bar .fill { height: 100%; background: var(--gold, #cea24a); border-radius: 999px; transition: width .3s ease; }

  /* accel best-times — clean rows, no table chrome */
  .acc { margin-top: 12px; display: flex; flex-direction: column; }
  .acc-h { font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: #8b8f98; font-weight: 600; margin: 10px 0 2px; }
  .acc-h:first-child { margin-top: 0; }
  .acc-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
             padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.06); font-size: 14px; color: #e7e9ec; }
  .acc-row b { font-variant-numeric: tabular-nums; color: var(--gold, #cea24a); font-weight: 600; white-space: nowrap; }
</style>
