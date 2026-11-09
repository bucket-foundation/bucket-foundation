#!/usr/bin/env python3
import colorsys
import hashlib
import json
import math
import random
from pathlib import Path

import engine
import taxonomy as T

OUT = Path(__file__).parent / "out" / "emoji"
CX, CY, MR = 50, 58, 17
FONT = "'Noto Emoji','Noto Sans Runic','Noto Sans Mongolian','Noto Sans Myanmar','Noto Sans Symbols','Noto Sans Symbols 2','Noto Sans Math','Noto Sans','Noto Sans CJK SC','Noto Sans Egyptian Hieroglyphs','Noto Sans Cuneiform',sans-serif"
VARIANT_STYLES = ["metal", "neon", "stone", "glass", "clay", "outline", "woodcut", "riso", "blueprint", "chrome", "holo", "sticker", "deco", "stitch", "hollow", "double", "pottery", "bauhaus"]


def hx(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l, s)
    return f"#{round(r * 255):02X}{round(g * 255):02X}{round(b * 255):02X}"


def palette(h, sat=0.55, dark=False):
    return dict(b1=hx(h, sat, 0.30 if not dark else 0.16), b2=hx(h, sat + 0.05, 0.14 if not dark else 0.06), ink="#F6EEDC",
                sh=hx(h, 0.6, 0.07), a1=hx(h + 25, 0.85, 0.62), a2=hx(h + 40, 0.95, 0.86))


def hue_of(name):
    return int(hashlib.sha1(name.encode()).hexdigest()[:4], 16) % 360


def glyph(ch, c, size=None):
    n = len(ch)
    size = size or (24 if n == 1 else 15 if n == 2 else 11 if n <= 4 else 8)
    return (f'<text x="{CX}" y="{CY + 1}" font-size="{size}" font-weight="700" text-anchor="middle" dominant-baseline="central" '
            f'font-family="{FONT}" fill="{c["a2"]}">{ch}</text>')


def planet(c1, c2, extra, gid):
    g = f'<defs><radialGradient id="{gid}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient></defs>'
    body = f'<circle cx="{CX}" cy="{CY}" r="13" fill="url(#{gid})"/>'
    if extra == "band":
        body += "".join(f'<path d="M{CX - 12.5} {CY + dy}q12.5 {2 if dy > 0 else -2} 25 0" stroke="{c2}" stroke-width="1.6" fill="none" opacity=".7"/>' for dy in (-5, 0, 5))
    if extra == "ring":
        back = f'<ellipse cx="{CX}" cy="{CY}" rx="21" ry="5.5" fill="none" stroke="{c1}" stroke-width="2.2" transform="rotate(-18 {CX} {CY})" opacity=".55"/>'
        front = f'<path d="M{CX - 20} {CY + 6.5}A21 5.5 -18 0 0 {CX + 20} {CY - 6.5}" fill="none" stroke="{c1}" stroke-width="2.2" transform="rotate(0)"/>'
        return g + back + body + front
    return g + body


def globe(lat0, lon0, c, label):
    R = 15
    la0 = math.radians(lat0)

    def proj(lat, lon):
        la, lo = math.radians(lat), math.radians(lon - lon0)
        x = math.cos(la) * math.sin(lo)
        y = math.cos(la0) * math.sin(la) - math.sin(la0) * math.cos(la) * math.cos(lo)
        z = math.sin(la0) * math.sin(la) + math.cos(la0) * math.cos(la) * math.cos(lo)
        return CX + R * x, CY - R * y, z

    def poly(pts):
        segs, cur = [], []
        for x, y, z in pts:
            if z > 0:
                cur.append(f"{x:.1f},{y:.1f}")
            elif cur:
                segs.append(cur)
                cur = []
        if cur:
            segs.append(cur)
        return "".join(f'<polyline points="{" ".join(s)}" fill="none" stroke="{c["a2"]}" stroke-width=".7" opacity=".7"/>' for s in segs if len(s) > 1)

    s = f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="{c["b2"]}" stroke="{c["a2"]}" stroke-width="1.2"/>'
    for lon in range(-180, 180, 30):
        s += poly([proj(lat, lon) for lat in range(-90, 91, 6)])
    for lat in range(-60, 61, 30):
        s += poly([proj(lat, lon) for lon in range(-180, 181, 6)])
    s += f'<circle cx="{CX}" cy="{CY}" r="2.6" fill="{c["a1"]}" stroke="#fff" stroke-width=".8"/>'
    s += f'<text x="{CX}" y="{CY + 18}" font-size="4.4" font-weight="700" text-anchor="middle" font-family="{FONT}" fill="{c["ink"]}" letter-spacing=".6">{label}</text>'
    return s


