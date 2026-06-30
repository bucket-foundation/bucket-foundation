#!/usr/bin/env python3
"""Signature figures batch 2: Bayes/PPV, emergency action cards, structural schematics."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
RED="#b5471f"; REDBG="#fbf0ea"; GREEN="#1d6b2e"

def emerg_panel(W,H,kicker,title_h,sub,src):
    s=[ds.svg_open(W,H), f'<rect x="0" y="0" width="{W}" height="7" fill="{RED}"/>',
       ds.text(28,46,kicker.upper(),size=10,fill=RED,font=ds.DISPLAY,weight="bold",spacing="0.4"),
       ds.text(28,74,title_h,size=22,fill=ds.INK2,font=ds.DISPLAY,weight="800"),
       ds.text(28,96,sub,size=12.5,fill=ds.MUT,font=ds.BODY,italic=True),
       f'<line x1="28" y1="112" x2="430" y2="112" stroke="{RED}" stroke-width="2.4" stroke-linecap="round"/>']
    foot=(f'<line x1="28" y1="{H-34}" x2="{W-28}" y2="{H-34}" stroke="{ds.RULE}" stroke-width="1"/>'
          f'{ds.text(28,H-16,src,size=8.4,fill=ds.FAINT,font=ds.BODY)}'
          f'{ds.text(W-28,H-16,"Education only — call emergency services first; take a certified course.",size=8,fill=ds.FAINT,font=ds.BODY,anchor="end")}{ds.svg_close()}')
    return "".join(s),134,foot

# ---------------- BAYES / PPV ----------------
def bayes_ppv():
    W,H=1000,600
    head,y0,foot=ds.panel(W,H,"Pathology & Lab Medicine · the most useful idea in medicine",
        "Why a 'good' test can still be mostly wrong",
        "Sensitivity & specificity aren't enough — what matters is how common the disease is.",
        "Test-performance / Bayes — §Pathology & Lab Medicine","bayes-pretest-probability")
    s=[head]
    def dotrow(cx,cy,n_true,n_false,scale=1):
        out=[]; r=8; gap=22; per=11
        total=n_true+n_false
        for i in range(total):
            col=i%per; row=i//per
            x=cx+col*gap; y=cy+row*gap
            c=ds.GOLD if i<n_true else RED
            out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>')
        return "".join(out)
    # Panel A: screening, 1-in-1000, 99/99 test -> 1 true : ~10 false = 9%
    ax=70; ay=y0+30
    s.append(ds.text(ax,ay-8,"SCREENING a low-risk population (1 in 1,000 has it)",size=12.5,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
    s.append(ds.text(ax,ay+10,"Of everyone who tests positive:",size=11,fill=ds.MUT,font=ds.BODY))
    s.append(dotrow(ax+8,ay+38,1,10))
    s.append(ds.text(ax+270,ay+30,"9%",size=40,fill=RED,font=ds.DISPLAY,weight="900",anchor="start"))
    s.append(ds.text(ax+340,ay+24,"actually have",size=12,fill=ds.INK,font=ds.BODY))
    s.append(ds.text(ax+340,ay+40,"the disease",size=12,fill=ds.INK,font=ds.BODY))
    s.append(ds.text(ax+8,ay+66,"1 true positive (gold)  ·  ~10 false positives (red)",size=10.5,fill=ds.MUT,font=ds.BODY))
    # Panel B: tested-for-a-reason, 1-in-10 -> ~92%
    by=ay+120
    s.append(ds.text(ax,by-6,"TESTING someone with symptoms (1 in 10 has it)",size=12.5,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
    s.append(ds.text(ax,by+12,"Of everyone who tests positive:",size=11,fill=ds.MUT,font=ds.BODY))
    # show ~12 dots: 11 true 1 false (92%)
    s.append(dotrow(ax+8,by+40,11,1))
    s.append(ds.text(ax+270,by+32,"92%",size=40,fill=GREEN,font=ds.DISPLAY,weight="900"))
    s.append(ds.text(ax+360,by+26,"actually have",size=12,fill=ds.INK,font=ds.BODY))
    s.append(ds.text(ax+360,by+42,"the disease",size=12,fill=ds.INK,font=ds.BODY))
    # takeaway band
    s.append(f'<rect x="28" y="{H-86}" width="{W-56}" height="34" rx="6" fill="{ds.CARD}" stroke="{ds.GOLD}" stroke-width="1.2"/>')
    s.append(ds.text(44,H-64,"Same test (99% sensitive, 99% specific). The only thing that changed is how common the disease is.",
                     size=12.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot)
    ds.render("".join(s), f"{FIG}/14-bayes-ppv.png")

# ---------------- CPR ACTION CARD ----------------
def cpr_card():
    W,H=720,640
    head,y0,foot=emerg_panel(W,H,"Emergency · cardiac arrest",
        "Hands-Only CPR","Unresponsive + not breathing normally → act now.",
        "AHA / Resuscitation guidelines · bystander CPR roughly doubles survival (10.5% vs 4.0%)")
    s=[head]; steps=[
        ("1","CALL","Phone emergency services (or send someone). Put it on speaker."),
        ("2","AED","Send someone for an AED if one is nearby."),
        ("3","PUSH","Center of chest. Hard & fast: 100–120/min, ~2 in (5 cm) deep, let it fully recoil."),
        ("4","DON'T STOP","Keep going until the AED arrives or they wake / move.")]
    y=y0+10
    for n,t,d in steps:
        s.append(f'<circle cx="50" cy="{y+14}" r="18" fill="{RED}"/>')
        s.append(ds.text(50,y+20,n,size=18,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
        s.append(ds.text(84,y+12,t,size=15,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(84,y+34,d,size=12.5,fill=ds.INK,font=ds.BODY))
        y+=78
    s.append(f'<rect x="28" y="{y+2}" width="{W-56}" height="40" rx="6" fill="{REDBG}" stroke="{RED}" stroke-width="1.2"/>')
    s.append(ds.text(44,y+27,"Tempo: push to the beat of “Stayin’ Alive” (~110 bpm). Untrained? Hands-only is enough.",
                     size=12,fill=RED,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/11-cpr-card.png")

# ---------------- BE-FAST STROKE CARD ----------------
def befast_card():
    W,H=940,560
    head,y0,foot=emerg_panel(W,H,"Emergency · stroke","Spot a Stroke — BE-FAST",
        "Any one of these, sudden → call emergency services immediately. Time is brain.",
        "Stroke recognition · treatment windows ~4.5 h (clot-buster) / ~24 h (thrombectomy)")
    s=[head]
    items=[("B","Balance","sudden loss of balance or coordination"),
           ("E","Eyes","sudden trouble seeing, one or both eyes"),
           ("F","Face","one side droops — ask them to smile"),
           ("A","Arms","one arm drifts down — ask them to raise both"),
           ("S","Speech","slurred or strange — ask them to repeat a phrase"),
           ("T","Time","note the time, call emergency services NOW")]
    cw=(W-56)/3; y=y0+10
    for i,(L,t,d) in enumerate(items):
        col=i%3; row=i//3; x=28+col*cw; yy=y+row*150
        s.append(f'<rect x="{x:.0f}" y="{yy}" width="{cw-16:.0f}" height="132" rx="8" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        bc = RED if L=="T" else ds.GOLD_D
        s.append(f'<circle cx="{x+34:.0f}" cy="{yy+34}" r="22" fill="{bc}"/>')
        s.append(ds.text(x+34,yy+42,L,size=24,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
        s.append(ds.text(x+66,yy+40,t,size=16,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        # wrap desc into <=2 lines
        words=d.split(); line1=""; line2=""
        for w in words:
            if len(line1)<26: line1=(line1+" "+w).strip()
            else: line2=(line2+" "+w).strip()
        s.append(ds.text(x+18,yy+78,line1,size=12,fill=ds.INK,font=ds.BODY))
        if line2: s.append(ds.text(x+18,yy+96,line2,size=12,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/12-befast-card.png")

# ---------------- MECHANISM CONVERGENCE ----------------
def mechanism_convergence():
    W,H=1000,620
    head,y0,foot=ds.panel(W,H,"First Principles · the mechanism bridge",
        "Many practices, few fundamental levers",
        "Every lever converges on the same handful of cellular controls.",
        "§Mechanism Bridge — practice → pathway → fundamental layer","mechanism-convergence")
    s=[head]
    practices=["Zone 2 / VO2max","Resistance training","Protein / leucine","Fasting / CR",
               "Sauna / heat","Cold exposure","Polyphenols","Sleep"]
    layers=[("Mitochondria / ATP","#1d6b2e"),("mTOR ↔ AMPK","#b08d3a"),
            ("Proteostasis (HSP, autophagy)","#3a6ea5"),("Redox / NRF2 signalling","#b5471f")]
    # left column practices, right column layers, gold links
    lx, rx = 70, W-330
    py0=y0+24; pgap=(H-110-py0)/(len(practices)-1)
    ly0=y0+50; lgap=(H-140-ly0)/(len(layers)-1)
    pos_p=[(lx,py0+i*pgap) for i in range(len(practices))]
    pos_l=[(rx,ly0+i*lgap) for i in range(len(layers))]
    # map practice -> layer index (which fundamental it most loads)
    mapidx=[0,1,1,2,2,0,3,2]
    for (px,py),li in zip(pos_p,mapidx):
        lxp,lyp=pos_l[li]
        s.append(f'<path d="M{px+150} {py} C {(px+lxp)/2} {py}, {(px+lxp)/2} {lyp}, {lxp-8} {lyp}" stroke="{layers[li][1]}" stroke-width="2" fill="none" opacity="0.55"/>')
    for (px,py),name in zip(pos_p,practices):
        s.append(f'<rect x="{px}" y="{py-15}" width="150" height="30" rx="6" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(ds.text(px+75,py+5,name,size=11.5,fill=ds.INK,font=ds.BODY,weight="600",anchor="middle"))
    for (lxp,lyp),(name,c) in zip(pos_l,layers):
        s.append(f'<rect x="{lxp}" y="{lyp-20}" width="250" height="40" rx="8" fill="{c}"/>')
        s.append(ds.text(lxp+125,lyp+5,name,size=13,fill="white",font=ds.DISPLAY,weight="700",anchor="middle"))
    s.append(ds.text(lx,H-58,"⚠ mechanism real ≠ human outcome proven — a chain to a fundamental layer still has to be shown in humans.",
                     size=11,fill=ds.WARN,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/18-mechanism-convergence.png")

if __name__=="__main__":
    bayes_ppv(); print("bayes ok")
    cpr_card(); print("cpr ok")
    befast_card(); print("befast ok")
    mechanism_convergence(); print("convergence ok")

def anaphylaxis_card():
    W,H=740,660
    head,y0,foot=emerg_panel(W,H,"Emergency · anaphylaxis","Severe Allergic Reaction",
        "Trouble breathing · swelling · hives + faint/vomit → act now.",
        "Allergy/immunology guidance · epinephrine is first-line and time-critical")
    s=[head]; steps=[
        ("1","EPINEPHRINE","Into the outer thigh — NOW. Don't wait to 'see if it passes'."),
        ("2","CALL","Emergency services. Say the word: anaphylaxis."),
        ("3","LIE FLAT","Legs raised. (Sit up only if breathing is hard.) Don't stand."),
        ("4","REPEAT","Second dose after ~5 min if no improvement."),
        ("5","GO TO ER","Even if they recover — reactions can rebound (biphasic).")]
    y=y0+8
    for n,t,d in steps:
        s.append(f'<circle cx="50" cy="{y+14}" r="17" fill="{RED}"/>')
        s.append(ds.text(50,y+20,n,size=17,fill="white",font=ds.DISPLAY,weight="900",anchor="middle"))
        s.append(ds.text(82,y+12,t,size=15,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(82,y+33,d,size=12.5,fill=ds.INK,font=ds.BODY))
        y+=74
    s.append(f'<rect x="28" y="{y}" width="{W-56}" height="40" rx="6" fill="{REDBG}" stroke="{RED}" stroke-width="1.2"/>')
    s.append(ds.text(44,y+25,"Antihistamines & inhalers are NOT a substitute for epinephrine.",size=12,fill=RED,font=ds.BODY,weight="700"))
    s.append(foot); ds.render("".join(s), f"{FIG}/13-anaphylaxis-card.png")

def emergency_wallet():
    W,H=1020,640
    head,y0,foot=emerg_panel(W,H,"Emergency · the one-card reference","Recognize → Act",
        "The handful that kill fast. Call emergency services first; this is the first move.",
        "Education only · CPR/AED & first aid — take a certified course")
    s=[head]
    items=[("Cardiac arrest","unresponsive and barely breathing","Hands-only CPR + AED. Push hard/fast."),
           ("Heart attack","chest pressure, arm/jaw, sweaty","Call 911. Aspirin if advised. Rest."),
           ("Stroke","face/arm/speech sudden — BE-FAST","Call 911 NOW. Note the time."),
           ("Anaphylaxis","breathing trouble + hives/swelling","Epinephrine to thigh, then 911."),
           ("Choking","can't breathe/speak, clutching throat","5 back-blows + 5 abdominal thrusts."),
           ("Severe bleeding","spurting / won't stop","Firm direct pressure; tourniquet if limb."),
           ("Opioid overdose","slow/no breathing, blue lips, pinpoint","Naloxone + 911 + rescue breaths."),
           ("Seizure","convulsing","Clear space, cushion head. Don't restrain/put anything in mouth.")]
    cols=2; cw=(W-2*70-30)/cols; ch=104; gx,gy=70,y0+14
    for i,(name,rec,act) in enumerate(items):
        r,c=divmod(i,cols); x=gx+c*(cw+30); yy=gy+r*(ch+14)
        s.append(f'<rect x="{x:.0f}" y="{yy}" width="{cw:.0f}" height="{ch}" rx="9" fill="{ds.CARD}" stroke="{ds.RULE}" stroke-width="1.2"/>')
        s.append(f'<rect x="{x:.0f}" y="{yy}" width="6" height="{ch}" rx="3" fill="{RED}"/>')
        s.append(ds.text(x+20,yy+28,name,size=14,fill=ds.INK2,font=ds.DISPLAY,weight="800"))
        s.append(ds.text(x+20,yy+50,"see: "+rec,size=10.5,fill=ds.MUT,font=ds.BODY,italic=True))
        s.append(ds.text(x+20,yy+78,act,size=11.5,fill=ds.INK,font=ds.BODY,weight="600"))
    s.append(foot); ds.render("".join(s), f"{FIG}/19-emergency-wallet.png")

if "wallet_run" not in dir():
    anaphylaxis_card(); print("anaphylaxis ok")
    emergency_wallet(); print("wallet ok")
