#!/usr/bin/env python3
import colorsys
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT / "out"
SITE = ROOT.parents[1] / "public" / "brand" / "omega-dial"


def hsl(hexcol):
    r, g, b = (int(hexcol[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hls(r, g, b)


def mean_hex(png):
    im = Image.open(png).convert("RGB").resize((24, 24))
    px = [p for p in im.getdata()]
    r, g, b = (sum(c[i] for c in px) // len(px) for i in range(3))
    return f"#{r:02X}{g:02X}{b:02X}"


def entry(kind, src, color, label, meta):
    h, l, s = hsl(color)
    chromatic = s > 0.18 and 0.08 < l < 0.92
    key = (0, round(h, 3), round(l, 3)) if chromatic else (1, round(l, 3), 0)
    return dict(kind=kind, src=src, color=color, hue=round(h * 360, 1), light=round(l, 3), chromatic=chromatic, label=label, meta=meta, key=key)


def main():
    if SITE.exists():
        for p in SITE.iterdir():
            if p.name != "index.html":
                shutil.rmtree(p) if p.is_dir() else p.unlink()
    SITE.mkdir(parents=True, exist_ok=True)
    items = []
    for line in (OUT / "manifest.jsonl").read_text().splitlines():
        m = json.loads(line)
        dst = SITE / "v" / m["file"]
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(OUT / m["file"], dst)
        col = m["palette"]["b1"]
        items.append(entry("vector", f"v/{m['file']}", col, m["theme"], f"{m['renderer']} · {m['trend']} · {m['id']}"))
    for line in (OUT / "ai" / "manifest.jsonl").read_text().splitlines():
        m = json.loads(line)
        png = OUT / "ai" / m["out"]
        im = Image.open(png).convert("RGB").resize((256, 256), Image.LANCZOS)
        (SITE / "a").mkdir(exist_ok=True)
        name = m["out"].replace(".png", ".jpg")
        im.save(SITE / "a" / name, quality=86)
        items.append(entry("ai", f"a/{name}", mean_hex(png), m["theme"], f"sdxl s{m['strength']} · seed {m['seed']} · {m['source']}"))
    items.sort(key=lambda e: e.pop("key"))
    for i, e in enumerate(items):
        e["i"] = i
    (SITE / "data.json").write_text(json.dumps(items))
    print(len(items), "slices", sum(e["chromatic"] for e in items), "chromatic")


if __name__ == "__main__":
    main()
