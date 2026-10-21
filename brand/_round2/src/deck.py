import os, re, json, glob, gzip, html, shutil
from r2 import ROUND2, DIRS, REPO, DECK, EUC

A = os.path.join(ROUND2, "assets")
S = os.path.join(ROUND2, "screens")
FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Mono&family=Jost:wght@400;700&family=Space+Mono:wght@400;700&family=Fredoka:wght@600;700&family=Nunito:wght@400;800&family=GFS+Didot&family=Gentium+Book+Plus:ital,wght@0,400;0,700;1,400&family=Noto+Serif+Hebrew&family=Noto+Serif+Devanagari&family=Noto+Serif+SC&display=swap"
IMAGES = {
    "byrne-prop-i1.jpg": "d7", "byrne-i1-figure.jpg": "d7", "oxyrhynchus-euclid.jpg": "d7", "vat-gr-190.jpg": "d7",
    "stoichedon-ig-i3-48.jpg": "d7", "tetradrachm-owl.png": "d7", "astrolabe-1654.jpg": "d5",
}
MARKS = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"]
NAMES = dict(d1="Grid", d2="Kamon", d3="Squiggle", d4="Wedge", d5="Girih", d6="Primitive", d7="Euclid")
e = html.escape


def sources():
    out = {}
    for d in set(IMAGES.values()):
        for s in json.load(open(os.path.join(DIRS, "licensed", d, "sources.json"))):
            out[s["file"]] = s
    for s in json.load(open(os.path.join(A, "sources.json"))):
        out[s["file"]] = s
    return out


def credit(src, f):
    s = src[f]
    lic = s.get("license") or s.get("licence", "")
    who = s.get("creator") or s.get("artist") or ""
    bits = [b for b in (s["title"], who, lic) if b]
    return f'<a href="{e(s["url"])}">{e(", ".join(bits))}</a>'


def copy_assets():
    os.makedirs(A, exist_ok=True)
    for f, d in IMAGES.items():
        shutil.copy2(os.path.join(DIRS, "licensed", d, f), os.path.join(A, f))
    for m in MARKS:
        shutil.copy2(os.path.join(DIRS, "logos", f"{m}-mho.svg"), os.path.join(A, f"{m}-mho.svg"))
    prim = open(os.path.join(DIRS, "logos", "d6-mho.svg")).read()
    nodot = re.sub(r'<circle cx="128" cy="136" r="20" fill="#111111"/>', "", prim)
    assert nodot != prim
    open(os.path.join(A, "d6-mho-nodot.svg"), "w").write(nodot)
    gold = prim.replace('fill="#111111"/></svg>', f'fill="{DECK["knob"]}"/><circle cx="128" cy="136" r="7" fill="{DECK["gold"]}"/></svg>')
    open(os.path.join(A, "d6-mho-knob.svg"), "w").write(gold)
    grid = open(os.path.join(DIRS, "logos", "d1-mho.svg")).read()
    alt = grid.replace('<rect x="112" y="128" width="32" height="32" fill="#DA1E28"/>', f'<circle cx="128" cy="144" r="18" fill="{DECK["knob"]}"/><circle cx="128" cy="144" r="6" fill="{DECK["gold"]}"/>')
    assert alt != grid
    open(os.path.join(A, "grid-primitive-knob.svg"), "w").write(alt)
    open(os.path.join(A, "girih.svg"), "w").write(girih_svg(DECK["ink"], 0.08))


def girih_svg(color, op):
    import math
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5
        r = 40 if k % 2 == 0 else 17
        pts.append(f"{60 + r * math.cos(a):.2f},{60 - r * math.sin(a):.2f}")
    star = " ".join(pts)
    dec = " ".join(f"{60 + 52 * math.cos(math.pi / 10 + k * math.pi / 5):.2f},{60 - 52 * math.sin(math.pi / 10 + k * math.pi / 5):.2f}" for k in range(10))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><g fill="none" stroke="{color}" stroke-opacity="{op}" stroke-width="1"><polygon points="{star}"/><polygon points="{dec}"/><path d="M0 0L60 8M120 0L60 8M0 120L60 112M120 120L60 112M0 0L8 60M0 120L8 60M120 0L112 60M120 120L112 60"/></g></svg>'


def feedback():
    t = open(os.path.join(ROUND2, "FOUNDER-FEEDBACK.md"), encoding="utf-8").read()
    t = re.sub(r"^<!--.*?-->\n", "", t)
    head, notes = t.split("## Notes, verbatim", 1)
    secs = re.split(r"\n(?=### )", notes.strip())
    groups = []
    for s in secs:
        lines = s.splitlines()
        head_, items = lines[0], lines[1:]
        for k in range(0, len(items), 3):
            groups.append([head_ + "\n" + "\n".join(items[k:k + 3])])
    return md(head), [md("\n".join(g)) for g in groups if g]


