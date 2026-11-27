#!/usr/bin/env python3
import os, re, html, sys, json, time, subprocess
import markdown

REPORTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(REPORTS)
REPO = os.path.dirname(ROOT)
QUANTUM = os.path.join(REPO, "quantum")
OUT_HTML = os.path.join(ROOT, "FINANCE-ATLAS.html")
OUT_PDF = os.path.join(ROOT, "FINANCE-ATLAS.pdf")
SITE = os.path.join(REPORTS, "site")
PDF_DIR = os.path.join(REPORTS, "pdf")
KATEX_REL = "vendor/katex"

SKIP_DIRS = {".venv", "node_modules", "__pycache__", "code", "data", ".git", "_pdf", "_search", "_tools",
             "transcripts", "thumbnails", ".pytest_cache"}
SKIP_NAME = re.compile(r"transcript", re.I)
CHAPTER_RE = re.compile(r"^(\d\d)-(.+)$")
WORD_RE = re.compile(r"\S+")
LAB_FILES = ["RESULTS.md", "RESULTS-100.md"]

MATH_RE = re.compile(r"(```.*?```|~~~.*?~~~|`[^`\n]*`)|\\\[(.+?)\\\]|\\\((.{1,600}?)\\\)", re.S)
PH_RE = re.compile(r"ZZMATH(\d+)ZZ")
HEAD_RE = re.compile(r"<h([1-4]) id=\"([^\"]+)\">(.*?)</h\1>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def words(text):
    return len(WORD_RE.findall(text))


def read(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def walk_md(base):
    found = []
    for dp, dns, fns in os.walk(base):
        dns[:] = sorted(d for d in dns if d not in SKIP_DIRS)
        for fn in sorted(fns):
            if fn.endswith(".md") and not SKIP_NAME.search(fn):
                found.append(os.path.join(dp, fn))
    return found


def slug(s):
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-")


def split_title(text, fallback):
    lines = text.lstrip().split("\n")
    if lines and lines[0].startswith("#"):
        title = lines[0].lstrip("# ").strip()
        return (title or fallback), "\n".join(lines[1:]).lstrip()
    return fallback, text


def quantum_totals():
    files = walk_md(QUANTUM)
    return len(files), sum(words(read(p)) for p in files)


def collect():
    secs = []
    for name in sorted(os.listdir(ROOT)):
        m = CHAPTER_RE.match(name)
        base = os.path.join(ROOT, name)
        if m and os.path.isdir(base):
            paths = walk_md(base)
            secs.append({"num": m.group(1), "folder": name, "title": m.group(2).replace("-", " ").title(),
                         "base": base, "paths": paths})
    lab = os.path.join(ROOT, "lab")
    lp = [os.path.join(lab, n) for n in LAB_FILES if os.path.exists(os.path.join(lab, n))]
    if lp:
        secs.append({"num": "L", "folder": "lab", "title": "Lab Results", "base": lab, "paths": lp})
    for s in secs:
        s["words"] = 0
        for p in s["paths"]:
            s["words"] += words(read(p))
        s["files"] = len(s["paths"])
        s["page"] = "ch-" + s["num"].lower() + ".html"
    return secs


def render_chapter(sec, mode):
    maths = []

    def protect(text):
        def sub(m):
            if m.group(1) is not None:
                return m.group(1)
            if m.group(2) is not None:
                maths.append((m.group(2), True))
            else:
                maths.append((m.group(3), False))
            return f"ZZMATH{len(maths) - 1}ZZ"
        return MATH_RE.sub(sub, text)

    entries = []
    for p in sec["paths"]:
        text = read(p)
        rel = os.path.relpath(p, sec["base"])
        eid = "f-" + slug(os.path.relpath(p, ROOT))
        title, body = split_title(text, os.path.splitext(os.path.basename(p))[0])

        def slugify(value, sep, eid=eid):
            return eid + "--" + (re.sub(r"[^\w\s-]", "", value).strip().lower().replace(" ", sep) or "h")

        md = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "toc"],
                               extension_configs={"toc": {"slugify": slugify}})
        entries.append({"rel": rel, "id": eid, "title": title, "words": words(text),
                        "html": md.convert(protect(body))})

    rendered = None
    if mode == "pdf" and maths:
        payload = json.dumps([{"tex": t, "display": d} for t, d in maths])
        r = subprocess.run(["node", os.path.join(REPORTS, "katex_render.js")], input=payload,
                           capture_output=True, text=True, check=True)
        rendered = json.loads(r.stdout)

    def restore(s, raw=False):
        def sub(m):
            tex, disp = maths[int(m.group(1))]
            if raw:
                return html.escape(("\\[%s\\]" if disp else "\\(%s\\)") % tex)
            if rendered is not None:
                return rendered[int(m.group(1))]
            return html.escape(("\\[%s\\]" if disp else "\\(%s\\)") % tex)
        return PH_RE.sub(sub, s)

    search = []
    for e in entries:
        e["html"] = restore(e["html"])
        search.append([e["title"], "", sec["num"], f'{sec["page"]}#{e["id"]}'])
        for lvl, hid, inner in HEAD_RE.findall(e["html"]):
            t = html.unescape(TAG_RE.sub("", inner)).strip()
            if t and t != e["title"]:
                search.append([e["title"], t, sec["num"], f'{sec["page"]}#{hid}'])
    return entries, search, bool(maths) and mode == "web"


