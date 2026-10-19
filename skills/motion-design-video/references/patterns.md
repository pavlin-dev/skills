# Motion-design patterns — Remotion recipes

All snippets are CSS 3D / SVG in Remotion, driven by beats. Shared helpers:

```tsx
const BEAT = 60 / music.bpm;                       // music.json = {bpm, b0}
const bt = (k: number) => Math.round((music.b0 + k * BEAT) * FPS);   // beat -> frame
const inOut = Easing.bezier(0.65, 0, 0.35, 1), ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const pop = Easing.bezier(0.34, 1.56, 0.64, 1);    // overshoot for things arriving
const tw = (f, a, d, e = ease) => interpolate(f, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});
const lerp = (a, b, t) => a + (b - a) * t;
const kf = (f, xs, ys) => interpolate(f, xs, ys, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});
```

Name every event as a beat constant (`T_UNROLL = bt(6)`, `T_A = bt(10)`, …) and derive all timings from them, so moving one event or changing the track re-times the whole video.

## One camera, several layers

Each layer is its own perspective context (this keeps the paint order explicit, which preserve-3d depth sorting does not), but all use the same camera function. Put UI in a layer too, otherwise it does not tilt with the rest.

```tsx
const orbit = (f) => ({
  ry: kf(f, [0, T_UNROLL, T_A, T_B, bt(20), T_C, T_CTA], [-7, 5, -4, 4, -5, 3, 0]),   // a few degrees, new direction per part
  rx: kf(f, [0, T_UNROLL, T_B, T_C, T_CTA], [7, 2, 4, 3, 0]),
});
const camera = (f) => { const {rx, ry} = orbit(f); return `rotateX(${rx}deg) rotateY(${ry}deg)`; };
const Layer = ({children}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{perspective: 1800, perspectiveOrigin: '540px 900px'}}>
    <AbsoluteFill style={{transformStyle: 'preserve-3d', transform: camera(f), transformOrigin: '540px 1000px'}}>{children}</AbsoluteFill>
  </AbsoluteFill>;
};
// <Bg/>  <Layer>scene 1–3</Layer>  <Layer>bloom circle + icon</Layer>  <Layer>cards, ink circle, CTA</Layer>  <Layer>captions, top bar</Layer>
// background blobs: add parallax, e.g. right: base + ry * 9, top: base + rx * 9
```

Bring the camera to 0/0 before the CTA so the end card is straight.

## Text anchored to a measured point

To keep part of a word fixed while the rest changes (or to fly a word into a sentence), measure text in the browser with the same font and anchor spans to a point:

```tsx
const ctx = document.createElement('canvas').getContext('2d')!;
ctx.font = `800 ${SZ}px Inter`;                    // same weight/size/family as the rendered text, no letter-spacing
// a font that is not installed system-wide must be loaded first, or widths come from the fallback font:
// @font-face via staticFile + delayRender(); await document.fonts.load(`800 ${SZ}px Inter`); then measure; continueRender()
const mw = (t: string) => ctx.measureText(t).width;
// container at the anchor (left edge of the fixed part), width 0; scale around it
<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate3d(${x0}px, ${y}px, ${z}px) scale(${s})`}}>
  <span style={{...txt, right: 0}}>{prefix}</span>                 // grows to the left
  <span style={{...txt, left: 0, color: RED}}>{ending}</span>      // fixed
  <span style={{...txt, right: mw(prefix)}}>{leadWords}</span>     // words before it in a sentence
</div>
// txt = {position:'absolute', top: -SZ*0.6, fontSize: SZ, lineHeight: `${SZ*1.2}px`, whiteSpace: 'pre'}
```

A sentence position is then `x0 = left + s * (mw(lead) + mw(prefix))`, so a word can glide from a list into a line and land exactly where the sentence needs it.

## Compose states, don't override them

Write one `pose(i, f)` per element that applies each phase *on top of* the previous one:

```tsx
let y = lerp(HERO_Y, slotY(i), unroll), s = lerp(1, 0.5, unroll);            // phase 2
if (inPoem) { const r = tw(f, T_A, 24, inOut); x0 = lerp(x0, poemX, r); y = lerp(y, poemY, r); s = lerp(s, 0.46, r); }  // phase 3 from *current* y/s
```

Bug we hit: interpolating phase 3 from the phase-2 *end* values (`lerp(slotY, poemY, r)`) made those elements jump to their phase-2 place at frame 0.

## 3D reel (slot machine) for a changing part

```tsx
const TH = 38;                                          // degrees between faces
const R = (SZ * 0.62) / Math.tan((TH / 2) * Math.PI / 180);   // radius so faces touch
const cur = FLIPS.reduce((n, t) => n + tw(f, t, 12, inOut), 0);   // 0..N-1, one step per beat
const a = -(i - cur) * TH;                              // face i angle; negative = below the front
transform: `translate3d(${x0}px, ${y}px, 0) translateZ(${-R}px) rotateX(${a}deg) translateZ(${R}px)`
opacity: clamp01(1 - (Math.abs(a) - 6) / 18)           // neighbours practically hidden; at ~13 % they read as stray words at frame 0
// faces: backfaceVisibility 'hidden'; container transformStyle 'preserve-3d'
```

**Unroll into a list**: interpolate the angle to 0 while moving each face to its list slot (`a = lerp(-(i-cur)*TH, 0, u)`, `y = lerp(heroY, slotY(i), u)`). The fixed part splits into copies at the same time: copy `i` starts on top of the hero and slides to slot `i` (show copy 0 from the start, the rest fade in during the first ~15 % of the move).

## Shape grows into the next page

```tsx
// highlight behind a list -> full-screen page of the next part
const m = tw(f, T_A, 16, Easing.bezier(0.7, 0, 0.2, 1));
left = lerp(x1, -400, m); right = lerp(x2, W + 400, m); top = lerp(y1, -400, m); bottom = lerp(y2, H + 400, m);
borderRadius: lerp(44, 0, m), background: RED, opacity: lerp(0.13, 1, m)
// oversize by ~400 px: the camera tilt would otherwise show the edges
// text on it changes colour in the same frames: interpolateColors(m, [0, 1], [INK, '#fff'])
```

## Icon draws, then blooms into the next background

```tsx
// draw: any SVG path with pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - d}
const bloom = tw(f, T_B, 22, Easing.bezier(0.5, 0, 0.3, 1));
<g transform={`translate(${cx} ${cy}) scale(${1 + bloom * 9}) rotate(${f * 0.8 + bloom * 120})`}
   stroke={interpolateColors(bloom, [0, 0.4], ['#fff', PEACH])}>…</g>
