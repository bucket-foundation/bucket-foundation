#!/usr/bin/env python3
"""Map every rendered figure -> manual chapter. Enumerates the actual figure PNGs, finds each
name in the build sources, and extracts its §-section (with explicit overrides for legacy figures)."""
import os, re, glob, json
HERE=os.path.dirname(os.path.abspath(__file__))
FIG=os.path.abspath(os.path.join(HERE,"..","..","media","figures"))
SEC2CID={"00":"atlas","01":"foundations","12":"mechanism","37":"mitochondria","18":"anatomy",
 "13":"endocrine","14":"nervous","15":"immune","16":"telomeres","11":"bodysys","17":"organatlas",
 "42":"reproductive","07":"clinical","22":"dz_cardiometabolic","23":"dz_respgi","24":"dz_neurorheum",
 "25":"oncology","26":"infectious","08":"brain","20":"mental","35":"addiction","21":"pain",
 "27":"surface","43":"pediatric","34":"emergency","38":"surgery","39":"anesthesia","40":"imaging",
 "41":"pathology","28":"pharmafull","10":"pharma_longevity","31":"regenerative","30":"complementary",
 "32":"biohacking","02":"training","44":"modalities","45":"sports","03":"nutrition","36":"fasting",
 "05":"recovery","29":"behavior","19":"lifestages","09":"exposures","33":"publichealth","04":"variation",
 "46":"practitioner"}
NUMBERED={
 "37-biohacking-matrix":"biohacking","38-cam-matrix":"complementary","BX1-actionable-variants":"anatomy",
 "01-claims-by-tier":"atlas","02-copenhagen-sports":"sports","03-vo2max-mortality":"training",
 "04-energy-stack":"foundations","05-nutrient-switchboard":"foundations","07-calibration-spectrum":"practitioner",
 "08-what-to-track":"variation","09-lancet14-dementia":"brain","10-hallmarks-cancer":"oncology",
 "100-air-pollution":"exposures","101-central-dogma":"foundations","102-cholesterol-particles":"dz_cardiometabolic",
 "103-the-cell":"foundations","104-longevity-pipeline":"regenerative","105-red-flags":"emergency",
 "11-cpr-card":"emergency","12-befast-card":"emergency","13-anaphylaxis-card":"emergency","14-bayes-ppv":"pathology",
 "15-fasting-timeline":"fasting","16-mitochondria-section":"mitochondria","18-mechanism-convergence":"mechanism",
 "19-emergency-wallet":"emergency","20-strength-jcurve":"training","21-steps-plateau":"training",
 "22-sleep-ushape":"recovery","23-sauna-mortality":"recovery","24-alcohol-jcurve":"exposures",
 "25-responder-distribution":"variation","26-verdict-donut":"practitioner","27-lifespan-ledger":"lifestages",
 "28-supplement-matrix":"nutrition","29-modality-matrix":"modalities","30-hallmarks-aging":"telomeres",
 "31-four-horsemen":"dz_cardiometabolic","32-apob-cumulative":"dz_cardiometabolic","33-protein-dose":"nutrition",
 "34-resting-hr":"dz_cardiometabolic","35-glp1-outcomes":"pharma_longevity","36-statin-nnt":"pharma_longevity",
 "39-evidence-ladder":"atlas","40-weekly-program":"training","41-atherosclerosis-cascade":"dz_cardiometabolic",
 "42-metabolic-syndrome":"dz_cardiometabolic","43-grip-mortality":"training","44-sleep-hypnogram":"recovery",
 "48-hrt-timing":"reproductive","49-imaging-matrix":"imaging","50-ckd-heatmap":"dz_cardiometabolic",
 "51-pain-biopsychosocial":"pain","52-innate-adaptive":"immune","53-cancer-screening":"clinical",
 "54-gut-brain-axis":"nervous","55-omega3-index":"nutrition","56-visceral-fat":"dz_cardiometabolic",
 "57-mediterranean":"nutrition","58-hearing-dementia":"brain","59-metabolic-flexibility":"dz_cardiometabolic",
 "60-four-capacities":"training","62-longevity-plate":"nutrition","63-sleep-hygiene":"recovery",
 "64-geroprotector-matrix":"pharma_longevity","66-synapse":"nervous","68-hba1c-risk":"dz_cardiometabolic",
 "73-immunosenescence":"immune","74-screening-by-age":"clinical","75-blood-panel":"pathology",
 "76-cancer-treatment":"oncology","77-vaccine-schedule":"infectious","78-insulin-resistance":"dz_cardiometabolic",
 "79-inflammation-paths":"immune","80-prevention-by-decade":"clinical","81-lifespan-over-time":"publichealth",
 "82-bmi-jcurve":"dz_cardiometabolic","85-calerie":"fasting","86-vo2max-age":"lifestages",
 "87-hormesis-curve":"foundations","88-dementia-checklist":"brain","89-fasting-protocols":"fasting",
 "90-recovery-toolkit":"recovery","91-minimal-equipment":"training","94-menopause-timeline":"reproductive",
 "95-social-connection":"recovery","96-smoking-quit":"exposures","97-leading-causes":"publichealth",
 "98-epigenetic-clock":"telomeres","99-sarcopenia":"lifestages","B12-hip-fracture-mortality":"bodysys",
 "17-organ-systems-map":"organatlas","45-cortisol-rhythm":"endocrine","46-action-potential":"nervous",
 "47-vaccines-longevity":"pharma_longevity","61-endocrine-axes":"endocrine","65-hpa-axis":"endocrine",
 "67-bp-sprint":"clinical","69-lpa-risk":"dz_cardiometabolic","70-cac-risk":"dz_cardiometabolic",
 "71-zone2-hiit":"training","72-bone-tscore":"bodysys","83-testosterone-age":"endocrine",
 "84-cancer-incidence":"oncology","92-autonomic-ns":"nervous","93-fight-or-flight":"nervous"}
