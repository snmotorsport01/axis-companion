<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { TelemetryFrame } from '../lib/api';
  import { store } from '../lib/store.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import Glyph from '../lib/Glyph.svelte';

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
    // v2.5.41 — Svelte page navigations can re-mount this component
    // before the previous instance's onDestroy fires (back-button
    // gestures on iOS, route restoration, etc.). If a prior sock
    // reference is still alive, close it before opening a new one;
    // otherwise the firmware ends up with two notify subscriptions
    // on the same char and either rejects the second or doubles up
    // its emit traffic.
    try { sock?.close(); } catch { /* tolerate close-while-pending */ }
    sock = null;
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

  onDestroy(() => {
    try { sock?.close(); } catch {}
    sock = null;
  });

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

  // Consumer-facing connection label — never expose the raw WebSocket
  // state-machine words ("OPEN"/"CLOSED") to a buyer.
  let statusLabel = $derived(
    status === 'open'         ? 'Connected'
    : status === 'connecting' ? 'Connecting…'
    : status === 'error'      ? 'Connection lost'
    :                           'Disconnected'
  );

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

<!-- Shared branded header. Right slot here shows the WebSocket
     telemetry connection status. -->
<PageHeader>
  <div class="status">
    <span class="dot {status === 'open' ? 'online' : status === 'error' ? 'error' : 'offline'}"></span>
    {statusLabel}
  </div>
</PageHeader>

<!-- Gauge shortcut from Home. The AXIS Gauge is a separate BLE device;
     it also lives in Pro → Gauge, but a buyer who has one shouldn't have
     to dig for it. Status-aware: shows connected vs "set up". -->
<button class="gauge-link" on:click={() => store.page = 'gaugesetup'}>
  <span class="gl-ic">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17a8 8 0 0 1 16 0"/><line x1="12" y1="17" x2="16.5" y2="11.5"/></svg>
  </span>
  <span class="gl-txt">
    <span class="gl-l">AXIS Gauge</span>
    <span class="gl-s">{store.gaugeClient ? 'connected' : 'tap to set up'}</span>
  </span>
  {#if store.gaugeClient}<Glyph kind="connected" size={14} />{/if}
  <span class="gl-ch">›</span>
</button>

{#if !frame}
  <div class="card muted">Connecting to your AXIS…</div>
{:else}
  <div class="card">
    <h3>Current gear</h3>
    <div class="gear mono">{frame.label}</div>
    <p class="muted sub">
      {frame.motion ? 'In motion' : 'Still'} ·
      {frame.frozen ? 'Gear locked' : 'Live'}
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
      <dt>Lean</dt> <dd class="mono">{frame.roll.toFixed(0)}°</dd>
      <dt>Tilt</dt> <dd class="mono">{frame.pitch.toFixed(0)}°</dd>
    </dl>
  </div>

  <div class="card">
    <h3>Tilt — last 5s</h3>
    <svg viewBox="0 0 300 80" class="chart" preserveAspectRatio="none">
      <polyline points={strip(history.map(f => f.pitch), 300, 80)} fill="none" stroke="var(--accent)" stroke-width="1.5" />
    </svg>
  </div>

  <button class="pause" on:click={() => paused = !paused}>
    {paused ? '▶ RESUME' : '⏸ PAUSE'}
  </button>
{/if}

<style>
  .status { color: var(--muted); font-size: 13px; }
  .muted  { color: var(--muted); text-align: center; }
  .gear   { font-size: 72px; text-align: center; font-weight: 700; color: var(--accent); }
  .sub    { text-align: center; color: var(--muted); margin: 0; }
  .radar  { display: flex; justify-content: center; margin: var(--s-3) 0; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--s-2) var(--s-4); margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; color: var(--accent); }
  .chart  { width: 100%; height: 80px; }
  .pause  { width: 100%; margin-top: var(--s-3); }

  .gauge-link {
    width: 100%;
    display: flex; align-items: center; gap: 10px;
    background: var(--surface-2, var(--card, #15151a));
    border: 1px solid var(--border, #26261c);
    border-radius: 11px;
    padding: 12px 14px;
    color: var(--fg, #e9e7df);
    cursor: pointer;
    margin: 0 0 var(--s-3, 12px);
    text-align: left;
  }
  .gauge-link .gl-ic { color: var(--accent, #c9a24a); display: flex; }
  .gauge-link .gl-ic svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; }
  .gauge-link .gl-txt { flex: 1; }
  .gauge-link .gl-l { display: block; font-size: 14px; }
  .gauge-link .gl-s { display: block; font-size: 11px; color: var(--muted, #85826f); margin-top: 1px; }
  .gauge-link .gl-ch { color: var(--muted, #75726a); font-size: 18px; }
</style>
