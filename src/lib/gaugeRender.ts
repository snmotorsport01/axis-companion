// =====================================================================
//  gaugeRender.ts — a FAITHFUL canvas render of a gauge page, matching the
//  real AMOLED gauge (axis_can_monitor ScreenGauge / axis_gauge sim). Used by
//  GaugePreview.svelte in BOTH apps so "preview in the app" looks like the
//  actual device. No live data — draws a representative value so the style +
//  colours + layout read exactly as they will on the glass.
//
//  Coordinate system = the device's 466×466 (CX=CY=233); the component scales
//  the canvas down. Ported from axis_gauge/sim/gauge.html.
// =====================================================================
import { channelDef } from './monitorCfg';

export interface ChanMeta { label: string; unit: string; min: number; max: number; }
export interface PagePreview {
  layout: number;                 // 0 HERO · 1 BARS · 2 NEEDLE · 3 TICKS
  ch: number[];                   // channel ids per slot
  arc: string; col2: string; text: string;   // resolved css colours
  slot?: string[];                // v12: PER-VALUE css colour, one per slot; undefined/'' = fall back to `arc`
  slotLimit?: number[];           // v14: arc full-scale MAX per value/slot (native units); 0 = channel default
  peak?: number;                  // primary redline threshold (native units); 0 = off
}
export type ChanLookup = (id: number) => ChanMeta | null;
// Per-value colour pick (mirrors firmware slotColour): page.slot[i] or the `arc` fallback.
const slotCol = (page: PagePreview, i: number, fb?: string): string => (page.slot && page.slot[i]) || fb || page.arc;

// Shared channel → preview-meta lookup (short label, unit, range). Used by every
// GaugePreview so the editor and the Store render channels identically.
// ⚠️ Ch.NONE (0) HAS a CHANNELS entry — '— empty —', range 0..1 — so channelDef
// happily returns an object for it and every `if (m)` guard downstream sails
// straight through. That's why empty bars were drawing "0.62" with a 62%-full
// track: 0.62 of the range 0..1. An empty slot is not a channel; say so here,
// once, rather than making every caller special-case id 0.
export const chanMeta: ChanLookup = (id) => {
  if (!id) return null;                       // Ch.NONE — empty slot
  const d = channelDef(id);
  return d ? { label: d.short ?? d.label, unit: d.unit, min: d.min, max: d.max } : null;
};

const SZ = 466, CX = 233, CY = 233, D = Math.PI / 180;
const MUT = '#6a6f78', LBL = '#9aa0a8', TRACK = '#181a1e';
// ---- TYPE, SIZED FROM THE DEVICE ------------------------------------------
// The glass draws with Adafruit-GFX faces compiled from this very OTF
// (axis_can_monitor/Psionic.h, via fontconvert). So the preview names the
// DEVICE FACE and converts — it never carries a px number of its own, which is
// how the two drifted apart in the first place.
//
// ⚠️ GFX "pt" is NOT px. psionic13pt7b's digits stand 20px tall on the glass;
//    the old code wrote `20px` and got 14px. Same number, different unit.
//
// cap = digit '0' height, adv = digit '0' xAdvance. BOTH read out of Psionic.h's
// glyph table — not guessed, not derived.
const FACE = {
  p6:  { cap:  8, adv: 11 },
  p8:  { cap: 11, adv: 15 },
  p10: { cap: 14, adv: 18 },
  p13: { cap: 20, adv: 26 },
  p20: { cap: 27, adv: 36 },
  p48: { cap: 66, adv: 86 },
} as const;
const EM_PER_CAP = 1 / 0.70;   // Psionic's cap is 0.70 em (canvas-measured)
const OTF_ADV    = 0.978;      // the live OTF's digit advance / em (canvas-measured)

// ⚠️ WHY letterSpacing: matching cap height alone is NOT enough. The device's
// faces are BITMAPS that fontconvert rasterised and rounded to whole pixels, so
// their advance is 4–8% tighter than the OTF's at the same cap height (ratio
// 0.900–0.963 vs the OTF's 0.978, and it varies per face). Left uncorrected the
// preview runs ~7% wide: "4960" measured 368.9px and overflowed HERO's 366px
// clear — while on the glass it is 4×86 = 344px and fits with 22px to spare.
// A preview that invents an overflow the device won't have is worse than no
// preview, so each face carries its own correction.
// ⚠️ NO weight argument either: Psionic.h is a SINGLE face and the panel cannot
// embolden. Asking the browser for 700 gets synthetic bold the glass can't show.
function setDevFont(ctx: CanvasRenderingContext2D, face: keyof typeof FACE, mul = 1): void {
  const f = FACE[face];
  const em = f.cap * mul * EM_PER_CAP;
  ctx.font = `${em.toFixed(1)}px Psionic, Orbitron, 'Arial Narrow', sans-serif`;
  // Unsupported on older WebKit — it degrades to the ~7% over-wide render, never breaks.
  ctx.letterSpacing = `${(f.adv * mul - em * OTF_ADV).toFixed(2)}px`;
}

