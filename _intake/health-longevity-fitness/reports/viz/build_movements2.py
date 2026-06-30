#!/usr/bin/env python3
"""Movement library wave 2 — bent-over row, suitcase carry, calf raise, wall sit, bird-dog.
Hand-placed, verified. Shares the card() frame style with build_movements.py."""
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
ARROW='<defs><marker id="ar" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker></defs>'
def uparrow(x,y0,y1): return f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1}" stroke="{RED}" stroke-width="3" marker-end="url(#ar)"/>'

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

# 7. BENT-OVER ROW (side, hinged torso, weight hangs, pull-up arrow)
ankle=(215,G); toe=(248,G); knee=(218,G-96); hip=(206,G-176); sho=(312,G-202); hd=(344,G-212); wrist=(312,G-98)
body=GND()+L(ankle,toe,9)+L(ankle,knee,11)+L(knee,hip,11)+L(hip,sho,12)+L(sho,(338,G-208),11)+HEAD(hd) \
     +L(sho,wrist,9)+wt(wrist,24,16)+D(hip)+D(sho) \
     +f'<line x1="206" y1="{G-192}" x2="312" y2="{G-218}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>' \
     +uparrow(348,G-120,G-180)
card("M07-bent-over-row.png","Bent-Over Row","TIER A · STRENGTH",GREEN,"horizontal pull",body,
     ["Hinge at the hips; keep a flat back (green)","Weight hangs straight down; pull to the lower ribs","Drive the elbow back; squeeze the shoulder blade","The horizontal pull — balances the push-up"],
     "horizontal pull · upper-back + postural balance")

# 8. SUITCASE CARRY (front, tall, one weight at side, plumb line)
cx=215; hd=(cx,G-300); neck=(cx,G-272); hip=(cx,G-162); lank=(cx-22,G); rank=(cx+22,G); lkn=(cx-20,G-82); rkn=(cx+20,G-82)
rel=(cx+34,G-210); rwr=(cx+42,G-150); lwr=(cx-30,G-186)
body=GND()+f'<line x1="{cx}" y1="{G-314}" x2="{cx}" y2="{G}" stroke="{GREEN}" stroke-width="2.5" stroke-dasharray="2 7"/>' \
     +L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11) \
     +L(neck,rel,9)+L(rel,rwr,9)+wt(rwr,26,30)+L(neck,lwr,9)+HEAD(hd)+D(hip)
card("M08-suitcase-carry.png","Suitcase Carry","TIER A · STRENGTH",GREEN,"loaded carry",body,
     ["Weight in ONE hand; stand dead-vertical (green plumb)","Don't lean away — brace to stay square","Walk tall, slow, controlled; ribs down","Trains grip, core anti-tilt, posture under load"],
     "loaded carry · anti-lateral-flexion + grip")

# 9. CALF RAISE (side, risen onto the ball of the foot) — compressed to clear header
ball=(252,G); ankle=(232,G-32); heel=(210,G-18); knee=(232,G-110); hip=(232,G-182); neck=(232,G-268); hd=(232,G-296)
body=GND()+L(ball,ankle,10)+L(ankle,heel,10)+L(ankle,knee,11)+L(knee,hip,11)+L(hip,neck,12)+L(neck,(250,G-196),9)+HEAD(hd)+D(hip)+D(knee) \
     +uparrow(196,G-6,G-44)
card("M09-calf-raise.png","Calf Raise","TIER B · STRENGTH",GOLD,"ankle / lower leg",body,
     ["Rise high onto the balls of the feet; pause at the top","Lower slowly under control — full range","Straight leg = gastrocnemius; bent = soleus","Builds calf strength + Achilles / ankle resilience"],
     "plantarflexion · lower-leg + tendon health")

# 10. WALL SIT (side, back on wall, knees & hips at 90)
wx=170
hip=(196,G-150); sho=(190,G-250); hd=(186,G-284); knee=(316,G-150); ankle=(316,G); toe=(346,G)
body=GND()+f'<line x1="{wx}" y1="{G-300}" x2="{wx}" y2="{G}" stroke="{INK}" stroke-width="6"/>' \
     +f'<rect x="{wx-26}" y="{G-300}" width="26" height="300" fill="{INK}" opacity="0.07"/>' \
     +L(hip,sho,12)+L(sho,hd,11)+L(hip,knee,12)+L(knee,ankle,11)+L(ankle,toe,9)+L(sho,(280,G-160),9)+HEAD(hd)+D(hip)+D(knee) \
     +f'<path d="M210 {G-150} l 0 -16 l -16 0" fill="none" stroke="{GREEN}" stroke-width="2.5"/>' \
     +f'<path d="M300 {G-150} l 0 16 l 16 0" fill="none" stroke="{GREEN}" stroke-width="2.5"/>'
card("M10-wall-sit.png","Wall Sit","TIER B · STRENGTH",GOLD,"isometric quad",body,
     ["Back flat on the wall; slide down to ~90° knees","Hips and knees both square (green right-angles)","Weight in the heels; breathe; just hold","Builds quad endurance — easy on the joints"],
     "isometric knee-extension · quad endurance")

# 11. BIRD-DOG (quadruped, head down at front, opposite arm + leg reach up to one level)
sho=(305,G-120); hip=(165,G-120); fhand=(316,G); bknee=(156,G); hd=(336,G-94)
ehand=(408,G-156); efoot=(74,G-156)
body=GND()+L(sho,hip,12)+L(sho,fhand,10)+L(hip,bknee,10)+L(sho,ehand,9)+L(hip,efoot,11)+L(sho,(327,G-104),9)+HEAD(hd)+D(hip)+D(sho) \
     +f'<line x1="74" y1="{G-156}" x2="408" y2="{G-156}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>'
card("M11-bird-dog.png","Bird-Dog","TIER A · CORE",GREEN,"anti-rotation",body,
     ["On hands & knees; reach opposite arm + leg","Extend to ONE long line — don't arch or twist","Move slow; keep the hips level (green line)","Spine-sparing core + balance (McGill staple)"],
     "anti-rotation core · spine-sparing")

print("rendered 5 movement figures (M07-M11)")
