#!/usr/bin/env python3
"""Generate clean instructional exercise diagrams (stick-figure SVG -> PNG).
Evidence-tied to the corpus's Tier-A levers. Reproducible, no hallucinated anatomy."""
import os, math, cairosvg

OUT = os.path.join(os.path.dirname(__file__), "..", "media", "generated-diagrams")
os.makedirs(OUT, exist_ok=True)

INK="#1c1a17"; GOLD="#b08d3a"; PAPER="#faf7ef"; MUT="#6b5418"; RED="#b5471f"; GREEN="#1d6b2e"
W,H = 460, 540

def seg(x1,y1,x2,y2,w=9,c=INK):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def circ(x,y,r,c=INK,fill=INK):
    return f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" stroke="{c}" stroke-width="6" fill="{fill}"/>'
def figure(joints, color=INK):
    """joints: dict with head, neck, hip, kn/kn2, ank/ank2, sho, elb, wri ... draw torso+limbs"""
    j=joints; s=[]
    # torso
    s.append(seg(*j['neck'],*j['hip'],11,color))
    # head
    hx,hy=j['head']; s.append(circ(hx,hy,17,color,PAPER))
    # legs
    if 'knee' in j: s.append(seg(*j['hip'],*j['knee'],10,color)); s.append(seg(*j['knee'],*j['ankle'],10,color))
    if 'knee2' in j: s.append(seg(*j['hip'],*j['knee2'],10,color)); s.append(seg(*j['knee2'],*j['ankle2'],10,color))
    # arms from neck
    if 'elbow' in j: s.append(seg(*j['neck'],*j['elbow'],8,color)); s.append(seg(*j['elbow'],*j['wrist'],8,color))
    if 'elbow2' in j: s.append(seg(*j['neck'],*j['elbow2'],8,color)); s.append(seg(*j['elbow2'],*j['wrist2'],8,color))
    return "".join(s)

