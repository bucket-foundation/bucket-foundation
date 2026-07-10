# 41 — Pathology & Laboratory Medicine

**Bottom line up front:** test when the answer will change a decision, in a person in whom the answer is
interpretable. By construction, 1 in 20 healthy values flags "abnormal" — so read every result as an update
to what you already knew, never as a verdict on its own.

Read Part A once, carefully, and most medical news and every "full-body blood panel" ad will read
differently afterward. Every claim elsewhere in this manual that says
"measure X," "screen for Y," or "this biomarker predicts Z" only means something once you understand **how
a test actually performs** — the arithmetic that turns a number on a lab slip into a decision, which most
readers and a surprising number of clinicians never learn.

This chapter covers two literacies: the **test-performance foundations** (sensitivity, specificity,
predictive values, Bayes, likelihood ratios, ROC — the single most useful piece of medical literacy a
generalist can own) and the **lab landscape** (what each category of test physically measures, what
"normal" means, where the gold standards are, and where the frontier oversells itself).

Three rules run through all of it. A test that **flags** risk (hsCRP, a tumor marker, a coronary calcium
score) is a *predictor, not a lever* — something that forecasts risk isn't automatically something that,
driven to zero, lowers it; treating the readout instead of the disease is the commonest lab error.
"This marker is associated with the disease" (the basis of almost every assay) is not "screening with it
saves lives" — that needs a randomized screening trial most markers never pass. And past a person's actual
pre-test probability, more testing **generates** false positives, cascades, and harm; the discipline is
knowing when **not** to test.

_Not medical advice. Screening principles: §07. Drugs: §10. Which biomarkers earn their place:
`WHAT-TO-TRACK-SYNTHESIS.md`._

---

# PART A — THE TEST-PERFORMANCE FOUNDATIONS

This is the rigorous core — the arithmetic everything else rests on.

## A.1 The 2×2 table — where every test metric is born

Every diagnostic test, no matter how fancy (a SNP chip, a CT scan, a PCR, a finger-prick glucose), reduces
to a single 2×2 table once you compare its verdict against the truth — true positives and true negatives where it agrees, false positives and false negatives where it errs:

@@FIG:PS2-confusion-2x2@@

Four numbers. Every metric below is a ratio of these four. The single most important habit this section
can give you: **whenever you read a test statistic, ask which way the ratio runs — down a column (a
property of the test) or across a row (what the result means for the patient).** Confusing those two is
the root of nearly all test-interpretation error.

## A.2 Sensitivity and specificity — properties of the *test* (read down the columns)

- **Sensitivity** = TP / (TP + FN) = of everyone who truly *has* the disease, what fraction does the test
  correctly catch? A 95%-sensitive test misses 5% of true cases. **High sensitivity → a negative result
  is trustworthy** (few cases slip through). Mnemonic: **SnNout** — a *Sn*sitive test, when *N*egative,
  rules *out*.
- **Specificity** = TN / (TN + FP) = of everyone who is truly *well*, what fraction does the test
  correctly clear? A 95%-specific test falsely flags 5% of healthy people. **High specificity → a
  positive result is trustworthy** (few false alarms). Mnemonic: **SpPin** — a *Sp*ecific test, when
  *P*ositive, rules *in*.

