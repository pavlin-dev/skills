// EXAMPLE WORLD - "How the James Webb telescope unfolded itself" (42 s). Replace it with your own story;
// keep the structure. Everything happens in ONE world under ONE camera:
//   1. constants: the world's scale and where things are (here 1 m ≈ 12 world px, the pad at y = 0, up is -y)
//   2. keys(): the story clock - named moments taken from the voice-over's word times (at(line, word))
//   3. state functions: where each object is and how far it is deployed, as pure functions of t
//   4. camKeys(): where the camera looks and how close, keyed to those moments (targets can follow objects)
//   5. drawing: sky (screen), world (camera space), overlay (screen: labels anchored with toScreen, mascot)
// Needs toon.js loaded first and timeline.json next to index.html.

Object.assign(C, {
  gold: '#f4c34f', goldD: '#c58b25', goldL: '#ffe39a', back: '#3b3452', backD: '#272238',
  shield: '#cfb2ee', shieldD: '#9877c6', shieldL: '#efe2ff', panel: '#3b67b8', panelD: '#264682',
});

const EARTH = { x: 0, y: 6000, r: 6000 };
const SUN = { x: -7000, y: 9500, r: 900 };
const RS = 0.54;              // rocket drawing scale (Ariane 5 ≈ 52 m)
const TS = 0.3;               // telescope drawing scale (mirror 6.5 m ≈ 82 px)
const TEL0 = [0, -480];       // telescope origin while it sits in the fairing
const FAIR_X = 66 * RS;       // fairing half-width in world units
const MX = 175, MY = 1300;    // mascot (screen)

