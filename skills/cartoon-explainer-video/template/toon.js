// toon.js - coloured cartoon kit for vertical explainer films (1080x1920), drawn with Canvas 2D.
// Look: thick dark outlines that "boil" 12x a second, flat fills with a dark crescent and a light rim,
// white label boxes, a mascot in a bubble, white captions near the top.
// Film model: ONE continuous world in world units, ONE camera keyed to the voice-over's words, no cuts.
// Every frame is a pure function of t, so the render is exact and repeatable.
// Sections: helpers, geometry, pen, text + labels, sky, mascot, timeline + captions, camera, engine.

const W = 1080, H = 1920, CY = 900; // CY: screen y the camera centre maps to (a bit above middle, captions sit on top)
const OL = '#1f1a2e';               // outline ink
const C = {                         // base palette; a world adds its own colours with Object.assign(C, {...})
  white: '#fbf8f0', red: '#e5484d', redD: '#a92a32', blue: '#5aa9ff', blueD: '#2f6fc0', green: '#3fcf7c', greenD: '#21924f',
  grey: '#b9b4c8', greyD: '#7d7791', orange: '#ff9a3c', yellow: '#ffd84a', sand: '#e9b977', sandD: '#c48d55',
};

// ---------- helpers ----------
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
const backOut = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const pop = (t, a, d = 0.35) => (t < a ? 0 : backOut(seg(t, a, a + d))); // 0 → overshoot → 1, for things that pop in

let ctx = null, T = 0, TL = null;
const BOIL = 12;
// Outlines keep a constant thickness ON SCREEN whatever the zoom (world zoom x object scale);
// far, tiny objects get thinner lines so they don't turn into blobs.
function lineK() { const m = ctx.getTransform(), sc = Math.hypot(m.a, m.b); return { sc, f: clamp(sc / 0.5, 0.18, 1) }; }

// ---------- geometry (point lists, closed unless said otherwise) ----------
function densify(pts, step = 9, close = true) {
  const out = [], n = pts.length;
  let tot = 0; for (let i = 0; i < n - (close ? 0 : 1); i++) tot += Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]);
  step = Math.max(step, tot / 900); // cap the point count for huge shapes seen from close up
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 0; j < m; j++) out.push([lerp(x0, x1, j / m), lerp(y0, y1, j / m)]);
  }
  if (!close) out.push(pts[n - 1]);
  return out;
}
function rrect(x, y, w, h, r) {
  const pts = [], q = 6;
  const corner = (cx, cy, a0) => { for (let i = 0; i <= q; i++) { const a = a0 + (i / q) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return pts;
}
function circ(cx, cy, r, n = 0) {
  n = n || Math.max(14, Math.ceil(2 * Math.PI * r / 10));
  return Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cy + Math.sin(i / n * Math.PI * 2) * r]);
}
function ell(cx, cy, rx, ry, n = 48) {
  return Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * rx, cy + Math.sin(i / n * Math.PI * 2) * ry]);
}
function hexPts(cx, cy, r, rot = 0) { return Array.from({ length: 6 }, (_, i) => [cx + Math.cos(rot + i * Math.PI / 3) * r, cy + Math.sin(rot + i * Math.PI / 3) * r]); }
function starPts(cx, cy, r, inner = 0.4, n = 4) { return Array.from({ length: n * 2 }, (_, i) => { const a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? r * inner : r; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }); }
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// ---------- the pen ----------
function boil(pts, seed, amp) {
  const b = Math.floor(T * BOIL) * 31 + seed;
  return pts.map(([x, y], i) => [x + (noise1(i * 0.21, b) - 0.5) * 2 * amp, y + (noise1(i * 0.21, b + 7) - 0.5) * 2 * amp]);
}
function trace(pts, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
// Filled cartoon shape: base fill, a dark crescent (shape minus itself shifted by -sd), optionally a light rim on
// the other side (lw), living outline. w and amp are in screen pixels. Every shape needs its own seed.
function shape(pts, fill, { dark = null, light = null, w = 6, seed = 1, amp = 1.6, sd = [14, 16], lw = [8, 9], outline = OL, alpha = 1 } = {}) {
  const { sc, f } = lineK();
  const p = boil(densify(pts, 9 / sc), seed, amp * f / sc);
  w = w * f / sc;
  ctx.save(); ctx.globalAlpha *= alpha;
  trace(p); ctx.fillStyle = fill; ctx.fill();
  if (dark || light) {
    ctx.save(); trace(p); ctx.clip();
    const [ox, oy] = dark ? [-sd[0], -sd[1]] : [0, 0];
    if (dark) { ctx.fillStyle = dark; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); }
    if (light) { trace(shift(p, ox, oy)); ctx.fillStyle = light; ctx.fill(); }
    trace(light ? shift(p, ox + lw[0], oy + lw[1]) : shift(p, ox, oy)); ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  }
  if (w > 0) { trace(p); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = outline; ctx.stroke(); }
  ctx.restore();
}
// Open line; k = 0..1 draws it on progressively. dash in screen px.
function stroke(pts, { w = 6, color = OL, seed = 3, amp = 1.4, close = false, k = 1, dash = null } = {}) {
  if (k <= 0) return;
  const { sc, f } = lineK();
  let p = boil(densify(pts, 9 / sc, close), seed, amp * f / sc);
  w = w * f / sc;
  if (k < 1) p = p.slice(0, Math.max(2, Math.floor(p.length * k)));
  ctx.save(); trace(p, false); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = color;
  if (dash) ctx.setLineDash(dash.map((d) => d / sc));
  ctx.stroke(); ctx.restore();
}
function arrowHead(x, y, ang, s = 26, color = OL, seed = 5) {
  stroke([[x + Math.cos(ang + 2.6) * s, y + Math.sin(ang + 2.6) * s], [x, y], [x + Math.cos(ang - 2.6) * s, y + Math.sin(ang - 2.6) * s]], { w: 7, color, seed });
}
function burst(x, y, k, r = 120, color = C.yellow, seed = 900) { // comic "impact" star, k 0..1
  if (k <= 0 || k >= 1) return;
  shape(starPts(x, y, r * easeOut(k), 0.5, 10), color, { w: 6, seed, alpha: 1 - seg(k, 0.6, 1) });
}
function redX(x, y, s, k, seed = 950) {
  stroke([[x - s, y - s], [x + s, y + s]], { w: 16, color: C.red, seed, k: seg(k, 0, 0.5) });
  stroke([[x + s, y - s], [x - s, y + s]], { w: 16, color: C.red, seed: seed + 1, k: seg(k, 0.5, 1) });
}

