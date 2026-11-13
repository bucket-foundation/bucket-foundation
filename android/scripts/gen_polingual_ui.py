#!/usr/bin/env python3
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = ROOT / "polingual/src/ui/tokens.json"
ART = ROOT / "polingual/src/ui/art/data.ts"
FLAGS = ROOT / "polingual/src/lib/flags.ts"
TILE = ROOT / "polingual/src/app/tile.tsx"
FONTS = ROOT / "polingual/public/fonts/stoa"
PKG_DIR = ROOT / "android/core/ui/src/main/kotlin/foundation/bucket/core/ui/pl"
RES_FONT = ROOT / "android/core/ui/src/main/res/font"
PKG = "foundation.bucket.core.ui.pl"
HEADER = "package " + PKG + "\n\n"


def camel(name):
    parts = re.split(r"[-_ ]+", name)
    return "".join(p[:1].upper() + p[1:] for p in parts)


def argb(value):
    v = value.strip()
    m = re.fullmatch(r"rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)", v)
    if m:
        r, g, b = (int(m.group(i)) for i in (1, 2, 3))
        a = round(float(m.group(4)) * 255)
        return (a << 24) | (r << 16) | (g << 8) | b
    h = v.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError("color " + value)
    return 0xFF000000 | int(h, 16)


def hexlit(n):
    return "0x%08X" % n


def flt(x):
    s = ("%.4f" % float(x)).rstrip("0").rstrip(".")
    if s in ("-0", ""):
        s = "0"
    return s + "f"


def bezier(ease):
    m = re.fullmatch(r"cubic-bezier\(([^)]*)\)", ease.strip())
    return [float(p) for p in m.group(1).split(",")]


def tokens_kt(t):
    out = [HEADER, "import androidx.compose.ui.graphics.Color\n", "import androidx.compose.ui.unit.dp\n\n"]
    out.append("object PL {\n")
    for k, v in t["color"].items():
        out.append("    val %s = Color(%s)\n" % (camel(k), hexlit(argb(v))))
    out.append("    val colors: Map<String, Color> = mapOf(\n")
    for k in t["color"]:
        out.append('        "%s" to %s,\n' % (k, camel(k)))
    out.append("    )\n}\n\n")
    out.append("object PLRadius {\n")
    for k, v in t["radius"].items():
        out.append("    val %s = %d.dp\n" % (camel(k)[:1].lower() + camel(k)[1:], v))
    out.append("    val values: Map<String, Int> = mapOf(%s)\n}\n\n" % ", ".join('"%s" to %d' % (k, v) for k, v in t["radius"].items()))
    out.append("object PLSpace {\n")
    for k, v in t["space"].items():
        out.append("    val s%s = %d.dp\n" % (k, v))
    out.append("    val values: Map<String, Int> = mapOf(%s)\n}\n\n" % ", ".join('"%s" to %d' % (k, v) for k, v in t["space"].items()))
    out.append("object PLLip {\n")
    for k, v in t["lip"].items():
        out.append("    val %s = %d.dp\n" % (k, v))
    out.append("    val values: Map<String, Int> = mapOf(%s)\n}\n\n" % ", ".join('"%s" to %d' % (k, v) for k, v in t["lip"].items()))
    mo = t["motion"]
    b = bezier(mo["ease"])
    out.append("object PLMotion {\n")
    for k in ("press", "pop", "settle"):
        out.append("    const val %s = %d\n" % (k, mo[k]))
    out.append("    val ease = floatArrayOf(%s)\n}\n\n" % ", ".join(flt(x) for x in b))
    out.append("data class PLTypeSpec(val font: String, val size: Int, val weight: Int, val line: Float)\n\n")
    out.append("object PLTypeSpecs {\n")
    for k, v in t["type"].items():
        out.append('    val %s = PLTypeSpec("%s", %d, %d, %s)\n' % (k, v["font"], v["size"], v["weight"], flt(v["line"])))
    out.append("    val all: Map<String, PLTypeSpec> = mapOf(%s)\n}\n" % ", ".join('"%s" to %s' % (k, k) for k in t["type"]))
    return "".join(out)


