"""Reusable Blender building blocks: materials, blocky characters, environment, props.

Units are metres. Characters face -Y, stand on their origin (feet centre).
"""
import math
import os
import bpy
from mathutils import Matrix, Vector, Euler


S = 0.3  # one "stud" in metres


# ---------------------------------------------------------------- utils
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def hexcol(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]  # sRGB -> linear
    return (*c, a)


_mats = {}


def mat(name, color, rough=0.55, spec=0.3, sheen=0.0):
    key = (name, color)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(color) if isinstance(color, str) else color
    b.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = spec
    _mats[key] = m
    return m


def box(name, size, loc, material, bevel=0.035, segs=3, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new("bev", "BEVEL")
        m.width = bevel
        m.segments = segs
        m.limit_method = "NONE"
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def cyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    return o


def sphere(name, r, loc, material, scale=(1, 1, 1), sub=3):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=loc, subdivisions=sub)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    return o


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


# ---------------------------------------------------------------- character
SKIN = "#F5C91E"  # classic toy-figure yellow

BONES = {
    #  name      head (pivot)                 tail                         parent
    "root":   ((0, 0, 2 * S),               (0, 0, 2.3 * S),             None),
    "torso":  ((0, 0, 2 * S),               (0, 0, 4 * S),               "root"),
    "head":   ((0, 0, 4 * S),               (0, 0, 5.2 * S),             "torso"),
    "arm_l":  ((1.5 * S, 0, 3.5 * S),       (1.5 * S, 0, 3.9 * S),       "torso"),
    "arm_r":  ((-1.5 * S, 0, 3.5 * S),      (-1.5 * S, 0, 3.9 * S),      "torso"),
    "leg_l":  ((0.5 * S, 0, 2 * S),         (0.5 * S, 0, 2.3 * S),       "root"),
    "leg_r":  ((-0.5 * S, 0, 2 * S),        (-0.5 * S, 0, 2.3 * S),      "root"),
    # lower limb segments: in bendy mode their X rotation drives the joint bend
    "forearm_l": ((1.5 * S, 0, 2.85 * S),   (1.5 * S, 0, 3.15 * S),      "arm_l"),
    "forearm_r": ((-1.5 * S, 0, 2.85 * S),  (-1.5 * S, 0, 3.15 * S),     "arm_r"),
    "shin_l":    ((0.5 * S, 0, 1.0 * S),    (0.5 * S, 0, 1.3 * S),       "leg_l"),
    "shin_r":    ((-0.5 * S, 0, 1.0 * S),   (-0.5 * S, 0, 1.3 * S),      "leg_r"),
}

ELBOW_Z, KNEE_Z = 2.85 * S, 1.0 * S
BEND_RADIUS = 0.4   # outer arc radius as a fraction of limb depth
BEND_BAND = 0.12    # rest length of the bend ring band as a fraction of limb depth


def limb_mesh(name, hx, hy, z0, z1, x, joint_z, mats, split_z=None, r=0.04, levels=24, band=0.03):
    """A rounded-box limb from z0 to z1 with a dense ring band just below joint_z
    (the band becomes the outer arc when the joint bends). Faces above split_z get material 1."""
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    prof = []
    seg, flat = 4, 6
    corners = ((hx - r, hy - r, 0), (-hx + r, hy - r, 90), (-hx + r, -hy + r, 180), (hx - r, -hy + r, 270))
    for k, (cx, cy, a0) in enumerate(corners):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            prof.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        nx, ny, _ = corners[(k + 1) % 4]
        a = math.radians(a0 + 90)
        p0 = (cx + r * math.cos(a), cy + r * math.sin(a))
        p1 = (nx + r * math.cos(a), ny + r * math.sin(a))
        for i in range(1, flat):
            prof.append((p0[0] + (p1[0] - p0[0]) * i / flat, p0[1] + (p1[1] - p0[1]) * i / flat))
    zs = []
    cap = [(0.0, 0.55), (0.25, 0.86), (0.6, 0.97), (1.0, 1.0)]
    for f, sc in cap:
        zs.append((z0 + r * f, sc))
    body = {round(z0 + r + (z1 - z0 - 2 * r) * i / levels, 5) for i in range(1, levels)}
    body |= {round(joint_z - band * i / 16, 6) for i in range(0, 17)}
    body = sorted(z for z in body if z0 + r < z < z1 - r)
    # drop uniform rings that crowd the band edges
    body = [z for z in body if not (0 < abs(z - joint_z) < 0.008 or 0 < abs(z - (joint_z - band)) < 0.008)
            or any(abs(z - (joint_z - band * i / 16)) < 1e-6 for i in range(17))]
    for z in body:
        zs.append((z, 1.0))
    for f, sc in reversed(cap):
        zs.append((z1 - r * f, sc))
    rings = [[bm.verts.new((x + px * sc, py * sc, z)) for px, py in prof] for z, sc in zs]
    n = len(prof)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bot = bm.verts.new((x, 0, z0))
    top = bm.verts.new((x, 0, z1))
    for i in range(n):
        bm.faces.new((rings[0][(i + 1) % n], rings[0][i], bot))
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % n], top))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
        if split_z is not None and f.calc_center_median().z > split_z:
            f.material_index = 1
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    for m in mats:
        me.materials.append(m)
    return o


