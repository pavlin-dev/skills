"""Build (and optionally render) one shot of a scenario.

usage: python3 build.py SCENARIO.json SHOT_ID [save|board F1,F2,...|audit|events|render] [--out DIR]
Asset paths inside the scenario are relative to this scripts folder.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import kit  # noqa: E402

G = 9.81
EXTRAS = {"mom_hair": kit.mom_hair, "kid_hair": kit.kid_hair, "dad_cap": kit.dad_cap}


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


def ramp(t, t0, t1):
    return smooth((t - t0) / (t1 - t0)) if t1 > t0 else float(t >= t0)


# ------------------------------------------------------------------ set & cast
def build_set(sc, out_dir):
    """Set types: "park" (default: dirt ground, trees, props, optional swing) or "room" (toy living room).
    Photoreal accents (paths relative to pipeline/):
      "photos":  [{"file", "pos":[x,y,z], "width", "rot", "frame"}]          framed real photo on a wall
      "posters": [{"file" | "poster":{"photo", "title", ...}, "pos", "width", "rot", "tilt"}]  unframed print
    Returns the Swing (or None)."""
    kit.reset()
    kit.render_settings(*sc["size"], fps=sc["fps"], samples=sc.get("samples", 16))
    kit.world_sky()
    st = sc["set"]
    if st.get("type") == "room":
        kit.living_room(**st.get("room", {}))
    else:
        kit.ground_dirt()
    for i, (x, y, h) in enumerate(st.get("trees", [])):
        kit.tree((x, y), h=h, seed=i)
    if "climbing_frame" in st:
        kit.climbing_frame(st["climbing_frame"])
    if "bench" in st:
        kit.bench(st["bench"])
    if "lamp" in st:
        kit.lamp(st["lamp"])
    res = lambda f: f if os.path.isabs(f) else os.path.join(HERE, f)
    for ph in st.get("photos", []):
        kit.framed_photo(res(ph["file"]), ph["pos"], ph.get("width", 0.8), ph.get("rot", 0.0),
                         ph.get("frame", "#2B1D14"))
    for i, po in enumerate(st.get("posters", [])):
        f = po.get("file")
        if "poster" in po:
            spec = dict(po["poster"])
            photo = res(spec.pop("photo"))
            os.makedirs(out_dir, exist_ok=True)
            f = kit.make_poster(photo, os.path.join(out_dir, f"poster_{i}.png"), **spec)
        kit.photo_plane(res(f), po["pos"], po.get("width", 0.42), po.get("rot", 0.0), po.get("tilt", 0.0))
    sw = st.get("swing")
    return kit.Swing(tuple(sw["loc"]), sw["pivot_h"], sw["length"], sw["width"]) if sw else None


def make_char(sc, name, out_dir):
    c = sc["cast"][name]
    return kit.Character(name, c["shirt"], c["pants"], scale=c.get("scale", 1.0),
                         face_kw=c.get("face"), extras=[EXTRAS[e] for e in c.get("extras", [])],
                         belly=c.get("belly", 0.0), out_dir=out_dir)


def key_faces(chars, faces, fps, n):
    for who, seq in faces.items():
        if who in chars:
            for item in seq:
                t, expr = item[0], item[1]
                gaze = tuple(item[2]) if len(item) > 2 else (0.0, 0.0)
                chars[who].face(expr, t, gaze)
            chars[who].facerig.finalize(fps, n)


def _resolve(v, actors):
    """A point is [x,y,z] or {"actor": name, "offset": [..], "mix": 0..1, "base": [..]}."""
    if isinstance(v, dict):
        a = actors[v["actor"]].rig.matrix_world.translation
        p = [a[i] + v.get("offset", [0, 0, 0])[i] for i in range(3)]
        if "base" in v:
            m = v.get("mix", 1.0)
            p = [lerp(b, q, m) for b, q in zip(v["base"], p)]
        return p
    return list(v)


def key_camera(cam_spec, n_frames, fps, actors=None, impacts=()):
    """cam_spec: {from,to} or a list of segments [{until, from, to, shake}, ...] separated by
    hard cuts. Points may track actors. Baked per frame (held through the motion-blur window
    so cuts never smear) with handheld drift ('shake') and decaying impact shakes."""
    actors = actors or {}
    segs = cam_spec if isinstance(cam_spec, list) else [dict(cam_spec, until=1e9)]
    a0 = segs[0]["from"]
    cam = kit.camera(_resolve(a0["loc"], actors), _resolve(a0["target"], actors), a0.get("lens", 24))
    sc = bpy.context.scene
    prefs = bpy.context.preferences.edit
    old = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    for f in range(1, n_frames + 2):
        t = (f - 1) / fps
        sc.frame_set(f)
        i = next((k for k, sg in enumerate(segs) if t < sg["until"]), len(segs) - 1)
        sg = segs[i]
        t0 = 0.0 if i == 0 else segs[i - 1]["until"]
        t1 = min(sg["until"], n_frames / fps)
        u = smooth((t - t0) / max(1e-6, t1 - t0))
        a, b = sg["from"], sg.get("to", sg["from"])
        la, lb = _resolve(a["loc"], actors), _resolve(b["loc"], actors)
        ta, tb = _resolve(a["target"], actors), _resolve(b["target"], actors)
        cam.location = [lerp(x, y, u) for x, y in zip(la, lb)]
        kit.look_at(cam, [lerp(x, y, u) for x, y in zip(ta, tb)])
        # handheld drift + impact shakes (degrees)
        amp = sg.get("shake", 0.0)
        for ti, ai in impacts:
            if t >= ti:
                amp += ai * math.exp(-(t - ti) * 7)
        if amp:
            r = cam.rotation_euler
            r.x += math.radians(amp * (math.sin(t * 7.1) + 0.6 * math.sin(t * 17.3 + 1.0)))
            r.z += math.radians(amp * (math.sin(t * 5.3 + 2.0) + 0.5 * math.sin(t * 13.7)))
            r.y += math.radians(0.5 * amp * math.sin(t * 9.1 + 0.5))
        cam.data.lens = lerp(a.get("lens", 24), b.get("lens", 24), u)
        for ff in (f, f + 0.6):
            cam.keyframe_insert("location", frame=ff)
            cam.keyframe_insert("rotation_euler", frame=ff)
            cam.data.keyframe_insert("lens", frame=ff)
    prefs.keyframe_new_interpolation_type = old
    return cam


# ------------------------------------------------------------------ poses
SEATED = dict(leg_l=(-88, 0, 4), leg_r=(-88, 0, -4), shin_l=(78, 0, 0), shin_r=(78, 0, 0),
              arm_l=(-155, 0, -4), arm_r=(-155, 0, 4), forearm_l=(-22, 0, 0), forearm_r=(-22, 0, 0),
              torso=(4, 0, 0), head=(0, 0, 0))


def seat_kid(kid, swing, theta, frame):
    hip = kit.S * 2 * kid.scale
    m = swing.seat_matrix(theta) @ Matrix.Translation((0, 0.05, -hip))
    kid.place(frame, matrix=m)


def push_pose(ch, frame, t, contact, extra=0.0):
    arms = -50 - 38 * contact
    elbow = -65 * (1 - contact)
    ch.pose(frame,
            arm_l=(arms, 0, 0), arm_r=(arms - 4, 0, 0),
            forearm_l=(elbow, 0, 0), forearm_r=(elbow - 5, 0, 0),
            shin_l=(10, 0, 0), shin_r=(6 + 14 * contact, 0, 0),
            torso=(-10 * contact + 1.5 * math.sin(t * 2.4), 0, 0),
            head=(-4 + 3 * math.sin(t * 1.7), 0, 3 * math.sin(t * 0.9)),
            leg_l=(6 * contact, 0, 0), leg_r=(-6 * contact, 0, 0))


# ------------------------------------------------------------------ actions
def gentle_push(shot, fps, swing, kid, parent):
    n = int(round(shot["duration"] * fps))
    A = math.radians(shot["amp_deg"])
    w = math.sqrt(G / swing.length)
    px, py = shot["parent_pos"]
    backs = [(1.5 * math.pi + 2 * math.pi * k) / w for k in range(-1, 4)]
    BUILT["pushes"] = [t for t in backs if 0 <= t <= shot["duration"]]
    kid.pose(1, **SEATED)
    parent.place(1, loc=(px, py, 0), rot=(0, 0, -14))
    for f in range(1, n + 2):
        t = (f - 1) / fps
        th = A * math.sin(w * t)
        swing.key(th, f)
        seat_kid(kid, swing, th, f)
        contact = max(math.exp(-((t - tb) / 0.28) ** 2) for tb in backs)
        push_pose(parent, f, t, contact)
        # kid kicks legs a little with the swing (pumping)
        pump = 12 * math.cos(w * t)
        kid.pose(f, leg_l=(-88 + pump, 0, 4), leg_r=(-88 + pump, 0, -4),
                 shin_l=(70 - 3 * pump, 0, 0), shin_r=(70 - 3 * pump, 0, 0))
    return n


def launch(shot, fps, swing, kid, parent):
    L = shot["launch"]
    n = int(round(shot["duration"] * fps))
    A = math.radians(shot["amp_deg"])
    w = math.sqrt(G / swing.length)
    px, py = shot["parent_pos"]
    t_shove = (1.5 * math.pi + 2 * math.pi * (L["shove_at_back_extreme"] - 1)) / w
    BUILT["t_shove"] = t_shove
    BUILT["t_windup"] = L["windup_at"]
    BUILT["t_reenter"] = L["reenter_at"]
    th_max = math.radians(L["max_deg"])
    w0 = math.sqrt(2 * G / swing.length * (math.cos(A) - math.cos(th_max)))
    rel = math.radians(L["release_deg"])
    H = kit.S * 5.2 * kid.scale
    hip = kit.S * 2 * kid.scale
    lx, ly = L["land_xy"]
    land_z = H - 0.12  # rig origin (feet) height when stuck head-first
    t_land = L["reenter_at"] + math.sqrt(2 * max(0.0, L["reenter_from_z"] - land_z) / G)
    BUILT["t_land"] = t_land

    # simulate swing after the shove (semi-implicit Euler, substeps)
    sub = 20
    dt = 1 / (fps * sub)
    th, om = -A, w0
    sim = {}
    released = None
    t = t_shove
    while t <= shot["duration"] + 0.2:
        f = int(round(t * fps)) + 1
        sim.setdefault(f, th)
        if released is None and om > 0 and th >= rel:
            released = (t, th, om)
        damp = 0.0 if released is None else 0.35
        om += (-(G / swing.length) * math.sin(th) - damp * om) * dt
        th += om * dt
        t += dt
    t_rel, th_rel, om_rel = released
    BUILT["t_release"] = t_rel
    print(f"TIMES release={t_rel:.3f} land={t_land:.3f}")
    p0 = (swing.seat_matrix(th_rel) @ Matrix.Translation((0, 0.05, -hip))).to_translation()
    v0 = Vector((0, -math.cos(th_rel), math.sin(th_rel))) * (om_rel * swing.length * L["boost"])
    rot0 = -th_rel

    parent.place(1, loc=(px, py, 0), rot=(0, 0, -14))
    kid.pose(1, **SEATED)
    for f in range(1, n + 2):
        t = (f - 1) / fps
        # ---- swing angle
        if t < t_shove:
            th = A * math.sin(w * t)
        else:
            th = sim.get(f, sim[max(sim)])
        swing.key(th, f)

        # ---- kid
        if t < t_rel:
            seat_kid(kid, swing, th, f)
            if t < t_shove:
                pump = 12 * math.cos(w * t)
                kid.pose(f, leg_l=(-88 + pump, 0, 4), leg_r=(-88 + pump, 0, -4),
                         shin_l=(70 - 3 * pump, 0, 0), shin_r=(70 - 3 * pump, 0, 0),
                         arm_l=(-155, 0, -4), arm_r=(-155, 0, 4))
            else:  # clinging on for dear life
                kid.pose(f, leg_l=(-70, 0, 14), leg_r=(-115, 0, -14),
                         shin_l=(95, 0, 0), shin_r=(20, 0, 0),
                         arm_l=(-165, 0, -8), arm_r=(-165, 0, 8), forearm_l=(-55, 0, 0), forearm_r=(-55, 0, 0))
        elif t < L["reenter_at"]:
            tau = t - t_rel
            p = p0 + v0 * tau + Vector((0, 0, -0.5 * G * tau * tau))
            if p.z > 9:
                p = Vector((p.x, p.y, 40))
            kid.place(f, loc=p, rot=(math.degrees(rot0) - 760 * tau, 0, 0))
            fl = 40 * math.sin(tau * 22)
            fl = 32 * math.sin(tau * 22)
            kid.pose(f, arm_l=(-145 + fl, 0, -40), arm_r=(-145 - fl, 0, 40),
                     forearm_l=(-40 - fl, 0, 0), forearm_r=(-40 + fl, 0, 0),
                     leg_l=(-30 - fl, 0, 25), leg_r=(-30 + fl, 0, -25),
                     shin_l=(50 + fl, 0, 0), shin_r=(50 - fl, 0, 0))
        else:
            tau = t - L["reenter_at"]
            if t < t_land:
                z = L["reenter_from_z"] - 0.5 * G * tau * tau
                spin = 180 + 200 * (t_land - t)
                kid.place(f, loc=(lx, ly, z), rot=(spin, 0, 8))
                fl = 45 * math.sin(tau * 24)
                kid.pose(f, arm_l=(-120 + fl, 0, -50), arm_r=(-120 - fl, 0, 50),
                         forearm_l=(-50 + fl, 0, 0), forearm_r=(-50 - fl, 0, 0),
                         leg_l=(-20 - fl, 0, 20), leg_r=(-20 + fl, 0, -20),
                         shin_l=(50 + fl, 0, 0), shin_r=(50 - fl, 0, 0))
            else:  # stuck head-first in the dirt, legs kicking
                tl = t - t_land
                squash = 0.05 * math.exp(-tl * 8) * math.cos(tl * 40)
                kid.place(f, loc=(lx, ly, land_z - squash), rot=(180, 0, 8))
                k = 28 * math.sin(tl * 13)
                kid.pose(f, leg_l=(k, 0, 12), leg_r=(-k, 0, -12),
                         shin_l=(45 + k * 1.4, 0, 0), shin_r=(45 - k * 1.4, 0, 0),
                         forearm_l=(-30, 0, 0), forearm_r=(-30, 0, 0),
                         arm_l=(-10, 0, -70 + 10 * math.sin(tl * 9)), arm_r=(-10, 0, 70 - 10 * math.sin(tl * 9)),
                         torso=(0, 0, 0))

        # ---- dad
        if t < L["windup_at"]:
            contact = math.exp(-((t - (t_shove - 2 * math.pi / w)) / 0.28) ** 2)
            push_pose(parent, f, t, contact)
        elif t < t_shove:
            k = ramp(t, L["windup_at"], t_shove - 0.05)
            parent.pose(f, arm_l=(lerp(-50, 35, k), 0, 0), arm_r=(lerp(-50, 35, k), 0, 0),
                        forearm_l=(lerp(-65, -100, k), 0, 0), forearm_r=(lerp(-65, -100, k), 0, 0),
                        shin_l=(lerp(10, 45, k), 0, 0), shin_r=(lerp(6, 20, k), 0, 0),
                        torso=(lerp(0, 9, k), 0, 0), head=(lerp(0, -6, k), 0, 0),
                        leg_l=(lerp(0, -14, k), 0, 0), leg_r=(lerp(0, 10, k), 0, 0))
        elif t < t_shove + 0.45:
            k = ramp(t, t_shove, t_shove + 0.12)
            parent.pose(f, arm_l=(lerp(35, -102, k), 0, 0), arm_r=(lerp(35, -102, k), 0, 0),
                        forearm_l=(lerp(-100, 0, k), 0, 0), forearm_r=(lerp(-100, 0, k), 0, 0),
                        shin_l=(lerp(45, 5, k), 0, 0), shin_r=(lerp(20, 35, k), 0, 0),
                        torso=(lerp(9, -20, k), 0, 0), head=(lerp(-6, 6, k), 0, 0),
                        leg_l=(lerp(-14, 18, k), 0, 0), leg_r=(lerp(10, -16, k), 0, 0))
        else:
            ts = t - (t_shove + 0.45)
            k = ramp(ts, 0, 0.35)
            # step aside, then pump arms in triumph
            x = lerp(px, L["step_aside_x"], ramp(ts, 0, 0.5))
            stride = 25 * math.sin(ts * 16) * (1 - ramp(ts, 0.45, 0.6))
            parent.place(f, loc=(x, py, 0.03 * abs(math.sin(ts * 16)) * (1 - ramp(ts, 0.45, 0.6))),
                         rot=(0, 0, lerp(-14, 20, k)))
            pumpa = 10 * math.sin(ts * 14) * ramp(ts, 0.3, 0.5)
            parent.pose(f, arm_l=(lerp(-102, -165, k) + pumpa, 0, lerp(0, -18, k)),
                        arm_r=(lerp(-102, -165, k) - pumpa, 0, lerp(0, 18, k)),
                        forearm_l=(lerp(0, -45, k) - 2 * pumpa, 0, 0), forearm_r=(lerp(0, -45, k) + 2 * pumpa, 0, 0),
                        shin_l=(max(0, stride) * 1.6 + 5, 0, 0), shin_r=(max(0, -stride) * 1.6 + 5, 0, 0),
                        torso=(lerp(-20, 4, k), 0, 0), head=(lerp(6, -14, k), 0, 0),
                        leg_l=(stride, 0, 0), leg_r=(-stride, 0, 0))
    return n


ACTIONS = {"gentle_push": gentle_push, "launch": launch}
BUILT = {}


def build_shot(sc, shot_id, out_dir):
    shot = next(s for s in sc["shots"] if s["id"] == shot_id)
    fps = sc["fps"]
    swing = build_set(sc, out_dir)
    kid = make_char(sc, "kid", out_dir)
    parent = make_char(sc, shot["parent"], out_dir)
    BUILT.update(kid=kid, parent=parent)
    trace = []
    _orig_key = swing.key

    def _traced_key(th, f):
        trace.append((f, th))
        _orig_key(th, f)
    swing.key = _traced_key
    n = ACTIONS[shot["action"]](shot, fps, swing, kid, parent)
    BUILT["trace"] = trace
    key_faces({"kid": kid, shot["parent"]: parent}, shot["faces"], fps, n)
    impacts = [(BUILT["t_land"], 2.2)] if BUILT.get("t_land") else []
    key_camera(shot["camera"], n, fps, {"kid": kid, "parent": parent}, impacts)
    for ch in (kid, parent):
        if ch.limit_hits:
            from collections import Counter
            c = Counter((b, ax, "max" if v > lim else "min") for (_, b, ax, v, lim) in ch.limit_hits)
            print(f"LIMITS {ch.name}: {len(ch.limit_hits)} keys clamped ->", dict(c))
            worst = sorted(ch.limit_hits, key=lambda h: -abs(h[3] - h[4]))[:3]
            for (nm, fr), b, ax, v, lim in worst:
                print(f"   frame {fr}: {b}.{ax} wanted {v} -> {lim}")
        else:
            print(f"LIMITS {ch.name}: ok")
    s = bpy.context.scene
    s.frame_start, s.frame_end = 1, n
    return n


def audit_joints(chars, n):
    """Measure every knee/elbow on every frame from the evaluated mesh (limb-local space):
    the lower end must sit BEHIND the hinge for knees and IN FRONT for elbows."""
    s = bpy.context.scene
    bad = []
    for f in range(1, n + 1):
        s.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        for ch in chars:
            for kind, lo, hi, want in (("leg", 0.0, 0.04, +1), ("arm", 2 * kit.S, 2 * kit.S + 0.04, -1)):
                for side in "lr":
                    o = bpy.data.objects.get(f"{ch.name}_{kind}_{side}")
                    if o is None:
                        continue
                    ang = ch.rig.pose.bones[("shin_" if kind == "leg" else "forearm_") + side].rotation_euler[0]
                    if abs(ang) < math.radians(8):
                        continue  # nearly straight: direction is meaningless
                    ev = o.evaluated_get(dg)
                    me = ev.to_mesh()
                    ys = [v.co.y for v, r in zip(me.vertices, o.data.vertices) if lo <= r.co.z <= hi]
                    ev.to_mesh_clear()
                    y = sum(ys) / len(ys)
                    if y * want < 0:
                        bad.append((f, o.name, round(math.degrees(ang)), round(y, 3)))
    print(f"JOINT AUDIT: {len(bad)} wrong-way bends", bad[:5])
    return bad


def main():
    args = sys.argv[1:]
    if len(args) < 2 or args[0] in ("-h", "--help"):
        print(__doc__.strip())
        print("modes: save | board F1,F2,.. (stills) | audit (joint checks) | events (timings JSON) | render")
        print("  --out DIR   output folder (default: ./out)")
        sys.exit(0 if args else 1)
    out_dir = os.path.join(os.getcwd(), "out")
    if "--out" in args:
        i = args.index("--out")
        out_dir = args[i + 1]
        del args[i:i + 2]
    scen, shot_id = args[0], args[1]
    mode = args[2] if len(args) > 2 else "save"
    os.makedirs(out_dir, exist_ok=True)
    sc = json.load(open(scen))
    n = build_shot(sc, shot_id, out_dir)
    s = bpy.context.scene
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, f"{sc['id']}_{shot_id}.blend"))
    if mode == "events":
        tr = BUILT.get("trace", [])
        ext = []
        for (f0, a0), (f1, a1), (f2, a2) in zip(tr, tr[1:], tr[2:]):
            if (a1 - a0) * (a2 - a1) < 0:
                ext.append([round((f1 - 1) / sc["fps"], 3), round(math.degrees(a1), 1)])
        fast = []
        for (f0, a0), (f1, a1) in zip(tr, tr[1:]):
            if a0 * a1 < 0:
                fast.append([round((f1 - 1) / sc["fps"], 3), round(math.degrees(abs(a1 - a0)) * sc["fps"], 1)])
        shot = next(x for x in sc["shots"] if x["id"] == shot_id)
        cam = shot["camera"]
        cuts = [c["until"] for c in cam[:-1]] if isinstance(cam, list) else []
        ev = {k: BUILT.get(k) for k in ("pushes", "t_shove", "t_windup", "t_release", "t_reenter", "t_land")}
        ev.update(extremes=ext, bottom_pass=fast, cuts=cuts, duration=shot["duration"])
        json.dump(ev, open(os.path.join(out_dir, f"events_{shot_id}.json"), "w"), indent=1)
        print("EVENTS", ev)
    elif mode == "audit":
        audit_joints([o for o in (BUILT.get("kid"), BUILT.get("parent")) if o], n)
    elif mode == "board":
        frames = [int(x) for x in args[3].split(",")]
        for f in frames:
            s.frame_set(f)
            s.render.filepath = os.path.join(out_dir, "board", f"{shot_id}_{f:03d}.png")
            bpy.ops.render.render(write_still=True)
    elif mode == "render":
        s.render.filepath = os.path.join(out_dir, shot_id, "f_")
        bpy.ops.render.render(animation=True)
    print("FRAMES", n)


if __name__ == "__main__":
    main()
