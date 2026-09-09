<script lang="ts">
  // =====================================================================
  //  Analysis — turn a drive log into charts: speed/time, distance/time,
  //  and a virtual-dyno pull (power & torque vs RPM, as two small-multiples
  //  — never a dual-axis chart). Export the whole card as a PNG, running-
  //  watch style. Pulls the gauge's recorded log over BLE; falls back to a
  //  synthetic demo run so it works with no hardware (sim / screenshots).
  //  No GPS anywhere (standing privacy rule).
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import { parseDriveLog, saveBlobFile, type DriveLog } from '../lib/driveLog';
  import { analyseDrive, demoDriveLog, type Analysis } from '../lib/driveAnalysis';
  import { drawLineChart } from '../lib/miniChart';
  import { recordGaugeVideo, replaySupported } from '../lib/gaugeReplay';
  import { t } from '../lib/i18n';

  const GOLD = '#cea24a', CYAN = '#5bb8cf', INK = '#8b9199', STRONG = '#eef0f2';
  const MASS = 1600;   // kg default for the dyno estimate (approx.)

  let data = $state<Analysis | null>(null);
  let rawLog = $state<DriveLog | null>(null);
  let source = $state<'live' | 'demo'>('demo');
  let loading = $state(false);
  let pct = $state(0);
  let err = $state('');
  let exporting = $state(false);
  let vidBusy = $state(false);
  let vidPct = $state(0);

  let cSpeed: HTMLCanvasElement, cDist: HTMLCanvasElement, cPwr: HTMLCanvasElement, cTq: HTMLCanvasElement;

  async function load() {
    loading = true; err = ''; pct = 0;
    try {
      // The owner's rig is the MONITOR (store.monClient), not the legacy "AXIS Gauge"
      // (store.gaugeClient, which is null here) — pull the real drive log from it.
      const g = store.monClient ?? store.gaugeClient;
      let log = g ? parseDriveLog(await g.pullLog((p: number) => (pct = p))) : demoDriveLog();
      if (!log.samples.length) { log = demoDriveLog(); source = 'demo'; }
      else source = g ? 'live' : 'demo';
      rawLog = log;
      data = analyseDrive(log, MASS);
    } catch (e) {
      const dl = demoDriveLog(); rawLog = dl; data = analyseDrive(dl, MASS); source = 'demo';
      err = String((e as Error)?.message ?? e);
    } finally { loading = false; }
  }

  async function exportVideo() {
    if (!rawLog || vidBusy) return;
    vidBusy = true; vidPct = 0; err = '';
    try {
      const blob = await recordGaugeVideo(rawLog, (p) => (vidPct = p));
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      await saveBlobFile(`axis-gauge-${(data?.stats.durationS ?? 0).toFixed(0)}s.${ext}`, blob);
    } catch (e) { err = String((e as Error)?.message ?? e); }
    finally { vidBusy = false; vidPct = 0; }
  }
  load();

  const fmtT = (s: number) => s.toFixed(0) + 's';
  const fmtRpm = (r: number) => (r / 1000).toFixed(1) + 'k';

  function paintOne(cv: HTMLCanvasElement, kind: 'speed' | 'dist' | 'pwr' | 'tq') {
    if (!cv || !data) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 320, h = 178;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (kind === 'speed')
      drawLineChart(ctx, 0, 0, w, h, data.speedTime, { color: GOLD, ink: INK, strong: STRONG,
        title: t('analysis.speed_time'), fmtX: fmtT, xLabel: 'km/h',
        peakLabel: p => Math.round(p.y) + ' km/h' });
    else if (kind === 'dist')
      drawLineChart(ctx, 0, 0, w, h, data.distTime, { color: GOLD, ink: INK, strong: STRONG,
        title: t('analysis.dist_time'), fmtX: fmtT, fmtY: v => v.toFixed(1), xLabel: 'km' });
    else if (kind === 'pwr')
      drawLineChart(ctx, 0, 0, w, h, data.dyno.map(d => ({ x: d.rpm, y: d.hp })), { color: GOLD, ink: INK, strong: STRONG,
        title: t('analysis.power'), fmtX: fmtRpm, xLabel: 'hp', markers: true,
        peakLabel: p => Math.round(p.y) + ' hp' });
    else
      drawLineChart(ctx, 0, 0, w, h, data.dyno.map(d => ({ x: d.rpm, y: d.nm })), { color: CYAN, ink: INK, strong: STRONG,
        title: t('analysis.torque'), fmtX: fmtRpm, xLabel: 'Nm', markers: true,
        peakLabel: p => Math.round(p.y) + ' Nm' });
  }

  function paintAll() { paintOne(cSpeed, 'speed'); paintOne(cDist, 'dist'); paintOne(cPwr, 'pwr'); paintOne(cTq, 'tq'); }
  $effect(() => { if (data) requestAnimationFrame(paintAll); });

  // ---- PNG export: one tall composite, running-watch style ----
  async function exportPng() {
    if (!data || exporting) return;
    exporting = true;
    try {
      const dpr = 2, W = 900, chartH = 240, headH = 210, gap = 8;
      const H = headH + chartH * 4 + gap * 4 + 24;
      const cv = document.createElement('canvas');
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // ground
      ctx.fillStyle = '#0d0f12'; ctx.fillRect(0, 0, W, H);
      // header
      ctx.fillStyle = GOLD; ctx.font = '700 22px -apple-system,system-ui,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('AXIS', 28, 42);
      ctx.fillStyle = INK; ctx.font = '600 13px -apple-system,system-ui,sans-serif';
      ctx.fillText(t('analysis.title').toUpperCase() + (source === 'demo' ? '  ·  ' + t('analysis.sample').toUpperCase() : ''), 90, 41);
      // stat tiles
      const st = data.stats;
      const tiles: [string, string][] = [
        [st.zeroToHundredS != null ? st.zeroToHundredS.toFixed(2) + 's' : '—', t('analysis.zero_hundred')],
        [Math.round(st.peakKmh) + ' km/h', t('analysis.top_speed')],
        [st.distanceKm.toFixed(2) + ' km', t('analysis.distance')],
        [st.peakHp + ' hp', t('analysis.peak_power')],
        [st.peakNm + ' Nm', t('analysis.peak_torque')],
        [st.durationS.toFixed(0) + 's', t('analysis.duration')],
      ];
      const tw = (W - 56) / 3;
      tiles.forEach(([v, l], i) => {
        const tx = 28 + (i % 3) * tw, ty = 66 + Math.floor(i / 3) * 64;
        ctx.fillStyle = STRONG; ctx.font = '700 26px -apple-system,system-ui,sans-serif';
        ctx.textAlign = 'left'; ctx.fillText(v, tx, ty + 24);
        ctx.fillStyle = INK; ctx.font = '11px -apple-system,system-ui,sans-serif';
        ctx.fillText(l.toUpperCase(), tx, ty + 42);
      });
      // charts
      let y = headH;
      drawLineChart(ctx, 20, y, W - 40, chartH, data.speedTime, { color: GOLD, ink: INK, strong: STRONG, title: t('analysis.speed_time'), fmtX: fmtT, xLabel: 'km/h', peakLabel: p => Math.round(p.y) + ' km/h' }); y += chartH + gap;
      drawLineChart(ctx, 20, y, W - 40, chartH, data.distTime, { color: GOLD, ink: INK, strong: STRONG, title: t('analysis.dist_time'), fmtX: fmtT, fmtY: v => v.toFixed(1), xLabel: 'km' }); y += chartH + gap;
      drawLineChart(ctx, 20, y, W - 40, chartH, data.dyno.map(d => ({ x: d.rpm, y: d.hp })), { color: GOLD, ink: INK, strong: STRONG, title: t('analysis.power'), fmtX: fmtRpm, xLabel: 'hp', markers: true, peakLabel: p => Math.round(p.y) + ' hp' }); y += chartH + gap;
      drawLineChart(ctx, 20, y, W - 40, chartH, data.dyno.map(d => ({ x: d.rpm, y: d.nm })), { color: CYAN, ink: INK, strong: STRONG, title: t('analysis.torque'), fmtX: fmtRpm, xLabel: 'Nm', markers: true, peakLabel: p => Math.round(p.y) + ' Nm' });

      const blob: Blob = await new Promise(res => cv.toBlob(b => res(b!), 'image/png'));
      await saveBlobFile(`axis-analysis-${st.durationS.toFixed(0)}s.png`, blob);
    } catch (e) { err = String((e as Error)?.message ?? e); }
    finally { exporting = false; }
  }