These two numbers are (approximately) **fixed properties of the test itself** — they are measured once, in
a validation study, and travel with the assay. They do **not** depend on how common the disease is — which
is exactly why they are *insufficient on their own* to tell you what your result means. What you actually
care about (does a positive result mean I'm sick?) depends on how common the disease is: the next section,
and the whole game.

There is also an unavoidable **trade-off**: you can almost always raise sensitivity by lowering the
positivity threshold, but only at the cost of specificity (and vice-versa). Move the cutoff for a "high"
PSA, troponin, or fasting glucose down, and you catch more true cases *and* flag more healthy people. No
test escapes this; the threshold is a *policy choice*, not a fact of nature (see A.6, ROC).

## A.3 Predictive values — what a result means for *you* (read across the rows)

- **Positive predictive value (PPV)** = TP / (TP + FP) = if my test is *positive*, what's the probability
  I actually have the disease?
- **Negative predictive value (NPV)** = TN / (TN + FN) = if my test is *negative*, what's the probability
  I'm actually well?

**These are the numbers a patient actually wants** — and, critically, **they are not fixed.** PPV and NPV
depend on **how common the disease is in the population being tested** (the prevalence, which for an
individual is the *pre-test probability*). The identical test, with identical sensitivity and specificity,
yields a *wildly different* PPV in a high-risk clinic versus a healthy screening population. This is the
hinge of the entire chapter.

## A.4 Pre-test probability and Bayes — why the same test means different things in different people

> **If you remember one thing from this section, remember this.**

A test result does not *replace* what you knew before; it *updates* it. Your belief after the test (the
**post-test probability**) is your belief before the test (the **pre-test probability** = the prevalence in
someone like you) revised by the test's evidence. This is **Bayes' theorem**, and ignoring the pre-test
half of it is the commonest reasoning error in all of medicine
(Lijmer & Bossuyt, *Intensive Care Med* 2003 — "A readers' guide to the interpretation of diagnostic test
properties").

**A worked example, because the numbers are counter-intuitive.** Take an excellent test:
**99% sensitive, 99% specific** (better than almost anything real). Apply it to a disease present in **1 in
1,000** people, screening 100,000 healthy adults:

- True cases: 100. The test catches 99 of them (99% sensitivity) → **99 true positives.**
- Healthy people: 99,900. The test falsely flags 1% of them → **999 false positives.**
- So of **1,098 positive results, only 99 are real.** **PPV ≈ 9%.** A "positive" on a 99/99 test means you
  *probably do not have the disease* — there are **ten false alarms for every true case** — purely because
  the disease was rare to begin with.

@@FIG:14-bayes-ppv,PS1-bayes-ppv@@

Nothing about the test changed. Only the pre-test probability did. Now run the *same* test in a population
where the disease is present in 1 in 10 (a symptomatic clinic): PPV jumps above 90%. **Same test, same
numbers down the columns, opposite meaning across the rows.** This single fact explains:

- Why screening **low-prevalence populations** (healthy young people, rare diseases) **floods the system
  with false positives** — there are simply vastly more well people to misflag than sick people to catch.
- Why a result must always be read *in the context of the person* — their symptoms, age, risk factors,
  family history. A doctor's "pre-test probability" is not hand-waving; it is the prevalence term in Bayes,
  and it is doing half the inferential work.
- Why "I felt fine but the panel found something" so often ends in a benign biopsy scar and months of
  anxiety: the find was a false positive that was *statistically inevitable* given a low pre-test
  probability and a wide net.

@@FIG:P01-ppv-prevalence@@

## A.5 Likelihood ratios — the cleanest way to actually do the update

PPV/NPV are intuitive but population-locked. **Likelihood ratios (LRs)** package a test's evidence into a
single number you can apply to *any* pre-test probability — they are the practitioner's Bayesian tool of
choice (Deeks & Altman; the Sackett *Clinical Epidemiology* tradition).

- \(\mathrm{LR}^{+} = \dfrac{\text{sensitivity}}{1-\text{specificity}}\) = how much *more* likely a positive result is in a sick person
  than a well one.
- \(\mathrm{LR}^{-} = \dfrac{1-\text{sensitivity}}{\text{specificity}}\) = how much a *negative* result lowers the odds.

Rough field guide (Jaeschke/McMaster):

| LR+ | Effect of a positive result | LR− | Effect of a negative result |
|-----|-----------------------------|-----|-----------------------------|
| >10 | large, often conclusive ↑   | <0.1| large, often conclusive ↓   |
| 5–10| moderate ↑                  | 0.1–0.2 | moderate ↓               |
| 2–5 | small ↑                     | 0.2–0.5 | small ↓                  |
| 1–2 | negligible (the test barely moved anything) | 0.5–1 | negligible |

@@FIG:PS12-fagan@@

The LR framing makes the punchline unavoidable: **a test with LR near 1 is useless no
matter how "abnormal" the result looks**, and a great many ordered tests — especially screening add-ons
sold as thoroughness — have LRs close to 1 in the population they're applied to. The LR also shows *why
pre-test probability is inescapable*: you apply the LR to the **pre-test odds**, so the same LR lands you
in a different place depending on where you started.

## A.6 ROC curves and the threshold problem

Most tests don't output "positive/negative"; they output a *number* (a PSA value, a troponin level, an
antibody titer), and someone has to draw a line. The **Receiver Operating Characteristic (ROC) curve**
plots sensitivity (y) against 1 − specificity (x) across *every possible* threshold. It makes two things
visible:

- **The whole sensitivity/specificity trade-off at once** — slide the cutoff and you slide along the curve.
- **The test's intrinsic discrimination, the AUC** (area under the curve): 0.5 = a coin flip (the diagonal),
  1.0 = perfect separation. AUC ~0.7 is modest, ~0.8 good, ~0.9 excellent. AUC is threshold-independent,
  so it's the fair way to compare two tests — but note it says nothing about *which* threshold to use; that
  is a value judgment about the relative cost of a miss versus a false alarm.

@@FIG:P03-roc-curve@@

Where the threshold is set is a **policy decision smuggled inside a number.** "Pre-diabetes" at HbA1c
5.7%, a "high" PSA at 4.0 ng/mL, a "low" TSH — each line was chosen by a committee weighing consequences,
and each could be moved. Lowering a threshold to "catch more" *always* relabels more healthy people as
diseased. This is the engine of **overdiagnosis** (A.9).

## A.7 What "normal" means — reference ranges, honestly

A laboratory "reference range" is **not** a definition of health. For most analytes it is the **central
95% of values in a reference population of (presumed) healthy people** — i.e. mean ± ~2 standard
deviations. Three consequences fall straight out of that definition, and almost no one is told them:

1. **By construction, 1 in 20 perfectly healthy people fall "out of range" on any given test** — 2.5% high,
   2.5% low. It is *built into the math*. Run a 20-analyte panel on a healthy person and the probability at
   least one result flags "abnormal" is roughly 1 − \(0.95^{20}\) ≈ **64%**. **More than half of healthy people
   "fail" a broad panel** for no reason but statistics. (Galen & Gambino's classic *Beyond Normality*
   formalized this decades ago; it is why "the panel found something" is the expected, not the surprising,
   outcome.)

@@FIG:P02-reference-range@@
2. **Statistical-normal ≠ optimal ≠ healthy.** The reference range describes *who got sampled*, not what's
   *best*. If the reference population is a developed nation with widespread insulin resistance, a
   "normal" fasting glucose or LDL may sit well above the level associated with lowest risk. Conversely,
   "optimal" ranges marketed by longevity clinics are frequently *narrower than the evidence supports* and
   convert ordinary variation into billable abnormality. The corpus's stance (carried from
   `WHAT-TO-TRACK-SYNTHESIS.md`): treat the *validated, outcome-linked* thresholds (apoB — a direct count
   of the cholesterol particles that lodge in artery walls; HbA1c; blood pressure) as real; treat "optimal"
   boutique ranges as marketing until an outcome study backs them.
