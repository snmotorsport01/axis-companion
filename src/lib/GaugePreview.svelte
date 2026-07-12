<script lang="ts">
  // =====================================================================
  //  GaugePreview — round SVG mockup of the AXIS gauge, driven by the live
  //  GaugeConfig props. Doubles as (a) the "see before save" edit preview
  //  and (b) a screen-recordable demo: it ANIMATES a drive cycle (RPM sweeps
  //  the gears, channels breathe, the RPM arc strobes red at the shift point),
  //  and `big` blows it up full-screen for clean iOS screen recording. Uses
  //  the app's real Psionic device font (--font-device) so it matches the glass.
  //  Logo + background are FIXED (not user-editable in firmware).
  // =====================================================================
  import {
    GAUGE_CHANNELS, GAUGE_PAGES, rgb565ToHex,
    type GaugeGlobals
  } from './gaugeBleClient';

  let { arc, globals, pageSlots, pageLayout, slotColor = [], pageNames = [], big = false }: {
    arc: number[];
    slotColor?: number[][];
    globals: GaugeGlobals;
    pageSlots: number[][];
    pageLayout: number[];
    pageNames?: string[];
    big?: boolean;
  } = $props();

  let view = $state(0);   // which page is previewed

  const hex = (c: number) => rgb565ToHex(c);
  const BG   = '#000000';     // fixed background
  const TRACK = '#181a1e';    // dim chrome track (not user-editable)
  const RED   = '#fb1a1a';    // shift / redline strobe

  // Mock telemetry per channel (base fraction + display text), indexed by Ch —
  // same 30-channel order as GAUGE_CHANNELS / firmware CAT[]. RPM (0) is driven
  // live in demoAt(); the rest gently breathe around these.
  const DEMO: Array<{ f: number; v: string }> = [
    { f: 0.52, v: '4200' }, // 0  RPM (overridden)
    { f: 0.40, v: '96'   }, // 1  SPEED
    { f: 0.55, v: '92'   }, // 2  WTEMP
    { f: 0.50, v: '104'  }, // 3  OIL T
    { f: 0.35, v: '38'   }, // 4  IAT
    { f: 0.45, v: '45'   }, // 5  LOAD
    { f: 0.40, v: '40'   }, // 6  THR
    { f: 0.60, v: '0.80' }, // 7  BOOST
    { f: 0.70, v: '14.2' }, // 8  VOLTS
    { f: 0.52, v: '52'   }, // 9  SOC
    { f: 0.21, v: '8.5'  }, // 10 FUEL/h
    { f: 0.15, v: '24.0' }, // 11 MAF
    { f: 0.78, v: '101'  }, // 12 BARO
    { f: 0.54, v: '18'   }, // 13 ADV
    { f: 0.54, v: '2'    }, // 14 STFT
    { f: 0.56, v: '3'    }, // 15 LTFT
    { f: 0.78, v: '30'   }, // 16 AMB
    { f: 0.62, v: '62'   }, // 17 FUEL%
    { f: 0.56, v: '540'  }, // 18 CAT
    { f: 0.42, v: '42'   }, // 19 CTHR
    { f: 0.10, v: '640'  }, // 20 RUN
    { f: 0.47, v: '120'  }, // 21 MAP
    { f: 0.50, v: '4'    }, // 22 GEAR
    { f: 0.02, v: '0'    }, // 23 dMIL
    { f: 0.10, v: '1240' }, // 24 dCLR
    { f: 0.46, v: '14.6' }, // 25 A/F
    { f: 0.50, v: '1.00' }, // 26 LAMBDA
    { f: 0.40, v: '3.2'  }, // 27 OIL P (extra)
    { f: 0.40, v: '88'   }, // 28 TRANS (extra)
    { f: 0.37, v: '11.2' }, // 29 ECON (extra)
  ];

  // ---- live drive-cycle animation ----
  let t = $state(0);
  $effect(() => {
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => { t = (now - t0) / 1000; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
  function driveRpm(s: number): number {
    const T = 6.5, x = (s % T) / T;                      // idle → pull → hold → drop
    if (x < 0.62) return 850 + (7150 - 850) * (x / 0.62);
    if (x < 0.74) return 7150;
    return Math.max(1200, 7150 - (7150 - 1200) * ((x - 0.74) / 0.26));
  }
  // per-channel live value: RPM = real sweep; others gently breathe around DEMO.
  function demoAt(ci: number): { f: number; v: string; warn: boolean } {
    if (ci === 0) { const rpm = driveRpm(t); return { f: rpm / 8000, v: String(Math.round(rpm / 10) * 10), warn: rpm >= 6200 }; }
    const b = DEMO[ci] ?? { f: 0.4, v: '—' };
    return { f: Math.min(1, b.f * (1 + 0.06 * Math.sin(t * 0.7 + ci))), v: b.v, warn: false };
  }
  const flashOn = $derived((Math.floor(t / 0.11) % 2) === 0);

  const TAU = Math.PI / 180;
  const pt = (r: number, d: number): [number, number] =>
    [233 + Math.cos(d * TAU) * r, 233 + Math.sin(d * TAU) * r];
  function arcPath(r: number, a0: number, a1: number): string {
    const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
    const large = (a1 - a0) > 180 ? 1 : 0;
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  function dimHex(c: number, k: number): string {
    const r = (c >> 11) & 31, g = (c >> 5) & 63, b = c & 31;
    return rgb565ToHex(((Math.round(r * k)) << 11) | ((Math.round(g * k)) << 5) | Math.round(b * k));
  }
  // Curve-hugging readout box (mirrors renderConcentric): right edge follows the
  // circle, text LEFT-anchored inside, with an L-bracket.
  function readout(y: number, isBig: boolean) {
    const dy = y - 233;
    const hx = Math.sqrt(Math.max(0, 208 * 208 - dy * dy));
    const w = isBig ? 128 : 94;
    return { left: 233 + hx - 6 - w, top: y - 15, bot: y + 15, w };
  }

  const BANDS = [202, 171, 140, 109, 78];
  const TEXTY = [65, 149, 233, 317, 401];
  const A0 = 102, A1 = 258;

  const layout = $derived(pageLayout?.[view] ?? [0, 1, 2, 1][view]);
  const slots  = $derived(pageSlots?.[view] ?? []);
  const ch = (i: number) => (slots[i] ?? -1);
  const valid = (c: number) => c >= 0 && c < GAUGE_CHANNELS.length;
  // per-arc-POSITION colour override (slotColor[page][slot]); 0 = inherit the channel's arc colour
  const arcCol = (i: number) => (slotColor?.[view]?.[i] || arc[ch(i)]);
</script>

<div class="wrap">
  <div class="frame" class:big style="--ring:{hex(globals.accent)}">
    <svg viewBox="0 0 466 466" class="screen">
      <circle cx="233" cy="233" r="233" fill={BG} />
      <circle cx="233" cy="233" r="231" fill="none" stroke="#23272d" stroke-width="1" />

      {#if layout === 0}
        <!-- MAIN — concentric arcs (left sweep) + curve-hugging L-bracket readouts -->
        {#each BANDS as r, i}
          {#if valid(ch(i))}
            {@const d = demoAt(ch(i))}
            <path d={arcPath(r, A0, A1)} fill="none" stroke={dimHex(arcCol(i), 0.16)} stroke-width="22" stroke-linecap="round" />
            <path d={arcPath(r, A0, A0 + (A1 - A0) * d.f)} fill="none"
                  stroke={ch(i) === 0 && d.warn && flashOn ? RED : hex(arcCol(i))} stroke-width="22" stroke-linecap="round" />
          {/if}
        {/each}
        {#each TEXTY as y, i}
          {#if valid(ch(i))}
            {@const ro = readout(y, i === 2)}
            {@const d = demoAt(ch(i))}
            <rect x={ro.left} y={ro.top} width="2.5" height="30" fill={hex(globals.frame)} />
            <rect x={ro.left} y={ro.bot - 2} width={ro.w} height="2.5" fill={hex(globals.frame)} />
            <text x={ro.left} y={ro.top - 5} fill={hex(globals.label)} font-size={i === 2 ? 15 : 13}>{GAUGE_CHANNELS[ch(i)].label}</text>
            <text x={ro.left + 8} y={y} dominant-baseline="middle" font-weight="700">
              <tspan class="val" fill={ch(i) === 0 && d.warn && flashOn ? RED : hex(globals.value)} font-size={i === 2 ? 34 : 20}>{d.v}</tspan>
              {#if GAUGE_CHANNELS[ch(i)].unit}<tspan fill={hex(globals.unit)} font-size="11" dx="5">{GAUGE_CHANNELS[ch(i)].unit}</tspan>{/if}
            </text>
          {/if}
        {/each}
        <!-- fixed SN monogram, centred — the real gauge logo (silver on black) -->
        <image href="/sn-monogram.png" x="185" y="186" width="96" height="95" preserveAspectRatio="xMidYMid meet" />

      {:else if layout === 2}
        <!-- TEMPS — horizontal bars -->
        {#each [140, 205, 270, 335] as y, i}
          {#if valid(ch(i))}
            {@const d = demoAt(ch(i))}
            <text x="83" y={y - 12} fill={hex(globals.label)} font-size="14">{GAUGE_CHANNELS[ch(i)].label}</text>
            <rect x="83" y={y - 9} width="300" height="18" rx="9" fill={TRACK} />
            <rect x="83" y={y - 9} width={300 * d.f} height="18" rx="9" fill={hex(arcCol(i))} />
            <text x="383" y={y - 12} class="val" fill={hex(globals.value)} font-size="16" font-weight="700" text-anchor="end">{d.v}</text>
          {/if}
        {/each}

      {:else}
        <!-- TURBO / FUEL — hero: big perimeter arc + centre value + 3 support -->
        {#if valid(ch(0))}
          {@const d = demoAt(ch(0))}
          <path d={arcPath(196, 135, 405)} fill="none" stroke={TRACK} stroke-width="26" stroke-linecap="round" />
          <path d={arcPath(196, 135, 135 + 270 * d.f)} fill="none"
                stroke={hex(arcCol(0))} stroke-width="26" stroke-linecap="round" />
          <text x="233" y="180" fill={hex(globals.label)} font-size="18" text-anchor="middle">{GAUGE_CHANNELS[ch(0)].label}</text>
          <text x="233" y="250" class="val" fill={hex(globals.value)} font-size="64" font-weight="800" text-anchor="middle">{d.v}</text>
          {#if GAUGE_CHANNELS[ch(0)].unit}
            <text x="233" y="288" fill={hex(globals.unit)} font-size="16" text-anchor="middle">{GAUGE_CHANNELS[ch(0)].unit}</text>
          {/if}
        {/if}
        {#each [152, 233, 314] as x, i}
          {#if valid(ch(i + 1))}
            {@const d = demoAt(ch(i + 1))}
            <text x={x} y="336" fill={hex(globals.label)} font-size="12" text-anchor="middle">{GAUGE_CHANNELS[ch(i + 1)].label}</text>
            <text x={x} y="372" class="val" fill={hex(globals.value)} font-size="20" font-weight="700" text-anchor="middle">{d.v}</text>
          {/if}
        {/each}
      {/if}

      <!-- page dots -->
      {#each GAUGE_PAGES as _p, i}
        <circle cx={233 - (GAUGE_PAGES.length - 1) * 7.5 + i * 15} cy="442" r="4"
                fill={i === view ? hex(globals.accent) : '#33383f'} />
      {/each}
    </svg>
  </div>

  <div class="picker">
    {#each GAUGE_PAGES as _p, i}
      <button class:active={view === i} on:click={() => (view = i)}>{pageNames[i] || `Page ${i + 1}`}</button>
    {/each}
  </div>
</div>

<style>
  .wrap { display: flex; flex-direction: column; align-items: center; gap: var(--s-3); }
  .frame {
    width: 260px; height: 260px; border-radius: 50%;
    background: #000; border: 1px solid var(--border);
    box-shadow: 0 0 0 4px var(--surface-2), 0 0 22px -4px var(--ring, var(--accent));
    overflow: hidden;
  }
  .frame.big { width: min(86vw, 70vh); height: min(86vw, 70vh); }
  .screen { width: 100%; height: 100%; display: block; }
  /* Words (labels + units) use a legible mono. Psionic stylises letters
     (B→3, T→F …) so "BOOST"/"WATER"/"OIL" come out garbled — keep Psionic
     for the numeric readouts only (.val), preserving the digital-gauge look. */
  .screen :global(text) { font-family: var(--font-mono, ui-monospace, monospace); }
  .screen :global(.val) { font-family: var(--font-device, 'JetBrains Mono', monospace); }

  .picker {
    display: flex; gap: var(--s-1); background: var(--surface-2);
    border: 1px solid var(--border); border-radius: 999px; padding: 3px;
  }
  .picker button {
    background: none; border: 0; color: var(--muted);
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px;
    padding: 6px 10px; border-radius: 999px; cursor: pointer;
  }
  .picker button.active {
    color: var(--accent); background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
</style>
