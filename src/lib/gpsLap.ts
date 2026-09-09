// Phone-GPS lap timer + track recorder (Strava-style).
//
// The onboard gauge GPS was removed (it fought BLE + ESP-NOW on the shared 2.4 GHz
// radio and couldn't hold a fix under the weak passive antenna). GPS work now runs
// on the PHONE — a far better antenna with no coexistence problem. This engine:
//
//   • records every fix as a trackpoint (route + speed, for the map + GPX export),
//   • auto-cuts laps by START/FINISH LINE CROSSING (ported from the firmware's
//     GpsLap.cpp): the owner marks the line once (position + heading), and each
//     time the car drives back across that line a lap is timed,
//   • emits an onLap callback so the app can push a lap/split to the gauge over BLE
//     (MonitorBleClient.shortcut(0)) — the gauge's ui::LapTimer shows it live.
//
// All data stays on the device; lat/lon leave only when the owner exports a GPX.

const M_PER_DEG = 111320;          // metres per degree latitude (≈ constant)
const GATE_HALF_W_M = 20;          // start/finish line half-width (crossing must be within ±20 m of the mark)
const MIN_LAP_MS = 8000;           // ignore a re-cross sooner than this (jitter / sitting on the line)
const MOVE_KMH = 8;                // "moving" threshold used to latch a heading from travel direction

export interface TrackPoint {
  t: number;      // epoch ms
  lat: number;
  lon: number;
  spd: number;    // km/h (0 if unknown)
}

export interface Lap {
  n: number;      // 1-based lap number
  ms: number;     // lap duration
  startT: number; // epoch ms of the crossing that started this lap
  endT: number;   // epoch ms of the crossing that ended it
}

interface Gate {
  lat: number;
  lon: number;
  hx: number;     // heading unit vector (east component)
  hy: number;     // heading unit vector (north component)
  pending: boolean; // true = position set but heading not yet latched (set while stationary)
}

/** Local east/north metres of (lat,lon) relative to an origin. */
function toMetres(lat: number, lon: number, oLat: number, oLon: number): { x: number; y: number } {
  return {
    x: (lon - oLon) * M_PER_DEG * Math.cos((oLat * Math.PI) / 180),
    y: (lat - oLat) * M_PER_DEG,
  };
}

