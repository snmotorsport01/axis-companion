<script lang="ts">
  // =====================================================================
  //  Feel — how the gear reacts, as ONE plain choice instead of a wall of
  //  physics sliders. Each vibe bundles the real performance tunables
  //  (shift-lock time, tilt response, shake-rejection, shift sharpness)
  //  into Snappy / Balanced / Relaxed. Values are computed relative to
  //  each tunable's own default and clamped to its min/max, so it works
  //  whatever the firmware exposes and can never send an out-of-range
  //  value. The raw numbers live in Pro for anyone who wants them.
  // =====================================================================
  import { onMount } from 'svelte';
  import type { ConfigSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import Glyph from '../lib/Glyph.svelte';

  let config = $state<ConfigSnapshot | null>(null);
  let selected = $state<string | null>(null);
  let toast = $state<string | null>(null);
  let err = $state<string | null>(null);

  // Performance tunables that define "feel". Anim/look keys live in Looks.
  const PERF_KEYS = ['gearDwellMs', 'lpAlphaRp', 'intentGyroDps', 'motionAccelDead', 'motionGyroDead'] as const;

  // Factor applied to each key's DEFAULT, then clamped to [min,max].
  // Balanced = the factory defaults (everything ×1).
  const FACTORS: Record<string, Record<string, number>> = {
    snappy:   { gearDwellMs: 0.6, lpAlphaRp: 1.6, intentGyroDps: 0.8, motionAccelDead: 1.3, motionGyroDead: 1.3 },
    balanced: { gearDwellMs: 1.0, lpAlphaRp: 1.0, intentGyroDps: 1.0, motionAccelDead: 1.0, motionGyroDead: 1.0 },
    relaxed:  { gearDwellMs: 1.4, lpAlphaRp: 0.6, intentGyroDps: 1.4, motionAccelDead: 0.7, motionGyroDead: 0.7 },
  };

  const VIBES = [
    { id: 'snappy',   label: 'Snappy',   sub: 'quick & sharp',  desc: 'Reacts the instant you move. Best on smooth roads and for precise control.' },
    { id: 'balanced', label: 'Balanced', sub: 'just right',     desc: 'The default. Reacts fast but shrugs off road bumps and cornering.' },
    { id: 'relaxed',  label: 'Relaxed',  sub: 'smooth & calm',  desc: 'Forgiving and steady. Best on rough roads — no twitchiness.' },
  ];

  function targetFor(vibe: string, key: string): number | null {
    if (!config || !(key in config)) return null;
    const e = config[key];
    const f = FACTORS[vibe]?.[key] ?? 1;
    let v = e.def * f;
    v = Math.max(e.min, Math.min(e.max, v));
    return (e.unit === 'ms' || e.unit === 'dps') ? Math.round(v) : Number(v.toFixed(3));
  }

  function guessActive() {
    if (!config || !('gearDwellMs' in config)) { selected = 'balanced'; return; }
    const cur = config.gearDwellMs.v;
    let best = 'balanced', bd = Infinity;
    for (const vib of VIBES) {
      const t = targetFor(vib.id, 'gearDwellMs');
      if (t == null) continue;
      const d = Math.abs(t - cur);
      if (d < bd) { bd = d; best = vib.id; }
    }
    selected = best;
  }

  onMount(async () => {
    if (!store.client) return;
    try { config = await store.client.config(); guessActive(); }
    catch (e: any) { err = e?.message ?? 'load failed'; }
  });

  async function pick(vibe: string) {
    if (!store.client || !config) return;
    selected = vibe;
    const patch: Record<string, number> = {};
    for (const k of PERF_KEYS) {
      const t = targetFor(vibe, k);
      if (t != null) { patch[k] = t; config[k].v = t; }
    }
    if (!Object.keys(patch).length) return;
    try {
      await store.client.patchConfig(patch);
      await store.client.saveConfig();
      toast = 'saved';
      setTimeout(() => { if (toast === 'saved') toast = null; }, 1500);
    } catch (e: any) {
      err = e?.message ?? 'save failed'; toast = null;
    }
  }
</script>

<div class="pg">
  <div class="hd"><span class="wm">AXIS</span><span class="sub">Feel</span></div>

  {#if !store.client}
    <p class="empty">Connect to your AXIS first.</p>
  {:else}
    <p class="intro">How should the gear react when you move the knob?</p>

    <div class="vibes">
      {#each VIBES as v}
        <button type="button" class="vb" class:sel={selected === v.id} on:click={() => pick(v.id)}>
          <span class="vn">{v.label}</span>
          <span class="vs">{v.sub}</span>
        </button>
      {/each}
    </div>

    {#each VIBES as v}
      {#if selected === v.id}<p class="desc">{v.desc}</p>{/if}
    {/each}

    <div class="status">
      {#if toast === 'saved'}<Glyph kind="connected" size={16} /> saved to your AXIS
      {:else if toast}{toast}
      {:else}<span class="muted">one tap sets shift speed, response & bump-rejection together — no numbers.</span>{/if}
    </div>

    {#if err}<p class="err">{err}</p>{/if}
    <p class="pro">Want the raw sliders? They're in <button type="button" class="lk" on:click={() => store.page = 'pro'}>Pro</button>.</p>
  {/if}
</div>

<style>
  .pg { padding: 14px 16px 90px; max-width: 480px; margin: 0 auto; color: var(--fg, #e9e7df); }
  .hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
  .wm { letter-spacing: 3px; font-weight: 500; }
  .sub { color: var(--muted, #85826f); font-size: 13px; }
  .empty { color: var(--muted, #85826f); text-align: center; padding: 40px 0; }
  .intro { font-size: 14px; margin: 6px 0 16px; }
  .vibes { display: flex; gap: 8px; }
  .vb { flex: 1; background: var(--surface-2, #15151a); border: 1px solid var(--border, #26261c); border-radius: 12px; padding: 16px 6px; color: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 4px; align-items: center; }
  .vb.sel { border-color: var(--accent, #c9a24a); background: #1a1710; }
  .vn { font-size: 14px; font-weight: 500; }
  .vs { font-size: 10.5px; color: var(--muted, #7e7b71); }
  .desc { font-size: 13px; color: var(--fg, #cfccc0); line-height: 1.55; margin: 14px 0 0; background: var(--surface-2, #121212); border-radius: 10px; padding: 12px; }
  .status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted, #85826f); margin-top: 12px; min-height: 18px; }
  .muted { color: var(--muted, #75726a); }
  .err { color: var(--warn, #e24b4a); font-size: 12px; }
  .pro { font-size: 12px; color: var(--muted, #85826f); margin-top: 18px; }
  .lk { background: none; border: 0; color: var(--accent, #c9a24a); cursor: pointer; padding: 0; font: inherit; text-decoration: underline; }
</style>
