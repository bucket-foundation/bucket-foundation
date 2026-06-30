#!/usr/bin/env python3
"""LIFESTYLE/PUBLIC-HEALTH charts (Ch 44/45/03/36/05/29/19/09/33)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT; AMB="#8a6d12"
def L(ax,x,v,f="{:.0f}",dy=0.5,fs=10):
    for xi,vi in zip(x,v): ax.text(xi,vi+dy,f.format(vi),ha="center",fontsize=fs,color=INK,fontweight="bold")

def running_oa():
    cats=["Recreational\nrunners","Sedentary\n(non-runners)","Elite /\ncompetitive"]; v=[3.5,10.2,13.3]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GRN,WARN,AMB],width=0.6,edgecolor=ds.PAPER,linewidth=1.2); L(ax,x,v,"{:.1f}%",dy=0.2)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,16)
    ax.set_ylabel("knee osteoarthritis prevalence (%)",fontsize=10,color=MUT)
    ds.title(ax,"Exercise Modalities · §44","'Running destroys your knees' — it's the opposite",
             "Recreational runners have LESS knee arthritis than sedentary people. Only very high-volume elite running edges risk up. Motion is joint medicine.")
    ds.footer(ax,"Alentorn-Geli 2017 meta-analysis","running-knee-oa",tier="meta")
    ds.save(fig,f"{FIG}/L01-running-oa.png")

def sport_hr():
    data=[("Racquet sports",0.53),("Swimming",0.72),("Aerobics",0.73),("Cycling",0.85),("Running",0.87),("Football",0.82)]
    data.sort(key=lambda d:d[1]); labels=[d[0] for d in data]; v=[d[1] for d in data]
    fig,ax=ds.new_fig(8.6,5.2); yp=list(range(len(labels)))[::-1]
    ax.scatter(v,yp,s=90,color=GOLD,zorder=4,edgecolor=GOLDD,linewidth=1.3)
    for y,vi in zip(yp,v): ax.plot([vi-0.06,vi+0.06],[y,y],color=GOLDD,lw=2); ax.text(vi,y+0.28,f"{vi:.2f}",ha="center",fontsize=9.6,color=INK,fontweight="bold")
    ax.axvline(1.0,ls="--",color=MUT,lw=1.2); ax.text(1.01,0.2,"no benefit",fontsize=9,color=MUT)
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=11); ax.set_xlim(0.4,1.1)
    ax.set_xlabel("all-cause mortality hazard ratio (vs inactive)",fontsize=9.6,color=MUT)
    ds.title(ax,"Sports & Play · §45","Different sports, different mortality benefit",
             "Racquet and social sports top the table — the intermittent, skillful, social dimensions matter beyond calories burned. (Observational; self-selection caveat.)")
    ds.footer(ax,"Oja et al., Br J Sports Med 2017","sport-specific-mortality",tier="cohort")
    ds.save(fig,f"{FIG}/L02-sport-hr.png",left=0.175)

def taichi():
    cats=["Stretching\n(control)","Multimodal\nexercise","Tai chi"]; v=[1.0,0.78,0.42]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN2,GRN],width=0.6,edgecolor=ds.PAPER,linewidth=1.2); L(ax,x,v,"{:.2f}",dy=0.015)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,1.15)
    ax.set_ylabel("relative fall rate",fontsize=10,color=MUT)
    ds.title(ax,"Sports & Play · §45","Tai chi is a standout for preventing falls",
             "In a head-to-head RCT, tai chi cut falls more than conventional multimodal exercise — balance, weight-shifting, and attention trained together. Falls are a mortality event in elders.")
    ds.footer(ax,"Li et al., JAMA Intern Med 2018","taichi-falls",tier="rct")
    ds.save(fig,f"{FIG}/L03-taichi-falls.png")

def vital_nulls():
    groups=["Vitamin D","Omega-3"]; assoc=[0.70,0.72]; rct=[0.99,0.97]
    x=np.arange(2); w=0.36
    fig,ax=ds.new_fig(8.6,5.2)
    ax.bar(x-w/2,assoc,w,color=GOLD,label="Cohort association",edgecolor=ds.PAPER,linewidth=1.1)
    ax.bar(x+w/2,rct,w,color="#b9ad8e",label="Randomized trial (VITAL)",edgecolor=ds.PAPER,linewidth=1.1)
    ax.axhline(1.0,ls="--",color=MUT,lw=1.2)
    for xi,vv in zip(x-w/2,assoc): ax.text(xi,vv-0.07,f"{vv:.2f}",ha="center",fontsize=10,color="#fff",fontweight="bold")
    for xi,vv in zip(x+w/2,rct): ax.text(xi,vv-0.07,f"{vv:.2f}",ha="center",fontsize=10,color="#fff",fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(groups,fontsize=12); ax.set_ylim(0,1.18); ax.legend(fontsize=9.5,loc="center",bbox_to_anchor=(0.5,0.40),frameon=False)
    ax.set_ylabel("relative risk (outcome)",fontsize=10,color=MUT)
    ds.title(ax,"Nutrition · §03","Predictor ≠ lever: the supplement that tests null",
             "Low vitamin D and omega-3 PREDICT worse outcomes — but giving them in trials (VITAL) didn't cut cancer, CVD, or fractures. The marker isn't the lever.")
    ds.footer(ax,"Manson et al., VITAL, NEJM 2019","vital-nulls",tier="rct")
    ds.save(fig,f"{FIG}/L04-vital-nulls.png")

def protein_age():
    cats=["RDA\n(sedentary)","Active /\nstrength","Hypertrophy","Older adult\n(65+)"]; v=[0.8,1.6,2.0,1.4]
    fig,ax=ds.new_fig(8.6,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN,GRN2,GOLD],width=0.62,edgecolor=ds.PAPER,linewidth=1.2); L(ax,x,v,"{:.1f}",dy=0.03)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,2.4)
    ax.set_ylabel("protein target (g/kg/day)",fontsize=10,color=MUT)
    ds.title(ax,"Nutrition · §03","Protein needs rise with training — and again in old age",
             "Active people need ~1.6 g/kg; the mTOR-longevity worry of mid-life flips after ~65, when sarcopenia risk makes MORE protein protective. Context sets the target.")
    ds.footer(ax,"Morton/Phillips 2018; protein-aging literature","protein-by-age",tier="meta")
    ds.save(fig,f"{FIG}/L05-protein-age.png")

def tre_cr():
    cats=["Late 16:8 TRE\n(calorie-matched)","Early eTRE\n(8am–2pm)"]; v=[0.3,2.3]
    fig,ax=ds.new_fig(8.2,5.2); x=range(len(cats))
    ax.bar(x,v,color=["#b9ad8e",GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); L(ax,x,v,"{:.1f}",dy=0.04)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,3)
    ax.set_ylabel("metabolic benefit beyond calorie control",fontsize=9.2,color=MUT)
    ds.title(ax,"Fasting · §36","Time-restricted eating: timing matters more than the window",
             "Late 16:8 (TREAT) added little once calories were matched; EARLY eating windows (Sutton's eTRE) improved insulin sensitivity independent of weight. When you eat counts.")
    ds.footer(ax,"Lowe 2020 (TREAT); Sutton 2018 (eTRE)","tre-vs-cr",tier="rct")
    ds.save(fig,f"{FIG}/L06-tre-cr.png")

def psychosocial():
    data=[("Strong social ties",1.5),("Sense of purpose",1.4),("Low loneliness",1.45),("Higher SES",1.35),("Religious attendance",1.25),("Typical supplement claim",1.02)]
    labels=[d[0] for d in data]; v=[d[1] for d in data]
    fig,ax=ds.new_fig(8.8,5.4); yp=list(range(len(labels)))[::-1]
    cols=[GRN if x>1.1 else "#b9ad8e" for x in v]
    ax.barh(yp,v,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.1)
    ax.axvline(1.0,color=INK,lw=1)
    for y,vi in zip(yp,v): ax.text(vi+0.01,y,f"{vi:.2f}×",va="center",fontsize=10,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5); ax.set_xlim(0.9,1.65)
    ax.set_xlabel("survival odds (relative)",fontsize=10,color=MUT)
    ds.title(ax,"Recovery & Stress · §05","The biggest longevity levers are social",
             "Strong relationships rival quitting smoking for mortality. Purpose, connection and status dwarf the mechanistic-tier supplement claims sold as longevity.")
    ds.footer(ax,"Holt-Lunstad 2010; purpose/SES cohorts","psychosocial-levers",tier="meta")
    ds.save(fig,f"{FIG}/L07-psychosocial.png",left=0.205)

def intention_behavior():
    cats=["Intention\nchange","Behavior\nchange"]; v=[0.66,0.36]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); L(ax,x,v,"d = {:.2f}",dy=0.01)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,0.8)
    ax.set_ylabel("effect size (Cohen's d)",fontsize=10,color=MUT)
    ds.title(ax,"Behavior Change · §29","The intention–behavior gap",
             "Changing what people intend is the easy half; ~half who form an intention still don't act. Design for the gap with cues and environment.")
    ds.footer(ax,"Webb & Sheeran, Psych Bull 2006","intention-behavior-gap",tier="meta")
    ds.save(fig,f"{FIG}/L08-intention-behavior.png")

def habit():
    d=np.linspace(0,120,200); a=95*(1-np.exp(-d/40))
    fig,ax=ds.new_fig(8.6,5.2)
    ax.fill_between([18,254/2.5],[0,0],[100,100],color=GOLD,alpha=0.08)
    ax.plot(d,a,lw=3,color=GOLD,solid_capstyle="round")
    ax.axvline(66,ls="--",color=GRN,lw=1.4); ax.text(68,30,"median 66 days",fontsize=10,color=GRN)
    ax.axvline(21,ls=":",color=WARN,lw=1.2); ax.text(22,82,"'21 days'\n= myth",fontsize=9,color=WARN)
    ax.set_xlim(0,120); ax.set_ylim(0,102); ax.set_xlabel("days of repetition",fontsize=10,color=MUT)
    ax.set_ylabel("automaticity (% of plateau)",fontsize=10,color=MUT)
    ds.title(ax,"Behavior Change · §29","How long a habit really takes to form",
             "Automaticity rises and plateaus — median ~66 days, ranging 18 to 254 depending on the behavior. The '21-day habit' is a myth; plan for months.")
    ds.footer(ax,"Lally et al., Eur J Soc Psychol 2010","habit-formation-66-days",tier="cohort")
    ds.save(fig,f"{FIG}/L09-habit-formation.png")

def capacity_arc():
    age=np.linspace(0,90,200)
    cap=np.where(age<28,40+60*(age/28),100-1.05*(age-28))
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(age,cap,lw=3,color=GOLD,solid_capstyle="round")
    ax.axhline(30,ls=":",color=WARN,lw=1.3); ax.text(2,22,"frailty / fracture threshold",fontsize=9,color=WARN)
    ax.axvline(28,ls="--",color=GRN,lw=1); ax.annotate("peak (20s–30s)",(28,100),xytext=(40,92),fontsize=9.5,color=GRN,arrowprops=dict(arrowstyle="->",color=GRN,lw=1.1))
    ax.set_xlim(0,90); ax.set_ylim(0,110); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("physiological capacity (VO₂max, bone, muscle)",fontsize=9.0,color=MUT)
    ds.title(ax,"Life Stages · §19","The peak you build is the asset you spend",
             "Capacity climbs to a peak in your 20s–30s, then declines for life. A higher peak (and a slower decline) buys years of function above the frailty line.")
    ds.footer(ax,"§19 capacity-arc; peak bone/VO₂max data","capacity-arc",tier="cohort")
    ds.save(fig,f"{FIG}/L10-capacity-arc.png")

def fertility():
    age=np.linspace(20,55,200)
    fem=np.clip(100-0.6*(age-20)-0.06*np.clip(age-32,0,None)**2,0,100)
    mal=np.clip(100-1.0*np.clip(age-35,0,None),20,100)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(age,fem,lw=3,color=WARN,label="Female fertility")
    ax.plot(age,mal,lw=3,color=BLUE,label="Male fertility")
    ax.set_xlim(20,55); ax.set_ylim(0,105); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("relative fertility (%)",fontsize=10,color=MUT); ax.legend(fontsize=9.5,frameon=False)
    ds.title(ax,"Life Stages · §19","Fertility declines for both sexes — on different clocks",
             "Female fertility falls steeply after ~35 (fixed egg pool); male fertility declines later and gradually, with rising DNA fragmentation. Age is a factor for both partners.")
    ds.footer(ax,"ESHRE data; paternal-age series","fertility-decline",tier="cohort")
    ds.save(fig,f"{FIG}/L11-fertility-decline.png")

def compression():
    age=np.linspace(50,100,200)
    def surv(m): return 100/(1+np.exp((age-82)/4))*0+np.clip(100-100/(1+np.exp(-(age-83)/3)),0,100)
    disA=np.clip(100-100/(1+np.exp(-(age-70)/5)),0,100)
    disB=np.clip(100-100/(1+np.exp(-(age-80)/3.5)),0,100)
    death=np.clip(100-100/(1+np.exp(-(age-84)/3)),0,100)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(age,death,lw=3,color=INK,label="Survival")
    ax.plot(age,disA,lw=2.6,color=WARN,ls="--",label="Disability onset (typical)")
    ax.plot(age,disB,lw=2.6,color=GRN,label="Disability onset (compressed)")
    ax.fill_between(age,disB,death,color=GRN,alpha=0.08)
    ax.set_xlim(50,100); ax.set_ylim(0,105); ax.set_xlabel("age (years)",fontsize=10,color=MUT)
    ax.set_ylabel("% still alive / able",fontsize=10,color=MUT); ax.legend(fontsize=8.8,loc="lower left",frameon=False)
    ds.title(ax,"Life Stages · §19","Compression of morbidity — square the curve",
             "The goal isn't only more years; it's pushing disability LATER, closer to death. Shrink the frail years; live well, then decline fast.")
    ds.footer(ax,"Fries, NEJM 1980","compression-of-morbidity",tier="theoretical")
    ds.save(fig,f"{FIG}/L12-compression-morbidity.png")

def exposures():
    data=[("Tobacco (smoker)",10.0),("Air pollution (high)",2.2),("Heavy alcohol",2.0),("Lead",1.2),("Cold (ambient)",1.0),("Excess sun",0.5),("PFAS / BPA",0.3),("Microplastics",0.1)]
    labels=[d[0] for d in data]; v=[d[1] for d in data]
    cols=[WARN if x>1.5 else GOLD if x>0.4 else "#b9ad8e" for x in v]
    fig,ax=ds.new_fig(8.8,5.4); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,v,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.0)
    for y,vi in zip(yp,v): ax.text(vi+0.1,y,f"~{vi:g} yr" if vi>=1 else "small",va="center",fontsize=9.6,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5); ax.set_xlim(0,11.5)
    ax.set_xlabel("approx. life-years at stake (indicative)",fontsize=10,color=MUT)
    ds.title(ax,"Exposures · §09","Environmental risks, kept in proportion",
             "Tobacco dwarfs everything. Air pollution and alcohol are real; the trendy worries (microplastics, BPA) are far smaller. Spend worry where the magnitude is.")
    ds.footer(ax,"GBD 2016; exposure literature (indicative)","exposures-in-proportion",tier="cohort")
    ds.save(fig,f"{FIG}/L13-exposures.png",left=0.205)

def determinants():
    labels=["Behavior","Genetics","Social\ncircumstances","Medical care","Environment"]; v=[40,30,15,10,5]
    cols=[GRN,AMB,BLUE,GOLD,"#b9ad8e"]
    fig,ax=ds.new_fig(8.0,5.6)
    ax.pie(v,labels=[f"{l}\n{x}%" for l,x in zip(labels,v)],colors=cols,startangle=90,counterclock=False,
           wedgeprops=dict(edgecolor=ds.PAPER,linewidth=2),textprops=dict(fontsize=10.5,color=INK))
    ds.title(ax,"Public Health · §33","What actually determines health",
             "Medical care is only ~10–20% of health outcomes. Behavior and the social/physical environment dominate — yet the longevity industry sells the clinical sliver.")
    ds.footer(ax,"McGinnis/Schroeder framework","determinants-of-health","cohort")
    ds.save(fig,f"{FIG}/L14-determinants.png",top=0.80)

def lifespan_doubled():
    data=[("Clean water &\nsanitation",48),("Food security &\nrefrigeration",16),("Vaccines",12),("Antibiotics",9),("Tobacco / road\nsafety",8),("Clinical medicine",15)]
    labels=[d[0] for d in data]; v=[d[1] for d in data]
    cols=[GRN,GRN2,AMB,GOLD,"#b9ad8e",BLUE]
    fig,ax=ds.new_fig(8.8,5.4); yp=list(range(len(labels)))[::-1]
    ax.barh(yp,v,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.0)
    for y,vi in zip(yp,v): ax.text(vi+0.6,y,f"~{vi}%",va="center",fontsize=10.5,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10); ax.set_xlim(0,56)
    ax.set_xlabel("approx. contribution to the lifespan doubling",fontsize=9.6,color=MUT)
    ds.title(ax,"Public Health · §33","What actually doubled human lifespan",
             "Clean water did more than any drug. Public-health plumbing, food, and vaccines drove most of the gain. Clinical medicine is the smaller share.")
    ds.footer(ax,"Cutler & Miller 2005 (indicative shares)","what-doubled-lifespan",tier="cohort")
    ds.save(fig,f"{FIG}/L15-lifespan-doubled.png",left=0.165)

def us_peers():
    pts=[("USA",17,11,WARN),("Switzerland",12,3,GOLD),("Germany",11,5,GOLD),("Canada",11,6,GOLD),("UK",10,4,GRN2),("Australia",10,1,GRN),("Netherlands",10,2,GRN)]
    fig,ax=ds.new_fig(8.6,5.4)
    for n,spend,rank,c in pts:
        ax.scatter(spend,rank,s=130,color=c,edgecolor=ds.PAPER,linewidth=1.3,zorder=3)
        ax.annotate(n,(spend,rank),textcoords="offset points",xytext=(7,4),fontsize=9.5,color=INK,fontweight="bold")
    ax.set_xlim(8,19); ax.set_ylim(0,12); ax.invert_yaxis()
    ax.set_xlabel("health spending (% of GDP)",fontsize=10,color=MUT); ax.set_ylabel("outcome rank  (1 = best)",fontsize=10,color=MUT)
    ds.title(ax,"Public Health · §33","The US spends the most and ranks the worst",
             "Among wealthy nations, more spending doesn't buy better outcomes. The US is the outlier — highest cost, lowest performance. The problem is how care is organized.")
    ds.footer(ax,"Commonwealth Fund, Mirror Mirror 2024","us-vs-peers",tier="cohort")
    ds.save(fig,f"{FIG}/L16-us-vs-peers.png")

def epi_transition():
    yr=np.linspace(1900,2020,200)
    infect=80/(1+np.exp((yr-1945)/12))
    chronic=10+70/(1+np.exp(-(yr-1955)/14))
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(yr,infect,lw=3,color=WARN,label="Infectious / acute")
    ax.plot(yr,chronic,lw=3,color=BLUE,label="Chronic / degenerative")
    ax.set_xlim(1900,2020); ax.set_ylim(0,90); ax.set_xlabel("year",fontsize=10,color=MUT)
    ax.set_ylabel("share of deaths (%)",fontsize=10,color=MUT); ax.legend(fontsize=9.5,frameon=False)
    ds.title(ax,"Public Health · §33","The epidemiologic transition",
             "As infections were tamed, chronic and degenerative disease rose to fill the space. The conditions longevity targets are largely post-transition 'diseases of aging'.")
    ds.footer(ax,"Omran transition framework","epidemiologic-transition",tier="theoretical")
    ds.save(fig,f"{FIG}/L17-epi-transition.png")

def cold_heat():
    cats=["Cold-related","Heat-related"]; v=[7.29,0.42]
    fig,ax=ds.new_fig(8.0,5.2); x=range(len(cats))
    ax.bar(x,v,color=[BLUE,WARN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); L(ax,x,v,"{:.2f}%",dy=0.1)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11.5); ax.set_ylim(0,8.5)
    ax.set_ylabel("share of deaths attributable",fontsize=10,color=MUT)
    ds.title(ax,"Exposures · §09","Cold kills far more people than heat",
             "Across 384 cities, ~7.3% of deaths were cold-attributable vs ~0.4% heat. Most temperature deaths are from moderate cold — though climate change is shifting the balance.")
    ds.footer(ax,"Gasparrini et al., Lancet 2015","cold-vs-heat-mortality",tier="cohort")
    ds.save(fig,f"{FIG}/L18-cold-heat.png")

if __name__=="__main__":
    for fn in [running_oa,sport_hr,taichi,vital_nulls,protein_age,tre_cr,psychosocial,intention_behavior,
               habit,capacity_arc,fertility,compression,exposures,determinants,lifespan_doubled,us_peers,epi_transition,cold_heat]:
        fn(); print(fn.__name__,"ok")
