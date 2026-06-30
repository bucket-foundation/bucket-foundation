#!/usr/bin/env python3
"""Find every SVG panel whose top-anchored content overflows the footer, and grow it to fit.
Safe: classifies each figure by rendering at two large heights — if content stays put it's
top-anchored (fixable); if it spreads (matrix/heatmap) it's auto-sizing and left untouched.
Grow-only, capped, and only touches figures that actually overflow."""
import os, re, glob, sys, subprocess
import numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__))
FIG=os.path.abspath(os.path.join(HERE,"..","..","media","figures"))
BG=np.array([250,247,239]); MARGIN=86; CAP=260
SKIP={"build_gallery.py","apply_language.py","bump_heights.py","fix_arrows.py","fetch_anatomy.py","audit_fix.py","build_realmedia.py"}
def blocks(src):
    for m in re.finditer(r'\ndef (\w+)\(\):\n(.*?)(?=\ndef |\nif __name__|\Z)', src, re.S):
        yield m.group(1), m.group(2)
plan={}
for f in glob.glob(os.path.join(HERE,"build_*.py")):
    if os.path.basename(f) in SKIP: continue
    fns={}; src=open(f).read()
    for name,body in blocks(src):
        if "ds.render(" not in body: continue
        m=re.search(r'\bW,H=(\d+),\s*(\d+)', body)
        if not m: continue
        figs=re.findall(r'/([A-Za-z0-9][\w-]*)\.png', body)
        if figs: fns[name]=(int(m.group(1)),int(m.group(2)),figs)
    if fns: plan[f]=fns
def set_H(src,fn,newH):
    return re.sub(r'(?s)\ndef '+re.escape(fn)+r'\(\):\n.*?(?=\ndef |\nif __name__|\Z)',
                  lambda mm: re.sub(r'(\bW,H=\d+,)\s*\d+', lambda x:x.group(1)+str(newH), mm.group(0), count=1),
                  src, count=1)
def body_bottom(png, renderH):
    im=np.asarray(Image.open(png).convert("RGB")); ph=im.shape[0]; sc=ph/renderH
    top=int(96*sc); bot=int((renderH-62)*sc)          # exclude footer rule, footer text, bottom-note
    band=im[top:bot]
    mask=(np.abs(band.astype(int)-BG).max(axis=2)>26)
    rows=np.where(mask.sum(axis=1)>6)[0]
    return ((rows.max()+top)/sc) if len(rows) else 96.0
total=0
for f,fns in plan.items():
    orig=open(f).read()
    def render_at(pad):
        s=orig
        for fn,(W0,H0,_) in fns.items(): s=set_H(s,fn,H0+pad)
        open(f,"w").write(s); subprocess.run([sys.executable,f],cwd=HERE,capture_output=True)
    render_at(250); cba={fn:max(body_bottom(os.path.join(FIG,figs[0]+".png"),H0+250) for ff,(W0,H0,figs) in [(fn,fns[fn])]) for fn in fns}
    cba={fn:body_bottom(os.path.join(FIG,fns[fn][2][0]+".png"),fns[fn][1]+250) for fn in fns if os.path.exists(os.path.join(FIG,fns[fn][2][0]+".png"))}
    render_at(450); cbb={fn:body_bottom(os.path.join(FIG,fns[fn][2][0]+".png"),fns[fn][1]+450) for fn in fns if os.path.exists(os.path.join(FIG,fns[fn][2][0]+".png"))}
    s=orig
    for fn,(W0,H0,figs) in fns.items():
        if fn not in cba or fn not in cbb: continue
        if abs(cbb[fn]-cba[fn])>25: continue                 # height-relative -> leave alone
        if cba[fn] <= H0-44: continue                        # already fits
        newH=min(int(round(cba[fn]))+MARGIN, H0+CAP)
        if newH>H0:
            s=set_H(s,fn,newH); total+=1
            print(f"  grow {os.path.basename(f):26} {fn:22} {H0} -> {newH}")
    open(f,"w").write(s); subprocess.run([sys.executable,f],cwd=HERE,capture_output=True)
print(f"\nfit {total} overflowing top-anchored panels")