_bend_group = None


def bend_group():
    """Geometry-nodes joint bend (object-local space, rotation about local X).

    Inputs: Angle (rad, from the lower bone), Center (arc centre: hinge height, at BEND_RADIUS
    depth from the OUTER face), Band (rest band length), Narrow (lower part slimming so the
    overlapping side faces never z-fight).
      above the hinge (dz >= 0): untouched -> upper segment stays straight
      band (-band < dz < 0):     flattened onto the hinge plane, rotated by Angle*t -> exact arc
      below the band:            shifted up by the band and rotated by Angle -> rigid lower segment
    Inside of the bend: the two rigid segments simply intersect -> clean sharp inner corner.
    For small angles the band un-flattens so the straight limb keeps its length and no degenerate faces.
    """
    if "JointBend" in bpy.data.node_groups:
        return bpy.data.node_groups["JointBend"]
    ng = bpy.data.node_groups.new("JointBend", "GeometryNodeTree")
    it = ng.interface
    it.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    it.new_socket("Angle", in_out="INPUT", socket_type="NodeSocketFloat")
    it.new_socket("Center", in_out="INPUT", socket_type="NodeSocketVector")
    it.new_socket("Band", in_out="INPUT", socket_type="NodeSocketFloat")
    it.new_socket("Narrow", in_out="INPUT", socket_type="NodeSocketFloat")
    it.new_socket("InnerSign", in_out="INPUT", socket_type="NodeSocketFloat")
    it.new_socket("Depth", in_out="INPUT", socket_type="NodeSocketFloat")
    it.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")

    def math_(op, a, b=None, clamp=False):
        m = N.new("ShaderNodeMath")
        m.operation = op
        m.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                m.inputs[i].default_value = v
            else:
                L.new(v, m.inputs[i])
        return m.outputs[0]

    pos = N.new("GeometryNodeInputPosition")
    sub = N.new("ShaderNodeVectorMath")
    sub.operation = "SUBTRACT"
    L.new(pos.outputs[0], sub.inputs[0])
    L.new(gi.outputs["Center"], sub.inputs[1])
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(sub.outputs[0], sep.inputs[0])
    dx, dy, dz = sep.outputs["X"], sep.outputs["Y"], sep.outputs["Z"]
    band = gi.outputs["Band"]
    ang = gi.outputs["Angle"]
    # t: 0 at/above hinge -> 1 at the bottom of the band
    t = math_("DIVIDE", math_("MULTIPLY", dz, -1.0), band, clamp=True)
    # k: 1 when straight, 0 once bent past ~20 deg (band fully flattened)
    k = math_("SUBTRACT", 1.0, math_("DIVIDE", math_("ABSOLUTE", ang), 0.06), clamp=True)
    zneg = math_("MINIMUM", dz, 0.0)
    zpos = math_("MAXIMUM", dz, 0.0)
    a_ = math_("MULTIPLY", zneg, k)
    b_ = math_("ADD", zneg, math_("MULTIPLY", band, math_("SUBTRACT", 1.0, k)))
    zz = math_("ADD", zpos, math_("MINIMUM", a_, b_))
    # side-face separation so overlapping hidden surfaces never sit in one plane:
    #   everything below the hinge is a hair narrower than the upper segment, and the hidden
    #   inner half of the bend fan is pulled further inward (peaks mid-fan)
    below = math_("LESS_THAN", dz, 0.0)
    win = math_("DIVIDE", math_("MULTIPLY", dy, gi.outputs["InnerSign"]),
                math_("MULTIPLY", gi.outputs["Depth"], 0.25), clamp=True)
    bump = math_("MULTIPLY", math_("MULTIPLY", win, 0.05), math_("SINE", math_("MULTIPLY", t, math.pi)))
    # only needed once segments overlap (bent): a straight limb gets no step/dent at the knee line
    bent = math_("SUBTRACT", 1.0, k)
    sep_ = math_("MULTIPLY", math_("ADD", math_("MULTIPLY", gi.outputs["Narrow"], below), bump), bent)
    xs = math_("SUBTRACT", 1.0, sep_)
    xx = math_("MULTIPLY", dx, xs)
    comb = N.new("ShaderNodeCombineXYZ")
    L.new(xx, comb.inputs[0])
    L.new(dy, comb.inputs[1])
    L.new(zz, comb.inputs[2])
    add = N.new("ShaderNodeVectorMath")
    add.operation = "ADD"
    L.new(comb.outputs[0], add.inputs[0])
    L.new(gi.outputs["Center"], add.inputs[1])
    rot = N.new("ShaderNodeVectorRotate")
    rot.rotation_type = "X_AXIS"
    # NOTE: no invert; verified by measurement: +X bends the knee back, -X folds the elbow forward
    # (audit_joints() in build.py checks this on every frame)
    L.new(add.outputs[0], rot.inputs["Vector"])
    L.new(gi.outputs["Center"], rot.inputs["Center"])
    L.new(math_("MULTIPLY", ang, t), rot.inputs["Angle"])
    setp = N.new("GeometryNodeSetPosition")
    L.new(gi.outputs["Geometry"], setp.inputs["Geometry"])
    L.new(rot.outputs[0], setp.inputs["Position"])
    # after deforming: split normals across folded/hidden creases so the inverted inner fan
    # never averages into the visible faces' smooth normals (no black specks)
    ea = N.new("GeometryNodeInputMeshEdgeAngle")
    cmp = N.new("FunctionNodeCompare")
    cmp.data_type = "FLOAT"
    cmp.operation = "GREATER_THAN"
    L.new(ea.outputs["Unsigned Angle"], cmp.inputs[0])
    cmp.inputs[1].default_value = math.radians(50)
    ss = N.new("GeometryNodeSetShadeSmooth")
    ss.domain = "EDGE"
    L.new(setp.outputs[0], ss.inputs["Geometry"])
    L.new(cmp.outputs[0], ss.inputs["Selection"])
    ss.inputs["Shade Smooth"].default_value = False
    L.new(ss.outputs[0], go.inputs[0])
    return ng


