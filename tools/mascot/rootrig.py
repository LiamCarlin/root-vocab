"""
Root, the mascot, as a procedural Blender character.

build() makes the whole scene from nothing: body, face, leaves, limbs, props, lights, camera.
apply(P) poses it from a plain dict (see BASE). Limbs are solved every frame: the shoulder and
hip ride on the body, the hand and foot go where the pose says, and the elbow / knee bend to fit.

Units: Root stands about 3.1 high with its feet on z = 0. It faces -Y (toward the camera).
"L" and "R" are SCREEN left and right (-X and +X), not the character's own.
"""
import math
import bpy
from mathutils import Vector, Matrix, Euler, Quaternion

# ── proportions ──────────────────────────────────────────────────────────────
HB = 1.02          # body half height
RX, RY = 0.765, 0.72  # body half width / half depth at the widest point
WIDE_AT = 0.16     # where it is widest, as a fraction of the half height above the middle (about eye level)
BODY_Z = 0.22      # body bottom above the ground
ZC = HB            # body centre in body space (body origin is its bottom)
SHOULDER = (0.60, -0.02, ZC - 0.14)
HIP = (0.25, 0.0, 0.20)
ARM_LEN = 0.68
LEG_LEN = 0.37
BROW_Z = 0.60
STAND_H = 2.92     # feet to leaf tips

O = {}             # every object by name
M = {}             # materials


def profile(w):
    """Half width of the body at height w (-1 bottom … 1 top), as a fraction of RX: a domed egg,
    widest around the eyes, tapering gently to a narrower rounded bottom."""
    if w >= WIDE_AT:
        e = (w - WIDE_AT) / (1 - WIDE_AT)
        return math.sqrt(max(0.0, 1 - e * e))
    e = (WIDE_AT - w) / (1 + WIDE_AT)
    return math.sqrt(max(0.0, 1 - e ** 2.5)) * (1 - 0.16 * e)


def radial(w):
    w = max(-0.9999, min(0.9999, w))
    return profile(w) / math.sqrt(1 - w * w)


def shape(u, v, w):
    """Unit sphere point → body surface point in body space (origin at the bottom)."""
    k = radial(w)
    return Vector((u * RX * k, v * RY * k, w * HB + ZC))


def surf(x, zc):
    """Point and outward normal on the FRONT of the body at side offset x and height zc from the centre."""
    def at(x_, z_):
        w = max(-0.999, min(0.999, z_ / HB))
        u = max(-0.999, min(0.999, x_ / (RX * radial(w))))
        u = max(-math.sqrt(1 - w * w) * 0.999, min(math.sqrt(1 - w * w) * 0.999, u))
        v = -math.sqrt(max(0.0, 1 - u * u - w * w))
        return shape(u, v, w)
    p = at(x, zc)
    e = 0.004
    n = (at(x + e, zc) - at(x - e, zc)).cross(at(x, zc + e) - at(x, zc - e))
    n.normalize()
    if n.y > 0:
        n = -n
    return p, n


def face_matrix(x, zc, lift=0.0, roll=0.0):
    """A frame sitting on the body surface: local -Y points out of the body, local Z points up the face."""
    p, n = surf(x, zc)
    q = n.to_track_quat('-Y', 'Z')
    m = Matrix.Translation(p + n * lift) @ q.to_matrix().to_4x4() @ Matrix.Rotation(roll, 4, 'Y')
    return m


# ── materials ────────────────────────────────────────────────────────────────
def rgb(hexstr):
    h = hexstr.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(pow(v, 2.2) for v in c) + (1,)


