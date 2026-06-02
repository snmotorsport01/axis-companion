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
  // preview rendering even if a parent forgets to pass one in. Svelte 5
  // runes mode: $props() (not `export let`).
  let {
    name       = 'AXIS',
    accent     = '#FFA500',
    gearColor  = '#FFA500',
    meterColor = '#888888',
    nameColor  = '#BDBDBD',
    fgColor    = '#FFFFFF',
    mutedColor = '#888888',
    warnColor  = '#FF3B3B'
  } = $props<{
    name?:       string;
    accent?:     string;
    gearColor?:  string;
    meterColor?: string;
    nameColor?:  string;
    fgColor?:    string;
    mutedColor?: string;
    warnColor?:  string;
  }>();

  let view = $state<View>('main');

  // Slowly sweep the G-meter dot so the user sees the meterColor / accent
  // play together in motion. requestAnimationFrame so it stops when the
  // tab is backgrounded. Angle in radians.
  let dotAngle = $state(0);
  let raf: number | undefined;
  function loop() {
    dotAngle = (dotAngle + 0.012) % (Math.PI * 2);
    raf = requestAnimationFrame(loop);
  }
  $effect(() => {
    if (view === 'gmeter') {
      raf = requestAnimationFrame(loop);
    }
    return () => { if (raf != null) cancelAnimationFrame(raf); };
  });

  onDestroy(() => { if (raf != null) cancelAnimationFrame(raf); });

  // Cycle gear digit for MAIN view so the user sees gearColor with both
  // wide ("8") and narrow ("1") glyphs and against "N". Updated every
  // 1.6 s by a setInterval that runs only while MAIN is the active view.
  const GEAR_LABELS = ['1', '2', '3', '4', '5', 'N'];
  let gearIdx = $state(0);
  let gearTimer: number | undefined;
  $effect(() => {
    if (view === 'main') {
      gearTimer = window.setInterval(() => {
        gearIdx = (gearIdx + 1) % GEAR_LABELS.length;
      }, 1600);
    }
    return () => { if (gearTimer != null) window.clearInterval(gearTimer); };
  });
  let gearLabel = $derived(GEAR_LABELS[gearIdx]);

  // Pre-compute the dot position from the angle once per frame so the
  // template stays readable.
  let dot = $derived({
    x: 120 + Math.cos(dotAngle) * 75,
    y: 120 + Math.sin(dotAngle) * 75
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

        {#if view === 'main'}
          <!-- Mode label across the top, in the body/title slot. -->
          <text x="120" y="36" text-anchor="middle"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="13" letter-spacing="2" fill={fgColor}>
            HPATTERN
          </text>
          <!-- Big gear digit dominates the centre. -->
          <text x="120" y="158" text-anchor="middle"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="132" font-weight="700" fill={gearColor}>
            {gearLabel}
          </text>
          <!-- Device name across the bottom, in the name slot. -->
          <text x="120" y="208" text-anchor="middle"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="12" letter-spacing="2" fill={nameColor}>
            {(name || 'AXIS').toUpperCase()}
          </text>
        {:else if view === 'pattern'}
          <!-- H-pattern: 3 columns × 2 rows. Dotted rails in muted; gear
               circles in gearColor; the "chase" head (gear "3" here) in
               brighter accent so the user sees gearColor + accent
               playing against each other in context. -->
          {#each [[60, 80], [120, 80], [180, 80], [60, 160], [120, 160], [180, 160]] as [x, y], i}
            <circle cx={x} cy={y} r="14" fill="none"
                    stroke={i === 2 ? accent : gearColor}
                    stroke-width={i === 2 ? 3 : 1.5}
                    opacity={i === 2 ? 1 : 0.55} />
            <text x={x} y={y + 5} text-anchor="middle"
                  font-family="ui-monospace, SF Mono, Menlo, monospace"
                  font-size="14" font-weight="600"
                  fill={i === 2 ? accent : gearColor}
                  opacity={i === 2 ? 1 : 0.85}>
              {['1', '3', '5', '2', '4', 'R'][i]}
            </text>
          {/each}
          <!-- N anchor centred between the rails as a dotted ring. -->
          <circle cx="120" cy="120" r="10" fill="none"
                  stroke={mutedColor} stroke-width="1.5" stroke-dasharray="2 3" />
          <text x="120" y="125" text-anchor="middle"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={mutedColor}>N</text>
          <!-- Dotted rails connecting columns through N (vertical only). -->
          {#each [60, 120, 180] as cx}
            <line x1={cx} y1="98" x2={cx} y2="142" stroke={mutedColor}
                  stroke-width="1" stroke-dasharray="1 4" opacity="0.5" />
          {/each}
        {:else if view === 'gmeter'}
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
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={fgColor}>0.8G</text>
        {:else if view === 'info'}
          <!-- Text-heavy view that exercises fg + muted + warn together. -->
          <text x="120" y="44" text-anchor="middle"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="13" letter-spacing="2" fill={fgColor}>INFO</text>
          <text x="40" y="84" font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={mutedColor}>Version</text>
          <text x="200" y="84" text-anchor="end"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={fgColor}>AXIS V1.0.0</text>
          <text x="40" y="108" font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={mutedColor}>Shifts</text>
          <text x="200" y="108" text-anchor="end"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={fgColor}>1,247</text>
          <text x="40" y="132" font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={mutedColor}>Mode</text>
          <text x="200" y="132" text-anchor="end"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={fgColor}>HPATTERN 5</text>
          <text x="40" y="156" font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={mutedColor}>IP</text>
          <text x="200" y="156" text-anchor="end"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" fill={fgColor}>192.168.4.1</text>
          <!-- Warn slot only fires in exit / error contexts. -->
          <text x="120" y="200" text-anchor="middle"
                font-family="ui-monospace, SF Mono, Menlo, monospace"
                font-size="11" letter-spacing="2" fill={warnColor}>HOLD: EXIT</text>
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
        on:click={() => view = t.id}
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
