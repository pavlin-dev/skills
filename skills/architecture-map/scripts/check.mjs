#!/usr/bin/env node
// Opens a built map in a headless browser, reports script errors and the layout stats,
// and saves screenshots: the overview, every part zoomed in, and the end of every example.
// Usage: node scripts/check.mjs <map.html> [out-dir]
// Needs Playwright with Chromium: npm i -D playwright && npx playwright install chromium
// (if a Chromium is already installed, set CHROMIUM_PATH to its executable)
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const [file, outArg] = process.argv.slice(2)
if (!file || file === '--help' || file === '-h') {
	console.log('Usage: node scripts/check.mjs <map.html> [out-dir]\nSaves screenshots (default out-dir: a folder in the system temp dir) and prints layout stats.\nNeeds: npm i -D playwright && npx playwright install chromium (or CHROMIUM_PATH=/path/to/chrome).')
	process.exit(file ? 0 : 1)
}
let chromium
try { ({ chromium } = await import('playwright')) } catch {
	// ESM import ignores NODE_PATH and global installs; CommonJS resolution finds them
	try { ({ chromium } = createRequire(join(process.cwd(), 'noop.js'))('playwright')) } catch {
		try { ({ chromium } = createRequire(import.meta.url)('playwright')) } catch { console.error('Playwright is not installed: npm i -D playwright && npx playwright install chromium'); process.exit(1) }
	}
}

const out = resolve(outArg || join(tmpdir(), 'architecture-map-check'))
mkdirSync(out, { recursive: true })
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
const problems = []
page.on('pageerror', e => problems.push(e.message))
page.on('console', m => m.type() === 'error' && problems.push(m.text()))
await page.goto(pathToFileURL(resolve(file)).href)
await page.waitForTimeout(800)

const projects = await page.$$('[data-p]')
const runs = projects.length ? projects.length : 1
for (let p = 0; p < runs; p++) {
	if (projects.length) { await page.click(`[data-p="${p}"]`); await page.waitForTimeout(800) }
	const tag = `p${p}`
	console.log(`project ${p}: ${(await page.textContent('#stats')) || '(stats hidden)'}`)
	await (await page.$('.stage')).screenshot({ path: join(out, `${tag}-overview.png`) })
	const parts = await page.$$('#map .mod')
	for (let i = 0; i < parts.length; i++) {
		await page.locator('#map .mod').nth(i).click({ force: true, position: { x: 20, y: 20 } })
		await page.waitForTimeout(700)
		await (await page.$('.stage')).screenshot({ path: join(out, `${tag}-part${i + 1}.png`) })
		await page.mouse.click(5, 5); await page.click('#crumbs button').catch(() => {}); await page.waitForTimeout(700)
	}
	const plays = await page.$$('.play')
	for (let s = 0; s < plays.length; s++) {
		await page.click(`.play[data-s="${s}"]`)
		await page.waitForFunction(() => document.querySelector('#cap .n')?.textContent !== '' && !document.querySelector('.play[aria-pressed="true"]'), null, { timeout: 60000 }).catch(() => problems.push(`example ${s + 1} did not finish within 60 s`))
		await page.screenshot({ path: join(out, `${tag}-example${s + 1}.png`), fullPage: true })
	}
}
await browser.close()
console.log(`screenshots: ${out}`)
if (problems.length) { console.error('problems:\n' + problems.map(p => '  ' + p).join('\n')); process.exit(1) }
console.log('no script errors')