// ---------- the telescope ----------
// Flat-top hex grid, ring 1 + ring 2 = 18 segments; columns q = ±2 (3 segments each) are the folding wings.
const HEX = [];
for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { const s = -q - r; if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= 2 && (q || r)) HEX.push([q, r]); }
// mirror(o): o.R hex radius, o.wl / o.wr wing deploy 0..1 (0 = folded behind), o.gap extra spacing, o.goldK how many segments are gold (0..1),
// o.shine sweep 0..1, o.struts secondary-mirror struts 0..1, o.frost 0..1
function mirror(x, y, o = {}) {
  const R = o.R ?? 40, gap = o.gap ?? 0, sp = 1 + gap;
  const order = HEX.map((h, i) => [h, i]).sort((a, b) => (a[0][0] - b[0][0]) || (a[0][1] - b[0][1]));
  const draw = (list, back) => list.forEach(([[q, r], i]) => {
    let hx = 1.5 * R * q * sp, hy = Math.sqrt(3) * R * (r + q / 2) * sp, sx = 1;
    const wing = Math.abs(q) === 2 ? (q < 0 ? o.wl ?? 1 : o.wr ?? 1) : 1;
    if (Math.abs(q) === 2) { // rotate about the hinge between column 1 and 2
      const hinge = Math.sign(q) * 2.25 * R * sp, ang = (1 - wing) * Math.PI * 0.95;
      hx = hinge + (hx - hinge) * Math.cos(ang); sx = Math.cos(ang);
      if ((sx < 0) !== back) return;
    } else if (back) return;
    const goldIdx = (i * 7) % 18 / 18, isGold = (o.goldK ?? 1) > goldIdx;
    const pts = hexPts(0, 0, R * 0.96, 0).map(([px, py]) => [x + hx + px * Math.abs(sx), y + hy + py]);
    const facing = sx >= 0;
    let fill = isGold ? C.gold : C.grey, dark = isGold ? C.goldD : C.greyD, light = isGold ? C.goldL : '#dcd8e6';
    if (!facing) { fill = C.back; dark = C.backD; light = null; }
    shape(pts, fill, { alpha: o.alpha ?? 1, dark, light, w: 4.5, seed: 100 + i * 3, amp: 1, sd: [R * 0.18, R * 0.2], lw: [R * 0.12, R * 0.14] });
    if (facing && o.shine != null && isGold) { // light sweep across the mirror
      const d = (hx / (R * 6)) - (o.shine * 2.4 - 1.2);
      const a = Math.max(0, 1 - Math.abs(d) * 4);
      if (a > 0) { ctx.save(); ctx.globalAlpha = a * 0.8; trace(pts); ctx.fillStyle = '#fff8dc'; ctx.fill(); ctx.restore(); }
    }
    if (facing && o.tint) { ctx.save(); trace(pts); ctx.clip(); ctx.globalAlpha *= o.tint.a; ctx.fillStyle = C.red; ctx.fillRect(-4000, -4000, 4000 + o.tint.x0, 8000); ctx.fillRect(o.tint.x1, -4000, 8000, 8000); ctx.restore(); }
    if (facing && o.frost) { ctx.save(); ctx.globalAlpha = o.frost * 0.55; trace(pts); ctx.fillStyle = '#cdeaff'; ctx.fill(); ctx.restore(); }
  });
  draw(order, true);
  draw(order, false);
  if ((o.struts ?? 1) > 0) { // secondary mirror on three struts
    const k = easeOut(o.struts ?? 1), sx = x, sy = y - R * 0.4 * k, len = R * 4.6 * k;
    const feet = [[x, y - R * 4.2], [x - R * 3.4, y + R * 2.3], [x + R * 3.4, y + R * 2.3]];
    const tip = [sx, sy - (1 - k) * 10];
    feet.forEach(([fx, fy], i) => stroke([[fx, fy], [lerp(fx, tip[0], k), lerp(fy, tip[1], k)]], { w: 3.5, color: '#2a2440', seed: 60 + i, amp: 0.6 }));
    if (k > 0.95) shape(circ(tip[0], tip[1], R * 0.42), C.gold, { dark: C.goldD, w: 4.5, seed: 70, amp: 0.8, sd: [5, 6] });
  }
}
// Sunshield seen from slightly above: open 0..1 (width), spread 0..1 (layers separating), layers count shown.
function sunshield(x, y, o = {}) {
  const open = o.open ?? 1, spread = o.spread ?? 1, wx = lerp(70, o.w ?? 420, easeInOut(open)), hy = lerp(40, o.h ?? 110, easeInOut(open));
  const n = 5;
  for (let i = n - 1; i >= 0; i--) {
    const dy = i * lerp(4, o.gapY ?? 26, spread);
    const pts = [[x - wx, y + dy], [x - wx * 0.42, y - hy + dy], [x + wx * 0.42, y - hy + dy], [x + wx, y + dy], [x + wx * 0.42, y + hy * 0.75 + dy], [x - wx * 0.42, y + hy * 0.75 + dy]];
    shape(pts, i === 0 ? C.shield : C.shieldD, { dark: i === 0 ? C.shieldD : '#7a5aa8', light: i === 0 ? C.shieldL : null, w: 5, seed: 200 + i * 9, amp: 1.4, sd: [0, 14] });
  }
  return { wx, hy };
}
// The whole observatory: folded (deploy 0) to deployed (1). o.sh shield 0..1, o.tower 0..1, o.wl/o.wr wings.
function jwst(x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const sh = o.sh ?? 1, tower = o.tower ?? 1;
  // solar panel + bus under the shield
  shape([[-30, 70], [30, 70], [30, 150], [-30, 150]], C.backD, { w: 5, seed: 301 });
  const pk = o.panel ?? 1;
  shape([[-30, 120], [-30 - 230 * pk, 150], [-30 - 230 * pk, 200], [-30, 170]], C.panel, { dark: C.panelD, w: 5, seed: 302, sd: [0, 10] });
  for (let i = 1; i < 4; i++) stroke([[-30 - 57 * i * pk, 120 + 7.5 * i], [-30 - 57 * i * pk, 170 + 7.5 * i]], { w: 3, seed: 303 + i, color: '#1d2f5c' });
  sunshield(0, 50, { open: sh, spread: o.spread ?? sh, w: 400, h: 110, gapY: 20 });
  // tower lifts the mirror off the shield
  const ty = lerp(-40, -150, easeInOut(tower));
  shape([[-18, 40], [18, 40], [14, ty + 40], [-14, ty + 40]], C.backD, { w: 5, seed: 310 });
  mirror(0, ty - 120, { R: 34, wl: o.wl ?? 1, wr: o.wr ?? 1, struts: o.struts ?? 1, shine: o.shine, frost: o.frost, goldK: 1 });
  ctx.restore();
}

// ---------- story clock: everything is a function of the word times ----------
let K = null;
function keys() {
  return {
    unfoldW: at('hook', 'unfold'), jam: at('hook', 'jam'), dead: at('hook', 'dead'),
    mirror: L('mirror').start, six: at('mirror', 'six'), too: at('mirror', 'too'),
    fold: L('fold').start, cut: at('fold', 'cut'), n18: at('fold', '18'), gold: at('fold', 'gold'), foldBack: at('fold', 'fold'), table: at('fold', 'table'),
    shield: L('shield').start, sunshield: at('shield', 'sunshield'), five: at('shield', 'five'), tennis: at('shield', 'tennis'), shieldEnd: L('shield').end,
    launch: L('launch').start, went: at('launch', 'went'), xmas: at('launch', 'christmas'),
    sep: L('unfold').start + 0.35, two: at('unfold', 'two'), n344: at('unfold', '344'), fail: at('unfold', 'fail'), nobody: at('unfold', 'nobody'), unfoldEnd: L('unfold').end,
    temp: L('temp').start, opened: at('temp', 'opened'), hot: at('temp', '110'), cold: at('temp', '230'), tempEnd: L('temp').end,
    lock: L('lock').start, jan: at('lock', 'january'), locked: at('lock', 'locked'),
    end: L('end').start, worked: at('end', 'worked'),
  };
}

