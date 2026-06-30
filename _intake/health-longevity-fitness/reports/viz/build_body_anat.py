#!/usr/bin/env python3
"""BODY anatomicals & schematics (neuron, nephron, end-replication, telomere, CNS/PNS,
nociception, oral-systemic, osteosarcopenia, HPG, ED-cardiac, senescence, telomere-clock)."""
import os, sys, math; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
INK=ds.INK; PAPER=ds.PAPER; CARD="#fbf8ef"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; MUT=ds.MUT; RULE=ds.RULE
GRN="#1d6b2e"; GRN2="#2f8a4b"; WARN="#b5471f"; BLUE="#3a6ea5"; AMB="#8a6d12"; DKR="#6b1f12"
ARROW='<defs><marker id="bk" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#1c1a17"/></marker><marker id="wn" markerWidth="12" markerHeight="12" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,4 L0,8 Z" fill="#b5471f"/></marker></defs>'
def box(x,y,w,h,label,fill=CARD,stroke=GOLDD,tcol=INK,sz=12.5):
    s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    for j,ln in enumerate(label.split("\n")): s+=ds.text(x+w/2,y+h/2+5+(j-(len(label.split(chr(10)))-1)/2)*15,ln,size=sz,fill=tcol,font=ds.DISPLAY,weight="700",anchor="middle")
    return s