def parse_transform(s):
    m = [1, 0, 0, 1, 0, 0]
    for name, args in re.findall(r"(\w+)\s*\(([^)]*)\)", s or ""):
        a = [float(x) for x in re.split(r"[\s,]+", args.strip()) if x]
        if name == "translate":
            n = [1, 0, 0, 1, a[0], a[1] if len(a) > 1 else 0]
        elif name == "scale":
            n = [a[0], 0, 0, a[1] if len(a) > 1 else a[0], 0, 0]
        elif name == "rotate":
            r = math.radians(a[0])
            c, si = math.cos(r), math.sin(r)
            cx, cy = (a[1], a[2]) if len(a) == 3 else (0, 0)
            n = [c, si, -si, c, cx - c * cx + si * cy, cy - si * cx - c * cy]
        elif name == "matrix":
            n = a
        else:
            raise ValueError(name)
        m = mul(m, n)
    return m


def mul(p, q):
    a, b, c, d, e, f = p
    A, B, C, D, E, F = q
    return [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f]


def num(el, k, d=0.0):
    v = el.get(k)
    return float(v) if v not in (None, "") else d


def shape_path(el, tag):
    if tag == "path":
        return el.get("d")
    if tag == "rect":
        x, y, w, h = num(el, "x"), num(el, "y"), num(el, "width"), num(el, "height")
        rx = el.get("rx")
        ry = el.get("ry")
        rx = float(rx) if rx else (float(ry) if ry else 0)
        ry = float(ry) if ry else rx
        rx, ry = min(rx, w / 2), min(ry, h / 2)
        if rx == 0:
            return "M%g %gH%gV%gH%gZ" % (x, y, x + w, y + h, x)
        return ("M%g %gH%gA%g %g 0 0 1 %g %gV%gA%g %g 0 0 1 %g %gH%gA%g %g 0 0 1 %g %gV%gA%g %g 0 0 1 %g %gZ" % (
            x + rx, y, x + w - rx, rx, ry, x + w, y + ry, y + h - ry, rx, ry, x + w - rx, y + h,
            x + rx, rx, ry, x, y + h - ry, y + ry, rx, ry, x + rx, y))
    if tag in ("circle", "ellipse"):
        cx, cy = num(el, "cx"), num(el, "cy")
        rx = num(el, "r") if tag == "circle" else num(el, "rx")
        ry = num(el, "r") if tag == "circle" else num(el, "ry")
        return "M%g %gA%g %g 0 1 0 %g %gA%g %g 0 1 0 %g %gZ" % (cx - rx, cy, rx, ry, cx + rx, cy, rx, ry, cx - rx, cy)
    if tag in ("polygon", "polyline"):
        pts = [float(p) for p in re.split(r"[\s,]+", el.get("points").strip()) if p]
        d = "M" + " L".join("%g %g" % (pts[i], pts[i + 1]) for i in range(0, len(pts), 2))
        return d + ("Z" if tag == "polygon" else "")
    if tag == "line":
        return "M%g %gL%g %g" % (num(el, "x1"), num(el, "y1"), num(el, "x2"), num(el, "y2"))
    return None


INHERIT = ("fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "fill-opacity", "fill-rule",
           "font-family", "font-weight", "font-size", "text-anchor", "dominant-baseline", "letter-spacing")


def strip(tag):
    return tag.split("}")[-1]


