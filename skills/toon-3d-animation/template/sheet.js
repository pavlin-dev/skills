// Model sheet: the cast seen from the angles a short uses, in bent poses and in close-up, before any scene is built.
// Put your own cast and their expressions in CAST, render all frames and look at them side by side:
//   node scripts/render.mjs <dir>/sheet.html <dir>/sheet --fps 1 --frames 0,1,2,3,4,5,6,7
// 0 front, 1 three-quarter, 2 from above (shorts often look down), 3 from behind, 4-5 bend test (side, front),
// 6-7 face close-ups (front, three-quarter from above).
import { THREE, V, scene, camera, renderer, octx, W, H, sun, hemi, fill, makeChar, place, standPose, sitPose, obj, toon, renderInk, EYES } from './toon.js';
await document.fonts.load('900 60px Inter');
window.DURATION = 8;
scene.background = new THREE.Color(0xcfe6f2);
obj(new THREE.CircleGeometry(8, 48), toon(0xe9dcc6), 0, 0, 0, scene, 0).rotation.x = -Math.PI / 2;
obj(new THREE.PlaneGeometry(16, 6), toon(0x9fd0c4), 0, 3, -2.2, scene, 0);
sun.color.set(0xfff1dc); sun.intensity = 2.2; sun.position.set(3, 6, 4); hemi.color.set(0xe6f4ff); hemi.groundColor.set(0x9a8a7a); hemi.intensity = 1.2; fill.intensity = 0.8;
const CAST = [ // [makeChar options, expression, pose]
  [{ hair: 0x6b3e22, shirt: 0xe0602f, young: true, tag: 'MILO' }, 'smile', { al: { p: -0.2, r: 0.35, e: -0.5 } }],
  [{ hair: 0xb8b8b8, shirt: 0x7a2a3a }, 'sly', { hy: 0.2, ar: { p: -0.9, r: 0.2, e: -0.9 } }],
  [{ hair: 0x2e231e, shirt: 0x3b6fd1, young: true, eyes: EYES.cute }, 'surprised', { al: { p: -2.4, r: 0.5, e: -0.3 }, ar: { p: -2.4, r: 0.5, e: -0.3 } }],
  [{ hair: 0xdedede, shirt: 0x3f6a4a, eyes: EYES.small }, 'flat', { hp: 0.1 }],
];
const cast = CAST.map(([o, f, p], i) => { const c = makeChar(o); place(c, -1.05 + i * 0.7, 0, 0); c.pose(standPose(p)); c.face(f); return c; });
// bend test: hands on hips, a wave, a step with a raised knee, sitting (elbows and knees bend smoothly, feet curl)
const BENT = [standPose({ al: { p: 0.1, r: 0.9, e: -2.0, er: 0.6 }, ar: { p: 0.1, r: 0.9, e: -2.0, er: 0.6 } }),
  standPose({ ar: { p: -2.0, r: 0.6, e: -1.6 }, al: { p: 0.2, r: 0.2, e: -0.6 } }),
  standPose({ ll: { h: -1.2, k: -1.6 }, lr: { h: 0.35, k: -0.4 }, al: { p: 0.6, r: 0.2, e: -1.0 }, ar: { p: -0.7, r: 0.2, e: -1.2 }, lean: 0.1 }),
  sitPose({ hipY: 0.42, al: { p: -0.6, r: 0.3, e: -1.4 }, ar: { p: -0.6, r: 0.3, e: -1.4 } })];
const HEAD = 1.39; // head centre of a standing character (hipY 0.72 + head pivot), for the close-ups
const VIEWS = [ // camera position, look at, fov
  [V(0, 1.1, 6.6), V(0, 0.85, 0), 40], [V(4.0, 1.3, 5.0), V(-0.15, 0.85, 0), 40], [V(0.3, 4.6, 4.6), V(0, 0.8, 0), 40],
  [V(-1.2, 1.5, -6.2), V(0, 1.1, 0), 40], [V(5.2, 0.9, 2.2), V(0.1, 0.7, 0), 40], [V(0.4, 1.0, 6.2), V(0, 0.75, 0), 40],
  [V(-1.05, HEAD + 0.08, 1.9), V(-1.05, HEAD, 0), 34], [V(0.0, HEAD + 0.5, 1.6), V(-0.35, HEAD - 0.05, 0), 34],
];
window.renderFrame = (t) => {
  const vi = Math.min(VIEWS.length - 1, Math.round(t)), [p, a, f] = VIEWS[vi];
  cast.forEach((c, i) => c.pose(vi === 4 || vi === 5 ? BENT[i] : standPose(CAST[i][2])));
  camera.position.copy(p); camera.lookAt(a); camera.fov = f; camera.updateProjectionMatrix();
  renderInk(); octx.drawImage(renderer.domElement, 0, 0, W, H);
};
window._ready();
