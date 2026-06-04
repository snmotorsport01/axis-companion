// =====================================================================
//  BleClient — talks to the knob over the BleAxis GATT service.
//
//  Drops in wherever a DeviceClient is expected (Live, Tune, Brand…)
//  by subclassing the same interface. Phase-1 firmware (v2.5.14) ships
//  these characteristics under service 7e1c0001 (KEEP IN SYNC with
//  BleAxis.cpp):
//    info       (read)        JSON — same shape as /api/info
//    telemetry  (notify)      JSON — same shape as WS /api/stream
//    config     (read, write) JSON — patch == POST /api/config
//    command    (write)       1-byte opcode: 0x01 reboot, 0x02 zero IMU
//
//  Limits (intentional — BLE is the wrong tool for big transfers):
//    ota()              throws — use Wi-Fi
//    uploadScreensaver  throws — use Wi-Fi
//    setBranding/etc    throws — colour pickers still go over Wi-Fi
//                       (the firmware branding char is phase-2)
// =====================================================================
import { BleClient as CapBle, type ScanResult } from '@capacitor-community/bluetooth-le';
import {
  DeviceClient,
  type DeviceInfo, type ConfigSnapshot, type TelemetryFrame,
  type CalibSnapshot, type BrandingSnapshot
} from './api';

// Firmware advertises this service — scan filter matches it so the
// companion only surfaces AXIS knobs, not random BLE noise.
export const AXIS_SVC      = '7e1c0001-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const INFO_CHAR        = '7e1c0002-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const TELEM_CHAR       = '7e1c0003-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const CONFIG_CHAR      = '7e1c0004-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const BRANDING_CHAR    = '7e1c0005-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const COMMAND_CHAR     = '7e1c0006-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const CALIB_STATE_CHAR = '7e1c0007-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const CALIB_CMD_CHAR   = '7e1c0008-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
// Phase 2 transfer chars — chunked uploads for screensaver + OTA.
const XFER_CTL_CHAR    = '7e1c0009-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const XFER_BUF_CHAR    = '7e1c000a-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const XFER_STATE_CHAR  = '7e1c000b-9b3a-4f8e-8a5b-9d2e1f3a7c6d';

// Transfer opcodes (keep in sync with BleAxis.cpp::XferCtlCb).
const XFER_OP_START = 0x01;
const XFER_OP_END   = 0x02;
const XFER_OP_ABORT = 0x03;
// Transfer payload types — START's `type` byte.
const XFER_TYPE_SCREENSAVER = 0x01;
const XFER_TYPE_OTA         = 0x02;
// Transfer state codes from the device.
const XS_IDLE       = 0;
const XS_RECEIVING  = 1;
const XS_COMMITTING = 2;
const XS_DONE       = 3;
const XS_ERROR      = 4;

// Bytes per WRITE_NR chunk. MTU = 247 → 244 byte ATT payload. We're
// conservative at 240 to leave a margin for any controller that
// fragments slightly differently.
const XFER_CHUNK_BYTES = 240;

// Command opcodes — keep in sync with BleAxis.cpp::CommandCb::onWrite.
export const CMD_REBOOT         = 0x01;
export const CMD_ZERO_IMU       = 0x02;
export const CMD_SET_MODE       = 0x10;   // payload: [mode_id:u8] (0 PRND, 1 SEQ, 2 HPATTERN)
export const CMD_SET_GEAR_COUNT = 0x11;   // payload: [count:u8] clamped 4..6, HPAT+SEQ only
export const CMD_GOTO_SLEEP     = 0x20;   // v2.5.34 — force SCR_SLEEP for screensaver preview

// Calibration opcodes — keep in sync with BleAxis.cpp::CalibCmdCb.
export const CALIB_BEGIN  = 0x01;
export const CALIB_TAP    = 0x02;
export const CALIB_COMMIT = 0x03;
export const CALIB_ABORT  = 0x04;
export const CALIB_RESET  = 0x05;

