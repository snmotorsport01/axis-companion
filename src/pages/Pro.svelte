<script lang="ts">
  // =====================================================================
  //  Pro — the door that keeps the engineer surface out of a buyer's way.
  //  The original tuning / gauge / diagnostics / firmware pages are all
  //  still here, just one tap behind a "you can't break anything" banner.
  // =====================================================================
  import type { Page } from '../lib/store.svelte';
  import { store } from '../lib/store.svelte';

  const ITEMS: { id: Page; label: string; sub: string }[] = [
    { id: 'tune',       label: 'Fine-tuning',     sub: 'every shift parameter, raw' },
    { id: 'calibrate',  label: 'Re-teach gears',  sub: 'redo the gear positions' },
    { id: 'gaugesetup', label: 'Gauge',           sub: 'configure the AXIS gauge' },
    { id: 'drivetrain', label: 'Drivetrain',       sub: 'pick your car → correct gear' },
    { id: 'monconfig',  label: 'Gauge display',    sub: 'channels · layout · colours' },
    { id: 'diag',       label: 'Diagnostics',      sub: 'fault codes · times · bus capture' },
    { id: 'monota',     label: 'Firmware update',  sub: 'update gauge + sensor' },
    { id: 'brand',      label: 'Wi-Fi & colours',  sub: 'home Wi-Fi + full colour editor' },
    { id: 'devices',    label: 'Devices',          sub: 'connected hardware' },
    { id: 'sys',        label: 'System info',      sub: 'memory, battery, diagnostics' },
    // Firmware update moved to its own bottom-nav tab (UPDATE) — it's a
    // routine thing buyers do, not an enthusiast-only setting.
  ];
</script>

<div class="pg">
  <div class="hd"><span class="wm">AXIS</span><span class="sub">Pro</span></div>

  <p class="warn">For enthusiasts. You can't break anything — every screen has a reset, and your Look &amp; Feel are safe.</p>

  {#each ITEMS as it}
    <button type="button" class="row" on:click={() => store.page = it.id}>
      <span><span class="rl">{it.label}</span><span class="rs">{it.sub}</span></span>
      <span class="ch">›</span>
    </button>
  {/each}
</div>

<style>
  .pg { padding: 14px 16px 90px; max-width: 480px; margin: 0 auto; color: var(--fg, #e9e7df); }
  .hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
  .wm { letter-spacing: 3px; font-weight: 500; }
  .sub { color: var(--muted, #85826f); font-size: 13px; }
  .warn { font-size: 12px; color: var(--accent, #c9a24a); background: #1a160c; border: 1px solid #443611; border-radius: 10px; padding: 11px; line-height: 1.5; margin-bottom: 14px; }
  .row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--surface-2, #15151a); border: 1px solid var(--border, #1f1f1c); border-radius: 10px; padding: 13px; color: inherit; cursor: pointer; margin-bottom: 8px; text-align: left; }
  .rl { display: block; font-size: 14px; }
  .rs { display: block; font-size: 11px; color: var(--muted, #75726a); margin-top: 2px; }
  .ch { color: var(--muted, #75726a); font-size: 18px; }
</style>
