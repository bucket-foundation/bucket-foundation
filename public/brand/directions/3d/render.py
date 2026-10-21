import bpy, bmesh, math, sys, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
IDS = argv[0].split(",") if argv else ["d1", "d2", "d3", "d4", "d5", "d6"]
KINDS = argv[1].split(",") if len(argv) > 1 else ["mark", "object"]
SAMPLES = int(argv[2]) if len(argv) > 2 else 96
RES = int(argv[3]) if len(argv) > 3 else 2048

BG = dict(d1="#FFFFFF", d2="#F4EFE4", d3="#FFF8E7", d4="#141414", d5="#0B2A5B", d6="#D9D6CF", d7="#F3EEE3")
C = dict(
    d1=dict(acc="#0F62FE", hl="#DA1E28", fg="#FFFFFF"),
    d2=dict(acc="#1F3A5F", hl="#B8341B", fg="#F4EFE4"),
    d3=dict(acc="#FFC800", hl="#FF4B91", fg="#2E7D00", lip="#1F5600"),
    d4=dict(acc="#E3242B", fg="#EFE6D2", bg="#141414"),
    d5=dict(acc="#3FC1C9", fg="#F5F7FA", surf="#123873"),
    d7=dict(acc="#A6442A", fg="#1A1714", surf="#F3EEE3"),
    d6=dict(acc="#FF5F00", fg="#EDEBE6", blue="#1D4ED8", red="#E1251B"),
)


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = SAMPLES
    s.cycles.use_denoising = True
    s.render.resolution_x = s.render.resolution_y = RES
    s.view_settings.view_transform = "Standard"
    s.view_settings.look = "None"
    return s


def world(bg, amb=0.25, ambcol=None):
    w = bpy.data.worlds.new("w")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputWorld")
    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    a = nt.nodes.new("ShaderNodeBackground")
    a.inputs[0].default_value = lin(ambcol or bg)
    a.inputs[1].default_value = amb
    b = nt.nodes.new("ShaderNodeBackground")
    b.inputs[0].default_value = lin(bg)
    b.inputs[1].default_value = 1.0
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    nt.links.new(a.outputs[0], mix.inputs[1])
    nt.links.new(b.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], o.inputs[0])


def mat(name, col, rough=0.4, metal=0.0, coat=0.0, aniso=0.0, emit=0.0, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = lin(col) if isinstance(col, str) else col
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Anisotropic"].default_value = aniso
    if emit:
        p.inputs["Emission Color"].default_value = lin(col)
        p.inputs["Emission Strength"].default_value = emit
    if sss:
        p.inputs["Subsurface Weight"].default_value = sss
    return m


def tex_mix(m, a, b, kind="noise", scale=8.0, lo=0.4, hi=0.6, stretch=None):
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    if stretch:
        mp.inputs["Scale"].default_value = stretch
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    if kind == "voronoi":
        t = nt.nodes.new("ShaderNodeTexVoronoi")
        out = t.outputs["Distance"]
    elif kind == "wave":
        t = nt.nodes.new("ShaderNodeTexWave")
        t.inputs["Distortion"].default_value = 6
        t.inputs["Detail"].default_value = 4
        out = t.outputs["Fac"]
    else:
        t = nt.nodes.new("ShaderNodeTexNoise")
        t.inputs["Detail"].default_value = 8
        out = t.outputs["Fac"]
    t.inputs["Scale"].default_value = scale
    nt.links.new(mp.outputs[0], t.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = lo
    r.color_ramp.elements[0].color = lin(a)
    r.color_ramp.elements[1].position = hi
    r.color_ramp.elements[1].color = lin(b)
    nt.links.new(out, r.inputs[0])
    nt.links.new(r.outputs[0], p.inputs["Base Color"])
    return m


def terrazzo(m, base, chips):
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.inputs["Scale"].default_value = 14
    v.inputs["Randomness"].default_value = 1
    nt.links.new(tc.outputs["Object"], v.inputs["Vector"])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.interpolation = "CONSTANT"
    els = cr.color_ramp.elements
    els[0].color = lin(chips[0])
    els[1].position = 1 / len(chips)
    els[1].color = lin(chips[1])
    for i, c in enumerate(chips[2:], 2):
        e = els.new(i / len(chips))
        e.color = lin(c)
    nt.links.new(v.outputs["Color"], cr.inputs[0])
    msk = nt.nodes.new("ShaderNodeMath")
    msk.operation = "LESS_THAN"
    msk.inputs[1].default_value = 0.16
    nt.links.new(v.outputs["Distance"], msk.inputs[0])
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type = "RGBA"
    mx.inputs[6].default_value = lin(base)
    nt.links.new(msk.outputs[0], mx.inputs[0])
    nt.links.new(cr.outputs[0], mx.inputs[7])
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])
    return m


