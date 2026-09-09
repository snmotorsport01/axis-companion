<script lang="ts">
  // =====================================================================
  //  ECU — push a standalone-ECU CAN profile to the AXIS sensor node so a
  //  Haltech / Link / MaxxECU / ECUMaster stream reads onto the gauge
  //  channels. Ported from founder-gauge. Pick your ECU preset → Push; the
  //  monitor relays the profile to the node over ESP-NOW (0xC4 chunks) and
  //  the node reassembles + persists it. "Clear" removes it (back to OBD).
  //
  //  A preset with a fixed CAN stream (confidence verified/community) pushes
  //  as-is; 'configurable' ECUs (freely-mappable output) have no fixed stream
  //  and are flagged — those need the full signal mapper (not in this page).
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import { ECU_PRESETS, presetById } from '../lib/ecuPresets';
  import { encodeProfile, chunkProfile, encodeClear } from '../lib/ecuProfile';

  const gauge = $derived(store.monClient);
  let picked = $state<string>('');
  let busy   = $state(false);
  let msg    = $state('');

  const chosen = $derived(picked ? presetById(picked) : undefined);

  async function push() {
    if (!gauge || busy) return;
    const p = chosen;
    if (!p) { msg = 'Pick your ECU first.'; return; }
    if (!p.profile) { msg = '⚠ This ECU has a freely-configurable output — a fixed preset isn’t possible. The full signal mapper is coming soon.'; return; }
    busy = true; msg = 'Pushing profile…';
    try {
      const chunks = chunkProfile(encodeProfile(p.profile));
      await (gauge as any).setEcuProfile(chunks);
      msg = `✓ Sent ${p.vendor} ${p.model} — the sensor is now reading your ECU.`;
    } catch (e) { msg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { busy = false; }
  }
  async function clear() {
    if (!gauge || busy) return;
    if (!confirm('Remove the ECU profile and go back to standard OBD?')) return;
    busy = true; msg = 'Clearing…';
    try {
      await (gauge as any).setEcuProfile(chunkProfile(encodeClear()));
      msg = '✓ Cleared — back to standard OBD.'; picked = '';
    } catch (e) { msg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { busy = false; }
  }
</script>

<PageHeader title="Standalone ECU" back="pro" backLabel="Pro" />

{#if !gauge}
  <div class="card">
    <p class="sub">Connect your AXIS Monitor first.</p>
    <button class="ghost wide" onclick={() => (store.page = 'axis')}>Go to gauge</button>
  </div>
{:else}
  <section class="card">
    <h3 class="ch">Running a standalone ECU?</h3>
    <p class="sub">If your car runs a Haltech, Link, MaxxECU or ECUMaster instead of the factory computer, pick it here so the AXIS sensor reads its CAN stream onto your gauge (RPM, boost, temps, AFR…).</p>

    <label class="lbl" for="ecusel">Your ECU</label>
    <select id="ecusel" class="sel" bind:value={picked} disabled={busy}>
      <option value="">— choose —</option>
      {#each ECU_PRESETS as p}
        <option value={p.id}>{p.vendor} · {p.model}{p.confidence === 'configurable' ? ' (mappable)' : ''}</option>
      {/each}
    </select>

    {#if chosen}
      <div class="meta">
        <span class="pill" class:ok={chosen.confidence === 'verified'} class:warn={chosen.confidence !== 'verified'}>{chosen.confidence}</span>
        <span class="src">{chosen.source}</span>
      </div>
      {#if chosen.notes}<p class="sub">{chosen.notes}</p>{/if}
    {/if}

    {#if msg}<p class="note">{msg}</p>{/if}

    <div class="actions">
      <button class="gold" onclick={push} disabled={busy || !chosen?.profile}>Push to sensor</button>
      <button class="ghost" onclick={clear} disabled={busy}>Clear (back to OBD)</button>
    </div>
  </section>
{/if}

<style>
  .card { background: rgba(24,27,33,.55); -webkit-backdrop-filter: blur(18px) saturate(1.15);
    backdrop-filter: blur(18px) saturate(1.15); border: 1px solid rgba(255,255,255,.07);
    border-radius: 16px; padding: 16px; margin: 8px 2px; max-width: 560px; }
  .ch { font-size: 15px; font-weight: 600; margin: 0 0 6px; color: #eef0f2; }
  .sub { color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.5; margin: 6px 0; }
  .lbl { display: block; font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
    color: #8b8f98; margin: 14px 0 5px; }
  .sel { width: 100%; padding: 12px; border-radius: 10px; background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.12); color: #eef0f2; font: inherit; }
  .meta { display: flex; align-items: center; gap: 10px; margin: 10px 0 2px; }
  .pill { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; padding: 3px 9px;
    border-radius: 100px; border: 1px solid; }
  .pill.ok   { color: #57c07a; border-color: rgba(87,192,122,.5); background: rgba(87,192,122,.1); }
  .pill.warn { color: #d9a441; border-color: rgba(217,164,65,.5); background: rgba(217,164,65,.1); }
  .src { font-size: 11px; color: #8b8f98; }
  .note { font-size: 13px; color: #cfccc0; margin: 10px 0 0; }
  .actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .gold { background: #cea24a; color: #17140c; border: 0; border-radius: 10px; padding: 12px 18px;
    font-weight: 600; cursor: pointer; }
  .gold:disabled { opacity: .5; cursor: default; }
  .ghost { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); color: #e7e9ec;
    border-radius: 10px; padding: 12px 16px; cursor: pointer; }
  .ghost.wide { width: 100%; }
</style>
