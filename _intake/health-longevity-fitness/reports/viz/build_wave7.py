#!/usr/bin/env python3
"""Wave 7 figures."""
import os, sys, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
def arrowdefs():
    out="".join(f'<marker id="{n}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="{c}"/></marker>' for n,c in [("ah",ds.GOLD_D),("ar","#b5471f")])
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.2,m="ah"):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" marker-end="url(#{m})"/>'

# ---- CHARTS ----
def lifespan_over_time():
    yr=[1850,1880,1910,1940,1970,2000,2020]; le=[40,42,52,63,71,77,79]
    fig,ax=ds.new_fig(8.6,5.0); ax.plot(yr,le,"-o",color=ds.GOLD,lw=3,markerfacecolor=ds.GOLD_D)
    ax.fill_between(yr,le,color=ds.GOLD,alpha=0.12)
    ax.set_ylim(30,85); ax.set_xlabel("year",fontsize=10,color=ds.MUT); ax.set_ylabel("life expectancy at birth (years)",fontsize=10,color=ds.MUT)
    ax.annotate("≈ doubled",(2020,79),xytext=(1905,74),fontsize=12,color=ds.GOLD_D,fontweight="bold")
    ds.title(ax,"Public Health","Human lifespan roughly doubled in 150 years",
             "Driven mostly by sanitation, vaccines, antibiotics & nutrition — not high-tech medicine.")
    ds.footer(ax,"Our World in Data / historical demography","lifespan-doubling",tier="cohort")
    ds.save(fig,f"{FIG}/81-lifespan-over-time.png")
def bmi_jcurve():
    x=[16,18,21,24,27,30,34,38]; y=[1.45,1.10,1.0,1.0,1.08,1.22,1.5,1.95]
    fig,ax=ds.new_fig(8.6,5.0); ax.plot(x,y,"-o",color=ds.GOLD,lw=3,markerfacecolor=ds.GOLD_D)
    ax.axvspan(20,25,color="#e9f3ea",zorder=0); ax.text(22.5,1.55,"lowest-risk\nrange",ha="center",fontsize=9.5,color="#1d6b2e",fontweight="bold")
    ax.set_ylim(0.9,2.1); ax.set_xlabel("body-mass index (BMI)",fontsize=10,color=ds.MUT); ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Measurement","Mortality vs BMI is a U — but BMI is crude",
             "Lowest risk ~22–25, yet BMI can't tell muscle from fat. Pair it with waist & strength.")
    ds.footer(ax,"Global BMI Mortality Collaboration (illustrative)","bmi-mortality-ushape",tier="cohort")
    ds.flag(ax,"BMI misses body composition","caution")
    ds.save(fig,f"{FIG}/82-bmi-jcurve.png")
def testosterone_age():
    age=[25,35,45,55,65,75]; t=[640,580,520,460,400,340]
    fig,ax=ds.new_fig(8.6,5.0); ax.plot(age,t,"-o",color=ds.GOLD,lw=3,markerfacecolor=ds.GOLD_D)
    ax.axhspan(300,1000,color="#e9f3ea",zorder=0); ax.text(27,330,"normal range floor",fontsize=9,color="#1d6b2e")
    ax.set_ylim(250,720); ax.set_xlabel("age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("total testosterone (ng/dL)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Endocrine","Testosterone declines slowly with age",
             "~1%/yr after 30. Treat symptomatic hypogonadism — not 'low-normal for your age' (lifestyle first).")
    ds.footer(ax,"BLSA & population data (illustrative)","testosterone-age-decline",tier="cohort")
    ds.save(fig,f"{FIG}/83-testosterone-age.png")
