// =====================================================================
//  MockClient — drop-in replacement for DeviceClient that synthesises
//  realistic-looking AXIS knob data without any device on the network.
//
//  Use cases:
//   • iOS simulator demos (no AP join possible)
//   • UI development on the laptop without firmware running
//   • App Store screenshots / marketing shots
//
//  Activate from Connect.svelte → "DEMO MODE" button. Everything else
//  in the app stays unchanged because MockClient is structurally
//  identical to DeviceClient — same method names, same return types.
//
//  Faked sources:
//   • info()         → canned device snapshot, gear/uptime live-updated
//   • openTelemetry()→ in-memory "WebSocket" emitting 30 Hz synthetic
//                      frames: sinusoidal roll/pitch + gyro derivative,
//                      gear cycling 1→5→1 over ~20 s.
//   • config()       → tunables snapshot the Tune page can render
//   • branding()     → default brand info Brand page can render
//   • sys()          → SYS panel snapshot with synthetic IMU + WiFi/AP
//   • writes (patchConfig/setBranding/etc) → no-op {ok:true} so the UI
//     toast flow still feels successful in demo mode.
// =====================================================================

import {
  DeviceClient,
  type DeviceInfo,
  type SysSnapshot,
  type ConfigSnapshot,
  type BrandingSnapshot,
  type CalibSnapshot,
  type WifiStatus,
  type TelemetryFrame
} from './api';

// Synthetic clock origin so uptime climbs the way a real device would.
const T0 = Date.now();

// Gear labels for a 5-speed H-pattern — matches the firmware default.
const LABELS = ['R', 'N', '1', '2', '3', '4', '5'];

// =====================================================================
//  Demo scenes — each is a (gear pattern, IMU character) pairing that
//  evokes a real driving situation. Pick the one that best showcases
//  the feature you're demoing.
//
//    DEFAULT   — original sweep + gentle drift. Good "AXIS at rest".
//    CRUISE    — locked in 5, near-zero IMU. Long-distance highway.
//    SPIRITED  — 3↔4↔5 with moderate G + brake/accel pitch. Backroad.
//    TRACK     — fast 2→3→4→5 sweep + hard cornering G + braking.
//    STOP_GO   — N/1/2 cycling with brake pitch. City traffic.
//    IDLE      — sat in N, micro-noise only. Static screenshots.
// =====================================================================
export type DemoScene =
  | 'default' | 'cruise' | 'spirited' | 'track' | 'stopgo' | 'idle';

export const SCENES: ReadonlyArray<{ id: DemoScene; label: string; hint: string }> = [
  { id: 'default',  label: 'DEFAULT',  hint: 'Sweep R→N→1-5, gentle drift' },
  { id: 'cruise',   label: 'CRUISE',   hint: 'Locked in 5, minimal motion' },
  { id: 'spirited', label: 'SPIRITED', hint: '3↔4↔5, moderate G + pitch' },
  { id: 'track',    label: 'TRACK',    hint: 'Fast 2-5 sweep, hard G' },
  { id: 'stopgo',   label: 'STOP & GO',hint: 'N/1/2 cycling, brake pitch' },
  { id: 'idle',     label: 'IDLE',     hint: 'N gear, near-zero motion' },
];

// Module-level scene so the FakeSocket / info()/sys() all read the same
// current state — set by MockClient constructor (or setDemoScene() at
// runtime if we expose a switcher on Live later).
let activeScene: DemoScene = 'default';
export function setDemoScene(s: DemoScene) { activeScene = s; }
export function getDemoScene(): DemoScene  { return activeScene; }

