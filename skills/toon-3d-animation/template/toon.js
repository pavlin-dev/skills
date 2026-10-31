// Toon toolkit for cartoon 3D story videos: big round white heads with drawn faces, hair in locks, bean-shaped
// shirts, rubber-hose limbs, two-tone shading, screen-space ink outlines, depth of field and glow on lights.
// Everything is deterministic (no clocks, no randomness): the page renders any time t on request, so the renderer
// can capture it frame by frame.
//
// Exports: the scene/camera/renderer, helpers (clamp, ss, eio, back, ...), obj/toon/RB for building sets,
// makeChar (characters with faces, poses, arm IK; EYES styles), life/faceAt/mouth (keep characters alive),
// keyed/faceKeys (gestures and faces timed to words), camera helpers (shotCam, punch), makePhone/holdPhone/typed
// (a phone held in two hands that tap as the keys light up), makeLaptop/makeTV (live canvas screens),
// glowy/headLift/LOOK/FOCUS (the look), loadTimeline/captions/present.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';
export { THREE };

export const W = 1080, H = 1920;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const eio = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eout = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const back = (t) => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }; // overshoot
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const vl = (a, b, t) => a.clone().lerp(b, t);
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1; }
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); if (draw) draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, ctx, t };
}
export const texT = (w, h, draw) => canvasTex(w, h, draw).t;
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ---------- renderer: supersampled, flat colours (no tone mapping), soft shadows ----------
const SS = Number(new URLSearchParams(location.search).get('ss') || 1.5); // 1 = faster previews
export const octx = document.getElementById('c').getContext('2d');
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(Math.round(W * SS), Math.round(H * SS), false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
export const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbfe3f2);
export const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 80);
export const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 20 }); sun.shadow.bias = -0.0008; scene.add(sun, sun.target);
export const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3); scene.add(hemi);
export const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(-4, 3, 2); scene.add(fill); // faces turned from the sun stay white

