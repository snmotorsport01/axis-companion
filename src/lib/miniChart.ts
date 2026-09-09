// Tiny dependency-free line-chart renderer for the Analysis page. Draws into a
// given canvas-context region so the SAME primitive backs both the on-screen
// canvases and the composite PNG export. Single-series only (dataviz rule: one
// hue per chart; the title names the series, so no legend). AXIS dark palette.
export interface ChartOpts {
  color: string;                 // series hue (identity)
  ink?: string;                  // label ink (muted)
  strong?: string;              // value/peak ink
  grid?: string;                 // faint gridline
  title?: string;
  xLabel?: string;
  yMax?: number;                 // force a y ceiling (else auto)
  fmtY?: (v: number) => string;
  fmtX?: (v: number) => string;
  peakLabel?: (p: { x: number; y: number }) => string;  // label the max-y point
  markers?: boolean;             // draw dots at data points (dyno)
}
export interface Pt { x: number; y: number; }

const PAD_L = 46, PAD_R = 14, PAD_T = 26, PAD_B = 26;

export function drawLineChart(
  ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number,
  pts: Pt[], o: ChartOpts,
): void {
  const ink = o.ink ?? '#8b9199';
  const strong = o.strong ?? '#eef0f2';
  const grid = o.grid ?? 'rgba(255,255,255,.07)';
  const plotX = ox + PAD_L, plotY = oy + PAD_T;
  const plotW = w - PAD_L - PAD_R, plotH = h - PAD_T - PAD_B;

  // title
  if (o.title) {
    ctx.fillStyle = ink; ctx.font = '600 12px -apple-system,system-ui,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(o.title.toUpperCase(), ox + PAD_L, oy + 15);
  }
  if (!pts.length) {
    ctx.fillStyle = ink; ctx.font = '13px -apple-system,system-ui,sans-serif';
    ctx.fillText('—', plotX, plotY + plotH / 2);
    return;
  }

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs) || 1;
  const yMax = (o.yMax ?? (Math.max(...ys) * 1.12)) || 1;
  const yMin = 0;
  const sx = (x: number) => plotX + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const sy = (y: number) => plotY + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH;

  // y gridlines + labels (4)
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.font = '11px -apple-system,system-ui,sans-serif';
  for (let i = 0; i <= 4; i++) {
    const yv = yMin + (yMax - yMin) * (i / 4);
    const py = sy(yv);
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, py); ctx.lineTo(plotX + plotW, py); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(o.fmtY ? o.fmtY(yv) : String(Math.round(yv)), plotX - 8, py);
  }
  // x labels (start / mid / end)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const xv of [xMin, (xMin + xMax) / 2, xMax]) {
    ctx.fillStyle = ink;
    ctx.fillText(o.fmtX ? o.fmtX(xv) : String(Math.round(xv)), sx(xv), plotY + plotH + 6);
  }
  if (o.xLabel) {
    ctx.textAlign = 'right'; ctx.fillStyle = ink;
    ctx.fillText(o.xLabel, plotX + plotW, oy + 15 - 15 + 2);
  }

  // area fill (subtle gradient)
  const grad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  grad.addColorStop(0, hexA(o.color, 0.28));
  grad.addColorStop(1, hexA(o.color, 0.0));
  ctx.beginPath();
  ctx.moveTo(sx(pts[0].x), sy(0));
  for (const p of pts) ctx.lineTo(sx(p.x), sy(p.y));
  ctx.lineTo(sx(pts[pts.length - 1].x), sy(0));
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  pts.forEach((p, i) => { const X = sx(p.x), Y = sy(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  if (o.markers) {
    ctx.fillStyle = o.color;
    for (const p of pts) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 2.4, 0, 7); ctx.fill(); }
  }

  // peak marker + label
  if (o.peakLabel) {
    let pk = pts[0]; for (const p of pts) if (p.y > pk.y) pk = p;
    const PX = sx(pk.x), PY = sy(pk.y);
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(PX, PY, 3.6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    const label = o.peakLabel(pk);
    ctx.font = '600 11px -apple-system,system-ui,sans-serif';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width;
    ctx.textAlign = PX + tw + 10 > plotX + plotW ? 'right' : 'left';
    const lx = ctx.textAlign === 'right' ? PX - 6 : PX + 6;
    ctx.fillStyle = strong; ctx.fillText(label, lx, PY - 5);
  }
}

// "#RRGGBB" + alpha → rgba()
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
