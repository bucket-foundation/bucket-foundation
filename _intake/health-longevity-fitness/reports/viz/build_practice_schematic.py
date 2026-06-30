#!/usr/bin/env python3
"""PRACTICE/PEDIATRIC/DERM/IMMUNE schematics & infographics."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker><marker id="gn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1d6b2e"/></marker></defs>'
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sub=None,sz=13):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    lines=label.split("\n")
    if sub: s+=ds.text(x+w/2,y+h/2-4,label,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")+ds.text(x+w/2,y+h/2+14,sub,size=10,fill=MUT,font=ds.BODY,anchor="middle")
    elif len(lines)>1:
        for j,ln in enumerate(lines): s+=ds.text(x+w/2,y+h/2+5+(j-(len(lines)-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    else: s+=ds.text(x+w/2,y+h/2+5,label,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def harrow(x0,x1,y,c="bk"): return f'<line x1="{x0}" y1="{y}" x2="{x1-4}" y2="{y}" stroke="{"#1c1a17" if c=="bk" else "#1d6b2e"}" stroke-width="3" marker-end="url(#{c})"/>'
def fr(name,k,t,sub,src,claim,W,H): return ds.panel(W,H,k,t,sub,src,claim)+(f"/{name}",)

# 1. Bayes PPV block diagram (flagship)
def bayes():
    W,H=1000,540
    head,cy,foot=ds.panel(W,H,"Test Performance · §41","Why a 'great' test can still be mostly wrong",
        "A 99%-sensitive, 99%-specific test, on a disease 1 in 1,000 people have. Screen 100,000.","§41 §A.4","bayes-ppv-icon-array")
    s=[head,ARROW]
    def arr(x0,y0,x1,y1): return f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{INK}" stroke-width="2.6" marker-end="url(#bk)"/>'
    def blk(x,y,w,h,c,t1,t2):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{c}" opacity="0.9"/>'+ds.text(x+w/2,y+h/2-2,t1,size=13,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle")+ds.text(x+w/2,y+h/2+15,t2,size=10,fill="#fff",font=ds.BODY,anchor="middle")
    s.append(box(W/2-110,cy+4,220,46,"100,000 screened",fill=CARD,stroke=GOLDD))
    s.append(arr(W/2-40,cy+50,300,cy+80)); s.append(arr(W/2+40,cy+50,700,cy+80))
    s.append(blk(150,cy+82,300,54,GRN,"100 truly have it","99 test positive (true positives)"))
    s.append(blk(550,cy+82,300,54,MUT,"99,900 are well","999 test positive (false positives)"))
    s.append(arr(300,cy+136,440,cy+180)); s.append(arr(700,cy+136,560,cy+180))
    s.append(box(W/2-235,cy+182,470,54,"1,098 positive results, only 99 of them real",fill="#f6ece6",stroke=WARN,tcol=WARN,sz=15))
    s.append(ds.text(W/2,cy+278,"PPV \u2248 99 / 1,098 \u2248 9%",size=27,fill=WARN,font=ds.DISPLAY,weight="800",anchor="middle"))
    s.append(ds.text(W/2,cy+308,"Most positives are FALSE because the disease is rare.",size=12.5,fill=INK,font=ds.BODY,italic=True,anchor="middle"))
    s.append(f'<line x1="60" y1="{cy+332}" x2="{W-60}" y2="{cy+332}" stroke="{RULE}" stroke-width="1"/>')
    s.append(ds.text(W/2,cy+356,"In a clinic where 1 in 10 is sick, the same test gives a PPV above 90%. Prevalence changes everything.",size=12.5,fill=GRN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS1-bayes-ppv.png")

# 2. 2x2 confusion table
def confusion():
    W,H=900,520
    head,cy,foot=ds.panel(W,H,"Test Performance · §41","The 2×2 table — read it two ways",
        "Down the columns = properties of the test (sensitivity, specificity). Across the rows = what a result means for YOU (PPV, NPV).","§41 §A.1","confusion-2x2")
    s=[head]; gx,gy,cw,ch=300,cy+40,260,110
    s.append(ds.text(gx+cw/2,gy-14,"HAS DISEASE",size=12,fill=GRN,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(gx+cw+cw/2,gy-14,"NO DISEASE",size=12,fill=MUT,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(gx-14,gy+ch/2,"TEST +",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="end"))
    s.append(ds.text(gx-14,gy+ch+ch/2,"TEST −",size=12,fill=INK,font=ds.DISPLAY,weight="bold",anchor="end"))
    cells=[("TP",GRN,gx,gy),("FP",WARN,gx+cw,gy),("FN",WARN,gx,gy+ch),("TN",GRN,gx+cw,gy+ch)]
    for t,c,x,y in cells:
        s.append(f'<rect x="{x}" y="{y}" width="{cw-6}" height="{ch-6}" rx="8" fill="{c}" opacity="0.14" stroke="{c}" stroke-width="2"/>')
        s.append(ds.text(x+cw/2,y+ch/2+8,t,size=26,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
    s.append(ds.text(gx+cw,gy+2*ch+30,"↓ columns = sensitivity / specificity (property of the test)",size=11.5,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(ds.text(gx+cw,gy+2*ch+54,"→ rows = PPV / NPV (what it means for the patient)",size=11.5,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(ds.text(gx+cw,gy+2*ch+86,"SnNOUT: a Sensitive test, Negative, rules OUT · SpPIN: Specific, Positive, rules IN",size=11,fill=GOLDD,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS2-confusion-2x2.png")

# 3. ADME journey
def adme():
    W,H=1000,330
    head,cy,foot=ds.panel(W,H,"Pharmacology · §28 §A.2","ADME — a drug's journey through the body",
        "Absorption, distribution, metabolism, excretion — the four stages that set dose, timing, and interactions.","§28 §A.2","adme-journey")
    steps=[("Absorption","route + first-pass (gut→liver)"),("Distribution","protein binding, fat, BBB"),("Metabolism","liver CYP enzymes (Phase I/II)"),("Excretion","mostly kidney")]
    n=4; bw=200; gap=((W-80)-n*bw)/(n-1); s=[head,ARROW]
    for i,(lab,sub) in enumerate(steps):
        x=40+i*(bw+gap); s.append(box(x,cy+34,bw,74,lab,sub=sub,stroke=[GRN2,BLUE,AMB,GOLDD][i]))
        if i<n-1: s.append(harrow(x+bw,x+bw+gap,cy+71))
    s.append(ds.text(W/2,cy+150,"interactions and pharmacogenomics mostly act at METABOLISM",size=11.5,fill=AMB,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS3-adme.png")

# 4. Agonist spectrum
def agonist():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Pharmacology · §28 §A.1.2","The agonist spectrum",
        "Drugs don't just 'turn receptors on or off' — they sit on a continuum from inverse agonist to full agonist.","§28 §A.1.2","agonist-spectrum")
    s=[head]; x0=80; x1=W-80; y=cy+90
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3"/>')
    s.append(f'<line x1="{(x0+x1)/2}" y1="{y-50}" x2="{(x0+x1)/2}" y2="{y+12}" stroke="{MUT}" stroke-width="1.2" stroke-dasharray="3 4"/>')
    s.append(ds.text((x0+x1)/2,y-58,"baseline (no drug)",size=10,fill=MUT,font=ds.BODY,anchor="middle"))
    pts=[(0.0,"Inverse\nagonist","below baseline",WARN),(0.33,"Antagonist","blocks (zero)",MUT),(0.66,"Partial\nagonist","submaximal ceiling",AMB),(1.0,"Full\nagonist","maximal (Emax)",GRN)]
    for fr_,lab,sub,c in pts:
        x=x0+(x1-x0)*fr_; s.append(f'<circle cx="{x}" cy="{y}" r="8" fill="{c}"/>')
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y+32+j*15,ln,size=12,fill=c,font=ds.DISPLAY,weight="700",anchor="middle"))
        s.append(ds.text(x,y+32+len(lab.split("\n"))*15+4,sub,size=9.5,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W/2,cy+200,"allosteric modulators bind elsewhere and tune the response up or down",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS4-agonist-spectrum.png")

# 5. PEACE & LOVE
def peace_love():
    W,H=1000,420
    head,cy,foot=ds.panel(W,H,"Injury · §21 §3.2","Soft-tissue injury: PEACE & LOVE (RICE is retired)",
        "First days = PEACE (protect & let it settle). After = LOVE (load it back to health). Don't ice-and-rest indefinitely.","§21 §3.2","peace-and-love")
    s=[head]
    peace=[("P","Protect"),("E","Elevate"),("A","Avoid anti-inflammatories"),("C","Compress"),("E","Educate")]
    love=[("L","Load (early, graded)"),("O","Optimism"),("V","Vascularization (cardio)"),("E","Exercise")]
    def render_row(items,y,col,title):
        out=[ds.text(40,y-12,title,size=12,fill=col,font=ds.DISPLAY,weight="bold")]
        bw=176; gap=14; x=40
        for L,word in items:
            out.append(f'<rect x="{x}" y="{y}" width="{bw}" height="68" rx="9" fill="{CARD}" stroke="{col}" stroke-width="2"/>')
            out.append(ds.text(x+22,y+44,L,size=30,fill=col,font=ds.DISPLAY,weight="800",anchor="middle"))
            for j,ln in enumerate(_wrap(word,16)): out.append(ds.text(x+42,y+30+j*15,ln,size=11,fill=INK,font=ds.BODY))
            x+=bw+gap
        return "".join(out)
    s.append(render_row(peace,cy+22,WARN,"FIRST (days 1–3) — PEACE"))
    s.append(render_row(love,cy+150,GRN,"THEN — LOVE"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS5-peace-love.png")
def _wrap(t,n):
    w=t.split(); r=[]; line=""
    for x in w:
        if len(line)+len(x)+1<=n: line=(line+" "+x).strip()
        else: r.append(line); line=x
    if line: r.append(line)
    return r

# 6. SIDS safe sleep bundle
def sids():
    W,H=1000,480
    head,cy,foot=ds.panel(W,H,"Pediatric · §43 §3.7","Safe sleep — the bundle that halved SIDS",
        "'Back to Sleep' (1994) cut SIDS dramatically. Prone sleeping is ~4× the risk. The rest stacks on top.","§43 §3.7","sids-safe-sleep")
    cx,cyh=W/2,cy+180; s=[head,ARROW]
    rules=[("Back to sleep\n(every sleep)",-300,-70,GRN),("Firm, flat surface",-300,60,GRN),("No soft bedding,\npillows, bumpers",-110,-120,GRN),
           ("Room-share,\nNOT bed-share",110,-120,GRN),("No overheating\nor smoke",300,-70,GRN),("Breastfeed",300,60,GRN),("Offer a pacifier",-110,130,GRN),("(Tummy time when AWAKE)",110,130,AMB)]
    for lab,dx,dy,c in rules:
        x,y=cx+dx,cyh+dy; s.append(box(x-95,y-24,190,48,lab,fill=CARD,stroke=c,sz=11))
    s.append(f'<circle cx="{cx}" cy="{cyh}" r="58" fill="{GRN}"/>')
    s.append(ds.text(cx,cyh-6,"SAFE",size=15,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cx,cyh+14,"SLEEP",size=15,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS6-sids.png")

# 7. Developmental milestones / red flags timeline
def milestones():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Pediatric · §43 §6","Developmental red flags — trajectory beats the date",
        "Milestones vary, but these 'no later than' ages warrant evaluation. Any LOSS of a skill = always evaluate.","§43 §6","developmental-redflags")
    s=[head,ARROW]; x0=70; x1=W-70; y=cy+86
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    pts=[(0.05,"9 mo","no sitting",-1),(0.22,"12 mo","no babble",1),(0.40,"16 mo","no single words",-1),(0.60,"18 mo","no walking",1),(0.80,"24 mo","no 2-word phrases",-1)]
    for f_,t,lab,side in pts:
        x=x0+(x1-x0)*f_; s.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{WARN}"/>')
        yy=y-22 if side<0 else y+26
        s.append(ds.text(x,yy,t,size=13,fill=WARN,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x,yy+(-16 if side<0 else 16),lab,size=10.5,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(ds.text(W/2,cy+150,"Early intervention beats wait-and-see. Regression of any skill → evaluate now.",size=11.5,fill=GRN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS7-milestones.png")

# 8. ABCDE melanoma
def abcde():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Dermatology · §27 §A.5","ABCDE — spotting melanoma early",
        "Check your moles; E (evolving) is the most important. Also watch the 'ugly duckling' — the one that looks different from the rest.","§27 §A.5","abcde-melanoma")
    s=[head]; items=[("A","Asymmetry","one half ≠ other"),("B","Border","ragged / blurred"),("C","Color","varied shades"),("D","Diameter",">6 mm (pencil eraser)"),("E","Evolving","changing = key sign")]
    bw=170; gap=((W-80)-5*bw)/4
    for i,(L,t,sub) in enumerate(items):
        x=40+i*(bw+gap); c=WARN if L=="E" else GOLDD
        s.append(f'<rect x="{x}" y="{cy+30}" width="{bw}" height="150" rx="11" fill="{CARD}" stroke="{c}" stroke-width="{3 if L=="E" else 2}"/>')
        s.append(ds.text(x+bw/2,cy+78,L,size=40,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x+bw/2,cy+118,t,size=14,fill=INK,font=ds.DISPLAY,weight="700",anchor="middle"))
        for j,ln in enumerate(_wrap(sub,18)): s.append(ds.text(x+bw/2,cy+140+j*15,ln,size=10.5,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS8-abcde.png")

# 9. Boost vs regulate (immune)
def boost_regulate():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Immune · §15","'Boost' is the wrong goal — REGULATE is the right one",
        "You don't want a louder immune system; you want a well-regulated one. A 'boosted' system attacks the wrong things.","§15 §0","boost-vs-regulate")
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,52,"“BOOSTED” = dysregulated",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Autoimmunity (attacks self)","Allergy & asthma (attacks harmless things)","Cytokine storm (attacks too hard)"]):
        s.append(ds.text(70,cy+106+i*32,"• "+t,size=12.5,fill=INK,font=ds.BODY))
    s.append(box(W-440,cy+20,380,52,"REGULATED = healthy",fill="#eef4ec",stroke=GRN,tcol=GRN))
    for i,t in enumerate(["Responds to real threats, then RESOLVES","Tolerates self & harmless antigens","Levers: sleep, exercise, nutrition, vaccines"]):
        s.append(ds.text(W-430,cy+106+i*32,"• "+t,size=12.5,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS9-boost-regulate.png")

# 10. Cancer paradox (telomere)
def cancer_paradox():
    W,H=1000,390
    head,cy,foot=ds.panel(W,H,"Telomeres · §16.3","The telomere cancer paradox",
        "Short telomeres age you; long telomeres / active telomerase feed cancer. 'Lengthening' is not a free lunch.","§16 §16.3","telomere-cancer-paradox")
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,52,"TOO SHORT",fill="#f6ece6",stroke=AMB,tcol=AMB))
    for i,t in enumerate(["Replicative senescence","Stem-cell exhaustion","Dyskeratosis / pulmonary fibrosis"]):
        s.append(ds.text(70,cy+106+i*32,"• "+t,size=12.5,fill=INK,font=ds.BODY))
    s.append(box(W-440,cy+20,380,52,"TOO LONG / telomerase ON",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Cells divide without limit","≈ what 85–90% of cancers do","Mendelian randomization: ↑ several cancers"]):
        s.append(ds.text(W-430,cy+106+i*32,"• "+t,size=12.5,fill=INK,font=ds.BODY))
    s.append(ds.text(W/2,H-58,"the arrow the supplement market sells you points toward cancer risk",size=11.5,fill=WARN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS10-cancer-paradox.png")

# 11. Four imaging physics
def four_physics():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Imaging · §40 §40.1","Four ways to make an image — four kinds of physics",
        "Each modality probes tissue with a different physical signal. For ionizing types, 'the image and the hazard are the same photon.'","§40 §40.1","imaging-four-physics")
    s=[head]; items=[("X-ray / CT","ionizing EM","absorbed photons","⚠ radiation",WARN),("Ultrasound","mechanical wave","echoes","no radiation",GRN),("MRI","magnetic resonance","spin signal","no radiation",GRN),("Nuclear / PET","radioactive decay","emitted photons","⚠ radiation",WARN)]
    bw=212; gap=((W-80)-4*bw)/3
    for i,(t,phys,sig,haz,c) in enumerate(items):
        x=40+i*(bw+gap)
        s.append(f'<rect x="{x}" y="{cy+30}" width="{bw}" height="150" rx="11" fill="{CARD}" stroke="{GOLDD}" stroke-width="2"/>')
        s.append(ds.text(x+bw/2,cy+64,t,size=15,fill=INK,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x+bw/2,cy+92,phys,size=11.5,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
        s.append(ds.text(x+bw/2,cy+120,sig,size=11,fill=INK,font=ds.BODY,anchor="middle"))
        s.append(f'<rect x="{x+30}" y="{cy+142}" width="{bw-60}" height="26" rx="13" fill="{c}" opacity="0.15"/>')
        s.append(ds.text(x+bw/2,cy+159,haz.replace("⚠ ",""),size=11,fill=c,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS11-imaging-physics.png")

# 12. Fagan nomogram (approx)
def fagan():
    W,H=1000,460
    head,cy,foot=ds.panel(W,H,"Test Performance · §41 §A.5","The likelihood-ratio shortcut (Fagan idea)",
        "A test's likelihood ratio moves your pre-test probability to a post-test probability. LR>10 ↑ strongly; LR<0.1 ↓ strongly; LR≈1 is useless.","§41 §A.5","fagan-nomogram")
    s=[head]; lx,rx=180,W-180; ytop=cy+30; ybot=H-70
    for x,lab in [(lx,"PRE-TEST\nprobability"),(W/2,"likelihood\nratio (LR)"),(rx,"POST-TEST\nprobability")]:
        s.append(f'<line x1="{x}" y1="{ytop}" x2="{x}" y2="{ybot}" stroke="{INK}" stroke-width="2"/>')
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,ytop-22+j*14,ln,size=10.5,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
    # example line: pretest 10% -> LR 10 -> posttest ~53%
    p0=(lx,ytop+(ybot-ytop)*0.7); p1=(W/2,ytop+(ybot-ytop)*0.2); p2=(rx,ytop+(ybot-ytop)*0.42)
    s.append(f'<line x1="{p0[0]}" y1="{p0[1]}" x2="{p2[0]}" y2="{p2[1]}" stroke="{WARN}" stroke-width="2.5"/>')
    for (x,y),t in [(p0,"10%"),(p1,"LR = 10"),(p2,"~53%")]:
        s.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{WARN}"/>'+ds.text(x+(14 if x<rx else -14),y+4,t,size=12,fill=WARN,font=ds.DISPLAY,weight="bold",anchor=("start" if x<rx else "end")))
    s.append(ds.text(W/2,ybot+30,"draw a line from your pre-test probability through the LR — it lands on the post-test probability",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/PS12-fagan.png")

if __name__=="__main__":
    for fn in [bayes,confusion,adme,agonist,peace_love,sids,milestones,abcde,boost_regulate,cancer_paradox,four_physics,fagan]:
        fn(); print(fn.__name__,"ok")
