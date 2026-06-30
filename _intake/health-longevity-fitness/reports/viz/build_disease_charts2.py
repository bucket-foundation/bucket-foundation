#!/usr/bin/env python3
"""DISEASE cluster — charts II (MS, migraine, neuropathy, antipsychotics, anorexia, MDMA,
lithium, BRCA, oncogenes, CheckMate, ACHIEVE, shingles)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT; AMB="#8a6d12"
def lab(ax,x,v,f="{:.0f}",dy=0.5,fs=10):
    for xi,vi in zip(x,v): ax.text(xi,vi+dy,f.format(vi),ha="center",fontsize=fs,color=INK,fontweight="bold")

def ms_dmt():
    cats=["Anti-CD20\n(ocrelizumab)","Natalizumab","S1P\n(fingolimod)","Interferon /\nGA"]; v=[85,68,52,30]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GRN,GRN2,AMB,GOLD],width=0.62,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"~{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,100)
    ax.set_ylabel("relapse reduction vs placebo",fontsize=10,color=MUT)
    ds.title(ax,"Neurology · §24","MS: high-efficacy drugs cut relapses 70–90%",
             "More than 20 disease-modifying therapies exist. The modern strategy is 'hit hard early' with high-efficacy agents from the start.")
    ds.footer(ax,"Reich et al., NEJM 2018 (illustrative)","ms-dmt-efficacy",tier="rct")
    ds.save(fig,f"{FIG}/D15-ms-dmt.png")

def migraine():
    cats=["Erenumab","Fremanezumab","Galcanezumab","Atogepant"]; v=[2.0,2.5,2.1,1.9]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(cats))
    ax.bar(x,v,color=GOLD,width=0.6,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.1f} d",dy=0.04)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,3.2)
    ax.set_ylabel("extra migraine days/month cut vs placebo",fontsize=9.6,color=MUT)
    ds.title(ax,"Neurology · §24 §7","CGRP blockers: a real migraine advance",
             "The first preventives designed for migraine. ~2–3 fewer migraine days/month over placebo — meaningful for many, modest in absolute terms.")
    ds.footer(ax,"CGRP mAb/gepant trials (illustrative)","migraine-cgrp",tier="rct")
    ds.save(fig,f"{FIG}/D16-migraine-cgrp.png")

def neuropathy():
    data=[("TCAs (amitriptyline)",3.6),("Duloxetine",6.4),("Gabapentin",7.2),("Pregabalin",7.7)]
    L=[d[0] for d in data]; v=[d[1] for d in data]
    fig,ax=ds.new_fig(8.6,5.2); yp=list(range(len(L)))[::-1]
    ax.barh(yp,v,color=[GRN,GRN2,GOLD,GOLD],height=0.62,edgecolor=ds.PAPER,linewidth=1.1)
    for y,vi in zip(yp,v): ax.text(vi+0.12,y,f"NNT {vi:.1f}",va="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(L,fontsize=10.5); ax.set_xlim(0,9.5)
    ax.set_xlabel("NNT for 50% pain relief  (lower = better)",fontsize=10,color=MUT)
    ds.title(ax,"Neurology · §24 §8","Neuropathic pain: modest drugs, honest NNTs",
             "First-line agents help ~1 in 4–8 patients reach 50% relief. Glycemic control is the only disease-modifier; high-dose B6 can CAUSE neuropathy.")
    ds.footer(ax,"Finnerup et al., Lancet Neurol 2015","neuropathic-nnt",tier="meta")
    ds.save(fig,f"{FIG}/D17-neuropathy-nnt.png",left=0.235)

def antipsychotics():
    pts=[("Clozapine",0.88,4.5,WARN,(8,4)),("Olanzapine",0.56,3.2,WARN,(8,4)),("Risperidone",0.46,2.0,AMB,(8,4)),
         ("Aripiprazole",0.40,0.8,GRN,(8,-15)),("Haloperidol",0.49,1.15,AMB,(8,4)),("Lurasidone",0.32,0.5,GRN,(8,4))]
    fig,ax=ds.new_fig(8.6,5.4)
    for n,eff,wt,c,off in pts:
        ax.scatter(eff,wt,s=120,color=c,edgecolor=ds.PAPER,linewidth=1.3,zorder=3)
        ax.annotate(n,(eff,wt),textcoords="offset points",xytext=off,fontsize=9,color=INK,fontweight="bold")
    ax.set_xlim(0.25,1.0); ax.set_ylim(0,5.2)
    ax.set_xlabel("efficacy (standardized effect size)",fontsize=10,color=MUT); ax.set_ylabel("weight gain (kg, ~indicative)",fontsize=10,color=MUT)
    ax.annotate("more effective →\nmore metabolic harm",(0.81,4.3),fontsize=9,color=WARN,fontweight="bold",ha="center")
    ds.title(ax,"Psychiatry · §20 §4.2","Antipsychotics: efficacy and metabolic harm trade off",
             "All beat placebo, but the most effective (clozapine, olanzapine) carry the heaviest metabolic burden.")
    ds.footer(ax,"Leucht et al., Lancet 2013 (indicative)","antipsychotics-efficacy-harm",tier="meta")
    ds.save(fig,f"{FIG}/D18-antipsychotics.png")

def anorexia():
    cats=["General\npopulation","Major\ndepression","Bipolar\ndisorder","Anorexia\nnervosa"]; v=[1,1.7,2.6,5.9]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GOLD,AMB,WARN],width=0.6,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.1f}×",dy=0.1)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,7)
    ax.set_ylabel("standardized mortality ratio",fontsize=10,color=MUT)
    ds.title(ax,"Psychiatry · §20 §7.1","Anorexia nervosa is among the deadliest mental illnesses",
             "An SMR of ~5–6× — from medical complications and suicide. It is not a lifestyle choice; it is a high-mortality disorder needing real treatment.")
    ds.footer(ax,"Arcelus et al., Arch Gen Psychiatry 2011","anorexia-mortality",tier="meta")
    ds.save(fig,f"{FIG}/D19-anorexia-smr.png")

def mdma():
    cats=["Placebo +\ntherapy","MDMA +\ntherapy"]; v=[32,67]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=[ "#b9ad8e",GOLD],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,80)
    ax.set_ylabel("no longer meeting PTSD criteria",fontsize=10,color=MUT)
    ds.title(ax,"Psychiatry · §20 §6.4","MDMA-assisted therapy for PTSD: promise, then a pause",
             "Large reductions in PTSD severity in trials — but the FDA rejected approval in Aug 2024 over unblinding, data-integrity, and abuse/CV concerns.")
    ds.footer(ax,"Mitchell et al., Nat Med 2021; FDA 2024","mdma-ptsd",tier="rct")
    ds.flag(ax,"FDA rejected 2024","caution")
    ds.save(fig,f"{FIG}/D20-mdma-ptsd.png")

def lithium():
    cats=["Placebo /\nother agents","Lithium"]; v=[1.0,0.13]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=[ "#b9ad8e",GRN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.2f}",dy=0.02)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,1.2)
    ax.set_ylabel("relative suicide risk",fontsize=10,color=MUT)
    ds.title(ax,"Psychiatry · §20 §3.2","Lithium has a unique anti-suicide signal",
             "Beyond mood stabilization, lithium reduces suicide and all-cause mortality — partly independent of its effect on mood. Underused for what it does.")
    ds.footer(ax,"Cipriani et al., BMJ 2013 (meta-analysis)","lithium-anti-suicide",tier="meta")
    ds.save(fig,f"{FIG}/D21-lithium-suicide.png")

def brca():
    groups=["Breast","Ovarian"]; b1=[65,40]; b2=[55,15]
    x=np.arange(2); w=0.36
    fig,ax=ds.new_fig(8.4,5.2)
    ax.bar(x-w/2,b1,w,color=WARN,label="BRCA1",edgecolor=ds.PAPER,linewidth=1.1)
    ax.bar(x+w/2,b2,w,color=GOLD,label="BRCA2",edgecolor=ds.PAPER,linewidth=1.1)
    for xi,v in zip(x-w/2,b1): ax.text(xi,v+1,f"{v}%",ha="center",fontsize=10,color=INK,fontweight="bold")
    for xi,v in zip(x+w/2,b2): ax.text(xi,v+1,f"{v}%",ha="center",fontsize=10,color=INK,fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(groups,fontsize=12); ax.set_ylim(0,80); ax.legend(fontsize=10,frameon=False)
    ax.set_ylabel("lifetime cancer risk (%)",fontsize=10,color=MUT)
    ds.title(ax,"Oncology · §25 §2.4","BRCA1 vs BRCA2: high, actionable, but not certain",
             "These are among the few genetic findings that change management — enhanced screening and risk-reducing surgery. Penetrance is high but incomplete.")
    ds.footer(ax,"Kuchenbaecker et al., JAMA 2017","brca-lifetime-risk",tier="cohort")
    ds.save(fig,f"{FIG}/D22-brca-risk.png")

def oncogenes():
    data=[("TP53 (suppressor)",50),("KRAS",27),("PIK3CA",13),("EGFR",10),("BRAF",8),("HER2",6)]
    L=[d[0] for d in data]; v=[d[1] for d in data]
    fig,ax=ds.new_fig(8.6,5.2); yp=list(range(len(L)))[::-1]
    ax.barh(yp,v,color=[WARN,AMB,GOLD,GOLD,GOLDD,GOLDD],height=0.64,edgecolor=ds.PAPER,linewidth=1.1)
    for y,vi in zip(yp,v): ax.text(vi+0.6,y,f"~{vi}%",va="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(L,fontsize=10.5); ax.set_xlim(0,58)
    ax.set_xlabel("share of all human tumors with this mutation",fontsize=10,color=MUT)
    ds.title(ax,"Oncology · §25 §2.1","A few driver genes recur across most cancers",
             "TP53 is mutated in ~half of all tumors; RAS in ~quarter (up to ~90% of pancreatic). These shared drivers are the targets of precision oncology.")
    ds.footer(ax,"Vogelstein et al., Science 2013 (indicative)","oncogene-frequency",tier="cohort")
    ds.save(fig,f"{FIG}/D23-oncogene-frequency.png",left=0.215)

def checkmate():
    cats=["Ipilimumab\nalone","Nivolumab\nalone","Nivolumab +\nipilimumab"]; v=[26,44,52]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,GRN2,GRN],width=0.6,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,62)
    ax.set_ylabel("5-year overall survival",fontsize=10,color=MUT)
    ds.title(ax,"Oncology · §25 §5.2","Immunotherapy transformed metastatic melanoma",
             "Once near-uniformly fatal, advanced melanoma now sees ~50% alive at 5 years with checkpoint blockade — some in durable, off-treatment remission.")
    ds.footer(ax,"Larkin et al., NEJM 2019 (CheckMate-067)","checkmate-melanoma",tier="rct")
    ds.save(fig,f"{FIG}/D24-checkmate-melanoma.png")

def achieve():
    cats=["Overall\n(primary)","At-risk\nsubgroup"]; v=[3,48]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,60)
    ax.set_ylabel("slowing of cognitive decline (3 yr)",fontsize=10,color=MUT)
    ds.title(ax,"Brain & Dementia · §08 §2","Hearing aids slowed cognitive decline — in those at risk",
             "ACHIEVE was null overall but cut decline ~48% in the higher-risk subgroup. Hearing loss is a treatable lever on dementia risk.")
    ds.footer(ax,"Lin et al., Lancet 2023 (ACHIEVE)","achieve-hearing-cognition",tier="rct")
    ds.save(fig,f"{FIG}/D25-achieve-hearing.png")

def shingles():
    cats=["No shingles\nvaccine","Shingles\nvaccinated"]; v=[100,80]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,115)
    ax.set_ylabel("relative dementia incidence (index = 100)",fontsize=9.6,color=MUT)
    ds.title(ax,"Brain & Dementia · §08 §6.1","A natural experiment: shingles vaccine, less dementia",
             "A birth-date-cutoff (regression-discontinuity) study found ~20% relative / ~3.5pp absolute lower dementia in those eligible for the vaccine.")
    ds.footer(ax,"Eyting & Geldsetzer et al., Nature 2025","shingles-dementia",tier="cohort")
    ds.save(fig,f"{FIG}/D26-shingles-dementia.png")

if __name__=="__main__":
    for fn in [ms_dmt,migraine,neuropathy,antipsychotics,anorexia,mdma,lithium,brca,oncogenes,checkmate,achieve,shingles]:
        fn(); print(fn.__name__,"ok")
