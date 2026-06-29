#!/usr/bin/env python3
"""Wave 2 figures: dose-response charts, reference matrices, two wheels, infographics.
Data are representative published values (footnoted); illustrative ones say so."""
import os, sys, math, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
import ds
import matplotlib.pyplot as plt
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))

# ================= CHARTS =================
def strength_jcurve():
    x=[0,15,30,45,60,90,120,150]; y=[1.00,0.88,0.83,0.82,0.83,0.86,0.89,0.92]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(x,y,"-",color=ds.GOLD,lw=3,zorder=3,solid_capstyle="round")
    ax.scatter(x,y,s=70,color=ds.GOLD_D,zorder=4,edgecolor=ds.PAPER,linewidth=1.4)
    ax.axvspan(30,60,color="#e9f3ea",zorder=0); ax.text(45,0.965,"sweet spot",ha="center",fontsize=10,color="#1d6b2e",fontweight="bold")
    ax.set_ylim(0.78,1.03); ax.set_xlabel("resistance training, minutes per week",fontsize=10,color=ds.MUT)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Training","Strength: more is not better — a J-curve",
             "Benefit peaks ~30–60 min/week, then attenuates. (Strength, not muscle size, predicts survival.)")
    ds.footer(ax,"Momma et al., Br J Sports Med 2022 — meta-analysis","resistance-training-mortality-meta",tier="meta")
    ds.save(fig,f"{FIG}/20-strength-jcurve.png")

def steps_plateau():
    x=[2,4,6,8,10,12]; y=[1.00,0.74,0.59,0.51,0.49,0.49]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(x,y,"-",color=ds.GOLD,lw=3,zorder=3,solid_capstyle="round"); ax.scatter(x,y,s=70,color=ds.GOLD_D,zorder=4,edgecolor=ds.PAPER,linewidth=1.4)
    ax.axvline(7.5,color=ds.MUT,ls=":",lw=1.4); ax.text(7.7,0.92,"plateau ~7,000–8,000",fontsize=10,color=ds.MUT)
    ax.set_ylim(0.42,1.04); ax.set_xlabel("steps per day (thousands)",fontsize=10,color=ds.MUT)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Training","Steps help — but the benefit plateaus before 10,000",
             "Most of the gain is at the sedentary → active end; '10,000' is a 1960s marketing number.")
    ds.footer(ax,"Paluch et al., Lancet Public Health 2022 — meta-analysis","steps-mortality-plateau",tier="meta")
    ds.save(fig,f"{FIG}/21-steps-plateau.png")

def sleep_ushape():
    x=[4,5,6,7,8,9,10]; y=[1.16,1.06,1.01,1.00,1.05,1.18,1.36]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(x,y,"-",color=ds.GOLD,lw=3,zorder=3,solid_capstyle="round"); ax.scatter(x,y,s=70,color=ds.GOLD_D,zorder=4,edgecolor=ds.PAPER,linewidth=1.4)
    ax.scatter([7],[1.0],s=150,color="#1d6b2e",zorder=5,edgecolor=ds.PAPER,linewidth=2); ax.text(7,0.95,"~7 h",ha="center",fontsize=11,color="#1d6b2e",fontweight="bold")
    ax.set_ylim(0.9,1.42); ax.set_xlabel("habitual sleep duration (hours)",fontsize=10,color=ds.MUT)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Recovery","Sleep — a U-shape, with a ~7-hour floor",
             "Both short AND long sleep track higher mortality (long sleep is partly reverse causation).")
    ds.footer(ax,"Cappuccio et al., Sleep 2010 — meta (>1.3 M)","sleep-duration-mortality-ushape",tier="meta")
    ds.flag(ax,"long-sleep arm: reverse causation","caution")
    ds.save(fig,f"{FIG}/22-sleep-ushape.png")