def setm(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    return o


def bevel(o, w=0.02, seg=3):
    b = o.modifiers.new("bv", "BEVEL")
    b.width = w
    b.segments = seg
    b.limit_method = "ANGLE"
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def box(x0, y0, x1, y1, z0, z1, m, bv=0.015):
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.scale = ((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2)
    o.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    bpy.ops.object.transform_apply(scale=True)
    setm(o, m)
    if bv:
        bevel(o, bv)
    return o


def cyl(x, y, r, z0, z1, m, v=64, bv=0.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    o = bpy.context.object
    setm(o, m)
    smooth(o)
    if bv:
        bevel(o, bv, 2)
    return o


def cut(o, cutter):
    b = o.modifiers.new("cut", "BOOLEAN")
    b.object = cutter
    b.operation = "DIFFERENCE"
    b.solver = "EXACT"
    o.modifiers.move(len(o.modifiers) - 1, 0)
    cutter.hide_render = True
    cutter.hide_viewport = True
    return o


def G(x, y):
    return ((x - 50) * 0.02, (50 - y) * 0.02)


def circ(cx, cy, r, n=64):
    return [(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def arc(cx, cy, r, a0, a1, n=12):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


def rrect(x0, y0, x1, y1, r):
    if r <= 0:
        return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    return (arc(x1 - r, y0 + r, r, -90, 0) + arc(x1 - r, y1 - r, r, 0, 90)
            + arc(x0 + r, y1 - r, r, 90, 180) + arc(x0 + r, y0 + r, r, 180, 270))


def rot(pts, ang, cx, cy):
    a = math.radians(ang)
    return [(cx + (x - cx) * math.cos(a) - (y - cy) * math.sin(a), cy + (x - cx) * math.sin(a) + (y - cy) * math.cos(a)) for x, y in pts]


def prism(loops, z0, z1, m, bev=0.008, name="g"):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = max((z1 - z0) / 2 - bev, 0.001)
    cu.bevel_depth = bev
    cu.bevel_resolution = 2
    for loop in loops:
        sp = cu.splines.new("POLY")
        sp.points.add(len(loop) - 1)
        for p, (x, y) in zip(sp.points, loop):
            gx, gy = G(x, y)
            p.co = (gx, gy, 0, 1)
        sp.use_cyclic_u = True
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.location.z = (z0 + z1) / 2
    cu.materials.append(m)
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.selected_objects:
        x.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.object
    smooth(o)
    o.data.set_sharp_from_angle(angle=math.radians(40))
    return o


def plate(r, m, z1=0.12):
    return prism([rrect(0, 0, 100, 100, r)], 0, z1, m, 0.02, "plate")


def mark(i):
    c = C[i]
    P, H = 0.12, 0.26
    if i == "d1":
        plate(0, mat("plate", c["acc"], 0.35, 0.6))
        w = mat("w", c["fg"], 0.3)
        outer = [(24, 14), (38, 14), (38, 40)] + arc(60, 56, 16, -90, 0) + arc(60, 70, 16, 0, 90) + [(24, 86)]
        prism([outer, rrect(38, 54, 60, 72, 2)], P, H, w)
        prism([rrect(80, 14, 88, 22, 0)], P, H, mat("hl", c["hl"], 0.35))
    elif i == "d2":
        plate(22, mat("plate", c["acc"], 0.15, 0, 1.0))
        g = mat("gold", c["fg"], 0.3, 0.0, 0.5)
        prism([circ(50, 50, 39.5, 72), circ(50, 50, 36.5, 72)], P, P + 0.05, g)
        prism([circ(50, 50, 32.5, 72), circ(50, 50, 31.5, 72)], P, P + 0.03, g, 0.003)
        prism([rrect(34, 22, 43, 78, 0)], P, H + 0.002, g)
        prism([circ(57, 60, 18), circ(57, 60, 9)], P, H, g)
        prism([circ(72, 28, 6, 48)], P, H, mat("seal", c["hl"], 0.3, 0, 0.6))
    elif i == "d3":
        plate(24, mat("plate", c["acc"], 0.15, 0, 1.0))
        lip = mat("lip", c["lip"], 0.2, 0, 1.0)
        top = mat("top", c["fg"], 0.15, 0, 1.0)
        for m, dy, z in ((lip, 5, H - 0.03), (top, 0, H + 0.04)):
            prism([rrect(30, 14 + dy, 44, 60 + dy, 3)], P, z + (0.002 if m is top else 0), m, 0.02)
            prism([circ(52, 58.5 + dy, 26), circ(56, 60 + dy, 10)], P, z, m, 0.02)
        wave = [(12 + k * 0.5, 84 - 4 * math.sin(k * 0.5 * math.pi / 8)) for k in range(65)]
        band = wave + [(x, y + 5) for x, y in reversed(wave)]
        prism([band], P, P + 0.05, mat("sq", c["hl"], 0.2, 0, 1.0), 0.015)
    elif i == "d4":
        plate(0, mat("plate", c["bg"], 0.6))
        red = mat("red", c["acc"], 0.45)
        cream = mat("cream", c["fg"], 0.55)
        prism([[(0, 100), (100, 30), (100, 100)]], P, P + 0.04, red, 0.004)
        prism([rot(rrect(22, 16, 37, 84, 0), -8, 30, 50)], P + 0.04, H + 0.04, cream)
        prism([circ(54, 62, 20), circ(54, 62, 8)], P + 0.04, H + 0.04, cream)
        prism([circ(54, 62, 8)], P + 0.04, H, red)
    elif i == "d5":
        plate(18, mat("plate", c["surf"], 0.08, 0, 1.0))
        frame = mat("frame", c["acc"], 0.1, 0, 1.0)
        prism([rrect(5, 5, 95, 95, 14), rrect(7, 7, 93, 93, 12)], P, P + 0.03, frame, 0.004)
        wht = mat("glaze", c["fg"], 0.08, 0, 1.0)
        prism([rrect(24, 12, 39, 88, 2)], P, H + 0.002, wht)
        prism([circ(56, 62, 26)], P, H, wht)
        st = [(56 + (15 if k % 2 == 0 else 9) * math.cos(math.pi * k / 8 - math.pi / 2),
               62 + (15 if k % 2 == 0 else 9) * math.sin(math.pi * k / 8 - math.pi / 2)) for k in range(16)]
        prism([st], H - 0.01, H + 0.05, frame, 0.006)
    elif i == "d7":
        stone = mat("stone", c["acc"], 0.85)
        tex_mix(stone, "#8E3820", "#B5512F", "noise", 30, 0.3, 0.7)
        p = plate(4, stone, 0.3)
        cuts = [prism([rrect(26, 14, 38, 66, 0)], 0.22, 0.4, stone, 0.0, "c1"),
                prism([circ(48, 64, 22), circ(48, 64, 12)], 0.22, 0.4, stone, 0.0, "c2")]
        for k in cuts:
            cut(p, k)
        fill = mat("slip", c["fg"], 0.6)
        prism([rrect(26.6, 14.6, 37.4, 65.4, 0)], 0.215, 0.225, fill, 0.0, "f1")
        prism([circ(48, 64, 21.4), circ(48, 64, 12.6)], 0.215, 0.225, fill, 0.0, "f2")
        prism([[(78, 8), (92, 8), (92, 22), (84, 22), (84, 16), (78, 16)]], 0.3, 0.36, mat("parch", c["surf"], 0.7), 0.004)
    else:
        plate(14, mat("plate", c["fg"], 0.8))
        prism([rrect(22, 14, 38, 84, 0)], P, H, mat("blue", c["blue"], 0.75))
        prism([circ(56, 62, 22), circ(56, 62, 8)], P, H, mat("red", c["red"], 0.75))
        prism([circ(80, 20, 7, 48)], P, H, mat("org", c["acc"], 0.6))


def look(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def camera(loc, target=(0, 0, 0), lens=50):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    cam.data.lens = lens
    look(cam, target)
    bpy.context.scene.camera = cam
    return cam


def area(loc, target, power, size, col=(1, 1, 1), shape="SQUARE"):
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = bpy.context.object
    l.data.energy = power
    l.data.size = size
    l.data.shape = shape
    l.data.color = col
    look(l, target)
    return l


def spot(loc, target, power, size=0.05, ang=40, col=(1, 1, 1)):
    bpy.ops.object.light_add(type="SPOT", location=loc)
    l = bpy.context.object
    l.data.energy = power
    l.data.shadow_soft_size = size
    l.data.spot_size = math.radians(ang)
    l.data.spot_blend = 0.3
    l.data.color = col
    look(l, target)
    return l


def floor(col=None, rough=0.8, z=0.0):
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, z))
    o = bpy.context.object
    o.is_shadow_catcher = True
    o.visible_glossy = False
    o.visible_transmission = False
    setm(o, mat("floor", "#FFFFFF", rough))
    return o


def composite(bg):
    s = bpy.context.scene
    s.render.film_transparent = True
    s.use_nodes = True
    nt = s.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    ao = nt.nodes.new("CompositorNodeAlphaOver")
    out = nt.nodes.new("CompositorNodeComposite")
    ao.inputs[1].default_value = lin(bg)
    nt.links.new(rl.outputs["Image"], ao.inputs[2])
    nt.links.new(ao.outputs[0], out.inputs[0])


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def export_glb(path):
    for o in list(bpy.data.objects):
        if o.type != "MESH" or o.hide_render:
            bpy.data.objects.remove(o)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_apply=True,
                              use_selection=False, export_cameras=False, export_lights=False,
                              export_draco_mesh_compression_enable=False)


BGM = dict(d7="#1A1714", d1="#161616", d2="#F4EFE4", d3="#2B2B2B", d4="#EFE6D2", d5="#F2C14E", d6="#111111")
BGO = dict(d7="#F3EEE3", d1="#161616", d2="#1F3A5F", d3="#58CC02", d4="#E3242B", d5="#F5F7FA", d6="#3F3D39")
RIG = dict(
    d7=dict(key=(1.0, 0.86, 0.66), rim=(1.0, 0.95, 0.85), fill=(0.8, 0.86, 1.0), k=1.0, r=1.4, f=0.3, hard=False),
    d1=dict(key=(1, 1, 1), rim=(1, 1, 1), fill=(1, 1, 1), k=1.0, r=1.2, f=0.35, hard=False),
    d2=dict(key=(1.0, 0.82, 0.6), rim=(0.75, 0.85, 1.0), fill=(1.0, 0.9, 0.78), k=0.9, r=1.4, f=0.3, hard=False),
    d3=dict(key=(1, 1, 1), rim=(1.0, 0.55, 0.75), fill=(0.6, 0.9, 1.0), k=1.0, r=1.6, f=0.45, hard=False),
    d4=dict(key=(1.0, 0.96, 0.9), rim=(1.0, 0.3, 0.25), fill=(0.8, 0.85, 1.0), k=1.3, r=1.8, f=0.12, hard=True),
    d5=dict(key=(1.0, 0.8, 0.55), rim=(0.45, 0.9, 1.0), fill=(0.75, 0.82, 1.0), k=1.0, r=1.5, f=0.3, hard=False),
    d6=dict(key=(1, 1, 1), rim=(1.0, 0.75, 0.55), fill=(1, 1, 1), k=1.0, r=1.2, f=0.4, hard=False),
)


def subjects():
    return [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render
            and not o.is_shadow_catcher and o.visible_camera]


def bbox():
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in subjects():
        e = o.evaluated_get(dg)
        pts += [e.matrix_world @ Vector(c) for c in e.bound_box]
    return pts


def frame(fill=0.7):
    from bpy_extras.object_utils import world_to_camera_view
    s = bpy.context.scene
    bpy.context.view_layer.update()
    old = s.camera
    d = (old.matrix_world.to_quaternion() @ Vector((0, 0, -1))).normalized()
    lens = old.data.lens
    for o in [o for o in s.objects if o.type in ("CAMERA", "LIGHT")]:
        bpy.data.objects.remove(o)
    pts = bbox()
    c = sum(pts, Vector()) / len(pts)
    rad = max((p - c).length for p in pts)
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    cam.data.lens = lens
    s.camera = cam
    dist = rad * 3
    for _ in range(8):
        cam.location = c - d * dist
        look(cam, c)
        bpy.context.view_layer.update()
        v = [world_to_camera_view(s, cam, p) for p in pts]
        xs = [p.x for p in v]
        ys = [p.y for p in v]
        span = max(max(xs) - min(xs), max(ys) - min(ys))
        mx = (max(xs) + min(xs)) / 2 - 0.5
        my = (max(ys) + min(ys)) / 2 - 0.5
        right = cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))
        up = cam.matrix_world.to_quaternion() @ Vector((0, 1, 0))
        w = 2 * dist * math.tan(cam.data.angle / 2)
        c = c + right * mx * w + up * my * w
        dist *= span / fill
    cam.location = c - d * dist
    look(cam, c)
    return c, rad, cam


def three_point(i, c, rad, cam, scale=1.0):
    r = RIG[i]
    q = cam.matrix_world.to_quaternion()
    fwd = q @ Vector((0, 0, -1))
    right = q @ Vector((1, 0, 0))
    up = Vector((0, 0, 1))
    D = rad * 3.2
    e = rad * rad * 140 * scale
    kpos = c - fwd * D * 0.6 - right * D * 0.8 + up * D * 0.9
    if r["hard"]:
        spot(tuple(kpos), tuple(c), e * 12 * r["k"], 0.02, 45, r["key"])
    else:
        area(tuple(kpos), tuple(c), e * r["k"], rad * 1.5, r["key"], "DISK")
    area(tuple(c + fwd * D * 0.9 + right * D * 0.5 + up * D * 0.7), tuple(c), e * r["r"], rad * 1.0, r["rim"])
    area(tuple(c - fwd * D * 0.7 + right * D * 0.9 + up * D * 0.2), tuple(c), e * r["f"], rad * 2.5, r["fill"])


def render_mark(i):
    reset()
    world(BGM[i], 0.35, "#FFFFFF")
    mark(i)
    composite(BGM[i])
    floor(z=-0.0005)
    camera((1.9, -3.3, 3.6), (0, 0, 0.1), 60)
    c, rad, cam = frame(0.78)
    three_point(i, c, rad, cam)
    render(f"{OUT}/{i}-mark.png")
    for o in list(bpy.data.objects):
        if o.name.startswith("Plane"):
            bpy.data.objects.remove(o)
    export_glb(f"{OUT}/{i}-mark.glb")


def obj_d1():
    world(BG["d1"], 0.9, "#FFFFFF")
    floor()
    alu = lambda n, col: mat(n, col, 0.32, 1.0, aniso=0.3)
    cols = ["#C6C6C6", "#0F62FE", "#8D8D8D", "#C6C6C6", "#DA1E28"]
    for k, col in enumerate(cols):
        h = 0.5 + 0.12 * k
        box(-1.6 + k * 0.66, -0.4, -1.0 + k * 0.66, 0.4, 0, h, alu(f"a{k}", col), 0.02)
        box(-1.5 + k * 0.66, 0.15, -1.25 + k * 0.66, 0.4, h, h + 0.22, alu(f"t{k}", col), 0.015)
        box(-1.5 + k * 0.66, -0.402, -1.1 + k * 0.66, -0.398, h - 0.14, h - 0.1, mat(f"l{k}", "#161616", 0.5), 0)
    camera((2.6, -5.2, 3.0), (0, 0, 0.6), 55)
    area((0, -2, 7), (0, 0, 0), 900, 8)
    area((-6, -3, 3), (0, 0, 0.5), 400, 6)
    area((6, -3, 3), (0, 0, 0.5), 300, 6)


def pail(r0, r1, h, z0, m, t=0.05):
    bpy.ops.mesh.primitive_cone_add(vertices=128, radius1=r0, radius2=r1, depth=h, location=(0, 0, z0 + h / 2), end_fill_type="NOTHING")
    o = bpy.context.object
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in o.data.vertices:
        v.select = v.co.z < 0
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.edge_face_add()
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    sol = o.modifiers.new("s", "SOLIDIFY")
    sol.thickness = t
    sol.offset = -1
    bevel(o, t * 0.4, 3)
    setm(o, m)
    smooth(o)
    o.modifiers.new("wn", "WEIGHTED_NORMAL")
    return o


def hoop(r, z, m, t=0.035, rx=0.0, sy=1.0):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=t, major_segments=128, minor_segments=16, location=(0, 0, z))
    o = bpy.context.object
    o.rotation_euler.x = rx
    o.scale = (1, sy, 1)
    setm(o, m)
    smooth(o)
    return o


