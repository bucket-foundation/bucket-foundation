#!/usr/bin/env python3
"""Gap-filler figures identified in reports/viz/figure_gap_list.md (the concepts a smart lay
reader most needs a picture for, verified as not already covered by an @@FIG marker). House
style via ds.py; every claim graded, nothing fabricated.

  BP06  mitohormesis dose-response (37 §37.5.2)
  BP07  metabolic-fuel crossover: glucose / fat / ketones (01 §2.5)
  BP08  fringe-biophysics verdict panel (32 §7)  -- uses the book's own grades
  BP09  training modality -> capacity matrix (44)

Reproduce:  python build_gapfillers.py [--only KEY] [--list]
"""
import os, sys, math, argparse, textwrap as _tw
sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "media", "figures"))
INK=ds.INK; INK2=ds.INK2; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D
MUT=ds.MUT; FAINT=ds.FAINT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; PUR="#6b4a86"; TEAL="#2f7d78"; RED="#b5471f"

def T(x,y,s,size=13,fill=INK,font=None,weight=None,anchor="start",italic=False,spacing=None):
    return ds.text(x,y,s,size=size,fill=fill,font=font or ds.BODY,weight=weight,anchor=anchor,italic=italic,spacing=spacing)
def wrap(t,w): return _tw.wrap(str(t),width=w) or [str(t)]

VERDICT={"strong":GRN,"promising":AMB,"no-evidence":WARN,"mixed":AMB,"established":GRN,"failed":RED}

