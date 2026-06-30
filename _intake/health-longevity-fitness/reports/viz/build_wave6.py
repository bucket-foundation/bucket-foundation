#!/usr/bin/env python3
"""Wave 6 figures."""
import os, sys, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
def arrowdefs():
    out="".join(f'<marker id="{n}" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="{c}"/></marker>' for n,c in [("ah",ds.GOLD_D),("ar","#b5471f"),("ag","#1d6b2e")])
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.2,m="ah"):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" marker-end="url(#{m})"/>'

def _bars(name,kicker,title_h,sub,src,claim,tier,cats,vals,colors,ylabel,fmt="{:.2f}",ymax=None,flag=None,bottom=0.195):
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    ax.bar(xp,vals,width=0.6,color=colors,edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,vals): ax.text(i,v+(max(vals)*0.015),fmt.format(v),ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,ymax or max(vals)*1.15); ax.grid(axis="x",visible=False)
    ax.set_ylabel(ylabel,fontsize=10,color=ds.MUT)
    ds.title(ax,kicker,title_h,sub)
    ds.footer(ax,src,claim,tier=tier)
    if flag: ds.flag(ax,flag,"caution")
    ds.save(fig,f"{FIG}/{name}",bottom=bottom)

def bp_sprint(): _bars("67-bp-sprint.png","Cardiovascular · blood pressure","Lower blood-pressure targets save lives",
    "SPRINT: intensive (<120) vs standard (<140) systolic — fewer events and deaths.",
    "SPRINT, NEJM 2015 (n=9,361)","sprint-intensive-bp",tier="rct",
    cats=["CV events","all-cause death","heart failure"],vals=[25,27,38],colors=[ds.GOLD_D,ds.GOLD_D,ds.GOLD_D],
    ylabel="risk reduction vs standard (%)",fmt="−{:.0f}%",ymax=46,bottom=0.18)
def hba1c_risk():
    x=[5.0,5.5,6.0,6.5,7.0,7.5]; y=[1.0,1.05,1.16,1.34,1.6,1.95]
    fig,ax=ds.new_fig(8.6,5.0); ax.plot(x,y,"-o",color=ds.GOLD,lw=3,markerfacecolor=ds.GOLD_D)
    ax.axvspan(5.7,6.4,color="#f3ecd2",zorder=0); ax.text(6.05,1.8,"pre-\ndiabetes",ha="center",fontsize=9.5,color="#8a6d12",fontweight="bold")
    ax.set_ylim(0.9,2.1); ax.set_xlabel("HbA1c (%)",fontsize=10,color=ds.MUT); ax.set_ylabel("relative cardiovascular risk",fontsize=10,color=ds.MUT)
    ds.title(ax,"Metabolic","Risk rises across the 'normal' HbA1c range",
             "Glycemic risk is continuous — it climbs well before the diabetes cutoff (6.5%).")
    ds.footer(ax,"Pooled cohort data — HbA1c & CVD","hba1c-predicts-cvd-nondiabetic",tier="cohort")
    ds.save(fig,f"{FIG}/68-hba1c-risk.png")
def lpa_risk(): _bars("69-lpa-risk.png","Measurement · a once-in-life test","Lp(a): genetic, stable, causal",
    "~20% of people carry high Lp(a). Measure it ONCE — it barely changes across life.",
    "Kamstrup / Clarke — Mendelian + cohort","lpa-causal-genetic-cvd",tier="cohort",
    cats=["Low","Normal","High","Very high"],vals=[1.0,1.0,1.5,2.6],colors=["#1d6b2e","#5e8a3a","#c2693a","#b5471f"],
    ylabel="relative cardiovascular risk",ymax=3.0,bottom=0.18)
def cac_risk(): _bars("70-cac-risk.png","Cardiovascular · risk stratification","The coronary calcium score",
    "A CAC of zero is a powerful 'all-clear'; a high score reclassifies risk upward.",
    "MESA & pooled CAC cohorts","cac-score-risk",tier="cohort",
    cats=["0\n(zero)","1–100","100–400","> 400"],vals=[0.4,1.0,2.5,4.5],colors=["#1d6b2e","#8a6d12","#c2693a","#b5471f"],
    ylabel="relative CV-event risk",ymax=5.2,bottom=0.2)
def zone2_vs_hiit():
    cats=["Zone 2\n(base)","HIIT /\n4×4","Both\n(polarized)"]; vals=[10,14,17]
    _bars("71-zone2-hiit.png","Training · the cardio question","Both Zone 2 and HIIT raise VO₂max",
      "The 'uniquely optimal' claims are overstated — a polarized mix wins. Do what you'll keep doing.",
      "Pooled training meta-analyses (illustrative)","conflict-zone2-optimal-mito",tier="meta",
      cats=cats,vals=vals,colors=[ds.GOLD,ds.GOLD_D,"#1d6b2e"],ylabel="VO₂max improvement (%)",fmt="+{:.0f}%",ymax=21,bottom=0.2)
def bone_tscore(): _bars("72-bone-tscore.png","Bone · fracture risk","Bone density and fracture risk",
    "A fall + low bone density = a fracture, and a hip fracture is a mortality event in the old.",
    "DXA T-score & fracture cohorts","dexa-bmd-predicts-fracture",tier="cohort",
    cats=["Normal\n(> −1)","Osteopenia\n(−1 to −2.5)","Osteoporosis\n(< −2.5)"],vals=[1.0,2.0,4.0],
    colors=["#1d6b2e","#c2693a","#b5471f"],ylabel="relative fracture risk",ymax=4.6,bottom=0.2)
def immunosenescence():
    age=[20,30,40,50,60,70,80]; naive=[100,88,74,60,46,34,24]; func=[100,96,90,82,72,60,48]
    fig,ax=ds.new_fig(8.6,5.0)
    ax.plot(age,naive,"-o",color="#3a6ea5",lw=2.6,label="naive T-cells (respond to NEW threats)")
    ax.plot(age,func,"-o",color=ds.GOLD_D,lw=2.6,label="overall immune function")
    ax.set_ylim(0,110); ax.set_xlabel("age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("% of young-adult level",fontsize=10,color=ds.MUT); ax.legend(fontsize=9.5,loc="lower left")
    ds.title(ax,"Immune system","Immunosenescence — the aging immune system",
             "The thymus shrinks; naive T-cells dwindle. Why the old respond worse to new infections & vaccines.")
    ds.footer(ax,"Immune-aging cohort data (illustrative)","immunosenescence",tier="cohort")
    ds.save(fig,f"{FIG}/73-immunosenescence.png")

# ---- SVG ----
def screening_by_age():
    W,H=1020,520
    head,y0,foot=ds.panel(W,H,"Clinical prevention · the calendar","What to check, by decade",
        "Screening earns its place at the right age. A rough, talk-to-your-clinician map.","§Clinical Prevention","screening-by-age")
    s=[head]
    decades=[("20s–30s","BP · once: Lp(a) · mental health · STIs · cervical (HPV)"),
             ("40s","+ apoB/lipids · HbA1c · skin · (consider CAC) · breast (~40)"),
             ("50s","+ colorectal (45–50) · lung CT if smoker · shingles vaccine · bone baseline (women)"),
             ("60s","+ DXA bone · hearing & vision · cognition · pneumococcal/RSV vaccine"),
             ("70s+","focus: function, falls, deprescribing — screen less, support more")]
    ax_x=60; ty=y0+30; lh=(H-90-ty)/len(decades)
    s.append(f'<line x1="{ax_x}" y1="{ty}" x2="{ax_x}" y2="{ty+lh*(len(decades)-1)+6}" stroke="{ds.GOLD}" stroke-width="3"/>')
    for i,(d,txt) in enumerate(decades):
        yy=ty+i*lh
        s.append(f'<circle cx="{ax_x}" cy="{yy}" r="8" fill="{ds.GOLD_D}"/>')
        s.append(ds.text(ax_x+24,yy-4,d,size=14,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(ax_x+24,yy+16,txt,size=11.5,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/74-screening-by-age.png")

def blood_panel():
    rows=[("apoB","the causal lipid risk metric — act on it","#1d6b2e","TIER A"),
          ("Lp(a)","genetic CV risk — measure once","#1d6b2e","TIER A"),
          ("HbA1c","3-month glucose average","#1d6b2e","TIER A"),
          ("Fasting insulin / HOMA-IR","earliest metabolic warning","#1d6b2e","TIER A"),
          ("Blood pressure (home)","the #1 attributable risk","#1d6b2e","TIER A"),
          ("hsCRP","inflammation marker — NOT a treatment target","#c08a1e","TIER B"),
          ("CBC, ferritin, B12, TSH","catch anemia, iron, thyroid","#c08a1e","TIER B"),
          ("Vitamin D","treat only if deficient","#c08a1e","TIER B"),
          ("'Biological age' clocks","not a validated personal scorecard","#b5471f","SKIP")]
    W,H=1000,80+len(rows)*46+70
    head,y0,foot=ds.panel(W,H,"Measurement · the blood draw that matters","The high-signal blood panel",
        "A short, cheap list beats the 80-marker 'executive panel'. Causal & early-warning first.","§Pathology / What-To-Track","blood-panel")
    s=[head]
    for t,x in [("MARKER",40),("WHAT IT TELLS YOU",340),("",W-150)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(m,note,c,verd) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,m,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(340,yy+rh/2+4,note,size=11,fill=ds.INK,font=ds.BODY))
        b,_=ds.badge(W-150,yy+rh/2-9,verd,c,h=18,size=8.5); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/75-blood-panel.png")

def cancer_treatment():
    rows=[("Surgery","cut it out — first-line for solid tumors caught early","curative when local","#1d6b2e"),
          ("Radiation","targeted DNA damage to kill local tumor","local control / cure","#1d6b2e"),
          ("Chemotherapy","systemic cytotoxic drugs","cures some (testicular, ALL, Hodgkin)","#5e8a3a"),
          ("Targeted therapy","blocks a specific driver mutation","dramatic if the target is present","#5e8a3a"),
          ("Immunotherapy","unleashes the immune system (checkpoint)","the revolution — but only some respond","#5e8a3a"),
          ("CAR-T","engineered T-cells","striking in some blood cancers","#3a6ea5"),
          ("Hormone therapy","starves hormone-driven tumors","breast / prostate","#5e8a3a")]
    W,H=1020,80+len(rows)*46+70
    head,y0,foot=ds.panel(W,H,"Oncology · the toolkit","How cancer is actually treated",
        "Five-plus modalities, often combined. Cure for some; control or palliation for others.","§Oncology","cancer-treatment-modalities")
    s=[head]
    for t,x in [("MODALITY",40),("WHAT IT IS",320),("",W-200)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(m,what,note,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,m,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(320,yy+rh/2+4,what,size=10.5,fill=ds.INK,font=ds.BODY))
        s.append(ds.text(W-200,yy+rh/2+4,note,size=10,fill=c,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/76-cancer-treatment.png")

def vaccine_schedule():
    W,H=1020,470
    head,y0,foot=ds.panel(W,H,"Infectious disease · adult vaccines","The adult vaccine schedule",
        "Underrated longevity medicine. Beyond childhood — the ones that matter as you age.","§Infectious Disease","adult-vaccine-schedule")
    s=[head]
    rows=[("Influenza","every year","all adults — also cuts CV events"),
          ("COVID-19","per guidance","esp. older / higher-risk"),
          ("Tdap / Td","every 10 yr","tetanus, diphtheria, pertussis"),
          ("Shingles (Shingrix)","age 50+","+ the dementia-risk signal"),
          ("Pneumococcal","age 65+ (or risk)","pneumonia, sepsis"),
          ("RSV","age 60–75+","newly available"),
          ("HPV","through ~26 (up to 45)","prevents cervical & other cancers")]
    ry=y0+16; rh=(H-58-ry)/len(rows)
    for i,(v,when,note) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(46,yy+rh/2+4,v,size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
        b,_=ds.badge(330,yy+rh/2-9,when,ds.GOLD_D,h=18,size=9); s.append(b)
        s.append(ds.text(540,yy+rh/2+4,note,size=11,fill=ds.MUT,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/77-vaccine-schedule.png")

def insulin_resistance():
    W,H=1020,420
    head,y0,foot=ds.panel(W,H,"Metabolic · the central dysfunction","How insulin resistance develops",
        "The hub upstream of type-2 diabetes and much of metabolic disease — and it's largely reversible.","§Disease Atlas I","insulin-resistance-pathway")
    s=[head, arrowdefs()]
    steps=[("Excess calories\n+ inactivity","#cdbf9a"),("Fat spills into\nliver & muscle","#b08d3a"),
           ("Cells resist\ninsulin's signal","#c2693a"),("Pancreas makes\nMORE insulin","#b5471f"),
           ("Beta-cells\nexhaust","#9c2f14"),("Type 2\ndiabetes","#7a1f0a")]
    n=len(steps); bw=140; gap=(W-100-n*bw)/(n-1); x=50; cy=y0+70
    for i,(t,c) in enumerate(steps):
        xx=x+i*(bw+gap)
        s.append(f'<rect x="{xx:.0f}" y="{cy-34:.0f}" width="{bw}" height="68" rx="9" fill="{ds.CARD}" stroke="{c}" stroke-width="1.8"/>')
        for k,ln in enumerate(t.split("\n")): s.append(ds.text(xx+bw/2,cy-6+k*16,ln,size=11.5,fill=c if i>1 else ds.INK,font=ds.DISPLAY,weight="700",anchor="middle"))
        if i<n-1: s.append(arrow(xx+bw,cy,xx+bw+gap-4,cy,ds.MUT,2,"ah"))
    s.append(ds.text(50,H-54,"Reversible early: weight loss, muscle, movement, and metabolic-health levers can turn it around (DiRECT).",
                     size=11.5,fill="#1d6b2e",font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/78-insulin-resistance.png")

def inflammation_paths():
    W,H=1020,470
    head,y0,foot=ds.panel(W,H,"Immune · the two faces of inflammation","Acute heals · chronic harms",
        "Inflammation is protective when it resolves — and corrosive when it smoulders ('inflammaging').","§Immune System","inflammation-acute-chronic")
    s=[head, arrowdefs()]
    midx=W/2; sx=110
    s.append(f'<rect x="{sx-10}" y="{y0+70}" width="180" height="54" rx="9" fill="{ds.CARD}" stroke="{ds.MUT}" stroke-width="1.6"/>')
    s.append(ds.text(sx+80,y0+95,"Trigger",size=14,fill=ds.INK2,font=ds.DISPLAY,weight="800",anchor="middle"))
    s.append(ds.text(sx+80,y0+113,"injury · infection · stress",size=9.5,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    # acute path (top, green)
    s.append(arrow(sx+170,y0+85,midx-10,y0+50,"#1d6b2e",2.2,"ag"))
    s.append(f'<rect x="{midx}" y="{y0+24}" width="360" height="54" rx="9" fill="#e9f3ea" stroke="#1d6b2e" stroke-width="1.6"/>')
    s.append(ds.text(midx+18,y0+48,"ACUTE — resolves",size=14,fill="#1d6b2e",font=ds.DISPLAY,weight="800"))
    s.append(ds.text(midx+18,y0+67,"clears the threat, repairs, then SHUTS OFF (resolvins)",size=10.5,fill=ds.INK,font=ds.BODY))
    # chronic path (bottom, red)
    s.append(arrow(sx+170,y0+110,midx-10,y0+150,"#b5471f",2.2,"ar"))
    s.append(f'<rect x="{midx}" y="{y0+124}" width="360" height="74" rx="9" fill="#fbf0ea" stroke="#b5471f" stroke-width="1.6"/>')
    s.append(ds.text(midx+18,y0+148,"CHRONIC — smoulders",size=14,fill="#b5471f",font=ds.DISPLAY,weight="800"))
    s.append(ds.text(midx+18,y0+167,"never resolves → 'inflammaging'",size=10.5,fill=ds.INK,font=ds.BODY))
    s.append(ds.text(midx+18,y0+184,"drives heart disease, diabetes, dementia, cancer",size=10,fill=ds.MUT,font=ds.BODY))
    s.append(ds.text(50,H-54,"Levers that lower chronic inflammation: don't smoke, move, sleep, lose visceral fat, treat gum disease.",
                     size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/79-inflammation-paths.png")

def prevention_by_decade():
    W,H=1000,500
    head,y0,foot=ds.panel(W,H,"The lifespan · what to prioritize when","Build → defend → maintain",
        "Same levers, shifting emphasis by decade. It's never too early or too late to start.","§Life Stages","prevention-by-decade")
    s=[head]
    cols=[("20s–30s","BUILD THE PEAK","#1d6b2e",["max out bone & muscle","build VO₂max & habits","don't smoke; protect sleep","Lp(a) once"]),
          ("40s–50s","DEFEND IT","#b08d3a",["lipids/apoB & BP in check","keep training hard","start screening","metabolic health"]),
          ("60s+","MAINTAIN FUNCTION","#b5471f",["resistance + power + balance","protein up; protect muscle","falls & bone","cognition, hearing, vision"])]
    cw=(W-80-2*24)/3; gx,gy=40,y0+14; ch=H-y0-80
    for i,(d,t,c,items) in enumerate(cols):
        x=gx+i*(cw+24)
        s.append(f'<rect x="{x:.0f}" y="{gy}" width="{cw:.0f}" height="{ch:.0f}" rx="12" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x:.0f}" y="{gy}" width="{cw:.0f}" height="48" rx="0" fill="{c}"/>')
        s.append(ds.text(x+cw/2,gy+21,d,size=13,fill="white",font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(x+cw/2,gy+39,t,size=10.5,fill="#fff",font=ds.BODY,weight="600",anchor="middle"))
        for k,it in enumerate(items):
            s.append(f'<circle cx="{x+24}" cy="{gy+78+k*40}" r="3.5" fill="{c}"/>'); s.append(ds.text(x+38,gy+82+k*40,it,size=11.5,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/80-prevention-by-decade.png")

CHARTS=[bp_sprint,hba1c_risk,lpa_risk,cac_risk,zone2_vs_hiit,bone_tscore,immunosenescence]
SVGS=[screening_by_age,blood_panel,cancer_treatment,vaccine_schedule,insulin_resistance,inflammation_paths,prevention_by_decade]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