def decal(loops, m, ang, rad, z, tilt, depth=0.03, s=0.0062):
    o = prism(loops, 0, depth, m, 0.004, "crest")
    o.location = (0, 0, 0)
    for v in o.data.vertices:
        v.co = (v.co.x / 0.02 * s, v.co.y / 0.02 * s, v.co.z)
    o.rotation_euler = (math.radians(90) + tilt, 0, ang + math.radians(90))
    o.location = (rad * math.cos(ang), rad * math.sin(ang), z)
    return o


def obj_d2():
    world(BG["d2"], 0.35, "#FFE8C8")
    floor()
    wood = mat("wood", "#6E2414", 0.3, coat=1.0)
    wood.node_tree.nodes["Principled BSDF"].inputs["Coat Roughness"].default_value = 0.04
    tex_mix(wood, "#4A140B", "#8A2E18", "noise", 4, 0.35, 0.7, (14, 14, 0.4))
    pail(0.95, 1.15, 1.5, 0, wood)
    band = mat("band", "#1C1C1C", 0.3, 0.3, 0.6)
    hoop(0.98, 0.3, band)
    hoop(1.12, 1.25, band)
    h = hoop(1.08, 1.5, band, 0.04, math.radians(90), 1.0)
    h.scale = (1, 1, 0.8)
    gold = mat("crest", "#E9D8A6", 0.25, 0.8)
    ang = math.radians(-70)
    tilt = math.atan2(0.2, 1.5)
    loops = [[circ(50, 50, 39.5, 72), circ(50, 50, 36.5, 72)], [circ(50, 50, 32.5, 72), circ(50, 50, 31.5, 72)],
             [rrect(34, 22, 43, 78, 0)], [circ(57, 60, 18), circ(57, 60, 9)]]
    for L in loops:
        decal(L, gold, ang, 1.072, 0.8, tilt)
    decal([circ(72, 28, 6, 48)], mat("seal", "#B8341B", 0.3, 0, 0.8), ang, 1.075, 0.8, tilt)
    camera((1.9, -5.2, 2.3), (0, 0, 0.75), 55)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.6, location=(-2.8, 0.8, 3.0))
    lan = bpy.context.object
    lan.scale = (1, 1, 1.3)
    setm(lan, mat("lantern", "#FFD9A0", 0.5, emit=30))
    lan.visible_camera = False
    area((-2.5, -3, 3), (0, 0, 0.7), 450, 4, (1.0, 0.85, 0.65), "DISK")
    area((3, 2, 3), (0, 0, 0.7), 120, 4, (0.85, 0.9, 1.0))


