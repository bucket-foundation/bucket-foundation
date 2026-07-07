#!/usr/bin/env python3
"""build_structures.py — real molecular/structural figures for the manual.

Two rendering pipelines, one house style:
  * proteins / complexes : RCSB PDB  ->  PyMOL cartoon (ray-traced, transparent)
                            ->  matplotlib house-frame with leader-line labels
  * small molecules      : PubChem SMILES  ->  RDKit skeletal drawing
                            ->  matplotlib house-frame with annotation cards

Every figure is produced by one fig_<slug>() function; main() runs them all.
Raw PyMOL ray-traces are cached under _struct/_raw/ so re-tuning labels does
not re-ray-trace — pass --force to regenerate the raws.

    python build_structures.py                 # regenerate every figure
    python build_structures.py --only insulin  # one figure (substring match)
    python build_structures.py --force         # also re-ray-trace the raws
    python build_structures.py --list          # list figure slugs

Outputs land in ../../media/figures/<slug>.png. Nothing here is wired into
build_manual.py; captions + chapter homes live in structure_figures.md.
"""
import os, sys, subprocess, shutil, argparse

HERE   = os.path.dirname(os.path.abspath(__file__))
STRUCT = os.path.join(HERE, "_struct")          # cached .pdb files
RAW    = os.path.join(STRUCT, "_raw")           # cached ray-traced PNGs
FIGDIR = os.path.abspath(os.path.join(HERE, "..", "..", "media", "figures"))
for d in (STRUCT, RAW):
    os.makedirs(d, exist_ok=True)

# ----------------------------------------------------------------------------
# house palette (mirrors reports/viz/ds.py) + fonts
# ----------------------------------------------------------------------------
INK="#1c1a17"; INK2="#14110c"; PAPER="#faf7ef"; CARD="#fbf8ef"
GOLD="#b08d3a"; GOLD_D="#6b5418"; RULE="#ddd3bb"; MUT="#5e574a"; FAINT="#8a8170"
GOLD_F1="#c9a24a"; RED="#b5471f"; BLUE="#3a6ea5"; GREEN="#1d6b2e"; AMBER="#a9852f"
MEMB="#e7dcc2"; MEMB_EDGE="#cdbf98"
DISPLAY="Archivo"; BODY="Inter"; MONO="IBM Plex Mono"

# PyMOL module colours (0x hex strings)
PX_GOLD="0xC9A24A"; PX_RED="0xB5471F"; PX_BLUE="0x3A6EA5"; PX_GREEN="0x1D6B2E"
PX_AMBER="0xC98A2E"; PX_PURPLE="0x6b4a86"; PX_TEAL="0x2f7d78"
PX_HEME="0x8a2f1a"; PX_CU="0xc07a3a"; PX_FAD="0xE0A21A"

_FONT_PATHS = [
    "/home/gian/.fonts/cadence/Archivo.ttf",
    "/home/gian/.fonts/cadence/Inter.ttf",
    "/home/gian/.local/share/fonts/kala-deck/IBMPlexMono-Regular.ttf",
    "/home/gian/.local/share/fonts/kala-deck/IBMPlexMono-Bold.ttf",
]

def _setup_mpl():
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib import font_manager as fm
    import matplotlib as mpl
    for p in _FONT_PATHS:
        if os.path.exists(p):
            try: fm.fontManager.addfont(p)
            except Exception: pass
    mpl.rcParams["mathtext.fontset"] = "dejavusans"
    return matplotlib

# ----------------------------------------------------------------------------
# fetch + render
# ----------------------------------------------------------------------------
def fetch_pdb(pdb_id):
    """Download a PDB (cached). Returns local path."""
    lc = pdb_id.lower()
    path = os.path.join(STRUCT, lc + ".pdb")
    if not os.path.exists(path):
        import urllib.request
        url = f"https://files.rcsb.org/download/{pdb_id.upper()}.pdb"
        print(f"  fetching {pdb_id} …")
        urllib.request.urlretrieve(url, path)
    return path

_PML_HEAD = """
hide everything
bg_color white
set ray_opaque_background, 0
set cartoon_fancy_helices, 1
set cartoon_highlight_color, grey65
set ambient, 0.45
set specular, 0.2
set direct, 0.58
set ray_shadows, 1
set ray_shadow, 0.27
set antialias, 2
set ray_trace_mode, 1
set ray_trace_color, 0x30302c
"""

def render_pymol(slug, pdb_id, body_pml, ray=(2200, 1600), force=False):
    """Run a PyMOL script; cache the ray-traced PNG under _raw/<slug>.png.
    body_pml is inserted after the preamble and `load mol`; it sets colours,
    representations and the view, ending before `ray`."""
    out = os.path.join(RAW, slug + ".png")
    if os.path.exists(out) and not force:
        return out
    pdb_path = fetch_pdb(pdb_id)
    pml = os.path.join(RAW, slug + ".pml")
    script = (f"load {pdb_path}, mol\n" + _PML_HEAD + body_pml +
              f"\nray {ray[0]}, {ray[1]}\npng {out}, dpi=300\n")
    with open(pml, "w") as f:
        f.write(script)
    print(f"  ray-tracing {slug} ({pdb_id}) …")
    subprocess.run(["pymol", "-cq", pml], check=True)
    if not os.path.exists(out):
        raise RuntimeError(f"PyMOL produced no output for {slug}")
    return out

def crop_to_content(png_path, pad=14):
    from PIL import Image
    import numpy as np
    im = Image.open(png_path).convert("RGBA")
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 10)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    box = (max(0, x0-pad), max(0, y0-pad),
           min(im.width, x1+pad), min(im.height, y1+pad))
    return im.crop(box)

def measure_color(img, rgb, tol=45):
    """Centroid + bbox of pixels near an RGB colour. Pixels in image coords."""
    import numpy as np
    im = np.asarray(img.convert("RGB")).astype(int)
    d = (abs(im[:,:,0]-rgb[0]) + abs(im[:,:,1]-rgb[1]) + abs(im[:,:,2]-rgb[2]))
    m = d < tol
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    return dict(cx=xs.mean(), cy=ys.mean(), x0=xs.min(), x1=xs.max(),
                y0=ys.min(), y1=ys.max(), n=int(m.sum()))

# ----------------------------------------------------------------------------
# RDKit small-molecule drawing
# ----------------------------------------------------------------------------
def draw_small_molecule(smiles, size=(1300, 950), highlight_smarts=None,
                        fname="mol.png", bond_width=3):
    """Skeletal 2D structure on paper bg, house atom palette. Optional SMARTS
    substructure shaded. Returns the RDKit mol."""
    from rdkit import Chem
    from rdkit.Chem import rdDepictor
    from rdkit.Chem.Draw import rdMolDraw2D
    m = Chem.MolFromSmiles(smiles)
    rdDepictor.SetPreferCoordGen(True)
    rdDepictor.Compute2DCoords(m)
    d = rdMolDraw2D.MolDraw2DCairo(*size)
    o = d.drawOptions()
    o.bondLineWidth = bond_width
    o.padding = 0.10
    o.setBackgroundColour((0.980, 0.969, 0.937))
    o.updateAtomPalette({6:(0.11,0.10,0.09), 7:(0.23,0.43,0.65),
                         8:(0.71,0.28,0.12), 9:(0.11,0.42,0.18),
                         15:(0.66,0.42,0.11), 16:(0.69,0.55,0.23),
                         17:(0.11,0.42,0.18), 1:(0.4,0.4,0.4)})
    ha, hb, ac, bc = [], [], {}, {}
    if highlight_smarts:
        patt = Chem.MolFromSmarts(highlight_smarts)
        match = m.GetSubstructMatch(patt)
        ha = list(match)
        for a in ha: ac[a] = (0.98, 0.90, 0.72)
        for b in m.GetBonds():
            if b.GetBeginAtomIdx() in ha and b.GetEndAtomIdx() in ha:
                hb.append(b.GetIdx()); bc[b.GetIdx()] = (0.98, 0.90, 0.72)
    rdMolDraw2D.PrepareAndDrawMolecule(d, m, highlightAtoms=ha, highlightBonds=hb,
                                       highlightAtomColors=ac, highlightBondColors=bc)
    d.FinishDrawing()
    with open(fname, "wb") as f:
        f.write(d.GetDrawingText())
    return m

# ----------------------------------------------------------------------------
# matplotlib house-frame composers
# ----------------------------------------------------------------------------
def _halo(pe, w=2.8):
    return [pe.withStroke(linewidth=w, foreground=PAPER)]

def header(ax, kicker, head, sub, head_size=23, sub_size=11.2, y=0.965):
    import matplotlib.pyplot as plt
    ax.text(0.035, y, kicker.upper(), color=GOLD_D, family=DISPLAY, fontweight="bold",
            fontsize=12.5, ha="left", va="top", transform=ax.transAxes)
    ax.text(0.035, y-0.028, head, color=INK2, family=DISPLAY, fontweight="black",
            fontsize=head_size, ha="left", va="top", transform=ax.transAxes)
    yy = y - 0.028 - head_size/230.0 - 0.020
    for ln in sub:
        ax.text(0.035, yy, ln, color=MUT, family=BODY, fontsize=sub_size, ha="left",
                va="top", style="italic", transform=ax.transAxes); yy -= 0.026
    ax.add_line(plt.Line2D([0.035, 0.30], [yy+0.006, yy+0.006], color=GOLD, lw=2.4,
                transform=ax.transAxes, solid_capstyle="round"))
    return yy

