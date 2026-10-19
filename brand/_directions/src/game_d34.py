import math, re

from paths import DIRECTIONS_DIR as ROOT

P = {
    "d3": dict(a="#58CC02", at="#2E7D00", on="#173600", h="#FF4B91", y="#FFC800", b="#1CB0F6", k="#2B2B2B", bg="#FFF8E7", sf="#FFFFFF", mu="#5E5A52", lk="#B9B3A3"),
    "d7": dict(a="#A6442A", at="#A6442A", on="#FFFFFF", h="#C8102E", y="#E8A800", b="#1E4F94", k="#1A1714", bg="#F3EEE3", sf="#FBF8F1", mu="#5B5148", lk="#B3A898"),
    "d4": dict(a="#E3242B", at="#E3242B", on="#FFFFFF", h="#E3242B", y="#EFE6D2", b="#EFE6D2", k="#141414", bg="#141414", sf="#222222", mu="#B5AC9A", lk="#5A554C"),
}


def lum(h):
    v = [int(h.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    v = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def cr(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def mascot(d):
    import os
    f = f"{ROOT}/logos/{d}-mascot.svg"
    s = open(f if os.path.exists(f) else f"{ROOT}/logos/{d}-lyre.svg").read()
    s = re.sub(r'<svg[^>]*>', '<svg class="masc" viewBox="0 0 100 100" aria-hidden="true">', s, count=1)
    if d == "d7":
        s = re.sub(r'<rect x="4" y="4" width="92" height="92" fill="#1A1714"/>', "", s)
    return s


def shell(d, title, body, css):
    src = open(f"{ROOT}/pages/{d}/app-learn.html").read()
    if d == "d3":
        src = re.sub(r'<header class="bar"><h1>[^<]*</h1>', f'<header class="bar"><h1>{title}</h1>', src, count=1)
        a = src.index('<main class="content">') + len('<main class="content">')
    else:
        src = re.sub(r'<p class="lab">Learn</p><h1 class="h2">[^<]*</h1>', f'<p class="lab">Play</p><h1 class="h2">{title}</h1>', src, count=1)
        a = src.index('<main class="main">') + len('<main class="main">')
        a = src.index("</div></div>", a) + len("</div></div>") if False else src.index('<div class="grid g3"', a)
    b = src.index("</main>", a)
    src = src[:a] + body + src[b:]
    src = re.sub(r"<title>[^<]*</title>", f"<title>bkt {title}</title>", src, count=1)
    src = src.replace(' aria-current=page', '', 1) if False else src
    return src.replace("</head>", f"<style>{css}</style></head>", 1)


def common_css(d):
    p = P[d]
    return f'''.gx{{display:grid;gap:var(--s5);grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));align-items:start}}
.gx>section{{min-width:0}}
.gpanel{{background:var(--surf);padding:var(--s5);display:grid;gap:var(--s4);min-width:0}}
.gk{{font:600 12px/16px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0}}
.gh{{font:700 20px/28px var(--disp);margin:0}}
.gbig{{font:700 48px/56px var(--disp);margin:0}}
.gcap{{font:400 12px/16px var(--body);color:var(--muted);margin:0}}
.gcap b{{font-weight:700}}
.grow2{{display:flex;flex-wrap:wrap;gap:var(--s3);align-items:center}}
.gbar{{height:16px;background:{p["lk"]}55;position:relative;overflow:hidden}}
.gbar>i{{position:absolute;inset:0 auto 0 0;background:{p["a"]}}}
.glist{{list-style:none;margin:0;padding:0;display:grid;gap:var(--s2)}}
.glist li{{display:flex;align-items:center;gap:var(--s3);min-height:48px;padding:var(--s2) var(--s3);background:var(--bg)}}
.glist .me{{outline:2px solid {p["a"]};outline-offset:-2px}}
.glist .n{{font:700 16px/24px var(--disp);width:32px}}
.glist .xp{{margin-left:auto;font:600 14px/20px var(--mono)}}
.av{{width:32px;height:32px;flex:none}}
.masc{{width:96px;height:96px}}
.wk{{display:grid;grid-template-columns:repeat(7,1fr);gap:var(--s2)}}
.wk span{{display:grid;place-items:center;gap:var(--s1);font:600 12px/16px var(--body);color:var(--muted)}}
.note{{display:grid;grid-template-columns:40px minmax(0,1fr);gap:var(--s3);padding:var(--s4);background:var(--bg)}}
.note p{{margin:0}}
.note .t{{font-weight:700}}
.mail{{border:1px solid var(--line);padding:var(--s4);background:var(--bg);display:grid;gap:var(--s2)}}
.mail p{{margin:0}}
.stage{{position:relative;overflow:hidden;min-height:280px;background:var(--bg);display:grid;place-items:center;gap:var(--s3);padding:var(--s5);text-align:center}}
.stage .msg{{font:700 24px/32px var(--disp);margin:0}}
.stat{{display:grid;gap:var(--s1);padding:var(--s4);background:var(--bg)}}
.stat b{{font:700 32px/40px var(--disp)}}
.badge{{display:grid;justify-items:center;gap:var(--s2);text-align:center;padding:var(--s4);background:var(--bg)}}
.badge svg{{width:112px;height:112px}}
.badge.lock svg{{filter:grayscale(1);opacity:.55}}
.bgrid{{display:grid;gap:var(--s4);grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr))}}
.path{{width:100%;max-width:360px;height:auto;display:block;margin:0 auto}}
@media(max-width:600px){{.gbig{{font-size:40px;line-height:48px}}}}'''


def ring(d, pct, r=44, sw=12, label=""):
    p = P[d]
    c = 2 * math.pi * r
    cap = "round" if d == "d3" else "butt"
    return f'<svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="{label}"><circle cx="60" cy="60" r="{r}" fill="none" stroke="{p["lk"]}" stroke-width="{sw}"/><circle cx="60" cy="60" r="{r}" fill="none" stroke="{p["at"]}" stroke-width="{sw}" stroke-linecap="{cap}" stroke-dasharray="{c * pct:.1f} {c:.1f}" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-size="24" font-weight="700" fill="currentColor" font-family="inherit">{int(pct * 100)}%</text></svg>'


def flame(d, on=True, freeze=False):
    p = P[d]
    if d == "d7":
        if freeze:
            return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3v26M5 9.5l22 13M27 9.5l-22 13" stroke="{p["b"]}" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="4" fill="{p["bg"]}" stroke="{p["b"]}" stroke-width="2.5"/></svg>'
        f = p["a"] if on else p["lk"]
        return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 22c4 4 16 4 20 0l-2 6H8z" fill="{p["k"]}"/><path d="M16 4c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z" fill="{f}"/></svg>'
    if d == "d3":
        if freeze:
            return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l11 6v14l-11 6-11-6V9z" fill="{p["b"]}" stroke="{p["k"]}" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 9v14M10 12l12 8M22 12l-12 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>'
        f = p["y"] if on else p["lk"]
        return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c6 7 10 11 10 17a10 10 0 01-20 0c0-4 2-7 5-9 0 4 2 5 3 5 0-5 0-9 2-13z" fill="{f}" stroke="{p["k"]}" stroke-width="2.5" stroke-linejoin="round"/></svg>'
    if freeze:
        return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="22" fill="none" stroke="{p["y"]}" stroke-width="3" transform="rotate(45 16 16)"/><path d="M16 6v20M7 16h18" stroke="{p["y"]}" stroke-width="3"/></svg>'
    f = p["a"] if on else p["lk"]
    return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2L28 30H4z" fill="{f}"/><path d="M16 14l5 16H11z" fill="{p["k"]}"/></svg>'


def badge_art(d, i, glyph):
    p = P[d]
    if d == "d7":
        leaves = "".join(f'<ellipse cx="{60 + 48 * math.cos(a):.1f}" cy="{60 + 48 * math.sin(a):.1f}" rx="9" ry="4" fill="#5B7A2E" transform="rotate({math.degrees(a) + 60:.0f} {60 + 48 * math.cos(a):.1f} {60 + 48 * math.sin(a):.1f})"/>' for a in [math.pi * (0.62 + k * 0.13) for k in range(14)] + [math.pi * (0.38 - k * 0.13) for k in range(14)] if not (1.4 < (a % (2 * math.pi)) < 1.74))
        if i % 2 == 0:
            return f'<svg viewBox="0 0 120 120" aria-hidden="true"><defs><clipPath id="cc{i}"><circle cx="60" cy="56" r="46"/></clipPath></defs><circle cx="60" cy="56" r="49" fill="#B9B4AA" stroke="{p["k"]}" stroke-width="2"/><image href="../../licensed/d7/tetradrachm-owl-reverse.png" x="12" y="10" width="96" height="92" preserveAspectRatio="xMidYMid slice" clip-path="url(#cc{i})"/><rect x="34" y="96" width="52" height="22" rx="2" fill="{p["a"]}"/><text x="60" y="113" text-anchor="middle" font-family="GFS Didot,serif" font-size="17" fill="#FFFFFF">{glyph}</text></svg>'
        return f'<svg viewBox="0 0 120 120" aria-hidden="true">{leaves}<circle cx="60" cy="60" r="34" fill="{p["a"]}" stroke="{p["k"]}" stroke-width="3"/><text x="60" y="72" text-anchor="middle" font-family="GFS Didot,serif" font-size="30" fill="#FFFFFF">{glyph}</text></svg>'
    if d == "d3":
        shapes = [
            "M60 8c18 0 22 14 36 18s20 18 12 34 4 30-12 40-30 4-40 10-30-4-38-18-14-26-10-40S42 8 60 8z",
            "M16 24h88l-8 76H24z",
            "M60 6l50 30v48L60 114 10 84V36z",
            "M60 8a52 52 0 110 104A52 52 0 0160 8z",
            "M14 20l92 8-10 84-80-12z",
            "M60 6l16 32 36 4-26 24 8 36-34-18-34 18 8-36L8 42l36-4z",
        ]
        fills = ["url(#m3-squig)", "url(#m3-zig)", "url(#m3-dots)", "url(#m3-terr)", "url(#m3-stripe)", p["a"]]
        return f'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="{shapes[i]}" fill="#fff" stroke="#fff" stroke-width="14" stroke-linejoin="round" transform="translate(3 5)" opacity=".9"/><path d="{shapes[i]}" fill="{p["k"]}" transform="translate(4 6)"/><path d="{shapes[i]}" fill="{fills[i]}" stroke="{p["k"]}" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="62" r="24" fill="{p["bg"]}" stroke="{p["k"]}" stroke-width="4"/><text x="60" y="72" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="26" fill="{p["k"]}">{glyph}</text></svg>'
    star = " ".join(f"{60 + (46 if k % 2 == 0 else 22) * math.cos(math.pi * k / 5 - math.pi / 2):.1f},{70 + (46 if k % 2 == 0 else 22) * math.sin(math.pi * k / 5 - math.pi / 2):.1f}" for k in range(10))
    tops = [
        f'<circle cx="60" cy="70" r="40" fill="{p["a"]}"/><path d="M60 70L100 70A40 40 0 0160 110z" fill="{p["y"]}"/>',
        f'<polygon points="{star}" fill="{p["a"]}"/>',
        f'<rect x="24" y="34" width="72" height="72" fill="{p["y"]}" transform="rotate(-8 60 70)"/><path d="M24 106L96 34V106z" fill="{p["a"]}" transform="rotate(-8 60 70)"/>',
        f'<circle cx="60" cy="70" r="40" fill="none" stroke="{p["a"]}" stroke-width="12"/><path d="M20 90L100 50" stroke="{p["y"]}" stroke-width="8"/>',
        f'<path d="M60 26L104 104H16z" fill="{p["a"]}"/><circle cx="60" cy="80" r="18" fill="{p["y"]}"/>',
        f'<circle cx="60" cy="70" r="40" fill="{p["y"]}"/><polygon points="{star}" fill="{p["a"]}" transform="translate(12 12) scale(.8)"/>',
    ]
    return f'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M40 0h14l12 34H52zM80 0H66L54 34h14z" fill="{p["a"]}"/><path d="M54 0h12v34H54z" fill="{p["y"]}"/>{tops[i]}<text x="60" y="80" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="26" fill="{p["k"]}" transform="rotate(-6 60 76)">{glyph}</text></svg>'


def caption(text):
    return f'<p class="gcap">Precedent: {text}</p>'


def pg_progress(d):
    p = P[d]
    days = [("M", 1, 0), ("T", 1, 0), ("W", 0, 1), ("T", 1, 0), ("F", 1, 0), ("S", 1, 0), ("S", 0, 0)]
    wk = "".join(f'<span>{flame(d, on, fr)}{n}</span>' for n, on, fr in days)
    body = f'''<div class="gx">
<section class="gpanel"><p class="gk">Streak</p><div class="grow2">{flame(d)}<p class="gbig">23 days</p></div><div class="wk" role="list" aria-label="This week">{wk}</div>
<div class="note">{flame(d, freeze=True)}<div><p class="t">Streak freeze used Wednesday</p><p class="gcap">1 freeze left. A freeze covers one missed day; earn another at 7 days.</p></div></div>
<div class="grow2"><button class="btn">Equip a freeze</button><button class="btn ghost">Repair streak</button></div>{caption("Duolingo streak and streak freeze")}</section>
<section class="gpanel"><p class="gk">Experience</p><div class="grow2"><p class="gbig">Level 7</p><p class="gcap">1,840 of 2,000 XP</p></div><div class="gbar" role="progressbar" aria-label="XP to level 8" aria-valuenow="92" aria-valuemin="0" aria-valuemax="100"><i style="width:92%"></i></div>
<div class="stage lvl">{mascot(d)}<p class="msg">160 XP to Level 8</p><p class="gcap">Level 8 opens the Information branch quiz.</p></div>{caption("Brilliant level path; Duolingo XP")}</section>
<section class="gpanel"><p class="gk">Daily goal</p><div class="grow2">{ring(d, .7, label="Daily goal 70 percent")}<div><p class="gh">35 of 50 XP</p><p class="gcap">One more card clears today.</p></div></div>
<ul class="glist"><li>{flame(d)}<span>Study 10 cards</span><span class="xp">10/10</span></li><li>{flame(d, False)}<span>Cite one entry</span><span class="xp">0/1</span></li><li>{flame(d)}<span>Review 20 due</span><span class="xp">14/20</span></li></ul>{caption("Duolingo daily goal; Anki due count")}</section>
</div>'''
    return shell(d, "Progress", body, common_css(d))


BADGES = [("7-day streak", "7", "earned", 100), ("First citation", "¢", "earned", 100), ("Six scripts", "6", "progress", 66), ("Root hunter", "√", "progress", 40), ("Shannon reader", "H", "lock", 0), ("Canon 100", "100", "lock", 0)]


def mastery(d, title, nodes, cap):
    p = P[d]
    lv = {"M": (p["a"], "Mastered"), "P": (p["y"] if d == "d3" else p["a"], "Proficient"), "F": (p["b"] if d == "d3" else p["y"], "Familiar"), "A": (p["lk"], "Attempted"), "N": ("none", "Not started")}
    n = len(nodes)
    W = 320
    H = 80 + (n - 1) * 72
    pts = [(80 + (160 if k % 2 else 0) + (0 if d == "d3" else 0), 48 + k * 72) for k in range(n)]
    if d == "d7":
        line = "".join(f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" stroke="{p["k"]}" stroke-width="2.5"/>' for a, b in zip(pts, pts[1:]))
    elif d == "d3":
        path = "M" + " ".join(f"{x},{y}" for x, y in pts)
        line = f'<path d="{path}" fill="none" stroke="{p["k"]}" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/>'
    else:
        line = "".join(f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" stroke="{p["a"]}" stroke-width="4"/>' for a, b in zip(pts, pts[1:]))
    g = []
    for (x, y), (name, l) in zip(pts, nodes):
        c, word = lv[l]
        if d == "d7":
            g.append(f'<circle cx="{x}" cy="{y}" r="22" fill="{c if c != "none" else p["sf"]}" stroke="{p["k"]}" stroke-width="2.5"/><circle cx="{x}" cy="{y}" r="30" fill="none" stroke="{p["k"]}" stroke-width=".75" stroke-dasharray="3 4"/>')
        elif d == "d3":
            g.append(f'<circle cx="{x}" cy="{y}" r="24" fill="{c if c != "none" else p["sf"]}" stroke="{p["k"]}" stroke-width="4"/>')
        else:
            g.append(f'<rect x="{x - 22}" y="{y - 22}" width="44" height="44" fill="{c if c != "none" else p["k"]}" stroke="{p["y"]}" stroke-width="3" transform="rotate(-8 {x} {y})"/>')
        tx = x + 36 if x < 160 else x - 36
        anc = "start" if x < 160 else "end"
        g.append(f'<text x="{tx}" y="{y - 2}" text-anchor="{anc}" font-size="15" font-weight="700" fill="currentColor">{name}</text><text x="{tx}" y="{y + 16}" text-anchor="{anc}" font-size="12" fill="{p["mu"]}">{word}</text>')
    svg = f'<svg class="path" viewBox="0 0 {W} {H}" role="img" aria-label="{title} mastery map">{line}{"".join(g)}</svg>'
    return f'<section class="gpanel"><p class="gk">Mastery map</p><h2 class="gh">{title}</h2>{svg}{caption(cap)}</section>'


def pg_badges(d):
    cards = []
    for i, (n, g, st, pct) in enumerate(BADGES):
        cls = " lock" if st == "lock" else ""
        art = badge_art(d, i, g)
        if st == "lock":
            sub = '<p class="gcap">Locked: read 10 information entries</p>' if i == 4 else '<p class="gcap">Locked: cite 100 entries</p>'
        elif st == "progress":
            sub = f'<div class="gbar" style="width:100%" role="progressbar" aria-label="{n}" aria-valuenow="{pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:{pct}%"></i></div><p class="gcap">In progress, {pct}%</p>'
        else:
            sub = '<p class="gcap">Earned</p>'
        cards.append(f'<div class="badge{cls}">{art}<p class="gh">{n}</p>{sub}</div>')
    es = [("Numbers", "M"), ("Greetings", "M"), ("Family", "P"), ("Food", "F"), ("Past tense", "A"), ("Subjunctive", "N")]
    inf = [("Entropy", "M"), ("Channel capacity", "P"), ("Coding theorem", "F"), ("Kolmogorov", "A"), ("Landauer limit", "N")]
    body = f'''<div class="gx" style="grid-template-columns:minmax(0,1fr)"><section class="gpanel"><p class="gk">Badges</p><div class="bgrid">{"".join(cards)}</div>{caption("Duolingo achievements; Khan Academy badges")+('<p class="made-credit">Coin: <a href="https://commons.wikimedia.org/wiki/File:Athens,_tetradrachm,_86-84_BC,_Weber_3526.png">Athens tetradrachm, 86 to 84 BC, Weber 3526</a>, public domain</p>' if d == "d7" else "")}</section></div>
<div class="gx" style="margin-top:var(--s5)">{mastery(d, "Spanish", es, "Khan Academy mastery levels; Duolingo path")}{mastery(d, "Information branch", inf, "Brilliant course path; Khan Academy mastery levels")}</div>'''
    return shell(d, "Badges", body, common_css(d))


def av(d, k):
    p = P[d]
    cs = [p["a"], p["h"], p["b"], p["y"], p["lk"]]
    if d == "d7":
        return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#1A1714"/><circle cx="16" cy="12" r="5" fill="#C8643C"/><path d="M7 27c2-7 16-7 18 0z" fill="#C8643C"/><circle cx="16" cy="16" r="15" fill="none" stroke="{cs[k % 5]}" stroke-width="2"/></svg>'
    if d == "d3":
        return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="{cs[k % 5]}" stroke="{p["k"]}" stroke-width="2.5"/><path d="M9 20c4 4 10 4 14 0" fill="none" stroke="{p["k"]}" stroke-width="2.5" stroke-linecap="round"/></svg>'
    return f'<svg class="av" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="{p["lk"]}"/><path d="M0 32L32 {6 + k * 5}V32z" fill="{cs[k % 2]}"/></svg>'


def pg_social(d):
    rows = [("Noor K.", 1240), ("Mateo S.", 1185), ("Ada R.", 1120), ("Yuki T.", 980), ("Ivan P.", 905), ("Leah M.", 860)]
    lis = "".join(f'<li{" class=me" if n == "Ada R." else ""}><span class="n">{i}</span>{av(d, i)}<span>{n}{" (you)" if n == "Ada R." else ""}</span><span class="xp">{x} XP</span></li>' for i, (n, x) in enumerate(rows, 1))
    p = P[d]
    body = f'''<div class="gx">
<section class="gpanel"><p class="gk">Copper league · 2 days left</p><h2 class="gh">Top 3 move up</h2><ul class="glist">{lis}</ul>{caption("Duolingo leagues, weekly promotion")}</section>
<section class="gpanel"><p class="gk">Study group</p><h2 class="gh">Etymology Tuesdays</h2><div class="grow2">{"".join(av(d, k) for k in range(5))}<span class="gcap">5 members · 3 studied today</span></div><div class="gbar" role="progressbar" aria-label="Group goal" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><i style="width:64%"></i></div><p class="gcap">Group goal: 500 XP this week, 320 so far.</p><div class="grow2"><button class="btn">Nudge Ivan</button><button class="btn ghost">Invite</button></div>{caption("Duolingo friend quests")}</section>
<section class="gpanel"><p class="gk">Notifications</p>
<div class="note">{flame(d)}<div><p class="gcap">Push · bkt · 19:30</p><p class="t">Your 23-day streak ends at midnight</p><p class="gcap">Five cards keep it going.</p></div></div>
<div class="mail"><p class="gcap">Email · from bkt@bucket.foundation</p><p class="t"><b>Subject: 14 cards are due</b></p><p>Hi Ada, cien, сто and מאה come back today. The review takes about 6 minutes.</p><a href="app-review.html">Start review</a></div>
<div class="note">{flame(d, freeze=True)}<div><p class="gcap">In-app</p><p class="t">Mateo passed you in Copper league</p><p class="gcap">65 XP gets you back to 2nd.</p></div></div>
<div class="note">{av(d, 2)}<div><p class="gcap">Reminder · set for 08:00</p><p class="t">Morning review</p><p class="gcap">Edit in Settings.</p></div></div>
{caption("Duolingo streak reminder; Anki due-cards digest")}</section>
</div>'''
    return shell(d, "Social", body, common_css(d))


def celebrate_css(d):
    p = P[d]
    if d == "d7":
        return '''.stage .fx line,.stage .fx circle,.stage .fx path{stroke-dasharray:1 1}
.stage.play .fx [pathLength]{animation:c7-draw 240ms cubic-bezier(0.4,0,0.2,1) calc(var(--k)*240ms) backwards}
.stage.play .masc{animation:c7-pluck 480ms cubic-bezier(0.4,0,0.2,1) 720ms backwards}
.stage.play .msg{animation:c7-fade 400ms cubic-bezier(0.4,0,0.2,1) 960ms backwards}
.stage .fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.stage .masc,.stage .msg,.stage .gcap{position:relative;z-index:1}.stage .msg,.stage .gcap{background:var(--surf);padding:4px 12px;border:1px solid #D8CDBB}.stage .fx{opacity:.55}
@keyframes c7-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes c7-pluck{0%{transform:scale(.9)}40%{transform:scale(1.06) rotate(-3deg)}100%{transform:none}}
@keyframes c7-fade{from{opacity:0}}
.lu .ring2{stroke-dasharray:276 300}.lu.play .ring2{animation:c7-ring 960ms cubic-bezier(0.4,0,0.2,1) forwards}
@keyframes c7-ring{from{stroke-dasharray:0 300}to{stroke-dasharray:276 300}}
@media(prefers-reduced-motion:reduce){.stage.play *{animation:none!important}}'''
    if d == "d3":
        return f'''.stage .masc{{transform-origin:50% 100%}}
.stage.play .masc{{animation:c3-bounce 900ms cubic-bezier(0.34,1.56,0.64,1)}}
.stage.play .msg{{animation:c3-pop 600ms cubic-bezier(0.34,1.56,0.64,1) 200ms backwards}}
.conf{{position:absolute;inset:0;pointer-events:none}}
.conf i{{position:absolute;left:50%;top:60%;width:14px;height:14px;opacity:0}}
.stage.play .conf i{{animation:c3-fly 1100ms cubic-bezier(0.34,1.56,0.64,1) forwards}}
@keyframes c3-bounce{{0%{{transform:scale(1)}}20%{{transform:scale(1.25,.7)}}45%{{transform:translateY(-40px) scale(.85,1.2)}}70%{{transform:scale(1.15,.85)}}100%{{transform:none}}}}
@keyframes c3-pop{{0%{{transform:scale(.4,1.4);opacity:0}}100%{{transform:none;opacity:1}}}}
@keyframes c3-fly{{0%{{opacity:1;transform:translate(0,0) rotate(0)}}100%{{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}}}
.lu .ring2{{stroke-dasharray:0 300}}.lu.play .ring2{{animation:c3-ring 900ms cubic-bezier(0.34,1.56,0.64,1) forwards}}.lu .ring2{{stroke-dasharray:276 300}}
@keyframes c3-ring{{from{{stroke-dasharray:0 300}}to{{stroke-dasharray:276 300}}}}
@media(prefers-reduced-motion:reduce){{.stage.play *{{animation:none!important}}.conf{{display:none}}}}'''
    return f'''.stage .wipe{{position:absolute;inset:-20% -60%;background:{p["a"]};transform:skewX(-30deg) translateX(-120%);pointer-events:none}}
.stage .wipe.k{{background:{p["y"]}}}
.stage.play .wipe{{animation:c4-wipe 700ms cubic-bezier(0.2,0,0,1) forwards}}
.stage.play .wipe.k{{animation-delay:120ms}}
.stage .masc,.stage .msg{{position:relative}}
.stage.play .masc{{animation:c4-stamp 500ms cubic-bezier(0.2,0,0,1) 350ms backwards}}
.stage.play .msg{{animation:c4-in 500ms cubic-bezier(0.2,0,0,1) 450ms backwards}}
.stage .msg{{text-transform:uppercase;transform:rotate(-6deg)}}
@keyframes c4-wipe{{0%{{transform:skewX(-30deg) translateX(-120%)}}100%{{transform:skewX(-30deg) translateX(120%)}}}}
@keyframes c4-stamp{{0%{{transform:scale(2.2) rotate(-20deg);opacity:0}}70%{{transform:scale(.94) rotate(-8deg);opacity:1}}100%{{transform:rotate(-8deg)}}}}
@keyframes c4-in{{0%{{clip-path:polygon(0 0,0 0,-58% 100%,-58% 100%)}}100%{{clip-path:polygon(0 0,158% 0,100% 100%,-58% 100%)}}}}
.stage .masc{{transform:rotate(-8deg)}}
.lu .ring2{{stroke-dasharray:276 300}}.lu.play .ring2{{animation:c4-ring 500ms cubic-bezier(0.2,0,0,1) forwards}}
@keyframes c4-ring{{from{{stroke-dasharray:0 300}}to{{stroke-dasharray:276 300}}}}
@media(prefers-reduced-motion:reduce){{.stage.play *{{animation:none!important}}.wipe{{display:none}}}}'''


def pg_celebrate(d):
    p = P[d]
    cols = [p["a"], p["h"], p["y"], p["b"], p["k"]]
    conf = ""
    if d == "d3":
        for k in range(18):
            a = 2 * math.pi * k / 18
            shape = ["border-radius:50%", "clip-path:polygon(50% 0,100% 100%,0 100%)", "border-radius:2px", "border-radius:50% 0"][k % 4]
            conf += f'<i style="background:{cols[k % 5]};{shape};--x:{math.cos(a) * 160:.0f}px;--y:{math.sin(a) * 120 - 40:.0f}px;--r:{k * 40}deg;animation-delay:{k * 15}ms"></i>'
        fx = f'<div class="conf" aria-hidden="true">{conf}</div>'
    elif d == "d7":
        fx = '<svg class="fx" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke-width="2"><line pathLength="1" style="--k:0" x1="120" y1="230" x2="280" y2="230" stroke="#1A1714"/><circle pathLength="1" style="--k:1" cx="120" cy="230" r="160" stroke="#1E4F94" opacity=".5"/><circle pathLength="1" style="--k:2" cx="280" cy="230" r="160" stroke="#E8A800" opacity=".6"/><path pathLength="1" style="--k:3" d="M120 230L200 91.4L280 230" stroke="#C8102E"/></svg>'
    else:
        fx = '<div class="wipe" aria-hidden="true"></div><div class="wipe k" aria-hidden="true"></div>'
    ring2 = f'<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true"><circle cx="60" cy="60" r="44" fill="none" stroke="{p["lk"]}" stroke-width="12"/><circle class="ring2" cx="60" cy="60" r="44" fill="none" stroke="{p["at"]}" stroke-width="12" transform="rotate(-90 60 60)"/><text x="60" y="70" text-anchor="middle" font-size="30" font-weight="700" fill="currentColor">8</text></svg>'
    moments = [
        ("correct", "Correct answer", f"{fx}{mascot(d)}<p class=\"msg\">Correct! cien = hundred</p><p class=\"gcap\">+10 XP · combo ×3</p>", "Duolingo answer feedback"),
        ("lesson", "Lesson complete", f"{fx}{mascot(d)}<p class=\"msg\">Lesson complete</p><p class=\"gcap\">Numbers · 12 cards · 92% accuracy</p>", "Duolingo lesson end; Brilliant course step"),
        ("lu", "Level up", f"{fx}{ring2}{mascot(d)}<p class=\"msg\">Level 8</p><p class=\"gcap\">The Information quiz is open.</p>", "Brilliant level path; Khan mastery up"),
    ]
    secs = "".join(f'<section class="gpanel"><p class="gk">{t}</p><div class="stage play{" lu" if k == "lu" else ""}" id="st-{k}" aria-live="polite">{inner}</div><div class="grow2"><button class="btn replay" data-t="st-{k}">Replay {t.lower()}</button></div>{caption(c)}</section>' for k, t, inner, c in moments)
    js = '<script>document.querySelectorAll(".replay").forEach(b=>b.addEventListener("click",()=>{const s=document.getElementById(b.dataset.t);s.classList.remove("play");void s.offsetWidth;s.classList.add("play")}))</script>'
    body = f'<div class="gx">{secs}</div>{js}'
    return shell(d, "Celebrate", body, common_css(d) + celebrate_css(d))


def pg_summary(d):
    p = P[d]
    words = [("fr", "ltr", "cent", "French"), ("es", "ltr", "cien", "Spanish"), ("he", "rtl", "מאה", "Hebrew")]
    wl = "".join(f'<li><span class="gh" lang="{l}" dir="{dr}">{w}</span><span class="gcap">{n} · hundred</span><span class="xp">new</span></li>' for l, dr, w, n in words)
    body = f'''<div class="gx">
<section class="gpanel"><div class="stage">{mascot(d)}<p class="msg">Lesson complete</p><p class="gcap">Numbers · Lesson 3</p></div>
<div class="gx" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,120px),1fr));gap:var(--s3)"><div class="stat"><span class="gk">XP earned</span><b>+45</b></div><div class="stat"><span class="gk">Accuracy</span><b>92%</b></div><div class="stat"><span class="gk">Streak</span><b>24</b></div><div class="stat"><span class="gk">Time</span><b>4:12</b></div></div>{caption("Duolingo lesson summary; Anki session stats")}</section>
<section class="gpanel"><p class="gk">Words learned</p><ul class="glist">{wl}</ul><p class="gcap">Reviews return in 1 day, 3 days and 8 days.</p>{caption("Anki spaced intervals")}
<p class="gk">Next lesson</p><div class="note">{flame(d)}<div><p class="t">Canon words · entropy</p><p class="gcap">entropy · énergie · entropía · 12 cards</p></div></div>
<div class="grow2"><a class="btn" href="app-study-card.html">Start next lesson</a><a class="btn ghost" href="app-learn.html">Back to Learn</a></div></section>
</div>{__import__("made_d34").d3_extra() if d == "d3" else ""}'''
    return shell(d, "Summary", body, common_css(d))


if __name__ == "__main__":
    for d in ("d3", "d4", "d7"):
        p = P[d]
        print(d, f"mu/bg={cr(p['mu'], p['bg']):.2f} mu/sf={cr(p['mu'], p['sf']):.2f} on/a={cr(p['on'], p['a']):.2f} k/y={cr(p['k'], p['y']):.2f}")
        for n, f in [("game-progress", pg_progress), ("game-badges", pg_badges), ("game-social", pg_social), ("game-celebrate", pg_celebrate), ("game-summary", pg_summary)]:
            h = f(d)
            if d == "d7":
                h = re.sub(r'<p class="gcap">Precedent: [^<]*</p>', "", h)
            open(f"{ROOT}/pages/{d}/{n}.html", "w").write(h)
