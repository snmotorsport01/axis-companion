<script lang="ts">
  // =====================================================================
  //  Devices — manages the AXIS ecosystem from one place.
  //
  //  Today: the knob (paired over Wi-Fi or BLE).
  //  Soon: the AMOLED gauge (Waveshare 1.75"), the OBD/CAN module
  //        (MrDIY assembled bundle).
  //
  //  Both placeholder cards are intentional UX promises — the page
  //  doubles as a roadmap surface so users buying the knob today can
  //  see where the line is going. When the firmware for gauge / OBD
  //  lands, the cards flip from "Coming soon" → real pair flow.
  //
  //  BLE scan flow:
  //    1. Tap SCAN → BleClient.scan() filters by AXIS service UUID
  //    2. Each unique device adds a row
  //    3. Tap a row → BleClient.connect() + store.client = bleClient
  //    4. goLive — Live page picks up the new client + telemetry path
  // =====================================================================
  import { onMount, onDestroy } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { BleClient, type BleScanHit } from '../lib/bleClient';
  import PageHeader from '../lib/PageHeader.svelte';

  let scanning = $state(false);
  let scanErr  = $state<string | null>(null);
  let hits     = $state<BleScanHit[]>([]);
  let connecting = $state<string | null>(null);    // device id currently connecting
  let bleAvailable = $state<boolean | null>(null);

  onMount(async () => {
    bleAvailable = await BleClient.isAvailable();
  });

  async function scan() {
    if (scanning) return;
    scanning = true;
    scanErr  = null;
    hits = [];
    try {
      await BleClient.scan(hit => {
        // Reactive push — Svelte 5 doesn't auto-detect Array.push() on
        // a $state array, so re-assign.
        hits = [...hits, hit];
      }, 6000);
    } catch (e: any) {
      scanErr = e?.message ?? 'BLE scan failed';
    } finally {
      scanning = false;
    }
  }

  async function pickDevice(hit: BleScanHit) {
    connecting = hit.id;
    scanErr = null;
    try {
      const client = new BleClient(hit.id);
      await client.connect(() => {
        // On disconnect from the firmware side, mark the store offline.
        store.connected = false;
      });
      store.client = client;
      store.info = await client.info();
      store.connected = true;
      // Persist for next launch — same key the WiFi path uses, but the
      // BLE id has its own scheme so Connect knows which transport to
      // restore.
      store.setLastHost(`ble:${hit.id}`);
      store.goLive();
    } catch (e: any) {
      scanErr = e?.message ?? 'Connect failed';
    } finally {
      connecting = null;
    }
  }

  onDestroy(() => {
    // Best-effort stop — fine if scan already ended.
    // (BleClient.scan auto-stops after its window, so this is usually
    //  a no-op, but covers the case where the user navigates away
    //  mid-scan.)
  });

  // Whether a knob is "active" right now — for the current-device card.
  let knobConnected = $derived(store.connected && store.client !== null);
</script>

<PageHeader />

<!-- Knob — the one you bought first. Live status if anything's paired,
     otherwise the SCAN/CONNECT entry point. -->