3. **A single out-of-range value is usually not disease.** Biological variation (day-to-day, diurnal,
   post-meal, post-exercise), assay imprecision, and the 1-in-20 statistics mean an isolated flag, in a
   person with no symptoms and low pre-test probability, most often regresses to normal on a repeat draw.
   The correct response to one mild flag is frequently *repeat it*, not *treat it* or *scan for it*.

Reference ranges are also **method- and population-specific**: the same hormone measured by two assays can
have different ranges and even different *numbers* (§13, §A.8 below), and ranges legitimately differ by
age, sex, pregnancy, and ancestry. A value is only interpretable against *the reporting lab's own range*.

## A.8 Assay variability — the number is not the truth

Underneath every clean digit on a lab report is an **analytical reality** the report hides:

- **Imprecision (the CV, or coefficient of variation — how much the same sample wobbles when re-run).**
  Repeat the same sample and you get a spread. Well-controlled chemistry assays run
  a few percent; some immunoassays (many hormones) run 10–20%+. A "change" smaller than the assay's
  reference-change value (RCV) is noise. For comparing two measurements on the same person, RCV ≈ 2.77 × CV at
  95% confidence (√2 × 1.96 × CV): an assay with CV = 5% has an RCV ≈ 14%, so a measured change under ~14%
  between two draws is statistically indistinguishable from analytical noise.
- **Between-method disagreement.** Different platforms calibrated differently give different absolute
  values — acute for **endocrine assays** (testosterone, cortisol, thyroid, insulin; cross-ref §13) and
  **insulin/HOMA-IR** (flagged in `WHAT-TO-TRACK-SYNTHESIS.md` Tier A caveat). This is why you should
  **trend results on one lab and one method** — it avoids spurious variation from method disagreement.
- **Interferences and pre-analytical error.** Hemolysis, fasting state, time of day, recent illness,
  biotin supplements (a notorious immunoassay interferent), tourniquet time, even posture move results.
  Most "abnormal" results are pre-analytical, not pathological.