// ---------- materials, outlines, building blocks ----------
const grad = (() => { const d = new Uint8Array([120, 200, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const grad2 = (() => { const d = new Uint8Array([150, 255]); const t = new THREE.DataTexture(d, 2, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })(); // two tones: light and one shadow
export const toon = (color, map) => new THREE.MeshToonMaterial({ color, map: map || null, gradientMap: grad });
export const INK = 0x1f1611; // warm near-black, like a drawn line
export const POST_INK = true; // outlines drawn in screen space by renderInk(); false = the old inverted hulls
export const BLACK = new THREE.MeshBasicMaterial({ color: INK });
const inkMats = {};
function inkMat(th) { // back faces pushed out along the normal: the outline
  if (inkMats[th]) return inkMats[th];
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${th.toFixed(4)};`); };
  return (inkMats[th] = m);
}
// a mesh; ink = inverted-hull outline thickness in metres, only used when POST_INK is false
export function obj(geo, mat, x = 0, y = 0, z = 0, parent = scene, ink = 0.012) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m);
  if (ink && !POST_INK) { const o = new THREE.Mesh(geo, inkMat(ink)); o.castShadow = false; m.add(o); }
  return m;
}
export const RB = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const ballGeo = new THREE.SphereGeometry(1, 16, 12);
// a stick (unit cylinder) from a to b
export function seg(m, a, b, r) { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); m.scale.set(r, d.length(), r); }

// ---------- faces ----------
// drawn on a canvas wrapped on the front of the head, built from parts (brows, lidded eyes, nose, mouth)
// so every expression is a set of numbers. spec = "<kind>[|o<0..1>][|b][|h]": kind, mouth open (talking),
// blink (closed), half-closed (the frame before and after a blink).
// kinds: smile, happy, proud, sly, flat, grim, surprised, scared, angry, pain, sleep, shrug, awe, wistful, talk
const FACES = {
  //        brow raise, brow tilt (+ = inner end down), lid (0 open .. 1 closed), lid tilt, eye scale, mouth
  smile:     { br: 6, bt: 0, lid: 0, lt: 0, es: 1, m: 'smile' },
  happy:     { br: 14, bt: -0.1, lid: 0, lt: 0, es: 1, m: 'grin', arc: true },
  proud:     { br: 12, bt: -0.12, lid: 0.45, lt: 0, es: 1, m: 'smirk' },
  sly:       { br: 2, bt: 0.18, lid: 0.5, lt: -0.15, es: 1, m: 'smirk' },
  flat:      { br: 0, bt: 0, lid: 0.42, lt: 0, es: 1, m: 'flat' },
  grim:      { br: -6, bt: 0.22, lid: 0.35, lt: 0.1, es: 1, m: 'flat' },
  surprised: { br: 26, bt: -0.1, lid: 0, lt: 0, es: 1.25, m: 'o' },
  scared:    { br: 20, bt: -0.35, lid: 0, lt: 0, es: 1.15, m: 'wavy', small: true },
  angry:     { br: -10, bt: 0.45, lid: 0.3, lt: 0.35, es: 1, m: 'frown' },
  pain:      { br: 4, bt: -0.3, lid: 0, lt: 0, es: 1, m: 'zigzag', squint: true, sweat: true },
  sleep:     { br: -2, bt: 0, lid: 1, lt: 0, es: 1, m: 'smallo' },
  shrug:     { br: 16, bt: -0.3, lid: 0, lt: 0, es: 1, m: 'crooked' },
  awe:       { br: 22, bt: -0.15, lid: 0, lt: 0, es: 1.3, m: 'o', shine: true },
  wistful:   { br: 6, bt: -0.25, lid: 0.45, lt: -0.25, es: 1, m: 'smile' },
  talk:      { br: 8, bt: 0, lid: 0, lt: 0, es: 1, m: 'smile' },
  // for EYES.round (white eyes with pupils): gx/gy = where the pupils look (-1..1), spiral = dizzy-happy rings
  worried:   { br: 20, bt: -0.42, lid: 0, lt: 0, es: 1.05, m: 'wavy', gx: 0.15, gy: 0.1 },
  dizzy:     { br: 18, bt: -0.15, lid: 0, lt: 0, es: 1.05, m: 'grin', spiral: true },
  bored:     { br: 2, bt: 0, lid: 0.5, lt: -0.06, es: 1, m: 'smallflat', gy: 0.35 },
  glad:      { br: 14, bt: -0.12, lid: 0, lt: 0, es: 1, m: 'grin', gy: -0.05 },
};
// eye styles: size (rx, ry), spacing (ex) and catchlights (shine: 0, 1 or 2 white dots, hr = their size)
export const EYES = {
  big:      { rx: 31, ry: 43, ex: 92, shine: 0, hr: 9 },
  tallDot:  { rx: 19, ry: 33, ex: 84, shine: 1, hr: 7 },
  tall:     { rx: 17, ry: 32, ex: 84, shine: 0, hr: 6 },
  tall2:    { rx: 22, ry: 38, ex: 88, shine: 2, hr: 8 },
  small:    { rx: 14, ry: 20, ex: 80, shine: 1, hr: 5 },
  cute:     { rx: 30, ry: 42, ex: 94, shine: 2, hr: 11 },
  // like the reference shorts: big white eyes with a thick outline and a round black pupil, no nose, mouths with teeth and tongue
  round:    { rx: 46, ry: 50, ex: 74, shine: 1, hr: 6, sclera: true, pr: 21 },
};
export function drawFace(x, spec, s = 512, E = EYES.tallDot) {
  const parts = spec.split('|'), F = FACES[parts[0]] || FACES.smile, blink = parts.includes('b'), half = parts.includes('h');
  const open = +((parts.find((q) => q[0] === 'o') || 'o0').slice(1));
  x.clearRect(0, 0, s, s); x.strokeStyle = x.fillStyle = '#141414'; x.lineCap = x.lineJoin = 'round';
  const cx = s / 2, ey = 228, ex = E.ex, my = 326;
  // brows: thick short bars, always there, they carry most of the acting
  x.lineWidth = 28;
  for (const sd of [-1, 1]) { const bx = cx + sd * ex, by = ey - E.ry - 38 - F.br, // brows sit just above the eye, whatever its size
      t = F.bt * sd;
    x.beginPath(); const inner = bx - sd * 40, outer = bx + sd * 40; x.moveTo(outer, by - 38 * Math.sin(t)); x.quadraticCurveTo(bx, by - 12 - 38 * Math.sin(t) * 0.2, inner, by + 38 * Math.sin(t)); x.stroke(); }
  // eyes: black ovals cut by an upper lid line; closed = a curved line
  let lid = blink ? 1 : half ? Math.max(F.lid, 0.6) : F.lid;
  for (const sd of [-1, 1]) {
    const exx = cx + sd * ex, rx = E.rx * F.es, ry = E.ry * F.es;
    if (F.squint && !blink) { x.lineWidth = 20; x.beginPath(); x.moveTo(exx - sd * 26, ey - 22); x.lineTo(exx + sd * 18, ey); x.lineTo(exx - sd * 26, ey + 22); x.stroke(); continue; }
    if (lid >= 0.95) { x.lineWidth = 18; x.beginPath(); if (F.arc && !blink) { x.arc(exx, ey + 18, 30, Math.PI * 1.15, Math.PI * 1.85); } else { x.moveTo(exx - 30, ey + 4); x.quadraticCurveTo(exx, ey + 18, exx + 30, ey + 4); } x.stroke(); continue; }
    if (F.arc) { x.lineWidth = 18; x.beginPath(); x.arc(exx, ey + 18, 30, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); continue; }
    const tilt = F.lt * sd * 30, ly = ey - ry + 2 * ry * lid;
    if (E.sclera) { // white eye: clipped under the lid, pupil looks where gx/gy say, outline drawn last
      const cy = lid > 0.05 ? ly : ey - ry - 20; // fully open: clip above the outline, so its top isn't cut off
      x.save(); x.beginPath(); x.moveTo(exx - rx - 16, cy + (lid > 0.05 ? tilt : 0)); x.lineTo(exx + rx + 16, cy - (lid > 0.05 ? tilt : 0)); x.lineTo(exx + rx + 16, ey + ry + 16); x.lineTo(exx - rx - 16, ey + ry + 16); x.closePath(); x.clip();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(exx, ey, rx, ry, 0, 0, 7); x.fill(); x.fillStyle = '#141414';
      const px = exx + (F.gx ?? 0) * rx * 0.42, py = ey + (F.gy ?? 0) * ry * 0.42, pr = E.pr * F.es * (F.small ? 0.65 : 1);
      if (F.spiral) { x.lineWidth = 7; for (const r of [8, 18, 28]) { x.beginPath(); x.arc(exx, ey, r, 0, 7); x.stroke(); } }
      else { x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(px - pr * 0.35, py - pr * 0.4, E.hr, 0, 7); x.fill(); x.fillStyle = '#141414'; }
      x.lineWidth = 11; x.beginPath(); x.ellipse(exx, ey, rx, ry, 0, 0, 7); x.stroke(); x.restore();
      if (lid > 0.05) { x.lineWidth = 12; x.beginPath(); x.moveTo(exx - rx - 4, ly + tilt); x.lineTo(exx + rx + 4, ly - tilt); x.stroke(); }
      continue; }
    x.save(); x.beginPath(); x.moveTo(exx - rx - 12, ly + tilt); x.lineTo(exx + rx + 12, ly - tilt); x.lineTo(exx + rx + 12, ey + ry + 4); x.lineTo(exx - rx - 12, ey + ry + 4); x.closePath(); x.clip();
    x.beginPath(); x.ellipse(exx, ey, rx, ry, 0, 0, 7); x.fill();
    const sh = Math.max(E.shine, F.shine ? 2 : F.small ? 1 : 0); if (sh) { x.fillStyle = '#fff'; const hr = (F.small ? 1.4 : 1) * E.hr * F.es; x.beginPath(); x.arc(exx - rx * 0.3, ey - ry * 0.38, hr, 0, 7); x.fill(); if (sh > 1) { x.beginPath(); x.arc(exx + rx * 0.32, ey + ry * 0.3, hr * 0.5, 0, 7); x.fill(); } x.fillStyle = '#141414'; }
    x.restore();
    if (lid > 0.25) { x.lineWidth = Math.min(14, 6 + rx * 0.3); const o = Math.min(8, rx * 0.3); x.beginPath(); x.moveTo(exx - rx - o, ly + tilt); x.lineTo(exx + rx + o, ly - tilt); x.stroke(); } // a lid line only when the eye is really half closed
  }
  // a small nose (none with white eyes)
  if (!E.sclera) { x.lineWidth = 10; x.beginPath(); x.arc(cx + 4, ey + 52, 12, 0.1 * Math.PI, 0.9 * Math.PI); x.stroke(); }
  // mouth
  x.lineWidth = 14; x.beginPath();
  const m = open > 0 && ['smile', 'flat', 'smirk', 'crooked', 'frown'].includes(F.m) ? 'talk' : F.m;
  if (E.sclera && (m === 'talk' || m === 'grin')) { // an open mouth with dark inside, upper teeth and a tongue, outlined
    const h = m === 'grin' ? 64 : 16 + 44 * open, w = m === 'grin' ? 62 : 44, P = new Path2D();
    P.moveTo(cx - w, my - 12); P.quadraticCurveTo(cx, my - 2, cx + w, my - 12); P.quadraticCurveTo(cx + w * 0.85, my - 12 + h, cx, my - 10 + h); P.quadraticCurveTo(cx - w * 0.85, my - 12 + h, cx - w, my - 12);
    x.save(); x.fillStyle = '#5b1d1d'; x.fill(P); x.clip(P); x.fillStyle = '#fff'; x.fillRect(cx - w, my - 30, 2 * w, 30 + h * 0.18);
    x.fillStyle = '#e0607a'; x.beginPath(); x.ellipse(cx, my - 10 + h, w * 0.55, h * 0.38, 0, 0, 7); x.fill(); x.restore();
    x.lineWidth = 10; x.stroke(P); x.beginPath(); }
  else if (m === 'talk') { const h = 10 + 46 * open; x.moveTo(cx - 42, my - 6); x.quadraticCurveTo(cx, my + 2, cx + 42, my - 6); x.quadraticCurveTo(cx + 34, my - 6 + h, cx, my - 4 + h); x.quadraticCurveTo(cx - 34, my - 6 + h, cx - 42, my - 6); x.fill(); }
  if (m === 'smile') { x.arc(cx, my - 40, 46, 0.25 * Math.PI, 0.75 * Math.PI); x.stroke(); }
  if (!E.sclera && m === 'grin') { x.moveTo(cx - 60, my - 14); x.quadraticCurveTo(cx, my - 4, cx + 60, my - 14); x.quadraticCurveTo(cx + 50, my + 44, cx, my + 46); x.quadraticCurveTo(cx - 50, my + 44, cx - 60, my - 14); x.fill(); }
  if (m === 'smirk') { x.moveTo(cx - 36, my); x.quadraticCurveTo(cx + 6, my + 14, cx + 44, my - 16); x.stroke(); }
  if (m === 'smallflat') { x.lineWidth = 11; x.moveTo(cx - 14, my); x.lineTo(cx + 14, my); x.stroke(); }
  if (m === 'flat') { x.moveTo(cx - 22, my); x.lineTo(cx + 22, my); x.stroke(); }
  if (m === 'frown') { x.moveTo(cx - 36, my + 12); x.quadraticCurveTo(cx, my - 14, cx + 36, my + 12); x.stroke(); }
  if (m === 'crooked') { x.moveTo(cx - 40, my + 6); x.quadraticCurveTo(cx - 10, my - 8, cx + 10, my + 4); x.quadraticCurveTo(cx + 26, my + 12, cx + 42, my - 4); x.stroke(); }
  if (m === 'o') { x.ellipse(cx, my + 8, 18, 24, 0, 0, 7); x.fill(); }
  if (m === 'smallo') { x.ellipse(cx, my + 4, 10, 8, 0, 0, 7); x.fill(); }
  if (m === 'wavy') { x.moveTo(cx - 44, my + 6); for (let i = 1; i <= 8; i++) x.lineTo(cx - 44 + i * 11, my + 6 + (i % 2 ? -10 : 0)); x.stroke(); }
  if (m === 'zigzag') { x.moveTo(cx - 50, my + 8); for (let i = 1; i <= 6; i++) x.lineTo(cx - 50 + i * 17, my + 8 + (i % 2 ? -16 : 0)); x.stroke(); }
  if (F.sweat) { x.fillStyle = '#7ec8f0'; x.beginPath(); x.moveTo(cx + 170, ey - 80); x.quadraticCurveTo(cx + 198, ey - 34, cx + 170, ey - 20); x.quadraticCurveTo(cx + 142, ey - 34, cx + 170, ey - 80); x.fill(); }
}

// ---------- limbs: smooth rubber-hose curves instead of two sticks with a sharp elbow or knee ----------
// A tube with a fixed topology whose ring centres are rewritten every pose (cheap, no new geometry per frame).
export function makeHose(n = 24, rad = 8) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * rad * 3), idx = [];
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < rad; k++) { const a = i * rad + k, b = i * rad + (k + 1) % rad; idx.push(a, a + rad, b, b, a + rad, b + rad); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, BLACK); m.castShadow = true; m.frustumCulled = false;
  const nrm = new THREE.Vector3(), bin = new THREE.Vector3(), tan = new THREE.Vector3(), tmp = new THREE.Vector3();
  // pts: n points along the limb, radius(i/(n-1)) its thickness; the ring frame is parallel-transported (no twisting)
  m.set = (pts, radius) => {
    for (let i = 0; i < n; i++) {
      tan.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) { nrm.set(0, 0, 1); if (Math.abs(nrm.dot(tan)) > 0.9) nrm.set(1, 0, 0); }
      nrm.sub(tmp.copy(tan).multiplyScalar(nrm.dot(tan))).normalize(); bin.crossVectors(tan, nrm);
      const r = radius(i / (n - 1));
      for (let k = 0; k < rad; k++) { const a = k / rad * Math.PI * 2, j = (i * rad + k) * 3;
        pos[j] = pts[i].x + r * (Math.cos(a) * nrm.x + Math.sin(a) * bin.x); pos[j + 1] = pts[i].y + r * (Math.cos(a) * nrm.y + Math.sin(a) * bin.y); pos[j + 2] = pts[i].z + r * (Math.cos(a) * nrm.z + Math.sin(a) * bin.z); } }
    g.attributes.position.needsUpdate = true;
  };
  return m;
}
// points from a through the joint b to c: straight-ish segments with a rounded joint. round = how much of the
// shorter segment the rounding takes (1 = one smooth curve all the way, like a hose; 0 = a sharp corner)
export const BEND_ROUND = 0.5;
export function bend(a, b, c, n, out = [], round = BEND_ROUND) {
  const ab = a.distanceTo(b), bc = b.distanceTo(c), d = round * Math.min(ab, bc);
  const p1 = b.clone().add(a.clone().sub(b).setLength(d)), p2 = b.clone().add(c.clone().sub(b).setLength(d));
  const l1 = ab - d, l3 = bc - d, l2 = p1.distanceTo(b) + b.distanceTo(p2), L = l1 + l2 + l3;
  for (let i = 0; i < n; i++) { const s = i / (n - 1) * L;
    if (s <= l1) out.push(a.clone().lerp(p1, l1 ? s / l1 : 1));
    else if (s <= l1 + l2) { const t = (s - l1) / l2, u = 1 - t; out.push(p1.clone().multiplyScalar(u * u).addScaledVector(b, 2 * u * t).addScaledVector(p2, t * t)); }
    else out.push(p2.clone().lerp(c, l3 ? (s - l1 - l2) / l3 : 1)); }
  return out;
}

// skin: white, with a warm shadow and a thin rim on the silhouette. Under coloured or warm light a white ball turns
// grey or beige, so heads get their own lift (emissive), set per light rig with headLift(): ~0.2 by day, ~0.05 at night.
const SKINS = [];
export function headLift(k) { for (const m of SKINS) m.emissiveIntensity = k; }
export function skinMat() {
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad2, emissive: 0xffe8d8, emissiveIntensity: 0.2 });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
    'float rimK = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0); outgoingLight += vec3(1.0, 0.93, 0.85) * step(0.55, rimK) * 0.12;\n#include <opaque_fragment>'); };
  SKINS.push(m); return m;
}
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const css = (c) => '#' + new THREE.Color(c).getHexString();
// a basic cartoon fabric: flat colour, a darker hem with a stitch line, side seams and a few drawn weave strokes
export function shirtTex(color) {
  return texT(512, 256, (x) => {
    x.fillStyle = css(color); x.fillRect(0, 0, 512, 256);
    let q = 7; const rnd = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    x.lineCap = 'round'; x.lineWidth = 3;
    for (let i = 0; i < 70; i++) { const X = rnd() * 512, Y = 30 + rnd() * 150, L = 8 + rnd() * 10; x.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + L * 0.3, Y - L); x.stroke(); }
    x.fillStyle = css(shade(color, 0.8)); x.fillRect(0, 196, 512, 60); // hem: the lathe's first 1/7 of v is the underside, the visible hem starts at v = 0.14
    x.strokeStyle = css(shade(color, 0.62)); x.lineWidth = 3; x.setLineDash([10, 8]); x.beginPath(); x.moveTo(0, 190); x.lineTo(512, 190); x.stroke(); x.setLineDash([]);
    x.lineWidth = 4; for (const X of [128, 384]) { x.beginPath(); x.moveTo(X, 30); x.lineTo(X, 196); x.stroke(); } // side seams
  });
}
// ---------- characters ----------
// makeChar({ hair, shirt, scarf, young, headScale, tag, eyes }) -> character with .pose(p), .face(spec), .squash(a),
//   .root, .head, .hands. young: a full head of hair with a fringe (false: hair only around the back, bald on top);
//   tag: text on a name badge; eyes: one of EYES (tallDot by default).
// pose p: hipY (0.72 standing, 0.5 sitting), lean/twist/tilt (torso), hp/hy/hr (head pitch/yaw/roll),
//   al/ar arms { p: pitch, r: roll out, e: elbow bend, er } or { target: world Vector3 } (two-bone IK),
//   ll/lr legs { h: hip pitch (negative = forward), k: knee bend, s: spread }
const chars = [];
export function makeChar({ hair = 0x9aa3b0, shirt = 0x8b2f3a, scarf = null, young = false, headScale = 1.25, tag = null, eyes = EYES.tallDot } = {}) {
  const root = new THREE.Group(); scene.add(root);
  const torso = new THREE.Group(); root.add(torso);
  // a bean-shaped shirt (wider at the hem, rounded shoulders) with a collar and short sleeves, not a tube
  const prof = [[0.0, 0.0], [0.135, 0.0], [0.158, 0.05], [0.152, 0.16], [0.133, 0.28], [0.118, 0.35], [0.085, 0.405], [0.0, 0.425]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = obj(new THREE.LatheGeometry(prof, 32), new THREE.MeshToonMaterial({ color: 0xffffff, map: shirtTex(shirt), gradientMap: grad2 }), 0, 0, 0, torso, 0.014);
  obj(new THREE.TorusGeometry(0.068, 0.022, 10, 24), new THREE.MeshToonMaterial({ color: shade(shirt, 0.78), gradientMap: grad2 }), 0, 0.405, 0, torso, 0.008).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) obj(new THREE.SphereGeometry(0.036, 14, 10), new THREE.MeshToonMaterial({ color: shirt, gradientMap: grad2 }), sx * 0.115, 0.35, 0, torso, 0.008);
  obj(RB(0.012, 0.2, 0.012, 0.005), toon(shade(shirt, 0.7)), 0, 0.2, 0.152, torso, 0).rotation.x = -0.12; // placket line
  if (tag) { const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.032), new THREE.MeshBasicMaterial({ map: texT(256, 96, (x) => { x.fillStyle = '#fff'; rr(x, 0, 0, 256, 96, 18); x.fill(); x.fillStyle = '#1f1611'; x.font = '900 64px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(tag, 128, 52); }), transparent: true }));
    tg.position.set(0.055, 0.29, 0.142); tg.rotation.set(-0.12, 0.38, 0); torso.add(tg); }
  if (scarf) obj(new THREE.TorusGeometry(0.075, 0.03, 10, 20), toon(scarf), 0, 0.44, 0.01, torso, 0.01).rotation.x = Math.PI / 2;
  const headPiv = new THREE.Group(); headPiv.position.y = 0.42; headPiv.scale.setScalar(headScale); torso.add(headPiv); // big head: ~40% of the height, like the reference style
  const head = obj(new THREE.SphereGeometry(0.21, 48, 32), skinMat(), 0, 0.2, 0, headPiv, 0.011); head.scale.set(1.0, 0.92, 0.95);
  const faceC = canvasTex(512, 512, null);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.2112, 40, 28, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.18, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: faceC.t, transparent: true, depthWrite: false }));
  face.renderOrder = 2; head.add(face);
  // hair: a mass of locks with a fixed hairline well above the brows, so it never covers the eyes from any camera
  // or head angle. Flat two-tone colour, no gloss; drawn lines in a darker shade of the hair (not black): the groove
  // between two locks, strokes up from the tips, and one flat lighter stroke per lock.
  // texture: canvas x = around the head (one lock per LOCKS of the width), canvas y = from the hair's edge (top) to the crown
  const hairCss = '#' + hair.toString(16).padStart(6, '0'), LOCKS = young ? 11 : 9;
  const hairLine = '#' + new THREE.Color(hair).multiplyScalar(0.5).getHexString();
  const hairLite = '#' + new THREE.Color(hair).multiplyScalar(1.35).getHexString();
  const hairT = texT(1024, 256, (x) => { x.fillStyle = hairCss; x.fillRect(0, 0, 1024, 256); x.lineCap = 'round';
    const w = 1024 / LOCKS; let q = 11; const rnd = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k <= LOCKS; k++) { const X = (k - 0.3) * w;
      x.strokeStyle = hairLine; x.lineWidth = 13; x.beginPath(); x.moveTo(X, 2); x.quadraticCurveTo(X + 10, 100, X - 2, 185); x.stroke(); // the groove between two locks (stops before the crown)
      for (const [dx, len] of [[0.33, 120], [0.64, 85]]) { x.lineWidth = 9; x.beginPath(); x.moveTo(X + dx * w, 4); x.quadraticCurveTo(X + dx * w + 8, len * 0.5, X + dx * w + 2, len); x.stroke(); } // strokes up from the tips
      x.strokeStyle = hairLite; x.lineWidth = 12; const hx = X + (0.42 + 0.12 * rnd()) * w; x.beginPath(); x.moveTo(hx, 60); x.quadraticCurveTo(hx + 8, 95, hx + 2, 135); x.stroke(); // a flat drawn highlight
      x.lineWidth = 8; x.beginPath(); x.moveTo(hx + 20, 78); x.lineTo(hx + 23, 108); x.stroke(); } });
  // locks: rounded clumps around the head (k = 0..1 across a lock), so the hair reads as a mass, not a cap
  const lock = (ph) => { const x = (ph / (Math.PI * 2) * LOCKS + 0.3) % 1; return Math.sin(x * Math.PI); };
  const edge = (ph) => { const f = Math.max(0, Math.sin(ph)), side = Math.cos(ph); // ph = pi/2 straight ahead
    const s = ss(0, 0.8, f); let th = young ? lerp(0.6, 0.27, s) : 0.58;
    if (young) th += (0.07 * lock(ph) - 0.035) * (0.4 + 0.6 * s) + 0.05 * side * s; // fringe made of locks, swept to one side
    return th * Math.PI; }; // angle from the crown
  const crown = (ph) => (young ? 0 : lerp(0.3, 0.62, ss(0.0, 0.4, Math.max(0, Math.sin(ph) + 0.05))) * Math.PI); // not young: hair only behind the ears
  // a closed, rounded shell: outer surface (puffed up on top, bulging per lock), a rounded lip, the inner surface
  const NP = 132, NT = 14, RO = 0.236, RI = 0.211, LIP = 6, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NP; i++) { const ph = i / NP * Math.PI * 2, t1 = edge(ph), t0 = Math.min(crown(ph), t1), L = lock(ph);
    const sink = lerp(0.75, 1, ss(0, 0.12, t1 - t0)); // where there is no hair, the shell tapers away under the scalp
    const outR = (u) => RO * (1 + (young ? 0.07 : 0.02) * (1 - u) * (1 - u) + 0.028 * L * (0.3 + 0.7 * u)) * (1 - 0.04 * u * u);
    const ring = [];
    for (let j = 0; j <= NT; j++) { const u = j / NT; ring.push([lerp(t0, t1, u), outR(u), u]); }
    const ro = outR(1), mid = (ro + RI) / 2, half = (ro - RI) / 2, w = 0.022 + 0.02 * L;
    for (let k = 1; k < LIP; k++) { const a = k / LIP * Math.PI; ring.push([t1 + w * Math.sin(a), mid + half * Math.cos(a), 1]); } // rounded lip
    for (let j = NT; j >= 0; j--) { const u = j / NT; ring.push([lerp(t0, t1, u), RI, u]); }
    ring.push([t0, outR(0), 0]);
    for (const [th, r0, u] of ring) { const r = r0 * sink; pos.push(r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)); uv.push(i / NP, u); } }
  const NR = NT + 1 + (LIP - 1) + NT + 1 + 1;
  for (let i = 0; i < NP; i++) for (let j = 0; j < NR - 1; j++) { const a = i * NR + j, b = a + NR; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.setIndex(idx); hg.computeVertexNormals();
  obj(hg, new THREE.MeshToonMaterial({ color: 0xffffff, map: hairT, gradientMap: grad2 }), 0, 0, 0, head, 0.009);
  const hose = { al: makeHose(22), ar: makeHose(22), ll: makeHose(30), lr: makeHose(30) }; for (const h of Object.values(hose)) root.add(h);
  const hands = { l: new THREE.Mesh(ballGeo, BLACK), r: new THREE.Mesh(ballGeo, BLACK) }; for (const h of Object.values(hands)) { h.scale.setScalar(0.034); h.castShadow = true; root.add(h); }
  const feet = { l: new THREE.Mesh(ballGeo, BLACK), r: new THREE.Mesh(ballGeo, BLACK) }; for (const f of Object.values(feet)) { f.scale.setScalar(0.017); f.castShadow = true; root.add(f); } // the rounded toe at the end of the foot
  let faceKind = '';
  const c = { root, torso, headPiv, head, hands, feet, body,
    face(spec) { if (spec === faceKind) return; faceKind = spec; drawFace(faceC.ctx, spec, 512, eyes); faceC.t.needsUpdate = true; },
    squash(a) { head.scale.set(1.0 * (1 + 0.12 * a), 0.92 * (1 - 0.12 * a), 0.95 * (1 + 0.12 * a)); }, // >0 squashed, <0 stretched
    hand(side) { return hands[side].getWorldPosition(new THREE.Vector3()); },
    pose(p) {
      const hipY = p.hipY ?? 0.72; torso.position.set(0, hipY, 0); torso.rotation.set(p.lean ?? 0, p.twist ?? 0, p.tilt ?? 0);
      headPiv.rotation.set(p.hp ?? 0, p.hy ?? 0, p.hr ?? 0); root.updateMatrixWorld(true);
      const arm = (side, a) => { const sx = side === 'l' ? 1 : -1; const sh = root.worldToLocal(torso.localToWorld(V(sx * 0.13, 0.36, 0)));
        const tq = new THREE.Quaternion().setFromEuler(torso.rotation);
        const el = sh.clone().addScaledVector(V(0, -1, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(a.p ?? 0, 0, sx * (a.r ?? 0.15), 'XYZ'))).applyQuaternion(tq), 0.24);
        let hd = el.clone().addScaledVector(V(0, -1, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler((a.p ?? 0) + (a.e ?? 0), 0, sx * ((a.r ?? 0.15) + (a.er ?? 0)), 'XYZ'))).applyQuaternion(tq), 0.23);
        if (a.target) { // two-bone IK: the hand reaches the target, the elbow bends out and down
          const dv = root.worldToLocal(a.target.clone()).sub(sh); const d = Math.min(dv.length(), 0.465), dir = dv.normalize();
          const x = (0.24 * 0.24 - 0.23 * 0.23 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, 0.24 * 0.24 - x * x));
          const pole = V(sx * 0.8, -1, -0.4); pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
          el.copy(sh).addScaledVector(dir, x).addScaledVector(pole, h); hd = sh.clone().addScaledVector(dir, d); }
        hose['a' + side].set(bend(sh, el, hd, 22), (t) => 0.0115 - 0.0015 * t); hands[side].position.copy(hd); return hd; };
      const leg = (side, a) => { const sx = side === 'l' ? 1 : -1; const hp = V(sx * 0.06, hipY + 0.02, 0);
        const kn = hp.clone().addScaledVector(V(0, -1, 0).applyEuler(new THREE.Euler(a.h ?? 0, 0, sx * (a.s ?? 0.03))), 0.36);
        const ft = kn.clone().addScaledVector(V(0, -1, 0).applyEuler(new THREE.Euler((a.h ?? 0) - (a.k ?? 0), 0, sx * (a.s ?? 0.03))), 0.36);
        // the leg bends smoothly through the knee, then curls forward into a short foot
        const down = ft.clone().sub(kn).normalize(), fwd = V(0, 0, 1).sub(down.clone().multiplyScalar(down.z)).normalize(), RF = 0.032, LF = 0.03;
        const ank = ft.clone().addScaledVector(down, -RF), pts = bend(hp, kn, ank, 22);
        for (let i = 1; i <= 5; i++) { const a = i / 5 * Math.PI / 2; pts.push(ank.clone().addScaledVector(down, RF * Math.sin(a)).addScaledVector(fwd, RF * (1 - Math.cos(a)))); }
        const heel = pts[pts.length - 1]; for (let i = 1; i <= 3; i++) pts.push(heel.clone().addScaledVector(fwd, LF * i / 3));
        hose['l' + side].set(pts, (t) => (t < 0.73 ? 0.0125 : lerp(0.0125, 0.017, ss(0.73, 0.85, t))));
        feet[side].position.copy(pts[pts.length - 1]); return kn; };
      c.handL = arm('l', p.al ?? {}); c.handR = arm('r', p.ar ?? {});
      c.kneeL = leg('l', p.ll ?? {}); c.kneeR = leg('r', p.lr ?? {});
    } };
  chars.push(c); return c;
}
export const sitPose = (o = {}) => ({ hipY: 0.5, ll: { h: -1.45, k: -1.5 }, lr: { h: -1.45, k: -1.5 }, al: { p: -0.5, r: 0.2, e: -0.9 }, ar: { p: -0.5, r: 0.2, e: -0.9 }, ...o });
export const standPose = (o = {}) => ({ hipY: 0.72, ll: { h: 0, k: 0 }, lr: { h: 0, k: 0 }, ...o });
export function place(c, x, z, ry) { c.root.visible = true; c.root.position.set(x, 0, z); c.root.rotation.y = ry; }
export function hideChars() { for (const c of chars) { c.root.visible = false; c.head.visible = true; c.squash(0); } }

// ---------- life: a character that holds still looks dead ----------
// life() adds breathing, sway, small head turns and arm drift on top of a pose; use it on every pose, every shot.
export function life(c, t, seed, p, amt = 1) {
  const N = noise1;
  p.lean = (p.lean ?? 0) + 0.03 * amt * N(t * 0.6, seed); p.tilt = (p.tilt ?? 0) + 0.035 * amt * N(t * 0.5, seed + 1); p.twist = (p.twist ?? 0) + 0.06 * amt * N(t * 0.4, seed + 7);
  p.hy = (p.hy ?? 0) + 0.16 * amt * N(t * 0.35, seed + 2); p.hp = (p.hp ?? 0) + 0.035 * amt * Math.sin(t * 1.85 + seed) + 0.04 * amt * N(t * 0.8, seed + 3); p.hr = (p.hr ?? 0) + 0.07 * amt * N(t * 0.45, seed + 4);
  if ((p.hipY ?? 0.72) > 0.6) p.hipY = (p.hipY ?? 0.72) + 0.006 * amt * Math.sin(t * 1.85 + seed);
  for (const [k, sd] of [['al', 5], ['ar', 6]]) { const a = { p: 0, r: 0.15, e: 0, ...(p[k] || {}) }; a.p += 0.06 * amt * N(t * 0.7, seed + sd); a.r += 0.04 * amt * N(t * 0.6, seed + sd + 10); a.e += 0.06 * amt * N(t * 0.9, seed + sd + 20); p[k] = a; }
  const b = Math.sin(t * 1.85 + seed); c.body.scale.set(1 + 0.012 * b, 1 + 0.02 * b, 1 + 0.012 * b);
  return p;
}
// a blink every ~3.3 s: half closed, closed, half closed (about one 30 fps frame each), '' when the eyes are open
export const blinkAt = (t, seed) => { const ph = (t + seed * 1.37) % 3.3; return ph < 0.034 ? '|h' : ph < 0.1 ? '|b' : ph < 0.134 ? '|h' : ''; };
// face spec with a blink and (optionally) the mouth opened by the voice
export const faceAt = (kind, t, seed, open = 0) => kind + (open > 0 ? '|o' + open : '') + blinkAt(t, seed);

// ---------- timing gestures and faces to the voice ----------
// keyed(keys, t): a pose from keys [[wordTime, pose, frames?], ...]. Each move takes `frames` (5) frames and lands
// LEAD (4) frames before its word, with a small overshoot, so by the time the word is heard the gesture is there.
// The head arrives HEAD_LAG (3) frames after the body (follow-through instead of a robotic snap).
// Wrap it in life() as usual: c.pose(life(c, t, seed, keyed(keys, t))).
export const FPS = 30, LEAD = 4, HEAD_LAG = 3;
const settle = (u) => { u = clamp(u); const k = 1.1; return 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2); };
const POSE0 = { hipY: 0.72, lean: 0, twist: 0, tilt: 0, hp: 0, hy: 0, hr: 0 };
const LIMB0 = { al: { p: 0, r: 0.15, e: 0, er: 0 }, ar: { p: 0, r: 0.15, e: 0, er: 0 }, ll: { h: 0, k: 0, s: 0.03 }, lr: { h: 0, k: 0, s: 0.03 } };
export function lerpPose(a, b, u) {
  const o = {}; for (const k in POSE0) o[k] = lerp(a[k] ?? POSE0[k], b[k] ?? POSE0[k], u);
  for (const k in LIMB0) { o[k] = {}; for (const q in LIMB0[k]) o[k][q] = lerp(a[k]?.[q] ?? LIMB0[k][q], b[k]?.[q] ?? LIMB0[k][q], u); }
  return o;
}
function poseAt(keys, t) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [wt, p, n = 5] = keys[i], end = wt - LEAD / FPS, u = (t - (end - n / FPS)) / (n / FPS);
    if (u <= 0) break; cur = lerpPose(cur, p, settle(u)); }
  return cur;
}
export function keyed(keys, t) { const p = poseAt(keys, t), h = poseAt(keys, t - HEAD_LAG / FPS); return { ...p, hp: h.hp, hy: h.hy, hr: h.hr }; }
// faceKeys(keys, t, seed, open): expressions from keys [[wordTime, kind], ...]. A face never morphs into the next one:
// it swaps through a blink (half closed, closed) and the new face is there 2 frames before its word.
export function faceKeys(keys, t, seed, open = 0) {
  let kind = keys[0][1], lid = '';
  for (let i = 1; i < keys.length; i++) { const wt = keys[i][0];
    if (t >= wt - 2 / FPS) kind = keys[i][1]; else if (t >= wt - 3 / FPS) lid = '|b'; else if (t >= wt - 4 / FPS) lid = '|h'; }
  return kind + (open > 0 ? '|o' + open : '') + (lid || blinkAt(t, seed));
}

// ---------- timeline (voice-over word times) ----------
let TL = null;
const WD = {};
export async function loadTimeline(url) {
  TL = await (await fetch(url)).json(); window.DURATION = TL.duration;
  for (const l of TL.lines) for (const w of l.words) WD[l.id + ':' + w.w.replace(/[^\p{L}\d]/gu, '').toLowerCase()] ??= w.t0;
  return TL;
}
// time a word starts: T('p1:laggy') = first "laggy" in line p1 (lower case, punctuation stripped)
export const T = (k) => { if (WD[k] === undefined) throw new Error('no word ' + k + ' in the timeline'); return WD[k]; };
// mouth open amount while the given lines are being spoken (0 = closed)
export function mouth(t, ids) { for (const l of TL.lines) { if (!ids.includes(l.id)) continue; for (const w of l.words) if (t >= w.t0 && t < w.t1) return Math.round((0.35 + 0.65 * Math.abs(Math.sin((t - w.t0) * 13))) * 4) / 4; } return 0; }

// ---------- camera ----------
// shotCam(position, lookAt, fov, t, handheld amount, kick): a slow handheld drift; kick (0..1) shakes on impacts
export function shotCam(p, a, fov, t, amt = 1, kick = 0) {
  FOCUS.d = p.distanceTo(FOCUS.at || a); // depth of field: sharp at the look point, or at FOCUS.at if a shot sets it
  const q = p.clone().add(V(0.012 * amt * noise1(t * 0.9, 31), 0.01 * amt * noise1(t * 0.8, 32), 0)).add(V(kick * 0.03 * Math.sin(t * 70), kick * 0.025 * Math.cos(t * 83), 0));
  camera.position.copy(q); camera.lookAt(a.clone().add(V(0.008 * amt * noise1(t * 0.7, 33), 0.008 * amt * noise1(t * 0.6, 34), 0))); camera.fov = fov; camera.updateProjectionMatrix();
}
// 0..1 pulse right after `at`, decaying over ~d: subtract it from the fov for a punch-in, use it as kick or squash
export const punch = (t, at, d = 0.25) => (t > at && t < at + d * 3 ? Math.exp(-(t - at) / d) * ss(at, at + 0.05, t) : 0);

// ---------- phone: held in two hands, tapping as the keys light up ----------
// makePhone() -> { group, ctx (720x1520 screen canvas), update(), keyRect(ch), drawKeyboard(key, dark) }
export function makePhone(color = 0x2b2f38) {
  const group = new THREE.Group(); scene.add(group); obj(RB(0.1, 0.205, 0.013, 0.014), toon(color), 0, 0, 0, group, 0.005);
  const SW = 0.091, SH = 0.192, live = canvasTex(720, 1520, null);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: live.t })); screen.position.z = 0.007; group.add(screen);
  const KB_Y = 1030, ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const keyRect = (ch) => { ch = (ch || '').toLowerCase(); if (ch === ' ') return { x: 180, y: KB_Y + 350, w: 360, h: 92 };
    for (let r = 0; r < 3; r++) { const i = ROWS[r].indexOf(ch); if (i < 0) continue; const n = ROWS[r].length, kw = 64, gap = 7, x0 = (720 - (n * kw + (n - 1) * gap)) / 2; return { x: x0 + i * (kw + gap), y: KB_Y + 14 + r * 112, w: kw, h: 92 }; }
    return { x: 330, y: KB_Y + 126, w: 64, h: 92 }; };
  // a keyboard on the bottom of the screen; the pressed key lights up and pops a bubble like on a real phone
  const drawKeyboard = (key, dark = true) => { const x = live.ctx;
    x.fillStyle = dark ? '#1c1c1e' : '#d1d4db'; x.fillRect(0, KB_Y, 720, 1520 - KB_Y); x.font = '400 34px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const ch of ROWS.join('') + ' ') { const r = keyRect(ch), on = key && key.toLowerCase() === ch;
      x.fillStyle = on ? (dark ? '#a5a5aa' : '#8f97a6') : (dark ? '#46464a' : '#ffffff'); rr(x, r.x, r.y, r.w, r.h, 12); x.fill(); x.fillStyle = dark ? '#fff' : '#111'; x.fillText(ch === ' ' ? 'space' : ch, r.x + r.w / 2, r.y + r.h / 2 + 2);
      if (on && ch !== ' ') { x.fillStyle = dark ? '#a5a5aa' : '#ffffff'; rr(x, r.x - 10, r.y - 110, r.w + 20, 104, 16); x.fill(); x.fillStyle = dark ? '#fff' : '#111'; x.font = '500 54px Inter'; x.fillText(ch, r.x + r.w / 2, r.y - 58); x.font = '400 34px Inter'; } } };
  const local = (px, py) => V((px / 720 - 0.5) * SW, (0.5 - py / 1520) * SH, 0.008); // screen pixel -> phone space
  return { group, screen, ctx: live.ctx, update: () => (live.t.needsUpdate = true), keyRect, drawKeyboard, local };
}
// letters of `str` appear evenly from t0 (letter k at t0 + k * (t1 - t0) / length, the same times word_cues.py
// puts the typing ticks on). Returns the text so far, the key lit now (for ~0.12 s after its letter), and `hits`:
// the nearby key presses { ch, dt } (dt = t - press time) so the hands can move down *before* each press and land on it.
export function typed(str, t0, t1, t) {
  const step = (t1 - t0) / str.length, n = t < t0 ? 0 : Math.min(str.length, Math.floor((t - t0) / step + 1e-6) + 1);
  const lit = n > 0 && t - (t0 + (n - 1) * step) < Math.min(0.12, step * 0.9) ? str[n - 1] : null;
  const hits = []; for (let k = Math.max(0, n - 2); k <= Math.min(str.length - 1, n); k++) hits.push({ ch: str[k], dt: t - (t0 + k * step) });
  return { text: str.slice(0, n), key: lit, hits };
}
// a tap: the hand starts down 0.07 s before the press, lands on it, springs back over 0.1 s
const tapCurve = (dt) => (dt < -0.07 || dt > 0.1 ? 0 : dt < 0 ? Math.sin((1 + dt / 0.07) * Math.PI / 2) : Math.cos((dt / 0.1) * Math.PI / 2));
// the character holds the phone in front of the chest in both hands (IK to its long sides). No fingers: drawn
// thumbs flying over the keys looked bad on review. Instead, on every key press the hand on that key's side gives a
// small tap timed so it lands exactly when the letter appears (and the key lights up), and the phone dips a touch.
// typing = typed(...) result or null (hands just hold); oneHand frees the right arm.
export function holdPhone(c, phone, p, t, typing = null, oneHand = false) {
  c.pose(p); c.torso.updateMatrixWorld(true); const g = phone.group;
  let tapL = 0, tapR = 0;
  if (typing && typing.hits) for (const h of typing.hits) { const k = tapCurve(h.dt); if (!k) continue; const r = phone.keyRect(h.ch); if (r.x + r.w / 2 > 360) tapR = Math.max(tapR, k); else tapL = Math.max(tapL, k); }
  g.visible = true; g.position.copy(c.torso.localToWorld(V(0, 0.3, 0.3)));
  // screen turned to the character's face (yaw pi) and tilted up toward the eyes
  g.quaternion.copy(c.torso.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.65 + 0.03 * (tapL + tapR), Math.PI, 0.025 * (tapR - tapL))));
  g.updateMatrixWorld(true);
  // grips on the long sides; a tap moves that hand in and down toward the keyboard and onto the glass
  const gripL = g.localToWorld(V(-0.072 + 0.022 * tapL, -0.035 - 0.02 * tapL, -0.01 + 0.03 * tapL)), gripR = g.localToWorld(V(0.072 - 0.022 * tapR, -0.035 - 0.02 * tapR, -0.01 + 0.03 * tapR));
  c.pose({ ...p, al: { ...(p.al || {}), target: gripL }, ar: oneHand ? p.ar : { ...(p.ar || {}), target: gripR } });
}
// first-person close-up: the camera is the character's eyes, looking down at the phone in their own hands (the
// head is hidden for this shot so the camera doesn't see its inside). This reads as "he is typing for himself".
// Shooting the screen from the front read as "he holds the phone the wrong way round and shows it to you", and
// over the shoulder the big round head covers half of the frame.
export function phoneCloseUp(phone, c, t, fov = 44) {
  c.head.visible = false; c.torso.updateMatrixWorld(true); const g = phone.group; g.updateMatrixWorld(true);
  const eyes = c.torso.localToWorld(V(0, 0.66, 0.1)), aim = g.getWorldPosition(new THREE.Vector3()).add(V(0, 0.02, 0));
  // roll the view most of the way to the phone's up, so the screen reads upright
  camera.up.copy(V(0, 1, 0).lerp(V(0, 1, 0).transformDirection(g.matrixWorld), 0.7)).normalize();
  shotCam(eyes, aim, fov, t, 0.5); camera.up.set(0, 1, 0);
}

// ---------- laptop / TV with a live canvas screen ----------
export function makeLaptop(parent, x, y, z) {
  const L = new THREE.Group(); L.position.set(x, y, z); parent.add(L); obj(RB(0.36, 0.018, 0.25, 0.01), toon(0xb8bec6), 0, 0.009, 0, L, 0.006);
  const lid = new THREE.Group(); lid.position.set(0, 0.018, -0.125); lid.rotation.x = -0.25; L.add(lid); obj(RB(0.36, 0.24, 0.012, 0.01), toon(0xb8bec6), 0, 0.12, -0.006, lid, 0.006);
  const c = canvasTex(960, 600, null); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2125), new THREE.MeshBasicMaterial({ map: c.t })); scr.position.set(0, 0.12, 0.0005); lid.add(scr);
  return { group: L, screen: scr, ctx: c.ctx, canvas: c.c, update: () => (c.t.needsUpdate = true) };
}
export function makeTV(parent, w = 1.6) {
  const TV = new THREE.Group(); parent.add(TV); obj(RB(w + 0.02, w * 0.5625 + 0.04, 0.06, 0.02), toon(0x141414), 0, 0, 0, TV);
  const c = canvasTex(1280, 720, null); const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, (w - 0.08) * 0.5625), new THREE.MeshBasicMaterial({ map: c.t })); scr.position.z = 0.032; TV.add(scr);
  return { group: TV, screen: scr, ctx: c.ctx, canvas: c.c, update: () => (c.t.needsUpdate = true) };
}
export function loadImages(names) { return Promise.all(names.map((n) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + n)); im.src = n; }))); }

// ---------- captions + present ----------
// one word at a time, big white with a black outline, a small pop when it appears (feeds autoplay muted)
export function captionsFrom(tl) { const c = []; for (const l of tl.lines) for (const w of l.words) c.push([w.t0, w.t1 + 0.12, w.w.replace(/[.,!?…:;]/g, '')]); for (let j = 0; j < c.length - 1; j++) c[j][1] = Math.min(c[j][1], c[j + 1][0]); return c; }
export function present(t, caps, y = 1300) {
  renderInk(); // colour with ink outlines
  octx.imageSmoothingQuality = 'high'; octx.drawImage(LOOK.dof || LOOK.bloom ? lookPass() : renderer.domElement, 0, 0, W, H);
  FOCUS.at = null;
  const c = caps && caps.find((x) => t >= x[0] && t < x[1]); if (!c) return;
  const pop = 1 + 0.15 * clamp(1 - (t - c[0]) / 0.1); octx.save(); octx.translate(W / 2, y); octx.scale(pop, pop);
  let size = 110; octx.font = `900 ${size}px Inter`; while (octx.measureText(c[2]).width > W - 120) { size -= 6; octx.font = `900 ${size}px Inter`; }
  octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.lineJoin = 'round'; octx.lineWidth = 22; octx.strokeStyle = '#000'; octx.strokeText(c[2], 0, 0); octx.fillStyle = '#fff'; octx.fillText(c[2], 0, 0); octx.restore();
}

// ---------- ink: screen-space outlines from an object-ID pass ----------
// Every mesh gets an ID colour; a line is drawn wherever the ID changes, a constant number of pixels wide whatever
// the distance: thick on the far side of a silhouette, thinner where two touching things meet (head and collar).
// This replaces inverted-hull outlines, which were too thick in close-ups, vanished in wide shots and were hidden
// by anything in front (the bottom of a head against its own collar).
export const INK_PX = { outer: 5, inner: 2.6 }; // at 1080 px wide; scaled with the render size
const RW = Math.round(W * SS), RH = Math.round(H * SS);
const rtC = new THREE.WebGLRenderTarget(RW, RH, { samples: 4 });
const rtI = new THREE.WebGLRenderTarget(RW, RH, { depthTexture: new THREE.DepthTexture(RW, RH), minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const idMats = new Map(); let idN = 0;
const NOLINE = new THREE.MeshBasicMaterial({ color: 0x000000 }); // black sticks and balls are lines already
function idMat(m) { if (m === BLACK) return NOLINE; let k = idMats.get(m.uuid); if (!k) { idN++; const h = (idN * 2654435761) >>> 0; k = new THREE.MeshBasicMaterial({ color: new THREE.Color(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255) }); idMats.set(m.uuid, k); } return k; }
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
const inkPass = new THREE.ShaderMaterial({ uniforms: { tC: { value: rtC.texture }, tI: { value: rtI.texture }, tD: { value: rtI.depthTexture }, px: { value: new THREE.Vector2(1 / RW, 1 / RH) }, ro: { value: INK_PX.outer * RW / 1080 }, ri: { value: INK_PX.inner * RW / 1080 }, ink: { value: new THREE.Color(INK) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tC, tI, tD; uniform vec2 px; uniform float ro, ri; uniform vec3 ink; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tC, vUv); vec3 i0 = texture2D(tI, vUv).rgb; float d0 = texture2D(tD, vUv).x; float e = 0.0;
      for (int k = 0; k < 12; k++) { float a = float(k) * 0.5236; vec2 dir = vec2(cos(a), sin(a));
        for (int s = 1; s <= 3; s++) { float r = ro * float(s) / 3.0; vec2 uv = vUv + dir * r * px;
          vec3 i1 = texture2D(tI, uv).rgb; float d1 = texture2D(tD, uv).x;
          if (i0 == vec3(0.0) || i1 == vec3(0.0)) continue;
          if (distance(i0, i1) > 0.003) { float lim = d0 > d1 + 0.00002 ? ro : ri; e = max(e, 1.0 - smoothstep(lim - 1.0, lim, r)); } } }
      gl_FragColor = vec4(mix(c.rgb, ink, e), 1.0);
      #include <colorspace_fragment>
    }` });
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), inkPass));
export function renderInk(sc = scene, cam = camera) {
  renderer.setRenderTarget(rtC); renderer.render(sc, cam);
  const swapped = [], bg = sc.background, fog = sc.fog;
  sc.traverse((o) => { if (!o.isMesh) return; if (!o.visible) return; const m = o.material; if (m.transparent || m.side === THREE.BackSide) { swapped.push([o, m, true]); o.visible = false; } else { swapped.push([o, m, false]); o.material = idMat(m); } });
  sc.background = new THREE.Color(0x000001); sc.fog = null; renderer.setRenderTarget(rtI); renderer.render(sc, cam);
  for (const [o, m, hid] of swapped) { if (hid) o.visible = true; else o.material = m; }
  sc.background = bg; sc.fog = fog;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}

// ---------- the look: depth of field and glow on lights ----------
// LOOK.dof: things nearer or further than the focus blur (FOCUS.d, set by shotCam; put a number object in focus with
// FOCUS.at = obj.getWorldPosition(V(0, 0, 0)) before shotCam). It separates the character from a busy set in a narrow
// vertical frame. LOOK.bloom: only meshes marked with glowy() glow (lamps, flames, LED digits, a moon) - never a whole
// window or a white wall, whose halo bleeds over the silhouettes in front of it.
export const LOOK = { dof: true, bloom: true, blur: 9, bloomK: [0.55, 0.4] };
export const FOCUS = { d: 3, at: null };
const GLOW = new Set();
export const glowy = (m) => (GLOW.add(m), m);
const cocMat = new THREE.ShaderMaterial({ uniforms: { uF: { value: 3 } },
  vertexShader: 'varying float vZ; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float uF; varying float vZ; void main() { float c = clamp((abs(vZ - uF) - uF * 0.12) / (uF * 0.55), 0.0, 1.0); gl_FragColor = vec4(c, c, c, 1.0); }' });
const OFF = new THREE.MeshBasicMaterial({ color: 0x000000 });
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; };
const [sharpC, sharpX] = mk(W, H), [blurC, blurX] = mk(W, H), [maskC, maskX] = mk(W / 4, H / 4), [g4C, g4X] = mk(W / 4, H / 4), [g8C, g8X] = mk(W / 8, H / 8);
// takes the frame renderInk() just drew, returns a canvas with the look applied
export function lookPass() {
  const bg = scene.background, fog = scene.fog;
  sharpX.drawImage(renderer.domElement, 0, 0, W, H);
  if (LOOK.dof) { // a circle-of-confusion pass, then the blurred frame kept only where it is large
    cocMat.uniforms.uF.value = FOCUS.d; scene.overrideMaterial = cocMat; scene.background = new THREE.Color(0xffffff); scene.fog = null;
    renderer.render(scene, camera); scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
    maskX.drawImage(renderer.domElement, 0, 0, W / 4, H / 4); const id = maskX.getImageData(0, 0, W / 4, H / 4), d = id.data;
    for (let i = 0; i < d.length; i += 4) { d[i + 3] = d[i]; d[i] = d[i + 1] = d[i + 2] = 0; } maskX.putImageData(id, 0, 0);
    blurX.globalCompositeOperation = 'source-over'; blurX.filter = `blur(${LOOK.blur}px)`; blurX.drawImage(sharpC, 0, 0); blurX.filter = 'none';
    blurX.globalCompositeOperation = 'destination-in'; blurX.drawImage(maskC, 0, 0, W, H); blurX.globalCompositeOperation = 'source-over';
    sharpX.drawImage(blurC, 0, 0);
  }
  if (LOOK.bloom && GLOW.size) { // render only the glowing meshes (everything else black, so walls still hide them), blur, add
    const saved = []; scene.traverse((o) => { if (o.isMesh && !GLOW.has(o)) { saved.push([o, o.material]); o.material = OFF; } });
    scene.background = new THREE.Color(0x000000); scene.fog = null; renderer.render(scene, camera); for (const [o, m] of saved) o.material = m; scene.background = bg; scene.fog = fog;
    g4X.filter = 'blur(6px)'; g4X.clearRect(0, 0, W / 4, H / 4); g4X.drawImage(renderer.domElement, 0, 0, W / 4, H / 4); g4X.filter = 'none';
    g8X.filter = 'blur(10px)'; g8X.clearRect(0, 0, W / 8, H / 8); g8X.drawImage(renderer.domElement, 0, 0, W / 8, H / 8); g8X.filter = 'none';
    sharpX.globalCompositeOperation = 'lighter'; sharpX.globalAlpha = LOOK.bloomK[0]; sharpX.drawImage(g4C, 0, 0, W, H); sharpX.globalAlpha = LOOK.bloomK[1]; sharpX.drawImage(g8C, 0, 0, W, H);
    sharpX.globalAlpha = 1; sharpX.globalCompositeOperation = 'source-over';
  }
  return sharpC;
}
