// A synthesized MONITOR client for DEMO MODE — mirrors MonitorBleClient's shape so
// EVERY gauge feature (Looks editor + live preview, Analysis, Fault codes, Firmware
// update, splash themes, driver shortcuts) works with NO physical hardware. All data
// is plausible and the UI already labels the session "demo", so nothing is presented
// as a real reading. Set as store.monClient by the demo entry point in the Connect
// screen / the Home "Explore" button; a real Bluetooth connect replaces it.

import { defaultCfg, type GaugeCfg, type DeviceVersions, type DtcSnapshot,
         type AccelTimes, type ShortcutStatus, type CarId } from './monitorCfg';

export class MockMonitor {
  readonly deviceId = 'demo-monitor';
  private cfg: GaugeCfg = defaultCfg();

  static async isAvailable() { return true; }
  async connect(_onDisconnect?: () => void) {}
  async disconnect() {}
  async onAck(_cb: (ok: boolean) => void) {}
  async offAck() {}

  // ---- gauge display config (Looks) ----
  async config(): Promise<GaugeCfg> { return structuredClone(this.cfg); }
  async setConfig(c: GaugeCfg) { this.cfg = structuredClone(c); }
  async previewCfg(_c: GaugeCfg) {}
  previewCfgLive(_c: GaugeCfg, _ms?: number) {}
  async setBrightness(_v: number) {}
  async setPageColor(_page: number, _color565: number) {}
  async setGearProfile(_bytes: Uint8Array) {}

  // ---- versions / diagnostics ----
  async readVersions(): Promise<DeviceVersions> {
    // Report the current shipping versions so the Firmware screen reads "up to date".
    return { monitor: { major: 0, minor: 48, patch: 0 }, node: { major: 0, minor: 5, patch: 26 } };
  }
  async readDtcCodes(): Promise<DtcSnapshot> {
    // One sample stored code so the Fault-codes card renders fully in demo.
    return { count: 1, mil: true, codes: ['P0301'], conditions: { rpm: 820, coolant: 92, load: 34 } };
  }
  async carId(): Promise<CarId> {
    // Demo: the node's default car so the auto-detect banner renders in DEMO MODE.
    return { make: 'Volvo', year: 2021 };
  }
  async clearDtcCodes() {}
  async readAccelTimes(): Promise<AccelTimes> {
    return {
      speed: [{ ms: 6100 }, { ms: 15200 }, { ms: null }],
      dist:  [{ ms: 2400 }, { ms: 9100, trapKmh: 138 }, { ms: 14300, trapKmh: 172 }],
    };
  }
  async readShortcutStatus(): Promise<ShortcutStatus> {
    return {
      recording: false, lapRunning: false, peaksShown: false, lapsDone: 3,
      lapCurMs: 0, lapLastMs: 92840, lapBestMs: 89210,
      topSpeedKmh: 176, maxRpm: 6400, maxBoostBar: 1.2, maxCoolantC: 96, peakHp: 405, peakNm: 470,
    };
  }
  async sendShortcut(_action: number) {}

  // ---- anti-sleep / drowsiness (demo values so the card is fully browsable) ----
  private as = { enabled: true, intervalMin: 120, restMin: 5, snoozeMin: 15, moveKph: 60, gyroOn: true, sens: 5, drowsyScore: 18, baselinePct: 100 };
  async readAntiSleep() { return { ...this.as }; }
  async setAntiSleep(c: any) { this.as = { ...this.as, ...c }; }

  // ---- drive log → Analysis falls back to its built-in demo run when empty ----
  async logInfo() { return { size: 0, count: 0, ver: 1, sampleBytes: 24 }; }
  async pullLog(_onProgress?: (pct: number) => void) { return new Uint8Array(0); }
  async eraseLog() { return true; }

  // ---- OTA (unused when readVersions reports up-to-date; simulate anyway) ----
  async flash(_target: number, _bin: Uint8Array, onProgress?: (pct: number) => void) {
    for (let p = 0; p <= 100; p += 20) { onProgress?.(p); await new Promise(r => setTimeout(r, 120)); }
  }

  // ---- ported device features — demo values so the cards are browsable ----
  async readHealth() {
    return { received: true, milOn: false, dtc: 0, monSupported: 8, monReady: 8, pending: 0, permanent: 0 };
  }
  private exh = { mode: 1, valve: 2, hasCodes: true, openRpm: 3500, closeRpm: 2500, openThr: 60 };
  async readExhaust() { return { ...this.exh }; }
  async setExhaustMode(mode: number) { this.exh.mode = mode; }
  async setExhaustCodes(_c: any) { this.exh.hasCodes = true; }
  async setExhaustAuto(a: any) { this.exh = { ...this.exh, ...a }; }
  async exhaustPulse(open: boolean) { this.exh.valve = open ? 1 : 0; }
  async setEcuProfile(_chunks: Uint8Array[]) {}
}
