#!/usr/bin/env python3
import json
import math
import random
from pathlib import Path

import engine
import gen
import taxonomy as T
import wild
from emoji import FONT, hx, palette

OUT = Path(__file__).parent / "out" / "emoji"
LO, HI = -24, 124


def shape_for(rnd, base=None):
    s = dict(g=11.5, L=14, r=32, w=13, curl=12, cap="round")
    if base is None:
        return s
    return dict(g=round(rnd.uniform(9, 14), 1), L=round(rnd.uniform(11, 17), 1), r=round(rnd.uniform(30, 34), 1), w=round(rnd.uniform(11, 15), 1), curl=round(rnd.uniform(9, 14), 1), cap="round")


def resample(pts, step):
    out, carry = [], 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        seg = math.hypot(x1 - x0, y1 - y0)
        if seg == 0:
            continue
        a = math.atan2(y1 - y0, x1 - x0)
        d = carry
        while d <= seg:
            t = d / seg
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, a))
            d += step
        carry = d - seg
    return out


class Ctx:
    def __init__(self, c, s, rnd):
        self.c, self.s, self.rnd = c, s, rnd
        self.P = gen.omega(**s)
        self.pts = wild.polyline(s["g"], s["L"], s["r"])
        self.defs = [f'<path id="om" d="{self.P}"/>']

    def along(self, step):
        return resample(self.pts, step)


def stroke(x, col, w=None, extra=""):
    return f'<path d="{x.P}" fill="none" stroke="{col}" stroke-width="{w or x.s["w"]}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'


def shadowed(x, col=None, w=None):
    return stroke(x, x.c["sh"], w, 'transform="translate(0 4)"') + stroke(x, col or x.c["ink"], w)


def om_text(x, chars, font=FONT, size=9.5, col=None, weight=700):
    run = (chars + " ") * 40
    return (stroke(x, x.c["sh"], x.s["w"] + 2, 'opacity=".55"') +
            f'<text font-size="{size}" font-weight="{weight}" font-family="{font}" fill="{col or x.c["ink"]}" dominant-baseline="central">'
            f'<textPath href="#om">{run}</textPath></text>')


def om_dots(x, step=4.2, r=2.2, cols=None, jitter=0):
    cols = cols or [x.c["ink"]]
    return "".join(f'<circle cx="{px + x.rnd.gauss(0, jitter):.1f}" cy="{py + x.rnd.gauss(0, jitter):.1f}" r="{r}" fill="{cols[i % len(cols)]}"/>' for i, (px, py, _) in enumerate(x.along(step)))


def om_cloud(x, n=420, spread=3.2):
    pts = x.along(1.2)
    return "".join(f'<circle cx="{p[0] + x.rnd.gauss(0, spread):.1f}" cy="{p[1] + x.rnd.gauss(0, spread):.1f}" r=".75" fill="{x.c["ink"] if x.rnd.random() < .8 else x.c["a1"]}" opacity=".85"/>' for p in (x.rnd.choice(pts) for _ in range(n)))


