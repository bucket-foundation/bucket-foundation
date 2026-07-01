#!/usr/bin/env python3
"""Assemble all chapters into one comprehensive manual -> HTML (then weasyprint -> PDF).
Converts each markdown section via pandoc, wraps with parts + linked TOC + cover + diagrams."""
import os, subprocess, re, html

import json
HERE = os.path.dirname(os.path.abspath(__file__))
SEC  = os.path.join(HERE, "sections")
ROOT = os.path.abspath(os.path.join(HERE, ".."))   # the corpus root
def corpus(p): return os.path.join(ROOT, p)

# ---- figures: map (figure -> chapter) + titles/captions, for per-chapter figure plates ----
_VIZ=os.path.join(HERE,"viz")
FIGMAP=json.load(open(os.path.join(_VIZ,"figure_chapter_map.json")))
_gtxt=open(os.path.join(_VIZ,"build_gallery.py")).read()
FIG_ORDER=[]; FIG_META={}
for _m in re.finditer(r'\("([^"]*\.png)","([^"]*)","([^"]*)"\)', _gtxt):
    FIG_ORDER.append(_m.group(1)); FIG_META[_m.group(1)]=(_m.group(2),_m.group(3))
def _figcap(fn):
    ti,ca=FIG_META.get(fn,("",""))
    return "<b>"+html.escape(ti)+"</b>"+(" — "+html.escape(ca) if ca else "")
def inline_fig(spec):
    """Render one figure (or a side-by-side pair) inline. spec = 'slug' or 'slugA,slugB'."""
    slugs=[s.strip() for s in re.split(r'[,\s]+', spec) if s.strip()]
    cells="".join(
        f'<figure class="figin-cell"><img src="../media/figures/{s}.png"/>'
        f'<figcaption>{_figcap(s+".png")}</figcaption></figure>' for s in slugs)
    cls="figin pair" if len(slugs)>1 else "figin"
    return f'<div class="{cls}">{cells}</div>'
# markers authored in the section markdown: a line  @@FIG:slug@@  (or @@FIG:slugA,slugB@@)
FIG_MARK=re.compile(r'(?:<p>)?\s*@@FIG:([A-Za-z0-9,\s_-]+?)@@\s*(?:</p>)?')
def place_figs(body, cid):
    placed=set()
    def repl(m):
        for s in re.split(r'[,\s]+', m.group(1)):
            if s: placed.add(s)
        return inline_fig(m.group(1))
    body=FIG_MARK.sub(repl, body)
    # any chapter figures not explicitly anchored -> compact tail plate so nothing is lost
    rest=[fn for fn in FIG_ORDER if FIGMAP.get(fn[:-4])==cid and fn[:-4] not in placed]
    if rest:
        cells="".join(f'<figure class="figitem"><img src="../media/figures/{fn}"/>'
                      f'<figcaption>{_figcap(fn)}</figcaption></figure>' for fn in rest)
        body+=f'<div class="figplate"><h2>More figures</h2><div class="figgrid">{cells}</div></div>'
    return body

