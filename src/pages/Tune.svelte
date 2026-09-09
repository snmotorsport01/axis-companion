<script lang="ts">
  import { onMount } from 'svelte';
  import type { ConfigSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import { t } from '../lib/i18n';

  let config = $state<ConfigSnapshot | null>(null);
  let err    = $state<string | null>(null);
  let dirty  = $state(false);
  let saving = $state(false);

  // No knob paired (e.g. a hardware-less App Store reviewer who never tapped
  // DEMO MODE): show an explorable connect-prompt card instead of a spinner
  // that never resolves (config stays null forever). Mirrors Calibrate.svelte.
  const noClient = $derived(!store.client);

  // Human-friendly labels + 1-line explanations for each tunable.
  // Copy lives in the PWA's i18n dict (lib/i18n/tune.ts, keyed
  // `tune.<key>.label` / `.help`) — not firmware — so we can ship copy
  // edits (and translations) without re-flashing. Keep help text short —
  // readable next to the slider on a phone screen.
  const KNOWN = new Set([
    'gearDwellMs', 'patternChaseMs', 'intentGyroDps', 'intentWindowMs',
    'motionAccelDead', 'motionGyroDead', 'lpAlphaRp', 'seqTriggerDeg',
    'seqRearmDeg', 'seqCooldownMs', 'brightFull', 'brightDim',
    'sleepAfterMs', 'transitionStyle', 'gearAnimStyle',
  ]);

  function labelOf(key: string): string  { return KNOWN.has(key) ? t(`tune.${key}.label`) : key; }
  function helpOf (key: string): string  { return KNOWN.has(key) ? t(`tune.${key}.help`)  : '';  }

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
    } catch (e: any) { err = e?.message ?? t('tune.err_load'); }
  });

  // Debounced live-apply: avoid hammering the firmware on every input event.
  let patchTimer: number | undefined;
  function onSlider(key: string, value: number) {
    if (!config) return;
    config[key].v = value;
    dirty = true;
    clearTimeout(patchTimer);
    patchTimer = window.setTimeout(() => {
      store.client?.patchConfig({ [key]: value }).catch(e => { err = e?.message ?? t('tune.err_apply'); });
    }, 80);
  }

  async function save() {
    if (!store.client) return;
    saving = true;
    try {
      await store.client.saveConfig();
      dirty = false;
    } catch (e: any) {
      err = e?.message ?? t('tune.err_save');
    } finally {
      saving = false;
    }
  }

  async function resetDefaults() {
    if (!store.client) return;
    if (!confirm(t('tune.reset_confirm'))) return;
    try {
      await store.client.resetConfig();
      const raw = await store.client.config();
      config = attachEnumNames(raw);
      dirty = true;
    } catch (e: any) { err = e?.message ?? t('tune.err_reset'); }
  }

  // Enum dropdown change handler — same patch path as the slider, but
  // emits an integer index rather than a float.
  function onEnum(key: string, value: number) {
    if (!config) return;
    config[key].v = value;
    dirty = true;
    clearTimeout(patchTimer);
    patchTimer = window.setTimeout(() => {
      store.client?.patchConfig({ [key]: value }).catch(e => { err = e?.message ?? t('tune.err_apply'); });
    }, 0);
  }

  function fmt(key: string, v: number): string {
    const e = config?.[key];
    if (!e) return String(v);
    // Brightness ships as raw 0-255 (unit ''); show a friendly % so a
    // buyer never sees a debug float like "255.00".
    if (key === 'brightFull' || key === 'brightDim') return Math.round((v / 255) * 100) + '%';
    // "Feel" sliders carry units meaningless to a buyer (g-force, deg/s, bare
    // response floats). Show a plain 0-100% of the slider's own range — like
    // brightness — instead of "0.15 g" / "12 dps" / "0.50".
    if (e.unit === 'g' || e.unit === 'dps' || e.unit === '') {
      const span = (e.max - e.min) || 1;
      return Math.round(((v - e.min) / span) * 100) + '%';
    }
    if (e.unit === 'deg') return v.toFixed(0) + '°';
    if (e.unit === 'ms')  return v.toFixed(0) + ' ms';
    return v + ' ' + e.unit;
  }

  // Step size for sliders — sensible per-unit defaults.
  function step(key: string): number {
    if (key === 'brightFull' || key === 'brightDim') return 1;
    const u = config?.[key]?.unit;
    if (u === 'g')   return 0.01;
    if (u === '')    return 0.01;
    if (u === 'ms')  return 10;
    return 1;
  }
</script>

<PageHeader title={t('tune.title')} back="axis" backLabel="AXIS" />

{#if err}
  <div class="card err">{err}</div>
{/if}

{#if noClient}
  <div class="card muted">
    <h3>{t('tune.connect_title')}</h3>
    <p class="small">{t('tune.connect_body')}</p>
    <button class="ghost wide" on:click={() => (store.page = 'axis')}>{t('tune.back_to_connect')}</button>
  </div>
{:else if !config}
  <div class="card muted">{t('tune.loading')}</div>
{:else}
  <!-- Keys hoisted onto the CUSTOM page (Brand.svelte's "Animation &
       feel" card). They still come back from /api/config — we just
       don't render them here to avoid showing the same control twice. -->
  {@const MOVED_TO_BRAND = new Set([
    'gearDwellMs', 'gearAnimStyle', 'transitionStyle', 'patternChaseMs'
  ])}
  {#each Object.entries(config).filter(([k]) => !MOVED_TO_BRAND.has(k)) as [key, e]}
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
          <span class="default">{t('tune.def', { v: fmt(key, e.def) })}</span>
          <span>{fmt(key, e.max)}</span>
        </div>
      {/if}
    </div>
  {/each}

  <div class="actions">
    <button on:click={resetDefaults}>{t('tune.reset')}</button>
    <button class="primary" class:hot={dirty} disabled={saving} on:click={save}>
      {saving ? t('tune.saving') : dirty ? t('tune.save') : t('tune.saved')}
    </button>
  </div>
{/if}

<style>
  .err  { color: var(--danger); }
  .muted { color: var(--muted); text-align: center; }
  .muted h3 { margin: 0 0 var(--s-2); color: var(--fg); font-size: 16px; }
  .small { font-size: 13px; line-height: 1.45; margin: 0 0 var(--s-3); }
  .ghost {
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--fg); padding: var(--s-3); border-radius: var(--r-1);
    font-size: 14px; cursor: pointer; min-height: var(--tap-min);
  }
  .ghost.wide { width: 100%; }
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
  .default { color: var(--muted); }
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