// ---- gear generators per scene ---------------------------------------
function gearForScene(now: number, scene: DemoScene): { index: number; label: string } {
  let idx: number;
  switch (scene) {
    case 'cruise':
      idx = 6;                                                       // 5th locked
      break;
    case 'idle':
      idx = 1;                                                       // N locked
      break;
    case 'spirited': {
      const c = [4, 5, 4, 5, 6, 5, 4];                              // 3-4-3-4-5-4-3
      idx = c[Math.floor((now / 1800) % c.length)];
      break;
    }
    case 'track': {
      const c = [3, 4, 5, 6, 6, 5, 4, 3, 2];                        // 2-3-4-5-5-4-3-2-1
      idx = c[Math.floor((now / 900) % c.length)];
      break;
    }
    case 'stopgo': {
      const c = [1, 2, 3, 2, 1, 1, 2, 1];                           // N-1-2-1-N-N-1-N
      idx = c[Math.floor((now / 1300) % c.length)];
      break;
    }
    case 'default':
    default: {
      const c = [1, 2, 3, 4, 5, 1, 6, 1, 0, 1];                     // N-1-2-3-4-N-5-N-R-N
      idx = c[Math.floor((now / 1400) % c.length)];
    }
  }
  return { index: idx, label: LABELS[idx] };
}

// ---- frame generators per scene --------------------------------------
function frameForScene(now: number, scene: DemoScene): TelemetryFrame {
  const t = now / 1000;
  let roll = 0, pitch = 0, dRoll = 0, dPitch = 0, accel = 1.0;

  switch (scene) {
    case 'cruise':
      // Highway: gentle steering corrections, almost flat pitch.
      roll  = 3 * Math.sin(t * 0.25);
      pitch = 1 * Math.cos(t * 0.18);
      dRoll  =  3 * 0.25 * Math.cos(t * 0.25);
      dPitch = -1 * 0.18 * Math.sin(t * 0.18);
      accel  = 1.0 + 0.008 * Math.sin(t * 1.1);
      break;

    case 'spirited':
      // Backroad: regular corners + braking pitch.
      roll  = 22 * Math.sin(t * 0.7);
      pitch = 8  * Math.sin(t * 0.5 + 1);
      dRoll  = 22 * 0.7 * Math.cos(t * 0.7);
      dPitch = 8  * 0.5 * Math.cos(t * 0.5 + 1);
      accel  = 1.0 + 0.15 * Math.sin(t * 0.5);
      break;

    case 'track': {
      // Hard cornering: bigger amplitude, faster cadence, asymmetric
      // braking pitch (negative spikes when "braking", smoothly rising
      // when "accelerating"). Uses a sharper waveform to feel less
      // sinusoidal.
      const turn = Math.sin(t * 1.1);
      roll  = 38 * Math.sign(turn) * Math.abs(turn) ** 0.7;          // sharper turn-in
      pitch = -16 * Math.max(0, Math.sin(t * 0.9)) + 6 * Math.cos(t * 0.6);
      dRoll  = 38 * 1.1 * Math.cos(t * 1.1);
      dPitch = -16 * 0.9 * Math.cos(t * 0.9) - 6 * 0.6 * Math.sin(t * 0.6);
      accel  = 1.0 + 0.45 * Math.sin(t * 1.3);
      break;
    }

    case 'stopgo':
      // City: minimal roll, big pitch spikes from accel/brake.
      roll  = 1.5 * Math.sin(t * 0.3);
      pitch = 7   * Math.sin(t * 0.65 + Math.sin(t * 0.2));         // pulsing brake
      dRoll  = 1.5 * 0.3 * Math.cos(t * 0.3);
      dPitch = 7   * 0.65 * Math.cos(t * 0.65);
      accel  = 1.0 + 0.25 * Math.sin(t * 0.7);
      break;

    case 'idle':
      // Sat at lights / parked: micro-noise only.
      roll  = 0.4 * Math.sin(t * 0.12);
      pitch = 0.3 * Math.cos(t * 0.15);
      dRoll  = 0.4 * 0.12 * Math.cos(t * 0.12);
      dPitch = -0.3 * 0.15 * Math.sin(t * 0.15);
      accel  = 1.0 + 0.002 * Math.sin(t * 0.5);
      break;

    case 'default':
    default:
      // Original gentle lissajous.
      roll  = 18 * Math.sin(t * 0.6);
      pitch = 12 * Math.cos(t * 0.43);
      dRoll  = 18 * 0.6  * Math.cos(t * 0.6);
      dPitch = -12 * 0.43 * Math.sin(t * 0.43);
      accel  = 1.0 + 0.02 * Math.sin(t * 2.1);
  }

  const gyro   = Math.hypot(dRoll, dPitch);
  const motion = gyro > 8 || Math.abs(accel - 1.0) > 0.05;
  const g      = gearForScene(now, scene);
  return {
    t: now,
    roll, pitch,
    gyro, accel,
    motion,
    gear:   g.index,
    label:  g.label,
    frozen: false
  };
}

