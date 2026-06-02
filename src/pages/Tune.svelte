<script lang="ts">
  import { onMount } from 'svelte';
  import type { ConfigSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';

  let config = $state<ConfigSnapshot | null>(null);
  let err    = $state<string | null>(null);
  let dirty  = $state(false);
  let saving = $state(false);

  // Human-friendly labels + 1-line explanations for each tunable.
  // Lives in the PWA (not firmware) so we can ship copy edits without
  // re-flashing. Keep the `help` text short — readable next to the
  // slider on a phone screen.
  type LabelInfo = { label: string; help: string };
  const PRETTY: Record<string, LabelInfo> = {
    gearDwellMs: {
      label: 'Gear shift delay',
      help:  'How long the new position must stay still before locking in. Lower = faster reaction. Going under ~120 ms is unreliable — small jitters slip through and the gear bounces back and forth.',
    },
    patternChaseMs: {
      label: 'Pattern Effect speed',
      help:  'How fast the glowing light runs through the gears on the H-pattern screen.',
    },
    intentGyroDps: {
      label: 'Gear sensitive',
      help:  'How sharp a knob movement is needed to register as a shift. Higher = ignores more car bumps and brake dive.',
    },
    intentWindowMs: {
      label: 'Gear threshold',
      help:  'After moving the knob, how long the device keeps accepting the new gear before timing out.',
    },
    motionAccelDead: {
      label: 'Driving detect (shake)',
      help:  'How much vibration counts as the car moving. Above this, shifts freeze to prevent road bumps from triggering them.',
    },
    motionGyroDead: {
      label: 'Driving detect (turn)',
      help:  'How much turning counts as the car moving. Above this, shifts freeze for the same reason.',
    },
    lpAlphaRp: {
      label: 'Tilt response',
      help:  'Lower = smoother but laggy. Higher = snappy but more jittery.',
    },
    seqTriggerDeg: {
      label: 'Sequential — shift angle',
      help:  'Sequential mode only. How far to tilt the knob to count as an up/down shift.',
    },
    seqRearmDeg: {
      label: 'Sequential — return angle',
      help:  'Sequential mode only. Knob must come back to within this angle before another shift can register.',
    },
    seqCooldownMs: {
      label: 'Sequential — shift gap',
      help:  'Sequential mode only. Shortest time allowed between two consecutive shifts.',
    },
    brightFull: {
      label: 'Brightness while in use',
      help:  'Screen brightness when you are actively using the device.',
    },
    brightDim: {
      label: 'Brightness when idle',
      help:  'Screen brightness after a few seconds without interaction.',
    },
    sleepAfterMs: {
      label: 'Screensaver delay',
      help:  'How long without input before the screensaver image / animation kicks in.',
    },
    transitionStyle: {
      label: 'Screen change effect',
      help:  'How pages animate when switching from one to another.',
    },
    gearAnimStyle: {
      label: 'Gear letter effect',
      help:  'How the big gear letter appears when you shift on the main screen.',
    },
  };

  function labelOf(key: string): string  { return PRETTY[key]?.label ?? key; }
  function helpOf (key: string): string  { return PRETTY[key]?.help  ?? '';  }

  // Firmware ships enum option labels as auxiliary "__transitionNames" /
  // "__gearAnimNames" entries in the config doc. Re-attach them to the
  // matching entry's `names` field and hide the helper keys from render.
  function attachEnumNames(c: ConfigSnapshot): ConfigSnapshot {
    const out: ConfigSnapshot = {};
    for (const [k, v] of Object.entries(c)) {
      if (k.startsWith('__')) continue;            // helper, skip
      out[k] = v;
    }
    if (c.transitionStyle && (c as any).__transitionNames) {
      out.transitionStyle = { ...out.transitionStyle, names: (c as any).__transitionNames };
    }
    if (c.gearAnimStyle && (c as any).__gearAnimNames) {
      out.gearAnimStyle = { ...out.gearAnimStyle, names: (c as any).__gearAnimNames };
    }
    return out;
  }

  onMount(async () => {
    if (!store.client) return;
    try {
      const raw = await store.client.config();
      config   = attachEnumNames(raw);
    } catch (e: any) { err = e?.message ?? 'load failed'; }
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
      const raw = await store.client.config();
      config = attachEnumNames(raw);
      dirty = true;
    } catch (e: any) { err = e?.message ?? 'reset failed'; }
  }

  // Enum dropdown change handler — same patch path as the slider, but
  // emits an integer index rather than a float.
  function onEnum(key: string, value: number) {
    if (!config) return;
    config[key].v = value;
    dirty = true;
    clearTimeout(patchTimer);
    patchTimer = window.setTimeout(() => {
      store.client?.patchConfig({ [key]: value }).catch(e => { err = e?.message ?? 'apply failed'; });
    }, 0);
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
        <label for={key}>{labelOf(key)}</label>
        <span class="mono v">
          {e.unit === 'enum' && e.names ? (e.names[e.v] ?? e.v) : fmt(key, e.v)}
        </span>
      </div>
      {#if helpOf(key)}
        <p class="help">{helpOf(key)}</p>
      {/if}
      {#if e.unit === 'enum' && e.names}
        <select
          id={key}
          value={e.v}
          on:change={(ev) => onEnum(key, +(ev.currentTarget as HTMLSelectElement).value)}
        >
          {#each e.names as opt, i}
            <option value={i}>{opt}</option>
          {/each}
        </select>
      {:else}
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
      {/if}
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
  .help   {
    margin: var(--s-1) 0 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.4;
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
    margin: var(--s-2) 0 var(--s-1);
  }
  .range-meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
  .default { color: var(--border); }
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
  .actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  .hot { box-shadow: 0 0 0 2px var(--accent); }
</style>
