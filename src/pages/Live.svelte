<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { TelemetryFrame } from '../lib/api';
  import { store } from '../lib/store.svelte';

  let sock: WebSocket | null = null;
  let frame    = $state<TelemetryFrame | null>(null);
  let status   = $state<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  let history  = $state<TelemetryFrame[]>([]);          // last ~5s for the strip chart
  let paused   = $state(false);
  const HISTORY_MAX = 150;                              // 30 Hz × 5 s

  // Radar 2D dot bounds — clamp roll/pitch to ±45° for visual scaling.
  const DOT_RANGE = 45;
  const DOT_SIZE  = 200;

  onMount(() => {
    if (!store.client) return;
    sock = store.client.openTelemetry(
      f => {
        if (paused) return;
        frame = f;
        history.push(f);
        if (history.length > HISTORY_MAX) history.shift();
        history = history;             // trigger reactivity
      },
      () => { status = 'error'; }
    );
    sock.onopen  = () => { status = 'open'; };
    sock.onclose = () => { status = 'closed'; };
  });

  onDestroy(() => { sock?.close(); });

  function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
  function dotXY(f: TelemetryFrame): { x: number; y: number } {
    const r = clamp(f.roll,  -DOT_RANGE, DOT_RANGE) / DOT_RANGE;
    const p = clamp(f.pitch, -DOT_RANGE, DOT_RANGE) / DOT_RANGE;
    return {
      x: (1 + r) * DOT_SIZE / 2,
      y: (1 - p) * DOT_SIZE / 2          // inverted: pitch up = top
    };
  }

  // Derived once per frame so the template avoids {@const} outside of {#each}
  // (Svelte 5 restricts {@const} to a few block scopes).
  let curXY = $derived(frame ? dotXY(frame) : { x: 0, y: 0 });

  // Build an SVG polyline of historical pitch for a quick strip chart.
  $effect.pre(() => {}); // keep reactive — read history below

  function strip(values: number[], w: number, h: number): string {
    if (values.length < 2) return '';
    const n = values.length;
    const vmin = Math.min(...values);
    const vmax = Math.max(...values);
    const span = Math.max(0.5, vmax - vmin);
    return values
      .map((v, i) => {
        const x = (i / (n - 1)) * w;
        const y = h - ((v - vmin) / span) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
</script>

<!-- Logo on the left, connection status on the right. Page title and the
     "‹ DASHBOARD" back affordance dropped — bottom nav handles all
     navigation now, and a literal "LIVE" label was redundant with the
     bottom-nav LIVE tab being highlighted while this page is open. -->
<header class="bar">
  <img class="logo" src="/sn-logo.png" alt="SN Motorsports" />
  <div class="status">
    <span class="dot {status === 'open' ? 'online' : status === 'error' ? 'error' : 'offline'}"></span>
    {status}
  </div>
</header>

{#if !frame}
  <div class="card muted">Waiting for first frame…</div>
{:else}
  <div class="card">
    <h3>Current gear</h3>
    <div class="gear mono">{frame.label}</div>
    <p class="muted sub">
      {frame.motion ? '⚡ motion' : 'still'} ·
      {frame.frozen ? 'frozen' : 'tracking'}
    </p>
  </div>

  <div class="card">
    <h3>Tilt</h3>
    <div class="radar">
      <svg width={DOT_SIZE} height={DOT_SIZE} viewBox="0 0 {DOT_SIZE} {DOT_SIZE}">
        <circle cx={DOT_SIZE / 2} cy={DOT_SIZE / 2} r={DOT_SIZE / 2 - 2} fill="none" stroke="var(--border)" />
        <line x1="0" y1={DOT_SIZE / 2} x2={DOT_SIZE} y2={DOT_SIZE / 2} stroke="var(--border)" stroke-dasharray="2 4" />
        <line x1={DOT_SIZE / 2} y1="0" x2={DOT_SIZE / 2} y2={DOT_SIZE} stroke="var(--border)" stroke-dasharray="2 4" />
        {#each history.slice(-30) as f, i}
          {@const xy = dotXY(f)}
          <circle cx={xy.x} cy={xy.y} r="2" fill="var(--accent)" opacity={(i + 1) / 30} />
        {/each}
        <circle cx={curXY.x} cy={curXY.y} r="6" fill="var(--accent)" />
      </svg>
    </div>
    <dl>
      <dt>Roll</dt>  <dd class="mono">{frame.roll.toFixed(2)}°</dd>
      <dt>Pitch</dt> <dd class="mono">{frame.pitch.toFixed(2)}°</dd>
      <dt>Gyro</dt>  <dd class="mono">{frame.gyro.toFixed(1)} dps</dd>
      <dt>Accel</dt> <dd class="mono">{frame.accel.toFixed(3)} g</dd>
    </dl>
  </div>

  <div class="card">
    <h3>Pitch — last 5s</h3>
    <svg viewBox="0 0 300 80" class="chart" preserveAspectRatio="none">
      <polyline points={strip(history.map(f => f.pitch), 300, 80)} fill="none" stroke="var(--accent)" stroke-width="1.5" />
    </svg>
  </div>

  <button class="pause" on:click={() => paused = !paused}>
    {paused ? '▶ RESUME' : '⏸ PAUSE'}
  </button>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: var(--s-3); }
  /* Logo height tuned to match the connection-status row visually
     (~32 px tall so the status dot sits centred against it). Width
     comes from aspect-ratio of the source PNG. */
  .logo   { height: 32px; width: auto; flex: 1; object-fit: contain; object-position: left center; }
  .status { color: var(--muted); font-size: 13px; text-transform: uppercase; }
  .muted  { color: var(--muted); text-align: center; }
  .gear   { font-size: 72px; text-align: center; font-weight: 700; color: var(--accent); }
  .sub    { text-align: center; color: var(--muted); margin: 0; }
  .radar  { display: flex; justify-content: center; margin: var(--s-3) 0; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; color: var(--accent); }
  .chart  { width: 100%; height: 80px; }
  .pause  { width: 100%; margin-top: var(--s-3); }
</style>
