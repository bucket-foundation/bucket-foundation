#!/usr/bin/env python3
from pathlib import Path

OUT = Path(__file__).parent

SEASONS = {
    "winter": dict(b1="#2C4A6E", b2="#16263D", ink="#F2F6FA", sh="#0B1626", a1="#6FB7C2", a2="#F2F6FA"),
    "spring": dict(b1="#5E8C4A", b2="#2F5226", ink="#FBF6E6", sh="#1C3317", a1="#E58FA8", a2="#FBF6E6"),
    "summer": dict(b1="#E0A12C", b2="#B5631A", ink="#FFF8E8", sh="#6E3A0C", a1="#D9381E", a2="#FFF1B8"),
    "autumn": dict(b1="#74245F", b2="#4A1340", ink="#F6EEDC", sh="#2A0B23", a1="#D9381E", a2="#E9A23B"),
}

SHAPES = {
    "classic": dict(g=11.5, L=14, r=32, w=13, curl=12, cap="round"),
    "open": dict(g=15, L=12, r=30, w=12, curl=10, cap="round"),
    "tight": dict(g=8, L=18, r=34, w=13, curl=14, cap="round"),
    "slab": dict(g=11.5, L=15, r=32, w=15, curl=8, cap="butt"),
}


def omega(g, L, r, curl, y0=15, **_):
    l, rt = 50 - g, 50 + g
    return (
        f"M{l - L - 8} {y0}H{l - 8}C{l - 3} {y0} {l} {y0 + 4} {l} {y0 + curl}"
        f"A{r} {r} 0 1 0 {rt} {y0 + curl}"
        f"C{rt} {y0 + 4} {rt + 3} {y0} {rt + 8} {y0}H{rt + L + 8}"
    )


DROP = "M50 38C58 48 64 54 64 62A14 14 0 0 1 36 62C36 54 42 48 50 38Z"
INNER = "M50 50C54 55 57 58 57 62A7 7 0 0 1 43 62C43 58 46 55 50 50Z"

ANIM = {
    "still": ("", "", ""),
    "flicker": (
        "",
        '<animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;0.94 1.07;1.04 0.96;1 1" dur="1.4s" repeatCount="indefinite"/>',
        "",
    ),
    "breathe": (
        '<animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.04;1" dur="4s" repeatCount="indefinite"/>',
        "",
        "",
    ),
    "draw": (
        "",
        '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.55;0.7;1" dur="3s" repeatCount="indefinite"/>',
        '<animate attributeName="stroke-dashoffset" values="100;0;0" keyTimes="0;0.55;1" dur="3s" repeatCount="indefinite"/>',
    ),
}


def svg(season, shape, anim="still"):
    c, s = SEASONS[season], SHAPES[shape]
    p = omega(**s)
    whole, flame, stroke = ANIM[anim]
    dash = ' pathLength="100" stroke-dasharray="100"' if anim == "draw" else ""
    st = f'fill="none" stroke-width="{s["w"]}" stroke-linecap="{s["cap"]}" stroke-linejoin="round"{dash}'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><radialGradient id="bg" cx="50%" cy="40%" r="72%"><stop offset="0" stop-color="{c['b1']}"/><stop offset="1" stop-color="{c['b2']}"/></radialGradient></defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<g transform="translate(162 140) scale(7)"><g transform-origin="50 50">{whole}
<path d="{p}" {st} stroke="{c['sh']}" transform="translate(0 4)">{stroke}</path>
<path d="{p}" {st} stroke="{c['ink']}">{stroke}</path>
<g transform-origin="50 76"><path d="{DROP}" fill="{c['a1']}"/><path d="{INNER}" fill="{c['a2']}"/>{flame}</g>
</g></g></svg>"""


def main():
    files = []
    for season in SEASONS:
        for shape in SHAPES:
            n = f"{season}-{shape}.svg"
            (OUT / n).write_text(svg(season, shape))
            files.append(n)
    anims = []
    for anim in ("flicker", "breathe", "draw"):
        for season in SEASONS:
            n = f"anim-{anim}-{season}.svg"
            (OUT / n).write_text(svg(season, "classic", anim))
            anims.append(n)
    cell = lambda n: f'<figure><img src="{n}"><figcaption>{n[:-4]}</figcaption></figure>'
    (OUT / "seasons.html").write_text(
        '<!doctype html><html><head><meta charset="utf-8"><title>Omega seasons</title><style>'
        "body{margin:0;background:#ddd;font:13px monospace;padding:16px}"
        "div{display:grid;grid-template-columns:repeat(4,220px);gap:14px}"
        "img{width:220px;border-radius:50px}figure{margin:0}h2{font:600 18px sans-serif}"
        "</style></head><body><h2>Seasons by shape</h2><div>"
        + "".join(cell(f) for f in files)
        + "</div><h2>Animations</h2><div>"
        + "".join(cell(f) for f in anims)
        + "</div></body></html>"
    )


if __name__ == "__main__":
    main()
