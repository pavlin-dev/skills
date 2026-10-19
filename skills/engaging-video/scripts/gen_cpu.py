import shutil, sys, time
from gradio_client import Client
c = Client('WeReCooking/ACE-Step-CPU', verbose=False)
CAP = {
 'drive': 'energetic sporty electro pop, punchy four-on-the-floor kick, snappy claps, bouncy plucked synth hook, rubbery bass, bright, confident, fun, sports promo, instrumental',
 'funk': 'upbeat funky nu-disco, slap bass groove, catchy whistle synth hook, crisp hi-hats, claps, summer sports vibe, feel-good, instrumental',
}
for k in sys.argv[1:]:
    t0 = time.time()
    try:
        r = c.predict(caption=CAP[k], lyrics='[Instrumental]', bpm=120, duration=22, seed=7, steps=8,
                      lora_select='None (no LoRA)', lm_model_select='acestep-5Hz-lm-1.7B-Q8_0.gguf', api_name='/generate')
        print(k, r, round(time.time() - t0), 's', flush=True)
        src = r[0] if isinstance(r, (list, tuple)) else r
        if isinstance(src, dict): src = src.get('path') or src.get('value')
        shutil.copy(src, f'music/cpu_{k}.mp3')
    except Exception as e:
        print(k, 'FAIL', repr(e)[:400], round(time.time() - t0), flush=True)
