#!/usr/bin/env python3
"""
Build manual.pdf from the rendered manual.html via WeasyPrint.

Math and chemistry are already inline SVG (rendered by render_math via LaTeX),
so the PDF gets the same typeset math as the web manual, plus real pagination
and the full design. Tables scroll on the web; in print they wrap/shrink.

    python3 reports/build_pdf.py          # -> reports/manual.pdf  (WeasyPrint)
    python3 reports/build_pdf.py --latex  # also -> reports/manual-latex.pdf (pandoc+xelatex)

Run reports/build_manual.py first so manual.html is fresh.
"""
import os, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "reports", "manual.html")

PRINT_CSS = """
@page{size:A4;margin:17mm 15mm 20mm;
  @bottom-center{content:counter(page);color:#8a8f98;font-size:9pt;font-family:sans-serif}}
@page:first{@bottom-center{content:none}}
:root{--bg:#fff}          /* force the light palette for print */
body{background:#fff;color:#16181d;font-size:10.5pt}
.wrap{max-width:none;padding:0}
.card{break-inside:avoid}
.chapter>h1{break-after:avoid;break-before:page}
#map{break-before:avoid}
.hero{break-after:page}
.toc{break-after:page}
.math-span svg,.math-block svg{filter:none}
a{color:#0e6b78;text-decoration:none}
table{font-size:8.5pt}
"""

def weasy():
    import weasyprint
    out = os.path.join(ROOT, "reports", "manual.pdf")
    css = weasyprint.CSS(string=PRINT_CSS)
    weasyprint.HTML(HTML).write_pdf(out, stylesheets=[css])
    print(f"wrote {out}  ({os.path.getsize(out)//1024} KB)")
    return out

def latex():
    """Optional: pandoc -> xelatex from the combined markdown (best math typography,
    but wide tables can overflow). Assembles cards on the fly."""
    import glob
    chapters = ["01-foundations","02-hardware","03-stack-algorithms","04-adjacent-tech",
                "05-industries","06-ecosystem-geopolitics","07-history","08-frontier-open"]
    combined = os.path.join(ROOT, "reports", "_manual_combined.md")
    with open(combined, "w", encoding="utf-8") as o:
        o.write("---\ntitle: The Quantum Operating Manual\n"
                "subtitle: Bucket Foundation — all of quantum, all industries\n"
                "date: 2026-07-08\ngeometry: margin=2cm\nfontsize: 10pt\n"
                "header-includes: |\n"
                "  \\usepackage[version=4]{mhchem}\n  \\usepackage{physics}\n"
                "  \\usepackage{amsmath,amssymb}\n---\n\n")
        for ch in chapters:
            for c in sorted(glob.glob(os.path.join(ROOT, ch, "*.md"))):
                o.write(open(c, encoding="utf-8").read() + "\n\n\\clearpage\n\n")
    out = os.path.join(ROOT, "reports", "manual-latex.pdf")
    r = subprocess.run(["pandoc", combined, "-o", out, "--pdf-engine=xelatex",
                        "-V", "colorlinks=true", "--toc"],
                       capture_output=True, text=True, timeout=900)
    if r.returncode == 0:
        print(f"wrote {out}  ({os.path.getsize(out)//1024} KB)")
    else:
        print("pandoc/xelatex failed (wide tables likely) — WeasyPrint PDF is the primary.\n",
              r.stderr[-800:])

if __name__ == "__main__":
    weasy()
    if "--latex" in sys.argv:
        latex()