This is the lab-medicine face of the corpus's measurement skepticism: the most common reason a number is
"off" is the *measurement*, not the *patient*.

## A.9 The over-testing / cascade problem — the cost of more

Put A.4 and A.7 together and a predictable harm emerges. Test broadly in low-pre-test-probability people
and you manufacture false positives; each false positive triggers a **cascade** — a repeat test, then an
imaging study, then a specialist, then sometimes an invasive biopsy with its own (small but real)
complication rate — chasing a finding that was never disease. The named hazards:

- **Incidentalomas:** the thyroid nodule, adrenal mass, or lung micronodule the scan found *while looking
  for something else*. Most are harmless; the workup to prove it isn't, isn't.
- **Overdiagnosis:** correctly detecting a "disease" (it is really there under the microscope) that would
  *never have harmed the person in their lifetime* — then treating it, with all of treatment's harms and
  none of its benefit. This is not a false positive; it is a *true positive that shouldn't have been
  looked for*. The cleanest documented example is **PSA-detected prostate cancer** (B.5 / §25).
- **The anxiety and labeling tax:** turning a well person into a patient with a number to worry about,
  often permanently, often over a value that was one repeat draw away from normal.

The discipline that prevents all of this is **pre-test reasoning**: order a test when its result will
*change a decision*, in a person whose pre-test probability makes the result *interpretable*. "Thoroughness"
in the absence of pre-test reasoning is not rigor — it is a false-positive generator.

---

# PART B — THE LAB CATEGORIES (what is actually being measured)

A practical map, so that when you scan your own lab slip you can tell which *kind* of test each line is —
which changes how much a flag on it should worry you. For each category: what it measures, the high-value
tests, and the honest caveat. Effect sizes and outcome evidence for specific biomarkers live in
`WHAT-TO-TRACK-SYNTHESIS.md` and the linked domain claims — this is the *test-science* layer over them.

@@FIG:75-blood-panel@@

## B.1 The lab-category table

The load-bearing abbreviations, spelled once: **BMP/CMP** = basic / comprehensive metabolic panel;
**eGFR** = estimated kidney-filtration rate; **ACR** = urine albumin-to-creatinine ratio (an early
kidney-damage marker); **ALT/AST/ALP** = liver enzymes; **HbA1c** = a 3-month average blood-sugar level;
**INR** = a clotting-time ratio; **HOMA-IR** = an insulin-resistance index; **CBC** = complete blood count.

*Skim the left column to find your test's category; the caveat column tells you how much a flag should
worry you. Effect sizes live in `WHAT-TO-TRACK-SYNTHESIS.md`.*

