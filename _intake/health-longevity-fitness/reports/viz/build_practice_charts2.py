#!/usr/bin/env python3
"""PRACTICE & DRUGS cluster — charts II (§10/§38/§39/§31/§30)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT; AMB="#8a6d12"
def lab(ax,x,v,f="{:.0f}",dy=0.5,fs=10):
    for xi,vi in zip(x,v): ax.text(xi,vi+dy,f.format(vi),ha="center",fontsize=fs,color=INK,fontweight="bold")

def aspree():
    cats=["CVD events","Major\nbleeding","All-cause\nmortality"]; v=[0.95,1.38,1.14]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=[MUT,WARN,WARN],width=0.58,edgecolor=ds.PAPER,linewidth=1.2)
    ax.axhline(1.0,color=INK,lw=1.2); lab(ax,x,v,"{:.2f}",dy=0.02)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,1.6)
    ax.set_ylabel("hazard ratio (aspirin vs placebo)",fontsize=10,color=MUT)
    ds.title(ax,"Prevention · §10","ASPREE: a clean 'stop' for aspirin in healthy elders",
             "No cardiovascular or survival benefit in healthy older adults — but more major bleeding and a slight mortality rise. Primary-prevention aspirin retired for most.")
    ds.footer(ax,"ASPREE, NEJM 2018","aspree-aspirin",tier="rct")
    ds.save(fig,f"{FIG}/Q01-aspree.png")

def sham_surgery():
    groups=["Knee\narthroscopy","Meniscectomy","Vertebroplasty","PCI for stable\nangina (ORBITA)"]
    real=[42,40,33,28]; sham=[40,39,32,27]
    x=np.arange(4); w=0.36
    fig,ax=ds.new_fig(9.0,5.2)
    ax.bar(x-w/2,real,w,color=GOLD,label="Real procedure",edgecolor=ds.PAPER,linewidth=1.1)
    ax.bar(x+w/2,sham,w,color="#b9ad8e",label="Sham / placebo",edgecolor=ds.PAPER,linewidth=1.1)
    ax.set_xticks(x); ax.set_xticklabels(groups,fontsize=9.6); ax.set_ylim(0,52); ax.legend(fontsize=9.5,frameon=False)
    ax.set_ylabel("improvement (indicative units)",fontsize=10,color=MUT)
    ds.title(ax,"Surgery · §38","When surgery is tested against a sham, the gap vanishes",
             "Four famous blinded trials: the real operation barely beat a fake one. A mechanism that makes sense is not proof of an outcome.")
    ds.footer(ax,"Moseley 2002; FIDELITY; Buchbinder/Kallmes; ORBITA 2018","sham-surgery",tier="rct")
    ds.save(fig,f"{FIG}/Q02-sham-surgery.png")

def bariatric():
    cats=["Medical\ntherapy","Sleeve\ngastrectomy","Gastric\nbypass"]; v=[5,23,29]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN2,GRN],width=0.6,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,38)
    ax.set_ylabel("diabetes remission at 5 years (%)",fontsize=10,color=MUT)
    ds.title(ax,"Surgery · §38","Bariatric surgery is the most effective metabolic treatment",
             "STAMPEDE: surgery beat best medical therapy for durable diabetes remission, with long-term mortality benefit (SOS). Under-used relative to its evidence.")
    ds.footer(ax,"STAMPEDE NEJM; SOS study","bariatric-outcomes",tier="rct")
    ds.save(fig,f"{FIG}/Q03-bariatric.png")

def anesthesia_mort():
    era=["1940s–60s","1970s–80s","1990s–2000s","Healthy\npatient today"]; v=[357,34,10,1]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(era))
    ax.plot(x,v,"-o",lw=3,color=GRN,markersize=8,markerfacecolor=GRN2,markeredgecolor=ds.PAPER)
    ax.set_yscale("log"); ax.set_ylim(0.5,600)
    for xi,vi in zip(x,v): ax.annotate(f"{vi}/M",(xi,vi),textcoords="offset points",xytext=(0,12),ha="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(era,fontsize=10); ax.set_ylabel("anesthesia-attributable deaths / million (log)",fontsize=9.4,color=MUT)
    ds.title(ax,"Anesthesia · §39","Anesthesia became ~300× safer in two generations",
             "From ~1 in 3,000 to ~1 in a million for healthy patients — driven by pulse oximetry, capnography, and difficult-airway algorithms. A safety-engineering triumph.")
    ds.footer(ax,"§39 §2.5 anesthesia mortality data","anesthesia-mortality-decline",tier="cohort")
    ds.save(fig,f"{FIG}/Q04-anesthesia-mortality.png")

def less_is_more():
    data=[("ARDSNet\nlow tidal volume",9),("PROSEVA\nprone positioning",17),("RECOVERY\ndexamethasone",3)]
    L=[d[0] for d in data]; v=[d[1] for d in data]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(L))
    ax.bar(x,v,color=[GRN,GRN,GRN2],width=0.56,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"−{:.0f} pp",dy=0.3)
    ax.set_xticks(list(x)); ax.set_xticklabels(L,fontsize=10); ax.set_ylim(0,22)
    ax.set_ylabel("absolute mortality reduction (pp)",fontsize=10,color=MUT)
    ds.title(ax,"Critical Care · §39","In the ICU, gentler often beats aggressive",
             "The big wins came from doing LESS to the patient: smaller breaths, proning, a cheap steroid. Restraint saved lives.")
    ds.footer(ax,"ARDSNet 2000; PROSEVA 2013; RECOVERY 2020","less-is-more-icu",tier="rct")
    ds.save(fig,f"{FIG}/Q05-less-is-more.png")

def gene_prices():
    data=[("Zolgensma",2.1),("Casgevy",2.2),("Hemgenix",3.5),("Lenmeldy",4.25)]
    L=[d[0] for d in data]; v=[d[1] for d in data]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(L))
    ax.bar(x,v,color=WARN,width=0.6,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"${:.2f}M",dy=0.06)
    ax.set_xticks(list(x)); ax.set_xticklabels(L,fontsize=10.5); ax.set_ylim(0,5)
    ax.set_ylabel("list price per treatment (US$ millions)",fontsize=9.6,color=MUT)
    ds.title(ax,"Regenerative · §31","Gene therapies work — at history's highest prices",
             "These are real, often one-time cures. The unsolved problem is access: a $2–4M sticker price raises hard equity and payment questions.")
    ds.footer(ax,"Manufacturer launch prices","gene-therapy-prices",tier="n/a")
    ds.save(fig,f"{FIG}/Q06-gene-prices.png")

def prp():
    cats=["PRP injection","Saline placebo"]; v=[100,98]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,"#b9ad8e"],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}",dy=1)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,130)
    ax.set_ylabel("knee pain/function improvement (index)",fontsize=9.4,color=MUT)
    ds.title(ax,"Regenerative · §31","PRP for knee osteoarthritis matches placebo",
             "Sold as 'regeneration', platelet-rich plasma performed no better than a saline injection in a blinded trial. Popular, expensive, and not supported by outcomes.")
    ds.footer(ax,"RESTORE trial, JAMA 2021","prp-vs-placebo",tier="rct")
    ds.save(fig,f"{FIG}/Q07-prp.png")

def alt_conventional():
    cats=["Conventional\ntreatment","Alternative-only\n(refused/delayed)"]; v=[78,55]
    fig,ax=ds.new_fig(8.2,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GRN,WARN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,92)
    ax.set_ylabel("5-year survival (%)",fontsize=10,color=MUT)
    ds.title(ax,"Alternative Medicine · §30","'Instead-of' is the dangerous word in cancer care",
             "Choosing alternative medicine INSTEAD OF conventional treatment more than doubled the risk of death (HR ~2.5; ~5.7 for breast). Alongside is fine; instead-of kills.")
    ds.footer(ax,"Johnson et al., JNCI 2018","alternative-vs-conventional",tier="cohort")
    ds.save(fig,f"{FIG}/Q08-alt-conventional.png")

def acupuncture():
    cats=["vs no treatment","vs sham (real needle\nplacement controlled)"]; v=[0.5,0.2]
    fig,ax=ds.new_fig(8.2,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,"#b9ad8e"],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.1f} SD",dy=0.01)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,0.62)
    ax.set_ylabel("effect size on chronic pain (SD)",fontsize=10,color=MUT)
    ds.title(ax,"Alternative Medicine · §30","Acupuncture: most of the effect is ritual",
             "Versus no treatment the effect looks decent (~0.5 SD); versus a convincing sham it shrinks to ~0.2 SD. Most of the benefit is context and expectation, a sliver is the needle.")
    ds.footer(ax,"Vickers et al., IPD meta-analysis 2018","acupuncture-effect-size",tier="meta")
    ds.save(fig,f"{FIG}/Q09-acupuncture.png")

def ayurveda():
    cats=["All Ayurvedic\nproducts","Rasa shastra\n(metal-based)"]; v=[20,40]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,WARN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"~{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,52)
    ax.set_ylabel("products with detectable heavy metals (%)",fontsize=9.2,color=MUT)
    ds.title(ax,"Alternative Medicine · §30","'Natural' is not the same as 'safe'",
             "~1 in 5 Ayurvedic products (and ~40% of metal-based rasa shastra) carried detectable lead, mercury, or arsenic. Unregulated supplements can poison.")
    ds.footer(ax,"Saper et al., JAMA 2008","ayurvedic-heavy-metals",tier="cohort")
    ds.save(fig,f"{FIG}/Q10-ayurveda-metals.png")

if __name__=="__main__":
    for fn in [aspree,sham_surgery,bariatric,anesthesia_mort,less_is_more,gene_prices,prp,alt_conventional,acupuncture,ayurveda]:
        fn(); print(fn.__name__,"ok")