<div class="card device">
  <header class="dev-head">
    <div>
      <strong>AXIS Knob</strong>
      <div class="muted small">Smart shifter · GC9A01 1.28"</div>
    </div>
    <span class="badge" class:online={knobConnected}>
      {knobConnected ? 'CONNECTED' : 'OFFLINE'}
    </span>
  </header>

  {#if knobConnected && store.info}
    <dl class="meta">
      <dt>Name</dt>     <dd class="mono">{store.info.name}</dd>
      <dt>Version</dt>  <dd class="mono">{store.info.version}</dd>
      {#if store.info.build}
        <dt>Build</dt>  <dd class="mono">{store.info.build}</dd>
      {/if}
    </dl>
  {/if}

  {#if !knobConnected}
    {#if bleAvailable === false}
      <p class="muted small">
        Bluetooth isn't available on this device (the iOS Simulator
        doesn't have a BLE radio). Use Wi-Fi pairing from the Connect
        screen instead.
      </p>
    {:else}
      <p class="muted small">
        Scan the airwaves for AXIS knobs nearby. They advertise on Bluetooth
        the moment they're powered on — no SoftAP join required.
      </p>
      <button class="primary scan-btn" on:click={scan} disabled={scanning}>
        {scanning ? 'SCANNING…' : 'SCAN BLUETOOTH'}
      </button>
      {#if scanErr}<p class="err small">{scanErr}</p>{/if}

      {#each hits as hit (hit.id)}
        <button
          class="hit"
          on:click={() => pickDevice(hit)}
          disabled={connecting !== null}
        >
          <div>
            <div class="hit-name">{hit.name}</div>
            <div class="muted xs mono">{hit.id}</div>
          </div>
          <div class="hit-right">
            {#if connecting === hit.id}
              <span class="muted small">connecting…</span>
            {:else if hit.rssi !== undefined}
              <span class="muted mono small">{hit.rssi} dBm</span>
            {/if}
          </div>
        </button>
      {/each}
    {/if}
  {/if}
</div>

<!-- Gauge — coming. Round AMOLED 466×466, IMU + GPS, anti-sleep,
     AI-character DTC display. Same brand language as the knob. -->
<div class="card device coming">
  <header class="dev-head">
    <div>
      <strong>AXIS Gauge</strong>
      <div class="muted small">1.75" round AMOLED · GPS + IMU</div>
    </div>
    <span class="badge coming">COMING</span>
  </header>
  <p class="muted small">
    Dash-mounted G-meter, lap timer, anti-sleep alerts, and the AI agent
    that turns DTCs into plain language. Paired to the knob over
    ESP-NOW — set up once, ride together.
  </p>
</div>

<!-- OBD / CAN — coming. MrDIY assembled shield (ESP32 + native TWAI),
     reads from OBD-II port or wire directly into a standalone ECU's
     CAN bus (MaxxECU / Haltech / MoTeC / Link / ECUMaster). -->
<div class="card device coming">
  <header class="dev-head">
    <div>
      <strong>AXIS CAN Module</strong>
      <div class="muted small">OBD-II + standalone ECU CAN-H/L</div>
    </div>
    <span class="badge coming">COMING</span>
  </header>
  <p class="muted small">
    Reads engine telemetry, drives the shift light, lets the knob
    virtual-switch your ECU's map / boost / launch. Local DTC dictionary
    so check-engine lights speak plain language without the cloud.
  </p>
</div>

<style>
  .card { padding: var(--s-4); }
  .device + .device { margin-top: var(--s-3); }

  .dev-head {
    display: flex; align-items: flex-start; gap: var(--s-3);
    margin-bottom: var(--s-3);
  }
  .dev-head > div:first-child { flex: 1; min-width: 0; }
  .dev-head strong {
    display: block;
    font-size: 16px;
    letter-spacing: 0.3px;
  }
  .muted { color: var(--muted); }
  .small { font-size: 13px; line-height: 1.45; }
  .xs    { font-size: 11px; }
  .err   { color: var(--danger); margin-top: var(--s-2); }

  .badge {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--muted);
    background: var(--surface-2);
    flex-shrink: 0;
  }
  .badge.online {
    color: var(--success);
    border-color: var(--success);
  }
  .badge.coming {
    color: var(--accent);
    border-color: var(--accent);
  }

  .coming { opacity: 0.85; }

  .meta {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--s-2) var(--s-4);
    margin: 0 0 var(--s-2);
  }
  .meta dt { color: var(--muted); }
  .meta dd { margin: 0; color: var(--accent); }

  .scan-btn { width: 100%; margin-top: var(--s-3); }

  .hit {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--fg);
    padding: var(--s-3);
    margin-top: var(--s-2);
    border-radius: var(--r-1);
    cursor: pointer;
    text-align: left;
    min-height: var(--tap-min);
  }
  .hit:active { background: var(--surface); }
  .hit[disabled] { opacity: 0.5; cursor: default; }
  .hit-name { font-family: var(--font-mono); }
  .hit-right { flex-shrink: 0; }
</style>