| Category | Core tests | What it actually tells you | Honest caveat / cross-ref |
|---|---|---|---|
| **Clinical chemistry — metabolic panel (BMP/CMP)** | Na, K, Cl, \(\mathrm{CO_{2}}\), BUN, creatinine, glucose, Ca; CMP adds albumin, total protein, bilirubin, ALP, ALT, AST | Electrolyte/acid-base status, kidney function (eGFR from creatinine), glucose, liver enzymes | eGFR is *estimated* (creatinine depends on muscle mass — understates function in the very muscular, overstates in the frail). 14 analytes → ~51% chance of one false flag (A.7). |
| **Glycemic** | Fasting glucose, **HbA1c**, OGTT, fasting insulin/HOMA-IR | Average glycemia (HbA1c ≈ 3-month), insulin resistance | HbA1c distorted by any RBC-turnover disorder (anemia, hemoglobinopathy, recent transfusion). Insulin assays vary by lab (A.8). Cross-ref §22, `WHAT-TO-TRACK-SYNTHESIS.md` Tier A. |
| **Liver function (LFTs)** | ALT, AST, ALP, GGT, bilirubin, albumin, INR | Hepatocyte injury (ALT/AST), cholestasis (ALP/GGT/bili), *synthetic function* (albumin, INR) | "LFTs" is a misnomer — enzymes are *injury* markers, not function; albumin/INR are the real function tests. Mild isolated transaminase bumps are common and usually benign. |
| **Kidney function** | Creatinine→eGFR, BUN, cystatin C, urine albumin:creatinine (ACR) | Filtration rate, proteinuria | ACR (an *early* glomerular-damage marker) often more actionable than a borderline eGFR. Cross-ref §22. |
| **Lipids** | Total/LDL-C, HDL-C, triglycerides, **apoB**, Lp(a) | Atherogenic particle burden; **apoB** = particle number (causal), Lp(a) = genetic (once-in-life) | LDL-C can mislead when discordant with particle number; **apoB is the better metric**. Cross-ref §22, `WHAT-TO-TRACK-SYNTHESIS.md` Tier A (apoB causal; Lp(a) once). |
| **Hematology (CBC)** | Hb/Hct, RBC indices (MCV, RDW), WBC + differential, platelets | Anemia, infection/inflammation pattern, clotting capacity, marrow output | A pattern test, not a single number — see B.2. Anemia workup cross-ref §17. |
| **Inflammatory markers** | **hsCRP**, ESR, ferritin (also iron store), fibrinogen | Non-specific *acute-phase* signal of inflammation | **Predictor, not lever** (Ridker/JUPITER): hsCRP risk-stratifies but is not itself a treatment target. ESR is slow/non-specific. Cross-ref §15. |
| **Endocrine assays** | TSH/free T4/T3, cortisol, testosterone, estradiol, insulin, PTH, vitamin D | Hormonal axis status | Highest assay-variability category (A.8); pulsatile/diurnal secretion means timing matters; "normal range" wide. Cross-ref §13. |
| **Tumor markers** | PSA, CA-125, CEA, CA 19-9, AFP, CA 15-3 | Trends in *known* cancer (monitoring); poor screening tools | Mostly **not** for screening — low specificity → low PPV in general population (B.4). PSA = the cautionary case (B.5, §25). |
| **Coagulation** | PT/INR, aPTT, D-dimer, fibrinogen, platelets | Clotting pathway integrity, anticoagulant monitoring | **D-dimer** is the textbook high-sensitivity/low-specificity rule-*out* test (SnNout): great negative, near-useless positive (A.2). |
| **Microbiology / cultures** | Blood/urine/wound culture + sensitivities, Gram stain, rapid antigen/PCR | Identifies the organism + which antibiotics work | Culture = slow gold standard (days); contamination (skin flora in blood cultures) is a classic false positive (Bates/Weinstein, *Ann Intern Med* 1987). PCR is fast/sensitive but can detect dead or colonizing organisms. |
| **Urinalysis** | Dipstick (protein, glucose, blood, leukocyte esterase, nitrite), microscopy | Renal/urinary/metabolic screen | Cheap and useful *with* pre-test reasoning; asymptomatic dipstick "abnormalities" (microscopic hematuria, trace protein) are a leading cascade trigger. |
| **Histopathology / cytology** | Biopsy, surgical specimen, Pap, FNA | **Tissue diagnosis — the gold standard** for cancer and many diseases | The reference standard, but *not infallible*: sampling error + inter-observer variability (B.3). |

@@FIG:PX3-lab-categories@@

## B.2 Reading a CBC (what each line means)

The complete blood count is the most-ordered test in medicine and the most *pattern-based*. Briefly:

- **Hemoglobin / hematocrit** — oxygen-carrying capacity. Low = anemia; the **MCV** (red-cell size) then
  sorts the cause: *microcytic* (low MCV → iron deficiency, thalassemia), *normocytic* (chronic disease,
  acute bleed, kidney), *macrocytic* (high MCV → B12/folate deficiency, alcohol, hypothyroidism). **RDW**
  (size variability) rising early hints at evolving deficiency. This is the spine of the anemia workup
  (cross-ref §17).
- **White cells + differential** — neutrophils up suggests bacterial/stress; lymphocytes up suggests viral;
  eosinophils up suggests allergy/parasites; the *pattern* carries the information, the total rarely does
  alone.
- **Platelets** — clotting capacity; very high or very low both matter and both have long differentials.

A CBC illustrates the whole chapter in miniature: no single line is diagnostic; the *constellation*,
against the pre-test probability, is.

## B.3 Histopathology — the gold standard, and its honest limits

When the question is "is this cancer, and what kind?", the answer comes from a **pathologist looking at
tissue under a microscope** — the **biopsy is the diagnostic gold standard**, the reference against which
imaging, blood markers, and liquid biopsies are all *validated*. How a solid cancer is actually
characterized (cross-ref §25):

- **Diagnosis** — is it malignant, and what lineage (carcinoma, sarcoma, lymphoma…)? Increasingly aided by
  immunohistochemistry and molecular markers.
- **Grade** — how abnormal/aggressive the cells *look* (e.g. Gleason for prostate, Nottingham for breast).
- **Stage** — how far it has *spread* (TNM: tumor size, nodes, metastasis). Stage drives prognosis and
  treatment more than almost anything else.

