<script lang="ts">
  // =====================================================================
  //  MonitorOta — one-tap firmware update for the AXIS Monitor (the gauge)
  //  and its CAN sensor (the node). Ported from founder-gauge's
  //  MonitorSetup OTA card into the SN AXIS companion.
  //
  //  The phone (which has internet) fetches the firmware manifest from the
  //  GitHub Pages / jsDelivr mirror, compares it to what the DEVICES report
  //  over BLE (MonitorBleClient.readVersions), downloads the .bin, and
  //  flashes it over BLE:
  //    · Gauge (monitor) → the monitor self-flashes its own ota_1 slot.
  //    · Sensor (node)   → the monitor relays it to the node over ESP-NOW.
  //
  //  Reached via Pro → Firmware update. Reuses store.monClient so the link
  //  survives navigation (like Drivetrain). DEMO shows a canned up-to-date
  //  state with no network + no flashing (App-Store 5.6 full-UI rule).
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import { t } from '../lib/i18n';
  import {
    MonitorBleClient, type MonScanHit, type DeviceVersions,
    OTA_TARGET_MONITOR, OTA_TARGET_NODE, verStr, verCmp,
  } from '../lib/monitorCfg';
  import {
    fetchCanManifest, latest, parseVer, downloadFirmware,
    type CanManifest, type CanReleaseEntry,
  } from '../lib/axisCanOta';

  // Dev-only tooling gate. Ships FALSE so consumers never see the raw
  // local firmware-file flasher (App-Store 5.6). The one-tap over-the-air
  // update flow is unaffected. Flip true only in local engineering builds.
  const DEV_TOOLS = false;

  type Phase = 'idle' | 'scan' | 'connecting' | 'loading' | 'ready';
  let phase    = $state<Phase>('idle');
  let scanning = $state(false);
  let hits     = $state<MonScanHit[]>([]);
  let errMsg   = $state<string | null>(null);
  let statusMsg = $state<string | null>(null);
  let mon: MonitorBleClient | null = $state(null);
  let demo = $state(false);

  // ---- OTA state ----
  let manifest = $state<CanManifest | null>(null);
  let devVers  = $state<DeviceVersions | null>(null);
  let otaBusy  = $state(false);        // fetching manifest / versions
  let otaNote  = $state('');

  let flashing = $state<'' | 'monitor' | 'node'>('');   // which target is flashing
  let flashPct = $state(0);
  let flashMsg = $state('');

  const monLatest  = $derived(manifest ? latest(manifest.monitor) : null);
  const nodeLatest = $derived(manifest ? latest(manifest.node) : null);
  const monUpdate  = $derived(!!(monLatest && devVers &&
    verCmp(parseVer(monLatest.version), devVers.monitor) > 0));
  const nodeUpdate = $derived(!!(nodeLatest && devVers?.node &&
    verCmp(parseVer(nodeLatest.version), devVers.node) > 0));

  // Reuse a live monitor link if one exists (came from another page); else
  // enter DEMO offline (canned up-to-date, no network) or scan.
  $effect(() => {
    if (phase !== 'idle') return;
    if (store.monClient) { mon = store.monClient; void load(); }
    else if (store.isDemo) { demo = true; loadDemo(); phase = 'ready'; }
    else phase = 'scan';
  });

  async function scan() {
    if (scanning) return;
    scanning = true; errMsg = null; statusMsg = null; hits = [];
    try {
      await MonitorBleClient.scan(h => { hits = [...hits, h]; }, 6000);
      if (hits.length === 0) errMsg = t('monota.no_monitor');
    } catch (e: any) { errMsg = e?.message ?? t('monota.scan_failed'); }
    finally { scanning = false; }
  }

  async function connectTo(id: string) {
    phase = 'connecting'; errMsg = null; statusMsg = null;
    try {
      const m = new MonitorBleClient(id);
      await m.connect(() => { store.monClient = null; mon = null; phase = 'scan'; statusMsg = t('monota.disconnected'); });
      mon = m; store.monClient = m;
      await load();
    } catch (e: any) {
      errMsg = e?.message ?? t('monota.connect_failed'); phase = 'scan';
    }
  }

  async function load() {
    if (!mon) return;
    phase = 'loading'; errMsg = null;
    try {
      const [m, v] = await Promise.all([
        fetchCanManifest(),
        mon.readVersions().catch(() => null),
      ]);
      manifest = m; devVers = v; phase = 'ready';
    } catch (e: any) {
      // Reading versions off a live monitor is optional; only the manifest
      // fetch can hard-fail here. Still land on the page so the user sees why.
      otaNote = t('monota.load_err', { err: e?.message ?? e });
      phase = 'ready';
    }
  }

  // Canned "up to date" state for DEMO — no network, no device. Latest ==
  // installed so both rows read "Reinstall" and nothing needs updating.
  function loadDemo() {
    devVers = { monitor: { major: 0, minor: 12, patch: 6 }, node: { major: 0, minor: 5, patch: 5 } };
    manifest = {
      _schema: 'axis-can-firmware/v1',
      monitor: [{
        version: '0.12.6', date: '2026-07-10',
        notes: 'Multi-car calc-gear + banded AMOLED push. You’re on the latest gauge firmware.',
        url: '', size_bytes: 0,
      }],
      node: [{
        version: '0.5.5', date: '2026-07-10',
        notes: 'True P/R/N/D selector decode. You’re on the latest sensor firmware.',
        url: '', size_bytes: 0,
      }],
    };
  }

  async function installUpdate(which: 'monitor' | 'node', entry: CanReleaseEntry) {
    if (demo || !mon) { flashMsg = t('monota.demo_install'); return; }
    if (flashing) return;
    flashing = which; flashPct = 0; flashMsg = t('monota.downloading');
    try {
      const bin = await downloadFirmware(entry);
      flashMsg = which === 'monitor' ? t('monota.flashing_gauge') : t('monota.flashing_sensor');
      const target = which === 'monitor' ? OTA_TARGET_MONITOR : OTA_TARGET_NODE;
      await mon.flash(target, bin, (p) => (flashPct = p),
        () => { flashMsg = t('monota.tap_gauge'); });   // Phase-2 authz (fw v0.69.0+)
      flashMsg = which === 'monitor' ? t('monota.gauge_updated') : t('monota.sensor_updated');
      setTimeout(refresh, 4500);        // device reboots; re-read versions
    } catch (e: any) {
      flashMsg = '✗ ' + (e?.message ?? e);
    } finally {
      flashing = '';
    }
  }

  async function refresh() {
    if (demo || !mon || otaBusy || flashing) return;
    otaBusy = true; otaNote = '';
    try {
      const [m, v] = await Promise.all([
        fetchCanManifest(),
        mon.readVersions().catch(() => null),
      ]);
      manifest = m; devVers = v;
    } catch (e: any) {
      otaNote = t('monota.load_err', { err: e?.message ?? e });
    } finally {
      otaBusy = false;
    }
  }

  // ---- Advanced: install a local .app.bin (offline / pre-release testing) ----
  let manFile   = $state<Uint8Array | null>(null);
  let manName   = $state('');
  let manTarget = $state<'monitor' | 'node'>('node');
  async function onManPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    manFile = new Uint8Array(await f.arrayBuffer());
    manName = f.name; flashMsg = '';
  }
  async function doManFlash() {
    if (demo || !mon) { flashMsg = t('monota.demo_install'); return; }
    if (!manFile || flashing) return;
    flashing = manTarget; flashPct = 0; flashMsg = t('monota.flashing');
    try {
      const target = manTarget === 'monitor' ? OTA_TARGET_MONITOR : OTA_TARGET_NODE;
      await mon.flash(target, manFile, (p) => (flashPct = p),
        () => { flashMsg = t('monota.tap_gauge'); });   // Phase-2 authz (fw v0.69.0+)
      flashMsg = t('monota.flashed');
    } catch (e: any) {
      flashMsg = '✗ ' + (e?.message ?? e);
    } finally {
      flashing = '';
    }
  }
