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


def logos():
    out = [{"src": "/brand/logo.svg", "label": "current", "group": "current"}]
    for p in sorted((ROOT / "public/brand/directions/logos").glob("*.svg")):
        out.append({"src": f"/brand/directions/logos/{p.name}", "label": p.stem, "group": "directions"})
    return out


if __name__ == "__main__":
    data = {"palettes": [original(), *directions(), d8(), stonepunk()], "logos": logos()}
    (ROOT / "brand/bucket/candidates.json").write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    print(len(data["palettes"]), len(data["logos"]))