**The honest caveat the gold standard carries: it is human and imperfect.**

- **Sampling error** — a biopsy samples a fragment; the needle can miss the lesion or hit a non-
  representative part. A "negative" biopsy lowers but does not zero the probability (NPV < 100%).
- **Inter-observer variability** — two competent pathologists do not always agree, especially on *grade*
  and on borderline lesions. Gleason grading of prostate cancer is the classic studied example: agreement
  is good for clear high- and low-grade tumors but materially worse in the intermediate range, which is
  exactly where treatment decisions hinge — a recurring finding through successive grading-system revisions
  (ISUP 2005/2014). Diagnosis is more reproducible than grading; grading
  is more reproducible than "is this early dysplasia." The microscope is the gold standard *and* a source
  of real, quantifiable disagreement — both are true.

This is why second opinions on pathology change management more often than patients expect, and why
"the biopsy is positive" still sits inside a probability, not a certainty.

## B.4 Tumor markers — the honest overuse problem

Tumor markers are blood proteins that *tend* to rise with certain cancers. Their legitimate use is almost
entirely **monitoring a known cancer** (is treatment working? is it recurring?), where the pre-test
probability is high and you're tracking a *trend in a known patient*. Their **screening** use in the
general population is mostly indefensible on test-performance grounds: a marker like CA-125 or CEA has
modest sensitivity and *poor specificity*, applied to a low-prevalence population — by A.4 that guarantees
a low PPV and a flood of false alarms, benign workups, and anxiety. The general principle: **a good
monitoring marker is usually a bad screening test**, because the two jobs are done at opposite ends of the
pre-test-probability spectrum.

## B.5 PSA — the cautionary case, in one paragraph

Prostate-specific antigen is the most instructive single test in medicine because it makes every concept
above concrete. PSA is **prostate-specific, not cancer-specific** — it rises with benign enlargement,
infection, even cycling — so its specificity for *cancer* is poor (many false positives). Population PSA
screening does reduce prostate-cancer-specific mortality modestly in the best trial (ERSPC, Schröder et al.,
*NEJM* 2009: ~20% relative reduction, but a large number-needed-to-screen and number-needed-to-treat), and
shows little to no benefit in others — the systematic-review picture is a small, uncertain mortality
benefit (Ilic et al., *BMJ* 2018). Against that sits substantial **overdiagnosis**: PSA detects many
indolent cancers that would never have caused harm, and treating them causes incontinence and impotence in
men who could not have benefited. PSA is not "bad"; it is a *threshold-and-pre-test-probability* problem
that requires shared decision-making, exactly as Part A predicts. Full treatment: §25.

---

# PART C — THE FRONTIER (promise vs. proof)

## C.1 Liquid biopsy and the -omics frontier

**Liquid biopsy** = detecting cancer (or other disease) from a blood draw — circulating tumor DNA
(ctDNA), circulating tumor cells, cell-free DNA methylation patterns, exosomes — instead of cutting out
tissue (cross-ref §07, §25). The promise is real and the mechanism is sound: dying tumor cells shed DNA
into blood, and you can read it. Two honest tiers:

- **Established / near-established use:** in **patients with known cancer**, ctDNA genotyping guides
  targeted therapy and tracks **minimal residual disease** and recurrence — high pre-test probability, and
  it works. This is the legitimate, growing core.
- **Unproven use — Multi-Cancer Early Detection (MCED), e.g. Galleri:** a single blood test claiming to
  *screen healthy people* for dozens of cancers at once. This runs straight into Part A. The **PATHFINDER**
  prospective study (Schrag et al., *Lancet* 2023) showed it *can* find cancers and localize the signal —
  but with a **positive predictive value around 38–43%** (i.e. the majority of "cancer signal detected"
  results in a screening population are false alarms or lead nowhere), and *no demonstrated mortality
  benefit yet* — the randomized trials that would prove screening saves lives (not just detects earlier)
  are ongoing. **MCED is mechanism-plausible and outcome-unproven** — precisely the gap you must not
  collapse. The test is sold as if it saves lives, on evidence that so far only shows it can detect a signal.

The broader **-omics frontier** (proteomic/metabolomic/methylation panels, organ-specific aging clocks;
cross-ref §C-genetics-omics, §16) carries the same shape: dense, real, biologically rich data — and almost
no validated, outcome-anchored *clinical decision* yet. Predictor, not yet lever; correlate, not yet
scorecard (the same verdict `WHAT-TO-TRACK-SYNTHESIS.md` Tier C gives biological-age tests).

