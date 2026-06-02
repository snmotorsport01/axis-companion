<script lang="ts">
  // =====================================================================
  //  DevicePreview — live mockup of the round AXIS LCD using whichever
  //  colour slots the user is currently editing in Brand.svelte. The
  //  whole point is "see before save" — every picker change re-renders
  //  this preview in real time so the user can dial colours that
  //  actually read well together on the device, not just on a swatch.
  //
  //  Layout: 240×240 SVG clipped to a circle (mimics the GC9A01 LCD's
  //  round visible area — the framebuffer is square but the bezel mask
  //  hides the corners on the real device, same as here). A small tab
  //  strip below lets the user step through the major screens (MAIN,
  //  GEAR-PATTERN, G-METER, INFO) so they can see how each slot plays
  //  in its real context — e.g. nameColor only shows on MAIN, warnColor
  //  only on INFO's exit prompt, meterColor only on G-METER, etc.
  //
  //  The G-METER dot rotates slowly via $effect so the preview feels
  //  alive and the meter colour can be judged with motion (a static
  //  dot reads differently to a swept one).
  // =====================================================================
  import { onDestroy } from 'svelte';

  type View = 'main' | 'pattern' | 'gmeter' | 'info';

  // Each colour slot mirrors a real firmware sprite. Defaults keep the
  // preview rendering even if a parent forgets to pass one in.
  //
  // transitionStyle / gearAnimStyle drive the same animations the
  // firmware plays on the device, so the user dialling them on the
  // CUSTOM page sees exactly the effect they're picking. Enum values
  // match the firmware:
  //   transitionStyle: 0=fade  1=iris  2=instant
  //   gearAnimStyle:   0=none  1=slide 2=fade
  //
  // Svelte 5 runes mode: $props() (not `export let`).
  let {
    name            = 'AXIS',
    accent          = '#FFA500',
    gearColor       = '#FFA500',
    meterColor      = '#888888',
    nameColor       = '#BDBDBD',
    fgColor         = '#FFFFFF',
    mutedColor      = '#888888',
    warnColor       = '#FF3B3B',
    transitionStyle = 0,
    gearAnimStyle   = 0,
    patternChaseMs  = 220,
    liveGearLabel   = null,
    liveRoll        = null,
    livePitch       = null
  } = $props<{
    name?:            string;
    accent?:          string;
    gearColor?:       string;
    meterColor?:      string;
    nameColor?:       string;
    fgColor?:         string;
    mutedColor?:      string;
    warnColor?:       string;
    transitionStyle?: number;
    gearAnimStyle?:   number;
    patternChaseMs?:  number;
    // When any of these are non-null the preview switches from the
    // synthesised cycle to live data from /api/stream telemetry. The
    // Custom page passes them in so users see what the real device
    // looks like with their colour edits applied right now, not a
    // generic 1→2→3 sweep.
    liveGearLabel?:   string | null;
    liveRoll?:        number | null;
    livePitch?:       number | null;
  }>();

  // ---- View tab + transition state -----------------------------
  let view     = $state<View>('main');
  let prevView = $state<View | null>(null);
  // transitionT: 0 = just started, 0.5 = midpoint (content swap),
  // 1 = finished. While transitioning, the SVG shows prevView under
  // an iris/fade overlay during the first half and the new view
  // during the second half.
  let transitionT = $state(1);
  const TRANSITION_MS = 600;
  let transRaf: number | undefined;

  function setView(next: View) {
    if (next === view) return;
    if (transitionStyle === 2 || transitionT < 1) {
      // Instant OR already transitioning — just snap. (Mid-transition
      // snap matches the firmware behaviour where rapid input commits
      // the destination immediately.)
      view = next;
      transitionT = 1;
      prevView = null;
      if (transRaf != null) cancelAnimationFrame(transRaf);
      return;
    }
    prevView = view;
    view = next;
    transitionT = 0;
    const start = performance.now();
    const step = (now: number) => {
      transitionT = Math.min(1, (now - start) / TRANSITION_MS);
      if (transitionT < 1) transRaf = requestAnimationFrame(step);
      else { transRaf = undefined; prevView = null; }
    };
    transRaf = requestAnimationFrame(step);
  }

  // Which view's content to render right now — during a transition we
  // show the OLD view in the first half, then swap at the midpoint.
  let renderView = $derived(
    transitionT < 0.5 && prevView != null ? prevView : view
  );

  // Iris overlay radius — black covers everything at midpoint.
  // First half: hole shrinks 170 → 0 (closing). Second half: hole
  // grows 0 → 170 (opening). Mirrors App.cpp's iris fade-out / fade-in.
  let irisHoleR = $derived.by(() => {
    if (transitionT >= 1) return 170;
    if (transitionT < 0.5) return 170 * (1 - transitionT * 2);
    return 170 * (transitionT - 0.5) * 2;
  });
  // Fade overlay opacity — triangle peaking at 0.5.
  let fadeOpacity = $derived.by(() => {
    if (transitionT >= 1) return 0;
    return transitionT < 0.5 ? transitionT * 2 : (1 - transitionT) * 2;
  });

  // ---- G-meter dot sweep ---------------------------------------
  // Two drive modes:
  //   • No live tilt → synthesised circular sweep (demo behaviour)
  //   • Live tilt    → polar map of roll (X) / pitch (Y), same axis
  //                    convention the firmware uses (race convention,
  //                    matches GMETER_FLIP_X/Y after v2.5.22)
  let dotAngle = $state(0);
  let dotRaf: number | undefined;
  function dotLoop() {
    dotAngle = (dotAngle + 0.012) % (Math.PI * 2);
    dotRaf = requestAnimationFrame(dotLoop);
  }
  $effect(() => {
    if (renderView === 'gmeter' && liveRoll == null && livePitch == null) {
      dotRaf = requestAnimationFrame(dotLoop);
    }
    return () => { if (dotRaf != null) cancelAnimationFrame(dotRaf); };
  });

  // ---- Gear digit cycle + per-style entry animation -------------
  // Cycles 1→2→3→4→5→N every 1.6 s while MAIN is active so the user
  // sees gearColor on both narrow ("1") and wide ("N") glyphs.
  const GEAR_LABELS = ['1', '2', '3', '4', '5', 'N'];
  let gearIdx     = $state(0);
  let prevGearStr = $state<string | null>(null);
  let gearT       = $state(1);                 // 0=mid-anim, 1=settled
  const GEAR_ANIM_MS = 320;
  let gearTimer: number | undefined;
  let gearRaf:   number | undefined;

  function nextGear() {
    const nextIdx = (gearIdx + 1) % GEAR_LABELS.length;
    if (gearAnimStyle === 0) {
      gearIdx = nextIdx;
      return;
    }
    // Slide / Fade: capture the outgoing label and animate gearT 0→1
    // — the SVG renders the OLD label with (1 − gearT) interpolation
    // and the NEW with gearT, giving cross-fade or scroll-in.
    prevGearStr = GEAR_LABELS[gearIdx];
    gearIdx     = nextIdx;
    gearT       = 0;
    const start = performance.now();
    const step = (now: number) => {
      gearT = Math.min(1, (now - start) / GEAR_ANIM_MS);
      if (gearT < 1) gearRaf = requestAnimationFrame(step);
      else { gearRaf = undefined; prevGearStr = null; }
    };
    gearRaf = requestAnimationFrame(step);
  }

  $effect(() => {
    // Skip the demo cycle when live gear data is flowing — otherwise
    // the preview would fight the real value and flicker every 1.6 s.
    if (renderView === 'main' && liveGearLabel == null) {
      gearTimer = window.setInterval(nextGear, 1600);
    }
    return () => { if (gearTimer != null) window.clearInterval(gearTimer); };
  });
  // Live label wins over the demo cycle. Fall back to the cycle index
  // so the preview stays useful in DEMO MODE or when the device is
  // disconnected mid-session.
  let gearLabel = $derived(liveGearLabel ?? GEAR_LABELS[gearIdx]);

  // ---- Pattern-chase animation ----------------------------------
  // The real H-pattern screen runs a "Pac-Man" marker that walks
  // through the gear positions at the rate set by patternChaseMs.
  // We mirror that here so the slider on the Custom page has a
  // visible effect — slide it left and the chase speeds up, right
  // and it slows down. Without this loop, the PATTERN tab was a
  // still picture and the demo froze at gear "5" the moment the
  // user switched away from MAIN.
  //
  // CHASE_ORDER walks the H-pattern in gear-shift order
  // (1 → 2 → 3 → 4 → 5 → R) by mapping each gear to the index of
  // its circle in the layout array further down. Spatially this
  // zig-zags: top-left → bot-left → top-mid → bot-mid → top-right
  // → bot-right, which matches how a driver pulls the lever on a
  // real H-pattern gearbox.
  const CHASE_ORDER = [0, 3, 1, 4, 2, 5];
  let chaseStep = $state(0);
  let chaseTimer: number | undefined;

  $effect(() => {
    if (renderView !== 'pattern') return;
    // Clamp under 40 ms to avoid pinning the main thread if the prop
    // is misconfigured — the real firmware clamps at 60 ms anyway.
    const period = Math.max(40, patternChaseMs);
    chaseTimer = window.setInterval(() => {
      chaseStep = (chaseStep + 1) % CHASE_ORDER.length;
    }, period);
    return () => { if (chaseTimer != null) window.clearInterval(chaseTimer); };
  });
  let chaseHighlight = $derived(CHASE_ORDER[chaseStep]);

  onDestroy(() => {
    if (dotRaf    != null) cancelAnimationFrame(dotRaf);
    if (transRaf  != null) cancelAnimationFrame(transRaf);
    if (gearRaf   != null) cancelAnimationFrame(gearRaf);
    if (chaseTimer != null) clearInterval(chaseTimer);
  });

  // G-meter dot position. Live mode maps roll/pitch directly to X/Y
  // on the same radar plane the firmware draws on (centre = 0/0,
  // outer ring = ±30°). Demo mode falls back to the synthesised
  // circular sweep so the preview never goes static. Scale factor
  // matches the firmware's kBeamRout / 30° → ~2.5 px/° at 240×240.
  //
  // Roll axis is INVERTED here so the preview matches what the device
  // actually renders. The firmware applies GMETER_FLIP_X=true locally
  // (so a left-bank tilt pushes the dot RIGHT on the round LCD); the
  // BLE telemetry transmits the raw signed roll, so the PWA has to do
  // the same flip itself or the preview mirrors what the user sees on
  // the device.
  let dot = $derived.by(() => {
    if (liveRoll != null && livePitch != null) {
      const k = 2.5;   // px per degree
      const x = 120 + Math.max(-90, Math.min(90, -liveRoll * k));
      const y = 120 + Math.max(-90, Math.min(90,  livePitch * k));
      return { x, y };
    }
    return {
      x: 120 + Math.cos(dotAngle) * 75,
      y: 120 + Math.sin(dotAngle) * 75
    };
  });
