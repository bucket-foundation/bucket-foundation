#!/usr/bin/env python3
"""FINAL SVG infographics (§02/§03/§29/§36/§45/§19/§28)."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker></defs>'
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sz=12.5):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    for j,ln in enumerate(label.split("\n")): s+=ds.text(x+w/2,y+h/2+5+(j-(len(label.split(chr(10)))-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def fr(k,t,sub,src,claim,W,H): return ds.panel(W,H,k,t,sub,src,claim)

# 1. min-effective-week calendar
def week_calendar():
    W,H=1000,480
    head,cy,foot=fr("Training · §02 §6","The minimum effective week","Three templates. Strength 2–4×, some Zone-2, daily walking, a little mobility. Consistency beats optimality.","§02 §6.4","min-effective-week",W,H)
    s=[head]; days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    rows=[("Beginner",["Full-body","Walk","Rest","Full-body","Walk","Zone-2","Rest"]),
          ("Intermediate",["Upper","Zone-2","Lower","Mobility","Upper","Zone-2 long","Rest"]),
          ("Advanced",["Push","Zone-2","Pull","Intervals","Legs","Zone-2 long","Mobility"])]
    cmap={"Rest":"#e7e0cd","Walk":"#cfe0c6","Zone-2":"#bcd3e0","Zone-2 long":"#a8c6da","Intervals":"#e6b89a","Mobility":"#e6d39a"}
    cw=112; x0=170
    for d,dx in zip(days,range(7)): s.append(ds.text(x0+dx*cw+cw/2,cy+8,d,size=10.5,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
    for ri,(name,cells) in enumerate(rows):
        yy=cy+22+ri*92
        s.append(ds.text(40,yy+40,name,size=12.5,fill=INK,font=ds.DISPLAY,weight="700"))
        for ci,c in enumerate(cells):
            col=cmap.get(c, "#cdbf9a" if c not in cmap else cmap[c]); col=cmap.get(c,"#d8c9a0")
            x=x0+ci*cw; s.append(f'<rect x="{x}" y="{yy+10}" width="{cw-8}" height="64" rx="7" fill="{col}" stroke="{GOLDD}" stroke-width="1"/>')
            for j,ln in enumerate(c.split(" ")): s.append(ds.text(x+(cw-8)/2,yy+36+j*14,ln,size=10,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F01-week-calendar.png")

# 2. RPE/RIR scale
def rpe():
    W,H=1000,560
    head,cy,foot=fr("Training · §02 §6.3","RPE & RIR — autoregulate your effort","Rate of perceived exertion (RPE) maps to reps-in-reserve (RIR). Most productive training lives at RPE 7–8 (2–3 RIR).","§02 §6.3","rpe-rir-scale",W,H)
    s=[head]; rows=[(10,"0 RIR","maximal — nothing left",WARN),(9,"1 RIR","very hard",WARN),(8,"2 RIR","hard — productive",GRN),(7,"3 RIR","challenging — productive",GRN),(6,"4 RIR","moderate",AMB),(5,"5+ RIR","easy / warm-up",MUT)]
    x0=120; bw=720
    for i,(rpe_,rir,feel,c) in enumerate(rows):
        yy=cy+10+i*60; hi = c==GRN
        s.append(f'<rect x="{x0}" y="{yy}" width="{bw}" height="50" rx="9" fill="{c}" opacity="{0.2 if hi else 0.1}" stroke="{c}" stroke-width="{2.5 if hi else 1.5}"/>')
        s.append(ds.text(x0+30,yy+32,f"RPE {rpe_}",size=15,fill=c,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x0+150,yy+32,rir,size=13,fill=INK,font=ds.DISPLAY,weight="700"))
        s.append(ds.text(x0+290,yy+32,feel,size=12.5,fill=INK,font=ds.BODY))
        if hi: s.append(ds.text(x0+bw-16,yy+32,"← default",size=12,fill=GRN,font=ds.DISPLAY,weight="bold",anchor="end"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F02-rpe-rir.png")

# 3. dietary-pattern rings
def dietary():
    W,H=1000,540
    head,cy,foot=fr("Nutrition · §03 §3","The habits every good diet shares","Every evidence-based diet converges on the same five habits. The label matters far less than the overlap.","§03 §3","dietary-pattern",W,H)
    cx,cyh=W/2,cy+165; s=[head]
    rings=[("Whole, minimally\nprocessed foods",-150,-70,GRN),("Fiber-rich\n(plants)",150,-70,GRN2),("Adequate\nprotein",-200,70,AMB),("Mostly unsaturated\nfats",200,70,BLUE),("Low added\nsugar",0,150,GOLDD)]
    for lab,dx,dy,c in rings:
        x,y=cx+dx,cyh+dy; s.append(f'<circle cx="{x}" cy="{y}" r="58" fill="{c}" opacity="0.13" stroke="{c}" stroke-width="2"/>')
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y-2+j*14,ln,size=10.5,fill=INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(f'<circle cx="{cx}" cy="{cyh}" r="46" fill="{GRN}"/>')
    s.append(ds.text(cx,cyh-2,"THE",size=12,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cx,cyh+15,"PATTERN",size=12,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F03-dietary-pattern.png")

# 4. fasting exclusion panel
def exclusion():
    W,H=1000,480
    head,cy,foot=fr("Fasting · §36 §7","Who should NOT fast","For these groups, fasting ranges from risky to dangerous. Medical supervision required — or don't.","§36 §7","fasting-exclusions",W,H)
    s=[head]; items=["Type 1 / type 2 diabetes on glucose-lowering meds","Pregnancy or breastfeeding","History of an eating disorder","Underweight or frail / elderly","Children & adolescents","Narrow-therapeutic-index meds (timing-critical)","Advanced kidney or liver disease","Gout (flare risk)"]
    for i,t in enumerate(items):
        col=i%2; row=i//2; x=60+col*460; yy=cy+20+row*78
        s.append(f'<rect x="{x}" y="{yy}" width="430" height="62" rx="9" fill="#f6ece6" stroke="{WARN}" stroke-width="1.6"/>')
        s.append(f'<circle cx="{x+30}" cy="{yy+31}" r="14" fill="{WARN}"/>'+ds.text(x+30,yy+37,"✕",size=15,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
        for j,ln in enumerate(_wrap(t,42)): s.append(ds.text(x+54,yy+26+j*16,ln,size=11.5,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/F04-fasting-exclusions.png")
def _wrap(t,n):
    w=t.split(); r=[]; line=""
    for x in w:
        if len(line)+len(x)+1<=n: line=(line+" "+x).strip()
        else: r.append(line); line=x
    if line: r.append(line)
    return r

# 5. refeeding flow
def refeeding():
    W,H=1000,380
    head,cy,foot=fr("Fasting · §36 §2.4","Refeeding syndrome — the danger after a long fast","Breaking a prolonged fast with a carb load can be lethal. Go slow, supplement, and monitor.","§36 §2.4","refeeding-syndrome",W,H)
    s=[head,ARROW]; steps=[("Prolonged\nfast",AMB),("Refeed carbs\n→ insulin spike",WARN),("Cells pull in\nPO₄ / K / Mg",WARN),("Low phosphate\n→ arrhythmia, seizure",DKR)]
    n=4; bw=180; gap=((W-80)-n*bw)/(n-1)
    for i,(lab,c) in enumerate(steps):
        x=40+i*(bw+gap); s.append(box(x,cy+30,bw,68,lab,stroke=c,tcol=(c if c in (WARN,DKR) else INK)))
        if i<n-1: s.append(f'<line x1="{x+bw}" y1="{cy+64}" x2="{x+bw+gap-4}" y2="{cy+64}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    s.append(f'<rect x="40" y="{cy+128}" width="{W-80}" height="40" rx="9" fill="#eef4ec" stroke="{GRN}" stroke-width="2"/>')
    s.append(ds.text(W/2,cy+152,"Mitigation: reintroduce calories SLOWLY · give thiamine · monitor & replace electrolytes",size=11.5,fill=GRN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F05-refeeding.png")

# 6. pop-psych debunks
def debunks():
    W,H=1000,450
    head,cy,foot=fr("Behavior Change · §29 §8","Pop-psychology that doesn't hold up","Popular, sticky, and wrong. Don't build your system on these.","§29 §8","pop-psych-debunks",W,H)
    s=[head]; myths=["“21 days to form a habit”","“Willpower is a muscle that depletes” (ego depletion)","“Dopamine detox” resets your brain","“Learning styles” (visual/auditory) improve learning","“Manifestation” changes outcomes"]
    for i,m in enumerate(myths):
        yy=cy+24+i*54
        s.append(f'<rect x="60" y="{yy}" width="{W-120}" height="42" rx="9" fill="#f6ece6" stroke="{WARN}" stroke-width="1.4"/>')
        s.append(ds.text(86,yy+27,m,size=13,fill=MUT,font=ds.BODY,italic=True))
        s.append(f'<line x1="80" y1="{yy+21}" x2="{W-160}" y2="{yy+21}" stroke="{WARN}" stroke-width="2.4"/>')
        s.append(ds.text(W-78,yy+27,"✕",size=16,fill=WARN,font=ds.DISPLAY,weight="bold",anchor="end"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F06-debunks.png")

# 7. implementation intention
def if_then():
    W,H=1000,360
    head,cy,foot=fr("Behavior Change · §29 §2.2","Implementation intentions — weld the habit to a cue","Don't rely on remembering. Tie the new behavior to something that already happens every day.","§29 §2.2","implementation-intention",W,H)
    s=[head,ARROW]
    s.append(box(70,cy+30,400,80,"",stroke=BLUE))
    s.append(ds.text(90,cy+58,"IF",size=20,fill=BLUE,font=ds.DISPLAY,weight="800"))
    s.append(ds.text(150,cy+58,"(existing cue)",size=11,fill=MUT,font=ds.BODY,italic=True))
    s.append(ds.text(150,cy+84,"my 7am coffee is poured",size=13.5,fill=INK,font=ds.BODY,weight="600"))
    s.append(f'<line x1="480" y1="{cy+70}" x2="528" y2="{cy+70}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    s.append(box(540,cy+30,400,80,"",stroke=GRN))
    s.append(ds.text(560,cy+58,"THEN",size=20,fill=GRN,font=ds.DISPLAY,weight="800"))
    s.append(ds.text(650,cy+58,"(tiny action)",size=11,fill=MUT,font=ds.BODY,italic=True))
    s.append(ds.text(650,cy+84,"I put my running shoes on",size=13.5,fill=INK,font=ds.BODY,weight="600"))
    s.append(ds.text(W/2,cy+150,"Specific cue + specific action + same place each time = the habit installs itself.",size=11.5,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F07-if-then.png")

# 8. head-trauma axis
def head_trauma():
    W,H=1000,310
    head,cy,foot=fr("Sports & Play · §45 §5","Combat sports — it's about head-impact dose","The risk isn't the sport; it's repetitive head impacts. Grappling carries little; repeated striking drives CTE.","§45 §5","head-trauma-axis",W,H)
    s=[head]; x0=80; x1=W-80; y=cy+80
    s.append(f'<rect x="{x0}" y="{y-14}" width="{x1-x0}" height="28" rx="14" fill="url(#ht)"/>')
    s.append(f'<defs><linearGradient id="ht" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{GRN}" stop-opacity="0.35"/><stop offset="1" stop-color="{WARN}" stop-opacity="0.55"/></linearGradient></defs>')
    pts=[("BJJ / judo / wrestling","no head strikes",GRN,0.0),("Boxing / MMA (light spar)","some impacts",AMB,0.55),("Heavy sparring / pro fights","repetitive impacts → CTE",WARN,1.0)]
    for lab,sub,c,f_ in pts:
        x=x0+(x1-x0)*f_; s.append(f'<circle cx="{x}" cy="{y}" r="8" fill="{c}"/>')
        anc="start" if f_<0.1 else "end" if f_>0.9 else "middle"
        s.append(ds.text(x,y+34,lab,size=12.5,fill=c,font=ds.DISPLAY,weight="700",anchor=anc))
        s.append(ds.text(x,y+52,sub,size=10.5,fill=MUT,font=ds.BODY,anchor=anc))
    s.append(ds.text(W/2,y-32,"keep the sport — manage the head-impact dose",size=11.5,fill=INK,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/F08-head-trauma.png")

# 9. deprescribing
def deprescribe():
    W,H=1000,360
    head,cy,foot=fr("Life Stages · §19 §7.3","In old age, the lever is often SUBTRACTION","More drugs spawn more drugs (the prescribing cascade). Deprescribing is real medicine.","§19 §7.3","deprescribing",W,H)
    s=[head,ARROW]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,46,"PRESCRIBING CASCADE",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Drug A → side effect","→ Drug B to treat it","→ side effect → Drug C…","polypharmacy, falls, confusion"]):
        s.append(ds.text(74,cy+98+i*30,t,size=12.5,fill=INK,font=ds.BODY))
    s.append(box(W-440,cy+20,380,46,"DEPRESCRIBING",fill="#eef4ec",stroke=GRN,tcol=GRN))
    for i,t in enumerate(["Review every medication's purpose","Stop what no longer helps","Use STOPP/START + Beers criteria","Fewer drugs, fewer harms"]):
        s.append(ds.text(W-426,cy+98+i*30,t,size=12.5,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/F09-deprescribing.png")

# 10. placebo / nocebo
def placebo_nocebo():
    W,H=1000,340
    head,cy,foot=fr("Pharmacology · §28 Part E","Placebo & nocebo — your expectations are pharmacology","Belief releases real endogenous chemistry. It cuts both ways: hope can heal symptoms; fear can cause them.","§28 Part E","placebo-nocebo",W,H)
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,46,"PLACEBO (positive)",fill="#eef4ec",stroke=GRN,tcol=GRN))
    for i,t in enumerate(["Expectation → endogenous opioids/dopamine","Naloxone can BLOCK placebo analgesia","Ritual has a dose-response"]):
        s.append(ds.text(74,cy+100+i*30,"• "+t,size=12,fill=INK,font=ds.BODY))
    s.append(box(W-440,cy+20,380,46,"NOCEBO (negative)",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Negative expectation → real symptoms","~⅔ of statin 'side effects' on placebo (SAMSON)","Warnings can manufacture the harm"]):
        s.append(ds.text(W-426,cy+100+i*30,"• "+t,size=12,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/F10-placebo-nocebo.png")

if __name__=="__main__":
    for fn in [week_calendar,rpe,dietary,exclusion,refeeding,debunks,if_then,head_trauma,deprescribe,placebo_nocebo]:
        fn(); print(fn.__name__,"ok")
