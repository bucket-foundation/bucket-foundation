import sys, math, re, os
sys.path.insert(0, os.path.dirname(__file__))
from lib import D, cr, lum

from paths import DIRECTIONS_DIR as ROOT
OUT = ROOT + "/screens"

R = [
    dict(y="1948", a="Claude E. Shannon", t="A Mathematical Theory of Communication", src="Bell System Technical Journal 27", br="information", lang="en", fee="0.005", lat=38, lon=-30, score=".97"),
    dict(y="1877", a="Ludwig Boltzmann", t="Über die Beziehung zwischen dem zweiten Hauptsatze der mechanischen Wärmetheorie und der Wahrscheinlichkeitsrechnung", src="Wiener Berichte 76", br="physics", lang="de", fee="0.005", lat=12, lon=-4, score=".91"),
    dict(y="1961", a="Rolf Landauer", t="Irreversibility and Heat Generation in the Computing Process", src="IBM Journal of Research and Development 5", br="information", lang="en", fee="0.005", lat=46, lon=8, score=".88"),
    dict(y="1918", a="Emmy Noether", t="Invariante Variationsprobleme", src="Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen", br="mathematics", lang="de", fee="0.005", lat=-22, lon=-42, score=".74"),
    dict(y="1865", a="James Clerk Maxwell", t="A Dynamical Theory of the Electromagnetic Field", src="Philosophical Transactions of the Royal Society 155", br="physics", lang="en", fee="0.005", lat=-8, lon=30, score=".71"),
]
BG_PTS = [(a * 37 % 140 - 70, (a * 83) % 300 - 150) for a in range(1, 46)]
MODES = [("advisors", "Advisors"), ("sources", "Sources"), ("helix", "Helix"), ("dna", "DNA"), ("matter", "Matter")]
MODE_PATH = {
    "advisors": '<circle cx="8" cy="8" r="3.5"/><circle cx="16.5" cy="9" r="3"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6M14 14.5c3-.5 7 1 7 5.5"/>',
    "sources": '<path d="M6 2h9l4 4v16H6Z"/><path d="M9 11h7M9 15h7M9 19h4"/>',
    "helix": '<path d="M4 2c0 5 16 5 16 10S4 17 4 22"/><path d="M20 2c0 5-16 5-16 10s16 5 16 10"/>',
    "dna": '<path d="M7 2c0 7 10 13 10 20M17 2c0 7-10 13-10 20"/><path d="M8.5 6h7M10 12h4M8.5 18h7"/>',
    "matter": '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)"/>',
}
STROKE = {"d1": ("1.5", "square", "miter"), "d2": ("1.6", "round", "round"), "d3": ("2.6", "round", "round"),
          "d4": ("2", "butt", "miter"), "d5": ("1.8", "round", "round"), "d6": ("2", "square", "miter"), "d7": ("2", "round", "round")}
BRC = {"mathematics": 0, "physics": 1, "information": 2}


def icon(did, name, current=False):
    s = open(f"{ROOT}/icons/{did}-{name}.svg").read()
    s = re.sub(r"<\?xml[^>]*>", "", s)
    if current:
        s = re.sub(r'fill="#(?!fff\b|FFF\b)[0-9A-Fa-f]{6}"', 'fill="currentColor"', s)
    return s.replace("<svg ", '<svg class="ic" aria-hidden="true" focusable="false" ', 1)


def mode_icon(did, m):
    w, cap, join = STROKE[did]
    return f'<svg class="mi" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="{cap}" stroke-linejoin="{join}">{MODE_PATH[m]}</svg>'


def proj(lat, lon, Rr, cx, cy, lat0=22, lon0=-12):
    p, l, p0, l0 = map(math.radians, (lat, lon, lat0, lon0))
    cosc = math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(l - l0)
    x = cx + Rr * math.cos(p) * math.sin(l - l0)
    y = cy - Rr * (math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(l - l0))
    return x, y, cosc > 0


def lines(Rr, cx, cy, step_lat=20, step_lon=20):
    out = []
    def run(pts):
        seg = []
        for x, y, v in pts:
            if v:
                seg.append(f"{x:.1f},{y:.1f}")
            elif seg:
                out.append(seg); seg = []
        if len(seg) > 1:
            out.append(seg)
    for lat in range(-80, 81, step_lat):
        run([proj(lat, lo, Rr, cx, cy) for lo in range(-180, 181, 4)])
    for lon in range(-180, 180, step_lon):
        run([proj(la, lon, Rr, cx, cy) for la in range(-90, 91, 4)])
    return "".join(f'<polyline points="{" ".join(s)}"/>' for s in out)


def star(x, y, r1, r2, n=8):
    return " ".join(f"{x + (r1 if k % 2 == 0 else r2) * math.cos(math.pi * k / n - math.pi / 2):.1f},{y + (r1 if k % 2 == 0 else r2) * math.sin(math.pi * k / n - math.pi / 2):.1f}" for k in range(2 * n))