def md(t):
    out, ul = [], False
    for line in t.strip().splitlines():
        if line.startswith("- "):
            if not ul:
                out.append("<ul>"); ul = True
            out.append(f"<li>{e(line[2:])}</li>"); continue
        if ul:
            out.append("</ul>"); ul = False
        if line.startswith("### "):
            out.append(f"<h3>{e(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2>{e(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1>{e(line[2:])}</h1>")
        elif line.strip():
            out.append(f"<p>{e(line)}</p>")
    if ul:
        out.append("</ul>")
    return "\n".join(out)


def heiberg():
    t = open(os.path.join(DIRS, "pages", "d7", "math.html"), encoding="utf-8").read()
    m = re.search(r'<ol class="proof">.*?</ol>', t, re.S)
    return m.group(0)


def polingual_row():
    rows = json.load(gzip.open(os.path.join(REPO, "polingual", "data", "photons.json.gz")))
    langs = sorted({r[1] for r in rows})
    want = [("en", "light"), ("el", "λόγος"), ("he", "אור"), ("sa", "प्रकाश"), ("ru", "свет"), ("ja", "光")]
    have = {(r[1], r[2]) for r in rows}
    return langs, [w for w in want if w in have]


BRANCHES = [
    ("01", "Mathematics", "Euclid", "Elements, c. 300 BC", "euclid-van-gent.jpg"),
    ("02", "Physics", "Archimedes", "On Floating Bodies", "archimedes-fetti.jpg"),
    ("03", "Chemistry", "Zosimos of Panopolis", "Cheirokmeta", "zosimos-apparatus.jpg"),
    ("04", "Information", "Eratosthenes", "the sieve of primes", "eratosthenes-strozzi.jpg"),
    ("05", "Biophysics", "Herophilus", "the pulse and the nerves", "herophilus-salgado.jpg"),
    ("06", "Cosmology", "Aristarchus", "On the Sizes and Distances", "aristarchus-working.jpg"),
    ("07", "Mind", "Hypatia", "commentary on Diophantus", "hypatia-gaspard.jpg"),
]

EUC_CSS = f""":root{{--bg:{EUC['bg']};--surf:{EUC['surf']};--text:{EUC['text']};--muted:{EUC['muted']};--acc:{EUC['acc']};--onacc:{EUC['onacc']};--hl:{EUC['hl']};--red:{EUC['by_red']};--yel:{EUC['by_yel']};--blu:{EUC['by_blu']};--night:{EUC['night']};--nt:{EUC['night_text']};--nm:{EUC['night_muted']};--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s6:24px;--s8:32px;--s12:48px;--s16:64px;--disp:'GFS Didot',serif;--body:'Gentium Book Plus','Noto Serif Hebrew','Noto Serif Devanagari','Noto Serif SC',serif}}
*{{box-sizing:border-box}}html,body{{margin:0}}body{{background:var(--bg);color:var(--text);font:400 18px/28px var(--body);overflow-x:hidden}}a{{color:var(--hl)}}img{{max-width:100%;display:block}}
.wrap{{max-width:1312px;margin:0 auto;padding:0 var(--s8)}}header,footer{{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);flex-wrap:wrap;padding:var(--s4) 0}}
.brand{{display:flex;align-items:center;gap:var(--s3);font:400 28px/32px var(--disp);color:var(--text);text-decoration:none;letter-spacing:.2em}}.brand img{{width:40px;height:40px}}
nav{{display:flex;gap:var(--s6);flex-wrap:wrap}}nav a{{color:var(--text);text-decoration:none;font-size:16px}}nav a[aria-current]{{color:var(--acc);border-bottom:2px solid var(--acc)}}
.btn{{display:inline-flex;align-items:center;min-height:48px;padding:var(--s3) var(--s6);background:var(--acc);color:var(--onacc);text-decoration:none;border-radius:2px;font:700 16px/24px var(--body)}}.btn.ghost{{background:transparent;color:var(--acc);box-shadow:inset 0 0 0 2px var(--acc)}}
.stoich{{font:400 64px/72px var(--disp);letter-spacing:.06em;text-transform:uppercase;margin:0;word-break:break-word}}.eyebrow{{font:700 13px/16px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--acc);margin:0 0 var(--s3)}}
.credit,.credit a{{font-size:13px;line-height:20px;color:var(--muted)}}
.grid{{display:grid;grid-template-columns:repeat(12,1fr);gap:var(--s6)}}
.night{{background:var(--night);color:var(--nt)}}.night .credit,.night .credit a,.night .muted{{color:var(--nm)}}.night a{{color:var(--nt)}}
.muted{{color:var(--muted)}}.night .light .credit,.night .light .credit a{{color:var(--muted)}}
.byrne line,.byrne path,.byrne circle{{fill:none;stroke-width:6}}
@media (max-width:600px){{.wrap{{padding:0 var(--s4)}}.stoich{{font-size:36px;line-height:44px;letter-spacing:.04em}}.grid{{grid-template-columns:1fr}}.grid>*{{grid-column:1/-1!important}}nav{{gap:var(--s4)}}}}
"""


