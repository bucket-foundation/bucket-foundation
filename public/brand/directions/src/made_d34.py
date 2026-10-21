import json, math, random, re

from paths import DIRECTIONS_DIR as DIR


def credits(did, rel, files):
    src = {s["file"]: s for s in json.load(open(f"{DIR}/licensed/{did}/sources.json"))}
    parts = []
    for f in files:
        s = src[f]
        parts.append(f'<a href="{s["url"]}">{s["title"]}</a>, {s["creator"]}, {s["license"]}')
    return '<figcaption class="made-credit">' + "; ".join(parts) + "</figcaption>"


def d3_defs():
    rnd = random.Random(7)
    chips = "".join(
        f'<polygon points="{" ".join(f"{x + rnd.uniform(-5, 5):.1f},{y + rnd.uniform(-5, 5):.1f}" for _ in range(3))}" fill="{rnd.choice(["#FF4B91", "#1CB0F6", "#FFC800", "#2B2B2B", "#58CC02"])}"/>'
        for x, y in ((rnd.uniform(4, 60), rnd.uniform(4, 60)) for _ in range(14)))
    return f'''<defs>
<pattern id="m3-squig" width="32" height="16" patternUnits="userSpaceOnUse"><rect width="32" height="16" fill="#FFC800"/><path d="M0 8c4-8 12-8 16 0s12 8 16 0" fill="none" stroke="#2B2B2B" stroke-width="2.5" stroke-linecap="round"/></pattern>
<pattern id="m3-zig" width="16" height="12" patternUnits="userSpaceOnUse"><rect width="16" height="12" fill="#1CB0F6"/><path d="M0 9l4-6 4 6 4-6 4 6" fill="none" stroke="#FFF8E7" stroke-width="2.5" stroke-linejoin="miter"/></pattern>
<pattern id="m3-terr" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="#FFF8E7"/>{chips}</pattern>
<pattern id="m3-dots" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#FF4B91"/><circle cx="6" cy="6" r="2.2" fill="#2B2B2B"/></pattern>
<pattern id="m3-stripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#FFF8E7"/><rect width="5" height="10" fill="#2B2B2B"/></pattern>
</defs>'''


def d3_hero(rel):
    svg = f'''<svg class="made-ill" viewBox="0 0 480 480" role="img" aria-label="Flat Memphis composition after Sottsass, the Casablanca sideboard and the Tartar table, built from pattern tiles">
<rect width="480" height="480" rx="16" fill="url(#m3-terr)"/>
<circle cx="356" cy="120" r="76" fill="url(#m3-dots)" stroke="#2B2B2B" stroke-width="4"/>
<path d="M40 432L132 268 224 432Z" fill="url(#m3-zig)" stroke="#2B2B2B" stroke-width="4" stroke-linejoin="round"/>
<g stroke="#2B2B2B" stroke-width="4" stroke-linejoin="round">
<rect x="212" y="300" width="72" height="132" fill="#FF4B91"/>
<rect x="196" y="236" width="104" height="64" fill="url(#m3-squig)"/>
<path d="M196 236L132 172 152 152 216 216Z" fill="#58CC02"/>
<path d="M300 236L364 172 344 152 280 216Z" fill="#58CC02"/>
<rect x="228" y="140" width="40" height="96" fill="url(#m3-stripe)"/>
<path d="M248 140L218 96h60Z" fill="#FFC800"/>
<rect x="176" y="432" width="144" height="16" fill="#2B2B2B"/>
</g>
<path d="M60 96c16-24 32 24 48 0s32 24 48 0" fill="none" stroke="#2B2B2B" stroke-width="5" stroke-linecap="round"/>
<path d="M368 300l16 16-16 16 16 16-16 16" fill="none" stroke="#FF4B91" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="404" cy="420" r="18" fill="#FFC800" stroke="#2B2B2B" stroke-width="4"/>
</svg>'''
    photo = f'<img class="made-blob" src="{rel}/licensed/d3/sottsass-tartar.jpg" alt="Tartar table by Ettore Sottsass for Memphis, 1985" width="200" height="200" loading="lazy">'
    return f'<figure class="made-fig">{svg}{photo}</figure>'


