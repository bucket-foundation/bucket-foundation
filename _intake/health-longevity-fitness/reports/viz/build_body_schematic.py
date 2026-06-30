#!/usr/bin/env python3
"""BODY cluster — schematics (flows, spectrum, contrast, hub). SVG via ds."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker><marker id="gn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1d6b2e"/></marker><marker id="wn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker></defs>'
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sub=None,sz=13):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    if sub:
        s+=ds.text(x+w/2,y+h/2-4,label,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
        s+=ds.text(x+w/2,y+h/2+14,sub,size=10,fill=MUT,font=ds.BODY,anchor="middle")
    else:
        s+=ds.text(x+w/2,y+h/2+5,label,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def harrow(x0,x1,y,c="bk"): return f'<line x1="{x0}" y1="{y}" x2="{x1-4}" y2="{y}" stroke="{ "#1c1a17" if c=="bk" else "#1d6b2e" if c=="gn" else "#b5471f"}" stroke-width="3" marker-end="url(#{c})"/>'
def varrow(x,y0,y1,c="bk"): return f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1-4}" stroke="{ "#1c1a17" if c=="bk" else "#1d6b2e" if c=="gn" else "#b5471f"}" stroke-width="3" marker-end="url(#{c})"/>'
def frame(name,kicker,title,sub,src,claim,W,H,body):
    head,y0,foot=ds.panel(W,H,kicker,title,sub,src,claim)
    ds.render(head+ARROW+body+foot, f"{FIG}/{name}")
    return y0

def flow_row(steps,x0,x1,y,bw,bh,flagcol=GRN):
    """steps: list of (label, sub, flag_or_None). Returns svg."""
    n=len(steps); gap=((x1-x0)-n*bw)/(n-1)
    s=[]; xs=[]
    for i,(lab,sub,flag) in enumerate(steps):
        x=x0+i*(bw+gap); xs.append(x)
        s.append(box(x,y,bw,bh,lab,sub=sub))
        if flag: s.append(ds.text(x+bw/2,y+bh+18,flag,size=9.5,fill=flagcol,font=ds.BODY,weight="600",anchor="middle"))
        if i<n-1: s.append(harrow(x+bw,x+bw+gap,y+bh/2))
    return "".join(s)

# 1. Levels of organization — nested stacked bands
def levels():
    W,H=1000,560; y0=frame.__self__ if False else None
    items=[("Atoms","C · H · O · N · P · S"),("Molecules","DNA, proteins, ATP, lipids"),
           ("Organelles","mitochondria, nucleus, ribosomes"),("Cells","the unit of life"),
           ("Tissues","epithelial · connective · muscle · nervous"),("Organs","heart, liver, brain…"),
           ("Organ systems","11–12 cooperating systems"),("Organism","you")]
    head,cy,foot=ds.panel(W,H,"Anatomy · §18 §B.1","Levels of organization — atoms to organism",
        "Each level is built from the one below; health problems and levers live at every scale.","§18 §B.1","levels-of-organization")
    s=[head,ARROW]; n=len(items); bw0=300; x=W/2
    for i,(lab,sub) in enumerate(items):
        w=bw0+i*92; h=40; yy=cy+i*44; xx=x-w/2
        sh=int(40+i*22)
        fill=f"rgb({250-sh//3},{244-sh//4},{231-sh//2})"
        s.append(f'<rect x="{xx}" y="{yy}" width="{w}" height="{h}" rx="7" fill="{fill}" stroke="{GOLDD}" stroke-width="1.6"/>')
        s.append(ds.text(xx+16,yy+h/2+5,lab,size=13,fill=INK,font=ds.DISPLAY,weight="700"))
        s.append(ds.text(xx+w-16,yy+h/2+5,sub,size=10,fill=MUT,font=ds.BODY,anchor="end"))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS1-levels-of-organization.png")

# 2. VO2max oxygen chain
def vo2chain():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Physiology · §18 §B.4.1","The VO₂max oxygen chain — and the trainable links",
        "Oxygen's path from air to ATP. Every link can limit you; most are trainable.","§18 §B.4.1","vo2max-oxygen-chain")
    steps=[("Lungs","O₂ uptake","ventilation ↑"),("Blood","hemoglobin","Hb / volume ↑"),
           ("Heart","cardiac output","stroke volume ↑↑"),("Capillaries","O₂ delivery","density ↑"),
           ("Mitochondria","O₂ → ATP","number & size ↑↑")]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+30,164,74)]
    s.append(ds.text(W/2,cy+170,"the trainable links (green) are why fitness keeps improving at any age",
                     size=11,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS2-vo2max-oxygen-chain.png")

# 3. Food to ATP fuel chain
def atpchain():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Physiology · §18 §B.4.2","How food becomes ATP",
        "The fuel chain: digestion to the electron transport chain. The same pathway every cell runs.","§18 §B.4.2","food-to-atp-chain")
    steps=[("Food","carbs·fat·protein",None),("Digestion","glucose·fatty acids",None),
           ("Glycolysis / β-oxidation","→ acetyl-CoA",None),("Krebs cycle","NADH·FADH₂",None),
           ("ETC + ATP synthase","chemiosmosis → ATP","~90% of ATP")]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+30,164,74,flagcol=AMB)]
    s.append(ds.text(W/2,cy+170,"oxygen is the final electron acceptor — no O₂, no oxidative ATP",
                     size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS3-food-to-atp-chain.png")

# 4. Generic endocrine axis loop
def endo_axis():
    W,H=1000,520
    head,cy,foot=ds.panel(W,H,"Endocrine · §13 §1","The three-tier axis — the shared control law",
        "Hypothalamus → pituitary → gland → hormone, with negative feedback. HPA, HPT, HPG all run this primitive.","§13 §1","generic-endocrine-axis")
    cx=330; bw=210; bh=58
    tiers=[("Hypothalamus","releasing hormone (e.g. CRH)"),("Pituitary","stimulating hormone (e.g. ACTH)"),
           ("Target gland","e.g. adrenal cortex"),("Effector hormone","e.g. cortisol → the body")]
    s=[head,ARROW]
    ys=[cy+6,cy+96,cy+186,cy+276]
    for (lab,sub),yy in zip(tiers,ys):
        s.append(box(cx-bw/2,yy,bw,bh,lab,sub=sub));
    for i in range(3): s.append(varrow(cx,ys[i]+bh,ys[i+1]))
    # negative feedback arrow on the right
    fx=cx+bw/2+150
    s.append(f'<path d="M{cx+bw/2} {ys[3]+bh/2} H {fx} V {ys[0]+bh/2} H {cx+bw/2}" fill="none" stroke="{WARN}" stroke-width="2.6" stroke-dasharray="3 5" marker-end="url(#wn)"/>')
    s.append(ds.text(fx+12,(ys[0]+ys[3])/2+bh/2,"negative",size=12,fill=WARN,font=ds.DISPLAY,weight="700"))
    s.append(ds.text(fx+12,(ys[0]+ys[3])/2+bh/2+18,"feedback",size=12,fill=WARN,font=ds.DISPLAY,weight="700"))
    s.append(ds.text(fx+12,(ys[0]+ys[3])/2+bh/2+40,"(the rhythm & set-point)",size=9.5,fill=MUT,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS4-endocrine-axis.png")

# 5. Acute (resolving) vs chronic (non-resolving) inflammation — two tracks
def inflammation():
    W,H=1000,420
    head,cy,foot=ds.panel(W,H,"Immune · §15 §1.3","Inflammation that resolves vs inflammation that doesn't",
        "Acute inflammation is an active program with an OFF switch. Inflammaging is the switch failing.","§15 §1.3","acute-vs-chronic-inflammation")
    s=[head,ARROW]
    # acute track (green)
    ay=cy+18
    s.append(ds.text(40,ay-2,"ACUTE — self-resolving",size=11,fill=GRN,font=ds.DISPLAY,weight="bold"))
    acute=[("Injury /\ninfection",None),("Recruit\n(neutrophils)",None),("Clear the\nthreat",None),("Active\nresolution (SPMs)",None),("Tissue\nhealed",None)]
    bw=150; gap=((W-80)-5*bw)/4
    for i,(lab,_) in enumerate(acute):
        x=40+i*(bw+gap)
        s.append(box(x,ay+8,bw,56,"",fill="#eef4ec",stroke=GRN))
        for j,ln in enumerate(lab.split("\n")):
            s.append(ds.text(x+bw/2,ay+8+28+(j-0.5 if len(lab.split(chr(10)))>1 else 0)*14+5,ln,size=11,fill=INK,font=ds.BODY,weight="600",anchor="middle"))
        if i<4: s.append(harrow(x+bw,x+bw+gap,ay+8+28,"gn"))
    # chronic track (warn)
    by=cy+170
    s.append(ds.text(40,by-2,"CHRONIC — never resolves (inflammaging)",size=11,fill=WARN,font=ds.DISPLAY,weight="bold"))
    chron=[("Sterile trigger\n(senescence, gut, fat)",None),("Recruit",None),("No clearance",None),("Resolution\nFAILS",None),("Smoldering →\ndisease",None)]
    for i,(lab,_) in enumerate(chron):
        x=40+i*(bw+gap)
        s.append(box(x,by+8,bw,56,"",fill="#f6ece6",stroke=WARN))
        for j,ln in enumerate(lab.split("\n")):
            s.append(ds.text(x+bw/2,by+8+28+(j-0.5)*14+5,ln,size=10.5,fill=INK,font=ds.BODY,weight="600",anchor="middle"))
        if i<4: s.append(harrow(x+bw,x+bw+gap,by+8+28,"wn"))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS5-inflammation-acute-chronic.png")

# 6. MASLD progression spectrum + reversal point
def masld():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Hepatic · §17 §3.2","Fatty-liver progression — and the reversal point",
        "MASLD advances in stages; ≥7–10% weight loss reverses early disease. Cirrhosis is the point of no return.","§17 §3.2","masld-progression")
    stages=[("Healthy liver",GRN),("Steatosis\n(fat)",AMB),("MASH\n(inflammation)",AMB),("Fibrosis\n(scar)",WARN),("Cirrhosis →\nHCC",ds.INK2)]
    bw=150; gap=((W-80)-5*bw)/4
    s=[head,ARROW]
    for i,(lab,c) in enumerate(stages):
        x=40+i*(bw+gap)
        s.append(box(x,cy+34,bw,60,"",fill=CARD,stroke=c))
        for j,ln in enumerate(lab.split("\n")):
            s.append(ds.text(x+bw/2,cy+34+30+(j-0.5 if "\n" in lab else 0)*14+4,ln,size=12,fill=c,font=ds.DISPLAY,weight="700",anchor="middle"))
        if i<4: s.append(harrow(x+bw,x+bw+gap,cy+64))
    # reversal arrow under first 3
    rx0=40+bw/2; rx1=40+3*(bw+gap)-gap-bw/2
    s.append(f'<line x1="{rx1}" y1="{cy+120}" x2="{rx0}" y2="{cy+120}" stroke="{GRN}" stroke-width="3" marker-end="url(#gn)"/>')
    s.append(ds.text((rx0+rx1)/2,cy+140,"≥7–10% weight loss reverses it here",size=11.5,fill=GRN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS6-masld-progression.png")

# 7. Iron — the two-sided element (split)
def iron():
    W,H=1000,400
    head,cy,foot=ds.panel(W,H,"Hematology · §17 §5.2","Iron — too little and too much both harm",
        "The dose makes the poison. Find the cause on each side — never just 'take iron'.","§17 §5.2","iron-two-sided")
    s=[head,ARROW]
    midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+8}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    # deficiency
    s.append(box(60,cy+20,380,52,"DEFICIENCY — anemia",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Fatigue, pallor, low ferritin","Cause: blood loss (hunt occult GI bleed), diet, malabsorption","Fix: find the source, then replace iron"]):
        s.append(ds.text(70,cy+104+i*30,"• "+t,size=11.5,fill=INK,font=ds.BODY))
    # overload
    s.append(box(W-440,cy+20,380,52,"OVERLOAD — hemochromatosis",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Liver, heart, joint, pancreas damage","Cause: HFE genetics (common, missed)","Fix: phlebotomy — donating blood is the cure"]):
        s.append(ds.text(W-430,cy+104+i*30,"• "+t,size=11.5,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS7-iron-two-sided.png")

# 8. Inflammaging hub-spoke
def inflammaging():
    W,H=1000,548
    head,cy,foot=ds.panel(W,H,"Immune · §15 §3.1","The inflammaging hub",
        "Many low-grade sources feed one chronic fire; that fire feeds the diseases of aging. IL-6/hsCRP mark it (a predictor of risk).","§15 §3.1","inflammaging-hub")
    cxh,cyh=W/2,cy+178; r=64
    s=[head,ARROW]
    sources=[("Senescent cells\n(SASP)",-160,-122),("Gut barrier\nleak",160,-122),("Visceral fat\n(adipokines)",-224,8),
             ("DAMPs / debris",224,8),("Failed\nresolution",-150,148),("Chronic\ninfection (CMV)",150,148)]
    for lab,dx,dy in sources:
        x,y=cxh+dx,cyh+dy
        s.append(box(x-78,y-22,156,46,"",fill=CARD,stroke=AMB))
        for j,ln in enumerate(lab.split("\n")):
            s.append(ds.text(x,y-2+(j)*13,ln,size=10,fill=INK,font=ds.BODY,weight="600",anchor="middle"))
        ang=math.atan2(cyh-y,cxh-x)
        s.append(f'<line x1="{x+78*math.cos(ang) if abs(dx)>abs(dy) else x}" y1="{y+22*(1 if dy<0 else -1)}" x2="{cxh-r*math.cos(ang)-4*math.cos(ang)}" y2="{cyh-r*math.sin(ang)-4*math.sin(ang)}" stroke="{AMB}" stroke-width="2" marker-end="url(#bk)" opacity="0.7"/>')
    s.append(f'<circle cx="{cxh}" cy="{cyh}" r="{r}" fill="#b5471f"/>')
    s.append(ds.text(cxh,cyh-4,"INFLAMM-",size=13,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cxh,cyh+14,"AGING",size=13,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cxh,cyh+r+24,"→ atherosclerosis · diabetes · dementia · frailty · cancer",size=11,fill=WARN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/BS8-inflammaging-hub.png")

if __name__=="__main__":
    for fn in [levels,vo2chain,atpchain,endo_axis,inflammation,masld,iron,inflammaging]:
        fn(); print(fn.__name__,"ok")