def globe(d, state):
    did, c = d["id"], d["c"]
    S, cx, cy, Rr = 400, 200, 200, 168
    show = state == "full"
    bg_pts = [proj(la, lo, Rr, cx, cy) for la, lo in BG_PTS]
    hits = [proj(r["lat"], r["lon"], Rr, cx, cy) for r in R]
    g = []
    lab = "Canon globe, 5 matches for information entropy highlighted" if show else ("Canon globe, searching" if state == "loading" else "Canon globe, 599 excerpts across 7 branches")
    if did == "d1":
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr}" fill="none" stroke="{c["text"]}" stroke-width="1.5"/>')
        g.append(f'<g fill="none" stroke="{c["muted"]}" stroke-width=".75">{lines(Rr, cx, cy, 15, 15)}</g>')
        g += [f'<rect x="{x-2:.1f}" y="{y-2:.1f}" width="4" height="4" fill="{c["muted"]}"/>' for x, y, v in bg_pts if v]
        if show:
            for i, (x, y, v) in enumerate(hits):
                col = c["hl"] if i == 0 else c["acc"]
                g.append(f'<rect x="{x-6:.1f}" y="{y-6:.1f}" width="12" height="12" fill="{col}"/><text x="{x+12:.1f}" y="{y+5:.1f}" font-size="14" fill="{c["text"]}" font-family="IBM Plex Mono">0{i+1}</text>')
    elif did == "d2":
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr+20}" fill="none" stroke="{c["acc"]}" stroke-width="3"/><circle cx="{cx}" cy="{cy}" r="{Rr+12}" fill="none" stroke="{c["acc"]}" stroke-width="1"/>')
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr}" fill="{c["acc"]}"/>')
        g.append(f'<g fill="none" stroke="{c["bg"]}" stroke-opacity=".55" stroke-width="1">{lines(Rr, cx, cy, 30, 30)}</g>')
        g += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.5" fill="{c["bg"]}" fill-opacity=".8"/>' for x, y, v in bg_pts if v]
        if show:
            for i, (x, y, v) in enumerate(hits):
                g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{12 if i==0 else 7}" fill="{c["hl"] if i==0 else c["bg"]}" stroke="{c["bg"]}" stroke-width="2"/>')
    elif did == "d3":
        g.append(f'<circle cx="{cx}" cy="{cy+10}" r="{Rr}" fill="#C79A00"/><circle cx="{cx}" cy="{cy}" r="{Rr}" fill="#FFC800"/>')
        g.append(f'<g fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="5" stroke-linecap="round">{lines(Rr-8, cx, cy, 30, 45)}</g>')
        g.append(f'<path d="M96 120q20-20 40 0t40 0" fill="none" stroke="{c["hl"]}" stroke-width="6" stroke-linecap="round"/><ellipse cx="150" cy="90" rx="28" ry="14" fill="#FFFFFF" fill-opacity=".55"/>')
        g += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#1F5600" fill-opacity=".45"/>' for x, y, v in bg_pts if v]
        if show:
            for i, (x, y, v) in enumerate(hits):
                r = 16 if i == 0 else 11
                g.append(f'<circle cx="{x:.1f}" cy="{y+3:.1f}" r="{r}" fill="#1F5600"/><circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{c["hl"] if i==0 else "#58CC02"}" stroke="#1F5600" stroke-width="3"/>')
    elif did == "d4":
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr}" fill="{c["surf"]}"/>')
        g.append(f'<g fill="none" stroke="{c["muted"]}" stroke-opacity=".7" stroke-width="1">{lines(Rr, cx, cy, 15, 30)}</g>')
        g.append(f'<clipPath id="gc{state}"><circle cx="{cx}" cy="{cy}" r="{Rr}"/></clipPath><path clip-path="url(#gc{state})" d="M0 400 400 169V400Z" fill="{c["acc"]}" fill-opacity=".9"/>')
        g += [f'<rect x="{x-2.5:.1f}" y="{y-2.5:.1f}" width="5" height="5" fill="{c["text"]}" fill-opacity=".6"/>' for x, y, v in bg_pts if v]
        if show:
            for i, (x, y, v) in enumerate(hits):
                g.append(f'<rect x="{x-7:.1f}" y="{y-7:.1f}" width="14" height="14" fill="{c["text"]}" transform="rotate(-30 {x:.1f} {y:.1f})"/><text x="{x+14:.1f}" y="{y+6:.1f}" font-family="Oswald" font-weight="700" font-size="18" fill="{c["text"]}">0{i+1}</text>')
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr}" fill="none" stroke="{c["text"]}" stroke-width="3"/>')
    elif did == "d5":
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr}" fill="{c["surf"]}" stroke="{c["acc"]}" stroke-width="2"/>')
        g.append(f'<g fill="none" stroke="{c["acc"]}" stroke-opacity=".45" stroke-width="1">{lines(Rr, cx, cy, 22, 22)}</g>')
        g.append(f'<polygon points="{star(cx, cy, Rr+20, Rr+8, 16)}" fill="none" stroke="{c["hl"]}" stroke-opacity=".7" stroke-width="1.5"/>')
        g += [f'<polygon points="{star(x, y, 4, 2)}" fill="{c["text"]}" fill-opacity=".55"/>' for x, y, v in bg_pts if v]
        if show:
            for i, (x, y, v) in enumerate(hits):
                g.append(f'<polygon points="{star(x, y, 14 if i==0 else 10, 6 if i==0 else 4.5)}" fill="{c["hl"] if i==0 else c["acc"]}"/>')
    else:
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{Rr}" fill="{c["surf"]}" stroke="{c["text"]}" stroke-width="2"/>')
        g.append(f'<g fill="none" stroke="{c["text"]}" stroke-width="1.25" stroke-dasharray="2 6">{lines(Rr, cx, cy, 20, 30)}</g>')
        g += [f'<rect x="{x-2:.1f}" y="{y-2:.1f}" width="4" height="4" fill="{c["muted"]}"/>' for x, y, v in bg_pts if v]
        if show:
            shapes = []
            for i, (x, y, v) in enumerate(hits):
                b = BRC[R[i]["br"]]
                col = c["acc"] if i == 0 else ("#1D4ED8" if b != 1 else "#E1251B")
                if b == 0:
                    shapes.append(f'<path d="M{x:.1f} {y-11:.1f} {x+10:.1f} {y+7:.1f}H{x-10:.1f}Z" fill="{col}" stroke="{c["text"]}" stroke-width="2"/>')
                elif b == 1:
                    shapes.append(f'<rect x="{x-8:.1f}" y="{y-8:.1f}" width="16" height="16" fill="{col}" stroke="{c["text"]}" stroke-width="2"/>')
                else:
                    shapes.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{12 if i==0 else 9}" fill="{col}" stroke="{c["text"]}" stroke-width="2"/>')
            g += shapes
    if state == "loading":
        g.append(f'<circle class="spin" cx="{cx}" cy="{cy}" r="{Rr+4}" fill="none" stroke="{c["acc"] if did!="d3" else "#2E7D00"}" stroke-width="6" stroke-dasharray="120 1000" stroke-linecap="{"round" if did in ("d2","d3","d5") else "butt"}"/>')
    return f'<svg class="globe{" dim" if state!="full" else ""}" viewBox="0 0 {S} {S}" role="img" aria-label="{lab}">{"".join(g)}</svg>'


