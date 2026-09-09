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
    { id: 'antisleep',  label: 'Anti-sleep',       sub: 'break reminder · drowsiness' },
    { id: 'diag',       label: 'Gauge tools',      sub: 'drive log · accel times · health · exhaust' },
    { id: 'ecu',        label: 'Standalone ECU',   sub: 'Haltech · Link · MaxxECU → gauge' },
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

  <div class="rows">
    {#each ITEMS as it}
      <button type="button" class="row" on:click={() => store.page = it.id}>
        <span class="tx"><span class="rl">{it.label}</span><span class="rs">{it.sub}</span></span>
        <span class="ch">→</span>
      </button>
    {/each}
  </div>
</div>

<style>
  /* Frosted-carbon + gold, matching the app (Anti-sleep / Record log / Track). */
  .pg { padding: 8px 18px 24px; max-width: 560px; margin: 0 auto; color: #e7e9ec; }
  .hd { display: flex; align-items: baseline; gap: 10px; margin: 4px 2px 14px; }
  .wm { letter-spacing: 3px; font-weight: 500; font-size: 18px; }
  .hd .sub { color: #8b8f98; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; }
  .warn { font-size: 12px; color: var(--gold, #cea24a); background: rgba(206,162,74,.08);
          border: 1px solid rgba(206,162,74,.28); border-radius: 14px; padding: 13px 15px; line-height: 1.5; margin: 0 2px 16px; }

  .rows { display: flex; flex-direction: column; gap: 10px; }
  .row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
         background: rgba(24,27,33,.55); -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
         border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 15px 16px; color: inherit; cursor: pointer; text-align: left; transition: border-color .15s, background .15s; }
  .row:active { background: rgba(30,34,41,.7); border-color: rgba(206,162,74,.4); }
  .tx { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .rl { font-size: 15px; font-weight: 600; color: #eef0f2; }
  .rs { font-size: 11.5px; color: #8b8f98; }
  .ch { color: var(--gold, #cea24a); font-size: 16px; flex: 0 0 auto; }
</style>
