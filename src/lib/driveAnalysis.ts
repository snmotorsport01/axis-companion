// =====================================================================
//  driveAnalysis.ts — turn a parsed drive log (driveLog.ts) into the
//  series the Analysis page charts + a virtual-dyno pull curve, plus a
//  synthetic demo log so the feature works with no gauge (sim / App
//  Store screenshots), mirroring the app's DEMO-mode convention.
//
//  Virtual dyno = the same physics the firmware uses (VirtualDyno.h):
//    P_wheel = F·v,  F = m·a + ½·ρ·Cd·A·v² + Crr·m·g,  P_crank = P/eff,
//    torque_crank = P_crank / ω_engine.  a = dv/dt from the speed trace.
//  No bus torque signal needed → works on any car. Purely local.
// =====================================================================
import type { DriveLog, DriveSample } from './driveLog';

// Physics constants (match VirtualDyno.h defaults). CdA/Crr are per-car-ish;
// good enough for a repeatable pull curve. massKg comes from the drivetrain cfg.
const RHO = 1.225;    // air density kg/m³
const CDA = 0.70;     // drag area Cd·A (m²) — typical sedan/crossover
const CRR = 0.015;    // rolling resistance coefficient
const EFF = 0.85;     // drivetrain efficiency (wheel→crank)
const G   = 9.81;
const HP_PER_W = 1 / 745.7;

export interface XY { x: number; y: number; }
export interface DynoPoint { rpm: number; hp: number; nm: number; }

export interface Analysis {
  speedTime: XY[];      // x = s, y = km/h
  distTime: XY[];       // x = s, y = km (cumulative)
  dyno: DynoPoint[];    // rpm-binned pull envelope
  stats: {
    durationS: number;
    distanceKm: number;
    peakKmh: number;
    peakRpm: number;
    peakHp: number;
    peakNm: number;
    peakHpRpm: number;
    peakNmRpm: number;
    zeroToHundredS: number | null;
  };
}

/** Central-difference acceleration (m/s²) at sample i from the speed trace. */
function accelAt(s: DriveSample[], i: number): number {
  const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
  const dt = b.tSec - a.tSec;
  if (dt <= 0) return 0;
  return ((b.speedKmh - a.speedKmh) / 3.6) / dt;
}

/** 0→100 km/h time: first crossing of 100 measured from the last time at/near 0
 *  before it (a standing pull). null if the run never does a clean 0→100. */
function zeroToHundred(s: DriveSample[]): number | null {
  let launchT: number | null = null;
  for (let i = 0; i < s.length; i++) {
    if (s[i].speedKmh <= 2) launchT = s[i].tSec;          // last (re)start point
    if (s[i].speedKmh >= 100 && launchT != null) {
      // linear-interpolate the exact 100 crossing between i-1 and i
      const p = s[i - 1] ?? s[i];
      const dv = s[i].speedKmh - p.speedKmh;
      const frac = dv > 0 ? (100 - p.speedKmh) / dv : 0;
      const tCross = p.tSec + frac * (s[i].tSec - p.tSec);
      return +(tCross - launchT).toFixed(2);
    }
  }
  return null;
}

