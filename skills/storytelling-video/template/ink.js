// ink.js - living pen drawing for vertical story videos (1080x1920), drawn with Canvas 2D.
// Every frame is a pure function of time t, so rendering frame by frame is exact.
// Sections: helpers, shapes, pen primitives, timeline, captions, frame engine.

const W = 1080, H = 1920;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash2(i, seed) * (1 - u) + hash2(i + 1, seed) * u;
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const fadeWindow = (t, a, b, f = 0.35) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));

// Path spec -> dense polyline. Segments: ['M',x,y] ['L',x,y] ['C',x1,y1,x2,y2,x,y]
function pathPoints(spec, step = 8) {
  const pts = [];
  let cx = 0, cy = 0;
  for (const s of spec) {
    if (s[0] === 'M') { cx = s[1]; cy = s[2]; pts.push([cx, cy]); }
    else if (s[0] === 'L') {
      const n = Math.max(1, Math.ceil(Math.hypot(s[1] - cx, s[2] - cy) / step));
      for (let i = 1; i <= n; i++) pts.push([lerp(cx, s[1], i / n), lerp(cy, s[2], i / n)]);
      cx = s[1]; cy = s[2];
    } else if (s[0] === 'C') {
      const [, x1, y1, x2, y2, x, y] = s;
      const est = Math.hypot(x1 - cx, y1 - cy) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x - x2, y - y2);
      const n = Math.max(2, Math.ceil(est / step));
      for (let i = 1; i <= n; i++) {
        const k = i / n, m = 1 - k;
        pts.push([
          m * m * m * cx + 3 * m * m * k * x1 + 3 * m * k * k * x2 + k * k * k * x,
          m * m * m * cy + 3 * m * m * k * y1 + 3 * m * k * k * y2 + k * k * k * y,
        ]);
      }
      cx = x; cy = y;
    }
  }
  return pts;
}
function rectPts(x, y, w, h, r = 0) {
  r = Math.min(r, w / 2, h / 2);
  const k = 0.55 * r;
  return pathPoints([
    ['M', x + r, y], ['L', x + w - r, y], ['C', x + w - r + k, y, x + w, y + r - k, x + w, y + r],
    ['L', x + w, y + h - r], ['C', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h],
    ['L', x + r, y + h], ['C', x + r - k, y + h, x, y + h - r + k, x, y + h - r],
    ['L', x, y + r], ['C', x, y + r - k, x + r - k, y, x + r, y],
  ], 6);
}
function circlePts(cx, cy, r, n = 0) {
  n = n || Math.max(12, Math.ceil((2 * Math.PI * r) / 8));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
function transformPts(pts, x, y, angle = 0, scale = 1) {
  const c = Math.cos(angle) * scale, s = Math.sin(angle) * scale;
  return pts.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
}
function tracePoly(ctx, pts, close = true) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
function fillPoly(ctx, pts, style) {
  ctx.beginPath(); tracePoly(ctx, pts); ctx.fillStyle = style; ctx.fill();
}
// First fraction k of a polyline by length (for draw-on).
function partial(pts, k) {
  if (k >= 1) return pts;
  if (k <= 0) return pts.slice(0, 1);
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let want = total * k, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d >= want) {
      out.push([lerp(pts[i - 1][0], pts[i][0], want / d), lerp(pts[i - 1][1], pts[i][1], want / d)]);
      return out;
    }
    want -= d; out.push(pts[i]);
  }
  return out;
}

function makeGrain(w, h, seed, lo = 200) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), rnd = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = lo + rnd() * (255 - lo);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Cloud outline = upper envelope of overlapping discs, rounded flat bottom. Origin bottom centre.
function cloudOutline(seed, w, h) {
  const r = mulberry32(seed), n = 4 + Math.floor(r() * 3), discs = [];
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, bell = Math.sin(k * Math.PI);
    const rad = h * (0.35 + 0.65 * bell) * (0.8 + r() * 0.35);
    discs.push([-w * 0.4 + k * w * 0.8, -h * 0.3 - rad * 0.3, rad]);
  }
  const top = [];
  for (let x = -w / 2; x <= w / 2; x += 6) {
    let y = -h * 0.3;
    for (const [dx, dy, rad] of discs) if (Math.abs(x - dx) < rad) y = Math.min(y, dy - Math.sqrt(rad * rad - (x - dx) ** 2));
    top.push([x, y]);
  }
  const bh = h * 0.3;
  return [[-w / 2 + bh, 0], ...pathPoints([['M', -w / 2 + bh, 0], ['C', -w / 2 - 4, 0, -w / 2 - 4, -bh, -w / 2, -bh]], 6).slice(1),
    ...top, ...pathPoints([['M', w / 2, -bh], ['C', w / 2 + 4, -bh, w / 2 + 4, 0, w / 2 - bh, 0]], 6).slice(1), [-w / 2 + bh, 0]];
}

