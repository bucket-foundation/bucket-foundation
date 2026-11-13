#!/usr/bin/env python3
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = ROOT / "polingual/src/ui/tokens.json"
ART = ROOT / "polingual/src/ui/art/data.ts"
FONTS = ROOT / "polingual/public/fonts/stoa"
OUT = ROOT / "apple/BucketKit/Sources/BucketKit/PL"
RES = OUT / "Resources"

FONT_FILES = (
    ("fredoka-latin-wght-normal.woff2", "Fredoka", (500, 600, 700)),
    ("nunito-latin-wght-normal.woff2", "Nunito", (500, 600, 700, 800)),
    ("space-mono-latin-400-normal.woff2", "Space Mono", (400,)),
    ("space-mono-latin-700-normal.woff2", "Space Mono", (700,)),
)
WEIGHT_NAMES = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold"}


def camel(name):
    parts = re.split(r"[-_]", name)
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])


def color(value):
    if value.startswith("#"):
        return int(value[1:], 16), 1.0
    m = re.match(r"rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)", value)
    r, g, b, a = m.groups()
    return (int(r) << 16) | (int(g) << 8) | int(b), float(a)


def num(x):
    return ("%g" % x) if isinstance(x, float) else str(x)


def tokens_swift(t):
    o = ["import SwiftUI\n\n", "public enum PL {\n"]
    o.append("    public static let colorHex: [String: UInt32] = [\n")
    for k, v in t["color"].items():
        o.append('        "%s": 0x%06X,\n' % (k, color(v)[0]))
    o.append("    ]\n\n    public static let colorAlpha: [String: Double] = [\n")
    for k, v in t["color"].items():
        o.append('        "%s": %s,\n' % (k, num(color(v)[1])))
    o.append("    ]\n\n")
    for k, v in t["color"].items():
        h, a = color(v)
        o.append("    public static let %s = Color(plHex: 0x%06X, alpha: %s)\n" % (camel(k), h, num(a)))
    o.append("\n    public static let type: [String: PLTypeSpec] = [\n")
    for k, v in t["type"].items():
        o.append('        "%s": PLTypeSpec(family: .%s, size: %s, weight: %d, line: %s),\n' % (k, v["font"], num(v["size"]), v["weight"], num(v["line"])))
    o.append("    ]\n\n")
    for k in t["type"]:
        o.append('    public static let %s = type["%s"]!\n' % (k, k))
    for group, enum in (("radius", "Radius"), ("space", "Space"), ("lip", "Lip")):
        o.append("\n    public enum %s {\n" % enum)
        o.append("        public static let all: [String: CGFloat] = [%s]\n" % ", ".join('"%s": %s' % (k, num(v)) for k, v in t[group].items()))
        for k, v in t[group].items():
            name = ("s" + k) if k[0].isdigit() else k
            o.append("        public static let %s: CGFloat = %s\n" % (name, num(v)))
        o.append("    }\n")
    m = t["motion"]
    ease = [float(x) for x in re.findall(r"[\d.]+", m["ease"])]
    o.append("\n    public enum Motion {\n")
    o.append("        public static let millis: [String: Int] = [%s]\n" % ", ".join('"%s": %d' % (k, v) for k, v in m.items() if k != "ease"))
    for k, v in m.items():
        if k != "ease":
            o.append("        public static let %s: Double = %s\n" % (k, num(v / 1000)))
    o.append("        public static let ease: [Double] = [%s]\n" % ", ".join(num(x) for x in ease))
    o.append("    }\n}\n")
    return "".join(o)


def art_entries():
    s = ART.read_text()
    start = s.index("[", s.index("ART_DATA"))
    end = s.index("\n] as const") + 2
    return json.loads(s[start:end])


