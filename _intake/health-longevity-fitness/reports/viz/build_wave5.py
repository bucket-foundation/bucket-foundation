#!/usr/bin/env python3
"""Wave 5 figures."""
import os, sys, math, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
def arrowdefs():
    out="".join(f'<marker id="{n}" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="{c}"/></marker>' for n,c in [("ah",ds.GOLD_D),("ar","#b5471f"),("am",ds.MUT)])
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.2,m="ah"):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" marker-end="url(#{m})"/>'

# ---- CHARTS ----
def omega3_index():
    cats=["< 4%\n(high risk)","4–6%","6–8%","> 8%\n(low risk)"]; hr=[1.00,0.83,0.71,0.66]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    ax.bar(xp,hr,width=0.6,color=["#b5471f","#c2693a","#5e8a3a","#1d6b2e"],edgecolor=ds.PAPER,linewidth=1.4)
    for i,h in zip(xp,hr): ax.text(i,h+0.02,f"{h:.2f}",ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,1.12); ax.grid(axis="x",visible=False)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Nutrition · biomarkers","The omega-3 index tracks mortality",
             "% EPA+DHA in red cells. A predictor — supplements raise it, but the outcome RCTs are mixed.")
    ds.footer(ax,"Harris et al., cohort meta-analyses — omega-3 index","omega3-index-mortality",tier="cohort")
    ds.flag(ax,"predictor; outcome RCTs mixed","caution")
    ds.save(fig,f"{FIG}/55-omega3-index.png",bottom=0.2)

def visceral_fat():
    q=["Q1","Q2","Q3","Q4"]; visc=[1.0,1.3,1.7,2.2]; subc=[1.0,1.02,1.05,1.08]
    fig,ax=ds.new_fig(8.6,5.2); x=np.arange(len(q)); w=0.36
    ax.bar(x-w/2,visc,w,color="#b5471f",label="visceral fat",edgecolor=ds.PAPER,linewidth=1.2)
    ax.bar(x+w/2,subc,w,color="#b9ad8e",label="subcutaneous fat",edgecolor=ds.PAPER,linewidth=1.2)
    ax.set_xticks(x); ax.set_xticklabels(q,fontsize=11); ax.set_ylim(0,2.5); ax.grid(axis="x",visible=False)
    ax.legend(fontsize=9.5); ax.set_xlabel("fat quartile (low → high)",fontsize=10,color=ds.MUT); ax.set_ylabel("relative mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Measurement","Not all fat is equal — visceral fat is the one",
             "Belly/organ fat predicts mortality beyond BMI; subcutaneous fat barely moves it.")
    ds.footer(ax,"Pooled cohort data (illustrative) — visceral vs subcutaneous","visceral-fat-mortality",tier="cohort")
    ds.save(fig,f"{FIG}/56-visceral-fat.png")

