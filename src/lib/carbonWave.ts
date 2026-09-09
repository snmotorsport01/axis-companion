// =====================================================================
//  carbonWave — the SN "draped carbon-fibre in a wind tunnel" motion.
//  Horizontal contour lines ripple like carbon cloth / sea swell, with a
//  soft white light sheen drifting slowly over them. Monochrome (the gold
//  stays a UI accent). Used for BOTH the app background (no logo) and the
//  splash / loading screen (with logo). Draws lines + sheen on ONE canvas
//  (lines source-over, sheen 'lighter'); the fine carbon weave is a static
//  CSS cross-hatch behind the canvas.
// =====================================================================
export interface CarbonWaveOpts {
  NL?: number;     // wave-line count (density)
  lineA?: number;  // line alpha (texture strength)
  lineW?: number;  // line width px (thicker = survives a heavy backdrop-blur) — default 1
  sheen?: number;  // light-sheen alpha
  speed?: number;  // motion speed
  fps?: number;    // frame cap (battery) — default 30
}

/** Start the animation on `canvas`. Returns a stop() to call on unmount. */
export function carbonWave(canvas: HTMLCanvasElement | null, opts: CarbonWaveOpts = {}): () => void {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const NL = opts.NL ?? 70, lineA = opts.lineA ?? 0.09, sheen = opts.sheen ?? 0.11, speed = opts.speed ?? 1.25;
  const lineW = opts.lineW ?? 1;
  const minDt = 1000 / (opts.fps ?? 30);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  function size() {
    // Use the VIEWPORT size, not getBoundingClientRect — the canvas is a full-screen
    // (position:absolute;inset:0) layer, and the rect can read short if measured before
    // layout settles, which left the waves drawing only in the top band.
    const r = canvas!.getBoundingClientRect();
    W = Math.max(r.width,  window.innerWidth  || 0, document.documentElement.clientWidth  || 0);
    H = Math.max(r.height, window.innerHeight || 0, document.documentElement.clientHeight || 0);
    canvas!.width = Math.max(1, W * dpr); canvas!.height = Math.max(1, H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  // re-measure once after layout has definitely settled (covers the first-mount race)
  requestAnimationFrame(size);
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = true, last = 0;

  function draw(t: number) {
    const c = ctx!;
    c.clearRect(0, 0, W, H);
    const T = t * 0.00016 * speed;
    // ---- carbon waves: rippling contour lines (more swell toward the middle) ----
    c.globalCompositeOperation = 'source-over'; c.lineWidth = lineW;
    for (let i = 0; i < NL; i++) {
      const f = i / (NL - 1), baseY = f * H;
      // near-uniform amplitude top→bottom so the waves fill the WHOLE screen (not
      // just the middle); a gentle mid-swell remains.
      const depth = 0.7 + 0.3 * Math.sin(f * Math.PI), amp = H * 0.07 * depth;
      c.beginPath();
      for (let x = -10; x <= W + 10; x += 10) {
        const u = x / W;
        const y = baseY
          + amp * Math.sin(u * 5.0 + i * 0.32 + T * 1.6)
          + amp * 0.5 * Math.sin(u * 9.0 - i * 0.18 + T * 2.3);
        x === -10 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.strokeStyle = 'rgba(196,204,216,' + (lineA * (0.75 + 0.25 * depth)) + ')';  // edges nearly as bright as the middle → full-screen texture
      c.stroke();
    }
    // ---- light sheen: ONE big drifting highlight whose OUTER stop is NOT zero, so
    //      the WHOLE screen always keeps a base glow (never a dark bottom) while the
    //      brightest point roams. A tighter secondary hot-spot adds life. ----
    c.globalCompositeOperation = 'lighter';
    const R = Math.max(W, H) * 1.3;
    const lx = W * (0.5 + 0.34 * Math.sin(T * 0.7)), ly = H * (0.5 + 0.34 * Math.cos(T * 0.52));
    const g = c.createRadialGradient(lx, ly, 0, lx, ly, R);
    g.addColorStop(0,   'rgba(255,255,255,' + sheen + ')');
    g.addColorStop(0.5, 'rgba(232,238,246,' + (sheen * 0.5) + ')');
    g.addColorStop(1,   'rgba(210,218,230,' + (sheen * 0.22) + ')');   // FLOOR — whole screen stays lit
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const g2 = c.createRadialGradient(lx, ly, 0, lx, ly, R * 0.42);
    g2.addColorStop(0, 'rgba(255,255,255,' + (sheen * 0.6) + ')');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }

  function loop(t: number) {
    if (!running) return;
    if (t - last >= minDt) { last = t; draw(t); }
    requestAnimationFrame(loop);
  }
  if (reduce) draw(0); else requestAnimationFrame(loop);

  return () => { running = false; window.removeEventListener('resize', onResize); };
}