class Conv:
    def __init__(self, root):
        self.defs = {}
        for el in root.iter():
            if el.get("id"):
                self.defs[el.get("id")] = el

    def ref(self, v):
        m = re.fullmatch(r"url\(#([^)]+)\)", v or "")
        return self.defs.get(m.group(1)) if m else None

    def paint(self, v, style):
        if v in (None, "none"):
            return "null"
        el = self.ref(v)
        if el is not None:
            return "ArtPaint.Tile(%s, %s, %s)" % (flt(num(el, "width")), flt(num(el, "height")), self.children(el, {}))
        return "ArtPaint.Solid(%s)" % hexlit(argb(v))

    def children(self, el, style):
        items = [self.node(c, style) for c in el if strip(c.tag) not in ("defs", "clipPath", "pattern")]
        items = [i for i in items if i]
        return "listOf(" + ", ".join(items) + ")"

    def node(self, el, inherited):
        tag = strip(el.tag)
        style = dict(inherited)
        for k in INHERIT:
            if el.get(k) is not None:
                style[k] = el.get(k)
        alpha = num(el, "opacity", 1.0)
        mat = parse_transform(el.get("transform"))
        inner = None
        if tag == "g":
            clip = self.ref(el.get("clip-path"))
            clip_d = "null"
            if clip is not None:
                ds = [shape_path(c, strip(c.tag)) for c in clip]
                clip_d = '"%s"' % "".join(d for d in ds if d)
            inner = "ArtNode.Group(%s, %s)" % (self.children(el, style), clip_d)
        elif tag == "text":
            fam = style.get("font-family", "Noto Sans")
            anchor = {"middle": 1, "end": 2}.get(style.get("text-anchor"), 0)
            central = style.get("dominant-baseline") == "central"
            fill = style.get("fill", "#000")
            fa = float(style.get("fill-opacity", 1))
            txt = (el.text or "").replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$")
            inner = 'ArtNode.Label("%s", %s, %s, %s, %d, %s, "%s", %d, %s, %s, %s)' % (
                txt, flt(num(el, "x")), flt(num(el, "y")), flt(style.get("font-size", 16)), int(style.get("font-weight", 400)),
                hexlit(argb(fill)), fam, anchor, "true" if central else "false", flt(style.get("letter-spacing", 0)), flt(fa))
        else:
            d = shape_path(el, tag)
            if d is None:
                return None
            fill = self.paint(style.get("fill", "#000"), style)
            stroke = style.get("stroke")
            dash = style.get("stroke-dasharray")
            dash_kt = "floatArrayOf(%s)" % ", ".join(flt(x) for x in re.split(r"[\s,]+", dash.strip())) if dash else "null"
            inner = 'ArtNode.Shape("%s", %s, %s, %s, %s, %s, %s, %s, %s)' % (
                d, fill, hexlit(argb(stroke)) if stroke not in (None, "none") else "null", flt(style.get("stroke-width", 1)),
                dash_kt, "true" if style.get("stroke-linecap") == "round" else "false",
                "true" if style.get("stroke-linejoin") == "round" else "false",
                flt(style.get("fill-opacity", 1)), "true" if style.get("fill-rule") == "evenodd" else "false")
        if mat != [1, 0, 0, 1, 0, 0] or alpha != 1.0:
            return "ArtNode.Transform(floatArrayOf(%s), %s, %s)" % (", ".join(flt(x) for x in mat), flt(alpha), inner)
        return inner


GLYPH_STROKE = 'fill="none" stroke="#231F20" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'
GLYPHS = {
    "glyph-back": '<path d="M15 5l-7 7 7 7" %s/>' % GLYPH_STROKE,
    "glyph-play": '<path d="M8 5v14l11-7z" fill="#231F20"/>',
    "glyph-pause": '<rect x="6" y="5" width="4" height="14" rx="1" fill="#231F20"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#231F20"/>',
    "glyph-swap": '<path d="M4 8h14l-4-4M20 16H6l4 4" %s/>' % GLYPH_STROKE,
}


def glyph_entries():
    src = TILE.read_text()
    m = re.search(r"const SPEAKER = \(\s*<svg[^>]*>(.*?)</svg>", src, re.S)
    speaker = m.group(1).replace('fill="currentColor"', 'fill="#231F20"').replace('stroke="currentColor"', 'stroke="#231F20"')
    speaker = re.sub(r"(\w)([A-Z])(\w*)=", lambda x: x.group(1) + "-" + x.group(2).lower() + x.group(3) + "=", speaker)
    out = [{"name": "glyph-speaker", "label": "Speaker", "viewBox": "0 0 24 24", "dark": False, "body": speaker}]
    for k, v in GLYPHS.items():
        out.append({"name": k, "label": k[6:].title(), "viewBox": "0 0 24 24", "dark": False, "body": v})
    return out


