#!/usr/bin/env python3
from pathlib import Path

OUT = Path(__file__).parent

SEASONS = {
    "winter": dict(b1="#2C4A6E", b2="#16263D", ink="#F2F6FA", sh="#0B1626", a1="#6FB7C2", a2="#F2F6FA"),
    "spring": dict(b1="#5E8C4A", b2="#2F5226", ink="#FBF6E6", sh="#1C3317", a1="#E58FA8", a2="#FBF6E6"),
    "summer": dict(b1="#E0A12C", b2="#B5631A", ink="#FFF8E8", sh="#6E3A0C", a1="#D9381E", a2="#FFF1B8"),
    "autumn": dict(b1="#74245F", b2="#4A1340", ink="#F6EEDC", sh="#2A0B23", a1="#D9381E", a2="#E9A23B"),
    "dawn": dict(b1="#F2A88B", b2="#B85C7A", ink="#FFF6EC", sh="#6A2C47", a1="#5B1A4A", a2="#FFD9A0"),
    "night": dict(b1="#1B1A33", b2="#07060F", ink="#E8E4FF", sh="#000000", a1="#7C6CF2", a2="#E8E4FF"),
    "aegean": dict(b1="#2E6B6B", b2="#123838", ink="#EFE8D4", sh="#0B2424", a1="#D9A43A", a2="#F6EEDC"),
    "stone": dict(b1="#E4DCC4", b2="#C9BE9C", ink="#2A261E", sh="#FFFFFF", a1="#B8861E", a2="#8A641A"),
}

SHAPES = {
    "classic": dict(g=11.5, L=14, r=32, w=13, curl=12, cap="round", mode="solid"),
    "open": dict(g=15, L=12, r=30, w=11, curl=10, cap="round", mode="solid"),
    "tight": dict(g=8, L=18, r=34, w=13, curl=14, cap="round", mode="solid"),
    "slab": dict(g=11.5, L=15, r=32, w=15, curl=8, cap="butt", mode="solid"),
    "hollow": dict(g=11.5, L=14, r=32, w=14, curl=12, cap="round", mode="hollow"),
    "double": dict(g=11.5, L=14, r=32, w=13, curl=12, cap="round", mode="double"),
}

FINISHES = ("flat", "stone", "metal")
STYLES = ("flat", "stone", "metal", "neon", "blueprint", "riso", "glass", "clay", "outline", "woodcut")
CENTERS = ("flame", "dot", "seed", "spark")
ANIMS = ("still", "flicker", "breathe", "draw", "glow", "sway", "cycle", "embers")


def omega(g, L, r, curl, y0=15, **_):
    l, rt = 50 - g, 50 + g
    return (
        f"M{l - L - 8} {y0}H{l - 8}C{l - 3} {y0} {l} {y0 + 4} {l} {y0 + curl}"
        f"A{r} {r} 0 1 0 {rt} {y0 + curl}"
        f"C{rt} {y0 + 4} {rt + 3} {y0} {rt + 8} {y0}H{rt + L + 8}"
    )


def center(kind, c):
    if kind == "flame":
        return (
            f'<path d="M50 38C58 48 64 54 64 62A14 14 0 0 1 36 62C36 54 42 48 50 38Z" fill="{c["a1"]}"/>'
            f'<path d="M50 50C54 55 57 58 57 62A7 7 0 0 1 43 62C43 58 46 55 50 50Z" fill="{c["a2"]}"/>'
        )
    if kind == "dot":
        return f'<circle cx="50" cy="60" r="9" fill="{c["a2"]}"/><circle cx="50" cy="59" r="6.5" fill="{c["a1"]}"/>'
    if kind == "seed":
        return (
            f'<path d="M50 42C60 50 60 66 50 74C40 66 40 50 50 42Z" fill="{c["a1"]}"/>'
            f'<path d="M50 48V70" stroke="{c["a2"]}" stroke-width="2.5" stroke-linecap="round"/>'
        )
    return (
        f'<path d="M50 44L53 56L65 59L53 62L50 74L47 62L35 59L47 56Z" fill="{c["a1"]}"/>'
        f'<circle cx="50" cy="59" r="3" fill="{c["a2"]}"/>'
    )


