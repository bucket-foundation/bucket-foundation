#!/usr/bin/env python3
"""Bucket Longevity Manual — DESIGN SYSTEM.
One palette, one type scale, one chart style, reusable SVG components. Every figure imports this.
Fonts: Archivo (display), Inter (body/data), IBM Plex Mono (claim-ids). Render: matplotlib + cairosvg.
"""
import os, glob, html as _html, cairosvg
import matplotlib; matplotlib.use("Agg")
import matplotlib.font_manager as _fm, matplotlib.pyplot as plt
from matplotlib import patheffects as _pe

# ---------------------------------------------------------------- tokens
INK="#1c1a17"; INK2="#14110c"; PAPER="#faf7ef"; PAPER2="#fbf8f0"; CARD="#fbf8ef"
GOLD="#b08d3a"; GOLD_D="#6b5418"; GOLD_L="#cda23f"; RULE="#ddd3bb"; RULE2="#ece4d0"
MUT="#5e574a"; FAINT="#8a8170"
# evidence tiers (high → low rigor)
TIER = {
 "meta":"#1d6b2e","rct":"#2f8a4b","cohort":"#8a6d12","cross-sectional":"#a07d1a",
 "case-control":"#a07d1a","mechanistic":"#b5471f","animal":"#c2693a","invitro":"#b5471f",
 "in-vitro":"#b5471f","n=1":"#9c7b5a","nequals1":"#9c7b5a","anecdotal":"#9c8a6a",
 "theoretical":"#7a6f5c","speculative":"#8a7f6c",
}
# verdict (practitioner claim-check)
VERDICT = {"AGREES":"#1d6b2e","OVERSTATED":"#c08a1e","CONTRADICTS":"#b5471f","NEW":"#3a6ea5"}
SERIES = ["#b08d3a","#1d6b2e","#b5471f","#3a6ea5","#6b5418","#7a8a55","#9c5a3a","#8a8170"]
WARN="#b5471f"; OK="#1d6b2e"

DISPLAY="Archivo"; BODY="Inter"; MONO="IBM Plex Mono"

def _register_fonts():
    for fp in glob.glob("/home/gian/.fonts/cadence/*.ttf")+glob.glob("/home/gian/.local/share/fonts/kala-deck/*.ttf"):
        try: _fm.fontManager.addfont(fp)
        except Exception: pass
_register_fonts()

# ---------------------------------------------------------------- matplotlib style
def use_chart_style():
    plt.rcParams.update({
        "figure.facecolor":PAPER, "axes.facecolor":PAPER, "savefig.facecolor":PAPER,
        "font.family":BODY, "font.size":11.5,
        "text.color":INK, "axes.labelcolor":INK, "axes.edgecolor":"#c9bfa6",
        "xtick.color":MUT, "ytick.color":MUT, "axes.titlecolor":INK2,
        "axes.spines.top":False, "axes.spines.right":False,
        "axes.linewidth":1.0, "xtick.major.size":0, "ytick.major.size":0,
        "axes.grid":True, "grid.color":"#e7dfc9", "grid.linewidth":0.8,
        "axes.axisbelow":True, "figure.dpi":150, "savefig.dpi":220,
        "legend.frameon":False,
    })

def new_fig(w=8.4, h=5.0):
    use_chart_style(); fig, ax = plt.subplots(figsize=(w,h)); return fig, ax

def title(ax, kicker, head, sub=None):
    """Consistent figure title block: gold kicker · Archivo head · muted subhead · rule BELOW it all."""
    ax.set_title("")
    fig=ax.figure
    fig.text(0.022, 0.975, kicker.upper(), color=GOLD_D, fontfamily=DISPLAY, fontweight="bold",
             fontsize=9.5, ha="left", va="top")
    fig.text(0.022, 0.940, head, color=INK2, fontfamily=DISPLAY, fontweight="black",
             fontsize=16, ha="left", va="top")
    ry=0.876
    if sub:
        fig.text(0.022, 0.896, sub, color=MUT, fontfamily=BODY, fontsize=10.5, ha="left", va="top",
                 fontstyle="italic")
        ry=0.860
    fig.add_artist(plt.Line2D([0.022,0.42],[ry,ry], color=GOLD, lw=2.4,
                              transform=fig.transFigure, solid_capstyle="round"))

def footer(ax, source, claim_id=None, tier=None):
    """Provenance footer: source (left) + claim-id mono + optional tier badge (right). Lives below the axes."""
    fig=ax.figure
    fig.add_artist(plt.Line2D([0.022,0.978],[0.060,0.060], color=RULE, lw=0.8, transform=fig.transFigure))
    fig.text(0.022, 0.036, source, color=FAINT, fontsize=8.2, ha="left", va="center", fontfamily=BODY)
    if claim_id:
        fig.text(0.022, 0.016, "claim: "+claim_id, color=GOLD_D, fontsize=7.6, ha="left", va="center",
                 fontfamily=MONO)
    if tier:
        c=TIER.get(tier.lower(),FAINT)
        fig.text(0.978, 0.030, tier.upper(), color="white", fontsize=7.8, ha="right", va="center",
                 fontfamily=DISPLAY, fontweight="bold",
                 bbox=dict(boxstyle="round,pad=0.35", fc=c, ec="none"))

