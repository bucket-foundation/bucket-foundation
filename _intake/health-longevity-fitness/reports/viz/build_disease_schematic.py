#!/usr/bin/env python3
"""DISEASE cluster — schematics (ladders, flows, timelines, spectrums)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker><marker id="gn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1d6b2e"/></marker><marker id="wn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker></defs>'
def _ac(c): return "#1c1a17" if c=="bk" else "#1d6b2e" if c=="gn" else "#b5471f"
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sub=None,sz=13):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    lines=label.split("\n")
    if sub: s+=ds.text(x+w/2,y+h/2-4,label,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")+ds.text(x+w/2,y+h/2+14,sub,size=10,fill=MUT,font=ds.BODY,anchor="middle")
    elif len(lines)>1:
        for j,ln in enumerate(lines): s+=ds.text(x+w/2,y+h/2+5+(j-(len(lines)-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    else: s+=ds.text(x+w/2,y+h/2+5,label,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def harrow(x0,x1,y,c="bk"): return f'<line x1="{x0}" y1="{y}" x2="{x1-4}" y2="{y}" stroke="{_ac(c)}" stroke-width="3" marker-end="url(#{c})"/>'
def varrow(x,y0,y1,c="bk"): return f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1-4}" stroke="{_ac(c)}" stroke-width="3" marker-end="url(#{c})"/>'
def flow_row(steps,x0,x1,y,bw,bh,arrlab=None):
    n=len(steps); gap=((x1-x0)-n*bw)/(n-1); s=[]
    for i,st in enumerate(steps):
        x=x0+i*(bw+gap)
        if len(st)==4: lab,sub,fill,stroke=st
        else: lab,sub=st; fill,stroke=CARD,GOLDD
        s.append(box(x,y,bw,bh,lab,sub=sub,fill=fill,stroke=stroke))
        if i<n-1:
            s.append(harrow(x+bw,x+bw+gap,y+bh/2))
            if arrlab and arrlab[i]: s.append(ds.text(x+bw+gap/2,y-8,arrlab[i],size=9.5,fill=WARN,font=ds.MONO,weight="bold",anchor="middle"))
    return "".join(s)
def frame(name,kicker,title,sub,src,claim,W,H):
    return ds.panel(W,H,kicker,title,sub,src,claim)

# 1. T2D management ladder (vertical, escalate up)
def t2d_ladder():
    W,H=1000,574
    head,cy,foot=frame("DS-t2d","Cardiometabolic · §22 §2.2","Type-2 diabetes — the management ladder","Start with lifestyle (it wins on prevention), escalate only as needed. Newer agents add heart/kidney benefit.","§22 §2.2","t2d-management-ladder",W,H)
    tiers=[("Lifestyle (diet, weight, activity)","DPP: −58% progression — beats metformin",GRN),
           ("Metformin","first-line drug (UKPDS)",GRN2),
           ("GLP-1 RA / SGLT2i","add for weight + CV/kidney benefit (EMPA-REG, SELECT)",AMB),
           ("Insulin / combinations","when needed for glucose control",GOLDD)]
    s=[head,ARROW]; bw=620; bh=64; x=(W-bw)/2
    for i,(lab,sub,c) in enumerate(tiers):
        yy=cy+10+(3-i)*92
        s.append(box(x,yy,bw,bh,lab,sub=sub,stroke=c))
        if i<3: s.append(varrow(x+bw+40,yy+92-18,yy+18,"gn"))
    s.append(ds.text(x+bw+58,cy+10+46,"escalate",size=11,fill=GRN,font=ds.DISPLAY,weight="700"))
    s.append(ds.text(x+bw+58,cy+10+64,"only as",size=11,fill=GRN,font=ds.DISPLAY,weight="700"))
    s.append(ds.text(x+bw+58,cy+10+82,"needed",size=11,fill=GRN,font=ds.DISPLAY,weight="700"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS1-t2d-ladder.png")

# 2. HFrEF vs HFpEF spectrum
def hf_ef():
    W,H=1000,394
    head,cy,foot=frame("DS-hf","Heart Failure · §22 §1.2","Heart failure by ejection fraction","EF — the % of blood pumped per beat — splits HF into types that look similar but behave differently.","§22 §1.2","hfref-vs-hfpef",W,H)
    s=[head,ARROW]; segs=[("HFrEF","≤ 40%","weak squeeze",WARN),("HFmrEF","40–50%","mildly reduced",AMB),("HFpEF","≥ 50%","stiff, can't fill",BLUE)]
    x0=60; tot=W-120; ws=[0.34,0.18,0.48]
    cx=x0
    for (lab,rng,desc,c),w in zip(segs,ws):
        wpx=tot*w
        s.append(f'<rect x="{cx}" y="{cy+30}" width="{wpx-6}" height="70" rx="9" fill="{c}" opacity="0.16" stroke="{c}" stroke-width="2"/>')
        s.append(ds.text(cx+wpx/2,cy+58,lab,size=16,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(cx+wpx/2,cy+80,rng+" · "+desc,size=10.5,fill=INK,font=ds.BODY,anchor="middle"))
        cx+=wpx
    s.append(f'<line x1="60" y1="{cy+118}" x2="{W-60}" y2="{cy+118}" stroke="{INK}" stroke-width="2"/>')
    s.append(ds.text(60,cy+138,"0% — ejection fraction →",size=10,fill=MUT,font=ds.BODY))
    s.append(ds.text(W-60,cy+138,"100%",size=10,fill=MUT,font=ds.BODY,anchor="end"))
    s.append(ds.text(W/2,cy+170,"HFpEF is now ~half of all heart failure — and the hardest to treat",size=11.5,fill=BLUE,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS2-hf-ef-spectrum.png")

# 3. CRC adenoma->carcinoma sequence
def crc_seq():
    W,H=1000,376
    head,cy,foot=frame("DS-crc","Oncology · §25 §2.2","The adenoma → carcinoma sequence","Cancer is a multi-hit process: each driver mutation moves a normal cell one step toward malignancy — over ~10–15 years.","§25 §2.2","crc-multihit-sequence",W,H)
    steps=[("Normal\nepithelium",None,"#eef4ec",GRN),("Small\nadenoma",None,CARD,GOLDD),("Large\nadenoma",None,CARD,AMB),("Carcinoma",None,"#f6ece6",WARN),("Metastasis",None,"#f0dcd2",DKR)]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+34,160,66,arrlab=["APC","KRAS","SMAD4 / 18q","TP53"])]
    s.append(ds.text(W/2,cy+150,"~10–15 years from first polyp to cancer — the window screening exploits",size=11.5,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS3-crc-sequence.png")

# 4. Gout pathway
def gout():
    W,H=1000,390
    head,cy,foot=frame("DS-gout","Rheumatology · §24 §13","Gout — urate, crystals, and treat-to-target","Mostly genetic (under-excretion), with diet a minor contributor. Lowering urate below 6 mg/dL dissolves the crystals.","§24 §13","gout-urate-target",W,H)
    steps=[("Hyperuricemia",">6.8 mg/dL (saturation)","#f6ece6",AMB),("MSU crystals","deposit in joints",CARD,WARN),("NLRP3 / IL-1β","inflammasome fires","#f6ece6",WARN),("Gout flare","acute joint attack","#f0dcd2",DKR)]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+30,168,68)]
    s.append(f'<rect x="40" y="{cy+126}" width="{W-80}" height="40" rx="9" fill="#eef4ec" stroke="{GRN}" stroke-width="2"/>')
    s.append(ds.text(W/2,cy+150,"Treat-to-target: urate-lowering therapy to < 6 mg/dL dissolves crystals & prevents flares",size=11.5,fill=GRN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS4-gout.png")

# 5. RA treat-to-target
def ra():
    W,H=1000,376
    head,cy,foot=frame("DS-ra","Rheumatology · §24 §12","Rheumatoid arthritis — treat-to-target","Autoantibodies appear years before symptoms. Hit it hard and early — the 'window of opportunity' — and remission is realistic.","§24 §12","ra-treat-to-target",W,H)
    steps=[("Autoantibodies","RF / anti-CCP (pre-symptom)","#f6ece6",AMB),("Synovitis","pannus, TNF / IL-6",CARD,WARN),("Methotrexate","anchor DMARD","#eef4ec",GRN2),("Biologics / JAK","if not at target","#eef4ec",GRN),("Remission","treat-to-target","#dcebd6",GRN)]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+34,162,66)]
    s.append(ds.text(W/2,cy+150,"window of opportunity — early control changes the disease course",size=11.5,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS5-ra-target.png")

# 6. Low-FODMAP 3-phase
def fodmap():
    W,H=1000,370
    head,cy,foot=frame("DS-fod","GI · §23 §B3","Low-FODMAP — a 3-phase protocol, NOT a forever diet","Dietitian-guided: restrict, then systematically reintroduce, then personalize. ~50–67% of IBS responds.","§23 §B3","low-fodmap-protocol",W,H)
    steps=[("1 · Restriction","2–6 weeks, strict","#f6ece6",WARN),("2 · Reintroduction","test groups one at a time",CARD,AMB),("3 · Personalization","your tolerable long-term diet","#eef4ec",GRN)]
    s=[head,ARROW, flow_row(steps,80,W-80,cy+34,250,72)]
    s.append(ds.text(W/2,cy+150,"Staying in Phase 1 forever starves the microbiome — the goal is the widest tolerable diet",size=11.5,fill=WARN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS6-low-fodmap.png")

# 7. Asthma type-2 cascade
def asthma():
    W,H=1000,379
    head,cy,foot=frame("DS-asth","Respiratory · §23 §A1","Asthma is an inflammatory disease (not just bronchospasm)","Type-2 inflammation drives it — which is why an inhaled steroid is the controller.","§23 §A1","asthma-type2",W,H)
    steps=[("Trigger","allergen / virus","#f6ece6",AMB),("Th2 response","IL-4 / IL-5 / IL-13",CARD,WARN),("Eosinophils, IgE,\nmast cells","airway inflammation","#f6ece6",WARN),("Hyperreactive\nairway","reversible obstruction","#f0dcd2",DKR)]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+30,176,72)]
    s.append(ds.text(W/2,cy+154,"Controller = inhaled corticosteroid (treats inflammation). Reliever alone undertreats.",size=11.5,fill=GRN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS7-asthma.png")

# 8. OSA mechanism
def osa():
    W,H=1000,380
    head,cy,foot=frame("DS-osa","Respiratory · §23 §A3","Obstructive sleep apnea — mechanism to consequences","Repeated airway collapse drives hypoxia and sympathetic surges. CPAP helps symptoms; CV-event benefit is adherence-limited.","§23 §A3","osa-mechanism",W,H)
    steps=[("Airway collapse","during sleep","#f6ece6",AMB),("Intermittent hypoxia\n+ arousals",None,CARD,WARN),("Sympathetic surge","BP, heart rate","#f6ece6",WARN),("HTN · AF · insulin\nresistance",None,"#f0dcd2",DKR)]
    s=[head,ARROW, flow_row(steps,40,W-40,cy+30,176,72)]
    s.append(ds.text(W/2,cy+154,"SAVE trial: CPAP improved sleepiness & quality of life but did not cut CV events (adherence-limited)",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS8-osa.png")

# 9. Stroke reperfusion windows timeline
def stroke_windows():
    W,H=1000,374
    head,cy,foot=frame("DS-strk","Stroke · §24 §3","Ischemic stroke — the reperfusion clock","Earlier is better, but imaging can extend the window. The penumbra is salvageable brain — until it isn't.","§24 §3","stroke-reperfusion-windows",W,H)
    s=[head,ARROW]; x0=70; x1=W-70; y=cy+70
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3"/>')
    marks=[(0.0,"0 h","onset",WARN),(0.18,"3 h","IV thrombolysis",GRN),(0.30,"4.5 h","extended tPA",GRN2),(0.62,"24 h","thrombectomy\n(imaging-selected)",GOLDD)]
    for fr,t,lab,c in marks:
        x=x0+(x1-x0)*fr
        s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="{c}"/>')
        s.append(ds.text(x,y-16,t,size=13,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y+28+j*15,ln,size=10.5,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W/2,cy+150,"Thrombectomy NNT ≈ 2.6 — one of medicine's most effective acute treatments",size=11.5,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS9-stroke-windows.png")

# 10. Parkinson's prodrome timeline
def parkinsons():
    W,H=1000,340
    head,cy,foot=frame("DS-pk","Neurology · §24 §6","Parkinson's — a long prodrome before the tremor","Non-motor signs precede diagnosis by years to decades. By the time tremor appears, 50–70% of dopamine neurons are gone.","§24 §6","parkinsons-prodrome",W,H)
    s=[head,ARROW]; x0=70; x1=W-70; y=cy+78
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    pts=[(0.04,"Constipation",AMB,-1),(0.20,"REM-sleep\nbehavior disorder",AMB,1),(0.38,"Anosmia\n(smell loss)",AMB,-1),(0.54,"Depression /\nanxiety",AMB,1),(0.74,"MOTOR diagnosis\n(tremor, slowness)",WARN,-1)]
    for fr,lab,c,side in pts:
        x=x0+(x1-x0)*fr
        s.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{c}"/>')
        yy=y-22 if side<0 else y+18
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,yy-( (len(lab.split(chr(10)))-1-j)*14 if side<0 else -j*14),ln,size=10.5,fill=(WARN if c==WARN else INK),font=ds.BODY,weight=("700" if c==WARN else None),anchor="middle"))
    s.append(ds.text(x0,y-44,"years → decades earlier",size=10,fill=MUT,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS10-parkinsons-prodrome.png")

# 11. Vaccine-preventable disease timeline
def vaccine_timeline():
    W,H=1000,376
    head,cy,foot=frame("DS-vax","Infectious Disease · §26 §4.3","Vaccines, in historical perspective","One of public health's greatest wins — and a fragile one when coverage slips.","§26 §4.3","vaccine-preventable-timeline",W,H)
    s=[head,ARROW]; x0=70; x1=W-70; y=cy+74
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3"/>')
    pts=[(0.05,"1796","smallpox vaccine",AMB),(0.42,"1980","smallpox ERADICATED",GRN),(0.55,"1988","polio −99% since",GRN2),(0.78,"2006","HPV (cancer prevention)",GRN),(0.93,"now","measles resurging",WARN)]
    for fr,t,lab,c in pts:
        x=x0+(x1-x0)*fr; s.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{c}"/>')
        s.append(ds.text(x,y-16,t,size=12,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x,y+24,lab,size=10,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W/2,cy+150,"Measles (R₀ 12–18) is the first to return when coverage drops below ~95%",size=11.5,fill=WARN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS11-vaccine-timeline.png")

# 12. Cardiometabolic one machine (hub)
def one_machine():
    import math
    W,H=1000,560
    head,cy,foot=frame("DS-cm","Cardiometabolic · §22 map","Cardiometabolic-renal disease is one machine","CAD, heart failure, AF, type-2 diabetes and CKD share one failing vascular-metabolic system — treat the whole system.","§22 §0","cardiometabolic-one-machine",W,H)
    cx,cyh=W/2,cy+185; r=66; s=[head,ARROW]
    nodes=[("Coronary\nartery disease",-185,-120),("Heart\nfailure",185,-120),("Atrial\nfibrillation",-240,35),("Type-2\ndiabetes",240,35),("Chronic kidney\ndisease",0,152)]
    for lab,dx,dy in nodes:
        x,y=cx+dx,cyh+dy; s.append(box(x-86,y-26,172,52,lab,fill=CARD,stroke=AMB,sz=11))
        ang=math.atan2(cyh-y,cx-x); ux,uy=math.cos(ang),math.sin(ang)
        sx,sy=x+ux*94,y+uy*30; ex,ey=cx-ux*r,cyh-uy*r
        s.append(f'<line x1="{sx}" y1="{sy}" x2="{ex}" y2="{ey}" stroke="{AMB}" stroke-width="2.2" opacity="0.7" marker-end="url(#bk)"/>')
    s.append(f'<circle cx="{cx}" cy="{cyh}" r="{r}" fill="{WARN}"/>')
    s.append(ds.text(cx,cyh-6,"one vascular-",size=11,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cx,cyh+10,"metabolic",size=11,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cx,cyh+26,"system",size=11,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/DS12-one-machine.png")

if __name__=="__main__":
    for fn in [t2d_ladder,hf_ef,crc_seq,gout,ra,fodmap,asthma,osa,stroke_windows,parkinsons,vaccine_timeline,one_machine]:
        fn(); print(fn.__name__,"ok")
