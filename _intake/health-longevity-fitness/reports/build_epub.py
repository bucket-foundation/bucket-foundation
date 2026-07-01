#!/usr/bin/env python3
"""Build a reflowable EPUB of the manual from the chapter markdown.
Reuses build_manual.py's STRUCT (reading order) + build_gallery.py's figure captions.
@@FIG:slug@@ markers become embedded images; footnotes stay native pandoc footnotes."""
import os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
def S(n): return os.path.join(HERE, "sections", n)
def corpus(p): return os.path.join(ROOT, p)

# ---- reading order + titles: parse STRUCT out of build_manual.py ----
bm = open(os.path.join(HERE, "build_manual.py")).read()
m = re.search(r'STRUCT\s*=\s*\[(.*?)\n\]\n', bm, re.S)
blk = m.group(1)
STRUCT = []
for pm in re.finditer(r'\("(Part [IVX]+)",\s*"((?:[^"\\]|\\.)*)",\s*\[(.*?)\]\)', blk, re.S):
    part, sub, items = pm.group(1), pm.group(2), pm.group(3)
    files = []
    for im in re.finditer(r'\("([a-z_]+)",\s*(S|corpus)\("([^"]+)"\)', items):
        files.append(S(im.group(3)) if im.group(2) == "S" else corpus(im.group(3)))
    STRUCT.append((part, sub, files))

# ---- figure captions ----
g = open(os.path.join(HERE, "viz", "build_gallery.py")).read()
CAP = {}
for mm in re.finditer(r'\("([^"]*)\.png","([^"]*)","([^"]*)"\)', g):
    CAP[mm.group(1)] = (mm.group(2), mm.group(3))

FIGDIR = os.path.abspath(os.path.join(ROOT, "media", "figures"))
FIGMARK = re.compile(r'@@FIG:([A-Za-z0-9,\s_-]+?)@@')
def figrepl(m):
    out = []
    for s in re.split(r'[,\s]+', m.group(1).strip()):
        if not s: continue
        p = os.path.join(FIGDIR, s + ".png")
        if not os.path.exists(p): continue
        ti, ca = CAP.get(s, ("", ""))
        alt = (ti + (" — " + ca if ca else "")).replace("]", "").replace("[", "")
        out.append(f'![{alt}]({p})')
    return "\n\n".join(out)

# ---- assemble one markdown doc ----
parts = []
# front matter
parts.append(open(S("00-start-here.md")).read())
for part, sub, files in STRUCT:
    parts.append(f"\n\n# {part} — {sub}\n\n")     # part divider as its own heading
    for f in files:
        if os.path.exists(f):
            parts.append("\n\n" + open(f).read())
doc = "\n\n".join(parts)
doc = FIGMARK.sub(figrepl, doc)                    # embed figures

combined = os.path.join(HERE, "_epub_combined.md")
open(combined, "w").write(doc)

# ---- metadata + build ----
meta = os.path.join(HERE, "_epub_meta.yaml")
open(meta, "w").write(
    'title: "The Longevity & Fitness Operating Manual"\n'
    'subtitle: "A complete, evidence-graded map of the human body, its aging, and what to do about it"\n'
    'author: "Bucket Foundation · Nucleus Brain"\n'
    'date: "2026"\n'
    'lang: en-US\n'
    'rights: "Educational synthesis. Not medical advice."\n')

out = os.path.join(HERE, "manual.epub")
cmd = ["pandoc", combined,
       "-f", "markdown+pipe_tables+backtick_code_blocks-citations-yaml_metadata_block",
       "-o", out, "--metadata-file", meta, "--toc", "--toc-depth=1",
       "--split-level=1", "--standalone"]
r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True)
if r.returncode != 0:
    print("PANDOC FAILED:\n", r.stderr[:1500]); raise SystemExit(1)
print("wrote", out, f"({os.path.getsize(out)//1024} KB)")
