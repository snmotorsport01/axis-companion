<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import {
    fetchReleaseManifest, resolveReleaseUrl,
    type ReleaseManifest, type ReleaseEntry
  } from '../lib/api';
  import PageHeader from '../lib/PageHeader.svelte';

  // ============================================================
  //  OTA — two install paths:
  //
  //  1. Releases section (top): fetch the public manifest from
  //     github.io, show the latest entry's notes + version, compare
  //     against the device's build tag, and offer install. Entries
  //     with `url === null` (preview rows during a stabilising release
  //     cycle) show the notes but lock the INSTALL button.
  //
  //  2. Local upload (bottom): unchanged path — user picks a local
  //     .bin and streams it to /api/ota. Always available, even when
  //     the device has no internet and the manifest fetch fails.
  // ============================================================

  // ---- Local upload state -----------------------------------
  let file       = $state<File | null>(null);
  let uploading  = $state(false);
  let uploadErr  = $state<string | null>(null);
  let uploadDone = $state(false);
  let uploadProg = $state(0);

  // ---- Manifest state ---------------------------------------
  let manifest   = $state<ReleaseManifest | null>(null);
  let mLoading   = $state(true);
  let mErr       = $state<string | null>(null);

  onMount(() => { refreshManifest(); });

  async function refreshManifest() {
    mLoading = true;
    mErr = null;
    try {
      manifest = await fetchReleaseManifest();
    } catch (e: any) {
      mErr = e?.message ?? 'Could not reach release server';
    } finally {
      mLoading = false;
    }
  }

  // Latest = first entry in the manifest (manifest convention).
  let latest = $derived(manifest?.releases?.[0] ?? null);

  // "Update available" only if BOTH sides expose a build tag AND they
  // differ AND the latest entry has a real binary URL. Old firmware
  // without a build field can't be diffed automatically — surface
  // "build unknown" rather than spamming false positives.
  let updateAvailable = $derived.by(() => {
    if (!latest) return false;
    if (!latest.build) return false;
    if (!store.info?.build) return false;
    return latest.build !== store.info.build && !!latest.url;
  });

  let isPreview = $derived(latest?.status === 'preview' || latest?.url == null);

  // ---- Local upload handlers --------------------------------
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
      setTimeout(() => store.goLive(), 4000);
    } catch (e: any) {
      uploadErr = e?.message ?? 'upload failed';
    } finally {
      uploading = false;
    }
  }

  // ---- Install from the manifest entry ----------------------
  // Fetches the .bin straight from GitHub Pages and pipes it through
  // the same store.client.ota() path the local upload uses. On BLE
  // that's the chunked-transfer protocol (~3 min for a 1.6 MB bin);
  // on Wi-Fi it'd be the multipart POST. Either way, one tap goes
  // from "I want the latest release" to a rebooted device.
  let installPhase = $state<'idle' | 'download' | 'flash'>('idle');
  let installPct   = $state(0);
  async function installLatest() {
    if (!latest?.url || !store.client) return;
    uploading   = true;
    uploadErr   = null;
    uploadDone  = false;
    uploadProg  = 0;
    installPhase = 'download';
    installPct   = 0;
    try {
      const absUrl = resolveReleaseUrl(latest.url);
      // 1) Pull the .bin. fetch() + Response.blob() handles redirect
      //    from GitHub Pages and gives us a real Blob we can wrap.
      const res = await fetch(absUrl);
      if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length')) || latest.size_bytes || 0;
      // Manual chunked read for progress reporting (Response.blob()
      // doesn't expose download progress).
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let pulled = 0;
      if (reader && total > 0) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            pulled += value.byteLength;
            installPct = pulled / total;
          }
        }
      } else {
        // Fallback: no stream API, take the whole body at once.
        chunks.push(new Uint8Array(await res.arrayBuffer()));
        pulled = chunks[0].byteLength;
        installPct = 1;
      }
      const bytes = new Uint8Array(pulled);
      let off = 0;
      for (const c of chunks) { bytes.set(c, off); off += c.byteLength; }
      const stem = absUrl.split('/').pop() || 'axis-firmware.bin';
      const binFile = new File([bytes], stem, { type: 'application/octet-stream' });

      // 2) Hand to the device. ota() will pick the right transport
      //    (BLE chunked-transfer if currently paired over BLE, the
      //    multipart POST if it's a Wi-Fi DeviceClient instead).
      installPhase = 'flash';
      installPct   = 0;
      await store.client.ota(binFile, p => { installPct = p; uploadProg = p; });
      uploadDone = true;
      setTimeout(() => store.goLive(), 4000);
    } catch (e: any) {
      uploadErr = e?.message ?? 'install failed';
    } finally {
      uploading = false;
      installPhase = 'idle';
    }
  }

  function fmtMb(b: number): string {
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
  function statusLabel(r: ReleaseEntry): string {
    if (r.url == null) return 'PREVIEW';
    if (r.status === 'stable') return 'STABLE';
    return 'AVAILABLE';
  }
</script>

<PageHeader />

<!-- Current firmware ------------------------------------------ -->
<div class="card current">
  <div>
    <span class="muted small">Installed</span>
    <div class="mono ver">{store.info?.version ?? '?'}</div>
    {#if store.info?.build}
      <div class="muted mono small">build {store.info.build}</div>
    {/if}
  </div>
</div>

<!-- Releases (manifest) --------------------------------------- -->
<div class="card">
  <header class="card-head">
    <h3>Releases</h3>
    <button class="link" on:click={refreshManifest} disabled={mLoading}>
      {mLoading ? 'Checking…' : 'Refresh'}
    </button>
  </header>

  {#if mLoading && !manifest}
    <p class="muted small">Fetching manifest…</p>
  {:else if mErr && !manifest}
    <p class="err small">{mErr}</p>
    <p class="muted small">
      Couldn't reach the release server. Local upload below still works.
    </p>
  {:else if latest}
    <div class="release">
      <div class="release-head">
        <span class="mono ver">{latest.version}</span>
        {#if latest.build}
          <span class="muted mono small">· {latest.build}</span>
        {/if}
        <span class="badge {isPreview ? 'preview' : updateAvailable ? 'available' : 'current'}">
          {isPreview
            ? statusLabel(latest)
            : updateAvailable
              ? 'UPDATE AVAILABLE'
              : 'UP TO DATE'}
        </span>
      </div>
      <p class="muted mono xs">{latest.date}</p>
      <p class="notes">{latest.notes}</p>

      <button
        class="primary release-btn"
        on:click={installLatest}
        disabled={isPreview || !updateAvailable || uploading}
      >
        {#if uploading && installPhase !== 'idle'}
          {installPhase === 'download' ? 'DOWNLOADING' : 'FLASHING'} {(installPct * 100).toFixed(0)}%
        {:else if isPreview}
          PREVIEW — install via USB flash
        {:else if !updateAvailable}
          Already installed
        {:else}
          INSTALL {latest.build ?? latest.version}
        {/if}
      </button>
      {#if uploading && installPhase !== 'idle'}
        <p class="muted xs mono">
          {installPhase === 'download'
            ? 'Pulling .bin from GitHub…'
            : 'Streaming to device over BLE — keep app open, ~3 min for 1.6 MB.'}
        </p>
      {/if}
      {#if isPreview}
        <p class="muted xs">
          A binary will appear here once the release is signed off. For
          now, flash via USB from the developer build.
        </p>
      {/if}
    </div>
  {/if}
</div>

<!-- Local upload (unchanged) ---------------------------------- -->
<div class="card">
  <h3>Local upload</h3>
  <p class="muted small">
    Pick an AXIS firmware file (<code>.bin</code>) and tap UPLOAD. The
    device will reboot into the new firmware once the transfer is
    complete.
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
  <strong>Heads up:</strong> don't power-cycle the device during upload.
  If the transfer is interrupted, just open this screen again and
  re-upload — the device falls back to the previous firmware on
  failure.
</div>

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  .bar h1 { margin: 0; }
  .back  { background: transparent; border: none; color: var(--accent); padding: 0; min-height: 0; }

  .muted { color: var(--muted); }
  .small { font-size: 13px; }
  .xs    { font-size: 11px; }
  .err   { color: var(--danger);  margin: var(--s-2) 0 0; }
  .ok    { color: var(--success); margin: var(--s-2) 0 0; }
  code   { font-family: var(--font-mono); background: var(--surface-2); padding: 2px 6px; border-radius: 4px; }

  .current { padding: var(--s-3) var(--s-4); }
  .ver { color: var(--accent); font-size: 18px; }

  .card-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: var(--s-2);
  }
  .card-head h3 { margin: 0; }
  .link {
    background: transparent; border: none; color: var(--accent);
    font-size: 13px; padding: 0; min-height: 0; cursor: pointer;
  }
  .link[disabled] { color: var(--muted); cursor: default; }

  .release-head {
    display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-2);
    margin-top: var(--s-2);
  }
  .badge {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 10px; letter-spacing: 1px;
    background: var(--surface-2);
    color: var(--muted);
    border: 1px solid var(--border);
  }
  .badge.available { color: var(--accent); border-color: var(--accent); }
  .badge.preview   { color: var(--warn, #ffaa33); border-color: var(--warn, #ffaa33); }
  .badge.current   { color: var(--success); border-color: var(--success); }

  .notes {
    margin: var(--s-3) 0 var(--s-3);
    color: var(--muted);
    font-size: 14px;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .release-btn { width: 100%; margin-top: var(--s-2); }

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
</style>
