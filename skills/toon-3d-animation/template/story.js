// Example story built on toon.js: three shots driven by the voice-over's word times (timeline.json).
// Replace the set, the cast, the phone screen and the shots with your own; keep the patterns:
// every pose goes through life(), gestures and faces are keyed to words (keyed, faceKeys: they land just before the
// word, a face swaps through a blink), faces blink and talk with the voice, cuts land on words, impacts get punch().
import { THREE, V, clamp, lerp, ss, eio, back, rr, scene, obj, toon, RB, makeChar, place, hideChars, sitPose, standPose,
  life, faceAt, keyed, faceKeys, mouth, loadTimeline, T, shotCam, punch, makePhone, holdPhone, typed, phoneCloseUp, captionsFrom, present } from './toon.js';
import { shelf, plant, lamp, windowWithCurtains, picture, wallClock, coffeeTable, sideTable, rug, cushions } from './props.js';

await document.fonts.load('900 92px Inter'); await document.fonts.load('400 34px Inter'); await document.fonts.load('600 40px Inter');
const TL = await loadTimeline('timeline.json');
const CAPS = captionsFrom(TL);

// ---------- set: a small living room, densely dressed (props.js): a bare wall looked cheap ----------
const floorT = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#c98f5a'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 64 + 61, 256, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t; })();
const wallT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#9fd3c7'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#93c8bb'; x.fillRect(0, 0, 32, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 1); return t; })(); // a striped wall
obj(new THREE.PlaneGeometry(8, 8), toon(0xffffff, floorT), 0, 0, 0, scene, 0).rotation.x = -Math.PI / 2;
obj(new THREE.PlaneGeometry(8, 3), toon(0xffffff, wallT), 0, 1.5, -2.2, scene, 0);
obj(new THREE.PlaneGeometry(6, 3), toon(0xffffff, wallT), -3, 1.5, 0, scene, 0).rotation.y = Math.PI / 2;
obj(RB(8, 0.1, 0.03, 0.01), toon(0xf4efe4), 0, 0.05, -2.18); // skirting board
const sofa = new THREE.Group(); sofa.position.set(0, 0, -1.5); scene.add(sofa); const sm = toon(0xe8a33d);
obj(RB(1.9, 0.42, 0.85, 0.08), sm, 0, 0.21, 0, sofa); obj(RB(1.9, 0.62, 0.22, 0.08), sm, 0, 0.55, -0.32, sofa); for (const sx of [-1, 1]) obj(RB(0.2, 0.62, 0.85, 0.08), sm, sx * 0.95, 0.31, 0, sofa);
cushions(sofa, -0.12, 0.42, -0.16, { spread: 1.3 });
windowWithCurtains(scene, 1.45, 1.6, -2.17);
shelf(scene, -1.55, 0, -2.05, { w: 0.8, levels: 4 }); // a bookcase left of the sofa
picture(scene, -0.45, 1.55, -2.18); picture(scene, 0.2, 1.7, -2.18, { w: 0.34, h: 0.44, bg: 0xd96c75 }); wallClock(scene, 0.72, 1.95, -2.17);
picture(scene, -2.97, 1.5, -0.8, { w: 0.6, h: 0.45, ry: Math.PI / 2, bg: 0xf2c14e });
sideTable(scene, 1.25, -1.7); plant(scene, 1.95, 0, -1.8, 1.4); lamp(scene, -2.4, 0, -1.3);
coffeeTable(scene, -0.35, -0.55); rug(scene, 0, -0.5, { w: 2.4, d: 1.6 });

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
    tom.pose(life(tom, t, 1, keyed([[0, sitPose()], [T('l1:forgets'), sitPose({ hp: -0.15, hr: 0.2, ar: { p: -2.2, r: 0.1, e: -2.3 } })]], t)));
    tom.face(faceKeys([[0, 'smile'], [T('l1:forgets'), 'flat']], t, 1));
    me.pose(life(me, t, 2, standPose({ hy: 0.35, al: { p: -0.3, r: 0.35, e: -1.4 + 0.3 * Math.sin(t * 6) * (mouth(t, ['l1']) > 0 ? 1 : 0) } }), 1.2));
    me.face(faceAt('smile', t, 2, mouth(t, ['l1']))); me.squash(0.25 * punch(t, T('l1:forgets'), 0.15));
    const u = eio(t / cut1); shotCam(V(1.75 - 0.2 * u, 1.45, 1.95 - 0.3 * u), V(0.15, 0.9, -0.9), 48 - 6 * punch(t, T('l1:forgets'), 0.35), t);
  } else if (t < cut2) { // close-up: the order is typed letter by letter (hands tap, keys light up), then Send
    place(me, 0.75, -0.55, -0.6); const ty = typed(ORDER, typeA, typeB, t), send = clamp((t - typeB - 0.15) / 0.3);
    ty.hits.push({ ch: 'p', dt: t - (typeB + 0.15) }); // the right hand also taps Send
    holdPhone(me, phone, life(me, t, 2, standPose({ hp: 0.35 }), 0.4), t, ty);
    drawApp(ty.text, ty.key, send > 0 && send < 1 ? 1 - send : 0);
    phoneCloseUp(phone, me, t);
  } else { // Tom finally finds his phone; I shrug at the camera
    place(tom, -0.35, -1.38, 0.35); place(me, 0.75, -0.55, -0.6);
    tom.pose(life(tom, t, 1, keyed([[0, sitPose({ ar: { p: -0.5, r: 0.1, e: -1.2 } })], [T('l3:found'), sitPose({ ar: { p: -1.6, r: 0.1, e: -1.2 } })]], t)));
    tom.face(faceKeys([[0, 'flat'], [T('l3:found'), 'surprised']], t, 1)); tom.squash(0.4 * punch(t, T('l3:found'), 0.12));
    const sh = back(clamp((t - cut2 - 0.1) / 0.35));
    me.pose(life(me, t, 2, standPose({ hy: 0.35, al: { p: -0.3 * sh, r: 0.9 * sh, e: -1.6 * sh, er: -0.4 * sh }, ar: { p: -0.3 * sh, r: 0.9 * sh, e: -1.6 * sh, er: -0.4 * sh } }), 1.2));
    me.face(faceAt('shrug', t, 2, mouth(t, ['l3'])));
    shotCam(V(1.7, 1.45, 1.8), V(0.15, 0.9, -0.9), 46, t);
  }
}
window.renderFrame = (t) => { shot(t); present(t, CAPS, t >= cut1 && t < cut2 ? 1660 : 1300); }; // captions off the keyboard in the close-up
window._ready();