def anim_parts(anim):
    whole = flame = stroke = extra = ""
    if anim == "flicker":
        flame = '<animateTransform attributeName="transform" type="scale" values="1 1;0.94 1.07;1.04 0.96;1 1" dur="1.4s" repeatCount="indefinite"/>'
    elif anim == "breathe":
        whole = '<animateTransform attributeName="transform" type="scale" values="1;1.04;1" dur="4s" repeatCount="indefinite"/>'
    elif anim == "draw":
        flame = '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.55;0.7;1" dur="3s" repeatCount="indefinite"/>'
        stroke = '<animate attributeName="stroke-dashoffset" values="100;0;0" keyTimes="0;0.55;1" dur="3s" repeatCount="indefinite"/>'
    elif anim == "glow":
        flame = '<animate attributeName="opacity" values="1;0.55;1" dur="2.2s" repeatCount="indefinite"/>'
        extra = '<circle cx="50" cy="60" r="16" fill="#FFE7A8" opacity="0.25" filter="url(#blur)"><animate attributeName="r" values="12;22;12" dur="2.2s" repeatCount="indefinite"/></circle>'
    elif anim == "sway":
        whole = '<animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur="3.5s" repeatCount="indefinite"/>'
    elif anim == "embers":
        extra = "".join(
            f'<circle cx="{x}" cy="56" r="1.6" fill="#FFD27A"><animate attributeName="cy" values="56;20" dur="{d}s" begin="{b}s" repeatCount="indefinite"/>'
            f'<animate attributeName="opacity" values="1;0" dur="{d}s" begin="{b}s" repeatCount="indefinite"/></circle>'
            for x, d, b in ((46, 2.2, 0), (52, 1.8, 0.6), (49, 2.6, 1.1), (54, 2.0, 1.5))
        )
    return whole, flame, stroke, extra


def style_glyph(finish, p, st, w, c, stroke):
    d = f'd="{p}" {st}'
    if finish == "neon":
        return (f'<path {d} stroke-width="{w - 4}" stroke="{c["a1"]}" filter="url(#glow)">{stroke}</path>'
                f'<path {d} stroke-width="{w - 9}" stroke="#FFFFFF">{stroke}</path>')
    if finish == "blueprint":
        return (f'<path {d} stroke-width="{w}" stroke="#FFFFFF">{stroke}</path>'
                f'<path {d} stroke-width="{w - 2.5}" stroke="#1D4E89">{stroke}</path>'
                f'<path {d} stroke-width="0.6" stroke="#FFFFFF" stroke-dasharray="2 2"/>')
    if finish == "riso":
        return (f'<path {d} stroke-width="{w}" stroke="#FF48B0" opacity=".85" transform="translate(1.6 1.2)">{stroke}</path>'
                f'<path {d} stroke-width="{w}" stroke="#0078BF" opacity=".8" style="mix-blend-mode:multiply">{stroke}</path>')
    if finish == "glass":
        return (f'<path {d} stroke-width="{w + 3}" stroke="#141414">{stroke}</path>'
                f'<path {d} stroke-width="{w - 3}" stroke="{c["ink"]}" opacity=".9">{stroke}</path>'
                f'<path {d} stroke-width="{w - 3}" stroke="url(#clay)">{stroke}</path>'
                f'<path {d} stroke-width="1.2" stroke="#141414" stroke-dasharray="7 9"/>')
    if finish == "clay":
        return (f'<path {d} stroke-width="{w}" stroke="#000000" opacity=".35" filter="url(#soft)" transform="translate(0 5)"/>'
                f'<path {d} stroke-width="{w}" stroke="{c["ink"]}">{stroke}</path>'
                f'<path {d} stroke-width="{w}" stroke="url(#clay)">{stroke}</path>')
    if finish == "outline":
        return (f'<path {d} stroke-width="{w}" stroke="{c["ink"]}">{stroke}</path>'
                f'<path {d} stroke-width="{w - 4}" stroke="{c["b2"]}">{stroke}</path>'
                f'<path {d} stroke-width="{w - 9}" stroke="{c["ink"]}">{stroke}</path>')
    if finish == "woodcut":
        return (f'<path {d} stroke-width="{w + 1}" stroke="#2A261E">{stroke}</path>'
                f'<path {d} stroke-width="{w - 6}" stroke="#EDE3CC" stroke-dasharray="1.5 3"/>')
    return ""


def bg_fill(c, finish, anim):
    if anim == "cycle":
        vals = ";".join(SEASONS[s]["b1"] for s in ("winter", "spring", "summer", "autumn", "winter"))
        return f'<rect width="1024" height="1024" fill="{c["b1"]}"><animate attributeName="fill" values="{vals}" dur="8s" repeatCount="indefinite"/></rect>'
    if finish == "neon":
        return '<rect width="1024" height="1024" fill="#0B0A14"/>'
    if finish == "blueprint":
        return '<rect width="1024" height="1024" fill="#1D4E89"/><rect width="1024" height="1024" fill="url(#grid)"/>'
    if finish == "riso":
        return '<rect width="1024" height="1024" fill="#F4EEDF"/><rect width="1024" height="1024" filter="url(#tex)"/>'
    if finish == "woodcut":
        return '<rect width="1024" height="1024" fill="#EDE3CC"/><rect width="1024" height="1024" fill="url(#hatch)"/>'
    base = '<rect width="1024" height="1024" fill="url(#bg)"/>'
    if finish == "stone":
        base += '<rect width="1024" height="1024" filter="url(#tex)"/>'
    return base


