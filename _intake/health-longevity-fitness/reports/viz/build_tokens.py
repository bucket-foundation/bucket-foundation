#!/usr/bin/env python3
"""Render the design-system component sheet (tokens, type, badges, chips, icons) to verify quality."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
W,H=1000,720
s=[ds.svg_open(W,H), ds.goldbar(W),
   ds.text(36,52,"BUCKET LONGEVITY MANUAL",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.5"),
   ds.text(36,86,"Design System",size=30,fill=ds.INK2,font=ds.DISPLAY,weight="800"),
   ds.text(36,110,"One palette · one type scale · components with the honesty conventions built in.",size=13,fill=ds.MUT,font=ds.BODY,italic=True),
   f'<line x1="36" y1="126" x2="520" y2="126" stroke="{ds.GOLD}" stroke-width="2.4" stroke-linecap="round"/>']

# --- palette swatches ---
y=160
s.append(ds.text(36,y-8,"PALETTE",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
sw=[("ink",ds.INK),("paper",ds.PAPER),("gold",ds.GOLD),("gold·deep",ds.GOLD_D),("rule",ds.RULE),("muted",ds.MUT)]
x=36
for name,c in sw:
    s.append(f'<rect x="{x}" y="{y}" width="70" height="44" rx="6" fill="{c}" stroke="{ds.RULE}" stroke-width="1"/>')
    s.append(ds.text(x,y+62,name,size=9.5,fill=ds.MUT,font=ds.MONO)); x+=92

# --- type scale ---
y=270
s.append(ds.text(36,y-8,"TYPE",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
s.append(ds.text(36,y+22,"Archivo ExtraBold — Display",size=24,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
s.append(ds.text(36,y+50,"Inter Regular — body & data labels, the quick brown fox 0123456789",size=15,fill=ds.INK,font=ds.BODY))
s.append(ds.text(36,y+74,"Inter SemiBold — emphasis: strength predicts mortality",size=15,fill=ds.INK,font=ds.BODY,weight="600"))
s.append(ds.text(36,y+98,"IBM Plex Mono — claim: crf-vo2max-strongest-mortality-predictor",size=13,fill=ds.GOLD_D,font=ds.MONO))

# --- evidence-tier badges ---
y=410
s.append(ds.text(36,y-8,"EVIDENCE-TIER BADGES",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
x=36
for t in ["meta","rct","cohort","mechanistic","animal","n=1","anecdotal","speculative"]:
    b,w=ds.tier_badge(x,y,t); s.append(b); x+=w+10

# --- verdict chips ---
y=460
s.append(ds.text(36,y-8,"VERDICT SCALE (practitioner claim-check)",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
x=36
for v in ["AGREES","OVERSTATED","CONTRADICTS","NEW"]:
    b,w=ds.verdict_chip(x,y,v); s.append(b); x+=w+12

# --- honesty icon + flags ---
y=520
s.append(ds.text(36,y-8,"HONESTY MOTIFS",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
s.append(ds.icon_predictor_lever(36,y+4,1.0))
s.append(ds.text(120,y+22,"predictor ≠ lever",size=14,fill=ds.INK,font=ds.BODY,weight="600"))
s.append(f'<g transform="translate(300,{y+2})"><rect x="0" y="0" width="210" height="26" rx="13" fill="#fbf0ea" stroke="{ds.WARN}" stroke-width="1"/>{ds.text(14,17,"⚠ reverse causation likely",size=11.5,fill=ds.WARN,font=ds.BODY,weight="600")}</g>')
s.append(f'<g transform="translate(530,{y+2})"><rect x="0" y="0" width="200" height="26" rx="13" fill="#fbf0ea" stroke="{ds.WARN}" stroke-width="1"/>{ds.text(14,17,"⚠ dose ≠ studied dose",size=11.5,fill=ds.WARN,font=ds.BODY,weight="600")}</g>')

# --- mini sample panel frame ---
y=580
s.append(ds.text(36,y-2,"FIGURE FRAME",size=11,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
fx,fy,fw,fh=36,y+8,430,110
s.append(f'<g transform="translate({fx},{fy})">')
s.append(f'<rect x="0" y="0" width="{fw}" height="{fh}" rx="8" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
s.append(ds.goldbar(fw,0,0,5))
s.append(ds.text(18,30,"SECTION · KICKER",size=8.5,fill=ds.GOLD_D,font=ds.DISPLAY,weight="bold",spacing="0.4"))
s.append(ds.text(18,52,"Figure headline in Archivo",size=16,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
s.append(f'<line x1="18" y1="62" x2="210" y2="62" stroke="{ds.GOLD}" stroke-width="2"/>')
s.append(ds.text(18,fh-14,"Source · author year",size=8.2,fill=ds.FAINT,font=ds.BODY))
s.append(ds.text(fw-14,fh-14,"claim: example-id",size=7.6,fill=ds.GOLD_D,font=ds.MONO,anchor="end"))
b,_=ds.tier_badge(fw-90,16,"meta"); s.append(b)
s.append("</g>")
s.append(ds.text(36,H-20,"All components render from reports/viz/ds.py · cairosvg + matplotlib · reproducible & version-controlled",
                 size=10,fill=ds.FAINT,font=ds.BODY,italic=True))
s.append(ds.svg_close())
out=os.path.join(os.path.dirname(__file__),"..","..","media","figures","_design-system-sheet.png")
ds.render("".join(s), os.path.abspath(out), scale=2)
print("rendered", os.path.abspath(out))