def footer(ax, source, slug):
    import matplotlib.pyplot as plt
    ax.add_line(plt.Line2D([0.035, 0.965], [0.045, 0.045], color=RULE, lw=0.9,
                transform=ax.transAxes))
    ax.text(0.035, 0.026, source, color=FAINT, family=BODY, fontsize=8.0, ha="left",
            va="center", transform=ax.transAxes)
    ax.text(0.965, 0.026, "figure: " + slug, color=GOLD_D, family=MONO, fontsize=7.6,
            ha="right", va="center", transform=ax.transAxes)

def protein_figure(slug, img, kicker, head, sub, source, labels, out,
                   figsize=(12.5, 9.6), img_box=(0.06, 0.075, 0.62, 0.71),
                   membrane=None, arrows=None, cards=None, extras=None):
    """Compose a framed protein figure.
      img      : cropped PIL image (transparent structure)
      labels   : list of dicts {anchor:(px,py), xy:(fx,fy), title, desc, color,
                                ha='left'|'right'} — leader-line callouts
      membrane : dict {y_top_px, y_bot_px, label, matrix, ims} or None
      arrows   : list of dicts {kind:'proton'|'electron'|'custom', ...}
      cards    : list of dicts {xy_wh:(x,y,w,h), title, sub, lines, color,
                                anchor:(px,py)} — bordered explanation boxes
      extras   : callable(ax, P) for one-off annotations
    """
    mpl = _setup_mpl()
    import matplotlib.pyplot as plt
    import matplotlib.patheffects as pe
    from matplotlib.patches import Rectangle, FancyBboxPatch
    HALO = _halo(pe)
    iw, ih = img.size
    fig = plt.figure(figsize=figsize, dpi=200); fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0,0,1,1]); ax.set_xlim(0,1); ax.set_ylim(0,1); ax.axis("off")
    header(ax, kicker, head, sub)
    ix0, iy0, iwf, ihf = img_box
    def P(px, py):
        return (ix0 + (px/iw)*iwf, iy0 + ihf - (py/ih)*ihf)
    # membrane band
    if membrane:
        myt = iy0 + ihf - (membrane["y_top_px"]/ih)*ihf
        myb = iy0 + ihf - (membrane["y_bot_px"]/ih)*ihf
        bx0 = ix0 - 0.015; bx1 = ix0 + iwf + 0.025
        ax.add_patch(Rectangle((bx0, myb), bx1-bx0, myt-myb, transform=ax.transAxes,
                     facecolor=MEMB, edgecolor="none", zorder=1))
        for yy in (myt, myb):
            ax.add_line(plt.Line2D([bx0, bx1], [yy, yy], color=MEMB_EDGE, lw=1.1,
                        transform=ax.transAxes, zorder=1))
        ax.text(bx1-0.006, myt-0.006, membrane["label"], color="#93855f", family=DISPLAY,
                fontweight="bold", fontsize=8.2, ha="right", va="top",
                transform=ax.transAxes, zorder=2)
        membrane["_band"] = (myt, myb, bx0, bx1)
    # structure image on top
    axi = fig.add_axes(list(img_box)); axi.axis("off"); axi.imshow(img); axi.set_zorder(3)
    # arrows
    for a in (arrows or []):
        if a["kind"] == "proton":
            myt, myb, _, _ = membrane["_band"]
            for fx in a["xs"]:
                ax.annotate("", xy=(fx, myb-0.026), xytext=(fx, myt+0.026),
                    xycoords=ax.transAxes,
                    arrowprops=dict(arrowstyle="-|>", color="#8a5a2a", lw=2.2), zorder=4)
                ax.text(fx-0.011, (myt+myb)/2, "H$^+$", color="#8a5a2a", family=BODY,
                        fontweight="bold", fontsize=11.5, ha="right", va="center",
                        transform=ax.transAxes, zorder=5, path_effects=HALO)
        elif a["kind"] == "electron":
            e0 = P(*a["from_px"]); e1 = P(*a["to_px"])
            ax.annotate("", xy=e1, xytext=e0, xycoords=ax.transAxes,
                arrowprops=dict(arrowstyle="-|>", color=RED, lw=2.6,
                connectionstyle=f"arc3,rad={a.get('rad',0.12)}"), zorder=6)
        elif a["kind"] == "custom":
            ax.annotate("", xy=P(*a["to_px"]), xytext=P(*a["from_px"]),
                xycoords=ax.transAxes,
                arrowprops=dict(arrowstyle=a.get("style","-|>"), color=a.get("color",INK),
                lw=a.get("lw",2.2),
                connectionstyle=f"arc3,rad={a.get('rad',0.0)}"), zorder=6)
    # membrane matrix/IMS side labels
    if membrane:
        myt, myb, _, _ = membrane["_band"]
        if membrane.get("matrix"):
            mx = membrane.get("matrix_x", ix0+0.02)
            ax.text(mx, myt+0.05, membrane["matrix"][0], color=GREEN, family=DISPLAY,
                    fontweight="bold", fontsize=11, ha="left", va="bottom",
                    transform=ax.transAxes, zorder=5, path_effects=HALO)
            ax.text(mx, myt+0.031, membrane["matrix"][1], color=MUT, family=BODY,
                    fontsize=9, ha="left", va="bottom", transform=ax.transAxes,
                    zorder=5, path_effects=HALO)
        if membrane.get("ims"):
            mx = membrane.get("ims_x", ix0+0.02)
            ax.text(mx, myb-0.018, membrane["ims"], color="#8a5a2a", family=DISPLAY,
                    fontweight="bold", fontsize=10, ha="left", va="top",
                    transform=ax.transAxes, zorder=5, path_effects=HALO)
    # leader-line labels
    for L in (labels or []):
        a = P(*L["anchor"]); tx, ty = L["xy"]; ha = L.get("ha","left")
        col = L["color"]
        ax.annotate("", xy=a, xytext=(tx,ty), textcoords=ax.transAxes, xycoords=ax.transAxes,
            arrowprops=dict(arrowstyle="-", color=INK, lw=1.05, shrinkA=2, shrinkB=3), zorder=6)
        ax.scatter([a[0]],[a[1]], s=30, color=col, edgecolor="white", lw=1.1, zorder=7,
                   transform=ax.transAxes)
        ax.text(tx, ty+0.017, L["title"], color=col, family=DISPLAY, fontweight="bold",
                fontsize=L.get("size",12), ha=ha, va="bottom", transform=ax.transAxes,
                zorder=7, path_effects=HALO)
        for i, ln in enumerate(L["desc"].split("\n")):
            ax.text(tx, ty-0.001-i*0.021, ln, color=MUT, family=BODY, fontsize=9.5, ha=ha,
                    va="top", transform=ax.transAxes, zorder=7, path_effects=HALO)
    # bordered cards
    for c in (cards or []):
        x,y,w,h = c["xy_wh"]
        ax.add_patch(FancyBboxPatch((x,y-h),w,h, boxstyle="round,pad=0.006,rounding_size=0.012",
                     transform=ax.transAxes, facecolor=CARD, edgecolor=c["color"], lw=1.7, zorder=6))
        ax.text(x+0.014, y-0.020, c["title"], color=c["color"], family=DISPLAY,
                fontweight="bold", fontsize=12, ha="left", va="top", transform=ax.transAxes, zorder=7)
        yoff = 0.044
        if c.get("sub"):
            ax.text(x+0.014, y-yoff, c["sub"], color=MUT, family=BODY, fontsize=9,
                    style="italic", ha="left", va="top", transform=ax.transAxes, zorder=7)
            yoff += 0.024
        for i, ln in enumerate(c["lines"]):
            ax.text(x+0.014, y-yoff-i*0.020, ln, color=MUT, family=BODY, fontsize=9.4,
                    ha="left", va="top", transform=ax.transAxes, zorder=7)
        if c.get("anchor"):
            a = P(*c["anchor"])
            ax.annotate("", xy=a, xytext=(x+w, y-h/2), textcoords=ax.transAxes,
                xycoords=ax.transAxes,
                arrowprops=dict(arrowstyle="-", color=c["color"], lw=1.2, shrinkA=3, shrinkB=3), zorder=6)
            ax.scatter([a[0]],[a[1]], s=30, color=c["color"], edgecolor="white", lw=1.1,
                       zorder=7, transform=ax.transAxes)
    if extras:
        extras(ax, P)
    footer(ax, source, slug)
    fig.savefig(out, dpi=200, facecolor=PAPER)
    plt.close(fig)
    return out