def byrne_svg(w=360):
    return f'''<svg class="byrne" viewBox="0 0 400 300" width="{w}" role="img" aria-label="Elements I.1 in Byrne's colors: two circles on AB and the equilateral triangle ABC">
<circle cx="150" cy="190" r="100" stroke="{EUC['by_red']}"/><circle cx="250" cy="190" r="100" stroke="{EUC['by_blu']}"/>
<line x1="150" y1="190" x2="250" y2="190" stroke="{EUC['text']}"/><line x1="150" y1="190" x2="200" y2="103.4" stroke="{EUC['by_yel']}"/><line x1="250" y1="190" x2="200" y2="103.4" stroke="{EUC['by_red']}"/></svg>'''


def euclid_header(cur):
    items = [("euclid2-landing.html", "Library"), ("euclid2-proposition.html", "Propositions"), ("euclid2-polymaths.html", "Polymaths")]
    nav = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{n}</a>' for h, n in items)
    return f'<header class="wrap"><a class="brand" href="euclid2-landing.html"><img src="../assets/d7-mho.svg" alt="">bkt</a><nav aria-label="Euclid">{nav}</nav><a class="btn" href="euclid2-proposition.html">Open I.1</a></header>'


def euclid_footer(src, files):
    lis = "".join(f"<li>{credit(src, f)}</li>" for f in files)
    return f'<footer class="night"><div class="wrap" style="display:block;padding:var(--s12) var(--s8)"><p style="font:400 24px/32px var(--disp);letter-spacing:.2em;margin:0 0 var(--s4)">BUILD THE PAST.</p><p class="muted" style="margin:0 0 var(--s4)">Greek text: Heiberg, Euclidis Elementa, 1883. English: Heath, 1908. All images public domain or CC, credited below.</p><ul class="credit" style="margin:0;padding-left:var(--s4)">{lis}</ul><p style="margin:var(--s6) 0 0"><a href="../index.html#screens-euclid">Back to the round 2 deck</a></p></div></footer>'


def page(title, body, extra=""):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{title}</title><link rel="icon" href="../assets/d7-mho.svg" type="image/svg+xml"><link rel="stylesheet" href="{FONTS}"><style>{EUC_CSS}{extra}</style></head><body>{body}</body></html>'


def euclid_landing(src):
    FILES = ["alexandria-von-corven.jpg", "byrne-prop-i1.jpg", "oxyrhynchus-euclid.jpg", "stoichedon-ig-i3-48.jpg", "astrolabe-1654.jpg", "tetradrachm-owl.png"]
    langs, words = polingual_row()
    branch = "".join(f'<li style="display:grid;grid-template-columns:48px 1fr;gap:var(--s3);padding:var(--s3) 0;border-top:1px solid var(--muted)"><span style="font:400 24px/32px var(--disp);color:var(--acc)">{n}</span><span><b>{b}</b><br><span class="muted">{p}, {w}</span></span></li>' for n, b, p, w, _ in BRANCHES)
    wordrow = "".join(f'<li><span lang="{l}" style="font-size:28px;line-height:36px">{e(w)}</span><br><span class="credit">{l}</span></li>' for l, w in words)
    body = f'''{euclid_header("euclid2-landing.html")}
<main>
<section class="wrap grid" style="padding:var(--s12) var(--s8) var(--s16);align-items:end">
<div style="grid-column:1/8"><p class="eyebrow">The Library of Alexandria, rebuilt as a canon</p><h1 class="stoich">Every proof in order</h1>
<p style="font-size:22px;line-height:32px;max-width:36ch">Bucket keeps the foundations the geometers and polymaths wrote down, set in their own letters, with the source for every line.</p>
<p style="display:flex;gap:var(--s4);flex-wrap:wrap"><a class="btn" href="euclid2-proposition.html">Begin the Elements</a><a class="btn ghost" href="euclid2-polymaths.html">Meet the polymaths</a></p></div>
<figure style="grid-column:8/13;margin:0"><img src="../assets/alexandria-von-corven.jpg" alt="The Great Library of Alexandria, 19th century engraving by O. Von Corven: scholars among shelves of scrolls under a colonnade" style="width:100%;height:auto"><figcaption class="credit">A 19th-century imagining of the Library. {credit(src, "alexandria-von-corven.jpg")}</figcaption></figure>
</section>
<section class="night"><div class="wrap grid" style="padding:var(--s16) var(--s8)">
<div style="grid-column:1/6"><p class="eyebrow" style="color:var(--yel)">Proposition I.1</p><p lang="grc" style="font:400 32px/44px var(--disp);margin:0 0 var(--s4)">Ἐπὶ τῆς δοθείσης εὐθείας πεπερασμένης τρίγωνον ἰσόπλευρον συστήσασθαι.</p><p class="muted">On a given finite straight line to construct an equilateral triangle. Heiberg's Greek, Heath's English.</p></div>
<div class="light" style="grid-column:7/13;background:var(--bg);padding:var(--s6);display:grid;grid-template-columns:1fr 1fr;gap:var(--s4);align-items:start"><figure style="margin:0">{byrne_svg(260).replace('width="260"','width="100%"')}<figcaption class="credit" style="color:var(--muted)">Drawn in code in Byrne's red, yellow and blue.</figcaption></figure><figure style="margin:0"><img src="../assets/byrne-prop-i1.jpg" alt="Byrne 1847, Book I Proposition I, the printed plate" width="1920" height="2519" style="width:100%;height:auto"><figcaption class="credit" style="color:var(--muted)">{credit(src, "byrne-prop-i1.jpg")}</figcaption></figure></div>
</div></section>
<section class="wrap grid" style="padding:var(--s16) var(--s8)">
<div style="grid-column:1/6"><p class="eyebrow">Seven branches</p><h2 style="font:400 40px/48px var(--disp);margin:0 0 var(--s6)">One polymath at the door of each branch</h2><ol style="list-style:none;margin:0;padding:0">{branch}</ol></div>
<div style="grid-column:7/13"><figure style="margin:0 0 var(--s8)"><img src="../assets/stoichedon-ig-i3-48.jpg" alt="IG I³ 48, an Athenian sacred law cut in stoichedon, letters aligned on a grid" width="1280" height="960" style="width:100%;height:auto"><figcaption class="credit">{credit(src, "stoichedon-ig-i3-48.jpg")}</figcaption></figure>
<p class="eyebrow">Thirty-five languages</p><p>One word, the way each tradition wrote it. Polingual's baked subset carries {len(langs)} of the 35 languages in the full index.</p><ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:var(--s6)">{wordrow}</ul><p class="credit">Words from Wiktionary via Kaikki, CC BY-SA.</p></div>
</section>
<section class="wrap grid" style="padding:0 var(--s8) var(--s16)">
<figure style="grid-column:1/-1;margin:0 0 var(--s8)"><img src="../assets/oxyrhynchus-euclid.jpg" alt="P. Oxy. I 29, a papyrus fragment of Euclid's Elements Book II with a figure" width="1694" height="1032" style="width:100%;height:auto;max-height:480px;object-fit:cover"><figcaption class="credit">{credit(src, "oxyrhynchus-euclid.jpg")}</figcaption></figure>
<figure style="grid-column:1/5;margin:0"><img src="../assets/astrolabe-1654.jpg" alt="Planispheric astrolabe, brass, 1654" width="468" height="625" style="width:100%;height:auto"><figcaption class="credit">{credit(src, "astrolabe-1654.jpg")}</figcaption></figure>
<div style="grid-column:6/13;align-self:center"><p class="eyebrow">Instruments</p><h2 style="font:400 40px/48px var(--disp);margin:0 0 var(--s4)">Read the sky with the tools that measured it</h2><p>Hipparchus and Ptolemy set out the stereographic projection behind the astrolabe. The canon links each instrument to the proposition that makes it work.</p><img src="../assets/tetradrachm-owl.png" alt="Athenian silver tetradrachm, Athena and her owl" width="670" height="311" style="max-width:320px;height:auto"><p class="credit">{credit(src, "tetradrachm-owl.png")}</p></div>
</section>
</main>
{euclid_footer(src, FILES)}'''
    return page("Ideal Euclid", body)