def obj_d3():
    world(BG["d3"], 0.8, "#FFFFFF")
    floor()
    tz = terrazzo(mat("terrazzo", "#EFE6D6", 0.35, coat=0.4), "#EFE6D6",
                  ["#FF4B91", "#00B3A6", "#FFC800", "#1F1F1F", "#4A64FF"])
    cyl(0, 0, 1.6, 0, 0.35, tz, 128, 0.03)
    pink = mat("pink", "#FF4B91", 0.12, coat=1.0)
    pail(0.85, 1.1, 1.4, 0.35, pink, 0.06)
    hoop(1.1, 1.75, mat("teal", "#00B3A6", 0.12, coat=1.0), 0.07)
    h = hoop(1.08, 1.75, mat("yel", "#FFC800", 0.12, coat=1.0), 0.06, math.radians(90))
    h.rotation_euler.z = math.radians(20)
    blk = mat("blk", "#1F1F1F", 0.2, coat=1.0)
    wave = [(k * 1.0, 50 - 6 * math.sin(k * math.pi / 10)) for k in range(101)]
    decal([wave + [(x, y + 7) for x, y in reversed(wave)]], blk, math.radians(-95), 0.965, 0.95, math.atan2(0.25, 1.4), 0.03, 0.009)
    for k, (x, y, col, v) in enumerate(((1.95, 0.5, "#4A64FF", 3), (-2.0, 0.9, "#00B3A6", 4))):
        bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=0.32, depth=0.5, location=(x, y, 0.25))
        o = bpy.context.object
        setm(o, mat(f"p{k}", col, 0.15, coat=1.0))
        bevel(o, 0.02)
    camera((2.2, -5.4, 3.2), (0, 0, 0.8), 50)
    area((-3, -3, 6), (0, 0, 0.5), 1000, 5)
    area((4, -2, 2), (0, 0, 0.8), 300, 3)
    area((0, 4, 4), (0, 0, 0.8), 300, 4)