def molecule_figure(slug, mol_png, kicker, head, sub, source, cards, out,
                    figsize=(11, 8.0), mol_box=(0.03, 0.075, 0.66, 0.60),
                    card_x=0.71, card_w=0.255, extras=None):
    """Compose a framed small-molecule figure: RDKit structure + explanation cards.
      cards : list of (ytop, color, title, body_multiline)"""
    mpl = _setup_mpl()
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch
    from PIL import Image
    fig = plt.figure(figsize=figsize, dpi=200); fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0,0,1,1]); ax.set_xlim(0,1); ax.set_ylim(0,1); ax.axis("off")
    header(ax, kicker, head, sub, head_size=25)
    axi = fig.add_axes(list(mol_box)); axi.axis("off"); axi.imshow(Image.open(mol_png))
    for ytop, color, title, body in cards:
        h = 0.028 + 0.021*(len(body.split("\n"))+1)
        ax.add_patch(FancyBboxPatch((card_x,ytop-h),card_w,h,
                     boxstyle="round,pad=0.006,rounding_size=0.012", transform=ax.transAxes,
                     facecolor=CARD, edgecolor=color, lw=1.6, zorder=3))
        ax.text(card_x+0.014, ytop-0.018, title, color=color, family=DISPLAY,
                fontweight="bold", fontsize=11.5, ha="left", va="top", transform=ax.transAxes, zorder=4)
        for i, ln in enumerate(body.split("\n")):
            ax.text(card_x+0.014, ytop-0.046-i*0.021, ln, color=MUT, family=BODY,
                    fontsize=9.4, ha="left", va="top", transform=ax.transAxes, zorder=4)
    if extras:
        extras(ax)
    footer(ax, source, slug)
    fig.savefig(out, dpi=200, facecolor=PAPER)
    plt.close(fig)
    return out

# ----------------------------------------------------------------------------
# verified SMILES (from PubChem, cid noted) — keeps the script self-contained
# ----------------------------------------------------------------------------
SMILES = {
    # cid 60823
    "atorvastatin": "CC(C)C1=C(C(=C(N1CC[C@H](C[C@H](CC(=O)O)O)O)C2=CC=C(C=C2)F)C3=CC=CC=C3)C(=O)NC4=CC=CC=C4",
    # cid 446157
    "rosuvastatin": "CC(C)C1=NC(=NC(=C1/C=C/[C@H](C[C@H](CC(=O)O)O)O)C2=CC=C(C=C2)F)N(C)S(=O)(=O)C",
    # cid 4091
    "metformin": "CN(C)C(=N)N=C(N)N",
    # cid 5284616
    "rapamycin": "C[C@@H]1CC[C@H]2C[C@@H](/C(=C/C=C/C=C/[C@H](C[C@H](C(=O)[C@@H]([C@@H](/C(=C/[C@H](C(=O)C[C@H](OC(=O)[C@@H]3CCCCN3C(=O)C(=O)[C@@]1(O2)O)[C@H](C)C[C@@H]4CC[C@H]([C@@H](C4)OC)O)C)/C)O)OC)C)C)/C)OC",
    # cid 11949646
    "empagliflozin": "C1COC[C@H]1OC2=CC=C(C=C2)CC3=C(C=CC(=C3)[C@H]4[C@@H]([C@H]([C@@H]([C@H](O4)CO)O)O)O)Cl",
    # cid 5997 — cholesterol
    "cholesterol": "C[C@H](CCCC(C)C)[C@H]1CC[C@@H]2[C@@]1(CC[C@H]3[C@H]2CC=C4[C@@]3(CC[C@@H](C4)O)C)C",
    # cid 6013 — testosterone
    "testosterone": "C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@@H]2O)CCC4=CC(=O)CC[C@]34C",
    # cid 5893 — NAD+ (oxidised form)
    "nad": "C1=CC(=C[N+](=C1)[C@H]2[C@@H]([C@@H]([C@H](O2)COP(=O)(O)OP(=O)(O)OC[C@@H]3[C@H]([C@H]([C@@H](O3)N4C=NC5=C(N=CN=C54)N)O)O)O)O)C(=O)N",
    # cid 5754 — cortisol
    "cortisol": "C[C@]12CCC(=O)C=C1CC[C@@H]3[C@@H]2[C@H](C[C@]4([C@H]3CC[C@@]4(C(=O)CO)O)C)O",
    # cid 2244 — aspirin (acetylsalicylic acid)
    "aspirin": "CC(=O)OC1=CC=CC=C1C(=O)O",
    # cid 5280795 — cholecalciferol (vitamin D3)
    "vitamin-d3": "C[C@H](CCCC(C)C)[C@H]1CC[C@@H]\\2[C@@]1(CCC/C2=C\\C=C/3\\C[C@H](CCC3=C)O)C",
    # cid 586 — creatine
    "creatine": "CN(CC(=O)O)C(=N)N",
}
# the statin dihydroxy-acid "warhead" (HMG-CoA mimic)
STATIN_PHARMACOPHORE = "OC(CC(O)CC(=O)O)"

def _tmp(slug):
    return os.path.join(RAW, "_mol_" + slug + ".png")

# ----------------------------------------------------------------------------
# SMALL-MOLECULE FIGURES
# ----------------------------------------------------------------------------
def fig_atorvastatin(force=False):
    slug = "atorvastatin-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["atorvastatin"], size=(1300,950),
                        highlight_smarts=STATIN_PHARMACOPHORE, fname=mp)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Medical & Pharmacology · §10.2   ·   Pharmacology (Full) · §28.B.3",
        "Atorvastatin: how a statin works",
        ["The shaded arm mimics the molecule your liver's cholesterol enzyme (HMG-CoA reductase) normally grabs.",
         "The drug wedges into that slot, blocks the enzyme, and cholesterol synthesis slows."],
        "Structure: PubChem CID 60823 (C\u2083\u2083H\u2083\u2085FN\u2082O\u2085, 558.6 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.665, RED,   "The active \"warhead\"", "The shaded dihydroxy-acid is a\nchemical decoy for HMG-CoA \u2014 the\nenzyme's natural substrate."),
         (0.510, BLUE,  "The anchor groups", "The rings and fluorophenyl grip\nextra pockets, so it binds far\ntighter than the real substrate."),
         (0.355, GREEN, "Why it matters", "Blocking this one enzyme lowers\nLDL ~35\u201355%; in trials that cuts\nheart attacks and strokes."),
         (0.200, GOLD_D,"The honest caveat", "Absolute benefit tracks baseline\nrisk: large in secondary, smaller\n(higher NNT) in primary prevention.")],
        out)
    return out

def fig_rosuvastatin(force=False):
    slug = "rosuvastatin-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["rosuvastatin"], size=(1300,950),
                        highlight_smarts=STATIN_PHARMACOPHORE, fname=mp)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Medical & Pharmacology · §10.2",
        "Rosuvastatin: the same trick, tuned harder",
        ["Same shaded dihydroxy-acid warhead as atorvastatin \u2014 the part that mimics HMG-CoA and blocks the enzyme.",
         "A different scaffold (with a sulfonyl group) makes it one of the most potent statins per milligram."],
        "Structure: PubChem CID 446157 (C\u2082\u2082H\u2082\u2088FN\u2083O\u2086S, 481.5 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.665, RED,   "Same warhead", "The shaded dihydroxy-acid is\nidentical in job to atorvastatin's:\na decoy for the enzyme's substrate."),
         (0.510, BLUE,  "A polar scaffold", "The sulfonamide and ring make it\nmore water-liking \u2014 it stays in the\nliver and enters cells less."),
         (0.355, GREEN, "Potency", "Among the strongest LDL-lowering\nstatins; large trials (JUPITER)\nshowed event reduction."),
         (0.200, GOLD_D,"The honest caveat", "More potent \u2260 always better; the\nright statin is the one that hits\nyour LDL target and you tolerate.")],
        out)
    return out

def fig_metformin(force=False):
    slug = "metformin-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["metformin"], size=(1000,720), fname=mp, bond_width=4)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Medical & Pharmacology · §10.6   ·   Geroprotectors",
        "Metformin: small molecule, big questions",
        ["A tiny biguanide \u2014 just two joined guanide groups. First-line for type-2 diabetes for decades,",
         "and one of the most-studied candidate longevity drugs. Its mechanism is still not fully settled."],
        "Structure: PubChem CID 4091 (C\u2084H\u2081\u2081N\u2085, 129.2 g/mol) \u00b7 drawn in RDKit",
        [(0.720, BLUE,  "What it is", "A biguanide: two guanide units.\nAmong the smallest drugs in wide\nuse \u2014 the whole molecule fits here."),
         (0.545, GREEN, "What it clearly does", "Lowers blood glucose, mainly by\ncutting the liver's glucose output.\nDecades of RCT evidence in diabetes."),
         (0.370, GOLD_D,"The debated part", "Proposed to act on complex I and\nAMPK, but the longevity mechanism\nis mechanistic \u2014 not settled."),
         (0.195, RED,   "Evidence status", "The TAME trial is designed to test\nanti-aging effects; as of now that\nclaim is unproven in humans.")],
        out)
    return out

def fig_rapamycin(force=False):
    slug = "rapamycin-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["rapamycin"], size=(1400,1000), fname=mp)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Medical & Pharmacology · §10.6   ·   mTOR mechanism §12",
        "Rapamycin: the mTOR brake",
        ["A large macrolide first found in a Rapa Nui soil microbe. It binds FKBP12, and that pair jams mTOR \u2014",
         "the master growth switch. Slows cell growth; extends lifespan in every model organism tested so far."],
        "Structure: PubChem CID 5284616 (C\u2085\u2081H\u2087\u2089NO\u2081\u2083, 914.2 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.720, BLUE,  "A macrolide", "A big ring built by a bacterium.\nMuch larger than a typical pill\ndrug \u2014 that size is the point."),
         (0.545, GREEN, "The mechanism", "It clamps onto FKBP12; the complex\nblocks mTORC1, the cell's grow-vs-\nrepair switch, tipping toward repair."),
         (0.370, GOLD_D,"Longevity evidence", "Extends lifespan in yeast, worms,\nflies and mice \u2014 the strongest animal\ndata of any geroprotector."),
         (0.195, RED,   "The honest caveat", "Human lifespan data do not exist;\nit is immunosuppressive. Intermittent\ndosing is under study, not proven.")],
        out)
    return out