/**
 * Latest calibration snapshot seen on the GATT notify pipe. Populated
 * by the lazy subscription set up the first time `calibration()` is
 * called — subsequent reads return the cached snapshot without a
 * round-trip, which is what the wizard's 250 ms poll wants.
 */
type CalibCache = { snap: CalibSnapshot | null; subscribed: boolean };

// One-shot initialize (the plugin treats repeated calls as idempotent
// but rerunning the iOS permission prompt is jarring). bleReady is the
// gate every public call awaits.
let bleReady: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (!bleReady) bleReady = CapBle.initialize({ androidNeverForLocation: true });
  return bleReady;
}

// Encode/decode helpers — BLE plugin moves bytes as DataView, our chars
// are JSON strings.
const dec = new TextDecoder();
const enc = new TextEncoder();
function viewToJson<T>(v: DataView): T {
  return JSON.parse(dec.decode(v)) as T;
}
function jsonToView(obj: any): DataView {
  const bytes = enc.encode(JSON.stringify(obj));
  return new DataView(bytes.buffer);
}

/**
 * Fake WebSocket so Live.svelte's existing telemetry path works
 * whether the bytes come from /api/stream over Wi-Fi or BLE notify.
 * Mirrors the MockClient pattern.
 */
class BleFakeSocket {
  onopen:    ((ev: Event) => void) | null = null;
  onclose:   ((ev: Event) => void) | null = null;
  onerror:   ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  private cleanup: (() => Promise<void>) | null = null;

  constructor(deviceId: string, onFrame: (f: TelemetryFrame) => void) {
    this.cleanup = async () => {
      try { await CapBle.stopNotifications(deviceId, AXIS_SVC, TELEM_CHAR); } catch {}
    };
    // Fire-and-forget subscribe — emits onopen once the GATT subscribe
    // round-trip is confirmed, onerror if the plugin rejects.
    //
    // v2.5.41: wrap the startNotifications call itself in try/catch.
    // The native Capacitor plugin can throw SYNCHRONOUSLY (not just
    // reject) when the BLE link is already dead — in which case the
    // .catch() below never runs and the socket sits in limbo waiting
    // for a notify that will never arrive. Surface the error
    // immediately via onerror (deferred to next tick so the caller has
    // time to wire up the handler).
    try {
      CapBle.startNotifications(deviceId, AXIS_SVC, TELEM_CHAR, (v: DataView) => {
        try { onFrame(viewToJson<TelemetryFrame>(v)); } catch { /* malformed frame, skip */ }
      })
      .then(() => { setTimeout(() => this.onopen?.(new Event('open')), 0); })
      .catch(()  => { setTimeout(() => this.onerror?.(new Event('error')), 0); });
    } catch {
      setTimeout(() => this.onerror?.(new Event('error')), 0);
    }
  }

  close() {
    if (!this.cleanup) return;
    this.cleanup().finally(() => this.onclose?.(new Event('close')));
    this.cleanup = null;
  }
}

export interface BleScanHit {
  id:    string;   // platform-specific BLE device identifier (UUID on iOS, MAC on Android)
  name:  string;
  rssi?: number;
}

export class BleClient extends DeviceClient {
  constructor(public readonly deviceId: string) {
    // Mock base URL — DeviceClient's `base` field is unused on the BLE
    // path. Same trick MockClient uses.
    super(`ble://${deviceId}`);
  }

  // ---- static helpers ------------------------------------------------
  /** Returns true if the host supports BLE (iOS simulator returns false
   *  because the simulator has no radio — keeps the Connect screen
   *  from showing a non-functional Scan button there). */
  static async isAvailable(): Promise<boolean> {
    try { await ensureReady(); return true; }
    catch { return false; }
  }