def euclid_prop(src):
    FILES = ["byrne-prop-i1.jpg", "vat-gr-190.jpg"]
    proof = heiberg()
    css = ".proof{margin:0;padding:0;counter-reset:p;list-style:none}.proof li{counter-increment:p;display:grid;grid-template-columns:48px 1fr;gap:var(--s3);padding:var(--s4) 0;border-top:1px solid var(--muted)}.proof li::before{content:counter(p);font:400 24px/32px var(--disp);color:var(--acc);grid-row:span 2}.grc-t{font:400 22px/32px var(--disp);margin:0}.en-t{margin:var(--s1) 0 0;color:var(--muted)}.sticky{position:sticky;top:var(--s4)}@media (max-width:600px){.sticky{position:static}}"
    body = f'''{euclid_header("euclid2-proposition.html")}
<main class="wrap grid" style="padding:var(--s8) var(--s8) var(--s16)">
<div style="grid-column:1/-1"><p class="eyebrow">Book I, Proposition 1</p><h1 class="stoich" style="font-size:48px;line-height:56px">Equilateral triangle</h1></div>
<section style="grid-column:1/8" aria-label="Proof column">{proof}<p style="margin-top:var(--s6)"><a class="btn" href="euclid2-polymaths.html">Next: who used it</a></p></section>
<aside style="grid-column:9/13"><div class="sticky"><div style="background:var(--surf);padding:var(--s4)">{byrne_svg(400).replace('width="400"','width="100%"')}</div>
<figure style="margin:var(--s6) 0 0"><img src="../assets/byrne-prop-i1.jpg" alt="Byrne 1847, Book I Proposition I, the printed page" width="1920" height="2519" style="width:100%;height:auto"><figcaption class="credit">{credit(src, "byrne-prop-i1.jpg")}</figcaption></figure>
<figure style="margin:var(--s6) 0 0"><img src="../assets/vat-gr-190.jpg" alt="Vat. gr. 190, a ninth century manuscript of the Elements at I.47" width="1920" height="1179" style="width:100%;height:auto"><figcaption class="credit">{credit(src, "vat-gr-190.jpg")}</figcaption></figure></div></aside>
</main>
{euclid_footer(src, FILES)}'''
    return page("Euclid I.1", body, css)


