#!/usr/bin/env python3
"""BODY cluster — data charts (Ch 13/14/16/17/18/42). Illustrative shapes; sources in footers."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mp
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; WARN="#b5471f"; GOLD=ds.GOLD; GOLD_D=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT

def hormone_age():
    age=np.arange(20,81)
    fig,ax=ds.new_fig(8.8,5.4)
    T=100*(1-0.0105*(age-20))
    E=np.where(age<48,100.0,np.where(age<52,100-85*(age-48)/4,15.0))
    D=100*np.exp(-0.026*(age-20))
    IR=100*(1+0.013*(age-20))
    EC=100*(1+0.0075*(age-20))
    for y,c,l in [(T,GOLD_D,"Testosterone (~1%/yr)"),(E,WARN,"Estrogen (menopause cliff)"),
                  (D,GOLD,"DHEA / GH–IGF-1"),(IR,BLUE,"Insulin resistance ↑"),(EC,"#8a6d12","Evening cortisol ↑")]:
        ax.plot(age,y,lw=2.6,color=c,label=l,solid_capstyle="round")
    ax.axhline(100,ls=":",color=MUT,lw=1)
    ax.set_xlim(20,80); ax.set_ylim(0,190); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("% of young-adult level",fontsize=10,color=MUT)
    ax.legend(fontsize=8.4,loc="upper left",ncol=1,frameon=False)
    ds.title(ax,"Endocrine System","Hormones don't fall uniformly — some rise",
             "Set-points drift with age: sex/anabolic hormones decline; insulin resistance and evening cortisol climb.")
    ds.footer(ax,"Illustrative composite — §13 endocrine aging table","hormone-change-with-age",tier="cohort")
    ds.save(fig,f"{FIG}/B01-hormone-age.png",left=0.105)

def igf1_u():
    x=np.linspace(-2.2,2.2,200); y=0.80+0.13*x**2+0.02*x
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(x,y,lw=3,color=GOLD,solid_capstyle="round")
    ax.axvspan(-2.2,-0.7,color=GRN,alpha=0.10); ax.axvspan(1.0,2.2,color=WARN,alpha=0.10)
    ax.annotate("Laron / low-IGF-1\nlongevity-favorable",(-1.4,0.80+0.13*1.4**2-0.2),xytext=(-1.9,1.25),
                fontsize=9,color=GRN,fontweight="bold")
    ax.annotate("“boost GH”\npushes the WRONG way",(1.5,0.80+0.13*1.5**2),xytext=(0.1,1.30),fontsize=9,color=WARN,
                fontweight="bold",arrowprops=dict(arrowstyle="->",color=WARN,lw=1.5,connectionstyle="arc3,rad=0.2"))
    ax.set_xlim(-2.2,2.2); ax.set_ylim(0.6,1.55)
    ax.set_xlabel("IGF-1 level (low → high)",fontsize=10,color=MUT); ax.set_ylabel("relative mortality",fontsize=10,color=MUT)
    ax.set_xticks([]);
    ds.title(ax,"Endocrine System","IGF-1 and mortality form a U — more is not better",
             "Both very low and very high IGF-1 carry risk; the growth–longevity trade-off the supplement market ignores.")
    ds.footer(ax,"Illustrative — §13 §7 growth–longevity trade-off","igf1-u-shaped-mortality",tier="cohort")
    ds.save(fig,f"{FIG}/B02-igf1-u-curve.png")

def apoe():
    cats=["ε3/ε3\n(baseline)","ε2/ε4","ε3/ε4","ε4/ε4"]; vals=[1.0,2.6,3.2,11.6]
    cols=[ "#b9ad8e",GOLD,GOLD_D,WARN]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,vals,color=cols,width=0.62,edgecolor=ds.PAPER,linewidth=1.2)
    for xi,v in zip(x,vals): ax.text(xi,v+0.25,f"{v:g}×",ha="center",fontsize=11,color=INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,13)
    ax.set_ylabel("Alzheimer's odds ratio (vs ε3/ε3)",fontsize=10,color=MUT)
    ds.title(ax,"Genetics","APOE risk is gene-dose — but risk ≠ destiny",
             "One ε4 allele ~2–3×, two ~8–12× the odds. Most ε4 carriers never develop Alzheimer's; lifestyle still moves it.")
    ds.footer(ax,"Illustrative ORs — §18 §A.2.1 APOE gene-dose","apoe-gene-dose-risk",tier="cohort")
    ds.flag(ax,"odds ratio (a population figure)","caution")
    ds.save(fig,f"{FIG}/B03-apoe-gene-dose.png")

def fev1():
    age=np.arange(25,81); ns=100-0.42*(age-25)
    sm=100-0.95*(age-25)
    q=np.where(age<=45,100-0.95*(age-25),(100-0.95*(45-25))-0.45*(age-45))
    fig,ax=ds.new_fig(8.8,5.4)
    ax.plot(age,ns,lw=2.8,color=GRN,label="Never smoked")
    ax.plot(age,sm,lw=2.8,color=WARN,label="Smoker")
    ax.plot(age,q,lw=2.8,color=GOLD,ls=(0,(1,1)),label="Quit at 45 (slope resets)")
    ax.axhline(35,ls=":",color=MUT,lw=1); ax.text(26,37,"disability threshold",fontsize=8.5,color=MUT)
    ax.axvline(45,ls=":",color=GOLD_D,lw=1)
    ax.set_xlim(25,80); ax.set_ylim(20,105); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("FEV₁ (% of value at 25)",fontsize=10,color=MUT); ax.legend(fontsize=9,loc="lower left",frameon=False)
    ds.title(ax,"Respiratory System","Quitting resets the slope — the loss isn't recovered",
             "Fletcher–Peto: smokers decline ~2× faster; stopping returns the rate of loss to a never-smoker's, from wherever you are.")
    ds.footer(ax,"After Fletcher & Peto, BMJ 1977","fev1-fletcher-peto",tier="cohort")
    ds.save(fig,f"{FIG}/B04-fev1-fletcher-peto.png",left=0.105)

def egfr():
    age=np.arange(30,86); g=np.where(age<40,100.0,100-0.95*(age-40))
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(age,g,lw=3,color=GOLD,solid_capstyle="round")
    ax.axhspan(60,120,color=GRN,alpha=0.07); ax.axhspan(15,60,color=GOLD,alpha=0.08); ax.axhspan(0,15,color=WARN,alpha=0.10)
    ax.axhline(60,ls=":",color=GOLD_D,lw=1); ax.text(31,62,"CKD threshold (eGFR 60)",fontsize=8.6,color=GOLD_D)
    ax.set_xlim(30,85); ax.set_ylim(0,105); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("eGFR (mL/min/1.73m²)",fontsize=10,color=MUT)
    ds.title(ax,"Renal System","Kidney filtration falls ~1 point a year after 40",
             "eGFR is the silent decline — you can lose half your function before any symptom. It's a predictor; the levers are upstream (BP, glucose).")
    ds.footer(ax,"Illustrative — §17 §2.2 eGFR decline","egfr-decline-age",tier="cohort")
    ds.save(fig,f"{FIG}/B05-egfr-decline.png")

def ovarian_reserve():
    ageT=[0,13,25,37,45,51]; cnt=[1.5e6,4e5,1.6e5,3.5e4,1.0e4,1.0e3]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(ageT,cnt,"-o",color=GOLD,lw=2.6,markersize=7,markerfacecolor=GOLD_D,markeredgecolor=ds.PAPER)
    ax.set_yscale("log"); ax.set_xlim(0,60); ax.set_ylim(3e2,3e6)
    ax.set_xlabel("age (years)",fontsize=10,color=MUT); ax.set_ylabel("primordial follicles (log)",fontsize=10,color=MUT)
    for a,c,t in [(0,1.5e6,"~1–2M at birth"),(13,4e5,"~400k puberty"),(37,3.5e4,"steep fall after mid-30s"),(51,1e3,"~0 at menopause")]:
        off=(-150,-2) if a==51 else (6,10)
        ax.annotate(t,(a,c),textcoords="offset points",xytext=off,fontsize=8.6,color=INK)
    ds.title(ax,"Reproductive System","Ovarian reserve only ever falls — quality fastest after 35",
             "The follicle pool is fixed at birth and declines lifelong; both count and egg quality drop sharply in the mid-30s.")
    ds.footer(ax,"Illustrative — §42 §1 ovarian reserve","ovarian-reserve-lifespan",tier="cohort")
    ds.save(fig,f"{FIG}/B06-ovarian-reserve.png",left=0.125)

def ivf_age():
    bands=["<35","35–37","38–40","41–42",">42"]; own=[46,38,25,12,4]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(bands))
    ax.bar(x,own,color=GOLD,width=0.6,edgecolor=ds.PAPER,linewidth=1.2,label="Own eggs")
    ax.axhline(52,ls="--",color=GRN,lw=2,label="Donor eggs (~flat at donor's age)")
    for xi,v in zip(x,own): ax.text(xi,v+1,f"{v}%",ha="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(bands,fontsize=10.5); ax.set_ylim(0,64)
    ax.set_xlabel("maternal age",fontsize=10,color=MUT); ax.set_ylabel("live birth per cycle (%)",fontsize=10,color=MUT)
    ax.legend(fontsize=9,loc="upper right",frameon=False)
    ds.title(ax,"Reproductive System","IVF success tracks the egg's age",
             "Live-birth rate per own-egg cycle collapses after ~40; donor-egg success stays flat — it follows the donor's age, proving the egg is the limit.")
    ds.footer(ax,"Illustrative — §42 §4.2 IVF success by age","ivf-livebirth-by-age",tier="cohort")
    ds.save(fig,f"{FIG}/B07-ivf-by-age.png")

def contraception():
    data=[("Implant",0.1,0.1),("Hormonal IUD",0.2,0.2),("Copper IUD",0.8,0.6),("Injection",4,0.2),
          ("Pill",7,0.3),("Patch / ring",7,0.3),("Condom (m)",13,2),("Withdrawal",20,4),
          ("Fertility awareness",23,1),("Spermicide",28,18)]
    labels=[d[0] for d in data]; typ=[d[1] for d in data]; per=[d[2] for d in data]
    fig,ax=ds.new_fig(8.8,5.8); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,typ,color=[GRN if t<1 else GOLD if t<10 else WARN for t in typ],height=0.66,edgecolor=ds.PAPER,linewidth=1.1)
    ax.scatter(per,yp,s=58,facecolors="white",edgecolors=INK,linewidths=1.7,zorder=5,label="perfect use")
    for y,t in zip(yp,typ): ax.text(t+0.4,y,f"{t:g}%",va="center",fontsize=9.4,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10); ax.set_xlim(0,31)
    ax.set_xlabel("1st-year pregnancy rate — typical use (bar) vs perfect (dot)",fontsize=9.5,color=MUT)
    ax.legend(fontsize=9,loc="lower right",frameon=False)
    ds.title(ax,"Reproductive System","LARC methods are 20–50× more effective than the pill",
             "Implants/IUDs remove the user-error gap; the pill's typical-use failure (~7%) is mostly missed doses.")
    ds.footer(ax,"After Trussell 2011; Winner 2012 (CHOICE)","contraception-effectiveness",tier="cohort")
    ds.save(fig,f"{FIG}/B08-contraception.png",left=0.205)

def menstrual_cycle():
    t=np.linspace(0,28,400)
    def g(mu,s,a): return a*np.exp(-0.5*((t-mu)/s)**2)
    E=10+g(12.5,2.2,80)+g(21,4,45)
    LH=8+g(13.5,0.8,90)
    FSH=12+g(2.5,3,10)+g(13.5,1.0,22)
    P=3+g(21,3.4,80)
    fig,ax=ds.new_fig(8.8,5.4)
    ax.plot(t,LH,lw=2.6,color=WARN,label="LH"); ax.plot(t,FSH,lw=2.4,color=BLUE,label="FSH")
    ax.plot(t,E,lw=2.6,color=GOLD_D,label="Estrogen"); ax.plot(t,P,lw=2.6,color=GRN,label="Progesterone")
    ax.axvline(14,ls=":",color=MUT,lw=1); ax.text(14.3,95,"ovulation",fontsize=9,color=MUT)
    ax.set_xlim(0,28); ax.set_ylim(0,105); ax.set_xlabel("cycle day",fontsize=10,color=MUT)
    ax.set_ylabel("relative hormone level",fontsize=10,color=MUT); ax.legend(fontsize=9,loc="upper right",ncol=2,frameon=False)
    ax.set_yticks([])
    ds.title(ax,"Reproductive System","The menstrual cycle, in four hormones",
             "Estrogen builds the follicular phase → triggers the LH surge → ovulation → progesterone runs the luteal phase. Withdrawal brings menses.")
    ds.footer(ax,"Canonical 28-day schematic — §42 §2.1","menstrual-cycle-hormone-curve",tier="mechanistic")
    ds.save(fig,f"{FIG}/B09-menstrual-cycle.png")

def common_rare():
    fig,ax=ds.new_fig(8.6,5.4)
    pts=[("BRCA1/2",6e-4,5.0,WARN,(10,2)),("LDLR (FH)",1.4e-3,4.1,WARN,(10,-3)),
         ("HFE C282Y",5e-2,1.85,GOLD_D,(-4,12)),("APOE-ε4",1.6e-1,1.42,GOLD_D,(8,9)),
         ("FOXO3",3.2e-1,1.16,GOLD,(8,6)),("ACTN3",4.5e-1,1.04,"#b9ad8e",(8,-3)),
         ("typical GWAS SNP",1.0e-1,1.09,"#b9ad8e",(-8,-16))]
    for n,f,e,c,off in pts:
        ax.scatter(f,e,s=120,color=c,edgecolor=ds.PAPER,linewidth=1.3,zorder=3)
        ax.annotate(n,(f,e),textcoords="offset points",xytext=off,fontsize=8.4,color=INK)
    ax.set_xscale("log"); ax.set_xlim(2e-4,0.8); ax.set_ylim(0.92,6)
    ax.set_xlabel("allele frequency (log)",fontsize=10,color=MUT); ax.set_ylabel("effect size (risk multiple)",fontsize=10,color=MUT)
    ax.annotate("ACTIONABLE\nrare + large effect",(7e-4,3.0),fontsize=9.5,color=WARN,fontweight="bold")
    ax.annotate("chip-friendly:\ncommon + tiny effect",(2.2e-1,1.25),fontsize=9.5,color=MUT,fontweight="bold",ha="center",
                xytext=(1.5e-1,2.7),arrowprops=dict(arrowstyle="->",color=MUT,lw=1.3,connectionstyle="arc3,rad=0.2"))
    ds.title(ax,"Genetics","The variants that matter are the ones chips miss",
             "Consumer arrays are dense in common, tiny-effect SNPs (upper-right empty) and sparse in the rare, large-effect variants that change decisions.")
    ds.footer(ax,"Illustrative — §18 §A.1 common vs rare","common-vs-rare-variants",tier="mechanistic")
    ds.save(fig,f"{FIG}/B10-common-rare-variants.png")

def bone_load():
    data=[("Heavy resistance\n+ impact (LIFTMOR)",2.9,GRN),("High-impact\nplyometrics",1.5,GOLD),
          ("Walking",0.1,"#b9ad8e"),("Swimming / cycling",-0.2,"#b9ad8e"),("No exercise\n(control)",-1.1,WARN)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]; cols=[d[2] for d in data]
    fig,ax=ds.new_fig(8.6,5.4); x=range(len(labels))
    ax.bar(x,vals,color=cols,width=0.62,edgecolor=ds.PAPER,linewidth=1.2)
    ax.axhline(0,color=INK,lw=1)
    for xi,v in zip(x,vals): ax.text(xi,v+(0.12 if v>=0 else -0.22),f"{v:+.1f}%",ha="center",fontsize=10,color=INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(labels,fontsize=8.8); ax.set_ylim(-1.8,3.6)
    ax.set_ylabel("annual change in bone mineral density",fontsize=10,color=MUT)
    ds.title(ax,"Bone","Bone answers to mechanical LOAD",
             "Only heavy resistance and impact build bone; swimming and walking barely hold the line. Osteoporosis is a loading problem.")
    ds.footer(ax,"After Watson 2018 (LIFTMOR RCT)","bone-load-not-cardio",tier="rct")
    ds.save(fig,f"{FIG}/B11-bone-load.png")

def hip_fracture():
    cats=["Age-matched\npeers","Women,\n1-yr post-fx","Men,\n1-yr post-fx"]; vals=[9,21,37]
    cols=["#b9ad8e",GOLD,WARN]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,vals,color=cols,width=0.6,edgecolor=ds.PAPER,linewidth=1.2)
    for xi,v in zip(x,vals): ax.text(xi,v+0.8,f"{v}%",ha="center",fontsize=11,color=INK,fontweight="bold")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,44)
    ax.set_ylabel("1-year mortality",fontsize=10,color=MUT)
    ds.title(ax,"Bone","A hip fracture is a mortality event — especially for men",
             "~2–4× the death rate of age-matched peers in the year after; risk is highest in the first 3–6 months. Prevention = strength + balance + not falling.")
    ds.footer(ax,"After Haentjens 2010 meta-analysis","hip-fracture-mortality",tier="meta")
    ds.save(fig,f"{FIG}/B12-hip-fracture-mortality.png")

def noise_dose():
    db=np.arange(85,116); hours=8*2.0**(-(db-85)/3.0)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(db,hours,lw=3,color=GOLD,solid_capstyle="round")
    ax.set_yscale("log"); ax.set_xlim(85,115); ax.set_ylim(0.003,9)
    ax.set_xlabel("sound level (dBA)",fontsize=10,color=MUT); ax.set_ylabel("safe exposure time (hours, log)",fontsize=10,color=MUT)
    for d,t in [(85,"8 h"),(94,"1 h"),(100,"15 min"),(112,"~1 min")]:
        h=8*2.0**(-(d-85)/3.0); ax.scatter(d,h,s=55,color=GOLD_D,zorder=4); ax.annotate(t,(d,h),textcoords="offset points",xytext=(6,6),fontsize=8.8,color=INK,fontweight="bold")
    ax.text(96,3,"concert / power tools\n≈ 100–110 dB",fontsize=8.6,color=MUT)
    ds.title(ax,"Hearing","Every +3 dB halves the safe listening time",
             "Noise damage is dose = level × time. A loud concert spends a full day's safe dose in minutes; hearing loss is cumulative and permanent.")
    ds.footer(ax,"NIOSH 3-dB exchange rate — §11 §5","noise-dose-3db","mechanistic")
    ds.save(fig,f"{FIG}/B13-noise-dose.png",left=0.125)

def fiber():
    fb=np.linspace(8,40,200); rr=1.0-0.0085*(fb-8)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.fill_between(fb,rr-0.04,rr+0.04,color=GOLD,alpha=0.16)
    ax.plot(fb,rr,lw=3,color=GOLD_D,solid_capstyle="round")
    ax.set_xlim(8,40); ax.set_ylim(0.65,1.05); ax.set_xlabel("dietary fiber (g/day)",fontsize=10,color=MUT)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=MUT)
    ax.axvspan(25,40,color=GRN,alpha=0.06); ax.text(30,1.0,"target ≥ 25–30 g",fontsize=9,color=GRN,fontweight="bold")
    ds.title(ax,"Digestive System","More fiber, lower mortality — a clean dose-response",
             "Each ~8 g/day step down in fiber raises all-cause and cardiovascular mortality; most people eat half the target. One of the most robust nutrition signals.")
    ds.footer(ax,"After Reynolds 2019 (Lancet meta-analysis)","fiber-mortality-dose",tier="meta")
    ds.save(fig,f"{FIG}/B14-fiber-mortality.png")

if __name__=="__main__":
    for fn in [hormone_age,igf1_u,apoe,fev1,egfr,ovarian_reserve,ivf_age,contraception,
               menstrual_cycle,common_rare,bone_load,hip_fracture,noise_dose,fiber]:
        fn(); print(fn.__name__,"ok")