# ---- document structure: (part title, subtitle, [ (chapter-id, source-md-path, override-title|None) ]) ----
def S(n): return os.path.join(SEC,n)
STRUCT = [
 ("Part I", "The Map", [
    ("atlas", S("00-atlas.md"), None)]),
 ("Part II", "First Principles — the biophysics, chemistry & biology", [
    ("foundations", S("01-foundations.md"), None),
    ("mechanism", S("12-mechanism-bridge.md"), None),
    ("mitochondria", S("37-mitochondrial-health.md"), None)]),
 ("Part III", "The Evidence Landscape", [
    ("stateoffield", corpus("00-map/01-STATE-OF-THE-FIELD.md"), None)]),
 ("Part IV", "The Body — system by system", [
    ("anatomy", S("18-genetics-anatomy.md"), None),
    ("endocrine", S("13-endocrine-hormones.md"), None),
    ("nervous", S("14-nervous-system.md"), None),
    ("immune", S("15-immune-system.md"), None),
    ("telomeres", S("16-telomeres-cellular-aging.md"), None),
    ("bodysys", S("11-body-systems.md"), None),
    ("organatlas", S("17-organ-systems-atlas.md"), None),
    ("reproductive", S("42-reproductive-sexual-health.md"), None)]),
 ("Part V", "Clinical Medicine — the diseases & their treatment", [
    ("clinical", S("07-clinical-prevention.md"), None),
    ("dz_cardiometabolic", S("22-disease-cardiometabolic-renal.md"), None),
    ("dz_respgi", S("23-disease-respiratory-gi.md"), None),
    ("dz_neurorheum", S("24-disease-neuro-rheum.md"), None),
    ("oncology", S("25-oncology.md"), None),
    ("infectious", S("26-infectious-disease.md"), None),
    ("brain", S("08-brain-cognitive.md"), None),
    ("mental", S("20-mental-health-psychiatry.md"), None),
    ("addiction", S("35-addiction-substance-use.md"), None),
    ("pain", S("21-pain-injury-rehab.md"), None),
    ("surface", S("27-derm-dental-ent-eye.md"), None),
    ("pediatric", S("43-developmental-congenital-pediatric.md"), None),
    ("emergency", S("34-emergency-acute.md"), None)]),
 ("Part VI", "How Medicine Is Practiced", [
    ("surgery", S("38-surgery-perioperative.md"), None),
    ("anesthesia", S("39-anesthesia-critical-care.md"), None),
    ("imaging", S("40-imaging-radiology.md"), None),
    ("pathology", S("41-pathology-lab-medicine.md"), None)]),
 ("Part VII", "Drugs, Therapeutics & the Frontier", [
    ("pharmafull", S("28-pharmacology-full.md"), None),
    ("pharma_longevity", S("10-medical-pharmacology.md"), None),
    ("regenerative", S("31-regenerative-frontier.md"), None),
    ("complementary", S("30-complementary-medicine.md"), None),
    ("biohacking", S("32-biohacking-fringe.md"), None)]),
 ("Part VIII", "The Levers — what you actually do", [
    ("training", S("02-training.md"), None),
    ("modalities", S("44-exercise-modalities.md"), None),
    ("sports", S("45-sports-play.md"), None),
    ("nutrition", S("03-nutrition-supplements.md"), None),
    ("fasting", S("36-fasting-cleanses-protocols.md"), None),
    ("recovery", S("05-recovery-sleep-stress.md"), None),
    ("behavior", S("29-behavior-change.md"), None)]),
 ("Part IX", "Life, Environment & Society", [
    ("lifestages", S("19-life-stages.md"), None),
    ("exposures", S("09-exposures-environment.md"), None),
    ("publichealth", S("33-public-health-systems.md"), None)]),
 ("Part X", "Personalization", [
    ("variation", S("04-individual-variation.md"), None),
    ("measure", corpus("04-protocols/WHAT-TO-TRACK-SYNTHESIS.md"), None)]),
 ("Part XI", "The Open Questions", [
    ("conflicts", corpus("06-evidence/CONFLICTS-REGISTER.md"), None)]),
 ("Part XII", "The Discourse — claims vs the evidence", [
    ("practitioner", S("46-practitioner-claims-vs-evidence.md"), None)]),
 ("Part XIII", "Go Deeper", [
    ("library", S("06-go-deeper-library.md"), None)]),
]

DIAGRAMS = [
 ("01-air-squat","Air squat — knee-dominant, hip below knee"),
 ("02-hip-hinge","Hip hinge — hips back, flat 45° back, shins vertical"),
 ("03-deep-lunge-mobility","Deep lunge — opens the hip flexors"),
 ("04-forearm-plank","Forearm plank — one straight braced line"),
 ("05-one-leg-stand","10-second one-leg stand — a free mortality biomarker"),
 ("06-box-breathing","Box breathing — ~6 breaths/min raises HRV"),
]

def first_title(md_path):
    with open(md_path) as f:
        for line in f:
            if line.startswith("# "): return line[2:].strip()
    return os.path.basename(md_path)