// ⚠️ Canvas does NOT re-render when a webfont finishes loading. Unlike DOM text
// it has no font-display behaviour: whatever is available at fillText() time is
// baked in, and it stays wrong. So the font must be resolved BEFORE the first
// draw, and the caller must redraw once this settles.
let fontReady: Promise<unknown> | null = null;
export function ensureGaugeFont(): Promise<unknown> {
  if (fontReady) return fontReady;
  const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
  fontReady = fonts?.load
    ? Promise.all([fonts.load('400 82px Psionic'), fonts.load('700 82px Psionic')])
        .then(() => fonts.ready)
        .catch(() => undefined)          // never block the preview on a font miss
    : Promise.resolve();
  return fontReady;
}
// ⚠️ SN monogram for the CONCENTRIC face — the ONLY preview layout that draws
// the centre brand mark (like the glass). public/sn-monogram.png is rgb(224,224,224)
// on transparent — the exact firmware LOGO_FG (greyWB565(224,224,224)) — so it blits
// straight onto the black disc. Like the webfont, canvas won't auto-redraw when the
// image decodes, so GaugePreview awaits ensureMonogram() and redraws once it lands.
let monoImg: HTMLImageElement | null = null;
let monoReady: Promise<unknown> | null = null;
export function ensureMonogram(): Promise<unknown> {
  if (monoReady) return monoReady;
  if (typeof Image === 'undefined') return (monoReady = Promise.resolve());
  const img = new Image();
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  monoReady = new Promise((res) => {
    img.onload  = () => { monoImg = img; res(undefined); };
    img.onerror = () => res(undefined);          // never block the preview on a missing asset
    img.src = base + 'sn-monogram.png';
  });
  return monoReady;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function dim(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * t)},${Math.round(((n >> 8) & 255) * t)},${Math.round((n & 255) * t)})`;
}
// A representative reading + its format, from the channel's range (0.62 of span).
// ★ center-zero (owner 2026-07-22): a SIGNED channel (min<0 — boost, motor torque,
// fuel trim) sits on a SYMMETRIC ±A scale so 0 lands dead-centre (frac 0.5). The
// fill still runs from the sweep START to the value (only the SCALE is expanded) —
// a negative value just reads short, below the centre 0-mark. Unipolar = linear.
// Display-unit selection (GaugeCfg.units, indexed by Uc: NONE0 SPEED1 TEMP2 PRESS3
// DIST4 ECON5 POWER6 TORQUE7 FLOW8). Set from the shell so the PREVIEW reflects the
// user's Metric/Imperial choice exactly like the gauge does. Null = native.
let g_unitSel: number[] | null = null;
export function setPreviewUnits(u: number[] | null) { g_unitSel = u; }

// LIVE values for the gauge-replay video (driveAnalysis / Analysis page). When
// set, sample() uses the real reading for a channel (keyed by its unique label)
// instead of the fixed 0.62-of-range preview value — so renderGaugePreview can be
// driven frame-by-frame from a recorded drive log. null → back to static preview.
let g_liveByLabel: Map<string, number> | null = null;
export function setPreviewLiveValues(m: Map<string, number> | null) { g_liveByLabel = m; }
// native-unit STRING → Uc class (only the convertible ones; everything else is verbatim,
// matching firmware channelUnitClass). Mirrors Units.h unitConvert/unitLabelFor exactly.
const UC_OF: Record<string, number> = { 'km/h':1, '°C':2, 'bar':3, 'km':4, 'km/L':5, 'hp':6, 'Nm':7, 'L/h':8 };
function convDisplay(unit: string, v: number): { v: number; unit: string; dec: number } | null {
  const uc = UC_OF[unit]; if (!uc || !g_unitSel) return null;
  const sel = g_unitSel[uc] | 0; if (!sel) return null;             // native default
  switch (uc) {
    case 1: return { v: v * 0.621371, unit: 'mph',  dec: 0 };
    case 2: return { v: v * 1.8 + 32,  unit: '°F',   dec: 0 };
    case 3: return sel === 2 ? { v: v * 100, unit: 'kPa', dec: 0 } : { v: v * 14.50377, unit: 'psi', dec: 1 };
    case 4: return { v: v * 0.621371, unit: 'mi',   dec: 0 };
    case 5: return sel === 2 ? { v: v > 0.01 ? 100 / v : 0, unit: 'L/100', dec: 1 } : { v: v * 2.352145, unit: 'mpg', dec: 1 };
    case 6: return sel === 2 ? { v: v * 1.013872, unit: 'PS', dec: 0 } : { v: v * 0.745699, unit: 'kW', dec: 0 };
    case 7: return { v: v * 0.737562, unit: 'lb-ft', dec: 0 };
    case 8: return { v: v * 0.264172, unit: 'gal/h', dec: 1 };
  }
  return null;
}
function sample(m: ChanMeta, limitMax = 0): { frac: number; text: string; unit: string; label: string } {
  const pos = 0.62;                                        // representative position in the linear range
  const live = g_liveByLabel?.get(m.label);                // gauge-replay video → real reading
  const v = live != null ? live : (m.min + pos * (m.max - m.min));
  const span = m.max - m.min;
  const d = convDisplay(m.unit, v);                        // apply the user's display unit (preview parity)
  const txt = d ? d.v.toFixed(d.dec)
                : span <= 3 ? v.toFixed(2) : span <= 25 ? v.toFixed(1) : String(Math.round(v / 10) * 10);
  // Arc full-scale MAX (PageCfg.limit): when set on a positive-range channel the needle
  // reaches the end at `limitMax` instead of the native vmax, so the SAME representative
  // reading sits further along a tighter scale — the preview mirrors the glass. limitMax
  // 0 (or ==vmax) reproduces the old fixed 0.62. Signed channels keep centre-zero.
  const posMax = (limitMax > 0 && m.min >= 0) ? limitMax : m.max;
  const frac = m.min < 0 ? clamp(0.5 + 0.5 * (v / Math.max(-m.min, m.max)), 0, 1)
                         : clamp((v - m.min) / (posMax - m.min), 0, 1);
  return { frac, text: txt, unit: d ? d.unit : m.unit, label: m.label.toUpperCase() };
}

export function renderGaugePreview(
  ctx: CanvasRenderingContext2D, page: PagePreview, chan: ChanLookup,
): void {
  ctx.clearRect(0, 0, SZ, SZ);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(CX, CY, 231, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#23272d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(CX, CY, 231, 0, 2 * Math.PI); ctx.stroke();
  ctx.textAlign = 'center';

  const { arc, col2, text } = page;
  const m0 = chan(page.ch[0]);
  const A0 = 135, A1 = 405;

  if (page.layout === 1) {                       // ---- BARS ----
    const ys = [150, 210, 270, 330];             // ScreenGauge renderBars
    for (let i = 0; i < 4; i++) {
      const m = chan(page.ch[i]); const y = ys[i];
      const bc = slotCol(page, i);                             // each bar its own colour (slot i)
      const R = 210, dy = y - CY, hw = Math.sqrt(Math.max(0, R * R - dy * dy));
      const bw = Math.max(40, Math.min(hw - 8, 150) * 2), bx = CX - bw / 2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';        // device: top_left
      // 8pt was an 11px cap — under the 14px read-at-a-glance floor, and this
      // label is what says which of 4 stacked bars you're looking at. 10pt is
      // 5px taller, so y-26 would land on the bar: moved to y-31.
      ctx.fillStyle = m ? LBL : '#4a4f57'; setDevFont(ctx, 'p10');
      ctx.fillText(m ? m.label.toUpperCase() : '—', bx, y - 31);
      ctx.fillStyle = TRACK; roundRect(ctx, bx, y - 7, bw, 14, 7);
      if (m) {
        const s = sample(m, page.slotLimit?.[i]);   // primary bar → owner full-scale
        ctx.save(); ctx.shadowColor = bc; ctx.shadowBlur = 8;
        ctx.fillStyle = bc; roundRect(ctx, bx, y - 7, bw * s.frac, 14, 7); ctx.restore();
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';  // device: bottom_right
        ctx.fillStyle = text; setDevFont(ctx, 'p13');
        ctx.fillText(s.text + (s.unit ? ' ' + s.unit : ''), bx + bw, y - 10);
      }
    }
    return;
  }

  if (page.layout === 2) {                       // ---- NEEDLE (chronograph) ----
    // Mirrors ScreenGauge renderNeedle after the 2026-07-16 redesign: the primary
    // owns the whole dial, the 2nd value gets its OWN sub-dial with its own pivot
    // and scale. Was two hands on one pivot, which forced both values onto a
    // single sweep and made neither readable against it.
    const m1 = chan(page.ch[1]);
    const SX = 233, SY = 338, SR = 86;           // sub-dial, measured off the mock
    ctx.strokeStyle = 'rgba(154,160,168,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, 196, 0, 2 * Math.PI); ctx.stroke();
    for (let q = 0; q < 4; q++) { const a = (q * 90) * D;      // main crosshair
      ctx.strokeStyle = 'rgba(154,160,168,.15)';
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 70, CY + Math.sin(a) * 70);
      ctx.lineTo(CX + Math.cos(a) * 231, CY + Math.sin(a) * 231); ctx.stroke(); }
    if (m1) {                                    // sub-dial frame + its crosshair
      ctx.strokeStyle = 'rgba(154,160,168,.45)';
      ctx.beginPath(); ctx.arc(SX, SY, SR, 0, 2 * Math.PI); ctx.stroke();
      for (let q = 0; q < 4; q++) { const a = (q * 90) * D;
        ctx.strokeStyle = 'rgba(154,160,168,.28)';
        ctx.beginPath(); ctx.moveTo(SX + Math.cos(a) * SR * 0.55, SY + Math.sin(a) * SR * 0.55);
        ctx.lineTo(SX + Math.cos(a) * SR, SY + Math.sin(a) * SR); ctx.stroke(); }
    }
    // Tapered hand with a counterweight TAIL past the pivot — the tail is what
    // tells the eye where the pivot is, which only matters now there are two.
    const hand = (ox: number, oy: number, f: number, w: number, len: number, tail: number, col: string) => {
      const a = (A0 + (A1 - A0) * f) * D, c = Math.cos(a), s = Math.sin(a);
      const px = -s, py = c, bx = ox - c * tail, by = oy - s * tail;
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(bx + px * w, by + py * w);
      ctx.lineTo(ox + c * len, oy + s * len);
      ctx.lineTo(bx - px * w, by - py * w);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, w, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
    };
    if (m1) hand(SX, SY, sample(m1, page.slotLimit?.[1]).frac, 2.0, 78, 9, slotCol(page, 1, col2));   // sub-dial hand (slot 1)
    if (m0) hand(CX, CY, sample(m0, page.slotLimit?.[0]).frac, 3.4, 192, 35, slotCol(page, 0));       // primary + tail (slot 0)
    if (m0) {
      const s = sample(m0, page.slotLimit?.[0]);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = LBL; setDevFont(ctx, 'p13'); ctx.fillText(s.label, CX, 160);
      ctx.fillStyle = text; setDevFont(ctx, 'p20'); ctx.fillText(s.text, CX, 189);
      ctx.fillStyle = MUT;  setDevFont(ctx, 'p10'); ctx.fillText(s.unit, CX, 211);
    }
    if (m1) {                                    // 2nd value reads INSIDE its sub-dial
      const s2 = sample(m1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = MUT;  setDevFont(ctx, 'p10'); ctx.fillText(s2.label, SX, 367);
      ctx.fillStyle = text; setDevFont(ctx, 'p13'); ctx.fillText(s2.text, SX, 393);
    }
    return;
  }

  if (page.layout === 3) {                       // ---- TICKS ----
    const NT = 40, RR = 210, MAJ = 5, PAT = [10, 30, 75, 100, 75, 30, 10];
    const patAt = (d: number) => { const x = Math.abs(d); if (x >= 3) return 0;
      const i = Math.floor(x), t = x - i; return (PAT[3 + i] + (PAT[3 + i + 1] - PAT[3 + i]) * t) / 100; };
    const tick = (i: number, len: number, w: number, col: string) => {
      const a = (A0 + (A1 - A0) * (i / (NT - 1))) * D, c = Math.cos(a), s = Math.sin(a);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(CX + c * (RR - len), CY + s * (RR - len)); ctx.lineTo(CX + c * RR, CY + s * RR); ctx.stroke();
    };
    const fi = (m0 ? sample(m0, page.slotLimit?.[0]).frac : 0) * (NT - 1);
    for (let i = 0; i < NT; i++) {               // faint anchors
      if (!(i % MAJ === 0 || i === NT - 1)) continue;
      if (Math.abs(i - fi) < 3) continue;
      tick(i, 13, 3, 'rgba(255,255,255,.08)');
    }
    ctx.save();
    for (let i = Math.ceil(fi - 3); i <= Math.floor(fi + 3); i++) {   // neon window
      if (i < 0 || i >= NT) continue;
      const k = patAt(i - fi); if (k <= 0.01) continue;
      const len = 9 + 15 * k, w = 3 + 1.5 * k;
      const wc = slotCol(page, 0);                   // lit window → slot 0
      ctx.shadowColor = wc; ctx.shadowBlur = 24 * k;
      tick(i, len, w, dim(wc, k));
      if (k > 0.9) { ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 14;
        tick(i, len, w * 0.5, `rgba(255,255,255,${0.55 * (k - 0.9) / 0.1})`); }
    }
    ctx.restore();
    const m1 = chan(page.ch[1]);
    if (m1) {                                    // 2nd value: short outer tick
      const a = (A0 + (A1 - A0) * sample(m1, page.slotLimit?.[1]).frac) * D, c = Math.cos(a), s = Math.sin(a);
      const mc = slotCol(page, 1, col2);             // 2nd marker → slot 1
      ctx.save(); ctx.shadowColor = mc; ctx.shadowBlur = 20;
      ctx.strokeStyle = mc; ctx.lineWidth = 3; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(CX + c * 220, CY + s * 220); ctx.lineTo(CX + c * 230, CY + s * 230); ctx.stroke();
      ctx.restore();
    }
    if (m0) {                                    // ScreenGauge renderTicks
      const s = sample(m0, page.slotLimit?.[0]);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';  // device: middle_center
      ctx.fillStyle = LBL; setDevFont(ctx, 'p10');
      ctx.fillText(s.label, CX, CY - (m1 ? 50 : 42));
      ctx.fillStyle = text;
      if (m1) setDevFont(ctx, 'p20', 1.6); else setDevFont(ctx, 'p48');
      ctx.fillText(s.text, CX, CY + (m1 ? 0 : 8));
      // !m1 the value is 48pt and reaches CY+41 — 10pt at CY+52 would touch it.
      ctx.fillStyle = slotCol(page, 0); setDevFont(ctx, 'p10');
      ctx.fillText(s.unit, CX, CY + (m1 ? 40 : 56));
      if (m1) { const s2 = sample(m1);
        ctx.fillStyle = MUT;  setDevFont(ctx, 'p10'); ctx.fillText(s2.label, CX, CY + 68);
        ctx.fillStyle = slotCol(page, 1, col2); setDevFont(ctx, 'p13'); ctx.fillText(s2.text + ' ' + s2.unit, CX, CY + 96); }
    }
    return;
  }

  if (page.layout === 4) { renderTuner(ctx, page, chan); return; }        // ---- TUNER (paid) ----
  if (page.layout === 5) { renderRegent(ctx, page, chan); return; }       // ---- REGENT (paid) ----
  if (page.layout === 6) { renderChrono(ctx, page, chan); return; }       // ---- CHRONO (paid) ----
  if (page.layout === 7) { renderConcentric(ctx, page, chan); return; }   // ---- CONCENTRIC 5-arc (paid) ----
  if (page.layout === 8) { renderGMeter(ctx, page); return; }             // ---- G-METER (IMU-driven, free) ----

  // ---- HERO (default) ----
  band(ctx, 196, 13, A0, A1, TRACK);
  if (m0) {
    const s = sample(m0, page.slotLimit?.[0]);
    const hc = slotCol(page, 0);                 // primary value arc → slot 0
    ctx.save(); ctx.shadowColor = hc; ctx.shadowBlur = 10;
    band(ctx, 196, 13, A0, A0 + (A1 - A0) * s.frac, hc); ctx.restore();
    // ScreenGauge renderHero — every datum on the device is middle_center
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = LBL; setDevFont(ctx, 'p10');
    ctx.fillText(s.label, CX, CY - 56);
    ctx.fillStyle = text; setDevFont(ctx, 'p48');
    ctx.fillText(s.text, CX, CY + 4);
    ctx.fillStyle = MUT; setDevFont(ctx, 'p10');
    ctx.fillText(s.unit, CX, CY + 52);
  } else {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = MUT; setDevFont(ctx, 'p20'); ctx.fillText('—', CX, CY);
  }
  // Three support readouts in a row (matches firmware renderHero: xs 152/233/314,
  // label p6 @y336, value p13 @y368) — the original 4-value hero. Slots ch[1..3].
  const sxs = [152, 233, 314];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 1; i <= 3; i++) {
    const ms = chan(page.ch[i]);
    if (!ms) continue;
    const s = sample(ms);
    const x = sxs[i - 1];
    ctx.fillStyle = LBL; setDevFont(ctx, 'p6');
    ctx.fillText(s.label + (s.unit ? ' ' + s.unit : ''), x, 336);
    ctx.fillStyle = slotCol(page, i, text); setDevFont(ctx, 'p13');
    ctx.fillText(s.text, x, 368);
  }
}

// =====================================================================
//  TUNER — ported from axis_gauge/sim/themes.html renderTuner(). The store's
//  first paid layout, so unlike 0..3 there is no firmware renderer to match
//  YET: the faces chosen here are the spec the C++ port must hit, not a
//  reading of an existing one. Every face is p10 (14px cap) or larger — the
//  owner's measured read-at-a-glance floor from driving the car.
//
//  Slots:  ch[0] → the dot scale + floating pointer (the tacho)
//          ch[1] → the stepped outer energy arc (its label rides the wide tab)
//          ch[2] → readout PRIMARY   (big, bottom of the centred column)
//          ch[3] → readout SECONDARY (small, above the primary)
//  Colours reuse the existing PageCfg fields, so the wire format is untouched:
//          arc → the band + pointer accent · col2 → the honeycomb · text → readout
//
//  The live-only behaviour (redline strobe on the arc/pointer/honeycomb, the ▲
//  shift light) is deliberately absent: a still preview showing a strobe frame
//  would misrepresent the resting state the owner is actually choosing between.
// =====================================================================
function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (60 * i - 30) * D, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
// Per-glyph text bent around a radius. The advance drives the step, so the
// spacing survives setDevFont()'s letterSpacing correction instead of fighting it.
function arcText(ctx: CanvasRenderingContext2D, str: string, aMid: number, r: number, col: string, gap = 1) {
  const ws = [...str].map((c) => ctx.measureText(c).width + gap);
  const total = ws.reduce((a, b) => a + b, 0);
  let a = aMid - (total / r) * (180 / Math.PI) / 2;
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [...str].forEach((c, i) => {
    const deg = (ws[i] / r) * (180 / Math.PI), ac = (a + deg / 2) * D;
    ctx.save();
    ctx.translate(CX + Math.cos(ac) * r, CY + Math.sin(ac) * r);
    ctx.rotate(ac + Math.PI / 2);
    ctx.fillText(c, 0, 0);
    ctx.restore();
    a += deg;
  });
}

function renderTuner(ctx: CanvasRenderingContext2D, page: PagePreview, chan: ChanLookup): void {
  const { col2, text } = page;
  const arc = slotCol(page, 1);   // stepped energy band = ch[1] → its own colour (slot 1)
  // ★ FOUR slots (owner 2026-07-18): the tacho and the readout are now separate
  // channels, and the readout carries TWO values. ch[0]=dot tacho, ch[1]=arc,
  // ch[2]=readout PRIMARY (big), ch[3]=readout SECONDARY (small). Must match
  // ScreenGauge renderTuner exactly.
  const mDot = chan(page.ch[0]), mArc = chan(page.ch[1]);
  const mPri = chan(page.ch[2]), mSec = chan(page.ch[3]);
  const fArc = mArc ? sample(mArc, page.slotLimit?.[1]).frac : 0;                   // ch[1] energy arc — native
  const fDot = mDot ? sample(mDot, page.slotLimit?.[0]).frac : 0;       // ch[0] primary needle → owner limit

  // ---- stepped outer arc: 20px for the first 75%, flaring to 25px for the
  //      last quarter. The step is on the OUTER edge only — the inner edge stays
  //      one clean circle, so the tab reads as a flare, not a wobble.
  const NA0 = 150, NA1 = 320, WIDE = NA1 - (NA1 - NA0) * 0.25;
  const R_IN = 191, H_N = 10, H_W = 12.5, R_N = R_IN + H_N, R_W = R_IN + H_W;
  ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(CX, CY, 231, 0, 2 * Math.PI); ctx.fill();  // owner: no-element bg pure black
  // (the outer band is drawn LAST now — owner wants it on the TOP layer, over the
  // mesh; see the end of this function. band() already uses round caps.)

  // ---- face: black, honeycomb, readout panel, gloss. All clipped to r176,
  //      pulled in from the band's inner edge so a dark ring separates them —
  //      without the gap the disc and the band fuse into one lump.
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, 176, 0, 2 * Math.PI); ctx.clip();
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SZ, SZ);   // face backdrop pure black (owner)
  const hr = 17, hdx = Math.sqrt(3) * hr, hdy = hr * 1.5;
  ctx.strokeStyle = col2; ctx.lineWidth = 1.4;
  for (let row = -1; row * hdy < SZ + hr; row++)
    for (let c = -1; c * hdx < SZ + hdx; c++)
      { hexPath(ctx, c * hdx + (row % 2 ? hdx / 2 : 0), row * hdy, hr); ctx.stroke(); }
  // One oversized hex laid over the readout's side — the panel IS a hex, so the
  // mesh reads through it faintly instead of being masked by a foreign shape.
  ctx.fillStyle = 'rgba(0,0,0,.60)'; hexPath(ctx, CX + 170, CY, 180); ctx.fill();   // owner: .55 → .60
  ctx.strokeStyle = 'rgba(255,255,255,.11)'; ctx.lineWidth = 1.5;
  hexPath(ctx, CX + 170, CY, 180); ctx.stroke();
  // RADIAL fade to true black at the rim, black reaching 60% of the radius inward
  // (owner). This was still the old top-to-bottom LINEAR sheen while the sim and
  // firmware had both gone radial — the preview is the third place the face is
  // drawn and it silently lagged the other two. GRAD_BLACK matches
  // ScreenGauge renderTuner; canvas has real alpha, so the ring maths the firmware
  // fakes with annuli is a two-stop gradient here.
  const GRAD_BLACK = 0.60;
  const gl = ctx.createRadialGradient(CX, CY, 0, CX, CY, 176);
  gl.addColorStop(0, 'rgba(0,0,0,0)');
  gl.addColorStop(1 - GRAD_BLACK, 'rgba(0,0,0,0)');   // fade starts here
  gl.addColorStop(1, 'rgba(0,0,0,1)');                // #000000 dead on the rim
  ctx.fillStyle = gl; ctx.fillRect(0, 0, SZ, SZ);
  ctx.restore();
  ctx.strokeStyle = '#0d1013'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(CX, CY, 176, 0, 2 * Math.PI); ctx.stroke();

  // (the outer band + its label are drawn LAST — see the end of this function.)

  // ---- dot scale, 7 → 1 o'clock. The redline is a continuous ARC, not red
  //      dots: the dots simply stop where it starts. At a 180° sweep it lands at
  //      12 o'clock. Redline is fixed at 85% here — the preview has no peak.
  const DA0 = 120, DA1 = 300, ND = 10, rl = 0.85;
  band(ctx, 154, 5.4, DA0 + (DA1 - DA0) * rl, DA1, '#C0392B');
  for (let i = 0; i < ND; i++) {
    const t = i / (ND - 1);
    if (t >= rl) continue;
    const a = (DA0 + (DA1 - DA0) * t) * D;
    ctx.save();
    ctx.fillStyle = '#f2f4f6';
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.beginPath(); ctx.arc(CX + Math.cos(a) * 154, CY + Math.sin(a) * 154, 5.4, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
  }

  // ---- floating equilateral pointer. The drop shadow is the SAME triangle
  //      drawn twice, offset and dark — not shadowBlur, which LovyanGFX cannot
  //      do, so a blurred preview would promise a device render we can't ship.
  //      The offset is FIXED down-right: one light source over the dial, so the
  //      shadow must not swing around as the pointer sweeps.
  if (mDot) {
    const a = (DA0 + (DA1 - DA0) * fDot) * D, c = Math.cos(a), s = Math.sin(a), px = -s, py = c;
    const SIDE = 28, H = SIDE * Math.sqrt(3) / 2, TIP = 142;
    const bx = CX + c * (TIP - H), by = CY + s * (TIP - H);
    const tri = (dx: number, dy: number, col: string) => {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(CX + c * TIP + dx, CY + s * TIP + dy);
      ctx.lineTo(bx + px * SIDE / 2 + dx, by + py * SIDE / 2 + dy);
      ctx.lineTo(bx - px * SIDE / 2 + dx, by - py * SIDE / 2 + dy);
      ctx.closePath(); ctx.fill();
    };
    tri(4, 5, 'rgba(0,0,0,.42)');
    tri(2, 2.5, 'rgba(0,0,0,.30)');
    tri(0, 0, '#eceef1');
  }

  // ---- readout: TWO stacked values in one centred column (owner 2026-07-18).
  //      SECONDARY on top (small), PRIMARY at the bottom (big) — "readout หลัก
  //      อยู่ล่าง". pri = ch[2], sec = ch[3]; the tacho (ch[0]) no longer feeds it.
  //      ★ owner 2026-07-22: NO name labels — value only. Sizes converted px→cap
  //      identical to ScreenGauge renderTuner (psionic20pt, yAdv=43, yAdv×scale≈px):
  //        sec 40px → p20 ×0.93 @180 · pri 48px → p20 ×1.12 @240 · unit p6 ×1.13 @264.
  //      Column pinned at TX=318 (the face ends at x=409, so the value cannot move right).
  // GEAR shows a representative 'D' here — the glass resolves the real P/R/N/D +
  // numeric sub-gear from live data, which a still preview has no source for.
  const tx = 318;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const roText = (m: ChanMeta) => (m.label.toUpperCase() === 'GEAR' ? 'D' : sample(m).text);
  if (mSec) {
    ctx.fillStyle = '#cdd2d8'; setDevFont(ctx, 'p20', 0.93); ctx.fillText(roText(mSec), tx, 180);
  }
  if (mPri) {
    ctx.fillStyle = text;      setDevFont(ctx, 'p20', 1.12); ctx.fillText(roText(mPri), tx, 240);
    if (mPri.label.toUpperCase() !== 'GEAR' && mPri.unit) {
      ctx.fillStyle = '#8a939f'; setDevFont(ctx, 'p6', 1.13); ctx.fillText(mPri.unit, tx, 264);
    }
  }

  // ---- OUTER ENERGY BAND — TOP LAYER (owner: arc on top, over the mesh), round
  //      caps (band() uses lineCap 'round'). Sits in the r191+ ring, clear of the
  //      r176 face, so drawing it last keeps it crisp over any bleed. Mirrors
  //      ScreenGauge renderTuner's end block exactly.
  band(ctx, R_N, H_N, NA0, WIDE, '#12262e');
  band(ctx, R_W, H_W, WIDE, NA1, '#12262e');
  const fa = NA0 + (NA1 - NA0) * fArc;                       // fill from the band start (fArc is symmetric for signed)
  if (mArc) {
    band(ctx, R_N, H_N, NA0, Math.min(fa, WIDE), arc);
    if (fa > WIDE) band(ctx, R_W, H_W, WIDE, fa, arc);
  }
  if (mArc) {
    const s = sample(mArc), str = s.label + ' ' + s.text;
    setDevFont(ctx, 'p10');
    arcText(ctx, str, (WIDE + NA1) / 2, R_W + 1.5, 'rgba(0,0,0,.8)');
    arcText(ctx, str, (WIDE + NA1) / 2, R_W, '#ffffff');
  }
}

function band(ctx: CanvasRenderingContext2D, rmid: number, half: number, a0: number, a1: number, col: string) {
  ctx.strokeStyle = col; ctx.lineWidth = 2 * half; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(CX, CY, rmid, a0 * D, a1 * D, false); ctx.stroke();
}

// ★ REGENT — coachbuilt fine-instrument dial (mirror of ScreenGauge renderRegent +
//    sim themes.html). Fanned fine ticks fading to the rim, cardinal majors at
//    9/12/3, a thin compass needle from a small pivot, value low at the bottom.
//    (The preview omits the SN monogram — it has no logo asset; the glass draws it.)
function renderRegent(ctx: CanvasRenderingContext2D, page: PagePreview, chan: ChanLookup): void {
  const m = chan(page.ch[0]);
  const arc = slotCol(page, 0), text = page.text;   // the single value → slot 0
  const A0 = 135, A1 = 405, RO = 182, RRIM = 228, NMIN = 90;
  const s = m ? sample(m, page.slotLimit?.[0]) : null;       // primary → owner full-scale
  const f = s ? s.frac : 0;

  // flat black face — the centre accent heat-glow was removed (owner: it banded
  // on the AMOLED, cleaner with none).
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(CX, CY, 231, 0, 2 * Math.PI); ctx.fill();

  // fine minors — full length to the rim, fading out
  for (let i = 0; i <= NMIN; i++) {
    const a = (A0 + (A1 - A0) * i / NMIN) * D, c = Math.cos(a), sn = Math.sin(a);
    const x0 = CX + c * (RO - 9), y0 = CY + sn * (RO - 9), x1 = CX + c * RRIM, y1 = CY + sn * RRIM;
    const lg = ctx.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, 'rgba(150,158,168,0.42)');
    lg.addColorStop(1, 'rgba(150,158,168,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  // majors at 9 / 12 / 3
  for (const deg of [180, 270, 360]) {
    const a = deg * D, c = Math.cos(a), sn = Math.sin(a);
    ctx.strokeStyle = arc; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CX + c * (RO - 9), CY + sn * (RO - 9)); ctx.lineTo(CX + c * RRIM, CY + sn * RRIM); ctx.stroke();
  }

  // thin compass needle-bar + short tail
  { const a = (A0 + (A1 - A0) * f) * D, c = Math.cos(a), sn = Math.sin(a), TIP = 168, TAIL = 22;
    ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CX - c * TAIL, CY - sn * TAIL); ctx.lineTo(CX + c * TIP, CY + sn * TIP); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(120,128,138,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(CX, CY, 7, 0, 2 * Math.PI); ctx.stroke();

  // value low at the bottom + unit
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (s) {
    ctx.fillStyle = text; setDevFont(ctx, 'p20', 47 / 43); ctx.fillText(s.text, CX, CY + 190);
    ctx.fillStyle = MUT; setDevFont(ctx, 'p6'); ctx.fillText((s.unit || '').toUpperCase(), CX, CY + 222);
  } else {
    ctx.fillStyle = MUT; setDevFont(ctx, 'p20'); ctx.fillText('—', CX, CY);
  }
}

// ★ CHRONO — REGENT DNA as a chronograph (mirror of ScreenGauge renderChrono + sim).
//    Big main dial + a BORDERLESS sub-dial sharing the main face; the ONLY layout with
//    a settable background (page.col2): achromatic passes, chromatic → 25% pale tint,
//    elements flip dark-on-light. Owner-tuned constants baked in.
// col2 arrives as a resolved CSS colour STRING ("#rrggbb" or "rgb(r,g,b)") — parse
// it, then apply the achromatic-pass / chromatic-mute rule.
function chBg(css: string): { css: string; light: boolean } {
  let r = 0, g = 0, b = 0;
  if (css && css[0] === '#') { const n = parseInt(css.slice(1), 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
  else { const m = (css || '').match(/\d+/g); if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2]; } }
  // (removed 2026-07-24, owner: Chrono BG must take FULL RGB) — the old `if chromatic →
  // 191+ch/4` forced any coloured background to a pale 25% tint; a red BG became pink.
  // Now the raw colour is used; the `light` flag still adapts the needle/text for contrast.
  return { css: `rgb(${r},${g},${b})`, light: (0.299 * r + 0.587 * g + 0.114 * b) > 128 };
}
function chronoDial(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, f: number,
                    needleW: number, majors: boolean, minorRGB: string, major: string,
                    needle: string, pivot: string): void {
  const A0 = 135, A1 = 405, big = R > 120;
  const RIN = big ? R - 9 : R - 14, RRIM = big ? R + 46 : R + 2, NMIN = big ? 90 : 54;
  // Fine ticks now use the SAME accent colour as the 3 major ticks (owner 2026-07-24:
  // "ขีดถี่เป็นสีเดียวกับ 3ขีดหลัก ปรับได้เหมือนกัน") — parse `major` to r,g,b so the
  // inner→outer depth fade keeps working. minorRGB (grey) is no longer used.
  void minorRGB;
  const mrgb = (() => {
    if (major[0] === '#') { const n = parseInt(major.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
    const m = major.match(/\d+/g); return m && m.length >= 3 ? `${m[0]},${m[1]},${m[2]}` : '150,158,168';
  })();
  for (let i = 0; i <= NMIN; i++) {
    const a = (A0 + (A1 - A0) * i / NMIN) * D, c = Math.cos(a), s = Math.sin(a);
    const x0 = cx + c * RIN, y0 = cy + s * RIN, x1 = cx + c * RRIM, y1 = cy + s * RRIM;
    const lg = ctx.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, `rgba(${mrgb},0.42)`); lg.addColorStop(1, `rgba(${mrgb},0)`);
    ctx.strokeStyle = lg; ctx.lineWidth = big ? 1.5 : 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  if (majors) for (const deg of [180, 270, 360]) {
    const a = deg * D, c = Math.cos(a), s = Math.sin(a);
    ctx.strokeStyle = major; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + c * RIN, cy + s * RIN); ctx.lineTo(cx + c * RRIM, cy + s * RRIM); ctx.stroke();
  }
  const a = (A0 + (A1 - A0) * f) * D, c = Math.cos(a), s = Math.sin(a);
  ctx.strokeStyle = needle; ctx.lineWidth = needleW; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - c * R * 0.12, cy - s * R * 0.12); ctx.lineTo(cx + c * R * 0.9, cy + s * R * 0.9); ctx.stroke();
  ctx.strokeStyle = pivot; ctx.lineWidth = big ? 1.5 : 1;
  ctx.beginPath(); ctx.arc(cx, cy, big ? 7 : 4, 0, 2 * Math.PI); ctx.stroke();
}
function renderChrono(ctx: CanvasRenderingContext2D, page: PagePreview, chan: ChanLookup): void {
  const mM = chan(page.ch[0]), mS = chan(page.ch[1]);
  const bg = chBg(page.col2);
  const light = bg.light;
  const tint = slotCol(page, 0);        // main dial → slot 0
  const tintSub = slotCol(page, 1);     // sub dial → slot 1
  const minorRGB = light ? '70,76,84' : '150,158,168';
  const needle = light ? '#20242a' : '#e9ecef', pivot = light ? '#3c424a' : '#788088';
  const inkText = light ? '#14171b' : page.text, inkSub = light ? '#20242a' : '#e9ecef', inkUnit = light ? '#5a616b' : '#8a939f';
  // flat face — centre accent heat-glow removed (owner: banded on the AMOLED).
  ctx.fillStyle = bg.css; ctx.beginPath(); ctx.arc(CX, CY, 231, 0, 2 * Math.PI); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // main dial + value (thin ~ p20 scaled; the glass uses the real thin font)
  chronoDial(ctx, CX, CY - 16, 166, mM ? sample(mM, page.slotLimit?.[0]).frac : 0, 2.5, true, minorRGB, tint, needle, pivot);
  if (mM) { const s = sample(mM, page.slotLimit?.[0]);
    ctx.fillStyle = inkText; setDevFont(ctx, 'p20', 35 / 43); ctx.fillText(s.text, CX, CY - 74);
    ctx.fillStyle = inkUnit; setDevFont(ctx, 'p6'); ctx.fillText((s.unit || '').toUpperCase(), CX, CY - 48); }
  // sub-dial (borderless) + value
  const sx = CX, sy = CY + 142, SR = 91;
  chronoDial(ctx, sx, sy, SR, mS ? sample(mS, page.slotLimit?.[1]).frac : 0, 2, false, minorRGB, tintSub, needle, pivot);
  if (mS) { const s = sample(mS);
    ctx.fillStyle = inkSub; setDevFont(ctx, 'p20', 30 / 43); ctx.fillText(s.text, sx, sy + 45);
    ctx.fillStyle = inkUnit; setDevFont(ctx, 'p6'); ctx.fillText((s.unit || '').toUpperCase(), sx, sy + 65); }
}
// ★ CONCENTRIC (5-Arc) — mirror of axis_175_fw ScreenGauge renderConcentric.
//    Five stacked gold concentric arcs on the LEFT sweep (outer→inner = ch[0..4]),
//    the SN monogram dead-centre, and curved L-bracket readouts on the RIGHT. Both
//    panels are 466×466 (CX=CY=233) so the geometry ports 1:1. Colour per arc =
//    slot override else the page arc (slotCol); value/label/unit via sample() like
//    every other face; an empty slot (Ch.NONE) draws no arc and reads "--".
function renderConcentric(ctx: CanvasRenderingContext2D, page: PagePreview, chan: ChanLookup): void {
  // {midRadius, halfWidth} per band + the sweep + readout-row centres — 1:1 with the firmware.
  const BANDS: [number, number][] = [[202, 12], [171, 12], [140, 12], [109, 12], [78, 12]];
  const TEXTY = [65, 149, 233, 317, 401];
  const ARC_S = 102, ARC_E = 258;
  const FRM = '#6b7178';   // L-bracket frame grey rgb(107,113,120)

  // ---- Pass 1: the five arcs (dim track + fill from sweep start to value) ----
  for (let i = 0; i < 5; i++) {
    const m = chan(page.ch[i]);
    band(ctx, BANDS[i][0], BANDS[i][1], ARC_S, ARC_E, TRACK);   // dim track over the whole sweep
    if (!m) continue;                                            // empty slot → no fill
    const s = sample(m, page.slotLimit?.[i]);
    const ac = slotCol(page, i);                                // per-arc: slot override else page arc
    ctx.save(); ctx.shadowColor = ac; ctx.shadowBlur = 10;
    band(ctx, BANDS[i][0], BANDS[i][1], ARC_S, ARC_S + (ARC_E - ARC_S) * s.frac, ac);
    ctx.restore();
  }

  // ---- SN monogram dead-centre (fixed brand mark; 88×87 on the glass) ----
  if (monoImg) {
    const lw = 88, lh = 87;
    ctx.drawImage(monoImg, CX - lw / 2, CY - lh / 2, lw, lh);
  }

  // ---- Pass 2: curved L-bracket readouts on the right (hug the round bezel) ----
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    const m = chan(page.ch[i]);
    if (!m) continue;
    const big = i === 2;                                        // centre row = the primary readout
    const y = TEXTY[i], dy = y - CY;
    const hx = Math.sqrt(Math.max(0, 208 * 208 - dy * dy));     // hug the round bezel
    const rightX = CX + hx - 6;
    const w = big ? 128 : 116, left = rightX - w, h = 30, top = y - 15, bot = y + 15;
    ctx.fillStyle = FRM;
    ctx.fillRect(left, top, 2, h);                              // vertical of the L
    ctx.fillRect(left, bot - 2, w, 2);                          // horizontal of the L

    const s = sample(m, page.slotLimit?.[i]);
    // Heading (device: bottom_left, above the L).
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = LBL; setDevFont(ctx, big ? 'p10' : 'p8');
    ctx.fillText(s.label, left, top - 4);
    // Value (device: middle_left) — colour follows this slot; unit trails it.
    ctx.textBaseline = 'middle';
    ctx.fillStyle = page.text; setDevFont(ctx, big ? 'p20' : 'p13');
    ctx.fillText(s.text, left + 8, y);
    if (s.unit) {
      const vx = left + 8 + ctx.measureText(s.text).width + 5;
      ctx.fillStyle = MUT; setDevFont(ctx, 'p6');
      ctx.fillText(s.unit, vx, y + 4);
    }
  }
}