## C.2 The consumer-lab era — Theranos, the legitimate players, and the over-testing trap

The direct-to-consumer blood-panel industry sells *more testing without a doctor's pre-test reasoning* as
empowerment. Sorted by honesty:

- **The fraud, as a permanent lesson — Theranos.** Theranos claimed hundreds of tests from a finger-prick
  drop and a proprietary device; the technology did not work, results were fabricated or run on hacked
  commercial analyzers, and the company collapsed in criminal-fraud convictions (2018–2022). The lesson is
  *not* "miniaturization is impossible" — it's that **lab medicine's hard part is analytical validity and
  clinical validity** (A.7–A.8), the unglamorous quality infrastructure Theranos skipped. Any consumer test
  that hides its sensitivity, specificity, and method is asking for the same trust Theranos abused.
- **The legitimate players.** Reputable DTC labs run real, CLIA-certified assays on validated platforms
  (the *analytics* are sound). Their problem is **not the assay — it's the absence of pre-test reasoning.**
  A real test, ordered without an indication, in a low-pre-test-probability person, *still* produces the
  A.7 false-positive flood and the A.9 cascade. The harm is structural, not fraudulent.
- **Why "more testing" without reasoning causes harm.** Everything in Part A converges here (A.4/A.7/A.9),
  with no evidence that untargeted broad screening improves outcomes in healthy adults. The same Bayesian
  trap documented for DTC *genetics* in §18 §A.6 (relative risk on a tiny baseline; a "negative" that rules
  out almost nothing) is the DTC *blood-panel* trap, one-for-one.

---

## Honest debunks (state them plainly)

- **"A full-body blood panel finds everything wrong before it's a problem" / "any out-of-range result
  means something is wrong."** **False, and backwards.** "Out of range" means *outside the central 95% of
  a reference population* — 1 in 20 healthy people clear that bar on any single test by definition, so on a
  broad panel a healthy person is *more likely than not* to get at least one "abnormal" flag from statistics
  alone (A.7: ~64% on 20 analytes). Without pre-test reasoning those flags have low PPV (A.4) and launch
  cascades (A.9); broad untargeted screening of healthy adults has **no demonstrated outcome benefit** and
  well-documented harms. A single mild flag, no symptoms, low pre-test probability → most often *repeat it*,
  don't treat or scan it.
- **"My doctor's gut 'pre-test probability' is just guessing — the test is objective."** **No** — the
  pre-test probability *is* the prevalence term in Bayes, and it does *half* the inferential work. A
  "positive" on a great test can still mean you probably don't have the disease (the 9%-PPV example, A.4).
  The test is not a verdict; it's an update.
- **"A negative tumor marker / DTC panel means I'm cancer-free" / "liquid biopsy can screen me for all
  cancers from one blood draw."** **No / not yet proven.** NPV is never 100%; a marker with imperfect
  sensitivity, or a panel that tests three variants out of thousands (§18 §A.6), leaves most of the risk
  space untouched — false reassurance is its own harm. And MCED tests *detect* signals but, in screening
  populations, the majority of positives are false or unactionable (PATHFINDER PPV ~38–43%), with **no
  trial yet showing they reduce mortality.** Mechanism-plausible, outcome-unproven — do not collapse the
  two.
- **"The biopsy is the gold standard, so a pathology result is certain."** **Gold standard ≠ infallible.**
  Sampling error means a negative biopsy isn't zero risk; inter-observer variability means grade (and
  borderline diagnoses) carry real disagreement — which is exactly why second opinions change management.

---

## Go deeper

**Test-performance foundations (read these first):**
- **Lijmer JG, Bossuyt PMM — "A readers' guide to the interpretation of diagnostic test properties: clinical
  example of sepsis," *Intensive Care Med* 2003** (PMID 12734652). The cleanest worked walk-through of
  sensitivity/specificity/predictive-values/LRs on a real case. **Tier: methods — canonical.**
- **Sackett, Haynes, Guyatt, Tugwell — *Clinical Epidemiology: A Basic Science for Clinical Medicine.***
  The foundational text for likelihood ratios and pre-/post-test reasoning. **Tier: textbook — canonical.**
