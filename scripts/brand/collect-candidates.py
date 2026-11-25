import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def hexc(c):
    return "#" + "".join(f"{max(0, min(255, round(x))):02X}" for x in c)


def mix(a, b, t):
    return hexc([x + (y - x) * t for x, y in zip(rgb(a), rgb(b))])


def lum(h):
    c = [v / 255 for v in rgb(h)]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def readable(fg, bg, toward):
    c = fg
    for _ in range(20):
        if contrast(c, bg) >= 4.5:
            return c
        c = mix(c, toward, 0.15)
    return c


def roles(bg, surf, text, muted, acc, onacc, hl, success="#2F7D4F", warning="#B8863A"):
    dark = lum(bg) < 0.2
    edge = "#FFFFFF" if dark else "#000000"
    far = "#000000" if dark else "#FFFFFF"
    r = {
        "bg": bg, "card": mix(bg, far, 0.35), "surface": surf, "surface-2": mix(surf, text, 0.12), "surface-warm": mix(surf, acc, 0.15),
        "text": text, "text-2": mix(text, bg, 0.1), "text-3": mix(text, bg, 0.2), "text-4": mix(text, bg, 0.1),
        "muted": readable(muted, bg, text), "muted-2": readable(mix(muted, text, 0.3), bg, text), "muted-3": readable(muted, bg, text), "faint": mix(muted, bg, 0.25),
        "accent": acc, "accent-bright": mix(acc, edge if dark else "#FFFFFF", 0.25), "accent-deep": mix(acc, "#000000", 0.3),
        "accent-text": readable(acc, bg, text), "accent-pale": mix(acc, bg, 0.6), "accent-sand": mix(acc, bg, 0.35),
        "on-accent": onacc, "on-accent-deep": readable(bg, mix(acc, "#000000", 0.3), bg),
        "link": readable(hl if contrast(hl, bg) > contrast(acc, bg) else acc, bg, text), "link-deep": readable(mix(acc, text, 0.4), bg, text), "link-dark": mix(acc, text, 0.6), "link-pale": mix(acc, bg, 0.45),
        "success": readable(success, bg, text), "success-deep": readable(mix(success, text, 0.3), bg, text), "sage": mix(success, bg, 0.35), "teal": mix(success, acc, 0.5),
        "warning": warning, "warning-text": readable(warning, bg, text), "copper": mix(hl, warning, 0.5), "danger": readable(hl, bg, text),
    }
    t = rgb(text)
    b = rgb(bg)
    r["line"] = f"rgba({t[0]}, {t[1]}, {t[2]}, 0.14)"
    r["line-inverse"] = f"rgba({b[0]}, {b[1]}, {b[2]}, 0.12)"
    r["line-strong"] = f"rgba({t[0]}, {t[1]}, {t[2]}, 0.40)"
    return r


def directions():
    src = (ROOT / "brand/_directions/src/lib.py").read_text()
    out = []
    for block in re.split(r"\n(?:D\.append\()?dict\(id=", src)[1:]:
        block = "id=" + block
        g = lambda k: re.search(rf'\b{k}="([^"]*)"', block)
        c = dict(re.findall(r'(\w+)="(#[0-9A-Fa-f]{6})"', re.search(r"c=dict\(([^)]*)\)", block).group(1)))
        fonts = g("fonts").group(1)
        disp = re.search(r"disp=\"([^\"]*)\"", block).group(1).replace("'", '"')
        body = re.search(r"body=\"([^\"]*)\"", block).group(1).replace("'", '"')
        mono = re.search(r"mono=\"([^\"]*)\"", block).group(1).replace("'", '"')
        out.append({
            "id": g("id").group(1), "name": g("name").group(1), "source": f'{g("movement").group(1)} x {g("system").group(1)}',
            "colors": roles(c["bg"], c["surf"], c["text"], c["muted"], c["acc"], c["onacc"], c["hl"]),
            "fonts": {"href": f"https://fonts.googleapis.com/css2?{fonts}&display=swap", "display": f"{disp}, serif", "body": f"{body}, system-ui, sans-serif", "accent": f"{disp}, serif", "mono": f"{mono}, ui-monospace, monospace"},
        })
    return out


