<script lang="ts">
  // =====================================================================
  //  Calibrate — phone-driven wizard for the AXIS knob.
  //
  //  The firmware exposes the same wizard the on-device LCD shows via
  //  /api/calibration/{begin,tap,commit,abort}. This page is a remote
  //  control for that wizard: the user can step through every position
  //  capture from their phone instead of tapping the device screen.
  //
  //  Lifecycle:
  //   • Page mount       → GET /api/calibration         (mode + step list)
  //   • User taps BEGIN  → POST /api/calibration/begin  (device switches
  //                                                       to SCR_CALIBRATE)
  //   • Loop while       → GET  /api/calibration  every 250 ms
  //     state.active is    (label/hint/phase/still bar/sample bar)
  //     true              POST /api/calibration/tap     (per step)
  //   • Last step done   → POST /api/calibration/commit (save + exit)
  //                      → OR /abort to bail without saving
  //
  //  Why phone instead of device:
  //   • Holding the stick steady is easier when you're not also tapping
  //     a screen on the same stick.
  //   • Useful when the device is already mounted (gauge cluster) and
  //     reaching it is awkward.
  //   • Mirrors how OBD scan tools / engine tuners typically work.
  //
  //  The on-device wizard remains available (Main → 5-tap → CALIBRATE)
  //  for users who prefer it — these are not mutually exclusive.
  // =====================================================================
  import { onMount, onDestroy, tick } from 'svelte';
  import type { CalibSnapshot } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import PageHeader from '../lib/PageHeader.svelte';

  let calib    = $state<CalibSnapshot | null>(null);
  let err      = $state<string | null>(null);
  let busy     = $state(false);

  // Polling timer — we re-fetch /api/calibration at 4 Hz while a session
  // is active. 250 ms is fast enough that the stillness bar feels live
  // (250 ms full = the firmware's CALIB_STILL_HOLD_MS) without flooding
  // the ESP32's AsyncWebServer.
  let pollTimer: number | undefined;

  async function refresh() {
    if (!store.client) return;
    try {
      calib = await store.client.calibration();
      err = null;
    } catch (e: any) {
      err = e?.message ?? 'load failed';
    }
  }

  function startPolling() {
    if (pollTimer != null) return;
    pollTimer = window.setInterval(refresh, 250);
  }
  function stopPolling() {
    if (pollTimer != null) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    }
  }

  onMount(async () => {
    if (!store.client) { store.goConnect(); return; }
    await refresh();
    // If we landed on this page while a session is already running on the
    // device (user kicked it off with a 5-tap and then opened the app),
    // pick up polling immediately so the UI sync is instant.
    if (calib?.state?.active) startPolling();
  });
  onDestroy(() => stopPolling());

  // ---- Actions --------------------------------------------------------
  async function onBegin() {
    if (!store.client || busy) return;
    busy = true;
    try {
      await store.client.beginCalibration();
      // Give the firmware a frame to switch screens before we start
      // polling — otherwise the first poll lands while curId_ is still
      // SCR_MAIN_MENU and active reads false, briefly flickering the UI
      // back to the idle view.
      await new Promise(r => setTimeout(r, 200));
      await refresh();
      startPolling();
    } catch (e: any) {
      err = e?.message ?? 'begin failed';
    } finally {
      busy = false;
    }
  }

  async function onCapture() {
    if (!store.client || busy) return;
    busy = true;
    try {
      await store.client.tapCalibration();
      await refresh();
    } catch (e: any) {
      err = e?.message ?? 'capture failed';
      // 409: device wandered off the calibrate screen (sleep / user
      // pressed MULTITAP). Re-fetch — the UI will fall back to the
      // BEGIN button automatically once active flips to false.
      await refresh();
    } finally {
      busy = false;
    }
  }

  async function onSave() {
    if (!store.client || busy) return;
    busy = true;
    try {
      await store.client.commitCalibration();
      // Commit returns the device to MAIN — stop polling, refresh once
      // to clear `state.active`, and let the idle view come back.
      stopPolling();
      await new Promise(r => setTimeout(r, 200));
      await refresh();
    } catch (e: any) {
      err = e?.message ?? 'save failed';
    } finally {
      busy = false;
    }
  }

  async function onCancel() {
    if (!store.client || busy) return;
    if (!confirm('Abort calibration? Captured steps will be discarded.')) return;
    busy = true;
    try {
      await store.client.abortCalibration();
      stopPolling();
      await new Promise(r => setTimeout(r, 200));
      await refresh();
    } catch (e: any) {
      err = e?.message ?? 'abort failed';
    } finally {
      busy = false;
    }
  }

  async function onResetAll() {
    if (!store.client || busy) return;
    if (!confirm("Clear all calibration for this mode? You'll need to walk the wizard again.")) return;
    busy = true;
    try {
      await store.client.resetCalibration();
      await refresh();
    } catch (e: any) {
      err = e?.message ?? 'reset failed';
    } finally {
      busy = false;
    }
  }

  // ---- Derived view-model -------------------------------------------
  // The big label / hint cycles through:
  //   • Each step's label & hint while step < total
  //   • "READY TO SAVE" + a save-prompt hint when step >= total
  // The CAPTURE button morphs into SAVE in the same state so the user
  // doesn't have to learn a separate "I'm done" gesture.
  const PHASE_NAME = ['IDLE', 'HOLD STILL', 'CAPTURING'];

  // Firmware emits compact labels ("1", "N", "P", "R", "D") because the
  // on-device LCD renders the big digit at 48 pt and there's no room
  // for prose. On the phone we have screen real estate, so expand the
  // shorthand into human-readable form — "1" → "Gear 1", "N" →
  // "Neutral", etc. Anything that doesn't match falls through unchanged
  // (e.g. SEQ's "ZERO" or "PULL" stays as-is).
  function prettyLabel(s: string | undefined | null): string {
    if (!s) return '—';
    if (/^[1-9]$/.test(s))   return `Gear ${s}`;
    if (s === 'N')           return 'Neutral';
    if (s === 'P')           return 'Park';
    if (s === 'R')           return 'Reverse';
    if (s === 'D')           return 'Drive';
    return s;
  }

  let active     = $derived(calib?.state?.active ?? false);
  let phase      = $derived(calib?.state?.phase ?? 0);
  let step       = $derived(calib?.state?.step ?? 0);
  let total      = $derived(calib?.state?.total ?? (calib?.calib_steps ?? 0));
  let done       = $derived(active && total > 0 && step >= total);
  let stepLabel  = $derived(done
    ? 'READY'
    : prettyLabel(calib?.steps?.[step]?.label));
  // Firmware-supplied per-step hints ("Tilt forward-left", "Hold knob
  // centred"…) were confusing more than they helped — the user already
  // knows what shifting into "Gear 1" means on their own car. We only
  // surface the SAVE prompt when all steps are captured and the user's
  // next action is non-obvious.
  let stepHint   = $derived(done ? 'Tap SAVE to write to the device.' : '');
  // Stillness bar — 0..1 fraction of CALIB_STILL_HOLD_MS held.
  let stillFrac  = $derived(() => {
    const s = calib?.state;
    if (!s || s.phase !== 1 || !s.is_still || s.still_hold_ms < 1) return 0;
    return Math.min(1, s.still_held_ms / s.still_hold_ms);
  });
  // Sampling bar — 0..1 fraction of CALIB_SAMPLE_MS captured.
  let sampleFrac = $derived(() => {
    const s = calib?.state;
    if (!s || s.phase !== 2 || s.sample_ms < 1) return 0;
    return Math.min(1, s.sample_progress_ms / s.sample_ms);
  });
  let liveR = $derived(calib?.imu_live?.roll  ?? 0);
  let liveP = $derived(calib?.imu_live?.pitch ?? 0);
  let liveG = $derived(calib?.imu_live?.gyroMag ?? 0);

  // ---- Mode selector --------------------------------------------------
  // Firmware exposes 3 engine modes — switching writes to NVS via the
  // command char's 0x10 opcode (BLE) or POST /api/mode (Wi-Fi). After
  // a successful switch we re-fetch calibration() so the step list
  // re-renders for the new mode.
  const MODES = [
    { id: 0, name: 'PRND',     hint: 'pitch' },
    { id: 1, name: 'SEQ',      hint: 'sequential' },
    { id: 2, name: 'HPATTERN', hint: 'manual H' }
  ];
  let switchingMode = $state(false);
  async function pickMode(id: number) {
    if (!store.client || busy || active || switchingMode) return;
    if (calib?.mode_id === id) return;          // already selected
    switchingMode = true;
    err = null;
    try {
      await store.client.setMode(id);
      // Tiny delay so firmware can persist + load the new mode before
      // we re-fetch. The Engine swaps the active Mode pointer
      // synchronously but the calib char snapshot still reflects
      // whatever was current when this NimBLE callback dispatched.
      await new Promise(r => setTimeout(r, 200));
      await refresh();
    } catch (e: any) {
      err = e?.message ?? 'mode switch failed';
    } finally {
      switchingMode = false;
    }
  }

  // ---- Gear count selector (HPAT + SEQ only) ------------------------
  // PRND has a fixed P/R/N/D layout — no count to pick. The firmware
  // exposes this gate via supportsGearCount(); we mirror it here by
  // checking the mode id (1 SEQ, 2 HPATTERN). Range is 4..6 to match
  // the on-device ScreenSpeedSelect.
  const SPEEDS = [4, 5, 6];
  let switchingSpeed = $state(false);
  let supportsSpeed = $derived(calib?.mode_id === 1 || calib?.mode_id === 2);
  async function pickSpeed(n: number) {
    if (!store.client || busy || active || switchingSpeed) return;
    if (!supportsSpeed) return;
    if (calib?.gear_count === n) return;
    switchingSpeed = true;
    err = null;
    try {
      await store.client.setGearCount(n);
      // Same persistence delay reasoning as pickMode — wait one tick
      // for the firmware's NVS write + mode reload before fetching.
      await new Promise(r => setTimeout(r, 200));
      await refresh();
    } catch (e: any) {
      err = e?.message ?? 'speed switch failed';
    } finally {
      switchingSpeed = false;
    }
  }