// Back-compat shims that always use the active scene. Existing callers
// (info(), sys(), FakeSocket) don't need to thread the scene through.
function syntheticGear(now: number)  { return gearForScene(now, activeScene); }
function syntheticFrame(now: number) { return frameForScene(now, activeScene); }

// A minimal fake WebSocket — Live.svelte only ever reads `.onopen`,
// `.onclose`, and calls `.close()`. Anything else (`send`, etc.) is
// unused. Implementing the full interface would be wasted code.
class FakeSocket {
  onopen:    ((ev: Event) => void) | null = null;
  onclose:   ((ev: Event) => void) | null = null;
  onerror:   ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  private timer: number | null = null;

  constructor(private onFrame: (f: TelemetryFrame) => void) {
    // Defer the "open" event by a tick so handlers attached after `new
    // FakeSocket(...)` actually receive it (mirroring real WS semantics).
    setTimeout(() => this.onopen?.(new Event('open')), 0);
    // 30 Hz telemetry to match the firmware's WS cadence.
    this.timer = window.setInterval(() => {
      this.onFrame(syntheticFrame(Date.now()));
    }, 33);
  }
  close() {
    if (this.timer != null) { window.clearInterval(this.timer); this.timer = null; }
    this.onclose?.(new Event('close'));
  }
}

// =====================================================================
//  The mock itself. Subclasses DeviceClient so `store.client` (typed as
//  DeviceClient | null) accepts it without widening the store type.
// =====================================================================
export class MockClient extends DeviceClient {
  constructor(scene: DemoScene = 'default') {
    super('mock://localhost');
    setDemoScene(scene);
  }
  /** Switch the active demo scene without re-creating the client. */
  setScene(s: DemoScene) { setDemoScene(s); }

  // ---- read-only snapshots -----------------------------------------
  async info(): Promise<DeviceInfo> {
    const g = syntheticGear(Date.now());
    return {
      name:        'AXIS DEMO',
      version:     'AXIS V1.0.0',
      uptime_ms:   Date.now() - T0,
      free_heap:   270_000,
      mode_id:     0,
      mode_name:   'HPATTERN',
      gear_count:  5,
      gear_index:  g.index,
      gear_label:  g.label,
      gear_frozen: false
    };
  }

  async sys(): Promise<SysSnapshot> {
    const f = syntheticFrame(Date.now());
    return {
      version:       'AXIS V1.0.0',
      uptime_ms:     Date.now() - T0,
      free_heap:     270_000,
      min_heap:      210_000,
      heap_size:     327_680,
      psram_size:    8 * 1024 * 1024,
      psram_free:    7 * 1024 * 1024,
      flash_size:    16 * 1024 * 1024,
      cpu_mhz:       240,
      mac:           'AA:BB:CC:DD:EE:FF',
      ap_ssid:       'SN_AXIS_DEMO',
      ap_ip:         '192.168.4.1',
      ap_clients:    1,
      sta_connected: false,
      mode_name:     'HPATTERN',
      gear_count:    5,
      imu: {
        ax: f.accel * Math.sin(f.roll  * Math.PI / 180),
        ay: f.accel * Math.sin(f.pitch * Math.PI / 180),
        az: f.accel,
        gx: 0, gy: 0, gz: 0,
        roll:  f.roll,
        pitch: f.pitch
      },
      battery: {
        volts:    4.05,
        percent:  82,
        present:  true,
        charging: false,
        low:      false
      }
    };
  }

