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

def _txt_w(head,body,hs=12.5):
    """Rough rendered width (px) of a label block: max of head / body lines."""
    hw=len(str(head))*hs*0.60
    bw=len(str(body))*9.6*0.52 if body else 0
    return max(hw,bw)

def lead_lbl(lx,ly,fx,fy,head,body=None,anchor="start",hc=INK2,col=None,pad=16):
    """Draw a label at (lx,ly) and a leader to feature (fx,fy) that starts just
    past the text edge, so the leader never crosses the label text."""
    col=col or hc
    w=_txt_w(head,body)
    sx0 = lx+w+pad if anchor=="start" else lx-w-pad
    return leader(sx0,ly+7,fx,fy,col)+label(lx,ly,head,body,anchor=anchor,hc=hc)

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
    # arrows: reabsorption back to blood (green, outward from the tubule wall)
    for (ax,ay) in ((455,gy+120),(455,gy+190),(590,gy+150)):
        dirx = -46 if ax<520 else 46
        s.append(f'<line x1="{ax}" y1="{ay}" x2="{ax+dirx}" y2="{ay}" stroke="{GRN}" stroke-width="2.6" marker-end="url(#ag)"/>')
    # labels
    s.append(leader(gx,cy+330,gx,gy+50,RED)); s.append(label(gx,cy+352,"Glomerulus","blood filtered here",anchor="middle",hc=RED))
    s.append(leader(430,cy+70,470,gy+60,GRN)); s.append(label(360,cy+40,"Proximal tubule","reclaims glucose, salts, water",hc=GRN))
    s.append(leader(520,cy+430,520,gy+305)); s.append(label(520,cy+452,"Loop of Henle","concentrates the urine",anchor="middle"))
    s.append(leader(950,cy+80,770,gy+70)); s.append(label(1060,cy+70,"Distal tubule","fine-tunes salt & pH",anchor="end"))
    s.append(leader(950,cy+440,820,gy+330)); s.append(label(1060,cy+432,"Collecting duct","final water balance \u2192 urine",anchor="end"))
    s.append(T(430,cy+560,"Green arrows = reabsorption back into the blood; what's left becomes urine.",size=10.5,fill=GRN,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA04-nephron.png"); return "RA04-nephron"

# ---------------------------------------------------------------- 6. BRAIN LOBES
def fig_brain_lobes():
    W,H=1120,660
    head,cy,foot=ds.panel(W,H,"Brain & Cognition \u00b7 \u00a708","The lobes of the brain",
        "A left-side view: frontal in front, parietal on top behind it, occipital at the back, temporal below \u2014 with the cerebellum and brainstem beneath.",
        SRC_SCHEMA,"brain-lobes-anatomy")
    s=[head,DEFS]
    cxc,cyc=555,cy+205
    def sx(dx): return cxc+dx
    def sy(dy): return cyc+dy
    # cerebrum silhouette (frontal pole at LEFT, occipital pole at RIGHT)
    cer=(f"M {sx(-235)} {sy(-5)} "
         f"C {sx(-235)} {sy(-72)}, {sx(-170)} {sy(-120)}, {sx(-90)} {sy(-122)} "
         f"C {sx(-10)} {sy(-124)}, {sx(90)} {sy(-120)}, {sx(160)} {sy(-96)} "
         f"C {sx(216)} {sy(-78)}, {sx(250)} {sy(-42)}, {sx(250)} {sy(0)} "
         f"C {sx(250)} {sy(40)}, {sx(216)} {sy(60)}, {sx(168)} {sy(62)} "
         f"C {sx(120)} {sy(64)}, {sx(66)} {sy(60)}, {sx(28)} {sy(62)} "
         f"C {sx(-2)} {sy(96)}, {sx(-72)} {sy(114)}, {sx(-122)} {sy(94)} "
         f"C {sx(-162)} {sy(78)}, {sx(-186)} {sy(50)}, {sx(-210)} {sy(38)} "
         f"C {sx(-226)} {sy(30)}, {sx(-235)} {sy(20)}, {sx(-235)} {sy(-5)} Z")
    # shared lateral (Sylvian) fissure line through (-150,40)->(78,2)
    m=(2-40)/(78-(-150))
    def fy(dx): return 40+(dx-(-150))*m
    def poly(pts): return " ".join(f"{sx(dx):.1f},{sy(dy):.1f}" for dx,dy in pts)
    CSbot=(-18,fy(-18))     # central sulcus meets the fissure
    FRO=[(-320,-220),(40,-220),(30,-112),CSbot,(-320,fy(-320))]
    PAR=[(40,-220),(150,-220),(150,fy(150)),(78,2),CSbot,(30,-112)]
    OCC=[(150,-220),(330,-220),(330,220),(150,220)]
    TEM=[(-320,fy(-320)),(150,fy(150)),(150,220),(-320,220)]
    cbx,cby=sx(120),sy(102)
    s.append(f'<defs><clipPath id="cerclip"><path d="{cer}"/></clipPath>'
             f'<clipPath id="cbclip"><ellipse cx="{cbx}" cy="{cby}" rx="80" ry="48"/></clipPath></defs>')
    s.append('<g clip-path="url(#cerclip)">')
    s.append(f'<polygon points="{poly(FRO)}" fill="{BLUE}" opacity="0.30"/>')
    s.append(f'<polygon points="{poly(PAR)}" fill="{GRN}" opacity="0.30"/>')
    s.append(f'<polygon points="{poly(OCC)}" fill="{PUR}" opacity="0.30"/>')
    s.append(f'<polygon points="{poly(TEM)}" fill="{AMB}" opacity="0.32"/>')
    s.append('</g>')
    # sulci
    syl=f"M {sx(-150)} {sy(40)} C {sx(-88)} {sy(34)}, {sx(-14)} {sy(16)}, {sx(78)} {sy(2)}"
    cen=f"M {sx(30)} {sy(-112)} C {sx(16)} {sy(-70)}, {sx(-6)} {sy(-28)}, {sx(CSbot[0])} {sy(CSbot[1])}"
    poc=f"M {sx(150)} {sy(-96)} C {sx(150)} {sy(-60)}, {sx(150)} {sy(-24)}, {sx(150)} {sy(fy(150))}"
    for d in (syl,cen,poc):
        s.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1.6" opacity="0.5"/>')
    s.append(f'<path d="{cer}" fill="none" stroke="{GOLDD}" stroke-width="2.6"/>')
    # cerebellum (tucked lower-rear, foliated) then brainstem drawn in front of it
    s.append(f'<ellipse cx="{cbx}" cy="{cby}" rx="80" ry="48" fill="{TEAL}" fill-opacity="0.16" stroke="{TEAL}" stroke-width="2.4"/>')
    s.append('<g clip-path="url(#cbclip)">')
    for k in range(-3,4):
        yy=cby+k*10.5
        s.append(f'<path d="M {cbx-82} {yy} Q {cbx} {yy-7} {cbx+82} {yy}" fill="none" stroke="{TEAL}" stroke-width="1.0" opacity="0.55"/>')
    s.append('</g>')
    bsx=sx(6)
    brain=(f"M {bsx-26} {sy(56)} C {bsx-32} {sy(112)}, {bsx-18} {sy(152)}, {bsx-14} {sy(188)} "
           f"L {bsx+16} {sy(188)} C {bsx+22} {sy(152)}, {bsx+30} {sy(112)}, {bsx+26} {sy(56)} Z")
    s.append(f'<path d="{brain}" fill="#efe4c8" stroke="{GOLDD}" stroke-width="2.2"/>')
    # labels + leaders (leaders start past the text edge)
    s.append(lead_lbl(60,cy+60,sx(-140),sy(-74),"Frontal","planning, movement, self-control",hc=BLUE))
    # Parietal sits directly above the lobe: a clean vertical leader, no text to cross
    s.append(leader(sx(70),cy+6,sx(70),sy(-66),GRN)); s.append(label(sx(70),cy-6,"Parietal","touch, spatial sense",anchor="middle",hc=GRN))
    s.append(lead_lbl(1060,cy+56,sx(205),sy(-30),"Occipital","vision",anchor="end",hc=PUR))
    s.append(lead_lbl(60,cy+314,sx(-96),sy(78),"Temporal","hearing, memory, language",hc=AMB))
    s.append(lead_lbl(1060,cy+322,cbx+54,cby+4,"Cerebellum","balance & coordination",anchor="end",hc=TEAL))
    s.append(lead_lbl(1060,cy+422,bsx+14,sy(158),"Brainstem","breathing, heart rate, arousal",anchor="end",hc=INK2))
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
    W,H=1120,680
    head,cy,foot=ds.panel(W,H,"Cardiovascular \u00b7 \u00a722","The heart",
        "Four chambers, four valves, one-way flow. The right side (blue) sends oxygen-poor blood to the lungs; the left side (red) pumps oxygen-rich blood to the body. The patient's right is on your left.",
        SRC_SCHEMA,"heart-anatomy")
    s=[head,DEFS]
    cxc,cyc=545,cy+250
    def sx(dx): return cxc+dx
    def sy(dy): return cyc+dy
    # myocardial silhouette (anterior view; apex to lower-right)
    sil=(f"M {sx(-150)} {sy(-150)} "
         f"C {sx(-205)} {sy(-150)}, {sx(-215)} {sy(-70)}, {sx(-180)} {sy(-10)} "
         f"C {sx(-150)} {sy(45)}, {sx(-120)} {sy(95)}, {sx(-70)} {sy(120)} "
         f"C {sx(-10)} {sy(150)}, {sx(60)} {sy(178)}, {sx(120)} {sy(150)} "
         f"C {sx(175)} {sy(122)}, {sx(198)} {sy(50)}, {sx(190)} {sy(-30)} "
         f"C {sx(184)} {sy(-90)}, {sx(150)} {sy(-150)}, {sx(90)} {sy(-150)} "
         f"C {sx(30)} {sy(-150)}, {sx(-90)} {sy(-150)}, {sx(-150)} {sy(-150)} Z")
    sept=f"M {sx(0)} {sy(-150)} C {sx(6)} {sy(-70)}, {sx(6)} {sy(20)}, {sx(24)} {sy(150)}"
    av_y=-18
    avplane=f"M {sx(-198)} {sy(av_y+6)} C {sx(-90)} {sy(av_y+22)}, {sx(90)} {sy(av_y+18)}, {sx(196)} {sy(av_y-6)}"
    def poly(pts): return " ".join(f"{sx(dx):.1f},{sy(dy):.1f}" for dx,dy in pts)
    s.append(f'<defs><clipPath id="hclip"><path d="{sil}"/></clipPath></defs>')
    s.append('<g clip-path="url(#hclip)">')
    s.append(f'<polygon points="{poly([(-260,-260),(12,-260),(30,260),(-260,260)])}" fill="{BLUE}" opacity="0.22"/>')
    s.append(f'<polygon points="{poly([(12,-260),(260,-260),(260,260),(30,260)])}" fill="{RED}" opacity="0.20"/>')
    s.append(f'<rect x="{sx(-260)}" y="{sy(-160)}" width="520" height="{av_y+160+16}" fill="{INK}" opacity="0.05"/>')
    # thicker left-ventricle wall
    s.append(f'<path d="M {sx(120)} {sy(150)} C {sx(160)} {sy(120)}, {sx(178)} {sy(55)}, {sx(172)} {sy(-20)}" fill="none" stroke="{RED}" stroke-width="10" opacity="0.30"/>')
    s.append('</g>')
    s.append(f'<path d="{sil}" fill="none" stroke="{GOLDD}" stroke-width="2.8"/>')
    s.append(f'<path d="{sept}" fill="none" stroke="{GOLDD}" stroke-width="2.0" opacity="0.7"/>')
    s.append(f'<path d="{avplane}" fill="none" stroke="{GOLDD}" stroke-width="1.6" opacity="0.55" stroke-dasharray="2 5"/>')
    # great vessels (drawn before valves so leaflets read on top)
    def tube(d,c): return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="20" stroke-linecap="round" opacity="0.9"/>'
    s.append(tube(f"M {sx(-150)} {sy(-240)} L {sx(-150)} {sy(-150)}", BLUE))          # SVC
    s.append(tube(f"M {sx(-205)} {sy(-120)} L {sx(-178)} {sy(-118)}", BLUE))          # IVC
    s.append(tube(f"M {sx(-70)} {sy(-150)} C {sx(-70)} {sy(-215)}, {sx(-120)} {sy(-240)}, {sx(-165)} {sy(-250)}", BLUE))  # pulmonary artery
    s.append(tube(f"M {sx(40)} {sy(-150)} C {sx(40)} {sy(-230)}, {sx(120)} {sy(-255)}, {sx(185)} {sy(-240)}", RED))       # aorta
    s.append(tube(f"M {sx(240)} {sy(-110)} L {sx(188)} {sy(-95)}", RED))              # pulmonary veins
    # valves (gold leaflets)
    def valve(x,y,w=22,c=GOLD):
        return (f'<path d="M {x-w} {y} Q {x} {y+13} {x+w} {y}" fill="none" stroke="{c}" stroke-width="3"/>'
                f'<line x1="{x}" y1="{y+11}" x2="{x}" y2="{y-2}" stroke="{c}" stroke-width="2"/>')
    tric=(sx(-92),sy(av_y+16)); mitr=(sx(96),sy(av_y+8))
    pulm=(sx(-70),sy(-150)); aort=(sx(40),sy(-150))
    s.append(valve(*tric)); s.append(valve(*mitr))
    s.append(valve(pulm[0],pulm[1]+8,16)); s.append(valve(aort[0],aort[1]+8,16))
    # chamber labels (inside)
    s.append(T(sx(-95),sy(-90),"Right atrium",size=11.5,fill=BLUE,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(T(sx(-95),sy(-74),"from body",size=8.8,fill=MUT,anchor="middle"))
    s.append(T(sx(-95),sy(60),"Right ventricle",size=11.5,fill=BLUE,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(T(sx(-95),sy(76),"\u2192 to lungs",size=8.8,fill=MUT,anchor="middle"))
    s.append(T(sx(95),sy(-90),"Left atrium",size=11.5,fill=RED,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(T(sx(95),sy(-74),"from lungs",size=8.8,fill=MUT,anchor="middle"))
    s.append(T(sx(95),sy(60),"Left ventricle",size=11.5,fill=RED,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(T(sx(95),sy(76),"\u2192 to body",size=8.8,fill=MUT,anchor="middle"))
    # outer labels + leaders (leaders start past the text edge)
    s.append(lead_lbl(60,cy+110,sx(-150),sy(-210),"Sup./inf. vena cava","oxygen-poor blood in from the body",hc=BLUE))
    s.append(lead_lbl(60,cy+212,pulm[0],pulm[1]-40,"Pulmonary artery","\u2192 to the lungs",hc=BLUE))
    s.append(lead_lbl(1060,cy+110,sx(150),sy(-245),"Aorta","oxygen-rich blood out to the body",anchor="end",hc=RED))
    s.append(lead_lbl(1060,cy+212,sx(215),sy(-105),"Pulmonary veins","\u2190 from the lungs",anchor="end",hc=RED))
    s.append(lead_lbl(60,cy+412,tric[0],tric[1],"Tricuspid & mitral valves","the one-way AV valves",hc=GOLDD))
    s.append(lead_lbl(1060,cy+412,aort[0],aort[1]+8,"Pulmonary & aortic valves","guard the artery exits",anchor="end",hc=GOLDD))
    s.append(foot); ds.render("".join(s),f"{FIG}/RA14-heart.png"); return "RA14-heart"

# ---------------------------------------------------------------- 12. ENDOCRINE GLANDS
def fig_endocrine():
    W,H=1060,800
    head,cy,foot=ds.panel(W,H,"Endocrine \u00b7 \u00a713","The endocrine glands",
        "Hormone factories from head to pelvis, working as one signaling network. Positions are anatomical: brain glands in the skull, adrenals atop the kidneys.",
        SRC_SCHEMA,"endocrine-anatomy")
    s=[head,DEFS]
    bx=W/2-20
    top=cy+24
    y_head=top+14; y_chin=top+92; y_neck=top+112; y_chest=top+205
    y_waist=top+320; y_hip=top+380; y_crotch=top+415; y_foot=top+575
    # front-facing body silhouette (head, neck, torso, pelvis, legs)
    body=(f"M {bx} {y_head-42} "
          f"C {bx+42} {y_head-42}, {bx+42} {y_chin}, {bx+16} {y_neck} "
          f"C {bx+64} {y_neck+6}, {bx+98} {y_chest-70}, {bx+98} {y_chest} "
          f"C {bx+98} {y_waist-20}, {bx+84} {y_waist}, {bx+80} {y_hip} "
          f"C {bx+78} {y_crotch}, {bx+70} {y_crotch+4}, {bx+30} {y_crotch+6} "
          f"L {bx+40} {y_foot} C {bx+40} {y_foot+18}, {bx+12} {y_foot+18}, {bx+12} {y_foot} "
          f"L {bx+6} {y_crotch+22} L {bx-6} {y_crotch+22} L {bx-12} {y_foot} "
          f"C {bx-12} {y_foot+18}, {bx-40} {y_foot+18}, {bx-40} {y_foot} "
          f"L {bx-30} {y_crotch+6} "
          f"C {bx-70} {y_crotch+4}, {bx-78} {y_crotch}, {bx-80} {y_hip} "
          f"C {bx-84} {y_waist}, {bx-98} {y_waist-20}, {bx-98} {y_chest} "
          f"C {bx-98} {y_chest-70}, {bx-64} {y_neck+6}, {bx-16} {y_neck} "
          f"C {bx-42} {y_chin}, {bx-42} {y_head-42}, {bx} {y_head-42} Z")
    s.append(f'<path d="{body}" fill="#f3ead2" stroke="{GOLDD}" stroke-width="2"/>')
    # faint kidney outlines to anchor the adrenals
    for sgn in (-1,1):
        s.append(f'<ellipse cx="{bx+sgn*36}" cy="{y_chest+70}" rx="15" ry="24" fill="none" stroke="{FAINT}" stroke-width="1.1" opacity="0.6"/>')
    glands=[
     ("Pineal / hypothalamus / pituitary","master controllers, deep in the brain", bx, y_head-2, BLUE, "L"),
     ("Thyroid & parathyroid","in the neck \u2014 metabolism & calcium", bx, y_neck+2, GRN, "R"),
     ("Thymus","behind the breastbone \u2014 immune training (shrinks with age)", bx, y_chest-4, TEAL, "L"),
     ("Adrenals","one atop each kidney \u2014 stress hormones", None, y_chest+52, RED, "R"),
     ("Pancreas (islets)","upper abdomen \u2014 insulin & glucagon", bx-8, y_chest+92, AMB, "L"),
     ("Gonads","in the pelvis \u2014 sex hormones", bx, y_crotch-2, PUR, "R"),
    ]
    for nm,desc,gx,gy,col,side in glands:
        if nm.startswith("Adrenals"):
            for sgn in (-1,1):
                s.append(f'<circle cx="{bx+sgn*36}" cy="{gy}" r="7" fill="{col}"/>')
            anchorx=bx+36; anchory=gy
        else:
            s.append(f'<circle cx="{gx}" cy="{gy}" r="8" fill="{col}"/>')
            anchorx,anchory=gx,gy
        if side=="R":
            lx=bx+124; s.append(leader(lx,anchory,anchorx+8,anchory,col)); s.append(label(lx+10,anchory-2,nm,desc,hc=col))
        else:
            lx=bx-124; s.append(leader(lx,anchory,anchorx-8,anchory,col)); s.append(label(lx-10,anchory-2,nm,desc,anchor="end",hc=col))
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
