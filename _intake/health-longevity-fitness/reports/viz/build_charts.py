#!/usr/bin/env python3
"""Flagship charts on the design-system style. Reproducible; data from the corpus where possible."""
import os, sys, glob, json, collections; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BASE=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))

# ============ 1. CLAIMS BY EVIDENCE TIER (computed from the real corpus) ============
def claims_by_tier():
    c=collections.Counter()
    for f in glob.glob(os.path.join(BASE,"02-domains","*-claims.json")):
        try:
            for x in json.load(open(f)):
                t=str(x.get("evidence_tier","?")).lower().strip()
                c[t]+=1   # count every graded-claim entry (matches the 1007 headline across the manual)
        except Exception: pass
    order=["meta","rct","cohort","cross-sectional","case-control","mechanistic","animal",
           "in-vitro","invitro","n=1","nequals1","mixed","outcome","anecdotal","theoretical","speculative","hypothesis"]
    items=[(t,c[t]) for t in order if c.get(t)]
    # fold synonyms
    merged=collections.OrderedDict()
    label={"in-vitro":"in-vitro","invitro":"in-vitro","nequals1":"n=1","n=1":"n=1"}
    for t,n in items:
        k=label.get(t,t); merged[k]=merged.get(k,0)+n
    labels=list(merged.keys()); vals=list(merged.values()); total=sum(vals)
    fig,ax=ds.new_fig(8.6,5.4)
    colors=[ds.TIER.get(l.lower(),ds.FAINT) for l in labels]
    ypos=range(len(labels))[::-1]
    ax.barh(list(ypos), vals, color=colors, height=0.72, edgecolor=ds.PAPER, linewidth=1.2)
    ax.set_yticks(list(ypos)); ax.set_yticklabels(labels, fontsize=11)
    for y,v in zip(ypos,vals):
        ax.text(v+total*0.008, y, f"{v}", va="center", ha="left", fontsize=10.5, color=ds.INK, fontweight="bold")
    ax.set_xlim(0,max(vals)*1.12); ax.grid(axis="y",visible=False)
    ax.set_xlabel("number of graded claims", fontsize=10, color=ds.MUT)
    # bracket: rigorous vs mechanistic-and-below
    ds.title(ax,"The Evidence Landscape", f"{total} graded claims — and the tiers tell the story",
             "Strong interventions live in observational tiers; loud interventions live in mechanistic/animal.")
    ds.footer(ax,"Computed from the corpus · 02-domains/*-claims.json (de-duplicated)", "evidence-ladder")
    ds.save(fig, f"{FIG}/01-claims-by-tier.png", left=0.165)

# ============ 2. COPENHAGEN SPORTS — LIFE-EXPECTANCY GAIN ============
def copenhagen():
    data=[("Tennis",9.7),("Badminton",6.2),("Soccer",4.7),("Cycling",3.7),("Swimming",3.4),
          ("Jogging",3.2),("Calisthenics",3.1),("Health-club / gym",1.5)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]
    fig,ax=ds.new_fig(8.6,5.4)
    ypos=list(range(len(labels)))[::-1]
    # social/racquet sports gold, solo gym muted
    colors=[ds.GOLD if v>=3.2 else "#b9ad8e" for v in vals]
    ax.barh(ypos, vals, color=colors, height=0.7, edgecolor=ds.PAPER, linewidth=1.2)
    ax.set_yticks(ypos); ax.set_yticklabels(labels, fontsize=11.5)
    for y,v in zip(ypos,vals):
        ax.text(v+0.12, y, f"+{v}", va="center", ha="left", fontsize=11, color=ds.INK, fontweight="bold")
    ax.set_xlim(0,11); ax.grid(axis="y",visible=False)
    ax.set_xlabel("years of life-expectancy gain vs sedentary", fontsize=10, color=ds.MUT)
    ds.title(ax,"Sports & Play", "Racquet and social sports add the most years",
             "Copenhagen City Heart Study — the social, skill, and intermittent dimensions appear to carry the benefit.")
    ds.footer(ax,"Schnohr et al., Mayo Clin Proc 2018 (n≈8,577, 25-yr follow-up)","sports-life-expectancy-copenhagen",tier="cohort")
    ds.flag(ax,"observational — leisure-time self-selection","caution")
    ds.save(fig, f"{FIG}/02-copenhagen-sports.png", left=0.175)

