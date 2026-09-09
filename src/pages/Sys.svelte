<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SysSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import { t } from '../lib/i18n';
  import PageHeader from '../lib/PageHeader.svelte';

  // Live system snapshot — refreshed every 2s while this page is open.
  let snap = $state<SysSnapshot | null>(null);
  let err  = $state<string | null>(null);
  let busy = $state(false);
  let poll: number | undefined;

  // No device paired (e.g. a hardware-less App Store reviewer who never tapped
  // DEMO MODE): show a connect-prompt card instead of a spinner that never
  // resolves (snap stays null forever). Mirrors Calibrate.svelte.
  const noClient = $derived(!store.client);

  async function refresh() {
    if (!store.client) return;
    try { snap = await store.client.sys(); err = null; }
    catch (e: any) { err = e?.message ?? t('sys.err_load'); }
  }

  onMount(() => {
    refresh();
    poll = window.setInterval(refresh, 2000);
  });
  onDestroy(() => { if (poll) window.clearInterval(poll); });

  // ---- Actions -------------------------------------------------------

  async function doReboot() {
    if (!store.client || store.isDemo) return;
    if (!confirm(t('sys.confirm_reboot'))) return;
    busy = true;
    try {
      await store.client.reboot();
      // Device is rebooting — bounce back to Live so the next poll
      // reflects a clean state.
      setTimeout(() => store.goLive(), 4000);
    } catch (e: any) {
      err = e?.message ?? t('sys.err_reboot');
    } finally {
      busy = false;
    }
  }

  async function doFactoryReset() {
    if (!store.client || store.isDemo) return;
    if (!confirm(t('sys.confirm_factory'))) return;
    busy = true;
    try {
      await store.client.factoryReset();
      setTimeout(() => store.goLive(), 5000);
    } catch (e: any) {
      err = e?.message ?? t('sys.err_factory');
    } finally {
      busy = false;
    }
  }

  // ---- Formatters ----------------------------------------------------

  function formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d) return `${d}d ${h}h ${m}m`;
    if (h) return `${h}h ${m}m ${sec}s`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function formatBytes(n: number): string {
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
    if (n >= 1024)        return (n / 1024).toFixed(1) + ' KB';
    return n + ' B';
  }

  function pct(used: number, total: number): string {
    if (!total) return '—';
    return ((used / total) * 100).toFixed(0) + '%';
  }
</script>

<PageHeader title={t('sys.title')} back="pro" backLabel={t('sys.back_pro')} />

