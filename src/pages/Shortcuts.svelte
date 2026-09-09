<script lang="ts">
  // =====================================================================
  //  Shortcuts — the driver's track controls, mirrored from the gauge/knob:
  //  a manual lap stopwatch (start / split / reset), a drive-log record
  //  toggle, and a "show peaks" trigger — plus a LIVE readout of the lap
  //  board + session peaks the gauge reports back over BLE (char 7e1c0213).
  //  Falls back to a demo status with no gauge (sim / screenshots). No GPS.
  // =====================================================================
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import type { ShortcutStatus } from '../lib/monitorCfg';
  import { t } from '../lib/i18n';

  const GOLD = '#cea24a', CYAN = '#5bb8cf';

  // A believable demo so the panel reads correctly with no gauge attached.
  const DEMO: ShortcutStatus = {
    recording: false, lapRunning: true, peaksShown: false, lapsDone: 2,
    lapCurMs: 83400, lapLastMs: 91250, lapBestMs: 88760,
    topSpeedKmh: 182, maxRpm: 6480, maxBoostBar: 1.18, maxCoolantC: 96,
    peakHp: 402, peakNm: 861,
  };

  let st = $state<ShortcutStatus>(DEMO);
  let live = $state(false);
  let busy = $state('');
  let err = $state('');

  async function refresh() {
    const m = store.monClient;
    if (!m) { live = false; return; }
    try { st = await m.readShortcutStatus(); live = true; err = ''; }
    catch (e) { err = String((e as Error)?.message ?? e); }
  }

  async function act(action: number, tag: string) {
    const m = store.monClient;
    if (!m || busy) return;
    busy = tag; err = '';
    try { await m.sendShortcut(action); await refresh(); }
    catch (e) { err = String((e as Error)?.message ?? e); }
    finally { busy = ''; }
  }

  // poll the gauge while this page is open
  $effect(() => {
    refresh();
    const id = setInterval(refresh, 800);
    return () => clearInterval(id);
  });

  const fmt = (ms: number) => {
    const tt = Math.round(ms / 100);
    const te = tt % 10, s = Math.floor(tt / 10) % 60, m = Math.floor(tt / 10 / 60);
    return `${m}:${String(s).padStart(2, '0')}.${te}`;
  };
  const connected = $derived(!!store.monClient);
</script>

<PageHeader title={t('shortcuts.title')} back="axis" backLabel="AXIS" />