WORD2CID={"nervous system":"nervous","endocrine":"endocrine"}
PREFIX=[("M","training"),("E","emergency")]
SRC="".join(open(f).read() for f in glob.glob(os.path.join(HERE,"build_*.py"))
            if os.path.basename(f) not in
            {"build_gallery.py","apply_language.py","bump_heights.py","fix_arrows.py","fetch_anatomy.py","audit_fix.py","map_figures.py"})
figs=sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(FIG,"*.png"))
            if not os.path.basename(p).startswith(("_",)) and "contact" not in os.path.basename(p))
fig2cid={}; unmapped=[]
for name in figs:
    if name in NUMBERED: fig2cid[name]=NUMBERED[name]; continue
    cid=None
    i=SRC.find('"'+name)                          # find the figure's name-string in the build code
    if i<0: i=SRC.find(name)
    if i>=0:
        win=SRC[max(0,i-1700):i+200]
        secs=re.findall(r'§\s*0*(\d{1,2})', win)
        for s in reversed(secs):
            if s.zfill(2) in SEC2CID: cid=SEC2CID[s.zfill(2)]; break
        if not cid:
            wl=win.lower()
            for w,c in WORD2CID.items():
                if "§"+w in wl: cid=c; break
    if not cid:
        for pre,c in PREFIX:
            if name.startswith(pre): cid=c; break
    if cid: fig2cid[name]=cid
    else: unmapped.append(name)
json.dump(fig2cid, open(os.path.join(HERE,"figure_chapter_map.json"),"w"), indent=0)
from collections import Counter
print(f"{len(figs)} figures total; mapped {len(fig2cid)}; unmapped {len(unmapped)}")
print("per chapter:", dict(sorted(Counter(fig2cid.values()).items(), key=lambda x:-x[1])))
if unmapped: print("UNMAPPED:", unmapped)
