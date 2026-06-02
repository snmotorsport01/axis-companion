<script lang="ts">
  // =====================================================================
  //  Connect — BLE-only pairing screen (v0.5).
  //
  //  Wi-Fi entry was removed in v0.5: BLE Phase 2/3 (v2.5.21 firmware)
  //  added chunked-transfer support for screensaver + OTA uploads, so
  //  BLE now covers every feature in the app. The Connect screen
  //  surfaces:
  //   • PAIR VIA BLUETOOTH — primary path
  //   • DEMO MODE          — synthesised data for iOS simulator /
  //                          App Store screenshots / UI development
  //  No more "Use Wi-Fi instead" fallback. If the user really needs
  //  Wi-Fi (eg. emergency recovery), the device's SETUP MODE on the
  //  LCD still surfaces the BLE pairing prompt, and any browser can
  //  still hit 192.168.4.1 directly from Safari for an HTML status
  //  page if the firmware decides to expose one in the future.
  // =====================================================================
  import { onMount } from 'svelte';
  import { MockClient, SCENES, type DemoScene } from '../lib/mockClient';
  import { BleClient, type BleScanHit } from '../lib/bleClient';
  import { store } from '../lib/store.svelte';

  // ---- BLE pair flow ---------------------------------------------------
  // Inline scan/connect right on the Connect screen so first-time users
  // don't have to enter DEMO MODE just to reveal the Devices tab. While
  // SETUP MODE is active on the device (5-tap MAIN → APP) the knob is
  // advertising; we filter the scan results by name and let the user
  // tap a hit to connect.
  let bleAvailable = $state(false);
  let scanning     = $state(false);
  let hits         = $state<BleScanHit[]>([]);
  let connecting   = $state<string | null>(null);
  let bleErr       = $state<string | null>(null);

  onMount(async () => {
    bleAvailable = await BleClient.isAvailable();
  });

  async function scanBle() {
    if (scanning) return;
    scanning = true;
    hits     = [];
    bleErr   = null;
    try {
      await BleClient.scan(hit => {
        // Replace-or-append by id so duplicates from the same scan
        // window collapse cleanly into a stable list.
        const ix = hits.findIndex(h => h.id === hit.id);
        if (ix === -1) hits = [...hits, hit];
        else           hits = hits.map((h, i) => i === ix ? hit : h);
      }, 6000);
    } catch (e: any) {
      bleErr = e?.message ?? 'BLE scan failed';
    } finally {
      scanning = false;
    }
  }

  async function connectBle(hit: BleScanHit) {
    connecting = hit.id;
    bleErr     = null;
    try {
      const client = new BleClient(hit.id);
      await client.connect(() => { store.connected = false; });
      store.client    = client;
      store.info      = await client.info();
      store.connected = true;
      store.goLive();
    } catch (e: any) {
      bleErr = e?.message ?? 'Connect failed';
    } finally {
      connecting = null;
    }
  }

  // DEMO MODE — skip the real network round-trip and instantiate a
  // MockClient that synthesises plausible device data + 30 Hz telemetry.
  // Useful in the iOS simulator (no BLE radio), for App Store
  // screenshots, and for UI development without firmware running.
  async function demo(scene: DemoScene = 'default') {
    const client = new MockClient(scene);
    store.client = client;
    store.info = await client.info();
    store.connected = true;
    store.goLive();
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
    <li>Wait for "<strong>ADVERTISING</strong>" to appear on the device LCD.</li>
    <li>Tap <strong>PAIR VIA BLUETOOTH</strong> below.</li>
  </ol>
</div>

<!-- ============================================================
     BLE pair — only path to a real device now (Phase 2/3 made BLE
     the carrier for screensaver + OTA too). Only renders when the
     Capacitor BLE plugin reports the radio is available, so the
     iOS simulator and any GitHub Pages browser view get DEMO MODE
     instead of a dead button.
     ============================================================ -->
{#if bleAvailable}
  <div class="card">
    <h3>Pair via Bluetooth</h3>
    <button class="primary connect" on:click={scanBle}
            disabled={scanning || !!connecting}>
      {scanning ? 'SCANNING…' : 'PAIR VIA BLUETOOTH'}
    </button>

    {#if bleErr}<p class="err">{bleErr}</p>{/if}

    {#if hits.length > 0}
      <ul class="hits">
        {#each hits as h (h.id)}
          <li>
            <button class="hit" on:click={() => connectBle(h)}
                    disabled={connecting === h.id}>
              <span class="hit-name">{h.name}</span>
              <span class="hit-rssi mono">
                {connecting === h.id ? 'connecting…' : (h.rssi != null ? `${h.rssi} dBm` : '')}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {:else if scanning}
      <p class="muted small mono">Looking for AXIS…</p>
    {/if}
  </div>
{:else}
  <!-- Capacitor BLE plugin says the radio isn't available (iOS
       simulator / browser preview). DEMO MODE below is the only
       way to enter the app from here. -->
  <div class="card">
    <h3>Bluetooth unavailable</h3>
    <p class="muted small">
      This device has no BLE radio (iOS simulator, browser preview).
      Pick a DEMO scene below to explore the app with synthesised data.
    </p>
  </div>
{/if}

<!-- Demo mode scene picker — uses MockClient (synthesised data) instead
     of talking to a real device. Each scene paints a different driving
     situation so demos/screenshots can showcase the right behaviour
     without needing the hardware in the right state. -->
<div class="card demo-card">
  <h3>DEMO MODE <span class="muted small">— no device</span></h3>
  <div class="scene-grid">
    {#each SCENES as scene}
      <button class="scene" on:click={() => demo(scene.id)} disabled={!!connecting}>
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

  /* ---- BLE hits list ---- */
  .hits {
    list-style: none;
    padding: 0;
    margin: var(--s-3) 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .hit {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--r-1);
    color: var(--fg);
    cursor: pointer;
  }
  .hit:active   { background: var(--surface); }
  .hit:disabled { opacity: 0.5; }
  .hit-name { font-weight: 700; }
  .hit-rssi { color: var(--muted); font-size: 12px; }
</style>
