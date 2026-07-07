#!/usr/bin/env python3
"""Biophysics gap-fillers — the five figures the manual's biophysics branch needs, each
graded honestly on the project's two-axis framework (reports/_review/_biophysics-grading-
framework.md): Axis 1 mechanistic plausibility M0-M4, Axis 2 evidence state per literature
tradition (W Western RCT/meta - R Russian/non-English - C clinical-observational - X
mechanistic/bench), plus the replication/falsifiability Gate. Axis 1 alone never promotes a
claim to true; only the Gate does. Every figure states plainly what is established, what is
frontier, and what is overreach that did not hold.

Reproduce:  python build_biophysics.py            # all 5
            python build_biophysics.py --only upe
            python build_biophysics.py --list
"""
import os, sys, math, argparse, textwrap as _tw
sys.path.insert(0, os.path.dirname(__file__))
import ds

FIG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "media", "figures"))
INK=ds.INK; INK2=ds.INK2; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D
MUT=ds.MUT; FAINT=ds.FAINT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; PUR="#6b4a86"; TEAL="#2f7d78"
RED="#b5471f"; DKR="#6b1f12"

# per-tradition evidence-state palette
STATE_COL={"strong":GRN,"established":GRN,"mixed":AMB,"weak":AMB,"absent":FAINT,"contested":WARN,"failed":RED}

DEFS=('<defs>'
 '<marker id="ah" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker>'
 '<marker id="ag" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1d6b2e"/></marker>'
 '<marker id="ab" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#3a6ea5"/></marker>'
 '<marker id="ar" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker>'
 '<marker id="ay" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#8a6d12"/></marker>'
 '</defs>')

def T(x,y,s,size=13,fill=INK,font=None,weight=None,anchor="start",italic=False,spacing=None):
    return ds.text(x,y,s,size=size,fill=fill,font=font or ds.BODY,weight=weight,anchor=anchor,italic=italic,spacing=spacing)

def wrap(t,w): return _tw.wrap(str(t),width=w) or [str(t)]

def grade_badge(x,y,mscore,cells,gate,w=430):
    """Two-axis grade strip: M-score chip + per-tradition evidence cells + gate.
    cells: list of (letter, state) e.g. [('W','absent'),('X','strong')]."""
    s=[f'<rect x="{x}" y="{y}" width="{w}" height="86" rx="10" fill="{CARD}" stroke="{GOLDD}" stroke-width="1.4"/>']
    s.append(T(x+16,y+22,"EVIDENCE GRADE",size=9,fill=GOLDD,font=ds.DISPLAY,weight="bold",spacing="0.5"))
    # M chip
    s.append(f'<rect x="{x+16}" y="{y+30}" width="92" height="26" rx="7" fill="{BLUE}"/>')
    s.append(T(x+16+46,y+47,mscore,size=11,fill="white",font=ds.MONO,weight="bold",anchor="middle"))
    # evidence cells
    cx=x+122
    for letter,state in cells:
        col=STATE_COL.get(state,MUT)
        s.append(f'<rect x="{cx}" y="{y+30}" width="30" height="26" rx="6" fill="{col}" fill-opacity="0.15" stroke="{col}" stroke-width="1.6"/>')
        s.append(T(cx+15,y+47,letter,size=12,fill=col,font=ds.MONO,weight="bold",anchor="middle"))
        s.append(T(cx+15,y+70,state,size=7.6,fill=MUT,font=ds.BODY,anchor="middle"))
        cx+=38
    # gate
    gcol={"pass":GRN,"partial":AMB,"fail":RED}.get(gate.split()[0].lower(),MUT)
    s.append(T(x+w-16,y+22,"GATE",size=9,fill=GOLDD,font=ds.DISPLAY,weight="bold",spacing="0.5",anchor="end"))
    s.append(f'<rect x="{x+w-120}" y="{y+30}" width="104" height="26" rx="7" fill="{gcol}" fill-opacity="0.15" stroke="{gcol}" stroke-width="1.6"/>')
    s.append(T(x+w-68,y+47,gate,size=9.5,fill=gcol,font=ds.MONO,weight="bold",anchor="middle"))
    return "".join(s)