def d4_defs():
    dot = "data:image/svg+xml," + re.sub(r"\s+", " ", '''<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><defs><radialGradient id='g'><stop offset='0' stop-color='black'/><stop offset='1' stop-color='white'/></radialGradient></defs><rect width='8' height='8' fill='url(%23g)'/></svg>''')
    grain = '<filter id="m4-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter>'
    return f'''<svg class="made-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
<filter id="m4-ht" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feColorMatrix type="matrix" values=".3 .59 .11 0 0 .3 .59 .11 0 0 .3 .59 .11 0 0 0 0 0 0 1" result="L"/>
<feImage href="{dot}" x="0" y="0" width="8" height="8" preserveAspectRatio="none" result="dot"/>
<feTile in="dot" result="dots"/>
<feComposite in="L" in2="dots" operator="arithmetic" k2="1" k3="1" k4="-.6" result="s"/>
<feComponentTransfer in="s"><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
<feColorMatrix type="matrix" values=".81 0 0 0 .078 .063 0 0 0 .078 .09 0 0 0 .078 0 0 0 0 1"/>
</filter><filter id="m4-htl" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feColorMatrix type="matrix" values=".3 .59 .11 0 0 .3 .59 .11 0 0 .3 .59 .11 0 0 0 0 0 0 1" result="L"/>
<feImage href="{dot}" x="0" y="0" width="8" height="8" preserveAspectRatio="none" result="dot2"/>
<feTile in="dot2" result="dots"/>
<feComposite in="L" in2="dots" operator="arithmetic" k2="1" k3="1" k4=".05" result="s"/>
<feComponentTransfer in="s"><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
<feColorMatrix type="matrix" values=".81 0 0 0 .078 .063 0 0 0 .078 .09 0 0 0 .078 0 0 0 0 1"/>
</filter>{grain}</defs></svg>'''


def shukhov(cx, base, top, h, r0, r1, n=24, tiers=4):
    out = []
    th = h / tiers
    for t in range(tiers):
        y0 = base - t * th
        y1 = y0 - th
        ra = r0 - (r0 - r1) * t / tiers
        rb = r0 - (r0 - r1) * (t + 1) / tiers
        for k in range(n):
            a = 2 * math.pi * k / n
            for sgn in (1, -1):
                b = a + sgn * math.pi * 0.42
                if math.sin(a) < -0.2 and math.sin(b) < -0.2:
                    continue
                out.append(f'<line x1="{cx + ra * math.cos(a):.1f}" y1="{y0 + ra * 0.12 * math.sin(a):.1f}" x2="{cx + rb * math.cos(b):.1f}" y2="{y1 + rb * 0.12 * math.sin(b):.1f}"/>')
        out.append(f'<ellipse cx="{cx}" cy="{y1:.1f}" rx="{rb:.1f}" ry="{rb * 0.12:.1f}" fill="none"/>')
    out.append(f'<ellipse cx="{cx}" cy="{base}" rx="{r0}" ry="{r0 * 0.12:.1f}" fill="none"/>')
    return "".join(out)


def d4_hero(rel):
    tower = shukhov(300, 560, 80, 480, 110, 34)
    svg = f'''<svg class="made-ill" viewBox="0 0 480 600" role="img" aria-label="Photomontage after Klutsis: halftone Shukhov tower and poster fragment cut into a wedge and a circle over flat red and black, with the tower lattice redrawn as ruled hyperboloid lines">
<defs><clipPath id="m4-wedge"><path d="M0 600L0 230 300 600Z"/></clipPath><clipPath id="m4-circ"><circle cx="150" cy="190" r="128"/></clipPath></defs>
<rect width="480" height="600" fill="#141414"/>
<path d="M480 0H170L480 380Z" fill="#E3242B"/>
<image href="{rel}/licensed/d4/klutsis-banner.jpg" x="-40" y="200" width="420" height="420" preserveAspectRatio="xMidYMid slice" clip-path="url(#m4-wedge)" filter="url(#m4-htl)"/>
<image href="{rel}/licensed/d4/shukhov-1925.jpg" x="22" y="62" width="256" height="256" preserveAspectRatio="xMidYMid slice" clip-path="url(#m4-circ)" filter="url(#m4-ht)"/>
<circle cx="150" cy="190" r="128" fill="none" stroke="#EFE6D2" stroke-width="4"/>
<g stroke="#EFE6D2" stroke-width="1.6" opacity=".9">{tower}</g>
<path d="M0 500L480 330" stroke="#E3242B" stroke-width="14"/>
<path d="M40 560L460 412" stroke="#EFE6D2" stroke-width="4"/>
<text x="24" y="48" fill="#EFE6D2" font-family="Oswald,sans-serif" font-weight="700" font-size="34" letter-spacing="3" transform="rotate(-6 24 48)">NO. 1</text>
</svg>'''
    return f'<figure class="made-fig">{svg}</figure>'


