<script lang="ts">
  // Frosted carbon-wave background — the same living "ฝ้า" surface the AXIS shell
  // uses, so Pro sub-pages sit on it too instead of flat black (owner 2026-07-24:
  // "อยากให้เป็นฝ้าเหมือนกันในหน้าย่อยของ Pro"). Rendered once via PageHeader, which
  // every legacy sub-page already includes. Fixed + behind the page content.
  import { onMount } from 'svelte';
  import { carbonWave } from './carbonWave';
  let canvas: HTMLCanvasElement;
  onMount(() => {
    const stop = carbonWave(canvas, { NL: 72, lineA: .24, lineW: 2, sheen: .3, speed: 1.35 });
    return () => stop && stop();
  });
</script>

<div class="aerobg" aria-hidden="true">
  <canvas class="aeroflow" bind:this={canvas}></canvas>
  <div class="frost"></div>
</div>

<style>
  /* z-index:-1 = same negative layer as the body carbon weave, drawn on top of it;
     the page content (#app/main, z-index auto) paints ABOVE it. carbonWave sizes to
     the viewport itself, so a fixed full-bleed canvas is correct regardless of parent. */
  .aerobg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
    background:
      repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 1.5px, transparent 1.5px 3px),
      repeating-linear-gradient(-45deg, rgba(255,255,255,.018) 0 1.5px, transparent 1.5px 3px),
      #16181d; }
  /* Show the RAW animated wave + sheen (like the shell body); the frosted look comes
     from the translucent, backdrop-blurred cards on top — NOT from blurring the wave
     itself (a heavy canvas blur washed the subtle sheen away). */
  .aeroflow { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .frost { position: absolute; inset: 0; background: rgba(16,18,23,.28); }
</style>
