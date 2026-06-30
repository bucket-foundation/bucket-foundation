#!/usr/bin/env python3
"""Normalize ALL SVG arrowhead markers to a clean fixed size (userSpaceOnUse), so they stop
ballooning with stroke-width. Review fix for 'bad arrows' across every flow figure."""
import re, glob
# match a <marker ...> ... <path ... fill="X" .../> </marker> and rewrite to fixed-size
pat=re.compile(r'<marker id="(?P<id>[^"]+)"[^>]*orient="auto"[^>]*>\s*<path d="[^"]+"\s*fill="(?P<fill>[^"]+)"\s*/>\s*</marker>')
def repl(m):
    return (f'<marker id="{m.group("id")}" markerWidth="12" markerHeight="12" refX="8.5" refY="4" '
            f'orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="{m.group("fill")}"/></marker>')
n=0
for f in glob.glob("build_*.py"):
    src=open(f).read(); new,k=pat.subn(repl,src)
    if k: open(f,"w").write(new); n+=k; print(f"{f}: {k} markers")
print(f"total {n} arrowhead markers normalized")
