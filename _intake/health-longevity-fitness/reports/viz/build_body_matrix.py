#!/usr/bin/env python3
"""BODY cluster — matrices (variants, neurotransmitters, immune ladder, telomere grading,
skincare, STIs, gynecologic, innate components). SVG via ds."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
GRN="#1d6b2e"; GRN2="#2f8a4b"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; AMB="#8a6d12"; WARN="#b5471f"; DKR="#6b1f12"; MUT=ds.MUT
C={"do":GRN,"proven":GRN,"strong":GRN2,"rct":GRN2,"cohort":AMB,"helps":AMB,"narrow":AMB,"cond":AMB,
   "hype":WARN,"weak":WARN,"null":WARN,"animal":"#c2693a","invitro":"#a05a2c","spec":"#7a6f5a",
   "harm":DKR,"none":DKR,"curable":GRN2,"manage":AMB,"vaccine":GRN}

def matrix(name,kicker,title,sub,src,claim,headers,rows,xs,badge=True):
    W=1000; H=92+len(rows)*46+64
    head,y0,foot=ds.panel(W,H,kicker,title,sub,src,claim)
    s=[head]
    for h,x in zip(headers,xs):
        s.append(ds.text(x,y0+2,h,size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,row in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        *cols,last=row
        for j,(c,x) in enumerate(zip(cols,xs)):
            s.append(ds.text(x,yy+rh/2+4,c,size=(12 if j==0 else 10.6),fill=ds.INK,font=ds.BODY,weight=("700" if j==0 else None)))
        if badge:
            lab,col=last
            b,_=ds.badge(xs[-1],yy+rh/2-9,lab,col,h=18,size=8.3); s.append(b)
        else:
            s.append(ds.text(xs[-1],yy+rh/2+4,last,size=10.6,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s), f"{FIG}/{name}")

# 1. actionable variants (4-col + grade badge)
matrix("BX1-actionable-variants.png","Genetics · the few that matter","7 gene findings that actually change a decision",
  "Index-all, grade-all. These move screening, drugs, or surgery — unlike the SNP-chip noise.","§18 §A.2","actionable-variants-matrix",
  ["GENE","WHAT IT IS","WHY IT MATTERS","GRADE"],
  [("APOE-ε4","Alzheimer's risk allele","gene-dose dementia + CVD risk",("COHORT",C["cohort"])),
   ("Lp(a)","inherited lipoprotein(a)","2–4× ASCVD; measure once in life",("STRONG",C["strong"])),
   ("Pharmacogenes","CYP2C19 / 2D6 / DPYD…","clopidogrel, SSRIs, chemo dosing",("RCT",C["rct"])),
   ("BRCA1/2","tumor-suppressor genes","breast/ovarian; screening + surgery",("STRONG",C["strong"])),
   ("HFE","hereditary hemochromatosis","iron overload — phlebotomy cures it",("STRONG",C["strong"])),
   ("FOXO3","longevity-associated","real signal, too small to act on",("WEAK",C["weak"])),
   ("MTHFR","folate-cycle enzyme","overhyped; rarely actionable",("WEAK",C["weak"]))],
  [40,250,540,850])

# 2. neurotransmitters (3 text cols, no badge)
matrix("BX2-neurotransmitters.png","Nervous system · §3","Neurotransmitters — what they do vs the pop myth",
  "Each real signalling role next to the folk-neuroscience it gets flattened into.","§14 §3","neurotransmitter-matrix",
  ["TRANSMITTER","WHAT IT ACTUALLY DOES","THE POP ERROR"],
  [("Glutamate","Main excitatory NT; learning & memory (LTP)","“the toxic food additive”"),
   ("GABA","Main inhibitory; calm, sleep, anxiety brake","“take GABA pills to relax” (barely crosses BBB)"),
   ("Dopamine","Motivation, prediction-error, movement","“the pleasure molecule”"),
   ("Serotonin","Mood, gut, sleep — ~90% lives in the gut","“low serotonin = depression”"),
   ("Acetylcholine","Attention, memory, muscle activation","“just a memory chemical”"),
   ("Norepinephrine","Alertness, focus, fight-or-flight","“the same as adrenaline”"),
   ("Endorphins","Endogenous opioids; pain & stress relief","“the runner's high” (mostly endocannabinoids)")],
  [40,330,690],badge=False)

# 3. immune-modulator ladder
matrix("BX3-immune-ladder.png","Immune system · regulate ≠ boost","Immune modulators — what survives the evidence",
  "“Boosting” is the category error. The proven moves regulate; the marketed ones do nothing.","§15 §4/§7","immune-modulator-ladder",
  ["INTERVENTION","WHAT THE EVIDENCE SHOWS","VERDICT"],
  [("Vaccines","RCT + population — the strongest tool",("PROVEN",C["proven"])),
   ("Sleep · exercise · nutrition","robust; the actual immune levers",("PROVEN",C["proven"])),
   ("Correct a deficiency (zinc/D/iron)","helps only if you are deficient",("CONDITIONAL",C["cond"])),
   ("Zinc / vit C at symptom onset","small, narrow effect on colds",("WEAK",C["weak"])),
   ("Echinacea / “immune blends”","null in controlled trials",("NO EFFECT",C["null"])),
   ("IV vitamin drips · cleanses","no evidence; marketing",("NO EVIDENCE",C["none"])),
   ("“Immune boosters” as a class","a boosted immune system = autoimmunity",("REGULATE, NOT BOOST",C["harm"]))],
  [40,330,850])

# 4. telomere lengthening grading
matrix("BX4-telomere-grading.png","Telomeres · §16.4","“Telomere-lengthening” — graded honestly",
  "Every row is surrogate-only or conflicted. None has shown a health outcome.","§16 §16.4","telomere-lengthening-grading",
  ["APPROACH","WHAT IT ACTUALLY SHOWED","TIER"],
  [("TA-65 (telomerase activator)","small surrogate ↑, conflicted, no outcome",("IN-VITRO/N=1",C["invitro"])),
   ("Meditation / lifestyle (Ornish)","tiny, uncontrolled, surrogate marker",("WEAK",C["weak"])),
   ("Exercise","associated with longer telomeres",("COHORT (PREDICTOR)",C["cohort"])),
   ("Telomerase gene therapy","lifespan ↑ — in mice only",("ANIMAL",C["animal"])),
   ("“Lengthening” as anti-aging","no human outcome; cancer-risk concern",("SPECULATIVE",C["spec"]))],
  [40,330,850])

# 5. skincare hierarchy
matrix("BX5-skincare-hierarchy.png","Skin · §11 §1.5","The honest skincare hierarchy",
  "Two RCT-backed actives do almost all the work; the expensive serums do the least.","§11 §1.5","skincare-hierarchy",
  ["PRODUCT","WHAT THE EVIDENCE SHOWS","VERDICT"],
  [("Sunscreen (daily)","RCT: less photoaging + skin cancer",("DO THIS",C["do"])),
   ("Retinoid (tretinoin)","RCT: collagen, fine lines, texture",("DO THIS",C["do"])),
   ("Moisturizer","real barrier + comfort benefit",("HELPS",C["helps"])),
   ("Vitamin C / niacinamide","modest but real",("HELPS A BIT",C["helps"])),
   ("Collagen drinks","weak, mixed evidence",("HYPE",C["hype"])),
   ("“Stem-cell” / peptide serums","marketing well ahead of data",("HYPE",C["hype"])),
   ("Tanning beds","Group-1 carcinogen",("NET HARM",C["harm"]))],
  [40,330,850])

# 6. STI matrix (4-col + status badge)
matrix("BX6-sti-matrix.png","Reproductive · §42 §6.1","STIs at a glance",
  "Most are curable or preventable — the headline is: screen, treat, and vaccinate for HPV.","§42 §6.1","sti-matrix",
  ["INFECTION","AGENT","KEY FACT","STATUS"],
  [("Chlamydia","bacteria","often silent — screen yearly if at risk",("CURABLE",C["curable"])),
   ("Gonorrhea","bacteria","drug resistance rising",("CURABLE",C["curable"])),
   ("Syphilis","bacteria","resurging; treat by stage",("CURABLE",C["curable"])),
   ("HIV","virus","U=U; PrEP prevents it",("MANAGEABLE",C["manage"])),
   ("HPV","virus","causes 6 cancers — vaccinate",("VACCINE-PREV.",C["vaccine"])),
   ("Herpes (HSV)","virus","very common; suppressible",("MANAGEABLE",C["manage"])),
   ("Trichomonas","parasite","most common curable STI",("CURABLE",C["curable"]))],
  [40,250,470,850])

# 7. gynecologic disorders (3 text cols)
matrix("BX7-gynecologic.png","Reproductive · §42 §2.2","Gynecologic disorders — what they are, what to do",
  "Common, under-discussed, and treatable — each with an honest first-line lever.","§42 §2.2","gynecologic-matrix",
  ["CONDITION","WHAT IT IS","FIRST-LINE LEVER"],
  [("PCOS","metabolic + ovulatory; #1 infertility cause","weight, metformin, ovulation induction"),
   ("Endometriosis","uterine-type tissue outside the uterus","laparoscopy dx; hormonal suppression"),
   ("Uterine fibroids","benign smooth-muscle tumors","watch → meds → procedures by symptoms"),
   ("PMDD","severe luteal-phase mood disorder","SSRIs and/or hormonal suppression"),
   ("Abnormal uterine bleeding","heavy/irregular menses","rule out cancer; structured workup"),
   ("Adenomyosis","endometrium within the muscle wall","hormonal; hysterectomy is definitive")],
  [40,330,690],badge=False)

# 8. innate immune components (3 text cols)
matrix("BX8-innate-components.png","Immune system · §1.1","The innate immune system — and how it ages",
  "The fast, fixed, no-memory first line — every part of it drifts with age (immunosenescence).","§15 §1.1","innate-components-matrix",
  ["COMPONENT","WHAT IT DOES","HOW IT AGES"],
  [("Barriers (skin, mucosa)","the first physical/chemical wall","thinner, drier, slower to repair"),
   ("Neutrophils","first responders; phagocytosis","impaired chemotaxis & killing"),
   ("Macrophages","eat, present, clean up","dysregulated, more inflammatory"),
   ("Dendritic cells","bridge innate → adaptive","weaker priming of T cells"),
   ("NK cells","kill infected & tumor cells","function declines"),
   ("Complement","tags microbes, punches holes","dysregulated activation")],
  [40,330,690],badge=False)

print("rendered 8 body matrices (BX1-BX8)")
