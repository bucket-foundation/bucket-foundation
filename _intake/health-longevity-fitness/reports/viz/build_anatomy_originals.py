#!/usr/bin/env python3
"""Anatomy originals — house-style redraws of the 12 borrowed/open-license illustrative
figures (formerly framed Wikimedia images via build_realmedia.py). Every figure here is
drawn from scratch in the design system (ds.py): cream paper, gold accent, ink labels,
no borrowed pixels. Labelled for a smart lay reader; evidence-honest (these are anatomical/
mechanistic schematics — no clinical-effect claims). Real captured-data micrographs
(RA11/12/13 histology) are deliberately NOT redrawn and stay as build_realmedia.py output.

Reproduce:  python build_anatomy_originals.py            # all 12
            python build_anatomy_originals.py --only neuron
            python build_anatomy_originals.py --list
"""
import os, sys, math, argparse
sys.path.insert(0, os.path.dirname(__file__))
import ds

FIG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "media", "figures"))
INK=ds.INK; INK2=ds.INK2; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D
MUT=ds.MUT; FAINT=ds.FAINT; RULE=ds.RULE
GRN="#1d6b2e"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; PUR="#6b4a86"; TEAL="#2f7d78"
RED="#b5471f"

DEFS = ('<defs>'
    '<marker id="ah" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker>'
    '<marker id="ag" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1d6b2e"/></marker>'
    '<marker id="ab" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#3a6ea5"/></marker>'
    '<marker id="ar" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker>'
    '</defs>')

def T(x,y,s,size=13,fill=INK,font=None,weight=None,anchor="start",italic=False,spacing=None):
    return ds.text(x,y,s,size=size,fill=fill,font=font or ds.BODY,weight=weight,anchor=anchor,italic=italic,spacing=spacing)

def leader(x0,y0,x1,y1,c=INK):
    """thin leader line from label anchor (x0,y0) to feature (x1,y1)."""
    return f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{c}" stroke-width="1.3"/>' \
           f'<circle cx="{x1}" cy="{y1}" r="2.6" fill="{c}"/>'

def label(x,y,head,body=None,anchor="start",hc=INK2,bc=MUT,hs=12.5):
    s=[T(x,y,head,size=hs,fill=hc,font=ds.DISPLAY,weight="700",anchor=anchor)]
    if body:
        s.append(T(x,y+16,body,size=9.6,fill=bc,font=ds.BODY,anchor=anchor))
    return "".join(s)

def frame(name,kicker,title,sub,src,claim,W,H,body):
    head,y0,foot=ds.panel(W,H,kicker,title,sub,src,claim)
    ds.render(head+DEFS+body+foot, f"{FIG}/{name}.png")
    return name

# provenance line shared: these are schematics, so the footer states that plainly
SRC_SCHEMA = "Original house-style schematic (design-system draw, no borrowed image) \u00b7 anatomical/mechanistic \u2014 no clinical-effect claim"