</script>

<PageHeader title={t('monota.title')} back="axis" backLabel="AXIS" />

{#if phase === 'scan' || phase === 'idle'}
  <div class="card">
    <p class="sub">{@html t('monota.intro')}</p>
    <button class="ghost wide" onclick={scan} disabled={scanning}>{scanning ? t('monota.scanning') : t('monota.scan_btn')}</button>
    {#each hits as h (h.id)}
      <button class="ghost wide hit" onclick={() => connectTo(h.id)}>{h.name}</button>
    {/each}
    {#if errMsg}<p class="note">{errMsg}</p>{/if}
    {#if statusMsg}<p class="note">{statusMsg}</p>{/if}
  </div>
{:else if phase === 'connecting' || phase === 'loading'}
  <div class="card"><p class="sub">{phase === 'connecting' ? t('monota.connecting') : t('monota.checking_updates')}</p></div>
{:else if phase === 'ready'}
  <div class="card">
    <div class="head"><strong>{t('monota.firmware')}</strong>
      <span class="badge" class:online={!demo} class:demo={demo}>{demo ? t('monota.demo') : t('monota.connected')}</span></div>
    <p class="sub dim">{t('monota.ready_intro')}{#if demo}{@html t('monota.demo_suffix')}{/if}</p>

    {#if otaBusy && !manifest}
      <p class="sub dim">{t('monota.checking_updates')}</p>
    {:else if manifest}
      <!-- Gauge (monitor) row -->
      {@render fwRow(t('monota.row_gauge'), 'monitor', verStr(devVers?.monitor), monLatest, monUpdate)}
      <!-- Sensor (node) row -->
      {@render fwRow(t('monota.row_sensor'), 'node',
        devVers?.node ? verStr(devVers.node) : t('monota.unknown'), nodeLatest, nodeUpdate)}
    {/if}

    {#if flashing}
      <div class="fw-bar"><div class="fw-fill" style="width:{flashPct}%"></div></div>
    {/if}
    {#if flashMsg}<p class="note">{flashMsg}</p>{/if}
    {#if otaNote}<p class="note">{otaNote}</p>{/if}

    <div class="fw-actions">
      <button class="ghost" onclick={refresh} disabled={demo || otaBusy || flashing !== ''}>
        {otaBusy ? t('monota.checking') : t('monota.check_again')}
      </button>
    </div>
  </div>

  {#if DEV_TOOLS}
    <!-- Advanced: install a local firmware file (dev-only; hidden in the
         shipped app so consumers never see a raw file flasher — 5.6). -->
    <details class="card fw-manual-card">
      <summary>{t('monota.adv_summary')}</summary>
      <p class="sub dim">{@html t('monota.adv_hint')}</p>
      <div class="fw-man-row">
        <select bind:value={manTarget} disabled={flashing !== ''}>
          <option value="node">{t('monota.opt_sensor')}</option>
          <option value="monitor">{t('monota.opt_gauge')}</option>
        </select>
        <input class="fw-input" type="file" accept=".bin" onchange={onManPick} disabled={flashing !== ''} />
      </div>
      {#if manName}<p class="fw-name">{manName} · {Math.round((manFile?.length ?? 0) / 1024)} KB</p>{/if}
      <button class="ghost wide" onclick={doManFlash} disabled={!manFile || flashing !== ''}>
        {flashing ? t('monota.flashing_pct', { pct: flashPct }) : t('monota.flash_file')}
      </button>
    </details>
  {/if}
{/if}

<!-- one device row: label + version on the left, action on the right -->
{#snippet fwRow(label: string, which: 'monitor' | 'node',
                cur: string, ent: CanReleaseEntry | null, hasUpdate: boolean)}
  <div class="fw-row">
    <div class="fw-row-main">
      <span class="fw-row-label">{label}</span>
      <span class="fw-row-ver">
        {cur}{#if ent} · {t('monota.latest')} {ent.version}{/if}
      </span>
    </div>
    {#if flashing === which}
      <span class="fw-row-status">{flashPct}%</span>
    {:else if ent}
      <button class="fw-install" class:up={hasUpdate}
        onclick={() => installUpdate(which, ent)} disabled={flashing !== ''}>
        {hasUpdate ? t('monota.update') : t('monota.reinstall')}
      </button>
    {:else if manifest}
      <span class="fw-row-status dim">—</span>
    {/if}
  </div>
  {#if ent?.notes}<p class="fw-notes">{ent.notes}</p>{/if}
{/snippet}

<style>
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-4); }
  .card + .card { margin-top: var(--s-3); }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s-2); }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: .5px; border-radius: 999px; padding: 2px 8px; }
  .badge.online { color: #000; background: var(--accent); }
  .badge.demo { color: #000; background: var(--accent); opacity: .75; }
  .sub { color: var(--muted); font-size: 13px; margin: 0 0 var(--s-3); }
  .sub.dim { opacity: .75; }
  .note { font-size: 13px; color: var(--fg); margin: var(--s-2) 0; }

  .ghost { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
           border-radius: var(--radius); padding: 10px 14px; font-size: 14px; cursor: pointer; }
  .ghost:disabled { opacity: .4; cursor: default; }
  .ghost.wide { width: 100%; margin-top: var(--s-2); }
  .hit { text-align: left; }

  /* one firmware row: label + version left, action right */
  .fw-row {
    display: flex; align-items: center; justify-content: space-between; gap: var(--s-3);
    padding: var(--s-3) 0; border-top: 1px solid var(--border);
  }
  .fw-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .fw-row-label { font-size: 14px; font-weight: 600; color: var(--fg); }
  .fw-row-ver { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
  .fw-row-status { font-family: var(--font-mono); font-size: 13px; color: var(--accent); flex: 0 0 auto; }
  .fw-row-status.dim { color: var(--muted); }
  .fw-install {
    flex: 0 0 auto; min-height: 36px; padding: 0 var(--s-3);
    background: none; border: 1px solid var(--border); color: var(--muted);
    border-radius: var(--radius); cursor: pointer; font-size: 13px; font-weight: 600;
  }
  .fw-install.up { background: var(--accent); color: #000; border-color: var(--accent); }
  .fw-install:disabled { opacity: .4; cursor: default; }
  .fw-notes {
    font-size: 12px; color: var(--muted); line-height: 1.5;
    margin: 0 0 var(--s-2); max-height: 8em; overflow-y: auto;
  }
  .fw-actions { display: flex; justify-content: flex-end; margin-top: var(--s-2); }
  .fw-actions .ghost { font-size: 12px; padding: 8px 12px; }

  .fw-bar { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; margin: var(--s-2) 0; }
  .fw-fill { height: 100%; background: var(--accent); transition: width .2s ease; }

  .fw-manual-card > summary {
    font-size: 13px; font-weight: 500; color: var(--muted); cursor: pointer;
    list-style: none; font-family: var(--font-mono);
  }
  .fw-manual-card > summary::-webkit-details-marker { display: none; }
  .fw-manual-card > summary::before { content: '▸ '; }
  .fw-manual-card[open] > summary::before { content: '▾ '; }
  .fw-man-row { display: flex; gap: var(--s-2); align-items: center; margin-top: var(--s-2); }
  .fw-man-row select { background: var(--surface-2); border: 1px solid var(--border); color: var(--fg);
                       border-radius: 8px; padding: 7px 9px; font-size: 14px; }
  .fw-input { flex: 1; min-width: 0; color: var(--muted); font-size: 13px; }
  .fw-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg); margin: var(--s-2) 0; }
  code { font-family: var(--font-mono); font-size: 12px; color: var(--fg); }
</style>