def add_bend(obj, rig, bone, center, band, inner_sign, depth, narrow=0.004):
    ng = bend_group()
    mod = obj.modifiers.new("bend", "NODES")
    mod.node_group = ng
    ids = {i.name: i.identifier for i in ng.interface.items_tree if getattr(i, "in_out", "") == "INPUT"}
    ins = mod.properties.inputs  # Blender 5.x modifier input API
    getattr(ins, ids["Center"]).value = center
    getattr(ins, ids["Band"]).value = band
    getattr(ins, ids["Narrow"]).value = narrow
    getattr(ins, ids["InnerSign"]).value = inner_sign
    getattr(ins, ids["Depth"]).value = depth
    fc = obj.driver_add(f'modifiers["bend"].properties.inputs.{ids["Angle"]}.value')
    drv = fc.driver
    drv.type = "SUM"
    var = drv.variables.new()
    var.type = "SINGLE_PROP"
    var.targets[0].id_type = "OBJECT"
    var.targets[0].id = rig
    var.targets[0].data_path = f'pose.bones["{bone}"].rotation_euler[0]'
    return mod


# Physical joint ranges in degrees, per Euler axis (X, Y, Z) of the pose bone.
# Axis convention (every bone points +Z, zero roll):
#   X < 0  swings a limb / bends the torso or head FORWARD (toward -Y, where the character faces)
#   Y      twists about the bone's own length
#   Z > 0  moves the lower end of the bone toward +X (outward for left-side limbs)
# Elbows and knees are 1-DOF hinges: elbows only fold forward, knees only fold backward.
JOINT_LIMITS = {
    "forearm": ((-150, 0), (0, 0), (0, 0)),     # elbow: forward flexion only, no hyperextension
    "shin":    ((0, 150), (0, 0), (0, 0)),      # knee: backward flexion only
    "arm":     ((-185, 60), (-90, 90), (-120, 120)),
    "leg_l":   ((-125, 40), (-40, 40), (-20, 50)),
    "leg_r":   ((-125, 40), (-40, 40), (-50, 20)),
    "torso":   ((-45, 25), (-30, 30), (-35, 35)),
    "head":    ((-45, 40), (-75, 75), (-35, 35)),   # Y = turn left/right, Z = sideways tilt
}


def clamp_pose(bone, rot, hits=None, ctx=None):
    key = next((k for k in ("forearm", "shin", "leg_l", "leg_r", "arm", "torso", "head") if bone.startswith(k)), None)
    if key is None:
        return list(rot)
    out = []
    for axis, (v, (lo, hi)) in enumerate(zip(rot, JOINT_LIMITS[key])):
        c = min(hi, max(lo, v))
        if hits is not None and abs(c - v) > 0.5:
            hits.append((ctx, bone, "XYZ"[axis], round(v, 1), c))
        out.append(c)
    return out