  /** Scan for nearby AXIS knobs for `durationMs` (default 6 s). Each
   *  unique device fires `onHit` exactly once; duplicates from the same
   *  scan are filtered by ID.
   *
   *  Scan strategy: we DON'T filter by service UUID at the iOS level
   *  because some firmware advertising paths put the service UUID in
   *  the scan response rather than the main ADV packet — iOS's
   *  scanForPeripherals(withServices:) only matches the main packet,
   *  so a strict filter sometimes hides the device entirely. Instead
   *  we scan everything and filter client-side by either:
   *    • name starts with "AXIS" (covers the default device name and
   *      any brand-customised one as long as the user kept the prefix)
   *    • OR the advertised UUIDs list contains the AXIS service
   *  This is more forgiving and matches what LightBlue / nRF Connect
   *  see, which is the user's "ground-truth" sanity check. */
  static async scan(
    onHit: (hit: BleScanHit) => void,
    durationMs = 6000
  ): Promise<void> {
    await ensureReady();
    const seen = new Set<string>();
    await CapBle.requestLEScan(
      // Empty filter — give iOS no constraint, accept everything.
      // Throughput is fine for 6 s windows in foreground.
      { services: [], allowDuplicates: false },
      (r: ScanResult) => {
        const id   = r.device.deviceId;
        if (seen.has(id)) return;
        const name = r.localName || r.device.name || '';
        const advertisedUuids = (r.uuids ?? []).map(u => u.toLowerCase());
        const isAxis =
          /^axis/i.test(name) ||
          advertisedUuids.includes(AXIS_SVC.toLowerCase());
        if (!isAxis) return;
        seen.add(id);
        onHit({
          id,
          name: name || 'AXIS',
          rssi: r.rssi
        });
      }
    );
    // Auto-stop after the requested window. Caller can re-invoke for a
    // longer scan if needed.
    return new Promise(resolve => {
      setTimeout(async () => {
        try { await CapBle.stopLEScan(); } catch {}
        resolve();
      }, durationMs);
    });
  }

  // ---- connection lifecycle ------------------------------------------
  async connect(onDisconnect?: () => void): Promise<void> {
    await ensureReady();
    await CapBle.connect(this.deviceId, () => onDisconnect?.());
  }

  async disconnect(): Promise<void> {
    try { await CapBle.disconnect(this.deviceId); } catch {}
  }

  // ---- DeviceClient overrides ----------------------------------------
  async info(): Promise<DeviceInfo> {
    const v = await CapBle.read(this.deviceId, AXIS_SVC, INFO_CHAR);
    return viewToJson<DeviceInfo>(v);
  }

  async config(): Promise<ConfigSnapshot> {
    const v = await CapBle.read(this.deviceId, AXIS_SVC, CONFIG_CHAR);
    // BLE config char emits a compact shape ({v, min, max} per field)
    // because the full /api/config schema overflows NimBLE's 512-byte
    // ATT characteristic cap and gets truncated mid-string. Augment
    // here with the static metadata (def, unit, enum.names) so the
    // Tune page slider + dropdown UI gets everything it needs. Update
    // this map whenever the firmware adds a new tunable.
    const raw = viewToJson<Record<string, { v: number; min: number; max: number }>>(v);
    const META: Record<string, { def: number; unit: string; names?: string[] }> = {
      gearDwellMs:     { def: 180,    unit: 'ms'  },
      patternChaseMs:  { def: 220,    unit: 'ms'  },
      intentGyroDps:   { def: 20,     unit: 'dps' },
      intentWindowMs:  { def: 1500,   unit: 'ms'  },
      brightFull:      { def: 255,    unit: ''    },
      brightDim:       { def: 40,     unit: ''    },
      sleepAfterMs:    { def: 120000, unit: 'ms'  },
      transitionStyle: { def: 0,      unit: 'enum', names: ['Fade to black', 'Iris zoom', 'Instant'] },
      gearAnimStyle:   { def: 0,      unit: 'enum', names: ['None', 'Slide', 'Fade'] },
      // v2.5.29 — screensaver gyro-wake. Firmware sends min=0 max=1
      // v=0|1; tagged as unit:'enum' with two names so Brand.svelte's
      // existing enum-render branch draws an Off/On dropdown without
      // needing a separate boolean control.
      ssWakeOnMotion:  { def: 0,      unit: 'enum', names: ['Off', 'On'] }
    };
    const out: ConfigSnapshot = {};
    for (const [k, entry] of Object.entries(raw)) {
      const meta = META[k] ?? { def: entry.v, unit: '' };
      out[k] = { v: entry.v, min: entry.min, max: entry.max, def: meta.def, unit: meta.unit };
      if (meta.names) (out[k] as any).names = meta.names;
    }
    return out;
  }

