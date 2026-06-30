#!/usr/bin/env python3
"""Movement library wave 4 — loaded compounds: deadlift, goblet squat, bench press,
farmer carry, single-leg RDL. Hand-placed, verified."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; GOLD=ds.GOLD; GOLD_D=ds.GOLD_D; PAPER=ds.PAPER; MUT=ds.MUT; RED="#b5471f"; GREEN="#1d6b2e"
W,H,G,HEADR=460,600,410,17
def L(a,b,w=11,c=INK): return f'<line x1="{a[0]:.0f}" y1="{a[1]:.0f}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def D(p,r=5,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r}" fill="{c}"/>'
def HEAD(p,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{HEADR}" fill="{PAPER}" stroke="{c}" stroke-width="7"/>'
def GND(x0=70,x1=W-40,y=G): return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="4"/>'
def wt(p,rw=22,rh=15,c=INK): return f'<rect x="{p[0]-rw/2:.0f}" y="{p[1]-rh/2:.0f}" width="{rw}" height="{rh}" rx="3" fill="{c}"/>'
def plate(p,r=28): return f'<circle cx="{p[0]}" cy="{p[1]}" r="{r}" fill="{INK}"/><circle cx="{p[0]}" cy="{p[1]}" r="9" fill="{PAPER}"/>'
def kbell(p,r=15): return f'<circle cx="{p[0]}" cy="{p[1]+3}" r="{r}" fill="{INK}"/><path d="M{p[0]-9} {p[1]-2} a 9 9 0 0 1 18 0" fill="none" stroke="{INK}" stroke-width="4"/>'
ARROW='<defs><marker id="ar" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker></defs>'

def card(name,title,badge,bcol,subtitle,body,cues,cite):
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       f'<rect width="{W}" height="{H}" fill="{PAPER}"/><rect width="{W}" height="8" fill="{GOLD}"/>',ARROW,
       ds.text(30,48,title,size=21,fill=ds.INK2,font=ds.DISPLAY,weight="800"),
       f'<rect x="30" y="62" width="{16+len(badge)*7.4:.0f}" height="20" rx="10" fill="{bcol}"/>',
       ds.text(38,77,badge,size=11.5,fill="#fff",font=ds.DISPLAY,weight="bold"),
       ds.text(48+len(badge)*7.4,77,subtitle,size=12.5,fill=MUT,font=ds.BODY,italic=True),
       body]
    cy=G+40
    for c in cues:
        s.append(f'<circle cx="44" cy="{cy-4}" r="3.5" fill="{GOLD}"/>'+ds.text(58,cy,c,size=14.5,fill=INK,font=ds.BODY)); cy+=25
    s.append(f'<line x1="30" y1="{H-40}" x2="{W-30}" y2="{H-40}" stroke="{ds.RULE}" stroke-width="1"/>')
    s.append(ds.text(30,H-22,cite,size=9.2,fill="#8a8170",font=ds.BODY))
    s.append("</svg>")
    ds.render("".join(s), f"{FIG}/{name}")

# 17. DEADLIFT (side, mid-pull above the knee; arms vertical in front of the shin)
ankle=(228,G); toe=(262,G); knee=(222,G-92); hip=(176,G-150); sho=(246,G-210); hd=(276,G-220); hand=(250,G-98)
body=GND()+L(ankle,toe,9)+plate((250,G-96))+L(ankle,knee,11)+L(knee,hip,12)+L(hip,sho,12)+L(sho,(268,G-217),11)+HEAD(hd)+L(sho,hand,9)+D(hip)+D(knee)+D(sho) \
     +f'<line x1="176" y1="{G-164}" x2="268" y2="{G-228}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>' \
     +f'<line x1="245" y1="{G-60}" x2="245" y2="{G+2}" stroke="{MUT}" stroke-width="2" stroke-dasharray="2 5"/>'
card("M17-deadlift.png","Deadlift","TIER A · STRENGTH",GREEN,"the loaded hinge",body,
     ["Bar over mid-foot (dotted); bar grazes the shins","Flat back, braced (green); chest up, lats tight","Push the floor away; stand all the way tall","The king of hinges — total posterior-chain strength"],
     "loaded hip hinge · whole-body posterior chain")

# 18. GOBLET SQUAT (front, weight held at the chest, parallel depth)
cx=230; lank=(cx-34,G); rank=(cx+34,G); lkn=(cx-52,G-80); rkn=(cx+52,G-80); hip=(cx,G-100); neck=(cx,G-208); hd=(cx,G-238)
lel=(cx-30,G-168); rel=(cx+30,G-168); wcen=(cx,G-176)
body=GND()+L(lank,lkn,11)+L(lkn,hip,11)+L(rank,rkn,11)+L(rkn,hip,11)+L(hip,neck,12) \
     +L(neck,lel,9)+L(lel,wcen,9)+L(neck,rel,9)+L(rel,wcen,9)+HEAD(hd)+kbell(wcen)+D(hip)+D(lkn)+D(rkn) \
     +f'<line x1="{cx-50}" y1="{G+4}" x2="{cx-18}" y2="{G+4}" stroke="{GREEN}" stroke-width="3"/><line x1="{cx+18}" y1="{G+4}" x2="{cx+50}" y2="{G+4}" stroke="{GREEN}" stroke-width="3"/>'
card("M18-goblet-squat.png","Goblet Squat","TIER A · STRENGTH",GREEN,"front-loaded squat",body,
     ["Hold a weight at the chest; sit straight down","Knees track over the toes; heels stay flat (green)","Chest tall — the front load keeps you upright","The easiest way to learn a clean, deep squat"],
     "loaded squat · quads + upright trunk pattern")

# 19. BENCH PRESS (side, supine on bench, bar pressed up, feet planted)
bt=G-110
hd=(150,G-128); sho=(184,G-126); hip=(282,G-126); knee=(302,G-66); foot=(302,G); hand=(196,G-224)
bench=f'<rect x="128" y="{bt}" width="206" height="16" rx="3" fill="{INK}"/>' \
      +f'<line x1="148" y1="{bt+16}" x2="148" y2="{G}" stroke="{INK}" stroke-width="6"/>' \
      +f'<line x1="312" y1="{bt+16}" x2="312" y2="{G}" stroke="{INK}" stroke-width="6"/>'
bar=f'<line x1="150" y1="{G-232}" x2="242" y2="{G-232}" stroke="{INK}" stroke-width="7"/>'+plate((150,G-232),20)+plate((242,G-232),20)
body=GND()+bench+L(sho,hip,12)+L(hip,knee,11)+L(knee,foot,11)+L(sho,hand,9)+bar+HEAD(hd)+D(hip)+D(sho) \
     +f'<line x1="280" y1="{G-210}" x2="280" y2="{G-250}" stroke="{RED}" stroke-width="3" marker-end="url(#ar)"/>'
card("M19-bench-press.png","Bench Press","TIER A · STRENGTH",GREEN,"loaded horizontal push",body,
     ["Flat on the bench; feet planted, slight arch","Bar over mid-chest; lower to touch, press up (arrow)","Shoulder blades pinched & down — protect the joint","The loaded push — most-trained upper-body lift"],
     "loaded horizontal push · chest + shoulders + triceps")

# 20. FARMER CARRY (front, a weight in BOTH hands, tall plumb line)
cx=220; hd=(cx,G-300); neck=(cx,G-272); hip=(cx,G-162); lank=(cx-22,G); rank=(cx+22,G); lkn=(cx-20,G-82); rkn=(cx+20,G-82)
lwr=(cx-44,G-150); rwr=(cx+44,G-150)
body=GND()+f'<line x1="{cx}" y1="{G-314}" x2="{cx}" y2="{G}" stroke="{GREEN}" stroke-width="2.5" stroke-dasharray="2 7"/>' \
     +L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11) \
     +L(neck,lwr,9)+L(neck,rwr,9)+wt(lwr,26,30)+wt(rwr,26,30)+HEAD(hd)+D(hip)
card("M20-farmer-carry.png","Farmer Carry","TIER A · STRENGTH",GREEN,"bilateral loaded carry",body,
     ["Heavy weight in BOTH hands; stand tall (green plumb)","Brace the core; walk slow, controlled steps","Crushing grip + traps + total-body tension","The most carry-over of all carries — just walk heavy"],
     "loaded carry · grip + trunk + work capacity")

# 21. SINGLE-LEG RDL (side, balance hinge, back leg & torso to one T-line)
ankle=(225,G); knee=(227,G-84); hip=(214,G-158); sho=(312,G-150); hd=(344,G-148); backfoot=(110,G-150); hand=(316,G-58)
body=GND()+L(ankle,knee,11)+L(knee,hip,11)+L(hip,sho,12)+L(sho,(334,G-149),11)+HEAD(hd)+L(hip,backfoot,11)+L(sho,hand,9)+D(hand,9)+D(hip)+D(sho) \
     +f'<line x1="110" y1="{G-166}" x2="330" y2="{G-160}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>'
card("M21-single-leg-rdl.png","Single-Leg RDL","TIER B · STRENGTH",GOLD,"unilateral hinge + balance",body,
     ["Hinge over one leg; the back leg lifts to a T (green)","Hips stay square; reach the weight toward the floor","Slow & balanced — a soft knee on the stance leg","Builds hamstring/glute strength + balance + symmetry"],
     "unilateral hinge · balance + side-to-side symmetry")

print("rendered 5 movement figures (M17-M21)")
