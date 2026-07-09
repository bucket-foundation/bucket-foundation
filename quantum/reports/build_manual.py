#!/usr/bin/env python3
"""
Build "The Quantum Atlas" — one self-contained HTML book from the narrative
chapters (<folder>/_CHAPTER.md), the map, the node cards (reference index), and
the book apparatus (preface, glossary, auto-index, appendices). Idempotent.

    python3 reports/build_manual.py     -> reports/manual.html

Chapters carry inline SVG math/figures already (markdown passes raw HTML through).
Node cards still use $...$ math, rendered to SVG via render_math.
"""
import os, re, glob, html, datetime
import markdown
import render_math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (folder, chapter number, chapter title)
CHAPTERS = [
    ("01-foundations",           "1", "The Physics"),
    ("02-hardware",              "2", "The Machines"),
    ("03-stack-algorithms",      "3", "From Qubit to Answer"),
    ("04-adjacent-tech",         "4", "Beyond Computing"),
    ("05-industries",            "5", "The Industry Map"),
    ("06-ecosystem-geopolitics", "6", "Money, Nations, and Standards"),
    ("07-history",               "7", "How We Got Here"),
    ("08-frontier-open",         "8", "The Honest Frontier"),
]

MD = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "toc"])
_MATH = {"ok": 0, "fail": 0}

def _protect_math(text):
    store = {}; n = [0]
    def stash(svg, block):
        t = f"\x00MATH{n[0]}\x00"; n[0] += 1
        store[t] = f'<span class="{"math-block" if block else "math-span"}">{svg}</span>'
        return t
    def disp(m):
        svg = render_math.render_snippet(m.group(1), display=True)
        if svg: _MATH["ok"] += 1; return stash(svg, True)
        _MATH["fail"] += 1; return m.group(0)
    def ce(m):
        svg = render_math.render_snippet(r"\ce{%s}" % m.group(1), display=False)
        if svg: _MATH["ok"] += 1; return stash(svg, False)
        _MATH["fail"] += 1; return m.group(0)
    def is_math(s):
        s = s.strip()
        return bool(s) and (len(s) <= 3 or re.search(r"[\\^_{}]", s))
    def inl(m):
        if not is_math(m.group(1)): return m.group(0)
        svg = render_math.render_snippet(m.group(1), display=False)
        if svg: _MATH["ok"] += 1; return stash(svg, False)
        _MATH["fail"] += 1; return m.group(0)
    text = render_math.RE_DISPLAY.sub(disp, text)
    text = render_math.RE_CE.sub(ce, text)
    text = render_math.RE_INLINE.sub(inl, text)
    return text, store

def render_text(text):
    MD.reset()
    text, store = _protect_math(text)
    out = MD.convert(text)
    for tok, svg in store.items():
        out = out.replace(tok, svg)
    return out

def render(path):
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as f:
        return render_text(f.read())

def anchor(node_id):
    return "node-" + re.sub(r"[^a-zA-Z0-9-]", "", node_id)

def card_id(p):
    return os.path.splitext(os.path.basename(p))[0]