def mediterranean():
    labels=["CV events\n(PREDIMED)","Type 2 diabetes","Cognitive decline"]; vals=[30,30,13]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(labels))
    ax.bar(xp,vals,width=0.55,color=ds.GOLD_D,edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,vals): ax.text(i,v+0.7,f"−{v}%",ha="center",fontsize=12,color="#1d6b2e",fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(labels,fontsize=10.5); ax.set_ylim(0,38); ax.grid(axis="x",visible=False)
    ax.set_ylabel("relative risk reduction (%)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Nutrition · the pattern","The Mediterranean pattern — the best-evidenced diet",
             "Whole-food, plant-forward, olive oil, fish. PREDIMED is the strongest dietary RCT (with a retraction/republication asterisk).")
    ds.footer(ax,"Estruch et al., PREDIMED (NEJM 2018, republished)","mediterranean-diet-outcomes",tier="rct")
    ds.save(fig,f"{FIG}/57-mediterranean.png",bottom=0.2)

def hearing_dementia():
    yrs=[0,1,2,3]; control=[0,0.20,0.42,0.66]; aided=[0,0.12,0.24,0.34]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(yrs,control,"-o",color="#b5471f",lw=2.6,label="usual care")
    ax.plot(yrs,aided,"-o",color="#1d6b2e",lw=2.6,label="hearing aids")
    ax.fill_between(yrs,aided,control,color="#1d6b2e",alpha=0.08)
    ax.text(3.02,0.5,"~48% slower decline\n(in at-risk elderly)",fontsize=9.5,color="#1d6b2e",fontweight="bold",va="center")
    ax.set_xlim(0,3.9); ax.set_ylim(0,0.78); ax.legend(loc="upper left",fontsize=9.5)
    ax.set_xlabel("years",fontsize=10,color=ds.MUT); ax.set_ylabel("cognitive decline (more = worse)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Brain · a modifiable risk factor","Treating hearing loss slows cognitive decline",
             "Hearing loss is the #1 modifiable dementia risk factor — and hearing aids are a real lever (ACHIEVE).")
    ds.footer(ax,"Lin et al., ACHIEVE trial, Lancet 2023","achieve-hearing-dementia",tier="rct")
    ds.save(fig,f"{FIG}/58-hearing-dementia.png")

def metabolic_flexibility():
    t=np.linspace(0,24,200)
    rer=0.80+0.12*np.exp(-((t-13)**2)/3)+0.07*np.exp(-((t-20)**2)/2)-0.04*np.exp(-((t-5)**2)/6)
    fig,ax=ds.new_fig(8.6,5.0)
    ax.axhspan(0.70,0.85,color="#e9f3ea",zorder=0); ax.axhspan(0.95,1.05,color="#fbf0ea",zorder=0)
    ax.plot(t,rer,color=ds.GOLD,lw=3)
    ax.text(2,0.74,"burning FAT",fontsize=10,color="#1d6b2e",fontweight="bold")
    ax.text(2,1.0,"burning CARBS",fontsize=10,color="#b5471f",fontweight="bold")
    ax.set_xlim(0,24); ax.set_xticks([0,6,12,18,24]); ax.set_xticklabels(["mid","6a","noon","6p","mid"],fontsize=10)
    ax.set_ylim(0.68,1.06); ax.set_xlabel("time of day (meals at ~13:00, 20:00)",fontsize=10,color=ds.MUT); ax.set_ylabel("respiratory exchange ratio (fuel use)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Metabolism","Metabolic flexibility — switching fuels cleanly",
             "A healthy metabolism burns fat between meals and carbs after them. Insulin resistance gets stuck.")
    ds.footer(ax,"Respiratory-exchange-ratio concept (illustrative)","metabolic-flexibility",tier="mechanistic")
    ds.save(fig,f"{FIG}/59-metabolic-flexibility.png")

# ---- SVG ----
def four_capacities():
    W,H=1020,560
    head,y0,foot=ds.panel(W,H,"Training · the targets","The four capacities that carry the signal",
        "Train all four. Each has a way to build it and a free way to test it.","§Training","four-capacities")
    s=[head]
    caps=[("CARDIO (VO₂max)","#b5471f","Zone 2 + intervals","hard field test / wearable est."),
          ("STRENGTH","#1d6b2e","resistance training 2–3×/wk","grip · sit-to-rise"),
          ("MOBILITY","#3a6ea5","daily range-of-motion drills","deep squat · shoulder reach"),
          ("BALANCE","#b08d3a","single-leg & unstable work","10-second one-leg stand")]
    cw=(W-70-40-30)/2; ch=(H-104-y0-10)/2; gx,gy=40,y0+12
    for i,(t,c,build,test) in enumerate(caps):
        r,col=divmod(i,2); x=gx+col*(cw+30); yy=gy+r*(ch+18)
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="{cw:.0f}" height="{ch:.0f}" rx="12" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="{cw:.0f}" height="34" rx="0" fill="{c}"/>')
        s.append(ds.text(x+18,yy+23,t,size=15,fill="white",font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x+18,yy+62,"BUILD",size=9,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
        s.append(ds.text(x+78,yy+62,build,size=12,fill=ds.INK,font=ds.BODY))
        s.append(ds.text(x+18,yy+88,"TEST",size=9,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
        s.append(ds.text(x+78,yy+88,test,size=12,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/60-four-capacities.png")

def endocrine_axes():
    W,H=1020,560
    head,y0,foot=ds.panel(W,H,"Endocrine · the control loops","The three master hormone axes",
        "Each runs hypothalamus → pituitary → gland → hormone, with negative feedback that defends a set-point.","§Endocrine System","endocrine-axes")
    s=[head, arrowdefs()]
    axes=[("HPA","#b5471f","CRH","ACTH","Adrenal","Cortisol\n(stress)"),
          ("HPG","#3a6ea5","GnRH","LH/FSH","Gonads","Sex hormones"),
          ("HPT","#1d6b2e","TRH","TSH","Thyroid","T3 / T4\n(metabolism)")]
    cw=(W-70-40-40)/3
    for i,(name,c,h1,h2,gland,horm) in enumerate(axes):
        x=40+i*(cw+40); steps=[("Hypothalamus",h1),("Pituitary",h2),(gland,horm.split(chr(10))[0])]
        s.append(ds.text(x+cw/2,y0+18,name+" axis",size=14,fill=c,font=ds.DISPLAY,weight="900",anchor="middle"))
        yy=y0+40; bh=58
        for k,(node,hor) in enumerate(steps):
            ny=yy+k*88
            s.append(f'<rect x="{x:.0f}" y="{ny}" width="{cw:.0f}" height="{bh}" rx="8" fill="{ds.CARD}" stroke="{c}" stroke-width="1.6"/>')
            s.append(ds.text(x+cw/2,ny+24,node,size=12.5,fill=ds.INK2,font=ds.DISPLAY,weight="700",anchor="middle"))
            s.append(ds.text(x+cw/2,ny+42,"↓ "+hor,size=10.5,fill=c,font=ds.BODY,weight="600",anchor="middle"))
            if k<2: s.append(arrow(x+cw/2,ny+bh,x+cw/2,ny+88,c,2,"ah"))
        # negative-feedback loop: clean curved arrow from the effector box up to the hypothalamus
        fx=x+cw
        s.append(f'<path d="M{fx} {yy+205} C {fx+26} {yy+168} {fx+26} {yy+62} {fx} {yy+30}" fill="none" stroke="{ds.MUT}" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#am)"/>')
        s.append(ds.text(fx+23,yy+120,"(-)",size=12,fill=ds.MUT,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/61-endocrine-axes.png")

def longevity_plate():
    W,H=900,640
    head,y0,foot=ds.panel(W,H,"Nutrition · what's on the plate","The whole-food plate",
        "No brand needed. The pattern that converges across the evidence — protein-adequate, plant-forward.","§Nutrition","dietary-pattern-plate")
    s=[head]
    cx,cy,r=W/2,y0+ (H-150-y0)/2 +10,160
    # plate circle, split into wedges
    import math
    wedges=[("Vegetables &\nfruit","#2f8a4b",0,180),("Protein\n(fish/legume/lean)","#b5471f",180,270),("Whole grains\n& tubers","#b08d3a",270,360)]
    for lab,c,a0,a1 in wedges:
        a0r,a1r=math.radians(a0-90),math.radians(a1-90)
        x0,y0c=cx+r*math.cos(a0r),cy+r*math.sin(a0r); x1,y1c=cx+r*math.cos(a1r),cy+r*math.sin(a1r)
        large=1 if (a1-a0)>180 else 0
        s.append(f'<path d="M{cx} {cy} L{x0:.1f} {y0c:.1f} A{r} {r} 0 {large} 1 {x1:.1f} {y1c:.1f} Z" fill="{c}" fill-opacity="0.85" stroke="white" stroke-width="3"/>')
        am=math.radians((a0+a1)/2-90); lx,ly=cx+r*0.6*math.cos(am),cy+r*0.6*math.sin(am)
        for k,ln in enumerate(lab.split("\n")): s.append(ds.text(lx,ly-6+k*15,ln,size=12,fill="white",font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{ds.INK}" stroke-width="2.5"/>')
    s.append(ds.text(cx,cy+r+34,"+ olive oil · nuts · water/tea · minimal ultra-processed food & added sugar",size=12,fill=ds.INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(ds.text(cx,cy+r+58,"½ plants · ¼ protein · ¼ smart carbs — hit ~1.6 g/kg protein, mostly whole foods.",size=11,fill=ds.MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/62-longevity-plate.png")

def sleep_hygiene():
    W,H=920,600
    head,y0,foot=ds.panel(W,H,"Recovery · the sleep levers","Sleep hygiene — what actually works",
        "Regularity and light beat any gadget. Tier-A behaviours do the work.","§Recovery","sleep-hygiene")
    s=[head]
    items=[("Keep a regular wake time — even weekends","the single strongest lever"),
           ("Bright light in the morning; dim it at night","anchors the circadian clock"),
           ("Cool, dark, quiet room (~18 °C)","temperature drop triggers sleep"),
           ("Cut caffeine ~8–10 h before bed","half-life is ~5–6 hours"),
           ("No alcohol as a 'nightcap'","it fragments the second half"),
           ("Wind-down + screens down before bed","lower evening arousal"),
           ("Track total time & timing — NOT 'deep sleep %'","consumer staging is inaccurate")]
    ry=y0+18; rh=(H-58-ry)/len(items)
    for i,(t,note) in enumerate(items):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(f'<circle cx="56" cy="{yy+rh/2}" r="11" fill="#1d6b2e"/>'); s.append(ds.text(56,yy+rh/2+4,"✓",size=12,fill="white",font=ds.DISPLAY,weight="bold",anchor="middle"))
        s.append(ds.text(82,yy+rh/2-2,t,size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(82,yy+rh/2+15,note,size=10,fill=ds.MUT,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/63-sleep-hygiene.png")

def geroprotector_matrix():
    R="#b5471f";A="#c08a1e";G="#1d6b2e";B="#3a6ea5"
    rows=[("GLP-1 agonists","weight, CV events (SELECT) in humans — proven outcomes","REAL (metabolic)",G),
          ("SGLT2 inhibitors","hard CV & kidney outcomes (in the right patients)","REAL (clinical)",G),
          ("Statins","lifelong apoB lowering; proven event reduction","REAL (clinical)",G),
          ("Metformin","cohort signal; TAME designed but unfunded/not run","EXPERIMENTAL",A),
          ("Rapamycin","strongest mouse lifespan drug; human dose unknown","EXPERIMENTAL",A),
          ("Senolytics (D+Q)","striking in mice; tiny human pilots","EARLY (mouse)",A),
          ("Acarbose / taurine","animal lifespan signal; human longevity unproven","EARLY (mouse)",A),
          ("NAD+ / NMN","raises NAD+; no demonstrated outcome benefit","HYPE",R)]
    W,H=1020,80+len(rows)*48+70
    head,y0,foot=ds.panel(W,H,"Pharmacology · the geroprotectors","Anti-aging drugs — by evidence stage",
        "From proven clinical drugs to mouse-only bets. The gap between mouse and human is the whole story.","§Medical & Pharmacology","geroprotector-stages")
    s=[head]
    for t,x in [("DRUG",40),("WHERE THE EVIDENCE STANDS",330),("STAGE",W-180)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(nm,note,verd,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,nm,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(330,yy+rh/2+4,note,size=10.5,fill=ds.INK,font=ds.BODY))
        b,_=ds.badge(W-180,yy+rh/2-9,verd,c,h=18,size=8.5); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/64-geroprotector-matrix.png")

def hpa_axis():
    W,H=720,640
    head,y0,foot=ds.panel(W,H,"Endocrine · the stress response","The HPA axis — your stress thermostat",
        "Stress → cortisol, with a feedback brake. Chronic activation is the problem.","§Endocrine System","hpa-axis")
    s=[head, arrowdefs()]
    cx=W/2; nodes=[("Stressor","→ the brain perceives a threat","#8a8170",y0+24),
                   ("Hypothalamus","releases CRH","#b08d3a",y0+118),
                   ("Pituitary","releases ACTH","#8a6d12",y0+212),
                   ("Adrenal glands","release CORTISOL","#b5471f",y0+306)]
    for k,(t,d,c,ny) in enumerate(nodes):
        s.append(f'<rect x="{cx-150}" y="{ny}" width="300" height="62" rx="10" fill="{ds.CARD}" stroke="{c}" stroke-width="1.8"/>')
        s.append(ds.text(cx,ny+26,t,size=15,fill=ds.INK2,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(cx,ny+46,d,size=11,fill=c,font=ds.BODY,weight="600",anchor="middle"))
        if k<3: s.append(arrow(cx,ny+62,cx,ny+94,ds.MUT,2.2,"ah"))
    # feedback loop on the left
    s.append(f'<path d="M{cx-150} {y0+306+31} C {cx-260} {y0+240}, {cx-260} {y0+140}, {cx-150} {y0+118+31}" fill="none" stroke="#1d6b2e" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#am)"/>')
    s.append(ds.text(cx-250,y0+225,"negative",size=11,fill="#1d6b2e",font=ds.BODY,weight="700",anchor="middle"))
    s.append(ds.text(cx-250,y0+241,"feedback",size=11,fill="#1d6b2e",font=ds.BODY,weight="700",anchor="middle"))
    s.append(ds.text(cx,H-58,"Healthy: a sharp spike then shut-off. The harm comes from CHRONIC activation.",size=11,fill=ds.INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/65-hpa-axis.png")

def synapse():
    W,H=1020,560
    head,y0,foot=ds.panel(W,H,"Nervous system · the connection","The synapse — how neurons talk",
        "An electrical signal becomes a chemical one and back. This is where drugs and learning act.","§Nervous System","synapse-neurotransmission")
    s=[head, arrowdefs()]
    GOLD=ds.GOLD; GOLDD=ds.GOLD_D; BLUE="#3a6ea5"; MUT=ds.MUT; INK=ds.INK; GRN="#1d6b2e"
    cy=y0+185; post_x=W-250
    s.append(f'<line x1="40" y1="{cy}" x2="122" y2="{cy}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>')
    s.append(arrow(72,cy,110,cy,BLUE,3,"ah")); s.append(ds.text(46,cy-24,"1 · impulse arrives",size=11,fill=BLUE,font=ds.DISPLAY,weight="bold"))
    s.append(f'<path d="M122 {cy-95} q 150 0 168 95 q -18 95 -168 95 Z" fill="{BLUE}" fill-opacity="0.15" stroke="{BLUE}" stroke-width="2.5"/>')
    s.append(ds.text(150,cy-110,"PRE-SYNAPTIC TERMINAL",size=10,fill=BLUE,font=ds.DISPLAY,weight="bold",spacing="0.4"))
    for vx,vy in [(185,cy-30),(162,cy+20),(216,cy-4),(198,cy+46)]:
        s.append(f'<circle cx="{vx}" cy="{vy}" r="12" fill="none" stroke="{GOLDD}" stroke-width="2"/><circle cx="{vx}" cy="{vy}" r="3" fill="{GOLDD}"/>')
    s.append(arrow(312,cy-66,278,cy-34,GRN,2.4,"ah")); s.append(ds.text(320,cy-70,"2 · Ca2+ enters",size=11,fill=GRN,font=ds.DISPLAY,weight="bold"))
    s.append(f'<circle cx="266" cy="{cy+10}" r="13" fill="none" stroke="{GOLDD}" stroke-width="2" stroke-dasharray="3 3"/>')
    s.append(ds.text(220,cy+104,"3 · vesicles release NT",size=11,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    nts=[(300,cy-18),(330,cy+14),(356,cy-30),(386,cy+22),(412,cy-8),(442,cy+30),(470,cy-22),(500,cy+8),(536,cy-14),(566,cy+24),(602,cy-4),(636,cy+16),(672,cy-22),(702,cy+6)]
    for nx,ny in nts: s.append(f'<circle cx="{nx}" cy="{ny}" r="5" fill="{GOLD}"/>')
    s.append(ds.text((300+post_x)/2,cy-78,"4 · neurotransmitter crosses the cleft",size=11,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text((300+post_x)/2,cy-62,"(the synaptic cleft)",size=9.5,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(f'<path d="M{post_x} {cy-95} q -120 0 -130 95 q 10 95 130 95 Z" fill="{GOLD}" fill-opacity="0.13" stroke="{GOLD}" stroke-width="2.5"/>')
    s.append(ds.text(post_x+6,cy-110,"POST-SYNAPTIC NEURON",size=10,fill=GOLDD,font=ds.DISPLAY,weight="bold",spacing="0.4"))
    for ry in [cy-48,cy-14,cy+22,cy+56]:
        s.append(f'<rect x="{post_x-24}" y="{ry-9}" width="20" height="18" rx="3" fill="{GOLDD}"/>')
    s.append(ds.text(post_x+40,cy+104,"5 · binds receptors, fires a new signal",size=11,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(f'<path d="M620 {cy+50} q -150 86 -330 8" fill="none" stroke="{MUT}" stroke-width="2.2" stroke-dasharray="4 4" marker-end="url(#ah)"/>')
    s.append(ds.text(430,cy+150,"6 · reuptake or breakdown ends the signal",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(ds.text(W/2,H-46,"Most psychiatric and neurological drugs act right here, on the neurotransmitters or their receptors.",size=11.5,fill=INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/66-synapse.png")

CHARTS=[omega3_index,visceral_fat,mediterranean,hearing_dementia,metabolic_flexibility]
SVGS=[four_capacities,endocrine_axes,longevity_plate,sleep_hygiene,geroprotector_matrix,hpa_axis,synapse]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
