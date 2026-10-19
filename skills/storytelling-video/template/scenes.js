// Example scenes: one per voice-over line id in timeline.json. Replace them with your story.
// Each scene draws in its own 1080-wide panel; t = seconds since its line started (negative while
// the camera is still panning in). Tie every reveal to a spoken word with atL(lineId, 'wordPrefix').
startFilm(document.getElementById('c'), () => ({
  hook(t) {
    // a figure drawn on, then the key fact handwritten as the voice says it
    ink(line(140, 1180, 940, 1180), { seed: 10, k: drawOn(t, -0.1, 0.5) });
    stick(300, 1180, 3, 20, { k: drawOn(t, 0, 0.6) });
    const tw = atL('hook', 'jedna');
    hand('1 chyba', 700, 760, 150, seg(t, tw - 0.1, tw + 0.4), { color: RED });
    underline(560, 800, 280, drawOn(t, tw + 0.4, 0.3), 30);
  },
  turn(t) {
    // a dial whose needle falls; the word in the voice triggers the drop
    const k = drawOn(t, -0.1, 0.5), cx = 540, cy = 780, R = 260;
    ink(circlePts(cx, cy, R, 60), { seed: 40, k, fill: k >= 1 ? PAPER : null, w: 6 });
    const drop = easeOut(seg(t, atL('turn', 'spadne'), atL('turn', 'spadne') + 0.6));
    const a = Math.PI * (1.1 - 1.2 * lerp(0.9, 0.02, drop));
    if (k >= 1) ink(line(cx, cy, cx + Math.cos(a) * R * 0.78, cy - Math.sin(a) * R * 0.78), { seed: 41, w: 9, color: RED, amp: 1.2 });
    hand('E', cx - R * 0.62, cy, 110, k, { color: RED }); hand('F', cx + R * 0.62, cy, 110, k);
  },
  end(t) {
    // a crowd that cheers on the last word, the title circled in red
    for (let i = 0; i < 6; i++) stick(190 + i * 140, 1180, 1.6, 60 + i * 10, { k: drawOn(t, i * 0.06, 0.4), wave: easeOut(seg(t, atL('end', 'přežili'), atL('end', 'přežili') + 0.4)) });
    hand('KONEC', 540, 640, 200, seg(t, 0.1, 0.7));
    ringScribble(540, 580, 330, 120, drawOn(t, 0.8, 0.4), 90);
  },
}), () => ({ shakes: () => [[at('turn', 'spadne'), 14]] }));
