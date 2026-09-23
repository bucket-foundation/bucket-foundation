#!/usr/bin/env python3
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
