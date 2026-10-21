import math, re, os, json

from paths import DIRECTIONS_DIR as DIR
U = 8

CREDIT = {
 "d1": 'Grid proportions traced by hand from Josef Müller-Brockmann, <a href="https://commons.wikimedia.org/wiki/File:Musica_Viva._M%C3%BCller-Brockmann.jpg">Musica Viva poster, 1959</a>, Wikimedia Commons, public domain.',
 "d2": 'Crests constructed with compass and rule after <a href="https://commons.wikimedia.org/wiki/File:NDL780549_%E6%96%B0%E6%92%B0%E4%BC%8A%E5%91%82%E6%B3%A2%E5%BC%95%E7%B4%8B%E5%B8%B3%E5%A4%A7%E5%85%A8_part1.pdf">新撰伊呂波引紋帳大全</a>, Inoue Kyūtarō, Edo period crest book, public domain, and <a href="https://commons.wikimedia.org/wiki/File:Japanese_crest_Igeta.svg">Igeta crest</a> by Mukai, CC BY-SA 3.0.',
}


def d1_svg(w_units, h_units, cls, label, plot=True, diamonds=True):
    W, H = w_units * U, h_units * U
    col = W // 16
    g = [f'<g class="mk-grid">' + "".join(f'<line x1="{i*col}" y1="0" x2="{i*col}" y2="{H}"/>' for i in range(1, 16)) + '</g>']
    if diamonds:
        cx, cy, r = (W * 5) // 8 // U * U, (H * 5 // 16) // U * U, min(H * 5 // 16 - 2 * U, W // 4) // U * U
        g.append(f'<polygon class="mk-k" points="{cx},{cy-r} {cx+r},{cy} {cx},{cy+r} {cx-r},{cy}" fill="#F4F4F4" stroke="#E0E0E0"/>')
        pts = [(-3, -5, "#0F62FE"), (-1, -3, "#DA1E28"), (1, -4, "#161616"), (-4, -1, "#161616"), (-2, 0, "#0F62FE"), (0, -1, "#161616"), (2, -2, "#0F62FE"), (-3, 2, "#DA1E28"), (1, 1, "#161616"), (3, 0, "#DA1E28"), (-1, 3, "#161616"), (2, 3, "#0F62FE"), (4, -3, "#161616"), (0, 5, "#DA1E28")]
        step = max(r // 6 // U, 1) * U
        for k, (a, b, c) in enumerate(pts):
            x, y, s = cx + a * step, cy + b * step, U
            if abs(x - cx) + abs(y - cy) < r - U:
                g.append(f'<polygon class="mk-k" style="--i:{k}" points="{x},{y-s} {x+s},{y} {x},{y+s} {x-s},{y}" fill="{c}"/>')
    if plot:
        n, x0, base = 16, 0, H - U
        bars = []
        for i in range(n):
            p = (i + .5) / n
            h = -(p * math.log2(p) + (1 - p) * math.log2(1 - p))
            bh = max(1, round(h * (H * 3 // 8) / U)) * U
            bars.append(f'<rect class="mk-k" style="--i:{i}" x="{x0 + i*col + U}" y="{base-bh}" width="{col-2*U}" height="{bh}" fill="{"#0F62FE" if i in (7, 8) else "#161616"}"/>')
        g.append("".join(bars))
        g.append(f'<line x1="0" y1="{base}" x2="{W}" y2="{base}" stroke="#161616" stroke-width="1"/>')
    return f'<svg class="{cls}" viewBox="0 0 {W} {H}" role="img" aria-label="{label}" preserveAspectRatio="xMinYMid meet">{"".join(g)}</svg>'


def circ_pts(a, b, r1, r2):
    (x1, y1), (x2, y2) = a, b
    d = math.dist(a, b)
    l = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(r1 * r1 - l * l, 0))
    mx, my = x1 + l * (x2 - x1) / d, y1 + l * (y2 - y1) / d
    return [(mx + h * (y2 - y1) / d, my - h * (x2 - x1) / d), (mx - h * (y2 - y1) / d, my + h * (x2 - x1) / d)]


def shippo(cx, cy, R, ink="#1F3A5F", seal="#B8341B", construct=True, idx=0):
    out = []
    cen = [(cx + R * math.cos(math.pi * k / 2), cy + R * math.sin(math.pi * k / 2)) for k in range(4)]
    if construct:
        c = [f'<circle cx="{cx}" cy="{cy}" r="{R}"/>', f'<circle cx="{cx}" cy="{cy}" r="{R*2}"/>']
        c += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{R}"/>' for x, y in cen]
        c += [f'<line x1="{cx-2*R}" y1="{cy}" x2="{cx+2*R}" y2="{cy}"/><line x1="{cx}" y1="{cy-2*R}" x2="{cx}" y2="{cy+2*R}"/>']
        c += [f'<line x1="{cx-R*1.42:.1f}" y1="{cy-R*1.42:.1f}" x2="{cx+R*1.42:.1f}" y2="{cy+R*1.42:.1f}"/><line x1="{cx+R*1.42:.1f}" y1="{cy-R*1.42:.1f}" x2="{cx-R*1.42:.1f}" y2="{cy+R*1.42:.1f}"/>']
        c += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2" fill="{ink}"/>' for x, y in cen + [(cx, cy)]]
        out.append(f'<g class="mk-con" stroke="{ink}" fill="none" stroke-width="1">{"".join(c)}</g>')
    petals = []
    for k in range(4):
        a, b = cen[k], cen[(k + 1) % 4]
        p = circ_pts(a, b, R, R)
        far = max(p, key=lambda q: math.dist(q, (cx, cy)))
        near = min(p, key=lambda q: math.dist(q, (cx, cy)))
        petals.append(f'M{near[0]:.1f},{near[1]:.1f}A{R},{R} 0 0 1 {far[0]:.1f},{far[1]:.1f}A{R},{R} 0 0 1 {near[0]:.1f},{near[1]:.1f}Z')
    ring = f'M{cx-R*2},{cy}a{R*2},{R*2} 0 1 0 {R*4},0a{R*2},{R*2} 0 1 0 {-R*4},0ZM{cx-R*1.72:.1f},{cy}a{R*1.72:.1f},{R*1.72:.1f} 0 1 1 {R*3.44:.1f},0a{R*1.72:.1f},{R*1.72:.1f} 0 1 1 {-R*3.44:.1f},0Z'
    out.append(f'<path class="mk-ink" style="--i:{idx}" pathLength="1" d="{ring}" fill="{ink}" fill-rule="evenodd" stroke="{ink}" stroke-width="2"/>')
    out.append(f'<path class="mk-ink" style="--i:{idx+1}" pathLength="1" d="{"".join(petals)}" fill="{ink}" stroke="{ink}" stroke-width="2"/>')
    out.append(f'<circle class="mk-ink" style="--i:{idx+2}" pathLength="1" cx="{cx}" cy="{cy}" r="{R*.28:.1f}" fill="{seal}" stroke="{seal}" stroke-width="2"/>')
    return "".join(out)


def igeta(cx, cy, s, ink="#1F3A5F", idx=0):
    t = s * .16
    a, b = s * .2, s * .5
    bars = []
    for sign in (-1, 1):
        bars.append(f'M{cx-b},{cy+sign*a-t/2}h{2*b}v{t}h{-2*b}Z')
        bars.append(f'M{cx+sign*a-t/2},{cy-b}v{2*b}h{t}v{-2*b}Z')
    con = f'<g class="mk-con" stroke="{ink}" fill="none"><circle cx="{cx}" cy="{cy}" r="{b*1.42:.1f}"/><circle cx="{cx}" cy="{cy}" r="{a*1.42:.1f}"/><rect x="{cx-b}" y="{cy-b}" width="{2*b}" height="{2*b}"/></g>'
    return con + f'<path class="mk-ink" style="--i:{idx}" pathLength="1" d="{"".join(bars)}" transform="rotate(45 {cx} {cy})" fill="{ink}" stroke="{ink}" stroke-width="1.5"/>'


def d2_svg(w, h, cls, label, hero=False):
    if hero:
        body = shippo(w / 2, h / 2, w * .2, idx=0)
    else:
        n = max(3, w // (h + 16))
        step = w / n
        body = "".join((shippo(step * (i + .5), h / 2, h * .2, idx=i * 2) if i % 2 == 0 else igeta(step * (i + .5), h / 2, h * .78, idx=i * 2)) for i in range(n))
        body += f'<g class="mk-con" stroke="#1F3A5F"><line x1="0" y1="{h/2}" x2="{w}" y2="{h/2}"/></g>'
    return f'<svg class="{cls}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{body}</svg>'


def hero_fig(d, depth):
    up = "../" * depth
    if d == "d1":
        art = d1_svg(64, 64, "mk-hero", "Hand-set grid composition: tilted square field of small squares over a stepped entropy plot")
        return f'<figure class="mk-fig">{art}<figcaption class="mk-credit">{CREDIT[d]}</figcaption></figure>'
    art = d2_svg(480, 480, "mk-hero", "Shippō crest built from five circles and their intersections, construction lines shown", hero=True)
    side = '<svg class="mk-hero" viewBox="0 0 160 160" role="img" aria-label="Igeta crest built from two squares and their circumscribed circles">' + igeta(80, 80, 120) + '</svg>'
    return f'<figure class="mk-fig">{art}<div class="mk-hero-grid">{side}<img class="mk-plate" src="{up}licensed/d2/moncho-iroha-taizen-p30.jpg" alt="Page of an Edo period crest book showing shippō crests" loading="lazy"></div><figcaption class="mk-credit">{CREDIT[d]}</figcaption></figure>'


def band(d, seed=0):
    if d == "d2":
        w, h = 640, 64
        k = seed % 4
        if k == 0:
            body = shippo(w / 2, h / 2, h * .2) + '<g class="mk-con" stroke="#1F3A5F"><line x1="0" y1="32" x2="640" y2="32"/></g>'
        elif k == 1:
            body = "".join(igeta(80 + i * 160, h / 2, h * .78, idx=i) for i in range(4))
        elif k == 2:
            body = '<g class="mk-con" stroke="#1F3A5F" fill="none">' + "".join(f'<circle cx="{x}" cy="64" r="32"/>' for x in range(0, 672, 32)) + '</g>' + "".join(f'<path class="mk-ink" style="--i:{i}" pathLength="1" d="M{x-32},64a32,32 0 0 1 64,0" fill="none" stroke="#1F3A5F" stroke-width="2"/>' for i, x in enumerate(range(32, 640, 64)))
        else:
            body = shippo(160, h / 2, h * .2) + shippo(480, h / 2, h * .2, idx=3) + '<g class="mk-con" stroke="#1F3A5F"><line x1="0" y1="32" x2="640" y2="32"/></g>'
        return f'<div class="mk-band" aria-hidden="true"><svg class="mk-strip" viewBox="0 0 {w} {h}">{body}</svg></div>'
    if d == "d1":
        return f'<div class="mk-band" aria-hidden="true">{d1_svg(160, 8, "mk-strip", "", plot=False, diamonds=False).replace("role=\"img\" aria-label=\"\"", "")}{d1_svg(40, 8, "mk-mini", "", diamonds=False).replace("role=\"img\" aria-label=\"\"", "")}</div>'
    return f'<div class="mk-band" aria-hidden="true">{d2_svg(640, 64, "mk-strip", "").replace("role=\"img\" aria-label=\"\"", "")}</div>'


def enforce(d, html, depth):
    if d not in ("d1", "d2"):
        return html
    up = "../" * depth
    html = re.sub(r'<figure><img src="(\.\./)+img/' + d + r'-hero\.jpg"[^>]*></figure>', lambda m: hero_fig(d, depth), html)
    html = re.sub(r'<img src="(\.\./)+img/' + d + r'-hero\.jpg"[^>]*>', "", html)
    if "sign-in email</title>" in html:
        return html.replace("</head>", "<style>@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style></head>", 1)
    seed = sum(map(ord, re.search(r"<title>([^<]*)", html).group(1)))
    html = html.replace("</head>", f'<link rel="stylesheet" href="{up}made/{d}.css"><script defer src="{up}made/{d}.js"></script></head>', 1)
    html = html.replace("<body", f'<body data-mk="{d}"', 1)
    for a, b in (("Wahrscheinlichkeitsrechnung", "Wahrscheinlichkeits&shy;rechnung"), ("Hauptsatze", "Haupt&shy;satze"), ("Wärmetheorie", "Wärme&shy;theorie"), ("Variationsprobleme", "Variations&shy;probleme")):
        html = re.sub(r"(?<=[ >])" + a + r"(?=[ <.,])", b, html)
    if d == "d1":
        html = html.replace('placeholder="Ask the canon a question"', 'placeholder="Ask the canon"')
    dl = re.search(r'(<span class="kick">bkt [^<]*</span><h1 class="disp">Download bkt</h1>)', html)
    if dl:
        if d == "d1":
            W, H = 512, 256
            grid = "".join(f'<line x1="{i*32}" y1="0" x2="{i*32}" y2="{H}" stroke="#E0E0E0"/>' for i in range(1, 16))
            art = f'<svg class="mk-dlart" viewBox="0 0 {W} {H}" role="img" aria-label="Version 0.9 set on a sixteen column grid">{grid}<line x1="0" y1="{H-8}" x2="{W}" y2="{H-8}" stroke="#161616"/><text x="-8" y="{H-16}" font-family="IBM Plex Sans" font-weight="300" font-size="232" letter-spacing="-12" fill="#161616">0.9</text><rect x="416" y="32" width="64" height="64" fill="#0F62FE"/><rect x="448" y="128" width="32" height="32" fill="#DA1E28"/></svg>'
        else:
            art = f'<svg class="mk-dlart" viewBox="0 0 320 320" role="img" aria-label="Shippō crest constructed from five circles">{shippo(160, 160, 64)}</svg>'
        html = html.replace(dl.group(1), f'<div class="mk-dlhero"><div class="stack" style="gap:var(--s4)">{dl.group(1)}<p class="muted" style="font-size:20px;line-height:28px;max-width:36ch">The canon on your desk and in your pocket. Read offline, cite from anywhere.</p></div>{art}</div>', 1)
    elif d == "d1" and 'class="content"' in html:
        folio = '<div class="mk-folio"><span>℧ / Bucket</span><span>Reference shelf</span></div>'
        html = re.sub(r'(<(?:div|main)\b[^>]*class="content"[^>]*>)', lambda m: m.group(1) + folio, html, count=1)
    if "mk-credit" not in html and "mk-dlart" in html:
        html = html.replace("</main>", f'<p class="mk-credit mk-credit-foot">{CREDIT[d]}</p></main>', 1)
    return html
