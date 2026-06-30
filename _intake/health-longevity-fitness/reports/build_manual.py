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
def figure_plate(cid):
    items=[fn for fn in FIG_ORDER if FIGMAP.get(fn[:-4])==cid]
    if not items: return ""
    cells=""
    for fn in items:
        ti,ca=FIG_META.get(fn,("",""))
        cap="<b>"+html.escape(ti)+"</b>"+(" — "+html.escape(ca) if ca else "")
        cells+=f'<figure class="figitem"><img src="../media/figures/{fn}"/><figcaption>{cap}</figcaption></figure>'
    return f'<div class="figplate"><h2>Figures &amp; diagrams</h2><div class="figgrid">{cells}</div></div>'

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
    out = subprocess.run(["pandoc","-f","markdown+pipe_tables+backtick_code_blocks","-t","html5",
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

# ---- build body ----
chapters=[]   # (id, title, part_label, html)
toc=[]
for part_label, part_sub, items in STRUCT:
    toc.append(("part", part_label, part_sub, None))
    for cid, path, override in items:
        title = override or first_title(path)
        body = pandoc(path)
        if cid=="training": body = diagram_grid()+body
        body = body + figure_plate(cid)
        chapters.append((cid,title,part_label,body,part_sub))
        toc.append(("chap", title, None, cid))

# ---- TOC html ----
toc_html='<nav class="toc"><h1>Contents</h1>'
for kind,a,b,cid in toc:
    if kind=="part":
        toc_html+=f'<div class="toc-part"><span class="tp-n">{html.escape(a)}</span> {html.escape(b)}</div>'
    else:
        toc_html+=f'<div class="toc-chap"><a href="#{cid}">{html.escape(a)}</a></div>'
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
@page { size:A4; margin:20mm 17mm 16mm;
  @top-left{content:"The Longevity & Fitness Operating Manual";font-size:7pt;color:#a99;letter-spacing:.03em;}
  @top-right{content:"Bucket Foundation · Nucleus";font-size:7pt;color:#a99;}
  @bottom-center{content:counter(page);font-size:8.5pt;color:#8a8170;} }
@page cover { margin:0; @top-left{content:""} @top-right{content:""} @bottom-center{content:""} }
@page :blank { @top-left{content:""} @top-right{content:""} }
html{font-size:9.7pt}
body{font-family:"Charter","Georgia",serif;color:#1c1a17;line-height:1.4;text-align:justify;hyphens:auto}
h1,h2,h3,h4{font-family:"Helvetica Neue","Arial",sans-serif;color:#14110c;line-height:1.15;text-align:left}
h2{font-size:13.5pt;margin:15pt 0 5pt;padding-bottom:3pt;border-bottom:1.5px solid #b08d3a;break-after:avoid}
h3{font-size:11pt;margin:11pt 0 3pt;color:#6b5418;break-after:avoid}
h4{font-size:9.7pt;margin:8pt 0 2pt;break-after:avoid}
p{margin:0 0 6pt}
a{color:#6b5418;text-decoration:none}
code{font-family:"SF Mono","Consolas",monospace;font-size:7.6pt;color:#7a5b14;background:#f6f1e3;padding:0 2px;border-radius:2px}
strong{color:#0d0b08}
blockquote{margin:8pt 0;padding:6pt 11pt;border-left:3px solid #b08d3a;background:#faf6ec;font-size:9pt;color:#3a342b}
blockquote p:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin:8pt 0;font-size:8pt;break-inside:auto}
th{background:#2c2820;color:#f4eedd;font-family:"Helvetica Neue",sans-serif;text-align:left;padding:3.5pt 5pt;font-size:7.2pt;text-transform:uppercase;letter-spacing:.02em}
td{padding:3.5pt 5pt;border-bottom:.5px solid #e3dcc9;vertical-align:top}
tr:nth-child(even) td{background:#faf7ef}
ul,ol{margin:4pt 0 8pt;padding-left:16pt}
li{margin-bottom:2.5pt}
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

/* part dividers */
.partdiv{break-before:page;height:200mm;display:flex;flex-direction:column;justify-content:center;border-top:3px solid #b08d3a;border-bottom:3px solid #b08d3a}
.partdiv .pd-n{font-family:"Helvetica Neue",sans-serif;font-size:13pt;letter-spacing:.3em;text-transform:uppercase;color:#b08d3a}
.partdiv .pd-t{font-family:"Helvetica Neue",sans-serif;font-size:25pt;font-weight:700;color:#14110c;margin-top:8pt;line-height:1.1}

/* chapters */
.chapter{break-before:page}
.ch-kicker{font-family:"Helvetica Neue",sans-serif;font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#b08d3a;margin-bottom:2pt}
.ch-title{font-family:"Helvetica Neue",sans-serif;font-size:21pt;letter-spacing:-.01em;margin:0 0 10pt;padding-bottom:6pt;border-bottom:2px solid #14110c}

/* diagram plate */
.plate{margin:6pt 0 12pt}
.diagrid{display:flex;flex-wrap:wrap;gap:8pt}
.dia{width:31%;margin:0;text-align:center;break-inside:avoid}
.dia img{width:100%;border:1px solid #e3dcc9;border-radius:3px}
.dia figcaption{font-family:"Helvetica Neue",sans-serif;font-size:7pt;color:#6b5418;margin-top:2pt}
.small{font-size:8.3pt;color:#5e574a}

/* per-chapter figure plate */
.figplate{margin:14pt 0 4pt}
.figplate>h2{break-before:auto}
.figgrid{font-size:0}                 /* inline-block paginates across pages (flexbox does not in weasyprint) */
.figitem{display:inline-block;width:48.6%;vertical-align:top;margin:0 0 7pt;text-align:center;break-inside:avoid}
.figitem:nth-child(odd){margin-right:2.6%}
.figitem img{width:100%;border:1px solid #e3dcc9;border-radius:3px;background:#fff}
.figitem figcaption{font-family:"Helvetica Neue",sans-serif;font-size:6.7pt;color:#5e574a;line-height:1.2;margin:1.5pt 2pt 0}
.figitem figcaption b{color:#6b5418}
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
  <div class="stat">49 chapters · 1007 graded claims · 660 figures · 37 conflicts · 12 body systems · ~265,000 words</div>
</div>"""

HOWTO = """<section class="front">
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

STARTHERE = ('<section class="front starthere">'
  '<h1>Start Here — If You Read Nothing Else</h1>' + pandoc(S("00-start-here.md")) + '</section>')
DOC = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>The Longevity &amp; Fitness Operating Manual</title><style>{CSS}</style></head>
<body>{COVER}{STARTHERE}{HOWTO}{toc_html}{body_html}
<section class="front"><h1>Colophon</h1>
<p class="small">Assembled by Nucleus Brain from the <code>health-longevity-fitness</code> research corpus
(Bucket Foundation, bead <code>bkt-bg6</code>): 49 chapters, 1007 graded claims across 53 domain files, a
660-figure people map, 24 labs, 15 trials, 37 conflict objects, and a 53-movement illustrated library.
Research drew on OpenAlex, PubMed/Europe PMC, ClinicalTrials.gov and the Bucket biophysics canon; every
chapter was written under the index-all / grade-everything doctrine and visually or numerically verified.
Exercise diagrams are procedurally generated vector figures. The corpus is idempotent and version-controlled;
this manual regenerates from it via <code>reports/build_manual.py</code>.</p></section>
</body></html>"""

out=os.path.join(HERE,"manual.html")
open(out,"w").write(DOC)
print("wrote", out, f"({len(DOC)//1024} KB HTML, {len(chapters)} chapters)")
