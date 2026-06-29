#!/usr/bin/env python3
"""Wave 4 figures. Charts + clinical diagrams/matrices on the design system."""
import os, sys, math, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
def arrowdefs():
    out="".join(f'<marker id="{n}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="{c}"/></marker>' for n,c in [("ah",ds.GOLD_D),("ag","#1d6b2e"),("ab","#3a6ea5")])
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.4,m="ah"):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" marker-end="url(#{m})"/>'

# ---------- CHARTS ----------
def grip_mortality():
    cats=["Weakest\n(Q1)","Q2","Q3","Q4","Strongest\n(Q5)"]; hr=[1.00,0.83,0.72,0.64,0.59]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    ax.bar(xp,hr,width=0.62,color=["#b5471f","#c2693a","#8a6d12","#5e8a3a","#1d6b2e"],edgecolor=ds.PAPER,linewidth=1.4)
    for i,h in zip(xp,hr): ax.text(i,h+0.02,f"{h:.2f}",ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,1.12); ax.grid(axis="x",visible=False)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Measurement","Grip strength predicts mortality",
             "A cheap proxy for whole-body strength: each 5 kg lower grip ≈ 16% higher mortality (PURE).")
    ds.footer(ax,"Leong et al., Lancet 2015 — PURE (n≈140,000)","grip-strength-mortality-pure",tier="cohort")
    ds.flag(ax,"predictor — train strength directly","caution")
    ds.save(fig,f"{FIG}/43-grip-mortality.png",bottom=0.2)

def sleep_hypnogram():
    # stage levels: Awake=4, REM=3, N1=2, N2=1, N3=0 ; across ~8 hours
    t=[0,0.2,0.5,0.9,1.3,1.6,2.0,2.4,2.8,3.2,3.6,4.0,4.4,4.8,5.2,5.6,6.0,6.4,6.8,7.2,7.6,8.0]
    stage=[4,2,1,0,0,1,3,1,0,0,1,3,1,1,3,1,1,3,2,3,2,4]
    fig,ax=ds.new_fig(8.8,5.0)
    ax.step(t,stage,where="post",color=ds.GOLD_D,lw=2.4)
    ax.fill_between(t,stage,step="post",color=ds.GOLD,alpha=0.18)
    ax.set_yticks([0,1,2,3,4]); ax.set_yticklabels(["N3 (deep)","N2","N1","REM","Awake"],fontsize=10.5)
    ax.set_ylim(-0.4,4.4); ax.set_xlim(0,8); ax.set_xlabel("hours after falling asleep",fontsize=10,color=ds.MUT); ax.grid(axis="x",visible=False)
    ax.annotate("deep sleep loads early",(1.1,0),xytext=(1.6,2.6),fontsize=9.5,color="#1d6b2e",fontweight="bold",arrowprops=dict(arrowstyle="->",color="#1d6b2e",lw=1.4))
    ax.annotate("REM loads late",(7.2,3),xytext=(5.4,3.7),fontsize=9.5,color="#3a6ea5",fontweight="bold",arrowprops=dict(arrowstyle="->",color="#3a6ea5",lw=1.4))
    ds.title(ax,"Recovery · sleep","A night of sleep, stage by stage",
             "~90-min cycles. Deep sleep front-loads (cut short by late nights); REM back-loads (cut by early alarms).")
    ds.footer(ax,"Typical adult hypnogram (illustrative)","sleep-architecture-stages",tier="mechanistic")
    ds.save(fig,f"{FIG}/44-sleep-hypnogram.png")

