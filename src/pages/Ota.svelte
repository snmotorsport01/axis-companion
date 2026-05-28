<script lang="ts">
  import { store } from '../lib/store.svelte';

  // Upload a signed firmware image to the device over Wi-Fi. The file
  // streams straight to the device's update partition and the device
  // reboots into the new image when the transfer completes.

  let file       = $state<File | null>(null);
  let uploading  = $state(false);
  let uploadErr  = $state<string | null>(null);
  let uploadDone = $state(false);
  let uploadProg = $state(0);

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
      // Device will reboot — bounce back to the dashboard so the next
      // /api/info call reflects the new version.
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

<div class="card current">
  <span class="muted">Current</span>
  <span class="mono ver">{store.info?.version ?? '?'}</span>
</div>

<div class="card">
  <h3>Install firmware</h3>
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
  .err   { color: var(--danger);  margin: var(--s-2) 0 0; }
  .ok    { color: var(--success); margin: var(--s-2) 0 0; }
  code   { font-family: var(--font-mono); background: var(--surface-2); padding: 2px 6px; border-radius: 4px; }

  .current {
    display: flex; align-items: center; gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
  }
  .ver { color: var(--accent); font-size: 18px; }

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