def d8():
    t = json.loads((ROOT / "polingual/src/ui/tokens.json").read_text())["color"]
    return {
        "id": "d8", "name": "Global Squiggle", "source": "D8, shared with Polingual",
        "colors": roles(t["paper"], t["paper-2"], t["ink"], t["ink-dim"], t["vermilion"], t["paper"], t["lapis"], t["malachite"], t["ochre"]) | {"accent-text": t["vermilion-ink"], "link": t["tyrian"]},
        "fonts": {"href": "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap", "display": "Fredoka, Nunito, sans-serif", "body": "Nunito, system-ui, sans-serif", "accent": "Fredoka, sans-serif", "mono": "\"Space Mono\", ui-monospace, monospace"},
    }


def stonepunk():
    v = dict(reversed(re.findall(r"--stone-([\w-]+):\s*(#[0-9a-fA-F]{6})\b", (ROOT / "brand/stonepunk/tokens.css").read_text())))
    return {
        "id": "stonepunk", "name": "Stonepunk", "source": "carved stone, bkt-ui quiz styling",
        "colors": roles(v["ground"], v["face"], v["ink"], v["ink-3"], v["gold"], v["gold-ink"], v["patina"], v["moss"], v["gold-lo"]),
        "fonts": {"href": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap", "display": "\"Iowan Old Style\", \"Palatino Linotype\", Palatino, Georgia, serif", "body": "ui-sans-serif, system-ui, sans-serif", "accent": "\"Iowan Old Style\", Palatino, serif", "mono": "\"IBM Plex Mono\", ui-monospace, monospace"},
    }


def original():
    kit = json.loads((ROOT / "brand/bucket/kit.json").read_text())
    return {"id": "bucket", "name": "Bucket original", "source": "production through 2026-11", "colors": kit["light"], "fonts": kit["fonts"]}


FONT_SETS = [
    (("swiss", "blueprint", "topographic", "neo-brutal", "letterpress", "risograph"), "family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600", '"IBM Plex Sans"', '"IBM Plex Sans"', '"IBM Plex Mono"'),
    (("bauhaus", "swedish", "nordic", "claymorphism", "enamel", "glassmorphism"), "family=Jost:wght@400;600;800&family=Space+Mono:wght@400;700", "Jost", "Jost", '"Space Mono"'),
    (("greek", "marble", "carved", "stonepunk", "tyrian", "byzantine", "illuminated", "celtic", "solar-temple", "vintage"), "family=Cinzel:wght@600;800&family=Cormorant+Garamond:wght@500;700&family=JetBrains+Mono", "Cinzel", '"Cormorant Garamond"', '"JetBrains Mono"'),
    (("art-deco", "art-nouveau", "kintsugi", "jade", "persian", "indonesian", "tibetan", "stained"), "family=Poiret+One&family=Lora:wght@400;600&family=DM+Mono", '"Poiret One"', "Lora", '"DM Mono"'),
    (("8bit", "arcade", "handheld", "voxel", "rpg", "boss", "viking-arcade"), "family=Press+Start+2P&family=Space+Grotesk:wght@400;600&family=Space+Mono", '"Press Start 2P"', '"Space Grotesk"', '"Space Mono"'),
    (("cyber", "synthwave", "vaporwave", "y2k", "neon", "mecha", "nebula", "cosmos", "space", "cosmic", "bioluminescent"), "family=Orbitron:wght@600;800&family=Exo+2:wght@400;600&family=Share+Tech+Mono", "Orbitron", '"Exo 2"', '"Share Tech Mono"'),
    (("ukiyo", "sumi", "wabi", "samurai"), "family=Shippori+Mincho:wght@500;800&family=Zen+Kaku+Gothic+New:wght@400;700&family=DM+Mono", '"Shippori Mincho"', '"Zen Kaku Gothic New"', '"DM Mono"'),
    (("viking", "norse", "medieval", "gothic", "industrial", "halloween", "potion"), "family=Pirata+One&family=Alegreya+Sans:wght@400;700&family=JetBrains+Mono", '"Pirata One"', '"Alegreya Sans"', '"JetBrains Mono"'),
    (("solarpunk", "cyber-forest", "spring", "summer", "autumn", "winter", "holiday", "dune", "zulu", "maori", "african", "kaleidoscope", "embroidery", "pride", "cel-shaded"), "family=Fredoka:wght@500;700&family=Nunito:wght@400;700&family=Space+Mono", "Fredoka", "Nunito", '"Space Mono"'),
]