  async patchConfig(patch: Record<string, number>): Promise<{ ok: boolean }> {
    await CapBle.write(this.deviceId, AXIS_SVC, CONFIG_CHAR, jsonToView(patch));
    return { ok: true };
  }

  // saveConfig is a no-op over BLE — the firmware persists each patch
  // to NVS inside applyConfigPatch_() already.
  async saveConfig(): Promise<{ ok: boolean }> { return { ok: true }; }

  async reboot(): Promise<{ ok: boolean }> {
    await CapBle.write(this.deviceId, AXIS_SVC, COMMAND_CHAR,
      new DataView(new Uint8Array([CMD_REBOOT]).buffer));
    return { ok: true };
  }

  /**
   * Switch active engine mode over BLE. Mirrors POST /api/mode on the
   * Wi-Fi side — sends a 2-byte command (opcode + mode_id) to the
   * command char. Firmware persists immediately via Prefs::saveMode().
   * Caller is expected to refresh `calibration()` after to pick up
   * the new mode's step list.
   */
  async setMode(mode_id: number): Promise<{ ok: boolean; mode_id: number; mode_name: string }> {
    await CapBle.write(this.deviceId, AXIS_SVC, COMMAND_CHAR,
      new DataView(new Uint8Array([CMD_SET_MODE, mode_id & 0xff]).buffer));
    // The command char is write-only; we don't get the new mode name
    // back synchronously. Return the value we sent so call sites can
    // mirror the Wi-Fi DeviceClient.setMode() shape, then they
    // re-fetch calibration() to confirm.
    return { ok: true, mode_id, mode_name: '' };
  }

  async setGearCount(count: number): Promise<{ ok: boolean; count: number }> {
    const c = Math.max(4, Math.min(6, Math.round(count))) & 0xff;
    await CapBle.write(this.deviceId, AXIS_SVC, COMMAND_CHAR,
      new DataView(new Uint8Array([CMD_SET_GEAR_COUNT, c]).buffer));
    return { ok: true, count: c };
  }

  /**
   * Force the device into the screensaver (sleep) screen. Used by the
   * Screensaver upload flow so a freshly-uploaded image is visible
   * immediately, rather than waiting for the auto-sleep timeout. Any
   * touch on the device wakes back to MAIN as usual.
   */
  async gotoSleep(): Promise<{ ok: boolean }> {
    await CapBle.write(this.deviceId, AXIS_SVC, COMMAND_CHAR,
      new DataView(new Uint8Array([CMD_GOTO_SLEEP]).buffer));
    return { ok: true };
  }

  // Telemetry — same surface as the WS path, so Live.svelte just keeps
  // working with its existing onFrame handler.
  openTelemetry(
    onFrame: (f: TelemetryFrame) => void,
    onError?: (e: Event) => void
  ): WebSocket {
    const sock = new BleFakeSocket(this.deviceId, onFrame);
    if (onError) sock.onerror = onError;
    return sock as unknown as WebSocket;
  }