def sauna_mortality():
    cats=["1×/week\n(reference)","2–3×/week","4–7×/week"]; hr=[1.00,0.76,0.60]
    fig,ax=ds.new_fig(8.6,5.2); xp=range(len(cats))
    ax.bar(xp,hr,width=0.55,color=[ "#b9ad8e",ds.GOLD,ds.GOLD_D],edgecolor=ds.PAPER,linewidth=1.4)
    for i,h in zip(xp,hr): ax.text(i,h+0.02,f"{h:.2f}",ha="center",fontsize=11,color=ds.INK,fontweight="bold")
    ax.set_xticks(list(xp)); ax.set_xticklabels(cats,fontsize=10.5); ax.set_ylim(0,1.12); ax.grid(axis="x",visible=False)
    ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Recovery · thermal","Sauna frequency tracks lower mortality",
             "Dose-dependent — but from one Finnish men's cohort, with healthy-user bias unexcluded.")
    ds.footer(ax,"Laukkanen et al., JAMA Intern Med 2015 (n=2,315)","sauna-frequency-mortality-kihd",tier="cohort")
    ds.flag(ax,"single cohort · healthy-user bias","caution")
    ds.save(fig,f"{FIG}/23-sauna-mortality.png",bottom=0.2)

def alcohol_jcurve():
    x=[0,1,2,3,4,5]; obs=[1.00,0.88,0.89,0.97,1.12,1.35]; mr=[1.00,1.02,1.07,1.16,1.28,1.45]
    fig,ax=ds.new_fig(8.6,5.2)
    ax.plot(x,obs,"-",color="#b9ad8e",lw=3,zorder=3,label="observational ('J-curve')")
    ax.plot(x,mr,"-",color="#b5471f",lw=3,zorder=3,label="genetic / Mendelian randomization")
    ax.scatter(x,obs,s=46,color="#8a8170",zorder=4); ax.scatter(x,mr,s=46,color="#b5471f",zorder=4)
    ax.legend(loc="upper left",fontsize=9.5); ax.set_ylim(0.8,1.55)
    ax.set_xlabel("drinks per day",fontsize=10,color=ds.MUT); ax.set_ylabel("relative all-cause mortality",fontsize=10,color=ds.MUT)
    ds.title(ax,"Exposures","Alcohol's 'protective' dip is mostly confounding",
             "When genetics removes the abstainer-bias, risk rises ~monotonically. No safe level for cancer.")
    ds.footer(ax,"Biddinger 2022 (MR) · Zhao 2023 (bias-corrected meta)","conflict-alcohol-jcurve",tier="meta")
    ds.save(fig,f"{FIG}/24-alcohol-jcurve.png")

def responder_distribution():
    rng=np.random.default_rng(7); v=rng.normal(17,11,4000)
    fig,ax=ds.new_fig(8.6,5.2)
    ax.hist(v,bins=32,range=(-10,46),color=ds.GOLD,edgecolor=ds.PAPER,linewidth=0.6)  # no clipping -> no edge spikes
    ymax=ax.get_ylim()[1]; ax.set_ylim(0,ymax*1.05)
    ax.axvspan(-10,2,color="#fbf0ea",zorder=0); ax.axvspan(38,46,color="#e9f3ea",zorder=0)
    ax.axvline(2,color="#b5471f",lw=1.6,ls="--"); ax.axvline(38,color="#1d6b2e",lw=1.6,ls="--")
    # vertical labels INSIDE the bands (clear of the dashed lines and the bars)
    ax.text(-6,ymax*0.55,"non-responders",rotation=90,ha="center",va="center",fontsize=10.5,color="#b5471f",fontweight="bold")
    ax.text(42,ymax*0.55,"high responders",rotation=90,ha="center",va="center",fontsize=10.5,color="#1d6b2e",fontweight="bold")
    ax.set_xlabel("VO₂max change after the SAME 20-week program (%)",fontsize=10,color=ds.MUT); ax.set_ylabel("number of people",fontsize=10,color=ds.MUT); ax.grid(axis="x",visible=False)
    ds.title(ax,"Personalization","Same program, wildly different results",
             "Trainability is ~47% heritable. If a stimulus isn't working, change the stimulus — not the goal.")
    ds.footer(ax,"Illustrative distribution — HERITAGE Family Study (Bouchard/Skinner)","heritage-trainability-variance",tier="cohort")
    ds.save(fig,f"{FIG}/25-responder-distribution.png")

