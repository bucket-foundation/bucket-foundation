#!/usr/bin/env python3
"""
Build reports/manual.pdf from reports/manual.html via WeasyPrint — dense,
single-column, book layout. Chapters flow continuously; one page break before
the reference index. Tables and code wrap to the page (the web uses scroll).

    python3 reports/build_pdf.py

Run reports/build_manual.py first so manual.html is fresh.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "reports", "manual.html")

PRINT_CSS = """
@page{size:A4;margin:13mm 14mm 13mm;
  @bottom-center{content:counter(page);color:#8a8f98;font-size:8pt;font-family:sans-serif}}
@page:first{@bottom-center{content:none}}
:root{--bg:#fff}
body{background:#fff;color:#16181d;font-size:8.4pt;line-height:1.4}
.wrap{max-width:none;padding:0}

/* force web scroll-tables to wrap in print */
table{display:table !important;width:100% !important;overflow:visible !important;border-collapse:collapse;table-layout:auto}
th,td{white-space:normal !important;overflow-wrap:anywhere;vertical-align:top}
pre{white-space:pre-wrap !important;overflow-wrap:anywhere;overflow:visible !important;font-size:7pt}
code{overflow-wrap:anywhere}
img,svg{max-width:100% !important}

/* compact title block */
.hero{padding-bottom:.5rem;margin-bottom:.7rem;border-bottom:1.2pt solid #16181d}
.title{font-size:20pt;margin:.15rem 0 .3rem}
.sub{font-size:10pt}.meta{font-size:7.8pt}

/* TOC: three columns, flows */
.toc{padding:.6rem .8rem;margin-bottom:.9rem}
.toc ol{grid-template-columns:repeat(3,1fr);gap:.05rem 1rem}
.toc h2{font-size:7pt}.toc-appx{font-size:6.6pt}

/* chapters flow continuously — no per-chapter page break */
.chapter{margin:1.1rem 0 0}
.chnum{font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#0e8ea0;margin-bottom:.05rem}
.chapter>h1{font-size:14pt;break-after:avoid;margin:0 0 .3rem;padding-bottom:.2rem;border-bottom:.8pt solid #0e8ea0}
#map,#preface{break-before:avoid}
.blurb{font-size:8.4pt;margin:.2rem 0 .6rem}

/* narrative body */
.narrative{font-size:8.5pt;line-height:1.44;max-width:none}
.narrative h2{font-size:11pt;margin:.95rem 0 .28rem;break-after:avoid}
.narrative h3{font-size:9.4pt;margin:.7rem 0 .2rem;break-after:avoid}
.narrative h4{font-size:8.8pt;margin:.55rem 0 .15rem;break-after:avoid;font-weight:600}
.narrative p{margin:.35rem 0}
.narrative blockquote{border-left:1.2pt solid #b5741a;margin:.5rem 0;padding:.08rem .7rem;color:#5c6069}
.narrative ul,.narrative ol{margin:.35rem 0;padding-left:1.1rem}.narrative li{margin:.12rem 0}
.narrative table{font-size:7.6pt}
.refptr{font-size:7pt;color:#8a8f98;margin-top:.7rem;border-top:.4pt solid #e4e2db;padding-top:.3rem}
.glossary p{margin:.2rem 0;font-size:8.3pt}

/* tables + figures */
table{font-size:7.6pt;margin:.5rem 0}
th,td{padding:.18rem .34rem}th{font-size:7pt}
figure.figblock{break-inside:avoid;margin:.6rem 0}
.math-span svg,.math-block svg,.figsolo svg{filter:none}
p{margin:.3rem 0}h2,h3,h4{break-after:avoid}
a{color:#0e6b78;text-decoration:none}

/* reference index + topic index: one page break, then dense flow */
#refindex,#index{break-before:page}
#refindex>h1,#index>h1{font-size:14pt}
.refchapter{margin:.8rem 0 0}
.refchapter>h2{font-size:10pt;color:#5c6069;border-bottom:.6pt solid #d7d5cd;padding-bottom:.12rem;margin:.6rem 0 .35rem;break-after:avoid}
.refcard{font-size:7.9pt;line-height:1.32;border-top:.4pt solid #ececec;padding:.08rem 0 .28rem;margin:.32rem 0 0}
.refcard h1{font-size:8.6pt;margin:.12rem 0 .18rem;break-after:avoid}
.refcard h2{font-size:6.6pt;margin:.35rem 0 .08rem;text-transform:uppercase;letter-spacing:.04em;color:#0e8ea0}
.refcard table{font-size:6.6pt}.refcard p{margin:.18rem 0}
.indexcols{column-count:3;column-gap:1rem;font-size:7.4pt}
.idxrow{break-inside:avoid;margin:.08rem 0;display:flex;justify-content:space-between;gap:.4rem;border-bottom:.3pt dotted #e4e2db}
.idxrow code{color:#8a8f98;font-size:.85em}
"""

def weasy():
    import weasyprint
    out = os.path.join(ROOT, "reports", "manual.pdf")
    weasyprint.HTML(HTML).write_pdf(out, stylesheets=[weasyprint.CSS(string=PRINT_CSS)])
    print(f"wrote {out}  ({os.path.getsize(out)//1024} KB)")
    return out

if __name__ == "__main__":
    weasy()