  // ---- Branding over BLE (Phase 1) -----------------------------------
  // Mirrors GET/POST /api/branding. The firmware's BleAxis branding
  // char emits + accepts identical JSON, so the Brand page UI doesn't
  // need a separate code path.
  async branding(): Promise<BrandingSnapshot> {
    const v = await CapBle.read(this.deviceId, AXIS_SVC, BRANDING_CHAR);
    const flat = viewToJson<any>(v);
    // v2.5.37 — BLE branding now carries the screensaver fields (incl.
    // an optional `screensaver_error` set when the last loadFile_
    // failed). Older firmware (pre-v2.5.37) omits these; fall back to
    // safe stubs so the Brand / Screensaver UI keep destructuring.
    return {
      name:                 flat.name                 ?? 'AXIS',
      accent565:            flat.accent565            ?? 0,
      accent_hex:           flat.accent_hex           ?? '#FFA500',
      gear_hex:             flat.gear_hex             ?? '#FFA500',
      meter_hex:            flat.meter_hex            ?? '#888888',
      name_hex:             flat.name_hex             ?? '#BDBDBD',
      fg_hex:               flat.fg_hex               ?? '#FFFFFF',
      muted_hex:            flat.muted_hex            ?? '#888888',
      warn_hex:             flat.warn_hex             ?? '#FF3B3B',
      max_name:             flat.max_name             ?? 16,
      screensaver:          flat.screensaver          ?? false,
      screensaver_w:        flat.screensaver_w        ?? 240,
      screensaver_h:        flat.screensaver_h        ?? 240,
      screensaver_size:     flat.screensaver_size     ?? 115_200,
      screensaver_frames:   flat.screensaver_frames   ?? 0,
      screensaver_fps:      flat.screensaver_fps      ?? 0,
      screensaver_animated: flat.screensaver_animated ?? false,
      screensaver_error:    flat.screensaver_error    ?? undefined
    } as BrandingSnapshot;
  }
  async setBranding(patch: Record<string, any>): Promise<{ ok: boolean }> {
    await CapBle.write(this.deviceId, AXIS_SVC, BRANDING_CHAR, jsonToView(patch));
    return { ok: true };
  }

  // ---- Calibration over BLE (Phase 1) --------------------------------
  // Strategy: subscribe to the calib-state notify char lazily, cache
  // the latest snapshot, and serve it synchronously from `calibration()`.
  // The wizard's 250 ms poll then returns the most recent push (10 Hz
  // while active, 1 Hz idle) without burning a GATT round-trip per
  // tick. Commands (begin/tap/commit/abort/reset) are tiny single-byte
  // writes — direct GATT write each call.
  private calibCache_: CalibCache = { snap: null, subscribed: false };

  private async ensureCalibSubscribed_(): Promise<void> {
    if (this.calibCache_.subscribed) return;
    // v2.5.41 — flip the flag only after BOTH startNotifications and
    // the seed read have succeeded. Previously the flag flipped first,
    // and a seed-read failure left us with an active subscription on
    // the radio but subscribed=false in cache — the next caller would
    // call startNotifications a SECOND time on the same characteristic,
    // which the Capacitor plugin reports as success but the underlying
    // GATT layer silently drops the duplicate descriptor write.
    let notificationsStarted = false;
    try {
      await CapBle.startNotifications(this.deviceId, AXIS_SVC, CALIB_STATE_CHAR,
        (v: DataView) => {
          try { this.calibCache_.snap = this.inflateCalib_(viewToJson<any>(v)); } catch {}
        });
      notificationsStarted = true;
      // Seed the cache with a one-shot read so the first poll has data
      // before the first notify lands (which can lag the subscribe by
      // up to one connection interval).
      const seed = await CapBle.read(this.deviceId, AXIS_SVC, CALIB_STATE_CHAR);
      try { this.calibCache_.snap = this.inflateCalib_(viewToJson<any>(seed)); } catch {}
      this.calibCache_.subscribed = true;
    } catch (e) {
      // Roll back a partial subscribe so the retry path starts clean.
      if (notificationsStarted) {
        try {
          await CapBle.stopNotifications(this.deviceId, AXIS_SVC, CALIB_STATE_CHAR);
        } catch { /* tolerate */ }
      }
      throw e;
    }
  }

  // Hardcoded mirror of cfg::CALIB_STILL_HOLD_MS / CALIB_SAMPLE_MS /
  // CALIB_STILL_GYRO_DPS — the firmware no longer ships these inside
  // the calib state JSON (it was overflowing NimBLE's 512-byte ATT
  // cap and getting truncated mid-string). Update if the firmware
  // retunes the thresholds.
  private static readonly CALIB_STILL_HOLD_MS  = 250;
  private static readonly CALIB_SAMPLE_MS      = 500;
  private static readonly CALIB_STILL_GYRO_DPS = 20;