export function analyseDrive(log: DriveLog, massKg = 1600): Analysis {
  const s = log.samples;
  const speedTime: XY[] = [];
  const distTime: XY[] = [];
  const dynoRaw: DynoPoint[] = [];
  let distKm = 0;
  let peakKmh = 0, peakRpm = 0;

  for (let i = 0; i < s.length; i++) {
    const p = s[i];
    speedTime.push({ x: p.tSec, y: p.speedKmh });
    if (i > 0) {
      const dt = p.tSec - s[i - 1].tSec;
      const vAvg = (p.speedKmh + s[i - 1].speedKmh) / 2;   // km/h
      distKm += (vAvg / 3600) * dt;                        // km
    }
    distTime.push({ x: p.tSec, y: distKm });
    peakKmh = Math.max(peakKmh, p.speedKmh);
    peakRpm = Math.max(peakRpm, p.rpm);

    // dyno point — only while pulling hard (WOT-ish + accelerating), where the
    // physics estimate is meaningful.
    const v = p.speedKmh / 3.6;
    const a = accelAt(s, i);
    // rpm > 2200 so the torque = P/ω estimate isn't inflated by low-rpm / gear-
    // change points (ω→small); sanity-cap both so a bad sample can't spike a peak.
    if (p.throttlePct >= 70 && a > 0.15 && p.rpm > 2200 && v > 2) {
      const F = massKg * a + 0.5 * RHO * CDA * v * v + CRR * massKg * G;
      const pCrankW = (F * v) / EFF;
      const hp = pCrankW * HP_PER_W;
      const omega = (p.rpm * 2 * Math.PI) / 60;
      const nm = omega > 0 ? pCrankW / omega : 0;
      if (hp > 0 && hp < 1500 && nm > 0 && nm < 900) dynoRaw.push({ rpm: p.rpm, hp, nm });
    }
  }

  // Bin the pull points by 250-rpm buckets, take the MAX (the envelope) per bin.
  const BIN = 250;
  const bins = new Map<number, DynoPoint>();
  for (const d of dynoRaw) {
    const k = Math.round(d.rpm / BIN) * BIN;
    const cur = bins.get(k);
    if (!cur || d.hp > cur.hp) bins.set(k, { rpm: k, hp: d.hp, nm: d.nm });
  }
  const dyno = [...bins.values()].sort((x, y) => x.rpm - y.rpm);

  let peakHp = 0, peakNm = 0, peakHpRpm = 0, peakNmRpm = 0;
  for (const d of dyno) {
    if (d.hp > peakHp) { peakHp = d.hp; peakHpRpm = d.rpm; }
    if (d.nm > peakNm) { peakNm = d.nm; peakNmRpm = d.rpm; }
  }

  return {
    speedTime, distTime, dyno,
    stats: {
      durationS: s.length ? s[s.length - 1].tSec : 0,
      distanceKm: distKm,
      peakKmh, peakRpm,
      peakHp: Math.round(peakHp), peakNm: Math.round(peakNm),
      peakHpRpm, peakNmRpm,
      zeroToHundredS: zeroToHundred(s),
    },
  };
}

/** Synthesize a plausible drive log: idle → a WOT pull to ~180 km/h → cruise.
 *  Deterministic (no RNG — reproducible demo). ~40 s @ 20 Hz. */
export function demoDriveLog(): DriveLog {
  const samples: DriveSample[] = [];
  const HZ = 20, DUR = 40;
  let dist = 0;
  for (let n = 0; n <= DUR * HZ; n++) {
    const t = n / HZ;
    // speed profile: 0→180 pull over ~14s (ease), then hold/cruise
    let kmh: number;
    if (t < 1) kmh = 0;
    else if (t < 15) { const u = (t - 1) / 14; kmh = 180 * (1 - Math.pow(1 - u, 2.1)); }
    else if (t < 24) kmh = 180 - (t - 15) * 3;         // ease off
    else kmh = 150 + 8 * Math.sin((t - 24) * 0.6);      // cruise wobble
    const v = kmh / 3.6;
    const prev = samples[samples.length - 1];
    const dt = prev ? t - prev.tSec : 0;
    dist += v * dt;
    // gear/rpm model: 6 ratios, rpm sweeps 1500→6500 within a gear
    const gearBands = [30, 60, 95, 130, 165, 999];
    let g = gearBands.findIndex(b => kmh <= b); if (g < 0) g = 5;
    const lo = g === 0 ? 0 : gearBands[g - 1];
    const span = Math.max(1, gearBands[g] - lo);
    const rpm = kmh < 2 ? 850 : Math.round(1600 + ((kmh - lo) / span) * 4800);
    const wot = t >= 1 && t < 15;
    samples.push({
      tSec: +t.toFixed(2),
      rpm,
      speedKmh: +kmh.toFixed(1),
      coolantC: 88 + Math.min(6, t * 0.15),
      boostBar: wot ? +(0.3 + 0.6 * Math.sin(Math.min(Math.PI, (t - 1) / 14 * Math.PI))).toFixed(2) : 0,
      battV: 14.1,
      afrLambda: wot ? 0.88 : 1.0,
      catC: 620,
      throttlePct: wot ? 100 : (t < 24 ? 20 : 35),
      loadPct: wot ? 95 : 30,
      gear: String(Math.min(6, g + 1)),
      hybSocPct: 74,
      fuelPct: 62,
    });
  }
  return {
    header: { magic: 'AXL1', version: 1, sampleBytes: 24, startedAtMs: 0, sampleCount: samples.length },
    samples,
  };
}