def art_kt(entries):
    out = [HEADER, "object ArtLibrary {\n"]
    names = []
    for a in entries:
        root = ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + a["body"] + "</svg>")
        conv = Conv(root)
        vb = [float(x) for x in a["viewBox"].split()]
        fn = "a" + camel(a["name"])
        names.append((a["name"], fn))
        out.append('    private fun %s() = ArtPiece("%s", "%s", %s, %s, %s, %s, %s, %s)\n' % (
            fn, a["name"], a["label"].replace('"', '\\"'), flt(vb[0]), flt(vb[1]), flt(vb[2]), flt(vb[3]),
            "true" if a["dark"] else "false", conv.children(root, {})))
    out.append("    val names: List<String> = listOf(%s)\n" % ", ".join('"%s"' % n for n, _ in names))
    out.append("    private val cache = HashMap<String, ArtPiece>()\n")
    out.append("    operator fun get(name: String): ArtPiece = cache.getOrPut(name) {\n        when (name) {\n")
    for n, fn in names:
        out.append('            "%s" -> %s()\n' % (n, fn))
    out.append('            else -> error("unknown art $name")\n        }\n    }\n}\n')
    return "".join(out)


def split_top(v):
    out, depth, cur = [], 0, ""
    for ch in v:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    out.append(cur.strip())
    return out


def expand_macros(v):
    def h3(m, angle):
        a, b, c = [x.strip().strip('"') for x in m.group(1).split(",")]
        return "linear-gradient(%s%s 0 33.3%%,%s 0 66.6%%,%s 0)" % (angle, a, b, c)
    v = re.sub(r"H3\(([^)]*)\)", lambda m: h3(m, ""), v)
    v = re.sub(r"V3\(([^)]*)\)", lambda m: h3(m, "90deg,"), v)
    def cross(m):
        f, c = [x.strip().strip('"') for x in m.group(1).split(",")]
        return ("linear-gradient(90deg,transparent 0 30%%,%s 0 42%%,transparent 0),linear-gradient(transparent 0 42%%,%s 0 58%%,transparent 0),%s" % (c, c, f))
    return re.sub(r"CROSS\(([^)]*)\)", cross, v)


def flag_layer(layer):
    if "/" in layer:
        return None
    if layer.startswith("#") or layer == "transparent":
        return "FlagLayer(0, longArrayOf(%s), floatArrayOf(1f))" % hexlit(argb(layer))
    repeating = layer.startswith("repeating-")
    layer = layer.replace("repeating-", "", 1)
    m = re.fullmatch(r"(linear|radial)-gradient\((.*)\)", layer)
    if not m:
        return None
    parts = split_top(m.group(2))
    kind = 1
    if m.group(1) == "radial":
        kind = 4
        parts = parts[1:]
    elif parts[0] == "90deg":
        kind, parts = 2, parts[1:]
    elif parts[0] in ("135deg", "to bottom right"):
        kind, parts = 3, parts[1:]
    cols, ends = [], []
    for i, st in enumerate(parts):
        bits = st.split()
        c = 0 if bits[0] == "transparent" else argb(bits[0])
        pct = [b for b in bits[1:] if b.endswith("%")]
        end = float(pct[-1].rstrip("%")) / 100 if pct and i < len(parts) - 1 else 1.0
        cols.append(hexlit(c) if c else "0L")
        ends.append(end if not repeating else float(pct[-1].rstrip("%")) / 100)
    if repeating:
        period = ends[-1]
        k = 1
        base_c, base_e = list(cols), list(ends)
        while ends[-1] < 0.999:
            cols += base_c
            ends += [min(1.0, e + period * k) for e in base_e]
            k += 1
    ends = [flt(e) for e in ends]
    return "FlagLayer(%d, longArrayOf(%s), floatArrayOf(%s))" % (kind, ", ".join(cols), ", ".join(ends))