HERO_RE = re.compile(r'<figure[^>]*>\s*<img src="[^"]*img/d[34]-hero\.jpg"[^>]*>\s*</figure>')


def inject(did, html, rel):
    if did == "d7":
        return inject_d7(html, rel)
    if did not in ("d3", "d4") or "made/" + did + ".css" in html:
        return html
    hero = d3_hero(rel) if did == "d3" else d4_hero(rel)
    had = bool(re.search(r'img/d[34]-hero\.jpg', html))
    html = HERO_RE.sub(lambda m: hero, html)
    html = re.sub(r'<img src="[^"]*img/d[34]-hero\.jpg"[^>]*>', hero, html)
    html = html.replace("http://127.0.0.1:8777/_directions", rel)
    if had:
        cap = credits(did, rel, ["sottsass-tartar.jpg"] if did == "d3" else ["klutsis-banner.jpg", "shukhov-1925.jpg"]).replace("<figcaption", '<p').replace("</figcaption>", "</p>").replace('class="made-credit"', 'class="made-credit made-foot"')
        html = html.replace("</footer>", cap + "</footer>", 1) if "</footer>" in html else html.replace("</body>", cap + "</body>", 1)
    if did == "d3" and "<title>bkt Squiggle settings" in html:
        html = html.replace("</main>", d3_extra() + "</main>", 1)
    if did == "d4" and "<title>bkt settings" in html:
        html = html.replace("</head>", "<style>@media(min-width:1200px){.main{min-height:100vh;display:flex;flex-direction:column}}</style></head>", 1)
    head = f'<link rel="stylesheet" href="{rel}/made/{did}.css"><script src="{rel}/made/{did}.js" defer></script>'
    html = html.replace("</head>", head + "</head>", 1)
    defs = d4_defs() if did == "d4" else f'<svg class="made-defs" width="0" height="0" aria-hidden="true" focusable="false">{d3_defs()}</svg>'
    html = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + defs, html, count=1)
    return html


def d3_extra():
    days = [("M", 30), ("T", 45), ("W", 0), ("T", 50), ("F", 35), ("S", 60), ("S", 20)]
    fills = ["url(#m3-squig)", "url(#m3-zig)", "url(#m3-dots)", "url(#m3-stripe)"]
    bars = "".join(f'<rect x="{16 + k * 44}" y="{140 - v * 2}" width="28" height="{max(v * 2, 2)}" rx="6" fill="{fills[k % 4]}" stroke="#2B2B2B" stroke-width="3"/><text x="{30 + k * 44}" y="164" text-anchor="middle" font-size="13" font-weight="700" fill="#2B2B2B">{n}</text>' for k, (n, v) in enumerate(days))
    hist = f'<svg viewBox="0 0 330 172" role="img" aria-label="XP per day this week: 30, 45, 0, 50, 35, 60, 20" style="width:100%;height:auto;max-width:420px">{bars}<path d="M8 142h316" stroke="#2B2B2B" stroke-width="3" stroke-dasharray="6 6"/></svg>'
    langs = [("Español", "cien", 82), ("Русский", "сто", 54), ("עברית", "מאה", 31), ("Ελληνικά", "εκατό", 12)]
    pl = "".join(f'<li class="row" style="gap:var(--s3);align-items:center"><span style="width:96px">{n}</span><span class="grow"><span class="prog" role="progressbar" aria-label="{n}" aria-valuenow="{v}" aria-valuemin="0" aria-valuemax="100" style="display:block"><i style="width:{v}%;display:block;height:100%"></i></span></span><span class="mono small">{w}</span></li>' for n, w, v in langs)
    follows = [("Shannon 1948", "Information"), ("Noether 1918", "Mathematics"), ("Maxwell 1865", "Physics"), ("Landauer 1961", "Information")]
    fl = "".join(f'<li class="row" style="gap:var(--s3);align-items:center;justify-content:space-between"><span><b>{a}</b><br><span class="muted small">{b}</span></span><button class="btn ghost sm">Following</button></li>' for a, b in follows)
    ul = 'style="list-style:none;margin:0;padding:0;display:grid;gap:var(--s3)"'
    return f'<div class="made-extra" style="display:grid;gap:var(--s5);grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));margin-top:var(--s6)"><section class="card stack"><h3>Study history</h3>{hist}<p class="muted small">240 XP this week. Best day Saturday.</p></section><section class="card stack"><h3>Polingual</h3><ul {ul}>{pl}</ul><p class="muted small">Words known per script for the root hundred family.</p></section><section class="card stack"><h3>Canon follows</h3><ul {ul}>{fl}</ul></section></div>'