// ---------- text + labels (screen space) ----------
function text(str, x, y, size, { color = OL, font = 'Hand', align = 'center', stroke: sw = 0, sc = OL, rot = 0, alpha = 1 } = {}) {
  const b = Math.floor(T * BOIL);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x + (hash2(b, size) - 0.5) * 2, y + (hash2(b, size + 1) - 0.5) * 2); ctx.rotate(rot);
  ctx.font = `${size}px ${font}, Label`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (sw) { ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = sc; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.restore();
}
// White box with an outline and short CAPS text ("6.5 m", "5 LAYERS"). k = pop-in scale (use pop()).
function label(str, x, y, k, { size = 50, fill = C.white, color = OL, rot = 0 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  ctx.font = `${size}px Label`;
  const w = ctx.measureText(str).width + size * 0.9, h = size * 1.45;
  shape(rrect(-w / 2, -h / 2, w, h, 12), fill, { w: 5, seed: str.length * 7, amp: 1.1 });
  text(str, 0, size * 0.04, size, { color, font: 'Label' });
  ctx.restore();
}

// ---------- sky (screen space) ----------
function vgrad(stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
}
// Twinkling stars with a little parallax from the camera, so camera motion reads even on empty sky.
function starfield(n = 160, par = 0.004) {
  const ox = -CAM.x * par, oy = -CAM.y * par;
  for (let i = 0; i < n; i++) {
    const x = ((hash2(i, 1) * 1400 + ox) % 1400 + 1400) % 1400 - 160, y = ((hash2(i, 2) * 2200 + oy) % 2200 + 2200) % 2200 - 140, r = 1.4 + hash2(i, 3) * 3.4;
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(T * (1.5 + hash2(i, 4) * 3) + i); ctx.fillStyle = i % 9 ? '#fff' : '#ffe7a8';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- mascot: a little astronaut in a bubble that reacts to the story ----------
// moods: ok, happy, worried, shock, no (shakes head), hot (sweats), shiver
function mascot(x, y, k, mood = 'ok', r = 92) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y + Math.sin(T * 2.4) * 6); ctx.scale(k, k);
  if (mood === 'no') ctx.rotate(Math.sin(T * 14) * 0.12);
  if (mood === 'shiver') ctx.translate(Math.sin(T * 60) * 3, 0);
  shape(circ(0, 0, r), 'rgba(255,255,255,0.92)', { w: 6, seed: 801, amp: 1 });
  shape(rrect(-46, 28, 92, 70, 20), C.white, { dark: '#d8d3e4', w: 5, seed: 802, amp: 1 });
  shape(circ(0, -6, 52), C.white, { dark: '#d8d3e4', w: 6, seed: 803, amp: 1 });
  shape(ell(0, -4, 38, 30), '#2a2f5c', { w: 5, seed: 804, amp: 0.8 });
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-16, -18, 9, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  const blink = (T % 3.1) < 0.12;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    if (blink) { ctx.fillRect(s * 13 - 7, -6, 14, 3); continue; }
    if (mood === 'happy') { ctx.beginPath(); ctx.arc(s * 13, -5, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(s * 13, -5, mood === 'shock' ? 7.5 : 6, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(0, 6, 11, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === 'shock') ctx.ellipse(0, 12, 6, 8, 0, 0, Math.PI * 2);
  else if (mood === 'worried' || mood === 'shiver') { ctx.moveTo(-10, 14); ctx.quadraticCurveTo(-5, 9, 0, 14); ctx.quadraticCurveTo(5, 19, 10, 14); }
  else if (mood === 'no') { ctx.moveTo(-9, 14); ctx.lineTo(9, 14); }
  else ctx.arc(0, 4, 9, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  if (mood === 'worried' || mood === 'hot') { const d = (T * 0.8) % 1; shape([[44, -40 + d * 30], [52, -22 + d * 30], [44, -14 + d * 30], [36, -22 + d * 30]], '#9fd4ff', { w: 3, seed: 805, amp: 0.5 }); }
  if (mood === 'happy') for (let i = 0; i < 3; i++) { const a = -1.8 + i * 0.6, s = 0.6 + 0.4 * Math.sin(T * 6 + i); ctx.fillStyle = C.yellow; trace(starPts(Math.cos(a) * 120, Math.sin(a) * 120, 16 * s)); ctx.fill(); }
  ctx.restore();
}

// ---------- timeline (voice-over skill's vo_timeline.py, or scripts/tts_placeholder.py) ----------
const L = (id) => { const l = TL.lines.find((l) => l.id === id); if (!l) throw new Error(`no line "${id}" in timeline.json`); return l; };
const normW = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
// absolute time of the first word in line `id` starting with `prefix` (warns and falls back to the line start)
function at(id, prefix) {
  const l = L(id), w = l.words.find((w) => normW(w.w).startsWith(normW(prefix)));
  if (!w) console.warn(`at(): no word "${prefix}" in line ${id}`);
  return w ? w.t0 : l.start;
}

// ---------- captions: 1-3 words, white with a dark outline near the top, the spoken word in yellow ----------
let CHUNKS = [];
function buildChunks(maxWords = 3, maxChars = 18) {
  CHUNKS = [];
  for (const l of TL.lines) {
    let cur = [];
    const ws = l.words.filter((w) => (w.show ?? w.w) !== '');
    ws.forEach((w, i) => {
      cur.push(w);
      const s = (x) => x.show ?? x.w, next = ws[i + 1], len = cur.map(s).join(' ').length;
      if (!next || /[.,:;?!…]$/.test(s(w)) || cur.length >= maxWords || len + s(next).length + 1 > maxChars) { CHUNKS.push(cur); cur = []; }
    });
  }
}
const capText = (w) => (w.show ?? w.w).replace(/[.,:;]$/, ''); // the reference keeps captions free of trailing punctuation
function captions(t, y = 320, size = 104) {
  const i = CHUNKS.findIndex((c, i) => t >= c[0].t0 - 0.08 && t < (CHUNKS[i + 1] ? Math.min(CHUNKS[i + 1][0].t0 - 0.08, c[c.length - 1].t1 + 0.7) : c[c.length - 1].t1 + 0.9));
  if (i < 0) return;
  const c = CHUNKS[i];
  ctx.font = `${size}px Hand, Label`;
  const gap = ctx.measureText(' ').width, ws = c.map((w) => ctx.measureText(capText(w)).width);
  let x = (W - ws.reduce((a, b) => a + b, 0) - gap * (c.length - 1)) / 2;
  const appear = easeOut(seg(t, c[0].t0 - 0.08, c[0].t0 + 0.1));
  c.forEach((w, j) => {
    const active = t >= w.t0 - 0.03 && t < (c[j + 1] ? c[j + 1].t0 : w.t1 + 0.5);
    const p = lerp(0.85, 1, appear) * (active ? 1 + 0.1 * (1 - easeOut(seg(t, w.t0, w.t0 + 0.2))) : 1);
    ctx.save(); ctx.translate(x + ws[j] / 2, y); ctx.scale(p, p);
    text(capText(w), 0, 0, size, { color: active ? C.yellow : '#ffffff', stroke: 14, alpha: appear });
    ctx.restore();
    x += ws[j] + gap;
  });
}

// ---------- camera ----------
// keys: [[time, target, zoom], ...]; target is [x, y] or (t) => [x, y] (so a key can FOLLOW a moving object),
// zoom is a number or (t) => number (e.g. "fit these two things"). Eased between keys, zoom interpolated in log space.
let CAM = { x: 0, y: 0, z: 1 };
const toScreen = (x, y) => [(x - CAM.x) * CAM.z + W / 2, (y - CAM.y) * CAM.z + CY];
function camera(t, ks) {
  let i = 0; while (i + 1 < ks.length && t >= ks[i + 1][0]) i++;
  const ev = (k) => (typeof k[1] === 'function' ? k[1](t) : k[1]), zv = (k) => (typeof k[2] === 'function' ? k[2](t) : k[2]);
  if (i + 1 >= ks.length || t <= ks[0][0]) { const k = ks[Math.min(i, ks.length - 1)], [x, y] = ev(k); return { x, y, z: zv(k) }; }
  const a = ks[i], b = ks[i + 1], u = easeInOut(seg(t, a[0], b[0]));
  const za = zv(a), zb = zv(b), z = Math.exp(lerp(Math.log(za), Math.log(zb), u));
  // on a big zoom change, move the centre with 1/zoom: the subject stays on screen instead of swinging out
  const v = Math.abs(Math.log(zb / za)) > 0.7 ? (1 / z - 1 / za) / (1 / zb - 1 / za) : u;
  const [ax, ay] = ev(a), [bx, by] = ev(b);
  return { x: lerp(ax, bx, v), y: lerp(ay, by, v), z };
}

// ---------- engine ----------
function makeGrain(seed) {
  const c = document.createElement('canvas'); c.width = 540; c.height = 960;
  const g = c.getContext('2d'), img = g.createImageData(540, 960);
  for (let i = 0; i < img.data.length; i += 4) { const v = 150 + hash2(i, seed) * 105; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
// film = () => ({ camKeys: [...], sky(t), world(t), overlay(t), shakes: [[time, px], ...] })
//   sky: screen-space background; world: drawn under the camera (world units); overlay: screen space (labels, mascot).
// Exposes window.ready / window.DURATION / window.renderFrame(t) for scripts/render.mjs.
function startFilm(makeFilm) {
  window.ready = Promise.all([
    document.fonts.load('80px Hand'), document.fonts.load('40px Label'),
    fetch('timeline.json').then((r) => r.json()).then((j) => { TL = j; window.DURATION = j.duration; buildChunks(); }),
  ]).then(() => {
    ctx = document.getElementById('c').getContext('2d');
    const film = makeFilm(), grain = makeGrain(9);
    window.renderFrame = (t) => {
      T = t;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      CAM = camera(t, film.camKeys);
      let sx = 0, sy = 0; // short camera shakes on impacts
      for (const [te, a] of film.shakes || []) if (t > te) { const k = a * Math.exp(-(t - te) * 7); sx += (noise1(t * 40, 1) - 0.5) * 2 * k; sy += (noise1(t * 40, 2) - 0.5) * 2 * k; }
      film.sky(t);
      ctx.save(); ctx.translate(W / 2 + sx, CY + sy); ctx.scale(CAM.z, CAM.z); ctx.translate(-CAM.x, -CAM.y);
      film.world(t);
      ctx.restore();
      ctx.save(); ctx.translate(sx * 0.5, sy * 0.5); film.overlay(t); ctx.restore();
      captions(t);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.22; ctx.drawImage(grain, 0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    };
  });
}