def esc(t):
    return str(t).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def panel(title, badge, badge_col, subtitle, body_svg, cues, cite):
    title,badge,subtitle,cite=esc(title),esc(badge),esc(subtitle),esc(cite)
    cues=[esc(c) for c in cues]
    cue_y=405
    cue_svg=""
    for c in cues:
        cue_svg+=f'<circle cx="40" cy="{cue_y-4}" r="3.5" fill="{GOLD}"/><text x="54" y="{cue_y}" font-size="14" fill="{INK}" font-family="Helvetica,Arial">{c}</text>'
        cue_y+=24
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<rect width="{W}" height="{H}" fill="{PAPER}"/>
<rect x="0" y="0" width="{W}" height="8" fill="{GOLD}"/>
<text x="30" y="48" font-size="23" font-weight="700" fill="{INK}" font-family="Helvetica,Arial">{title}</text>
<rect x="30" y="62" width="{14+len(badge)*7.4:.0f}" height="20" rx="10" fill="{badge_col}"/>
<text x="37" y="77" font-size="11.5" font-weight="700" fill="#fff" font-family="Helvetica,Arial" letter-spacing="0.5">{badge}</text>
<text x="{44+len(badge)*7.4:.0f}" y="77" font-size="13" fill="{MUT}" font-family="Helvetica,Arial" font-style="italic">{subtitle}</text>
<g transform="translate(33,2) scale(0.83)">{body_svg}</g>
{cue_svg}
<line x1="30" y1="{H-44}" x2="{W-30}" y2="{H-44}" stroke="#ddd3bb" stroke-width="1"/>
<text x="30" y="{H-24}" font-size="9.3" fill="#8a8170" font-family="Helvetica,Arial">{cite}</text>
</svg>'''

figs={}

# 1. Bodyweight squat (strength / Tier A)
body=figure({'head':(230,150),'neck':(230,178),'hip':(248,300),
  'knee':(300,318),'ankle':(300,400),'knee2':(300,318),'ankle2':(300,400),
  'elbow':(190,250),'wrist':(160,300),'elbow2':(190,250),'wrist2':(160,300)})
ground='<line x1="120" y1="400" x2="360" y2="400" stroke="#1c1a17" stroke-width="4"/>'
arrow='<path d="M248 300 q -55 -5 -60 -55" stroke="#b5471f" stroke-width="3" fill="none" marker-end="url(#a)"/>'
defs='<defs><marker id="a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#b5471f"/></marker></defs>'
figs['01-bodyweight-squat']=panel("Bodyweight Squat","TIER A · STRENGTH",GREEN,
  "builds & retains lower-body strength",defs+body+ground+arrow,
  ["Hips travel back & down, below parallel","Knees track over toes, heels planted",
   "Chest up, neutral spine","Strength (not mass) predicts mortality"],
  "~10–17% lower mortality · J-curve ~30–60 min/wk · claim: resistance-training-mortality-meta (E)")

# 2. Hip hinge / deadlift pattern (strength)
body=figure({'head':(185,165),'neck':(205,188),'hip':(290,250),
  'knee':(305,330),'ankle':(300,405),'knee2':(305,330),'ankle2':(300,405),
  'elbow':(255,300),'wrist':(300,355),'elbow2':(255,300),'wrist2':(300,355)})
spine='<line x1="205" y1="188" x2="290" y2="250" stroke="#1d6b2e" stroke-width="4" stroke-dasharray="2 6"/>'
ground='<line x1="120" y1="405" x2="360" y2="405" stroke="#1c1a17" stroke-width="4"/>'
figs['02-hip-hinge-deadlift']=panel("Hip Hinge / Deadlift","TIER A · STRENGTH",GREEN,
  "the fundamental posterior-chain pattern",body+spine+ground,
  ["Hips travel BACK, not down","Spine stays neutral (green line)",
   "Shins near-vertical, weight over mid-foot","Grip strength itself predicts mortality"],
  "claim: grip-strength-mortality-pure (PURE n=139k) · dexa-strength-not-mass (L)")

# 3. One-leg stand (balance — mortality biomarker)
body=figure({'head':(230,150),'neck':(230,178),'hip':(230,290),
  'knee':(230,345),'ankle':(230,405),
  'knee2':(285,320),'ankle2':(300,300),
  'elbow':(180,255),'wrist':(150,295),'elbow2':(280,255),'wrist2':(310,295)})
ground='<line x1="120" y1="405" x2="360" y2="405" stroke="#1c1a17" stroke-width="4"/>'
timer='<circle cx="370" cy="150" r="34" fill="none" stroke="#b08d3a" stroke-width="6"/><text x="370" y="158" font-size="22" font-weight="700" fill="#6b5418" text-anchor="middle" font-family="Helvetica,Arial">10s</text>'
figs['03-one-leg-stand-balance']=panel("10-Second One-Leg Stand","TIER A · BALANCE TEST",GREEN,
  "a free, validated mortality biomarker",body+ground+timer,
  ["Stand on one leg, eyes OPEN","Hold 10 seconds, each side",
   "Inability → 1.84× all-cause mortality","Train it: it's also the test"],
  "claim: one-leg-stance-10s-mortality · Araújo et al., Br J Sports Med 2022 (HR 1.84)")

# 4. Sit-to-rise test
floor='<line x1="120" y1="405" x2="360" y2="405" stroke="#1c1a17" stroke-width="4"/>'
body=figure({'head':(205,250),'neck':(212,278),'hip':(235,360),
  'knee':(300,345),'ankle':(330,402),'knee2':(300,372),'ankle2':(330,402),
  'elbow':(185,330),'wrist':(180,400),'elbow2':(185,330),'wrist2':(180,400)})
up='<path d="M235 360 q 30 -90 0 -150" stroke="#b5471f" stroke-width="3" fill="none" marker-end="url(#a2)"/><defs><marker id="a2" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#b5471f"/></marker></defs>'
figs['04-sit-to-rise-test']=panel("Sit-to-Rise Test","TIER A · COMPOSITE",GREEN,
  "strength + balance + flexibility in one move",floor+body+up,
  ["Lower to floor & rise again","Start 10 pts; −1 each hand/knee support",
   "Score predicts all-cause mortality","Tests the capacities that matter together"],
  "claim: sit-to-rise-mortality · Brito et al. 2014 (Eur J Prev Cardiol)")

# 5. 90/90 hip mobility (seated)
floor='<line x1="90" y1="380" x2="390" y2="380" stroke="#1c1a17" stroke-width="4"/>'
# seated figure, two legs at 90/90
s=[]
s.append(circ(170,210,17,INK,PAPER))           # head
s.append(seg(170,228,200,300,11))              # torso
s.append(seg(200,300,265,300,10))              # front thigh
s.append(seg(265,300,265,360,10))              # front shin down
s.append(seg(200,300,200,360,10,GOLD))         # back thigh (behind)
s.append(seg(200,360,270,360,10,GOLD))         # back shin
s.append(seg(170,228,210,275,8)); s.append(seg(210,275,250,290,8))  # arm
figs['05-90-90-hip-mobility']=panel("90/90 Hip Mobility","TIER B · MOBILITY",GOLD,
  "trains internal + external hip rotation",floor+"".join(s),
  ["Both knees bent 90°, front & back","Sit tall over the hips",
   "Rotate side to side without hands","Counters the cost of chronic sitting"],
  "Mobility = controllable range. Maps to movement-library/mobility · supports Tier-A 'move more'")

# 6. Box breathing (4-4-4-4) — autonomic / HRV
box=f'''<rect x="150" y="150" width="170" height="170" fill="none" stroke="{INK}" stroke-width="6"/>
<text x="235" y="138" font-size="14" fill="{MUT}" text-anchor="middle" font-family="Helvetica,Arial">inhale 4s ▶</text>
<text x="235" y="345" font-size="14" fill="{MUT}" text-anchor="middle" font-family="Helvetica,Arial">◀ exhale 4s</text>
<text x="138" y="240" font-size="14" fill="{MUT}" text-anchor="end" font-family="Helvetica,Arial">hold 4s</text>
<text x="332" y="240" font-size="14" fill="{MUT}" font-family="Helvetica,Arial">hold 4s</text>
<circle cx="150" cy="150" r="8" fill="{GOLD}"/>'''
figs['06-box-breathing']=panel("Box Breathing (4-4-4-4)","TIER B · BREATH / HRV",GOLD,
  "slow breathing shifts autonomic balance",box,
  ["Inhale 4 · hold 4 · exhale 4 · hold 4","~6 breaths/min raises HRV acutely",
   "Real acute effect; longevity outcome unproven","Nasal, quiet, diaphragmatic"],
  "claim: hrv-autonomic-recovery-biomarker (I) · thread-autonomic-hrv · honest tier: surrogate")

# render all
index=[]
for name,svg in figs.items():
    svg_path=os.path.join(OUT,name+".svg"); png_path=os.path.join(OUT,name+".png")
    open(svg_path,"w").write(svg)
    cairosvg.svg2png(bytestring=svg.encode(),write_to=png_path,output_width=W*2,output_height=H*2)
    index.append(name)
    print("rendered",name+".png")
print("TOTAL",len(index),"diagrams ->",os.path.abspath(OUT))