# ---------------------------------------------------------------- 1. NEURON
def fig_neuron():
    W,H=1180,620
    head,cy,foot=ds.panel(W,H,"Nervous System \u00b7 \u00a714","The neuron",
        "Dendrites receive the signal, the cell body sums it, the axon carries it, and the terminals pass it on.",
        SRC_SCHEMA,"neuron-anatomy")
    s=[head,DEFS]
    ymid=cy+150
    # soma
    sx,sy=250,ymid
    s.append(f'<circle cx="{sx}" cy="{sy}" r="58" fill="{CARD}" stroke="{GOLDD}" stroke-width="2.4"/>')
    s.append(f'<circle cx="{sx}" cy="{sy}" r="24" fill="#efe4c8" stroke="{GOLDD}" stroke-width="1.6"/>')  # nucleus
    # dendrites (branching lines from soma, left)
    for ang in (-52,-24,0,24,52):
        a=math.radians(180+ang); x2=sx+math.cos(a)*135; y2=sy+math.sin(a)*135
        xm=sx+math.cos(a)*70; ym=sy+math.sin(a)*70
        s.append(f'<path d="M {sx+math.cos(a)*56} {sy+math.sin(a)*56} L {xm} {ym} L {x2} {y2}" fill="none" stroke="{BLUE}" stroke-width="3"/>')
        for da in (-22,22):
            a2=math.radians(180+ang+da); s.append(f'<line x1="{xm}" y1="{ym}" x2="{xm+math.cos(a2)*46}" y2="{ym+math.sin(a2)*46}" stroke="{BLUE}" stroke-width="2"/>')
    # axon (thick line to right), myelin segments
    ax0=sx+58; ax1=W-230; s.append(f'<line x1="{ax0}" y1="{sy}" x2="{ax1}" y2="{sy}" stroke="{INK}" stroke-width="4"/>')
    seg=(ax1-ax0-40)/4
    for i in range(4):
        x=ax0+30+i*seg
        s.append(f'<rect x="{x}" y="{sy-15}" width="{seg-14:.0f}" height="30" rx="14" fill="#e7dcc2" stroke="{GOLDD}" stroke-width="1.6"/>')
    # terminals
    tx=ax1
    for dy in (-40,0,40):
        s.append(f'<path d="M {tx} {sy} L {tx+45} {sy+dy}" stroke="{INK}" stroke-width="3" fill="none"/>')
        s.append(f'<circle cx="{tx+52}" cy="{sy+dy}" r="8" fill="{GRN}"/>')
    # labels with leaders
    s.append(leader(150,cy+40,sx-90,sy-40,BLUE)); s.append(label(60,cy+30,"Dendrites","receive incoming signals",hc=BLUE))
    s.append(leader(sx,cy+330,sx,sy+60)); s.append(label(sx,cy+352,"Cell body (soma)","sums the inputs; holds the nucleus",anchor="middle"))
    s.append(leader((ax0+ax1)/2,cy+40,(ax0+ax1)/2,sy-18)); s.append(label((ax0+ax1)/2-70,cy+30,"Axon + myelin","carries the impulse; myelin speeds it up"))
    s.append(leader(tx+30,cy+330,tx+40,sy+45,GRN)); s.append(label(tx-30,cy+352,"Axon terminals","release neurotransmitter",anchor="middle",hc=GRN))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA01-neuron.png"); return "RA01-neuron"

# ---------------------------------------------------------------- 2. SYNAPSE
def fig_synapse():
    W,H=1120,640
    head,cy,foot=ds.panel(W,H,"Nervous System \u00b7 \u00a714","The synapse",
        "One neuron passes its signal to the next across a tiny gap, carried by neurotransmitter molecules.",
        SRC_SCHEMA,"synapse-anatomy")
    s=[head,DEFS]
    # pre-terminal (top bulb), post-membrane (bottom)
    px,py=W/2, cy+120
    s.append(f'<path d="M {px-160} {py-90} Q {px} {py-140} {px+160} {py-90} L {px+150} {py+40} Q {px} {py+70} {px-150} {py+40} Z" fill="{CARD}" stroke="{GOLDD}" stroke-width="2.4"/>')
    # vesicles
    import random; random.seed(3)
    for _ in range(9):
        vx=px+random.uniform(-120,120); vy=py+random.uniform(-60,10)
        s.append(f'<circle cx="{vx:.0f}" cy="{vy:.0f}" r="12" fill="#efe4c8" stroke="{GOLDD}" stroke-width="1.4"/>')
    # cleft
    clefty=py+95
    s.append(f'<line x1="{px-220}" y1="{clefty}" x2="{px+220}" y2="{clefty}" stroke="{FAINT}" stroke-width="1.2" stroke-dasharray="5 5"/>')
    # neurotransmitters crossing
    for dx in (-60,-10,40,90):
        s.append(f'<circle cx="{px+dx}" cy="{clefty}" r="6.5" fill="{GRN}"/>')
    # post-membrane with receptors
    my=py+150
    s.append(f'<rect x="{px-230}" y="{my}" width="460" height="70" rx="12" fill="{CARD}" stroke="{GOLDD}" stroke-width="2.4"/>')
    for dx in (-150,-70,10,90,160):
        s.append(f'<rect x="{px+dx-14}" y="{my-14}" width="28" height="22" rx="6" fill="#dfeae0" stroke="{GRN}" stroke-width="1.6"/>')
    # labels
    s.append(leader(160,cy+70,px-120,py-70)); s.append(label(70,cy+60,"Sending neuron","(presynaptic terminal)"))
    s.append(leader(940,cy+150,px+90,py-20)); s.append(label(830,cy+140,"Vesicles","hold neurotransmitter"))
    s.append(leader(150,clefty+6,px-90,clefty,GRN)); s.append(label(60,clefty+2,"Synaptic cleft","the ~20 nm gap",hc=GRN))
    s.append(leader(150,my+40,px-150,my,GRN)); s.append(label(60,my+36,"Receiving neuron","receptors catch the signal",hc=GRN))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA02-synapse.png"); return "RA02-synapse"

