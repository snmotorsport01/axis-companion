<script lang="ts">
  import { onMount } from 'svelte';
  import type { ConfigSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';

  let config = $state<ConfigSnapshot | null>(null);
  let err    = $state<string | null>(null);
  let dirty  = $state(false);
  let saving = $state(false);

  // Tune labels — kept here so we can ship UI-only changes without touching
  // the firmware's /api/config schema.
  const PRETTY: Record<string, string> = {
    gearDwellMs:     'Gear dwell',
    motionAccelDead: 'Motion accel threshold',
    motionGyroDead:  'Motion gyro threshold',
    lpAlphaRp:       'Roll/pitch filter alpha',
    seqTriggerDeg:   'SEQ trigger angle',
    seqRearmDeg:     'SEQ re-arm angle',
    seqCooldownMs:   'SEQ cooldown',
    brightFull:      'Brightness — active',
    brightDim:       'Brightness — idle',
    sleepAfterMs:    'Sleep timeout'
  };

  onMount(async () => {
    if (!store.client) return;
    try { config = await store.client.config(); }
    catch (e: any) { err = e?.message ?? 'load failed'; }
  });

  // Debounced live-apply: avoid hammering the firmware on every input event.
  let patchTimer: number | undefined;
  function onSlider(key: string, value: number) {
    if (!config) return;
    config[key].v = value;
    dirty = true;
    clearTimeout(patchTimer);
    patchTimer = window.setTimeout(() => {
      store.client?.patchConfig({ [key]: value }).catch(e => { err = e?.message ?? 'apply failed'; });
    }, 80);
  }

  async function save() {
    if (!store.client) return;
    saving = true;
    try {
      await store.client.saveConfig();
      dirty = false;
    } catch (e: any) {
      err = e?.message ?? 'save failed';
    } finally {
      saving = false;
    }
  }

  async function resetDefaults() {
    if (!store.client) return;
    if (!confirm('Restore all values to firmware defaults? (not saved until you tap SAVE)')) return;
    try {
      await store.client.resetConfig();
      config = await store.client.config();
      dirty = true;
    } catch (e: any) { err = e?.message ?? 'reset failed'; }
  }

  function fmt(key: string, v: number): string {
    const e = config?.[key];
    if (!e) return String(v);
    if (e.unit === 'g')   return v.toFixed(2) + ' g';
    if (e.unit === 'dps') return v.toFixed(0) + ' dps';
    if (e.unit === 'deg') return v.toFixed(0) + '°';
    if (e.unit === 'ms')  return v.toFixed(0) + ' ms';
    if (e.unit === '')    return v.toFixed(2);
    return v + ' ' + e.unit;
  }

  // Step size for sliders — sensible per-unit defaults.
  function step(key: string): number {
    const u = config?.[key]?.unit;
    if (u === 'g')   return 0.01;
    if (u === '')    return 0.01;
    if (u === 'ms')  return 10;
    return 1;
  }
</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>TUNE</h1>
</header>

{#if err}
  <div class="card err">{err}</div>
{/if}

{#if !config}
  <div class="card muted">Loading…</div>
{:else}
  {#each Object.entries(config) as [key, e]}
    <div class="card">
      <div class="row">
        <label for={key}>{PRETTY[key] ?? key}</label>
        <span class="mono v">{fmt(key, e.v)}</span>
      </div>
      <input
        id={key}
        type="range"
        min={e.min}
        max={e.max}
        step={step(key)}
        value={e.v}
        on:input={(ev) => onSlider(key, +ev.currentTarget.value)}
      />
      <div class="range-meta mono">
        <span>{fmt(key, e.min)}</span>
        <span class="default">def {fmt(key, e.def)}</span>
        <span>{fmt(key, e.max)}</span>
      </div>
    </div>
  {/each}

  <div class="actions">
    <button on:click={resetDefaults}>RESET DEFAULTS</button>
    <button class="primary" class:hot={dirty} disabled={saving} on:click={save}>
      {saving ? 'SAVING…' : dirty ? 'SAVE' : 'SAVED'}
    </button>
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }
  .err  { color: var(--danger); }
  .muted { color: var(--muted); text-align: center; }
  label   { margin: 0; }
  .row    { display: flex; justify-content: space-between; align-items: baseline; }
  .v      { color: var(--accent); font-size: 18px; font-weight: 700; }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
    margin: var(--s-2) 0 var(--s-1);
  }
  .range-meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
  .default { color: var(--border); }
  .actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  .hot { box-shadow: 0 0 0 2px var(--accent); }
</style>