CSS = {}
CSS["d1"] = """
.top{border-bottom:1px solid #E0E0E0}
.app{display:grid;grid-template-columns:repeat(16,1fr);column-gap:var(--s5);padding:0 var(--s6) var(--s8)}
.search{grid-column:1/17;border-bottom:2px solid var(--text);padding:var(--s7) 0 var(--s3);margin-bottom:var(--s6)}
.search input{font:300 48px/56px 'IBM Plex Sans';letter-spacing:-.01em}
.search .ic{width:32px;height:32px}
.modes{grid-column:1/4;flex-direction:column;gap:0;align-self:start}
.mode{justify-content:flex-start;padding:var(--s3) var(--s4);border-left:4px solid transparent;font-size:14px;line-height:20px}
.mode[aria-selected=true]{border-left-color:var(--acc);background:var(--surf);font-weight:600}
.results{grid-column:4/11}
.stage{grid-column:11/17;align-self:start;position:sticky;top:var(--s5)}
.card{display:grid;grid-template-columns:64px 1fr auto;column-gap:var(--s4);padding:var(--s4) 0;border-top:1px solid #E0E0E0}
.card .yr{font:400 14px/20px 'IBM Plex Mono';grid-row:1/4;color:var(--muted)}
.card h3{font:400 20px/28px 'IBM Plex Sans';grid-column:2}
.card .meta{grid-column:2}
.card .act{grid-column:3;grid-row:1/4;align-self:start}
.btn{border-radius:0;padding:var(--s3) var(--s6) var(--s3) var(--s4)}
.chip{border-radius:0}
.stage figcaption{font:400 12px/16px 'IBM Plex Mono';letter-spacing:.32px}
.skel{border-radius:0}
@media (max-width:720px){.app{display:flex;flex-direction:column;padding:0 var(--s4) var(--s7)}.search{padding-top:var(--s5)}.search input{font-size:28px;line-height:36px}.modes{flex-direction:row;gap:0;border-bottom:1px solid #E0E0E0}.mode{flex:1;flex-direction:column;border-left:0;border-bottom:4px solid transparent;padding:var(--s2) 0;font-size:12px;line-height:16px;justify-content:center}.mode[aria-selected=true]{border-bottom-color:var(--acc)}.stage{position:static}.card{grid-template-columns:48px 1fr}.card .act{grid-column:2;grid-row:auto;margin-top:var(--s3)}}
"""
CSS["d2"] = """
.top{justify-content:center;flex-direction:column;gap:var(--s2);padding-top:var(--s6)}
.top nav{gap:var(--s5)}
.app{max-width:960px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:var(--s6);padding:var(--s5) var(--s6) var(--s9)}
.search{width:100%;max-width:640px;background:var(--surf);border-radius:20px;padding:var(--s2) var(--s2) var(--s2) var(--s5);box-shadow:0 1px 0 rgba(28,28,28,.08),0 8px 24px rgba(31,58,95,.08)}
.search input{font:500 24px/32px 'Shippori Mincho'}
.modes{gap:var(--s5)}
.mode{flex-direction:column;gap:var(--s2);font-size:14px;line-height:20px;padding:0;background:none}
.mode .mi{width:56px;height:56px;padding:var(--s3);border-radius:50%;box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc)}
.mode[aria-selected=true] .mi{background:var(--acc);color:var(--bg);box-shadow:inset 0 0 0 1px var(--acc),0 0 0 4px var(--bg),0 0 0 5px var(--acc)}
.mode[aria-selected=true]{font-weight:700}
.stage{width:440px;max-width:100%;text-align:center}
.results{width:100%}
.results ol{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5)}
.card{background:var(--surf);border-radius:20px;padding:var(--s5);display:grid;grid-template-columns:56px 1fr;column-gap:var(--s4);row-gap:var(--s2)}
.card .yr{grid-row:1/3;width:56px;height:56px;border-radius:50%;background:var(--hl);color:#FFFFFF;display:flex;align-items:center;justify-content:center;font:800 16px/24px 'Shippori Mincho'}
.card h3{font:800 20px/28px 'Shippori Mincho'}
.card .act{grid-column:1/3;border-top:1px solid rgba(90,81,72,.25);padding-top:var(--s4);margin-top:var(--s2)}
.card:first-child{grid-column:1/3}
.btn{border-radius:999px}
.rhead{text-align:center}
@media (max-width:720px){.app{padding:var(--s4) var(--s4) var(--s8);gap:var(--s5)}.modes{gap:var(--s2);width:100%;justify-content:space-between}.mode{font-size:12px;line-height:16px}.mode .mi{width:48px;height:48px;padding:var(--s3)}.stage{width:280px}.results ol{grid-template-columns:1fr}.card:first-child{grid-column:auto}.search input{font-size:20px;line-height:28px}.top nav{display:none}}
"""
CSS["d3"] = """
body{background-image:radial-gradient(circle at 8px 8px,rgba(255,75,145,.35) 3px,transparent 4px),radial-gradient(circle at 32px 40px,rgba(88,204,2,.35) 4px,transparent 5px);background-size:48px 48px,64px 64px;background-attachment:fixed}
.top{background:var(--bg);border-bottom:4px solid #E5DECB}
.app{display:grid;grid-template-columns:520px 1fr;gap:var(--s6);padding:var(--s6) var(--s7) var(--s8);max-width:1440px;margin:0 auto}
.lcol{display:flex;flex-direction:column;gap:var(--s5);position:sticky;top:var(--s5);align-self:start}
.rcol{display:flex;flex-direction:column;gap:var(--s5)}
.search{background:var(--surf);border-radius:16px;padding:var(--s2) var(--s2) var(--s2) var(--s4);box-shadow:0 4px 0 #E5DECB;border:2px solid #E5DECB}
.search input{font:800 20px/28px 'Nunito'}
.stagecard{background:var(--surf);border-radius:24px;border:2px solid #E5DECB;box-shadow:0 4px 0 #E5DECB;padding:var(--s4)}
.modes{gap:var(--s2);flex-wrap:wrap}
.mode{flex:1;flex-direction:column;gap:var(--s1);border-radius:16px;padding:var(--s2) var(--s1) var(--s3);font:700 14px/20px 'Nunito';background:var(--bg);box-shadow:0 4px 0 #E5DECB;border:2px solid #E5DECB}
.mode .mi{width:28px;height:28px}
.mode[aria-selected=true]{background:#DDF4FF;border-color:#1CB0F6;box-shadow:0 4px 0 #1CB0F6;color:#0B4A6F}
.mode:active{transform:translateY(4px);box-shadow:none}
.card{background:var(--surf);border-radius:16px;border:2px solid #E5DECB;box-shadow:0 4px 0 #E5DECB;padding:var(--s5);display:grid;grid-template-columns:1fr auto;gap:var(--s2) var(--s4)}
.card .yr{grid-column:1/3;justify-self:start;background:var(--hl);color:#1A1A1A;border-radius:999px;padding:0 var(--s3);font:800 14px/24px 'Nunito'}
.card h3{font:700 22px/28px 'Fredoka';grid-column:1}
.card .meta{grid-column:1}
.card .act{grid-column:2;grid-row:2/4;align-self:end;flex-direction:column;align-items:flex-end}
.results ol{gap:var(--s4)}
.btn{border-radius:16px;box-shadow:0 4px 0 #3D8C00}
.btn:active,.btn.is-active{transform:translateY(4px);box-shadow:none}
.chip{border-radius:16px;box-shadow:0 4px 0 #E5DECB;border:2px solid #E5DECB;background:var(--surf)}
.skel{border-radius:12px}
@media (max-width:720px){.app{display:flex;flex-direction:column;padding:var(--s4) var(--s4) var(--s8);gap:var(--s5)}.lcol{position:static}.lcol,.rcol,.stagecard{min-width:0;width:100%}.mode{min-width:0;padding:var(--s2) 0 var(--s3)}.modes{flex-wrap:nowrap}.search .go{padding:var(--s3)}.mode{font-size:12px;line-height:16px}.mode .mi{width:24px;height:24px}.card{grid-template-columns:1fr}.card .act{grid-column:1;grid-row:auto;flex-direction:row;align-items:center;justify-content:space-between}.card h3{font-size:20px;line-height:28px}}
"""
CSS["d4"] = """
body{background:linear-gradient(150deg,var(--bg) 0 62%,transparent 62%) ,var(--bg)}
.wedge{position:fixed;inset:0;pointer-events:none;background:var(--acc);clip-path:polygon(100% 0,100% 100%,62% 100%);opacity:.14}
.top{text-transform:uppercase;letter-spacing:.12em;font:500 14px/20px 'Oswald';border-bottom:1px solid #3A3A3A}
.app{display:grid;grid-template-columns:5fr 7fr;gap:var(--s7);padding:var(--s7) var(--s7) var(--s8);position:relative}
.lcol{display:flex;flex-direction:column;gap:var(--s6)}
.rcol{display:flex;flex-direction:column;gap:var(--s5)}
.search{flex-direction:column;align-items:stretch;gap:var(--s3);border-left:8px solid var(--acc);padding-left:var(--s5)}
.search .lab{font:500 14px/20px 'Oswald';letter-spacing:.16em;color:var(--muted);text-transform:uppercase}
.search input{font:700 48px/56px 'Oswald';text-transform:uppercase;letter-spacing:-.01em}
.search .ic{display:none}
.search .row{display:flex;gap:var(--s3)}
.modes{gap:0;border:1px solid var(--muted);border-radius:0}
.mode{flex:1;gap:var(--s2);padding:var(--s3) var(--s2);font:500 14px/20px 'Oswald';letter-spacing:.12em;text-transform:uppercase;border-right:1px solid var(--muted)}
.mode:last-child{border-right:0}
.mode[aria-selected=true]{background:var(--acc);color:var(--onacc)}
.stage .globe{transform:rotate(-4deg)}
.card{display:grid;grid-template-columns:80px 1fr auto;gap:var(--s1) var(--s5);padding:var(--s5) 0;border-top:2px solid var(--text)}
.card .num{font:700 56px/56px 'Oswald';grid-row:1/4;color:var(--text)}
.card .yr{font:700 14px/20px 'Oswald';letter-spacing:.16em;color:var(--muted);grid-column:2}
.card h3{font:600 22px/28px 'Roboto Flex';grid-column:2}
.card .meta{grid-column:2}
.card .act{grid-column:3;grid-row:1/4;align-self:center}
.rhead h2{font:700 32px/40px 'Oswald';text-transform:uppercase}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.12em;clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%);padding-right:var(--s6)}
.chip{border-radius:0;text-transform:uppercase;letter-spacing:.12em;font-family:'Oswald'}
.skel{border-radius:0}
@media (max-width:720px){.app{display:flex;flex-direction:column;padding:var(--s5) var(--s4) var(--s8);gap:var(--s5)}.search input{font-size:36px;line-height:40px}.mode{flex-direction:column;font-size:12px;line-height:16px;letter-spacing:.04em;padding:var(--s2) 0;gap:var(--s1)}.card{grid-template-columns:48px 1fr}.card .num{font-size:32px;line-height:40px}.card .act{grid-column:2;grid-row:auto;margin-top:var(--s3)}.card h3{font-size:20px;line-height:28px}.stage{transform:none}.lcol{gap:var(--s5)}}
"""
CSS["d5"] = """
body{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%233FC1C9' stroke-opacity='.12'%3E%3Cpath d='M48 8 58 38 88 48 58 58 48 88 38 58 8 48 38 38Z'/%3E%3Cpath d='M20 20h56v56H20Z' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E")}
.shell{display:grid;grid-template-columns:96px 1fr;min-height:100vh}
.rail{background:var(--surf);display:flex;flex-direction:column;align-items:center;gap:var(--s2);padding:var(--s4) 0}
.rail .modes{flex-direction:column;gap:var(--s1)}
.mode{flex-direction:column;gap:var(--s1);width:80px;padding:var(--s3) 0;border-radius:8px;font:600 12px/16px 'Noto Sans';position:relative}
.mode .mi{width:24px;height:24px}
.mode[aria-selected=true]{background:rgba(63,193,201,.16)}
.mode[aria-selected=true]::before{content:"";position:absolute;left:0;top:var(--s4);bottom:var(--s4);width:4px;border-radius:2px;background:var(--acc)}
.top{padding:var(--s4) var(--s6)}
.top .search{flex:1;max-width:560px;margin:0 var(--s6)}
.search{background:rgba(18,56,115,.85);backdrop-filter:blur(16px);border-radius:8px;padding:var(--s1) var(--s1) var(--s1) var(--s3);box-shadow:inset 0 -2px 0 var(--acc)}
.search input{font:400 16px/24px 'Noto Sans'}
.app{display:grid;grid-template-columns:7fr 5fr;gap:var(--s6);padding:var(--s4) var(--s6) var(--s8)}
.stage{background:rgba(18,56,115,.72);backdrop-filter:blur(20px);border-radius:8px;padding:var(--s5);align-self:start;box-shadow:0 8px 32px rgba(0,0,0,.28),inset 0 0 0 1px rgba(63,193,201,.3)}
.card{background:rgba(18,56,115,.85);border-radius:8px;padding:var(--s4) var(--s5);display:grid;grid-template-columns:1fr auto;gap:var(--s1) var(--s4);box-shadow:0 2px 8px rgba(0,0,0,.2)}
.card .yr{font:700 14px/20px 'Reem Kufi';color:var(--hl);letter-spacing:.04em}
.card h3{font:600 18px/24px 'Noto Sans'}
.card .act{grid-column:2;grid-row:1/4;align-self:center;flex-direction:column;align-items:flex-end}
.results ol{gap:var(--s2)}
.rhead h2{font:700 24px/32px 'Reem Kufi'}
.btn{border-radius:4px}
.chip{border-radius:4px}
.skel{border-radius:4px}
@media (max-width:720px){.shell{display:flex;flex-direction:column}.rail{order:3;position:sticky;bottom:0;flex-direction:row;padding:var(--s1) var(--s2);z-index:2}.rail .glyph{display:none}.rail .modes{flex-direction:row;width:100%;justify-content:space-between}.mode{width:64px;padding:var(--s2) 0}.mode[aria-selected=true]::before{left:var(--s4);right:var(--s4);top:0;bottom:auto;width:auto;height:4px}.top{flex-wrap:wrap;padding:var(--s3) var(--s4);gap:var(--s3)}.top .search{order:3;flex-basis:100%;margin:0}.app{display:flex;flex-direction:column;padding:var(--s3) var(--s4) var(--s6);gap:var(--s4)}.app .stage{order:-1}.card{grid-template-columns:1fr}.card .act{grid-column:1;grid-row:auto;flex-direction:row;align-items:center;justify-content:space-between}}
"""
CSS["d6"] = """
.top{font:700 12px/16px 'Space Mono';text-transform:uppercase;letter-spacing:.08em}
.app{max-width:1280px;margin:0 auto;padding:var(--s5) var(--s6) var(--s8);display:flex;flex-direction:column;gap:var(--s4)}
.panel{background:var(--surf);border:2px solid var(--text);border-radius:16px;padding:var(--s4);display:grid;grid-template-columns:420px 1fr;gap:var(--s4)}
.screen{border:2px solid var(--text);border-radius:8px;padding:var(--s3);background:var(--bg);display:flex;flex-direction:column;gap:var(--s3)}
.search{border:2px solid var(--text);border-radius:8px;background:var(--surf);padding:var(--s1) var(--s1) var(--s1) var(--s3)}
.search input{font:700 20px/28px 'Space Mono'}
.keys{display:grid;grid-template-columns:repeat(5,1fr) 96px;gap:var(--s2);align-items:end}
.modes{display:contents}
.mode{flex-direction:column;gap:var(--s2);padding:var(--s3) 0;border:2px solid var(--text);border-radius:8px;background:var(--surf);font:700 12px/16px 'Space Mono';text-transform:uppercase;letter-spacing:.08em;box-shadow:0 4px 0 var(--text)}
.mode .k{font:700 12px/16px 'Space Mono';color:var(--muted)}
.mode[aria-selected=true]{background:var(--acc);transform:translateY(4px);box-shadow:none}
.mode[aria-selected=true] .k{color:var(--text)}
.knob{width:96px;height:96px;border-radius:50%;border:2px solid var(--text);background:var(--surf);position:relative}
.knob::after{content:"";position:absolute;left:46px;top:8px;width:4px;height:32px;background:var(--text);transform-origin:2px 40px;transform:rotate(40deg)}
.card{display:grid;grid-template-columns:72px 1fr auto;gap:0 var(--s3);padding:var(--s3) 0;border-top:2px dashed var(--text);font-family:'Space Mono'}
.card .yr{font:700 16px/24px 'Space Mono';grid-row:1/4}
.card h3{font:700 18px/24px 'Jost'}
.card .meta,.card .act{font-size:12px;line-height:16px}
.card .act{grid-column:3;grid-row:1/4;align-self:center}
.rhead h2{font:700 12px/16px 'Space Mono';text-transform:uppercase;letter-spacing:.08em}
.btn{border-radius:8px;border:2px solid var(--text);box-shadow:0 4px 0 var(--text);font-family:'Space Mono';text-transform:uppercase;font-size:14px}
.btn:active,.btn.is-active{transform:translateY(4px);box-shadow:none}
.chip{border-radius:8px;border:2px solid var(--text);font-family:'Space Mono'}
.skel{border-radius:0}
@media (max-width:720px){.search input{font-size:16px;line-height:24px}.search .go{padding:var(--s3)}.app{padding:var(--s3) var(--s4) var(--s7)}.panel{grid-template-columns:minmax(0,1fr);padding:var(--s3)}.keys{grid-template-columns:repeat(5,1fr)}.knob{display:none}.mode{font-size:10px;line-height:12px;letter-spacing:0}.card{grid-template-columns:56px 1fr}.card .act{grid-column:2;grid-row:auto;margin-top:var(--s2)}}
"""

