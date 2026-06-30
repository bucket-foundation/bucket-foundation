#!/usr/bin/env python3
"""DRUGS/SURGERY/ANESTHESIA/REGEN/CAM — matrices + infographics."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
C={"trans":GRN,"eff":GRN2,"oversold":AMB,"debunk":WARN,"proven":GRN,"emerg":AMB,"exp":AMB,"story":WARN,"none":DKR}
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker><marker id="wn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker></defs>'
def matrix(name,k,t,sub,src,claim,headers,rows,xs,badge=True):
    W=1000; H=92+len(rows)*46+64
    head,y0,foot=ds.panel(W,H,k,t,sub,src,claim); s=[head]
    for h,x in zip(headers,xs): s.append(ds.text(x,y0+2,h,size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,row in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        *cols,last=row
        for j,(c,x) in enumerate(zip(cols,xs)):
            s.append(ds.text(x,yy+rh/2+4,c,size=(12 if j==0 else 10.4),fill=INK,font=ds.BODY,weight=("700" if j==0 else None)))
        if badge:
            l2,col=last; b,_=ds.badge(xs[-1],yy+rh/2-9,l2,col,h=18,size=8.2); s.append(b)
        else: s.append(ds.text(xs[-1],yy+rh/2+4,last,size=10.4,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/{name}")
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sz=12.5):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    for j,ln in enumerate(label.split("\n")): s+=ds.text(x+w/2,y+h/2+5+(j-(len(label.split(chr(10)))-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def harrow(x0,x1,y,c="bk"): return f'<line x1="{x0}" y1="{y}" x2="{x1-4}" y2="{y}" stroke="{"#1c1a17" if c=="bk" else "#b5471f"}" stroke-width="3" marker-end="url(#{c})"/>'

# ---- matrices ----
matrix("R01-surgery-verdict.png","Surgery · §38","Operations, honestly graded",
  "Some surgery is among medicine's best treatments; some famous procedures match a sham. The verdict is the point.","§38 §0","surgery-verdict-map",
  ["OPERATION","BEST EVIDENCE","VERDICT"],
  [("Cataract surgery","restores vision, fast",("TRANSFORMATIVE",C["trans"])),
   ("Hip / knee replacement","RCT; huge quality-of-life gain",("GENUINELY EFFECTIVE",C["eff"])),
   ("Bariatric surgery","STAMPEDE; durable remission",("GENUINELY EFFECTIVE",C["eff"])),
   ("Spinal fusion for back pain","weak vs conservative care",("OVER-SOLD",C["oversold"])),
   ("Robotic (most indications)","equivalent outcomes, pricier",("OVER-SOLD",C["oversold"])),
   ("Knee arthroscopy (OA/meniscus)","= sham (Moseley, FIDELITY)",("DEBUNKED",C["debunk"])),
   ("Vertebroplasty","= sham (Buchbinder/Kallmes)",("DEBUNKED",C["debunk"])),
   ("PCI for stable angina","= sham (ORBITA)",("DEBUNKED",C["debunk"]))],
  [40,420,850])

matrix("R02-anesthesia-types.png","Anesthesia · §39 §2.1","Types of anesthesia",
  "Anesthesia is a spectrum from numbing a patch of skin to switching off the whole brain.","§39 §2.1","anesthesia-types",
  ["TYPE","WHAT'S SWITCHED OFF","HOW GIVEN","TYPICAL USE"],
  [("General","consciousness + whole body","IV + inhaled agents","major surgery"),
   ("Spinal","lower body (single shot)","injection into spinal fluid","C-section, lower-limb"),
   ("Epidural","a region (titratable catheter)","epidural space","labor, post-op pain"),
   ("Nerve block","one limb / region","local around a nerve","limb surgery"),
   ("Local","a small area","infiltration","skin, dental"),
   ("Sedation","awareness dialed down","IV titration","scopes, minor procedures")],
  [40,250,560,800],badge=False)

matrix("R03-icu-support.png","Critical Care · §39 §5","The ICU substitutes for failing organs",
  "Each support buys time for the body to recover — it doesn't cure the underlying problem.","§39 §5","icu-organ-substitution",
  ["FAILING ORGAN","THE SUPPORT","WHAT IT HONESTLY DOES"],
  [("Lungs","ventilator / ECMO","oxygenate; buy time to heal"),
   ("Circulation","vasopressors / inotropes","hold up blood pressure"),
   ("Kidneys","dialysis / CRRT","filter the blood; replace function"),
   ("Brain (raised pressure)","sedation, drainage","protect; lower pressure"),
   ("Metabolic balance","nutrition, glucose control","maintain homeostasis"),
   ("Multiple systems","the ICU itself","support while the body recovers — or doesn't")],
  [40,330,640],badge=False)

matrix("R04-regen-ladder.png","Regenerative · §31 §1","Regenerative medicine — by evidence stage",
  "A few interventions clear the bar of approved human outcomes; many below are a story you pay for.","§31 §1","regen-evidence-ladder",
  ["INTERVENTION","BEST EVIDENCE STAGE","STATUS"],
  [("Approved gene therapies","regulator-approved outcomes",("PROVEN",C["proven"])),
   ("Stem-cell transplant (blood cancers)","decades of outcomes",("PROVEN",C["proven"])),
   ("CAR-T (some cancers)","RCT / approval",("PROVEN",C["proven"])),
   ("Engineered skin / cartilage (select)","clinical use",("EMERGING",C["emerg"])),
   ("Senolytics","animal + early human",("EXPERIMENTAL",C["exp"])),
   ("'Stem-cell' clinic infusions","anecdote / none",("PAYING FOR A STORY",C["story"])),
   ("Young-plasma 'reversal' infusions","no human outcome",("NO EVIDENCE",C["none"]))],
  [40,400,850])

# ---- infographics ----
def laundering():
    W,H=1000,440
    head,cy,foot=ds.panel(W,H,"Biohacking · §32 §10","The laundering gap — how a real mechanism becomes a false promise",
        "A true cell/animal finding gets 'laundered' into a human outcome it never earned. Spot the jump.","§32 §10","laundering-gap")
    s=[head,ARROW]
    s.append(box(50,cy+10,250,60,"Real mechanism\n(cell / mouse)",stroke=GRN))
    s.append(harrow(300,390,cy+40))
    s.append(box(390,cy+10,220,60,"LAUNDER",fill="#f6ece6",stroke=WARN,tcol=WARN,sz=15))
    s.append(harrow(610,700,cy+40))
    s.append(box(700,cy+10,250,60,"Sold as a human\noutcome",stroke=WARN,tcol=WARN))
    s.append(ds.text(W/2,cy+108,"worked examples",size=11,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
    ex=[("BPC-157 heals rat tendon","→","'heals your injuries' (no human trials)"),
        ("HBOT lengthened telomeres (n=35)","→","'reverses aging'"),
        ("NAD+ rises with supplements","→","'recharge your cells / more energy'")]
    yy=cy+136
    for a,arr,b in ex:
        s.append(ds.text(70,yy,a,size=12,fill=INK,font=ds.BODY))
        s.append(ds.text(545,yy,arr,size=12,fill=WARN,font=ds.DISPLAY,weight="bold",anchor="middle"))
        s.append(ds.text(580,yy,b,size=12,fill=WARN,font=ds.BODY,italic=True)); yy+=38
    s.append(foot); ds.render("".join(s),f"{FIG}/R05-laundering-gap.png")

def four_beat():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Regenerative · §31 §0","The four-beat pattern of every 'frontier' field",
        "It almost always runs the same way — and the clinic sells you the gap between beats 2 and 4.","§31 §0","four-beat-structure")
    s=[head,ARROW]
    beats=[("1 · Striking\nbiology",GRN),("2 · Spectacular\nmouse result",GRN2),("3 · Brutal\ntranslation gap",AMB),("4 · Predatory clinic\nfills the gap",WARN)]
    bw=200; gap=((W-80)-4*bw)/3
    for i,(lab,c) in enumerate(beats):
        x=40+i*(bw+gap); s.append(box(x,cy+34,bw,74,lab,stroke=c,tcol=c))
        if i<3: s.append(harrow(x+bw,x+bw+gap,cy+71))
    s.append(ds.text(W/2,cy+150,"“The clinic shows you the Nobel Prize, then sells you the infusion.”",size=12.5,fill=WARN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/R06-four-beat.png")

def anecdote():
    W,H=1000,380
    head,cy,foot=ds.panel(W,H,"Biohacking · §32","The anecdote engine — why testimonials mislead",
        "Four biases manufacture convincing 'it changed my life' stories from interventions that do nothing.","§32 §10","anecdote-engine")
    s=[head]; items=[("Survivorship","you hear the wins,\nnot the silent failures"),("Lifestyle bundling","they also slept, ate,\ntrained — credit the bundle"),
                     ("Regression to mean","you start when worst;\nyou'd improve anyway"),("Placebo","expectation alone\nmoves how you feel")]
    bw=216; gap=((W-80)-4*bw)/3
    for i,(t,sub) in enumerate(items):
        x=40+i*(bw+gap)
        s.append(f'<rect x="{x}" y="{cy+30}" width="{bw}" height="150" rx="11" fill="{CARD}" stroke="{AMB}" stroke-width="2"/>')
        s.append(ds.text(x+bw/2,cy+70,t,size=14,fill=AMB,font=ds.DISPLAY,weight="800",anchor="middle"))
        for j,ln in enumerate(sub.split("\n")): s.append(ds.text(x+bw/2,cy+102+j*17,ln,size=11,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W/2,cy+205,"n = 1 can't see small effects, and it can never see lifespan",size=11.5,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/R07-anecdote-engine.png")

def placebo_bounded():
    W,H=1000,400
    head,cy,foot=ds.panel(W,H,"Alternative Medicine · §30 §9.1","Placebo is real — but bounded",
        "Placebo moves how you FEEL (brain-mediated). It does not move the underlying pathology.","§30 §9.1","placebo-bounded")
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,50,"PLACEBO MOVES THESE",fill="#eef4ec",stroke=GRN,tcol=GRN))
    for i,t in enumerate(["Pain","Nausea","Anxiety / mood","Fatigue, subjective symptoms"]):
        s.append(ds.text(72,cy+104+i*30,"• "+t,size=12.5,fill=INK,font=ds.BODY))
    s.append(box(W-440,cy+20,380,50,"PLACEBO DOESN'T",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Tumor size","Infection / viral load","HbA1c, cholesterol","Fracture healing, survival"]):
        s.append(ds.text(W-428,cy+104+i*30,"• "+t,size=12.5,fill=INK,font=ds.BODY))
    s.append(ds.text(W/2,H-56,"Hróbjartsson & Gøtzsche: little effect on objective outcomes",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/R08-placebo-bounded.png")

def sepsis_turnover():
    W,H=1000,330
    head,cy,foot=ds.panel(W,H,"Critical Care · §39 §6","The sepsis evidence that turned over",
        "A celebrated 2001 protocol was deflated by three big trials — but the simple core survived. The signal lasted; the ritual didn't.","§39 §6","sepsis-evidence-turnover")
    s=[head,ARROW]; x0=90; x1=W-90; y=cy+76
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3"/>')
    pts=[(0.04,"2001","Rivers EGDT\n(celebrated)",GRN2),(0.5,"2014–15","ProCESS / ARISE /\nProMISe (no benefit)",WARN),(0.95,"2021","Surviving Sepsis\n(keep simple core)",GRN)]
    for f_,t,lab,c in pts:
        x=x0+(x1-x0)*f_; s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="{c}"/>')
        s.append(ds.text(x,y-16,t,size=13,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y+26+j*15,ln,size=10.5,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/R09-sepsis-turnover.png")

def sedation():
    W,H=1000,300
    head,cy,foot=ds.panel(W,H,"Anesthesia · §39 §2.1","The sedation continuum — it's one dial",
        "'Sedation' and 'general anesthesia' aren't separate categories; they're points on a dial — and you can slip too deep.","§39 §2.1","sedation-continuum")
    s=[head]; x0=80; x1=W-80; y=cy+70
    grad=[("Local",GRN,0.0),("Light\nsedation",GRN2,0.3),("Deep\nsedation",AMB,0.62),("General\nanesthesia",WARN,1.0)]
    s.append(f'<rect x="{x0}" y="{y-14}" width="{x1-x0}" height="28" rx="14" fill="url(#sg)"/>')
    s.append(f'<defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{GRN}" stop-opacity="0.3"/><stop offset="1" stop-color="{WARN}" stop-opacity="0.5"/></linearGradient></defs>')
    for lab,c,f_ in grad:
        x=x0+(x1-x0)*f_
        s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="{c}"/>')
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y+30+j*15,ln,size=11.5,fill=c,font=ds.DISPLAY,weight="700",anchor="middle"))
    dz0=x0+(x1-x0)*0.55; dz1=x0+(x1-x0)*0.8
    s.append(f'<rect x="{dz0}" y="{y-34}" width="{dz1-dz0}" height="20" rx="4" fill="{WARN}" opacity="0.18"/>')
    s.append(ds.text((dz0+dz1)/2,y-40,"danger zone: too deep → not breathing",size=10,fill=WARN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/R10-sedation-continuum.png")

if __name__=="__main__":
    for fn in [laundering,four_beat,anecdote,placebo_bounded,sepsis_turnover,sedation]:
        fn(); print(fn.__name__,"ok")
    print("matrices R01-R04 + infographics R05-R10 done")