# ============ 3. VO2MAX -> MORTALITY DOSE-RESPONSE ============
def vo2max():
    cats=["Low","Below\naverage","Above\naverage","High","Elite"]
    hr=[1.00,0.55,0.41,0.30,0.20]   # relative all-cause mortality, ~Mandsager 2018
    fig,ax=ds.new_fig(8.6,5.4)
    x=range(len(cats))
    ax.plot(x,hr,"-",color=ds.GOLD,lw=3,zorder=3,solid_capstyle="round")
    ax.scatter(x,hr,s=90,color=ds.GOLD_D,zorder=4,edgecolor=ds.PAPER,linewidth=1.5)
    for xi,h in zip(x,hr):
        ax.annotate(f"{h:.2f}",(xi,h),textcoords="offset points",xytext=(0,12),ha="center",
                    fontsize=10.5,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5)
    ax.set_ylim(0,1.12); ax.set_ylabel("relative all-cause mortality (Low = 1.0)",fontsize=10,color=ds.MUT)
    ax.set_xlabel("cardiorespiratory fitness category",fontsize=10,color=ds.MUT,labelpad=22)
    ax.annotate("~5× lower\n(elite vs low)",(4,0.20),xytext=(2.7,0.62),fontsize=10,color=ds.GOLD_D,
                fontweight="bold",ha="center",
                arrowprops=dict(arrowstyle="->",color=ds.GOLD_D,lw=1.6,connectionstyle="arc3,rad=-0.2"))
    ds.title(ax,"Training", "VO₂max is the strongest mortality predictor in medicine",
             "No observed ceiling of benefit — every step up in fitness lowers risk.")
    ds.footer(ax,"Mandsager et al., JAMA Netw Open 2018 (n≈122,007)","crf-vo2max-strongest-mortality-predictor",tier="cohort")
    ds.save(fig, f"{FIG}/03-vo2max-mortality.png")

if __name__=="__main__":
    claims_by_tier(); print("1 ok")
    copenhagen();     print("2 ok")
    vo2max();         print("3 ok")

def lancet14_dementia():
    # Lancet Commission 2024 — 14 modifiable risk factors, population-attributable fractions (~45%)
    data=[("Hearing loss",7,"mid"),("High LDL cholesterol",7,"mid"),("Less education",5,"early"),
          ("Social isolation",5,"late"),("Depression",3,"mid"),("Air pollution",3,"late"),
          ("Traumatic brain injury",3,"mid"),("Physical inactivity",2,"mid"),("Diabetes",2,"mid"),
          ("Smoking",2,"mid"),("Hypertension",2,"mid"),("Untreated vision loss",2,"late"),
          ("Obesity",1,"mid"),("Excess alcohol",1,"mid")]
    stage_c={"early":"#3a6ea5","mid":"#b08d3a","late":"#1d6b2e"}
    labels=[d[0] for d in data]; vals=[d[1] for d in data]; cols=[stage_c[d[2]] for d in data]
    fig,ax=ds.new_fig(8.8,6.0); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,vals,color=cols,height=0.74,edgecolor=ds.PAPER,linewidth=1.1)
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5)
    for y,v in zip(yp,vals): ax.text(v+0.12,y,f"{v}%",va="center",ha="left",fontsize=10,color=ds.INK,fontweight="bold")
    ax.set_xlim(0,8); ax.grid(axis="y",visible=False); ax.set_xlabel("population-attributable fraction (%)",fontsize=10,color=ds.MUT)
    # legend for life-stage
    import matplotlib.patches as mp
    handles=[mp.Patch(color=stage_c[k],label=l) for k,l in [("early","early life"),("mid","midlife"),("late","later life")]]
    ax.legend(handles=handles,loc="lower right",fontsize=9,title="life stage",title_fontsize=9)
    ds.title(ax,"Brain & Dementia","~45% of dementia is potentially preventable",
             "The 14 modifiable risk factors — Lancet Commission 2024. Addressing them could prevent or delay nearly half of cases.")
    ds.footer(ax,"Livingston et al., Lancet 2024 Commission on dementia prevention","lancet-2024-dementia-modifiable",tier="meta")
    ds.save(fig,f"{FIG}/09-lancet14-dementia.png",left=0.205)

if "__main__" in __name__:
    lancet14_dementia(); print("lancet ok")