CSS["d7"] = """
.top{border-bottom:1px solid #D8CDBB;font-family:'Gentium Book Plus'}
.app{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--s7);padding:var(--s6) var(--s7) var(--s8);max-width:1440px;margin:0 auto}
.lcol{display:flex;flex-direction:column;gap:var(--s5)}
.prop-n{font:400 14px/20px 'Noto Sans Mono';color:var(--muted)}
.search{border:1px solid var(--muted);border-radius:2px;background:var(--surf);padding:var(--s2) var(--s2) var(--s2) var(--s4);container-type:inline-size}
.search input{font:400 min(32px,6cqi)/40px 'GFS Didot'}
.modes{gap:var(--s2);flex-wrap:wrap}
.mode{border:1px solid #D8CDBB;border-radius:2px;padding:var(--s2) var(--s3);font-size:14px;line-height:20px}
.mode[aria-selected=true]{background:var(--hl);color:#fff;border-color:var(--hl)}
.figcol .stage{position:sticky;top:var(--s5);border:1px solid #D8CDBB;background:var(--surf);padding:var(--s4)}
.results ol{counter-reset:prop}
.card{display:grid;grid-template-columns:72px minmax(0,1fr);gap:var(--s1) var(--s4);padding:var(--s4) 0;border-top:1px solid #D8CDBB;counter-increment:prop}
.card::before{content:"I." counter(prop);grid-row:1/5;font:400 28px/32px 'GFS Didot';color:var(--acc)}
.card .yr{font:400 12px/16px 'Noto Sans Mono';color:var(--muted)}
.card h3{font:700 20px/28px 'Gentium Book Plus'}
.btn{border-radius:2px}
.chip{border-radius:2px}
.rhead h2,.empty h2{font-family:'GFS Didot'}
@media (max-width:720px){.app{display:flex;flex-direction:column;padding:var(--s4) var(--s4) var(--s8);gap:var(--s5)}.card{grid-template-columns:48px minmax(0,1fr)}.card::before{font-size:22px}.act{flex-wrap:wrap}.figcol .stage{position:static}}
"""
BASE = """*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 16px/24px BODY;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,p,ol{margin:0}ol{list-style:none;padding:0}a{color:inherit}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.top{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);padding:var(--s4) var(--s6)}
.brand{display:flex;align-items:center;gap:var(--s2);text-decoration:none;font:DISPW 24px/32px DISP}
.brand img{width:32px;height:32px;display:block}
.top nav{display:flex;gap:var(--s5)}.top nav a{text-decoration:none;color:var(--muted)}.top nav a[aria-current]{color:var(--text)}
.search{display:flex;align-items:center;gap:var(--s3)}
.search input{flex:1;min-width:0;border:0;background:transparent;color:var(--text);padding:0;outline:0}
.search input::placeholder{color:var(--muted);opacity:1}
.search:focus-within{outline:3px solid var(--text);outline-offset:3px}
.ic{width:24px;height:24px;flex:none;display:block}
.modes{display:flex}
.mode{display:flex;align-items:center;justify-content:center;gap:var(--s2);border:0;background:transparent;color:var(--text);font:inherit;cursor:pointer;transition:background-color DUR EASE,color DUR EASE,transform 80ms EASE}
.mode .mi{width:20px;height:20px;flex:none}
.mode:hover{background:color-mix(in srgb,var(--muted) 12%,transparent)}
.mode:focus-visible{outline:3px solid var(--text);outline-offset:2px}
.stage{margin:0}.globe{width:100%;height:auto;display:block}
.globe.dim{opacity:.55}
.stage figcaption{color:var(--muted);font-size:14px;line-height:20px;margin-top:var(--s3)}
.legend{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4);margin-top:var(--s2);font-size:14px;line-height:20px;color:var(--muted)}
.legend i{display:inline-block;box-shadow:inset 0 0 0 1px var(--muted);width:8px;height:8px;margin-right:var(--s2);vertical-align:1px}
.rhead{display:flex;flex-direction:column;gap:var(--s1);margin-bottom:var(--s4)}
.rhead h2{font:DISPW 24px/32px DISP}
.rhead p,.meta{color:var(--muted);font-size:14px;line-height:20px}
.results ol{display:flex;flex-direction:column}
.card h3{overflow-wrap:break-word;hyphens:auto}
.meta{display:flex;flex-wrap:wrap;gap:0 var(--s3)}
.meta .br::before{content:"";display:inline-block;width:8px;height:8px;margin-right:var(--s2);background:currentColor;vertical-align:1px}
.act{display:flex;align-items:center;gap:var(--s3)}
.fee{color:var(--muted);font-size:14px;line-height:20px;white-space:nowrap}
.btn{display:inline-flex;align-items:center;gap:var(--s2);background:var(--acc);color:var(--onacc);border:0;font:600 16px/24px BODY;padding:var(--s3) var(--s4);min-height:48px;cursor:pointer;white-space:nowrap;transition:background-color 120ms EASE,transform 80ms EASE,box-shadow 120ms}
.btn .ic{width:20px;height:20px}
.btn:hover{background:HOVER}
.btn:active{transform:translateY(1px)}
.btn:focus-visible{outline:3px solid var(--text);outline-offset:3px}
.btn:disabled{background:var(--surf);color:var(--muted);box-shadow:inset 0 0 0 1px var(--muted);cursor:not-allowed;transform:none}
.btn.go{min-height:48px}
.empty{display:flex;flex-direction:column;gap:var(--s4);padding:var(--s5) 0}
.empty h2{font:DISPW 32px/40px DISP}
.empty p{color:var(--muted);max-width:52ch}
.chips{display:flex;flex-wrap:wrap;gap:var(--s2)}
.chip{border:0;background:transparent;color:var(--text);box-shadow:inset 0 0 0 1px var(--muted);padding:var(--s2) var(--s3);font:400 14px/20px BODY;min-height:40px;cursor:pointer}
.skel{background:color-mix(in srgb,var(--muted) 22%,transparent);height:16px;position:relative;overflow:hidden}
.skel.t{height:24px;width:80%}.skel.s{width:45%}
.app *,.app{min-width:0}.card.loadcard{display:flex;flex-direction:column;gap:var(--s2)}
.status{color:var(--muted);font-size:14px;line-height:20px}
.spin{transform-origin:200px 200px;animation:spin 1.2s ANIM infinite}
.skel::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--surf) 60%,transparent),transparent);animation:sh 1.4s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes sh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.spin,.skel::after{animation:none}}
@media (max-width:720px){.top{padding:var(--s3) var(--s4)}.top nav{gap:var(--s4);font-size:14px;line-height:20px}.act{flex-wrap:wrap}}
"""

