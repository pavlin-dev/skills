// The "storytime" look on top of toon.js: skin-coloured heads, round white eyes (EYES.round), and costume helpers
// for the cast these stories need (a prisoner, a guard, a judge, plain clothes). Import it in story.js next to toon.js.
import { THREE, obj, toon, texT, makeChar, EYES } from './toon.js';

// skin tones, light to dark; vary them across the cast
export const SKIN = { pale: 0xf6dcc0, light: 0xf3cfa6, tan: 0xe8b98c, brown: 0xb0754a, deep: 0x8a5634, dark: 0x6b4028 };
export function skin(c, tone) { c.head.material.color.set(tone); c.head.material.emissive.set(tone); }

// a character in this look: makeChar with round eyes and a skin tone. Options are makeChar's plus { skin }.
export function storyChar({ skin: tone = SKIN.light, ...o } = {}) {
  const c = makeChar({ young: true, eyes: EYES.round, ...o }); skin(c, tone); return c;
}
// horizontal black and white prison stripes on the shirt
export function stripes(c, a = '#f2f0ea', b = '#26262a') {
  c.body.material.map = texT(512, 256, (x) => { x.fillStyle = a; x.fillRect(0, 0, 512, 256); x.fillStyle = b; for (let y = 10; y < 256; y += 34) x.fillRect(0, y, 512, 16); });
}
// a peaked uniform cap (guard, police), worn outside the hair; badge = colour of the small round badge
export function peakedCap(c, color = 0x3e4a2e, badge = 0xd4b03a) {
  const cap = new THREE.Group(); cap.position.set(0, 0.2, 0.01); c.head.add(cap);
  obj(new THREE.CylinderGeometry(0.235, 0.25, 0.12, 32), toon(color), 0, 0, 0, cap);
  obj(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 32), toon(new THREE.Color(color).multiplyScalar(0.75).getHex()), 0, 0.065, 0, cap);
  obj(new THREE.CylinderGeometry(0.16, 0.16, 0.018, 24, 1, false, -Math.PI / 2, Math.PI), toon(0x1f1f1f), 0, -0.055, 0.2, cap).rotation.x = 0.15;
  obj(new THREE.SphereGeometry(0.02, 10, 8), toon(badge), 0, 0, 0.25, cap);
  return cap;
}
