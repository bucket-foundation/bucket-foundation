#!/usr/bin/env python3
"""PRACTICE/TEST-PERFORMANCE/PEDIATRIC/DERM charts (Ch 41/40/28/27/43/21)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT; AMB="#8a6d12"
def lab(ax,x,v,f="{:.0f}",dy=0.5,fs=10):
    for xi,vi in zip(x,v): ax.text(xi,vi+dy,f.format(vi),ha="center",fontsize=fs,color=INK,fontweight="bold")

def ppv_curve():
    prev=np.logspace(-4,-0.3,200)
    fig,ax=ds.new_fig(8.8,5.4)
    for ss,c,lb in [(0.99,GRN,"99% / 99%"),(0.95,GOLD,"95% / 95%"),(0.90,WARN,"90% / 90%")]:
        sens=spec=ss; ppv=sens*prev/(sens*prev+(1-spec)*(1-prev))*100
        ax.plot(prev*100,ppv,lw=2.8,color=c,label=lb)
    ax.set_xscale("log"); ax.set_xlim(0.01,50); ax.set_ylim(0,100)
    ax.axvline(0.1,ls=":",color=MUT,lw=1); ax.text(0.105,86,"1-in-1,000\nscreening",fontsize=8.6,color=MUT)
    ax.axvline(10,ls=":",color=MUT,lw=1); ax.text(10.3,40,"1-in-10\nclinic",fontsize=8.6,color=MUT)
    ax.set_xlabel("disease prevalence / pre-test probability (%)",fontsize=10,color=MUT)
    ax.set_ylabel("positive predictive value (%)",fontsize=10,color=MUT); ax.legend(fontsize=9,title="sens / spec",frameon=False)
    ds.title(ax,"Test Performance · §41","Same test, opposite meaning — PPV depends on prevalence",
             "Even a 99%/99% test gives a ~9% PPV at 1-in-1,000 prevalence. Screening low-prevalence populations floods you with false positives.")
    ds.footer(ax,"Bayes' theorem — §41 §A.4","ppv-vs-prevalence",tier="mechanistic")
    ds.save(fig,f"{FIG}/P01-ppv-prevalence.png")

def refrange():
    n=np.arange(1,31); p=(1-0.95**n)*100
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(n,p,lw=3,color=GOLD,solid_capstyle="round")
    for nn,t in [(14,"14 analytes\n≈ 51%"),(20,"20 analytes\n≈ 64%")]:
        pp=(1-0.95**nn)*100; ax.scatter(nn,pp,s=55,color=GOLDD,zorder=4); ax.annotate(t,(nn,pp),textcoords="offset points",xytext=(6,-22),fontsize=9,color=INK,fontweight="bold")
    ax.set_xlim(1,30); ax.set_ylim(0,80); ax.set_xlabel("number of independent lab analytes",fontsize=10,color=MUT)
    ax.set_ylabel("chance of ≥1 'abnormal' flag (%)",fontsize=10,color=MUT)
    ds.title(ax,"Test Performance · §41","Why healthy people 'fail' a big lab panel",
             "Reference ranges flag the outer 5% by definition. Order enough tests and ≥1 false flag becomes near-certain: 1 − 0.95ⁿ. The flag is a statistical artifact.")
    ds.footer(ax,"§41 §A.7 reference-range math","reference-range-false-positive",tier="mechanistic")
    ds.save(fig,f"{FIG}/P02-reference-range.png")

def roc():
    fig,ax=ds.new_fig(8.0,5.6)
    x=np.linspace(0,1,200)
    ax.plot([0,1],[0,1],ls="--",color=MUT,lw=1.5,label="AUC 0.5 (useless)")
    for k,c,l in [(2.2,GOLD,"AUC ~0.75 (modest)"),(6,GRN,"AUC ~0.90 (excellent)")]:
        y=x**(1/k); ax.plot(x,y,lw=2.8,color=c,label=l)
    ax.set_xlim(0,1); ax.set_ylim(0,1.02); ax.set_xlabel("1 − specificity (false-positive rate)",fontsize=10,color=MUT)
    ax.set_ylabel("sensitivity (true-positive rate)",fontsize=10,color=MUT); ax.legend(fontsize=9,loc="lower right",frameon=False)
    ds.title(ax,"Test Performance · §41","The ROC curve — and the threshold is a policy choice",
             "Area under the curve summarizes discrimination across all thresholds. Where you SET the threshold trades false positives against false negatives.")
    ds.footer(ax,"§41 §A.6","roc-auc",tier="mechanistic")
    ds.save(fig,f"{FIG}/P03-roc-curve.png")

def dose_ti():
    d=np.linspace(-2,3,200)
    eff=100/(1+10**(-(d-0.0)*1.4)); tox=100/(1+10**(-(d-1.4)*1.4))
    fig,ax=ds.new_fig(8.8,5.4)
    ax.plot(d,eff,lw=3,color=GRN,label="Benefit"); ax.plot(d,tox,lw=3,color=WARN,label="Toxicity")
    ax.axvspan(0,1.4,color=GOLD,alpha=0.12); ax.text(0.7,50,"therapeutic\nwindow",ha="center",fontsize=10,color=GOLDD,fontweight="bold")
    ax.set_xlim(-2,3); ax.set_ylim(0,105); ax.set_xticks([]); ax.set_xlabel("log dose →",fontsize=10,color=MUT)
    ax.set_ylabel("% maximal response",fontsize=10,color=MUT); ax.legend(fontsize=9.5,loc="center left",frameon=False)
    ds.title(ax,"Pharmacology · §28","Every drug has a window — “the dose makes the poison”",
             "Benefit and toxicity are both dose-response curves. The gap between them is the therapeutic index — wide for penicillin, razor-thin for warfarin, lithium, digoxin.")
    ds.footer(ax,"§28 §A.1.4 therapeutic index","dose-response-therapeutic-index",tier="mechanistic")
    ds.save(fig,f"{FIG}/P04-dose-therapeutic-index.png")

def half_life():
    t=np.linspace(0,30,300)
    css=1-0.5**(t/4.0); wash=None
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(t,css*100,lw=3,color=GOLD)
    tw=np.linspace(0,20,200); ax.plot(tw+30,100*0.5**(tw/4.0),lw=3,color=GOLDD)
    for k in range(1,6): ax.axvline(k*4,ls=":",color=MUT,lw=0.8)
    ax.axhline(95,ls="--",color=GRN,lw=1.2); ax.text(1,97,"~95% of steady state",fontsize=8.8,color=GRN)
    ax.set_xlim(0,50); ax.set_ylim(0,108); ax.set_xlabel("time (half-lives ≈ every 4 units)",fontsize=10,color=MUT)
    ax.set_ylabel("drug concentration (% of steady state)",fontsize=9.6,color=MUT)
    ax.text(14,40,"repeat dosing →\nplateau",fontsize=9,color=GOLDD); ax.text(36,55,"stop →\nwashout",fontsize=9,color=GOLDD)
    ds.title(ax,"Pharmacology · §28","It takes ~4–5 half-lives to plateau (and to wash out)",
             "On regular dosing a drug climbs to steady state over ~5 half-lives — and clears over the same. A loading dose just gets you there faster.")
    ds.footer(ax,"§28 §A.2.4 steady state","half-life-steady-state",tier="mechanistic")
    ds.save(fig,f"{FIG}/P05-half-life.png")

def radiation():
    data=[("Dental / DEXA",0.005),("Chest X-ray",0.02),("Mammogram",0.4),("CAC score",1.0),
          ("Head CT",2.0),("Background (1 yr)",3.0),("Chest CT",6.0),("Abdo/pelvis CT",9.0),("FDG-PET/CT",20.0)]
    L=[d[0] for d in data]; v=[d[1] for d in data]
    cols=[GRN if x<1 else GOLD if x<5 else WARN for x in v]
    fig,ax=ds.new_fig(8.8,5.6); yp=list(range(len(L)))[::-1]
    ax.barh(yp,v,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.0)
    ax.set_xscale("log")
    for y,vi in zip(yp,v): ax.text(vi*1.15,y,f"{vi:g} mSv",va="center",fontsize=9.6,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(L,fontsize=10); ax.set_xlim(0.003,40)
    ax.set_xlabel("effective dose (mSv, log scale)",fontsize=10,color=MUT)
    ds.title(ax,"Imaging · §40","Radiation dose, in context",
             "A chest X-ray ≈ a few days of background radiation; a PET/CT ≈ several years. Worth it when it answers a real clinical question.")
    ds.footer(ax,"§40 §40.3.1 dose table","radiation-dose-context",tier="mechanistic")
    ds.save(fig,f"{FIG}/P06-radiation-dose.png",left=0.195)

def spine_mri():
    age=np.array([20,30,40,50,60,70,80])
    deg=np.array([37,52,68,80,88,93,96]); bulge=np.array([30,40,50,60,69,77,84]); prot=np.array([29,31,33,36,38,40,43])
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(age,deg,lw=2.8,color=WARN,label="Disc degeneration"); ax.plot(age,bulge,lw=2.8,color=GOLD,label="Disc bulge"); ax.plot(age,prot,lw=2.8,color=GRN,label="Disc protrusion")
    ax.set_xlim(20,80); ax.set_ylim(0,100); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("prevalence in PAIN-FREE people (%)",fontsize=9.6,color=MUT); ax.legend(fontsize=9,loc="lower right",frameon=False)
    ds.title(ax,"Pain & Injury · §21","Spine 'abnormalities' are normal — in people with no pain",
             "Most disc findings on MRI are age-related and present in people without any back pain — 'wrinkles on the inside'. Imaging early often finds incidental noise.")
    ds.footer(ax,"Brinjikji et al., AJNR 2015","spine-mri-asymptomatic",tier="cohort")
    ds.save(fig,f"{FIG}/P07-spine-mri.png")

def amd():
    groups=["Avoided vision loss\n(lost <15 letters)","Gained ≥15 letters"]; sham=[62,5]; drug=[95,34]
    x=np.arange(2); w=0.36
    fig,ax=ds.new_fig(8.6,5.2)
    ax.bar(x-w/2,sham,w,color="#b9ad8e",label="Sham",edgecolor=ds.PAPER,linewidth=1.1)
    ax.bar(x+w/2,drug,w,color=GRN,label="Anti-VEGF",edgecolor=ds.PAPER,linewidth=1.1)
    for xi,v in zip(x-w/2,sham): ax.text(xi,v+1,f"{v}%",ha="center",fontsize=10,color=INK,fontweight="bold")
    for xi,v in zip(x+w/2,drug): ax.text(xi,v+1,f"{v}%",ha="center",fontsize=10,color=INK,fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(groups,fontsize=10); ax.set_ylim(0,108); ax.legend(fontsize=10,frameon=False)
    ax.set_ylabel("patients (%)",fontsize=10,color=MUT)
    ds.title(ax,"Eye · §27","Anti-VEGF transformed wet macular degeneration",
             "Once a fast road to central blindness, wet AMD is now controllable: ~95% avoid significant vision loss; a third actually gain. Sudden distortion = same-week eye exam.")
    ds.footer(ax,"Rosenfeld et al., NEJM 2006 (MARINA)","anti-vegf-amd",tier="rct")
    ds.save(fig,f"{FIG}/P08-amd-antivegf.png")

def all_cure():
    yr=[1960,1970,1980,1990,2000,2010,2020]; cure=[2,30,55,70,82,88,90]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(yr,cure,"-o",lw=3,color=GRN,markersize=7,markerfacecolor=GRN2,markeredgecolor=ds.PAPER)
    ax.set_xlim(1958,2022); ax.set_ylim(0,100); ax.set_xlabel("year",fontsize=10,color=MUT)
    ax.set_ylabel("5-year survival (%)",fontsize=10,color=MUT)
    ds.title(ax,"Pediatric Oncology · §43","Childhood leukemia: from ~0% to ~90% cured",
             "Acute lymphoblastic leukemia was near-uniformly fatal in 1960. Decades of cooperative multi-agent trials made it one of medicine's great success stories.")
    ds.footer(ax,"Inaba/Greaves/Mullighan, Lancet 2013","childhood-all-cure",tier="cohort")
    ds.save(fig,f"{FIG}/P09-all-cure.png")

def myopia():
    cats=["Usual\nactivity","+40 min/day\noutdoor"]; v=[40,30]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,50)
    ax.set_ylabel("new myopia over 3 years (%)",fontsize=10,color=MUT)
    ds.title(ax,"Eye · §27","Outdoor time protects children's eyes",
             "A school cluster-RCT cut new myopia with ~40 extra minutes of outdoor class time a day — bright light → retinal dopamine → less axial elongation. Aim for ~2 h/day.")
    ds.footer(ax,"He et al., JAMA 2015 (Guangzhou)","myopia-outdoor-time",tier="rct")
    ds.save(fig,f"{FIG}/P10-myopia-outdoor.png")

def glaucoma():
    cats=["Untreated\n(control)","IOP-lowering\ntreatment"]; v=[62,45]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN],width=0.52,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,75)
    ax.set_ylabel("glaucoma progression at 6 years (%)",fontsize=9.6,color=MUT)
    ds.title(ax,"Eye · §27","Lowering eye pressure preserves sight in glaucoma",
             "EMGT: lowering intraocular pressure cut progression from 62% to 45%. IOP is both the predictor AND a proven lever — and glaucoma is silent until late. Get screened.")
    ds.footer(ax,"Heijl et al., Arch Ophthalmol 2002 (EMGT)","glaucoma-iop",tier="rct")
    ds.save(fig,f"{FIG}/P11-glaucoma.png")

def fluoride():
    cats=["No fluoride","1000 ppm","1450 ppm"]; v=[0,23,28]
    fig,ax=ds.new_fig(8.2,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN2,GRN],width=0.58,edgecolor=ds.PAPER,linewidth=1.2); lab(ax,x,v,"−{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,36)
    ax.set_ylabel("caries reduction vs no fluoride",fontsize=10,color=MUT)
    ds.title(ax,"Dental · §27","Fluoride toothpaste works — and it's dose-dependent",
             "≥1000 ppm cuts cavities ~24%; higher helps a little more. Spit out the excess and skip the water rinse to keep the fluoride on the teeth; cut down on sugar frequency.")
    ds.footer(ax,"Marinho Cochrane 2003; Walsh 2019","fluoride-caries",tier="meta")
    ds.save(fig,f"{FIG}/P12-fluoride.png")

def ct_burden():
    cats=["Childhood-CT\nexcess cancer","Projected US cancers\n(~93M scans/yr)"]; v=[24,5]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,WARN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2)
    ax.text(0,24.6,"+24% relative",ha="center",fontsize=10,color=INK,fontweight="bold")
    ax.text(1,5.6,"~5% of US cancers\n(~103k/yr, modelled)",ha="center",fontsize=9.5,color=INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,30); ax.set_yticks([])
    ds.title(ax,"Imaging · §40","CT saves lives — and carries a real, modelled cancer cost",
             "Childhood CT raises later cancer risk; population models attribute ~5% of US cancers to CT. These are modelled estimates, and a reason to scan only when it changes care.")
    ds.footer(ax,"Mathews 2013; Smith-Bindman 2025 (modelled)","ct-cancer-burden",tier="cohort")
    ds.save(fig,f"{FIG}/P13-ct-burden.png")

if __name__=="__main__":
    for fn in [ppv_curve,refrange,roc,dose_ti,half_life,radiation,spine_mri,amd,all_cure,myopia,glaucoma,fluoride,ct_burden]:
        fn(); print(fn.__name__,"ok")