def fig_empagliflozin(force=False):
    slug = "empagliflozin-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["empagliflozin"], size=(1300,950), fname=mp)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Medical & Pharmacology · §10   ·   Metabolic drugs",
        "Empagliflozin: make the kidney spill sugar",
        ["An SGLT2 inhibitor. It blocks the kidney's main glucose re-absorption pump, so excess sugar leaves",
         "in the urine. Began as a diabetes drug; its heart-failure and kidney benefits turned out to be the bigger story."],
        "Structure: PubChem CID 11949646 (C\u2082\u2083H\u2082\u2087ClO\u2087, 450.9 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.720, BLUE,  "The sugar mimic", "The glucose-like ring (right) lets it\nsit in SGLT2, the kidney's glucose\nre-uptake transporter."),
         (0.545, GREEN, "The mechanism", "Blocking that pump dumps ~60\u201380 g\nof glucose a day into urine \u2014 lowering\nblood sugar without insulin."),
         (0.370, GOLD_D,"The real headline", "Large RCTs (EMPA-REG, EMPEROR)\nshowed fewer heart-failure hospital-\nisations and slower kidney decline."),
         (0.195, RED,   "The honest caveat", "Benefits extend beyond diabetes, but\nwatch genital infections and rare\nketoacidosis; not for everyone.")],
        out)
    return out

def fig_semaglutide(force=False):
    """GLP-1(7-37) engineering schematic — the peptide is too large to draw as a
    readable skeletal formula, so we annotate the three deliberate changes."""
    slug = "semaglutide-schematic"
    mpl = _setup_mpl()
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch
    from PIL import Image
    seq = list("HAEGTFTSDVSSYLEGQAAKEFIAWLVRGRG")  # GLP-1(7-37) analogue, His7..Gly37
    n = len(seq)
    fig = plt.figure(figsize=(12,7.6), dpi=200); fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0,0,1,1]); ax.set_xlim(0,12); ax.set_ylim(0,7.6); ax.axis("off")
    ax.text(0.52,7.30,"MEDICAL & PHARMACOLOGY · §10.1  ·  A GLP-1 RECEPTOR AGONIST",
            color=GOLD_D, family=DISPLAY, fontweight="bold", fontsize=12.5, ha="left", va="top")
    ax.text(0.52,6.98,"Semaglutide: a hormone, re-engineered to last",
            color=INK2, family=DISPLAY, fontweight="black", fontsize=24, ha="left", va="top")
    for i,ln in enumerate(["Your gut makes the hormone GLP-1 after a meal \u2014 but it's destroyed in ~2 minutes. Semaglutide is that",
                           "same 31-amino-acid peptide with three deliberate changes that let one injection work for a week."]):
        ax.text(0.52,6.44-i*0.30, ln, color=MUT, family=BODY, fontsize=11.5, ha="left", va="top", style="italic")
    ax.add_line(plt.Line2D([0.52,4.3],[5.80,5.80], color=GOLD, lw=2.4, solid_capstyle="round"))
    per=16; x0,dx=0.75,0.68; rows_y=[4.55,3.35]; pos={}
    for i in range(n):
        r=i//per; c=i%per; pos[i]=(x0+c*dx, rows_y[r])
    for i in range(n-1):
        (x1,y1),(x2,y2)=pos[i],pos[i+1]
        if abs(y1-y2)<0.01: ax.plot([x1,x2],[y1,y1],color="#c8bd9f",lw=2.2,zorder=1)
    (xa,ya)=pos[per-1]; (xb,yb)=pos[per]
    ax.annotate("",xy=(xb,yb),xytext=(xa+0.30,ya),
                arrowprops=dict(arrowstyle="-",color="#c8bd9f",lw=2.2,connectionstyle="arc3,rad=-0.5"),zorder=1)
    hi = {1:("Aib",RED,10), 19:("K",GREEN,12), 27:("R",BLUE,12)}
    for i in range(n):
        x,y=pos[i]
        if i in hi:
            lab,col,fs=hi[i]
            ax.scatter([x],[y],s=560,color=col,edgecolor="white",lw=2.0,zorder=3)
            ax.text(x,y,lab,color="white",family=DISPLAY,fontweight="bold",fontsize=fs,ha="center",va="center",zorder=4)
        else:
            ax.scatter([x],[y],s=430,color="#efe7d2",edgecolor="#c8bd9f",lw=1.4,zorder=2)
            ax.text(x,y,seq[i],color=MUT,family=BODY,fontsize=9.5,ha="center",va="center",zorder=3)
    ax.text(pos[0][0]-0.42,pos[0][1],"N",color=FAINT,family=DISPLAY,fontweight="bold",fontsize=12,ha="center",va="center")
    ax.text(pos[n-1][0]+0.42,pos[n-1][1],"C",color=FAINT,family=DISPLAY,fontweight="bold",fontsize=12,ha="center",va="center")
    kx,ky=pos[19]
    ax.annotate("",xy=(kx,ky-0.95),xytext=(kx,ky-0.24),arrowprops=dict(arrowstyle="-",color=GREEN,lw=2.4))
    ax.text(kx,ky-1.05,"fatty-acid tether:  \u03b3Glu linker + C18 diacid",color=GREEN,family=BODY,fontsize=9.4,
            ha="center",va="top",fontweight="bold")
    cards=[
     (0.52,1.95,RED,"1 \u00b7 Aib at position 8","One unnatural amino acid (Aib) at\nthe spot the enzyme DPP-4 cuts. It\ncan no longer grab the peptide, so\nit survives far longer than ~2 min."),
     (4.35,1.95,GREEN,"2 \u00b7 A fatty-acid tether","A C18 di-acid chain clips the drug\nonto albumin, the blood's carrier\nprotein. It rides along, shielded,\nfor a ~1-week half-life."),
     (8.18,1.95,BLUE,"3 \u00b7 Arg at position 34","Swapping Lys\u2192Arg here leaves just\none attachment point, so the fatty\nchain goes exactly where intended \u2014\nclean, single-site chemistry."),
    ]
    for x,y,col,title,body in cards:
        ax.add_patch(FancyBboxPatch((x,y-1.55),3.35,1.62,boxstyle="round,pad=0.03,rounding_size=0.06",
                     facecolor=CARD,edgecolor=col,lw=1.7,zorder=3))
        ax.text(x+0.16,y-0.16,title,color=col,family=DISPLAY,fontweight="bold",fontsize=12,ha="left",va="top",zorder=4)
        for i,ln in enumerate(body.split("\n")):
            ax.text(x+0.16,y-0.52-i*0.255,ln,color=MUT,family=BODY,fontsize=9.6,ha="left",va="top",zorder=4)
    ax.add_line(plt.Line2D([0.52,11.48],[0.30,0.30],color=RULE,lw=0.9))
    ax.text(0.52,0.15,"Sequence: human GLP-1(7-37) analogue \u00b7 engineering per Lau et al. 2015 J Med Chem \u00b7 schematic, not to scale",
            color=FAINT,family=BODY,fontsize=8.2,ha="left",va="center")
    ax.text(11.48,0.15,"figure: semaglutide-schematic",color=GOLD_D,family=MONO,fontsize=7.6,ha="right",va="center")
    out = os.path.join(FIGDIR, slug + ".png")
    fig.savefig(out,dpi=200,facecolor=PAPER); plt.close(fig)
    return out

# ----------------------------------------------------------------------------
# PROTEIN / COMPLEX FIGURES
# ----------------------------------------------------------------------------
def fig_atp_synthase(force=False):
    slug = "atp-synthase-turbine"
    body = f"""
color {PX_GOLD}, chain A+B+C+D+E+F+W
color {PX_RED}, chain G+H+I
color {PX_BLUE}, chain J+K+L+M+N+O+P+Q
color {PX_GREEN}, chain S+T+U+V
show cartoon
orient
turn z, 90
zoom mol, 4
"""
    raw = render_pymol(slug, "5ARA", body, ray=(1600,2100), force=force)
    img = crop_to_content(raw)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    membrane = dict(y_top_px=int(ih*0.725), y_bot_px=int(ih*0.915),
                    label="INNER MITOCHONDRIAL MEMBRANE",
                    matrix=("MATRIX", "low H$^+$ \u00b7 ATP made here"),
                    ims="INTERMEMBRANE SPACE", matrix_x=0.075, ims_x=0.075)
    labels = [
      dict(anchor=(560,470),  xy=(0.045,0.66),  title="F$_1$ HEAD  ($\\alpha_3\\beta_3$)",
           desc="Six subunits; three catalytic\nsites take turns making ATP", color=GOLD_F1),
      dict(anchor=(455,1050), xy=(0.045,0.435), title="CENTRAL ROTOR  ($\\gamma$)",
           desc="An asymmetric shaft \u2014 the\ncrankshaft that turns the head", color=RED),
      dict(anchor=(460,1560), xy=(0.045,0.205), title="c-RING  (F$_o$)",
           desc="8 subunits; each proton that\ncrosses clicks it round one notch", color=BLUE),
      dict(anchor=(880,560),  xy=(0.955,0.655), title="PERIPHERAL STATOR",
           desc="The stationary arm \u2014 stops the\nhead spinning with the rotor", color=GREEN, ha="right"),
      dict(anchor=(760,1520), xy=(0.955,0.235), title="a-SUBUNIT",
           desc="Two half-channels \u2014 the proton\nentry and exit gate", color=AMBER, ha="right"),
    ]
    def extras(ax, P):
        import matplotlib.patheffects as pe
        myt, myb, _, _ = membrane["_band"]
        ax.annotate("", xy=(0.285,myt+0.045), xytext=(0.285,myb-0.035), xycoords=ax.transAxes,
            arrowprops=dict(arrowstyle="-|>", color="#8a5a2a", lw=2.6,
            connectionstyle="arc3,rad=0.16"), zorder=4)
        ax.text(0.268,(myt+myb)/2, "H$^+$", color="#8a5a2a", family=BODY, fontweight="bold",
                fontsize=15, ha="right", va="center", transform=ax.transAxes, zorder=5,
                path_effects=_halo(pe))
    protein_figure(slug, img,
        "Foundations · §2.3   ·   Mitochondrial Health · §37.2.2",
        "ATP synthase: the molecular turbine",
        ["The enzyme behind most of your ATP. A proton current flowing back into the matrix",
         "spins a rotor that mechanically presses ADP and phosphate together into ATP.",
         "Bovine mitochondrial enzyme, cryo-EM \u00b7 PDB 5ARA (Zhou et al. 2015)."],
        "Structure: RCSB PDB 5ARA \u00b7 rendered in PyMOL \u00b7 colours are functional-module assignments",
        labels, out, figsize=(9.2,12.0), img_box=(0.235,0.06,0.611,0.72),
        membrane=membrane, extras=extras)
    return out