def clock(hour, c):
    a = math.radians(hour % 12 * 30 - 90)
    s = f'<circle cx="{CX}" cy="{CY}" r="14" fill="none" stroke="{c["a2"]}" stroke-width="2"/>'
    s += "".join(f'<circle cx="{CX + 11 * math.cos(math.radians(k * 30)):.1f}" cy="{CY + 11 * math.sin(math.radians(k * 30)):.1f}" r=".9" fill="{c["a2"]}"/>' for k in range(12))
    s += f'<line x1="{CX}" y1="{CY}" x2="{CX + 7 * math.cos(a):.1f}" y2="{CY + 7 * math.sin(a):.1f}" stroke="{c["a1"]}" stroke-width="2.4" stroke-linecap="round"/>'
    s += f'<line x1="{CX}" y1="{CY}" x2="{CX}" y2="{CY - 10}" stroke="{c["a2"]}" stroke-width="1.4" stroke-linecap="round"/>'
    return s


def proc(kind, c, seed):
    rnd = random.Random(seed)
    a1, a2 = c["a1"], c["a2"]
    if kind == "galaxy":
        return "".join(f'<circle cx="{CX + r * math.cos(t + arm * math.pi):.1f}" cy="{CY + r * .6 * math.sin(t + arm * math.pi):.1f}" r="{1.4 - r / 20:.2f}" fill="{a2}"/>'
                       for arm in (0, 1) for t, r in ((k * .35, k * .9) for k in range(18))) + f'<circle cx="{CX}" cy="{CY}" r="3" fill="{a1}"/>'
    if kind == "nebula":
        return "".join(f'<circle cx="{CX + rnd.uniform(-9, 9):.1f}" cy="{CY + rnd.uniform(-7, 7):.1f}" r="{rnd.uniform(4, 9):.1f}" fill="{rnd.choice([a1, a2])}" opacity=".35"/>' for _ in range(9)) + glyph("✦", c, 10)
    if kind == "blackhole":
        return f'<ellipse cx="{CX}" cy="{CY}" rx="19" ry="5" fill="none" stroke="{a1}" stroke-width="3"/><circle cx="{CX}" cy="{CY}" r="8.5" fill="#000" stroke="{a2}" stroke-width="1.5"/>'
    if kind == "comet":
        return f'<path d="M{CX + 9} {CY - 9}L{CX - 14} {CY + 10}L{CX + 3} {CY - 13}Z" fill="{a2}" opacity=".5"/><circle cx="{CX + 8}" cy="{CY - 8}" r="5" fill="{a1}"/>'
    if kind == "star":
        return glyph("★", c, 28)
    if kind == "nova":
        return "".join(f'<line x1="{CX}" y1="{CY}" x2="{CX + 17 * math.cos(k * math.pi / 8):.1f}" y2="{CY + 17 * math.sin(k * math.pi / 8):.1f}" stroke="{a2 if k % 2 else a1}" stroke-width="{1.8 if k % 2 else 1}"/>' for k in range(16)) + f'<circle cx="{CX}" cy="{CY}" r="4" fill="#fff"/>'
    if kind == "stars":
        pts = [(CX + rnd.uniform(-14, 14), CY + rnd.uniform(-12, 12)) for _ in range(6)]
        return "".join(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{a2}" stroke-width=".6"/>' for a, b in zip(pts, pts[1:])) + "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="{a2}"/>' for x, y in pts)
    if kind == "asteroid":
        pts = " ".join(f"{CX + (10 + rnd.uniform(-3, 3)) * math.cos(k * math.pi / 5):.1f},{CY + (9 + rnd.uniform(-3, 3)) * math.sin(k * math.pi / 5):.1f}" for k in range(10))
        return f'<polygon points="{pts}" fill="{a1}"/><circle cx="{CX - 3}" cy="{CY - 2}" r="2" fill="{c["sh"]}" opacity=".5"/><circle cx="{CX + 4}" cy="{CY + 3}" r="1.4" fill="{c["sh"]}" opacity=".5"/>'
    if kind == "station":
        return f'<rect x="{CX - 3}" y="{CY - 3}" width="6" height="6" fill="{a2}"/><rect x="{CX - 18}" y="{CY - 5}" width="12" height="10" fill="{a1}"/><rect x="{CX + 6}" y="{CY - 5}" width="12" height="10" fill="{a1}"/><line x1="{CX - 6}" y1="{CY}" x2="{CX + 6}" y2="{CY}" stroke="{a2}"/>'
    if kind == "aurora":
        return "".join(f'<path d="M{CX - 18} {CY + 4 - k * 4}q9 -10 18 0t18 0" fill="none" stroke="{[a1, a2, "#7CFFB0"][k]}" stroke-width="2.4" opacity=".85"/>' for k in range(3))
    if kind == "eclipse":
        return f'<circle cx="{CX}" cy="{CY}" r="13" fill="{a1}" filter="url(#blur)"/><circle cx="{CX}" cy="{CY}" r="11" fill="#000"/><circle cx="{CX}" cy="{CY}" r="11" fill="none" stroke="{a2}" stroke-width=".8"/>'
    if kind == "orbitm":
        return f'<ellipse cx="{CX}" cy="{CY}" rx="16" ry="7" fill="none" stroke="{a2}" stroke-width="1.2"/><circle cx="{CX}" cy="{CY}" r="5" fill="{a1}"/><circle cx="{CX + 16}" cy="{CY}" r="2" fill="{a2}"/>'
    if kind == "net":
        layers = [[-10, 0, 10], [-14, -5, 5, 14], [-6, 6]]
        nodes = [[(CX - 14 + li * 14, CY + y) for y in ys] for li, ys in enumerate(layers)]
        e = "".join(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{a2}" stroke-width=".5" opacity=".7"/>' for l1, l2 in zip(nodes, nodes[1:]) for a in l1 for b in l2)
        return e + "".join(f'<circle cx="{x}" cy="{y}" r="2.4" fill="{a1}"/>' for l in nodes for x, y in l)
    if kind == "attn":
        return "".join(f'<rect x="{CX - 14 + i * 6}" y="{CY - 14 + j * 6}" width="5" height="5" fill="{a2}" opacity="{rnd.uniform(.15, 1):.2f}"/>' for i in range(5) for j in range(5))
    if kind == "cloud":
        return "".join(f'<circle cx="{CX + rnd.gauss(0, 6):.1f}" cy="{CY + rnd.gauss(0, 6):.1f}" r="1.3" fill="{rnd.choice([a1, a2])}"/>' for _ in range(40))
    if kind == "tok":
        return "".join(f'<rect x="{CX - 16 + i * 11}" y="{CY - 4}" width="9" height="8" rx="2" fill="{[a1, a2, a1][i]}"/>' for i in range(3))
    if kind == "vec":
        return f'<line x1="{CX - 12}" y1="{CY + 10}" x2="{CX + 10}" y2="{CY - 10}" stroke="{a2}" stroke-width="2.4"/><path d="M{CX + 12} {CY - 12}l-8 2l6 6z" fill="{a2}"/><circle cx="{CX - 12}" cy="{CY + 10}" r="2.4" fill="{a1}"/>'
    if kind == "graph":
        pts = [(CX + 13 * math.cos(k * 1.257), CY + 13 * math.sin(k * 1.257)) for k in range(5)] + [(CX, CY)]
        return "".join(f'<line x1="{pts[i][0]:.1f}" y1="{pts[i][1]:.1f}" x2="{pts[j][0]:.1f}" y2="{pts[j][1]:.1f}" stroke="{a2}" stroke-width=".8"/>' for i in range(6) for j in range(i + 1, 6) if rnd.random() < .5 or j == 5) + "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.6" fill="{a1}"/>' for x, y in pts)
    if kind == "db":
        return "".join(f'<ellipse cx="{CX}" cy="{CY - 9 + k * 7}" rx="11" ry="3.5" fill="{a1 if k == 0 else c["b2"]}" stroke="{a2}" stroke-width="1.2"/>' for k in (3, 2, 1, 0))
    if kind == "grid":
        return "".join(f'<rect x="{CX - 14 + i * 7}" y="{CY - 12 + j * 6}" width="6" height="5" fill="{a2 if j == 0 else a1}" opacity="{1 if j == 0 else .6}"/>' for i in range(4) for j in range(4))
    if kind == "bits":
        return glyph("0110\n", c, 9).replace("0110\n", "0110") + f'<text x="{CX}" y="{CY + 10}" font-size="9" font-weight="700" text-anchor="middle" font-family="monospace" fill="{a1}">1001</text>'
    if kind == "chip":
        pins = "".join(f'<rect x="{CX - 9 + k * 5}" y="{CY - 16}" width="2" height="5" fill="{a2}"/><rect x="{CX - 9 + k * 5}" y="{CY + 11}" width="2" height="5" fill="{a2}"/>' for k in range(4))
        return pins + f'<rect x="{CX - 11}" y="{CY - 11}" width="22" height="22" rx="3" fill="{a1}"/><rect x="{CX - 5}" y="{CY - 5}" width="10" height="10" fill="{c["b2"]}"/>'
    if kind == "prompt":
        return f'<text x="{CX}" y="{CY + 1}" font-size="14" font-weight="700" text-anchor="middle" dominant-baseline="central" font-family="monospace" fill="{a2}">›_</text>'
    if kind == "ledger":
        return "".join(f'<line x1="{CX - 11}" y1="{CY - 10 + k * 5}" x2="{CX + 11}" y2="{CY - 10 + k * 5}" stroke="{a2 if k else a1}" stroke-width="{2 if k == 0 else 1}"/>' for k in range(5)) + f'<rect x="{CX - 13}" y="{CY - 14}" width="26" height="28" rx="2" fill="none" stroke="{a2}" stroke-width="1.2"/>'
    if kind == "wave":
        return f'<path d="M{CX - 17} {CY}q4.25 -12 8.5 0t8.5 0t8.5 0t8.5 0" fill="none" stroke="{a2}" stroke-width="2.4"/>'
    if kind == "cluster":
        return "".join(f'<circle cx="{cx + rnd.gauss(0, 2.2):.1f}" cy="{cy + rnd.gauss(0, 2.2):.1f}" r="1.3" fill="{col}"/>' for cx, cy, col in ((CX - 8, CY - 5, a1), (CX + 8, CY - 4, a2), (CX, CY + 8, "#FFFFFF")) for _ in range(9))
    if kind == "zip":
        return "".join(f'<rect x="{CX - 3 + (k % 2) * 3}" y="{CY - 14 + k * 3.5}" width="3" height="2.4" fill="{a2}"/>' for k in range(8)) + f'<rect x="{CX - 4}" y="{CY + 13}" width="8" height="4" rx="1" fill="{a1}"/>'
    return glyph(kind, c)


def concepts():
    out = []
    add = lambda cat, name, c, motif: out.append(dict(cat=cat, name=name, palette=c, motif=motif))
    for i, (n, g) in enumerate(T.KNOWLEDGE):
        add("knowledge", n, palette(i / len(T.KNOWLEDGE) * 330), ("g", g))
    for n, g, h in T.LANGUAGES:
        add("languages", n, palette(h, 0.6), ("g", g))
    for i, (n, g, y) in enumerate(T.ERAS):
        add("eras", n, palette(30 + i * 19, 0.45), ("g", g))
    for i, d in enumerate(T.DECADES):
        add("years", d + "s", palette(i * 26, 0.6), ("g", d))
    for i, (d, y) in enumerate(T.FUTURE):
        add("years", d, palette(250 + i * 25, 0.7, dark=True), ("g", d))
    for n, hr, h in T.HOURS:
        add("time", n, palette(h, 0.6, dark=hr in (21, 0)), ("clock", hr))
    for i, (n, g) in enumerate(T.ZODIAC):
        add("time", n, palette(i * 30, 0.5), ("g", g))
    for n, g, h in T.SEASONS:
        add("time", n, palette(h, 0.55), ("g", g))
    for n, c1, c2, extra in T.PLANETS:
        add("space", n, dict(palette(hue_of(n), 0.35, dark=True), a1=c1, a2=c2), ("planet", c1, c2, extra))
    for n, k in T.SPACE:
        add("space", n, palette(230 + hue_of(n) % 70, 0.55, dark=True), ("p", k) if k.isascii() else ("g", k))
    for n, lat, lon, code in T.PLACES:
        add("places", n, palette(lon + 180, 0.5), ("globe", lat, lon, code))
    for n, g, t in T.CLIMATES:
        add("climates", n, palette(220 - (t + 30) * 3.2, 0.6), ("g", g))
    for i, (n, k) in enumerate(T.AI_DATA):
        add("ai-data", n, palette(170 + i * 9, 0.55, dark=True), ("p", k) if k.isascii() else ("g", k))
    for n, g, h in T.CULTURES:
        add("cultures", n, palette(h, 0.5), ("g", g))
    return out


def motif_svg(m, c, seed):
    kind = m[0]
    if kind == "g":
        return glyph(m[1], c)
    if kind == "planet":
        return planet(m[1], m[2], m[3], f"pl{seed}")
    if kind == "globe":
        return globe(m[1], m[2], c, m[3])
    if kind == "clock":
        return clock(m[1], c)
    return proc(m[1], c, seed)


def make(concept, style, seed):
    rnd = random.Random(f"{concept['name']}:{style}:{seed}")
    shape = dict(g=11.5, L=14, r=32, w=13, curl=12, cap="round") if style == "flat" else dict(
        g=round(rnd.uniform(9, 14), 1), L=round(rnd.uniform(11, 17), 1), r=round(rnd.uniform(30, 34), 1), w=round(rnd.uniform(11, 15), 1), curl=round(rnd.uniform(9, 14), 1), cap=rnd.choice(["round", "butt"]))
    spec = dict(theme=concept["name"], trend=concept["cat"], seed=seed, renderer=style, palette=concept["palette"], center="none", shape=shape, prompt="")
    body = engine.render(spec)
    k = body.rfind("</g></svg>")
    mot = f'<g transform="translate({CX} {CY}) scale(1.3) translate({-CX} {-CY})">{motif_svg(concept["motif"], concept["palette"], seed)}</g>'
    return body[:k] + mot + body[k:], spec


def main(variants=3):
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for ci, con in enumerate(concepts()):
        styles = [("flat", 0)] + [(s, v + 1) for v, s in enumerate(random.Random(con["name"]).sample(VARIANT_STYLES, variants))]
        for style, seed in styles:
            svg, spec = make(con, style, seed)
            name = f"{con['cat']}-{con['name']}-{style}.svg"
            (OUT / name).write_text(svg)
            rows.append(dict(spec, cat=con["cat"], name=con["name"], motif=list(con["motif"]), file=f"emoji/{name}", canonical=style == "flat", order=ci))
    (OUT / "manifest.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    cats = {}
    for r in rows:
        if r["canonical"]:
            cats.setdefault(r["cat"], []).append(r)
    html = "".join(f"<h2>{k} · {len(v)}</h2><div class='g'>" + "".join(f'<figure><img src="{r["file"][6:]}"><figcaption>{r["name"]}</figcaption></figure>' for r in v) + "</div>" for k, v in cats.items())
    (OUT / "index.html").write_text('<!doctype html><meta charset="utf-8"><title>Omega emoji</title><style>body{margin:0;background:#eee;font:600 15px sans-serif;padding:14px}.g{display:grid;grid-template-columns:repeat(auto-fill,84px);gap:8px}figure{margin:0;font:10px monospace;text-align:center}img{width:84px;border-radius:19px}</style>' + html)
    print(len(rows), "icons", len(cats), "categories", sum(r["canonical"] for r in rows), "concepts")


if __name__ == "__main__":
    main()
