<script lang="ts">
  import { DeviceClient, normaliseHost } from '../lib/api';
  import { MockClient, SCENES, type DemoScene } from '../lib/mockClient';
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
      store.goLive();
    } catch (e: any) {
      err = e?.message ?? 'Connection failed';
      store.connected = false;
    } finally {
      busy = false;
    }
  }

  // DEMO MODE — skip the real network round-trip and instantiate a
  // MockClient that synthesises plausible device data + 30 Hz telemetry.
  // Useful in the iOS simulator (no AP join), for App Store screenshots,
  // and for UI development without firmware running. Live page shows a
  // gear cycling through R/N/1-5 and a smoothly drifting tilt dot.
  async function demo(scene: DemoScene = 'default') {
    const client = new MockClient(scene);
    store.client = client;
    store.info = await client.info();
    store.connected = true;
    store.goLive();
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

<!-- Demo mode scene picker — uses MockClient (synthesised data) instead
     of talking to a real device. Each scene paints a different driving
     situation so demos/screenshots can showcase the right behaviour
     without needing the hardware in the right state. -->
<div class="card demo-card">
  <h3>DEMO MODE <span class="muted small">— no device</span></h3>
  <div class="scene-grid">
    {#each SCENES as scene}
      <button class="scene" on:click={() => demo(scene.id)} disabled={busy}>
        <strong>{scene.label}</strong>
        <small>{scene.hint}</small>
      </button>
    {/each}
  </div>
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
  .demo-card { border: 1px dashed var(--border); }
  .demo-card h3 { margin-top: 0; font-family: var(--font-mono); letter-spacing: 1px; }
  .small { font-size: 11px; font-weight: normal; }
  .scene-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  .scene {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--fg);
    padding: var(--s-3);
    text-align: left;
    min-height: var(--tap-min);
  }
  .scene strong {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 1.5px;
    color: var(--accent);
  }
  .scene small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.3;
  }
  .scene:active { background: var(--surface); }
</style>