# ---------------------------------------------------------------- BP06 MITOHORMESIS
def fig_mitohormesis():
    W,H=1120,660
    head,cy,foot=ds.panel(W,H,"Mitochondrial Health \u00b7 \u00a737.5.2","Mitohormesis: why a little stress helps",
        "A transient, sub-damaging burst of reactive oxygen species (ROS) triggers an adaptive response that leaves the cell better defended. Too little does nothing; too much is damage. The dose makes the medicine.",
        "Ristow mitohormesis; biphasic hormesis curve (01-foundations \u00a76.1). Mechanism established; optimal human dose not quantified.",
        "mitohormesis-dose-response")
    s=[head]
    ax0,ax1=170,W-120; ay0,ay1=cy+50,cy+380
    def X(t): return ax0+(ax1-ax0)*t
    def Y(v): return ay1-(ay1-ay0)*v
    # axes
    s.append(f'<line x1="{ax0}" y1="{ay1}" x2="{ax1}" y2="{ay1}" stroke="{INK}" stroke-width="1.6"/>')
    s.append(f'<line x1="{ax0}" y1="{ay0}" x2="{ax0}" y2="{ay1}" stroke="{INK}" stroke-width="1.6"/>')
    s.append(T((ax0+ax1)/2,ay1+40,"ROS / stress dose  \u2192",size=11,fill=GOLDD,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(f'<text x="{ax0-40}" y="{(ay0+ay1)/2}" font-family="{ds.DISPLAY}" font-size="11" font-weight="700" fill="{GOLDD}" text-anchor="middle" transform="rotate(-90 {ax0-40} {(ay0+ay1)/2})">Health / function  \u2192</text>')
    # baseline
    s.append(f'<line x1="{ax0}" y1="{Y(0.5)}" x2="{ax1}" y2="{Y(0.5)}" stroke="{FAINT}" stroke-width="1" stroke-dasharray="4 4"/>')
    s.append(T(ax1,Y(0.5)-6,"baseline",size=9,fill=MUT,anchor="end"))
    # hormetic curve: rises to a peak then falls below baseline
    import math as _m
    pts=[]
    for i in range(101):
        t=i/100.0
        # inverted-U skewed: benefit peaks ~0.38 then declines into harm
        v=0.5+0.42*_m.sin(_m.pi*min(t*1.15,1.0))-0.55*max(0,t-0.62)**1.6*3
        v=max(0.03,min(0.98,v))
        pts.append(f"{X(t):.1f},{Y(v):.1f}")
    s.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{GRN2}" stroke-width="3.4"/>')
    # zone bands
    zones=[(0.0,0.16,"Too little","no stimulus",FAINT),
           (0.16,0.55,"Hormetic zone","adaptation \u2192 net gain",GRN),
           (0.55,1.0,"Overload","oxidative damage",WARN)]
    for a,b,h,d,col in zones:
        s.append(f'<rect x="{X(a)}" y="{ay0}" width="{X(b)-X(a)}" height="{ay1-ay0}" fill="{col}" fill-opacity="0.08"/>')
        s.append(T((X(a)+X(b))/2,ay0+18,h,size=11,fill=col,font=ds.DISPLAY,weight="700",anchor="middle"))
        s.append(T((X(a)+X(b))/2,ay1-14,d,size=9,fill=MUT,anchor="middle"))
    # examples under axis
    s.append(T(ax0,ay1+62,"Examples of the hormetic dose: Zone-2 and interval exercise, fasting windows, heat/cold exposure, plant polyphenols.",size=10,fill=INK,font=ds.BODY))
    s.append(T(ax0,ay1+80,"Why high-dose antioxidant supplements can blunt training adaptations \u2014 they erase the very ROS signal that drives them.",size=10,fill=MUT,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP06-mitohormesis.png"); return "BP06-mitohormesis"


# ---------------------------------------------------------------- BP07 FUEL CROSSOVER
def fig_fuel_crossover():
    W,H=1120,640
    head,cy,foot=ds.panel(W,H,"Foundations \u00b7 \u00a72.5","The fuel crossover: fat, glucose, ketones",
        "Which fuel your cells burn shifts with intensity. At rest and easy effort you run mostly on fat; as intensity climbs, glucose takes over. Switching cleanly between them is metabolic flexibility.",
        "Substrate metabolism (01-foundations \u00a72.5). Schematic of the crossover concept (Brooks) \u2014 exact percentages vary by fitness and diet.",
        "metabolic-fuel-crossover")
    s=[head]
    ax0,ax1=150,W-150; ay0,ay1=cy+50,cy+360
    def X(t): return ax0+(ax1-ax0)*t
    def Y(v): return ay1-(ay1-ay0)*v
    s.append(f'<line x1="{ax0}" y1="{ay1}" x2="{ax1}" y2="{ay1}" stroke="{INK}" stroke-width="1.6"/>')
    s.append(f'<line x1="{ax0}" y1="{ay0}" x2="{ax0}" y2="{ay1}" stroke="{INK}" stroke-width="1.6"/>')
    s.append(T((ax0+ax1)/2,ay1+40,"Exercise intensity (% VO\u2082max)  \u2192",size=11,fill=GOLDD,font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(f'<text x="{ax0-42}" y="{(ay0+ay1)/2}" font-family="{ds.DISPLAY}" font-size="11" font-weight="700" fill="{GOLDD}" text-anchor="middle" transform="rotate(-90 {ax0-42} {(ay0+ay1)/2})">Share of energy  \u2192</text>')
    for pct,lab in [(0,"rest"),(0.25,"25"),(0.5,"50"),(0.75,"75"),(1.0,"max")]:
        s.append(T(X(pct),ay1+16,lab,size=9,fill=MUT,anchor="middle"))
    import math as _m
    # fat share: high at rest, falls; glucose: mirror. crossover ~55-60%
    fat=[]; glu=[]
    for i in range(101):
        t=i/100.0
        f=1/(1+_m.exp((t-0.55)*9))   # sigmoid falling
        fat.append(f); glu.append(1-f)
    fatpts=" ".join(f"{X(i/100):.1f},{Y(v):.1f}" for i,v in enumerate(fat))
    glupts=" ".join(f"{X(i/100):.1f},{Y(v):.1f}" for i,v in enumerate(glu))
    s.append(f'<polyline points="{fatpts}" fill="none" stroke="{AMB}" stroke-width="3.4"/>')
    s.append(f'<polyline points="{glupts}" fill="none" stroke="{BLUE}" stroke-width="3.4"/>')
    # crossover marker
    s.append(f'<line x1="{X(0.55)}" y1="{ay0}" x2="{X(0.55)}" y2="{ay1}" stroke="{GRN}" stroke-width="1.4" stroke-dasharray="5 4"/>')
    s.append(T(X(0.55),ay0-6,"crossover",size=9.5,fill=GRN,font=ds.DISPLAY,weight="700",anchor="middle"))
    # curve labels
    s.append(T(X(0.10),Y(0.90),"Fat oxidation",size=12,fill=AMB,font=ds.DISPLAY,weight="700"))
    s.append(T(X(0.68),Y(0.90),"Glucose (glycolysis)",size=12,fill=BLUE,font=ds.DISPLAY,weight="700"))
    # zone-2 band
    s.append(f'<rect x="{X(0.25)}" y="{ay0}" width="{X(0.45)-X(0.25)}" height="{ay1-ay0}" fill="{AMB}" fill-opacity="0.08"/>')
    s.append(T((X(0.25)+X(0.45))/2,ay1-12,"Zone-2 domain",size=9.5,fill=AMB,font=ds.DISPLAY,weight="700",anchor="middle"))
    # ketone note
    s.append(T(ax0,ay1+62,"Ketones (\u03b2-hydroxybutyrate): a fat-derived backup fuel made in the liver during fasting or low-carb \u2014 and also a",size=10,fill=INK,font=ds.BODY))
    s.append(T(ax0,ay1+80,"signalling molecule (inhibits the NLRP3 inflammasome, acts as an HDAC inhibitor). Metabolism talking to genes.",size=10,fill=MUT,font=ds.BODY,italic=True))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP07-metabolic-fuel-crossover.png"); return "BP07-metabolic-fuel-crossover"

# ---------------------------------------------------------------- BP08 FRINGE VERDICT PANEL
def fig_fringe_panel():
    W,H=1120,720
    head,cy,foot=ds.panel(W,H,"Biohacking & Fringe \u00b7 \u00a732 \u00a77","Fringe biophysics: the graded verdict",
        "Four claims that invoke physics to sell a health effect, each with the book's own grade. \u201cNO-EVIDENCE\u201d means a real mechanism would be a finding \u2014 the data are not there; \u201cPROMISING\u201d means a real but thin surrogate-level signal.",
        "Grades from 32-biohacking-fringe \u00a77 (Chevalier 2012 grounding review; H\u2082-water surrogate RCTs; Pollack EZ-water lab work).",
        "fringe-biophysics-verdict")
    s=[head]
    rows=[
        ("Grounding / earthing","\u201cEarth\u2019s free electrons neutralise inflammation\u201d","no-evidence",
         "Small, unblinded, surrogate, advocate-run studies; no health-outcome trial; mechanism not established biophysics."),
        ("Molecular hydrogen (H\u2082) water","H\u2082 dissolved in water shifts oxidative-stress markers","promising",
         "A real but thin literature: mostly surrogate RCTs with modest effects. A real, over-hyped signal at the surrogate tier."),
        ("Structured / \u201cEZ\u201d water product","\u201cdrink structured water for cellular energy\u201d","no-evidence",
         "The exclusion-zone phenomenon is a real lab observation; the leap to a consumer health product is unsupported."),
        ("EMF-protection devices","\u201cnon-native EMF harms; shields protect you\u201d","no-evidence",
         "No validated device effect at real-world exposures; the broad low-intensity harm claim is not supported."),
    ]
    y0=cy+26; rh=112
    for i,(name,claim,verdict,why) in enumerate(rows):
        yy=y0+i*rh
        col=VERDICT[verdict]
        s.append(f'<rect x="60" y="{yy}" width="{W-120}" height="{rh-16}" rx="11" fill="{CARD}" stroke="{RULE}" stroke-width="1.2"/>')
        # verdict chip
        s.append(f'<rect x="80" y="{yy+20}" width="150" height="30" rx="8" fill="{col}" fill-opacity="0.15" stroke="{col}" stroke-width="1.8"/>')
        s.append(T(155,yy+40,verdict.upper(),size=11,fill=col,font=ds.MONO,weight="bold",anchor="middle"))
        s.append(T(80,yy+72,name,size=13,fill=INK2,font=ds.DISPLAY,weight="800"))
        s.append(T(80,yy+90,claim,size=10,fill=MUT,font=ds.BODY,italic=True))
        for k,ln in enumerate(wrap(why,74)):
            s.append(T(270,yy+34+k*17,ln,size=10.5,fill=INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/BP08-fringe-biophysics-verdict.png"); return "BP08-fringe-biophysics-verdict"

# ---------------------------------------------------------------- BP09 MODALITY x CAPACITY
def fig_modality_matrix():
    W,H=1120,720
    head,cy,foot=ds.panel(W,H,"Exercise Modalities \u00b7 \u00a744","What each training style actually trains",
        "Rows are training styles; columns are the physical capacities that matter for health and longevity. A filled cell means that style develops that capacity well. The point: no single style covers everything.",
        "Capacities & modality mapping from 44-exercise-modalities and the training grammar of \u00a702. Qualitative synthesis — no head-to-head trial exists.",
        "modality-capacity-matrix")
    s=[head]
    caps=["Strength /\nhypertrophy","Aerobic\n(Zone 2)","VO\u2082max /\nanaerobic","Power /\nexplosive","Mobility /\nbalance"]
    mods=[("Resistance training",[3,0,1,2,1]),
          ("Zone-2 cardio",[0,3,1,0,0]),
          ("HIIT / intervals",[1,1,3,2,0]),
          ("Sprint / plyometrics",[1,0,2,3,1]),
          ("Yoga / mobility work",[0,0,0,0,3]),
          ("Team / field sport",[1,2,2,2,2])]
    # grid geometry
    gx0=300; gy0=cy+66; cw=140; rh=62
    # column headers
    for j,c in enumerate(caps):
        cxj=gx0+j*cw+cw/2
        for k,ln in enumerate(c.split("\n")):
            s.append(T(cxj,gy0-24+k*13,ln,size=9.6,fill=GOLDD,font=ds.DISPLAY,weight="700",anchor="middle"))
    fillmap={3:(GRN,"strong"),2:(GRN2,"good"),1:(AMB,"some"),0:(FAINT,"\u2013")}
    for i,(name,vals) in enumerate(mods):
        yy=gy0+i*rh
        s.append(T(280,yy+rh/2+4,name,size=11.5,fill=INK,font=ds.DISPLAY,weight="700",anchor="end"))
        for j,v in enumerate(vals):
            col,lab=fillmap[v]
            x=gx0+j*cw
            op={3:0.9,2:0.55,1:0.28,0:0.10}[v]
            s.append(f'<rect x="{x+8}" y="{yy+8}" width="{cw-16}" height="{rh-16}" rx="8" fill="{col}" fill-opacity="{op}" stroke="{col if v>0 else RULE}" stroke-width="1.4"/>')
            if v>0:
                s.append(T(x+cw/2,yy+rh/2+4,lab,size=9.4,fill="white" if v>=2 else INK,font=ds.DISPLAY,weight="700",anchor="middle"))
    # legend
    ly=gy0+len(mods)*rh+30
    s.append(T(280,ly,"Fill = how well that style develops that capacity:",size=10,fill=MUT,font=ds.BODY,anchor="end"))
    lx=300
    for v in (3,2,1,0):
        col,lab=fillmap[v]; op={3:0.9,2:0.55,1:0.28,0:0.10}[v]
        s.append(f'<rect x="{lx}" y="{ly-12}" width="18" height="18" rx="5" fill="{col}" fill-opacity="{op}" stroke="{col if v>0 else RULE}" stroke-width="1.2"/>')
        s.append(T(lx+24,ly+2,lab,size=9.6,fill=INK,font=ds.BODY)); lx+=130
    s.append(foot); ds.render("".join(s),f"{FIG}/BP09-modality-capacity-matrix.png"); return "BP09-modality-capacity-matrix"

# ---------------------------------------------------------------- registry + CLI
FIGURES={"mitohormesis":fig_mitohormesis,"fuel":fig_fuel_crossover,"fringe":fig_fringe_panel,"modality":fig_modality_matrix}
def main(argv=None):
    ap=argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--list",action="store_true")
    a=ap.parse_args(argv); items=list(FIGURES.items())
    if a.list:
        for k,_ in items: print(k)
        return
    if a.only: items=[(k,v) for k,v in items if a.only.lower() in k.lower()]
    for k,fn in items: out=fn(); print(f"[built] {k} -> {out}.png")
    print(f"[done] {len(items)} figure(s)")
if __name__=="__main__": main()
