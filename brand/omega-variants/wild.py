#!/usr/bin/env python3
import math
from pathlib import Path

from gen import SEASONS, center, omega

OUT = Path(__file__).parent / "wild"
SHAPE = dict(g=11.5, L=14, r=32, curl=12)


def polyline(g=11.5, L=14, r=32, y0=15, n=60):
    l, rt = 50 - g, 50 + g
    top = y0 + 12
    cy = top + math.sqrt(r * r - g * g)
    pts = [(l - L - 8 + i * (L + 8) / 6, y0) for i in range(6)] + [(l, y0 + 6)]
    tl = math.atan2(top - cy, l - 50)
    tr = math.atan2(top - cy, rt - 50) - 2 * math.pi
    pts += [(50 + r * math.cos(tl + (tr - tl) * i / n), cy + r * math.sin(tl + (tr - tl) * i / n)) for i in range(n + 1)]
    pts += [(rt, y0 + 6)]
    pts += [(rt + 8 + i * (L + 8) / 6, y0) for i in range(1, 7)]
    return pts


def seg_dist(p, a, b):
    ax, ay = a
    bx, by = b
    px, py = p
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def dist(p, pts):
    return min(seg_dist(p, pts[i], pts[i + 1]) for i in range(len(pts) - 1))


PTS = polyline()
P = omega(**SHAPE)


def wrap(c, body, bg=None, defs=""):
    fill = bg or "url(#bg)"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>