- **Deeks JJ, Altman DG — "Diagnostic tests 4: likelihood ratios," *BMJ* 2004.** The standard short
  reference on LRs and how to apply them to pre-test odds. **Tier: methods — solid.**
- **Galen RS, Gambino SR — *Beyond Normality: The Predictive Value and Efficiency of Medical Diagnoses*
  (1975).** The book that put predictive value and the reference-range false-positive math on the map.
  **Tier: textbook — foundational, still correct.**

**Reference ranges & lab quality:**
- **CLSI EP28 / IFCC guidance on reference intervals** — how the 95% interval is actually derived and why
  it's method- and population-specific. **Tier: standards — authoritative.**
- **Tietz / *Henry's Clinical Diagnosis and Management by Laboratory Methods*** — the standard laboratory-
  medicine references for assay principles, interferences, and analytical variability (A.8). **Tier:
  textbook — canonical.**

**Screening, overdiagnosis, the cascade:**
- **Schröder FH et al. — "Screening and Prostate-Cancer Mortality in a Randomized European Study"
  (ERSPC), *NEJM* 2009** (PMID 19297566); **Ilic D et al. — "Prostate cancer screening with PSA: a
  systematic review and meta-analysis," *BMJ* 2018** (PMID 30185521). The two anchors for the PSA
  small-benefit/large-overdiagnosis picture. **Tier: rct / meta — strong.**
- **Welch HG — *Less Medicine, More Health* / *Overdiagnosed*.** The accessible canon on overdiagnosis,
  incidentalomas, and the cascade. **Tier: synthesis — solid.**

**Pathology & the frontier:**
- **"Prostate Cancer Grading: An Update," *Urol Clin North Am* 2026** (PMID 41266001) — Gleason/ISUP
  grading and its reproducibility limits (B.3). **Tier: review — current.**
- **Bates DW, Weinstein MP et al. — "Blood cultures," *Ann Intern Med* 1987** (PMID 3541726) — the classic
  on contamination as a culture false positive. **Tier: review — foundational.**
- **Schrag D et al. — "Blood-based tests for multicancer early detection (PATHFINDER): a prospective cohort
  study," *Lancet* 2023** (DOI 10.1016/S0140-6736(23)01700-2). The reference point for MCED real-world PPV
  and the still-open mortality question (C.1). **Tier: cohort — current frontier.**
- **Carreyrou J — *Bad Blood* (2018).** The definitive Theranos account; read as a permanent lesson on why
  analytical and clinical validity are the un-skippable hard part of lab medicine (C.2). **Tier:
  journalism — documentary.**

---

## Cross-links

- **`04-protocols/WHAT-TO-TRACK-SYNTHESIS.md`** — the *what to measure* synthesis this section sits under
  (apoB/Lp(a)/HbA1c/hsCRP/HOMA-IR, the predictor-≠-lever rule for biomarkers).
- **§18 (genetics & anatomy) §A.6** — the DTC-genetics Bayesian trap, one-for-one the DTC-blood-panel trap.
- **§13 (endocrine)** — the assay-variability problem (A.8) in its worst category.
- **§15 (immune)** — hsCRP/ESR as inflammation *markers*, not levers (`hscrp-predicts-not-causal`).
- **§17 (organ systems)** — the anemia workup the CBC/MCV logic (B.2) feeds.
- **§22 (cardiometabolic/renal)** — lipids, glucose/HbA1c, eGFR/ACR in clinical context.
- **§25 (oncology)** — grading/staging, PSA, liquid biopsy in full.
- **§07 (clinical/prevention)** — screening principles and the pre-test-probability discipline.
- **UP to canon:** the Bayesian update under all of Part A → `bucket-canon/04-information/` (probability,
  inference); the analytical-chemistry basis of assays → `bucket-canon/03-chemistry/`.

> **Honesty footer.** This section refuses two opposite errors. One is *test nihilism* — "labs are
> meaningless, trust how you feel" — which throws away the decision-changing tests (apoB, HbA1c,
> a needle biopsy, a culture-guided antibiotic). The other, far more commercially powerful, is *test
> maximalism* — "measure everything, more data is more health" — which ignores that the meaning of any
> result is set by pre-test probability, that 1 in 20 healthy values flags abnormal by construction, and
> that untargeted testing manufactures the very false positives that then harm the patient. The discipline
> in between is the whole of laboratory medicine: **test when the answer will change a decision, in a
> person in whom the answer is interpretable — and read every result as an update to what you already
> knew, never as a verdict on its own.**
