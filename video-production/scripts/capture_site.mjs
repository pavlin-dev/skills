// Capture clean vertical screenshots of a real website flow (upload → settings → progress → result).
// usage: node capture_site.mjs config.json
// ESM ignores NODE_PATH: copy this file into <project>/tools/ and `ln -s /workspace/turbl-reel-v2/tools/node_modules <project>/tools/node_modules` (has puppeteer-core).
// config: {url, out, w=720, h=1280, dpr=2.25, fonts=true, steps:[...]}
// steps:  {shot:"name"} | {upload:"/path/file", selector?:"input[type=file]"} | {click:"^Render Free"} (regex on button/link text)
//         {waitText:"video is ready", timeout?} | {scroll:y} | {sleep:ms} | {rect:"name", selector:"video", text?:"regex"}
//         {burst:"r", untilText:"video is ready", every:150, max:120000}  → r_000.png… + progress values in rects.json
//         {eval:"js expression"}
// Writes <out>/<name>.png at w*dpr × h*dpr (default 1620×2880 = 1.5× zoom headroom on 1080×1920) and <out>/rects.json (CSS px).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const {url, out, w = 720, h = 1280, dpr = 2.25, fonts = true} = cfg;
fs.mkdirSync(out, {recursive: true});
const F = '/workspace/persistent/turbl-padel-20s/public/';
const d = (f) => 'data:font/ttf;base64,' + fs.readFileSync(F + f).toString('base64');
// Headless Linux renders system-ui as DejaVu. Swap in Geist so the UI looks like it does on a Mac.
const css = `@font-face{font-family:G;src:url(${d('Geist-Regular.ttf')});font-weight:400}
@font-face{font-family:G;src:url(${d('Geist-SemiBold.ttf')});font-weight:500 600}
@font-face{font-family:G;src:url(${d('Geist-ExtraBold.ttf')});font-weight:700 900}
@font-face{font-family:GM;src:url(${d('GeistMono-Regular.ttf')});font-weight:400}
@font-face{font-family:GM;src:url(${d('GeistMono-SemiBold.ttf')});font-weight:500 900}
:root{--sans:G,sans-serif!important;--serif:G,sans-serif!important;--mono:GM,monospace!important;--font-geist-sans:G!important}
html,body{font-family:G,sans-serif}code,kbd,pre,.mono{font-family:GM,monospace}::-webkit-scrollbar{display:none}`;
const b = await puppeteer.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'], defaultViewport: {width: w, height: h, deviceScaleFactor: dpr}});
const p = (await b.pages())[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const addFonts = async () => { if (fonts) { await p.addStyleTag({content: css}); await sleep(800); } };
p.on('framenavigated', (f) => { if (f === p.mainFrame()) addFonts().catch(() => {}); });
await p.goto(url, {waitUntil: 'networkidle2', timeout: 90000});
await addFonts();
const R = fs.existsSync(`${out}/rects.json`) ? JSON.parse(fs.readFileSync(`${out}/rects.json`, 'utf8')) : {};
for (const s of cfg.steps) {
  if (s.shot) await p.screenshot({path: `${out}/${s.shot}.png`});
  else if (s.upload) { const inp = await p.$(s.selector || 'input[type=file]'); await inp.uploadFile(s.upload); }
  else if (s.click) console.log('click', await p.evaluate((re) => { const e = [...document.querySelectorAll('button,a,label,summary,[role=button]')].find((e) => new RegExp(re, 'i').test(e.innerText.trim())); if (e) { e.click(); return e.innerText; } return null; }, s.click));
  else if (s.waitText) await p.waitForFunction((t) => new RegExp(t, 'i').test(document.body.innerText), {timeout: s.timeout || 120000}, s.waitText);
  else if (s.scroll !== undefined) { await p.evaluate((y) => window.scrollTo(0, y), s.scroll); await sleep(500); }
  else if (s.sleep) await sleep(s.sleep);
  else if (s.eval) console.log(await p.evaluate(s.eval));
  else if (s.rect) R[s.rect] = await p.evaluate((sel, re) => { const els = [...document.querySelectorAll(sel)]; const e = re ? els.find((e) => new RegExp(re, 'i').test(e.innerText.trim())) : els[0]; if (!e) return null; const r = e.getBoundingClientRect(); return {x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height, src: e.currentSrc || undefined}; }, s.selector, s.text);
  else if (s.burst) {
    const t0 = Date.now(); const prog = []; let i = 0;
    while (Date.now() - t0 < (s.max || 120000)) {
      const txt = await p.evaluate(() => document.body.innerText);
      if (s.untilText && new RegExp(s.untilText, 'i').test(txt)) break;
      const m = txt.match(/(\d+)\s*%/);
      await p.screenshot({path: `${out}/${s.burst}_${String(i++).padStart(3, '0')}.png`});
      prog.push(m ? +m[1] : -1);
      await sleep(s.every || 150);
    }
    R[`${s.burst}_progress`] = prog; console.log(s.burst, prog.join(','));
  }
}
fs.writeFileSync(`${out}/rects.json`, JSON.stringify(R, null, 1));
await b.close();
