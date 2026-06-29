#!/usr/bin/env python3
"""Signature schematics: chemiosmosis energy-stack, mitochondria section, hallmarks wheel,
organ-systems map, nutrient-sensing switchboard. Clean schematic style (not photorealistic)."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))

def arrowdefs():
    out=""
    for n,c in [("ah",ds.GOLD_D),("ar","#b5471f"),("ag","#1d6b2e"),("ab","#3a6ea5"),("am",ds.MUT)]:
        out+=(f'<marker id="{n}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">'
              f'<path d="M0,0 L7,3 L0,6 Z" fill="{c}"/></marker>')
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.4,marker="ah",dash=None):
    d=f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}"{d} marker-end="url(#{marker})"/>'

# ---------------- 1. CHEMIOSMOSIS ENERGY STACK ----------------
def energy_stack():
    W,H=1020,640
    head,y0,foot=ds.panel(W,H,"First Principles · the master variable",
        "Chemiosmosis — the engine of being alive",
        "Every lever in this book reaches up to one law: the proton gradient across this membrane.",
        "§First Principles · Mitchell & Moyle, Nobel 1978","chemiosmosis-proton-motive-force")
    s=[head, arrowdefs()]
    yT, yB = 330, 392           # inner-membrane band
    mx0, mx1 = 70, W-70
    # compartment labels + shading
    s.append(f'<rect x="{mx0}" y="{y0+8}" width="{mx1-mx0}" height="{yT-(y0+8)}" fill="#f1ead8"/>')
    s.append(f'<rect x="{mx0}" y="{yB}" width="{mx1-mx0}" height="{H-110-yB}" fill="#f6f1e2"/>')
    s.append(ds.text(mx0+6,y0+30,"INTERMEMBRANE SPACE — H⁺ accumulates (high charge)",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    s.append(ds.text(mx0+6,yB+86,"MATRIX — low H⁺",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    # membrane band (lipid bilayer)
    s.append(f'<rect x="{mx0}" y="{yT}" width="{mx1-mx0}" height="{yB-yT}" fill="#e3d8bd" stroke="#cdbf9a" stroke-width="1"/>')
    # electron flow arrow along the chain
    s.append(arrow(150,yT-92,560,yT-92,ds.GOLD,2.6,"ah","1 6"))
    s.append(ds.text(150,yT-100,"e⁻  from NADH / FADH₂  →  …  →  ½O₂ → H₂O",size=11,fill=ds.GOLD_D,font=ds.BODY,weight="600"))
    # ETC complexes pump H+ UP
    comps=[("I",150,"#2f8a4b"),("III",330,"#b08d3a"),("IV",510,"#b5471f")]
    for lab,cx,c in comps:
        s.append(f'<rect x="{cx-26}" y="{yT-12}" width="52" height="{yB-yT+24}" rx="7" fill="{c}"/>')
        s.append(ds.text(cx,yB+ (yT-yB)/2 +4,lab,size=16,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
        s.append(arrow(cx,yB+34,cx,yT-26,ds.MUT,2,"am"))
        s.append(ds.text(cx-40,yB+30,"H⁺",size=11,fill=ds.MUT,font=ds.BODY,weight="700"))
    s.append(ds.text(330,yB+58,"Electron transport chain — pumps protons OUT, building the gradient",size=11,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    # ATP synthase — H+ flows back DOWN, makes ATP
    ax=760
    s.append(f'<rect x="{ax-34}" y="{yT-12}" width="68" height="{yB-yT+24}" rx="9" fill="#3a6ea5"/>')
    s.append(ds.text(ax,yT-2,"ATP",size=12,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(ds.text(ax,yT+14,"synthase",size=10,fill="white",font=ds.BODY,anchor="middle"))
    s.append(arrow(ax,yT-30,ax,yB+30,"#3a6ea5",2.4,"ab"))
    s.append(ds.text(ax+44,yT-22,"H⁺ flows back down",size=11,fill="#3a6ea5",font=ds.BODY,weight="600"))
    s.append(ds.text(ax+44,yB+24,"ADP + Pᵢ  →  ATP",size=13,fill="#3a6ea5",font=ds.DISPLAY,weight="800"))
    # the law callout
    s.append(f'<rect x="{mx0}" y="{H-96}" width="{mx1-mx0}" height="36" rx="6" fill="{ds.CARD}" stroke="{ds.GOLD}" stroke-width="1.2"/>')
    s.append(ds.text(mx0+14,H-73,"The proton-motive force (Δp) IS the cell's energy currency. Exercise builds the machinery; aging erodes it; mitochondria run it.",
                     size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/04-energy-stack.png")

# ---------------- 2. MITOCHONDRIA CROSS-SECTION + 3 DIALS ----------------
def mitochondria_section():
    W,H=1020,600
    head,y0,foot=ds.panel(W,H,"First Principles · the organelle",
        "Inside the mitochondrion — and its three dials",
        "Quantity, quality, efficiency — the three things training and fasting actually change.",
        "§Mitochondrial Health","mitochondria-three-dials")
    s=[head, arrowdefs()]
    # cross-section ellipse on the left
    cx,cy,rx,ry=270,y0+170,200,120
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#f3ead6" stroke="#b08d3a" stroke-width="3"/>')           # outer membrane
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx-14}" ry="{ry-14}" fill="none" stroke="#8a6d12" stroke-width="2"/>')          # inner membrane
    # cristae folds (inner membrane infoldings)
    folds=""
    for k in range(5):
        fx=cx-rx+50+k*68
        folds+=f'<path d="M{fx} {cy-ry+22} q 26 {ry-30} 0 {2*(ry-22)}" fill="none" stroke="#8a6d12" stroke-width="2.4"/>'
    s.append(folds)
    s.append(f'<circle cx="{cx-70}" cy="{cy+50}" r="13" fill="none" stroke="#b5471f" stroke-width="2.4"/>')
    s.append(ds.text(cx-70,cy+54,"mtDNA",size=8,fill="#b5471f",font=ds.MONO,anchor="middle"))
    # labels via leaders
    def leader(lx,ly,tx,ty,txt):
        return arrow(tx,ty,lx,ly,ds.MUT,1.4,"am")+ds.text(tx,ty-6 if ty<cy else ty+14,txt,size=10.5,fill=ds.INK,font=ds.BODY,weight="600",anchor="middle")
    s.append(leader(cx,cy-ry, cx, y0+34, "outer membrane"))
    s.append(leader(cx+rx-30,cy-40, cx+rx+60, y0+70, "cristae (inner-membrane folds —"))
    s.append(ds.text(cx+rx+60,y0+86,"where chemiosmosis happens)",size=10.5,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    s.append(ds.text(cx,cy+ry+24,"matrix (Krebs cycle runs here)",size=10.5,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    # the three dials on the right
    dials=[("QUANTITY","biogenesis — more mitochondria","raised by: Zone 2 / endurance (PGC-1α)","#2f8a4b"),
           ("QUALITY","mitophagy — clear the broken ones","raised by: fasting, exercise (PINK1/Parkin)","#3a6ea5"),
           ("EFFICIENCY","coupling & metabolic flexibility","raised by: training, cold, fat-adaptation","#b08d3a")]
    dx=560; dy=y0+24
    for i,(t,d1,d2,c) in enumerate(dials):
        yy=dy+i*120
        s.append(f'<rect x="{dx}" y="{yy}" width="{W-70-dx}" height="100" rx="10" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{dx}" y="{yy}" width="9" height="100" rx="4" fill="{c}"/>')
        s.append(ds.text(dx+26,yy+34,f"{i+1}  {t}",size=16,fill=c,font=ds.DISPLAY,weight="900"))
        s.append(ds.text(dx+26,yy+58,d1,size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(dx+26,yy+80,d2,size=11,fill=ds.MUT,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/16-mitochondria-section.png")

# ---------------- 3. HALLMARKS OF CANCER WHEEL ----------------
def hallmarks_wheel():
    W,H=1020,720
    head,y0,foot=ds.panel(W,H,"Oncology · what cancer is, fundamentally",
        "The Hallmarks of Cancer",
        "Eight capabilities a normal cell must acquire to become a tumour (Hanahan & Weinberg).",
        "§Oncology · Hanahan & Weinberg 2000/2011/2022","hallmarks-of-cancer")
    s=[head]
    cx,cy,R=W/2, y0+ (H-110-y0)/2 +6, 150
    halls=[("Sustained\nproliferation","#b5471f"),("Evading growth\nsuppressors","#b08d3a"),
           ("Resisting\ncell death","#8a6d12"),("Replicative\nimmortality","#2f8a4b"),
           ("Inducing\nangiogenesis","#3a6ea5"),("Invasion &\nmetastasis","#7a5a9c"),
           ("Deregulated\nenergetics","#c2693a"),("Avoiding immune\ndestruction","#5e8a55")]
    n=len(halls)
    # spokes + outer pills
    for i,(lab,c) in enumerate(halls):
        ang=-math.pi/2 + i*2*math.pi/n
        ex,ey=cx+math.cos(ang)*R, cy+math.sin(ang)*R
        px,py=cx+math.cos(ang)*(R+86), cy+math.sin(ang)*(R+58)
        s.append(f'<line x1="{cx+math.cos(ang)*70:.0f}" y1="{cy+math.sin(ang)*70:.0f}" x2="{ex:.0f}" y2="{ey:.0f}" stroke="{c}" stroke-width="2.2"/>')
        s.append(f'<circle cx="{ex:.0f}" cy="{ey:.0f}" r="9" fill="{c}"/>')
        # label box
        lines=lab.split("\n"); bw=150; bh=20+len(lines)*16
        s.append(f'<rect x="{px-bw/2:.0f}" y="{py-bh/2:.0f}" width="{bw}" height="{bh}" rx="8" fill="{ds.CARD}" stroke="{c}" stroke-width="1.6"/>')
        for j,ln in enumerate(lines):
            s.append(ds.text(px, py-bh/2+18+j*16, ln, size=11, fill=ds.INK, font=ds.BODY, weight="600", anchor="middle"))
    # center
    s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="64" fill="{ds.INK2}"/>')
    s.append(ds.text(cx,cy-4,"CANCER",size=16,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(ds.text(cx,cy+16,"CELL",size=16,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/10-hallmarks-cancer.png")

# ---------------- 4. 12 ORGAN-SYSTEMS MAP ----------------
def organ_systems_map():
    W,H=1020,640
    head,y0,foot=ds.panel(W,H,"The Body · navigation",
        "The 12 organ systems — and where to find them",
        "The body, mapped. Each system is a chapter; this is the index.",
        "§The Body — system by system","organ-systems-map")
    s=[head]
    systems=[("Cardiovascular","heart · vessels · BP · lipids","§07"),("Nervous","brain · nerves · autonomic","§14"),
             ("Endocrine","hormones · the feedback axes","§13"),("Musculoskeletal","muscle · bone · tendon","§02/§11"),
             ("Immune / Lymphatic","defence · inflammaging","§15"),("Digestive / Hepatic","gut · liver · microbiome","§17"),
             ("Respiratory","lungs · gas exchange","§17"),("Renal / Urinary","kidneys · filtration","§17"),
             ("Integumentary","skin · hair · photoaging","§11"),("Reproductive","sex hormones · fertility","§42"),
             ("Sensory","vision · hearing","§11"),("Hematologic","blood · iron · clotting","§17")]
    cols,rows=4,3; gx,gy=70,y0+20; cw=(W-2*70)/cols-14; ch=120
    cols_c=["#b5471f","#3a6ea5","#b08d3a","#2f8a4b"]
    for i,(name,desc,ref) in enumerate(systems):
        r,c=divmod(i,cols); x=gx+c*((W-140)/cols); yy=gy+r*(ch+18)
        col=cols_c[c]
        s.append(f'<rect x="{x:.0f}" y="{yy}" width="{cw:.0f}" height="{ch}" rx="10" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x:.0f}" y="{yy}" width="{cw:.0f}" height="6" rx="3" fill="{col}"/>')
        s.append(ds.text(x+16,yy+38,name,size=14.5,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x+16,yy+62,desc,size=11,fill=ds.MUT,font=ds.BODY))
        b,_=ds.badge(x+16,yy+78,ref,col,h=18,size=10); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/17-organ-systems-map.png")

# ---------------- 5. NUTRIENT-SENSING SWITCHBOARD ----------------
def nutrient_switchboard():
    W,H=1020,678
    head,y0,foot=ds.panel(W,H,"First Principles · the switches every lever pulls",
        "The Nutrient-Sensing Switchboard",
        "Growth vs repair — the cell's master trade-off, and what tips it each way.",
        "§First Principles / §Mechanism Bridge","nutrient-sensing-network")
    s=[head, arrowdefs()]
    # center switches
    midx=W/2; sw=[("mTOR","#b5471f",y0+70),("AMPK","#2f8a4b",y0+170),("Sirtuins","#3a6ea5",y0+270),("IGF-1 / insulin","#b08d3a",y0+370)]
    for name,c,yy in sw:
        s.append(f'<rect x="{midx-85}" y="{yy-22}" width="170" height="44" rx="10" fill="{c}"/>')
        s.append(ds.text(midx,yy+5,name,size=15,fill="white",font=ds.DISPLAY,weight="800",anchor="middle"))
    # inputs (left)  -> switch
    inputs=[("Protein / leucine","mTOR",0,"↑"),("Resistance training","mTOR",0,"↑"),
            ("Fasting / CR","AMPK",1,"↑"),("Endurance / Zone 2","AMPK",1,"↑"),
            ("NAD⁺ / fasting","Sirtuins",2,"↑"),("Carbs / frequent eating","IGF-1 / insulin",3,"↑")]
    lx=80
    for i,(name,_,si,sign) in enumerate(inputs):
        yy=y0+50+i*72
        s.append(f'<rect x="{lx}" y="{yy-15}" width="190" height="30" rx="6" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.1"/>')
        s.append(ds.text(lx+12,yy+5,name,size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
        ty=sw[si][2]
        s.append(arrow(lx+190,yy,midx-88,ty,sw[si][1],1.8,"ah" if si!=1 and si!=2 else "ag"))
    # outputs (right)
    s.append(f'<rect x="{W-300}" y="{y0+60}" width="230" height="92" rx="10" fill="#fbf0ea" stroke="#b5471f" stroke-width="1.4"/>')
    s.append(ds.text(W-185,y0+86,"GROWTH MODE",size=14,fill="#b5471f",font=ds.DISPLAY,weight="800",anchor="middle"))
    s.append(ds.text(W-185,y0+108,"protein synthesis, building",size=11,fill=ds.INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W-185,y0+126,"(mTOR high · IGF-1 high)",size=10,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    s.append(f'<rect x="{W-300}" y="{y0+250}" width="230" height="92" rx="10" fill="#e9f3ea" stroke="#2f8a4b" stroke-width="1.4"/>')
    s.append(ds.text(W-185,y0+276,"REPAIR MODE",size=14,fill="#1d6b2e",font=ds.DISPLAY,weight="800",anchor="middle"))
    s.append(ds.text(W-185,y0+298,"autophagy, recycling, stress-resistance",size=10.5,fill=ds.INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W-185,y0+316,"(AMPK high · mTOR low)",size=10,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    s.append(arrow(midx+88,y0+70,W-300,y0+100,"#b5471f",2,"ar"))
    s.append(arrow(midx+88,y0+170,W-300,y0+290,"#2f8a4b",2,"ag"))
    s.append(f'<rect x="70" y="{H-92}" width="{W-140}" height="34" rx="6" fill="#fbf0ea" stroke="{ds.WARN}" stroke-width="1.1"/>')
    s.append(ds.text(84,H-70,"⚠ You can't be in both modes at once. The art is cycling them — build, then repair — by age and goal (the protein / mTOR trade-off).",size=11,fill=ds.WARN,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/05-nutrient-switchboard.png")

if __name__=="__main__":
    energy_stack(); print("energy ok")
    mitochondria_section(); print("mito ok")
    hallmarks_wheel(); print("hallmarks ok")
    organ_systems_map(); print("organ ok")
    nutrient_switchboard(); print("switchboard ok")
