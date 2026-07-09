#!/usr/bin/env python3
"""
Generate the manual's figures — matplotlib charts + RDKit molecule structures.
Outputs SVG (scalable, embeds cleanly in HTML + WeasyPrint) into media/figures/.
Idempotent: re-run any time. Claude Science can later replace any of these with
higher-production renders (see _science-jobs/CLAUDE-SCIENCE-ASKS.md).

    python3 reports/gen_figures.py
"""
import os, glob, re
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIG = os.path.join(ROOT, "media", "figures")
os.makedirs(FIG, exist_ok=True)

ACC = "#0e8ea0"; INK = "#16181d"; MUT = "#5c6069"; AMBER = "#b5741a"; GRID = "#e4e2db"
plt.rcParams.update({"svg.fonttype": "none", "font.family": "sans-serif",
                     "font.size": 11, "axes.edgecolor": MUT, "text.color": INK,
                     "axes.labelcolor": INK, "xtick.color": MUT, "ytick.color": MUT})

CHAPTERS = [("L0 Foundations","01-foundations"),("L1 Hardware","02-hardware"),
    ("L2 Stack & Algorithms","03-stack-algorithms"),("L3 Adjacent tech","04-adjacent-tech"),
    ("L4 Industries","05-industries"),("L5 Ecosystem","06-ecosystem-geopolitics"),
    ("L6 History","07-history"),("L7 Frontier","08-frontier-open")]

def fig_coverage():
    labels, counts = [], []
    for name, folder in CHAPTERS:
        counts.append(len(glob.glob(os.path.join(ROOT, folder, "*.md"))))
        labels.append(name)
    fig, ax = plt.subplots(figsize=(8, 4.2))
    y = range(len(labels))
    ax.barh(list(y), counts, color=ACC, height=.62)
    for i, c in enumerate(counts):
        ax.text(c + 0.4, i, str(c), va="center", fontsize=10, color=INK)
    ax.set_yticks(list(y)); ax.set_yticklabels(labels)
    ax.invert_yaxis(); ax.set_xlabel("node cards (all depth-complete)")
    ax.set_title(f"Quantum Operating Manual — coverage ({sum(counts)} nodes)", color=INK, fontsize=13)
    for s in ("top","right"): ax.spines[s].set_visible(False)
    ax.xaxis.grid(True, color=GRID); ax.set_axisbelow(True)
    fig.tight_layout(); fig.savefig(os.path.join(FIG, "coverage-by-layer.svg")); plt.close(fig)
    return sum(counts)

def fig_tiers():
    tiers = [("T1","Established physics",6),("T2","Peer-reviewed",5),
             ("T3","Preprint / conf.",4),("T4","Vendor claim",3),
             ("T5","Analyst / forecast",2),("T6","Speculative",1)]
    fig, ax = plt.subplots(figsize=(7, 4.2))
    cols = [ACC,"#2ba0af","#5ab0bb","#8ab6bd",AMBER,"#c98f3a"]
    for i,(t,label,w) in enumerate(tiers):
        ax.barh(i, w, color=cols[i], height=.72)
        ax.text(0.08, i, f"{t} · {label}", va="center", ha="left", color="white", fontsize=10.5, fontweight="bold")
    ax.set_yticks([]); ax.set_xticks([]); ax.invert_yaxis()
    ax.set_title("Evidence tiers — strongest to weakest", color=INK, fontsize=13)
    for s in ax.spines.values(): s.set_visible(False)
    ax.text(6, 5.7, "a vendor press release and a peer-reviewed\nthreshold demo do not weigh the same",
            fontsize=8.5, color=MUT, ha="right")
    fig.tight_layout(); fig.savefig(os.path.join(FIG, "evidence-tiers.svg")); plt.close(fig)

def fig_chem():
    try:
        from rdkit import Chem
        from rdkit.Chem.Draw import rdMolDraw2D
    except Exception as e:
        print("rdkit unavailable:", e); return
    mols = [("N2","N#N"),("H2","[H][H]"),("NH3","N"),("CO2","O=C=O"),
            ("H2O","O"),("Li (battery)","[Li]")]
    for name, smi in mols:
        m = Chem.MolFromSmiles(smi)
        if not m: continue
        d = rdMolDraw2D.MolDraw2DSVG(220, 160)
        opt = d.drawOptions(); opt.clearBackground = False
        d.DrawMolecule(m, legend=name); d.FinishDrawing()
        svg = d.GetDrawingText()
        fn = re.sub(r"[^a-z0-9]+","-",name.lower()).strip("-")
        open(os.path.join(FIG, f"mol-{fn}.svg"),"w").write(svg)
    print("rdkit: wrote molecule panels (nitrogen-fixation set for I-chem)")

def gallery(total):
    svgs = sorted(glob.glob(os.path.join(FIG, "*.svg")))
    cards = "\n".join(
        f'<figure><img src="figures/{os.path.basename(s)}" alt="{os.path.basename(s)}">'
        f'<figcaption>{os.path.basename(s)[:-4]}</figcaption></figure>' for s in svgs)
    doc = f"""<!doctype html><meta charset=utf-8><title>Quantum manual — figures</title>
<style>body{{font:15px system-ui;margin:2rem;background:#faf9f6;color:#16181d}}
h1{{font-family:Georgia,serif}} .grid{{display:grid;
grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}}
figure{{margin:0;background:#fff;border:1px solid #e4e2db;border-radius:8px;padding:.8rem}}
img{{max-width:100%;height:auto}} figcaption{{color:#5c6069;font-size:.8rem;margin-top:.4rem;font-family:ui-monospace,monospace}}</style>
<h1>Quantum Operating Manual — figure gallery</h1>
<p>{len(svgs)} figures · {total} node cards. Auto-generated; Claude Science can upgrade any of these.</p>
<div class=grid>{cards}</div>"""
    open(os.path.join(ROOT,"reports","figures-gallery.html"),"w").write(doc)
    print(f"wrote reports/figures-gallery.html ({len(svgs)} figures)")

if __name__ == "__main__":
    total = fig_coverage(); fig_tiers(); fig_chem(); gallery(total)
    print("figures ->", FIG)
