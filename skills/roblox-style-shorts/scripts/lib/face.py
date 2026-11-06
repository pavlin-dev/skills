"""Procedural animated face: flat 2D shapes on the head's front face, morphed with shape keys.

Every feature is a filled outline of N points sampled the same way (top path left->right,
bottom path right->left), so any two shapes blend smoothly into each other.
Expressions are sets of shape-key weights; transitions are eased morphs, plus automatic
blinks and small gaze shifts so the face never looks frozen.
"""
import math
import random

import bpy

N = 40  # outline points (even)


# ------------------------------------------------------------------ outline builders
def _xs(w):
    """x positions for the top path (left->right) and bottom path (right->left)."""
    h = N // 2
    top = [-w * math.cos(math.pi * i / (h - 1)) for i in range(h)]
    return top, list(reversed(top))


def outline(w, f_top, f_bot):
    top, bot = _xs(w)
    return [(x, f_top(x)) for x in top] + [(x, f_bot(x)) for x in bot]


def ellipse(w, h, cz=0.0, cx=0.0):
    t = lambda x: cz + h * math.sqrt(max(0.0, 1 - (x / w) ** 2))
    b = lambda x: cz - h * math.sqrt(max(0.0, 1 - (x / w) ** 2))
    return [(x + cx, z) for x, z in outline(w, t, b)]


def band(w, center, thick):
    """A curved stroke: centre line center(x), thickness tapering to the ends."""
    def th(x):
        return 0.0025 + thick * math.sqrt(max(0.0, 1 - (x / w) ** 2))
    return outline(w, lambda x: center(x) + th(x) / 2, lambda x: center(x) - th(x) / 2)


def arc_eye(w, h, thick, up=True):
    s = 1 if up else -1
    return band(w, lambda x: s * h * (1 - (x / w) ** 2) - s * h * 0.5, thick)


# ------------------------------------------------------------------ feature shapes
def eye_shapes(r):
    w, h = 0.70 * r, 1.0 * r
    return {
        "basis": ellipse(w, h),                        # dot eye
        "closed": arc_eye(1.25 * w, 0.55 * h, 0.22 * h, up=True),   # ^  happy closed
        "sleep": arc_eye(1.2 * w, 0.4 * h, 0.2 * h, up=False),      # u  sleepy
        "blink": band(1.1 * w, lambda x: -0.15 * h, 0.15 * h),      # flat lid line
        "pupil": ellipse(0.42 * w, 0.42 * w * 1.05),   # small pupil for wide eyes
        "half": outline(w * 1.05, lambda x: 0.12 * h, lambda x: -h * math.sqrt(max(0, 1 - (x / (w * 1.05)) ** 2))),  # heavy lid
        "wide": ellipse(w * 1.15, h * 1.15),
    }


def sclera_shapes(r):
    return {"basis": ellipse(0.002, 0.002), "big": ellipse(1.15 * r, 1.25 * r)}


def highlight_shapes(r):
    c = (-0.28 * r, 0.45 * r)
    return {"basis": [(x + c[0], z + c[1]) for x, z in ellipse(0.24 * r, 0.26 * r)],
            "hide": [(c[0], c[1] - 0.2 * r) for _ in range(N)]}


def mouth_shapes(w):
    d = lambda x: max(0.0, 1 - (x / w) ** 2)
    return {
        "basis": band(w * 0.7, lambda x: 0.0, 0.006),                                   # flat
        "smile": band(w, lambda x: -0.022 * d(x) + 0.008, 0.008),
        "open": outline(w, lambda x: 0.004 + 0.008 * (x / w) ** 2, lambda x: 0.004 - 0.05 * d(x) ** 0.75),
        "oh": ellipse(0.38 * w, 0.42 * w, cz=-0.012),
        "smirk": band(w * 0.9, lambda x: -0.012 * d(x) + 0.012 * (x / w) + 0.006, 0.007),
        "grin": outline(w * 1.1, lambda x: 0.008 + 0.006 * (x / w) ** 2,
                        lambda x: 0.008 - 0.036 * max(0.0, 1 - (x / (1.1 * w)) ** 2) ** 0.6),
        "frown": band(w * 0.85, lambda x: 0.016 * d(x) - 0.012, 0.007),
        "wobble": band(w * 0.9, lambda x: 0.005 * math.sin(3 * math.pi * x / w), 0.006),
    }


