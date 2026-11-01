#!/usr/bin/env python3
"""Find and download real recorded sound effects from free libraries, and keep their credits.

usage:
  find_sfx.py search "door slam" [-n 12] [--lib all|sfxkit|oculus|atomcut|freesound]
  find_sfx.py get <lib>:<id> [--out sfx] [--take 1]

Libraries (searched in this order; the indexes are downloaded once and cached in $SFX_CACHE or ~/.cache/find_sfx):
  sfxkit     wyzowl/sfx-kit on GitHub, CC0 (no credit needed): 320 sounds for motion and edits: whooshes, impacts,
             pops, UI, foley of paper/fabric/glass, mechanisms, applause, clocks, money. Each comes with use_for,
             a sync point and a level.
  oculus     Oculus Audio Pack 1 in facebookincubator/Meta-open-sound on GitHub, CC BY 4.0 (credit required):
             footsteps on six surfaces, doors, voices (efforts, screams), crowd and room ambience loops, cartoon
             boings, cloth, paper, metal, tools, vehicles.
  atomcut    novincode/atomcut-library on GitHub: ~100 packs gathered from OpenGameArt and Kenney, mostly CC0
             (the licence is printed per sound): door sets, footsteps on many surfaces, vocal grunts and dialogue
             samples, hits and punches, wood and metal, breaking, cloth, books, cards, keyboards, UI. Names only,
             no descriptions: search by plain words ("door close", "steps wood").
  freesound  freesound.org, only with a free API key in FREESOUND_API_KEY (https://freesound.org/apiv2/apply):
             hundreds of thousands of sounds; searched for CC0 and CC BY only. Downloads the high-quality preview.

get writes the file into --out and appends the credit line to <out>/CREDITS.md when the licence asks for one.
Put that line in the video's description. Needs only Python 3 (no packages).
"""
import json, os, re, sys, urllib.parse, urllib.request

A = sys.argv[1:]
if not A or A[0] in ('-h', '--help') or A[0] not in ('search', 'get'):
    print(__doc__); sys.exit(0 if A and A[0] in ('-h', '--help') else 1)
def opt(name, d=None):
    return A[A.index(name) + 1] if name in A else d
CACHE = os.environ.get('SFX_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'find_sfx')
os.makedirs(CACHE, exist_ok=True)
GH = 'https://raw.githubusercontent.com/'
SK = GH + 'wyzowl/sfx-kit/main/'
OC = GH + 'facebookincubator/Meta-open-sound/main/corpora/oculus-audio-pack/'
OC_CATS = 'AMB ANML BIRD BLLT BOAT CERM CHAIN CLOCK CLOTH CREA CRWD DOOR DRWR DSGN FEET FGHT FOOD GLAS GORE HMN LASR MACH MAG MECH METL MOTR MUSC OBJ PAPR PLAS RAIN SWSH TOOL TOON TRN UI VEGE VEH VOX WATR WEAP WHSH WIND WOOD'.split()
OC_CREDIT = '"Oculus Audio Pack 01" by Oculus VR, LLC (https://developers.meta.com/vr/downloads/package/oculus-audio-pack-1/), licensed under CC BY 4.0.'
AC = GH + 'novincode/atomcut-library/main/packs/'
FS_KEY = os.environ.get('FREESOUND_API_KEY')

def fetch(url, path=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'find_sfx'})
    data = urllib.request.urlopen(req, timeout=60).read()
    if path: open(path, 'wb').write(data)
    return data
def cached_json(name, url):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p): fetch(url, p)
    return json.load(open(p, encoding='utf8'))

def lib_sfxkit():
    out = []
    for s in cached_json('sfxkit.json', SK + 'sounds.json')['sounds']:
        text = ' '.join([s['id'], s['name'], s.get('description', ''), ' '.join(s.get('use_for', [])), ' '.join(s.get('tags', []))])
        out.append({'lib': 'sfxkit', 'id': s['id'], 'lic': 'CC0', 'dur': s.get('duration'), 'text': text,
                    'what': s['name'] + ': ' + '; '.join(s.get('use_for', [])[:3]), 'files': [SK + s['file']],
                    'sync': (s.get('sync') or {}).get('at')})
    return out
def lib_oculus():
    out = []
    for c in OC_CATS:
        for s in cached_json('oculus_' + c + '.json', OC + 'index/' + c + '.json')['sounds']:
            text = ' '.join([s['id'], s.get('summary', ''), ' '.join(s.get('keywords', []))])
            takes = s.get('takes', [])
            out.append({'lib': 'oculus', 'id': s['id'], 'lic': 'CC BY 4.0', 'dur': takes[0]['duration_s'] if takes else None, 'text': text,
                        'what': s.get('summary', '').replace('Use for: ', '') + (f' ({len(takes)} takes)' if len(takes) > 1 else ''),
                        'files': [OC + 'ogg/' + t['file'].rsplit('.', 1)[0] + '.ogg' for t in takes]})
    return out