def chapter_html(sec, entries):
    out = [f'<section class="chapter" id="{sec["folder"]}"><div class="kick">Chapter {html.escape(sec["num"])}'
           f' &middot; {sec["files"]:,} files &middot; {sec["words"]:,} words</div>'
           f'<h1 class="ch-title">{html.escape(sec["title"])}</h1><ol class="chidx">']
    for e in entries:
        out.append(f'<li><a href="#{e["id"]}">{html.escape(e["title"])}</a> <span class="w">{e["words"]:,}</span></li>')
    out.append("</ol>")
    for e in entries:
        out.append(f'<article class="doc" id="{e["id"]}"><div class="src">{html.escape(e["rel"])} '
                   f'&middot; {e["words"]:,} words</div><h2 class="dt">{html.escape(e["title"])}</h2>{e["html"]}</article>')
    out.append("</section>")
    return "".join(out)


def totals(secs):
    return sum(s["files"] for s in secs), sum(s["words"] for s in secs)


def coverage_line(secs):
    qf, qw = quantum_totals()
    tf, tw = totals(secs)
    return (f"Coverage: {tf:,} files and {tw:,} words across {len(secs)} sections, against quantum/ at "
            f"{qf:,} files and {qw:,} words ({100.0 * tf / qf:.0f}% of the files, {100.0 * tw / qw:.0f}% of the words).")


def cover_html(coverage):
    return (f'<div class="cover"><div class="k">Bucket Foundation &middot; finance branch</div>'
            f'<h1>The Finance Atlas</h1>'
            f'<div class="sub">Money history, assets, data sources, quant methods, strategies, software, '
            f'law, people, firms and library, compiled from finance/.</div>'
            f'<div class="stat">{html.escape(coverage)}</div></div>')


def toc_html(secs, coverage, link):
    rows = ['<nav class="toc" id="contents"><h1>Contents</h1><table class="toctab"><thead><tr>'
            '<th>Chapter</th><th>Files</th><th>Words</th><th>Page</th></tr></thead><tbody>']
    for s in secs:
        href = link(s)
        rows.append(f'<tr><td><a class="tl" href="{href}">{html.escape(s["num"])} &middot; {html.escape(s["title"])}</a></td>'
                    f'<td class="n">{s["files"]:,}</td><td class="n">{s["words"]:,}</td>'
                    f'<td class="pg"><a class="pgref" href="{href}"></a></td></tr>')
    tf, tw = totals(secs)
    rows.append(f'<tr class="total"><td>Total</td><td class="n">{tf:,}</td><td class="n">{tw:,}</td><td></td></tr>')
    rows.append(f'</tbody></table><p class="coverage">{html.escape(coverage)}</p></nav>')
    return "".join(rows)