def brow_shapes(w, side):
    s = 1 if side > 0 else -1  # +x brow: inner end is at smaller x
    rect = lambda: band(w, lambda x: 0.0, 0.010)
    def tilt(slope, lift, arch=0.0):
        return [(x, z + lift + slope * s * x - arch * (x / w) ** 2) for x, z in rect()]
    return {
        "basis": [(0.0, -0.01) for _ in range(N)],    # hidden (collapsed)
        "flat": tilt(0, 0),
        "angry": tilt(0.45, -0.006),
        "up": tilt(0, 0.016, arch=0.006),
        "worried": tilt(-0.38, 0.010),
    }


def mustache_shapes(w):
    def shape(lift):
        top = lambda x: lift + 0.017 * max(0.0, 1 - (x / w) ** 2) ** 0.5 - 0.007 * math.exp(-(x / 0.010) ** 2)
        bot = lambda x: lift - 0.004 - 0.012 * (x / w) ** 2 + 0.003 * math.exp(-(x / 0.010) ** 2)
        return outline(w, top, bot)
    return {"basis": shape(0.0), "lift": shape(0.008)}


# ------------------------------------------------------------------ expressions
# per feature: {shape_key: weight}; brows/sclera omitted = hidden
EXPR = {
    "neutral": dict(eye={}, mouth={}, brow={}),
    "happy":   dict(eye={}, mouth={"smile": 1}, brow={}),
    "laugh":   dict(eye={"closed": 1}, mouth={"open": 1}, brow={}, stache={"lift": 1}),
    "shocked": dict(eye={"pupil": 1}, sclera={"big": 1}, mouth={"oh": 1}, brow={"up": 1}),
    "scared":  dict(eye={"pupil": 1}, sclera={"big": 1}, mouth={"wobble": 1}, brow={"worried": 1}),
    "smug":    dict(eye={"half": 1}, mouth={"smirk": 1}, brow={"angry": 1}, stache={"lift": 0.4}),
    "proud":   dict(eye={"closed": 1}, mouth={"grin": 1}, brow={"angry": 0.7}, stache={"lift": 1}),
    "sleep":   dict(eye={"sleep": 1}, mouth={"oh": 0.35}, brow={}),
    "sad":     dict(eye={}, mouth={"frown": 1}, brow={"worried": 1}),
}
CLOSED_EYES = {"closed", "sleep"}


