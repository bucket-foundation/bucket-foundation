#!/usr/bin/env python3
"""
Build "The Quantum Atlas" as a print book — styled to match the Longevity & Fitness
Operating Manual: warm cream/gold, serif body + sans headings, dark cover, Parts with
divider pages, a real TOC with leader dots + page numbers (WeasyPrint target-counter),
running heads. One self-contained HTML; build_pdf.py runs WeasyPrint over it.

    python3 reports/build_manual.py     -> reports/manual.html
"""
import os, re, glob, html, datetime
import markdown
import render_math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# chapter folder -> (number, title)
CH = {
    "01-foundations":           ("1", "The Physics"),
    "02-hardware":              ("2", "The Machines"),
    "03-stack-algorithms":      ("3", "From Qubit to Answer"),
    "04-adjacent-tech":         ("4", "Beyond Computing"),
    "05-industries":            ("5", "The Industry Map"),
    "06-ecosystem-geopolitics": ("6", "Money, Nations, and Standards"),
    "07-history":               ("7", "How We Got Here"),
    "08-frontier-open":         ("8", "The Honest Frontier"),
}
# Parts group the chapters (roman, title, [folders])
PARTS = [
    ("I",   "The Physics and the Machines", ["01-foundations", "02-hardware"]),
    ("II",  "From Qubit to Answer",         ["03-stack-algorithms", "04-adjacent-tech"]),
    ("III", "The World It Enters",          ["05-industries", "06-ecosystem-geopolitics"]),
    ("IV",  "Time and the Frontier",        ["07-history", "08-frontier-open"]),
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
        if "\\mathdefault" in s:      # matplotlib axis-label artifact inside figure SVGs
            return False
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
    if not os.path.exists(path): return ""
    with open(path, encoding="utf-8") as f:
        return render_text(f.read())

def render_strip(path):
    """Render but drop the file's own leading '# Title' (we supply the section title)."""
    if not os.path.exists(path): return ""
    with open(path, encoding="utf-8") as f:
        return render_text(_strip_lead_heading(f.read()))

def anchor(nid): return "node-" + re.sub(r"[^a-zA-Z0-9-]", "", nid)
def card_id(p):  return os.path.splitext(os.path.basename(p))[0]
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
    return (f'<figure class="figin"><div class="figsvg">{s}</div>'
            f'<figcaption>{html.escape(caption)}</figcaption></figure>')

def _strip_lead_heading(md):
    lines = md.lstrip().split("\n")
    if lines and lines[0].lstrip().startswith("#"): lines = lines[1:]
    return "\n".join(lines).lstrip()

def chapter_section(folder):
    num, title = CH[folder]
    part = next(p for p in PARTS if folder in p[2])
    kicker = f"Part {part[0]} · {part[1]}"
    d = os.path.join(ROOT, folder)
    chap = os.path.join(d, "_CHAPTER.md")
    body = ""
    if os.path.exists(chap):
        with open(chap, encoding="utf-8") as f:
            body = render_text(_strip_lead_heading(f.read()))
    return (f'<section class="chapter" id="{folder}">'
            f'<div class="ch-kicker">{html.escape(kicker)}</div>'
            f'<h1 class="ch-title"><span class="ch-no">{num}</span>{html.escape(title)}</h1>'
            f'<div class="narrative">{body}</div></section>')

def build():
    total = 0
    index_entries = []
    refs_html = []
    for folder in CH:
        for c in [c for c in sorted(glob.glob(os.path.join(ROOT, folder, "*.md")))
                  if os.path.basename(c) != "_CHAPTER.md"]:
            index_entries.append((card_title(c), card_id(c), anchor(card_id(c))))
            total += 1

    # front matter + appendices (strip each file's own leading '# Title')
    preface  = render_strip(os.path.join(ROOT, "00-map", "_PREFACE.md"))
    mapmd    = render_strip(os.path.join(ROOT, "00-map", "00-IDEAL-STATE-MAP.md"))
    capmd    = render_strip(os.path.join(ROOT, "00-map", "NETWORK-CAPACITY.md"))
    schema   = render_strip(os.path.join(ROOT, "evidence", "SCHEMA.md"))
    conflicts= render_strip(os.path.join(ROOT, "evidence", "CONFLICTS.md"))
    sweep    = render_strip(os.path.join(ROOT, "_science-jobs", "S4-arxiv-sweep", "arxiv_sweep_S4.md"))
    glossary = render_strip(os.path.join(ROOT, "evidence", "GLOSSARY.md"))
    primer   = render_strip(os.path.join(ROOT, "evidence", "MATH-PRIMER.md"))
    lab      = render_strip(os.path.join(ROOT, "evidence", "LAB-TRACK.md"))

    # reference index (compact node cards)
    for folder in CH:
        num, title = CH[folder]
        cards = [c for c in sorted(glob.glob(os.path.join(ROOT, folder, "*.md")))
                 if os.path.basename(c) != "_CHAPTER.md"]
        refs_html.append(f'<h2 class="refgroup">Chapter {num} · {html.escape(title)}</h2>')
        for c in cards:
            refs_html.append(f'<article class="refcard" id="{anchor(card_id(c))}">{render(c)}</article>')

    # ---- TOC (parts + chapters + appendices, leader dots + page numbers in PDF) ----
    t = ['<nav class="toc" id="contents"><h1>Contents</h1>']
    t.append('<div class="toc-front"><a href="#preface">Preface</a></div>')
    t.append('<div class="toc-front"><a href="#map">The Map</a></div>')
    for roman, ptitle, folders in PARTS:
        t.append(f'<div class="toc-part"><span class="tp-n">Part {roman}</span> {html.escape(ptitle)}</div>')
        for folder in folders:
            num, title = CH[folder]
            t.append(f'<div class="toc-chap"><a href="#{folder}">'
                     f'<span class="tc-n">{num}</span> {html.escape(title)}</a></div>')
    t.append('<div class="toc-part"><span class="tp-n">Appendices</span></div>')
    apx = [("evidence","A · How every claim is graded"),("conflicts","B · Conflict register"),
           ("sweep","C · Recent preprint evidence"),("glossary","D · Glossary"),
           ("primer","E · Math primer"),("labs","F · Lab track"),
           ("refindex",f"G · Node reference index ({total})"),("index","H · Index of topics")]
    for aid, lbl in apx:
        t.append(f'<div class="toc-chap"><a href="#{aid}">{html.escape(lbl)}</a></div>')
    t.append('</nav>')
    toc_html = "".join(t)

    # ---- body: parts with divider pages + chapters ----
    parts_html = []
    for roman, ptitle, folders in PARTS:
        parts_html.append(f'<section class="partdiv"><div class="pd-n">Part {roman}</div>'
                          f'<div class="pd-t">{html.escape(ptitle)}</div></section>')
        for folder in folders:
            parts_html.append(chapter_section(folder))

    built = datetime.date.today().isoformat()
    idx = ['<div class="indexcols">']
    for ti, nid, a in sorted(index_entries, key=lambda x: x[0].lower()):
        idx.append(f'<div class="idxrow"><a href="#{a}">{html.escape(ti)}</a> <code>{html.escape(nid)}</code></div>')
    idx.append('</div>')
    index_html = "".join(idx)

    def apx_sec(aid, kicker, title, bodyhtml, cls="narrative"):
        return (f'<section class="chapter appendix" id="{aid}">'
                f'<div class="ch-kicker">{html.escape(kicker)}</div>'
                f'<h1 class="ch-title">{html.escape(title)}</h1>'
                f'<div class="{cls}">{bodyhtml}</div></section>')

    body = f"""
<div class="cover">
  <div class="kick">Bucket Foundation · Nucleus Brain · physics branch</div>
  <h1>The Quantum Atlas</h1>
  <div class="sub">A graded research-and-industry map of the whole field — the physics, the machines,
  the algorithms, every industry, the money, the history, and the honest frontier.</div>
  <div class="rule"></div>
  <div class="meta">
    Built by Nucleus Brain (AI orchestrator) · AG Farms Venture Studio<br>
    Sources: arXiv · Nature/Science · NIST · vendor filings · the Bucket physics canon<br>
    Doctrine: index all · grade everything · a press release and a peer-reviewed result never weigh the same
  </div>
  <div class="stat">{total} graded source nodes · 8 chapters · 15 conflict objects · built {built}</div>
</div>
<section class="front" id="preface"><h1>Preface</h1><div class="narrative">{preface}</div></section>
{toc_html}
<section class="front" id="map"><div class="ch-kicker">Orientation</div><h1 class="ch-title">The Map</h1>
<div class="narrative">{solo_figure("coverage-by-layer","The territory — 184 source nodes across 8 layers.")}{mapmd}<hr>{capmd}</div></section>
{''.join(parts_html)}
{apx_sec("evidence","Appendix A","How every claim is graded", schema)}
{apx_sec("conflicts","Appendix B","Conflict register", conflicts)}
{apx_sec("sweep","Appendix C","Recent preprint evidence", sweep)}
{apx_sec("glossary","Appendix D","Glossary", glossary, "narrative glossary")}
{apx_sec("primer","Appendix E","Math primer", primer)}
{apx_sec("labs","Appendix F","Lab track", lab)}
<section class="chapter appendix" id="refindex"><div class="ch-kicker">Appendix G</div>
<h1 class="ch-title">Node reference index</h1>
<p class="refintro">The {total} graded source nodes behind the chapters — the raw knowledge base.</p>
<div class="refwrap">{''.join(refs_html)}</div></section>
{apx_sec("index","Appendix H","Index of topics", index_html, "indexwrap")}
<section class="colophon" id="colophon"><div class="rule2"></div>
The Quantum Atlas · Bucket Foundation · {built}. Not investment advice.
Every timeline attributed to a vendor is marketing until a peer reviews it.</section>
"""
    doc = (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
           f'<meta name="viewport" content="width=device-width,initial-scale=1">'
           f'<title>The Quantum Atlas</title><style>{_CSS}</style></head><body>{body}</body></html>')
    out = os.path.join(ROOT, "reports", "manual.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"wrote {out}  ({total} nodes, {len(doc)//1024} KB, math {_MATH['ok']} ok/{_MATH['fail']} fail)")
    return out

_CSS = r"""
@page{size:A4;margin:20mm 18mm 16mm;
  @top-left{content:"The Quantum Atlas";font-size:7pt;color:#a99a6f;letter-spacing:.03em}
  @top-right{content:"Bucket Foundation · Nucleus";font-size:7pt;color:#a99a6f}
  @bottom-center{content:counter(page);font-size:8.5pt;color:#8a8170}}
@page cover{margin:0;@top-left{content:""}@top-right{content:""}@bottom-center{content:""}}
@page :blank{@top-left{content:""}@top-right{content:""}}

html{font-size:10.2pt}
body{margin:0;font-family:Charter,"Iowan Old Style",Georgia,"Times New Roman",serif;
  color:#1c1a17;background:#fdfaf3;line-height:1.45;text-align:justify;hyphens:auto}
.narrative,.front,.toc,.chapter{max-width:44rem;margin-left:auto;margin-right:auto;padding:0 1rem}
h1,h2,h3,h4{font-family:"Helvetica Neue",Arial,sans-serif;color:#14110c;line-height:1.15;text-align:left}
h2{font-size:14pt;margin:16pt 0 5pt;padding-bottom:3pt;border-bottom:1.5px solid #b08d3a;break-after:avoid}
h3{font-size:11.5pt;margin:12pt 0 3pt;color:#6b5418;break-after:avoid}
h4{font-size:10.2pt;margin:9pt 0 2pt;break-after:avoid}
p{margin:0 0 7pt}
a{color:#6b5418;text-decoration:none}
strong{color:#0d0b08}
code{font-family:"SF Mono",Consolas,monospace;font-size:.82em;color:#7a5b14;background:#f6f1e3;padding:0 2px;border-radius:2px}
pre{background:#f6f1e3;border:1px solid #e3dcc9;border-radius:3px;padding:8pt 10pt;overflow-x:auto;font-size:8.4pt}
pre code{background:none;padding:0}
blockquote{margin:9pt 0;padding:7pt 12pt;border-left:3px solid #b08d3a;background:#faf6ec;font-size:.95em;color:#3a342b}
blockquote p:last-child{margin-bottom:0}
ul,ol{margin:5pt 0 8pt;padding-left:17pt}li{margin-bottom:3pt}
hr{border:none;border-top:1px solid #ddd3bb;margin:11pt 0}
img,svg{max-width:100%}

table{width:100%;border-collapse:collapse;margin:9pt 0;font-size:8.6pt;break-inside:auto}
th{background:#2c2820;color:#f4eedd;font-family:"Helvetica Neue",sans-serif;text-align:left;
  padding:4pt 6pt;font-size:7.6pt;text-transform:uppercase;letter-spacing:.02em}
td{padding:4pt 6pt;border-bottom:.5px solid #e3dcc9;vertical-align:top;overflow-wrap:anywhere}
tr:nth-child(even) td{background:#faf7ef}

/* cover */
.cover{page:cover;height:297mm;background:#14110c;color:#f4eedd;padding:44mm 26mm;box-sizing:border-box;
  display:flex;flex-direction:column;justify-content:center;break-after:page;max-width:none;text-align:left}
.cover .kick{font-family:"Helvetica Neue",sans-serif;font-size:9pt;letter-spacing:.32em;text-transform:uppercase;color:#cda23f}
.cover h1{font-family:"Helvetica Neue",sans-serif;font-size:44pt;line-height:1.02;letter-spacing:-.02em;margin:12pt 0 0;color:#fff}
.cover .sub{font-size:14pt;color:#cbbf9e;font-style:italic;margin-top:16pt;font-family:Charter,serif;max-width:34rem;text-align:left}
.cover .rule{height:3px;width:80px;background:#cda23f;margin:26pt 0}
.cover .meta{font-family:"Helvetica Neue",sans-serif;font-size:9pt;color:#a89c80;line-height:1.9}
.cover .stat{font-family:"Helvetica Neue",sans-serif;font-size:8.5pt;color:#cda23f;margin-top:22pt;letter-spacing:.02em}

/* front matter */
.front{break-before:page}
.front>h1,.toc>h1{font-family:"Helvetica Neue",sans-serif;font-size:21pt;border-bottom:2px solid #b08d3a;padding-bottom:6pt;margin:0 0 12pt;text-align:left}
.front .narrative{padding:0}

/* TOC */
.toc{break-before:page;break-after:page}
.toc-front{font-size:10pt;margin:4pt 0}
.toc-front a{color:#2c2820}
.toc-part{font-family:"Helvetica Neue",sans-serif;font-weight:700;font-size:10.5pt;color:#14110c;margin:13pt 0 3pt}
.toc-part .tp-n{color:#b08d3a}
.toc-chap{font-size:9.7pt;margin:3pt 0 3pt 15pt;display:flex}
.toc-chap a{flex:1;color:#2c2820;display:flex;gap:.5em}
.toc-chap .tc-n{color:#b08d3a;font-family:"Helvetica Neue",sans-serif;font-weight:700;min-width:1.1em}
.toc-chap a::after,.toc-front a::after{content:leader('. ') target-counter(attr(href url),page);color:#8a8170;font-size:8.5pt;font-family:"Helvetica Neue",sans-serif}

/* part dividers */
.partdiv{break-before:page;height:220mm;display:flex;flex-direction:column;justify-content:center;
  border-top:3px solid #b08d3a;border-bottom:3px solid #b08d3a;max-width:44rem;margin:0 auto;text-align:left}
.partdiv .pd-n{font-family:"Helvetica Neue",sans-serif;font-size:13pt;letter-spacing:.3em;text-transform:uppercase;color:#b08d3a}
.partdiv .pd-t{font-family:"Helvetica Neue",sans-serif;font-size:27pt;font-weight:700;color:#14110c;margin-top:8pt;line-height:1.08}

/* chapters */
.chapter{break-before:page}
.ch-kicker{font-family:"Helvetica Neue",sans-serif;font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#b08d3a;margin-bottom:3pt}
.ch-title{font-family:"Helvetica Neue",sans-serif;font-size:23pt;letter-spacing:-.01em;margin:0 0 12pt;padding-bottom:7pt;border-bottom:2px solid #14110c;text-align:left}
.ch-title .ch-no{display:inline-block;color:#b08d3a;margin-right:.5em}
.narrative{font-size:10.2pt}
.narrative h2{string-set:none}

/* figures */
.figin{margin:11pt 0;text-align:center;break-inside:avoid}
.figin .figsvg{background:#fff;border:1px solid #e3dcc9;border-radius:3px;padding:8pt}
.figin figcaption{font-family:"Helvetica Neue",sans-serif;font-size:7.6pt;color:#6b5418;margin-top:4pt;text-align:center}
.figblock{margin:11pt 0;text-align:center;break-inside:avoid}
.figblock svg{max-width:100%;height:auto}
.figblock .fig-dark{display:none}
.figsolo{background:#fff;border:1px solid #e3dcc9;border-radius:3px;padding:8pt}
.fig-cap{font-family:"Helvetica Neue",sans-serif;font-size:7.6pt;color:#6b5418;text-align:center;margin-top:4pt}

/* math (black paths on cream — no theme inversion) */
.math-span{display:inline-block;margin:0 .08em}
.math-span svg,.math-span img,img.math-inline{height:1.02em;width:auto;vertical-align:-.28em}
.math-block{display:block;text-align:center;margin:9pt 0;break-inside:avoid}
.math-block svg,.math-block img{max-width:100%;height:auto;vertical-align:middle}

/* glossary + index + reference */
.glossary p{margin:.28rem 0}
.appendix{break-before:page}
.refintro{color:#6b5418;font-style:italic}
.refgroup{font-family:"Helvetica Neue",sans-serif;font-size:11pt;color:#6b5418;border-bottom:1px solid #e3dcc9;padding-bottom:2pt;margin:12pt 0 4pt;break-after:avoid}
.refcard{font-size:8.8pt;border-top:.5px solid #ece5d3;padding:4pt 0 3pt;margin:4pt 0 0;break-inside:avoid}
.refcard h1{font-size:10pt;font-family:Charter,serif;font-weight:700;margin:2pt 0 3pt;border:none}
.refcard h1 code{color:#b08d3a;background:#f6f1e3}
.refcard h2{font-family:"Helvetica Neue",sans-serif;font-size:7pt;text-transform:uppercase;letter-spacing:.05em;color:#b08d3a;border:none;margin:5pt 0 1pt;padding:0}
.indexcols{column-count:2;column-gap:1.6rem;font-size:8.8pt}
.idxrow{break-inside:avoid;margin:1.5pt 0;display:flex;justify-content:space-between;gap:.5rem;border-bottom:.4px dotted #ddd3bb}
.idxrow code{background:none;color:#a99a6f;font-size:.82em}

.colophon{break-before:page;font-family:"Helvetica Neue",sans-serif;font-size:8.5pt;color:#8a8170;
  max-width:44rem;margin:0 auto;padding:0 1rem;text-align:center}
.colophon .rule2{height:2px;width:60px;background:#b08d3a;margin:0 auto 10pt}
"""

if __name__ == "__main__":
    build()