class Character:
    """Blocky rigid-part character on an armature.

    All bones point +Z with zero roll, so pose rotation X tilts limbs forward/back
    (negative X = limb swings toward -Y = forward), Z twists, Y rolls sideways.
    """

    def __init__(self, name, shirt, pants, scale=1.0, face_kw=None, extras=None, belly=0.0, out_dir=None,
                 bendy=True):
        self.limit_hits = []
        self.name = name
        arm_data = bpy.data.armatures.new(name + "_rig")
        self.rig = bpy.data.objects.new(name, arm_data)
        bpy.context.collection.objects.link(self.rig)
        bpy.context.view_layer.objects.active = self.rig
        bpy.ops.object.mode_set(mode="EDIT")
        eb = {}
        for bn, (h, t, p) in BONES.items():
            b = arm_data.edit_bones.new(bn)
            b.head, b.tail, b.roll = h, t, 0
            if p:
                b.parent = eb[p]
            eb[bn] = b
        bpy.ops.object.mode_set(mode="OBJECT")

        skin = mat("skin", SKIN, rough=0.45)
        shirt_m = mat(name + "_shirt", shirt)
        pants_m = mat(name + "_pants", pants)
        self.bendy = bendy
        parts = [
            ("torso", (2 * S + belly, 1 * S + belly, 2 * S), (0, 0, 3 * S), shirt_m),
            ("head", (1.2 * S, 1.2 * S, 1.2 * S), (0, 0, 4.62 * S), skin),
        ]
        if not bendy:
            parts += [
                ("arm_l", (0.95 * S, 0.95 * S, 2 * S), (1.5 * S + belly / 2, 0, 3 * S), skin),
                ("arm_r", (0.95 * S, 0.95 * S, 2 * S), (-1.5 * S - belly / 2, 0, 3 * S), skin),
                ("leg_l", (0.98 * S, 0.98 * S, 2 * S), (0.5 * S, 0, 1 * S), pants_m),
                ("leg_r", (0.98 * S, 0.98 * S, 2 * S), (-0.5 * S, 0, 1 * S), pants_m),
            ]
        self.parts = {}
        for bn, size, loc, m in parts:
            o = box(f"{name}_{bn}", size, loc, m, bevel=0.06 if bn == "head" else 0.035, segs=4)
            self._bind(o, bn)
            self.parts[bn] = o
        if bendy:
            for side, sx in (("l", 1), ("r", -1)):
                ax = sx * (1.5 * S + belly / 2)
                for kind, hx, hy, z0, z1, xx, jz, upper, lower, mats, split, outer in (
                        ("arm", 0.475 * S, 0.475 * S, 2 * S, 4 * S, ax, ELBOW_Z, "arm_", "forearm_",
                         [skin, shirt_m], 3.3 * S, +1),   # elbow: outside of the bend faces +Y (back)
                        ("leg", 0.49 * S, 0.49 * S, 0, 2 * S, sx * 0.5 * S, KNEE_Z, "leg_", "shin_",
                         [pants_m], None, -1)):           # knee: outside of the bend faces -Y (front)
                    depth = 2 * hy
                    band = BEND_BAND * depth
                    o = limb_mesh(f"{name}_{kind}_{side}", hx, hy, z0, z1, xx, jz, mats, split_z=split, band=band)
                    self._bind(o, upper + side)
                    center = (xx, outer * (hy - BEND_RADIUS * depth), jz)
                    add_bend(o, self.rig, lower + side, center, band, -outer, depth)
        else:
            # sleeves: short shirt-coloured caps on rigid arms
            for side, x in (("l", 1), ("r", -1)):
                o = box(f"{name}_sleeve_{side}", (1.0 * S, 1.0 * S, 0.7 * S), (x * (1.5 * S + belly / 2), 0, 3.65 * S), shirt_m)
                self._bind(o, "arm_" + side)

        # animated face (see face.py)
        import face as face_mod
        self.facerig = face_mod.FaceRig(self, seed=sum(map(ord, name)), **(face_kw or {}))
        for fn in extras or []:
            fn(self)

        # pose-bone setup
        for pb in self.rig.pose.bones:
            pb.rotation_mode = "XYZ"
        self.rig.scale = (scale,) * 3
        self.scale = scale

    def _bind(self, o, bone):
        mw = o.matrix_world.copy()
        o.parent = self.rig
        o.parent_type = "BONE"
        o.parent_bone = bone
        bpy.context.view_layer.update()
        o.matrix_world = mw

    # ---- animation helpers
    def face(self, expr, t, gaze=(0.0, 0.0)):
        """Queue an expression change at time t (seconds); FaceRig.finalize() bakes eased morphs."""
        self.facerig.set(expr, t, gaze)

    def pose(self, frame, **rots):
        """rots: bone=(x,y,z) degrees."""
        for bn, r in rots.items():
            r = clamp_pose(bn, r, self.limit_hits, (self.name, frame))
            pb = self.rig.pose.bones[bn]
            pb.rotation_euler = [math.radians(a) for a in r]
            pb.keyframe_insert("rotation_euler", frame=frame)

    def place(self, frame, loc=None, rot=None, matrix=None):
        if matrix is not None:
            loc_, rot_, _ = matrix.decompose()
            self.rig.location = loc_
            self.rig.rotation_euler = rot_.to_euler("XYZ", self.rig.rotation_euler)
        else:
            if loc is not None:
                self.rig.location = loc
            if rot is not None:
                self.rig.rotation_euler = [math.radians(a) for a in rot]
        self.rig.keyframe_insert("location", frame=frame)
        self.rig.keyframe_insert("rotation_euler", frame=frame)

    def hide(self, hidden, frame):
        for o in [self.rig] + list(self.rig.children):
            o.hide_render = hidden
            o.keyframe_insert("hide_render", frame=frame)