def harrow(x0,x1,y,c="bk"): return f'<line x1="{x0}" y1="{y}" x2="{x1-4}" y2="{y}" stroke="{"#1c1a17" if c=="bk" else "#b5471f"}" stroke-width="3" marker-end="url(#{c})"/>'
def lab(x,y,t,c=INK,sz=11,a="middle",w=None): return ds.text(x,y,t,size=sz,fill=c,font=ds.BODY,weight=w,anchor=a)
def flow(name,k,t,sub,src,claim,steps,note=None,W=1000,H=330,arr=None):
    head,cy,foot=ds.panel(W,H,k,t,sub,src,claim); s=[head,ARROW]
    n=len(steps); bw=(W-80-(n-1)*((W-80)*0.06))/n; gap=(W-80)*0.06
    for i,st in enumerate(steps):
        lab_,c=st if len(st)==2 else (st[0],GOLDD)
        x=40+i*(bw+gap); s.append(box(x,cy+34,bw,68,lab_,stroke=c,tcol=(c if c in (WARN,GRN) else INK)))
        if i<n-1: s.append(harrow(x+bw,x+bw+gap,cy+68))
        if arr and i<len(arr) and arr[i]: s.append(ds.text(x+bw+gap/2,cy+28,arr[i],size=9,fill=WARN,font=ds.MONO,weight="bold",anchor="middle"))
    if note: s.append(ds.text(W/2,cy+150,note,size=11.5,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/{name}")

# 1. Neuron + AP schematic
def neuron():
    W,H=1000,480
    head,cy,foot=ds.panel(W,H,"Nervous System · §14 §1.2","The neuron — and how it fires",
        "Signals run dendrites → soma → axon → terminals. The action potential is an all-or-nothing ion wave down the axon.","§14 §1.2","neuron-schematic")
    s=[head]; my=cy+95; sx=230
    # dendrites
    for a in (-0.9,-0.5,0,0.5,0.9):
        ex=sx-70+math.cos(math.pi+a)*0; s.append(f'<line x1="{sx-30}" y1="{my}" x2="{sx-120}" y2="{my+a*70:.0f}" stroke="{INK}" stroke-width="4"/>')
        s.append(f'<line x1="{sx-120}" y1="{my+a*70:.0f}" x2="{sx-150}" y2="{my+a*95:.0f}" stroke="{INK}" stroke-width="2.5"/>')
    s.append(f'<circle cx="{sx}" cy="{my}" r="34" fill="{CARD}" stroke="{GOLDD}" stroke-width="3"/>')
    s.append(f'<circle cx="{sx}" cy="{my}" r="13" fill="{AMB}" opacity="0.5"/>')
    # axon
    ax1=sx+34; ax2=820; s.append(f'<line x1="{ax1}" y1="{my}" x2="{ax2}" y2="{my}" stroke="{INK}" stroke-width="6"/>')
    for i in range(4):
        mx=ax1+40+i*150; s.append(f'<ellipse cx="{mx+50}" cy="{my}" rx="48" ry="15" fill="{BLUE}" opacity="0.22" stroke="{BLUE}" stroke-width="1.5"/>')
    # terminals
    for a in (-0.7,0,0.7):
        s.append(f'<line x1="{ax2}" y1="{my}" x2="{ax2+60}" y2="{my+a*55:.0f}" stroke="{INK}" stroke-width="4"/>')
        s.append(f'<circle cx="{ax2+66}" cy="{my+a*55:.0f}" r="7" fill="{GRN2}"/>')
    for x,t in [(sx-135,"dendrites\n(receive)"),(sx,"soma (nucleus)"),(ax1+130,"axon + myelin (saltatory conduction)"),(ax2+30,"terminals\n(release NT)")]:
        for j,ln in enumerate(t.split("\n")): s.append(lab(x,my+118+j*15,ln,MUT,11))
    s.append(f'<rect x="120" y="{my+158}" width="{W-240}" height="40" rx="9" fill="#f1ead8"/>')
    s.append(ds.text(W/2,my+183,"Action potential: −70 mV rest → threshold → Na⁺ in (+40 spike) → K⁺ out (repolarize) → refractory",size=11.5,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/A01-neuron.png")

# 2. Nephron schematic
def nephron():
    W,H=1000,470
    head,cy,foot=ds.panel(W,H,"Renal System · §17 §2.1","The nephron — the kidney's filter unit",
        "~1 million per kidney. Blood is filtered at the glomerulus, then the tubule reclaims what the body needs. The 'silent organ' — lose half before symptoms.","§17 §2.1","nephron-schematic")
    s=[head]; gy=cy+90
    s.append(f'<circle cx="180" cy="{gy}" r="40" fill="none" stroke="{WARN}" stroke-width="3"/>')
    s.append('<path d="M150 '+str(gy-20)+' q 20 -18 40 0 q 18 16 0 34 q -22 16 -40 0 q -16 -16 0 -34 Z" fill="'+WARN+'" opacity="0.25"/>')
    s.append(lab(180,gy+62,"glomerulus +",MUT,11)); s.append(lab(180,gy+76,"Bowman's capsule",MUT,11))
    s.append(lab(180,gy-52,"FILTER",WARN,12,w="bold"))
    # tubule path
    s.append(f'<path d="M220 {gy} H 360 V {gy+140} H 460 V {gy} H 600 q 40 0 40 40 V {gy+160}" fill="none" stroke="{BLUE}" stroke-width="7"/>')
    s.append(lab(310,gy-14,"proximal tubule",MUT,11))
    s.append(lab(410,gy+155,"loop of Henle",MUT,11))
    s.append(lab(560,gy-14,"distal tubule",MUT,11))
    s.append(lab(700,gy+120,"collecting duct → urine",MUT,11,a="start"))
    s.append(box(720,cy+10,230,56,"RECLAIM\nwater, glucose, salts",fill="#eef4ec",stroke=GRN,tcol=GRN,sz=12))
    s.append(ds.text(W/2,H-46,"Filtration (eGFR) is the headline number — it declines ~1 unit/year after 40, silently.",size=11.5,fill=INK,font=ds.BODY,anchor="middle"))
    s.append(foot); ds.render("".join(s),f"{FIG}/A02-nephron.png")

# 3. End-replication problem
def end_replication():
    W,H=1000,420
    head,cy,foot=ds.panel(W,H,"Telomeres · §16.1.2","The end-replication problem",
        "DNA's copying machinery can't finish the very end of the lagging strand — so a sliver is lost every division. That's why telomeres shorten.","§16 §16.1.2","end-replication-problem")
    s=[head]; y1=cy+50; y2=cy+92
    s.append(f'<line x1="80" y1="{y1}" x2="820" y2="{y1}" stroke="{GRN}" stroke-width="6"/>')
    s.append(lab(80,y1-12,"leading strand — copied continuously →",GRN,11,a="start"))
    for i in range(5):
        x=120+i*135; s.append(f'<line x1="{x}" y1="{y2}" x2="{x+110}" y2="{y2}" stroke="{BLUE}" stroke-width="6"/>')
        s.append(f'<rect x="{x}" y="{y2-4}" width="22" height="8" fill="{AMB}"/>')
    s.append(lab(80,y2+24,"lagging strand — Okazaki fragments + RNA primers (gold)",BLUE,11,a="start"))
    s.append(f'<rect x="780" y="{y2-10}" width="40" height="20" fill="{WARN}" opacity="0.3"/>')
    s.append(f'<line x1="800" y1="{y2-30}" x2="800" y2="{y2-12}" stroke="{WARN}" stroke-width="2" marker-end="url(#wn)"/>')
    s.append(lab(800,y2-38,"terminal gap — can't be filled = lost each division",WARN,11))
    s.append(ds.text(W/2,H-58,"Telomeres are a sacrificial buffer: they shorten so the genes don't. Run them out → senescence.",size=11.5,fill=GRN,font=ds.BODY,italic=True,anchor="middle"))
    s.append(ARROW+foot); ds.render("".join(s),f"{FIG}/A03-end-replication.png")

# 4. Telomere cap + telomerase
def telomere_cap():
    W,H=1000,420
    head,cy,foot=ds.panel(W,H,"Telomeres · §16.1","The telomere cap — and telomerase",
        "Chromosome ends are capped with TTAGGG repeats + shelterin, tucked into a protective loop. Telomerase can re-extend them — mostly OFF in adult cells (ON in ~90% of cancers).","§16 §16.1","telomere-cap")
    s=[head]; my=cy+90
    # chromosome
    s.append(f'<line x1="120" y1="{my}" x2="520" y2="{my}" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>')
    s.append(lab(300,my-22,"chromosome (genes)",MUT,11))
    # telomere repeats (zigzag)
    zz="".join([f'L {520+i*18} {my+(8 if i%2 else -8)} ' for i in range(10)])
    s.append(f'<path d="M520 {my} {zz}" fill="none" stroke="{GOLDD}" stroke-width="4"/>')
    s.append(lab(610,my-22,"TTAGGG repeats + shelterin",GOLDD,11))
    s.append(f'<ellipse cx="740" cy="{my}" rx="30" ry="20" fill="none" stroke="{INK}" stroke-width="3"/>')
    s.append(lab(740,my+40,"t-loop (cap)",MUT,11))
    s.append(box(640,cy+150,300,46,"telomerase (TERT + TERC RNA)",fill="#eef4ec",stroke=GRN,tcol=GRN,sz=11))
    s.append(f'<line x1="790" y1="{cy+150}" x2="760" y2="{my+22}" stroke="{GRN}" stroke-width="2" stroke-dasharray="3 4"/>')
    s.append(lab(W/2,H-46,"germ cells, stem cells, and cancers keep telomerase ON — most adult cells don't.",INK,11.5))
    s.append(foot); ds.render("".join(s),f"{FIG}/A04-telomere-cap.png")

# 5. CNS vs PNS
def cns_pns():
    W,H=1000,360
    head,cy,foot=ds.panel(W,H,"Nervous System · §14 §1.1","CNS vs PNS — and the regrowth asymmetry",
        "The brain & spinal cord (CNS) essentially don't regenerate; peripheral nerves (PNS) regrow ~1 mm/day. Same cells, different rules.","§14 §1.1","cns-vs-pns")
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(70,cy+20,360,52,"CNS — brain + spinal cord",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Does NOT meaningfully regenerate","Inhibitory environment, glial scar","Why cord injury & stroke damage persists"]):
        s.append(lab(86,cy+104+i*30,"• "+t,INK,12,a="start"))
    s.append(box(W-430,cy+20,360,52,"PNS — peripheral nerves",fill="#eef4ec",stroke=GRN,tcol=GRN))
    for i,t in enumerate(["CAN regrow ~1 mm/day","Schwann cells guide regrowth","Why a cut finger nerve can recover"]):
        s.append(lab(W-414,cy+104+i*30,"• "+t,INK,12,a="start"))
    s.append(foot); ds.render("".join(s),f"{FIG}/A05-cns-pns.png")

# 6-12 flows
def nociception():
    flow("A06-nociception.png","Nervous System · §14 §6.1","Nociception is not pain",
         "A danger signal travels up; the BRAIN decides whether to construct pain — and can amplify or suppress it.","§14 §6.1","nociception-not-pain",
         [("Nociceptor\n(tissue danger)",GOLDD),("Spinal cord\n(gate)",GOLDD),("Brain\nCONSTRUCTS pain",WARN),("Descending\nmodulation",GRN)],
         note="Pain without injury and injury without pain both happen — placebo/naloxone prove the modulation is real.")
def oral_systemic():
    flow("A07-oral-systemic.png","Lived-In Body · §11 §2","The mouth is connected to the body",
         "Gum disease is linked to several systemic conditions — but only the diabetes link is a proven two-way lever.","§11 §2","oral-systemic-links",
         [("Periodontitis\n(gum disease)",WARN),("Bacteria +\ninflammation",AMB),("Diabetes (proven\n2-way lever)",GRN),("CVD / dementia\n(assoc., unproven)",AMB)],
         note="Treating gum disease improves HbA1c (proven). The CVD/dementia links are real associations, levers unproven.")
def osteosarcopenia():
    flow("A08-osteosarcopenia.png","Bone & Muscle · §11 §3.5","Osteosarcopenia — bone & muscle fail together",
         "They share drivers and a single best lever. Losing both compounds the fall-fracture-mortality risk.","§11 §3.5","osteosarcopenia",
         [("Shared drivers\n(inactivity, low protein)",AMB),("Bone loss +\nmuscle loss",WARN),("Falls → fracture",WARN),("Lever: load +\nprotein",GRN)],
         note="Resistance training + adequate protein is the one intervention that hits both at once.")
def hpg():
    W,H=1000,409
    head,cy,foot=ds.panel(W,H,"Reproductive · §42 §1","Male steady set-point vs female monthly oscillator",
        "Same HPG hardware (GnRH → LH/FSH → gonad), two control modes: a stable male band vs an engineered ~28-day female cycle with a positive-feedback LH surge.","§42 §1","hpg-male-vs-female")
    s=[head]; midx=W/2
    s.append(f'<line x1="{midx}" y1="{cy+10}" x2="{midx}" y2="{H-50}" stroke="{RULE}" stroke-width="1.5"/>')
    s.append(box(70,cy+20,360,50,"MALE — steady set-point",fill="#eef4ec",stroke=BLUE,tcol=BLUE))
    for i,t in enumerate(["GnRH → LH/FSH → testosterone","Negative feedback holds a steady band","Gradual ~1%/yr decline with age"]):
        s.append(lab(86,cy+104+i*30,"• "+t,INK,12,a="start"))
    s.append(box(W-430,cy+20,360,50,"FEMALE — ~28-day oscillator",fill="#f6ece6",stroke=WARN,tcol=WARN))
    for i,t in enumerate(["Same axis, but a built-in cycle","Mid-cycle POSITIVE feedback → LH surge","Finite egg supply → menopause"]):
        s.append(lab(W-414,cy+104+i*30,"• "+t,INK,12,a="start"))
    s.append(foot); ds.render("".join(s),f"{FIG}/A09-hpg.png")
def ed_cardiac():
    flow("A10-ed-cardiac.png","Reproductive · §42 §6.2","Erectile dysfunction is a cardiovascular warning light",
         "Penile arteries are small and clog first — so ED often precedes a heart attack by years. It's a trigger for a cardiac work-up.","§42 §6.2","ed-cardiovascular",
         [("Endothelial\ndysfunction",AMB),("Small penile\narteries clog first",WARN),("ED appears\n(years early)",WARN),("Work up the\nHEART",GRN)],
         note="New ED in a man over 40 warrants a cardiovascular work-up alongside any prescription.")
def senescence():
    flow("A11-senescence-triggers.png","Telomeres · §16.5","Senescence has many entrances — telomeres are just one",
         "Cells stop dividing for several reasons; all converge on the same arrest program and inflammatory secretome.","§16 §16.5","senescence-triggers",
         [("Telomere attrition\n· oncogenes · DNA damage",AMB),("p16 / p53\narrest",WARN),("Senescent cell",WARN),("SASP\n(inflammatory)",DKR)],
         note="Senolytics aim to clear these cells — promising in animals, still experimental in humans.")
def telomere_clock():
    flow("A12-telomere-clock.png","Telomeres · §16.1.4","Telomere clock → the Hayflick limit",
         "Each division trims the telomere; run it out and the uncapped end triggers a damage response that stops the cell.","§16 §16.1.4","telomere-clock-hayflick",
         [("Each division\nshortens telomere",GOLDD),("Uncapped\nend",AMB),("DNA-damage\nresponse (p53/p21)",WARN),("Replicative\nsenescence",DKR)],
         note="~40–60 doublings for human fibroblasts — the Hayflick limit. A brake against runaway division (anti-cancer).")

if __name__=="__main__":
    for fn in [neuron,nephron,end_replication,telomere_cap,cns_pns,nociception,oral_systemic,osteosarcopenia,hpg,ed_cardiac,senescence,telomere_clock]:
        fn(); print(fn.__name__,"ok")
