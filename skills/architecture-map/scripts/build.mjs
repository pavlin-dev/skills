#!/usr/bin/env node
// Validates an architecture model (JSON) and injects it into template/engine.html.
// Usage: node scripts/build.mjs <model.json> <out.html> [--fragment]
//   --fragment  write the page without <!doctype html>/<head>/<body>, for hosts that wrap pages themselves
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
	console.log('Usage: node scripts/build.mjs <model.json> <out.html> [--fragment]\n\nChecks the model and writes a self-contained interactive architecture map.\nModel format: references/model-schema.md (examples in references/).')
	process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1)
}
const [modelPath, outPath] = args.filter(a => !a.startsWith('--'))
const fragment = args.includes('--fragment')
const here = dirname(fileURLToPath(import.meta.url))

let page = JSON.parse(readFileSync(modelPath, 'utf8'))
if (!page.projects) page = { title: page.name, projects: [page] }

const errors = [], warnings = []
const err = (p, m) => errors.push(`${p.name || '?'}: ${m}`), warn = (p, m) => warnings.push(`${p.name || '?'}: ${m}`)
const words = s => String(s).trim().split(/\s+/).length

for (const p of page.projects) {
	if (!p.name) err(p, 'missing "name"')
	const mods = p.mods || [], io = p.io || [], svc = p.svc || [], flows = p.flows || [], uses = p.uses || []
	if (mods.length < 2) err(p, 'needs at least 2 parts in "mods"')
	if (mods.length > 7) err(p, `${mods.length} parts: the layout search allows at most 7. Group parts; a map shows the few biggest responsibilities.`)
	const ids = new Set(), kind = {}
	for (const [list, k] of [[mods, 'mod'], [io, 'io'], [svc, 'svc']]) for (const x of list) {
		if (!x.id) err(p, `${k} without "id"`)
		else if (ids.has(x.id)) err(p, `duplicate id "${x.id}"`)
		ids.add(x.id); kind[x.id] = k
		if (!x.n) err(p, `"${x.id}" has no name "n"`)
	}
	for (const m of mods) {
		if (!m.d) err(p, `part "${m.id}" has no one-sentence description "d"`)
		else if (m.d.length > 80) warn(p, `part "${m.id}": description is long (${m.d.length} chars), keep it to one short sentence`)
		if (!Array.isArray(m.line) || m.line.length < 2 || m.line.length > 6) err(p, `part "${m.id}": "line" needs 2 to 6 steps`)
	}
	for (const i of io) {
		if (!['in', 'out'].includes(i.kind)) err(p, `io "${i.id}": "kind" must be "in" or "out"`)
		const n = flows.filter(f => f[0] === i.id || f[1] === i.id).length
		if (n < 1) err(p, `io "${i.id}" has no flow`)
	}
	for (const f of flows) {
		const [a, b, w, k] = f
		if (!ids.has(a) || !ids.has(b)) err(p, `flow ${a} > ${b}: unknown id`)
		if (kind[a] === 'svc' || kind[b] === 'svc') err(p, `flow ${a} > ${b}: services belong in "uses", not "flows"`)
		if (k && !['main', 'opt', 'soon', 'two', 'async'].includes(k)) err(p, `flow ${a} > ${b}: kind must be main, opt, soon, two or async`)
		if (!w) err(p, `flow ${a} > ${b}: missing word`)
		else for (const part of String(w).split(' / ')) if (words(part) > 2) warn(p, `flow ${a} > ${b}: "${part}" is more than two words`)
	}
	for (const [m, s, rq, an] of uses) {
		if (kind[m] !== 'mod') err(p, `use ${m} > ${s}: "${m}" is not a part`)
		if (kind[s] !== 'svc') err(p, `use ${m} > ${s}: "${s}" is not a service`)
		if (!rq || !an) err(p, `use ${m} > ${s}: needs a request word and an answer word`)
	}
	for (const s of svc) if (!uses.some(u => u[1] === s.id)) err(p, `service "${s.id}" is not used by any part`)
	const edge = new Set([...flows.flatMap(f => f[3] === 'two' ? [f[0] + '>' + f[1], f[1] + '>' + f[0]] : [f[0] + '>' + f[1]]), ...uses.flatMap(u => [u[0] + '>' + u[1], u[1] + '>' + u[0]])])
	for (const [name, steps] of p.scen || []) for (const [a, b, payload, text] of steps) {
		if (a === 'at') { if (kind[b] !== 'mod') err(p, `example "${name}": "at" needs a part id, got "${b}"`) }
		else if (!edge.has(a + '>' + b)) err(p, `example "${name}": step ${a} > ${b} has no arrow`)
		if (!payload || !text) err(p, `example "${name}": step ${a} > ${b} needs a payload and a caption`)
	}
	if (!(p.scen || []).length) warn(p, 'no examples in "scen"; they are what makes the map click for readers')
	for (const [name, steps] of p.scen || []) if (steps.length > 8) warn(p, `example "${name}" has ${steps.length} steps; around 6 reads best`)
	const outside = io.length + svc.length
	if (outside > 14) err(p, `${outside} outside boxes: the layout has room for about 14. Merge services or inputs, or leave minor ones out and name them in the lead.`)
}
for (const w of warnings) console.warn('warning: ' + w)
if (errors.length) { for (const e of errors) console.error('error: ' + e); process.exit(1) }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
let html = readFileSync(join(here, '..', 'template', 'engine.html'), 'utf8')
	.replace('/*__TITLE__*/', esc(page.title || page.projects[0].name))
	.replace('/*__PAGE__*/', JSON.stringify(page).replace(/</g, '\\u003c'))
if (!fragment) html = `<!doctype html>\n<html lang="${esc(page.lang || 'cs')}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${html}\n</body>\n</html>\n`
mkdirSync(dirname(resolve(outPath)), { recursive: true })
writeFileSync(outPath, html)
console.log(`wrote ${outPath} (${page.projects.map(p => `${p.name}: ${p.mods.length} parts`).join(', ')})`)