def verdict_donut():
    labels=["Agree","Overstated","Contradicts","Net-new"]; vals=[37,37,8,18]
    cols=["#1d6b2e","#c08a1e","#b5471f","#3a6ea5"]
    fig,ax=ds.new_fig(8.6,5.4)
    wedges,_=ax.pie(vals,colors=cols,startangle=90,counterclock=False,wedgeprops=dict(width=0.42,edgecolor=ds.PAPER,linewidth=2))
    ax.text(0,0.12,"~139",ha="center",va="center",fontsize=30,color=ds.INK2,fontfamily=ds.DISPLAY,fontweight="black")
    ax.text(0,-0.16,"claims checked",ha="center",va="center",fontsize=11,color=ds.MUT)
    ax.set_aspect("equal")
    # legend
    for i,(l,v,c) in enumerate(zip(labels,vals,cols)):
        ax.text(1.35,0.5-i*0.26,f"{v}%",fontsize=14,color=c,fontweight="bold",fontfamily=ds.DISPLAY,transform=ax.transData)
        ax.text(1.62,0.5-i*0.26,l,fontsize=12,color=ds.INK,va="center",transform=ax.transData)
    ax.set_xlim(-1.3,2.4); ax.set_ylim(-1.3,1.3)
    ds.title(ax,"The Discourse","How popular health claims hold up",
             "Calibration, not direction: the modal failure is rounding a real finding up one tier.")
    ds.footer(ax,"6 practitioner clusters · ~98 transcripts cross-checked vs the corpus","practitioner-calibration")
    ds.save(fig,f"{FIG}/26-verdict-donut.png",left=0.04,bottom=0.1)

def lifespan_ledger():
    data=[("Clean water & sanitation",30),("Vaccines",18),("Antibiotics & hygiene",14),
          ("Nutrition & food security",13),("Safer childbirth / infant care",10),
          ("Refrigeration & food safety",6),("Modern high-tech medicine",9)]
    labels=[d[0] for d in data]; vals=[d[1] for d in data]
    fig,ax=ds.new_fig(8.8,5.4); yp=list(range(len(labels)))[::-1]
    cols=[ds.GOLD_D if l!="Modern high-tech medicine" else "#b5471f" for l in labels]
    ax.barh(yp,vals,color=cols,height=0.7,edgecolor=ds.PAPER,linewidth=1.1)
    ax.set_yticks(yp); ax.set_yticklabels(labels,fontsize=10.5)
    for y,v in zip(yp,vals): ax.text(v+0.4,y,f"{v}%",va="center",fontsize=10,color=ds.INK,fontweight="bold")
    ax.set_xlim(0,34); ax.grid(axis="y",visible=False); ax.set_xlabel("approximate share of the historical lifespan gain",fontsize=10,color=ds.MUT)
    ds.title(ax,"Public Health","What actually doubled human lifespan",
             "Mostly public-health infrastructure — NOT high-tech clinical medicine (~10–20% of the gain).")
    ds.footer(ax,"Illustrative — after Cutler & Miller; Bunker; McKeown","public-health-lifespan-drivers",tier="cohort")
    ds.save(fig,f"{FIG}/27-lifespan-ledger.png",left=0.255)