def pandoc(md_path):
    out = subprocess.run(["pandoc","-f","markdown+pipe_tables+backtick_code_blocks-citations","-t","html5",
                          "--no-highlight", md_path], capture_output=True, text=True)
    if out.returncode!=0: raise RuntimeError(f"pandoc failed on {md_path}: {out.stderr[:300]}")
    h = out.stdout
    # drop the first <h1>...</h1> (we render our own chapter header)
    h = re.sub(r"^\s*<h1[^>]*>.*?</h1>", "", h, count=1, flags=re.S)
    return h

def diagram_grid():
    cells=""
    for slug,cap in DIAGRAMS:
        cells+=f'<figure class="dia"><img src="../media/generated-diagrams/{slug}.png"/><figcaption>{html.escape(cap)}</figcaption></figure>'
    return ('<div class="plate"><h2>Movement plates — the foundational patterns</h2>'
            '<p class="small">Procedurally generated vector diagrams (reproducible, anatomy-honest). '
            'The full 53-movement library + 212 real demonstration frames live in <code>media/</code>.</p>'
            f'<div class="diagrid">{cells}</div></div>')

# ---- clickable cross-references: map a chapter number (from its filename) -> its anchor id ----
secnum2cid={}
for _pl,_ps,_items in STRUCT:
    for _cid,_path,_ov in _items:
        # only the numbered chapter files under sections/ own the §NN numbering
        # (corpus files like 00-map/01-STATE-OF-THE-FIELD collide on numbers otherwise)
        if os.path.basename(os.path.dirname(_path))!="sections": continue
        m=re.match(r'0*(\d{1,2})', os.path.basename(_path))
        if m and int(m.group(1)) not in secnum2cid: secnum2cid[int(m.group(1))]=_cid
_XREF=re.compile(r'§\s*0*(\d{1,2})((?:\.\d+)*)')
def linkify(h):
    """Turn '§NN' / '§NN.M' references into internal links to the chapter anchor (not inside tags)."""
    def repl(m):
        n=int(m.group(1))
        if n not in secnum2cid: return m.group(0)
        return f'<a class="xref" href="#{secnum2cid[n]}">§{m.group(1)}{m.group(2)}</a>'
    # only operate on text outside HTML tags
    out=[];
    for i,seg in enumerate(re.split(r'(<[^>]+>)', h)):
        out.append(seg if seg.startswith("<") else _XREF.sub(repl, seg))
    return "".join(out)

# ---- build body ----
chapters=[]   # (id, title, part_label, html)
toc=[]
for part_label, part_sub, items in STRUCT:
    toc.append(("part", part_label, part_sub, None))
    for cid, path, override in items:
        title = override or first_title(path)
        body = pandoc(path)
        if cid=="training": body = diagram_grid()+body
        body = linkify(place_figs(body, cid))
        chapters.append((cid,title,part_label,body,part_sub))
        toc.append(("chap", title, None, cid))

# ---- TOC html ---- (front matter listed first, like a real book, then Parts, then back matter)
toc_html='<nav class="toc"><h1>Contents</h1>'
toc_html+='<div class="toc-front"><a href="#howto">How to Read This Manual</a></div>'
toc_html+='<div class="toc-front"><a href="#starthere">Start Here — If You Read Nothing Else</a></div>'
for kind,a,b,cid in toc:
    if kind=="part":
        toc_html+=f'<div class="toc-part"><span class="tp-n">{html.escape(a)}</span> {html.escape(b)}</div>'
    else:
        toc_html+=f'<div class="toc-chap"><a href="#{cid}">{html.escape(a)}</a></div>'
toc_html+='<div class="toc-front toc-back"><a href="#glossary">Glossary</a></div>'
toc_html+='<div class="toc-front"><a href="#index">Index</a></div>'
toc_html+='<div class="toc-front"><a href="#colophon">Colophon</a></div>'
toc_html+='</nav>'

