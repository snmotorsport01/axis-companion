// =====================================================================
//  GaugeBleClient — talks DIRECTLY to the AXIS Gauge's own config GATT
//  service. The gauge is a SEPARATE BLE peripheral from the knob ("AXIS"):
//  different name ("AXIS Gauge"), different service + characteristics.
//  Transport decision (locked): the app configures the gauge over its own
//  BLE link, NOT relayed through the knob. The gauge's NVS is the source
//  of truth for its config.
//
//  KEEP IN SYNC with axis_gauge_fw/src/BleGaugeCfg.cpp:
//    svc 7e1c0101
//    config char 0102 (read/write) — JSON {redline, shiftRpm, peakHold, warn[],
//      arc (hex-packed 4ch/chan), cols (hex-packed 6), avail (bitmask), layout}
//    cmd    char 0103 (write)      — "resetPeaks"
// =====================================================================
import { BleClient as CapBle, type ScanResult } from '@capacitor-community/bluetooth-le';
import { rawToDtc } from './dtcDict';

export const GAUGE_SVC = '7e1c0101-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const CFG_CHAR         = '7e1c0102-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const CMD_CHAR         = '7e1c0103-9b3a-4f8e-8a5b-9d2e1f3a7c6d';

// ---- FOUNDER service (base 7e1c020x) — the SAME peripheral also exposes the
//   monitor/founder diagnostics service, discovered over GATT on the one
//   connection (KEEP IN SYNC with axis_gauge_fw/src/BleGaugeCfg.cpp + the
//   monitor's founderGaugeCfg.ts). The gauge advertises only 7e1c0101, so the
//   scan/connect flow is unchanged — these chars ride the existing link. ----
const FND_SVC   = '7e1c0201-9b3a-4f8e-8a5b-9d2e1f3a7c6d';
const DTC_CHAR  = '7e1c020a-9b3a-4f8e-8a5b-9d2e1f3a7c6d'; // DTC: READ code list, WRITE[0x01]=clear
const ACCEL_CHAR= '7e1c020b-9b3a-4f8e-8a5b-9d2e1f3a7c6d'; // accel best-times blob (READ)
const NLOG_CHAR = '7e1c020c-9b3a-4f8e-8a5b-9d2e1f3a7c6d'; // node-log text pull (WRITE cmd → READ)
const CAN_CHAR  = '7e1c020d-9b3a-4f8e-8a5b-9d2e1f3a7c6d'; // raw CAN-log pull + capture start/stop
const LOG_CHAR  = '7e1c0207-9b3a-4f8e-8a5b-9d2e1f3a7c6d'; // drive-log pull (WRITE cmd → READ)

/** The car's live stored trouble codes (char 7e1c020a). `codes` decoded to
 *  printed form ("P0301"); `mil` = check-engine lamp on. `conditions` = the
 *  current RPM/coolant/load if the gauge appended them. */
export interface DtcSnapshot {
  count: number;
  mil: boolean;
  codes: string[];
  conditions?: { rpm: number; coolant: number; load: number };
}
/** Best acceleration times (char 7e1c020b). `ms` is null when that target has
 *  no recorded run; `trapKmh` = finish speed (distance runs only). */
export interface AccelTimeEntry { ms: number | null; trapKmh?: number; }
export interface AccelTimes { speed: AccelTimeEntry[]; dist: AccelTimeEntry[]; }

/** Sentinel the firmware uses for "no warn threshold" (CAT[].warn = 1e9). */
export const GAUGE_NOWARN = 1e9;

// Global (shared) element colours, RGB565 — mirrors the firmware's colValue/…
// NB: the per-channel ARC colours live in GaugeConfig.arc[]; background + the
// centre SN logo are FIXED in firmware (not editable).
export interface GaugeGlobals {
  value:  number;   // readout numbers
  label:  number;   // channel headings
  frame:  number;   // L-brackets
  unit:   number;   // unit text
  warn:   number;   // warn / redline alert colour
  accent: number;   // page dots + hero hud ring
}

export const GAUGE_GLOBAL_DEFAULTS: GaugeGlobals = {
  value: 0xE71C, label: 0x9D15, frame: 0x6B8F, unit: 0x8C93, warn: 0xF800, accent: 0xFD20,
};
export const GAUGE_ARC_DEFAULT = 0xCD09;   // gold — per-channel arc default

