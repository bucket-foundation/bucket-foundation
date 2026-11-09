#!/usr/bin/env python3
import argparse
import hashlib
import json
import random
from pathlib import Path

import gen
import wild

ROOT = Path(__file__).parent
OUT = ROOT / "out"
GEN_FINISHES = {"flat", "stone", "metal", "neon", "blueprint", "riso", "glass", "clay", "outline", "woodcut"}
GEN_MODES = {"hollow", "double"}
WILD = {f.__name__: f for f in wild.RENDERERS}
KEYS = ("b1", "b2", "ink", "sh", "a1", "a2")


def load_themes():
    themes = []
    for f in sorted((ROOT / "themes").glob("*.json")):
        themes += json.loads(f.read_text())
    return themes


def sample(theme, seed):
    rnd = random.Random(f"{theme['id']}:{seed}")
    shape = dict(
        g=round(rnd.uniform(7.5, 15.5), 1),
        L=round(rnd.uniform(10, 19), 1),
        r=round(rnd.uniform(29, 35), 1),
        w=round(rnd.uniform(9.5, 16.5), 1),
        curl=round(rnd.uniform(8, 15), 1),
        cap=rnd.choice(["round", "round", "butt"]),
    )
    return dict(
        theme=theme["id"],
        trend=theme["trend"],
        seed=seed,
        renderer=rnd.choice(theme["renderers"]),
        palette=dict(zip(KEYS, rnd.choice(theme["palettes"]))),
        center=rnd.choice(theme["centers"]),
        shape=shape,
        prompt=theme.get("prompt", ""),
    )


def spec_id(spec):
    return hashlib.sha1(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:10]


def wrap(c, body, defs="", bg=None):
    return wild.wrap(c, body, bg=bg, defs=defs)


def glyph(p, w, cap, stroke, extra=""):
    return f'<path d="{p}" fill="none" stroke="{stroke}" stroke-width="{w}" stroke-linecap="{cap}" stroke-linejoin="round" {extra}/>'


def custom(name, c, s, kind):
    p = gen.omega(**s)
    w, cap = s["w"], s["cap"]
    mid = gen.center(kind, c) if kind != "none" else ""
    if name == "pottery":
        meander = "".join(f'<path d="M{x} 92h6v-4h-3v2" fill="none" stroke="{c["ink"]}" stroke-width="1.2"/>' for x in range(4, 96, 8))
        band = f'<rect x="-30" y="0" width="160" height="3" fill="{c["ink"]}"/><rect x="-30" y="96" width="160" height="3" fill="{c["ink"]}"/>'
        inc = glyph(p, 1, cap, c["a2"], 'stroke-dasharray="1 2" transform="translate(0 -2)"')
        return wrap(c, band + meander + glyph(p, w, cap, c["ink"]) + inc + mid)
    if name == "deco":
        fan = "".join(f'<line x1="50" y1="100" x2="{50 + 70 * (i - 8) / 8}" y2="-20" stroke="{c["ink"]}" stroke-width=".5" opacity=".5"/>' for i in range(17))
        return wrap(c, fan + glyph(p, w + 4, cap, c["ink"]) + glyph(p, w - 2, cap, c["b2"]) + glyph(p, w - 6, cap, c["ink"]) + mid)
    if name == "bauhaus":
        shapes = f'<circle cx="74" cy="30" r="22" fill="{c["a1"]}"/><rect x="6" y="56" width="34" height="34" fill="{c["a2"]}"/>'
        return wrap(c, shapes + glyph(p, w, "butt", c["ink"]) + mid, bg=c["b1"])
    if name == "chrome":
        defs = '<linearGradient id="ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#9AA6BA"/><stop offset=".5" stop-color="#2E3646"/><stop offset=".62" stop-color="#E9EEF6"/><stop offset="1" stop-color="#7E8CA6"/></linearGradient>'
        return wrap(c, glyph(p, w + 2, cap, c["sh"], 'transform="translate(0 3)"') + glyph(p, w, cap, "url(#ch)") + glyph(p, 1.4, cap, "#FFFFFF", 'transform="translate(-1 -3)" opacity=".8"') + mid, defs)
    if name == "holo":
        stops = "".join(f'<stop offset="{i / 6:.2f}" stop-color="{col}"/>' for i, col in enumerate(["#FF5F6D", "#FFC371", "#F9F871", "#7AF0A0", "#5FC9F8", "#A77CFF", "#FF5FD2"]))
        defs = f'<linearGradient id="hl" x1="0" y1="0" x2="1" y2="1">{stops}</linearGradient>'
        return wrap(c, glyph(p, w + 3, cap, c["sh"], 'opacity=".5" transform="translate(0 3)"') + glyph(p, w, cap, "url(#hl)") + mid, defs)
    if name == "memphis":
        rnd = random.Random(p)
        bits = "".join(
            f'<path d="M{x} {y}q3 -4 6 0t6 0" fill="none" stroke="{rnd.choice([c["a1"], c["a2"], c["ink"]])}" stroke-width="1.6" stroke-linecap="round"/>'
            if rnd.random() < .5 else f'<circle cx="{x}" cy="{y}" r="2" fill="{rnd.choice([c["a1"], c["a2"]])}"/>'
            for x, y in [(rnd.uniform(-10, 100), rnd.uniform(-10, 100)) for _ in range(16)]
        )
        return wrap(c, bits + glyph(p, w + 3, cap, c["ink"]) + glyph(p, w - 2, cap, c["a2"]) + mid, bg=c["b1"])
    if name == "stitch":
        return wrap(c, glyph(p, w, cap, c["ink"]) + glyph(p, 1, cap, c["sh"], 'stroke-dasharray="1.6 1.2" opacity=".6"') + glyph(p, w + 1, cap, c["a1"], f'stroke-dasharray="0.8 1.4" fill-opacity="0" opacity=".9"') + glyph(p, w - 1, cap, c["ink"]) + mid)
    if name == "sticker":
        return wrap(c, glyph(p, w + 8, "round", "#111111", 'transform="translate(2.5 3)"') + glyph(p, w + 8, "round", "#FFFFFF") + glyph(p, w + 3, cap, "#111111") + glyph(p, w, cap, c["ink"]) + mid)
    raise KeyError(name)


