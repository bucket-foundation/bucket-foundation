#!/usr/bin/env python3
"""One-shot language sweep: remove every 'X, not Y' / 'this, not that' / 'not just' antithesis
from figure text and replace with positive, declarative phrasing. Auditable + rerunnable."""
import glob, sys
REPL = [
 ("with high-efficacy agents, not escalate slowly.", "with high-efficacy agents from the start."),
 ("CGRP blockers: a real migraine advance, not a cure", "CGRP blockers: a real migraine advance"),
 ("FDA rejected 2024 — not approved", "FDA rejected 2024"),
 ("Penetrance is high, not 100%.", "Penetrance is high but incomplete."),
 ("Hearing loss is a lever, not just a marker — treat it.", "Hearing loss is a treatable lever on dementia risk."),
 ("the social + skill + intermittent dimensions, not just calories.", "the social, skill, and intermittent dimensions appear to carry the benefit."),
 ("each disorder has an evidence-based first-line, not a one-size pill.", "each disorder has its own evidence-based first-line treatment."),
 ("Pain is biopsychosocial — not just damage", "Pain is biopsychosocial"),
 ("Why the best back-pain care is stay-active + education — not bed rest, scans, or most surgery.", "Why staying active plus education beats bed rest, scans, and most surgery for back pain."),
 ("The remaining barrier is diagnosis and access, not the medicine.", "The remaining barrier is diagnosis and access."),
 ("the multidomain approach, not any single lever.", "the multidomain approach delivered it."),
 ("A first step, not a cure.", "A first step toward treatment."),
 ("odds ratio — not personal probability", "odds ratio (a population figure)"),
 ("IVF success tracks egg age, not the calendar", "IVF success tracks the egg's age"),
 ("is mostly missed doses, not the chemistry.", "is mostly missed doses."),
 ("Bone answers to LOAD — not cardio", "Bone answers to mechanical LOAD"),
 ("a chain to a fundamental layer is necessary, not sufficient.", "a chain to a fundamental layer still has to be shown in humans."),
 ("unresponsive, not breathing", "unresponsive and barely breathing"),
 ("The biggest longevity levers are social, not supplemental", "The biggest longevity levers are social"),
 ("Design for the gap — cues and environment, not more motivation.", "Design for the gap with cues and environment."),
 ("vaccines — not clinical medicine — drove most of the gain. Medicine is the smaller share.", "vaccines drove most of the gain. Clinical medicine is the smaller share."),
 ("The system, not the science, is the gap.", "The problem is how care is organized."),
 ("IL-6/hsCRP mark it (predictor, not lever).", "IL-6/hsCRP mark it (a predictor of risk)."),
 ("GLP-1 drugs: not just weight, but real outcomes", "GLP-1 drugs: weight loss and real outcomes"),
 ("HRV — your trend, not a leaderboard", "HRV — track your own trend"),
 ("The 'liver flush stones' are soap, not gallstones", "The 'liver flush stones' are just soap"),
 ("these are saponified soap, not gallstones.", "these are saponified soap pellets with no gallstones in them."),
 ("Mostly genetic (under-excretion), not just diet.", "Mostly genetic (under-excretion), with diet a minor contributor."),
 ("which is why inhaled steroids, not just relievers, are the controller.", "which is why an inhaled steroid is the controller."),
 ("system — treat the system, not five silos.", "system — treat the whole system."),
 ("The verdict: avoid burns, not daylight.", "The verdict: avoid burns while still getting daylight."),
 ("Avoid burns and tanning beds — not the outdoors.", "Avoid burns and tanning beds while still enjoying the outdoors."),
 ("long, mild cold acclimation — not the 3-minute plunge being marketed.", "long, mild cold acclimation — a different protocol from the marketed 3-minute plunge."),
 ("Image a QUESTION, not a body", "Image a specific QUESTION"),
 ("Real cell therapies are in trials and approvals — not cash-only infusion bars.", "Real cell therapies live in clinical trials and regulatory approvals."),
 ("The pattern, not a brand diet", "The habits every good diet shares"),
 ("a cheap steroid. Restraint, not escalation, saved lives.", "a cheap steroid. Restraint saved lives."),
 ("(Strength, not muscle size, predicts survival.)", "(Strength predicts survival more than muscle size.)"),
 ("change the stimulus — not the goal.", "change the stimulus."),
 ("Calibration, not direction: the modal failure", "Calibration is the axis: the modal failure"),
 ("corrects deficiency — not a lever in the replete", "corrects a deficiency (no benefit if you are replete)"),
 ("It's a HINGE, not a squat — hips snap back & through", "It's a HINGE — hips snap back and through"),
 ("public health, not high-tech", "led by public health"),
 ("regulate, don't boost", "the goal is regulation"),
 ("Immune modulators — what survives the evidence", "Immune modulators — what survives the evidence"),
 (": a real advance, not cure", ": a real advance"),
 ("advance, not cure", "a real advance"),
 ("a lever, not a marker", "a treatable lever"),
 ("clean water, not drugs", "led by clean water"),
 ("avoid burns, not daylight", "avoid burns, keep daylight"),
 ("Turn the rope from the wrists, not the arms", "Turn the rope from the wrists"),
 ("targeting extremes.", "targeting the extremes."),
 (" — not the few at high risk. A tiny population-wide improvement prevents more disease than targeting the extremes.", ". A tiny population-wide improvement prevents more disease than targeting only the extremes."),
 ("and most of THAT from public health, not clinical medicine.", "and most of that from public-health advances."),
 ("The goal is healthspan, not just lifespan", "Healthspan is the real goal"),
 ("HRV is useful tracked against YOUR baseline over time. Comparing your number to other people's is noise.", "HRV is useful tracked against your own baseline over time. Comparing your number to other people's is noise."),
 ("Heart-rate variability is useful tracked against YOUR baseline over time. Comparing your number to other people's is noise.", "Heart-rate variability is useful tracked against your own baseline over time. Comparing your number to other people's is noise."),
 ("(predictors, not levers)", "(predictors of risk)"),
 ("predictors, not levers", "predictors of risk"),
 ("Protein: a plateau, not a ladder", "Protein gains plateau around 1.6 g/kg"),
 ("A readout, not a lever.", "A readout to track."),
 ("predictor, not a lever", "a predictor of risk"),
 ("Measure apoB (the particle count), not just LDL-C (the cargo).", "Measure apoB, the particle count, for a truer read than LDL-C (the cargo)."),
 ("sanitation, vaccines, antibiotics & nutrition — not high-tech medicine.", "sanitation, vaccines, antibiotics, and nutrition."),
 ("Treat symptomatic hypogonadism — not 'low-normal for your age' (lifestyle first).", "Treat genuine, symptomatic hypogonadism; try lifestyle first."),
 ("surrogate markers, not hard outcomes", "surrogate markers only"),
 ("regulate ≠ boost", "the regulated immune system"),
 ("Regulate, don't boost.", "The goal is regulation."),
 # --- second pass: residuals ---
 ("cut sugar FREQUENCY, not just amount.", "cut down on sugar frequency."),
 ("Spit, don't rinse (keep the fluoride on the teeth);", "Spit out the excess and skip the water rinse to keep the fluoride on the teeth;"),
 ("~60% of the power is the legs, not the arms", "~60% of the power comes from the legs"),
 ("Worth it when it answers a question — not for a 'just-checking' scan.", "Worth it when it answers a real clinical question."),
 ("designed for short bursts, not chronic activation.", "designed for short bursts."),
 ("the calorie deficit it causes — not a magic clock. Early eating window beats late.", "the calorie deficit it causes. An early eating window beats a late one."),
 ("Modelled, not a body count — but a reason to scan only when it changes care.", "These are modelled estimates, and a reason to scan only when it changes care."),
 ("The harm is from CHRONIC activation, not the hormone.", "The harm comes from CHRONIC activation."),
 ("lower arousal, not blue-light gadgets", "lower evening arousal"),
 ("New ED in a man over 40 warrants cardiovascular risk assessment — not just a prescription.", "New ED in a man over 40 warrants a cardiovascular work-up alongside any prescription."),
 ("It's a work-up trigger, not just a pill.", "It's a trigger for a cardiac work-up."),
 ("The flag is statistics, not disease.", "The flag is a statistical artifact."),
 ("Tier-A behaviours, not supplements.", "Tier-A behaviours do the work."),
 ("Screening earns its place at the right age — not before.", "Screening earns its place at the right age."),
 ("Chronic activation is the problem, not cortisol itself.", "Chronic activation is the problem."),
 ("Tall posture; lean from the ANKLES, not the waist", "Tall posture; lean from the ANKLES"),
 ("Where each voice lands is about calibration, not direction.", "Where each voice lands reflects calibration more than the direction of the claim."),
 ("your whole weight, don't let up", "your whole weight and keep it on"),
]
files=glob.glob("build_*.py")
total=0; hits={}
for f in files:
    src=open(f).read(); orig=src
    for a,b in REPL:
        if a in src: src=src.replace(a,b); hits[a]=hits.get(a,0)+orig.count(a)
    if src!=orig: open(f,"w").write(src); total+=1
print(f"updated {total} files")
applied=sum(hits.values()); print(f"applied {applied} replacements across {len(hits)} distinct phrases")
# residual check
import re
res=0
for f in files:
    for m in re.findall(r'"[^"]*"', open(f).read()):
        if re.search(r', not |— not | not just |, don\'t |, especially', m): res+=1; print("RESIDUAL:",f,m[:90])
print(f"residual antithesis strings: {res}")
