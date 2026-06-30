#!/usr/bin/env python3
"""Wave 8 figures."""
import os, sys, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
def arrowdefs():
    out="".join(f'<marker id="{n}" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="{c}"/></marker>' for n,c in [("ah",ds.GOLD_D),("ar","#b5471f")])
    return f'<defs>{out}</defs>'
def arrow(x1,y1,x2,y2,c=ds.GOLD_D,w=2.2,m="ah"):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" marker-end="url(#{m})"/>'

# ---- CHARTS ----
def social_connection():
    labels=["Strong social ties","Quit smoking","Exercise","Lose weight (obese)","Flu vaccine"]; vals=[50,45,30,20,15]
    fig,ax=ds.new_fig(8.8,5.2); yp=list(range(len(labels)))[::-1]
    cols=[ds.GOLD_D]+["#b9ad8e"]*4
    ax.barh(yp,vals,color=cols,height=0.66,edgecolor=ds.PAPER,linewidth=1.2)
    for y,v in zip(yp,vals): ax.text(v+0.6,y,f"+{v}%",va="center",fontsize=10.5,color=ds.INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=11); ax.set_xlim(0,58); ax.grid(axis="y",visible=False)
    ax.set_xlabel("approx. increase in odds of survival",fontsize=10,color=ds.MUT)
    ds.title(ax,"Psychosocial · the omitted lever","Social connection rivals quitting smoking",
             "Among the largest mortality factors there is — and the one nobody sells you a product for.")
    ds.footer(ax,"Holt-Lunstad et al., meta-analyses","social-connection-mortality-meta",tier="meta")
    ds.save(fig,f"{FIG}/95-social-connection.png",left=0.2)
def smoking_quit():
    cats=["Never\nsmoked","Quit by 30","Quit by 40","Quit by 50","Keep\nsmoking"]; yrs=[0,0,1,4,10]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    ax.bar(xp,yrs,width=0.6,color=["#1d6b2e","#5e8a3a","#8a6d12","#c2693a","#b5471f"],edgecolor=ds.PAPER,linewidth=1.4)
    for i,v in zip(xp,yrs): ax.text(i,v+0.2,(f"−{v} yr" if v else "ref"),ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,11.5); ax.grid(axis="x",visible=False)
    ax.set_ylabel("life-years lost vs never-smoker",fontsize=10,color=ds.MUT)
    ds.title(ax,"Exposures · the #1 lever","Smoking costs ~10 years — quitting buys most back",
             "Quit by 40 and you recover ~9 of the 10 lost years. It is never too late, and earlier is far better.")
    ds.footer(ax,"Doll/Peto · Jha et al., NEJM 2013","smoking-mortality-quit","cohort")
    ds.save(fig,f"{FIG}/96-smoking-quit.png",bottom=0.2)
def leading_causes():
    labels=["Heart disease","Cancer","COVID/resp.","Accidents","Stroke","Alzheimer's","Diabetes","Kidney"]; vals=[695,605,250,225,165,120,100,55]
    fig,ax=ds.new_fig(8.8,5.4); yp=list(range(len(labels)))[::-1]
    cols=["#b5471f","#b08d3a","#8a8170","#8a8170","#b5471f","#3a6ea5","#1d6b2e","#8a6d12"]
    ax.barh(yp,vals,color=cols,height=0.7,edgecolor=ds.PAPER,linewidth=1.1)
    for y,v in zip(yp,vals): ax.text(v+6,y,f"{v}k",va="center",fontsize=10,color=ds.INK,fontweight="bold")
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5); ax.set_xlim(0,780); ax.grid(axis="y",visible=False)
    ax.set_xlabel("annual deaths (thousands, US, illustrative)",fontsize=10,color=ds.MUT)
    ds.title(ax,"The big picture","What actually kills people",
             "Mostly chronic disease of aging — and mostly downstream of the same handful of modifiable levers.")
    ds.footer(ax,"CDC leading causes of death (illustrative)","leading-causes-death",tier="cohort")
    ds.save(fig,f"{FIG}/97-leading-causes.png",left=0.18)
