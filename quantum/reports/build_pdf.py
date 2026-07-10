#!/usr/bin/env python3
"""
Build reports/manual.pdf from reports/manual.html via WeasyPrint.
All page styling (cover, running heads, TOC leader dots + page numbers, part
dividers) lives in the document's stylesheet, matching the Longevity & Fitness
manual. Run reports/build_manual.py first.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "reports", "manual.html")

def weasy():
    import weasyprint
    out = os.path.join(ROOT, "reports", "manual.pdf")
    weasyprint.HTML(HTML).write_pdf(out)
    print(f"wrote {out}  ({os.path.getsize(out)//1024} KB)")
    return out

if __name__ == "__main__":
    weasy()
