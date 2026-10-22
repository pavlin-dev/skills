#!/usr/bin/env node
// Render a canvas page frame by frame to MP4 (no audio; mux the mix later with sound-design's mix.py --video).
// The page must define window.ready (Promise), window.DURATION (s) and window.renderFrame(t), and draw
// into <canvas id="c">; the toon template (template/index.html + toon.js) does.
//
// usage: node render.mjs <page.html> <out.mp4> [--fps 30]
//        node render.mjs <page.html> <out_dir> --frames 0,90,180     (PNG stills to check a frame)
// env:   CHROME_PATH  browser to use instead of Playwright's default Chromium
// needs: ffmpeg, Playwright for Node (`npm i playwright` in the project, or a global install), a Chromium
//        (`npx playwright install chromium` if none is installed)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const fps = Number(opt('--fps', 30));
const frames = opt('--frames', null);
const [pagePath, out] = args;
if (!pagePath || !out) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n'));
  process.exit(1);
}
function loadPlaywright() {
  const req = createRequire(path.resolve(pagePath));
  try { return req('playwright'); } catch {}
  const g = execSync('npm root -g').toString().trim();
  return createRequire(path.join(g, 'x.js'))('playwright');
}
const { chromium } = loadPlaywright();

// serve the page's folder over HTTP (fetch() and fonts don't load from file://)
const root = path.dirname(path.resolve(pagePath));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => { console.error('PAGE ERROR', e.message); process.exit(1); });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.error('page:', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/${path.basename(pagePath)}`);
await page.evaluate(() => window.ready);
const dur = await page.evaluate(() => window.DURATION);
const grab = (t) => page.evaluate((t) => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, t);

if (frames) {
  fs.mkdirSync(out, { recursive: true });
  for (const f of frames.split(',').map(Number)) fs.writeFileSync(path.join(out, `f${String(f).padStart(5, '0')}.png`), Buffer.from(await grab(f / fps), 'base64'));
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    if (!ff.stdin.write(Buffer.from(await grab(i / fps), 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) process.stdout.write(`\r${(i / fps).toFixed(0)}/${dur.toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('');
}
await browser.close(); server.close();
console.log('done', out);
