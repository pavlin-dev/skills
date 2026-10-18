import subprocess, sys, numpy as np
SR=22050; H=256; W=1024
def load(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True).stdout
    return np.frombuffer(raw,np.float32)
def tempo(f,fps,lo=110,hi=150):
    f=f-f.mean(); best=(0,0,0); T=len(f)/fps
    for bpm in np.arange(lo,hi,0.25):
        per=60/bpm
        for ph in np.arange(0,per,per/32):
            idx=(np.arange(ph,T,per)*fps).astype(int); idx=idx[idx<len(f)]
            s=f[idx].mean()
            if s>best[0]: best=(s,bpm,ph)
    return best
for p in sys.argv[1:]:
    x=load(p); fps=SR/H
    win=np.hanning(W); n=(len(x)-W)//H
    S=np.log1p(np.abs(np.array([np.fft.rfft(x[i*H:i*H+W]*win) for i in range(n)]))*20)
    fl=np.maximum(S[1:]-S[:-1],0)
    for nm,f in (('kick',fl[:,:10].sum(1)),('full',fl.sum(1))):
        s,b,ph=tempo(f,fps); print(p,nm,'bpm %.2f phase %.3f score %.2f'%(b,ph,s))
    r=np.sqrt(np.convolve(x**2,np.ones(SR//4)/(SR//4),'valid'))[::SR//4]
    print('rms/0.25s:'); print(' '.join('%.2f'%v for v in r))