# ---- body html ----
body_html=""
seen_parts=set()
for cid,title,part_label,bodyhtml,part_sub in chapters:
    if part_label not in seen_parts:
        seen_parts.add(part_label)
        body_html+=(f'<section class="partdiv"><div class="pd-n">{html.escape(part_label)}</div>'
                    f'<div class="pd-t">{html.escape(part_sub)}</div></section>')
    body_html+=(f'<section class="chapter" id="{cid}"><div class="ch-kicker">{html.escape(part_label)}</div>'
                f'<h1 class="ch-title">{html.escape(title)}</h1>{bodyhtml}</section>')

CSS = r"""
@page { size:A4; margin:15mm 14mm 12mm;
  @top-left{content:"The Longevity & Fitness Operating Manual";font-size:7pt;color:#a99;letter-spacing:.03em;}
  @top-right{content:string(runhead);font-size:7pt;color:#8a8170;letter-spacing:.02em;}
  @bottom-center{content:counter(page);font-size:8.5pt;color:#8a8170;} }
@page cover { margin:0; @top-left{content:""} @top-right{content:""} @bottom-center{content:""} }
@page :blank { @top-left{content:""} @top-right{content:""} }
/* running header: the current section title flows into the top-right of its pages
   (string-set via CSS rule carries across a chapter's pages; inline does not in weasyprint) */
.ch-title,.front>h1,.toc>h1,.partdiv .pd-t{string-set:runhead content()}
html{font-size:9.35pt}
body{font-family:"Charter","Georgia",serif;color:#1c1a17;line-height:1.3;text-align:justify;hyphens:auto}
h1,h2,h3,h4{font-family:"Helvetica Neue","Arial",sans-serif;color:#14110c;line-height:1.15;text-align:left}
h2{font-size:12.8pt;margin:10pt 0 3pt;padding-bottom:3pt;border-bottom:1.5px solid #b08d3a;break-after:avoid}
h3{font-size:10.6pt;margin:7pt 0 2pt;color:#6b5418;break-after:avoid}
h4{font-size:9.7pt;margin:8pt 0 2pt;break-after:avoid}
p{margin:0 0 4pt}
a{color:#6b5418;text-decoration:none}
code{font-family:"SF Mono","Consolas",monospace;font-size:7.6pt;color:#7a5b14;background:#f6f1e3;padding:0 2px;border-radius:2px}
strong{color:#0d0b08}
blockquote{margin:6pt 0;padding:4.5pt 9pt;border-left:3px solid #b08d3a;background:#faf6ec;font-size:9pt;color:#3a342b}
blockquote p:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin:6pt 0;font-size:7.5pt;break-inside:auto}
th{background:#2c2820;color:#f4eedd;font-family:"Helvetica Neue",sans-serif;text-align:left;padding:2.3pt 4pt;font-size:7.2pt;text-transform:uppercase;letter-spacing:.02em}
td{padding:2.3pt 4pt;border-bottom:.5px solid #e3dcc9;vertical-align:top}
tr:nth-child(even) td{background:#faf7ef}
ul,ol{margin:3pt 0 5pt;padding-left:15pt}
li{margin-bottom:1.5pt}
hr{border:none;border-top:1px solid #ddd3bb;margin:10pt 0}
img{max-width:100%}

/* cover */
.cover{page:cover;height:297mm;background:#14110c;color:#f4eedd;padding:40mm 24mm;box-sizing:border-box;
  display:flex;flex-direction:column;justify-content:center;break-after:page}
.cover .kick{font-family:"Helvetica Neue",sans-serif;font-size:9pt;letter-spacing:.34em;text-transform:uppercase;color:#cda23f}
.cover h1{font-family:"Helvetica Neue",sans-serif;font-size:40pt;line-height:1.02;letter-spacing:-.02em;margin:10pt 0 0;color:#fff}
.cover .sub{font-size:14pt;color:#cbbf9e;font-style:italic;margin-top:14pt;font-family:"Charter",serif}
.cover .rule{height:3px;width:80px;background:#cda23f;margin:24pt 0}
.cover .meta{font-family:"Helvetica Neue",sans-serif;font-size:9pt;color:#a89c80;line-height:1.8}
.cover .stat{font-family:"Helvetica Neue",sans-serif;font-size:8.5pt;color:#cda23f;margin-top:20pt;letter-spacing:.02em}

/* edition / copyright page (clean, no running header or page number) */
.edition{page:cover;min-height:297mm;box-sizing:border-box;padding:52mm 26mm 30mm;break-after:page;color:#1c1a17}
.ed-title{font-family:"Helvetica Neue",sans-serif;font-size:19pt;color:#14110c;margin:0 0 5pt;line-height:1.12}
.ed-sub{font-size:11pt;color:#5e574a;font-style:italic;margin:0 0 34pt}
.ed-meta p{font-size:9pt;color:#3a342b;margin:0 0 10pt;line-height:1.55}
.ed-disclaim{border-left:3px solid #b5471f;background:#fbf0ea;padding:7pt 11pt}
.ed-scale{font-family:"Helvetica Neue",sans-serif;font-size:8pt;color:#8a8170;letter-spacing:.02em;margin-top:24pt !important}

/* front matter */
.front{break-before:page}
.front h1{font-family:"Helvetica Neue",sans-serif;font-size:20pt;border-bottom:2px solid #b08d3a;padding-bottom:5pt;margin:0 0 10pt}
.callout{border-left:3px solid #b08d3a;background:#faf6ec;padding:8pt 12pt;margin:9pt 0;font-size:9pt}
.callout.warn{border-color:#b5471f;background:#fbf0ea}
.callout .ch{font-family:"Helvetica Neue",sans-serif;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:.07em;color:#6b5418;display:block;margin-bottom:2pt}

/* TOC */
.toc{break-before:page}
.toc h1{font-family:"Helvetica Neue",sans-serif;font-size:20pt;border-bottom:2px solid #b08d3a;padding-bottom:5pt;margin:0 0 12pt}
.toc-part{font-family:"Helvetica Neue",sans-serif;font-weight:700;font-size:10pt;color:#14110c;margin:11pt 0 3pt}
.toc-part .tp-n{color:#b08d3a}
.toc-chap{font-size:9.5pt;margin:2.5pt 0 2.5pt 14pt;display:flex}
.toc-chap a{flex:1;color:#2c2820}
.toc-chap a::after{content:leader('.  ') target-counter(attr(href url),page);color:#8a8170;font-size:8.5pt}
.toc-front{font-family:"Helvetica Neue",sans-serif;font-size:9.5pt;font-weight:700;color:#14110c;margin:3pt 0;display:flex}
.toc-front a{flex:1;color:#2c2820}
.toc-front a::after{content:leader('.  ') target-counter(attr(href url),page);color:#8a8170;font-size:8.5pt;font-weight:400}
.toc-back{margin-top:9pt}

/* part dividers */
.partdiv{break-before:page;height:200mm;display:flex;flex-direction:column;justify-content:center;border-top:3px solid #b08d3a;border-bottom:3px solid #b08d3a}
.partdiv .pd-n{font-family:"Helvetica Neue",sans-serif;font-size:13pt;letter-spacing:.3em;text-transform:uppercase;color:#b08d3a}
.partdiv .pd-t{font-family:"Helvetica Neue",sans-serif;font-size:25pt;font-weight:700;color:#14110c;margin-top:8pt;line-height:1.1}

/* chapters */
.chapter{break-before:page}
.ch-kicker{font-family:"Helvetica Neue",sans-serif;font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#b08d3a;margin-bottom:2pt}
.ch-title{font-family:"Helvetica Neue",sans-serif;font-size:20pt;letter-spacing:-.01em;margin:0 0 7pt;padding-bottom:6pt;border-bottom:2px solid #14110c}

/* diagram plate */
.plate{margin:6pt 0 12pt}
.diagrid{display:flex;flex-wrap:wrap;gap:8pt}
.dia{width:31%;margin:0;text-align:center;break-inside:avoid}
.dia img{width:100%;border:1px solid #e3dcc9;border-radius:3px}
.dia figcaption{font-family:"Helvetica Neue",sans-serif;font-size:7pt;color:#6b5418;margin-top:2pt}
.small{font-size:8.3pt;color:#5e574a}

/* per-chapter Sources endnotes (pandoc footnotes) */
.footnotes{font-size:7.6pt;color:#5e574a;margin-top:13pt;break-before:auto}
.footnotes hr{display:none}
.footnotes::before{content:"Sources & notes";display:block;font-family:"Helvetica Neue",sans-serif;font-weight:700;font-size:8.5pt;color:#6b5418;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #b08d3a;padding-bottom:3pt;margin-bottom:5pt}
.footnotes ol{padding-left:14pt;margin:0}
.footnotes li{margin-bottom:1.5pt}
.footnotes p{margin:0}
.footnote-ref{font-size:.72em;color:#8a7a3a;text-decoration:none;vertical-align:super;line-height:0}
.footnote-back{text-decoration:none}

/* inline figures — anchored next to the text that discusses them */
.figin{margin:6pt auto 7pt;text-align:center;break-inside:avoid;max-width:62%}
.figin.pair{max-width:100%;display:flex;gap:10pt;justify-content:center;align-items:flex-start}
.figin-cell{margin:0;flex:1;text-align:center}
.figin img,.figin-cell img{width:100%;border:1px solid #e3dcc9;border-radius:3px;background:#fff}
.figin figcaption,.figin-cell figcaption{font-family:"Helvetica Neue",sans-serif;font-size:7pt;color:#5e574a;line-height:1.25;margin:2.5pt 4pt 0}
.figin figcaption b,.figin-cell figcaption b{color:#6b5418}

/* per-chapter figure plate (transitional tail for un-anchored figures) */
.figplate{margin:14pt 0 4pt}
.figplate>h2{break-before:auto}
.figgrid{font-size:0}                 /* inline-block paginates across pages (flexbox does not in weasyprint) */
.figitem{display:inline-block;width:48.6%;vertical-align:top;margin:0 0 7pt;text-align:center;break-inside:avoid}
.figitem:nth-child(odd){margin-right:2.6%}
.figitem img{width:100%;border:1px solid #e3dcc9;border-radius:3px;background:#fff}
.figitem figcaption{font-family:"Helvetica Neue",sans-serif;font-size:6.7pt;color:#5e574a;line-height:1.2;margin:1.5pt 2pt 0}
.figitem figcaption b{color:#6b5418}

/* cross-reference links (clickable §NN) — subtle, same family as other links */
.xref{color:#6b5418;text-decoration:none}

/* back matter: glossary + index */
.backmatter{break-before:page}
.gloss-body{column-count:2;column-gap:16pt;font-size:8.4pt;line-height:1.35}
.gloss-body p{margin:0 0 3pt;break-inside:avoid;text-align:left}
.gloss-body strong{color:#14110c}
.idxcols{column-count:2;column-gap:16pt;font-size:8.3pt}
.idx-letter{font-family:"Helvetica Neue",sans-serif;font-weight:700;font-size:10.5pt;color:#b08d3a;margin:7pt 0 2pt;break-after:avoid;break-inside:avoid}
.idx-entry{margin:0 0 1.3pt;break-inside:avoid;line-height:1.3;text-align:left}
.idx-t{color:#1c1a17}
.idx-r,.idx-r .xref{color:#8a7a3a}
"""