def art_swift(entries):
    o = ["import CoreGraphics\n\n", "public enum PLArt: String, CaseIterable, Sendable {\n"]
    for e in entries:
        o.append('    case %s = "%s"\n' % (camel(e["name"]), e["name"]))
    o.append("\n    public var label: String {\n        switch self {\n")
    for e in entries:
        o.append('        case .%s: "%s"\n' % (camel(e["name"]), e["label"]))
    o.append("        }\n    }\n\n    public var size: CGSize {\n        switch self {\n")
    for e in entries:
        _, _, w, h = e["viewBox"].split()
        o.append("        case .%s: CGSize(width: %s, height: %s)\n" % (camel(e["name"]), w, h))
    o.append("        }\n    }\n\n    public var dark: Bool {\n        switch self {\n")
    for e in entries:
        o.append("        case .%s: %s\n" % (camel(e["name"]), "true" if e["dark"] else "false"))
    o.append("        }\n    }\n}\n")
    return "".join(o)


def font_files():
    return [(src, family, w, "%s-%s.ttf" % (family.replace(" ", ""), WEIGHT_NAMES[w])) for src, family, weights in FONT_FILES for w in weights]


def fonts():
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    (RES / "Fonts").mkdir(parents=True, exist_ok=True)
    for src, family, w, dst in font_files():
        target = RES / "Fonts" / dst
        if not target.exists():
            f = TTFont(str(FONTS / src))
            f.flavor = None
            if "fvar" in f:
                f = instancer.instantiateVariableFont(f, {"wght": w})
            sub = WEIGHT_NAMES[w]
            ps = "%s-%s" % (family.replace(" ", ""), sub)
            name = f["name"]
            for rec in list(name.names):
                if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 25):
                    name.removeNames(nameID=rec.nameID)
            for nid, val in ((1, family if sub in ("Regular", "Bold") else "%s %s" % (family, sub)), (2, sub if sub in ("Regular", "Bold") else "Regular"), (3, ps), (4, "%s %s" % (family, sub)), (6, ps), (16, family), (17, sub)):
                name.setName(val, nid, 3, 1, 0x409)
                name.setName(val, nid, 1, 0, 0)
            f["OS/2"].usWeightClass = w
            f.save(str(target))
        local = Path.home() / ".local/share/fonts/polingual" / dst
        if not local.exists():
            local.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(target, local)
    subprocess.run(["fc-cache", "-f"], check=False, capture_output=True)


def pdf(e):
    import cairosvg

    body = e["body"].replace('font-family="Noto Sans SC"', 'font-family="Noto Sans CJK SC"')
    _, _, w, h = e["viewBox"].split()
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" width="%s" height="%s">%s</svg>' % (e["viewBox"], w, h, body)
    data = cairosvg.svg2pdf(bytestring=svg.encode())
    return re.sub(rb"\(D:\d{14}[^)]*\)", lambda m: b"(D:" + b"0" * (len(m.group(0)) - 5) + b")", data)


def main():
    check = "--check" in sys.argv
    t = json.loads(TOKENS.read_text())
    entries = art_entries()
    outputs = {OUT / "PLTokens.swift": tokens_swift(t), OUT / "PLArt.swift": art_swift(entries)}
    stale = [p for p, body in outputs.items() if not p.exists() or p.read_text() != body]
    names = {e["name"] for e in entries}
    have = {p.stem for p in (RES / "Art").glob("*.pdf")} if (RES / "Art").exists() else set()
    if have != names:
        stale.append(RES / "Art")
    if check:
        for p in stale:
            print("stale:", p.relative_to(ROOT))
        sys.exit(1 if stale else 0)
    OUT.mkdir(parents=True, exist_ok=True)
    for p, body in outputs.items():
        p.write_text(body)
    fonts()
    art = RES / "Art"
    if art.exists():
        shutil.rmtree(art)
    art.mkdir(parents=True)
    for e in entries:
        (art / (e["name"] + ".pdf")).write_bytes(pdf(e))
    print("wrote", len(outputs), "swift files,", len(entries), "art pdfs,", len(font_files()), "fonts")


if __name__ == "__main__":
    main()
