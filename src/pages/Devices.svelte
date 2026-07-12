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

  let infoTimer: ReturnType<typeof setInterval> | null = null;
  onMount(async () => {
    bleAvailable = await BleClient.isAvailable();
    // Keep device info fresh while this page is open so the gauge-link badge
    // tracks the gauge powering on/off (info isn't otherwise re-polled after
    // the initial connect).
    const refresh = async () => {
      if (store.connected && store.client) {
        try { store.info = await store.client.info(); } catch { /* transient link blip */ }
      }
    };
    refresh();
    infoTimer = setInterval(refresh, 2000);
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
    // v2.5.41 — guard against a second tap landing while the first
    // connect is still in-flight. The Capacitor BLE plugin can hold
    // two simultaneous connect handles to the same deviceId, which on
    // iOS leads to undefined behaviour (one connect succeeds, the
    // other returns success too but the GATT service handles point at
    // a stale link).
    if (connecting !== null) return;
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
    if (infoTimer) clearInterval(infoTimer);
    // Best-effort stop — fine if scan already ended.
    // (BleClient.scan auto-stops after its window, so this is usually
    //  a no-op, but covers the case where the user navigates away
    //  mid-scan.)
  });

  // Whether a knob is "active" right now — for the current-device card.
  let knobConnected = $derived(store.connected && store.client !== null);

  // Gauge link — surfaced through the knob's /api/info + BLE info char.
  // `gauge_linked` is true while ESP-NOW telemetry is arriving from the gauge;
  // `gauge_mac` lets the user confirm it's THEIR car's gauge (anti cross-car).
  let gaugeStatusKnown = $derived(knobConnected && store.info?.gauge_linked !== undefined);
  let gaugeLinked      = $derived(gaugeStatusKnown && store.info?.gauge_linked === true);
</script>

<PageHeader title="Devices" back="pro" backLabel="Pro" />

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
        Bluetooth isn't available here. Turn it on to connect your AXIS, or
        explore the app with the live preview from the Connect screen.
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

<!-- Gauge — LIVE status via the knob's ESP-NOW shift-light link. Shows
     CONNECTED + the gauge's MAC (so you can confirm it's YOUR car's gauge,
     not a neighbour's) once the knob firmware reports gauge_linked. Falls
     back to the roadmap blurb when the knob isn't connected / is older fw. -->
<div class="card device">
  <header class="dev-head">
    <div>
      <strong>AXIS Gauge</strong>
      <div class="muted small">1.75" round AMOLED · GPS + IMU</div>
    </div>
    <span class="badge" class:online={gaugeLinked}>
      {gaugeLinked ? 'CONNECTED' : 'NOT CONNECTED'}
    </span>
  </header>

  {#if gaugeLinked}
    <dl class="meta">
      <dt>MAC</dt>  <dd class="mono">{store.info?.gauge_mac ?? '—'}</dd>
      <dt>RPM</dt>  <dd class="mono">{store.info?.gauge_rpm ?? 0}</dd>
    </dl>
    <p class="muted small">
      Linked over ESP-NOW. Check the MAC matches your gauge so you're not
      reading another car's.
    </p>
  {:else if gaugeStatusKnown}
    <p class="muted small">
      No gauge telemetry. Power on the AXIS gauge — it links to the knob
      automatically over ESP-NOW.
    </p>
  {:else}
    <p class="muted small">
      The AXIS Gauge is a dash-mounted display for speed, revs and more. Set
      its redline, shift light, warnings and colours below — it connects on
      its own over Bluetooth, no knob required.
    </p>
  {/if}

  <!-- Direct-BLE config (redline / shift light / warns) — independent of
       the knob relay above, so it's available whenever the gauge is on. -->
  <button class="primary scan-btn" on:click={() => (store.page = 'gaugesetup')}>
    CONFIGURE GAUGE →
  </button>
</div>

<!-- OBD / CAN — roadmap hardware. Hidden in DEMO so a reviewer doesn't see
     an actionless "COMING" placeholder card (Apple 5.6 placeholder content). -->
{#if !store.isDemo}
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
{/if}

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