def legend_axes(x,y):
    s=[T(x,y,"M0 contradicts physics \u00b7 M1 no mechanism yet \u00b7 M2 plausible \u00b7 M3 falsifiable predictions \u00b7 M4 first-principles + confirmed",
         size=8.8,fill=MUT,font=ds.BODY,italic=True)]
    s.append(T(x,y+15,"Evidence per tradition (never merged): W Western RCT/meta \u00b7 R Russian/non-English \u00b7 C clinical-observational \u00b7 X mechanistic/bench",
         size=8.8,fill=MUT,font=ds.BODY,italic=True))
    return "".join(s)


# ---------------------------------------------------------------- 1. TWO-AXIS FRAMEWORK
def fig_framework():
    W,H=1180,760
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a72.2","Grading a claim physics can't yet fund",
        "Two axes, never merged, plus a gate. Mechanism earns a claim the right to be tested and shelved in view; only replication promotes it toward fact.",
        "Framework: reports/_review/_biophysics-grading-framework.md \u00b7 Flexner 100 Years Later PMC3178858; Lundh/Bero Cochrane MR000033",
        "biophysics-grading-framework")
    s=[head,DEFS]
    # 2D plane: x = evidence (absent -> strong), y = mechanism (M0 -> M4)
    gx0,gx1=180,760; gy0,gy1=cy+40,cy+390
    s.append(f'<rect x="{gx0}" y="{gy0}" width="{gx1-gx0}" height="{gy1-gy0}" rx="8" fill="#fbf8ef" stroke="{RULE}" stroke-width="1.2"/>')
    # axes labels
    s.append(T((gx0+gx1)/2,gy1+34,"Evidence that survives the gate  \u2192",size=11,fill=GOLDD,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(f'<text x="{gx0-42}" y="{(gy0+gy1)/2}" font-family="{ds.DISPLAY}" font-size="11" font-weight="700" fill="{GOLDD}" text-anchor="middle" transform="rotate(-90 {gx0-42} {(gy0+gy1)/2})">Mechanistic plausibility  \u2192</text>')
    for i,mv in enumerate(["M0","M1","M2","M3","M4"]):
        yy=gy1-(gy1-gy0)*i/4
        s.append(T(gx0-8,yy+4,mv,size=9.5,fill=MUT,font=ds.MONO,anchor="end"))
        s.append(f'<line x1="{gx0}" y1="{yy}" x2="{gx1}" y2="{yy}" stroke="{RULE}" stroke-width="0.7" stroke-dasharray="3 4"/>')
    for j,ev in enumerate(["absent","weak","mixed","strong"]):
        xx=gx0+(gx1-gx0)*(j+0.5)/4
        s.append(T(xx,gy1+16,ev,size=9,fill=MUT,font=ds.BODY,anchor="middle"))
    # plotted calibration cases: (label, mech 0-4, evid 0-3, verdict col)
    cases=[("Chemiosmosis",4,3,GRN),("H. pylori",3,3,GRN),("Semmelweis",1,3,GRN),
           ("Bioelectricity\n(models)",3.4,2.7,GRN),("UPE emission",3.2,2.6,GRN),
           ("Piezo (bone)",4,2.4,GRN),("Radical-pair\n(birds)",3,1.8,AMB),
           ("EZ water\nphenomenon",2.6,2.2,AMB),
           ("Popp coherent\nfield",1,0.5,RED),("Cold fusion",0.6,0.3,RED),
           ("Polywater",1,0.4,RED),("Water memory",0.3,0.3,RED),("Lysenko",0.4,0.4,RED)]
    def PX(e): return gx0+(gx1-gx0)*(e+0.5)/4
    def PY(m): return gy1-(gy1-gy0)*m/4
    # the failed/pathological cluster crowds the lower-left corner; its labels are
    # routed out to a stacked column on the right with short leaders so each is readable.
    CLUSTER=["Popp coherent\nfield","Cold fusion","Polywater","Water memory","Lysenko"]
    stack_x=352
    slots={"Popp coherent field":-112,"Polywater":-86,"Cold fusion":-60,"Lysenko":-34,"Water memory":-8}
    for lab,mm,ee,col in cases:
        px,py=PX(ee),PY(mm)
        s.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="7" fill="{col}" opacity="0.9"/>')
        if lab in CLUSTER:
            flat=lab.replace("\n"," ")
            ty=gy1+slots[flat]
            s.append(f'<line x1="{px+8:.0f}" y1="{py:.0f}" x2="{stack_x-6}" y2="{ty}" stroke="{col}" stroke-width="1.1" opacity="0.85"/>')
            s.append(T(stack_x,ty+3,flat,size=8.8,fill=INK,font=ds.BODY))
            continue
        lines=lab.split("\n")
        for k,ln in enumerate(lines):
            s.append(T(px+11,py-2+ (k*11) - (len(lines)-1)*5,ln,size=8.6,fill=INK,font=ds.BODY))
    # zone annotations
    s.append(T(gx1-14,gy0+20,"promoted toward fact",size=9.5,fill=GRN,font=ds.DISPLAY,weight="700",anchor="end",italic=True))
    s.append(T(gx0+14,gy1-12,"pathological / failed",size=9.5,fill=RED,font=ds.DISPLAY,weight="700",italic=True))
    # right rail: the rule + gate
    rx=800
    s.append(T(rx,cy+40,"The reporting rule",size=13,fill=INK2,font=ds.DISPLAY,weight="800"))
    for k,ln in enumerate(wrap("An entry shows: M-score | per-tradition evidence cells | gate status | one-line note. \u201cabsent-W\u201d is not evidence against \u2014 it is usually a funding, patent, or English-index artifact.",40)):
        s.append(T(rx,cy+64+k*17,ln,size=10.5,fill=MUT,font=ds.BODY))
    s.append(T(rx,cy+180,"The gate (applied evenly)",size=13,fill=INK2,font=ds.DISPLAY,weight="800"))
    for k,ln in enumerate(wrap("Has the core effect reproduced in disinterested, ideally blinded hands? Does it make a prediction that could fail? The same test is applied to a pharma RCT and a Soviet clinic series.",40)):
        s.append(T(rx,cy+204+k*17,ln,size=10.5,fill=MUT,font=ds.BODY))
    s.append(T(rx,cy+330,"Green = passed the gate \u00b7 Amber = frontier, in view \u00b7 Red = failed replication",size=9.4,fill=MUT,font=ds.BODY,italic=True))
    s.append(legend_axes(180,gy1+58))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP01-biophysics-framework.png"); return "BP01-biophysics-framework"

# ---------------------------------------------------------------- 2. UPE
def fig_upe():
    W,H=1180,700
    head,cy,foot=ds.panel(W,H,"Mitochondrial Health \u00b7 \u00a737.5.1","Ultraweak photon emission (UPE)",
        "Cells emit a few photons per second per cm\u00b2 when reactive oxygen species relax excited carbonyls. The emission is real and useful as an oxidative-stress readout; the \u201ccoherent biophoton field\u201d is a separate claim that did not hold.",
        "Mechanism established (chemiexcitation). Coherence claim: Cifra, J Lumin 2015 \u2014 no reliable evidence.",
        "ultraweak-photon-emission")
    s=[head,DEFS]
    # left: mechanism chain
    lx=120; midy=cy+150
    steps=[("Metabolism / stress","ROS rise (\u00b9O\u2082, \u2022OH)",WARN),
           ("Oxidise lipids/proteins","excited carbonyls (triplet)",AMB),
           ("Relax to ground state","emit a photon (350\u2013700 nm)",GRN),
           ("Detector (PMT/CCD)","counts: oxidative-stress readout",BLUE)]
    bw,bh=300,64; gapy=26
    for i,(h,d,col) in enumerate(steps):
        yy=cy+30+i*(bh+gapy)
        s.append(f'<rect x="{lx}" y="{yy}" width="{bw}" height="{bh}" rx="10" fill="{col}" fill-opacity="0.13" stroke="{col}" stroke-width="2"/>')
        s.append(T(lx+16,yy+26,h,size=12,fill=INK2,font=ds.DISPLAY,weight="700"))
        s.append(T(lx+16,yy+46,d,size=10,fill=MUT,font=ds.BODY))
        if i<len(steps)-1:
            s.append(f'<line x1="{lx+bw/2}" y1="{yy+bh}" x2="{lx+bw/2}" y2="{yy+bh+gapy}" stroke="{INK}" stroke-width="2.2" marker-end="url(#ah)"/>')
    # photon glyphs from step 3
    py3=cy+30+2*(bh+gapy)+bh/2
    for k in range(4):
        s.append(f'<line x1="{lx+bw+8}" y1="{py3-18+k*12}" x2="{lx+bw+70}" y2="{py3-34+k*12}" stroke="{GOLD}" stroke-width="1.8"/>')
    # right rail: what is / isn't established
    rx=560
    s.append(T(rx,cy+34,"What is established",size=13,fill=GRN,font=ds.DISPLAY,weight="800"))
    for k,ln in enumerate(wrap("The emission itself: chemiexcitation from ROS is textbook photochemistry. UPE tracks oxidative stress in tissue and is measured with photomultipliers in the dark.",46)):
        s.append(T(rx,cy+58+k*17,ln,size=10.6,fill=INK,font=ds.BODY))
    s.append(T(rx,cy+150,"Frontier (in view, thin)",size=13,fill=AMB,font=ds.DISPLAY,weight="800"))
    for k,ln in enumerate(wrap("UPE as a non-invasive marker of brain or whole-body oxidative activity \u2014 plausible, early data only.",46)):
        s.append(T(rx,cy+174+k*17,ln,size=10.6,fill=INK,font=ds.BODY))
    s.append(T(rx,cy+232,"Overreach that did not hold",size=13,fill=RED,font=ds.DISPLAY,weight="800"))
    for k,ln in enumerate(wrap("Popp\u2019s claim that these photons form a coherent, information-carrying field. Reviews find no reliable evidence for coherence or nonclassical light (Cifra 2015). The photons are real; the \u201cfield\u201d is not.",46)):
        s.append(T(rx,cy+256+k*17,ln,size=10.6,fill=INK,font=ds.BODY))
    s.append(grade_badge(rx,cy+360,"M3\u2013M4","",""" """.strip() or "",w=560) if False else "")
    s.append(grade_badge(rx,cy+360,"M-solid",[("X","established"),("W","weak"),("C","mixed")],"partial",w=560))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP02-ultraweak-photon-emission.png"); return "BP02-ultraweak-photon-emission"


# ---------------------------------------------------------------- 3. BIOELECTRICITY
def fig_bioelectricity():
    W,H=1180,720
    head,cy,foot=ds.panel(W,H,"Nervous System \u00b7 \u00a714  \u00b7  Foundations \u00b7 \u00a73","Bioelectricity as an instructive signal",
        "Steady voltage gradients across cell membranes (Vmem) carry pattern information beyond conducting nerve impulses. Established in planaria and frog models; a frontier in mammals.",
        "Becker injury currents; Levin Vmem prepatterning (planaria/Xenopus). Established in models, frontier in mammals.",
        "bioelectricity-instructive-signal")
    s=[head,DEFS]
    # left: Vmem scale bar (depolarised -> hyperpolarised) mapped to a cell row
    lx=120; ly=cy+60
    s.append(T(lx,ly-14,"Resting membrane voltage (Vmem) sets cell state",size=12,fill=INK2,font=ds.DISPLAY,weight="700"))
    grad=[("Depolarised","proliferative / plastic","#b5471f"),
          ("Intermediate","transitioning","#8a6d12"),
          ("Hyperpolarised","differentiated / quiescent","#3a6ea5")]
    cw=200
    for i,(h,d,col) in enumerate(grad):
        x=lx+i*(cw+18)
        s.append(f'<rect x="{x}" y="{ly}" width="{cw}" height="90" rx="10" fill="{col}" fill-opacity="0.13" stroke="{col}" stroke-width="2"/>')
        s.append(T(x+cw/2,ly+34,h,size=12,fill=col,font=ds.DISPLAY,weight="700",anchor="middle"))
        for k,ln in enumerate(wrap(d,22)):
            s.append(T(x+cw/2,ly+56+k*15,ln,size=10,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(f'<line x1="{lx}" y1="{ly+108}" x2="{lx+3*cw+36}" y2="{ly+108}" stroke="{INK}" stroke-width="2" marker-end="url(#ah)"/>')
    s.append(T(lx,ly+126,"\u2212 more negative inside",size=9.4,fill=MUT,font=ds.BODY))
    s.append(T(lx+3*cw+36,ly+126,"more positive \u2192",size=9.4,fill=MUT,font=ds.BODY,anchor="end"))
    # evidence tiers block
    ey=cy+300
    s.append(T(lx,ey,"What the evidence supports",size=13,fill=INK2,font=ds.DISPLAY,weight="800"))
    tiers=[("Established (models)",GRN,"Becker's injury currents in amphibian limb regeneration; Levin's group re-patterns planaria head/tail and induces ectopic eyes in Xenopus by setting Vmem."),
           ("Frontier (mammals)",AMB,"Whether Vmem editing can instruct regeneration or cancer normalisation in mammals \u2014 active research, still preclinical."),
           ("Not claimed",FAINT,"No \u201chealing energy field\u201d around the body. The signal is ionic membrane voltage, measured with electrodes.")]
    yy=ey+22
    for h,col,d in tiers:
        s.append(f'<rect x="{lx}" y="{yy}" width="14" height="14" rx="4" fill="{col}"/>')
        s.append(T(lx+24,yy+12,h,size=11.5,fill=col,font=ds.DISPLAY,weight="700"))
        lines=wrap(d,92)
        for k,ln in enumerate(lines):
            s.append(T(lx+24,yy+30+k*15,ln,size=10,fill=INK,font=ds.BODY))
        yy+=30+len(lines)*15+14
    s.append(grade_badge(760,cy+60,"M3\u2013M4",[("X","established"),("W","weak"),("C","mixed")],"partial",w=380))
    s.append(T(760,cy+180,"The strongest-grounded member of the",size=10.5,fill=MUT,font=ds.BODY,italic=True))
    s.append(T(760,cy+196,"biophysics cluster \u2014 real ion physics,",size=10.5,fill=MUT,font=ds.BODY,italic=True))
    s.append(T(760,cy+212,"reproducible model results, honest",size=10.5,fill=MUT,font=ds.BODY,italic=True))
    s.append(T(760,cy+228,"about the mammalian gap.",size=10.5,fill=MUT,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP03-bioelectricity.png"); return "BP03-bioelectricity"

# ---------------------------------------------------------------- 4. RADICAL-PAIR
def fig_radical_pair():
    W,H=1180,730
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a73.2 / \u00a76.5","Radical-pair magnetoreception",
        "A blue-light photon in cryptochrome can create two radicals whose entangled spins interconvert at a rate a weak magnetic field can bias \u2014 a plausible compass in migratory birds. No proven magnetic sense in humans.",
        "Mechanism M3 (Ritz/Schulten); avian behavioural + Cry data. Human magnetoreception: not demonstrated.",
        "radical-pair-magnetoreception")
    s=[head,DEFS]
    # mechanism chain across the top
    lx=90; y=cy+50; bw=232; bh=70; gx=24
    chain=[("Blue photon","hits cryptochrome (FAD)",BLUE),
           ("Electron transfer","radical pair forms",AMB),
           ("Singlet \u2013 triplet","spins interconvert & back",PUR),
           ("Field biases ratio","signalling state changes",GRN)]
    for i,(h,d,col) in enumerate(chain):
        x=lx+i*(bw+gx)
        s.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="10" fill="{col}" fill-opacity="0.13" stroke="{col}" stroke-width="2"/>')
        s.append(T(x+bw/2,y+30,h,size=11.5,fill=INK2,font=ds.DISPLAY,weight="700",anchor="middle"))
        s.append(T(x+bw/2,y+50,d,size=9.6,fill=MUT,font=ds.BODY,anchor="middle"))
        if i<3:
            s.append(f'<line x1="{x+bw}" y1="{y+bh/2}" x2="{x+bw+gx}" y2="{y+bh/2}" stroke="{INK}" stroke-width="2" marker-end="url(#ah)"/>')
    # spin cartoon: two arrows singlet (anti) vs triplet (parallel)
    sy=cy+200
    s.append(T(lx,sy-6,"Singlet (\u2191\u2193)",size=11,fill=GRN,font=ds.DISPLAY,weight="700"))
    s.append(f'<line x1="{lx+2}" y1="{sy+18}" x2="{lx+2}" y2="{sy+50}" stroke="{GRN}" stroke-width="3" marker-end="url(#ag)"/>')
    s.append(f'<line x1="{lx+24}" y1="{sy+50}" x2="{lx+24}" y2="{sy+18}" stroke="{GRN}" stroke-width="3" marker-end="url(#ag)"/>')
    s.append(T(lx+120,sy-6,"Triplet (\u2191\u2191)",size=11,fill=WARN,font=ds.DISPLAY,weight="700"))
    s.append(f'<line x1="{lx+122}" y1="{sy+50}" x2="{lx+122}" y2="{sy+18}" stroke="{WARN}" stroke-width="3" marker-end="url(#ar)"/>')
    s.append(f'<line x1="{lx+144}" y1="{sy+50}" x2="{lx+144}" y2="{sy+18}" stroke="{WARN}" stroke-width="3" marker-end="url(#ar)"/>')
    s.append(T(lx,sy+80,"A weak magnetic field (~50 \u00b5T, Earth's) nudges the singlet\u2194triplet balance \u2014",size=10.5,fill=INK,font=ds.BODY))
    s.append(T(lx,sy+96,"enough to change how much signalling product the cell makes. That is the proposed compass.",size=10.5,fill=INK,font=ds.BODY))
    # honest tiers (right/bottom)
    ey=cy+340
    tiers=[("Plausible & specific (M3)",GRN,"The mechanism is quantitative and falsifiable; birds show light-dependent, resonance-sensitive orientation consistent with it."),
           ("Frontier",AMB,"The full in-vivo signalling chain in birds is not nailed down; the effect sits at the edge of what spin chemistry allows."),
           ("Not established in humans",RED,"No reproducible human magnetic sense. Claims of human magnetoreception rest on a few EEG signals rather than behavioural evidence.")]
    yy=ey
    for h,col,d in tiers:
        s.append(f'<rect x="{lx}" y="{yy}" width="14" height="14" rx="4" fill="{col}"/>')
        s.append(T(lx+24,yy+12,h,size=11.5,fill=col,font=ds.DISPLAY,weight="700"))
        lines=wrap(d,96)
        for k,ln in enumerate(lines):
            s.append(T(lx+24,yy+30+k*15,ln,size=10,fill=INK,font=ds.BODY))
        yy+=30+len(lines)*15+12
    s.append(grade_badge(760,cy+330,"M3",[("X","mixed"),("W","weak"),("C","absent")],"partial",w=380))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP04-radical-pair-magnetoreception.png"); return "BP04-radical-pair-magnetoreception"

# ---------------------------------------------------------------- 5. PIEZOELECTRICITY
def fig_piezo():
    W,H=1180,700
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a73","Piezoelectricity in bone & collagen",
        "Mechanically stressed collagen generates tiny electric potentials. The physics is established; it is one plausible input to how bone remodels along lines of load (Wolff's law).",
        "Fukada & Yasuda, J. Phys. Soc. Japan 1957, 12:1158\u20131162 (bone piezoelectricity). Physics M4; role in remodelling contributory.",
        "piezoelectricity-bone-collagen")
    s=[head,DEFS]
    # left: load -> collagen -> charge -> cells
    lx=120; midx=lx+150; topy=cy+40
    # a stylised bone with load arrow
    s.append(f'<rect x="{lx+40}" y="{topy}" width="120" height="230" rx="40" fill="#f3ead2" stroke="{GOLDD}" stroke-width="2.4"/>')
    s.append(f'<line x1="{lx+100}" y1="{topy-30}" x2="{lx+100}" y2="{topy-2}" stroke="{INK}" stroke-width="3" marker-end="url(#ah)"/>')
    s.append(T(lx+100,topy-38,"load",size=10,fill=INK,font=ds.DISPLAY,weight="700",anchor="middle"))
    # collagen fibrils with +/- charges under bend
    fy=topy+70
    for k in range(3):
        yy=fy+k*46
        s.append(f'<path d="M {lx+56} {yy} q 40 -14 88 0" fill="none" stroke="{BLUE}" stroke-width="3"/>')
        s.append(T(lx+52,yy-4,"\u2212",size=13,fill=WARN,font=ds.DISPLAY,weight="700",anchor="middle"))
        s.append(T(lx+150,yy-4,"+",size=13,fill=GRN,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(T(lx+100,topy+250,"collagen fibrils",size=10,fill=MUT,font=ds.BODY,anchor="middle"))
    # chain to the right
    cx=lx+320
    steps=[("Stress the matrix","collagen deforms",AMB),
           ("Piezoelectric potential","\u00b5V-scale charge separation",BLUE),
           ("Cells sense it","osteoblasts/osteocytes respond",GRN),
           ("Remodel along load","Wolff's law, over months",GOLDD)]
    for i,(h,d,col) in enumerate(steps):
        yy=cy+40+i*80
        s.append(f'<rect x="{cx}" y="{yy}" width="360" height="60" rx="10" fill="{col}" fill-opacity="0.13" stroke="{col}" stroke-width="2"/>')
        s.append(T(cx+16,yy+26,h,size=12,fill=INK2,font=ds.DISPLAY,weight="700"))
        s.append(T(cx+16,yy+46,d,size=10,fill=MUT,font=ds.BODY))
        if i<3:
            s.append(f'<line x1="{cx+180}" y1="{yy+60}" x2="{cx+180}" y2="{yy+80}" stroke="{INK}" stroke-width="2" marker-end="url(#ah)"/>')
    # honest note + grade
    ny=cy+390
    s.append(T(lx,ny,"Honest scope",size=13,fill=INK2,font=ds.DISPLAY,weight="800"))
    for k,ln in enumerate(wrap("The piezoelectric effect in dry bone and collagen is settled physics (Fukada & Yasuda, 1957). In living, wet bone it is one contributor among several \u2014 fluid-flow (streaming) potentials and direct cell strain-sensing also drive remodelling. The figure claims mechanism and contribution, without asserting piezoelectricity alone builds bone.",108)):
        s.append(T(lx,ny+22+k*16,ln,size=10.4,fill=INK,font=ds.BODY))
    s.append(grade_badge(760,cy+330,"M4",[("X","established"),("W","mixed"),("C","mixed")],"pass",w=380))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP05-piezoelectricity-bone.png"); return "BP05-piezoelectricity-bone"

# ---------------------------------------------------------------- registry + CLI
FIGURES = {
    "framework": fig_framework, "upe": fig_upe, "bioelectricity": fig_bioelectricity,
    "radical-pair": fig_radical_pair, "piezo": fig_piezo,
}

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only"); ap.add_argument("--list",action="store_true")
    a=ap.parse_args(argv)
    items=list(FIGURES.items())
    if a.list:
        for k,_ in items: print(k)
        return
    if a.only:
        items=[(k,v) for k,v in items if a.only.lower() in k.lower()]
    for k,fn in items:
        out=fn(); print(f"[built] {k} -> {out}.png")
    print(f"[done] {len(items)} figure(s)")

if __name__=="__main__":
    main()
