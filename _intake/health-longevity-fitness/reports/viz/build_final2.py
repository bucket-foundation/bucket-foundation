#!/usr/bin/env python3
"""FINAL wave 2 — matrices, 2x2 grids, infographics, flows."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
C={"high":WARN,"low":GRN,"mod":AMB}
ARROW='<defs><marker id="bk" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1c1a17"/></marker></defs>'
def matrix(name,k,t,sub,src,claim,headers,rows,xs,badge=True):
    W=1000; H=92+len(rows)*44+64
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
def fr(k,t,sub,src,claim,W,H): return ds.panel(W,H,k,t,sub,src,claim)
def harrow(x0,x1,y): return f'<line x1="{x0}" y1="{y}" x2="{x1-4}" y2="{y}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>'

# 1. sport matcher
matrix("Z01-sport-matcher.png","Sports & Play · §45 §7","Match the sport to the person",
  "There's no single best sport — only the best fit for your goals, body, and what you'll keep doing.","§45 §7.3","sport-matcher",
  ["YOUR SITUATION","GOOD FITS","WHY"],
  [("Sedentary / older","walking, swimming, cycling","low-impact on-ramp"),
   ("Joint pain","swimming, cycling, elliptical","unloads the joints"),
   ("Want brain + social","tennis, pickleball, dancing","skill + people = adherence"),
   ("Lifelong playability","tennis, golf, hiking, swimming","still doable at 70"),
   ("Time-crunched","rowing, circuits, intervals","high density per minute"),
   ("Strength & power","lifting, sprinting, climbing","force production")],
  [40,360,690],badge=False)

# 2. incidentaloma
matrix("Z02-incidentaloma.png","Imaging · §40 §4","Scan a healthy person and you'll find 'something'",
  "More scanning means more incidental findings — most benign, each triggering worry and follow-up. The cost of looking.","§40 §4","incidentaloma-prevalence",
  ["SCAN","INCIDENTAL FINDING RATE","TAKEAWAY"],
  [("Whole-body MRI","very high",("FLOODS NOISE",C["high"])),
   ("Chest CT","~1 in 3 has a nodule",("MOSTLY BENIGN",C["mod"])),
   ("Thyroid ultrasound","~25–67%",("OVERDIAGNOSIS",C["high"])),
   ("Coronary CT","frequent plaque",("CAN MISLEAD",C["mod"])),
   ("Abdominal CT","~1 in 4",("USUALLY BENIGN",C["mod"]))],
  [40,420,850])

# 3. metabolizer x prodrug 2x2
def metab():
    W,H=1000,470
    head,cy,foot=fr("Pharmacology · §28 §C.2","Why the SAME gene flips toxicity and failure","Whether a variant is dangerous depends on the drug: an ACTIVE drug behaves opposite to a PRODRUG (which must be activated).","§28 §C.2","metabolizer-prodrug",W,H)
    s=[head]; gx,gy,cw,ch=320,cy+40,300,150
    s.append(ds.text(gx+cw/2,gy-14,"ACTIVE DRUG",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(gx+cw+cw/2,gy-14,"PRODRUG (needs activating)",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(gx-16,gy+ch/2,"POOR\nmetabolizer",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="end"))
    s.append(ds.text(gx-16,gy+ch+ch/2,"ULTRA-RAPID\nmetabolizer",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="end"))
    cells=[("Drug builds up\n→ TOXICITY",WARN,gx,gy),("Not activated\n→ FAILURE",AMB,gx+cw,gy),
           ("Cleared fast\n→ FAILURE",AMB,gx,gy+ch),("Over-activated\n→ OVERDOSE (codeine deaths)",WARN,gx+cw,gy+ch)]
    for t,c,x,y in cells:
        s.append(f'<rect x="{x}" y="{y}" width="{cw-8}" height="{ch-8}" rx="9" fill="{c}" opacity="0.15" stroke="{c}" stroke-width="2"/>')
        for j,ln in enumerate(t.split("\n")): s.append(ds.text(x+cw/2,y+ch/2-6+j*18,ln,size=12.5,fill=c,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z03-metabolizer-prodrug.png")

# 4. lab-pair 2x2 (endocrine)
def labpair():
    W,H=1000,470
    head,cy,foot=fr("Endocrine · §13 §1","Reading an axis from the lab PAIR","The stimulating hormone + the effector hormone together locate the problem: in the gland (primary) or above it (central).","§13 §1","lab-pair-2x2",W,H)
    s=[head]; gx,gy,cw,ch=330,cy+40,290,150
    s.append(ds.text(gx+cw/2,gy-14,"EFFECTOR low",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(gx+cw+cw/2,gy-14,"EFFECTOR high",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(gx-16,gy+ch/2,"STIMULATING\nhigh (e.g. TSH↑)",size=11.5,fill=INK,font=ds.DISPLAY,weight="bold",anchor="end"))
    s.append(ds.text(gx-16,gy+ch+ch/2,"STIMULATING\nlow (e.g. TSH↓)",size=11.5,fill=INK,font=ds.DISPLAY,weight="bold",anchor="end"))
    cells=[("PRIMARY\nunder-function\n(gland failing)",WARN,gx,gy),("PRIMARY\nover-function\n(gland overactive)",WARN,gx+cw,gy),
           ("CENTRAL\nunder-function\n(pituitary/hypothal.)",AMB,gx,gy+ch),("CENTRAL\nover-function\n(or autonomous)",AMB,gx+cw,gy+ch)]
    for t,c,x,y in cells:
        s.append(f'<rect x="{x}" y="{y}" width="{cw-8}" height="{ch-8}" rx="9" fill="{c}" opacity="0.13" stroke="{c}" stroke-width="2"/>')
        for j,ln in enumerate(t.split("\n")): s.append(ds.text(x+cw/2,y+ch/2-14+j*17,ln,size=12,fill=c,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z04-lab-pair.png")

# 5. four tissue types
def tissues():
    W,H=1000,360
    head,cy,foot=fr("Anatomy · §18 §B.1","The four basic tissues","Every organ is built from just four tissue types. Know these and the body's architecture makes sense.","§18 §B.1","four-tissue-types",W,H)
    s=[head]; items=[("Epithelial","covers & lines surfaces; glands",GRN),("Connective","supports & binds (bone, blood, fat)",AMB),("Muscle","generates force & movement",WARN),("Nervous","senses & signals",BLUE)]
    bw=212; gap=((W-80)-4*bw)/3
    for i,(t,sub,c) in enumerate(items):
        x=40+i*(bw+gap)
        s.append(f'<rect x="{x}" y="{cy+30}" width="{bw}" height="150" rx="11" fill="{c}" opacity="0.10" stroke="{c}" stroke-width="2"/>')
        s.append(ds.text(x+bw/2,cy+78,t,size=16,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        for j,ln in enumerate(_wrap(sub,24)): s.append(ds.text(x+bw/2,cy+112+j*16,ln,size=11.5,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z05-tissue-types.png")
def _wrap(t,n):
    w=t.split(); r=[]; line=""
    for x in w:
        if len(line)+len(x)+1<=n: line=(line+" "+x).strip()
        else: r.append(line); line=x
    if line: r.append(line)
    return r

# 6. gland body map
def glands():
    W,H=1000,540
    head,cy,foot=fr("Endocrine · §13 §1","The endocrine glands — a body map","Hormone factories scattered head to pelvis — plus fat, gut, and heart, which also secrete. One signalling network.","§13 §1","endocrine-gland-map",W,H)
    s=[head]; cx=300; topy=cy+20
    # simple body outline
    s.append(f'<circle cx="{cx}" cy="{topy+30}" r="26" fill="none" stroke="{MUT}" stroke-width="2.5"/>')
    s.append(f'<path d="M{cx-46} {topy+70} Q {cx} {topy+58} {cx+46} {topy+70} L {cx+38} {topy+250} Q {cx} {topy+262} {cx-38} {topy+250} Z" fill="none" stroke="{MUT}" stroke-width="2.5"/>')
    glist=[("Hypothalamus + pituitary",topy+22,cx,GRN),("Pineal",topy+12,cx+30,AMB),("Thyroid / parathyroid",topy+78,cx,GRN2),
           ("Heart (ANP)",topy+118,cx-30,BLUE),("Adrenals",topy+158,cx+34,WARN),("Pancreas",topy+170,cx-34,GOLDD),
           ("Gut (incretins)",topy+200,cx,AMB),("Gonads",topy+242,cx,WARN),("Fat (leptin/adipokines)",topy+150,cx-44,MUT)]
    lx=560
    for i,(lab,gy,gxp,c) in enumerate(glist):
        s.append(f'<circle cx="{gxp}" cy="{gy}" r="6" fill="{c}"/>')
        yy=topy+18+i*40
        s.append(f'<circle cx="{lx}" cy="{yy}" r="6" fill="{c}"/>'+ds.text(lx+16,yy+4,lab,size=12,fill=INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z06-gland-map.png")

# 7. embryonic homology
def homology():
    W,H=1000,400
    head,cy,foot=fr("Reproductive · §42 §1","One body plan — male & female are homologous","Both sexes start from the same bipotential template; the SRY gene flips the switch. The parts have matching origins.","§42 §1","embryonic-homology",W,H)
    s=[head,ARROW]
    s.append(box(W/2-130,cy+10,260,52,"Bipotential gonad\n(undifferentiated)",stroke=GOLDD))
    s.append(f'<line x1="{W/2-60}" y1="{cy+62}" x2="280" y2="{cy+96}" stroke="{INK}" stroke-width="2.5" marker-end="url(#bk)"/>')
    s.append(f'<line x1="{W/2+60}" y1="{cy+62}" x2="720" y2="{cy+96}" stroke="{INK}" stroke-width="2.5" marker-end="url(#bk)"/>')
    s.append(ds.text(W/2-150,cy+84,"no SRY",size=11,fill=WARN,font=ds.MONO,weight="bold"))
    s.append(ds.text(W/2+95,cy+84,"SRY → testis",size=11,fill=BLUE,font=ds.MONO,weight="bold"))
    s.append(box(120,cy+98,320,40,"FEMALE",fill="#f6ece6",stroke=WARN,tcol=WARN,sz=14))
    s.append(box(560,cy+98,320,40,"MALE",fill="#eef4ec",stroke=BLUE,tcol=BLUE,sz=14))
    pairs=[("Ovary","↔","Testis"),("Clitoris","↔","Penis (glans)"),("Labia majora","↔","Scrotum"),("Labia minora","↔","Penile shaft skin")]
    yy=cy+158
    for a,m,b in pairs:
        s.append(ds.text(280,yy,a,size=12.5,fill=INK,font=ds.BODY,anchor="middle"))
        s.append(ds.text(W/2,yy,m,size=13,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
        s.append(ds.text(720,yy,b,size=12.5,fill=INK,font=ds.BODY,anchor="middle")); yy+=34
    s.append(foot); ds.render("".join(s),f"{FIG}/Z07-homology.png")

# 8. breathwork
def breathwork():
    W,H=1000,400
    head,cy,foot=fr("Recovery · §05 §4.2","Two breathing tools, two patterns","The physiological sigh down-shifts stress fast; coherent breathing (~6/min) steadies the nervous system over minutes.","§05 §4.2","breathwork-patterns",W,H)
    s=[head]
    # physiological sigh
    s.append(ds.text(60,cy+20,"Physiological sigh — double inhale, long exhale",size=13,fill=GRN,font=ds.DISPLAY,weight="bold"))
    y0=cy+90; pts="".join(f"{60+i*8},{y0-([0,18,22,38,30,16,4,-2][min(i,7)] if i<8 else 0)} " for i in range(8))
    s.append(f'<path d="M60 {y0} C 120 {y0-46} 150 {y0-30} 175 {y0-44} C 230 {y0-60} 280 {y0+40} 420 {y0+38}" fill="none" stroke="{GRN}" stroke-width="3"/>')
    s.append(ds.text(110,y0-56,"inhale",size=10,fill=MUT,font=ds.BODY)); s.append(ds.text(175,y0-58,"+sip",size=10,fill=MUT,font=ds.BODY)); s.append(ds.text(330,y0+54,"loooong exhale",size=10,fill=MUT,font=ds.BODY))
    # coherent
    s.append(ds.text(60,cy+170,"Coherent breathing — smooth ~6 breaths/min (5s in / 5s out)",size=13,fill=BLUE,font=ds.DISPLAY,weight="bold"))
    import math as _m
    y1=cy+250; path="M60 "+str(y1)
    for i in range(1,200): x=60+i*4.4; yv=y1-34*_m.sin(i/16.0); path+=f" L {x:.0f} {yv:.0f}"
    s.append(f'<path d="{path}" fill="none" stroke="{BLUE}" stroke-width="3"/>')
    s.append(foot); ds.render("".join(s),f"{FIG}/Z08-breathwork.png")

# 9. childhood vaccines
def vaccines_kids():
    W,H=1000,400
    head,cy,foot=fr("Pediatric · §43 §3.1","Diseases the childhood vaccines hold back","Each once killed or maimed children at scale. They return where coverage drops — measles first.","§43 §3.1","vaccine-preventable-childhood",W,H)
    s=[head]; items=["Measles ('immune amnesia')","Pertussis (whooping cough)","Diphtheria","Tetanus","Polio","Hib meningitis","Pneumococcus","Rotavirus","Rubella (+ CRS)","Mumps","Varicella","Hepatitis B"]
    for i,t in enumerate(items):
        col=i%3; row=i//3; x=50+col*316; yy=cy+24+row*70
        s.append(f'<rect x="{x}" y="{yy}" width="296" height="54" rx="9" fill="#eef4ec" stroke="{GRN}" stroke-width="1.5"/>')
        s.append(f'<circle cx="{x+26}" cy="{yy+27}" r="13" fill="{GRN}"/>'+ds.text(x+26,yy+33,"✓",size=15,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
        s.append(ds.text(x+50,yy+32,t,size=12,fill=INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z09-vaccines-kids.png")

# 10. imaging decision flow
def imaging_flow():
    W,H=1000,360
    head,cy,foot=fr("Imaging · §40 §9","Image a QUESTION, not a body","The right scan answers a specific clinical question. 'Just checking' scans on the well mostly find incidental noise.","§40 §9","image-a-question",W,H)
    s=[head,ARROW]
    s.append(box(60,cy+50,200,60,"Clinical question?",stroke=GOLDD))
    s.append(harrow(260,330,cy+80))
    s.append(box(330,cy+10,200,50,"Bone / trauma → CT",fill="#eef4ec",stroke=GRN,sz=11.5))
    s.append(box(330,cy+72,200,50,"Soft tissue → MRI",fill="#eef4ec",stroke=GRN,sz=11.5))
    s.append(box(330,cy+134,200,50,"Fetus / repeat → US",fill="#eef4ec",stroke=GRN,sz=11.5))
    s.append(box(600,cy+50,160,60,"No symptoms,\n'just checking'?",fill="#f6ece6",stroke=WARN,tcol=WARN,sz=11.5))
    s.append(harrow(760,830,cy+80))
    s.append(box(830,cy+52,140,56,"STOP",fill="#f6ece6",stroke=WARN,tcol=WARN,sz=16))
    s.append(ds.text(W/2,H-50,"asymptomatic whole-body scanning → the incidentaloma cascade",size=11,fill=WARN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z10-imaging-flow.png")

# 11. PKU screening
def pku():
    W,H=1000,320
    head,cy,foot=fr("Pediatric · §43 §4","PKU — a heel-prick that prevents disability","A simple newborn blood spot catches a metabolic defect; a managed diet prevents irreversible harm entirely.","§43 §4","pku-newborn-screening",W,H)
    s=[head,ARROW]; steps=[("PAH enzyme defect","phenylalanine builds up",WARN),("Heel-prick blood spot","(Guthrie test, day 2–3)",GRN),("Low-Phe diet","start early",GRN),("Normal development","disability prevented",GRN2)]
    n=4; bw=192; gap=((W-80)-n*bw)/(n-1)
    for i,(lab,sub,c) in enumerate(steps):
        x=40+i*(bw+gap); s.append(box(x,cy+34,bw,70,lab,stroke=c,tcol=(c if c==WARN else INK)));
        s.append(ds.text(x+bw/2,cy+90,sub,size=9.5,fill=MUT,font=ds.BODY,anchor="middle"))
        if i<n-1: s.append(harrow(x+bw,x+bw+gap,cy+69))
    s.append(ds.text(W/2,cy+150,"Tandem mass spectrometry now screens newborns for dozens of treatable metabolic disorders at once.",size=11,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z11-pku.png")

# 12. predatory stem-cell red flags
def stemcell_flags():
    W,H=1000,360
    head,cy,foot=fr("Regenerative · §31 §2.3","Spotting a predatory stem-cell clinic","If you see these, walk away. Real cell therapies are in trials and approvals — not cash-only infusion bars.","§31 §2.3","stemcell-redflags",W,H)
    s=[head]; flags=["Cash-only; not covered by insurance","Treats a long, unrelated menu of conditions","Not registered on ClinicalTrials.gov","Promises to 'regenerate' tissues cells can't build","Testimonials instead of trial data","Pressure to decide / pay today"]
    for i,t in enumerate(flags):
        col=i%2; row=i//2; x=60+col*450; yy=cy+24+row*82
        s.append(f'<rect x="{x}" y="{yy}" width="420" height="66" rx="9" fill="#f6ece6" stroke="{WARN}" stroke-width="1.5"/>')
        s.append(f'<circle cx="{x+30}" cy="{yy+33}" r="14" fill="{WARN}"/>'+ds.text(x+30,yy+39,"!",size=16,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
        for j,ln in enumerate(_wrap(t,40)): s.append(ds.text(x+54,yy+28+j*16,ln,size=11.5,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z12-stemcell-flags.png")

# 13. questions before elective surgery
def surgery_q():
    W,H=1000,400
    head,cy,foot=fr("Surgery · §38 §5","Questions before any elective operation","Surgery can be transformative or theater. These questions separate the two — ask them before you consent.","§38 §5","surgery-questions",W,H)
    s=[head]; qs=["What's the natural history if I do nothing?","Is the goal symptoms, survival, or just a better scan?","What's the best BLINDED evidence for MY indication?","Have I truly tried non-surgical treatment?","What's the surgeon's / center's volume for this?","Is there a prehab window to get stronger first?"]
    for i,t in enumerate(qs):
        yy=cy+20+i*54
        s.append(f'<rect x="60" y="{yy}" width="{W-120}" height="44" rx="9" fill="{CARD}" stroke="{GOLDD}" stroke-width="1.5"/>')
        s.append(f'<circle cx="86" cy="{yy+22}" r="13" fill="{GOLD}"/>'+ds.text(86,yy+28,str(i+1),size=13,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
        s.append(ds.text(112,yy+28,t,size=12.5,fill=INK,font=ds.BODY))
    s.append(ds.text(W/2,H-50,"Emergency? Skip all this — speed is the treatment.",size=11,fill=WARN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Z13-surgery-questions.png")

if __name__=="__main__":
    for fn in [metab,labpair,tissues,glands,homology,breathwork,vaccines_kids,imaging_flow,pku,stemcell_flags,surgery_q]:
        fn(); print(fn.__name__,"ok")
    print("matrices Z01-Z02 + Z03-Z13 done")