def euclid_polymaths(src):
    FILES = [x[4] for x in BRANCHES]
    cards = "".join(f'<li style="grid-column:span 4;background:var(--surf);padding:var(--s6);border-top:4px solid var(--acc)"><figure style="margin:0 0 var(--s4)"><img src="../assets/{img}" alt="{e(src[img]["title"])}" style="width:100%;height:240px;object-fit:cover;object-position:top"><figcaption class="credit">{credit(src, img)}</figcaption></figure><p class="eyebrow">{n} · {b}</p><h2 style="font:400 28px/36px var(--disp);margin:0 0 var(--s2)">{p}</h2><p class="muted" style="margin:0 0 var(--s4)">{w}</p><a href="euclid2-proposition.html">Read the source</a></li>' for n, b, p, w, img in BRANCHES)
    body = f'''{euclid_header("euclid2-polymaths.html")}
<main class="wrap" style="padding:var(--s8) var(--s8) var(--s16)">
<p class="eyebrow">The polymaths of Alexandria</p><h1 class="stoich" style="font-size:48px;line-height:56px">Seven branches, seven doors</h1>
<p style="max-width:56ch">Each branch of the canon opens on a polymath of the Alexandrian tradition. Their texts sit beside the axioms they set down.</p>
<ol class="grid" style="list-style:none;padding:0;margin:var(--s8) 0 0">{cards}</ol>
</main>
{euclid_footer(src, FILES)}'''
    return page("Euclid Polymaths", body)


SLIDE_CSS = f""":root{{--bg:{DECK['bg']};--surf:{DECK['surf']};--text:{DECK['text']};--muted:{DECK['muted']};--acc:{DECK['acc']};--onacc:{DECK['onacc']};--knob:{DECK['knob']};--gold:{DECK['gold']};--ink:{DECK['ink']};--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s6:24px;--s8:32px;--s12:48px;--s16:64px;--disp:'Jost',sans-serif;--body:'IBM Plex Sans','Noto Serif Hebrew','Noto Serif Devanagari','Noto Serif SC',sans-serif;--mono:'Space Mono',monospace;--ease:cubic-bezier(.2,0,0,1)}}
*{{box-sizing:border-box}}html,body{{margin:0;height:100%}}body{{background:var(--bg);color:var(--text);font:400 18px/28px var(--body);overflow:hidden}}a{{color:var(--acc)}}
.deck{{position:fixed;inset:0 0 40px 0}}.slide{{position:absolute;inset:0;padding:var(--s12) var(--s16);overflow-y:auto;overflow-x:hidden;opacity:0;visibility:hidden;transform:translateX(24px);transition:opacity 240ms var(--ease),transform 240ms var(--ease),visibility 0s 240ms}}.slide.on{{opacity:1;visibility:visible;transform:none;transition:opacity 240ms var(--ease),transform 240ms var(--ease)}}
.plate{{background:var(--bg);padding:var(--s6);box-shadow:0 0 0 var(--s4) var(--bg)}}.slide.tex{{background-image:url(assets/girih.svg);background-size:120px}}
h1{{font:700 64px/72px var(--disp);margin:0 0 var(--s6);letter-spacing:-.01em}}h2{{font:700 40px/48px var(--disp);margin:0 0 var(--s4)}}h3{{font:700 20px/28px var(--disp);margin:var(--s6) 0 var(--s2)}}
.k{{font:700 13px/24px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 var(--s4)}}.k b{{display:inline-block;background:var(--knob);color:var(--ink);padding:0 var(--s2);margin-right:var(--s2)}}
.cols{{display:grid;grid-template-columns:repeat(12,1fr);gap:var(--s8)}}.c5{{grid-column:span 5}}.c6{{grid-column:span 6}}.c7{{grid-column:span 7}}.c12{{grid-column:1/-1}}.c4{{grid-column:span 4}}.c8{{grid-column:span 8}}
.lede{{font-size:24px;line-height:36px;max-width:40ch}}.card{{background:var(--surf);padding:var(--s6)}}.marks{{display:flex;gap:var(--s6);flex-wrap:wrap;align-items:flex-end}}.marks figure{{margin:0;text-align:center}}.marks img{{width:160px;height:160px;background:var(--surf)}}.marks figcaption{{font:400 13px/20px var(--mono);color:var(--muted)}}
.dim img{{opacity:.35;filter:grayscale(1)}}
.quote.one{{columns:1;max-width:72ch}}.quote{{columns:2;column-gap:var(--s12);font-size:16px;line-height:24px}}.quote h1{{font-size:40px;line-height:48px}}.quote h2{{font-size:24px;line-height:32px;column-span:all}}.quote h3{{break-after:avoid}}.quote li{{margin-bottom:var(--s2);break-inside:avoid}}
.rail{{position:fixed;left:0;right:0;bottom:0;height:40px;background:var(--ink);display:flex;align-items:center;gap:var(--s1);padding:0 var(--s4)}}.rail a{{flex:1;height:8px;background:#55544F;border-radius:0}}.rail a[aria-current]{{background:var(--knob)}}.rail a.done{{background:var(--bg)}}.rail span{{color:var(--bg);font:400 13px/16px var(--mono);margin-left:var(--s3);white-space:nowrap}}.rail .top{{flex:none;height:auto;background:none;color:var(--bg);font:400 13px/16px var(--mono);text-decoration:underline;margin-right:var(--s3)}}
.frame{{position:relative;width:100%;background:var(--surf);overflow:hidden;outline:1px solid var(--muted)}}.frame iframe{{position:absolute;left:0;top:0;border:0;transform-origin:0 0}}.frame .ph{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:400 16px/24px var(--mono);color:var(--muted);text-align:center;padding:var(--s6)}}
.tiles{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--s4);list-style:none;padding:0;margin:0}}
.btn{{display:inline-flex;align-items:center;min-height:48px;padding:var(--s3) var(--s6);background:var(--acc);color:var(--onacc);text-decoration:none;font:600 16px/24px var(--body)}}
.squig{{display:inline-flex;align-items:center;min-height:48px;padding:var(--s3) var(--s6);background:#58CC02;color:#173600;border-radius:16px;box-shadow:0 4px 0 #3E8F02;font:700 18px/24px 'Fredoka',sans-serif;text-decoration:none}}
.cut{{background:linear-gradient(135deg,var(--surf) 0 46%,#C7CBD1 46% 50%,#8D939B 50% 54%,var(--surf) 54%);}}
.knob{{width:96px;height:96px;border-radius:50%;background:var(--knob);position:relative;box-shadow:0 0 0 2px var(--ink),inset 0 -6px 0 rgba(0,0,0,.18)}}.knob::after{{content:"";position:absolute;left:50%;top:12px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:var(--gold)}}
.spin{{animation:spin 24s linear infinite}}@keyframes spin{{to{{background-position:120px 120px}}}}
@media (prefers-reduced-motion:reduce){{.slide,.slide.on{{transition:none;transform:none}}.spin{{animation:none}}}}
@media (max-width:600px){{.slide{{padding:var(--s6) var(--s4) var(--s12)}}h1{{font-size:36px;line-height:44px}}h2{{font-size:28px;line-height:36px}}.lede{{font-size:20px;line-height:28px}}.cols{{grid-template-columns:1fr;gap:var(--s6)}}.cols>*{{grid-column:1/-1}}.quote{{columns:1}}.marks{{gap:var(--s3)}}.marks img{{width:88px;height:88px}}.rail span{{display:none}}h1{{font-size:28px;line-height:36px}}.lede{{font-size:16px;line-height:24px}}.quote{{font-size:14px;line-height:20px}}.tiles{{grid-template-columns:1fr 1fr;gap:var(--s1) var(--s3);font-size:14px;line-height:20px}}.cut{{height:96px!important}}.knob{{width:64px;height:64px}}.slide p{{margin:0 0 var(--s3)}}}}
"""

