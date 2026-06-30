#!/usr/bin/env python3
"""FINAL wave 3 — closing figures to complete the set."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds, numpy as np
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
def Lb(ax,x,v,f="{:.0f}",dy=0.5,fs=10):
    for xi,vi in zip(x,v): ax.text(xi,vi+dy,f.format(vi),ha="center",fontsize=fs,color=INK,fontweight="bold")
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sz=12.5):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    for j,ln in enumerate(label.split("\n")): s+=ds.text(x+w/2,y+h/2+5+(j-(len(label.split(chr(10)))-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def fr(k,t,sub,src,claim,W,H): return ds.panel(W,H,k,t,sub,src,claim)
ARROW='<defs><marker id="bk" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1c1a17"/></marker></defs>'

# 1. calories vs LE puzzle
def calories_le():
    pts=[("Tennis",400,9.7),("Badminton",450,6.2),("Soccer",500,4.7),("Cycling",420,3.7),("Swimming",500,3.4),("Jogging",600,3.2),("Gym",350,1.5)]
    fig,ax=ds.new_fig(8.6,5.4)
    for n,kcal,le in pts:
        ax.scatter(kcal,le,s=110,color=GOLD,edgecolor=GOLDD,linewidth=1.3,zorder=3)
        ax.annotate(n,(kcal,le),textcoords="offset points",xytext=(7,4),fontsize=9.5,color=INK,fontweight="bold")
    ax.set_xlim(300,680); ax.set_ylim(0,11); ax.set_xlabel("calories burned per hour",fontsize=10,color=MUT)
    ax.set_ylabel("life-expectancy gain (years)",fontsize=10,color=MUT)
    ds.title(ax,"Sports & Play · §45","Calories don't explain the longevity gap",
             "Jogging burns the most calories yet adds far fewer years than tennis. Calories aren't the active ingredient — the social, skillful, intermittent dimensions are.")
    ds.footer(ax,"Schnohr 2018 (CCHS) — derived","calories-vs-le-puzzle",tier="cohort")
    ds.save(fig,f"{FIG}/Y01-calories-le.png")

# 2. GLP-1 surrogate vs hard
def glp1():
    data=[("STEP-1\nweight",15,GOLD,"surrogate"),("SURMOUNT-1\nweight",21,GOLD,"surrogate"),("SELECT\nMACE",20,GRN,"hard outcome"),("FLOW\nkidney events",24,GRN,"hard outcome")]
    L=[d[0] for d in data]; v=[d[1] for d in data]; cols=[d[2] for d in data]
    fig,ax=ds.new_fig(8.8,5.2); x=range(len(L))
    ax.bar(x,v,color=cols,width=0.6,edgecolor=ds.PAPER,linewidth=1.2); Lb(ax,x,v,"{:.0f}%")
    ax.set_xticks(list(x)); ax.set_xticklabels(L,fontsize=9.6); ax.set_ylim(0,30)
    ax.set_ylabel("reduction (%)",fontsize=10,color=MUT)
    import matplotlib.patches as mp
    ax.legend(handles=[mp.Patch(color=GOLD,label="surrogate (weight)"),mp.Patch(color=GRN,label="hard outcome (events)")],fontsize=9,frameon=False,loc="upper left")
    ds.title(ax,"Pharmacology · §10","GLP-1 drugs: not just weight, but real outcomes",
             "Unusually, the weight-loss surrogate is now backed by hard endpoints — fewer cardiovascular events (SELECT) and kidney events (FLOW). Mechanism AND outcome.")
    ds.footer(ax,"STEP-1; SURMOUNT-1; SELECT; FLOW","glp1-surrogate-and-hard",tier="rct")
    ds.save(fig,f"{FIG}/Y02-glp1-outcomes.png")

# 3. mammography overdiagnosis
def mammography():
    cats=["Deaths\nprevented","Overdiagnosed\n(treated needlessly)"]; v=[1,3]
    fig,ax=ds.new_fig(8.2,5.2); x=range(len(cats))
    ax.bar(x,v,color=[GRN,WARN],width=0.5,edgecolor=ds.PAPER,linewidth=1.2); Lb(ax,x,v,"~{:.0f}",dy=0.05)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats,fontsize=11); ax.set_ylim(0,4)
    ax.set_ylabel("per breast-cancer death prevented",fontsize=9.6,color=MUT)
    ds.title(ax,"Prevention · §07","Mammography: real benefit, real overdiagnosis",
             "For each death prevented, ~3 women are overdiagnosed — treated for a cancer that would never have harmed them. A genuine benefit AND a genuine harm; informed choice matters.")
    ds.footer(ax,"Marmot 2012 (UK Independent Review)","mammography-overdiagnosis",tier="meta")
    ds.save(fig,f"{FIG}/Y03-mammography.png")

# 4. prenatal supplements matrix
def prenatal():
    W,H=1000,92+6*44+64
    head,y0,foot=ds.panel(W,H,"Life Stages · §19 §3.1","Prenatal supplements — load-bearing vs marketing","Two have RCT-strength evidence; the rest of the aisle is mostly noise. 'Eating for two' and 'detox' are myths.","§19 §3.1","prenatal-supplements")
    s=[head]; xs=[40,360,850]
    for h,x in zip(["SUPPLEMENT","WHAT IT DOES","GRADE"],xs): s.append(ds.text(x,y0+2,h,size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    rows=[("Folate / folic acid","prevents neural-tube defects",("RCT-STRONG",GRN)),
          ("Iodine","prevents cognitive deficits",("RCT-STRONG",GRN)),
          ("Iron (if anemic)","corrects measured anemia",("CONTEXT",AMB)),
          ("Vitamin D (if low)","corrects deficiency",("CONTEXT",AMB)),
          ("DHA / omega-3","modest, mixed",("MODEST",AMB)),
          ("'Eat for two' / 'detox'","no benefit; potential harm",("MYTH",WARN))]
    ry=y0+16; rh=(H-58-ry)/len(rows)
    for i,(a,b,bd) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+rh/2+4,a,size=11.6,fill=INK,font=ds.BODY,weight="700"))
        s.append(ds.text(360,yy+rh/2+4,b,size=10.3,fill=INK,font=ds.BODY))
        bb,_=ds.badge(850,yy+rh/2-9,bd[0],bd[1],h=17,size=8.0); s.append(bb)
    s.append(foot); ds.render("".join(s),f"{FIG}/Y04-prenatal.png")

# 5. HRV trend
def hrv():
    W,H=1000,360
    head,cy,foot=fr("Recovery · §05 §5.1","HRV — your trend, not a leaderboard","Heart-rate variability is useful tracked against YOUR baseline over time. Comparing your number to other people's is noise.","§05 §5.1","hrv-trend",W,H)
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(60,cy+20,380,46,"USE: your own trend",fill="#eef4ec",stroke=GRN,tcol=GRN))
    # mini trendline
    pts="".join(f"{90+i*30},{cy+150-([0,6,4,10,8,14,12,18][i])} " for i in range(8))
    s.append(f'<polyline points="{pts}" fill="none" stroke="{GRN}" stroke-width="2.5"/>')
    s.append(ds.text(250,cy+178,"rising baseline = recovering well",size=11,fill=GRN,font=ds.BODY,anchor="middle"))
    s.append(box(W-440,cy+20,380,46,"IGNORE: vs other people",fill="#f6ece6",stroke=WARN,tcol=WARN))
    s.append(ds.text(W-250,cy+120,"“my HRV is 45, yours is 70”",size=12.5,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(f'<line x1="{W-380}" y1="{cy+108}" x2="{W-120}" y2="{cy+132}" stroke="{WARN}" stroke-width="3"/>')
    s.append(ds.text(W-250,cy+170,"genetics & age make cross-person comparison meaningless",size=10.5,fill=MUT,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Y05-hrv.png")

# 6. adherence > optimality
def adherence():
    W,H=1000,360
    head,cy,foot=fr("Modalities · §44 §11","Adherence beats optimality","The gap between 'optimal' and 'pretty good' is tiny. The gap between 'something' and 'nothing' is enormous. Do what you'll keep doing.","§44 §11","adherence-optimality",W,H)
    s=[head,ARROW]; y=cy+120
    s.append(f'<line x1="80" y1="{y}" x2="{W-80}" y2="{y}" stroke="{INK}" stroke-width="3"/>')
    for f_,lab,v,c in [(0.06,"Sedentary",4,WARN),(0.5,"Any sensible\nroutine you keep",88,GRN),(0.62,"A slightly\n'better' routine",92,GRN2),(0.74,"The 'optimal'\nprogram",95,GRN)]:
        x=80+(W-160)*f_; s.append(f'<circle cx="{x}" cy="{y}" r="7" fill="{c}"/>')
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y+28+j*15,ln,size=11,fill=c,font=ds.DISPLAY,weight="600",anchor="middle"))
        s.append(ds.text(x,y-16,f"{v}",size=12,fill=c,font=ds.DISPLAY,weight="800",anchor="middle"))
    x0=80+(W-160)*0.06; x1=80+(W-160)*0.5
    s.append(f'<line x1="{x0}" y1="{y-44}" x2="{x1}" y2="{y-44}" stroke="{WARN}" stroke-width="2.5" marker-end="url(#bk)"/>')
    s.append(ds.text((x0+x1)/2,y-52,"HUGE gain",size=12,fill=WARN,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(W*0.72,y-52,"tiny gains →",size=11,fill=MUT,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Y06-adherence.png")

# 7. strength pattern ladders
def ladders():
    W,H=1000,490
    head,cy,foot=fr("Training · §02 §2","Five patterns, three rungs each","Every strength program is built from these. Regress to build the pattern; progress to keep it challenging.","§02 §2","strength-pattern-ladders",W,H)
    s=[head]; pats=[("Squat","box squat","goblet squat","barbell / pistol"),("Hinge","hip hinge","RDL","deadlift / swing"),
        ("Push","incline push-up","push-up","dip / overhead"),("Pull","band row","inverted row","pull-up"),("Carry","suitcase hold","farmer carry","heavy / overhead")]
    x0=40; cw=(W-80)/3
    s.append(ds.text(40,cy+8,"PATTERN",size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    for j,h in enumerate(["REGRESSION","STANDARD","PROGRESSION"]): s.append(ds.text(190+j*250+90,cy+8,h,size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold",anchor="middle"))
    for i,(name,a,b,c) in enumerate(pats):
        yy=cy+24+i*56
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="52" fill="#f6f1e4"/>')
        s.append(ds.text(44,yy+30,name,size=13,fill=INK,font=ds.DISPLAY,weight="700"))
        for j,(t,col) in enumerate([(a,AMB),(b,GRN2),(c,GRN)]):
            x=170+j*250; s.append(f'<rect x="{x}" y="{yy+12}" width="228" height="30" rx="7" fill="{col}" opacity="0.12" stroke="{col}" stroke-width="1.5"/>')
            s.append(ds.text(x+114,yy+32,t,size=11.5,fill=INK,font=ds.BODY,anchor="middle"))
            if j<2: s.append(ds.text(x+238,yy+32,"→",size=13,fill=MUT,font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Y07-strength-ladders.png")

# 8. racquet 4-dimension bundle
def racquet():
    W,H=1000,420
    head,cy,foot=fr("Sports & Play · §45 §3","Why racquet sports keep topping the charts","Four ingredients overlap in tennis/badminton/pickleball — and together they drive the thing that matters: you keep doing it.","§45 §3","racquet-bundle",W,H)
    cx,cyh=W/2,cy+150; s=[head,ARROW]
    quad=[("Intermittent\nHIIT bursts",-150,-70,WARN),("Motor learning\n(skill)",150,-70,AMB),("Social partner",-150,70,BLUE),("Lifelong\nplayability",150,70,GRN)]
    for lab,dx,dy,c in quad:
        x,y=cx+dx,cyh+dy; s.append(f'<circle cx="{x}" cy="{y}" r="66" fill="{c}" opacity="0.13" stroke="{c}" stroke-width="2"/>')
        for j,ln in enumerate(lab.split("\n")): s.append(ds.text(x,y-2+j*14,ln,size=11.5,fill=INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(f'<circle cx="{cx}" cy="{cyh}" r="52" fill="{GRN}"/>')
    s.append(ds.text(cx,cyh-2,"ADHERENCE",size=12,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
    s.append(ds.text(cx,cyh+16,"(you keep going)",size=9.5,fill="#fff",font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Y08-racquet-bundle.png")

# 9. liver flush debunk
def liver_flush():
    W,H=1000,340
    head,cy,foot=fr("Fasting · §36 §4.4","The 'liver flush stones' are soap, not gallstones","Drinking olive oil + citrus juice produces greenish pellets in the stool — these are saponified soap, not gallstones.","§36 §4.4","liver-flush-debunk",W,H)
    s=[head,ARROW]
    s.append(box(70,cy+40,250,70,"Olive oil + citrus juice\n(the 'flush')",stroke=GOLDD))
    s.append(f'<line x1="320" y1="{cy+75}" x2="400" y2="{cy+75}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    s.append(ds.text(360,cy+62,"gut",size=10,fill=MUT,font=ds.MONO,anchor="middle"))
    s.append(box(400,cy+40,250,70,"Fatty acids + bile salts\nsaponify",fill="#f6ece6",stroke=AMB))
    s.append(f'<line x1="650" y1="{cy+75}" x2="730" y2="{cy+75}" stroke="{INK}" stroke-width="3" marker-end="url(#bk)"/>')
    s.append(box(730,cy+40,210,70,"Green 'stones'\n= SOAP pellets",fill="#eef4ec",stroke=GRN,tcol=GRN))
    s.append(ds.text(W/2,cy+150,"Real gallstones are found by ultrasound — and they don't pass painlessly in a smoothie.",size=11.5,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/Y09-liver-flush.png")

# 10. GH/IGF-1 own goal
def gh_owngoal():
    W,H=1000,330
    head,cy,foot=fr("Biohacking · §32 §1.3","The GH / IGF-1 longevity own-goal","Longevity genetics points to LOWER growth signaling for a longer life — yet GH boosters push the lever the WRONG way.","§32 §1.3","gh-igf1-owngoal",W,H)
    s=[head]; y=cy+90; x0=120; x1=W-120
    s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="3"/>')
    s.append(ds.text(x0,y-16,"LOW GH / IGF-1",size=13,fill=GRN,font=ds.DISPLAY,weight="800"))
    s.append(ds.text(x0,y+24,"dwarf mice, Laron syndrome,\nlow-IGF1 long-lived → longer life",size=10.5,fill=GRN,font=ds.BODY))
    s.append(ds.text(x1,y-16,"HIGH GH / IGF-1",size=13,fill=WARN,font=ds.DISPLAY,weight="800",anchor="end"))
    s.append(ds.text(x1,y+24,"more growth, more cancer,\nshorter life",size=10.5,fill=WARN,font=ds.BODY,anchor="end"))
    s.append(f'<line x1="{(x0+x1)/2-40}" y1="{y-44}" x2="{x1-160}" y2="{y-44}" stroke="{WARN}" stroke-width="2.5" marker-end="url(#bk)"/>')
    s.append(ds.text((x0+x1)/2+60,y-52,"GH secretagogues push you THIS way",size=11,fill=WARN,font=ds.BODY,weight="600",anchor="middle"))
    s.append(ARROW+foot); ds.render("".join(s),f"{FIG}/Y10-gh-owngoal.png")

# 11. caffeine timing
def caffeine():
    t=np.linspace(0,24,300); dose=np.zeros_like(t)
    for tc in [7,10,14]: dose+=100*np.where(t>=tc,0.5**((t-tc)/5.5),0)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(t,dose,lw=3,color=GOLD,solid_capstyle="round")
    ax.axvspan(22,24,color=BLUE,alpha=0.08); ax.axvline(14,ls="--",color=WARN,lw=1.3)
    ax.text(14.2,150,"last cup ~8–10 h\nbefore bed",fontsize=9.5,color=WARN)
    ax.text(22.1,120,"sleep",fontsize=9.5,color=BLUE)
    ax.set_xlim(6,24); ax.set_ylim(0,210); ax.set_xlabel("time of day (h)",fontsize=10,color=MUT)
    ax.set_ylabel("caffeine in the body (mg)",fontsize=10,color=MUT)
    ds.title(ax,"Recovery · §05","Caffeine has a long tail — time it for sleep",
             "With a ~5–6 h half-life, an afternoon coffee is still ~¼ onboard at bedtime — enough to fragment deep sleep even if you fall asleep fine. Cut it off early.")
    ds.footer(ax,"caffeine pharmacokinetics — §05","caffeine-timing","mechanistic")
    ds.save(fig,f"{FIG}/Y11-caffeine.png")

if __name__=="__main__":
    for fn in [calories_le,glp1,mammography,prenatal,hrv,adherence,ladders,racquet,liver_flush,gh_owngoal,caffeine]:
        fn(); print(fn.__name__,"ok")
