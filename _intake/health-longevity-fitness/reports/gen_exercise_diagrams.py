#!/usr/bin/env python3
"""Instructional exercise diagrams v3 — anatomically-reasoned, hand-placed joints.
Each pose uses explicit, biomechanically-correct coordinates (verified visually).
SVG -> PNG via cairosvg. No AI images, no hallucinated anatomy."""
import os, math, cairosvg

OUT = os.path.join(os.path.dirname(__file__), "..", "media", "generated-diagrams")
os.makedirs(OUT, exist_ok=True)
INK="#1c1a17"; GOLD="#b08d3a"; PAPER="#faf7ef"; MUT="#6b5418"; RED="#b5471f"; GREEN="#1d6b2e"
W,H = 460, 600
G = 405          # ground y
HEADR=17

def L(a,b,w=11,c=INK): return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def D(p,r=5,c=INK): return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{c}"/>'
def HEAD(p,c=INK): return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{HEADR}" fill="{PAPER}" stroke="{c}" stroke-width="7"/>'
def GND(): return f'<line x1="60" y1="{G}" x2="{W-35}" y2="{G}" stroke="{INK}" stroke-width="4"/>'
def esc(t): return str(t).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def frame(title,badge,bcol,subtitle,body,cues,cite):
    title,badge,subtitle,cite=map(esc,(title,badge,subtitle,cite)); cues=[esc(c) for c in cues]
    cy=G+40; cl=""
    for c in cues:
        cl+=f'<circle cx="44" cy="{cy-4}" r="3.5" fill="{GOLD}"/><text x="58" y="{cy}" font-size="14.5" fill="{INK}" font-family="Helvetica,Arial">{c}</text>'; cy+=25
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<rect width="{W}" height="{H}" fill="{PAPER}"/><rect width="{W}" height="8" fill="{GOLD}"/>
<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="{RED}"/></marker></defs>
<text x="30" y="48" font-size="23" font-weight="700" fill="{INK}" font-family="Helvetica,Arial">{title}</text>
<rect x="30" y="62" width="{16+len(badge)*7.4:.0f}" height="20" rx="10" fill="{bcol}"/>
<text x="38" y="77" font-size="11.5" font-weight="700" fill="#fff" font-family="Helvetica,Arial">{badge}</text>
<text x="{48+len(badge)*7.4:.0f}" y="77" font-size="13" fill="{MUT}" font-style="italic" font-family="Helvetica,Arial">{subtitle}</text>
{body}
{cl}
<line x1="30" y1="{H-38}" x2="{W-30}" y2="{H-38}" stroke="#ddd3bb" stroke-width="1"/>
<text x="30" y="{H-20}" font-size="9.2" fill="#8a8170" font-family="Helvetica,Arial">{cite}</text></svg>'''

def render(name,svg):
    open(os.path.join(OUT,name+".svg"),"w").write(svg)
    cairosvg.svg2png(bytestring=svg.encode(),write_to=os.path.join(OUT,name+".png"),output_width=W*2,output_height=H*2)
    print("rendered",name)

# ===== 1. AIR SQUAT (side, facing right) — deep, hips back, below parallel =====
ankle=(245,G); knee=(290,G-74); hip=(220,G-58); sho=(252,G-180); hd=(266,G-202)
el=(300,G-178); wr=(340,G-174); toe=(278,G)
par=f'<line x1="{hip[0]-28:.0f}" y1="{hip[1]:.0f}" x2="{knee[0]+24:.0f}" y2="{hip[1]:.0f}" stroke="{RED}" stroke-width="2" stroke-dasharray="4 4"/>'
parlbl=f'<text x="{hip[0]-118:.0f}" y="{hip[1]+4:.0f}" font-size="11" fill="{RED}" font-family="Helvetica,Arial">hip below knee</text>'
sq="".join([GND(),par,parlbl, L(hip,knee),L(knee,ankle),L(ankle,toe,9), L(hip,sho,12), L(sho,el,9),L(el,wr,9),
  HEAD(hd), D(hip),D(knee),D(ankle),D(el,4)])
render("01-air-squat", frame("Air Squat (bottom)","TIER A · STRENGTH",GREEN,"side view — knee-dominant",sq,
  ["Hips sit BACK and down; weight on mid-foot","Hip crease drops below the knee (red line)",
   "Shins angle forward; heels stay planted","Chest up, spine long; arms counterbalance"],
  "claim: resistance-training-mortality-meta (E) · strength predicts mortality · J-curve ~30-60 min/wk"))

# ===== 2. HIP HINGE / DEADLIFT (side, facing right) — hips BEHIND heels =====
ankle=(265,G); knee=(279,G-74); hip=(203,G-150); sho=(272,G-220); hd=(289,G-242)
el=(272,G-172); wr=(272,G-128); bar=(272,G); toe=(296,G)
flat=f'<line x1="{hip[0]:.0f}" y1="{hip[1]:.0f}" x2="{sho[0]:.0f}" y2="{sho[1]:.0f}" stroke="{GREEN}" stroke-width="4" stroke-dasharray="2 7"/>'
arr=f'<line x1="{hip[0]-12:.0f}" y1="{hip[1]-2:.0f}" x2="{hip[0]-62:.0f}" y2="{hip[1]-2:.0f}" stroke="{RED}" stroke-width="3" marker-end="url(#ah)"/>'
arrlbl=f'<text x="{hip[0]-78:.0f}" y="{hip[1]-12:.0f}" font-size="11" fill="{RED}" font-family="Helvetica,Arial">hips back</text>'
hng="".join([GND(),L(hip,knee),L(knee,ankle),L(ankle,toe,9), L(hip,sho,12),flat, L(sho,el,9),L(el,wr,9),
  D(bar,9,INK), arr,arrlbl, HEAD(hd), D(hip),D(knee),D(ankle)])
render("02-hip-hinge", frame("Hip Hinge / Deadlift","TIER A · STRENGTH",GREEN,"side view — hip-dominant",hng,
  ["Push hips BACK (not down); shins near-vertical","Back stays flat and long (green line)",
   "Hinge to ~45 deg; arms hang straight to the bar","Soft knees; weight in the heels"],
  "claim: grip-strength-mortality-pure (PURE n=139k) · dexa-strength-not-mass (L)"))

# ===== 3. DEEP LUNGE / HIP-FLEXOR MOBILITY (side, facing right) =====
fa=(290,G); fknee=(286,G-78); fhip=(232,G-150); sho=(238,G-248); hd=(240,G-272)
bk=(168,G-92); ba=(120,G); el=(250,G-200); wr=(256,G-160)
lng="".join([GND(),
  L(fhip,fknee),L(fknee,fa),L(fa,(fa[0]+28,G),9),                 # front leg
  L(fhip,bk,11,GOLD),L(bk,ba,11,GOLD),L(ba,(ba[0]-26,G),9,GOLD),  # back leg (gold)
  L(fhip,sho,12),L(sho,el,9),L(el,wr,9), HEAD(hd),
  D(fhip),D(fknee),D(bk,5,GOLD)])
render("03-deep-lunge-mobility", frame("Deep Lunge (hip mobility)","TIER B · MOBILITY",GOLD,"side view — opens the hip flexors",lng,
  ["Front knee stacked over the ankle (~90 deg)","Back leg long (gold); sink the hips forward",
   "Torso tall, ribs down; feel the back hip-front","Counters the shortening from chronic sitting"],
  "maps to movement-library/mobility · supports the Tier-A 'move more' lever"))

# ===== 4. FOREARM PLANK (side, head to the right) =====
el=(330,G); hand=(300,G); sho=(330,G-92); hip=(212,G-58); ankle=(95,G-22); toe=(73,G); hd=(348,G-100)
line=f'<line x1="{sho[0]:.0f}" y1="{sho[1]-2:.0f}" x2="{ankle[0]:.0f}" y2="{ankle[1]-2:.0f}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="2 7"/>'
pl="".join([GND(), L(hand,el,9),L(el,sho,9), L(sho,hip,12),L(hip,ankle,12),L(ankle,toe,9),
  line, HEAD(hd), D(hip),D(sho),D(ankle)])
render("04-forearm-plank", frame("Forearm Plank","TIER A · CORE / STRENGTH",GREEN,"side view — one straight line",pl,
  ["Ears, hips and ankles on ONE line (green)","Elbows under shoulders; forearms grounded",
   "Brace the belly; squeeze glutes; no sag, no pike","Quality over time: hold only while the line holds"],
  "trains the trunk that transmits force in every lift · supports strength + posture"))

# ===== 5. ONE-LEG STAND (front view, balance test) =====
cx=235; hip=(cx,G-200); sk=(cx-2,G-100); sa=(cx,G)            # standing leg
lk=(cx+60,G-150); la=(cx+42,G-92)                              # lifted leg (gold)
neck=(cx,G-292); hd=(cx,G-315); le=(cx-50,G-150); lw=(cx-60,G-108)
timer=f'<circle cx="378" cy="150" r="33" fill="none" stroke="{GOLD}" stroke-width="6"/><text x="378" y="158" font-size="21" font-weight="700" fill="{MUT}" text-anchor="middle" font-family="Helvetica,Arial">10s</text>'
ol="".join([GND(), L(hip,sk),L(sk,sa),L(sa,(sa[0]+26,G),9),
  L(hip,lk,11,GOLD),L(lk,la,11,GOLD), L(hip,neck,12),L(neck,le,9),L(le,lw,9),
  HEAD(hd), D(hip),D(sk),D(lk,5,GOLD), timer])
render("05-one-leg-stand", frame("10-Second One-Leg Stand","TIER A · BALANCE TEST",GREEN,"front view — a free mortality biomarker",ol,
  ["Stand on ONE leg, eyes open, hands off support","Lift the other knee; hold 10 seconds each side",
   "Failing it is linked to ~1.84x mortality","The test IS the training; practice daily"],
  "claim: one-leg-stance-10s-mortality · Araujo et al., Br J Sports Med 2022 (HR 1.84)"))

# ===== 6. BOX BREATHING (diagram) =====
tri={'t':'M231,143 L243,150 L231,157 Z','r':'M313,231 L320,243 L327,231 Z',
     'b':'M239,313 L227,320 L239,327 Z','l':'M157,239 L150,227 L143,239 Z'}
box=f'''<rect x="150" y="150" width="170" height="170" rx="6" fill="none" stroke="{INK}" stroke-width="6"/>
{''.join(f'<path d="{d}" fill="{GOLD}"/>' for d in tri.values())}
<text x="235" y="138" font-size="14" fill="{MUT}" text-anchor="middle" font-family="Helvetica,Arial">inhale · 4s</text>
<text x="235" y="348" font-size="14" fill="{MUT}" text-anchor="middle" font-family="Helvetica,Arial">exhale · 4s</text>
<text x="138" y="240" font-size="14" fill="{MUT}" text-anchor="end" font-family="Helvetica,Arial">hold · 4s</text>
<text x="332" y="240" font-size="14" fill="{MUT}" font-family="Helvetica,Arial">hold · 4s</text>
<text x="235" y="245" font-size="11" fill="#b9af97" text-anchor="middle" font-family="Helvetica,Arial">clockwise</text>'''
render("06-box-breathing", frame("Box Breathing (4-4-4-4)","TIER B · BREATH / HRV",GOLD,"slow breathing shifts autonomic balance",box,
  ["Inhale 4 · hold 4 · exhale 4 · hold 4","~6 breaths/min raises HRV acutely",
   "Nasal, quiet, diaphragmatic (belly, not chest)","Real acute effect; longevity outcome unproven"],
  "claim: hrv-autonomic-recovery-biomarker (I) · thread-autonomic-hrv · honest tier: surrogate"))

print("DONE 6 ->", os.path.abspath(OUT))