def flags_kt():
    src = FLAGS.read_text()
    body = src[src.index("export const FLAGS"):]
    body = body[:body.index("};")]
    out = [HEADER, "class FlagLayer(val kind: Int, val colors: LongArray, val ends: FloatArray)\n\n", "object FlagLibrary {\n    val flags: Map<String, List<FlagLayer>> = mapOf(\n"]
    for code, val in re.findall(r"^\s+(\w+): (.+),$", body, re.M):
        v = expand_macros(val)
        v = v.strip('"')
        layers = [flag_layer(l) for l in reversed(split_top(v))]
        layers = [l for l in layers if l]
        out.append('        "%s" to listOf(%s),\n' % (code, ", ".join(layers)))
    out.append("    )\n}\n")
    return "".join(out)


APP_RES = ROOT / "android/polingual/src/main/res"
APP_ASSETS = ROOT / "android/polingual/src/main/assets/play"
WORDS = ROOT / "polingual/src/data/words.json"
PW_ORDER = ROOT / "polingual/src/lib/polyword/order.json"
PW_BANK = ROOT / "polingual/src/lib/polyword/bank.ts"


def imul(a, b):
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF


def fnv(s):
    h = 2166136261
    for ch in s.encode("utf-16-le").decode("utf-16-le"):
        for unit in ([ord(ch)] if ord(ch) < 0x10000 else [0xD800 + ((ord(ch) - 0x10000) >> 10), 0xDC00 + ((ord(ch) - 0x10000) & 0x3FF)]):
            h = imul(h ^ unit, 16777619)
    return h


def mulberry(seed):
    a = seed

    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def pw_shuffled(items, seed):
    out = list(items)
    r = mulberry(fnv(seed))
    for i in range(len(out) - 1, 0, -1):
        j = math.floor(r() * (i + 1))
        out[i], out[j] = out[j], out[i]
    return out


def pw_fold(raw):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", raw) if not unicodedata.category(c).startswith("M")).lower()


def pw_ordered(frozen, current):
    have = set(current)
    fresh = [x for x in current if x not in frozen]
    out = []
    for slug in frozen:
        if slug in have:
            out.append(slug)
        elif fresh:
            out.append(fresh.pop(0))
        elif current:
            out.append(current[fnv(slug) % len(current)])
    return out + fresh


def ts_list(src, name):
    m = re.search(r"export const %s = \[([^\]]*)\]" % name, src)
    return re.findall(r'"([^"]+)"', m.group(1))


def play_assets():
    words = json.loads(WORDS.read_text())
    slim = []
    for w in words:
        e = {k: w[k] for k in ("slug", "en", "gloss", "category", "tier") if k in w}
        if w.get("note"):
            e["note"] = w["note"]
        if w.get("roots"):
            e["roots"] = w["roots"]
        e["forms"] = [{k: f[k] for k in ("lang", "word", "ipa", "roman", "kana") if f.get(k)} for f in w["forms"]]
        slim.append(e)
    src = PW_BANK.read_text()
    targets, reveal = ts_list(src, "TARGETS"), ts_list(src, "REVEAL_ORDER")
    keep = set(targets) | set(reveal)
    frozen = json.loads(PW_ORDER.read_text())
    langs, used = {}, set()
    for lang in targets:
        seen, picks = set(), []
        for w in sorted(words, key=lambda x: x["slug"]):
            form = next((f for f in w["forms"] if f["lang"] == lang), None)
            if not form:
                continue
            key = pw_fold(form["word"])
            if not re.fullmatch(r"[a-z]+", key) or len(key) not in (5, 6) or key in seen:
                continue
            seen.add(key)
            picks.append(w["slug"])
            used.add(w["slug"])
        langs[lang] = pw_ordered(frozen.get(lang, []), pw_shuffled(picks, "polyword:" + lang))
    bank_words = {}
    for w in words:
        if w["slug"] not in used:
            continue
        forms = {}
        for f in w["forms"]:
            if f["lang"] not in keep or f["lang"] in forms:
                continue
            roman = f.get("roman") or f.get("kana")
            forms[f["lang"]] = {"word": f["word"], "roman": roman} if roman else {"word": f["word"]}
        bank_words[w["slug"]] = {"gloss": w.get("gloss") or w["en"], "forms": forms}
    bank = {"targets": targets, "reveal": reveal, "langs": langs, "words": bank_words}
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "\n"
    return {APP_ASSETS / "words.json": dump(slim), APP_ASSETS / "polyword-bank.json": dump(bank)}