def katex_tags(prefix):
    return (f'<link rel="stylesheet" href="{prefix}{KATEX_REL}/katex.min.css">'
            f'<script defer src="{prefix}{KATEX_REL}/katex.min.js"></script>'
            f'<script defer src="{prefix}{KATEX_REL}/contrib/auto-render.min.js"></script>'
            '<script>window.addEventListener("load",function(){if(window.renderMathInElement)'
            'renderMathInElement(document.body,{delimiters:[{left:"\\\\[",right:"\\\\]",display:true},'
            '{left:"\\\\(",right:"\\\\)",display:false}],throwOnError:false,'
            'ignoredTags:["script","noscript","style","textarea","pre","code"]})})</script>')


def page(title, head_extra, body, css):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title>'
            f'<style>{css}</style>{head_extra}</head><body>{body}</body></html>')


def build_html_and_site(secs):
    coverage = coverage_line(secs)
    os.makedirs(SITE, exist_ok=True)
    big = open(OUT_HTML, "w", encoding="utf-8")
    big_math = False
    all_search = []
    chunks = []
    for s in secs:
        entries, search, has_math = render_chapter(s, "web")
        all_search.extend(search)
        body = chapter_html(s, entries)
        s["has_math"] = has_math
        chunks.append((s, body))
        i = secs.index(s)
        prev = f'<a href="{secs[i - 1]["page"]}">&larr; {html.escape(secs[i - 1]["title"])}</a>' if i else ""
        nxt = f'<a href="{secs[i + 1]["page"]}">{html.escape(secs[i + 1]["title"])} &rarr;</a>' if i + 1 < len(secs) else ""
        nav = f'<div class="sitenav"><a href="index.html">Index</a> {prev} {nxt}</div>'
        extra = katex_tags("../") if has_math else ""
        with open(os.path.join(SITE, s["page"]), "w", encoding="utf-8") as f:
            f.write(page(f'{s["num"]} {s["title"]} | Finance Atlas', extra, nav + body + nav, CSS_BASE + CSS_WEB))
        if has_math:
            big_math = True
        print(f'  html {s["num"]} {s["files"]} files', flush=True)
        s["_body_len"] = len(body)
        chunks[-1] = (s, body)
        if len(chunks) > 0:
            pass
        big_body_path = None
    extra = katex_tags("reports/") if big_math else ""
    head = (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>The Finance Atlas</title>'
            f'<style>{CSS_BASE}{CSS_WEB}</style>{extra}</head><body>')
    big.write(head + cover_html(coverage) + toc_html(secs, coverage, lambda s: "#" + s["folder"]))
    for s, body in chunks:
        big.write(body)
    big.write("</body></html>")
    big.close()
    with open(os.path.join(SITE, "search-index.js"), "w", encoding="utf-8") as f:
        f.write("window.SEARCH=" + json.dumps(all_search, ensure_ascii=False, separators=(",", ":")) + ";")
    idx = (cover_html(coverage) + SEARCH_BOX + toc_html(secs, coverage, lambda s: s["page"]) +
           '<script src="search-index.js"></script><script>' + SEARCH_JS + "</script>")
    with open(os.path.join(SITE, "index.html"), "w", encoding="utf-8") as f:
        f.write(page("The Finance Atlas", "", idx, CSS_BASE + CSS_WEB))
    return coverage, len(all_search)


def pdf_pages(path):
    import pypdf
    return len(pypdf.PdfReader(path).pages)


def build_chapter_pdf(secs, num):
    import weasyprint
    s = next(x for x in secs if x["num"] == num)
    entries, _, _ = render_chapter(s, "pdf")
    body = chapter_html(s, entries)
    out = os.path.join(PDF_DIR, f'finance-atlas-{s["num"].lower()}-{slug(s["folder"]).lower()}.pdf')
    doc = page(f'Finance Atlas {s["num"]} {s["title"]}', f'<link rel="stylesheet" href="{KATEX_REL}/katex.min.css">',
               body, CSS_BASE + CSS_PDF)
    del entries, body
    weasyprint.HTML(string=doc, base_url=REPORTS + "/").write_pdf(out)
    print(f'  pdf {s["num"]} {os.path.getsize(out) // 1024} KB {pdf_pages(out)} pages', flush=True)


