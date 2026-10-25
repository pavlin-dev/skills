// Props for dressing a set densely: a set with nothing behind the characters looked "poor", and a bare wall still
// looked cheap next to good characters. Every builder takes a parent (a set group or the scene) and a position,
// returns its group, and uses only the toon toolkit, so outlines, shading and glow work as everywhere else.
// Lights (lamps, candles) mark their bulb with glowy() so only they bloom.
import { THREE, obj, toon, RB, texT, glowy } from './toon.js';

const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
const css = (c) => '#' + new THREE.Color(c).getHexString();
function grp(parent, x, y, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // deterministic: the same set every frame
const BOOKS = [0xb5523b, 0x3a6fb0, 0xf2c14e, 0x6a8f3a, 0x8a5a3a, 0xd96c75, 0x2f4f6f];

// a wall shelf (or a standing bookcase with levels > 1) filled with books of varied height, a plant and a jar
export function shelf(parent, x, y, z, { w = 1.0, levels = 1, ry = 0, color = 0x8a5a3a } = {}) {
  const g = grp(parent, x, y, z, ry), H = 0.36;
  if (levels > 1) { for (const sx of [-1, 1]) obj(RB(0.04, levels * H + 0.04, 0.28, 0.01), toon(color), sx * (w / 2), levels * H / 2, 0, g); obj(RB(w, levels * H, 0.02, 0.005), toon(color), 0, levels * H / 2, -0.13, g); }
  for (let l = 0; l < levels; l++) { const yy = l * H; obj(RB(w + 0.04, 0.04, 0.28, 0.01), toon(color), 0, yy, 0, g);
    let bx = -w / 2 + 0.05; while (bx < w / 2 - 0.25) { const bw = 0.04 + 0.03 * rnd(), bh = 0.18 + 0.12 * rnd();
      const b = obj(RB(bw, bh, 0.2, 0.008), toon(BOOKS[Math.floor(rnd() * BOOKS.length)]), bx + bw / 2, yy + 0.02 + bh / 2, 0, g); if (rnd() < 0.15) b.rotation.z = 0.25; bx += bw + 0.008; }
    if (l === levels - 1 || levels === 1) plant(g, w / 2 - 0.12, yy + 0.02, 0, 0.45); else obj(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), toon(0xa3c4bc), w / 2 - 0.1, yy + 0.09, 0, g); }
  if (levels > 1) obj(RB(w + 0.04, 0.04, 0.28, 0.01), toon(color), 0, levels * H, 0, g);
  return g;
}
// a potted plant: a pot and a few overlapping leaf balls (s = size)
export function plant(parent, x, y, z, s = 1, leaf = 0x6a9f4a) {
  const g = grp(parent, x, y, z); g.scale.setScalar(s);
  obj(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 14), toon(0xc8643c), 0, 0.13, 0, g);
  for (const [lx, ly, lz, r] of [[0, 0.42, 0, 0.2], [-0.12, 0.34, 0.05, 0.14], [0.12, 0.36, -0.04, 0.15], [0.03, 0.56, 0.02, 0.12]]) obj(new THREE.SphereGeometry(r, 14, 10), toon(leaf), lx, ly, lz, g);
  return g;
}
// a floor lamp or a table lamp (small = true); the bulb glows
export function lamp(parent, x, y, z, { small = false, shade = 0xf2c14e } = {}) {
  const g = grp(parent, x, y, z), h = small ? 0.28 : 1.45, r = small ? 0.11 : 0.2;
  obj(new THREE.CylinderGeometry(small ? 0.07 : 0.16, small ? 0.08 : 0.18, 0.03, 16), toon(0x3a3a3a), 0, 0.015, 0, g);
  obj(new THREE.CylinderGeometry(0.012, 0.012, h, 8), toon(0x3a3a3a), 0, h / 2, 0, g);
  obj(new THREE.CylinderGeometry(r * 0.6, r, r * 1.1, 16, 1, true), new THREE.MeshToonMaterial({ color: shade, side: THREE.DoubleSide }), 0, h + r * 0.35, 0, g);
  glowy(obj(new THREE.SphereGeometry(r * 0.32, 12, 8), basic(0xfff3cf), 0, h + r * 0.15, 0, g));
  const light = new THREE.PointLight(0xffd9a0, small ? 0.8 : 1.6, small ? 2.5 : 4, 1.5); light.position.y = h; g.add(light);
  return g;
}
// a window with a sash cross and two curtains (sky = the colour seen outside; not glowy: a big bright pane haloes)
export function windowWithCurtains(parent, x, y, z, { w = 1.1, h = 1.0, ry = 0, sky = 0xbfe6ff, curtain = 0xd9534f } = {}) {
  const g = grp(parent, x, y, z, ry);
  obj(RB(w + 0.1, h + 0.1, 0.06, 0.02), toon(0xf4efe4), 0, 0, 0, g); obj(new THREE.PlaneGeometry(w - 0.04, h - 0.04), basic(sky), 0, 0, 0.035, g, 0);
  obj(RB(0.04, h - 0.04, 0.03, 0.01), toon(0xf4efe4), 0, 0, 0.04, g); obj(RB(w - 0.04, 0.04, 0.03, 0.01), toon(0xf4efe4), 0, 0, 0.04, g);
  obj(RB(0.18, 0.05, 0.12, 0.02), toon(0xf4efe4), 0, -h / 2 - 0.06, 0.06, g); obj(RB(w + 0.6, 0.03, 0.03, 0.01), toon(0x8a5a3a), 0, h / 2 + 0.12, 0.08, g);
  for (const sx of [-1, 1]) { const c = obj(RB(0.26, h + 0.3, 0.06, 0.03), toon(curtain), sx * (w / 2 + 0.12), -0.03, 0.09, g); c.scale.x = 1 + 0.15 * rnd(); }
  return g;
}
// a framed picture: a few flat shapes on a coloured ground
export function picture(parent, x, y, z, { w = 0.5, h = 0.4, ry = 0, frame = 0xc9a23a, bg = 0x4a6a8a } = {}) {
  const g = grp(parent, x, y, z, ry);
  obj(RB(w + 0.06, h + 0.06, 0.03, 0.01), toon(frame), 0, 0, 0, g);
  const k = rnd();
  obj(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texT(200, 160, (c) => { c.fillStyle = css(bg); c.fillRect(0, 0, 200, 160); c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(60 + 80 * k, 50, 22, 0, 7); c.fill(); c.fillStyle = '#6a9f4a'; c.beginPath(); c.moveTo(0, 160); c.lineTo(70, 80); c.lineTo(130, 130); c.lineTo(200, 70); c.lineTo(200, 160); c.fill(); }) }), 0, 0, 0.017, g, 0);
  return g;
}
// a round wall clock showing a time (hours, minutes)
export function wallClock(parent, x, y, z, { r = 0.17, ry = 0, hh = 10, mm = 10 } = {}) {
  const g = grp(parent, x, y, z, ry);
  obj(new THREE.CylinderGeometry(r, r, 0.04, 28), toon(0x3a3a3a), 0, 0, 0, g).rotation.x = Math.PI / 2;
  obj(new THREE.CircleGeometry(r * 0.86, 28), new THREE.MeshBasicMaterial({ map: texT(256, 256, (c) => { c.fillStyle = '#fbf7ee'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#1f1611'; for (let i = 0; i < 12; i++) { const a = i / 6 * Math.PI; c.fillRect(124 + Math.cos(a) * 100, 124 + Math.sin(a) * 100, 8, 8); }
    c.strokeStyle = '#1f1611'; c.lineCap = 'round'; for (const [a, L, wd] of [[(hh % 12 + mm / 60) / 6 * Math.PI, 55, 12], [mm / 30 * Math.PI, 85, 8]]) { c.lineWidth = wd; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(a) * L, 128 - Math.cos(a) * L); c.stroke(); } }) }), 0, 0, 0.022, g, 0);
  return g;
}
// a low table with clutter on it: a mug, a stack of magazines, a small bowl
export function coffeeTable(parent, x, z, { w = 0.8, d = 0.45, ry = 0, color = 0x8a5a3a } = {}) {
  const g = grp(parent, x, 0, z, ry);
  obj(RB(w, 0.05, d, 0.02), toon(color), 0, 0.36, 0, g); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) obj(RB(0.05, 0.34, 0.05, 0.01), toon(color), sx * (w / 2 - 0.05), 0.17, sz * (d / 2 - 0.05), g);
  obj(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 12), toon(0xf4efe4), w * 0.25, 0.425, 0.05, g); // mug
  for (let i = 0; i < 3; i++) obj(RB(0.22, 0.015, 0.16, 0.004), toon([0xd9534f, 0x3a6fb0, 0xf4efe4][i]), -w * 0.18, 0.392 + i * 0.016, -0.02, g).rotation.y = 0.2 * (i - 1);
  obj(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x9fb7e0), 0.05, 0.455, -0.1, g);
  return g;
}
// a side table with a table lamp and a book
export function sideTable(parent, x, z, { ry = 0, color = 0x6a4630 } = {}) {
  const g = grp(parent, x, 0, z, ry);
  obj(RB(0.42, 0.5, 0.38, 0.03), toon(color), 0, 0.25, 0, g); obj(RB(0.3, 0.02, 0.01, 0.005), toon(0xc9a23a), 0, 0.33, 0.195, g);
  lamp(g, 0.06, 0.5, -0.04, { small: true }); obj(RB(0.14, 0.03, 0.1, 0.006), toon(0x3a6fb0), -0.1, 0.515, 0.08, g);
  return g;
}
// a striped rug (round or rectangular)
// (a plain field with a border and thin lines: big high-contrast stripes shouted over the characters)
export function rug(parent, x, z, { w = 1.6, d = 1.1, round = false, a = '#c9574f', b = '#e9c27a' } = {}) {
  const t = texT(256, 256, (c) => { c.fillStyle = a; c.fillRect(0, 0, 256, 256); c.strokeStyle = b; c.lineWidth = 12; c.strokeRect(14, 14, 228, 228); c.lineWidth = 4; c.strokeRect(34, 34, 188, 188);
    c.fillStyle = b; for (let i = 0; i < 4; i++) c.fillRect(60, 80 + i * 32, 136, 3); });
  const m = obj(round ? new THREE.CircleGeometry(w / 2, 40) : new THREE.PlaneGeometry(w, d), toon(0xffffff, t), x, 0.006, z, parent, 0); m.rotation.x = -Math.PI / 2; return m;
}
// sofa cushions in contrasting colours (put them on a sofa seat: y = seat top)
export function cushions(parent, x, y, z, { n = 2, spread = 0.7, colors = [0x3a6fb0, 0xf4efe4, 0x6a8f3a] } = {}) {
  const g = grp(parent, x, y, z);
  for (let i = 0; i < n; i++) { const c = obj(RB(0.3, 0.28, 0.1, 0.05), toon(colors[i % colors.length]), (i - (n - 1) / 2) * spread, 0.14, 0, g); c.rotation.set(-0.25, 0.15 * (i % 2 ? 1 : -1), 0.12 * (i % 2 ? -1 : 1)); }
  return g;
}
// storage clutter: a wooden crate and a barrel
export function crate(parent, x, y, z, s = 0.45, color = 0xa8743f) { return obj(RB(s, s, s, 0.02), toon(color, texT(128, 128, (c) => { c.fillStyle = css(color); c.fillRect(0, 0, 128, 128); c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 3; i++) c.fillRect(0, i * 43 + 40, 128, 4); })), x, y + s / 2, z, parent); }
export function barrel(parent, x, z, color = 0x8a5a3a) {
  const g = grp(parent, x, 0, z); obj(new THREE.CylinderGeometry(0.26, 0.26, 0.7, 16), toon(color), 0, 0.35, 0, g);
  for (const y of [0.15, 0.55]) obj(new THREE.TorusGeometry(0.265, 0.018, 6, 20), toon(0x3a3a3a), 0, y, 0, g).rotation.x = Math.PI / 2;
  return g;
}
// outdoors: a market stall with a striped awning and round goods, and a string of pennant flags between two points
export function stall(parent, x, z, { ry = 0, a = '#d83a3a', b = '#fff4e0', goods = [0xd83a3a, 0xf2c14e, 0x6a8f3a] } = {}) {
  const g = grp(parent, x, 0, z, ry);
  obj(RB(1.6, 0.85, 0.7, 0.03), toon(0x8a5a3a), 0, 0.42, 0, g);
  for (const sx of [-0.75, 0.75]) obj(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), toon(0x5a3a24), sx, 1.05, 0.3, g);
  const aw = obj(RB(1.8, 0.05, 0.9, 0.02), toon(0xffffff, texT(256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? a : b; c.fillRect(i * 32, 0, 32, 64); } })), 0, 2.05, 0.15, g); aw.rotation.x = 0.25;
  for (let i = 0; i < 7; i++) obj(new THREE.SphereGeometry(0.09, 10, 8), toon(goods[i % goods.length]), -0.6 + i * 0.2, 0.92, -0.05 + (i % 2) * 0.15, g);
  return g;
}
export function pennants(parent, from, to, { n = 9, sag = 0.25, colors = [0xd83a3a, 0xf2c14e, 0x3a6fb0] } = {}) {
  const g = new THREE.Group(); parent.add(g);
  for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, p = from.clone().lerp(to, u); p.y -= sag * Math.sin(u * Math.PI);
    const f = obj(new THREE.ConeGeometry(0.12, 0.25, 3), toon(colors[k % colors.length]), p.x, p.y - 0.12, p.z, g); f.rotation.x = Math.PI; }
  return g;
}