def epigenetic_clock():
    rng=np.random.default_rng(3); chrono=rng.uniform(30,75,80); bio=chrono+rng.normal(0,6,80)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot([28,78],[28,78],color=ds.MUT,ls="--",lw=1.4)
    fast=bio>chrono; ax.scatter(chrono[fast],bio[fast],s=42,color="#b5471f",alpha=0.8,label="aging faster")
    ax.scatter(chrono[~fast],bio[~fast],s=42,color="#1d6b2e",alpha=0.8,label="aging slower")
    ax.set_xlim(28,78); ax.set_ylim(20,86); ax.legend(fontsize=9.5,loc="upper left")
    ax.set_xlabel("chronological age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("epigenetic 'biological' age",fontsize=10,color=ds.MUT)
    ds.title(ax,"Aging biology","Biological age can differ from the calendar",
             "Clocks predict at the population level — but they're noisy and disagree, so a single number isn't a scorecard.")
    ds.footer(ax,"Epigenetic-clock concept (illustrative)","conflict-which-clock-is-valid",tier="cohort")
    ds.flag(ax,"not a validated personal test","caution")
    ds.save(fig,f"{FIG}/98-epigenetic-clock.png")
def sarcopenia():
    age=[30,40,50,60,70,80]; untrained=[100,97,92,84,73,60]; trained=[100,99,97,93,87,79]
    fig,ax=ds.new_fig(8.6,5.0)
    ax.plot(age,untrained,"-o",color="#b9ad8e",lw=2.6,label="untrained"); ax.plot(age,trained,"-o",color=ds.GOLD_D,lw=2.6,label="resistance-trained")
    ax.fill_between(age,untrained,trained,color=ds.GOLD,alpha=0.10)
    ax.set_ylim(50,105); ax.set_xlabel("age (years)",fontsize=10,color=ds.MUT); ax.set_ylabel("muscle mass (% of young-adult)",fontsize=10,color=ds.MUT); ax.legend(fontsize=9.5)
    ds.title(ax,"Musculoskeletal","Sarcopenia — you lose muscle unless you fight for it",
             "Muscle loss accelerates after 60. Resistance training is the only proven brake — start before you need it.")
    ds.footer(ax,"Muscle-mass-by-age (illustrative)","sarcopenia-age",tier="cohort")
    ds.save(fig,f"{FIG}/99-sarcopenia.png")
def air_pollution():
    cats=["Clean\n(<5)","Moderate\n(10)","Poor\n(25)","Severe\n(50)"]; hr=[1.0,1.08,1.2,1.4]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    ax.bar(xp,hr,width=0.6,color=["#1d6b2e","#8a6d12","#c2693a","#b5471f"],edgecolor=ds.PAPER,linewidth=1.4)
    for i,h in zip(xp,hr): ax.text(i,h+0.012,f"{h:.2f}",ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10); ax.set_ylim(0,1.55); ax.grid(axis="x",visible=False)
    ax.set_xlabel("fine-particle pollution  PM2.5 (µg/m³)",fontsize=10,color=ds.MUT); ax.set_ylabel("relative mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Exposures · the invisible one","Air pollution is a top-10 global killer",
             "PM2.5 raises cardiovascular, respiratory & dementia mortality. Mitigate: HEPA indoors, avoid high-traffic exercise.")
    ds.footer(ax,"GBD / Pope et al. — PM2.5 mortality","air-pollution-pm25-mortality",tier="cohort")
    ds.save(fig,f"{FIG}/100-air-pollution.png",bottom=0.2)

# ---- SVG ----
def central_dogma():
    W,H=1020,380
    head,y0,foot=ds.panel(W,H,"Foundations · the information flow","The central dogma — DNA to you",
        "Your genome is the blueprint; proteins are the machines. Everything downstream runs on this.","§First Principles / Genetics","central-dogma")
    s=[head, arrowdefs()]
    steps=[("DNA","the blueprint\n(in every cell)","#3a6ea5"),("RNA","the working copy\n(transcription)","#b08d3a"),
           ("PROTEIN","the machine\n(translation)","#b5471f"),("TRAIT / FUNCTION","what you see","#1d6b2e")]
    n=len(steps); bw=180; gap=(W-100-n*bw)/(n-1); x=50; cy=y0+66
    for i,(t,d,c) in enumerate(steps):
        xx=x+i*(bw+gap)
        s.append(f'<rect x="{xx:.0f}" y="{cy-36:.0f}" width="{bw}" height="72" rx="10" fill="{ds.CARD}" stroke="{c}" stroke-width="2"/>')
        s.append(ds.text(xx+bw/2,cy-8,t,size=15,fill=c,font=ds.DISPLAY,weight="900",anchor="middle"))
        for k,ln in enumerate(d.split("\n")): s.append(ds.text(xx+bw/2,cy+12+k*15,ln,size=10,fill=ds.MUT,font=ds.BODY,anchor="middle"))
        if i<n-1: s.append(arrow(xx+bw,cy,xx+bw+gap-4,cy,ds.MUT,2,"ah"))
    s.append(ds.text(50,H-52,"Epigenetics = which genes are switched on/off — and that's shaped by how you live.",size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/101-central-dogma.png")

def cholesterol_particles():
    W,H=1020,460
    head,y0,foot=ds.panel(W,H,"Cardiovascular · the particle that matters","Cholesterol, demystified — it's about apoB",
        "Cholesterol rides in particles. The number of artery-invading (apoB) particles is what drives risk.","§Clinical Prevention","apob-vs-cholesterol")
    s=[head]
    cy=y0+110
    groups=[("LDL particles","#b5471f",150,"each carries one apoB — these get into the artery wall",8),
            ("Lp(a)","#9c2f14",420,"an extra-nasty, genetic apoB particle",2),
            ("HDL particles","#1d6b2e",660,"reverse transport — generally protective",6)]
    for name,c,gx,desc,nshow in groups:
        for k in range(nshow):
            px=gx+(k%4)*30; py=cy+(k//4)*30
            s.append(f'<circle cx="{px}" cy="{py}" r="11" fill="{c}" fill-opacity="0.8"/>')
        s.append(ds.text(gx+45,cy-32,name,size=13,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
        s.append(ds.text(gx+45,cy+70,desc,size=9.5,fill=ds.MUT,font=ds.BODY,anchor="middle"))
    s.append(f'<rect x="32" y="{H-94}" width="{W-64}" height="40" rx="6" fill="{ds.CARD}" stroke="{ds.GOLD}" stroke-width="1.2"/>')
    s.append(ds.text(46,H-70,"Measure apoB, the particle count, for a truer read than LDL-C (the cargo). Lower apoB, lower & earlier in life = the lever.",size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/102-cholesterol-particles.png")

def the_cell():
    W,H=1020,560
    head,y0,foot=ds.panel(W,H,"Foundations · the unit of life","Inside the cell",
        "Tissues are made of cells; cells run on organelles. Two matter most for aging: mitochondria & the nucleus.","§First Principles","the-cell")
    s=[head, arrowdefs()]
    cx,cy,rx,ry=300,y0+170,250,150
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#f3ead6" stroke="{ds.GOLD_D}" stroke-width="3"/>')
    # nucleus
    s.append(f'<circle cx="{cx-40}" cy="{cy-20}" r="62" fill="#3a6ea5" fill-opacity="0.22" stroke="#3a6ea5" stroke-width="2.5"/>')
    s.append(f'<circle cx="{cx-40}" cy="{cy-20}" r="22" fill="#3a6ea5" fill-opacity="0.5"/>')
    # mitochondria
    for mx,my in [(cx+90,cy+40),(cx+60,cy-70),(cx+140,cy-20)]:
        s.append(f'<ellipse cx="{mx}" cy="{my}" rx="34" ry="17" fill="#b5471f" fill-opacity="0.7"/>')
    # leaders
    def lead(tx,ty,lx,ly,txt,c=ds.MUT):
        return arrow(tx,ty,lx,ly,c,1.4,"ah")+ds.text(tx,ty-6 if ty<cy else ty+14,txt,size=11,fill=ds.INK,font=ds.BODY,weight="600",anchor="start")
    s.append(ds.text(620,y0+60,"NUCLEUS",size=13,fill="#3a6ea5",font=ds.DISPLAY,weight="800")); s.append(ds.text(620,y0+78,"your DNA / control centre",size=10.5,fill=ds.MUT,font=ds.BODY))
    s.append(arrow(615,y0+66,cx+18,cy-30,"#3a6ea5",1.6,"ah"))
    s.append(ds.text(620,y0+150,"MITOCHONDRIA",size=13,fill="#b5471f",font=ds.DISPLAY,weight="800")); s.append(ds.text(620,y0+168,"the power plants (Part II)",size=10.5,fill=ds.MUT,font=ds.BODY))
    s.append(arrow(615,y0+156,cx+120,cy-15,"#b5471f",1.6,"ah"))
    s.append(ds.text(620,y0+240,"MEMBRANE",size=13,fill="#b08d3a",font=ds.DISPLAY,weight="800")); s.append(ds.text(620,y0+258,"the gated border",size=10.5,fill=ds.MUT,font=ds.BODY))
    s.append(arrow(615,y0+246,cx+rx-12,cy+60,"#b08d3a",1.6,"ah"))
    s.append(foot); ds.render("".join(s), f"{FIG}/103-the-cell.png")

def longevity_pipeline():
    rows=[("Lifestyle (exercise, diet, sleep)","PROVEN — the only thing with hard human outcomes","#1d6b2e","USE NOW"),
          ("Statins · BP drugs · GLP-1 · vaccines","PROVEN clinical drugs (for the right person)","#1d6b2e","CLINICAL"),
          ("Senolytics","mouse-strong; human pilots underway","#c08a1e","IN TRIALS"),
          ("Rapamycin (low-dose)","mouse lifespan; human dosing being tested","#c08a1e","IN TRIALS"),
          ("Partial reprogramming","striking in mice; cancer risk; years away","#c08a1e","PRECLINICAL"),
          ("NAD+ boosters · resveratrol","surrogate only; no outcome benefit shown","#b5471f","HYPE"),
          ("Young plasma · most 'anti-aging' clinics","sold ahead of evidence","#b5471f","AVOID")]
    W,H=1020,80+len(rows)*46+60
    head,y0,foot=ds.panel(W,H,"The frontier · what's real","The longevity pipeline — proven to predatory",
        "From today's proven levers to the experimental frontier to the stuff sold ahead of the science.","§Regenerative Frontier","longevity-pipeline")
    s=[head]
    for t,x in [("INTERVENTION",40),("WHERE IT STANDS",420),("",W-160)]: s.append(ds.text(x,y0+2,t,size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-54-ry)/len(rows)
    for i,(nm,note,c,verd) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,nm,size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(420,yy+rh/2+4,note,size=10.5,fill=ds.INK,font=ds.BODY))
        b,_=ds.badge(W-160,yy+rh/2-9,verd,c,h=18,size=8.5); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/104-longevity-pipeline.png")

def red_flags():
    rows=[("Chest pain / pressure (esp. + arm, jaw, sweat)","call emergency services — possible heart attack"),
          ("Face/arm/speech sudden weakness (BE-FAST)","call now — possible stroke"),
          ("Worst headache of your life, sudden","ER — possible bleed"),
          ("Trouble breathing / swelling + hives","epinephrine + 911 — anaphylaxis"),
          ("Unintentional weight loss, night sweats","see a doctor — workup"),
          ("Blood in stool / urine, or black stools","see a doctor — don't wait"),
          ("A new or changing mole (ABCDE)","get it checked — skin cancer"),
          ("Persistent change in bowel/bladder habits","screen / evaluate")]
    W,H=1020,80+len(rows)*44+60
    head,y0,foot=ds.panel(W,H,"Know when to act","Red-flag symptoms — don't wait these out",
        "Most symptoms are benign — but a few mean 'go now'. This is not a diagnosis; when unsure, get seen.","§Emergency / Clinical","red-flag-symptoms")
    s=[head]; ry=y0+14; rh=(H-54-ry)/len(rows)
    for i,(t,act) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(50,yy+rh/2+4,"⚠",size=14,fill="#b5471f",font=ds.BODY,weight="bold"))
        s.append(ds.text(78,yy+rh/2+4,t,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(W-44,yy+rh/2+4,act,size=10.5,fill="#b5471f",font=ds.BODY,weight="600",anchor="end"))
    s.append(foot); ds.render("".join(s), f"{FIG}/105-red-flags.png")

CHARTS=[social_connection,smoking_quit,leading_causes,epigenetic_clock,sarcopenia,air_pollution]
SVGS=[central_dogma,cholesterol_particles,the_cell,longevity_pipeline,red_flags]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