# ---- extras (accessories)
def mom_hair(ch):
    hair = mat("hair_brown", "#6B3A1E", rough=0.7)
    hs = 1.2 * S
    cap = box(ch.name + "_hair", (hs + 0.03, hs + 0.03, 0.42 * hs), (0, 0.012, 4.62 * S + hs * 0.33), hair, bevel=0.06, segs=4)
    back = box(ch.name + "_hairback", (hs + 0.03, 0.25 * hs, hs * 0.95), (0, hs / 2 - 0.02, 4.62 * S - 0.02), hair, bevel=0.04)
    bun = sphere(ch.name + "_bun", 0.12, (0, 0.04, 4.62 * S + hs * 0.62 + 0.08), hair, scale=(1, 1, 0.85))
    for o in (cap, back, bun):
        ch._bind(o, "head")


def dad_cap(ch):
    pass  # placeholder for future accessories


def kid_hair(ch):
    hair = mat("hair_dark", "#3B2A20", rough=0.7)
    hs = 1.2 * S
    cap = box(ch.name + "_hair", (hs + 0.02, hs + 0.02, 0.22 * hs), (0, 0.02, 4.62 * S + hs * 0.44), hair, bevel=0.05, segs=4)
    ch._bind(cap, "head")


# ---------------------------------------------------------------- environment
def world_sky(sun_elev=48, sun_rot=135, cloud_cover=0.46):
    """Gradient sky + procedural cumulus seen by camera; physical sky for lighting."""
    w = bpy.data.worlds.new("Sky")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    # vertical gradient
    grad = nt.nodes.new("ShaderNodeValToRGB")
    grad.color_ramp.elements[0].position = 0.0
    grad.color_ramp.elements[0].color = hexcol("#CFE4F7")
    grad.color_ramp.elements[1].position = 0.55
    grad.color_ramp.elements[1].color = hexcol("#3F86D6")
    nt.links.new(sep.outputs["Z"], grad.inputs["Fac"])
    # clouds: noise on direction, stretched horizontally, only above horizon
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, 2.6)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.2
    noise.inputs["Detail"].default_value = 8
    noise.inputs["Roughness"].default_value = 0.62
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = cloud_cover
    cr.color_ramp.elements[0].color = (0, 0, 0, 1)
    cr.color_ramp.elements[1].position = cloud_cover + 0.12
    cr.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(noise.outputs["Fac"], cr.inputs["Fac"])
    horizon = nt.nodes.new("ShaderNodeMapRange")
    horizon.inputs["From Min"].default_value = 0.02
    horizon.inputs["From Max"].default_value = 0.12
    nt.links.new(sep.outputs["Z"], horizon.inputs["Value"])
    mask = nt.nodes.new("ShaderNodeMath")
    mask.operation = "MULTIPLY"
    nt.links.new(cr.outputs["Color"], mask.inputs[0])
    nt.links.new(horizon.outputs["Result"], mask.inputs[1])
    # cloud shading: brighter top, grey underside via second noise
    cshade = nt.nodes.new("ShaderNodeValToRGB")
    cshade.color_ramp.elements[0].color = hexcol("#AEB7C4")
    cshade.color_ramp.elements[1].color = hexcol("#FFFFFF")
    nt.links.new(noise.outputs["Fac"], cshade.inputs["Fac"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    nt.links.new(mask.outputs[0], mix.inputs["Factor"])
    nt.links.new(grad.outputs["Color"], mix.inputs["A"])
    nt.links.new(cshade.outputs["Color"], mix.inputs["B"])
    bg_cam = nt.nodes.new("ShaderNodeBackground")
    bg_cam.inputs["Strength"].default_value = 1.0
    nt.links.new(mix.outputs["Result"], bg_cam.inputs["Color"])
    # lighting background: soft sky blue
    bg_light = nt.nodes.new("ShaderNodeBackground")
    bg_light.inputs["Color"].default_value = hexcol("#9CC4EC")
    bg_light.inputs["Strength"].default_value = 0.9
    lp = nt.nodes.new("ShaderNodeLightPath")
    mixs = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mixs.inputs["Fac"])
    nt.links.new(bg_light.outputs[0], mixs.inputs[1])
    nt.links.new(bg_cam.outputs[0], mixs.inputs[2])
    nt.links.new(mixs.outputs[0], out.inputs["Surface"])

    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(90 - sun_elev), 0, math.radians(sun_rot)))
    sun = bpy.context.object
    sun.data.energy = 4.2
    sun.data.angle = math.radians(2.5)
    sun.data.color = hexcol("#FFF3E0")[:3]
    return w


