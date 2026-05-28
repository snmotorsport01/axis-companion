<script lang="ts">
  import { DeviceClient, normaliseHost } from '../lib/api';
  import { store } from '../lib/store.svelte';

  // Default: device's SoftAP gateway address. User can override.
  let host = $state(store.lastHost || '192.168.4.1');
  let busy = $state(false);
  let err  = $state<string | null>(null);

  async function connect() {
    err = null;
    busy = true;
    try {
      const base = normaliseHost(host);
      if (!base) throw new Error('Enter an IP or hostname');
      const client = new DeviceClient(base);
      const info = await client.info();
      store.client = client;
      store.info = info;
      store.connected = true;
      store.setLastHost(host);
      store.goDashboard();
    } catch (e: any) {
      err = e?.message ?? 'Connection failed';
      store.connected = false;
    } finally {
      busy = false;
    }
  }

  function handleEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !busy) connect();
  }
</script>

<header class="card hero">
  <h1>AXIS</h1>
  <p class="sub">
    <span class="dot offline"></span>NOT CONNECTED
  </p>
</header>

<div class="card">
  <h3>How to pair</h3>
  <ol>
    <li>On the device: <strong>5-tap</strong> the main screen → <strong>APP</strong>.</li>
    <li>Scan the QR with your phone — or join WiFi manually.</li>
    <li>Enter the gateway IP below and tap <strong>CONNECT</strong>.</li>
  </ol>
</div>

<div class="card">
  <label for="ip">DEVICE IP</label>
  <input id="ip" type="text" bind:value={host} on:keydown={handleEnter}
         placeholder="192.168.4.1" autocomplete="off"
         autocapitalize="off" spellcheck="false" />
  {#if err}
    <p class="err">{err}</p>
  {/if}
  <button class="primary connect" on:click={connect} disabled={busy}>
    {busy ? 'CONNECTING…' : 'CONNECT'}
  </button>
</div>

<style>
  .hero h1 { font-size: 32px; letter-spacing: 0.02em; }
  .sub     { color: var(--muted); margin: var(--s-2) 0 0; }
  ol       { margin: var(--s-2) 0 0; padding-left: 1.2em; color: var(--muted); }
  ol strong { color: var(--fg); }
  ol li + li { margin-top: var(--s-1); }
  .connect { width: 100%; margin-top: var(--s-3); }
  .err {
    color: var(--danger);
    font-size: 13px;
    margin: var(--s-2) 0 0;
  }
</style>
