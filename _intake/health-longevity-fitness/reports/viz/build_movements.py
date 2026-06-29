#!/usr/bin/env python3
"""Movement library — stick-figure exercise diagrams in the proven style (matches the original 6).
Each pose is hand-placed and verified. SVG -> PNG via ds.render."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; GOLD=ds.GOLD; GOLD_D=ds.GOLD_D; PAPER=ds.PAPER; MUT=ds.MUT; RED="#b5471f"; GREEN="#1d6b2e"
W,H,G,HEADR=460,600,410,17
def L(a,b,w=11,c=INK): return f'<line x1="{a[0]:.0f}" y1="{a[1]:.0f}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def D(p,r=5,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r}" fill="{c}"/>'
def HEAD(p,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{HEADR}" fill="{PAPER}" stroke="{c}" stroke-width="7"/>'
def GND(x0=70,x1=W-40,y=G): return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="4"/>'
def bar(x0,x1,y,c=INK): return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{c}" stroke-width="8" stroke-linecap="round"/>'

def card(name,title,badge,bcol,subtitle,body,cues,cite):
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       f'<rect width="{W}" height="{H}" fill="{PAPER}"/><rect width="{W}" height="8" fill="{GOLD}"/>',
       ds.text(30,48,title,size=23,fill=ds.INK2,font=ds.DISPLAY,weight="800"),
       f'<rect x="30" y="62" width="{16+len(badge)*7.4:.0f}" height="20" rx="10" fill="{bcol}"/>',
       ds.text(38,77,badge,size=11.5,fill="#fff",font=ds.DISPLAY,weight="bold"),
       ds.text(48+len(badge)*7.4,77,subtitle,size=13,fill=MUT,font=ds.BODY,italic=True),
       body]
    cy=G+40
    for c in cues:
        s.append(f'<circle cx="44" cy="{cy-4}" r="3.5" fill="{GOLD}"/>'+ds.text(58,cy,c,size=14.5,fill=INK,font=ds.BODY)); cy+=25
    s.append(f'<line x1="30" y1="{H-40}" x2="{W-30}" y2="{H-40}" stroke="{ds.RULE}" stroke-width="1"/>')
    s.append(ds.text(30,H-22,cite,size=9.2,fill="#8a8170",font=ds.BODY))
    s.append("</svg>")
    ds.render("".join(s), f"{FIG}/{name}")

# 1. PUSH-UP (side, head right continuing the spine line, neck attached, arm to floor)
toe=(128,G); ankle=(108,G-16); hip=(232,G-62); sho=(348,G-104); hand=(362,G); hd=(389,G-119)
body=GND()+L(ankle,toe,9)+L(ankle,hip,12)+L(hip,sho,12)+L(sho,hand,10)+L(sho,(380,G-113),11)+HEAD(hd)+D(hip)+D(sho) \
     +f'<line x1="108" y1="{G-30}" x2="348" y2="{G-118}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>'
card("M01-push-up.png","Push-Up","TIER A · STRENGTH",GREEN,"horizontal push",body,
     ["Body one straight line — no sagging hips","Hands ~shoulder width; elbows ~45°","Lower until chest near the floor","Regress: incline / wall; progress: feet up"],
     "the upper-body push pattern · pairs with the row")

# 2. OVERHEAD PRESS (front, arms up to a bar)
cx=230; hd=(cx,G-330); neck=(cx,G-300); hip=(cx,G-178)
lank=(cx-26,G); rank=(cx+26,G); lkn=(cx-24,G-90); rkn=(cx+24,G-90)
lel=(cx-40,G-330); rel=(cx+40,G-330); lwr=(cx-44,G-392); rwr=(cx+44,G-392)
body=GND()+L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11) \
     +L(neck,lel,9)+L(lel,lwr,9)+L(neck,rel,9)+L(rel,rwr,9)+bar(cx-58,cx+58,G-398,GOLD_D)+HEAD(hd)+D(hip)
card("M02-overhead-press.png","Overhead Press","TIER A · STRENGTH",GREEN,"vertical push",body,
     ["Press straight overhead; ribs down, glutes tight","Bar finishes over the mid-foot","Don't lean back — brace the trunk","Builds shoulders + overhead strength"],
     "the vertical push pattern · full-body bracing")

# 3. PULL-UP (front, hanging from a bar, arms up)
cx=230; hd=(cx,G-300); neck=(cx,G-270); hip=(cx,G-150); lkn=(cx-14,G-78); rkn=(cx+14,G-78); lank=(cx-18,G-12); rank=(cx+18,G-12)
lel=(cx-38,G-330); rel=(cx+38,G-330); lwr=(cx-30,G-378); rwr=(cx+30,G-378)
body=bar(70,W-70,G-388,INK)+L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11) \
     +L(neck,lel,9)+L(lel,lwr,9)+L(neck,rel,9)+L(rel,rwr,9)+HEAD(hd)+D(hip)
card("M03-pull-up.png","Pull-Up","TIER A · STRENGTH",GREEN,"vertical pull",body,
     ["Hang from the bar; pull chest toward it","Drive elbows down; full range top & bottom","Regress: band-assisted / inverted row","The single best upper-back builder"],
     "the vertical pull pattern · grip + back")

# 4. GLUTE BRIDGE (side, head on floor at left, shoulder-hip-knee colinear, knees up)
hd=(120,G-14); sho=(152,G-14); hip=(248,G-44); knee=(338,G-72); foot=(360,G)
body=GND(70,W-70,G)+L(sho,hip,12)+L(hip,knee,12)+L(knee,foot,11)+L(foot,(382,G),9)+L(sho,(188,G-8),8)+HEAD(hd)+D(hip)+D(knee) \
     +f'<line x1="152" y1="{G-30}" x2="338" y2="{G-88}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>'
card("M04-glute-bridge.png","Glute Bridge","TIER A · STRENGTH",GREEN,"hip extension",body,
     ["Drive through heels; lift hips to a line","Squeeze glutes at the top; ribs down","Shoulders–hips–knees in one line (green)","Regress: easier; progress: single-leg / weighted"],
     "hip-extension / posterior chain · spares the back")

# 5. SIDE PLANK (side, body diagonal on one forearm)
floor=GND(70,W-70,G); elbow=(150,G); sho=(150,G-92); feet=(370,G); hip=(260,G-46); hd=(150,G-118)
body=floor+L(elbow,sho,9)+L((150,G),(178,G),9)+L(sho,hip,12)+L(hip,feet,12)+HEAD(hd)+D(hip)+D(sho) \
     +f'<line x1="{sho[0]}" y1="{sho[1]}" x2="{feet[0]}" y2="{feet[1]}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>'
card("M05-side-plank.png","Side Plank","TIER A · CORE",GREEN,"lateral trunk",body,
     ["Elbow under shoulder; body one straight line","Lift hips; stack them; don't let them drop","Hold both sides equally","Trains the obliques & spine stability (McGill)"],
     "anti-lateral-flexion core · protects the spine")

# 6. KETTLEBELL SWING (side, hinge with arms swung forward)
ankle=(250,G); knee=(262,G-72); hip=(196,G-150); sho=(262,G-214); hd=(280,G-236)
el=(300,G-188); wr=(348,G-176); kb=(372,G-170); toe=(280,G)
body=GND()+L(hip,knee,11)+L(knee,ankle,11)+L(ankle,toe,9)+L(hip,sho,12)+L(sho,el,9)+L(el,wr,9)+HEAD(hd)+D(hip)+D(knee) \
     +f'<line x1="{wr[0]}" y1="{wr[1]}" x2="{kb[0]}" y2="{kb[1]}" stroke="{GOLD_D}" stroke-width="6"/>'+D(kb,12,GOLD_D) \
     +f'<path d="M196 {G-150} q -50 4 -56 -46" stroke="{RED}" stroke-width="3" fill="none" marker-end="url(#mkb)"/>' \
     +'<defs><marker id="mkb" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#b5471f"/></marker></defs>'
card("M06-kettlebell-swing.png","Kettlebell Swing","TIER B · POWER",GOLD,"ballistic hinge",body,
     ["It's a HINGE, not a squat — hips snap back & through","Power from the glutes; arms just guide","Flat back; the bell floats to ~chest height","Builds explosive hip power + conditioning"],
     "ballistic hip hinge · power + conditioning")

print("rendered 6 movement figures")