BYR = dict(red="#D9472B", yel="#E3A21A", blu="#1F5A80", blk="#1A1714")

GREEK_I1 = [
    ("Ἐπὶ τῆς δοθείσης εὐθείας πεπερασμένης τρίγωνον ἰσόπλευρον συστήσασθαι.", "On a given finite straight line to construct an equilateral triangle."),
    ("Ἔστω ἡ δοθεῖσα εὐθεῖα πεπερασμένη ἡ ΑΒ. Δεῖ δὴ ἐπὶ τῆς ΑΒ εὐθείας τρίγωνον ἰσόπλευρον συστήσασθαι.", "Let AB be the given finite straight line. Thus it is required to construct an equilateral triangle on the straight line AB."),
    ("Κέντρῳ μὲν τῷ Α διαστήματι δὲ τῷ ΑΒ κύκλος γεγράφθω ὁ ΒΓΔ, καὶ πάλιν κέντρῳ μὲν τῷ Β διαστήματι δὲ τῷ ΒΑ κύκλος γεγράφθω ὁ ΑΓΕ, καὶ ἀπὸ τοῦ Γ σημείου, καθ' ὃ τέμνουσιν ἀλλήλους οἱ κύκλοι, ἐπὶ τὰ Α, Β σημεῖα ἐπεζεύχθωσαν εὐθεῖαι αἱ ΓΑ, ΓΒ.", "With centre A and distance AB let the circle BCD be described; again, with centre B and distance BA let the circle ACE be described; and from the point C, in which the circles cut one another, to the points A, B let the straight lines CA, CB be joined."),
    ("Καὶ ἐπεὶ τὸ Α σημεῖον κέντρον ἐστὶ τοῦ ΓΔΒ κύκλου, ἴση ἐστὶν ἡ ΑΓ τῇ ΑΒ· πάλιν, ἐπεὶ τὸ Β σημεῖον κέντρον ἐστὶ τοῦ ΓΑΕ κύκλου, ἴση ἐστὶν ἡ ΒΓ τῇ ΒΑ.", "Now, since the point A is the centre of the circle CDB, AC is equal to AB. Again, since the point B is the centre of the circle CAE, BC is equal to BA."),
    ("ἐδείχθη δὲ καὶ ἡ ΓΑ τῇ ΑΒ ἴση· ἑκατέρα ἄρα τῶν ΓΑ, ΓΒ τῇ ΑΒ ἐστὶν ἴση. τὰ δὲ τῷ αὐτῷ ἴσα καὶ ἀλλήλοις ἐστὶν ἴσα· καὶ ἡ ΓΑ ἄρα τῇ ΓΒ ἐστὶν ἴση· αἱ τρεῖς ἄρα αἱ ΓΑ, ΑΒ, ΒΓ ἴσαι ἀλλήλαις εἰσίν.", "But CA was also proved equal to AB; therefore each of the straight lines CA, CB is equal to AB. And things which are equal to the same thing are also equal to one another; therefore CA is also equal to CB. Therefore the three straight lines CA, AB, BC are equal to one another."),
    ("Ἰσόπλευρον ἄρα ἐστὶ τὸ ΑΒΓ τρίγωνον, καὶ συνέσταται ἐπὶ τῆς δοθείσης εὐθείας πεπερασμένης τῆς ΑΒ. [Ἐπὶ τῆς δοθείσης ἄρα εὐθείας πεπερασμένης τρίγωνον ἰσόπλευρον συνέσταται]· ὅπερ ἔδει ποιῆσαι.", "Therefore the triangle ABC is equilateral; and it has been constructed on the given finite straight line AB. (Being) what it was required to do."),
]
TEXT_SRC = '<p class="made-credit">Greek: Heiberg text, <a href="https://el.wikisource.org/wiki/Στοιχεία/α">Wikisource, Στοιχεία/α</a>. English: T. L. Heath, The Thirteen Books of Euclid\'s Elements, 1908, vol. 1, <a href="https://archive.org/details/bub_gb_UhgPAAAAIAAJ">archive.org</a>. Public domain.</p>'