def fig_complex_i(force=False):
    slug = "complex-I-etc"
    body = f"""
color {PX_BLUE}, chain A+H+J+K+L+M+N
color {PX_GOLD}, not (chain A+H+J+K+L+M+N)
show cartoon
select wire, resn FMN+SF4+FES
show spheres, wire
color {PX_RED}, resn SF4+FES
color {PX_FAD}, resn FMN
set sphere_scale, 1.4, wire
orient
turn z, 42
zoom mol, 6
"""
    raw = render_pymol(slug, "6ZKC", body, ray=(2200,1480), force=force)
    img = crop_to_content(raw)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    membrane = dict(y_top_px=int(ih*0.552), y_bot_px=int(ih*0.905),
                    label="INNER MITOCHONDRIAL MEMBRANE", matrix=None, ims=None)
    labels = [
      dict(anchor=(980,175), xy=(0.755,0.80),  title="NADH docks here",
           desc="Delivers 2 electrons stripped\nfrom the food you burned", color=GREEN),
      dict(anchor=(940,340), xy=(0.755,0.605), title="IRON\u2013SULFUR WIRE",
           desc="7 clusters (red) hand the electrons\ndown, one hop at a time", color=RED),
      dict(anchor=(760,600), xy=(0.755,0.42),  title="UBIQUINONE SITE",
           desc="Electrons exit onto a mobile carrier\nthat ferries them to Complex III", color=AMBER),
    ]
    arrows = [dict(kind="proton", xs=(0.20,0.33,0.46,0.59)),
              dict(kind="electron", from_px=(930,175), to_px=(950,500), rad=0.12)]
    cards = [dict(xy_wh=(0.035,0.560,0.255,0.175), color=BLUE, title="THE PROTON PUMPS",
                  sub="(the ND membrane subunits)",
                  lines=["Four channels lying in the membrane.","Energy from the electrons drives them",
                         "to push H\u207a across \u2014 building the","gradient that ATP synthase later",
                         "cashes in to make ATP."],
                  anchor=(360,780))]
    def extras(ax, P):
        import matplotlib.patheffects as pe
        myt, myb, _, _ = membrane["_band"]
        ax.text(0.31,0.505,"MATRIX",color=GREEN,family=DISPLAY,fontweight="bold",fontsize=11,
                ha="left",va="bottom",transform=ax.transAxes,zorder=5,path_effects=_halo(pe))
        ax.text(0.31,0.487,"where NADH is oxidised",color=MUT,family=BODY,fontsize=9,
                ha="left",va="top",transform=ax.transAxes,zorder=5,path_effects=_halo(pe))
        ax.text(0.35,myb-0.018,"INTERMEMBRANE SPACE  \u00b7  protons pumped out to here",color="#8a5a2a",
                family=DISPLAY,fontweight="bold",fontsize=10,ha="left",va="top",
                transform=ax.transAxes,zorder=5,path_effects=_halo(pe))
    protein_figure(slug, img,
        "Foundations · §2.1   ·   Mitochondrial Health · §37.2.2",
        "Complex I: where the electron transport chain begins",
        ["The largest enzyme of the respiratory chain. It strips electrons from NADH, relays them down a wire of",
         "iron-sulfur clusters, and uses the energy to pump protons across the membrane \u2014 the first of three pumps.",
         "Mammalian Complex I, cryo-EM \u00b7 PDB 6ZKC (Kampjut & Sazanov 2020)."],
        "Structure: RCSB PDB 6ZKC \u00b7 rendered in PyMOL \u00b7 red = Fe-S clusters, orange = FMN \u00b7 colours are functional-module assignments",
        labels, out, figsize=(12.5,9.6), img_box=(0.055,0.075,0.66,0.71),
        membrane=membrane, arrows=arrows, cards=cards, extras=extras)
    return out


def _load_raw(slug, pdb, body, ray, force=False):
    raw = render_pymol(slug, pdb, body, ray=ray, force=force)
    return crop_to_content(raw)