JS = r"""
const S=[...document.querySelectorAll('.slide')],R=document.querySelector('.rail'),N=document.getElementById('n');
S.forEach((s,i)=>{const a=document.createElement('a');a.href='#'+s.id;a.setAttribute('aria-label',(i+1)+': '+s.dataset.t);R.insertBefore(a,N)});
const L=[...R.querySelectorAll('a:not(.top)')];
function go(i,push){i=Math.max(0,Math.min(S.length-1,i));S.forEach((s,j)=>{s.classList.toggle('on',j===i);s.setAttribute('aria-hidden',j!==i)});L.forEach((a,j)=>{a.classList.toggle('done',j<i);j===i?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current')});N.textContent=(i+1)+' / '+S.length+'  '+S[i].dataset.t;cur=i;if(push!==false&&location.hash!=='#'+S[i].id)history.replaceState(null,'','#'+S[i].id);fit()}
let cur=0;
function fromHash(){const id=location.hash.slice(1);const i=S.findIndex(s=>s.id===id||s.querySelector('[id="'+id+'"]'));go(i<0?0:i,false)}
addEventListener('hashchange',fromHash);
addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();go(cur+1)}else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(cur-1)}else if(e.key==='Home')go(0);else if(e.key==='End')go(S.length-1)});
function fit(){document.querySelectorAll('.slide.on .frame').forEach(f=>{const i=f.querySelector('iframe');f.style.width='';const m=innerWidth<=600;const w=m?390:1440,h=m?844:900;const s=f.closest('.slide'),cs=getComputedStyle(s),avail=s.clientHeight-parseFloat(cs.paddingBottom)-(f.getBoundingClientRect().top-s.getBoundingClientRect().top)-64;const sc=Math.min(f.clientWidth/w,avail/h);f.style.width=(w*sc)+'px';f.style.height=(h*sc)+'px';if(i){i.width=w;i.height=h;i.style.transform='scale('+sc+')'}})}
addEventListener('resize',fit);fromHash();
"""


def frame(path, label):
    exists = os.path.exists(os.path.join(ROUND2, path))
    inner = f'<iframe src="{path}" title="{e(label)}" loading="lazy"></iframe>' if exists else f'<div class="ph">{e(label)}: building, file {e(path)} lands from the Grid-Primitive agent</div>'
    link = f'<p class="k"><a href="{path}">Open {e(label)} full size</a></p>' if exists else ""
    return f'<div class="frame">{inner}</div>{link}'