{#if err}<div class="card err">{err}</div>{/if}

{#if noClient}
  <div class="card muted center">
    <h3 class="connect-h">{t('sys.connect_title')}</h3>
    <p class="small">{t('sys.connect_body')}</p>
    <button class="ghost wide" on:click={() => (store.page = 'axis')}>{t('sys.back_to_connect')}</button>
  </div>
{:else if !snap}
  <div class="card muted">{t('sys.loading')}</div>
{:else}
  <!-- Identity -->
  <div class="card">
    <h3>{t('sys.identity')}</h3>
    <dl>
      <dt>{t('sys.firmware')}</dt>      <dd class="mono accent">{snap.version}</dd>
      <dt>{t('sys.hardware_id')}</dt>   <dd class="mono small">{snap.mac}</dd>
      {#if !store.isDemo}
        <dt>{t('sys.cpu')}</dt>         <dd class="mono">{snap.cpu_mhz} MHz</dd>
      {/if}
      <dt>{t('sys.uptime')}</dt>        <dd class="mono">{formatUptime(snap.uptime_ms)}</dd>
    </dl>
  </div>

  {#if !store.isDemo}
  <!-- Memory (engineer diagnostics — hidden in DEMO so a reviewer doesn't
       see raw heap/PSRAM/flash dumps) -->
  <div class="card">
    <h3>{t('sys.memory')}</h3>
    <dl>
      <dt>{t('sys.heap_free')}</dt>
      <dd class="mono">{formatBytes(snap.free_heap)}<span class="muted small"> / {formatBytes(snap.heap_size)}</span></dd>
      <dt>{t('sys.heap_min')}</dt>
      <dd class="mono">{formatBytes(snap.min_heap)}</dd>
      <dt>{t('sys.psram_free')}</dt>
      <dd class="mono">{formatBytes(snap.psram_free)}<span class="muted small"> / {formatBytes(snap.psram_size)}</span></dd>
      <dt>{t('sys.flash')}</dt>
      <dd class="mono">{formatBytes(snap.flash_size)}</dd>
    </dl>
    {#if snap.psram_size > 0}
      <div class="bar-bg">
        <div class="bar-fill"
             style="width: {pct(snap.psram_size - snap.psram_free, snap.psram_size)}"></div>
      </div>
      <p class="muted small">{t('sys.psram_used', { pct: pct(snap.psram_size - snap.psram_free, snap.psram_size) })}</p>
    {/if}
  </div>
  {/if}

  <!-- Wireless -->
  <div class="card">
    <h3>{t('sys.wireless')}</h3>
    <dl>
      {#if snap.ap_ssid}
        <dt>{t('sys.setup_ap')}</dt>
        <dd class="mono">{snap.ap_ssid} · {snap.ap_clients} {snap.ap_clients === 1 ? t('sys.client') : t('sys.clients')}</dd>
        <dt>{t('sys.ap_address')}</dt>
        <dd class="mono">{snap.ap_ip}</dd>
      {/if}
      <dt>{t('sys.home_wifi')}</dt>
      <dd>
        {#if snap.sta_connected}
          <span class="dot online"></span>
          <span class="mono">{snap.sta_ssid}</span>
        {:else}
          <span class="dot offline"></span>
          <span class="muted">{t('sys.disconnected')}</span>
        {/if}
      </dd>
      {#if snap.sta_connected}
        <dt>{t('sys.home_ip')}</dt>      <dd class="mono">{snap.sta_ip}</dd>
        <dt>{t('sys.signal')}</dt>       <dd class="mono">{snap.sta_rssi} dBm</dd>
      {/if}
    </dl>
  </div>

  <!-- Battery -->
  {#if snap.battery && snap.battery.present}
    <div class="card">
      <h3>{t('sys.battery')}</h3>
      <dl>
        <dt>{t('sys.state')}</dt>
        <dd class="mono">
          {snap.battery.percent}%
          {#if snap.battery.charging}
            <span class="badge ok">{t('sys.charging')}</span>
          {:else if snap.battery.low}
            <span class="badge danger">{t('sys.low')}</span>
          {/if}
        </dd>
        <dt>{t('sys.voltage')}</dt>
        <dd class="mono">{snap.battery.volts.toFixed(2)} V</dd>
      </dl>
      <div class="bar-bg">
        <div class="bar-fill"
             style="width: {snap.battery.percent}%;
                    background: {snap.battery.low ? 'var(--danger)' : 'var(--accent)'};"></div>
      </div>
    </div>
  {:else}
    <div class="card muted small">{t('sys.no_battery')}</div>
  {/if}

  <!-- IMU (3-axis raw) — engineer diagnostics, hidden in DEMO -->
  {#if snap.imu && !store.isDemo}
    <div class="card">
      <h3>{t('sys.imu_raw')}</h3>
      <dl>
        <dt>{t('sys.accel')}</dt>
        <dd class="mono small">
          {t('sys.imu_accel_val', { x: snap.imu.ax.toFixed(2), y: snap.imu.ay.toFixed(2), z: snap.imu.az.toFixed(2) })}
        </dd>
        <dt>{t('sys.gyro')}</dt>
        <dd class="mono small">
          {t('sys.imu_gyro_val', { x: snap.imu.gx.toFixed(0), y: snap.imu.gy.toFixed(0), z: snap.imu.gz.toFixed(0) })}
        </dd>
        <dt>{t('sys.tilt')}</dt>
        <dd class="mono small">
          {t('sys.imu_tilt_val', { roll: snap.imu.roll.toFixed(1), pitch: snap.imu.pitch.toFixed(1) })}
        </dd>
      </dl>
    </div>
  {/if}

  <!-- Active mode -->
  {#if snap.mode_name}
    <div class="card">
      <h3>{t('sys.active_mode')}</h3>
      <dl>
        <dt>{t('sys.mode')}</dt>        <dd class="mono">{snap.mode_name}</dd>
        {#if snap.gear_count}
          <dt>{t('sys.gears')}</dt>     <dd class="mono">{snap.gear_count}</dd>
        {/if}
      </dl>
    </div>
  {/if}

  <!-- Actions -->
  <div class="card">
    <h3>{t('sys.actions')}</h3>
    <p class="hint">{t('sys.actions_hint')}</p>
    <div class="actions">
      <button on:click={doReboot} disabled={busy || store.isDemo}>{t('sys.restart')}</button>
      <button class="danger" on:click={doFactoryReset} disabled={busy || store.isDemo}>{t('sys.factory_reset')}</button>
    </div>
    {#if store.isDemo}<p class="hint">{t('sys.demo_hint')}</p>{/if}
  </div>
{/if}

<style>
  .err   { color: var(--danger); }
  .muted { color: var(--muted); }
  .small { font-size: 12px; }
  .accent { color: var(--accent); }

  .center { text-align: center; }
  .connect-h { color: var(--fg); text-transform: none; letter-spacing: 0.3px; font-size: 16px; margin: 0 0 var(--s-2); }
  .center .small { margin: 0 0 var(--s-3); font-size: 13px; line-height: 1.45; }
  .ghost {
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--fg); padding: var(--s-3); border-radius: var(--r-1);
    font-size: 14px; cursor: pointer; min-height: var(--tap-min);
  }
  .ghost.wide { width: 100%; }

  h3 { margin: 0 0 var(--s-2); font-size: 14px; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; }

  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; word-break: break-all; }

  .bar-bg {
    height: 6px; background: var(--surface-2);
    border-radius: 999px; overflow: hidden;
    margin-top: var(--s-3);
  }
  .bar-fill { height: 100%; background: var(--accent); transition: width 240ms ease-out; }

  .actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: var(--s-2); margin-top: var(--s-3);
  }
  .actions .danger {
    background: rgba(255, 59, 59, 0.18);
    color: var(--danger);
    border-color: rgba(255, 59, 59, 0.4);
  }
  .actions .danger:hover { background: rgba(255, 59, 59, 0.28); }

  /* Status badges next to the % readout */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    margin-left: var(--s-2);
    font-size: 11px;
    letter-spacing: 0.06em;
    border-radius: var(--r-1);
    vertical-align: 2px;
  }
  .badge.ok     { background: rgba(7, 192, 96, 0.20); color: var(--success); }
  .badge.danger { background: rgba(255, 59, 59, 0.20); color: var(--danger); }

  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
  .dot.online  { background: var(--success); }
  .dot.offline { background: var(--muted); }

  .hint { color: var(--muted); font-size: 12px; line-height: 1.5; margin: var(--s-1) 0 0; }
</style>