<radialGradient id="bg" cx="50%" cy="40%" r="72%"><stop offset="0" stop-color="{c['b1']}"/><stop offset="1" stop-color="{c['b2']}"/></radialGradient>{defs}</defs>
<rect width="1024" height="1024" fill="{fill}"/><g transform="translate(162 140) scale(7)">{body}</g></svg>"""


def pixel(c):
    cells = []
    for gy in range(0, 100, 5):
        for gx in range(0, 100, 5):
            if dist((gx + 2.5, gy + 2.5), PTS) < 6.8:
                cells.append(f'<rect x="{gx}" y="{gy}" width="5" height="5" fill="{c["ink"]}"/>')
    flame = "".join(
        f'<rect x="{x}" y="{y}" width="5" height="5" fill="{col}"/>'
        for x, y, col in [(45, 45, c["a1"]), (45, 50, c["a1"]), (40, 55, c["a1"]), (45, 55, c["a2"]), (50, 55, c["a1"]), (40, 60, c["a1"]), (45, 60, c["a2"]), (50, 60, c["a1"]), (45, 65, c["a1"])]
    )
    return wrap(c, "".join(cells) + flame)


def halftone(c):
    dots = []
    for gy in range(0, 100, 4):
        for gx in range(0, 100, 4):
            d = dist((gx + 2, gy + 2), PTS)
            if d < 10:
                dots.append(f'<circle cx="{gx + 2}" cy="{gy + 2}" r="{max(0.3, 2.2 * (1 - d / 10)):.2f}" fill="{c["ink"]}"/>')
    return wrap(c, "".join(dots) + center("flame", c))


def mosaic(c):
    tiles = []
    for i, (x, y) in enumerate(PTS[::2]):
        col = [c["ink"], c["a2"], c["ink"], c["a1"]][i % 4]
        tiles.append(f'<rect x="{x - 3.2:.1f}" y="{y - 3.2:.1f}" width="6.4" height="6.4" rx="1" fill="{col}" transform="rotate({i * 17 % 30 - 15} {x:.1f} {y:.1f})"/>')
    return wrap(c, "".join(tiles) + center("dot", c))


def constellation(c):
    stars = PTS[::5]
    lines = "".join(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c["ink"]}" stroke-width=".5" opacity=".6"/>' for a, b in zip(stars, stars[1:]))
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{1.6 + (i % 3) * 0.7}" fill="{c["ink"]}"/>' for i, (x, y) in enumerate(stars))
    return wrap(dict(c, b1="#141633", b2="#05060F"), lines + dots + center("spark", c))


def negative(c):
    body = f'<rect x="4" y="4" width="92" height="92" rx="22" fill="{c["ink"]}" mask="url(#m)"/>{center("flame", c)}'
    defs = f'<mask id="m"><rect x="0" y="0" width="100" height="100" fill="#fff"/><path d="{P}" fill="none" stroke="#000" stroke-width="13" stroke-linecap="round"/></mask>'
    return wrap(c, body, defs=defs)


def rings(c):
    body = "".join(
        f'<path d="{P}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
        for w, col in [(24, c["a1"]), (19, c["ink"]), (14, c["b2"]), (9, c["a2"]), (4, c["b2"])]
    )
    return wrap(c, body)


def sunburst(c):
    rays = "".join(
        f'<path d="M50 60L{50 + 80 * math.cos(math.radians(a)):.1f} {60 + 80 * math.sin(math.radians(a)):.1f}L{50 + 80 * math.cos(math.radians(a + 7)):.1f} {60 + 80 * math.sin(math.radians(a + 7)):.1f}Z" fill="{c["a2"]}" opacity=".18"/>'
        for a in range(0, 360, 15)
    )
    return wrap(c, rays + f'<path d="{P}" fill="none" stroke="{c["ink"]}" stroke-width="13" stroke-linecap="round"/>' + center("dot", c))


def extrude(c):
    steps = "".join(f'<path d="{P}" fill="none" stroke="{c["sh"]}" stroke-width="13" stroke-linecap="round" transform="translate({i * 0.6:.1f} {i * 0.6:.1f})" opacity="{0.4 + i / 20:.2f}"/>' for i in range(10, 0, -1))
    return wrap(c, steps + f'<path d="{P}" fill="none" stroke="{c["ink"]}" stroke-width="13" stroke-linecap="round"/>' + center("flame", c))


def brush(c):
    defs = '<filter id="br"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>'
    body = f'<g filter="url(#br)"><path d="{P}" fill="none" stroke="{c["ink"]}" stroke-width="14" stroke-linecap="round"/><path d="M50 40C58 50 63 56 62 63A12 12 0 0 1 38 63C38 55 43 49 50 40Z" fill="{c["a1"]}"/></g>'
    return wrap(c, body, defs=defs)


def stencil(c):
    body = f'<path d="{P}" fill="none" stroke="{c["ink"]}" stroke-width="15" stroke-dasharray="26 3" pathLength="200"/>' + center("seed", c)
    return wrap(c, body)


def split(c):
    defs = '<clipPath id="L"><rect x="0" y="0" width="50" height="100"/></clipPath><clipPath id="R"><rect x="50" y="0" width="50" height="100"/></clipPath>'
    body = (
        f'<path d="{P}" fill="none" stroke="{c["ink"]}" stroke-width="13" stroke-linecap="round" clip-path="url(#L)"/>'
        f'<path d="{P}" fill="none" stroke="{c["a1"]}" stroke-width="13" stroke-linecap="round" clip-path="url(#R)"/>'
        + center("dot", c)
    )
    bg = "url(#sp)"
    defs += f'<linearGradient id="sp"><stop offset=".5" stop-color="{c["b2"]}"/><stop offset=".5" stop-color="{c["b1"]}"/></linearGradient>'
    return wrap(c, body, bg=bg, defs=defs)


def orbit(c):
    body = f'<path d="{P}" fill="none" stroke="{c["ink"]}" stroke-width="13" stroke-linecap="round"/>'
    body += f'<ellipse cx="50" cy="52" rx="46" ry="14" fill="none" stroke="{c["a2"]}" stroke-width="1.6" transform="rotate(-18 50 52)"/>'
    body += f'<circle cx="92" cy="40" r="3.2" fill="{c["a1"]}"><animateMotion dur="5s" repeatCount="indefinite" path="M-42 12a46 14 -18 1 0 92 -30a46 14 -18 1 0 -92 30"/></circle>'
    return wrap(c, body + center("flame", c))


RENDERERS = [pixel, halftone, mosaic, constellation, negative, rings, sunburst, extrude, brush, stencil, split, orbit]


def main():
    OUT.mkdir(exist_ok=True)
    names = []
    for fn in RENDERERS:
        for season in ("autumn", "aegean", "summer"):
            n = f"{fn.__name__}-{season}"
            (OUT / f"{n}.svg").write_text(fn(SEASONS[season]))
            names.append(n)
    (OUT / "index.html").write_text(
        '<!doctype html><html><head><meta charset="utf-8"><title>Omega wild</title><style>'
        "body{margin:0;background:#ddd;font:12px monospace;padding:16px}div{display:grid;grid-template-columns:repeat(6,160px);gap:12px}"
        "img{width:160px;border-radius:36px}figure{margin:0}</style></head><body><div>"
        + "".join(f'<figure><img src="{n}.svg"><figcaption>{n}</figcaption></figure>' for n in names)
        + "</div></body></html>"
    )


if __name__ == "__main__":
    main()
