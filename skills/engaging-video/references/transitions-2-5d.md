# Clean 2D layouts with 3D transitions: Remotion recipes

Every snippet is plain CSS 3D inside Remotion, driven by time: `t = frame / FPS`, `b(k) = b0 + BEAT * k`,
`tw(t, t0, dur, ease) = ease(clamp((t - t0) / dur))`. Transitions are 0.5-1 beat long and use
`Easing.inOut(Easing.cubic)` (or `Easing.in` for things leaving, `Easing.out(Easing.back(1.2-1.6))` for things arriving).
A transition starts ~0.5 beat before the scene boundary and lands on the beat.

A full video is just these pieces on a beat timeline: a light animated background, one `Reveal` caption per scene,
one hero element (phone mockup with a real screenshot, card, TV), and one transition from the list below between scenes.

## Building blocks

```tsx
// masked word reveal: each word slides up out of an overflow:hidden box; brand-coloured period
<span style={{display:'inline-block', overflow:'hidden', verticalAlign:'top', padding:'0 .13em .08em', margin:'0 -.06em'}}>
  <span style={{display:'inline-block', transform:`translateY(${(1-u)*115}%)`}}>{word}</span>
</span>
// frame 0 readable: call it with at = -1 (the animation already finished)

// flap-in (instead of a fade): pivot on the top edge
style={{transformOrigin:'50% 0%', transform:`rotateX(${(1-u)*-95}deg)`, opacity: clamp(u*3)}}
// put `perspective: 900-1600` on a parent; u = tw(t, at, 0.5, Easing.out(Easing.back(1.2)))

// phone with two faces so it can flip
const face = {position:'absolute', inset:0, borderRadius:66, background:INK, backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden'};
<div style={{position:'absolute', left, top, width, height, transformStyle:'preserve-3d', transform}}>
  <div style={face}>{front}</div>
  <div style={{...face, transform:'rotateY(180deg)'}}>{back}</div>
</div>
```

## Transitions

**Card flip (same phone, next screen on its back)**
```tsx
const flip = tw(t, b(15.5), b(16.25)-b(15.5), inOut);
transform: `rotateY(${flip*180 + idle}deg) scale(${1 - Math.sin(flip*Math.PI)*0.1})`
// idle = 3*Math.sin(t*1.1) keeps the phone gently alive in the 2D scenes
```

**Cube turn (whole scene to the next scene)**: both scenes are siblings inside a parent with `perspective: 2600`
```tsx
const cube = tw(t, b(23.5), b(24.25)-b(23.5), inOut);
outgoing: transform:`translateZ(-540px) rotateY(${-90*cube}deg) translateZ(540px)`   // 540 = W/2
incoming: transform:`translateZ(-540px) rotateY(${90*(1-cube)}deg) translateZ(540px)`
// both with transformStyle:'preserve-3d', backfaceVisibility:'hidden'
```

**Tilt into a floor + rise from below**
```tsx
const ex = tw(t, b(6.5), b(7.75)-b(6.5), Easing.in(Easing.cubic));
grid:  transformOrigin:'50% 1360px', transform:`translateY(${ex*500}px) rotateX(${ex*72}deg)`  // parent perspective 1600, perspectiveOrigin '50% 30%'
title: opacity 1-ex, translateY(-ex*260)
const rise = tw(t, b(6.75), b(8)-b(6.75), Easing.out(Easing.cubic));
phone: transformOrigin:'50% 100%', transform:`translateY(${(1-rise)*1300}px) rotateX(${(1-rise)*-50}deg)`
```

**Out of depth (next hero flies in from far away)**
```tsx
const inn = tw(t, b(7.5), b(8.25)-b(7.5), Easing.out(Easing.cubic));
transform:`translateZ(${(1-inn)*-2200}px) rotateY(${(1-inn)*30}deg)`, opacity: clamp(inn*2)   // parent perspective 1800
```

