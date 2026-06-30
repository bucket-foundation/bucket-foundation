#!/usr/bin/env python3
"""Emergency action cards (§34) — choking, stop-the-bleed, naloxone, sepsis, burns, seizure, heat stroke."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
RED="#b5471f"; DKR="#8c2f12"; INK=ds.INK; PAPER=ds.PAPER; MUT=ds.MUT; GRN="#1d6b2e"; GOLDD=ds.GOLD_D
def wrap(t,n):
    out=[],; words=t.split(); line=""
    res=[]
    for w in words:
        if len(line)+len(w)+1<=n: line=(line+" "+w).strip()
        else: res.append(line); line=w
    if line: res.append(line)
    return res

def card(name,title,sub,recognize,act,note,claim):
    W=760
    # measure height
    rlines=sum(len(wrap(r,52)) for r in recognize)
    alines=sum(len(wrap(a,50)) for a in act)
    H=150+ rlines*24 + 40 + alines*30 + 70
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       f'<rect width="{W}" height="{H}" fill="{PAPER}"/><rect width="{W}" height="10" fill="{RED}"/>',
       f'<rect x="0" y="10" width="{W}" height="2" fill="{DKR}"/>',
       f'<path d="M30 36 l13 -22 l13 22 z" fill="{RED}"/><rect x="41.5" y="22" width="3" height="9" fill="#fff"/><rect x="41.5" y="33" width="3" height="3" fill="#fff"/>',
       ds.text(66,52,title,size=21,fill=DKR,font=ds.DISPLAY,weight="800"),
       ds.text(30,78,sub,size=12.5,fill=MUT,font=ds.BODY,italic=True)]
    y=112
    s.append(ds.text(30,y,"RECOGNIZE",size=12,fill=RED,font=ds.DISPLAY,weight="bold",spacing="0.5")); y+=26
    for r in recognize:
        for j,ln in enumerate(wrap(r,52)):
            pre="•  " if j==0 else "    "
            s.append(ds.text(40,y,pre+ln,size=13.5,fill=INK,font=ds.BODY)); y+=23
    y+=14
    s.append(ds.text(30,y,"ACT",size=12,fill=RED,font=ds.DISPLAY,weight="bold",spacing="0.5")); y+=28
    for i,a in enumerate(act):
        s.append(f'<circle cx="40" cy="{y-5}" r="11" fill="{RED}"/>')
        s.append(ds.text(40,y-1,str(i+1),size=12,fill="#fff",font=ds.DISPLAY,weight="bold",anchor="middle"))
        for j,ln in enumerate(wrap(a,50)):
            s.append(ds.text(60,y,ln,size=13.5,fill=INK,font=ds.BODY,weight=("700" if j==0 else None))); y+=24
        y+=6
    s.append(f'<rect x="24" y="{H-58}" width="{W-48}" height="34" rx="7" fill="#f6ece6" stroke="{RED}" stroke-width="1.5"/>')
    s.append(ds.text(38,H-36,note,size=12,fill=DKR,font=ds.BODY,weight="600"))
    s.append(ds.text(W-26,H-12,"claim: "+claim,size=8,fill=GOLDD,font=ds.MONO,anchor="end"))
    s.append("</svg>")
    ds.render("".join(s),f"{FIG}/{name}")

card("E1-choking.png","Choking","Adult / child who can't cough, speak, or breathe",
 ["Universal sign: hands clutched to the throat","Silent, can't speak, weak/no cough, lips turning blue","If they can still cough forcefully — let them cough"],
 ["Lean them forward; give 5 firm BACK BLOWS between the shoulder blades",
  "Then 5 ABDOMINAL THRUSTS (Heimlich) — fist above the navel, sharp inward-and-up",
  "Alternate 5 and 5 until the object clears or they collapse",
  "If they go unconscious: lower to the floor and START CPR; look in the mouth only if you SEE the object"],
 "Infant: 5 back blows + 5 CHEST thrusts — never abdominal. Pregnant/obese: chest thrusts.","choking-response")

card("E2-stop-the-bleed.png","Severe Bleeding","Life-threatening blood loss — act in seconds",
 ["Blood spurting or pooling fast; soaked-through clothing","Pale, cold, confused, faint = going into shock"],
 ["Press HARD directly on the wound with a cloth — your whole weight and keep it on",
  "Pack a deep wound tightly with gauze/cloth and keep pressing",
  "Life-threatening limb bleed that won't stop → TOURNIQUET 2–3 in above the wound, high & tight, NOT over a joint",
  "Tighten until the bleeding STOPS; write down the TIME applied",
  "Call emergency services; keep them warm"],
 "Never loosen a tourniquet once placed — leave it for the medics.","stop-the-bleed")

card("E3-naloxone.png","Opioid Overdose","Naloxone first — minutes matter",
 ["Unresponsive, won't wake to shouting or a sternal rub","Slow, shallow, or NO breathing; gurgling","Pinpoint pupils; blue/grey lips and fingertips"],
 ["Give NALOXONE — one spray in a nostril (or inject) right away",
  "Call emergency services",
  "Support breathing: tilt the head back; rescue breaths or chest compressions if trained",
  "No response in 2–3 minutes → give a SECOND dose",
  "Stay with them and put them on their side — naloxone wears off in 30–90 min and they can re-overdose"],
 "It's safe to give naloxone even if you're not sure it's opioids. When unsure, give it.","naloxone-first")

card("E4-sepsis.png","Sepsis","An infection turning deadly — say the word “sepsis”",
 ["An infection PLUS any of the danger signs below","Confusion or slurred speech, extreme shivering or very low temp","No urine all day · severe breathlessness · mottled or blue skin","A feeling of “I might die”"],
 ["Treat it as an emergency — go to the ER or call emergency services NOW",
  "Say the words: “I'm worried about SEPSIS”",
  "Don't wait to “see if it improves” — every hour to antibiotics matters"],
 "Sepsis kills ~11 million a year. Early antibiotics save lives — speak up.","sepsis-redflags")

card("E5-burns.png","Burns","Cool water first — for a full 20 minutes",
 ["Redness, blistering, white/charred skin, severe pain","Airway risk: burns to the face, soot in the nose/mouth, hoarse voice"],
 ["Cool the burn under COOL RUNNING WATER for ~20 minutes (best within 3 hours)",
  "Remove rings, watches, and tight clothing before swelling starts",
  "Cover loosely with cling-film or a clean non-stick dressing",
  "DON'T use butter, oil, toothpaste, or ice; don't burst blisters"],
 "ER for: face/hands/genitals, deep or circumferential, larger than the palm, or any airway sign.","burn-first-aid")

card("E6-seizure.png","Seizure","Protect, time, and wait it out",
 ["Sudden collapse with stiffening then rhythmic jerking","Blank staring, confusion, loss of awareness"],
 ["Clear hard/sharp objects away; cushion the head",
  "TIME the seizure; loosen anything tight around the neck",
  "When the jerking stops, roll them onto their side (recovery position)",
  "Stay until they're fully alert; be calm and reassuring"],
 "Call 911 if: lasts >5 min, repeats, first-ever seizure, injury, pregnancy, or in water. NEVER put anything in the mouth.","seizure-response")

card("E7-heat-stroke.png","Heat Stroke","Cool first, transport second",
 ["Hot skin + ALTERED MENTAL STATE (confused, agitated, collapsed)","Core temp ≳ 40 °C / 104 °F; may or may not be sweating"],
 ["Move to shade/cool; call emergency services",
  "COOL AGGRESSIVELY NOW — cold-water immersion is the gold standard",
  "If no tub: douse with water + fan; ice packs to neck, armpits, groin",
  "Keep cooling until help arrives or mental state clears"],
 "Cooling comes BEFORE transport. Antipyretics (paracetamol/ibuprofen) do NOT work for heat stroke.","heat-stroke")

print("rendered 7 emergency cards (E1-E7)")
