# Generate instrumental tracks with ACE-Step on the free CPU Hugging Face Space (~6 min per track).
# Needs: pip install gradio_client
# usage: python3 gen_cpu.py [--out DIR] [--bpm 120] [--duration 22] [--caption "..."] [preset ...]
# Presets: see CAP below. --caption adds a custom one named "custom".
import argparse, os, shutil, time
CAP = {
 'drive': 'energetic sporty electro pop, punchy four-on-the-floor kick, snappy claps, bouncy plucked synth hook, rubbery bass, bright, confident, fun, sports promo, instrumental',
 'funk': 'upbeat funky nu-disco, slap bass groove, catchy whistle synth hook, crisp hi-hats, claps, summer sports vibe, feel-good, instrumental',
}
ap = argparse.ArgumentParser()
ap.add_argument('presets', nargs='*')
ap.add_argument('--out', default='music')
ap.add_argument('--bpm', type=int, default=120)
ap.add_argument('--duration', type=int, default=22)
ap.add_argument('--seed', type=int, default=7)
ap.add_argument('--caption')
a = ap.parse_args()
if a.caption:
    CAP['custom'] = a.caption
    a.presets.append('custom')
if not a.presets:
    ap.error('give at least one preset (%s) or --caption' % ', '.join(CAP))
try:
    from gradio_client import Client
except ImportError:
    ap.exit(1, 'needs gradio_client: pip install gradio_client\n')
os.makedirs(a.out, exist_ok=True)
c = Client('WeReCooking/ACE-Step-CPU', verbose=False)
for k in a.presets:
    t0 = time.time()
    try:
        r = c.predict(caption=CAP[k], lyrics='[Instrumental]', bpm=a.bpm, duration=a.duration, seed=a.seed, steps=8,
                      lora_select='None (no LoRA)', lm_model_select='acestep-5Hz-lm-1.7B-Q8_0.gguf', api_name='/generate')
        print(k, r, round(time.time() - t0), 's', flush=True)
        src = r[0] if isinstance(r, (list, tuple)) else r
        if isinstance(src, dict): src = src.get('path') or src.get('value')
        shutil.copy(src, os.path.join(a.out, f'cpu_{k}.mp3'))
    except Exception as e:
        print(k, 'FAIL', repr(e)[:400], round(time.time() - t0), flush=True)