def om_nodes(x):
    nodes = x.along(9)
    e = "".join(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{x.c["a2"]}" stroke-width=".7" opacity=".7"/>'
                for i, a in enumerate(nodes) for b in nodes[i + 1:i + 4])
    return e + "".join(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{2.6 if i % 3 else 3.6}" fill="{x.c["a1"] if i % 3 else x.c["ink"]}"/>' for i, p in enumerate(nodes))


def offset(p, d):
    return p[0] - d * math.sin(p[2]), p[1] + d * math.cos(p[2])


def om_helix(x, amp=5.5, wl=14):
    pts = x.along(.8)
    s1 = [offset(p, amp * math.sin(i * .8 / wl * 2 * math.pi)) for i, p in enumerate(pts)]
    s2 = [offset(p, -amp * math.sin(i * .8 / wl * 2 * math.pi)) for i, p in enumerate(pts)]
    rungs = "".join(f'<line x1="{s1[i][0]:.1f}" y1="{s1[i][1]:.1f}" x2="{s2[i][0]:.1f}" y2="{s2[i][1]:.1f}" stroke="{[x.c["a1"], x.c["a2"]][i // 4 % 2]}" stroke-width="1.3"/>' for i in range(0, len(pts), 4))
    pl = lambda s, col: f'<polyline points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in s)}" fill="none" stroke="{col}" stroke-width="2.4" stroke-linecap="round"/>'
    return rungs + pl(s1, x.c["ink"]) + pl(s2, x.c["a1"])


def om_wave(x, amp=4.5, wl=10, lines=1):
    pts = x.along(.6)
    out = ""
    for k in range(lines):
        ph = k * 1.3
        w = [offset(p, amp * math.sin(i * .6 / wl * 2 * math.pi + ph)) for i, p in enumerate(pts)]
        out += f'<polyline points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in w)}" fill="none" stroke="{[x.c["ink"], x.c["a1"], x.c["a2"]][k % 3]}" stroke-width="{2.6 if k == 0 else 1.4}" stroke-linecap="round"/>'
    return out


def om_layers(x, n=5):
    w = x.s["w"] + 6
    cols = [x.c["a1"], x.c["ink"], x.c["b2"], x.c["a2"], x.c["b2"], x.c["ink"]]
    return "".join(stroke(x, cols[i % len(cols)], w - i * (w / n)) for i in range(n))


def om_angular(x, k=9):
    pts = x.pts[:: max(1, len(x.pts) // k)] + [x.pts[-1]]
    d = " ".join(f"{a:.1f},{b:.1f}" for a, b in pts)
    return (f'<polyline points="{d}" fill="none" stroke="{x.c["sh"]}" stroke-width="{x.s["w"]}" stroke-linejoin="miter" transform="translate(0 4)"/>'
            f'<polyline points="{d}" fill="none" stroke="{x.c["ink"]}" stroke-width="{x.s["w"]}" stroke-linejoin="miter"/>')


def om_tiles(x, size=5.6):
    cols = [x.c["ink"], x.c["a2"], x.c["a1"], x.c["ink"]]
    return "".join(f'<rect x="{-size / 2}" y="{-size / 2}" width="{size}" height="{size}" fill="{cols[i % 4]}" transform="translate({p[0]:.1f} {p[1]:.1f}) rotate({math.degrees(p[2]):.0f})"/>' for i, p in enumerate(x.along(size + .8)))


def om_items(x, kind, step=7):
    out = []
    for i, (px, py, a) in enumerate(x.along(step)):
        ang = math.degrees(a)
        t = f'translate({px:.1f} {py:.1f}) rotate({ang + x.rnd.uniform(-25, 25):.0f})'
        col = [x.c["ink"], x.c["a2"], x.c["a1"]][i % 3]
        if kind == "leaf":
            out.append(f'<path d="M-5 0Q0 -5 5 0Q0 5 -5 0Z" fill="{col}" transform="{t}"/>')
        elif kind == "flake":
            out.append(f'<g transform="{t}" stroke="{col}" stroke-width="1.1">' + "".join(f'<line x1="0" y1="0" x2="{4.5 * math.cos(k * math.pi / 3):.1f}" y2="{4.5 * math.sin(k * math.pi / 3):.1f}"/>' for k in range(6)) + "</g>")
        elif kind == "flame":
            out.append(f'<path d="M0 -6C3 -2 4 1 3 3A3 3 0 0 1 -3 3C-4 1 -3 -2 0 -6Z" fill="{[x.c["a1"], x.c["a2"]][i % 2]}" transform="translate({px:.1f} {py:.1f})"/>')
        elif kind == "drop":
            out.append(f'<path d="M0 -4C2 -1 2.6 .6 2.6 1.6A2.6 2.6 0 0 1 -2.6 1.6C-2.6 .6 -2 -1 0 -4Z" fill="{col}" transform="translate({px:.1f} {py:.1f})"/>')
        elif kind == "star":
            out.append(f'<path d="M0 -3.6L1 -1L3.6 0L1 1L0 3.6L-1 1L-3.6 0L-1 -1Z" fill="{col}" transform="translate({px:.1f} {py:.1f}) scale({x.rnd.uniform(.6, 1.3):.2f})"/>')
        elif kind == "hex":
            out.append(f'<polygon points="' + " ".join(f"{3.4 * math.cos(k * math.pi / 3):.1f},{3.4 * math.sin(k * math.pi / 3):.1f}" for k in range(6)) + f'" fill="none" stroke="{col}" stroke-width="1.2" transform="{t}"/>')
        elif kind == "gear":
            out.append(f'<circle r="3.2" fill="none" stroke="{col}" stroke-width="2.2" stroke-dasharray="1.4 1.1" transform="{t}"/>')
        elif kind == "bit":
            out.append(f'<text font-size="5.5" font-family="monospace" font-weight="700" fill="{col}" text-anchor="middle" dominant-baseline="central" transform="{t}">{x.rnd.choice("01")}</text>')
        elif kind == "token":
            out.append(f'<rect x="-3.2" y="-2.4" width="6.4" height="4.8" rx="1.2" fill="{col}" transform="{t}"/>')
        elif kind == "grain":
            out.append(f'<circle r="{x.rnd.uniform(.6, 1.6):.1f}" fill="{col}" transform="translate({px + x.rnd.gauss(0, 2):.1f} {py + x.rnd.gauss(0, 2):.1f})"/>')
    return "".join(out)


def om_plot(x):
    return (f'<line x1="-10" y1="90" x2="112" y2="90" stroke="{x.c["a2"]}" stroke-width=".8"/><line x1="0" y1="0" x2="0" y2="100" stroke="{x.c["a2"]}" stroke-width=".8"/>'
            f'<path d="{x.P}L{100 - 50 + x.s["g"] + x.s["L"] + 8} 90L{50 - x.s["g"] - x.s["L"] - 8} 90Z" fill="{x.c["a1"]}" opacity=".25"/>'
            + shadowed(x, x.c["ink"], 3.2) + om_dots(x, 12, 1.8, [x.c["a1"]]))


def om_construct(x):
    s = x.s
    cy = 15 + s["curl"] + math.sqrt(max(1, s["r"] ** 2 - s["g"] ** 2))
    lines = f'<circle cx="50" cy="{cy:.1f}" r="{s["r"]}" fill="none" stroke="{x.c["a2"]}" stroke-width=".5" stroke-dasharray="2 2"/>'
    lines += f'<line x1="50" y1="0" x2="50" y2="100" stroke="{x.c["a2"]}" stroke-width=".4"/><line x1="0" y1="{cy:.1f}" x2="100" y2="{cy:.1f}" stroke="{x.c["a2"]}" stroke-width=".4"/>'
    lines += f'<circle cx="50" cy="{cy:.1f}" r="1.6" fill="{x.c["a1"]}"/><line x1="50" y1="{cy:.1f}" x2="{50 + s["r"] * .7:.1f}" y2="{cy + s["r"] * .7:.1f}" stroke="{x.c["a1"]}" stroke-width=".7"/>'
    return lines + shadowed(x, x.c["ink"], s["w"] * .7)


def om_orbit(x, moons=3):
    o = shadowed(x)
    for k in range(moons):
        rx, ry, rot = 44 + k * 7, 12 + k * 3, -18 + k * 22
        o += f'<ellipse cx="50" cy="55" rx="{rx}" ry="{ry}" fill="none" stroke="{x.c["a2"]}" stroke-width=".7" opacity=".7" transform="rotate({rot} 50 55)"/>'
        a = x.rnd.uniform(0, 6.28)
        px, py = rx * math.cos(a), ry * math.sin(a)
        r = math.radians(rot)
        o += f'<circle cx="{50 + px * math.cos(r) - py * math.sin(r):.1f}" cy="{55 + px * math.sin(r) + py * math.cos(r):.1f}" r="{2.2 + k * .6:.1f}" fill="{x.c["a1"]}"/>'
    return o


def om_brush(x):
    x.defs.append('<filter id="brush"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="4.5"/></filter>')
    return f'<g filter="url(#brush)">{stroke(x, x.c["ink"], x.s["w"] + 1)}</g><rect x="68" y="76" width="12" height="12" rx="1.5" fill="{x.c["a1"]}"/>'


def om_gradient(x, stops):
    sid = "omg"
    x.defs.append(f'<linearGradient id="{sid}" x1="0" y1="0" x2="1" y2="1">' + "".join(f'<stop offset="{i / (len(stops) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(stops)) + "</linearGradient>")
    return stroke(x, x.c["sh"], None, 'transform="translate(0 4)"') + stroke(x, f"url(#{sid})")


def rect_bg(col):
    return f'<rect x="{LO}" y="{LO}" width="{HI - LO}" height="{HI - LO}" fill="{col}"/>'


def bg_base(x):
    x.defs.append(f'<radialGradient id="bgr" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="{x.c["b1"]}"/><stop offset="1" stop-color="{x.c["b2"]}"/></radialGradient>')
    return f'<rect x="{LO}" y="{LO}" width="{HI - LO}" height="{HI - LO}" fill="url(#bgr)"/>'


def bg_lines(x, kind):
    c, rnd, o = x.c, x.rnd, []
    col, faint = c["a2"], 'opacity=".22"'
    if kind == "graph":
        o += [f'<line x1="{v}" y1="{LO}" x2="{v}" y2="{HI}" stroke="{col}" stroke-width="{.5 if v % 20 else .9}" {faint}/><line x1="{LO}" y1="{v}" x2="{HI}" y2="{v}" stroke="{col}" stroke-width="{.5 if v % 20 else .9}" {faint}/>' for v in range(-20, 124, 5)]
    elif kind == "polar":
        o += [f'<circle cx="50" cy="55" r="{r}" fill="none" stroke="{col}" stroke-width=".5" {faint}/>' for r in range(8, 110, 8)]
        o += [f'<line x1="50" y1="55" x2="{50 + 90 * math.cos(k * math.pi / 12):.1f}" y2="{55 + 90 * math.sin(k * math.pi / 12):.1f}" stroke="{col}" stroke-width=".4" {faint}/>' for k in range(24)]
    elif kind == "field":
        for k in range(-6, 7):
            o.append(f'<path d="M-24 {55 + k * 9}C20 {55 + k * 2} 80 {55 + k * 2} 124 {55 + k * 9}" fill="none" stroke="{col}" stroke-width=".7" {faint}/>')
    elif kind == "warp":
        for v in range(-20, 124, 8):
            o.append(f'<path d="M{v} -24Q{v + (50 - v) * .35} 55 {v} 124" fill="none" stroke="{col}" stroke-width=".6" {faint}/>')
            o.append(f'<path d="M-24 {v}Q50 {v + (55 - v) * .35} 124 {v}" fill="none" stroke="{col}" stroke-width=".6" {faint}/>')
    elif kind == "stars":
        o += [f'<circle cx="{rnd.uniform(LO, HI):.1f}" cy="{rnd.uniform(LO, HI):.1f}" r="{rnd.choice([.3, .4, .5, .8, 1.1])}" fill="#fff" opacity="{rnd.uniform(.3, 1):.2f}"/>' for _ in range(160)]
    elif kind == "nebula":
        x.defs.append('<filter id="neb"><feGaussianBlur stdDeviation="9"/></filter>')
        o += [f'<circle cx="{rnd.uniform(-10, 110):.0f}" cy="{rnd.uniform(-10, 110):.0f}" r="{rnd.uniform(15, 35):.0f}" fill="{rnd.choice([c["a1"], c["a2"], c["b1"]])}" opacity=".45" filter="url(#neb)"/>' for _ in range(9)]
        o += [f'<circle cx="{rnd.uniform(LO, HI):.1f}" cy="{rnd.uniform(LO, HI):.1f}" r="{rnd.choice([.3, .5, .9])}" fill="#fff"/>' for _ in range(90)]
    elif kind == "meander":
        for yb in (-14, 104):
            o.append(f'<rect x="{LO}" y="{yb - 7}" width="{HI - LO}" height="14" fill="{c["sh"]}" opacity=".5"/>')
            o += [f'<path d="M{v} {yb + 4}v-8h8v6h-4v-2" fill="none" stroke="{col}" stroke-width="1.4"/>' for v in range(-22, 124, 10)]
    elif kind == "koru":
        for _ in range(14):
            cx, cy, r = rnd.uniform(-10, 110), rnd.uniform(-10, 110), rnd.uniform(5, 11)
            o.append(f'<path d="M{cx} {cy}m{-r} 0a{r} {r} 0 1 1 {r} {r}a{r * .6:.1f} {r * .6:.1f} 0 1 1 {-r * .5:.1f} {-r * .5:.1f}" fill="none" stroke="{col}" stroke-width="1.6" {faint}/>')
    elif kind == "fret":
        for yb in (-12, 102):
            o += [f'<path d="M{v} {yb + 6}h10v-12h-6v6h-2" fill="none" stroke="{col}" stroke-width="1.6" opacity=".5"/>' for v in range(-22, 124, 12)]
    elif kind == "stars8":
        for gx in range(-20, 124, 24):
            for gy in range(-20, 124, 24):
                pts = " ".join(f"{gx + (10 if k % 2 == 0 else 4.2) * math.cos(k * math.pi / 8):.1f},{gy + (10 if k % 2 == 0 else 4.2) * math.sin(k * math.pi / 8):.1f}" for k in range(16))
                o.append(f'<polygon points="{pts}" fill="none" stroke="{col}" stroke-width=".9" {faint}/>')
    elif kind == "kente":
        cols = [c["a1"], c["a2"], c["sh"], c["b1"]]
        o += [f'<rect x="{v}" y="{LO}" width="6" height="{HI - LO}" fill="{cols[(v // 6) % 4]}" opacity=".35"/>' for v in range(-24, 124, 6)]
        o += [f'<rect x="{LO}" y="{v}" width="{HI - LO}" height="3" fill="{c["sh"]}" opacity=".35"/>' for v in range(-24, 124, 12)]
    elif kind == "seigaiha":
        for row, gy in enumerate(range(-20, 130, 9)):
            for gx in range(-28 + (row % 2) * 9, 130, 18):
                o += [f'<path d="M{gx - r} {gy}a{r} {r} 0 0 1 {2 * r} 0" fill="none" stroke="{col}" stroke-width=".8" {faint}/>' for r in (9, 6, 3)]
    elif kind == "dots":
        for _ in range(9):
            cx, cy = rnd.uniform(-10, 110), rnd.uniform(-10, 110)
            o += [f'<circle cx="{cx + rr * math.cos(t):.1f}" cy="{cy + rr * math.sin(t):.1f}" r=".9" fill="{col}" opacity=".5"/>' for rr in (3, 6, 9) for t in [k * 2 * math.pi / (rr * 2) for k in range(rr * 2)]]
    elif kind == "hexgrid":
        for gy in range(-20, 130, 9):
            for gx in range(-22 + (gy // 9 % 2) * 7, 130, 14):
                o.append('<polygon points="' + " ".join(f"{gx + 5 * math.cos(k * math.pi / 3 + math.pi / 6):.1f},{gy + 5 * math.sin(k * math.pi / 3 + math.pi / 6):.1f}" for k in range(6)) + f'" fill="none" stroke="{col}" stroke-width=".6" {faint}/>')
    elif kind == "lattice":
        for gx in range(-20, 130, 12):
            for gy in range(-20, 130, 12):
                o.append(f'<circle cx="{gx}" cy="{gy}" r="1.6" fill="{col}" opacity=".35"/><line x1="{gx}" y1="{gy}" x2="{gx + 12}" y2="{gy}" stroke="{col}" stroke-width=".4" opacity=".3"/><line x1="{gx}" y1="{gy}" x2="{gx}" y2="{gy + 12}" stroke="{col}" stroke-width=".4" opacity=".3"/>')
    elif kind == "rays":
        o += [f'<path d="M50 55L{50 + 120 * math.cos(math.radians(a)):.0f} {55 + 120 * math.sin(math.radians(a)):.0f}L{50 + 120 * math.cos(math.radians(a + 6)):.0f} {55 + 120 * math.sin(math.radians(a + 6)):.0f}Z" fill="{col}" opacity=".12"/>' for a in range(0, 360, 12)]
    elif kind == "dunes":
        for k in range(10):
            yb = 20 + k * 10
            o.append(f'<path d="M-24 {yb}Q10 {yb - 9} 40 {yb}T104 {yb}T168 {yb}V124H-24Z" fill="{[c["a1"], c["b1"], c["a2"]][k % 3]}" opacity=".18"/>')
    elif kind == "snow":
        o += [f'<circle cx="{rnd.uniform(LO, HI):.1f}" cy="{rnd.uniform(LO, HI):.1f}" r="{rnd.uniform(.4, 1.5):.1f}" fill="#fff" opacity=".7"/>' for _ in range(110)]
    elif kind == "rain":
        o += [f'<line x1="{(v := rnd.uniform(LO, HI)):.1f}" y1="{(w := rnd.uniform(LO, HI)):.1f}" x2="{v - 3:.1f}" y2="{w + 9:.1f}" stroke="{col}" stroke-width=".6" opacity=".5"/>' for _ in range(90)]
    elif kind == "leaves":
        o += [f'<path d="M-9 0Q0 -9 9 0Q0 9 -9 0Z" fill="{rnd.choice([c["a1"], c["b1"], c["a2"]])}" opacity=".3" transform="translate({rnd.uniform(LO, HI):.0f} {rnd.uniform(LO, HI):.0f}) rotate({rnd.uniform(0, 180):.0f}) scale({rnd.uniform(.8, 2.2):.1f})"/>' for _ in range(40)]
    elif kind == "waves":
        o += [f'<path d="M-24 {yb}q6 -4 12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0" fill="none" stroke="{col}" stroke-width=".9" {faint}/>' for yb in range(-20, 130, 7)]
    elif kind == "mountains":
        o.append(f'<path d="M-24 110L5 60L22 82L48 40L70 74L88 52L124 100V124H-24Z" fill="{c["sh"]}" opacity=".55"/><path d="M48 40L41 52L48 49L55 54Z" fill="#fff" opacity=".7"/>')
    elif kind == "topo":
        cx, cy = rnd.uniform(20, 80), rnd.uniform(20, 80)
        for k in range(1, 16):
            pts = " ".join(f"{cx + k * 6.5 * math.cos(t) * (1 + .18 * math.sin(3 * t + k)):.1f},{cy + k * 6.5 * math.sin(t) * (1 + .18 * math.cos(2 * t + k)):.1f}" for t in [i * math.pi / 30 for i in range(61)])
            o.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width=".6" {faint}/>')
    elif kind == "sunburst":
        o += [f'<line x1="50" y1="124" x2="{50 + 160 * math.cos(math.radians(a)):.0f}" y2="{124 + 160 * math.sin(math.radians(a)):.0f}" stroke="{col}" stroke-width=".8" opacity=".4"/>' for a in range(185, 356, 6)]
    elif kind == "checker":
        o += [f'<rect x="{gx}" y="{gy}" width="10" height="10" fill="{c["ink"]}" opacity=".12"/>' for gx in range(-24, 124, 10) for gy in range(-24, 124, 10) if (gx + gy) // 10 % 2 == 0]
    elif kind == "groovy":
        o += [f'<circle cx="50" cy="55" r="{r}" fill="none" stroke="{[c["a1"], c["a2"], c["sh"]][r // 9 % 3]}" stroke-width="5" opacity=".35"/>' for r in range(9, 120, 9)]
    elif kind == "synth":
        o.append(f'<rect x="{LO}" y="62" width="{HI - LO}" height="62" fill="{c["sh"]}" opacity=".8"/>')
        o += [f'<line x1="{50 + k * 6}" y1="62" x2="{50 + k * 40}" y2="124" stroke="{c["a1"]}" stroke-width=".7"/>' for k in range(-12, 13)]
        o += [f'<line x1="{LO}" y1="{62 + d}" x2="{HI}" y2="{62 + d}" stroke="{c["a1"]}" stroke-width=".7"/>' for d in (2, 6, 12, 20, 32, 48)]
        o.append(f'<circle cx="50" cy="44" r="26" fill="{c["a2"]}" opacity=".35"/>')
    elif kind == "halftone":
        o += [f'<circle cx="{gx}" cy="{gy}" r="{max(.2, 1.9 - abs(gy - 50) / 40):.2f}" fill="{col}" opacity=".35"/>' for gx in range(-22, 124, 5) for gy in range(-22, 124, 5)]
    elif kind == "gloss":
        x.defs.append('<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')
        o.append(f'<ellipse cx="50" cy="0" rx="90" ry="45" fill="url(#gl)"/>')
    elif kind == "mesh":
        x.defs.append('<filter id="msh"><feGaussianBlur stdDeviation="14"/></filter>')
        o += [f'<circle cx="{px}" cy="{py}" r="40" fill="{col_}" opacity=".7" filter="url(#msh)"/>' for (px, py), col_ in zip([(10, 10), (95, 20), (20, 95), (90, 95)], [c["a1"], c["a2"], c["b1"], c["sh"]])]
    elif kind == "circuit":
        for _ in range(26):
            px, py = rnd.choice(range(-20, 124, 8)), rnd.choice(range(-20, 124, 8))
            dx, dy = rnd.choice([(16, 0), (0, 16), (12, 12)])
            o.append(f'<path d="M{px} {py}l{dx} {dy}h{rnd.choice([8, 16, 24])}" fill="none" stroke="{col}" stroke-width=".8" opacity=".35"/><circle cx="{px}" cy="{py}" r="1.3" fill="{col}" opacity=".5"/>')
    elif kind == "matrix":
        o += [f'<text x="{gx}" y="{gy}" font-size="5" font-family="monospace" fill="{col}" opacity="{rnd.uniform(.08, .4):.2f}">{rnd.choice("01")}</text>' for gx in range(-22, 124, 5) for gy in range(-18, 124, 7)]
    elif kind == "script":
        chars = x.script
        o += [f'<text x="{rnd.uniform(LO, HI):.0f}" y="{rnd.uniform(LO, HI):.0f}" font-size="{rnd.uniform(6, 16):.0f}" font-family="{FONT}" fill="{col}" opacity="{rnd.uniform(.06, .2):.2f}">{rnd.choice(chars)}</text>' for _ in range(60)]
    elif kind == "frieze":
        chars = x.script
        for yb in (-6, 112):
            o.append(f'<rect x="{LO}" y="{yb - 9}" width="{HI - LO}" height="16" fill="{c["sh"]}" opacity=".45"/>')
            o += [f'<text x="{v}" y="{yb + 4}" font-size="10" font-family="{FONT}" fill="{col}" opacity=".8">{chars[(v // 9) % len(chars)]}</text>' for v in range(-22, 124, 9)]
    elif kind == "globe":
        o.append(globe_big(x))
    elif kind == "planet":
        o.append(f'<circle cx="50" cy="190" r="140" fill="{c["a1"]}"/>' + "".join(f'<path d="M-24 {60 + k * 6}Q50 {54 + k * 6} 124 {60 + k * 6}" fill="none" stroke="{c["a2"]}" stroke-width="{rnd.uniform(1, 4):.1f}" opacity=".35"/>' for k in range(10)))
    elif kind == "parchment":
        x.defs.append('<filter id="ptx"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .15  0 0 0 .25 0"/></filter>')
        o.append(f'<rect x="{LO}" y="{LO}" width="{HI - LO}" height="{HI - LO}" filter="url(#ptx)"/>')
    return "".join(o)


def globe_big(x):
    lat0, lon0 = x.loc
    R, cx, cy = 60, 50, 56
    la0 = math.radians(lat0)

    def proj(lat, lon):
        la, lo = math.radians(lat), math.radians(lon - lon0)
        X = math.cos(la) * math.sin(lo)
        Y = math.cos(la0) * math.sin(la) - math.sin(la0) * math.cos(la) * math.cos(lo)
        Z = math.sin(la0) * math.sin(la) + math.cos(la0) * math.cos(la) * math.cos(lo)
        return cx + R * X, cy - R * Y, Z

    def poly(pts, w=.6, op=.35):
        segs, cur = [], []
        for X, Y, Z in pts:
            if Z > 0:
                cur.append(f"{X:.1f},{Y:.1f}")
            elif cur:
                segs.append(cur)
                cur = []
        segs.append(cur)
        return "".join(f'<polyline points="{" ".join(s)}" fill="none" stroke="{x.c["a2"]}" stroke-width="{w}" opacity="{op}"/>' for s in segs if len(s) > 1)

    s = f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="{x.c["b2"]}" opacity=".6"/>'
    s += "".join(poly([proj(la, lo) for la in range(-90, 91, 3)]) for lo in range(-180, 180, 15))
    s += "".join(poly([proj(la, lo) for lo in range(-180, 181, 3)]) for la in range(-75, 76, 15))
    s += poly([proj(0, lo) for lo in range(-180, 181, 3)], 1.2, .8)
    return s


R = lambda bg, om, **kw: dict(bg=bg, om=om, **kw)

KNOWLEDGE_R = {
    "mathematics": R("graph", "construct"), "geometry": R("polar", "construct"), "calculus": R("graph", "plot"), "number-theory": R("graph", "dots"),
    "topology": R("warp", "layers"), "probability": R("halftone", "cloud"), "physics": R("field", "wave"), "quantum": R("stars", "cloud"),
    "relativity": R("warp", "orbit"), "thermodynamics": R("rays", "grad_hot"), "optics": R("rays", "layers"), "electromagnetism": R("field", "wave3"),
    "chemistry": R("hexgrid", "nodes"), "biochemistry": R("hexgrid", "helix"), "materials": R("lattice", "tiles"), "information": R("matrix", "bits"),
    "computation": R("circuit", "nodes"), "cryptography": R("matrix", "text_hex"), "biophysics": R("rays", "hexes"), "biology": R("leaves", "helix"),
    "medicine": R("hexgrid", "helix"), "neuroscience": R("nebula", "nodes"), "ecology": R("leaves", "leaf"), "evolution": R("topo", "layers"),
    "cosmology": R("nebula", "orbit"), "astronomy": R("stars", "orbit"), "geology": R("dunes", "layers"), "oceanography": R("waves", "wave"),
    "meteorology": R("rain", "wave3"), "mind": R("nebula", "cloud"), "philosophy": R("parchment", "text_word"), "logic": R("graph", "angular"),
    "ethics": R("polar", "construct"), "linguistics": R("script", "text_word"), "history": R("parchment", "brush"), "economics": R("graph", "plot"),
    "music": R("waves", "wave3"), "art": R("mesh", "brush"), "architecture": R("lattice", "angular"), "engineering": R("circuit", "gear"), "agriculture": R("dunes", "grain"),
}
CLIMATE_R = {"polar": R("snow", "flake"), "tundra": R("snow", "grain"), "alpine": R("mountains", "angular"), "boreal": R("leaves", "angular"),
             "oceanic": R("waves", "wave"), "continental": R("topo", "layers"), "temperate": R("leaves", "leaf"), "mediterranean": R("rays", "leaf"),
             "monsoon": R("rain", "drop"), "rainforest": R("leaves", "leaf"), "savanna": R("rays", "grain"), "steppe": R("dunes", "grain"),
             "desert": R("dunes", "grad_hot"), "volcanic": R("rays", "flame"), "reef": R("waves", "dots_reef")}
AI_R = {"neural-net": R("circuit", "nodes"), "transformer": R("matrix", "tiles"), "embedding": R("stars", "cloud"), "token": R("circuit", "token"),
        "vector": R("graph", "angular"), "graph": R("polar", "nodes"), "database": R("lattice", "layers"), "dataset": R("graph", "tiles"),
        "bits": R("matrix", "bits"), "chip": R("circuit", "angular"), "agent": R("circuit", "orbit"), "prompt": R("matrix", "text_prompt"),
        "search": R("polar", "construct"), "citation": R("parchment", "text_word"), "ledger": R("graph", "token"), "signal": R("graph", "wave3"),
        "cluster": R("halftone", "cloud"), "compression": R("matrix", "tiles")}
CULTURE_R = {"greek": R("meander", "angular"), "roman": R("parchment", "text_spqr"), "egyptian": R("frieze", "grad_gold"), "mesopotamian": R("frieze", "angular"),
             "persian": R("stars8", "tiles"), "indian": R("rays", "text_word"), "chinese": R("seigaiha", "brush"), "japanese": R("seigaiha", "brush"),
             "korean": R("seigaiha", "layers"), "tibetan": R("rays", "text_word"), "khmer": R("frieze", "layers"), "polynesian": R("koru", "wave"),
             "maori": R("koru", "layers"), "aboriginal": R("dots", "dots"), "maya": R("fret", "angular"), "aztec": R("fret", "tiles"), "inca": R("fret", "angular"),
             "andean": R("kente", "angular"), "navajo": R("fret", "angular"), "inuit": R("snow", "angular"), "norse": R("frieze", "angular"),
             "celtic": R("koru", "layers"), "slavic": R("kente", "tiles"), "hebrew": R("parchment", "text_word"), "arabic": R("stars8", "text_word"),
             "ethiopian": R("kente", "tiles"), "yoruba": R("kente", "dots"), "zulu": R("kente", "angular"), "swahili": R("waves", "dots"), "andalusian": R("stars8", "tiles")}
CULTURE_SCRIPT = {"greek": "ΑΒΓΔΩ", "roman": "SPQR", "egyptian": "𓂀𓆣𓋹𓁹𓃭𓅓", "mesopotamian": "𒀭𒀸𒁹𒂗", "indian": "ॐअक", "tibetan": "ཀཁགཨོཾ",
                  "khmer": "កខគ", "norse": "ᚠᚢᚦᚨᚱᚲ", "hebrew": "אבגדה", "arabic": "ابتثج", "chinese": "道天地人", "japanese": "あいう", "korean": "한글"}
YEAR_R = {1900: ("parchment", "brush"), 1910: ("parchment", "layers"), 1920: ("sunburst", "deco"), 1930: ("sunburst", "grad_gold"),
          1940: ("halftone", "angular"), 1950: ("checker", "sticker"), 1960: ("groovy", "tiles"), 1970: ("groovy", "layers"),
          1980: ("synth", "neon"), 1990: ("halftone", "riso"), 2000: ("gloss", "chrome"), 2010: ("base", "flat"), 2020: ("mesh", "glass"),
          2030: ("circuit", "holo"), 2050: ("stars", "nodes"), 2100: ("nebula", "orbit"), 2500: ("nebula", "cloud"), 3000: ("stars", "constellation")}
ERA_R = {"deep-time": R("topo", "layers"), "stone-age": R("dunes", "stone"), "bronze-age": R("rays", "grad_bronze"), "ancient-egypt": R("frieze", "grad_gold"),
         "classical-greece": R("meander", "pottery"), "roman": R("parchment", "text_spqr"), "han-dynasty": R("seigaiha", "brush"), "islamic-golden-age": R("stars8", "grad_gold"),
         "medieval": R("parchment", "illum"), "renaissance": R("parchment", "construct"), "scientific-revolution": R("polar", "orbit"), "enlightenment": R("rays", "grad_gold"),
         "industrial": R("lattice", "gear"), "atomic": R("stars", "orbit"), "space-age": R("stars", "orbit"), "digital": R("matrix", "pixel"), "ai-age": R("circuit", "nodes")}
ERA_SCRIPT = {"ancient-egypt": "𓂀𓆣𓋹𓁹", "classical-greece": "ΑΒΓΔ", "roman": "SPQR"}
TIME_R = {"dawn": R("rays", "grad_dawn"), "morning": R("rays", "flat"), "noon": R("rays", "grad_hot"), "afternoon": R("dunes", "flat"),
          "dusk": R("synth", "grad_dawn"), "night": R("stars", "flat"), "midnight": R("stars", "constellation")}
SEASON_R = {"winter": R("snow", "flake"), "spring": R("leaves", "leaf"), "summer": R("rays", "grad_hot"), "autumn": R("leaves", "leaf")}
SPACE_R = {"galaxy": R("nebula", "cloud"), "nebula": R("nebula", "layers"), "black-hole": R("stars", "blackhole"), "comet": R("stars", "comet"),
           "star": R("rays", "star"), "supernova": R("rays", "stars_om"), "constellation": R("stars", "constellation"), "asteroid": R("stars", "stone"),
           "satellite": R("stars", "orbit"), "rocket": R("stars", "flame"), "space-station": R("stars", "angular"), "telescope": R("stars", "construct"),
           "aurora": R("stars", "wave3"), "eclipse": R("stars", "eclipse"), "orbit": R("stars", "orbit")}


def omega_for(x, kind, con):
    c = x.c
    if kind == "construct":
        return om_construct(x)
    if kind == "plot":
        return om_plot(x)
    if kind == "dots":
        return om_dots(x, 3.6, 1.8, [c["ink"], c["a1"], c["a2"]])
    if kind == "dots_reef":
        return om_dots(x, 3, 2.2, [c["a1"], c["a2"], "#FF7A8A", c["ink"]], .8)
    if kind == "layers":
        return om_layers(x)
    if kind == "cloud":
        return om_cloud(x)
    if kind == "wave":
        return om_wave(x)
    if kind == "wave3":
        return om_wave(x, 4, 9, 3)
    if kind == "nodes":
        return om_nodes(x)
    if kind == "helix":
        return om_helix(x)
    if kind == "tiles":
        return om_tiles(x)
    if kind == "angular":
        return om_angular(x)
    if kind == "brush":
        return om_brush(x)
    if kind == "orbit":
        return om_orbit(x)
    if kind in ("leaf", "flake", "flame", "drop", "grain", "gear", "bit", "token", "hex"):
        base = stroke(x, c["sh"], x.s["w"] * .5, 'opacity=".6"') if kind not in ("grain",) else ""
        step = {"grain": 1.6, "bit": 4.6, "flame": 5.2, "drop": 5}.get(kind, 6.5)
        return base + om_items(x, kind, step)
    if kind == "hexes":
        return om_items(x, "hex", 5.5) + stroke(x, c["a1"], 2)
    if kind == "bits":
        return om_items(x, "bit", 4.4)
    if kind.startswith("grad_"):
        stops = dict(grad_hot=["#FFF1B8", "#FFB627", "#E8552A", "#8E1E12"], grad_gold=["#FFF3B0", "#E8C25A", "#8A641A", "#F2D47A"],
                     grad_bronze=["#F2B07A", "#B8682E", "#5A2E12", "#D98A4A"], grad_dawn=["#FFD9A0", "#F28A8B", "#8A4A9A", "#2E2A6E"])[kind]
        return om_gradient(x, stops)
    if kind.startswith("text_"):
        word = dict(text_hex="0x3fa9c2e1b7", text_spqr="SPQR·", text_prompt="›_ ask ", text_word=x.script or con["name"])[kind]
        return om_text(x, word, size=8.5 if len(word) > 3 else 10)
    if kind == "star":
        return om_items(x, "star", 4) + stroke(x, c["a2"], 2.2)
    if kind == "stars_om":
        return om_items(x, "star", 3.2)
    if kind == "constellation":
        nodes = x.along(10)
        return "".join(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c["ink"]}" stroke-width=".7" opacity=".7"/>' for a, b in zip(nodes, nodes[1:])) + "".join(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{1.6 + (i % 3) * .8:.1f}" fill="#fff"/>' for i, p in enumerate(nodes))
    if kind == "blackhole":
        return stroke(x, c["a1"], x.s["w"] + 6, 'opacity=".35"') + stroke(x, "#000", x.s["w"]) + stroke(x, c["a2"], 1.2)
    if kind == "comet":
        return stroke(x, c["a2"], x.s["w"], 'opacity=".35" stroke-dasharray="2 3"') + om_gradient(x, ["#FFFFFF", c["a2"], c["a1"], "#00000000"])
    if kind == "eclipse":
        return stroke(x, c["a1"], x.s["w"] + 5, 'opacity=".5"') + stroke(x, "#000", x.s["w"])
    if kind == "planet_om":
        return om_gradient(x, [con["planet"][0], con["planet"][1], con["planet"][0]]) + (om_orbit(x, 1) if con["planet"][2] == "ring" else "")
    style_map = {"deco": "deco", "sticker": "sticker", "neon": "neon", "riso": "riso", "chrome": "chrome", "glass": "glass", "holo": "holo", "flat": "flat",
                 "stone": "stone", "pottery": "pottery", "illum": "metal", "pixel": "pixel"}
    return ("__style__", style_map.get(kind, "flat"))


def concept_list():
    items = []
    add = lambda cat, name, c, recipe, **kw: items.append(dict(cat=cat, name=name, palette=c, recipe=recipe, **kw))
    for i, (n, g) in enumerate(T.KNOWLEDGE):
        add("knowledge", n, palette(i / len(T.KNOWLEDGE) * 330), KNOWLEDGE_R[n], script=None)
    for n, g, h in T.LANGUAGES:
        add("languages", n, palette(h, .6), R("script", "text_word"), script=g if len(g) == 1 else g)
    for i, (n, g, y) in enumerate(T.ERAS):
        add("eras", n, palette(30 + i * 19, .45), ERA_R[n], script=ERA_SCRIPT.get(n))
    for i, d in enumerate(T.DECADES):
        bg, om = YEAR_R[int(d)]
        add("years", d + "s", palette(i * 26, .6), R(bg, om), script=None)
    for i, (d, y) in enumerate(T.FUTURE):
        bg, om = YEAR_R[y]
        add("years", d, palette(250 + i * 25, .7, dark=True), R(bg, om), script=None)
    for n, hr, h in T.HOURS:
        add("time", n, palette(h, .6, dark=hr in (21, 0)), TIME_R[n], script=None)
    for i, (n, g) in enumerate(T.ZODIAC):
        add("time", n, palette(i * 30, .5, dark=True), R("stars", "constellation"), script=None)
    for n, g, h in T.SEASONS:
        add("time", n, palette(h, .55), SEASON_R[n], script=None)
    for n, c1, c2, extra in T.PLANETS:
        add("space", n, dict(palette(220, .35, dark=True), a1=c1, a2=c2), R("planet" if n != "sun" else "rays", "planet_om"), planet=(c1, c2, extra), script=None)
    for n, k in T.SPACE:
        add("space", n, palette(230 + sum(map(ord, n)) % 70, .55, dark=True), SPACE_R[n], script=None)
    for n, lat, lon, code in T.PLACES:
        add("places", n, palette(lon + 180, .5), R("globe", "layers"), loc=(lat, lon), code=code, script=None)
    for n, g, t in T.CLIMATES:
        add("climates", n, palette(220 - (t + 30) * 3.2, .6), CLIMATE_R[n], script=None)
    for i, (n, k) in enumerate(T.AI_DATA):
        add("ai-data", n, palette(170 + i * 9, .55, dark=True), AI_R[n], script=None)
    for n, g, h in T.CULTURES:
        add("cultures", n, palette(h, .5), CULTURE_R[n], script=CULTURE_SCRIPT.get(n, g))
    return items


def render(con, variant):
    rnd = random.Random(f"{con['name']}:{variant}")
    s = shape_for(rnd, None if variant == 0 else variant)
    c = dict(con["palette"])
    if variant:
        shift = rnd.uniform(-25, 25)
        import colorsys
        def rot(h):
            r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
            hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
            return hx(hh * 360 + shift, ss, ll)
        c = {k: rot(v) for k, v in c.items()}
    x = Ctx(c, s, rnd)
    x.script = con.get("script") or "AaΩאअ文عあ"
    x.loc = con.get("loc", (0, 0))
    bg_kind, om_kind = con["recipe"]["bg"], con["recipe"]["om"]
    om = omega_for(x, om_kind, con)
    if isinstance(om, tuple):
        spec = dict(theme=con["name"], trend=con["cat"], seed=variant, renderer=om[1], palette=c, center="none", shape=s, prompt="")
        body = engine.render(spec)
        k = body.find("<g transform=")
        bgsvg = bg_lines(x, bg_kind) if bg_kind not in ("base",) else ""
        defs = "".join(x.defs)
        return body[:k] + f'<defs>{defs}</defs><g transform="translate(162 140) scale(7)">{bgsvg}</g>' + body[k:]
    base = bg_base(x)
    bgsvg = bg_lines(x, bg_kind) if bg_kind != "base" else ""
    label = ""
    if con["cat"] == "places":
        label = f'<circle cx="50" cy="56" r="3" fill="{c["a1"]}" stroke="#fff" stroke-width="1"/><text x="50" y="112" font-size="9" font-weight="700" text-anchor="middle" font-family="{FONT}" fill="{c["ink"]}" letter-spacing="1.5">{con["code"]}</text>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024"><defs>{"".join(x.defs)}</defs>'
            f'<g transform="translate(162 140) scale(7)">{base}{animate_bg(bgsvg, bg_kind)}{animate_om(om, om_kind)}{label}</g></svg>'), s, c


DRIFT = {"rain": (-.27, 1, 1.4), "snow": (.2, 1, 9), "stars": (1, 0, 30), "matrix": (0, 1, 7), "waves": (1, 0, 12),
         "dunes": (1, 0, 20), "leaves": (.3, 1, 14), "nebula": (1, .6, 40), "circuit": (1, 0, 22), "seigaiha": (1, 0, 16), "mesh": (1, .4, 26)}
SPIN = {"rays": "60s", "sunburst": "80s", "polar": "90s"}


def animate_bg(svg, kind):
    if kind in SPIN:
        return f'<g>{svg}<animateTransform attributeName="transform" type="rotate" values="0 50 55;360 50 55" dur="{SPIN[kind]}" repeatCount="indefinite"/></g>'
    if kind not in DRIFT:
        return svg
    dx, dy, dur = DRIFT[kind]
    span = HI - LO
    tiles = "".join(f'<g transform="translate({i * span} {j * span})">{svg}</g>' for i in (-1, 0) for j in (-1, 0))
    tx, ty = round(dx * span, 1), round(dy * span, 1)
    if dx < 0:
        tiles = "".join(f'<g transform="translate({i * span} {j * span})">{svg}</g>' for i in (0, 1) for j in (-1, 0))
    return (f'<clipPath id="bgclip"><rect x="{LO}" y="{LO}" width="{span}" height="{span}"/></clipPath><g clip-path="url(#bgclip)"><g>{tiles}'
            f'<animateTransform attributeName="transform" type="translate" values="0 0;{tx} {ty}" dur="{dur}s" repeatCount="indefinite"/></g></g>')


def animate_om(svg, kind):
    if kind in ("nodes", "bits", "token", "tiles", "dots", "dots_reef", "constellation", "stars_om", "star"):
        return f'<g>{svg}<animate attributeName="opacity" values="1;.6;1" dur="2.4s" repeatCount="indefinite"/></g>'
    if kind in ("flame", "grad_hot", "grad_dawn"):
        return f'<g transform-origin="50 60">{svg}<animateTransform attributeName="transform" type="scale" values="1;1.025 .98;1" dur="1.1s" repeatCount="indefinite"/></g>'
    if kind in ("wave", "wave3", "helix", "cloud"):
        return f'<g transform-origin="50 56">{svg}<animateTransform attributeName="transform" type="rotate" values="-2;2;-2" dur="5s" repeatCount="indefinite"/></g>'
    if kind == "orbit":
        return f'<g transform-origin="50 56">{svg}<animateTransform attributeName="transform" type="scale" values="1;1.03;1" dur="4s" repeatCount="indefinite"/></g>'
    return svg


def main(variants=3):
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*.svg"):
        f.unlink()
    rows = []
    for ci, con in enumerate(concept_list()):
        for v in range(variants + 1):
            res = render(con, v)
            svg = res if isinstance(res, str) else res[0]
            name = f"{con['cat']}-{con['name']}-v{v}.svg"
            (OUT / name).write_text(svg)
            rows.append(dict(cat=con["cat"], name=con["name"], recipe=con["recipe"], palette=con["palette"], renderer=f'{con["recipe"]["bg"]}+{con["recipe"]["om"]}',
                             seed=v, canonical=v == 0, order=ci, file=f"emoji/{name}"))
    (OUT / "manifest.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    cats = {}
    for r in rows:
        if r["canonical"]:
            cats.setdefault(r["cat"], []).append(r)
    html = "".join(f"<h2>{k} · {len(v)}</h2><div class='g'>" + "".join(f'<figure><img src="{r["file"][6:]}"><figcaption>{r["name"]}<br>{r["renderer"]}</figcaption></figure>' for r in v) + "</div>" for k, v in cats.items())
    (OUT / "index.html").write_text('<!doctype html><meta charset="utf-8"><title>Omega concepts</title><style>body{margin:0;background:#eee;font:600 15px sans-serif;padding:14px}.g{display:grid;grid-template-columns:repeat(auto-fill,110px);gap:8px}figure{margin:0;font:9px monospace;text-align:center}img{width:110px;border-radius:24px}</style>' + html)
    print(len(rows), "icons", sum(r["canonical"] for r in rows), "concepts")


if __name__ == "__main__":
    main()