// ★ G-METER — mirror of axis_175_fw ScreenGauge renderGMeter (LAYOUT_GMETER = 8).
//    The device draws this from the on-board IMU (ui::setGMeterInput), NOT a telemetry
//    channel, so this preview has no live G. It draws a REPRESENTATIVE resting frame:
//    the graticule (outer 2.0g ring + 0.5g/1.0g grid circles + crosshair + cardinal
//    ticks + centre pip) plus a sample G dot toward the lower-right (a mid-corner) and
//    the LAT/LON/PEAK readouts. Geometry is 1:1 with the firmware: GM_R1G=104 px/g,
//    outer ring = 208 px (2.0g). Grid colour = slot 0 (the page arc); text = page.text.
function renderGMeter(ctx: CanvasRenderingContext2D, page: PagePreview): void {
  const grid = slotCol(page, 0);           // rings/crosshair colour (arcColor)
  const text = page.text;
  const R1G = 104, OUTER = R1G * 2;         // px per g / 2.0g outer ring
  ctx.lineCap = 'butt';

  // ---- Grid rings: 0.5g, 1.0g, 2.0g(outer) — dimmer inward, like the glass ----
  const ring = (r: number, t: number) => {
    ctx.strokeStyle = dim(grid, t); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, 2 * Math.PI); ctx.stroke();
  };
  ring(R1G / 2, 0.30);                      // 0.5 g
  ring(R1G, 0.55);                          // 1.0 g
  ring(OUTER, 1.0);                         // 2.0 g outer

  // ---- Faint crosshair through the centre ----
  const arm = OUTER + 4;
  ctx.strokeStyle = dim(grid, 0.22); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CX - arm, CY); ctx.lineTo(CX + arm, CY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CX, CY - arm); ctx.lineTo(CX, CY + arm); ctx.stroke();
  // Cardinal ticks crossing the outer ring (instrument-bezel cue).
  const TICK = 14; ctx.strokeStyle = grid; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(CX, CY - OUTER - TICK); ctx.lineTo(CX, CY - OUTER + TICK); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CX, CY + OUTER - TICK); ctx.lineTo(CX, CY + OUTER + TICK); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CX - OUTER - TICK, CY); ctx.lineTo(CX - OUTER + TICK, CY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CX + OUTER - TICK, CY); ctx.lineTo(CX + OUTER + TICK, CY); ctx.stroke();

  // ---- Static centre pip ----
  ctx.fillStyle = 'rgb(120,122,128)';
  ctx.beginPath(); ctx.arc(CX, CY, 9, 0, 2 * Math.PI); ctx.fill();

  // ---- Sample G dot: a mid-corner ~0.82 g toward the lower-right ----
  //  sx = lateral (screen +x = right), sy = longitudinal (screen +y up). Down = sy<0.
  const sx = 0.58, sy = -0.58, mag = Math.hypot(sx, sy);       // ≈0.82 g
  const px = CX + sx * R1G, py = CY - sy * R1G;                // screen y inverted
  // Colour ramp: <0.5g green, 0.5..1g green→amber, >1g amber→red (mirrors firmware).
  const lerp = (a: number[], b: number[], t: number) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  const GRN = [70, 210, 90], AMB = [240, 180, 40], RED = [240, 60, 50];
  const dotC = mag < 0.5 ? `rgb(${GRN})`
             : mag < 1.0 ? lerp(GRN, AMB, (mag - 0.5) / 0.5)
             : lerp(AMB, RED, clamp(mag - 1.0, 0, 1));
  ctx.save(); ctx.shadowColor = dotC; ctx.shadowBlur = 12; ctx.fillStyle = dotC;
  ctx.beginPath(); ctx.arc(px, py, 7 + 3 * (mag * 0.5), 0, 2 * Math.PI); ctx.fill();
  ctx.restore();

  // ---- Readouts: PEAK (top) · big |G| (below centre) · LAT / LON (lower bezel) ----
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = text; setDevFont(ctx, 'p20'); ctx.fillText(mag.toFixed(2) + 'G', CX, CY + 150);
  ctx.fillStyle = dim(grid, 0.85); setDevFont(ctx, 'p10'); ctx.fillText('PEAK', CX, CY - 128);
  ctx.fillStyle = text; setDevFont(ctx, 'p13'); ctx.fillText(mag.toFixed(2) + 'G', CX, CY - 104);
  ctx.fillStyle = dim(grid, 0.85); setDevFont(ctx, 'p10');
  ctx.fillText('LAT', CX - 96, CY + 96); ctx.fillText('LON', CX + 96, CY + 96);
  ctx.fillStyle = text; setDevFont(ctx, 'p13');
  ctx.fillText((sx >= 0 ? '+' : '') + sx.toFixed(2), CX - 96, CY + 120);
  ctx.fillText((sy >= 0 ? '+' : '') + sy.toFixed(2), CX + 96, CY + 120);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0) return; r = Math.min(r, h / 2, w / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}
