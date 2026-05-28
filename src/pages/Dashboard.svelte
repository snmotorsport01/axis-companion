<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { store } from '../lib/store.svelte';

  // Poll /api/info on a 1Hz cadence so the dashboard stays live.
  // We'll replace this with a WebSocket telemetry stream in P4.
  let poll: number | undefined;

  async function refresh() {
    if (!store.client) return;
    try {
      store.info = await store.client.info();
      store.connected = true;
      store.error = null;
    } catch (e: any) {
      store.connected = false;
      store.error = e?.message ?? 'lost connection';
    }
  }

  onMount(() => {
    refresh();
    poll = window.setInterval(refresh, 1000);
  });

  onDestroy(() => {
    if (poll) window.clearInterval(poll);
  });

  function disconnect() {
    store.client = null;
    store.info   = null;
    store.connected = false;
    store.goConnect();
  }

  // On the device build the Connect screen is skipped — hide the
  // DISCONNECT button since there's nothing useful to disconnect to.
  import { IS_DEVICE_BUILD } from '../lib/store.svelte';

  function formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m ${sec}s`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function formatBytes(n: number): string {
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    if (n >= 1024)        return (n / 1024).toFixed(1) + ' KB';
    return n + ' B';
  }
</script>

<header class="card top">
  <div>
    <strong>{store.info?.name ?? 'AXIS'}</strong>
    <span class="ver mono">· {store.info?.version ?? '?'}</span>
  </div>
  <div class="status">
    <span class="dot {store.connected ? 'online' : 'error'}"></span>
    {store.connected ? 'ONLINE' : 'OFFLINE'}
  </div>
</header>

{#if store.info}
  <div class="card gear">
    <h3>Current</h3>
    <div class="gear-display">
      <div class="big mono">{store.info.gear_label ?? '--'}</div>
      <div class="sub">
        {store.info.mode_name ?? '—'}
        {#if store.info.gear_count}
          <span class="muted">· {store.info.gear_count} speed</span>
        {/if}
      </div>
    </div>
    {#if store.info.gear_frozen}
      <div class="badge danger">FROZEN (motion)</div>
    {/if}
  </div>

  <div class="card">
    <h3>System</h3>
    <dl>
      <dt>Uptime</dt>
      <dd class="mono">{formatUptime(store.info.uptime_ms)}</dd>
      <dt>Free heap</dt>
      <dd class="mono">{formatBytes(store.info.free_heap)}</dd>
    </dl>
  </div>
{/if}

<nav class="tile-grid">
  <button on:click={() => store.page = 'live'}>LIVE</button>
  <button on:click={() => store.page = 'tune'}>TUNE</button>
  <button on:click={() => store.page = 'calibrate'}>CALIB</button>
  <button on:click={() => store.page = 'ota'}>OTA</button>
  <button disabled>BRAND</button>
  <button disabled>SYS</button>
</nav>

<p class="hint">Brand + Sys panels coming next.</p>

{#if !IS_DEVICE_BUILD}
  <button class="disconnect" on:click={disconnect}>DISCONNECT</button>
{/if}

<style>
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ver    { color: var(--muted); }
  .status { color: var(--muted); font-size: 13px; }

  .gear-display { text-align: center; padding: var(--s-3) 0; }
  .big          { font-size: 64px; font-weight: 700; letter-spacing: 0.02em; }
  .sub          { color: var(--muted); margin-top: var(--s-1); }
  .muted        { color: var(--border); }

  .badge {
    display: inline-block;
    margin-top: var(--s-2);
    padding: 4px 10px;
    border-radius: var(--r-1);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .badge.danger { background: rgba(255, 59, 59, 0.15); color: var(--danger); }

  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; }

  .tile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
  }
  .tile-grid button {
    height: 64px;
    font-size: 14px;
    letter-spacing: 0.08em;
  }
  .hint { color: var(--muted); font-size: 12px; text-align: center; margin: var(--s-2) 0; }

  .disconnect { margin-top: var(--s-3); }
</style>