def lib_atomcut():
    p = os.path.join(CACHE, 'atomcut_packs.json')
    if not os.path.exists(p):
        names = [x['name'] for x in json.loads(fetch('https://api.github.com/repos/novincode/atomcut-library/contents/packs')) if x['type'] == 'dir']
        packs = []
        for nm in names:
            try: packs.append(json.loads(fetch(AC + nm + '/pack.json')))
            except Exception: pass
        json.dump(packs, open(p, 'w'))
    out = []
    for pk in json.load(open(p)):
        if pk.get('kind') != 'sound': continue
        lic = 'CC0' if pk.get('license', '').upper().startswith('CC0') else pk.get('license', '?')
        for f in pk.get('files', []):
            text = ' '.join([pk.get('title', ''), pk.get('blurb') or '', f.get('name', ''), ' '.join(f.get('tags', [])), f.get('src', '').replace('/', ' ').replace('_', ' ').replace('-', ' ')])
            out.append({'lib': 'atomcut', 'id': pk['id'] + '/' + f['file'].rsplit('/', 1)[1].rsplit('.', 1)[0], 'lic': lic, 'dur': None, 'text': text,
                        'what': f.get('name', '') + ' (' + pk.get('title', '') + ')', 'files': [AC + pk['id'] + '/' + f['file']],
                        'credit': None if lic == 'CC0' else pk.get('attribution')})
    return out
def fs_search(q, n):
    if not FS_KEY: return []
    f = 'license:("Creative Commons 0" OR "Attribution")'
    url = 'https://freesound.org/apiv2/search/text/?' + urllib.parse.urlencode({'query': q, 'filter': f, 'page_size': n, 'fields': 'id,name,license,duration,username,description', 'token': FS_KEY})
    r = json.loads(fetch(url))
    return [{'lib': 'freesound', 'id': str(s['id']), 'lic': 'CC0' if 'zero' in s['license'] else 'CC BY', 'dur': s['duration'],
             'what': s['name'] + ' (by ' + s['username'] + ')'} for s in r.get('results', [])]

def score(e, words):
    t = e['text'].lower(); return sum(3 if re.search(r'\b' + re.escape(w), t) else 0 for w in words) + sum(1 for w in words if w in t)

if A[0] == 'search':
    q = A[1] if len(A) > 1 else sys.exit('search needs a query')
    n, lib = int(opt('-n', 12)), opt('--lib', 'all')
    words = [w for w in re.findall(r'\w+', q.lower()) if len(w) > 1]
    pool = (lib_sfxkit() if lib in ('all', 'sfxkit') else []) + (lib_oculus() if lib in ('all', 'oculus') else []) + (lib_atomcut() if lib in ('all', 'atomcut') else [])
    hits = sorted((e for e in pool if score(e, words) >= 3 * max(1, len(words) - 1)), key=lambda e: -score(e, words))[:n]
    if lib in ('all', 'freesound'): hits += fs_search(q, n)
    if not hits: print('nothing found; try other words (what it is made of, what happens: "metal door slam", "crowd gasp")')
    for e in hits:
        d = f"{e['dur']:.2f}s" if e.get('dur') else '?'
        print(f"{e['lib']}:{e['id']}  [{e['lic']}, {d}]  {e['what'][:110]}")
    if lib in ('all', 'freesound') and not FS_KEY: print('(freesound skipped: set FREESOUND_API_KEY for far more sounds)')
else:
    ref = A[1] if len(A) > 1 else sys.exit('get needs <lib>:<id>')
    lib, sid = ref.split(':', 1); out = opt('--out', 'sfx'); take = int(opt('--take', 1)); os.makedirs(out, exist_ok=True)
    if lib == 'freesound':
        if not FS_KEY: sys.exit('set FREESOUND_API_KEY')
        s = json.loads(fetch(f'https://freesound.org/apiv2/sounds/{sid}/?fields=id,name,license,username,url,previews&token={FS_KEY}'))
        path = os.path.join(out, f"freesound_{sid}.mp3"); fetch(s['previews']['preview-hq-mp3'], path)
        credit = None if 'zero' in s['license'] else f'"{s["name"]}" by {s["username"]} ({s["url"]}), {s["license"]}'
    else:
        e = next((x for x in {'sfxkit': lib_sfxkit, 'oculus': lib_oculus, 'atomcut': lib_atomcut}[lib]() if x['id'] == sid), None)
        if not e: sys.exit(f'no {ref}; search first')
        url = e['files'][min(take, len(e['files'])) - 1]
        path = os.path.join(out, (sid.split('/')[0] + '_' if lib == 'atomcut' else '') + url.rsplit('/', 1)[1]); fetch(url, path)
        credit = OC_CREDIT if lib == 'oculus' else e.get('credit')
        if e.get('sync'): print(f'sync point {e["sync"]} s: start the sound that much before its moment')
    if credit:
        cp = os.path.join(out, 'CREDITS.md'); old = open(cp, encoding='utf8').read() if os.path.exists(cp) else ''
        if credit not in old: open(cp, 'a', encoding='utf8').write('- ' + credit + '\n')
        print('credit needed (added to', cp + '):', credit)
    print(path)