def flag(ax, text, kind="caution"):
    """An honesty flag inside a chart (e.g. reverse-causation, predictor≠lever, dose-mismatch)."""
    c = WARN if kind!="ok" else OK
    ax.text(0.985, 0.04, "⚠ "+text, transform=ax.transAxes, ha="right", va="bottom",
            fontsize=8.6, color=c, fontfamily=BODY, fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.4", fc="#fbf0ea" if kind!="ok" else "#e9f3ea", ec=c, lw=0.8))

def save(fig, path, left=0.085, right=0.965, top=0.815, bottom=0.165):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fig.subplots_adjust(left=left, right=right, top=top, bottom=bottom)
    fig.savefig(path); plt.close(fig); return path

# ---------------------------------------------------------------- SVG component kit
def esc(t): return _html.escape(str(t))

def svg_open(w,h,bg=PAPER):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>')
def svg_close(): return "</svg>"

def goldbar(w,x=0,y=0,h=7): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{GOLD}"/>'

def text(x,y,s,size=14,fill=INK,font=BODY,weight=None,anchor="start",italic=False,spacing=None):
    w=f' font-weight="{weight}"' if weight else ""
    it=' font-style="italic"' if italic else ""
    sp=f' letter-spacing="{spacing}"' if spacing else ""
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}"{w}{it}{sp} '
            f'fill="{fill}" text-anchor="{anchor}">{esc(s)}</text>')

def badge(x,y,label,color,text_fill="white",pad=7,size=9.5,h=18):
    """Pill badge (evidence tier / verdict / tag)."""
    w=pad*2+len(str(label))*size*0.60
    return (f'<g><rect x="{x}" y="{y}" width="{w:.0f}" height="{h}" rx="{h/2:.0f}" fill="{color}"/>'
            f'{text(x+w/2, y+h/2+size*0.36, label, size=size, fill=text_fill, font=DISPLAY, weight="bold", anchor="middle")}</g>'), w

def tier_badge(x,y,tier,**kw):
    return badge(x,y,tier.upper(),TIER.get(tier.lower(),FAINT),**kw)
def verdict_chip(x,y,verdict,**kw):
    return badge(x,y,verdict.upper(),VERDICT.get(verdict.upper(),FAINT),**kw)

def panel(w,h,title_k,title_h,sub=None,footer_src=None,claim=None):
    """Standard figure frame: gold bar, kicker, Archivo head, subhead, footer rule+provenance.
    Returns (open_svg, content_y0, close_svg) — caller draws body between."""
    s=[svg_open(w,h), goldbar(w),
       text(28,46,title_k.upper(),size=10,fill=GOLD_D,font=DISPLAY,weight="bold",spacing="0.4"),
       text(28,74,title_h,size=21,fill=INK2,font=DISPLAY,weight="800")]
    y0=92
    if sub:
        s.append(text(28,96,sub,size=12.5,fill=MUT,font=BODY,italic=True)); y0=112
    s.append(f'<line x1="28" y1="{y0}" x2="{min(460,w-28):.0f}" y2="{y0}" stroke="{GOLD}" stroke-width="2.2" stroke-linecap="round"/>')
    foot=[f'<line x1="28" y1="{h-34}" x2="{w-28}" y2="{h-34}" stroke="{RULE}" stroke-width="1"/>']
    if footer_src: foot.append(text(28,h-18,footer_src,size=8.4,fill=FAINT,font=BODY))
    if claim: foot.append(text(w-28,h-18,"claim: "+claim,size=7.8,fill=GOLD_D,font=MONO,anchor="end"))
    return "".join(s), y0+22, "".join(foot)+svg_close()

def render(svg, outpng, scale=2):
    os.makedirs(os.path.dirname(outpng), exist_ok=True)
    # width from viewBox
    import re
    m=re.search(r'width="(\d+)"',svg); w=int(m.group(1)) if m else 800
    cairosvg.svg2png(bytestring=svg.encode(), write_to=outpng, output_width=int(w*scale))
    return outpng

# predictor-vs-lever + mechanism-vs-outcome icon pairs (the manual's core honesty motifs)
def icon_predictor_lever(x,y,s=1.0):
    # left: an eye/gauge (predictor) ; right: a hand on a lever (lever) ; with a ≠
    g=f'<g transform="translate({x},{y}) scale({s})">'
    g+=f'<circle cx="14" cy="14" r="13" fill="none" stroke="{MUT}" stroke-width="2.4"/><circle cx="14" cy="14" r="3.5" fill="{MUT}"/>'
    g+=f'<line x1="14" y1="3" x2="14" y2="8" stroke="{MUT}" stroke-width="2.2"/>'  # gauge needle marks
    g+=text(34,19,"≠",size=18,fill=WARN,font=DISPLAY,weight="bold")
    g+=f'<rect x="52" y="20" width="22" height="5" rx="2.5" fill="{GOLD_D}"/><rect x="60" y="6" width="5" height="18" rx="2.5" fill="{GOLD}" transform="rotate(18 62 15)"/>'
    g+="</g>"
    return g