BRANCH_COL = {"d1": ["#0F62FE", "#161616", "#DA1E28"], "d2": ["#1F3A5F", "#B8341B", "#5A5148"],
              "d3": ["#2E7D00", "#FF4B91", "#1CB0F6"], "d4": ["#E3242B", "#EFE6D2", "#B5AC9A"],
              "d5": ["#3FC1C9", "#F2C14E", "#F5F7FA"], "d6": ["#FF5F00", "#1D4ED8", "#111111"], "d7": ["#1E4F94", "#A6442A", "#1A1714"]}
BR_NAME = {"mathematics": "Mathematics", "physics": "Physics", "information": "Information"}


def hover(d):
    a = d["c"]["acc"].lstrip("#")
    rgb = [round(int(a[i:i+2], 16) * .86) for i in (0, 2, 4)]
    return "#" + "".join(f"{v:02X}" for v in rgb)


def checks(d):
    c = d["c"]; out = []
    P = [("text/bg", c["text"], c["bg"]), ("muted/bg", c["muted"], c["bg"]), ("text/surf", c["text"], c["surf"]),
         ("muted/surf", c["muted"], c["surf"]), ("btn", c["onacc"], c["acc"]), ("btn hover", c["onacc"], hover(d))]
    if d["id"] == "d2": P.append(("seal year", "#FFFFFF", c["hl"]))
    if d["id"] == "d3": P += [("year tag", "#1A1A1A", c["hl"]), ("mode on", "#0B4A6F", "#DDF4FF")]
    if d["id"] == "d4": P.append(("mode on", c["onacc"], c["acc"]))
    if d["id"] == "d5": P += [("year gold/card", c["hl"], "#123873"), ("text/card", c["text"], "#123873"), ("muted/card", c["muted"], "#123873"), ("text/mode on", c["text"], "#194E81")]
    if d["id"] == "d6": P.append(("mode on", c["text"], c["acc"]))
    if d["id"] == "d1": P.append(("btn disabled", c["muted"], c["surf"]))
    for n, f, b in P:
        r = cr(f, b)
        assert r >= 4.5, (d["id"], n, round(r, 2))
        out.append((n, round(r, 2)))
    return out