// Global colour slots for the UI (order = display order).
export const GAUGE_GLOBAL_SLOTS: Array<{ key: keyof GaugeGlobals; label: string }> = [
  { key: 'value',  label: 'Readout numbers' },
  { key: 'label',  label: 'Labels' },
  { key: 'unit',   label: 'Units' },
  { key: 'frame',  label: 'Brackets' },
  { key: 'warn',   label: 'Warning / redline' },
  { key: 'accent', label: 'Accent (dots / ring)' },
];

// Page grid for the layout editor — mirrors PAGES[] in Gauge.cpp (name + how
// many readout slots that page shows). pageSlots storage width is 5 for all.
export const GAUGE_NPAGES = 4;
export const GAUGE_SLOTS  = 5;
export const GAUGE_PAGES: Array<{ name: string; slots: number }> = [
  { name: 'MAIN',  slots: 5 },   // concentric — 5 arcs
  { name: 'TURBO', slots: 4 },   // hero — primary + 3 support
  { name: 'TEMPS', slots: 4 },   // bars — 4 bars
  { name: 'FUEL',  slots: 4 },   // hero — primary + 3 support
];

/** RGB565 → "#rrggbb" for <input type="color">. */
export function rgb565ToHex(c: number): string {
  const r5 = (c >> 11) & 0x1f, g6 = (c >> 5) & 0x3f, b5 = c & 0x1f;
  const r = Math.round((r5 * 255) / 31), g = Math.round((g6 * 255) / 63), b = Math.round((b5 * 255) / 31);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
/** "#rrggbb" → RGB565 int. */
export function hexToRgb565(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return 0;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

export interface GaugeConfig {
  redline:    number;     // full-scale RPM (gauge sweeps red here)
  shiftRpm:   number;     // shift-light strobe point — always ≤ redline
  peakHold:   number;     // 0 = rolling (peak decays after 3 s), 1 = session hold
  warn:       number[];   // per-channel warn threshold, indexed by GAUGE_CHANNELS
  arc:        number[];   // per-channel arc/fill colour (RGB565), indexed by GAUGE_CHANNELS
  globals:    GaugeGlobals;
  pageLayout: number[];   // render style per page (0 concentric / 1 hero / 2 bars)
  pageSlots:  number[][]; // [page][slot] = channel index, -1 = empty
  slotColor:  number[][]; // [page][slot] = per-ARC-POSITION colour override (RGB565); 0 = inherit the channel's arc colour
  avail:      boolean[];  // per-channel: true = the car actually reports it (READ-ONLY from firmware).
                          // Drives greying-out of unreadable channels in the slot picker.
}

export interface GaugeChannel {
  label:   string;
  unit:    string;
  min:     number;
  max:     number;
  step:    number;
  hasWarn: boolean;   // false → NOWARN channel, hidden from the warn editor
}

// Channel catalog — MIRRORS axis_gauge_fw/src/Gauge.cpp CAT[] (v0.8), which is
// itself UNIFIED with axis_can_monitor's ui::Channel. Order is load-bearing:
// warn[]/arc[] and pageSlots indices reference it, so it must match the firmware
// enum Ch EXACTLY. `label` also matches the firmware's on-glass label so the live
// GaugePreview is faithful. min/max/step are app-side input bounds only.
export const GAUGE_CHANNELS: GaugeChannel[] = [
  { label: 'RPM',    unit: '',     min: 4000, max: 12000, step: 100, hasWarn: true  },  // 0 — up to 12k for rotary / high-rev builds
  { label: 'SPEED',  unit: 'km/h', min: 0,    max: 320,   step: 1,   hasWarn: false },  // 1
  { label: 'WTEMP',  unit: '°C',   min: 60,   max: 130,   step: 1,   hasWarn: true  },  // 2  coolant
  { label: 'OIL T',  unit: '°C',   min: 80,   max: 160,   step: 1,   hasWarn: true  },  // 3
  { label: 'IAT',    unit: '°C',   min: 30,   max: 120,   step: 1,   hasWarn: true  },  // 4  intake air
  { label: 'LOAD',   unit: '%',    min: 0,    max: 100,   step: 1,   hasWarn: false },  // 5
  { label: 'THR',    unit: '%',    min: 0,    max: 100,   step: 1,   hasWarn: false },  // 6  throttle
  { label: 'BOOST',  unit: 'bar',  min: 0,    max: 3,     step: 0.1, hasWarn: true  },  // 7
  { label: 'VOLTS',  unit: 'V',    min: 10,   max: 16,    step: 0.1, hasWarn: false },  // 8
  { label: 'SOC',    unit: '%',    min: 0,    max: 100,   step: 1,   hasWarn: false },  // 9  HV/EV battery
  { label: 'FUEL/h', unit: 'L/h',  min: 0,    max: 40,    step: 0.5, hasWarn: false },  // 10 fuel rate
  { label: 'MAF',    unit: 'g/s',  min: 0,    max: 400,   step: 1,   hasWarn: false },  // 11
  { label: 'BARO',   unit: 'kPa',  min: 0,    max: 130,   step: 1,   hasWarn: false },  // 12
  { label: 'ADV',    unit: '°',    min: -20,  max: 50,    step: 1,   hasWarn: false },  // 13 spark timing
  { label: 'STFT',   unit: '%',    min: -25,  max: 25,    step: 1,   hasWarn: false },  // 14 short fuel trim
  { label: 'LTFT',   unit: '%',    min: -25,  max: 25,    step: 1,   hasWarn: false },  // 15 long fuel trim
  { label: 'AMB',    unit: '°C',   min: -40,  max: 60,    step: 1,   hasWarn: false },  // 16 ambient
  { label: 'FUEL%',  unit: '%',    min: 0,    max: 100,   step: 1,   hasWarn: false },  // 17 fuel level
  { label: 'CAT',    unit: '°C',   min: 500,  max: 1100,  step: 10,  hasWarn: true  },  // 18 catalyst temp (EGT proxy)
  { label: 'CTHR',   unit: '%',    min: 0,    max: 100,   step: 1,   hasWarn: false },  // 19 commanded throttle
  { label: 'RUN',    unit: 's',    min: 0,    max: 65535, step: 1,   hasWarn: false },  // 20 run time
  { label: 'MAP',    unit: 'kPa',  min: 0,    max: 255,   step: 1,   hasWarn: false },  // 21 absolute manifold
  { label: 'GEAR',   unit: '',     min: 0,    max: 8,     step: 1,   hasWarn: false },  // 22
  { label: 'dMIL',   unit: 'km',   min: 0,    max: 65535, step: 1,   hasWarn: false },  // 23 distance w/ MIL
  { label: 'dCLR',   unit: 'km',   min: 0,    max: 65535, step: 1,   hasWarn: false },  // 24 distance since clear
  { label: 'A/F',    unit: '',     min: 10,   max: 20,    step: 0.1, hasWarn: false },  // 25
  { label: 'LAMBDA', unit: '',     min: 0.7,  max: 1.3,   step: 0.01,hasWarn: false },  // 26
  // ---- gauge extras: no OBD source on the V60 T8 (greyed out), kept for other cars ----
  { label: 'OIL P',  unit: 'bar',  min: 0,    max: 8,     step: 0.1, hasWarn: false },  // 27
  { label: 'TRANS',  unit: '°C',   min: 80,   max: 180,   step: 1,   hasWarn: true  },  // 28
  { label: 'ECON',   unit: 'km/L', min: 0,    max: 30,    step: 0.5, hasWarn: false },  // 29
];

let bleReady: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (!bleReady) bleReady = CapBle.initialize({ androidNeverForLocation: true });
  return bleReady;
}

const dec = new TextDecoder();
const enc = new TextEncoder();

export interface GaugeScanHit {
  id:    string;
  name:  string;
  rssi?: number;
}

export class GaugeBleClient {
  constructor(public readonly deviceId: string) {}

  static async isAvailable(): Promise<boolean> {
    try { await ensureReady(); return true; } catch { return false; }
  }

  /** Scan for the AXIS GAUGE specifically. The gauge advertises its name in
   *  the primary packet and the service UUID in the scan response, so we scan
   *  unfiltered and match client-side by name containing "gauge" OR the gauge
   *  service UUID — this excludes the knob ("AXIS") which lacks both. */
  static async scan(onHit: (h: GaugeScanHit) => void, durationMs = 6000): Promise<void> {
    await ensureReady();
    const seen = new Set<string>();
    // Surface a gauge the OS is already connected to (connected peripherals
    // stop advertising, so a fresh scan can't see them).
    try {
      const connected = await CapBle.getConnectedDevices([GAUGE_SVC]);
      for (const d of connected) {
        if (seen.has(d.deviceId)) continue;
        seen.add(d.deviceId);
        onHit({ id: d.deviceId, name: d.name || 'AXIS Gauge', rssi: 0 });
      }
    } catch { /* platform may not support it */ }

    await CapBle.requestLEScan(
      { services: [], allowDuplicates: false },
      (r: ScanResult) => {
        const id = r.device.deviceId;
        if (seen.has(id)) return;
        const name  = r.localName || r.device.name || '';
        const uuids = (r.uuids ?? []).map(u => u.toLowerCase());
        const isGauge = /gauge/i.test(name) || uuids.includes(GAUGE_SVC.toLowerCase());
        if (!isGauge) return;
        seen.add(id);
        onHit({ id, name: name || 'AXIS Gauge', rssi: r.rssi });
      }
    );
    return new Promise(resolve => {
      setTimeout(async () => {
        try { await CapBle.stopLEScan(); } catch {}
        resolve();
      }, durationMs);
    });
  }

  async connect(onDisconnect?: () => void): Promise<void> {
    await ensureReady();
    await CapBle.connect(this.deviceId, () => onDisconnect?.());
  }

  async disconnect(): Promise<void> {
    try { await CapBle.disconnect(this.deviceId); } catch {}
  }

  /** Read the live GaugeConfig JSON off the config characteristic. */
  async config(): Promise<GaugeConfig> {
    // Verify the gauge's config service was actually discovered, so we give a
    // precise error instead of the plugin's generic "characteristic not found"
    // — and so we can SEE what the device really exposes. Two common causes of
    // a miss: (a) it's the knob, not the gauge; (b) the gauge's BLE comes up
    // ~2 s after boot, so a connect during that window discovers nothing.
    let services: Array<{ uuid?: string }> = [];
    try { services = await CapBle.getServices(this.deviceId); } catch { /* unsupported → skip */ }
    if (services.length &&
        !services.some(s => s.uuid?.toLowerCase() === GAUGE_SVC.toLowerCase())) {
      const seen = services.map(s => s.uuid).filter(Boolean).join(', ') || 'none';
      throw new Error(
        `Gauge config service (7e1c0101) not found on this device. ` +
        `Discovered: ${seen}. If this is the AXIS Gauge, power-cycle it ` +
        `(its BLE starts ~2 s after boot); otherwise it's the knob, not the gauge.`);
    }
    const v   = await CapBle.read(this.deviceId, GAUGE_SVC, CFG_CHAR);
    const raw = JSON.parse(dec.decode(v));
    // arc[] + global colours arrive HEX-PACKED (4 chars/entry, big-endian) —
    // the firmware packs them so the config JSON stays under the 512-byte BLE
    // ATT cap with 30 channels. hexAt(str, i, default) decodes group i.
    const hexAt = (s: any, i: number, d: number): number => {
      const g = typeof s === 'string' ? s.substr(i * 4, 4) : '';
      return g.length === 4 ? (parseInt(g, 16) || 0) : d;
    };
    const G = GAUGE_GLOBAL_DEFAULTS;
    // Fixed-length numeric array from a raw value, padded with `d`.
    const arr = (x: any, n: number, d: number): number[] => {
      const a = Array.isArray(x) ? x.map(Number) : [];
      return Array.from({ length: n }, (_, i) => (isFinite(a[i]) ? a[i] : d));
    };
    // pageSlots arrives flat (row-major, NPAGES*SLOTS) → [page][slot].
    const flatSlots = Array.isArray(raw.pageSlots) ? raw.pageSlots.map(Number) : [];
    const pageSlots: number[][] = [];
    for (let p = 0; p < GAUGE_NPAGES; p++) {
      const row: number[] = [];
      for (let s = 0; s < GAUGE_SLOTS; s++) {
        const k = p * GAUGE_SLOTS + s;
        row.push(Number.isFinite(flatSlots[k]) ? flatSlots[k] : -1);
      }
      pageSlots.push(row);
    }
    return {
      redline:  Number(raw.redline)  || 7000,
      shiftRpm: Number(raw.shiftRpm) || 6200,
      peakHold: Number(raw.peakHold) ? 1 : 0,
      warn:     Array.isArray(raw.warn)
        ? raw.warn.map((x: any) => (Number(x) < 0 ? GAUGE_NOWARN : Number(x)))   // firmware sends -1 for NOWARN
        : [],
      arc:      GAUGE_CHANNELS.map((_, i) => hexAt(raw.arc, i, GAUGE_ARC_DEFAULT)),
      globals: {
        value:  hexAt(raw.cols, 0, G.value),
        label:  hexAt(raw.cols, 1, G.label),
        frame:  hexAt(raw.cols, 2, G.frame),
        unit:   hexAt(raw.cols, 3, G.unit),
        warn:   hexAt(raw.cols, 4, G.warn),
        accent: hexAt(raw.cols, 5, G.accent),
      },
      pageLayout: arr(raw.pageLayout, GAUGE_NPAGES, 0),
      pageSlots,
      // per-arc-position colour override — hex-packed row-major (NPAGES*SLOTS × 4);
      // 0 = inherit the channel's arc colour. Absent (old fw) → all 0 (inherit).
      slotColor: Array.from({ length: GAUGE_NPAGES }, (_, p) =>
        Array.from({ length: GAUGE_SLOTS }, (_, s) => hexAt(raw.slotCol, p * GAUGE_SLOTS + s, 0))),
      // per-channel availability from firmware — a BITMASK (bit i = channel i is
      // reported by the car). Absent (old fw) → treat all as available.
      avail: typeof raw.avail === 'number'
        ? GAUGE_CHANNELS.map((_, i) => ((raw.avail as number) & (1 << i)) !== 0)
        : GAUGE_CHANNELS.map(() => true),
    };
  }

  /** Write the full config back. The firmware overlays only present keys; we
   *  send everything (warn[30] + hex-packed arc[30] + 6 globals + layout) so
   *  nothing is lost. arc + globals are HEX-PACKED (4 chars/entry, big-endian)
   *  to match the firmware and keep the write under the 512-byte BLE ATT limit.
   *  pageSlots is flattened row-major. Persists to gauge NVS. */
  async setConfig(c: GaugeConfig): Promise<void> {
    const hex4 = (n: number) => ((n & 0xffff) >>> 0).toString(16).padStart(4, '0');
    const payload = {
      redline: c.redline, shiftRpm: c.shiftRpm, peakHold: c.peakHold,
      warn: c.warn.map(x => (x >= GAUGE_NOWARN ? -1 : x)),   // NOWARN → -1 (compact)
      arc: c.arc.map(hex4).join(''),                          // 30 × 4 hex chars
      cols: [c.globals.value, c.globals.label, c.globals.frame,
             c.globals.unit,  c.globals.warn,  c.globals.accent].map(hex4).join(''),
      pageLayout: c.pageLayout,
      pageSlots: c.pageSlots.flat(),
      slotCol: (c.slotColor ?? []).flat().map(hex4).join(''),   // per-arc colour override, row-major hex
    };
    const bytes = enc.encode(JSON.stringify(payload));
    await CapBle.write(this.deviceId, GAUGE_SVC, CFG_CHAR, new DataView(bytes.buffer));
  }

  /** Clear held peak markers (matches the gauge's BLE cmd char). */
  async resetPeaks(): Promise<void> {
    const bytes = enc.encode('resetPeaks');
    await CapBle.write(this.deviceId, GAUGE_SVC, CMD_CHAR, new DataView(bytes.buffer));
  }

  // ===================================================================
  //  FOUNDER diagnostics service (7e1c020x) — DTC / accel / logs / bus
  //  capture. Same physical link as the config service above; the gauge
  //  exposes both, so these just read/write a different service UUID on
  //  this.deviceId. Ported from the monitor's founderGaugeCfg.ts.
  // ===================================================================

  /** Read the car's live stored trouble codes (char 7e1c020a). Empty (count 0)
   *  = the car reported none; a short read = older fw without the DTC char. */
  async readDtcCodes(): Promise<DtcSnapshot> {
    const v = await CapBle.read(this.deviceId, FND_SVC, DTC_CHAR);
    if (v.byteLength < 2) return { count: 0, mil: false, codes: [] };
    const count = v.getUint8(0);
    const mil = v.getUint8(1) === 1;
    const codes: string[] = [];
    for (let i = 0; i < count && 2 + i * 2 + 1 < v.byteLength; i++) {
      codes.push(rawToDtc(v.getUint8(2 + i * 2), v.getUint8(3 + i * 2)));
    }
    const condOff = 2 + count * 2;
    let conditions: DtcSnapshot['conditions'];
    if (v.byteLength >= condOff + 5) {
      conditions = {
        rpm: v.getUint16(condOff, true),
        coolant: v.getInt16(condOff + 2, true),
        load: v.getUint8(condOff + 4),
      };
    }
    return { count, mil, codes, conditions };
  }

  /** Clear stored codes + check-engine light (char 7e1c020a WRITE[0x01]). The
   *  gauge relays it to the node (Mode-04). Poll readDtcCodes() a few seconds
   *  later to confirm. */
  async clearDtcCodes(): Promise<void> {
    const b = new Uint8Array([0x01]);
    await CapBle.write(this.deviceId, FND_SVC, DTC_CHAR, new DataView(b.buffer));
  }

  /** Read saved best acceleration times (char 7e1c020b). Raw ui::AccelTimes:
   *  [version, pad, speedMs[3] u32 LE, distMs[3] u32 LE, distTrap[3] u16 LE].
   *  0xFFFFFFFF ms = no run yet. */
  async readAccelTimes(): Promise<AccelTimes> {
    const v = await CapBle.read(this.deviceId, FND_SVC, ACCEL_CHAR);
    const NONE = 0xffffffff;
    const speed: AccelTimeEntry[] = [];
    const dist: AccelTimeEntry[] = [];
    if (v.byteLength >= 32) {
      for (let i = 0; i < 3; i++) {
        const ms = v.getUint32(2 + i * 4, true);
        speed.push({ ms: ms === NONE ? null : ms });
      }
      for (let i = 0; i < 3; i++) {
        const ms = v.getUint32(14 + i * 4, true);
        const trap = v.getUint16(26 + i * 2, true);
        dist.push({ ms: ms === NONE ? null : ms, trapKmh: trap || undefined });
      }
    }
    return { speed, dist };
  }

  // ---- Node log (char 7e1c020c) — the CAN node's captured diagnostic text ----
  private nlogWrite(b: Uint8Array) { return CapBle.write(this.deviceId, FND_SVC, NLOG_CHAR, new DataView(b.buffer)); }
  private nlogRead() { return CapBle.read(this.deviceId, FND_SVC, NLOG_CHAR); }

  async nodeLogInfo(): Promise<number> {
    await this.nlogWrite(new Uint8Array([0x00]));
    const v = await this.nlogRead();
    return v.byteLength >= 4 ? v.getUint32(0, true) : 0;
  }
  async pullNodeLog(onProgress?: (pct: number) => void): Promise<string> {
    const size = await this.nodeLogInfo();
    if (size === 0) return '';
    const out = new Uint8Array(size);
    let off = 0, stall = 0;
    while (off < size) {
      const req = new Uint8Array(5); req[0] = 0x01;
      new DataView(req.buffer).setUint32(1, off, true);
      await this.nlogWrite(req);
      const chunk = await this.nlogRead();
      const n = chunk.byteLength;
      if (n === 0) { if (++stall > 3) break; continue; }
      stall = 0;
      out.set(new Uint8Array(chunk.buffer, chunk.byteOffset, n), off);
      off += n;
      onProgress?.(Math.min(100, Math.round((off / size) * 100)));
    }
    return dec.decode(out.subarray(0, off));
  }
  async eraseNodeLog(): Promise<boolean> {
    await this.nlogWrite(new Uint8Array([0x02]));
    const v = await this.nlogRead();
    return v.byteLength > 0 && v.getUint8(0) === 1;
  }

  // ---- Drive log (char 7e1c0207) — the on-gauge recorder file ----
  private logWrite(b: Uint8Array) { return CapBle.write(this.deviceId, FND_SVC, LOG_CHAR, new DataView(b.buffer)); }
  private logRead() { return CapBle.read(this.deviceId, FND_SVC, LOG_CHAR); }

  async logInfo(): Promise<{ size: number; count: number; ver: number; sampleBytes: number }> {
    await this.logWrite(new Uint8Array([0x00]));
    const v = await this.logRead();
    if (v.byteLength < 10) throw new Error(`short log info: ${v.byteLength}B`);
    return { size: v.getUint32(0, true), count: v.getUint32(4, true), ver: v.getUint8(8), sampleBytes: v.getUint8(9) };
  }
  async pullLog(onProgress?: (pct: number) => void): Promise<Uint8Array> {
    const info = await this.logInfo();
    if (info.size <= 20 || info.count === 0)
      throw new Error('No drive recorded yet — tap RECORD on the gauge, take a drive, then pull the log.');
    const out = new Uint8Array(info.size);
    let off = 0, stall = 0;
    while (off < info.size) {
      const req = new Uint8Array(5); req[0] = 0x01;
      new DataView(req.buffer).setUint32(1, off, true);
      await this.logWrite(req);
      const chunk = await this.logRead();
      const n = chunk.byteLength;
      if (n === 0) { if (++stall > 3) break; continue; }
      stall = 0;
      out.set(new Uint8Array(chunk.buffer, chunk.byteOffset, n), off);
      off += n;
      onProgress?.(Math.min(100, Math.round((off / info.size) * 100)));
    }
    return out.subarray(0, off);
  }
  async eraseLog(): Promise<boolean> {
    await this.logWrite(new Uint8Array([0x02]));
    const v = await this.logRead();
    return v.byteLength > 0 && v.getUint8(0) === 1;
  }

  // ---- Raw CAN capture (char 7e1c020d) — bus RE → SavvyCAN CSV ----
  private canWrite(b: Uint8Array) { return CapBle.write(this.deviceId, FND_SVC, CAN_CHAR, new DataView(b.buffer)); }
  private canRead() { return CapBle.read(this.deviceId, FND_SVC, CAN_CHAR); }

  async canLogInfo(): Promise<{ size: number; count: number; recBytes: number; capturing: boolean }> {
    await this.canWrite(new Uint8Array([0x00]));
    const v = await this.canRead();
    if (v.byteLength < 10) return { size: 0, count: 0, recBytes: 20, capturing: false };
    return { size: v.getUint32(0, true), count: v.getUint32(4, true), recBytes: v.getUint8(8), capturing: v.getUint8(9) === 1 };
  }
  async pullCanLog(onProgress?: (pct: number) => void): Promise<Uint8Array> {
    const info = await this.canLogInfo();
    if (info.size <= 16) throw new Error('No CAN capture yet — start BUS LOG, drive, then pull.');
    const out = new Uint8Array(info.size);
    let off = 0, stall = 0;
    while (off < info.size) {
      const req = new Uint8Array(5); req[0] = 0x01;
      new DataView(req.buffer).setUint32(1, off, true);
      await this.canWrite(req);
      const chunk = await this.canRead();
      const n = chunk.byteLength;
      if (n === 0) { if (++stall > 3) break; continue; }
      stall = 0;
      out.set(new Uint8Array(chunk.buffer, chunk.byteOffset, n), off);
      off += n;
      onProgress?.(Math.min(100, Math.round((off / info.size) * 100)));
    }
    return out.subarray(0, off);
  }
  async eraseCanLog(): Promise<boolean> {
    await this.canWrite(new Uint8Array([0x02]));
    const v = await this.canRead();
    return v.byteLength > 0 && v.getUint8(0) === 1;
  }
  /** Start/stop capture remotely (gauge relays 0xC3 to the node). */
  async setCanCapture(on: boolean): Promise<void> {
    await this.canWrite(new Uint8Array([on ? 0x03 : 0x04]));
  }
}
