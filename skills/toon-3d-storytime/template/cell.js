// Example set in this look: a prison cell (a prisoner behind bars, a guard outside), densely dressed. One still, no story:
// copy the set-building patterns, replace the shot with your own story.js shots.
import { THREE, V, scene, obj, toon, RB, texT, place, standPose, life, faceAt, shotCam, present, glowy, FOCUS } from './toon.js';
import { picture } from './props.js';
import { SKIN, storyChar, stripes, peakedCap } from './look.js';
await document.fonts.load('900 92px Inter');
window.DURATION = 2;
scene.background = new THREE.Color(0xe8dcc0);
const tex = (w, h, rep, draw) => { const t = texT(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; };
// floor tiles, a brick wall with a teal lower half
obj(new THREE.PlaneGeometry(10, 10), toon(0xffffff, tex(128, 128, [8, 8], (x) => { x.fillStyle = '#d9c9a3'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#b9a883'; x.fillRect(0, 124, 128, 4); x.fillRect(124, 0, 4, 128); })), 0, 0, 0, scene, 0).rotation.x = -Math.PI / 2;
const brick = tex(256, 128, [6, 6], (x) => { x.fillStyle = '#efe3c4'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#d6c69f'; x.lineWidth = 4; for (let r = 0; r < 4; r++) { x.beginPath(); x.moveTo(0, r * 32); x.lineTo(256, r * 32); x.stroke(); for (let c = 0; c < 4; c++) { const X = c * 64 + (r % 2) * 32; x.beginPath(); x.moveTo(X, r * 32); x.lineTo(X, r * 32 + 32); x.stroke(); } } });
for (const [px, pz, ry, w] of [[0, -2.0, 0, 6], [-2.2, 0, Math.PI / 2, 6]]) {
  const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = ry; scene.add(g);
  obj(new THREE.PlaneGeometry(w, 3), toon(0xffffff, brick), 0, 1.5, 0, g, 0);
  obj(new THREE.PlaneGeometry(w, 0.75), toon(0x3f8f80), 0, 0.375, 0.005, g, 0);
}
// barred window, a calendar with crossed-out days, tally marks, a bunk, a toilet, a ceiling lamp
const win = new THREE.Group(); win.position.set(0.3, 1.75, -1.98); scene.add(win);
obj(RB(0.75, 0.6, 0.06, 0.02), toon(0xd8cba8), 0, 0, 0, win); obj(RB(0.62, 0.48, 0.02, 0.01), toon(0xb5523b), 0, 0, 0.03, win);
for (let i = -2; i <= 2; i++) obj(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), toon(0x2b2b2b), i * 0.11, 0, 0.05, win);
const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.4), new THREE.MeshBasicMaterial({ map: texT(320, 400, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 320, 400); x.fillStyle = '#d64a3a'; x.fillRect(0, 0, 320, 80); x.fillStyle = '#fff'; x.font = '900 46px Inter'; x.textAlign = 'center'; x.fillText('JULY', 160, 56); x.fillStyle = '#333'; x.font = '600 26px Inter'; for (let d = 0; d < 28; d++) x.fillText(String(d + 1), 30 + (d % 7) * 44, 130 + Math.floor(d / 7) * 64); x.strokeStyle = '#d64a3a'; x.lineWidth = 5; for (let d = 0; d < 12; d++) { const X = 30 + (d % 7) * 44, Y = 120 + Math.floor(d / 7) * 64; x.beginPath(); x.moveTo(X - 14, Y - 14); x.lineTo(X + 14, Y + 8); x.stroke(); } }) }));
cal.position.set(-0.75, 1.55, -1.99); scene.add(cal);
const tally = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ transparent: true, map: texT(400, 200, (x) => { x.strokeStyle = '#5a4a3a'; x.lineWidth = 7; for (let g = 0; g < 3; g++) { for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(20 + g * 130 + i * 22, 40); x.lineTo(20 + g * 130 + i * 22, 150); x.stroke(); } x.beginPath(); x.moveTo(10 + g * 130, 140); x.lineTo(100 + g * 130, 50); x.stroke(); } }) }));
tally.position.set(1.15, 1.4, -1.99); scene.add(tally);
const bunk = new THREE.Group(); bunk.position.set(-1.6, 0, -0.6); bunk.rotation.y = Math.PI / 2; scene.add(bunk);
obj(RB(1.7, 0.12, 0.7, 0.03), toon(0x6d7680), 0, 0.42, 0, bunk); obj(RB(1.6, 0.1, 0.62, 0.05), toon(0xe9e4d8), 0, 0.53, 0, bunk); obj(RB(0.4, 0.1, 0.5, 0.05), toon(0xffffff), 0.6, 0.62, 0, bunk);
obj(RB(1.2, 0.06, 0.6, 0.03), toon(0x8b6a4a), -0.2, 0.585, 0.02, bunk);
for (const sx of [-0.8, 0.8]) for (const sz of [-0.3, 0.3]) obj(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8), toon(0x4a5058), sx, 0.21, sz, bunk);
const wc = new THREE.Group(); wc.position.set(1.2, 0, -1.6); scene.add(wc);
obj(new THREE.CylinderGeometry(0.17, 0.12, 0.38, 18), toon(0xf4f4f0), 0, 0.19, 0.1, wc); obj(RB(0.36, 0.4, 0.14, 0.04), toon(0xf4f4f0), 0, 0.45, -0.1, wc);
glowy(obj(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), -1.0, 2.55, -1.6));
picture(scene, 1.6, 1.25, -1.99, { w: 0.3, h: 0.36, bg: 0x7fb2d9 });
// cell bars with a lock
const bars = new THREE.Group(); bars.position.set(0, 0, 0.9); scene.add(bars); const iron = toon(0x2a2a2c);
for (let i = -12; i <= 12; i++) obj(new THREE.CylinderGeometry(0.022, 0.022, 2.8, 10), iron, i * 0.17, 1.4, 0, bars);
for (const y of [0.06, 1.0, 2.6]) obj(RB(4.3, 0.07, 0.07, 0.02), iron, 0, y, 0, bars);
obj(RB(0.16, 0.2, 0.09, 0.02), iron, 0.62, 1.0, 0.03, bars); obj(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), toon(0xc9a43a), 0.62, 1.0, 0.08, bars).rotation.x = Math.PI / 2;

// cast: a prisoner in stripes, a guard in an olive uniform and a peaked cap
const pris = storyChar({ skin: SKIN.light, hair: 0x5a3a24, shirt: 0xffffff }); stripes(pris);
const guard = storyChar({ skin: SKIN.deep, hair: 0x1d1714, shirt: 0x55663f, young: false }); peakedCap(guard);

window.renderFrame = (t) => {
  place(pris, -0.35, 0.35, 0.2); place(guard, 0.75, 1.35, -0.55);
  pris.pose(life(pris, t, 1, standPose({ hp: -0.05, al: { p: -1.1, r: 0.3, e: -0.8 }, ar: { p: -0.3, r: 0.2, e: -0.5 } })));
  pris.face(faceAt('dizzy', t, 1));
  guard.pose(life(guard, t, 2, standPose({ hy: -0.4, ar: { p: 0.1, r: 0.9, e: -2.0, er: 0.6 }, al: { p: -0.6, r: 0.2, e: -0.8 } })));
  guard.face(faceAt('bored', t, 2));
  FOCUS.at = V(0.2, 1.2, 0.6);
  shotCam(V(-0.15, 1.3, 4.3), V(0.1, 1.0, 0.6), 44, t);
  present(t, [[0, 9, 'cell']], 1300);
};
window._ready();