COVER = """<div class="cover">
  <div class="kick">Bucket Foundation · Nucleus Brain</div>
  <h1>The Longevity &amp; Fitness Operating Manual</h1>
  <div class="sub">A complete, evidence-graded map of the human body, its aging, and what to do about it —
  every recommendation tied down to the biophysics, chemistry &amp; biology of why it works.</div>
  <div class="rule"></div>
  <div class="meta">
    Built by Nucleus Brain (AI orchestrator) · AG Farms Venture Studio · bead bkt-bg6<br>
    Sources: OpenAlex · PubMed · Europe PMC · ClinicalTrials.gov · the Bucket biophysics canon<br>
    Doctrine: index all · grade everything · mechanism &#8800; outcome &#8800; protocol
  </div>
  <div class="stat">50 chapters · 1007 graded claims · 367 figures · 38 conflicts · 12 body systems · ~265,000 words</div>
</div>"""

HOWTO = """<section class="front" id="howto">
<h1>How to read this manual</h1>
<p>This is a reference manual, not a protocol to obey. It maps the entire territory of human health,
longevity and fitness — from the proton gradient across a mitochondrial membrane up to whole-body
systems and the interventions that move them — and it grades every claim by the strength of evidence
behind it. The goal is to let you tell the difference between what is <em>established</em>, what is
<em>promising</em>, and what is merely <em>sold</em>.</p>
<div class="callout"><span class="ch">The three rules that govern every claim</span>
<strong>(1) Predictor &#8800; lever.</strong> A biomarker that predicts death is not automatically something
that, when changed, prevents it. <strong>(2) Cohort &#8800; RCT.</strong> You cannot randomize fitness, sleep
or smoking over decades, so the strongest-looking numbers carry bias. <strong>(3) Something beats nothing.</strong>
The steepest gains are at the start of every dose-response curve; optimization past that is real but smaller
than it is marketed.</div>
<div class="callout"><span class="ch">How claims are graded</span>
Every factual claim resolves to a graded entry of the form <code>claim-id</code> in the corpus, carrying an
evidence tier on a ten-rung ladder — <code>meta</code> &rarr; <code>rct</code> &rarr; <code>cohort</code>
&rarr; <code>mechanistic</code> &rarr; <code>animal</code> &rarr; <code>in-vitro</code> &rarr;
<code>n=1</code> &rarr; <code>anecdotal</code> &rarr; <code>theoretical</code> &rarr; <code>speculative</code>
— plus its source and effect size. Disagreements are kept as first-class <em>conflict objects</em>, never
resolved away. The grade is the neutrality: nothing is excluded for being fringe, and nothing is laundered
into fact for being popular.</div>
<div class="callout"><span class="ch">How it's organized</span>
<strong>Part I</strong> is the map. <strong>Part II</strong> is the fundamental machinery every later chapter
draws on. <strong>Part III</strong> is the honest bottom line. <strong>Part IV</strong> walks the body system
by system. <strong>Part V</strong> is what you actually do. <strong>Parts VI–VIII</strong> cover the clinic,
the environment, and how to personalize. <strong>Part IX</strong> is what we don't know. <strong>Part X</strong>
is where to read deeper. Follow the cross-references (<code>&sect;</code> and <code>claim-id</code>) to go down
to primary sources.</div>
<div class="callout warn"><span class="ch">Not medical advice</span>
This document is an educational synthesis. It is not medical advice, diagnosis, or treatment, and it cannot
account for your individual history. Talk to a qualified clinician before changing medication, starting a new
training or fasting regimen, or acting on anything here — especially the pharmacology and clinical chapters.</div>
</section>"""