def byrne_i1(step=6, cls="made-ill", label="Elements I.1 traced from Byrne's 1847 plate: blue circle about A, red circle about B, black base, yellow and red sides", w=540, h=430):
    ax, ay, bx = 200, 181, 340
    r = bx - ax
    cx, cy = (ax + bx) / 2, ay - r * math.sqrt(3) / 2
    parts = [
        f'<path class="pf" style="--k:0" pathLength="1" d="M{ax} {ay}H{bx}" stroke="{BYR["blk"]}" stroke-width="5"/>',
        f'<circle class="pf" style="--k:1" pathLength="1" cx="{ax}" cy="{ay}" r="{r}" fill="none" stroke="{BYR["blu"]}" stroke-width="5"/>',
        f'<circle class="pf" style="--k:2" pathLength="1" cx="{bx}" cy="{ay}" r="{r}" fill="none" stroke="{BYR["red"]}" stroke-width="5"/>',
        f'<path class="pf" style="--k:3" pathLength="1" d="M{ax} {ay}L{cx} {cy:.1f}" stroke="{BYR["yel"]}" stroke-width="5"/>',
        f'<path class="pf" style="--k:4" pathLength="1" d="M{bx} {ay}L{cx} {cy:.1f}" stroke="{BYR["red"]}" stroke-width="5"/>',
        f'<path class="pf qed" style="--k:5" d="M{ax} {ay}L{cx} {cy:.1f}L{bx} {ay}Z" fill="{BYR["yel"]}" fill-opacity=".18"/>',
    ][:step]
    labs = f'<g font-family="GFS Didot,serif" font-size="24" fill="{BYR["blk"]}"><text x="{ax - 30}" y="{ay + 8}">Α</text><text x="{bx + 12}" y="{ay + 8}">Β</text>' + (f'<text x="{cx - 8}" y="{cy - 14:.1f}">Γ</text><text x="{ax - r - 26}" y="{ay + 8}">Δ</text><text x="{bx + r + 8}" y="{ay + 8}">Ε</text>' if step > 3 else "") + '</g>'
    return f'<svg class="{cls}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}"><rect width="{w}" height="{h}" fill="#F7F1E1"/><g fill="none" stroke-linecap="round">{"".join(parts)}</g>{labs}</svg>'


def stoichedon(rows=("ΣΤΟΙΧΕΙΑ⁝", "ΕΥΚΛΕΙΔΟΥ"), cell=56):
    n = max(len(r) for r in rows)
    W, H = n * cell + 32, len(rows) * cell + 32
    grid = "".join(f'<path d="M{16 + k * cell} 16V{H - 16}"/>' for k in range(n + 1)) + "".join(f'<path d="M16 {16 + k * cell}H{W - 16}"/>' for k in range(len(rows) + 1))
    letters = "".join(f'<text x="{16 + c * cell + cell / 2}" y="{16 + r * cell + cell * .74}">{ch}</text>' for r, row in enumerate(rows) for c, ch in enumerate(row))
    return f'<svg class="stoich" viewBox="0 0 {W} {H}" role="img" aria-label="ΣΤΟΙΧΕΙΑ ΕΥΚΛΕΙΔΟΥ, Euclid\'s Elements, set stoichedon on a letter grid"><rect width="{W}" height="{H}" fill="#E9E1D0"/><g stroke="#A6442A" stroke-width="1" opacity=".35">{grid}</g><g font-family="GFS Neohellenic,GFS Didot,serif" font-size="{cell * .78:.0f}" text-anchor="middle" fill="#1A1714">{letters}</g></svg>'


