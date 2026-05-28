<script lang="ts">
  import { onMount } from 'svelte';
  import type { CalibSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';

  let calib = $state<CalibSnapshot | null>(null);
  let err   = $state<string | null>(null);

  onMount(async () => {
    if (!store.client) return;
    try { calib = await store.client.calibration(); }
    catch (e: any) { err = e?.message ?? 'load failed'; }
  });

  async function clearAll() {
    if (!store.client) return;
    if (!confirm('Clear all calibration for this mode? You\'ll need to walk the wizard on the device.')) return;
    try {
      await store.client.resetCalibration();
      calib = await store.client.calibration();
    } catch (e: any) { err = e?.message ?? 'reset failed'; }
  }
</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>CALIBRATION</h1>
</header>

{#if err}<div class="card err">{err}</div>{/if}

{#if !calib}
  <div class="card muted">Loading…</div>
{:else}
  <div class="card">
    <h3>Active mode</h3>
    <p class="big mono">{calib.mode_name} <span class="muted">· {calib.gear_count} gears</span></p>
  </div>

  <div class="card">
    <h3>IMU Zero (current session)</h3>
    <dl>
      <dt>Roll</dt>  <dd class="mono">{calib.imu_zero.roll.toFixed(2)}°</dd>
      <dt>Pitch</dt> <dd class="mono">{calib.imu_zero.pitch.toFixed(2)}°</dd>
      <dt>Yaw</dt>   <dd class="mono">{calib.imu_zero.yaw.toFixed(2)}°</dd>
    </dl>
  </div>

  <div class="card">
    <h3>Calibration steps</h3>
    {#if calib.calib_steps === 0}
      <p class="muted">This mode has no calibration.</p>
    {:else}
      <ol class="steps">
        {#each calib.steps as s, i}
          <li>
            <span class="i mono">{i + 1}</span>
            <span class="label">{s.label}</span>
            <span class="hint">{s.hint}</span>
          </li>
        {/each}
      </ol>
      <p class="muted small">
        Per-step value editing is a P3+ feature. For now, walk the wizard on the device
        (Menu → CALIBRATE) to re-capture.
      </p>
    {/if}
  </div>

  <button class="danger" on:click={clearAll}>CLEAR CALIBRATION</button>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }
  .err  { color: var(--danger); }
  .muted { color: var(--muted); }
  .small { font-size: 13px; }
  .big   { font-size: 24px; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; color: var(--accent); }
  .steps { list-style: none; padding: 0; margin: 0; }
  .steps li {
    display: grid;
    grid-template-columns: 32px 80px 1fr;
    align-items: baseline;
    padding: var(--s-2) 0;
    border-bottom: 1px solid var(--border);
  }
  .steps li:last-child { border-bottom: none; }
  .i  { color: var(--muted); }
  .label { font-weight: 700; }
  .hint  { color: var(--muted); font-size: 13px; }
  .danger {
    background: transparent;
    color: var(--danger);
    border-color: rgba(255, 59, 59, 0.4);
    margin-top: var(--s-3);
    width: 100%;
  }
</style>