// rocket altitude (world px above the pad)
function rocketAlt(t) {
  const ign = K.went + 0.25;
  if (t < ign) return 0;
  const d = Math.min(t, K.sep) - ign;
  let a = 500 * d * d;
  if (t > K.sep) { const v = 1000 * (K.sep - ign), e = t - K.sep; a += v * e * 0.9 - 160 * e * e; } // spent stage falls behind
  return a;
}
// telescope position: rides in the fairing, then coasts on and slows down when it arrives
function telPos(t) {
  const ign = K.went + 0.25;
  if (t < K.sep) return [TEL0[0], TEL0[1] - rocketAlt(t)];
  const a0 = rocketAlt(K.sep), v = 1000 * (K.sep - ign), e = t - K.sep, e7 = K.temp - K.sep;
  const d = e < e7 ? v * e : v * e7 + v * (1 - Math.exp(-(e - e7) * 1.6)) / 1.6;
  return [TEL0[0] + 140 * Math.min(e, e7 + 1), TEL0[1] - a0 - d];
}
// deployment state of the telescope
function telState(t) {
  const p = (a, b) => easeInOut(seg(t, a, b));
  const S = K.sep;
  let wl = 0;
  if (t < K.jam + 0.4) wl = 0.18 * easeInOut(seg(t, K.unfoldW, K.jam)); // it tries... (the "what if")
  else if (t < K.mirror) wl = 0.18 * (1 - seg(t, K.jam + 0.4, K.mirror));
  return {
    panel: lerp(0.15, 1, p(S + 0.6, S + 1.5)),
    tower: p(S + 1.6, S + 2.6),
    sh: lerp(p(S + 2.4, S + 3.4) * 0.3, 1, p(K.opened - 0.1, K.opened + 1.2)),
    spread: p(K.opened + 0.3, K.opened + 1.6),
    struts: p(K.hot, K.hot + 1.0),
    wl: Math.max(wl, p(K.cold + 0.5, K.cold + 1.3)),
    wr: p(K.locked - 0.9, K.locked + 0.05),
    frost: seg(t, K.cold, K.cold + 0.6) * (1 - seg(t, K.cold + 1.0, K.cold + 1.8)),
    shine: t > K.worked - 0.3 ? seg(t, K.worked - 0.3, K.worked + 1.2) : null,
  };
}
const mirrorWorld = (t) => { const [x, y] = telPos(t), st = telState(t); return [x, y + (lerp(-40, -150, easeInOut(st.tower)) - 120) * TS]; };

// ---------- camera: keyframes evaluated at the current time (so a key can follow a moving thing) ----------
function camKeys() {
  const tel = (dy = 0, dx = 0) => (t) => { const [x, y] = telPos(t); return [x + dx, y + dy]; };
  const mir = (t) => mirrorWorld(t);
  const rocketTop = (t) => [0, -470 - rocketAlt(t)];
  // fit Earth's top (screen y≈1500) and the telescope (screen y≈600) in one frame
  const fitZ = (t) => 900 / Math.max(1, -telPos(t)[1]);
  const between = (t) => { const [x, y] = telPos(t); return [x * 0.5, y * 0.5 - 150 / fitZ(t)]; };
  return [
    [0, mir, 7.2],
    [K.mirror - 0.2, mir, 6.6],
    [K.mirror + 0.6, (t) => { const [x, y] = mir(t); return [x, y + 10]; }, 4.6],
    [K.foldBack, (t) => { const [x, y] = mir(t); return [x, y + 10]; }, 4.8],
    [K.shield + 0.2, (t) => { const [x, y] = mir(t); return [x, y + 10]; }, 5.2],
    [K.sunshield + 0.4, [150, -470], 2.3],
    [K.shieldEnd + 0.2, [130, -470], 2.4],
    [K.went, [0, -330], 1.2],
    [K.went + 1.2, rocketTop, 0.9],
    [K.sep, tel(0), 0.55],
    [K.sep + 1.2, tel(-30), 3.0],
    [K.nobody - 0.2, tel(-30), 3.2],
    [K.nobody + 0.9, between, fitZ],
    [K.unfoldEnd + 0.1, between, fitZ],
    [K.temp + 0.9, tel(-20), 3.3],
    [K.cold + 1.2, tel(-30), 3.5],
    [K.lock + 0.3, mir, 7.5],
    [K.locked + 0.5, (t) => { const [x, y] = mir(t); return [x + 6, y]; }, 8.2],
    [K.end + 0.2, tel(-10), 2.8],
    [K.worked + 1.6, tel(20), 2.2],
  ];
}