  // Inflate the wire-shape (steps as string array, no imu_zero, no
  // firmware thresholds) into the CalibSnapshot the Calibrate page
  // expects.
  private inflateCalib_(raw: any): CalibSnapshot {
    const stepsRaw: string[] = Array.isArray(raw?.steps) ? raw.steps : [];
    return {
      mode_id:    raw?.mode_id    ?? 0,
      mode_name:  raw?.mode_name  ?? '',
      gear_count: raw?.gear_count ?? 0,
      calib_steps: raw?.calib_steps ?? stepsRaw.length,
      steps: stepsRaw.map(s => ({ label: s, hint: '' })),
      imu_zero: { roll: 0, pitch: 0, yaw: 0 },
      imu_live: raw?.imu_live,
      state: raw?.state ? {
        ...raw.state,
        still_hold_ms:  BleClient.CALIB_STILL_HOLD_MS,
        sample_ms:      BleClient.CALIB_SAMPLE_MS,
        still_gyro_dps: BleClient.CALIB_STILL_GYRO_DPS
      } : undefined
    };
  }

  async calibration(): Promise<CalibSnapshot> {
    await this.ensureCalibSubscribed_();
    if (this.calibCache_.snap) return this.calibCache_.snap;
    // Subscribe succeeded but the firmware hasn't pushed yet — fall
    // back to a direct read so the wizard's first frame isn't empty.
    const v = await CapBle.read(this.deviceId, AXIS_SVC, CALIB_STATE_CHAR);
    const snap = this.inflateCalib_(viewToJson<any>(v));
    this.calibCache_.snap = snap;
    return snap;
  }

  private async calibWriteOp_(op: number): Promise<{ ok: boolean }> {
    await CapBle.write(this.deviceId, AXIS_SVC, CALIB_CMD_CHAR,
      new DataView(new Uint8Array([op]).buffer));
    return { ok: true };
  }
  async beginCalibration():  Promise<{ ok: boolean }> { return this.calibWriteOp_(CALIB_BEGIN);  }
  async tapCalibration():    Promise<{ ok: boolean }> { return this.calibWriteOp_(CALIB_TAP);    }
  async commitCalibration(): Promise<{ ok: boolean }> { return this.calibWriteOp_(CALIB_COMMIT); }
  async abortCalibration():  Promise<{ ok: boolean }> { return this.calibWriteOp_(CALIB_ABORT);  }
  async resetCalibration():  Promise<{ ok: boolean }> { return this.calibWriteOp_(CALIB_RESET);  }

