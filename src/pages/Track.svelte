<script lang="ts">
  // ---- Track mode — phone-GPS lap timer + route recorder (Strava-style) --------
  //  Replaces the removed onboard gauge GPS. The phone's GPS times laps by
  //  start/finish line crossing (LapEngine), pushes each crossing to the gauge over
  //  BLE (sendShortcut(0) → the gauge's own lap chip), records the route for a map +
  //  GPX export, and keeps everything on the device (lat/lon leave only on export).
  import { onMount, onDestroy } from 'svelte';
  import { Geolocation } from '@capacitor/geolocation';
  import { KeepAwake } from '@capacitor-community/keep-awake';
  import { store } from '../lib/store.svelte';
  import { t } from '../lib/i18n';
  import PageHeader from '../lib/PageHeader.svelte';
  import { LapEngine, fmtLap, toGpx, haversine, type Lap } from '../lib/gpsLap';
  import { saveBlobFile } from '../lib/driveLog';

  const GOLD = '#cea24a', INK = '#8b8f98', CYAN = '#5ec8d8';

  let phase = $state<'idle' | 'live' | 'done'>('idle');
  let gps = $state<'off' | 'acquiring' | 'ok'>('off');
  let acc = $state(0);           // horizontal accuracy, metres
  let liveKmh = $state(0);
  let now = $state(0);           // ticking clock for the live lap time
  let armed = $state(false);     // start/finish line set?
  let pending = $state(false);   // line set but heading not latched yet
  let lapCount = $state(0);
  let lastMs = $state(0);
  let bestMs = $state(0);
  let distKm = $state(0);
  let topKmh = $state(0);
  let laps = $state<Lap[]>([]);
  let banner = $state('');
  let exporting = $state(false);

  const eng = new LapEngine();
  eng.onCross = () => { store.monClient?.sendShortcut(0).catch(() => {}); };  // gauge: start/split
  eng.onLap = (l) => {
    lastMs = l.ms; bestMs = eng.bestMs(); lapCount = eng.lapCount; laps = [...eng.laps];
    flash(t('track.lap_flash', { n: l.n, time: fmtLap(l.ms) }) + (l.ms === bestMs ? t('track.best_tag') : ''));
  };

  let watchId: string | null = null;
  let clock: ReturnType<typeof setInterval> | null = null;
  let mapEl = $state<HTMLCanvasElement | null>(null);
  let bannerTmr: ReturnType<typeof setTimeout> | null = null;
  let lastFix: { lat: number; lon: number; t: number } | null = null;

  function flash(m: string) {
    banner = m;
    if (bannerTmr) clearTimeout(bannerTmr);
    bannerTmr = setTimeout(() => (banner = ''), 2600);
  }

  onMount(async () => {
    try { await KeepAwake.keepAwake(); } catch {}
    clock = setInterval(() => { now = Date.now(); }, 100);
    try {
      try { await Geolocation.requestPermissions(); } catch {}
      gps = 'acquiring';
      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        (pos, err) => { if (err || !pos) { if (gps !== 'ok') gps = 'acquiring'; return; } onFix(pos); },
      );
    } catch (e) { flash(t('track.gps_unavailable', { msg: (e as Error)?.message ?? String(e) })); gps = 'off'; }
  });

  onDestroy(() => {
    if (watchId) Geolocation.clearWatch({ id: watchId }).catch(() => {});
    if (clock) clearInterval(clock);
    if (bannerTmr) clearTimeout(bannerTmr);
    KeepAwake.allowSleep().catch(() => {});
  });

  function onFix(pos: any) {
    const c = pos.coords;
    const t = pos.timestamp || Date.now();
    acc = Math.round(c.accuracy || 0);
    gps = acc > 0 && acc <= 35 ? 'ok' : 'acquiring';
    // Speed: prefer the OS value (m/s), else derive from the last fix.
    let kmh = c.speed != null && c.speed >= 0 ? c.speed * 3.6 : 0;
    if (kmh === 0 && lastFix && t > lastFix.t) {
      const dt = (t - lastFix.t) / 1000;
      if (dt > 0) kmh = (haversine(lastFix.lat, lastFix.lon, c.latitude, c.longitude) / dt) * 3.6;
    }
    liveKmh = kmh;
    lastFix = { lat: c.latitude, lon: c.longitude, t };

    if (phase === 'live') {
      eng.feed(c.latitude, c.longitude, kmh, t, c.heading != null && c.heading >= 0 ? c.heading : null);
      armed = eng.armed; pending = (eng as any)['gate']?.pending ?? false;
      distKm = eng.distM / 1000; topKmh = eng.topKmh;
      drawMap();
    }
  }

  function startSession() {
    eng.reset();
    lapCount = 0; lastMs = 0; bestMs = 0; distKm = 0; topKmh = 0; laps = [];
    armed = false; pending = false;
    store.monClient?.sendShortcut(1).catch(() => {});   // reset the gauge lap board
    phase = 'live';
    flash(t('track.session_started'));
  }

  function setLine() {
    if (!lastFix) { flash(t('track.waiting_gps')); return; }
    const h = (lastFix as any).heading; // not stored; use null → latch on first movement
    eng.setGate(lastFix.lat, lastFix.lon, null);
    armed = true; pending = true;
    flash(t('track.line_set'));
  }

  function finishSession() {
    phase = 'done';
    flash(t('track.session_ended', { n: eng.lapCount }));
    setTimeout(drawMap, 30);
  }

  async function exportGpx() {
    if (exporting || !eng.points.length) return;
    exporting = true;
    try {
      const d = new Date(eng.points[0].t);
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      const gpx = toGpx(eng.points, `AXIS Track ${stamp}`);
      await saveBlobFile(`axis-track-${stamp}.gpx`, new Blob([gpx], { type: 'application/gpx+xml' }));
    } catch (e) { flash(t('track.export_failed', { msg: (e as Error)?.message ?? String(e) })); }
    finally { exporting = false; }
  }

  // ---- Route map: polyline of the recorded points on a dark card, Strava-style ----
  function drawMap() {
    const cv = mapEl; if (!cv) return;
    const pts = eng.points; if (pts.length < 2) { const x = cv.getContext('2d'); x && x.clearRect(0, 0, cv.width, cv.height); return; }
    const dpr = Math.min(2, (globalThis as any).devicePixelRatio || 1);
    const w = cv.clientWidth || 320, h = 200;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let minLa = 1e9, maxLa = -1e9, minLo = 1e9, maxLo = -1e9;
    for (const p of pts) { minLa = Math.min(minLa, p.lat); maxLa = Math.max(maxLa, p.lat); minLo = Math.min(minLo, p.lon); maxLo = Math.max(maxLo, p.lon); }
    const mLat = (minLa + maxLa) / 2;
    const sx = Math.cos((mLat * Math.PI) / 180);
    const spanLo = Math.max(1e-6, (maxLo - minLo) * sx), spanLa = Math.max(1e-6, maxLa - minLa);
    const pad = 16, sc = Math.min((w - 2 * pad) / spanLo, (h - 2 * pad) / spanLa);
    const X = (p: any) => pad + ((p.lon - minLo) * sx - spanLo / 2) * sc + (w - 2 * pad) / 2;
    const Y = (p: any) => h - pad - ((p.lat - minLa) - spanLa / 2) * sc - (h - 2 * pad) / 2;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(206,162,74,.28)'; ctx.lineWidth = 6;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)))); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)))); ctx.stroke();
    // start/finish marker
    const g = (eng as any)['gate'];
    if (g) { ctx.fillStyle = CYAN; ctx.beginPath(); ctx.arc(X(g), Y(g), 5, 0, 7); ctx.fill(); }
    // current position
    const last = pts[pts.length - 1];
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(last), Y(last), 3.5, 0, 7); ctx.fill();
  }

  const gpsLabel = $derived(gps === 'ok' ? `GPS ${acc}m` : gps === 'acquiring' ? `${t('track.acquiring')}${acc ? ' ' + acc + 'm' : ''}` : t('track.gps_off'));
  const gpsCol = $derived(gps === 'ok' ? GOLD : gps === 'acquiring' ? CYAN : '#c05a5a');