// ---------- pen primitives ----------
// Colours: one ink, one paper, ONE accent for what matters. Change them here for another look.
const INK = '#1c1a1f', RED = '#d23a2c', PAPER = '#f3ecdf';
const BOIL_FPS = 12; // lines are redrawn with a new wobble 12x per second ("line boil")
let ctx = null, T = 0, TL = null;

function boil(pts, seed, amp = 2.4) {
  const b = Math.floor(T * BOIL_FPS) * 31 + seed;
  return pts.map(([x, y], i) => [x + (noise1(i * 0.17, b) - 0.5) * 2 * amp, y + (noise1(i * 0.17, b + 7) - 0.5) * 2 * amp]);
}
// Stroke a polyline like a pen: k = how much of it is drawn (0..1), fill = paper/ink fill once complete.
function ink(pts, { w = 5, color = INK, seed = 1, close = false, k = 1, amp = 2.4, fill = null } = {}) {
  if (k <= 0 || pts.length < 2) return;
  let p = boil(pts, seed, amp);
  if (fill && k >= 1) { ctx.beginPath(); tracePoly(ctx, p, true); ctx.fillStyle = fill; ctx.fill(); }
  if (close && k >= 1) p = p.concat([p[0]]);
  p = partial(p, k);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); tracePoly(ctx, p, false); ctx.stroke();
  const a = ctx.globalAlpha; // a second thin pass slightly off: reads as a real pen going over the line
  ctx.globalAlpha = a * 0.45; ctx.lineWidth = w * 0.35;
  ctx.beginPath(); tracePoly(ctx, boil(p, seed + 500, amp * 1.4), false); ctx.stroke();
  ctx.globalAlpha = a;
}
const line = (x1, y1, x2, y2) => pathPoints([['M', x1, y1], ['L', x2, y2]], 10);
const poly = (...xy) => { const s = [['M', xy[0], xy[1]]]; for (let i = 2; i < xy.length; i += 2) s.push(['L', xy[i], xy[i + 1]]); return pathPoints(s, 10); };
// Handwritten text revealed left to right (k = 0..1), with a little boil. Returns its width.
function hand(str, x, y, size, k, { color = INK, align = 'center', rot = 0, font = 'Hand' } = {}) {
  if (k <= 0) return 0;
  ctx.font = `600 ${size}px ${font}`;
  const w = ctx.measureText(str).width, x0 = align === 'center' ? x - w / 2 : x;
  const b = Math.floor(T * BOIL_FPS);
  ctx.save(); ctx.translate(x0 + (hash2(b, size) - 0.5) * 2.5, y + (hash2(b, size + 1) - 0.5) * 2.5); ctx.rotate(rot);
  ctx.beginPath(); ctx.rect(-10, -size * 1.2, (w + 20) * clamp(k), size * 1.8); ctx.clip();
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(str, 0, 0);
  ctx.restore();
  return w;
}
function ringScribble(cx, cy, rx, ry, k, seed, color = RED, w = 6) { // circle something in red
  const pts = [];
  for (let i = 0; i <= 60; i++) { const a = -0.6 + (i / 60) * Math.PI * 2.2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  ink(pts, { seed, w, color, k });
}
function underline(x, y, w, k, seed, color = RED) {
  ink(pathPoints([['M', x, y], ['C', x + w * 0.3, y + 14, x + w * 0.7, y - 8, x + w, y + 6]], 8), { seed, w: 6, color, k });
}
const tickMark = (x, y, s, k, seed, color = RED) => ink(poly(x - 24 * s, y, x - 6 * s, y + 20 * s, x + 30 * s, y - 28 * s), { seed, w: 7, color, k });
function scribbleFill(x, y, r, k, seed, color = INK) { // zig-zag filling a circle (something dies, goes dark)
  const pts = [];
  for (let i = 0; i <= 16; i++) { const yy = y - r + (i / 16) * 2 * r, hw = Math.sqrt(Math.max(0, r * r - (yy - y) ** 2)); pts.push([i % 2 ? x + hw : x - hw, yy]); }
  ink(pts, { seed, w: 6, k, color, amp: 1.5 });
}
function hatch(clipPts, x0, x1, y0, y1, k, seed, step = 18) { // diagonal shading inside a shape
  ctx.save(); ctx.beginPath(); tracePoly(ctx, clipPts); ctx.clip();
  const n = Math.floor(((x1 - x0) / step) * clamp(k));
  for (let i = 0; i < n; i++) { const x = x0 + i * step; ink(line(x, y1, x + (y1 - y0), y0), { seed: seed + i, w: 2.4, amp: 1.2 }); }
  ctx.restore();
}
function stick(x, y, s, seed, { wave = 0, k = 1 } = {}) { // stick figure; wave 0..1 raises the arms
  const w = Math.sin(T * 9 + seed) * 0.4;
  ink(circlePts(x, y - 92 * s, 13 * s, 16), { seed, w: 3.5, close: true, amp: 1.2, k });
  ink(line(x, y - 78 * s, x, y - 38 * s), { seed: seed + 1, w: 3.5, amp: 1.2, k });
  ink(poly(x - 14 * s, y, x, y - 38 * s, x + 14 * s, y), { seed: seed + 2, w: 3.5, amp: 1.2, k });
  for (const side of [-1, 1]) {
    const a = lerp(Math.PI / 2 - side * 0.35, -Math.PI / 2 + side * (0.55 + w), wave);
    ink(line(x, y - 70 * s, x + Math.cos(a) * 36 * s, y - 70 * s + Math.sin(a) * 36 * s), { seed: seed + 3 + side, w: 3.5, amp: 1.2, k });
  }
}
function cloud(seed, x, y, s = 1, k = 1) { ink(transformPts(cloudOutline(seed, 300, 110), x, y, 0, s), { seed, w: 3.5, close: true, amp: 2, fill: PAPER, k }); }
const drawOn = (t, a, d = 0.6) => easeInOut(seg(t, a, a + d)); // 0..1 progress of a draw-on starting at a

// ---------- timeline (from the voice-over skill's vo_timeline.py) ----------
const L = (id) => TL.lines.find((l) => l.id === id);
const normW = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
// absolute time of the first word in line `id` that starts with `prefix` (falls back to the line start)
function at(id, prefix) {
  const l = L(id), w = l.words.find((w) => normW(w.w).startsWith(normW(prefix)));
  if (!w) console.warn(`at(): no word "${prefix}" in line ${id}`);
  return w ? w.t0 : l.start;
}
// the same, relative to the line start (what a scene's local time `t` is measured against)
const atL = (id, prefix) => at(id, prefix) - L(id).start;

// ---------- captions: 1-3 word chunks, the spoken word in the accent colour with a small pop ----------
let CHUNKS = [];
function buildChunks(maxWords = 3, maxChars = 16) {
  CHUNKS = [];
  for (const l of TL.lines) {
    let cur = [];
    const ws = l.words.filter((w) => (w.show ?? w.w) !== ''); // vo_timeline --show: hidden words
    ws.forEach((w, i) => {
      cur.push(w);
      const txt = (x) => x.show ?? x.w, len = cur.map(txt).join(' ').length, next = ws[i + 1];
      if (!next || /[.,:?!…]$/.test(txt(w)) || cur.length >= maxWords || len + (next ? txt(next).length : 0) > maxChars) { CHUNKS.push(cur); cur = []; }
    });
  }
}
function captions(t, { y = 1520, size = 108, font = 'Hand' } = {}) {
  const ci = CHUNKS.findIndex((c, i) => t >= (i === 0 ? 0 : c[0].t0 - 0.05) &&
    t < (CHUNKS[i + 1] ? Math.min(CHUNKS[i + 1][0].t0 - 0.05, c[c.length - 1].t1 + 0.6) : c[c.length - 1].t1 + 0.6));
  if (ci < 0) return;
  const c = CHUNKS[ci], txt = (w) => w.show ?? w.w;
  ctx.font = `600 ${size}px ${font}`;
  const gap = ctx.measureText(' ').width, widths = c.map((w) => ctx.measureText(txt(w)).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (c.length - 1);
  let x = (W - total) / 2;
  ctx.fillStyle = 'rgba(243,236,223,0.92)'; ctx.beginPath(); ctx.roundRect(x - 40, y - size, total + 80, size * 1.35, 30); ctx.fill();
  const appear = easeOut(seg(t, c[0].t0 - 0.05, c[0].t0 + 0.12));
  c.forEach((w, i) => {
    const active = t >= w.t0 - 0.03 && t < (c[i + 1] ? c[i + 1].t0 : w.t1 + 0.6), said = t >= w.t0 - 0.03;
    const pop = (active ? 1 + 0.12 * (1 - easeOut(seg(t, w.t0, w.t0 + 0.18))) : 1) * lerp(0.85, 1, appear);
    ctx.save(); ctx.translate(x + widths[i] / 2, y - size * 0.32); ctx.scale(pop, pop);
    ctx.globalAlpha = said ? 1 : 0.35; ctx.fillStyle = active ? RED : INK; ctx.textAlign = 'center';
    ctx.fillText(txt(w), 0, size * 0.32); ctx.restore();
    x += widths[i] + gap;
  });
  ctx.globalAlpha = 1;
}

// ---------- frame engine: one panel per scene on a long sheet of paper, the camera pans between them ----------
// scenes: { lineId: (t) => draw in local panel coordinates, t = seconds since that line started }
// shakes: [[time, amplitude px], ...] short camera shakes (an engine dies, something lands)
function createFilm(canvas, scenes, { panel = 1180, shakes = () => [], captionOpts = {} } = {}) {
  ctx = canvas.getContext('2d');
  const grain = makeGrain(W, H, 7, 215);
  const order = TL.lines.map((l) => l.id).filter((id) => scenes[id]);
  const missing = TL.lines.map((l) => l.id).filter((id) => !scenes[id]);
  if (missing.length) console.warn('lines without a scene keep the previous panel:', missing.join(', '));
  return function renderFrame(t) {
    T = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const starts = order.map((id) => L(id).start);
    let cam = 0; // pan to the next panel 0.35 s before its line starts, so the pen starts as the voice does
    starts.forEach((s, i) => { if (i > 0) cam += easeInOut(seg(t, s - 0.35, s + 0.15)); });
    let sx = 0, sy = 0;
    for (const [te, a] of shakes()) if (t > te) { const k = a * Math.exp(-(t - te) * 6); sx += (noise1(t * 40, 1) - 0.5) * 2 * k; sy += (noise1(t * 40, 2) - 0.5) * 2 * k; }
    order.forEach((id, i) => {
      const dx = (i - cam) * panel;
      if (Math.abs(dx) > W + 200) return;
      const lt = t - starts[i], zoom = 1 + 0.04 * seg(lt, 0, 6); // slow push-in keeps a still drawing alive
      ctx.save();
      ctx.translate(dx + sx + W / 2, sy + 820); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -820);
      ctx.beginPath(); ctx.rect(-(panel - W) / 2, -200, panel, H + 400); ctx.clip(); // panels never bleed into each other
      scenes[id](lt);
      ctx.restore();
    });
    captions(t, captionOpts);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6; ctx.drawImage(grain, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const v = ctx.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1300);
    v.addColorStop(0, 'rgba(90,70,40,0)'); v.addColorStop(1, 'rgba(90,70,40,0.25)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  };
}
// Load fonts + timeline, then expose window.renderFrame / window.DURATION for scripts/render.mjs.
function startFilm(canvas, makeScenes, opts) {
  window.ready = Promise.all([
    document.fonts.load('600 100px Hand', 'ěščřžýáíéůú'),
    fetch('timeline.json').then((r) => r.json()).then((j) => { TL = j; window.DURATION = j.duration; buildChunks(); }),
  ]).then(() => document.fonts.ready).then(() => {
    const o = typeof opts === 'function' ? opts() : opts || {};
    window.renderFrame = createFilm(canvas, makeScenes(), o);
  });
}
