<script lang="ts">
  import { onMount } from 'svelte';
  import type { BrandingSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';

  let snap   = $state<BrandingSnapshot | null>(null);
  let name   = $state('');
  let color  = $state('#FFA500');
  let saving = $state(false);
  let err    = $state<string | null>(null);
  let saved  = $state(false);

  onMount(async () => {
    if (!store.client) return;
    try {
      snap  = await store.client.branding();
      name  = snap.name;
      color = snap.accent_hex;
    } catch (e: any) {
      err = e?.message ?? 'load failed';
    }
  });

  // Dirty flag derived from current inputs vs. last snapshot.
  let dirty = $derived(!!snap && (name.trim() !== snap.name || color.toUpperCase() !== snap.accent_hex.toUpperCase()));

  async function save() {
    if (!store.client || !snap) return;
    saving = true;
    err = null;
    saved = false;
    try {
      await store.client.setBranding({
        name:       name.trim().slice(0, snap.max_name),
        accent_hex: color
      });
      // Re-fetch so the badge updates and dirty flag clears.
      snap = await store.client.branding();
      saved = true;
      // Also refresh /api/info so Dashboard shows the new device name.
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'save failed';
    } finally {
      saving = false;
    }
  }

  async function reset() {
    if (!store.client || !snap) return;
    if (!confirm('Reset device name and accent colour to factory defaults?')) return;
    try {
      await store.client.resetBranding();
      snap = await store.client.branding();
      name = snap.name; color = snap.accent_hex;
      try { store.info = await store.client.info(); } catch {}
    } catch (e: any) {
      err = e?.message ?? 'reset failed';
    }
  }
</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>BRAND</h1>
</header>

{#if err}<div class="card err">{err}</div>{/if}

{#if !snap}
  <div class="card muted">Loading…</div>
{:else}
  <!-- Live preview chip — shows what the device will use -->
  <div class="card preview" style="--preview: {color}">
    <div class="chip" style="background: {color}"></div>
    <div class="preview-text">
      <div class="ptitle" style="color: {color}">{name || 'AXIS'}</div>
      <div class="psub">v{store.info?.version ?? '?'}</div>
    </div>
  </div>

  <div class="card">
    <label for="name">Device name</label>
    <input
      id="name" type="text"
      bind:value={name}
      maxlength={snap.max_name}
      placeholder="AXIS"
      autocomplete="off" spellcheck="false"
    />
    <p class="hint">Shown on the INFO screen. Max {snap.max_name} chars.</p>
  </div>

  <div class="card">
    <label for="color">Accent colour</label>
    <div class="color-row">
      <input id="color" type="color" bind:value={color} />
      <span class="mono hex">{color.toUpperCase()}</span>
    </div>
    <p class="hint">Used by every highlighted element across the device UI.</p>
  </div>

  <div class="actions">
    <button on:click={reset}>RESET</button>
    <button class="primary" class:hot={dirty} disabled={!dirty || saving} on:click={save}>
      {saving ? 'SAVING…' : saved && !dirty ? 'SAVED' : 'APPLY'}
    </button>
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }
  .err  { color: var(--danger); }
  .muted { color: var(--muted); text-align: center; }
  label  { margin: 0; }
  .hint  { color: var(--muted); font-size: 12px; margin: var(--s-1) 0 0; }

  .preview {
    display: flex; align-items: center; gap: var(--s-3);
    padding: var(--s-4);
    border-color: var(--preview);
  }
  .chip {
    width: 56px; height: 56px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 14px var(--preview);
  }
  .preview-text { display: flex; flex-direction: column; gap: var(--s-1); }
  .ptitle { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
  .psub   { color: var(--muted); font-size: 13px; font-family: var(--font-mono); }

  .color-row { display: flex; align-items: center; gap: var(--s-3); margin-top: var(--s-2); }
  input[type="color"] {
    width: 64px; height: 44px;
    border: 1px solid var(--border);
    border-radius: var(--r-1);
    padding: 2px;
    background: var(--surface-2);
    cursor: pointer;
  }
  .hex { color: var(--muted); }

  .actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  .hot { box-shadow: 0 0 0 2px var(--accent); }
</style>
