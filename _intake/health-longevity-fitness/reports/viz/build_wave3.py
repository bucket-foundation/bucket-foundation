#!/usr/bin/env python3
"""Wave 3 figures. Charts (matplotlib) + matrices/diagrams (SVG) on the design system."""
import os, sys, math, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
def arrowdefs():
    out="".join(f'<marker id="{n}" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="{c}"/></marker>' for n,c in [("ah",ds.GOLD_D),("ar","#b5471f")])
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.4,m="ah"):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" marker-end="url(#{m})"/>'

# ---- CHARTS ----
def apob_cumulative():
    age=np.arange(20,81)
    low=np.cumsum(np.full_like(age,1.0,dtype=float)); high=np.cumsum(np.full_like(age,1.9,dtype=float))
    fig,ax=ds.new_fig(8.6,5.2)
    thr=70
    ax.axhline(thr,color="#b5471f",ls="--",lw=1.6); ax.text(21,thr+3,"disease threshold",fontsize=10,color="#b5471f",fontweight="bold")
    ax.plot(age,high,color="#b5471f",lw=3,label="high lifetime apoB"); ax.plot(age,low,color="#1d6b2e",lw=3,label="low lifetime apoB")
    # mark crossings
    hx=age[np.argmax(high>=thr)]; ax.scatter([hx],[thr],s=80,color="#b5471f",zorder=5); ax.text(hx,thr-9,f"event ~{hx}",fontsize=9.5,color="#b5471f",ha="center")
    ax.set_ylim(0,130); ax.set_xlabel("age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("cumulative arterial cholesterol burden",fontsize=10,color=ds.MUT)
    ax.legend(loc="upper left",fontsize=9.5)
    ds.title(ax,"Clinical Prevention","apoB is causal — and exposure is cumulative",
             "It's the area under the curve over a lifetime. Lower, earlier beats lower, later.")
    ds.footer(ax,"Ference et al. (Mendelian + RCT consensus) — illustrative trajectories","ldl-apob-causal-ascvd",tier="meta")
    ds.save(fig,f"{FIG}/32-apob-cumulative.png")

def protein_dose():
    x=[0.4,0.8,1.2,1.6,2.0,2.4]; y=[40,66,86,97,99,100]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(x,y,"-",color=ds.GOLD,lw=3,zorder=3); ax.scatter(x,y,s=70,color=ds.GOLD_D,zorder=4,edgecolor=ds.PAPER,linewidth=1.4)
    ax.axvline(1.6,color="#1d6b2e",ls=":",lw=1.6); ax.text(1.66,55,"plateau ~1.6 g/kg",fontsize=10,color="#1d6b2e",fontweight="bold")
    ax.set_ylim(0,108); ax.set_xlabel("daily protein (g per kg body-weight)",fontsize=10,color=ds.MUT); ax.set_ylabel("muscle-building response (% of max)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Nutrition","Protein gains plateau around 1.6 g/kg",
             "~1.6 g/kg covers the muscle-building response; more isn't more (food first).")
    ds.footer(ax,"Morton et al., Br J Sports Med 2018 — meta-analysis","protein-leucine-threshold",tier="meta")
    ds.save(fig,f"{FIG}/33-protein-dose.png")

def resting_hr():
    cats=["< 60","60–69","70–79","≥ 80"]; hr=[1.00,1.13,1.32,1.59]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    cols=["#1d6b2e","#8a6d12","#c2693a","#b5471f"]
    ax.bar(xp,hr,width=0.6,color=cols,edgecolor=ds.PAPER,linewidth=1.4)
    for i,h in zip(xp,hr): ax.text(i,h+0.02,f"{h:.2f}",ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,1.75); ax.grid(axis="x",visible=False)
    ax.set_xlabel("resting heart rate (bpm)",fontsize=10,color=ds.MUT); ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Measurement","A low resting heart rate is the clean consumer win",
             "Accurate on any wearable AND predictive — every +10 bpm ≈ +10–20% mortality. (A readout to track.)")
    ds.footer(ax,"Zhang et al., CMAJ 2016 — meta-analysis","resting-hr-mortality",tier="meta")
    ds.flag(ax,"a predictor of risk","caution")
    ds.save(fig,f"{FIG}/34-resting-hr.png",bottom=0.18)

def glp1_outcomes():
    labels=["Body weight\n(STEP-1)","Major CV events\n(SELECT)","Kidney failure\n(FLOW)","Heart-failure sx\n(STEP-HFpEF)"]
    vals=[15,20,24,17]
    fig,ax=ds.new_fig(8.8,5.2); xp=range(len(labels))
    ax.bar(xp,vals,width=0.6,color=ds.GOLD_D,edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,vals): ax.text(i,v+0.5,f"−{v}%",ha="center",fontsize=12,color="#1d6b2e",fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(labels,fontsize=9.5); ax.set_ylim(0,28); ax.grid(axis="x",visible=False)
    ax.set_ylabel("reduction vs placebo (%)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Pharmacology · the 2024–26 story","GLP-1 drugs — the real outcome data",
             "Semaglutide cut major cardiovascular events 20% in non-diabetics (SELECT). Watch the muscle-loss caveat.")
    ds.footer(ax,"STEP-1 · SELECT · FLOW · STEP-HFpEF (NEJM 2021–24)","glp1-cardiovascular-outcomes",tier="rct")
    ds.save(fig,f"{FIG}/35-glp1-outcomes.png",bottom=0.2)

def statin_nnt():
    fig,ax=ds.new_fig(8.6,5.2)
    cats=["Secondary prevention\n(already had an event)","Primary prevention\n(low baseline risk)"]; nnt=[39,167]
    xp=range(len(cats)); ax.bar(xp,nnt,width=0.5,color=["#1d6b2e","#b9ad8e"],edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,nnt): ax.text(i,v+4,f"NNT ≈ {v}",ha="center",fontsize=12,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,190); ax.grid(axis="x",visible=False)
    ax.set_ylabel("number needed to treat (5 yrs, 1 event)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Pharmacology","Statins: the benefit depends entirely on your risk",
             "Powerful after an event (low NNT); marginal for low-risk primary prevention. Same drug, different value.")
    ds.footer(ax,"Cholesterol Treatment Trialists' Collaboration meta-analyses","statin-nnt-by-risk",tier="meta")
    ds.save(fig,f"{FIG}/36-statin-nnt.png",bottom=0.2)

# ---- MATRICES / INFOGRAPHICS (SVG) ----
def _verdict_matrix(name, kicker, title_h, sub, src, claim, rows):
    W,H=1000,80+len(rows)*48+70
    head,y0,foot=ds.panel(W,H,kicker,title_h,sub,src,claim)
    s=[head]
    s.append(ds.text(40,y0+2,"INTERVENTION",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    s.append(ds.text(360,y0+2,"WHAT THE EVIDENCE SAYS",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    s.append(ds.text(W-150,y0+2,"VERDICT",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(nm,note,verd,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,nm,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(360,yy+rh/2+4,note,size=10.5,fill=ds.INK,font=ds.BODY))
        b,_=ds.badge(W-150,yy+rh/2-9,verd,c,h=18,size=8.5); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/{name}")

def biohacking_matrix():
    R="#b5471f";A="#c08a1e";G="#1d6b2e"
    rows=[("Red-light / PBM","narrow real effects (some skin, pain); whole-body-longevity unproven","PARTIAL",A),
          ("Hyperbaric O2","approved indications real; the telomere/longevity claim is a tiny single-arm study","HYPE",R),
          ("Whole-body cryotherapy","no added benefit proven over cold water; marketing-led","HYPE",R),
          ("IV drips / NAD IV","no outcome evidence; placebo + cost","HYPE",R),
          ("Peptides (BPC-157 etc.)","almost no human data; unregulated; GH-axis ones run against longevity","HYPE",R),
          ("Grounding / structured water","fringe biophysics; speculative, no outcomes","HYPE",R),
          ("Methylene blue","interesting mechanism; no human longevity evidence; dose risk","HYPE",R),
          ("CGM for the healthy","accurate sensor; no outcome RCT in non-diabetics","HYPE",R),
          ("Cold plunge 'for longevity'","great for mood/alertness; metabolic data used hours of mild cold","PARTIAL",A),
          ("Creatine / omega-3 / vit-D","the evidence-backed 'biohacks' (see supplements)","REAL",G)]
    _verdict_matrix("37-biohacking-matrix.png","Biohacking · graded","Biohacks — what survives the evidence",
        "Index-all, grade-all. Most are a real mechanism marketed as a human outcome.","§Biohacking & Fringe","biohacking-verdicts",rows)

def cam_matrix():
    R="#b5471f";A="#c08a1e";G="#1d6b2e"
    rows=[("Acupuncture","small effects for some pain/nausea; large placebo; sham often = real","PARTIAL",A),
          ("Herbal (St John's Wort)","works for mild depression — but interacts with many drugs","REAL / caution",G),
          ("Herbal (most others)","peppermint/IBS & ginger/nausea real; most are weak or null","PARTIAL",A),
          ("TCM / Ayurveda","some compounds have pharmacology; the systems' theories aren't biology","PARTIAL",A),
          ("Chiropractic (SMT)","modest for acute back pain ≈ other therapies; neck-manip stroke risk","PARTIAL",A),
          ("Homeopathy","implausible + no effect beyond placebo — settled","NO EFFECT",R),
          ("Reiki / energy healing","placebo-level; no detectable mechanism","NO EFFECT",R),
          ("Naturopathy / 'functional'","good lifestyle advice mixed with unproven testing/treatments","MIXED",A)]
    _verdict_matrix("38-cam-matrix.png","Complementary medicine · graded","CAM — honestly graded, by indication",
        "The grade is the neutrality: fringe & mainstream on one list, separated by evidence.","§Complementary Medicine","cam-verdicts",rows)

def evidence_ladder():
    W,H=820,720
    head,y0,foot=ds.panel(W,H,"How every claim is graded","The Evidence Ladder",
        "Ten rungs from proof to speculation. The grade is the whole point.","§How to read this manual","evidence-ladder")
    s=[head]
    rungs=[("meta","systematic review of RCTs","meta"),("rct","randomized human trial","rct"),
           ("cohort","prospective observational","cohort"),("case-control / cross-sectional","weaker observational","cross-sectional"),
           ("mechanistic","plausible human/animal mechanism","mechanistic"),("animal","model organism only","animal"),
           ("in-vitro","cells / tissue only","in-vitro"),("n=1","self-experiment","n=1"),
           ("anecdotal","testimonial","anecdotal"),("speculative","hypothesis stated as such","speculative")]
    n=len(rungs); top=y0+18; rh=(H-66-top)/n; bw=520
    for i,(lab,desc,tier) in enumerate(rungs):
        yy=top+i*rh; x=60+i*((W-120-bw)/(n-1)); c=ds.TIER.get(tier,ds.FAINT)
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="{bw}" height="{rh-7:.0f}" rx="6" fill="{c}"/>')
        s.append(ds.text(x+14,yy+(rh-7)/2+5,lab,size=13,fill="white",font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x+bw-12,yy+(rh-7)/2+5,desc,size=10.5,fill="white",font=ds.BODY,anchor="end"))
    s.append(ds.text(60,H-46,"↑ stronger — closer to proof",size=10.5,fill="#1d6b2e",font=ds.BODY,weight="600"))
    s.append(ds.text(W-60,H-46,"weaker — closer to a guess ↓",size=10.5,fill="#b5471f",font=ds.BODY,weight="600",anchor="end"))
    s.append(foot); ds.render("".join(s), f"{FIG}/39-evidence-ladder.png")

def weekly_program():
    W,H=1020,520
    head,y0,foot=ds.panel(W,H,"Start Here · the minimum-effective week","One week that touches everything",
        "Strength · aerobic base · intervals · mobility · recovery. The best plan is the one you keep.","§Start Here","minimum-effective-week")
    s=[head]
    days=[("MON","Strength","squat · push · carry","#b5471f"),("TUE","Zone 2","45–60 min easy","#1d6b2e"),
          ("WED","Mobility +\nbalance","10 min","#3a6ea5"),("THU","Strength","hinge · pull","#b5471f"),
          ("FRI","Intervals","4×4 min hard","#8a6d12"),("SAT","Long easy","a sport / hike","#1d6b2e"),
          ("SUN","Rest","walk · sauna","#b9ad8e")]
    gx=40; cw=(W-80)/7; gy=y0+20; ch=H-y0-130
    for i,(d,t,sub,c) in enumerate(days):
        x=gx+i*cw
        s.append(f'<rect x="{x+5:.0f}" y="{gy}" width="{cw-10:.0f}" height="{ch:.0f}" rx="9" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x+5:.0f}" y="{gy}" width="{cw-10:.0f}" height="28" rx="0" fill="{c}"/>')
        s.append(ds.text(x+cw/2,gy+19,d,size=12,fill="white",font=ds.DISPLAY,weight="800",anchor="middle"))
        for k,ln in enumerate(t.split("\n")): s.append(ds.text(x+cw/2,gy+58+k*16,ln,size=12.5,fill=ds.INK2,font=ds.DISPLAY,weight="700",anchor="middle"))
        s.append(ds.text(x+cw/2,gy+ch-24,sub,size=9.8,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    s.append(ds.text(gx,H-58,"Every day: morning light · protein at meals · ~7 h sleep on a regular schedule · stand & walk often.",
                     size=11.5,fill=ds.INK,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s), f"{FIG}/40-weekly-program.png")

def atherosclerosis_cascade():
    W,H=1020,440
    head,y0,foot=ds.panel(W,H,"Cardiovascular disease · the mechanism","How apoB builds a heart attack",
        "Why lifelong-low apoB is the lever — it's the particle that starts the whole cascade.","§Clinical Prevention","atherosclerosis-apob-cascade")
    s=[head, arrowdefs()]
    steps=[("apoB particles","in the blood"),("Enter & lodge","in the artery wall"),("Retained &\noxidized","trigger inflammation"),
           ("Foam cells","→ fatty plaque"),("Plaque grows","narrows the artery"),("Rupture","→ clot → heart attack")]
    n=len(steps); bw=132; bh=70; gap=(W-100-n*bw)/(n-1); x=50; cy=y0+70
    cols=["#1d6b2e","#8a6d12","#c2693a","#b5471f","#b5471f","#9c2f14"]
    for i,(t,d) in enumerate(steps):
        xx=x+i*(bw+gap)
        s.append(f'<rect x="{xx:.0f}" y="{cy-bh/2:.0f}" width="{bw}" height="{bh}" rx="9" fill="{ds.CARD}" stroke="{cols[i]}" stroke-width="1.8"/>')
        for k,ln in enumerate(t.split("\n")): s.append(ds.text(xx+bw/2,cy-6+k*15,ln,size=12,fill=cols[i],font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(xx+bw/2,cy+ (10 if "\n" not in t else 24),d,size=9.5,fill=ds.MUT,font=ds.BODY,anchor="middle"))
        if i<n-1: s.append(arrow(xx+bw,cy,xx+bw+gap-4,cy,ds.MUT,2,"ah"))
    s.append(ds.text(50,H-58,"The lever is at step 1: fewer apoB particles, across a whole life. Every later step is downstream.",
                     size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/41-atherosclerosis-cascade.png")

def metabolic_syndrome():
    W,H=900,640
    head,y0,foot=ds.panel(W,H,"Cardiometabolic · the central hub","Metabolic Syndrome — any 3 of 5",
        "The cluster upstream of diabetes & heart disease. Insulin resistance ties it together.","§Disease Atlas I","metabolic-syndrome-criteria")
    s=[head]
    cx,cy,R=W/2,y0+ (H-104-y0)/2,120
    crit=[("Waist","≥102 cm M / 88 cm W"),("Triglycerides","≥150 mg/dL"),("HDL","<40 M / 50 W"),("Blood pressure","≥130/85"),("Fasting glucose","≥100 mg/dL")]
    n=len(crit)
    for i,(t,v) in enumerate(crit):
        ang=-math.pi/2+i*2*math.pi/n; ex,ey=cx+math.cos(ang)*R,cy+math.sin(ang)*R
        px,py=cx+math.cos(ang)*(R+96),cy+math.sin(ang)*(R+58)
        s.append(f'<line x1="{cx+math.cos(ang)*64:.0f}" y1="{cy+math.sin(ang)*64:.0f}" x2="{ex:.0f}" y2="{ey:.0f}" stroke="{ds.GOLD}" stroke-width="2"/>')
        s.append(f'<circle cx="{ex:.0f}" cy="{ey:.0f}" r="8" fill="{ds.GOLD}"/>')
        s.append(f'<rect x="{px-86:.0f}" y="{py-22:.0f}" width="172" height="44" rx="8" fill="{ds.CARD}" stroke="{ds.GOLD}" stroke-width="1.5"/>')
        s.append(ds.text(px,py-3,t,size=13,fill=ds.INK2,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(px,py+15,v,size=10,fill=ds.MUT,font=ds.MONO,anchor="middle"))
    s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="60" fill="{ds.INK2}"/>')
    s.append(ds.text(cx,cy-6,"3 of 5",size=18,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(ds.text(cx,cy+14,"= diagnosis",size=10,fill="#cda23f",font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/42-metabolic-syndrome.png")

CHARTS=[apob_cumulative,protein_dose,resting_hr,glp1_outcomes,statin_nnt]
SVGS=[biohacking_matrix,cam_matrix,evidence_ladder,weekly_program,atherosclerosis_cascade,metabolic_syndrome]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