def fig_complex_ii(force=False):
    slug = "complex-II-sdh"
    img = _load_raw(slug, "1ZOY", _BODY_COMPLEX_II, (2000,1700), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    membrane = dict(y_top_px=int(ih*0.60), y_bot_px=int(ih*0.92),
                    label="INNER MITOCHONDRIAL MEMBRANE",
                    matrix=("MATRIX", "hydrophilic head sits here"), ims=None,
                    matrix_x=0.60)
    labels = [
      dict(anchor=(int(iw*0.42),int(ih*0.20)), xy=(0.045,0.66), title="FAD \u2014 the electron grab",
           desc="Bound flavin (yellow) rips 2 electrons\noff succinate from the Krebs cycle", color=AMBER),
      dict(anchor=(int(iw*0.40),int(ih*0.36)), xy=(0.045,0.44), title="IRON\u2013SULFUR RELAY",
           desc="Three clusters (red) carry the\nelectrons down toward the membrane", color=RED),
      dict(anchor=(int(iw*0.45),int(ih*0.72)), xy=(0.045,0.24), title="HEME b + ubiquinone",
           desc="Electrons pass to a heme, then onto\nubiquinone \u2014 the same carrier as Complex I", color="#8a2f1a"),
    ]
    cards = [dict(xy_wh=(0.70,0.90,0.28,0.20), color=GOLD_D, title="IT DOES NOT PUMP PROTONS",
                  sub="the honest exception",
                  lines=["Complexes I, III and IV pump H\u207a.","Complex II only hands electrons",
                         "into the chain \u2014 it adds no protons","to the gradient. That is why it is",
                         "also plain Krebs-cycle enzyme SDH."], anchor=None)]
    protein_figure(slug, img,
        "Mitochondrial Health · §37.2.2   ·   the ETC, complex by complex",
        "Complex II: the chain's side entrance",
        ["Also called succinate dehydrogenase \u2014 the one enzyme that sits in both the Krebs cycle and the",
         "respiratory chain. It feeds electrons in from succinate, but unlike the others it pumps no protons.",
         "Porcine Complex II, X-ray \u00b7 PDB 1ZOY (Sun et al. 2005)."],
        "Structure: RCSB PDB 1ZOY \u00b7 rendered in PyMOL \u00b7 red = Fe-S, yellow = FAD, dark red = heme \u00b7 colours are functional-module assignments",
        labels, out, membrane=membrane, cards=cards)
    return out

def fig_complex_iii(force=False):
    slug = "complex-III-bc1"
    img = _load_raw(slug, "1BGY", _BODY_COMPLEX_III, (2000,1800), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    membrane = dict(y_top_px=int(ih*0.40), y_bot_px=int(ih*0.70),
                    label="INNER MITOCHONDRIAL MEMBRANE",
                    matrix=("MATRIX", "negative side"), ims="INTERMEMBRANE SPACE", matrix_x=0.60)
    labels = [
      dict(anchor=(int(iw*0.50),int(ih*0.30)), xy=(0.045,0.62), title="THE Q-CYCLE CORE",
           desc="Cytochrome b (blue) shuttles electrons\nthrough two quinone sites \u2014 a clever\nloop that doubles the protons moved", color=BLUE),
      dict(anchor=(int(iw*0.55),int(ih*0.20)), xy=(0.045,0.40), title="RIESKE Fe\u2013S + heme c1",
           desc="Hand electrons out to cytochrome c,\nthe next mobile carrier in the chain", color=RED),
      dict(anchor=(int(iw*0.52),int(ih*0.55)), xy=(0.955,0.40), title="b-type HEMES",
           desc="The iron centres (dark red) that\nferry electrons across the membrane", color="#8a2f1a", ha="right"),
    ]
    arrows = [dict(kind="proton", xs=(0.30,0.52))]
    protein_figure(slug, img,
        "Mitochondrial Health · §37.2.2   ·   the ETC, complex by complex",
        "Complex III: the proton-doubling loop",
        ["Cytochrome bc\u2081. It takes electrons from the mobile carrier ubiquinone and passes them to cytochrome c \u2014",
         "and through a mechanism called the Q-cycle it pumps twice the protons you'd naively expect.",
         "Bovine Complex III dimer, X-ray \u00b7 PDB 1BGY (Iwata et al. 1998)."],
        "Structure: RCSB PDB 1BGY \u00b7 rendered in PyMOL \u00b7 red = Rieske Fe-S, dark red = hemes \u00b7 colours are functional-module assignments",
        labels, out, membrane=membrane, arrows=arrows)
    return out

def fig_complex_iv(force=False):
    slug = "complex-IV-cox"
    img = _load_raw(slug, "1OCC", _BODY_COMPLEX_IV, (2200,1500), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    membrane = dict(y_top_px=int(ih*0.18), y_bot_px=int(ih*0.82),
                    label="INNER MITOCHONDRIAL MEMBRANE",
                    matrix=None, ims=None)
    labels = [
      dict(anchor=(int(iw*0.42),int(ih*0.45)), xy=(0.045,0.60), title="HEME a + a$_3$ / Cu centres",
           desc="Iron hemes and copper (orange) form\nthe site where electrons finally meet\noxygen", color="#8a2f1a"),
      dict(anchor=(int(iw*0.60),int(ih*0.42)), xy=(0.955,0.60), title="O$_2$ \u2192 WATER",
           desc="Four electrons + O\u2082 + 4 H\u207a make two\nwater molecules \u2014 the reason you breathe", color=BLUE, ha="right"),
    ]
    arrows = [dict(kind="proton", xs=(0.32,0.50,0.66))]
    protein_figure(slug, img,
        "Mitochondrial Health · §37.2.2   ·   the ETC, complex by complex",
        "Complex IV: where breathing meets oxygen",
        ["Cytochrome c oxidase, the chain's final step. It collects electrons from cytochrome c and uses them to",
         "reduce oxygen to water \u2014 the reaction that gives your lungs their purpose \u2014 while pumping more protons.",
         "Bovine Complex IV, X-ray \u00b7 PDB 1OCC (Tsukihara et al. 1996)."],
        "Structure: RCSB PDB 1OCC \u00b7 rendered in PyMOL \u00b7 dark red = hemes, orange = copper \u00b7 colours are functional-module assignments",
        labels, out, figsize=(12.5,9.0), img_box=(0.185,0.075,0.50,0.62), membrane=membrane, arrows=arrows)
    return out

# ---- render body specs for the 8 new structures (colours + orientation) ----
# Cofactor residue names shown as spheres per structure.
_BODY_COMPLEX_II = f"""
color {PX_GOLD}, chain A+B
color {PX_BLUE}, chain C+D
show cartoon
select cof_fes, resn SF4+FES+F3S
select cof_fad, resn FAD
select cof_hem, resn HEM
select cof_uq,  resn UQ1
show spheres, cof_fes or cof_fad or cof_hem or cof_uq
color {PX_RED}, cof_fes
color {PX_FAD}, cof_fad
color {PX_HEME}, cof_hem
color {PX_AMBER}, cof_uq
set sphere_scale, 1.2, (cof_fes or cof_fad or cof_hem or cof_uq)
orient
turn z, 90
zoom mol, 4
"""
_BODY_COMPLEX_III = f"""
color {PX_GOLD}, all
color {PX_BLUE}, chain C+P
show cartoon
select cof_hem, resn HEM+HEC
select cof_fes, resn FES
show spheres, cof_hem or cof_fes
color {PX_HEME}, cof_hem
color {PX_RED}, cof_fes
set sphere_scale, 1.1, (cof_hem or cof_fes)
orient
turn z, 90
zoom mol, 4
"""
_BODY_COMPLEX_IV = f"""
color {PX_GOLD}, all
color {PX_BLUE}, chain A+B+C
show cartoon
select cof_hem, resn HEA
select cof_cu, resn CU
show spheres, cof_hem or cof_cu
color {PX_HEME}, cof_hem
color {PX_CU}, cof_cu
set sphere_scale, 1.2, cof_hem
set sphere_scale, 1.7, cof_cu
orient
zoom mol, 4
"""
_BODY_DNA = f"""
set cartoon_ring_mode, 3
set cartoon_ring_finder, 1
set cartoon_nucleic_acid_mode, 4
show cartoon
color {PX_BLUE}, chain A
color {PX_GOLD}, chain B
set cartoon_ring_color, {PX_RED}
orient
turn z, 90
zoom mol, 3
"""
_BODY_HEMOGLOBIN = f"""
show cartoon
color {PX_BLUE}, chain A+C
color {PX_TEAL}, chain B+D
select heme, resn HEM
show spheres, heme
color {PX_HEME}, heme
set sphere_scale, 1.0, heme
orient
zoom mol, 3
"""
_BODY_IGG = f"""
show cartoon
color {PX_GOLD}, all
color {PX_BLUE}, chain A+C
orient
zoom mol, 3
"""
_BODY_INSULIN = f"""
remove not chain A+B
show cartoon
set cartoon_transparency, 0.0
color {PX_BLUE}, chain A
color {PX_GOLD}, chain B
select cys_ss, (resn CYS and chain A+B)
show sticks, cys_ss
set stick_radius, 0.5, cys_ss
color {PX_AMBER}, (cys_ss and elem S)
show spheres, (cys_ss and elem S)
set sphere_scale, 0.6, (cys_ss and elem S)
orient
turn z, 90
zoom chain A+B, 4
"""
_BODY_NAK = f"""
show cartoon
color {PX_GOLD}, chain A
color {PX_PURPLE}, chain B
color {PX_TEAL}, chain G
select ions, resn K+NA+MG+MF4
show spheres, ions
color {PX_BLUE}, resn K
color {PX_AMBER}, resn NA
color {PX_GREEN}, resn MG+MF4
set sphere_scale, 1.4, ions
orient
turn z, 90
zoom mol, 4
"""

def fig_dna(force=False):
    slug = "dna-double-helix"
    img = _load_raw(slug, "1BNA", _BODY_DNA, (1500,2100), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    labels = [
      dict(anchor=(int(iw*0.50),int(ih*0.30)), xy=(0.045,0.62), title="THE BASE PAIRS",
           desc="Flat rungs (red) \u2014 A pairs with T,\nG with C. Their order is the code.", color=RED),
      dict(anchor=(int(iw*0.30),int(ih*0.50)), xy=(0.045,0.40), title="SUGAR\u2013PHOSPHATE BACKBONE",
           desc="Two strands (blue, gold) spiral in\nopposite directions \u2014 antiparallel", color=BLUE),
      dict(anchor=(int(iw*0.62),int(ih*0.62)), xy=(0.955,0.55), title="MAJOR GROOVE",
           desc="The wide gulf where proteins read\nthe sequence without unzipping it", color=GOLD_D, ha="right"),
      dict(anchor=(int(iw*0.60),int(ih*0.44)), xy=(0.955,0.35), title="MINOR GROOVE",
           desc="The narrow groove \u2014 the other face\nof the same double helix", color=AMBER, ha="right"),
    ]
    protein_figure(slug, img,
        "Foundations · §4.1   ·   DNA & the genome",
        "DNA: the double helix, actual size and shape",
        ["The molecule that stores your genetic code. Two strands wind around each other; the rungs between",
         "them are base pairs whose sequence spells out every protein you can make.",
         "Drew\u2013Dickerson dodecamer, X-ray \u00b7 PDB 1BNA (Drew et al. 1981)."],
        "Structure: RCSB PDB 1BNA \u00b7 rendered in PyMOL \u00b7 red = base-pair rungs \u00b7 colours are functional-module assignments",
        labels, out, figsize=(9.6,11.5), img_box=(0.30,0.06,0.42,0.74))
    return out

def fig_hemoglobin(force=False):
    slug = "hemoglobin"
    img = _load_raw(slug, "2HHB", _BODY_HEMOGLOBIN, (1900,1700), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    labels = [
      dict(anchor=(int(iw*0.32),int(ih*0.30)), xy=(0.045,0.60), title="TWO $\\alpha$ CHAINS",
           desc="Blue subunits \u2014 half of the\nfour-part protein", color=BLUE),
      dict(anchor=(int(iw*0.66),int(ih*0.30)), xy=(0.955,0.60), title="TWO $\\beta$ CHAINS",
           desc="Teal subunits \u2014 the other half.\nAll four cooperate as one unit", color="#2f7d78", ha="right"),
      dict(anchor=(int(iw*0.40),int(ih*0.28)), xy=(0.045,0.34), title="FOUR HEME GROUPS",
           desc="Each holds an iron atom (dark red)\nthat grabs one O\u2082 \u2014 four per protein", color="#8a2f1a"),
    ]
    cards = [dict(xy_wh=(0.70,0.34,0.28,0.19), color=GREEN, title="COOPERATIVE BINDING",
                  sub="why the curve is S-shaped",
                  lines=["Grabbing the first O\u2082 makes the","next three easier. That teamwork",
                         "is what lets blood load oxygen in","the lungs and dump it in tissues."], anchor=None)]
    protein_figure(slug, img,
        "Anatomy & Physiology · §18 B.4.1   ·   Oxygen transport",
        "Hemoglobin: the four-seat oxygen taxi",
        ["The protein that makes blood red and carries oxygen from your lungs to every tissue. Four subunits,",
         "each cradling an iron-containing heme that binds one oxygen molecule.",
         "Human deoxyhemoglobin, X-ray \u00b7 PDB 2HHB (Fermi et al. 1984)."],
        "Structure: RCSB PDB 2HHB \u00b7 rendered in PyMOL \u00b7 dark red = heme iron \u00b7 colours are functional-module assignments",
        labels, out, figsize=(12.5,9.0), img_box=(0.205,0.075,0.49,0.66), membrane=None, cards=cards)
    return out

def fig_igg(force=False):
    slug = "igg-antibody"
    img = _load_raw(slug, "1IGT", _BODY_IGG, (2200,1700), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    labels = [
      dict(anchor=(int(iw*0.22),int(ih*0.30)), xy=(0.045,0.62), title="ANTIGEN-BINDING TIPS",
           desc="The two Fab arm tips (blue) grip the\ntarget \u2014 a virus, toxin or microbe.\nThese tips vary to fit any shape", color=BLUE),
      dict(anchor=(int(iw*0.78),int(ih*0.30)), xy=(0.955,0.62), title="THE OTHER ARM",
           desc="Identical binding site \u2014 one antibody\ngrabs two copies of its target", color=BLUE, ha="right"),
      dict(anchor=(int(iw*0.50),int(ih*0.70)), xy=(0.955,0.32), title="Fc STEM",
           desc="The constant stem (gold) is the handle\nimmune cells grab to destroy whatever\nthe arms caught", color=GOLD_D, ha="right"),
    ]
    protein_figure(slug, img,
        "Medical & Pharmacology · §10.5   ·   Immunity & vaccines",
        "Antibody (IgG): the immune system's Y-shaped grappler",
        ["The Y-shaped protein your immune system makes to recognise a specific threat. Two arms grip the",
         "target; the stem flags it for destruction. Every monoclonal-antibody drug is built on this shape.",
         "Intact murine IgG2a, X-ray \u00b7 PDB 1IGT (Harris et al. 1997)."],
        "Structure: RCSB PDB 1IGT \u00b7 rendered in PyMOL \u00b7 blue = variable Fab arms, gold = constant Fc \u00b7 colours are functional-module assignments",
        labels, out)
    return out

def fig_insulin(force=False):
    slug = "insulin"
    img = _load_raw(slug, "4INS", _BODY_INSULIN, (1700,1500), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    labels = [
      dict(anchor=(int(iw*0.40),int(ih*0.30)), xy=(0.045,0.60), title="A CHAIN  (21 aa)",
           desc="The shorter chain (blue) \u2014 one of\ntwo peptides that make up insulin", color=BLUE),
      dict(anchor=(int(iw*0.55),int(ih*0.65)), xy=(0.955,0.60), title="B CHAIN  (30 aa)",
           desc="The longer chain (gold). The two are\nmade as one, then cut and re-joined", color=GOLD_D, ha="right"),
      dict(anchor=(int(iw*0.48),int(ih*0.48)), xy=(0.045,0.32), title="DISULFIDE BRIDGES",
           desc="Three sulfur\u2013sulfur clasps (amber) pin\nthe chains together \u2014 lose them and the\nhormone falls apart", color=AMBER),
    ]
    cards = [dict(xy_wh=(0.70,0.34,0.28,0.17), color=GOLD_D, title="A HORMONE — A CHEMICAL MESSENGER",
                  sub="what it actually does",
                  lines=["Insulin carries no reaction of its","own. It is a signal \u2014 it docks on a",
                         "receptor and tells cells to pull","glucose out of the blood."], anchor=None)]
    protein_figure(slug, img,
        "Medical & Pharmacology · §10.7   ·   Metabolic hormones",
        "Insulin: the smallest hormone that runs your metabolism",
        ["The hormone that tells your cells to take up sugar. Two short peptide chains clasped together by",
         "sulfur bridges \u2014 tiny next to the enzymes it regulates, but one of the most consequential molecules in the body.",
         "Porcine insulin, X-ray \u00b7 PDB 4INS (Baker et al. 1988)."],
        "Structure: RCSB PDB 4INS \u00b7 rendered in PyMOL \u00b7 amber = disulfide sulfurs \u00b7 colours are functional-module assignments",
        labels, out, figsize=(11.5,9.0), img_box=(0.06,0.075,0.60,0.72), cards=cards)
    return out

def fig_na_k_atpase(force=False):
    slug = "na-k-atpase"
    img = _load_raw(slug, "2ZXE", _BODY_NAK, (1700,2100), force)
    iw, ih = img.size
    out = os.path.join(FIGDIR, slug + ".png")
    membrane = dict(y_top_px=int(ih*0.24), y_bot_px=int(ih*0.50),
                    label="CELL MEMBRANE (plasma membrane)",
                    matrix=("OUTSIDE THE CELL", "extracellular side"),
                    ims="INSIDE THE CELL  \u00b7  cytoplasm", matrix_x=0.045)
    labels = [
      dict(anchor=(int(iw*0.55),int(ih*0.85)), xy=(0.045,0.24), title="ATP-POWERED ENGINE",
           desc="The cytoplasmic domains (gold) burn\none ATP per cycle \u2014 the power stroke", color=GOLD_D),
      dict(anchor=(int(iw*0.52),int(ih*0.40)), xy=(0.955,0.55), title="THE ION CHANNEL",
           desc="Ten membrane helices form the path\nthat swaps sodium for potassium", color="#6b4a86", ha="right"),
    ]
    cards = [dict(xy_wh=(0.665,0.235,0.30,0.185), color=GREEN, title="3 SODIUM OUT, 2 POTASSIUM IN",
                  sub="every single cycle",
                  lines=["It pushes 3 Na\u207a out and pulls 2 K\u207a","in, against their gradients. This one",
                         "pump burns roughly a fifth of your","resting energy \u2014 it is why cells can",
                         "hold a voltage and fire at all."], anchor=None)]
    protein_figure(slug, img,
        "Nervous System · §14.1.2   ·   Foundations §3.1",
        "The Na$^+$/K$^+$ pump: the cell's battery charger",
        ["The protein that keeps sodium out and potassium in \u2014 the gradient behind every nerve impulse and",
         "heartbeat. It spends ATP to push both ions uphill, and it runs in every cell you have.",
         "Dogfish-shark Na\u207a/K\u207a-ATPase, X-ray \u00b7 PDB 2ZXE (Shinoda et al. 2009)."],
        "Structure: RCSB PDB 2ZXE \u00b7 rendered in PyMOL \u00b7 colours are functional-module assignments",
        labels, out, figsize=(10.5,11.0), img_box=(0.30,0.06,0.42,0.74),
        membrane=membrane, cards=cards)
    return out

# ----------------------------------------------------------------------------
# registry + runner
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
# SMALL-MOLECULE FIGURES — wave 2 (high-mention foundational molecules)
# ----------------------------------------------------------------------------
def fig_cholesterol(force=False):
    slug = "cholesterol-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["cholesterol"], size=(1200,900), fname=mp, bond_width=3)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Foundations · \u00a72   \u00b7   Clinical Prevention · \u00a707   \u00b7   Cardiometabolic · \u00a722",
        "Cholesterol: an essential molecule the body makes",
        ["A rigid four-ring sterol your body makes and needs \u2014 for cell membranes, steroid hormones, and vitamin D.",
         "It is not intrinsically harmful. Risk comes from how much rides in artery-invading (apoB) particles, and for how long."],
        "Structure: PubChem CID 5997 (C\u2082\u2087H\u2084\u2086O, 386.7 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.720, BLUE,  "What it is", "A sterol: four fused rings plus a\ntail. Stiff and oily \u2014 it packs into\nmembranes and stiffens them."),
         (0.545, GREEN, "What it does", "Raw material for cell membranes,\nfor cortisol, testosterone and\noestrogen, and for vitamin D."),
         (0.370, GOLD_D,"Why it travels packaged", "Being oily, it cannot dissolve in\nblood; it rides inside lipoproteins\n(LDL, HDL, Lp(a)) wrapped in apoB/apoA."),
         (0.195, RED,   "The honest lever", "The cholesterol molecule is not the\nrisk \u2014 the number of apoB particles\ncarrying it, over a lifetime, is.")],
        out)
    return out

def fig_testosterone(force=False):
    slug = "testosterone-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["testosterone"], size=(1150,860), fname=mp, bond_width=3)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Endocrine & Hormones · \u00a713   \u00b7   Medical & Pharmacology · \u00a710   \u00b7   Life Stages · \u00a719",
        "Testosterone: the principal androgen",
        ["A steroid hormone built from cholesterol, in both sexes (much higher in men). It signals through the",
         "androgen receptor to build muscle and bone, drive libido, and shape male development."],
        "Structure: PubChem CID 6013 (C\u2081\u2089H\u2082\u2088O\u2082, 288.4 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.720, BLUE,  "What it is", "A four-ring steroid, made from\ncholesterol. The small changes to\nthe rings are what make it an androgen."),
         (0.545, GREEN, "What it does", "Binds the androgen receptor:\nbuilds muscle and bone, sets libido,\ndrives male sexual development."),
         (0.370, GOLD_D,"With age", "Levels decline gradually in men\n(~1%/yr after ~30\u201340). A real trend,\noften overstated as a crisis."),
         (0.195, RED,   "The honest caveat", "Replacement helps real deficiency\n(measured, symptomatic); for normal\nage-related decline the benefit is\nunproven and carries risks.")],
        out)
    return out

def fig_nad(force=False):
    slug = "nad-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["nad"], size=(1500,1000), fname=mp, bond_width=3)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Foundations · \u00a72   \u00b7   Mitochondrial Health · \u00a737   \u00b7   Geroprotectors",
        "NAD+ : the electron ferry of metabolism",
        ["The cell's central redox carrier. It shuttles electrons from fuel into the electron transport chain,",
         "and is a substrate for sirtuins and PARPs. Levels fall with age \u2014 which launched a supplement industry."],
        "Structure: PubChem CID 5893 (C\u2082\u2081H\u2082\u2088N\u2087O\u2081\u2084P\u2082\u207a, 664.4 g/mol) \u00b7 drawn in RDKit \u00b7 oxidised form",
        [(0.720, BLUE,  "What it is", "Two nucleotides joined by phosphates.\nThe nicotinamide ring (left) is the\nbusiness end that carries electrons."),
         (0.545, GREEN, "What it does", "Accepts electrons (\u2192 NADH) from the\nKrebs cycle and delivers them to\nComplex I \u2014 the start of ATP-making."),
         (0.370, GOLD_D,"The aging link", "Also fuels sirtuins and DNA-repair\nPARPs. Tissue NAD\u207a declines with age;\nthat decline is well documented."),
         (0.195, RED,   "The honest caveat", "Restoring NAD\u207a with NMN/NR raises\nblood levels, but human outcome\nbenefits are not yet demonstrated \u2014\nsurrogate data, not lifespan data.")],
        out)
    return out

def fig_cortisol(force=False):
    slug = "cortisol-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["cortisol"], size=(1150,860), fname=mp, bond_width=3)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Endocrine & Hormones · \u00a713   \u00b7   Recovery, Sleep & Stress · \u00a705   \u00b7   Foundations · \u00a76",
        "Cortisol: the stress and rhythm hormone",
        ["The main glucocorticoid, made from cholesterol in the adrenal cortex under HPA-axis control. It mobilises",
         "glucose, tunes immunity, and follows a daily rhythm \u2014 high on waking, low at night. Necessary for life at the right level; harmful in chronic excess."],
        "Structure: PubChem CID 5754 (C\u2082\u2081H\u2083\u2080O\u2085, 362.5 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.720, BLUE,  "What it is", "A steroid (glucocorticoid) built\nfrom cholesterol. The added oxygens\ndistinguish it from the sex steroids."),
         (0.545, GREEN, "What it does", "Raises available glucose, dampens\ninflammation, and sets a daily\nrhythm: peak on waking, trough late."),
         (0.370, GOLD_D,"The rhythm matters", "A healthy curve \u2014 sharp morning rise,\nnight-time low \u2014 matters more than any\nsingle number. Chronic flattening is\nthe warning sign."),
         (0.195, RED,   "The honest caveat", "\"Adrenal fatigue\" is not a recognised\ndiagnosis; single spot cortisol tests\nrarely guide healthy-person decisions.")],
        out)
    return out