class FaceRig:
    def __init__(self, ch, head_bone="head", mustache=False, blush=False, lashes=False, seed=0):
        from kit import S, mat, hexcol  # noqa
        self.ch = ch
        self.events = []
        self.rnd = random.Random(seed)
        hs = 1.2 * S
        self.cz = 4.62 * S
        self.y = -hs / 2
        ink = mat("face_ink", "#1B1515", rough=0.35)
        white = mat("face_white", "#FBFBF8", rough=0.3)
        mouth_m = mat("face_mouth", "#6E1A24", rough=0.5)
        self.feat = {}
        r = 0.026
        ex, ez = 0.058, self.cz + 0.022
        for side in (1, -1):
            k = "l" if side > 0 else "r"
            self.feat["sclera_" + k] = self._shape(f"sclera_{k}", sclera_shapes(r), (side * ex, ez), 0.0010, white)
            self.feat["eye_" + k] = self._shape(f"eye_{k}", eye_shapes(r), (side * ex, ez), 0.0016, ink, gaze=True)
            self.feat["hl_" + k] = self._shape(f"hl_{k}", highlight_shapes(r), (side * ex, ez), 0.0022, white, gaze=True)
            self.feat["brow_" + k] = self._shape(f"brow_{k}", brow_shapes(0.032, side), (side * ex, ez + 0.052), 0.0012, ink)
            if lashes:
                lash = [(x, z) for x, z in band(0.012, lambda x: 0.0, 0.004)]
                lash = [(x * 0.7 + side * 0.026, z + 0.024 + side * x * 0.9) for x, z in lash]
                self._shape(f"lash_{k}", {"basis": lash}, (side * ex, ez), 0.0016, ink)
        self.feat["mouth"] = self._shape("mouth", mouth_shapes(0.042), (0.0, self.cz - 0.075), 0.0012, mouth_m)
        if mustache:
            self.feat["stache"] = self._shape("stache", mustache_shapes(0.058), (0.0, self.cz - 0.048), 0.0026, ink)
        self.state = {}

    # build helpers
    def _shape(self, name, shapes, center, depth, material, gaze=False):
        import bmesh
        cx, cz = center
        me = bpy.data.meshes.new(f"{self.ch.name}_{name}")
        bm = bmesh.new()
        basis = shapes["basis"]
        c = bm.verts.new((cx + sum(p[0] for p in basis) / len(basis), self.y - depth, cz + sum(p[1] for p in basis) / len(basis)))
        ring = [bm.verts.new((cx + x, self.y - depth, cz + z)) for x, z in basis]
        n = len(ring)
        for i in range(n):
            bm.faces.new((c, ring[(i + 1) % n], ring[i]))
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(me.name, me)
        bpy.context.collection.objects.link(o)
        me.materials.append(material)
        o.shape_key_add(name="Basis")
        for key, pts in shapes.items():
            if key == "basis":
                continue
            kb = o.shape_key_add(name=key, from_mix=False)
            mx, mz = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
            kb.data[0].co = (cx + mx, self.y - depth, cz + mz)
            for i, (x, z) in enumerate(pts):
                kb.data[i + 1].co = (cx + x, self.y - depth, cz + z)
        if gaze:
            for key, (dx, dz) in (("gaze_x", (0.012, 0)), ("gaze_z", (0, 0.010))):
                kb = o.shape_key_add(name=key, from_mix=False)
                for i, v in enumerate(me.vertices):
                    kb.data[i].co = (v.co.x + dx, v.co.y, v.co.z + dz)
        o.data.shape_keys.use_relative = True
        self.ch._bind(o, "head")
        return o

    def _blush(self, center):
        m = bpy.data.materials.get("face_blush")
        if m is None:
            m = bpy.data.materials.new("face_blush")
            m.use_nodes = True
            nt = m.node_tree
            b = nt.nodes["Principled BSDF"]
            b.inputs["Base Color"].default_value = (0.95, 0.42, 0.42, 1)
            g = nt.nodes.new("ShaderNodeTexGradient")
            g.gradient_type = "SPHERICAL"
            tc = nt.nodes.new("ShaderNodeTexCoord")
            mp = nt.nodes.new("ShaderNodeMapping")
            mp.inputs["Scale"].default_value = (2.0, 2.0, 2.0)
            mp.inputs["Location"].default_value = (0.0, 0.0, 0.0)
            nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
            sub = nt.nodes.new("ShaderNodeVectorMath")
            sub.operation = "SUBTRACT"
            sub.inputs[1].default_value = (1.0, 1.0, 0.0)
            nt.links.new(mp.outputs["Vector"], sub.inputs[0])
            nt.links.new(sub.outputs[0], g.inputs["Vector"])
            mul = nt.nodes.new("ShaderNodeMath")
            mul.operation = "MULTIPLY"
            mul.inputs[1].default_value = 0.45
            nt.links.new(g.outputs["Fac"], mul.inputs[0])
            nt.links.new(mul.outputs[0], b.inputs["Alpha"])
        bpy.ops.mesh.primitive_plane_add(size=1, location=(center[0], self.y - 0.0008, center[1]), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.object
        o.scale = (0.05, 0.03, 1)
        o.data.materials.append(m)
        self.ch._bind(o, "head")

    # animation
    def set(self, expr, t, gaze=(0.0, 0.0)):
        self.events.append((t, expr, gaze))

    def _weights(self, expr, gaze):
        e = EXPR[expr]
        w = {}
        for k in ("l", "r"):
            for f, keys in (("eye_", e.get("eye", {})), ("sclera_", e.get("sclera", {})), ("brow_", e.get("brow", {}))):
                obj = self.feat[f + k]
                for kb in obj.data.shape_keys.key_blocks[1:]:
                    if kb.name.startswith("gaze"):
                        continue
                    w[(obj.name, kb.name)] = keys.get(kb.name, 0.0)
            closed = any(e.get("eye", {}).get(c, 0) > 0.5 for c in CLOSED_EYES)
            hl = self.feat["hl_" + k]
            w[(hl.name, "hide")] = 1.0 if closed else 0.0
            for f in ("eye_", "hl_"):
                o = self.feat[f + k]
                w[(o.name, "gaze_x")] = gaze[0]
                w[(o.name, "gaze_z")] = gaze[1]
        m = self.feat["mouth"]
        for kb in m.data.shape_keys.key_blocks[1:]:
            w[(m.name, kb.name)] = e.get("mouth", {}).get(kb.name, 0.0)
        if "stache" in self.feat:
            s = self.feat["stache"]
            w[(s.name, "lift")] = e.get("stache", {}).get("lift", 0.0)
        return w

    def finalize(self, fps, n_frames, morph=0.2, blink_every=(1.8, 3.6)):
        objs = {o.name: o for o in self.feat.values()}
        ev = sorted(self.events)
        if not ev:
            return
        keys = {}  # (obj, key) -> list of (frame, value)
        prev = None
        for t, expr, gaze in ev:
            w = self._weights(expr, gaze)
            f1 = 1 + t * fps
            for k, v in w.items():
                lst = keys.setdefault(k, [])
                if prev is None:
                    lst.append((1, v))
                else:
                    lst.append((f1, prev.get(k, 0.0)))
                    lst.append((f1 + morph * fps, v))
            prev = w
        # automatic blinks (only on open, dot-style eyes) + idle gaze drift
        t = self.rnd.uniform(0.6, 1.6)
        blinks = []
        while t < n_frames / fps:
            cur = [e for e in ev if e[0] <= t]
            expr = cur[-1][1] if cur else ev[0][1]
            eye = EXPR[expr].get("eye", {})
            near_change = any(abs(t - e[0]) < 0.35 for e in ev)
            if not eye and not near_change:
                blinks.append(t)
            t += self.rnd.uniform(*blink_every)
        for k in ("l", "r"):
            eye = self.feat["eye_" + k]
            hl = self.feat["hl_" + k]
            lst = keys.setdefault((eye.name, "blink"), [])
            hls = keys.setdefault((hl.name, "hide"), [])
            for tb in blinks:
                f = 1 + tb * fps
                for df, v in ((-0.01, 0.0), (1.0, 1.0), (2.2, 0.0)):
                    lst.append((f + df, v))
                for df, v in ((-0.01, 0.0), (1.0, 1.0), (2.2, 0.0)):
                    hls.append((f + df, v))
        # write keyframes (blink keys are additive with the expression keys of the same block)
        for (oname, kname), lst in keys.items():
            kb = objs[oname].data.shape_keys.key_blocks[kname]
            seen = {}
            for f, v in sorted(lst):
                seen[round(f, 3)] = v
            for f, v in sorted(seen.items()):
                kb.value = max(0.0, min(1.0, v))
                kb.keyframe_insert("value", frame=f)