def build_glossary():
    p=os.path.join(HERE,"_review","_glossary.md")
    if not os.path.exists(p): return ""
    return ('<section class="front backmatter" id="glossary"><h1>Glossary</h1>'
            '<div class="gloss-body">'+pandoc(p)+'</div></section>')

def build_index():
    p=os.path.join(HERE,"_review","_index-terms.txt")
    if not os.path.exists(p): return ""
    terms=[t.strip() for t in open(p) if t.strip() and not t.startswith("#")]
    # section-number -> lowercased chapter text (numbered chapter files only)
    numtext={}
    for _pl,_ps,_items in STRUCT:
        for _cid,_path,_ov in _items:
            if os.path.basename(os.path.dirname(_path))!="sections": continue
            m=re.match(r'0*(\d{1,2})', os.path.basename(_path))
            if m: numtext[int(m.group(1))]=open(_path).read().lower()
    def keys_for(term):
        base=re.sub(r'\s*\([^)]*\)','',term).strip()          # drop clarifying parentheticals
        return [a.strip().lower() for a in re.split(r'\s*/\s*', base) if a.strip()]  # split A / B alternates
    seen=set(); entries=[]
    for term in terms:
        dkey=term.lower()
        if dkey in seen: continue
        seen.add(dkey)
        pats=[re.compile(r'(?<![a-z0-9])'+re.escape(k)+r'(?![a-z0-9])') for k in keys_for(term)]
        nums=sorted(n for n,txt in numtext.items() if any(p.search(txt) for p in pats))
        if not nums: continue
        refs=", ".join(f'§{n:02d}' for n in nums)
        entries.append((term, refs))
    entries.sort(key=lambda e: e[0].lower())
    out=['<section class="front backmatter" id="index"><h1>Index</h1>',
         '<p class="small">Numbers are chapter sections (§). Terms link to the chapter.</p>',
         '<div class="idxcols">']
    cur=None
    for term,refs in entries:
        first=term[0].upper() if term[0].isalpha() else "#"
        if first!=cur:
            cur=first; out.append(f'<div class="idx-letter">{first}</div>')
        out.append(f'<div class="idx-entry"><span class="idx-t">{html.escape(term)}</span> '
                   f'<span class="idx-r">{refs}</span></div>')
    out.append('</div></section>')
    return linkify("".join(out))

