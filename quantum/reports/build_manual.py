#!/usr/bin/env python3
"""
Build the Quantum Operating Manual — one self-contained HTML file from all node
cards. Mirrors the health manual's build pattern. Idempotent: re-run any time.

    python3 reports/build_manual.py

Output: reports/manual.html  (self-contained, inline CSS, theme-aware)
"""
import os, re, glob, html, datetime
import markdown
import render_math  # sibling module in reports/

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CHAPTERS = [
    ("01-foundations",          "§01 · Foundations",            "The physics that makes any of this possible — superposition, entanglement, decoherence, quantum information."),
    ("02-hardware",             "§02 · Hardware",               "Every qubit modality and the machines around them — superconducting, ions, photonics, neutral atoms, silicon, topological, and the supply chain."),
    ("03-stack-algorithms",     "§03 · Stack & Algorithms",     "From a noisy qubit to a useful answer — error correction, compilers, Shor/Grover/VQE, benchmarks, and the honest speedup accounting."),
    ("04-adjacent-tech",        "§04 · Adjacent Technologies",  "Quantum that isn't computing — QKD, the quantum internet, post-quantum crypto, sensing, metrology, imaging."),
    ("05-industries",           "§05 · Industries",             "Where quantum actually lands — 21 industries from finance and pharma to air-traffic management, with proven results separated from promise."),
    ("06-ecosystem-geopolitics","§06 · Ecosystem & Geopolitics","National programs, money, standards, talent, patents, export controls — and the numbers, graded for inflation."),
    ("07-history",              "§07 · History",                "The full arc, 1900 → today — from Planck's quantum to below-threshold error correction."),
    ("08-frontier-open",        "§08 · The Honest Frontier",    "What's unsettled — fault-tolerant scaling, hype vs reality, the killer-app question, the measurement problem."),
]

MD = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "toc"])

# math counters (module-wide, for a build summary)
_MATH = {"ok": 0, "fail": 0}

def _protect_math(text):
    """Render $...$, $$...$$, \\ce{} to SVG and stash behind placeholders so
    markdown never sees the SVG markup. Returns (protected_text, {token: svg})."""
    store = {}
    n = [0]
    def stash(svg, block):
        t = f"\x00MATH{n[0]}\x00"; n[0] += 1
        cls = "math-block" if block else "math-span"
        store[t] = f'<span class="{cls}">{svg}</span>'
        return t
    def disp(m):
        svg = render_math.render_snippet(m.group(1), display=True)
        if svg: _MATH["ok"] += 1; return stash(svg, True)
        _MATH["fail"] += 1; return m.group(0)
    def ce(m):
        svg = render_math.render_snippet(r"\ce{%s}" % m.group(1), display=False)
        if svg: _MATH["ok"] += 1; return stash(svg, False)
        _MATH["fail"] += 1; return m.group(0)
    def _is_math(s):
        # guard against currency ($12.6B ... to $) being read as inline math:
        # real inline math is a short token or contains a LaTeX control char.
        s = s.strip()
        if not s:
            return False
        if len(s) <= 3:
            return True
        return bool(re.search(r"[\\^_{}]", s))
    def inl(m):
        if not _is_math(m.group(1)):
            return m.group(0)          # leave currency/prose $...$ as literal text
        svg = render_math.render_snippet(m.group(1), display=False)
        if svg: _MATH["ok"] += 1; return stash(svg, False)
        _MATH["fail"] += 1; return m.group(0)
    text = render_math.RE_DISPLAY.sub(disp, text)
    text = render_math.RE_CE.sub(ce, text)
    text = render_math.RE_INLINE.sub(inl, text)
    return text, store

def render(path):
    MD.reset()
    with open(path, encoding="utf-8") as f:
        text = f.read()
    text, store = _protect_math(text)
    out = MD.convert(text)
    for tok, svg in store.items():
        out = out.replace(tok, svg)
    return out

def anchor(node_id):
    return "node-" + re.sub(r"[^a-zA-Z0-9-]", "", node_id)

def card_id_from_filename(p):
    return os.path.splitext(os.path.basename(p))[0]

