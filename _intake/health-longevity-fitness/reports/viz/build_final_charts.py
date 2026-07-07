#!/usr/bin/env python3
"""FINAL charts (§02/§03/§33/§07/§45/§19)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
BLUE="#3a6ea5"; GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; INK=ds.INK; MUT=ds.MUT; AMB="#8a6d12"
def Lb(ax,x,v,f="{:.0f}",dy=0.5,fs=10):
    for xi,vi in zip(x,v): ax.text(xi,vi+dy,f.format(vi),ha="center",fontsize=fs,color=INK,fontweight="bold")

def polarized():
    fig,ax=ds.new_fig(8.8,4.6)
    segs=[("Zone 2 (easy, conversational)",80,GRN),("'Grey zone' (avoid)",3,"#cdbf9a"),("Hard intervals",17,WARN)]
    left=0
    for lab,w,c in segs:
        ax.barh(0,w,left=left,height=0.5,color=c,edgecolor=ds.PAPER,linewidth=1.5)
        if w>5: ax.text(left+w/2,0,f"{w}%",ha="center",va="center",fontsize=12,color="#fff",fontweight="bold")
        left+=w
    ax.set_xlim(0,100); ax.set_ylim(-1,1); ax.axis("off")
    ax.text(40,0.62,"easy", ha="center",fontsize=11,color=GRN,fontweight="bold")
    ax.text(91,0.62,"hard",ha="center",fontsize=11,color=WARN,fontweight="bold")
    ds.title(ax,"Training · §02 §3","Polarized cardio — mostly easy, a little hard",
             "Most endurance volume should be EASY (Zone 2, talk-test pass); a smaller slice is hard. The moderate 'grey zone' is where many get stuck.")
    ds.footer(ax,"polarized training model — §02 §3","polarized-80-20",tier="cohort")
    ds.save(fig,f"{FIG}/G01-polarized.png",bottom=0.16,top=0.80)

def leucine():
    dose=np.array([5,10,20,30,40,50]); mps=np.array([15,40,88,98,100,100])
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(dose,mps,"-o",lw=3,color=GOLD,markersize=7,markerfacecolor=GOLDD,markeredgecolor=ds.PAPER)
    ax.axvspan(20,40,color=GRN,alpha=0.08)
    ax.axvline(20,ls="--",color=GRN,lw=1.3); ax.text(21,30,"~2–3 g leucine\n≈ 20–40 g protein\nswitches on MPS",fontsize=9.5,color=GRN)
    ax.set_xlim(0,50); ax.set_ylim(0,108); ax.set_xlabel("protein per meal (g)",fontsize=10,color=MUT)
    ax.set_ylabel("muscle protein synthesis (% of max)",fontsize=9.4,color=MUT)
    ds.title(ax,"Nutrition · §03 §2.2","The leucine threshold — and why you spread protein",
             "~20–40 g of quality protein (≈2–3 g leucine) maximally triggers muscle protein synthesis. Spreading it across 3–4 meals beats a single dinner-skewed dose.")
    ds.footer(ax,"§03 §2.2 leucine threshold","leucine-threshold",tier="mechanistic")
    ds.save(fig,f"{FIG}/G02-leucine.png")

def cost_ly():
    data=[("Bednets (malaria)",5),("Childhood vaccines",50),("Oral rehydration",100),("Tobacco taxation",500),
          ("Statins (high-risk)",15000),("Marginal rich-world care",150000)]
    L=[d[0] for d in data]; v=[d[1] for d in data]
    cols=[GRN,GRN,GRN2,GOLD,AMB,WARN]
    fig,ax=ds.new_fig(8.8,5.4); yp=list(range(len(L)))[::-1]
    ax.barh(yp,v,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.0); ax.set_xscale("log")
    for y,vi in zip(yp,v): ax.text(vi*1.3,y,f"${vi:,}",va="center",fontsize=9.6,color=INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(L,fontsize=10); ax.set_xlim(2,500000)
    ax.set_xlabel("cost per life-year saved (log scale)",fontsize=10,color=MUT)
    ds.title(ax,"Public Health · §33","The cheapest life-years are bought far from the clinic",
             "Bednets and vaccines save a year of life for a few dollars; marginal rich-world medicine costs 10,000× more. Where you spend determines how many you save.")
    ds.footer(ax,"§33 §7.4 cost-effectiveness (indicative)","cost-per-life-year",tier="cohort")
    ds.save(fig,f"{FIG}/G03-cost-per-ly.png",left=0.215)

def statin_prevention():
    cats=["Primary prevention\n(low baseline risk)","Secondary prevention\n(prior event)"]; v=[104,39]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); Lb(ax,x,v,"NNT {:.0f}",dy=2)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,120)
    ax.set_ylabel("NNT over ~5 years (lower = more benefit)",fontsize=9.4,color=MUT)
    ds.title(ax,"Prevention · §10","Same pill, very different value — baseline risk is the story",
             "A statin's absolute benefit depends on your starting risk. After a heart attack (secondary), the number-needed-to-treat is low; for low-risk primary prevention it's high.")
    ds.footer(ax,"CTT Collaboration (illustrative NNTs)","statin-primary-vs-secondary",tier="meta")
    ds.save(fig,f"{FIG}/G04-statin-prevention.png")

def rose():
    cats=["Treat the few\nat HIGH risk","Shift the WHOLE\npopulation a little"]; v=[20,55]
    fig,ax=ds.new_fig(8.4,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GOLD,GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); Lb(ax,x,v,"{:.0f}",dy=1)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,68)
    ax.set_ylabel("cases prevented (relative)",fontsize=10,color=MUT)
    ds.title(ax,"Public Health · §33","Rose's paradox: small shifts for everyone beat big shifts for a few",
             "Most cases arise from the large number of people at modest risk. A tiny population-wide improvement prevents more disease than targeting only the extremes.")
    ds.footer(ax,"Geoffrey Rose, population strategy","rose-population-strategy",tier="theoretical")
    ds.save(fig,f"{FIG}/G05-rose.png")

def le_doubling():
    yr=[1800,1850,1900,1950,1980,2000,2020]; le=[30,32,34,48,63,67,73]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(yr,le,"-o",lw=3,color=GRN,markersize=6,markerfacecolor=GRN2,markeredgecolor=ds.PAPER)
    ax.set_xlim(1795,2025); ax.set_ylim(20,85); ax.set_xlabel("year",fontsize=10,color=MUT)
    ax.set_ylabel("global life expectancy (years)",fontsize=10,color=MUT)
    ax.annotate("sanitation, vaccines,\nantibiotics, nutrition",(1952,50),xytext=(1812,70),fontsize=9.5,color=MUT,arrowprops=dict(arrowstyle="->",color=MUT,lw=1.2))
    ds.title(ax,"Public Health · §33","Human life expectancy more than doubled in 200 years",
             "Global life expectancy went from ~30 to ~73. Most of the gain came after 1900 — and most of that from public-health advances.")
    ds.footer(ax,"Our World in Data / historical demography","life-expectancy-doubling",tier="cohort")
    ds.save(fig,f"{FIG}/G06-le-doubling.png")

def sport_radar():
    axes=["Fitness","Longevity\nevidence","Cognitive /\nsocial","Low\ninjury","Low\nbarrier"]
    data={"Tennis":[4,5,5,3,2],"Swimming":[4,4,2,5,3],"Running":[4,4,2,3,5]}
    cols={"Tennis":GRN,"Swimming":BLUE,"Running":GOLD}
    N=len(axes); ang=np.linspace(0,2*np.pi,N,endpoint=False).tolist(); ang+=ang[:1]
    fig=plt.figure(figsize=(8.6,6.3),dpi=200); fig.patch.set_facecolor(ds.PAPER)
    ax=fig.add_axes([0.28,0.14,0.44,0.52],polar=True); ax.set_facecolor(ds.PAPER)
    ax.set_theta_offset(np.pi/2); ax.set_theta_direction(-1)
    for name,vals in data.items():
        v=vals+vals[:1]; ax.plot(ang,v,lw=2.4,color=cols[name],label=name); ax.fill(ang,v,color=cols[name],alpha=0.09)
    ax.set_xticks(ang[:-1]); ax.set_xticklabels(axes,fontsize=9,color=INK); ax.tick_params(pad=16)
    ax.set_yticks([1,2,3,4,5]); ax.set_yticklabels([]); ax.set_ylim(0,5); ax.grid(color="#e0d8c2")
    ax.legend(loc="lower center",bbox_to_anchor=(0.5,-0.15),ncol=3,fontsize=10,frameon=False)
    fig.text(0.045,0.965,"SPORTS & PLAY · §45",ha="left",va="top",fontsize=9,color=GOLDD,fontfamily=ds.DISPLAY,fontweight="bold")
    fig.text(0.045,0.930,"A five-axis sport profile",ha="left",va="top",fontsize=15,color=ds.INK2,fontfamily=ds.DISPLAY,fontweight="black")
    fig.text(0.045,0.893,"No sport wins on every axis — choose for your goals, joints, and what you'll keep doing.",ha="left",va="top",fontsize=10,color=MUT,fontstyle="italic")
    fig.add_artist(plt.Line2D([0.045,0.40],[0.870,0.870],color=GOLD,lw=2.4,transform=fig.transFigure,solid_capstyle="round"))
    fig.text(0.045,0.022,"§45 five-axis lens",ha="left",fontsize=8.4,color=ds.FAINT)
    fig.savefig(f"{FIG}/G07-sport-radar.png"); plt.close(fig)

def healthspan_gap():
    cats=["Lifespan\n(years alive)","Healthspan\n(years healthy)"]; v=[79,66]
    fig,ax=ds.new_fig(8.2,5.2); x=range(len(cats))
    ax.bar(x,v,color=[MUT,GRN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); Lb(ax,x,v,"{:.0f} yr",dy=1)
    ax.annotate("",(1.2,66),(1.2,79),arrowprops=dict(arrowstyle="<->",color=WARN,lw=2))
    ax.set_xlim(-0.6,2.05); ax.text(1.30,73,"~13-year gap\nof poor health",fontsize=10,color=WARN,fontweight="bold",ha="left",va="center")
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,92)
    ax.set_ylabel("years",fontsize=10,color=MUT)
    ds.title(ax,"Life Stages · §19","Healthspan is the real goal",
             "We added years but not always healthy ones — a ~13-year gap of disability at the end. The aim of this whole manual: shrink that gap.")
    ds.footer(ax,"GBD healthspan-lifespan gap (indicative)","healthspan-gap",tier="cohort")
    ds.save(fig,f"{FIG}/G08-healthspan-gap.png")

if __name__=="__main__":
    for fn in [polarized,leucine,cost_ly,statin_prevention,rose,le_doubling,sport_radar,healthspan_gap]:
        fn(); print(fn.__name__,"ok")