**Things fly out at the viewer (clearing a busy layout, e.g. chat bubbles)**
```tsx
const fly = tw(t, b(7) + i*0.05, 0.6, Easing.in(Easing.quad));   // staggered per element
transform:`translateZ(${fly*1400}px) translateX(${fly*side*400}px) rotate(${fly*side*25}deg)`, opacity: 1-fly
// the container behind it falls back: transformOrigin '50% 100%', translateZ(-out*900px) rotateX(out*55deg)
```

**Split into two / close like a book**: two copies of the phone start at the centre
```tsx
const split = tw(t, b(17.5), b(18.25)-b(17.5), Easing.out(Easing.back(1.1)));
left x = lerp(centre, 290 - w/2, split), wrapper rotateY(12*split); right: lerp(centre, 790 - w/2, split), rotateY(-12*split)
const fold = tw(t, b(23.4), b(24.2)-b(23.4), Easing.in(Easing.cubic));
left wrapper: transformOrigin `${leftX + w}px 50%`, rotateY(12*split + fold*80)
right wrapper: transformOrigin `${rightX}px 50%`, rotateY(-12*split - fold*80)
// swap a screen inside a phone with a wipe: clipPath `inset(0 0 ${(1-u)*100}% 0)`
```

**Door swing to the end card**
```tsx
const door = tw(t, b(31), b(31.75)-b(31), Easing.in(Easing.cubic));
scene: transformOrigin:'0% 50%', transform:`rotateY(${-door*100}deg)`, fade out from b(31.35)
end card: start rendering at b(31.2); logo flips in: rotateY(${(1-u)*-180}deg) scale(${0.5+0.5*u}) from b(31.5)
```

**Screen turns like a card into the end card**: TV/phone `rotateY(flip*90deg) scale(1 + flip*0.4)`, then the end card starts.

## Small 2.5D details

- **Flip-board value** (key A → A# → H): for 0.22 s after each beat, the angle goes 0 → −90° (old value), then 90° → 0 (new value). `rotateX(angle)` on a gradient tile, parent `perspective: 600`.
- **TV switching on**: content clip `inset(${(1-on)*50}% 0 ${(1-on)*50}% 0)` plus a 4 px white glowing line in the middle fading out; afterwards a slow Ken Burns zoom (`scale(1 + kb*0.25)`).
- **Stickers/chips**: swing in with `perspective(900px) rotateY((1-u)*70deg) rotate(±3deg) scale(u)`, overlapping the phone's edges.
- **Tidy connectors**: SVG right-angle paths `M x y V y2 H x2 V y3`, drawn with `pathLength={1} strokeDasharray={1} strokeDashoffset={1-u}`.
- **Press feedback**: scale 0.9 for 0.3 s on the beat plus a thin expanding ring. Avoid moving dots or cursors.

## CSS-3D pitfalls (each one bit us)

- `opacity < 1`, `filter` and `overflow: hidden` on an element with `transform-style: preserve-3d` flatten its children into a plane. Fade a leaf element or the whole scene, not the 3D container mid-flip (a brief flatten during a fade-in is fine).
- An overlay (stickers, chips) that is a sibling of a 3D phone at the same z intersects it and gets partly hidden. Put the overlay in its own absolutely positioned layer with `transform: 'translateZ(2px)'`. A large value (e.g. 400px) enlarges it through the perspective and pushes it off screen.
- Nested `perspective` creates a new 3D context: the child's 3D is flattened into its parent plane. That is fine for a phone inside a cube face, but don't expect true depth sorting across them.
- Elements that pass behind the camera render mirrored or huge. Hide them (`depth < ~150px`) or fade them before they get there.
- Rendering `--frames` past the composition length fails silently in a batch. `DURATION = round(b(END) * FPS)` changes with the BPM, so recompute the frame list.
- Text measured for pixel-precise layouts must come from the same TTF that the composition loads (`@font-face` from `staticFile`).

## What to avoid (user feedback)

- A bouncing mascot or dot as the connecting motif felt distracting.
- A fully 3D world (camera flying through a tunnel of cards, light threads, depth-of-field) felt chaotic, even though the stills looked good.
- Dark, busy backgrounds behind UI screenshots. Light, calm, brand-coloured backgrounds read cleaner.
