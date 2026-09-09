<script lang="ts">
  // ---- Anti-sleep & drowsiness — gauge safety settings (monitor char 7e1c020f) --
  //  V1 = time-based "take a break" reminder. V2 = gyro yaw steering-entropy
  //  drowsiness detection (baseline-learned, 70-130 km/h). Talks to the LIVE
  //  monitor client (store.monClient) — the same one the shell + Looks use.
  import { onMount, onDestroy } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { t } from '../lib/i18n';
  import PageHeader from '../lib/PageHeader.svelte';
  import type { AntiSleepCfg } from '../lib/monitorCfg';

  const mon = $derived(store.monClient);
  let cfg  = $state<AntiSleepCfg | null>(null);
  let busy = $state(false);
  let msg  = $state('');
  let poll: ReturnType<typeof setInterval> | null = null;

  const hrs = (m: number) => (m / 60).toFixed(2).replace(/\.?0+$/, '');

  async function load() {
    if (!mon || busy) return;
    busy = true;
    try { cfg = await mon.readAntiSleep(); msg = ''; }
    catch (e) { msg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { busy = false; }
  }
  async function save() {
    if (!mon || busy || !cfg) return;
    busy = true; msg = t('antisleep.saving');
    try { await mon.setAntiSleep(cfg); await new Promise(r => setTimeout(r, 200)); await load(); msg = t('antisleep.saved'); }
    catch (e) { msg = '✗ ' + String((e as Error)?.message ?? e); }
    finally { busy = false; }
  }
  // Live telemetry — refresh ONLY the read-only fields so a slider mid-drag is safe.
  async function pollLive() {
    if (!mon || busy || !cfg) return;
    try { const r = await mon.readAntiSleep();
          cfg = { ...cfg, drowsyScore: r.drowsyScore, baselinePct: r.baselinePct }; }
    catch { /* transient BLE read — next tick retries */ }
  }

  onMount(() => { if (mon) { load(); poll = setInterval(pollLive, 2500); } });
  onDestroy(() => { if (poll) clearInterval(poll); });
</script>

<PageHeader title={t('antisleep.title')} back="axis" backLabel="AXIS" />

{#if !mon}
  <div class="card">
    <p class="sub">{t('antisleep.connect')}</p>
    <button class="ghost wide" onclick={() => (store.page = 'axis')}>{t('antisleep.go_connect')}</button>
  </div>
{:else if cfg}
  <div class="card">
    <p class="lead">{t('antisleep.intro')}</p>

    <label class="row"><span>{t('antisleep.enabled')}</span>
      <input type="checkbox" bind:checked={cfg.enabled} /></label>

    <label class="row sl"><span>{t('antisleep.remind_after')}</span>
      <span class="ctl"><input type="range" min="30" max="240" step="15" bind:value={cfg.intervalMin} disabled={!cfg.enabled} />
        <b>{hrs(cfg.intervalMin)} {t('antisleep.h')}</b></span></label>
    <label class="row sl"><span>{t('antisleep.count_above')}</span>
      <span class="ctl"><input type="range" min="20" max="100" step="5" bind:value={cfg.moveKph} disabled={!cfg.enabled} />
        <b>{cfg.moveKph} {t('antisleep.kmh')}</b></span></label>
    <label class="row sl"><span>{t('antisleep.rest_resets')}</span>
      <span class="ctl"><input type="range" min="1" max="30" step="1" bind:value={cfg.restMin} disabled={!cfg.enabled} />
        <b>{cfg.restMin} {t('antisleep.min')}</b></span></label>
    <label class="row sl"><span>{t('antisleep.snooze_tap')}</span>
      <span class="ctl"><input type="range" min="5" max="60" step="5" bind:value={cfg.snoozeMin} disabled={!cfg.enabled} />
        <b>{cfg.snoozeMin} {t('antisleep.min')}</b></span></label>

    <div class="div"></div>

    <label class="row"><span>{t('antisleep.drowsy_head')} <span class="tag">gyro</span></span>
      <input type="checkbox" bind:checked={cfg.gyroOn} disabled={!cfg.enabled} /></label>

    {#if cfg.enabled && cfg.gyroOn}
      <p class="desc">{t('antisleep.drowsy_desc')}</p>
      <div class="autonote"><span class="ai">◆</span> {t('antisleep.auto_note')}</div>

      <div class="live">
        <div class="lr"><span>{t('antisleep.learning')}</span>
          <b>{cfg.baselinePct ?? 0}%{(cfg.baselinePct ?? 0) >= 100 ? ' ✓' : ''}</b></div>
        <div class="bar"><div style="width:{Math.min(100, cfg.baselinePct ?? 0)}%"></div></div>
        <div class="lr"><span>{t('antisleep.drowsy_now')}</span>
          <b class:hot={(cfg.drowsyScore ?? 0) >= 60}>{cfg.drowsyScore ?? 0}/100</b></div>
        <div class="bar"><div class:hot={(cfg.drowsyScore ?? 0) >= 60} style="width:{Math.min(100, cfg.drowsyScore ?? 0)}%"></div></div>
        <p class="note">{t('antisleep.live_note')}</p>
      </div>
    {/if}

    <button class="prim wide" onclick={save} disabled={busy}>{t('antisleep.save')}</button>
    {#if msg}<p class="msg">{msg}</p>{/if}
    <p class="aid">{t('antisleep.aid_note')}</p>
  </div>
{:else}
  <div class="card"><p class="sub">{busy ? t('antisleep.reading') : msg}</p></div>
{/if}

<style>
  .card { background: rgba(24,27,33,.55); -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid rgba(255,255,255,.07); border-radius: 16px; padding: 16px; margin: 8px 2px; display: flex; flex-direction: column; gap: 12px; }
  .lead { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ink2, #aeb2ba); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; color: #e7e9ec; }
  .row > span:first-child { flex: 0 1 auto; min-width: 0; }
  .row .ctl { display: flex; align-items: center; gap: 8px; flex: 1 1 150px; min-width: 140px; }
  .row .ctl input[type=range] { flex: 1; min-width: 48px; accent-color: var(--gold, #cea24a); }
  .row .ctl b { flex: 0 0 auto; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  /* Slider rows STACK on narrow screens: label on top, slider + value full-width below — no unit can overflow the card. */
  .row.sl { flex-direction: column; align-items: stretch; gap: 7px; }
  .row.sl > span:first-child { flex: none; }
  .row.sl .ctl { width: 100%; flex: none; min-width: 0; }
  input[type=checkbox] { width: 20px; height: 20px; accent-color: var(--gold, #cea24a); }
  .tag { font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--gold, #cea24a);
    border: 1px solid rgba(206,162,74,.5); border-radius: 4px; padding: 1px 5px; margin-left: 4px; }
  .div { height: 1px; background: rgba(255,255,255,.08); }
  .desc { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--ink3, #8b8f98); }
  .autonote { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cfd2d7; line-height: 1.45;
    background: rgba(206,162,74,.08); border: 1px solid rgba(206,162,74,.28); border-radius: 11px; padding: 10px 13px; margin: 2px 0 2px; }
  .autonote .ai { color: var(--gold, #cea24a); flex: 0 0 auto; }
  .live { display: flex; flex-direction: column; gap: 4px; margin-top: 2px; }
  .lr { display: flex; justify-content: space-between; font-size: 13px; color: #dfe2e6; }
  .lr b.hot { color: #d9614f; }
  .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; margin-bottom: 4px; }
  .bar div { height: 100%; border-radius: 3px; background: var(--gold, #cea24a); transition: width .5s; }
  .bar div.hot { background: #d9614f; }
  .note { margin: 4px 0 0; font-size: 10.5px; color: var(--ink3, #6b6f78); }
  .prim { background: var(--gold, #cea24a); color: #161003; border: none; border-radius: 13px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; }
  .prim:disabled { opacity: .5; }
  .wide { width: 100%; }
  .ghost { background: rgba(255,255,255,.06); color: #dfe2e6; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 12px; cursor: pointer; }
  .sub { color: var(--ink2, #aeb2ba); font-size: 13px; margin: 0 0 10px; }
  .msg { margin: 0; font-size: 12px; color: var(--ink2, #aeb2ba); text-align: center; }
  .aid { margin: 2px 0 0; font-size: 10.5px; color: var(--ink3, #6b6f78); text-align: center; }
</style>