def cortisol_rhythm():
    h=np.linspace(0,24,200); c=14*np.exp(-((h-8)**2)/8)+3+2*np.exp(-((h-15)**2)/6)
    fig,ax=ds.new_fig(8.6,5.0)
    ax.plot(h,c,color=ds.GOLD,lw=3); ax.fill_between(h,c,color=ds.GOLD,alpha=0.16)
    ax.axvspan(6,9,color="#e9f3ea",zorder=0)
    ax.set_xlim(0,24); ax.set_xticks([0,4,8,12,16,20,24]); ax.set_xticklabels(["mid","4a","8a","noon","4p","8p","mid"],fontsize=10)
    ax.set_ylim(0,21); ax.set_xlabel("time of day",fontsize=10,color=ds.MUT); ax.set_ylabel("blood cortisol (relative)",fontsize=10,color=ds.MUT)
    ax.text(7.5,19.6,"morning peak — cortisol awakening response",ha="center",fontsize=9.5,color="#1d6b2e",fontweight="bold")  # above the curve, clear
    ds.title(ax,"Endocrine","Cortisol has a daily rhythm — high AM, low PM",
             "Healthy stress hormone, on a clock. ('Adrenal fatigue' is not a real diagnosis.)")
    ds.footer(ax,"Typical diurnal cortisol curve (illustrative)","cortisol-circadian-rhythm",tier="mechanistic")
    ds.save(fig,f"{FIG}/45-cortisol-rhythm.png")

def action_potential():
    t=np.linspace(0,6,400)
    v=-70+np.where(t<1,0,0)
    v=np.full_like(t,-70.0)
    for i,x in enumerate(t):
        if 1<=x<1.4: v[i]=-70+275*(x-1)         # depolarization to +40
        elif 1.4<=x<2.2: v[i]=40-150*(x-1.4)     # repolarization
        elif 2.2<=x<3.2: v[i]=-80+10*(x-2.2)     # hyperpolarization recovery
    fig,ax=ds.new_fig(8.6,5.0)
    ax.axhline(-55,color=ds.MUT,ls=":",lw=1.2); ax.text(5.6,-52,"threshold",fontsize=9,color=ds.MUT,ha="right")
    ax.plot(t,v,color=ds.GOLD_D,lw=2.6)
    ax.annotate("Na⁺ in\n(depolarize)",(1.25,0),xytext=(0.2,18),fontsize=9,color="#b5471f",fontweight="bold")
    ax.annotate("K⁺ out\n(repolarize)",(1.7,-10),xytext=(2.4,8),fontsize=9,color="#3a6ea5",fontweight="bold")
    ax.set_ylim(-90,55); ax.set_xlim(0,6); ax.set_xlabel("milliseconds",fontsize=10,color=ds.MUT); ax.set_ylabel("membrane voltage (mV)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Nervous system","The action potential — how a nerve fires",
             "A wave of ion flux down the membrane. The Na⁺/K⁺ pump resets it — the cell's costliest housekeeping.")
    ds.footer(ax,"Hodgkin & Huxley 1952 (illustrative trace)","action-potential","mechanistic")
    ds.save(fig,f"{FIG}/46-action-potential.png")
action_potential.__doc__=None