def card_title(p):
    with open(p, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                return re.sub(r"·.*$", "", line.lstrip("# ").strip()).strip()
    return card_id(p)

FIGDIR = os.path.join(ROOT, "media", "figures")
def _svg(path):
    if not os.path.exists(path): return None
    s = open(path, encoding="utf-8").read()
    s = re.sub(r"<\?xml[^>]*\?>", "", s); s = re.sub(r"<!DOCTYPE[^>]*>", "", s, flags=re.S)
    return s.strip()

def solo_figure(name, caption):
    s = _svg(os.path.join(FIGDIR, f"{name}.svg"))
    if not s: return ""
    return (f'<figure class="figblock figsolo">{s}'
            f'<figcaption class="fig-cap">{html.escape(caption)}</figcaption></figure>')

def _strip_lead_heading(md):
    lines = md.lstrip().split("\n")
    if lines and lines[0].lstrip().startswith("#"):
        lines = lines[1:]
    return "\n".join(lines).lstrip()

def build():
    chapters_html = []; refs_html = []; toc = []; index_entries = []; total = 0

    for folder, num, title in CHAPTERS:
        d = os.path.join(ROOT, folder)
        cards = [c for c in sorted(glob.glob(os.path.join(d, "*.md")))
                 if os.path.basename(c) != "_CHAPTER.md"]
        cid = folder
        toc.append((num, title, cid, len(cards)))

        chapters_html.append(f'<section class="chapter" id="{cid}">')
        chapters_html.append(f'<div class="chnum">Chapter {num}</div><h1>{html.escape(title)}</h1>')
        chap = os.path.join(d, "_CHAPTER.md")
        if os.path.exists(chap):
            with open(chap, encoding="utf-8") as f:
                chapters_html.append(f'<div class="narrative">{render_text(_strip_lead_heading(f.read()))}</div>')
        chapters_html.append(f'<p class="refptr">The {len(cards)} graded source nodes behind '
                             f'this chapter are in the <a href="#ref-{cid}">reference index</a>.</p>')
        chapters_html.append('</section>')

        refs_html.append(f'<section class="refchapter" id="ref-{cid}">')
        refs_html.append(f'<h2>Chapter {num} · {html.escape(title)} — source nodes</h2>')
        for c in cards:
            nid = card_id(c); a = anchor(nid)
            index_entries.append((card_title(c), nid, a))
            refs_html.append(f'<article class="refcard" id="{a}">{render(c)}</article>')
            total += 1
        refs_html.append('</section>')

    preface_html   = render(os.path.join(ROOT, "00-map", "_PREFACE.md"))
    map_html       = render(os.path.join(ROOT, "00-map", "00-IDEAL-STATE-MAP.md"))
    cap_html       = render(os.path.join(ROOT, "00-map", "NETWORK-CAPACITY.md"))
    schema_html    = render(os.path.join(ROOT, "evidence", "SCHEMA.md"))
    conflicts_html = render(os.path.join(ROOT, "evidence", "CONFLICTS.md"))
    sweep_html     = render(os.path.join(ROOT, "_science-jobs", "S4-arxiv-sweep", "arxiv_sweep_S4.md"))
    glossary_html  = render(os.path.join(ROOT, "evidence", "GLOSSARY.md"))
    primer_html    = render(os.path.join(ROOT, "evidence", "MATH-PRIMER.md"))
    lab_html       = render(os.path.join(ROOT, "evidence", "LAB-TRACK.md"))

    # auto topic index: node titles A–Z -> reference cards
    idx = ['<div class="indexcols">']
    for t, nid, a in sorted(index_entries, key=lambda x: x[0].lower()):
        idx.append(f'<div class="idxrow"><a href="#{a}">{html.escape(t)}</a> '
                   f'<code>{html.escape(nid)}</code></div>')
    idx.append('</div>')
    index_html = "\n".join(idx)

    # book table of contents
    toc_html = ['<nav class="toc"><h2>Contents</h2><ol>']
    if preface_html: toc_html.append('<li><a href="#preface">Preface — how to read this atlas</a></li>')
    toc_html.append('<li><a href="#map">The Map — orientation</a></li>')
    for num, title, cid, n in toc:
        toc_html.append(f'<li><a href="#{cid}"><b>{num}.</b> {html.escape(title)}</a></li>')
    toc_html.append('<li class="toc-appx">Appendices</li>')
    toc_html.append('<li><a href="#evidence">A · How every claim is graded</a></li>')
    toc_html.append('<li><a href="#conflicts">B · Conflict register</a></li>')
    toc_html.append('<li><a href="#sweep">C · Recent preprint evidence</a></li>')
    if glossary_html: toc_html.append('<li><a href="#glossary">D · Glossary</a></li>')
    if primer_html: toc_html.append('<li><a href="#primer">E · Math primer</a></li>')
    if lab_html: toc_html.append('<li><a href="#labs">F · Lab track</a></li>')
    toc_html.append(f'<li><a href="#refindex">G · Node reference index ({total})</a></li>')
    toc_html.append('<li><a href="#index">H · Index of topics</a></li>')
    toc_html.append('</ol></nav>')

    built = datetime.date.today().isoformat()
    pref_section = (f'<section class="chapter" id="preface"><div class="chnum">Front matter</div>'
                    f'<h1>Preface</h1><div class="narrative">{preface_html}</div></section>'
                    if preface_html else "")
    gloss_section = (f'<section class="chapter" id="glossary"><div class="chnum">Appendix D</div>'
                     f'<h1>Glossary</h1><div class="narrative glossary">{glossary_html}</div></section>'
                     if glossary_html else "")
    primer_section = (f'<section class="chapter" id="primer"><div class="chnum">Appendix E</div>'
                      f'<h1>Math primer</h1><div class="narrative">{primer_html}</div></section>'
                      if primer_html else "")
    lab_section = (f'<section class="chapter" id="labs"><div class="chnum">Appendix F</div>'
                   f'<h1>Lab track</h1><div class="narrative">{lab_html}</div></section>'
                   if lab_html else "")
    body = f"""
<header class="hero">
  <div class="kicker">Bucket Foundation · physics branch</div>
  <h1 class="title">The Quantum Atlas</h1>
  <p class="sub">A research-and-industry map of the whole field — the physics, the machines,
  the algorithms, every industry, the money, the history, and the honest frontier.</p>
  <p class="meta">Built {built} · Read it as a map and a textbook. Every claim is graded;
  a vendor press release and a peer-reviewed threshold demo do not weigh the same, and this
  atlas always says which is which. The {total} graded source nodes sit in the reference index.</p>
</header>
{''.join(toc_html)}
{pref_section}
<section class="chapter" id="map"><div class="chnum">Orientation</div><h1>The Map</h1>
{solo_figure("coverage-by-layer", "The territory — 184 source nodes across 8 layers.")}
{map_html}<hr>{cap_html}</section>
{''.join(chapters_html)}
<section class="chapter" id="evidence"><div class="chnum">Appendix A</div><h1>How every claim is graded</h1><div class="narrative">{schema_html}</div></section>
<section class="chapter" id="conflicts"><div class="chnum">Appendix B</div><h1>Conflict register</h1><div class="narrative">{conflicts_html}</div></section>
<section class="chapter" id="sweep"><div class="chnum">Appendix C</div><h1>Recent preprint evidence (arXiv sweep)</h1><div class="narrative">{sweep_html}</div></section>
{gloss_section}
{primer_section}
{lab_section}
<section class="chapter" id="refindex"><div class="chnum">Appendix G</div><h1>Node reference index</h1>
<p class="blurb">The {total} graded source nodes behind the chapters — the raw knowledge base.</p>
{''.join(refs_html)}</section>
<section class="chapter" id="index"><div class="chnum">Appendix H</div><h1>Index of topics</h1>{index_html}</section>
<footer><p>The Quantum Atlas · Bucket Foundation · {built}. Not investment advice.
Every timeline attributed to a vendor is marketing until a peer reviews it.</p></footer>
"""

    css = _CSS
    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Quantum Atlas</title><style>{css}</style></head>
<body><div class="wrap">{body}</div></body></html>"""
    out = os.path.join(ROOT, "reports", "manual.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"wrote {out}  ({total} nodes, {len(doc)//1024} KB, math {_MATH['ok']} ok/{_MATH['fail']} fail)")
    return out

_CSS = """
:root{--bg:#faf9f6;--fg:#16181d;--mut:#5c6069;--line:#e4e2db;--acc:#0e8ea0;--acc-soft:#e2f1f3;--amber:#b5741a;--code:#f1efe9;
--serif:Charter,"Iowan Old Style",Palatino,Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media(prefers-color-scheme:dark){:root{--bg:#0c0e13;--fg:#e7e9ee;--mut:#9aa1ad;--line:#232733;--acc:#38c6d8;--acc-soft:#12262b;--amber:#e0a24e;--code:#181c25}}
:root[data-theme=light]{--bg:#faf9f6;--fg:#16181d;--mut:#5c6069;--line:#e4e2db;--acc:#0e8ea0;--acc-soft:#e2f1f3;--amber:#b5741a;--code:#f1efe9}
:root[data-theme=dark]{--bg:#0c0e13;--fg:#e7e9ee;--mut:#9aa1ad;--line:#232733;--acc:#38c6d8;--acc-soft:#12262b;--amber:#e0a24e;--code:#181c25}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16.5px/1.65 var(--sans);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:2.4rem 1.3rem 7rem}
h1,h2,h3{line-height:1.2;text-wrap:balance}
a{color:var(--acc);text-underline-offset:2px}
.hero{padding-bottom:1.8rem;margin-bottom:1.6rem;border-bottom:2px solid var(--line)}
.kicker{color:var(--acc);font-family:var(--mono);font-size:.74rem;letter-spacing:.12em;text-transform:uppercase}
.title{font-family:var(--serif);font-weight:600;font-size:2.7rem;line-height:1.05;letter-spacing:-.01em;margin:.6rem 0 .5rem}
.sub{font-size:1.16rem;max-width:60ch}
.meta{color:var(--mut);font-size:.9rem;max-width:62ch}
.toc{background:var(--code);border:1px solid var(--line);border-radius:10px;padding:1.2rem 1.5rem;margin-bottom:3rem}
.toc h2{margin:.1rem 0 .8rem;font-family:var(--mono);font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.toc ol{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.15rem .9rem}
.toc li{margin:.28rem 0}
.toc a{color:var(--fg);text-decoration:none;border-bottom:1px solid transparent}
.toc a:hover{border-bottom-color:var(--acc);color:var(--acc)}
.toc-appx{font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-top:.6rem;grid-column:1/-1}
.chapter{margin:3.6rem 0;scroll-margin-top:1rem}
.chnum{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);margin-bottom:.15rem}
.chapter>h1{font-family:var(--serif);font-weight:600;font-size:2rem;margin:0 0 .2rem;padding-bottom:.35rem;position:relative}
.chapter>h1::after{content:"";position:absolute;left:0;bottom:0;width:3.2rem;height:2px;background:var(--acc)}
.blurb{color:var(--mut);font-size:1.05rem;margin:.5rem 0 1.2rem;max-width:62ch}
.narrative{font-size:1.06rem;line-height:1.72;max-width:70ch}
.narrative h2{font-family:var(--serif);font-weight:600;font-size:1.5rem;margin:2.4rem 0 .5rem}
.narrative h3{font-family:var(--serif);font-weight:600;font-size:1.18rem;margin:1.7rem 0 .3rem}
.narrative h4{font-size:1.02rem;margin:1.2rem 0 .2rem;font-weight:600}
.narrative p{margin:.85rem 0}
.narrative ul,.narrative ol{margin:.7rem 0;padding-left:1.3rem}.narrative li{margin:.3rem 0}
.narrative blockquote{border-left:2px solid var(--amber);margin:1rem 0;padding:.2rem 1.1rem;color:var(--mut);font-size:.97em}
.narrative strong{color:var(--fg)}
.narrative table,.refcard table{border-collapse:collapse;width:100%;margin:.9rem 0;font-size:.9rem;display:block;overflow-x:auto}
.narrative th,.narrative td,.refcard th,.refcard td{border:1px solid var(--line);padding:.4rem .6rem;text-align:left;vertical-align:top}
th{background:var(--code);font-family:var(--mono);font-size:.8rem}
.refptr{font-family:var(--mono);font-size:.76rem;color:var(--mut);margin-top:1.6rem;border-top:1px solid var(--line);padding-top:.6rem}
.glossary p{margin:.4rem 0}
.figblock{margin:1.6rem 0;overflow-x:auto}
.figblock svg{max-width:100%;height:auto;display:block;margin:0 auto}
.fig-cap{font-family:var(--mono);font-size:.74rem;color:var(--mut);text-align:center;margin-top:.5rem;max-width:60ch;margin-left:auto;margin-right:auto}
.figsolo{background:#faf9f6;border:1px solid var(--line);border-radius:8px;padding:.7rem}
.math-span{display:inline-block;vertical-align:-0.28em;margin:0 .12em}
.math-span svg{height:1.05em;width:auto}
.math-block{display:block;text-align:center;margin:1rem 0;overflow-x:auto}
.math-block svg{max-width:100%;height:auto}
@media(prefers-color-scheme:dark){.math-span svg,.math-block svg{filter:invert(92%) hue-rotate(180deg)}}
:root[data-theme=dark] .math-span svg,:root[data-theme=dark] .math-block svg{filter:invert(92%) hue-rotate(180deg)}
:root[data-theme=light] .math-span svg,:root[data-theme=light] .math-block svg{filter:none}
code{font-family:var(--mono);background:var(--code);padding:.08rem .35rem;border-radius:4px;font-size:.88em}
pre{background:var(--code);padding:1rem;border-radius:8px;overflow-x:auto;border:1px solid var(--line)}
pre code{background:none;padding:0}
hr{border:none;border-top:1px solid var(--line);margin:1.8rem 0}
.refchapter{margin:2rem 0}
.refchapter>h2{font-family:var(--serif);font-size:1.15rem;color:var(--mut);border-bottom:1px solid var(--line);padding-bottom:.25rem}
.refcard{font-size:.9rem;border-top:1px solid var(--line);padding:.5rem 0;margin:.6rem 0 0}
.refcard h1{font-size:1.02rem;font-family:var(--serif);margin:.2rem 0 .4rem}
.refcard h1 code{font-size:.7em;color:var(--acc);background:var(--acc-soft)}
.refcard h2{font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--acc);margin:.7rem 0 .2rem}
#refindex,#index{margin-top:4rem;border-top:2px solid var(--acc)}
.indexcols{column-count:2;column-gap:2rem;font-size:.9rem}
.idxrow{break-inside:avoid;margin:.15rem 0;display:flex;justify-content:space-between;gap:.5rem;border-bottom:1px dotted var(--line);padding-bottom:.1rem}
.idxrow code{background:none;color:var(--mut);font-size:.8em}
footer{margin-top:4.5rem;border-top:1px solid var(--line);padding-top:1.3rem;color:var(--mut);font-size:.85rem}
::selection{background:var(--acc-soft)}
"""

if __name__ == "__main__":
    build()