def first_paragraphs(path, limit=700):
    _, body = split_title(read(path), "")
    paras = [p.strip() for p in re.split(r"\n\s*\n", body)
             if p.strip() and not p.lstrip().startswith(("#", "|", "```", "-", "*", ">", "1."))]
    out = " ".join(paras[:2])
    return out[:limit].rsplit(" ", 1)[0] + ("..." if len(out) > limit else "")


def summary_source(s):
    top = [p for p in s["paths"] if os.path.dirname(p) == s["base"]]
    for pref in ("README.md", "INDEX.md"):
        for p in top:
            if os.path.basename(p) == pref:
                return p
    return top[0] if top else s["paths"][0]


def build_short_pdf(secs):
    import weasyprint
    coverage = coverage_line(secs)
    parts = [cover_html(coverage), toc_html(secs, coverage, lambda s: "#" + s["folder"])]
    map_sec = next(s for s in secs if s["num"] == "00")
    mp = os.path.join(map_sec["base"], "00-IDEAL-STATE-MAP.md")
    sub = {"num": "00", "folder": "map", "title": "The Ideal State Map", "base": map_sec["base"],
           "paths": [mp], "files": 1, "words": words(read(mp)), "page": ""}
    e, _, _ = render_chapter(sub, "pdf")
    parts.append(chapter_html(sub, e))
    summ = ['<section class="chapter" id="summaries"><div class="kick">Chapter summaries</div>'
            '<h1 class="ch-title">Chapter Summaries</h1>']
    for s in secs:
        names = [os.path.splitext(os.path.basename(p))[0] for p in s["paths"][:10]]
        lead = first_paragraphs(summary_source(s))
        summ.append(f'<div class="summ"><h3>{html.escape(s["num"])} &middot; {html.escape(s["title"])}</h3>'
                    f'<div class="cnt">{s["files"]:,} files &middot; {s["words"]:,} words</div>'
                    f'<p>{html.escape(lead)}</p><p class="ex">Sample entries: {html.escape(", ".join(names))}</p></div>')
    summ.append("</section>")
    parts.append("".join(summ))
    lab = next(s for s in secs if s["num"] == "L")
    rp = os.path.join(lab["base"], "RESULTS-100.md")
    sub2 = {"num": "L", "folder": "results-100", "title": "Lab Results 100", "base": lab["base"],
            "paths": [rp], "files": 1, "words": words(read(rp)), "page": ""}
    e2, _, _ = render_chapter(sub2, "pdf")
    parts.append(chapter_html(sub2, e2))
    doc = page("The Finance Atlas", f'<link rel="stylesheet" href="{KATEX_REL}/katex.min.css">',
               "".join(parts), CSS_BASE + CSS_PDF)
    weasyprint.HTML(string=doc, base_url=REPORTS + "/").write_pdf(OUT_PDF)
    print(f"  short pdf {os.path.getsize(OUT_PDF) // 1024} KB {pdf_pages(OUT_PDF)} pages", flush=True)


def main():
    args = sys.argv[1:]
    secs = collect()
    os.makedirs(PDF_DIR, exist_ok=True)
    if args[:1] == ["--chapter-pdf"]:
        build_chapter_pdf(secs, args[1])
        return
    if args[:1] == ["--short-pdf"]:
        build_short_pdf(secs)
        return
    t0 = time.time()
    if "--no-html" not in args:
        coverage, n = build_html_and_site(secs)
        print(f"wrote {OUT_HTML} ({os.path.getsize(OUT_HTML) // 1024} KB), site, {n} search rows", flush=True)
        print(coverage)
    if "--no-pdf" not in args:
        only = [a for a in args if a.startswith("--only=")]
        nums = only[0][7:].split(",") if only else [s["num"] for s in secs]
        for n in nums:
            subprocess.run(["nice", "-n", "10", sys.executable, os.path.abspath(__file__), "--chapter-pdf", n], check=True)
        subprocess.run(["nice", "-n", "10", sys.executable, os.path.abspath(__file__), "--short-pdf"], check=True)
    tf, tw = totals(secs)
    print(f"{tf} files, {tw} words, {time.time() - t0:.0f}s")
    for s in secs:
        print(f'  {s["num"]:>2} {s["folder"]:<20} {s["files"]:>5} files {s["words"]:>8} words')