def cancer_incidence():
    age=[30,40,50,60,70,80]; inc=[60,170,430,900,1650,2400]
    fig,ax=ds.new_fig(8.6,5.0); ax.plot(age,inc,"-o",color=ds.GOLD,lw=3,markerfacecolor=ds.GOLD_D)
    ax.set_ylim(0,2700); ax.set_xlabel("age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("cancer incidence (per 100,000/yr)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Oncology","Cancer is, overwhelmingly, a disease of aging",
             "Incidence climbs steeply with age — the accumulation of mutations over time. Aging IS the biggest risk factor.")
    ds.footer(ax,"SEER incidence by age (illustrative)","cancer-incidence-age",tier="cohort")
    ds.save(fig,f"{FIG}/84-cancer-incidence.png")
def calerie():
    labels=["LDL-C","Blood pressure","Insulin\nresistance","Inflammation\n(CRP)","Epigenetic\npace"]; vals=[12,4,25,47,8]
    fig,ax=ds.new_fig(8.8,5.2); xp=range(len(labels))
    ax.bar(xp,vals,width=0.6,color=ds.GOLD_D,edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,vals): ax.text(i,v+1,f"−{v}%",ha="center",fontsize=11,color="#1d6b2e",fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(labels,fontsize=9.5); ax.set_ylim(0,55); ax.grid(axis="x",visible=False)
    ax.set_ylabel("improvement over 2 years (%)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Nutrition · the only human CR trial","Caloric restriction in humans — modest & real",
             "CALERIE: ~12% calorie cut for 2 yr improved risk markers and slightly slowed one aging-pace clock.")
    ds.footer(ax,"CALERIE trial (illustrative surrogate endpoints)","calerie-human-cr-rct",tier="rct")
    ds.flag(ax,"surrogate markers, not hard outcomes","caution")
    ds.save(fig,f"{FIG}/85-calerie.png",bottom=0.2)
def vo2max_age():
    age=[20,30,40,50,60,70,80]; sed=[45,42,38,34,30,26,22]; tr=[55,53,50,46,42,38,33]
    fig,ax=ds.new_fig(8.6,5.0)
    ax.axhline(18,color="#b5471f",ls=":",lw=1.4); ax.text(21,19,"frailty threshold (~independence)",fontsize=9,color="#b5471f")
    ax.plot(age,sed,"-o",color="#b9ad8e",lw=2.6,label="sedentary"); ax.plot(age,tr,"-o",color=ds.GOLD_D,lw=2.6,label="lifelong trainer")
    ax.fill_between(age,sed,tr,color=ds.GOLD,alpha=0.10)
    ax.set_ylim(15,60); ax.set_xlabel("age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("VO₂max (mL/kg/min)",fontsize=10,color=ds.MUT); ax.legend(fontsize=9.5)
    ds.title(ax,"Training · the long game","Fitness fades with age — training buys a decade+",
             "VO₂max drops ~10%/decade. A higher peak + slower decline keeps you above the frailty line for longer.")
    ds.footer(ax,"Cross-sectional VO₂max-by-age (illustrative)","vo2max-age-decline",tier="cohort")
    ds.save(fig,f"{FIG}/86-vo2max-age.png")
def hormesis_curve():
    x=np.linspace(0,10,200); y=1+0.6*np.exp(-((x-3)**2)/2.5)-0.9/(1+np.exp(-(x-6.5)))
    fig,ax=ds.new_fig(8.6,5.0)
    ax.axhline(1.0,color=ds.MUT,ls=":",lw=1.2)
    ax.axvspan(1.5,4.5,color="#e9f3ea",zorder=0); ax.axvspan(7,10,color="#fbf0ea",zorder=0)
    ax.plot(x,y,color=ds.GOLD,lw=3)
    ax.text(3,1.72,"BENEFIT\n(hormesis)",ha="center",fontsize=10,color="#1d6b2e",fontweight="bold")
    ax.text(8.4,0.45,"HARM\n(too much)",ha="center",fontsize=10,color="#b5471f",fontweight="bold")
    ax.set_ylim(0,2); ax.set_xticks([]); ax.set_yticks([]); ax.grid(False)
    ax.set_xlabel("dose of stress  (exercise · heat · cold · fasting · hypoxia)",fontsize=10,color=ds.MUT); ax.set_ylabel("benefit  →",fontsize=10,color=ds.MUT)
    ds.title(ax,"First Principles · the unifying law","Hormesis — the right dose of stress makes you stronger",
             "A little stress triggers adaptation; too much causes damage. The dose is everything.")
    ds.footer(ax,"The hormetic dose-response (conceptual)","thread-hormesis",tier="mechanistic")
    ds.save(fig,f"{FIG}/87-hormesis-curve.png")

# ---- SVG ----
def dementia_checklist():
    items=[("Treat hearing loss (aids)","biggest single factor"),("Keep LDL/apoB low","newly added, midlife"),
           ("Stay physically active","exercise → brain"),("Treat depression","and stay socially connected"),
           ("Don't smoke; limit alcohol",""),("Manage BP, diabetes, weight","the metabolic cluster"),
           ("Protect your head (helmets, falls)","TBI risk"),("Keep learning / stay engaged","cognitive reserve"),
           ("Correct vision loss","newly added"),("Reduce air-pollution exposure","")]
    W,H=960,80+len(items)*44+60
    head,y0,foot=ds.panel(W,H,"Brain · the actionable list","Dementia prevention — the modifiable factors",
        "~45% of dementia is potentially preventable. Here is the Lancet list, as a to-do.","§Brain & Cognition","dementia-prevention-actions")
    s=[head]; ry=y0+14; rh=(H-54-ry)/len(items)
    for i,(t,note) in enumerate(items):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(f'<circle cx="54" cy="{yy+rh/2}" r="11" fill="#1d6b2e"/>'); s.append(ds.text(54,yy+rh/2+4,"✓",size=12,fill="white",font=ds.DISPLAY,weight="bold",anchor="middle"))
        s.append(ds.text(80,yy+rh/2+4,t,size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
        if note: s.append(ds.text(W-44,yy+rh/2+4,note,size=10.5,fill=ds.MUT,font=ds.BODY,italic=True,anchor="end"))
    s.append(foot); ds.render("".join(s), f"{FIG}/88-dementia-checklist.png")

def fasting_protocols():
    rows=[("16:8 / TRE","daily 8-h eating window","easiest; mostly = the CR it causes","#5e8a3a"),
          ("OMAD","one meal a day","strong appetite control; hard on protein","#c08a1e"),
          ("5:2","2 low-cal days/week","flexible; evidence ≈ daily CR","#5e8a3a"),
          ("Alternate-day","fast every other day","effective but tough adherence","#c08a1e"),
          ("Extended (24–72 h)","multi-day water fast","supervision; REFEEDING risk","#b5471f"),
          ("Dry fasting","no food OR water","dangerous; weak evidence — avoid","#b5471f"),
          ("FMD (ProLon)","5-day fasting-mimic","the one branded protocol with a human RCT","#5e8a3a")]
    W,H=1020,80+len(rows)*46+64
    head,y0,foot=ds.panel(W,H,"Nutrition · the protocols","Fasting protocols, compared",
        "Most benefit is the calorie deficit. Earlier window beats later. Some are genuinely risky.","§Fasting, Cleanses & Protocols","fasting-protocols-compared")
    s=[head]
    for t,x in [("PROTOCOL",40),("WHAT IT IS",290),("HONEST TAKE",560)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,(p,what,take,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(f'<rect x="32" y="{yy}" width="6" height="{rh}" fill="{c}"/>')
        s.append(ds.text(46,yy+rh/2+4,p,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(290,yy+rh/2+4,what,size=10.5,fill=ds.MUT,font=ds.BODY))
        s.append(ds.text(560,yy+rh/2+4,take,size=10.5,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/89-fasting-protocols.png")

def recovery_toolkit():
    cards=[("SLEEP","#3a6ea5","~7 h, regular","the master recovery tool"),
           ("SAUNA","#b5471f","~4×/wk, 15–20 min","HSPs; cohort mortality data"),
           ("COLD","#1d6b2e","brief, end on cold","mood & alertness (not magic)"),
           ("BREATH","#b08d3a","slow, nasal, ~6/min","shifts autonomic balance"),
           ("NATURE / WALK","#5e8a55","daily, unhurried","lowers stress load"),
           ("CONNECTION","#9c5a7a","real, in-person","rivals smoking-cessation effect")]
    W,H=1020,520
    head,y0,foot=ds.panel(W,H,"Recovery · the toolkit","What actually helps you recover",
        "Stack the boring ones. Sleep does most of the work; the rest are useful add-ons.","§Recovery","recovery-toolkit")
    s=[head]; cols=3; cw=(W-80-2*20)/cols; ch=(H-104-y0-10)/2; gx,gy=40,y0+14
    for i,(t,c,dose,note) in enumerate(cards):
        r,col=divmod(i,cols); x=gx+col*(cw+20); yy=gy+r*(ch+18)
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="{cw:.0f}" height="{ch:.0f}" rx="11" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="{cw:.0f}" height="32" fill="{c}"/>')
        s.append(ds.text(x+16,yy+22,t,size=14,fill="white",font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x+16,yy+58,dose,size=13,fill=ds.INK2,font=ds.DISPLAY,weight="700"))
        s.append(ds.text(x+16,yy+80,note,size=10.5,fill=ds.MUT,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/90-recovery-toolkit.png")

def minimal_equipment():
    rows=[("Bodyweight only","push-ups · pull-ups · squats · lunges · planks","everything but heavy pulling","#1d6b2e"),
          ("One resistance band","rows · presses · pull-aparts · assisted pull-ups","adds pulling & scalable load","#1d6b2e"),
          ("One adjustable dumbbell / KB","goblet squat · RDL · row · press · carry · swing","near-complete strength kit","#1d6b2e"),
          ("A pull-up bar","pull-ups · hangs · leg raises","the missing vertical pull","#5e8a3a"),
          ("A pair of shoes","walk · ruck · run · sprint · hike","all the cardio you need","#5e8a3a")]
    W,H=1020,80+len(rows)*48+60
    head,y0,foot=ds.panel(W,H,"Training · no gym required","You can train almost anywhere",
        "Adherence beats equipment. This covers all four capacities for the price of a band and a bar.","§Exercise Modalities","minimal-equipment")
    s=[head]
    for t,x in [("KIT",40),("WHAT YOU CAN DO",330),("",W-220)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-54-ry)/len(rows)
    for i,(k,does,note,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,k,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(330,yy+rh/2+4,does,size=10.5,fill=ds.INK,font=ds.BODY))
        s.append(ds.text(W-220,yy+rh/2+4,note,size=10,fill=c,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/91-minimal-equipment.png")

def autonomic_ns():
    W,H=1020,540
    head,y0,foot=ds.panel(W,H,"Nervous system · the autopilot","Sympathetic vs parasympathetic",
        "Two opposing branches keep you balanced — fight-or-flight and rest-and-digest. HRV reads the balance.","§Nervous System","autonomic-balance")
    s=[head]
    cols=[("SYMPATHETIC","#b5471f","“fight or flight” — gas pedal",["↑ heart rate & BP","↑ alertness, pupils dilate","blood to muscles","↓ digestion","fuel mobilized"]),
          ("PARASYMPATHETIC","#1d6b2e","“rest & digest” — brake (vagus)",["↓ heart rate & BP","calm, recovery, repair","↑ digestion","sleep & restoration","slow breathing boosts it"])]
    cw=(W-70-40)/2
    for i,(t,c,sub,items) in enumerate(cols):
        x=40+i*(cw+30)
        s.append(f'<rect x="{x:.0f}" y="{y0+10}" width="{cw:.0f}" height="{H-y0-80:.0f}" rx="12" fill="{ds.CARD}" stroke="{c}" stroke-width="1.8"/>')
        s.append(f'<rect x="{x:.0f}" y="{y0+10}" width="{cw:.0f}" height="40" fill="{c}"/>')
        s.append(ds.text(x+cw/2,y0+37,t,size=16,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
        s.append(ds.text(x+20,y0+72,sub,size=11,fill=ds.MUT,font=ds.BODY,italic=True))
        for k,it in enumerate(items): s.append(f'<circle cx="{x+26}" cy="{y0+100+k*36}" r="3.5" fill="{c}"/>'); s.append(ds.text(x+40,y0+104+k*36,it,size=12,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/92-autonomic-ns.png")

def fight_or_flight():
    W,H=1020,400
    head,y0,foot=ds.panel(W,H,"Nervous system · the acute stress response","Fight-or-flight, step by step",
        "A fast, life-saving cascade — designed for short bursts, not chronic activation.","§Nervous System","fight-or-flight")
    s=[head, arrowdefs()]
    steps=[("Threat","brain detects danger"),("Amygdala alarm","→ hypothalamus"),("Adrenaline surge","seconds: heart races"),
           ("Cortisol","minutes: fuel & focus"),("Body primed","fight, flee — or freeze"),("Shut-off","when safe (the key step)")]
    n=len(steps); bw=140; gap=(W-100-n*bw)/(n-1); x=50; cy=y0+60
    cols=["#8a8170","#b08d3a","#b5471f","#c2693a","#8a6d12","#1d6b2e"]
    for i,(t,d) in enumerate(steps):
        xx=x+i*(bw+gap)
        s.append(f'<rect x="{xx:.0f}" y="{cy-32:.0f}" width="{bw}" height="64" rx="9" fill="{ds.CARD}" stroke="{cols[i]}" stroke-width="1.8"/>')
        s.append(ds.text(xx+bw/2,cy-4,t,size=12.5,fill=cols[i],font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(xx+bw/2,cy+16,d,size=9.5,fill=ds.MUT,font=ds.BODY,anchor="middle"))
        if i<n-1: s.append(arrow(xx+bw,cy,xx+bw+gap-4,cy,ds.MUT,2,"ah"))
    s.append(ds.text(50,H-52,"Modern problem: the threat never ends, so the system never shuts off — chronic stress is the harm.",size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/93-fight-or-flight.png")

def menopause_timeline():
    t=np.linspace(-6,8,200); est=8-7/(1+np.exp(-(t-0)*1.4))
    fig,ax=ds.new_fig(8.6,5.0)
    ax.axvspan(-2,2,color="#f3ecd2",zorder=0); ax.text(0,7.3,"perimenopause",ha="center",fontsize=9.5,color="#8a6d12",fontweight="bold")
    ax.plot(t,est,color=ds.GOLD,lw=3)
    ax.axvline(0,color=ds.MUT,ls=":",lw=1.2); ax.text(0.2,1.2,"final period",fontsize=9,color=ds.MUT)
    ax.set_xlim(-6,8); ax.set_ylim(0,8.5); ax.set_xlabel("years relative to menopause",fontsize=10,color=ds.MUT); ax.set_ylabel("estrogen (relative)",fontsize=10,color=ds.MUT)
    ds.title(ax,"Women's health","Menopause — the estrogen transition",
             "Estrogen falls over the perimenopausal window, accelerating bone & cardiometabolic change. The lever: strength + protein (± HRT, timed).")
    ds.footer(ax,"Reproductive-hormone transition (illustrative)","menopause-estrogen-timeline",tier="mechanistic")
    ds.save(fig,f"{FIG}/94-menopause-timeline.png")

CHARTS=[lifespan_over_time,bmi_jcurve,testosterone_age,cancer_incidence,calerie,vo2max_age,hormesis_curve,menopause_timeline]
SVGS=[dementia_checklist,fasting_protocols,recovery_toolkit,minimal_equipment,autonomic_ns,fight_or_flight]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