# ================= MATRICES (SVG) =================
def supplement_matrix():
    W,H=1000,720
    head,y0,foot=ds.panel(W,H,"Nutrition · the honest shelf",
        "Supplements — what actually has evidence","Most of the bottle aisle is mechanism or hope. A short list earns its place.",
        "§Nutrition & Supplements","supplement-evidence-grades")
    s=[head]
    rows=[("Creatine monohydrate","3–5 g/day","strength, muscle, some cognition","REAL","#1d6b2e"),
          ("Omega-3 (EPA/DHA)","~1–2 g/day","triglycerides; index is a marker","REAL / context","#5e8a3a"),
          ("Vitamin D","only if deficient","corrects deficiency — not a lever in the replete","CONTEXT ONLY","#c08a1e"),
          ("Protein / whey","to hit ~1.6 g/kg","muscle, satiety (food first)","REAL","#1d6b2e"),
          ("Dietary fiber","25–38 g/day (food)","metabolic, gut, mortality","REAL","#1d6b2e"),
          ("Caffeine","pre-task","real ergogenic & alertness","REAL","#1d6b2e"),
          ("Magnesium","if low intake","sleep/cramp claims are weak","CONTEXT ONLY","#c08a1e"),
          ("Multivitamin","—","largely null in the well-nourished","HYPE","#b5471f"),
          ("NAD+ / NMN / NR","—","raises NAD+; no outcome benefit shown","HYPE","#b5471f"),
          ("Resveratrol","—","in-vitro artifact; null in humans","HYPE","#b5471f"),
          ("Collagen","—","modest tendon/skin signal; over-sold","CONTEXT ONLY","#c08a1e"),
          ("Greens powders","—","no outcome evidence","HYPE","#b5471f")]
    cx=[40,330,520,800]
    s.append(ds.text(cx[0],y0+4,"SUPPLEMENT",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    s.append(ds.text(cx[1],y0+4,"DOSE",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    s.append(ds.text(cx[2],y0+4,"WHAT IT DOES",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    s.append(ds.text(cx[3],y0+4,"VERDICT",size=9.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold"))
    ry=y0+22; rh=(H-60-ry)/len(rows)
    for i,(name,dose,does,verd,c) in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(cx[0],yy+rh/2+4,name,size=12,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(cx[1],yy+rh/2+4,dose,size=10.5,fill=ds.MUT,font=ds.BODY))
        s.append(ds.text(cx[2],yy+rh/2+4,does,size=10.5,fill=ds.INK,font=ds.BODY))
        b,_=ds.badge(cx[3],yy+rh/2-9,verd,c,h=18,size=9); s.append(b)
    s.append(foot); ds.render("".join(s), f"{FIG}/28-supplement-matrix.png")

def modality_matrix():
    W,H=1000,700
    head,y0,foot=ds.panel(W,H,"Training · the menu",
        "Modality → capacity — what each tool trains","Pick by the capacity you need (and what you'll keep doing). ● strong  ◗ moderate  ○ minor",
        "§Exercise Modalities","modality-capacity-matrix")
    s=[head]
    caps=["Strength","Power","Aerobic\n(VO₂max)","Mobility","Balance"]
    mods=[("Barbell / powerlifting",[3,2,1,1,1]),("Kettlebell",[2,3,2,2,2]),("Calisthenics",[3,2,1,2,2]),
          ("Running",[1,1,3,1,1]),("Cycling",[1,2,3,1,1]),("Swimming",[1,1,3,2,1]),("Rowing",[2,2,3,1,1]),
          ("Jump rope",[1,2,2,1,2]),("HIIT / circuits",[2,2,3,1,1]),("Yoga",[1,1,1,3,3]),
          ("Pilates",[2,1,1,2,2]),("Tai chi",[1,1,1,2,3]),("Walking / rucking",[1,1,2,1,1])]
    gx=300; gw=(W-70-gx)/len(caps); ry=y0+44
    # header
    for j,cap in enumerate(caps):
        for k,ln in enumerate(cap.split("\n")):
            s.append(ds.text(gx+gw*j+gw/2, y0+10+k*13, ln, size=10, fill=ds.GOLD_D, font=ds.DISPLAY, weight="bold", anchor="middle"))
    rh=(H-58-ry)/len(mods)
    for i,(name,vals) in enumerate(mods):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy-rh/2}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        s.append(ds.text(40,yy+4,name,size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
        for j,v in enumerate(vals):
            cxp=gx+gw*j+gw/2
            if v==3: s.append(f'<circle cx="{cxp:.0f}" cy="{yy}" r="8" fill="{ds.GOLD_D}"/>')
            elif v==2: s.append(f'<path d="M {cxp:.0f} {yy-8} a 8 8 0 0 1 0 16 z" fill="{ds.GOLD}"/><circle cx="{cxp:.0f}" cy="{yy}" r="8" fill="none" stroke="{ds.GOLD}" stroke-width="1.6"/>')
            else: s.append(f'<circle cx="{cxp:.0f}" cy="{yy}" r="7.5" fill="none" stroke="#c9bfa6" stroke-width="1.6"/>')
    s.append(foot); ds.render("".join(s), f"{FIG}/29-modality-matrix.png")

# ================= WHEELS / INFOGRAPHICS =================
def hallmarks_aging_wheel():
    W,H=1020,760
    head,y0,foot=ds.panel(W,H,"Aging biology · the mechanisms",
        "The Hallmarks of Aging","The twelve interconnected processes that drive biological aging (López-Otín 2023).",
        "§Aging biology · López-Otín et al. 2013/2023","hallmarks-of-aging")
    s=[head]
    cx,cy,R=W/2, y0+(H-104-y0)/2+8, 168
    halls=["Genomic\ninstability","Telomere\nattrition","Epigenetic\nalterations","Loss of\nproteostasis",
           "Disabled\nautophagy","Deregulated\nnutrient-sensing","Mitochondrial\ndysfunction","Cellular\nsenescence",
           "Stem-cell\nexhaustion","Altered inter-\ncellular comms","Chronic\ninflammation","Dysbiosis"]
    pal=["#b5471f","#c2693a","#b08d3a","#8a6d12","#5e8a55","#2f8a4b","#1d6b2e","#3a6ea5","#5a6e9c","#7a5a9c","#9c5a7a","#a0741a"]
    n=len(halls)
    for i,lab in enumerate(halls):
        ang=-math.pi/2+i*2*math.pi/n; c=pal[i%len(pal)]
        ex,ey=cx+math.cos(ang)*R, cy+math.sin(ang)*R
        px,py=cx+math.cos(ang)*(R+92), cy+math.sin(ang)*(R+60)
        s.append(f'<line x1="{cx+math.cos(ang)*72:.0f}" y1="{cy+math.sin(ang)*72:.0f}" x2="{ex:.0f}" y2="{ey:.0f}" stroke="{c}" stroke-width="2"/>')
        s.append(f'<circle cx="{ex:.0f}" cy="{ey:.0f}" r="8" fill="{c}"/>')
        lines=lab.split("\n"); bw=132; bh=16+len(lines)*15
        s.append(f'<rect x="{px-bw/2:.0f}" y="{py-bh/2:.0f}" width="{bw}" height="{bh}" rx="7" fill="{ds.CARD}" stroke="{c}" stroke-width="1.5"/>')
        for j,ln in enumerate(lines): s.append(ds.text(px,py-bh/2+15+j*15,ln,size=10,fill=ds.INK,font=ds.BODY,weight="600",anchor="middle"))
    s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="66" fill="{ds.INK2}"/>')
    s.append(ds.text(cx,cy-6,"AGING",size=17,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
    s.append(ds.text(cx,cy+15,"12 hallmarks",size=10,fill="#cda23f",font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s), f"{FIG}/30-hallmarks-aging.png")

def four_horsemen():
    W,H=1000,620
    head,y0,foot=ds.panel(W,H,"Clinical prevention · what to actually prevent",
        "The Four Horsemen of chronic disease","Almost everyone dies of one of these — and prevention starts decades early.",
        "§Clinical Prevention (Medicine 3.0 frame)","four-horsemen")
    s=[head]
    cards=[("Atherosclerotic\ncardiovascular disease","heart attack · stroke","lever: lifelong low apoB · BP · don't smoke · fitness","#b5471f"),
           ("Cancer","the second-biggest killer","lever: don't smoke · screen (colon/breast/lung) · metabolic health","#b08d3a"),
           ("Neurodegeneration","dementia · Parkinson's","lever: the Lancet-14 factors · fitness · sleep · hearing","#3a6ea5"),
           ("Metabolic dysfunction","type 2 diabetes · MASLD","lever: muscle · move · protein-adequate whole-food diet","#1d6b2e")]
    gw=(W-70-40-30)/2; gh=(H-104-y0-20)/2; gx,gy=40,y0+14
    for i,(t,sub,lev,c) in enumerate(cards):
        r,col=divmod(i,2); x=gx+col*(gw+30); yy=gy+r*(gh+20)
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="{gw:.0f}" height="{gh:.0f}" rx="12" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x:.0f}" y="{yy:.0f}" width="8" height="{gh:.0f}" rx="4" fill="{c}"/>')
        for k,ln in enumerate(t.split("\n")): s.append(ds.text(x+28,yy+40+k*24,ln,size=17,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x+28,yy+ (40 if "\n" not in t else 64) +22,sub,size=12,fill=ds.MUT,font=ds.BODY,italic=True))
        s.append(ds.text(x+28,yy+gh-22,lev,size=11,fill="#1d6b2e",font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/31-four-horsemen.png")

CHARTS=[strength_jcurve,steps_plateau,sleep_ushape,sauna_mortality,alcohol_jcurve,responder_distribution,verdict_donut,lifespan_ledger]
SVGS=[supplement_matrix,modality_matrix,hallmarks_aging_wheel,four_horsemen]
if __name__=="__main__":
    for f in CHARTS+SVGS:
        f(); print(f.__name__,"ok")