def render(spec):
    c, s, r, kind = spec["palette"], spec["shape"], spec["renderer"], spec["center"]
    if r in GEN_FINISHES or r in GEN_MODES:
        gen.SEASONS["_"] = c
        gen.SHAPES["_"] = dict(s, mode=r if r in GEN_MODES else "solid")
        body = gen.svg("_", "_", r if r in GEN_FINISHES else "flat", kind)
        return body
    if r in WILD:
        wild.P = gen.omega(**s)
        wild.PTS = wild.polyline(s["g"], s["L"], s["r"])
        return WILD[r](c)
    return custom(r, c, s, kind)


def build(per_theme):
    OUT.mkdir(exist_ok=True)
    manifest = []
    for theme in load_themes():
        d = OUT / theme["id"]
        d.mkdir(exist_ok=True)
        for seed in range(per_theme):
            spec = sample(theme, seed)
            sid = spec_id(spec)
            (d / f"{sid}.svg").write_text(render(spec))
            manifest.append(dict(spec, id=sid, file=f"{theme['id']}/{sid}.svg"))
    (OUT / "manifest.jsonl").write_text("".join(json.dumps(m) + "\n" for m in manifest))
    by_trend = {}
    for m in manifest:
        by_trend.setdefault(m["trend"], {}).setdefault(m["theme"], []).append(m)
    for trend, themes in by_trend.items():
        rows = "".join(
            f"<h3>{t}</h3><div class='g'>" + "".join(f'<img title="{m["renderer"]} {m["id"]}" src="{m["file"]}">' for m in ms) + "</div>"
            for t, ms in themes.items()
        )
        (OUT / f"sheet-{trend}.html").write_text(
            '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#ddd;font:600 14px sans-serif;padding:12px}'
            ".g{display:grid;grid-template-columns:repeat(12,96px);gap:8px}img{width:96px;border-radius:22px}h3{margin:14px 0 6px}</style></head><body>"
            + rows + "</body></html>"
        )
    return manifest


def rebuild(spec_file):
    for line in Path(spec_file).read_text().splitlines():
        m = json.loads(line)
        spec = {k: v for k, v in m.items() if k not in ("id", "file")}
        assert spec_id(spec) == m["id"], m["id"]
        print(m["id"], hashlib.sha1(render(spec).encode()).hexdigest()[:8])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-theme", type=int, default=12)
    ap.add_argument("--rebuild")
    a = ap.parse_args()
    if a.rebuild:
        rebuild(a.rebuild)
    else:
        print(len(build(a.per_theme)), "variants")