def lic(rel, f, alt, cls="made-photo"):
    return f'<img class="{cls}" src="{rel}/licensed/d7/{f}" alt="{alt}" loading="lazy">'


def prop_block(rel, n=3):
    rows = "".join(f'<li><p lang="grc" class="grc-t">{g}</p><p class="en-t">{e}</p></li>' for g, e in GREEK_I1[:n])
    return (f'<div class="prop-grid"><figure class="pfig">{byrne_i1()}<figcaption class="made-credit">Traced from Byrne 1847, Book I Prop. I</figcaption></figure>'
            f'<figure class="pfig">{lic(rel, "byrne-i1-figure.jpg", "Byrne 1847, Book I Proposition I, the printed plate")}<figcaption class="made-credit">Byrne 1847 plate</figcaption></figure></div>'
            f'<ol class="proof">{rows}</ol>{TEXT_SRC}')


def d7_hero(rel):
    return (f'<figure class="made-fig made-prop">{stoichedon()}'
            f'<div class="pair">{lic(rel, "stoichedon-ig-i3-48.jpg", "IG I³ 48, an Athenian decree cut stoichedon, Epigraphic Museum Athens")}{lic(rel, "euphronios-krater.jpg", "Euphronios krater, Attic red-figure, about 515 BC")}</div>'
            f'<figcaption class="prop-n"><span lang="grc">Πρότασις αʹ</span> · Proposition I.1</figcaption>{prop_block(rel, 1)}</figure>')


def math_block(rel):
    return (f'<section class="made-math"><p class="prop-n"><span lang="grc">Στοιχεῖα αʹ, Πρότασις αʹ</span> · Elements I.1, Heiberg text with Heath\'s English</p>{prop_block(rel, 6)}'
            f'<div class="pair">{lic(rel, "oxyrhynchus-euclid.jpg", "P. Oxy. I 29, a papyrus fragment of Elements II.5, about AD 100")}{lic(rel, "vat-gr-190.jpg", "Vat. gr. 190, a 9th-century minuscule manuscript of the Elements, Book I Proposition 47")}</div></section>')


def side_art(rel):
    return f'<figure class="side-coin">{lic(rel, "tetradrachm-owl-reverse.png", "Athenian tetradrachm, reverse with the owl of Athena", "coin")}</figure>'


def credit_d7(html, rel):
    used = []
    for f in re.findall(r'licensed/d7/([\w.-]+)', html):
        if f not in used:
            used.append(f)
    if not used:
        return html
    cap = credits("d7", rel, used).replace("<figcaption", "<p").replace("</figcaption>", "</p>").replace('class="made-credit"', 'class="made-credit made-foot"')
    if "</footer>" in html:
        return html.replace("</footer>", cap + "</footer>", 1)
    if "</main>" in html:
        return html.replace("</main>", cap + "</main>", 1)
    return html.replace("</body>", cap + "</body>", 1)


def inject_d7(html, rel):
    if "made/d7.css" in html:
        return html
    html = re.sub(r'<figure[^>]*>\s*<img src="[^"]*img/d7-hero\.jpg"[^>]*>\s*</figure>', lambda m: d7_hero(rel), html)
    html = re.sub(r'<img src="[^"]*img/d7-hero\.jpg"[^>]*>', lambda m: d7_hero(rel), html)
    html = html.replace("http://127.0.0.1:8777/_directions", rel)
    html = re.sub(r'<img src="[^"]*3d/d7-(mark|object)\.png"[^>]*>', lambda m: lic(rel, "exekias-achilles-ajax.jpg", "Exekias amphora, Achilles and Ajax playing a board game, about 540 BC"), html)
    html = credit_d7(html, rel)
    head = f'<link rel="stylesheet" href="{rel}/made/d7.css"><script src="{rel}/made/d7.js" defer></script><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=GFS+Neohellenic:wght@400;700&display=swap">'
    html = html.replace("</head>", head + "</head>", 1)
    defs = '<svg class="made-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><filter id="m7-grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .35 0 0 0 0 .2 0 0 0 .8 0"/></filter></defs></svg>'
    html = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + defs, html, count=1)
    return html
