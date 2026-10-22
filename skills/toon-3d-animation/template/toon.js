// Toon toolkit for cartoon 3D story videos: round white heads with drawn faces, stick limbs, flat colours,
// bold inverted-hull outlines. Everything is deterministic (no clocks, no randomness): the page renders any
// time t on request, so the renderer can capture it frame by frame.
//
// Exports: the scene/camera/renderer, helpers (clamp, ss, eio, back, ...), obj/toon/RB for building sets,
// makeChar (characters with faces, poses, arm IK), life/blink/mouth (keep characters alive), camera helpers
// (shotCam, punch), makePhone/holdPhone/typed (a phone held in two hands that tap as the keys light up),
// makeScreen (a laptop or TV with a live canvas screen), loadTimeline/captions/present.
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
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3));
{ const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(-4, 3, 2); scene.add(fill); } // faces turned from the sun stay white

// ---------- materials, outlines, building blocks ----------
const grad = (() => { const d = new Uint8Array([120, 200, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (color, map) => new THREE.MeshToonMaterial({ color, map: map || null, gradientMap: grad });
export const INK = 0x141414;
export const BLACK = new THREE.MeshBasicMaterial({ color: INK });
const inkMats = {};
function inkMat(th) { // back faces pushed out along the normal: the outline
  if (inkMats[th]) return inkMats[th];
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${th.toFixed(4)};`); };
  return (inkMats[th] = m);
}
// a mesh with an outline (ink = thickness in metres, 0 = none)
export function obj(geo, mat, x = 0, y = 0, z = 0, parent = scene, ink = 0.012) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m);
  if (ink) { const o = new THREE.Mesh(geo, inkMat(ink)); o.castShadow = false; m.add(o); }
  return m;
}
export const RB = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const limbGeo = new THREE.CylinderGeometry(1, 1, 1, 10), ballGeo = new THREE.SphereGeometry(1, 16, 12);
// a stick (unit cylinder) from a to b
export function seg(m, a, b, r) { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); m.scale.set(r, d.length(), r); }

// ---------- faces: drawn on a canvas wrapped on the front of the head ----------
// spec = "<kind>[|o<0..1>][|b]": kind, mouth open amount (talking), blink.
// kinds: smile, happy, sly, wistful, pain, awe, surprised, shrug, flat, talk
export function drawFace(x, spec, s = 512) {
  const parts = spec.split('|'), kind = parts[0], blink = parts.includes('b'), open = +((parts.find((q) => q[0] === 'o') || 'o0').slice(1));
  x.clearRect(0, 0, s, s); x.strokeStyle = '#141414'; x.fillStyle = '#141414'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 22;
  const cx = s / 2, ey = 215, ex = 95, my = 330;
  const arcEye = (dx) => { x.beginPath(); x.arc(cx + dx, ey + 18, 42, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); };
  const dot = (dx, r = 20) => { if (blink) { x.beginPath(); x.moveTo(cx + dx - 28, ey + 4); x.quadraticCurveTo(cx + dx, ey + 14, cx + dx + 28, ey + 4); x.stroke(); return; } x.beginPath(); x.arc(cx + dx, ey, r, 0, 7); x.fill(); };
  const brows = () => { x.lineWidth = 16; x.beginPath(); x.moveTo(cx - ex - 40, ey - 80); x.quadraticCurveTo(cx - ex, ey - 105, cx - ex + 40, ey - 80); x.moveTo(cx + ex - 40, ey - 80); x.quadraticCurveTo(cx + ex, ey - 105, cx + ex + 40, ey - 80); x.stroke(); x.lineWidth = 22; };
  const openMouth = () => { const h = 14 + 70 * open; x.beginPath(); x.moveTo(cx - 75, my - 18); x.quadraticCurveTo(cx, my - 26 + h * 0.2, cx + 75, my - 18); x.quadraticCurveTo(cx + 60, my - 18 + h, cx, my - 14 + h); x.quadraticCurveTo(cx - 60, my - 18 + h, cx - 75, my - 18); x.fill();
    if (open > 0.35) { x.fillStyle = '#e8665a'; x.beginPath(); x.ellipse(cx, my - 22 + h * 0.85, 34, 12 * open, 0, 0, 7); x.fill(); x.fillStyle = '#141414'; } };
  if (open > 0 && ['smile', 'sly', 'shrug', 'flat'].includes(kind)) { if (kind === 'shrug') brows(); dot(-ex); dot(ex); openMouth(); return; }
  if (kind === 'smile') { dot(-ex); dot(ex); x.beginPath(); x.arc(cx, my - 40, 80, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke(); }
  if (kind === 'happy') { arcEye(-ex); arcEye(ex); x.beginPath(); x.moveTo(cx - 110, my - 12); x.quadraticCurveTo(cx, my + 4, cx + 110, my - 12); x.quadraticCurveTo(cx + 95, my + 70, cx, my + 72); x.quadraticCurveTo(cx - 95, my + 70, cx - 110, my - 12); x.fill(); x.fillStyle = '#fff'; x.fillRect(cx - 80, my - 4, 160, 16); }
  if (kind === 'sly') { x.beginPath(); x.moveTo(cx - ex - 40, ey - 4); x.lineTo(cx - ex + 40, ey + 6); x.moveTo(cx + ex - 40, ey + 6); x.lineTo(cx + ex + 40, ey - 4); x.stroke(); dot(-ex, 14); dot(ex, 14); x.beginPath(); x.moveTo(cx - 70, my - 6); x.quadraticCurveTo(cx + 10, my + 40, cx + 100, my - 30); x.stroke(); }
  if (kind === 'wistful') { x.beginPath(); x.moveTo(cx - ex - 40, ey + 8); x.lineTo(cx - ex + 40, ey + 8); x.moveTo(cx + ex - 40, ey + 8); x.lineTo(cx + ex + 40, ey + 8); x.stroke(); dot(-ex + 4, 13); dot(ex + 4, 13); x.beginPath(); x.arc(cx, my - 50, 60, 0.3 * Math.PI, 0.7 * Math.PI); x.stroke(); }
  if (kind === 'pain') { x.beginPath(); x.moveTo(cx - ex - 35, ey - 25); x.lineTo(cx - ex + 30, ey); x.lineTo(cx - ex - 35, ey + 25); x.moveTo(cx + ex + 35, ey - 25); x.lineTo(cx + ex - 30, ey); x.lineTo(cx + ex + 35, ey + 25); x.stroke();
    x.beginPath(); x.moveTo(cx - 90, my + 20); for (let i = 0; i <= 6; i++) x.lineTo(cx - 90 + i * 30, my + 20 + (i % 2 ? -22 : 0)); x.stroke(); x.fillStyle = '#7ec8f0'; x.beginPath(); x.moveTo(cx + 175, ey - 70); x.quadraticCurveTo(cx + 205, ey - 20, cx + 175, ey - 5); x.quadraticCurveTo(cx + 145, ey - 20, cx + 175, ey - 70); x.fill(); }
  if (kind === 'awe') { for (const dx of [-ex, ex]) { x.beginPath(); x.arc(cx + dx, ey, 46, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + dx - 14, ey - 16, 13, 0, 7); x.fill(); x.beginPath(); x.arc(cx + dx + 14, ey + 14, 6, 0, 7); x.fill(); x.fillStyle = '#141414'; } x.beginPath(); x.ellipse(cx, my + 30, 34, 44, 0, 0, 7); x.fill(); }
  if (kind === 'surprised') { x.lineWidth = 16; x.beginPath(); x.moveTo(cx - ex - 35, ey - 85); x.lineTo(cx - ex + 35, ey - 95); x.moveTo(cx + ex - 35, ey - 95); x.lineTo(cx + ex + 35, ey - 85); x.stroke(); x.lineWidth = 22; dot(-ex, 26); dot(ex, 26); x.beginPath(); x.ellipse(cx, my + 10, 26, 30, 0, 0, 7); x.fill(); }
  if (kind === 'shrug') { brows(); dot(-ex); dot(ex); x.beginPath(); x.moveTo(cx - 100, my - 10); x.quadraticCurveTo(cx, my + 60, cx + 100, my - 10); x.stroke(); }
  if (kind === 'flat') { x.beginPath(); x.moveTo(cx - ex - 40, ey - 6); x.lineTo(cx - ex + 40, ey - 6); x.moveTo(cx + ex - 40, ey - 6); x.lineTo(cx + ex + 40, ey - 6); x.stroke(); dot(-ex, 15); dot(ex, 15); x.beginPath(); x.moveTo(cx - 60, my + 10); x.lineTo(cx + 60, my + 10); x.stroke(); }
  if (kind === 'talk') { dot(-ex); dot(ex); x.lineWidth = 16; x.beginPath(); x.moveTo(cx - ex - 40, ey - 70); x.lineTo(cx - ex + 30, ey - 85); x.stroke(); x.beginPath(); x.ellipse(cx, my + 20, 60, 42, 0, 0, Math.PI); x.fill(); }
}

// ---------- characters ----------
// makeChar({ hair, shirt, scarf, young }) -> character with .pose(p), .face(spec), .squash(a), .root, .head, .hands
// pose p: hipY (0.72 standing, 0.5 sitting), lean/twist/tilt (torso), hp/hy/hr (head pitch/yaw/roll),
//   al/ar arms { p: pitch, r: roll out, e: elbow bend, er } or { target: world Vector3 } (two-bone IK),
//   ll/lr legs { h: hip pitch (negative = forward), k: knee bend, s: spread }
const chars = [];
export function makeChar({ hair = 0x9aa3b0, shirt = 0x8b2f3a, scarf = null, young = false } = {}) {
  const root = new THREE.Group(); scene.add(root);
  const torso = new THREE.Group(); root.add(torso);
  const body = obj(new THREE.CylinderGeometry(0.11, 0.14, 0.38, 24, 1), toon(shirt), 0, 0.19, 0, torso);
  obj(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(shirt), 0, 0.38, 0, torso);
  if (scarf) obj(new THREE.TorusGeometry(0.075, 0.03, 10, 20), toon(scarf), 0, 0.44, 0.01, torso, 0.01).rotation.x = Math.PI / 2;
  const headPiv = new THREE.Group(); headPiv.position.y = 0.43; torso.add(headPiv);
  const head = obj(new THREE.SphereGeometry(0.21, 40, 28), toon(0xf7f7f5), 0, 0.2, 0, headPiv); head.scale.set(1.0, 0.92, 0.95);
  const faceC = canvasTex(512, 512, null);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.2112, 40, 28, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.18, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: faceC.t, transparent: true, depthWrite: false }));
  face.renderOrder = 2; head.add(face);
  const hairT = texT(256, 128, (x) => { x.fillStyle = '#' + hair.toString(16).padStart(6, '0'); x.fillRect(0, 0, 256, 128); x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(150, 10, 12, 100); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(118, 0, 6, 128); });
  const hairM = obj(new THREE.SphereGeometry(0.218, 40, 20, 0, Math.PI * 2, 0, Math.PI * (young ? 0.36 : 0.3)), toon(0xffffff, hairT), 0, 0, 0, head); hairM.rotation.x = young ? -0.25 : 0.45; // young: fringe off the eyes; old: receding
  if (!young) obj(new THREE.SphereGeometry(0.219, 30, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.28, Math.PI * 0.2), toon(hair), 0, 0, 0, head, 0);
  const lim = {}; for (const k of ['ua_l', 'fa_l', 'ua_r', 'fa_r', 'th_l', 'sh_l', 'th_r', 'sh_r']) { lim[k] = new THREE.Mesh(limbGeo, BLACK); lim[k].castShadow = true; root.add(lim[k]); }
  const hands = { l: new THREE.Mesh(ballGeo, BLACK), r: new THREE.Mesh(ballGeo, BLACK) }; for (const h of Object.values(hands)) { h.scale.setScalar(0.034); h.castShadow = true; root.add(h); }
  const feet = { l: new THREE.Mesh(ballGeo, BLACK), r: new THREE.Mesh(ballGeo, BLACK) }; for (const f of Object.values(feet)) { f.scale.set(0.045, 0.025, 0.06); f.castShadow = true; root.add(f); }
  let faceKind = '';
  const c = { root, torso, headPiv, head, hands, feet, body,
    face(spec) { if (spec === faceKind) return; faceKind = spec; drawFace(faceC.ctx, spec); faceC.t.needsUpdate = true; },
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
        seg(lim['ua_' + side], sh, el, 0.011); seg(lim['fa_' + side], el, hd, 0.011); hands[side].position.copy(hd); return hd; };
      const leg = (side, a) => { const sx = side === 'l' ? 1 : -1; const hp = V(sx * 0.06, hipY + 0.02, 0);
        const kn = hp.clone().addScaledVector(V(0, -1, 0).applyEuler(new THREE.Euler(a.h ?? 0, 0, sx * (a.s ?? 0.03))), 0.36);
        const ft = kn.clone().addScaledVector(V(0, -1, 0).applyEuler(new THREE.Euler((a.h ?? 0) - (a.k ?? 0), 0, sx * (a.s ?? 0.03))), 0.36);
        seg(lim['th_' + side], hp, kn, 0.012); seg(lim['sh_' + side], kn, ft, 0.012); feet[side].position.copy(ft).add(V(0, 0.01, 0.02)); return kn; };
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
export const blinkAt = (t, seed) => ((t + seed * 1.37) % 3.3) < 0.11;
// face spec with a blink and (optionally) the mouth opened by the voice
export const faceAt = (kind, t, seed, open = 0) => kind + (open > 0 ? '|o' + open : '') + (blinkAt(t, seed) ? '|b' : '');

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
  renderer.setRenderTarget(null); renderer.render(scene, camera);
  octx.imageSmoothingQuality = 'high'; octx.drawImage(renderer.domElement, 0, 0, W, H);
  const c = caps && caps.find((x) => t >= x[0] && t < x[1]); if (!c) return;
  const pop = 1 + 0.15 * clamp(1 - (t - c[0]) / 0.1); octx.save(); octx.translate(W / 2, y); octx.scale(pop, pop);
  let size = 110; octx.font = `900 ${size}px Inter`; while (octx.measureText(c[2]).width > W - 120) { size -= 6; octx.font = `900 ${size}px Inter`; }
  octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.lineJoin = 'round'; octx.lineWidth = 22; octx.strokeStyle = '#000'; octx.strokeText(c[2], 0, 0); octx.fillStyle = '#fff'; octx.fillText(c[2], 0, 0); octx.restore();
}