SEARCH_BOX = ('<div class="searchbox"><input id="q" type="search" placeholder="Search titles and headings" autocomplete="off">'
              '<div id="res"></div></div>')

SEARCH_JS = r"""
(function(){
var q=document.getElementById('q'),res=document.getElementById('res'),D=window.SEARCH||[],t;
function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function run(){
 var terms=q.value.toLowerCase().split(/\s+/).filter(Boolean);
 if(!terms.length){res.innerHTML='';return}
 var hits=[],i,r,hay,j,ok,score;
 for(i=0;i<D.length&&hits.length<400;i++){
  r=D[i];hay=(r[0]+' '+r[1]).toLowerCase();ok=true;
  for(j=0;j<terms.length;j++){if(hay.indexOf(terms[j])<0){ok=false;break}}
  if(ok){score=r[1]===''?0:1;hits.push([score,r])}
 }
 hits.sort(function(a,b){return a[0]-b[0]});
 hits=hits.slice(0,60);
 res.innerHTML=hits.length?'<ol>'+hits.map(function(h){var r=h[1];
  return '<li><a href="'+r[3]+'">'+esc(r[1]||r[0])+'</a> <span class="w">'+esc(r[0])+' &middot; ch '+esc(r[2])+'</span></li>'}).join('')+'</ol>':'<p>No matches.</p>';
}
q.addEventListener('input',function(){clearTimeout(t);t=setTimeout(run,120)});
})();
"""

CSS_BASE = r"""
html{font-size:9.6pt}
body{margin:0;font-family:Charter,Georgia,"Times New Roman",serif;color:#1a1a17;background:#fbfaf5;line-height:1.42}
h1,h2,h3,h4{font-family:"Helvetica Neue",Arial,sans-serif;color:#10140c;line-height:1.15}
h1{font-size:17pt}
h2{font-size:13pt;margin:14pt 0 5pt;border-bottom:1.5px solid #4f7a3a;padding-bottom:3pt;break-after:avoid}
h3{font-size:11pt;margin:11pt 0 3pt;color:#2f5220;break-after:avoid}
h4{font-size:9.6pt;margin:8pt 0 2pt;break-after:avoid}
p{margin:0 0 6pt}
a{color:#2f5220;text-decoration:none}
code{font-family:Consolas,"DejaVu Sans Mono",monospace;font-size:.82em;background:#eef0e4;padding:0 2px}
pre{background:#eef0e4;border:1px solid #d8dcc8;padding:6pt 8pt;font-size:7.6pt;white-space:pre-wrap;overflow-wrap:anywhere}
pre code{background:none;padding:0}
blockquote{margin:7pt 0;padding:5pt 10pt;border-left:3px solid #4f7a3a;background:#f2f4e8}
ul,ol{margin:4pt 0 7pt;padding-left:16pt}li{margin-bottom:2pt}
table{width:100%;border-collapse:collapse;margin:7pt 0;font-size:7.8pt}
th{background:#26301c;color:#f1f3e6;text-align:left;padding:3pt 5pt;font-size:7pt}
td{padding:3pt 5pt;border-bottom:.5px solid #dcdfcc;vertical-align:top;overflow-wrap:anywhere}
.cover{background:#10140c;color:#f1f3e6;padding:50mm 26mm;box-sizing:border-box}
.cover .k{font-family:"Helvetica Neue",sans-serif;font-size:9pt;letter-spacing:.3em;text-transform:uppercase;color:#8fbf6f}
.cover h1{font-size:42pt;color:#fff;margin:12pt 0 0}
.cover .sub{font-size:13pt;color:#c4cbb0;font-style:italic;margin-top:14pt;max-width:32rem}
.cover .stat{font-family:"Helvetica Neue",sans-serif;font-size:8.5pt;color:#8fbf6f;margin-top:24pt;max-width:34rem}
.toctab td.n,.toctab th:nth-child(2),.toctab th:nth-child(3){text-align:right}
.toctab .total td{font-weight:700;border-top:1.5px solid #26301c}
.coverage{font-family:"Helvetica Neue",sans-serif;font-size:8.5pt;color:#2f5220;margin-top:10pt}
.chapter .kick{font-family:"Helvetica Neue",sans-serif;font-size:8pt;letter-spacing:.16em;text-transform:uppercase;color:#4f7a3a}
.ch-title{font-size:24pt;margin:2pt 0 10pt;padding-bottom:6pt;border-bottom:2px solid #10140c}
.chidx{font-size:8pt;columns:2;column-gap:1.4rem;padding-left:14pt;margin-bottom:10pt}
.chidx li{break-inside:avoid}
.chidx .w{color:#888;font-size:7pt}
.doc .src{font-family:"DejaVu Sans Mono",monospace;font-size:6.6pt;color:#7a8a6a;overflow-wrap:anywhere}
.doc .dt{font-size:14pt;margin-top:2pt}
.summ{break-inside:avoid;margin-bottom:10pt}
.summ .cnt{font-family:"Helvetica Neue",sans-serif;font-size:7.5pt;color:#7a8a6a}
.summ .ex{font-size:8pt;color:#555}
img,svg{max-width:100%}
"""