PREFERENCE = {"bauhaus": 3, "swiss": 2.5, "swiss-mono": 2.5, "neo-brutal": 2, "solarpunk": 2.5, "stonepunk": 2, "cosmic-metallurgy": 2, "greek-red-figure": 2, "greek-black-figure": 2, "carved-marble": 1.5, "tyrian-classic": 1.5, "blueprint": 1.5, "claymorphism": 1, "enamel-pin": 1, "letterpress": 1, "risograph": 1.5, "topographic": 1.5, "kintsugi-omega": 1, "cyber-renaissance": 1.5, "neon-renaissance": 1}


def sat(h):
    r, g, b = [x / 255 for x in rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    return 0 if mx == 0 else (mx - mn) / mx


def svg_colors(text):
    found = [c.upper() for c in re.findall(r"#[0-9a-fA-F]{6}\b", text)]
    return [c for c, _ in __import__("collections").Counter(found).most_common()]


def omega_auto():
    dial = ROOT / "public/brand/omega-dial/data.json"
    if not dial.exists():
        return []
    seen, out = set(), []
    for item in json.loads(dial.read_text()):
        style = item["src"].split("/")[1]
        if not item["src"].endswith(".svg") or style == "emoji" or style in seen:
            continue
        cols = svg_colors((dial.parent / item["src"]).read_text(errors="ignore"))
        if len(cols) < 2:
            continue
        seen.add(style)
        light = sorted(cols, key=lum, reverse=True)
        bg_seed = light[0]
        dark_mode = lum(bg_seed) < 0.35
        bg = mix(bg_seed, "#FFFFFF", 0.55) if not dark_mode else mix(light[-1], "#000000", 0.6)
        text = mix(light[-1], "#000000", 0.55) if not dark_mode else mix(light[0], "#FFFFFF", 0.7)
        if contrast(text, bg) < 7:
            text = "#1A1A1A" if lum(bg) > 0.4 else "#F5F2EA"
        chroma = sorted(cols, key=sat, reverse=True)
        acc = chroma[0]
        hl = chroma[1] if len(chroma) > 1 else acc
        onacc = "#FFFFFF" if contrast("#FFFFFF", acc) >= contrast("#111111", acc) else "#111111"
        surf = mix(bg, acc, 0.07)
        muted = mix(text, bg, 0.35)
        fonts = next((f for f in FONT_SETS if any(k in style for k in f[0])), FONT_SETS[0])
        colors = roles(bg, surf, text, muted, acc, onacc, hl)
        score = (
            min(contrast(colors["text"], bg), 12) / 12 * 3
            + min(contrast(acc, bg), 4.5) / 4.5 * 2
            + min(contrast(onacc, acc), 7) / 7 * 1.5
            + sat(acc) * 1
            + PREFERENCE.get(style, 0)
            - (1.5 if dark_mode else 0)
        )
        out.append({
            "id": f"omega-{style}", "name": style.replace("-", " ").title(), "source": f"auto from omega dial {item['src']}",
            "logo": f"/brand/omega-dial/{item['src']}", "score": round(score, 2),
            "colors": colors,
            "fonts": {"href": f"https://fonts.googleapis.com/css2?{fonts[1]}&display=swap", "display": f"{fonts[2]}, serif", "body": f"{fonts[3]}, system-ui, sans-serif", "accent": f"{fonts[2]}, serif", "mono": f"{fonts[4]}, ui-monospace, monospace"},
        })
    return sorted(out, key=lambda p: -p["score"])


def logos():
    out = [{"src": "/brand/logo.svg", "label": "current", "group": "current"}]
    for p in sorted((ROOT / "public/brand/directions/logos").glob("*.svg")):
        out.append({"src": f"/brand/directions/logos/{p.name}", "label": p.stem, "group": "directions"})
    return out


if __name__ == "__main__":
    data = {"palettes": [original(), *directions(), d8(), stonepunk()], "auto": omega_auto(), "logos": logos()}
    (ROOT / "brand/bucket/candidates.json").write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    print(len(data["palettes"]), len(data["auto"]), len(data["logos"]))
