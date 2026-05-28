<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchReleaseManifest,
    resolveReleaseUrl,
    type ReleaseEntry,
    type WifiStatus
  } from '../lib/api';
  import { store } from '../lib/store.svelte';

  let wifi = $state<WifiStatus | null>(null);
  let deviceInstalling = $state<string | null>(null);
  let deviceProgress   = $state<'starting' | 'fetching' | 'done' | null>(null);

  // ---- Tab toggle ------------------------------------------------------
  type Tab = 'releases' | 'upload';
  let tab = $state<Tab>('releases');

  // ---- Releases tab state ---------------------------------------------
  let releases    = $state<ReleaseEntry[] | null>(null);
  let releasesErr = $state<string | null>(null);
  let installing  = $state<string | null>(null);    // version being installed
  let progress    = $state(0);                       // 0..1
  let stage       = $state<'download' | 'upload' | 'done' | 'idle'>('idle');

  // ---- Upload tab state -----------------------------------------------
  let file       = $state<File | null>(null);
  let uploading  = $state(false);
  let uploadErr  = $state<string | null>(null);
  let uploadDone = $state(false);
  let uploadProg = $state(0);

  onMount(() => {
    void reloadReleases();
    void reloadWifi();
  });

  async function reloadWifi() {
    if (!store.client) return;
    try { wifi = await store.client.wifi(); }
    catch { wifi = null; }
  }

  async function installViaDevice(r: ReleaseEntry) {
    if (!store.client || !wifi?.connected) return;
    if (isCurrent(r)) return;
    if (!confirm(`Tell the device to download and install ${r.version} itself?`)) return;
    deviceInstalling = r.version;
    deviceProgress   = 'starting';
    releasesErr      = null;
    try {
      const url = resolveReleaseUrl(r);
      deviceProgress = 'fetching';
      await store.client.otaFromDevice(url);
      deviceProgress = 'done';
      setTimeout(() => store.goDashboard(), 6000);
    } catch (e: any) {
      releasesErr = e?.message ?? 'install via device failed';
    } finally {
      deviceInstalling = null;
    }
  }

  async function reloadReleases() {
    releasesErr = null;
    releases    = null;
    try {
      const m = await fetchReleaseManifest();
      releases = m.releases ?? [];
    } catch (e: any) {
      releasesErr = e?.message ?? 'fetch failed';
    }
  }

  function isCurrent(r: ReleaseEntry): boolean {
    return !!store.info && store.info.version === r.version;
  }

  async function install(r: ReleaseEntry) {
    if (!store.client) return;
    if (isCurrent(r)) return;
    if (!confirm(`Install firmware ${r.version}? Device will reboot after.`)) return;
    installing = r.version;
    progress   = 0;
    stage      = 'download';
    try {
      const url = resolveReleaseUrl(r);
      await store.client.otaFromUrl(url, (p, s) => { progress = p; stage = s; });
      stage = 'done';
      // The firmware will reboot; the connection will drop. Bounce back to
      // the dashboard after the device should have come up again.
      setTimeout(() => store.goDashboard(), 6000);
    } catch (e: any) {
      releasesErr = e?.message ?? 'install failed';
    } finally {
      installing = null;
    }
  }

  // ---- Manual upload (fallback) ---------------------------------------
  function onPick(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
    uploadErr = null;
    uploadDone = false;
    uploadProg = 0;
  }

  async function upload() {
    if (!file || !store.client) return;
    uploading = true;
    uploadErr = null;
    uploadProg = 0;
    try {
      await store.client.ota(file, p => { uploadProg = p; });
      uploadDone = true;
      setTimeout(() => store.goDashboard(), 4000);
    } catch (e: any) {
      uploadErr = e?.message ?? 'upload failed';
    } finally {
      uploading = false;
    }
  }

  function fmtMb(b: number): string {
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
</script>

<header class="bar">
  <button class="back" on:click={() => store.goDashboard()}>‹ DASHBOARD</button>
  <h1>OTA</h1>
</header>

<div class="tabs">
  <button class:active={tab === 'releases'} on:click={() => tab = 'releases'}>RELEASES</button>
  <button class:active={tab === 'upload'}   on:click={() => tab = 'upload'}>UPLOAD</button>
</div>

{#if tab === 'releases'}
  <div class="card current">
    <span class="muted">Current</span>
    <span class="mono ver">{store.info?.version ?? '?'}</span>
    <button class="refresh" on:click={reloadReleases} disabled={installing !== null}>↻</button>
  </div>

  {#if releasesErr}
    <div class="card err">
      Failed to fetch releases: {releasesErr}
      <p class="muted small">
        <strong>iOS users:</strong> if you're viewing this in the
        "Captive Wi-Fi" sign-in popup, it can't use cellular data —
        only the AXIS Wi-Fi (which has no internet). Close the popup,
        open <strong>Safari</strong>, and go to
        <code>192.168.4.1</code>. Or add this app to your Home Screen
        for a standalone PWA that has full network access.
      </p>
      <p class="muted small">
        Manifest URL: <code>github.io/axis-companion/firmware/index.json</code>
      </p>
    </div>
  {:else if !releases}
    <div class="card muted">Loading…</div>
  {:else if releases.length === 0}
    <div class="card muted">
      No releases published yet. Use the UPLOAD tab to install a local .bin,
      or wait for a tagged build.
    </div>
  {:else}
    {#each releases as r}
      <div class="card release" class:installing={installing === r.version}>
        <div class="rhead">
          <span class="mono ver">{r.version}</span>
          <span class="muted small">{r.date}</span>
          {#if isCurrent(r)}<span class="badge ok">CURRENT</span>{/if}
        </div>
        {#if r.notes}<p class="notes">{r.notes}</p>{/if}
        <p class="muted small mono">{fmtMb(r.size_bytes ?? 0)}</p>

        {#if installing === r.version}
          <div class="bar-bg">
            <div class="bar-fill" style="width: {(progress * 100).toFixed(1)}%"></div>
          </div>
          <p class="muted small">
            {stage === 'download' ? 'Downloading…' :
             stage === 'upload'   ? 'Flashing device…' :
             stage === 'done'     ? 'Done — rebooting…' : '…'}
            ({(progress * 100).toFixed(0)}%)
          </p>
        {:else if deviceInstalling === r.version}
          <p class="muted small">
            {deviceProgress === 'starting' ? 'Asking device to fetch…' :
             deviceProgress === 'fetching' ? 'Device downloading + flashing… (~30-60 s)' :
             deviceProgress === 'done'     ? 'Done — rebooting…' : '…'}
          </p>
        {:else}
          {#if wifi?.connected}
            <!-- Best path: device pulls firmware over its own WiFi. iOS
                 Safari is removed from the binary transfer entirely. -->
            <button
              class="primary install"
              on:click={() => installViaDevice(r)}
              disabled={isCurrent(r) || deviceInstalling !== null}
            >
              {isCurrent(r) ? 'INSTALLED' : 'INSTALL'}
            </button>
            <p class="hint">
              Device fetches via its own Wi-Fi ({wifi.ssid}). Most reliable
              path — works on every browser.
            </p>
          {:else}
            <div class="install-row">
              <!-- Fallbacks when device has no station Wi-Fi configured. -->
              <a
                class="btn-link"
                href={resolveReleaseUrl(r)}
                download={r.url.split('/').pop()}
                target="_blank"
                rel="noopener"
                class:disabled={isCurrent(r)}
                aria-disabled={isCurrent(r)}
              >
                DOWNLOAD
              </a>
              <button
                class="primary install"
                on:click={() => install(r)}
                disabled={isCurrent(r) || installing !== null}
              >
                {isCurrent(r) ? 'INSTALLED' : 'INSTALL'}
              </button>
            </div>
            {#if !isCurrent(r)}
              <p class="hint">
                Configure home Wi-Fi in <strong>BRAND</strong> for one-tap installs.<br />
                Until then: <strong>INSTALL</strong> (Android/desktop) or <strong>DOWNLOAD</strong>
                → UPLOAD tab (iOS Safari).
              </p>
            {/if}
          {/if}
        {/if}
      </div>
    {/each}
  {/if}

{:else}
  <div class="card">
    <h3>Manual upload</h3>
    <p class="muted small">
      Pick a <code>.bin</code> exported from Arduino IDE (Sketch → Export
      Compiled Binary). Device reboots automatically after upload.
    </p>

    <label class="file">
      <input type="file" accept=".bin,application/octet-stream" on:change={onPick} disabled={uploading} />
      <span>{file ? file.name : 'Choose .bin file'}</span>
    </label>
    {#if file}<p class="muted mono small">Size: {fmtMb(file.size)}</p>{/if}

    {#if uploadErr}<p class="err">{uploadErr}</p>{/if}
    {#if uploadDone}<p class="ok">✓ Flashed. Device is rebooting…</p>{/if}

    {#if uploading || uploadProg > 0}
      <div class="bar-bg">
        <div class="bar-fill" style="width: {(uploadProg * 100).toFixed(1)}%"></div>
      </div>
      <p class="muted mono small">{(uploadProg * 100).toFixed(1)}%</p>
    {/if}

    <button class="primary install" on:click={upload} disabled={!file || uploading}>
      {uploading ? 'UPLOADING…' : 'UPLOAD .BIN'}
    </button>
  </div>

  <div class="card muted small">
    <strong>Heads up:</strong> Don't power-cycle the device during upload.
    If something goes wrong, hold the BOOT button while plugging USB to
    re-flash from Arduino IDE.
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }

  .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-2); margin-bottom: var(--s-2); }
  .tabs button { font-size: 13px; letter-spacing: 0.08em; opacity: 0.55; }
  .tabs button.active { opacity: 1; border-color: var(--accent); }

  .muted { color: var(--muted); }
  .small { font-size: 13px; }
  .err   { color: var(--danger); margin: var(--s-2) 0 0; }
  .ok    { color: var(--success); margin: var(--s-2) 0 0; }
  code   { font-family: var(--font-mono); background: var(--surface-2); padding: 2px 6px; border-radius: 4px; }

  .current {
    display: flex; align-items: center; gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
  }
  .ver { color: var(--accent); font-size: 18px; }
  .refresh {
    margin-left: auto;
    min-height: 36px; min-width: 36px; padding: 0;
    background: transparent; border: 1px solid var(--border);
  }

  .release { transition: border-color 200ms; }
  .release.installing { border-color: var(--accent); }
  .rhead { display: flex; align-items: center; gap: var(--s-2); margin-bottom: var(--s-1); }
  .badge {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: var(--r-1);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .badge.ok { background: rgba(0, 217, 126, 0.15); color: var(--success); }
  .notes { color: var(--fg); margin: var(--s-1) 0; }

  .file {
    display: block;
    background: var(--surface-2);
    border: 1px dashed var(--border);
    border-radius: var(--r-1);
    padding: var(--s-3);
    text-align: center;
    cursor: pointer;
    margin: var(--s-3) 0 var(--s-2);
  }
  .file input { display: none; }
  .bar-bg {
    height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden;
    margin: var(--s-3) 0 var(--s-1);
  }
  .bar-fill {
    height: 100%; background: var(--accent); transition: width 120ms linear;
  }
  .install { width: 100%; margin-top: var(--s-3); }

  .install-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  .install-row .install { width: 100%; margin-top: 0; }

  .btn-link {
    display: inline-flex; align-items: center; justify-content: center;
    height: 44px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--fg);
    text-decoration: none;
    border-radius: var(--r-1);
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.04em;
  }
  .btn-link:hover { background: var(--surface-2); }
  .btn-link.disabled,
  .btn-link[aria-disabled="true"] {
    opacity: 0.5; pointer-events: none;
  }
  .hint {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
    margin: var(--s-2) 0 0;
  }
  .hint strong { color: var(--fg); }
</style>