/** Great-circle distance between two fixes, metres. */
export function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export class LapEngine {
  points: TrackPoint[] = [];
  laps: Lap[] = [];
  distM = 0;                 // cumulative recorded distance (metres)
  topKmh = 0;

  private gate: Gate | null = null;
  private prev: TrackPoint | null = null;
  private lapStartT = 0;     // crossing time that started the current (in-progress) lap; 0 = not yet on track
  private lapNo = 0;

  /** New lap completed → update the UI (toast, lap list). */
  onLap?: (lap: Lap) => void;
  /** EVERY forward crossing of the line, including the first (start) pass. Wire this
   *  to MonitorBleClient.shortcut(0) so the gauge's ui::LapTimer starts on the first
   *  cross and splits on each lap — its chip then shows the live lap time in-car. */
  onCross?: () => void;

  get armed(): boolean { return this.gate != null; }
  get lapCount(): number { return this.laps.length; }
  get onTrack(): boolean { return this.lapStartT > 0; }

  /** Best (fastest) completed lap ms, or 0 if none yet. */
  bestMs(): number {
    return this.laps.reduce((b, l) => (b === 0 || l.ms < b ? l.ms : b), 0);
  }
  lastMs(): number {
    return this.laps.length ? this.laps[this.laps.length - 1].ms : 0;
  }
  /** Live in-progress lap time. */
  curLapMs(nowMs: number): number {
    return this.lapStartT > 0 ? Math.max(0, nowMs - this.lapStartT) : 0;
  }

  /** Mark the START/FINISH line at the given point. `headingDeg` is the course over
   *  ground (0=N, 90=E) when known; pass null to latch it from the first moving fix
   *  (so the owner can set the line while stopped, then drive off). */
  setGate(lat: number, lon: number, headingDeg: number | null): void {
    if (headingDeg == null || Number.isNaN(headingDeg)) {
      this.gate = { lat, lon, hx: 0, hy: 1, pending: true };
    } else {
      const r = (headingDeg * Math.PI) / 180;
      this.gate = { lat, lon, hx: Math.sin(r), hy: Math.cos(r), pending: false };
    }
    // Re-arming resets the running lap; completed laps stay in the list.
    this.lapStartT = 0;
    this.lapNo = this.laps.length;
  }

  clearGate(): void { this.gate = null; this.lapStartT = 0; }

  /** Feed a fix. Records the trackpoint and, if a gate is armed, detects a crossing.
   *  `headingDeg`/`spdKmh` come from the Geolocation coords (may be null). */
  feed(lat: number, lon: number, spdKmh: number, tMs: number, headingDeg: number | null): void {
    const cur: TrackPoint = { t: tMs, lat, lon, spd: spdKmh || 0 };
    if (this.points.length) {
      const p = this.points[this.points.length - 1];
      this.distM += haversine(p.lat, p.lon, lat, lon);
    }
    this.points.push(cur);
    if (cur.spd > this.topKmh) this.topKmh = cur.spd;

    if (this.gate) {
      // Latch a heading from travel direction if the gate was set while stationary.
      if (this.gate.pending) {
        if (spdKmh >= MOVE_KMH && headingDeg != null && !Number.isNaN(headingDeg)) {
          const r = (headingDeg * Math.PI) / 180;
          this.gate.hx = Math.sin(r); this.gate.hy = Math.cos(r); this.gate.pending = false;
        } else if (this.prev && spdKmh >= MOVE_KMH) {
          // No course from the OS — derive heading from the last movement vector.
          const m = toMetres(lat, lon, this.prev.lat, this.prev.lon);
          const len = Math.hypot(m.x, m.y);
          if (len > 1) { this.gate.hx = m.x / len; this.gate.hy = m.y / len; this.gate.pending = false; }
        }
      }
      if (!this.gate.pending && this.prev) this.testCrossing(this.prev, cur);
    }
    this.prev = cur;
  }

  /** Test the segment prev→cur against the gate plane (perpendicular to heading,
   *  through the mark). Forward crossing = signed distance goes negative→positive. */
  private testCrossing(a: TrackPoint, b: TrackPoint): void {
    const g = this.gate!;
    const ma = toMetres(a.lat, a.lon, g.lat, g.lon);
    const mb = toMetres(b.lat, b.lon, g.lat, g.lon);
    const s0 = ma.x * g.hx + ma.y * g.hy;   // along-heading signed distance
    const s1 = mb.x * g.hx + mb.y * g.hy;
    if (!(s0 < 0 && s1 >= 0)) return;       // not a forward crossing this segment
    const f = s0 === s1 ? 0 : -s0 / (s1 - s0);
    // Lateral offset at the crossing point — must be within the line's half-width.
    const lx = ma.x + f * (mb.x - ma.x);
    const ly = ma.y + f * (mb.y - ma.y);
    const lateral = lx * -g.hy + ly * g.hx;
    if (Math.abs(lateral) > GATE_HALF_W_M) return;
    const crossT = a.t + f * (b.t - a.t);

    if (this.lapStartT === 0) {
      this.lapStartT = crossT;              // first pass over the line — lap timing begins
      this.onCross?.();                     // gauge: start its lap stopwatch
      return;
    }
    if (crossT - this.lapStartT < MIN_LAP_MS) return;  // debounce a double-trip
    this.lapNo += 1;
    const lap: Lap = { n: this.lapNo, ms: crossT - this.lapStartT, startT: this.lapStartT, endT: crossT };
    this.laps.push(lap);
    this.lapStartT = crossT;                // the finish line is also the next start line
    this.onCross?.();                       // gauge: split (new lap)
    this.onLap?.(lap);
  }

  reset(): void {
    this.points = []; this.laps = []; this.distM = 0; this.topKmh = 0;
    this.gate = null; this.prev = null; this.lapStartT = 0; this.lapNo = 0;
  }
}

/** mm:ss.d */
export function fmtLap(ms: number): string {
  if (!ms) return '--:--';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
}

/** Serialise the recorded track to a GPX 1.1 <trk> (importable to Strava/etc.).
 *  One <trkseg>; each point carries time + speed. No app/device identifiers. */
export function toGpx(points: TrackPoint[], name: string): string {
  const iso = (t: number) => new Date(t).toISOString();
  const head =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<gpx version="1.1" creator="SN AXIS" xmlns="http://www.topografix.com/GPX/1/1">\n' +
    `  <trk><name>${name.replace(/[<&>]/g, '')}</name><trkseg>\n`;
  const body = points
    .map(
      (p) =>
        `    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">` +
        `<time>${iso(p.t)}</time><extensions><speed>${(p.spd / 3.6).toFixed(2)}</speed></extensions></trkpt>`,
    )
    .join('\n');
  return head + body + '\n  </trkseg></trk>\n</gpx>\n';
}
