<script lang="ts">
  // Opening splash / loading screen — the carbon-fibre waves (hero intensity) with
  // the SN monogram + wordmark riding the light. Fades to the app after ~2 s, or
  // tap to skip. Reused as a loading screen via the `label` prop.
  import { onMount } from 'svelte';
  import { carbonWave } from '../lib/carbonWave';

  let { onDone = () => {}, hold = 2000, label = '' as string } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hiding = $state(false);
  let stop: (() => void) | null = null;

  function finish() {
    if (hiding) return;
    hiding = true;
    setTimeout(() => onDone(), 620);   // matches the CSS fade
  }

  onMount(() => {
    // splash = hero intensity (fullscreen black, so push the weave + sheen up so
    // they read like the SN reference; the app-bg version stays subtler)
    stop = carbonWave(canvas, { NL: 76, lineA: 0.2, sheen: 0.3, speed: 1.5, fps: 60 });
    const t = setTimeout(finish, hold);
    return () => { clearTimeout(t); stop && stop(); };
  });
</script>

<div class="splash" class:hide={hiding} onclick={finish} role="presentation">
  <canvas bind:this={canvas} class="bg" aria-hidden="true"></canvas>
  <div class="mark">
    <span class="ax">AXIS</span>
    <span class="wm">SN&nbsp;MOTORSPORTS</span>
    {#if label}<span class="ld">{label}</span>{/if}
  </div>
</div>

<style>
  .splash{position:fixed;inset:0;z-index:200;overflow:hidden;
    background:
      repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0 1.5px, transparent 1.5px 3px),
      repeating-linear-gradient(-45deg, rgba(255,255,255,.03) 0 1.5px, transparent 1.5px 3px),
      radial-gradient(120% 90% at 50% 42%, #16171b, #070709 60%, #030304);
    opacity:1;transition:opacity .6s ease}
  .splash.hide{opacity:0;pointer-events:none}
  .bg{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0}
  .mark{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:14px;pointer-events:none;
    animation:markin 1.1s cubic-bezier(.2,.7,.2,1) both}
  .mark .ax{font-family:'Psionic',sans-serif;font-size:clamp(46px,13vw,74px);letter-spacing:.34em;
    color:#eef1f5;padding-left:.34em;line-height:1;
    text-shadow:0 0 34px rgba(255,255,255,.32),0 0 8px rgba(255,255,255,.4)}
  .mark .wm{font-family:'Psionic',sans-serif;font-size:13px;letter-spacing:.46em;
    color:#c7cdd4;text-shadow:0 0 22px rgba(255,255,255,.2);padding-left:.46em}
  .mark .ld{font-family:'Psionic',sans-serif;font-size:10px;letter-spacing:.28em;
    text-transform:uppercase;color:#565c64;margin-top:8px;animation:pulse 1.4s ease-in-out infinite}
  @keyframes markin{from{opacity:0;transform:translateY(10px) scale(.965);filter:blur(4px)}
    to{opacity:1;transform:none;filter:blur(0)}}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}
  @media (prefers-reduced-motion: reduce){ .mark{animation:none} .mark .ld{animation:none} }
</style>