EDITION = """<section class="edition">
  <h1 class="ed-title">The Longevity &amp; Fitness Operating Manual</h1>
  <p class="ed-sub">A complete, evidence-graded map of the human body, its aging, and what to do about it.</p>
  <div class="ed-meta">
    <p><strong>First edition · 2026</strong><br>Bucket Foundation · AG Farms Venture Studio</p>
    <p>Compiled by Nucleus Brain (AI orchestrator) from the Bucket <code>health-longevity-fitness</code>
    research corpus. Every claim is graded by evidence tier; disagreements are kept as first-class
    conflict objects, never resolved away.</p>
    <p>Sources: OpenAlex · PubMed / Europe PMC · ClinicalTrials.gov · the Bucket biophysics canon.</p>
    <p class="ed-disclaim"><strong>Not medical advice.</strong> This is an educational synthesis — not
    diagnosis, treatment, or a substitute for a clinician who knows your history. Talk to a qualified
    professional before changing medication or starting a new training, fasting, or supplement regimen.</p>
    <p class="ed-scale">50 chapters · 1007 graded claims · 367 figures · 38 conflict objects · 12 body systems</p>
  </div>
</section>"""
STARTHERE = ('<section class="front starthere" id="starthere">'
  '<h1>Start Here — If You Read Nothing Else</h1>' + pandoc(S("00-start-here.md")) + '</section>')
DOC = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>The Longevity &amp; Fitness Operating Manual</title><style>{CSS}</style></head>
<body>{COVER}{EDITION}{toc_html}{linkify(HOWTO)}{linkify(STARTHERE)}{body_html}{build_glossary()}{build_index()}
<section class="front" id="colophon"><h1>Colophon</h1>
<p class="small">Assembled by Nucleus Brain from the <code>health-longevity-fitness</code> research corpus
(Bucket Foundation, bead <code>bkt-bg6</code>): 50 chapters, 1007 graded claims across 54 claim sets, a
367-figure visual layer, 24 labs, 15 trials, 38 conflict objects, and a 53-movement illustrated library.
Research drew on OpenAlex, PubMed/Europe PMC, ClinicalTrials.gov and the Bucket biophysics canon; every
chapter was written under the index-all / grade-everything doctrine and visually or numerically verified.
Exercise diagrams are procedurally generated vector figures. The corpus is idempotent and version-controlled;
this manual regenerates from it via <code>reports/build_manual.py</code>.</p></section>
</body></html>"""

out=os.path.join(HERE,"manual.html")
open(out,"w").write(DOC)
print("wrote", out, f"({len(DOC)//1024} KB HTML, {len(chapters)} chapters)")