  async config(): Promise<ConfigSnapshot> {
    // A tiny sampler so Tune page renders something. The real device
    // exposes ~40 keys; we ship just enough that each section has a
    // visible control. Add to taste.
    return {
      gearDwellMs:     { v: 200,  min: 50,  max: 1500, def: 200,  unit: 'ms' },
      patternChaseMs:  { v: 400,  min: 100, max: 1500, def: 400,  unit: 'ms' },
      intentGyroDps:   { v: 12,   min: 5,   max: 40,   def: 12,   unit: 'dps' },
      intentWindowMs:  { v: 1500, min: 500, max: 3000, def: 1500, unit: 'ms' },
      brightFull:      { v: 255,  min: 30,  max: 255,  def: 255,  unit: '' },
      brightDim:       { v: 80,   min: 0,   max: 255,  def: 80,   unit: '' },
      sleepAfterMs:    { v: 60_000, min: 5_000, max: 600_000, def: 60_000, unit: 'ms' }
    };
  }

  async branding(): Promise<BrandingSnapshot> {
    return {
      name:        'AXIS DEMO',
      accent565:   0xfd00,
      accent_hex:  '#ffa500',
      max_name:    16,
      gear_hex:    '#ffa500',
      meter_hex:   '#ffa500',
      name_hex:    '#ffffff',
      fg_hex:      '#ffffff',
      muted_hex:   '#888888',
      warn_hex:    '#ff3b3b',
      screensaver: false,
      screensaver_w:        240,
      screensaver_h:        240,
      screensaver_size:     115_200,
      screensaver_frames:   0,
      screensaver_fps:      0,
      screensaver_animated: false
    };
  }

  async calibration(): Promise<CalibSnapshot> {
    return {
      mode_id:    0,
      mode_name:  'HPATTERN',
      gear_count: 5,
      calib_steps: 6,
      steps: [
        { label: 'N', hint: 'Hold knob centred' },
        { label: '1', hint: 'Tilt forward-left' },
        { label: '2', hint: 'Tilt backward-left' },
        { label: '3', hint: 'Tilt forward-centre' },
        { label: '4', hint: 'Tilt backward-centre' },
        { label: '5', hint: 'Tilt forward-right' }
      ],
      imu_zero: { roll: 0, pitch: 0, yaw: 0 }
    };
  }

  async wifi(): Promise<WifiStatus> {
    return { ssid: '', configured: false, connected: false, rssi: -60 };
  }

  // ---- writes — no-ops that look successful ------------------------
  async patchConfig(): Promise<{ ok: boolean }>   { return { ok: true }; }
  async saveConfig():  Promise<{ ok: boolean }>   { return { ok: true }; }
  async resetConfig(): Promise<{ ok: boolean }>   { return { ok: true }; }
  async setBranding(): Promise<{ ok: boolean }>   { return { ok: true }; }
  async resetBranding(): Promise<{ ok: boolean }> { return { ok: true }; }
  async setWifi():     Promise<{ ok: boolean }>   { return { ok: true }; }
  async reboot():      Promise<{ ok: boolean }>   { return { ok: true }; }
  async factoryReset(): Promise<{ ok: boolean }>  { return { ok: true }; }
  async resetCalibration(): Promise<{ ok: boolean }> { return { ok: true }; }
  async clearScreensaver(): Promise<{ ok: boolean }> { return { ok: true }; }

  // Upload paths — simulate progress, then resolve. Total time scales
  // with byte count so the progress bar moves at a believable rate.
  async uploadScreensaver(bytes: Uint8Array, onProgress?: (frac: number) => void): Promise<void> {
    return this.fakeUpload(bytes.byteLength, onProgress);
  }
  async ota(file: File, onProgress?: (frac: number) => void): Promise<void> {
    return this.fakeUpload(file.size, onProgress);
  }

  private async fakeUpload(bytes: number, onProgress?: (frac: number) => void): Promise<void> {
    // Pretend 250 kB/s, capped 0.5–4 s of total time.
    const totalMs = Math.max(500, Math.min(4000, bytes / 250));
    const startMs = performance.now();
    return new Promise(resolve => {
      const tick = () => {
        const e = performance.now() - startMs;
        const f = Math.min(1, e / totalMs);
        onProgress?.(f);
        if (f >= 1) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // ---- live telemetry ----------------------------------------------
  openTelemetry(
    onFrame: (f: TelemetryFrame) => void,
    onError?: (e: Event) => void
  ): WebSocket {
    // Type-cast: FakeSocket only implements the bits Live.svelte uses.
    return new FakeSocket(onFrame) as unknown as WebSocket;
  }
}