def obj_d4():
    world(BG["d4"], 0.03, "#FFFFFF")
    floor()
    disc = cyl(0, 0, 1.3, -0.12, 0.12, mat("disc", "#0B0B0B", 0.35), 128, 0.02)
    disc.rotation_euler = (math.radians(90), 0, 0)
    disc.location = (0, 0, 1.45)
    tri = [(-2.3, 0.55), (-2.0, -0.05), (2.3, 2.9)]
    bpy.ops.mesh.primitive_cube_add()
    w = bpy.context.object
    me = w.data
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for y in (-0.22, 0.22) for x, z in tri]
    bm.faces.new(vs[:3][::-1])
    bm.faces.new(vs[3:])
    for k in range(3):
        j = (k + 1) % 3
        bm.faces.new((vs[k], vs[j], vs[3 + j], vs[3 + k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    w.location = (0, 0, 0)
    w.scale = (1, 1, 1)
    setm(w, mat("steel", "#C8CBD0", 0.25, 1.0, aniso=0.9))
    bevel(w, 0.012)
    rr = prism([circ(50, 50, 65, 72), circ(50, 50, 61, 72)], -0.01, 0.01, mat("red", "#E3242B", 0.45), 0.003)
    rr.rotation_euler.x = math.radians(90)
    rr.location = (0, -0.13, 1.45)
    camera((0.6, -7.0, 1.7), (0, 0, 1.45), 42)
    spot((-6, -2.8, 3.0), (0, 0, 1.3), 9000, 0.03, 35)
    area((5, 3, 4), (0, 0, 1.4), 120, 2)
    area((2, -4, 0.5), (0, 0, 1.4), 40, 2)


def obj_d5():
    world(BG["d5"], 0.15, "#FFE2B8")
    floor()
    cob = mat("cobalt", "#1A3E9C", 0.06, coat=1.0)
    tq = mat("turq", "#3FC1C9", 0.05, coat=1.0)
    wht = mat("white", "#F5F7FA", 0.08, coat=1.0)
    bpy.ops.mesh.primitive_cube_add()
    base = bpy.context.object
    base.scale = (1.4, 1.4, 0.12)
    base.location = (0, 0, 0.12)
    setm(base, cob)
    bevel(base, 0.05, 4)
    def star(r1, r2, z0, z1, m, n=8):
        bpy.ops.mesh.primitive_circle_add(vertices=2 * n, radius=1, fill_type="NGON")
        o = bpy.context.object
        for k, v in enumerate(o.data.vertices):
            a = math.pi * k / n
            r = r1 if k % 2 == 0 else r2
            v.co = (r * math.cos(a), r * math.sin(a), z0)
        sol = o.modifiers.new("s", "SOLIDIFY")
        sol.thickness = z1 - z0
        sol.offset = 1
        setm(o, m)
        bevel(o, 0.012, 3)
        return o
    star(1.15, 0.72, 0.24, 0.36, tq)
    star(0.78, 0.5, 0.36, 0.46, wht)
    star(0.48, 0.3, 0.46, 0.56, cob)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        o = star(0.22, 0.12, 0.24, 0.34, wht)
        o.location = (1.12 * math.cos(a), 1.12 * math.sin(a), 0)
    camera((2.4, -4.0, 3.6), (0, 0, 0.2), 50)
    area((-4, -1.5, 3.0), (0, 0, 0.3), 2500, 2.0, (1.0, 0.82, 0.58), "RECTANGLE").data.size_y = 3.0
    area((4, 3, 4), (0, 0, 0.3), 200, 4, (0.7, 0.85, 1.0))


def obj_d6():
    world(BG["d6"], 0.7, "#FFFFFF")
    floor()
    box(-1.9, -0.45, -1.0, 0.45, 0, 0.9, mat("red", "#E1251B", 0.8), 0.01)
    bpy.ops.mesh.primitive_cone_add(vertices=128, radius1=0.5, depth=1.1, location=(-0.4, 0.6, 0.55))
    setm(bpy.context.object, mat("yel", "#F2C200", 0.8))
    smooth(bpy.context.object)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, segments=96, ring_count=48, location=(0.5, -0.2, 0.45))
    setm(bpy.context.object, mat("blue", "#1D4ED8", 0.8))
    smooth(bpy.context.object)
    box(0.9, -1.2, 2.5, 0.4, 0, 0.12, mat("panel", "#EDEBE6", 0.7), 0.02)
    org = mat("org", "#FF5F00", 0.5)
    k = cyl(1.7, -0.4, 0.42, 0.12, 0.5, org, 48, 0.0)
    k.modifiers.clear()
    for p in k.data.polygons:
        p.use_smooth = False
    bevel(k, 0.03, 3)
    cyl(1.7, -0.4, 0.36, 0.5, 0.56, org, 96, 0.02)
    box(1.67, -0.4, 1.73, -0.1, 0.56, 0.58, mat("ind", "#111111", 0.6), 0)
    for j in range(6):
        cyl(1.05 + j * 0.24, 0.25, 0.04, 0.12, 0.14, mat(f"led{j}", "#111111" if j else "#FF5F00", 0.5), 24, 0)
    camera((1.2, -5.6, 3.0), (0.2, 0, 0.4), 50)
    area((-3, -3, 6), (0, 0, 0), 900, 6)
    area((5, -1, 3), (0, 0, 0.4), 300, 5)


def obj_d7():
    world(BG["d7"], 0.3, "#FFE6C4")
    floor()
    prof = [(0.0, 0.0), (0.36, 0.0), (0.38, 0.05), (0.22, 0.12), (0.2, 0.22), (0.5, 0.5), (0.7, 0.9), (0.74, 1.15),
            (0.68, 1.45), (0.5, 1.68), (0.3, 1.82), (0.26, 2.05), (0.38, 2.14), (0.4, 2.2), (0.3, 2.22)]
    me = bpy.data.meshes.new("amph")
    me.from_pydata([(r, 0, z) for r, z in prof], [(k, k + 1) for k in range(len(prof) - 1)], [])
    o = bpy.data.objects.new("amphora", me)
    bpy.context.collection.objects.link(o)
    sc = o.modifiers.new("lathe", "SCREW")
    sc.steps = 96
    sc.render_steps = 96
    sc.use_merge_vertices = True
    sol = o.modifiers.new("s", "SOLIDIFY")
    sol.thickness = 0.03
    sub = o.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 2
    m = mat("clay", "#A6442A", 0.35, coat=0.6)
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    mz = nt.nodes.new("ShaderNodeMath")
    mz.operation = "DIVIDE"
    mz.inputs[1].default_value = 2.22
    nt.links.new(sep.outputs["Z"], mz.inputs[0])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.interpolation = "CONSTANT"
    bands = [(0.0, "#1A1714"), (0.06, "#A6442A"), (0.08, "#1A1714"), (0.4, "#A6442A"), (0.405, "#1A1714"),
             (0.415, "#A6442A"), (0.63, "#1A1714"), (0.635, "#A6442A"), (0.645, "#1A1714"), (0.9, "#A6442A"),
             (0.915, "#1A1714")]
    els = cr.color_ramp.elements
    els[0].position, els[0].color = bands[0][0], lin(bands[0][1])
    els[1].position, els[1].color = bands[1][0], lin(bands[1][1])
    for pos, col in bands[2:]:
        e = els.new(pos)
        e.color = lin(col)
    nt.links.new(mz.outputs[0], cr.inputs[0])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.inputs["Scale"].default_value = 3
    wave.inputs["Distortion"].default_value = 3
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    fig = nt.nodes.new("ShaderNodeValToRGB")
    fig.color_ramp.interpolation = "CONSTANT"
    fig.color_ramp.elements[0].color = lin("#1A1714")
    fig.color_ramp.elements[1].position = 0.5
    fig.color_ramp.elements[1].color = lin("#A6442A")
    nt.links.new(wave.outputs["Fac"], fig.inputs[0])
    lo = nt.nodes.new("ShaderNodeMath")
    lo.operation = "GREATER_THAN"
    lo.inputs[1].default_value = 0.415
    hi = nt.nodes.new("ShaderNodeMath")
    hi.operation = "LESS_THAN"
    hi.inputs[1].default_value = 0.63
    nt.links.new(mz.outputs[0], lo.inputs[0])
    nt.links.new(mz.outputs[0], hi.inputs[0])
    both = nt.nodes.new("ShaderNodeMath")
    both.operation = "MULTIPLY"
    nt.links.new(lo.outputs[0], both.inputs[0])
    nt.links.new(hi.outputs[0], both.inputs[1])
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type = "RGBA"
    nt.links.new(both.outputs[0], mx.inputs[0])
    nt.links.new(cr.outputs[0], mx.inputs[6])
    nt.links.new(fig.outputs[0], mx.inputs[7])
    nt.links.new(mx.outputs[2], nt.nodes["Principled BSDF"].inputs["Base Color"])
    o.data.materials.append(m)
    smooth(o)
    slip = mat("slip", "#1A1714", 0.3, coat=0.6)
    for sgn in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.035, major_segments=48, location=(sgn * 0.42, 0, 1.78))
        h = bpy.context.object
        h.rotation_euler.x = math.radians(90)
        h.scale = (1, 1.6, 1)
        setm(h, slip)
        smooth(h)
    camera((1.0, -6.0, 1.6), (0, 0, 1.1), 60)


def render_object(i):
    reset()
    globals()[f"obj_{i}"]()
    composite(BGO[i])
    bpy.context.scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.2
    c, rad, cam = frame(1.0)
    three_point(i, c, rad, cam)
    render(f"{OUT}/{i}-object.png")


for i in IDS:
    if "mark" in KINDS:
        render_mark(i)
    if "object" in KINDS:
        render_object(i)
