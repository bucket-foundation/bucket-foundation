#!/usr/bin/env python3
"""PRACTICE cluster — matrices (CYP450, pharmacogenomics, lab categories, trisomies,
skin-cancer gradient, multimodal pain)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
GRN="#1d6b2e"; GRN2="#2f8a4b"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; AMB="#8a6d12"; WARN="#b5471f"; DKR="#6b1f12"
C={"strong":GRN,"mod":AMB,"helps":GRN,"abit":AMB,"low":WARN,"avoid":DKR,"high":WARN,"high2":DKR}
def matrix(name,kicker,title,sub,src,claim,headers,rows,xs,badge=True):
    W=1000; H=92+len(rows)*46+64
    head,y0,foot=ds.panel(W,H,kicker,title,sub,src,claim); s=[head]
    for h,x in zip(headers,xs): s.append(ds.text(x,y0+2,h,size=9.3,fill=GOLDD,font=ds.DISPLAY,weight="bold"))
    ry=y0+18; rh=(H-58-ry)/len(rows)
    for i,row in enumerate(rows):
        yy=ry+i*rh
        if i%2==0: s.append(f'<rect x="32" y="{yy}" width="{W-64}" height="{rh}" fill="#f6f1e4"/>')
        *cols,last=row
        for j,(c,x) in enumerate(zip(cols,xs)):
            s.append(ds.text(x,yy+rh/2+4,c,size=(12 if j==0 else 10.4),fill=ds.INK,font=ds.BODY,weight=("700" if j==0 else None)))
        if badge:
            l2,col=last; b,_=ds.badge(xs[-1],yy+rh/2-9,l2,col,h=18,size=8.2); s.append(b)
        else: s.append(ds.text(xs[-1],yy+rh/2+4,last,size=10.4,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/{name}")

matrix("PX1-cyp450.png","Pharmacology · §28 §A.2.3","The CYP450 enzymes — where drug interactions happen",
  "Most interactions route through four liver enzymes. Grapefruit and St John's Wort are the classic food/herb culprits.","§28 §A.2.3","cyp450-matrix",
  ["ENZYME","KEY SUBSTRATES","STRONG INHIBITORS","INDUCERS"],
  [("CYP3A4/5","~50% of drugs; statins, CCBs","grapefruit, azoles, ritonavir","rifampin, carbamazepine, SJW"),
   ("CYP2D6","codeine, tamoxifen, many psych","fluoxetine, paroxetine, bupropion","(few clinically)"),
   ("CYP2C19","clopidogrel, PPIs, some SSRIs","omeprazole, fluvoxamine","rifampin"),
   ("CYP2C9","warfarin, phenytoin, NSAIDs","amiodarone, fluconazole","rifampin")],
  [40,300,560,800],badge=False)

matrix("PX2-pharmacogenomics.png","Pharmacology · §28 §C.3","Pharmacogenomics — genes that change the prescription",
  "A handful of gene-drug pairs are actionable today: the genotype tells you the dose, or to avoid the drug entirely.","§28 §C.3","pharmacogenomics-grid",
  ["GENE / DRUG","WHAT THE VARIANT DOES","CLINICAL ACTION","TIER"],
  [("CYP2C19 / clopidogrel","poor metabolizer → no activation","use prasugrel / ticagrelor",("STRONG",C["strong"])),
   ("CYP2D6 / codeine","ultra-rapid → morphine overdose","avoid codeine",("STRONG",C["strong"])),
   ("TPMT-NUDT15 / thiopurines","poor → marrow toxicity","reduce dose",("STRONG",C["strong"])),
   ("DPYD / 5-FU","deficiency → severe toxicity","reduce or avoid",("STRONG",C["strong"])),
   ("HLA-B*57:01 / abacavir","hypersensitivity reaction","don't prescribe if positive",("STRONG",C["strong"])),
   ("CYP2C9+VKORC1 / warfarin","dosing variance","genotype-guided dose",("MODERATE",C["mod"])),
   ("SLCO1B1 / simvastatin","↑ myopathy risk","lower dose / alt statin",("MODERATE",C["mod"]))],
  [40,300,580,850])

matrix("PX3-lab-categories.png","Lab Medicine · §41 §B.1","Reading your bloodwork — by category",
  "What each panel actually tells you, and the honest caveat. Trends beat single snapshots; many 'normals' aren't.","§41 §B.1","lab-category-map",
  ["CATEGORY","CORE TESTS","THE HONEST CAVEAT"],
  [("Metabolic (CMP)","Na, K, glucose, creatinine","a snapshot — trends matter more"),
   ("Lipids","LDL-C, apoB, Lp(a)","apoB beats LDL-C; measure Lp(a) once"),
   ("Glycemic","HbA1c, fasting glucose, insulin","insulin/HOMA-IR rises years earlier"),
   ("Blood count (CBC)","hemoglobin, WBC, platelets","wide normal range; context-dependent"),
   ("Liver (LFTs)","ALT, AST, ALP, bilirubin","'liver tests' aren't liver-specific"),
   ("Kidney","creatinine, eGFR, cystatin C","muscle mass skews creatinine"),
   ("Inflammatory","hsCRP, ESR","predictors of risk"),
   ("Tumor markers","PSA, CA-125, CEA","poor screens; for monitoring known disease")],
  [40,330,640],badge=False)

matrix("PX4-trisomies.png","Pediatric · §43 §1.2","Chromosomal disorders at a glance",
  "Whole-chromosome changes; outcomes range from near-normal life with care to lethal in infancy.","§43 §1.2","trisomies-matrix",
  ["CONDITION","GENETICS","KEY FEATURES","PROGNOSIS"],
  [("Down syndrome","trisomy 21 (1/700)","intellectual disability, heart defects","life exp ~25→60 yr with care"),
   ("Turner syndrome","45,X","short stature, ovarian failure","near-normal lifespan with care"),
   ("Klinefelter","47,XXY","tall, low testosterone, infertility","normal lifespan"),
   ("Edwards syndrome","trisomy 18","severe multi-organ malformation","usually fatal in infancy"),
   ("Patau syndrome","trisomy 13","severe malformations","usually fatal in infancy")],
  [40,250,500,790],badge=False)

matrix("PX5-skin-cancer.png","Dermatology · §27 §A.5","The three skin cancers — common vs deadly",
  "Frequency and danger run in opposite directions: the commonest rarely kills; the rarest causes most deaths.","§27 §A.5","skin-cancer-gradient",
  ["CANCER","FREQUENCY","BEHAVIOR","LETHALITY"],
  [("Basal cell (BCC)","most common","almost never metastasizes",("LOW",C["mod"])),
   ("Squamous cell (SCC)","2nd most common","can metastasize",("MODERATE",C["high"])),
   ("Melanoma","~1% of skin cancers","metastasizes readily",("MOST DEATHS",C["high2"]))],
  [40,300,560,850])

matrix("PX6-pain-multimodal.png","Pain · §21 §5.5","Chronic pain — what helps vs what doesn't",
  "No single big lever; several modest ones stacked. Passive treatments, routine scans and opioids are low-value or harmful.","§21 §5.5","pain-multimodal-stack",
  ["LEVER","WHAT THE EVIDENCE SHOWS","VERDICT"],
  [("Exercise / graded movement","the strongest single lever",("HELPS",C["helps"])),
   ("Pain education (understand pain)","cuts fear & disability",("HELPS",C["helps"])),
   ("CBT / ACT","modest but real",("HELPS",C["helps"])),
   ("Sleep + stress management","poor sleep amplifies pain",("HELPS",C["helps"])),
   ("Targeted non-opioid meds","modest, time-limited",("HELPS A BIT",C["abit"])),
   ("Passive treatments (ultrasound, etc.)","little durable benefit",("LOW VALUE",C["low"])),
   ("Routine imaging","finds noise, drives surgery",("LOW VALUE",C["low"])),
   ("Long-term opioids","harm outweighs benefit",("AVOID",C["avoid"]))],
  [40,360,850])

print("rendered 6 practice matrices (PX1-PX6)")