def principled(name, color, rough=0.5, sss=0.0, sss_col=None, coat=0.0, emit=0.0, sheen=0.0, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = rgb(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metallic
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.35, 0.16, 0.08)
        b.inputs['Subsurface Scale'].default_value = 0.35
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.08
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen
        b.inputs['Sheen Roughness'].default_value = 0.5
    if emit:
        b.inputs['Emission Color'].default_value = rgb(color)
        b.inputs['Emission Strength'].default_value = emit
    M[name] = m
    return m


def skin_material():
    """Orange clay with a blush painted in around two cheek points and a fine clay grain."""
    m = principled('skin', '#FC7A08', rough=0.7, sss=0.12, sheen=0.1)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    base = nt.nodes.new('ShaderNodeRGB'); base.outputs[0].default_value = rgb('#FC7A08')
    blush = nt.nodes.new('ShaderNodeRGB'); blush.outputs[0].default_value = rgb('#FF5A6E')
    last = base.outputs[0]
    for sx in (-1, 1):
        p, n = surf(sx * 0.53, 0.02)
        dist = nt.nodes.new('ShaderNodeVectorMath'); dist.operation = 'DISTANCE'
        nt.links.new(tc.outputs['Object'], dist.inputs[0]); dist.inputs[1].default_value = p
        ramp = nt.nodes.new('ShaderNodeMapRange'); ramp.interpolation_type = 'SMOOTHSTEP'
        ramp.inputs['From Min'].default_value = 0.07; ramp.inputs['From Max'].default_value = 0.19
        ramp.inputs['To Min'].default_value = 0.9; ramp.inputs['To Max'].default_value = 0.0
        nt.links.new(dist.outputs['Value'], ramp.inputs['Value'])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        nt.links.new(ramp.outputs['Result'], mix.inputs['Factor'])
        nt.links.new(last, mix.inputs['A']); nt.links.new(blush.outputs[0], mix.inputs['B'])
        last = mix.outputs['Result']
    # a slightly deeper orange toward the bottom, like the reference renders
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    grad = nt.nodes.new('ShaderNodeMapRange'); grad.inputs['From Min'].default_value = 0.0; grad.inputs['From Max'].default_value = 1.4
    grad.inputs['To Min'].default_value = 0.35; grad.inputs['To Max'].default_value = 0.0
    nt.links.new(sep.outputs['Z'], grad.inputs['Value'])
    deep = nt.nodes.new('ShaderNodeRGB'); deep.outputs[0].default_value = rgb('#EA6604')
    mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'RGBA'
    nt.links.new(grad.outputs['Result'], mix2.inputs['Factor']); nt.links.new(last, mix2.inputs['A']); nt.links.new(deep.outputs[0], mix2.inputs['B'])
    nt.links.new(mix2.outputs['Result'], b.inputs['Base Color'])
    # clay grain
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 85; noise.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.16; bump.inputs['Distance'].default_value = 0.02
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def limb_material():
    """The same clay without the cheek paint, for arms, legs, hands and feet."""
    m = principled('limb', '#F87606', rough=0.7, sss=0.12, sheen=0.1)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 85; noise.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.16; bump.inputs['Distance'].default_value = 0.02
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


# ── mesh helpers ─────────────────────────────────────────────────────────────
def link(o, parent=None):
    bpy.context.scene.collection.objects.link(o)
    if parent is not None:
        o.parent = parent
    O[o.name] = o
    return o


def empty(name, parent=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.location = loc
    return link(o, parent)


def sphere_mesh(name, fn, seg=48, rings=32, mat=None, smooth=True):
    """A UV sphere whose every vertex is passed through fn(u, v, w) (unit sphere coords)."""
    verts, faces = [], []
    for j in range(rings + 1):
        th = math.pi * j / rings
        for i in range(seg):
            ph = 2 * math.pi * i / seg
            u, v, w = math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)
            verts.append(tuple(fn(u, v, w)))
    for j in range(rings):
        for i in range(seg):
            a = j * seg + i; b = j * seg + (i + 1) % seg; c = (j + 1) * seg + (i + 1) % seg; d = (j + 1) * seg + i
            if j == 0:
                faces.append((a, c, d))
            elif j == rings - 1:
                faces.append((a, b, d))
            else:
                faces.append((a, b, c, d))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    # weld the pole rows
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if mat:
        me.materials.append(mat)
    return me


def ellipsoid(name, rx, ry, rz, mat, parent=None, seg=40, rings=24):
    me = sphere_mesh(name, lambda u, v, w: (u * rx, v * ry, w * rz), seg, rings, mat)
    o = bpy.data.objects.new(name, me)
    return link(o, parent)


def tube(name, mat, parent, radius):
    """A bendy limb: a bevelled curve through three points that apply() moves every frame."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 8; cu.resolution_u = 16; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(2)
    for bp in sp.bezier_points:
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.materials.append(mat)
    o = bpy.data.objects.new(name, cu)
    return link(o, parent)


def arc(name, mat, parent, pts, radius, cyclic=False):
    """A thin rounded line on the face (brows, closed smile, happy eyes)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 6; cu.resolution_u = 14; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    sp.use_cyclic_u = cyclic
    cu.materials.append(mat)
    o = bpy.data.objects.new(name, cu)
    return link(o, parent)


def set_tube(o, pts, radii):
    sp = o.data.splines[0]
    for bp, p, r in zip(sp.bezier_points, pts, radii):
        bp.co = p; bp.radius = r
        bp.handle_left_type = bp.handle_right_type = 'AUTO'


# ── build ────────────────────────────────────────────────────────────────────
def build(engine='BLENDER_EEVEE', samples=48):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    O.clear(); M.clear()
    sc = bpy.context.scene

    skin = skin_material()
    limb = limb_material()
    leafm = principled('leaf', '#62BE1C', rough=0.6, sss=0.12)
    dark = principled('eye', '#1E0F0A', rough=0.22)
    rim = principled('eyerim', '#5E2A0A', rough=0.6)
    irism = principled('iris', '#74380F', rough=0.4)
    nt = dark.node_tree; tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = -0.19; mr.inputs['From Max'].default_value = 0.0; mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 0.0
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = rgb('#1A0C08'); mx.inputs['B'].default_value = rgb('#4A2410')
    nt.links.new(mr.outputs['Result'], mx.inputs['Factor']); nt.links.new(mx.outputs['Result'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    white = principled('sclera', '#FFFFFF', rough=0.25, sss=0.1)
    shine = principled('shine', '#FFFFFF', rough=0.3, emit=3.0)
    brow = principled('brow', '#8C4A14', rough=0.6)
    mouthm = principled('mouth', '#7A1B22', rough=0.55)
    tongue = principled('tongue', '#F7828E', rough=0.4, sss=0.2)
    line = principled('line', '#6E2E0C', rough=0.6)

    root = empty('root')
    bodyE = empty('bodyE', root, (0, 0, BODY_Z))

    # body
    me = sphere_mesh('body', shape, 72, 48, skin)
    me.materials.append(mouthm)
    body = link(bpy.data.objects.new('body', me), bodyE)
    sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2

    # mouth: a real opening cut into the body, so it has depth
    def mouth_shape(u, v, w):
        z = w * (0.34 if w > 0 else 1.0)   # flat top, round bottom: a smile
        return (u * 0.27, v * 0.30, z * 0.225)
    cut = link(bpy.data.objects.new('mouthCut', sphere_mesh('mouthCut', mouth_shape, 48, 32, mouthm)), body)
    cut.display_type = 'WIRE'; cut.hide_render = True
    bo = body.modifiers.new('mouth', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cut; bo.solver = 'EXACT'
    try:
        bo.material_mode = 'TRANSFER'
    except Exception:
        pass
    tg = ellipsoid('tongue', 0.15, 0.12, 0.085, tongue, body)

    # closed smile and "o" are simple shapes on the surface
    smile = arc('smile', line, body, [(-0.2, 0, 0.05), (0, 0, -0.06), (0.2, 0, 0.05)], 0.02)

    # eyes
    for s, tag in ((-1, 'L'), (1, 'R')):
        eye = empty('eye' + tag, body)
        eye.matrix_local = face_matrix(s * 0.34, 0.24, lift=-0.075)
        ellipsoid('rim' + tag, 0.230, 0.12, 0.248, rim, eye)
        ellipsoid('sclera' + tag, 0.215, 0.13, 0.233, white, eye)
        pup = empty('pupil' + tag, eye)
        ellipsoid('iris' + tag, 0.203, 0.136, 0.221, irism, pup)
        ellipsoid('dark' + tag, 0.197, 0.142, 0.215, dark, pup)
        h1 = ellipsoid('hiA' + tag, 0.054, 0.03, 0.054, shine, pup, 20, 12); h1.location = (-0.062, -0.124, 0.08)
        h2 = ellipsoid('hiB' + tag, 0.025, 0.02, 0.025, shine, pup, 16, 10); h2.location = (0.068, -0.12, -0.072)
        # happy closed eye: an upward arc, drawn on the skin where the eye was
        hp = arc('happy' + tag, line, body, [(-0.17, 0, -0.05), (0, 0, 0.09), (0.17, 0, -0.05)], 0.026)
        hp.matrix_local = face_matrix(s * 0.34, 0.24, lift=0.005)
        br = arc('brow' + tag, brow, body, [(-0.09, 0, -0.018), (0, 0, 0.022), (0.09, 0, -0.018)], 0.021)
        br.matrix_local = face_matrix(s * 0.36, BROW_Z, lift=0.004, roll=s * 0.12)

    # leaves: thick, puffy, with a centre crease. Origin at the base; they bend along their length.
    def leaf_shape(length, width):
        def f(u, v, w):
            t = (w + 1) / 2                      # 0 base … 1 tip
            e = 2 * (t ** 0.92) - 1
            prof = max(0.0, 1 - abs(e) ** 2.7) ** 0.5                # a fat, blunt oval paddle
            prof *= 0.62 + 0.38 * min(1.0, t / 0.35)                # a little narrower where it joins
            x = u * width * prof
            # thick and puffy, edges rolling back, with a groove down the middle of the front
            groove = 0.05 * prof * math.exp(-(u * 3.6) ** 2)
            roll = 0.16 * prof * u * u
            y = v * 0.085 * (0.2 + prof) + (groove * 0.8 if v < 0 else 0.0) + roll * 0.8 + 0.04 * t * t
            return (x, y, t * length)
        return f
    top = empty('leafBase', body, (0, 0.0, 2 * HB - 0.04))
    for i, (ang, ln, wd, tilt) in enumerate(((0.0, 0.74, 0.215, -0.10), (-0.92, 0.68, 0.20, 0.04), (0.92, 0.68, 0.20, 0.04))):
        piv = empty('leafP%d' % i, top, (math.sin(ang) * 0.035, 0.03 * (1 if i else 0), 0))
        piv.rotation_euler = (tilt, -ang if False else 0, 0)
        lf = link(bpy.data.objects.new('leaf%d' % i, sphere_mesh('leaf%d' % i, leaf_shape(ln, wd), 32, 28, leafm)), piv)
        sb = lf.modifiers.new('sub', 'SUBSURF'); sb.levels = 1; sb.render_levels = 1
        bx = lf.modifiers.new('bendX', 'SIMPLE_DEFORM'); bx.deform_method = 'BEND'; bx.deform_axis = 'X'; bx.angle = 0
        by = lf.modifiers.new('bendY', 'SIMPLE_DEFORM'); by.deform_method = 'BEND'; by.deform_axis = 'Y'; by.angle = 0
        piv['ang'] = ang
    # limbs
    for tag in ('L', 'R'):
        tube('arm' + tag, limb, root, 0.12)
        tube('leg' + tag, limb, root, 0.15)
        hand = empty('hand' + tag, root)
        ellipsoid('mitt' + tag, 0.15, 0.135, 0.165, limb, hand)
        th = ellipsoid('thumb' + tag, 0.062, 0.062, 0.095, limb, hand, 24, 16)
        fg = ellipsoid('finger' + tag, 0.056, 0.056, 0.14, limb, hand, 24, 16)
        fg.hide_render = True
        foot = link(bpy.data.objects.new('foot' + tag, sphere_mesh('foot' + tag, lambda u, v, w: (u * 0.195, v * 0.24 - 0.04, (w if w > 0 else w * 0.7) * 0.14 + 0.098), 40, 24, limb)), root)

    build_props()
    build_stage(engine, samples)
    return root


def build_props():
    peri = principled('peri', '#7F97F2', rough=0.4, sss=0.1)
    periD = principled('periD', '#5E76D8', rough=0.45)
    blue = principled('blue', '#3F7BE8', rough=0.4)
    paper = principled('paper', '#FFF8EA', rough=0.6)
    yellow = principled('yellow', '#FFCB2E', rough=0.4)
    wood = principled('wood', '#F2C48D', rough=0.6)
    graphite = principled('graphite', '#3A3A44', rough=0.4)
    pink = principled('pinkp', '#F58CA6', rough=0.5)
    gold = principled('gold', '#F5B81F', rough=0.22, metallic=0.85, coat=0.6)
    glass = principled('glass', '#CFE6FF', rough=0.05, coat=1.0)
    glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.28
    try:
        glass.surface_render_method = 'BLENDED'
    except Exception:
        pass
    glow = principled('glow', '#FFE066', rough=0.3, emit=4.5)
    grey = principled('grey', '#B9BECC', rough=0.3, metallic=0.7)
    lampglow = principled('lampglow', '#FFD772', rough=0.3, emit=3.2)
    root = O['root']

    def group(name):
        g = empty('prop_' + name, root)
        g['prop'] = True
        return g

    def box(name, sx, sy, sz, mat, parent, loc=(0, 0, 0), bevel=0.02):
        me = bpy.data.meshes.new(name)
        import bmesh
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
        for v in bm.verts:
            v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=3, affect='EDGES')
        bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = True
        me.materials.append(mat)
        o = link(bpy.data.objects.new(name, me), parent); o.location = loc
        return o

    def cyl(name, r1, r2, h, mat, parent, loc=(0, 0, 0), rot=(0, 0, 0), seg=32, cap=True):
        me = bpy.data.meshes.new(name)
        import bmesh
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=cap, segments=seg, radius1=r1, radius2=r2, depth=h)
        bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = True
        me.materials.append(mat)
        o = link(bpy.data.objects.new(name, me), parent); o.location = loc; o.rotation_euler = rot
        m = o.modifiers.new('ws', 'WEIGHTED_NORMAL')
        return o

    def torus(name, R, r, mat, parent, loc=(0, 0, 0), rot=(0, 0, 0)):
        verts, faces = [], []
        A, B = 40, 14
        for i in range(A):
            a = 2 * math.pi * i / A
            for j in range(B):
                b = 2 * math.pi * j / B
                verts.append(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
        for i in range(A):
            for j in range(B):
                faces.append((i * B + j, ((i + 1) % A) * B + j, ((i + 1) % A) * B + (j + 1) % B, i * B + (j + 1) % B))
        me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
        for p in me.polygons:
            p.use_smooth = True
        me.materials.append(mat)
        o = link(bpy.data.objects.new(name, me), parent); o.location = loc; o.rotation_euler = rot
        return o

    # book (held open, spine down the middle)
    g = group('book')
    for s in (-1, 1):
        cover = box('bookCover%d' % s, 0.34, 0.035, 0.44, blue, g, (s * 0.175, 0, 0)); cover.rotation_euler = (0, 0, s * 0.28)
        pages = box('bookPages%d' % s, 0.30, 0.04, 0.40, paper, g, (s * 0.17, 0.03, 0)); pages.rotation_euler = (0, 0, s * 0.28)
    # pencil (pointing up along +Z)
    g = group('pencil')
    cyl('pencilBody', 0.06, 0.06, 0.74, yellow, g, (0, 0, 0), seg=6)
    cyl('pencilWood', 0.06, 0.018, 0.13, wood, g, (0, 0, 0.435), seg=24)
    cyl('pencilTip', 0.02, 0.0, 0.05, graphite, g, (0, 0, 0.515), seg=16)
    cyl('pencilBand', 0.064, 0.064, 0.06, grey, g, (0, 0, -0.39), seg=24)
    cyl('pencilRubber', 0.06, 0.055, 0.08, pink, g, (0, 0, -0.455), seg=24)
    # magnifying glass (lens in the XZ plane, facing the camera; handle down)
    g = group('magnifier')
    torus('magRim', 0.27, 0.035, blue, g, rot=(math.pi / 2, 0, 0))
    lens = cyl('magLens', 0.27, 0.27, 0.012, glass, g, rot=(math.pi / 2, 0, 0))
    cyl('magHandle', 0.045, 0.05, 0.34, blue, g, (0.26, 0, -0.38), rot=(0, math.radians(-35), 0))
    # lightbulb
    g = group('bulb')
    ellipsoid('bulbGlass', 0.17, 0.17, 0.19, glow, g)
    cyl('bulbNeck', 0.085, 0.10, 0.10, glow, g, (0, 0, -0.19))
    cyl('bulbCap', 0.075, 0.085, 0.10, grey, g, (0, 0, -0.27))
    for i in range(5):
        a = math.radians(-60 + i * 60)
        r = cyl('bulbRay%d' % i, 0.018, 0.018, 0.11, yellow, g, (math.sin(a) * 0.33, 0, math.cos(a) * 0.33 + 0.02), rot=(0, a, 0), seg=10)
    # trophy
    g = group('trophy')
    me = sphere_mesh('cup', lambda u, v, w: (u * (0.24 if w > -0.2 else 0.24 * max(0.25, (w + 1) / 0.8)), v * (0.24 if w > -0.2 else 0.24 * max(0.25, (w + 1) / 0.8)), min(w, 0.55) * 0.3), 40, 30, gold)
    link(bpy.data.objects.new('cup', me), g).location = (0, 0, 0.17)
    cyl('cupStem', 0.05, 0.035, 0.14, gold, g, (0, 0, -0.17))
    cyl('cupFoot', 0.15, 0.11, 0.07, gold, g, (0, 0, -0.27))
    box('cupBase', 0.32, 0.26, 0.09, wood, g, (0, 0, -0.34))
    for s in (-1, 1):
        torus('cupEar%d' % s, 0.10, 0.026, gold, g, (s * 0.26, 0, 0.2), rot=(math.pi / 2, 0, 0))
    # backpack (worn on the back: +Y side of the body)
    g = group('backpack')
    bag = ellipsoid('bag', 0.36, 0.22, 0.42, peri, g)
    ellipsoid('bagPocket', 0.24, 0.10, 0.20, periD, g).location = (0, 0.17, -0.14)
    for s in (-1, 1):
        torus('bagStrap%d' % s, 0.30, 0.035, periD, g, (s * 0.22, -0.33, 0.02), rot=(0, math.pi / 2, 0)).scale = (1.0, 1.15, 1.0)
    # watering can (spout toward +X)
    g = group('can')
    cyl('canBody', 0.2, 0.17, 0.3, peri, g)
    cyl('canSpout', 0.045, 0.035, 0.36, peri, g, (0.3, 0, 0.06), rot=(0, math.radians(58), 0))
    cyl('canRose', 0.05, 0.085, 0.06, periD, g, (0.47, 0, 0.165), rot=(0, math.radians(58), 0))
    torus('canHandle', 0.13, 0.028, periD, g, (-0.2, 0, 0.02), rot=(math.pi / 2, 0, 0))
    torus('canTop', 0.12, 0.025, periD, g, (0, 0, 0.19), rot=(math.pi / 2, 0, 0)).scale = (1, 1, 0.8)
    # lantern
    g = group('lantern')
    cyl('lampCore', 0.105, 0.105, 0.26, lampglow, g)
    cyl('lampTop', 0.15, 0.06, 0.10, periD, g, (0, 0, 0.18))
    cyl('lampBot', 0.13, 0.15, 0.06, periD, g, (0, 0, -0.16))
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        cyl('lampBar%d' % i, 0.014, 0.014, 0.26, periD, g, (math.cos(a) * 0.12, math.sin(a) * 0.12, 0), seg=8)
    torus('lampRing', 0.085, 0.016, periD, g, (0, 0, 0.30), rot=(math.pi / 2, 0, 0))
    for o in O.values():
        if o.name.startswith('prop_'):
            set_visible(o, False)


def children_deep(o):
    out = [o]
    for c in o.children:
        out += children_deep(c)
    return out


def set_visible(o, on):
    for c in children_deep(o):
        if c.type != 'EMPTY':
            c.hide_render = not on
            c.hide_viewport = not on


def build_stage(engine, samples):
    sc = bpy.context.scene
    sc.render.engine = engine
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.view_settings.look = 'None'
    except Exception:
        pass
    if engine == 'CYCLES':
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        try:
            prefs = bpy.context.preferences.addons['cycles'].preferences
            prefs.compute_device_type = 'METAL'; prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            sc.cycles.device = 'GPU'
        except Exception as e:
            print('cycles cpu', e)
    else:
        try:
            sc.eevee.taa_render_samples = samples
            sc.eevee.use_raytracing = True
            sc.eevee.use_shadows = True
        except Exception as e:
            print('eevee opt', e)

    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (1.0, 0.97, 0.94, 1); bg.inputs['Strength'].default_value = 0.5

    def area(name, loc, energy, size, color=(1, 1, 1)):
        l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
        try:
            l.use_shadow = True
        except Exception:
            pass
        o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
        d = Vector((0, 0, 1.6)) - Vector(loc)
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        return o
    area('key', (-3.4, -5.5, 5.6), 640, 6.0, (1.0, 0.97, 0.93))
    area('fill', (4.5, -5.0, 2.2), 150, 7.0, (0.95, 0.97, 1.0))
    area('rim', (2.5, 4.5, 5.5), 420, 5.0, (1.0, 0.95, 0.9))
    area('under', (0, -4.0, -1.5), 40, 6.0, (1.0, 0.9, 0.85))
    area('rim2', (-3.5, 4.0, 3.0), 300, 5.0, (1.0, 0.96, 0.9))

    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
    co.rotation_euler = (math.pi / 2, 0, 0)
    sc.camera = co; O['cam'] = co


def frame(box_w, box_h, bottom, px_per_unit, cx=0.0):
    """Point the camera at a box box_w × box_h units whose bottom edge is at z = bottom."""
    sc = bpy.context.scene
    sc.render.resolution_x = round(box_w * px_per_unit)
    sc.render.resolution_y = round(box_h * px_per_unit)
    sc.render.resolution_percentage = 100
    cam = O['cam']
    cam.data.ortho_scale = max(box_w, box_h)
    cam.location = (cx, -12, bottom + box_h / 2)


# ── posing ───────────────────────────────────────────────────────────────────
BASE = {
    'pos': (0, 0, 0),            # whole character: x (screen right), y (depth), z (up)
    'yaw': 0,                    # degrees; + turns it to face screen right
    'tilt': 0,                   # degrees; whole character leaning sideways about its feet
    'dz': 0,                     # body lift relative to the feet (- = crouch)
    'lean': (0, 0),              # degrees: forward (+ = toward camera), sideways (+ = to screen right)
    'twist': 0,                  # degrees: body turn relative to the feet
    'sq': 1,                     # squash and stretch: body height scale, volume preserved
    'leaf': (0, 0, 0),           # extra leaf bend: side (deg), forward (deg), spread (deg)
    'armL': {'hand': (-0.80, -0.10, -0.68), 'rot': (0, 0, 0)},   # hand relative to the body CENTRE, in body space
    'armR': {'hand': (0.80, -0.10, -0.68), 'rot': (0, 0, 0)},
    'legL': {'foot': (-0.25, 0, 0), 'rot': (0, 0, 0)},           # foot on the ground, relative to the root
    'legR': {'foot': (0.25, 0, 0), 'rot': (0, 0, 0)},
    'look': (0, 0),              # eyes: -1…1 screen x, y
    'blink': 0,                  # 0 open … 1 shut
    'eyes': 'open',              # open | happy | winkL | winkR
    'wide': 1,                   # eye size
    'brow': (0, 0),              # raise, tilt (+ = worried, - = determined)
    'mouth': 'open',             # open | smile | o | laugh
    'open': 1,                   # how open (for open / laugh / o)
    'mroll': 0,                  # crooked mouth, degrees
    'props': {},                 # name -> {'at': 'handL'|'handR'|'body'|'root', 'loc': (..), 'rot': (deg..), 'scale': s}
    'thumbs': (0, 0),            # 1 = thumb up (L, R)
    'finger': (0, 0),            # 1 = index finger out (L, R)
}


def deep(base, over):
    out = dict(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict) and k != 'props':
            out[k] = deep(base[k], v)
        else:
            out[k] = v
    return out


def pose(**over):
    return deep(BASE, over)


def _ik(a, c, length, pole):
    """Two-bone limb from a to c: returns the middle joint, bent toward `pole`."""
    d = c - a
    dist = d.length
    if dist > length * 0.999:
        c = a + d * (length * 0.999 / dist); d = c - a; dist = d.length
    h = math.sqrt(max(0.0, (length / 2) ** 2 - (dist / 2) ** 2))
    mid = (a + c) / 2
    pv = pole - d * (pole.dot(d) / max(1e-9, d.dot(d)))
    if pv.length < 1e-6:
        pv = Vector((0, -1, 0))
    pv.normalize()
    return mid + pv * h, c


def apply(P):
    root, bodyE, body = O['root'], O['bodyE'], O['body']
    root.location = P['pos']
    root.rotation_euler = (0, math.radians(P['tilt']), math.radians(P['yaw']))
    bodyE.location = (0, 0, BODY_Z + P['dz'])
    bodyE.rotation_euler = (math.radians(P['lean'][0]), math.radians(P['lean'][1]), math.radians(P['twist']))
    s = P['sq']; k = 1 / math.sqrt(s)
    body.scale = (k, k, s)

    # face
    for tag, sgn in (('L', -1), ('R', 1)):
        eye, pup = O['eye' + tag], O['pupil' + tag]
        mode = P['eyes']
        closed = mode in ('happy', 'shut') or mode == 'wink' + tag
        set_visible(eye, not closed)
        hp = O['happy' + tag]
        hp.hide_render = not closed
        hp.matrix_local = face_matrix(sgn * 0.34, 0.24 + (0.03 if mode == 'shut' else 0), lift=0.005, roll=math.pi if mode == 'shut' else 0)
        w = P['wide']
        if isinstance(w, (tuple, list)):
            w = w[0 if tag == 'L' else 1]
        eye.scale = (w, 1, w * max(0.06, 1 - P['blink']))
        lx, ly = P['look']
        pup.location = (-sgn * 0.024 + lx * 0.04, -0.016, 0.022 + ly * 0.04)
        br = O['brow' + tag]
        br.matrix_local = face_matrix(sgn * 0.36, BROW_Z + P['brow'][0] * 0.1, lift=0.004, roll=sgn * (0.12 + P['brow'][1] * 0.5))
    m = P['mouth']; op = max(0.05, P['open'])
    cut, bo, tg, smile = O['mouthCut'], body.modifiers['mouth'], O['tongue'], O['smile']
    cavity = m in ('open', 'laugh', 'o')
    bo.show_render = bo.show_viewport = cavity
    tg.hide_render = not cavity or m == 'o'
    smile.hide_render = cavity
    roll = math.radians(P['mroll'])
    if cavity:
        if m == 'o':
            cut.matrix_local = face_matrix(0, -0.13, lift=-0.04, roll=roll) @ Matrix.Diagonal((0.5, 1, 1.05 * op, 1)) @ Matrix.Rotation(math.pi, 4, 'Y')
            tg.matrix_local = face_matrix(0, -0.2, lift=-0.2)
            tg.scale = (0.5, 0.6, 0.5)
        else:
            big = 1.22 if m == 'laugh' else 1.0
            cut.matrix_local = face_matrix(0, -0.06, lift=-0.03, roll=roll) @ Matrix.Diagonal((big, 1, big * op * (1.25 if m == 'laugh' else 1), 1))
            tg.matrix_local = face_matrix(0, -0.06 - 0.165 * op * big, lift=-0.15)
            tg.scale = (big, 1, min(1, 0.4 + op * 0.7))
    else:
        smile.matrix_local = face_matrix(0, -0.1, lift=0.004, roll=roll)

    # leaves
    side, fwd, spread = P['leaf']
    for i in range(3):
        piv, lf = O['leafP%d' % i], O['leaf%d' % i]
        ang = piv['ang']
        sp = math.radians(spread) * (1 if ang > 0 else -1 if ang < 0 else 0)
        piv.rotation_euler = (math.radians(fwd) * 0.5 + (0.03 if i else -0.06), ang + sp + math.radians(side) * 0.45, 0)
        lf.modifiers['bendY'].angle = -(math.radians(side) * 0.9 + (0.32 * (1 if ang > 0 else -1) if i else 0))
        lf.modifiers['bendX'].angle = math.radians(fwd) * 0.9

    bpy.context.view_layer.update()
    bm = bodyE.matrix_local
    centre = Vector((0, 0, ZC))
    hands = {}
    for tag, sgn in (('L', -1), ('R', 1)):
        A = P['arm' + tag]
        sh = bm @ Vector((sgn * SHOULDER[0] * k, SHOULDER[1], SHOULDER[2] * s))
        hand = bm @ (centre + Vector(A['hand']))
        pole = Vector(A.get('pole', (sgn * 0.6, 0.25, -1.0)))
        el, hand = _ik(sh, hand, A.get('len', ARM_LEN), pole)
        inner = sh + (bm @ centre - sh).normalized() * 0.16
        set_tube(O['arm' + tag], [inner, el, hand], [1.05, 1.0, 1.05])
        h = O['hand' + tag]
        d = (hand - el).normalized()
        q = d.to_track_quat('Z', 'Y')
        rx, ry, rz = (math.radians(a) for a in A.get('rot', (0, 0, 0)))
        hm = Matrix.Translation(hand + d * 0.06) @ q.to_matrix().to_4x4() @ Euler((rx, ry, rz)).to_matrix().to_4x4()
        h.matrix_local = hm; hands['hand' + tag] = hm
        up = P['thumbs'][0 if tag == 'L' else 1]
        th = O['thumb' + tag]
        # thumb: tucked against the mitten, or sticking straight up in world space for a thumbs-up
        wu = (hm.to_3x3().inverted() @ Vector((0, 0, 1))).normalized()
        tucked = Vector((-sgn * 0.105, -0.07, 0.05))
        th.location = tucked.lerp(wu * 0.17, up)
        th.scale = (1, 1, 1 + 0.6 * up)
        th.rotation_euler = Quaternion((1, 0, 0, 0)).slerp(wu.to_track_quat('Z', 'Y'), up).to_euler() if up > 0.01 else (0, sgn * 0.5, 0)
        fg = O['finger' + tag]
        f = P['finger'][0 if tag == 'L' else 1]
        fg.hide_render = f < 0.05
        fg.location = (0, 0, 0.12 + 0.1 * f); fg.scale = (1, 1, max(0.05, f))

        L = P['leg' + tag]
        hip = bm @ Vector((sgn * HIP[0], HIP[1], HIP[2]))
        foot = Vector(L['foot'])
        ankle = foot + Vector((0, 0, 0.12))
        kn, ankle2 = _ik(hip, ankle, LEG_LEN, Vector(L.get('pole', (sgn * 0.25, -1.0, 0))))
        set_tube(O['leg' + tag], [hip + Vector((0, 0, 0.14)), kn, ankle2], [1.05, 1.0, 0.95])
        ft = O['foot' + tag]
        rx, ry, rz = (math.radians(a) for a in L.get('rot', (0, 0, 0)))
        ft.matrix_local = Matrix.Translation(ankle2 - Vector((0, 0, 0.12))) @ Euler((rx, ry, rz + sgn * 0.16)).to_matrix().to_4x4()

    # props
    for o in list(O.values()):
        if o.name.startswith('prop_'):
            name = o.name[5:]
            spec = P['props'].get(name)
            set_visible(o, bool(spec))
            if spec:
                at = spec.get('at', 'root')
                base = (Matrix.Translation(hands[at].to_translation()) if spec.get('upright') else hands[at]) if at in ('handL', 'handR') else (bodyE.matrix_local @ Matrix.Translation(centre) if at == 'body' else Matrix.Identity(4))
                rot = Euler(tuple(math.radians(a) for a in spec.get('rot', (0, 0, 0)))).to_matrix().to_4x4()
                sc_ = spec.get('scale', 1)
                o.matrix_local = base @ Matrix.Translation(spec.get('loc', (0, 0, 0))) @ rot @ Matrix.Diagonal((sc_, sc_, sc_, 1))
    bpy.context.view_layer.update()


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