def build():
    parts = []
    toc = []
    total = 0
    for folder, title, blurb in CHAPTERS:
        d = os.path.join(ROOT, folder)
        cards = sorted(glob.glob(os.path.join(d, "*.md")))
        if not cards:
            continue
        cid = folder
        toc.append((title, cid, len(cards)))
        parts.append(f'<section class="chapter" id="{cid}">')
        parts.append(f'<h1>{html.escape(title)}</h1>')
        parts.append(f'<p class="blurb">{html.escape(blurb)}</p>')
        for c in cards:
            nid = card_id_from_filename(c)
            parts.append(f'<article class="card" id="{anchor(nid)}">')
            parts.append(render(c))
            parts.append('</article>')
            total += 1
        parts.append('</section>')

    # front matter: the map + capacity
    map_html = render(os.path.join(ROOT, "00-map", "00-IDEAL-STATE-MAP.md"))
    cap_html = render(os.path.join(ROOT, "00-map", "NETWORK-CAPACITY.md"))
    schema_html = render(os.path.join(ROOT, "evidence", "SCHEMA.md"))
    conflicts_path = os.path.join(ROOT, "evidence", "CONFLICTS.md")
    conflicts_html = render(conflicts_path) if os.path.exists(conflicts_path) else ""

    toc_html = ['<nav class="toc"><h2>Contents</h2><ol>']
    toc_html.append('<li><a href="#map">The Full Map</a></li>')
    for title, cid, n in toc:
        toc_html.append(f'<li><a href="#{cid}">{html.escape(title)}</a> <span class="n">{n}</span></li>')
    toc_html.append('<li><a href="#evidence">How claims are graded</a></li>')
    toc_html.append('<li><a href="#conflicts">Conflict register</a></li>')
    toc_html.append('</ol></nav>')

    built = datetime.date.today().isoformat()
    body = f"""
<header class="hero">
  <div class="kicker">Bucket Foundation · physics branch (§02-physics)</div>
  <h1 class="title">The Quantum Operating Manual</h1>
  <p class="sub">All of quantum — the physics, the machines, the algorithms, every industry,
  the money, the history, and the honest frontier — {total} graded node cards on one substrate.</p>
  <p class="meta">Built {built} · Index all, exclude nothing, grade everything ·
  a vendor press release and a peer-reviewed threshold demo do not weigh the same,
  and this manual always says which is which.</p>
</header>
{''.join(toc_html)}
<section class="chapter" id="map"><h1>The Full Map</h1>{map_html}<hr>{cap_html}</section>
{''.join(parts)}
<section class="chapter" id="evidence"><h1>Appendix · How every claim is graded</h1>{schema_html}</section>
<section class="chapter" id="conflicts"><h1>Appendix · Conflict register</h1>{conflicts_html}</section>
<footer><p>Quantum Operating Manual · Bucket Foundation · {built}. Not investment advice.
Every timeline attributed to a vendor is marketing until a peer reviews it.</p></footer>
"""

    css = """
:root{
  --bg:#faf9f6;--fg:#16181d;--mut:#5c6069;--line:#e4e2db;
  --acc:#0e8ea0;--acc-soft:#e2f1f3;--amber:#b5741a;
  --card:#fffffe;--code:#f1efe9;
  --serif:Charter,"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
}
@media(prefers-color-scheme:dark){:root{
  --bg:#0c0e13;--fg:#e7e9ee;--mut:#9aa1ad;--line:#232733;
  --acc:#38c6d8;--acc-soft:#12262b;--amber:#e0a24e;
  --card:#13161d;--code:#181c25;
}}
:root[data-theme=light]{
  --bg:#faf9f6;--fg:#16181d;--mut:#5c6069;--line:#e4e2db;
  --acc:#0e8ea0;--acc-soft:#e2f1f3;--amber:#b5741a;--card:#fffffe;--code:#f1efe9;
}
:root[data-theme=dark]{
  --bg:#0c0e13;--fg:#e7e9ee;--mut:#9aa1ad;--line:#232733;
  --acc:#38c6d8;--acc-soft:#12262b;--amber:#e0a24e;--card:#13161d;--code:#181c25;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
  font:16.5px/1.65 var(--sans);font-variant-numeric:tabular-nums;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:2.4rem 1.3rem 7rem}
h1,h2,h3{line-height:1.2;text-wrap:balance}
a{color:var(--acc);text-underline-offset:2px}

/* hero — quiet, not a gigantic gradient */
.hero{padding-bottom:1.8rem;margin-bottom:2.2rem;border-bottom:1px solid var(--line)}
.kicker{color:var(--acc);font-family:var(--mono);font-size:.74rem;
  letter-spacing:.12em;text-transform:uppercase}
.title{font-family:var(--serif);font-weight:600;font-size:2.7rem;
  line-height:1.05;letter-spacing:-.01em;margin:.6rem 0 .5rem}
.sub{font-size:1.16rem;color:var(--fg);max-width:60ch}
.meta{color:var(--mut);font-size:.9rem;max-width:62ch}

/* table of contents */
.toc{background:var(--card);border:1px solid var(--line);border-radius:10px;
  padding:1.2rem 1.5rem;margin-bottom:3rem}
.toc h2{margin:.1rem 0 .8rem;font-family:var(--mono);font-size:.74rem;
  letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.toc ol{margin:0;padding:0;list-style:none;
  display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.15rem .9rem;counter-reset:c}
.toc li{margin:.28rem 0}
.toc a{color:var(--fg);text-decoration:none;border-bottom:1px solid transparent}
.toc a:hover{border-bottom-color:var(--acc);color:var(--acc)}
.toc .n{color:var(--mut);font-family:var(--mono);font-size:.76rem}

/* chapters + cards */
.chapter{margin:3.6rem 0;scroll-margin-top:1rem}
.chapter>h1{font-family:var(--serif);font-weight:600;font-size:2rem;
  margin:0 0 .2rem;padding-bottom:.35rem;position:relative}
.chapter>h1::after{content:"";position:absolute;left:0;bottom:0;
  width:3.2rem;height:2px;background:var(--acc)}
.blurb{color:var(--mut);font-size:1.05rem;margin:.5rem 0 1.2rem;max-width:62ch}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;
  padding:1.3rem 1.5rem;margin:1.4rem 0;scroll-margin-top:1rem}
.card h1{font-family:var(--serif);font-weight:600;font-size:1.32rem;margin:.1rem 0 .7rem}
.card h1 code{font-family:var(--mono);font-size:.68em;color:var(--acc);
  background:var(--acc-soft);font-weight:400}
.card h2{font-family:var(--mono);font-size:.76rem;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;color:var(--acc);margin:1.2rem 0 .35rem}
.card p:first-of-type{margin-top:.2rem}
p{margin:.55rem 0}
strong{color:var(--fg)}
code{font-family:var(--mono);background:var(--code);padding:.08rem .35rem;
  border-radius:4px;font-size:.88em}
pre{background:var(--code);padding:1rem;border-radius:8px;overflow-x:auto;
  border:1px solid var(--line)}
pre code{background:none;padding:0}
hr{border:none;border-top:1px solid var(--line);margin:1.8rem 0}
table{border-collapse:collapse;width:100%;margin:.9rem 0;font-size:.9rem;
  display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:.45rem .65rem;text-align:left;vertical-align:top}
th{background:var(--code);font-family:var(--mono);font-size:.78rem;
  letter-spacing:.03em;font-weight:600;white-space:nowrap}
td code{color:var(--acc)}
blockquote{border-left:2px solid var(--amber);margin:.9rem 0;padding:.15rem 1rem;color:var(--mut)}
footer{margin-top:4.5rem;border-top:1px solid var(--line);padding-top:1.3rem;
  color:var(--mut);font-size:.85rem}
::selection{background:var(--acc-soft)}
a:focus-visible,.toc a:focus-visible{outline:2px solid var(--acc);outline-offset:2px;border-radius:2px}
/* rendered math (LaTeX/mhchem -> SVG) */
.math-span{display:inline-block;vertical-align:-0.28em;margin:0 .12em}
.math-span svg{height:1.05em;width:auto}
.math-block{display:block;text-align:center;margin:1rem 0;overflow-x:auto}
.math-block svg{max-width:100%;height:auto}
@media(prefers-color-scheme:dark){.math-span svg,.math-block svg{filter:invert(92%) hue-rotate(180deg)}}
:root[data-theme=dark] .math-span svg,:root[data-theme=dark] .math-block svg{filter:invert(92%) hue-rotate(180deg)}
:root[data-theme=light] .math-span svg,:root[data-theme=light] .math-block svg{filter:none}
.math-raw{color:var(--amber)}
"""
    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Quantum Operating Manual</title><style>{css}</style></head>
<body><div class="wrap">{body}</div></body></html>"""

    out = os.path.join(ROOT, "reports", "manual.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"wrote {out}  ({total} cards, {len(doc)//1024} KB, "
          f"math rendered {_MATH['ok']} ok / {_MATH['fail']} fail)")
    return out

if __name__ == "__main__":
    build()