</script>

<PageHeader title={t('track.title')} back="axis" backLabel="AXIS" />

<div class="wrap">
  <div class="statusline"><span class="dot" style="background:{gpsCol}"></span><span style="color:{gpsCol}">{gpsLabel}</span></div>
  {#if banner}<div class="banner">{banner}</div>{/if}

  <!-- Live speed + lap tiles -->
  <div class="speedbox">
    <span class="spd">{Math.round(liveKmh)}</span><span class="unit">km/h</span>
  </div>

  <div class="tiles">
    <div class="tile"><span class="v" style="color:{GOLD}">{phase === 'live' && eng.onTrack ? fmtLap(eng.curLapMs(now)) : '--:--'}</span><span class="l">{t('track.current_lap')}</span></div>
    <div class="tile"><span class="v">{fmtLap(lastMs)}</span><span class="l">{t('track.last_lap')}</span></div>
    <div class="tile"><span class="v" style="color:{CYAN}">{fmtLap(bestMs)}</span><span class="l">{t('track.best_lap')}</span></div>
    <div class="tile"><span class="v">{lapCount}</span><span class="l">{t('track.laps')}</span></div>
  </div>

  {#if phase === 'idle'}
    <p class="hint">{t('track.hint_idle')}</p>
    <div class="actions"><button class="prim" onclick={startSession} disabled={gps === 'off'}>{t('track.start')}</button></div>
  {:else if phase === 'live'}
    {#if !armed}
      <p class="hint">{t('track.hint_setline')}</p>
      <div class="actions"><button class="prim" onclick={setLine} disabled={gps !== 'ok'}>{t('track.set_line')}</button></div>
    {:else}
      <div class="lineok">{t('track.line_ok')}{pending ? t('track.line_locking') : ''} · <button class="linkbtn" onclick={setLine}>{t('track.move')}</button></div>
    {/if}
    <div class="card"><canvas bind:this={mapEl}></canvas></div>
    <div class="metaline"><span>{distKm.toFixed(2)} km</span><span>{t('track.top_speed', { n: Math.round(topKmh) })}</span></div>
    <div class="actions"><button class="sec" onclick={finishSession}>{t('track.finish')}</button></div>
  {:else}
    <!-- summary -->
    <div class="card"><canvas bind:this={mapEl}></canvas></div>
    <div class="metaline"><span>{distKm.toFixed(2)} km</span><span>{t('track.top_speed', { n: Math.round(topKmh) })}</span><span>{t('track.laps_count', { n: lapCount })}</span></div>
    {#if laps.length}
      <div class="laplist">
        {#each laps as l}
          <div class="laprow" class:best={l.ms === bestMs}><span class="ln">L{l.n}</span><span class="lt">{fmtLap(l.ms)}</span>{#if l.ms === bestMs}<span class="bs">★</span>{/if}</div>
        {/each}
      </div>
    {:else}
      <p class="hint">{t('track.hint_nolaps')}</p>
    {/if}
    <div class="actions">
      <button class="prim" onclick={exportGpx} disabled={exporting || !eng.points.length}>{exporting ? t('track.exporting') : t('track.export')}</button>
      <button class="sec" onclick={startSession}>{t('track.new_session')}</button>
    </div>
  {/if}
</div>

<style>
  .wrap { display: flex; flex-direction: column; gap: 14px; padding: 4px 2px 24px; }
  .statusline { display: flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: .04em; }
  .dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
  .banner { background: rgba(206,162,74,.14); border: 1px solid rgba(206,162,74,.4); color: #eadfc4; border-radius: 12px; padding: 9px 13px; font-size: 13px; }
  .speedbox { display: flex; align-items: baseline; justify-content: center; gap: 8px; padding: 6px 0 2px; }
  .spd { font-size: 74px; font-weight: 800; line-height: .9; color: #f2f3f5; font-variant-numeric: tabular-nums; }
  .unit { font-size: 15px; color: var(--ink2, #8b8f98); }
  .tiles { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
  .tile { background: rgba(24,27,33,.55); -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15); border: 1px solid rgba(255,255,255,.06); border-radius: 14px; padding: 11px 6px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .tile .v { font-size: 19px; font-weight: 700; color: #eef0f2; font-variant-numeric: tabular-nums; }
  .tile .l { font-size: 9.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--ink3, #6b6f78); }
  .card { background: rgba(24,27,33,.55); -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15); border: 1px solid rgba(255,255,255,.06); border-radius: 16px; padding: 8px; }
  .card canvas { width: 100%; height: 200px; display: block; }
  .metaline { display: flex; justify-content: space-around; font-size: 12.5px; color: var(--ink2, #8b8f98); font-variant-numeric: tabular-nums; }
  .lineok { font-size: 12.5px; color: #cfd2d7; text-align: center; }
  .linkbtn, .bs { background: none; border: none; color: var(--gold, #cea24a); cursor: pointer; font-size: 12.5px; }
  .laplist { display: flex; flex-direction: column; gap: 4px; }
  .laprow { display: flex; align-items: center; gap: 12px; padding: 9px 14px; background: rgba(24,27,33,.5); border-radius: 11px; font-variant-numeric: tabular-nums; }
  .laprow.best { border: 1px solid rgba(94,200,216,.5); }
  .laprow .ln { color: var(--ink2, #8b8f98); width: 34px; font-size: 13px; }
  .laprow .lt { flex: 1; font-size: 16px; font-weight: 700; color: #eef0f2; }
  .laprow .bs { color: var(--gold, #cea24a); }
  .hint { font-size: 12px; line-height: 1.55; color: var(--ink2, #8b8f98); padding: 0 2px; }
  .actions { display: flex; gap: 10px; margin-top: 2px; }
  .actions button { flex: 1; padding: 13px; border-radius: 13px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
  .prim { background: var(--gold, #cea24a); color: #161003; }
  .prim:disabled { opacity: .45; }
  .sec { background: rgba(255,255,255,.06); color: #dfe2e6; border-color: rgba(255,255,255,.12); }
</style>
