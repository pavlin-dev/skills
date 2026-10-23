#!/usr/bin/env node
// Screenshots of the real product for the phone / laptop / TV screens in the video.
//
// usage: node shoot_site.mjs <url> <out_dir> [--mobile | --desktop] [--wait 5000] [--full]
//          [--type "<css selector>" "<text>" --steps 5]     the text typed into an input at N lengths (t0.png..tN.png)
//          [--drag "<css selector>"]                        the element in its drag-over (file hover) state (drag.png)
//          [--nojs]                                         server HTML only (when the app's JS fails headless)
// writes <out_dir>/page.png (+ t*.png, drag.png) and prints the box (CSS px) of the --type / --drag element,
// so the scene can draw typed text into the real input on its own.
// env: CHROME_PATH  browser to use instead of Playwright's default Chromium
// needs: Playwright for Node (`npm i playwright`), a Chromium (`npx playwright install chromium` if none)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = (k, n = 1) => { const i = args.indexOf(k); if (i < 0) return null; const v = args.splice(i, n + 1).slice(1); return n === 1 ? v[0] : v; };
const desktop = flag('--desktop'); flag('--mobile'); const full = flag('--full'); const nojs = flag('--nojs');
const wait = Number(opt('--wait') || 5000), type = opt('--type', 2), steps = Number(opt('--steps') || 5), drag = opt('--drag');
const [url, out] = args;
if (!url || !out) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(1); }
function loadPlaywright() { try { return createRequire(path.resolve('x.js'))('playwright'); } catch {} return createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const { chromium } = loadPlaywright();
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await b.newContext(desktop ? { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, javaScriptEnabled: !nojs }
  : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, javaScriptEnabled: !nojs });
const p = await ctx.newPage();
// 'networkidle' can hang for minutes on live sites: load the DOM, then wait a fixed time
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); await p.waitForTimeout(wait);
await p.screenshot({ path: path.join(out, 'page.png'), fullPage: full });
const box = async (sel) => { const el = await p.$(sel); if (!el) throw new Error('no element ' + sel); return el.boundingBox(); };
if (type) {
  const [sel, text] = type; console.log('input box', JSON.stringify(await box(sel)));
  for (let i = 0; i <= steps; i++) { await p.fill(sel, text.slice(0, Math.round(text.length * i / steps))); await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, `t${i}.png`) }); }
}
if (drag) {
  const bb = await box(drag); console.log('drop box', JSON.stringify(bb));
  await p.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); const dt = new DataTransfer(); dt.items.add(new File(['x'], 'file.zip', { type: 'application/zip' }));
    for (const ev of ['dragenter', 'dragover']) el.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt })); }, { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
  await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, 'drag.png') });
}
console.log('page.png', desktop ? '1920x1200 (1280x800 CSS px x1.5)' : '780x1688 (390x844 CSS px x2)');
await b.close();