def fig_aspirin(force=False):
    slug = "aspirin-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["aspirin"], size=(1000,750), fname=mp, bond_width=4)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Medical & Pharmacology · \u00a710   \u00b7   Pharmacology (Full) · \u00a728   \u00b7   Clinical Prevention · \u00a707",
        "Aspirin: the small molecule that reshaped medicine",
        ["Acetylsalicylic acid \u2014 among the oldest and smallest drugs still in daily use. Its acetyl group",
         "permanently switches off the COX enzymes, blocking prostaglandins (pain, fever) and platelet clotting."],
        "Structure: PubChem CID 2244 (C\u2089H\u2088O\u2084, 180.2 g/mol) \u00b7 drawn in RDKit",
        [(0.720, BLUE,  "What it is", "A benzene ring with two small groups:\nan acetyl ester and a carboxylic acid.\nThe whole drug fits on one line."),
         (0.545, GREEN, "The mechanism", "The acetyl group irreversibly acetylates\nCOX-1/COX-2 \u2014 shutting off prostaglandin\nand thromboxane synthesis."),
         (0.370, GOLD_D,"Two jobs", "Higher doses relieve pain and fever;\nlow \"baby\" doses keep platelets from\nclumping \u2014 the cardiovascular use."),
         (0.195, RED,   "The honest caveat", "For secondary prevention (after a\nheart attack) the benefit is clear;\nroutine primary-prevention use is no\nlonger advised \u2014 bleeding risk offsets it.")],
        out)
    return out