def ground_dirt(size=120):
    bpy.ops.mesh.primitive_plane_add(size=size)
    g = bpy.context.object
    g.name = "ground"
    m = bpy.data.materials.new("dirt")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.95
    n1 = nt.nodes.new("ShaderNodeTexNoise")
    n1.inputs["Scale"].default_value = 3.0
    n1.inputs["Detail"].default_value = 10
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = hexcol("#9C8A72")
    cr.color_ramp.elements[1].color = hexcol("#C9B79C")
    nt.links.new(n1.outputs["Fac"], cr.inputs["Fac"])
    # grass far away: radial blend
    tc = nt.nodes.new("ShaderNodeTexCoord")
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / 22, 1 / 22, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], grad.inputs["Vector"])
    edge = nt.nodes.new("ShaderNodeValToRGB")
    edge.color_ramp.elements[0].position = 0.42
    edge.color_ramp.elements[0].color = (1, 1, 1, 1)
    edge.color_ramp.elements[1].position = 0.47
    edge.color_ramp.elements[1].color = (0, 0, 0, 1)
    nt.links.new(grad.outputs["Fac"], edge.inputs["Fac"])
    grass = nt.nodes.new("ShaderNodeValToRGB")
    grass.color_ramp.elements[0].color = hexcol("#5E8F3A")
    grass.color_ramp.elements[1].color = hexcol("#86B54E")
    nt.links.new(n1.outputs["Fac"], grass.inputs["Fac"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    nt.links.new(edge.outputs["Color"], mix.inputs["Factor"])
    nt.links.new(cr.outputs["Color"], mix.inputs["A"])
    nt.links.new(grass.outputs["Color"], mix.inputs["B"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    n2 = nt.nodes.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 60
    nt.links.new(n2.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    g.data.materials.append(m)
    return g


def tree(loc, h=4.5, r=1.6, seed=0):
    import random
    rnd = random.Random(seed)
    trunk = cyl("trunk", 0.16, h * 0.55, (loc[0], loc[1], h * 0.275), mat("bark", "#6E4B33", rough=0.9), verts=10)
    leaf = mat("leaf%d" % (seed % 3), ["#4E8A33", "#5C9A3A", "#437A2E"][seed % 3], rough=0.8)
    for i in range(5):
        sphere("leaves", r * rnd.uniform(0.55, 0.8),
               (loc[0] + rnd.uniform(-0.7, 0.7), loc[1] + rnd.uniform(-0.7, 0.7), h * 0.62 + rnd.uniform(0, 1.2)),
               leaf, sub=2)


def climbing_frame(loc):
    x, y = loc
    red, blue, yellow = mat("pl_red", "#D8342C"), mat("pl_blue", "#2F6FD0"), mat("pl_yel", "#F2C230")
    for dx in (-1, 1):
        for dy in (-1, 1):
            cyl("post", 0.07, 2.4, (x + dx * 0.9, y + dy * 0.9, 1.2), blue, verts=12)
    box("deck", (2.0, 2.0, 0.12), (x, y, 1.3), yellow)
    # roof pyramid
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.6, depth=0.9, location=(x, y, 2.85), rotation=(0, 0, math.pi / 4))
    roof = bpy.context.object
    roof.data.materials.append(blue)
    # slide
    sl = box("slide", (0.7, 2.6, 0.08), (x, y - 2.0, 0.7), red)
    sl.rotation_euler = (math.radians(-28), 0, 0)
    for dx in (-0.38, 0.38):
        rail = box("rail", (0.06, 2.6, 0.18), (x + dx, y - 2.0, 0.78), red)
        rail.rotation_euler = (math.radians(-28), 0, 0)


def bench(loc, rotz=0):
    wood = mat("wood", "#9A6A3C", rough=0.75)
    metal = mat("metal_dark", "#2E3238", rough=0.4)
    b = box("bench_seat", (1.8, 0.45, 0.06), (loc[0], loc[1], 0.45), wood)
    for dx in (-0.75, 0.75):
        box("bench_leg", (0.06, 0.4, 0.45), (loc[0] + dx, loc[1], 0.22), metal, bevel=0.01)
    box("bench_back", (1.8, 0.05, 0.35), (loc[0], loc[1] + 0.22, 0.75), wood)


def lamp(loc):
    metal = mat("lamp_green", "#2E4A3A", rough=0.4)
    cyl("lamp_pole", 0.05, 3.4, (loc[0], loc[1], 1.7), metal, verts=12)
    sphere("lamp_globe", 0.18, (loc[0], loc[1], 3.5), mat("lamp_glass", "#FFF6D8", rough=0.2))


# ---------------------------------------------------------------- swing
class Swing:
    """A-frame swing. Beam along X at height `pivot_h`; seat swings in the Y-Z plane.
    angle(theta) > 0 swings the seat toward -Y (front)."""

    def __init__(self, loc=(0, 0), pivot_h=2.6, length=2.0, width=2.8):
        x0, y0 = loc
        self.pivot = Vector((x0, y0, pivot_h))
        self.length = length
        red = mat("swing_red", "#D8342C", rough=0.4)
        chain = mat("chain", "#9AA0A6", rough=0.3)
        seatm = mat("seat_black", "#1E1F22", rough=0.6)
        cyl("beam", 0.07, width + 0.3, (x0, y0, pivot_h), red, rot=(0, math.pi / 2, 0), verts=16)
        spread = 0.95
        leg_len = math.hypot(spread, pivot_h)
        tilt = math.atan2(spread, pivot_h)
        for sx in (-1, 1):
            for sy in (-1, 1):
                cyl("aleg", 0.065, leg_len + 0.1, (x0 + sx * width / 2, y0 + sy * spread / 2, pivot_h / 2), red,
                    rot=(sy * tilt, 0, 0), verts=14)
        bpy.ops.object.empty_add(location=self.pivot)
        self.hinge = bpy.context.object
        self.hinge.name = "swing_hinge"
        for sx in (-1, 1):
            c = cyl("chain", 0.015, length, (x0 + sx * 0.3, y0, pivot_h - length / 2), chain, verts=8)
            c.parent = self.hinge
            c.matrix_parent_inverse = self.hinge.matrix_world.inverted()
        seat = box("seat", (0.7, 0.32, 0.05), (x0, y0, pivot_h - length), seatm, bevel=0.015)
        seat.parent = self.hinge
        seat.matrix_parent_inverse = self.hinge.matrix_world.inverted()
        self.hinge.rotation_mode = "XYZ"

    def seat_matrix(self, theta):
        """World matrix of the seat top centre for swing angle theta (radians)."""
        return (Matrix.Translation(self.pivot) @ Matrix.Rotation(-theta, 4, "X")
                @ Matrix.Translation((0, 0, -self.length + 0.025)))

    def key(self, theta, frame):
        self.hinge.rotation_euler = (-theta, 0, 0)
        self.hinge.keyframe_insert("rotation_euler", frame=frame)


# ---------------------------------------------------------------- camera / render
def camera(loc, target, lens=26):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    cam.data.lens = lens
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    look_at(cam, target)
    bpy.context.scene.camera = cam
    return cam


def render_settings(w=360, h=640, fps=15, samples=16):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 4
    s.cycles.diffuse_bounces = 2
    s.cycles.glossy_bounces = 1
    s.cycles.transparent_max_bounces = 4
    s.render.resolution_x, s.render.resolution_y = w, h
    s.render.resolution_percentage = 100
    s.render.fps = fps
    s.render.image_settings.file_format = "PNG"
    s.view_settings.view_transform = "AgX"
    try:
        s.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    s.render.use_motion_blur = True
    s.render.motion_blur_shutter = 0.4
    s.render.motion_blur_position = "START"  # blur only forward in time -> hard cuts stay clean


# ---------------------------------------------------------------- photoreal accents
# One REAL photo inside the toy world grabs attention (big framed cat behind a scared blocky kid,
# a "LOST CAT" poster with a real photo on a lamp post). Keep it to one or two per shot.
def photo_mat(name, path, gloss=True, rough=0.35):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    tex.extension = "EXTEND"
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    if gloss and "Coat Weight" in b.inputs:  # glass over the print
        b.inputs["Coat Weight"].default_value = 0.6
        b.inputs["Coat Roughness"].default_value = 0.03
    return m


def _img_size(path):
    from PIL import Image
    return Image.open(path).size


def framed_photo(path, center, width, rot_z=0.0, frame_col="#2B1D14", mat_border=0.06, frame_w=0.05, depth=0.04):
    """Wall picture facing -Y (before rot_z, degrees): chunky toy frame + white mat + real photo behind glass."""
    w_px, h_px = _img_size(path)
    pw, ph = width, width * h_px / w_px
    fm = mat("frame_" + frame_col, frame_col, rough=0.45)
    ow, oh = pw + 2 * (mat_border + frame_w), ph + 2 * (mat_border + frame_w)
    objs = [box("frame", (ow, depth, oh), (0, 0, 0), fm, bevel=0.012),
            box("mat", (pw + 2 * mat_border, 0.006, ph + 2 * mat_border), (0, -depth / 2 - 0.001, 0),
                mat("passepartout", "#F4F1EA", rough=0.8), bevel=0)]
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -depth / 2 - 0.006, 0), rotation=(math.pi / 2, 0, 0))
    p = bpy.context.object
    p.scale = (pw, ph, 1)
    p.data.materials.append(photo_mat("photo_" + os.path.basename(path), path))
    objs.append(p)
    bpy.ops.object.empty_add(location=tuple(center), rotation=(0, 0, math.radians(rot_z)))
    root = bpy.context.object
    root.name = "photo_" + os.path.basename(path)
    for o in objs:
        o.parent = root
    return root


def photo_plane(path, center, width, rot_z=0.0, tilt=0.0, rough=0.75):
    """Unframed print (poster, flyer, billboard) facing -Y; rot_z/tilt in degrees."""
    w_px, h_px = _img_size(path)
    bpy.ops.mesh.primitive_plane_add(size=1, location=tuple(center),
                                     rotation=(math.radians(90), math.radians(tilt), math.radians(rot_z)))
    p = bpy.context.object
    p.scale = (width, width * h_px / w_px, 1)
    p.data.materials.append(photo_mat("print_" + os.path.basename(path), path, gloss=False, rough=rough))
    return p


def make_poster(photo, out_path, title="LOST CAT", name='"CHELSEA"', line='answers to "pssst"', reward="REWARD"):
    """Compose a missing-pet style poster (PNG) around a real photo."""
    from PIL import Image, ImageDraw, ImageFont
    W, H = 600, 850
    p = Image.new("RGB", (W, H), (250, 248, 240))
    dr = ImageDraw.Draw(p)
    import fonts
    font = fonts.load

    def ctext(y, t, f, c=(20, 20, 20)):
        dr.text(((W - dr.textlength(t, font=f)) / 2, y), t, font=f, fill=c)
    ctext(30, title, font(92), (200, 20, 20))
    im = Image.open(photo).convert("RGB")
    im = im.resize((520, int(520 * im.size[1] / im.size[0])))
    p.paste(im, (40, 150))
    y = 150 + im.size[1]
    ctext(y + 25, name, font(40))
    ctext(y + 85, line, font(30), (60, 60, 60))
    ctext(y + 140, reward, font(40), (200, 20, 20))
    for i in range(8):
        x = 20 + i * 72
        dr.rectangle([x, H - 90, x + 50, H - 10], outline=(80, 80, 80), width=2)
    p.save(out_path)
    return out_path


def wood_floor(size=(9, 8)):
    bpy.ops.mesh.primitive_plane_add(size=1)
    g = bpy.context.object
    g.scale = (*size, 1)
    m = bpy.data.materials.new("planks")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.4
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 6.0, 1.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 1.4
    br.inputs["Mortar Size"].default_value = 0.004
    br.inputs["Color1"].default_value = hexcol("#C8894E")
    br.inputs["Color2"].default_value = hexcol("#B4743C")
    br.inputs["Mortar"].default_value = hexcol("#5A3A20")
    nt.links.new(mp.outputs["Vector"], br.inputs["Vector"])
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    g.data.materials.append(m)
    return g


def living_room(wall_col="#BFE0D4", sofa_col="#E0603A"):
    """Open-top toy living room: back wall at y=2.3, side wall at x=-3.1, sofa against the back wall
    (seat top z~0.47, centre x=0.2, y~1.65). Daylight from the sky + a warm area key + lamp."""
    wall = mat("wall", wall_col, rough=0.85)
    trim = mat("trim", "#FFFFFF", rough=0.5)
    box("back_wall", (9, 0.2, 4.6), (0, 2.3, 2.3), wall, bevel=0)
    box("side_wall", (0.2, 8, 4.6), (-3.1, 0, 2.3), wall, bevel=0)
    box("base_b", (9, 0.04, 0.12), (0, 2.19, 0.06), trim, bevel=0.005)
    box("base_s", (0.04, 8, 0.12), (-2.99, 0, 0.06), trim, bevel=0.005)
    wood_floor()
    sofa = mat("sofa", sofa_col, rough=0.75)
    box("sofa_seat", (2.4, 0.9, 0.42), (0.2, 1.65, 0.21), sofa, bevel=0.06)
    box("sofa_back", (2.4, 0.3, 0.55), (0.2, 2.05, 0.65), sofa, bevel=0.06)
    for sx in (-1, 1):
        box("sofa_arm", (0.28, 0.9, 0.62), (0.2 + sx * 1.2, 1.65, 0.31), sofa, bevel=0.06)
    for cx in (-0.38, 0.78):
        box("cushion", (1.1, 0.75, 0.12), (cx, 1.6, 0.48), mat("cushion", "#F28A63", rough=0.8), bevel=0.05)
    box("rug", (2.6, 1.6, 0.015), (0.2, 0.25, 0.008), mat("rug", "#3D6FB6", rough=0.95), bevel=0.004)
    tm = mat("table", "#8B5A2B", rough=0.5)
    box("table_top", (1.1, 0.6, 0.08), (0.2, 0.35, 0.42), tm, bevel=0.02)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box("table_leg", (0.07, 0.07, 0.38), (0.2 + sx * 0.45, 0.35 + sy * 0.22, 0.19), tm, bevel=0.01)
    cyl("lamp_pole", 0.03, 1.5, (1.9, 1.9, 0.75), mat("metal_dark", "#2E3238", rough=0.4))
    bpy.ops.mesh.primitive_cone_add(radius1=0.28, radius2=0.18, depth=0.32, location=(1.9, 1.9, 1.6))
    bpy.context.object.data.materials.append(mat("shade", "#FFE7B0", rough=0.6))
    for o in bpy.data.objects:  # interiors: softer sun, otherwise yellow skin washes out
        if o.type == "LIGHT" and o.data.type == "SUN":
            o.data.energy = 2.2
    bpy.ops.object.light_add(type="AREA", location=(1.5, -2.5, 3.0), rotation=(math.radians(55), 0, math.radians(30)))
    l = bpy.context.object
    l.data.energy, l.data.size, l.data.color = 260, 3, (1.0, 0.92, 0.82)
    bpy.ops.object.light_add(type="POINT", location=(1.9, 1.9, 1.55))
    bpy.context.object.data.energy = 60
    bpy.context.object.data.color = (1.0, 0.8, 0.55)
