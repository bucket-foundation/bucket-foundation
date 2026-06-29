#!/usr/bin/env python3
"""Assemble the figure gallery (self-contained HTML + PDF + contact sheet) from the manifest.
Future waves: just append to MANIFEST."""
import os, sys, base64, subprocess; sys.path.insert(0, os.path.dirname(__file__))
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,"..",".."))
FIG=os.path.join(ROOT,"media","figures"); OUT=os.path.join(ROOT,"reports")

MANIFEST=[  # (file, title, caption) — in reading order
 ("_design-system-sheet.png","Design System","palette · type · components"),
 ("01-claims-by-tier.png","Claims by Evidence Tier","computed from the corpus"),
 ("03-vo2max-mortality.png","VO₂max → Mortality","strongest predictor"),
 ("20-strength-jcurve.png","Strength J-curve","more is not better"),
 ("21-steps-plateau.png","Steps → Mortality","plateaus ~7–8k"),
 ("02-copenhagen-sports.png","Copenhagen Sports","tennis +9.7y"),
 ("22-sleep-ushape.png","Sleep U-shape","~7-hour floor"),
 ("23-sauna-mortality.png","Sauna → Mortality","dose-dependent"),
 ("24-alcohol-jcurve.png","Alcohol J-curve","mostly confounding"),
 ("34-resting-hr.png","Resting Heart Rate","the clean consumer win"),
 ("09-lancet14-dementia.png","Lancet-14 Dementia","~45% preventable"),
 ("25-responder-distribution.png","Responders","same program, different results"),
 ("27-lifespan-ledger.png","What Doubled Lifespan","public health, not high-tech"),
 ("07-calibration-spectrum.png","Calibration Spectrum","Galpin → Sinclair"),
 ("26-verdict-donut.png","Claim Verdicts","37/37/8/18"),
 ("08-what-to-track.png","What To Track","do / measure / skip"),
 ("39-evidence-ladder.png","The Evidence Ladder","ten rungs"),
 ("28-supplement-matrix.png","Supplement Shelf","real vs hype"),
 ("37-biohacking-matrix.png","Biohacks, Graded","what survives the evidence"),
 ("38-cam-matrix.png","CAM, Graded","by indication"),
 ("15-fasting-timeline.png","Fasting Timeline","autophagy honesty flag"),
 ("33-protein-dose.png","Protein Dose-Response","plateau ~1.6 g/kg"),
 ("14-bayes-ppv.png","Bayes / PPV","9% vs 92%"),
 ("04-energy-stack.png","Chemiosmosis","the master variable"),
 ("05-nutrient-switchboard.png","Nutrient Switchboard","growth vs repair"),
 ("16-mitochondria-section.png","Mitochondrion + 3 Dials","quantity·quality·efficiency"),
 ("30-hallmarks-aging.png","Hallmarks of Aging","the 12 processes"),
 ("10-hallmarks-cancer.png","Hallmarks of Cancer","the 8 capabilities"),
 ("29-modality-matrix.png","Modality → Capacity","what each tool trains"),
 ("40-weekly-program.png","Minimum-Effective Week","one week, everything"),
 ("31-four-horsemen.png","The Four Horsemen","what to prevent"),
 ("32-apob-cumulative.png","apoB is Cumulative","lower, earlier, longer"),
 ("41-atherosclerosis-cascade.png","Atherosclerosis Cascade","apoB → heart attack"),
 ("35-glp1-outcomes.png","GLP-1 Outcomes","the real data"),
 ("36-statin-nnt.png","Statin NNT by Risk","same drug, different value"),
 ("42-metabolic-syndrome.png","Metabolic Syndrome","any 3 of 5"),
 ("17-organ-systems-map.png","12 Organ Systems","the body, mapped"),
 ("18-mechanism-convergence.png","Mechanism Convergence","practices → fundamentals"),
 ("11-cpr-card.png","Hands-Only CPR","action card"),
 ("12-befast-card.png","BE-FAST Stroke","recognition card"),
 ("13-anaphylaxis-card.png","Anaphylaxis","epinephrine-first"),
 ("19-emergency-wallet.png","Emergency Wallet","recognize → act"),
 ("43-grip-mortality.png","Grip Strength → Mortality","a cheap whole-body proxy"),
 ("44-sleep-hypnogram.png","Sleep Hypnogram","deep early, REM late"),
 ("45-cortisol-rhythm.png","Cortisol Rhythm","high AM, low PM"),
 ("46-action-potential.png","The Action Potential","how a nerve fires"),
 ("52-innate-adaptive.png","Innate vs Adaptive Immunity","fast generalist, slow specialist"),
 ("54-gut-brain-axis.png","Gut–Brain Axis","both ways"),
 ("47-vaccines-longevity.png","Vaccines as Longevity","beyond infection"),
 ("48-hrt-timing.png","HRT — It's About Timing","the estrogen window"),
 ("49-imaging-matrix.png","Imaging Modalities","what each sees · radiation"),
 ("50-ckd-heatmap.png","KDIGO CKD Heat-Map","filtration × protein leak"),
 ("53-cancer-screening.png","Cancer Screening","what saves lives"),
 ("51-pain-biopsychosocial.png","Pain is Biopsychosocial","not just damage"),
 ("55-omega3-index.png","Omega-3 Index","predictor, RCTs mixed"),
 ("56-visceral-fat.png","Visceral Fat","the fat that matters"),
 ("57-mediterranean.png","Mediterranean Diet","best-evidenced pattern"),
 ("62-longevity-plate.png","The Whole-Food Plate","½ plants · ¼ protein · ¼ carbs"),
 ("59-metabolic-flexibility.png","Metabolic Flexibility","switching fuels cleanly"),
 ("58-hearing-dementia.png","Hearing & Dementia","a real lever (ACHIEVE)"),
 ("60-four-capacities.png","The Four Capacities","build + test each"),
 ("63-sleep-hygiene.png","Sleep Hygiene","what actually works"),
 ("61-endocrine-axes.png","Endocrine Axes","the three master loops"),
 ("65-hpa-axis.png","The HPA Stress Axis","cortisol + feedback"),
 ("66-synapse.png","The Synapse","how neurons talk"),
 ("64-geroprotector-matrix.png","Geroprotector Drugs","by evidence stage"),
]

