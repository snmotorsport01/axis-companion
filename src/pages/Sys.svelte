<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SysSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';

  // Live system snapshot — refreshed every 2s while this page is open.
  let snap = $state<SysSnapshot | null>(null);
  let err  = $state<string | null>(null);
  let busy = $state(false);
  let poll: number | undefined;

  async function refresh() {
    if (!store.client) return;
    try { snap = await store.client.sys(); err = null; }
    catch (e: any) { err = e?.message ?? 'load failed'; }
  }

  onMount(() => {
    refresh();
    poll = window.setInterval(refresh, 2000);
  });
  onDestroy(() => { if (poll) window.clearInterval(poll); });

  // ---- Actions -------------------------------------------------------

  async function doReboot() {
    if (!store.client) return;
    if (!confirm('Restart the device? Active connections will drop.')) return;
    busy = true;
    try {
      await store.client.reboot();
      // Device is rebooting — bounce back to dashboard so the next poll
      // reflects a clean state.
      setTimeout(() => store.goDashboard(), 4000);
    } catch (e: any) {
      err = e?.message ?? 'reboot failed';
    } finally {
      busy = false;
    }
  }

  async function doFactoryReset() {
    if (!store.client) return;
    if (!confirm(
      'Reset everything to factory defaults?\n\n' +
      'This clears: brand colours, device name, tunables, screensaver, Wi-Fi credentials, calibration.\n\n' +
      'The device will reboot.'
    )) return;
    busy = true;
    try {
      await store.client.factoryReset();
      setTimeout(() => store.goDashboard(), 5000);
    } catch (e: any) {
      err = e?.message ?? 'factory reset failed';
    } finally {
      busy = false;
    }
  }

  // ---- Formatters ----------------------------------------------------

  function formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d) return `${d}d ${h}h ${m}m`;
    if (h) return `${h}h ${m}m ${sec}s`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function formatBytes(n: number): string {
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
    if (n >= 1024)        return (n / 1024).toFixed(1) + ' KB';
    return n + ' B';
  }

  function pct(used: number, total: number): string {
    if (!total) return '—';
    return ((used / total) * 100).toFixed(0) + '%';
  }
</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>SYS</h1>
</header>

{#if err}<div class="card err">{err}</div>{/if}

{#if !snap}
  <div class="card muted">Loading…</div>
{:else}
  <!-- Identity -->
  <div class="card">
    <h3>Identity</h3>
    <dl>
      <dt>Firmware</dt>      <dd class="mono accent">{snap.version}</dd>
      <dt>Hardware ID</dt>   <dd class="mono small">{snap.mac}</dd>
      <dt>CPU</dt>           <dd class="mono">{snap.cpu_mhz} MHz</dd>
      <dt>Uptime</dt>        <dd class="mono">{formatUptime(snap.uptime_ms)}</dd>
    </dl>
  </div>

  <!-- Memory -->
  <div class="card">
    <h3>Memory</h3>
    <dl>
      <dt>Heap (free)</dt>
      <dd class="mono">{formatBytes(snap.free_heap)}<span class="muted small"> / {formatBytes(snap.heap_size)}</span></dd>
      <dt>Heap (min seen)</dt>
      <dd class="mono">{formatBytes(snap.min_heap)}</dd>
      <dt>PSRAM (free)</dt>
      <dd class="mono">{formatBytes(snap.psram_free)}<span class="muted small"> / {formatBytes(snap.psram_size)}</span></dd>
      <dt>Flash</dt>
      <dd class="mono">{formatBytes(snap.flash_size)}</dd>
    </dl>
    {#if snap.psram_size > 0}
      <div class="bar-bg">
        <div class="bar-fill"
             style="width: {pct(snap.psram_size - snap.psram_free, snap.psram_size)}"></div>
      </div>
      <p class="muted small">PSRAM {pct(snap.psram_size - snap.psram_free, snap.psram_size)} used</p>
    {/if}
  </div>

  <!-- Wireless -->
  <div class="card">
    <h3>Wireless</h3>
    <dl>
      {#if snap.ap_ssid}
        <dt>Setup AP</dt>
        <dd class="mono">{snap.ap_ssid} · {snap.ap_clients} client{snap.ap_clients === 1 ? '' : 's'}</dd>
        <dt>AP address</dt>
        <dd class="mono">{snap.ap_ip}</dd>
      {/if}
      <dt>Home Wi-Fi</dt>
      <dd>
        {#if snap.sta_connected}
          <span class="dot online"></span>
          <span class="mono">{snap.sta_ssid}</span>
        {:else}
          <span class="dot offline"></span>
          <span class="muted">disconnected</span>
        {/if}
      </dd>
      {#if snap.sta_connected}
        <dt>Home IP</dt>      <dd class="mono">{snap.sta_ip}</dd>
        <dt>Signal</dt>       <dd class="mono">{snap.sta_rssi} dBm</dd>
      {/if}
    </dl>
  </div>

  <!-- Active mode -->
  {#if snap.mode_name}
    <div class="card">
      <h3>Active mode</h3>
      <dl>
        <dt>Mode</dt>        <dd class="mono">{snap.mode_name}</dd>
        {#if snap.gear_count}
          <dt>Gears</dt>     <dd class="mono">{snap.gear_count}</dd>
        {/if}
      </dl>
    </div>
  {/if}

  <!-- Actions -->
  <div class="card">
    <h3>Actions</h3>
    <p class="hint">Restart keeps your settings. Factory reset clears everything.</p>
    <div class="actions">
      <button on:click={doReboot} disabled={busy}>RESTART</button>
      <button class="danger" on:click={doFactoryReset} disabled={busy}>FACTORY RESET</button>
    </div>
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }

  .err   { color: var(--danger); }
  .muted { color: var(--muted); }
  .small { font-size: 12px; }
  .accent { color: var(--accent); }

  h3 { margin: 0 0 var(--s-2); font-size: 14px; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; }

  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; word-break: break-all; }

  .bar-bg {
    height: 6px; background: var(--surface-2);
    border-radius: 999px; overflow: hidden;
    margin-top: var(--s-3);
  }
  .bar-fill { height: 100%; background: var(--accent); transition: width 240ms ease-out; }

  .actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: var(--s-2); margin-top: var(--s-3);
  }
  .actions .danger {
    background: rgba(255, 59, 59, 0.18);
    color: var(--danger);
    border-color: rgba(255, 59, 59, 0.4);
  }
  .actions .danger:hover { background: rgba(255, 59, 59, 0.28); }

  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
  .dot.online  { background: var(--success); }
  .dot.offline { background: var(--muted); }

  .hint { color: var(--muted); font-size: 12px; line-height: 1.5; margin: var(--s-1) 0 0; }
</style>