<div class="wrap">
  <p class="sub">{connected ? t('shortcuts.live_note') : t('shortcuts.demo_note')}</p>
  {#if err}<p class="err">{err}</p>{/if}

  <!-- action buttons -->
  <div class="acts">
    <button class="big" style="--c:{GOLD}" disabled={!connected || !!busy} onclick={() => act(0, 'lap')}>
      <span class="ic">⏱</span>{st.lapRunning ? t('shortcuts.split_lap') : t('shortcuts.start_lap')}
    </button>
    <button class="big" class:on={st.recording} style="--c:#e24b4a" disabled={!connected || !!busy} onclick={() => act(2, 'rec')}>
      <span class="ic">●</span>{st.recording ? t('shortcuts.stop_rec') : t('shortcuts.start_rec')}
    </button>
    <button class="big" style="--c:{CYAN}" disabled={!connected || !!busy} onclick={() => act(3, 'peaks')}>
      <span class="ic">▲</span>{t('shortcuts.show_peaks')}
    </button>
  </div>

  <!-- lap board -->
  <div class="card">
    <div class="ch">
      <span class="ct">{t('shortcuts.lap_board')}</span>
      <span class="lapn">{st.lapRunning ? `L${st.lapsDone + 1}` : '—'}</span>
    </div>
    <div class="laps">
      <div class="lap"><span class="lv">{fmt(st.lapCurMs)}</span><span class="ll">{t('shortcuts.this_lap')}</span></div>
      <div class="lap"><span class="lv">{st.lapsDone > 0 ? fmt(st.lapLastMs) : '—'}</span><span class="ll">{t('shortcuts.last_lap')}</span></div>
      <div class="lap"><span class="lv" style="color:{GOLD}">{st.lapBestMs != null ? fmt(st.lapBestMs) : '—'}</span><span class="ll">{t('shortcuts.best_lap')}</span></div>
    </div>
    <button class="ghost" disabled={!connected || !!busy} onclick={() => act(1, 'reset')}>{t('shortcuts.reset_lap')}</button>
  </div>

  <!-- session peaks -->
  <div class="ch2">{t('shortcuts.peaks')}</div>
  <div class="tiles">
    <div class="tile"><span class="v">{st.topSpeedKmh}<small> km/h</small></span><span class="l">{t('shortcuts.top_speed')}</span></div>
    <div class="tile"><span class="v">{st.maxRpm}</span><span class="l">{t('shortcuts.max_rpm')}</span></div>
    <div class="tile"><span class="v">{st.maxBoostBar.toFixed(2)}<small> bar</small></span><span class="l">{t('shortcuts.max_boost')}</span></div>
    <div class="tile"><span class="v" style="color:{GOLD}">{st.peakHp}<small> hp</small></span><span class="l">{t('shortcuts.peak_power')}</span></div>
    <div class="tile"><span class="v" style="color:{CYAN}">{st.peakNm}<small> Nm</small></span><span class="l">{t('shortcuts.peak_torque')}</span></div>
    <div class="tile"><span class="v">{st.maxCoolantC}<small> °C</small></span><span class="l">{t('shortcuts.max_coolant')}</span></div>
  </div>

  {#if !connected}<p class="hint">{t('shortcuts.connect_note')}</p>{/if}
</div>

<style>
  .wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }
  /* free-floating notes get a frosted "ฝ้า" pill so they stay legible on the wave */
  .sub, .err, .hint {
    background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid var(--border, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    border-radius: 11px; padding: 10px 13px; }
  .sub { color: var(--muted, #9aa0a8); font-size: 13px; margin: 0; }
  .err { color: var(--danger, #e24b4a); font-size: 13px; margin: 0; }

  .acts { display: flex; flex-direction: column; gap: 8px; }
  .big { display: flex; align-items: center; gap: 12px; justify-content: flex-start;
    padding: 15px 18px; border-radius: 13px; font-size: 16px; font-weight: 700;
    color: var(--fg, #eef0f2); cursor: pointer; text-align: left;
    background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
  .big .ic { color: var(--c); font-size: 18px; width: 20px; text-align: center; }
  .big.on { background: color-mix(in srgb, var(--c) 20%, rgba(24,27,33,.55)); }
  .big:disabled { opacity: .45; cursor: not-allowed; }

  /* frosted glass "ฝ้า" — matches the rest of the app */
  .card { background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid var(--border, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
  .ch { display: flex; align-items: center; justify-content: space-between; }
  .ct { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint, #6b7178); }
  .lapn { font-size: 13px; font-weight: 800; color: var(--accent, #cea24a); font-variant-numeric: tabular-nums; }
  .laps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .lap { display: flex; flex-direction: column; gap: 3px; align-items: center; }
  .lap .lv { font-size: 21px; font-weight: 800; color: var(--fg, #eef0f2); font-variant-numeric: tabular-nums; }
  .lap .ll { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--faint, #6b7178); }

  .ch2 { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint, #6b7178); margin: 2px 2px -2px; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .tile { background: rgba(24,27,33,.55);
    -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
    border: 1px solid var(--border, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    border-radius: 12px; padding: 12px 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .tile .v { font-size: 21px; font-weight: 800; color: var(--fg, #eef0f2); line-height: 1; font-variant-numeric: tabular-nums; }
  .tile .v small { font-size: 11px; font-weight: 600; color: var(--muted, #9aa0a8); }
  .tile .l { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--faint, #6b7178); }

  .ghost { padding: 11px; border: 1px solid var(--border, rgba(255,255,255,.12)); border-radius: 11px;
    background: transparent; color: var(--fg, #eef0f2); font-size: 13px; cursor: pointer; }
  .ghost:disabled { opacity: .45; cursor: not-allowed; }
  .hint { font-size: 11px; color: var(--faint, #6b7178); margin: 0; line-height: 1.5; }
</style>