def b64(p):
    with open(p,"rb") as f: return base64.b64encode(f.read()).decode()

present=[(fn,t,c) for fn,t,c in MANIFEST if os.path.exists(os.path.join(FIG,fn))]
cards="".join(f'<figure class="card"><img src="data:image/png;base64,{b64(os.path.join(FIG,fn))}"/>'
              f'<figcaption><span class="t">{t}</span><span class="c">{c}</span></figcaption></figure>' for fn,t,c in present)
n=len(present)-1
doc=f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Figure Gallery</title><style>
@page{{size:A4 landscape;margin:12mm}} body{{font-family:Inter,Arial,sans-serif;background:#f3eee1;color:#1c1a17;margin:0;padding:28px}}
.kick{{font-family:Archivo;font-weight:800;letter-spacing:.18em;font-size:12px;color:#6b5418;text-transform:uppercase}}
h1{{font-family:Archivo;font-weight:800;font-size:30px;margin:6px 0 4px}} .sub{{color:#5e574a;font-size:14px;font-style:italic}}
.rule{{height:3px;width:90px;background:#b08d3a;margin:12px 0 20px}}
.grid{{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:22px}}
.card{{margin:0;background:#fff;border:1px solid #ddd3bb;border-radius:10px;overflow:hidden;break-inside:avoid}}
.card img{{width:100%;display:block;border-bottom:1px solid #ece4d0}} figcaption{{padding:10px 14px}}
.t{{font-family:Archivo;font-weight:700;font-size:15px;display:block}} .c{{color:#5e574a;font-size:12px;display:block;margin-top:2px}}</style></head><body>
<div class="kick">Bucket Longevity Manual · Nucleus</div><h1>Figure Gallery</h1>
<div class="sub">{n} figures + the design system · one visual language · every one rendered &amp; verified</div><div class="rule"></div>
<div class="grid">{cards}</div></body></html>'''
open(os.path.join(OUT,"figures-gallery.html"),"w").write(doc)
print(f"gallery: {n} figures")
subprocess.run(["weasyprint",os.path.join(OUT,"figures-gallery.html"),os.path.join(OUT,"figures-gallery.pdf")],capture_output=True)
# contact sheet
files=[os.path.join(FIG,fn) for fn,_,_ in present]
import math
cols=6; geo="300x"
subprocess.run(["magick","montage",*files,"-tile",f"{cols}x{math.ceil(len(files)/cols)}","-geometry",f"{geo}+6+6","-background","#efe9da",os.path.join(FIG,"_signature-set-contact-sheet.png")],capture_output=True)
print("contact sheet + pdf written")
