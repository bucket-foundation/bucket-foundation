#!/usr/bin/env python3
"""Movement library wave 6 (final) — Bulgarian split squat, Pallof press, rowing erg,
hollow hold, dead bug, cable row."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; GOLD=ds.GOLD; GOLD_D=ds.GOLD_D; PAPER=ds.PAPER; MUT=ds.MUT; RED="#b5471f"; GREEN="#1d6b2e"; GOLDD=ds.GOLD_D
W,H,G,HEADR=460,600,410,17
def L(a,b,w=11,c=INK): return f'<line x1="{a[0]:.0f}" y1="{a[1]:.0f}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def D(p,r=5,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r}" fill="{c}"/>'
def HEAD(p,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{HEADR}" fill="{PAPER}" stroke="{c}" stroke-width="7"/>'
def GND(x0=70,x1=W-40,y=G): return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="4"/>'
def wt(p,rw=22,rh=15,c=INK): return f'<rect x="{p[0]-rw/2:.0f}" y="{p[1]-rh/2:.0f}" width="{rw}" height="{rh}" rx="3" fill="{c}"/>'
ARROW='<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#b5471f"/></marker></defs>'
def card(name,title,badge,bcol,subtitle,body,cues,cite):
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       f'<rect width="{W}" height="{H}" fill="{PAPER}"/><rect width="{W}" height="8" fill="{GOLD}"/>',ARROW,
       ds.text(30,48,title,size=23,fill=ds.INK2,font=ds.DISPLAY,weight="800"),
       f'<rect x="30" y="62" width="{16+len(badge)*7.4:.0f}" height="20" rx="10" fill="{bcol}"/>',
       ds.text(38,77,badge,size=11.5,fill="#fff",font=ds.DISPLAY,weight="bold"),
       ds.text(48+len(badge)*7.4,77,subtitle,size=13,fill=MUT,font=ds.BODY,italic=True),body]
    cy=G+40
    for c in cues:
        s.append(f'<circle cx="44" cy="{cy-4}" r="3.5" fill="{GOLD}"/>'+ds.text(58,cy,c,size=14.5,fill=INK,font=ds.BODY)); cy+=25
    s.append(f'<line x1="30" y1="{H-40}" x2="{W-30}" y2="{H-40}" stroke="{ds.RULE}" stroke-width="1"/>')
    s.append(ds.text(30,H-22,cite,size=9.2,fill="#8a8170",font=ds.BODY)); s.append("</svg>")
    ds.render("".join(s), f"{FIG}/{name}")

# 1. Bulgarian split squat (side, rear foot on bench)
bench=f'<rect x="96" y="{G-86}" width="86" height="14" rx="3" fill="{INK}"/><line x1="110" y1="{G-72}" x2="110" y2="{G}" stroke="{INK}" stroke-width="5"/><line x1="168" y1="{G-72}" x2="168" y2="{G}" stroke="{INK}" stroke-width="5"/>'
rfoot=(150,G-86); rknee=(202,G-44); hip=(256,G-150); fknee=(308,G-92); ffoot=(322,G); neck=(252,G-256); hd=(250,G-284)
body=GND()+bench+L(rfoot,rknee,11)+L(rknee,hip,11)+L(hip,fknee,12)+L(fknee,ffoot,11)+L(hip,neck,12)+L(neck,(238,G-262),11)+HEAD(hd)+L(neck,(244,G-180),9)+D(hip)+D(fknee)
card("M28-bulgarian-split-squat.png","Bulgarian Split Squat","TIER A · STRENGTH",GREEN,"single-leg squat",body,
     ["Rear foot up on a bench; weight on the FRONT leg","Drop straight down; front knee tracks over the foot","Torso tall, slight forward lean from the hip","Brutal single-leg strength + balance — start light"],
     "unilateral squat · single-leg strength + balance")

# 2. Pallof press (front, anti-rotation against a side pull)
cx=260; hd=(cx,G-300); neck=(cx,G-272); hip=(cx,G-170); lank=(cx-22,G); rank=(cx+22,G); lkn=(cx-20,G-86); rkn=(cx+20,G-86)
hands=(cx-86,G-230); el=(cx-44,G-238)
body=GND()+L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11)+L(neck,el,9)+L(el,hands,9)+L(neck,(cx-40,G-235),9)+HEAD(hd)+D(hip) \
     +f'<line x1="{cx-86}" y1="{G-230}" x2="70" y2="{G-230}" stroke="{GOLD_D}" stroke-width="4"/>'+f'<rect x="58" y="{G-256}" width="12" height="52" fill="{INK}"/>' \
     +f'<line x1="{cx-30}" y1="{G-170}" x2="{cx-66}" y2="{G-170}" stroke="{RED}" stroke-width="3" marker-end="url(#ar)"/>'
card("M29-pallof-press.png","Pallof Press","TIER A · CORE",GREEN,"anti-rotation",body,
     ["Band/cable anchored to the SIDE; press the handle out","Resist the pull that wants to rotate you (red)","Brace the whole trunk; hips & shoulders stay square","The cleanest anti-rotation core drill"],
     "anti-rotation core · brace under a twisting load")

# 3. Rowing erg (side, mid-drive)
seat=(250,G-54); hip=(250,G-66); knee=(326,G-84); foot=(360,G-30); sho=(222,G-158); hd=(210,G-186); hands=(286,G-150); el=(196,G-150)
body=GND()+f'<rect x="356" y="{G-44}" width="36" height="44" rx="4" fill="{INK}" opacity="0.18" stroke="{INK}" stroke-width="2"/>' \
     +f'<line x1="230" y1="{G-44}" x2="300" y2="{G-44}" stroke="{INK}" stroke-width="5"/>' \
     +L(hip,knee,11)+L(knee,foot,11)+L(hip,sho,12)+L(sho,(218,G-178),11)+HEAD(hd)+L(sho,el,9)+L(el,hands,9)+D(hip)+D(knee) \
     +f'<line x1="{hands[0]}" y1="{hands[1]}" x2="362" y2="{G-30}" stroke="{GOLD_D}" stroke-width="3" stroke-dasharray="4 4"/>'
card("M30-rowing-erg.png","Rowing Machine","TIER A · CONDITIONING",GREEN,"full-body cardio",body,
     ["Drive order: LEGS → hips/back → arms (pull to chest)","Return order reverses: arms → hips → legs","~60% of the power is the legs, not the arms","Low-impact, full-body conditioning + posterior chain"],
     "full-body ergometer · legs-led power sequence")

# 4. Hollow hold (supine banana)
hands=(108,G-66); sho=(190,G-40); hip=(286,G-30); knee=(372,G-60); feet=(424,G-92)
body=GND()+L(hands,sho,9)+L(sho,hip,12)+L(hip,knee,12)+L(knee,feet,11)+HEAD((150,G-54))+D(hip)+D(sho) \
     +f'<path d="M150 {G-12} q 140 28 280 -60" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7" fill="none"/>'
card("M31-hollow-hold.png","Hollow Hold","TIER A · CORE",GREEN,"anterior core",body,
     ["Lie down; press the LOW BACK flat into the floor","Lift the shoulders and legs into a shallow 'banana'","Arms reach overhead; longer levers = harder","The gymnastics core position — total anterior tension"],
     "anterior core · trains a braced, neutral trunk")

# 5. Dead bug (supine; head at left end, opposite arm overhead + leg extended, held limbs up)
sho=(232,G-22); hip=(330,G-22); hd=(150,G-24)
ehand=(98,G-30); efoot=(446,G-38)         # extended opposite arm (overhead, low) + leg (out, low)
varm=(248,G-112); kthigh=(352,G-106); kshin=(330,G-52)  # held tabletop arm up + bent knee
body=GND()+L(sho,ehand,9)+L(hip,efoot,11)+L(sho,varm,9)+L(hip,kthigh,11)+L(kthigh,kshin,11) \
     +L(sho,hip,12)+L(sho,(178,G-23),11)+D(hip)+D(sho)+D(kthigh)+HEAD(hd)
card("M32-dead-bug.png","Dead Bug","TIER A · CORE",GREEN,"anti-extension",body,
     ["On your back; keep the low back GLUED to the floor","Extend OPPOSITE arm and leg, slow and controlled","The other arm/leg stay in a 90° 'tabletop'","If the back arches, you've gone too far — shorten range"],
     "anti-extension core · spine-sparing (McGill)")

# 6. Cable/band row (side, tall hinge, pull to torso)
ankle=(220,G); knee=(224,G-92); hip=(214,G-168); sho=(230,G-262); hd=(232,G-290); el=(296,G-220); hands=(300,G-210)
body=GND()+L(ankle,knee,11)+L(knee,hip,11)+L(hip,sho,12)+L(sho,(232,G-280),11)+HEAD(hd)+L(sho,el,9)+L(el,hands,9)+D(hip)+D(sho) \
     +f'<line x1="{hands[0]}" y1="{hands[1]}" x2="430" y2="{G-150}" stroke="{GOLD_D}" stroke-width="4"/>'+f'<rect x="426" y="{G-180}" width="12" height="58" fill="{INK}"/>' \
     +f'<line x1="320" y1="{G-200}" x2="284" y2="{G-208}" stroke="{RED}" stroke-width="3" marker-end="url(#ar)"/>'
card("M33-cable-row.png","Cable Row","TIER A · STRENGTH",GREEN,"horizontal pull",body,
     ["Tall spine, slight hip hinge; pull the handle to the torso","Lead with the elbows; squeeze the shoulder blades","Control the return — don't let it yank you forward","A joint-friendly horizontal pull for the whole back"],
     "horizontal pull · upper-back + posture (machine)")

print("rendered 6 movement figures (M28-M33)")
