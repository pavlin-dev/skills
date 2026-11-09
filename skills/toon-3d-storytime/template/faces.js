// Face sheet for this look: one close-up per expression, alternating skin tones. Check faces here before scenes:
//   node <toon-3d-animation>/scripts/render.mjs <dir>/faces.html <dir>/faces --fps 1 --frames 0,1,2,3,4,5,6,7
import { THREE, V, scene, camera, renderer, octx, obj, toon, place, standPose, renderInk } from './toon.js';
import { SKIN, storyChar } from './look.js';
await document.fonts.load('900 60px Inter');
window.DURATION = 8;
scene.background = new THREE.Color(0xe9d9b8);
obj(new THREE.PlaneGeometry(16, 6), toon(0xd9b98a), 0, 3, -1.5, scene, 0);
const FACES = ['worried', 'dizzy', 'bored', 'glad', 'surprised|o0.8', 'angry', 'talk|o0.7', 'scared'];
const cs = [[SKIN.light, 0x5a3a24, 0xf2f0ea], [SKIN.deep, 0x1d1714, 0x55663f], [SKIN.tan, 0x2a1d16, 0x3f9a5a], [SKIN.dark, 0x141010, 0xe6e2d8]]
  .map(([sk, hair, shirt]) => storyChar({ skin: sk, hair, shirt }));
window.renderFrame = (t) => {
  const i = Math.min(7, Math.round(t)), c = cs[i % 4];
  cs.forEach((o) => (o.root.visible = false)); place(c, 0, 0, 0);
  c.pose(standPose({ hy: i % 2 ? -0.25 : 0.2, hp: 0.05 })); c.face(FACES[i]);
  camera.position.set(i % 2 ? -0.5 : 0.5, 1.45, 1.9); camera.lookAt(V(0, 1.3, 0)); camera.fov = 34; camera.updateProjectionMatrix();
  renderInk(); octx.drawImage(renderer.domElement, 0, 0, 1080, 1920);
};
window._ready();
