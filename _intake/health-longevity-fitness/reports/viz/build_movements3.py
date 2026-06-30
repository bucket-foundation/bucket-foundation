#!/usr/bin/env python3
"""Movement library wave 3 — dip, dead hang, jump rope, hip-flexor stretch, deep squat hold.
Conditioning + mobility. Hand-placed, verified."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; GOLD=ds.GOLD; GOLD_D=ds.GOLD_D; PAPER=ds.PAPER; MUT=ds.MUT; RED="#b5471f"; GREEN="#1d6b2e"
W,H,G,HEADR=460,600,410,17
def L(a,b,w=11,c=INK): return f'<line x1="{a[0]:.0f}" y1="{a[1]:.0f}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def D(p,r=5,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r}" fill="{c}"/>'
def HEAD(p,c=INK): return f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{HEADR}" fill="{PAPER}" stroke="{c}" stroke-width="7"/>'
def GND(x0=70,x1=W-40,y=G): return f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{INK}" stroke-width="4"/>'
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

# 12. DIP (side, straight-arm support, torso leans forward so arm & trunk diverge)
bary=G-150
hand=(250,bary); sho=(248,G-250); hd=(266,G-280); hip=(302,G-150); knee=(334,G-92); foot=(304,G-70)
bar=f'<line x1="200" y1="{bary}" x2="292" y2="{bary}" stroke="{INK}" stroke-width="7"/>' \
    +f'<line x1="208" y1="{bary}" x2="208" y2="{G}" stroke="{INK}" stroke-width="6"/>' \
    +f'<line x1="320" y1="{bary-8}" x2="392" y2="{bary-8}" stroke="{INK}" stroke-width="6" opacity="0.32"/>'
body=GND()+bar+L(sho,hand,10)+L(sho,(258,G-268),11)+HEAD(hd)+L(sho,hip,12)+L(hip,knee,11)+L(knee,foot,10)+D(hip)+D(sho) \
     +f'<line x1="372" y1="{G-210}" x2="372" y2="{G-150}" stroke="{RED}" stroke-width="3" marker-end="url(#ar)"/>'
card("M12-dip.png","Dip","TIER B · STRENGTH",GOLD,"vertical push",body,
     ["Support on straight arms; shoulders down & back","Lower until upper arms ~parallel; press back up","Slight forward lean hits the chest; upright hits triceps","Hard — regress with bench dips or a band"],
     "vertical push · chest + triceps + lockout strength")

# 13. DEAD HANG (front, straight arms overhead on a bar, body relaxed long)
cx=230; bary=G-312
lh=(cx-24,bary); rh=(cx+24,bary); lsho=(cx-20,G-258); rsho=(cx+20,G-258); neck=(cx,G-256); hd=(cx,G-286)
hip=(cx,G-152); lkn=(cx-14,G-86); rkn=(cx+14,G-86); lank=(cx-16,G-26); rank=(cx+16,G-26)
body=f'<line x1="118" y1="{bary}" x2="342" y2="{bary}" stroke="{INK}" stroke-width="7"/>' \
     +L(lh,lsho,9)+L(rh,rsho,9)+L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11)+HEAD(hd)+D(hip) \
     +f'<line x1="70" y1="{G}" x2="{W-40}" y2="{G}" stroke="{INK}" stroke-width="4" opacity="0.25"/>'
card("M13-dead-hang.png","Dead Hang","TIER B · MOBILITY",GOLD,"grip + decompression",body,
     ["Hang from a bar, arms straight, shoulders active","Relax the body long; breathe; just hang","Builds crushing grip + decompresses the spine","Start 10-20s; work toward a full minute"],
     "grip endurance + shoulder/spine decompression")

# 14. JUMP ROPE (front, mid-hop, rope arcing overhead)
cx=230; hd=(cx,G-298); neck=(cx,G-272); hip=(cx,G-172)
lkn=(cx-16,G-104); rkn=(cx+16,G-104); lank=(cx-14,G-30); rank=(cx+14,G-30)
lel=(cx-30,G-226); lhand=(cx-50,G-186); rel=(cx+30,G-226); rhand=(cx+50,G-186)
body=GND()+L(neck,hip,12)+L(hip,lkn,11)+L(lkn,lank,11)+L(hip,rkn,11)+L(rkn,rank,11) \
     +L(neck,lel,9)+L(lel,lhand,9)+L(neck,rel,9)+L(rel,rhand,9)+HEAD(hd)+D(hip) \
     +f'<path d="M{cx-50} {G-186} C {cx-100} {G-302} {cx+100} {G-302} {cx+50} {G-186}" fill="none" stroke="{GOLD_D}" stroke-width="4"/>' \
     +f'<path d="M{cx-50} {G-186} C {cx-106} {G-24} {cx+106} {G-24} {cx+50} {G-186}" fill="none" stroke="{GOLD_D}" stroke-width="4" opacity="0.55"/>' \
     +f'<line x1="{cx-30}" y1="{G-8}" x2="{cx-30}" y2="{G+4}" stroke="{MUT}" stroke-width="2"/><line x1="{cx+30}" y1="{G-8}" x2="{cx+30}" y2="{G+4}" stroke="{MUT}" stroke-width="2"/>'
card("M14-jump-rope.png","Jump Rope","TIER B · CONDITIONING",GOLD,"plyometric / cardio",body,
     ["Small, soft hops off the balls of the feet","Turn the rope from the wrists","Stay tall; light and springy; relaxed shoulders","Cheap, portable cardio + coordination + calves"],
     "low-cost conditioning + foot/ankle elasticity")

# 15. HIP-FLEXOR STRETCH (side, half-kneeling lunge, tall torso, hips forward)
bfoot=(108,G); bknee=(152,G); hip=(196,G-112); ffoot=(304,G); fknee=(292,G-112); neck=(196,G-228); hd=(192,G-258)
body=GND()+L(bfoot,bknee,9)+L(bknee,hip,12)+L(hip,fknee,12)+L(fknee,ffoot,11)+L(hip,neck,12)+L(neck,hd,11)+L(neck,(176,G-296),9)+HEAD(hd)+D(hip)+D(fknee)+D(bknee) \
     +f'<line x1="206" y1="{G-150}" x2="256" y2="{G-150}" stroke="{RED}" stroke-width="3" marker-end="url(#ar)"/>'
card("M15-hip-flexor-stretch.png","Hip-Flexor Stretch","TIER A · MOBILITY",GREEN,"half-kneeling",body,
     ["Half-kneel; tuck the pelvis (don't arch the low back)","Gently drive the hips FORWARD (arrow), stay tall","Reach the same-side arm overhead to deepen it","Undoes all-day sitting — opens the front of the hip"],
     "hip-flexor / quad length · counters sitting")

# 16. DEEP SQUAT HOLD (front, bottom position, heels down, elbows inside knees)
cx=230; lank=(cx-42,G); rank=(cx+42,G); lkn=(cx-66,G-74); rkn=(cx+66,G-74); hip=(cx,G-92)
neck=(cx,G-208); hd=(cx,G-238); lel=(cx-34,G-150); rel=(cx+34,G-150); hands=(cx,G-166)
body=GND()+L(lank,lkn,11)+L(lkn,hip,11)+L(rank,rkn,11)+L(rkn,hip,11)+L(hip,neck,12) \
     +L(neck,lel,9)+L(lel,hands,9)+L(neck,rel,9)+L(rel,hands,9)+HEAD(hd)+D(hip)+D(lkn)+D(rkn) \
     +f'<line x1="{cx-58}" y1="{G+4}" x2="{cx-26}" y2="{G+4}" stroke="{GREEN}" stroke-width="3"/><line x1="{cx+26}" y1="{G+4}" x2="{cx+58}" y2="{G+4}" stroke="{GREEN}" stroke-width="3"/>'
card("M16-deep-squat-hold.png","Deep Squat Hold","TIER A · MOBILITY",GREEN,"resting squat",body,
     ["Sink to the bottom; keep both heels flat (green)","Knees track out; elbows gently push them open","Chest tall; relax and breathe into the position","The human resting posture — opens hips & ankles"],
     "ankle + hip mobility · the resting squat")

print("rendered 5 movement figures (M12-M16)")