# ---------------------------------------------------------------- 3. MITOCHONDRION
def fig_mitochondrion():
    W,H=1180,620
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a701","The mitochondrion",
        "The cell's power plant: its folded inner membrane is where oxygen and fuel become ATP.",
        SRC_SCHEMA,"mitochondrion-anatomy")
    s=[head,DEFS]
    ox,oy=W/2-40, cy+150; rx,ry=360,175
    # outer membrane
    s.append(f'<ellipse cx="{ox}" cy="{oy}" rx="{rx}" ry="{ry}" fill="#f3ead2" stroke="{GOLDD}" stroke-width="2.6"/>')
    # inner membrane with cristae (wavy inner ellipse)
    pts=[]
    import math as m
    for i in range(0,361,6):
        a=m.radians(i); wob=1+0.10*m.sin(m.radians(i*6))
        pts.append(f"{ox+m.cos(a)*(rx-34)*wob:.0f},{oy+m.sin(a)*(ry-30)*wob:.0f}")
    s.append(f'<polygon points="{" ".join(pts)}" fill="#efe1bf" stroke="{RED}" stroke-width="2.2"/>')
    # cristae folds (inward finger loops)
    for fx in (-230,-120,-10,100,210):
        s.append(f'<path d="M {ox+fx} {oy-ry+34} q 34 90 0 175" fill="none" stroke="{RED}" stroke-width="2"/>')
    # matrix dots (mtDNA + ribosomes)
    s.append(f'<circle cx="{ox+40}" cy="{oy+30}" r="14" fill="none" stroke="{BLUE}" stroke-width="2.2"/>')
    # labels
    s.append(leader(150,cy+40,ox-rx+30,oy-ry+40)); s.append(label(60,cy+30,"Outer membrane","the smooth boundary"))
    s.append(leader(1030,cy+70,ox+rx-70,oy-90,RED)); s.append(label(1120,cy+60,"Inner membrane (cristae)","folded to pack in more ETC \u2014 where ATP is made",anchor="end",hc=RED))
    s.append(leader(ox+40,cy+330,ox+40,oy+42,BLUE)); s.append(label(ox+40,cy+352,"Matrix + mtDNA","Krebs cycle runs here; its own small genome",anchor="middle",hc=BLUE))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA03-mitochondrion.png"); return "RA03-mitochondrion"

# ---------------------------------------------------------------- 4. THE CELL
def fig_cell():
    W,H=1180,640
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a701","The animal cell",
        "The organelles inside a typical cell. Two matter most for aging: the mitochondria and the nucleus.",
        SRC_SCHEMA,"animal-cell-anatomy")
    s=[head,DEFS]
    ox,oy=W/2-40, cy+160; rx,ry=390,195
    s.append(f'<ellipse cx="{ox}" cy="{oy}" rx="{rx}" ry="{ry}" fill="#f3ead2" stroke="{GOLDD}" stroke-width="2.6"/>')
    # nucleus
    nx,ny=ox-90,oy-10
    s.append(f'<circle cx="{nx}" cy="{ny}" r="82" fill="#dfe6ef" stroke="{BLUE}" stroke-width="2.4"/>')
    s.append(f'<circle cx="{nx+14}" cy="{ny-6}" r="26" fill="#c9d6e6" stroke="{BLUE}" stroke-width="1.6"/>')
    # mitochondria (a few)
    for mx,my,rot in ((ox+150,oy-80,20),(ox+210,oy+60,-15),(ox+60,oy+110,35)):
        s.append(f'<g transform="rotate({rot} {mx} {my})"><ellipse cx="{mx}" cy="{my}" rx="52" ry="24" fill="#efe1bf" stroke="{RED}" stroke-width="2"/>'
                 f'<path d="M {mx-38} {my} q 12 -18 24 0 q 12 18 24 0 q 12 -18 24 0" fill="none" stroke="{RED}" stroke-width="1.6"/></g>')
    # ER (wavy lines near nucleus) + ribosome dots
    s.append(f'<path d="M {nx+70} {ny+70} q 40 20 80 0 q 40 -20 80 0" fill="none" stroke="{TEAL}" stroke-width="2"/>')
    # membrane double line hint
    s.append(f'<ellipse cx="{ox}" cy="{oy}" rx="{rx-7}" ry="{ry-7}" fill="none" stroke="{GOLDD}" stroke-width="1" opacity="0.5"/>')
    # labels
    s.append(leader(150,cy+60,nx-40,ny-50,BLUE)); s.append(label(60,cy+50,"Nucleus","your DNA / control centre",hc=BLUE))
    s.append(leader(1030,cy+70,ox+180,oy-70,RED)); s.append(label(1120,cy+60,"Mitochondria","the power plants (see \u00a737)",anchor="end",hc=RED))
    s.append(leader(1030,cy+330,ox+rx-40,oy+120)); s.append(label(1120,cy+322,"Cell membrane","the gated border",anchor="end"))
    s.append(leader(150,cy+330,nx+130,ny+80,TEAL)); s.append(label(60,cy+322,"Endoplasmic reticulum","protein & lipid factory",hc=TEAL))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA15-the-cell.png"); return "RA15-the-cell"


