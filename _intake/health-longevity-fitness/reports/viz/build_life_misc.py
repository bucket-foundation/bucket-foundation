#!/usr/bin/env python3
"""LIFESTYLE matrices + infographics (§03/§36/§33/§19/§05/§29/§09/§44)."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
C={"real":GRN,"context":AMB,"hype":WARN,"harm":DKR,"mod":GRN2,"early":AMB,"risky":WARN,"pseudo":DKR,"mixed":AMB}
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker></defs>'
def matrix(name,k,t,sub,src,claim,headers,rows,xs,badge=True):
    W=1000; H=92+len(rows)*42+64
    head,y0,foot=ds.panel(W,H,k,t,sub,src,claim); s=[head]
    for h,x in zip(headers,xs): s.append(ds.text(x,y0+2,h,size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    ry=y0+16; rh=(H-58-ry)/len(rows)
    for i,row in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        *cols,last=row
        for j,(c,x) in enumerate(zip(cols,xs)):
            s.append(ds.text(x,yy+rh/2+4,c,size=(11.6 if j==0 else 10.3),fill=INK,font=ds.BODY,weight=("700" if j==0 else None)))
        if badge:
            l2,col=last; b,_=ds.badge(xs[-1],yy+rh/2-9,l2,col,h=17,size=8.0); s.append(b)
        else: s.append(ds.text(xs[-1],yy+rh/2+4,last,size=10.3,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/{name}")
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sz=12.5):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    for j,ln in enumerate(label.split("\n")): s+=ds.text(x+w/2,y+h/2+5+(j-(len(label.split(chr(10)))-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s

# 1. supplement traffic light
matrix("N01-supplements.png","Nutrition · §03","Supplements — the honest traffic light",
  "A few earn their place; most are context-dependent or hype. Food first, then fill real gaps.","§03 §1","supplement-traffic-light",
  ["SUPPLEMENT","WHAT IT ACTUALLY DOES","GRADE"],
  [("Creatine","strength, power, maybe cognition",("REAL",C["real"])),
   ("Caffeine","performance, alertness",("REAL",C["real"])),
   ("Protein powder","convenience to hit your target",("REAL (food)",C["real"])),
   ("Vitamin D / omega-3 (if low)","corrects a deficiency",("CONTEXT",C["context"])),
   ("Magnesium / iron (if low)","fixes a measured shortfall",("CONTEXT",C["context"])),
   ("Melatonin","jet lag, sleep onset (low dose)",("REAL (modest)",C["mod"])),
   ("Multivitamin","little benefit if you eat well",("HYPE",C["hype"])),
   ("BCAAs / greens powders","redundant; eat protein & veg",("HYPE",C["hype"])),
   ("'Testosterone boosters' / NMN","no human outcome",("HYPE",C["hype"])),
   ("Antioxidant megadoses","can blunt training adaptation",("CAN HARM",C["harm"]))],
  [40,360,850])

# 2. fasting protocol verdicts
matrix("N02-fasting-protocols.png","Fasting · §36","Fasting & cleanse protocols — graded",
  "Mild intermittent fasting is reasonable for some; the 'cleanse' end of the menu is pseudoscience, occasionally harmful.","§36 §8","fasting-protocol-verdicts",
  ["PROTOCOL","THE CLAIM","VERDICT"],
  [("16:8 time-restricted eating","weight, metabolic health",("MODERATE",C["mod"])),
   ("5:2 / alternate-day fasting","weight loss",("MODERATE",C["mod"])),
   ("24–48 h fasts (occasional)","autophagy, metabolic reset",("EARLY / CAUTION",C["early"])),
   ("Prolonged fasts (5 d+)","longevity",("RISKY — supervise",C["risky"])),
   ("Extended water fasting","detox / cure",("RISKY",C["risky"])),
   ("Dry fasting","'superior' results",("HARMFUL",C["harm"])),
   ("Juice / 'master' cleanse","detox the body",("PSEUDOSCIENCE",C["pseudo"])),
   ("Liver flush / colon cleanse","flush out toxins/'stones'",("PSEUDOSCIENCE",C["pseudo"]))],
  [40,360,850])

# 3. environmental toxin tiering
matrix("N03-toxin-tiering.png","Exposures · §09 §4","Environmental 'toxins' — by evidence weight",
  "Worry in proportion to the evidence. The shared, boring lever beats most boutique fears: filter your water.","§09 §4","toxin-tiering",
  ["EXPOSURE","EVIDENCE","STATUS"],
  [("Lead","established, large harm; no safe level",("ESTABLISHED",C["harm"])),
   ("Air pollution (PM2.5)","strong; cardiopulmonary + cancer",("ESTABLISHED",C["harm"])),
   ("PFAS 'forever chemicals'","regulatory action; real concern",("REGULATORY",C["risky"])),
   ("BPA / phthalates","plausible endocrine disruptors",("PLAUSIBLE",C["early"])),
   ("Microplastics","ubiquitous; health effect unproven",("EMERGING",C["early"])),
   ("Most 'detox' product claims","no mechanism, no benefit",("HYPE",C["hype"]))],
  [40,360,850])

# 4. recovery lever map
matrix("N04-recovery-levers.png","Recovery · §05 §6","The recovery pillar — highest-leverage moves",
  "Sleep is the master lever; the rest help at the margin. Match effort to the size of the effect.","§05 §6","recovery-lever-map",
  ["LEVER","HIGHEST-LEVERAGE MOVE","CEILING"],
  [("Sleep","7–9 h, regular schedule, dark & cool",("LARGE",C["real"])),
   ("Stress / nervous system","down-regulate daily (breath, nature)",("LARGE",C["real"])),
   ("Social connection","invest in relationships",("LARGE",C["real"])),
   ("Sauna (if available)","4–7×/wk, traditional heat",("MODERATE",C["mod"])),
   ("Cold exposure","mood/discipline; minor metabolic",("SMALL",C["context"])),
   ("Massage / passive tools","feels good; minor recovery",("SMALL",C["context"]))],
  [40,360,850])

def frame(k,t,sub,src,claim,W,H): return ds.panel(W,H,k,t,sub,src,claim)

# 5. Frieden health-impact pyramid
def pyramid():
    W,H=1000,546
    head,cy,foot=frame("Public Health · §33 §3.3","The Health Impact Pyramid","Base tiers reach everyone and need no individual effort; the apex (what the wellness industry sells) helps the fewest.","§33 §3.3","health-impact-pyramid",W,H)
    s=[head]; tiers=[("Socioeconomic factors (poverty, education)","largest impact",GRN,0),
        ("Changing the context (clean water, safe food, smoke-free)","",GRN2,1),
        ("Long-lasting protective interventions (vaccines, screening)","",AMB,2),
        ("Clinical interventions (treat the sick)","",GOLD,3),
        ("Counseling & education","smallest impact — most effort",WARN,4)]
    cx=W/2; topw=200; basew=820; htier=64
    for lab,note,c,i in tiers:
        w=basew-(basew-topw)*((4-i)/4); y=cy+10+i*htier
        s.append(f'<rect x="{cx-w/2}" y="{y}" width="{w}" height="{htier-8}" rx="6" fill="{c}" opacity="0.85"/>')
        s.append(ds.text(cx,y+(htier-8)/2+5,lab,size=12.5,fill="#fff",font=ds.DISPLAY,weight="700",anchor="middle"))
        if note: s.append(ds.text(cx+w/2+10,y+(htier-8)/2+4,note,size=10,fill=c,font=ds.BODY,italic=True,anchor="start"))
    s.append(foot); ds.render("".join(s),f"{FIG}/N05-health-pyramid.png")

# 6. Fried frailty pentagon
def frailty():
    W,H=1000,500
    head,cy,foot=frame("Life Stages · §19 §4","The Fried frailty phenotype","Five measurable criteria. Meeting ≥3 = frail; 1–2 = pre-frail; 0 = robust. It predicts falls, hospitalization, and death.","§19 §4","frailty-pentagon",W,H)
    cx,cyh=W/2,cy+165; r=120; s=[head]
    crit=["Unintentional\nweight loss","Exhaustion","Weakness\n(low grip)","Slow gait\nspeed","Low physical\nactivity"]
    pts=[]
    for i in range(5):
        a=-math.pi/2+i*2*math.pi/5; x=cx+r*math.cos(a); y=cyh+r*math.sin(a); pts.append((x,y))
    s.append('<polygon points="'+" ".join(f"{x:.0f},{y:.0f}" for x,y in pts)+f'" fill="{GOLD}" opacity="0.10" stroke="{GOLDD}" stroke-width="2"/>')
    for (x,y),lab in zip(pts,crit):
        s.append(f'<circle cx="{x}" cy="{y}" r="9" fill="{WARN}"/>')
        dx=(x-cx); ax_="middle";
        ly=y+(-26 if y<cyh-10 else 30 if y>cyh+10 else 6)
        lx=x+(0 if abs(dx)<30 else (60 if dx>0 else -60))
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(lx,ly+j*14,ln,size=11,fill=INK,font=ds.BODY,weight="600",anchor=("start" if dx>30 else "end" if dx<-30 else "middle")))
    s.append(f'<circle cx="{cx}" cy="{cyh}" r="44" fill="{WARN}"/>')
    s.append(ds.text(cx,cyh-4,"≥3 = FRAIL",size=12,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cx,cyh+14,"1–2 pre-frail",size=10,fill="#fff",font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/N06-frailty-pentagon.png")

# 7. circadian dial
def circadian():
    W,H=1000,548
    head,cy,foot=frame("Sleep · §05 §2","The circadian light dial","Bright light in the morning anchors your clock; dim, warm light at night protects sleep. Light is the master timekeeper.","§05 §2","circadian-light-timing",W,H)
    cx,cyh=W/2,cy+175; r=130; s=[head]
    s.append(f'<circle cx="{cx}" cy="{cyh}" r="{r}" fill="none" stroke="{RULE}" stroke-width="2"/>')
    # morning arc (gold), evening arc (blue)
    s.append(f'<path d="M{cx} {cyh-r} A {r} {r} 0 0 1 {cx+r} {cyh}" fill="none" stroke="{GOLD}" stroke-width="14"/>')
    s.append(f'<path d="M{cx} {cyh+r} A {r} {r} 0 0 1 {cx-r} {cyh}" fill="none" stroke="{BLUE}" stroke-width="14"/>')
    for h_,lab in [(0,"midnight"),(6,"6am"),(12,"noon"),(18,"6pm")]:
        a=-math.pi/2+h_/12*math.pi; x=cx+(r+4)*math.cos(a); y=cyh+(r+4)*math.sin(a)
        s.append(ds.text(x+(18 if math.cos(a)>0.3 else -18 if math.cos(a)<-0.3 else 0),y+(16 if math.sin(a)>0.3 else -8 if math.sin(a)<-0.3 else 4),lab,size=10.5,fill=MUT,font=ds.BODY,anchor=("start" if math.cos(a)>0.3 else "end" if math.cos(a)<-0.3 else "middle")))
    s.append(ds.text(cx+r+24,cyh-r+30,"AM: get bright\noutdoor light",size=11.5,fill=GOLDD,font=ds.BODY,weight="600"))
    s.append(ds.text(cx-r-24,cyh+r-20,"PM: dim, warm light;\navoid bright screens",size=11.5,fill=BLUE,font=ds.BODY,weight="600",anchor="end"))
    s.append(ds.text(cx,cyh,"SCN",size=14,fill=INK,font=ds.DISPLAY,weight="800",anchor="middle"))
    s.append(ds.text(cx,cyh+18,"master clock",size=9.5,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/N07-circadian-dial.png")

# 8. COM-B
def comb():
    W,H=1000,360
    head,cy,foot=frame("Behavior Change · §29","COM-B — diagnose the missing ingredient","Behavior needs all three: Capability, Opportunity, Motivation. When a habit won't stick, find which one is missing — don't just add willpower.","§29 §3","com-b",W,H)
    s=[head,ARROW]
    cols3=[("Capability","can you do it?",GRN),("Opportunity","does the world allow it?",BLUE),("Motivation","do you want to, now?",AMB)]
    for i,(lab,sub,c) in enumerate(cols3):
        x=60+i*215
        s.append(box(x,cy+30,196,84,"",stroke=c))
        s.append(ds.text(x+98,cy+66,lab,size=15,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x+98,cy+90,sub,size=10.5,fill=MUT,font=ds.BODY,anchor="middle"))
        if i<2: s.append(ds.text(x+205,cy+78,"+",size=22,fill=INK,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(f'<line x1="705" y1="{cy+72}" x2="775" y2="{cy+72}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    s.append(box(782,cy+34,176,76,"BEHAVIOR",fill="#eef4ec",stroke=GRN,tcol=GRN,sz=16))
    s.append(ds.text(W/2,cy+160,"Habit won't stick? Find the missing one — teach the skill, change the environment, or make it attractive.",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/N08-com-b.png")

# helper two-column
def two_col(name,k,t,sub,src,claim,left_h,left,right_h,right,lc=GRN,rc=WARN,note=None,W=1000,H=None):
    import textwrap as _tw
    subln=len(_tw.wrap(sub,max(24,int((W-56)/(12.5*0.512))))) if sub else 0
    cyv=119+19*max(0,subln); maxn=max(len(left),len(right))
    last=cyv+104+(maxn-1)*30
    note_y=last+32
    H=(note_y+18 if note else last+18)+48
    head,cy,foot=frame(k,t,sub,src,claim,W,H); s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-46}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,50,left_h,fill="#eef4ec" if lc==GRN else "#f6ece6",stroke=lc,tcol=lc))
    for i,x in enumerate(left): s.append(ds.text(74,cy+104+i*30,"• "+x,size=12.5,fill=INK,font=ds.BODY))
    s.append(box(W-440,cy+20,380,50,right_h,fill="#f6ece6",stroke=rc,tcol=rc))
    for i,x in enumerate(right): s.append(ds.text(W-426,cy+104+i*30,"• "+x,size=12.5,fill=INK,font=ds.BODY))
    if note: s.append(ds.text(W/2,note_y,note,size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/{name}")

def sun_ledger():
    two_col("N09-sun-ledger.png","Exposures · §09 §5","The sun — a two-sided ledger",
        "UV ages skin and causes cancer; yet sun AVOIDANCE tracks with smoking-level mortality. The verdict: avoid burns while still getting daylight.","§09 §5","sun-ledger",
        "THE COST (UV)",["Skin cancer (incl. melanoma)","Photoaging, wrinkles","→ sunscreen + shade at midday"],
        "THE OTHER SIDE",["Sun avoidance ≈ smoking-level mortality (MISS)","Vitamin D, mood, circadian anchoring","→ regular, non-burning daylight"],
        lc=WARN,rc=GRN2,note="Avoid burns and tanning beds while still enjoying the outdoors.")

def machines_free():
    two_col("N10-machines-free.png","Modalities · §44 §4","Machines vs free weights — both, for most",
        "Neither is 'better'; they trade off stability for skill. The best choice is the one you'll do consistently and safely.","§44 §4","machines-vs-free",
        "FREE WEIGHTS",["More stabilizer & coordination demand","Better real-world carryover","Higher skill / form requirement"],
        "MACHINES",["Safer to push near failure alone","Easy to learn; good for isolation","Less carryover to real movement"],
        lc=GRN,rc=BLUE,note="Most people should use BOTH — pick what you'll actually train.")

def cold_dose():
    two_col("N11-cold-dose.png","Recovery · §05 §3","Cold: the dose sold ≠ the dose studied",
        "The metabolic data come from long, mild cold acclimation — a different protocol from the marketed 3-minute plunge.","§05 §3","cold-dose-sold",
        "WHAT WAS STUDIED",["Hours of MILD cold acclimation","Improved insulin sensitivity, brown fat","Gradual, repeated exposure"],
        "WHAT'S SOLD",["3-minute ice plunge","Mood / discipline / 'inflammation'","Acute, brief, intense"],
        lc=GRN,rc=AMB,note="The plunge may help mood & discipline — just not via the metabolism studies it borrows.")

# 12. Lifespan timeline
def lifespan():
    W,H=1000,360
    head,cy,foot=frame("Life Stages · §19","One life, stage by stage","What matters shifts across the lifespan — build early, defend in midlife, preserve function late.","§19 §10","lifespan-timeline",W,H)
    s=[head,ARROW]; x0=60; x1=W-60; y=cy+86
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    pts=[(0.03,"First 1,000 days","nutrition & development",GRN),(0.26,"Childhood–20s","BUILD peak capacity",GRN2),
         (0.5,"Adulthood","DEFEND (apoB, BP, glucose)",AMB),(0.72,"Midlife","inflections, screening",GOLD),(0.93,"65+ / geriatric","PRESERVE function, deprescribe",WARN)]
    for f_,t,lab,c in pts:
        x=x0+(x1-x0)*f_; s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="{c}"/>')
        s.append(ds.text(x,y-16,t,size=12,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x,y+26,lab,size=10,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/N12-lifespan-timeline.png")

if __name__=="__main__":
    for fn in [pyramid,frailty,circadian,comb,sun_ledger,machines_free,cold_dose,lifespan]:
        fn(); print(fn.__name__,"ok")
    print("matrices N01-N04 + infographics N05-N12 done")