// ---------- world pieces ----------
function drawSun() {
  const g = ctx.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.8, SUN.x, SUN.y, SUN.r * 7);
  g.addColorStop(0, 'rgba(255,220,120,0.9)'); g.addColorStop(0.3, 'rgba(255,170,90,0.35)'); g.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, SUN.r * 7, 0, Math.PI * 2); ctx.fill();
  shape(circ(SUN.x, SUN.y, SUN.r, 64), C.yellow, { dark: C.orange, w: 6, seed: 2100, sd: [0, -SUN.r * 0.12] });
}
function drawEarth() {
  const { x, y, r } = EARTH;
  // atmosphere: dusk colours near the ground fading into space (hides the stars low down)
  const g = ctx.createRadialGradient(x, y, r, x, y, r + 3200);
  g.addColorStop(0, '#ffc27a'); g.addColorStop(0.08, '#f39272'); g.addColorStop(0.22, '#b0619a'); g.addColorStop(0.45, '#5b3f93');
  g.addColorStop(0.75, 'rgba(40,36,110,0.55)'); g.addColorStop(1, 'rgba(30,30,100,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r + 3200, 0, Math.PI * 2); ctx.fill();
  const { sc, f } = lineK();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#2f6fc0'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#22549a'; ctx.beginPath(); ctx.arc(x + r * 0.08, y + r * 0.1, r, 0, Math.PI * 2); ctx.rect(x - 2 * r, y - 2 * r, 4 * r, 4 * r); ctx.fill('evenodd');
  // continents; the pad sits on the sandy one at the top
  const land = [[-0.75, 0.25, 1300, 700, '#6cc069'], [0.7, 0.35, 1500, 900, '#6cc069'], [0.1, 0.55, 1100, 800, '#6cc069'], [-0.3, -0.62, 900, 450, '#6cc069']];
  land.forEach(([dx, dy, rx, ry, c], i) => shape(ell(x + dx * r, y + dy * r, rx, ry, 40), c, { dark: '#4b9a4c', w: 5, seed: 2200 + i * 7, amp: 2.5, sd: [0, 60] }));
  shape(ell(x, y - r + 60, 1700, 380, 60), C.sand, { dark: C.sandD, w: 5, seed: 2230, amp: 2, sd: [0, -30] });
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.lineWidth = 6 * f / sc; ctx.strokeStyle = OL; ctx.stroke();
  // mesas and the launch tower around the pad
  shape([[-900, 8], [-700, -90], [-470, -100], [-330, 8]], '#8c5b8a', { dark: '#6d4570', w: 5, seed: 2240 });
  shape([[420, 8], [560, -70], [800, -80], [980, 8]], '#8c5b8a', { dark: '#6d4570', w: 5, seed: 2241 });
  shape([[-118, 2], [-92, 2], [-92, -680], [-118, -680]], '#9a3b3b', { dark: '#6e2626', w: 5, seed: 2242, sd: [8, 0] });
  for (let i = 0; i < 9; i++) stroke([[-118, -20 - i * 74], [-92, -60 - i * 74]], { w: 3.5, seed: 2243 + i });
}
// Ariane 5. o.fair 0..1 = fairing halves thrown off; o.window draws the dark cut-away the telescope sits in.
function rocket(x, y, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(RS, RS);
  if (o.flame > 0.05) {
    const f = o.flame, fl = 1 + 0.15 * Math.sin(T * 50) + 0.1 * Math.sin(T * 31);
    const g = ctx.createRadialGradient(0, 40, 10, 0, 40, Math.max(40, 360 * f));
    g.addColorStop(0, 'rgba(255,230,140,0.9)'); g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g; ctx.fillRect(-400, -200, 800, 800);
    for (const bx of o.core ? [0] : [-88, 0, 88]) {
      const len = (bx ? 300 : 220) * f * fl;
      shape([[bx - 26, 0], [bx + 26, 0], [bx + 8, len * 0.7], [bx, len], [bx - 8, len * 0.7]], C.orange, { dark: '#e8572a', light: C.yellow, w: 5, seed: 600 + bx, amp: 3, sd: [10, 0] });
    }
  }
  if (!o.core) for (const sx of [-1, 1]) {
    const bx = sx * 88;
    shape([[bx - 32, 0], [bx + 32, 0], [bx + 32, -560], [bx, -640], [bx - 32, -560]], C.white, { dark: '#cfc9dc', w: 6, seed: 610 + sx, sd: [16 * sx, 0] });
    stroke([[bx - 32, -90], [bx + 32, -90]], { w: 4, seed: 612 + sx });
  }
  shape([[-58, 0], [58, 0], [58, -760], [-58, -760]], '#f3efe6', { dark: '#d4cdbd', w: 6, seed: 620, sd: [18, 0] });
  stroke([[-58, -380], [58, -380]], { w: 4, seed: 621 });
  const fair = o.fair ?? 0;
  if (fair < 1 && o.window) shape([[-46, -780], [46, -780], [46, -1010], [24, -1080], [-24, -1080], [-46, -1010]], '#2a2440', { w: 4, seed: 631, alpha: 1 - fair });
  ctx.restore();
}
function fairingHalves(x, y, fair, hat) {
  ctx.save(); ctx.translate(x, y); ctx.scale(RS, RS);
  const halves = [
    [[0, -760], [-66, -760], [-66, -1010], [-40, -1110], [0, -1150]],
    [[0, -760], [66, -760], [66, -1010], [40, -1110], [0, -1150]],
  ];
  const win = [[-46, -780], [46, -780], [46, -1010], [24, -1080], [-24, -1080], [-46, -1010]];
  halves.forEach((h, i) => {
    const s = i ? 1 : -1, e = fair;
    ctx.save(); ctx.translate(s * e * 420, -950 + e * 260); ctx.rotate(s * e * 1.6); ctx.translate(0, 950);
    // the half with a hole cut in it while the telescope is inside (drawn as an even-odd window)
    const p = boil(densify(h), 640 + i, 1.4 * lineK().f / lineK().sc);
    const hw = win.map(([a, b]) => [i ? Math.max(a, 0) : Math.min(a, 0), b]);
    ctx.beginPath(); trace(p); if (e < 0.02) { ctx.moveTo(hw[0][0], hw[0][1]); hw.forEach(([a, b]) => ctx.lineTo(a, b)); ctx.closePath(); }
    ctx.fillStyle = C.white; ctx.fill('evenodd');
    const { sc, f } = lineK(); ctx.lineWidth = 6 * f / sc; ctx.strokeStyle = OL; ctx.lineJoin = 'round';
    trace(p); ctx.stroke();
    if (e < 0.02) { trace(hw); ctx.lineWidth = 5 * f / sc; ctx.stroke(); }
    if (i === 0 && hat > 0) { // Christmas hat rides on the left half's nose
      ctx.save(); ctx.translate(0, -1130); ctx.scale(hat, hat); ctx.rotate(-0.15);
      shape([[-58, 10], [58, 10], [20, -120], [-30, -150]], C.red, { dark: C.redD, w: 5, seed: 650, sd: [10, 0] });
      shape(circ(-36, -150, 20), C.white, { w: 5, seed: 651 });
      shape(rrect(-70, -4, 140, 34, 16), C.white, { dark: '#ddd', w: 5, seed: 652, sd: [0, 6] });
      ctx.restore();
    }
    ctx.restore();
  });
  ctx.restore();
}
function smoke(t) {
  const k = seg(t, K.went + 0.2, K.went + 2.5);
  if (k <= 0) return;
  for (let i = 0; i < 11; i++) {
    const s = i % 2 ? 1 : -1, d = (40 + 420 * k * (0.4 + hash2(i, 9) * 0.8)) * s, r = 40 + 150 * k * (0.5 + hash2(i, 10));
    shape(circ(d, -r * 0.6, r, 22), '#efe9f5', { dark: '#c6bfd6', w: 5, seed: 2300 + i * 3, amp: 2.5, sd: [0, 18], alpha: clamp(k * 4) });
  }
}

// ---------- screen-space overlays (labels anchored to world points) ----------
function labelAt(str, wx, wy, dx, dy, k, opt) { const [x, y] = toScreen(wx, wy); label(str, x + dx, y + dy, k, opt); }
function thermo(x, y, k, temp, hot) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  shape(rrect(-26, -190, 52, 220, 26), C.white, { w: 6, seed: 700 + hot });
  const lvl = hot ? 0.9 : 0.08;
  shape(rrect(-12, 10 - 190 * lvl, 24, 190 * lvl + 10, 12), hot ? C.red : C.blue, { w: 0, seed: 702 + hot });
  shape(circ(0, 40, 44), hot ? C.red : C.blue, { dark: hot ? C.redD : C.blueD, w: 6, seed: 704 + hot, sd: [10, 10] });
  ctx.restore();
  label(temp, x, y + 130, k, { size: 54, fill: hot ? C.red : C.blue, color: C.white });
}
function shuttle(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape([[0, -90], [30, -40], [30, 60], [70, 90], [-70, 90], [-30, 60], [-30, -40]], C.white, { dark: '#cfc9dc', w: 6, seed: 960, sd: [10, 0] });
  shape(circ(0, -30, 12), C.blue, { w: 4, seed: 961 });
  ctx.restore();
}
function steps(t) {
  if (t < K.n344) return 0;
  if (t < K.temp) return Math.floor(lerp(0, 180, easeOut(seg(t, K.n344, K.unfoldEnd))));
  if (t < K.lock) return Math.floor(lerp(180, 330, seg(t, K.temp, K.tempEnd)));
  if (t < K.locked) return Math.floor(lerp(330, 343, seg(t, K.lock, K.locked)));
  return 344;
}