  // ---- Chunked transfer (Phase 2 + 3) --------------------------------
  // Streams bytes to the device's transfer-buf char in MTU-sized
  // chunks. Same protocol for screensaver and OTA — the `type` byte
  // in the START opcode tells the firmware which sink to route to.
  //
  // Why no chunk-level retry: BLE guarantees ordering inside a
  // connection, so dropped chunks only happen on link drop, which
  // ends the upload anyway. The END opcode's size check on the
  // firmware side catches truncated transfers.
  private async transferBytes_(
    typeCode: number,
    bytes: Uint8Array,
    onProgress?: (frac: number) => void
  ): Promise<void> {
    const total = bytes.byteLength;
    // 0) ABORT (defensive) — clear any stale prior state before START.
    //    v2.5.36: a previous BLE link drop mid-upload can leave the
    //    device's xfer state pinned at RECEIVING/COMMITTING. Without
    //    this preemptive abort, a phone reconnect + retry hits XE_BUSY
    //    on the next START and the user has to reboot the device to
    //    recover. ABORT is a no-op when state is already IDLE on the
    //    device, so it's safe to send unconditionally.
    //
    //    v2.5.43: keep swallowing the failure (START still surfaces
    //    the real link error if traffic is genuinely broken) but log
    //    it instead of black-holing — when XE_BUSY shows up on START
    //    we now have a console breadcrumb that says "ABORT also
    //    failed", which points to the right root cause instead of
    //    sending us hunting in firmware xfer state.
    try {
      const abortBuf = new Uint8Array([XFER_OP_ABORT]);
      await CapBle.write(this.deviceId, AXIS_SVC, XFER_CTL_CHAR,
        new DataView(abortBuf.buffer));
      // Tiny breather so the device sees ABORT settle in xferReset_
      // before the START arrives. NimBLE callbacks are serialised on
      // the connection task, so a sub-100 ms delay is overkill but
      // also free.
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      console.warn('[ble.xfer] defensive ABORT failed (proceeding to START):',
        e instanceof Error ? e.message : String(e));
    }

    // 1) START — payload [op, type, total_lo..total_hi]
    const startBuf = new Uint8Array(6);
    startBuf[0] = XFER_OP_START;
    startBuf[1] = typeCode;
    new DataView(startBuf.buffer).setUint32(2, total, true);
    await CapBle.write(this.deviceId, AXIS_SVC, XFER_CTL_CHAR,
      new DataView(startBuf.buffer));

    // 2) DATA chunks — reliable WRITE (with ATT response). v0.5.2
    //    flipped from writeWithoutResponse to write after a string of
    //    upload failures: iOS BLE has no built-in flow control for
    //    WRITE_NR, so the plugin's writes pile up faster than the
    //    radio can drain, silently dropping packets once a per-
    //    connection buffer fills. WRITE round-trips an ATT response
    //    for each chunk — slower (~30 ms/chunk) but guaranteed
    //    delivery. A 100 KB screensaver takes ~12 s at 240 byte
    //    chunks; user-visible enough to want a progress bar but well
    //    inside the patience budget.
    //
    // CRITICAL: pass a FRESH ArrayBuffer per chunk (`.slice()` copies,
    // `.subarray()` only views). The Capacitor BLE plugin marshals
    // the buffer across the JS↔native bridge by serialising the
    // entire underlying ArrayBuffer — if we pass a `.subarray()`
    // view, it ignores byteOffset/byteLength and dumps the WHOLE
    // source file on every chunk write.
    let sent = 0;
    while (sent < total) {
      const end = Math.min(sent + XFER_CHUNK_BYTES, total);
      const chunk = bytes.slice(sent, end);          // fresh buffer
      const dv = new DataView(chunk.buffer);
      await CapBle.write(this.deviceId, AXIS_SVC, XFER_BUF_CHAR, dv);
      sent = end;
      onProgress?.(sent / total);
    }

    // 3) END — wait for the device to flip state to DONE (or ERROR).
    //    Poll the transfer-state char rather than relying on a notify
    //    subscription that may not have landed before our END write.
    const endBuf = new Uint8Array([XFER_OP_END]);
    await CapBle.write(this.deviceId, AXIS_SVC, XFER_CTL_CHAR,
      new DataView(endBuf.buffer));

    const deadline = Date.now() + 30_000;   // OTA commit can take ~10s
    while (Date.now() < deadline) {
      const v = await CapBle.read(this.deviceId, AXIS_SVC, XFER_STATE_CHAR);
      const state = v.getUint8(0);
      const error = v.getUint8(1);
      if (state === XS_DONE)  return;
      if (state === XS_ERROR) {
        const errNames = ['ok','size','write','commit','busy'];
        throw new Error(`Device rejected upload: ${errNames[error] ?? error}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('Upload commit timed out.');
  }

  async uploadScreensaver(bytes: Uint8Array,
                          onProgress?: (frac: number) => void): Promise<void> {
    return this.transferBytes_(XFER_TYPE_SCREENSAVER, bytes, onProgress);
  }

  async ota(file: File, onProgress?: (frac: number) => void): Promise<void> {
    // File → bytes once up front; the BLE plugin doesn't stream from
    // Blob and we already have the whole file in memory anyway
    // (Capacitor's WebView reads it into ArrayBuffer for any HTTP
    // upload path too).
    const bytes = new Uint8Array(await file.arrayBuffer());
    return this.transferBytes_(XFER_TYPE_OTA, bytes, onProgress);
  }
}