def vaccines_longevity():
    labels=["Shingles vaccine\n→ dementia","Flu vaccine\n→ heart attack/stroke","Shingrix\n→ shingles"]
    vals=[20,34,90]
    fig,ax=ds.new_fig(8.8,5.0); xp=range(len(labels))
    ax.bar(xp,vals,width=0.55,color=ds.GOLD_D,edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,vals): ax.text(i,v+1.5,f"−{v}%",ha="center",fontsize=12,color="#1d6b2e",fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(labels,fontsize=10); ax.set_ylim(0,100); ax.grid(axis="x",visible=False)
    ax.set_ylabel("risk reduction (%)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Pharmacology · underrated","Vaccines as longevity medicine",
             "Beyond preventing infection — the shingles vaccine's dementia signal is a striking natural experiment.")
    ds.footer(ax,"Eyting/Geldsetzer Nature 2025 · IAMI (flu/CV) · ZOE-50/70","vaccines-as-longevity",tier="rct")
    ds.save(fig,f"{FIG}/47-vaccines-longevity.png",bottom=0.2)

def hrt_timing():
    age=[50,52,55,58,60,63,66,70]; risk=[0.82,0.85,0.92,0.99,1.06,1.18,1.30,1.45]
    fig,ax=ds.new_fig(8.6,5.0)
    ax.axhline(1.0,color=ds.MUT,ls=":",lw=1.2)
    ax.axvspan(50,60,color="#e9f3ea",zorder=0); ax.axvspan(60,70,color="#fbf0ea",zorder=0)
    ax.plot(age,risk,color=ds.GOLD,lw=3); ax.scatter(age,risk,s=46,color=ds.GOLD_D,zorder=4)
    ax.text(54.5,0.74,"window of benefit\n(within ~10 yr of menopause)",ha="center",fontsize=9.5,color="#1d6b2e",fontweight="bold")
    ax.text(65,1.38,"net harm\nif started late",ha="center",fontsize=9.5,color="#b5471f",fontweight="bold")
    ax.set_ylim(0.68,1.5); ax.set_xlabel("age HRT is started",fontsize=10,color=ds.MUT); ax.set_ylabel("relative risk vs no HRT",fontsize=10,color=ds.MUT)
    ds.title(ax,"Women's health","HRT — it's all about timing",
             "The estrogen 'timing hypothesis': likely net-benefit started early, net-harm started late (the WHI lesson).")
    ds.footer(ax,"WHI reanalysis · ELITE/KEEPS — illustrative","conflict-hrt-timing",tier="rct")
    ds.save(fig,f"{FIG}/48-hrt-timing.png")

# ---------- DIAGRAMS / MATRICES (SVG) ----------
def imaging_matrix():
    W,H=1020,470
    head,y0,foot=ds.panel(W,H,"Imaging · how to read a scan order","The imaging modalities at a glance",
        "What each sees, its radiation, and the honest 'a scan is not a checkup' caveat.","§Diagnostic Imaging","imaging-modalities")
    s=[head]
    cols=[("MODALITY",40),("SEES",250),("RADIATION",470),("BEST FOR",660)]
    for t,x in cols: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    rows=[("X-ray","bones, chest","low","2",ds.GOLD),("CT","detail, bleeds, tumors","HIGH","4",ds.WARN),
          ("Ultrasound","soft tissue, flow","none","0",ds.OK),("MRI","soft tissue, brain, joints","none","0",ds.OK),
          ("PET","metabolic activity","high","3",ds.WARN),("DEXA","bone density, body comp","tiny","1",ds.GOLD)]
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(m,sees,rad,dots,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,m,size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(250,yy+rh/2+4,sees,size=11,fill=ds.INK,font=ds.BODY))
        for d in range(int(dots)): s.append(f'<circle cx="{470+d*14}" cy="{yy+rh/2}" r="5" fill="{c}"/>')
        if dots=="0": s.append(ds.text(470,yy+rh/2+4,"none",size=10.5,fill=ds.OK,font=ds.BODY,weight="600"))
        s.append(ds.text(660,yy+rh/2+4,sees if False else {"X-ray":"fractures, pneumonia","CT":"trauma, cancer staging","Ultrasound":"pregnancy, heart, thyroid","MRI":"brain, ligaments, tumors","PET":"cancer spread","DEXA":"osteoporosis, fat/lean"}[m],size=10.5,fill=ds.MUT,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/49-imaging-matrix.png")

def ckd_heatmap():
    W,H=860,640
    head,y0,foot=ds.panel(W,H,"Kidney disease · the risk map","The KDIGO CKD heat-map",
        "Risk = filtration (eGFR) × protein leak (albuminuria). Green is fine; red needs a nephrologist.","§Disease Atlas I","ckd-kdigo-grid")
    s=[head]
    rows=["G1 ≥90","G2 60–89","G3a 45–59","G3b 30–44","G4 15–29","G5 <15"]
    colsh=["A1\nnormal","A2\nmoderate","A3\nsevere"]
    risk=[[0,0,1],[0,0,1],[0,1,2],[1,2,2],[2,2,3],[3,3,3]]
    pal=["#3f9b53","#d9c14a","#d98a2b","#b5471f"]
    gx,gy=200,y0+44; cw=170; ch=(H-70-gy)/len(rows)
    for j,c in enumerate(colsh):
        for k,ln in enumerate(c.split("\n")): s.append(ds.text(gx+cw*j+cw/2,gy-26+k*13,ln,size=10.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(40,gy-26,"eGFR ↓",size=10.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    for i,r in enumerate(rows):
        yy=gy+i*ch
        s.append(ds.text(40,yy+ch/2+4,r,size=11,fill=ds.INK,font=ds.BODY,weight="600"))
        for j in range(3):
            s.append(f'<rect x="{gx+cw*j}" y="{yy}" width="{cw-6}" height="{ch-6}" rx="5" fill="{pal[risk[i][j]]}"/>')
    # legend
    lab=["low","moderate","high","very high"]
    for i,(l,c) in enumerate(zip(lab,pal)):
        s.append(f'<rect x="{200+i*150}" y="{H-52}" width="16" height="14" rx="2" fill="{c}"/>'); s.append(ds.text(200+i*150+22,H-40,l,size=10.5,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/50-ckd-heatmap.png")

def pain_biopsychosocial():
    W,H=860,640
    head,y0,foot=ds.panel(W,H,"Pain · the modern model","Pain is biopsychosocial — not just damage",
        "Imaging findings often don't match the pain. Tissue is one input of three.","§Pain, Injury & Rehab","pain-biopsychosocial")
    s=[head]
    cx,cy,r=W/2,y0+ (H-150-y0)/2 +30,128
    circ=[(cx-70,cy-44,"#b5471f","BIO","tissue · nerves ·\nnociception"),
          (cx+70,cy-44,"#3a6ea5","PSYCHO","beliefs · fear ·\nmood · attention"),
          (cx,cy+72,"#1d6b2e","SOCIAL","work · stress ·\ncontext · support")]
    for x,y,c,lab,desc in circ:
        s.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{c}" fill-opacity="0.16" stroke="{c}" stroke-width="2.5"/>')
    for x,y,c,lab,desc in circ:
        lx = x + (-58 if lab=="BIO" else 58 if lab=="PSYCHO" else 0)   # push labels into single-circle regions
        ly = y-64 if lab!="SOCIAL" else y+40
        s.append(ds.text(lx,ly,lab,size=15,fill=c,font=ds.DISPLAY,weight="900",anchor="middle"))
        for k,ln in enumerate(desc.split("\n")): s.append(ds.text(lx,ly+18+k*14,ln,size=10,fill=ds.INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(cx,cy+6,"PAIN",size=14,fill=ds.INK2,font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(ds.text(W/2,H-58,"Why the best back-pain care is stay-active + education — not bed rest, scans, or most surgery.",size=11,fill=ds.INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/51-pain-biopsychosocial.png")

def innate_adaptive():
    W,H=1020,560
    head,y0,foot=ds.panel(W,H,"Immune system · the two arms","Innate vs adaptive immunity",
        "A fast generalist and a slow specialist — together, your defence in depth.","§Immune System","innate-vs-adaptive")
    s=[head]
    cols=[("INNATE","#b08d3a","fast (minutes–hours) · non-specific · no memory",
           ["Barriers: skin, mucus, acid","Neutrophils & macrophages (eat invaders)","NK cells (kill infected cells)","Complement & inflammation","The first responders"]),
          ("ADAPTIVE","#3a6ea5","slow (days) · highly specific · remembers",
           ["T cells (kill & coordinate)","B cells → antibodies","Immunological memory","The basis of vaccines","Wanes with age (immunosenescence)"])]
    cw=(W-70-40)/2
    for i,(t,c,sub,items) in enumerate(cols):
        x=40+i*(cw+30)
        s.append(f'<rect x="{x:.0f}" y="{y0+10}" width="{cw:.0f}" height="{H-y0-80:.0f}" rx="12" fill="{ds.CARD}" stroke="{c}" stroke-width="1.8"/>')
        s.append(f'<rect x="{x:.0f}" y="{y0+10}" width="{cw:.0f}" height="40" rx="0" fill="{c}"/>')
        s.append(ds.text(x+cw/2,y0+37,t,size=17,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
        s.append(ds.text(x+20,y0+70,sub,size=10.5,fill=ds.MUT,font=ds.BODY,italic=True))
        for k,it in enumerate(items):
            s.append(f'<circle cx="{x+26}" cy="{y0+98+k*34}" r="3.5" fill="{c}"/>'); s.append(ds.text(x+40,y0+102+k*34,it,size=12,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/52-innate-adaptive.png")

def cancer_screening_matrix():
    W,H=1020,430
    head,y0,foot=ds.panel(W,H,"Cancer · what actually saves lives","Screening that earns its place",
        "Only a few screens have mortality evidence. Match the test to your risk.","§Clinical Prevention","cancer-screening-grades")
    s=[head]
    for t,x in [("CANCER",40),("WHO / WHEN",250),("TEST",560),("EVIDENCE",820)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    rows=[("Colorectal","everyone 45–75","colonoscopy / FIT","STRONG","#1d6b2e"),
          ("Breast","women ~40–74","mammography","GOOD","#5e8a3a"),
          ("Cervical","women 21–65","HPV / Pap","STRONG","#1d6b2e"),
          ("Lung","heavy smokers 50–80","low-dose CT","STRONG (smokers)","#1d6b2e"),
          ("Prostate","shared decision 55–69","PSA","MIXED","#c08a1e"),
          ("Whole-body MRI","marketed to all","scan","UNPROVEN","#b5471f")]
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(c,who,test,ev,col) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,c,size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(250,yy+rh/2+4,who,size=10.5,fill=ds.INK,font=ds.BODY))
        s.append(ds.text(560,yy+rh/2+4,test,size=10.5,fill=ds.MUT,font=ds.BODY))
        b,_=ds.badge(820,yy+rh/2-9,ev,col,h=18,size=8.5); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/53-cancer-screening.png")

def gut_brain_axis():
    W,H=1020,470
    head,y0,foot=ds.panel(W,H,"Digestive · the gut-brain axis","The gut and brain talk both ways",
        "Real and important — but most consumer 'gut-brain' product claims run ahead of the evidence.","§Organ Systems / Microbiome","gut-brain-axis")
    s=[head, arrowdefs()]
    bx,by=170,y0+90; gx,gy=W-300,y0+90; r=58
    s.append(f'<circle cx="{bx}" cy="{by}" r="{r}" fill="#3a6ea5"/>'); s.append(ds.text(bx,by+5,"BRAIN",size=15,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(f'<circle cx="{gx}" cy="{gy}" r="{r}" fill="#8a6d12"/>'); s.append(ds.text(gx,gy+2,"GUT",size=15,fill="white",font=ds.DISPLAY,weight="900",anchor="middle")); s.append(ds.text(gx,gy+18,"microbiome",size=8.5,fill="#f3ead6",font=ds.BODY,anchor="middle"))
    paths=[("vagus nerve (fast signalling)",-46),("immune / inflammation",-16),("microbial metabolites (SCFAs)",14),("hormones & stress (HPA)",44)]
    for lab,off in paths:
        s.append(f'<line x1="{bx+r}" y1="{by+off}" x2="{gx-r}" y2="{gy+off}" stroke="{ds.GOLD_D}" stroke-width="1.6"/>')
        s.append(ds.text((bx+gx)/2,by+off-4,lab,size=10.5,fill=ds.INK,font=ds.BODY,anchor="middle"))
    s.append(arrow(bx+10,by+r+6,gx-10,gy+r+6,"#3a6ea5",2,"ab")); s.append(arrow(gx-10,gy+r+24,bx+10,by+r+24,"#8a6d12",2,"ah"))
    s.append(ds.text(W/2,by+r+50,"bidirectional — stress upsets the gut; the gut shapes mood & immunity",size=11,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/54-gut-brain-axis.png")

CHARTS=[grip_mortality,sleep_hypnogram,cortisol_rhythm,action_potential,vaccines_longevity,hrt_timing]
SVGS=[imaging_matrix,ckd_heatmap,pain_biopsychosocial,innate_adaptive,cancer_screening_matrix,gut_brain_axis]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
