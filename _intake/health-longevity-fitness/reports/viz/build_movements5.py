#!/usr/bin/env python3
"""Movement library wave 5 (final) — inverted row, face pull, cat-cow, thoracic rotation,
running form, box jump. Closes out the training cluster."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; GOLD=ds.GOLD; GOLD_D=ds.GOLD_D; PAPER=ds.PAPER; MUT=ds.MUT; RED="#b5471f"; GREEN="#1d6b2e"
W,H,G,HEADR=460,600,410,17
def L(a,b,w=11,c=INK): return f'<line x1="{a[0]:.0f}" y1="{a[1]:.0f}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def D(p,r=5,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r}" fill="{c}"/>'
def HEAD(p,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{HEADR}" fill="{PAPER}" stroke="{c}" stroke-width="7"/>'
def GND(x0=70,x1=W-40,y=G): return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="4"/>'
ARROW='<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#b5471f"/></marker><marker id="ag" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#1d6b2e"/></marker></defs>'
def rarrow(x0,y0,x1,y1,c=RED,mk="ar"): return f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{c}" stroke-width="3" marker-end="url(#{mk})"/>'

def card(name,title,badge,bcol,subtitle,body,cues,cite):
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       f'<rect width="{W}" height="{H}" fill="{PAPER}"/><rect width="{W}" height="8" fill="{GOLD}"/>',ARROW,
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

# 22. INVERTED ROW (side, straight body under a bar, arms hang to the bar)
bary=G-150
hand=(300,bary); sho=(300,G-88); hip=(210,G-62); heel=(98,G-12); toe=(126,G-12); hd=(276,G-100)
body=GND()+f'<line x1="250" y1="{bary}" x2="372" y2="{bary}" stroke="{INK}" stroke-width="7"/>' \
     +f'<line x1="366" y1="{bary}" x2="366" y2="{G}" stroke="{INK}" stroke-width="6"/>' \
     +L(sho,hand,9)+L(sho,hip,12)+L(hip,heel,12)+L(heel,toe,9)+L(sho,(282,G-96),11)+HEAD(hd)+D(hip)+D(sho) \
     +f'<line x1="98" y1="{G-26}" x2="300" y2="{G-100}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>' \
     +rarrow(176,G-60,200,G-104)
card("M22-inverted-row.png","Inverted Row","TIER A · STRENGTH",GREEN,"horizontal pull (bodyweight)",body,
     ["Hang under a bar; body one straight line (green)","Pull the chest to the bar; squeeze the blades","Easier than a pull-up — scale by foot height","The bodyweight horizontal pull — balances push-ups"],
     "bodyweight horizontal pull · upper back + posture")

# 23. FACE PULL / BAND PULL-APART (front, elbows high, hands pulled to the face)
cx=230; hd=(cx,G-300); neck=(cx,G-272); hip=(cx,G-168); lank=(cx-20,G); rank=(cx+20,G); lkn=(cx-18,G-86); rkn=(cx+18,G-86)
lel=(cx-66,G-268); rel=(cx+66,G-268); lhand=(cx-30,G-300); rhand=(cx+30,G-300)
body=GND()+L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11) \
     +L(neck,lel,9)+L(lel,lhand,9)+L(neck,rel,9)+L(rel,rhand,9)+HEAD(hd)+D(hip) \
     +f'<line x1="{cx-30}" y1="{G-300}" x2="{cx-150}" y2="{G-300}" stroke="{GOLD_D}" stroke-width="4"/>' \
     +f'<line x1="{cx+30}" y1="{G-300}" x2="{cx+150}" y2="{G-300}" stroke="{GOLD_D}" stroke-width="4"/>' \
     +rarrow(cx-96,G-300,cx-60,G-300)+rarrow(cx+96,G-300,cx+60,G-300)
card("M23-face-pull.png","Face Pull","TIER B · STRENGTH",GOLD,"rear-delt / posture",body,
     ["Pull a band/cable to the face; elbows stay HIGH","Finish with the hands wide, thumbs back","Squeeze the rear delts + mid-back","The best antidote to rounded, screen-hunched shoulders"],
     "rear delt + scapular health · undoes desk posture")

# 24. CAT-COW (side, quadruped, two spine positions overlaid)
fhand=(150,G); fsho=(150,G-118); bknee=(320,G); bhip=(320,G-118); hd=(126,G-118)
# cow (belly down, back arched) green dashed; cat (back rounded up) solid
body=GND()+L(fsho,fhand,10)+L(bhip,bknee,10)+HEAD(hd)+D(fsho)+D(bhip) \
     +f'<path d="M150 {G-118} Q 235 {G-92} 320 {G-118}" fill="none" stroke="{GREEN}" stroke-width="6" stroke-dasharray="3 8"/>' \
     +f'<path d="M150 {G-118} Q 235 {G-170} 320 {G-118}" fill="none" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>' \
     +ds.text(236,G-186,"CAT — round up",size=12.5,fill=INK,font=ds.BODY,anchor="middle") \
     +ds.text(236,G-72,"COW — arch down",size=12.5,fill=GREEN,font=ds.BODY,anchor="middle") \
     +rarrow(355,G-150,355,G-178,GREEN,"ag")+rarrow(355,G-104,355,G-78)
card("M24-cat-cow.png","Cat-Cow","TIER A · MOBILITY",GREEN,"spinal articulation",body,
     ["On hands & knees; round the spine UP (cat)","Then arch & drop the belly (cow); move with breath","Slow, segment-by-segment — no forcing the ends","Gentle, daily spinal mobility — great as a warm-up"],
     "segmental spine mobility · breath-paced warm-up")

# 25. THORACIC ROTATION (side, quadruped, one arm reaching to the sky — open book)
fhand=(166,G); fsho=(166,G-120); bknee=(322,G); bhip=(322,G-120); hd=(146,G-122)
rel=(236,G-200); rhand=(252,G-262)
body=GND()+L(fsho,fhand,10)+L(bhip,bknee,10)+L(fsho,bhip,12)+HEAD(hd)+D(fsho)+D(bhip) \
     +L(fsho,rel,9)+L(rel,rhand,9)+D(rhand,6) \
     +f'<path d="M210 {G-150} A 70 70 0 0 1 252 {G-258}" fill="none" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7" marker-end="url(#ag)"/>'
card("M25-thoracic-rotation.png","T-Spine Rotation","TIER A · MOBILITY",GREEN,"open-book reach",body,
     ["From all-fours, reach one hand to the ceiling","Rotate from the MID-BACK — follow the hand with the eyes","Keep the hips square; the low back stays still","Restores rotation lost to sitting — protects the low back"],
     "thoracic rotation · spares the lumbar spine")

# 26. RUNNING FORM (side, mid-stride: back leg toe-off, front leg high knee, forward lean)
hip=(228,G-176); neck=(244,G-258); hd=(256,G-284)
pknee=(196,G-92); pfoot=(166,G-6)               # push/stance leg behind, foot on ground
fknee=(292,G-140); ffoot=(270,G-92)             # front leg, high bent knee, foot lifted
fel=(214,G-216); fhand=(242,G-232)              # front (forward) arm, bent ~90
bel=(274,G-220); bhand=(296,G-194)              # back arm, bent ~90
body=GND()+L(hip,neck,12)+L(neck,(250,G-276),11)+HEAD(hd)+D(hip) \
     +L(hip,pknee,11)+L(pknee,pfoot,11)+D(pknee) \
     +L(hip,fknee,11)+L(fknee,ffoot,11)+D(fknee) \
     +L(neck,fel,9)+L(fel,fhand,9)+L(neck,bel,9)+L(bel,bhand,9)
card("M26-running-form.png","Running Form","TIER B · CONDITIONING",GOLD,"gait / locomotion",body,
     ["Tall posture; lean from the ANKLES, not the waist","Land under the hips; quick, light cadence (~180/min)","Opposite arm/leg drive; arms bent ~90, relaxed hands","Don't over-stride — let the foot land beneath you"],
     "locomotion · the most-available cardio of all")

# 27. BOX JUMP (side, loaded crouch about to jump onto a box)
box=f'<rect x="300" y="{G-110}" width="120" height="110" fill="{INK}" opacity="0.12" stroke="{INK}" stroke-width="3"/>'
ankle=(190,G); knee=(214,G-78); hip=(178,G-128); sho=(214,G-208); hd=(238,G-232)
el=(244,G-170); hand=(214,G-126)
body=GND()+box+L(ankle,knee,11)+L(knee,hip,11)+L(hip,sho,12)+L(sho,(230,G-226),11)+HEAD(hd) \
     +L(sho,el,9)+L(el,hand,9)+L(ankle,(220,G),9)+D(hip)+D(knee)+D(sho) \
     +rarrow(264,G-150,300,G-118,GREEN,"ag")
card("M27-box-jump.png","Box Jump","TIER B · POWER",GOLD,"plyometric / power",body,
     ["Load a quick crouch; swing the arms back","Explode UP onto the box (green arrow); land soft & quiet","STEP down — don't jump down (saves the joints)","Trains fast, explosive power — keep reps low & fresh"],
     "plyometric power · rate-of-force development")

print("rendered 6 movement figures (M22-M27)")