def card(d, i, r):
    num = f'<span class="num" aria-hidden="true">0{i+1}</span>' if d["id"] == "d4" else ""
    col = BRANCH_COL[d["id"]][BRC[r["br"]]]
    return f'''<li><article class="card" aria-labelledby="r{i}">{num}<span class="yr">{r["y"]}</span><h3 id="r{i}" lang="{r["lang"]}">{r["t"]}</h3><p class="meta"><span>{r["a"]}</span><span class="br" style="color:var(--muted)"><span style="color:{col}" aria-hidden="true"></span>{BR_NAME[r["br"]]}</span><span>{r["src"]}</span></p><div class="act"><span class="fee">Cite fee ${r["fee"]}</span><button class="btn" type="button" aria-label="Cite {r["a"]} {r["y"]}">{icon(d["id"], "cite", True)}Cite</button></div></article></li>'''


def page(d, state):
    did, c = d["id"], d["c"]
    q = "" if state == "empty" else "information entropy"
    css_tokens = f':root{{--bg:{c["bg"]};--surf:{c["surf"]};--text:{c["text"]};--muted:{c["muted"]};--acc:{c["acc"]};--onacc:{c["onacc"]};--hl:{c["hl"]};--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:64px;--s9:96px;--ease:{d["ease"]};--dur:{d["dur"]}}}'
    base = (BASE.replace("BODY", d["body"] + ",sans-serif").replace("DISPW", str(d["dispw"])).replace("DISP", d["disp"])
            .replace("DUR", d["dur"]).replace("EASE", "var(--ease)").replace("HOVER", hover(d))
            .replace("ANIM", "steps(8,end)" if did == "d6" else "linear"))
    fonts = re.search(r'href="(https://fonts[^"]*)"', open(f"{OUT}/{did}-hero.html").read()).group(1)
    modes = "".join(f'<button class="mode" role="tab" type="button" aria-selected="{"true" if m=="sources" else "false"}" aria-controls="stage">{f"<span class=k>{k+1}</span>" if did=="d6" else ""}{mode_icon(did, m)}<span>{lab}</span></button>' for k, (m, lab) in enumerate(MODES))
    modes = f'<div class="modes" role="tablist" aria-label="Mode">{modes}</div>'
    lab = '<span class="lab" id="ql">Search the canon</span>' if did == "d4" else '<span class="sr" id="ql">Search the canon</span>'
    field = f'<input id="q" type="search" value="{q}" placeholder="Ask the canon" aria-labelledby="ql" autocomplete="off">'
    go = f'<button class="btn go" type="submit">{"Search" if did!="d6" else "Enter"}</button>'
    if did == "d4":
        search = f'<form class="search" role="search">{lab}{field}<div class="row">{go}</div></form>'
    else:
        search = f'<form class="search" role="search">{lab}{icon(did, "search")}{field}{go}</form>'
    bc = BRANCH_COL[did]
    LEG={"d1":(c["hl"],c["acc"]),"d2":(c["hl"],c["bg"]),"d3":(c["hl"],"#58CC02"),"d4":(c["acc"],c["text"]),"d5":(c["hl"],c["acc"]),"d6":(c["acc"],"#1D4ED8"),"d7":(c["acc"],c["hl"])}[did]
    legend = f'<p class="legend"><span><i style="background:{LEG[0]}"></i>Top match</span><span><i style="background:{LEG[1]}"></i>Match</span><span><i style="background:{c["muted"]}"></i>Other excerpts</span></p>'
    cap = {"full": "Canon globe. 5 of 599 excerpts match.", "empty": "Canon globe. 599 excerpts, 7 branches.", "loading": "Canon globe. Searching."}[state]
    stage = f'<figure class="stage" id="stage" role="tabpanel">{globe(d, state)}<figcaption>{cap}</figcaption>{legend if state=="full" else ""}</figure>'
    if state == "full":
        res = f'<section class="results" aria-labelledby="rh"><div class="rhead"><h2 id="rh">5 results</h2><p>Sources mode. Sorted by relevance to “information entropy”.</p></div><ol>{"".join(card(d, i, r) for i, r in enumerate(R))}</ol></section>'
    elif state == "empty":
        sug = "".join(f'<button class="chip" type="button">{s}</button>' for s in ["information entropy", "least action", "gauge symmetry", "Noether’s theorem"])
        res = f'<section class="results empty" aria-labelledby="rh"><h2 id="rh">Search the canon</h2><p>599 foundation excerpts across 7 branches. Reading is free. Citing pays the author once.</p><div class="chips">{sug}</div></section>'
    else:
        sk = "".join('<li><div class="card loadcard"><span class="skel s"></span><span class="skel t"></span><span class="skel"></span></div></li>' for _ in range(4))
        res = f'<section class="results" aria-labelledby="rh" aria-busy="true"><div class="rhead"><h2 id="rh">Searching</h2><p class="status" role="status">Searching 599 excerpts for “information entropy”.</p></div><ol>{sk}</ol></section>'
    brand = f'<a class="brand" href="#"><img src="../icons/{did}-glyph.svg" alt="">bkt</a>'
    nav = '<nav aria-label="Main"><a href="#" aria-current="page">Canon</a><a href="#">Research OS</a><a href="#">About</a></nav>'
    if did == "d1":
        body = f'<header class="top">{brand}{nav}</header><main class="app">{search}{modes}{res}{stage}</main>'
    elif did == "d2":
        body = f'<header class="top">{brand}{nav}</header><main class="app">{search}{modes}{stage}{res}</main>'
    elif did == "d3":
        body = f'<header class="top">{brand}{nav}</header><main class="app"><div class="lcol">{search}<div class="stagecard">{modes}{stage}</div></div><div class="rcol">{res}</div></main>'
    elif did == "d4":
        body = f'<div class="wedge" aria-hidden="true"></div><header class="top">{brand}{nav}</header><main class="app"><div class="lcol">{search}{modes}{stage}</div><div class="rcol">{res}</div></main>'
    elif did == "d5":
        body = f'<div class="shell"><aside class="rail"><img class="glyph" src="../icons/{did}-glyph.svg" alt="bkt" width="40" height="40">{modes}</aside><div><header class="top">{brand}{search}{nav}</header><main class="app">{res}{stage}</main></div></div>'
    elif did == "d7":
        body = f'<header class="top">{brand}{nav}</header><main class="app"><div class="lcol"><p class="prop-n"><span lang="grc">Ζήτησις</span> · Search</p>{search}{modes}<div class="rcol">{res}</div></div><div class="figcol">{stage}</div></main>'
    else:
        body = f'<header class="top">{brand}{nav}</header><main class="app"><div class="panel"><div class="screen">{stage}</div><div class="screen">{search}{res}</div></div><div class="keys">{modes}<div class="knob" aria-hidden="true"></div></div></main>'
    title = f'bkt {d["name"]} search' + ("" if state == "full" else f" {state}")
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<link rel="stylesheet" href="{fonts}">
<style>{css_tokens}{base}{CSS[did]}</style></head><body>{body}</body></html>'''


if __name__ == "__main__":
    for d in D:
        print(d["id"], checks(d))
        for st, suf in (("full", "search"), ("empty", "search-empty"), ("loading", "search-loading")):
            open(f"{OUT}/{d['id']}-{suf}.html", "w").write(__import__("made_d34").inject(d["id"], __import__("made56").post(d["id"], suf, __import__("made12").enforce(d["id"], page(d, st), 1), "../"), ".."))