def launcher(t):
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    font = instantiateVariableFont(TTFont(str(FONTS / "fredoka-latin-wght-normal.woff2")), {"wght": 700})
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    names = [cmap[ord(c)] for c in "Po"]
    width = sum(gs[n].width for n in names)
    scale = 40.0 / upm
    x0 = 54 - width * scale / 2
    cap = font["OS/2"].sCapHeight
    y0 = 54 + cap * scale / 2
    paths = []
    x = 0
    for n in names:
        pen = SVGPathPen(gs, ntos=lambda v: "%g" % round(v, 2))
        gs[n].draw(TransformPen(pen, (scale, 0, 0, -scale, x0 + x * scale, y0)))
        paths.append(pen.getCommands())
        x += gs[n].width
    paper = "#%06X" % (argb(t["color"]["paper"]) & 0xFFFFFF)
    verm = "#%06X" % (argb(t["color"]["vermilion"]) & 0xFFFFFF)
    fg = ('<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n'
          '    <path android:strokeColor="%s" android:strokeWidth="2.5" android:pathData="M26 26h56v56h-56z"/>\n' % paper
          + "".join('    <path android:fillColor="%s" android:pathData="%s"/>\n' % (paper, d) for d in paths) + "</vector>\n")
    bg = ('<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n'
          '    <path android:fillColor="%s" android:pathData="M0 0h108v108h-108z"/>\n</vector>\n' % verm)
    icon = ('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@drawable/ic_launcher_background"/>\n'
            '    <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n    <monochrome android:drawable="@drawable/ic_launcher_foreground"/>\n</adaptive-icon>\n')
    return {APP_RES / "drawable/ic_launcher_foreground.xml": fg, APP_RES / "drawable/ic_launcher_background.xml": bg,
            APP_RES / "mipmap-anydpi-v26/ic_launcher.xml": icon, APP_RES / "mipmap-anydpi-v26/ic_launcher_round.xml": icon}


def fonts():
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return
    RES_FONT.mkdir(parents=True, exist_ok=True)
    for src, dst in (("fredoka-latin-wght-normal.woff2", "pl_fredoka.ttf"), ("nunito-latin-wght-normal.woff2", "pl_nunito.ttf"),
                     ("space-mono-latin-400-normal.woff2", "pl_space_mono.ttf"), ("space-mono-latin-700-normal.woff2", "pl_space_mono_bold.ttf")):
        target = RES_FONT / dst
        if target.exists():
            continue
        f = TTFont(str(FONTS / src))
        f.flavor = None
        f.save(str(target))


def main():
    t = json.loads(TOKENS.read_text())
    s = ART.read_text()
    entries = json.loads(s[s.index("["):s.index("\n] as const") + 2])
    PKG_DIR.mkdir(parents=True, exist_ok=True)
    outputs = {PKG_DIR / "Tokens.kt": tokens_kt(t), PKG_DIR / "ArtData.kt": art_kt(entries + glyph_entries()), PKG_DIR / "Flags.kt": flags_kt(), **launcher(t), **play_assets()}
    check = "--check" in sys.argv
    stale = [p for p, body in outputs.items() if not p.exists() or p.read_text() != body]
    if check:
        if stale:
            print("stale: " + ", ".join(str(p) for p in stale))
            sys.exit(1)
        return
    for p, body in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body)
    fonts()


if __name__ == "__main__":
    main()