</script>

<PageHeader title={t('analysis.title')} back="axis" backLabel="AXIS" />

<div class="wrap">
  <p class="sub">
    {#if loading}{t('analysis.reading')} {pct > 0 ? pct + '%' : ''}
    {:else if source === 'demo'}{t('analysis.demo_note')}
    {:else}{t('analysis.live_note')}{/if}
  </p>
  {#if err}<p class="err">{err}</p>{/if}

  {#if data}
    <!-- summary tiles -->
    <div class="tiles">
      <div class="tile"><span class="v">{data.stats.zeroToHundredS != null ? data.stats.zeroToHundredS.toFixed(2) + 's' : '—'}</span><span class="l">{t('analysis.zero_hundred')}</span></div>
      <div class="tile"><span class="v">{Math.round(data.stats.peakKmh)}<small> km/h</small></span><span class="l">{t('analysis.top_speed')}</span></div>
      <div class="tile"><span class="v">{data.stats.distanceKm.toFixed(2)}<small> km</small></span><span class="l">{t('analysis.distance')}</span></div>
      <div class="tile"><span class="v" style="color:{GOLD}">{data.stats.peakHp}<small> hp</small></span><span class="l">{t('analysis.peak_power')}</span></div>
      <div class="tile"><span class="v" style="color:{CYAN}">{data.stats.peakNm}<small> Nm</small></span><span class="l">{t('analysis.peak_torque')}</span></div>
      <div class="tile"><span class="v">{data.stats.durationS.toFixed(0)}<small> s</small></span><span class="l">{t('analysis.duration')}</span></div>
    </div>

    <div class="card"><canvas bind:this={cSpeed}></canvas></div>
    <div class="card"><canvas bind:this={cDist}></canvas></div>
    <div class="card dyno"><canvas bind:this={cPwr}></canvas></div>
    <div class="card dyno"><canvas bind:this={cTq}></canvas></div>
    <p class="hint">{t('analysis.dyno_note')}</p>

    <div class="actions">
      <button class="prim" onclick={exportPng} disabled={exporting || vidBusy}>{exporting ? t('analysis.exporting') : t('analysis.export')}</button>
      {#if replaySupported()}<button class="prim alt" onclick={exportVideo} disabled={vidBusy || exporting}>{vidBusy ? t('analysis.recording', { pct: vidPct }) : t('analysis.export_video')}</button>{/if}
    </div>
    {#if replaySupported()}<p class="hint">{t('analysis.video_hint')}</p>{/if}
    {#if store.monClient || store.gaugeClient}<button class="ghost wide" onclick={load} disabled={loading}>{loading ? '…' : t('analysis.refresh')}</button>{/if}
  {/if}
</div>

<style>
  .wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }
  /* free-floating notes sit on the busy carbon-wave → give them a frosted
     "ฝ้า" pill so the text stays legible (owner 2026-07-27). */
  .sub, .err, .hint {
    background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid var(--border, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    border-radius: 11px; padding: 10px 13px; }
  .sub { color: var(--muted, #9aa0a8); font-size: 13px; margin: 0; }
  .err { color: var(--danger, #e24b4a); font-size: 13px; margin: 0; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  /* Frosted glass "ฝ้า" — translucent + backdrop blur so the carbon-wave behind
     shows through, matching the AXIS shell + global .card (owner 2026-07-27). */
  .tile { background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid var(--border, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    border-radius: 12px; padding: 12px 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .tile .v { font-size: 22px; font-weight: 800; color: var(--fg, #eef0f2); line-height: 1; font-variant-numeric: tabular-nums; }
  .tile .v small { font-size: 12px; font-weight: 600; color: var(--muted, #9aa0a8); }
  .tile .l { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--faint, #6b7178); }
  .card { background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid var(--border, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    border-radius: 12px; padding: 10px 8px; }
  .card canvas { width: 100%; height: 178px; display: block; }
  .hint { font-size: 11px; color: var(--faint, #6b7178); margin: 0; line-height: 1.5; }
  .actions { display: flex; gap: 8px; margin-top: 4px; }
  .prim { flex: 1; padding: 13px; border: 0; border-radius: 12px; background: var(--accent, #cea24a);
    color: #000; font-weight: 700; font-size: 15px; cursor: pointer; }
  .prim:disabled { opacity: .5; }
  .prim.alt { background: var(--surface-2, #191c21); color: var(--accent, #cea24a); border: 1px solid var(--accent, #cea24a); }
  .ghost { padding: 13px 16px; border: 1px solid var(--border, rgba(255,255,255,.12));
    border-radius: 12px; background: var(--surface-2, #191c21); color: var(--fg, #eef0f2); font-size: 14px; cursor: pointer; }
  .ghost.wide { width: 100%; margin-top: 6px; }
</style>