// ---------- the film ----------
function drawWorld(t) { // camera space
  const st = telState(t), [tx, ty] = telPos(t);
  drawSun(); drawEarth();
  // rocket + smoke stay where they belong in the world
  ctx.save(); smoke(t); ctx.restore();
  const alt = rocketAlt(t), fair = easeOut(seg(t, K.sep, K.sep + 1.6)), flame = t > K.went + 0.15 ? seg(t, K.went + 0.15, K.went + 0.45) * (t > K.sep + 0.8 ? 1 - seg(t, K.sep + 0.8, K.sep + 1.2) : 1) : 0;
  const rx = t > K.sep ? -60 * (t - K.sep) ** 2 : 0;
  rocket(rx, -alt, { window: true, fair, flame });
  // the telescope is drawn inside the fairing window (clipped) until the fairing opens
  const inside = fair < 0.02;
  ctx.save();
  if (inside) { ctx.beginPath(); trace([[-46, -780], [46, -780], [46, -1010], [24, -1080], [-24, -1080], [-46, -1010]].map(([a, b]) => [rx + a * RS, -alt + b * RS])); ctx.clip(); }
  jwst(tx, ty, TS, st);
  ctx.restore();
  fairingHalves(rx, -alt, fair, pop(t, K.xmas - 0.1));
  ghosts(t);
}
// "Ghost" versions at full size, next to the real rocket, that fold into it
function ghosts(t) {
  const [mx, my] = mirrorWorld(t);
  // full mirror, too wide for the fairing, then cut, made gold and folded back into the real folded mirror
  if (t > K.mirror && t < K.shield + 0.4) {
    const grow = easeOut(seg(t, K.mirror, K.mirror + 0.5)), fade = 1 - seg(t, K.table, K.shield + 0.4);
    const gap = 0.16 * easeOut(seg(t, K.cut, K.cut + 0.4)) * (1 - easeInOut(seg(t, K.foldBack, K.foldBack + 0.9)));
    const wing = 1 - easeInOut(seg(t, K.foldBack, K.foldBack + 0.9));
    const goldK = t < K.cut ? 1 : seg(t, K.n18 - 0.1, K.gold + 0.3);
    mirror(mx, my, { R: 34 * TS * lerp(0.4, 1, grow), gap, struts: 0, goldK, wl: wing, wr: wing, alpha: 0.9 * fade,
      tint: t > K.too && t < K.foldBack + 0.6 ? { x0: -FAIR_X, x1: FAIR_X, a: 0.5 + 0.2 * Math.sin(t * 18) } : null });
    const ak = easeOut(seg(t, K.six - 0.1, K.six + 0.5)) * (1 - seg(t, K.cut - 0.2, K.cut));
    if (ak > 0) { const y = my + 34 * TS * 2.9, hw = 4 * 34 * TS * ak; stroke([[mx - hw, y], [mx + hw, y]], { w: 6, color: '#fff', seed: 991 }); }
  }
  // sunshield slides out of the fairing at full size, shows its layers, lays over a tennis court, folds back in
  if (t > K.sunshield - 0.2 && t < K.launch + 0.7) {
    const out = easeInOut(seg(t, K.sunshield - 0.2, K.sunshield + 0.6)), back = easeInOut(seg(t, K.shieldEnd + 0.15, K.launch + 0.6));
    const k = out * (1 - back);
    const cx = lerp(0, 180, k), cy = -470 + 40 * k;
    const ck = seg(t, K.tennis - 0.2, K.tennis + 0.4) * (1 - back);
    sunshield(cx, cy, { open: k, spread: easeInOut(seg(t, K.five, K.five + 0.8)) * (1 - back), w: 128, h: 46, gapY: 9 });
    if (ck > 0) {
      ctx.save(); ctx.translate(cx, cy + 4); ctx.scale(1, 0.4);
      shape(rrect(-143, -66, 286, 132, 3), '#4f9c55', { dark: '#3d7f44', w: 5, seed: 1100, sd: [0, 10], alpha: ck * 0.75 });
      stroke(rrect(-130, -55, 260, 110, 1), { w: 4, color: '#fff', close: true, seed: 1101, k: ck });
      stroke([[-130, 0], [130, 0]], { w: 4, color: '#fff', seed: 1102, k: ck });
      stroke([[0, -66], [0, 66]], { w: 7, color: '#fff', seed: 1103, k: ck });
      ctx.restore();
    }
  }
}
function overlays(t) { // screen space
  const [mx, my] = mirrorWorld(t), [tx, ty] = telPos(t);
  // hook: it tries, it jams
  if (t > K.jam && t < K.mirror + 0.2) {
    const p = pop(t, K.jam) * (1 - seg(t, K.mirror - 0.1, K.mirror + 0.2));
    const [x, y] = toScreen(mx + 30, my - 20);
    shape([[0, -70], [62, 40], [-62, 40]].map(([a, b]) => [x + 60 + a * p, y + b * p]), C.yellow, { w: 6, seed: 980 });
    text('!', x + 60, y + 18, 80 * p, { font: 'Label' });
    label('1 JAM', x + 60, y + 120, pop(t, K.jam + 0.1) * (1 - seg(t, K.mirror - 0.1, K.mirror + 0.2)), { fill: C.red, color: C.white, size: 50, rot: 0.05 });
  }
  label('GAME OVER', 540, 1330, pop(t, K.dead) * (1 - seg(t, K.mirror - 0.1, K.mirror + 0.2)), { size: 64, rot: -0.04 });
  // mirror vs rocket
  const out = 1 - seg(t, K.cut - 0.2, K.cut);
  labelAt('6.5 m', mx, my + 34 * TS * 2.9, 0, 70, pop(t, K.six + 0.2) * out, { size: 60 });
  labelAt('ROCKET: 5.4 m', FAIR_X, -560, 170, -40, pop(t, K.too + 0.25) * (1 - seg(t, K.foldBack, K.foldBack + 0.3)), { size: 48, fill: C.red, color: C.white });
  labelAt('18 SEGMENTS', mx, my + 34 * TS * 2.9, 0, 70, pop(t, K.n18) * (1 - seg(t, K.shield - 0.2, K.shield + 0.1)), { size: 54 });
  // drop-leaf table, folding along with the wings
  const tk = pop(t, K.table - 0.35) * (1 - seg(t, K.shield, K.shield + 0.3));
  if (tk > 0) {
    ctx.save(); ctx.translate(840, 1280); ctx.scale(tk * 1.2, tk * 1.2);
    const lf = easeInOut(seg(t, K.table - 0.2, K.table + 0.5)) * 1.35;
    shape(rrect(-80, -14, 160, 26, 6), C.sand, { dark: C.sandD, w: 5, seed: 1010, sd: [0, 8] });
    for (const s of [-1, 1]) shape([[s * 80, -14], [s * 80 + s * Math.cos(lf) * 90, -14 + Math.sin(lf) * 90], [s * 80 + s * Math.cos(lf) * 90, -14 + Math.sin(lf) * 90 + 24], [s * 80, 12]], C.sand, { dark: C.sandD, w: 5, seed: 1011 + s, sd: [0, 6] });
    for (const s of [-1, 1]) shape(rrect(s * 55 - 9, 12, 18, 110, 5), C.sandD, { w: 5, seed: 1013 + s });
    ctx.restore();
  }
  // sunshield
  const sOut = 1 - seg(t, K.shieldEnd + 0.1, K.shieldEnd + 0.35);
  labelAt('5 LAYERS', 180, -470, 0, -260, pop(t, K.five + 0.1) * sOut, { size: 54 });
  labelAt('≈ TENNIS COURT', 180, -470, 0, 250, pop(t, K.tennis + 0.1) * sOut, { size: 50, fill: C.green, color: C.white });
  // launch
  label('DEC 25, 2021', 800, 1180, pop(t, K.xmas + 0.2) * (1 - seg(t, K.sep, K.sep + 0.3)), { size: 58, fill: C.red, color: C.white, rot: -0.04 });
  // unfolding
  label('2 WEEKS', 250, 560, pop(t, K.two) * (1 - seg(t, K.nobody - 0.2, K.nobody)), { size: 54, rot: -0.06 });
  if (t > K.n344 && t < K.end + 0.1) label(`STEPS: ${steps(t)} / 344`, 560, 1350, pop(t, K.n344) * (1 - seg(t, K.end - 0.1, K.end + 0.1)), { size: 54, fill: t > K.fail && t < K.fail + 0.5 ? C.yellow : C.white });
  // nobody can come: a dashed line from Earth to the telescope, a crew ship with a red cross
  const nk = seg(t, K.nobody + 0.3, K.nobody + 0.9) * (1 - seg(t, K.unfoldEnd, K.unfoldEnd + 0.3));
  if (nk > 0) {
    const [ex, ey] = toScreen(0, 0), [sx, sy] = toScreen(tx, ty);
    ctx.save(); ctx.globalAlpha = nk;
    ctx.setLineDash([22, 18]); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ex, ey - 40); ctx.lineTo(sx, sy + 40); ctx.stroke(); ctx.setLineDash([]);
    const mxs = lerp(ex, sx, 0.45), mys = lerp(ey, sy, 0.45);
    shape(circ(mxs, mys, 95), 'rgba(255,255,255,0.92)', { w: 6, seed: 1400 });
    shuttle(mxs, mys, 0.7);
    const xk = seg(t, K.nobody + 0.8, K.nobody + 1.3);
    if (xk > 0) redX(mxs, mys, 60, xk, 1401);
    ctx.restore();
    label('NO REPAIRS', mxs, mys + 140, pop(t, K.nobody + 1.0) * nk, { size: 46, fill: C.red, color: C.white });
    label('1.5 MILLION km', lerp(ex, sx, 0.75) + 220, lerp(ey, sy, 0.75), pop(t, K.nobody + 0.6) * nk, { size: 42 });
  }
  // when the camera is far out, the telescope is a glinting gold star so the eye can find it
  const far = clamp((0.6 - CAM.z) / 0.4);
  if (far > 0) {
    const [gx, gy] = toScreen(tx, ty), r = 30 * far * (1 + 0.15 * Math.sin(T * 8));
    shape(starPts(gx, gy, r, 0.35), C.gold, { light: C.goldL, w: 4, seed: 1450, amp: 0.6 });
  }
  // temperatures: sunlight (Sun and Earth are both below the shield) warms the underside
  const sunK = seg(t, K.opened, K.opened + 1) * (1 - seg(t, K.lock, K.lock + 0.6));
  if (sunK > 0) {
    const g = ctx.createLinearGradient(0, 1100, 0, H);
    g.addColorStop(0, 'rgba(255,170,80,0)'); g.addColorStop(1, `rgba(255,190,90,${0.75 * sunK})`);
    ctx.fillStyle = g; ctx.fillRect(0, 1100, W, H - 1100);
  }
  const tOut = 1 - seg(t, K.lock - 0.2, K.lock + 0.2);
  thermo(930, 1230, pop(t, K.hot - 0.1) * tOut, '110 °C', 1);
  thermo(910, 640, pop(t, K.cold - 0.1) * tOut, '−230 °C', 0);
  // the last wing
  const [wx, wy] = toScreen(mx + 34 * TS * 3, my);
  burst(wx, wy, seg(t, K.locked, K.locked + 0.6), 170, C.yellow, 1500);
  label('CLICK!', wx - 40, wy - 230, pop(t, K.locked + 0.02) * (1 - seg(t, K.end, K.end + 0.3)), { size: 66, rot: 0.08 });
  label('JAN 8, 2022', 540, 520, pop(t, K.jan + 0.1) * (1 - seg(t, K.end - 0.1, K.end + 0.2)), { size: 56 });
  // the end
  const ck = pop(t, K.worked - 0.05, 0.45);
  if (ck > 0) {
    ctx.save(); ctx.translate(560, 1340); ctx.scale(ck, ck);
    shape(rrect(-250, -70, 500, 140, 70), C.green, { dark: C.greenD, w: 6, seed: 1600, sd: [0, 14] });
    stroke([[-190, 0], [-160, 34], [-110, -30]], { w: 14, color: '#fff', seed: 1601 });
    text('344 / 344', 50, 4, 74, { font: 'Label', color: '#fff' });
    ctx.restore();
  }
  const mood = t > K.worked ? 'happy' : t > K.locked ? 'happy' : t > K.lock ? 'worried' : t > K.cold ? 'shiver' : t > K.hot ? 'hot' : t > K.nobody ? 'no' : t > K.fail ? 'worried' : t > K.went ? 'happy' : t > K.too && t < K.cut ? 'no' : t > K.dead && t < K.mirror ? 'shock' : t > K.jam && t < K.mirror ? 'worried' : 'ok';
  mascot(MX, MY, pop(t, 0.2), mood);
}

startFilm(() => {
  K = keys();
  return {
    camKeys: camKeys(),
    sky: () => { vgrad([[0, '#0d1032'], [0.6, '#1c2260'], [1, '#262665']]); starfield(); },
    world: drawWorld,
    overlay: overlays,
    shakes: [[K.locked, 12], [K.went + 0.3, 10], [K.jam, 8], [K.sep, 6]],
  };
});