</script>

<PageHeader />

{#if err}<div class="card err">{err}</div>{/if}

{#if !calib}
  <div class="card muted">Loading…</div>
{:else}
  <!-- ---- Mode picker ----
       3 chips, one per engine mode. Tapping a different mode writes
       to NVS on the device and re-fetches calibration() so the step
       list updates. Switching is locked out while a calibration
       session is active — would invalidate the in-flight session. -->
  <div class="card">
    <h3>Gear mode</h3>
    <div class="mode-row">
      {#each MODES as m}
        <button
          type="button"
          class="mode-chip"
          class:active={calib.mode_id === m.id}
          on:click={() => pickMode(m.id)}
          disabled={busy || active || switchingMode}
          title={m.hint}
        >
          {m.name}
        </button>
      {/each}
    </div>
    {#if supportsSpeed}
      <!-- Speed/gear-count chips. Only HPAT + SEQ accept this; PRND's
           fixed P/R/N/D doesn't have a "how many gears" choice. -->
      <div class="speed-row">
        <span class="speed-label">GEARS</span>
        {#each SPEEDS as n}
          <button
            type="button"
            class="speed-chip"
            class:active={calib.gear_count === n}
            on:click={() => pickSpeed(n)}
            disabled={busy || active || switchingMode || switchingSpeed}
          >{n}</button>
        {/each}
      </div>
    {/if}
    <p class="muted small">
      {calib.gear_count} gears · {calib.calib_steps} calibration step{calib.calib_steps === 1 ? '' : 's'}
      {#if switchingMode}· <span class="mono">switching mode…</span>{/if}
      {#if switchingSpeed}· <span class="mono">switching speed…</span>{/if}
      {#if active}· <span class="mono">locked while wizard active</span>{/if}
    </p>
    {#if !active}
      <p class="muted small">
        Pick the gear pattern that matches your shifter, then tap
        BEGIN below. Hold the stick steady in each position the wizard
        asks for and tap CAPTURE — no need to touch the device.
      </p>
    {/if}
  </div>

  {#if active}
    <!-- =================== Wizard (session active) =================== -->
    <div class="card wizard">
      <div class="stepbar">
        <span class="mono small muted">
          {done ? 'DONE' : `STEP ${Math.min(step + 1, total)} / ${total}`}
        </span>
        <span class="mono small phase-chip phase-{phase}">{PHASE_NAME[phase]}</span>
      </div>

      <div class="big-label">{stepLabel}</div>
      <p class="hint">{stepHint}</p>

      <!-- Phase indicator with progress bar -->
      <div class="progress-wrap">
        {#if phase === 1}
          <!-- WAITING: stillness bar — fills as the user holds steady. -->
          <div class="progress warn">
            <div class="bar" style="width: {stillFrac() * 100}%"></div>
          </div>
          <p class="small mono muted">
            {calib.state?.is_still ? 'Holding…' : 'Move slower — too much vibration'}
            <span class="float-right">gyro {liveG.toFixed(1)} dps</span>
          </p>
        {:else if phase === 2}
          <!-- SAMPLING: averaging window. Bar fills over CALIB_SAMPLE_MS. -->
          <div class="progress ok">
            <div class="bar" style="width: {sampleFrac() * 100}%"></div>
          </div>
          <p class="small mono muted">Averaging IMU samples…</p>
        {:else}
          <div class="progress idle"><div class="bar idle-bar"></div></div>
          <p class="small mono muted">
            {done ? 'All steps captured — tap SAVE.' : 'Hold the position, then tap CAPTURE.'}
          </p>
        {/if}
      </div>

      <!-- Live tilt readout -->
      <div class="live-tilt mono small">
        <span>R <b>{liveR.toFixed(0)}°</b></span>
        <span>P <b>{liveP.toFixed(0)}°</b></span>
      </div>

      <!-- Action row -->
      <div class="actions">
        <button class="ghost" on:click={onCancel} disabled={busy}>CANCEL</button>
        {#if done}
          <button class="primary" on:click={onSave} disabled={busy}>SAVE</button>
        {:else}
          <button class="primary" on:click={onCapture}
                  disabled={busy || phase !== 0}>
            {phase === 0 ? 'CAPTURE' : '…'}
          </button>
        {/if}
      </div>
    </div>

    <!-- ---- Step preview list ---- -->
    <!-- Compact progress strip — one row per gear position so the user
         sees where they are in the sequence at a glance. Each label uses
         prettyLabel() so "1" reads as "Gear 1" etc. The firmware hint
         column ("Tilt forward-left" / "Hold knob centred"…) is dropped —
         the gear name alone is the instruction. -->
    <div class="card muted small">
      <ol class="steps">
        {#each calib.steps as s, i}
          <li class:current={i === step} class:done={i < step}>
            <span class="i mono">{i + 1}</span>
            <span class="label">{prettyLabel(s.label)}</span>
          </li>
        {/each}
      </ol>
    </div>

  {:else}
    <!-- =================== Idle (no session) =================== -->
    <div class="card">
      <h3>Begin</h3>
      <p class="muted small">
        This will switch the device's screen to the calibration wizard.
        You can step through all {calib.calib_steps || 0} positions from
        your phone — no need to tap the device.
      </p>
      <button class="primary wide" on:click={onBegin}
              disabled={busy || (calib.calib_steps ?? 0) === 0}>
        BEGIN CALIBRATION
      </button>
      {#if (calib.calib_steps ?? 0) === 0}
        <p class="muted small">This mode has no capture-based calibration.</p>
      {/if}
    </div>

    <div class="card">
      <h3>IMU zero (current session)</h3>
      <dl>
        <dt>Roll</dt>  <dd class="mono">{calib.imu_zero.roll.toFixed(2)}°</dd>
        <dt>Pitch</dt> <dd class="mono">{calib.imu_zero.pitch.toFixed(2)}°</dd>
        <dt>Yaw</dt>   <dd class="mono">{calib.imu_zero.yaw.toFixed(2)}°</dd>
      </dl>
    </div>

    <!-- Old "Steps for this mode" preview card removed — the wizard
         already walks the user through each position one at a time
         with a much clearer focus state; a static list under the
         BEGIN button was just visual noise. The active session's
         in-card progress strip (above) covers the "where am I" need. -->

    <button class="danger wide" on:click={onResetAll} disabled={busy}>
      CLEAR CALIBRATION
    </button>
  {/if}
{/if}

<style>
  .err   { color: var(--danger); }
  .muted { color: var(--muted); }

  /* ---- Mode chips ---- */
  .mode-row {
    display: flex; gap: 8px;
    margin: var(--s-2) 0 var(--s-2);
  }
  .mode-chip {
    flex: 1;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 10px 6px;
    border-radius: var(--r-1);
    font-family: ui-monospace, monospace;
    font-size: 12px; letter-spacing: 1px;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }
  .mode-chip:hover:not(:disabled) { color: var(--fg); border-color: var(--accent); }
  .mode-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #000;
    font-weight: 700;
  }
  .mode-chip:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ---- Speed chips (narrower than mode chips — just digits) ---- */
  .speed-row {
    display: flex; align-items: center; gap: 6px;
    margin: 0 0 var(--s-2);
  }
  .speed-label {
    font-family: ui-monospace, monospace;
    font-size: 11px; letter-spacing: 1px;
    color: var(--muted);
    margin-right: 4px;
  }
  .speed-chip {
    width: 48px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 6px 0;
    border-radius: var(--r-1);
    font-family: ui-monospace, monospace;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }
  .speed-chip:hover:not(:disabled) { color: var(--fg); border-color: var(--accent); }
  .speed-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #000;
  }
  .speed-chip:disabled { opacity: 0.4; cursor: not-allowed; }
  .small { font-size: 13px; }
  .big   { font-size: 24px; }

  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; color: var(--accent); }

  /* ----- Wizard card ----- */
  .wizard {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    text-align: center;
  }
  .stepbar {
    display: flex; justify-content: space-between; align-items: center;
  }
  .phase-chip {
    padding: 2px 8px; border-radius: 999px;
    border: 1px solid var(--border);
  }
  .phase-0 { color: var(--muted); }
  .phase-1 { color: var(--warn, #ffa500); border-color: rgba(255,165,0,0.4); }
  .phase-2 { color: var(--success, #00d97e); border-color: rgba(0,217,126,0.4); }

  .big-label {
    font-family: var(--font-device);
    /* Was 56px for single-char labels ("1", "N"). With prettyLabel
       expanding to "Gear 1" / "Neutral" etc. we need a smaller size
       so the longest entry ("Reverse") still fits inside the card
       without wrapping on a 375px-wide iPhone SE. */
    font-size: 38px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--accent);
    margin: var(--s-2) 0 0;
    line-height: 1.1;
  }
  .hint {
    color: var(--muted);
    font-size: 13px;
    margin: 0 0 var(--s-2);
    min-height: 1.4em;
  }

  /* ----- Progress bars ----- */
  .progress-wrap { width: 100%; }
  .progress {
    height: 8px;
    border-radius: 4px;
    background: var(--surface-2, #1c1c1c);
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .progress .bar {
    height: 100%;
    transition: width 150ms linear;
  }
  .progress.warn .bar { background: var(--warn, #ffa500); }
  .progress.ok   .bar { background: var(--success, #00d97e); }
  .progress.idle .bar { background: transparent; }

  .float-right { float: right; }
  .live-tilt {
    display: flex; justify-content: center; gap: var(--s-4);
    color: var(--muted);
    margin-top: var(--s-1);
  }
  .live-tilt b { color: var(--fg); }

  /* ----- Action row ----- */
  .actions {
    display: flex; gap: var(--s-2); margin-top: var(--s-3);
  }
  .actions button { flex: 1; }
  .actions .ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
  }
  .primary {
    background: var(--accent);
    color: #000;
    border: 0;
    font-weight: 700;
  }
  .primary:disabled { opacity: 0.4; }

  .wide { width: 100%; }
  .danger {
    background: transparent;
    color: var(--danger);
    border-color: rgba(255, 59, 59, 0.4);
    margin-top: var(--s-3);
  }

  /* ----- Step list ----- */
  .steps { list-style: none; padding: 0; margin: var(--s-2) 0 0; }
  .steps li {
    /* Was 3 columns (index | label | hint). Hint column dropped —
       gear name is the instruction. Now: index | label only. */
    display: grid;
    grid-template-columns: 32px 1fr;
    align-items: baseline;
    padding: var(--s-2) 0;
    border-bottom: 1px solid var(--border);
  }
  .steps li:last-child { border-bottom: none; }
  .steps li.current .label { color: var(--accent); font-weight: 700; }
  .steps li.done .i { color: var(--success, #00d97e); }
  .steps li.done .label { text-decoration: line-through; opacity: 0.6; }
  .i  { color: var(--muted); }
  .label { font-weight: 700; }
</style>