def fig_vitamin_d3(force=False):
    slug = "vitamin-d3-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["vitamin-d3"], size=(1200,900), fname=mp, bond_width=3)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Nutrition & Supplements · \u00a703   \u00b7   Clinical Prevention · \u00a707   \u00b7   Endocrine · \u00a713",
        "Vitamin D3: the sunlight-made hormone",
        ["Cholecalciferol \u2014 a broken-open sterol ring that skin makes from a cholesterol relative under UVB light.",
         "It is really a pro-hormone: the liver and kidney convert it to the active form that manages calcium and more."],
        "Structure: PubChem CID 5280795 (C\u2082\u2087H\u2084\u2084O, 384.6 g/mol) \u00b7 drawn in RDKit \u00b7 stereochemistry as deposited",
        [(0.720, BLUE,  "What it is", "A secosteroid: the sterol B-ring is\nsplit open (that break is why UVB\nlight can make it in your skin)."),
         (0.545, GREEN, "What it does", "Converted to calcitriol, it manages\ncalcium absorption and bone mineral-\nisation, and signals in many tissues."),
         (0.370, GOLD_D,"Deficiency is real", "Correcting real deficiency helps\nbone health and falls in the elderly;\nblood level guides who needs it."),
         (0.195, RED,   "The honest caveat", "Large RCTs (VITAL) found no cancer or\ncardiovascular benefit from supplements\nin the already-replete \u2014 more is not better.")],
        out)
    return out

def fig_creatine(force=False):
    slug = "creatine-structure"
    mp = _tmp(slug)
    draw_small_molecule(SMILES["creatine"], size=(1000,720), fname=mp, bond_width=4)
    out = os.path.join(FIGDIR, slug + ".png")
    molecule_figure(slug, mp,
        "Nutrition & Supplements · \u00a703   \u00b7   Mechanism Bridge · \u00a712   \u00b7   Mitochondrial Health · \u00a737",
        "Creatine: the ATP re-buffer",
        ["A small nitrogen compound your body makes and you also eat in meat. Stored in muscle as phosphocreatine,",
         "it regenerates ATP in seconds during hard effort. One of the best-evidenced, cheapest supplements there is."],
        "Structure: PubChem CID 586 (C\u2084H\u2089N\u2083O\u2082, 131.1 g/mol) \u00b7 drawn in RDKit",
        [(0.720, BLUE,  "What it is", "A tiny amino-acid derivative with a\nguanidinium group \u2014 the part that\nholds the high-energy phosphate."),
         (0.545, GREEN, "The mechanism", "Phosphocreatine hands its phosphate\nto spent ADP, remaking ATP fast \u2014\nthe muscle's rapid energy buffer."),
         (0.370, GOLD_D,"The evidence", "Monohydrate, ~3\u20135 g/day, reliably\nadds strength and lean mass with\ntraining; among the strongest\nsupplement evidence bases."),
         (0.195, RED,   "The honest caveat", "Cognitive and longevity claims are\npromising but not settled; the muscle\nand strength benefits are the proven part.")],
        out)
    return out

FIGURES = {
    # slug substring : function
    "atp-synthase":   fig_atp_synthase,
    "complex-i":      fig_complex_i,
    "atorvastatin":   fig_atorvastatin,
    "rosuvastatin":   fig_rosuvastatin,
    "metformin":      fig_metformin,
    "rapamycin":      fig_rapamycin,
    "empagliflozin":  fig_empagliflozin,
    "semaglutide":    fig_semaglutide,
    "complex-ii":     fig_complex_ii,
    "complex-iii":    fig_complex_iii,
    "complex-iv":     fig_complex_iv,
    "dna-helix":      fig_dna,
    "hemoglobin":     fig_hemoglobin,
    "igg-antibody":   fig_igg,
    "insulin":        fig_insulin,
    "na-k-atpase":    fig_na_k_atpase,
    # wave 2 — foundational high-mention molecules
    "cholesterol":    fig_cholesterol,
    "testosterone":   fig_testosterone,
    "nad":            fig_nad,
    "cortisol":       fig_cortisol,
    "aspirin":        fig_aspirin,
    "vitamin-d3":     fig_vitamin_d3,
    "creatine":       fig_creatine,
}

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", help="substring: build only matching figures")
    ap.add_argument("--force", action="store_true", help="re-ray-trace cached raws")
    ap.add_argument("--list", action="store_true", help="list figure slugs and exit")
    args = ap.parse_args(argv)
    items = [(k, v) for k, v in FIGURES.items() if v is not None]
    if args.list:
        for k, _ in items: print(k)
        return
    if args.only:
        items = [(k, v) for k, v in items if args.only.lower() in k.lower()]
        if not items:
            print("no figure matches", args.only); return
    for slug, fn in items:
        print(f"[build] {slug}")
        out = fn(force=args.force)
        print(f"        -> {out}")
    print(f"[done] {len(items)} figure(s)")

if __name__ == "__main__":
    main()