// next background: a circle from the icon's centre, in its own layer *under* the icon
const r = tw(f, T_B + 2, 20, Easing.bezier(0.5, 0, 0.2, 1)) * 2600;
<div style={{position: 'absolute', left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: CREAM}} />
// fade the icon out once the circle covers the screen; the old scene falls back: translateZ(-1200 * b), opacity 1 - b
```

The circle must open from the icon's *actual* position (the same coordinates the icon is drawn at, in the same camera layer) and only after the bloom has visibly started (2–4 frames later); a circle opening elsewhere or before the bloom reads as an unrelated wipe.

The same circle works from a button ("the search button grows into the CTA background"): start as the button's rounded square (`borderRadius` from 24 to r within the first 25 %) and interpolate the colour from the button's to the next background.

## Cards from depth, fan, fold into a bar

```tsx
const enter = tw(f, CARDS_AT[k], 18, inOut);
transform: `translate3d(0, 0, ${lerp(-1600, fan.z, enter)}px) rotateY(${lerp(50, 0, enter)}deg) rotateZ(${rot}deg)`
// fan: [{x:-165, rot:-9}, {x:165, rot:9}, {x:0, rot:0}] (front card last in the DOM)
const fold = tw(f, T_C, 10, inOut);       // x, rot -> 0
const morph = tw(f, T_C + 6, 18, inOut);  // front card's box -> bar box (w, h, centre, radius)
w = lerp(600, 900, morph); h = lerp(760, 124, morph); cy = lerp(1110, 1000, morph); radius = lerp(40, 34, morph);
// card content fades out in the first frames of the morph, bar content (URL, button) fades/pops in at the end
// back cards fade out; the next background circle opens behind the morphing card
```

Abstract content keeps cards honest and readable: a grey title bar, text lines as rounded grey bars that grow from the left (`scaleX`), the key part of each line as a brand-coloured pill that pops (e.g. the rhyme at the end of a verse), one icon (heart) that pops with `1 + sin(p·π)·0.3`.

## Decor

```tsx
<circle r={54 * g} fill="none" stroke={RED} strokeWidth={9} />          // ring, g = tw(f, at, 20, pop), shrinks when the part ends
<path d="M 120 1620 q 40 -50 80 0 t 80 0 t 80 0" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - d} />  // squiggle draws
<path d="M0 -26 Q4 -4 26 0 Q4 4 0 26 Q-4 4 -26 0 Q-4 -4 0 -26Z" transform={`translate(x y) scale(${p}) rotate(${f * 2})`} />  // sparkle
// hand-drawn underline under a word: M x1 y C x1+w*.3 y+16, x1+w*.65 y-12, x2+10 y+4  (draw with stroke-dash)
// CTA ripple: rounded rectangle around the button growing 0 -> +120 px while opacity 1 -> 0, twice
```

## Captions: flip-board, never overlapping

```tsx
const start = c.at + (i ? 8 : 0);          // the new one waits 8 frames after the old one started flipping out
const inP = tw(f, start, 12), outP = tw(f, nextAt, 8);
style = outP > 0 ? {transformOrigin: 'bottom', transform: `perspective(1100px) rotateX(${outP * 90}deg)`}
                 : {transformOrigin: 'top', transform: `perspective(1100px) rotateX(${(1 - inP) * -90}deg)`, opacity: inP > 0 ? 1 : 0};
// a caption entry with no text ends the previous one at a part boundary
```

## Pitfalls

- An element that morphs from one part into the next (words gliding into a search bar, a card becoming the URL bar) lives in the later part's layer but must be mounted and visible from frame 0 when it is already on screen then. Mounting a layer only from the morph's start time made those words missing at the beginning. Drive visibility with the element's own state, not by mounting.
- An element left outside the camera layer (the search bar in our case) stays flat while everything else tilts — the user noticed immediately.
- `opacity < 1`, `filter`, `overflow: hidden` on a preserve-3d container flatten it; fade leaf elements. Cards with `overflow: hidden` are fine because they are leaves.
- Elements at the same z inside one preserve-3d context can z-fight or paint in the wrong order; separate layers solve it.
- Something sinking into depth moves towards the perspective origin and can slide over other elements; add a downward drift (`y += 260 * r`) and fade it fast (`opacity 1 - 2.5 r`).
- Recompute `durationInFrames` after changing the track's BPM or the storyboard; cut so the CTA holds 3–4 s.
