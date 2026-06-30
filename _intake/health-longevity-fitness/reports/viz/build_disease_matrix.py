#!/usr/bin/env python3
"""DISEASE cluster — matrices (psychiatric, MAT/MOUD, pathogen classes, cancer screening, chronic viral)."""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
GRN="#1d6b2e"; GRN2="#2f8a4b"; GOLD=ds.GOLD; GOLDD=ds.GOLD_D; AMB="#8a6d12"; WARN="#b5471f"; DKR="#6b1f12"
C={"rct":GRN2,"strong":GRN,"behav":AMB,"manage":AMB,"curable":GRN2,"prevent":GRN,"vaccine":GRN,"none":DKR}
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
            s.append(ds.text(x,yy+rh/2+4,c,size=(12 if j==0 else 10.6),fill=ds.INK,font=ds.BODY,weight=("700" if j==0 else None)))
        if badge:
            lab,col=last; b,_=ds.badge(xs[-1],yy+rh/2-9,lab,col,h=18,size=8.3); s.append(b)
        else:
            s.append(ds.text(xs[-1],yy+rh/2+4,last,size=10.6,fill=ds.INK,font=ds.BODY))
    s.append(foot); ds.render("".join(s),f"{FIG}/{name}")

matrix("DX1-psychiatric.png","Psychiatry · §20 map","Psychiatric conditions — prevalence & first-line care",
  "Common, treatable, and specific: each disorder has an evidence-based first-line, not a one-size pill.","§20 §0","psychiatric-conditions",
  ["CONDITION","LIFETIME PREVALENCE","FIRST-LINE TREATMENT"],
  [("Depression","15–20%","CBT + an SSRI; combine if severe"),
   ("Anxiety disorders","20–30%","CBT (exposure) + an SSRI/SNRI"),
   ("OCD","2–3%","ERP therapy + high-dose SSRI"),
   ("PTSD","6–8%","trauma-focused CBT / EMDR"),
   ("Bipolar disorder","1–2%","lithium / mood stabilizers"),
   ("Schizophrenia","~1%","antipsychotics + psychosocial care"),
   ("ADHD","~5% (kids)","stimulants + skills/structure"),
   ("Eating disorders","1–4%","structured therapy (FBT / CBT-E)")],
  [40,360,640],badge=False)

matrix("DX2-mat-moud.png","Addiction · §35 §7","Medication for addiction — by substance & evidence",
  "For opioids, alcohol and tobacco, medication is first-line and lifesaving. For stimulants/cannabis, behavior is the evidence.","§35 §7.1","mat-moud-matrix",
  ["SUBSTANCE","FIRST-LINE MEDICATION","EFFECT","TIER"],
  [("Opioids","methadone / buprenorphine","halves overdose & all-cause death",("RCT",C["rct"])),
   ("Opioids (adjunct)","extended-release naltrexone","helps once abstinent",("RCT",C["rct"])),
   ("Alcohol","naltrexone / acamprosate","reduces heavy drinking (NNT ~12)",("RCT",C["rct"])),
   ("Tobacco","varenicline / NRT","2–3× quit rate",("RCT",C["rct"])),
   ("Stimulants","— (contingency management)","behavioral; strongest evidence",("BEHAVIORAL",C["behav"])),
   ("Cannabis","— (CBT / MET)","behavioral only",("BEHAVIORAL",C["behav"]))],
  [40,290,560,850])

matrix("DX3-pathogen-classes.png","Infectious Disease · §26 §1","The five classes of pathogen",
  "Antibiotics do nothing to viruses; prions can't be treated at all. The class dictates the therapy.","§26 §1","pathogen-classes",
  ["CLASS","EXAMPLES","HOW IT CAUSES DISEASE","THERAPY"],
  [("Bacteria","Strep, E. coli, TB","toxins, invasion, inflammation","antibiotics"),
   ("Viruses","flu, HIV, SARS-CoV-2","hijack host-cell machinery","antivirals / vaccines"),
   ("Fungi","Candida, Aspergillus","invade (esp. immunosuppressed)","antifungals"),
   ("Parasites","malaria, worms, Giardia","complex multi-stage life cycles","antiparasitics"),
   ("Prions","CJD, kuru","misfolded protein templating","none — untreatable, fatal")],
  [40,250,520,790],badge=False)

matrix("DX4-cancer-screening.png","Prevention · §07 §3","Cancer screening — who, when, and the benefit",
  "Screening helps where the disease has a long pre-clinical window and the test is good. Not all screening is beneficial.","§07 §3","cancer-screening-table",
  ["CANCER","WHO & WHEN","TEST","BENEFIT"],
  [("Colorectal","age 45–75","colonoscopy / FIT","mortality RR ~0.82"),
   ("Lung","50–80, ≥20 pack-years","low-dose CT","−20% lung-cancer deaths"),
   ("Breast","age 40–74","mammography","~−20% mortality"),
   ("Cervical","age 21–65","Pap / HPV test","Grade A — large benefit"),
   ("Prostate","55–69, shared decision","PSA","small; overdiagnosis risk"),
   ("Skin (general pop.)","—","whole-body visual exam","Grade I — no proven benefit")],
  [40,250,540,760],badge=False)

matrix("DX5-chronic-viral.png","Infectious Disease · §26 §5","Chronic viral infections — cure, manage, or prevent",
  "The status that matters: some we cure outright, some we suppress for life, some we prevent with a vaccine.","§26 §5.2","chronic-viral-status",
  ["VIRUS","KEY FACT","STATUS"],
  [("HIV","antiretrovirals; U=U; PrEP prevents it",("MANAGEABLE",C["manage"])),
   ("Hepatitis C","direct-acting antivirals cure >95% in 8–12 wk",("CURABLE",C["curable"])),
   ("Hepatitis B","vaccine prevents; antivirals suppress chronic",("PREVENT / SUPPRESS",C["prevent"])),
   ("HPV","vaccine prevents 6 cancers",("VACCINE-PREV.",C["vaccine"])),
   ("Herpesviruses","lifelong latency (HSV/VZV/EBV/CMV); suppressible",("MANAGEABLE",C["manage"]))],
  [40,330,850])

print("rendered 5 disease matrices (DX1-DX5)")