# ---------------------------------------------------------------- 5. NEPHRON
def fig_nephron():
    W,H=1120,660
    head,cy,foot=ds.panel(W,H,"Organ Systems \u00b7 \u00a717","The nephron",
        "The kidney's filter unit: blood is filtered at the glomerulus, then the tubule reclaims what the body needs.",
        SRC_SCHEMA,"nephron-anatomy")
    s=[head,DEFS]
    # glomerulus (top-left tuft in a cup)
    gx,gy=230,cy+90
    s.append(f'<circle cx="{gx}" cy="{gy}" r="46" fill="#f0d9d0" stroke="{RED}" stroke-width="2.4"/>')
    s.append(f'<path d="M {gx-30} {gy} q 15 -22 30 0 q 15 22 30 0" fill="none" stroke="{RED}" stroke-width="1.8"/>')
    s.append(f'<path d="M {gx-30} {gy+14} q 15 -22 30 0 q 15 22 30 0" fill="none" stroke="{RED}" stroke-width="1.8"/>')
    # tubule path: proximal -> loop of Henle -> distal -> collecting duct
    path=(f"M {gx+46} {gy} C 420 {gy-30}, 430 {gy+40}, 470 {gy+70} "
          f"L 470 {gy+250} Q 470 {gy+300} 520 {gy+300} Q 570 {gy+300} 570 {gy+250} "
          f"L 570 {gy+90} C 600 {gy}, 720 {gy}, 760 {gy+60} L 820 {gy+340}")
    s.append(f'<path d="{path}" fill="none" stroke="{GOLDD}" stroke-width="7"/>')
    s.append(f'<path d="{path}" fill="none" stroke="#f3ead2" stroke-width="3"/>')
    # arrows: reabsorption back to blood (green, inward) along proximal
    for (ax,ay) in ((400,gy+90),(480,gy+180),(540,gy+180)):
        s.append(f'<line x1="{ax}" y1="{ay}" x2="{ax-38}" y2="{ay}" stroke="{GRN}" stroke-width="2.6" marker-end="url(#ag)"/>')
    # labels
    s.append(leader(gx,cy+330,gx,gy+50,RED)); s.append(label(gx,cy+352,"Glomerulus","blood filtered here",anchor="middle",hc=RED))
    s.append(label(360,cy+40,"Proximal tubule","reclaims glucose, salts, water",hc=GRN))
    s.append(leader(520,cy+430,520,gy+305)); s.append(label(520,cy+452,"Loop of Henle","concentrates the urine",anchor="middle"))
    s.append(leader(950,cy+80,770,gy+70)); s.append(label(1060,cy+70,"Distal tubule","fine-tunes salt & pH",anchor="end"))
    s.append(leader(950,cy+440,820,gy+330)); s.append(label(1060,cy+432,"Collecting duct","final water balance \u2192 urine",anchor="end"))
    s.append(T(430,cy+560,"Green arrows = reabsorption back into the blood; what's left becomes urine.",size=10.5,fill=GRN,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA04-nephron.png"); return "RA04-nephron"

# ---------------------------------------------------------------- 6. BRAIN LOBES
def fig_brain_lobes():
    W,H=1120,640
    head,cy,foot=ds.panel(W,H,"Brain & Cognition \u00b7 \u00a708","The lobes of the brain",
        "Frontal, parietal, temporal and occipital lobes, plus the cerebellum and brainstem.",
        SRC_SCHEMA,"brain-lobes-anatomy")
    s=[head,DEFS]
    import math as _m
    cxb,cyb=W/2-40,cy+200; R=165
    wedges=[("Frontal",BLUE,135,225),("Temporal",AMB,225,315),("Occipital",PUR,315,405),("Parietal",GRN,45,135)]
    for name,col,a0,a1 in wedges:
        x0=cxb+_m.cos(_m.radians(a0))*R; y0=cyb-_m.sin(_m.radians(a0))*R
        x1=cxb+_m.cos(_m.radians(a1))*R; y1=cyb-_m.sin(_m.radians(a1))*R
        s.append(f'<path d="M {cxb} {cyb} L {x0:.1f} {y0:.1f} A {R} {R} 0 0 0 {x1:.1f} {y1:.1f} Z" fill="{col}33" stroke="{col}" stroke-width="2.4"/>')
    s.append(f'<circle cx="{cxb}" cy="{cyb}" r="{R}" fill="none" stroke="{GOLDD}" stroke-width="1.4" opacity="0.55"/>')
    s.append(f'<ellipse cx="{cxb-R-26}" cy="{cyb+R-16}" rx="66" ry="42" fill="#efe4c8" stroke="{GOLDD}" stroke-width="2.2"/>')
    s.append(f'<rect x="{cxb-R-12}" y="{cyb+R}" width="28" height="62" rx="12" fill="#efe4c8" stroke="{GOLDD}" stroke-width="2.2"/>')
    keys=[("Frontal","planning, movement, self-control",BLUE,60,cy+90,"start"),
          ("Parietal","touch, spatial sense",GRN,60,cy+160,"start"),
          ("Occipital","vision",PUR,1060,cy+90,"end"),
          ("Temporal","hearing, memory, language",AMB,1060,cy+160,"end"),
          ("Cerebellum","balance & coordination",GOLDD,60,cy+390,"start"),
          ("Brainstem","breathing, heart rate, arousal",INK,60,cy+450,"start")]
    for nm,dd,col,x,y,an in keys:
        s.append(label(x,y,nm,dd,anchor=an,hc=col))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA09-brain-lobes.png"); return "RA09-brain-lobes"


# ---------------------------------------------------------------- 7. ACTION POTENTIAL
def fig_action_potential():
    W,H=1120,600
    head,cy,foot=ds.panel(W,H,"Nervous System \u00b7 \u00a714","The action potential",
        "An all-or-nothing electrical wave: sodium rushes in to fire, potassium flows out to reset.",
        SRC_SCHEMA,"action-potential-anatomy")
    s=[head,DEFS]
    # plot axes
    ax0,ax1=180,W-90; ay0,ay1=cy+60,cy+330
    def X(t): return ax0+(ax1-ax0)*t
    def Y(v): return ay1-(ay1-ay0)*((v+90)/130.0)   # v in mV, -90..+40
    # axes
    s.append(f'<line x1="{ax0}" y1="{ay0}" x2="{ax0}" y2="{ay1}" stroke="{INK}" stroke-width="1.6"/>')
    s.append(f'<line x1="{ax0}" y1="{Y(-70)}" x2="{ax1}" y2="{Y(-70)}" stroke="{FAINT}" stroke-width="1" stroke-dasharray="4 4"/>')
    # threshold line
    s.append(f'<line x1="{ax0}" y1="{Y(-55)}" x2="{ax1}" y2="{Y(-55)}" stroke="{WARN}" stroke-width="1.2" stroke-dasharray="6 4"/>')
    s.append(T(ax1,Y(-55)-6,"threshold \u2248 \u201355 mV",size=10,fill=WARN,anchor="end"))
    # y ticks
    for v in (-70,-55,0,30):
        s.append(T(ax0-10,Y(v)+4,f"{v}",size=10,fill=MUT,anchor="end"))
    s.append(T(ax0-46,(ay0+ay1)/2,"mV",size=11,fill=MUT,anchor="middle"))
    # the curve
    curve=f"M {X(0)} {Y(-70)} L {X(0.22)} {Y(-70)} L {X(0.30)} {Y(-55)} C {X(0.36)} {Y(30)}, {X(0.42)} {Y(30)}, {X(0.50)} {Y(-20)} C {X(0.58)} {Y(-85)}, {X(0.66)} {Y(-85)}, {X(0.78)} {Y(-70)} L {X(1.0)} {Y(-70)}"
    s.append(f'<path d="{curve}" fill="none" stroke="{BLUE}" stroke-width="3.4"/>')
    # phase labels
    s.append(label(X(0.30),ay1+34,"1. Depolarise","Na\u207a channels open \u2014 fires",anchor="middle",hc=WARN))
    s.append(label(X(0.60),ay1+34,"2. Repolarise","K\u207a flows out \u2014 resets",anchor="middle",hc=GRN))
    s.append(label(X(0.86),ay1+34,"3. Refractory","brief overshoot below rest",anchor="middle",hc=MUT))
    s.append(label(X(0.06),ay0+10,"Resting","\u224870 mV inside-negative"))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA06-action-potential.png"); return "RA06-action-potential"

# ---------------------------------------------------------------- 8. DNA REPLICATION
def fig_dna_replication():
    W,H=1120,600
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a701","DNA replication",
        "The fork that copies the genome: one new strand runs smoothly, the other is built in short pieces.",
        SRC_SCHEMA,"dna-replication-anatomy")
    s=[head,DEFS]
    fx,fy=W/2-40,cy+180   # fork point
    # parent duplex coming from left
    s.append(f'<path d="M 120 {fy-26} Q 300 {fy-26} {fx} {fy-8}" fill="none" stroke="{BLUE}" stroke-width="3.4"/>')
    s.append(f'<path d="M 120 {fy+26} Q 300 {fy+26} {fx} {fy+8}" fill="none" stroke="{BLUE}" stroke-width="3.4"/>')
    for x in range(150,int(fx)-30,34):
        s.append(f'<line x1="{x}" y1="{fy-24}" x2="{x}" y2="{fy+24}" stroke="{FAINT}" stroke-width="1.3"/>')
    # two separated strands going right (top = leading, bottom = lagging)
    s.append(f'<path d="M {fx} {fy-8} Q {fx+120} {fy-90} {W-120} {fy-120}" fill="none" stroke="{BLUE}" stroke-width="3"/>')
    s.append(f'<path d="M {fx} {fy+8} Q {fx+120} {fy+90} {W-120} {fy+120}" fill="none" stroke="{BLUE}" stroke-width="3"/>')
    # leading new strand (continuous green)
    s.append(f'<path d="M {fx+20} {fy-30} Q {fx+140} {fy-100} {W-140} {fy-128}" fill="none" stroke="{GRN}" stroke-width="3.2" marker-end="url(#ag)"/>')
    # lagging new strand (green dashes = Okazaki fragments)
    for i in range(4):
        x=fx+40+i*120
        s.append(f'<line x1="{x}" y1="{fy+40+i*20}" x2="{x+90}" y2="{fy+56+i*20}" stroke="{GRN}" stroke-width="3.2" stroke-dasharray="0" marker-end="url(#ag)"/>')
    # labels
    s.append(leader(150,cy+60,240,fy-24,BLUE)); s.append(label(60,cy+50,"Parent DNA","the double helix, unzipping",hc=BLUE))
    s.append(leader(1030,cy+60,W-160,fy-124,GRN)); s.append(label(1060,cy+50,"Leading strand","built continuously",anchor="end",hc=GRN))
    s.append(leader(1030,cy+380,W-260,fy+110,GRN)); s.append(label(1060,cy+372,"Lagging strand","built in Okazaki fragments",anchor="end",hc=GRN))
    s.append(leader(fx-150,fy+70,fx,fy+14)); s.append(label(fx-160,fy+66,"Replication fork","where the strands part",anchor="end"))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA07-dna-replication.png"); return "RA07-dna-replication"

# ---------------------------------------------------------------- 9. CHROMOSOME & TELOMERES
def fig_telomere():
    W,H=1120,600
    head,cy,foot=ds.panel(W,H,"Telomeres \u00b7 \u00a716","The chromosome and its telomeres",
        "Protective caps at each end shorten with every cell division \u2014 a built-in replication counter.",
        SRC_SCHEMA,"telomere-anatomy")
    s=[head,DEFS]
    cxx,cyy=360,cy+150
    for dx in (-26,26):
        s.append(f'<path d="M {cxx+dx-18} {cyy-100} Q {cxx+dx} {cyy} {cxx+dx-18} {cyy+100} '
                 f'L {cxx+dx+18} {cyy+100} Q {cxx+dx} {cyy} {cxx+dx+18} {cyy-100} Z" fill="#dfe6ef" stroke="{BLUE}" stroke-width="2.2"/>')
    s.append(f'<ellipse cx="{cxx}" cy="{cyy}" rx="40" ry="16" fill="#c9d6e6" stroke="{BLUE}" stroke-width="1.6"/>')
    for dx in (-26,26):
        for dy in (-100,100):
            s.append(f'<rect x="{cxx+dx-16}" y="{cyy+dy-14}" width="32" height="28" rx="10" fill="{RED}" opacity="0.9"/>')
    s.append(leader(cxx-150,cyy-100,cxx-40,cyy-96,RED)); s.append(label(cxx-290,cyy-104,"Telomere caps","protective DNA at the ends",anchor="start",hc=RED))
    s.append(leader(cxx,cyy+140,cxx,cyy+104,BLUE)); s.append(label(cxx,cyy+162,"Chromosome","two sister chromatids",anchor="middle",hc=BLUE))
    labels=["Young cell","After many divisions","Senescent / critically short"]
    caps=[26,15,5]
    for i,(lab,cap) in enumerate(zip(labels,caps)):
        bx=740; by=cy+90+i*120
        s.append(f'<rect x="{bx}" y="{by}" width="240" height="26" rx="13" fill="#dfe6ef" stroke="{BLUE}" stroke-width="1.8"/>')
        s.append(f'<rect x="{bx}" y="{by}" width="{cap}" height="26" rx="8" fill="{RED}"/>')
        s.append(f'<rect x="{bx+240-cap}" y="{by}" width="{cap}" height="26" rx="8" fill="{RED}"/>')
        s.append(T(bx,by-9,lab,size=11,fill=INK,font=ds.DISPLAY,weight="700"))
    s.append(T(740,cy+400,"Each division trims the caps; when too short, the cell stops dividing.",size=10.5,fill=MUT,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA08-telomere.png"); return "RA08-telomere"


# ---------------------------------------------------------------- 10. ATHEROSCLEROSIS
def fig_atherosclerosis():
    W,H=1160,560
    head,cy,foot=ds.panel(W,H,"Cardiovascular \u00b7 \u00a722","Atherosclerosis",
        "Plaque builds inside the artery wall over decades; a rupture can trigger a heart attack or stroke.",
        SRC_SCHEMA,"atherosclerosis-anatomy")
    s=[head,DEFS]
    stages=[("Healthy","open lumen, smooth wall",0.0,GRN),
            ("Fatty streak","apoB/LDL enters wall",0.25,AMB),
            ("Plaque","lipid core + fibrous cap",0.55,WARN),
            ("Rupture","clot blocks flow",0.85,RED)]
    n=len(stages); x0=110; gap=(W-220)/n
    for i,(nm,desc,narrow,col) in enumerate(stages):
        cxs=x0+gap*i+gap/2; cyy=cy+150; R=86
        # artery cross-section: outer wall + lumen
        s.append(f'<circle cx="{cxs}" cy="{cyy}" r="{R}" fill="#f0d9d0" stroke="{RED}" stroke-width="3"/>')
        lum=R*(1-narrow)*0.66
        s.append(f'<circle cx="{cxs}" cy="{cyy}" r="{lum:.0f}" fill="{PAPER}" stroke="{FAINT}" stroke-width="1.4"/>')
        # plaque crescent
        if narrow>0:
            s.append(f'<path d="M {cxs-R*0.6} {cyy-R*0.4} A {R*0.7} {R*0.7} 0 0 1 {cxs+R*0.6} {cyy-R*0.4} '
                     f'A {lum} {lum} 0 0 0 {cxs-R*0.6} {cyy-R*0.4} Z" fill="{col}" opacity="0.55"/>')
        if i==3:  # clot
            s.append(f'<circle cx="{cxs}" cy="{cyy}" r="{lum*0.7:.0f}" fill="{INK}" opacity="0.8"/>')
        s.append(T(cxs,cyy+R+34,nm,size=12.5,fill=col,font=ds.DISPLAY,weight="700",anchor="middle"))
        s.append(T(cxs,cyy+R+52,desc,size=9.6,fill=MUT,font=ds.BODY,anchor="middle"))
        if i<n-1:
            s.append(f'<line x1="{cxs+R+6}" y1="{cyy}" x2="{cxs+gap-R-2}" y2="{cyy}" stroke="{INK}" stroke-width="2.4" marker-end="url(#ah)"/>')
    s.append(T(W/2,cy+430,"Lifetime apoB-particle exposure is the driver \u2014 lower and earlier is the lever (see \u00a722, fig 102).",
               size=10.5,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA10-atherosclerosis.png"); return "RA10-atherosclerosis"

# ---------------------------------------------------------------- 11. HEART
def fig_heart():
    W,H=1120,660
    head,cy,foot=ds.panel(W,H,"Cardiovascular \u00b7 \u00a722","The heart",
        "Four chambers and the valves that keep blood moving one way: blue side pumps to the lungs, red side to the body.",
        SRC_SCHEMA,"heart-anatomy")
    s=[head,DEFS]
    cxh,cyh=W/2-30,cy+180
    # simple 2x2 chamber block, right (blue/deoxy) left (red/oxy)
    def cham(x,y,w,h,col,name,sub):
        r=[f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{col}22" stroke="{col}" stroke-width="2.6"/>']
        r.append(T(x+w/2,y+h/2-4,name,size=13,fill=col,font=ds.DISPLAY,weight="700",anchor="middle"))
        r.append(T(x+w/2,y+h/2+16,sub,size=9.4,fill=MUT,font=ds.BODY,anchor="middle"))
        return "".join(r)
    # right heart (deoxygenated, drawn on viewer's left) blue; left heart red
    s.append(cham(cxh-260,cyh-140,220,120,BLUE,"Right atrium","from body (low O\u2082)"))
    s.append(cham(cxh-260,cyh+0,220,150,BLUE,"Right ventricle","\u2192 to lungs"))
    s.append(cham(cxh+40,cyh-140,220,120,RED,"Left atrium","from lungs (O\u2082-rich)"))
    s.append(cham(cxh+40,cyh+0,220,150,RED,"Left ventricle","\u2192 to body (thick wall)"))
    # valves (gold ticks between chambers)
    for x,y in ((cxh-150,cyh),(cxh+150,cyh)):
        s.append(f'<line x1="{x-30}" y1="{y}" x2="{x+30}" y2="{y}" stroke="{GOLDD}" stroke-width="3"/>')
    # flow arrows
    s.append(f'<path d="M {cxh-150} {cyh-150} v -40" stroke="{BLUE}" stroke-width="2.6" marker-end="url(#ab)"/>')
    s.append(f'<path d="M {cxh+150} {cyh+150} v 40" stroke="{RED}" stroke-width="2.6" marker-end="url(#ar)"/>')
    s.append(label(60,cy+70,"Right heart","carries oxygen-poor blood to the lungs",hc=BLUE))
    s.append(label(1060,cy+70,"Left heart","pumps oxygen-rich blood to the body",anchor="end",hc=RED))
    s.append(leader(cxh+320,cyh+30,cxh+180,cyh,GOLDD)); s.append(label(cxh+330,cyh+26,"Valves (gold)","one-way only",anchor="start",hc=GOLDD))
    s.append(leader(cxh-320,cyh+30,cxh-180,cyh,GOLDD)); s.append(label(cxh-330,cyh+26,"Valve","",anchor="end",hc=GOLDD))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA14-heart.png"); return "RA14-heart"

# ---------------------------------------------------------------- 12. ENDOCRINE GLANDS
def fig_endocrine():
    W,H=1060,720
    head,cy,foot=ds.panel(W,H,"Endocrine \u00b7 \u00a713","The endocrine glands",
        "Hormone factories from head to pelvis, working as one signaling network.",
        SRC_SCHEMA,"endocrine-anatomy")
    s=[head,DEFS]
    # body silhouette (simple)
    bx,by=W/2-30,cy+70
    s.append(f'<path d="M {bx} {by} q 42 0 42 46 q 0 26 -14 40 q 60 24 60 150 l -18 200 q 0 40 -20 40 q -14 0 -16 -40 l -8 -150 l -8 150 q -2 40 -16 40 q -20 0 -20 -40 l -18 -200 q 0 -126 60 -150 q -14 -14 -14 -40 q 0 -46 42 -46 Z" fill="#f3ead2" stroke="{GOLDD}" stroke-width="2"/>')
    glands=[("Pineal / hypothalamus / pituitary","the master controllers in the brain",by+34,BLUE,"L"),
            ("Thyroid & parathyroid","metabolism & calcium",by+150,GRN,"R"),
            ("Thymus","immune training (shrinks with age)",by+210,TEAL,"L"),
            ("Adrenals","stress hormones, on the kidneys",by+300,WARN,"R"),
            ("Pancreas (islets)","insulin & glucagon",by+340,AMB,"L"),
            ("Gonads","sex hormones",by+470,PUR,"R")]
    for nm,desc,gy,col,side in glands:
        gx=bx+(6 if side=="R" else -6)
        s.append(f'<circle cx="{gx}" cy="{gy}" r="9" fill="{col}"/>')
        if side=="R":
            s.append(leader(bx+120,gy,gx+8,gy,col)); s.append(label(bx+130,gy-2,nm,desc,hc=col))
        else:
            s.append(leader(bx-120,gy,gx-8,gy,col)); s.append(label(bx-130,gy-2,nm,desc,anchor="end",hc=col))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA05-endocrine-glands.png"); return "RA05-endocrine-glands"

# ---------------------------------------------------------------- registry + CLI
FIGURES = {
    "neuron": fig_neuron, "synapse": fig_synapse, "mitochondrion": fig_mitochondrion,
    "the-cell": fig_cell, "nephron": fig_nephron, "brain-lobes": fig_brain_lobes,
    "action-potential": fig_action_potential, "dna-replication": fig_dna_replication,
    "telomere": fig_telomere, "atherosclerosis": fig_atherosclerosis,
    "heart": fig_heart, "endocrine": fig_endocrine,
}

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", help="substring: build only matching figures")
    ap.add_argument("--list", action="store_true")
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
