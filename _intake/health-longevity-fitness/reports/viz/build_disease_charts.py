#!/usr/bin/env python3
"""DISEASE cluster — data charts (Ch 22/23/24/25/07/26/08/20/35). Illustrative; sources in footers."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT; AMB="#8a6d12"
def barlabel(ax,x,vals,fmt="{:.0f}",dy=0.5,fs=10):
    for xi,v in zip(x,vals): ax.text(xi,v+dy,fmt.format(v),ha="center",fontsize=fs,color=INK,fontweight="bold")

def direct():
    cats=["0 kg\n(none)","5–10 kg","10–15 kg","≥15 kg"]; vals=[7,34,57,86]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(cats))
    ax.bar(x,vals,color=[WARN,GOLD,GRN2,GRN],width=0.62,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"{:.0f}%")
    ax.axhline(4,ls="--",color=MUT,lw=1.5); ax.text(0.1,6,"control (no programme) ≈ 4%",fontsize=9,color=MUT)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,96)
    ax.set_xlabel("weight lost at 1 year",fontsize=10,color=MUT); ax.set_ylabel("type-2 diabetes remission (%)",fontsize=10,color=MUT)
    ds.title(ax,"Cardiometabolic · §22","Type-2 diabetes remission tracks weight lost",
             "DiRECT: a primary-care weight programme put ~46% into remission at 1 year — 86% of those who lost ≥15 kg. T2D is reversible early.")
    ds.footer(ax,"Lean et al., DiRECT, Lancet 2018/2019","direct-remission-by-weight",tier="rct")
    ds.save(fig,f"{FIG}/D01-direct-remission.png")

def hf_pillars():
    cats=["ARNI\n(PARADIGM-HF)","Beta-blocker","MRA","SGLT2i\n(DAPA-HF)"]; vals=[20,34,30,26]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(cats))
    ax.bar(x,vals,color=[GRN,GRN2,AMB,GOLD],width=0.62,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"~{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,42)
    ax.set_ylabel("relative mortality reduction",fontsize=10,color=MUT)
    ds.title(ax,"Heart Failure · §22","The four pillars of HFrEF — each cuts mortality",
             "Used together (not sequentially over years) the four drug classes are additive; modern guideline care starts all four early.")
    ds.footer(ax,"PARADIGM-HF 2014; DAPA-HF 2019; pillar meta-analyses","hf-four-pillars",tier="rct")
    ds.save(fig,f"{FIG}/D02-hf-four-pillars.png")

def cancer_survival():
    data=[("Pancreatic",13),("Lung",25),("Colorectal",65),("Breast",91),("Melanoma",94),("Prostate",97)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]
    cols=[WARN if v<30 else GOLD if v<70 else GRN2 if v<92 else GRN for v in vals]
    fig,ax=ds.new_fig(8.6,5.2); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,vals,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.1)
    for y,v in zip(yp,vals): ax.text(v+1,y,f"{v}%",va="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=11); ax.set_xlim(0,108)
    ax.set_xlabel("5-year relative survival (%)",fontsize=10,color=MUT)
    ds.title(ax,"Oncology · §25","Five-year survival varies enormously by cancer",
             "Stage at diagnosis drives most of the gap — which is why screening (where it works) and early symptoms matter so much.")
    ds.footer(ax,"ACS 2024; SEER (US relative survival)","cancer-5yr-survival",tier="cohort")
    ds.save(fig,f"{FIG}/D03-cancer-survival.png",left=0.155)

def stroke_nnt():
    cats=["Thrombectomy\n(HERMES)","Thrombolysis\n<3 h","Thrombolysis\n3–4.5 h"]; vals=[2.6,8,14]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,vals,color=[GRN,GRN2,GOLD],width=0.6,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"{:.1f}",dy=0.2)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,16)
    ax.set_ylabel("NNT for one better outcome",fontsize=10,color=MUT)
    ds.title(ax,"Stroke · §24","“Time is brain” — earlier reperfusion, lower NNT",
             "Thrombectomy is one of medicine's most effective acute treatments (NNT ≈ 2.6). Every minute of delay costs neurons — call emergency services fast.")
    ds.footer(ax,"NINDS 1995; HERMES 2016 (pooled thrombectomy)","stroke-reperfusion-nnt",tier="meta")
    ds.save(fig,f"{FIG}/D04-stroke-nnt.png")

def amr():
    data=[("Bacterial AMR\n(associated)",4.95,WARN),("Bacterial AMR\n(direct)",1.27,WARN),
          ("Tuberculosis",1.3,GOLD),("HIV/AIDS",0.86,AMB),("Malaria",0.64,AMB)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]; cols=[d[2] for d in data]
    fig,ax=ds.new_fig(8.6,5.2); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,vals,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.1)
    for y,v in zip(yp,vals): ax.text(v+0.06,y,f"{v:.2f}M",va="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5); ax.set_xlim(0,5.6)
    ax.set_xlabel("annual deaths (millions, 2019)",fontsize=10,color=MUT)
    ds.title(ax,"Infectious Disease · §26","Antimicrobial resistance already rivals the big killers",
             "AMR was associated with ~4.95M deaths in 2019 — more than HIV and malaria combined. The slow pandemic; stewardship is the lever.")
    ds.footer(ax,"Murray et al., GRAM, Lancet 2022","amr-global-burden",tier="cohort")
    ds.save(fig,f"{FIG}/D05-amr-burden.png",left=0.185)

def herd():
    R0=np.linspace(1,18,200); thr=(1-1/R0)*100
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(R0,thr,lw=3,color=GOLD,solid_capstyle="round")
    for n,r in [("Influenza",1.3),("COVID (ancestral)",2.5),("Polio",6),("Measles",15)]:
        t=(1-1/r)*100; ax.scatter(r,t,s=60,color=GOLDD,zorder=4); ax.annotate(f"{n}\n(~{t:.0f}%)",(r,t),textcoords="offset points",xytext=(6,-4),fontsize=8.6,color=INK)
    ax.set_xlim(1,18); ax.set_ylim(0,100); ax.set_xlabel("basic reproduction number  R₀",fontsize=10,color=MUT)
    ax.set_ylabel("vaccination coverage needed (%)",fontsize=10,color=MUT)
    ds.title(ax,"Infectious Disease · §26","The more contagious, the higher the bar for herd immunity",
             "Threshold = 1 − 1/R₀. Measles (R₀ 12–18) needs ~95% coverage — which is why it's the first to come back when uptake slips.")
    ds.footer(ax,"Standard SIR threshold — §26 §4.2","herd-immunity-threshold",tier="mechanistic")
    ds.save(fig,f"{FIG}/D06-herd-immunity.png")

def antidep_severity():
    sev=np.array([0,1,2,3]); gap=np.array([0.6,1.2,2.2,3.6])
    fig,ax=ds.new_fig(8.6,5.2)
    ax.bar(sev,gap,color=[ "#b9ad8e",GOLD,GRN2,GRN],width=0.6,edgecolor=ds.PAPER,linewidth=1.2)
    ax.axhline(3,ls="--",color=WARN,lw=1.4); ax.text(0.0,3.15,"clinically meaningful difference",fontsize=9,color=WARN)
    ax.set_xticks(sev); ax.set_xticklabels(["Mild","Moderate","Severe","Very severe"],fontsize=10.5); ax.set_ylim(0,4.4)
    ax.set_ylabel("drug − placebo benefit (HDRS pts)",fontsize=10,color=MUT)
    ds.title(ax,"Psychiatry · §20","Antidepressants work — most clearly in severe depression",
             "All 21 drugs beat placebo on average; the drug–placebo gap is small in mild depression and large in severe. Match the tool to severity.")
    ds.footer(ax,"Cipriani Lancet 2018; Fournier JAMA 2010","antidepressant-by-severity",tier="meta")
    ds.save(fig,f"{FIG}/D07-antidepressant-severity.png")

def moud():
    cats=["Out of\ntreatment","In treatment\n(methadone/bup)"]; vals=[2.0,0.9]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,vals,color=[WARN,GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"{:.1f}×",dy=0.04)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,2.4)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=MUT)
    ds.title(ax,"Addiction · §35","Medication for opioid use disorder halves mortality",
             "Methadone and buprenorphine roughly halve overdose and all-cause death vs no medication. Retention is the mechanism; detox-alone is worse.")
    ds.footer(ax,"Sordo et al., BMJ 2017 (cohort meta-analysis)","moud-halves-mortality",tier="cohort")
    ds.save(fig,f"{FIG}/D08-moud-mortality.png")

def addict_matrix():
    pts=[("Tobacco",68,0.55,2600,(-2,12)),("Heroin/opioids",23,0.80,600,(8,4)),("Alcohol",22,0.42,2000,(8,-12)),
         ("Cocaine",25,0.52,700,(8,5)),("Cannabis",9,0.06,3000,(10,8)),("Psychedelics",1.5,0.05,300,(4,-14))]
    fig,ax=ds.new_fig(8.6,5.4)
    for n,dep,leth,prev,off in pts:
        ax.scatter(dep,leth,s=prev*0.18,color=GOLD,edgecolor=GOLDD,linewidth=1.4,alpha=0.85,zorder=3)
        ax.annotate(n,(dep,leth),textcoords="offset points",xytext=off,fontsize=9,color=INK,fontweight="bold")
    ax.set_xlim(0,78); ax.set_ylim(0,0.95); ax.set_xlabel("transition to dependence (%)",fontsize=10,color=MUT)
    ax.set_ylabel("lethality (relative)",fontsize=10,color=MUT)
    ds.title(ax,"Addiction · §35","Addictiveness and lethality are different axes",
             "Bubble size = population harm. Tobacco's danger is reach + dependence; opioids' is lethality. Legality tracks neither.")
    ds.footer(ax,"Lopez-Quintero 2011; composite lethality","addictiveness-vs-lethality",tier="cohort")
    ds.save(fig,f"{FIG}/D09-addictiveness-lethality.png")

def smoking_cessation():
    data=[("Varenicline",2.8),("Combination NRT",2.6),("Cytisine",2.1),("Single NRT",1.6),("Bupropion",1.6)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(labels))
    ax.bar(x,vals,color=[GRN,GRN2,AMB,GOLD,GOLD],width=0.62,edgecolor=ds.PAPER,linewidth=1.2)
    ax.axhline(1,color=INK,lw=1); barlabel(ax,x,vals,"{:.1f}×",dy=0.05)
    ax.set_xticks(list(x)); ax.set_xticklabels(labels,fontsize=9.6,rotation=12); ax.set_ylim(0,3.2)
    ax.set_ylabel("odds of quitting vs placebo",fontsize=10,color=MUT)
    ds.title(ax,"Addiction · §35","Cessation aids work — and behavioral support multiplies them",
             "Varenicline and combination NRT roughly triple quit odds. Pills + counselling beat either alone; willpower-only is the weakest plan.")
    ds.footer(ax,"Cahill Cochrane 2013; Courtney JAMA 2021","smoking-cessation-efficacy",tier="meta")
    ds.save(fig,f"{FIG}/D10-smoking-cessation.png")

def bp_lifestyle():
    data=[("DASH + low sodium",11),("DASH diet",6),("Aerobic exercise",6),("Weight (per 10 kg)",9),("Sodium reduction",4),("Limit alcohol",4)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]
    fig,ax=ds.new_fig(8.6,5.2); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,vals,color=GOLD,height=0.66,edgecolor=ds.PAPER,linewidth=1.1)
    for y,v in zip(yp,vals): ax.text(v+0.15,y,f"−{v}",va="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5); ax.set_xlim(0,13)
    ax.set_xlabel("systolic BP reduction (mm Hg)",fontsize=10,color=MUT)
    ds.title(ax,"Prevention · §07","Lifestyle moves blood pressure as much as a drug",
             "Stacked, these rival monotherapy. DASH + sodium restriction is the heaviest hitter; each ~2 mm Hg lower SBP is real risk reduction.")
    ds.footer(ax,"Appel 1997 (DASH); Sacks 2001 (DASH-Sodium)","lifestyle-bp-lowering",tier="rct")
    ds.save(fig,f"{FIG}/D11-bp-lifestyle.png",left=0.215)

def hepc():
    cats=["Interferon era\n(pre-2014)","DAA pills\n(8–12 weeks)"]; vals=[50,96]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,vals,color=[GOLD,GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,108)
    ax.set_ylabel("sustained virologic response (cure %)",fontsize=10,color=MUT)
    ds.title(ax,"Hepatology · §23","Hepatitis C went from grim to curable in a decade",
             "Direct-acting antivirals cure >95% with 8–12 weeks of well-tolerated pills. The remaining barrier is diagnosis and access, not the medicine.")
    ds.footer(ax,"Afdhal et al., NEJM 2014 (DAA trials)","hepc-interferon-to-daa",tier="rct")
    ds.save(fig,f"{FIG}/D12-hepc-cure.png")

def finger():
    dom=["Overall\ncognition","Executive\nfunction","Processing\nspeed","Memory"]; vals=[25,83,150,40]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(dom))
    ax.bar(x,vals,color=[GRN,GRN2,GOLD,AMB],width=0.62,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"+{:.0f}%",dy=2)
    ax.set_xticks(list(x)); ax.set_xticklabels(dom,fontsize=10); ax.set_ylim(0,170)
    ax.set_ylabel("benefit vs control (%)",fontsize=10,color=MUT)
    ds.title(ax,"Brain & Dementia · §08","A multidomain lifestyle program improved cognition",
             "FINGER (diet + exercise + cognitive training + vascular care) beat control across domains over 2 years — the multidomain approach, not any single lever.")
    ds.footer(ax,"Ngandu et al., FINGER, Lancet 2015","finger-multidomain",tier="rct")
    ds.save(fig,f"{FIG}/D13-finger.png")

def lecanemab():
    fig,ax=ds.new_fig(8.6,5.2)
    cats=["Benefit:\ncognitive slowing","Harm:\nARIA-E (edema)","Harm:\nARIA-H (bleed)"]; vals=[27,12.6,17.3]
    cols=[GRN,WARN,WARN]; x=range(len(cats))
    ax.bar(x,vals,color=cols,width=0.6,edgecolor=ds.PAPER,linewidth=1.2)
    barlabel(ax,x,vals,"{:.1f}%",dy=0.5)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,32)
    ax.set_ylabel("percent",fontsize=10,color=MUT)
    ds.title(ax,"Brain & Dementia · §08","Lecanemab: a real but marginal benefit, with real risks",
             "~27% slowing (CDR-SB −0.45, near the clinical-importance threshold) bought against 12–17% brain-edema/bleed rates. A first step, not a cure.")
    ds.footer(ax,"van Dyck et al., NEJM 2023 (CLARITY-AD)","lecanemab-benefit-vs-aria",tier="rct")
    ds.save(fig,f"{FIG}/D14-lecanemab.png")

if __name__=="__main__":
    for fn in [direct,hf_pillars,cancer_survival,stroke_nnt,amr,herd,antidep_severity,moud,
               addict_matrix,smoking_cessation,bp_lifestyle,hepc,finger,lecanemab]:
        fn(); print(fn.__name__,"ok")