CSS_PDF = r"""
@page{size:A4;margin:20mm 18mm 16mm;
  @top-left{content:"The Finance Atlas";font-size:7pt;color:#7a8a6a}
  @top-right{content:"Bucket Foundation";font-size:7pt;color:#7a8a6a}
  @bottom-center{content:counter(page);font-size:8.5pt;color:#777}}
@page cover{margin:0;@top-left{content:""}@top-right{content:""}@bottom-center{content:""}}
.cover{page:cover;height:297mm;break-after:page}
.toc{break-after:page}
.pgref::after{content:target-counter(attr(href url),page)}
.chapter{break-before:page}
.doc{break-before:page}
"""

CSS_WEB = r"""
body{max-width:62rem;margin:0 auto;padding:0 16px 40px;font-size:16px}
html{font-size:16px}
.cover{padding:48px 28px;margin:0 -16px 20px}
.chapter{margin-top:48px}
.doc{margin-top:36px;border-top:1px solid #d8dcc8;padding-top:12px}
.sitenav{font-family:"Helvetica Neue",Arial,sans-serif;font-size:14px;padding:10px 0;display:flex;gap:18px;flex-wrap:wrap}
.searchbox{margin:18px 0}
.searchbox input{width:100%;box-sizing:border-box;padding:10px 12px;font-size:16px;border:1.5px solid #4f7a3a;background:#fff}
#res ol{columns:1;padding-left:20px}
#res .w{color:#888;font-size:12px}
.pgref{display:none}
.toctab th:nth-child(4),.toctab td.pg{display:none}
table{display:block;overflow-x:auto;font-size:14px}
th{font-size:12px}
pre{font-size:13px;overflow-x:auto}
.chidx{font-size:14px}
@media(max-width:700px){.chidx{columns:1}.cover h1{font-size:30px}}
@media(prefers-color-scheme:dark){
 body{background:#14170f;color:#e6e8dc}
 h1,h2,h3,h4{color:#f1f3e6}a{color:#9fd07f}
 code,pre{background:#222818;border-color:#333b24}
 blockquote{background:#1b2014}td{border-color:#2d3422}
 .doc{border-color:#2d3422}.cover{background:#0b0d08}
}
"""

if __name__ == "__main__":
    main()
