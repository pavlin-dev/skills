// Deterministic recorder for a three.js web scene with a scripted camera.
// Needs: npm i puppeteer-core, and a Chromium/Chrome binary.
// usage: node rec3d.mjs <config.json>
// config: { url, out, w?, h?, chrome?, threeModule?, buildFn?, shots: [{name, frames, keys:[{pos, look, fov, roll?}, ...], ease?, build?}] }
//   url          page with the scene (it must use ES-module three.js)
//   threeModule  URL path of the page's three.js module; if omitted, the first loaded script whose name contains "three" is used
//   css          extra CSS injected to hide UI over the canvas (default hides all buttons)
//   chrome       browser binary; else $CHROME_PATH, else common install locations
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
if (!process.argv[2]) { console.error('usage: node rec3d.mjs <config.json>'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!cfg.url || !cfg.out || !cfg.shots) { console.error('config needs url, out and shots'); process.exit(1); }
const W = cfg.w || 1080, H = cfg.h || 1920;
const chrome = cfg.chrome || process.env.CHROME_PATH || [
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));
if (!chrome) { console.error('no Chromium found: set "chrome" in the config or $CHROME_PATH'); process.exit(1); }
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rec3d-'));
const b = await puppeteer.launch({executablePath: chrome, headless: true, userDataDir, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'], defaultViewport: {width: W, height: H}});
const p = (await b.pages())[0];
await p.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
await p.evaluateOnNewDocument((threeModule) => {
  let vt = 0;
  performance.now = () => vt;
  Date.now = (() => { const base = Date.now(); return () => base + vt; })();
  const raf = window.requestAnimationFrame.bind(window);
  let queue = [];
  window.__manual = false;
  window.requestAnimationFrame = (cb) => { if (window.__manual) { queue.push(cb); return 1; } return raf(() => cb(vt)); };
  window.__advance = (ms) => { vt += ms; };
  window.__step = (ms, q) => { vt += ms; const qq = queue; queue = []; qq.forEach((cb) => cb(vt)); const c = document.querySelector('canvas'); return c.toDataURL('image/jpeg', q); };
  const iv = setInterval(async () => {
    if (window.__hooked) return;
    try {
      const mod = threeModule || performance.getEntriesByType('resource').map((e) => e.name).find((n) => /three[^/]*\.m?js(\?|$)/.test(n));
      if (!mod) return;
      const T = await import(mod);
      T.Scene.prototype.onBeforeRender = function (renderer, scene, camera) {
        window.__scene = scene; window.__cam = camera; window.__T = T;
        const s = window.__shot;
        if (s) {
          camera.position.set(...s.pos);
          camera.up.set(0, 1, 0);
          camera.lookAt(new T.Vector3(...s.look));
          if (s.roll) camera.rotateZ(s.roll);
          camera.fov = s.fov; camera.aspect = window.innerWidth / window.innerHeight; camera.near = 0.05; camera.far = 600;
          camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
        }
        if (window.__build) window.__build(scene, s ? s.build : 1);
      };
      window.__hooked = true; clearInterval(iv);
    } catch (e) {}
  }, 5);
}, cfg.threeModule || null);
await p.goto(cfg.url, {waitUntil: 'networkidle2', timeout: 90000});
await p.addStyleTag({content: cfg.css ?? 'button{display:none!important}'}); // hide page UI over the canvas
await new Promise(r => setTimeout(r, 6000));
if (!(await p.evaluate(() => window.__hooked))) { console.error('could not hook three.js: set "threeModule" in the config'); await b.close(); process.exit(1); }
if (cfg.buildFn) console.log("buildables", await p.evaluate(`(${cfg.buildFn})()`));
await p.evaluate(() => { window.__manual = true; });
await new Promise(r => setTimeout(r, 500));
const grab = async (s) => {
  const url = await p.evaluate((s) => { window.__shot = s; return window.__step(1000 / 30, 0.93); }, s);
  return Buffer.from(url.split(',')[1], 'base64');
};
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ease = (t, e) => e === 'lin' ? t : e === 'out' ? 1 - (1 - t) ** 3 : e === 'in' ? t ** 3 : t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
for (const shot of cfg.shots) {
  const dir = `${cfg.out}/${shot.name}`; fs.mkdirSync(dir, {recursive: true});
  const n = shot.frames || 1;
  if (fs.readdirSync(dir).length >= n) { console.log('skip', shot.name); continue; }
  for (let w = 0; w < 2; w++) await grab({pos: shot.keys[0].pos, look: shot.keys[0].look, fov: shot.keys[0].fov, roll: 0, build: shot.build ? shot.build[0] : 1});
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : ease(i / (n - 1), shot.ease || 'inout');
    const k = shot.keys; // [from, to]
    const s = {pos: lerp(k[0].pos, k[1].pos, t), look: lerp(k[0].look, k[1].look, t), fov: k[0].fov + ((k[1].fov ?? k[0].fov) - k[0].fov) * t, roll: (k[0].roll || 0) + ((k[1].roll || 0) - (k[0].roll || 0)) * t, build: shot.build ? shot.build[0] + (shot.build[1] - shot.build[0]) * (i / Math.max(1, n - 1)) : 1};
    const buf = await grab(s);
    fs.writeFileSync(`${dir}/${String(i + 1).padStart(4, '0')}.jpg`, buf);
  }
  console.log('shot', shot.name, n, new Date().toTimeString().slice(0, 8));
}
await b.close();
fs.rmSync(userDataDir, {recursive: true, force: true});
