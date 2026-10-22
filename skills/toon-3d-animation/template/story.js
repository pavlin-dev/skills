// Example story built on toon.js: three shots driven by the voice-over's word times (timeline.json).
// Replace the set, the cast, the phone screen and the shots with your own; keep the patterns:
// every pose goes through life(), faces blink and talk with the voice, cuts land on words, impacts get punch().
import { THREE, V, clamp, lerp, ss, eio, back, rr, scene, obj, toon, RB, makeChar, place, hideChars, sitPose, standPose,
  life, faceAt, mouth, loadTimeline, T, shotCam, punch, makePhone, holdPhone, typed, phoneCloseUp, captionsFrom, present } from './toon.js';

await document.fonts.load('900 92px Inter'); await document.fonts.load('400 34px Inter'); await document.fonts.load('600 40px Inter');
const TL = await loadTimeline('timeline.json');
const CAPS = captionsFrom(TL);

// ---------- set: a small living room (flat colours, bold outlines, a few props) ----------
const floorT = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#c98f5a'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 64 + 61, 256, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t; })();
obj(new THREE.PlaneGeometry(8, 8), toon(0xffffff, floorT), 0, 0, 0, scene, 0).rotation.x = -Math.PI / 2;
obj(new THREE.PlaneGeometry(8, 3), toon(0x9fd3c7), 0, 1.5, -2.2, scene, 0);
obj(new THREE.PlaneGeometry(6, 3), toon(0x9fd3c7), -3, 1.5, 0, scene, 0).rotation.y = Math.PI / 2;
const sofa = new THREE.Group(); sofa.position.set(0, 0, -1.5); scene.add(sofa); const sm = toon(0xe8a33d);
obj(RB(1.9, 0.42, 0.85, 0.08), sm, 0, 0.21, 0, sofa); obj(RB(1.9, 0.62, 0.22, 0.08), sm, 0, 0.55, -0.32, sofa); for (const sx of [-1, 1]) obj(RB(0.2, 0.62, 0.85, 0.08), sm, sx * 0.95, 0.31, 0, sofa);
obj(RB(1.3, 1.0, 0.06, 0.02), toon(0xf4efe4), 1.3, 1.65, -2.17); obj(new THREE.PlaneGeometry(1.15, 0.85), toon(0x9ad7ff), 1.3, 1.65, -2.13, scene, 0);
obj(new THREE.CircleGeometry(1.3, 40), toon(0xd9534f), 0, 0.005, -0.4, scene, 0).rotation.x = -Math.PI / 2;

// ---------- cast ----------
const tom = makeChar({ hair: 0x1f1a17, shirt: 0x3b6fd1, young: true });
const me = makeChar({ hair: 0x8a4b22, shirt: 0xe07a2f, young: true });
const phone = makePhone();

// the app on the phone. In a real video this is a screenshot of the real product (scripts/shoot_site.mjs),
// with the typed text drawn into its real input box.
function drawApp(text, key, press) {
  const x = phone.ctx; x.fillStyle = '#fff7ef'; x.fillRect(0, 0, 720, 1520);
  x.fillStyle = '#d9534f'; x.fillRect(0, 0, 720, 170); x.fillStyle = '#fff'; x.font = '900 64px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Order', 360, 100);
  x.fillStyle = '#fff'; x.strokeStyle = '#ddd'; x.lineWidth = 4; rr(x, 40, 240, 640, 110, 30); x.fill(); x.stroke();
  x.fillStyle = '#222'; x.font = '600 40px Inter'; x.textAlign = 'left'; x.fillText(text, 80, 297); const w = x.measureText(text).width; x.fillStyle = '#d9534f'; x.fillRect(84 + w, 270, 4, 54);
  x.fillStyle = `rgba(217,83,79,${0.3 + 0.7 * press})`; rr(x, 40, 400, 640, 110, 30); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('Send', 360, 457);
  phone.drawKeyboard(key, false); phone.update();
}

// ---------- shots (cut on words) ----------
const cut1 = T('l2:so') - 0.15, cut2 = T('l3:done') - 0.15;
const typeA = T('l2:just'), typeB = T('l2:it') + 0.6, ORDER = 'two large pizzas';
function shot(t) {
  hideChars(); phone.group.visible = false;
  if (t < cut1) { // Tom on the sofa, hand on his chin, thinking; I talk to the camera
    place(tom, -0.35, -1.38, 0.35); place(me, 0.75, -0.55, -0.6);
    const think = ss(T('l1:forgets') - 0.3, T('l1:forgets'), t);
    tom.pose(life(tom, t, 1, sitPose({ hp: -0.15 * think, hr: 0.2 * think, ar: { p: lerp(-0.5, -2.2, think), r: 0.1, e: lerp(-0.9, -2.3, think) } })));
    tom.face(faceAt(think > 0.5 ? 'flat' : 'smile', t, 1));
    me.pose(life(me, t, 2, standPose({ hy: 0.35, al: { p: -0.3, r: 0.35, e: -1.4 + 0.3 * Math.sin(t * 6) * (mouth(t, ['l1']) > 0 ? 1 : 0) } }), 1.2));
    me.face(faceAt('smile', t, 2, mouth(t, ['l1']))); me.squash(0.25 * punch(t, T('l1:forgets'), 0.15));
    const u = eio(t / cut1); shotCam(V(1.5 - 0.2 * u, 1.35, 1.5 - 0.3 * u), V(0.1, 0.85, -0.9), 48 - 6 * punch(t, T('l1:forgets'), 0.35), t);
  } else if (t < cut2) { // close-up: the order is typed letter by letter (hands tap, keys light up), then Send
    place(me, 0.75, -0.55, -0.6); const ty = typed(ORDER, typeA, typeB, t), send = clamp((t - typeB - 0.15) / 0.3);
    ty.hits.push({ ch: 'p', dt: t - (typeB + 0.15) }); // the right hand also taps Send
    holdPhone(me, phone, life(me, t, 2, standPose({ hp: 0.35 }), 0.4), t, ty);
    drawApp(ty.text, ty.key, send > 0 && send < 1 ? 1 - send : 0);
    phoneCloseUp(phone, me, t);
  } else { // Tom finally finds his phone; I shrug at the camera
    place(tom, -0.35, -1.38, 0.35); place(me, 0.75, -0.55, -0.6);
    const found = ss(T('l3:found') - 0.2, T('l3:found'), t);
    tom.pose(life(tom, t, 1, sitPose({ ar: { p: lerp(-0.5, -1.6, found), r: 0.1, e: -1.2 } }))); tom.face(faceAt(found > 0.5 ? 'surprised' : 'flat', t, 1)); tom.squash(0.4 * punch(t, T('l3:found'), 0.12));
    const sh = back(clamp((t - cut2 - 0.1) / 0.35));
    me.pose(life(me, t, 2, standPose({ hy: 0.35, al: { p: -0.3 * sh, r: 0.9 * sh, e: -1.6 * sh, er: -0.4 * sh }, ar: { p: -0.3 * sh, r: 0.9 * sh, e: -1.6 * sh, er: -0.4 * sh } }), 1.2));
    me.face(faceAt('shrug', t, 2, mouth(t, ['l3'])));
    shotCam(V(1.4, 1.35, 1.3), V(0.1, 0.85, -0.9), 46, t);
  }
}
window.renderFrame = (t) => { shot(t); present(t, CAPS, t >= cut1 && t < cut2 ? 1660 : 1300); }; // captions off the keyboard in the close-up
window._ready();
