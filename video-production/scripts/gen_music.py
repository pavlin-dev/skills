# Free AI music from ACE-Step on Hugging Face.
# usage: python gen_music.py gpu|cpu <style>... [--out DIR] [--bpm 120]
#   gpu = ACE-Step/ACE-Step (fast, shared anonymous ZeroGPU quota, often "exceeded your ZeroGPU quota" after 1 track)
#   cpu = WeReCooking/ACE-Step-CPU (no quota, ~5–6 min per track, returns ~16 s of music in a ~30 s file)
# Run cpu in the background with nohup right at the start; it survives while you capture footage.
# Python: /workspace/turbl-video/.venv/bin/python with PYTHONPATH=/workspace/persistent/turbl-yt-54af/pylibs
import argparse, os, shutil, time
from gradio_client import Client
P = {
 'drive': 'energetic sporty electro pop, punchy four-on-the-floor kick, snappy claps, bouncy plucked synth hook, rubbery bass, bright, confident, fun, sports promo, instrumental',
 'funk': 'upbeat funky nu-disco, slap bass groove, catchy whistle synth hook, crisp hi-hats, claps, summer sports vibe, feel-good, instrumental',
 'pop': 'upbeat modern electro pop, punchy four-on-the-floor kick, snappy claps, catchy plucked synth hook, warm analog bass, bright, confident, creative tech promo, instrumental',
 'house': 'feel-good piano house, punchy four-on-the-floor kick, crisp claps, catchy bouncy synth lead hook, groovy bassline, uplifting, product launch promo, instrumental',
}
ap = argparse.ArgumentParser()
ap.add_argument('mode', choices=['gpu', 'cpu'])
ap.add_argument('styles', nargs='+')
ap.add_argument('--out', default='music')
ap.add_argument('--bpm', type=int, default=120)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
for k in a.styles:
    t0 = time.time()
    cap = P.get(k, k)  # unknown key = use it as the prompt itself
    try:
        if a.mode == 'gpu':
            c = Client('ACE-Step/ACE-Step', verbose=False)
            r = c.predict(audio_duration=24, prompt=f'{cap}, {a.bpm} BPM', lyrics='[instrumental]', infer_step=60, guidance_scale=15.0,
                          scheduler_type='euler', cfg_type='apg', omega_scale=10.0, manual_seeds='21', guidance_interval=0.5,
                          guidance_interval_decay=0.0, min_guidance_scale=3.0, use_erg_tag=True, use_erg_lyric=False,
                          use_erg_diffusion=True, oss_steps='', guidance_scale_text=0.0, guidance_scale_lyric=0.0,
                          audio2audio_enable=False, ref_audio_strength=0.5, ref_audio_input=None,
                          lora_name_or_path='none', api_name='/__call__')
        else:
            c = Client('WeReCooking/ACE-Step-CPU', verbose=False)
            r = c.predict(caption=cap, lyrics='[Instrumental]', bpm=a.bpm, duration=22, seed=7, steps=8,
                          lora_select='None (no LoRA)', lm_model_select='acestep-5Hz-lm-1.7B-Q8_0.gguf', api_name='/generate')
        src = r[0] if isinstance(r, (list, tuple)) else r
        if isinstance(src, dict): src = src.get('path') or src.get('value')
        dst = f'{a.out}/{a.mode}_{k[:20].replace(" ", "_")}.mp3'
        shutil.copy(src, dst); print(k, 'OK', dst, round(time.time() - t0), 's', flush=True)
    except Exception as e:
        print(k, 'FAIL', repr(e)[:300], round(time.time() - t0), 's', flush=True)