GRID2_ORDER = ["landing", "canon-search", "app-learn", "study", "review", "quiz", "progress", "settings", "signin", "math", "game", "motion", "marks", "dot", "texture"]


def grid2_screens():
    found = sorted(os.path.relpath(p, ROUND2) for p in glob.glob(os.path.join(S, "grid2-*.html")))
    def key(p):
        b = os.path.basename(p)[6:-5]
        for i, w in enumerate(GRID2_ORDER):
            if b.startswith(w):
                return (i, b)
        return (99, b)
    found.sort(key=key)
    if found:
        return [(p, "Grid-Primitive " + os.path.basename(p)[6:-5].replace("-", " ")) for p in found]
    return [(f"screens/grid2-{w}.html", f"Grid-Primitive {w}") for w in GRID2_ORDER]


def slides(src):
    head, notes = feedback()
    out = []
    def add(id_, t, body, cls=""):
        out.append(f'<section class="slide {cls}" id="{id_}" data-t="{e(t)}" aria-label="{e(t)}">{body}</section>')
    add("cover", "Round 2", f'''<div class="cols" style="min-height:100%;align-content:center"><div class="c7 plate"><p class="k"><b>R2</b>bkt brand, round 2, 2026-10-21</p><h1>Grid-Primitive, with a young-learner register and an ideal Euclid</h1><p class="lede">The founder's ranking and notes, the seven decisions they produced, then every screen at 1440 and 390.</p><p class="k">Arrow keys or the rail below. Each slide has its own link.</p><p><a href="../_directions/index.html">Round 1: the seven directions</a></p></div><div class="c5 marks"><figure><img src="assets/grid-primitive-knob.svg" alt="Grid's mho with Primitive's orange knob and gold dot"><figcaption>Grid-Primitive ℧</figcaption></figure></div></div>''', "tex")
    add("feedback", "Founder ranking", f'<p class="k"><b>01</b>Verbatim from brand/_round2/FOUNDER-FEEDBACK.md</p><div class="quote one">{head}</div>')
    for j, part in enumerate(notes):
        add(f"feedback-notes-{j + 1}", f"Founder notes {j + 1}", f'<p class="k"><b>02</b>Verbatim notes, part {j + 1} of {len(notes)}</p><div class="quote one">{part}</div>')
    dec = [
        ("d-base", "Grid-Primitive base", "Base: Grid's structure, Primitive's play", "Grid and Primitive rank top two, and the notes lean Primitive. Grid alone reads too strict. The base keeps Grid's 16-column Swiss grid, its ℧ and its b, and takes Primitive's shapes, colors and knob for play. Copy calls it Grid-Primitive; files stay grid2-*.", '<div class="marks"><figure><img src="assets/d1-mho.svg" alt="Grid mho"><figcaption>Grid</figcaption></figure><figure><img src="assets/d6-mho.svg" alt="Primitive mho"><figcaption>Primitive</figcaption></figure><figure><img src="assets/grid-primitive-knob.svg" alt="Grid-Primitive mho"><figcaption>Grid-Primitive</figcaption></figure></div>'),
        ("d-young", "Young-learner register", "Young learners get disciplined chaos", "Squiggle has the best buttons and the energy for young learners. Merged with Primitive's structure it becomes disciplined chaos. The register switches the Polingual study screens and leaves every frozen flow as it is.", '<p><a class="squig" href="#screens-grid2">Keep going</a></p><p class="k">Squiggle button, 16px radius, 4px lip</p><div class="marks"><figure><img src="assets/d3-mho.svg" alt="Squiggle mho"><figcaption>Squiggle</figcaption></figure><figure><img src="assets/d6-mho.svg" alt="Primitive mho"><figcaption>Primitive</figcaption></figure></div>'),
        ("d-wedge", "Wedge as accent", "Wedge cuts in as an accent", "Wedge never becomes the base. Its ℧ and its diagonal stay, the metal tool cutting through a map, shiny, plus its punk, steampunk and solarpunk energy as a subtle-punk b variant.", '<p class="k">Diagonal cut, brushed steel on paper</p><div class="card cut" style="height:200px"></div><div class="marks" style="margin-top:var(--s6)"><figure><img src="assets/d4-mho.svg" alt="Wedge mho"><figcaption>Wedge ℧</figcaption></figure><figure><img src="assets/grid2/marks/b-punk.svg" alt="Subtle-punk b, Grid b cut on the Wedge diagonal"><figcaption>subtle-punk b</figcaption></figure><figure><img src="assets/grid2/marks/b-solar.svg" alt="Solarpunk b"><figcaption>solarpunk b</figcaption></figure></div>'),
        ("d-euclid", "Ideal Euclid", "Euclid becomes the polymath direction", "Round 1's Euclid fell short. Ideal Euclid rebuilds it around the Library of Alexandria, the geometers and the polymaths, from public-domain sources: papyri, Byrne, stoichedon, a Met astrolabe. One landing and two app screens follow.", f'<figure style="margin:0"><img src="assets/oxyrhynchus-euclid.jpg" alt="P. Oxy. I 29, papyrus fragment of the Elements" style="width:100%;height:auto"><figcaption class="k" style="text-transform:none;letter-spacing:0">{credit(src, "oxyrhynchus-euclid.jpg")}</figcaption></figure><p><a class="btn" href="#screens-euclid">See ideal Euclid</a></p>'),
        ("d-girih", "Girih texture and motion", "Girih supplies texture and motion", "One Girih pattern system, ten-fold stars and decagons on a 120px tile, sits behind Grid-Primitive as an optional background and drifts as its motion layer. The pattern is computed in code.", '<div class="card spin" style="height:320px;background-image:url(assets/girih.svg);background-size:120px"></div><p class="k">Drifts 120px in 24s; stops under reduced motion</p>'),
        ("d-kamon", "Kamon dropped", "Kamon is dropped", "Its mark read as unclear: a red dot, a b and a bucket that did not cohere. Nothing from Kamon carries into round 2.", '<div class="marks dim"><figure><img src="assets/d2-mho.svg" alt="Kamon mho, dropped"><figcaption>Kamon, dropped</figcaption></figure></div>'),
        ("d-dot", "Primitive's dot", "The dot is the knob", "The dot comes from Teenage Engineering: Bucket as an instrument you play. It is the knob you turn. In Grid-Primitive the knob is Teenage Engineering orange and carries the gold dot of the live InverseOmega in src/components/InverseOmega.tsx. Primitive's ℧ stays available as an alternate mark inside Grid-Primitive.", '<div class="marks"><figure><img src="assets/d6-mho.svg" alt="Primitive mho with the dot"><figcaption>with the dot</figcaption></figure><figure><img src="assets/d6-mho-nodot.svg" alt="Primitive mho without the dot"><figcaption>without the dot</figcaption></figure><figure><img src="assets/d6-mho-knob.svg" alt="Primitive mho with the orange knob and gold dot"><figcaption>as the knob</figcaption></figure></div><div class="knob" role="img" aria-label="Orange knob with a gold dot" style="margin-top:var(--s6)"></div>'),
    ]
    for i, (id_, t, h, p, vis) in enumerate(dec, 1):
        add(id_, t, f'<div class="cols"><div class="c5"><p class="k"><b>D{i}</b>Decision {i} of 7</p><h2>{h}</h2><p class="lede">{p}</p></div><div class="c7">{vis}</div></div>')
    g = grid2_screens()
    tiles = "".join(f'<li><a href="#g-{i}">{e(l)}</a></li>' for i, (p, l) in enumerate(g))
    add("screens-grid2", "Grid-Primitive screens", f'<p class="k"><b>S</b>Screens</p><h2>Grid-Primitive, every screen at 1440 and 390</h2><ul class="tiles">{tiles}</ul>')
    for i, (p, l) in enumerate(g):
        add(f"g-{i}", l, f'<p class="k"><b>G{i + 1}</b>{e(l)}</p>{frame(p, l)}')
    add("screens-euclid", "Ideal Euclid", '<p class="k"><b>E</b>Ideal Euclid</p><h2>The Library, the propositions, the polymaths</h2><p class="lede">One landing and two app screens, real sources only.</p>')
    for i, (p, l) in enumerate([("screens/euclid2-landing.html", "Euclid landing"), ("screens/euclid2-proposition.html", "Euclid proposition"), ("screens/euclid2-polymaths.html", "Euclid polymaths")]):
        add(f"e-{i}", l, f'<p class="k"><b>E{i + 1}</b>{l}</p>{frame(p, l)}')
    add("end", "Back to round 1", '<div class="plate" style="max-width:640px"><h2>Pick again</h2><p class="lede">Every round 1 direction stays on the directions page.</p><p><a class="btn" href="../_directions/index.html">Open round 1</a></p></div>', "tex")
    return "\n".join(out)


def deck(src):
    return f'''<!doctype html><!-- voice-ignore-file: slides 1 and 2 quote FOUNDER-FEEDBACK.md verbatim --><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>bkt Round 2</title><link rel="icon" href="assets/grid-primitive-knob.svg" type="image/svg+xml"><link rel="stylesheet" href="{FONTS}"><style>{SLIDE_CSS}</style></head><body>
<main class="deck">{slides(src)}</main>
<nav class="rail" aria-label="Slides"><a class="top" href="../_directions/index.html">Round 1</a><span id="n"></span></nav>
<script>{JS}</script></body></html>'''


def main():
    copy_assets()
    src = sources()
    os.makedirs(S, exist_ok=True)
    for name, fn in (("euclid2-landing.html", euclid_landing), ("euclid2-proposition.html", euclid_prop), ("euclid2-polymaths.html", euclid_polymaths)):
        open(os.path.join(S, name), "w", encoding="utf-8").write(fn(src))
    open(os.path.join(ROUND2, "index.html"), "w", encoding="utf-8").write(deck(src))
    print("round2 built", len(grid2_screens()), "grid2 slots")


if __name__ == "__main__":
    main()