def svg(season, shape, finish="flat", kind="flame", anim="still"):
    c, s = SEASONS[season], SHAPES[shape]
    p = omega(**s)
    whole, flame, stroke, extra = anim_parts(anim)
    dash = ' pathLength="100" stroke-dasharray="100"' if anim == "draw" else ""
    ink = "url(#metal)" if finish == "metal" else c["ink"]
    dy = -3 if finish == "stone" else 4
    st = f'fill="none" stroke-linecap="{s["cap"]}" stroke-linejoin="round"{dash}'
    w = s["w"]
    styled = style_glyph(finish, p, st, w, c, stroke)
    if styled:
        glyph = styled
    elif s["mode"] == "hollow":
        glyph = (
            f'<path d="{p}" {st} stroke-width="{w}" stroke="{c["sh"]}" transform="translate(0 {dy})">{stroke}</path>'
            f'<path d="{p}" {st} stroke-width="{w}" stroke="{ink}">{stroke}</path>'
            f'<path d="{p}" {st} stroke-width="{w - 7}" stroke="{c["b2"]}">{stroke}</path>'
        )
    elif s["mode"] == "double":
        glyph = (
            f'<path d="{p}" {st} stroke-width="{w + 6}" stroke="{c["a1"]}" transform="translate(0 {dy})">{stroke}</path>'
            f'<path d="{p}" {st} stroke-width="{w}" stroke="{ink}">{stroke}</path>'
        )
    else:
        glyph = (
            f'<path d="{p}" {st} stroke-width="{w}" stroke="{c["sh"]}" transform="translate(0 {dy})">{stroke}</path>'
            f'<path d="{p}" {st} stroke-width="{w}" stroke="{ink}">{stroke}</path>'
        )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs>
<radialGradient id="bg" cx="50%" cy="40%" r="72%"><stop offset="0" stop-color="{c['b1']}"/><stop offset="1" stop-color="{c['b2']}"/></radialGradient>
<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset="0.45" stop-color="#D9A43A"/><stop offset="0.55" stop-color="#8A641A"/><stop offset="1" stop-color="#E9C46A"/></linearGradient>
<filter id="tex"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .2 0"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#FFFFFF" stroke-opacity=".18" stroke-width="2"/></pattern>
<pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 7H14" stroke="#2A261E" stroke-opacity=".12" stroke-width="3"/></pattern>
<linearGradient id="clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="1" stop-color="#000000" stop-opacity=".2"/></linearGradient>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5"/></filter>
<filter id="blur"><feGaussianBlur stdDeviation="4"/></filter>
</defs>
{bg_fill(c, finish, anim)}
<g transform="translate(162 140) scale(7)"><g transform-origin="50 50">{whole}
{glyph}{extra}
<g transform-origin="50 76">{center(kind, c)}{flame}</g>
</g></g></svg>"""


def main():
    for old in OUT.glob("*.svg"):
        old.unlink()
    sections = {}

    def put(section, name, body):
        (OUT / f"{name}.svg").write_text(body)
        sections.setdefault(section, []).append(name)

    for season in SEASONS:
        for shape in SHAPES:
            put("Season by shape", f"{season}-{shape}", svg(season, shape))
    for kind in CENTERS:
        for finish in FINISHES:
            put("Center by finish", f"{kind}-{finish}", svg("autumn" if finish != "stone" else "stone", "classic", finish, kind))
    for style in STYLES:
        for season in ("autumn", "winter", "summer"):
            put("Styles", f"style-{style}-{season}", svg(season, "classic", style, "flame"))
    for anim in ANIMS[1:]:
        for season in ("autumn", "night"):
            put("Animations", f"anim-{anim}-{season}", svg(season, "classic", "flat", "flame", anim))
    html = [
        '<!doctype html><html><head><meta charset="utf-8"><title>Omega variants</title><style>'
        "body{margin:0;background:#ddd;font:12px monospace;padding:16px}"
        ".g{display:grid;grid-template-columns:repeat(6,160px);gap:12px}"
        "img{width:160px;border-radius:36px}figure{margin:0}h2{font:600 18px sans-serif;margin:24px 0 10px}"
        "</style></head><body>"
    ]
    for title, names in sections.items():
        html.append(f"<h2>{title}</h2><div class='g'>")
        html += [f'<figure><img src="{n}.svg"><figcaption>{n}</figcaption></figure>' for n in names]
        html.append("</div>")
    (OUT / "seasons.html").write_text("".join(html) + "</body></html>")


if __name__ == "__main__":
    main()
