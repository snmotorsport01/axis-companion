<script lang="ts">
  // =====================================================================
  //  Looks — the buyer-facing colour screen. A quick "Look pack" sets
  //  everything in one tap; or pick each part's colour yourself. The
  //  device preview is live. Wraps the same /api/branding the old
  //  Custom (Brand) page used — just re-shaped for someone who has zero
  //  car/physics knowledge and just wants it to look cool.
  // =====================================================================
  import { onMount } from 'svelte';
  import type { BrandingSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import DevicePreview from '../lib/DevicePreview.svelte';
  import Glyph from '../lib/Glyph.svelte';
  import GaugeSetup from './GaugeSetup.svelte';

  // Which AXIS device this page is styling. The knob branding lives here;
  // the gauge re-uses the full GaugeSetup editor (its own colours / layout /
  // live preview / demo) hosted inline via its `embedded` prop.
  let device = $state<'knob' | 'gauge'>('knob');

  let snap = $state<BrandingSnapshot | null>(null);
  let name = $state('');
  let accent = $state('#c9a24a');
  let gearColor  = $state('#c9a24a');
  let meterColor = $state('#c9a24a');
  let nameColor  = $state('#e9e7df');
  let fgColor    = $state('#ffffff');
  let mutedColor = $state('#888888');
  let warnColor  = $state('#e24b4a');

  let saving = $state(false);
  let saved  = $state(false);
  let err    = $state<string | null>(null);

  type Pack = { id: string; label: string; c: [string,string,string,string,string,string,string] };
  // order: accent, gear, meter, name, fg, muted, warn
  const PACKS: Pack[] = [
    { id: 'gold',   label: 'Gold',   c: ['#c9a24a','#c9a24a','#c9a24a','#e9e7df','#ffffff','#888888','#e24b4a'] },
    { id: 'carbon', label: 'Carbon', c: ['#7fb2ff','#7fb2ff','#4f7fbf','#cfe0ff','#ffffff','#6e7686','#e24b4a'] },
    { id: 'sunset', label: 'Sunset', c: ['#ff7a4d','#ff7a4d','#ef9f27','#ffd9a8','#ffffff','#8a6a55','#ff3b3b'] },
    { id: 'mono',   label: 'Mono',   c: ['#e9e7df','#e9e7df','#888888','#e9e7df','#ffffff','#777777','#ff5555'] },
  ];

  function applyPack(p: Pack) {
    [accent, gearColor, meterColor, nameColor, fgColor, mutedColor, warnColor] = p.c;
  }

  onMount(async () => {
    if (!store.client) return;
    try {
      const s = await store.client.branding();
      snap = s;
      name = s.name;
      accent     = s.accent_hex || '#c9a24a';
      gearColor  = s.gear_hex   || accent;
      meterColor = s.meter_hex  || accent;
      nameColor  = s.name_hex   || '#e9e7df';
      fgColor    = s.fg_hex     || '#ffffff';
      mutedColor = s.muted_hex  || '#888888';
      warnColor  = s.warn_hex   || '#e24b4a';
    } catch (e: any) {
      err = e?.message ?? 'load failed';
    }
  });

  const dirty = $derived(!!snap && (
    name.trim() !== snap.name ||
    accent.toUpperCase()     !== snap.accent_hex.toUpperCase() ||
    gearColor.toUpperCase()  !== snap.gear_hex.toUpperCase()   ||
    meterColor.toUpperCase() !== snap.meter_hex.toUpperCase()  ||
    nameColor.toUpperCase()  !== snap.name_hex.toUpperCase()   ||
    fgColor.toUpperCase()    !== snap.fg_hex.toUpperCase()     ||
    mutedColor.toUpperCase() !== snap.muted_hex.toUpperCase()  ||
    warnColor.toUpperCase()  !== snap.warn_hex.toUpperCase()
  ));

  async function save() {
    if (!store.client || !snap) return;
    saving = true; err = null; saved = false;
    try {
      await store.client.setBranding({
        name: name.trim().slice(0, snap.max_name),
        accent_hex: accent, gear_hex: gearColor, meter_hex: meterColor,
        name_hex: nameColor, fg_hex: fgColor, muted_hex: mutedColor, warn_hex: warnColor,
      });
      snap = await store.client.branding();
      saved = true;
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'save failed';
    } finally {
      saving = false;
    }
  }
</script>

<div class="pg">
  <div class="hd"><span class="wm">AXIS</span><span class="sub">Looks</span></div>

  <!-- Device selector: style the knob or the gauge. -->
  <div class="devsel" role="tablist" aria-label="Choose device">
    <button type="button" role="tab" aria-selected={device === 'knob'}
            class:on={device === 'knob'} on:click={() => (device = 'knob')}>AXIS Knob</button>
    <button type="button" role="tab" aria-selected={device === 'gauge'}
            class:on={device === 'gauge'} on:click={() => (device = 'gauge')}>AXIS Gauge</button>
  </div>

  {#if device === 'knob'}
  {#if !store.client}
    <p class="empty">Connect to your AXIS first.</p>
  {:else}
    <div class="prev">
      <DevicePreview
        name={name}
        accent={accent}
        gearColor={gearColor}
        meterColor={meterColor}
        nameColor={nameColor}
        fgColor={fgColor}
        mutedColor={mutedColor}
        warnColor={warnColor}
      />
    </div>

    <div class="lab">Quick look</div>
    <div class="packs">
      {#each PACKS as p}
        <button type="button" class="pk" on:click={() => applyPack(p)}>
          <span class="sw">
            <i style="background:{p.c[1]}"></i><i style="background:{p.c[2]}"></i><i style="background:{p.c[3]}"></i>
          </span>
          {p.label}
        </button>
      {/each}
    </div>

    <div class="lab">Or choose each part</div>
    <label class="el"><span>Gear number<small>the big digit</small></span><input type="color" bind:value={gearColor} /></label>
    <label class="el"><span>Rev ring<small>fills as you rev</small></span><input type="color" bind:value={meterColor} /></label>
    <label class="el"><span>Redline<small>warning colour</small></span><input type="color" bind:value={warnColor} /></label>
    <label class="el"><span>Highlights<small>icons & accents</small></span><input type="color" bind:value={accent} /></label>
    <label class="el"><span>Your name<small>the text below</small></span><input type="color" bind:value={nameColor} /></label>

    <details class="adv">
      <summary>More colours</summary>
      <label class="el"><span>Main text</span><input type="color" bind:value={fgColor} /></label>
      <label class="el"><span>Dim text</span><input type="color" bind:value={mutedColor} /></label>
    </details>

    <label class="el"><span>Name on screen</span>
      <input class="nm" type="text" bind:value={name} maxlength={snap?.max_name ?? 16} placeholder="MY AXIS" />
    </label>

    <button type="button" class="rowlink" on:click={() => store.page = 'screensaver'}>
      Add a photo / GIF screensaver <span>›</span>
    </button>

    {#if err}<p class="err">{err}</p>{/if}
    <button type="button" class="save" disabled={!dirty || saving} on:click={save}>
      {#if saving}<Glyph kind="saving" size={18} /> Saving…
      {:else if saved && !dirty}Saved ✓
      {:else}Save my look{/if}
    </button>
  {/if}
  {:else}
    <!-- Full gauge editor, hosted inline (header/back/title suppressed). -->
    <GaugeSetup embedded />
  {/if}
</div>

<style>
  /* No own gutter: <main> already applies var(--s-4) padding all round +
     reserves space for BottomNav. A second padding level here would inset
     the embedded GaugeSetup (which is designed to sit flush in <main>'s
     16px gutter when standalone) to ~32px and double the bottom padding. */
  .pg { padding: 0; max-width: 480px; margin: 0 auto; color: var(--fg, #e9e7df); }
  .hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
  .wm { letter-spacing: 3px; font-weight: 500; }
  .sub { color: var(--muted, #85826f); font-size: 13px; }
  .empty { color: var(--muted, #85826f); text-align: center; padding: 40px 0; }
  /* device segmented control */
  .devsel { display: flex; gap: 6px; background: var(--surface-2, #15151a); border: 1px solid var(--border, #26261c); border-radius: 11px; padding: 4px; margin-bottom: 16px; }
  .devsel button { flex: 1; background: none; border: 0; border-radius: 8px; color: var(--muted, #85826f); font-size: 13px; letter-spacing: .5px; padding: 9px 0; cursor: pointer; transition: color 120ms ease, background 120ms ease; }
  .devsel button.on { color: #1c1607; background: var(--accent, #c9a24a); font-weight: 500; }
  .prev { display: flex; justify-content: center; margin-bottom: 8px; }
  .lab { font-size: 11px; letter-spacing: 1.5px; color: var(--muted, #8f8a79); margin: 16px 0 8px; }
  .packs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pk { display: flex; align-items: center; gap: 8px; background: var(--surface-2, #15151a); border: 1px solid var(--border, #26261c); border-radius: 10px; padding: 9px; color: inherit; cursor: pointer; font-size: 13px; }
  .pk .sw { display: flex; gap: 3px; }
  .pk .sw i { width: 11px; height: 11px; border-radius: 50%; display: block; }
  .el { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border, #1f1f1c); }
  .el span { font-size: 13px; }
  .el small { display: block; font-size: 10.5px; color: var(--muted, #75726a); margin-top: 1px; }
  .el input[type=color] { width: 38px; height: 28px; border: 1px solid var(--border, #3a382f); border-radius: 7px; background: none; padding: 2px; cursor: pointer; }
  .el .nm { flex: 1; max-width: 180px; background: var(--surface-2, #15151a); border: 1px solid var(--border, #3a382f); border-radius: 8px; color: inherit; padding: 8px; font-family: var(--font-mono, monospace); letter-spacing: 1px; }
  .adv { margin-top: 6px; }
  .adv summary { font-size: 12px; color: var(--muted, #85826f); cursor: pointer; padding: 8px 0; }
  .rowlink { width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; background: var(--surface-2, #121212); border: 1px solid var(--border, #1f1f1c); border-radius: 10px; padding: 12px; color: inherit; cursor: pointer; font-size: 13px; margin-top: 14px; }
  .err { color: var(--warn, #e24b4a); font-size: 12px; margin: 10px 0 0; }
  .save { width: 100%; margin-top: 16px; padding: 13px; border-radius: 11px; border: 1px solid var(--accent, #c9a24a); background: var(--accent, #c9a24a); color: #1c1607; font-weight: 500; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .save:disabled { opacity: .45; cursor: default; }
</style>
