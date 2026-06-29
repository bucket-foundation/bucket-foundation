#!/usr/bin/env python3
"""Signature SVG infographics on the design system: calibration spectrum, what-to-track, fasting timeline."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))

def _lerp(c1,c2,t):
    a=tuple(int(c1[i:i+2],16) for i in (1,3,5)); b=tuple(int(c2[i:i+2],16) for i in (1,3,5))
    return "#%02x%02x%02x"%tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def rankcolor(t):  # 0 aligned(green) -> .5 amber -> 1 overstated(red)
    return _lerp("#1d6b2e","#c08a1e",t*2) if t<0.5 else _lerp("#c08a1e","#b5471f",(t-0.5)*2)

# ---------------- 1. CALIBRATION SPECTRUM ----------------
def calibration_spectrum():
    rows=[("Andy Galpin","every strength/protein/creatine claim maps to a graded entry"),
          ("Matt Kaeberlein","the anti-Sinclair: skeptical on NAD, metformin, supplements"),
          ("Levine / Horvath","clock-builders say themselves the clocks may not be causal"),
          ("Peter Attia","core stack = the Tier-A levers; updates toward evidence"),
          ("Rhonda Patrick","solid; slips only on omega-3/vit-D predictor→lever"),
          ("Andrew Huberman","mechanism-right, effect-size-overstated (the modal failure)"),
          ("Starrett / McGill","boring core holds; the branded slogans over-reach"),
          ("Robert Lustig","sugar-as-uniquely-toxic outruns the energy-balance data"),
          ("Ben Bikman","insulin-causes-everything overstated"),
          ("Wim Hof","one bundled adrenaline RCT; dangerous near water"),
          ("Casey Means","CGM-for-healthy contradicts the outcome evidence"),
          ("Bryan Johnson","real kernels (rapamycin honesty) but N=1 doesn't generalize"),
          ("Gary Taubes","the carbohydrate-insulin model, strong form"),
          ("David Sinclair","the canonical 'mechanism sold as outcome' case")]
    n=len(rows); W,H=980,720
    head,y0,foot=ds.panel(W,H,"The Discourse — claims vs the evidence",
        "The Calibration Spectrum","Where each voice lands is about calibration, not direction.",
        "98 YouTube transcripts · ~139 claims cross-checked vs the 997-claim corpus","practitioner-calibration")
    s=[head]
    # axis legend
    s.append(ds.text(64,y0+6,"ALIGNED WITH THE EVIDENCE",size=10,fill="#1d6b2e",font=ds.DISPLAY,weight="bold",spacing="0.3"))
    s.append(ds.text(W-64,y0+6,"ROUNDS THE EVIDENCE UP",size=10,fill="#b5471f",font=ds.DISPLAY,weight="bold",anchor="end",spacing="0.3"))
    top=y0+22; rh=(H-70-top)/n
    for i,(name,note) in enumerate(rows):
        t=i/(n-1); c=rankcolor(t); y=top+i*rh+rh/2
        s.append(f'<circle cx="64" cy="{y:.0f}" r="9" fill="{c}"/>')
        s.append(ds.text(46,y+4,str(i+1),size=9,fill=c,font=ds.MONO,anchor="end"))
        s.append(ds.text(84,y+5,name,size=14.5,fill=ds.INK,font=ds.BODY,weight="600"))
        s.append(ds.text(300,y+5,note,size=11.5,fill=ds.MUT,font=ds.BODY))
        # position pip on a right-side gradient track
    # gradient track on the right
    tx,tw=W-150,86
    for k in range(tw):
        s.append(f'<rect x="{tx+k}" y="{top}" width="1.4" height="{H-70-top:.0f}" fill="{rankcolor(k/tw)}" opacity="0.85"/>')
    for i in range(n):
        t=i/(n-1); y=top+i*rh+rh/2
        s.append(f'<circle cx="{tx+t*tw:.0f}" cy="{y:.0f}" r="5.5" fill="white" stroke="{rankcolor(t)}" stroke-width="2.5"/>')
    s.append(foot)
    ds.render("".join(s), f"{FIG}/07-calibration-spectrum.png")

# ---------------- 2. WHAT-TO-TRACK PANEL ----------------
def what_to_track():
    W,H=1000,690
    head,y0,foot=ds.panel(W,H,"Personalization · the highest-signal panel",
        "What To Track","Functional first, then a few causal blood markers — the rest is noise.",
        "Synthesis across the graded corpus · 04-protocols/WHAT-TO-TRACK","what-to-track")
    s=[head]
    cols=[("MEASURE", 40, [
            ("A","VO₂max — or a hard field test","#1d6b2e"),
            ("A","Grip · gait speed · sit-to-rise · 10-s balance","#1d6b2e"),
            ("A","apoB (best lipid metric)","#1d6b2e"),
            ("A","Lp(a) — once in your life","#1d6b2e"),
            ("A","HbA1c + fasting insulin · home BP","#1d6b2e"),
            ("B","Overnight HRV · sleep duration (trends only)","#8a6d12"),
            ("C","Biological-age clocks · CGM if healthy","#b5471f")]),
          ("DO", 520, [
            ("A","Don't smoke / vape; keep alcohol low","#1d6b2e"),
            ("A","Build & keep VO₂max (Zone 2 + intervals)","#1d6b2e"),
            ("A","Resistance-train for strength 2–3×/wk","#1d6b2e"),
            ("A","Move all day; sleep ~7 h, regular","#1d6b2e"),
            ("A","Lower lifetime apoB · protein-adequate diet","#1d6b2e"),
            ("A","Protect social connection & purpose","#1d6b2e"),
            ("C","Skip: NAD/NMN, cleanses, cold-for-longevity","#b5471f")])]
    for head_l,cx,items in cols:
        s.append(ds.text(cx,y0+10,head_l,size=13,fill=ds.INK2,font=ds.DISPLAY,weight="800",spacing="0.4"))
        s.append(f'<line x1="{cx}" y1="{y0+18}" x2="{cx+420}" y2="{y0+18}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        ry=y0+44
        for tier,txt,c in items:
            b,_=ds.badge(cx,ry-13,tier,c,h=18,size=10)
            s.append(b); s.append(ds.text(cx+30,ry+1,txt,size=12.5,fill=ds.INK,font=ds.BODY))
            ry+=42
    # tier legend
    s.append(ds.text(40,H-52,"A  well-established (do/measure first)    B  useful trend    C  sold harder than proven",
                     size=10.5,fill=ds.MUT,font=ds.BODY))
    s.append(foot)
    ds.render("".join(s), f"{FIG}/08-what-to-track.png")

# ---------------- 3. FASTING PHYSIOLOGY TIMELINE ----------------
def fasting_timeline():
    W,H=1000,560
    head,y0,foot=ds.panel(W,H,"Fasting · what actually happens",
        "The Fasting Timeline","Hour by hour — with the honest flag on the autophagy claims.",
        "Synthesis · §Fasting, Cleanses & Metabolic Protocols","fasting-physiology-timeline")
    s=[head]
    ax_x0,ax_x1=70,W-60; ty=y0+150; trackh=46
    phases=[(0,4,"Fed / absorptive","#cdbf9a"),(4,12,"Post-absorptive\nglycogen falls","#bfa86f"),
            (12,18,"Glycogen depleted\nfat-burning ramps","#b08d3a"),(18,48,"Ketosis\n(BHB rises)","#8a6d12"),
            (48,72,"Deep ketosis\nprolonged fast","#6b5418")]
    hmax=72
    def hx(h): return ax_x0+(h/hmax)*(ax_x1-ax_x0)
    for a,b,lab,c in phases:
        s.append(f'<rect x="{hx(a):.0f}" y="{ty}" width="{hx(b)-hx(a):.0f}" height="{trackh}" fill="{c}"/>')
        s.append(ds.text((hx(a)+hx(b))/2, ty+trackh+16, lab.split(chr(10))[0], size=10.5, fill=ds.INK, font=ds.BODY, weight="600", anchor="middle"))
        if chr(10) in lab:
            s.append(ds.text((hx(a)+hx(b))/2, ty+trackh+30, lab.split(chr(10))[1], size=9.5, fill=ds.MUT, font=ds.BODY, anchor="middle"))
    # hour ticks
    for h in [0,12,24,36,48,60,72]:
        s.append(f'<line x1="{hx(h):.0f}" y1="{ty-6}" x2="{hx(h):.0f}" y2="{ty}" stroke="{ds.MUT}" stroke-width="1.2"/>')
        s.append(ds.text(hx(h),ty-12,f"{h}h",size=10,fill=ds.MUT,font=ds.MONO,anchor="middle"))
    # autophagy flag band over ~16-48h
    fa0,fa1=hx(16),hx(48)
    s.append(f'<rect x="{fa0:.0f}" y="{ty-46}" width="{fa1-fa0:.0f}" height="34" rx="6" fill="#fbf0ea" stroke="{ds.WARN}" stroke-width="1.2" stroke-dasharray="4 3"/>')
    s.append(ds.text((fa0+fa1)/2, ty-24, "⚠ 'autophagy peaks here' — timing is extrapolated from mice; unproven in humans",
                     size=10.5, fill=ds.WARN, font=ds.BODY, weight="600", anchor="middle"))
    # refeeding caution
    s.append(ds.text(hx(60), ty+trackh+52, "⚠ prolonged fasts: refeeding-syndrome risk — electrolytes / supervision",
                     size=10, fill=ds.WARN, font=ds.BODY, weight="600", anchor="middle"))
    s.append(ds.text(ax_x0, H-58, "Bottom line: most benefit is the calorie deficit, not a magic clock. Early eating window > late.",
                     size=11.5, fill=ds.INK, font=ds.BODY, italic=True))
    s.append(foot)
    ds.render("".join(s), f"{FIG}/15-fasting-timeline.png")

if __name__=="__main__":
    calibration_spectrum(); print("calibration ok")
    what_to_track();        print("what-to-track ok")
    fasting_timeline();     print("fasting ok")