</script>

<div class="wrap">
  <div class="screen-frame" style="--accent: {accent}">
    <svg viewBox="0 0 240 240" class="screen" aria-label="Device screen preview">
      <defs>
        <!-- Clip to the visible round area of the LCD — corners outside
             this disc are masked by the device bezel on real hardware. -->
        <clipPath id="lcd-clip">
          <circle cx="120" cy="120" r="120" />
        </clipPath>
      </defs>

      <g clip-path="url(#lcd-clip)">
        <!-- Pure black background, same as cfg::COLOR_BG. -->
        <rect width="240" height="240" fill="#000" />

        {#if renderView === 'main'}
          <!-- Mode label across the top, in the body/title slot. -->
          <text x="120" y="36" text-anchor="middle"
                font-family="var(--font-device)"
                font-size="13" letter-spacing="2" fill={fgColor}>
            HPATTERN
          </text>
          <!-- Big gear digit dominates the centre. While gearT < 1 the
               OLD digit fades / slides out and the NEW one fades /
               slides in, picking the style chosen on this same page.
               When gearAnimStyle === 0 there's no prevGearStr so we
               render only the live label. -->
          {#if prevGearStr && gearAnimStyle === 1}
            <!-- Slide: old goes UP and fades; new starts BELOW and rises -->
            <text x="120" y={158 - 60 * gearT} text-anchor="middle"
                  font-family="var(--font-device)"
                  font-size="132" font-weight="700" fill={gearColor}
                  opacity={1 - gearT}>
              {prevGearStr}
            </text>
            <text x="120" y={158 + 60 * (1 - gearT)} text-anchor="middle"
                  font-family="var(--font-device)"
                  font-size="132" font-weight="700" fill={gearColor}
                  opacity={gearT}>
              {gearLabel}
            </text>
          {:else if prevGearStr && gearAnimStyle === 2}
            <!-- Fade: old fades out, new fades in, same position -->
            <text x="120" y="158" text-anchor="middle"
                  font-family="var(--font-device)"
                  font-size="132" font-weight="700" fill={gearColor}
                  opacity={1 - gearT}>
              {prevGearStr}
            </text>
            <text x="120" y="158" text-anchor="middle"
                  font-family="var(--font-device)"
                  font-size="132" font-weight="700" fill={gearColor}
                  opacity={gearT}>
              {gearLabel}
            </text>
          {:else}
            <text x="120" y="158" text-anchor="middle"
                  font-family="var(--font-device)"
                  font-size="132" font-weight="700" fill={gearColor}>
              {gearLabel}
            </text>
          {/if}
          <!-- Device name across the bottom, in the name slot. -->
          <text x="120" y="208" text-anchor="middle"
                font-family="var(--font-device)"
                font-size="12" letter-spacing="2" fill={nameColor}>
            {(name || 'AXIS').toUpperCase()}
          </text>
        {:else if renderView === 'pattern'}
          <!-- H-pattern: 3 columns × 2 rows. Dotted rails in muted; gear
               circles in gearColor; the "chase" head animates through
               the gear-shift order (1→2→3→4→5→R) at patternChaseMs so
               the user can dial in their preferred speed and see it
               immediately. The active slot pops in accent + thicker
               stroke; inactive slots hold gearColor at reduced opacity. -->
          {#each [[60, 80], [120, 80], [180, 80], [60, 160], [120, 160], [180, 160]] as [x, y], i}
            <circle cx={x} cy={y} r="14" fill="none"
                    stroke={i === chaseHighlight ? accent : gearColor}
                    stroke-width={i === chaseHighlight ? 3 : 1.5}
                    opacity={i === chaseHighlight ? 1 : 0.55} />
            <text x={x} y={y + 5} text-anchor="middle"
                  font-family="var(--font-device)"
                  font-size="14" font-weight="600"
                  fill={i === chaseHighlight ? accent : gearColor}
                  opacity={i === chaseHighlight ? 1 : 0.85}>
              {['1', '3', '5', '2', '4', 'R'][i]}
            </text>
          {/each}
          <!-- N anchor centred between the rails as a dotted ring. -->
          <circle cx="120" cy="120" r="10" fill="none"
                  stroke={mutedColor} stroke-width="1.5" stroke-dasharray="2 3" />
          <text x="120" y="125" text-anchor="middle"
                font-family="var(--font-device)"
                font-size="11" fill={mutedColor}>N</text>
          <!-- Dotted rails connecting columns through N (vertical only). -->
          {#each [60, 120, 180] as cx}
            <line x1={cx} y1="98" x2={cx} y2="142" stroke={mutedColor}
                  stroke-width="1" stroke-dasharray="1 4" opacity="0.5" />
          {/each}
        {:else if renderView === 'gmeter'}
          <!-- Two concentric rings + 4-axis tick marks, all in meterColor. -->
          <circle cx="120" cy="120" r="105" fill="none"
                  stroke={meterColor} stroke-width="1.5" opacity="0.7" />
          <circle cx="120" cy="120" r="55"  fill="none"
                  stroke={meterColor} stroke-width="1.5" opacity="0.7" />
          {#each [0, 90, 180, 270] as a}
            <line x1={120 + Math.cos(a*Math.PI/180) * 55}
                  y1={120 + Math.sin(a*Math.PI/180) * 55}
                  x2={120 + Math.cos(a*Math.PI/180) * 105}
                  y2={120 + Math.sin(a*Math.PI/180) * 105}
                  stroke={meterColor} stroke-width="1" opacity="0.5" />
          {/each}
          <!-- Centre static pip + moving accent dot. -->
          <circle cx="120" cy="120" r="4" fill={meterColor} opacity="0.8" />
          <circle cx={dot.x} cy={dot.y} r="6" fill={accent} />
          <!-- Magnitude readout in fg colour (top right). -->
          <text x="190" y="125"
                font-family="var(--font-device)"
                font-size="11" fill={fgColor}>0.8G</text>
        {:else if renderView === 'info'}
          <!-- Text-heavy view that exercises fg + muted + warn together. -->
          <text x="120" y="44" text-anchor="middle"
                font-family="var(--font-device)"
                font-size="13" letter-spacing="2" fill={fgColor}>INFO</text>
          <text x="40" y="84" font-family="var(--font-device)"
                font-size="11" fill={mutedColor}>Version</text>
          <text x="200" y="84" text-anchor="end"
                font-family="var(--font-device)"
                font-size="11" fill={fgColor}>AXIS V1.0.0</text>
          <text x="40" y="108" font-family="var(--font-device)"
                font-size="11" fill={mutedColor}>Shifts</text>
          <text x="200" y="108" text-anchor="end"
                font-family="var(--font-device)"
                font-size="11" fill={fgColor}>1,247</text>
          <text x="40" y="132" font-family="var(--font-device)"
                font-size="11" fill={mutedColor}>Mode</text>
          <text x="200" y="132" text-anchor="end"
                font-family="var(--font-device)"
                font-size="11" fill={fgColor}>HPATTERN 5</text>
          <text x="40" y="156" font-family="var(--font-device)"
                font-size="11" fill={mutedColor}>IP</text>
          <text x="200" y="156" text-anchor="end"
                font-family="var(--font-device)"
                font-size="11" fill={fgColor}>192.168.4.1</text>
          <!-- Warn slot only fires in exit / error contexts. -->
          <text x="120" y="200" text-anchor="middle"
                font-family="var(--font-device)"
                font-size="11" letter-spacing="2" fill={warnColor}>HOLD: EXIT</text>
        {/if}

        <!-- ===== Page-transition overlay =================================
             Only renders while a transition is in flight (transitionT<1)
             and the user picked a style other than INSTANT. Mirrors what
             ScreenSleep / goTo()'s fade & iris paths do on the device:
               · style 0 (fade): black rect with triangle-wave opacity
                 peaking at 0.5 — at the midpoint the screen is fully
                 covered, so the content swap underneath is invisible.
               · style 1 (iris): black overlay with a circular HOLE that
                 shrinks 170→0 in the first half (closing iris) and grows
                 0→170 in the second half (opening iris). The mask
                 below punches the hole. ============================ -->
        {#if transitionT < 1 && transitionStyle === 0}
          <rect width="240" height="240" fill="#000" opacity={fadeOpacity} />
        {:else if transitionT < 1 && transitionStyle === 1}
          <defs>
            <mask id="iris-mask">
              <rect width="240" height="240" fill="white" />
              <circle cx="120" cy="120" r={irisHoleR} fill="black" />
            </mask>
          </defs>
          <rect width="240" height="240" fill="#000" mask="url(#iris-mask)" />
        {/if}
      </g>

      <!-- Subtle accent ring at the edge of the LCD to evoke the bezel
           glow — keeps the simulation visually framed. -->
      <circle cx="120" cy="120" r="119" fill="none"
              stroke="var(--accent)" stroke-width="1.5" opacity="0.45" />
    </svg>
  </div>

  <div class="picker" role="tablist">
    {#each [
      { id: 'main' as View,    label: 'MAIN'   },
      { id: 'pattern' as View, label: 'PATTERN'},
      { id: 'gmeter' as View,  label: 'G-METER'},
      { id: 'info' as View,    label: 'INFO'   }
    ] as t}
      <button
        type="button"
        role="tab"
        aria-selected={view === t.id}
        class:active={view === t.id}
        on:click={() => setView(t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-3);
  }

  /* Round black frame around the SVG — the dotted-edge band hints at
     the physical bezel and gives the accent-coloured glow somewhere to
     pool. */
  .screen-frame {
    width: 260px;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background: #000;
    padding: 6px;
    box-shadow:
      0 0 0 1px var(--border),
      0 0 24px color-mix(in oklab, var(--accent) 35%, transparent);
  }
  .screen {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 50%;
    background: #000;
  }

  /* iOS-style segmented control under the screen for switching views. */
  .picker {
    display: flex;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px;
    gap: 2px;
  }
  .picker button {
    flex: 1;
    background: transparent;
    border: 0;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1px;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    min-height: 32px;
  }
  .picker button.active {
    background: var(--surface);
    color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
</style>
