#!/usr/bin/env python3
r"""
render_math — turn LaTeX math and mhchem chemistry into cached inline SVG.

Renders once per unique snippet via  latex → dvi → dvisvgm  (Computer Modern,
paths not fonts, so the SVG is self-contained and CSP-safe: works in the browser,
the Artifact, and WeasyPrint identically). Results cached in media/math/<hash>.svg.

Supports:
  $ ... $        inline math
  $$ ... $$      display math
  \ce{ ... }     chemistry (mhchem v4) — write inside math or bare

Public API:
  svg = render_snippet(latex, display=False)      -> inline SVG string (or None on failure)
  html = mathify(text)                             -> text with $...$/$$...$$/\ce{} swapped to <svg>

Idempotent. If latex/dvisvgm fail on a snippet, the raw source is kept in a
<code class="math-raw"> span and the failure logged to media/math/FAILURES.log.
"""
import os, re, hashlib, subprocess, tempfile, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "media", "math")
os.makedirs(CACHE, exist_ok=True)

PREAMBLE = r"""\documentclass[12pt,border=1pt]{standalone}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{bm}
\IfFileExists{physics.sty}{\usepackage{physics}}{%
  \providecommand{\ket}[1]{\left|#1\right\rangle}%
  \providecommand{\bra}[1]{\left\langle#1\right|}%
  \providecommand{\braket}[2]{\left\langle#1\middle|#2\right\rangle}%
  \providecommand{\expval}[1]{\left\langle#1\right\rangle}}
\IfFileExists{mhchem.sty}{\usepackage[version=4]{mhchem}}{}
\begin{document}
__BODY__
\end{document}
"""

def _key(src, display):
    return hashlib.md5(("D" if display else "I") + "::" + src).encode() if False else \
        hashlib.md5((("D" if display else "I") + "::" + src).encode()).hexdigest()[:16]

def render_snippet(src, display=False):
    src = src.strip()
    if not src:
        return None
    h = _key(src, display)
    out = os.path.join(CACHE, h + ".svg")
    if os.path.exists(out):
        with open(out, encoding="utf-8") as f:
            return f.read()
    # display math via inline mode + \displaystyle — the standalone class emits
    # "No pages of output" for \[...\], so we never use it. Renders reliably.
    body = (r"$\displaystyle %s$" % src) if display else ("$%s$" % src)
    with tempfile.TemporaryDirectory() as d:
        tex = os.path.join(d, "m.tex")
        with open(tex, "w", encoding="utf-8") as f:
            f.write(PREAMBLE.replace("__BODY__", body))
        try:
            r = subprocess.run(["latex", "-interaction=nonstopmode", "-halt-on-error", "m.tex"],
                               cwd=d, capture_output=True, timeout=30)
            dvi = os.path.join(d, "m.dvi")
            if r.returncode != 0 or not os.path.exists(dvi):
                raise RuntimeError((r.stdout or b"").decode(errors="ignore")[-400:])
            svg = os.path.join(d, "m.svg")
            subprocess.run(["dvisvgm", "--no-fonts", "--exact-bbox", "--scale=1.35",
                            "-o", svg, dvi], cwd=d, capture_output=True, timeout=30, check=True)
            with open(svg, encoding="utf-8") as f:
                s = f.read()
        except Exception as e:
            with open(os.path.join(CACHE, "FAILURES.log"), "a", encoding="utf-8") as lg:
                lg.write(f"[{'disp' if display else 'inl'}] {src!r} :: {e}\n")
            return None
    # strip xml prolog, tag for styling + baseline alignment
    s = re.sub(r"<\?xml[^>]*\?>", "", s)
    s = re.sub(r"<!DOCTYPE[^>]*>", "", s)
    cls = "math-display" if display else "math-inline"
    s = s.replace("<svg ", f'<svg class="{cls}" ', 1)
    s = s.strip()
    with open(out, "w", encoding="utf-8") as f:
        f.write(s)
    return s

# token patterns
RE_DISPLAY = re.compile(r"(?<!\\)\$\$(.+?)(?<!\\)\$\$", re.S)
RE_CE      = re.compile(r"\\ce\{((?:[^{}]|\{[^{}]*\})*)\}")
RE_INLINE  = re.compile(r"(?<!\\)\$(?!\$)(.+?)(?<!\\)\$")

def _raw(src):
    return f'<code class="math-raw">{html.escape(src)}</code>'

def mathify(text):
    """Swap math/chem tokens in a text/markdown string for inline SVG.
    Run BEFORE markdown conversion so the SVG survives as raw HTML."""
    def disp(m):
        svg = render_snippet(m.group(1), display=True)
        return f'<div class="math-block">{svg}</div>' if svg else _raw(m.group(0))
    def ce(m):
        svg = render_snippet(r"\ce{%s}" % m.group(1), display=False)
        return svg if svg else _raw(m.group(0))
    def inl(m):
        svg = render_snippet(m.group(1), display=False)
        return svg if svg else _raw(m.group(0))
    text = RE_DISPLAY.sub(disp, text)
    text = RE_CE.sub(ce, text)
    text = RE_INLINE.sub(inl, text)
    return text

if __name__ == "__main__":
    # self-test
    tests = [r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle",
             r"S \le 2\sqrt{2}",
             r"\ce{N2 + 3H2 -> 2NH3}"]
    for t in tests:
        ok = render_snippet(t, display=False) is not None
        print(("ok  " if ok else "FAIL"), t)
    print("cache:", CACHE)
