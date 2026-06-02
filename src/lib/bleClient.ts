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
  type DeviceInfo, type ConfigSnapshot, type TelemetryFrame
} from './api';

// Firmware advertises this service — scan filter matches it so the
// companion only surfaces AXIS knobs, not random BLE noise.
export const AXIS_SVC      = '7e1c0001-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const INFO_CHAR    = '7e1c0002-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const TELEM_CHAR   = '7e1c0003-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const CONFIG_CHAR  = '7e1c0004-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const COMMAND_CHAR = '7e1c0006-9b3a-4f8e-8a5b-9d2e1f3a7c6d';

// Command opcodes — keep in sync with BleAxis.cpp::CommandCb::onWrite.
export const CMD_REBOOT   = 0x01;
export const CMD_ZERO_IMU = 0x02;

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
    CapBle.startNotifications(deviceId, AXIS_SVC, TELEM_CHAR, (v: DataView) => {
      try { onFrame(viewToJson<TelemetryFrame>(v)); } catch { /* malformed frame, skip */ }
    })
    .then(() => { setTimeout(() => this.onopen?.(new Event('open')), 0); })
    .catch(()  => { setTimeout(() => this.onerror?.(new Event('error')), 0); });
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
   *  scan are filtered by ID. */
  static async scan(
    onHit: (hit: BleScanHit) => void,
    durationMs = 6000
  ): Promise<void> {
    await ensureReady();
    const seen = new Set<string>();
    await CapBle.requestLEScan(
      { services: [AXIS_SVC] },
      (r: ScanResult) => {
        const id = r.device.deviceId;
        if (seen.has(id)) return;
        seen.add(id);
        onHit({
          id,
          name: r.localName || r.device.name || 'AXIS',
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
    // Firmware's BLE config char returns a flat values dict (just
    // `{key: number}`), but DeviceClient.config() is typed
    // ConfigSnapshot = Record<string, TunableEntry>. Wrap each scalar
    // into a stub TunableEntry so the Brand/Tune UIs can render it.
    // Min/max/def aren't exposed yet over BLE (BLE writes go through
    // firmware's POST-style clamp regardless) — leaves these as 0 so
    // sliders fall back to v±50% bounds.
    const flat = viewToJson<Record<string, number>>(v);
    const out: ConfigSnapshot = {};
    for (const [k, val] of Object.entries(flat)) {
      out[k] = { v: val, min: 0, max: 0, def: val, unit: 'ms' };
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

  // ---- not supported over BLE (bandwidth or phase-2 work) ------------
  async ota(): Promise<void> {
    throw new Error('OTA upload requires Wi-Fi — open the OTA tab while paired over the device’s SoftAP.');
  }
  async uploadScreensaver(): Promise<void> {
    throw new Error('Screensaver upload requires Wi-Fi — image data is too big for BLE.');
  }
  async setBranding(): Promise<{ ok: boolean }> {
    throw new Error('Branding edits require Wi-Fi for now (phase-2 BLE work).');
  }
  async branding(): Promise<any> {
    throw new Error('Branding read requires Wi-Fi for now (phase-2 BLE work).');
  }
}
